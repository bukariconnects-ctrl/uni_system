import { createServiceClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { remedialPrompt, enrichmentPrompt, PROMPT_INFO } from "@/lib/ai/recommendation-prompts";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = "gemini-2.5-flash";

export async function generateAutoRecommendation({
  studentId,
  courseId,
  courseName,
  grade,
  maxGrade,
  tenantId,
}: {
  studentId: string;
  courseId: string;
  courseName: string;
  grade: number;
  maxGrade: number;
  tenantId: string;
}) {
  if (maxGrade <= 0) return;

  const percentage = (grade / maxGrade) * 100;

  // Between 60% and 90% — no recommendation needed
  if (percentage >= 60 && percentage <= 90) return;

  const isRemedial = percentage < 60;
  const recType = isRemedial ? "remedial" : "enrichment";
  const title = isRemedial
    ? "توصية تعليمية — تحسين الأداء"
    : "توصية تعليمية — إثراء معرفي";

  const systemPrompt = isRemedial
    ? remedialPrompt(percentage, title, courseName)
    : enrichmentPrompt(percentage, title, courseName);

  const config = PROMPT_INFO[recType];

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: systemPrompt,
    });

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
  } catch (err) {
    console.error("[RecommendationEngine] Failed:", err);
  }
}
