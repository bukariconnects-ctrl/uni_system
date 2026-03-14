import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, TrendingUp, Calendar, Award } from "lucide-react";

const DAYS: Record<string, string> = {
  sunday: "الأحد",
  monday: "الإثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
};

export default async function StudentDashboard() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const [enrollmentsRes, profileRes] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id, status, sections(id, section_code, courses(code, name), semesters(name, status))")
      .eq("student_id", profile.id)
      .eq("status", "enrolled")
      .order("created_at", { ascending: false }),
    supabase
      .from("student_profiles")
      .select("*")
      .eq("profile_id", profile.id)
      .single(),
  ]);

  const enrollments = enrollmentsRes.data || [];
  const studentProfile = profileRes.data;

  const sectionIds = enrollments.map((e: any) => e.sections?.id).filter(Boolean);
  const schedulesRes = sectionIds.length > 0
    ? await supabase
        .from("schedules")
        .select("id, day_of_week, start_time, end_time, sections(section_code, courses(code, name))")
        .in("section_id", sectionIds)
        .eq("status", "published")
        .order("start_time")
    : { data: [] };

  const schedules: any[] = schedulesRes.data || [];

  const progressPct = studentProfile && studentProfile.total_credit_hours > 0
    ? Math.round((studentProfile.earned_credit_hours / studentProfile.total_credit_hours) * 100)
    : 0;

  const gpa: number = studentProfile?.cumulative_gpa ?? 0;
  const gpaColor = gpa >= 3.5 ? "text-success" : gpa >= 2.5 ? "text-action-blue" : gpa >= 2.0 ? "text-warning" : "text-danger";
  const gpaBg = gpa >= 3.5 ? "bg-success/10 border-success/30" : gpa >= 2.5 ? "bg-action-blue/10 border-action-blue/30" : gpa >= 2.0 ? "bg-warning/10 border-warning/30" : "bg-danger/10 border-danger/30";
  const gpaLabel = gpa >= 3.5 ? "ممتاز" : gpa >= 2.5 ? "جيد جداً" : gpa >= 2.0 ? "جيد" : "ضعيف";

  const scheduleByDay: Record<string, typeof schedules> = {};
  Object.keys(DAYS).forEach((d) => { scheduleByDay[d] = []; });
  schedules.forEach((s) => { if (scheduleByDay[s.day_of_week]) scheduleByDay[s.day_of_week].push(s); });
  const activeDays = Object.keys(DAYS).filter((d) => scheduleByDay[d].length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">مرحباً، {profile.first_name} 👋</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {studentProfile && (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card-bg via-ai-light/20 to-ai-lavender/20 p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-action-blue" />
                <h2 className="text-base font-bold text-text-primary">مساري الدراسي</h2>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">التقدم نحو التخرج</p>
            </div>
            <div className={`rounded-xl border px-4 py-2.5 text-center ${gpaBg}`}>
              <p className={`text-2xl font-bold tabular-nums ${gpaColor}`}>{gpa.toFixed(2)}</p>
              <p className="text-[10px] text-text-secondary">المعدل التراكمي</p>
              <p className={`text-[10px] font-bold ${gpaColor}`}>{gpaLabel}</p>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-text-secondary">{studentProfile.earned_credit_hours} ساعة مكتسبة</span>
            <span className="text-lg font-bold text-action-blue">{progressPct}%</span>
            <span className="text-text-secondary">{studentProfile.total_credit_hours} ساعة إجمالية</span>
          </div>

          <div className="relative h-5 w-full overflow-hidden rounded-full bg-app-bg shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-action-blue via-purple to-ai-lavender transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
            {[25, 50, 75].map((m) => (
              <div key={m} className="absolute top-0 h-full w-px bg-white/50" style={{ left: `${m}%` }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-text-secondary/50">
            <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-white/50 px-3 py-1.5 text-xs backdrop-blur-sm">
              <BookOpen className="h-3.5 w-3.5 text-action-blue" />
              <span className="font-bold text-text-primary">{enrollments.length}</span>
              <span className="text-text-secondary">مقررات حالية</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-white/50 px-3 py-1.5 text-xs backdrop-blur-sm">
              <Award className="h-3.5 w-3.5 text-purple" />
              <span className="font-bold text-text-primary">{studentProfile.earned_credit_hours}</span>
              <span className="text-text-secondary">ساعة معتمدة</span>
            </div>
          </div>
        </div>
      )}

      {activeDays.length > 0 && (
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-action-blue" />
            <h2 className="text-base font-bold text-text-primary">جدولي الأسبوعي</h2>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {activeDays.map((day) => (
              <div key={day} className="rounded-xl border border-border bg-app-bg/50 p-3">
                <p className="mb-2 text-center text-xs font-bold text-text-secondary">{DAYS[day]}</p>
                <div className="space-y-1.5">
                  {scheduleByDay[day].map((s: any) => (
                    <div key={s.id} className="rounded-lg bg-action-blue/10 px-2.5 py-2">
                      <p className="text-xs font-bold text-action-blue line-clamp-1">{s.sections?.courses?.code}</p>
                      <p className="text-[10px] text-text-secondary line-clamp-1">{s.sections?.courses?.name}</p>
                      <p className="mt-0.5 text-[10px] font-medium text-text-secondary/70" dir="ltr">
                        {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-text-primary">مقرراتي الحالية</h2>
        {enrollments.length === 0 ? (
          <p className="text-sm text-text-secondary">لا توجد مقررات مسجلة حالياً</p>
        ) : (
          <div className="space-y-2">
            {enrollments.map((enrollment: any) => (
              <div key={enrollment.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-blue/10">
                    <BookOpen className="h-5 w-5 text-action-blue" />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary">
                      {enrollment.sections?.courses?.code} — {enrollment.sections?.courses?.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span>الشعبة: {enrollment.sections?.section_code}</span>
                      <span>•</span>
                      <span>{enrollment.sections?.semesters?.name}</span>
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">مسجل</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
