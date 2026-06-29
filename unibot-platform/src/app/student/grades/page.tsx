import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { GraduationCap } from "lucide-react";

export default async function StudentGradesPage() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("gradebook_entries")
    .select("*, courses(code, name, credit_hours), enrollments(final_grade, letter_grade)")
    .eq("student_id", profile.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const grades = entries || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">درجاتي</h1>
        <p className="mt-1 text-sm text-text-secondary">عرض الدرجات المنشورة لمقرراتك</p>
      </div>

      {grades.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">لا توجد درجات منشورة بعد</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card-bg shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-app-bg">
                <th className="px-4 py-3 text-right font-medium text-text-secondary">المقرر</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">أعمال السنة</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">منتصف الفصل</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">النهائي</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">المجموع</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">التقدير</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((entry: any) => {
                const letterGrade = entry.enrollments?.letter_grade;
                const gradeColor =
                  letterGrade === "A" || letterGrade === "A+"
                    ? "text-success"
                    : letterGrade === "F"
                      ? "text-danger"
                      : "text-text-primary";

                return (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-action-blue/20">
                          <GraduationCap className="h-4 w-4 text-action-blue" />
                        </div>
                        <div>
                          <span className="font-medium text-text-primary">{entry.courses?.code}</span>
                          <span className="mr-2 text-xs text-text-secondary">{entry.courses?.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-text-primary">{entry.coursework_grade ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-text-primary">{entry.midterm_grade ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-text-primary">{entry.final_grade ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-bold text-action-blue">{entry.total_grade ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {letterGrade ? (
                        <span className={`text-lg font-bold ${gradeColor}`}>{letterGrade}</span>
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
      )}
    </div>
  );
}
