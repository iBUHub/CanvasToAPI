# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CanvasToAPI is a proxy server that wraps Gemini Canvas's web interface and exposes it as API endpoints compatible with OpenAI, Gemini, and Anthropic API formats. The system uses browser automation (Playwright with Camoufox/Firefox) to interact with the Canvas web interface and translates API requests into browser interactions.

## Common Commands

### Development

```bash
npm run dev              # Start dev server with hot reload (server + UI)
npm run dev:server       # Start only the server in dev mode
npm run dev:ui           # Build UI in watch mode
```

### Production

```bash
npm start                # Build UI and start production server
```

### Authentication Setup

```bash
npm run setup-auth       # Interactive auth setup (launches browser)
npm run save-auth        # Save authentication credentials
```

### Code Quality

```bash
npm run lint             # Lint JavaScript and CSS
npm run lint:fix         # Auto-fix linting issues
npm run lint:js          # Lint only JavaScript files
npm run lint:css         # Lint only CSS/Less files
npm run format           # Format all files with Prettier
npm run format:check     # Check formatting without changes
```

### UI Development

```bash
npm run build:ui         # Build Vue.js UI for production
npm run preview:ui       # Preview built UI
```

## Architecture

### Core System Components

The system follows a modular architecture with clear separation of concerns:

**ProxyServerSystem** (`src/core/ProxyServerSystem.js`)

- Main orchestrator that integrates all modules
- Manages HTTP/WebSocket servers
- Coordinates between session routing, WebSocket connections, and request handling
- Entry point: `main.js` instantiates and starts this system

**SessionRegistry** (`src/core/SessionRegistry.js`)

- Manages WebSocket connections from browser contexts
- Routes messages to appropriate MessageQueue instances
- Implements grace period for reconnection attempts
- Supports multiple concurrent connections (one per browser session)

**RequestHandler** (`src/core/RequestHandler.js`)

- Processes incoming API requests
- Coordinates retry logic and session switching
- Delegates to session routing helpers for browser session management
- Delegates to FormatConverter for API format translation

**Session Routing**

- Uses `ROUND` to auto-select a browser session for each new request
- Retries on the next available session for any non-user-aborted browser error
- Uses `SESSION_ERROR_THRESHOLD` to disable unhealthy browser sessions after repeated browser / WebSocket errors

**FormatConverter** (`src/core/FormatConverter.js`)

- Converts between API formats (OpenAI ↔ Gemini ↔ Anthropic)
- Handles streaming and non-streaming responses

**AuthSource** (`src/auth/AuthSource.js`)

- Loads authentication data from `configs/auth/auth-N.json` files
- Validates and deduplicates accounts by email
- Tracks loaded browser session material from `configs/auth/auth-N.json`

### Request Flow

1. Client sends API request (OpenAI/Gemini/Anthropic format) → Express routes
2. RequestHandler receives request → FormatConverter normalizes to Gemini format
3. RequestHandler checks ConnectionRegistry for active WebSocket
4. If no connection: the request fails fast until a browser session reconnects
5. Request sent via WebSocket to browser context → injected script interacts with Canvas
6. Response streams back via WebSocket → FormatConverter translates to requested format
7. On selected failures: RequestHandler may retry on another browser session

### Multi-Context Architecture

The system maintains multiple browser contexts simultaneously:

- Each Google account gets its own browser context and page
- Contexts are initialized on-demand or in background
- Current session is chosen per request by the session registry
- Immediate retry can switch to another live session when configured
- Context pool rebalancing ensures optimal resource usage

### UI Structure

- **Frontend**: Vue.js 3 + Element Plus + Vite
- **Location**: `ui/` directory
- **Build output**: `ui/dist/` (served by Express)
- **Features**: Session status monitoring and runtime settings

## Configuration

### Environment Variables

Key variables (see `.env.example` for full list):

