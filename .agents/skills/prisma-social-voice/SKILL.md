---
name: prisma-social-voice
description: Use when the operator wants Prisma messaging adapted, reviewed, or rewritten for X posts, LinkedIn posts, social launch copy, short announcement threads, or social responses that need product accuracy, channel fit, and a human tone without sounding salesy or generic.
---

# Prisma Social Voice

Use this skill for Prisma social copy, especially X and LinkedIn.

## Usage guide

Use this skill for prompts like:

- `Rewrite this X post so it sounds more like Prisma and less salesy.`
- `Turn this product note into a clear LinkedIn post.`
- `Make this launch post shorter and more specific.`
- `Review this thread draft for hype, fluff, and risky claims.`

## Foundation first

- If `prisma-product-messaging` is available, consult it first.
- Use its positioning, product-language, channel-guidance, and anti-pattern rules as the source of truth.
- Then read `references/x-guidance.md` or `references/linkedin-guidance.md`, depending on the target channel.

## Workflow

1. Confirm whether the target is X or LinkedIn. If the operator does not say, infer it from the request and state the assumption.
2. Identify the product, audience, and single main point.
3. Strip hype, slogans, and multi-claim overload.
4. Rewrite in a human voice with one clear takeaway.
5. Keep product wording exact and flag risky claims.

## Social rules

- One post should carry one main idea.
- Short is good, but empty is not.
- Do not use em dashes.
- Do not default to "big news" or "we are excited" framing unless the operator explicitly wants that style.
- If the copy needs more context than one post can support, suggest a simpler angle instead of cramming it in.
