import { client, MODEL } from "../client.js";

// The Messages API is the single endpoint behind every Claude feature —
// tools, streaming, vision, etc. are all just parameters on this same call.
const response = await client.messages.create({
  model: MODEL,
  max_tokens: 1024,
  system: "You are a concise assistant. Answer in one short paragraph.",
  messages: [
    { role: "user", content: "What is the Model Context Protocol (MCP) in one paragraph?" },
  ],
});

// content is an array of blocks (text, tool_use, thinking, ...) — narrow by .type.
for (const block of response.content) {
  if (block.type === "text") {
    console.log(block.text);
  }
}

console.log("\n--- usage ---");
console.log(response.usage);
