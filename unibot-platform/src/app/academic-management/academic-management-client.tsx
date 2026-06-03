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

interface Section {
  id: string;
  section_code: string;
  status: string;
  course_id: string;
  courses?: { code: string; name: string }[];
  semester_id: string;
  enrolled_count: number;
}

interface Enrollment {
  id: string;
  student_id: string;
  section_id: string;
  status: string;
}

interface AttendanceSummary {
  student_id: string;
  section_id: string;
  absence_percentage: number;
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
  sections: Section[];
  enrollments: Enrollment[];
  attendanceSummaries: AttendanceSummary[];
  riskStudents: StudentProfile[];
}

const CHART_COLORS = {
  royalBlue: "#00539C",
  peach: "#EEA47F",
  success: "#38A169",
  danger: "#E53E3E",
  purple: "#805AD5",
};

export function AcademicManagementDashboardClient({ data }: { data: DashboardData }) {
  const { sections, enrollments, attendanceSummaries, riskStudents } = data;

  const enrolledCount = enrollments.filter((e) => e.status === "enrolled").length;
  const activeSections = sections.filter((s) => s.status === "open").length;

  // Average absence rate
  const avgAbsence =
    attendanceSummaries.length > 0
      ? attendanceSummaries.reduce((s, a) => s + (a.absence_percentage || 0), 0) /
        attendanceSummaries.length
      : 0;

  // High risk students
  const highRiskStudents = riskStudents.filter(
    (s) => s.risk_level === "high" || s.risk_level === "critical"
  );

  // Attendance vs Risk by section
  const sectionMap = new Map(sections.map((s) => [s.id, s]));
  const sectionStats: Record<string, { absences: number[]; riskScores: number[]; name: string }> = {};

  attendanceSummaries.forEach((a) => {
    const sec = sectionMap.get(a.section_id);
    if (!sec) return;
    const name = sec.courses?.[0]?.code || sec.section_code;
    if (!sectionStats[sec.id]) {
      sectionStats[sec.id] = { absences: [], riskScores: [], name };
    }
    sectionStats[sec.id].absences.push(a.absence_percentage || 0);
  });

  riskStudents.forEach((s) => {
    // Find which section this student is in
    const enrollment = enrollments.find((e) => e.student_id === s.profile_id);
    if (!enrollment) return;
    const sec = sectionMap.get(enrollment.section_id);
    if (!sec) return;
    if (!sectionStats[sec.id]) {
      const name = sec.courses?.[0]?.code || sec.section_code;
      sectionStats[sec.id] = { absences: [], riskScores: [], name };
    }
    if (s.risk_score !== null) {
      sectionStats[sec.id].riskScores.push(s.risk_score);
    }
  });

  const composedData = Object.values(sectionStats)
    .map((s) => ({
      name: s.name,
      avgAbsence: s.absences.length > 0 ? Math.round(s.absences.reduce((a, b) => a + b, 0) / s.absences.length) : 0,
      avgRisk: s.riskScores.length > 0 ? Math.round(s.riskScores.reduce((a, b) => a + b, 0) / s.riskScores.length) : 0,
    }))
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="الطلاب المسجلون"
          value={enrolledCount}
          icon={Users}
          iconColor="bg-academic-navy/10 text-academic-navy"
          trend={{ value: `${activeSections}`, direction: "up", label: "شعبة نشطة" }}
        />
        <KpiCard
          title="الشعب النشطة"
          value={activeSections}
          icon={BookCopy}
          iconColor="bg-success/10 text-success"
          trend={{ value: `${sections.length}`, direction: "neutral", label: "إجمالي الشعب" }}
        />
        <KpiCard
          title="معدل الغياب"
          value={`${avgAbsence.toFixed(1)}%`}
          icon={TrendingDown}
          iconColor="bg-warning/10 text-warning"
          trend={{
            value: `${attendanceSummaries.length}`,
            direction: "neutral",
            label: "سجل حضور",
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
          title="نسبة الغياب مقابل المخاطر"
          subtitle="للشعب النشطة (متوسط الغياب % vs متوسط Risk Score)"
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
                label={{ value: "% غياب", angle: -90, position: "insideLeft", fill: "var(--color-text-secondary)", fontSize: 10 }}
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
                name="متوسط الغياب %"
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
