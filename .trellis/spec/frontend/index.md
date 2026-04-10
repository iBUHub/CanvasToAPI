# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

This directory contains guidelines for frontend development. Fill in each file with your project's specific conventions.

---

## Guidelines Index

| Guide                                             | Description                             | Status    |
| ------------------------------------------------- | --------------------------------------- | --------- |
| [Directory Structure](./directory-structure.md)   | Module organization and file layout     | ✅ Filled |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition  | ✅ Filled |
| [Hook Guidelines](./hook-guidelines.md)           | Custom hooks, data fetching patterns    | To fill   |
| [State Management](./state-management.md)         | Local state, global state, server state | To fill   |
| [Quality Guidelines](./quality-guidelines.md)     | Code standards, forbidden patterns      | To fill   |
| [Type Safety](./type-safety.md)                   | Type patterns, validation               | To fill   |

---

## How to Fill These Guidelines

For each guideline file:

1. Document your project's **actual conventions** (not ideals)
2. Include **code examples** from your codebase
3. List **forbidden patterns** and why
4. Add **common mistakes** your team has made

The goal is to help AI assistants and new team members understand how YOUR project works.

---

## Quick Reference

### Component Types

| Type            | Location                                                   | Purpose                   |
| --------------- | ---------------------------------------------------------- | ------------------------- |
| **Layout**      | `components/SideNavBar.vue`, `components/TopAppBar.vue`    | Fixed structural elements |
| **Display**     | `components/MetricCard.vue`, `components/TrafficChart.vue` | Data presentation         |
| **Interactive** | `components/RequestTable.vue`                              | User interactions         |
| **Tooltip**     | `components/EnvVarTooltip.vue`                             | Contextual help           |

### Styling

- Use **LESS variables** mapped to **CSS custom properties** for theming
- Use **rgba()** directly for transparency (LESS `fade()` doesn't work with CSS variables)
- Import `@import "../styles/variables.less"` in component styles

---

**Language**: All documentation should be written in **English**.
