# Step 08 — Multi-Agent Orchestration

Step 07 introduced the basic idea: a sub-agent is just another
`messages.create()` call, and you (in code) decide how to combine several of
them. This step names the common **shapes** that combination takes.
Anthropic's own "Building Effective Agents" guidance names five of them —
worth knowing the vocabulary even beyond this boilerplate:

| Pattern | What it means | Where you've seen it |
| --- | --- | --- |
| **Prompt chaining** | Step N's output becomes part of step N+1's input. Strictly sequential — step 2 cannot start before step 1 finishes. | New this step — `chaining.ts` |
| **Routing** | One call classifies the input, then exactly **one** matching downstream call handles it. | New this step — `routing.ts` |
| **Parallelization (sectioning)** | Split one task into independent pieces, run them concurrently, merge results. | Step 07 — 3 language sub-agents ran together |
| **Orchestrator-workers** | Like parallelization, but the *breakdown itself* is decided by an LLM call at runtime, not hardcoded in your code. Step 07 hardcoded `["Python", "Go", "Rust"]` — a true orchestrator-worker version would have a first call decide what the workers should even be. | Not built yet — a deeper variant of step 07 |
| **Evaluator-optimizer** | One call generates, a second call grades it against criteria and gives feedback, looping until it passes (or a cap is hit). | Not built yet — this is conceptually what Managed Agents' `user.define_outcome` / rubric grading does, in step 15 |

## Prompt chaining — `chaining.ts`

A pipeline: outline → draft → polish. Each step is a **different, focused**
system prompt (an outliner, a writer, an editor), and each step's user
message explicitly includes the previous step's full output. This is
functionally the manual, DIY version of what step 07 called "sub-agents" —
same mechanism (repeated `messages.create()` calls with different system
prompts), but **sequential and dependent** instead of parallel and
independent.

**When to use it:** the task naturally decomposes into ordered steps where
each step genuinely needs the previous one's result to do good work — not
just because "breaking it up feels cleaner." If step 2 doesn't actually
need step 1's output, you don't need chaining — you need one call, or
parallelization.

## Routing — `routing.ts`

One small, cheap call classifies the input into a category; only the
matching specialist call actually runs. This is fan-out's opposite: fan-out
(step 07) always calls **every** sub-agent; routing calls **exactly one**,
chosen dynamically based on the input.

**When to use it:** the input can cleanly fall into one of a few known
categories, and each category benefits from a distinct, focused system
prompt (or even a distinct model — e.g. route simple queries to Haiku,
complex ones to Opus). A support-ticket triage system is the classic
example, used here.

## A note on "multi-agent," revisited

None of this step uses a special "multi-agent" API, same as step 07 — it's
still plain `messages.create()` calls, orchestrated by your own
if-statements and `await`s. Worth keeping straight, since the word "agent"
gets overloaded across three different real things:

- **This boilerplate (`@anthropic-ai/sdk`, Messages API)** — no formal
  agent object; every pattern above is DIY orchestration in your own code.
- **The Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)** — a different
  package (it's what powers Claude Code) with a real `AgentDefinition`
  (`description`, `prompt`, `tools`, `disallowedTools`, `model`) and a
  built-in `Agent` tool the main loop calls to delegate — but it runs an
  entire agent loop for you, a different product from the raw API.
- **Managed Agents (same `@anthropic-ai/sdk`, `client.beta.agents`)** — a
  hosted REST product with a real `Agent` object and a
  `multiagent: { type: "coordinator", agents: [...] }` field for exactly
  this coordinator-and-roster shape, natively. Queued as step 15.
