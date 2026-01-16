# Change: Redesign Sidebar to SCADA-Style Industrial Theme

## Why
The current sidebar uses a generic dark theme that doesn't match the industrial SCADA aesthetic of the main dashboard. Users expect visual consistency between the control room dashboard and navigation, reinforcing the "Gas Town" industrial metaphor.

## What Changes
- Extract sidebar into dedicated `Sidebar.tsx` component
- Apply SCADA industrial styling: cyan glow borders, darker backgrounds, technical typography
- Add visual hierarchy with bordered sections and glowing active states
- Match the dashboard's control panel aesthetic (grid lines, status indicators, industrial fonts)
- Maintain all existing navigation functionality

## Impact
- Affected specs: `ui` (new capability)
- Affected code: 
  - `src/frontend/src/App.tsx` (extract sidebar)
  - `src/frontend/src/components/Sidebar.tsx` (new)
  - `src/frontend/src/index.css` (SCADA utility classes)

## Visual Design Goals
Based on the dashboard screenshot:
- **Borders**: Cyan/teal glow effect on active items (`#00d4ff` / `#0ea5e9`)
- **Background**: Darker than current (`#0a0a0a` base, `#0f1419` surface)
- **Typography**: Uppercase labels, wider letter-spacing for industrial feel
- **Sections**: Bordered panels with corner accents
- **Active state**: Glowing border effect matching dashboard panels
- **Icons**: Retain lucide-react icons but with cyan accent on active
