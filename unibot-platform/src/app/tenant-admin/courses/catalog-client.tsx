"use client";

import { useState } from "react";
import {
  createCourse,
  updateCourse,
  deleteCourse,
} from "./actions";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Search,
  X,
  FlaskConical,
  BookText,
} from "lucide-react";

interface DeptOption {
  id: string;
  name: string;
  code: string | null;
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

type ModalState =
  | { type: "add" }
  | { type: "edit"; course: CourseRow }
  | null;

export function CatalogClient({
  initialCourses,
  departments,
}: {
  initialCourses: CourseRow[];
  departments: DeptOption[];
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const closeModal = () => {
    setModal(null);
    setError("");
  };

  async function run(action: () => Promise<void>) {
    setLoading(true);
    setError("");
    try {
      await action();
      closeModal();
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المقرر؟")) return;
    await run(() => deleteCourse(id));
  }

  const filtered = initialCourses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = initialCourses.filter((c) => c.is_active).length;
  const totalCredits = initialCourses.reduce((a, c) => a + c.credit_hours, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatBadge icon={<BookOpen className="h-4 w-4" />} label="مقررات" count={initialCourses.length} color="blue" />
          <StatBadge icon={<BookText className="h-4 w-4" />} label="نشط" count={activeCount} color="green" />
          <StatBadge icon={<FlaskConical className="h-4 w-4" />} label="ساعة معتمدة" count={totalCredits} color="purple" />
        </div>
        <button
          onClick={() => setModal({ type: "add" })}
          className="flex items-center gap-2 rounded-xl bg-action-blue px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-action-blue/90"
        >
          <Plus className="h-4 w-4" />
          إضافة مقرر
        </button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          placeholder="بحث بالاسم أو الكود..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-card-bg py-2.5 pr-10 pl-4 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
        />
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-bg py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-action-blue/20">
            <BookOpen className="h-7 w-7 text-action-blue" />
          </div>
          <p className="text-base font-semibold text-text-primary">
            {search ? "لا توجد نتائج" : "لا توجد مقررات بعد"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {search ? "جرب كلمات بحث مختلفة" : "ابدأ بإضافة مقررات لدليل المقررات"}
          </p>
          {!search && (
            <button
              onClick={() => setModal({ type: "add" })}
              className="mt-5 flex items-center gap-2 rounded-xl bg-action-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
            >
              <Plus className="h-4 w-4" />
              إضافة أول مقرر
            </button>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card-bg shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-app-bg text-right">
                <th className="px-4 py-3 font-semibold text-text-primary">الكود</th>
                <th className="px-4 py-3 font-semibold text-text-primary">اسم المقرر</th>
                <th className="px-4 py-3 font-semibold text-text-primary">الساعات</th>
                <th className="px-4 py-3 font-semibold text-text-primary">النوع</th>
                <th className="px-4 py-3 font-semibold text-text-primary">القسم</th>
                <th className="px-4 py-3 font-semibold text-text-primary">الحالة</th>
                <th className="px-4 py-3 font-semibold text-text-primary"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((course) => (
                <tr key={course.id} className="border-b border-border last:border-b-0 hover:bg-app-bg/50">
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary" dir="ltr">
                    {course.code}
                  </td>
                  <td className="px-4 py-3 font-medium text-text-primary">{course.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{course.credit_hours}</td>
                  <td className="px-4 py-3">
                    <CourseTypeBadge type={course.course_type} />
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {course.departments?.name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {course.is_active ? (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">نشط</span>
                    ) : (
                      <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">غير نشط</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModal({ type: "edit", course })}
                        className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-action-blue/20 hover:text-action-blue"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={modal.type === "add" ? "إضافة مقرر جديد" : "تعديل المقرر"}
          onClose={closeModal}
          error={error}
        >
          <CourseForm
            departments={departments}
            loading={loading}
            defaults={modal.type === "edit" ? modal.course : undefined}
            onSubmit={(fd) =>
              run(() =>
                modal.type === "add"
                  ? createCourse(fd)
                  : updateCourse(modal.course.id, fd)
              )
            }
          />
        </Modal>
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

function CourseTypeBadge({ type }: { type: string }) {
  if (type === "theoretical") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-action-blue/20 px-2 py-0.5 text-xs font-medium text-action-blue">
        <BookText className="h-3 w-3" />
        نظري
      </span>
    );
  }
  if (type === "practical") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
        <FlaskConical className="h-3 w-3" />
        عملي
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple/10 px-2 py-0.5 text-xs font-medium text-purple">
      <FlaskConical className="h-3 w-3" />
      مختلط
    </span>
  );
}

function Modal({
  title,
  onClose,
  error,
  children,
}: {
  title: string;
  onClose: () => void;
  error: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-card-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
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
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function CourseForm({
  departments,
  loading,
  defaults,
  onSubmit,
}: {
  departments: DeptOption[];
  loading: boolean;
  defaults?: CourseRow;
  onSubmit: (fd: FormData) => void;
}) {
  const [hasPractical, setHasPractical] = useState(
    defaults ? defaults.course_type !== "theoretical" : false
  );

  function handleSubmit(fd: FormData) {
    fd.set("course_type", hasPractical ? "hybrid" : "theoretical");
    onSubmit(fd);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">
            كود المقرر
          </label>
          <input
            type="text"
            name="code"
            required
            defaultValue={defaults?.code || ""}
            placeholder="CS101"
            dir="ltr"
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">
            اسم المقرر
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={defaults?.name || ""}
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">
            الساعات المعتمدة
          </label>
          <input
            type="number"
            name="credit_hours"
            required
            min="1"
            max="12"
            defaultValue={defaults?.credit_hours || 3}
            dir="ltr"
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">
            القسم (اختياري)
          </label>
          <select
            name="department_id"
            defaultValue={defaults?.department_id || ""}
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
          >
            <option value="">— بدون قسم —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.code ? `(${d.code})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-app-bg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${hasPractical ? "bg-success/10" : "bg-action-blue/20"}`}>
              {hasPractical ? (
                <FlaskConical className="h-5 w-5 text-success" />
              ) : (
                <BookText className="h-5 w-5 text-action-blue" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                يحتوي على جزء عملي/معمل
              </p>
              <p className="text-xs text-text-secondary">
                {hasPractical
                  ? "المقرر يتضمن ساعات عملية أو معملية"
                  : "المقرر نظري بالكامل"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHasPractical(!hasPractical)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              hasPractical ? "bg-success" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                hasPractical ? "right-0.5" : "right-[22px]"
              }`}
            />
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-text-primary">
          الوصف (اختياري)
        </label>
        <textarea
          name="description"
          rows={2}
          defaultValue={defaults?.description || ""}
          className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
        />
      </div>

      {defaults && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">
            الحالة
          </label>
          <select
            name="is_active"
            defaultValue={String(defaults.is_active)}
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
          >
            <option value="true">نشط</option>
            <option value="false">غير نشط</option>
          </select>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-action-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
      >
        {loading ? "جاري الحفظ..." : defaults ? "تحديث المقرر" : "إنشاء المقرر"}
      </button>
    </form>
  );
}
