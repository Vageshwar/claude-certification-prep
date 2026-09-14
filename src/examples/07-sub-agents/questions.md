# Step 07 — Self-test questions

Try answering before opening each spoiler.

---

**1. What API feature makes a "sub-agent" different from a normal `messages.create()` call?**

<details>
<summary>Show answer</summary>

None — that's the point. A sub-agent in this step is just another
`messages.create()` call, usually with its own system prompt. There is no
special "sub-agent" parameter or endpoint at this level; the pattern is
entirely something *your code* builds by calling the API multiple times
and deciding what to do with each result. (Managed Agents does add a
platform-native version of this later, in step 15 — but that's a separate,
higher-level feature, not something this step uses.)

</details>

---

**2. Why run the three sub-agents with `Promise.all` instead of `await`-ing them one at a time in a loop?**

<details>
<summary>Show answer</summary>

Because the three subtasks (researching Python, Go, Rust independently)
don't depend on each other's output — nothing sub-agent B produces is
needed to start sub-agent C. Since they're independent, running them
concurrently means the total wall-clock time is roughly the time of the
*slowest* single call, not the *sum* of all three. Awaiting them one at a
time in a loop would work correctly but take about 3x as long for no
benefit.

</details>

---

**3. True or false: after fan-out, each sub-agent's full conversation (including its own system prompt and reasoning) is visible to the synthesis call.**

<details>
<summary>Show answer</summary>

**False.** The synthesis call only receives what you explicitly pass to it
— in `example.ts`, that's each sub-agent's final text output, joined into
one string. It never sees the sub-agents' system prompts, and it has no
access to any thinking/reasoning that happened inside those calls. If a
sub-agent used tools, the synthesis call wouldn't see the tool calls
either — only whatever text you decided to extract and forward.

</details>

---

**4. If you had 5 sub-agents instead of 3, roughly how many billed API requests would the whole script make?**

<details>
<summary>Show answer</summary>

**6** — one per sub-agent (5) plus one synthesis call. Each is a fully
separate request with its own `usage` (input/output tokens), billed
independently. This is the direct cost trade-off of the fan-out pattern:
more parallel sub-agents means more total requests, not free extra
"thinking" inside one request.

</details>

---

**5. What's the risk of NOT explicitly passing sub-agent results into the synthesis call's prompt?**

<details>
<summary>Show answer</summary>

The synthesis call would have nothing to synthesize — it has no memory of
the sub-agent calls happening at all, since each `messages.create()` call
is stateless and independent. If you forget to forward the results (or
forward them incorrectly), the synthesis call can only answer from its own
general knowledge, silently losing everything the sub-agents actually
found.

</details>

---

**6. When would fanning out to sub-agents be a *bad* fit compared to just handling everything in one `messages.create()` call?**

<details>
<summary>Show answer</summary>

When the subtasks aren't actually independent — e.g. each step needs the
previous step's output to even begin (a genuinely sequential task), or the
"subtasks" are small enough that one focused call could handle all of them
without losing quality. In those cases, fanning out just adds cost and
complexity (multiple requests, manual result-stitching) without the
parallelism or specialization payoff.

</details>
