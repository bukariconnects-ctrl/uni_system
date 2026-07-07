import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { getStorageUsageGb } from "@/lib/storage-usage";
import { TenantAdminReportsClient } from "./reports-client";

export default async function TenantAdminReportsPage() {
  const { profile } = await requireRole(["tenant_admin"]);
  const serviceClient = createServiceClient();
  const tenantId = profile.tenant_id!;

  const [{ data: userStats }, { data: collegeStats }, { data: courseOverview }, { data: attendanceSummary }, storageUsage] = await Promise.all([
    serviceClient.from("v_tenant_user_stats").select("*").eq("tenant_id", tenantId).maybeSingle(),
    serviceClient.from("v_tenant_college_stats").select("*").eq("tenant_id", tenantId),
    serviceClient.from("v_tenant_course_overview").select("*").eq("tenant_id", tenantId).order("course_name"),
    serviceClient.from("v_tenant_attendance_summary").select("*").eq("tenant_id", tenantId),
    getStorageUsageGb(tenantId),
  ]);

  // Real storage for this tenant — convert from GB to MB
  const realStorageMb = storageUsage.length > 0 ? storageUsage[0].storage_gb * 1024 : 0;

  // Tenant info for additional context
  const { data: tenant } = await serviceClient
    .from("tenants")
    .select("name, storage_used_gb, max_storage_gb, max_users, absence_limit_count, status")
    .eq("id", tenantId)
    .single();

  // ── Venues Utilization ──
  const ASSUMED_WEEKLY_HOURS = 60; // 5 days × 12 hours (08:00–20:00)

  const { data: venues } = await serviceClient
    .from("venues")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name");

  const { data: activeSemester } = await serviceClient
    .from("semesters")
    .select("id, name, academic_year")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle();

  let schedules: any[] = [];
  if (activeSemester) {
    const { data: schedData } = await serviceClient
      .from("course_schedules")
      .select("venue_id, start_time, end_time, day_of_week, status")
      .eq("tenant_id", tenantId)
      .eq("semester_id", activeSemester.id)
      .not("venue_id", "is", null)
      .eq("status", "published");

    schedules = schedData || [];
  }

  const venueUtilization = (venues || []).map((v: any) => {
    const venueScheds = schedules.filter((s: any) => s.venue_id === v.id);
    let totalHours = 0;
    for (const s of venueScheds) {
      const sh = parseInt(s.start_time?.split(":")[0] || "0", 10);
      const sm = parseInt(s.start_time?.split(":")[1] || "0", 10);
      const eh = parseInt(s.end_time?.split(":")[0] || "0", 10);
      const em = parseInt(s.end_time?.split(":")[1] || "0", 10);
      totalHours += Math.max(0, eh + em / 60 - (sh + sm / 60));
    }
    return {
      id: v.id,
      name: v.name,
      code: v.code,
      building: v.building || "—",
      floor: v.floor || "—",
      venue_type: v.venue_type || "other",
      capacity: v.capacity || 0,
      has_projector: v.has_projector || false,
      has_ac: v.has_ac || false,
      hours_booked: Math.round(totalHours * 10) / 10,
      utilization_pct:
        totalHours > 0
          ? Math.min(Math.round((totalHours / ASSUMED_WEEKLY_HOURS) * 1000) / 10, 100)
          : 0,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التقارير والإحصائيات</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {tenant?.name || "جامعة"} — إحصائيات شاملة
        </p>
      </div>

      <TenantAdminReportsClient
        data={{
          userStats,
          collegeStats: collegeStats || [],
          courseOverview: courseOverview || [],
          attendanceSummary: attendanceSummary || [],
          tenant: tenant
            ? { ...tenant, storage_used_gb: realStorageMb, max_storage_gb: (tenant.max_storage_gb || 0) * 1024 }
            : null,
          venueUtilization,
          activeSemester: activeSemester
            ? { name: activeSemester.name, academic_year: activeSemester.academic_year }
            : null,
        }}
      />
    </div>
  );
}
