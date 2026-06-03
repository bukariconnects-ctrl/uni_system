"use client";

import { KpiCard, ChartCard } from "@/components/analytics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Award,
  BookOpen,
  Clock,
  TrendingUp,
  Calendar,
  AlertCircle,
} from "lucide-react";

interface Enrollment {
  id: string;
  sections?: { id: string; section_code: string; courses?: { code: string; name: string } };
}

interface StudentProfile {
  cumulative_gpa: number | null;
  earned_credit_hours: number | null;
  total_credit_hours: number | null;
}

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  max_grade: number;
  is_published: boolean;
  sections?: { id: string; courses?: { code: string; name: string } };
}

interface Submission {
  id: string;
  assignment_id: string;
  grade: number | null;
  status: string;
  assignments?: { title: string; max_grade: number };
}

interface AttendanceSummary {
  attended_sessions: number;
  total_sessions: number;
  absence_percentage: number;
}

interface DashboardData {
  enrollments: Enrollment[];
  studentProfile: StudentProfile | null;
  upcomingAssignments: Assignment[];
  submissions: Submission[];
  attendanceSummaries: AttendanceSummary[];
}

const CHART_COLORS = {
  royalBlue: "#00539C",
  peach: "#EEA47F",
  success: "#38A169",
  purple: "#805AD5",
};

