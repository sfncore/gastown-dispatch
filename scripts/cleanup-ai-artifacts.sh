#!/usr/bin/env bash
# cleanup-ai-artifacts.sh - Find and move AI clutter to artifacts/
# Safe to run repeatedly. Preserves files, never deletes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ARTIFACTS_DIR="$PROJECT_ROOT/artifacts"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create artifacts structure if missing
create_artifacts_structure() {
    local dirs=("ai" "opencode" "claude" "factoryai" "amp" "gt" "logs" "tmp" "reports" "patches" "transcripts")
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$ARTIFACTS_DIR/$dir"
        touch "$ARTIFACTS_DIR/$dir/.gitkeep"
    done
    
    if [[ ! -f "$ARTIFACTS_DIR/README.md" ]]; then
        cat > "$ARTIFACTS_DIR/README.md" << 'EOF'
# AI Artifacts Directory

This directory stores AI-generated files that should NOT be committed to git.
The entire `artifacts/` folder is git-ignored.

Run `scripts/cleanup-ai-artifacts.sh` to move discovered clutter here.
EOF
    fi
}

# Track moved files
declare -a MOVED_FILES=()

# Move file to appropriate artifacts subfolder
move_to_artifacts() {
    local src="$1"
    local category="$2"
    local dest_dir="$ARTIFACTS_DIR/$category"
    local filename=$(basename "$src")
    local dest="$dest_dir/$filename"
    
    # Handle name collisions
    if [[ -e "$dest" ]]; then
        local base="${filename%.*}"
        local ext="${filename##*.}"
        if [[ "$base" == "$ext" ]]; then
            ext=""
        else
            ext=".$ext"
        fi
        local counter=1
        while [[ -e "$dest_dir/${base}_${counter}${ext}" ]]; do
            ((counter++))
        done
        dest="$dest_dir/${base}_${counter}${ext}"
    fi
    
    # Check if tracked by git
    if git -C "$PROJECT_ROOT" ls-files --error-unmatch "$src" &>/dev/null; then
        # Remove from git index, keep file
        git -C "$PROJECT_ROOT" rm --cached "$src" 2>/dev/null || true
    fi
    
    mv "$src" "$dest"
    MOVED_FILES+=("$src -> $dest")
}

# Classify and move files
scan_and_move() {
    cd "$PROJECT_ROOT"
    
    # AI tool directories (move contents, not the dir itself)
    local ai_dirs=(".claude" ".opencode" ".factoryai" ".droid" ".amp" ".gt" ".agents" ".llm" ".chat")
    
    for dir in "${ai_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            local target_category="${dir#.}"  # Remove leading dot
            # Map to our category names
            case "$target_category" in
                "factoryai"|"droid") target_category="factoryai" ;;
                "agents"|"llm"|"chat") target_category="ai" ;;
            esac
            
            find "$dir" -type f ! -name ".gitkeep" 2>/dev/null | while read -r file; do
                move_to_artifacts "$file" "$target_category"
            done
        fi
    done
    
    # Log files (exclude node_modules, .git, .beads internal)
    find . -type f -name "*.log" \
        ! -path "./node_modules/*" \
        ! -path "./.git/*" \
        ! -path "./.beads/*" \
        ! -path "./artifacts/*" \
        ! -path "./gastown/*" \
        2>/dev/null | while read -r file; do
        move_to_artifacts "$file" "logs"
    done
    
    # Trace and dump files
    find . -type f \( -name "*.trace" -o -name "*.dump" \) \
        ! -path "./node_modules/*" \
        ! -path "./.git/*" \
        ! -path "./artifacts/*" \
        ! -path "./gastown/*" \
        2>/dev/null | while read -r file; do
        move_to_artifacts "$file" "logs"
    done
    
    # Patch and diff files (not in src/)
    find . -type f \( -name "*.patch" -o -name "*.diff" \) \
        ! -path "./node_modules/*" \
        ! -path "./.git/*" \
        ! -path "./src/*" \
        ! -path "./artifacts/*" \
        ! -path "./gastown/*" \
        2>/dev/null | while read -r file; do
        move_to_artifacts "$file" "patches"
    done
    
    # Prompt files
    find . -type f -name "*.prompt" \
        ! -path "./node_modules/*" \
        ! -path "./.git/*" \
        ! -path "./artifacts/*" \
        ! -path "./gastown/*" \
        2>/dev/null | while read -r file; do
        move_to_artifacts "$file" "ai"
    done
    
    # Transcript files (careful with naming)
    find . -type f -iname "*transcript*" \
        ! -path "./node_modules/*" \
        ! -path "./.git/*" \
        ! -path "./src/*" \
        ! -path "./artifacts/*" \
        ! -path "./gastown/*" \
        2>/dev/null | while read -r file; do
        move_to_artifacts "$file" "transcripts"
    done
    
    # Scratch and tmp directories
    for dir in "scratch" "tmp" "out"; do
        if [[ -d "$dir" ]]; then
            find "$dir" -type f ! -name ".gitkeep" 2>/dev/null | while read -r file; do
                move_to_artifacts "$file" "tmp"
            done
        fi
    done
}

# Main
main() {
    echo -e "${BLUE}AI Artifact Cleanup${NC}"
    echo "==================="
    echo ""
    
    echo -e "${YELLOW}Creating artifacts structure...${NC}"
    create_artifacts_structure
    
    echo -e "${YELLOW}Scanning for AI clutter...${NC}"
    scan_and_move
    
    echo ""
    if [[ ${#MOVED_FILES[@]} -gt 0 ]]; then
        echo -e "${GREEN}Moved ${#MOVED_FILES[@]} file(s):${NC}"
        for entry in "${MOVED_FILES[@]}"; do
            echo "  $entry"
        done
    else
        echo -e "${GREEN}No AI clutter found. Workspace is clean.${NC}"
    fi
    
    echo ""
    echo "Done. Run 'git status' to verify."
}

main "$@"
