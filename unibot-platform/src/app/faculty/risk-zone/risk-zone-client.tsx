"use client";

import { useState } from "react";
import { AlertTriangle, Send, TrendingUp, X } from "lucide-react";
import { sendFacultyRecommendation } from "./actions";

const riskColors: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-orange/10", text: "text-orange", label: "مرتفع" },
  critical: { bg: "bg-danger/10", text: "text-danger", label: "حرج" },
};

interface RiskScore {
  id: string;
  student_id: string;
  section_id: string;
  risk_level: string;
  risk_score: number;
  absence_factor: number;
  grade_factor: number;
  engagement_factor: number;
  profiles?: { first_name: string; last_name: string; email: string };
  sections?: { section_code: string; courses: { name: string } | null };
}

export function RiskZoneClient({
  riskScores,
}: {
  riskScores: RiskScore[];
}) {
  const [showRec, setShowRec] = useState<string | null>(null);
  const [recName, setRecName] = useState("");
  const [recSectionId, setRecSectionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSend(formData: FormData) {
    setError("");
    setSuccess("");
    try {
      await sendFacultyRecommendation(formData);
      setSuccess("تم إرسال التوصية بنجاح");
      setShowRec(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
          <AlertTriangle className="h-6 w-6 text-danger" />
          منطقة الخطر
        </h1>
        <p className="text-sm text-text-secondary">
          الطلاب المعرّضون لخطر أكاديمي مرتفع أو حرج في شعبك
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          {success}
        </div>
      )}

      {riskScores.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card-bg p-12 text-center">
          <TrendingUp className="mx-auto mb-3 h-12 w-12 text-success/50" />
          <p className="text-lg font-medium text-text-primary">
            لا يوجد طلاب في منطقة الخطر
          </p>
          <p className="text-sm text-text-secondary">
            جميع طلابك في وضع أكاديمي جيد
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {riskScores.map((score) => {
            const risk = riskColors[score.risk_level] || riskColors.high;
            return (
              <div
                key={score.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card-bg p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-academic-navy text-xs font-bold text-white">
                  {score.profiles?.first_name?.[0]}
                  {score.profiles?.last_name?.[0]}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-text-primary">
                      {score.profiles?.first_name} {score.profiles?.last_name}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${risk.bg} ${risk.text}`}
                    >
                      {risk.label}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {score.sections?.courses?.name} — {score.sections?.section_code}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-28">
                    <div className="mb-1 flex justify-between text-xs text-text-secondary">
                      <span>الخطر</span>
                      <span>{score.risk_score}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-app-bg">
                      <div
                        className={`h-full rounded-full ${
                          score.risk_level === "critical"
                            ? "bg-danger"
                            : "bg-orange"
                        }`}
                        style={{
                          width: `${Math.min(score.risk_score, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 text-center text-xs">
                    <div title="عامل الغياب">
                      <p className="font-medium text-text-primary">
                        {score.absence_factor}
                      </p>
                      <p className="text-text-secondary">غياب</p>
                    </div>
                    <div title="عامل الدرجات">
                      <p className="font-medium text-text-primary">
                        {score.grade_factor}
                      </p>
                      <p className="text-text-secondary">درجات</p>
                    </div>
                    <div title="عامل التفاعل">
                      <p className="font-medium text-text-primary">
                        {score.engagement_factor}
                      </p>
                      <p className="text-text-secondary">تفاعل</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowRec(score.student_id);
                      setRecName(
                        `${score.profiles?.first_name} ${score.profiles?.last_name}`
                      );
                      setRecSectionId(score.section_id);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-action-blue/10 px-3 py-1.5 text-xs font-medium text-action-blue transition-colors hover:bg-action-blue/20"
                  >
                    <Send className="h-3 w-3" />
                    توصية
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-card-bg p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">
                إرسال توصية لـ {recName}
              </h3>
              <button
                onClick={() => setShowRec(null)}
                className="rounded-lg p-1 text-text-secondary hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form action={handleSend} className="space-y-4">
              <input type="hidden" name="student_id" value={showRec} />
              <input type="hidden" name="section_id" value={recSectionId} />
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  عنوان التوصية
                </label>
                <input
                  name="title"
                  required
                  className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  نص التوصية
                </label>
                <textarea
                  name="body"
                  required
                  rows={3}
                  className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  رابط مادة مساعدة (اختياري)
                </label>
                <input
                  name="material_url"
                  type="url"
                  className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
                >
                  <Send className="h-4 w-4" />
                  إرسال
                </button>
                <button
                  type="button"
                  onClick={() => setShowRec(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-app-bg"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
