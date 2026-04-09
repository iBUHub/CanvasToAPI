# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

This project enforces code quality through automated tooling and consistent patterns. All code must pass linting, formatting, and follow established conventions before being committed.

**Quality Tools:**

- **ESLint** - JavaScript and Vue code linting
- **Stylelint** - CSS/LESS linting with alphabetical property ordering
- **Prettier** - Automatic code formatting
- **Husky** - Git hooks for pre-commit checks
- **lint-staged** - Run linters on staged files only

**Key Principles:**

- All code must pass `npm run lint` with no errors
- All code must be formatted with Prettier
- Follow the established patterns in the codebase
- Write self-documenting code with clear names

---

## Forbidden Patterns

### 1. Using `var` for Variable Declarations

```javascript
// ❌ FORBIDDEN: var is outdated and has function scope
var count = 0;

// ✅ REQUIRED: Use const for constants, let for variables
const PI = 3.14;
let count = 0;
```

**Why:** `var` has function scope instead of block scope, leading to bugs. ESLint rule: `no-var: "error"`

---

### 2. Unused Variables

```javascript
// ❌ FORBIDDEN: Unused variables clutter the code
const unused = "something";
const data = fetchData();

// ✅ REQUIRED: Remove or use the variable
const data = fetchData();
processData(data);
```

**Why:** Dead code indicates mistakes or incomplete refactoring. ESLint rule: `no-unused-vars: "error"`

---

### 3. Console Statements (Except for Intentional Logging)

```javascript
// ❌ AVOID: Console statements in production code
console.log("Debug info", data);

// ✅ ACCEPTABLE: Intentional error logging
console.error("Failed to load config", err);

// ✅ BETTER: Use project's logging system (backend)
logger.error("Failed to load config", err);
```

**Note:** Console statements are allowed in this project (ESLint: `no-console: "off"`), but use judiciously.

---

### 4. Magic Numbers and Strings

```javascript
// ❌ FORBIDDEN: Magic numbers without explanation
setTimeout(callback, 60000);

// ✅ REQUIRED: Use named constants
const ONE_MINUTE_MS = 60000;
setTimeout(callback, ONE_MINUTE_MS);

// ❌ FORBIDDEN: Magic strings
if (status === "active") {
  /* ... */
}

// ✅ REQUIRED: Use constants
const STATUS_ACTIVE = "active";
if (status === STATUS_ACTIVE) {
  /* ... */
}
```

**Why:** Named constants make code self-documenting and easier to maintain.

---

### 5. Synchronous Operations in Render Path

```javascript
// ❌ FORBIDDEN: Blocking the main thread during render
const data = JSON.parse(largeJsonString); // In template render

// ✅ REQUIRED: Do heavy work in lifecycle hooks
onMounted(() => {
  const data = JSON.parse(largeJsonString);
  processedData.value = data;
});
```

---

### 6. Direct DOM Manipulation (Except in Special Cases)

```javascript
// ❌ FORBIDDEN: Direct DOM manipulation (Vue should handle this)
document.getElementById("myElement").textContent = "text";

// ✅ REQUIRED: Use Vue's reactive system
const text = ref("text");
// In template: <div>{{ text }}</div>

// ✅ ACCEPTABLE: For integrations (e.g., Element Plus, D3)
onMounted(() => {
  const element = document.getElementById("chart");
  chart.init(element);
});
```

---

### 7. Inline Styles Instead of CSS Classes

```vue
<!-- ❌ FORBIDDEN: Inline styles -->
<div style="background: #fff; color: #333;">

<!-- ✅ REQUIRED: Use CSS classes with LESS variables -->
<div class="card">
</div>

<style lang="less" scoped>
@import "../styles/variables.less";

.card {
  background: @background-white;
  color: @text-primary;
}
</style>
```

---

### 8. Hardcoded Colors and Spacing

```vue
<!-- ❌ FORBIDDEN: Hardcoded values -->
<style lang="less" scoped>
.box {
  background: #ffffff;
  padding: 15px;
}
</style>

<!-- ✅ REQUIRED: Use LESS variables -->
<style lang="less" scoped>
@import "../styles/variables.less";

.box {
  background: @background-white;
  padding: @spacing-md;
}
</style>
```

**Why:** Using variables ensures consistency and makes theme changes easier.

---

### 9. Unsorted Object Keys

```javascript
// ❌ FORBIDDEN: Unsorted object keys
const config = {
  port: 7861,
  name: "app",
  debug: true,
};

// ✅ REQUIRED: Alphabetically sorted keys (enforced by ESLint)
const config = {
  debug: true,
  name: "app",
  port: 7861,
};
```

