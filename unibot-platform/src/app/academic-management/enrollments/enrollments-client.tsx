"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getStudyPlanCoursesForEnrollment,
  batchEnroll,
  getEnrollments,
  updateEnrollmentStatus,
} from "./actions";
import {
  Users,
  CheckCircle,
  AlertCircle,
  UserMinus,
  UserPlus,
  BookOpen,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";

/* ──────────── Types ──────────── */

interface Major {
  id: string;
  name: string;
  code: string;
  department_id: string;
}

interface Semester {
  id: string;
  name: string;
  status: string;
  semester_type: string;
}

interface AcademicLevel {
  id: string;
  name: string;
  level_number: number;
  major_id: string;
}

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
  student_profiles: { student_number: string }[];
}

interface CourseOption {
  id: string;
  course_id: string;
  plan_course_type: string;
  min_grade_to_pass: number | null;
  courses: {
    id: string;
    code: string;
    name: string;
    credit_hours: number;
    course_type: string;
  }[];
}

interface EnrollmentRow {
  id: string;
  status: string;
  enrolled_at: string;
  student_id: string;
  course_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    student_profiles: { student_number: string }[];
  }[];
  courses: { code: string; name: string; credit_hours: number }[];
  semesters: { name: string }[];
}

/* ──────────── Constants ──────────── */

const ENROLLMENT_STATUS: Record<string, { label: string; color: string }> = {
  enrolled: { label: "مسجل", color: "bg-success/10 text-success" },
  dropped: { label: "منسحب", color: "bg-danger/10 text-danger" },
  completed: { label: "مكتمل", color: "bg-action-blue/20 text-action-blue" },
  failed: { label: "راسب", color: "bg-danger/10 text-danger" },
  dismissed: { label: "مفصول", color: "bg-text-secondary/10 text-text-secondary" },
  withdrawn: { label: "منسحب كلياً", color: "bg-warning/10 text-warning" },
};

/* ──────────── Client Component ──────────── */

