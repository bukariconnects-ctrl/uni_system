import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { TenantAdminSidebar } from "./components/sidebar";

export default async function TenantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", profile.tenant_id)
    .single();

  return (
    <div className="flex min-h-screen">
      <TenantAdminSidebar profile={profile} tenantName={tenant?.name} />
      <main className="flex-1 overflow-auto bg-app-bg pt-16 lg:pt-0">{children}</main>
    </div>
  );
}
