import "dotenv/config";
import { query, type AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

// The SAME comparison task as step 07 (src/examples/07-sub-agents/example.ts),
// rebuilt with the Claude Agent SDK's subagent system instead of DIY
// Promise.all. Compare this file to that one line by line — same task, two
// different SDKs/paradigms. See notes.md for the full breakdown.

const expertPrompt = (language: string) =>
  `You are an expert on ${language}. When asked, answer in 3-4 concise bullet points, no preamble.`;

// tools: [] deliberately removes ALL tools from each subagent. This task is
// pure knowledge/reasoning — no file or shell access is needed, so there's
// no reason to let these subagents touch the filesystem at all.
const agents: Record<string, AgentDefinition> = {
  "python-expert": {
    description:
      "Expert on Python. Use when asked about Python's strengths/weaknesses for CLI tools.",
    prompt: expertPrompt("Python"),
    tools: [],
  },
  "go-expert": {
    description:
      "Expert on Go. Use when asked about Go's strengths/weaknesses for CLI tools.",
    prompt: expertPrompt("Go"),
    tools: [],
  },
  "rust-expert": {
    description:
      "Expert on Rust. Use when asked about Rust's strengths/weaknesses for CLI tools.",
    prompt: expertPrompt("Rust"),
    tools: [],
  },
};

const prompt =
  "Compare Python, Go, and Rust for building a command-line tool. Delegate to " +
  "the python-expert, go-expert, and rust-expert subagents (use all three) to " +
  "research each language's strengths and weaknesses, then give a single final " +
  "recommendation with a one-paragraph justification.";

console.log("[main] running query with 3 subagents available...\n");

let lastResult = "";
let totalCostUsd = 0;

for await (const message of query({
  prompt,
  options: {
    // allowedTools only auto-approves — it does NOT restrict which tools
    // exist. disallowedTools is the actual restriction: it removes these
    // tools from context entirely, for the main thread. (Each subagent
    // above is separately restricted via its own `tools: []`.)
    allowedTools: ["Agent"],
    disallowedTools: ["Bash", "Write", "Edit", "NotebookEdit"],
    agents,
  },
})) {
  if (message.type === "assistant") {
    const label = message.subagent_type ? `[${message.subagent_type}]` : "[main]";
    for (const block of message.message.content) {
      if (block.type === "text" && block.text.trim()) {
        console.log(`${label} ${block.text}`);
      } else if (block.type === "tool_use") {
        console.log(`${label} [tool_use] ${block.name}(${JSON.stringify(block.input)})`);
      }
    }
  }

  // A "result" message marks the end of a TURN, not necessarily the end of
  // the whole query. Because subagents run in the background by default,
  // the main agent can end a turn while waiting ("I'll wait for their
  // reports...") and get a fresh turn (and a new "result") each time a
  // subagent finishes — so this can fire more than once per query() call.
  // Only the LAST one, once the loop ends, is the actual final answer.
  if (message.type === "result") {
    if (message.subtype === "success") {
      lastResult = message.result;
      totalCostUsd = message.total_cost_usd;
      console.log(`\n[turn ended] ${message.result}`);
    } else {
      console.log("\n[error]", message.subtype);
    }
  }
}

console.log("\n=== FINAL ===\n" + lastResult);
console.log(`\n[usage] total cost ~$${totalCostUsd.toFixed(4)}`);
