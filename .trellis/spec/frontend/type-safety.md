# Type Safety

> Type safety patterns in this project.

---

## Overview

This project uses **pure JavaScript**, not TypeScript. Type safety is achieved through:

1. **Runtime validation** in Vue component props
2. **Explicit type documentation** in JSDoc comments
3. **ESLint rules** to catch common errors
4. **Careful coding practices** to avoid type-related bugs

**Key Principles:**

- Use `defineProps()` with runtime validation (type, required, default)
- Document function signatures with JSDoc comments
- Use ESLint to catch unused variables and common mistakes
- No compile-time type checking (JavaScript is untyped)
- Validate data from external sources (API, user input)

---

## Type Organization

### No TypeScript Types

This project does NOT use:

- TypeScript (`.ts`, `.tsx` files)
- Type definition files (`.d.ts`)
- Type annotations in code

### Where "Types" Exist

1. **Component props** - Runtime validation in `defineProps()`
2. **API responses** - JSON schema (implicit) or documented in code
3. **Function signatures** - JSDoc comments
4. **Configuration files** - JSON with documented structure

---

## Runtime Validation

### Props Validation

The primary form of type safety is **runtime props validation** in Vue components:

```vue
<script setup>
// ✅ CORRECT: Runtime validation
const props = defineProps({
  title: {
    required: true,
    type: String,
  },
  count: {
    required: false,
    type: Number,
    default: 0,
  },
  disabled: {
    required: false,
    type: Boolean,
    default: false,
  },
  items: {
    required: false,
    type: Array,
    default: () => [],
  },
  config: {
    required: false,
    type: Object,
    default: () => ({}),
  },
});
</script>
```

### Available Type Validators

Vue provides these built-in type validators:

| Type     | Validator        | Example                       |
| -------- | ---------------- | ----------------------------- |
| String   | `type: String`   | `title: { type: String }`     |
| Number   | `type: Number`   | `count: { type: Number }`     |
| Boolean  | `type: Boolean`  | `disabled: { type: Boolean }` |
| Array    | `type: Array`    | `items: { type: Array }`      |
| Object   | `type: Object`   | `config: { type: Object }`    |
| Function | `type: Function` | `handler: { type: Function }` |
| Symbol   | `type: Symbol`   | Rarely used                   |

### Custom Validators

For complex validation, use a validator function:

```vue
<script setup>
const props = defineProps({
  status: {
    required: true,
    validator: value => {
      return ["active", "inactive", "pending"].includes(value);
    },
  },
  email: {
    required: true,
    type: String,
    validator: value => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
  },
});
</script>
```

**Real example from EnvVarTooltip.vue:**

```vue
<script setup>
const props = defineProps({
  docSection: {
    required: true,
    type: String,
  },
  envVar: {
    required: true,
    type: String,
  },
});
</script>
```

---

## API Data Validation

### Validate External Data

Always validate data from APIs and user input:

```vue
<script setup>
import { ref, onMounted } from "vue";

const config = ref(null);

onMounted(async () => {
  try {
    const res = await fetch("/api/auth/config");
    if (res.ok) {
      const data = await res.json();

      // ✅ Validate before assigning
      if (typeof data.requireUsername === "boolean") {
        requireUsername.value = data.requireUsername;
      }
      if (typeof data.requirePassword === "boolean") {
        requirePassword.value = data.requirePassword;
      }
    }
  } catch (err) {
    console.error("Failed to load config", err);
  }
});
</script>
```

### Runtime Type Checks

Use JavaScript's `typeof` and `instanceof`:

```javascript
// Primitive types
if (typeof value === "string") {
  /* ... */
}
if (typeof value === "number") {
  /* ... */
}
if (typeof value === "boolean") {
  /* ... */
}

// Null check
if (value === null) {
  /* ... */
}
if (value !== null && value !== undefined) {
  /* ... */
}

// Arrays
if (Array.isArray(value)) {
  /* ... */
}

// Objects
if (typeof value === "object" && value !== null) {
  /* ... */
}

// Functions
if (typeof value === "function") {
  /* ... */
}
```

---

