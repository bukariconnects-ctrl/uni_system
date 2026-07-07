import { getFacultyAssignedTickets } from "./actions";
import { FacultyTicketsClient } from "./faculty-tickets-client";
import { requireRole } from "@/lib/auth/get-user";

export default async function FacultyTicketsPage() {
  const { profile } = await requireRole(["faculty"]);
  // Single OR query, split client-side to keep the two-tab UX
  const allTickets = await getFacultyAssignedTickets();

  const assignedTickets = allTickets.filter(
    (t) => t.assigned_to === profile.id
  );
  const createdTickets = allTickets.filter(
    (t) => t.created_by === profile.id
  );

  return (
    <FacultyTicketsClient
      assignedTickets={assignedTickets}
      createdTickets={createdTickets}
      profileId={profile.id}
    />
  );
}
