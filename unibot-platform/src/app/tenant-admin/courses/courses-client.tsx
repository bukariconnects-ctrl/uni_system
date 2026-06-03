"use client";

import { useState, useEffect } from "react";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  addStudyPlanCourse,
  removeStudyPlanCourse,
  addPrerequisite,
  removePrerequisite,
} from "./actions";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Link2,
  Layers,
  X,
} from "lucide-react";

interface DeptOption {
  id: string;
  name: string;
  code: string | null;
}

interface LevelOption {
  id: string;
  level_number: number;
  name: string | null;
  major_id: string;
  majors: { name: string; code: string | null } | null;
}

interface CourseRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  credit_hours: number;
  course_type: string;
  is_active: boolean;
  department_id: string | null;
  departments: { name: string } | null;
}

interface PlanCourseRow {
  id: string;
  academic_level_id: string;
  course_id: string;
  semester_type: string;
  plan_course_type: string;
  min_grade_to_pass: number;
  courses: { code: string; name: string; credit_hours: number } | null;
  academic_levels: {
    level_number: number;
    name: string | null;
    majors: { name: string } | null;
  } | null;
}

interface PrereqRow {
  id: string;
  course_id: string;
  prerequisite_id: string;
  min_grade: number;
}

const COURSE_TYPES = [
  { value: "theoretical", label: "نظري" },
  { value: "practical", label: "عملي" },
  { value: "hybrid", label: "مختلط" },
];

const SEMESTER_TYPES = [
  { value: "first", label: "الفصل الأول" },
  { value: "second", label: "الفصل الثاني" },
  { value: "summer", label: "صيفي" },
];

const PLAN_TYPES = [
  { value: "mandatory", label: "إجباري" },
  { value: "elective", label: "اختياري" },
];

export function CoursesClient({
  initialCourses,
  departments,
  levels,
  planCourses,
  prerequisites,
}: {
  initialCourses: CourseRow[];
  departments: DeptOption[];
  levels: LevelOption[];
  planCourses: PlanCourseRow[];
  prerequisites: PrereqRow[];
}) {
  const [tab, setTab] = useState<"catalog" | "plan" | "prereq">("catalog");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tab");
    if (p === "catalog" || p === "plan" || p === "prereq") setTab(p as "catalog" | "plan" | "prereq");
  }, []);

  function changeTab(t: "catalog" | "plan" | "prereq") {
    setTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  }
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAction(action: () => Promise<void>) {
    setLoading(true);
    setError("");
    try {
      await action();
      setShowForm(false);
      setEditId(null);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { key: "catalog" as const, label: "كتالوج المقررات", icon: BookOpen },
    { key: "plan" as const, label: "الخطة الدراسية", icon: Layers },
    { key: "prereq" as const, label: "المتطلبات السابقة", icon: Link2 },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="flex gap-1 rounded-xl bg-app-bg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { changeTab(t.key); setShowForm(false); setEditId(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-card-bg text-action-blue shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "catalog" && (
        <CatalogTab
          courses={initialCourses}
          departments={departments}
          showForm={showForm}
          setShowForm={setShowForm}
          editId={editId}
          setEditId={setEditId}
          loading={loading}
          handleAction={handleAction}
        />
      )}

      {tab === "plan" && (
        <PlanTab
          planCourses={planCourses}
          courses={initialCourses}
          levels={levels}
          showForm={showForm}
          setShowForm={setShowForm}
          loading={loading}
          handleAction={handleAction}
        />
      )}

      {tab === "prereq" && (
        <PrereqTab
          prerequisites={prerequisites}
          courses={initialCourses}
          showForm={showForm}
          setShowForm={setShowForm}
          loading={loading}
          handleAction={handleAction}
        />
      )}
    </div>
  );
}

