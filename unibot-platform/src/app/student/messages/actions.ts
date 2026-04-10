"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getChannels() {
  const { profile } = await requireRole(["faculty", "student"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("channel_members")
    .select("muted_until, channels(id, name, channel_type, section_id, is_readonly, allow_student_messages, sections(section_code, courses(code, name)))")
    .eq("profile_id", profile.id)
    .eq("tenant_id", profile.tenant_id);

  return (data || []).map((cm: any) => ({
    ...cm.channels,
    muted_until: cm.muted_until,
    can_send: cm.channels?.allow_student_messages !== false && (!cm.muted_until || new Date(cm.muted_until) <= new Date())
  })).filter(Boolean);
}

export async function getConversations() {
  const { profile } = await requireRole(["faculty", "student"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("conversations")
    .select("*, participant_a_profile:profiles!conversations_participant_a_fkey(id, first_name, last_name, role), participant_b_profile:profiles!conversations_participant_b_fkey(id, first_name, last_name, role)")
    .eq("tenant_id", profile.tenant_id)
    .or(`participant_a.eq.${profile.id},participant_b.eq.${profile.id}`)
    .order("last_message_at", { ascending: false });

  return (data || []).map((conv: any) => {
    const other = conv.participant_a === profile.id ? conv.participant_b_profile : conv.participant_a_profile;
    return { ...conv, other_user: other };
  });
}

export async function getMessages(type: "channel" | "conversation", targetId: string) {
  await requireRole(["faculty", "student"]);
  const supabase = await createClient();

  let query = supabase
    .from("messages")
    .select("*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, role)")
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(100);

  if (type === "channel") {
    query = query.eq("channel_id", targetId).eq("message_type", "channel");
  } else {
    query = query.eq("conversation_id", targetId).eq("message_type", "direct");
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function sendMessage(formData: FormData) {
  const { profile } = await requireRole(["faculty", "student"]);
  const supabase = await createClient();

  const messageType = formData.get("message_type") as "channel" | "direct";
  const body = formData.get("body") as string;

  if (!body?.trim()) throw new Error("الرسالة فارغة");

  // Check channel permissions for students
  if (messageType === "channel" && profile.role === "student") {
    const channelId = formData.get("channel_id") as string;
    
    // Check if channel allows student messages
    const { data: channel } = await supabase
      .from("channels")
      .select("allow_student_messages")
      .eq("id", channelId)
      .single();
    
    if (channel?.allow_student_messages === false) {
      throw new Error("المحاضر قام بتعطيل إرسال الرسائل في هذه القناة");
    }
    
    // Check if student is muted
    const { data: membership } = await supabase
      .from("channel_members")
      .select("muted_until")
      .eq("channel_id", channelId)
      .eq("profile_id", profile.id)
      .single();
    
    if (membership?.muted_until && new Date(membership.muted_until) > new Date()) {
      throw new Error("تم كتمك من قبل المحاضر ولا يمكنك إرسال رسائل حالياً");
    }
  }

  const insert: Record<string, unknown> = {
    tenant_id: profile.tenant_id,
    message_type: messageType,
    sender_id: profile.id,
    body: body.trim(),
    status: "sent",
  };

  if (messageType === "channel") {
    insert.channel_id = formData.get("channel_id") as string;
  } else {
    insert.conversation_id = formData.get("conversation_id") as string;
  }

  const { error } = await supabase.from("messages").insert(insert);
  if (error) throw new Error(error.message);
}

export async function startConversation(targetUserId: string) {
  const { profile } = await requireRole(["faculty", "student"]);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("tenant_id", profile.tenant_id)
    .or(`and(participant_a.eq.${profile.id},participant_b.eq.${targetUserId}),and(participant_a.eq.${targetUserId},participant_b.eq.${profile.id})`)
    .single();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      tenant_id: profile.tenant_id,
      participant_a: profile.id,
      participant_b: targetUserId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function searchUsers(query: string) {
  const { profile } = await requireRole(["faculty", "student"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, email")
    .eq("tenant_id", profile.tenant_id)
    .neq("id", profile.id)
    .in("role", ["faculty", "student"])
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);

  return data || [];
}
