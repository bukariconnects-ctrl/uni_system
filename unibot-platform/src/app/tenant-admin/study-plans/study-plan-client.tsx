"use client";

import { useState, useEffect } from "react";
import {
  getStudyPlanCourses,
  getPrerequisites,
  addStudyPlanCourse,
  removeStudyPlanCourse,
  addPrerequisite,
  removePrerequisite,
} from "./actions";
import {
  Plus,
  Trash2,
  BookOpen,
  GraduationCap,
  Link2,
  X,
  ChevronDown,
  FlaskConical,
  BookText,
  Clock,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface LevelNode {
  id: string;
  level_number: number;
  name: string | null;
}

interface MajorNode {
  id: string;
  name: string;
  code: string | null;
  department_id: string | null;
  departments: { name: string; colleges: { name: string } | null } | null;
  academic_levels: LevelNode[];
}

interface CourseOption {
  id: string;
  code: string;
  name: string;
  credit_hours: number;
  course_type: string;
  department_id: string | null;
}

interface PlanCourseRow {
  id: string;
  academic_level_id: string;
  course_id: string;
  semester_type: string;
  plan_course_type: string;
  min_grade_to_pass: number;
  courses: CourseOption | null;
}

interface PrereqRow {
  id: string;
  course_id: string;
  prerequisite_id: string;
  min_grade: number;
  courses: { code: string; name: string } | null;
}

type ModalState =
  | { type: "add-course"; levelId: string; semester: string }
  | { type: "add-prereq"; courseId: string; courseName: string }
  | null;

const SEMESTERS = [
  { value: "first", label: "الفصل الأول" },
  { value: "second", label: "الفصل الثاني" },
  { value: "summer", label: "الصيفي" },
];

export function StudyPlanClient({
  majors,
  courses,
}: {
  majors: MajorNode[];
  courses: CourseOption[];
}) {
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [planCourses, setPlanCourses] = useState<PlanCourseRow[]>([]);
  const [prerequisites, setPrerequisites] = useState<PrereqRow[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  const major = majors.find((m) => m.id === selectedMajor);
  const levels = major?.academic_levels?.sort((a, b) => a.level_number - b.level_number) || [];

  // Filter courses to only show those from the selected major's department
  const departmentCourses = courses.filter(
    (c) => !selectedMajor || !major?.department_id || c.department_id === major.department_id
  );

  useEffect(() => {
    if (!selectedMajor) {
      setPlanCourses([]);
      setPrerequisites([]);
      return;
    }
    setFetching(true);
    Promise.all([getStudyPlanCourses(selectedMajor), getPrerequisites(selectedMajor)])
      .then(([pc, pr]) => {
        setPlanCourses(pc);
        setPrerequisites(pr);
      })
      .catch((e) => { const msg = e.message; toast.error(msg); setError(msg); })
      .finally(() => setFetching(false));
  }, [selectedMajor]);

  const closeModal = () => {
    setModal(null);
  };

  async function run(action: () => Promise<void>, successMsg?: string) {
    setLoading(true);
    const loadingToast = toast.loading("جاري تنفيذ العملية...");
    try {
      await action();
      closeModal();
      const [pc, pr] = await Promise.all([
        getStudyPlanCourses(selectedMajor),
        getPrerequisites(selectedMajor),
      ]);
      setPlanCourses(pc);
      setPrerequisites(pr);
      toast.dismiss(loadingToast);
      toast.success(successMsg || "تمت العملية بنجاح");
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ غير متوقع";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveCourse(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المقرر من الخطة؟")) return;
    await run(() => removeStudyPlanCourse(id), "تم حذف المقرر من الخطة");
  }

  async function handleRemovePrereq(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المتطلب؟")) return;
    await run(() => removePrerequisite(id), "تم حذف المتطلب");
  }

  function getCellCourses(levelId: string, semester: string) {
    return planCourses.filter(
      (pc) => pc.academic_level_id === levelId && pc.semester_type === semester
    );
  }

  function getCoursePrereqs(courseId: string) {
    return prerequisites.filter((p) => p.course_id === courseId);
  }

  function getTotalCredits(levelId: string, semester: string) {
    return getCellCourses(levelId, semester).reduce(
      (sum, pc) => sum + (pc.courses?.credit_hours || 0),
      0
    );
  }

  const totalPlanCredits = planCourses.reduce(
    (sum, pc) => sum + (pc.courses?.credit_hours || 0),
    0
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-action-blue/20">
            <GraduationCap className="h-5 w-5 text-action-blue" />
          </div>
          <div className="relative min-w-[280px]">
            <select
              value={selectedMajor}
              onChange={(e) => setSelectedMajor(e.target.value)}
              className="w-full appearance-none rounded-xl border border-border bg-card-bg py-2.5 pr-4 pl-10 text-sm font-medium text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
            >
              <option value="">— اختر التخصص —</option>
              {majors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.code ? `(${m.code})` : ""} — {m.departments?.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          </div>
        </div>

        {selectedMajor && (
          <div className="flex items-center gap-3">
            <StatBadge
              icon={<BookOpen className="h-4 w-4" />}
              label="مقررات"
              count={planCourses.length}
              color="blue"
            />
            <StatBadge
              icon={<Clock className="h-4 w-4" />}
              label="ساعة"
              count={totalPlanCredits}
              color="green"
            />
            <StatBadge
              icon={<Link2 className="h-4 w-4" />}
              label="متطلبات"
              count={prerequisites.length}
              color="purple"
            />
          </div>
        )}
      </div>

      {!selectedMajor && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-bg py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-action-blue/20">
            <GraduationCap className="h-8 w-8 text-action-blue" />
          </div>
          <p className="text-base font-semibold text-text-primary">اختر تخصصاً لعرض الخطة الدراسية</p>
          <p className="mt-1 text-sm text-text-secondary">
            حدد التخصص من القائمة أعلاه لبدء بناء أو تعديل الخطة الدراسية
          </p>
        </div>
      )}

      {selectedMajor && fetching && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-action-blue border-t-transparent" />
        </div>
      )}

      {selectedMajor && !fetching && levels.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-bg py-16 text-center">
          <p className="text-base font-semibold text-text-primary">لا توجد مستويات دراسية</p>
          <p className="mt-1 text-sm text-text-secondary">
            أضف مستويات دراسية لهذا التخصص من صفحة الهيكل التنظيمي أولاً
          </p>
        </div>
      )}

      {selectedMajor && !fetching && levels.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card-bg shadow-sm">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-app-bg">
                <th className="w-40 px-4 py-3 text-right text-sm font-semibold text-text-primary">
                  المستوى
                </th>
                {SEMESTERS.map((sem) => (
                  <th
                    key={sem.value}
                    className="px-4 py-3 text-center text-sm font-semibold text-text-primary"
                  >
                    {sem.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {levels.map((level) => (
                <tr key={level.id} className="border-b border-border last:border-b-0">
                  <td className="border-l border-border bg-app-bg/50 px-4 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-academic-navy/10 text-sm font-bold text-academic-navy">
                        {level.level_number}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          المستوى {level.level_number}
                        </p>
                        {level.name && (
                          <p className="text-xs text-text-secondary">{level.name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  {SEMESTERS.map((sem) => {
                    const cellCourses = getCellCourses(level.id, sem.value);
                    const cellCredits = getTotalCredits(level.id, sem.value);
                    return (
                      <td
                        key={sem.value}
                        className="border-l border-border px-3 py-3 align-top last:border-l-0"
                      >
                        <div className="min-h-[120px] space-y-2">
                          {cellCourses.map((pc) => (
                            <CourseCard
                              key={pc.id}
                              planCourse={pc}
                              prereqs={getCoursePrereqs(pc.course_id)}
                              onRemove={() => handleRemoveCourse(pc.id)}
                              onAddPrereq={() =>
                                setModal({
                                  type: "add-prereq",
                                  courseId: pc.course_id,
                                  courseName: pc.courses?.name || "",
                                })
                              }
                              onRemovePrereq={handleRemovePrereq}
                            />
                          ))}
                          <button
                            onClick={() =>
                              setModal({ type: "add-course", levelId: level.id, semester: sem.value })
                            }
                            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-text-secondary transition-colors hover:border-action-blue hover:bg-action-blue/5 hover:text-action-blue"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            إضافة مقرر
                          </button>
                          {cellCredits > 0 && (
                            <div className="text-center text-xs text-text-secondary">
                              {cellCredits} ساعة
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.type === "add-course" && (
        <AddCourseModal
          levelId={modal.levelId}
          semester={modal.semester}
          courses={departmentCourses}
          existingCourseIds={planCourses.map((pc) => pc.course_id)}
          loading={loading}
          error={error}
          onClose={closeModal}
          onSubmit={(fd) => run(() => addStudyPlanCourse(fd), "تمت إضافة المقرر")}
        />
      )}

      {modal?.type === "add-prereq" && (
        <AddPrereqModal
          courseId={modal.courseId}
          courseName={modal.courseName}
          courses={departmentCourses}
          existingPrereqIds={prerequisites
            .filter((p) => p.course_id === modal.courseId)
            .map((p) => p.prerequisite_id)}
          loading={loading}
          error={error}
          onClose={closeModal}
          onSubmit={(fd) => run(() => addPrerequisite(fd), "تمت إضافة المتطلب")}
        />
      )}
    </div>
  );
}

function StatBadge({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: "blue" | "green" | "purple";
}) {
  const colors = {
    blue: "bg-action-blue/20 text-action-blue",
    green: "bg-success/10 text-success",
    purple: "bg-purple/10 text-purple",
  };
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${colors[color]}`}>
      {icon}
      <span className="text-base font-bold">{count}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function CourseCard({
  planCourse,
  prereqs,
  onRemove,
  onAddPrereq,
  onRemovePrereq,
}: {
  planCourse: PlanCourseRow;
  prereqs: PrereqRow[];
  onRemove: () => void;
  onAddPrereq: () => void;
  onRemovePrereq: (id: string) => void;
}) {
  const course = planCourse.courses;
  if (!course) return null;

  const isMandatory = planCourse.plan_course_type === "mandatory";
  const borderColor = isMandatory ? "border-l-danger" : "border-l-teal";
  const typeLabel = isMandatory ? "إجباري" : "اختياري";
  const typeBg = isMandatory ? "bg-danger/10 text-danger" : "bg-teal/10 text-teal";

  return (
    <div
      className={`group relative rounded-lg border border-border bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md border-l-4 ${borderColor}`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-text-primary" title={course.name}>
            {course.name}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-text-secondary">
            <span dir="ltr" className="font-mono">
              {course.code}
            </span>
            <span>•</span>
            <span>{course.credit_hours} س</span>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="rounded p-0.5 text-text-secondary opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${typeBg}`}>
          {typeLabel}
        </span>
        {course.course_type !== "theoretical" && (
          <span className="inline-flex items-center gap-0.5 rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
            <FlaskConical className="h-2.5 w-2.5" />
            عملي
          </span>
        )}
      </div>

      {prereqs.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-border pt-2">
          <p className="text-[10px] font-semibold text-text-secondary">المتطلبات:</p>
          {prereqs.map((pr) => (
            <div
              key={pr.id}
              className="flex items-center justify-between rounded bg-app-bg px-1.5 py-1"
            >
              <span className="text-[10px] text-text-primary">
                {pr.courses?.code} — {pr.courses?.name}
              </span>
              <button
                onClick={() => onRemovePrereq(pr.id)}
                className="rounded p-0.5 text-text-secondary hover:bg-danger/10 hover:text-danger"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAddPrereq}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-1 text-[10px] font-medium text-text-secondary transition-colors hover:border-purple hover:bg-purple/5 hover:text-purple"
      >
        <Link2 className="h-2.5 w-2.5" />
        ربط متطلب
      </button>
    </div>
  );
}

function AddCourseModal({
  levelId,
  semester,
  courses,
  existingCourseIds,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  levelId: string;
  semester: string;
  courses: CourseOption[];
  existingCourseIds: string[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [planType, setPlanType] = useState<"mandatory" | "elective">("mandatory");
  const [search, setSearch] = useState("");

  const availableCourses = courses.filter(
    (c) =>
      !existingCourseIds.includes(c.id) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()))
  );

  const semesterLabel = SEMESTERS.find((s) => s.value === semester)?.label || semester;

  function handleSubmit() {
    if (!selectedCourse) return;
    const fd = new FormData();
    fd.set("academic_level_id", levelId);
    fd.set("course_id", selectedCourse);
    fd.set("semester_type", semester);
    fd.set("plan_course_type", planType);
    fd.set("min_grade_to_pass", "60");
    onSubmit(fd);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-card-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">إضافة مقرر</h2>
            <p className="text-xs text-text-secondary">{semesterLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="بحث بالاسم أو الكود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-app-bg py-2.5 pr-4 pl-4 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
            />
          </div>

          <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-border bg-app-bg p-2">
            {availableCourses.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-secondary">
                {search ? "لا توجد نتائج" : "جميع المقررات مُضافة بالفعل"}
              </p>
            ) : (
              availableCourses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCourse(c.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-right transition-colors ${
                    selectedCourse === c.id
                      ? "bg-action-blue/20 text-action-blue"
                      : "hover:bg-card-bg"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-text-secondary">
                      <span dir="ltr" className="font-mono">
                        {c.code}
                      </span>{" "}
                      — {c.credit_hours} ساعات
                    </p>
                  </div>
                  {selectedCourse === c.id && <Check className="h-4 w-4 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">
              نوع المقرر في الخطة
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPlanType("mandatory")}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  planType === "mandatory"
                    ? "bg-danger/10 text-danger"
                    : "bg-app-bg text-text-secondary hover:bg-card-bg"
                }`}
              >
                إجباري
              </button>
              <button
                type="button"
                onClick={() => setPlanType("elective")}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  planType === "elective"
                    ? "bg-teal/10 text-teal"
                    : "bg-app-bg text-text-secondary hover:bg-card-bg"
                }`}
              >
                اختياري
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !selectedCourse}
            className="w-full rounded-xl bg-action-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
          >
            {loading ? "جاري الإضافة..." : "إضافة المقرر"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddPrereqModal({
  courseId,
  courseName,
  courses,
  existingPrereqIds,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  courseId: string;
  courseName: string;
  courses: CourseOption[];
  existingPrereqIds: string[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const [selectedPrereq, setSelectedPrereq] = useState("");
  const [search, setSearch] = useState("");

  const availableCourses = courses.filter(
    (c) =>
      c.id !== courseId &&
      !existingPrereqIds.includes(c.id) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()))
  );

  function handleSubmit() {
    if (!selectedPrereq) return;
    const fd = new FormData();
    fd.set("course_id", courseId);
    fd.set("prerequisite_id", selectedPrereq);
    fd.set("min_grade", "60");
    onSubmit(fd);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-card-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">ربط متطلب سابق</h2>
            <p className="text-xs text-text-secondary">للمقرر: {courseName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="بحث بالاسم أو الكود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-app-bg py-2.5 pr-4 pl-4 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
            />
          </div>

          <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-border bg-app-bg p-2">
            {availableCourses.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-secondary">
                {search ? "لا توجد نتائج" : "لا توجد مقررات متاحة"}
              </p>
            ) : (
              availableCourses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedPrereq(c.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-right transition-colors ${
                    selectedPrereq === c.id
                      ? "bg-purple/10 text-purple"
                      : "hover:bg-card-bg"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-text-secondary">
                      <span dir="ltr" className="font-mono">
                        {c.code}
                      </span>{" "}
                      — {c.credit_hours} ساعات
                    </p>
                  </div>
                  {selectedPrereq === c.id && <Check className="h-4 w-4 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !selectedPrereq}
            className="w-full rounded-xl bg-purple py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple/90 disabled:opacity-50"
          >
            {loading ? "جاري الربط..." : "ربط المتطلب"}
          </button>
        </div>
      </div>
    </div>
  );
}
