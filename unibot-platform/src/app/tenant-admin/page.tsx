import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { TenantAdminDashboardClient } from "./tenant-admin-client";

export default async function TenantAdminDashboard() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, storage_used_gb, max_storage_gb, max_users, status, subdomain, absence_threshold, timezone, default_language")
    .eq("id", profile.tenant_id)
    .single();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role, tenant_id")
    .eq("tenant_id", profile.tenant_id);

  const { data: courses } = await supabase
    .from("courses")
    .select("id, code, name, department_id, is_active")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true);

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, code")
    .eq("tenant_id", profile.tenant_id);

  const { data: activeSemester } = await supabase
    .from("semesters")
    .select("name, start_date, end_date")
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "active")
    .single();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          مرحباً، {profile.first_name}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {tenant?.name || "لوحة تحكم مدير الجامعة"}
        </p>
      </div>

      <TenantAdminDashboardClient
        data={{
          profiles: profiles || [],
          courses: (courses || []) as any,
          departments: departments || [],
          tenant,
          activeSemester,
        }}
      />
    </div>
  );
}
