"use client";

import { useState, useEffect } from "react";
import { batchEnroll, updateEnrollmentStatus } from "./actions";
import {
  Users,
  CheckCircle,
  AlertCircle,
  UserMinus,
  UserPlus,
} from "lucide-react";

interface SectionOption {
  id: string;
  section_code: string;
  max_capacity: number;
  enrolled_count: number;
  semester_id: string;
  courses: { code: string; name: string } | null;
  semesters: { name: string } | null;
}

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
  student_profiles: { student_number: string } | null;
}

interface EnrollmentRow {
  id: string;
  status: string;
  enrolled_at: string;
  student_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    student_profiles: { student_number: string } | null;
  } | null;
  sections: { section_code: string; courses: { code: string; name: string } | null } | null;
  semesters: { name: string } | null;
}

const ENROLLMENT_STATUS: Record<string, { label: string; color: string }> = {
  enrolled: { label: "مسجل", color: "bg-success/10 text-success" },
  dropped: { label: "منسحب", color: "bg-danger/10 text-danger" },
  completed: { label: "مكتمل", color: "bg-action-blue/10 text-action-blue" },
  failed: { label: "راسب", color: "bg-danger/10 text-danger" },
  dismissed: { label: "مفصول", color: "bg-text-secondary/10 text-text-secondary" },
  withdrawn: { label: "منسحب كلياً", color: "bg-warning/10 text-warning" },
};

export function EnrollmentsClient({
  sections,
  students,
  enrollments,
}: {
  sections: SectionOption[];
  students: StudentOption[];
  enrollments: EnrollmentRow[];
}) {
  const [tab, setTab] = useState<"batch" | "list">("batch");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tab");
    if (p === "batch" || p === "list") setTab(p);
  }, []);

  function changeTab(t: "batch" | "list") {
    setTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  }
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  function toggleStudent(id: string) {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function selectAll() {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.id));
    }
  }

  async function handleBatchEnroll() {
    if (!selectedSection || selectedStudents.length === 0) {
      setError("يرجى اختيار الشعبة وطالب واحد على الأقل");
      return;
    }

    const section = sections.find((s) => s.id === selectedSection);
    if (!section) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await batchEnroll(selectedSection, section.semester_id, selectedStudents);
      setResult(res);
      if (res.success > 0) {
        setSelectedStudents([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: "enrolled" | "dropped") {
    setLoading(true);
    setError("");
    try {
      await updateEnrollmentStatus(id, status);
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
          onClick={() => { changeTab("batch"); setResult(null); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${tab === "batch" ? "bg-card-bg text-action-blue shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
        >
          <UserPlus className="h-4 w-4" />
          تسجيل جماعي
        </button>
        <button
          onClick={() => changeTab("list")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${tab === "list" ? "bg-card-bg text-action-blue shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
        >
          <Users className="h-4 w-4" />
          سجل التسجيلات
        </button>
      </div>

      {tab === "batch" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-text-primary">اختر الشعبة</h3>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
            >
              <option value="">-- اختر الشعبة --</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.courses?.code} — {s.courses?.name} ({s.section_code}) — {s.semesters?.name} — {s.enrolled_count}/{s.max_capacity}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">اختر الطلاب</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">{selectedStudents.length} محدد</span>
                <button onClick={selectAll} className="rounded-lg border border-action-blue/30 px-3 py-1.5 text-xs font-medium text-action-blue hover:bg-action-blue/5">
                  {selectedStudents.length === students.length ? "إلغاء الكل" : "تحديد الكل"}
                </button>
              </div>
            </div>

            {students.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-secondary">لا يوجد طلاب نشطون</p>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {students.map((student) => (
                  <label
                    key={student.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors ${selectedStudents.includes(student.id) ? "bg-action-blue/5 border border-action-blue/20" : "hover:bg-app-bg border border-transparent"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="h-4 w-4 rounded border-border text-action-blue accent-action-blue"
                    />
                    <div>
                      <span className="text-sm font-medium text-text-primary">{student.first_name} {student.last_name}</span>
                      {student.student_profiles?.student_number && (
                        <span className="mr-2 text-xs text-text-secondary">({student.student_profiles.student_number})</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-border pt-4">
              <button
                onClick={handleBatchEnroll}
                disabled={loading || !selectedSection || selectedStudents.length === 0}
                className="flex items-center gap-2 rounded-lg bg-action-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                {loading ? "جاري التسجيل..." : `تسجيل ${selectedStudents.length} طالب`}
              </button>
            </div>
          </div>

          {result && (
            <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-bold text-text-primary">تم تسجيل {result.success} طالب بنجاح</span>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm text-danger">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">{result.errors.length} أخطاء:</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto rounded-lg bg-danger/5 p-3">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-danger">{err}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "list" && (
        <div className="space-y-2">
          <div className="rounded-xl border border-border bg-card-bg p-3">
            <span className="text-sm text-text-secondary">{enrollments.length} تسجيل (آخر 200)</span>
          </div>

          {enrollments.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">لا توجد تسجيلات بعد</p>
            </div>
          )}

          {enrollments.map((enrollment) => {
            const statusInfo = ENROLLMENT_STATUS[enrollment.status] || ENROLLMENT_STATUS.enrolled;
            return (
              <div key={enrollment.id} className="flex items-center justify-between rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-academic-navy text-xs font-bold text-white">
                    {enrollment.profiles?.first_name?.[0]}{enrollment.profiles?.last_name?.[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary">{enrollment.profiles?.first_name} {enrollment.profiles?.last_name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      {enrollment.profiles?.student_profiles?.student_number && (
                        <span>{enrollment.profiles.student_profiles.student_number}</span>
                      )}
                      <span>{enrollment.sections?.courses?.code} ({enrollment.sections?.section_code})</span>
                      <span>{enrollment.semesters?.name}</span>
                      <span>{new Date(enrollment.enrolled_at).toLocaleDateString("ar-SA")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {enrollment.status === "enrolled" && (
                    <button
                      onClick={() => handleStatusChange(enrollment.id, "dropped")}
                      className="rounded-lg p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger"
                      title="سحب"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                  {enrollment.status === "dropped" && (
                    <button
                      onClick={() => handleStatusChange(enrollment.id, "enrolled")}
                      className="rounded-lg p-1.5 text-text-secondary hover:bg-success/10 hover:text-success"
                      title="إعادة تسجيل"
                    >
                      <UserPlus className="h-4 w-4" />
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
