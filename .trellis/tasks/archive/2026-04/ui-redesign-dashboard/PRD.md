# Product Requirements Document (PRD)

> UI Redesign - Dashboard Backend Integration

---

## Goal

Integrate the new Material Design 3 dashboard UI with actual backend functionality, preserving all working features from main branch while adapting the design to match available backend data.

---

## Background

**Current State:**

- Phase 1-3 completed: New UI components created (SideNavBar, TopAppBar, MetricCard, TrafficChart, LoadDistribution, RequestTable)
- Build successful: CSS (419KB) + JS (1MB)
- New design is static/mock data only, no backend integration

**Main Branch Features:**

- Session Pool Management: Display connected browser sessions, status, usage, errors, reset functionality
- Settings Configuration: Streaming mode, selection strategy, force thinking, session error threshold, debug mode
- Service Status: Connection status, version check, WebSocket endpoint
- Real-time Logs: Log viewing and download functionality

**Gap:**

- New design has no backend integration
- New design has aspirational metrics not supported by backend
- Need to bridge design aesthetics with backend reality

---

## Scope

### In Scope

1. **Multi-page navigation** - Dashboard, Sessions, Settings
2. **Dashboard backend integration** - Connect to `/api/status`, show real data
3. **Sessions page** - Migrate Session Pool Management from main branch
4. **Settings page** - Migrate Settings + Logs from main branch
5. **Material Design 3 styling** - Apply to all migrated features

### Out of Scope

- ❌ New backend metrics (uptime, request count, latency)
- ❌ Backend API changes
- ❌ Account Management (removed from codebase in commit 221a8a5)
- ❌ Mobile-first responsive design (can enhance later)
- ❌ Complete Phase 4 polish (can do incrementally)

---

## Requirements

### Functional Requirements

#### FR-1: Navigation

- **FR-1.1**: SideNavBar must have 3 navigation items: Dashboard, Sessions, Settings
- **FR-1.2**: Clicking nav item navigates to corresponding route
- **FR-1.3**: Active nav item shows visual indicator
- **FR-1.4**: Language switcher and logout button work

#### FR-2: Dashboard Page

- **FR-2.1**: Service Status card shows `serviceConnected` status (Online/Offline badge)
- **FR-2.2**: Active Sessions card shows real `browserSessionCount`
- **FR-2.3**: Load Distribution shows session usage data from `browserSessions[].usageCount`
- **FR-2.4**: Data updates every 3-5 seconds via polling `/api/status`
- **FR-2.5**: Remove: Today Requests card, Avg Latency card, Traffic Chart, Recent Requests table

#### FR-3: Sessions Page

- **FR-3.1**: Display session list with: ID, status, usage count, errors, connected time
- **FR-3.2**: Reset session health button calls `/api/sessions/:sessionId/reset-health`
- **FR-3.3**: Show service status (connection, version, WebSocket endpoint)
- **FR-3.4**: i18n support for all text

#### FR-4: Settings Page

- **FR-4.1**: Streaming Mode toggle calls `/api/settings/streaming-mode`
- **FR-4.2**: Selection Strategy dropdown calls `/api/settings/selection-strategy`
- **FR-4.3**: Session Error Threshold input calls `/api/settings/session-error-threshold`
- **FR-4.4**: Force switches (Thinking, Web Search, URL Context) call corresponding endpoints
- **FR-4.5**: Debug Mode toggle calls `/api/settings/debug-mode`
- **FR-4.6**: Log Max Count input calls `/api/settings/log-max-count`
- **FR-4.7**: Real-time logs viewer displays `logs` buffer
- **FR-4.8**: Download logs button saves logs to file
- **FR-4.9**: i18n support for all text

### Non-Functional Requirements

#### NFR-1: Performance

- **NFR-1.1**: Page load time < 2 seconds
- **NFR-1.2**: API response handling < 500ms
- **NFR-1.3**: Polling interval 3-5 seconds (configurable)

#### NFR-2: Compatibility

- **NFR-2.1**: Support Chrome, Firefox, Edge (latest 2 versions)
- **NFR-2.2**: Support light/dark theme
- **NFR-2.3**: Support English and Chinese languages

