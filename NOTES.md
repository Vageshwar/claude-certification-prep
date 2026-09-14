# Learning roadmap — Anthropic SDK agentic dev (TypeScript)

Goal: build up an agentic-dev boilerplate step by step, in a way that also
covers the ground the Claude Certified Developer Foundation course expects
(Messages API fundamentals, tool use, streaming, error handling).

Each step is a standalone runnable file under `src/examples/`. Run one with
`npx tsx src/examples/NN-name.ts` (or `npm run NN`, e.g. `npm run 01`).

**Folder pattern from step 06 onward:** steps 01–05 are simple, single-file
mechanics (one API concept each) and are covered well enough by this file's
own "before moving to step N" sections. Starting at step 06, concept-heavy
topics get their own folder — `src/examples/NN-topic/` — containing:

- `example.ts` (or more, if a step needs several) — the runnable code
- `notes.md` — plain-language definitions: what the concept is, why it
  exists, where it's used in practice
- `questions.md` — self-test questions with answers hidden behind
  `<details>` spoiler blocks, to check understanding before moving on

`src/tools/` and `src/agent/` stay shared across steps — a tool or helper
defined once (e.g. `src/tools/email.ts`, `src/agent/guardrails.ts`) can be
reused by any later step's `example.ts`, the same way step 04 reused step
03's tool handlers.

## Setup (done)

