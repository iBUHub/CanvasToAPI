# Component Guidelines

> How components are built in this project.

---

## Overview

This project uses **Vue 3 Composition API** with `<script setup>` syntax. Components are built as Single File Components (SFCs) with template, script, and style sections. The project uses **Element Plus** as the UI component library.

**Key Principles:**

- Use Composition API with `<script setup>` (no Options API)
- Define props with runtime validation using `defineProps()`
- Use Element Plus components for consistent UI
- Scope styles with `<style scoped>`, global styles in `<style>`
- Import LESS variables for consistent theming

---

## Component Structure

### Standard SFC Layout

Every Vue component follows this structure:

```vue
<!--
 * File: ui/app/components/ComponentName.vue
 * Description: Brief description of component purpose
 *
 * Author: iBUHUB
-->

<template>
  <!-- HTML template with Element Plus components -->
</template>

<script setup>
// 1. Imports (Vue, libraries, local)
import { ref, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import I18n from "../utils/i18n";

// 2. Props definition
const props = defineProps({
  propName: {
    required: true,
    type: String,
  },
});

// 3. Reactive state
const localState = ref("");

// 4. Computed properties
const computedValue = computed(() => props.propName + localState.value);

// 5. Methods
const handleClick = () => {
  // ...
};

// 6. Lifecycle hooks
onMounted(() => {
  // ...
});
</script>

<style lang="less" scoped>
@import "../styles/variables.less";

/* Component-specific styles */
</style>
```

### File Header Comments

Every component MUST include a file header comment:

```vue
<!--
 * File: ui/app/components/EnvVarTooltip.vue
 * Description: Reusable tooltip component for environment variable documentation
 *
 * Author: iBUHUB
-->
```

---

## Props Conventions

### Definition Pattern

Use object syntax with `required` and `type` for all props:

```vue
<script setup>
// ✅ CORRECT: Object syntax with validation
const props = defineProps({
  docSection: {
    required: true,
    type: String,
  },
  envVar: {
    required: true,
    type: String,
  },
  optionalProp: {
    required: false,
    type: Boolean,
    default: false,
  },
});
</script>
```

### Runtime Validation

Since this project uses JavaScript (not TypeScript), runtime validation is essential:

```vue
<script setup>
const props = defineProps({
  // String with required
  title: {
    required: true,
    type: String,
  },
  // Number with default
  count: {
    required: false,
    type: Number,
    default: 0,
  },
  // Boolean
  disabled: {
    required: false,
    type: Boolean,
    default: false,
  },
  // Array
  items: {
    required: false,
    type: Array,
    default: () => [],
  },
  // Object
  config: {
    required: false,
    type: Object,
    default: () => ({}),
  },
});
</script>
```

### Props Usage

```vue
<template>
  <!-- Use props directly in template -->
  <div>{{ props.title }}</div>

  <!-- Or destructure in script -->
  <div>{{ title }}</div>
</template>

<script setup>
const props = defineProps({
  /* ... */
});

// Destructure for cleaner code
const { title, count } = props;
</script>
```

---

## Styling Patterns

### LESS Variables Import

Always import variables for consistent theming:

```vue
<style lang="less" scoped>
@import "../styles/variables.less";

.my-component {
  background-color: @background-white;
  color: @text-primary;
  border: 1px solid @border-color;
  padding: @spacing-md;
}
</style>
```

### Scoped vs Global Styles

**Use `<style scoped>` for component-specific styles:**

```vue
<style lang="less" scoped>
@import "../styles/variables.less";

.login-form {
  background: @background-white;
  border-radius: @border-radius-lg;
}
</style>
```

**Use `<style>` (without scoped) for global Element Plus overrides:**

```vue
<style>
/* Override Element Plus tooltip styles globally */
.el-popper.custom-theme-tooltip.is-light {
  background-color: var(--el-bg-color-overlay, #ffffff);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
}
</style>
```

### CSS Custom Properties

The project uses CSS custom properties for theming (light/dark mode):

```less
/* In variables.less */
:root {
  --color-primary: #007bff;
  --bg-card: #fff;
  --text-primary: #333;
}

[data-theme="dark"] {
  --bg-card: #242424;
  --text-primary: #f0f0f0;
}

/* Usage in components */
.card {
  background-color: var(--bg-card);
  color: var(--text-primary);
}
```

---

## Composition API Patterns

### Reactive State

```vue
<script setup>
import { ref, reactive, computed } from "vue";

// For primitive values
const count = ref(0);
const message = ref("");

// For objects (optional - ref also works)
const formState = reactive({
  username: "",
  password: "",
});

// Computed properties
const isValid = computed(() => {
  return formState.username.length > 0 && formState.password.length > 0;
});
</script>
```

### Lifecycle Hooks

