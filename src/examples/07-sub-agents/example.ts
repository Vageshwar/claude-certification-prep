import type Anthropic from "@anthropic-ai/sdk";
import { client, MODEL } from "../../client.js";

interface SubAgentResult {
  topic: string;
  summary: string;
  inputTokens: number;
  outputTokens: number;
}

// A "sub-agent" is just a normal messages.create() call with its own,
// narrow system prompt — nothing more. The orchestration (deciding to spawn
// several of these, running them concurrently, combining results) is all
// plain code below, not an SDK feature.
async function runSubAgent(topic: string, question: string): Promise<SubAgentResult> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: `You are an expert on ${topic}. Answer in 3-4 concise bullet points, no preamble.`,
    messages: [{ role: "user", content: question }],
  });

  const summary = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return {
    topic,
    summary,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

const languages = ["Python", "Go", "Rust"];
const question =
  "What are this language's main strengths and weaknesses for building a command-line tool?";

console.log(`[orchestrator] spawning ${languages.length} sub-agents in parallel...\n`);

// Fan-out: run all sub-agents concurrently. They are fully independent —
// none of them can see each other's prompt, output, or even that the
// others exist.
const results = await Promise.all(languages.map((lang) => runSubAgent(lang, question)));

for (const r of results) {
  console.log(`--- ${r.topic} ---\n${r.summary}\n`);
}

// Fan-in: one more call synthesizes the sub-agents' outputs into a final
// recommendation. This is the ONLY call that ever sees all three results
// together — and only because we explicitly build that into its prompt.
console.log("[orchestrator] synthesizing final recommendation...\n");

const synthesisInput = results.map((r) => `## ${r.topic}\n${r.summary}`).join("\n\n");

const synthesis = await client.messages.create({
  model: MODEL,
  max_tokens: 512,
  system:
    "You are a technical advisor. Given research on several options, recommend the single best one for the stated use case, with a one-paragraph justification.",
  messages: [
    {
      role: "user",
      content: `Use case: building a command-line tool.\n\nResearch:\n${synthesisInput}\n\nWhich language would you recommend?`,
    },
  ],
});

for (const block of synthesis.content) {
  if (block.type === "text") {
    console.log("[final recommendation]\n" + block.text);
  }
}

// Cost visibility: N sub-agents + 1 synthesis call = N+1 separate billed
// requests. This is the direct trade-off of fanning out — worth seeing the
// total, not just each individual call's usage.
const totalInput =
  results.reduce((sum, r) => sum + r.inputTokens, 0) + synthesis.usage.input_tokens;
const totalOutput =
  results.reduce((sum, r) => sum + r.outputTokens, 0) + synthesis.usage.output_tokens;

console.log(
  `\n[usage] ${languages.length + 1} requests total — input_tokens=${totalInput}, output_tokens=${totalOutput}`,
);
