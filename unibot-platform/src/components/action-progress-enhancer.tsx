"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Enhances NextTopLoader to also fire during Server Action fetches.
// It intercepts fetch calls that target the current origin and shows
// the nprogress bar (which NextTopLoader already manages) by
// dispatching custom events that nextjs-toploader listens for.
export function ActionProgressEnhancer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCount = useRef(0);
  const barRef = useRef<HTMLDivElement | null>(null);

  function showBar() {
    activeCount.current += 1;
    if (barRef.current) barRef.current.style.opacity = "1";
  }

  function hideBar() {
    activeCount.current = Math.max(0, activeCount.current - 1);
    if (activeCount.current === 0 && barRef.current) {
      barRef.current.style.opacity = "0";
    }
  }

  useEffect(() => {
    // Patch the global fetch to detect server action calls
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const input = args[0];
      const isServerAction =
        typeof input === "string" &&
        (input.startsWith("/") || input.startsWith(window.location.origin));

      if (isServerAction) showBar();

      try {
        const result = await originalFetch.apply(this, args);
        return result;
      } finally {
        if (isServerAction) hideBar();
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Hide bar on navigation complete
  useEffect(() => {
    activeCount.current = 0;
    if (barRef.current) barRef.current.style.opacity = "0";
  }, [pathname, searchParams]);

  return (
    <div
      ref={barRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        background: "linear-gradient(90deg, #3182CE, #63B3ED)",
        zIndex: 9999,
        opacity: 0,
        transition: "opacity 0.2s ease",
        animation: "action-progress-slide 1.5s ease-in-out infinite",
        boxShadow: "0 0 8px #3182CE",
      }}
    />
  );
}
