/**
 * traverseStore — the DIAGONAL TRAVERSE transport (ROUND 11 Stage 1).
 *
 * OWNERSHIP CONTRACT (mechanism dossier §2B.3 + §8.2), and it is the whole
 * point of this file:
 *
 *   THE DOM OWNS THE CLOCK. `use-diagonal-traverse`'s `apply()` runs inside
 *   ScrollTrigger.update(), which Lenis fires synchronously from
 *   `FrameDriver`'s `pumpLenis` — i.e. subscriber #1 of R3F's loop, BEFORE
 *   SignatureLine writes the camera and before any island reads anything.
 *   It reads `window.scrollY` EXACTLY ONCE and freezes it into the band's
 *   frame. Every consumer's offset is then a pure function of that frozen
 *   snapshot plus its own STATIC cached constants.
 *
 *   NO CONSUMER MAY READ `window.scrollY`, `performance.now()` OR A RECT.
 *   Under a WINDOWED lateral rate (D11) the copy and the net evaluate
 *   genuinely different functions of the same input, so what is shared is the
 *   ARGUMENT, not the result. If the copy's `x` and the net's `x` are ever
 *   computed from two different reads of `scrollY`, they betray themselves as
 *   two layers — the exact failure D6 exists to prevent. A stale frame read by
 *   BOTH is a uniform shutter (invisible); a stale frame read by ONE is a
 *   22 px shear at a hard flick (and 57 px at α_edge).
 *
 * ZERO PER-FRAME ALLOCATION. `bands[id]` is a STABLE, MUTABLE object: the
 * writer mutates its fields in place and never calls `setState`, so there is
 * no React commit and no garbage. `setState` is used only by
 * register/unregister, which are event-driven. Islands must read it with
 * `useTraverseStore.getState()` inside `useFrame` — never subscribe (the R3F
 * island commit-wedge rule).
 *
 * NO `three` IMPORT — this module is shared by the ROUTE bundle (the DOM hook)
 * and the lazy WebGL island chunk, and it is pinned on `globalThis` for the
 * same Turbopack reason `seqStore` / `textMorphStore` are: a small module can
 * be inlined separately into each chunk, splitting writers from readers.
 */
import { create } from "zustand";

export interface TraverseFrame {
  /** True while any part of the owning section is in the viewport. */
  active: boolean;
  /** THE frozen scroll position. Every consumer derives from this. */
  scrollY: number;
  /** Section progress 0→1 over the section's own height (storyboard §B0). */
  p: number;
  /**
   * The SCENE's lateral in CSS px at the content plane, signed (negative =
   * the world runs left). The net rides α ≡ 1.00, so this is exactly
   * `dir · tan(angle) · clamp(scrollY − secTop, 0, secH)`.
   */
  xScenePx: number;
  /**
   * The copy MASK LANE, in viewport CSS px, already including the block's
   * FINAL APPLIED `x` (§2B.4 — never a linearised α, never a separate
   * integrator, never a damper). Centre + half-width of the tracked block.
   */
  laneCenterPx: number;
  laneHalfPx: number;
  /**
   * The tracked block's window value V̂ ∈ [0,1]. ONE window drives the copy's
   * rate, the copy's opacity and the lane's depth — so when no copy is on
   * frame this is 0 and the gate opens completely (storyboard §E4).
   */
  laneWindow: number;
  /** Monotone tick, incremented by every `apply()`. The R1 clock instrument. */
  tick: number;
}

export interface TraverseState {
  bands: Record<string, TraverseFrame>;
}

function makeFrame(): TraverseFrame {
  return {
    active: false,
    scrollY: 0,
    p: 0,
    xScenePx: 0,
    laneCenterPx: 0,
    laneHalfPx: 0,
    laneWindow: 0,
    tick: 0,
  };
}

const createTraverseStore = () => create<TraverseState>(() => ({ bands: {} }));

declare global {
  // eslint-disable-next-line no-var
  var __sersanTraverseStore: ReturnType<typeof createTraverseStore> | undefined;
}

export const useTraverseStore = (globalThis.__sersanTraverseStore ??=
  createTraverseStore());

/**
 * Registers a band and returns its STABLE frame object. Idempotent: a second
 * register for the same id returns the SAME object, so an HMR re-arm cannot
 * leave an island reading a detached snapshot.
 */
export function registerTraverseBand(id: string): TraverseFrame {
  const existing = useTraverseStore.getState().bands[id];
  if (existing) return existing;
  const frame = makeFrame();
  useTraverseStore.setState((s) => ({ bands: { ...s.bands, [id]: frame } }));
  return frame;
}

/** Reads a band's frame without subscribing. `null` when it is not armed. */
export function getTraverseFrame(id: string): TraverseFrame | null {
  return useTraverseStore.getState().bands[id] ?? null;
}

/** Teardown: the band goes inert (never removed — islands hold the ref). */
export function deactivateTraverseBand(id: string): void {
  const frame = useTraverseStore.getState().bands[id];
  if (!frame) return;
  frame.active = false;
  frame.p = 0;
  frame.xScenePx = 0;
  frame.laneWindow = 0;
  frame.laneHalfPx = 0;
}
