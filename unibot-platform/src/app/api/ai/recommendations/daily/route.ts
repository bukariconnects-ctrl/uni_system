import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { dailyTipPrompt, PROMPT_INFO } from "@/lib/ai/recommendation-prompts";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = "gemini-2.5-flash";

export async function POST(_request: NextRequest) {
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

    const serviceClient = createServiceClient();
    const tenantId = profile.tenant_id!;

    // Check if a daily tip already exists for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: existingTip } = await serviceClient
      .from("student_recommendations")
      .select("id")
      .eq("student_id", profile.id)
      .eq("rec_type", "daily_tip")
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString())
      .limit(1);

    if (existingTip && existingTip.length > 0) {
      return NextResponse.json({
        message: "نصيحة اليوم موجودة مسبقاً",
        existing: true,
      });
    }

    // Gather context: enrolled courses
    const { data: enrollments } = await serviceClient
      .from("enrollments")
      .select("courses!inner(code, name)")
      .eq("student_id", profile.id)
      .eq("tenant_id", tenantId)
      .eq("status", "enrolled");

    const courseNames = (enrollments || [])
      .map((e: any) => {
        const c = Array.isArray(e.courses) ? e.courses[0] : e.courses;
        return c ? `${c.name} (${c.code})` : "";
      })
      .filter(Boolean)
      .join("، ");

    // Gather context: upcoming assignments
    const { data: upcomingAssignments } = await serviceClient
      .from("assignments")
      .select("title, due_date, courses!inner(name)")
      .eq("tenant_id", tenantId)
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
        const due = new Date(a.due_date).toLocaleDateString("ar-SA");
        return `${a.title} (${courseName}) — تسليم: ${due}`;
      })
      .join("؛ ");

    // Gather context: active circulars
    const { data: circulars } = await serviceClient
      .from("circulars")
      .select("title, content")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(3);

    const circularsText = (circulars || [])
      .map((c: any) => `${c.title}: ${(c.content || "").substring(0, 100)}`)
      .join("؛ ");

    // Generate the tip
    const systemPrompt = dailyTipPrompt(courseNames || "لا توجد", assignmentsText || "لا توجد", circularsText || "لا توجد");
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

    if (!tipText) {
      return NextResponse.json({ error: "فشل توليد النصيحة" }, { status: 500 });
    }

    // Save to DB
    const { data: recommendation, error } = await serviceClient
      .from("student_recommendations")
      .insert({
        tenant_id: tenantId,
        student_id: profile.id,
        sent_by: null,
        rec_type: "daily_tip",
        title: "نصيحة اليوم 💡",
        body: tipText,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, recommendation });
  } catch (error) {
    console.error("[DailyTip API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطأ غير متوقع" },
      { status: 500 },
    );
  }
}
