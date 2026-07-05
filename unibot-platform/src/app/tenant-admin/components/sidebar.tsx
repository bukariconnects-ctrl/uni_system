"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Settings,
  CalendarDays,
  LogOut,
  Building2,
  BookOpen,
  BookMarked,
  Users,
  MapPin,
  BrainCircuit,
  ChevronDown,
  GitBranch,
  LayoutGrid,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";
import { SidebarShell } from "@/components/sidebar-shell";

const topNavItems = [
  { href: "/tenant-admin", label: "لوحة المعلومات", icon: LayoutDashboard, exact: true },
  { href: "/tenant-admin/reports", label: "التقارير", icon: BarChart3 },
  { href: "/tenant-admin/settings", label: "إعدادات الجامعة", icon: Settings },
  { href: "/tenant-admin/campuses", label: "الفروع والأحرم", icon: Building2 },
  { href: "/tenant-admin/venues", label: "القاعات والمباني", icon: MapPin },
  { href: "/tenant-admin/academic", label: "الهيكل التنظيمي", icon: GitBranch },
];

const curriculumItems = [
  { href: "/tenant-admin/courses", label: "دليل المقررات", icon: BookMarked },
  { href: "/tenant-admin/study-plans", label: "الخطط الدراسية", icon: LayoutGrid },
];

const bottomNavItems = [
  { href: "/tenant-admin/users", label: "إدارة المستخدمين", icon: Users },
  { href: "/tenant-admin/knowledge", label: "قاعدة المعرفة", icon: BrainCircuit },
  { href: "/tenant-admin/calendar", label: "التقويم الأكاديمي", icon: CalendarDays },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  indent,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        indent ? "pr-9" : ""
      } ${
        active
          ? "bg-action-blue/20 text-action-blue"
          : "text-text-secondary hover:bg-app-bg hover:text-text-primary"
      }`}
    >
      <Icon className={indent ? "h-4 w-4" : "h-5 w-5"} />
      {label}
    </Link>
  );
}

export function TenantAdminSidebar({ profile, tenantName }: { profile: Profile; tenantName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isCurriculumActive = curriculumItems.some((i) =>
    pathname.startsWith(i.href)
  );
  const [curriculumOpen, setCurriculumOpen] = useState(isCurriculumActive);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function isActive(href: string, exact?: boolean) {
    return exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <SidebarShell>
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ai-light to-ai-lavender">
          <span className="text-lg">🏫</span>
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary">UniBot</p>
          <p className="text-xs text-text-secondary">مدير الجامعة</p>
          {tenantName && <p className="truncate text-[10px] text-text-secondary/70">{tenantName}</p>}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {topNavItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href, item.exact)}
          />
        ))}

        {/* الخطط والمقررات — Dropdown */}
        <div>
          <button
            onClick={() => setCurriculumOpen((p) => !p)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isCurriculumActive
                ? "bg-action-blue/20 text-action-blue"
                : "text-text-secondary hover:bg-app-bg hover:text-text-primary"
            }`}
          >
            <BookOpen className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1 text-right">الخطط والمقررات</span>
            <ChevronDown
              className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
                curriculumOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {curriculumOpen && (
            <div className="mt-1 space-y-0.5">
              {curriculumItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.href)}
                  indent
                />
              ))}
            </div>
          )}
        </div>

        {bottomNavItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
          />
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/tenant-admin/profile"
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
