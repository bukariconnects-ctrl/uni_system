import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { AcademicManagementReportsClient } from "./reports-client";

export default async function AcademicManagementReportsPage() {
  const { profile } = await requireRole(["academic_management"]);
  const serviceClient = createServiceClient();
  const tenantId = profile.tenant_id!;

  // Get the departments this academic manager oversees
  const { data: managedDepts } = await serviceClient
    .from("academic_management_departments")
    .select("department_id")
    .eq("profile_id", profile.id);

  const deptIds = (managedDepts || []).map((d: any) => d.department_id);

  // Fetch department stats — filter by managed departments
  const { data: deptStats } = await serviceClient
    .from("v_academic_dept_stats")
    .select("*")
    .eq("tenant_id", tenantId);

  const filteredDeptStats = deptIds.length > 0
    ? (deptStats || []).filter((d: any) => deptIds.includes(d.department_id))
    : (deptStats || []);

  // Risk students — filter by managed departments
  const { data: riskStudents } = await serviceClient
    .from("v_academic_risk_students")
    .select("*")
    .eq("tenant_id", tenantId);

  const filteredRiskStudents = deptIds.length > 0
    ? (riskStudents || []).filter((r: any) => deptIds.includes(r.department_id))
    : (riskStudents || []);

  // Course performance — filter by managed departments
  const { data: coursePerformance } = await serviceClient
    .from("v_academic_course_performance")
    .select("*")
    .eq("tenant_id", tenantId);

  const filteredCoursePerformance = deptIds.length > 0
    ? (coursePerformance || []).filter((c: any) => deptIds.includes(c.department_id))
    : (coursePerformance || []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التقارير الأكاديمية</h1>
        <p className="mt-1 text-sm text-text-secondary">
          متابعة أداء الأقسام والطلاب والمقررات
        </p>
      </div>

      <AcademicManagementReportsClient
        data={{
          deptStats: filteredDeptStats,
          riskStudents: filteredRiskStudents,
          coursePerformance: filteredCoursePerformance,
          managedDeptCount: deptIds.length,
        }}
      />
    </div>
  );
}
