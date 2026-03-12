import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { EnrollmentsClient } from "./enrollments-client";

export default async function EnrollmentsPage() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const [sectionsRes, studentsRes, enrollmentsRes] = await Promise.all([
    supabase
      .from("sections")
      .select("id, section_code, max_capacity, enrolled_count, semester_id, courses(code, name), semesters(name)")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, student_profiles(student_number)")
      .eq("tenant_id", profile.tenant_id)
      .eq("role", "student")
      .eq("account_status", "active")
      .order("first_name"),
    supabase
      .from("enrollments")
      .select("id, status, enrolled_at, student_id, profiles!enrollments_student_id_fkey(first_name, last_name, student_profiles(student_number)), sections(section_code, courses(code, name)), semesters(name)")
      .eq("tenant_id", profile.tenant_id)
      .order("enrolled_at", { ascending: false })
      .limit(200),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التسجيل الجماعي</h1>
        <p className="mt-1 text-sm text-text-secondary">تسجيل الطلاب في الشعب الدراسية بالجملة</p>
      </div>
      <EnrollmentsClient
        sections={sectionsRes.data || []}
        students={studentsRes.data || []}
        enrollments={enrollmentsRes.data || []}
      />
    </div>
  );
}
