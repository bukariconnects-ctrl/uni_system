import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { AcademicManagementReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

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

  // ── Existing data ──
  const [{ data: deptStats }, { data: riskStudents }, { data: coursePerformance }] = await Promise.all([
    serviceClient.from("v_academic_dept_stats").select("*").eq("tenant_id", tenantId),
    serviceClient.from("v_academic_risk_students").select("*").eq("tenant_id", tenantId),
    serviceClient.from("v_academic_course_performance").select("*").eq("tenant_id", tenantId),
  ]);

  const filteredDeptStats = deptIds.length > 0
    ? (deptStats || []).filter((d: any) => deptIds.includes(d.department_id))
    : (deptStats || []);

  const filteredRiskStudents = deptIds.length > 0
    ? (riskStudents || []).filter((r: any) => deptIds.includes(r.department_id))
    : (riskStudents || []);

  const filteredCoursePerformance = deptIds.length > 0
    ? (coursePerformance || []).filter((c: any) => deptIds.includes(c.department_id))
    : (coursePerformance || []);

  // ── AI Risk Scores (for enhanced risk tab) ──
  // Get course IDs for managed departments to scope risk scores
  const managedCourseIds = deptIds.length > 0
    ? [...new Set((filteredCoursePerformance || []).map((c: any) => c.course_id).filter(Boolean))]
    : [];

  let riskScores: any[] = [];
  if (managedCourseIds.length > 0) {
    const { data: scores } = await serviceClient
      .from("student_risk_scores")
      .select("*")
      .in("course_id", managedCourseIds)
      .eq("tenant_id", tenantId);

    riskScores = scores || [];
  } else if (deptIds.length === 0) {
    // If no department filter, get all tenant risk scores
    const { data: scores } = await serviceClient
      .from("student_risk_scores")
      .select("*")
      .eq("tenant_id", tenantId);

    riskScores = scores || [];
  }

  // ── Tickets data ──
  // Get all tickets that relate to courses in managed departments
  const { data: allTickets } = await serviceClient
    .from("tickets")
    .select("*, courses!related_course_id(name, code, department_id), profiles!created_by(first_name, last_name)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  // Filter tickets by managed departments
  const tickets = ((allTickets || []) as any[]).filter((t: any) => {
    if (deptIds.length === 0) return true;
    // If ticket has a related course, check its department
    if (t.related_course_id && t.courses?.department_id) {
      return deptIds.includes(t.courses.department_id);
    }
    // Include tickets without course reference (general tickets)
    return true;
  });

  // Compute ticket metrics
  const openTickets = tickets.filter((t) =>
    ["open", "in_progress", "pending_info"].includes(t.status)
  ).length;
  const closedTickets = tickets.filter((t) =>
    ["closed", "resolved", "rejected"].includes(t.status)
  ).length;

  // Avg resolution time (hours) for resolved tickets
  const resolvedTickets = tickets.filter(
    (t) => t.status === "resolved" && t.resolved_at && t.created_at
  );
  const avgResolutionHours =
    resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum: number, t: any) => {
          const diff =
            new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime();
          return sum + diff / (1000 * 60 * 60);
        }, 0) / resolvedTickets.length
      : 0;

  // Tickets by department (for chart)
  const ticketsByDept: Record<string, number> = {};
  for (const t of tickets) {
    const deptName = t.courses?.name || "عام";
    ticketsByDept[deptName] = (ticketsByDept[deptName] || 0) + 1;
  }

  const ticketsByDeptChart = Object.entries(ticketsByDept)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Tickets by priority
  const priorityCounts: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
  for (const t of tickets) {
    if (priorityCounts[t.priority] != null) priorityCounts[t.priority]++;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التقارير الأكاديمية</h1>
        <p className="mt-1 text-sm text-text-secondary">
          متابعة أداء الأقسام والطلاب والمقررات والتذاكر
        </p>
      </div>

      <AcademicManagementReportsClient
        data={{
          deptStats: filteredDeptStats,
          riskStudents: filteredRiskStudents,
          coursePerformance: filteredCoursePerformance,
          managedDeptCount: deptIds.length,
          riskScores,
          tickets,
          ticketsMetrics: {
            open: openTickets,
            closed: closedTickets,
            total: tickets.length,
            avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
          },
          ticketsByDeptChart,
          priorityCounts,
        }}
      />
    </div>
  );
}