```vue
<script setup>
import { onMounted, onUnmounted, watchEffect } from "vue";

onMounted(() => {
  console.log("Component mounted");
  // Fetch initial data
  fetchData();
});

onUnmounted(() => {
  // Cleanup subscriptions
  clearInterval(intervalId);
});

// Watch for reactive changes
watchEffect(() => {
  document.title = pageTitle.value;
});
</script>
```

### Methods

```vue
<script setup>
// Use arrow functions for methods
const handleSubmit = () => {
  if (!isValid.value) {
    ElMessage.error("Invalid form");
    return;
  }
  submitForm(formState);
};

const fetchData = async () => {
  try {
    const res = await fetch("/api/data");
    const data = await res.json();
    localState.value = data;
  } catch (err) {
    console.error("Failed to fetch:", err);
  }
};
</script>
```

---

## Element Plus Integration

### Component Usage

```vue
<template>
  <!-- Use PascalCase for Element Plus components -->
  <ElButton type="primary" @click="handleClick"> Submit </ElButton>

  <ElTooltip placement="top" effect="light">
    <template #content> Tooltip content </template>
    <span>Hover me</span>
  </ElTooltip>

  <ElMessage :message="errorMessage" type="error" />
</template>

<script setup>
import { ElMessage } from "element-plus";

const handleClick = () => {
  ElMessage.success("Operation successful");
};
</script>
```

### Global Registration

Element Plus is registered globally in `ui/app/index.js`:

```javascript
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

const app = createApp(App);
app.use(ElementPlus);
```

No need to import individual components, but import services:

```javascript
import { ElMessage, ElNotification } from "element-plus";
```

---

## Accessibility

### Current State

The project uses Element Plus components which have built-in accessibility:

- Keyboard navigation
- ARIA attributes
- Focus management

### Best Practices

```vue
<template>
  <!-- Use semantic HTML -->
  <button type="button" @click="handleClick">Action</button>

  <!-- Provide labels for inputs -->
  <input type="text" :placeholder="t('usernamePlaceholder')" aria-label="Username" required />

  <!-- Add title for icon buttons -->
  <button type="button" :title="t('switchLanguage')" @click="toggleLanguage">
    <svg><!-- icon --></svg>
  </button>
</template>
```

---

## Common Mistakes

### 1. Using Options API

```vue
<!-- ❌ WRONG: Options API -->
<script>
export default {
  data() {
    return {
      count: 0,
    };
  },
  methods: {
    increment() {
      this.count++;
    },
  },
};
</script>

<!-- ✅ CORRECT: Composition API with <script setup> -->
<script setup>
import { ref } from "vue";

const count = ref(0);
const increment = () => {
  count.value++;
};
</script>
```

### 2. Missing Props Validation

```vue
<!-- ❌ WRONG: No validation -->
<script setup>
const props = defineProps(["title", "count"]);
</script>

<!-- ✅ CORRECT: Runtime validation -->
<script setup>
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

### 3. Not Using Scoped Styles

```vue
<!-- ❌ WRONG: Global styles leak to other components -->
<style lang="less">
.button {
  background: @primary-color;
}
</style>

<!-- ✅ CORRECT: Scoped styles -->
<style lang="less" scoped>
@import "../styles/variables.less";

.button {
  background: @primary-color;
}
</style>
```

### 4. Hardcoding Colors Instead of Variables

```vue
<!-- ❌ WRONG: Hardcoded colors -->
<style lang="less" scoped>
.card {
  background: #fff;
  color: #333;
}
</style>

<!-- ✅ CORRECT: Use LESS variables -->
<style lang="less" scoped>
@import "../styles/variables.less";

.card {
  background: @background-white;
  color: @text-primary;
}
</style>
```

### 5. Not Using Element Plus Components

```vue
<!-- ❌ WRONG: Custom button with manual styling -->
<template>
  <button class="my-button" @click="handleClick">Submit</button>
</template>

<!-- ✅ CORRECT: Use Element Plus -->
<template>
  <ElButton type="primary" @click="handleClick"> Submit </ElButton>
</template>
```

---

## Examples

### Simple Component: Tooltip

See `ui/app/components/EnvVarTooltip.vue`:

- Props with validation
- Element Plus integration (ElTooltip, ElMessage)
- Reactive i18n state
- Both scoped and global styles
- Event handling (copy to clipboard)

### Page Component: Login

See `ui/app/pages/LoginPage.vue`:

- Form handling with native HTML forms
- i18n integration with reactive language switching
- Theme initialization with useTheme()
- Computed properties for error handling
- watchEffect for document title
- Scoped styles with LESS variables

---

## Component Patterns

### Layout Components

Layout components provide the structural framework for pages. They are fixed-position elements that remain visible across route changes.

**SideNavBar Pattern** (`ui/app/components/SideNavBar.vue`):

```vue
<script setup>
import { ref, defineProps, defineEmits } from "vue";

