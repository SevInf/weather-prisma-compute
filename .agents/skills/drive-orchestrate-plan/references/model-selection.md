# Model Selection

The implementer and reviewer agent definitions in `./agents/` do not hardcode a model. The orchestrator's default model carries through unless the user or project overrides it. Suggested guidance:

- **Implementer**: a model strong at code generation, tool-using rigor, and validation discipline. The implementer's report is structured and large; a model with good long-context recall helps.
- **Reviewer**: a model strong at independent critical reading, AC tracking, and concise verdict-issuing. The reviewer's job is to push back; lean toward models that resist sycophantic agreement.

If the user specifies different models per agent, pass them through to the harness's delegation mechanism.

**Model + resume interaction.** On most harnesses, a subagent's model is fixed at first-spawn time and cannot be changed on resume without spawning fresh. If the user requests a model change mid-project, that's a deliberate fresh-spawn under the "pivot of role intent" case in § Subagent continuity — record the swap and the new ID under § Subagent IDs.
