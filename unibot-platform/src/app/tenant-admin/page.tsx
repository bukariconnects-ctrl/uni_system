import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { Users, BookOpen, CalendarDays, GraduationCap } from "lucide-react";

export default async function TenantAdminDashboard() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", profile.tenant_id)
    .single();

  const { count: profilesCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", profile.tenant_id);

  const { count: studentsCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", profile.tenant_id)
    .eq("role", "student");

  const { count: facultyCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", profile.tenant_id)
    .eq("role", "faculty");

  const { data: activeSemester } = await supabase
    .from("semesters")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "active")
    .single();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          مرحباً، {profile.first_name}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {tenant?.name || "لوحة تحكم مدير الجامعة"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">إجمالي المستخدمين</p>
              <p className="mt-1 text-3xl font-bold text-text-primary">
                {profilesCount || 0}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-action-blue/10">
              <Users className="h-5 w-5 text-action-blue" />
            </div>
          </div>
          {tenant && (
            <p className="mt-2 text-xs text-text-secondary">
              من أصل {tenant.max_users.toLocaleString()} مستخدم
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">الطلاب</p>
              <p className="mt-1 text-3xl font-bold text-text-primary">
                {studentsCount || 0}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
              <GraduationCap className="h-5 w-5 text-success" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">أعضاء هيئة التدريس</p>
              <p className="mt-1 text-3xl font-bold text-text-primary">
                {facultyCount || 0}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
              <BookOpen className="h-5 w-5 text-purple" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">الفصل الحالي</p>
              <p className="mt-1 text-lg font-bold text-text-primary">
                {activeSemester?.name || "لا يوجد فصل نشط"}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
              <CalendarDays className="h-5 w-5 text-teal" />
            </div>
          </div>
          {activeSemester && (
            <p className="mt-2 text-xs text-text-secondary">
              {new Date(activeSemester.start_date).toLocaleDateString("ar-SA")} —{" "}
              {new Date(activeSemester.end_date).toLocaleDateString("ar-SA")}
            </p>
          )}
        </div>
      </div>

      {tenant && (
        <div className="mt-6 rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-text-primary">معلومات الجامعة</h2>
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-text-secondary">النطاق</p>
              <p className="font-medium text-text-primary" dir="ltr">
                {tenant.subdomain}.unibot.app
              </p>
            </div>
            <div>
              <p className="text-text-secondary">التخزين المستخدم</p>
              <p className="font-medium text-text-primary">
                {tenant.storage_used_gb} / {tenant.max_storage_gb} GB
              </p>
            </div>
            <div>
              <p className="text-text-secondary">نسبة الحرمان</p>
              <p className="font-medium text-text-primary">
                {tenant.absence_threshold}%
              </p>
            </div>
            <div>
              <p className="text-text-secondary">المنطقة الزمنية</p>
              <p className="font-medium text-text-primary">{tenant.timezone}</p>
            </div>
            <div>
              <p className="text-text-secondary">اللغة الافتراضية</p>
              <p className="font-medium text-text-primary">
                {tenant.default_language === "ar" ? "العربية" : tenant.default_language}
              </p>
            </div>
            <div>
              <p className="text-text-secondary">الحالة</p>
              <span className="inline-flex rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                {tenant.status === "active" ? "نشطة" : tenant.status}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
