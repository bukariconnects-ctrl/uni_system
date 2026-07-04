"use client";

import { useState } from "react";
import {
  AlertTriangle,
  TrendingUp,
  Users,
  RefreshCw,
  Send,
  BarChart3,
  ShieldAlert,
  BookOpen,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { triggerRiskComputation, sendRecommendation } from "./actions";

const riskColors: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: "bg-success/10", text: "text-success", label: "منخفض" },
  medium: { bg: "bg-warning/10", text: "text-warning", label: "متوسط" },
  high: { bg: "bg-orange/10", text: "text-orange", label: "مرتفع" },
  critical: { bg: "bg-danger/10", text: "text-danger", label: "حرج" },
};

interface RiskScore {
  id: string;
  student_id: string;
  course_id: string;
  risk_level: string;
  risk_score: number;
  absence_factor: number;
  grade_factor: number;
  engagement_factor: number;
  profiles?: { first_name: string; last_name: string; email: string };
  courses?: { code: string; name: string } | null;
}

interface CourseFlag {
  id: string;
  course_id: string;
  avg_risk_score: number;
  high_risk_count: number;
  failure_rate_pct: number;
  flagged: boolean;
  courses?: {
    code: string;
    name: string;
  } | null;
}

interface Semester {
  id: string;
  name: string;
  status: string;
}

