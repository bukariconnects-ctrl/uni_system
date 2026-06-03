"use client";

import { KpiCard, ChartCard } from "@/components/analytics";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Users,
  FileText,
  ClipboardCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface Section {
  id: string;
  section_code: string;
  courses?: { code: string; name: string };
  semesters?: { name: string; status: string };
  enrolled_count: number;
}

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  submitted_at: string;
  status: string;
  grade: number | null;
  assignments?: { title: string; max_grade: number };
  profiles?: { first_name: string; last_name: string };
}

interface AttendanceRecord {
  session_id: string;
  section_id: string;
  status: string;
  created_at: string;
  attendance_sessions?: { session_date: string; start_time: string };
}

interface DashboardData {
  sections: Section[];
  totalStudents: number;
  pendingSubmissions: Submission[];
  assignmentsCount: number;
  attendanceRecords: AttendanceRecord[];
}

const CHART_COLORS = {
  royalBlue: "#00539C",
  peach: "#EEA47F",
  success: "#38A169",
  purple: "#805AD5",
};

export function FacultyDashboardClient({ data }: { data: DashboardData }) {
  const { sections, totalStudents, pendingSubmissions, assignmentsCount, attendanceRecords } = data;

  const activeSections = sections.filter(
    (s) => s.semesters?.status === "active"
  );

  // Area chart: attendance trends by session
  const sessionAttendance: Record<string, { present: number; absent: number; date: string }> = {};
  attendanceRecords.forEach((r) => {
    const sessionKey = r.session_id;
    const sessionDate = r.attendance_sessions?.session_date || sessionKey;
    if (!sessionAttendance[sessionKey]) {
      sessionAttendance[sessionKey] = { present: 0, absent: 0, date: sessionDate };
    }
    if (r.status === "present" || r.status === "late") {
      sessionAttendance[sessionKey].present++;
    } else {
      sessionAttendance[sessionKey].absent++;
    }
  });

  const attendanceTrend = Object.entries(sessionAttendance)
    .sort(([, a], [, b]) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10)
    .map(([_, data]) => ({
      date: new Date(data.date).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
      present: data.present,
      absent: data.absent,
      rate: data.present + data.absent > 0
        ? Math.round((data.present / (data.present + data.absent)) * 100)
        : 0,
    }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="إجمالي الطلاب"
          value={totalStudents}
          icon={Users}
          iconColor="bg-academic-navy/10 text-academic-navy"
          trend={{
            value: `${activeSections.length}`,
            direction: "up",
            label: "شعبة نشطة",
          }}
        />
        <KpiCard
          title="تسليمات بانتظار التقييم"
          value={pendingSubmissions.length}
          icon={FileText}
          iconColor="bg-peach/10 text-action-blue"
          trend={{
            value: `${pendingSubmissions.length}`,
            direction: "neutral",
            label: "في انتظار التقييم",
          }}
        />
        <KpiCard
          title="التكاليف المنشورة"
          value={assignmentsCount}
          icon={ClipboardCheck}
          iconColor="bg-success/10 text-success"
          trend={{
            value: `${assignmentsCount}`,
            direction: "neutral",
            label: "إجمالي التكاليف",
          }}
        />
        <KpiCard
          title="الحضور الأخير"
          value={`${attendanceTrend.length > 0 ? attendanceTrend[attendanceTrend.length - 1].rate : 0}%`}
          icon={CheckCircle2}
          iconColor="bg-purple/10 text-purple"
          trend={{
            value: `${attendanceRecords.filter((r) => r.status === "present").length}`,
            direction: "up",
            label: "حضور مسجل",
          }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="اتجاهات الحضور"
          subtitle="نسبة الحضور عبر آخر الجلسات"
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={attendanceTrend}>
              <defs>
                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.royalBlue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.royalBlue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.peach} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.peach} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }}
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
              <Area
                type="monotone"
                dataKey="present"
                name="حاضر"
                stroke={CHART_COLORS.royalBlue}
                fill="url(#presentGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="absent"
                name="غائب"
                stroke={CHART_COLORS.peach}
                fill="url(#absentGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="تسليمات بانتظار التقييم"
          subtitle="آخر 10 تسليمات تحتاج تقييماً"
        >
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {pendingSubmissions
              .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
              .slice(0, 10)
              .map((sub) => {
                const student = sub.profiles;
                const assignment = sub.assignments;
                const studentName = student
                  ? `${student.first_name} ${student.last_name}`
                  : "طالب";
                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-app-bg/50 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-text-primary">
                        {assignment?.title || "تكليف"}
                      </p>
                      <p className="text-xs text-text-secondary">{studentName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                        بانتظار التقييم
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-text-secondary">
                        <Clock className="h-3 w-3" />
                        {new Date(sub.submitted_at).toLocaleDateString("ar-SA")}
                      </span>
                    </div>
                  </div>
                );
              })}
            {pendingSubmissions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="mb-2 h-8 w-8 text-success" />
                <p className="text-sm text-text-secondary">لا توجد تسليمات بانتظار التقييم</p>
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Active Sections */}
      <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-text-primary">شعبي النشطة</h2>
        {activeSections.length === 0 ? (
          <p className="text-sm text-text-secondary">لا توجد شعب نشطة حالياً</p>
        ) : (
          <div className="space-y-2">
            {activeSections.map((section) => (
              <div
                key={section.id}
                className="flex items-center justify-between rounded-xl border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-academic-navy/10">
                    <FileText className="h-5 w-5 text-academic-navy" />
                  </div>
                  <div>
                    <span className="font-bold text-text-primary">
                      {section.courses?.code} — {section.courses?.name}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span>الشعبة: {section.section_code}</span>
                      <span>•</span>
                      <span>{section.semesters?.name}</span>
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-academic-navy/10 px-3 py-1 text-xs font-medium text-academic-navy">
                  {section.enrolled_count} طالب
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
