# Project Verification Strategy

## Project Profile

**Type**: Web Application (Backend + Frontend)
**Stack**:

- Backend: Node.js + Express + WebSocket
- Frontend: Vue 3 + Vite + Element Plus + LESS
- Quality: ESLint + Stylelint + Prettier
- Build: Vite (production bundling)

**Current State**:

- ✅ ESLint configured (JavaScript + Vue)
- ✅ Stylelint configured (CSS + LESS)
- ✅ Prettier configured (code formatting)
- ✅ Husky + lint-staged (pre-commit hooks)
- ❌ No automated test suite
- ⏱️ Build time: ~5 seconds

---

## Available Verification Commands

| Command                | Purpose                    | Duration | Importance       |
| ---------------------- | -------------------------- | -------- | ---------------- |
| `npm run lint:js`      | ESLint check (JS + Vue)    | ~1-2s    | ⭐⭐⭐ Essential |
| `npm run lint:css`     | Stylelint check (CSS/LESS) | ~1s      | ⭐⭐⭐ Essential |
| `npm run lint`         | Both linters combined      | ~2-3s    | ⭐⭐⭐ Essential |
| `npm run build:ui`     | Frontend production build  | ~5s      | ⭐⭐ Important   |
| `npm run format:check` | Prettier format check      | ~2s      | ⭐ Optional      |

---

## Recommended Configuration

### Option A: Fast Quality Check (Recommended for development)

```yaml
# .trellis/worktree.yaml
verify:
  - npm run lint:js
  - npm run lint:css
```

**Pros**:

- ✅ Fast: ~2-3 seconds total
- ✅ Catches code quality issues early
- ✅ Separates JS and CSS errors for clarity
- ✅ Suitable for frequent check agent runs

**Cons**:

- ⚠️ Doesn't verify build success
- ⚠️ Build errors caught later (in CI/CD or pre-commit)

**Use case**: Active development, rapid iteration, check agent loops

---

### Option B: Comprehensive Check (Recommended for production)

```yaml
# .trellis/worktree.yaml
verify:
  - npm run lint
  - npm run build:ui
```

**Pros**:

- ✅ Verifies code quality (lint)
- ✅ Verifies build success (production bundle)
- ✅ Catches build-breaking changes early
- ✅ Complete validation before merge

**Cons**:

- ⚠️ Slow: ~7-8 seconds total
- ⚠️ May cause longer Ralph Loop iterations
- ⚠️ Build time adds up in loops (max 5 iterations = 25s+)

**Use case**: Pre-merge verification, important changes, production readiness

---

### Option C: Balanced Approach

```yaml
# .trellis/worktree.yaml
verify:
  - npm run lint
```

**Pros**:

- ✅ Medium speed: ~2-3 seconds
- ✅ Checks all code quality (JS + CSS)
- ✅ Fast enough for frequent runs

**Cons**:

- ⚠️ Doesn't verify build
- ⚠️ Less granular error reporting (combined output)

**Use case**: Default choice, good balance of speed and coverage

---

## Decision Matrix

| Scenario                        | Recommended Config     | Reason                   |
| ------------------------------- | ---------------------- | ------------------------ |
| **Active Frontend Development** | `lint:js` + `lint:css` | Fast feedback loop       |
| **Backend Changes Only**        | `lint:js`              | No CSS changes to verify |
| **Major UI Refactoring**        | `lint` + `build:ui`    | Ensure build succeeds    |
| **Pre-Merge Verification**      | `lint` + `build:ui`    | Complete validation      |
| **Quick Check Agent Runs**      | `lint`                 | Speed over completeness  |

---

## Why Not Include All Checks?

**Considerations**:

1. **Time Cost**:
   - Ralph Loop runs verify on every SubagentStop
   - Max 5 iterations per loop
   - 5s build × 5 iterations = 25s overhead
   - Developer experience: long wait times

2. **Error Visibility**:
   - Separate commands show which specific check failed
   - Combined output harder to parse

3. **Pre-commit Hooks**:
   - Husky + lint-staged already run linters on commit
   - Build verification happens before `npm start`
   - Redundant to duplicate in Ralph Loop

4. **CI/CD Pipeline**:
   - Full verification should run in CI/CD
   - Ralph Loop is for local development speed

---

## Current Recommendation for This Project

**Primary**: Option A (Fast Quality Check)

```yaml
verify:
  - npm run lint:js
  - npm run lint:css
```

**Reasons**:

1. ⚡ Fast: ~2-3 seconds per iteration
2. 🎯 Covers all code quality checks
3. 🔍 Clear error separation (JS vs CSS)
4. ✅ Sufficient for check agent quality control
5. 🚀 Build verified separately in pre-commit/CI

**When to upgrade to Option B**:

- Before merging to `main` branch
- After major refactoring
- For production deployment preparation

---

## Future Improvements

### Add Test Suite (When Ready)

```yaml
verify:
  - npm run lint
  - npm run test:unit
  - npm run build:ui
```

**Prerequisites**:

- Set up Vitest or Jest
- Write unit tests for utilities
- Write integration tests for components

### Add Type Checking (If Migrating to TypeScript)

```yaml
verify:
  - npm run lint
  - npm run typecheck
  - npm run build:ui
```

**Benefits**:

- Catch type errors early
- Better IDE support
- Safer refactoring

---

## Implementation Notes

1. **Update `.trellis/worktree.yaml`** with chosen configuration
2. **Test verify commands**: Run each command manually to ensure they pass
3. **Monitor Ralph Loop iterations**: Check `.trellis/.ralph-state.json` for iteration count
4. **Adjust as needed**: Different tasks may need different verify strictness

---

## Verification Command Details

### `npm run lint:js`

- Checks JavaScript files (`.js`, `.mjs`, `.cjs`)
- Checks Vue single-file components (`.vue`)
- Validates code style and best practices
- Uses ESLint with Vue 3 recommended rules

### `npm run lint:css`

- Checks CSS/LESS files
- Validates style properties and values
- Enforces consistent ordering
- Uses Stylelint with standard config

### `npm run lint`

- Runs both linters sequentially
- Combined output
- Fails fast on first error

### `npm run build:ui`

- Production build of Vue frontend
- Bundles JavaScript, CSS, assets
- Outputs to `ui/dist/`
- Verifies no build errors

---

**Summary**: Choose verification level based on development phase and task criticality. Fast checks for rapid iteration, comprehensive checks for production readiness.
