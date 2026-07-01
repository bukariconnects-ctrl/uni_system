"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getChannels() {
  const { profile } = await requireRole(["faculty", "student"]);
  const serviceClient = createServiceClient();

  const { data } = await serviceClient
    .from("channel_members")
    .select("is_admin, last_read_at, channels(id, name, channel_type, course_id, is_readonly, allow_student_messages, courses(code, name))")
    .eq("profile_id", profile.id)
    .eq("tenant_id", profile.tenant_id);

  const channels = (data || []).map((cm: any) => ({ ...cm.channels, is_admin: cm.is_admin, last_read_at: cm.last_read_at })).filter(Boolean);

  // Fetch unread counts
  const { data: unreadData } = await serviceClient.rpc("get_unread_channel_counts", {
    p_profile_id: profile.id,
  });

  const unreadMap: Record<string, number> = {};
  if (unreadData) {
    for (const row of unreadData as any[]) {
      unreadMap[row.channel_id] = Number(row.unread_count);
    }
  }

  return channels.map((ch: any) => ({
    ...ch,
    unread_count: unreadMap[ch.id] || 0,
  }));
}

export async function getConversations() {
  const { profile } = await requireRole(["faculty", "student"]);
  const serviceClient = createServiceClient();

  const { data } = await serviceClient
    .from("conversations")
    .select("*, participant_a_profile:profiles!conversations_participant_a_fkey(id, first_name, last_name, role), participant_b_profile:profiles!conversations_participant_b_fkey(id, first_name, last_name, role)")
    .eq("tenant_id", profile.tenant_id)
    .or(`participant_a.eq.${profile.id},participant_b.eq.${profile.id}`)
    .order("last_message_at", { ascending: false });

  const conversations = (data || []).map((conv: any) => {
    const other = conv.participant_a === profile.id ? conv.participant_b_profile : conv.participant_a_profile;
    return { ...conv, other_user: other };
  });

  // Fetch unread counts
  const { data: unreadData } = await serviceClient.rpc("get_unread_conversation_counts", {
    p_profile_id: profile.id,
  });

  const unreadMap: Record<string, number> = {};
  if (unreadData) {
    for (const row of unreadData as any[]) {
      unreadMap[row.conversation_id] = Number(row.unread_count);
    }
  }

  return conversations.map((conv: any) => ({
    ...conv,
    unread_count: unreadMap[conv.id] || 0,
  }));
}

export async function getMessages(type: "channel" | "conversation", targetId: string) {
  await requireRole(["faculty", "student"]);
  const serviceClient = createServiceClient();

  let query = serviceClient
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
  const serviceClient = createServiceClient();

  const messageType = formData.get("message_type") as "channel" | "direct";
  const body = formData.get("body") as string;

  if (!body?.trim()) throw new Error("الرسالة فارغة");

  if (messageType === "channel" && profile.role === "student") {
    const channelId = formData.get("channel_id") as string;

    const { data: channel } = await serviceClient
      .from("channels")
      .select("allow_student_messages")
      .eq("id", channelId)
      .single();

    if (channel?.allow_student_messages === false) {
      throw new Error("المحاضر قام بتعطيل إرسال الرسائل في هذه القناة");
    }

    const { data: membership } = await serviceClient
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

  const { error } = await serviceClient.from("messages").insert(insert);
  if (error) throw new Error(error.message);
}

export async function startConversation(targetUserId: string) {
  const { profile } = await requireRole(["faculty", "student"]);
  const serviceClient = createServiceClient();

  const { data: existing } = await serviceClient
    .from("conversations")
    .select("id")
    .eq("tenant_id", profile.tenant_id)
    .or(`and(participant_a.eq.${profile.id},participant_b.eq.${targetUserId}),and(participant_a.eq.${targetUserId},participant_b.eq.${profile.id})`)
    .single();

  if (existing) return existing.id;

  const { data, error } = await serviceClient
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
  const serviceClient = createServiceClient();

  const { data } = await serviceClient
    .from("profiles")
    .select("id, first_name, last_name, role, email")
    .eq("tenant_id", profile.tenant_id)
    .neq("id", profile.id)
    .in("role", ["faculty", "student"])
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);

  return data || [];
}

