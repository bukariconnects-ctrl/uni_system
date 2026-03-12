"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";

export async function getConversations() {
  const { profile } = await requireRole(["student", "faculty"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("chatbot_conversations")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getConversationMessages(conversationId: string) {
  const { profile } = await requireRole(["student", "faculty"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("chatbot_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  return data || [];
}

export async function endConversation(conversationId: string) {
  await requireRole(["student", "faculty"]);
  const supabase = await createClient();

  await supabase
    .from("chatbot_conversations")
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq("id", conversationId);
}
