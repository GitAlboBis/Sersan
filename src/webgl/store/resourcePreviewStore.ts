/**
 * Bridge between the /resources article-list HOVER (DOM controller,
 * resource-preview.tsx) and the camera-locked WebGL signal plane
 * (ResourcePreviewPlane.tsx).
 *
 * Mirrors pointerStore/scrollStore discipline: a transient zustand store
 * written outside React's render path (at gsap quickTo tick rate) and READ via
 * `getState()` inside the single render loop — cursor movement never causes a
 * React re-render. The DOM controller is the WRITER (hover index + the eased
 * follower target it publishes each gsap tick); the WebGL plane is a pure
 * `getState()` READER inside its useFrame.
 *
 * COORDINATES
 *   targetX / targetY : clip space [0..1], origin TOP-LEFT (x→right, y→down) —
 *     the same convention as `e.clientX / innerWidth` and pointerStore. The
 *     plane converts to camera-space pixels the same way RailPlanes does.
 *
 * GLOBALTHIS PIN
 *   This module is imported from BOTH the route bundle (resource-preview.tsx,
 *   the writer) and the lazy WebGL island (ResourcePreviewPlane, the reader).
 *   In the production build Turbopack inlines a separate copy of small store
 *   modules into each chunk — two live zustand instances, writer and reader
 *   split, the bridge silently dead (reproduced for textMorphStore/sectionStore
 *   2026-06-10). The global pin makes every bundled copy resolve to the single
 *   real store.
 */
import { create } from "zustand";

interface ResourcePreviewState {
  /** Hovered article index, or -1 when the cursor is off the whole list. */
  activeIndex: number;
  /** Eased follower position, clip [0..1] top-left — published from quickTo. */
  targetX: number;
  targetY: number;
  /** Stable per-article seed 0..1 — varies the plane's gradient phase. */
  seed: number;
  /** Sets the active article (and its seed) or clears it (-1). */
  setActive: (index: number, seed?: number) => void;
  /** Publishes the eased follower target (called each gsap tick). */
  setTarget: (x: number, y: number) => void;
}

const createResourcePreviewStore = () =>
  create<ResourcePreviewState>((set) => ({
    activeIndex: -1,
    targetX: 0.5,
    targetY: 0.5,
    seed: 0,
    setActive: (index, seed = 0) => set({ activeIndex: index, seed }),
    setTarget: (x, y) => set({ targetX: x, targetY: y }),
  }));

declare global {
  // eslint-disable-next-line no-var
  var __sersanResourcePreviewStore:
    | ReturnType<typeof createResourcePreviewStore>
    | undefined;
}

export const useResourcePreviewStore = (globalThis.__sersanResourcePreviewStore ??=
  createResourcePreviewStore());
