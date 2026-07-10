---
name: drive-create-spec
description: Use when the operator wants to write up a spec, PRD, or product requirements document.
metadata:
  version: "2026.6.11"
---

# Create Spec

Capture a settled design as an unambiguous engineering spec.

This skill is the **output** of the design phase, not part of it. If there are open questions, the spec is incomplete. An operator can override this; an agent can't.

## Specs are short-lived

A spec lives for the lifetime of the project and is deleted at close-out. It is **not** an ADR or architecture doc.

That means it's appropriate (and often necessary) for a spec to talk about:

- The current state of the system at the time of writing
- Transition states the system will pass through during the project
- Code paths or systems that exist today but won't after the project lands

Persistent documentation is not the goal of a spec and should be covered in planning and execution.

## File Naming

- **Naming files and folders**: Use kebab case
- **Project spec (shaping stage output)**: `projects/{project}/spec.md`
- **Task/feature spec (within a project)**: `projects/{project}/specs/{name}.spec.md`
- If the engineer does not specify a project, infer one.
- Note: `projects/{project}/` is **transient** and deleted when implementation is complete.

### Build for end users

A spec is written for the implementer but is _about_ the end users — the humans or systems that consume the feature. Before drafting, answer two questions and let them drive the document:

- **Who are we building for?** Name them concretely: "on-call engineers triaging a page at 3am", "external API consumers integrating the webhook" — never "users" in the abstract. Name each distinct group.
- **How does that shape this?** End users decide what's in scope, what the requirements optimise for, and what "done" means. On-call tooling prioritises speed-to-signal and failure-mode clarity; an integrator contract prioritises stability and good errors.

This is a lens, not a section — there's no "Stakeholders" field. Surface end users in `Context`. If you can't name the end user a requirement serves, question whether it belongs.

### Every statement pins the design

The implementer reads every explicit statement as binding. If you don't intend to constrain a point, leave it out or mark it illustrative. That's how you communicate degrees of freedom.

### Code samples

Reach for a code sample when it's the clearest option:

- An **interface** between systems: API contracts, wire formats, schemas, error envelopes.
- An **algorithm** the spec mandates, where prose loses precision.
- The exact **shape** of a type, payload, or return value.

Mermaid is good for sequence/state/flow diagrams. Mark each sample **prescriptive** (implementer must match — the default, no annotation needed) or **illustrative**:

> _Illustrative — field names and types are up to the implementer:_
>
> ```ts
> interface RetryPolicy { ... }
> ```

When a sample goes stale (renamed types, changed signatures), update the spec.

### Assumptions

Prefer a marked assumption over a blank section:

```
**Assumption:** API responses target p99 < 500ms based on typical SaaS latency.
```

If an assumption is low-confidence or high-impact, raise it as an open flag or open question instead.

### Open flags

An open flag marks a decision made by you or the operator that carries risk and needs operator verification. Every open flag has **two parts sharing one number**:

1. **Inline marker** — `⚠️ **OFn** (<short description>)` in the section where the decision bites (an assumption flag in Assumptions, an FR3 flag with FR3). The marker must appear there, not only in Open Questions.
2. **Open Questions entry** — a matching **OFn** entry stating the assumed direction and what to confirm. This is where the operator resolves it.

Number sequentially (OF1, OF2, …). Never write one half without the other. Unresolved OF markers are a **hard block** on downstream workflows — `drive-create-plan` refuses to plan until they're resolved or the operator overrides.

The three tools are distinct:

- **Assumption** — confident enough to proceed; no verification, no Open Questions entry.
- **Open flag (OF)** — a direction the context supports that an operator should confirm. Appears inline **and** as a matching Open Questions entry.
- **Open question (no OF)** — multiple valid paths genuinely exist; nothing decided yet. Lives in Open Questions only.

## Refinement

Tighten ambiguity in the recorded design — don't re-open settled decisions. If a question turns out to be a real design question, stop and say the design isn't settled.

1. **Present Open Questions** (plain questions + OFn resolutions) as a numbered list the operator can answer by number:

   ```
   Drafted projects/my-proj/specs/feature-x.spec.md. To pin down:

   1. Retry strategy — recorded (1s, 2s, 4s, 8s, max 60s); confirm or correct?
   2. "admin users" — existing RBAC admin role, or a new permission scope?
   3. OF2: assumed a 90-day retention window (flagged on NFR4). Confirm, or do compliance rules dictate longer?
   ```

2. **Process each answer.** Update the relevant section. When an answer resolves an open flag, remove **both** the inline `⚠️ OFn` marker and its Open Questions entry. Note inferences as assumptions. If an answer reveals a fundamental design decision is still open, stop and surface it.

