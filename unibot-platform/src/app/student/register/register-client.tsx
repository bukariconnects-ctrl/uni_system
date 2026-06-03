"use client";

import { useState } from "react";
import { selfEnroll, checkPrerequisites } from "./actions";
import { BookOpen, FlaskConical, Users, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

interface SectionRow {
  id: string;
  section_code: string;
  max_capacity: number;
  enrolled_count: number;
  section_type: string | null;
  course_id: string;
  courses: { code: string; name: string; course_type: string; credit_hours: number } | null;
}

interface LabSectionRow {
  id: string;
  section_code: string;
  max_capacity: number;
  enrolled_count: number;
  parent_section_id: string | null;
  profiles: { first_name: string; last_name: string } | null;
}

interface SemesterInfo {
  id: string;
  name: string;
  status: string;
  self_reg_enabled: boolean;
  reg_start: string | null;
  reg_end: string | null;
}

export function RegisterClient({
  semester,
  sections,
  labSections,
}: {
  semester: SemesterInfo | null;
  sections: SectionRow[];
  labSections: LabSectionRow[];
}) {
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedLab, setSelectedLab] = useState<Record<string, string>>({});
  const [prereqStatus, setPrereqStatus] = useState<Record<string, { met: boolean; unmet: { code: string; name: string; minGrade: number }[] } | null>>({});

  if (!semester) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-bg py-20 text-center">
        <BookOpen className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
        <p className="text-base font-semibold text-text-primary">التسجيل الذاتي غير متاح</p>
        <p className="mt-1 text-sm text-text-secondary">لا يوجد فصل دراسي مفتوح للتسجيل الذاتي حالياً</p>
      </div>
    );
  }

  const groupedByCourse = sections.reduce<Record<string, { course: SectionRow["courses"]; sections: SectionRow[] }>>((acc, s) => {
    const cid = s.course_id;
    if (!acc[cid]) acc[cid] = { course: s.courses, sections: [] };
    acc[cid].sections.push(s);
    return acc;
  }, {});

  async function handleLoadPrereqs(courseId: string) {
    if (prereqStatus[courseId] !== undefined) return;
    const result = await checkPrerequisites(courseId);
    setPrereqStatus((prev) => ({ ...prev, [courseId]: result }));
  }

  async function handleEnroll(section: SectionRow) {
    const labId = selectedLab[section.id];
    const isHybrid = section.courses?.course_type === "hybrid";
    if (isHybrid && !labId) {
      setErrors((prev) => ({ ...prev, [section.id]: "يجب اختيار شعبة معمل أولاً" }));
      return;
    }
    setEnrolling(section.id);
    setErrors((prev) => ({ ...prev, [section.id]: "" }));
    setSuccess(null);
    try {
      await selfEnroll(section.id, labId || undefined);
      setSuccess(`تم تسجيلك بنجاح في ${section.courses?.code} — ${section.section_code}`);
      window.location.reload();
    } catch (e: unknown) {
      setErrors((prev) => ({ ...prev, [section.id]: e instanceof Error ? e.message : "حدث خطأ غير متوقع" }));
    } finally {
      setEnrolling(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Semester Info Banner */}
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
            {semester.reg_start && `Registration: ${semester.reg_start}`}
            {semester.reg_start && semester.reg_end && " → "}
            {semester.reg_end && semester.reg_end}
          </p>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
          <CheckCircle className="h-5 w-5 text-success" />
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-bg py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-base font-semibold text-text-primary">لا توجد شعب متاحة</p>
          <p className="mt-1 text-sm text-text-secondary">تم التسجيل في جميع الشعب المتاحة أو لا توجد شعب مفتوحة</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByCourse).map(([courseId, { course, sections: courseSections }]) => {
            const prereq = prereqStatus[courseId];
            const courseLabs = labSections.filter((l) => courseSections.some((s) => s.id === l.parent_section_id));

            return (
              <div key={courseId} className="overflow-hidden rounded-2xl border border-border bg-card-bg shadow-sm">
                {/* Course Header */}
                <div className="border-b border-border bg-app-bg/60 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-text-primary">{course?.code}</span>
                        <span className="rounded-full bg-action-blue/20 px-2 py-0.5 text-xs text-action-blue">
                          {course?.credit_hours} ساعة
                        </span>
                        {course?.course_type === "hybrid" && (
                          <span className="rounded-full bg-purple/10 px-2 py-0.5 text-xs text-purple">هجين</span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">{course?.name}</p>
                    </div>

                    {/* Prerequisite status */}
                    {prereq === undefined ? (
                      <button
                        onClick={() => handleLoadPrereqs(courseId)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-app-bg"
                      >
                        التحقق من المتطلبات
                      </button>
                    ) : (prereq != null && prereq.met) ? (
                      <div className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-xs font-medium text-success">المتطلبات مكتملة</span>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <XCircle className="h-4 w-4 text-danger" />
                          <span className="text-xs font-medium text-danger">متطلبات غير مكتملة</span>
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

                {/* Sections */}
                <div className="divide-y divide-border">
                  {courseSections.map((section) => {
                    const fill = section.max_capacity > 0 ? Math.round((section.enrolled_count / section.max_capacity) * 100) : 0;
                    const isFull = fill >= 100;
                    const sectionLabs = labSections.filter((l) => l.parent_section_id === section.id);
                    const isHybrid = course?.course_type === "hybrid";
                    const hasUnmetPrereq = prereq != null && !prereq.met;

                    return (
                      <div key={section.id} className="p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-blue/20">
                              <BookOpen className="h-5 w-5 text-action-blue" />
                            </div>
                            <div>
                              <span className="font-bold text-text-primary" dir="ltr">{section.section_code}</span>
                              <div className={`mt-0.5 flex items-center gap-1 text-xs ${isFull ? "text-danger" : fill >= 80 ? "text-warning" : "text-text-secondary"}`}>
                                <Users className="h-3 w-3" />
                                {section.enrolled_count}/{section.max_capacity}
                                {isFull && " — ممتلئة"}
                              </div>
                            </div>
                          </div>

                          {/* Capacity bar */}
                          <div className="w-32">
                            <div className="h-1.5 overflow-hidden rounded-full bg-app-bg">
                              <div
                                className={`h-full rounded-full ${isFull ? "bg-danger" : fill >= 80 ? "bg-warning" : "bg-success"}`}
                                style={{ width: `${Math.min(fill, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Lab section picker for hybrid courses */}
                        {isHybrid && sectionLabs.length > 0 && (
                          <div className="mt-4 rounded-xl border border-purple/20 bg-purple/5 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <FlaskConical className="h-4 w-4 text-purple" />
                              <span className="text-xs font-semibold text-purple">اختر شعبة المعمل</span>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {sectionLabs.map((lab) => {
                                const labFill = lab.max_capacity > 0 ? Math.round((lab.enrolled_count / lab.max_capacity) * 100) : 0;
                                const labFull = labFill >= 100;
                                return (
                                  <label
                                    key={lab.id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                                      selectedLab[section.id] === lab.id
                                        ? "border-purple bg-purple/10"
                                        : labFull
                                        ? "cursor-not-allowed border-border opacity-50"
                                        : "border-border hover:border-purple/40"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`lab-${section.id}`}
                                      value={lab.id}
                                      disabled={labFull}
                                      checked={selectedLab[section.id] === lab.id}
                                      onChange={() => setSelectedLab((prev) => ({ ...prev, [section.id]: lab.id }))}
                                      className="accent-purple"
                                    />
                                    <div>
                                      <p className="text-sm font-medium text-text-primary" dir="ltr">{lab.section_code}</p>
                                      <p className="text-xs text-text-secondary">
                                        {lab.profiles ? `${lab.profiles.first_name} ${lab.profiles.last_name}` : "بدون محاضر"} —{" "}
                                        <span className={labFull ? "text-danger" : "text-success"}>{lab.enrolled_count}/{lab.max_capacity}</span>
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {isHybrid && sectionLabs.length === 0 && (
                          <div className="mt-3 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            <p className="text-xs text-warning">لا توجد شعب معمل مفتوحة لهذه الشعبة</p>
                          </div>
                        )}

                        {errors[section.id] && (
                          <div className="mt-3 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
                            <XCircle className="h-4 w-4 text-danger" />
                            <p className="text-xs text-danger">{errors[section.id]}</p>
                          </div>
                        )}

                        <button
                          onClick={() => handleEnroll(section)}
                          disabled={isFull || enrolling === section.id || !!hasUnmetPrereq || (isHybrid && !selectedLab[section.id])}
                          className="mt-4 w-full rounded-xl bg-action-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-blue/90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {enrolling === section.id ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              جاري التسجيل...
                            </span>
                          ) : isFull ? (
                            "الشعبة ممتلئة"
                          ) : hasUnmetPrereq ? (
                            "❌ متطلبات غير مكتملة"
                          ) : (
                            "تسجيل"
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
