"use client";

/**
 * useLedgerIgnition — the ONE ignition driver for the typographic ledger rows
 * (round-3 de-card pass, 2026-08-21: Problem = "broken", ProductionGrade =
 * "healthy"). A row IGNITES (ghost type fills solid, `->` slides, index
 * brightens — all CSS, keyed off the selectors below) and, on the same edge,
 * `setHovered(surface, i)` fires the existing WebGL store link (ring flare /
 * debris re-cohere tease).
 *
 * THREE TRIGGERS, one per input class:
 *   1. HOVER, fine pointer only — pointerenter/leave handlers (gated by the
 *      `(hover: hover) and (pointer: fine)` media query, subscribed) drive the
 *      store; the visual twin is the sections' `:hover` CSS under the same MQ.
 *   2. FOCUS, any input — rows carry tabIndex=0; onFocus/onBlur mirror hover
 *      (parity rule). Visual twin: `:focus-visible` CSS.
 *   3. CENTRE-BAND, touch only — lib/use-centre-focus writes
 *      `data-focus="true"` on whatever the reader scrolled to the middle of
 *      the viewport (inert on fine pointer, static-all under RM). The CSS
 *      keys off the attribute directly; the STORE link rides a
 *      MutationObserver on that attribute (the hook exposes no callback).
 *      Under reduced motion the observer is never armed: the island is
 *      unmounted there anyway and RM must stay timer/JS-motion-free.
 *
 * Store discipline: one resolved index (hover ?? focus ?? centre) per write,
 * setHovered is idempotent (store skips identical writes), cleared on
 * unmount so a stale ring never stays flared.
 *
 * All returned arrays are memoized per (surface, count): ref callbacks stay
 * STABLE across re-renders (the EN/IT toggle re-renders every row body
 * without remounting it — a fresh ref callback each render would detach and
 * re-attach the centre-focus observation, per use-centre-focus's contract).
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { useCentreFocus } from "@/lib/use-centre-focus";

type Surface = "broken" | "healthy";

export interface LedgerRowHandlers {
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

export function useLedgerIgnition(surface: Surface, count: number) {
  const setHovered = useNeuralLatticeStore((s) => s.setHovered);
  const centreRef = useCentreFocus();

  const rowsRef = useRef<(HTMLElement | null)[]>([]);
  const stateRef = useRef<{
    hover: number | null;
    focus: number | null;
    centre: number | null;
  }>({ hover: null, focus: null, centre: null });
  const canHoverRef = useRef(false);

  const sync = useCallback(() => {
    const s = stateRef.current;
    setHovered(surface, s.hover ?? s.focus ?? s.centre);
  }, [setHovered, surface]);

  // Hover capability — subscribed, never one-shot (a mouse plugged into a
  // tablet must re-resolve without a reload; D-18 discipline).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    canHoverRef.current = mq.matches;
    const on = () => {
      canHoverRef.current = mq.matches;
    };
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  // Centre-band → store bridge. use-centre-focus writes the attribute
  // straight from its IntersectionObserver (no callback surface), so the
  // store link listens for the attribute flip. Touch-only by construction
  // (the hook is inert on fine pointer → no mutations ever fire there).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rows = rowsRef.current.filter((el): el is HTMLElement => el !== null);
    if (!rows.length) return;
    const mo = new MutationObserver(() => {
      let centre: number | null = null;
      for (let i = 0; i < rowsRef.current.length; i++) {
        if (rowsRef.current[i]?.getAttribute("data-focus") === "true") {
          centre = i;
          break;
        }
      }
      if (stateRef.current.centre !== centre) {
        stateRef.current.centre = centre;
        sync();
      }
    });
    rows.forEach((el) =>
      mo.observe(el, { attributes: true, attributeFilter: ["data-focus"] }),
    );
    return () => mo.disconnect();
  }, [sync, count]);

  // Clear the store on unmount so a stale ring doesn't stay flared.
  useEffect(() => {
    return () => setHovered(surface, null);
  }, [setHovered, surface]);

  /** Stable per-index ref callbacks: register with centre-focus + the local
   * row list. React 19 ref-cleanup keeps detach precise. */
  const rowRefs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => (el: HTMLElement | null) => {
        if (!el) return; // pre-19 detach path; React 19 uses the cleanup below
        rowsRef.current[i] = el;
        const cleanupCentre = centreRef(el);
        return () => {
          rowsRef.current[i] = null;
          if (typeof cleanupCentre === "function") cleanupCentre();
        };
      }),
    [count, centreRef],
  );

  /** Stable per-index pointer/focus handlers (store link only — the visual
   * ignition is pure CSS on :hover / :focus-visible / [data-focus]). */
  const rowHandlers = useMemo<LedgerRowHandlers[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        onPointerEnter: () => {
          if (!canHoverRef.current) return;
          stateRef.current.hover = i;
          sync();
        },
        onPointerLeave: () => {
          if (!canHoverRef.current) return;
          if (stateRef.current.hover === i) {
            stateRef.current.hover = null;
            sync();
          }
        },
        onFocus: () => {
          stateRef.current.focus = i;
          sync();
        },
        onBlur: () => {
          if (stateRef.current.focus === i) {
            stateRef.current.focus = null;
            sync();
          }
        },
      })),
    [count, sync],
  );

  return { rowRefs, rowHandlers };
}
