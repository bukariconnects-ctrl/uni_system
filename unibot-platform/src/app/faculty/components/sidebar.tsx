"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ClipboardCheck,
  GraduationCap,
  MessageSquare,
  LogOut,
  AlertTriangle,
  Ticket as TicketIcon,
  Megaphone,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";
import { NotificationBell } from "@/components/notification-bell";
import { SidebarShell } from "@/components/sidebar-shell";
import { RealtimePageRefresher } from "@/components/realtime-page-refresher";

const navItems = [
  { href: "/faculty", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/faculty/reports", label: "التقارير", icon: BarChart3 },
  { href: "/faculty/materials", label: "المحتوى التعليمي", icon: BookOpen },
  { href: "/faculty/assignments", label: "التكاليف", icon: FileText },
  { href: "/faculty/attendance", label: "الحضور", icon: ClipboardCheck },
  { href: "/faculty/gradebook", label: "سجل الدرجات", icon: GraduationCap },
  { href: "/faculty/messages", label: "الرسائل", icon: MessageSquare },
  { href: "/faculty/circulars", label: "التعاميم", icon: Megaphone },
  { href: "/faculty/risk-zone", label: "منطقة الخطر", icon: AlertTriangle },
  { href: "/faculty/tickets", label: "تذاكري", icon: TicketIcon },
];

export function FacultySidebar({ profile, tenantName }: { profile: Profile; tenantName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <SidebarShell>
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ai-light to-ai-lavender">
          <span className="text-lg">👨‍🏫</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text-primary">UniBot</p>
          <p className="text-xs text-text-secondary">بوابة المحاضر</p>
          {tenantName && <p className="truncate text-[10px] text-text-secondary/70">{tenantName}</p>}
        </div>
        <NotificationBell userId={profile.id} tenantId={profile.tenant_id!} userRole="faculty" />
      </div>
      <RealtimePageRefresher userId={profile.id} tenantId={profile.tenant_id!} userRole="faculty" />

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/faculty" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-action-blue/20 text-action-blue"
                  : "text-text-secondary hover:bg-app-bg hover:text-text-primary"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/faculty/profile"
          className="mb-3 flex items-center gap-3 rounded-lg px-3 py-1.5 transition-colors hover:bg-app-bg"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-academic-navy text-xs font-bold text-white">
            {profile.first_name?.[0]}
            {profile.last_name?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="truncate text-xs text-text-secondary">{profile.email}</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
        >
          <LogOut className="h-5 w-5" />
          تسجيل الخروج
        </button>
      </div>
    </SidebarShell>
  );
}
