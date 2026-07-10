---
name: prisma-copy-review
description: Use when the operator wants a Prisma draft reviewed, edited, or rewritten for clarity, positioning alignment, product accuracy, fluff removal, anti-pattern cleanup, or better channel fit across docs, website copy, launch content, blog drafts, social posts, LinkedIn posts, X posts, and customer-facing responses.
---

# Prisma Copy Review

Review or rewrite Prisma communication for alignment, clarity, and channel fit.

## Usage guide

Use this skill for prompts like:

- `Review this webpage against our positioning.`
- `Make this launch post less fluffy and more aligned with Prisma Postgres positioning.`
- `Check this PR copy for vague claims, redundant lines, and channel issues.`
- `Review these docs intros and rewrite the risky parts.`
- `Rewrite this announcement so it sounds less salesy and more specific.`

## Foundation first

- If `prisma-product-messaging` is available, consult it first.
- Treat that skill as the source of truth for positioning, product naming, product relationships, and uncertainty rules.
- Then read `references/review-rubric.md`.

## Review workflow

1. Identify the channel, audience, and goal.
2. Check whether the message reflects the right Prisma story for that audience.
3. Validate every product mention against the current source material.
4. Mark fluff, redundancy, hype, unsupported claims, and empty abstractions.
5. Remove em dashes and other discouraged patterns.
6. Rewrite for the requested channel.

## Large artifact handling

When the draft is a large PR, webpage, or multi-file launch, review the most visible and risky user-facing copy first:

1. Hero and subhead.
2. Feature bullets.
3. Comparison cards or FAQs.
4. Docs overview or quickstart intros.
5. Limitation sections.

If the artifact is too large for exhaustive rewrite in one pass, say which surfaces you reviewed and why.

## Required review behavior

- Explain why a line is weak, not just that it is weak.
- Prefer concrete replacement language over abstract advice.
- Flag risky or uncertain product claims instead of smoothing over them.
- Keep tone aligned with the destination channel.

## Output modes

- For review tasks, follow the structure in `references/review-rubric.md`.
- For rewrite-only tasks, use the short rewrite format from `references/review-rubric.md`.
- If the operator asks only for a quick judgment, keep the same logic but compress the output.
