import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

// Anthropic() with no args reads ANTHROPIC_API_KEY from the environment.
export const client = new Anthropic();

// Centralized so every example/tool uses the same model without repeating the string.
export const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";
