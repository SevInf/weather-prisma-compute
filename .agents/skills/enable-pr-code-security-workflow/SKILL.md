---
name: enable-pr-code-security-workflow
description: Use when the operator says "enable pr code security workflow on" one or more repositories. Do NOT auto-trigger for general security, GitHub Actions, or workflow discussions.
metadata:
  author: Prisma
  version: "2026.2.1"
---

# PR Code Security Workflow Enabler

## Overview

Automates enabling PR-triggered security workflows (secret detection + code scanning)
on `prisma/` GitHub repositories. Runs a dry-run first to show the operator what would
change, then creates branches and PRs only after explicit confirmation.

## When to Use

- Enabling PR code security on one or more `prisma/` GitHub repos
- Rolling out security scanning workflows across multiple repositories
- "Enable pr code security on `https://github.com/prisma/repo-name`"

**Not for:** Modifying existing security workflows, debugging workflow failures,
managing GitHub Actions secrets, or non-prisma repositories.

## Pre-conditions

- `gh` CLI installed and authenticated with repo access
- Write access to target repositories

## Phase 1: DRY RUN

### Step 1.1: Parse Repository List

Accept one or more GitHub repository URLs or `owner/repo` references from the operator.
Normalize all inputs to `owner/repo` format.

Valid inputs:

- `https://github.com/prisma/cuid-rust`
- `github.com/prisma/cuid-rust`
- `prisma/cuid-rust`

**Reject** any repo not under the `prisma/` org. Report the rejection and continue
with remaining repos.

### Step 1.2: Detect Current User

```bash
gh api user --jq '.login'
```

Cache this — same for all repos.

### Step 1.3: Check Each Repository

For each repository (use parallel subagents when processing multiple repos):

**1. Verify access and get default branch:**

```bash
gh repo view {owner}/{repo} --json name,defaultBranchRef --jq '.defaultBranchRef.name'
```

If the command fails, mark repo as `Error: no access` and skip further checks.

**2. Check push permission:**

```bash
gh api "repos/{owner}/{repo}" --jq '.permissions.push'
```

If `false`, mark repo as `Error: no push access` and skip further checks.

**3. Check if workflow already exists:**

```bash
gh api repos/{owner}/{repo}/contents/.github/workflows/pr-code-security.yml \
  --jq '.name' 2>/dev/null
```

Check the exit code and HTTP status to classify:

- Success (HTTP 200): mark repo as `Already exists`
- HTTP 404: mark repo as `Needs workflow`
- Any other error (403, 429, 5xx): mark repo as `Error: API error` and skip — do not misclassify as "Needs workflow"

### Step 1.4: Present Dry-Run Report

Present a summary table:

| Repository      | Default Branch | Status                           |
| --------------- | -------------- | -------------------------------- |
| `prisma/repo-a` | `main`         | Needs workflow                   |
| `prisma/repo-b` | `main`         | Already exists — skipping        |
| `prisma/repo-c` | —              | Error: no access — skipping      |
| `prisma/repo-d` | `main`         | Error: no push access — skipping |

Then explain what will happen for repos marked "Needs workflow":

> **Changes for each repo:**
>
> - Create branch `infra/add-pr-code-security-{timestamp}` (unique per run for idempotency)
> - Add `.github/workflows/pr-code-security.yml` with secret detection and code scanning jobs
> - Both jobs use reusable workflows from `prisma/.github` (centrally maintained)
> - Open a PR targeting the default branch, assigned to `{current_user}`

Ask for explicit confirmation before proceeding:

> "Proceed with creating PRs for the {N} repositories above?"

**STOP here.** Do not proceed to Phase 2 without user confirmation.

## Phase 2: EXECUTE

Only process repos marked "Needs workflow" from Phase 1.
Use parallel subagents (one per repo) for efficiency.

### Step 2.0: Generate Unique Branch Name

Generate once before processing any repos, reuse for all:

```bash
BRANCH_NAME="infra/add-pr-code-security-$(date +%Y%m%d%H%M%S)"
```

### Step 2.1: Clone, Branch, Add Workflow, Push

For each repo:

```bash
TMPDIR=$(mktemp -d)
gh repo clone {owner}/{repo} "$TMPDIR" -- --depth 1
cd "$TMPDIR"
git checkout -b "$BRANCH_NAME"
mkdir -p .github/workflows
```

Write `.github/workflows/pr-code-security.yml` with this exact content:

```yaml
name: PR Code Security

on:
  pull_request:
    branches: [{ default_branch }]

jobs:
  secret-detection:
    name: Secret Detection
    if: github.event_name == 'pull_request'
    uses: prisma/.github/.github/workflows/secret_detection.yml@main
    secrets: inherit
  code-scanning:
    name: Code Scanning
    if: github.event_name == 'pull_request'
    uses: prisma/.github/.github/workflows/code_scanning.yml@main
```

**IMPORTANT:** `{default_branch}` in the `branches:` trigger must be replaced with
the actual default branch detected in Step 1.3.

Then commit and push:

```bash
git add .github/workflows/pr-code-security.yml
git commit -m "ci(security): add pr code security workflow"
git push origin "$BRANCH_NAME"
```

### Step 2.2: Create Pull Request

```bash
gh pr create \
  --repo {owner}/{repo} \
  --head "$BRANCH_NAME" \
  --base {default_branch} \
  --title "Add PR Code Security Workflow" \
  --body "$(cat <<'EOF'
## Summary

Adds a GitHub Actions workflow that runs on every pull request targeting the default branch:

- **Secret Detection** - reusable workflow from `prisma/.github`
- **Code Scanning** - reusable workflow from `prisma/.github`

Both workflows are maintained centrally in [`prisma/.github`](https://github.com/prisma/.github) and invoked via `uses:` with `secrets: inherit`.

## Why

Ensures all PRs are scanned for leaked secrets and code security issues before merge.
EOF
)" \
  --assignee {current_user}
```

Capture the PR URL from the output.

### Step 2.3: Report Results

Present a final summary table:

| Repository      | Status           | PR Link                                 |
| --------------- | ---------------- | --------------------------------------- |
| `prisma/repo-a` | Created          | https://github.com/prisma/repo-a/pull/N |
| `prisma/repo-b` | Already exists   | —                                       |
| `prisma/repo-c` | Error: no access | —                                       |

> "PRs created. Please request approvals for the links above."

## Common Issues

| Symptom                                                   | Cause                           | Fix                                                                                                                               |
| --------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `gh: Not Found (HTTP 404)` on repo view/permissions calls | No access to repo               | Request write access or check repo name (note: 404 from the contents endpoint in Step 1.3 is expected and means "Needs workflow") |
| `permissions.push` is `false`                             | Read-only access to repo        | Request write access from repo admin                                                                                              |
| `gh: Resource protected`                                  | Branch protection prevents push | Request bypass or push via fork                                                                                                   |
| PR creation fails "already exists"                        | Duplicate PR for same branch    | Should not occur — branch names include a timestamp for uniqueness                                                                |
