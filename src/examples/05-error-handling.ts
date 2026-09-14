import Anthropic from "@anthropic-ai/sdk";
import { client, MODEL } from "../client.js";

// Catch most-specific-first. A single broad `catch` (or `catch (Anthropic.APIError)`)
// throws away the distinction between retryable failures (429 rate limit, 5xx,
// network) and non-retryable ones (400 bad request, 404 not found) — you want to
// react differently to each, not treat them the same.
async function attempt(label: string, run: () => Promise<Anthropic.Message>) {
  console.log(`\n--- ${label} ---`);
  try {
    const response = await run();
    console.log("[ok] stop_reason:", response.stop_reason);
  } catch (err) {
    if (err instanceof Anthropic.NotFoundError) {
      // 404 — e.g. a typo'd or retired model ID. Not retryable: fix the request.
      console.log(`[NotFoundError] status=${err.status} ${err.message}`);
    } else if (err instanceof Anthropic.RateLimitError) {
      // 429 — retryable. The SDK already auto-retries this (default max_retries: 2)
      // before it ever reaches your catch block; seeing it here means retries were exhausted.
      console.log(`[RateLimitError] status=${err.status} ${err.message} — back off and retry`);
    } else if (err instanceof Anthropic.AuthenticationError) {
      // 401 — bad/missing API key. Not retryable: fix credentials, don't retry.
      console.log(`[AuthenticationError] status=${err.status} ${err.message}`);
    } else if (err instanceof Anthropic.BadRequestError) {
      // 400 — malformed request (bad param, empty messages array, etc). Not retryable as-is.
      console.log(`[BadRequestError] status=${err.status} ${err.message}`);
    } else if (err instanceof Anthropic.APIConnectionError) {
      // Network failure before any HTTP response — retryable.
      console.log(`[APIConnectionError] ${err.message} — network issue, retryable`);
    } else if (err instanceof Anthropic.APIError) {
      // Catch-all for any other non-2xx response (5xx, overloaded_error, etc).
      // err.type is the API's error type string — finer-grained than the HTTP status alone.
      console.log(`[APIError] status=${err.status} type=${err.type} ${err.message}`);
    } else if (err instanceof Anthropic.AnthropicError) {
      // A CLIENT-SIDE error — the SDK refused to even send the request, so
      // there is no HTTP status/type here. This is a different failure class
      // from everything above: nothing went wrong on Anthropic's end.
      console.log(`[AnthropicError] ${err.message}`);
    } else {
      // Not an SDK error at all — a real bug in this script. Don't swallow it.
      throw err;
    }
  }
}

// 1. Deliberately invalid model ID -> 404 NotFoundError (server round-trip)
await attempt("invalid model ID", () =>
  client.messages.create({
    model: "claude-does-not-exist",
    max_tokens: 64,
    messages: [{ role: "user", content: "Hello" }],
  }),
);

// 2. Empty messages array -> 400 BadRequestError (server round-trip)
await attempt("empty messages array", () =>
  client.messages.create({
    model: MODEL,
    max_tokens: 64,
    messages: [],
  }),
);

// 3. max_tokens above ~21,333 -> the SDK itself throws AnthropicError and
// never calls the API. Its non-streaming timeout is fixed at 10 minutes;
// above that threshold a request could plausibly run longer than that, so
// it insists you use .stream() instead of .create() rather than let the
// request risk timing out client-side. This is NOT an API error — nothing
// was rejected by Anthropic, the request was never sent at all.
await attempt("max_tokens requires streaming", () =>
  client.messages.create({
    model: MODEL,
    max_tokens: 32_000,
    messages: [{ role: "user", content: "Hello" }],
  }),
);

// 4. A normal, valid call -> succeeds, falls into the `try` branch instead
await attempt("valid request", () =>
  client.messages.create({
    model: MODEL,
    max_tokens: 64,
    messages: [{ role: "user", content: "Say hello in one short sentence." }],
  }),
);
