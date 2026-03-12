import { requireRole } from "@/lib/auth/get-user";
import { SuperAdminSidebar } from "./components/sidebar";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["super_admin"]);

  return (
    <div className="flex min-h-screen">
      <SuperAdminSidebar profile={profile} />
      <main className="flex-1 overflow-auto bg-app-bg pt-16 lg:pt-0">{children}</main>
    </div>
  );
}
