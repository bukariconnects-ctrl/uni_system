"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { TicketStatus } from "@/lib/types/database";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function getAllTenantTickets(statusFilter?: TicketStatus) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  let query = supabase
    .from("tickets")
    .select(
      "*, profiles:created_by(first_name, last_name, role), assigned_profile:assigned_to(first_name, last_name)"
    )
    .eq("tenant_id", profile.tenant_id)
    .eq("is_direct_to_faculty", false)  // direct-to-faculty tickets go only to instructor
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data } = await query;
  return data || [];
}

export async function getTicketDetail(ticketId: string) {
  const { profile } = await requireRole(["tenant_admin"]);
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

  const { data: escalations } = await supabase
    .from("ticket_escalations")
    .select("*, escalated_by_profile:escalated_by(first_name, last_name), escalated_to_profile:escalated_to(first_name, last_name)")
    .eq("ticket_id", ticketId)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  return {
    ticket,
    messages: messages || [],
    workflows: workflows || [],
    escalations: escalations || [],
  };
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { status };
  if (status === "resolved") updateData.resolved_at = new Date().toISOString();
  if (status === "closed") updateData.closed_at = new Date().toISOString();
  if (status === "in_progress") updateData.assigned_to = profile.id;

  const { error } = await supabase
    .from("tickets")
    .update(updateData)
    .eq("id", ticketId)
    .eq("tenant_id", profile.tenant_id);

  if (error) throw new Error(error.message);

  // Notify the ticket creator
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
    });
  }

  revalidatePath("/tenant-admin/tickets");
}

export async function assignTicket(ticketId: string, assigneeId: string) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("tickets")
    .update({ assigned_to: assigneeId, status: "in_progress" })
    .eq("id", ticketId)
    .eq("tenant_id", profile.tenant_id);

  if (error) throw new Error(error.message);

  // Notify the assigned user
  const { data: ticket } = await supabase
    .from("tickets")
    .select("title")
    .eq("id", ticketId)
    .single();

  if (ticket) {
    await supabase.from("notifications").insert({
      tenant_id: profile.tenant_id,
      recipient_id: assigneeId,
      notification_type: "ticket_assigned" as any,
      title: `📩 تذكرة جديدة موكلة إليك: ${ticket.title}`,
      body: "تم تعيين تذكرة لك من مدير النظام",
      reference_table: "tickets",
      reference_id: ticketId,
    });
  }

  revalidatePath("/tenant-admin/tickets");
}

export async function sendTicketMessage(ticketId: string, body: string, isInternal: boolean) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("ticket_messages").insert({
    tenant_id: profile.tenant_id,
    ticket_id: ticketId,
    sender_id: profile.id,
    body,
    is_internal: isInternal,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/tickets");
}

export async function getStaffMembers() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role")
    .eq("tenant_id", profile.tenant_id)
    .in("role", ["academic_management", "tenant_admin", "faculty"])
    .order("first_name");

  return data || [];
}

export async function getDashboardStats() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data: stats } = await supabase
    .from("tickets")
    .select("status, priority, category")
    .eq("tenant_id", profile.tenant_id);

  if (!stats) return { total: 0, open: 0, urgent: 0, byCategory: {} };

  const total = stats.length;
  const open = stats.filter((t: any) => t.status === "open").length;
  const urgent = stats.filter((t: any) => t.priority === "urgent").length;

  const byCategory: Record<string, number> = {};
  for (const t of stats as any[]) {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  }

  return { total, open, urgent, byCategory };
}

export async function summarizeConversation(ticketId: string) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("*, profiles:sender_id(first_name, last_name)")
    .eq("ticket_id", ticketId)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  if (!messages || messages.length === 0) return "لا توجد رسائل";

  const text = messages
    .map((m: any) => `${m.profiles?.first_name || ""} ${m.profiles?.last_name || ""}: ${m.body}`)
    .join("\n");

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
    });
    const result = await model.generateContent(
      `لخص المحادثة التالية بالعربية في 3-5 نقاط:\n\n${text}\n\nالملخص:`
    );
    return result.response.text().trim();
  } catch {
    return "فشل التلخيص";
  }
}
