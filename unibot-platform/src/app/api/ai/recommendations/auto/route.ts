import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { remedialPrompt, enrichmentPrompt, PROMPT_INFO } from "@/lib/ai/recommendation-prompts";

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

    const body = await request.json();
    const { entryId, studentId, courseId, courseName, totalGrade, tenantId } = body;

    if (!entryId || !studentId || !courseId || totalGrade === undefined || !tenantId) {
      return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 });
    }

    if (totalGrade >= 60 && totalGrade <= 90) {
      return NextResponse.json({ message: "الدرجة ضمن المعدل الطبيعي، لا حاجة لتوصية" });
    }

    const isRemedial = totalGrade < 60;
    const recType = isRemedial ? "remedial" : "enrichment";
    const title = isRemedial
      ? "توصية تعليمية — تحسين الأداء"
      : "توصية تعليمية — إثراء معرفي";

    const systemPrompt = isRemedial
      ? remedialPrompt(totalGrade, title, courseName)
      : enrichmentPrompt(totalGrade, title, courseName);

    const config = PROMPT_INFO[recType];

    const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: systemPrompt });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `قدّم توصيات للطالب في مادة ${courseName}` }] }],
      generationConfig: { temperature: config.temperature, maxOutputTokens: config.maxTokens },
    });

    const bodyText = result.response.text();

    const serviceClient = createServiceClient();
    await serviceClient.from("student_recommendations").insert({
      tenant_id: tenantId,
      student_id: studentId,
      course_id: courseId,
      sent_by: null,
      rec_type: recType,
      title,
      body: bodyText,
      is_read: false,
    });

    return NextResponse.json({ success: true, title, rec_type: recType });
  } catch (error) {
    console.error("[AutoRecommendations] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطأ غير متوقع" },
      { status: 500 },
    );
  }
}
