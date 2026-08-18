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
 * GATED, SELF-PLAYING MODEL (mirrors the hero intro gate, 2026-07-08; widened
 * to an N-stage rail 2026-07-20). The founders morph is NOT scrubbed to scroll
 * amount. When the section pins, a scroll-jack (founders-rail.tsx, canMorph
 * branch — mirrors HeroIntroGate) consumes wheel/touch and drives a small state
 * machine over `morph`, ONE continuous scalar spanning 0..MORPH_MAX:
 *   - stage 'A'  : Alessandro fully formed and LOCKED (morph pinned at 0).
 *   - one scroll-down gesture → morphTarget = 1 → the island AUTO-PLAYS leg 0
 *     on its own clock (MORPH_DURATION), absorbing further scroll until done.
 *   - stage 'B'  : Michele fully formed and LOCKED (morph pinned at 1).
 *   - another scroll-down gesture → morphTarget = 2 → auto-play leg 1.
 *   - stage 'C'  : Mattia fully formed and LOCKED (morph pinned at 2).
 *   - another scroll-down gesture → the gate RELEASES (Lenis resumes).
 *   - reverse symmetrically for scroll-up (C→B→A, then release upward).
 *
 * B IS NOW A MIDDLE STAGE FROM WHICH NEITHER DIRECTION RELEASES. That is a real
 * behaviour change, written down here rather than left to be discovered: a user
 * parked on Michele must traverse a full leg to reach an END stage before the
 * gate hands the page back. Escape and the G_MAX_ENGAGE_MS timer remain the
 * only other outs.
 *
 * The island advances `morph` toward `morphTarget` on a one-shot clock (one
 * unit of the scalar IS one leg, so MORPH_DURATION stays per-leg and the
 * shipped feel is preserved exactly) and reports the live value back as `morph`
 * + the derived `stage`; the DOM copy cross-fade follows `morph`, NOT raw
 * scroll. floor(morph) is the leg, fract(morph) is progress within it — use
 * legOf()/legFract(), never raw arithmetic, because every copy/poster window
 * was authored against LEG-LOCAL progress.
 *
 * The ONLY reactive reads allowed are the rare-change fields `pinned` and
 * `measureVersion` (the island subscribes to those to know when to (re)build +
 * (re)measure the stage rect). secTop/travel are CSS px in document space.
 *
 * FIELDS:
 *   - stage        : 'A'|'B'|'C'|'D'|'morphing' — logical stage, DERIVED by the
 *                    island from the live scalar via stageFromMorph().
 *   - morphTarget  : integer 0..MORPH_MAX — the scalar the island animates
 *                    toward. The gate only ever steps it by one.
 *   - morphImmediate: when true, the island JUMPS morph to morphTarget (no
 *                     auto-play) then clears the flag — used to pin the entry
 *                     side on gate engage (arrive-from-bottom lands on the LAST
 *                     stage).
 *   - morph        : 0..MORPH_MAX — the island's live progress scalar (writer:
 *                    island; reader: the DOM copy/poster cross-fade).
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
 * TOUCH / NATIVE SCRUB (mobile-parity plan Phase 4d, RAIL_ISLANDS_TOUCH): on a
 * capable phone the founders block is the NATIVE snap scroller (no pin, no
 * gate, no scroll-jack) and the morph is SCRUBBED, not self-played: the DOM
 * writer (founders-rail.tsx, native branch) registers ONE passive `scroll`
 * listener on the DragRail scroller and publishes `scrollLeft` (raw, clamped)
 * + `scrub` — the continuous 0..MORPH_MAX scalar derived from the focused
 * card's offset from its snap-rest position (j + (x − T_j)/(T_{j+1} − T_j),
 * with a ±px deadband so `scrub` is an EXACT integer at snap rest, inside
 * LOCK_EPS) — via setNativeScroll (one set()). `native` is the liveness flag
 * (`pinned` stays false); the island bypasses its one-shot clock and drives
 * morphRef straight from `scrub`, then runs the SAME applyMorph / stage /
 * envelope / fade / group code. secTop := the scroller's document top,
 * travel := 0. Reused as-is: active, reveal, measureVersion, morph, stage.
 * NOT used on touch: morphTarget / morphImmediate / gateEngaged / mouse /
 * hover. reset() covers the new fields.
 *
 * GLOBALTHIS PIN (mirrors neuralLatticeStore / textMorphStore): written by the
 * route bundle (founders-rail lives in the home route bundle) and read by the
 * lazy WebGL island (FounderPortraitMorph) — the exact cross-bundle split that
 * desyncs small store modules in prod (Turbopack inlines a copy per chunk → two
 * live instances). The global pin makes every bundled copy resolve to the
 * single real store.
 */
