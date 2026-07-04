import { getRecommendations } from "./actions";
import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { RecommendationsClient } from "./recommendations-client";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = "gemini-2.5-flash";

export default async function RecommendationsPage() {
  const { profile } = await requireRole(["student"]);
  const serviceClient = createServiceClient();

  // Check if there are recommendations created today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: todayRecs } = await serviceClient
    .from("student_recommendations")
    .select("id")
    .eq("student_id", profile.id)
    .gte("created_at", todayStart.toISOString())
    .lte("created_at", todayEnd.toISOString())
    .limit(1);

  // If no recommendations today, generate a daily tip
  if (!todayRecs || todayRecs.length === 0) {
    try {
      // Fetch enrolled courses
      const { data: enrollments } = await serviceClient
        .from("enrollments")
        .select("courses!inner(code, name)")
        .eq("student_id", profile.id)
        .eq("status", "enrolled");

      const courseNames = (enrollments || [])
        .map((e: any) => {
          const c = Array.isArray(e.courses) ? e.courses[0] : e.courses;
          return c ? `${c.name} (${c.code})` : "";
        })
        .filter(Boolean)
        .join("، ");

      const prompt = courseNames
        ? `قدم نصيحة دراسية يومية قصيرة (جملتين) بالعربية لطالب يدرس: ${courseNames}. لا تستخدم تنسيق Markdown، ولا عناوين، فقط نص بسيط مشجع.`
        : `قدم نصيحة دراسية يومية قصيرة (جملتين) بالعربية لطالب جامعي. لا تستخدم تنسيق Markdown، ولا عناوين، فقط نص بسيط مشجع.`;

      const model = genAI.getGenerativeModel({
        model: MODEL,
        systemInstruction: "أنت مرشد أكاديمي محفز. قدم نصيحة يومية قصيرة ومشجعة بالعربية.",
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
      });

      const tipText = result.response.text().trim();

      await serviceClient.from("student_recommendations").insert({
        tenant_id: profile.tenant_id,
        student_id: profile.id,
        sent_by: null,
        title: "نصيحة يومية 💡",
        body: tipText,
        is_read: false,
      });
    } catch (err) {
      console.error("[DailyTip] Failed:", err);
    }
  }

  const recommendations = await getRecommendations();

  return <RecommendationsClient initialRecommendations={recommendations as any} />;
}
