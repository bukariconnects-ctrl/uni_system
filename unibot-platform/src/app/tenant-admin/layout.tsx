import { requireRole } from "@/lib/auth/get-user";
import { TenantAdminSidebar } from "./components/sidebar";

export default async function TenantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["tenant_admin"]);

  return (
    <div className="flex min-h-screen">
      <TenantAdminSidebar profile={profile} />
      <main className="flex-1 overflow-auto bg-app-bg pt-16 lg:pt-0">{children}</main>
    </div>
  );
}
