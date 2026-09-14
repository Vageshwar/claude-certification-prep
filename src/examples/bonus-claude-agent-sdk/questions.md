# Bonus — Self-test questions

Try answering before opening each spoiler.

---

**1. In step 07's DIY version, sub-agent delegation is guaranteed by code (`Promise.all` on a fixed array). Is delegation guaranteed the same way in `agent-sdk.ts`?**

<details>
<summary>Show answer</summary>

**No.** Claude decides whether to invoke the `Agent` tool at all, based on
your prompt and each subagent's `description`. The first run of this exact
file answered directly with no delegation; a later run (with more explicit
prompting naming the subagents) did delegate. You can make delegation more
likely — clear descriptions, naming subagents explicitly — but you can't
force it the way `Promise.all` forces three calls to happen.

</details>

---

**2. What does `allowedTools` actually do, and what's the common misconception?**

<details>
<summary>Show answer</summary>

It **auto-approves** listed tools so Claude can use them without a
permission prompt. The common misconception is that it *restricts* Claude
to only those tools — it doesn't. A tool not in `allowedTools` can still be
available; it would just trigger a permission prompt (which, in a headless
script with no one to answer it, is a real problem). The actual
restriction mechanism is `disallowedTools`, which removes a tool from
context entirely.

</details>

---

**3. Why does each `AgentDefinition` here set `tools: []` instead of leaving `tools` unset?**

<details>
<summary>Show answer</summary>

Omitting `tools` means the subagent inherits every tool available to
subagents — including real `Bash`/`Write`/`Edit` access to the actual
filesystem, since this SDK's tools are real, not mocks like everywhere
else in this repo. This task is pure reasoning (comparing languages from
knowledge), so there's no reason any subagent needs filesystem or shell
access — `tools: []` removes all of it, the safest option for a task that
doesn't need tools at all.

</details>

---

**4. Why did the example need `disallowedTools` on the MAIN query, separate from each subagent's `tools: []`?**

<details>
<summary>Show answer</summary>

`tools: []` on an `AgentDefinition` only restricts *that subagent*. The
main thread agent (the one running the top-level `query()`) is a separate
context with its own tool access, defaulting to the full built-in toolset
unless explicitly restricted. `disallowedTools: ["Bash", "Write", "Edit",
"NotebookEdit"]` on the top-level `options` is what keeps the main agent
itself from touching the filesystem or running commands — the two
restrictions (main thread vs. each subagent) are independent and both
needed.

</details>

---

**5. Why did the script see more than one `result`-type message during a single `query()` call, and why does `agent-sdk.ts` only print `=== FINAL ===` after the loop ends rather than on the first `result` it sees?**

<details>
<summary>Show answer</summary>

Because subagents run in the background, the main agent can end its
current turn while waiting for them ("I'll wait for their reports...") —
each ended turn produces its own `result` message, even though the overall
query isn't done. If the code printed "final" on the first `result` it
saw, it would show a "waiting" message as if it were the answer. Since
only the truly last message the loop ever processes is the real final
state, the script stores each `result.result` into a variable and only
logs it as `=== FINAL ===` once the `for await` loop itself ends (meaning
the whole query is genuinely done).

</details>

---

**6. Given everything above, why does `notes.md` say this folder is explicitly NOT part of the CCD-F-focused roadmap?**

<details>
<summary>Show answer</summary>

Because CCD-F almost certainly tests the raw Messages API concepts (tool
use, caching, error handling, structured outputs — the primitives every
other numbered step in this repo uses), not a separate, higher-level
product with its own agent loop, permission system, and background-task
semantics. `@anthropic-ai/claude-agent-sdk` solves a different problem
(building a Claude-Code-like coding agent) and behaves differently enough
(non-deterministic delegation, background execution, real filesystem
tools) that treating it as equivalent to the DIY pattern would be
misleading for exam prep.

</details>
