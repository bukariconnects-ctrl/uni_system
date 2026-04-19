"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Tables to watch per role and pathname pattern
const ROLE_SUBSCRIPTIONS: Record<string, Array<{ table: string; pathPattern?: string }>> = {
  student: [
    { table: "assignments" },
    { table: "course_materials" },
    { table: "circulars" },
    { table: "gradebook_entries" },
    { table: "attendance_summaries" },
    { table: "submissions" },
  ],
  faculty: [
    { table: "submissions" },
    { table: "assignments" },
    { table: "circulars" },
    { table: "gradebook_entries" },
    { table: "attendance_summaries" },
  ],
  academic_management: [
    { table: "submissions" },
    { table: "assignments" },
    { table: "circulars" },
  ],
  tenant_admin: [
    { table: "assignments" },
    { table: "circulars" },
  ],
};

// Maps a DB table name to a URL path pattern to decide when to refresh
const TABLE_PATH_MAP: Record<string, string[]> = {
  assignments:         ["/assignments"],
  course_materials:    ["/materials"],
  circulars:           ["/circulars"],
  gradebook_entries:   ["/grades", "/gradebook"],
  attendance_summaries:["/attendance"],
  submissions:         ["/assignments"],
};

export function RealtimePageRefresher({
  userId,
  tenantId,
  userRole,
  sectionIds = [],
}: {
  userId: string;
  tenantId: string;
  userRole: string;
  sectionIds?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  // Debounce: avoid multiple rapid refreshes
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleRefresh(table: string) {
    const matchedPaths = TABLE_PATH_MAP[table] ?? [];
    const shouldRefresh = matchedPaths.some((p) => pathname.includes(p));
    if (!shouldRefresh) return;

    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      router.refresh();
    }, 600);
  }

  useEffect(() => {
    const subscriptions = ROLE_SUBSCRIPTIONS[userRole] ?? [];
    const channels: ReturnType<typeof supabase.channel>[] = [];

    for (const { table } of subscriptions) {
      const ch = supabase
        .channel(`realtime-${userRole}-${table}-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
          },
          () => scheduleRefresh(table)
        )
        .subscribe();

      channels.push(ch);
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userRole, pathname]);

  return null;
}
