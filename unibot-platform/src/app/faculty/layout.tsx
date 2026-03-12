import { requireRole } from "@/lib/auth/get-user";
import { FacultySidebar } from "./components/sidebar";

export default async function FacultyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["faculty"]);

  return (
    <div className="flex min-h-screen">
      <FacultySidebar profile={profile} />
      <main className="flex-1 overflow-auto bg-app-bg pt-16 lg:pt-0">{children}</main>
    </div>
  );
}
