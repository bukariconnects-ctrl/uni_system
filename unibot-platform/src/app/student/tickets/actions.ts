"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { TicketCategory } from "@/lib/types/database";

export async function getMyTickets() {
  const { profile } = await requireRole(["student", "faculty"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("tickets")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .eq("created_by", profile.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function createTicket(formData: FormData) {
  const { profile } = await requireRole(["student", "faculty"]);
  const supabase = await createClient();

  const { error } = await supabase.from("tickets").insert({
    tenant_id: profile.tenant_id,
    created_by: profile.id,
    category: formData.get("category") as TicketCategory,
    priority: "medium",
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    related_section_id: (formData.get("section_id") as string) || null,
    ai_attempted: formData.get("ai_attempted") === "true",
    ai_suggestion: (formData.get("ai_suggestion") as string) || null,
    status: formData.get("auto_close") === "true" ? "closed" : "open",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/student/tickets");
}

export async function getTicketMessages(ticketId: string) {
  const { profile } = await requireRole(["student", "faculty"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("ticket_messages")
    .select("*, profiles:sender_id(first_name, last_name)")
    .eq("ticket_id", ticketId)
    .eq("tenant_id", profile.tenant_id)
    .eq("is_internal", false)
    .order("created_at", { ascending: true });

  return data || [];
}

export async function sendTicketMessage(ticketId: string, body: string) {
  const { profile } = await requireRole(["student", "faculty"]);
  const supabase = await createClient();

  const { error } = await supabase.from("ticket_messages").insert({
    tenant_id: profile.tenant_id,
    ticket_id: ticketId,
    sender_id: profile.id,
    body,
    is_internal: false,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/student/tickets");
}

export async function rateTicket(ticketId: string, rating: number) {
  const { profile } = await requireRole(["student", "faculty"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("tickets")
    .update({ rating })
    .eq("id", ticketId)
    .eq("created_by", profile.id);

  if (error) throw new Error(error.message);
  revalidatePath("/student/tickets");
}

export async function getAiSuggestion(description: string) {
  const { profile } = await requireRole(["student", "faculty"]);

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: description,
        new_conversation: true,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const noAnswer = "لم أجد معلومات كافية";
    if (data.message && !data.message.includes(noAnswer)) {
      return data.message as string;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getStudentSections(): Promise<
  { id: string; section_code: string; courses: { name: string } | null }[]
> {
  const { profile } = await requireRole(["student", "faculty"]);
  const supabase = await createClient();

  if (profile.role === "student") {
    const { data } = await supabase
      .from("enrollments")
      .select("sections(id, section_code, courses(name))")
      .eq("student_id", profile.id)
      .eq("status", "enrolled");

    return (data || [])
      .map(
        (e: Record<string, unknown>) =>
          e.sections as { id: string; section_code: string; courses: { name: string } | null } | null
      )
      .filter(Boolean) as { id: string; section_code: string; courses: { name: string } | null }[];
  }

  const { data } = await supabase
    .from("sections")
    .select("id, section_code, courses(name)")
    .eq("instructor_id", profile.id);

  return (data || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    section_code: s.section_code as string,
    courses: Array.isArray(s.courses) ? (s.courses[0] as { name: string } | null) : (s.courses as { name: string } | null),
  }));
}
