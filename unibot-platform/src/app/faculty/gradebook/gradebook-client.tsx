"use client";

import { useState, useEffect } from "react";
import {
  getGradebookEntries,
  initGradebook,
  saveGradeValues,
  publishGrades,
} from "./actions";
import {
  GraduationCap,
  RefreshCw,
  Send,
  Save,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

interface DraftEntry {
  coursework: string;
  midterm: string;
  final: string;
}

export function GradebookClient({
  courses,
  courseGroups,
}: {
  courses: any[];
  courseGroups: any[];
}) {
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedMajorId, setSelectedMajorId] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftEntry>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Derived filter options ────────────────────────────
  const availableGroups = selectedCourseId
    ? courseGroups.filter((g: any) => g.course_id === selectedCourseId)
    : [];

  const uniqueMajors = [
    ...new Map(
      availableGroups.map((g: any) => [
        g.major_id,
        { id: g.major_id, name: g.major_name },
      ])
    ).values(),
  ].filter((m: any) => m.id);

  const levelsForMajor = selectedMajorId
    ? availableGroups.filter((g: any) => g.major_id === selectedMajorId)
    : availableGroups;

  const uniqueLevels = [
    ...new Map(
      levelsForMajor.map((g: any) => [
        g.academic_level_id,
        { id: g.academic_level_id, level: g.level_number },
      ])
    ).values(),
  ].filter((l: any) => l.id);

  const hasFilters = uniqueMajors.length > 0 || uniqueLevels.length > 0;

  // ── Data loading ─────────────────────────────────────
  function initDrafts(data: any[]) {
    const d: Record<string, DraftEntry> = {};
    data.forEach((entry) => {
      d[entry.id] = {
        coursework: entry.coursework_grade?.toString() ?? "",
        midterm: entry.midterm_grade?.toString() ?? "",
        final: entry.final_grade?.toString() ?? "",
      };
    });
    setDrafts(d);
    setDirty(new Set());
  }

  // Reload entries when filters change
  useEffect(() => {
    if (!selectedCourseId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getGradebookEntries(
          selectedCourseId,
          selectedMajorId || undefined,
          selectedLevelId || undefined
        );
        if (!cancelled) {
          setEntries(data);
          initDrafts(data);
        }
      } catch (e: unknown) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "حدث خطأ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedCourseId, selectedMajorId, selectedLevelId]);

  // ── Handlers ─────────────────────────────────────────
  function handleCourseChange(courseId: string) {
    setSelectedCourseId(courseId);
    setSelectedMajorId("");
    setSelectedLevelId("");
    setEntries([]);
    setDrafts({});
    setDirty(new Set());
  }

  function handleMajorChange(majorId: string) {
    setSelectedMajorId(majorId);
    setSelectedLevelId("");
  }

  function handleLevelChange(levelId: string) {
    setSelectedLevelId(levelId);
  }

  async function handleInit() {
    if (!selectedCourseId) return;
    setLoading(true);
    const loadingToast = toast.loading("جاري تهيئة السجل...");
    try {
      await initGradebook(
        selectedCourseId,
        selectedMajorId || undefined,
        selectedLevelId || undefined
      );
      toast.dismiss(loadingToast);
      toast.success("تم تهيئة سجل الدرجات");
      const data = await getGradebookEntries(
        selectedCourseId,
        selectedMajorId || undefined,
        selectedLevelId || undefined
      );
      setEntries(data);
      initDrafts(data);
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      toast.error(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  function handleDraftChange(
    entryId: string,
    field: keyof DraftEntry,
    value: string
  ) {
    setDrafts((prev) => ({
      ...prev,
      [entryId]: { ...prev[entryId], [field]: value },
    }));
    setDirty((prev) => new Set(prev).add(entryId));
  }

  async function handleSaveAll() {
    if (dirty.size === 0) return;
    setSaving(true);
    const loadingToast = toast.loading("جاري حفظ الدرجات...");
    try {
      await Promise.all(
        Array.from(dirty).map((id) => {
          const d = drafts[id];
          return saveGradeValues(
            id,
            d.coursework !== "" ? parseFloat(d.coursework) : null,
            d.midterm !== "" ? parseFloat(d.midterm) : null,
            d.final !== "" ? parseFloat(d.final) : null
          );
        })
      );
      toast.dismiss(loadingToast);
      toast.success("تم حفظ الدرجات بنجاح");
      const data = await getGradebookEntries(
        selectedCourseId,
        selectedMajorId || undefined,
        selectedLevelId || undefined
      );
      setEntries(data);
      initDrafts(data);
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      toast.error(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (
      !selectedCourseId ||
      !confirm("نشر جميع الدرجات؟ سيتمكن الطلاب من رؤيتها.")
    )
      return;
    setLoading(true);
    const loadingToast = toast.loading("جاري نشر الدرجات...");
    try {
      await publishGrades(selectedCourseId);
      toast.dismiss(loadingToast);
      toast.success("تم نشر الدرجات بنجاح");
      const data = await getGradebookEntries(
        selectedCourseId,
        selectedMajorId || undefined,
        selectedLevelId || undefined
      );
      setEntries(data);
      initDrafts(data);
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      toast.error(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  function getDraftTotal(entryId: string): number | null {
    const d = drafts[entryId];
    if (!d) return null;
    const c = d.coursework !== "" ? parseFloat(d.coursework) : 0;
    const m = d.midterm !== "" ? parseFloat(d.midterm) : 0;
    const f = d.final !== "" ? parseFloat(d.final) : 0;
    if (isNaN(c) || isNaN(m) || isNaN(f)) return null;
    return c + m + f;
  }

  const hasUnpublished = entries.some((e: any) => !e.is_published);

  return (
    <div className="space-y-4">
      {/* ── Filters row ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedCourseId}
          onChange={(e) => handleCourseChange(e.target.value)}
          className="rounded-xl border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
        >
          <option value="">— اختر المادة —</option>
          {courses.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>

        {selectedCourseId && hasFilters && (
          <>
            <span className="text-text-secondary/40">|</span>
            <Filter className="h-4 w-4 text-text-secondary" />
            <select
              value={selectedMajorId}
              onChange={(e) => handleMajorChange(e.target.value)}
              className="rounded-xl border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
            >
              <option value="">كل التخصصات</option>
              {uniqueMajors.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <select
              value={selectedLevelId}
              onChange={(e) => handleLevelChange(e.target.value)}
              className="rounded-xl border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
            >
              <option value="">كل المستويات</option>
              {uniqueLevels.map((l: any) => (
                <option key={l.id} value={l.id}>
                  المستوى {l.level ?? ""}
                </option>
              ))}
            </select>
          </>
        )}

        {selectedCourseId && (
          <>
            <button
              onClick={handleInit}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-text-secondary hover:bg-app-bg disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              تهيئة السجل
            </button>

            {dirty.size > 0 && (
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-action-blue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-action-blue/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving
                  ? "جاري الحفظ..."
                  : `حفظ التغييرات (${dirty.size})`}
              </button>
            )}

            {hasUnpublished && entries.length > 0 && dirty.size === 0 && (
              <button
                onClick={handlePublish}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                نشر الدرجات
              </button>
            )}
          </>
        )}
      </div>

      {!selectedCourseId && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">
            اختر مادة لعرض سجل الدرجات
          </p>
        </div>
      )}

      {selectedCourseId && entries.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="mb-2 text-sm text-text-secondary">
            لا توجد سجلات درجات
          </p>
          <p className="text-xs text-text-secondary">
            اضغط &quot;تهيئة السجل&quot; لإنشاء سجلات للطلاب
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-gray-50">
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  الطالب
                </th>
                <th className="border-r border-border px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  أعمال السنة
                  <span className="block text-[10px] font-normal normal-case text-text-secondary/50">(30)</span>
                </th>
                <th className="border-r border-border px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  منتصف الفصل
                  <span className="block text-[10px] font-normal normal-case text-text-secondary/50">(30)</span>
                </th>
                <th className="border-r border-border px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  النهائي
                  <span className="block text-[10px] font-normal normal-case text-text-secondary/50">(40)</span>
                </th>
                <th className="border-r border-border px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-action-blue">
                  المجموع
                  <span className="block text-[10px] font-normal normal-case text-action-blue/50">(100)</span>
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  الحالة
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry: any, idx: number) => {
                const isDirty = dirty.has(entry.id);
                const total = getDraftTotal(entry.id);
                const totalColor =
                  total === null ? "text-text-secondary" :
                  total >= 60 ? "text-success" :
                  total < 50 ? "text-danger" : "text-warning";

                return (
                  <tr
                    key={entry.id}
                    className={`border-b border-border last:border-0 transition-colors ${
                      isDirty ? "bg-action-blue/[0.03]" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                    }`}
                  >
                    <td className="px-5 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-academic-navy text-xs font-bold text-white">
                          {entry.profiles?.first_name?.[0]}{entry.profiles?.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">
                            {entry.profiles?.first_name} {entry.profiles?.last_name}
                          </p>
                          {entry.profiles?.student_profiles?.student_number && (
                            <p className="text-xs text-text-secondary" dir="ltr">
                              {entry.profiles.student_profiles.student_number}
                            </p>
                          )}
                        </div>
                        {isDirty && (
                          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-action-blue" title="تغييرات غير محفوظة" />
                        )}
                      </div>
                    </td>

                    <td className="border-r border-border p-0">
                      <input
                        type="number"
                        value={drafts[entry.id]?.coursework ?? ""}
                        onChange={(e) => handleDraftChange(entry.id, "coursework", e.target.value)}
                        min={0} max={30} step={0.5}
                        className="w-full bg-transparent px-4 py-3 text-center text-sm text-text-primary outline-none transition-colors focus:bg-action-blue/5 focus:ring-1 focus:ring-inset focus:ring-action-blue/30"
                        dir="ltr"
                        placeholder="—"
                      />
                    </td>

                    <td className="border-r border-border p-0">
                      <input
                        type="number"
                        value={drafts[entry.id]?.midterm ?? ""}
                        onChange={(e) => handleDraftChange(entry.id, "midterm", e.target.value)}
                        min={0} max={30} step={0.5}
                        className="w-full bg-transparent px-4 py-3 text-center text-sm text-text-primary outline-none transition-colors focus:bg-action-blue/5 focus:ring-1 focus:ring-inset focus:ring-action-blue/30"
                        dir="ltr"
                        placeholder="—"
                      />
                    </td>

                    <td className="border-r border-border p-0">
                      <input
                        type="number"
                        value={drafts[entry.id]?.final ?? ""}
                        onChange={(e) => handleDraftChange(entry.id, "final", e.target.value)}
                        min={0} max={40} step={0.5}
                        className="w-full bg-transparent px-4 py-3 text-center text-sm text-text-primary outline-none transition-colors focus:bg-action-blue/5 focus:ring-1 focus:ring-inset focus:ring-action-blue/30"
                        dir="ltr"
                        placeholder="—"
                      />
                    </td>

                    <td className="border-r border-border px-4 py-3 text-center">
                      <span className={`text-base font-bold tabular-nums ${totalColor}`}>
                        {total !== null ? (Number.isInteger(total) ? total : total.toFixed(1)) : "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {entry.is_published ? (
                        <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">منشور</span>
                      ) : (
                        <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">مسودة</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
