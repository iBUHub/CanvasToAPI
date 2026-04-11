# Skill Integration Report

**Date**: 2026-04-11
**Project**: CanvasToAPI

## Overview

This report documents the integration of GitNexus code intelligence skills into the project's development guidelines.

## Integrated Skills

### Frontend Development Guidelines

**Target**: `.trellis/spec/frontend/doc.md`

| Skill                      | Section ID                       | Purpose                                         |
| -------------------------- | -------------------------------- | ----------------------------------------------- |
| `gitnexus-exploring`       | `skill-gitnexus-exploring`       | Code exploration and architecture understanding |
| `gitnexus-impact-analysis` | `skill-gitnexus-impact-analysis` | Pre-change impact analysis and risk assessment  |
| `gitnexus-debugging`       | `skill-gitnexus-debugging`       | Bug tracking and error tracing                  |
| `gitnexus-refactoring`     | `skill-gitnexus-refactoring`     | Safe renaming, extraction, and restructuring    |

### Backend Development Guidelines

**Target**: `.trellis/spec/backend/doc.md`

| Skill                      | Section ID                       | Purpose                                              |
| -------------------------- | -------------------------------- | ---------------------------------------------------- |
| `gitnexus-exploring`       | `skill-gitnexus-exploring`       | Code exploration and architecture understanding      |
| `gitnexus-impact-analysis` | `skill-gitnexus-impact-analysis` | Pre-change impact analysis and risk assessment       |
| `gitnexus-debugging`       | `skill-gitnexus-debugging`       | Bug tracking and error tracing                       |
| `gitnexus-refactoring`     | `skill-gitnexus-refactoring`     | Safe renaming, extraction, and restructuring         |
| `gitnexus-cli`             | `skill-gitnexus-cli`             | GitNexus CLI commands (analyze, status, clean, wiki) |

## Integration Locations

### Documentation Files

| Type                | Path                                               | Description                                            |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| Frontend Guidelines | `.trellis/spec/frontend/doc.md`                    | Main frontend development guide with integrated skills |
| Backend Guidelines  | `.trellis/spec/backend/doc.md`                     | Main backend development guide with integrated skills  |
| Frontend Index      | `.trellis/spec/frontend/index.md`                  | Quick navigation with skill references                 |
| Backend Index       | `.trellis/spec/backend/index.md`                   | Quick navigation with skill references                 |
| Frontend Examples   | `.trellis/spec/frontend/examples/skills/README.md` | Practical examples for each skill                      |
| Backend Examples    | `.trellis/spec/backend/examples/skills/README.md`  | Practical examples for each skill                      |

### Directory Structure

```
.trellis/spec/
├── frontend/
│   ├── doc.md                    ✅ Main guide with integrated skills
│   ├── index.md                  ✅ Updated with skill navigation
│   └── examples/
│       └── skills/
│           └── README.md         ✅ Skill usage examples
└── backend/
    ├── doc.md                    ✅ Main guide with integrated skills
    ├── index.md                  ✅ Updated with skill navigation
    └── examples/
        └── skills/
            └── README.md         ✅ Skill usage examples
```

## Skill Details

### 1. Code Exploration (`gitnexus-exploring`)

**Purpose**: Understand unfamiliar code, trace execution flows, explore architecture.

**Key Tools**:

- `gitnexus_query({query: "concept"})` - Find execution flows by concept
- `gitnexus_context({name: "symbol"})` - 360° view of a symbol
- `READ gitnexus://repo/CanvasToAPI/process/{name}` - Full execution trace

**Use Cases**:

- "How does authentication work?"
- "Show me the request flow"
- "Where is session management?"

### 2. Impact Analysis (`gitnexus-impact-analysis`)

**Purpose**: Understand blast radius before making changes.

**Key Tools**:

- `gitnexus_impact({target: "X", direction: "upstream"})` - Find dependents
- `gitnexus_detect_changes({scope: "staged"})` - Pre-commit check

**Risk Levels**:

- d=1: WILL BREAK (direct callers)
- d=2: LIKELY AFFECTED (indirect deps)
- d=3: MAY NEED TESTING (transitive)

