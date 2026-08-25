"use client";

/**
 * useLedgerIgnition — the ONE ignition driver for the typographic ledger rows
 * (round-3 de-card pass, 2026-08-21: Problem = "broken", ProductionGrade =
 * "healthy"). A row IGNITES (ghost type fills solid, `->` slides, index
 * brightens — all CSS, keyed off the selectors below) and, on the same edge,
 * `setHovered(surface, i)` fires the existing WebGL store link (ring flare /
 * debris re-cohere tease).
 *
 * FOUR TRIGGERS, one per input class:
 *   1. SCROLL (ROUND 12 · D21) — `scrollLit: true` puts the act under the
 *      reading band: `setLit(i)` is called on EDGES by
 *      fx/scroll-ignition's `useReadingBandLit`, which reads the row crossing
 *      the band straight off the diagonal traverse's frozen scroll snapshot
 *      (`#problem`) or off its own equivalent resolver (`#trust`). The visual
 *      twin is `[data-lit="true"]` — a NEW attribute, deliberately not
 *      `data-focus`: that one already has an owner (lib/use-centre-focus) and
 *      two writers on one attribute fight on touch.
 *      ⚠ WHILE THIS MODE IS ON, HOVER IS INERT. That is the owner's decision
 *      D21, not an oversight: hovering row 2 while reading row 1 does nothing.
 *   2. HOVER, fine pointer only — pointerenter/leave handlers (gated by the
 *      `(hover: hover) and (pointer: fine)` media query, subscribed) drive the
 *      store; the visual twin is the sections' `:hover` CSS under the same MQ.
 *      KEPT AS THE FALLBACK wherever the scroll source cannot exist (narrow
 *      fine-pointer window, stepped-down phone, flag-off build) — the caller
 *      detects that and passes `scrollLit: false`.
 *   3. FOCUS, any input — rows carry tabIndex=0; onFocus/onBlur mirror hover
 *      (parity rule). Visual twin: `:focus-visible` CSS. It OUTRANKS the
 *      scroll source, and it keeps the ignition wave: WCAG, not a nicety.
 *   4. CENTRE-BAND, touch only — lib/use-centre-focus writes
 *      `data-focus="true"` on whatever the reader scrolled to the middle of
 *      the viewport (inert on fine pointer, static-all under RM). The CSS
 *      keys off the attribute directly; the STORE link rides a
 *      MutationObserver on that attribute (the hook exposes no callback).
 *      Under reduced motion the observer is never armed: the island is
 *      unmounted there anyway and RM must stay timer/JS-motion-free.
 *
 * Store discipline: one resolved index per write — `focus ?? lit ?? centre`
 * under scroll ignition, `hover ?? focus ?? centre` otherwise — setHovered is
 * idempotent (store skips identical writes), cleared on unmount so a stale
 * ring never stays flared.
 *
 * `[data-lit]` mirrors the SCROLL index alone, never the focus one. A mouse
 * click focuses a row (`onFocus` fires for pointer focus too), and painting
 * that would make the pointer do something again through the back door;
 * `:focus-visible` already carries keyboard focus in CSS.
 *
 * `onResolvedChange` (round 5, optional): fires with the resolved index on
 * every EDGE (a different row ignites, or none) — the hook for GSAP-side
 * ignition choreography (the Hv1 letter-shift wave in lusion-type.ts) riding
 * the exact same three entry points as the store link. Ref-stored so the
 * handlers/sync stay referentially stable; also fired with null on unmount.
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

export interface LedgerIgnitionOptions {
  /**
   * ROUND 12 · D21 — the act is commanded by the scroll. Hover goes inert and
   * `[data-lit]` tracks the row crossing the reading band. The CALLER detects
   * this (it is the exact complement of the lattice island's mount gate, plus
   * reduced motion, plus the live A/B switch); this hook never assumes it.
   */
  scrollLit?: boolean;
}

/** The attribute the two acts' CSS keys the scroll-driven ignition off. */
const LIT_ATTR = "data-lit";

