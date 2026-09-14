# Step 08 — Self-test questions

Try answering before opening each spoiler.

---

**1. What's the core difference between prompt chaining (`chaining.ts`) and the fan-out pattern from step 07?**

<details>
<summary>Show answer</summary>

**Dependency.** Step 07's sub-agents are independent — none of them need
another's output, so they can run concurrently with `Promise.all`.
Chaining's steps are dependent — step 2 literally cannot start until step 1
finishes, because step 2's prompt *includes* step 1's output. You can't
parallelize a chain; you can always parallelize independent sub-agents.

</details>

---

**2. In `routing.ts`, why does the classification call use a tiny `max_tokens` (16) while the specialist call uses a much larger one (300)?**

<details>
<summary>Show answer</summary>

The classification call's whole job is to output one word from a small,
known set (`billing`, `technical`, `general`) — it needs almost no output
budget, and keeping `max_tokens` small also keeps that call fast and cheap
since it runs on every single ticket before any real work happens. The
specialist call is doing the actual work (writing a helpful reply), which
needs real room to produce a full response.

</details>

---

**3. True or false: in the routing example, every specialist system prompt is sent to the model on every request.**

<details>
<summary>Show answer</summary>

**False.** Only the classifier call happens first, and its system prompt
just lists the category names. Once a category is chosen, exactly **one**
specialist system prompt is used for the second call — the other two
specialists' prompts are never sent anywhere. This is what makes routing
cheaper than fan-out for "pick the right expert" tasks: fan-out pays for
every expert's opinion every time, routing pays for one classifier call
plus one expert call.

</details>

---

**4. Scenario: you want to summarize a document, then translate the summary into 3 languages. Which pattern(s) apply, and in what order?**

<details>
<summary>Show answer</summary>

**Chaining, then parallelization.** Summarizing must happen first and the
translations all need that summary as input — so summarize → translate is
a chain (sequential, dependent). But once you have the summary, the three
translations don't depend on each other at all, so those three calls can
fan out in parallel (step 07's pattern) instead of running one after
another. Real pipelines often combine patterns like this rather than using
just one.

</details>

---

**5. What's the difference between step 07's fan-out and the "orchestrator-workers" pattern described in `notes.md`?**

<details>
<summary>Show answer</summary>

Step 07 **hardcoded** the worker breakdown in code —
`const languages = ["Python", "Go", "Rust"]` was decided by the person
writing the script, not by a model. A true orchestrator-workers pattern
has an *LLM call* decide the breakdown at runtime — e.g. "given this task,
what are the 2-5 independent subtasks, and what should each worker focus
on?" — and only then fans out to workers based on that dynamic plan. Same
execution shape (parallel workers + a merge step), different question:
"did code or a model decide what to parallelize?"

</details>

---

**6. If a routing call misclassifies a ticket (e.g. returns a word not in your known categories), what does `routing.ts` do, and why does that matter?**

<details>
<summary>Show answer</summary>

It falls back to `"general"` (`text in specialists ? text : "general"`)
rather than crashing or passing an unknown key into `specialists[category]`
(which would be `undefined` and blow up the next call). Any classification
step — since it's still an LLM call, not a guaranteed-valid enum — needs a
defined fallback for the "didn't match anything expected" case, the same
way step 05 taught you to expect and handle failure rather than assume
success.

</details>

---

**7. Which pattern would you reach for if you wanted a model to draft an answer AND have a second, independent pass check it against a rubric before showing it to the user?**

<details>
<summary>Show answer</summary>

**Evaluator-optimizer** (named in `notes.md`, not built in this step) — one
call generates, a second call grades the output against explicit criteria
and either approves it or sends it back with feedback for another attempt.
This is conceptually what Managed Agents' `user.define_outcome` +
rubric-graded iteration does natively, covered later in step 15.

</details>
