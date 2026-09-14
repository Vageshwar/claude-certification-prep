import type Anthropic from "@anthropic-ai/sdk";
import { client, MODEL } from "../../client.js";

// Routing: one call decides WHICH specialist to use; only that one
// specialist actually runs. The opposite of step 07's fan-out — fan-out
// always calls every sub-agent, routing calls exactly one, chosen
// dynamically based on the input.
const specialists = {
  billing:
    "You are a billing support specialist. Help the customer resolve billing/payment issues. Be precise about next steps.",
  technical:
    "You are a technical support specialist. Help the customer troubleshoot a technical problem. Ask for specifics if needed, but keep it concise.",
  general:
    "You are a friendly general support agent. Answer the customer's question helpfully and concisely.",
} as const;

type Category = keyof typeof specialists;

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

async function route(ticket: string): Promise<Category> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16,
    system: `Classify the support ticket into exactly one category: ${Object.keys(specialists).join(", ")}. Respond with ONLY the category word, nothing else.`,
    messages: [{ role: "user", content: ticket }],
  });

  const raw = extractText(response.content).trim().toLowerCase();

  // A classification call is still an LLM call, not a guaranteed-valid
  // enum — always have a fallback for "didn't match anything expected."
  return (raw in specialists ? raw : "general") as Category;
}

const ticket =
  "I was charged twice for my subscription this month, can someone look into a refund?";

console.log("[router] classifying ticket...\n");
const category = await route(ticket);
console.log(`[router] routed to: ${category}\n`);

// Only the ONE matching specialist prompt is ever sent — the other two
// specialists' system prompts are never used for this ticket at all.
const response = await client.messages.create({
  model: MODEL,
  max_tokens: 300,
  system: specialists[category],
  messages: [{ role: "user", content: ticket }],
});

console.log(`[${category} specialist]\n` + extractText(response.content));
