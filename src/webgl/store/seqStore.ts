/**
 * seqStore — bridge between the DOM singularity passage (the home cinematic
 * plunge between the spine's beat 05 and the ProblemSection "divario") and
 * the WebGL layer (SignatureLine's camera pan + the SequenceSingularity
 * island).
 *
 * OWNERSHIP (the camTilt/textMorphStore precedent):
 *   - src/components/sections/singularity-passage.tsx owns the CLOCK: its
 *     scrubbed ScrollTriggers evaluate every beat as a pure function of
 *     progress `p` (fully reversible) and write the results here per tick.
 *   - SignatureLine consumes `pan01` inside its priority-0 useFrame (it stays
 *     the single camera authority; the pan is one more additive term).
 *   - SequenceSingularity consumes `dist`/`holeYFrac`/`holeFade`/`starAlpha`/
 *     `tunnelAlpha` as uniform/placement inputs, and is the only writer of
 *     `holeNdcX/holeNdcY` + `marchLive` (island → DOM back-channel for the
 *     tunnel's zoom-blur center lock and the CSS-imposter suppressor).
 *
 * No React subscribers on the hot fields — everything is read via getState()
 * inside frame loops / rAF ticks, textMorphStore discipline.
 *
 * NO three import here: this module is shared by the ROUTE bundle (the DOM
 * passage) and the lazy WebGL island chunk. It must stay three-free, and it
 * is pinned on globalThis for exactly the same reason textMorphStore is —
 * Turbopack may inline a separate copy of a small module into each chunk,
 * splitting writers from readers (reproduced on the intro store 2026-06-10).
 */
import { create } from "zustand";

// === Beat map (fixed — THE LONG TAKE, judge-approved) ======================
// All progress values are fractions of the main passage ScrollTrigger
// (start "2.5% top" → end "bottom bottom" over the 460vh container, i.e.
// ~348vh of scrub travel). Every downstream value is a pure function of `p`.
export const SEQ = {
  /** Desktop container height (sticky h-screen stage inside). */
  DESKTOP_HEIGHT_VH: 460,
  /** Mobile/coarse reduced container height (short fade-through beat). */
  LITE_HEIGHT_VH: 180,

  // --- Beat boundaries (p) -------------------------------------------------
  SETTLE_END: 0.1, // handover echo rests frame-left; 2% pan pre-drift
  TRACK_END: 0.38, // camera pans right; hole enters frame-right
  HOLD1_END: 0.46, // dead-center rest at dist 12 — restraint beat
  APPROACH_END: 0.72, // dist 12→2.6 exponential (micro-hold plateau at d≈6)
  IGNITION_END: 0.8, // dist 2.6→1.9; tunnel crossfade replaces the march
  SPEED_END: 0.9, // wordless pure-speed breath (tunnel + closing veil)
  SEAM_START: 0.92, // second trigger: emergence into the divario

  // --- The physics rule: apparent size = pure camera distance --------------
  // apparent height fraction = 2 / (2·tan(FOV/2)·d) = SEQ_APPARENT_K / d.
  DIST_FAR: 16, // ~13.4vh — first read: warped starlight, then the hole
  DIST_MID: 12, // ~17.9vh — HOLD 1 framing
  DIST_HOLD2: 6, // ~35.7vh — the APPROACH micro-hold plateau
  DIST_NEAR: 2.6, // ~82.5vh — end of APPROACH
  DIST_FLOOR: 1.9, // ~112.9vh — hard floor (dossier: never cross r≈1.2)

  // --- Raymarch fade (lensing-first reveal + crossfade mandate) ------------
  FADE_IN_START: 0.1,
  FADE_IN_END: 0.3,
  FADE_OUT_START: 0.74,
  FADE_OUT_END: 0.8, // group.visible OFF past this — never fullscreen march
  /** Null-tunnel fallback: longer uFade tail carries a dark plunge. */
  FADE_OUT_NULL_END: 0.86,

  // --- Lensed-star alpha (graft 1: high through TRACK, falls on APPROACH) --
  STAR_HI: 0.9,
  STAR_LO: 0.4,

  // --- High-composition entrance (graft 2) ---------------------------------
  Y_FRAC_ENTER: -0.08, // of view height at the hole plane, easing to 0

  // --- Tunnel lifecycle ----------------------------------------------------
  TUNNEL_CREATE_P: 0.3, // instance created parked (calm TRACK beat)
  TUNNEL_WARM_P: 0.6, // first warm renders at alpha 0
  TUNNEL_PARK_P: 0.55, // reverse-scroll: rAF halts below this
  TUNNEL_IN_START: 0.72,
  TUNNEL_IN_END: 0.8,

  // --- Warp drive (timeCoef target; module lerps 0.02/frame) ---------------
  WARP_START_P: 0.72,
  WARP_END_P: 0.9,
  WARP_MIN: 2,
  WARP_MAX: 100,
  WARP_SEAM: 8, // seam scrubs 100→8 as the streaks die into the divario

  // --- Camera pan unwind (hidden under the tunnel + veil) ------------------
  PAN_UNWIND_START: 0.8,
  PAN_UNWIND_END: 0.92,

  // --- Closing black-core veil ---------------------------------------------
  VEIL_START: 0.78,
  VEIL_END: 0.9,
  VEIL_NULL_START: 0.7, // graft 5: the veil carries the plunge alone
  VEIL_NULL_END: 0.86,

  // --- DPR cap during the plunge (with hysteresis) -------------------------
  DPR_CAP_ON: 0.7,
  DPR_CAP_OFF: 0.68,
  DPR_CAP: 1.5,

  // --- Scripted march quality step (graft 4; path ≈ 1.82 preserved) --------
  ITER_HI: 96,
  STEP_HI: 0.0095, // 0.0095·96·2 ≈ 1.824
  ITER_LO: 64,
  STEP_LO: 0.0142, // 0.0142·64·2 ≈ 1.818

  // --- Mobile/coarse CSS imposter (same 1/d curve on a div) ----------------
  LITE_START_VH: 12,
  LITE_MAX_VH: 160,
} as const;

