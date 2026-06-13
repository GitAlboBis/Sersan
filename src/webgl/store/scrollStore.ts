/**
 * Global scroll state for the WebGL layer.
 *
 * Written from the Lenis "scroll" event (or a native scroll listener under
 * prefers-reduced-motion) by SmoothScrollProvider; read transiently inside
 * R3F's useFrame via useScrollStore.getState() — never via the reactive hook
 * in a render path, so scroll never causes React re-renders.
 *
 * Section identity (active section, arrival pulse, direction) lives on the
 * section-state bus — see store/sectionStore.ts — written by the layout-level
 * SectionBus component. This store stays the HOT per-tick channel only.
 */
import { create } from "zustand";

interface ScrollState {
  /** Document scroll progress, 0..1. */
  progress: number;
  /** Lenis velocity (px/frame-ish). 0 under native scroll. */
  velocity: number;
  /** Route-transition fade for the signature line (drives uReveal), 0..1. */
  reveal: number;
  setScroll: (progress: number, velocity: number) => void;
  setReveal: (reveal: number) => void;
}

export const useScrollStore = create<ScrollState>((set) => ({
  progress: 0,
  velocity: 0,
  reveal: 1,
  setScroll: (progress, velocity) => set({ progress, velocity }),
  setReveal: (reveal) => set({ reveal }),
}));
