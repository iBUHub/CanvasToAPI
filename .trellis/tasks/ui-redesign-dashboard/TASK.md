# Task Plan: UI Redesign - Dashboard Overview

---

## Phase 1: Setup & Foundation ✅

### 1.1 Update base styles and variables ✅

- [x] Update `ui/app/styles/variables.less` with new color palette
- [x] Add CSS custom properties for theming
- [x] Update `ui/app/index.html` with Google Fonts (Manrope, Inter, Material Symbols)

### 1.2 Create layout components ✅

- [x] Create `SideNavBar.vue` - Fixed sidebar with navigation
- [x] Create `TopAppBar.vue` - Top header with search and actions

---

## Phase 2: Dashboard Components ✅

### 2.1 Metric cards ✅

- [x] Create `MetricCard.vue` - Reusable metric card component
- [x] Implement 4 metric cards in StatusPage:
  - Server Status (with pulse animation)
  - Active Sessions
  - Today Requests
  - Avg Latency

### 2.2 Charts section ✅

- [x] Create `TrafficChart.vue` - Real-time traffic bar chart
- [x] Create `LoadDistribution.vue` - Account load progress bars

### 2.3 Data table ✅

- [x] Create `RequestTable.vue` - Recent API requests table
- [x] Implement status badges with color coding
- [x] Add filter and refresh buttons

---

## Phase 3: Page Assembly ✅

### 3.1 Rewrite StatusPage ✅

- [x] Update `StatusPage.vue` with new layout
- [x] Integrate all new components
- [x] Implement responsive grid
- [x] Add i18n support

### 3.2 Theme integration ✅

- [x] Implement dark mode toggle functionality
- [x] Ensure proper CSS custom property switching
- [x] Test color contrast in both modes

---

## Phase 4: Polish & Testing

### 4.1 Final styling

- [ ] Fine-tune spacing and alignment
- [ ] Add hover states and transitions
- [ ] Implement mobile responsive behavior

### 4.2 Testing

- [ ] Test light mode rendering
- [ ] Test dark mode rendering
- [ ] Test responsive breakpoints
- [ ] Verify all i18n strings
- [ ] Check for console errors

---

## Phase 5: Backend Integration ⏳ IN PROGRESS

### 5.1 Architecture Setup

- [ ] Update router configuration for multi-page navigation
- [ ] Create 2 new page components: SessionsPage, SettingsPage
- [ ] Update SideNavBar with 3 navigation items
- [ ] Implement page routing logic

### 5.2 Dashboard Page (StatusPage.vue) - Hybrid Approach

- [ ] Update metric cards:
  - Server Status → Service Status badge
  - Active Sessions → Real browserSessionCount
  - Today Requests → Total Usage
  - Remove Avg Latency card
- [ ] Simplify TrafficChart → Session Activity
- [ ] Update LoadDistribution → Session usage
- [ ] Remove RequestTable component
- [ ] Connect to `/api/status` endpoint
- [ ] Implement real-time updates

### 5.3 Sessions Page (New)

- [ ] Migrate Session Pool UI from main branch
- [ ] Connect to session endpoints
- [ ] Apply Material Design 3 styling

### 5.4 Settings Page (New)

- [ ] Migrate Settings UI from main branch
- [ ] Migrate Logs UI from main branch
- [ ] Connect to settings endpoints
- [ ] Apply Material Design 3 styling

---

## Build Status

✅ Build successful - CSS (419KB) + JS (1MB)

---

## Files Created/Modified

| File                                     | Status                      |
| ---------------------------------------- | --------------------------- |
| `ui/app/index.html`                      | Modified - Added fonts      |
| `ui/app/styles/variables.less`           | Modified - New color system |
| `ui/app/styles/global.less`              | Modified - Base styles      |
| `ui/app/components/SideNavBar.vue`       | Created                     |
| `ui/app/components/TopAppBar.vue`        | Created                     |
| `ui/app/components/MetricCard.vue`       | Created                     |
| `ui/app/components/TrafficChart.vue`     | Created                     |
| `ui/app/components/LoadDistribution.vue` | Created                     |
| `ui/app/components/RequestTable.vue`     | Created                     |
| `ui/app/pages/StatusPage.vue`            | Rewritten                   |
| `ui/locales/en.json`                     | Modified - Added new keys   |
| `ui/locales/zh.json`                     | Modified - Added new keys   |

---

## Notes

- Follow existing component structure in `ui/app/components/`
- Use Element Plus components where appropriate
- Maintain compatibility with existing i18n utility
- Keep styling consistent with PRD color palette
- Use scoped LESS styles with variables import
