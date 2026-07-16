/**
 * Hover-sense input for the hero mark.
 *
 * The persistent canvas is pointer-events:none (decorative layer), so hover
 * over the mark is sensed by a DOM layer over the hero stage
 * (components/hero-hover-layer.tsx). `hovering` gates the mark's cursor
 * erode/dissolve in HeroLogo (combined with pointerStore's smoothed position
 * for the perspective-correct raycast).
 *
 * History: this store carried a drag-to-rotate velocity channel (vx/vy +
 * addDelta/damp) that no consumer ever read — the mark stays face-on by
 * design. The dead channel and its grab-cursor affordance were retired
 * together; hovering is the store's whole surface now.
 */
import { create } from "zustand";

interface HeroHoverState {
  /** Pointer is over the hero sense layer (desktop). Drives the logo
   *  dissolve/erode gate. */
  hovering: boolean;
  setHovering: (hovering: boolean) => void;
}

export const useHeroHoverStore = create<HeroHoverState>((set) => ({
  hovering: false,
  setHovering: (hovering) => set({ hovering }),
}));
