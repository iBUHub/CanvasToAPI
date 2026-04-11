# Sessions Page Implementation (Phase 5.3)

## Goal

Implement the Sessions Management page to display browser session pool status and provide session health management functionality.

---

## Requirements

### Functional Requirements

#### FR-1: Session List Display

- **FR-1.1**: Display all browser sessions from `/api/status` endpoint
- **FR-1.2**: Show for each session:
  - Connection ID (session identifier)
  - Status (Connected/Disabled)
  - Usage count
  - Error count
  - Connected time (if available)
- **FR-1.3**: Visual badges for status (Online/Offline/Disabled)
- **FR-1.4**: Update list every 3-5 seconds via polling

#### FR-2: Session Health Management

- **FR-2.1**: "Reset Health" button for each session
- **FR-2.2**: Call `PUT /api/sessions/:sessionId/reset-health` on button click
- **FR-2.3**: Show confirmation dialog before reset
- **FR-2.4**: Display success/error message after reset
- **FR-2.5**: Refresh session list after successful reset

#### FR-3: Service Status Display

- **FR-3.1**: Show overall service connection status
- **FR-3.2**: Display WebSocket endpoint information
- **FR-3.3**: Show version information (current and latest)

#### FR-4: i18n Support

- **FR-4.1**: All text labels support English and Chinese
- **FR-4.2**: Language switching works correctly
- **FR-4.3**: Use existing i18n keys from `en.json` and `zh.json`

#### FR-5: Material Design 3 Styling

- **FR-5.1**: Use existing MetricCard component for status cards
- **FR-5.2**: Follow existing page layout pattern (see StatusPage.vue)
- **FR-5.3**: Use Element Plus components for interactive elements
- **FR-5.4**: Apply LESS variables for consistent styling

---

## Technical Specifications

### API Endpoints

```javascript
// Get sessions
GET /api/status

// Reset session health
PUT /api/sessions/:sessionId/reset-health
```

### Component Structure

```vue
<template>
  <div class="dashboard-layout">
    <SideNavBar :active-item="activeTab" @navigate="handleNavigate" />
    <TopAppBar @toggle-theme="toggleTheme" @toggle-language="toggleLanguage" />

    <main class="main-content">
      <div class="content-wrapper">
        <!-- Header -->
        <div class="page-header">
          <h1 class="page-title">{{ t("sessionsManagement") }}</h1>
          <p class="page-subtitle">{{ t("sessionPoolStatus") }}</p>
        </div>

        <!-- Service Status Cards -->
        <div class="status-cards">
          <MetricCard :label="t('serviceStatus')" :value="..." />
          <MetricCard :label="t('totalSessionsLabel')" :value="..." />
        </div>

        <!-- Sessions List -->
        <div class="sessions-list">
          <div v-for="session in sessions" :key="session.connectionId" class="session-item">
            <!-- Session details -->
            <ElButton @click="resetHealth(session.connectionId)">
              {{ t("sessionResetActionHint") }}
            </ElButton>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
```

---

## Acceptance Criteria

### Must Have

- [ ] Sessions list displays correctly
- [ ] Each session shows ID, status, usage, errors
- [ ] Reset Health button works
- [ ] API calls succeed (both GET and PUT)
- [ ] Polling updates data every 3-5 seconds
- [ ] i18n works for all text
- [ ] Styling matches Material Design 3
- [ ] No console errors
- [ ] No lint errors

### Should Have

- [ ] Loading state during initial fetch
- [ ] Confirmation dialog before reset
- [ ] Success/error notifications
- [ ] Empty state when no sessions

---

## Files to Modify

### Primary

- `ui/app/pages/SessionsPage.vue` - Complete implementation

### Reference

- `.temp/main-frontend/ui/app/pages/StatusPage.vue` - Extract session pool logic
- `ui/app/pages/StatusPage.vue` - Follow layout pattern
- `ui/app/components/MetricCard.vue` - Style reference

---

## References

- Reference Code: `.temp/main-frontend/ui/app/pages/StatusPage.vue` (session pool management section)
- Implementation Plan: `.trellis/tasks/ui-redesign-dashboard/IMPLEMENTATION.md` (Phase 5.3)
- Frontend Guidelines: `.trellis/spec/frontend/`

---

## Estimated Duration

3-4 hours
