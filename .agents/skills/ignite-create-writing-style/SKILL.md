---
name: ignite-create-writing-style
description: Use when the operator wants to define their writing style, create a writing style skill, capture their voice, or produce a reusable skill that applies their writing style to articles and blog posts.
metadata:
  author: Prisma
  version: "2026.6.12"
---

# Create Writing Style Skill

Guide the operator through a writing style exercise, then synthesise their answers into a reusable skill that applies their writing style to any article or blog post. Follow the steps in order.

## Step 1: Explain the exercise

Tell the operator what will happen:

> I will ask you a series of questions. Your answers will reveal your writing style — how you explain, reason, and interact with people. After the exercise, I will synthesise your answers into a reusable skill that applies your style to any article or blog post.
>
> Questions 1–3 are required. Questions 4–5 are optional but recommended — they reveal additional dimensions of your voice.
>
> Write your answers as you naturally would. Do not polish for an audience; do not aim for brevity or formality. The exercise works because your answers are unselfconscious. Aim for at least a few paragraphs per answer.

## Step 2: Required questions

Present all three required questions together. Wait for the operator to answer all three before proceeding. If the operator skips a question, ask once: _"This question is required — it covers a core dimension of your style. Please answer it before we continue."_

### Question 1: Explain something you understand well

> **Explain a topic you understand better than most people.** Focus on what people commonly misunderstand and what they should understand instead.

This captures: explanatory style, structure, examples, technical depth, sentence construction, and how the operator teaches.

### Question 2: Make a decision between two good options

> **Describe a real decision where you had to choose between two reasonable options.** Explain the strengths of each, the trade-offs involved, and why you ultimately chose one.

This captures: reasoning style, how the operator evaluates trade-offs, how they handle uncertainty, and how they persuade.

### Question 3: Describe a disagreement or mistake

> **Describe a time you disagreed with someone, received criticism, or made a mistake.** Explain what happened, how you thought about it, and what you learned or changed afterward.

This captures: emotional tone, humility, nuance, conflict handling, self-reflection, and how the operator discusses people.

## Step 3: Optional questions

Ask the operator whether they want to answer the optional questions. Present both together. Accept a skip on either or both without follow-up.

Recommended framing: _"Two optional questions can reveal more of your voice. Would you like to answer them? (You can skip either one.)"_

### Question 4: Critique something (optional)

> **Choose a product, company, trend, process, or idea.** Explain what it gets right, what it gets wrong, and what you would change.

This reveals: opinions, judgement, and argumentative style.

### Question 5: Tell a story (optional)

> **Describe a situation that did not go according to plan and what happened next.**

This captures: narrative voice, pacing, humour, and storytelling ability.

## Step 4: Analyse the writing style

Read all the operator's answers thoroughly. Extract a structured profile of their writing style across these dimensions:

| Dimension                            | What to look for                                                                                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sentence structure**               | Average length, variety, rhythm. Short and punchy? Long and meandering? Mixed?                                                                     |
| **Paragraph shape**                  | Dense or airy? One idea per paragraph or multiple? Transition style between paragraphs.                                                            |
| **Explanatory approach**             | Leads with the concept or the example? Uses analogies, metaphors, or direct description? How does the operator build from simple to complex?       |
| **Reasoning pattern**                | Lists pros and cons, or argues a single line? Weighs trade-offs explicitly or lets the conclusion speak? How does the operator handle uncertainty? |
| **Emotional register**               | Flat, warm, dry, intense, wry? How does emotion appear — directly, through word choice, or not at all?                                             |
| **Use of examples**                  | Frequent or rare? Concrete or abstract? Personal or drawn from the domain?                                                                         |
| **Humour**                           | Present or absent? If present: dry, self-deprecating, situational, wordplay?                                                                       |
| **Frustration and disagreement**     | Direct or indirect? Measured or forceful? How does the operator attribute blame or responsibility?                                                 |
| **Self-reflection**                  | Explicit ("I was wrong because") or implicit (shifts in framing)? How does the operator narrate change?                                            |
| **Opinions and judgement**           | Confident assertions, hedged claims, or something in between? How does the operator qualify strong opinions?                                       |
| **Narrative voice** (if Q5 answered) | First person, second person, or third? Conversational or formal? How does the operator handle tension and resolution?                              |
| **Vocabulary and register**          | Technical, plain, literary, colloquial? Jargon-heavy or accessible? Any signature phrases or constructions?                                        |
| **Structure and pacing**             | Front-loads the point or builds to it? Uses headings, numbered lists, or flowing prose? How does the operator signal transitions?                  |

