"use client";

import { useState, useMemo } from "react";
import {
  GraduationCap,
  ClipboardCheck,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  Download,
} from "lucide-react";

// ── Types ──
interface GradeEntry {
  id: string;
  course_id: string;
  coursework_grade: number | null;
  midterm_grade: number | null;
  final_grade: number | null;
  total_grade: number | null;
  is_published: boolean;
  courses: { code: string; name: string; credit_hours: number } | null;
  enrollments: { semester_id: string; final_grade: number | null; letter_grade: string | null } | null;
}

interface Semester {
  id: string;
  name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface AttendanceSummary {
  id: string;
  course_id: string;
  course_name: string | null;
  course_code: string | null;
  credit_hours: number;
  semester_id: string | null;
  total_sessions: number;
  attended_sessions: number;
  unexcused_absences: number;
  excused_absences: number;
  late_count: number;
  absence_percentage: number | null;
  is_dismissed: boolean;
  absence_limit_count: number;
}

interface ReportsData {
  entries: GradeEntry[];
  semesters: Semester[];
  attendanceSummaries: AttendanceSummary[];
}

// ── Helpers ──
function letterToPoints(letter: string | null): number {
  if (!letter) return 0;
  const map: Record<string, number> = {
    "A+": 4.0, A: 4.0, "A-": 3.7,
    "B+": 3.3, B: 3.0, "B-": 2.7,
    "C+": 2.3, C: 2.0, "C-": 1.7,
    "D+": 1.3, D: 1.0, "D-": 0.7,
    F: 0.0,
  };
  return map[letter] ?? 0;
}

function getStatusBadge(summary: AttendanceSummary) {
  if (summary.is_dismissed)
    return <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">محروم</span>;
  if (summary.absence_percentage != null && summary.absence_percentage >= 25)
    return <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">خطر</span>;
  return <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">جيد</span>;
}

// ── Tab Config ──
const TABS = [
  { key: "transcript", label: "السجل الأكاديمي", icon: GraduationCap },
  { key: "attendance", label: "ملخص الحضور", icon: ClipboardCheck },
];

// ── Client Component ──
export function StudentReportsClient({ entries, semesters, attendanceSummaries }: ReportsData) {
  const [activeTab, setActiveTab] = useState("transcript");

  // Build semester lookup
  const semesterMap = useMemo(() => {
    const map: Record<string, Semester> = {};
    for (const s of semesters) map[s.id] = s;
    return map;
  }, [semesters]);

  // ── Transcript Logic ──
  const semesterData = useMemo(() => {
    // Group entries by semester_id
    const groups: Record<string, GradeEntry[]> = {};
    for (const e of entries) {
      const semId = e.enrollments?.semester_id;
      if (!semId) continue;
      if (!groups[semId]) groups[semId] = [];
      groups[semId].push(e);
    }

    // Sort semesters by start_date
    const sortedSemIds = Object.keys(groups).sort((a, b) => {
      const sa = semesterMap[a];
      const sb = semesterMap[b];
      if (!sa || !sb) return 0;
      return new Date(sa.start_date).getTime() - new Date(sb.start_date).getTime();
    });

    return sortedSemIds.map((semId) => {
      const sem = semesterMap[semId];
      const courseEntries = groups[semId];

      // Calculate semester GPA
      let totalPoints = 0;
      let totalCredits = 0;
      for (const g of courseEntries) {
        const credits = g.courses?.credit_hours ?? 0;
        const points = letterToPoints(g.enrollments?.letter_grade ?? null) * credits;
        totalPoints += points;
        totalCredits += credits;
      }
      const semesterGpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "—";

      return {
        semesterId: semId,
        semesterName: sem ? `${sem.name} (${sem.academic_year})` : "—",
        entries: courseEntries,
        semesterGpa,
        totalCredits,
      };
    });
  }, [entries, semesterMap]);

  // Cumulative GPA
  const cumulativeGpa = useMemo(() => {
    let totalPoints = 0;
    let totalCredits = 0;
    for (const sd of semesterData) {
      for (const g of sd.entries) {
        const credits = g.courses?.credit_hours ?? 0;
        totalPoints += letterToPoints(g.enrollments?.letter_grade ?? null) * credits;
        totalCredits += credits;
      }
    }
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "—";
  }, [semesterData]);

  const totalCompletedCredits = useMemo(() => {
    return semesterData.reduce((s, sd) => s + sd.totalCredits, 0);
  }, [semesterData]);

  // ── Attendance Logic ──
  const attendanceBySemester = useMemo(() => {
    const groups: Record<string, AttendanceSummary[]> = {};
    for (const s of attendanceSummaries) {
      const semId = s.semester_id || "unknown";
      if (!groups[semId]) groups[semId] = [];
      groups[semId].push(s);
    }

    const sortedSemIds = Object.keys(groups).sort((a, b) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;
      const sa = semesterMap[a];
      const sb = semesterMap[b];
      if (!sa || !sb) return 0;
      return new Date(sa.start_date).getTime() - new Date(sb.start_date).getTime();
    });

    return sortedSemIds
      .filter((id) => id !== "unknown")
      .map((semId) => ({
        semesterId: semId,
        semesterName: semesterMap[semId]
          ? `${semesterMap[semId].name} (${semesterMap[semId].academic_year})`
          : "—",
        summaries: groups[semId],
      }));
  }, [attendanceSummaries, semesterMap]);

