---
name: sandboxed-task
description: Use when dispatching a Claude subagent task inside an isolated sandbox for safe, contained execution
---

# Sandboxed Task Execution

Dispatch a subagent inside a bubblewrap sandbox to run any task with git worktree isolation. This skill is the canonical reference for all sandbox infrastructure — setup, monitoring, error handling, debugging, and cleanup. Specialized variants like `sandboxed-executing-plans` consume this skill's scripts and reference its documentation for those shared concerns.

**Announce at start:** "I'm using the sandboxed-task skill to run a task inside a bubblewrap sandbox."

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ OUTER SESSION (you are here, unsandboxed)                   │
│                                                             │
│  1. Verify sandbox is ready (or run setup)                  │
│  2. Create worktree in /tmp for isolation                   │
│  3. Gather task details interactively                       │
│  4. Dispatch sandboxed subagent ────────────────────────┐   │
│     │                                                   │   │
│     │   ┌────────────────────────────────────────────┐  │   │
│     │   │ SANDBOXED SUBAGENT (bwrap jail)            │  │   │
│     │   │                                            │  │   │
│     │   │  Task from caller's description            │  │   │
│     │   │     ├─ Works autonomously on the task      │  │   │
│     │   │     ├─ Commits after meaningful progress   │  │   │
│     │   │     └─ Exits when done or blocked          │  │   │
│     │   │                                            │  │   │
│     │   │  Sandbox constraints:                      │  │   │
│     │   │  • Read-write: original project path       │  │   │
│     │   │  • Read-write: worktree path in /tmp       │  │   │
│     │   │  • Read-only: extra dirs from              │  │   │
│     │   │    SANDBOX_EXTRA_BIND_DIRS                  │  │   │
│     │   │  • Network: allowed                        │  │   │
│     │   │  • CPU/IO: deprioritized (nice 19)         │  │   │
│     │   │  • --dangerously-skip-permissions          │  │   │
│     │   └────────────────────────────────────────────┘  │   │
│     │                                                   │   │
│     ←─────────────── Returns results ───────────────────┘   │
│                                                             │
│  5. Report results, clean up worktree, leave branch         │
└─────────────────────────────────────────────────────────────┘
```

## Setup

Run the setup script once per machine. It handles all prerequisites (bwrap, AppArmor, claude CLI):

```bash
sudo ~/.claude/skills/sandboxed-task/scripts/setup-claude-sandbox
```

The setup script will:

- Check that bwrap and claude CLI are installed
- Test if bwrap works (detects AppArmor issues)
- Automatically run AppArmor configuration if needed (requires sudo)

## Execution Protocol

### Step 1: Verify sandbox is ready

```bash
SANDBOX_WORK_DIR=/tmp ~/.claude/skills/sandboxed-task/scripts/claude-sandbox --version
```

If this fails, run the setup script (see above). Do NOT proceed until setup completes successfully.

### Step 2: Create worktree

Create an isolated worktree in `/tmp` before launching the sandbox. This keeps your main working tree untouched.

```bash
git worktree add /tmp/[PROJECT]-[FEATURE] -b sandbox/[FEATURE]
```

Replace `[PROJECT]` with the project name and `[FEATURE]` with a descriptive feature name. Always use the `sandbox/` prefix for branch names — this makes it easy to identify and clean up sandbox-created branches.

If there's a task ID visible in the conversation (Linear ticket like `FT-3649`, GitHub issue, etc.), include it in the branch name: `sandbox/ft-3649-add-rate-limiting`.

### Step 3: Gather task details and dispatch

#### Gather task details

Before dispatching the subagent, gather the task details from the caller interactively using a structured question.

**Task description (required)** — Ask: "What task should the sandboxed subagent perform?"

This is the only required input. After receiving the task description, ask the following as follow-ups:

**Skills to invoke (optional)** — Ask: "Should the subagent use any specific skills? (e.g., 'superpowers:test-driven-development', 'code-review') Press enter to skip."

**Constraints (optional)** — Ask: "Any constraints on the task? (e.g., 'only modify files in pkg/auth/', 'use the testify library') Press enter to skip."

**Branch name suffix (optional)** — If not already derived from context, ask: "Branch name suffix? (Press enter to auto-derive from task description.)" If a task ID is visible in the conversation, include it in the derived name.

#### Build prompt and dispatch

Run `claude-sandbox` with the worktree path. Replace `[PROJECT]`, `[FEATURE]`, `[TASK_DESCRIPTION]`, and the optional sections as described below.

If the task needs read-only access to directories outside the project tree, set `SANDBOX_EXTRA_BIND_DIRS` to a comma-separated list of absolute paths. These directories will be mounted read-only inside the sandbox. This variable is optional and can be omitted when not needed.

The sandbox runs at the lowest CPU priority (nice 19) and idle I/O scheduling class, so builds, test loops, and load generators inside the jail yield to interactive use on the host. Children inherit the niceness and cannot renice themselves back down. Set `SANDBOX_NICE=0` to run at normal priority (e.g., for time-sensitive benchmarks).

```bash
SANDBOX_SOURCE_DIR="$PWD" SANDBOX_WORK_DIR="/tmp/[PROJECT]-[FEATURE]" \
SANDBOX_EXTRA_BIND_DIRS="/path/one,/path/two" \
  ~/.claude/skills/sandboxed-task/scripts/claude-sandbox -p "You are running inside a bubblewrap sandbox.

