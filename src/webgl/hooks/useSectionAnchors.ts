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
 */
import { useEffect, useState } from "react";

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
}

export function useSectionAnchors(pathname: string): SectionAnchors {
  const [state, setState] = useState<SectionAnchors>({
    fractions: {},
    spans: {},
    scrollHeight: 1,
    version: 0,
  });

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

  return state;
}
