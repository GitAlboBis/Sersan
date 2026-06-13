"use client";

/**
 * SectionBus — the single layout-level WRITER of the section-state bus
 * (useSectionStore). Renders nothing.
 *
 * Owns the three derivations that used to be scattered (or canvas-gated):
 *
 * 1. MEASUREMENT — measures every [data-line-anchor] element into document-
 *    fraction spans (the logic formerly inside useSectionAnchors, which is
 *    now a thin adapter over this store). Cadence parity with the old hook:
 *    on mount/route change, two late passes (700/1600ms — the cinematic
 *    section's refresh-burst window), after fonts load, and on debounced
 *    resize (150ms, matching the ScrollTrigger.refresh debounce in
 *    smooth-scroll-provider).
 *
 * 2. IDENTITY — ONE IntersectionObserver over the non-decorative anchors
 *    (threshold 0.35) publishing the centered section (`active`) + arrival
 *    pulse. Decorative curve-waypoint anchors (work-in-progress / gateway /
 *    ritual) are measured for geometry but never become the active section.
 *
 * 3. DIRECTION — derived from the shared scroll store (written by Lenis or
 *    the reduced-motion native fallback — both paths flow through
 *    scrollStore.setScroll), written only on sign flips. No new rAF loop,
 *    no new scroll listener: the provider's single scroll source feeds it.
 *
 * Mounted in app/layout.tsx OUTSIDE the Canvas, so the bus updates on every
 * tier including "off" — fixing the old gap where section identity was never
 * written when WebGL didn't mount.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useScrollStore } from "@/webgl/store/scrollStore";
import {
  DECORATIVE_ANCHORS,
  useSectionStore,
  type SectionSpan,
} from "@/webgl/store/sectionStore";

export function SectionBus() {
  const pathname = usePathname();
  // Reactive ONLY on measure bumps (mount/resize/fonts/route — rare), so the
  // IntersectionObserver below rebuilds against fresh anchor sets. Never
  // subscribes to scroll-cadence fields.
  const measureVersion = useSectionStore((s) => s.measureVersion);

  // --- 1. Measurement (single authority) ----------------------------------
  useEffect(() => {
    let resizeId = 0;
    let cancelled = false;
    const timeouts: number[] = [];

    const measure = () => {
      // The fonts.ready promise can resolve after this effect is torn down on
      // a route change — guard against measuring for a pathname that no
      // longer owns this effect.
      if (cancelled) return;
      const scrollHeight = document.documentElement.scrollHeight;
      const sections: string[] = [];
      const spans: Record<string, SectionSpan> = {};
      document
        .querySelectorAll<HTMLElement>("[data-line-anchor]")
        .forEach((el) => {
          const id = el.dataset.lineAnchor;
          if (!id) return;
          const rect = el.getBoundingClientRect();
          const topDocY = rect.top + window.scrollY;
          if (scrollHeight > 0) {
            spans[id] = {
              start: topDocY / scrollHeight,
              end: (topDocY + rect.height) / scrollHeight,
            };
            if (!DECORATIVE_ANCHORS.has(id)) sections.push(id);
          }
        });
      // setMeasured skips the version bump (and the curve rebuild it would
      // trigger) when nothing actually moved — e.g. width-only resizes.
      useSectionStore.getState().setMeasured(sections, spans, scrollHeight);
    };

    measure();
    // Late passes: fonts swap + the cinematic section's late refresh bursts.
    timeouts.push(
      window.setTimeout(measure, 700),
      window.setTimeout(measure, 1600),
    );
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => measure()).catch(() => {});
    }

    const onResize = () => {
      window.clearTimeout(resizeId);
      resizeId = window.setTimeout(measure, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.clearTimeout(resizeId);
      timeouts.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("resize", onResize);
    };
  }, [pathname]);

  // --- 2. Identity: ONE IntersectionObserver over the section anchors -----
  // Rebuilt only when the anchor set changes (pathname or measured version
  // bump) — never per render, never one-observer-per-node.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    // Before the first real measure there are no stable anchor rects to
    // observe (same sentinel the measure pass starts from).
    if (useSectionStore.getState().scrollHeight <= 1) return;

    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-line-anchor]"),
    ).filter((el) => {
      const id = el.dataset.lineAnchor;
      return !!id && !DECORATIVE_ANCHORS.has(id);
    });
    if (nodes.length === 0) return;

    // Running visibility ratios per anchor id, updated incrementally as the
    // observer fires for individual nodes.
    const ratios = new Map<string, number>();

    const recompute = () => {
      let active: string | null = null;
      let bestDist = Infinity;
      const center = window.innerHeight / 2;
      ratios.forEach((ratio, id) => {
        if (ratio < 0.35) return;
        const el = document.querySelector<HTMLElement>(
          `[data-line-anchor="${id}"]`,
        );
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - center);
        if (dist < bestDist) {
          bestDist = dist;
          active = id;
        }
      });
      useSectionStore.getState().setActive(active);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.lineAnchor;
          if (!id) continue;
          ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        recompute();
      },
      { threshold: [0, 0.35, 0.6, 1] },
    );

    nodes.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pathname, measureVersion]);

  // --- 3. Direction: sign of the shared scroll progress delta -------------
  // scrollStore.setScroll is written from the Lenis "scroll" event (or the
  // native fallback under prefers-reduced-motion); this subscription does two
  // float compares per tick and writes the bus only on actual flips.
  useEffect(() => {
    let last = useScrollStore.getState().progress;
    const unsubscribe = useScrollStore.subscribe((state) => {
      const p = state.progress;
      const d = p - last;
      // Ignore non-scroll store writes (setReveal) and float noise at rest.
      if (Math.abs(d) < 1e-6) return;
      last = p;
      useSectionStore.getState().setDirection(d > 0 ? 1 : -1);
    });
    return unsubscribe;
  }, []);

  // Dev-only console handle — registered here (not in Scene.tsx) so it
  // exists even when WebGL is off.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as Record<string, unknown>).__sersanSection =
        useSectionStore;
    }
  }, []);

  return null;
}
