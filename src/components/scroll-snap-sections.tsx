"use client";

/**
 * ScrollSnapSections — registers every `[data-snap]` section on the current
 * route into the site-wide snap engine (lib/scroll-snap).
 *
 * Markup contract: `data-snap` (or `data-snap="center"`) settles the section
 * CENTERED in the viewport; `data-snap="start"` docks its top to the
 * viewport top (sticky runway wrappers); `data-snap="end"` aligns its
 * bottom. Sections are measured LIVE at snap time by the engine, so this
 * component only has to know WHICH elements participate — layout shifts
 * (fonts, FLIP re-sorts, language swaps) never go stale.
 *
 * Scans after mount and once more late (some sections mount their real
 * layout only after viewport/mode detection). Elements that unmount are
 * skipped by the engine's isConnected check until the next scan cleans them
 * up. Under prefers-reduced-motion Lenis never exists, the engine is never
 * attached, and registrations are inert — but skip the scan anyway.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { snapElement, type SnapAlign } from "@/lib/scroll-snap";

export function ScrollSnapSections() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposers: Array<() => void> = [];
    const scan = () => {
      disposers.forEach((off) => off());
      disposers = [];
      document.querySelectorAll<HTMLElement>("[data-snap]").forEach((el) => {
        const raw = el.dataset.snap;
        const align: SnapAlign =
          raw === "start" || raw === "end" ? raw : "center";
        disposers.push(snapElement(el, align));
      });
    };
    // First scan once hydration + mode detection have settled; the late scan
    // catches sections that swap in their desktop layout after detection.
    const t1 = window.setTimeout(scan, 300);
    const t2 = window.setTimeout(scan, 1400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      disposers.forEach((off) => off());
    };
  }, [pathname]);

  return null;
}
