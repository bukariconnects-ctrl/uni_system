"use client";

import { useState, useEffect } from "react";
import {
  uploadMaterial,
  togglePublish,
  toggleAiApproved,
  deleteMaterial,
  upsertSyllabus,
  submitSyllabus,
} from "./actions";
import {
  Plus,
  X,
  Upload,
  FileText,
  Video,
  Presentation,
  Link2,
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  BookOpen,
  Send,
  ChevronDown,
} from "lucide-react";

const CONTENT_TYPES = [
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "video", label: "فيديو", icon: Video },
  { value: "presentation", label: "عرض تقديمي", icon: Presentation },
  { value: "document", label: "مستند", icon: FileText },
  { value: "audio", label: "صوتي", icon: FileText },
  { value: "link", label: "رابط", icon: Link2 },
  { value: "other", label: "أخرى", icon: FileText },
];

const SYLLABUS_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "bg-warning/10 text-warning" },
  submitted: { label: "مُقدَّمة", color: "bg-action-blue/20 text-action-blue" },
  approved: { label: "معتمدة", color: "bg-success/10 text-success" },
  rejected: { label: "مرفوضة", color: "bg-danger/10 text-danger" },
};

export function MaterialsClient({
  courses,
  courseGroups,
  materials,
  syllabi,
}: {
  courses: any[];
  courseGroups: any[];
  materials: any[];
  syllabi: any[];
}) {
  const [tab, setTab] = useState<"materials" | "syllabi">("materials");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tab");
    if (p === "materials" || p === "syllabi") setTab(p);
  }, []);

  function changeTab(t: "materials" | "syllabi") {
    setTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  }
  const [showUpload, setShowUpload] = useState(false);
  const [showSyllabus, setShowSyllabus] = useState(false);
  const [filterCourse, setFilterCourse] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());

  const availableGroups = selectedCourseId
    ? courseGroups.filter((g: any) => g.course_id === selectedCourseId)
    : [];

  function toggleWeek(week: string) {
    setCollapsedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week); else next.add(week);
      return next;
    });
  }

  const filtered = filterCourse
    ? materials.filter((m: any) => m.course_id === filterCourse)
    : materials;

  const grouped = filtered.reduce((acc: Record<number, any[]>, m: any) => {
    const week = m.week_number || 0;
    if (!acc[week]) acc[week] = [];
    acc[week].push(m);
    return acc;
  }, {});

  async function handleAction(action: () => Promise<void>) {
    setLoading(true);
    setError("");
    try {
      await action();
      setShowUpload(false);
      setShowSyllabus(false);
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

      <div className="flex gap-1 rounded-xl bg-app-bg p-1">
        <button
          onClick={() => changeTab("materials")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${tab === "materials" ? "bg-card-bg text-action-blue shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
        >
          <BookOpen className="h-4 w-4" />
          المواد التعليمية
        </button>
        <button
          onClick={() => changeTab("syllabi")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${tab === "syllabi" ? "bg-card-bg text-action-blue shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
        >
          <FileText className="h-4 w-4" />
          خطط المقررات
        </button>
      </div>

      {tab === "materials" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
            >
              <option value="">كل المواد</option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90"
            >
              <Plus className="h-4 w-4" />
              رفع مادة جديدة
            </button>
          </div>

          {showUpload && (
            <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-primary">رفع مادة تعليمية</h3>
                <button onClick={() => setShowUpload(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"><X className="h-5 w-5" /></button>
              </div>
              <form
                action={(fd) => handleAction(() => uploadMaterial(fd))}
                className="grid gap-4 sm:grid-cols-2"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">المادة</label>
                  <select
                    name="course_id"
                    required
                    value={selectedCourseId}
                    onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedGroupId(""); }}
                    className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                  >
                    <option value="">-- اختر --</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
                {availableGroups.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-primary">التخصص / المستوى (اختياري)</label>
                    <select
                      name="group_id"
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                    >
                      <option value="">-- جميع التخصصات --</option>
                      {availableGroups.map((g: any) => (
                        <option key={g.study_plan_course_id} value={g.study_plan_course_id}>
                          {g.major_name || "تخصص"} — مستوى {g.level_number ?? ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">العنوان</label>
                  <input type="text" name="title" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">النوع</label>
                  <select name="content_type" className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                    {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">الأسبوع</label>
                  <input type="number" name="week_number" min="1" max="20" className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-text-primary">الوصف</label>
                  <textarea name="description" rows={2} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-medium text-text-primary">الملف</label>
                  <div className={`flex items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${fileName ? "border-action-blue bg-action-blue/5" : "border-border hover:border-action-blue/50"}`}>
                    <label className="flex cursor-pointer flex-col items-center gap-2">
                      <Upload className={`h-8 w-8 ${fileName ? "text-action-blue" : "text-text-secondary"}`} />
                      <span className={`text-sm ${fileName ? "font-medium text-action-blue" : "text-text-secondary"}`}>
                        {fileName || "اسحب الملف هنا أو اضغط للرفع"}
                      </span>
                      <input type="file" name="file" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name || "")} />
                    </label>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-text-primary">أو أدخل رابطاً</label>
                  <input type="url" name="link_url" placeholder="https://..." dir="ltr" className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" />
                </div>
                <div className="sm:col-span-2">
                  <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-action-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50">
                    <Upload className="h-4 w-4" />
                    {loading ? "جاري الرفع..." : "رفع المادة"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {Object.keys(grouped).length === 0 && !showUpload && (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">لا توجد مواد تعليمية بعد</p>
            </div>
          )}

          {Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([week, items]) => {
              const isCollapsed = collapsedWeeks.has(week);
              return (
                <div key={week} className="overflow-hidden rounded-2xl border border-border bg-card-bg shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggleWeek(week)}
                    className="flex w-full items-center justify-between px-5 py-3.5 text-right transition-colors hover:bg-app-bg/60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-action-blue/20 text-sm font-bold text-action-blue">
                        {Number(week) === 0 ? "—" : week}
                      </span>
                      <span className="text-sm font-bold text-text-primary">
                        {Number(week) === 0 ? "بدون أسبوع" : `الأسبوع ${week}`}
                      </span>
                      <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                        {(items as any[]).length} {(items as any[]).length === 1 ? "مادة" : "مواد"}
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${
                        isCollapsed ? "" : "rotate-180"
                      }`}
                    />
                  </button>

                  {!isCollapsed && (
                    <div className="border-t border-border bg-app-bg/20 p-4">
                      <div className="space-y-2">
                        {(items as any[]).map((material: any) => {
                          const typeInfo = CONTENT_TYPES.find((t) => t.value === material.content_type) || CONTENT_TYPES[5];
                          const TypeIcon = typeInfo.icon;
                          return (
                            <div key={material.id} className="rounded-xl border border-border bg-card-bg p-4 shadow-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-blue/20">
                                    <TypeIcon className="h-5 w-5 text-action-blue" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-text-primary">{material.title}</span>
                                      <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">{typeInfo.label}</span>
                                      {material.is_published ? (
                                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">منشور</span>
                                      ) : (
                                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">مسودة</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                                      {material.file_size_bytes && (
                                        <span>{(material.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                                      )}
                                      <span>{new Date(material.created_at).toLocaleDateString("ar-SA")}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <AiApprovedToggle
                                    materialId={material.id}
                                    approved={material.is_ai_approved}
                                    onToggle={handleAction}
                                  />
                                  <button
                                    onClick={() => handleAction(() => togglePublish(material.id, !material.is_published))}
                                    className={`rounded-lg p-1.5 ${material.is_published ? "text-success hover:bg-success/10" : "text-text-secondary hover:bg-app-bg"}`}
                                    title={material.is_published ? "إلغاء النشر" : "نشر"}
                                  >
                                    {material.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                  </button>
                                  <button
                                    onClick={() => { if (confirm("حذف هذه المادة؟")) handleAction(() => deleteMaterial(material.id)); }}
                                    className="rounded-lg p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {tab === "syllabi" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowSyllabus(!showSyllabus)} className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90">
              <Plus className="h-4 w-4" />
              خطة مقرر جديدة
            </button>
          </div>

          {showSyllabus && (
            <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-primary">إنشاء/تعديل خطة مقرر</h3>
                <button onClick={() => setShowSyllabus(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"><X className="h-5 w-5" /></button>
              </div>
              <form action={(fd) => handleAction(() => upsertSyllabus(fd))} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">المادة</label>
                  <select name="course_id" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                    <option value="">-- اختر --</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">محتوى الخطة (JSON أو نص حر)</label>
                  <textarea name="content" rows={6} required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue font-mono" dir="ltr" placeholder='[{"week":1,"topics":["مقدمة"],"objectives":["فهم المبادئ"]}]' />
                </div>
                <button type="submit" disabled={loading} className="rounded-lg bg-action-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50">
                  {loading ? "جاري الحفظ..." : "حفظ الخطة"}
                </button>
              </form>
            </div>
          )}

          {syllabi.length === 0 && !showSyllabus && (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">لا توجد خطط مقررات بعد</p>
            </div>
          )}

          {syllabi.map((syllabus: any) => {
            const statusInfo = SYLLABUS_STATUS[syllabus.status] || SYLLABUS_STATUS.draft;
            return (
              <div key={syllabus.id} className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple/10">
                      <FileText className="h-5 w-5 text-purple" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary">
                          {syllabus.courses?.code} — {syllabus.courses?.name}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                      </div>
                      <span className="text-xs text-text-secondary">
                        {new Date(syllabus.created_at).toLocaleDateString("ar-SA")}
                      </span>
                    </div>
                  </div>
                  {syllabus.status === "draft" && (
                    <button
                      onClick={() => handleAction(() => submitSyllabus(syllabus.id))}
                      className="flex items-center gap-2 rounded-lg border border-action-blue/30 px-3 py-1.5 text-xs font-medium text-action-blue hover:bg-action-blue/5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      تقديم للاعتماد
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

function AiApprovedToggle({
  materialId,
  approved,
  onToggle,
}: {
  materialId: string;
  approved: boolean;
  onToggle: (action: () => Promise<void>) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex items-center gap-1 text-xs font-semibold transition-colors ${
          approved ? "text-action-blue" : "text-text-secondary"
        }`}
      >
        <Sparkles className="h-3 w-3" />
        معتمد للذكاء الاصطناعي ✨
      </span>
      <button
        type="button"
        onClick={() => onToggle(() => toggleAiApproved(materialId, !approved))}
        title={approved ? "معتمد لـ UniBot AI — اضغط لإلغاء" : "اعتماد لـ UniBot AI"}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 focus:outline-none ${
          approved
            ? "bg-action-blue shadow-[0_0_12px_rgba(49,130,206,0.5)]"
            : "bg-border hover:bg-text-secondary/40"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
            approved ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