// Props with default for optional behavior
defineProps({
  activeItem: {
    default: "dashboard",
    required: false,
    type: String,
  },
});

// Emits for parent communication
const emit = defineEmits(["navigate"]);

// Static navigation data
const navItems = ref([{ icon: "dashboard", id: "dashboard", label: "Dashboard" }]);

const handleNavClick = itemId => {
  emit("navigate", itemId);
};
</script>
```

**Key Points:**

- Use `emit` for navigation instead of router.push (parent controls routing)
- Use Material Symbols for icons (via Google Fonts CDN)
- Fixed positioning with CSS variable for width (`@sidebar-width`)

### Display Components

Display components present data without complex state management.

**MetricCard Pattern** (`ui/app/components/MetricCard.vue`):

```vue
<script setup>
import { computed, defineProps } from "vue";

// Omit 'props' assignment when not using props in script
defineProps({
  icon: {
    default: "",
    required: false,
    type: String,
  },
  label: {
    required: true,
    type: String,
  },
  value: {
    required: true,
    type: [String, Number],
  },
  statusType: {
    default: "success",
    required: false,
    type: String,
  },
});

// Computed for derived values
const formattedValue = computed(() => {
  // Transform logic here
});
</script>
```

**Key Points:**

- Use `defineProps()` directly without assignment if props not accessed in script
- Accept both String and Number for flexible value types
- Provide sensible defaults for optional props
- Use computed for derived/transformed values

**Data Table Pattern** (`ui/app/components/RequestTable.vue`):

- Provide default data array for standalone usage
- Use computed for status/method class mapping
- Emit events for user actions (filter, refresh)

---

## Styling Patterns

### Material Design 3 Color System

The project uses a Material Design 3 inspired color system with CSS custom properties for theming:

```less
// In variables.less
:root {
  // Primary palette
  --color-primary: #004ac6;
  --color-primary-container: #2563eb;
  --color-on-primary: #ffffff;

  // Surface palette
  --color-surface: #faf8ff;
  --color-surface-container: #ededf9;

  // Text colors
  --color-on-surface: #191b23;
  --color-on-surface-variant: #434655;
}

[data-theme="dark"] {
  --color-primary: #b4c5ff;
  --color-surface: #121318;
  --color-on-surface: #e3e2e8;
}

// LESS variables mapped to CSS custom properties
@primary-color: var(--color-primary);
@surface: var(--color-surface);
```

### Using Colors in Components

```less
// ✅ CORRECT: Use LESS variables that map to CSS custom properties
.my-component {
  background-color: @surface-container;
  color: @on-surface;
  border: 1px solid @outline-variant;
}

// ❌ WRONG: Hardcoded colors
.my-component {
  background-color: #ededf9;
  color: #191b23;
}

// ❌ WRONG: fade() with CSS custom properties (LESS can't evaluate)
.my-component {
  opacity: fade(var(--color-primary), 50%); // Error!
}

// ✅ CORRECT: Use rgba() directly for transparency
.my-component {
  background-color: rgba(0, 74, 198, 0.1);
}
```

### Fixed Layout Pattern

For dashboard-style layouts with fixed sidebar and header:

```less
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  width: @sidebar-width; // 256px
  height: 100vh;
  z-index: @z-index-fixed;
}

.topbar {
  position: fixed;
  top: 0;
  left: @sidebar-width; // Start after sidebar
  right: 0;
  height: @topbar-height; // 64px
  z-index: @z-index-sticky;
}

.main-content {
  margin-left: @sidebar-width;
  padding-top: @topbar-height;
  min-height: 100vh;
}
```

---

## Common Mistakes

### 6. Using fade() with CSS Custom Properties

LESS's `fade()` function cannot evaluate CSS custom properties at compile time:

```less
// ❌ WRONG: LESS error - "Argument cannot be evaluated to a color"
border: 1px solid fade(@outline-variant, 15%);

// ✅ CORRECT: Use hardcoded rgba values for transparency
border: 1px solid rgba(195, 198, 215, 0.15);
```

### 7. Unused Props Assignment

```vue
<!-- ❌ WRONG: Assigning props but never using them -->
<script setup>
const props = defineProps({ ... });  // 'props' is assigned but never used
</script>

<!-- ✅ CORRECT: Use defineProps() directly if not accessing props in script -->
<script setup>
defineProps({ ... });
</script>

