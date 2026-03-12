import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types/database";

export async function getUser(): Promise<{
  user: { id: string; email: string };
  profile: Profile;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return {
    user: { id: user.id, email: user.email! },
    profile: profile as Profile,
  };
}

export async function requireRole(allowedRoles: string[]) {
  const { user, profile } = await getUser();

  if (!allowedRoles.includes(profile.role)) {
    redirect("/unauthorized");
  }

  return { user, profile };
}
