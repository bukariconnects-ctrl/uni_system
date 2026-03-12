"use client";

import { useState } from "react";
import {
  createSemester,
  updateSemester,
  updateSemesterStatus,
} from "./actions";
import {
  Plus,
  X,
  Pencil,
  CalendarDays,
  Play,
  Archive,
  Clock,
} from "lucide-react";
import type { Semester, SemesterStatus } from "@/lib/types/database";

const SEMESTER_TYPES = [
  { value: "fall", label: "الفصل الأول (خريف)" },
  { value: "spring", label: "الفصل الثاني (ربيع)" },
  { value: "summer", label: "الفصل الصيفي" },
];

const STATUS_MAP: Record<SemesterStatus, { label: string; color: string }> = {
  planning: { label: "تخطيط", color: "bg-warning/10 text-warning" },
  active: { label: "نشط", color: "bg-success/10 text-success" },
  archived: { label: "مؤرشف", color: "bg-text-secondary/10 text-text-secondary" },
};

export function CalendarClient({
  initialSemesters,
}: {
  initialSemesters: Semester[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(formData: FormData) {
    setLoading(true);
    setError("");
    try {
      await createSemester(formData);
      setShowForm(false);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string, formData: FormData) {
    setLoading(true);
    setError("");
    try {
      await updateSemester(id, formData);
      setEditingId(null);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(
    id: string,
    status: "planning" | "active" | "archived"
  ) {
    const messages: Record<string, string> = {
      active: "هل تريد تفعيل هذا الفصل الدراسي؟",
      archived:
        "هل تريد أرشفة هذا الفصل؟ سيتم تجميد الدرجات وترقية الطلاب الناجحين.",
      planning: "هل تريد إرجاع هذا الفصل لحالة التخطيط؟",
    };
    if (!confirm(messages[status])) return;
    setLoading(true);
    setError("");
    try {
      await updateSemesterStatus(id, status);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
        >
          <Plus className="h-4 w-4" />
          فصل دراسي جديد
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">فصل دراسي جديد</h2>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <SemesterForm onSubmit={handleCreate} loading={loading} />
        </div>
      )}

      <div className="space-y-4">
        {initialSemesters.map((semester) => {
          const statusInfo = STATUS_MAP[semester.status];

          return (
            <div
              key={semester.id}
              className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm"
            >
              {editingId === semester.id ? (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-text-primary">
                      تعديل الفصل
                    </h3>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <SemesterForm
                    onSubmit={(fd) => handleUpdate(semester.id, fd)}
                    loading={loading}
                    defaultValues={semester}
                    isEdit
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10">
                        <CalendarDays className="h-5 w-5 text-teal" />
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary">
                          {semester.name}
                        </h3>
                        <p className="text-sm text-text-secondary">
                          {semester.academic_year} —{" "}
                          {SEMESTER_TYPES.find(
                            (t) => t.value === semester.semester_type
                          )?.label || semester.semester_type}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <DateField
                      label="بداية الفصل"
                      value={semester.start_date}
                    />
                    <DateField
                      label="نهاية الفصل"
                      value={semester.end_date}
                    />
                    <DateField
                      label="بداية التسجيل"
                      value={semester.reg_start}
                    />
                    <DateField
                      label="نهاية التسجيل"
                      value={semester.reg_end}
                    />
                    <DateField
                      label="بداية الحذف والإضافة"
                      value={semester.add_drop_start}
                    />
                    <DateField
                      label="نهاية الحذف والإضافة"
                      value={semester.add_drop_end}
                    />
                    <DateField
                      label="تجميد الدرجات"
                      value={semester.grade_freeze_at}
                    />
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-border pt-4">
                    <button
                      onClick={() => setEditingId(semester.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-app-bg"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      تعديل التواريخ
                    </button>

                    {semester.status === "planning" && (
                      <button
                        onClick={() =>
                          handleStatusChange(semester.id, "active")
                        }
                        disabled={loading}
                        className="flex items-center gap-1.5 rounded-lg border border-success/30 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/10"
                      >
                        <Play className="h-3.5 w-3.5" />
                        تفعيل
                      </button>
                    )}

                    {semester.status === "active" && (
                      <button
                        onClick={() =>
                          handleStatusChange(semester.id, "archived")
                        }
                        disabled={loading}
                        className="flex items-center gap-1.5 rounded-lg border border-warning/30 px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/10"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        أرشفة وإنهاء
                      </button>
                    )}

                    {semester.status === "archived" && (
                      <span className="flex items-center gap-1.5 rounded-lg bg-app-bg px-3 py-1.5 text-xs text-text-secondary">
                        <Clock className="h-3.5 w-3.5" />
                        تم الأرشفة
                        {semester.grade_freeze_at &&
                          ` — ${new Date(
                            semester.grade_freeze_at
                          ).toLocaleDateString("ar-SA")}`}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {initialSemesters.length === 0 && !showForm && (
          <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
            <p className="text-sm text-text-secondary">
              لا توجد فصول دراسية بعد
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm font-medium text-action-blue hover:underline"
            >
              إنشاء أول فصل دراسي
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-text-secondary">{label}</p>
      <p className="font-medium text-text-primary">
        {value
          ? new Date(value).toLocaleDateString("ar-SA", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—"}
      </p>
    </div>
  );
}

function SemesterForm({
  onSubmit,
  loading,
  defaultValues,
  isEdit,
}: {
  onSubmit: (formData: FormData) => void;
  loading: boolean;
  defaultValues?: Semester;
  isEdit?: boolean;
}) {
  return (
    <form action={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {!isEdit && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              السنة الأكاديمية
            </label>
            <input
              type="text"
              name="academic_year"
              defaultValue={defaultValues?.academic_year || ""}
              required
              className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
              placeholder="2025-2026"
              dir="ltr"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              نوع الفصل
            </label>
            <select
              name="semester_type"
              defaultValue={defaultValues?.semester_type || "fall"}
              className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
            >
              {SEMESTER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              اسم الفصل
            </label>
            <input
              type="text"
              name="name"
              defaultValue={defaultValues?.name || ""}
              required
              className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
              placeholder="الفصل الدراسي الأول 2025-2026"
            />
          </div>
        </>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          بداية الفصل
        </label>
        <input
          type="date"
          name="start_date"
          defaultValue={
            defaultValues?.start_date
              ? defaultValues.start_date.split("T")[0]
              : ""
          }
          required
          className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
          dir="ltr"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          نهاية الفصل
        </label>
        <input
          type="date"
          name="end_date"
          defaultValue={
            defaultValues?.end_date
              ? defaultValues.end_date.split("T")[0]
              : ""
          }
          required
          className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
          dir="ltr"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          بداية التسجيل
        </label>
        <input
          type="date"
          name="reg_start"
          defaultValue={
            defaultValues?.reg_start
              ? defaultValues.reg_start.split("T")[0]
              : ""
          }
          className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
          dir="ltr"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          نهاية التسجيل
        </label>
        <input
          type="date"
          name="reg_end"
          defaultValue={
            defaultValues?.reg_end
              ? defaultValues.reg_end.split("T")[0]
              : ""
          }
          className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
          dir="ltr"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          بداية الحذف والإضافة
        </label>
        <input
          type="date"
          name="add_drop_start"
          defaultValue={
            defaultValues?.add_drop_start
              ? defaultValues.add_drop_start.split("T")[0]
              : ""
          }
          className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
          dir="ltr"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          نهاية الحذف والإضافة
        </label>
        <input
          type="date"
          name="add_drop_end"
          defaultValue={
            defaultValues?.add_drop_end
              ? defaultValues.add_drop_end.split("T")[0]
              : ""
          }
          className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
          dir="ltr"
        />
      </div>

      {isEdit && (
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">
            تجميد الدرجات
          </label>
          <input
            type="date"
            name="grade_freeze_at"
            defaultValue={
              defaultValues?.grade_freeze_at
                ? defaultValues.grade_freeze_at.split("T")[0]
                : ""
            }
            className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
            dir="ltr"
          />
        </div>
      )}

      <div className="sm:col-span-2 lg:col-span-3">
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
        >
          {loading
            ? "جاري الحفظ..."
            : isEdit
            ? "تحديث التواريخ"
            : "إنشاء الفصل"}
        </button>
      </div>
    </form>
  );
}
