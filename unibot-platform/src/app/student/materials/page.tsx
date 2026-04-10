import { requireRole } from "@/lib/auth/get-user";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { StudentMaterialsClient } from "./materials-client";

export default async function StudentMaterialsPage() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: enrollments } = await serviceClient
    .from("enrollments")
    .select("section_id, sections(section_code, courses(code, name))")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  const sectionIds = (enrollments || []).map((e: any) => e.section_id);

  let materials: any[] = [];
  if (sectionIds.length > 0) {
    const { data } = await supabase
      .from("course_materials")
      .select("*, sections(section_code, courses(code, name))")
      .in("section_id", sectionIds)
      .eq("is_published", true)
      .order("week_number", { ascending: true })
      .order("created_at", { ascending: false });
    materials = data || [];
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">محتوى المقررات</h1>
        <p className="mt-1 text-sm text-text-secondary">تصفح وتحميل المواد التعليمية لمقرراتك</p>
      </div>
      <StudentMaterialsClient
        enrollments={enrollments || []}
        materials={materials}
      />
    </div>
  );
}
