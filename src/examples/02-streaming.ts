import { client, MODEL } from "../client.js";

// .stream() returns an async-iterable of raw SSE events, plus a
// .finalMessage() helper that assembles them into the same Message shape
// that .create() returns non-streaming.
const stream = client.messages.stream({
  model: MODEL,
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Write a 3-sentence story about a robot learning to paint." },
  ],
});

for await (const event of stream) {
  switch (event.type) {
    case "message_start":
    case "message_stop":
      console.log(`\n[${event.type}]`);
      break;
    case "content_block_start":
      console.log(`[${event.type}] block type: ${event.content_block.type}`);
      break;
    case "content_block_delta":
      // text_delta is one of several delta types (thinking_delta, input_json_delta, ...) —
      // narrowing by .type is required before .text exists on it.
      if (event.delta.type === "text_delta") {
        process.stdout.write(event.delta.text);
      }
      break;
    case "content_block_stop":
      console.log(`\n[${event.type}]`);
      break;
    case "message_delta":
      // stop_reason and usage totals only appear here, not on earlier events.
      console.log(`[${event.type}] stop_reason: ${event.delta.stop_reason}`);
      break;
  }
}

// finalMessage() gives you the fully-assembled Message — same object shape
// as example 01's response, useful once you need stop_reason/usage/content
// as a whole rather than reacting to each event.
const finalMessage = await stream.finalMessage();
console.log("\n--- usage ---");
console.log(finalMessage.usage);
