"use client";

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
} from "lucide-react";

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

interface ReportsData {
  deptStats: DeptStats[];
  riskStudents: RiskStudent[];
  coursePerformance: CoursePerformance[];
  managedDeptCount: number;
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

export function AcademicManagementReportsClient({ data }: { data: ReportsData }) {
  const { deptStats, riskStudents, coursePerformance, managedDeptCount } = data;

  // KPIs
  const totalStudents = deptStats.reduce((s, d) => s + (d.enrolled_students || 0), 0);
  const totalCourses = deptStats.reduce((s, d) => s + (d.course_count || 0), 0);
  const totalFaculty = deptStats.reduce((s, d) => s + (d.faculty_count || 0), 0);
  const dismissedCount = riskStudents.filter((r) => r.is_dismissed).length;
  const atRiskCount = riskStudents.filter((r) => r.risk_status === "at_risk").length;

  // Course performance with absence rate
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

  // Risk status distribution
  const riskDistribution = [
    { name: "آمن", value: riskStudents.filter((r) => r.risk_status === "safe").length, color: CHART_COLORS.success },
    { name: "منطقة خطر", value: atRiskCount, color: CHART_COLORS.warning },
    { name: "محروم", value: dismissedCount, color: CHART_COLORS.danger },
  ].filter((d) => d.value > 0);

  // Department student counts
  const deptChartData = deptStats
    .filter((d) => d.enrolled_students > 0)
    .map((d) => ({ name: d.department_name, students: d.enrolled_students, faculty: d.faculty_count, courses: d.course_count }));

  // Top at-risk students
  const topRiskStudents = riskStudents
    .filter((r) => r.risk_status !== "safe")
    .sort((a, b) => b.unexcused_absences - a.unexcused_absences)
    .slice(0, 20);

  return (
    <div className="space-y-6">
      {/* ── KPIs ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="الطلاب المسجلون"
          value={totalStudents}
          icon={GraduationCap}
          iconColor="bg-academic-navy/10 text-academic-navy"
          trend={{
            value: `${managedDeptCount > 0 ? managedDeptCount : deptStats.length} قسم`,
            direction: "neutral",
          }}
        />
        <KpiCard
          title="المقررات"
          value={totalCourses}
          icon={BookOpen}
          iconColor="bg-success/10 text-success"
          trend={{
            value: `${totalFaculty} عضو تدريس`,
            direction: "neutral",
          }}
        />
        <KpiCard
          title={atRiskCount > 0 ? "منطقة الخطر" : "المحرومون"}
          value={atRiskCount > 0 ? atRiskCount : dismissedCount}
          icon={atRiskCount > 0 ? TrendingUp : ShieldAlert}
          iconColor={atRiskCount > 0 ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"}
          trend={
            dismissedCount > 0
              ? { value: `${dismissedCount} محروم`, direction: "down", label: "نهائياً" }
              : undefined
          }
        />
        <KpiCard
          title="متوسط الغياب"
          value={
            coursePerformance.length > 0
              ? `${(coursePerformance.reduce((s, c) => s + (c.avg_absence_percentage || 0), 0) / coursePerformance.length).toFixed(1)}%`
              : "0%"
          }
          icon={AlertTriangle}
          iconColor="bg-purple/10 text-purple"
        />
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="الطلاب حسب القسم" subtitle="توزيع الطلاب على الأقسام">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deptChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                type="number"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={90}
                tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card-bg)",
                  borderColor: "var(--color-border)",
                  borderRadius: "12px",
                  color: "var(--color-text-primary)",
                }}
              />
              <Bar dataKey="students" name="الطلاب" fill={CHART_COLORS.royalBlue} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="متوسط الغياب حسب المقرر" subtitle="أعلى 10 مقررات من حيث نسبة الغياب">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={coursePerfData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card-bg)",
                  borderColor: "var(--color-border)",
                  borderRadius: "12px",
                  color: "var(--color-text-primary)",
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="avgAbsence" name="نسبة الغياب %" fill={CHART_COLORS.peach} radius={[6, 6, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="dismissed" name="المحرومون" stroke={CHART_COLORS.danger} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Risk Distribution ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="توزيع المخاطر" subtitle="حالة الطلاب الأكاديمية">
          {riskDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="var(--color-card-bg)"
                  strokeWidth={2}
                >
                  {riskDistribution.map((_entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={[CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger][idx]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card-bg)",
                    borderColor: "var(--color-border)",
                    borderRadius: "12px",
                    color: "var(--color-text-primary)",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ color: "var(--color-text-secondary)", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[180px] items-center justify-center">
              <p className="text-text-secondary">لا توجد بيانات مخاطر</p>
            </div>
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
                <div className={`mb-1 flex h-8 w-8 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <p className="text-lg font-bold text-text-primary">{s.value}</p>
                <p className="text-[11px] text-text-secondary">{s.label}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── Students at Risk Table ── */}
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
                <th className="pb-3 pl-4 font-medium">الرقم الجامعي</th>
                <th className="pb-3 pl-4 font-medium">التخصص</th>
                <th className="pb-3 pl-4 font-medium">المستوى</th>
                <th className="pb-3 pl-4 font-medium">المقرر</th>
                <th className="pb-3 pl-4 font-medium">القسم</th>
                <th className="pb-3 pl-4 font-medium">غيابات</th>
                <th className="pb-3 pl-4 font-medium">الحد</th>
                <th className="pb-3 pl-4 font-medium">المتبقي</th>
                <th className="pb-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {topRiskStudents.map((r) => (
                <tr key={r.summary_id} className="border-b border-border/50 transition-colors hover:bg-app-bg/50">
                  <td className="py-3 pl-4">
                    <p className="font-medium text-text-primary">{r.first_name} {r.last_name}</p>
                  </td>
                  <td className="py-3 pl-4 text-text-secondary">{r.student_number || "—"}</td>
                  <td className="py-3 pl-4 text-text-primary">{r.student_major_name || "—"}</td>
                  <td className="py-3 pl-4 text-text-primary">{r.student_level_name || "—"}</td>
                  <td className="py-3 pl-4 text-text-primary">{r.course_name}</td>
                  <td className="py-3 pl-4 text-text-secondary">{r.department_name}</td>
                  <td className="py-3 pl-4">
                    <span className={r.unexcused_absences >= r.absence_limit_count ? "text-danger font-medium" : "text-warning"}>
                      {r.unexcused_absences}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-text-primary">{r.absence_limit_count}</td>
                  <td className="py-3 pl-4">
                    <span className={r.remaining_absences <= 1 ? "text-danger font-medium" : "text-text-primary"}>
                      {r.remaining_absences}
                    </span>
                  </td>
                  <td className="py-3">
                    {r.is_dismissed ? (
                      <span className="inline-flex rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                        محروم
                      </span>
                    ) : r.risk_status === "at_risk" ? (
                      <span className="inline-flex rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                        خطر
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        آمن
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {(dismissedCount + atRiskCount) === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-text-secondary">
                    لا يوجد طلاب في منطقة الخطر
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