  return (
    <div className="space-y-6">
      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-2xl border border-border bg-card-bg p-1.5 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-action-blue text-white shadow-sm"
                : "text-text-secondary hover:bg-app-bg hover:text-text-primary"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════  TAB: TRANSCRIPT  ══════════════════════════ */}
      {activeTab === "transcript" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
              <p className="text-xs text-text-secondary">المعدل التراكمي</p>
              <p className="mt-1 text-3xl font-bold text-action-blue">{cumulativeGpa}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
              <p className="text-xs text-text-secondary">إجمالي الساعات المعتمدة</p>
              <p className="mt-1 text-3xl font-bold text-text-primary">{totalCompletedCredits}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
              <p className="text-xs text-text-secondary">عدد الفصول الدراسية</p>
              <p className="mt-1 text-3xl font-bold text-text-primary">{semesterData.length}</p>
            </div>
          </div>

          {/* Print Button */}
          <div className="flex justify-end">
            <button
              onClick={() => window.print()}
              className="no-print flex items-center gap-2 rounded-xl bg-action-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
            >
              <Download className="h-4 w-4" />
              طباعة السجل الأكاديمي
            </button>
          </div>

          {/* Per-Semester Tables */}
          {semesterData.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <GraduationCap className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">لا توجد درجات منشورة بعد</p>
            </div>
          ) : (
            <div className="space-y-6 print-area">
              {semesterData.map((sem) => (
                <div
                  key={sem.semesterId}
                  className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-text-primary">{sem.semesterName}</h2>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-text-secondary">
                        الساعات: <strong className="text-text-primary">{sem.totalCredits}</strong>
                      </span>
                      <span className="text-text-secondary">
                        المعدل: <strong className="text-action-blue">{sem.semesterGpa}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr className="border-b border-border text-text-secondary">
                          <th className="pb-3 pl-4 font-medium">المقرر</th>
                          <th className="pb-3 pl-4 font-medium">الساعات</th>
                          <th className="pb-3 pl-4 font-medium">أعمال السنة</th>
                          <th className="pb-3 pl-4 font-medium">منتصف الفصل</th>
                          <th className="pb-3 pl-4 font-medium">النهائي</th>
                          <th className="pb-3 pl-4 font-medium">المجموع</th>
                          <th className="pb-3 font-medium">التقدير</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sem.entries.map((g) => {
                          const letterGrade = g.enrollments?.letter_grade;
                          const gradeColor =
                            letterGrade === "A" || letterGrade === "A+"
                              ? "text-success"
                              : letterGrade === "F"
                                ? "text-danger"
                                : "text-text-primary";

                          return (
                            <tr
                              key={g.id}
                              className="border-b border-border/50 transition-colors hover:bg-app-bg/50"
                            >
                              <td className="py-3 pl-4">
                                <p className="font-medium text-text-primary">
                                  {g.courses?.code || "—"}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {g.courses?.name || ""}
                                </p>
                              </td>
                              <td className="py-3 pl-4 text-text-primary">
                                {g.courses?.credit_hours || "—"}
                              </td>
                              <td className="py-3 pl-4 text-text-primary">
                                {g.coursework_grade ?? "—"}
                              </td>
                              <td className="py-3 pl-4 text-text-primary">
                                {g.midterm_grade ?? "—"}
                              </td>
                              <td className="py-3 pl-4 text-text-primary">
                                {g.final_grade ?? "—"}
                              </td>
                              <td className="py-3 pl-4 font-bold text-text-primary">
                                {g.total_grade ?? "—"}
                              </td>
                              <td className="py-3">
                                {letterGrade ? (
                                  <span className={`text-lg font-bold ${gradeColor}`}>
                                    {letterGrade}
                                  </span>
                                ) : (
                                  <span className="text-text-secondary">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════  TAB: ATTENDANCE  ══════════════════════════ */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* KPIs */}
          {(() => {
            const totalSessions = attendanceSummaries.reduce((s, a) => s + (a.total_sessions || 0), 0);
            const totalAbsences = attendanceSummaries.reduce((s, a) => s + (a.unexcused_absences || 0), 0);
            const totalExcused = attendanceSummaries.reduce((s, a) => s + (a.excused_absences || 0), 0);
            const dismissedCount = attendanceSummaries.filter((a) => a.is_dismissed).length;

            return (
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
                  <p className="text-xs text-text-secondary">إجمالي الجلسات</p>
                  <p className="mt-1 text-2xl font-bold text-text-primary">{totalSessions}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
                  <p className="text-xs text-text-secondary">غياب بدون عذر</p>
                  <p className="mt-1 text-2xl font-bold text-danger">{totalAbsences}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
                  <p className="text-xs text-text-secondary">غياب بعذر</p>
                  <p className="mt-1 text-2xl font-bold text-warning">{totalExcused}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
                  <p className="text-xs text-text-secondary">المحرومون</p>
                  <p className={`mt-1 text-2xl font-bold ${dismissedCount > 0 ? "text-danger" : "text-text-primary"}`}>
                    {dismissedCount}
                  </p>
                </div>
              </div>
            );
          })()}

          {attendanceBySemester.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">لا توجد سجلات حضور</p>
            </div>
          ) : (
            attendanceBySemester.map((sem) => (
              <div
                key={sem.semesterId}
                className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm"
              >
                <h2 className="mb-4 text-lg font-bold text-text-primary">{sem.semesterName}</h2>

                <div className="space-y-4">
                  {sem.summaries.map((s) => {
                    const pct = s.absence_percentage ?? 0;
                    const barColor =
                      s.is_dismissed
                        ? "bg-danger"
                        : pct >= 25
                          ? "bg-warning"
                          : "bg-success";

                    return (
                      <div
                        key={s.id}
                        className="rounded-xl border border-border bg-app-bg/50 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-text-primary">
                              {s.course_name || "—"}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {s.course_code || ""}
                            </p>
                          </div>
                          {getStatusBadge(s)}
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-text-secondary">
                              نسبة الغياب: {pct.toFixed(1)}%
                            </span>
                            <span className="text-text-secondary">
                              الحد: {s.absence_limit_count}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-border">
                            <div
                              className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-5 gap-2 text-center text-xs">
                          <div className="rounded-lg bg-success/10 p-2">
                            <p className="font-bold text-success">{s.attended_sessions ?? 0}</p>
                            <p className="text-text-secondary">حضور</p>
                          </div>
                          <div className="rounded-lg bg-danger/10 p-2">
                            <p className="font-bold text-danger">{s.unexcused_absences ?? 0}</p>
                            <p className="text-text-secondary">غياب</p>
                          </div>
                          <div className="rounded-lg bg-warning/10 p-2">
                            <p className="font-bold text-warning">{s.excused_absences ?? 0}</p>
                            <p className="text-text-secondary">معذر</p>
                          </div>
                          <div className="rounded-lg bg-purple/10 p-2">
                            <p className="font-bold text-purple">{s.late_count ?? 0}</p>
                            <p className="text-text-secondary">متأخر</p>
                          </div>
                          <div className="rounded-lg bg-primary/10 p-2">
                            <p className="font-bold text-text-primary">{s.total_sessions ?? 0}</p>
                            <p className="text-text-secondary">جلسات</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Print Styles ── */}
      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