export function AnalyticsClient({
  riskZone,
  courseFlags,
  allScores,
  semesters,
}: {
  riskZone: RiskScore[];
  courseFlags: CourseFlag[];
  allScores: { risk_level: string }[];
  semesters: Semester[];
}) {
  const [computing, setComputing] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState(
    semesters.find((s) => s.status === "active")?.id || semesters[0]?.id || ""
  );
  const [showRecommendation, setShowRecommendation] = useState<string | null>(
    null
  );
  const [recStudentName, setRecStudentName] = useState("");
  const [recCourseId, setRecCourseId] = useState("");
  const [error, setError] = useState("");

  const lowCount = allScores.filter((s) => s.risk_level === "low").length;
  const mediumCount = allScores.filter((s) => s.risk_level === "medium").length;
  const highCount = allScores.filter((s) => s.risk_level === "high").length;
  const criticalCount = allScores.filter(
    (s) => s.risk_level === "critical"
  ).length;
  const totalStudents = allScores.length;

  async function handleCompute() {
    if (!selectedSemester) return;
    setComputing(true);
    const loadingToast = toast.loading("جاري حساب درجات الخطر...");
    try {
      const result = await triggerRiskComputation(selectedSemester);
      toast.dismiss(loadingToast);
      toast.success(
        `تم حساب ${result.computed} درجة خطر و${result.course_flags} مؤشر مقرر`
      );
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "خطأ";
      toast.error(msg);
      setError(msg);
    } finally {
      setComputing(false);
    }
  }

  async function handleSendRecommendation(formData: FormData) {
    const loadingToast = toast.loading("جاري إرسال التوصية...");
    try {
      await sendRecommendation(formData);
      toast.dismiss(loadingToast);
      toast.success("تم إرسال التوصية بنجاح");
      setShowRecommendation(null);
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "خطأ";
      toast.error(msg);
      setError(msg);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            التحليلات التنبؤية
          </h1>
          <p className="text-sm text-text-secondary">
            مراقبة مستويات الخطر الأكاديمي والتوصيات
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
          >
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleCompute}
            disabled={computing}
            className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${computing ? "animate-spin" : ""}`}
            />
            {computing ? "جارٍ الحساب..." : "إعادة حساب"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-5 w-5 text-action-blue" />
            <span className="text-sm text-text-secondary">إجمالي الطلاب</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{totalStudents}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            <span className="text-sm text-text-secondary">منخفض الخطر</span>
          </div>
          <p className="text-2xl font-bold text-success">{lowCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange" />
            <span className="text-sm text-text-secondary">مرتفع</span>
          </div>
          <p className="text-2xl font-bold text-orange">{highCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-danger" />
            <span className="text-sm text-text-secondary">حرج</span>
          </div>
          <p className="text-2xl font-bold text-danger">{criticalCount}</p>
        </div>
      </div>

      {totalStudents > 0 && (
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <h3 className="mb-3 text-sm font-bold text-text-primary">
            توزيع مستويات الخطر
          </h3>
          <div className="flex h-8 overflow-hidden rounded-lg">
            {lowCount > 0 && (
              <div
                className="flex items-center justify-center bg-success text-xs font-medium text-white"
                style={{ width: `${(lowCount / totalStudents) * 100}%` }}
              >
                {Math.round((lowCount / totalStudents) * 100)}%
              </div>
            )}
            {mediumCount > 0 && (
              <div
                className="flex items-center justify-center bg-warning text-xs font-medium text-white"
                style={{ width: `${(mediumCount / totalStudents) * 100}%` }}
              >
                {Math.round((mediumCount / totalStudents) * 100)}%
              </div>
            )}
            {highCount > 0 && (
              <div
                className="flex items-center justify-center bg-orange text-xs font-medium text-white"
                style={{ width: `${(highCount / totalStudents) * 100}%` }}
              >
                {Math.round((highCount / totalStudents) * 100)}%
              </div>
            )}
            {criticalCount > 0 && (
              <div
                className="flex items-center justify-center bg-danger text-xs font-medium text-white"
                style={{ width: `${(criticalCount / totalStudents) * 100}%` }}
              >
                {Math.round((criticalCount / totalStudents) * 100)}%
              </div>
            )}
          </div>
          <div className="mt-2 flex gap-4 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success" /> منخفض (
              {lowCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-warning" /> متوسط (
              {mediumCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-orange" /> مرتفع (
              {highCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-danger" /> حرج (
              {criticalCount})
            </span>
          </div>
        </div>
      )}

      {courseFlags.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-text-primary">
            <BookOpen className="h-5 w-5 text-danger" />
            مقررات مُعلَّمة بالخطر
          </h2>
          <div className="grid gap-3">
            {courseFlags.map((flag) => (
              <div
                key={flag.id}
                className="rounded-2xl border-2 border-danger/30 bg-card-bg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      {flag.courses?.code || ""} —{" "}
                      {flag.courses?.name || ""}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-danger">
                        {flag.avg_risk_score}
                      </p>
                      <p className="text-xs text-text-secondary">
                        متوسط الخطر
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-orange">
                        {flag.high_risk_count}
                      </p>
                      <p className="text-xs text-text-secondary">
                        طلاب خطر
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-warning">
                        {flag.failure_rate_pct}%
                      </p>
                      <p className="text-xs text-text-secondary">
                        نسبة الرسوب
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-text-primary">
          <BarChart3 className="h-5 w-5 text-danger" />
          منطقة الخطر — طلاب في خطر مرتفع / حرج
        </h2>

        {riskZone.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card-bg p-8 text-center">
            <TrendingUp className="mx-auto mb-3 h-10 w-10 text-success/50" />
            <p className="text-sm text-text-secondary">
              لا يوجد طلاب في منطقة الخطر حالياً
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {riskZone.map((score) => {
              const risk = riskColors[score.risk_level] || riskColors.low;
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
                        {score.profiles?.first_name}{" "}
                        {score.profiles?.last_name}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${risk.bg} ${risk.text}`}
                      >
                        {risk.label}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      {score.courses?.code} —{" "}
                      {score.courses?.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-32">
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

                    <div className="flex gap-2 text-center text-xs">
                      <div>
                        <p className="font-medium text-text-primary">
                          {score.absence_factor}
                        </p>
                        <p className="text-text-secondary">غياب</p>
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">
                          {score.grade_factor}
                        </p>
                        <p className="text-text-secondary">درجات</p>
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">
                          {score.engagement_factor}
                        </p>
                        <p className="text-text-secondary">تفاعل</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowRecommendation(score.student_id);
                        setRecStudentName(
                          `${score.profiles?.first_name} ${score.profiles?.last_name}`
                        );
                        setRecCourseId(score.course_id);
                      }}
                      className="flex items-center gap-1 rounded-lg bg-action-blue/20 px-3 py-1.5 text-xs font-medium text-action-blue transition-colors hover:bg-action-blue/20"
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
      </div>

      {showRecommendation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-card-bg p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">
                إرسال توصية لـ {recStudentName}
              </h3>
              <button
                onClick={() => setShowRecommendation(null)}
                className="rounded-lg p-1 text-text-secondary hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form action={handleSendRecommendation} className="space-y-4">
              <input type="hidden" name="student_id" value={showRecommendation} />
              <input type="hidden" name="course_id" value={recCourseId} />
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
                  إرسال التوصية
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecommendation(null)}
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
