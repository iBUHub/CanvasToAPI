# Implementation Plan

> UI Redesign - Backend Integration: Detailed execution plan for parallel development

---

## Overview

**Goal**: Integrate new Material Design 3 UI with backend functionality using parallel worktree agents

**Strategy**:

- Phase 5.1: Sequential (Main Agent) - Architecture setup
- Phase 5.2-5.4: Parallel (Worktree Agents) - Feature development
- Phase 5.5: Sequential (Main Agent) - Integration & testing

---

## Prerequisites

Before starting Phase 5:

- ✅ Phase 1-3 completed (UI components created)
- ✅ Build successful
- ✅ Main branch reference code extracted
- ✅ Frontend guidelines documented
- ✅ Architecture decisions made

---

## Phase 5.1: Architecture Setup (Sequential)

**Executor**: Main Agent (current repository)
**Duration**: 1-2 hours
**Branch**: `frontend-refactor`

### Tasks

#### 1. Update Router Configuration

**File**: `ui/app/router/index.js`

```javascript
// Add new routes
{
  path: '/sessions',
  name: 'Sessions',
  component: () => import('../pages/SessionsPage.vue'),
},
{
  path: '/settings',
  name: 'Settings',
  component: () => import('../pages/SettingsPage.vue'),
}
```

**Verification**:

- [ ] Routes added correctly
- [ ] Auth guard applies to new routes
- [ ] No console errors

#### 2. Create Page Component Skeletons

**Files to create**:

- `ui/app/pages/SessionsPage.vue` - Empty component with basic structure
- `ui/app/pages/SettingsPage.vue` - Empty component with basic structure

**Template**:

```vue
<!--
 * File: ui/app/pages/SessionsPage.vue
 * Description: Session pool management page
 *
 * Author: iBUHUB
-->
<template>
  <div class="sessions-page">
    <!-- Content will be added by Worktree Agent #2 -->
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import I18n from "../utils/i18n";
import { useTheme } from "../utils/useTheme";

const { theme } = useTheme();
const langVersion = ref(I18n.lang);
</script>

<style lang="less" scoped>
@import "../styles/variables.less";

.sessions-page {
  /* Styling will be added by Worktree Agent #2 */
}
</style>
```

**Verification**:

- [ ] Files created
- [ ] No syntax errors
- [ ] Pages accessible via router

#### 3. Update SideNavBar Navigation

**File**: `ui/app/components/SideNavBar.vue`

```javascript
// Add navigation items
const navItems = ref([
  { id: "dashboard", icon: "dashboard", label: "Dashboard" },
  { id: "sessions", icon: "devices", label: "Sessions" },
  { id: "settings", icon: "settings", label: "Settings" },
]);

// Update navigation handler
const handleNavClick = itemId => {
  emit("navigate", itemId);
  // Or use router.push if SideNavBar manages navigation
  router.push(`/${itemId === "dashboard" ? "" : itemId}`);
};
```

**Verification**:

- [ ] Nav items display correctly
- [ ] Active state works
- [ ] Navigation to all pages works

#### 4. Test Navigation Flow

**Steps**:

1. Start dev server: `npm run dev`
2. Click Dashboard nav item → navigates to `/`
3. Click Sessions nav item → navigates to `/sessions`
4. Click Settings nav item → navigates to `/settings`
5. Verify all pages load without errors

**Verification**:

- [ ] All pages accessible
- [ ] No console errors
- [ ] Navigation state updates correctly

---

## Phase 5.2-5.4: Parallel Execution Setup

**After Phase 5.1 completes**, configure 3 parallel worktree agents.

### Worktree Agent Configuration

#### Agent #1: Dashboard Backend Integration

**Task Directory**: `.trellis/tasks/ui-redesign-dashboard/`
**Branch**: `feature/dashboard-backend`
**Files to Modify**:

- `ui/app/pages/StatusPage.vue` (major rewrite)
- `ui/app/components/MetricCard.vue` (minor updates)

