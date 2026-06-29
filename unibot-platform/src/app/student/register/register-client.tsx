"use client";

import { useState } from "react";
import { selfEnroll, checkPrerequisites } from "./actions";
import {
  BookOpen,
  FlaskConical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
  MapPin,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ──────────── Types ──────────── */

interface CourseInfo {
  id: string;
  code: string;
  name: string;
  credit_hours: number;
  course_type: string;
}

interface ScheduleEntry {
  component_type: "theoretical" | "practical";
  day_of_week: string;
  start_time: string;
  end_time: string;
  venues: { name: string; code: string; venue_type: string } | null;
  instructors: { first_name: string; last_name: string } | null;
}

interface CourseRow {
  id: string;
  course_id: string;
  plan_course_type: string;
  min_grade_to_pass: number | null;
  courses: CourseInfo | null;
  isEnrolled: boolean;
  schedules: ScheduleEntry[];
}

interface SemesterInfo {
  id: string;
  name: string;
  status: string;
  self_reg_enabled: boolean;
  reg_start: string | null;
  reg_end: string | null;
  semester_type: string;
}

/* ──────────── Helpers ──────────── */

const DAY_LABELS: Record<string, string> = {
  sunday: "الأحد",
  monday: "الإثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت",
};

function formatTime(t: string) {
  // t is HH:mm:ss or HH:mm — return HH:mm
  return t.slice(0, 5);
}

/* ──────────── Component ──────────── */

export function RegisterClient({
  semester,
  courses,
}: {
  semester: SemesterInfo | null;
  courses: CourseRow[];
}) {
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [prereqStatus, setPrereqStatus] = useState<
    Record<
      string,
      { met: boolean; unmet: { code: string; name: string; minGrade: number }[] } | null
    >
  >({});
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});

  if (!semester) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-bg py-20 text-center">
        <BookOpen className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
        <p className="text-base font-semibold text-text-primary">التسجيل الذاتي غير متاح</p>
        <p className="mt-1 text-sm text-text-secondary">
          لا يوجد فصل دراسي مفتوح للتسجيل الذاتي حالياً، أو ليس لديك تخصص رئيسي
        </p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        {/* Semester Banner */}
        <SemesterBanner semester={semester} />

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-bg py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-base font-semibold text-text-primary">لا توجد مواد متاحة</p>
          <p className="mt-1 text-sm text-text-secondary">
            لم يتم العثور على مواد في خطتك الدراسية لهذا الفصل
          </p>
        </div>
      </div>
    );
  }

  async function handleLoadPrereqs(courseId: string) {
    if (prereqStatus[courseId] !== undefined) return;
    const result = await checkPrerequisites(courseId);
    setPrereqStatus((prev) => ({ ...prev, [courseId]: result }));
  }

  async function handleEnroll(courseId: string) {
    setEnrolling(courseId);
    setErrors((prev) => ({ ...prev, [courseId]: "" }));
    setSuccess(null);
    try {
      await selfEnroll(courseId);
      setSuccess("تم تسجيلك بنجاح");
      // Refresh page after a short delay to show updated state
      setTimeout(() => window.location.reload(), 1000);
    } catch (e: unknown) {
      setErrors((prev) => ({
        ...prev,
        [courseId]: e instanceof Error ? e.message : "حدث خطأ غير متوقع",
      }));
    } finally {
      setEnrolling(null);
    }
  }

  function toggleExpand(courseId: string) {
    setExpandedCourses((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
  }

  return (
    <div className="space-y-6">
      {/* Semester Banner */}
      <SemesterBanner semester={semester} />

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
          <CheckCircle className="h-5 w-5 text-success" />
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      {/* Courses */}
      <div className="space-y-4">
        {courses.map((courseRow) => {
          const course = courseRow.courses;
          if (!course) return null;
          const prereq = prereqStatus[course.id];
          const isExpanded = expandedCourses[course.id] || false;
          const hasUnmetPrereq = prereq != null && !prereq.met;

          return (
            <div
              key={courseRow.id}
              className={`overflow-hidden rounded-2xl border shadow-sm transition-colors ${
                courseRow.isEnrolled
                  ? "border-success/30 bg-card-bg"
                  : "border-border bg-card-bg"
              }`}
            >
              {/* Course Header */}
              <div className="border-b border-border bg-app-bg/60 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-1 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-action-blue/20">
                      <BookOpen className="h-5 w-5 text-action-blue" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold text-text-primary">
                          {course.code}
                        </span>
                        <span className="rounded-full bg-action-blue/20 px-2 py-0.5 text-xs text-action-blue">
                          {course.credit_hours} ساعة
                        </span>
                        {course.course_type === "hybrid" && (
                          <span className="rounded-full bg-purple/10 px-2 py-0.5 text-xs text-purple-500">
                            نظري + عملي
                          </span>
                        )}
                        {courseRow.plan_course_type === "elective" && (
                          <span className="rounded-full bg-amber/10 px-2 py-0.5 text-xs text-amber-500">
                            اختياري
                          </span>
                        )}
                        {courseRow.isEnrolled && (
                          <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                            ✅ مسجل
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-text-secondary">{course.name}</p>

                      {/* Schedule summary when collapsed */}
                      {courseRow.schedules.length > 0 && !isExpanded && (
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                          {courseRow.schedules
                            .filter((s) => s.component_type === "theoretical")
                            .slice(0, 1)
                            .map((s, i) => (
                              <span key={i} className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {DAY_LABELS[s.day_of_week]} {formatTime(s.start_time)}-
                                {formatTime(s.end_time)}
                              </span>
                            ))}
                          {courseRow.schedules.some((s) => s.component_type === "practical") && (
                            <span className="flex items-center gap-1">
                              <FlaskConical className="h-3 w-3" />
                              + عملي
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col items-end gap-2">
                    {/* Prerequisite status */}
                    {!courseRow.isEnrolled && prereq === undefined && (
                      <button
                        onClick={() => handleLoadPrereqs(course.id)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-app-bg"
                      >
                        التحقق من المتطلبات
                      </button>
                    )}
                    {!courseRow.isEnrolled && prereq != null && prereq.met && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-xs font-medium text-success">
                          المتطلبات مكتملة
                        </span>
                      </div>
                    )}
                    {!courseRow.isEnrolled && hasUnmetPrereq && (
                      <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <XCircle className="h-4 w-4 text-danger" />
                          <span className="text-xs font-medium text-danger">
                            متطلبات غير مكتملة
                          </span>
                        </div>
                        <ul className="mt-1 space-y-0.5">
                          {(prereq?.unmet ?? []).map((u) => (
                            <li key={u.code} className="text-xs text-danger">
                              {u.code} — {u.name} (درجة {u.minGrade}+)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Course body — schedule + enroll */}
              <div className="px-5 py-4">
                {/* Schedule entries */}
                {courseRow.schedules.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <button
                      onClick={() => toggleExpand(course.id)}
                      className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      الجدول الزمني ({courseRow.schedules.length})
                    </button>

                    {isExpanded && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {courseRow.schedules.map((sched, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-border bg-app-bg/50 p-3"
                          >
                            <div className="flex items-center gap-1.5">
                              {sched.component_type === "theoretical" ? (
                                <BookOpen className="h-4 w-4 text-action-blue" />
                              ) : (
                                <FlaskConical className="h-4 w-4 text-purple-500" />
                              )}
                              <span className="text-xs font-semibold text-text-primary">
                                {sched.component_type === "theoretical" ? "نظري" : "عملي"}
                              </span>
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-text-secondary">
                              <p className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {DAY_LABELS[sched.day_of_week]} — {formatTime(sched.start_time)}
                                –{formatTime(sched.end_time)}
                              </p>
                              {sched.venues && (
                                <p className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {sched.venues.name} ({sched.venues.code})
                                </p>
                              )}
                              {sched.instructors && (
                                <p className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {sched.instructors.first_name} {sched.instructors.last_name}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* No schedule warning */}
                {courseRow.schedules.length === 0 && !courseRow.isEnrolled && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <p className="text-xs text-warning">
                      لم يتم جدولة هذه المادة بعد — قد لا يتوفر جدول زمني حتى بدء الفصل
                    </p>
                  </div>
                )}

                {/* Error message */}
                {errors[course.id] && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
                    <XCircle className="h-4 w-4 text-danger" />
                    <p className="text-xs text-danger">{errors[course.id]}</p>
                  </div>
                )}

                {/* Enroll Button */}
                {courseRow.isEnrolled ? (
                  <div className="flex items-center gap-2 rounded-xl bg-success/5 px-4 py-2.5 text-sm font-medium text-success">
                    <CheckCircle className="h-5 w-5" />
                    أنت مسجل في هذه المادة
                  </div>
                ) : (
                  <button
                    onClick={() => handleEnroll(course.id)}
                    disabled={enrolling === course.id || hasUnmetPrereq}
                    className="w-full rounded-xl bg-action-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-blue/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {enrolling === course.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري التسجيل...
                      </span>
                    ) : hasUnmetPrereq ? (
                      "❌ متطلبات غير مكتملة"
                    ) : (
                      "تسجيل في المادة"
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────── Semester Banner Sub-component ──────────── */

function SemesterBanner({ semester }: { semester: SemesterInfo }) {
  return (
    <div className="rounded-2xl border border-action-blue/30 bg-action-blue/5 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-action-blue">{semester.name}</p>
          <p className="text-xs text-text-secondary">التسجيل الذاتي مفعّل</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-1.5">
          <CheckCircle className="h-4 w-4 text-success" />
          <span className="text-xs font-medium text-success">مفتوح للتسجيل</span>
        </div>
      </div>
      {(semester.reg_start || semester.reg_end) && (
        <p className="mt-2 text-xs text-text-secondary" dir="ltr">
          {semester.reg_start && `من ${semester.reg_start}`}
          {semester.reg_start && semester.reg_end && " → "}
          {semester.reg_end && `إلى ${semester.reg_end}`}
        </p>
      )}
    </div>
  );
}
