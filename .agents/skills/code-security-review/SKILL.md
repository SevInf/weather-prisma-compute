---
name: code-security-review
description: Use when conducting a security code review, running SAST (Semgrep OSS) analysis, reviewing code against security frameworks (OWASP, CWE), or when the code-review security section (#6) is insufficient. Supersedes code-review security section (#6).
metadata:
  author: Prisma
  version: "2026.3.1"
---

# Code Security Review

Comprehensive security review combining automated SAST scanning (Semgrep OSS CLI)
with framework-guided manual analysis (OWASP Top 10, CWE/SANS Top 25, OWASP ASVS,
Proactive Controls, CERT Secure Coding).

**This skill is the authoritative security review.** It supersedes section #6 (Security)
in the `code-review` skill.

## Phase 0: Prerequisites

### Step 0.1: Check Semgrep Installation

```bash
semgrep --version
```

### Step 0.2: Install if Missing

Detect platform and install:

```bash
uname -s
```

**macOS:**

1. `command -v brew` — if available: `brew install semgrep`
2. Fallback: `pip install semgrep`

**Linux:**

1. `pip install semgrep` (or `pip3 install semgrep`)

Verify after install: `semgrep --version`

**STOP if semgrep is not available after installation guidance. Cannot proceed without it.**

## Phase 1: Scope Detection + Reconnaissance

Auto-detect review mode:

| Mode           | Trigger                                    | Scope              |
| -------------- | ------------------------------------------ | ------------------ |
| PR/Branch diff | On branch with commits ahead of default    | Changed files only |
| Specific paths | User provides paths                        | Those paths        |
| Full repo      | User says "full audit" or no diff detected | All source files   |

### Step 1.1: Detect Mode

```bash
# find default branch
git remote show origin | grep 'HEAD branch' | awk '{print $NF}'

# fetch latest remote refs to avoid stale comparisons
git fetch origin <default_branch>

# check if current branch has diverged
git rev-list --count origin/<default_branch>..HEAD
```

If count > 0 → PR/Branch diff mode. Get changed files:

```bash
git diff --name-only origin/<default_branch>...HEAD
```

If count = 0 and user didn't specify paths → ask user to specify files or confirm full-repo mode.

### Step 1.2: Enumerate Scope

- List files in scope, detect languages
- Check for existing `.semgrep.yml` or `.semgrepignore` config

### Step 1.3: Present Scope Summary

Present a summary table:

| Item           | Value                                                |
| -------------- | ---------------------------------------------------- |
| Mode           | PR diff / Full repo / Specific paths                 |
| Files          | N files                                              |
| Languages      | Go, TypeScript, ...                                  |
| Semgrep config | .semgrep.yml / .semgrepignore found / using defaults |

> If >100 files in scope, warn and suggest narrowing scope.

**STOP for user confirmation before proceeding.**

## Phase 2: Automated Scanning (Semgrep CLI OSS)

Run Semgrep CLI with built-in rulesets. No custom rules.

### Step 2.1: SAST Scan (HIGH + CRITICAL Only)

Semgrep severity mapping: `ERROR` = Critical, `WARNING` = High.

```bash
# diff mode — scan only changed files
semgrep scan --config auto --json --severity ERROR --severity WARNING <file1> <file2> ...

# full repo mode
semgrep scan --config auto --json --severity ERROR --severity WARNING .
```

### Step 2.2: Parse Output

Parse `--json` output. Extract from each finding:

- `check_id` (rule ID)
- `extra.severity` (ERROR/WARNING)
- `extra.message`
- `path`, `start.line`, `end.line`
- `extra.metadata.cwe` (CWE IDs)
- `extra.metadata.owasp` (OWASP categories)
- `extra.metadata.confidence`

Normalize into unified finding structure for Phase 4.

### Error Handling

| Scenario             | Action                                        |
| -------------------- | --------------------------------------------- |
| `semgrep scan` fails | Show error, fall back to manual-only review   |
| Empty results        | Not an error — report "no automated findings" |
| Unsupported language | Skip SAST for that language, note in report   |

## Phase 3: Manual Security Analysis

Single-pass systematic review. Security categories are interrelated — do NOT split
across subagents (they would lose cross-cutting context).

### Step 3.1: Read Files in Scope

Read all files in scope (or changed sections for large files).

### Step 3.2: Walk Security Framework Checklists

Review code against six checklists. Read each reference file before reviewing.

**Offensive (what to find):**

1. **OWASP Top 10 2021** — read `reference/owasp-top-10-checklist.md`
   High-level vulnerability categories with CWE mappings and code patterns.

2. **CWE/SANS Top 25 2023** — read `reference/cwe-sans-top-25-checklist.md`
   Granular weakness types ranked by danger. More specific than OWASP Top 10.

3. **OWASP ASVS v4.0** — read `reference/owasp-asvs-checklist.md`
   Verification requirements across 14 categories (L1 + L2 focus).

**Defensive (what should be present):**

4. **OWASP Proactive Controls** — read `reference/owasp-proactive-controls.md`
   Top 10 things code SHOULD do. Verify presence of defensive patterns.

5. **SEI CERT Secure Coding** — read `reference/cert-secure-coding.md`
   Language-specific secure coding rules for C, Java, and others.

**Language-specific:**

6. **Language Security Patterns** — read `reference/language-security-patterns.md`
   Anti-patterns for Go, TS/JS, Rust, Python, Java.

### Step 3.3: Focus Areas for Diff Mode

When reviewing PR/branch diffs, prioritize:

- New endpoints/routes (attack surface expansion)
- Auth/authz logic changes
- Input handling changes
- Crypto/hashing changes
- DB query construction
- File/network I/O
- Configuration changes
- New dependencies

## Phase 4: Findings Consolidation + Report

### Step 4.1: Deduplicate

Merge manual + Semgrep findings by (file, line_range, category). Prefer Semgrep
finding when both exist (it has rule ID + metadata).

### Step 4.2: Sort

Sort: severity DESC, then OWASP rank, then confidence.

### Step 4.3: Generate Report

```markdown
# Security Review: [brief description]

## Executive Summary

- Risk Level: Critical / High / Medium / Low / Clean
- Files Reviewed: N
- Findings: X critical, Y high, Z medium, W low
- Scan Coverage: SAST (Semgrep OSS), Manual (OWASP Top 10, CWE/SANS Top 25, OWASP ASVS, Proactive Controls, CERT Secure Coding)

## Critical Findings

### [Category]: [Brief title]

**Severity**: Critical | **CWE**: CWE-NNN | **OWASP**: AXX:2021 | **Source**: semgrep / manual
**Location**: `src/db/queries.go:45-52`
[Description + exploitability assessment]
**Remediation**: [Concrete fix with code example]

## High Findings

[Same format as Critical]

## Medium Findings

[Same format as Critical]

## Low Findings

| # | Location    | Issue       | CWE     | Recommendation |
| - | ----------- | ----------- | ------- | -------------- |
| 1 | `file:line` | description | CWE-NNN | fix            |

## OWASP Top 10 Coverage

| Category                         | Status   | Findings |
| -------------------------------- | -------- | -------- |
| A01: Broken Access Control       | Reviewed | N        |
| A02: Cryptographic Failures      | Reviewed | N        |
| A03: Injection                   | Reviewed | N        |
| A04: Insecure Design             | Reviewed | N        |
| A05: Security Misconfiguration   | Reviewed | N        |
| A06: Vulnerable Components       | Reviewed | N        |
| A07: Auth Failures               | Reviewed | N        |
| A08: Software/Data Integrity     | Reviewed | N        |
| A09: Logging/Monitoring Failures | Reviewed | N        |
| A10: SSRF                        | Reviewed | N        |

## Positive Security Observations

[What was done well — secure patterns, good practices]
```

### Severity Definitions

- **Critical**: Exploitable vulnerability, data breach risk, auth bypass. Must fix before merge.
- **High**: Significant weakness, needs conditions to exploit. Should fix before merge.
- **Medium**: Concern with mitigating factors. Fix next iteration.
- **Low**: Hardening opportunity. Consider fixing.

## Phase 5: Remediation (User-Initiated)

After presenting the report, offer options:

> **Remediation options:**
>
> 1. Fix all Critical and High findings
> 2. Fix specific findings (by number)
> 3. No fixes — review only

**STOP for user choice. Do NOT auto-fix.**

### Step 5.1: Apply Fixes

For each fix:

1. Read the full file containing the finding
2. Apply the fix
3. Re-run Semgrep on the fixed file to verify resolution:

```bash
semgrep scan --config auto --json --severity ERROR --severity WARNING <fixed_file>
```

4. If the fix introduces new findings → stop remediation for that finding, report regression

### Step 5.2: Post-Fix Verification

Present a verification table:

| Finding                       | Status     | Verification                      |
| ----------------------------- | ---------- | --------------------------------- |
| SQL injection `queries.go:45` | Fixed      | Semgrep re-scan: clean            |
| Missing auth `handler.go:89`  | Fixed      | Manual verification needed        |
| XSS `template.js:23`          | Regression | New finding introduced — reverted |

**Do NOT auto-commit.** Leave changes unstaged for user to review.

## Common Issues

| Symptom                      | Cause                       | Fix                                          |
| ---------------------------- | --------------------------- | -------------------------------------------- |
| `semgrep: command not found` | Not installed               | Follow Phase 0 install steps                 |
| `semgrep scan` timeout       | Large repo                  | Narrow scope to changed files                |
| Empty scan results           | No matching rules           | Not an error; report "no automated findings" |
| Fix introduces regression    | New vulnerability from fix  | Stop, revert, report                         |
| >100 files in scope          | Full repo on large codebase | Suggest narrowing to specific paths          |
