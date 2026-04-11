# GitNexus Skill Examples

This directory contains examples for GitNexus code intelligence skills integrated into the frontend development guidelines.

## Integrated Skills

### 1. Code Exploration (`skill-gitnexus-exploring`)

**When to use**: Understanding unfamiliar code, tracing execution flows, exploring architecture.

**Example scenario**: You need to understand how session monitoring works in the frontend.

```javascript
// Step 1: Check codebase context
// READ gitnexus://repo/CanvasToAPI/context

// Step 2: Query for the concept
gitnexus_query({ query: "session monitoring" });
// Returns processes and symbols related to session monitoring

// Step 3: Deep dive into a specific symbol
gitnexus_context({ name: "StatusPage" });
// Shows all callers, callees, and processes it participates in

// Step 4: Trace the full execution flow
// READ gitnexus://repo/CanvasToAPI/process/SessionStatusUpdate
```

### 2. Impact Analysis (`skill-gitnexus-impact-analysis`)

**When to use**: Before making changes to understand what will break.

**Example scenario**: You want to rename or modify a composable used by multiple components.

```javascript
// Step 1: Check what depends on this symbol
gitnexus_impact({
  target: "useSessionStatus",
  direction: "upstream",
  minConfidence: 0.8,
});
// Returns d=1 (WILL BREAK), d=2 (LIKELY AFFECTED), d=3 (MAY NEED TESTING)

// Step 2: Check affected execution flows
// READ gitnexus://repo/CanvasToAPI/processes

// Step 3: Before committing, verify your changes
gitnexus_detect_changes({ scope: "staged" });
// Returns changed symbols, affected processes, and risk level
```

### 3. Debugging (`skill-gitnexus-debugging`)

**When to use**: Tracking down bugs, errors, or unexpected behavior.

**Example scenario**: A component shows stale data intermittently.

```javascript
// Step 1: Query for related error/symptom
gitnexus_query({ query: "session status update error" });

// Step 2: Get full context on the suspect
gitnexus_context({ name: "fetchSessionData" });
// Shows all callers and callees to identify the issue

// Step 3: Trace the execution flow
// READ gitnexus://repo/CanvasToAPI/process/SessionStatusUpdate
```

### 4. Safe Refactoring (`skill-gitnexus-refactoring`)

**When to use**: Renaming components, extracting composables, splitting services.

**Example scenario**: You want to rename `StatusPage` to `DashboardPage`.

```javascript
// Step 1: Preview all edits
gitnexus_rename({
  symbol_name: "StatusPage",
  new_name: "DashboardPage",
  dry_run: true,
});
// Returns preview of all edits with confidence levels

// Step 2: Apply the changes
gitnexus_rename({
  symbol_name: "StatusPage",
  new_name: "DashboardPage",
  dry_run: false,
});

// Step 3: Verify the changes
gitnexus_detect_changes({ scope: "all" });
```

## Best Practices

1. **Always check index freshness first**: READ `gitnexus://repo/CanvasToAPI/context`
2. **Run impact analysis before editing**: Use `gitnexus_impact` for any shared code
3. **Verify changes before committing**: Use `gitnexus_detect_changes`
4. **Use dry_run for renames**: Preview changes with `dry_run: true` first
5. **Follow the checklists**: Each skill has a detailed checklist in the main guide

## Related Documentation

- [Frontend Development Guidelines](../../doc.md)
- [GitNexus CLI Commands](../../../backend/doc.md#skill-gitnexus-cli)
- [Project CLAUDE.md](../../../../CLAUDE.md)