**Why:** Sorted keys make it easier to find properties and reduce merge conflicts. ESLint rule: `sort-keys-fix/sort-keys-fix: "error"`

---

### 10. Unsorted CSS Properties

```less
// ❌ FORBIDDEN: Unsorted CSS properties
.card {
  color: @text-primary;
  background: @background-white;
  padding: @spacing-md;
  border: 1px solid @border-color;
}

// ✅ REQUIRED: Alphabetically sorted properties (enforced by Stylelint)
.card {
  background: @background-white;
  border: 1px solid @border-color;
  color: @text-primary;
  padding: @spacing-md;
}
```

**Why:** Alphabetical ordering makes it easier to find properties and reduces duplication. Stylelint rule: `order/properties-alphabetical-order: true`

---

## Required Patterns

### 1. Component File Structure

Every Vue component MUST follow this structure:

```vue
<!--
 * File: ui/app/components/ComponentName.vue
 * Description: Brief description of component purpose
 *
 * Author: iBUHUB
-->

<template>
  <!-- Template -->
</template>

<script setup>
// Imports
// Props
// State
// Computed
// Methods
// Lifecycle
</script>

<style lang="less" scoped>
@import "../styles/variables.less";

/* Styles */
</style>
```

---

### 2. Props Validation

All props MUST have runtime validation:

```vue
<script setup>
// ✅ REQUIRED: Runtime validation
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
});
</script>
```

---

### 3. File Header Comments

Every source file MUST have a file header comment:

```javascript
/**
 * File: ui/app/utils/useTheme.js
 * Description: Composable for managing application theme state
 *
 * Author: iBUHUB
 */
```

---

### 4. Named Exports for Composables

Composables MUST use named exports:

```javascript
// ✅ REQUIRED: Named export
export function useTheme() {
  // ...
}

// ❌ FORBIDDEN: Default export
export default function useTheme() {
  // ...
}
```

---

### 5. Arrow Functions for Callbacks

Use arrow functions for callbacks:

```javascript
// ✅ REQUIRED: Arrow functions
const items = data.map(item => item.value);
setTimeout(() => callback(), 1000);
btn.addEventListener("click", () => handleClick());

// ❌ FORBIDDEN: Function expressions (except when needed)
const items = data.map(function (item) {
  return item.value;
});
```

**Why:** Arrow functions preserve `this` context and are more concise. ESLint rule: `prefer-arrow-callback: "error"`

---

### 6. Object Shorthand

Use object shorthand notation:

```javascript
// ✅ REQUIRED: Shorthand
const name = "John";
const age = 30;
const user = { name, age };

// ❌ FORBIDDEN: Redundant
const user = { name: name, age: age };
```

ESLint rule: `object-shorthand: "error"`

---

### 7. `const` Over `let` When Possible

```javascript
// ✅ REQUIRED: Use const when value doesn't change
const PI = 3.14;
const config = { port: 7861 };

// ✅ ACCEPTABLE: Use let only when reassigning
let count = 0;
count++;

// ❌ FORBIDDEN: Use let when const would work
let config = { port: 7861 }; // Never reassigned
```

ESLint rule: `prefer-const: "error"`

---

### 8. LESS Variable Imports

All component styles MUST import variables:

```vue
<style lang="less" scoped>
@import "../styles/variables.less";

/* Use variables, not hardcoded values */
</style>
```

---

### 9. Alphabetical Property Ordering in CSS

All CSS/LESS files MUST have alphabetically ordered properties:

```less
// ✅ REQUIRED: Alphabetical order
.card {
  background: @background-white;
  border: 1px solid @border-color;
  color: @text-primary;
  display: block;
  padding: @spacing-md;
}
```

Stylelint rule: `order/properties-alphabetical-order: true`

---

## Testing Requirements

### Current State

This project has minimal frontend testing. Testing is done manually during development.

### Recommended Testing Approach

When tests are added, follow these patterns:

**1. Unit Tests for Utilities**

```javascript
// Test pure functions
import { escapeHtml } from "./escapeHtml";

test("escapeHtml escapes HTML characters", () => {
  expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  expect(escapeHtml("a & b")).toBe("a &amp; b");
});
```

**2. Component Tests for Complex Components**

```javascript
import { mount } from "@vue/test-utils";
import EnvVarTooltip from "./EnvVarTooltip.vue";

test("renders tooltip with correct env var", () => {
  const wrapper = mount(EnvVarTooltip, {
    props: {
      docSection: "app-config",
      envVar: "PORT",
    },
  });
  expect(wrapper.text()).toContain("PORT");
});
```

---

## Code Review Checklist

