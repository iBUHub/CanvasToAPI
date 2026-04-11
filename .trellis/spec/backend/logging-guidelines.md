# Logging Guidelines

> How logging is done in this project.

---

## Overview

This project uses a custom `LoggingService` class that provides structured logging with timestamps, log levels, and timezone support. **Never use `console.log()` or `console.error()` directly** - always use the custom logger.

**Key Features:**

- Structured log format with timestamps and timezone
- Four log levels: DEBUG, INFO, WARN, ERROR
- Log buffering for API access (up to 1000 logs)
- Configurable via environment variables (LOG_LEVEL, TZ)
- Instance-based loggers with service name context

---

## Log Levels

The `LoggingService` defines four log levels in ascending priority:

```javascript
static LEVELS = {
    DEBUG: 0,  // Detailed debugging information
    INFO: 1,   // General informational messages
    WARN: 2,   // Warning conditions
    ERROR: 3   // Error conditions
};
```

### When to Use Each Level

#### DEBUG (Level 0)

Use for detailed debugging information during development or troubleshooting.

**Examples:**

- Detailed request/response data
- Internal state changes
- Connection lifecycle events (connect, disconnect, reconnect)
- Configuration values

**File:** `src/core/SessionRegistry.js`

```javascript
this.logger.debug(`[Session] Current connections: ${JSON.stringify(Array.from(this.connections.entries()))}`);
```

**Enable DEBUG level:**

```bash
export LOG_LEVEL=DEBUG
```

#### INFO (Level 1)

Use for general informational messages about normal system operation.

**Examples:**

- Server startup/shutdown
- Request processing start/end
- Successful authentication
- Session selection/switching

**File:** `src/core/ProxyServerSystem.js`

```javascript
this.logger.info("[System] Starting protocol adapter server...");
this.logger.info("[System] Server startup complete.");
this.logger.info(`[Auth] API key verification passed (from: ${this.webRoutes.authRoutes.getClientIP(req)})`);
```

#### WARN (Level 2)

Use for warning conditions that don't prevent operation but should be addressed.

**Examples:**

- Invalid configuration values (using defaults)
- Deprecated environment variables
- Rate limiting triggered
- Authentication timeout

**File:** `src/utils/ConfigLoader.js`

```javascript
this.logger.warn(
  `[Config] WS_PORT is deprecated and ignored. Browser sessions now connect through ${config.browserWsPath}.`
);

this.logger.warn(`[Config] Invalid ROUND="${process.env.ROUND}", using ${config.sessionSelectionStrategy}.`);
```

**File:** `src/core/SessionRegistry.js`

```javascript
this.logger.warn(
  `[Auth] Browser session ${this._formatConnectionLabel(connectionId, currentEntry)} failed to authenticate in time`
);
```

#### ERROR (Level 3)

Use for error conditions that prevent normal operation.

**Examples:**

- Failed operations
- Unexpected exceptions
- Connection failures
- Timeout errors

**File:** `src/core/ProxyServerSystem.js`

```javascript
this.logger.error(`[System] WebSocket server runtime error: ${error.message}`);
this.logger.error(`[System] Error during stale queue cleanup: ${error.message}`);
```

**File:** `src/core/SessionRegistry.js`

```javascript
ws.on("error", error => {
  this.logger.error(
    `[Session] WebSocket error on ${this._formatConnectionLabel(connectionId, entry)}: ${error.message}`
  );
  this.recordConnectionFailure(connectionId, "ws_error", error.message);
});
```

---

## Structured Logging

### Log Format

All logs follow this structured format:

```
[LEVEL] YYYY-MM-DD HH:mm:ss.SSS [Timezone] [ServiceName] - message
```

**Example Output:**

```
[INFO] 2024-04-09 22:54:15.123 [Asia/Shanghai] [CanvasToAPI] - [System] Starting protocol adapter server...
[ERROR] 2024-04-09 22:54:16.456 [Asia/Shanghai] [SessionRegistry] - [Session] WebSocket error: Connection reset
```

### Format Components

1. **LEVEL**: Uppercase log level (DEBUG, INFO, WARN, ERROR)
2. **Timestamp**: Format `YYYY-MM-DD HH:mm:ss.SSS [Timezone]`
3. **ServiceName**: Logger instance name (e.g., "CanvasToAPI", "SessionRegistry")
4. **Message**: Contextual message with subsystem prefix in brackets

**File:** `src/utils/LoggingService.js`

