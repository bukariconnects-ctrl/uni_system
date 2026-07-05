"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

async function syncFacultyChannels(profileId: string, tenantId: string | null, db: ReturnType<typeof createServiceClient>) {
  if (!tenantId) return;

  const { data: schedules } = await db
    .from("course_schedules")
    .select("semester_id, study_plan_course_id")
    .eq("instructor_id", profileId);

  if (!schedules || schedules.length === 0) return;

  const spcIds = [...new Set(schedules.map((s: any) => s.study_plan_course_id).filter(Boolean))];
  if (spcIds.length === 0) return;

  const { data: spcList } = await db
    .from("study_plan_courses")
    .select("id, course_id, academic_level_id")
    .in("id", spcIds);

  if (!spcList || spcList.length === 0) return;

  const levelIds = [...new Set(spcList.map((s: any) => s.academic_level_id).filter(Boolean))];
  if (levelIds.length === 0) return;

  const { data: levels } = await db
    .from("academic_levels")
    .select("id, major_id, level_number")
    .in("id", levelIds);

  const levelMap = new Map((levels || []).map((l: any) => [l.id, { major_id: l.major_id, level_number: l.level_number }]));

  const spcInfo = new Map<string, { course_id: string; academic_level_id: string; major_id: string; level_number: number }>();
  for (const spc of spcList as any[]) {
    const info = levelMap.get(spc.academic_level_id);
    if (!info || !info.major_id) continue;
    spcInfo.set(spc.id, {
      course_id: spc.course_id,
      academic_level_id: spc.academic_level_id,
      major_id: info.major_id,
      level_number: info.level_number,
    });
  }

  const courseIds = [...new Set(Array.from(spcInfo.values()).map((i) => i.course_id))];
  const majorIds = [...new Set(Array.from(spcInfo.values()).map((i) => i.major_id))];

  const [courseRes, majorRes] = await Promise.all([
    db.from("courses").select("id, name").in("id", courseIds),
    db.from("majors").select("id, name").in("id", majorIds),
  ]);
  const courseNameMap = new Map((courseRes.data || []).map((c: any) => [c.id, c.name]));
  const majorNameMap = new Map((majorRes.data || []).map((m: any) => [m.id, m.name]));

  const seen = new Set<string>();
  for (const s of schedules) {
    const info = spcInfo.get(s.study_plan_course_id);
    if (!info) continue;
    const key = `${info.course_id}|${info.academic_level_id}|${s.semester_id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const courseName = courseNameMap.get(info.course_id) || "مادة";
    const majorName = majorNameMap.get(info.major_id) || "تخصص";
    const correctName = `${courseName} - ${majorName} - مستوى ${info.level_number}`;

    // Find ALL channels for this (course_id + academic_level_id + semester_id)
    const { data: allChannels } = await db
      .from("channels")
      .select("id, major_id")
      .eq("channel_type", "course")
      .eq("tenant_id", tenantId)
      .eq("course_id", info.course_id)
      .eq("academic_level_id", info.academic_level_id)
      .eq("semester_id", s.semester_id);

    // Pick or create the canonical channel (the one with the correct major_id)
    let canonical = (allChannels || []).find((ch: any) => ch.major_id === info.major_id);

    if (!canonical) {
      // Look for old channel with NULL major_id to upgrade
      const oldChan = (allChannels || []).find((ch: any) => ch.major_id === null);
      if (oldChan) {
        // Upgrade old channel to canonical
        await db.from("channels").update({ name: correctName, major_id: info.major_id }).eq("id", oldChan.id);
        canonical = { id: oldChan.id, major_id: info.major_id };
      } else {
        // Create a new channel
        const { data: newCh } = await db
          .from("channels")
          .insert({
            tenant_id: tenantId, course_id: info.course_id, major_id: info.major_id,
            academic_level_id: info.academic_level_id, semester_id: s.semester_id,
            name: correctName, channel_type: "course",
          })
          .select("id")
          .single();
        if (newCh) canonical = { id: newCh.id, major_id: info.major_id };
      }
    } else {
      // Canonical exists — ensure name is correct
      await db.from("channels").update({ name: correctName }).eq("id", canonical.id);
    }

    if (!canonical) continue;

    // Migrate members FROM all OTHER channels for this group TO the canonical channel
    const otherIds = (allChannels || [])
      .filter((ch: any) => ch.id !== canonical!.id)
      .map((ch: any) => ch.id);

    if (otherIds.length > 0) {
      // Move messages from old channels to canonical
      await db.from("messages").update({ channel_id: canonical.id }).in("channel_id", otherIds);
      // Move all channel_members from old channels to canonical (skip duplicates)
      const { data: orphanMembers } = await db
        .from("channel_members")
        .select("profile_id, is_admin, muted_until, last_read_at")
        .in("channel_id", otherIds);

      if (orphanMembers) {
        for (const om of orphanMembers as any[]) {
          await db
            .from("channel_members")
            .upsert(
              { channel_id: canonical.id, profile_id: om.profile_id, tenant_id: tenantId, is_admin: om.is_admin || false, muted_until: om.muted_until, last_read_at: om.last_read_at },
              { onConflict: "channel_id, profile_id" }
            );
        }
      }
      // Delete old channels (cascades to remaining channel_members)
      await db.from("channels").delete().in("id", otherIds);
    }

    // Ensure current faculty is admin member
    await db
      .from("channel_members")
      .upsert(
        { channel_id: canonical.id, profile_id: profileId, tenant_id: tenantId, is_admin: true },
        { onConflict: "channel_id, profile_id" }
      );
  }
}

export async function getChannels() {
  const { profile } = await requireRole(["faculty", "student"]);
  const serviceClient = createServiceClient();

  if (profile.role === "faculty") {
    await syncFacultyChannels(profile.id, profile.tenant_id, serviceClient);
  }

  const { data } = await serviceClient
    .from("channel_members")
    .select("is_admin, last_read_at, channels(id, name, channel_type, course_id, is_readonly, allow_student_messages)")
    .eq("profile_id", profile.id)
    .eq("tenant_id", profile.tenant_id);

  const channels = (data || []).map((cm: any) => cm.channels ? { ...cm.channels, is_admin: cm.is_admin, last_read_at: cm.last_read_at } : null).filter(Boolean);

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

export async function deleteAllChannelMessages(channelId: string) {
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
        throw new Error("ليس لديك صلاحية حذف رسائل هذه القناة");
      }
    }
  }

  const { error } = await serviceClient
    .from("messages")
    .delete()
    .eq("channel_id", channelId);

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
