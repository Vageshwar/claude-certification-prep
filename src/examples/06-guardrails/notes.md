# Step 06 — Hooks & Guardrails

## What is a Hook?

A **hook** is a fixed point in a program's execution where you can plug in
your own code to run automatically when something specific happens —
without rewriting the code around it.

Think of it like a light switch wired to also ring a doorbell: the switch
still does its normal job (turning on the light), but you've "hooked" an
extra action onto the same event, without touching the wiring for the light
itself.

You've probably already met hooks elsewhere:

- **Git hooks** — a script that runs automatically `pre-commit` or
  `post-merge`.
- **React hooks** — `useState`, `useEffect` — code that plugs into specific
  points of a component's lifecycle.
- **Claude Code hooks** — shell commands configured in `settings.json` that
  run on events like `PreToolUse` (before Claude runs a tool) or
  `PostToolUse` (after).

In our own agentic loop (`example.ts`), we don't have a formal "hook
system" — but the `confirm()` function plays the same role by hand: it's a
piece of code we run **before** a tool executes, at a specific point in the
loop, without changing what the tool itself does.

## What is a Guardrail?

A **guardrail** is a check or constraint that keeps an AI agent's behavior
within acceptable bounds — it stops (or slows down) an action that could be
wrong, unsafe, or unintended, instead of just letting the model do whatever
it decided to do.

Guardrails typically act at one of three points:

| Where          | What it checks                                    | Example                                            |
| -------------- | -------------------------------------------------- | --------------------------------------------------- |
| **Input**      | What goes *into* the model                          | Strip PII before sending a prompt; block prompt injection attempts |
| **Output**     | What comes *back* from the model                    | Content moderation; validate the response against a schema |
| **Action**     | What the agent is *about to do* in the real world    | Confirm before sending an email, spending money, deleting a file |

Step 06's example is an **action guardrail** — it doesn't touch what goes
into or comes out of the model at all. It sits between "Claude decided to
call `send_email`" and "the email tool actually runs."

## Why Hooks?

- **Separation of concerns** — logging, validation, or confirmation logic
  doesn't get tangled into the core loop; it lives in its own function.
- **Consistency** — the same checkpoint applies uniformly, instead of
  remembering to add a check inside every tool by hand.
- **Extensibility** — you can add new behavior (metrics, audit logs, rate
  limiting) later without rewriting the loop itself.

## Why Guardrails?

- LLMs are non-deterministic — the same prompt can produce different tool
  calls on different runs, and the model can misread intent or be
  manipulated (prompt injection).
- Agentic loops give the model **real side effects** — sending messages,
  spending money, deleting data. A mistake here isn't just a wrong answer
  on screen, it's an action that already happened.
- A guardrail adds a checkpoint — human or programmatic — **before** the
  risk is realized, not after.
- Production systems often have compliance/safety requirements that require
  proof a human (or a policy) approved a sensitive action.

## Where is this used?

- **Financial actions** — require approval above a spending threshold.
- **Destructive operations** — deleting files, dropping database rows,
  force-pushing.
- **Communications sent on your behalf** — email, SMS, Slack messages,
  public posts.
- **Content moderation** — filtering model output before it reaches an
  end user.
- **Managed Agents' `permission_policy: { type: "always_ask" }`** — the
  platform-native version of exactly what `example.ts` does by hand.
- **Claude Code's own hooks** (`PreToolUse`) — e.g. blocking a dangerous
  `rm -rf` before it runs.
