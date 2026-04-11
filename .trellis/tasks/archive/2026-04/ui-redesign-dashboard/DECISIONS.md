# Architecture Decision Records (ADR)

> Critical decisions made for UI Redesign - Backend Integration

---

## ADR-001: Multi-Page Architecture

**Date**: 2026-04-10

**Status**: ✅ Accepted

### Context

The new Material Design 3 UI needs to integrate existing backend features from main branch:

- Session Pool Management
- Settings Configuration
- Real-time Logs

Current main branch uses a single-page design with 3 tabs (Home, Settings, Logs). New design is a dashboard overview with no tabs.

### Decision

Adopt **Progressive Integration** with separate pages:

- **Dashboard** (`/`) - Overview with real-time metrics
- **Sessions** (`/sessions`) - Session pool management
- **Settings** (`/settings`) - Configuration + Logs

### Consequences

**Pros:**

- Clear information architecture
- Each feature module is independent
- New design style can expand to all pages
- Easy to maintain and test

**Cons:**

- Moderate development effort (~10-15 hours)
- Need to create 2 new page components
- Router configuration required

### Alternatives Considered

1. **Single-Page with Tabs** - Keep main branch structure, restyle tabs
   - Rejected: New design doesn't have tab affordances

2. **Full Rewrite** - Rebuild all pages from scratch
   - Rejected: High risk, lose working backend integration

---

## ADR-002: Hybrid Metrics Approach

**Date**: 2026-04-10

**Status**: ✅ Accepted

### Context

Design reference includes aspirational metrics (uptime, request count, latency, traffic charts) that don't exist in backend.

**Backend Available Data:**

- `serviceConnected`: boolean
- `browserSessionCount`: number
- `browserSessions[]`: array with `usageCount`
- Settings values
- Log buffer

**Design Reference Metrics:**

- Server Status: "99.98% uptime"
- Active Sessions: "12 sessions"
- Today Requests: "1,452"
- Avg Latency: "240ms"
- Traffic Chart: Time-series data
- Recent Requests: Request log

### Decision

Adopt **Hybrid Approach** - Keep visual structure but map to available backend data:

| Design Metric     | Backend Support   | Action                                |
| ----------------- | ----------------- | ------------------------------------- |
| Server Status     | ❌ No uptime      | Replace with `serviceConnected` badge |
| Active Sessions   | ✅ Yes            | Use real `browserSessionCount`        |
| Today Requests    | ❌ No counter     | Remove card                           |
| Avg Latency       | ❌ No metrics     | Remove card                           |
| Traffic Chart     | ❌ No time-series | Remove or simplify                    |
| Load Distribution | ⚠️ Partial        | Map to `usageCount`                   |
| Recent Requests   | ❌ No log         | Remove table                          |

### Consequences

**Pros:**

- No backend changes required
- Implementation feasible within timeline
- Still provides useful dashboard functionality

**Cons:**

- Lose some visual richness from design
- May need to add backend tracking later

### Alternatives Considered

1. **Minimal Viable Dashboard** - Only show available data
   - Rejected: Too sparse, loses design intent

2. **Add Backend Tracking** - Implement all missing metrics
   - Rejected: Higher effort, requires backend changes

---

## ADR-003: Parallel Execution Strategy

**Date**: 2026-04-10

**Status**: ✅ Accepted

### Context

Phase 5 backend integration has 4 sub-phases:

- 5.1: Architecture Setup (router, navigation)
- 5.2: Dashboard Backend Integration
- 5.3: Sessions Page
- 5.4: Settings Page

Estimated total: 10-15 hours sequential.

### Decision

Execute **Phase 5.2-5.4 in parallel** using worktree agents:

```
Phase 5.1 (Sequential - Main Agent)
  ↓
Phase 5.2-5.4 (Parallel - Worktree Agents)
  ├── Dashboard Backend Integration
  ├── Sessions Page
  └── Settings Page
```

### Consequences

**Pros:**

- Reduce development time by 40-50%
- Isolated changes reduce merge conflicts
- Each agent focuses on one feature

**Cons:**

- Requires coordination on shared files (router)
- Potential for style inconsistencies
- Need merge conflict resolution

### Risk Mitigation

- Phase 5.1 completes router setup before parallel execution
- Each worktree works on independent page components
- Shared styles are in `variables.less` (already complete)
- Final integration agent resolves conflicts

---

## ADR-004: Component Reuse Strategy

**Date**: 2026-04-10

**Status**: ✅ Accepted

### Context

Main branch StatusPage.vue (1547 lines) has working backend integration logic that needs to be preserved.

### Decision

**Extract and adapt** patterns from main branch:

1. **Keep**: Backend API calls, state management, i18n
2. **Restyle**: UI layout using Material Design 3 components
3. **Remove**: Old styling, unused features

### Migration Pattern

```vue
<!-- Old pattern (main branch) -->
<template>
  <div class="status-page">
    <el-tabs>
      <el-tab-pane label="Home">
        <!-- Session pool UI -->
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<!-- New pattern ( redesigned) -->
<template>
  <div class="dashboard-page">
    <!-- Session pool UI with MD3 styling -->
  </div>
</template>
```

### Consequences

- Preserves working backend integration
- Reduces risk of breaking changes
- Requires careful extraction of logic from old components

---

## Decision Summary

| ADR | Decision                | Rationale                          |
| --- | ----------------------- | ---------------------------------- |
| 001 | Multi-page architecture | Clear separation, scalable         |
| 002 | Hybrid metrics          | Feasible, no backend changes       |
| 003 | Parallel execution      | Faster delivery, isolated work     |
| 004 | Extract and adapt       | Preserve working code, reduce risk |
