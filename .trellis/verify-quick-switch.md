# Verify Configuration Quick Switch

## Current Configuration: Fast Quality Check

```yaml
verify:
  - npm run lint:js # ~1-2s
  - npm run lint:css # ~1s
```

**Total time**: ~2-3 seconds per iteration
**Max loop time**: ~15 seconds (5 iterations)

---

## Switch to Comprehensive Check (Pre-Merge)

**When**: Before merging to main, after major refactoring, for production readiness

**Edit** `.trellis/worktree.yaml`:

```yaml
verify:
  # - npm run lint:js
  # - npm run lint:css
  - npm run lint
  - npm run build:ui
```

**Total time**: ~7-8 seconds per iteration
**Max loop time**: ~40 seconds (5 iterations)

---

## Switch to Minimal Check (Backend Only)

**When**: Only backend changes, no frontend modifications

**Edit** `.trellis/worktree.yaml`:

```yaml
verify:
  - npm run lint:js
  # - npm run lint:css
```

**Total time**: ~1-2 seconds per iteration

---

## Switch to Combined Lint (Simpler Output)

**When**: Want faster checks with combined output

**Edit** `.trellis/worktree.yaml`:

```yaml
verify:
  - npm run lint
```

**Total time**: ~2-3 seconds per iteration

---

## Temporarily Disable Verify

**When**: Debugging Ralph Loop, agent stuck issues

**Edit** `.trellis/worktree.yaml`:

```yaml
verify:
  # - npm run lint:js
  # - npm run lint:css
```

**Result**: Falls back to completion markers in `check.jsonl`

---

## How to Test Configuration

```bash
# Test each command individually
npm run lint:js
npm run lint:css
npm run lint
npm run build:ui

# Check Ralph Loop state
cat .trellis/.ralph-state.json

# Monitor verify execution
# Check console output when check agent attempts to stop
```

---

## Decision Flowchart

```
Is this for active development?
├─ YES → Use Fast Quality Check (current)
│         verify: [lint:js, lint:css]
│
└─ NO → Is this pre-merge or major refactor?
         ├─ YES → Use Comprehensive Check
         │         verify: [lint, build:ui]
         │
         └─ NO → Is this backend-only change?
                  ├─ YES → Use Minimal Check
                  │         verify: [lint:js]
                  │
                  └─ NO → Keep current config
```

---

## Verification Checklist

Before running check agent:

- [ ] Verify commands are uncommented in `.trellis/worktree.yaml`
- [ ] Test each command manually (`npm run lint:js`, etc.)
- [ ] Check that commands pass without errors
- [ ] Consider time budget (iterations × time)
- [ ] Update configuration if needed

---

## Troubleshooting

### Problem: Verify always fails

**Check**:

1. Run command manually: `npm run lint:js`
2. Fix any errors in code
3. Verify again

### Problem: Verify too slow

**Solution**:

1. Switch to minimal config (remove build)
2. Or use combined lint: `npm run lint`

### Problem: Ralph Loop stuck at max iterations

**Check**:

1. `.trellis/.ralph-state.json` for iteration count
2. Verify commands output (look for errors)
3. Consider disabling verify temporarily

### Problem: Want to skip verify for one run

**Solution**:

```bash
# Delete state file to reset
rm .trellis/.ralph-state.json
# Or comment out verify commands temporarily
```

---

## Best Practices

1. **Match verify level to task criticality**
   - Quick fixes: Fast check
   - Features: Fast check
   - Major changes: Comprehensive check
   - Pre-merge: Comprehensive check

2. **Monitor time spent in verify**
   - Check iteration count in state file
   - Adjust config if too slow

3. **Don't skip verify without reason**
   - Quality control exists for a reason
   - Catch issues early before they compound

4. **Keep code quality high**
   - Fix lint errors immediately
   - Run lint locally before committing
   - Use pre-commit hooks

---

**Remember**: Verify is your safety net. Configure it appropriately for your current development phase.
