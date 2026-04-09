# Quality Guidelines

> Code quality standards for backend development.

---

## Overview

This project enforces code quality through ESLint, Prettier, and pre-commit hooks (Husky + lint-staged). All code must pass linting and formatting checks before being committed.

**Quality Tools:**

- **ESLint**: Enforces code quality rules (no-unused-vars, no-var, prefer-const, etc.)
- **Prettier**: Auto-formats code for consistency
- **Husky**: Git hooks for pre-commit checks
- **lint-staged**: Runs linters on staged files only

**Key Principles:**

- Never bypass linting rules - fix the issue instead
- Use `npm run lint:fix` to auto-fix issues
- Run `npm run format` before committing
- Pre-commit hooks will fail if linting fails

---

## Forbidden Patterns

### 1. Using `var` for Variable Declarations

**Forbidden:**

```javascript
var count = 0;
var name = "test";
```

**Required:**

```javascript
const count = 0;
const name = "test";

// Use let only when reassignment is needed
let counter = 0;
counter++;
```

**ESLint Rule:** `no-var: "error"`

---

### 2. Unused Variables

**Forbidden:**

```javascript
function process(data) {
  const temp = data.value; // Never used
  return data.value;
}
```

**Required:**

```javascript
function process(data) {
  return data.value;
}

// Or use the variable
function process(data) {
  const temp = data.value;
  console.log(temp);
  return temp;
}
```

**ESLint Rule:** `no-unused-vars: "error"`

**Exception:** Variables matching pattern `^(toggleLanguage|switchSpecificAccount|updateContent|handleLogout)$` in frontend code are allowed.

---

### 3. Using `console.log` Instead of Custom Logger

**Forbidden:**

```javascript
console.log("Server started");
console.error("Error:", error);
```

**Required:**

```javascript
this.logger.info("[System] Server started");
this.logger.error(`[System] Error: ${error.message}`);
```

**Note:** ESLint allows `console` statements in this project because the custom logger internally uses `console.log/error`. However, **application code must use the custom logger**.

---

### 4. Non-Const When Const is Sufficient

**Forbidden:**

```javascript
let config = loadConfig();
let timeout = 30000;
```

**Required:**

```javascript
const config = loadConfig();
const timeout = 30000;
```

**ESLint Rule:** `prefer-const: "error"`

**Use `let` only when reassignment is needed:**

```javascript
let retryCount = 0;
retryCount++;
```

---

### 5. Non-Arrow Callbacks

**Forbidden:**

```javascript
const results = items.map(function (item) {
  return item.value;
});

setTimeout(function () {
  cleanup();
}, 1000);
```

**Required:**

```javascript
const results = items.map(item => item.value);

setTimeout(() => cleanup(), 1000);
```

**ESLint Rule:** `prefer-arrow-callback: "error"`

**Exception:** When `this` binding is needed:

```javascript
// Allowed when unbound this is intentional
element.addEventListener("click", function () {
  console.log(this); // 'this' refers to element
});
```

---

### 6. Unsorted Object Keys

**Forbidden:**

```javascript
const config = {
  port: 7861,
  host: "localhost",
  retries: 3,
};
```

**Required:**

```javascript
const config = {
  host: "localhost",
  port: 7861,
  retries: 3,
};
```

**ESLint Rule:** `sort-keys-fix/sort-keys-fix: "error"`

**Auto-fix:**

```bash
npm run lint:fix
```

**Exception:** Configuration files (`.eslintrc.js`, `.prettierrc.js`, etc.) are exempt from sorting.

---

### 7. Throwing Raw Strings Instead of Error Objects

**Forbidden:**

```javascript
throw "Something went wrong";
throw "Invalid input";
```

**Required:**

```javascript
throw new Error("Something went wrong");
// Or better, use custom error class:
throw new QueueClosedError("Queue closed", "connection_lost");
```

**See:** `error-handling.md` for custom error class usage.

---

### 8. Silent Error Catching

**Forbidden:**

```javascript
try {
  await operation();
} catch (error) {
  // Do nothing
}
```

**Required:**

```javascript
try {
  await operation();
} catch (error) {
  this.logger.error(`[Context] Operation failed: ${error.message}`);
  // Either handle the error or re-throw
  throw error;
}
```

---

### 9. Missing Error Context in Logs

**Forbidden:**

```javascript
this.logger.error(error.message);
this.logger.info("Connection established");
```

**Required:**

```javascript
this.logger.error(`[Session] WebSocket error: ${error.message}`);
this.logger.info(`[Session] Browser connected ${browserLabel} from ${address}`);
```

---

