"use client";

import { useState } from "react";
import { submitAssignment } from "./actions";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  X,
  RotateCcw,
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

export function StudentAssignmentsClient({
  assignments,
  submissions,
}: {
  assignments: any[];
  submissions: any[];
}) {
  const [submitId, setSubmitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const submissionMap = new Map(submissions.map((s: any) => [s.assignment_id, s]));

  async function handleSubmit(fd: FormData) {
    setLoading(true);
    setError("");
    const loadingToast = toast.loading("جاري رفع التسليم...");
    try {
      await submitAssignment(fd);
      toast.dismiss(loadingToast);
      toast.success("تم تسليم التكليف بنجاح");
      setSubmitId(null);
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

  return (
    <div className="space-y-4">
      {assignments.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">لا توجد تكاليف منشورة حالياً</p>
        </div>
      )}

      {assignments.map((assignment: any) => {
        const sub = submissionMap.get(assignment.id);
        const isPast = new Date(assignment.due_date) < new Date();
        const canSubmit = !sub || sub.status === "resubmit_requested";
        const showSubmitButton = canSubmit && (!isPast || assignment.allow_late);

        return (
          <div key={assignment.id} className="rounded-2xl border border-border bg-card-bg shadow-sm">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isPast && !sub ? "bg-danger/10" : sub?.status === "graded" ? "bg-success/10" : "bg-action-blue/20"}`}>
                  {sub?.status === "graded" ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : isPast && !sub ? (
                    <AlertCircle className="h-5 w-5 text-danger" />
                  ) : (
                    <FileText className="h-5 w-5 text-action-blue" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary">{assignment.title}</span>
                    <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                      {assignment.courses?.code}
                    </span>
                    {sub && (
                      <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_MAP[sub.status]?.color || ""}`}>
                        {STATUS_MAP[sub.status]?.label || sub.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span className={`flex items-center gap-1 ${isPast ? "text-danger" : ""}`}>
                      <Clock className="h-3 w-3" />
                      {new Date(assignment.due_date).toLocaleString("ar-SA")}
                    </span>
                    <span>الدرجة: {assignment.max_grade}</span>
                    {sub?.grade !== null && sub?.grade !== undefined && (
                      <span className="font-bold text-success">درجتك: {sub.grade}/{assignment.max_grade}</span>
                    )}
                  </div>
                  {sub?.feedback && (
                    <p className="mt-1 text-xs text-text-secondary">ملاحظات: {sub.feedback}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showSubmitButton && (
                  <button
                    onClick={() => setSubmitId(submitId === assignment.id ? null : assignment.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-action-blue/30 px-3 py-1.5 text-xs font-medium text-action-blue hover:bg-action-blue/5"
                  >
                    {sub?.status === "resubmit_requested" ? <RotateCcw className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                    {sub?.status === "resubmit_requested" ? "إعادة تسليم" : "تسليم"}
                  </button>
                )}
                {isPast && !sub && !assignment.allow_late && (
                  <span className="rounded-full bg-danger/10 px-3 py-1 text-xs text-danger">انتهى الموعد</span>
                )}
              </div>
            </div>

            {(assignment.description || assignment.attachment_url) && (
              <div className="border-t border-border px-4 py-3 space-y-2">
                {assignment.description && (
                  <p className="text-sm text-text-secondary">{assignment.description}</p>
                )}
                {assignment.attachment_url && (
                  <a
                    href={assignment.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-action-blue/30 bg-action-blue/5 px-3 py-1.5 text-xs font-medium text-action-blue hover:bg-action-blue/20"
                  >
                    <Download className="h-3.5 w-3.5" />
                    تحميل ملف التكليف
                  </a>
                )}
              </div>
            )}

            {submitId === assignment.id && (
              <div className="border-t border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-text-primary">تسليم التكليف</h4>
                  <button onClick={() => setSubmitId(null)} className="rounded-lg p-1 text-text-secondary hover:bg-app-bg"><X className="h-4 w-4" /></button>
                </div>
                <form action={handleSubmit} className="space-y-3">
                  <input type="hidden" name="assignment_id" value={assignment.id} />
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-primary">رفع ملف</label>
                    <div className={`flex items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors ${fileName ? "border-action-blue bg-action-blue/5" : "border-border hover:border-action-blue/50"}`}>
                      <label className="flex cursor-pointer flex-col items-center gap-1">
                        <Upload className={`h-6 w-6 ${fileName ? "text-action-blue" : "text-text-secondary"}`} />
                        <span className={`text-xs ${fileName ? "font-medium text-action-blue" : "text-text-secondary"}`}>
                          {fileName || "اضغط لرفع الملف"}
                        </span>
                        <input type="file" name="file" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name || "")} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-primary">أو اكتب نص التسليم</label>
                    <textarea name="text_content" rows={3} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg bg-action-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> جاري الرفع...</>
                    ) : (
                      <><Upload className="h-4 w-4" /> تسليم</>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
