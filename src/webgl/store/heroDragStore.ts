/**
 * Drag-to-rotate input for the hero planet.
 *
 * The persistent canvas is pointer-events:none (decorative layer), so drag
 * input comes from a DOM capture layer over the hero stage
 * (components/hero-drag-layer.tsx). It writes velocity deltas here; the
 * planet consumes them per-frame with inertia, so a flick keeps the globe
 * spinning and it eases out naturally.
 */
import { create } from "zustand";

interface HeroDragState {
  /** Pending rotation velocity, radians-ish per second (consumed each frame). */
  vx: number;
  vy: number;
  dragging: boolean;
  addDelta: (dx: number, dy: number) => void;
  setDragging: (dragging: boolean) => void;
  /** Decay velocities (called per-frame by the planet). */
  damp: (factor: number) => void;
}

export const useHeroDragStore = create<HeroDragState>((set, get) => ({
  vx: 0,
  vy: 0,
  dragging: false,
  addDelta: (dx, dy) => set({ vx: get().vx + dx, vy: get().vy + dy }),
  setDragging: (dragging) => set({ dragging }),
  damp: (factor) => {
    const { vx, vy } = get();
    set({ vx: vx * factor, vy: vy * factor });
  },
}));
