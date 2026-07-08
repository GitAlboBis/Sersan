/**
 * Transient bridge between the DOM founders section (the home founders block,
 * components/sections/founders-rail.tsx) and its WebGL particle-portrait morph
 * island (webgl/FounderPortraitMorph).
 *
 * REPLACES foundersRailStore (the retired "backdrop" P1). Same writer/reader
 * discipline as neuralLatticeStore / scrollStore: written from the section's
 * gate state machine + measure + stage pointer events (never per React
 * render), read via useFoundersMorphStore.getState() inside useFrame.
 *
 * GATED, SELF-PLAYING MODEL (mirrors the hero intro gate, 2026-07-08). The
 * founders morph is NO LONGER scrubbed to scroll amount. When the section pins,
 * a scroll-jack (founders-rail.tsx, canMorph branch — mirrors HeroIntroGate)
 * consumes wheel/touch and drives a small state machine:
 *   - stage 'A'  : Alessandro fully formed and LOCKED (uMorph pinned at 0).
 *   - one scroll-down gesture → morphTarget = 1 → the island AUTO-PLAYS A→B on
 *     its own clock (MORPH_DURATION), absorbing further scroll until complete.
 *   - stage 'B'  : Michele fully formed and LOCKED (uMorph pinned at 1).
 *   - another scroll-down gesture → the gate RELEASES (Lenis resumes).
 *   - reverse symmetrically for scroll-up (B→A auto-play, then release upward).
 * The island advances `uMorph` toward `morphTarget` on a one-shot clock and
 * reports the live value back as `morph` (0..1) + the derived `stage`; the DOM
 * copy A/B cross-fade follows `morph`, NOT raw scroll.
 *
 * The ONLY reactive reads allowed are the rare-change fields `pinned` and
 * `measureVersion` (the island subscribes to those to know when to (re)build +
 * (re)measure the stage rect). secTop/travel are CSS px in document space.
 *
 * FIELDS:
 *   - stage        : 'A' | 'morphing' | 'B' — logical stage (island-derived).
 *   - morphTarget  : 0 | 1 — the uMorph value the island animates toward.
 *   - morphImmediate: when true, the island JUMPS uMorph to morphTarget (no
 *                     auto-play) then clears the flag — used to pin the entry
 *                     side on gate engage (arrive-from-bottom lands on B).
 *   - morph        : 0..1 — the island's live uMorph (writer: island; reader:
 *                     the DOM copy/poster cross-fade).
 *   - gateEngaged  : true while the section scroll-jack owns wheel/touch.
 *   - reveal       : 0|1 fire-once — set when the section enters view / engages;
 *                    the island advances the one-shot entry assemble on it.
 *   - hover        : 0..1 pointer-over-stage target (subtle mid-flight parallax).
 *   - mouse        : pointer position in stage UV (0..1, DOM top-left origin).
 *   - secTop       : document Y of the morph wrapper (sticky range start).
 *   - travel       : extra scroll past the first viewport (0 in the gate model).
 *
 * The section MUST call reset() in its effect cleanup so the WebGL layer never
 * reads a stale section after navigation (the store outlives routes).
 *
 * GLOBALTHIS PIN (mirrors neuralLatticeStore / textMorphStore): written by the
 * route bundle (founders-rail lives in the home route bundle) and read by the
 * lazy WebGL island (FounderPortraitMorph) — the exact cross-bundle split that
 * desyncs small store modules in prod (Turbopack inlines a copy per chunk → two
 * live instances). The global pin makes every bundled copy resolve to the
 * single real store.
 */
import { create } from "zustand";

/** Pointer position in stage UV (0..1, DOM top-left origin). */
export interface MousePoint {
  x: number;
  y: number;
}

export type FounderStage = "A" | "morphing" | "B";

