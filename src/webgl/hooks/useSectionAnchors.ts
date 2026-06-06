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

export interface SectionAnchors {
  fractions: Record<string, number>;
  scrollHeight: number;
  version: number;
}

export function useSectionAnchors(pathname: string): SectionAnchors {
  const [state, setState] = useState<SectionAnchors>({
    fractions: {},
    scrollHeight: 1,
    version: 0,
  });

  useEffect(() => {
    let version = 0;
    let resizeId = 0;
    const timeouts: number[] = [];

    const measure = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const fractions: Record<string, number> = {};
      document.querySelectorAll<HTMLElement>("[data-line-anchor]").forEach((el) => {
        const id = el.dataset.lineAnchor;
        if (!id) return;
        const rect = el.getBoundingClientRect();
        const centerDocY = rect.top + window.scrollY + rect.height / 2;
        fractions[id] = scrollHeight > 0 ? centerDocY / scrollHeight : 0;
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
        return same ? prev : { fractions, scrollHeight, version };
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
      window.clearTimeout(resizeId);
      timeouts.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("resize", onResize);
    };
  }, [pathname]);

  return state;
}
