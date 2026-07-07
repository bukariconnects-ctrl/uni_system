import { getAllTenantTickets, getStaffMembers, getDashboardStats } from "./actions";
import { TicketsAdminClient } from "./tickets-admin-client";

export default async function TenantTicketsPage() {
  const [tickets, staff, stats] = await Promise.all([
    getAllTenantTickets(),
    getStaffMembers(),
    getDashboardStats(),
  ]);

  return <TicketsAdminClient tickets={tickets} staff={staff} stats={stats} />;
}
