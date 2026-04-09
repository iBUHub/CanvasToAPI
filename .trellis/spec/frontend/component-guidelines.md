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
