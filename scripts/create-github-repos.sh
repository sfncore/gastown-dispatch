#!/bin/bash
# Create private GitHub repos for local projects without remotes
# Usage: ./create-github-repos.sh [--dry-run]

set -e

GITHUB_ORG="ovachiever"
BASE_DIR="/Users/erik/Documents/AI/Custom_Coding"
DRY_RUN=false
MAPPING_FILE="/tmp/repo-mapping.txt"

if [ "$1" = "--dry-run" ]; then
  DRY_RUN=true
  echo "=== DRY RUN MODE ==="
fi

# Clear mapping file
> "$MAPPING_FILE"

# Function to sanitize name for GitHub
sanitize_name() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | \
    sed 's/[^a-z0-9-]/-/g' | \
    sed 's/--*/-/g' | \
    sed 's/^-//' | \
    sed 's/-$//'
}

echo "Creating private repos on github.com/$GITHUB_ORG..."
echo ""

# Find all git repos without remotes
for dir in "$BASE_DIR"/*/; do
  if [ ! -d "$dir/.git" ]; then
    continue
  fi
  
  local_name=$(basename "$dir")
  
  # Check if remote already exists
  existing=$(cd "$dir" && git remote get-url origin 2>/dev/null || echo "")
  if [ -n "$existing" ]; then
    continue
  fi
  
  repo_name=$(sanitize_name "$local_name")
  
  echo "Processing: $local_name -> $repo_name"
  
  if [ "$DRY_RUN" = true ]; then
    echo "  [DRY-RUN] Would create: github.com/$GITHUB_ORG/$repo_name"
    echo "  [DRY-RUN] Would set origin in: $dir"
    echo "$local_name|git@github.com:$GITHUB_ORG/$repo_name.git" >> "$MAPPING_FILE"
  else
    # Create private repo on GitHub
    if gh repo view "$GITHUB_ORG/$repo_name" &>/dev/null; then
      echo "  Repo already exists on GitHub, just adding remote..."
    else
      echo "  Creating repo..."
      gh repo create "$GITHUB_ORG/$repo_name" --private 2>/dev/null || {
        echo "  Warning: Could not create repo (may already exist)"
      }
    fi
    
    # Add remote to local repo
    cd "$dir"
    git remote add origin "git@github.com:$GITHUB_ORG/$repo_name.git" 2>/dev/null || \
      git remote set-url origin "git@github.com:$GITHUB_ORG/$repo_name.git"
    
    # Push all branches
    echo "  Pushing to GitHub..."
    git push -u origin --all 2>/dev/null || echo "  Warning: push failed (may need manual intervention)"
    git push origin --tags 2>/dev/null || true
    
    echo "$local_name|git@github.com:$GITHUB_ORG/$repo_name.git" >> "$MAPPING_FILE"
  fi
  
  echo ""
done

echo "=== MAPPING FILE ==="
cat "$MAPPING_FILE"
echo ""
echo "Done! Mapping saved to $MAPPING_FILE"
