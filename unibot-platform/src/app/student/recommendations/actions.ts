"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";

export async function getRecommendations() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_recommendations")
    .select("*, courses(name), profiles!sent_by(first_name, last_name)")
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}