**Context Files (implement.jsonl)**:

```
.trellis/spec/frontend/component-guidelines.md
.trellis/spec/frontend/directory-structure.md
ui/app/pages/StatusPage.vue (current)
.temp/main-frontend/ui/app/pages/StatusPage.vue (reference)
ui/app/utils/i18n.js
ui/app/utils/useTheme.js
ui/app/styles/variables.less
```

**Context Files (check.jsonl)**:

```
.trellis/spec/frontend/quality-guidelines.md
.trellis/spec/frontend/component-guidelines.md
```

#### Agent #2: Sessions Page

**Task Directory**: `.trellis/tasks/ui-redesign-dashboard/`
**Branch**: `feature/sessions-page`
**Files to Modify**:

- `ui/app/pages/SessionsPage.vue` (create)

**Context Files (implement.jsonl)**:

```
.trellis/spec/frontend/component-guidelines.md
.trellis/spec/frontend/directory-structure.md
.temp/main-frontend/ui/app/pages/StatusPage.vue (extract session pool logic)
ui/app/utils/i18n.js
ui/app/utils/useTheme.js
ui/app/styles/variables.less
ui/app/components/MetricCard.vue (style reference)
```

#### Agent #3: Settings Page

**Task Directory**: `.trellis/tasks/ui-redesign-dashboard/`
**Branch**: `feature/settings-page`
**Files to Modify**:

- `ui/app/pages/SettingsPage.vue` (create)

**Context Files (implement.jsonl)**:

```
.trellis/spec/frontend/component-guidelines.md
.trellis/spec/frontend/directory-structure.md
.temp/main-frontend/ui/app/pages/StatusPage.vue (extract settings/logs logic)
ui/app/utils/i18n.js
ui/app/utils/useTheme.js
ui/app/styles/variables.less
```

---

## Phase 5.2: Dashboard Backend Integration (Parallel)

**Executor**: Worktree Agent #1
**Duration**: 2-3 hours
**Branch**: `feature/dashboard-backend`

### Tasks

#### 1. Connect to Backend API

**File**: `ui/app/pages/StatusPage.vue`

**Pattern** (from main branch):

```javascript
// State
const serviceConnected = ref(false);
const browserSessionCount = ref(0);
const browserSessions = ref([]);

// Fetch status
const refresh = async () => {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();

    serviceConnected.value = data.status.serviceConnected;
    browserSessionCount.value = data.status.browserSessionCount;
    browserSessions.value = data.status.browserSessions || [];
  } catch (err) {
    console.error("Failed to fetch status:", err);
  }
};

// Polling
let pollInterval;
onMounted(() => {
  refresh();
  pollInterval = setInterval(refresh, 3000);
});

onUnmounted(() => {
  clearInterval(pollInterval);
});
```

#### 2. Update Metric Cards

**Service Status Card**:

```vue
<MetricCard
  icon="cloud"
  :label="t('serviceStatus')"
  :value="serviceConnected ? t('online') : t('offline')"
  :status-type="serviceConnected ? 'success' : 'error'"
/>
```

**Active Sessions Card**:

```vue
<MetricCard icon="devices" :label="t('activeSessions')" :value="browserSessionCount" />
```

#### 3. Update Load Distribution

**File**: `ui/app/components/LoadDistribution.vue`

**Props update**:

```javascript
defineProps({
  sessions: {
    required: true,
    type: Array,
  },
});

// Map sessions to load data
const loadData = computed(() => {
  return props.sessions.map(session => ({
    id: session.connectionId,
    load: session.usageCount,
  }));
});
```

#### 4. Remove Unused Components

**Remove from StatusPage.vue**:

- Today Requests card
- Avg Latency card
- TrafficChart component
- RequestTable component

**Verification**:

- [ ] `/api/status` called successfully
- [ ] Metric cards show real data
- [ ] Load distribution shows session usage
- [ ] Polling works every 3 seconds
- [ ] No console errors

