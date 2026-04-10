# UI Redesign - Backend Integration

## Goal

Integrate the new Material Design 3 dashboard UI with actual backend functionality, preserving all working features from main branch while removing unused decorative elements.

---

## What I Already Know

**Current State:**

- Phase 1-3 completed: New UI components created (SideNavBar, TopAppBar, MetricCard, TrafficChart, LoadDistribution, RequestTable)
- Build successful: CSS (419KB) + JS (1MB)
- New design is static/mock data only, no backend integration

**Main Branch Features (2386 lines StatusPage.vue):**

- **3 Tabs**: Home (status), Settings (configuration), Logs (real-time logs)
- **Session Pool Management**: Display connected browser sessions, usage count, errors, reset functionality
- **Account Management**: Auth file upload/download/delete, account switching
- **Settings Configuration**: streaming mode, selection strategy, force thinking, session error threshold, debug mode
- **Service Status**: Connection status, version check, WebSocket endpoint
- **Real-time Logs**: Log viewing and download functionality

**New Design Current State:**

- Dashboard Overview page with static mock data
- Metric cards with hardcoded values
- Traffic/Load charts without real data
- Request table with sample data
- Missing: All 3 tabs, session management, account management, settings, logs

**Backend API Endpoints Available:**

- `/api/settings/streaming-mode`
- `/api/settings/selection-strategy`
- `/api/settings/force-thinking`
- Session management endpoints
- Account management endpoints

## Assumptions (Temporary)

- Users want to keep all working backend features from main branch
- The new design's visual style should be preserved
- Navigation structure may need to change to accommodate all features
- Some decorative elements from the design may be removed if they don't serve backend functionality

---

## Decision (ADR-lite)

**Context**: New Material Design 3 UI needs to integrate with existing backend features from main branch (Session Pool, Account Management, Settings, Logs). Navigation structure decision required.

**Decision**: Adopt **Approach A - Progressive Integration** with separate pages for each feature module:

- Dashboard (default landing page)
- Sessions (Session Pool Management)
- Settings (Configuration + Logs)

**Consequences**:

- ✅ Clear information architecture, each feature independent
- ✅ New design style can expand to all pages gradually
- ✅ Easy to maintain and test
- ⚠️ Moderate development effort (~2 days)
- ⚠️ Need to create 2 new page components

---

## Dashboard Metrics Analysis

### Backend Available Data (`/api/status`)

**System Status:**

- `serviceConnected`: boolean (service connection status)
- `browserSessionCount`: number (active browser sessions)
- `browserSessions`: array (detailed session info)
  - connectionId, authenticated, connectedAt, disabledAt
  - failureCount, lastError, usageCount, selectedCount
  - readyState, meta

**Configuration:**

- `streamingMode`: "fake" | "real"
- `selectionStrategy`: "round" | "random"
- `sessionErrorThreshold`: number
- `debugMode`: boolean
- `forceThinking`, `forceWebSearch`, `forceUrlContext`: boolean
- `logMaxCount`: number
- `browserWsPath`: string

**Logs:**

- `logCount`: number
- `logs`: string (text log buffer)

**Version:**

- `/api/version/check`: current version, hasUpdate, latestVersion

### New Design Metrics vs Reality

| Metric Card       | Design Value    | Backend Support                 | Action Needed                            |
| ----------------- | --------------- | ------------------------------- | ---------------------------------------- |
| Server Status     | "99.98% uptime" | ❌ No uptime data               | **Replace with serviceConnected status** |
| Active Sessions   | "12 sessions"   | ✅ `browserSessionCount`        | **Use real data**                        |
| Today Requests    | "1,452"         | ❌ No request counter           | **Remove or add backend tracking**       |
| Avg Latency       | "240ms"         | ❌ No latency metrics           | **Remove or add backend tracking**       |
| Traffic Chart     | Traffic bars    | ❌ No time-series data          | **Remove or simplify**                   |
| Load Distribution | Account loads   | ⚠️ `browserSessions.usageCount` | **Replace with session usage**           |
| Recent Requests   | Request table   | ❌ No request log               | **Remove or add backend tracking**       |

---

## Open Questions (Critical for Implementation)

**Question 1: Metrics Scope**

The current design has several aspirational metrics (uptime, request count, latency, traffic charts) that don't exist in the backend. Which approach do you prefer?

1. **Minimal Viable Dashboard** - Only show what backend currently provides:
   - Service Status (Online/Offline)
   - Active Sessions count
   - Session usage distribution
   - Remove: Request count, Latency, Traffic chart, Recent requests table

2. **Add Backend Tracking** - Implement missing metrics in backend:
   - Add request counter middleware
   - Add response time tracking
   - Add request log buffer
   - Keep all design elements (higher effort)

3. **Hybrid** - Keep visual structure but simplify:
   - Replace "uptime" with service status badge
   - Replace "Today Requests" with "Total Usage" (sum of usageCount)
   - Remove latency card
   - Simplify traffic chart to "Session Activity" (last 24h connection count)
   - Keep load distribution (map to session usage)
   - Remove recent requests table

