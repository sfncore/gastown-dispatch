# Dashboard Layout Specification

## REMOVED Requirements

### Requirement: Message Queue Silos
**Reason**: MQ data is not available from `gt status --json`. Silos always show 0/0/0 for all rigs, providing no value.
**Migration**: Replace with Agent Activity Grid showing actual agent work status.

---

## ADDED Requirements

### Requirement: Agent Activity Grid
The Overview dashboard center panel SHALL display an Agent Activity Grid showing the current work status of all agents across all rigs. The grid MUST replace the former Message Queue silos section.

#### Scenario: Grid displays all agents
- **GIVEN** the Overview page is loaded
- **AND** there are 8 agents across 3 rigs
- **WHEN** the Agent Activity Grid renders
- **THEN** all 8 agents are displayed in a responsive grid
- **AND** each agent shows name, role, and current status

#### Scenario: Grid shows working agents prominently
- **GIVEN** agent "polecat-01" has `has_work: true` and `work_title: "Fix auth bug"`
- **WHEN** the grid renders
- **THEN** polecat-01's card shows a green status indicator
- **AND** displays "Fix auth bug" as the current work
- **AND** shows hook age (time on task)

#### Scenario: Grid shows idle agents
- **GIVEN** agent "polecat-02" has `has_work: false` and `running: true`
- **WHEN** the grid renders
- **THEN** polecat-02's card shows a yellow status indicator
- **AND** displays "Idle" as the status

#### Scenario: Grid handles no agents
- **GIVEN** there are no agents in the system
- **WHEN** the Agent Activity Grid renders
- **THEN** an empty state message is displayed
- **AND** the message suggests starting agents

---

### Requirement: Agent Card Interactivity
Each agent card in the Activity Grid SHALL be clickable and provide quick access to agent-related actions.

#### Scenario: Click agent card opens agent detail
- **GIVEN** the Agent Activity Grid is displayed
- **AND** agent "polecat-01" card is visible
- **WHEN** user clicks the agent card
- **THEN** the application navigates to agent detail or mail view
- **AND** the agent's information is displayed

#### Scenario: Mail badge indicates unread messages
- **GIVEN** agent "polecat-01" has `unread_mail: 3`
- **WHEN** the card renders
- **THEN** a mail badge showing "3" is displayed
- **AND** the badge has visual emphasis (e.g., colored background)

#### Scenario: Click work title opens bead
- **GIVEN** agent "polecat-01" has `hook_bead: "gtdispat-abc123"`
- **AND** the work title is displayed
- **WHEN** user clicks the work title
- **THEN** the application navigates to bead detail view
- **AND** bead "gtdispat-abc123" is displayed