---

## Phase 5.3: Sessions Page (Parallel)

**Executor**: Worktree Agent #2
**Duration**: 3-4 hours
**Branch**: `feature/sessions-page`

### Tasks

#### 1. Create SessionsPage.vue

**Structure**:

```vue
<template>
  <div class="sessions-page">
    <TopAppBar />

    <div class="sessions-content">
      <!-- Service Status Card -->
      <div class="service-status">
        <!-- Connection status, version, WebSocket endpoint -->
      </div>

      <!-- Session Pool List -->
      <div class="session-list">
        <div v-for="session in sessions" :key="session.connectionId" class="session-item">
          <!-- Session info: ID, status, usage, errors, time -->
          <ElButton @click="resetHealth(session.connectionId)"> Reset Health </ElButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// State
const sessions = ref([]);
const serviceConnected = ref(false);

// Methods
const resetHealth = async sessionId => {
  await fetch(`/api/sessions/${sessionId}/reset-health`, { method: "PUT" });
  refresh();
};

// Lifecycle
onMounted(() => {
  refresh();
  startPolling();
});
</script>
```

#### 2. Extract Session Pool Logic from Main Branch

**Source**: `.temp/main-frontend/ui/app/pages/StatusPage.vue`

**Extract**:

- Session list UI (lines 238-614)
- Session state management
- `resetHealth()` function
- Session status badges

#### 3. Apply Material Design 3 Styling

**Use existing components**:

- `MetricCard` for status cards
- Element Plus components for list items

**Styling pattern**:

```less
@import "../styles/variables.less";

.sessions-page {
  background-color: @surface;
  padding: @spacing-xl;
}

.session-item {
  background-color: @surface-container;
  border: 1px solid @outline-variant;
  border-radius: @border-radius-lg;
  padding: @spacing-lg;
}
```

**Verification**:

- [ ] Session list displays correctly
- [ ] Reset health button works
- [ ] Service status shows correctly
- [ ] i18n works
- [ ] Styling matches MD3 design

---

## Phase 5.4: Settings Page (Parallel)

**Executor**: Worktree Agent #3
**Duration**: 3-4 hours
**Branch**: `feature/settings-page`

### Tasks

#### 1. Create SettingsPage.vue

**Structure**:

```vue
<template>
  <div class="settings-page">
    <TopAppBar />

    <div class="settings-content">
      <!-- Settings Configuration -->
      <div class="settings-section">
        <h2>Configuration</h2>

        <!-- Streaming Mode -->
        <ElSwitch v-model="streamingMode" @change="updateStreamingMode" />

        <!-- Selection Strategy -->
        <ElSelect v-model="selectionStrategy" @change="updateSelectionStrategy">
          <ElOption label="Round" value="round" />
          <ElOption label="Random" value="random" />
        </ElSelect>

        <!-- Other settings... -->
      </div>

      <!-- Logs Section -->
      <div class="logs-section">
        <h2>Logs</h2>
        <div class="log-viewer">
          {{ logs }}
        </div>
        <ElButton @click="downloadLogs">Download Logs</ElButton>
      </div>
    </div>
  </div>
</template>

<script setup>
// State
const streamingMode = ref("fake");
const selectionStrategy = ref("round");
const logs = ref("");

// Methods
const updateStreamingMode = async () => {
  await fetch("/api/settings/streaming-mode", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: streamingMode.value }),
  });
};

// Similar methods for other settings...

// Lifecycle
onMounted(() => {
  fetchSettings();
  startPolling();
});
</script>
```

#### 2. Extract Settings Logic from Main Branch

**Source**: `.temp/main-frontend/ui/app/pages/StatusPage.vue`

**Extract**:

- Settings UI (lines 617-1163)
- Settings state management
- All setting update functions
- Logs viewer (lines 1165-1190)

#### 3. Apply Material Design 3 Styling

**Pattern**:

