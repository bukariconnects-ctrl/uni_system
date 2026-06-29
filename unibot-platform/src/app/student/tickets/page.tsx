import { getMyTickets, getStudentCourses } from "./actions";
import { TicketsClient } from "./tickets-client";
import { requireRole } from "@/lib/auth/get-user";

export default async function TicketsPage() {
  const { profile } = await requireRole(["student"]);
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
