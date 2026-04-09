# Data Storage Guidelines

> Data storage patterns and conventions for this project.

---

## Overview

This project **does not use a traditional database or ORM**. Instead, it uses two primary storage mechanisms:

1. **File-based storage**: Configuration and authentication data stored as JSON files
2. **In-memory storage**: Runtime state managed in JavaScript data structures (Maps, Objects)

**Key Principles:**

- Persistent data (auth, config) stored as JSON files in `configs/`
- Runtime state (connections, queues) stored in memory
- No migrations needed - file format changes are backward compatible
- Configuration loaded once at startup; auth files loaded on-demand

---

## Storage Architecture

### File-Based Storage

**Location:** `configs/` directory

**File Types:**

- Authentication state: `configs/auth/auth-N.json` (N = 0, 1, 2, ...)
- Model configuration: `configs/models.json`
- Share link configuration: `configs/share-link.json`
- Environment config: `.env` (not checked into version control)

### In-Memory Storage

**Managed by:** Core system classes (SessionRegistry, MessageQueue, etc.)

**Data Structures:**

- WebSocket connections: `Map<connectionId, connection>`
- Message queues: `Map<queueId, MessageQueue>`
- Rate limiting: `Map<ip, attempts>`
- Configuration: Plain JavaScript objects

---

## File-Based Storage Patterns

### Authentication Files

**Purpose:** Store browser session state (cookies, localStorage) for each Google account

**Location:** `configs/auth/auth-N.json`

**Format:** Playwright browser context state (JSON)

**Loading Pattern:**

**File:** `src/auth/AuthSource.js` (example pattern)

```javascript
const fs = require("fs");
const path = require("path");

class AuthSource {
  constructor(logger) {
    this.logger = logger;
    this.authDir = path.join(__dirname, "../../configs/auth");
  }

  loadAuthFile(index) {
    const authPath = path.join(this.authDir, `auth-${index}.json`);

    if (!fs.existsSync(authPath)) {
      this.logger.warn(`[Auth] Auth file not found: ${authPath}`);
      return null;
    }

    try {
      const data = fs.readFileSync(authPath, "utf-8");
      const authState = JSON.parse(data);

      this.logger.info(`[Auth] Loaded auth file: auth-${index}.json`);
      return authState;
    } catch (error) {
      this.logger.error(`[Auth] Failed to load auth-${index}.json: ${error.message}`);
      return null;
    }
  }

  saveAuthFile(index, authState) {
    const authPath = path.join(this.authDir, `auth-${index}.json`);

    try {
      fs.writeFileSync(authPath, JSON.stringify(authState, null, 4), "utf-8");
      this.logger.info(`[Auth] Saved auth file: auth-${index}.json`);
    } catch (error) {
      this.logger.error(`[Auth] Failed to save auth-${index}.json: ${error.message}`);
      throw error;
    }
  }
}
```

### Configuration Files

**Purpose:** Store application configuration (models, share links, etc.)

**Loading Pattern:**

**File:** `src/utils/ConfigLoader.js`

```javascript
const fs = require("fs");
const path = require("path");

class ConfigLoader {
  constructor(logger) {
    this.logger = logger;
  }

  loadConfiguration() {
    const config = {
      apiKeys: [],
      browserWsPath: "/ws",
      httpPort: 7861,
      maxRetries: 3,
      sessionSelectionStrategy: "round",
      streamingMode: "fake",
    };

    // Load from environment variables
    if (process.env.PORT) {
      const parsed = parseInt(process.env.PORT, 10);
      config.httpPort = Number.isFinite(parsed) ? parsed : config.httpPort;
    }

    // Load share link from file
    const shareLinkPath = path.join(__dirname, "../../configs/share-link.json");
    if (fs.existsSync(shareLinkPath)) {
      try {
        const data = fs.readFileSync(shareLinkPath, "utf-8");
        const shareLinkConfig = JSON.parse(data);
        config.sharePageUrl = shareLinkConfig.url;
      } catch (error) {
        this.logger.error(`[Config] Failed to load share-link.json: ${error.message}`);
      }
    }

    return config;
  }
}
```

### File Naming Conventions

**Authentication files:**

- Pattern: `auth-N.json` where N is a zero-indexed integer
- Example: `auth-0.json`, `auth-1.json`, `auth-2.json`

**Configuration files:**

- Pattern: `kebab-case.json`
- Example: `models.json`, `share-link.json`

---

