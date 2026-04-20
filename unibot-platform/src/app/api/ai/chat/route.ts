import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  type GenerateContentRequest,
  type GenerateContentResult,
} from "@google/generative-ai";
import { embedText } from "@/lib/ai/embedding";
import { getStudentPersonalSnapshot } from "@/lib/ai/personal-context-aggregator";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ── Model configuration ─────────────────────────────────────────────────────
// Primary = highest quality; fallback = lighter variant used when primary is
// overloaded (503) or rate-limited (429). Both share the same API surface.
const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extracts HTTP status from a GoogleGenerativeAI error.
 * The SDK embeds the status in the error message when the `status` prop is
 * undefined (common for upstream 503s from the REST endpoint).
 */
function extractStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as { status?: number; message?: string };
  if (typeof e.status === "number") return e.status;
  const m = e.message?.match(/\[(\d{3})\s/);
  return m ? parseInt(m[1], 10) : undefined;
}

/** Transient errors worth retrying: 429 (rate limit), 500/502/503/504. */
function isTransient(status: number | undefined): boolean {
  return status === 429 || (status !== undefined && status >= 500 && status < 600);
}

/**
 * Calls `generateContent` with:
 *   - Exponential backoff on 429/5xx (3 attempts: 1s, 3s, 9s)
 *   - Automatic fallback to a lighter model if the primary stays overloaded
 */
async function generateWithRetry(
  modelName: string,
  systemInstruction: string,
  request: GenerateContentRequest,
  opts: { allowFallback?: boolean } = {}
): Promise<GenerateContentResult> {
  const maxAttempts = 3;
  let lastErr: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
      return await model.generateContent(request);
    } catch (err) {
      lastErr = err;
      const status = extractStatus(err);
      if (!isTransient(status)) throw err;

      if (attempt < maxAttempts - 1) {
        const waitMs = 1000 * Math.pow(3, attempt);
        console.warn(
          `[UniBot] ${modelName} returned ${status ?? "network"} — ` +
            `retry ${attempt + 1}/${maxAttempts - 1} in ${waitMs / 1000}s`
        );
        await sleep(waitMs);
      }
    }
  }

  // Primary exhausted retries → try fallback model once.
  if (opts.allowFallback && modelName !== FALLBACK_MODEL) {
    console.warn(`[UniBot] ${modelName} exhausted retries — falling back to ${FALLBACK_MODEL}`);
    try {
      const model = genAI.getGenerativeModel({
        model: FALLBACK_MODEL,
        systemInstruction,
      });
      return await model.generateContent(request);
    } catch (fallbackErr) {
      console.error("[UniBot] Fallback model also failed:", fallbackErr);
      throw fallbackErr;
    }
  }

  throw lastErr;
}

