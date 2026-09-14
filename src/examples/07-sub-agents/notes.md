# Step 07 — Sub-Agents

## What is a Sub-Agent?

A **sub-agent** is a separate, independent call to the model — usually with
its own narrow system prompt and its own isolated conversation — used to
handle one piece of a larger task, instead of asking a single call to do
everything at once.

There's no special "sub-agent API." A sub-agent in this step is just
`client.messages.create()` called again, with a different system prompt,
from inside your own code. The "orchestrator" is the outer script that
decides what to delegate, spawns those calls, and does something with the
results.

```
        ┌─────────────┐
        │ Orchestrator │   (your code — not a model call by default)
        └──────┬───────┘
       spawns  │  spawns  │  spawns
        ┌──────▼───┐ ┌────▼─────┐ ┌───▼──────┐
        │ Sub-agent │ │ Sub-agent │ │ Sub-agent │   (independent messages.create() calls)
        │  (task A) │ │  (task B) │ │  (task C) │
        └──────┬───┘ └────┬─────┘ └───┬──────┘
               └──────────┼───────────┘
                    results merged
                           │
                  ┌────────▼────────┐
                  │ Synthesis call    │   (one more messages.create() call)
                  │ (the orchestrator │
                  │  asking the model │
                  │  to combine them) │
                  └───────────────────┘
```

## Why Sub-Agents?

- **Context isolation** — each sub-agent only sees the prompt it needs, not
  the whole history of everything else going on. Smaller, focused context
  tends to produce a more focused answer than one call trying to juggle
  several unrelated subtasks at once.
- **Parallelism** — if the subtasks don't depend on each other, you can run
  them **concurrently** (`Promise.all`) instead of one after another. Lower
  wall-clock latency for the same total amount of "thinking."
- **Specialization** — each sub-agent's system prompt can be a tight,
  targeted persona ("You are an expert on X") rather than one generic
  prompt trying to be good at everything.
- **Keeps the orchestrator's own context small** — the orchestrator only
  has to hold the *final* results of each sub-agent, not their full
  reasoning trace, which matters a lot once you're doing this across many
  rounds or many subtasks.

## The trade-off

Sub-agents aren't free:

- **Cost multiplies** — N sub-agents + 1 synthesis call = N+1 separate
  billed requests, each with its own input/output tokens. Fanning out to
  10 sub-agents is roughly 10x the request volume of doing it in one call.
- **No shared context by default** — sub-agent A has no idea what sub-agent
  B said unless you explicitly pass it along (that's what the synthesis
  step in `example.ts` does).
- **More moving parts to debug** — a bug could be in any one of N+1 calls,
  not just one.

Use sub-agents when the task is genuinely parallelizable or benefits from
separate focused "experts," not as a default way to structure every prompt.

## Where is this used?

- Research assistants that split a broad question into independent
  sub-questions, investigate each separately, then merge findings.
- Reviewing multiple files/PRs in parallel, each by its own focused call.
- "Compare N options" tasks — one sub-agent per option, one synthesis call
  to recommend.
- Claude Code's own `Task` tool (spawning subagents for isolated work).
- Managed Agents' `multiagent: { type: "coordinator" }` — the
  platform-native version of this same orchestrator/sub-agent shape,
  covered later in step 15.
