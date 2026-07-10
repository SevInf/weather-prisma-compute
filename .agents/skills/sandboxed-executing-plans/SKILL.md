---
name: sandboxed-executing-plans
description: Use when executing implementation plans—runs superpowers:executing-plans inside a bubblewrap sandbox for filesystem isolation
---

# Sandboxed Plan Execution

Dispatch a subagent inside a bubblewrap sandbox to run `superpowers:executing-plans`. This skill provides the isolation layer; `executing-plans` provides the execution logic.

**Announce at start:** "I'm using the sandboxed-executing-plans skill to run executing-plans inside a bubblewrap sandbox."

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ OUTER SESSION (you are here, unsandboxed)                   │
│                                                             │
│  1. Verify sandbox is ready (or run setup)                  │
│  2. Create worktree in /tmp for isolation                   │
│  3. Dispatch sandboxed subagent ─────────────────────────┐  │
│     │                                                    │  │
│     │   ┌─────────────────────────────────────────────┐  │  │
│     │   │ SANDBOXED SUBAGENT (bwrap jail)             │  │  │
│     │   │                                             │  │  │
│     │   │  superpowers:executing-plans                │  │  │
│     │   │     ├─ Loads plan from docs/plans/*.md      │  │  │
│     │   │     ├─ Executes ALL tasks continuously      │  │  │
│     │   │     ├─ No batching (sandbox can't resume)   │  │  │
│     │   │     └─ Reports results                      │  │  │
│     │   │                                             │  │  │
│     │   │  Sandbox constraints:                       │  │  │
│     │   │  • Read-write: original project path        │  │  │
│     │   │  • Read-write: worktree path in /tmp        │  │  │
│     │   │  • Read-only: extra dirs from               │  │  │
│     │   │    SANDBOX_EXTRA_BIND_DIRS                   │  │  │
│     │   │  • Network: allowed                         │  │  │
│     │   │  • --dangerously-skip-permissions           │  │  │
│     │   └─────────────────────────────────────────────┘  │  │
│     │                                                    │  │
│     ←─────────────── Returns results ────────────────────┘  │
│                                                             │
│  4. Report results, clean up worktree, leave branch         │
└─────────────────────────────────────────────────────────────┘
```

## Setup

Run the setup script once per machine. It handles all prerequisites (bwrap, AppArmor, claude CLI):

```bash
sudo ~/.claude/skills/sandboxed-executing-plans/scripts/setup-claude-sandbox
```

The setup script will:

- Check that bwrap and claude CLI are installed
- Test if bwrap works (detects AppArmor issues)
- Automatically run AppArmor configuration if needed (requires sudo)

## Execution Protocol

### Step 1: Verify sandbox is ready

```bash
SANDBOX_WORK_DIR=/tmp ~/.claude/skills/sandboxed-executing-plans/scripts/claude-sandbox --version
```

If this fails, run the setup script (see above). Do NOT proceed until setup completes successfully.

### Step 2: Create worktree

Create an isolated worktree in `/tmp` before launching the sandbox. This keeps your main working tree untouched.

```bash
git worktree add /tmp/[PROJECT]-[FEATURE] -b sandbox/[FEATURE]
```

Replace `[PROJECT]` with the project name and `[FEATURE]` with a descriptive feature name. Always use the `sandbox/` prefix for branch names — this makes it easy to identify and clean up sandbox-created branches.

If there's a task ID visible in the conversation (Linear ticket like `FT-3649`, GitHub issue, etc.), include it in the branch name: `sandbox/ft-3649-ukp-logs-to-clickhouse`.

### Step 3: Dispatch sandboxed subagent

Run `claude-sandbox` with the worktree path. Replace `[PROJECT]`, `[FEATURE]`, and `[PLAN_FILENAME]`.

If the task needs read-only access to directories outside the project tree, set `SANDBOX_EXTRA_BIND_DIRS` to a comma-separated list of absolute paths. These directories will be mounted read-only inside the sandbox.

```bash
SANDBOX_SOURCE_DIR="$PWD" SANDBOX_WORK_DIR="/tmp/[PROJECT]-[FEATURE]" \
SANDBOX_EXTRA_BIND_DIRS="/path/one,/path/two" \
  ~/.claude/skills/sandboxed-executing-plans/scripts/claude-sandbox -p "You are running inside a bubblewrap sandbox.

ENVIRONMENT:
- Working directory: /tmp/[PROJECT]-[FEATURE] (worktree, read-write)
- Original project: $PWD (read-write, for git worktree compatibility)
- You are on branch: sandbox/[FEATURE]

TASK: Use superpowers:executing-plans to implement the plan at:
  $PWD/docs/plans/[PLAN_FILENAME].md
(Note: The plan file is in the ORIGINAL project directory, not the worktree. Read it from there.)

PLAN ADHERENCE:
- The plan contains numbered tasks with specific file locations and instructions
- The plan has already been reviewed and approved—follow it exactly
- Do NOT do extensive independent analysis or improvise beyond what the plan specifies
- If your analysis suggests the plan is wrong, incomplete, or needs significant changes: STOP and EXIT immediately with a clear explanation of the discrepancy
- Minor clarifications are OK; reimagining the approach is NOT

EXECUTION RULES:
- Execute ALL tasks to completion in this single session
- Do NOT pause for review checkpoints—sandboxed sessions cannot be resumed
- Run continuously until the entire plan is complete or you hit a blocking error

COMMIT PROTOCOL (executing-plans does NOT handle this, you must do it yourself):
- After completing each task and its verification passes, create a git commit
- Use descriptive commit messages that reference the task
- Stage only the files changed for that task
- This allows progress tracking and easy rollback if needed
- NEVER commit plan or design documents (docs/plans/*) to the branch unless they are already tracked in git. You may read them and update them, but do not git add them if they are untracked.

COMPLETION PROTOCOL:
- Do NOT use finishing-a-development-branch skill—it requires interactive input which is unavailable
- After all tasks complete and final verification passes, just exit
- The outer session will handle cleanup and next steps

Sandbox constraints:
- Write access: /tmp/[PROJECT]-[FEATURE] and original project directory
- Read access: system binaries
- Network: Available
- CPU/IO: deprioritized (lowest scheduling priority); heavy workloads are fine but will yield to the host, so expect slower execution while the host is busy
- ~/.ssh/known_hosts is available (read-only), but private keys are NOT mounted
- Do NOT attempt to access ~/.aws or paths outside the worktree
[EXTRA_BIND_BLOCK]"
```

When `SANDBOX_EXTRA_BIND_DIRS` is set, append a line to the sandbox constraints section of the prompt above: `- Read-only access: /path/one, /path/two (extra bind directories)` (substituting the actual paths). When `SANDBOX_EXTRA_BIND_DIRS` is not set, omit `[EXTRA_BIND_BLOCK]` entirely.

### Monitoring Progress

The sandboxed claude process runs non-interactively, so the background task output file will be empty or minimal. **Use the subagent's conversation log instead.**

The subagent's logs are at `~/.claude/projects/-tmp-[PROJECT]-[FEATURE]/`. Find the active session:

```bash
ls -lt ~/.claude/projects/-tmp-[PROJECT]-[FEATURE]/*.jsonl | head -1
```

Monitor recent tool calls and commands:

```bash
# Recent bash commands being run
tail -c 20000 ~/.claude/projects/-tmp-[PROJECT]-[FEATURE]/<SESSION>.jsonl | grep -oE '"command":"[^"]{0,100}' | tail -10

# Check for git commits
grep -o '"command":"git[^"]*commit[^"]*' ~/.claude/projects/-tmp-[PROJECT]-[FEATURE]/<SESSION>.jsonl

# Check git status for file changes
git -C /tmp/[PROJECT]-[FEATURE] status --short
```

To verify the sandbox process is still running:

```bash
ps aux | grep -E "bwrap|claude.*dangerously" | grep -v grep
```

### Step 4: Report results and present options

After the sandboxed process exits:

```bash
git -C /tmp/[PROJECT]-[FEATURE] log --oneline main..HEAD
git -C /tmp/[PROJECT]-[FEATURE] diff main..HEAD --stat
```

Report the branch name, number of commits, and diff summary to the operator.

**Present cleanup options as a structured choice:**

1. **Clean up worktree** - Remove `/tmp/[PROJECT]-[FEATURE]`, keep branch for later review
2. **Keep worktree** - Leave everything in place for manual inspection
3. **Merge to main** - Clean up worktree and merge branch to main
4. **Create PR** - Clean up worktree and push branch for PR

For cleanup (options 1, 3, 4):

```bash
rm -rf /tmp/[PROJECT]-[FEATURE]
git worktree prune
```

The branch remains available with `git checkout sandbox/[FEATURE]` or `git log sandbox/[FEATURE]`.

**If cleanup options cannot be presented interactively** (e.g., the operator asked to run without prompts), default to option 1: clean up the worktree but always preserve the branch.

## Error Handling

| Error                                   | Action                                               |
| --------------------------------------- | ---------------------------------------------------- |
| Sandbox verification fails (Step 1)     | Run setup script                                     |
| `setting up uid map: Permission denied` | Setup script handles this automatically              |
| `SANDBOX_WORK_DIR is required`          | Create worktree first (Step 2)                       |
| Task failed inside sandbox              | Review branch commits, fix plan or retry             |
| Permission denied on file               | File outside allowed paths—sandbox working correctly |
| Network error                           | Check if --unshare-net accidentally set              |
| Tool not found                          | Add --ro-bind for tool's install path                |

## Example Session

```
You: Execute the plan in docs/plans/2025-02-03-auth-system.md using the sandbox

Claude: I'm using the sandboxed-executing-plans skill to run executing-plans
inside a bubblewrap sandbox.

Verifying sandbox is ready...
✓ sandbox ready

Creating worktree at /tmp/myproject-ft-1234-auth-system...
✓ worktree created on branch sandbox/ft-1234-auth-system

Dispatching sandboxed subagent...

You: Check progress

Claude: Checking subagent logs...
- Recent commands: go build, go test, git commit
- 3 commits so far (Tasks 1-3 complete)
- Working on Task 4 (proxy/server.go modified)
- Process still running (PID 12345)

[Later, subagent exits]

Sandboxed execution complete. Summary:
- Branch: sandbox/ft-1234-auth-system
- 6 commits (one per task)
- All tests passing

What would you like to do?
1. Clean up worktree (keep branch)
2. Keep worktree for inspection
3. Merge to main
4. Create PR

You: 1

Claude: Cleaned up worktree. Branch remains available:
  git log sandbox/ft-1234-auth-system
  git checkout sandbox/ft-1234-auth-system
```

## When to Use This vs. Plain executing-plans

| Scenario                   | Use                                    |
| -------------------------- | -------------------------------------- |
| Linux with bwrap available | `sandboxed-executing-plans` (default)  |
| macOS or Windows           | `executing-plans` (no bwrap available) |

## Debugging

### Verify sandbox constraints (from inside)

```bash
~/.claude/skills/sandboxed-executing-plans/scripts/verify-sandbox
```

### Find missing bindings

When tools fail inside sandbox, use strace to find what's missing:

```bash
strace -e trace=open,openat,stat,statx,access -o /tmp/strace.log claude
grep ENOENT /tmp/strace.log | head -20
```

Add `--ro-bind` or `--ro-bind-try` for missing paths in `~/.claude/skills/sandboxed-executing-plans/scripts/claude-sandbox`.

## Platform Support

| Platform | Support                          |
| -------- | -------------------------------- |
| Linux    | ✅ Full support                  |
| macOS    | ❌ Use `executing-plans` instead |
| WSL2     | ⚠️ May work, needs testing        |

## References

- [Bubblewrap](https://github.com/containers/bubblewrap)
- [Senko's sandboxing post](https://blog.senko.net/sandboxing-ai-agents-in-linux)
- `superpowers:executing-plans` — the skill that runs inside the sandbox
