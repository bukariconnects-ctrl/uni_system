import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { FacultySidebar } from "./components/sidebar";

export default async function FacultyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", profile.tenant_id)
    .single();

  return (
    <div className="flex min-h-screen">
      <FacultySidebar profile={profile} tenantName={tenant?.name} />
      <main className="flex-1 overflow-auto bg-app-bg pt-16 lg:pt-0">{children}</main>
    </div>
  );
}