ENVIRONMENT:
- Working directory: /tmp/[PROJECT]-[FEATURE] (worktree, read-write)
- Original project: $PWD (read-write, for git worktree compatibility)
- You are on branch: sandbox/[FEATURE]

TASK:
[TASK_DESCRIPTION]

[SKILLS_BLOCK]

[CONSTRAINTS_BLOCK]

EXECUTION RULES:
- Work until the task is complete or you hit a blocking error
- Stay within the scope of the task description and any stated constraints. If the task requires changes significantly beyond what was described, stop and exit with an explanation
- If you encounter an issue that requires a decision you cannot make, stop and exit with a clear explanation

COMMIT PROTOCOL:
- Commit after each logical change (one function, one test suite, one config change). Avoid both single-file micro-commits and monolithic end-of-task dumps
- Use descriptive commit messages
- Stage only the files relevant to what you changed
- NEVER commit plan or design documents (docs/plans/*) to the branch unless they are already tracked in git

COMPLETION PROTOCOL:
- Do NOT use finishing-a-development-branch skill—it requires interactive input which is unavailable
- After the task is complete, just exit
- The outer session will handle cleanup and next steps

SANDBOX CONSTRAINTS:
- Write access: /tmp/[PROJECT]-[FEATURE] and original project directory
- Read access: system binaries
- Network: Available
- CPU/IO: deprioritized (lowest scheduling priority); heavy workloads are fine but will yield to the host, so expect slower execution while the host is busy
- ~/.ssh/known_hosts is available (read-only), but private keys are NOT mounted
- Do NOT attempt to access ~/.aws or paths outside the worktree
[EXTRA_BIND_BLOCK]"
```

**Variable section rules:**

- `[TASK_DESCRIPTION]` — always injected from the gathered task description.
- `[SKILLS_BLOCK]` — only include if skills were specified. Format: `SKILLS:\nUse [SKILL] to approach this task.` If multiple skills, list each on its own line.
- `[CONSTRAINTS_BLOCK]` — only include if constraints were specified. Format: `CONSTRAINTS:\n- [CONSTRAINT_1]\n- [CONSTRAINT_2]`
- `[EXTRA_BIND_BLOCK]` — only include if `SANDBOX_EXTRA_BIND_DIRS` is set. Format: `- Read-only access: /path/one, /path/two (extra bind directories)`
- If a variable section was not provided by the caller, omit it entirely (do not include the placeholder or an empty section header).

### Monitoring Progress

The sandboxed claude process runs non-interactively, so the background task output file will be empty or minimal. **Use the subagent's conversation log instead.**

The subagent's logs are at `~/.claude/projects/-tmp-[PROJECT]-[FEATURE]/`. Find the active session:

```bash
ls -lt ~/.claude/projects/-tmp-[PROJECT]-[FEATURE]/*.jsonl | head -1
```

Monitor recent tool calls and commands:

```bash
# recent bash commands being run
tail -c 20000 ~/.claude/projects/-tmp-[PROJECT]-[FEATURE]/<SESSION>.jsonl | grep -oE '"command":"[^"]{0,100}' | tail -10

# check for git commits
grep -o '"command":"git[^"]*commit[^"]*' ~/.claude/projects/-tmp-[PROJECT]-[FEATURE]/<SESSION>.jsonl

# check git status for file changes
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
| Task failed inside sandbox              | Review branch commits, fix and retry                 |
| Permission denied on file               | File outside allowed paths—sandbox working correctly |
| Network error                           | Check if --unshare-net accidentally set              |
| Tool not found                          | Add --ro-bind for tool's install path                |

## Example Session

```
You: Add rate limiting to the API — run it in a sandbox

Claude: I'm using the sandboxed-task skill to run a task inside a bubblewrap
sandbox.

Verifying sandbox is ready...
✓ sandbox ready

What task should the sandboxed subagent perform?

You: Add rate limiting middleware to all API endpoints. Use a token bucket
algorithm with per-client limits stored in Redis. Add configuration for
rate limits per endpoint group.

Claude: Should the subagent use any specific skills? (e.g.,
'superpowers:test-driven-development') Press enter to skip.

You: superpowers:test-driven-development

Claude: Any constraints on the task? (e.g., 'only modify files in pkg/auth/')
Press enter to skip.

You: Only modify files under internal/api/ and internal/ratelimit/. Use the
existing Redis client in internal/redis/client.go.

Claude: Creating worktree at /tmp/myproject-add-rate-limiting...
✓ worktree created on branch sandbox/add-rate-limiting

Dispatching sandboxed subagent...

You: Check progress

Claude: Checking subagent logs...
- Recent commands: go test ./internal/ratelimit/..., git commit
- 2 commits so far
- Working on endpoint middleware integration
- Process still running (PID 54321)

[Later, subagent exits]

Sandboxed execution complete. Summary:
- Branch: sandbox/add-rate-limiting
- 4 commits
- Files changed: 8 (3 new, 5 modified)
- All tests passing

What would you like to do?
1. Clean up worktree (keep branch)
2. Keep worktree for inspection
3. Merge to main
4. Create PR

You: 4

Claude: Cleaned up worktree. Pushing branch and creating PR...
PR created: https://github.com/org/myproject/pull/42
```

## When to Use This vs. Others

| Scenario                                                       | Use                         |
| -------------------------------------------------------------- | --------------------------- |
| Any general task (feature, bugfix, refactor), Linux with bwrap | `sandboxed-task`            |
| Executing a specific implementation plan, Linux with bwrap     | `sandboxed-executing-plans` |
| No sandbox available (macOS/Windows) or sandbox not needed     | Direct execution (no skill) |

## Debugging

### Verify sandbox constraints (from inside)

```bash
~/.claude/skills/sandboxed-task/scripts/verify-sandbox
```

### Find missing bindings

When tools fail inside sandbox, use strace to find what's missing:

```bash
strace -e trace=open,openat,stat,statx,access -o /tmp/strace.log claude
grep ENOENT /tmp/strace.log | head -20
```

Add `--ro-bind` or `--ro-bind-try` for missing paths in `~/.claude/skills/sandboxed-task/scripts/claude-sandbox`.

## Platform Support

| Platform | Support                                 |
| -------- | --------------------------------------- |
| Linux    | Full support                            |
| macOS    | Use direct execution instead (no bwrap) |
| WSL2     | May work, needs testing                 |

## References

- [Bubblewrap](https://github.com/containers/bubblewrap)
- [Senko's sandboxing post](https://blog.senko.net/sandboxing-ai-agents-in-linux)
- `sandboxed-executing-plans` — the plan-specific variant of this skill
