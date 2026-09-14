import type Anthropic from "@anthropic-ai/sdk";

export const emailTool: Anthropic.Tool = {
  name: "send_email",
  description:
    "Send an email to a recipient. Call this only when the user explicitly asks to email or notify someone.",
  input_schema: {
    type: "object",
    properties: {
      to: { type: "string", description: "Recipient email address" },
      subject: { type: "string" },
      body: { type: "string" },
    },
    required: ["to", "subject", "body"],
  },
};

interface EmailInput {
  to: string;
  subject: string;
  body: string;
}

// Mock — no real email is sent. A side-effecting, hard-to-reverse action
// like this is exactly the kind of tool worth gating behind confirmation.
export function runSendEmail(input: EmailInput): string {
  return `Email "sent" to ${input.to} — subject: "${input.subject}"`;
}
