import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { embedText } from "@/lib/ai/embedding";
import { getStudentPersonalSnapshot } from "@/lib/ai/personal-context-aggregator";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function buildSystemPrompt(
  ragContext: string,
  personalSnapshot: string
): string {
  return `أنت UniBot، المساعد الذكي الشخصي للطالب في منصة UniBot الأكاديمية.

لديك مصدران للمعلومات:

---
### 1. البيانات الشخصية الآنية للطالب (من قاعدة البيانات — أكثر أولوية للأسئلة الشخصية)
${personalSnapshot || "لا توجد بيانات شخصية متاحة حالياً."}

---
### 2. قاعدة المعرفة الأكاديمية (لوائح الجامعة، السياسات، الأنظمة)
${ragContext || "لا يوجد سياق من قاعدة المعرفة."}

---
### قواعد صارمة لا تُخالَف:
1. **التسلسل الأولوي:** للأسئلة الشخصية (حضور الطالب، درجاته، تكاليفه، مقرراته) — استخدم البيانات الشخصية الآنية أولاً. للأسئلة حول الأنظمة واللوائح — استخدم قاعدة المعرفة.
2. إذا أجبت من البيانات الشخصية، لا تحتاج لذكر مصدر أو صفحة. تصرّف كأنك تعرف الطالب شخصياً.
3. إذا أجبت من قاعدة المعرفة، اذكر رقم الصفحة أو المصدر إذا توفَّر.
4. إذا لم يكفِ أيٌّ من المصدرين للإجابة، قل بالضبط: "لم أجد معلومات كافية حول هذا الموضوع. يُرجى التواصل مع الجهة المختصة."
5. لا تخترع أرقاماً أو معلومات غير موجودة في المصدرين.
6. أجب باللغة العربية دائماً بأسلوب واضح ومباشر.
7. لا تُشر إلى أنك "تُراجع بيانات" أو "تبحث في قاعدة بيانات" — تصرّف بطبيعية كمساعد يعرف الطالب.`;
}

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
السؤال: "ما هي التكاليف القادمة؟" → التكاليف غير المسلمة`,
    });

    const result = await titleModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: `السؤال: "${userMessage}"\nالعنوان:` }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 50,
        thinkingConfig: { thinkingBudget: 0 },
      } as Record<string, unknown>,
    });

    const raw = result.response.text().trim();

    const cleaned = raw
      .replace(/THOUGHT[\s\S]*/i, "")
      .replace(/["""''«»()[\]]/g, "")
      .replace(/^(العنوان|عنوان المحادثة|موضوع المحادثة)\s*[:：]\s*/i, "")
      .replace(/^(title|this conversation|the title)[:\s]*/i, "")
      .replace(/[a-zA-Z]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!cleaned || cleaned.length < 2 || cleaned.length > 60) {
      return "محادثة جديدة";
    }

    return cleaned;
  } catch {
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
      return NextResponse.json(
        { error: "الملف الشخصي غير موجود" },
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

    const [queryVector, personalSnapshot] = await Promise.all([
      embedText(message),
      profile.role === "student"
        ? getStudentPersonalSnapshot(profile.id, profile.tenant_id ?? "")
        : Promise.resolve(""),
    ]);

    const adminClient = await createAdminClient();

    const { data: chunks } = await adminClient.rpc("match_chunks", {
      query_embedding: JSON.stringify(queryVector),
      match_tenant_id: profile.tenant_id,
      match_count: 5,
    });

    let ragContext = "";
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
          ragContext += `\n[مصدر ${idx + 1}${chunk.page_number ? ` - صفحة ${chunk.page_number}` : ""}]: ${chunk.content}\n`;
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

    const chatModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
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
      model: "gemini-2.5-flash",
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
