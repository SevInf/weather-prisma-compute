---
name: prisma-scaffold-project-workspace
description: Use when setting up a new multi-repo project workspace from a
  Linear project, creating agent skills for coordinated repo work, or
  bootstrapping Claude Code Agent Teams for cross-repo development.
---

# Multi-Repo Project Workspace Bootstrapper

## Overview

Guided workflow to create a unified project workspace from a Linear project.
Discovers repos, fetches documentation, scaffolds folder structure, generates
Claude Code agent skills, and configures permissions — producing a workspace
ready for both single-session and Agent Teams workflows.

## When to Use

- Setting up a new project workspace for a Linear project
- Creating agent skills for multi-repo coordination
- Bootstrapping Claude Code Agent Teams for cross-repo development

**Not for:** Single-repo projects, projects without a Linear project, runtime orchestration (use the generated /architect or /team skills for that).

## Pre-conditions

- Linear MCP tools available (for fetching project details)
- Notion MCP tools available (for fetching linked documentation)
- `git` and `gh` CLI installed
- SSH access to clone repositories

## Phase 1: DISCOVER

### Step 1.1: Accept Linear Project URL

Ask the operator for the Linear project URL.
`https://linear.app/prisma-company/project/project-name-abc123/overview`

### Step 1.2: Fetch Linear Project Details

Use Linear MCP tools to fetch:

1. **Project metadata**: `get_project` — name, description, lead, status
2. **Milestones**: `list_milestones` filtered to this project — names, completion %
3. **Issues**: `list_issues` filtered to this project — titles, status, assignees, PR attachments
4. **Resources**: Check project description and issue attachments for Notion links, repo URLs

From the issues, extract repository references:

- Look at PR attachments: `get_attachment` for each issue with attachments
- PR URLs contain the repo: `github.com/{org}/{repo}/pull/{n}`
- Deduplicate to get the list of involved repositories

Present to user:

- Project summary (name, lead, status)
- Discovered repositories (name, URL, role inferred from issues)
- Milestones with completion %
- Any Notion links found

### Step 1.3: Fetch Notion Documents

For each Notion link found in Linear:

1. Use `notion-fetch` to retrieve the page content
2. Convert to markdown
3. Store in memory for Phase 3

### Step 1.4: Include Ignite Documentation Hub

The **ignite** repo (`git@github.com:prisma/ignite.git`) is always included
as a workspace sub-repo. It is Prisma's internal documentation site and serves
as the canonical home for project documentation.

This repo is NOT discovered from Linear — it is added unconditionally. Add it
to the repository list with role: "Internal documentation site (Fumadocs/Next.js)".

### Step 1.5: Ask for Additional Sources

Ask the operator:

> "I found these documents linked in Linear. Are there additional sources
> I should include? (Notion pages, local files, URLs)"

Options:

1. No, that's everything
2. Yes, here are additional sources (user provides)

Fetch any additional sources provided.

### Step 1.6: Ask for Workspace Location

Ask the operator:

> "Where should I create the project workspace?"

No default — the operator must specify the full path. This keeps the skill
org-portable.

### Step 1.7: Discover Cross-Repo Interfaces

For each pair of repos, ask:

> "How does {repo-A} connect to {repo-B}? (API calls, shared types,
> binary dependencies, env vars, SQL, RPC — or 'no direct connection')"

Skip pairs where the operator says no connection. Record all interfaces
for use in the architect skill and ARCHITECTURE.md.

If the operator says "check the docs" or the Notion documents already
describe the interfaces, extract them from the fetched docs instead
of asking for each pair manually.

## Phase 2: SCAFFOLD

### Step 2.1: Create Directory Structure

```bash
mkdir -p {workspace}/.claude/skills
mkdir -p {workspace}/architecture
```

Note: Per-repo skill directories (`skills/{name}/`) are created in Steps 2.7-2.9.

### Step 2.2: Clone Repositories

For each repo in the final list (discovered from Linear + mandatory ignite):

```bash
cd {workspace}
git clone {repo-ssh-url}
```

After cloning, verify each repo by listing its top-level contents.

### Step 2.3: Read Repo Context

