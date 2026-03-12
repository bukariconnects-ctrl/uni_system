import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementsClient } from "./announcements-client";

export default async function AnnouncementsPage() {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data: announcements } = await supabase
    .from("system_announcements")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">إعلانات المنصة</h1>
        <p className="mt-1 text-sm text-text-secondary">
          إعلانات تظهر لجميع مديري الجامعات المشتركة
        </p>
      </div>
      <AnnouncementsClient initialAnnouncements={announcements || []} />
    </div>
  );
}