import { create } from "zustand";
// The island (FounderPortraitMorph) already imports this module, so the lazy
// WebGL chunk pays nothing extra for it here. Deriving the stage count from the
// data — rather than a parallel literal — is what kills the class of bug that
// made the old hardcoded FOUNDER_SLUGS array silently sample the wrong face.
import { founders } from "@/data/founders";

/** Pointer position in stage UV (0..1, DOM top-left origin). */
export interface MousePoint {
  x: number;
  y: number;
}

export type FounderStage = "A" | "B" | "C" | "D" | "morphing";

/** Locked stages in rail order; index == the integer value of `morph`.
 * HARD CAP 4: the compute engine has exactly four home targets
 * (homeA..homeD / uMorph..uMorph3, gpgpuNodeSim.createTextMorphComputeBuild). */
export const STAGE_ORDER = ["A", "B", "C", "D"] as const;
/** The WIRING ceiling, distinct from the engine ceiling above. The compute
 * engine carries four home targets (homeA..homeD / uMorph..uMorph3), but the
 * COLOUR/INK chain deliberately stops at C: there is no colorsD/sizeD in
 * PortraitMorphOpts, portraitInkExpr and the fragment colour chain both end on
 * colorC. A 4th target would therefore move particles to face D's positions
 * while `base` stayed on colorCBuffer — and since ink gates disc size, the
 * alpha knee, coverage and the alpha Discard, cells that are subject in D but
 * backdrop in C get culled: the 4th face renders as a C-shaped STENCIL. N=4 is
 * the one arity that is neither rendered correctly nor truncated, so cap it
 * here and derive TARGET_COUNT from this (FounderPortraitMorph) rather than
 * letting the position cap masquerade as the renderable cap. Raise ONLY
 * together with colorsD/sizeD + the ink/colour chain. */
export const WIRED_TARGETS = 3;
/** Morph LEGS (people − 1), CAPPED at the wired targets. Capping here rather
 * than at `founders.length` is load-bearing: at N ≥ 5 an uncapped max would
 * make stageFromMorph return STAGE_ORDER[4] === undefined typed as
 * FounderStage, poisoning `stage` so the gate never releases downward. Capped,
 * an extra person degrades gracefully to truncation. `morph` spans
 * 0..MORPH_MAX. */
export const MORPH_MAX = Math.min(founders.length, WIRED_TARGETS) - 1;
/** People ON THE RAIL — the gate counter's denominator (01/03 …). MUST be used
 * instead of founders.length or the counter and the stages disagree. */
export const STAGE_TOTAL = MORPH_MAX + 1;
if (
  process.env.NODE_ENV !== "production" &&
  founders.length > WIRED_TARGETS
) {
  // Make the truncation VISIBLE. Silently dropping a person the data says is on
  // the rail is exactly the failure this cap is here to prevent being mute.
  console.warn(
    `[foundersMorphStore] ${founders.length} founders but only ${WIRED_TARGETS} ` +
      `are wired through the colour/ink chain — the rail truncates to ` +
      `${STAGE_TOTAL}. Add colorsD/sizeD + extend portraitInkExpr and the ` +
      `fragment colour chain before raising WIRED_TARGETS.`,
  );
}
/** Lock tolerance: within this of an integer the stage counts as LOCKED.
 * MUST stay 0.02 — founders-rail's COPY_ENTER_END is authored as 1 − LOCK_EPS
 * so a leg can never lock with copy still mid-flight. */
