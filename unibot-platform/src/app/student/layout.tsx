import { requireRole } from "@/lib/auth/get-user";
import { StudentSidebar } from "./components/sidebar";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["student"]);

  return (
    <div className="flex min-h-screen">
      <StudentSidebar profile={profile} />
      <main className="flex-1 overflow-auto bg-app-bg pt-16 lg:pt-0">{children}</main>
    </div>
  );
}