## In-Memory Storage Patterns

### Pattern 1: Map for Key-Value Storage

Use `Map` for dynamic collections with non-string keys or when you need ordered iteration.

**File:** `src/core/SessionRegistry.js`

```javascript
class SessionRegistry extends EventEmitter {
  constructor(logger, config = {}) {
    super();
    this.logger = logger;
    this.connections = new Map(); // connectionId -> connection object
    this.messageQueues = new Map(); // queueId -> MessageQueue instance
  }

  addConnection(ws, meta = {}) {
    const connectionId = randomUUID();
    const connection = {
      authenticated: false,
      connectedAt: Date.now(),
      ws: ws,
      meta: meta,
    };

    this.connections.set(connectionId, connection);
    ws._connectionId = connectionId;

    this.logger.info(`[Session] Browser connected: ${connectionId}`);
  }

  getConnection(connectionId) {
    return this.connections.get(connectionId)?.ws || null;
  }

  removeConnection(connectionId, reason = "connection_closed") {
    const entry = this.connections.get(connectionId);
    if (!entry) {
      return;
    }

    this.connections.delete(connectionId);
    this.logger.info(`[Session] Browser disconnected: ${connectionId}. Reason: ${reason}`);
  }
}
```

### Pattern 2: Object for Configuration Storage

Use plain objects for static configuration loaded at startup.

**File:** `src/core/ProxyServerSystem.js`

```javascript
class ProxyServerSystem extends EventEmitter {
  constructor() {
    super();
    this.logger = new LoggingService("CanvasToAPI");

    const configLoader = new ConfigLoader(this.logger);
    this.config = configLoader.loadConfiguration();

    // Access config values
    this.streamingMode = this.config.streamingMode;
    this.httpPort = this.config.httpPort;
  }
}
```

### Pattern 3: Map for Rate Limiting

Use `Map` with timestamp tracking for rate limiting.

**File:** `src/routes/AuthRoutes.js`

```javascript
class AuthRoutes {
  constructor(serverSystem) {
    this.serverSystem = serverSystem;
    this.logger = serverSystem.logger;
    this.loginAttempts = new Map(); // IP -> { count, firstAttempt }

    this.rateLimitWindow = 15; // minutes
    this.rateLimitMaxAttempts = 5;
  }

  isRateLimited(ip) {
    const now = Date.now();
    const attempts = this.loginAttempts.get(ip);

    if (!attempts) {
      this.loginAttempts.set(ip, { count: 1, firstAttempt: now });
      return false;
    }

    const windowMs = this.rateLimitWindow * 60 * 1000;
    const timeSinceFirstAttempt = now - attempts.firstAttempt;

    // Reset if window has passed
    if (timeSinceFirstAttempt > windowMs) {
      this.loginAttempts.set(ip, { count: 1, firstAttempt: now });
      return false;
    }

    // Check if limit exceeded
    if (attempts.count >= this.rateLimitMaxAttempts) {
      return true;
    }

    // Increment count
    attempts.count++;
    return false;
  }

  clearRateLimit(ip) {
    this.loginAttempts.delete(ip);
  }
}
```

### Pattern 4: Array for Message Buffering

Use arrays for ordered, bounded buffers.

**File:** `src/utils/LoggingService.js`

```javascript
class LoggingService {
  constructor(serviceName = "ProxyServer") {
    this.serviceName = serviceName;
    this.logBuffer = [];
    this.maxBufferSize = 1000;
  }

  _formatMessage(level, message) {
    const formatted = `[${level}] ${timestamp} [${this.serviceName}] - ${message}`;

    this.logBuffer.push(formatted);

    // Physical hard limit for memory safety
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift(); // Remove oldest log
    }

    return formatted;
  }

  getLogs(limit = 100) {
    return this.logBuffer.slice(-limit);
  }
}
```

---

## Data Lifecycle Management

### Cleanup Patterns

**Periodic cleanup for stale data:**

**File:** `src/core/ProxyServerSystem.js`

```javascript
async start() {
    // Start periodic cleanup
    this.staleQueueCleanupInterval = setInterval(() => {
        try {
            this.sessionRegistry.cleanupStaleQueues(600000); // 10 minutes
        } catch (error) {
            this.logger.error(`[System] Error during stale queue cleanup: ${error.message}`);
        }
    }, 300000); // Every 5 minutes
}
```

**File:** `src/core/SessionRegistry.js`

