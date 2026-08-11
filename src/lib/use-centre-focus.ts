"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * useCentreFocus — the touch answer to `:hover` (MOBILE_AUDIT §4, primitive M-3).
 *
 * Anything the design gates behind `:hover` is, on a touch device, gated behind
 * a gesture that does not exist — so the content is simply never painted. This
 * hook marks whatever the reader has scrolled to the middle of the viewport with
 * `data-focus="true"`, so those rules can key off an attribute instead of a
 * pointer. "Reveal never" becomes "reveal when you scroll to it".
 *
 * CONTRACT
 *
 *   const focusRef = useCentreFocus();
 *   <article ref={focusRef}>…</article>     // one call, N elements, no re-render
 *
 * Returns a STABLE ref callback. Put it on every element that should be able to
 * take focus; they may live in different lists, mount and unmount freely, and be
 * re-ordered (the archive grid's FLIP re-sort does exactly that). The callback
 * returns a React 19 ref-cleanup, so detach is precise — no null-sweep, no
 * stale observation.
 *
 * THREE MODES, resolved from live media queries (subscribed, never one-shot —
 * D-18 is the bug of sampling once; every mode below re-resolves on `change`):
 *
 *   1. `inert` — `(hover: hover) and (pointer: fine)`. The hook does NOTHING:
 *      no observer, no attribute, ever. Desktop hover behaviour is untouched,
 *      byte for byte. This is non-negotiable (MOBILE_AUDIT §3 constraint 1).
 *
 *   2. `static` — touch + `prefers-reduced-motion: reduce`. EVERY registered
 *      element carries `data-focus="true"` permanently. Reduced motion must
 *      never mean reduced content: disabling the hook here would restore the
 *      exact content-loss defect it exists to fix. The consuming CSS already
 *      drops its transitions under RM, so the reveal is instant rather than
 *      animated — revealed, not animated, is the rule.
 *
 *   3. `observe` — touch, motion allowed. One IntersectionObserver with a
 *      centre BAND (`rootMargin: -45% 0px -45% 0px` → a ~10vh strip through the
 *      viewport's middle). Everything overlapping the band is focused; the
 *      attribute is written straight from the observer callback.
 *
 * WHY A BAND, AND WHY NOT "THE SINGLE NEAREST ELEMENT"
 *
 * The band is horizontal-full-width on purpose. A horizontal rail (founders,
 * case studies) only ever has one or two cards inside the viewport at all, so
 * the band resolves to "the card you swiped to". A GRID does not: at
 * `md:grid-cols-2` / `lg:grid-cols-3` a whole row shares one vertical position,
 * so a strict single-nearest rule would light one card of the row and leave its
 * siblings dark FOREVER — no amount of scrolling separates them. Focusing the
 * row is the only reading of "nearest the centre" that does not reintroduce the
 * content loss.
 *
 * COST
 *
 * No React state, no scroll handler, no rect reads, no per-frame work: an
 * IntersectionObserver plus one `setAttribute` per crossing. It needs no wiring
 * to Lenis or ScrollTrigger — IO is fed by the compositor, so it stays correct
 * under smooth scroll, pinned stages and transformed/clipped scroll containers
 * alike.
 */

/** Attribute written on focused elements. Consumers key off `[data-focus="true"]`. */
const FOCUS_ATTR = "data-focus";

export type CentreFocusOptions = {
  /**
   * Vertical inset of the centre band per side, in % of the viewport height.
   * 45 → a 10vh strip through the middle. Raise it for a tighter centre.
   */
  band?: number;
};

export type CentreFocusRef = (el: HTMLElement | null) => void | (() => void);

export function useCentreFocus(options: CentreFocusOptions = {}): CentreFocusRef {
  const { band = 45 } = options;

  // Everything is refs: registering an element must never re-render the list
  // that owns it, and neither must scrolling past it.
  const elementsRef = useRef<Set<HTMLElement>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const modeRef = useRef<"inert" | "static" | "observe">("inert");

  // Stable across the component's whole life (empty deps, refs only) so a card
  // never re-attaches its ref just because the parent re-rendered — e.g. the
  // EN/IT toggle, which re-renders every card body without remounting it.
  const register = useCallback<CentreFocusRef>((el) => {
    if (!el) return; // pre-19 detach path; React 19 uses the cleanup below
    elementsRef.current.add(el);
    if (modeRef.current === "static") el.setAttribute(FOCUS_ATTR, "true");
    else if (modeRef.current === "observe") observerRef.current?.observe(el);
    return () => {
      elementsRef.current.delete(el);
      observerRef.current?.unobserve(el);
      el.removeAttribute(FOCUS_ATTR);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // The two axes that decide the mode. BOTH are subscribed: a mouse plugged
    // into a tablet, an OS reduced-motion toggle, or a devtools device-emulation
    // flip must all re-resolve without a reload.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const teardown = () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      // Leave no attribute behind: on the way to `inert` the CSS must fall back
      // to :hover cleanly, with nothing stuck open.
      for (const el of elementsRef.current) el.removeAttribute(FOCUS_ATTR);
    };

    const apply = () => {
      teardown();

      if (fine.matches) {
        modeRef.current = "inert";
        return;
      }

      if (reduced.matches || typeof IntersectionObserver === "undefined") {
        // Reduced motion, or a browser without IO: reveal everything at once.
        // Content reachability never depends on motion (or on a modern API).
        modeRef.current = "static";
        for (const el of elementsRef.current) el.setAttribute(FOCUS_ATTR, "true");
        return;
      }

      modeRef.current = "observe";
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const el = entry.target as HTMLElement;
            if (entry.isIntersecting) el.setAttribute(FOCUS_ATTR, "true");
            else el.removeAttribute(FOCUS_ATTR);
          }
        },
        { rootMargin: `-${band}% 0px -${band}% 0px`, threshold: 0 },
      );
      observerRef.current = io;
      for (const el of elementsRef.current) io.observe(el);
    };

    apply();
    fine.addEventListener("change", apply);
    reduced.addEventListener("change", apply);

    return () => {
      fine.removeEventListener("change", apply);
      reduced.removeEventListener("change", apply);
      teardown();
      modeRef.current = "inert";
    };
  }, [band]);

  return register;
}

export default useCentreFocus;
