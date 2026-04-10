# Settings Page Implementation (Phase 5.4)

## Goal

Implement the Settings Configuration page to display and manage system settings, streaming mode, selection strategy, and real-time logs.

---

## Requirements

### Functional Requirements

#### FR-1: Settings Configuration

- **FR-1.1**: Streaming Mode toggle (fake/real)
  - Calls `PUT /api/settings/streaming-mode`
  - Shows confirmation for "real" mode
- **FR-1.2**: Selection Strategy dropdown (round/random)
  - Calls `PUT /api/settings/selection-strategy`
- **FR-1.3**: Session Error Threshold input
  - Calls `PUT /api/settings/session-error-threshold`
- **FR-1.4**: Force switches (Thinking, Web Search, URL Context)
  - Each calls corresponding PUT endpoint
- **FR-1.5**: Debug Mode toggle
  - Calls `PUT /api/settings/debug-mode`
- **FR-1.6**: Log Max Count input
  - Calls `PUT /api/settings/log-max-count`

#### FR-2: Real-time Logs

- **FR-2.1**: Display logs from `/api/status` response
- **FR-2.2**: Poll for log updates every 3-5 seconds
- **FR-2.3**: "Clear View" button to clear current logs
- **FR-2.4**: "Download Logs" button to save logs to file

#### FR-3: Settings State Management

- **FR-3.1**: Load current settings on mount
- **FR-3.2**: Update settings via API calls
- **FR-3.3**: Show success/error notifications on save
- **FR-3.4**: Persist settings across page refresh

#### FR-4: i18n Support

- **FR-4.1**: All labels and text support English and Chinese
- **FR-4.2**: Use existing i18n keys from `en.json` and `zh.json`

#### FR-5: Material Design 3 Styling

- **FR-5.1**: Follow existing page layout pattern
- **FR-5.2**: Use Element Plus components (ElSwitch, ElSelect, ElInput, ElButton)
- **FR-5.3**: Apply LESS variables for consistent styling
- **FR-5.4**: Proper spacing and visual hierarchy

---

## Technical Specifications

### API Endpoints

```javascript
// Get current settings (from /api/status)
GET /api/status

// Update settings
PUT /api/settings/streaming-mode
PUT /api/settings/selection-strategy
PUT /api/settings/session-error-threshold
PUT /api/settings/force-thinking
PUT /api/settings/force-web-search
PUT /api/settings/force-url-context
PUT /api/settings/debug-mode
PUT /api/settings/log-max-count

// Request body format
{
  "value": <new_value>
}
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
          <h1 class="page-title">{{ t("settingsConfiguration") }}</h1>
          <p class="page-subtitle">{{ t("systemSettingsLogs") }}</p>
        </div>

        <!-- Settings Section -->
        <div class="settings-section">
          <h2>{{ t("serviceConfig") }}</h2>

          <!-- Streaming Mode -->
          <div class="setting-item">
            <label>{{ t("streamingMode") }}</label>
            <ElSwitch v-model="streamingMode" @change="updateStreamingMode" />
          </div>

          <!-- Selection Strategy -->
          <div class="setting-item">
            <label>{{ t("selectionStrategyLabel") }}</label>
            <ElSelect v-model="selectionStrategy" @change="updateSelectionStrategy">
              <ElOption label="Round Robin" value="round" />
              <ElOption label="Random" value="random" />
            </ElSelect>
          </div>

          <!-- Other settings... -->
        </div>

        <!-- Logs Section -->
        <div class="logs-section">
          <h2>{{ t("realtimeLogs") }}</h2>
          <div class="logs-content">{{ logs }}</div>
          <div class="logs-actions">
            <ElButton @click="clearLogs">{{ t("clearViewLabel") }}</ElButton>
            <ElButton @click="downloadLogs">{{ t("downloadLogs") }}</ElButton>
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

- [ ] All settings display correctly
- [ ] Settings updates call correct API endpoints
- [ ] Success/error notifications shown
- [ ] Logs display and update in real-time
- [ ] Clear logs button works
- [ ] Download logs button works
- [ ] i18n works for all text
- [ ] Styling matches Material Design 3
- [ ] No console errors
- [ ] No lint errors

### Should Have

- [ ] Confirmation dialogs for destructive actions
- [ ] Loading states during API calls
- [ ] Proper error handling
- [ ] Form validation

---

## Files to Modify

### Primary

- `ui/app/pages/SettingsPage.vue` - Complete implementation

### Reference

- `.temp/main-frontend/ui/app/pages/StatusPage.vue` - Extract settings and logs logic
- `ui/app/pages/StatusPage.vue` - Follow layout pattern

---

## References

- Reference Code: `.temp/main-frontend/ui/app/pages/StatusPage.vue` (settings configuration and logs sections)
- Implementation Plan: `.trellis/tasks/ui-redesign-dashboard/IMPLEMENTATION.md` (Phase 5.4)
- Frontend Guidelines: `.trellis/spec/frontend/`

---

## Estimated Duration

3-4 hours