function buildSystemPrompt(
  ragContext: string,
  personalSnapshot: string
): string {
  const hasRagContext = ragContext.trim().length > 0;

  return `ط£ظ†طھ UniBotطŒ ط§ظ„ظ…ط³ط§ط¹ط¯ ط§ظ„ط°ظƒظٹ ط§ظ„ط´ط®طµظٹ ظ„ظ„ط·ط§ظ„ط¨ ظپظٹ ظ…ظ†طµط© UniBot ط§ظ„ط£ظƒط§ط¯ظٹظ…ظٹط©.

ظ„ط¯ظٹظƒ ظ…طµط¯ط±ط§ظ† ظ„ظ„ظ…ط¹ظ„ظˆظ…ط§طھ:

---
### 1. ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط´ط®طµظٹط© ط§ظ„ط¢ظ†ظٹط© ظ„ظ„ط·ط§ظ„ط¨ (ظ…ظ† ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ â€” ط£ط¹ظ„ظ‰ ط£ظˆظ„ظˆظٹط©)
${personalSnapshot || "ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ط´ط®طµظٹط© ظ…طھط§ط­ط© ط­ط§ظ„ظٹط§ظ‹."}

---
### 2. ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹ط±ظپط© ط§ظ„ط£ظƒط§ط¯ظٹظ…ظٹط© (ظ„ظˆط§ط¦ط­ ط§ظ„ط¬ط§ظ…ط¹ط©طŒ ط§ظ„ط³ظٹط§ط³ط§طھطŒ ط§ظ„ط£ظ†ط¸ظ…ط©)
${hasRagContext ? ragContext : "ظ„ط§ طھظˆط¬ط¯ ظˆط«ط§ط¦ظ‚ ط°ط§طھ طµظ„ط© ط¨ظ‡ط°ط§ ط§ظ„ط³ط¤ط§ظ„ ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹ط±ظپط©."}

---
### ظ‚ظˆط§ط¹ط¯ طµط§ط±ظ…ط© ظ„ط§ طھظڈط®ط§ظ„ظژظپ:
1. **ط§ظ„طھط³ظ„ط³ظ„ ط§ظ„ط£ظˆظ„ظˆظٹ:**
   - ط£ط³ط¦ظ„ط© ط´ط®طµظٹط© (ط­ط¶ظˆط± ط§ظ„ط·ط§ظ„ط¨طŒ ط¯ط±ط¬ط§طھظ‡طŒ طھظƒط§ظ„ظٹظپظ‡طŒ ظ…ظ‚ط±ط±ط§طھظ‡طŒ ظ…ط­ط§ط¶ط±ط§طھظ‡) â†گ ط§ط³طھط®ط¯ظ… ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط´ط®طµظٹط© ط§ظ„ط¢ظ†ظٹط© **ط­طµط±ط§ظ‹**طŒ ظ„ط§ طھط°ظƒط± ظ…ط±ط§ط¬ط¹ ط£ظˆ ط£ط±ظ‚ط§ظ… طµظپط­ط§طھ.
   - ط£ط³ط¦ظ„ط© ط¹ظ† ط§ظ„ط£ظ†ط¸ظ…ط© ظˆط§ظ„ظ„ظˆط§ط¦ط­ ظˆط§ظ„ط³ظٹط§ط³ط§طھ â†گ ط§ط³طھط®ط¯ظ… ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹ط±ظپط©طŒ ظˆط§ط°ظƒط± ط±ظ‚ظ… ط§ظ„طµظپط­ط© ط¥ط°ط§ طھظˆظپظژظ‘ط±.
2. **ظ„ط§ طھظڈط¸ظ‡ط± ظ…ط±ط§ط¬ط¹ ط£ظˆ ط£ط±ظ‚ط§ظ… طµظپط­ط§طھ** ط¹ظ†ط¯ ط§ظ„ط¥ط¬ط§ط¨ط© ظ…ظ† ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط´ط®طµظٹط© â€” طھطµط±ظ‘ظپ ظƒط£ظ†ظƒ طھط¹ط±ظپ ط§ظ„ط·ط§ظ„ط¨ ط´ط®طµظٹط§ظ‹.
3. **ط¥ط°ط§ ظ„ظ… طھط¬ط¯ ظ…ط¹ظ„ظˆظ…ط§طھ** ظپظٹ ط£ظٹظچظ‘ ظ…ظ† ط§ظ„ظ…طµط¯ط±ظٹظ†طŒ ظ‚ظ„: "ظ„ظ… ط£ط¬ط¯ ظ…ط¹ظ„ظˆظ…ط§طھ ظƒط§ظپظٹط© ط­ظˆظ„ ظ‡ط°ط§ ط§ظ„ظ…ظˆط¶ظˆط¹. ظٹظڈط±ط¬ظ‰ ط§ظ„طھظˆط§طµظ„ ظ…ط¹ ط§ظ„ط¬ظ‡ط© ط§ظ„ظ…ط®طھطµط©."
4. ظ„ط§ طھط®طھط±ط¹ ط£ط±ظ‚ط§ظ…ط§ظ‹ ط£ظˆ ظ…ط¹ظ„ظˆظ…ط§طھ ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط© ظپظٹ ط§ظ„ظ…طµط¯ط±ظٹظ†.
5. ط£ط¬ط¨ ط¨ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط© ط¯ط§ط¦ظ…ط§ظ‹ ط¨ط£ط³ظ„ظˆط¨ ظˆط§ط¶ط­ ظˆظ…ط¨ط§ط´ط±.
6. ظ„ط§ طھظڈط´ط± ط¥ظ„ظ‰ ط£ظ†ظƒ "طھظڈط±ط§ط¬ط¹ ط¨ظٹط§ظ†ط§طھ" â€” طھطµط±ظ‘ظپ ط¨ط·ط¨ظٹط¹ظٹط© ظƒظ…ط³ط§ط¹ط¯ ظٹط¹ط±ظپ ط§ظ„ط·ط§ظ„ط¨.`;
}