- `package.json` — `"type": "module"`, deps: `@anthropic-ai/sdk`, `dotenv`; devDeps: `typescript`, `tsx`, `@types/node`
- `tsconfig.json` — `NodeNext` module/resolution (this is why local imports end in `.js`, e.g. `../client.js`, even though the file is `.ts` — that's a Node ESM rule, not a typo)
- `.gitignore` — excludes `.env`, `node_modules/`, `dist/`
- `src/client.ts` — shared `Anthropic` client + `MODEL` constant (reads `CLAUDE_MODEL` from `.env`, currently `claude-sonnet-5`)
- `npm run typecheck` — `tsc --noEmit`, run this after every step

## Step checklist

- [x] **01 — basic message** (`src/examples/01-basic-message.ts`) — single `messages.create()` call, non-streaming. Ran successfully.
- [x] **02 — streaming** (`src/examples/02-streaming.ts`) — same call, streamed via `.stream()`, logging each SSE event type plus `.finalMessage()`. Ran successfully.
- [x] **03 — tool use, manual loop** (`src/tools/calculator.ts`, `src/tools/weather.ts`, `src/examples/03-tool-loop.ts`) — hand-written tool schemas + `while` loop on `stop_reason`. Ran successfully — Claude called both tools **in parallel in one turn**, we executed both and sent both `tool_result`s back in a single message, then it answered.
- [x] **04 — tool use, SDK Tool Runner** (`src/tools/calculator.zod.ts`, `src/tools/weather.zod.ts`, `src/examples/04-tool-runner.ts`) — same two tools (schemas now Zod, wrapping the *same* `runCalculator`/`runWeather` handlers from step 03), driven by `client.beta.messages.toolRunner()`. Ran successfully — identical outcome to step 03, no hand-written loop.
- [x] **05 — error handling** (`src/examples/05-error-handling.ts`) — typed exception chain, most-specific-first. Ran successfully against 4 cases: `NotFoundError` (bad model ID), `BadRequestError` (empty `messages[]`), a client-side `AnthropicError` (see note below), and a normal success.
- [x] **06 — guardrails: tool-execution gating** (`src/examples/06-guardrails/` — see below) — a `GuardedTool` registry (`requiresConfirmation: boolean`) plus a terminal confirmation prompt gating the (mock) `send_email` tool, while `calculator`/`weather` stay auto-allowed. Ran both paths live: **allow** → email "sent", Claude summarizes; **deny** → `tool_result` with `is_error: true` and a denial message, Claude gracefully reports it couldn't complete that step instead of erroring out.
- [x] **07 — sub-agents** (`src/examples/07-sub-agents/`) — orchestrator-worker pattern: `Promise.all` fans out 3 independent sub-agent calls (one per language, each its own focused system prompt), then a 4th synthesis call fans back in to recommend one. Ran live — 4 total requests, usage tracked across all of them.
- [x] **08 — multi-agent orchestration** (`src/examples/08-multi-agent-orchestration/`) — two new patterns beyond step 07's fan-out: **prompt chaining** (`chaining.ts` — sequential outline → draft → polish pipeline, each step feeding the next) and **routing** (`routing.ts` — classify then call exactly one matching specialist). Both ran live successfully. `notes.md` maps all 5 of Anthropic's named workflow patterns (chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer) to what's built so far and what's still ahead.
- [ ] **09 — agent memory, sessions & resume/forking (DIY)** — persist the `messages` array to disk/SQLite between runs; "resume" = reload and continue; "fork" = branch the saved array at a point and continue two ways from there.
- [ ] **10 — structured output handling** — `output_config.format` / `client.messages.parse()` with a Zod schema, plus `strict: true` tool schemas, so responses are guaranteed-valid JSON instead of parsed-and-hope.
- [ ] **11 — agent skills** — build a minimal custom skill (a `SKILL.md`-style folder), use it via the Messages API `container.skills` + code execution, then chain two skills together in one request.
- [ ] **12 — how agents use MCP** — the MCP connector on the Messages API (`mcp_servers` + `mcp_toolset`), calling tools on a real or mock MCP server without you implementing the tool yourself.
- [ ] **13 — deciding a model: Opus vs Sonnet vs Haiku, thinking vs effort** — a decision-making exercise, not new API surface: run the same task across models/effort levels, compare quality/latency/cost, and land on a rule of thumb.
- [ ] **14 — prompt caching, token cost & error handling (deepened)** — `cache_control` breakpoints, reading `usage.cache_read_input_tokens` to verify hits, and revisiting step 05's error handling with caching-aware retry behavior.
- [ ] **15 — Managed Agents** — the platform-native capstone: `Agent` + `Environment` + `Session` objects, where the DIY versions of 07–09 get a "real" implementation — `multiagent: {type: "coordinator"}` for sub-agents/orchestration, Memory Stores + session lifecycle for memory/resume, and MCP via vault-stored credentials instead of raw connector auth.

## Bonus (not part of the numbered CCD-F track)

- [x] **Claude Agent SDK vs. DIY** (`src/examples/bonus-claude-agent-sdk/`) — re-implements step 07's exact Python/Go/Rust comparison using `@anthropic-ai/claude-agent-sdk`'s `AgentDefinition` + subagents instead of `Promise.all`, for a direct side-by-side. This is a **different product** from the Messages API (`@anthropic-ai/sdk`) every numbered step uses — it runs Claude Code's own agent loop, with real tools (scoped to `tools: []` here for safety) and non-deterministic delegation (Claude decides *whether* to delegate, not your code). Deliberately kept separate from 01–15 since CCD-F is scoped to the raw API. See its own `notes.md` for the full comparison table and two genuine findings hit while building it (Claude sometimes skips delegation entirely; background subagents can produce multiple `result` messages per query).

## Before moving to step 04 — things to read / try on step 03

1. Read `src/examples/03-tool-loop.ts` top to bottom alongside the run
   output above. The key structural rules to internalize (these are common
   exam/interview gotchas, not just style preferences):
   - Append the assistant's **full `response.content`** back to `messages`,
     not just the text — it can contain `text` and `tool_use` blocks together.
   - If Claude requests multiple tools in one turn, execute all of them and
     send back **all** `tool_result`s in a **single** user message — never
     split them across messages.
   - The loop only stops when `stop_reason !== "tool_use"` — don't assume
     one tool call is the end; Claude can chain several rounds.
   - A tool handler that throws gets reported back as `is_error: true`
     instead of crashing the process — Claude sees the error and can react.
2. Look at `src/tools/calculator.ts` and `src/tools/weather.ts` — notice the
   `input_schema` (JSON Schema) is a separate, hand-maintained thing from the
   TypeScript `interface` used inside the handler. Nothing enforces they
   stay in sync — that mismatch risk is exactly what step 04's Tool Runner
   (schemas generated from Zod) removes.
3. Try adding a third tool yourself (e.g. `convert_temperature` or
   `roll_dice`) and wiring it into `executeTool` — the fastest way to feel
   how the loop generalizes.
4. Try asking a question that needs the calculator tool *twice sequentially*
   (e.g. "what's 10% of 500, then add 7 to that result") and watch the loop
   run more than one round-trip instead of one parallel batch.
5. Optional reading (official docs):
   - Tool use overview: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
   - Implementing tool use (multi-turn, parallel calls): https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use

## Before moving to step 05 — things to read / try on step 04

1. Diff `03-tool-loop.ts` against `04-tool-runner.ts` mentally: gone are the
   `while (true)`, the `stop_reason !== "tool_use"` break check, the
   `ToolUseBlock` filtering, and the manual `tool_result` assembly. What's
   left is: define tools, call `toolRunner()`, iterate for visibility.
   `runner.tools[].run()` (inside `calculator.zod.ts` / `weather.zod.ts`) is
   where your `executeTool` switch-statement went — the SDK dispatches to
   the right tool's `run` by name for you.
2. Note the **schema source of truth changed**: step 03's `input_schema` was
   a hand-written JSON Schema object with no compiler link to the handler's
   TypeScript type — nothing would catch it if they drifted apart. Step 04's
   `inputSchema` is a Zod schema; `run`'s `input` parameter is inferred
   *from* it (`z.infer<InputSchema>`), and betaZodTool validates Claude's
   actual tool call against that schema before `run` ever sees it.
3. Both `calculator.zod.ts` and `weather.zod.ts` import and reuse
   `runCalculator`/`runWeather` from the step-03 files rather than
   duplicating the arithmetic/mock-data logic — worth noticing that the
   *business logic* didn't need to change at all, only how it's wired up.
4. `runner` in `04-tool-runner.ts` is both async-iterable (yields one
   message per loop turn, used in the `for await`) **and** directly
   awaitable (`await runner` — shorthand for `await runner.runUntilDone()`).
   Try deleting the `for await` block and keeping only
   `const finalMessage = await runner` — same end result, less visibility
   into intermediate tool calls.
5. Try setting `max_iterations` in the `toolRunner()` params (e.g. `1`) and
   re-run — see how it caps the loop even if Claude still wants to call
   tools, which is the Tool Runner's built-in guard against runaway loops.
6. Optional reading (official docs):
   - Tool use overview (Tool Runner section): https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview

## Things to keep in mind for step 05 (error handling)

So far every example assumes the API call succeeds. Step 05 covers what
happens when it doesn't: rate limits, bad requests, overloaded servers,
network failures. The SDK gives you a typed exception per HTTP status
(`RateLimitError`, `NotFoundError`, `AuthenticationError`, ...) all extending
a common `APIError` base — the point of the exercise is catching
most-specific-first so retryable errors (429, 5xx, network) are handled
differently from non-retryable ones (400, 404).

## Before moving to step 06 — things to read / try on step 05

1. **A finding worth knowing about, not just a fact to read:** my first draft
   of this example tried to trigger a `BadRequestError` with an oversized
   `max_tokens` (`999_999_999`). It didn't reach the API at all — the SDK
   itself threw a plain `AnthropicError` client-side, before sending
   anything. Why: `client.messages.create()` (non-streaming) has a fixed
   10-minute timeout; the SDK estimates whether `max_tokens` could plausibly
   take longer than that (roughly `max_tokens > ~21,333`, scaled off a
   128K-token/hour assumption) and refuses to send the request rather than
   risk a client-side timeout — it tells you to use `.stream()` instead.
   `AnthropicError` is the **base class that `APIError` itself extends** — so
   in the catch chain it has to go **last**, after every `APIError` subclass,
   or it would shadow all of them. This is why the file now has 4 demo cases
   instead of the 2 originally planned — the "bad request" case became
   "empty `messages[]`" (a real 400 round-trip) and the oversized-`max_tokens`
   case became its own branch illustrating a client-side failure instead.
2. The practical lesson: **not every thrown error is an HTTP failure.**
   `err instanceof Anthropic.APIError` tells you a request reached Anthropic
   and got a non-2xx response (has `.status`, `.type`); `err instanceof
   Anthropic.AnthropicError` alone (without being an `APIError`) means the
   SDK stopped you before any network call — there's no status code to read,
   and retrying won't help until you change the request itself (here: stream
   instead of `.create()`).
