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
  Line,
  ComposedChart,
  Legend,
  Cell,
} from "recharts";
import {
  Users,
  BookCopy,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";

interface Course {
  id: string;
  code: string;
  name: string;
  credit_hours: number;
}

interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  section_id: string | null;
  status: string;
}

interface AttendanceSummary {
  student_id: string;
  section_id: string;
  course_id: string | null;
  unexcused_absences: number;
  attended_sessions: number;
  total_sessions: number;
  is_dismissed: boolean;
}

interface StudentProfile {
  profile_id: string;
  risk_level: string;
  risk_score: number | null;
  cumulative_gpa: number | null;
  student_number: string;
  profiles?: { first_name: string; last_name: string }[];
}

interface DashboardData {
  courses: Course[];
  enrollments: Enrollment[];
  attendanceSummaries: AttendanceSummary[];
  riskStudents: StudentProfile[];
  courseLimitCache: Record<string, number>;
}

const CHART_COLORS = {
  royalBlue: "#00539C",
  peach: "#EEA47F",
  success: "#38A169",
  danger: "#E53E3E",
  purple: "#805AD5",
};

export function AcademicManagementDashboardClient({ data }: { data: DashboardData }) {
  const { courses, enrollments, attendanceSummaries, riskStudents, courseLimitCache } = data;

  const enrolledCount = enrollments.filter((e) => e.status === "enrolled").length;
  const activeCourseCount = courses.length;

  // Average unexcused absences count
  const totalUnexcused = attendanceSummaries.reduce((s, a) => s + (a.unexcused_absences || 0), 0);
  const avgAbsenceCount =
    attendanceSummaries.length > 0
      ? Math.round(totalUnexcused / attendanceSummaries.length)
      : 0;

  // Dismissed count
  const dismissedCount = attendanceSummaries.filter((a) => a.is_dismissed).length;

  // High risk students
  const highRiskStudents = riskStudents.filter(
    (s) => s.risk_level === "high" || s.risk_level === "critical"
  );

  // Attendance vs Risk by course
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const courseStats: Record<string, { absences: number[]; riskScores: number[]; name: string }> = {};

  attendanceSummaries.forEach((a) => {
    const courseId = a.course_id;
    if (!courseId) return;
    const course = courseMap.get(courseId);
    if (!course) return;
    const name = course.code;
    if (!courseStats[courseId]) {
      courseStats[courseId] = { absences: [], riskScores: [], name };
    }
    courseStats[courseId].absences.push(a.unexcused_absences || 0);
  });

  riskStudents.forEach((s) => {
    const enrollment = enrollments.find((e) => e.student_id === s.profile_id);
    if (!enrollment) return;
    const courseId = enrollment.course_id;
    const course = courseMap.get(courseId);
    if (!course) return;
    if (!courseStats[courseId]) {
      const name = course.code;
      courseStats[courseId] = { absences: [], riskScores: [], name };
    }
    if (s.risk_score !== null) {
      courseStats[courseId].riskScores.push(s.risk_score);
    }
  });

  const composedData = Object.values(courseStats)
    .map((s) => {
      const courseId = courses.find((c) => c.code === s.name)?.id;
      const limit = courseId ? courseLimitCache[courseId] || 5 : 5;
      return {
        name: s.name,
        avgAbsence: s.absences.length > 0 ? Math.round(s.absences.reduce((a, b) => a + b, 0) / s.absences.length) : 0,
        avgRisk: s.riskScores.length > 0 ? Math.round(s.riskScores.reduce((a, b) => a + b, 0) / s.riskScores.length) : 0,
        limit,
      };
    })
    .filter((d) => d.avgAbsence > 0 || d.avgRisk > 0)
    .slice(0, 8);

  const riskColors: Record<string, string> = {
    low: CHART_COLORS.success,
    medium: CHART_COLORS.peach,
    high: CHART_COLORS.danger,
    critical: "#7f1d1d",
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="الطلاب المسجلون"
          value={enrolledCount}
          icon={Users}
          iconColor="bg-academic-navy/10 text-academic-navy"
          trend={{ value: `${activeCourseCount}`, direction: "up", label: "مادة نشطة" }}
        />
        <KpiCard
          title="المواد النشطة"
          value={activeCourseCount}
          icon={BookCopy}
          iconColor="bg-success/10 text-success"
          trend={{ value: `${courses.length}`, direction: "neutral", label: "إجمالي المواد" }}
        />
        <KpiCard
          title="متوسط الغياب"
          value={avgAbsenceCount}
          icon={TrendingDown}
          iconColor="bg-warning/10 text-warning"
          trend={{
            value: `${dismissedCount} محروم`,
            direction: "neutral",
            label: "من أصل " + attendanceSummaries.length + " سجل",
          }}
        />
        <KpiCard
          title="منطقة الخطر"
          value={highRiskStudents.length}
          icon={AlertTriangle}
          iconColor="bg-danger/10 text-danger"
          trend={{
            value: `${riskStudents.length}`,
            direction: "neutral",
            label: "طالب مراقب",
          }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="متوسط الغياب مقابل المخاطر"
          subtitle="للمواد النشطة (متوسط عدد الغيابات vs متوسط Risk Score)"
        >
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={composedData}>
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
                label={{ value: "عدد الغيابات", angle: -90, position: "insideLeft", fill: "var(--color-text-secondary)", fontSize: 10 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
                label={{ value: "Risk", angle: 90, position: "insideRight", fill: "var(--color-text-secondary)", fontSize: 10 }}
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
              <Bar
                yAxisId="left"
                dataKey="avgAbsence"
                name="متوسط الغياب"
                fill={CHART_COLORS.peach}
                radius={[6, 6, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgRisk"
                name="متوسط المخاطر"
                stroke={CHART_COLORS.danger}
                strokeWidth={2}
                dot={{ r: 4, fill: CHART_COLORS.danger }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="منطقة الخطر" subtitle="Top 5 طلاب يحتاجون تدخلاً فورياً">
          <div className="space-y-2">
            {riskStudents
              .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
              .slice(0, 5)
              .map((student) => {
                const profile = student.profiles?.[0];
                const name = profile
                  ? `${profile.first_name} ${profile.last_name}`
                  : student.student_number;
                const color = riskColors[student.risk_level] || CHART_COLORS.purple;
                return (
                  <div
                    key={student.profile_id}
                    className="flex items-center justify-between rounded-xl border border-border bg-app-bg/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {student.risk_score?.toFixed(0) || "—"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary">{name}</p>
                        <p className="text-xs text-text-secondary">
                          GPA: {student.cumulative_gpa?.toFixed(2) || "—"} ·{" "}
                          {student.risk_level === "critical"
                            ? "حرج"
                            : student.risk_level === "high"
                            ? "مرتفع"
                            : student.risk_level === "medium"
                            ? "متوسط"
                            : "منخفض"}
                        </p>
                      </div>
                    </div>
                    <div
                      className="h-2 w-16 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${color} ${Math.min(
                          (student.risk_score || 0) * 10,
                          100
                        )}%, var(--color-app-bg) ${Math.min((student.risk_score || 0) * 10, 100)}%)`,
                      }}
                    />
                  </div>
                );
              })}
            {riskStudents.length === 0 && (
              <p className="py-8 text-center text-sm text-text-secondary">
                لا يوجد طلاب في منطقة الخطر حالياً
              </p>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