```javascript
cleanupStaleQueues(maxAgeMs) {
    const now = Date.now();
    const staleThreshold = now - maxAgeMs;

    for (const [queueId, queue] of this.messageQueues.entries()) {
        if (queue.createdAt < staleThreshold) {
            queue.close("stale_cleanup");
            this.messageQueues.delete(queueId);
            this.logger.debug(`[Session] Cleaned up stale queue: ${queueId}`);
        }
    }
}
```

### Graceful Shutdown

**Clean up resources on shutdown:**

```javascript
async shutdown() {
    this.logger.info("[System] Shutting down...");

    // Clear intervals
    if (this.staleQueueCleanupInterval) {
        clearInterval(this.staleQueueCleanupInterval);
    }

    // Close all connections
    for (const [connectionId, connection] of this.connections.entries()) {
        connection.ws.close(1001, "server_shutdown");
    }

    // Close all queues
    for (const [queueId, queue] of this.messageQueues.entries()) {
        queue.close("server_shutdown");
    }

    this.logger.info("[System] Shutdown complete");
}
```

---

## Concurrency and Thread Safety

### No Multi-Threading

Node.js is single-threaded, so there are no race conditions between threads. However, you must still handle:

1. **Concurrent async operations**: Multiple promises accessing the same data
2. **Event handlers**: Events firing during state modifications

### Async Safety Pattern

**File:** `src/utils/MessageQueue.js`

```javascript
async dequeue(timeoutMs = this.defaultTimeout) {
    if (this.closed) {
        throw new QueueClosedError(`Queue is closed`);
    }

    return new Promise((resolve, reject) => {
        // Check if messages already queued
        if (this.messages.length > 0) {
            resolve(this.messages.shift());
            return;
        }

        // Create resolver with timeout
        const resolver = { reject, resolve, timeoutId: null };

        // Set timeout BEFORE pushing to waitingResolvers
        resolver.timeoutId = setTimeout(() => {
            const index = this.waitingResolvers.indexOf(resolver);
            if (index !== -1) {
                this.waitingResolvers.splice(index, 1);
            }
            resolver.timeoutId = null;
            reject(new QueueTimeoutError());
        }, timeoutMs);

        this.waitingResolvers.push(resolver);

        // CRITICAL: Check again if messages arrived during initialization
        if (this.messages.length > 0 && this.waitingResolvers[0] === resolver) {
            this.waitingResolvers.shift();
            clearTimeout(resolver.timeoutId);
            resolve(this.messages.shift());
        }
    });
}
```

---

## Common Mistakes

### Mistake 1: Not Validating File Existence

**Wrong:**

```javascript
const data = fs.readFileSync("configs/auth/auth-0.json", "utf-8");
```

**Correct:**

```javascript
const authPath = path.join(__dirname, "../../configs/auth/auth-0.json");
if (!fs.existsSync(authPath)) {
  this.logger.warn(`[Auth] Auth file not found: ${authPath}`);
  return null;
}
const data = fs.readFileSync(authPath, "utf-8");
```

### Mistake 2: Unbounded Memory Growth

**Wrong:**

```javascript
this.logs.push(newLog); // Never cleaned up
```

**Correct:**

```javascript
this.logs.push(newLog);
if (this.logs.length > this.maxBufferSize) {
  this.logs.shift(); // Remove oldest
}
```

### Mistake 3: Not Handling JSON Parse Errors

**Wrong:**

```javascript
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
```

**Correct:**

```javascript
try {
  const data = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(data);
  return config;
} catch (error) {
  this.logger.error(`[Config] Failed to parse ${configPath}: ${error.message}`);
  return null;
}
```

### Mistake 4: Storing Sensitive Data in Plain Text

**Note:** This project stores auth tokens in `configs/auth/auth-N.json`. In production:

- Use environment variables for secrets when possible
- Consider encrypting sensitive files
- Add `configs/auth/` to `.gitignore` (already done in this project)

---

## Storage Checklist

When adding new data storage, verify:

- [ ] File-based storage used for persistent data (auth, config)
- [ ] In-memory storage used for runtime state (connections, queues)
- [ ] File existence checked before reading
- [ ] JSON parse errors caught and logged
- [ ] Memory buffers have size limits to prevent unbounded growth
- [ ] Cleanup logic implemented for stale data
- [ ] Sensitive data not logged in debug output
- [ ] File paths use `path.join()` for cross-platform compatibility
- [ ] Async operations handle concurrent access safely
