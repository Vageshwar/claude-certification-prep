import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { runCalculator } from "./calculator.js";

// Same handler as the manual-loop version (calculator.ts) — only the
// schema declaration and dispatch wiring differ here. The JSON Schema sent
// to the API is generated from this Zod schema instead of hand-written,
// and betaZodTool validates Claude's tool input against it before `run` sees it.
export const calculatorZodTool = betaZodTool({
  name: "calculator",
  description:
    "Evaluate a basic arithmetic operation (add, subtract, multiply, divide) on two numbers. Call this whenever the user asks for a calculation instead of computing it yourself.",
  inputSchema: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number().describe("First operand"),
    b: z.number().describe("Second operand"),
  }),
  // No try/catch here — the tool runner catches whatever `run` throws and
  // reports it back to Claude as is_error: true automatically.
  run: async (input) => runCalculator(input),
});