```javascript
_formatMessage(level, message) {
    const timestamp = this._getTimestamp();
    const formatted = `[${level}] ${timestamp} [${this.serviceName}] - ${message}`;

    this.logBuffer.push(formatted);
    // Physical hard limit for memory safety
    if (this.logBuffer.length > this.maxBufferSize) {
        this.logBuffer.shift();
    }

    return formatted;
}
```

### Timestamp with Timezone Support

The logger supports Docker `TZ` environment variable for timezone-aware timestamps.

**File:** `src/utils/LoggingService.js`

```javascript
_getTimestamp() {
    const now = new Date();
    const timezone = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
        // Format: YYYY-MM-DD HH:mm:ss.SSS [Timezone]
        return (
            now
                .toLocaleString("zh-CN", {
                    day: "2-digit",
                    hour: "2-digit",
                    hour12: false,
                    minute: "2-digit",
                    month: "2-digit",
                    second: "2-digit",
                    timeZone: timezone,
                    year: "numeric",
                })
                .replace(/\//g, "-") + `.${now.getMilliseconds().toString().padStart(3, "0")} [${timezone}]`
        );
    } catch (err) {
        // Fallback to ISO format if timezone is invalid
        return now.toISOString();
    }
}
```

**Configure timezone:**

```bash
export TZ=Asia/Shanghai  # Docker: -e TZ=Asia/Shanghai
```

---

## What to Log

### System Lifecycle Events

**Startup/Shutdown:**

```javascript
this.logger.info("[System] Starting protocol adapter server...");
this.logger.info("[System] Server startup complete.");
```

**File:** `src/core/ProxyServerSystem.js`

### Connection Lifecycle Events

**WebSocket Connections:**

```javascript
this.logger.info(
  `[Session] Browser connected ${browserLabel} from ${meta.address || "unknown address"} (awaiting authentication)`
);

this.logger.info(`[Session] Browser disconnected ${browserLabel}. Reason: ${reason}`);
```

**File:** `src/core/SessionRegistry.js`

### Request Processing Events

**Request Start/End:**

```javascript
this.logger.info(`[Request] Processing request ${requestId} on session ${sessionId}`);
this.logger.info(`[Request] Request ${requestId} completed in ${duration}ms`);
```

**File:** `src/core/RequestHandler.js`

### Authentication Events

**Success/Failure:**

```javascript
this.logger.info(`[Auth] API key verification passed (from: ${this.webRoutes.authRoutes.getClientIP(req)})`);

this.logger.warn(`[Auth] Access password incorrect or missing. IP: ${clientIp}, Path: ${req.path}`);
```

**File:** `src/core/ProxyServerSystem.js`

### Session Management Events

**Session Selection/Switching:**

```javascript
this.logger.info(
  `[Session] Switched session from ${this._describeSession(currentSessionId)} to ${this._describeSession(nextConnection.connectionId)} via ${this.config.sessionSelectionStrategy}.`
);
```

**File:** `src/core/RequestHandler.js`

### Error Conditions

**Always log errors with context:**

```javascript
this.logger.error(`[Session] WebSocket error on ${browserLabel}: ${error.message}`);
this.logger.error(`[System] Failed to start server: ${error.message}`);
```

### Configuration Changes

**Non-default values:**

```javascript
this.logger.info(
  `[Auth] Rate limiting enabled: ${this.rateLimitMaxAttempts} attempts per ${this.rateLimitWindow} minutes`
);
```

**File:** `src/routes/AuthRoutes.js`

---

## What NOT to Log

### Sensitive Data

**Never log:**

- API keys or authentication tokens
- Passwords or credentials
- User personal information (email, IP addresses in production logs)
- Session cookies or browser state

> **Automatic Sanitization**: The `LoggingService` automatically sanitizes log messages to redact sensitive field values. This feature is **enabled by default** and configured via `configs/security.json`.
>
> **Protected fields**: `password`, `token`, `apiKey`, `api_key`, `authorization`, `cookie`, `session`, `secret`, `credential`
>
> **Example**: `password="secret123"` → `password="[REDACTED]"`

**Example of what NOT to do:**

```javascript
// WRONG - Logging sensitive data
this.logger.info(`[Auth] User login with password: ${password}`);
this.logger.info(`[Auth] API key: ${apiKey}`);
```

**Correct approach:**

```javascript
// RIGHT - Log only success/failure and non-sensitive identifiers
this.logger.info(`[Auth] API key verification passed (from: ${clientIp})`);
this.logger.warn(`[Auth] Invalid API key attempt from ${clientIp}`);
```

