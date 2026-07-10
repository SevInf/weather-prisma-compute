---
name: ignite-create-adr
description: Use when the operator wants to record an architecture decision, create an ADR, capture a technology choice, or supersede an existing ADR.
metadata:
  version: "2026.6.29"
---

# Create ADR

Create an Architecture Decision Record (ADR) from the provided input. Input may be chat context, a file path, or a description pasted into the conversation. Follow the steps in order.

## Step 1: Gather input

Check whether the operator provided decision context (a description, conversation excerpt, or file path).

- If a file path was given, read it.
- If chat context or a description was given, use it as-is.
- If nothing was provided, ask: _"What decision do you want to record? Paste a description, share a file path, or describe the context and I'll help structure it."_

Do not proceed until you have input to work with.

## Step 2: Determine the team

Check whether the operator specified a team.

- If not, list the top-level folders inside `docs/` that contain a `technology/adrs/` directory and ask the operator to pick one. These are the only valid teams.
- If the operator gave a team name, verify that `docs/<team>/technology/adrs/` exists. If it doesn't, show the valid options and ask again.

Do not proceed until a valid team is confirmed.

## Step 3: Ask clarifying questions

Review the input against the ADR template sections: Context, Decision, Rationale, Consequences, Alternatives Considered. Identify any gaps, paying special attention to the narrative arc: what was the situation, what changed, what was decided, and why.

Ask targeted questions to fill those gaps. Examples:

- If the story behind the decision is unclear: _"What was happening that made this decision necessary? What changed or what pressure emerged?"_
- If the rationale is missing: _"What made you choose this approach over the alternatives? What was the most important factor?"_
- If alternatives aren't mentioned: _"What other approaches did you consider? Why were they ruled out?"_
- If consequences are unclear: _"How does day-to-day work change after this decision? What gets easier, what gets harder?"_
- If the context is thin: _"What situation, constraint, or requirement prompted this decision?"_

Ask all clarifying questions in a single message. Wait for answers before proceeding. If the input already covers every section well, skip to Step 4.

## Step 4: Determine the next ADR number and slug

Read the contents of `docs/<team>/technology/adrs/` to find existing ADR files. The next number is one higher than the highest existing `NNNN` prefix, or `0001` if none exist.

Ask the operator to confirm or provide a short title for the ADR (lowercase, hyphenated). Construct:

- Filename: `NNNN-short-title.md`
- Title: `ADR-NNNN: Short Title` (title-cased)

## Step 5: Determine category and status

Ask the operator for a category (e.g., storage, networking, deployment, observability, security, testing) if it isn't obvious from the input.

Default status to `accepted` unless the operator indicates the decision is still under discussion (`proposed`).

## Step 6: Review existing ADRs for superseded decisions

Read every existing ADR file in `docs/<team>/technology/adrs/` (excluding `index.md`).

For each existing ADR, evaluate whether the new decision supersedes, amends, or reverses it. Consider:

- Does the new ADR address the same problem domain?
- Does it contradict or replace a prior decision?
- Does it build on or extend a prior decision?

If any ADRs are potentially superseded:

1. Present each one to the operator with its number, title, and a one-line summary of why you think it's superseded.
2. Ask the operator to confirm or reject each. Process all candidates in a single message.
3. For confirmed supersessions, note them for Steps 7 and 8.

If no ADRs are superseded, move on.

## Step 7: Create the new ADR file

Copy the template from `templates/adr.md` and fill it in.

**Frontmatter:**

```yaml
---
type: decision
title: "ADR-NNNN: Title"
description: One sentence stating the decision this ADR records.
status: accepted
category: chosen-category
created: YYYY-MM-DD
team: team-name
references:
  - "[ADR-XXXX](./XXXX-slug.md)"
---
```

This frontmatter conforms to the repository's frontmatter standard, which requires `type`, `title`, and `description` on every document (see `docs/frontmatter-standard.md` and the vocabulary in `frontmatter.config.json`). For an ADR, `type` is always `decision` (ADRs are decision records; there is no separate `adr` type).

- Set `description` to a single sentence summarising the decision (subject-first, not "This ADR describes...").
- Set `created` to today's date.
- Set `team` to the confirmed team.
- Set `status` to `accepted` (or `proposed` if indicated).
- Set `category` to the chosen category.
- Populate `references` with links to any ADRs this one supersedes or builds on. If none, use an empty array `[]`.

**Writing style:**

Write each section as flowing prose. Paragraphs are the default structure, not bullet lists. The ADR should read as a narrative that a teammate can follow from start to finish without jumping between disconnected bullet points. Bullet lists are acceptable for genuine enumerations (e.g., a set of tools evaluated, a short list of specific constraints), but the reasoning and context around them should be written as connected sentences.

Avoid categorised labels like "Positive/Negative/Constraint" or "Easier/Harder" as section organisers. Instead, describe cause and effect in prose: what improves, what gets harder, and why.

**Body sections:**

- **Context:** Tell the story of what led to this decision. Start with the situation as it was, explain what changed or what pressure emerged, and end with why a decision became necessary. The reader should understand the problem deeply before encountering the solution.
- **Decision:** State what was decided in one or two clear paragraphs. Include enough detail that someone could act on it without reading further, but save the justification for Rationale.
- **Rationale:** Explain the reasoning as a connected argument. Lead with the most important factor, connect supporting reasons to it, and acknowledge the trade-offs that were accepted. Do not write a feature checklist.
- **Consequences:** Describe how the world changes after this decision. What workflows improve, what gets harder, what new constraints exist. Write as cause-and-effect prose, not a categorised list.
- **Alternatives Considered:** For each alternative, briefly describe what it is, then explain why it was not chosen. Connect the rejection back to the goals established in Context. Use sub-headings (`###`) for each alternative.
- **References:** Markdown list of links to superseded or related ADRs, external docs, or Linear issues. Use `- None` if there are none.

Write the file to `docs/<team>/technology/adrs/NNNN-short-title.md`.

## Step 8: Update superseded ADRs

For each ADR confirmed as superseded in Step 6:

1. Update its frontmatter `status` from `accepted` to `deprecated`.
2. Add a reference to the new ADR in its frontmatter `references` array: `"[ADR-NNNN](./NNNN-short-title.md)"`.
3. Add a line to its `## References` section: `- Superseded by [ADR-NNNN: Title](./NNNN-short-title.md)`.

Do **not** modify any other content in the superseded ADR files. ADRs are append-only; only `status`, `references`, and the References section are updated.

## Step 9: Update the index

Edit `docs/<team>/technology/adrs/index.md`:

1. If the index still contains "No ADRs recorded yet.", remove that line.
2. Find or create a `## Category Name` heading that matches the new ADR's category (title-cased).
3. Under that heading, find or create the table with columns: `#`, `Title`, `Description`, `Link`.
4. Add a row for the new ADR:

   ```text
   | NNNN | Short Title | One-line summary of the decision | [ADR-NNNN](./NNNN-short-title.md) |
   ```

5. If any ADRs were deprecated in Step 8, update their rows by appending "(deprecated)" to their title cell or adding a strikethrough, consistent with whatever convention is already in use. If no convention exists yet, append `(deprecated)` to the title.

## Step 10: Lint

1. Run `pnpm lint:frontmatter --paths <the new and modified ADR files>` and fix any frontmatter violations (the new ADR must have a non-empty `type`, `title`, and `description`).
2. Run `pnpm lint` and fix any markdownlint violations in the new or modified files before finishing.

## Summary

After completing all steps, provide a summary:

- The new ADR number, title, and file path
- Which ADRs (if any) were deprecated and updated
- Any index changes made