function CatalogTab({
  courses,
  departments,
  showForm,
  setShowForm,
  editId,
  setEditId,
  loading,
  handleAction,
}: {
  courses: CourseRow[];
  departments: DeptOption[];
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  editId: string | null;
  setEditId: (v: string | null) => void;
  loading: boolean;
  handleAction: (a: () => Promise<void>) => Promise<void>;
}) {
  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90"
        >
          <Plus className="h-4 w-4" />
          مقرر جديد
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">مقرر جديد</h3>
            <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg">
              <X className="h-5 w-5" />
            </button>
          </div>
          <CourseForm departments={departments} loading={loading} onSubmit={(fd) => handleAction(() => createCourse(fd))} />
        </div>
      )}

      {courses.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">لا توجد مقررات بعد</p>
        </div>
      )}

      <div className="space-y-2">
        {courses.map((course) => (
          <div key={course.id} className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
            {editId === course.id ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-text-primary">تعديل المقرر</h3>
                  <button onClick={() => setEditId(null)} className="rounded-lg p-1 text-text-secondary hover:bg-app-bg"><X className="h-4 w-4" /></button>
                </div>
                <CourseForm
                  departments={departments}
                  loading={loading}
                  defaultValues={course}
                  onSubmit={(fd) => handleAction(() => updateCourse(course.id, fd))}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${course.is_active ? "bg-action-blue/20" : "bg-app-bg"}`}>
                    <BookOpen className={`h-5 w-5 ${course.is_active ? "text-action-blue" : "text-text-secondary"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary">{course.name}</span>
                      <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary" dir="ltr">{course.code}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${course.course_type === "theoretical" ? "bg-action-blue/20 text-action-blue" : course.course_type === "practical" ? "bg-success/10 text-success" : "bg-purple/10 text-purple"}`}>
                        {COURSE_TYPES.find((t) => t.value === course.course_type)?.label}
                      </span>
                      {!course.is_active && (
                        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">غير نشط</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span>{course.credit_hours} ساعات</span>
                      {course.departments?.name && <span>— {course.departments.name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditId(course.id)} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"><Pencil className="h-4 w-4" /></button>
                  <button
                    onClick={() => { if (confirm("هل أنت متأكد من حذف هذا المقرر؟")) handleAction(() => deleteCourse(course.id)); }}
                    className="rounded-lg p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function PlanTab({
  planCourses,
  courses,
  levels,
  showForm,
  setShowForm,
  loading,
  handleAction,
}: {
  planCourses: PlanCourseRow[];
  courses: CourseRow[];
  levels: LevelOption[];
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  loading: boolean;
  handleAction: (a: () => Promise<void>) => Promise<void>;
}) {
  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90">
          <Plus className="h-4 w-4" />
          ربط مقرر بمستوى
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">ربط مقرر بالخطة الدراسية</h3>
            <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"><X className="h-5 w-5" /></button>
          </div>
          <form action={(fd) => handleAction(() => addStudyPlanCourse(fd))} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">المستوى الدراسي</label>
              <select name="academic_level_id" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                <option value="">-- اختر --</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.majors?.name} — المستوى {l.level_number} {l.name ? `(${l.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">المقرر</label>
              <select name="course_id" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                <option value="">-- اختر --</option>
                {courses.filter((c) => c.is_active).map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">الفصل الدراسي</label>
              <select name="semester_type" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                {SEMESTER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">النوع</label>
              <select name="plan_course_type" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                {PLAN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">الحد الأدنى للنجاح</label>
              <input type="number" name="min_grade_to_pass" defaultValue="60" min="0" max="100" className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={loading} className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50">
                {loading ? "جاري الربط..." : "ربط المقرر"}
              </button>
            </div>
          </form>
        </div>
      )}

      {planCourses.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <Layers className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">لم يتم ربط أي مقررات بالخطة الدراسية بعد</p>
        </div>
      )}

      <div className="space-y-2">
        {planCourses.map((pc) => (
          <div key={pc.id} className="flex items-center justify-between rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${pc.plan_course_type === "mandatory" ? "bg-danger/10" : "bg-teal/10"}`}>
                <Layers className={`h-5 w-5 ${pc.plan_course_type === "mandatory" ? "text-danger" : "text-teal"}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-primary">{pc.courses?.code}</span>
                  <span className="text-sm text-text-secondary">{pc.courses?.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${pc.plan_course_type === "mandatory" ? "bg-danger/10 text-danger" : "bg-teal/10 text-teal"}`}>
                    {PLAN_TYPES.find((t) => t.value === pc.plan_course_type)?.label}
                  </span>
                </div>
                <div className="text-xs text-text-secondary">
                  {pc.academic_levels?.majors?.name} — المستوى {pc.academic_levels?.level_number} — {SEMESTER_TYPES.find((t) => t.value === pc.semester_type)?.label} — {pc.courses?.credit_hours} ساعات — حد النجاح: {pc.min_grade_to_pass}
                </div>
              </div>
            </div>
            <button
              onClick={() => { if (confirm("حذف هذا المقرر من الخطة؟")) handleAction(() => removeStudyPlanCourse(pc.id)); }}
              className="rounded-lg p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function PrereqTab({
  prerequisites,
  courses,
  showForm,
  setShowForm,
  loading,
  handleAction,
}: {
  prerequisites: PrereqRow[];
  courses: CourseRow[];
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  loading: boolean;
  handleAction: (a: () => Promise<void>) => Promise<void>;
}) {
  function courseName(id: string) {
    const c = courses.find((c) => c.id === id);
    return c ? `${c.code} — ${c.name}` : id;
  }

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90">
          <Plus className="h-4 w-4" />
          إضافة متطلب سابق
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">متطلب سابق جديد</h3>
            <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"><X className="h-5 w-5" /></button>
          </div>
          <form action={(fd) => handleAction(() => addPrerequisite(fd))} className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">المقرر</label>
              <select name="course_id" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                <option value="">-- اختر --</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">المتطلب السابق</label>
              <select name="prerequisite_id" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                <option value="">-- اختر --</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">الحد الأدنى للدرجة</label>
              <input type="number" name="min_grade" defaultValue="60" min="0" max="100" className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
            </div>
            <div className="sm:col-span-3">
              <button type="submit" disabled={loading} className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50">
                {loading ? "جاري الإضافة..." : "إضافة المتطلب"}
              </button>
            </div>
          </form>
        </div>
      )}

      {prerequisites.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <Link2 className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">لم يتم تعريف أي متطلبات سابقة بعد</p>
        </div>
      )}

      <div className="space-y-2">
        {prerequisites.map((pr) => (
          <div key={pr.id} className="flex items-center justify-between rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <Link2 className="h-5 w-5 text-warning" />
              </div>
              <div>
                <span className="font-bold text-text-primary">{courseName(pr.course_id)}</span>
                <div className="text-xs text-text-secondary">
                  يتطلب: <span className="font-medium text-text-primary">{courseName(pr.prerequisite_id)}</span> — الحد الأدنى: {pr.min_grade}
                </div>
              </div>
            </div>
            <button
              onClick={() => { if (confirm("حذف هذا المتطلب؟")) handleAction(() => removePrerequisite(pr.id)); }}
              className="rounded-lg p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function CourseForm({
  departments,
  loading,
  defaultValues,
  onSubmit,
}: {
  departments: DeptOption[];
  loading: boolean;
  defaultValues?: CourseRow;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-text-primary">كود المقرر</label>
        <input type="text" name="code" required defaultValue={defaultValues?.code || ""} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" placeholder="CS101" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-primary">اسم المقرر</label>
        <input type="text" name="name" required defaultValue={defaultValues?.name || ""} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-primary">القسم</label>
        <select name="department_id" defaultValue={defaultValues?.department_id || ""} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
          <option value="">-- بدون قسم --</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name} {d.code ? `(${d.code})` : ""}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-primary">نوع المقرر</label>
        <select name="course_type" defaultValue={defaultValues?.course_type || "theoretical"} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
          {COURSE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-primary">الساعات المعتمدة</label>
        <input type="number" name="credit_hours" required min="1" max="12" defaultValue={defaultValues?.credit_hours || 3} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
      </div>
      {defaultValues && (
        <div>
          <label className="mb-1 block text-xs font-medium text-text-primary">الحالة</label>
          <select name="is_active" defaultValue={String(defaultValues.is_active)} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
            <option value="true">نشط</option>
            <option value="false">غير نشط</option>
          </select>
        </div>
      )}
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-text-primary">الوصف (اختياري)</label>
        <textarea name="description" rows={2} defaultValue={defaultValues?.description || ""} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" />
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={loading} className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50">
          {loading ? "جاري الحفظ..." : defaultValues ? "تحديث المقرر" : "إنشاء المقرر"}
        </button>
      </div>
    </form>
  );
}
