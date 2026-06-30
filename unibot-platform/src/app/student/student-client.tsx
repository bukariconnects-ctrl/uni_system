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
  course_id?: string;
  courses?: { code: string; name: string };
  semesters?: { name: string; status: string };
}

interface CourseSchedule {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  semester_id: string;
  venues?: { name: string };
  study_plan_courses?: { course_id: string };
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
  course_id?: string;
  courses?: { code: string; name: string };
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
  courseSchedules: CourseSchedule[];
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
  const { enrollments, courseSchedules, studentProfile, upcomingAssignments, submissions, attendanceSummaries } = data;

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

  // Group schedules by day
  const daysOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  
  const enrichedSchedules = courseSchedules.map(schedule => {
     const enrollment = enrollments.find(e => 
       e.course_id === (schedule.study_plan_courses as any)?.course_id && 
       (e as any).semester_id === schedule.semester_id
     );
     return { ...schedule, course: enrollment?.courses };
  }).filter(s => s.course);

  const schedulesByDay = enrichedSchedules.reduce((acc, schedule) => {
    const day = schedule.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(schedule);
    return acc;
  }, {} as Record<string, typeof enrichedSchedules>);

  const activeDays = Object.keys(schedulesByDay).sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
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
        {/* Class Schedule */}
        <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm flex flex-col max-h-[400px]">
          <div className="mb-5 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-action-blue" />
            <h2 className="text-base font-bold text-text-primary">الجدول الدراسي</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {activeDays.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">لا توجد مقررات مجدولة حالياً</p>
            ) : (
              activeDays.map((day) => {
                const dayMap: Record<string, string> = {
                  sunday: "الأحد",
                  monday: "الإثنين",
                  tuesday: "الثلاثاء",
                  wednesday: "الأربعاء",
                  thursday: "الخميس",
                  friday: "الجمعة",
                  saturday: "السبت",
                };
                const dayAr = dayMap[day] || day;
                const daySchedules = schedulesByDay[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
                
                const formatTime = (timeStr?: string) => {
                  if (!timeStr) return "";
                  const [h, m] = timeStr.split(':');
                  const d = new Date();
                  d.setHours(parseInt(h, 10), parseInt(m, 10));
                  return d.toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" });
                };

                return (
                  <div key={day} className="mb-4 last:mb-0">
                    <h3 className="text-sm font-bold text-action-blue mb-3 flex items-center gap-1.5 border-b border-border pb-2">
                      <Calendar className="h-4 w-4" />
                      {dayAr}
                    </h3>
                    <div className="space-y-2">
                      {daySchedules.map((schedule) => (
                        <div key={schedule.id} className="rounded-xl border border-border bg-app-bg/50 p-3">
                          <p className="font-bold text-sm text-text-primary mb-2">
                            {schedule.course?.name} <span className="text-xs text-text-secondary font-normal">({schedule.course?.code})</span>
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-action-blue" />
                              <span>{schedule.start_time ? `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}` : ""}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-purple" />
                              <span>القاعة: {schedule.venues?.name || "غير محددة"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
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
                        {assignment.courses?.code} —{" "}
                        {assignment.courses?.name}
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
