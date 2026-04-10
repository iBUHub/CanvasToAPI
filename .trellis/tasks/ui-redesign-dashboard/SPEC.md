# Task Specification: UI Redesign - Dashboard Overview

## Scope

Redesign the CanvasToAPI management panel frontend based on the Stitch design reference, implementing a modern dashboard with Material Design 3 aesthetics.

---

## Layer

**frontend**

---

## Component Breakdown

### SideNavBar

- Fixed left sidebar, 256px width
- Logo + navigation + user profile
- Collapsible on mobile

### TopAppBar

- Fixed header with glassmorphism
- Search input + action buttons
- Positioned right of sidebar

### MetricCard

- Reusable card for 4 key metrics
- Icon, value, subtitle, sparkline
- Status indicator support

### TrafficChart

- Bar chart for real-time traffic
- SVG-based visualization
- 60-minute toggle

### LoadDistribution

- Progress bars for account load
- 4 account entries
- Percentage display

### RequestTable

- Data table for API requests
- Status badges
- Filter/refresh actions

---

## Tech Stack

- **Framework**: Vue 3.4+ with Composition API
- **UI Library**: Element Plus 2.7+
- **Build Tool**: Vite 5.4+
- **Styling**: LESS + CSS Custom Properties
- **Icons**: Material Symbols Outlined
- **Fonts**: Manrope (headlines), Inter (body)

---

## Files to Modify

| File                           | Change Type   | Description           |
| ------------------------------ | ------------- | --------------------- |
| `ui/app/pages/StatusPage.vue`  | Major rewrite | Main dashboard page   |
| `ui/app/styles/variables.less` | Update        | Add new color tokens  |
| `ui/app/index.html`            | Minor         | Add Google Fonts link |

## Files to Create

| File                                     | Description             |
| ---------------------------------------- | ----------------------- |
| `ui/app/components/SideNavBar.vue`       | Left navigation sidebar |
| `ui/app/components/TopAppBar.vue`        | Top header with search  |
| `ui/app/components/MetricCard.vue`       | Metric display card     |
| `ui/app/components/TrafficChart.vue`     | Real-time traffic chart |
| `ui/app/components/LoadDistribution.vue` | Account load bars       |
| `ui/app/components/RequestTable.vue`     | API requests table      |

---

## Dependencies

No new npm dependencies required. Using:

- Element Plus (already installed)
- Google Fonts (CDN)
- Material Symbols (CDN)

---

## i18n Keys Needed

```json
{
  "dashboardOverview": "Dashboard Overview",
  "realTimeInfrastructure": "Real-time infrastructure health and API throughput",
  "exportReport": "Export Report",
  "newDeployment": "New Deployment",
  "serverStatus": "Server Status",
  "online": "Online",
  "uptime24h": "Uptime last 24h",
  "activeSessions": "Active Sessions",
  "connectedViaWs": "connected via WebSocket",
  "todayRequests": "Today Requests",
  "avgLatency": "Avg Latency",
  "realtimeTraffic": "Real-time Traffic",
  "globalRequestVolume": "Global request volume (per minute)",
  "loadDistribution": "Load Distribution",
  "requestsPerAccount": "Requests per account unit",
  "viewDetailedLogs": "View Detailed Balancer Logs",
  "recentApiRequests": "Recent API Requests",
  "method": "Method",
  "path": "Path",
  "status": "Status",
  "timestamp": "Timestamp"
}
```

---

## Performance Considerations

- Use CSS containment for cards
- Lazy load chart component
- Virtual scrolling for large request tables
- Icon font subsetting if bundle size concerns

---

## Accessibility

- Semantic HTML structure
- ARIA labels for icon buttons
- Keyboard navigation support
- Color contrast compliance (WCAG AA)
- Focus visible states
