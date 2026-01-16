# Design: Agent Activity Dashboard

## Context

The Overview dashboard follows a SCADA (Supervisory Control and Data Acquisition) industrial aesthetic with silos, gauges, and status indicators. The MQ silos were designed to show merge queue depth per rig, but the data isn't available from `gt status`.

We have rich agent activity data that IS available:
- `has_work: boolean` - Is agent currently working?
- `work_title: string` - What are they working on?
- `unread_mail: number` - Pending messages
- `state: string` - running/idle/error/stuck
- `hook_bead: string` - Which bead they're hooked to

## Goals

1. Replace dead UI with live, actionable data
2. Maintain SCADA industrial aesthetic
3. Unify "needs attention" items in one place
4. Make everything clickable/actionable
5. No new backend work - use existing data

## Non-Goals

1. Add SSE for real-time updates (polling is fine for v1)
2. Redesign entire dashboard layout
3. Add new data sources beyond `gt status`
4. Replace Rig Stations sidebar (complements, doesn't replace)

## Design Decisions

### Decision 1: Visual Style - Annunciator Panel

**Options Considered:**
- A) Processing Vessels - vertical fill like silos
- B) Annunciator Panel - backlit tile grid (classic SCADA)
- C) Horizontal Tanks - refinery style
- D) Gauge Cluster - circular gauges with needles
- E) Repurposed Silos - same shape, different meaning

**Chosen: Option B - Annunciator Panel**

Rationale:
- Silos semantically imply QUANTITY (how full?), but we're showing STATE (working/idle/fault)
- Backlit tiles are THE classic control room element - operators glance and see which need attention
- Better information density than silos
- Glowing/pulsing tiles naturally draw attention to issues
- More authentic SCADA aesthetic

### Decision 2: Annunciator Tile Design

Each tile is a backlit panel that GLOWS based on status:
```
┌─────────────────────────────────────────────────────────┐
│  AGENT STATUS                                    ◉ OK   │
├─────────┬─────────┬─────────┬─────────┬─────────────────┤
│ ▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓ │ ░░░░░░░ │ ████████│                 │
│ pcat-01 │ pcat-02 │ pcat-03 │ pcat-04 │                 │
│ WORKING │ WORKING │  IDLE   │  FAULT  │                 │
│ gtdispat│ furiosa │   nux   │ furiosa │                 │
│ Fix auth│ Add test│         │ Stuck45m│                 │
└─────────┴─────────┴─────────┴─────────┴─────────────────┘
```

Status glow effects (SCADA standard):
- 🟢 Green glow + pulse: Actively working (`has_work && running`)
- 🟡 Amber dim: Idle (`running && !has_work`)
- 🔴 Red glow + flash: Error/Stuck (`state === "error"` or `has_work && !running`)
- ⚫ Dark/off: Offline (`!running`)

### Decision 3: Needs Attention Integration

Enhance existing `AlarmPanel` rather than creating new component.

Current Alarms shows:
- Agent errors
- High unread mail (>5)

Add "Attention" category:
- Urgent mail (if we can detect priority)
- Stuck agents (work but not running)
- Agent explicitly requesting human input

This keeps alerts consolidated, maintains existing UI patterns.

### Decision 4: Click Actions

| Element | Click Action | Data Needed |
|---------|--------------|-------------|
| Agent card | Open agent detail/mail | agent name, rig |
| Work title | Open bead detail | hook_bead id |
| Mail badge | Open mail inbox | agent address |
| Rig label | Open terminal | rig name |
| Convoy card | Open modal | convoy id (already done) |

Implementation: Wrap existing components with click handlers, use existing modals/routes.

### Decision 5: Layout Integration

Agent Activity Grid goes in center panel where MQ silos were:
- Same grid position (below Work Pipeline)
- Same approximate height
- Responsive: 2-4 columns depending on viewport
- Scrollable if many agents

## Data Flow

```
gt status --json (5s poll)
       │
       ▼
/api/status endpoint
       │
       ▼
TanStack Query (10s refetch)
       │
       ├──► AgentFlow component (existing)
       ├──► AlarmPanel (enhanced)
       └──► AgentAnnunciator (NEW)
                │
                ▼
           AgentTile (NEW)
              - backlit glow effect
              - status indicator
              - work title
              - click handlers
```

No new backend endpoints needed. All data comes from existing `/api/status`.

## Component Architecture

```
Overview.tsx
├── ControlHeader (existing)
├── Left Panel
│   ├── AlarmPanel (enhanced with attention items)
│   └── ConvoyPanel (existing)
├── Center Panel
│   ├── AgentFlow (existing)
│   ├── WorkPipeline (existing)
│   └── AgentAnnunciator (NEW - replaces QueueLevel)
│       └── AgentTile (NEW) - backlit status tile
└── Right Panel
    └── RigStation (existing)
```

## Visual Mockup (ASCII)

Annunciator Panel with backlit tiles:
```
┌─ AGENT STATUS ANNUNCIATOR ───────────────────────────── ◉ OK ─┐
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────────┤
│ ▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓ │ ░░░░░░░ │ ████████│ ░░░░░░░ │             │
│ PCAT-01 │ PCAT-02 │ PCAT-03 │ PCAT-04 │ PCAT-05 │             │
│ WORKING │ WORKING │  IDLE   │  FAULT  │  IDLE   │             │
│ gtdispat│ furiosa │   nux   │ furiosa │ gtdispat│             │
│ Fix auth│ Add test│         │Stuck 45m│         │             │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────────┤
│ ▓▓▓▓▓▓▓ │ ░░░░░░░ │         │         │         │             │
│ PCAT-06 │ PCAT-07 │         │         │         │             │
│ WORKING │  IDLE   │         │         │         │             │
│ symbiot │ symbiot │         │         │         │             │
│ Refactor│         │         │         │         │             │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────────┘

Legend: ▓▓▓ = green glow (working), ░░░ = dim (idle), ███ = red (fault)
```

## Risks / Trade-offs

1. **Risk**: Too many agents won't fit
   - Mitigation: Scrollable container, collapse idle agents option

2. **Risk**: Polling may miss short-lived work
   - Mitigation: Acceptable for v1; SSE can be added later

3. **Trade-off**: Cards take more space than silos
   - Accept: Cards provide actionable info; silos showed nothing

## Migration Plan

1. Create `AgentActivityGrid` and `AgentCard` components
2. Add enhanced attention logic to `AlarmPanel`
3. Replace `QueueLevel` grid in Overview with `AgentActivityGrid`
4. Remove `QueueLevel` component (dead code)
5. Add click handlers for interactivity

No database changes. No API changes. Frontend-only refactor.

## Open Questions

1. Should we show ALL agents or filter to active rigs only?
   - Recommendation: Show all, dim inactive

2. Should clicking agent open mail or terminal?
   - Recommendation: Mail (primary agent communication channel)

3. Should we keep Rig Stations sidebar or merge with Agent Activity?
   - Recommendation: Keep both - Rig Stations shows rig-level info (worker counts, branches), Agent Activity shows individual agent work
