import type Anthropic from "@anthropic-ai/sdk";

export const calculatorTool: Anthropic.Tool = {
  name: "calculator",
  description:
    "Evaluate a basic arithmetic operation (add, subtract, multiply, divide) on two numbers. Call this whenever the user asks for a calculation instead of computing it yourself.",
  input_schema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["add", "subtract", "multiply", "divide"],
      },
      a: { type: "number", description: "First operand" },
      b: { type: "number", description: "Second operand" },
    },
    required: ["operation", "a", "b"],
  },
};

interface CalculatorInput {
  operation: "add" | "subtract" | "multiply" | "divide";
  a: number;
  b: number;
}

export function runCalculator(input: CalculatorInput): string {
  const { operation, a, b } = input;
  switch (operation) {
    case "add":
      return String(a + b);
    case "subtract":
      return String(a - b);
    case "multiply":
      return String(a * b);
    case "divide":
      if (b === 0) throw new Error("Division by zero");
      return String(a / b);
    default:
      // Exhaustiveness check — if a new operation is added to the schema's
      // enum without a case here, this line fails to compile.
      throw new Error(`Unknown operation: ${operation satisfies never}`);
  }
}
