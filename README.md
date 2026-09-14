# Claude Certification Prep

A step-by-step TypeScript boilerplate for learning **agentic development with
the Anthropic SDK** — built while preparing for Anthropic's **Claude
Certified Developer – Foundation (CCDV-F)** course.

This is **not** a production template. It's a learning log: each step is a
small, standalone, runnable example that builds on the last, going from a
single API call up through tool use, error handling, and (eventually)
multi-agent orchestration and Managed Agents. The full roadmap — what's done,
what's next, and notes on what to read/try at each step — lives in
[`NOTES.md`](./NOTES.md).

## Setup

```bash
npm install
cp .env.example .env   # then fill in your own ANTHROPIC_API_KEY
```

## Running an example

Each step lives under `src/examples/` and has its own npm script:

```bash
npm run 01   # basic message request
npm run 02   # streaming
npm run 03   # tool use — manual agentic loop
npm run 04   # tool use — SDK Tool Runner
npm run 05   # typed error handling
```

Or run any file directly: `npx tsx src/examples/NN-name.ts`

`npm run typecheck` runs `tsc --noEmit` — worth doing after any change.

## Project layout

```
src/
  client.ts       shared Anthropic client + model constant
  examples/       one file per learning step (01, 02, 03, ...)
  tools/          tool definitions used by the tool-use examples
  agent/          reserved for later steps (guardrails, sub-agents, ...)
NOTES.md          the full roadmap, checklists, and reading notes
```

## Status

Currently through **step 05** (error handling). See [`NOTES.md`](./NOTES.md)
for the complete checklist, including everything still planned: guardrails,
sub-agents, multi-agent orchestration, memory/sessions, structured outputs,
Agent Skills, MCP, model selection, prompt caching, and Managed Agents.
