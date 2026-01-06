# /align - AI Artifact Alignment

Enforce a clean remote workflow while allowing local agent clutter.

---

You are working inside THIS repository. Your mission is to enforce a clean remote workflow while allowing local agent clutter, by corralling AI generated files into a single artifacts area, preventing them from being committed, and giving humans a simple cleanup routine.

## Context: Tool Sources of Clutter

This repo may contain artifacts created by Opencode, Claude Code, FactoryAI Droid, Amp, and eventually Gas Town (gt). Assume these tools can generate logs, transcripts, patches, prompts, temporary caches, session metadata, and scratch outputs in random directories.

## Non-Negotiables

1. **Do not delete user data.** Default to moving files into artifacts/ with preservation.
2. **Do not commit any AI clutter.** After changes, origin main must stay clean.
3. **Minimize false positives.** Do not ignore legitimate source code, configs, or tests.
4. If a file is already tracked but should be treated as junk, remove it from git tracking safely while keeping the file under artifacts.

## Execute in This Order

### A) Inventory and Classify

Produce a quick inventory of likely AI clutter by scanning for:

**Directories:** `.claude`, `.opencode`, `.factoryai`, `.droid`, `.amp`, `.gt`, `.agents`, `.llm`, `.chat`, `scratch`, `tmp`, `out`, `logs`, `transcripts`, `prompts`, `patches`, `reports`

**Files:** `*.log`, `*.trace`, `*.dump`, `*.patch`, `*.diff`, `*.prompt`, `*transcript*`, `*session*`, `*conversation*`, `*run*`, `*artifact*`

For each item, classify as:
- Move to artifacts
- Ignore only
- Keep tracked
- Needs human review

### B) Create Artifacts Structure

Create a single top-level folder `artifacts/` with subfolders:

```
artifacts/
├── ai/
├── opencode/
├── claude/
├── factoryai/
├── amp/
├── gt/
├── logs/
├── tmp/
├── reports/
├── patches/
└── transcripts/
```

### C) Migrate Existing Junk into Artifacts

1. Move anything classified "Move to artifacts" into the appropriate artifacts subfolder.
2. Use git-aware moves:
   - If tracked, use `git mv`
   - If untracked, use `mv`
3. If any moved junk was tracked but should not be tracked:
   - Remove from index without deleting: `git rm -r --cached path`
   - Then ensure the file lives under artifacts/ untracked

### D) Add Layered Ignore Rules

Update or create `.gitignore` with these goals:

1. Ignore `artifacts/` entirely
2. Ignore common tool metadata directories for Opencode, Claude Code, FactoryAI Droid, Amp, and gt
3. Ignore common log and temp patterns
4. Avoid ignoring meaningful developer directories like `src`, `test`, `config`, `scripts`

Add ignore patterns that are conservative and targeted. Include, at minimum:

- `artifacts/`
- Common OS junk: `.DS_Store`
- Generic agent clutter patterns: `*.log`, `*.trace`, `*.dump`, `*.prompt`, `*transcript*`, `*.patch`, `*.diff`
- Tool-specific directories if present: `.claude/`, `.opencode/`, `.factoryai/`, `.droid/`, `.amp/`, `.gt/`

**If you find different real directories in this repo, prefer ignoring those exact names instead of speculative ones.**

### E) Add a Commit Blocking Gate

Implement a lightweight pre-commit gate stored in the repo.

**Approach:**

1. Create `githooks/pre-commit` that blocks commits if any staged file matches:
   - Anything under `artifacts/`
   - Any of the tool metadata directories listed above
   - Any file matching log and transcript patterns that should never be committed

2. Configure hooks path usage:
   - Document: `git config core.hooksPath githooks`

3. Make it actionable:
   - Print the offending staged files
   - Tell the user to move them into artifacts/ or add a narrow allowlist if truly needed

4. Keep the gate minimal and portable, no external dependencies unless the repo already uses them

### F) Provide a Safe Cleanup Script

Add `scripts/cleanup-ai-artifacts.sh` that:

1. Creates artifacts folder structure if missing
2. Moves newly discovered clutter into artifacts/ using the same classification logic
3. Prints a summary of moved items
4. Is safe to run repeatedly

### G) Verification

1. Show `git status`
2. Show diff for `.gitignore`, hook, cleanup script
3. Confirm:
   - No artifacts are tracked
   - Commits are blocked if artifacts are staged
   - Human can keep working normally, and only intended files are committed

## Deliverables

- [ ] `artifacts/` structure created
- [ ] Existing AI junk moved into artifacts/
- [ ] `.gitignore` updated
- [ ] Commit gate added under `githooks/`
- [ ] Cleanup script added under `scripts/`
- [ ] Short README snippet explaining the workflow

**Now proceed with A through G, starting with a real inventory in this repo and only ignoring directories that actually exist here, plus artifacts/.**
