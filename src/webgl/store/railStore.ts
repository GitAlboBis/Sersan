/**
 * Transient state bridge between the DOM case-studies rail (the sticky
 * horizontal scroller on the home page, components/sections/case-studies-rail)
 * and its WebGL card planes (webgl/RailPlanes).
 *
 * Same discipline as scrollStore/pointerStore: written from the rail's
 * ScrollTrigger onUpdate + pointer events (never per React render), read via
 * useRailStore.getState() inside useFrame. The ONLY reactive reads allowed are
 * the rare-change fields `pinned` and `measureVersion` (RailPlanes subscribes
 * to those to know when to (re)measure card rects).
 *
 * Coordinates: trackX/travel/secTop are CSS px in document space. `hover`
 * holds per-card hover TARGETS (0|1) keyed by the card's data-rail-index;
 * consumers damp them per-frame (the store never holds eased values).
 *
 * trackX is the shared input of the analytic per-card center-focus model
 * (webgl/store/railMotion.ts): the DOM rail derives it in its ScrollTrigger
 * onUpdate, RailPlanes re-derives it per frame from getState() — one formula,
 * two consumers, zero rect reads. The rail's Draggable drag bridge never
 * writes here directly: drag → lenis.scrollTo(immediate) → scroll event →
 * ScrollTrigger onUpdate → setTrack, so wheel and drag share one code path.
 *
 * The rail component MUST call reset() in its effect cleanup so the WebGL
 * layer never reads a stale rail after navigation (the store outlives routes).
 *
 * TOUCH / NATIVE SOURCE (mobile-parity plan Phase 4d, RAIL_ISLANDS_TOUCH):
 * on a capable phone the rail is a NATIVE snap scroller (no ScrollTrigger, no
 * transforms) and the SAME fields are written from a passive `scroll` listener
 * on that scroller — `native` (instead of `pinned`) is the liveness flag,
 * `trackX` := scroller.scrollLeft (identical semantic: content shifted left by
 * trackX, so RailPlanes' `vpX = baseVpX − trackX` is unchanged), `progress` :=
 * scrollLeft / max, `velocity` := Δleft/Δt px/s, `secTop` := the scroller's
 * document top and `travel` := 0 — with travel 0 the pinned per-frame model
 * `clamp(scrollY, secTop, secTop+travel) − scrollY` degenerates EXACTLY to the
 * viewport top of a normal-flow element, so the reader needs no new placement
 * code. `pinned` and `native` are mutually exclusive by construction (the DOM
 * rail is either pinned or native, and only the touch predicate arms native).
 */
import { create } from "zustand";

interface RailState {
  /** True while the desktop pinned rail mode is active (ScrollTrigger attached). */
  pinned: boolean;
  /**
   * True while the TOUCH continuous source is armed on the native snap
   * scroller (Phase 4d). Rare-change; reactive reads allowed like `pinned`.
   * Never true on tier "full".
   */
  native: boolean;
  /** Max horizontal translation in px: railWidth - viewportWidth. */
  travel: number;
  /** Document Y of the tall rail wrapper (the sticky range start). */
  secTop: number;
  /** Current rail translation magnitude in px (DOM transform is -trackX). */
  trackX: number;
  /** Rail scrub progress 0..1. */
  progress: number;
  /** ScrollTrigger getVelocity() of the driving scroll, px/s (1:1 horizontal). */
  velocity: number;
  /** Per-card hover targets (0|1) keyed by data-rail-index. */
  hover: Record<number, number>;
  /**
   * Per-card noisy-reveal targets (0|1) keyed by data-rail-index. Set once
   * (fire-once in-view) by the DOM rail; RailPlanes damps toward it and feeds
   * the material's per-card uReveal mask (P2 #3 "signal resolves from noise").
   */
  reveal: Record<number, number>;
  /** Bumped after every layout measure; RailPlanes re-reads card rects on it. */
  measureVersion: number;
  setPinned: (pinned: boolean) => void;
  setNative: (native: boolean) => void;
  setLayout: (travel: number, secTop: number) => void;
  setTrack: (trackX: number, progress: number, velocity: number) => void;
  setHover: (index: number, target: number) => void;
  /** Idempotent fire-once reveal target for a card index. */
  setReveal: (index: number, target: number) => void;
  bumpMeasure: () => void;
  reset: () => void;
}

const INITIAL = {
  pinned: false,
  native: false,
  travel: 0,
  secTop: 0,
  trackX: 0,
  progress: 0,
  velocity: 0,
  measureVersion: 0,
};

export const useRailStore = create<RailState>((set) => ({
  ...INITIAL,
  hover: {},
  reveal: {},
  setPinned: (pinned) => set({ pinned }),
  setNative: (native) => set((s) => (s.native === native ? s : { native })),
  setLayout: (travel, secTop) => set({ travel, secTop }),
  setTrack: (trackX, progress, velocity) => set({ trackX, progress, velocity }),
  setHover: (index, target) =>
    set((s) =>
      s.hover[index] === target ? s : { hover: { ...s.hover, [index]: target } },
    ),
  setReveal: (index, target) =>
    set((s) =>
      s.reveal[index] === target
        ? s
        : { reveal: { ...s.reveal, [index]: target } },
    ),
  bumpMeasure: () => set((s) => ({ measureVersion: s.measureVersion + 1 })),
  reset: () => set({ ...INITIAL, hover: {}, reveal: {} }),
}));
