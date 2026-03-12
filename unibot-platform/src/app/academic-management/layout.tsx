import { requireRole } from "@/lib/auth/get-user";
import { AcademicManagementSidebar } from "./components/sidebar";

export default async function AcademicManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["academic_management"]);

  return (
    <div className="flex min-h-screen">
      <AcademicManagementSidebar profile={profile} />
      <main className="flex-1 overflow-auto bg-app-bg pt-16 lg:pt-0">{children}</main>
    </div>
  );
}