## JSDoc Documentation

### Function Signatures

Document function parameters and return types with JSDoc:

```javascript
/**
 * Escape special HTML characters to prevent XSS attacks.
 * Use this when rendering user-provided content with dangerouslyUseHTMLString.
 *
 * @param {*} value - The value to escape (will be converted to string)
 * @returns {string} - HTML-safe string
 */
export const escapeHtml = value =>
  String(value).replace(
    /[&<>"']/g,
    char =>
      ({
        '"': "&quot;",
        "&": "&amp;",
        "'": "&#x27;",
        "<": "&lt;",
        ">": "&gt;",
      })[char]
  );
```

**Real example from escapeHtml.js:**

```javascript
/**
 * File: ui/app/utils/escapeHtml.js
 * Description: Escape special HTML characters to prevent XSS attacks.
 *
 * Author: iBUHUB
 *
 * @param {*} value - The value to escape (will be converted to string)
 * @returns {string} - HTML-safe string
 */
export const escapeHtml = value => String(value).replace(/* ... */);
```

### Complex Types

For objects with specific structure:

```javascript
/**
 * Represents a user session.
 * @typedef {Object} Session
 * @property {string} id - Session ID
 * @property {string} email - User email
 * @property {number} createdAt - Unix timestamp
 * @property {boolean} isActive - Whether session is active
 */

/**
 * Fetch user sessions from API.
 * @returns {Promise<Session[]>} Array of sessions
 */
export const fetchSessions = async () => {
  const res = await fetch("/api/sessions");
  return res.json();
};
```

---

## Common Patterns

### Null Checks

Always check for null/undefined before accessing properties:

```javascript
// ❌ WRONG: Can crash if user is null
const email = user.email;

// ✅ CORRECT: Safe access
const email = user?.email; // Optional chaining (ES2020)
const email = user && user.email; // Traditional approach

// ✅ CORRECT: Null check
if (user !== null && user !== undefined) {
  const email = user.email;
}
```

### Default Values

Provide defaults for optional data:

```javascript
// With nullish coalescing (ES2020)
const name = user.name ?? "Unknown";

// With logical OR (falsy values)
const name = user.name || "Unknown";

// In function parameters
const greet = (name = "Guest") => {
  console.log(`Hello, ${name}`);
};
```

### Type Coercion

Be explicit about type conversions:

```javascript
// String to number
const num = Number(str);
const num = parseInt(str, 10);
const num = parseFloat(str);

// Number to string
const str = String(num);
const str = num.toString();

// To boolean
const bool = Boolean(value);
const bool = !!value;

// Array from iterable
const arr = Array.from(iterable);
```

---

## Forbidden Patterns

### 1. Relying on Implicit Type Coercion

```javascript
// ❌ WRONG: Implicit coercion
if (value) {
  /* ... */
} // What if value is 0 or ''?
const result = "5" + 3; // '53' (string concatenation)

// ✅ CORRECT: Explicit checks
if (value !== null && value !== undefined) {
  /* ... */
}
if (typeof value === "number" && value > 0) {
  /* ... */
}
const result = 5 + 3; // 8 (number addition)
```

### 2. Using `any` Mentality

```javascript
// ❌ WRONG: No validation, assumes correct type
const handleData = data => {
  return data.users.map(u => u.name);
};

// ✅ CORRECT: Validate structure
const handleData = data => {
  if (!data || !Array.isArray(data.users)) {
    throw new Error("Invalid data structure");
  }
  return data.users.map(u => {
    if (typeof u.name !== "string") {
      throw new Error("Invalid user object");
    }
    return u.name;
  });
};
```

### 3. Trusting External Data

```javascript
// ❌ WRONG: Trusting API response without validation
const user = await fetch("/api/user").then(r => r.json());
setEmail(user.email); // Could be undefined or wrong type

// ✅ CORRECT: Validate API response
const user = await fetch("/api/user").then(r => r.json());
if (user && typeof user.email === "string") {
  setEmail(user.email);
} else {
  console.error("Invalid user data:", user);
}
```

### 4. Ignoring ESLint Warnings

