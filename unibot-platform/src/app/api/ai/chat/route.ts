import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { embedText } from "@/lib/ai/embedding";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `أنت UniBot، المساعد الذكي لمنصة UniBot الأكاديمية.

قواعد صارمة:
1. أجب فقط من السياق المُوفَّر أدناه. لا تستخدم معلومات من خارج السياق.
2. إذا لم يكن السياق المُوفَّر كافياً للإجابة، قل بالضبط: "لم أجد معلومات كافية حول هذا الموضوع في قاعدة معرفتي. يُرجى التواصل مع المختص المعني."
3. لا تُجب بمعلومات من خارج السياق أبداً.
4. عند الاقتباس، اذكر رقم الصفحة أو المصدر إذا كان متوفراً.
5. أجب باللغة العربية بشكل واضح ومختصر.
6. لا تذكر أنك تستخدم "سياق" أو "chunks" — تصرف كأنك تعرف المعلومة مباشرة.`;

async function generateConversationTitle(userMessage: string): Promise<string> {
  try {
    const titleModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `أنت مساعد متخصص في إنشاء عناوين قصيرة باللغة العربية.
قواعد صارمة:
- اكتب العنوان بالعربية فقط. ممنوع أي كلمة إنجليزية.
- من 2 إلى 4 كلمات فقط.
- لا تكتب أي شرح أو مقدمة. العنوان مباشرة بدون أي إضافات.
- لا علامات ترقيم، لا اقتباسات.

أمثلة:
السؤال: "ما هي شروط التخرج؟" → شروط التخرج
السؤال: "كم نسبة الغياب؟" → نسبة الغياب المسموحة
السؤال: "ما المقررات المتاحة؟" → المقررات الدراسية
السؤال: "هل يوجد تكاليف لم أسلمها؟" → التكاليف غير المسلمة
السؤال: "ما هو الإنذار الأكاديمي؟" → الإنذار الأكاديمي`,
    });

    const result = await titleModel.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: `السؤال: "${userMessage}"\nالعنوان:` }],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 50,
        // Disable thinking to get direct output without CoT leakage
        thinkingConfig: { thinkingBudget: 0 },
      } as Record<string, unknown>,
    });

    const raw = result.response.text().trim();
    console.log("[UniBot Title Raw]:", JSON.stringify(raw));

    const cleaned = raw
      .replace(/THOUGHT[\s\S]*/i, "")
      .replace(/["""''«»()[\]]/g, "")
      .replace(/^(العنوان|عنوان المحادثة|موضوع المحادثة)\s*[:：]\s*/i, "")
      .replace(/^(title|this conversation|the title)[:\s]*/i, "")
      .replace(/[a-zA-Z]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    console.log("[UniBot Title Cleaned]:", JSON.stringify(cleaned));

    if (!cleaned || cleaned.length < 2 || cleaned.length > 60) {
      return "محادثة جديدة";
    }

    return cleaned;
  } catch (err) {
    console.error("[UniBot Title Error]:", err);
    return "محادثة جديدة";
  }
}


export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "الملف الشخصي غير موجود" }, { status: 404 });
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
          { error: "فشل إنشاء المحادثة: " + convError.message },
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

    // Use shared embedText (gemini-embedding-2-preview, 768 dims) for query vectorization
    const queryVector = await embedText(message);

    const adminClient = await createAdminClient();

    const { data: chunks } = await adminClient.rpc("match_chunks", {
      query_embedding: JSON.stringify(queryVector),
      match_tenant_id: profile.tenant_id,
      match_count: 5,
    });

    let context = "";
    const sourceChunks: {
      id: string;
      page_number: number | null;
      timestamp_sec: number | null;
      content: string;
    }[] = [];

    if (chunks && chunks.length > 0) {
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
          context += `\n[مصدر ${idx + 1}${chunk.page_number ? ` - صفحة ${chunk.page_number}` : ""}]: ${chunk.content}\n`;
          sourceChunks.push({
            id: chunk.id,
            page_number: chunk.page_number,
            timestamp_sec: chunk.timestamp_sec,
            content: chunk.content.substring(0, 100),
          });
        }
      );
    }

    const { data: assignments } = await supabase
      .from("assignments")
      .select("title, due_date, sections(section_code, courses(name))")
      .gt("due_date", new Date().toISOString())
      .order("due_date", { ascending: true })
      .limit(5);

    let personalContext = "";
    if (assignments && assignments.length > 0) {
      personalContext = "\n\nمعلومات شخصية عن الطالب:\nالتكاليف القادمة:\n";
      assignments.forEach((a: Record<string, unknown>) => {
        const sections = a.sections as Record<string, unknown> | null;
        const courses = sections?.courses as Record<string, unknown> | null;
        personalContext += `- ${a.title} (${courses?.name || ""}) — تسليم: ${new Date(a.due_date as string).toLocaleDateString("ar-SA")}\n`;
      });
    }

    const chatModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction:
        SYSTEM_PROMPT +
        "\n\nالسياق المتاح:\n" +
        (context || "لا يوجد سياق متاح.") +
        personalContext,
    });

    const chatResult = await chatModel.generateContent({
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
      },
    });

    const assistantMessage =
      chatResult.response.text() ||
      "لم أتمكن من توليد إجابة. يُرجى المحاولة مرة أخرى.";

    const usage = chatResult.response.usageMetadata;
    const promptTokens = (usage?.promptTokenCount || 0);
    const completionTokens = (usage?.candidatesTokenCount || 0);
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
      model: "gemini-2.5-flash",
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost_usd: 0,
    });

    // Generate and save a smart title only for the first message of a new conversation
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
      sources: sourceChunks,
      conversation_title: conversationTitle,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "خطأ غير متوقع";
    console.error("[UniBot Chat API Error]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
