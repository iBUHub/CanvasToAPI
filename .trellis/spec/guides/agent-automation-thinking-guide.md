# Agent Automation Thinking Guide

> **Purpose**: Design reliable autonomous agent workflows with proper guardrails.

---

## The Problem

**Autonomous agents can get stuck in infinite loops** without proper exit conditions.

Common loop patterns:

- Agent checks code → finds issue → fixes → checks again → finds another issue → ...
- Agent runs verification → fails → tries again → fails again → ...
- Hook blocks agent stop → agent doesn't know what to do → continues aimlessly

---

## Before Designing Agent Loops

### Step 1: Define Clear Exit Conditions

**What signals completion?**

| Mechanism                     | Reliability | Use Case                         |
| ----------------------------- | ----------- | -------------------------------- |
| **Programmatic verification** | ✅ HIGH     | Run actual commands (lint, test) |
| **Completion markers**        | ⚠️ MEDIUM   | Agent outputs specific string    |
| **Max iterations**            | 🛡️ SAFETY   | Prevent true infinite loop       |

**Best practice**: Use programmatic verification over string markers.

### Step 2: Choose Control Mechanism

**Option A: Verify Commands** (Recommended)

```yaml
# .trellis/worktree.yaml
verify:
  - npm run lint
  - npm run test
```

Pros:

- ✅ Actual code quality verification
- ✅ No dependency on agent output format
- ✅ Objective pass/fail criteria

Cons:

- ⚠️ Requires working test suite
- ⚠️ May be slow for large projects

**Option B: Completion Markers**

```jsonl
{
  "file": "...",
  "reason": "Check"
}
```

Agent must output: `CHECK_FINISH`

Pros:

- ✅ Fast
- ✅ Works without test suite

Cons:

- ❌ Agent might output marker without actually checking
- ❌ Fragile to prompt changes
- ❌ Requires agent awareness of markers

### Step 3: Set Safety Limits

```python
# .claude/hooks/ralph-loop.py
MAX_ITERATIONS = 5  # Prevent true infinite loop
STATE_TIMEOUT_MINUTES = 30  # Reset stale state
```

**Why?**

- Prevents runaway agents
- Allows manual intervention
- Avoids resource exhaustion

---

## Common Pitfalls

### Pitfall 1: Marker Mismatch

**Symptom**: Agent loops because it doesn't know what markers to output.

**Root cause**:

```jsonl
{
  "file": "...",
  "reason": "Code quality check spec"
}
```

Expected marker: `CODE_QUALITY_CHECK_SPEC_FINISH`

But agent doesn't know this requirement.

**Solution**: Use verify commands instead of markers.

### Pitfall 2: Overly Complex Markers

**Symptom**: Many different markers required, agent misses one.

```jsonl
{"reason": "TypeCheck"}
{"reason": "Lint"}
{"reason": "Test"}
{"reason": "Format"}
```

**Solution**: Simplify to single marker or use verify commands.

### Pitfall 3: Agent Has Too Much Power

**Symptom**: Agent told to "fix any issues" loops forever.

**Root cause**: No clear scope or completion criteria.

**Solution**:

- Define specific checks in prompt
- Use verify commands for objective pass/fail
- Limit agent to read-only access (check) vs write access (implement)

---

## Agent Type Responsibilities

| Agent Type    | Should                   | Should NOT             |
| ------------- | ------------------------ | ---------------------- |
| **check**     | Read code, report issues | Auto-fix code          |
| **implement** | Write code, run lint     | Change backend APIs    |
| **debug**     | Fix specific bug         | Refactor entire module |

**Key principle**: Single responsibility prevents loops.

---

## Hook Configuration Best Practices

### SubagentStop Hook Pattern

```json
{
  "SubagentStop": [
    {
      "hooks": [
        {
          "command": "python .claude/hooks/ralph-loop.py",
          "timeout": 10,
          "type": "command"
        }
      ],
      "matcher": "check"
    }
  ]
}
```

**Why it works**:

- ✅ Only intercepts specific agent type
- ✅ Has timeout limit
- ✅ Uses verify commands (if configured)

### Hook Logic Flow

```
Agent attempts to stop
  ↓
Hook intercepts SubagentStop event
  ↓
Is this a "check" agent? → NO → Allow stop
  ↓ YES
Are verify commands configured? → NO → Check markers
  ↓ YES                           ↓
Run verify commands            Check agent output
  ↓                               ↓
All pass? → YES → Allow stop   All markers present? → YES → Allow stop
  ↓ NO                            ↓ NO
Block stop, tell agent why     Block stop, list missing markers
```

---

## Debugging Agent Loops

### Step 1: Check Hook Configuration

```bash
cat .claude/settings.json | grep -A 10 "SubagentStop"
```

### Step 2: Check Verify Commands

```bash
cat .trellis/worktree.yaml | grep -A 5 "verify:"
```

If empty or commented, agent uses markers.

### Step 3: Check Expected Markers

```bash
cat .trellis/tasks/<task>/check.jsonl
```

Each `reason` becomes a marker: `{REASON.upper()}_FINISH`

### Step 4: Check Agent Output

Did agent actually output the markers? Search agent's last message for the marker strings.

### Step 5: Check State File

```bash
cat .trellis/.ralph-state.json
```

Shows current iteration count and task.

---

## Prevention Checklist

Before running autonomous agents:

- [ ] Verify commands configured in `worktree.yaml`?
- [ ] If using markers, are they documented in agent prompt?
- [ ] Max iterations set in `ralph-loop.py`?
- [ ] Timeout set in hook configuration?
- [ ] Agent has clear, scoped objective?
- [ ] Agent type matches responsibility (check vs implement)?

---

## Case Study: Ralph Loop Fix

**Problem**: Check agent stuck in infinite loop.

**Root cause**:

1. `worktree.yaml` had verify commands commented out
2. Ralph-loop fell back to completion markers
3. `check.jsonl` had complex markers: `CODE_QUALITY_CHECK_SPEC_FINISH`
4. Agent didn't know to output these markers
5. Loop blocked stop, agent didn't know what to do
6. Continued until max iterations (5)

**Fix**:

```yaml
# .trellis/worktree.yaml
verify:
  - npm run lint:js
```

**Result**:

- ✅ Ralph-loop runs actual lint command
- ✅ If lint passes, agent can stop
- ✅ No dependency on agent outputting specific strings
- ✅ Objective verification of code quality

---

## Key Principles

1. **Programmatic > Markers**: Use actual commands over string outputs
2. **Single Responsibility**: Check agent reports, doesn't auto-fix
3. **Clear Exit Criteria**: Define exactly what "done" looks like
4. **Safety Limits**: Max iterations prevent true infinite loops
5. **Timeouts**: Prevent resource exhaustion

---

**Core Philosophy**: Autonomous agents need clear stop conditions, not just start conditions.
