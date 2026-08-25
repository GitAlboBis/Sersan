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
   * The section's own doc-space top and height, published so a consumer can
   * express its OWN authored strip-x without a second measurement.
   *
   * ROUND 11 STAGE 1.5 — this is what makes the island SEQUENCE possible. Each
   * island (and the stone) re-centres its lateral on the scroll position at
   * which its OWN band is centred in the viewport, i.e. it carries an authored
   * strip-x exactly the way the copy blocks do (storyboard §B3, "the strip-x
   * compensation column"). Without it, the last island would be drawn 1725 px
   * left of the frame at the moment it is needed and the lateral cull would
   * delete it. The compensation MUST derive from this frozen snapshot, never
   * from a second `getBoundingClientRect` of the section — two reads of the
   * same geometry is exactly the class of bug this store exists to prevent.
   */
  secTop: number;
  secH: number;
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
   * ROUND 12 · STAGE 2 FIX — the lane's VERTICAL twin, in viewport CSS px:
   * the screen-y centre and half-height of the tracked block's READING UNIT
   * (`opTop`/`opH` — the paired box, never the half-statement, or the mask
   * would carve around a headline and leave its own paragraph unprotected).
   *
   * WHY IT HAS TO BE PUBLISHED. The shipped mask is a 1-D wall in x: it
   * floors the net to `COPY_MASK_FLOOR` at EVERY y within `laneHalfPx` of
   * `laneCenterPx`. On a cloud narrower than the frame that is survivable;
   * on the D17 ribbon, which is wider than the frame and cannot translate
   * out from under it, it is 73 % of every frame at 1/10000 brightness — the
   * measured black frame. The reading unit is 154 px tall. These two numbers
   * are what let the wall stop 47 px past the last descender instead of
   * 781 px past it, and they come off the SAME frozen `scrollY` and the SAME
   * `best` block as `laneCenterPx`, so they cannot disagree with it by a
   * frame.
   */
  laneCyPx: number;
  laneHalfYPx: number;
  /**
   * The tracked block's window value V̂ ∈ [0,1]. ONE window drives the copy's
   * rate, the copy's opacity and the lane's depth — so when no copy is on
   * frame this is 0 and the gate opens completely (storyboard §E4).
   */
  laneWindow: number;
  /**
   * ROUND 12 · D21 — THE LIT ROW, i.e. WHO won `laneWindow`, not just by how
   * much. `-1` = nobody (the chapter block is winning, or the act is off
   * frame, or the winner is below the ignition threshold).
   *
   * ⚠ THIS NUMBER ALREADY EXISTED AND WAS BEING THROWN AWAY. `apply()` has
   * always resolved a single winning block per frame from its ONE frozen
   * `window.scrollY` (the `bestV`/`bestU` comparison), and has always kept
   * only the winner's VALUE. Publishing its identity costs no second clock, no
   * second measurement, no rect and no allocation — the row index is cached on
   * the block at construction.
   *
   * It exists so the TYPE can be scroll-driven: the ledger row currently
   * crossing the reading band lights itself (amber lift, glyph glow, the Hv1
   * letter/arrow wave) instead of waiting for a pointer. The owner's rule is
   * one grammar — scroll commands, the pointer is inert on these two acts.
   *
   * DOM-side consumers must NOT poll this field: it is mirrored, edge-deduped,
   * onto `onLitRow` below, so a subscriber is woken only when the winner
   * actually changes (a few times per act, never per frame).
   */
  laneRow: number;
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
    secTop: 0,
    secH: 1,
    xScenePx: 0,
    laneCenterPx: 0,
    laneHalfPx: 0,
    laneCyPx: 0,
    laneHalfYPx: 0,
    laneWindow: 0,
    laneRow: -1,
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
  frame.laneHalfYPx = 0;
  frame.laneRow = -1;
  // ⚠ THE TEARDOWN FRONT, AND IT IS NOT OPTIONAL. Without it an EN/IT toggle,
  // a runtime reduced-motion flip or a tier step-down would leave the last row
  // lit AND displaced by the wave's 1.5em, forever: the DOM nodes survive
  // those rebuilds, so nothing else ever un-sets `[data-lit]` or tweens the
  // letters back.
  publishLitRow(id, null);
}

// === THE LIT-ROW CHANNEL (ROUND 12 · D21) =================================
//
// A publish/subscribe edge, deliberately NOT a zustand slice: the writer runs
// inside `apply()` on every ScrollTrigger update, so a `setState` there would
// be a React commit per frame. `publishLitRow` returns on the FIRST LINE when
// the value has not changed, which is the overwhelmingly common case, so the
// frame path costs one map lookup and one integer compare and allocates
// nothing. The Set is walked only on a genuine edge (a few times per act).
//
// Pinned on `globalThis` for the same Turbopack reason the store itself is:
// this module is imported by the ROUTE bundle (the DOM hooks) and could
// otherwise be inlined separately into a second chunk, splitting writers from
// readers.
//
// TWO PUBLISHERS, ONE CHANNEL. `#problem` publishes from the diagonal
// traverse's frozen snapshot (`use-diagonal-traverse.ts`). `#trust` has no
// traverse band, so it publishes from its own reading-band resolver
// (`scroll-ignition.ts`) under its own id. Consumers cannot tell them apart,
// which is the point: one grammar, two acts.

export type LitRowListener = (index: number | null) => void;

interface LitRowChannel {
  state: Map<string, number | null>;
  listeners: Map<string, Set<LitRowListener>>;
}

declare global {
  // eslint-disable-next-line no-var
  var __sersanLitRowChannel: LitRowChannel | undefined;
}

const litRows: LitRowChannel = (globalThis.__sersanLitRowChannel ??= {
  state: new Map(),
  listeners: new Map(),
});

/** The row currently crossing `id`'s reading band, or `null`. */
export function getLitRow(id: string): number | null {
  return litRows.state.get(id) ?? null;
}

/**
 * Publishes the lit row for `id`. Safe to call every frame: it is a no-op
 * unless the value actually changed.
 */
export function publishLitRow(id: string, index: number | null): void {
  if ((litRows.state.get(id) ?? null) === index) return;
  litRows.state.set(id, index);
  const set = litRows.listeners.get(id);
  if (!set) return;
  for (const fn of set) fn(index);
}

/**
 * Subscribes to `id`'s lit row. Fires IMMEDIATELY with the current value, so a
 * consumer mounting mid-act is never a frame behind the scroll position it is
 * already at.
 */
export function onLitRow(id: string, fn: LitRowListener): () => void {
  let set = litRows.listeners.get(id);
  if (!set) {
    set = new Set();
    litRows.listeners.set(id, set);
  }
  set.add(fn);
  fn(getLitRow(id));
  return () => {
    set.delete(fn);
    if (set.size === 0) litRows.listeners.delete(id);
  };
}
