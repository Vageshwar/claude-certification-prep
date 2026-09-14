import { client, MODEL } from "../client.js";
import { calculatorZodTool } from "../tools/calculator.zod.js";
import { weatherZodTool } from "../tools/weather.zod.js";

// Compare this file to 03-tool-loop.ts: same two tools, same task — but the
// while loop, stop_reason check, content-block filtering, and manual
// tool_result assembly are all gone. toolRunner() drives that loop
// internally and calls each tool's `run` function for you.
const runner = client.beta.messages.toolRunner({
  model: MODEL,
  max_tokens: 1024,
  tools: [calculatorZodTool, weatherZodTool],
  messages: [
    {
      role: "user",
      content: "What's the weather in Tokyo, and what's 15% of 240?",
    },
  ],
});

// The runner is itself an async iterable — it yields one message per turn
// of the loop (including turns that only contain tool_use blocks), so you
// still get the same step-by-step visibility as the manual version.
for await (const message of runner) {
  for (const block of message.content) {
    if (block.type === "text") {
      console.log("[claude]", block.text);
    } else if (block.type === "tool_use") {
      console.log(`[tool_use] ${block.name}(${JSON.stringify(block.input)})`);
    }
  }
}

// The runner is also directly awaitable — `await runner` is equivalent to
// `await runner.runUntilDone()`. Since we already iterated it above, this
// resolves immediately with the same final message rather than re-running.
const finalMessage = await runner;
console.log(`\n[done] stop_reason: ${finalMessage.stop_reason}`);
