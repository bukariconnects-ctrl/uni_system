import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const [usersRes, rolesRes, majorsRes, deptsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, student_profiles(*), faculty_profiles(*)")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("custom_roles")
      .select("*, profile_custom_roles(profile_id, profiles!profile_custom_roles_profile_id_fkey(first_name, last_name))")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at"),
    supabase
      .from("majors")
      .select("id, name, code")
      .eq("tenant_id", profile.tenant_id)
      .order("name"),
    supabase
      .from("departments")
      .select("id, name, code")
      .eq("tenant_id", profile.tenant_id)
      .order("name"),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">إدارة المستخدمين</h1>
        <p className="mt-1 text-sm text-text-secondary">
          استيراد المستخدمين بالجملة وإدارة الأدوار المخصصة
        </p>
      </div>
      <UsersClient
        initialUsers={usersRes.data || []}
        customRoles={rolesRes.data || []}
        majors={majorsRes.data || []}
        departments={deptsRes.data || []}
      />
    </div>
  );
}
