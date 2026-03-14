import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { AcademicManagementSidebar } from "./components/sidebar";

export default async function AcademicManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", profile.tenant_id)
    .single();

  return (
    <div className="flex min-h-screen">
      <AcademicManagementSidebar profile={profile} tenantName={tenant?.name} />
      <main className="flex-1 overflow-auto bg-app-bg pt-16 lg:pt-0">{children}</main>
    </div>
  );
}
