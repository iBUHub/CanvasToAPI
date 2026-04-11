# Directory Structure

> How frontend code is organized in this project.

---

## Overview

The frontend follows a feature-based directory structure with clear separation between pages, reusable components, utilities, and styles. All frontend code lives under the `ui/` directory, with the main application in `ui/app/`.

**Key Principles:**

- StatusPage uses tab-based navigation (single-page architecture)
- Components are reusable UI elements
- Utils contain both utility functions and Composables
- Styles use LESS with CSS custom properties for theming

---

## Directory Layout

```
ui/
├── app/                          # Main application code
│   ├── App.vue                   # Root component (router wrapper)
│   ├── index.js                  # Application entry point
│   ├── router/                   # Vue Router configuration
│   │   └── index.js              # Route definitions and guards
│   ├── pages/                    # Page-level components
│   │   ├── LoginPage.vue         # Authentication page
│   │   ├── StatusPage.vue        # Main page with tabs (Dashboard, Settings, Logs)
│   │   └── NotFound.vue          # 404 error page
│   ├── components/               # Reusable components
│   │   ├── EnvVarTooltip.vue     # Environment variable tooltip
│   │   ├── SideNavBar.vue        # Left sidebar navigation
│   │   ├── TopAppBar.vue         # Top header with search/actions
│   │   └── MetricCard.vue        # Dashboard metric card
│   ├── composables/              # Vue Composables (stateful reusable logic)
│   │   ├── useSettings.js        # Settings state and API update methods
│   │   ├── useSessions.js        # Browser sessions management
│   │   ├── useLogs.js            # Log formatting and operations
│   │   ├── useVersionInfo.js     # Version checking and display
│   │   ├── useI18nHelper.js      # Internationalization helper
│   │   └── useStatusPolling.js   # Status polling and data sync
│   ├── utils/                    # Utility functions (stateless)
│   │   ├── useTheme.js           # Theme management Composable
│   │   ├── i18n.js               # Internationalization utility
│   │   └── escapeHtml.js         # XSS prevention utility
│   └── styles/                   # Global styles
│       ├── variables.less        # LESS variables and CSS custom properties
│       └── global.less           # Global styles applied to all pages
├── locales/                      # i18n translation files
│   ├── en.json                   # English translations
│   └── zh.json                   # Chinese translations
├── public/                       # Static assets served directly
└── dist/                         # Production build output (git-ignored)
```

---

## Module Organization

### When to Create a New File

**Create a new Page** when:

- The component is a route target (defined in `router/index.js`)
- It represents a full screen/URL in the application
- Example: Adding a settings page → `ui/app/pages/SettingsPage.vue`

**Create a new Component** when:

- UI element is reused across multiple pages
- It encapsulates a distinct piece of functionality
- Example: A reusable modal → `ui/app/components/ConfirmModal.vue`

**Create a new Composable** when:

- Multiple components need the same stateful logic
- Logic involves reactive state (ref, reactive, computed)
- Example: A shared data fetcher → `ui/app/composables/useFetchData.js`

**Create a new Utility** when:

- Pure function with no reactive state
- Used across multiple files
- Example: Date formatting → `ui/app/utils/formatDate.js`

### File Organization Rules

1. **One component per file**: Each `.vue` file contains one component
2. **Colocate related code**: Keep components close to where they're used
3. **Composables for stateful logic**: Vue composables with reactive state go in `composables/`
4. **Utils for stateless functions**: Pure functions used in 2+ files belong in `utils/`
5. **Styles**: Global styles in `styles/`, component styles in `<style scoped>`

---

## Naming Conventions

### File Names

| Type        | Convention                     | Example                                 |
| ----------- | ------------------------------ | --------------------------------------- |
| Pages       | PascalCase + `Page.vue` suffix | `LoginPage.vue`, `StatusPage.vue`       |
| Components  | PascalCase + `.vue`            | `EnvVarTooltip.vue`, `ConfirmModal.vue` |
| Composables | camelCase + `use` prefix       | `useTheme.js`, `useFetchData.js`        |
| Utilities   | camelCase                      | `escapeHtml.js`, `i18n.js`              |
| Styles      | kebab-case + `.less`           | `variables.less`, `global.less`         |
| Locales     | ISO 639-1 code + `.json`       | `en.json`, `zh.json`                    |

### Directory Names

- Always use lowercase with hyphens: `components/`, `router/`, `utils/`
- Plural for collections: `pages/`, `styles/`, `locales/`

---

## Examples

### Well-Organized Modules

**Pages** (`ui/app/pages/`):

- `LoginPage.vue` - Authentication page with form handling
- `StatusPage.vue` - Main page with tab-based navigation (Dashboard, Settings, Logs)
  - Dashboard tab: Service status, session pool management
  - Settings tab: Version info, configuration settings
  - Logs tab: Real-time log viewer with download
- Each page is a self-contained route target

**Components** (`ui/app/components/`):

- `EnvVarTooltip.vue` - Reusable tooltip for environment variables
- `SideNavBar.vue` - Fixed left sidebar with navigation (event-based, no router)
- `TopAppBar.vue` - Fixed top header with search and action buttons
- `MetricCard.vue` - Dashboard metric card with status indicator
- Each component is self-contained with scoped styles

**Utils/Composables** (`ui/app/utils/`):

- `useTheme.js` - Global theme state (singleton pattern)
- `i18n.js` - Internationalization with reactive state
- `escapeHtml.js` - Pure utility function (no state)

**Router** (`ui/app/router/`):

- `index.js` - All route definitions in one file
- Route guards for authentication
- Clear mapping: path → component

---

## Import Patterns

### Relative Imports Within `ui/app/`

```javascript
// Utils/Composables
import I18n from "../utils/i18n";
import { useTheme } from "../utils/useTheme";
import { escapeHtml } from "../utils/escapeHtml";

// Components
import EnvVarTooltip from "../components/EnvVarTooltip.vue";

// Pages (in router)
import LoginPage from "../pages/LoginPage.vue";
import StatusPage from "../pages/StatusPage.vue";
```

### External Dependencies

```javascript
// Vue core
import { ref, computed, onMounted, watchEffect } from "vue";
import { useRoute } from "vue-router";

// Element Plus
import { ElMessage } from "element-plus";
import "element-plus/dist/index.css";
```

---

## Anti-Patterns

**DON'T:**

- Create deeply nested component directories (keep it flat: `components/ComponentName.vue`)
- Mix pages and components in the same directory
- Put utility functions in component files (extract to `utils/`)
- Create multiple files for one component (split only if truly reusable)
- Use absolute imports when relative imports are clearer

**DO:**

- Keep directory structure flat and predictable
- Extract reusable logic to `utils/`
- Use descriptive names that indicate purpose
- Group related files by feature when appropriate
