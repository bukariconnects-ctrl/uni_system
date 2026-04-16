/**
 * Embedding utility — gemini-embedding-2-preview, 768 dims (MRL-scaled)
 *
 * ## Design decisions
 *
 * ### Why raw fetch instead of @google/generative-ai SDK?
 *   The SDK's `EmbedContentRequest` type does NOT include `outputDimensionality`
 *   (it was added to the REST API but the SDK types haven't caught up).
 *   TypeScript error: "Object literal may only specify known properties,
 *   and 'outputDimensionality' does not exist in type 'EmbedContentRequest'".
 *   Raw fetch gives us full control over the request body without type fights.
 *
 * ### Why retry + exponential backoff?
 *   gemini-embedding-2-preview free tier: 15 RPM (1 request / 4 seconds).
 *   A document split into 20+ chunks fires 20+ sequential embedding calls.
 *   Without retry, a single 429 aborts the entire ingest pipeline.
 *   With exponential backoff (5s → 15s → 45s), transient quota bursts are
 *   handled automatically without exposing them as hard failures.
 *
 * ### Why MIN_CALL_DELAY_MS (proactive rate limiting)?
 *   Even with retry, hammering the API creates unnecessary 429 churn and
 *   wastes the 3 retry budget. A small proactive delay (1s between calls)
 *   respects the free-tier RPM limit and vastly reduces retry frequency.
 *   On paid tiers (1500 RPM), 1s delay is negligible overhead.
 */

const API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export const EMBEDDING_MODEL = "gemini-embedding-2-preview";
export const EMBEDDING_DIMENSIONS = 768;

/** Minimum gap between consecutive embedding API calls (proactive rate limiting).
 *
 * Math:  free-tier limit = 15 RPM
 *        safe interval   = 60s / 14 calls = 4.28s  →  use 4200ms
 *
 * Override with env var EMBEDDING_CALL_DELAY_MS (e.g. "500" for paid tiers).
 */
const MIN_CALL_DELAY_MS = parseInt(
  process.env.EMBEDDING_CALL_DELAY_MS ?? "4200",
  10
);

/** Timestamp of the last completed embedding call. */
let lastCallAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates a 768-dimensional embedding vector for the given text.
 *
 * Includes:
 *  - Proactive inter-call delay to stay within rate limits
 *  - Automatic retry with exponential backoff on 429
 *
 * @param text     - Text to embed (≤ 2048 tokens recommended)
 * @param retries  - Maximum retry attempts on 429 (default 4)
 */
export async function embedText(text: string, retries = 4): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  // ── Proactive rate limiting ──────────────────────────────────────────────
  const now = Date.now();
  const elapsed = now - lastCallAt;
  if (lastCallAt > 0 && elapsed < MIN_CALL_DELAY_MS) {
    await sleep(MIN_CALL_DELAY_MS - elapsed);
  }

  const url = `${API_BASE}/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
  const body = JSON.stringify({
    model: `models/${EMBEDDING_MODEL}`,
    content: { parts: [{ text }] },
    outputDimensionality: EMBEDDING_DIMENSIONS,
  });

  // ── Retry loop with exponential backoff ──────────────────────────────────
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } catch (networkErr) {
      if (attempt < retries) {
        const waitMs = 3000 * Math.pow(2, attempt);
        console.warn(
          `[Embedding] Network error on attempt ${attempt + 1}/${retries + 1}, ` +
            `retrying in ${waitMs / 1000}s…`, networkErr
        );
        await sleep(waitMs);
        continue;
      }
      throw networkErr;
    }

    lastCallAt = Date.now();

    if (res.ok) {
      const data = (await res.json()) as {
        embedding?: { values?: number[] };
      };
      const values = data?.embedding?.values;
      if (!values || values.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Unexpected embedding dimensions: got ${values?.length ?? 0}, ` +
            `expected ${EMBEDDING_DIMENSIONS}`
        );
      }
      return values;
    }

    if (res.status === 429) {
      if (attempt < retries) {
        // Exponential backoff: 5s, 15s, 45s, 135s
        const waitMs = 5000 * Math.pow(3, attempt);
        console.warn(
          `[Embedding] 429 Too Many Requests — quota exceeded. ` +
            `Attempt ${attempt + 1}/${retries + 1}, backing off ${waitMs / 1000}s…`
        );
        await sleep(waitMs);
        continue;
      }
      const errBody = await res.text();
      throw new Error(
        `[Embedding] Rate limit exceeded after ${retries + 1} attempts. ` +
          `Please wait a minute and retry. Detail: ${errBody.slice(0, 300)}`
      );
    }

    // Non-retryable HTTP error
    const errBody = await res.text();
    throw new Error(
      `[Embedding] API error ${res.status} ${res.statusText}: ${errBody.slice(0, 300)}`
    );
  }

  throw new Error("[Embedding] Unexpected: exhausted retry loop");
}
