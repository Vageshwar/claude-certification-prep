import type Anthropic from "@anthropic-ai/sdk";
import { client, MODEL } from "../client.js";
import { calculatorTool, runCalculator } from "../tools/calculator.js";
import { weatherTool, runWeather } from "../tools/weather.js";

const tools: Anthropic.Tool[] = [calculatorTool, weatherTool];

// Dispatches one tool_use block to its handler. Anything thrown here is
// caught by the loop below and reported back to Claude as is_error: true,
// so Claude can adapt (retry, ask the user, explain) instead of the
// process crashing.
function executeTool(name: string, input: unknown): string {
  switch (name) {
    case "calculator":
      return runCalculator(input as Parameters<typeof runCalculator>[0]);
    case "get_weather":
      return runWeather(input as Parameters<typeof runWeather>[0]);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const messages: Anthropic.MessageParam[] = [
  {
    role: "user",
    content: "What's the weather in Tokyo, and what's 15% of 240?",
  },
];

// The agentic loop: call the API, and if Claude asks for tool(s), run them
// and send the results back — repeating until Claude stops on end_turn
// (or another terminal stop_reason) instead of tool_use.
while (true) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools,
    messages,
  });

  // Always append the FULL response.content (not just the text) — a single
  // turn can contain text and tool_use blocks together, and Claude needs
  // its own prior turn back verbatim on the next request.
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

  // Claude can request multiple tools in ONE turn (parallel tool use).
  // Execute all of them, then send back ALL results in a single user
  // message — never split tool_results for one turn across messages.
  const toolUseBlocks = response.content.filter(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((block) => {
    try {
      const result = executeTool(block.name, block.input);
      console.log(`[tool_result] ${block.name} ->`, result);
      return { type: "tool_result", tool_use_id: block.id, content: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[tool_error] ${block.name} ->`, message);
      return { type: "tool_result", tool_use_id: block.id, content: message, is_error: true };
    }
  });

  messages.push({ role: "user", content: toolResults });
}
