import { getMyTickets, getStudentSections } from "@/app/student/tickets/actions";
import { TicketsClient } from "@/app/student/tickets/tickets-client";
import { requireRole } from "@/lib/auth/get-user";

export default async function FacultyTicketsPage() {
  const { profile } = await requireRole(["faculty"]);
  const [tickets, sections] = await Promise.all([
    getMyTickets(),
    getStudentSections(),
  ]);

  return (
    <TicketsClient
      tickets={tickets}
      sections={sections}
      profileId={profile.id}
      tenantId={profile.tenant_id!}
    />
  );
}
