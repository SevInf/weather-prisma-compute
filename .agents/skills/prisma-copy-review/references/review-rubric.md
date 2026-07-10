# Review rubric

Use this rubric for Prisma communication review and rewrite tasks.

## What to check

### Positioning alignment

- Does the message match the current Prisma positioning?
- Does it focus on the user problem before the product label?
- Is the right audience clear?
- Does the message use the right value proposition for the product being discussed?

### Product accuracy

- Are product names and capitalization correct?
- Is each capability attached to the correct product or surface?
- Does the copy overpromise maturity, scope, or guarantees?
- Does the copy introduce a product narrative that the source material does not support?
- Does the copy make absolute operational claims such as `no cold starts`, `no timeouts`, `no limits`, `automatic recovery`, or `instant deploys` without explicit backing?

### Clarity and specificity

- Are claims concrete enough to be useful?
- Is the copy free of fluff, repetition, and generic slogans?
- Does every sentence add meaning?
- Are vague benefits translated into observable workflow improvements?
- Are teaser lines specific enough to say what area is changing and where the reader should watch for updates?

### Style guardrails

- Remove em dashes.
- Remove dramatic fragments.
- Remove unsupported superlatives.
- Remove repetitive intensity.
- Remove empty launch language.
- Replace vague teaser fragments with complete sentences.

### Channel fit

- Is the tone right for docs, website, blog, launch copy, X, LinkedIn, or customer-facing communication?
- Is the level of context appropriate for the channel?
- Is the copy persuasive only to the degree the channel allows?

## Large artifact review

For PRs, webpages, or multi-file launches:

- Review the highest-visibility copy first.
- Prioritize hero sections, feature bullets, comparison language, docs intros, quickstarts, and limitations.
- Group repeated issues into one finding when the same problem appears across multiple files.
- Distinguish between wording problems and source-of-truth problems.

## Sensitive launch checks

Be extra cautious when reviewing copy for Prisma Compute or other evolving product areas:

- Watch for unsupported maturity claims.
- Watch for undocumented operational guarantees.
- Watch for claims that collapse setup complexity without explaining the actual workflow.
- Watch for competitive framing that goes beyond the documented differentiator.

## Review output format

```md
## Overall assessment

[Brief summary of whether the message is aligned, partially aligned, or misaligned.]

## What works

- [Specific strength]
- [Specific strength]

## Issues to fix

| Issue   | Why it matters | Suggested fix             |
| ------- | -------------- | ------------------------- |
| [Issue] | [Explanation]  | [Replacement or guidance] |

## Product accuracy notes

- [Flag incorrect or risky product language]
- [Suggest corrected wording]

## Suggested rewrite

[Provide a rewritten version appropriate for the requested channel.]

## Final checklist

- Positioning aligned: Yes/No/Partially
- Product language accurate: Yes/No/Partially
- Fluff removed: Yes/No/Partially
- Em dashes removed: Yes/No
- Channel tone appropriate: Yes/No/Partially
```

## Rewrite-only output format

```md
## Revised version

[Rewrite]

## What changed

- [Change made]
- [Change made]
- [Change made]
```

## Issue-writing guidance

- Make each issue specific to the actual line.
- Explain the business or reader impact.
- Offer either replacement copy or precise rewrite guidance.
- If the issue is uncertainty, say what needs verification.