#### NFR-3: Maintainability

- **NFR-3.1**: Follow `.trellis/spec/frontend/` guidelines
- **NFR-3.2**: Use Vue 3 Composition API with `<script setup>`
- **NFR-3.3**: Use Element Plus components for UI elements
- **NFR-3.4**: Use LESS variables for styling

---

## Acceptance Criteria

### Must Have

- [ ] Dashboard shows real backend data (service status, sessions count, usage distribution)
- [ ] All 3 pages accessible via SideNavBar navigation
- [ ] Session Pool Management works (display, reset)
- [ ] Settings Configuration works (all toggles/inputs)
- [ ] Real-time Logs work (display, download)
- [ ] i18n works on all pages
- [ ] Language switcher works
- [ ] Logout works
- [ ] Light/dark theme works
- [ ] No console errors
- [ ] All API endpoints tested

### Should Have

- [ ] Page transitions are smooth
- [ ] Loading states for async operations
- [ ] Error handling for API failures
- [ ] Responsive layout for tablet/desktop

### Nice to Have

- [ ] Animations for status changes
- [ ] Real-time updates via WebSocket (instead of polling)
- [ ] Export dashboard data as PDF/CSV

---

## Dependencies

### Technical Dependencies

- Vue 3.4+ with Composition API
- Element Plus 2.7+
- Vite 5.4+
- LESS + CSS Custom Properties
- Material Symbols Outlined (icons)
- Google Fonts (Manrope, Inter)

### Backend Dependencies

- `/api/status` - System status and sessions
- `/api/settings/*` - Configuration endpoints
- `/api/sessions/:sessionId/reset-health` - Session reset
- `/api/version/check` - Version info
- `/logout` - Logout

### Code Dependencies

- Existing components: SideNavBar, TopAppBar, MetricCard, LoadDistribution
- Utils: `useTheme.js`, `i18n.js`
- Styles: `variables.less`
- Router: Vue Router with auth guard

---

## Risks and Mitigation

| Risk                                       | Probability | Impact | Mitigation                                                                  |
| ------------------------------------------ | ----------- | ------ | --------------------------------------------------------------------------- |
| Merge conflicts between parallel worktrees | Medium      | Medium | Phase 5.1 completes router setup first; work on independent page components |
| Style inconsistencies across pages         | Low         | Low    | Use shared `variables.less`; follow component guidelines                    |
| Backend API changes during development     | Low         | High   | No backend changes planned; API is stable                                   |
| Missing i18n keys                          | Medium      | Low    | Migrate i18n keys from main branch StatusPage.vue                           |
| Performance issues with polling            | Low         | Medium | Use 3-5 second interval; can optimize later                                 |

---

## Timeline

**Phase 5: Backend Integration**

| Phase | Task                          | Duration  | Executor                     |
| ----- | ----------------------------- | --------- | ---------------------------- |
| 5.1   | Architecture Setup            | 1-2 hours | Main Agent (sequential)      |
| 5.2   | Dashboard Backend Integration | 2-3 hours | Worktree Agent #1 (parallel) |
| 5.3   | Sessions Page                 | 3-4 hours | Worktree Agent #2 (parallel) |
| 5.4   | Settings Page                 | 3-4 hours | Worktree Agent #3 (parallel) |
| 5.5   | Final Integration & Testing   | 1-2 hours | Main Agent (sequential)      |

**Total Estimated Time**: 10-15 hours
**Parallel Execution Savings**: 4-6 hours

---

## Success Metrics

- All "Must Have" acceptance criteria passed
- No regression in backend functionality
- Code follows `.trellis/spec/frontend/` guidelines
- All API calls work correctly
- User can navigate between pages without errors
- Settings changes persist across sessions
- Real-time data updates correctly

---

## References

- Design Reference: `.stitch/screens/4d92e2aba7ec4e21862500c8f2b81e0a.html`
- Main Branch Code: `.temp/main-frontend/ui/app/pages/StatusPage.vue`
- Frontend Guidelines: `.trellis/spec/frontend/`
- Architecture Decisions: `DECISIONS.md`
- Implementation Plan: `IMPLEMENTATION.md`
