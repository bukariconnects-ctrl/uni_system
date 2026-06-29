import { getMyTickets, getStudentCourses } from "@/app/student/tickets/actions";
import { TicketsClient } from "@/app/student/tickets/tickets-client";
import { requireRole } from "@/lib/auth/get-user";

export default async function FacultyTicketsPage() {
  const { profile } = await requireRole(["faculty"]);
  const [tickets, courses] = await Promise.all([
    getMyTickets(),
    getStudentCourses(),
  ]);

  return (
    <TicketsClient
      tickets={tickets}
      courses={courses}
      profileId={profile.id}
      tenantId={profile.tenant_id!}
    />
  );
}