Record the profile as a structured summary. Do not reduce it to a single paragraph — each dimension should have its own line or short paragraph. The profile is the raw material for the skill.

## Step 5: Synthesise into a skill

Using the ignite-create-skill skill as a structural reference, produce a new skill that applies the operator's writing style to any article or blog post. The skill must:

1. **Have valid frontmatter.** Set `name` to a slug derived from the operator's identity or request (e.g., `style-<operator-name>`). Set `description` to a "Use when…" trigger phrase that matches the skill's purpose. Include `metadata.author` and `metadata.version`.

2. **Instruct the agent to apply the operator's style.** The body must contain:
   - A **Style profile** section that encodes the analysis from Step 4 as concrete, actionable rules. Each dimension becomes a rule or small set of rules the agent follows when writing. Write the rules as imperatives, not descriptions: _"Lead with the concept, then anchor it with a concrete example"_ rather than _"The operator tends to lead with concepts then give examples."_
   - An **Applying the style** section that describes the workflow: read the draft, identify style mismatches, rewrite to match the profile, and flag any places where the style conflicts with the content's purpose (the operator should win that conflict, not the style).
   - An **Anti-patterns** section that lists what to avoid, derived from the operator's style. If the operator never uses hype, anti-pattern: _"Hype or superlatives (game-changer, revolutionary, supercharge)"_. If the operator is direct, anti-pattern: _"Hedging or passive voice when a direct claim is warranted."_

3. **Be self-contained.** The skill must not require the operator to re-do the exercise. All style information is encoded in the skill itself.

4. **Stay under 500 lines and 5000 tokens.** The style profile should be concise and actionable, not a verbose restatement of the answers.

Present the draft skill to the operator for review. Iterate until the operator confirms.

## Step 6: Write the skill file

Write the confirmed skill as `SKILL.md` inside a directory under `skills/.experimental/` using the `name` from the frontmatter. If the operator wants it placed elsewhere, follow their direction.

The generated skill is experimental by default. The operator can promote it to `.curated` when it has been validated in real writing workflows.

## Step 7: Lint

Run `pnpm lint` and fix any markdownlint violations in the new files before finishing.

## Summary

After completing all steps, provide a summary:

- The writing style profile (key dimensions identified)
- The generated skill name, directory path, and bucket
- A brief description of what the skill does when invoked
- Any dimensions where the answers were ambiguous and the profile made a judgement call

## Anti-patterns

- **Coaching the operator's answers.** The exercise works because the answers are natural. Do not suggest how to answer, do not prompt for more formality or brevity, and do not rewrite the operator's words.
- **Reducing the style to a single label.** _"Conversational and direct"_ is not a style profile — it is a label. The profile must be structured, multi-dimensional, and actionable.
- **Ignoring contradictions in the answers.** If the operator is formal in Q1 but conversational in Q3, record both. The style is the full pattern, not a smoothed average.
- **Writing the style profile as descriptions instead of rules.** _"The operator uses short sentences"_ is a description. _"Use short sentences. Average 12–15 words. Vary with an occasional long sentence for rhythm"_ is a rule. The skill must contain rules.
- **Making the generated skill depend on the exercise.** The skill must be self-contained. No "refer to the operator's answers" or "re-run the exercise" in the generated skill.
- **Skipping optional questions that were answered.** If the operator answered Q4 or Q5, the dimensions those answers reveal must appear in the profile.
