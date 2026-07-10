---
name: content-write-tweet
description: Use when the operator wants to write a tweet, draft an X post, turn a sentence or an article into punchy social copy, or get tweet options for a piece of content.
metadata:
  version: "2026.6.11"
---

# Write Tweet

Turn an input into punchy, ready-to-post tweets. The shape of the output depends on the size of the input:

- **Small input** (a sentence, an idea, a single announcement, a link): produce **1–3 options of the same tweet** — different angles or phrasings the operator can pick from.
- **Large input** (a full article, blog post, doc, or long content piece): produce **1–5 distinct tweets**, each pulling out a _different_ part of the content. Do **not** offer multiple options of the same tweet in this mode — one tweet per idea.

Pick the mode from the input. If it is genuinely ambiguous, ask the operator which they want before drafting.

## Step 1: Read the input

The operator must provide something to work from:

- A short pitch, idea, or sentence pasted into the conversation
- A link plus a one-line framing
- A path to a draft or article file
- Pasted long-form content

If nothing was provided, ask: _"What should the tweet be about? Paste an idea, a link, or the article/content you want it drawn from."_ Do not invent the subject.

## Step 2: Decide the mode

- If the input is a single idea or short snippet → **Options mode** (Step 3).
- If the input is a full article or large content piece → **Highlights mode** (Step 4).
- When unsure, ask the operator which they want rather than guessing.

## Step 3: Options mode (small input)

Produce **1–3 tweets that all say the same thing**, varying the angle:

- Give at least 2 options when there is room for a meaningfully different take; 1 is fine if the input is tightly constrained.
- Vary the hook across options (e.g. one bold claim, one curiosity gap, one direct/plain). Don't just reword.
- Number them and add a 2–4 word label per option (e.g. _"Option 1 — bold claim"_) so the operator can pick fast.

## Step 4: Highlights mode (large input)

Pull out the **1–5 most tweetable, distinct ideas** from the content:

- One tweet per idea — each stands alone and could post independently.
- Cover genuinely different points (a stat, a counterintuitive takeaway, a how-to nugget, the conclusion) — not the same idea reworded.
- Use fewer tweets if the content only has one or two strong ideas. Don't pad to reach five.
- Number each tweet and give it a short label naming the part of the content it draws from.

## Tweet craft

Every tweet, in either mode:

- **One idea per tweet.** If it needs "and", it's probably two tweets.
- **Front-load the hook.** The first line has to earn the second. Lead with the claim, the number, or the tension — never with throat-clearing ("In this post we…").
- **Cut filler.** No "very", "really", "just", "in order to", hedges, or hashtag soup. One hashtag max, usually zero.
- **Concrete over abstract.** Specific noun, real number, named thing beats vague benefit language.
- **Never use em dashes.** They read as AI-written on the timeline. Break the sentence with a period, a comma, or a line break instead (applies to en dashes used as punctuation too).
- **Use spacing as punctuation.** Line breaks carry weight on X. Put the line you want to land on its own line, and group related points into the same block so the structure reads for you. White space makes a point stick.
- **Keep it tight.** Aim well under 280 characters. Shorter is punchier. Flag if a draft runs long.
- **Match the operator's voice** if a sample or existing copy was given; otherwise default to plain, confident, human — not salesy or generic-corporate.
- **Links and handles**: include a link only if the operator gave one. Don't fabricate URLs, stats, or quotes — if a punchy line needs a number you don't have, mark it as a `[placeholder]` for the operator to fill.

## Step 5: Deliver

Output the tweets as a clean, numbered list ready to copy. For each tweet, show:

- The label (angle in Options mode, content part in Highlights mode).
- The tweet text exactly as it would post.
- An approximate character count.

Keep your own commentary minimal — the operator wants copy, not a writeup. Offer to tighten, re-angle, or thread any of them as a follow-up.

## Anti-patterns

- **Mixing the two modes.** Options-of-the-same-tweet is for small inputs; one-tweet-per-idea is for large content. Don't give five options of one tweet for an article, and don't atomize a single idea into five unrelated tweets.
- **Fabricating facts.** No invented stats, quotes, features, or links. Use a `[placeholder]` when a number is needed but absent.
- **Burying the hook.** Setup-then-payoff dies on the timeline. Lead with the strongest line.
- **Hashtag and emoji clutter.** At most one hashtag, sparing emoji, only when they add meaning.
- **Generic hype.** "Game-changer", "revolutionary", "supercharge" read as noise. Be specific instead.
- **Padding to a number.** If the content only yields two good tweets, deliver two. Quality over hitting the cap.
- **Inventing the subject.** No input → ask. Don't generate a topic from imagination.
