# Agent Activity Specification

## ADDED Requirements

### Requirement: Agent Status Visualization
The Agent Activity Grid SHALL use SCADA-standard visual indicators to show agent status at a glance.

#### Scenario: Working agent shows green indicator
- **GIVEN** agent has `running: true` and `has_work: true`
- **WHEN** the agent card renders
- **THEN** a pulsing green status indicator is displayed
- **AND** the card has a working state visual treatment

#### Scenario: Idle agent shows yellow indicator
- **GIVEN** agent has `running: true` and `has_work: false`
- **WHEN** the agent card renders
- **THEN** a steady yellow status indicator is displayed
- **AND** the work area shows "Idle"

#### Scenario: Error agent shows red indicator
- **GIVEN** agent has `state: "error"` or (`has_work: true` and `running: false`)
- **WHEN** the agent card renders
- **THEN** a red status indicator is displayed
- **AND** the card has error state visual treatment

#### Scenario: Offline agent shows gray indicator
- **GIVEN** agent has `running: false` and `has_work: false`
- **WHEN** the agent card renders
- **THEN** a gray status indicator is displayed
- **AND** the card is visually dimmed

---

### Requirement: Work Duration Display
Agent cards SHALL display how long an agent has been working on their current task.

#### Scenario: Show hook age for working agent
- **GIVEN** agent has `has_work: true`
- **AND** the hook started 45 minutes ago
- **WHEN** the agent card renders
- **THEN** "45m" is displayed as the task duration
- **AND** a clock/timer icon accompanies the duration

#### Scenario: No duration for idle agent
- **GIVEN** agent has `has_work: false`
- **WHEN** the agent card renders
- **THEN** no duration is displayed
- **AND** the work area shows "Idle" status only

---

### Requirement: Agent-Rig Association
Each agent card SHALL clearly indicate which rig the agent belongs to.

#### Scenario: Display rig name in card
- **GIVEN** agent "polecat-01" belongs to rig "gtdispat"
- **WHEN** the agent card renders
- **THEN** "gtdispat" is displayed as the rig identifier
- **AND** the rig name is clickable for rig-level actions

#### Scenario: Group agents by rig optionally
- **GIVEN** the Agent Activity Grid has a "group by rig" option enabled
- **WHEN** the grid renders
- **THEN** agents are grouped under rig headers
- **AND** each rig section can be collapsed/expanded