export async function getChannelMembers(channelId: string) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { data } = await serviceClient
    .from("channel_members")
    .select("*, profiles(id, first_name, last_name, role, student_profiles(student_number))")
    .eq("channel_id", channelId)
    .eq("tenant_id", profile.tenant_id);

  return data || [];
}

export async function getChannelSettings(channelId: string) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { data } = await serviceClient
    .from("channels")
    .select("id, name, allow_student_messages, settings, course_id")
    .eq("id", channelId)
    .single();

  if (data?.course_id) {
    const { data: mySchedules } = await serviceClient
      .from("course_schedules")
      .select("study_plan_course_id")
      .eq("instructor_id", profile.id);

    const spcIds = [...new Set((mySchedules || []).map((s: any) => s.study_plan_course_id).filter(Boolean))];

    if (spcIds.length > 0) {
      const { data: spcList } = await serviceClient
        .from("study_plan_courses")
        .select("course_id")
        .in("id", spcIds);

      const taughtCourseIds = [...new Set((spcList || []).map((s: any) => s.course_id).filter(Boolean))];

      if (!taughtCourseIds.includes(data.course_id)) {
        throw new Error("ليس لديك صلاحية إدارة هذه القناة");
      }
    }
  }

  return data;
}

export async function updateChannelSettings(channelId: string, settings: { allow_student_messages?: boolean }) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { data: channel } = await serviceClient
    .from("channels")
    .select("course_id")
    .eq("id", channelId)
    .single();

  if (channel?.course_id) {
    const { data: mySchedules } = await serviceClient
      .from("course_schedules")
      .select("study_plan_course_id")
      .eq("instructor_id", profile.id);

    const spcIds = [...new Set((mySchedules || []).map((s: any) => s.study_plan_course_id).filter(Boolean))];

    if (spcIds.length > 0) {
      const { data: spcList } = await serviceClient
        .from("study_plan_courses")
        .select("course_id")
        .in("id", spcIds);

      const taughtCourseIds = [...new Set((spcList || []).map((s: any) => s.course_id).filter(Boolean))];

      if (!taughtCourseIds.includes(channel.course_id)) {
        throw new Error("ليس لديك صلاحية إدارة هذه القناة");
      }
    }
  }

  const { error } = await serviceClient
    .from("channels")
    .update({ allow_student_messages: settings.allow_student_messages })
    .eq("id", channelId);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/messages");
}

export async function muteChannelMember(channelId: string, memberId: string, muteUntil: string | null) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { data: membership } = await serviceClient
    .from("channel_members")
    .select("is_admin")
    .eq("channel_id", channelId)
    .eq("profile_id", profile.id)
    .single();

  if (!membership?.is_admin) {
    throw new Error("ليس لديك صلاحية إدارة هذه القناة");
  }

  const { error } = await serviceClient
    .from("channel_members")
    .update({ muted_until: muteUntil })
    .eq("channel_id", channelId)
    .eq("profile_id", memberId);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/messages");
}

export async function markChannelRead(channelId: string) {
  const { profile } = await requireRole(["faculty", "student"]);
  const serviceClient = createServiceClient();

  await serviceClient
    .from("channel_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("channel_id", channelId)
    .eq("profile_id", profile.id);
}

export async function markConversationRead(conversationId: string) {
  const { profile } = await requireRole(["faculty", "student"]);
  const serviceClient = createServiceClient();

  const { data: conv } = await serviceClient
    .from("conversations")
    .select("participant_a, participant_b")
    .eq("id", conversationId)
    .single();

  if (!conv) return;

  const field = conv.participant_a === profile.id ? "last_read_at_a" : "last_read_at_b";
  await serviceClient
    .from("conversations")
    .update({ [field]: new Date().toISOString() })
    .eq("id", conversationId);
}
