---
name: drive-create-deployment-plan
description: Use when the operator wants to create a deployment plan, release plan, go-live checklist, or coordinate a production rollout across teams.
metadata:
  version: "2026.2.25"
---

# Create Deployment Plan

Produce a deployment plan that communicates the sequenced changes being applied to production and how they affect users, dependent teams, and third parties. The primary audience is cross-functional: Developer Relations, Data, Support, and other collaborators who need to understand what is changing, when, and what to do if something goes wrong.

## File Naming

- **Project deployment plan**: `projects/{project}/plans/deployment-plan.md`
- **Named deployment plan** (when a project has multiple deployments): `projects/{project}/plans/{name}.deployment-plan.md` where `{name}` is kebab-case (e.g. `v2-migration.deployment-plan.md`, `billing-cutover.deployment-plan.md`)
- If the engineer does not specify a project, ask for a `{project}` slug (kebab-case) and create the directory structure under `projects/{project}/`.

## Entry Points

Determine which entry point applies:

### 1. Blank template

The engineer asks for a blank or empty deployment plan.

- Ask for the plan name (used to derive the file name), create the file using the **Deployment Plan Template** below with placeholder guidance intact.
- Then ask: _"Want me to help fill this in? Give me a description of what you're deploying and I'll draft it."_

### 2. Description provided

The engineer supplies a description of the deployment (directly or via prompt).

- If no description was given yet, ask:
  _"Describe what's being deployed: what services or features are going to production, the motivation, and any known dependencies or risks. I'll draft the deployment plan from there."_
- Once received, proceed to **Drafting**.

### 3. Spec or plan exists

The engineer has an existing spec (`spec.md`) or execution plan (`plan.md`) in the project.

- Read the spec and/or plan to extract: scope, services involved, dependencies, data changes, acceptance criteria.
- Use that context to pre-fill the deployment plan sections.
- Proceed to **Drafting**.

## Drafting

Given a description (or extracted context from a spec/plan), generate the full deployment plan:

1. **Determine the file path.** If not already provided, ask:
   - The `{project}` name (kebab-case)
   - Whether this is the sole deployment plan or one of several (to determine file naming)
2. **Fill every section** of the template below. Apply engineering judgment:
   - Infer deployment sequence from service dependencies and risk ordering (lowest risk first, data migrations before application changes).
   - Identify risks from the type of change: data migrations, breaking API changes, third-party integrations, high-traffic services.
   - Derive the pre-deployment checklist from the deployment sequence, dependencies, and data changes.
   - Propose rollback strategies based on the type of change (feature flags, database rollbacks, service revert).
   - Flag communication needs based on who is affected: external users, partner teams, internal collaborators.
3. **Populate the deployment sequence** with concrete steps. Each step should include: what is being deployed, to which environment, who is responsible, and any validation gates between steps.
4. **Collect external references.** For monitoring, success criteria, and validation steps, ask the operator for specific links to dashboards, log queries, alerting channels, and data tools. Do not accept vague references ("check Grafana"); ask for the URL or query.
5. **Define success criteria** that are observable and time-bound. Each criterion should reference a specific metric, dashboard, or query, with a threshold that distinguishes success from failure.
6. **Write the deployment plan file.**
7. Proceed to **Refinement**.

### Making Assumptions

When drafting, prefer making a reasonable assumption over leaving a section blank. Mark assumptions clearly:

```
**Assumption:** Rollback for the API service is a revert to the previous container image via CI/CD, achievable within 5 minutes.
```

If an assumption is low-confidence or high-impact, add it to the relevant section as a callout so the engineer can confirm.

## Refinement

After writing the initial deployment plan, enter a refinement loop:

1. **Present open items in the chat window.** Format them as a numbered list so the engineer can respond by number or inline. Example:

   ```
   I've drafted the deployment plan at projects/billing-v2/plans/deployment-plan.md. A few things to resolve:

   1. The deployment sequence assumes the database migration runs before the API deployment. Is there a separate DBA or platform team responsible for running migrations, or does your team handle it?
   2. I listed #eng-releases as the internal communication channel. Is there a different channel for this project?
   3. For rollback, I assumed feature flags can disable the new billing flow without a redeploy. Does the feature flag infrastructure support this?
   ```

2. **Process answers.** For each answer:
   - Update the relevant section in the deployment plan.
   - If the answer reveals new dependencies or risks, add them.
   - If you can make a reasonable inference, do so and note the assumption.

3. **Repeat** until:
   - All sections have concrete content (no remaining placeholders), or
   - Remaining details will only be known closer to deployment and are marked as such.

4. When satisfied, confirm with the engineer:
   _"The deployment plan covers deployment sequence, rollback, monitoring, and communication. Ready to finalise?"_

## Deployment Plan Template

Use this structure for every deployment plan. Remove placeholder guidance when filling in real content.

