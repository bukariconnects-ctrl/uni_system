import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, FileText, ClipboardCheck, GraduationCap } from "lucide-react";

export default async function StudentDashboard() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const [enrollmentsRes, profileRes] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id, status, sections(section_code, courses(code, name), semesters(name, status))")
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

  const progressPct = studentProfile && studentProfile.total_credit_hours > 0
    ? Math.round((studentProfile.earned_credit_hours / studentProfile.total_credit_hours) * 100)
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">مرحباً، {profile.first_name}</h1>
        <p className="mt-1 text-sm text-text-secondary">بوابة الطالب</p>
      </div>

      {studentProfile && (
        <div className="mb-6 rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-text-primary">مسيرتي الأكاديمية</h2>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-text-secondary">التقدم نحو التخرج</span>
            <span className="font-bold text-action-blue">{progressPct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-app-bg">
            <div
              className="h-full rounded-full bg-action-blue transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
            <span>{studentProfile.earned_credit_hours} ساعة مكتسبة</span>
            <span>{studentProfile.total_credit_hours} ساعة إجمالية</span>
          </div>
          <div className="mt-3 flex gap-4">
            <div className="rounded-xl bg-app-bg px-4 py-2 text-center">
              <p className="text-lg font-bold text-text-primary">{studentProfile.cumulative_gpa?.toFixed(2) || "0.00"}</p>
              <p className="text-xs text-text-secondary">المعدل التراكمي</p>
            </div>
            <div className="rounded-xl bg-app-bg px-4 py-2 text-center">
              <p className="text-lg font-bold text-text-primary">{enrollments.length}</p>
              <p className="text-xs text-text-secondary">مقررات حالية</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-text-primary">مقرراتي الحالية</h2>
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
                    <span className="font-bold text-text-primary">
                      {enrollment.sections?.courses?.code} — {enrollment.sections?.courses?.name}
                    </span>
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
