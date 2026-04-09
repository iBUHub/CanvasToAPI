# Error Handling

> How errors are handled in this project.

---

## Overview

This project uses custom error classes that extend the native `Error` class. All errors are propagated using try-catch blocks and logged using the custom `LoggingService`. Errors are never thrown as raw strings or silently swallowed.

**Key Principles:**

- Always throw custom error classes (not raw strings)
- Use try-catch to wrap async operations
- Log errors with context before re-throwing or handling
- Check error types with helper functions (e.g., `isUserAbortedError()`)
- Never catch and ignore errors silently

---

## Error Types

### Custom Error Classes

All custom errors extend the native `Error` class and are defined in `src/utils/CustomErrors.js` and `src/utils/MessageQueue.js`.

#### UserAbortedError

Used when a user aborts a request (e.g., client disconnects, manual cancellation).

**File:** `src/utils/CustomErrors.js`

```javascript
class UserAbortedError extends Error {
  constructor(message = "The user aborted a request") {
    super(message);
    this.name = "UserAbortedError";
    this.isUserAborted = true;
  }
}
```

**Usage:**

```javascript
throw new UserAbortedError("Client disconnected during stream");
```

#### QueueClosedError

Used when attempting to use a closed message queue.

**File:** `src/utils/MessageQueue.js`

```javascript
class QueueClosedError extends Error {
  constructor(message = "Queue is closed", reason = "unknown") {
    super(message);
    this.name = "QueueClosedError";
    this.code = "QUEUE_CLOSED";
    this.reason = reason;
  }
}
```

**Usage:**

```javascript
throw new QueueClosedError("Queue closed due to WebSocket disconnect", "ws_disconnect");
```

#### QueueTimeoutError

Used when a queue operation times out.

**File:** `src/utils/MessageQueue.js`

```javascript
class QueueTimeoutError extends Error {
  constructor(message = "Queue timeout") {
    super(message);
    this.name = "QueueTimeoutError";
    this.code = "QUEUE_TIMEOUT";
  }
}
```

**Usage:**

```javascript
// Automatically thrown by MessageQueue.dequeue() on timeout
```

### Error Properties

All custom errors support these standard properties:

- `name`: Error class name (e.g., "UserAbortedError")
- `message`: Human-readable error message
- `code`: Optional error code (e.g., "QUEUE_CLOSED")
- `isUserAborted`: Boolean flag for user abort errors
- `reason`: Optional reason string (e.g., "authentication_timeout")

---

## Error Handling Patterns

### Pattern 1: Try-Catch with Logging

Always wrap async operations in try-catch and log before re-throwing.

**File:** `src/core/ProxyServerSystem.js`

```javascript
async start() {
    this.logger.info("[System] Starting protocol adapter server...");
    try {
        await this._startHttpServer();
    } catch (error) {
        this.logger.error(`[System] Failed to start server: ${error.message}`);
        throw error; // Re-throw after logging
    }

    this.staleQueueCleanupInterval = setInterval(() => {
        try {
            this.sessionRegistry.cleanupStaleQueues(600000);
        } catch (error) {
            this.logger.error(`[System] Error during stale queue cleanup: ${error.message}`);
        }
    }, 300000);

    this.logger.info("[System] Server startup complete.");
    this.emit("started");
}
```

### Pattern 2: Error Type Checking with Helper Functions

Use helper functions to check error types instead of `instanceof` checks.

**File:** `src/utils/CustomErrors.js`

```javascript
function isUserAbortedError(error) {
  if (error instanceof UserAbortedError || error?.isUserAborted === true) {
    return true;
  }

  if (error?.name === "AbortError") {
    return true;
  }

  if (typeof error?.message === "string" && error.message.includes("The user aborted a request")) {
    return true;
  }

  return false;
}
```

**Usage in RequestHandler:**
**File:** `src/core/RequestHandler.js`

```javascript
const { isUserAbortedError } = require("../utils/CustomErrors");

// In request handling logic
if (isUserAbortedError(error)) {
  this.logger.info(`[Request] User aborted request, not retrying`);
  return; // Don't retry user-aborted requests
}
```

### Pattern 3: Error Status Code Mapping

Map errors to appropriate HTTP status codes.

**File:** `src/core/RequestHandler.js`

