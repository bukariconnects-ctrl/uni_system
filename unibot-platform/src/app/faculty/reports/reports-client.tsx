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
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from "recharts";
import {
  BookOpen,
  Users,
  ClipboardCheck,
  AlertTriangle,
  GraduationCap,
  FileText,
  TrendingUp,
  UserCheck,
} from "lucide-react";

interface MyCourse {
  faculty_id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  credit_hours: number;
  major_id: string;
  major_name: string;
  academic_level_id: string;
  academic_level_number: number;
  academic_level_name: string;
  semester_id: string;
  semester_name: string;
  academic_year: string;
  enrolled_students: number;
  total_sessions: number;
  total_assignments: number;
}

interface AttendanceRoster {
  student_id: string;
  course_id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  course_code: string;
  course_name: string;
  student_major_name?: string;
  student_level_name?: string;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  excused_count: number;
  late_count: number;
  is_dismissed: boolean;
  unexcused_absences: number;
  absence_percentage: number;
}

interface DismissedStudent {
  student_id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  student_major_name?: string;
  student_level_name?: string;
  total_sessions: number;
  unexcused_absences: number;
  excused_absences: number;
  attended_sessions: number;
  late_count: number;
  absence_percentage: number;
  dismissed_at: string;
}

interface SubmissionStats {
  course_id: string;
  assignment_id: string;
  assignment_title: string;
  faculty_id: string;
  max_grade: number;
  due_date: string;
  is_published: boolean;
  total_submissions: number;
  submitted_count: number;
  graded_count: number;
  avg_grade: number;
  max_grade_achieved: number;
  min_grade_achieved: number;
}

interface ReportsData {
  myCourses: MyCourse[];
  attendanceRoster: AttendanceRoster[];
  dismissedStudents: DismissedStudent[];
  submissionStats: SubmissionStats[];
}

const CHART_COLORS = {
  royalBlue: "#00539C",
  peach: "#EEA47F",
  success: "#38A169",
  danger: "#E53E3E",
  purple: "#805AD5",
  teal: "#319795",
  warning: "#D69E2E",
};