**Which scope do you prefer?**

**Decision**: Adopt **Hybrid Approach** - Keep visual structure but map to available backend data:

- Replace "Server Status/Uptime" → Service Status badge (Online/Offline)
- Replace "Today Requests" → Total Usage (sum of usageCount)
- Remove "Avg Latency" card
- Simplify Traffic Chart → Session Activity visualization
- Keep Load Distribution (map to session usageCount)
- Remove Recent Requests table

**Rationale**: Balance between design aesthetics and implementation feasibility. Avoid backend changes while maintaining useful dashboard functionality.

---

## Requirements (Evolving)

**Phase 1-3: ✅ Completed** (UI Components & Styling)

**Phase 4: Polish & Testing** (Partially Complete)

- [ ] Fine-tune spacing and alignment
- [ ] Add hover states and transitions
- [ ] Implement mobile responsive behavior
- [ ] Test light/dark mode rendering

**Phase 5: Backend Integration** (New - APPROACH A)

### 5.1 Architecture Setup

- [ ] Update router configuration for multi-page navigation
- [ ] Create 2 new page components: SessionsPage, SettingsPage
- [ ] Update SideNavBar with 3 navigation items (Dashboard, Sessions, Settings)
- [ ] Implement page routing logic

### 5.2 Dashboard Page (StatusPage.vue) - HYBRID APPROACH

- [ ] Update metric cards:
  - Server Status → Service Status badge (serviceConnected)
  - Active Sessions → Use real browserSessionCount
  - Today Requests → Total Usage (sum of usageCount)
  - Remove Avg Latency card
- [ ] Simplify TrafficChart → Session Activity component
- [ ] Update LoadDistribution → Use session usageCount data
- [ ] Remove RequestTable component
- [ ] Implement real-time data updates (polling/WebSocket)
- [ ] Connect to `/api/status` endpoint

### 5.3 Sessions Page (New Component)

- [ ] Migrate Session Pool Management UI from main branch Home tab
- [ ] Connect to `/api/status` and `/api/sessions/:sessionId/reset-health` endpoints
- [ ] Implement session status display, reset functionality
- [ ] Apply new Material Design 3 styling

### 5.4 Settings Page (New Component)

- [ ] Migrate Settings Configuration UI from main branch Settings tab
- [ ] Migrate Real-time Logs UI from main branch Logs tab
- [ ] Connect to settings endpoints (`/api/settings/*`)
- [ ] Implement log viewer with download functionality
- [ ] Apply new Material Design 3 styling

---

## Technical Notes

**Main Branch Reference Code:**

- ✅ All frontend files extracted to `.temp/main-frontend/ui/` (18 files)
- ✅ Reference guide: `.temp/MAIN-FRONTEND-REFERENCE.md`
- ✅ Usage guide: `.temp/HOW-TO-USE.md`
- ✅ Search helper: `scripts/search-main-frontend.sh`

**Current Router Structure:**

- Single-page app with Vue Router
- Current routes: `/` (StatusPage), `/login` (LoginPage), `/:pathMatch` (NotFound)
- Auth guard checks `/api/status` for authentication

**Migration Strategy:**

- Extend router with 3 new routes: `/sessions`, `/accounts`, `/settings`
- Keep StatusPage as default landing page (`/`)
- SideNavBar navigation will use `router.push()` for page navigation

**Files to Analyze:**

- `ui/app/pages/StatusPage.vue` (main branch) - 2386 lines with all features
- Backend routes: `src/routes/StatusRoutes.js` - settings endpoints
- State management: sessions, accounts, settings
- i18n keys: extensive account/session/settings translations

**Main Branch Features to Migrate:**

**IMPORTANT**: AuthPage.vue was removed in commit 221a8a5 (2026-04-08). Account Management features no longer exist in current main branch.

**Current Main Branch Features (StatusPage.vue - 1547 lines):**

**Tab 1: Home (Session Pool Management)**

- Service Status display (connection status, WebSocket endpoint, version)
- Session Pool Management (list, status, reset, error display)
- Active sessions count and details
- Version check and update notification

**Tab 2: Settings (Configuration)**

- Settings Configuration:
  - Streaming Mode (fake/real)
  - Selection Strategy (round/random)
  - Session Error Threshold
  - Force Thinking, Force Web Search, Force URL Context
  - Debug Mode
  - Log Max Count

**Tab 3: Logs (Real-time Logs)**

- Real-time Logs viewer
- Download logs functionality

**Sidebar Actions:**

- Language switcher
- Logout functionality

**NO LONGER EXISTS:**

- ❌ Account Management (AuthPage.vue removed)
- ❌ Auth file upload/download/delete
- ❌ Account switching

**Constraints:**

- Must preserve all working backend functionality
- New visual design should be maintained
- i18n support must continue working
- No backend API changes required (hybrid approach)

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