export function StudentDashboardClient({ data }: { data: DashboardData }) {
  const { enrollments, studentProfile, upcomingAssignments, submissions, attendanceSummaries } = data;

  const gpa = studentProfile?.cumulative_gpa ?? 0;
  const earnedCredits = studentProfile?.earned_credit_hours ?? 0;
  const totalCredits = studentProfile?.total_credit_hours ?? 1;
  const progressPct = Math.round((earnedCredits / totalCredits) * 100);

  // Overall attendance
  const totalAttended = attendanceSummaries.reduce((s, a) => s + (a.attended_sessions || 0), 0);
  const totalSessions = attendanceSummaries.reduce((s, a) => s + (a.total_sessions || 0), 0);
  const attendanceRate = totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 100) : 0;

  // Grade trend chart
  const gradeData = submissions
    .filter((s) => s.grade !== null && s.assignments)
    .map((s) => ({
      name: s.assignments!.title.slice(0, 12),
      grade: s.grade,
      max: s.assignments!.max_grade,
      pct: s.assignments!.max_grade > 0
        ? Math.round(((s.grade || 0) / s.assignments!.max_grade) * 100)
        : 0,
    }))
    .slice(-10);

  const gpaColor = gpa >= 3.5 ? "text-success" : gpa >= 2.5 ? "text-academic-navy" : gpa >= 2.0 ? "text-warning" : "text-danger";
  const gpaBg = gpa >= 3.5 ? "bg-success/10 border-success/30" : gpa >= 2.5 ? "bg-academic-navy/10 border-academic-navy/30" : gpa >= 2.0 ? "bg-warning/10 border-warning/30" : "bg-danger/10 border-danger/30";
  const gpaLabel = gpa >= 3.5 ? "ممتاز" : gpa >= 2.5 ? "جيد جداً" : gpa >= 2.0 ? "جيد" : "ضعيف";

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="المعدل التراكمي"
          value={gpa.toFixed(2)}
          icon={Award}
          iconColor={gpa >= 2.0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}
          trend={{ value: gpaLabel, direction: gpa >= 2.0 ? "up" : "down", label: "" }}
        />
        <KpiCard
          title="الساعات المكتسبة"
          value={earnedCredits}
          icon={BookOpen}
          iconColor="bg-academic-navy/10 text-academic-navy"
          trend={{ value: `${progressPct}%`, direction: "up", label: "من الإجمالي" }}
        />
        <KpiCard
          title="نسبة الحضور"
          value={`${attendanceRate}%`}
          icon={TrendingUp}
          iconColor={attendanceRate >= 75 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}
          trend={{ value: `${totalAttended}/${totalSessions}`, direction: "neutral", label: "جلسة" }}
        />
        <KpiCard
          title="المقررات الحالية"
          value={enrollments.length}
          icon={Calendar}
          iconColor="bg-purple/10 text-purple"
          trend={{ value: `${upcomingAssignments.length}`, direction: "neutral", label: "تكليف قادم" }}
        />
      </div>

      {/* Progress + Grades */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Study Path */}
        <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-action-blue" />
                <h2 className="text-base font-bold text-text-primary">مساري الدراسي</h2>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">التقدم نحو التخرج</p>
            </div>
            <div className={`rounded-xl border px-4 py-2.5 text-center ${gpaBg}`}>
              <p className={`text-2xl font-bold tabular-nums ${gpaColor}`}>{gpa.toFixed(2)}</p>
              <p className="text-[10px] text-text-secondary">المعدل التراكمي</p>
              <p className={`text-[10px] font-bold ${gpaColor}`}>{gpaLabel}</p>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-text-secondary">{earnedCredits} ساعة مكتسبة</span>
            <span className="text-lg font-bold text-action-blue">{progressPct}%</span>
            <span className="text-text-secondary">{totalCredits} ساعة إجمالية</span>
          </div>

          <div className="relative h-5 w-full overflow-hidden rounded-full bg-app-bg shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-academic-navy to-action-blue transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
            {[25, 50, 75].map((m) => (
              <div key={m} className="absolute top-0 h-full w-px bg-white/50" style={{ left: `${m}%` }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-text-secondary/50">
            <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-app-bg/50 px-3 py-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5 text-action-blue" />
              <span className="font-bold text-text-primary">{enrollments.length}</span>
              <span className="text-text-secondary">مقررات حالية</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-app-bg/50 px-3 py-1.5 text-xs">
              <Award className="h-3.5 w-3.5 text-purple" />
              <span className="font-bold text-text-primary">{earnedCredits}</span>
              <span className="text-text-secondary">ساعة معتمدة</span>
            </div>
          </div>
        </div>

        {/* Grade Trend */}
        <ChartCard
          title="اتجاه الدرجات"
          subtitle="آخر التقييمات (نسبة مئوية من الدرجة القصوى)"
        >
          {gradeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={gradeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-border)" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-border)" }}
                  label={{ value: "%", angle: -90, position: "insideLeft", fill: "var(--color-text-secondary)", fontSize: 10 }}
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
                <Line
                  type="monotone"
                  dataKey="pct"
                  name="النسبة المئوية %"
                  stroke={CHART_COLORS.royalBlue}
                  strokeWidth={3}
                  dot={{ r: 4, fill: CHART_COLORS.royalBlue }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="grade"
                  name="الدرجة"
                  stroke={CHART_COLORS.peach}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_COLORS.peach }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center">
              <AlertCircle className="mb-2 h-8 w-8 text-text-secondary" />
              <p className="text-sm text-text-secondary">لا توجد درجات مسجلة بعد</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Upcoming Deadlines */}
      <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-action-blue" />
          <h2 className="text-base font-bold text-text-primary">المواعيد النهائية القادمة</h2>
        </div>
        {upcomingAssignments.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-secondary">لا توجد تكاليف قادمة</p>
        ) : (
          <div className="space-y-2">
            {upcomingAssignments
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
              .slice(0, 8)
              .map((assignment) => {
                const daysLeft = Math.ceil(
                  (new Date(assignment.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                const isOverdue = daysLeft < 0;
                const isUrgent = daysLeft <= 3 && daysLeft >= 0;
                return (
                  <div
                    key={assignment.id}
                    className={`flex items-center justify-between rounded-xl border p-3 ${
                      isOverdue
                        ? "border-danger/30 bg-danger/5"
                        : isUrgent
                        ? "border-warning/30 bg-warning/5"
                        : "border-border bg-app-bg/50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-text-primary">{assignment.title}</p>
                      <p className="text-xs text-text-secondary">
                        {assignment.sections?.courses?.code} —{" "}
                        {assignment.sections?.courses?.name}
                      </p>
                    </div>
                    <div className="text-left">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isOverdue
                            ? "bg-danger/10 text-danger"
                            : isUrgent
                            ? "bg-warning/10 text-warning"
                            : "bg-success/10 text-success"
                        }`}
                      >
                        {isOverdue ? `متأخر ${Math.abs(daysLeft)} يوم` : `${daysLeft} يوم متبقي`}
                      </span>
                      <p className="mt-1 text-[10px] text-text-secondary">
                        {new Date(assignment.due_date).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
