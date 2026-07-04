"use client";

import { useState } from "react";
import {
  createAssignment,
  toggleAssignmentPublish,
  deleteAssignment,
  getSubmissions,
  gradeSubmission,
  requestResubmission,
} from "./actions";
import {
  Plus,
  X,
  FileText,
  Eye,
  EyeOff,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  submitted: { label: "مُسلَّم", color: "bg-action-blue/20 text-action-blue" },
  late: { label: "متأخر", color: "bg-warning/10 text-warning" },
  graded: { label: "مُصحَّح", color: "bg-success/10 text-success" },
  resubmit_requested: { label: "مطلوب إعادة", color: "bg-danger/10 text-danger" },
};

export function AssignmentsClient({
  courses,
  courseGroups,
  assignments,
}: {
  courses: any[];
  courseGroups: any[];
  assignments: any[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const availableGroups = selectedCourseId
    ? courseGroups.filter((g: any) => g.course_id === selectedCourseId)
    : [];

  async function handleAction(action: () => Promise<void>, successMsg?: string) {
    setLoading(true);
    setError("");
    const loadingToast = toast.loading("جاري تنفيذ العملية...");
    try {
      await action();
      toast.dismiss(loadingToast);
      toast.success(successMsg || "تمت العملية بنجاح");
      setShowForm(false);
      window.location.reload();
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadSubmissions(assignmentId: string) {
    if (expandedId === assignmentId) {
      setExpandedId(null);
      return;
    }
    setLoading(true);
    try {
      const data = await getSubmissions(assignmentId);
      setSubmissions(data);
      setExpandedId(assignmentId);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90">
          <Plus className="h-4 w-4" />
          تكليف جديد
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">إنشاء تكليف</h3>
            <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"><X className="h-5 w-5" /></button>
          </div>
          <form action={(fd) => handleAction(() => createAssignment(fd), "تم إنشاء التكليف")} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">المقرر</label>
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
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-primary">الوصف</label>
              <textarea name="description" rows={3} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">الدرجة القصوى</label>
              <input type="number" name="max_grade" defaultValue={100} min={1} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">موعد التسليم</label>
              <input type="datetime-local" name="due_date" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">الأسبوع</label>
              <input type="number" name="week_number" min={1} max={20} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
            </div>
            <div className="flex items-center gap-2">
              <input type="hidden" name="allow_late" value="false" />
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input type="checkbox" name="allow_late" value="true" className="h-4 w-4 rounded accent-action-blue" />
                السماح بالتسليم المتأخر
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-primary">
                ملف مرفق للتكليف <span className="text-text-secondary">(اختياري — PDF, DOC, صورة...)</span>
              </label>
              <input
                type="file"
                name="attachment"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip"
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm text-text-secondary outline-none focus:border-action-blue file:ml-3 file:rounded-md file:border-0 file:bg-action-blue/20 file:px-3 file:py-1 file:text-xs file:font-medium file:text-action-blue hover:file:bg-action-blue/20"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-action-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري الإنشاء...</> : "إنشاء التكليف"}
              </button>
            </div>
          </form>
        </div>
      )}

      {assignments.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">لا توجد تكاليف بعد</p>
        </div>
      )}

      {assignments.map((assignment: any) => {
        const isPast = new Date(assignment.due_date) < new Date();
        const isExpanded = expandedId === assignment.id;

        return (
          <div key={assignment.id} className="rounded-2xl border border-border bg-card-bg shadow-sm">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isPast ? "bg-text-secondary/10" : "bg-action-blue/20"}`}>
                  <FileText className={`h-5 w-5 ${isPast ? "text-text-secondary" : "text-action-blue"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary">{assignment.title}</span>
                    <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                      {assignment.courses?.code}
                    </span>
                    {assignment.is_published ? (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">منشور</span>
                    ) : (
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">مسودة</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(assignment.due_date).toLocaleString("ar-SA")}
                    </span>
                    <span>الدرجة: {assignment.max_grade}</span>
                    {assignment.allow_late && <span className="text-warning">يقبل المتأخر</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => loadSubmissions(assignment.id)} disabled={loading} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg disabled:opacity-50">
                  {loading && expandedId !== assignment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleAction(() => toggleAssignmentPublish(assignment.id, !assignment.is_published), assignment.is_published ? "تم إخفاء التكليف" : "تم نشر التكليف")}
                  className={`rounded-lg p-1.5 ${assignment.is_published ? "text-success hover:bg-success/10" : "text-text-secondary hover:bg-app-bg"}`}
                >
                  {assignment.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => { if (confirm("حذف هذا التكليف؟")) handleAction(() => deleteAssignment(assignment.id), "تم حذف التكليف"); }}
                  className="rounded-lg p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-border p-4">
                <h4 className="mb-3 text-sm font-bold text-text-primary">التسليمات ({submissions.length})</h4>
                {submissions.length === 0 ? (
                  <p className="text-sm text-text-secondary">لا توجد تسليمات بعد</p>
                ) : (
                  <div className="space-y-2">
                    {submissions.map((sub: any) => {
                      const statusInfo = STATUS_MAP[sub.status] || STATUS_MAP.submitted;
                      return (
                        <div key={sub.id} className="rounded-xl border border-border p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-academic-navy text-xs font-bold text-white">
                                {sub.profiles?.first_name?.[0]}{sub.profiles?.last_name?.[0]}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-text-primary">{sub.profiles?.first_name} {sub.profiles?.last_name}</span>
                                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-text-secondary">
                                  {sub.profiles?.student_profiles?.student_number && (
                                    <span>{sub.profiles.student_profiles.student_number}</span>
                                  )}
                                  <span>{new Date(sub.submitted_at).toLocaleString("ar-SA")}</span>
                                  {sub.grade !== null && <span className="font-medium text-success">الدرجة: {sub.grade}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {sub.file_url && (
                                <a
                                  href={`/api/storage/download?url=${encodeURIComponent(sub.file_url)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"
                                  title="تحميل التسليم"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              )}
                              {sub.status !== "graded" && (
                                <button onClick={() => setGradingId(gradingId === sub.id ? null : sub.id)} className="rounded-lg p-1.5 text-text-secondary hover:bg-success/10 hover:text-success" title="تصحيح">
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              {sub.status !== "resubmit_requested" && sub.status !== "graded" && (
                                <button onClick={() => handleAction(() => requestResubmission(sub.id), "تم طلب إعادة التسليم")} className="rounded-lg p-1.5 text-text-secondary hover:bg-warning/10 hover:text-warning" title="طلب إعادة تسليم">
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          {sub.text_content && (
                            <p className="mt-2 rounded-lg bg-app-bg p-2 text-xs text-text-secondary">{sub.text_content}</p>
                          )}
                          {gradingId === sub.id && (
                            <form action={(fd) => handleAction(() => gradeSubmission(sub.id, fd), "تم تصحيح التسليم")} className="mt-3 flex items-end gap-3 border-t border-border pt-3">
                              <div className="flex-1">
                                <label className="mb-1 block text-xs font-medium text-text-primary">الدرجة (من {assignment.max_grade})</label>
                                <input type="number" name="grade" min={0} max={assignment.max_grade} step={0.5} required defaultValue={sub.grade ?? ""} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
                              </div>
                              <div className="flex-1">
                                <label className="mb-1 block text-xs font-medium text-text-primary">ملاحظات</label>
                                <input type="text" name="feedback" defaultValue={sub.feedback ?? ""} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" />
                              </div>
                              <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
                                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                {loading ? "جاري..." : "تصحيح"}
                              </button>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
