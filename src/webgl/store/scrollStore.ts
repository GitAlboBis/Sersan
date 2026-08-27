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
  /**
   * TASK 6 (section cuts) — programmatic-jump flag. A frame budget (> 0 =
   * armed) set by our OWN scroll jumpers right before they teleport the page
   * (founders-rail gate engage, lenis-singleton B14 native resync; TODO the
   * singularity-passage `covertJump` is the third caller — off-limits for
   * TASK 6, wire `markTeleport()` there in the follow-up). The PostFX cut
   * driver consumes it: the progress jump is LATCHED without firing the
   * .cut-tick edge accent, so a gate can never manufacture a crossing. The
   * budget is a few frames (not a boolean) because the jumper may run before
   * or after the driver's frame; the driver zeroes it the frame it observes
   * the motion, and it expires on its own if no motion follows.
   */
  teleport: number;
  setScroll: (progress: number, velocity: number) => void;
  setReveal: (reveal: number) => void;
  /** Arm the teleport budget (call immediately BEFORE an immediate scrollTo). */
  markTeleport: () => void;
  /** Driver-only: spend / expire the teleport budget. */
  setTeleport: (frames: number) => void;
}

/** Frames the teleport flag survives without an observed motion. */
export const TELEPORT_FRAMES = 3;

export const useScrollStore = create<ScrollState>((set) => ({
  progress: 0,
  velocity: 0,
  reveal: 1,
  teleport: 0,
  setScroll: (progress, velocity) => set({ progress, velocity }),
  setReveal: (reveal) => set({ reveal }),
  markTeleport: () => set({ teleport: TELEPORT_FRAMES }),
  setTeleport: (frames) => set({ teleport: frames }),
}));