When reviewing frontend code, check:

### Code Quality

- [ ] No ESLint errors (`npm run lint`)
- [ ] No Stylelint errors (`npm run lint:css`)
- [ ] Code is formatted with Prettier
- [ ] No `var` declarations (use `const`/`let`)
- [ ] No unused variables or imports
- [ ] Object keys are alphabetically sorted
- [ ] CSS properties are alphabetically ordered

### Component Structure

- [ ] File header comment present
- [ ] Component follows standard structure (template, script, style)
- [ ] Props have runtime validation
- [ ] Uses `<script setup>` (not Options API)
- [ ] Styles are scoped (or global with good reason)
- [ ] LESS variables imported

### Best Practices

- [ ] Uses Element Plus components instead of custom UI
- [ ] No hardcoded colors or spacing (use LESS variables)
- [ ] No inline styles (use CSS classes)
- [ ] Uses Composables for shared stateful logic
- [ ] Proper error handling (try/catch in async functions)
- [ ] Defensive coding (null checks, validation)

### Performance

- [ ] No blocking operations in render path
- [ ] Uses `onMounted` for data fetching
- [ ] Uses `computed` for derived state
- [ ] No unnecessary re-renders

### Accessibility

- [ ] Uses semantic HTML elements
- [ ] Provides labels for form inputs
- [ ] Provides titles for icon-only buttons
- [ ] Keyboard navigation works (Element Plus handles most)

---

## Linting Commands

### Check for Issues

```bash
# Check all files (JS + CSS)
npm run lint

# Check only JavaScript
npm run lint:js

# Check only CSS/LESS
npm run lint:css
```

### Auto-Fix Issues

```bash
# Auto-fix all issues
npm run lint:fix

# Auto-fix JavaScript only
npm run lint:js:fix

# Auto-fix CSS only
npm run lint:css:fix
```

### Format Code

```bash
# Format all files with Prettier
npm run format

# Check formatting without changes
npm run format:check
```

---

## Pre-Commit Hooks

### Automatic Checks

Husky and lint-staged run automatically before each commit:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "ui/**/*.vue": ["eslint --fix", "prettier --write"],
    "ui/**/*.{css,less}": ["stylelint --fix", "prettier --write"]
  }
}
```

**What this means:**

- ESLint fixes JavaScript/Vue issues
- Stylelint fixes CSS/LESS issues
- Prettier formats all code
- Only staged files are checked (faster)

---

## Configuration Files

### ESLint (`.eslintrc.js`)

Key rules:

- `no-var: "error"` - No `var` declarations
- `prefer-const: "error"` - Prefer `const` when possible
- `no-unused-vars: "error"` - No unused variables
- `sort-keys-fix/sort-keys-fix: "error"` - Sort object keys
- `prefer-arrow-callback: "error"` - Use arrow functions

### Stylelint (`.stylelintrc.js`)

Key rules:

- `order/properties-alphabetical-order: true` - Sort CSS properties
- `color-hex-length: "short"` - Use short hex colors (#fff not #ffffff)

### Prettier (`.prettierrc.js`)

Key settings:

- `tabWidth: 4` - 4 spaces indentation
- `singleQuote: true` (frontend JS) - Single quotes in frontend
- `singleQuote: false` (backend JS) - Double quotes in backend
- `semi: true` - Use semicolons
- `printWidth: 120` - Line width limit

---

## Common Quality Issues

### 1. ESLint Error: Unused Variable

```javascript
// Error: 'unused' is defined but never used
const unused = fetchData();

// Fix: Remove or use the variable
const data = fetchData();
processData(data);
```

### 2. Stylelint Error: Property Order

```less
/* Error: Expected "color" to come before "background" */
.card {
  color: @text-primary;
  background: @background-white;
}

/* Fix: Reorder alphabetically */
.card {
  background: @background-white;
  color: @text-primary;
}
```

### 3. Prettier: Formatting

```javascript
// Prettier will auto-fix formatting
const config = { name: "app", port: 7861 };

// After Prettier
const config = {
  name: "app",
  port: 7861,
};
```

---

## Best Practices Summary

1. **Run `npm run lint` before committing** - Fix all errors
2. **Run `npm run format` before committing** - Format code
3. **Use LESS variables** - No hardcoded colors/spacing
4. **Follow the patterns** - Match existing code style
5. **Keep it simple** - No over-engineering
6. **Document complex logic** - Use comments and JSDoc
7. **Validate all inputs** - Runtime checks for props and API data
8. **Handle errors** - Use try/catch in async functions
9. **Test manually** - Verify UI in browser before committing
10. **Review your own code** - Check the checklist above
