"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { TicketStatus } from "@/lib/types/database";

export async function getAllTickets(statusFilter?: TicketStatus) {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
  ]);
  const supabase = await createClient();

  let query = supabase
    .from("tickets")
    .select(
      "*, profiles:created_by(first_name, last_name, role), assigned_profile:assigned_to(first_name, last_name)"
    )
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  
  console.log("Academic Management - getAllTickets Debug:");
  console.log("Profile:", { id: profile.id, role: profile.role, tenant_id: profile.tenant_id });
  console.log("Tickets count:", data?.length || 0);
  console.log("Error:", error);
  console.log("First 3 tickets:", data?.slice(0, 3));
  
  return data || [];
}

export async function getTicketDetail(ticketId: string) {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
  ]);
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "*, profiles:created_by(first_name, last_name, role), assigned_profile:assigned_to(first_name, last_name)"
    )
    .eq("id", ticketId)
    .eq("tenant_id", profile.tenant_id)
    .single();

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("*, profiles:sender_id(first_name, last_name)")
    .eq("ticket_id", ticketId)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  const { data: workflows } = await supabase
    .from("approval_workflows")
    .select("*, profiles:approver_id(first_name, last_name)")
    .eq("ticket_id", ticketId)
    .eq("tenant_id", profile.tenant_id)
    .order("step_order", { ascending: true });

  return {
    ticket,
    messages: messages || [],
    workflows: workflows || [],
  };
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
) {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
  ]);
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { status };
  if (status === "resolved") updateData.resolved_at = new Date().toISOString();
  if (status === "closed") updateData.closed_at = new Date().toISOString();

  const { error } = await supabase
    .from("tickets")
    .update(updateData)
    .eq("id", ticketId)
    .eq("tenant_id", profile.tenant_id);

  if (error) throw new Error(error.message);

  const { data: ticket } = await supabase
    .from("tickets")
    .select("created_by, title")
    .eq("id", ticketId)
    .single();

  if (ticket) {
    const statusLabels: Record<string, string> = {
      in_progress: "قيد المعالجة",
      resolved: "تم الحل",
      closed: "مغلقة",
      rejected: "مرفوضة",
      pending_info: "بانتظار معلومات",
    };

    await supabase.from("notifications").insert({
      tenant_id: profile.tenant_id,
      recipient_id: ticket.created_by,
      notification_type: "ticket_update",
      title: `تحديث التذكرة: ${ticket.title}`,
      body: `تم تغيير حالة التذكرة إلى: ${statusLabels[status] || status}`,
      reference_table: "tickets",
      reference_id: ticketId,
    });
  }

  revalidatePath("/academic-management/tickets");
}

export async function assignTicket(ticketId: string, assigneeId: string) {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
  ]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("tickets")
    .update({ assigned_to: assigneeId, status: "in_progress" })
    .eq("id", ticketId)
    .eq("tenant_id", profile.tenant_id);

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/tickets");
}

export async function sendAdminTicketMessage(
  ticketId: string,
  body: string,
  isInternal: boolean
) {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
  ]);
  const supabase = await createClient();

  const { error } = await supabase.from("ticket_messages").insert({
    tenant_id: profile.tenant_id,
    ticket_id: ticketId,
    sender_id: profile.id,
    body,
    is_internal: isInternal,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/tickets");
}

export async function createApprovalWorkflow(
  ticketId: string,
  approverId: string,
  stepOrder: number
) {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
  ]);
  const supabase = await createClient();

  const { error } = await supabase.from("approval_workflows").insert({
    tenant_id: profile.tenant_id,
    ticket_id: ticketId,
    approver_id: approverId,
    step_order: stepOrder,
    status: "pending",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/tickets");
}

export async function decideApproval(
  workflowId: string,
  status: "approved" | "rejected",
  notes: string
) {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
  ]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("approval_workflows")
    .update({
      status,
      decision_notes: notes || null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", workflowId)
    .eq("tenant_id", profile.tenant_id);

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/tickets");
}

export async function getStaffMembers() {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
  ]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role")
    .eq("tenant_id", profile.tenant_id)
    .in("role", ["academic_management", "tenant_admin"])
    .order("first_name");

  return data || [];
}
