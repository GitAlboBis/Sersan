import { create } from "zustand";

/**
 * featuredStore — the tiny DOM ↔ WebGL bridge for the home Featured Work
 * grid (work-section refactor 2026-08-20; ANALISI_LUSION_WORK.md §2).
 *
 * Written by:
 *   - featured-work.tsx (DOM): `hoverId` on pointer enter/leave of a card —
 *     the shader's focus/zoom springs key off it. `clearHover(id)` is id-
 *     scoped so a stale leave from card A can never clear a fresh enter on
 *     card B (pointer glides card→card fire A.leave AFTER B.enter in some
 *     orders).
 *   - FeaturedWorkPlanes (WebGL): `planesLive` on mount/unmount — the grid
 *     mirrors it into `data-planes-live` and globals.css fades the DOM
 *     stills under the planes (the plane owns the pixels; two stacked
 *     images would ghost during hover parallax).
 *
 * Read per-frame via getState() in useFrame (never reactive in the hot
 * path) — same discipline as railStore/scrollStore.
 */
interface FeaturedState {
  /** Card id currently hovered on a fine pointer, or null. */
  hoverId: string | null;
  /** True while FeaturedWorkPlanes is mounted and painting the media boxes. */
  planesLive: boolean;
  /**
   * Layout epoch — bumped by the DOM section on every ScrollTrigger refresh
   * (pin-spacer heights above the grid re-resolve AFTER a plain resize
   * event, so resize-driven re-measures alone go stale — measured live).
   */
  measureVersion: number;
  setHover: (id: string) => void;
  clearHover: (id: string) => void;
  setPlanesLive: (live: boolean) => void;
  bumpMeasure: () => void;
}

export const useFeaturedStore = create<FeaturedState>((set, get) => ({
  hoverId: null,
  planesLive: false,
  measureVersion: 0,
  setHover: (id) => set({ hoverId: id }),
  clearHover: (id) => {
    if (get().hoverId === id) set({ hoverId: null });
  },
  setPlanesLive: (live) => set({ planesLive: live }),
  bumpMeasure: () => set((s) => ({ measureVersion: s.measureVersion + 1 })),
}));
