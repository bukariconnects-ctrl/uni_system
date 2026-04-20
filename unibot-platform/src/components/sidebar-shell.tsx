"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function SidebarShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* ── Mobile top bar (hidden on lg+) ── */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card-bg px-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-text-primary">UniBot</span>
        <ThemeToggle />
      </div>

      {/* ── Mobile backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/*
        Single aside — on desktop: static (w-64 in flex row).
        On mobile: fixed overlay, slide from right.
        CSS in globals.css (.sidebar-responsive) handles the switch.
      */}
      <aside className={`sidebar-responsive border-l border-border bg-card-bg ${open ? "sidebar-open" : ""}`}>
        {/* Close button visible only on mobile */}
        <button
          onClick={() => setOpen(false)}
          className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>

        {children}

        <div className="border-t border-border p-3">
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
