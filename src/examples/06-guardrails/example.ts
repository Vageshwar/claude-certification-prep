import type Anthropic from "@anthropic-ai/sdk";
import { client, MODEL } from "../../client.js";
import { calculatorTool, runCalculator } from "../../tools/calculator.js";
import { weatherTool, runWeather } from "../../tools/weather.js";
import { emailTool, runSendEmail } from "../../tools/email.js";
import { confirm, type GuardedTool } from "../../agent/guardrails.js";

// Only send_email is gated. calculator and weather are read-only / side-effect-free
// (mock or not, nothing external happens), so there's nothing worth confirming —
// gate the *action*, not the tool call in general.
const guardedTools: GuardedTool[] = [
  {
    definition: calculatorTool,
    requiresConfirmation: false,
    execute: (input) => runCalculator(input as Parameters<typeof runCalculator>[0]),
  },
  {
    definition: weatherTool,
    requiresConfirmation: false,
    execute: (input) => runWeather(input as Parameters<typeof runWeather>[0]),
  },
  {
    definition: emailTool,
    requiresConfirmation: true,
    execute: (input) => runSendEmail(input as Parameters<typeof runSendEmail>[0]),
  },
];

const byName = new Map(guardedTools.map((t) => [t.definition.name, t]));
const tools: Anthropic.Tool[] = guardedTools.map((t) => t.definition);

const messages: Anthropic.MessageParam[] = [
  {
    role: "user",
    content:
      "What's the weather in Paris? Then send an email to team@example.com, subject 'Weather update', telling them the Paris weather.",
  },
];

// Same agentic loop shape as 03-tool-loop.ts — the only new piece is the
// confirmation check before executing a gated tool.
while (true) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools,
    messages,
  });

  messages.push({ role: "assistant", content: response.content });

  for (const block of response.content) {
    if (block.type === "text") {
      console.log("[claude]", block.text);
    } else if (block.type === "tool_use") {
      console.log(`[tool_use] ${block.name}(${JSON.stringify(block.input)})`);
    }
  }

  if (response.stop_reason !== "tool_use") {
    console.log(`\n[done] stop_reason: ${response.stop_reason}`);
    break;
  }

  const toolUseBlocks = response.content.filter(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  // Sequential on purpose: confirmation prompts need to happen one at a
  // time at a real terminal, so this loop doesn't parallelize like the
  // execution in 03-tool-loop.ts does.
  const toolResults: Anthropic.ToolResultBlockParam[] = [];
  for (const block of toolUseBlocks) {
    const guarded = byName.get(block.name);
    if (!guarded) {
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: `Unknown tool: ${block.name}`,
        is_error: true,
      });
      continue;
    }

    if (guarded.requiresConfirmation) {
      const allowed = await confirm(block.name, block.input);
      if (!allowed) {
        console.log(`[denied] ${block.name}`);
        // Reported as a tool error (not a crash) so Claude can react —
        // e.g. tell the user it couldn't complete that step and why.
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: "The user denied permission to run this tool.",
          is_error: true,
        });
        continue;
      }
      console.log(`[allowed] ${block.name}`);
    }

    try {
      const result = guarded.execute(block.input);
      console.log(`[tool_result] ${block.name} ->`, result);
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: message,
        is_error: true,
      });
    }
  }

  messages.push({ role: "user", content: toolResults });
}
