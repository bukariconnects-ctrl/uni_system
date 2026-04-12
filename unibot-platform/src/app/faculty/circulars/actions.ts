"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

/** Creates a circular as a draft — uses valid enum values only */
export async function createFacultyCircular(formData: FormData) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const targetType = formData.get("target_type") as string; // "section" | "students"
  const targetId = (formData.get("target_id") as string) || null;

  // Security: if targeting a specific section, verify faculty owns it
  if (targetType === "section" && targetId) {
    const { data: section } = await supabase
      .from("sections")
      .select("instructor_id")
      .eq("id", targetId)
      .single();

    if (section?.instructor_id !== profile.id) {
      throw new Error("لا يمكنك إنشاء تعميم لشعبة لا تدرّسها");
    }
  }

  const { error } = await supabase.from("circulars").insert({
    tenant_id: profile.tenant_id,
    created_by: profile.id,
    title: formData.get("title") as string,
    body: formData.get("body") as string,
    target_type: targetType,   // "section" or "students" — valid enum values
    target_id: targetType === "section" ? targetId : null,
    is_mandatory: false,
    is_published: false,
    expires_at: (formData.get("expires_at") as string) || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/circulars");
}

/** Publishes a faculty circular and sends targeted notifications.
 *  - target_type = "section"   → notify students enrolled in that section
 *  - target_type = "students"  → notify students enrolled in ALL faculty's sections
 */
export async function publishFacultyCircular(id: string) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  // Mark as published (ownership check via created_by)
  const { data: circular, error } = await supabase
    .from("circulars")
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", profile.id)
    .select()
    .single();

  if (error || !circular) throw new Error("لا يمكن نشر هذا التعميم");

  const { target_type, target_id, title, body, tenant_id } = circular;
  let userIds: string[] = [];

  if (target_type === "section" && target_id) {
    // Only students enrolled in the given section
    const { data: enrollments } = await serviceClient
      .from("enrollments")
      .select("student_id")
      .eq("section_id", target_id)
      .eq("status", "enrolled");
    userIds = (enrollments || []).map((e: any) => e.student_id);

  } else if (target_type === "students") {
    // Students enrolled in ANY section taught by this faculty member
    const { data: mySections } = await serviceClient
      .from("sections")
      .select("id")
      .eq("instructor_id", profile.id)
      .eq("tenant_id", tenant_id);

    const sectionIds = (mySections || []).map((s: any) => s.id);

    if (sectionIds.length > 0) {
      const { data: enrollments } = await serviceClient
        .from("enrollments")
        .select("student_id")
        .in("section_id", sectionIds)
        .eq("status", "enrolled");
      userIds = [...new Set((enrollments || []).map((e: any) => e.student_id))];
    }
  }

  // Bulk insert notifications in batches of 100
  if (userIds.length > 0) {
    const notifications = userIds.map((uid) => ({
      tenant_id,
      recipient_id: uid,
      notification_type: "circular",
      title: `📢 ${title}`,
      body: body?.substring(0, 150) || "",
      reference_table: "circulars",
      reference_id: id,
      is_read: false,
    }));

    const BATCH = 100;
    for (let i = 0; i < notifications.length; i += BATCH) {
      await serviceClient.from("notifications").insert(notifications.slice(i, i + BATCH));
    }
  }

  revalidatePath("/faculty/circulars");
}

/** Deletes a faculty's own circular */
export async function deleteFacultyCircular(id: string) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("circulars")
    .delete()
    .eq("id", id)
    .eq("created_by", profile.id);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/circulars");
}