## Required Patterns

### 1. File Header Comments

All files must have a header comment with file path, description, and author.

**Required:**

```javascript
/**
 * File: src/utils/CustomErrors.js
 * Description: Custom error helpers for request handling
 *
 * Author: iBUHUB
 */
```

---

### 2. JSDoc for Public Methods

Document public methods with JSDoc comments.

**Required:**

```javascript
/**
 * Add a new WebSocket connection to the registry
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} meta - Connection metadata
 * @returns {string} Connection ID
 */
addConnection(ws, meta = {}) {
    // Implementation
}
```

---

### 3. Use Strict Equality

Always use `===` instead of `==`.

**Required:**

```javascript
if (status === 200) {
}
if (name === "test") {
}
```

**Forbidden:**

```javascript
if (status == 200) {
} // Type coercion can cause bugs
```

---

### 4. Arrow Functions for Methods

Use arrow function syntax for object methods when `this` binding is not needed.

**Required:**

```javascript
const config = {
  name: "test",
  getValue: () => "value",
  process(item) {
    return item.value;
  },
};
```

**ESLint Rule:** `object-shorthand: "error"`, `arrow-body-style: "error"`

---

### 5. Async/Await Instead of Raw Promises

Use `async/await` for asynchronous code.

**Required:**

```javascript
async function fetchData() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    this.logger.error(`Failed to fetch: ${error.message}`);
    throw error;
  }
}
```

**Avoid (unless necessary):**

```javascript
function fetchData() {
  return fetch(url)
    .then(response => response.json())
    .then(data => data)
    .catch(error => {
      console.error(error);
    });
}
```

---

### 6. Destructuring for Configuration

Use destructuring for configuration objects.

**Required:**

```javascript
function createServer(config) {
  const { port, host, sslEnabled } = config;

  this.logger.info(`Server starting on ${host}:${port}`);
  // ...
}
```

---

### 7. Private Method Prefix

Prefix private methods with underscore.

**Required:**

```javascript
class RequestHandler {
  constructor(config) {
    this.config = config;
  }

  // Public method
  handleRequest(req, res) {
    return this._processRequest(req);
  }

  // Private method
  _processRequest(req) {
    // Implementation
  }

  _validateInput(data) {
    // Implementation
  }
}
```

---

## Testing Requirements

### Current State

This project has minimal test coverage. Tests are located in `test/` directory and client scripts in `scripts/client/`.

### When Adding Tests

1. **Test file location:**
   - Unit tests: `test/unit/`
   - Integration tests: `test/integration/`
   - Client scripts: `scripts/client/`

2. **Test file naming:**
   - Pattern: `*.test.js` or `*.spec.js`
   - Example: `RequestHandler.test.js`

3. **Run tests:**
   ```bash
   npm test  # If test script is configured
   ```

### Manual Testing Checklist

Before committing, manually test:

- [ ] Server starts without errors: `npm run dev`
- [ ] API endpoints respond correctly (use client scripts in `scripts/client/`)
- [ ] WebSocket connections work (browser session connects)
- [ ] Authentication works (login/logout)
- [ ] Error handling works (simulate errors)
- [ ] Logging works (check log output)

---

## Code Review Checklist

When reviewing code (including your own), check:

### Functionality

- [ ] Code does what it's supposed to do
- [ ] Edge cases are handled (null, undefined, empty arrays)
- [ ] Error handling is complete (try-catch, error logging)
- [ ] No obvious bugs or race conditions

### Code Quality

- [ ] ESLint passes: `npm run lint`
- [ ] Prettier formatting applied: `npm run format`
- [ ] No forbidden patterns used (see above)
- [ ] Required patterns followed (see above)
- [ ] Variables have meaningful names
- [ ] No magic numbers (use constants)

### Logging

- [ ] Custom logger used (not `console.log/error`)
- [ ] Log messages have context (e.g., `[Session]`, `[Auth]`)
- [ ] No sensitive data logged (passwords, API keys)
- [ ] Appropriate log level used (DEBUG, INFO, WARN, ERROR)

### Error Handling

- [ ] Custom error classes used (not raw strings)
- [ ] Errors caught and logged with context
- [ ] Errors re-thrown or handled appropriately
- [ ] HTTP status codes match error types

### Documentation

- [ ] File header comment present
- [ ] Public methods documented with JSDoc
- [ ] Complex logic explained in comments
- [ ] README updated if behavior changes

### Security

- [ ] No hardcoded secrets or credentials
- [ ] User input validated
- [ ] API keys checked before authentication
- [ ] Sensitive data not logged

---

## Pre-Commit Hooks