For each cloned repo, read:

1. `AGENTS.md` (if exists) — authoritative conventions
2. `.claude/CLAUDE.md` (if exists) — additional context
3. `README.md` (if exists, fallback) — basic project info

Store this context for skill generation in Steps 2.7-2.9.

### Step 2.4: Detect Tech Stacks

For each cloned repo, check for marker files and record detected stacks:

| File Found                             | Stack  | Allow Rules                                                                         |
| -------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| `package.json` + `bun.lockb`           | Bun    | `bun install`, `bun install *`, `bun test *`, `bun run *`                           |
| `package.json` + `pnpm-lock.yaml`      | pnpm   | `pnpm install`, `pnpm install *`, `pnpm test *`, `pnpm run *`, `pnpm start *`       |
| `package.json` + `package-lock.json`   | npm    | `npm install`, `npm install *`, `npm test *`, `npm run *`                           |
| `package.json` + `yarn.lock`           | yarn   | `yarn install`, `yarn install *`, `yarn test *`, `yarn run *`                       |
| `Cargo.toml`                           | Rust   | `cargo build`, `cargo build *`, `cargo test *`, `cargo check *`, `cargo clippy *`   |
| `Cargo.toml` containing `pgrx`         | pgrx   | Above + `cargo pgrx test *`, `cargo pgrx run *`                                     |
| `Makefile`                             | Make   | `make`, `make *`                                                                    |
| `Dockerfile` or `docker-bake.hcl`      | Docker | `docker build *`, `docker run *`, `docker bake *`, `docker images *`, `docker ps *` |
| `go.mod`                               | Go     | `go *`, `go`, `golangci-lint *`, `gopls *`, `dlv *`                                 |
| `requirements.txt` or `pyproject.toml` | Python | `python *`, `pip install *`, `pytest *`                                             |

Present detected stacks to the operator for confirmation.

### Step 2.5: Generate settings.json (Allow + Deny Rules)

Write `{workspace}/.claude/settings.json` with both allow and deny rules.
This file is committed to git so permissions carry across sessions and
teammates.

Base allow rules (always included):

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "permissions": {
    "allow": [
      "Bash(open *)",
      "Bash(ls *)",
      "Bash(ls)",
      "Bash(which *)",
      "Bash(wc *)",
      "Bash(cat *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(file *)",
      "Bash(stat *)",
      "Bash(pwd)",
      "Bash(date *)",
      "Bash(echo *)",
      "Bash(printf *)",
      "Bash(find *)",
      "Bash(grep *)",
      "Bash(xargs *)",
      "Bash(curl *)",
      "Bash(jq *)",
      "Bash(sort *)",
      "Bash(uniq *)",
      "Bash(diff *)",
      "Bash(mkdir *)",
      "Bash(cp *)",
      "Bash(mv *)",
      "Bash(touch *)",
      "Bash(basename *)",
      "Bash(dirname *)",
      "Bash(realpath *)",
      "Bash(base64 *)",
      "Bash(* --version)",
      "Bash(* --help)",

      "Bash(git *)",
      "Bash(gh *)",

      "mcp__linear__*",
      "mcp__axiom__*",
      "mcp__Notion__*",
      "mcp__context7__*",
      "mcp__Context7__*",
      "mcp__plugin_beads_beads__*",
      "mcp__plugin_claude-mem_mcp-search__*",

      "WebFetch(domain:github.com)",
      "WebFetch(domain:deepwiki.com)",
      "WebFetch(domain:raw.githubusercontent.com)"
    ],
    "deny": [
      "Bash(git merge main)",
      "Bash(git merge main *)",
      "Bash(git merge * main)",
      "Bash(git reset --hard *)",
      "Bash(git clean *)",
      "Bash(rm -rf *)",
      "Bash(rm -r *)",
      "Bash(gh pr merge *)",
      "Bash(gh pr close *)",
      "Bash(gh issue close *)",
      "Bash(* --force *)",
      "Bash(* --no-verify *)"
    ]
  }
}
```

Append detected tech stack allow rules (from Step 2.4) to the `allow` array.

Then ask:

> "Are there deploy commands specific to your tooling I should also deny?
> (e.g. `wrangler deploy *`, `kraft deploy *`, `fly deploy *`)"

Add any user-specified deploy denials to the deny list.

Also ask:

> "Are there additional WebFetch domains or MCP servers to allow?"

Add any user-specified domains/servers to the allow list.

### Step 2.6: Generate settings.local.json (Personal Overrides)

Write `{workspace}/.claude/settings.local.json` as a minimal file for
personal overrides that shouldn't be committed (e.g. local MCP servers,
experimental flags). This file is gitignored.

```json
{}
```

The operator can add personal allow/deny overrides here as needed.

### Step 2.7: Generate Per-Repo Skills

For each repo, create `{workspace}/.claude/skills/{short-name}/SKILL.md`.

**Important:** Skills must use directory-based structure (`skills/<name>/SKILL.md`),
not flat files (`skills/<name>.md`). Claude Code only discovers skills in the
`<name>/SKILL.md` directory format.

Before writing, ask the operator to confirm short names:

> "I'll create these skill names. Adjust any that don't look right:
>
> - {repo-dir-1} → /{short-name-1}
> - {repo-dir-2} → /{short-name-2}
> - ..."

Use this template, filled from repo AGENTS.md + discovery:

```
---
name: {repo-short-name}
description: Use when working on {repo-name} — {one-line role}
---