/** Camera pan amplitude as a fraction of worldViewWidth (SignatureLine and
 * the island must agree — the hole's fixed world X is this same product so
 * it lands dead-center at pan end). */
export const SEQ_PAN_FRAC = 0.55;

/** Apparent-height constant: 2 / (2·tan(CAMERA_FOV/2)) with FOV 50°.
 * apparent height fraction of the viewport = SEQ_APPARENT_K / dist — the
 * owner's 1/distance divergence law, exactly. (Kept as a literal so this
 * module never imports three; SequenceSingularity re-derives the same value
 * from CAMERA_FOV and the two must match.) */
export const SEQ_APPARENT_K = 2.1445;

// === Tiny pure helpers (shared by the DOM passage + the CSS imposter) ======
export const seqClamp01 = (x: number): number =>
  x < 0 ? 0 : x > 1 ? 1 : x;
/** Linear 0..1 ramp of x across [a, b]. */
export const seqRamp = (x: number, a: number, b: number): number =>
  seqClamp01((x - a) / (b - a));
/** Smoothstep of the same ramp. */
export const seqSmooth = (x: number, a: number, b: number): number => {
  const t = seqRamp(x, a, b);
  return t * t * (3 - 2 * t);
};

// === Store =================================================================
interface SeqState {
  /** True while the desktop cinematic sequence owns its scroll range (the
   * armed matchMedia context is live). Every WebGL consumer no-ops at false. */
  active: boolean;
  /** True while inside the approach band (section −1 viewport → +250vh past
   * the seam): the island keeps its march build alive only inside it. */
  armed: boolean;
  /** True once the island's raymarch build is live — suppresses the DOM CSS
   * hole imposter on the non-WebGPU/fallback path. */
  marchLive: boolean;
  /** True when createPreloaderTunnel returned null (no WebGL1): the closing
   * veil rises earlier and the uFade tail lengthens (graft 5). */
  tunnelNull: boolean;
  /** Main passage scrub progress 0..1. */
  p: number;
  /** Seam trigger scrub progress 0..1 (sequence p 0.92 → divario+40vh). */
  seamT: number;
  /** Eased camera-pan progress 0..1 (includes the 2% SETTLE pre-drift and
   * the hidden 1→0 unwind under the tunnel). SignatureLine multiplies by
   * SEQ_PAN_FRAC × worldViewWidth. */
  pan01: number;
  /** Camera→hole distance, world units (the ONLY size driver — the island
   * never scales the proxy sphere). */
  dist: number;
  /** Vertical hole offset as a fraction of view height at the hole plane
   * (graft 2: −0.08 entering, 0 by HOLD 1). */
  holeYFrac: number;
  /** Raymarch uFade 0..1 (lensing-first in, crossfade out). */
  holeFade: number;
  /** uEnvStarAlpha 0.9→0.4 (graft 1 falloff across APPROACH). */
  starAlpha: number;
  /** Tunnel canvas opacity 0..1 = rise(p) × (1 − seam). */
  tunnelAlpha: number;
  /** Hole apparent-center in canvas UV space (0..1, y-up — the zoom-blur
   * uCenter convention). Island-written; eased to exact 0.5/0.5 by p 0.80. */
  holeNdcX: number;
  holeNdcY: number;
}

const SEQ_DEFAULTS: SeqState = {
  active: false,
  armed: false,
  marchLive: false,
  tunnelNull: false,
  p: 0,
  seamT: 0,
  pan01: 0,
  dist: SEQ.DIST_FAR,
  holeYFrac: SEQ.Y_FRAC_ENTER,
  holeFade: 0,
  starAlpha: SEQ.STAR_HI,
  tunnelAlpha: 0,
  holeNdcX: 0.5,
  holeNdcY: 0.5,
};

const createSeqStore = () => create<SeqState>(() => ({ ...SEQ_DEFAULTS }));

declare global {
  // eslint-disable-next-line no-var
  var __sersanSeqStore: ReturnType<typeof createSeqStore> | undefined;
}

/** Pinned on globalThis — imported from BOTH the route bundle and the lazy
 * WebGL island chunk (see the header + textMorphStore's identical note). */
export const useSeqStore = (globalThis.__sersanSeqStore ??= createSeqStore());

/** Full reset (passage teardown: language toggle, viewport class change,
 * unmount). `marchLive` is preserved — it belongs to the island's build
 * lifecycle, which tears down on its own `armed` edge. */
export function resetSeqStore(): void {
  const { marchLive } = useSeqStore.getState();
  useSeqStore.setState({ ...SEQ_DEFAULTS, marchLive });
}
