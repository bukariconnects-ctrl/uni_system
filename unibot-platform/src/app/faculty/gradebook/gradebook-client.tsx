"use client";

import { useState } from "react";
import {
  getGradebookEntries,
  initGradebook,
  updateGrade,
  publishGrades,
} from "./actions";
import {
  GraduationCap,
  RefreshCw,
  Send,
  Save,
} from "lucide-react";

export function GradebookClient({ sections }: { sections: any[] }) {
  const [selectedSection, setSelectedSection] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadEntries(sectionId: string) {
    setSelectedSection(sectionId);
    if (!sectionId) { setEntries([]); return; }
    setLoading(true);
    setError("");
    try {
      const data = await getGradebookEntries(sectionId);
      setEntries(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleInit() {
    if (!selectedSection) return;
    setLoading(true);
    setError("");
    try {
      await initGradebook(selectedSection);
      const data = await getGradebookEntries(selectedSection);
      setEntries(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleGradeUpdate(entryId: string, fd: FormData) {
    setLoading(true);
    setError("");
    try {
      await updateGrade(entryId, fd);
      const data = await getGradebookEntries(selectedSection);
      setEntries(data);
      setEditingId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    if (!selectedSection || !confirm("نشر جميع الدرجات؟ سيتمكن الطلاب من رؤيتها.")) return;
    setLoading(true);
    setError("");
    try {
      await publishGrades(selectedSection);
      const data = await getGradebookEntries(selectedSection);
      setEntries(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  const hasUnpublished = entries.some((e: any) => !e.is_published);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedSection}
          onChange={(e) => loadEntries(e.target.value)}
          className="rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
        >
          <option value="">-- اختر الشعبة --</option>
          {sections.map((s: any) => (
            <option key={s.id} value={s.id}>{s.courses?.code} ({s.section_code})</option>
          ))}
        </select>
        {selectedSection && (
          <>
            <button onClick={handleInit} disabled={loading} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-app-bg disabled:opacity-50">
              <RefreshCw className="h-4 w-4" />
              تهيئة السجل
            </button>
            {hasUnpublished && entries.length > 0 && (
              <button onClick={handlePublish} disabled={loading} className="flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50">
                <Send className="h-4 w-4" />
                نشر الدرجات
              </button>
            )}
          </>
        )}
      </div>

      {!selectedSection && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">اختر شعبة لعرض سجل الدرجات</p>
        </div>
      )}

      {selectedSection && entries.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="mb-2 text-sm text-text-secondary">لا توجد سجلات درجات</p>
          <p className="text-xs text-text-secondary">اضغط &quot;تهيئة السجل&quot; لإنشاء سجلات لجميع الطلاب المسجلين</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card-bg shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-app-bg">
                <th className="px-4 py-3 text-right font-medium text-text-secondary">الطالب</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">أعمال السنة</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">منتصف الفصل</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">النهائي</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">المجموع</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">الحالة</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry: any) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-academic-navy text-xs font-bold text-white">
                        {entry.profiles?.first_name?.[0]}{entry.profiles?.last_name?.[0]}
                      </div>
                      <div>
                        <span className="font-medium text-text-primary">{entry.profiles?.first_name} {entry.profiles?.last_name}</span>
                        {entry.profiles?.student_profiles?.student_number && (
                          <span className="mr-2 text-xs text-text-secondary">{entry.profiles.student_profiles.student_number}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  {editingId === entry.id ? (
                    <td colSpan={4} className="px-4 py-2">
                      <form action={(fd) => handleGradeUpdate(entry.id, fd)} className="flex items-center gap-2">
                        <input type="number" name="coursework_grade" defaultValue={entry.coursework_grade ?? ""} placeholder="أعمال" min={0} max={40} step={0.5} className="w-20 rounded border border-border px-2 py-1 text-center text-sm outline-none focus:border-action-blue" dir="ltr" />
                        <input type="number" name="midterm_grade" defaultValue={entry.midterm_grade ?? ""} placeholder="منتصف" min={0} max={30} step={0.5} className="w-20 rounded border border-border px-2 py-1 text-center text-sm outline-none focus:border-action-blue" dir="ltr" />
                        <input type="number" name="final_grade" defaultValue={entry.final_grade ?? ""} placeholder="نهائي" min={0} max={50} step={0.5} className="w-20 rounded border border-border px-2 py-1 text-center text-sm outline-none focus:border-action-blue" dir="ltr" />
                        <button type="submit" disabled={loading} className="rounded bg-action-blue px-3 py-1 text-xs font-medium text-white"><Save className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => setEditingId(null)} className="rounded border border-border px-3 py-1 text-xs text-text-secondary">إلغاء</button>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-center text-text-primary">{entry.coursework_grade ?? "—"}</td>
                      <td className="px-4 py-3 text-center text-text-primary">{entry.midterm_grade ?? "—"}</td>
                      <td className="px-4 py-3 text-center text-text-primary">{entry.final_grade ?? "—"}</td>
                      <td className="px-4 py-3 text-center font-bold text-action-blue">{entry.total_grade ?? "—"}</td>
                    </>
                  )}
                  <td className="px-4 py-3 text-center">
                    {entry.is_published ? (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">منشور</span>
                    ) : (
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">مسودة</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId !== entry.id && (
                      <button onClick={() => setEditingId(entry.id)} className="rounded-lg px-3 py-1 text-xs text-action-blue hover:bg-action-blue/10">
                        تعديل
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
