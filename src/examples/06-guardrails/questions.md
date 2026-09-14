# Step 06 — Self-test questions

Try answering before opening each spoiler.

---

**1. In one sentence, what's the difference between a hook and a guardrail?**

<details>
<summary>Show answer</summary>

A **hook** is a general mechanism — a point in the code where you can plug
in custom behavior when something happens. A **guardrail** is a *specific
use* of that mechanism: a hook (or similar checkpoint) whose job is
specifically to keep the agent's behavior within acceptable bounds. Every
guardrail is implemented via some kind of hook/checkpoint, but not every
hook is a guardrail (a hook could just log something, with no safety
purpose at all).

</details>

---

**2. In `example.ts`, `calculator` and `weather` run without confirmation, but `send_email` doesn't. Why those specifically?**

<details>
<summary>Show answer</summary>

`requiresConfirmation` is set per tool based on **reversibility and blast
radius**, not on how "important" the tool sounds. `calculator` and
`weather` are read-only / side-effect-free — running them again, or not
running them at all, changes nothing outside the process. `send_email` has
a real (here: mocked) external side effect that's hard to take back once
it happens — the classic case worth gating.

</details>

---

**3. True or false: Claude decides which of its tools require confirmation.**

<details>
<summary>Show answer</summary>

**False.** Claude has no idea `send_email` is gated — it just calls the
tool the same way it calls any other. `requiresConfirmation` is metadata
*your code* attaches to the tool (in the `guardedTools` array), and your
loop checks it before running the handler. The model's only signal that
something happened is the `tool_result` it gets back afterward.

</details>

---

**4. When the user denies a tool call, the code sends back a `tool_result` with `is_error: true` instead of throwing a JavaScript exception. Why does that matter?**

<details>
<summary>Show answer</summary>

Throwing would crash the loop (or require a try/catch around the whole
thing) and Claude would never find out what happened. Sending an
`is_error: true` tool_result keeps the conversation going — Claude sees
the failure as part of the normal flow and can react sensibly, e.g.
telling the user it couldn't send the email and why, exactly like it does
with any other tool error (see step 03/05). A denial is modeled as *a kind
of tool failure*, not an exceptional program state.

</details>

---

**5. Which category does step 06's guardrail fall into: input, output, or action?**

<details>
<summary>Show answer</summary>

**Action.** It doesn't touch the prompt going into the model (input) or
validate/filter the model's text response (output) — it sits between
"Claude asked to call a tool" and "the tool's handler actually runs."

</details>

---

**6. Why does the tool-confirmation loop use a sequential `for` loop with `await` instead of running all tool calls in parallel like step 03 does?**

<details>
<summary>Show answer</summary>

A confirmation prompt needs a human to actually read it and respond at a
real terminal — there's no way to usefully "ask two questions at once" to
one person typing at one prompt. Parallelizing execution (as step 03 does
for pure computation) only makes sense when nothing needs to wait on a
human; once a human is in the loop, the checks have to happen one at a
time, in order.

</details>

---

**7. Scenario: you're building an agent that can transfer money between accounts. Where would you add a guardrail, and what would trigger it?**

<details>
<summary>Show answer</summary>

There's no single right answer, but a reasonable design: gate the
`transfer_money` tool itself (an action guardrail) behind confirmation
whenever the amount exceeds some threshold, or whenever the destination
account hasn't been used before. You might *also* want an output guardrail
that double-checks the model's stated transfer amount/recipient against
what's actually about to be sent, in case the model's explanation and its
tool call input have drifted apart.

</details>

---

**8. What's the Managed Agents feature that does roughly what `confirm()` + `requiresConfirmation` do by hand here?**

<details>
<summary>Show answer</summary>

`permission_policy: { type: "always_ask" }` on a tool config. When set, the
session pauses (`session.status_idle`) and waits for a
`user.tool_confirmation` event with `result: "allow" | "deny"` before the
tool runs — the same allow/deny checkpoint, implemented as a platform
feature instead of a hand-written `readline` prompt.

</details>