```javascript
_getErrorStatusCode(error, fallbackStatus = 500) {
    if (this._isQueueTimeoutError(error)) {
        return 504; // Gateway Timeout
    }

    if (this._isConnectionResetError(error)) {
        return 503; // Service Unavailable
    }

    const explicitStatus = Number(error?.status);
    if (Number.isFinite(explicitStatus) && explicitStatus >= 400) {
        return explicitStatus;
    }

    return fallbackStatus;
}

_isQueueTimeoutError(error) {
    if (!error) return false;
    return error instanceof QueueTimeoutError || error.code === "QUEUE_TIMEOUT";
}

_isConnectionResetError(error) {
    if (!error) return false;
    if (error instanceof QueueClosedError) return true;
    if (error.code === "QUEUE_CLOSED") return true;
    if (error.message) {
        return (
            error.message.includes("Queue closed") ||
            error.message.includes("Queue is closed") ||
            error.message.includes("Connection lost")
        );
    }
    return false;
}
```

---

## API Error Responses

### Standard Error Response Format

All API errors return JSON responses with the following structure:

```javascript
// Generic error response
{
    "error": {
        "message": "Human-readable error message"
    }
}

// Authentication error
{
    "error": {
        "message": "Access denied. A valid API key was not found or is incorrect."
    }
}
```

### Example: Authentication Error

**File:** `src/core/ProxyServerSystem.js`

```javascript
_createAuthMiddleware() {
    return (req, res, next) => {
        if (!this._hasConfiguredApiKeys()) {
            return next();
        }

        const clientKey = this._extractClientKey(req);
        if (this._isValidApiKey(clientKey)) {
            this.logger.info(
                `[Auth] API key verification passed (from: ${this.webRoutes.authRoutes.getClientIP(req)})`
            );
            if (req.query.key) {
                delete req.query.key;
            }
            return next();
        }

        if (req.path !== "/favicon.ico") {
            const clientIp = this.webRoutes.authRoutes.getClientIP(req);
            this.logger.warn(`[Auth] Access password incorrect or missing. IP: ${clientIp}, Path: ${req.path}`);
        }

        return res.status(401).json({
            error: {
                message: "Access denied. A valid API key was not found or is incorrect.",
            },
        });
    };
}
```

### Example: Gemini Format Error Response

**File:** `src/core/RequestHandler.js`

```javascript
_sendGeminiError(res, statusCode, statusText, errorMessage) {
    res.status(statusCode).json({
        error: {
            code: statusCode,
            message: errorMessage,
            status: statusText,
        },
    });
}

// Usage
this._sendGeminiError(res, 503, "UNAVAILABLE", "No active browser session available");
```

---

## Common Mistakes

### Mistake 1: Throwing Raw Strings

**Wrong:**

```javascript
throw "Something went wrong";
```

**Correct:**

```javascript
throw new Error("Something went wrong");
// Or better:
throw new QueueClosedError("Queue is closed", "connection_lost");
```

### Mistake 2: Silent Error Swallowing

**Wrong:**

```javascript
try {
  await someOperation();
} catch (error) {
  // Do nothing
}
```

**Correct:**

```javascript
try {
  await someOperation();
} catch (error) {
  this.logger.error(`Operation failed: ${error.message}`);
  // Either re-throw or handle appropriately
  throw error;
}
```

### Mistake 3: Using console.error Instead of Logger

**Wrong:**

```javascript
console.error("An error occurred:", error);
```

**Correct:**

```javascript
this.logger.error(`[Context] An error occurred: ${error.message}`);
```

### Mistake 4: Not Checking Error Types Before Handling

**Wrong:**

```javascript
try {
  await operation();
} catch (error) {
  // Assume all errors are connection errors
  this._handleConnectionError();
}
```

**Correct:**

```javascript
try {
  await operation();
} catch (error) {
  if (this._isConnectionResetError(error)) {
    this._handleConnectionError();
  } else if (isUserAbortedError(error)) {
    this.logger.info("User aborted request");
  } else {
    this.logger.error(`Unexpected error: ${error.message}`);
    throw error;
  }
}
```

### Mistake 5: Missing Error Context in Logs

**Wrong:**

```javascript
this.logger.error(error.message);
```

**Correct:**

```javascript
this.logger.error(`[Session] Failed to authenticate connection ${connectionId}: ${error.message}`);
```

**Better (include relevant identifiers):**

```javascript
const browserLabel = this._formatConnectionLabel(connectionId, connection);
this.logger.error(`[Auth] Browser session ${browserLabel} failed to authenticate: ${error.message}`);
```

---

## Error Handling Checklist

When adding new code, verify:

- [ ] Custom error classes are used instead of raw strings
- [ ] Async operations are wrapped in try-catch
- [ ] Errors are logged with context before re-throwing
- [ ] Error type checks use helper functions (e.g., `isUserAbortedError()`)
- [ ] HTTP status codes match error types (504 for timeout, 503 for unavailable, etc.)
- [ ] Error responses follow the standard JSON format
- [ ] No silent error catching (always log or re-throw)
- [ ] Custom logger is used instead of `console.error()`
