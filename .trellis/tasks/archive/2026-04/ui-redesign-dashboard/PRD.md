# UI Redesign - Dashboard Overview

## Overview

Redesign the CanvasToAPI management panel frontend based on the Stitch design reference, using Vue 3 Composition API with Element Plus components.

---

## Design Reference

The design is based on the Stitch screen at:

- **Screenshot**: `.stitch/screens/4d92e2aba7ec4e21862500c8f2b81e0a.png`
- **HTML Reference**: `.stitch/screens/4d92e2aba7ec4e21862500c8f2b81e0a.html`

### Key Design Elements

**Layout Structure:**

- Fixed sidebar navigation (left, 256px width)
- Fixed top app bar (right of sidebar)
- Main content area with responsive grid
- Material Design 3 inspired with custom color palette

**Color Palette (from reference):**

- Primary: `#004ac6` / `#2563eb`
- Surface: `#faf8ff`
- Surface Container: `#ededf9`
- On Surface: `#191b23`
- Secondary: `#515f74`
- Tertiary: `#943700`
- Error: `#ba1a1a`
- Success (emerald): Emerald palette for status indicators

**Typography:**

- Headlines: Manrope (font-weight: 700-800)
- Body: Inter (font-weight: 400-600)
- Icons: Material Symbols Outlined

---

## Requirements

### 1. Layout Components

#### SideNavBar

- CanvasToAPI logo with subtitle "Technical Proxy"
- Navigation items with icons:
  - Dashboard (active state)
  - Accounts
  - Configuration
  - System Logs
- User profile card at bottom
- Collapsible on mobile

#### TopAppBar

- Search input with rounded styling
- Action buttons: Health metrics, Network, Dark mode toggle, Language switch
- Fixed position, glassmorphism effect

### 2. Dashboard Overview Page

#### Header Section

- Page title: "Dashboard Overview"
- Subtitle: "Real-time infrastructure health and API throughput"
- Action buttons: "Export Report", "New Deployment"

#### Metrics Cards (4-column grid)

1. **Server Status**
   - 99.98% uptime with pulse indicator
   - Status: "Online" with green badge
   - Mini sparkline chart

2. **Active Sessions**
   - Count: 12 sessions
   - 4 connected via WebSocket
   - Icon: groups

3. **Today Requests**
   - Count: 1,452
   - Trend: +12% vs yesterday
   - Icon: swap_calls

4. **Avg Latency**
   - Value: 240ms
   - P95: 385ms
   - Icon: timer

#### Charts Section (3-column grid)

**Real-time Traffic (2/3 width)**

- Bar chart showing request volume per minute
- 60-minute time range toggle
- Gradient fill under line

**Load Distribution (1/3 width)**

- Progress bars for each account
- account-01 (42%), account-02 (28%), account-03 (15%), account-04 (15%)
- Link to detailed balancer logs

#### Recent API Requests Table

- Columns: Method, Path, Status, Timestamp
- Status badges with color coding:
  - 200 OK: Green
  - 404 NOT: Amber
  - 500 ERR: Red
- Filter and refresh buttons
- Hover row highlighting

### 3. Technical Requirements

- Use Vue 3 Composition API with `<script setup>`
- Element Plus components for base UI elements
- CSS custom properties for theming (light/dark mode)
- Responsive grid using CSS Grid + Flexbox
- Material Symbols for icons (via CDN or local)
- Manrope + Inter fonts from Google Fonts
- LESS for styling with variables
- Support for i18n (reuse existing i18n utility)

### 4. Pages to Create/Modify

1. **New/Modified Components:**
   - `ui/app/components/SideNavBar.vue`
   - `ui/app/components/TopAppBar.vue`
   - `ui/app/components/MetricCard.vue`
   - `ui/app/components/TrafficChart.vue`
   - `ui/app/components/LoadDistribution.vue`
   - `ui/app/components/RequestTable.vue`

2. **Modified Pages:**
   - `ui/app/pages/StatusPage.vue` - Complete redesign

3. **New Styles:**
   - Update `ui/app/styles/variables.less` with new color tokens

---

## Non-Goals

- Do NOT change backend API structure
- Do NOT modify authentication logic
- Do NOT add new dependencies beyond design requirements
- Do NOT change routing structure

---

## Testing Criteria

- [ ] Dashboard renders correctly in light mode
- [ ] Dashboard renders correctly in dark mode
- [ ] All navigation items work
- [ ] Search functionality works
- [ ] Responsive layout works on tablet/desktop
- [ ] i18n strings display correctly
- [ ] No console errors

---

## Design Assets

Reference files are located at:

- `.stitch/screens/4d92e2aba7ec4e21862500c8f2b81e0a.html` - Full HTML/CSS reference
- `.stitch/screens/4d92e2aba7ec4e21862500c8f2b81e0a.png` - Screenshot reference
