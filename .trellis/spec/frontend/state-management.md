# State Management

> How state is managed in this project.

---

## Overview

This project does **NOT** use Pinia or Vuex for state management. Instead, it relies on Vue 3's Composition API (ref, reactive, computed) and custom Composables for state management.

**Key Principles:**

- Use Vue Composition API for all state management
- Global state: Module-level reactive refs in Composables (singleton pattern)
- Local state: Component-level ref/reactive
- Server state: Fetch in onMounted, store in reactive refs
- No external state management libraries (Pinia, Vuex)

---

## State Categories

### 1. Local Component State

State that only exists within a single component and doesn't need to be shared.

**Use `ref` for primitives:**

```vue
<script setup>
import { ref } from "vue";

// Local primitive state
const count = ref(0);
const message = ref("");
const isOpen = ref(false);
</script>
```

**Use `reactive` for objects (optional):**

```vue
<script setup>
import { reactive } from "vue";

// Local object state (can also use ref)
const form = reactive({
  username: "",
  password: "",
});

// OR with ref (both work)
const form = ref({
  username: "",
  password: "",
});
</script>
```

**Examples in codebase:**

```vue
<!-- ui/app/pages/LoginPage.vue -->
<script setup>
import { ref } from "vue";

const requireUsername = ref(false);
const requirePassword = ref(false);
const configLoaded = ref(false);
</script>
```

---

### 2. Global State

State shared across multiple components, managed in Composables using module-level reactive state (singleton pattern).

**Pattern: Module-level reactive state**

```javascript
// ui/app/utils/useTheme.js
import { ref } from "vue";

// ✅ Module-level state - singleton, shared across all components
const theme = ref(localStorage.getItem("theme") || "auto");
const systemDarkMode = ref(window.matchMedia("(prefers-color-scheme: dark)").matches);

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

**Why module-level?**

- State is created once when module loads
- All components get the same instance
- No need for Pinia/Vuex
- Simple and efficient

**Examples in codebase:**

```javascript
// ui/app/utils/i18n.js
// Global i18n state
const state = {
  lang: currentLang,
  version: 0,
};

const listeners = [];

export default {
  state,
  onChange(callback) {
    listeners.push(callback);
  },
  setLang(lang) {
    state.lang = lang;
    state.version++;
    // Notify listeners
  },
};
```

---

### 3. Server State

Data fetched from the backend API. Stored in component refs after fetching.

**Pattern: Fetch in onMounted**

```vue
<script setup>
import { ref, onMounted } from "vue";

const serverData = ref(null);
const loading = ref(false);
const error = ref(null);

