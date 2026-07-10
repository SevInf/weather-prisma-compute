# AGENTS.md detection signals

Detection reference for the cleanup workflow (see [workflow.md](workflow.md)). Two parts: the signal table that drives the review pass and the relocation test. The content standard a lean `AGENTS.md` must satisfy is the authoring rules in the skill body.

## Signal table

Each signal maps to a corrective action and an action class. The class decides how the edit is applied (see the mutation contract in [workflow.md](workflow.md)): `rewrite` and `gap-fill` apply in place, `relocate` is proposed and applied only on sign-off.

| Signal (smell)                                                                                                                                   | Action                                                                                                              | Class      |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------- |
| Prose or verbose sentences: paragraphs, hedging, explanation of intent                                                                           | Rewrite to succinct imperative instructions a human can scan                                                        | `rewrite`  |
| Generic advice the model already knows: "write clean code", "add tests", "use meaningful names"                                                  | Delete                                                                                                              | `rewrite`  |
| Vague or unactionable rule: "be careful with X", "try to keep it tidy"                                                                           | Make it concrete and checkable, or delete                                                                           | `rewrite`  |
| Narrative or background: why the project exists, history, rationale                                                                              | Delete; an AGENTS.md is instructions, not a story                                                                   | `rewrite`  |
| Inconsistent emphasis: MUST or IMPORTANT scattered widely or absent on load-bearing rules                                                        | Reserve emphasis for the few genuinely critical rules                                                               | `rewrite`  |
| Full, auto-generated, or drifting directory tree                                                                                                 | Replace with a curated entry-point pointer list (see the authoring rules in the skill body)                         | `rewrite`  |
| Scoped guidance: rules that apply only to files under one existing subfolder                                                                     | Relocate to that folder's nested `AGENTS.md`                                                                        | `relocate` |
| Explanatory documentation, not agent instruction: conceptual overviews, process descriptions, reference material a human reads                   | Move to the project's existing documentation home; leave a pointer in `AGENTS.md` only if an agent needs to find it | `relocate` |
| Must-follow rule reachable only by a link: a rule the agent must obey lives in a separate doc, referenced with a plain link rather than injected | Convert the link to an injected include (`@import`), or inline the rule                                             | `rewrite`  |
| Missing core commands: build, test, or lint not documented                                                                                       | Add the concrete commands                                                                                           | `gap-fill` |

## Relocation test

A section qualifies for relocation only when **both** parts hold:

1. **Exclusive scope.** Every rule in the section applies only to files under one subfolder, not repository-wide. Guidance that is cross-cutting stays in the root file.
2. **Landing site exists.** That subfolder is already present in the repository. Never create a folder to receive relocated guidance.

A section that fails either part stays where it is. Heading words are a weak hint, never the trigger: the trigger is the scope of the guidance, not its title.

### Choosing the destination

Relocation has three destinations, decided by what the content is:

1. **Folder-scoped agent instruction** goes to `subfolder/AGENTS.md`, with a sibling `CLAUDE.md` symlink so the nested guidance is picked up. Apply the two-part test above.
2. **Must-follow rules that belong in a shared file** (for example one rules doc several units depend on) go to that file and are pulled back with an **injected include** (`@import` that loads with the importing file), never a bare link. A link is a reference the agent may not follow; moving a must-follow rule behind one silently drops it from context. Reserve plain links for case 3.
3. **Explanatory documentation** that a human reads goes to the project's existing documentation home, discovered while reading the repository. Do not invent a documentation taxonomy: place it where the project already keeps such content. Leave a pointer in `AGENTS.md` only when an agent needs to find it.
