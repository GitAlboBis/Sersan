"use client";

/**
 * Measures every [data-line-anchor] element on the page and exposes each
 * anchor's vertical center as a document fraction (0..1), plus the document
 * scrollHeight. The signature line rebuilds its curve whenever `version`
 * bumps, so the curve stays glued to real section positions across
 * responsive reflow, font loading and EN/IT copy-length changes.
 *
 * Re-measures: on mount, on debounced resize (150ms — matches the
 * ScrollTrigger.refresh debounce in smooth-scroll-provider), after fonts
 * load, on route change, and on two delayed passes that mirror the
 * cinematic section's late ScrollTrigger refresh bursts.
 *
 * It ALSO runs one IntersectionObserver over the same [data-line-anchor]
 * nodes (threshold 0.35) to publish which sections are on screen and which
 * one is centered (activeAnchor). The observer is rebuilt only when the
 * anchor set changes (version/scrollHeight signature) — never per render —
 * and writes the active section + a section-arrival pulse into scrollStore.
 */
import { useEffect, useState } from "react";
import { useScrollStore } from "../store/scrollStore";

export interface AnchorSpan {
  /** Document fraction where the element starts. */
  start: number;
  /** Document fraction where the element ends. */
  end: number;
}

export interface SectionAnchors {
  fractions: Record<string, number>;
  spans: Record<string, AnchorSpan>;
  scrollHeight: number;
  version: number;
  /** Anchor ids currently intersecting the viewport (≥35% visible). */
  inView: Record<string, boolean>;
  /** Anchor id nearest to viewport center among the in-view set. */
  activeAnchor: string | null;
}

interface MeasuredAnchors {
  fractions: Record<string, number>;
  spans: Record<string, AnchorSpan>;
  scrollHeight: number;
  version: number;
}

export function useSectionAnchors(pathname: string): SectionAnchors {
  const [state, setState] = useState<MeasuredAnchors>({
    fractions: {},
    spans: {},
    scrollHeight: 1,
    version: 0,
  });
  // Observer output kept separate from the measurement state so the measure
  // pass (which rebuilds the curve) never clobbers it and vice-versa.
  const [inView, setInView] = useState<Record<string, boolean>>({});
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);

  useEffect(() => {
    let version = 0;
    let resizeId = 0;
    let cancelled = false;
    const timeouts: number[] = [];

    const measure = () => {
      // The fonts.ready promise (below) can resolve after this effect is torn
      // down on a route change — guard against measuring/setState for a
      // pathname that no longer owns this effect.
      if (cancelled) return;
      const scrollHeight = document.documentElement.scrollHeight;
      const fractions: Record<string, number> = {};
      const spans: Record<string, AnchorSpan> = {};
      document.querySelectorAll<HTMLElement>("[data-line-anchor]").forEach((el) => {
        const id = el.dataset.lineAnchor;
        if (!id) return;
        const rect = el.getBoundingClientRect();
        const topDocY = rect.top + window.scrollY;
        const centerDocY = topDocY + rect.height / 2;
        if (scrollHeight > 0) {
          fractions[id] = centerDocY / scrollHeight;
          spans[id] = {
            start: topDocY / scrollHeight,
            end: (topDocY + rect.height) / scrollHeight,
          };
        }
      });
      version += 1;
      setState((prev) => {
        // Skip the state update (and the curve rebuild it triggers) when
        // nothing actually moved — e.g. width-only resizes from the mobile
        // URL bar.
        const same =
          prev.scrollHeight === scrollHeight &&
          Object.keys(fractions).length === Object.keys(prev.fractions).length &&
          Object.entries(fractions).every(
            ([k, v]) => Math.abs((prev.fractions[k] ?? -1) - v) < 0.0005,
          );
        return same ? prev : { fractions, spans, scrollHeight, version };
      });
    };

    measure();
    // Late passes: fonts swap + the cinematic section's pin-spacer settling.
    timeouts.push(window.setTimeout(measure, 700), window.setTimeout(measure, 1600));
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

  // ONE IntersectionObserver over the [data-line-anchor] nodes. Rebuilt only
  // when the anchor set changes (pathname or measured version bump) — never
  // per render, never one-observer-per-node. It publishes which anchors are
  // on screen + the centered one, and bumps the scrollStore arrival pulse.
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return;
    }
    // Wait for the same sentinel window the measure pass guards against: before
    // first real layout there are no stable anchor rects to observe.
    if (state.scrollHeight <= 1) return;

    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-line-anchor]"),
    );
    if (nodes.length === 0) return;

    // Running visibility ratios per anchor id, updated incrementally as the
    // observer fires for individual nodes.
    const ratios = new Map<string, number>();

    const recompute = () => {
      const next: Record<string, boolean> = {};
      let active: string | null = null;
      let bestDist = Infinity;
      const center = window.innerHeight / 2;
      ratios.forEach((ratio, id) => {
        if (ratio < 0.35) return;
        next[id] = true;
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
      setInView((prev) => {
        const sameLen = Object.keys(prev).length === Object.keys(next).length;
        const same = sameLen && Object.keys(next).every((k) => prev[k]);
        return same ? prev : next;
      });
      setActiveAnchor((prev) => (prev === active ? prev : active));
      useScrollStore.getState().setActiveAnchor(active);
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
    // Rebuild ONLY when the anchor signature changes — version bumps whenever
    // scrollHeight/fractions actually move (the measure pass returns `prev`
    // otherwise), and pathname captures route changes. scrollHeight is read
    // inside but always moves in lockstep with version, so it is not a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, state.version]);

  return { ...state, inView, activeAnchor };
}