export function FacultyReportsClient({ data }: { data: ReportsData }) {
  const { myCourses, attendanceRoster, dismissedStudents, submissionStats } = data;

  // KPIs
  const totalCourses = myCourses.length;
  const totalStudents = [...new Set(attendanceRoster.map((r) => r.student_id))].length;
  const totalSessions = myCourses.reduce((s, c) => s + (c.total_sessions || 0), 0);
  const totalDismissed = dismissedStudents.length;
  const totalAssignments = myCourses.reduce((s, c) => s + (c.total_assignments || 0), 0);
  const totalSubmissions = submissionStats.reduce((s, sub) => s + (sub.total_submissions || 0), 0);
  const gradedCount = submissionStats.reduce((s, sub) => s + (sub.graded_count || 0), 0);

  // Attendance per course
  const courseAttendanceData = myCourses
    .filter((c) => c.enrolled_students > 0)
    .map((c) => {
      const courseRecords = attendanceRoster.filter((r) => r.course_id === c.course_id);
      const total = courseRecords.reduce((s, r) => s + (r.total_sessions || 0), 0);
      const present = courseRecords.reduce((s, r) => s + (r.present_count || 0), 0);
      const absent = courseRecords.reduce((s, r) => s + (r.absent_count || 0), 0);
      return {
        name: c.course_code,
        حاضر: present,
        غائب: absent,
        total,
      };
    })
    .sort((a, b) => b.غائب - a.غائب);

  // Student status distribution
  const presentCount = attendanceRoster.reduce((s, r) => s + (r.present_count || 0), 0);
  const absentCount = attendanceRoster.reduce((s, r) => s + (r.absent_count || 0), 0);
  const excusedCount = attendanceRoster.reduce((s, r) => s + (r.excused_count || 0), 0);
  const lateCount = attendanceRoster.reduce((s, r) => s + (r.late_count || 0), 0);

  const statusDistribution = [
    { name: "حاضر", value: presentCount, color: CHART_COLORS.success },
    { name: "غائب", value: absentCount, color: CHART_COLORS.danger },
    { name: "معذر", value: excusedCount, color: CHART_COLORS.warning },
    { name: "متأخر", value: lateCount, color: CHART_COLORS.purple },
  ].filter((d) => d.value > 0);

  // Submission stats
  const submissionData = submissionStats
    .filter((s) => s.total_submissions > 0)
    .map((s) => ({
      name: s.assignment_title.length > 20 ? s.assignment_title.slice(0, 20) + "..." : s.assignment_title,
      submitted: s.submitted_count,
      graded: s.graded_count,
      avgGrade: s.avg_grade,
    }))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* ── KPIs ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="المقررات"
          value={totalCourses}
          icon={BookOpen}
          iconColor="bg-academic-navy/10 text-academic-navy"
          trend={{
            value: `${totalSessions} جلسة`,
            direction: totalSessions > 0 ? "up" : "neutral",
          }}
        />
        <KpiCard
          title="الطلاب المسجلين"
          value={totalStudents}
          icon={Users}
          iconColor="bg-peach/10 text-action-blue"
        />
        <KpiCard
          title="جلسات الحضور"
          value={totalSessions}
          icon={ClipboardCheck}
          iconColor="bg-success/10 text-success"
        />
        <KpiCard
          title={totalDismissed > 0 ? "المحرومون" : "التكاليف"}
          value={totalDismissed > 0 ? totalDismissed : totalAssignments}
          icon={totalDismissed > 0 ? AlertTriangle : FileText}
          iconColor={totalDismissed > 0 ? "bg-danger/10 text-danger" : "bg-purple/10 text-purple"}
          trend={
            totalDismissed > 0
              ? {
                  value: `${(totalDismissed / Math.max(totalStudents, 1) * 100).toFixed(0)}%`,
                  direction: "down",
                  label: "من الطلاب",
                }
              : {
                  value: `${totalSubmissions} تسليم`,
                  direction: "neutral",
                  label: `${gradedCount} مصحح`,
                }
          }
        />
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="توزيع حالات الحضور" subtitle="إجمالي جميع المقررات">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                stroke="var(--color-card-bg)"
                strokeWidth={2}
              >
                {statusDistribution.map((_e, idx) => (
                  <Cell key={idx} fill={[CHART_COLORS.success, CHART_COLORS.danger, CHART_COLORS.warning, CHART_COLORS.purple][idx]} />
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
        </ChartCard>

        <ChartCard title="الحضور حسب المقرر" subtitle="عدد مرات الحضور والغياب لكل مقرر">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={courseAttendanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <YAxis
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
              <Bar dataKey="حاضر" fill={CHART_COLORS.success} stackId="a" radius={[6, 6, 0, 0]} />
              <Bar dataKey="غائب" fill={CHART_COLORS.danger} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="حالة التكاليف" subtitle="عدد التسليمات والتصحيحات">
          {submissionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={submissionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--color-text-secondary)", fontSize: 9 }}
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
                <Bar yAxisId="left" dataKey="submitted" name="تم التسليم" fill={CHART_COLORS.royalBlue} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="graded" name="تم التصحيح" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="avgGrade" name="المتوسط" stroke={CHART_COLORS.peach} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-text-secondary">لا توجد تكاليف بعد</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="المقررات التي تدرسها" subtitle="نظرة سريعة">
          <div className="space-y-3">
            {myCourses.slice(0, 6).map((c) => (
              <div key={`${c.course_id}-${c.major_id}`} className="flex items-center justify-between rounded-lg border border-border bg-app-bg/50 p-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{c.course_name}</p>
                  <p className="text-xs text-text-secondary">
                    {c.major_name || ""} {c.academic_level_name ? `- ${c.academic_level_name}` : ""}
                  </p>
                </div>
                <div className="text-left text-xs text-text-secondary">
                  <p>{c.enrolled_students} طالب</p>
                  <p>{c.total_sessions} جلسة</p>
                </div>
              </div>
            ))}
            {myCourses.length === 0 && (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-text-secondary">لا توجد مقررات مسندة</p>
              </div>
            )}
            {myCourses.length > 6 && (
              <p className="text-center text-xs text-text-secondary">
                ...و {myCourses.length - 6} مقررات أخرى
              </p>
            )}
          </div>
        </ChartCard>
      </div>

      {/* ── Dismissed Students Table ── */}
      {dismissedStudents.length > 0 && (
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">الطلاب المحرومون</h2>
            <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
              {dismissedStudents.length} طالب
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
                  <th className="pb-3 pl-4 font-medium">الجلسات</th>
                  <th className="pb-3 pl-4 font-medium">الغياب</th>
                  <th className="pb-3 pl-4 font-medium">نسبة الغياب</th>
                  <th className="pb-3 font-medium">تاريخ الحرمان</th>
                </tr>
              </thead>
              <tbody>
                {dismissedStudents.map((s) => (
                  <tr key={`${s.student_id}-${s.course_id}`} className="border-b border-border/50 transition-colors hover:bg-app-bg/50">
                    <td className="py-3 pl-4 font-medium text-text-primary">
                      {s.first_name} {s.last_name}
                    </td>
                    <td className="py-3 pl-4 text-text-secondary">{s.student_number || "—"}</td>
                    <td className="py-3 pl-4 text-text-primary">{s.student_major_name || "—"}</td>
                    <td className="py-3 pl-4 text-text-primary">{s.student_level_name || "—"}</td>
                    <td className="py-3 pl-4 text-text-primary">{s.course_name}</td>
                    <td className="py-3 pl-4 text-text-primary">{s.total_sessions}</td>
                    <td className="py-3 pl-4">
                      <span className="text-danger font-medium">{s.unexcused_absences}</span>
                      <span className="text-text-secondary text-xs mr-1">/ {s.excused_absences} معذر</span>
                    </td>
                    <td className="py-3 pl-4 text-text-primary">{s.absence_percentage}%</td>
                    <td className="py-3 text-text-secondary">
                      {s.dismissed_at ? new Date(s.dismissed_at).toLocaleDateString("ar-SA") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Detailed Attendance Table ── */}
      <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-text-primary">سجل الحضور والغياب</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="pb-3 pl-4 font-medium">الطالب</th>
                <th className="pb-3 pl-4 font-medium">الرقم</th>
                <th className="pb-3 pl-4 font-medium">التخصص</th>
                <th className="pb-3 pl-4 font-medium">المستوى</th>
                <th className="pb-3 pl-4 font-medium">المقرر</th>
                <th className="pb-3 pl-4 font-medium">حاضر</th>
                <th className="pb-3 pl-4 font-medium">غائب</th>
                <th className="pb-3 pl-4 font-medium">معذر</th>
                <th className="pb-3 pl-4 font-medium">متأخر</th>
                <th className="pb-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRoster.slice(0, 50).map((r) => (
                <tr key={`${r.student_id}-${r.course_id}`} className="border-b border-border/50 transition-colors hover:bg-app-bg/50">
                  <td className="py-3 pl-4 font-medium text-text-primary">
                    {r.first_name} {r.last_name}
                  </td>
                  <td className="py-3 pl-4 text-text-secondary">{r.student_number || "—"}</td>
                  <td className="py-3 pl-4 text-text-primary">{r.student_major_name || "—"}</td>
                  <td className="py-3 pl-4 text-text-primary">{r.student_level_name || "—"}</td>
                  <td className="py-3 pl-4 text-text-secondary">{r.course_name || myCourses.find((c) => c.course_id === r.course_id)?.course_name || "—"}</td>
                  <td className="py-3 pl-4 text-success">{r.present_count}</td>
                  <td className="py-3 pl-4">
                    <span className={r.absent_count > 0 ? "text-danger" : ""}>{r.absent_count}</span>
                  </td>
                  <td className="py-3 pl-4 text-warning">{r.excused_count}</td>
                  <td className="py-3 pl-4 text-purple">{r.late_count}</td>
                  <td className="py-3">
                    {r.is_dismissed ? (
                      <span className="inline-flex rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                        محروم
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        نشط
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {attendanceRoster.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-text-secondary">
                    لا توجد سجلات حضور
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {attendanceRoster.length > 50 && (
          <p className="mt-3 text-center text-xs text-text-secondary">
            يتم عرض أول 50 طالباً فقط
          </p>
        )}
      </div>
    </div>
  );
}
