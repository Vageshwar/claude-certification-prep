# Learning roadmap — Anthropic SDK agentic dev (TypeScript)

Goal: build up an agentic-dev boilerplate step by step, in a way that also
covers the ground the Claude Certified Developer Foundation course expects
(Messages API fundamentals, tool use, streaming, error handling).

Each step is a standalone runnable file under `src/examples/`. Run one with
`npx tsx src/examples/NN-name.ts` (step 01 also has an npm script: `npm run 01`).

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
- [ ] **06 — guardrails: tool-execution gating** — a confirmation/permission check before a tool actually runs (e.g. mark a tool `requiresConfirmation` and gate `executeTool` behind a prompt), the DIY analog of Managed Agents' `permission_policy: always_ask`.
- [ ] **07 — sub-agents** — orchestrator-worker pattern: the main script spawns multiple independent `messages.create()` calls (one per subtask) itself, in code — no platform feature involved yet, just parallel API calls + aggregation.
- [ ] **08 — multi-agent orchestration** — patterns for coordinating several of those sub-agents: fan-out/fan-in (parallel, merge results), and sequential handoff (one agent's output feeds the next).
- [ ] **09 — agent memory, sessions & resume/forking (DIY)** — persist the `messages` array to disk/SQLite between runs; "resume" = reload and continue; "fork" = branch the saved array at a point and continue two ways from there.
- [ ] **10 — structured output handling** — `output_config.format` / `client.messages.parse()` with a Zod schema, plus `strict: true` tool schemas, so responses are guaranteed-valid JSON instead of parsed-and-hope.
- [ ] **11 — agent skills** — build a minimal custom skill (a `SKILL.md`-style folder), use it via the Messages API `container.skills` + code execution, then chain two skills together in one request.
- [ ] **12 — how agents use MCP** — the MCP connector on the Messages API (`mcp_servers` + `mcp_toolset`), calling tools on a real or mock MCP server without you implementing the tool yourself.
- [ ] **13 — deciding a model: Opus vs Sonnet vs Haiku, thinking vs effort** — a decision-making exercise, not new API surface: run the same task across models/effort levels, compare quality/latency/cost, and land on a rule of thumb.
- [ ] **14 — prompt caching, token cost & error handling (deepened)** — `cache_control` breakpoints, reading `usage.cache_read_input_tokens` to verify hits, and revisiting step 05's error handling with caching-aware retry behavior.
- [ ] **15 — Managed Agents** — the platform-native capstone: `Agent` + `Environment` + `Session` objects, where the DIY versions of 07–09 get a "real" implementation — `multiagent: {type: "coordinator"}` for sub-agents/orchestration, Memory Stores + session lifecycle for memory/resume, and MCP via vault-stored credentials instead of raw connector auth.

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

When you're ready, say so and I'll write step 06 (tool-execution guardrails).