```less
.settings-section {
  background-color: @surface-container;
  border-radius: @border-radius-lg;
  padding: @spacing-xl;
  margin-bottom: @spacing-lg;
}
```

**Verification**:

- [ ] All settings display correctly
- [ ] Settings updates work
- [ ] Logs display correctly
- [ ] Download logs works
- [ ] i18n works
- [ ] Styling matches MD3 design

---

## Phase 5.5: Final Integration & Testing (Sequential)

**Executor**: Main Agent (current repository)
**Duration**: 1-2 hours

### Tasks

#### 1. Merge Worktree Branches

```bash
# Check out main integration branch
git checkout frontend-refactor

# Merge each feature branch
git merge feature/dashboard-backend
git merge feature/sessions-page
git merge feature/settings-page

# Resolve any conflicts
```

#### 2. Test All Pages

**Test Matrix**:

| Page       | Test Case        | Expected Result    |
| ---------- | ---------------- | ------------------ |
| Dashboard  | Load page        | Shows real data    |
| Dashboard  | Polling          | Updates every 3s   |
| Sessions   | Load page        | Shows session list |
| Sessions   | Reset health     | Button works       |
| Settings   | Load page        | Shows all settings |
| Settings   | Change setting   | API call succeeds  |
| Settings   | View logs        | Logs display       |
| Settings   | Download logs    | File downloads     |
| Navigation | Click nav items  | Pages change       |
| i18n       | Switch language  | Text updates       |
| Theme      | Toggle dark mode | Styles change      |

#### 3. Fix Any Issues

- Resolve merge conflicts
- Fix style inconsistencies
- Fix i18n missing keys
- Fix console errors

#### 4. Run Quality Checks

```bash
npm run lint
npm run lint:fix
```

#### 5. Manual Testing

1. Start dev server: `npm run dev`
2. Test all pages manually
3. Test all features
4. Test responsive layout
5. Test light/dark theme

**Verification**:

- [ ] All tests pass
- [ ] No console errors
- [ ] No lint errors
- [ ] All features work

---

## Parallel Execution Advantages

**Time Savings**:

| Approach             | Duration   | Savings   |
| -------------------- | ---------- | --------- |
| Sequential (5.1-5.4) | 9-13 hours | -         |
| Parallel (5.2-5.4)   | 5-7 hours  | 4-6 hours |

**Isolation Benefits**:

- Each agent works on independent files
- No merge conflicts on shared components
- Easier to review individual changes
- Can test each feature independently

**Risk Mitigation**:

- Phase 5.1 completes shared setup first
- Each agent works in isolated worktree
- Final integration catches conflicts early

---

## Context Injection Strategy

Each worktree agent receives context via `implement.jsonl` and `check.jsonl`:

**Implement Context** (what to build):

- Frontend guidelines
- Reference code from main branch
- Utils (i18n, theme)
- Style variables

**Check Context** (how to verify):

- Quality guidelines
- Component guidelines
- Accessibility requirements

This ensures agents follow project conventions automatically.

---

## Success Criteria

### Phase 5.1

- [ ] Router updated with 3 routes
- [ ] Page skeletons created
- [ ] Navigation works

### Phase 5.2

- [ ] Dashboard shows real data
- [ ] Polling works
- [ ] Unused components removed

### Phase 5.3

- [ ] Sessions page displays
- [ ] Reset health works
- [ ] Styling matches MD3

### Phase 5.4

- [ ] Settings page displays
- [ ] All settings work
- [ ] Logs work

### Phase 5.5

- [ ] All branches merged
- [ ] All tests pass
- [ ] No errors

---

## Rollback Plan

If parallel execution fails:

1. Keep Phase 5.1 changes (router setup is valuable)
2. Merge one branch at a time
3. Fix issues sequentially
4. If still failing, revert to sequential execution

---

## Next Steps

After this plan is approved:

1. Execute Phase 5.1 (Main Agent)
2. Configure worktree agents
3. Start parallel execution
4. Monitor progress
5. Final integration