onMounted(async () => {
  loading.value = true;
  try {
    const res = await fetch("/api/data");
    if (res.ok) {
      serverData.value = await res.json();
    } else {
      error.value = "Failed to load";
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>
```

**Real example from LoginPage.vue:**

```vue
<script setup>
import { ref, onMounted } from "vue";

const requireUsername = ref(false);
const requirePassword = ref(false);
const configLoaded = ref(false);

onMounted(async () => {
  try {
    const res = await fetch("/api/auth/config");
    if (res.ok) {
      const data = await res.json();
      requireUsername.value = data.requireUsername;
      requirePassword.value = data.requirePassword;
    }
  } catch (err) {
    console.error("Failed to load auth config", err);
  } finally {
    configLoaded.value = true;
  }
});
</script>
```

---

### 4. URL State

State derived from the URL (route parameters, query strings). Use Vue Router.

**Pattern: Access route in components**

```vue
<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

// Access route params
const id = computed(() => route.params.id);

// Access query params
const errorText = computed(() => {
  const code = String(route.query.error || "");
  if (code === "1") {
    return "Invalid credentials";
  }
  return "";
});
</script>
```

**Real example from LoginPage.vue:**

```vue
<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const errorText = computed(() => {
  const code = String(route.query.error || "");
  if (code === "1") {
    return requirePassword.value ? t("loginErrorInvalidCredentials") : t("loginErrorInvalidKey");
  }
  if (code === "2") {
    return t("loginErrorRateLimit");
  }
  return "";
});
</script>
```

---

## When to Use Global State

### Promote to Global State When:

1. **Multiple unrelated components need the same state**
   - Example: User authentication status
   - Solution: Create `useAuth()` Composable with singleton state

2. **State persists across route changes**
   - Example: Theme preference (light/dark/auto)
   - Solution: Create `useTheme()` with localStorage persistence

3. **State affects the entire application**
   - Example: Language/locale preference
   - Solution: Create `i18n.js` with global state

4. **State needs to be accessed deeply in component tree**
   - Avoids prop drilling (passing props through many levels)
   - Example: `useTheme()` used in pages and components

### Keep Local When:

1. **State only used in one component**
   - Example: Form input values before submission
   - Keep in component's `<script setup>`

2. **State is temporary**
   - Example: Loading spinner state during a single operation
   - Use local `const loading = ref(false)`

3. **State is derived from props**
   - Example: Filtered list based on a prop
   - Use `computed(() => props.items.filter(...))`

---

## Server State Management

### Basic Fetching Pattern

```vue
<script setup>
import { ref, onMounted } from "vue";

const data = ref(null);
const loading = ref(false);
const error = ref(null);

const fetchData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const res = await fetch("/api/endpoint");
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    data.value = await res.json();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Error: {{ error }}</div>
  <div v-else-if="data">
    <!-- Display data -->
  </div>
</template>
```

### Server State in Global Composable

For server data shared across components:

```javascript
// ui/app/utils/useUserStatus.js
import { ref, onMounted } from "vue";

const userStatus = ref(null);
const loading = ref(true);

let initialized = false;

export function useUserStatus() {
  if (!initialized) {
    initialized = true;

    onMounted(async () => {
      try {
        const res = await fetch("/api/status");
        if (res.ok) {
          userStatus.value = await res.json();
        }
      } catch (err) {
        console.error("Failed to fetch user status:", err);
      } finally {
        loading.value = false;
      }
    });
  }

  return {
    loading,
    userStatus,
  };
}
```

---

## Derived State

Use `computed` for state derived from other reactive values:

```vue
<script setup>
import { ref, computed } from "vue";

// Base state
const items = ref([1, 2, 3, 4, 5]);
const filter = ref("all");

// Derived state
const filteredItems = computed(() => {
  if (filter.value === "even") {
    return items.value.filter(n => n % 2 === 0);
  }
  if (filter.value === "odd") {
    return items.value.filter(n => n % 2 !== 0);
  }
  return items.value;
});

const itemCount = computed(() => items.value.length);
const filteredCount = computed(() => filteredItems.value.length);
</script>
```

**Real example from LoginPage.vue:**

```vue
<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const requirePassword = ref(false);

// Derived from route query + component state
const errorText = computed(() => {
  const code = String(route.query.error || "");
  if (code === "1") {
    return requirePassword.value ? t("loginErrorInvalidCredentials") : t("loginErrorInvalidKey");
  }
  if (code === "2") {
    return t("loginErrorRateLimit");
  }
  return "";
});
</script>
```

---

## Reactivity Patterns

### Watching for Changes

Use `watchEffect` for side effects:

```vue
<script setup>
import { ref, watchEffect } from "vue";

const theme = ref("auto");

// React to theme changes
watchEffect(() => {
  document.documentElement.setAttribute("data-theme", theme.value);
  localStorage.setItem("theme", theme.value);
});
</script>
```

**Real example from useTheme.js:**

```javascript
import { ref, watchEffect } from "vue";

const theme = ref(localStorage.getItem("theme") || "auto");

// Global watcher (runs once at module level)
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
  localStorage.setItem("theme", currentTheme);
});
```

### Computed vs Methods

```vue
<script setup>
// ✅ Use computed for derived state (cached, reactive)
const fullName = computed(() => {
  return firstName.value + " " + lastName.value;
});

// ✅ Use methods for actions (events, side effects)
const updateName = (newFirst, newLast) => {
  firstName.value = newFirst;
  lastName.value = newLast;
};
</script>
```

---

## Common Mistakes

### 1. Using Pinia/Vuex

```javascript
// ❌ WRONG: Don't use Pinia or Vuex
import { defineStore } from "pinia";

export const useThemeStore = defineStore("theme", {
  state: () => ({ theme: "auto" }),
});

// ✅ CORRECT: Use Composable with module-level state
import { ref } from "vue";

const theme = ref("auto");

export function useTheme() {
  return { theme };
}
```

### 2. Creating State in Composable Function (Not Singleton)

```javascript
// ❌ WRONG: State recreated for each component
export function useTheme() {
  const theme = ref("auto"); // New instance each call
  return { theme };
}

// ✅ CORRECT: Module-level singleton
const theme = ref("auto");

export function useTheme() {
  return { theme };
}
```

### 3. Mutating Props Directly

```vue
<script setup>
const props = defineProps({ count: Number });

// ❌ WRONG: Direct mutation
props.count = 10; // Error!

// ✅ CORRECT: Emit event to parent
const emit = defineEmits(["update:count"]);
emit("update:count", 10);
</script>
```

### 4. Not Using `onMounted` for Server Data

```vue
<script setup>
import { ref } from "vue";

const data = ref(null);

// ❌ WRONG: Fetch during setup (delays component render)
const res = await fetch("/api/data");
data.value = await res.json();

// ✅ CORRECT: Fetch in lifecycle hook
onMounted(async () => {
  const res = await fetch("/api/data");
  data.value = await res.json();
});
</script>
```

### 5. Using `reactive` When `ref` is Simpler

```vue
<script setup>
// ❌ OVERLY COMPLEX: Using reactive for primitives
const state = reactive({
  count: 0,
  message: "",
});

// ✅ SIMPLER: Use ref for primitives
const count = ref(0);
const message = ref("");

// ✅ reactive is good for objects
const form = reactive({
  username: "",
  password: "",
});
</script>
```

---

## Examples Summary

| State Type      | Location   | Pattern                   | Example                                      |
| --------------- | ---------- | ------------------------- | -------------------------------------------- |
| Local primitive | Component  | `ref()`                   | `const count = ref(0)`                       |
| Local object    | Component  | `reactive()` or `ref({})` | `const form = reactive({ username: '' })`    |
| Global          | Composable | Module-level `ref()`      | `const theme = ref('auto')` in `useTheme.js` |
| Server          | Component  | `ref()` + `onMounted()`   | Fetch API data                               |
| URL             | Component  | `useRoute()`              | `route.query.error`                          |
| Derived         | Component  | `computed()`              | `const filtered = computed(() => ...)`       |

---

## Best Practices

1. **Start with local state** - Only promote to global when needed
2. **Use computed for derived state** - Avoid duplicate state
3. **Use onMounted for server data** - Don't block component render
4. **Use module-level state for singletons** - Simple and efficient
5. **Prefer ref over reactive** - Simpler for primitives, consistent API
6. **Don't mutate props** - Emit events instead
7. **Watch for side effects** - Use watchEffect, not computed
