---
name: prisma-product-messaging
description: Use when reviewing, writing, or rewriting Prisma product communication for positioning alignment, product naming, product relationships, claim safety, audience fit, or channel fit across docs, website copy, launch content, blog drafts, social posts, LinkedIn posts, X posts, and customer-facing responses.
---

# Prisma Product Messaging

Use this skill as the source of truth for Prisma product positioning and product language. Other communication skills should consult this skill first before they review, rewrite, or draft copy.

## Usage guide

Use this skill directly for prompts like:

- `Review this landing page hero against our positioning.`
- `Does this docs page talk about Prisma Compute correctly?`
- `Check this launch copy for risky product claims.`
- `Make this paragraph sound more like Prisma without getting vague.`
- `Which product terms in this PR need verification before publish?`

## Workflow

1. Read `references/positioning.md` first.
2. Read `references/product-language.md` before approving or rewriting product claims.
3. Read `references/channel-guidance.md` when the destination channel matters.
4. Read `references/anti-patterns.md` when the task involves cleanup, critique, or rewriting.

## Large artifact workflow

When the operator provides a large PR, webpage, or doc set, do not try to critique every sentence first. Prioritize the highest-risk copy in this order:

1. Title, hero, and subhead.
2. Primary feature bullets and comparison claims.
3. Quickstart or overview intros.
4. Limitations, caveats, and setup requirements.
5. CTAs, summaries, and promotional fragments.

Call out any product or operational claim that uses broad absolutes such as `no`, `all`, `any`, `automatic`, or `instant` unless the source docs clearly support it.

## Core stance

- Lead with the audience problem, not the product label.
- Treat Prisma as an integrated TypeScript platform when the content is about the broader story.
- Move to product-level detail only after the reader understands the problem and why Prisma is relevant.
- Prefer concrete workflows, interfaces, and outcomes over abstract positioning language.
- If a claim is not supported by the repo sources, flag it clearly instead of guessing.

## Messaging hierarchy

Use this order unless the operator asks for a narrow product-only edit:

1. Who the message is for.
2. What problem or friction they face.
3. Why Prisma is relevant.
4. Which product or surface does the job.
5. What concrete proof or workflow supports the claim.

## Accuracy rules

- Use exact product names and capitalization.
- Keep product, surface, and feature boundaries clear.
- Do not invent new product relationships, guarantees, or launch states.
- When two repo sources conflict, keep the wording narrow and flag that the claim needs confirmation.
- If a statement about Accelerate, query-performance features in Prisma Postgres, or Compute goes beyond the current repo sources, mark it as risky.

## Style guardrails

- Do not use em dashes in rewrites or examples.
- Remove empty slogans, dramatic fragments, repeated lines, and inflated superlatives.
- Cut words like `seamless`, `effortless`, `powerful`, `robust`, and `fast` unless the sentence explains how or why.
- Replace vague developer-experience language with a specific workflow improvement.
- Prefer calm confidence over hype.

## When to route to sibling skills

- Use `prisma-copy-review` for full draft reviews, issue tables, and rewrite recommendations.
- Use `prisma-social-voice` for X and LinkedIn adaptation.
- Use `prisma-docs-voice` for docs, educational content, and support-style replies.

If those skills are not available, keep using this skill and apply their channel rules from `references/channel-guidance.md`.
