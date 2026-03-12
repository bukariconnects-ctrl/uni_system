import { getMyTickets, getStudentSections } from "./actions";
import { TicketsClient } from "./tickets-client";
import { requireRole } from "@/lib/auth/get-user";

export default async function TicketsPage() {
  const { profile } = await requireRole(["student"]);
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
