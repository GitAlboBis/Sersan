/**
 * Global scroll state for the WebGL layer.
 *
 * Written from the Lenis "scroll" event (or a native scroll listener under
 * prefers-reduced-motion) by SmoothScrollProvider; read transiently inside
 * R3F's useFrame via useScrollStore.getState() — never via the reactive hook
 * in a render path, so scroll never causes React re-renders.
 */
import { create } from "zustand";

interface ScrollState {
  /** Document scroll progress, 0..1. */
  progress: number;
  /** Lenis velocity (px/frame-ish). 0 under native scroll. */
  velocity: number;
  /** Route-transition fade for the signature line (drives uReveal), 0..1. */
  reveal: number;
  /**
   * The [data-line-anchor] id of the section currently centered in the
   * viewport (nearest to 50% of screen height), or null before the first
   * IntersectionObserver callback. Written by useSectionAnchors.
   */
  activeAnchor: string | null;
  /**
   * Section-arrival pulse TARGET, 0..1. Bumped to 1 when a new section
   * becomes active; consumers DECAY it toward 0 per-frame via
   * THREE.MathUtils.damp (the store holds the target, never a per-frame
   * increment, so the value stays render-loop-agnostic). Drives the
   * line's section-arrival emissive bump (P1).
   */
  anchorPulse: number;
  setScroll: (progress: number, velocity: number) => void;
  setReveal: (reveal: number) => void;
  /**
   * Sets the active anchor and, when it actually changed, bumps anchorPulse
   * to 1 so consumers can decay a fresh arrival pulse. Re-setting the same
   * anchor is a no-op (no spurious pulse, no re-render).
   */
  setActiveAnchor: (anchor: string | null) => void;
  /** Lets the per-frame consumer write back the decayed pulse value. */
  setAnchorPulse: (anchorPulse: number) => void;
}

export const useScrollStore = create<ScrollState>((set, get) => ({
  progress: 0,
  velocity: 0,
  reveal: 1,
  activeAnchor: null,
  anchorPulse: 0,
  setScroll: (progress, velocity) => set({ progress, velocity }),
  setReveal: (reveal) => set({ reveal }),
  setActiveAnchor: (anchor) => {
    if (anchor === get().activeAnchor) return;
    set({ activeAnchor: anchor, anchorPulse: anchor ? 1 : 0 });
  },
  setAnchorPulse: (anchorPulse) => set({ anchorPulse }),
}));
