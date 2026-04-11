# GitNexus Skill Examples

This directory contains examples for GitNexus code intelligence skills integrated into the backend development guidelines.

## Integrated Skills

### 1. Code Exploration (`skill-gitnexus-exploring`)

**When to use**: Understanding unfamiliar code, tracing execution flows, exploring architecture.

**Example scenario**: You need to understand how request routing works in the backend.

```javascript
// Step 1: Check codebase context
// READ gitnexus://repo/CanvasToAPI/context

// Step 2: Query for the concept
gitnexus_query({ query: "request routing" });
// Returns processes and symbols related to request routing

// Step 3: Deep dive into a specific symbol
gitnexus_context({ name: "handleRequest" });
// Shows all callers, callees, and processes it participates in

// Step 4: Trace the full execution flow
// READ gitnexus://repo/CanvasToAPI/process/RequestHandling
```

### 2. Impact Analysis (`skill-gitnexus-impact-analysis`)

**When to use**: Before making changes to understand what will break.

**Example scenario**: You want to modify a core function used across multiple modules.

```javascript
// Step 1: Check what depends on this symbol
gitnexus_impact({
  target: "handleRequest",
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

**Example scenario**: Requests are failing intermittently with 500 errors.

```javascript
// Step 1: Query for related error/symptom
gitnexus_query({ query: "request error handling" });

// Step 2: Get full context on the suspect
gitnexus_context({ name: "handleRequest" });
// Shows all callers and callees to identify the issue

// Step 3: Trace the execution flow
// READ gitnexus://repo/CanvasToAPI/process/RequestHandling
```

### 4. Safe Refactoring (`skill-gitnexus-refactoring`)

**When to use**: Renaming functions, extracting modules, splitting services.

**Example scenario**: You want to rename `handleRequest` to `processRequest`.

```javascript
// Step 1: Preview all edits
gitnexus_rename({
  symbol_name: "handleRequest",
  new_name: "processRequest",
  dry_run: true,
});
// Returns preview of all edits with confidence levels

// Step 2: Apply the changes
gitnexus_rename({
  symbol_name: "handleRequest",
  new_name: "processRequest",
  dry_run: false,
});

// Step 3: Verify the changes
gitnexus_detect_changes({ scope: "all" });
```

## CLI Commands

GitNexus CLI commands for index management:

```bash
# Build or refresh the index
npx gitnexus analyze

# Check index freshness
npx gitnexus status

# Delete the index
npx gitnexus clean

# Generate documentation from the graph
npx gitnexus wiki

# List all indexed repos
npx gitnexus list
```

## Best Practices

1. **Always check index freshness first**: READ `gitnexus://repo/CanvasToAPI/context`
2. **Run impact analysis before editing**: Use `gitnexus_impact` for any shared code
3. **Verify changes before committing**: Use `gitnexus_detect_changes`
4. **Use dry_run for renames**: Preview changes with `dry_run: true` first
5. **Follow the checklists**: Each skill has a detailed checklist in the main guide
6. **Re-index after major changes**: Run `npx gitnexus analyze` after large commits

## Related Documentation

- [Backend Development Guidelines](../../doc.md)
- [Frontend Development Guidelines](../../../frontend/doc.md)
- [Project CLAUDE.md](../../../../CLAUDE.md)
