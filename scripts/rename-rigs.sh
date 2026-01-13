#!/bin/bash
# Rig Rename Script - Renames all rigs to ≤8 character names
# Run with: bash scripts/rename-rigs.sh
# Add --dry-run to see what would happen without making changes

set -e

TOWN_ROOT="/Users/erik/gt"
DRY_RUN=false

if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "=== DRY RUN MODE - No changes will be made ==="
fi

# Mapping: old_name:new_name
declare -a RENAMES=(
  "beloved_spark:bspark"
  "divine_presence:divpres"
  "dom_claude_code:dptmeme"
  "dotai_sync:dotaisyn"
  "dr_reports:drreport"
  "dr_reports_local:drlocal"
  "erikjamesfritsch:ejf"
  "fools_journey:foolsjny"
  "fritsch_finances:ffin"
  "fritsch_food:ffood"
  "fritsch_foods:ffoods"
  "gastown_dispatch:gtdispat"
  "iamthat_vision:iatvison"
  "iamthestar:iamstar"
  "latent_mirror_zero_point_distilled:latmirr"
  "memoryguardian:memguard"
  "northstar_coherence:nscohere"
  "northstar_eternal:nsetrnl"
  "northstar_funding:nsfund"
  "northstar_guidance:nsguide"
  "northstar_intelligence:nsintel"
  "northstar_panes:nspanes"
  "starrylabs_tech:starrylb"
  "swarmdeck:swrmdeck"
  "sword_rose_matrix:srmtrix"
  "tiff_fritsch_studios:tffstdio"
  "versova_ai_upskill:vsupskil"
  "versova_align:vsalign"
  "versova_chatv2:vschat2"
  "versova_chatv2_1:vschat21"
  "versova_chirp:vschirp"
  "versova_chirp_v2:vschirp2"
  "versova_clutch:vsclutch"
  "versova_genesis:vsgenss"
  "versova_genesis_meta_builder:vsgenmb"
  "versova_mr_president:vspres"
  "youarethestar_com:yatscom"
  "youarethestar_waitlist:yatswait"
  # Already good (≤8 chars and readable):
  # "subdub:subdub"
  # "symbiot:symbiot"
  # "vms_io:vmsio"
  # "scrnwell:scrnwell" (already renamed)
)

rename_rig() {
  local old_name="$1"
  local new_name="$2"
  
  echo ""
  echo "=== Renaming: $old_name -> $new_name ==="
  
  # Check if old rig exists
  if [[ ! -d "$TOWN_ROOT/$old_name" ]]; then
    echo "  SKIP: $old_name does not exist (already renamed?)"
    return 0
  fi
  
  # Check if new name already exists
  if [[ -d "$TOWN_ROOT/$new_name" ]]; then
    echo "  ERROR: $new_name already exists!"
    return 1
  fi
  
  if $DRY_RUN; then
    echo "  [DRY RUN] Would rename directory"
    echo "  [DRY RUN] Would update config.json"
    echo "  [DRY RUN] Would update routes.jsonl"
    echo "  [DRY RUN] Would update mayor/rigs.json"
    return 0
  fi
  
  # Step 1: Rename directory
  echo "  1. Renaming directory..."
  mv "$TOWN_ROOT/$old_name" "$TOWN_ROOT/$new_name"
  
  # Step 2: Update rig's config.json
  echo "  2. Updating config.json..."
  if [[ -f "$TOWN_ROOT/$new_name/config.json" ]]; then
    cat "$TOWN_ROOT/$new_name/config.json" | jq --arg name "$new_name" '
      .name = $name | .beads.prefix = $name
    ' > /tmp/config_new.json
    mv /tmp/config_new.json "$TOWN_ROOT/$new_name/config.json"
  fi
  
  # Step 3: Update routes.jsonl
  echo "  3. Updating routes.jsonl..."
  sed -i '' "s|\"prefix\":\"${old_name}-\",\"path\":\"${old_name}/|\"prefix\":\"${new_name}-\",\"path\":\"${new_name}/|g" "$TOWN_ROOT/.beads/routes.jsonl"
  
  # Step 4: Update mayor/rigs.json
  echo "  4. Updating mayor/rigs.json..."
  cat "$TOWN_ROOT/mayor/rigs.json" | jq --arg old "$old_name" --arg new "$new_name" '
    if .rigs[$old] then
      .rigs[$new] = .rigs[$old] |
      .rigs[$new].beads.prefix = $new |
      del(.rigs[$old])
    else
      .
    end
  ' > /tmp/rigs_new.json
  mv /tmp/rigs_new.json "$TOWN_ROOT/mayor/rigs.json"
  
  echo "  DONE: $old_name -> $new_name"
}

echo "Rig Rename Script"
echo "================="
echo "Town root: $TOWN_ROOT"
echo "Rigs to rename: ${#RENAMES[@]}"

# Process each rename
for mapping in "${RENAMES[@]}"; do
  old_name="${mapping%%:*}"
  new_name="${mapping##*:}"
  rename_rig "$old_name" "$new_name"
done

echo ""
echo "=== Complete ==="
echo ""
echo "Verification:"
cd "$TOWN_ROOT" && gt rig list 2>&1 | head -20

echo ""
echo "NOTE: You may need to:"
echo "  1. Update any existing beads with old prefixes (bd prefix rename)"
echo "  2. Restart any running polecats/sessions"
echo "  3. Update external references (docs, scripts)"
