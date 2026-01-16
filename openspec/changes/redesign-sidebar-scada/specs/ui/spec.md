## ADDED Requirements

### Requirement: SCADA-Style Sidebar Navigation
The sidebar navigation SHALL use industrial SCADA-style visual design consistent with the dashboard aesthetic.

#### Scenario: Visual consistency with dashboard
- **WHEN** viewing the sidebar alongside the dashboard
- **THEN** the sidebar uses matching colors (cyan accents, dark backgrounds)
- **AND** borders have subtle glow effects on interactive elements
- **AND** typography uses industrial styling (uppercase section headers, technical fonts)

#### Scenario: Active navigation state
- **WHEN** a navigation item is active
- **THEN** it displays a cyan glow border effect
- **AND** the icon and text use cyan accent color
- **AND** the background is slightly elevated from inactive items

#### Scenario: Navigation sections
- **WHEN** viewing the sidebar
- **THEN** navigation items are grouped in bordered panel sections
- **AND** the "Gas Town" header appears in a distinct header panel
- **AND** the "Get Started" CTA appears in a footer panel

### Requirement: Sidebar Component Extraction
The sidebar SHALL be a standalone React component for maintainability.

#### Scenario: Component isolation
- **WHEN** the Sidebar component is imported
- **THEN** it receives navigation items as configuration
- **AND** it handles its own styling and state
- **AND** App.tsx composition remains clean
