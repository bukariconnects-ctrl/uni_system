"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Megaphone, AlertTriangle, Bell } from "lucide-react";

interface Circular {
  id: string;
  title: string;
  body: string;
  target_type: string;
  is_mandatory: boolean;
  created_at: string;
  expires_at: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  all: "الجميع",
  students: "الطلاب",
  faculty: "أعضاء هيئة التدريس",
  department: "قسم",
  major: "تخصص",
  level: "مستوى",
  section: "شعبة",
  all_my_students: "كل الطلاب",
  section_students: "شعبة محددة",
};

export function StudentCircularsClient({
  circulars: initialCirculars,
  userId,
  tenantId,
}: {
  circulars: Circular[];
  userId: string;
  tenantId: string;
}) {
  const [circulars, setCirculars] = useState<Circular[]>(initialCirculars);
  const supabase = createClient();

  // Listen for new published circulars via notifications
  useEffect(() => {
    const channel = supabase
      .channel(`student-circulars-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          const n = payload.new as any;
          if (n.notification_type !== "circular" || !n.reference_id) return;

          // Fetch the new circular
          const { data } = await supabase
            .from("circulars")
            .select("*")
            .eq("id", n.reference_id)
            .single();

          if (data) {
            setCirculars((prev) => {
              if (prev.find((c) => c.id === data.id)) return prev;
              return [data, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (circulars.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card-bg p-16 text-center">
        <Bell className="mx-auto mb-3 h-12 w-12 text-text-secondary/50" />
        <p className="font-medium text-text-primary">لا توجد تعاميم</p>
        <p className="mt-1 text-sm text-text-secondary">
          ستظهر هنا التعاميم الموجهة إليك
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {circulars.map((circular) => {
        const isExpired =
          circular.expires_at && new Date(circular.expires_at) < new Date();

        return (
          <div
            key={circular.id}
            className={`rounded-2xl border bg-card-bg p-4 shadow-sm transition-all ${
              circular.is_mandatory
                ? "border-danger/40 bg-danger/5"
                : "border-border"
            } ${isExpired ? "opacity-60" : ""}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  circular.is_mandatory ? "bg-danger/15" : "bg-action-blue/10"
                }`}
              >
                {circular.is_mandatory ? (
                  <AlertTriangle className="h-5 w-5 text-danger" />
                ) : (
                  <Megaphone className="h-5 w-5 text-action-blue" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-text-primary">{circular.title}</h3>
                  {circular.is_mandatory && (
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                      إلزامي
                    </span>
                  )}
                  {isExpired && (
                    <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                      منتهي الصلاحية
                    </span>
                  )}
                  <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                    {ROLE_LABELS[circular.target_type] || circular.target_type}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {circular.body}
                </p>
                <p className="mt-2 text-xs text-text-secondary/70">
                  {new Date(circular.created_at).toLocaleString("ar-SA")}
                  {circular.expires_at && (
                    <span className="mr-3 text-warning">
                      • ينتهي: {new Date(circular.expires_at).toLocaleDateString("ar-SA")}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
