# Frontend Development Guidelines

> Vue.js 3 + Element Plus + Vite frontend for CanvasToAPI

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Component Structure](#component-structure)
- [GitNexus Code Intelligence](#gitnexus-code-intelligence)
- [Code Exploration](#skill-gitnexus-exploring)
- [Impact Analysis](#skill-gitnexus-impact-analysis)
- [Debugging Workflow](#skill-gitnexus-debugging)
- [Safe Refactoring](#skill-gitnexus-refactoring)
- [Development Best Practices](#development-best-practices)
- [Related Documentation](#related-documentation)

---

## Architecture Overview

The CanvasToAPI frontend is built with:

- **Vue.js 3** - Composition API with `<script setup>`
- **Element Plus** - UI component library
- **Vite** - Build tool and dev server
- **Vue Router** - Client-side routing
- **Pinia** - State management (if used)

### Key Directories

```
ui/
├── src/
│   ├── components/      # Reusable Vue components
│   ├── views/           # Page-level components
│   ├── composables/     # Composition API utilities
│   ├── router/          # Vue Router configuration
│   ├── stores/          # Pinia stores (if applicable)
│   └── main.js          # Application entry point
├── public/              # Static assets
└── dist/                # Build output (served by Express)
```

---

## Component Structure

Follow Vue.js best practices:

```vue
<script setup>
import { ref, computed, onMounted } from "vue";
// Import composables and utilities
// Define props, emits, reactive state
// Component logic here
</script>

<template>
  <!-- Template with Element Plus components -->
</template>

<style scoped>
/* Scoped styles */
</style>
```

---

## GitNexus Code Intelligence

This project is indexed by GitNexus (557 symbols, 1614 relationships, 46 execution flows). Use GitNexus MCP tools to understand code, assess impact, and navigate safely.

### Prerequisites

- **Index status**: Check `gitnexus://repo/CanvasToAPI/context` before using tools
- **Stale index**: If tools report "Index is stale", run `npx gitnexus analyze` in terminal

---

@@@section:skill-gitnexus-exploring

## Code Exploration

### When to Use

- "How does authentication work?"
- "What's the project structure?"
- "Show me the main components"
- "Where is the database logic?"
- Understanding code you haven't seen before

### Workflow

```
1. READ gitnexus://repo/CanvasToAPI/context        → Codebase overview, check staleness
2. gitnexus_query({query: "<concept>"})            → Find related execution flows
3. gitnexus_context({name: "<symbol>"})            → Deep dive on specific symbol
4. READ gitnexus://repo/CanvasToAPI/process/{name} → Trace full execution flow
```

### Checklist

- [ ] READ `gitnexus://repo/CanvasToAPI/context`
- [ ] `gitnexus_query` for the concept you want to understand
- [ ] Review returned processes (execution flows)
- [ ] `gitnexus_context` on key symbols for callers/callees
- [ ] READ process resource for full execution traces
- [ ] Read source files for implementation details

### Tools

**gitnexus_query** — find execution flows related to a concept:

```javascript
gitnexus_query({ query: "session status monitoring" });
// → Processes: SessionStatusUpdate, WebSocketReconnect
// → Symbols grouped by flow with file locations
```

**gitnexus_context** — 360-degree view of a symbol:

```javascript
gitnexus_context({ name: "StatusPage" });
// → Incoming calls: router, App.vue
// → Outgoing calls: useSessionStatus, MetricCard
// → Processes: SessionMonitoring (step 1/3)
```

### Example: "How does session monitoring work?"

```
1. READ gitnexus://repo/CanvasToAPI/context
   → 557 symbols, 46 processes

2. gitnexus_query({query: "session monitoring"})
   → SessionStatusUpdate: StatusPage → useSessionStatus → fetchSessionData
   → WebSocketReconnect: handleDisconnect → attemptReconnect

3. gitnexus_context({name: "StatusPage"})
   → Incoming: router
   → Outgoing: useSessionStatus, MetricCard, SessionList

4. Read ui/src/views/StatusPage.vue for implementation details
```

@@@/section:skill-gitnexus-exploring

---

@@@section:skill-gitnexus-impact-analysis

## Impact Analysis

### When to Use

- "Is it safe to change this component?"
- "What will break if I modify this composable?"
- "Show me the blast radius"
- "Who uses this code?"
- Before making non-trivial code changes
- Before committing — to understand what your changes affect

### Workflow

```
1. gitnexus_impact({target: "X", direction: "upstream"})  → What depends on this
2. READ gitnexus://repo/CanvasToAPI/processes              → Check affected execution flows
3. gitnexus_detect_changes()                               → Map current git changes to affected flows
4. Assess risk and report to user
```

### Checklist

- [ ] `gitnexus_impact({target, direction: "upstream"})` to find dependents
- [ ] Review d=1 items first (these WILL BREAK)
- [ ] Check high-confidence (>0.8) dependencies
- [ ] READ processes to check affected execution flows
- [ ] `gitnexus_detect_changes()` for pre-commit check
- [ ] Assess risk level and report to user

### Understanding Output

| Depth | Risk Level       | Meaning                  |
| ----- | ---------------- | ------------------------ |
| d=1   | **WILL BREAK**   | Direct callers/importers |
| d=2   | LIKELY AFFECTED  | Indirect dependencies    |
| d=3   | MAY NEED TESTING | Transitive effects       |

### Risk Assessment

| Affected                       | Risk     |
| ------------------------------ | -------- |
| <5 symbols, few processes      | LOW      |
| 5-15 symbols, 2-5 processes    | MEDIUM   |
| >15 symbols or many processes  | HIGH     |
| Critical path (auth, payments) | CRITICAL |

### Tools

**gitnexus_impact** — the primary tool for symbol blast radius:

```javascript
gitnexus_impact({
  target: "useSessionStatus",
  direction: "upstream",
  minConfidence: 0.8,
  maxDepth: 3,
});

// → d=1 (WILL BREAK):
//   - StatusPage (ui/src/views/StatusPage.vue:42) [CALLS, 100%]
//   - SessionList (ui/src/components/SessionList.vue:15) [CALLS, 100%]

// → d=2 (LIKELY AFFECTED):
//   - router (ui/src/router/index.js:22) [CALLS, 95%]
```

**gitnexus_detect_changes** — git-diff based impact analysis:

```javascript
gitnexus_detect_changes({ scope: "staged" });

// → Changed: 5 symbols in 3 files
// → Affected: SessionStatusUpdate, WebSocketReconnect
// → Risk: MEDIUM
```

### Example: "What breaks if I change useSessionStatus?"

```
1. gitnexus_impact({target: "useSessionStatus", direction: "upstream"})
   → d=1: StatusPage, SessionList (WILL BREAK)
   → d=2: router (LIKELY AFFECTED)

2. READ gitnexus://repo/CanvasToAPI/processes
   → SessionStatusUpdate and WebSocketReconnect touch useSessionStatus

3. Risk: 2 direct callers, 2 processes = MEDIUM
```

@@@/section:skill-gitnexus-impact-analysis

---

@@@section:skill-gitnexus-debugging

## Debugging Workflow

### When to Use

- "Why is this component failing?"
- "Trace where this error comes from"
- "Who calls this composable?"
- "This component doesn't render correctly"
- Investigating bugs, errors, or unexpected behavior

### Workflow

```
1. gitnexus_query({query: "<error or symptom>"})            → Find related execution flows
2. gitnexus_context({name: "<suspect>"})                    → See callers/callees/processes
3. READ gitnexus://repo/CanvasToAPI/process/{name}          → Trace execution flow
4. gitnexus_cypher({query: "MATCH path..."})                → Custom traces if needed
```

### Checklist

- [ ] Understand the symptom (error message, unexpected behavior)
- [ ] `gitnexus_query` for error text or related code
- [ ] Identify the suspect function/component from returned processes
- [ ] `gitnexus_context` to see callers and callees
- [ ] Trace execution flow via process resource if applicable
- [ ] `gitnexus_cypher` for custom call chain traces if needed
- [ ] Read source files to confirm root cause

### Debugging Patterns

| Symptom              | GitNexus Approach                                          |
| -------------------- | ---------------------------------------------------------- |
| Error message        | `gitnexus_query` for error text → `context` on throw sites |
| Wrong render         | `context` on the component → trace callees for data flow   |
| Intermittent failure | `context` → look for external calls, async deps            |
| Performance issue    | `context` → find symbols with many callers (hot paths)     |
| Recent regression    | `detect_changes` to see what your changes affect           |

### Tools

**gitnexus_query** — find code related to error:

```javascript
gitnexus_query({ query: "session status error" });
// → Processes: SessionStatusUpdate, ErrorHandling
// → Symbols: fetchSessionData, handleSessionError
```

**gitnexus_context** — full context for a suspect:

```javascript
gitnexus_context({ name: "fetchSessionData" });
// → Incoming calls: useSessionStatus, StatusPage
// → Outgoing calls: api.get, handleSessionError (external API!)
// → Processes: SessionStatusUpdate (step 3/7)
```

**gitnexus_cypher** — custom call chain traces:

```cypher
MATCH path = (a)-[:CodeRelation {type: 'CALLS'}*1..2]->(f:Function {name: "fetchSessionData"})
RETURN [n IN nodes(path) | n.name] AS chain
```

### Example: "Session status component shows stale data"

```
1. gitnexus_query({query: "session status update"})
   → Processes: SessionStatusUpdate, WebSocketReconnect
   → Symbols: useSessionStatus, fetchSessionData

2. gitnexus_context({name: "fetchSessionData"})
   → Outgoing calls: api.get, handleSessionError (external API!)

3. READ gitnexus://repo/CanvasToAPI/process/SessionStatusUpdate
   → Step 3: fetchSessionData → calls api.get (external)

4. Root cause: API endpoint changed, but frontend still expects old format
```

@@@/section:skill-gitnexus-debugging

---

@@@section:skill-gitnexus-refactoring

## Safe Refactoring

### When to Use

- "Rename this component safely"
- "Extract this into a composable"
- "Split this component"
- "Move this to a new file"
- Any task involving renaming, extracting, splitting, or restructuring code

### Workflow

```
1. gitnexus_impact({target: "X", direction: "upstream"})  → Map all dependents
2. gitnexus_query({query: "X"})                            → Find execution flows involving X
3. gitnexus_context({name: "X"})                           → See all incoming/outgoing refs
4. Plan update order: interfaces → implementations → callers → tests
```

### Checklists

#### Rename Symbol

- [ ] `gitnexus_rename({symbol_name: "oldName", new_name: "newName", dry_run: true})` — preview all edits
- [ ] Review graph edits (high confidence) and text_search edits (review carefully)
- [ ] If satisfied: `gitnexus_rename({... , dry_run: false})` — apply edits
- [ ] `gitnexus_detect_changes()` — verify only expected files changed
- [ ] Run tests for affected processes

#### Extract Composable

- [ ] `gitnexus_context({name: target})` — see all incoming/outgoing refs
- [ ] `gitnexus_impact({target, direction: "upstream"})` — find all external callers
- [ ] Define new composable interface
- [ ] Extract code, update imports
- [ ] `gitnexus_detect_changes()` — verify affected scope
- [ ] Run tests for affected processes

#### Split Component

- [ ] `gitnexus_context({name: target})` — understand all callees
- [ ] Group callees by responsibility
- [ ] `gitnexus_impact({target, direction: "upstream"})` — map callers to update
- [ ] Create new components
- [ ] Update callers
- [ ] `gitnexus_detect_changes()` — verify affected scope
- [ ] Run tests for affected processes

### Tools

**gitnexus_rename** — automated multi-file rename:

```javascript
gitnexus_rename({ symbol_name: "StatusPage", new_name: "DashboardPage", dry_run: true });
// → 12 edits across 8 files
// → 10 graph edits (high confidence), 2 text_search edits (review)
// → Changes: [{file_path, edits: [{line, old_text, new_text, confidence}]}]
```

**gitnexus_impact** — map all dependents first:

```javascript
gitnexus_impact({ target: "StatusPage", direction: "upstream" });
// → d=1: router, App.vue, testUtils
// → Affected Processes: SessionMonitoring
```

**gitnexus_detect_changes** — verify your changes after refactoring:

```javascript
gitnexus_detect_changes({ scope: "all" });
// → Changed: 8 files, 12 symbols
// → Affected processes: SessionMonitoring
// → Risk: MEDIUM
```

**gitnexus_cypher** — custom reference queries:

```cypher
MATCH (caller)-[:CodeRelation {type: 'CALLS'}]->(f:Function {name: "useSessionStatus"})
RETURN caller.name, caller.filePath ORDER BY caller.filePath
```

### Risk Rules

| Risk Factor         | Mitigation                                  |
| ------------------- | ------------------------------------------- |
| Many callers (>5)   | Use `gitnexus_rename` for automated updates |
| Cross-area refs     | Use `detect_changes` after to verify scope  |
| String/dynamic refs | `gitnexus_query` to find them               |
| External/public API | Version and deprecate properly              |

### Example: Rename `StatusPage` to `DashboardPage`

```
1. gitnexus_rename({symbol_name: "StatusPage", new_name: "DashboardPage", dry_run: true})
   → 12 edits: 10 graph (safe), 2 text_search (review)
   → Files: StatusPage.vue, router/index.js, App.vue...

2. Review text_search edits (router config: dynamic reference!)

3. gitnexus_rename({symbol_name: "StatusPage", new_name: "DashboardPage", dry_run: false})
   → Applied 12 edits across 8 files

4. gitnexus_detect_changes({scope: "all"})
   → Affected: SessionMonitoring
   → Risk: MEDIUM — run tests for these flows
```

@@@/section:skill-gitnexus-refactoring

---

## Development Best Practices

### Component Naming

- Use PascalCase for component files: `SessionList.vue`
- Use kebab-case in templates: `<session-list />`
- Prefix reusable components: `BaseButton.vue`, `MetricCard.vue`

### Composables

- Use the `use` prefix: `useSessionStatus.js`
- Keep composables focused on a single responsibility
- Return reactive refs and computed properties

### State Management

- Use local state for component-specific data
- Use Pinia stores for global state
- Consider using provide/inject for prop drilling avoidance

### Performance

- Use `v-if` for conditional rendering (removes from DOM)
- Use `v-show` for frequently toggled elements (CSS-based)
- Use computed properties for expensive calculations
- Implement virtual scrolling for long lists

### Testing

- Write unit tests for composables and utilities
- Write component tests for critical UI components
- Use Vue Test Utils for component testing

### Accessibility

- Use semantic HTML elements
- Provide proper ARIA attributes
- Ensure keyboard navigation works
- Use Element Plus's built-in accessibility features

---

## Related Documentation

- [Backend Development Guidelines](../backend/doc.md)
- [GitNexus CLI Commands](../backend/doc.md#skill-gitnexus-cli)
- [API Documentation](../../README.md)
