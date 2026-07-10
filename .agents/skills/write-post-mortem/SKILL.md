---
name: write-post-mortem
description: Use when the operator wants to create a post-mortem, document an incident, write an incident report, or do a root cause analysis after a production issue.
metadata:
  version: "2026.2.26"
---

# Write Post-Mortem

Produce a thorough, evidence-based post-mortem document for a production incident, then replicate a condensed version to the Notion Postmortem Log.

## Workflow

### Phase 1 — Gather Evidence

Before writing anything, collect hard data. Do not rely on memory or assumptions for timestamps.

1. **Identify the incident window.** Ask the operator for the approximate start/end if not already clear from conversation context.
2. **Query observability tools.** Use the team's tracing/logging dataset in Axiom, Sentry, and Cloudflare Dashboard to establish:
   - When errors first appeared (not when they were noticed)
   - Error volumes, failure rates, and affected services over time
   - Which components/queues/workers were impacted
3. **Check code and deployment history.** Use `gh pr view`, `git log`, and PR timestamps to pin exact times for remediation steps such as PR creation and merge. Use deployment records, release tooling, or telemetry to establish when the fix was actually deployed.
4. **Cross-reference with communication.** Slack messages, alert timestamps, and Sentry first-seen/last-seen dates provide ground truth for detection and investigation times.
5. **Verify timestamps.** Every time in the timeline must be backed by evidence (Axiom query, GitHub API, Sentry). Flag any time that is an estimate with `~`.

### Phase 2 — Write the Post-Mortem

Create the post-mortem file in the repository's documented incident/postmortem location. If no location is documented, ask the operator before proceeding. Use `{date}-{slug}.md` naming where `{date}` is the incident start date (YYYY-MM-DD) and `{slug}` is a short kebab-case descriptor.

Use the template below. Fill every section — an empty section is a missed signal.

### Phase 3 — Create Action Items

For each action item:

1. Assign a sequential ID: `AI-1`, `AI-2`, etc.
2. Add an HTML anchor: `<a id="ai-1"></a>` so timeline entries can link to them.
3. Cross-reference from the timeline and root cause sections using `*(see [AI-1](#ai-1))*`.
4. Create Linear tickets for actionable items. Include:
   - Labels appropriate for incidents (e.g., `unplanned/incident`, `type/incident` or per team conventions)
   - Add ticket links back into the post-mortem action item headings

### Phase 4 — Create PR

1. Create a branch from the repository's default branch: `postmortem/{date}-{slug}`
2. Commit the post-mortem file.
3. Open a **draft** PR with a concise title referencing the incident.
4. Update the Linear tickets from Phase 3 with the post-mortem PR link.

### Phase 5 — Replicate to Notion

Create a condensed entry in the **Postmortem Log** Notion database. To find it:

1. Navigate to the team's incident-management workspace in Notion and locate the current **Postmortem Log** database. If it is unclear, ask the operator for the correct destination.
2. Create a new page in that database with:
   - **Title**: Short incident name
   - **Tags**: Affected products/services (e.g. Accelerate, PPG, Console)
   - **Date**: Incident date range
   - **Body content** (condensed — not a full copy):
     - 2–3 sentence summary
     - Key metrics table (most impactful numbers only)
     - Root cause (1 paragraph)
     - Remediation steps (bulleted list)
     - Action items (numbered list with Linear ticket links)
     - Link to the full post-mortem PR

## Timeline Construction Rules

The timeline is the most important section. Follow these rules strictly:

1. **Use UTC for all times.** Add local timezone in parentheses only for human actions (e.g. "09:17 UTC (10:17 CET)").
2. **Distinguish between when something happened and when it was noticed.** The incident start is when errors first appeared in telemetry, not when a human saw them.
3. **Pin exact times where possible.** GitHub PR timestamps, Sentry first-seen, and Axiom 5-minute buckets give precise data. Use `~` only when approximating.
4. **Include the "quiet" period.** If an incident ran undetected for hours/days, that gap must appear in the timeline — it reveals detection failures.
5. **Link to action items.** Timeline entries that reveal systemic problems should cross-reference the relevant `AI-*` action item.
6. **Include remediation timing.** Show the elapsed time from detection to resolution. Fast remediation is worth highlighting; slow detection is worth calling out.

## Template

```markdown
# Post-Mortem: {Incident Title}

**Date**: {start date} – {end date}, {year}
**Severity**: {Critical | High | Medium | Low}
**Duration**: {total degradation period}, {active remediation time}
**Author**: {name}

---

## Summary

_{2–4 sentences. What happened, what was the blast radius, and was it fully resolved? Write this last, after all analysis is done.}_

---

## Timeline

| Time (UTC)       | Event                                                      |
| ---------------- | ---------------------------------------------------------- |
| **{date, time}** | {First error signal — from telemetry, not human detection} |
| **{date, time}** | {Escalation or significant state change}                   |
| **{date, time}** | {Detection — when a human noticed and began investigating} |
| **{date, time}** | {Mitigation step with link to PR/action if applicable}     |
| **{date, time}** | {Resolution confirmed — backed by monitoring data}         |

---

## Root Cause Analysis

### Primary cause

_{What broke and why. Be specific — name the component, the configuration, the exact failure mode. Cross-reference action items: _(see [AI-1](#ai-1))_}_

### Why the impact was broad

_{If the blast radius extended beyond the initially failing component, explain the propagation mechanism.}_

### Contributing factors

_{Conditions that made the incident worse or harder to detect: missing alerts, shared resources, silent failure modes.}_

---

## Impact

### Direct impact

- **{System/feature}**: {What was broken, for how long, quantified where possible}

### Secondary impact

_{Side effects discovered during or after remediation.}_

---

## Remediation Steps Taken

1. **{Action}** — {brief explanation and outcome}

---

## What Went Well

- **{Category}**: {What worked, and why it mattered for resolution}

---

## Room for Improvement

- **{Category}**: {What was missing, and how it delayed detection or resolution}

---

## Action Items

### <a id="ai-1"></a>AI-1: {Title} — [{ticket ID}]({ticket URL})

**Problem**: {What systemic issue does this address}

**Action**: {What needs to change}

---

## Appendix: Key Metrics

| Metric        | Value                             |
| ------------- | --------------------------------- |
| {metric name} | {value with units and time range} |
```

## Guidelines

**Do:**

- Verify every timestamp against telemetry data before writing it down.
- Write the root cause as a causal chain, not a single event.
- Quantify impact with real numbers from Axiom/Sentry (error counts, affected users, duration).
- Create action items that are specific enough to become Linear tickets.
- Keep the Notion entry short — it is an index, not a duplicate of the full document.

**Don't:**

- Guess at times. If you cannot verify a time, mark it with `~` and note the uncertainty.
- Blame individuals. Focus on systems, processes, and configurations.
- Skip the "quiet period" in the timeline. Detection latency is critical signal.
- Copy the full post-mortem into Notion. The Notion entry should be a concise summary that links to the PR for details.
- Create action items without cross-referencing them from the timeline and root cause sections.
