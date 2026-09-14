import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type Anthropic from "@anthropic-ai/sdk";

// A tool bundled with the metadata the guardrail loop needs: its API
// definition, whether it's gated, and the handler that actually runs it.
export interface GuardedTool {
  definition: Anthropic.Tool;
  requiresConfirmation: boolean;
  execute: (input: unknown) => string;
}

// Pauses and asks a human at the terminal before a gated tool runs. This is
// the DIY analog of Managed Agents' `permission_policy: { type: "always_ask" }`
// (see shared/managed-agents-tools.md) — same idea, hand-rolled instead of a
// platform feature: pause, ask, only proceed on an explicit "allow".
export async function confirm(toolName: string, toolInput: unknown): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(
      `\n[confirm] Claude wants to call "${toolName}" with ${JSON.stringify(toolInput)}. Allow? (y/N) `,
    );
    return answer.trim().toLowerCase() === "y";
  } finally {
    rl.close();
  }
}
