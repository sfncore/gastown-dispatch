#!/usr/bin/env bash
# Rename multi-hyphen beads prefixes to short single-hyphen prefixes (max 8 chars)
# This fixes Gas Town routing which breaks with prefixes like "gastown-dispatch-"
#
# Usage:
#   ./rename-beads-prefixes.sh --dry-run    # Preview changes
#   ./rename-beads-prefixes.sh              # Execute changes

set -uo pipefail

CUSTOM_CODING_DIR="/Users/erik/Documents/AI/Custom_Coding"
GT_DIR="/Users/erik/gt"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "=== DRY RUN MODE - No changes will be made ==="
    echo ""
fi

# Function to get new prefix for a given old prefix
get_new_prefix() {
    local old="$1"
    case "$old" in
        "dotai-sync") echo "dtsync" ;;
        "fools-journey") echo "flsjrny" ;;
        "fritsch-food") echo "frfood" ;;
        "gastown-dispatch") echo "gtdispat" ;;
        "northstar-eternal") echo "nseternl" ;;
        "northstar-funding") echo "nsfund" ;;
        "northstar-guidance") echo "nsguide" ;;
        "northstar-intelligence") echo "nsintel" ;;
        "northstar-panes") echo "nspanes" ;;
        "tiff-fritsch-studios") echo "tffstudi" ;;
        *) echo "" ;;
    esac
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Scanning projects in $CUSTOM_CODING_DIR..."
echo ""

# Track what we'll change
RENAMES=""
COUNT=0

for dir in "$CUSTOM_CODING_DIR"/*/; do
    project=$(basename "$dir")
    issues_file="$dir.beads/issues.jsonl"
    
    if [[ ! -f "$issues_file" ]]; then
        continue
    fi
    
    # Get first issue ID to detect current prefix
    first_id=$(head -1 "$issues_file" 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [[ -z "$first_id" ]]; then
        continue
    fi
    
    # Extract current prefix (everything before the last hyphen-hash segment)
    current_prefix=$(echo "$first_id" | sed 's/-[^-]*$//')
    
    # Check if we have a mapping for this prefix
    new_prefix=$(get_new_prefix "$current_prefix")
    
    if [[ -n "$new_prefix" ]]; then
        echo -e "${YELLOW}Found:${NC} $project"
        echo "  Current prefix: ${current_prefix}-"
        echo "  New prefix:     ${new_prefix}-"
        echo "  Example: ${first_id} → ${new_prefix}-$(echo "$first_id" | sed 's/.*-//')"
        echo ""
        
        RENAMES="${RENAMES}${dir}|${current_prefix}|${new_prefix}\n"
        COUNT=$((COUNT + 1))
    fi
done

echo "========================================"
echo "Found $COUNT projects to rename"
echo "========================================"
echo ""

if [[ $COUNT -eq 0 ]]; then
    echo "Nothing to do!"
    exit 0
fi

if [[ "$DRY_RUN" == true ]]; then
    echo "Run without --dry-run to execute these changes."
    exit 0
fi

# Confirm before proceeding
read -p "Proceed with renaming? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "=== Executing renames ==="
echo ""

echo -e "$RENAMES" | while IFS='|' read -r dir current_prefix new_prefix; do
    [[ -z "$dir" ]] && continue
    
    project=$(basename "$dir")
    
    echo -e "${GREEN}Renaming${NC} $project: ${current_prefix}- → ${new_prefix}-"
    
    # Step 1: Rename prefix in source repo (bd rename-prefix only takes new prefix)
    cd "$dir"
    if bd rename-prefix "${new_prefix}-" 2>&1; then
        echo "  ✓ Renamed in source repo"
    else
        echo -e "  ${RED}✗ Failed to rename in source repo${NC}"
        continue
    fi
    
    # Step 2: Update Gas Town rig config if it exists
    # The rig name in GT uses underscores: gastown-dispatch -> gastown_dispatch
    rig_name=$(echo "$project" | tr '-' '_')
    rig_config="$GT_DIR/$rig_name/config.json"
    
    if [[ -f "$rig_config" ]]; then
        # Update the prefix in config.json
        if command -v jq &> /dev/null; then
            tmp=$(mktemp)
            jq --arg new "$new_prefix" '.beads.prefix = $new' "$rig_config" > "$tmp" && mv "$tmp" "$rig_config"
            echo "  ✓ Updated rig config"
        else
            echo "  ⚠ jq not found, manually update: $rig_config"
        fi
    fi
    
    # Step 3: Update routes.jsonl
    routes_file="$GT_DIR/.beads/routes.jsonl"
    if [[ -f "$routes_file" ]]; then
        # Replace the old prefix with new prefix in routes.jsonl
        old_route_prefix="${current_prefix}-"
        new_route_prefix="${new_prefix}-"
        
        if grep -q "\"prefix\":\"$old_route_prefix\"" "$routes_file"; then
            sed -i '' "s/\"prefix\":\"$old_route_prefix\"/\"prefix\":\"$new_route_prefix\"/g" "$routes_file"
            echo "  ✓ Updated routes.jsonl"
        fi
    fi
    
    # Step 4: Update mayor/rig clone if it exists
    mayor_rig="$GT_DIR/$rig_name/mayor/rig"
    if [[ -d "$mayor_rig/.beads" ]]; then
        cd "$mayor_rig"
        bd rename-prefix "${new_prefix}-" 2>&1 || true
        echo "  ✓ Updated mayor/rig beads"
    fi
    
    echo ""
done

echo "=== Done ==="
echo ""
echo "Next steps:"
echo "1. Restart any Gas Town agents that were running"
echo "2. Test routing: bd show <new-prefix>-<id> from ~/gt"
echo ""
echo "Test commands:"
echo "  cd ~/gt && bd show gtdispat-2cr"
