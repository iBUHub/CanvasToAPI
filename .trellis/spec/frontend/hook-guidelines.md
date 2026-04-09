# Hook Guidelines

> How hooks (Composables) are used in this project.

---

## Overview

In Vue 3, "hooks" are called **Composables** - functions that encapsulate and reuse stateful logic using the Composition API. This project uses Composables to share reactive state and behavior across components.

**Key Principles:**

- Composables are JavaScript modules, not TypeScript
- Use `use` prefix for naming (e.g., `useTheme`, `useFetch`)
- Export named functions, not default exports
- Use module-level reactive state for singletons
- Return reactive values and methods

---

## Custom Hook Patterns

### Basic Composable Structure

```javascript
/**
 * File: ui/app/utils/useFeature.js
 * Description: Composable for managing feature state
 *
 * Author: iBUHUB
 */

import { ref, computed } from "vue";

// Module-level state (singleton pattern)
const featureState = ref("initial");

export function useFeature() {
  // Local logic
  const setFeature = newValue => {
    featureState.value = newValue;
  };

  const resetFeature = () => {
    featureState.value = "initial";
  };

  // Return reactive state and methods
  return {
    featureState,
    resetFeature,
    setFeature,
  };
}
```

### Singleton Pattern

For global state shared across components, define reactive state at module level:

```javascript
// ui/app/utils/useTheme.js
import { ref, watchEffect } from "vue";

// ✅ Module-level state - shared across all components
const theme = ref(localStorage.getItem("theme") || "auto");
const systemDarkMode = ref(window.matchMedia("(prefers-color-scheme: dark)").matches);

// Module-level watcher - runs once
watchEffect(() => {
  const currentTheme = theme.value;
  // Apply theme to DOM
  document.documentElement.setAttribute("data-theme", currentTheme);
  localStorage.setItem("theme", currentTheme);
});

export function useTheme() {
  const setTheme = newTheme => {
    theme.value = newTheme;
  };

  return {
    setTheme,
    theme,
  };
}
```

**Why Singleton?**

- Prevents duplicate watchers when multiple components call `useTheme()`
- Ensures single source of truth for global state
- More efficient than re-creating state in each component

### Non-Singleton Pattern

For component-specific state, create state inside the function:

```javascript
// ui/app/utils/useForm.js
import { ref, computed } from "vue";

export function useForm(initialValues) {
  // ✅ Created per component instance
  const formData = ref(initialValues);
  const errors = ref({});

  const isValid = computed(() => {
    return Object.keys(errors.value).length === 0;
  });

  const validate = () => {
    // Validation logic
  };

  return {
    errors,
    formData,
    isValid,
    validate,
  };
}
```

---

## Data Fetching

### Basic Fetch Pattern

```javascript
// ui/app/utils/useFetchData.js
import { ref, onMounted } from "vue";

export function useFetchData(url) {
  const data = ref(null);
  const error = ref(null);
  const loading = ref(false);

  const fetchData = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      data.value = await response.json();
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    fetchData();
  });

  return {
    data,
    error,
    fetchData, // Allow manual refetch
    loading,
  };
}
```

### Usage in Components

```vue
<script setup>
import { useFetchData } from "../utils/useFetchData";

const { data, loading, error } = useFetchData("/api/status");
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Error: {{ error }}</div>
  <div v-else>{{ data }}</div>
</template>
```

---

## Naming Conventions

### Function Names

- **MUST** use `use` prefix: `useTheme`, `useAuth`, `useFetch`
- Use camelCase: `useLocalStorage`, not `use-local-storage`
- Be descriptive: `useUserStatus` not `useStatus`

### File Names

- Match function name: `useTheme.js` exports `useTheme()`
- Place in `ui/app/utils/` directory

### Return Values

Return an object with descriptive keys:

```javascript
// ✅ GOOD: Descriptive return values
export function useTheme() {
  return {
    setTheme,
    theme,
  };
}

// Usage
const { theme, setTheme } = useTheme();

// ❌ BAD: Unclear return value
export function useTheme() {
  return theme; // Just a ref
}
```

---

## Real Examples

### Example 1: useTheme (Global State Singleton)

```javascript
// ui/app/utils/useTheme.js
import { ref, watchEffect } from "vue";

// Module-level singleton state
const theme = ref(localStorage.getItem("theme") || "auto");
const systemDarkMode = ref(window.matchMedia("(prefers-color-scheme: dark)").matches);

// Global watcher (runs once, not per-component)
watchEffect(() => {
  const currentTheme = theme.value;
  const htmlEl = document.documentElement;

  let isDark = false;
  if (currentTheme === "auto") {
    isDark = systemDarkMode.value;
  } else {
    isDark = currentTheme === "dark";
  }

  htmlEl.setAttribute("data-theme", isDark ? "dark" : "light");
  if (isDark) {
    htmlEl.classList.add("dark");
  } else {
    htmlEl.classList.remove("dark");
  }

  localStorage.setItem("theme", currentTheme);
});

export function useTheme() {
  const setTheme = newTheme => {
    theme.value = newTheme;
  };

  return {
    setTheme,
    theme,
  };
}
```

