"use client";

import { useState, useMemo } from "react";
import { KpiCard, ChartCard } from "@/components/analytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Users,
  BookOpen,
  AlertTriangle,
  Building2,
  GraduationCap,
  TrendingUp,
  ShieldAlert,
  Ticket as TicketIcon,
  Clock,
  CheckCircle,
} from "lucide-react";

// ── Types ──
interface DeptStats {
  department_id: string;
  department_name: string;
  department_code: string;
  college_id: string;
  college_name: string;
  major_count: number;
  course_count: number;
  enrolled_students: number;
  faculty_count: number;
  total_sessions: number;
}

interface RiskStudent {
  summary_id: string;
  student_id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  first_name: string;
  last_name: string;
  student_number: string;
  student_major_name?: string;
  student_level_name?: string;
  department_id: string;
  department_name: string;
  total_sessions: number;
  unexcused_absences: number;
  excused_absences: number;
  attended_sessions: number;
  late_count: number;
  absence_percentage: number;
  is_dismissed: boolean;
  dismissed_at: string;
  absence_limit_count: number;
  risk_status: string;
  remaining_absences: number;
}

interface CoursePerformance {
  course_id: string;
  course_code: string;
  course_name: string;
  department_id: string;
  department_name: string;
  enrolled_students: number;
  total_sessions: number;
  total_assignments: number;
  total_submissions: number;
  dismissed_count: number;
  avg_absence_percentage: number;
  avg_unexcused_absences: number;
}

interface RiskScore {
  id: string;
  student_id: string;
  course_id: string;
  semester_id: string;
  risk_level: string;
  risk_score: number | null;
  absence_factor: number | null;
  grade_factor: number | null;
  engagement_factor: number | null;
  computed_at: string;
}

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  related_course_id: string | null;
  is_direct_to_faculty: boolean;
  courses: { name: string; code: string; department_id: string } | null;
  profiles: { first_name: string; last_name: string } | null;
}

interface ReportsData {
  deptStats: DeptStats[];
  riskStudents: RiskStudent[];
  coursePerformance: CoursePerformance[];
  managedDeptCount: number;
  riskScores: RiskScore[];
  tickets: Ticket[];
  ticketsMetrics: { open: number; closed: number; total: number; avgResolutionHours: number };
  ticketsByDeptChart: { name: string; count: number }[];
  priorityCounts: Record<string, number>;
}

const CHART_COLORS = {
  royalBlue: "#00539C",
  peach: "#EEA47F",
  success: "#38A169",
  danger: "#E53E3E",
  purple: "#805AD5",
  teal: "#319795",
  warning: "#D69E2E",
  coral: "#FC8181",
};

const STATUS_COLORS: Record<string, string> = {
  open: CHART_COLORS.royalBlue,
  in_progress: CHART_COLORS.warning,
  pending_info: CHART_COLORS.peach,
  resolved: CHART_COLORS.success,
  closed: CHART_COLORS.teal,
  rejected: CHART_COLORS.danger,
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};

const TABS = [
  { key: "overview", label: "المخاطر والأداء", icon: ShieldAlert },
  { key: "tickets", label: "التذاكر", icon: TicketIcon },
];

