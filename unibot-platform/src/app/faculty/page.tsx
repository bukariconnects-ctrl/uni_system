import { requireRole } from "@/lib/auth/get-user";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { BookOpen, FileText, ClipboardCheck, Users } from "lucide-react";

export default async function FacultyDashboard() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const [sectionsRes, materialsRes, assignmentsRes] = await Promise.all([
    supabase
      .from("sections")
      .select("id, section_code, status, courses(code, name), semesters(name, status)")
      .eq("tenant_id", profile.tenant_id)
      .eq("instructor_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("course_materials")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("uploaded_by", profile.id),
    supabase
      .from("assignments")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("created_by", profile.id),
  ]);

  const sections = sectionsRes.data || [];
  
  // Get actual enrollment counts using service client to bypass RLS
  const sectionIds = sections.map((s: any) => s.id);
  let enrollmentCounts: Record<string, number> = {};
  
  if (sectionIds.length > 0) {
    const { data: enrollments } = await serviceClient
      .from("enrollments")
      .select("section_id")
      .in("section_id", sectionIds)
      .eq("status", "enrolled");
    
    // Count enrollments per section
    (enrollments || []).forEach((e: any) => {
      enrollmentCounts[e.section_id] = (enrollmentCounts[e.section_id] || 0) + 1;
    });
  }
  
  // Add enrolled_count to sections
  const sectionsWithCount = sections.map((s: any) => ({
    ...s,
    enrolled_count: enrollmentCounts[s.id] || 0
  }));
  
  const activeSections = sectionsWithCount.filter(
    (s: any) => s.semesters?.status === "active"
  );

  const stats = [
    { label: "شعبي الحالية", value: activeSections.length, icon: Users, color: "bg-action-blue/10 text-action-blue" },
    { label: "إجمالي المواد", value: materialsRes.data?.length || 0, icon: BookOpen, color: "bg-success/10 text-success" },
    { label: "إجمالي التكاليف", value: assignmentsRes.data?.length || 0, icon: FileText, color: "bg-purple/10 text-purple" },
    { label: "إجمالي الطلاب", value: activeSections.reduce((sum: number, s: any) => sum + s.enrolled_count, 0), icon: ClipboardCheck, color: "bg-warning/10 text-warning" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">مرحباً، {profile.first_name}</h1>
        <p className="mt-1 text-sm text-text-secondary">لوحة تحكم عضو هيئة التدريس</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold text-text-primary">{stat.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-text-primary">شعبي النشطة</h2>
        {activeSections.length === 0 ? (
          <p className="text-sm text-text-secondary">لا توجد شعب نشطة حالياً</p>
        ) : (
          <div className="space-y-2">
            {activeSections.map((section: any) => (
              <div key={section.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-blue/10">
                    <BookOpen className="h-5 w-5 text-action-blue" />
                  </div>
                  <div>
                    <span className="font-bold text-text-primary">{section.courses?.code} — {section.courses?.name}</span>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span>الشعبة: {section.section_code}</span>
                      <span>•</span>
                      <span>{section.semesters?.name}</span>
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-action-blue/10 px-3 py-1 text-xs font-medium text-action-blue">
                  {section.enrolled_count} طالب
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
