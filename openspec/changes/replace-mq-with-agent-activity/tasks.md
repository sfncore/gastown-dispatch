# Tasks: Replace MQ Silos with Agent Activity Dashboard

## Phase 1: Agent Annunciator Panel (Core)

### 1.1 Create AgentTile Component
- [ ] Create `src/frontend/src/components/dashboard/AgentTile.tsx`
- [ ] Props: `agent: AgentRuntime`, `rigName: string`, `onClick: () => void`
- [ ] Backlit tile with glow effect based on status
- [ ] Status glow: green=working, amber=idle, red+pulse=error/stuck, dark=offline
- [ ] Display: agent name, status text, rig, work_title (truncated)
- [ ] Industrial/control panel aesthetic (dark bg, monospace font)
- [ ] Hover brightens glow, cursor pointer for clickability

### 1.2 Create AgentAnnunciator Component
- [ ] Create `src/frontend/src/components/dashboard/AgentAnnunciator.tsx`
- [ ] Props: `agents: AgentRuntime[]`, `rigs: RigStatus[]`
- [ ] Grid layout of AgentTile components (control panel style)
- [ ] Header: "AGENT STATUS" with overall status indicator (◉ OK / ⚠ ATTENTION)
- [ ] Responsive grid: 4-6 cols, tiles maintain square-ish aspect
- [ ] Panel border with industrial styling

### 1.3 Replace QueueLevel in Overview
- [ ] Import `AgentAnnunciator` in Overview.tsx
- [ ] Replace the "Message Queues" section (lines ~1010-1035) with AgentAnnunciator
- [ ] Pass `agents` and `rigs` from status data (already fetched)
- [ ] Update section header: "Message Queues" → "AGENT STATUS"
- [ ] Remove `QueueLevel` component import

## Phase 2: Needs Attention Enhancement

### 2.1 Enhance AlarmPanel Logic
- [ ] Add "attention" alarm type alongside "error" and "warning"
- [ ] Detect stuck agents: `has_work && !running`
- [ ] Detect high mail backlog: `unread_mail > 3` (lower threshold)
- [ ] Add attention badge count to panel header
- [ ] Style attention items with blue/cyan (distinct from error/warning)

### 2.2 Add Attention Item Display
- [ ] Show attention items in AlarmPanel below errors/warnings
- [ ] Include agent name, rig, and actionable description
- [ ] "polecat-01 stuck on: Fix auth bug"
- [ ] "furiosa/crew has 5 unread messages"

## Phase 3: Click-to-Command Interactivity

### 3.1 Agent Tile Click Actions
- [ ] Click agent tile → navigate to `/agents?selected={agentName}`
- [ ] Or open mail modal if agent has unread mail
- [ ] Add onClick handler to AgentTile

### 3.2 Work Title Click Action
- [ ] If `hook_bead` is present, clicking work title → navigate to bead
- [ ] Add separate onClick for work title area
- [ ] Prevent event bubbling to card click

### 3.3 Rig Label Click Action (Optional)
- [ ] Click rig name in agent card → open terminal to rig
- [ ] Use existing terminal routing: `/terminal?rig={rigName}`

## Phase 4: Cleanup and Polish

### 4.1 Remove Dead Code
- [ ] Delete `QueueLevel` component from Overview.tsx (lines 65-200)
- [ ] Remove any unused MQ-related types or utilities
- [ ] Verify no other components depend on QueueLevel

### 4.2 Visual Polish
- [ ] Match existing SCADA aesthetic (dark backgrounds, status glows)
- [ ] Add subtle pulse animation for actively working agents
- [ ] Ensure consistent spacing with other dashboard sections
- [ ] Test responsive behavior at various breakpoints

### 4.3 Accessibility
- [ ] Add aria-labels to status indicators
- [ ] Ensure keyboard navigation works
- [ ] Add tooltips explaining status colors

## Phase 5: Testing

### 5.1 Component Tests
- [ ] Test AgentTile renders correct glow for each state
- [ ] Test AgentAnnunciator displays agents in grid
- [ ] Test click handlers navigate to correct routes
- [ ] Test AlarmPanel shows attention items

### 5.2 Integration Tests
- [ ] Test Overview renders AgentAnnunciator with mock data
- [ ] Test clicking agent tile opens correct view
- [ ] Test attention items appear when conditions met

## Dependencies

- **No blockers**: All data already available from `/api/status`
- **Parallel work**: Phase 1 and Phase 2 can proceed simultaneously
- **Sequential**: Phase 3 depends on Phase 1 completion
- **Optional**: Phase 3.3 (terminal integration) can be deferred

## Validation Criteria

- [ ] MQ silos no longer visible on Overview
- [ ] Agent cards show real-time work status
- [ ] Clicking agent card navigates somewhere useful
- [ ] Attention items appear in Alarms panel for stuck agents
- [ ] Dashboard still loads in <2s
- [ ] No TypeScript errors, lint passes
