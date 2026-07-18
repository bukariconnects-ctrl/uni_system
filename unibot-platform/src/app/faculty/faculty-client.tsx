"use client";

import { KpiCard, ChartCard } from "@/components/analytics";
import { Calendar, CheckCircle2, ClipboardCheck, Clock, FileText, Users } from "lucide-react";

interface Course {
  id: string;
  code: string;
  name: string;
  semester: { name: string; status: string };
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

interface Schedule {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  component_type: string;
  venue_id: string | null;
  venues: { name: string; code: string } | null;
  study_plan_courses: {
    course_id: string;
    academic_level_id: string;
    courses: { id: string; code: string; name: string };
    academic_levels: { level_number: number; name: string; majors: { name: string } };
  };
  semesters: { name: string; status: string };
}

interface DashboardData {
  courses: Course[];
  totalStudents: number;
  pendingSubmissions: Submission[];
  assignmentsCount: number;
  schedules: Schedule[];
}

export function FacultyDashboardClient({ data }: { data: DashboardData }) {
  const { courses, totalStudents, pendingSubmissions, assignmentsCount, schedules } = data;

  const activeCourses = courses.filter(
    (c) => c.semester?.status === "active"
  );

  const dayNames: Record<string, string> = {
    sunday: "الأحد", monday: "الإثنين", tuesday: "الثلاثاء",
    wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة", saturday: "السبت",
  };

  const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  const sortedSchedules = [...schedules].sort((a, b) => {
    const dayDiff = dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week);
    if (dayDiff !== 0) return dayDiff;
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="إجمالي الطلاب"
          value={totalStudents}
          icon={Users}
          iconColor="bg-academic-navy/10 text-academic-navy"
          trend={{
            value: `${activeCourses.length}`,
            direction: "up",
            label: "مادة نشطة",
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
          value={`${sortedSchedules.length}`}
          icon={CheckCircle2}
          iconColor="bg-purple/10 text-purple"
          trend={{
            value: `محاضرة`,
            direction: "up",
            label: "موعد أسبوعي",
          }}
        />
      </div>

      {/* Schedule + Pending Submissions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm flex flex-col max-h-[400px]">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-action-blue" />
            <h2 className="text-base font-bold text-text-primary">الجدول الدراسي الأسبوعي</h2>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {sortedSchedules.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-secondary">لا توجد محاضرات مجدولة</p>
            ) : (
              (() => {
                const schedulesByDay = sortedSchedules.reduce((acc, s) => {
                  const day = s.day_of_week;
                  if (!acc[day]) acc[day] = [];
                  acc[day].push(s);
                  return acc;
                }, {} as Record<string, typeof sortedSchedules>);

                const activeDays = Object.keys(schedulesByDay).sort(
                  (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)
                );

                const formatTime = (timeStr?: string) => {
                  if (!timeStr) return "";
                  const [h, m] = timeStr.split(':');
                  const d = new Date();
                  d.setHours(parseInt(h, 10), parseInt(m, 10));
                  return d.toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" });
                };

                return activeDays.map((day) => (
                  <div key={day}>
                    <h3 className="mb-3 flex items-center gap-1.5 border-b border-border pb-2 text-sm font-bold text-action-blue">
                      <Calendar className="h-4 w-4" />
                      {dayNames[day]}
                    </h3>
                    <div className="space-y-2">
                      {schedulesByDay[day].map((s) => {
                        const spc = s.study_plan_courses;
                        const course = spc?.courses;
                        const level = spc?.academic_levels;
                        const venue = s.venues;
                        const groupLabel = level
                          ? `${level.majors?.name ?? ""} - مستوى ${level.level_number}${level.name ? ` (${level.name})` : ""}`
                          : "—";
                        return (
                          <div
                            key={s.id}
                            className="rounded-xl border border-border bg-app-bg/50 p-3"
                          >
                            <p className="mb-2 text-sm font-bold text-text-primary">
                              {course?.name ?? ""}{" "}
                              <span className="text-xs font-normal text-text-secondary">
                                ({course?.code ?? ""})
                              </span>
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-action-blue" />
                                <span>{s.start_time ? `${formatTime(s.start_time)} - ${formatTime(s.end_time)}` : ""}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  s.component_type === "practical"
                                    ? "bg-success/10 text-success"
                                    : "bg-academic-navy/10 text-academic-navy"
                                }`}>
                                  {s.component_type === "practical" ? "عملي" : "نظري"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-purple" />
                                <span>القاعة: {venue?.name || "غير محددة"}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-academic-navy" />
                                <span>{groupLabel}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        </div>

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

      {/* Active Courses */}
      <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-text-primary">موادي النشطة</h2>
        {activeCourses.length === 0 ? (
          <p className="text-sm text-text-secondary">لا توجد مواد نشطة حالياً</p>
        ) : (
          <div className="space-y-2">
            {activeCourses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between rounded-xl border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-academic-navy/10">
                    <FileText className="h-5 w-5 text-academic-navy" />
                  </div>
                  <div>
                    <span className="font-bold text-text-primary">
                      {course.code} — {course.name}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span>{course.semester?.name}</span>
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-academic-navy/10 px-3 py-1 text-xs font-medium text-academic-navy">
                  {course.enrolled_count} طالب
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