3. **Repeat** until no open questions remain, or the rest are intentional implementer degrees of freedom.

4. Confirm: _"The spec captures the design unambiguously. Remaining Open Questions are implementer degrees of freedom. Ready to hand off?"_

## Spec Template

Fill this in; remove the italic guidance as you go.

```markdown
# Summary

_1-3 sentences synthesised from the description. Derive it; don't ask._

# Context

_The narrative spine and the anchor for the whole spec. A reviewer reads `Context` alone and understands what's being built, why, and why this approach fits. It names who the end users are. Everything below only confirms it — never introduce a new concept downstream; if a requirement needs one, add it here first._

## At a glance

_A one-skim answer to "what is happening" and "why care", concrete enough that later names (functions, types, error codes) land on something the reader already holds. Use whatever makes the design tangible: a 2-4 sentence paragraph, prose + a short code sample (new API/error/wire format), prose + a small Mermaid diagram, or a before/after example. Not a fact sheet (status grid, labelled metadata like Owner: / Risk:) — that breaks the anchor._

## Problem

_2-4 paragraphs on current state and pain: incidents, code paths, error messages, why today's approaches fall short. Omit when the parent project spec makes it obvious._

## Approach

_2-4 paragraphs on the settled solution and why it fits. Capabilities and shape, not implementation. Mermaid or code where it shortens prose; mark illustrative samples._

# Requirements

## Functional Requirements

_Concrete capabilities derived from `Context`, each with an ID (FR1, FR2, …); group by area where it helps. State **what, not how**: "firewall hardening against DoS" is a requirement, "configure iptables SYN-flood rules + fail2ban" is implementation. Performance targets (p99 latency, connection limits) and mandated tech choices that reflect real constraints (e.g. "metrics to Clickhouse") belong; config variable names and parameters don't. Ground each in real end-user usage, not boilerplate. If one needs a concept `Context` doesn't establish, fix `Context` first. Confirm or correct with the operator; don't ask them to enumerate from scratch._

- **FR1.** _..._
- **FR2.** _..._

## Non-Functional Requirements

_Sensible defaults for the system type (e.g. p99 < 500ms, 99.9% availability), each with an ID and a concrete target where one exists. Flag any assumption that hinges on scale or SLA tier._

- **NFR1.** _..._
- **NFR2.** _..._

## Non-goals

_Natural phase-2 items and scope boundaries. Ask only when the boundary is genuinely ambiguous._

# Acceptance Criteria

_Verification scenarios, not restated requirements. Terse and scannable. Each has an ID (AC1, AC2, …), is binary, and traces the FR/NFR IDs it covers (one AC can cover several). Prefer scenario form (what you'd do, what you'd observe); declarative assertions are fine when a scenario would be forced. Not every FR/NFR needs an AC — long-horizon or provisioning checks can be verified during implementation. If "done" is undefined for an area, ask the operator what it looks like._

- [ ] **AC1.** _Scenario covering FR1, FR2, NFR3 — what you'd test and the expected outcome_
- [ ] **AC2.** _Scenario covering NFR1, NFR4 — a failure mode and the expected behaviour_

# References

_Links to docs, ADRs, or systems that provide context you can't infer. Ask the operator for these._

# Open Questions

_Two kinds of entries: plain open questions (genuine forks, nothing decided) and **OFn** open-flag resolutions (one per inline `⚠️ OFn` marker, stating the assumed direction and what to confirm). Be specific — not "what about security?" but "short-lived JWTs or opaque session tokens, and what's the revocation strategy?" Each entry says why it matters and your default so the reader can confirm or override. Drop questions the implementer can answer without changing the spec (VM sizing, config values). A question that would change `Context` doesn't belong here — that means the design isn't settled, so go back to discussion._
```

## **Don't**

- Don't leave sections as "TBD" — fill with an assumption or an open question.
- Don't re-ask what the operator already answered, or ask them to enumerate requirements from scratch — derive, then confirm.
- Don't repeat `Context` in Requirements or Acceptance Criteria; reference the capability by name.
- Don't flatten `At a glance` into a fact sheet.
- Don't leave illustrative content unmarked — unmarked statements are binding.
- Don't put implementation detail (config params, CLI flags, env vars) in requirements.
- Don't treat the spec as an ADR, or cite private working docs as authoritative — inline what's needed; stable references (Linear, ADRs, published docs) are fine.
- Don't create durable repo docs (`docs/**`, READMEs) that link into `projects/{project}/**`.