- `PORT`: API server port (default: 7861)
- `API_KEYS`: Comma-separated API keys for client authentication
- `STREAMING_MODE`: "real" or "fake" streaming
- `ROUND`: Session selection strategy (`round` or `random`)
- `SESSION_ERROR_THRESHOLD`: Disable a browser session after repeated browser / WebSocket errors (default: 3)
- `CAMOUFOX_EXECUTABLE_PATH`: Custom browser executable path
- `MAX_CONTEXTS`: Maximum number of accounts logged in simultaneously for faster switching (default: 1, memory usage: ~700MB per account)
- `LOG_LEVEL`: Set to "DEBUG" for verbose logging

### Model Configuration

Edit `configs/models.json` to customize available models and their settings.

### Authentication Files

- Location: `configs/auth/auth-N.json` (N = 0, 1, 2, ...)
- Format: Playwright browser context state (cookies, localStorage, etc.)
- Generated by: `npm run setup-auth` or VNC login in Docker

## Key Technical Details

### Browser Automation

- Uses Playwright with Camoufox (privacy-focused Firefox fork)
- Injects `build.js` script into the Canvas page for WebSocket communication
- Script location: `public/build.js` (built from `ui/app/`)
- Health monitoring via periodic checks and reconnection logic

### WebSocket Communication

- Each connection identified by a session id
- MessageQueue pattern for request/response correlation
- Grace period (60s) for reconnection before triggering callback

### Account Switching

- Automatic selection based on the configured session routing strategy
- Supports immediate switching on specific HTTP status codes
- System busy flag prevents concurrent switches
- Lightweight reconnect attempts before full context switch

### Streaming Modes

- **Real streaming**: True SSE streaming from Canvas
- **Fake streaming**: Buffer complete response, then stream to client

## Development Notes

### Testing

- Test files in `test/` directory
- Client test scripts in `scripts/client/`
- Auth test scripts in `scripts/auth/`

### Linting & Formatting

- ESLint for JavaScript (includes Vue plugin)
- Stylelint for CSS/Less
- Prettier for code formatting
- Pre-commit hooks via Husky + lint-staged

### Docker

- Dockerfile supports VNC for browser interaction
- Auth files mounted via volume: `/app/configs/auth`
- Environment variables for configuration

### Git Workflow

- Main branch: `main`

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **CanvasToAPI** (557 symbols, 1603 relationships, 45 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/CanvasToAPI/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool             | When to use                   | Command                                                                 |
| ---------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `query`          | Find code by concept          | `gitnexus_query({query: "auth validation"})`                            |
| `context`        | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})`                              |
| `impact`         | Blast radius before editing   | `gitnexus_impact({target: "X", direction: "upstream"})`                 |
| `detect_changes` | Pre-commit scope check        | `gitnexus_detect_changes({scope: "staged"})`                            |
| `rename`         | Safe multi-file rename        | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher`         | Custom graph queries          | `gitnexus_cypher({query: "MATCH ..."})`                                 |

## Impact Risk Levels

| Depth | Meaning                               | Action                |
| ----- | ------------------------------------- | --------------------- |
| d=1   | WILL BREAK — direct callers/importers | MUST update these     |
| d=2   | LIKELY AFFECTED — indirect deps       | Should test           |
| d=3   | MAY NEED TESTING — transitive         | Test if critical path |

## Resources

| Resource                                     | Use for                                  |
| -------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/CanvasToAPI/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/CanvasToAPI/clusters`       | All functional areas                     |
| `gitnexus://repo/CanvasToAPI/processes`      | All execution flows                      |
| `gitnexus://repo/CanvasToAPI/process/{name}` | Step-by-step execution trace             |

## Self-Check Before Finishing

Before completing any code modification task, verify:

1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task                                         | Read this skill file                                        |
| -------------------------------------------- | ----------------------------------------------------------- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md`       |
| Blast radius / "What breaks if I change X?"  | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?"             | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md`       |
| Rename / extract / split / refactor          | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md`     |
| Tools, resources, schema reference           | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md`           |
| Index, status, clean, wiki CLI commands      | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md`             |

<!-- gitnexus:end -->