### 3. Debugging (`gitnexus-debugging`)

**Purpose**: Track down bugs, errors, and unexpected behavior.

**Key Tools**:

- `gitnexus_query({query: "error/symptom"})` - Find related code
- `gitnexus_context({name: "suspect"})` - See all refs
- `gitnexus_cypher({query: "MATCH ..."})` - Custom traces

**Use Cases**:

- "Why is this failing?"
- "Where does this error come from?"
- "Trace this bug"

### 4. Safe Refactoring (`gitnexus-refactoring`)

**Purpose**: Rename, extract, split, or restructure code safely.

**Key Tools**:

- `gitnexus_rename({symbol_name, new_name, dry_run})` - Automated rename
- `gitnexus_impact({target, direction: "upstream"})` - Map dependents
- `gitnexus_detect_changes({scope: "all"})` - Verify changes

**Use Cases**:

- "Rename this function"
- "Extract this into a module"
- "Split this service"

### 5. GitNexus CLI (`gitnexus-cli`)

**Purpose**: Manage the GitNexus index.

**Key Commands**:

- `npx gitnexus analyze` - Build/refresh index
- `npx gitnexus status` - Check index freshness
- `npx gitnexus clean` - Delete index
- `npx gitnexus wiki` - Generate documentation
- `npx gitnexus list` - List indexed repos

## Tech Stack Compatibility

| Requirement     | Project Status         | Compatibility |
| --------------- | ---------------------- | ------------- |
| GitNexus MCP    | ✅ Available           | Compatible    |
| Code index      | ✅ 557 symbols indexed | Compatible    |
| Knowledge graph | ✅ 1614 relationships  | Compatible    |
| Execution flows | ✅ 46 processes mapped | Compatible    |

## Completed Changes

- [x] Created `.trellis/spec/frontend/doc.md` with integrated GitNexus skills
- [x] Created `.trellis/spec/backend/doc.md` with integrated GitNexus skills
- [x] Updated `.trellis/spec/frontend/index.md` with skill navigation
- [x] Updated `.trellis/spec/backend/index.md` with skill navigation
- [x] Created `.trellis/spec/frontend/examples/skills/README.md` with practical examples
- [x] Created `.trellis/spec/backend/examples/skills/README.md` with practical examples
- [x] All sections use proper `@@@section:skill-<name>` markers
- [x] All examples follow project conventions

## Usage Guidelines

### For Developers

1. **Before Making Changes**:
   - Read the relevant development guide (frontend or backend)
   - Check `gitnexus://repo/CanvasToAPI/context` for index freshness
   - Run impact analysis with `gitnexus_impact`
   - Follow the skill checklists

2. **During Development**:
   - Use `gitnexus_query` to explore unfamiliar code
   - Use `gitnexus_context` to understand symbols in depth
   - Use `gitnexus_debugging` for issue tracking

3. **Before Committing**:
   - Run `gitnexus_detect_changes({scope: "staged"})`
   - Verify changes match expected scope
   - Update all d=1 (WILL BREAK) dependents

### For AI Assistants

- All GitNexus tools are available via MCP
- Follow the integrated skill workflows
- Always run impact analysis before editing shared code
- Use dry_run mode for renames before applying

## Related Guidelines

- Frontend: `component-guidelines`, `state-management`, `type-safety`
- Backend: `error-handling`, `logging-guidelines`, `quality-guidelines`
- Project: `CLAUDE.md` (root-level GitNexus integration)

## Next Steps

1. **Optional**: Create usage commands for frequently used skills:

   ```bash
   /trellis:create-command explore "Explore codebase with GitNexus"
   /trellis:create-command impact "Check impact of code changes"
   ```

2. **Optional**: Add project-specific examples to the skills directories

3. **Optional**: Create team-specific skill variations if needed

## Notes

- All skills use `@@@section:skill-<name>` markers for easy reference
- Examples are provided in the `examples/skills/README.md` files
- Skills are consistent across frontend and backend guidelines
- Documentation is in English to maintain consistency with existing guidelines

---

**Integration completed**: 2026-04-11
**Total skills integrated**: 5
**Total files created/updated**: 6
