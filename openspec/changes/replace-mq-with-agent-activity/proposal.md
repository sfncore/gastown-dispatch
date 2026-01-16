# Change: Replace MQ Silos with Agent Activity Dashboard

## Why

The Message Queues section on Overview shows empty silos because MQ data is not reliably available from `gt status`. These silos are dead UI consuming prime dashboard real estate. Meanwhile, we have rich agent activity data (`has_work`, `work_title`, `unread_mail`, `state`) that goes underutilized.

**Current state:**
- MQ silos: 6-12 empty vertical bars showing 0/0/0 for all rigs
- Agent data: Available but only shown in small Rig Station cards
- Actionable items: Scattered across mail, alarms, and beads - no unified view

## What Changes

### 1. REMOVE: Message Queues Section
Delete the `QueueLevel` silo visualization and its container from Overview center panel.

### 2. ADD: Agent Activity Grid (SCADA-style)
Replace silos with a SCADA-inspired agent activity panel showing:
- **Per-rig agent cards** (not silos) displaying:
  - Agent name + role
  - Current work (bead title if `has_work`)
  - Status indicator (working/idle/error/stuck)
  - Unread mail badge
  - Hook age (how long on current work)
- **Visual design**: Industrial control panel aesthetic with status lights, not empty cylinders

### 3. ENHANCE: Alarms Panel → "Needs Attention"
Extend existing Alarms to include actionable items:
- Urgent mail requiring human response
- Agents stuck/errored
- Merge conflicts
- Review requests
Keep existing error/warning logic, add "attention" category.

### 4. ADD: Click-to-Command
Make dashboard interactive:
- Click agent card → open mail/terminal
- Click convoy → open detail modal (already done via ConvoyPanel)
- Click rig → open terminal to rig
- Context menus for quick actions

## Impact

### Affected Components
- `Overview.tsx` - Remove MQ section, add Agent Activity Grid
- `AlarmPanel` component - Enhance with "Needs Attention" items
- `RigStation` component - May consolidate with new agent cards
- Backend: No new endpoints needed - data already in `gt status`

### Data Sources (Already Available)
| Data | Source | Endpoint |
|------|--------|----------|
| Agent work state | `gt status --json` | `/api/status` |
| Agent mail count | `gt status --json` | `/api/status` |
| Stuck/error state | `gt status --json` | `/api/status` |
| Convoy progress | `gt convoy status` | `/api/convoys` |
| Ready beads | `bd ready` | `/api/beads/ready` |

### What Stays the Same
- Work Pipeline (beads) - separate proposal `add-beads-overlays-overview`
- Convoy Panel - already functional with modals
- Rig Stations sidebar - keeps detailed per-rig view
- Control Header - unchanged
- Bottom trends bar - unchanged

## Non-Goals

- Adding new backend endpoints (use existing data)
- Real-time SSE for agent activity (can add later, polling sufficient for v1)
- Replacing Pipeline page functionality (separate proposal)
- Full terminal integration (future work)

## Holistic Dashboard Layout (After Change)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Control Header (Mayor status, Start/Stop)   │
├──────────┬─────────────────────────────────┬────────────────────┤
│ LEFT     │ CENTER                          │ RIGHT              │
│          │                                 │                    │
│ Alarms + │ Agent Flow (Mayor → Rigs)       │ Rig Stations      │
│ Needs    │                                 │ (per-rig detail)  │
│ Attention│ Work Pipeline (Beads)           │                    │
│          │                                 │                    │
│ Convoys  │ Agent Activity Grid (NEW)       │                    │
│ (panel)  │ [Replaces MQ Silos]             │                    │
│          │                                 │                    │
├──────────┴─────────────────────────────────┴────────────────────┤
│                      Bottom Trends Bar                           │
└─────────────────────────────────────────────────────────────────┘
```

## References

- Current MQ silos: `Overview.tsx` lines 65-200 (QueueLevel component)
- Agent data types: `src/backend/src/types/gasown.ts` (AgentRuntime)
- Alarm service: `src/backend/src/services/alarms.ts`
- Existing dashboard data: `src/backend/src/services/dashboard.ts`