**Usage:**

```vue
<script setup>
import { useTheme } from "../utils/useTheme";

const { theme, setTheme } = useTheme();
</script>

<template>
  <select :value="theme" @change="setTheme($event.target.value)">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
    <option value="auto">Auto</option>
  </select>
</template>
```

### Example 2: i18n (Singleton with Listeners)

```javascript
// ui/app/utils/i18n.js
const listeners = [];
const state = {
  lang: "en",
  version: 0, // Reactive version counter
};

const onChange = callback => {
  if (typeof callback === "function") {
    listeners.push(callback);
  }
};

const setLang = async lang => {
  state.lang = lang;
  state.version++; // Trigger reactivity

  localStorage.setItem("lang", lang);
  await loadLocale(lang);

  // Notify all listeners
  listeners.forEach(cb => {
    try {
      cb(lang);
    } catch (err) {
      console.warn("[i18n] Listener error:", err);
    }
  });
};

const I18n = {
  onChange,
  setLang,
  state,
  t,
};

export default I18n;
```

**Usage in Components:**

```vue
<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import I18n from "../utils/i18n";

const currentLang = ref(I18n.state.lang);
const langVersion = ref(I18n.state.version);

const handleLangChange = lang => {
  currentLang.value = lang;
  langVersion.value = I18n.state.version;
};

onMounted(() => {
  I18n.onChange(handleLangChange);
});

const t = key => {
  langVersion.value; // Access to track changes
  return I18n.t(key);
};
</script>
```

---

## When to Create a Composable

### Create a Composable When:

1. **Multiple components need the same stateful logic**
   - Example: Theme management used across all pages
   - Solution: `useTheme()` with singleton state

2. **Logic involves reactive state that needs sharing**
   - Example: User authentication status
   - Solution: `useAuth()` with global user state

3. **You want to encapsulate complex behavior**
   - Example: Form validation with multiple rules
   - Solution: `useFormValidation()` with reusable logic

4. **You need to fetch and cache data**
   - Example: Fetching user profile
   - Solution: `useFetch()` with loading/error states

### Don't Create a Composable When:

1. **Logic is only used in one component**
   - Keep it in the component's `<script setup>`

2. **It's a pure utility function with no state**
   - Create a regular utility in `utils/` (e.g., `escapeHtml.js`)

3. **The logic is simple (just one ref or computed)**
   - Keep it local to the component

---

## Common Mistakes

### 1. Creating State Inside Function for Global State

```javascript
// ❌ WRONG: State recreated for each component
export function useTheme() {
  const theme = ref("auto"); // New instance each time!
  return { theme };
}

// ✅ CORRECT: Module-level singleton
const theme = ref("auto");

export function useTheme() {
  return { theme };
}
```

### 2. Not Using `use` Prefix

```javascript
// ❌ WRONG: Doesn't follow Vue convention
export function theme() {
  // ...
}

// ✅ CORRECT: Follows Vue convention
export function useTheme() {
  // ...
}
```

### 3. Default Export Instead of Named Export

```javascript
// ❌ WRONG: Default export
export default function useTheme() {
  // ...
}

// Usage requires renaming
import myTheme from "./useTheme";

// ✅ CORRECT: Named export
export function useTheme() {
  // ...
}

// Usage is explicit
import { useTheme } from "./useTheme";
```

### 4. Forgetting to Return Reactive Values

```javascript
// ❌ WRONG: Returns non-reactive value
export function useTheme() {
  const theme = ref("auto");
  return theme.value; // Returns string, not ref
}

// ✅ CORRECT: Returns reactive ref
export function useTheme() {
  const theme = ref("auto");
  return { theme }; // Returns ref
}
```

### 5. Using `this` in Composables

```javascript
// ❌ WRONG: `this` is undefined in <script setup>
export function useTheme() {
  this.theme = "dark"; // Error!
}

// ✅ CORRECT: Use regular variables
export function useTheme() {
  const theme = ref("dark");
  return { theme };
}
```

---

## Integration with Components

### Calling Composables

```vue
<script setup>
// Import
import { useTheme } from "../utils/useTheme";
import I18n from "../utils/i18n";

// Call in <script setup> (not in nested functions)
const { theme, setTheme } = useTheme();

// Use reactive values in template
const message = computed(() => {
  return theme.value === "dark" ? "Dark mode" : "Light mode";
});
</script>
```

### Using in Lifecycle Hooks

```vue
<script setup>
import { onMounted, onUnmounted } from "vue";
import I18n from "../utils/i18n";

onMounted(() => {
  I18n.onChange(handleLangChange);
});

onUnmounted(() => {
  // Cleanup if needed
});
</script>
```

---

## Testing Composables

Composables are pure JavaScript functions and easy to test:

```javascript
// Example test (using Vitest or Jest)
import { useTheme } from "./useTheme";

test("useTheme returns reactive theme", () => {
  const { theme, setTheme } = useTheme();

  expect(theme.value).toBe("auto");

  setTheme("dark");
  expect(theme.value).toBe("dark");
});
```
