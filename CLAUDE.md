<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**gastown-dispatch** is a local-first web UI replacement for Gas Town CLI. It wraps `gt` and `bd` commands rather than reimplementing their logic, providing a browser interface for users who don't want to use tmux or CLI directly.

## Development Commands

```bash
# Install all dependencies (run first)
npm run install:all

# Development - runs both backend and frontend concurrently
npm run dev

# Individual services
npm run dev:backend      # Express on :4320
npm run dev:frontend     # Vite on :4321

# Quality checks (run before commits)
npm run lint && npm run typecheck

# Testing
npm run test             # Backend tests only (vitest)
cd src/backend && npm run test:watch  # Watch mode
```

**Ports**: Backend=4320, Frontend=4321 (proxies /api/* to backend)

## Architecture

```
Browser (:4321) → TanStack Query → Fetch → Express API (:4320)
                                              ↓
                                     Service Layer
                                              ↓
                                   Command Runner (subprocess)
                                              ↓
                                     Gas Town CLI (gt, bd)
```

**Key pattern**: Services in `src/backend/src/services/` wrap CLI commands via `runGtJson<T>()` and `runBdJson<T>()` from `commands/runner.ts`. Prefer `--json` output where available.

### Backend (`src/backend/`)
- **api/routes.ts** - REST endpoints
- **api/streaming.ts** - SSE endpoints for logs, dispatch, dashboard
- **services/** - Business logic: status (5s cache), beads, convoys, actions, rigs, dispatch, pty
- **commands/runner.ts** - Subprocess execution for gt/bd commands

### Frontend (`src/frontend/src/`)
- **pages/** - Route components (Overview, Convoys, Beads, Rigs, etc.)
- **lib/api.ts** - Typed API client
- **hooks/** - Custom React hooks
- TanStack Query for server state (10s polling for most endpoints, 5s for metrics)

### Real-time Features
- **SSE**: `/api/stream/logs`, `/api/stream/dispatch`, `/api/stream/dashboard`
- **WebSocket**: `/terminal` for PTY sessions attached to tmux

## Gas Town Concepts

| Term | Description |
|------|-------------|
| Town | Workspace containing all projects and agents |
| Rig | Project container with its own git repo |
| Mayor | AI coordinator managing cross-project work |
| Deacon | Background supervisor daemon |
| Convoy | Batch of tracked work across projects |
| Polecat | Ephemeral worker executing a single task |

## Configuration

- `GT_TOWN_ROOT` env var overrides workspace detection
- Town root detected by finding `mayor/town.json` walking up from cwd
- Frontend uses `@` alias for `src/frontend/src/`

## Issue Tracking (Beads)

This project uses **beads** for issue tracking. Issues are in `.beads/beads.jsonl`.

```bash
bd ready                    # Find available work
bd update <id> --status in_progress
bd close <id> --reason "..."
bd sync                     # Commit and push changes
```

Use `bv --robot-triage` (not bare `bv`) for AI-friendly task analysis.

## Session Close Protocol

Before ending any session:
```bash
git status
git add <files>
bd sync
git commit -m "..."
bd sync
git push
```
