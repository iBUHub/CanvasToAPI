# Directory Structure

> How backend code is organized in this project.

---

## Overview

This project follows a modular architecture with clear separation of concerns. The backend is built with Node.js + Express.js and uses a custom logging system, file-based configuration, and in-memory state management (no database).

**Key Principles:**

- Core business logic lives in `src/core/`
- HTTP routes are organized in `src/routes/`
- Reusable utilities go in `src/utils/`
- Configuration and authentication data are stored in `configs/`

---

## Directory Layout

```
E:\CanvasToAPI\
├── main.js                          # Application entry point
├── src/
│   ├── core/                        # Core business logic modules
│   │   ├── ProxyServerSystem.js     # Main orchestrator (EventEmitter-based)
│   │   ├── RequestHandler.js        # Request processing and retry logic
│   │   ├── SessionRegistry.js       # WebSocket connection management
│   │   └── FormatConverter.js       # API format translation (OpenAI/Gemini/Anthropic)
│   ├── routes/                      # Express route definitions
│   │   ├── AuthRoutes.js            # Login/logout/authentication routes
│   │   ├── StatusRoutes.js          # Health check and status endpoints
│   │   └── WebRoutes.js             # Web UI and API proxy routes
│   └── utils/                       # Utility modules
│       ├── LoggingService.js        # Custom logger with timestamps and buffering
│       ├── CustomErrors.js          # Custom error classes
│       ├── MessageQueue.js          # Async request/response queue
│       ├── ConfigLoader.js          # Configuration loader
│       ├── ShareLink.js             # Gemini share link utilities
│       └── VersionChecker.js        # Version checking utilities
├── configs/                         # Configuration files (file-based storage)
│   ├── auth/                        # Authentication data
│   │   ├── auth-0.json              # Browser session state for account 0
│   │   ├── auth-1.json              # Browser session state for account 1
│   │   └── ...                      # Additional accounts
│   ├── models.json                  # Model configuration
│   └── share-link.json              # Gemini share link configuration
├── public/                          # Static files served by Express
│   └── build.js                     # Browser-side script (built from ui/)
└── ui/                              # Frontend Vue.js application
    └── ...
```

---

## Module Organization

### When to Create a New Module

**Add to `src/core/` when:**

- It's a main system component that orchestrates other modules
- It manages the lifecycle of server components
- Example: A new `HealthMonitor.js` that tracks system health across all modules

**Add to `src/routes/` when:**

- It defines HTTP endpoints
- It handles HTTP request/response logic
- Example: A new `MetricsRoutes.js` for exposing Prometheus metrics

**Add to `src/utils/` when:**

- It's a reusable utility function or class
- It doesn't directly handle HTTP routing or core business orchestration
- Example: A `RateLimiter.js` for throttling requests

### Module Pattern

All modules follow these conventions:

1. **File header comment** with file path, description, and author

   ```javascript
   /**
    * File: src/utils/CustomErrors.js
    * Description: Custom error helpers for request handling
    *
    * Author: iBUHUB
    */
   ```

2. **Class-based exports** for stateful modules

   ```javascript
   class LoggingService {
     constructor(serviceName = "ProxyServer") {
       this.serviceName = serviceName;
     }
   }
   module.exports = LoggingService;
   ```

3. **Object exports** for stateless utilities
   ```javascript
   module.exports = {
     isUserAbortedError,
     UserAbortedError,
   };
   ```

---

## Naming Conventions

### File Naming

- **Class files**: PascalCase (e.g., `LoggingService.js`, `RequestHandler.js`)
- **Route files**: PascalCase with "Routes" suffix (e.g., `AuthRoutes.js`, `WebRoutes.js`)
- **Utility files**: PascalCase for classes, camelCase for function collections
- **Configuration files**: kebab-case (e.g., `share-link.json`)

### Directory Naming

- Use lowercase with hyphens for subdirectories
- Keep directory names short and descriptive
- Examples: `core/`, `routes/`, `utils/`, `auth/`

### Variable/Function Naming

- **Classes**: PascalCase (e.g., `ProxyServerSystem`, `SessionRegistry`)
- **Methods/Functions**: camelCase (e.g., `getConnection`, `handleIncomingMessage`)
- **Private methods**: Prefix with underscore (e.g., `_formatMessage`, `_getTimestamp`)
- **Constants**: SCREAMING_SNAKE_CASE for true constants (e.g., `LEVELS`, `TIMEOUTS`)

---

## Examples

### Well-Organized Core Module

**File:** `src/core/ProxyServerSystem.js`

- Main orchestrator that extends `EventEmitter`
- Coordinates between `SessionRegistry`, `RequestHandler`, and route modules
- Clear separation: HTTP server setup, WebSocket handling, middleware configuration

**File:** `src/core/SessionRegistry.js`

- Single responsibility: manage WebSocket connections
- Exposes clear public API: `addConnection()`, `removeConnection()`, `getConnection()`
- Emits events for lifecycle changes: `connectionAdded`, `connectionRemoved`

### Well-Organized Utility Module

**File:** `src/utils/LoggingService.js`

- Encapsulates all logging logic
- Provides instance-based logger with service name context
- Formats timestamps with timezone support

**File:** `src/utils/MessageQueue.js`

- Handles async message queue with timeout support
- Defines custom error classes for queue operations
- Clean public API: `enqueue()`, `dequeue()`, `close()`

### Well-Organized Routes Module

**File:** `src/routes/AuthRoutes.js`

- Groups all authentication-related routes
- Uses constructor injection for dependencies (serverSystem)
- Clear method naming: `getClientIP()`, `handleLogin()`, `handleLogout()`
