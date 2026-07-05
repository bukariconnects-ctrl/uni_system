"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";

export async function getChannels() {
  const { profile } = await requireRole(["faculty", "student"]);
  const serviceClient = createServiceClient();

  const { data } = await serviceClient
    .from("channel_members")
    .select("muted_until, last_read_at, channels(id, name, channel_type, course_id, academic_level_id, major_id, is_readonly, allow_student_messages)")
    .eq("profile_id", profile.id)
    .eq("tenant_id", profile.tenant_id);

  let channels = (data || []).map((cm: any) => cm.channels ? {
    ...cm.channels,
    muted_until: cm.muted_until,
    last_read_at: cm.last_read_at,
    can_send: cm.channels.allow_student_messages !== false && (!cm.muted_until || new Date(cm.muted_until) <= new Date())
  } : null).filter(Boolean) as any[];

  // Resolve channel names from canonical data (courses, majors, levels)
  const courseIds = [...new Set(channels.map((ch: any) => ch.course_id).filter(Boolean))];
  const levelIds = [...new Set(channels.map((ch: any) => ch.academic_level_id).filter(Boolean))];
  const channelMajorIds = [...new Set(channels.map((ch: any) => ch.major_id).filter(Boolean))];

  if (courseIds.length > 0 || levelIds.length > 0 || channelMajorIds.length > 0) {
    const [coursesRes, levelsRes, channelMajorsRes] = await Promise.all([
      courseIds.length > 0 ? serviceClient.from("courses").select("id, name").in("id", courseIds) : { data: [] },
      levelIds.length > 0 ? serviceClient.from("academic_levels").select("id, major_id, level_number").in("id", levelIds) : { data: [] },
      channelMajorIds.length > 0 ? serviceClient.from("majors").select("id, name").in("id", channelMajorIds) : { data: [] },
    ]);

    const courseMap = new Map((coursesRes.data || []).map((c: any) => [c.id, c.name]));
    const levelMap = new Map((levelsRes.data || []).map((l: any) => [l.id, l]));
    const channelMajorMap = new Map((channelMajorsRes.data || []).map((m: any) => [m.id, m.name]));

    const majorIds = [...new Set(Array.from(levelMap.values()).map((l: any) => l.major_id).filter(Boolean))];
    const majorMap = new Map(
      majorIds.length > 0
        ? (await serviceClient.from("majors").select("id, name").in("id", majorIds)).data?.map((m: any) => [m.id, m.name]) || []
        : []
    );

    // Fetch student's own primary major as fallback for channels missing data
    let studentMajorName: string | null = null;
    let studentLevelNum: number | null = null;
    if (profile.role === "student") {
      const { data: sm } = await serviceClient
        .from("student_majors")
        .select("major_id, academic_level_id, majors(name), academic_levels(level_number)")
        .eq("student_id", profile.id)
        .eq("is_primary", true)
        .maybeSingle();

      if (sm) {
        studentMajorName = (sm.majors as any)?.name ?? null;
        studentLevelNum = (sm.academic_levels as any)?.level_number ?? null;
      }
    }

    channels = channels.map((ch: any) => {
      const courseName = courseMap.get(ch.course_id) || "مادة";
      const level = levelMap.get(ch.academic_level_id);

      // Priority: channel's own major_id → level's major_id → student's primary major
      const majorName = channelMajorMap.get(ch.major_id)
        || majorMap.get(level?.major_id)
        || studentMajorName;

      // Priority: channel's level → student's enrolled level
      const levelNum = level?.level_number ?? studentLevelNum;

      return { ...ch, name: `${courseName} - ${majorName || "تخصص"} - مستوى ${levelNum ?? "?"}` };
    });
  }

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
