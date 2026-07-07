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
 */
import { create } from "zustand";

interface RailState {
  /** True while the desktop pinned rail mode is active (ScrollTrigger attached). */
  pinned: boolean;
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
  /** Bumped after every layout measure; RailPlanes re-reads card rects on it. */
  measureVersion: number;
  setPinned: (pinned: boolean) => void;
  setLayout: (travel: number, secTop: number) => void;
  setTrack: (trackX: number, progress: number, velocity: number) => void;
  setHover: (index: number, target: number) => void;
  bumpMeasure: () => void;
  reset: () => void;
}

const INITIAL = {
  pinned: false,
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
  setPinned: (pinned) => set({ pinned }),
  setLayout: (travel, secTop) => set({ travel, secTop }),
  setTrack: (trackX, progress, velocity) => set({ trackX, progress, velocity }),
  setHover: (index, target) =>
    set((s) =>
      s.hover[index] === target ? s : { hover: { ...s.hover, [index]: target } },
    ),
  bumpMeasure: () => set((s) => ({ measureVersion: s.measureVersion + 1 })),
  reset: () => set({ ...INITIAL, hover: {} }),
}));
