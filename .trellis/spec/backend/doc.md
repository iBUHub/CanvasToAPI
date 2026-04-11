# Backend Development Guidelines

> Node.js + Express backend for CanvasToAPI

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [GitNexus Code Intelligence](#gitnexus-code-intelligence)
- [Code Exploration](#skill-gitnexus-exploring)
- [Impact Analysis](#skill-gitnexus-impact-analysis)
- [Debugging Workflow](#skill-gitnexus-debugging)
- [Safe Refactoring](#skill-gitnexus-refactoring)
- [GitNexus CLI Commands](#skill-gitnexus-cli)
- [Development Best Practices](#development-best-practices)
- [Related Documentation](#related-documentation)

---

## Architecture Overview

The CanvasToAPI backend is a proxy server that wraps Gemini Canvas's web interface and exposes it as API endpoints compatible with OpenAI, Gemini, and Anthropic API formats.

### Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **Playwright** - Browser automation
- **WebSocket** - Real-time communication
- **Camoufox/Firefox** - Privacy-focused browser

### Key Directories

```
src/
├── core/               # Core system components
│   ├── ProxyServerSystem.js
│   ├── SessionRegistry.js
│   ├── RequestHandler.js
│   └── FormatConverter.js
├── auth/               # Authentication logic
│   └── AuthSource.js
├── routes/             # Express routes
└── utils/              # Utilities
configs/
├── auth/               # Authentication files (auth-N.json)
└── models.json         # Model configuration
```

---

## Core Components

### ProxyServerSystem

Main orchestrator that integrates all modules:

- Manages HTTP/WebSocket servers
- Coordinates session routing and request handling
- Entry point: `main.js`

### SessionRegistry

- Manages WebSocket connections from browser contexts
- Routes messages to appropriate MessageQueue instances
- Implements grace period for reconnection attempts

### RequestHandler

- Processes incoming API requests
- Coordinates retry logic and session switching
- Delegates to FormatConverter for API format translation

### FormatConverter

- Converts between API formats (OpenAI ↔ Gemini ↔ Anthropic)
- Handles streaming and non-streaming responses

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

- "How does request routing work?"
- "What's the session management flow?"
- "Show me the authentication logic"
- "Where is the WebSocket handling?"
- Understanding unfamiliar parts of the codebase

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
gitnexus_query({ query: "session routing" });
// → Processes: RequestHandling, SessionSwitch, WebSocketReconnect
// → Symbols grouped by flow with file locations
```

**gitnexus_context** — 360-degree view of a symbol:

```javascript
gitnexus_context({ name: "RequestHandler" });
// → Incoming calls: ProxyServerSystem, routes
// → Outgoing calls: FormatConverter, SessionRegistry
// → Processes: RequestHandling (step 2/7)
```

### Example: "How does request handling work?"

```
1. READ gitnexus://repo/CanvasToAPI/context
   → 557 symbols, 46 processes

2. gitnexus_query({query: "request handling"})
   → RequestHandling: handleRequest → formatRequest → sendToBrowser
   → SessionSwitch: switchSession → reconnect

3. gitnexus_context({name: "handleRequest"})
   → Incoming: routes
   → Outgoing: FormatConverter, SessionRegistry, MessageQueue

4. Read src/core/RequestHandler.js for implementation details
```

@@@/section:skill-gitnexus-exploring

---

@@@section:skill-gitnexus-impact-analysis

## Impact Analysis

### When to Use

- "Is it safe to change this function?"
- "What will break if I modify this module?"
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

| Affected                      | Risk     |
| ----------------------------- | -------- |
| <5 symbols, few processes     | LOW      |
| 5-15 symbols, 2-5 processes   | MEDIUM   |
| >15 symbols or many processes | HIGH     |
| Critical path (auth, API)     | CRITICAL |

### Tools

**gitnexus_impact** — the primary tool for symbol blast radius:

```javascript
gitnexus_impact({
  target: "handleRequest",
  direction: "upstream",
  minConfidence: 0.8,
  maxDepth: 3,
});

// → d=1 (WILL BREAK):
//   - ProxyServerSystem (src/core/ProxyServerSystem.js:42) [CALLS, 100%]
//   - routes (src/routes/index.js:15) [CALLS, 100%]

// → d=2 (LIKELY AFFECTED):
//   - main.js (src/main.js:22) [CALLS, 95%]
```

**gitnexus_detect_changes** — git-diff based impact analysis:

```javascript
gitnexus_detect_changes({ scope: "staged" });

// → Changed: 5 symbols in 3 files
// → Affected: RequestHandling, SessionSwitch
// → Risk: MEDIUM
```

### Example: "What breaks if I change handleRequest?"

```
1. gitnexus_impact({target: "handleRequest", direction: "upstream"})
   → d=1: ProxyServerSystem, routes (WILL BREAK)
   → d=2: main.js (LIKELY AFFECTED)

2. READ gitnexus://repo/CanvasToAPI/processes
   → RequestHandling and SessionSwitch touch handleRequest

3. Risk: 2 direct callers, 2 processes = MEDIUM
```

@@@/section:skill-gitnexus-impact-analysis

---

@@@section:skill-gitnexus-debugging

## Debugging Workflow

### When to Use

- "Why is this request failing?"
- "Trace where this error comes from"
- "Who calls this function?"
- "WebSocket connection drops unexpectedly"
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
- [ ] Identify the suspect function from returned processes
- [ ] `gitnexus_context` to see callers and callees
- [ ] Trace execution flow via process resource if applicable
- [ ] `gitnexus_cypher` for custom call chain traces if needed
- [ ] Read source files to confirm root cause

### Debugging Patterns

| Symptom              | GitNexus Approach                                          |
| -------------------- | ---------------------------------------------------------- |
| Error message        | `gitnexus_query` for error text → `context` on throw sites |
| Wrong return value   | `context` on the function → trace callees for data flow    |
| Intermittent failure | `context` → look for external calls, async deps            |
| Performance issue    | `context` → find symbols with many callers (hot paths)     |
| Recent regression    | `detect_changes` to see what your changes affect           |

### Tools

**gitnexus_query** — find code related to error:

```javascript
gitnexus_query({ query: "WebSocket connection error" });
// → Processes: WebSocketReconnect, SessionRegistry
// → Symbols: handleDisconnect, attemptReconnect
```

**gitnexus_context** — full context for a suspect:

```javascript
gitnexus_context({ name: "handleDisconnect" });
// → Incoming calls: SessionRegistry, WebSocket
// → Outgoing calls: attemptReconnect, cleanupSession
// → Processes: WebSocketReconnect (step 1/5)
```

**gitnexus_cypher** — custom call chain traces:

```cypher
MATCH path = (a)-[:CodeRelation {type: 'CALLS'}*1..2]->(f:Function {name: "handleDisconnect"})
RETURN [n IN nodes(path) | n.name] AS chain
```

### Example: "Request returns 500 intermittently"

```
1. gitnexus_query({query: "request error handling"})
   → Processes: RequestHandling, ErrorHandling
   → Symbols: handleRequest, handleRequestError

2. gitnexus_context({name: "handleRequest"})
   → Outgoing calls: FormatConverter, SessionRegistry, MessageQueue (external!)

3. READ gitnexus://repo/CanvasToAPI/process/RequestHandling
   → Step 3: handleRequest → calls MessageQueue.send (async)

4. Root cause: MessageQueue timeout not properly handled
```

@@@/section:skill-gitnexus-debugging

---

@@@section:skill-gitnexus-refactoring

## Safe Refactoring

### When to Use

- "Rename this function safely"
- "Extract this into a module"
- "Split this service"
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

#### Extract Module

- [ ] `gitnexus_context({name: target})` — see all incoming/outgoing refs
- [ ] `gitnexus_impact({target, direction: "upstream"})` — find all external callers
- [ ] Define new module interface
- [ ] Extract code, update imports
- [ ] `gitnexus_detect_changes()` — verify affected scope
- [ ] Run tests for affected processes

#### Split Function/Service

- [ ] `gitnexus_context({name: target})` — understand all callees
- [ ] Group callees by responsibility
- [ ] `gitnexus_impact({target, direction: "upstream"})` — map callers to update
- [ ] Create new functions/services
- [ ] Update callers
- [ ] `gitnexus_detect_changes()` — verify affected scope
- [ ] Run tests for affected processes

### Tools

**gitnexus_rename** — automated multi-file rename:

```javascript
gitnexus_rename({ symbol_name: "handleRequest", new_name: "processRequest", dry_run: true });
// → 12 edits across 8 files
// → 10 graph edits (high confidence), 2 text_search edits (review)
// → Changes: [{file_path, edits: [{line, old_text, new_text, confidence}]}]
```

**gitnexus_impact** — map all dependents first:

```javascript
gitnexus_impact({ target: "handleRequest", direction: "upstream" });
// → d=1: ProxyServerSystem, routes, testUtils
// → Affected Processes: RequestHandling, SessionSwitch
```

**gitnexus_detect_changes** — verify your changes after refactoring:

```javascript
gitnexus_detect_changes({ scope: "all" });
// → Changed: 8 files, 12 symbols
// → Affected processes: RequestHandling, SessionSwitch
// → Risk: MEDIUM
```

**gitnexus_cypher** — custom reference queries:

```cypher
MATCH (caller)-[:CodeRelation {type: 'CALLS'}]->(f:Function {name: "handleRequest"})
RETURN caller.name, caller.filePath ORDER BY caller.filePath
```

### Risk Rules

| Risk Factor         | Mitigation                                  |
| ------------------- | ------------------------------------------- |
| Many callers (>5)   | Use `gitnexus_rename` for automated updates |
| Cross-area refs     | Use `detect_changes` after to verify scope  |
| String/dynamic refs | `gitnexus_query` to find them               |
| External/public API | Version and deprecate properly              |

### Example: Rename `handleRequest` to `processRequest`

```
1. gitnexus_rename({symbol_name: "handleRequest", new_name: "processRequest", dry_run: true})
   → 12 edits: 10 graph (safe), 2 text_search (review)
   → Files: RequestHandler.js, ProxyServerSystem.js, routes/index.js...

2. Review text_search edits (dynamic reference!)

3. gitnexus_rename({symbol_name: "handleRequest", new_name: "processRequest", dry_run: false})
   → Applied 12 edits across 8 files

4. gitnexus_detect_changes({scope: "all"})
   → Affected: RequestHandling, SessionSwitch
   → Risk: MEDIUM — run tests for these flows
```

@@@/section:skill-gitnexus-refactoring

---

@@@section:skill-gitnexus-cli

## GitNexus CLI Commands

All commands work via `npx` — no global install required.

### Commands

#### analyze — Build or refresh the index

```bash
npx gitnexus analyze
```

Run from the project root. This parses all source files, builds the knowledge graph, writes it to `.gitnexus/`, and generates CLAUDE.md / AGENTS.md context files.

| Flag           | Effect                                                           |
| -------------- | ---------------------------------------------------------------- |
| `--force`      | Force full re-index even if up to date                           |
| `--embeddings` | Enable embedding generation for semantic search (off by default) |

**When to run:** First time in a project, after major code changes, or when `gitnexus://repo/{name}/context` reports the index is stale. In Claude Code, a PostToolUse hook runs `analyze` automatically after `git commit` and `git merge`, preserving embeddings if previously generated.

#### status — Check index freshness

```bash
npx gitnexus status
```

Shows whether the current repo has a GitNexus index, when it was last updated, and symbol/relationship counts. Use this to check if re-indexing is needed.

#### clean — Delete the index

```bash
npx gitnexus clean
```

Deletes the `.gitnexus/` directory and unregisters the repo from the global registry. Use before re-indexing if the index is corrupt or after removing GitNexus from a project.

| Flag      | Effect                                            |
| --------- | ------------------------------------------------- |
| `--force` | Skip confirmation prompt                          |
| `--all`   | Clean all indexed repos, not just the current one |

#### wiki — Generate documentation from the graph

```bash
npx gitnexus wiki
```

Generates repository documentation from the knowledge graph using an LLM. Requires an API key (saved to `~/.gitnexus/config.json` on first use).

| Flag                | Effect                                    |
| ------------------- | ----------------------------------------- |
| `--force`           | Force full regeneration                   |
| `--model <model>`   | LLM model (default: minimax/minimax-m2.5) |
| `--base-url <url>`  | LLM API base URL                          |
| `--api-key <key>`   | LLM API key                               |
| `--concurrency <n>` | Parallel LLM calls (default: 3)           |
| `--gist`            | Publish wiki as a public GitHub Gist      |

#### list — Show all indexed repos

```bash
npx gitnexus list
```

Lists all repositories registered in `~/.gitnexus/registry.json`. The MCP `list_repos` tool provides the same information.

### After Indexing

1. **Read `gitnexus://repo/CanvasToAPI/context`** to verify the index loaded
2. Use the other GitNexus tools for your task

### Troubleshooting

- **"Not inside a git repository"**: Run from a directory inside a git repo
- **Index is stale after re-analyzing**: Restart Claude Code to reload the MCP server
- **Embeddings slow**: Omit `--embeddings` (it's off by default) or set `OPENAI_API_KEY` for faster API-based embedding
  @@@/section:skill-gitnexus-cli

---

## Development Best Practices

### Error Handling

- Use try-catch blocks for async operations
- Implement proper error logging with context
- Return meaningful error messages to clients
- Use custom error classes for different error types

### Async/Await

- Prefer async/await over Promise chains
- Use Promise.all() for parallel operations
- Implement proper error handling with try-catch
- Avoid callback hell

### WebSocket Management

- Implement heartbeat/ping-pong for connection health
- Handle reconnection logic gracefully
- Clean up resources on disconnect
- Use proper error codes and messages

### Browser Automation

- Use explicit waits instead of arbitrary timeouts
- Implement retry logic for transient failures
- Handle browser context lifecycle properly
- Monitor memory usage and clean up contexts

### API Design

- Follow RESTful conventions where appropriate
- Use proper HTTP status codes
- Implement rate limiting for API endpoints
- Validate and sanitize all inputs

### Security

- Validate API keys securely
- Use environment variables for secrets
- Implement CORS properly
- Sanitize user inputs to prevent injection

### Testing

- Write unit tests for core logic
- Use mocks for external dependencies
- Test error handling paths
- Implement integration tests for critical flows

### Performance

- Use streaming for large responses
- Implement caching where appropriate
- Monitor memory usage for browser contexts
- Optimize database queries if used

### Logging

- Use structured logging with levels
- Include request IDs for traceability
- Log errors with full context
- Avoid logging sensitive information

---

## Related Documentation

- [Frontend Development Guidelines](../frontend/doc.md)
- [API Documentation](../../README.md)
- [Authentication Setup](../../README.md#authentication-setup)