```markdown
# Deployment Plan: [Name]

_Communicate the sequenced changes being applied to production and how they affect customers, dependent teams, and third parties. The audience includes Developer Connections, Data, Support, and other cross-functional collaborators._

## Overview

_Synthesise what is being deployed and why from the description or spec. Do not ask the operator for this: derive it. Ask the operator for links to Linear projects, epics, PRs, or design docs that provide context readers will need._

## Schedule

_Ask the operator for the target deployment date/time and timezone. Note any maintenance windows, blackout periods, or coordination constraints (e.g. "deploy after market close", "avoid Fridays"). If the operator hasn't specified a time, ask:_
_"When is this deployment targeting? Is there a maintenance window, blackout period, or timezone constraint?"_

## Dependencies

_Infer teams, services, and third parties this deployment depends on from the description, spec, or deployment sequence. Separate into blocking dependencies (must be resolved before deployment starts) and coordinated dependencies (must happen in sequence during deployment). Ask the operator only about dependencies you cannot infer:_
_"Are there any teams, services, or third parties that need to complete work before this deployment can start, or that need to deploy in coordination with you?"_

## Risk Assessment

_Identify the highest-impact risks based on the type of change: data migrations, breaking API changes, third-party integrations, high-traffic services. For each risk, state the likelihood (low/medium/high), impact, and mitigation. Ask the operator only about risks you cannot infer from the deployment scope:_
_"Are there any known risks, fragile areas, or past incidents related to these services that I should account for?"_

| Risk       | Likelihood        | Impact     | Mitigation |
| ---------- | ----------------- | ---------- | ---------- |
| _describe_ | _low/medium/high_ | _describe_ | _describe_ |

## Data & State Change

_Determine from the description whether the deployment includes database migrations, data backfills, state machine transitions, cache invalidations, or changes to data contracts. If it does, specify: what changes, whether they are reversible, and what pre-deployment steps are needed. If no data changes are involved, state "No data or state changes" explicitly. Ask the operator if unclear:_
_"Does this deployment include any database migrations, data backfills, or changes to how data is stored or structured in production?"_

## Communication

### External

_Infer which external collaborators or users are affected based on the scope of the change (API consumers, SDK users, partners, end users). Specify the channel (email, Slack, Discord, changelog, status page) and timing (before, during, after). Ask the operator:_
_"Which external users, partners, or collaborators need to know about this deployment? How should they be notified, and when?"_

### Internal

_Propose the internal channels and people who should receive deployment updates based on the teams involved. Ask the operator to confirm or correct:_
_"Which Slack channel(s) or people should receive deployment progress updates? Is there a dedicated channel for this project?"_

## Pre-deployment Checklist

_Derive prerequisites from the deployment sequence, dependencies, and data changes. Include items like: feature flags configured, environment variables set, secrets provisioned, migrations tested in staging, external teams notified, monitoring dashboards bookmarked. Ask the operator for anything you cannot infer:_
_"Are there any manual steps, approvals, or environment setup needed before deployment can start?"_

- [ ] _prerequisite derived from the deployment_
- [ ] _prerequisite derived from the deployment_

## Deployment

### Sequence

_Derive the deployment order from service dependencies and risk ordering: infrastructure and data changes first, then backend services, then frontend/client-facing services. Each step must specify what is deployed, where, who is responsible, and how to verify it succeeded before proceeding. Ask the operator:_
_"What is the order of services being deployed? For each, which team owns the deploy and how do you verify it worked (e.g. smoke test, health check, log query)?"_

| Step | Environment | Action     | Owner  | Validation      |
| ---- | ----------- | ---------- | ------ | --------------- |
| 1    | Staging     | _describe_ | _team_ | _how to verify_ |
| 2    | Production  | _describe_ | _team_ | _how to verify_ |

### Monitoring

_Ask the operator for links to specific dashboards, log queries, and alerting channels for each service being deployed. Do not accept "check the dashboard" without a URL. If the operator doesn't have these ready, prompt them to create or locate them:_
_"For each service in the deployment sequence, provide: (1) a link to the monitoring dashboard, (2) a log query or filter for errors, and (3) the alerting channel or PagerDuty service. If these don't exist yet, flag which ones need to be created before deployment."_

### Rollback

_Propose rollback actions based on the deployment type: container revert for stateless services, feature flag disable for gated features, migration rollback scripts for schema changes. Each rollback must be actionable by whoever is on-call, not just the author. Include estimated time to complete. Ask the operator:_
_"For each service, what does rollback look like? Is it a container revert, feature flag toggle, migration rollback script, or something else? How long does each take?"_

| Scenario        | Rollback Action | Owner  | ETA    |
| --------------- | --------------- | ------ | ------ |
| General failure | _describe_      | _team_ | _time_ |

## What Does Success Look Like?

_Define observable, time-bound criteria for a successful deployment. Prefer specific metrics ("error rate below 0.1% for 30 minutes post-deploy") over vague statements ("no errors"). Include links to the dashboards or queries where each criterion can be verified. Ask the operator:_
_"How will you know this deployment succeeded? What metrics, dashboards, or data queries will you check, and what thresholds indicate success?"_

- [ ] _Observable success criterion with link to verification_
- [ ] _Observable success criterion with link to verification_
```

## Guidelines

**Do:**

- Fill every section, even with a short assumption: an empty section signals missing preparation.
- Write for a cross-functional audience: avoid jargon without context, spell out acronyms on first use.
- Make the deployment sequence concrete: vague sequences ("deploy everything") don't help during an incident.
- Define rollback actions that are actionable by the person on-call, not just the author.
- Include time estimates for rollback steps where possible.
- Ask for specific URLs, log queries, and dashboard links: "check the dashboard" is not actionable without a link.
- Derive the pre-deployment checklist from the deployment itself: if a step depends on a feature flag, the checklist should verify the flag exists.
- State "no data or state changes" explicitly when there are none: this is valuable information for the reader.

**Don't:**

- Leave sections blank with "TBD": either fill with an assumption or call out what information is needed.
- Assume the reader has full context on the project: the overview should stand on its own.
- Write rollback plans that only say "revert the deploy": specify what "revert" means for each service and any data implications.
- Accept vague monitoring references: always push for a concrete link, query, or at minimum the tool name and search terms.
- Combine multiple unrelated deployments into one plan: each deployment should have its own plan.
- Skip the risk assessment: even low-risk deployments benefit from explicitly stating "low risk because X".
