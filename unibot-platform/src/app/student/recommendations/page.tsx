import { getRecommendations } from "./actions";
import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { RecommendationsClient } from "./recommendations-client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { dailyTipPrompt, PROMPT_INFO } from "@/lib/ai/recommendation-prompts";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = "gemini-2.5-flash";

export default async function RecommendationsPage() {
  const { profile } = await requireRole(["student"]);
  const serviceClient = createServiceClient();

  // Check if there's already a daily tip for today using rec_type
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: todayTip } = await serviceClient
    .from("student_recommendations")
    .select("id")
    .eq("student_id", profile.id)
    .eq("rec_type", "daily_tip")
    .gte("created_at", todayStart.toISOString())
    .lte("created_at", todayEnd.toISOString())
    .limit(1);

  // If no daily tip today, generate one
  if (!todayTip || todayTip.length === 0) {
    try {
      // Fetch enrolled courses for context
      const { data: enrollments } = await serviceClient
        .from("enrollments")
        .select("courses!inner(id, code, name)")
        .eq("student_id", profile.id)
        .eq("status", "enrolled");

      const courseNames = (enrollments || [])
        .map((e: any) => {
          const c = Array.isArray(e.courses) ? e.courses[0] : e.courses;
          return c ? `${c.name} (${c.code})` : "";
        })
        .filter(Boolean)
        .join("، ");

      // Fetch student's major and academic level for richer context
      const { data: studentMajors } = await serviceClient
        .from("student_majors")
        .select("majors!inner(name)")
        .eq("student_id", profile.id)
        .eq("is_primary", true)
        .maybeSingle();

      const majorName = studentMajors
        ? (Array.isArray(studentMajors.majors) ? studentMajors.majors[0] : studentMajors.majors)?.name
        : null;

      // Get academic level from latest enrollment
      const { data: levelData } = await serviceClient
        .from("enrollments")
        .select("academic_levels!inner(name)")
        .eq("student_id", profile.id)
        .not("academic_level_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const academicLevel = levelData
        ? (Array.isArray(levelData.academic_levels) ? levelData.academic_levels[0] : levelData.academic_levels)?.name
        : null;

      // Fetch upcoming assignments for context
      const { data: upcomingAssignments } = await serviceClient
        .from("assignments")
        .select("title, due_date, courses!inner(name)")
        .eq("tenant_id", profile.tenant_id)
        .in(
          "course_id",
          (enrollments || [])
            .map((e: any) => {
              const c = Array.isArray(e.courses) ? e.courses[0] : e.courses;
              return c?.id;
            })
            .filter(Boolean),
        )
        .gte("due_date", new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(5);

      const assignmentsText = (upcomingAssignments || [])
        .map((a: any) => {
          const c = Array.isArray(a.courses) ? a.courses[0] : a.courses;
          const courseName = c?.name || "";
          const due = new Date(a.due_date).toLocaleDateString("ar-SA", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          return `${a.title} (${courseName}) — تسليم: ${due}`;
        })
        .join("؛ ");

      // Fetch active circulars
      const { data: circulars } = await serviceClient
        .from("circulars")
        .select("title, content")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);

      const circularsText = (circulars || [])
        .map((c: any) => `${c.title}: ${(c.content || "").substring(0, 100)}`)
        .join("؛ ");

      const systemPrompt = dailyTipPrompt(
        courseNames || "لا توجد",
        assignmentsText || "لا توجد",
        circularsText || "لا توجد",
        academicLevel || undefined,
        majorName || undefined,
      );
      const config = PROMPT_INFO.daily_tip;

      const model = genAI.getGenerativeModel({
        model: MODEL,
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "اكتب نصيحة اليوم" }] }],
        generationConfig: { temperature: config.temperature, maxOutputTokens: config.maxTokens },
      });

      const tipText = result.response.text().trim();

      if (tipText) {
        await serviceClient.from("student_recommendations").insert({
          tenant_id: profile.tenant_id,
          student_id: profile.id,
          sent_by: null,
          rec_type: "daily_tip",
          title: "نصيحة اليوم 💡",
          body: tipText,
          is_read: false,
        });
      }
    } catch (err) {
      console.error("[DailyTip] Failed:", err);
    }
  }

  const recommendations = await getRecommendations();

  return <RecommendationsClient initialRecommendations={recommendations as any} />;
}