3. Try changing case 3's `max_tokens` down to something like `20_000` and
   re-run (`npm run 05`) — it should now succeed instead of throwing,
   letting you feel where that ~21,333 threshold actually sits.
4. Try adding a 5th case that violates something structural instead of a
   single field — e.g. `messages: [{ role: "assistant", content: "hi" }]`
   (conversations must start with `role: "user"`) — and predict which
   branch it lands in before running it.
5. Optional reading (official docs):
   - Errors: https://platform.claude.com/docs/en/api/errors

## Before moving to step 07 — things to read / try on step 06

1. Read `src/agent/guardrails.ts` — `confirm()` is the entire guardrail
   mechanism: open a `readline` interface on the real terminal, ask a
   yes/no question, return a boolean. Everything else in
   `06-guardrails.ts` is just step 03's loop with one `if
   (guarded.requiresConfirmation)` branch inserted before execution.
2. Notice **where** the check happens: gating is per-tool metadata
   (`requiresConfirmation` on the `GuardedTool` entry), not something
   Claude decides. Claude doesn't know `send_email` is gated — it just
   calls the tool normally; your code intercepts before running the
   handler. This mirrors Managed Agents' `permission_policy`, which is
   also set by you on the tool config, not requested by the model.
3. On denial, the loop still sends back a `tool_result` with `is_error:
   true` (same shape as a thrown-error case in step 03) — a denial isn't
   a crash or an early exit, it's just another kind of tool failure Claude
   has to see and react to. That's why the deny run above still produced a
   coherent final answer instead of an unhandled rejection.
4. Try flipping `calculatorTool`'s `requiresConfirmation` to `true` and
   re-run with `echo n | npm run 06` (or interactively) — since the user's
   request needs the weather *before* it can compose the email, but doesn't
   strictly need the calculator at all here, this is a good way to see a
   confirmation gate on a tool Claude may not even end up calling.
5. Try adding a second gated tool (e.g. a mock `delete_file`) and confirm
   the loop asks once per gated tool call, in order — not all at once.
6. Optional reading (official docs):
   - Tool use overview: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
   - Managed Agents permission policies (the platform-native version of this pattern): see `shared/managed-agents-tools.md` in the claude-api skill, or https://platform.claude.com/docs/en/managed-agents/permission-policies

When you're ready, say so and I'll write step 07 (sub-agents).