export function AcademicManagementReportsClient({ data }: { data: ReportsData }) {
  const { deptStats, riskStudents, coursePerformance, managedDeptCount, riskScores, tickets, ticketsMetrics, ticketsByDeptChart, priorityCounts } = data;
  const [activeTab, setActiveTab] = useState("overview");

  // ── Overview KPIs ──
  const totalStudents = deptStats.reduce((s, d) => s + (d.enrolled_students || 0), 0);
  const totalCourses = deptStats.reduce((s, d) => s + (d.course_count || 0), 0);
  const totalFaculty = deptStats.reduce((s, d) => s + (d.faculty_count || 0), 0);
  const dismissedCount = riskStudents.filter((r) => r.is_dismissed).length;
  const atRiskCount = riskStudents.filter((r) => r.risk_status === "at_risk").length;

  const coursePerfData = coursePerformance
    .filter((c) => c.enrolled_students > 0)
    .sort((a, b) => b.avg_absence_percentage - a.avg_absence_percentage)
    .slice(0, 10)
    .map((c) => ({
      name: c.course_code,
      avgAbsence: c.avg_absence_percentage,
      dismissed: c.dismissed_count,
      students: c.enrolled_students,
    }));

  const riskDistribution = [
    { name: "آمن", value: riskStudents.filter((r) => r.risk_status === "safe").length, color: CHART_COLORS.success },
    { name: "منطقة خطر", value: atRiskCount, color: CHART_COLORS.warning },
    { name: "محروم", value: dismissedCount, color: CHART_COLORS.danger },
  ].filter((d) => d.value > 0);

  const deptChartData = deptStats
    .filter((d) => d.enrolled_students > 0)
    .map((d) => ({ name: d.department_name, students: d.enrolled_students, faculty: d.faculty_count, courses: d.course_count }));

  const topRiskStudents = riskStudents
    .filter((r) => r.risk_status !== "safe")
    .sort((a, b) => b.unexcused_absences - a.unexcused_absences)
    .slice(0, 20);

  // ── Build risk score lookup: student_id + course_id -> score ──
  const riskScoreMap = useMemo(() => {
    const map = new Map<string, RiskScore>();
    for (const rs of riskScores) {
      map.set(`${rs.student_id}_${rs.course_id}`, rs);
    }
    return map;
  }, [riskScores]);

  // ── Tickets tab data ──
  const priorityChartData = Object.entries(priorityCounts)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      name: PRIORITY_LABELS[key] || key,
      count,
    }));

  const statusDistData = [
    { name: "مفتوحة", value: tickets.filter((t) => t.status === "open").length, color: CHART_COLORS.royalBlue },
    { name: "قيد المعالجة", value: tickets.filter((t) => t.status === "in_progress").length, color: CHART_COLORS.warning },
    { name: "بانتظار المعلومات", value: tickets.filter((t) => t.status === "pending_info").length, color: CHART_COLORS.peach },
    { name: "تم الحل", value: tickets.filter((t) => t.status === "resolved").length, color: CHART_COLORS.success },
    { name: "مغلقة", value: tickets.filter((t) => t.status === "closed").length, color: CHART_COLORS.teal },
    { name: "مرفوضة", value: tickets.filter((t) => t.status === "rejected").length, color: CHART_COLORS.danger },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-2xl border border-border bg-card-bg p-1.5 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-action-blue text-white shadow-sm"
                : "text-text-secondary hover:bg-app-bg hover:text-text-primary"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════  TAB: OVERVIEW (Risk & Performance)  ════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="الطلاب المسجلون" value={totalStudents} icon={GraduationCap} iconColor="bg-academic-navy/10 text-academic-navy" trend={{ value: `${managedDeptCount > 0 ? managedDeptCount : deptStats.length} قسم`, direction: "neutral" }} />
            <KpiCard title="المقررات" value={totalCourses} icon={BookOpen} iconColor="bg-success/10 text-success" trend={{ value: `${totalFaculty} عضو تدريس`, direction: "neutral" }} />
            <KpiCard
              title={atRiskCount > 0 ? "منطقة الخطر" : "المحرومون"}
              value={atRiskCount > 0 ? atRiskCount : dismissedCount}
              icon={atRiskCount > 0 ? TrendingUp : ShieldAlert}
              iconColor={atRiskCount > 0 ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"}
              trend={dismissedCount > 0 ? { value: `${dismissedCount} محروم`, direction: "down", label: "نهائياً" } : undefined}
            />
            <KpiCard
              title="متوسط الغياب"
              value={coursePerformance.length > 0 ? `${(coursePerformance.reduce((s, c) => s + (c.avg_absence_percentage || 0), 0) / coursePerformance.length).toFixed(1)}%` : "0%"}
              icon={AlertTriangle}
              iconColor="bg-purple/10 text-purple"
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="الطلاب حسب القسم" subtitle="توزيع الطلاب على الأقسام">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deptChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--color-card-bg)", borderColor: "var(--color-border)", borderRadius: "12px", color: "var(--color-text-primary)" }} />
                  <Bar dataKey="students" name="الطلاب" fill={CHART_COLORS.royalBlue} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="متوسط الغياب حسب المقرر" subtitle="أعلى 10 مقررات من حيث نسبة الغياب">
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={coursePerfData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis yAxisId="left" tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--color-card-bg)", borderColor: "var(--color-border)", borderRadius: "12px", color: "var(--color-text-primary)" }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="avgAbsence" name="نسبة الغياب %" fill={CHART_COLORS.peach} radius={[6, 6, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="dismissed" name="المحرومون" stroke={CHART_COLORS.danger} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Risk Distribution */}
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="توزيع المخاطر" subtitle="حالة الطلاب الأكاديمية">
              {riskDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" stroke="var(--color-card-bg)" strokeWidth={2}>
                      {riskDistribution.map((_entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={[CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger][idx]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "var(--color-card-bg)", borderColor: "var(--color-border)", borderRadius: "12px", color: "var(--color-text-primary)" }} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ color: "var(--color-text-secondary)", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[180px] items-center justify-center"><p className="text-text-secondary">لا توجد بيانات مخاطر</p></div>
              )}
            </ChartCard>
            <ChartCard title="نبذة سريعة" className="lg:col-span-2">
              <div className="grid h-[180px] grid-cols-3 gap-4">
                {[
                  { label: "الأقسام", value: deptStats.length, color: "bg-academic-navy/10 text-academic-navy", icon: Building2 },
                  { label: "المقررات", value: totalCourses, color: "bg-success/10 text-success", icon: BookOpen },
                  { label: "أعضاء التدريس", value: totalFaculty, color: "bg-peach/10 text-action-blue", icon: Users },
                  { label: "الطلاب", value: totalStudents, color: "bg-purple/10 text-purple", icon: GraduationCap },
                  { label: "محروم", value: dismissedCount, color: dismissedCount > 0 ? "bg-danger/10 text-danger" : "bg-success/10 text-success", icon: ShieldAlert },
                  { label: "في الخطر", value: atRiskCount, color: atRiskCount > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success", icon: TrendingUp },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center justify-center rounded-xl border border-border bg-app-bg/50 p-2">
                    <div className={`mb-1 flex h-8 w-8 items-center justify-center rounded-lg ${s.color}`}><s.icon className="h-4 w-4" /></div>
                    <p className="text-lg font-bold text-text-primary">{s.value}</p>
                    <p className="text-[11px] text-text-secondary">{s.label}</p>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Students at Risk Table — Enhanced with AI Risk Score */}
          <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary">
                {dismissedCount > 0 || atRiskCount > 0 ? "الطلاب المعرضون للخطر والمحرومون" : "الطلاب"}
              </h2>
              <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
                {dismissedCount + atRiskCount} طالب
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="pb-3 pl-4 font-medium">الطالب</th>
                    <th className="pb-3 pl-4 font-medium">الرقم</th>
                    <th className="pb-3 pl-4 font-medium">التخصص</th>
                    <th className="pb-3 pl-4 font-medium">المستوى</th>
                    <th className="pb-3 pl-4 font-medium">المقرر</th>
                    <th className="pb-3 pl-4 font-medium">القسم</th>
                    <th className="pb-3 pl-4 font-medium">غيابات</th>
                    <th className="pb-3 pl-4 font-medium">الحد</th>
                    <th className="pb-3 pl-4 font-medium">المتبقي</th>
                    <th className="pb-3 pl-4 font-medium">درجة AI</th>
                    <th className="pb-3 font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {topRiskStudents.map((r) => {
                    const rs = riskScoreMap.get(`${r.student_id}_${r.course_id}`);
                    const scoreColor =
                      rs?.risk_level === "critical"
                        ? "text-danger font-bold"
                        : rs?.risk_level === "high"
                          ? "text-danger"
                          : rs?.risk_level === "medium"
                            ? "text-warning"
                            : "text-text-secondary";

                    return (
                      <tr key={r.summary_id} className="border-b border-border/50 transition-colors hover:bg-app-bg/50">
                        <td className="py-3 pl-4 font-medium text-text-primary">{r.first_name} {r.last_name}</td>
                        <td className="py-3 pl-4 text-text-secondary">{r.student_number || "—"}</td>
                        <td className="py-3 pl-4 text-text-primary">{r.student_major_name || "—"}</td>
                        <td className="py-3 pl-4 text-text-primary">{r.student_level_name || "—"}</td>
                        <td className="py-3 pl-4 text-text-primary">{r.course_name}</td>
                        <td className="py-3 pl-4 text-text-secondary">{r.department_name}</td>
                        <td className="py-3 pl-4">
                          <span className={r.unexcused_absences >= r.absence_limit_count ? "text-danger font-medium" : "text-warning"}>{r.unexcused_absences}</span>
                        </td>
                        <td className="py-3 pl-4 text-text-primary">{r.absence_limit_count}</td>
                        <td className="py-3 pl-4">
                          <span className={r.remaining_absences <= 1 ? "text-danger font-medium" : "text-text-primary"}>{r.remaining_absences}</span>
                        </td>
                        <td className="py-3 pl-4">
                          {rs ? (
                            <span className={scoreColor}>{rs.risk_score?.toFixed(1) ?? "—"}</span>
                          ) : (
                            <span className="text-text-secondary">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          {r.is_dismissed ? (
                            <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">محروم</span>
                          ) : r.risk_status === "at_risk" ? (
                            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">خطر</span>
                          ) : (
                            <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">آمن</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(dismissedCount + atRiskCount) === 0 && (
                    <tr><td colSpan={11} className="py-8 text-center text-text-secondary">لا يوجد طلاب في منطقة الخطر</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════  TAB: TICKETS  ════════════════════════════════ */}
      {activeTab === "tickets" && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="إجمالي التذاكر" value={ticketsMetrics.total} icon={TicketIcon} iconColor="bg-academic-navy/10 text-academic-navy" />
            <KpiCard title="مفتوحة" value={ticketsMetrics.open} icon={TicketIcon} iconColor={ticketsMetrics.open > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"} trend={{ value: `${ticketsMetrics.closed} مغلقة`, direction: ticketsMetrics.closed > ticketsMetrics.open ? "up" : "neutral" }} />
            <KpiCard title="متوسط وقت الحل" value={`${ticketsMetrics.avgResolutionHours.toFixed(1)} ساعة`} icon={Clock} iconColor="bg-purple/10 text-purple" />
            <KpiCard title="تم الحل" value={ticketsMetrics.closed} icon={CheckCircle} iconColor="bg-success/10 text-success" />
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="حالة التذاكر" subtitle="توزيع التذاكر حسب الحالة">
              {statusDistData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="var(--color-card-bg)" strokeWidth={2}>
                      {statusDistData.map((_e, idx) => (
                        <Cell key={idx} fill={Object.values(STATUS_COLORS)[idx % Object.keys(STATUS_COLORS).length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "var(--color-card-bg)", borderColor: "var(--color-border)", borderRadius: "12px", color: "var(--color-text-primary)" }} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ color: "var(--color-text-secondary)", fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[200px] items-center justify-center"><p className="text-text-secondary">لا توجد تذاكر</p></div>
              )}
            </ChartCard>

            <ChartCard title="التذاكر حسب الأولوية" subtitle="توزيع التذاكر حسب درجة الأهمية">
              {priorityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={priorityChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                    <YAxis tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--color-card-bg)", borderColor: "var(--color-border)", borderRadius: "12px", color: "var(--color-text-primary)" }} />
                    <Bar dataKey="count" name="عدد التذاكر" radius={[6, 6, 0, 0]}>
                      {priorityChartData.map((_e, idx) => (
                        <Cell key={idx} fill={[CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger, CHART_COLORS.coral][idx]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[200px] items-center justify-center"><p className="text-text-secondary">لا توجد تذاكر</p></div>
              )}
            </ChartCard>
          </div>

          {/* Tickets by Department / Course */}
          {ticketsByDeptChart.length > 0 && (
            <ChartCard title="التذاكر حسب المقرر" subtitle="أكثر المقررات التي بها تذاكر">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={ticketsByDeptChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--color-card-bg)", borderColor: "var(--color-border)", borderRadius: "12px", color: "var(--color-text-primary)" }} />
                  <Bar dataKey="count" name="التذاكر" fill={CHART_COLORS.royalBlue} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Tickets Table */}
          <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-text-primary">قائمة التذاكر</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="pb-3 pl-4 font-medium">رقم التذكرة</th>
                    <th className="pb-3 pl-4 font-medium">العنوان</th>
                    <th className="pb-3 pl-4 font-medium">مقدمها</th>
                    <th className="pb-3 pl-4 font-medium">المقرر</th>
                    <th className="pb-3 pl-4 font-medium">الأولوية</th>
                    <th className="pb-3 pl-4 font-medium">الحالة</th>
                    <th className="pb-3 font-medium">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 50).map((t) => {
                    const priorityColor: Record<string, string> = {
                      urgent: "bg-danger/10 text-danger",
                      high: "bg-warning/10 text-warning",
                      medium: "bg-academic-navy/10 text-academic-navy",
                      low: "bg-success/10 text-success",
                    };
                    const statusColor: Record<string, string> = {
                      open: "bg-academic-navy/10 text-academic-navy",
                      in_progress: "bg-warning/10 text-warning",
                      pending_info: "bg-peach/10 text-action-blue",
                      resolved: "bg-success/10 text-success",
                      closed: "bg-teal/10 text-teal",
                      rejected: "bg-danger/10 text-danger",
                    };
                    const statusLabel: Record<string, string> = {
                      open: "مفتوحة",
                      in_progress: "قيد المعالجة",
                      pending_info: "بانتظار المعلومات",
                      resolved: "تم الحل",
                      closed: "مغلقة",
                      rejected: "مرفوضة",
                    };

                    return (
                      <tr key={t.id} className="border-b border-border/50 transition-colors hover:bg-app-bg/50">
                        <td className="py-3 pl-4 font-mono text-xs text-text-secondary">{t.ticket_number}</td>
                        <td className="py-3 pl-4 font-medium text-text-primary">{t.title}</td>
                        <td className="py-3 pl-4 text-text-primary">
                          {t.profiles ? `${t.profiles.first_name} ${t.profiles.last_name}` : "—"}
                        </td>
                        <td className="py-3 pl-4 text-text-secondary">
                          {t.courses ? `${t.courses.code} — ${t.courses.name}` : "—"}
                        </td>
                        <td className="py-3 pl-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor[t.priority] || "bg-app-bg text-text-secondary"}`}>
                            {PRIORITY_LABELS[t.priority] || t.priority}
                          </span>
                        </td>
                        <td className="py-3 pl-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[t.status] || "bg-app-bg text-text-secondary"}`}>
                            {statusLabel[t.status] || t.status}
                          </span>
                        </td>
                        <td className="py-3 text-text-secondary">
                          {new Date(t.created_at).toLocaleDateString("ar-SA")}
                        </td>
                      </tr>
                    );
                  })}
                  {tickets.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-text-secondary">لا توجد تذاكر</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {tickets.length > 50 && (
              <p className="mt-3 text-center text-xs text-text-secondary">يتم عرض أول 50 تذكرة فقط</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