export const LOCK_EPS = 0.02;

/** Locked-stage index 0..MORPH_MAX, or -1 while a leg is in flight. Derived,
 * never stored: a stored index is a second writer that can desync from
 * `morph`. */
export const stageIndex = (s: FounderStage): number =>
  s === "morphing" ? -1 : STAGE_ORDER.indexOf(s as (typeof STAGE_ORDER)[number]);

/** THE single derivation of stage from the live scalar (island writes it).
 * Numerically identical to the shipped 2-stage form at N=2: m ≤ 0.02 → "A",
 * m ≥ 0.98 → "B", else "morphing". */
export const stageFromMorph = (m: number): FounderStage => {
  for (let i = 0; i <= MORPH_MAX; i++) {
    if (Math.abs(m - i) <= LOCK_EPS) return STAGE_ORDER[i];
  }
  return "morphing";
};

/** Current leg 0..MORPH_MAX-1 (which pair of portraits is in play). Clamped at
 * the top so legFract(MORPH_MAX) === 1 and the flight envelope closes. */
export const legOf = (m: number): number =>
  Math.min(Math.max(Math.floor(m), 0), Math.max(MORPH_MAX - 1, 0));

/** Progress 0..1 WITHIN the current leg — the value every copy/poster window
 * (COPY_EXIT_*, COPY_ENTER_*, the poster smoothstep) and the flight envelope
 * were authored against. Using raw `m` instead inverts the envelope on leg 2. */
export const legFract = (m: number): number => m - legOf(m);

interface FoundersMorphState {
  /** True while the desktop vertical sticky morph mode is active. */
  pinned: boolean;
  /**
   * True while the TOUCH scrub source is armed on the native snap scroller
   * (Phase 4d). Rare-change; reactive reads allowed like `pinned`. Mutually
   * exclusive with `pinned` by construction; never true on tier "full".
   */
  native: boolean;
  /** Touch: the scroller's live scrollLeft, clamped to [0, max] (CSS px). */
  scrollLeft: number;
  /** Touch: continuous 0..MORPH_MAX scrub — the focused card's snap-relative
   * offset; an EXACT integer at snap rest (writer applies a deadband). */
  scrub: number;
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
  /** Integer 0..MORPH_MAX the island animates toward (0 = Alessandro,
   * 1 = Michele, 2 = Mattia). The gate only ever steps it by one. */
  morphTarget: number;
  /** When true the island JUMPS morph to morphTarget (no auto-play). */
  morphImmediate: boolean;
  /** Live rail scalar 0..MORPH_MAX — leg-major (1.0 = target B fully formed).
   * floor() = leg, fract() = leg progress; use legOf()/legFract(), never raw
   * arithmetic. Writer: island; reader: DOM copy/poster cross-fade. */
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
  setNative: (native: boolean) => void;
  /** Touch source: ONE set() per scroll event (scrollLeft + scrub). */
  setNativeScroll: (scrollLeft: number, scrub: number) => void;
  setActive: (active: boolean) => void;
  setGateEngaged: (gateEngaged: boolean) => void;
  setStage: (stage: FounderStage) => void;
  setMorphTarget: (morphTarget: number, immediate?: boolean) => void;
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
  native: false,
  scrollLeft: 0,
  scrub: 0,
  active: false,
  gateEngaged: false,
  stage: "A" as FounderStage,
  morphTarget: 0,
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
    setNative: (native) => set((s) => (s.native === native ? s : { native })),
    setNativeScroll: (scrollLeft, scrub) =>
      set((s) =>
        s.scrollLeft === scrollLeft && s.scrub === scrub
          ? s
          : { scrollLeft, scrub },
      ),
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
  /** { engaged, stage: 'A'|'B'|'C'|'morphing', morphTarget: 0|1|2, armed,
   * accum } snapshot. Typed `unknown`, so the widened values flow through
   * without a signature change. */
  getGate: () => unknown;
}
export const foundersGateApi: { current: FoundersGateApi | null } = {
  current: null,
};