export function useLedgerIgnition(
  surface: Surface,
  count: number,
  onResolvedChange?: (index: number | null) => void,
  options?: LedgerIgnitionOptions,
) {
  const scrollLit = options?.scrollLit ?? false;
  const setHovered = useNeuralLatticeStore((s) => s.setHovered);
  const centreRef = useCentreFocus();

  const rowsRef = useRef<(HTMLElement | null)[]>([]);
  const stateRef = useRef<{
    hover: number | null;
    focus: number | null;
    centre: number | null;
    lit: number | null;
  }>({ hover: null, focus: null, centre: null, lit: null });
  const canHoverRef = useRef(false);
  /** The index `[data-lit]` is currently written on (null = none). */
  const appliedLitRef = useRef<number | null>(null);

  // Ref-stored callback + last-resolved edge detector: sync stays stable
  // regardless of the caller's callback identity.
  const onChangeRef = useRef(onResolvedChange);
  useEffect(() => {
    onChangeRef.current = onResolvedChange;
  });
  const lastResolvedRef = useRef<number | null>(null);

  const sync = useCallback(() => {
    const s = stateRef.current;
    // Focus outranks the scroll source (WCAG 2.4.7: the thing you tabbed to
    // must be the thing that lights). Hover is not consulted at all under
    // scroll ignition — that is D21, and it is the visible half of it.
    const resolved = scrollLit
      ? (s.focus ?? s.lit ?? s.centre)
      : (s.hover ?? s.focus ?? s.centre);
    setHovered(surface, resolved);
    // `[data-lit]` mirrors the SCROLL index only — see the header note.
    const lit = scrollLit ? s.lit : null;
    if (appliedLitRef.current !== lit) {
      const prev = appliedLitRef.current;
      if (prev !== null) rowsRef.current[prev]?.removeAttribute(LIT_ATTR);
      if (lit !== null) rowsRef.current[lit]?.setAttribute(LIT_ATTR, "true");
      appliedLitRef.current = lit;
    }
    if (lastResolvedRef.current !== resolved) {
      lastResolvedRef.current = resolved;
      onChangeRef.current?.(resolved);
    }
  }, [setHovered, surface, scrollLit]);

  /**
   * The SCROLL edge. Called by fx/scroll-ignition's `useReadingBandLit` only
   * on a genuine change of winner (the channel is edge-deduped upstream), so
   * this is a handful of calls per act, never a per-frame write.
   */
  const setLit = useCallback(
    (index: number | null) => {
      if (stateRef.current.lit === index) return;
      stateRef.current.lit = index;
      sync();
    },
    [sync],
  );

  // MODE FLIP (the live A/B switch, a tier step-down, an RM toggle): drop any
  // stale hover the pointer left behind and re-resolve immediately, so the
  // attribute and the wave land on the new grammar's answer rather than the
  // old one's. Runs on mount too, where it is a no-op.
  useEffect(() => {
    stateRef.current.hover = null;
    sync();
  }, [sync]);

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

  // Clear the store (and the GSAP-side listener) on unmount so a stale ring
  // never stays flared and a stale wave never stays shifted. `[data-lit]` is
  // cleared here too: React reuses these row nodes across an EN/IT rebuild, so
  // an attribute nobody un-sets would leave the last row lit forever.
  useEffect(() => {
    return () => {
      setHovered(surface, null);
      const lit = appliedLitRef.current;
      if (lit !== null) {
        rowsRef.current[lit]?.removeAttribute(LIT_ATTR);
        appliedLitRef.current = null;
      }
      if (lastResolvedRef.current !== null) {
        lastResolvedRef.current = null;
        onChangeRef.current?.(null);
      }
    };
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
   * ignition is pure CSS on [data-lit] / :hover / :focus-visible /
   * [data-focus]). Re-memoized when the mode flips, which is what makes the
   * pointer go inert; the ROW REFS are memoized separately and never change
   * with it, so centre-focus observation is not detached. */
  const rowHandlers = useMemo<LedgerRowHandlers[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        onPointerEnter: () => {
          // D21: under scroll ignition the pointer commands nothing.
          if (scrollLit || !canHoverRef.current) return;
          stateRef.current.hover = i;
          sync();
        },
        onPointerLeave: () => {
          if (scrollLit || !canHoverRef.current) return;
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
    [count, sync, scrollLit],
  );

  return { rowRefs, rowHandlers, setLit };
}
