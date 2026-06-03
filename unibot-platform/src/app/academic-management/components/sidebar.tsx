"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookCopy,
  CalendarClock,
  Users,
  Megaphone,
  LogOut,
  BarChart3,
  Ticket as TicketIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";
import { SidebarShell } from "@/components/sidebar-shell";

const navItems = [
  { href: "/academic-management", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/academic-management/sections", label: "إدارة الشعب", icon: BookCopy },
  { href: "/academic-management/enrollments", label: "التسجيل الجماعي", icon: Users },
  { href: "/academic-management/schedules", label: "الجدول الدراسي", icon: CalendarClock },
  { href: "/academic-management/circulars", label: "التعاميم", icon: Megaphone },
  { href: "/academic-management/analytics", label: "التحليلات التنبؤية", icon: BarChart3 },
  { href: "/academic-management/tickets", label: "إدارة التذاكر", icon: TicketIcon },
];

export function AcademicManagementSidebar({ profile, tenantName }: { profile: Profile; tenantName?: string }) {
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
          <span className="text-lg">🎓</span>
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary">UniBot</p>
          <p className="text-xs text-text-secondary">الإدارة الأكاديمية</p>
          {tenantName && <p className="truncate text-[10px] text-text-secondary/70">{tenantName}</p>}
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/academic-management" && pathname.startsWith(item.href));

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
          href="/academic-management/profile"
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