```javascript
// ❌ WRONG: Ignoring unused variable warning
const unused = "something"; // ESLint: 'unused' is defined but never used

// ✅ CORRECT: Remove unused code or use it
// Either remove the variable or actually use it
```

---

## ESLint Type Safety

### Rules That Help

ESLint catches many type-related errors:

```javascript
// no-unused-vars: Catches undefined variables
const unused = "value"; // Error

// no-undef: Catches use of undefined variables
console.log(undefinedVar); // Error

// no-redeclare: Catches variable redeclaration
let x = 1;
let x = 2; // Error

// no-shadow: Catches variable shadowing
const x = 1;
function foo() {
  const x = 2; // Warning: shadows outer x
}
```

### Configuration

From `.eslintrc.js`:

```javascript
rules: {
    'no-unused-vars': [
        'error',
        {
            vars: 'all',
            args: 'after-used',
            ignoreRestSiblings: true,
        },
    ],
    'no-var': 'error', // Prefer const/let
    'prefer-const': 'error', // Prefer const when possible
}
```

---

## Best Practices

### 1. Document Function Signatures

```javascript
/**
 * Calculate total price with tax.
 * @param {number} basePrice - Base price without tax
 * @param {number} taxRate - Tax rate as decimal (0.1 = 10%)
 * @returns {number} Total price including tax
 */
const calculateTotal = (basePrice, taxRate) => {
  return basePrice * (1 + taxRate);
};
```

### 2. Validate Props Thoroughly

```vue
<script setup>
const props = defineProps({
  userId: {
    required: true,
    type: [String, Number], // Allow string or number
  },
  callback: {
    required: false,
    type: Function,
    default: () => {}, // Safe default
  },
  options: {
    required: false,
    type: Object,
    default: () => ({ enabled: false }), // Structured default
  },
});
</script>
```

### 3. Use Defensive Programming

```javascript
const processData = data => {
  // Guard clauses
  if (!data) {
    return null;
  }
  if (!Array.isArray(data.items)) {
    console.warn("Invalid data structure");
    return null;
  }

  // Safe processing
  return data.items.filter(item => item !== null && item !== undefined).map(item => item.value);
};
```

### 4. Provide Default Values

```javascript
// Function parameters with defaults
const fetchData = async (url = "/api/data", options = {}) => {
  const defaultOptions = {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    ...options, // Merge with defaults
  };
  return fetch(url, defaultOptions);
};
```

### 5. Type Narrowing

```javascript
const handleValue = value => {
  // Type narrowing with typeof
  if (typeof value === "string") {
    return value.toUpperCase(); // TypeScript would know it's string
  }
  if (typeof value === "number") {
    return value * 2; // TypeScript would know it's number
  }

  // Fallback
  return String(value);
};
```

---

## Runtime Type Checking Utilities

### Type Check Helpers

Create utility functions for common checks:

```javascript
// ui/app/utils/typeChecks.js

export const isString = value => typeof value === "string";
export const isNumber = value => typeof value === "number" && !isNaN(value);
export const isBoolean = value => typeof value === "boolean";
export const isArray = value => Array.isArray(value);
export const isObject = value => typeof value === "object" && value !== null && !isArray(value);
export const isFunction = value => typeof value === "function";

// Usage
import { isString, isNumber } from "../utils/typeChecks";

if (isString(value)) {
  // ...
}
```

---

## Summary

| Scenario            | Approach                           | Example                              |
| ------------------- | ---------------------------------- | ------------------------------------ |
| Component props     | `defineProps()` with type/required | `{ type: String, required: true }`   |
| Function parameters | JSDoc + default values             | `function fn(param = 'default')`     |
| API responses       | Runtime validation                 | `if (typeof data.id === 'string')`   |
| User input          | Validation + sanitization          | `escapeHtml(userInput)`              |
| External libraries  | Read documentation                 | Follow library's expected types      |
| Configuration       | JSON structure + documentation     | `models.json` with documented schema |

**Remember:** In JavaScript, there is no compile-time type checking. All type safety is achieved through:

1. Runtime validation
2. Careful coding
3. Thorough testing
4. Clear documentation
