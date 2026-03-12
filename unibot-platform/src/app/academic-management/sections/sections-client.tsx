"use client";

import { useState } from "react";
import {
  createSection,
  updateSectionStatus,
  updateSectionInstructor,
  mergeSection,
} from "./actions";
import {
  Plus,
  X,
  BookCopy,
  Lock,
  Unlock,
  Archive,
  Merge,
  UserPlus,
} from "lucide-react";

interface SectionRow {
  id: string;
  section_code: string;
  status: string;
  max_capacity: number;
  enrolled_count: number;
  instructor_id: string | null;
  course_id: string;
  semester_id: string;
  merged_into_id: string | null;
  courses: { code: string; name: string; credit_hours: number } | null;
  semesters: { name: string; status: string } | null;
  profiles: { first_name: string; last_name: string } | null;
}

interface CourseOption { id: string; code: string; name: string }
interface SemesterOption { id: string; name: string; status: string }
interface FacultyOption { id: string; first_name: string; last_name: string }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوحة", color: "bg-success/10 text-success" },
  closed: { label: "مغلقة", color: "bg-danger/10 text-danger" },
  archived: { label: "مؤرشفة", color: "bg-text-secondary/10 text-text-secondary" },
  merged: { label: "مدمجة", color: "bg-warning/10 text-warning" },
};

export function SectionsClient({
  initialSections,
  courses,
  semesters,
  faculty,
}: {
  initialSections: SectionRow[];
  courses: CourseOption[];
  semesters: SemesterOption[];
  faculty: FacultyOption[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [mergeId, setMergeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAction(action: () => Promise<void>) {
    setLoading(true);
    setError("");
    try {
      await action();
      setShowForm(false);
      setAssignId(null);
      setMergeId(null);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90">
          <Plus className="h-4 w-4" />
          شعبة جديدة
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">فتح شعبة جديدة</h3>
            <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"><X className="h-5 w-5" /></button>
          </div>
          <form action={(fd) => handleAction(() => createSection(fd))} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">المقرر</label>
              <select name="course_id" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                <option value="">-- اختر --</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">الفصل الدراسي</label>
              <select name="semester_id" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                <option value="">-- اختر --</option>
                {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">كود الشعبة</label>
              <input type="text" name="section_code" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" placeholder="A" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">المحاضر (اختياري)</label>
              <select name="instructor_id" className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                <option value="">-- بدون --</option>
                {faculty.map((f) => <option key={f.id} value={f.id}>{f.first_name} {f.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">السعة القصوى</label>
              <input type="number" name="max_capacity" defaultValue="40" min="1" className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={loading} className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50">
                {loading ? "جاري الإنشاء..." : "فتح الشعبة"}
              </button>
            </div>
          </form>
        </div>
      )}

      {initialSections.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <BookCopy className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">لا توجد شعب بعد</p>
        </div>
      )}

      <div className="space-y-2">
        {initialSections.map((section) => {
          const statusInfo = STATUS_MAP[section.status] || STATUS_MAP.open;
          return (
            <div key={section.id} className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-blue/10">
                    <BookCopy className="h-5 w-5 text-action-blue" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary">{section.courses?.code} — {section.courses?.name}</span>
                      <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary" dir="ltr">{section.section_code}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-secondary">
                      <span>{section.semesters?.name}</span>
                      <span>{section.enrolled_count}/{section.max_capacity} طالب</span>
                      {section.profiles && <span>المحاضر: {section.profiles.first_name} {section.profiles.last_name}</span>}
                      {!section.profiles && <span className="text-warning">بدون محاضر</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {section.status === "open" && (
                    <>
                      <button onClick={() => setAssignId(assignId === section.id ? null : section.id)} className="rounded-lg p-1.5 text-text-secondary hover:bg-action-blue/10 hover:text-action-blue" title="تعيين محاضر"><UserPlus className="h-4 w-4" /></button>
                      <button onClick={() => handleAction(() => updateSectionStatus(section.id, "closed"))} className="rounded-lg p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger" title="إغلاق"><Lock className="h-4 w-4" /></button>
                      <button onClick={() => setMergeId(mergeId === section.id ? null : section.id)} className="rounded-lg p-1.5 text-text-secondary hover:bg-warning/10 hover:text-warning" title="دمج"><Merge className="h-4 w-4" /></button>
                    </>
                  )}
                  {section.status === "closed" && (
                    <>
                      <button onClick={() => handleAction(() => updateSectionStatus(section.id, "open"))} className="rounded-lg p-1.5 text-text-secondary hover:bg-success/10 hover:text-success" title="إعادة فتح"><Unlock className="h-4 w-4" /></button>
                      <button onClick={() => handleAction(() => updateSectionStatus(section.id, "archived"))} className="rounded-lg p-1.5 text-text-secondary hover:bg-text-secondary/10" title="أرشفة"><Archive className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>

              {assignId === section.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <form action={(fd) => { const iid = fd.get("instructor_id") as string; handleAction(() => updateSectionInstructor(section.id, iid)); }} className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-text-primary">تعيين محاضر</label>
                      <select name="instructor_id" className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                        <option value="">-- بدون محاضر --</option>
                        {faculty.map((f) => <option key={f.id} value={f.id}>{f.first_name} {f.last_name}</option>)}
                      </select>
                    </div>
                    <button type="submit" disabled={loading} className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50">تعيين</button>
                    <button type="button" onClick={() => setAssignId(null)} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-app-bg">إلغاء</button>
                  </form>
                </div>
              )}

              {mergeId === section.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <form action={(fd) => { const tid = fd.get("target_id") as string; if (confirm("هل أنت متأكد من دمج هذه الشعبة؟")) handleAction(() => mergeSection(section.id, tid)); }} className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-text-primary">دمج في الشعبة</label>
                      <select name="target_id" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                        <option value="">-- اختر الشعبة المستهدفة --</option>
                        {initialSections.filter((s) => s.id !== section.id && s.course_id === section.course_id && s.status === "open").map((s) => (
                          <option key={s.id} value={s.id}>{s.section_code} — {s.enrolled_count}/{s.max_capacity}</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" disabled={loading} className="rounded-lg bg-warning px-4 py-2 text-sm font-medium text-white hover:bg-warning/90 disabled:opacity-50">دمج</button>
                    <button type="button" onClick={() => setMergeId(null)} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-app-bg">إلغاء</button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