## Identity
You are the {Name} Agent. You own ./{repo-directory}/.

## Repo Context
{2-3 sentences from AGENTS.md/README}

## Key Files
{Key directories and files relevant to this project's scope}

## Conventions
{Build commands, test commands, error handling, coding style from AGENTS.md}

## Collaboration
{How this repo connects to other repos — from interface discovery}

## Important
Always read ./{repo-directory}/AGENTS.md first. It has the authoritative
conventions. This skill provides project-level context on top.
```

### Step 2.8: Generate Ignite Documentation Skill

Write `{workspace}/.claude/skills/ignite/SKILL.md`:

```
---
name: ignite
description: Use when syncing project documentation to the Prisma internal
  docs site (ignite). Handles branching, content placement, and PR creation.
---

## Identity
You are the Ignite Documentation Agent. You own ./{ignite-directory}/.

## Repo Context
Ignite is the Prisma internal documentation site, built with Fumadocs
(Next.js) and linted with markdownlint. Documentation is organized by team
under `docs/` (engineering, product, terminal, metal, infra, developer-relations).

## Documentation Sync Workflow

When project work produces documentation that should live in ignite:

1. **Branch**: Create a branch off `main` in the ignite repo:
   `git checkout -b docs/{project-slug}/{description}`
2. **Place content**: Add or update MDX files in the appropriate
   `docs/<team>/` subdirectory. Follow ignite conventions:
   - Use `.mdx` extension
   - Add frontmatter with at least `title`
   - Use relative links between documents
   - Use Mermaid code fences for diagrams
3. **Update sidebar**: Add the page slug to the relevant `meta.json`
   `pages` array
4. **Lint**: Run `pnpm lint` and fix any violations
5. **Commit & push**: Commit with a clear message, push the branch
6. **PR**: Create a PR targeting `main` using `gh pr create`

## What Gets Synced
- Architecture Decision Records (ADRs)
- Technology documentation
- Project overviews and status pages
- Runbooks and operational guides
- Any documentation generated during project work that has
  lasting value beyond the project workspace

## Conventions
- Read ./ignite/AGENTS.md first — it has authoritative conventions
- Templates live in `templates/` at the repo root
- ADRs go in `docs/<team>/technology/adrs/` — see AGENTS.md for the
  full ADR creation process
- Never commit directly to main — always branch and PR
```

### Step 2.9: Generate Architect Skill (includes ignite coordination)

Write `{workspace}/.claude/skills/architect/SKILL.md`:

```
---
name: architect
description: Use for cross-repo coordination, system-level planning,
  and multi-repo implementation. Acts as team lead in agent teams mode.
---

## Identity
You are the {Project Name} Architect. You coordinate work across all
{N} repos that make up this system. You never work directly in a repo
without first understanding the full impact across the system.

## Responsibilities
1. RESEARCH: Read across all repos to understand current state.
   **Before planning any new work**, check ./ignite/ for existing
   documentation relevant to the task — architecture docs, ADRs,
   technology pages, and runbooks may already capture decisions,
   constraints, or prior art that should inform the plan.
2. PLAN: Design changes that span repos, identify ordering/dependencies
3. DELEGATE: Spawn repo-specific subagents or teammates
   (Agent Teams) to implement changes
4. VALIDATE: After implementation, verify cross-repo consistency —
   check interfaces match, types align, configs are compatible
5. DOCUMENT: When work produces documentation (ADRs, architecture docs,
   runbooks, technology pages), delegate to the ignite agent to sync
   it to the internal docs site via branch + PR

## Architecture Knowledge
- Read ./architecture/ARCHITECTURE.md for the full system map
- Read ./architecture/LINEAR-PROJECT.md for project status
- Each repo has its own AGENTS.md — always consult before delegating

## Cross-Repo Interfaces
{Fill from discovered interfaces in Phase 1 — API contracts,
 shared types, function signatures, env vars, binary dependencies.
 Group by repo pair.}

## Delegation Patterns

### Single Session
- Set working directory to the specific repo path
- Include the repo skill content in the prompt
- Always specify whether you want research or implementation
- Review results before delegating the next repo

### Agent Teams (Team Lead)
- Spawn teammates with repo-specific context from skills
- Create tasks with clear dependencies
- Require plan approval for changes touching cross-repo interfaces
- After all teammates complete, validate interface consistency

## Validation Checklist
After any cross-repo change:
{Generate checklist items from discovered interfaces. Examples:
 - [ ] SQL function signatures match between extension and callers
 - [ ] API endpoint contracts match between server and consumers
 - [ ] Shared type definitions are consistent
 - [ ] Config/env vars referenced in one repo are set by another}
```

### Step 2.10: Generate Team Skill

Write `{workspace}/.claude/skills/team/SKILL.md`:

```
---
name: team
description: Bootstrap a multi-repo agent team for parallel work.
  Creates architect as lead + repo-specific teammates.
---

## What This Does
Creates an Agent Team with the architect as team lead and
repo-specific teammates. Each teammate gets context from their repo skill.

## Pre-conditions
Agent teams must be enabled. Verify .claude/settings.json has:
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
(This is set by default during workspace scaffolding in Step 2.5.)

## Usage
Describe your task and which repos are involved. Examples:
{Generate 2-3 example invocations relevant to this specific project,
 based on Linear issues and cross-repo interfaces discovered.}

## Team Topology

### Lead: Architect
- Reads ARCHITECTURE.md and LINEAR-PROJECT.md
- Creates task list with dependencies
- Spawns only the teammates needed for the task
- Validates cross-repo consistency after completion

### Teammates (spawned as needed)
{List each repo short name and one-line role}

### Spawn Guidelines
- Only spawn teammates for repos that need changes
- Use plan approval for changes touching cross-repo interfaces
- 5-6 tasks per teammate is the sweet spot

## Teammate Spawn Prompts
When creating teammates, use the content from the corresponding
skill file (.claude/skills/<repo>/SKILL.md) as the spawn prompt, prefixed
with the current task context.
```

### Step 2.11: Generate CLAUDE.md

Write `{workspace}/.claude/CLAUDE.md` using this template. Fill placeholders
from Linear data and discovery:

```
# {Project Name}

## Project Summary
{2-3 sentence description from Linear project}

## Repository Map
| Repo | Path | Language | Role |
|------|------|----------|------|
{row per repo, discovered from Linear + cloned repos}

## How Repos Connect
{discovered cross-repo interfaces as text diagram}

## Architecture Documentation
Read ./architecture/ARCHITECTURE.md for the full system map.
Read ./architecture/LINEAR-PROJECT.md for current project status.

## Pre-Planning: Check Ignite First
**Before planning any new work**, search ./ignite/docs/ for existing
documentation relevant to the task. ADRs, architecture docs, technology
pages, and runbooks may capture prior decisions, constraints, or context
that should inform the plan. Grep for keywords related to the task area.
Do not duplicate or contradict existing documented decisions without
explicitly calling out the deviation.

## Skills (Single Session)
Invoke {list skills} for focused repo work. Each skill loads
repo-specific context and conventions.

## Agent Teams (Parallel Work)
Invoke /team to bootstrap a multi-repo agent team.

## Documentation Sync (Ignite)
The ignite repo (./ignite/) is the Prisma internal docs site. When project
work produces documentation (ADRs, architecture docs, runbooks, tech pages):
1. Use /ignite skill or delegate to ignite agent
2. Branch off main: `docs/{project-slug}/{description}`
3. Add MDX files to the correct `docs/<team>/` directory
4. Run `pnpm lint` in the ignite repo
5. Push and create a PR targeting main
Never commit directly to ignite's main branch.

## Linear Project Tracking

This workspace tracks progress in the Linear project
**[{Project Name}]({Linear project URL})**.
Team: **{Team Name} ({Team Key})**.

### When to Update Linear
- **At session end**: If the session produced PRs, bugfixes, or shipped
  features, create or update Linear issues to reflect the work completed.
- **Sub-tasks**: Create sub-tasks under the relevant parent issue for
  discrete pieces of work (one sub-task per fix/PR, not one per commit).
- **Status accuracy**: Mark issues Shipped only when the PR is merged.
  Use In Progress for open PRs awaiting review/merge.
- **PR links**: Always attach PR links to Linear issues using the
  `links` field when creating issues.
- **Comments**: Add summary comments to parent issues when completing a
  batch of related sub-tasks, providing context on root cause and fix chain.

### Issue Conventions
- Use `type/bug` label for bugfixes, `type/chore` for maintenance tasks
- Add `unplanned/not-scoped` label for work discovered during a session
  that wasn't pre-planned
- Reference Linear tickets in PR descriptions with magic words:
  `Fixes {KEY}-XXX`, `Closes {KEY}-XXX`, `Resolves {KEY}-XXX`, or
  `Part of {KEY}-XXX` (for partial work)

## Universal Rules
- Never deploy to production
- Never push without explicit permission
- NEVER merge anything into main - not via git merge, not via gh pr merge.
  Merges to main are human-only operations.
- Each repo has its own AGENTS.md with repo-specific conventions -
  READ IT before making changes
- Changes spanning repos require architect coordination

## Git & PR Rules

### Branch Policy
- NEVER work directly on `main`. Always work on a feature branch.
- Before starting work, verify you are NOT on main:
  `git rev-parse --abbrev-ref HEAD` — if it returns `main`, stop and
  create/checkout a feature branch first.
- Branch naming: use the Linear issue branch name when available

### Pull Request Policy
- **Every PR must reference a Linear task.** Do not create a PR until
  a corresponding Linear issue exists. If no issue exists yet, create
  one first (see Linear Project Tracking above).
- Before creating a PR, ALWAYS check:
  1. `git log main..HEAD` — confirm there are commits to submit
  2. `gh pr list --head $(git branch --show-current)` — confirm no
     existing PR for this branch
  3. `git fetch origin main && git merge-base --is-ancestor HEAD origin/main` —
     confirm branch has NOT already been merged (exit code 0 = merged,
     do NOT create PR)
- Use `gh pr create` with a clear title and description
- Always reference the Linear ticket in the PR description using
  Linear magic words: `Fixes {KEY}-XXX`, `Closes {KEY}-XXX`,
  `Resolves {KEY}-XXX`, or `Part of {KEY}-XXX` (for partial work)
- Never force-push PR branches

### PR Comment Responses
- When reading PR comments via `gh api` or `gh pr view`:
  1. Read the FULL comment thread for context
  2. Understand what the reviewer is asking
  3. Check the relevant code to verify the comment is valid/applicable
  4. If the comment references code you haven't read, READ IT FIRST
  5. Never blindly implement a suggestion — verify it makes sense
  6. If a comment is unclear or seems incorrect, flag it rather than
     guessing the intent
```

**Target: under 100 lines.** This loads into every session and teammate
context window.

### Step 2.12: Create .gitignore

Write `{workspace}/.gitignore`:

```
# Cloned repos (tracked independently)
{one line per repo directory}

# Architecture has its own git repo
architecture/

# Personal settings
.claude/settings.local.json

# OS files
.DS_Store
```

### Step 2.13: Initialize Git and Commit

```bash
cd {workspace}
git init
git add .gitignore .claude/
git commit -m "init project workspace with skills and permissions"
```

## Phase 3: DOCUMENT

### Step 3.1: Write Fetched Docs to Architecture

For each Notion/external document fetched in Phase 1:

1. Write to `{workspace}/architecture/{NN}-{slug}.md`
2. Number sequentially (01-, 02-, etc.)
3. Include a header noting the source URL and fetch date

### Step 3.2: Write ARCHITECTURE.md

Write `{workspace}/architecture/ARCHITECTURE.md` containing:

1. **System Overview** — text-based diagram showing all repos and their roles
2. **Repository Responsibilities** — table with repo, language, and primary role
3. **Data Flow** — how data moves between repos (text arrows)
4. **Cross-Repo Interface Contracts** — detailed contracts from discovery:
   - API endpoints (HTTP method, path, request/response)
   - RPC methods (name, parameters, return type)
   - SQL functions (signature, who calls them)
   - Env vars (name, who sets, who reads)
   - Binary dependencies (what's packaged where)
5. **Key Workflows** — end-to-end flows that span repos

Source: Linear project data + fetched docs + user-provided interface info.

### Step 3.3: Write LINEAR-PROJECT.md

Write `{workspace}/architecture/LINEAR-PROJECT.md` containing:

1. **Project Info** — name, lead, team, status, Linear URL
2. **Milestones** — name, completion %, list of issues per milestone
3. **Issue Summary** — grouped by status (Done, In Progress, Todo)
4. **Phase Breakdown** — if the project has phases, list them with status

Source: Linear project data fetched in Phase 1.

### Step 3.4: Initialize Architecture Git Repo

```bash
cd {workspace}/architecture
git init
git add -A
git commit -m "init architecture docs for {project-name} workspace"
```

### Step 3.5: Final Verification

1. List the full workspace structure (2-3 levels deep)
2. Confirm all expected files exist:
   - `.claude/CLAUDE.md`
   - `.claude/settings.json`
   - `.claude/settings.local.json`
   - `.claude/skills/architect/SKILL.md`
   - `.claude/skills/team/SKILL.md`
   - `.claude/skills/ignite/SKILL.md`
   - `.claude/skills/{short-name}/SKILL.md` for each repo
   - `architecture/ARCHITECTURE.md`
   - `architecture/LINEAR-PROJECT.md`
   - `.gitignore`
3. Confirm all repos cloned successfully
4. Present summary to user

## Phase 4: REFLECT

After setup is complete, review the process for improvements.

### Step 4.1: Identify Improvements

Review the setup just completed. Look for:

- Steps that required workarounds not covered by this skill
- Questions that should have been asked but weren't
- Tech stack detections that were missing
- Permission rules that needed manual addition
- Template sections that produced unclear or poor output
- Ordering issues (a step needed info from a later step)

Do NOT flag:

- Project-specific details (those belong in the workspace, not this skill)
- One-off edge cases unlikely to recur

### Step 4.2: Propose Changes

If improvements were identified:

1. Present each proposed change with:
   - **What happened**: the friction point or gap
   - **Proposed fix**: the specific edit to this skill
   - **Rationale**: why this is a general improvement, not project-specific

2. Wait for explicit user approval

3. If approved, edit this skill file:
   `~/.claude/skills/prisma-scaffold-project-workspace/SKILL.md`

4. Commit the change:
   ```bash
   git add ~/.claude/skills/prisma-scaffold-project-workspace/SKILL.md
   git commit -m "improve: {concise description of what changed and why}"
   ```

If no improvements identified, say so:

> "Setup completed cleanly — no skill improvements needed."

### Guard Rails

- NEVER edit this skill without showing the diff and getting approval
- Changes should be minimal — fix the specific gap, don't refactor
- If multiple improvements found, present as a batch for single approval