See [Security Guidelines](./security-guidelines.md) for details on configuring log sanitization.

### Verbose Data in Production

**Avoid in production (INFO level):**

- Full request/response bodies (use DEBUG level instead)
- Complete configuration dumps
- Detailed internal state

**Example:**

```javascript
// In production, this would be too verbose for INFO level
this.logger.debug(`[Request] Full request body: ${JSON.stringify(requestBody)}`);

// Use INFO for summary
this.logger.info(`[Request] Processing ${model} request with ${messageCount} messages`);
```

### Repetitive Events

**Avoid logging on every request:**

- Health check endpoints (e.g., `/favicon.ico`)
- Metrics scraping endpoints

**Example:**

```javascript
// Skip logging for favicon to reduce noise
if (req.path !== "/favicon.ico") {
  this.logger.warn(`[Auth] Access password incorrect or missing. IP: ${clientIp}, Path: ${req.path}`);
}
```

**File:** `src/core/ProxyServerSystem.js`

---

## Logger Usage Patterns

### Creating a Logger Instance

Each module creates its own logger with a descriptive service name:

```javascript
const LoggingService = require("../utils/LoggingService");

class SessionRegistry extends EventEmitter {
  constructor(logger, config = {}) {
    super();
    this.logger = logger; // Injected from parent
    // ...
  }
}
```

**Or create a new instance:**

```javascript
class ProxyServerSystem extends EventEmitter {
  constructor() {
    super();
    this.logger = new LoggingService("CanvasToAPI");
  }
}
```

### Setting Log Level

**Via environment variable:**

```bash
export LOG_LEVEL=DEBUG  # Enable debug logging
export LOG_LEVEL=INFO   # Default level
```

**Programmatically:**

```javascript
LoggingService.setLevel("DEBUG");
```

**Check if debug is enabled:**

```javascript
if (LoggingService.isDebugEnabled()) {
  this.logger.debug(`[Session] Detailed state: ${JSON.stringify(state)}`);
}
```

### Log Buffer Access

The logger maintains an in-memory buffer (up to 1000 logs) accessible via API:

```javascript
// Get logs from a logger instance
const logs = serverSystem.logger.logBuffer.slice(-100); // Last 100 logs
```

---

## Common Mistakes

### Mistake 1: Using console.log Instead of Logger

**Wrong:**

```javascript
console.log("Server started");
console.error("Error:", error);
```

**Correct:**

```javascript
this.logger.info("[System] Server started");
this.logger.error(`[System] Error: ${error.message}`);
```

### Mistake 2: Missing Context in Log Messages

**Wrong:**

```javascript
this.logger.info("Connection established");
this.logger.error("Operation failed");
```

**Correct:**

```javascript
this.logger.info(`[Session] Browser connected ${browserLabel} from ${address}`);
this.logger.error(`[Session] WebSocket error on ${browserLabel}: ${error.message}`);
```

### Mistake 3: Logging Sensitive Information

**Wrong:**

```javascript
this.logger.info(`[Auth] User logged in with password: ${password}`);
this.logger.info(`[Config] API keys: ${apiKeys.join(", ")}`);
```

**Correct:**

```javascript
this.logger.info(`[Auth] User logged in successfully`);
this.logger.info(`[Config] ${apiKeys.length} API key(s) configured`);
```

### Mistake 4: Over-logging at INFO Level

**Wrong:**

```javascript
// Too verbose for INFO level
this.logger.info(`[Request] Full body: ${JSON.stringify(largeObject)}`);
```

**Correct:**

```javascript
// Use DEBUG for detailed data
this.logger.debug(`[Request] Full body: ${JSON.stringify(largeObject)}`);

// Use INFO for summary
this.logger.info(`[Request] Processing ${model} request`);
```

---

## Logging Checklist

When adding logging to new code, verify:

- [ ] Custom `LoggingService` is used (not `console.log/error`)
- [ ] Logger instance has descriptive service name
- [ ] Messages include context with subsystem prefix (e.g., `[Session]`, `[Auth]`)
- [ ] Appropriate log level is used (DEBUG for details, INFO for events, etc.)
- [ ] No sensitive data is logged (passwords, API keys, personal info)
- [ ] Error logs include error message and relevant context
- [ ] Timezone is configured via `TZ` environment variable if needed
- [ ] Verbose data uses DEBUG level, not INFO in production
