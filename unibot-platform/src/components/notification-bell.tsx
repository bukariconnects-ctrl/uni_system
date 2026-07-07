"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, X, Check } from "lucide-react";

export function NotificationBell({
  userId,
  tenantId,
  userRole,
}: {
  userId: string;
  tenantId: string;
  userRole: string;
}) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as any;
          setNotifications((prev) => [n, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setNotifications((prev) => {
            const next = prev.map((n) => (n.id === updated.id ? updated : n));
            setUnreadCount(next.filter((n) => !n.is_read).length);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function loadNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", userId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(30);

    const items = data || [];
    setNotifications(items);
    setUnreadCount(items.filter((n: any) => !n.is_read).length);
  }

  async function markAsRead(id: string) {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  function handleNotificationClick(notification: any) {
    markAsRead(notification.id);
    setIsOpen(false);

    const { reference_table, reference_id } = notification;

    if (!reference_table || !reference_id) return;

    const basePath = userRole === "faculty" ? "/faculty" : 
                     userRole === "student" ? "/student" :
                     userRole === "academic_management" ? "/academic-management" :
                     userRole === "tenant_admin" ? "/tenant-admin" : "/student";

    switch (reference_table) {
      case "messages":
        router.push(`${basePath}/messages`);
        break;
      case "course_materials":
        router.push(`${basePath}/materials`);
        break;
      case "assignments":
        router.push(`${basePath}/assignments`);
        break;
      case "gradebook_entries":
        if (userRole === "faculty") {
          router.push(`${basePath}/gradebook`);
        } else {
          router.push(`${basePath}/grades`);
        }
        break;
      case "circulars":
        router.push(`${basePath}/circulars`);
        break;
      case "tickets":
        router.push(`${basePath}/tickets`);
        break;
      default:
        break;
    }
  }

  const TYPE_COLORS: Record<string, string> = {
    absence_warning: "text-warning",
    absence_dismissal: "text-danger",
    grade_released: "text-success",
    assignment_due: "text-action-blue",
    ticket_update: "text-purple",
    new_ticket: "text-action-blue",
    ticket_assigned: "text-purple",
    risk_alert: "text-danger",
    circular: "text-academic-navy",
    system: "text-text-secondary",
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-text-secondary hover:bg-app-bg hover:text-text-primary"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-1rem)] rounded-2xl border border-border bg-card-bg shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-bold text-text-primary">الإشعارات</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-action-blue hover:underline">
                    قراءة الكل
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="rounded p-1 text-text-secondary hover:bg-app-bg">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-text-secondary" />
                  <p className="text-xs text-text-secondary">لا توجد إشعارات</p>
                </div>
              ) : (
                notifications.map((n: any) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex items-start gap-3 border-b border-border px-4 py-3 transition-colors cursor-pointer hover:bg-app-bg ${!n.is_read ? "bg-action-blue/5" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${TYPE_COLORS[n.notification_type] || "text-text-primary"}`}>
                        {n.title}
                      </p>
                      {n.body && <p className="mt-0.5 text-xs text-text-secondary">{n.body}</p>}
                      <p className="mt-1 text-xs text-text-secondary">
                        {new Date(n.created_at).toLocaleString("ar-SA")}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }} 
                        className="mt-1 rounded p-1 text-text-secondary hover:bg-app-bg" 
                        title="تحديد كمقروء"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
