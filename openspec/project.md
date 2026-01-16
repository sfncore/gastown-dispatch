# Project Context

## Purpose
**gastown-dispatch** is a local-first web UI replacement for Gas Town CLI. It wraps `gt` and `bd` commands rather than reimplementing their logic, providing a browser interface for users who don't want to use tmux or CLI directly. The goal is complete replacement for human interaction with Gas Town - users should never need to use tmux manually or understand CLI commands.

## Tech Stack

### Backend (src/backend/)
- **Runtime**: Node.js 20+, ES Modules
- **Framework**: Express 4.x with TypeScript
- **Build**: tsx (dev), tsc (prod)
- **Testing**: Vitest
- **Key Libraries**: 
  - node-pty (terminal emulation)
  - ws (WebSocket for PTY sessions)
  - zod (validation)
  - helmet, cors (security)

### Frontend (src/frontend/)
- **Framework**: React 18 with TypeScript
- **Build**: Vite 6
- **Styling**: Tailwind CSS 3.x
- **State**: TanStack Query v5 (10s polling most endpoints, 5s metrics)
- **Routing**: React Router v7
- **Terminal**: xterm.js v6
- **Icons**: Lucide React

### Ports
- Backend: 4320
- Frontend: 4321 (proxies /api/* to backend)

## Project Conventions

### Code Style
- TypeScript strict mode
- ES Modules (`type: "module"`)
- ESLint for linting
- Prefer explicit types over inference for function signatures
- Use zod for runtime validation at API boundaries

### Architecture Patterns
```
Browser (:4321) → TanStack Query → Fetch → Express API (:4320)
                                              ↓
                                     Service Layer
                                              ↓
                                   Command Runner (subprocess)
                                              ↓
                                     Gas Town CLI (gt, bd)
```

**Key patterns:**
- Services in `src/backend/src/services/` wrap CLI commands via `runGtJson<T>()` and `runBdJson<T>()` from `commands/runner.ts`
- Prefer `--json` output where available from CLI tools
- SSE for real-time data: `/api/stream/logs`, `/api/stream/dispatch`, `/api/stream/dashboard`
- WebSocket at `/terminal` for PTY sessions attached to tmux

### Testing Strategy
- Backend unit tests with Vitest
- Run `npm run test` before commits
- Bug fixes MUST include regression tests

### Git Workflow
- Main branch for stable code
- Run lint + typecheck before commits: `npm run lint && npm run typecheck`
- Use beads (`bd`) for issue tracking
- Session close: git status → git add → bd sync → git commit → bd sync → git push

## Domain Context

| Term | Description |
|------|-------------|
| Town | Workspace containing all projects and agents |
| Rig | Project container with its own git repo |
| Mayor | AI coordinator managing cross-project work |
| Deacon | Background supervisor daemon |
| Convoy | Batch of tracked work across projects |
| Polecat | Ephemeral worker executing a single task |

## Important Constraints
- Local-first: All data comes from local Gas Town CLI, no remote APIs
- Wrapper architecture: Never reimplement gt/bd logic, only wrap their commands
- `GT_TOWN_ROOT` env var can override workspace detection
- Town root detected by finding `mayor/town.json` walking up from cwd

## External Dependencies
- **Gas Town CLI** (`gt`): Core workspace management
- **Beads CLI** (`bd`): Issue tracking system
- **tmux**: Terminal multiplexer for agent sessions