<!-- ✅ CORRECT: Use props in template or computed -->
<script setup>
const props = defineProps({ value: { type: String } });
const formatted = computed(() => props.value.toUpperCase());
</script>
```

---

## Navigation Component Pattern (Hybrid Navigation)

Navigation components (like `SideNavBar`) should support both **Vue Router navigation** and **event-based communication**. This allows flexibility for pages that need routing while maintaining backward compatibility with event-based patterns.

### Pattern: Hybrid Navigation

**Navigation Item Structure**:

```vue
<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// Navigation items with optional route property
const navItems = ref([
  { icon: "dashboard", id: "dashboard", label: "Dashboard", route: "/" },
  { icon: "devices", id: "sessions", label: "Sessions", route: "/sessions" },
  { icon: "settings", id: "settings", label: "Settings", route: "/settings" },
  { icon: "help", id: "help", label: "Help", route: null }, // No route - emit event
]);

const emit = defineEmits(["navigate"]);

const handleNavClick = itemId => {
  const item = navItems.value.find(i => i.id === itemId);

  // If item has a route, navigate via router
  if (item && item.route) {
    router.push(item.route);
  }

  // Always emit event for backward compatibility
  emit("navigate", itemId);
};
</script>
```

### When to Use

**Use Router Navigation When**:

- ✅ Item navigates to a different page (Dashboard → Sessions)
- ✅ URL should change
- ✅ Browser back/forward should work
- ✅ User can bookmark the page

**Use Event Emission When**:

- ✅ Item triggers an action (not a page change)
- ✅ Component needs to handle navigation differently
- ✅ Complex navigation logic required
- ✅ Maintaining backward compatibility

### Real Example: SideNavBar.vue

```vue
<template>
  <nav class="sidebar">
    <div
      v-for="item in navItems"
      :key="item.id"
      class="nav-item"
      :class="{ active: activeItem === item.id }"
      @click="handleNavClick(item.id)"
    >
      <span class="material-symbols-outlined">{{ item.icon }}</span>
      <span>{{ item.label }}</span>
    </div>
  </nav>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const props = defineProps({
  activeItem: { type: String, default: "dashboard" },
});

const emit = defineEmits(["navigate"]);
const router = useRouter();

const navItems = ref([
  { icon: "dashboard", id: "dashboard", label: "Dashboard", route: "/" },
  { icon: "devices", id: "sessions", label: "Sessions", route: "/sessions" },
  { icon: "settings", id: "settings", label: "Settings", route: "/settings" },
  { icon: "manage_accounts", id: "accounts", label: "Accounts", route: null },
]);

const handleNavClick = itemId => {
  const item = navItems.value.find(i => i.id === itemId);

  // Router navigation for pages
  if (item && item.route) {
    router.push(item.route);
  }

  // Event emission for all items
  emit("navigate", itemId);
};
</script>
```

### Parent Component Usage

```vue
<template>
  <div class="app">
    <!-- Navigation handles routing automatically -->
    <SideNavBar :active-item="activeTab" @navigate="handleNavigate" />

    <main>
      <router-view />
      <!-- Shows current route's component -->
    </main>
  </div>
</template>

<script setup>
import { ref } from "vue";

const activeTab = ref("dashboard");

const handleNavigate = itemId => {
  activeTab.value = itemId;
  // Router navigation already handled by SideNavBar
  // This is for additional side effects (e.g., analytics, logging)
  console.log("Navigated to:", itemId);
};
</script>
```

### Benefits

1. **Flexibility**: Supports both routing and event patterns
2. **Backward Compatibility**: Existing event-based code still works
3. **URL Management**: Router handles URL changes automatically
4. **Separation of Concerns**: Navigation logic stays in nav component
5. **Testability**: Can test routing and events separately

### Common Mistakes

```vue
<script setup>
// ❌ WRONG: Only emit event, no router integration
const handleNavClick = itemId => {
  emit("navigate", itemId);
  // Parent must handle routing manually
};

// ❌ WRONG: Only router, no event emission
const handleNavClick = itemId => {
  const item = navItems.value.find(i => i.id === itemId);
  if (item.route) {
    router.push(item.route);
  }
  // No event - parent can't track navigation
};

// ✅ CORRECT: Hybrid approach
const handleNavClick = itemId => {
  const item = navItems.value.find(i => i.id === itemId);
  if (item && item.route) {
    router.push(item.route); // Automatic routing
  }
  emit("navigate", itemId); // Notify parent
};
</script>
```

---

## Summary

| Pattern           | Use Case       | Key Point                                   |
| ----------------- | -------------- | ------------------------------------------- |
| Props validation  | All components | Use object syntax with required + type      |
| Element Plus UI   | All components | Use Element Plus components for consistency |
| Scoped styles     | All components | Use `<style scoped>` for component styles   |
| LESS variables    | Theming        | Use `@color` mapped to `var(--color-*)`     |
| Hybrid navigation | Nav components | Router + events for flexibility             |
| Polling pattern   | Real-time data | Clear interval in onBeforeUnmount           |
