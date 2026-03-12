import { getAllTickets, getStaffMembers } from "./actions";
import { TicketsAdminClient } from "./tickets-admin-client";

export default async function TicketsAdminPage() {
  const [tickets, staff] = await Promise.all([
    getAllTickets(),
    getStaffMembers(),
  ]);

  return <TicketsAdminClient tickets={tickets} staff={staff} />;
}
