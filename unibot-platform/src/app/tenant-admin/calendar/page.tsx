import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { CalendarClient } from "./calendar-client";

export default async function CalendarPage() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data: semesters } = await supabase
    .from("semesters")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التقويم الأكاديمي</h1>
        <p className="mt-1 text-sm text-text-secondary">
          إدارة الفصول الدراسية ومواعيد التسجيل
        </p>
      </div>
      <CalendarClient initialSemesters={semesters || []} />
    </div>
  );
}
