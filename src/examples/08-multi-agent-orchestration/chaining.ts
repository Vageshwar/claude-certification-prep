import type Anthropic from "@anthropic-ai/sdk";
import { client, MODEL } from "../../client.js";

// Prompt chaining: each step's OUTPUT becomes part of the NEXT step's INPUT.
// Unlike step 07's fan-out (independent, parallel calls), these calls are
// intentionally sequential — step 2 cannot start until step 1 finishes,
// because step 2 needs step 1's result to do its job.
async function ask(system: string, prompt: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

const topic =
  "Why TypeScript's structural typing trips up developers coming from Java or C#";

console.log("[step 1/3] outlining...\n");
const outline = await ask(
  "You are an outline writer. Produce a tight 4-5 bullet outline for a short blog post on the given topic. Bullets only, no prose.",
  topic,
);
console.log(outline, "\n");

console.log("[step 2/3] drafting...\n");
const draft = await ask(
  "You are a technical writer. Write a ~200 word blog post draft that follows the given outline, one short paragraph per bullet.",
  `Topic: ${topic}\n\nOutline:\n${outline}`,
);
console.log(draft, "\n");

console.log("[step 3/3] polishing...\n");
const final = await ask(
  "You are an editor. Tighten the given draft: cut filler words, fix awkward phrasing, keep the meaning and length roughly the same. Return only the polished text, nothing else.",
  draft,
);
console.log("[final]\n" + final);
