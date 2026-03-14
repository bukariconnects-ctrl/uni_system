import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const { profile } = await requireRole(["tenant_admin"]);
  // Use service client that fully bypasses RLS (no user JWT interference).
  // Security is enforced via requireRole above.
  const serviceClient = createServiceClient();

  const [usersRes, rolesRes, majorsRes, deptsRes, collegesRes, levelsRes] = await Promise.all([
    serviceClient
      .from("profiles")
      .select(`
        *,
        student_profiles!left(*),
        faculty_profiles!left(*),
        student_majors!left(major_id, majors(name, code)),
        faculty_departments!left(department_id, departments(name, code)),
        profile_custom_roles!profile_custom_roles_profile_id_fkey(custom_role_id, custom_roles(name)),
        academic_management_departments!academic_management_departments_profile_id_fkey(department_id, departments(name, code))
      `)
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false }),
    serviceClient
      .from("custom_roles")
      .select("*, profile_custom_roles(profile_id, profiles!profile_custom_roles_profile_id_fkey(first_name, last_name))")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at"),
    serviceClient
      .from("majors")
      .select("id, name, code, department_id")
      .eq("tenant_id", profile.tenant_id)
      .order("name"),
    serviceClient
      .from("departments")
      .select("id, name, code, college_id")
      .eq("tenant_id", profile.tenant_id)
      .order("name"),
    serviceClient
      .from("colleges")
      .select("id, name, code")
      .eq("tenant_id", profile.tenant_id)
      .order("name"),
    serviceClient
      .from("academic_levels")
      .select("id, level_number, name, major_id")
      .eq("tenant_id", profile.tenant_id)
      .order("level_number"),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">إدارة المستخدمين</h1>
        <p className="mt-1 text-sm text-text-secondary">
          إضافة المستخدمين وإدارة الأدوار والصلاحيات
        </p>
      </div>
      <UsersClient
        initialUsers={usersRes.data || []}
        customRoles={rolesRes.data || []}
        majors={majorsRes.data || []}
        departments={deptsRes.data || []}
        colleges={collegesRes.data || []}
        academicLevels={levelsRes.data || []}
      />
    </div>
  );
}