interface FoundersMorphState {
  /** True while the desktop vertical sticky morph mode is active. */
  pinned: boolean;
  /**
   * True once the WebGL island has actually built its particle cloud on a
   * TRUE-WebGPU compute backend. The DOM stage reads this to hide its static
   * portrait poster only when the cloud is really rendering — so a flag-on but
   * WebGL2-fallback session keeps a graceful static poster instead of a blank
   * stage. Writer: FounderPortraitMorph; reader: founders-rail (reactive).
   */
  active: boolean;
  /** True while the section scroll-jack owns wheel/touch (page locked). */
  gateEngaged: boolean;
  /** Logical stage — derived by the island from its live uMorph. */
  stage: FounderStage;
  /** uMorph the island animates toward (0 = Alessandro, 1 = Michele). */
  morphTarget: 0 | 1;
  /** When true the island JUMPS uMorph to morphTarget (no auto-play). */
  morphImmediate: boolean;
  /** Live uMorph 0..1 (writer: island; reader: DOM copy/poster cross-fade). */
  morph: number;
  /** True once the one-shot entry assemble (Alessandro forming) has completed.
   * Writer: island; reader: the gate (refuses to trigger a leg before A is
   * fully formed, so a fast flick can't morph a half-assembled face). */
  assembleDone: boolean;
  /** Fire-once entry reveal target (0|1). */
  reveal: number;
  /** Pointer-over-stage target (0..1). */
  hover: number;
  /** Pointer position in stage UV. */
  mouse: MousePoint;
  /** Document Y of the tall morph wrapper (sticky range start). */
  secTop: number;
  /** Extra scroll past the first viewport (0 in the gate model). */
  travel: number;
  /** Bumped after every layout measure; the island re-measures + rebuilds. */
  measureVersion: number;
  setPinned: (pinned: boolean) => void;
  setActive: (active: boolean) => void;
  setGateEngaged: (gateEngaged: boolean) => void;
  setStage: (stage: FounderStage) => void;
  setMorphTarget: (morphTarget: 0 | 1, immediate?: boolean) => void;
  setMorphImmediate: (morphImmediate: boolean) => void;
  setMorph: (morph: number) => void;
  setAssembleDone: (assembleDone: boolean) => void;
  setReveal: (reveal: number) => void;
  setHover: (hover: number) => void;
  setMouse: (mouse: MousePoint) => void;
  setLayout: (travel: number, secTop: number) => void;
  bumpMeasure: () => void;
  reset: () => void;
}

const INITIAL = {
  pinned: false,
  active: false,
  gateEngaged: false,
  stage: "A" as FounderStage,
  morphTarget: 0 as 0 | 1,
  morphImmediate: false,
  morph: 0,
  assembleDone: false,
  reveal: 0,
  hover: 0,
  secTop: 0,
  travel: 0,
  measureVersion: 0,
};

const createFoundersMorphStore = () =>
  create<FoundersMorphState>((set) => ({
    ...INITIAL,
    mouse: { x: 0.5, y: 0.5 },
    setPinned: (pinned) => set((s) => (s.pinned === pinned ? s : { pinned })),
    setActive: (active) => set((s) => (s.active === active ? s : { active })),
    setGateEngaged: (gateEngaged) =>
      set((s) => (s.gateEngaged === gateEngaged ? s : { gateEngaged })),
    setStage: (stage) => set((s) => (s.stage === stage ? s : { stage })),
    setMorphTarget: (morphTarget, immediate = false) =>
      set({ morphTarget, morphImmediate: immediate }),
    setMorphImmediate: (morphImmediate) =>
      set((s) => (s.morphImmediate === morphImmediate ? s : { morphImmediate })),
    setMorph: (morph) => set({ morph }),
    setAssembleDone: (assembleDone) =>
      set((s) => (s.assembleDone === assembleDone ? s : { assembleDone })),
    setReveal: (reveal) => set((s) => (s.reveal === reveal ? s : { reveal })),
    setHover: (hover) => set((s) => (s.hover === hover ? s : { hover })),
    setMouse: (mouse) => set({ mouse }),
    setLayout: (travel, secTop) => set({ travel, secTop }),
    bumpMeasure: () => set((s) => ({ measureVersion: s.measureVersion + 1 })),
    reset: () => set({ ...INITIAL, mouse: { x: 0.5, y: 0.5 } }),
  }));

declare global {
  // eslint-disable-next-line no-var
  var __sersanFoundersMorph:
    | ReturnType<typeof createFoundersMorphStore>
    | undefined;
}

export const useFoundersMorphStore = (globalThis.__sersanFoundersMorph ??=
  createFoundersMorphStore());

/**
 * Dev-only test-hook registry (NOT reactive, NOT part of the store). The gate
 * state machine lives in founders-rail.tsx as effect-closure locals; the dev
 * handle window.__sersanFounderMorph is created by the WebGL island
 * (FounderPortraitMorph). This shared singleton lets the island proxy
 * deterministic gate drivers (simulateGesture / getGate) into that handle so QA
 * can verify the A→B→release / B→A→release sequence WITHOUT flaky synthetic
 * wheel/Lenis momentum. The gate registers `current` on mount and clears it on
 * cleanup. Injecting a gesture runs the SAME code path a real single flick hits.
 */
export interface FoundersGateApi {
  /** Inject exactly ONE discrete armed gesture into the gate state machine. */
  simulateGesture: (dir: "up" | "down") => unknown;
  /** { engaged, stage, morphTarget, armed, accum } snapshot. */
  getGate: () => unknown;
}
export const foundersGateApi: { current: FoundersGateApi | null } = {
  current: null,
};