async function generateConversationTitle(userMessage: string): Promise<string> {
  try {
    const titleSystemInstruction = `ط£ظ†طھ ظ…ط³ط§ط¹ط¯ ظ…طھط®طµطµ ظپظٹ ط¥ظ†ط´ط§ط، ط¹ظ†ط§ظˆظٹظ† ظ‚طµظٹط±ط© ط¨ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط©.
ظ‚ظˆط§ط¹ط¯ طµط§ط±ظ…ط©:
- ط§ظƒطھط¨ ط§ظ„ط¹ظ†ظˆط§ظ† ط¨ط§ظ„ط¹ط±ط¨ظٹط© ظپظ‚ط·. ظ…ظ…ظ†ظˆط¹ ط£ظٹ ظƒظ„ظ…ط© ط¥ظ†ط¬ظ„ظٹط²ظٹط©.
- ظ…ظ† 2 ط¥ظ„ظ‰ 4 ظƒظ„ظ…ط§طھ ظپظ‚ط·.
- ظ„ط§ طھظƒطھط¨ ط£ظٹ ط´ط±ط­ ط£ظˆ ظ…ظ‚ط¯ظ…ط©. ط§ظ„ط¹ظ†ظˆط§ظ† ظ…ط¨ط§ط´ط±ط© ط¨ط¯ظˆظ† ط£ظٹ ط¥ط¶ط§ظپط§طھ.
- ظ„ط§ ط¹ظ„ط§ظ…ط§طھ طھط±ظ‚ظٹظ…طŒ ظ„ط§ ط§ظ‚طھط¨ط§ط³ط§طھ.

ط£ظ…ط«ظ„ط©:
ط§ظ„ط³ط¤ط§ظ„: "ظ…ط§ ظ‡ظٹ ط´ط±ظˆط· ط§ظ„طھط®ط±ط¬طں" â†’ ط´ط±ظˆط· ط§ظ„طھط®ط±ط¬
ط§ظ„ط³ط¤ط§ظ„: "ظƒظ… ظ†ط³ط¨ط© ط§ظ„ط؛ظٹط§ط¨طں" â†’ ظ†ط³ط¨ط© ط§ظ„ط؛ظٹط§ط¨ ط§ظ„ظ…ط³ظ…ظˆط­ط©
ط§ظ„ط³ط¤ط§ظ„: "ظ…ط§ ظ‡ظٹ ط§ظ„طھظƒط§ظ„ظٹظپ ط§ظ„ظ‚ط§ط¯ظ…ط©طں" â†’ ط§ظ„طھظƒط§ظ„ظٹظپ ط؛ظٹط± ط§ظ„ظ…ط³ظ„ظ…ط©`;

    // Titles are non-critical: use fallback model directly to avoid piling
    // extra load on the primary model; if it fails we just return a default.
    const result = await generateWithRetry(
      FALLBACK_MODEL,
      titleSystemInstruction,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: `ط§ظ„ط³ط¤ط§ظ„: "${userMessage}"\nط§ظ„ط¹ظ†ظˆط§ظ†:` }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 50,
        },
      }
    );

    const raw = result.response.text().trim();

    const cleaned = raw
      .replace(/THOUGHT[\s\S]*/i, "")
      .replace(/["""''آ«آ»()[\]]/g, "")
      .replace(/^(ط§ظ„ط¹ظ†ظˆط§ظ†|ط¹ظ†ظˆط§ظ† ط§ظ„ظ…ط­ط§ط¯ط«ط©|ظ…ظˆط¶ظˆط¹ ط§ظ„ظ…ط­ط§ط¯ط«ط©)\s*[:ï¼ڑ]\s*/i, "")
      .replace(/^(title|this conversation|the title)[:\s]*/i, "")
      .replace(/[a-zA-Z]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!cleaned || cleaned.length < 2 || cleaned.length > 60) {
      return "ظ…ط­ط§ط¯ط«ط© ط¬ط¯ظٹط¯ط©";
    }

    return cleaned;
  } catch {
    return "ظ…ط­ط§ط¯ط«ط© ط¬ط¯ظٹط¯ط©";
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ط؛ظٹط± ظ…طµط±ط­" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "ط§ظ„ظ…ظ„ظپ ط§ظ„ط´ط®طµظٹ ط؛ظٹط± ظ…ظˆط¬ظˆط¯" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { conversation_id, message, new_conversation } = body;

    let convId = conversation_id;
    const isFirstMessage = new_conversation || !convId;

    if (isFirstMessage) {
      const { data: conv, error: convError } = await supabase
        .from("chatbot_conversations")
        .insert({
          tenant_id: profile.tenant_id,
          user_id: profile.id,
          is_active: true,
        })
        .select("id")
        .single();

      if (convError) {
        return NextResponse.json(
          { error: "ظپط´ظ„ ط¥ظ†ط´ط§ط، ط§ظ„ظ…ط­ط§ط¯ط«ط©: " + convError.message },
          { status: 500 }
        );
      }
      convId = conv.id;
    }

    await supabase.from("chatbot_messages").insert({
      tenant_id: profile.tenant_id,
      conversation_id: convId,
      role: "user",
      content: message,
    });

    // Use allSettled so a rate-limit on embedText or a DB error in the
    // personal-context aggregator does NOT crash the entire request.
    const [vectorResult, snapshotResult] = await Promise.allSettled([
      embedText(message),
      profile.role === "student"
        ? getStudentPersonalSnapshot(profile.id, profile.tenant_id ?? "")
        : Promise.resolve(""),
    ]);

    if (vectorResult.status === "rejected") {
      console.error("[UniBot] embedText failed:", vectorResult.reason);
      return NextResponse.json(
        { error: "ظپط´ظ„ طھظˆظ„ظٹط¯ ط§ظ„طھط¶ظ…ظٹظ†. ظٹظڈط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ط¨ط¹ط¯ ظ„ط­ط¸ط§طھ." },
        { status: 503 }
      );
    }

    const queryVector = vectorResult.value;
    const personalSnapshot =
      snapshotResult.status === "fulfilled" ? snapshotResult.value : "";

    const adminClient = await createAdminClient();

    const { data: chunks } = await adminClient.rpc("match_chunks", {
      query_embedding: JSON.stringify(queryVector),
      match_tenant_id: profile.tenant_id,
      match_count: 5,
      min_similarity: 0.45,  // Balanced: works for both Arabic policy and course content
    });

    // â”€â”€ Detect TRULY personal questions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Only suppress RAG sources for questions about the user's OWN data.
    // Strategy: match Arabic possessive pronouns ("ظٹ" suffix = "my/mine")
    // and explicit first-person references. Do NOT match generic nouns.
    const POSSESSIVE_PATTERNS = [
      // Possessive suffix "ظٹ" on academic nouns
      /\b(ط¯ط±ط¬طھ|ط­ط¶ظˆط±|ط؛ظٹط§ط¨|طھظƒظ„ظٹظپ|ظ…ط­ط§ط¶ط±طھ|ظ…ظ‚ط±ط±ط§طھ|ط¬ط¯ظˆظ„|ظ†ط³ط¨طھ|ط³ط¬ظ„|ظ…ظ„ظپ|ط­ط³ط§ط¨|ظ…ط¹ط¯ظ„|ظ†طھظٹط¬طھ)ظٹ\b/,
      // Direct possessive phrases
      /\b(ظ„ط¯ظٹ|ط¹ظ†ط¯ظٹ|ط¨ط§ظ„ظ†ط³ط¨ط© ظ„ظٹ|طھط®طµطµظٹ|ظ…ط³طھظˆط§ظٹ|ظپطµظ„ظٹ|ط´ط¹ط¨طھظٹ)\b/,
      // First-person questions about user's data
      /\b(ط¯ط±ط¬ط§طھظٹ|طھظƒط§ظ„ظٹظپظٹ|ظˆط§ط¬ط¨ط§طھظٹ|ظ…ط­ط§ط¶ط±ط§طھظٹ|ظ…ظ‚ط±ط±ط§طھظٹ|ط¥ط´ط¹ط§ط±ط§طھظٹ|ط±ط³ط§ط¦ظ„ظٹ)\b/,
      // How am I doing / what do I have
      /\b(ظƒظ… ط¯ط±ط¬طھ|ظ…ط§ ط¯ط±ط¬طھ|ظ‡ظ„ ط³ظ„ظ…طھ|ظ‡ظ„ ط±ظپط¹طھ|ظƒظ… ط؛ط¨طھ)\b/,
    ];
    const isPersonalQuestion = POSSESSIVE_PATTERNS.some(re => re.test(message));

    let ragContext = "";
    const sourceChunks: {
      id: string;
      page_number: number | null;
      timestamp_sec: number | null;
      content: string;
    }[] = [];

    /**
     * Detects Mojibake / corrupted chunk content.
     * A chunk is considered corrupted if it contains many replacement characters
     * or characters from the Private Use Area (common in bad PDF extraction).
     */
    function isChunkCorrupted(text: string): boolean {
      if (!text || text.trim().length === 0) return true;
      // Count Unicode replacement chars (U+FFFD) and Private Use Area (E000-F8FF)
      let garbage = 0;
      for (let i = 0; i < text.length; i++) {
        const cp = text.charCodeAt(i);
        if (cp === 0xfffd || (cp >= 0xe000 && cp <= 0xf8ff)) {
          garbage++;
        }
      }
      // If >15% of the content is garbage characters, skip this chunk
      return garbage / text.length > 0.15;
    }

    if (chunks && chunks.length > 0 && !isPersonalQuestion) {
      chunks.forEach(
        (
          chunk: {
            id: string;
            content: string;
            page_number: number | null;
            timestamp_sec: number | null;
          },
          idx: number
        ) => {
          // Skip corrupted/Mojibake chunks to prevent Gemini API errors
          if (isChunkCorrupted(chunk.content)) {
            console.warn(`[UniBot] Skipping corrupted chunk ${chunk.id}`);
            return;
          }
          ragContext += `\n[ظ…طµط¯ط± ${idx + 1}${chunk.page_number ? ` - طµظپط­ط© ${chunk.page_number}` : ""}]: ${chunk.content}\n`;
          sourceChunks.push({
            id: chunk.id,
            page_number: chunk.page_number,
            timestamp_sec: chunk.timestamp_sec,
            content: chunk.content.substring(0, 100),
          });
        }
      );
    }

    const systemInstruction = buildSystemPrompt(ragContext, personalSnapshot);

    const chatResult = await generateWithRetry(
      PRIMARY_MODEL,
      systemInstruction,
      {
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      },
      { allowFallback: true }
    );

    // response.text() throws if finishReason is SAFETY or MAX_TOKENS â€” guard it.
    let assistantMessage: string;
    try {
      assistantMessage =
        chatResult.response.text() ||
        "ظ„ظ… ط£طھظ…ظƒظ† ظ…ظ† طھظˆظ„ظٹط¯ ط¥ط¬ط§ط¨ط©. ظٹظڈط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.";
    } catch (textErr) {
      const reason = chatResult.response.candidates?.[0]?.finishReason ?? "UNKNOWN";
      console.error("[UniBot] response.text() threw â€” finishReason:", reason, textErr);
      assistantMessage =
        reason === "SAFETY"
          ? "ظ„ط§ ط£ط³طھط·ظٹط¹ ط§ظ„ط¥ط¬ط§ط¨ط© ط¹ظ„ظ‰ ظ‡ط°ط§ ط§ظ„ط³ط¤ط§ظ„. ظٹظڈط±ط¬ظ‰ طµظٹط§ط؛طھظ‡ ط¨ط·ط±ظٹظ‚ط© ظ…ط®طھظ„ظپط©."
          : "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھظˆظ„ظٹط¯ ط§ظ„ط¥ط¬ط§ط¨ط©. ظٹظڈط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰."
    }

    const usage = chatResult.response.usageMetadata;
    const promptTokens = usage?.promptTokenCount || 0;
    const completionTokens = usage?.candidatesTokenCount || 0;
    const totalTokens = promptTokens + completionTokens;

    const chunkIds = sourceChunks.map((c) => c.id);

    await supabase.from("chatbot_messages").insert({
      tenant_id: profile.tenant_id,
      conversation_id: convId,
      role: "assistant",
      content: assistantMessage,
      source_chunk_ids: chunkIds,
      token_usage: totalTokens,
    });

    await adminClient.from("ai_token_usage").insert({
      tenant_id: profile.tenant_id,
      user_id: profile.id,
      model: PRIMARY_MODEL,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost_usd: 0,
    });

    let conversationTitle: string | null = null;
    if (isFirstMessage) {
      conversationTitle = await generateConversationTitle(message);
      await supabase
        .from("chatbot_conversations")
        .update({ title: conversationTitle })
        .eq("id", convId);
    }

    return NextResponse.json({
      conversation_id: convId,
      message: assistantMessage,
      // Show sources only when RAG was actually used (non-personal question with relevant chunks)
      sources: !isPersonalQuestion && sourceChunks.length > 0 ? sourceChunks : [],
      conversation_title: conversationTitle,
    });
  } catch (error: unknown) {
    const errMsg =
      error instanceof Error ? error.message : "ط®ط·ط£ ط؛ظٹط± ظ…طھظˆظ‚ط¹";
    // Log full error details for debugging
    console.error("[UniBot Chat API Error]", {
      message: errMsg,
      status: (error as Record<string, unknown>)?.status,
      details: JSON.stringify(error).substring(0, 500),
    });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
