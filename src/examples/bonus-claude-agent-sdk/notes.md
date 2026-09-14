# Bonus — Claude Agent SDK vs. DIY (Messages API)

This folder is **not part of the numbered 01–15 roadmap**. CCD-F almost
certainly tests the raw Messages API (`@anthropic-ai/sdk`) — the thing every
other step in this repo uses. `@anthropic-ai/claude-agent-sdk` is a
different, higher-level product (it's what powers Claude Code itself), and
this folder exists purely for comparison, because our own notes kept
referencing its concepts.

`agent-sdk.ts` re-implements **the exact same task as step 07**
(`src/examples/07-sub-agents/example.ts`): compare Python, Go, and Rust for
building a CLI tool, using 3 sub-agents plus a synthesis. Read the two files
side by side.

## What's actually different

| | Step 07 (DIY, `@anthropic-ai/sdk`) | This file (`@anthropic-ai/claude-agent-sdk`) |
| --- | --- | --- |
| Who writes the orchestration loop | You do — `Promise.all`, then a 4th call | The SDK does — you write one `query()` call |
| How a sub-agent is defined | Nothing formal — just another `messages.create()` call with a system prompt | A real `AgentDefinition` object: `description`, `prompt`, `tools`, `model` |
| How Claude decides to delegate | N/A — your code decides, unconditionally | **Claude itself decides**, based on each subagent's `description` and your prompt — it can also choose *not* to delegate at all |
| Tool access | Whatever you wire into your own loop | Real built-in tools (`Read`, `Bash`, `Write`, ...) unless restricted per-subagent via `tools: []`/`disallowedTools` |
| Execution model | Sequential code you control exactly | Subagents run **in the background** by default — the main agent can finish a turn while waiting and pick back up later |

## A real finding worth knowing about

The **first** time this example ran, Claude answered the whole comparison
directly from its own knowledge — it never called the `Agent` tool at all,
despite three subagents being defined and described. Nothing was broken;
this is documented, expected behavior: Claude decides on its own whether
delegating is worth it, and with a well-known topic like "Python vs Go vs
Rust," it can decide it already knows enough to just answer. The Agent SDK
docs' own troubleshooting section confirms this and recommends being
explicit — naming the subagents in the prompt — which is exactly what
finally got it to delegate on a later run. **This is the single biggest
practical difference from step 07**: in the DIY version, sub-agents run
*because your code called them* — delegation is guaranteed. Here,
delegation is a judgment call Claude makes, and you can only *encourage* it
(clear descriptions, explicit naming), never *force* it, short of removing
its ability to answer directly.

A second finding, once it did delegate: because subagents run **in the
background**, the main agent ended its turn early ("I'll wait for their
reports...") and got a **fresh turn — and a new `result` message — each
time a subagent finished**. `agent-sdk.ts` handles this by only trusting
the *last* `result` seen once the loop ends, logging the intermediate ones
as `[turn ended]` rather than treating each as final. Step 07's DIY version
has no equivalent — `Promise.all` either finishes or it doesn't, there's no
"partial completion, come back later" state to reason about.

## Safety note on this example specifically

Each subagent here is defined with `tools: []` — deliberately no tools at
all, since the task is pure reasoning. The main thread also sets
`disallowedTools: ["Bash", "Write", "Edit", "NotebookEdit"]` so nothing in
this query can modify this project's files or run shell commands, even
though the underlying SDK *can* do both for real (unlike every other
tool in this repo, which is a mock). `allowedTools` only auto-approves —
it does **not** restrict what's available — so `disallowedTools` (which
actually removes a tool from context) is the real safety lever here, not
`allowedTools`.