export function EnrollmentsClient({
  majors,
  semesters,
  academicLevels,
  students,
}: {
  majors: Major[];
  semesters: Semester[];
  academicLevels: AcademicLevel[];
  students: StudentOption[];
}) {
  /* ── Tabs ── */
  const [tab, setTab] = useState<"batch" | "list">("batch");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tab");
    if (p === "batch" || p === "list") setTab(p);
  }, []);

  function changeTab(t: "batch" | "list") {
    setTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  }

  /* ── Filters (shared between batch & list) ── */
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");

  /* ── Courses (batch tab) ── */
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(false);

  /* ── Students (batch tab) ── */
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  const filteredStudents = students.filter(student => 
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.student_profiles?.[0]?.student_number?.includes(studentSearch)
  );

  function toggleStudent(id: string) {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function selectAllStudents() {
    if (selectedStudents.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s) => s.id));
    }
  }

  /* ── Enrollment (batch tab) ── */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  /* ── Enrollments list ── */
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [listFilterCourse, setListFilterCourse] = useState("");

  /* ── Derived ── */
  const filteredLevels = academicLevels.filter(
    (l) => !selectedMajor || l.major_id === selectedMajor
  );
  const semesterObj = semesters.find((s) => s.id === selectedSemester);

  /* ── Handlers ── */

  const handleLoadCourses = useCallback(async () => {
    if (!selectedLevel || !semesterObj) return;
    setLoadingCourses(true);
    setSelectedCourse("");
    try {
      const data = await getStudyPlanCoursesForEnrollment(
        selectedLevel,
        semesterObj.semester_type
      );
      setCourses(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "حدث خطأ أثناء تحميل المواد";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoadingCourses(false);
    }
  }, [selectedLevel, semesterObj]);

  async function handleBatchEnroll() {
    if (!selectedCourse || selectedStudents.length === 0) {
      toast.error("يرجى اختيار المادة وطالب واحد على الأقل");
      return;
    }

    setLoading(true);
    setResult(null);
    const loadingToast = toast.loading("جاري تسجيل الطلاب...");

    try {
      const res = await batchEnroll(selectedCourse, selectedSemester, selectedStudents);
      setResult(res);
      toast.dismiss(loadingToast);
      if (res.success > 0) {
        toast.success(`تم تسجيل ${res.success} طالب بنجاح`);
        setSelectedStudents([]);
      }
      if (res.errors.length > 0) {
        toast.error(`فشل تسجيل ${res.errors.length} طالب`);
      }
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadEnrollments() {
    setLoadingEnrollments(true);
    try {
      const data = await getEnrollments(
        listFilterCourse || undefined,
        selectedSemester || undefined
      );
      setEnrollments(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoadingEnrollments(false);
    }
  }

  async function handleStatusChange(id: string, status: "enrolled" | "dropped") {
    setLoading(true);
    const loadingToast = toast.loading("جاري تغيير الحالة...");
    try {
      await updateEnrollmentStatus(id, status);
      const data = await getEnrollments(
        listFilterCourse || undefined,
        selectedSemester || undefined
      );
      setEnrollments(data);
      toast.dismiss(loadingToast);
      toast.success(status === "enrolled" ? "تم إعادة تسجيل الطالب" : "تم سحب الطالب");
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function resetBatchState() {
    setResult(null);
    setError("");
  }

  /* ── Render ── */
  return (
    <div className="space-y-4">
      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl bg-app-bg p-1">
        <button
          onClick={() => { changeTab("batch"); resetBatchState(); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "batch"
              ? "bg-card-bg text-action-blue shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <UserPlus className="h-4 w-4" />
          تسجيل جماعي
        </button>
        <button
          onClick={() => { changeTab("list"); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "list"
              ? "bg-card-bg text-action-blue shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Users className="h-4 w-4" />
          سجل التسجيلات
        </button>
      </div>

      {/* ═══════════════════════════ BATCH TAB ═══════════════════════════ */}
      {tab === "batch" && (
        <div className="space-y-4">
          {/* ── Filters ── */}
          <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-text-primary">تصفية المواد</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Major */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  التخصص
                </label>
                <select
                  value={selectedMajor}
                  onChange={(e) => {
                    setSelectedMajor(e.target.value);
                    setSelectedLevel("");
                    setCourses([]);
                    setSelectedCourse("");
                    resetBatchState();
                  }}
                  className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
                >
                  <option value="">-- اختر التخصص --</option>
                  {majors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Level */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  المستوى
                </label>
                <select
                  value={selectedLevel}
                  onChange={(e) => {
                    setSelectedLevel(e.target.value);
                    setCourses([]);
                    setSelectedCourse("");
                    resetBatchState();
                  }}
                  disabled={!selectedMajor}
                  className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue disabled:opacity-50"
                >
                  <option value="">-- اختر المستوى --</option>
                  {filteredLevels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  الفصل
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => {
                    setSelectedSemester(e.target.value);
                    setCourses([]);
                    setSelectedCourse("");
                    resetBatchState();
                  }}
                  className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
                >
                  <option value="">-- اختر الفصل --</option>
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.semester_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleLoadCourses}
              disabled={!selectedLevel || !selectedSemester || loadingCourses}
              className="mt-4 flex items-center gap-2 rounded-lg bg-action-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50"
            >
              {loadingCourses ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              عرض المواد
            </button>
          </div>

          {/* ── Course Selection ── */}
          <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-text-primary">اختر المادة</h3>

            {/* No filters yet */}
            {courses.length === 0 && !loadingCourses && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <BookOpen className="h-10 w-10 text-text-secondary" />
                <p className="text-sm text-text-secondary">
                  {!selectedLevel || !selectedSemester
                    ? "اختر التخصص والمستوى والفصل ثم اضغط عرض المواد"
                    : "لا توجد مواد في الخطة الدراسية لهذا المستوى والفصل"}
                </p>
              </div>
            )}

            {/* Loading courses */}
            {loadingCourses && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-action-blue" />
              </div>
            )}

            {/* Courses list */}
            {courses.length > 0 && !loadingCourses && (
              <div className="space-y-2">
                {courses.map((spc) => {
                  const course = Array.isArray(spc.courses) ? spc.courses[0] : spc.courses;
                  const isHybrid = course?.course_type === "hybrid";
                  return (
                    <label
                      key={spc.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        selectedCourse === spc.course_id
                          ? "border-action-blue bg-action-blue/5"
                          : "border-border hover:bg-app-bg"
                      }`}
                    >
                      <input
                        type="radio"
                        name="course"
                        value={spc.course_id}
                        checked={selectedCourse === spc.course_id}
                        onChange={() => setSelectedCourse(spc.course_id)}
                        className="h-4 w-4 text-action-blue accent-action-blue"
                      />
                      <div className="flex flex-1 items-center gap-2">
                        <BookOpen className="h-5 w-5 text-action-blue" />
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-sm font-medium text-text-primary">
                            {course?.code} — {course?.name}
                          </span>
                          <span className="text-xs text-text-secondary">
                            ({course?.credit_hours} ساعات)
                          </span>
                          {isHybrid && (
                            <span className="rounded bg-warning/10 px-1.5 py-0.5 text-xs text-warning">
                              نظري + عملي
                            </span>
                          )}
                          {spc.plan_course_type === "elective" && (
                            <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-xs text-purple-500">
                              اختياري
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Student Selection ── */}
          <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">اختر الطلاب</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">
                  {selectedStudents.length} محدد
                </span>
                <button
                  onClick={selectAllStudents}
                  className="rounded-lg border border-action-blue/30 px-3 py-1.5 text-xs font-medium text-action-blue hover:bg-action-blue/5"
                >
                  {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0 ? "إلغاء الكل" : "تحديد الكل"}
                </button>
              </div>
            </div>

            <div className="mb-4 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                type="text"
                placeholder="ابحث باسم الطالب أو الرقم الجامعي..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-app-bg pr-10 pl-3 py-2 text-sm outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
              />
            </div>

            {filteredStudents.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-secondary">
                {students.length === 0 ? "لا يوجد طلاب نشطون" : "لا توجد نتائج مطابقة للبحث"}
              </p>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                {filteredStudents.map((student) => (
                  <label
                    key={student.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors ${
                      selectedStudents.includes(student.id)
                        ? "bg-action-blue/5 border border-action-blue/20"
                        : "hover:bg-app-bg border border-transparent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="h-4 w-4 rounded border-border text-action-blue accent-action-blue"
                    />
                    <div>
                      <span className="text-sm font-medium text-text-primary">
                        {student.first_name} {student.last_name}
                      </span>
                      {student.student_profiles?.[0]?.student_number && (
                        <span className="mr-2 text-xs text-text-secondary">
                          ({student.student_profiles?.[0]?.student_number})
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-border pt-4">
              <button
                onClick={handleBatchEnroll}
                disabled={loading || !selectedCourse || selectedStudents.length === 0}
                className="flex items-center gap-2 rounded-lg bg-action-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {loading
                  ? "جاري التسجيل..."
                  : `تسجيل ${selectedStudents.length} طالب`}
              </button>
            </div>
          </div>

          {/* ── Batch Result ── */}
          {result && (
            <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-bold text-text-primary">
                  تم تسجيل {result.success} طالب بنجاح
                </span>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm text-danger">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">
                      {result.errors.length} أخطاء:
                    </span>
                  </div>
                  <div className="max-h-32 overflow-y-auto rounded-lg bg-danger/5 p-3">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-danger">
                        {err}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════ LIST TAB ═══════════════════════════ */}
      {tab === "list" && (
        <div className="space-y-4">
          {/* List Filters */}
          <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  الفصل
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
                >
                  <option value="">-- جميع الفصول --</option>
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  المادة
                </label>
                <select
                  value={listFilterCourse}
                  onChange={(e) => setListFilterCourse(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
                >
                  <option value="">-- جميع المواد --</option>
                  {courses.map((spc) => (
                    <option key={spc.course_id} value={spc.course_id}>
                      {spc.courses?.[0]?.code} — {spc.courses?.[0]?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleLoadEnrollments}
                  disabled={loadingEnrollments}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50"
                >
                  {loadingEnrollments ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  عرض التسجيلات
                </button>
              </div>
            </div>
          </div>

          {/* Enrollments count */}
          {enrollments.length > 0 && (
            <div className="rounded-xl border border-border bg-card-bg p-3">
              <span className="text-sm text-text-secondary">
                {enrollments.length} تسجيل (آخر 200)
              </span>
            </div>
          )}

          {/* Loading state */}
          {loadingEnrollments && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-action-blue" />
            </div>
          )}

          {/* Empty state */}
          {!loadingEnrollments && enrollments.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">
                اختر الفصل والمادة ثم اضغط عرض التسجيلات
              </p>
            </div>
          )}

          {/* Enrollments list */}
          {!loadingEnrollments &&
            enrollments.map((enrollment) => {
              const statusInfo =
                ENROLLMENT_STATUS[enrollment.status] || ENROLLMENT_STATUS.enrolled;
              return (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card-bg p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-academic-navy text-xs font-bold text-white">
                      {enrollment.profiles?.[0]?.first_name?.[0]}
                      {enrollment.profiles?.[0]?.last_name?.[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary">
                          {enrollment.profiles?.[0]?.first_name}{" "}
                          {enrollment.profiles?.[0]?.last_name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        {enrollment.profiles?.[0]?.student_profiles?.[0]?.student_number && (
                          <span>
                            ({enrollment.profiles?.[0]?.student_profiles?.[0]?.student_number})
                          </span>
                        )}
                        <span>
                          {enrollment.courses?.[0]?.code} — {enrollment.courses?.[0]?.name}
                        </span>
                        <span>{enrollment.semesters?.[0]?.name}</span>
                        <span>
                          {new Date(enrollment.enrolled_at).toLocaleDateString(
                            "ar-SA"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {enrollment.status === "enrolled" && (
                      <button
                        onClick={() =>
                          handleStatusChange(enrollment.id, "dropped")
                        }
                        className="rounded-lg p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger"
                        title="سحب"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}
                    {enrollment.status === "dropped" && (
                      <button
                        onClick={() =>
                          handleStatusChange(enrollment.id, "enrolled")
                        }
                        className="rounded-lg p-1.5 text-text-secondary hover:bg-success/10 hover:text-success"
                        title="إعادة تسجيل"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