### Automatic Checks

When you commit code, Husky + lint-staged automatically runs:

1. **ESLint** on staged `.js` and `.vue` files
2. **Prettier** on all staged files
3. **Stylelint** on `.css` and `.less` files

**Configuration:** `package.json`

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "ui/**/*.vue": ["eslint --fix", "prettier --write"],
    "ui/**/*.{css,less}": ["stylelint --fix", "prettier --write"]
  }
}
```

### Bypassing Hooks (Not Recommended)

**Only bypass in emergencies:**

```bash
git commit --no-verify -m "Emergency fix"
```

**Warning:** Bypassing hooks may commit code that fails CI/CD checks.

---

## Linting Commands

### Check for Issues

```bash
npm run lint            # Lint all JS and CSS files
npm run lint:js         # Lint only JavaScript files
npm run lint:css        # Lint only CSS/Less files
```

### Auto-Fix Issues

```bash
npm run lint:fix        # Auto-fix JS and CSS issues
npm run lint:js:fix     # Auto-fix only JavaScript
npm run lint:css:fix    # Auto-fix only CSS/Less
```

### Format Code

```bash
npm run format          # Format all files with Prettier
npm run format:check    # Check formatting without changes
```

---

## ESLint Configuration Highlights

**File:** `.eslintrc.js`

### Key Rules

```javascript
{
    "rules": {
        // Code Quality
        "no-unused-vars": "error",
        "no-console": "off",  // Allowed (logger uses console internally)
        "no-var": "error",
        "prefer-const": "error",

        // Code Style
        "prefer-arrow-callback": "error",
        "arrow-body-style": ["error", "as-needed"],
        "object-shorthand": ["error", "always"],
        "padded-blocks": ["error", "never"],
        "sort-keys-fix/sort-keys-fix": "error",
    }
}
```

### Prettier Integration

ESLint is configured to work with Prettier via `eslint-plugin-prettier` and `eslint-config-prettier`. This means:

- **Prettier handles formatting:** indentation, quotes, semicolons, etc.
- **ESLint handles quality:** unused vars, const usage, arrow functions, etc.
- **No conflicts:** ESLint rules that conflict with Prettier are disabled

---

## Prettier Configuration Highlights

**File:** `.prettierrc.js`

### Key Settings

```javascript
{
    tabWidth: 4,           // 4 spaces for indentation
    useTabs: false,        // Use spaces, not tabs
    singleQuote: false,    // Use double quotes in backend JS
    semi: true,            // Always use semicolons
    printWidth: 120,       // Max line width 120 chars
    trailingComma: "es5",  // Trailing commas where valid in ES5
    arrowParens: "avoid",  // Omit parens when possible: x => x
}
```

### File-Specific Overrides

**Backend JavaScript** (src/**/\*.js, scripts/**/\*.js):

```javascript
{
    tabWidth: 4,
    singleQuote: false,  // Double quotes
}
```

**Frontend JavaScript** (ui/\*_/_.js):

```javascript
{
    tabWidth: 4,
    singleQuote: true,   // Single quotes
}
```

**JSON files:**

```javascript
{
    tabWidth: 4,
    trailingComma: "none",
}
```

---

## Common Linting Issues and Fixes

### Issue 1: Unsorted Object Keys

**Error:** `sort-keys-fix/sort-keys-fix`

**Fix:**

```bash
npm run lint:fix
```

**Or manually:**

```javascript
// Before
const config = {
  port: 7861,
  host: "localhost",
};

// After
const config = {
  host: "localhost",
  port: 7861,
};
```

---

### Issue 2: Should Use Const

**Error:** `prefer-const`

**Fix:**

```javascript
// Before
let config = loadConfig();

// After
const config = loadConfig();
```

---

### Issue 3: Unexpected var

**Error:** `no-var`

**Fix:**

```javascript
// Before
var count = 0;

// After
const count = 0;
// Or if reassignment needed:
let count = 0;
```

---

### Issue 4: Unexpected Arrow Function

**Error:** `prefer-arrow-callback`

**Fix:**

```javascript
// Before
items.map(function (item) {
  return item.value;
});

// After
items.map(item => item.value);
```

---

## Quality Checklist Summary

Before submitting code:

- [ ] Run `npm run lint` - All checks pass
- [ ] Run `npm run format` - Code is formatted
- [ ] No forbidden patterns used
- [ ] Required patterns followed
- [ ] File header comments present
- [ ] Public methods documented
- [ ] Error handling complete
- [ ] Custom logger used with context
- [ ] No hardcoded secrets
- [ ] Manual testing passed
