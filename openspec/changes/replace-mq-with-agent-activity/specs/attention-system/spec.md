# Attention System Specification

## MODIFIED Requirements

### Requirement: Alarm Panel Display
The Alarm Panel SHALL display errors, warnings, AND attention items that require human action. The panel MUST consolidate all actionable alerts in one location.

#### Scenario: Show error alarms
- **GIVEN** agent "polecat-01" has `state: "error"`
- **WHEN** the Alarm Panel renders
- **THEN** an error alarm is displayed with red styling
- **AND** the error count badge shows in the header

#### Scenario: Show warning alarms
- **GIVEN** agent "polecat-01" has `unread_mail: 6`
- **WHEN** the Alarm Panel renders
- **THEN** a warning alarm is displayed with yellow styling
- **AND** includes the message "polecat-01: 6 unread messages"

#### Scenario: Show attention items for stuck agents
- **GIVEN** agent "polecat-01" has `has_work: true` and `running: false`
- **WHEN** the Alarm Panel renders
- **THEN** an attention item is displayed with blue/cyan styling
- **AND** includes "polecat-01 stuck on: {work_title}"
- **AND** the attention count badge shows in the header

#### Scenario: Show attention items for high mail backlog
- **GIVEN** agent "polecat-01" has `unread_mail: 4` (threshold: 3)
- **WHEN** the Alarm Panel renders
- **THEN** an attention item is displayed
- **AND** includes "polecat-01 has 4 unread messages"

#### Scenario: All OK state
- **GIVEN** no agents have errors, warnings, or attention conditions
- **WHEN** the Alarm Panel renders
- **THEN** "ALL OK" badge is displayed
- **AND** panel shows "No active alarms"

---

## ADDED Requirements

### Requirement: Attention Badge Count
The Alarm Panel header SHALL display separate badge counts for errors, warnings, and attention items.

#### Scenario: Display all badge types
- **GIVEN** there are 1 error, 2 warnings, and 3 attention items
- **WHEN** the Alarm Panel header renders
- **THEN** "1 ERR" badge in red is displayed
- **AND** "2 WARN" badge in yellow is displayed
- **AND** "3 ATTN" badge in cyan/blue is displayed

#### Scenario: Hide zero counts
- **GIVEN** there are 0 errors, 1 warning, and 0 attention items
- **WHEN** the Alarm Panel header renders
- **THEN** only "1 WARN" badge is displayed
- **AND** error and attention badges are hidden

---

### Requirement: Attention Item Actions
Attention items SHALL provide click actions to address the underlying issue.

#### Scenario: Click stuck agent attention
- **GIVEN** an attention item for stuck agent "polecat-01" is displayed
- **WHEN** user clicks the attention item
- **THEN** the application opens the agent detail or terminal
- **AND** user can investigate/restart the agent

#### Scenario: Click mail backlog attention
- **GIVEN** an attention item for mail backlog is displayed
- **WHEN** user clicks the attention item
- **THEN** the application navigates to the agent's mail inbox
- **AND** unread messages are displayed
