import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { BookCopy, Users, CalendarClock, GraduationCap } from "lucide-react";

export default async function AcademicManagementDashboard() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data: activeSemester } = await supabase
    .from("semesters")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "active")
    .single();

  const semesterId = activeSemester?.id;

  const [sectionsRes, enrollmentsRes, schedulesRes] = await Promise.all([
    semesterId
      ? supabase.from("sections").select("*", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id).eq("semester_id", semesterId)
      : Promise.resolve({ count: 0 }),
    semesterId
      ? supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id).eq("semester_id", semesterId).eq("status", "enrolled")
      : Promise.resolve({ count: 0 }),
    semesterId
      ? supabase.from("schedules").select("*", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id)
      : Promise.resolve({ count: 0 }),
  ]);

  const stats = [
    { label: "الشعب المفتوحة", value: sectionsRes.count || 0, icon: BookCopy, color: "bg-action-blue/10 text-action-blue" },
    { label: "الطلاب المسجلون", value: enrollmentsRes.count || 0, icon: Users, color: "bg-success/10 text-success" },
    { label: "المحاضرات المجدولة", value: schedulesRes.count || 0, icon: CalendarClock, color: "bg-purple/10 text-purple" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">مرحبا، {profile.first_name}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {activeSemester ? `الفصل الحالي: ${activeSemester.name}` : "لا يوجد فصل دراسي نشط"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold text-text-primary">{stat.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color.split(" ")[0]}`}>
                <stat.icon className={`h-5 w-5 ${stat.color.split(" ")[1]}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {!activeSemester && (
        <div className="mt-6 rounded-2xl border border-dashed border-warning/50 bg-warning/5 p-6 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-warning" />
          <p className="text-sm font-medium text-warning">لا يوجد فصل دراسي نشط — يرجى التواصل مع مدير الجامعة لتفعيل الفصل</p>
        </div>
      )}
    </div>
  );
}
