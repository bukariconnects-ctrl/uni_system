import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = "gemini-2.5-flash";

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

    if (!profile || profile.role !== "student") {
      return NextResponse.json({ error: "غير مصرح — الطلاب فقط" }, { status: 403 });
    }

    const body = await request.json();
    const { topic, courseName } = body;

    if (!topic || topic.trim().length === 0) {
      return NextResponse.json({ error: "الرجاء إدخال موضوع الطلب" }, { status: 400 });
    }

    const systemPrompt = `أنت مستشار أكاديمي عالمي خبير في منصة UniBot. الطالب يطلب موارد تعليمية لفهم الموضوع التالي: "${topic}"${courseName ? ` في مادة "${courseName}"` : ""}.

ممنوع الاكتفاء بالشرح العام. يجب أن تتكون إجابتك من الأقسام التالية حصراً بتنسيق Markdown:

1. **نظرة سريعة:** جملة تشجيعية قصيرة عن الموضوع.
2. **قنوات يوتيوب مقترحة:** اذكر 3 قنوات يوتيوب (عربية أو أجنبية) مشهورة تشرح هذا الموضوع مع وصف مختصر.
3. **كتب ومراجع:** اذكر كتابين عالميين مرجعيين في هذا الموضوع مع اسم المؤلف.
4. **منصات تدريب:** اقترح منصات تفاعلية (مثل Coursera، W3Schools، Khan Academy، LeetCode، Udemy) مناسبة للتدريب العملي.
5. **نصيحة ختامية:** جملة تحفيزية واحدة.

تنبيهات هامة:
- لا تكتب روابط (URLs) — اكتب أسماء القنوات والكتب والمنصات فقط.
- لا تضف أقساماً غير المذكورة أعلاه.
- استخدم تنسيق Markdown النظيف (عناوين، نقاط، تنسيق غامق).`;

    const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: systemPrompt });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: topic }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    });

    const bodyText = result.response.text();

    const serviceClient = createServiceClient();

    const { data: recommendation, error } = await serviceClient
      .from("student_recommendations")
      .insert({
        tenant_id: profile.tenant_id,
        student_id: profile.id,
        sent_by: profile.id,
        title: `طلب توصية: ${topic.slice(0, 80)}`,
        body: bodyText,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, recommendation });
  } catch (error) {
    console.error("[Recommendations/Request] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
