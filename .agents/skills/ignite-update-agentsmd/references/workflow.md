# AGENTS.md cleanup and refactor workflow

Procedure for a full review, trim, or decomposition of an existing AGENTS.md. The content standard these edits must meet is the authoring rules in the skill body; the detection signals and relocation test are in [heuristics.md](heuristics.md).

## Pre-conditions

1. **Target `AGENTS.md` by default.** Operate on `CLAUDE.md` only if the operator explicitly names it.
2. **Locate the target.**
   1. If the operator named a path, use it.
   2. If exactly one `AGENTS.md` is relevant to the request, use it.
   3. If none exists, build one from the authoring rules in the skill body, then resume at Step 5.
   4. If several exist and the target is unclear, ask which one, recommending the repository-root file.

## Workflow

Run the steps in order. Steps 3 and 4 both edit files but under different rules: read the mutation contract before touching anything.

### Step 1: Read the target and the repository shape

1. Read the full target `AGENTS.md`, plus any nested `AGENTS.md` files already in the hierarchy.
2. List the immediate subdirectories of the repository (depth 1 to 2). This is the set of candidate landing sites for relocation. Do not invent folders that are absent.
3. Survey the existing documentation tree (for example `docs/`, team or package READMEs) to learn where this project keeps non-agent documentation. Do not impose a structure: learn the one already in use, so explanatory content can be pointed at its home rather than left in `AGENTS.md`.

### Step 2: Run the signal pass

1. Read [heuristics.md](heuristics.md) for the signal table and the relocation test.
2. Walk the target file section by section. For each section, record which signal it matches and the action class that signal implies: `rewrite`, `relocate`, or `gap-fill`.

### Step 3: Apply rewrites and gap-fills in place

1. Apply every `rewrite` and `gap-fill` action directly to the target file, holding the authoring rules from the skill body.
2. Do not prompt for these. They are in-place and reversible through version control, and they are reported in the closing summary.

### Step 4: Propose relocations, then apply on sign-off

1. For each `relocate` candidate, confirm both parts of the relocation test in [heuristics.md](heuristics.md): the guidance is scoped exclusively to one existing folder, and that folder exists. A candidate that fails either part stays in the root file.
2. Present the full set of surviving moves as a proposal: for each move, give the source section, the target `folder/AGENTS.md`, and the one-line reasoning that satisfies the test.
3. **In interactive sessions, wait for the operator's go-ahead** before writing any relocation. **When running headless, or with no operator available to respond,** skip the sign-off and apply the proposed relocations directly, recording each in the closing summary.
4. For each approved or auto-applied move:
   1. Remove the section from the root file.
   2. Write it into the target folder's `AGENTS.md`, creating that file if absent.
   3. Drop a sibling `CLAUDE.md` symlink to `AGENTS.md` in that folder (see Step 5 for the symlink rules).

### Step 5: Reconcile the CLAUDE.md symlink

The symlink is load-bearing: some agents discover only `CLAUDE.md` when walking the tree, so a nested `AGENTS.md` with no sibling `CLAUDE.md` never loads. Reconcile `CLAUDE.md` against `AGENTS.md` in the root, and in **every** folder that holds an `AGENTS.md` (including any touched by Step 4). Branch on the current state:

1. **No `CLAUDE.md`** present: create a `CLAUDE.md` symlink pointing at the sibling `AGENTS.md`. Apply this silently.
2. **`CLAUDE.md` is a real file with content**: halt and ask. Never clobber it. Offer to fold any unique content into `AGENTS.md`, then replace `CLAUDE.md` with the symlink.
3. **`CLAUDE.md` already symlinks to `AGENTS.md`**: no action.

Symlinks may not survive on filesystems without symlink support. Note this limitation if the operator is on such a platform; do not attempt a copy-based fallback unless asked.

### Step 6: Verify loading

A written file is not a loaded file. Confirm the result actually reaches the agent's context before reporting success:

1. From inside a folder that holds a nested `AGENTS.md`, have the agent enumerate the instruction files currently in its context, plus any files they inject. The nested file and each of its injected includes must appear.
2. A memory or settings _picker_ that lists known file slots is **not** proof — it shows what could load, not what did. Use the agent's own account of its context, or a content check (ask a question only the nested file answers, with no file reads).
3. If a nested file is absent, the cause is almost always a missing `CLAUDE.md` symlink (Step 5) or an injected include that was written as a bare link. Fix and re-check.

### Step 7: Summarise

Report, in one summary:

1. Rewrites and deletions applied in place, grouped by signal.
2. Gap-fills added (commands, scoped pointers).
3. Relocations applied, each as `section -> folder/AGENTS.md`.
4. Symlinks created, and any symlink reconciliation that needs the operator's decision.
5. Verification result: which nested files and injected includes were confirmed in context.

## Mutation contract

| Action class                                  | When applied     | Operator checkpoint                                                                                                                |
| --------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `rewrite` (edit or delete in place)           | Step 3, directly | None; reported in summary                                                                                                          |
| `gap-fill` (add missing commands or pointers) | Step 3, directly | None; reported in summary                                                                                                          |
| `relocate` (move out of the root file)        | Step 4           | Interactive: proposal listed with reasoning, wait for go-ahead. Headless or non-interactive: applied directly, reported in summary |
| Symlink, no existing `CLAUDE.md`              | Step 5, silently | None                                                                                                                               |
| Symlink, real `CLAUDE.md` present             | Step 5           | Halt and ask; never clobber                                                                                                        |
