/**
 * seqStore — bridge between the DOM singularity passage (the home cinematic
 * sequence between the spine's beat 04 and the ProblemSection "divario") and
 * the WebGL layer (SignatureLine's camera pan + the SequenceSingularity
 * island).
 *
 * OWNERSHIP (the camTilt/textMorphStore precedent):
 *   - src/components/sections/singularity-passage.tsx owns the CLOCK — in
 *     TWO regimes (owner corrections 2026-08-07 + 2026-08-09):
 *       SCRUBBED  p 0..1: settle → horizontal traverse → hold → approach.
 *                 Every value is a pure function of progress `p` (fully
 *                 reversible), written per scrubbed ScrollTrigger tick. On
 *                 the FORWARD path only SETTLE + the tiny pre-trigger window
 *                 (p < 0.10) are ever scrubbed; p 0.10..1 remains scrub
 *                 territory for REVERSE ENTRY (scrolling up from the
 *                 divario) only.
 *       ONE-SHOT  the plunge (traverse → light-speed → enter → black speed →
 *                 zoom-in emergence) is a TRIGGERED GSAP timeline (~6.9s,
 *                 input locked): it writes dist/holeFade/tunnelAlpha/warp/
 *                 pan01/plungeT directly per timeline tick. Scroll does not
 *                 scrub it; the FIRST forward scroll of the horizontal
 *                 regime (crossing TRIGGER_P right after SETTLE) fires it,
 *                 then it plays itself, accelerating ("andando sempre più
 *                 veloce da solo").
 *   - SignatureLine consumes `pan01` inside its priority-0 useFrame (it stays
 *     the single camera authority; the pan is one more additive term).
 *   - SequenceSingularity consumes `dist`/`holeYFrac`/`holeFade`/`starAlpha`/
 *     `tunnelAlpha`/`plungeT` as uniform/placement inputs, and is the only
 *     writer of `holeNdcX/holeNdcY` + `marchLive` (island → DOM back-channel
 *     for the tunnel's zoom-blur center lock and the CSS-imposter
 *     suppressor).
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

// === Beat map (THE LONG TAKE v2 — horizontal traverse + one-shot plunge) ===
// Scrub values are fractions of the main passage ScrollTrigger (start
// "2.5% top" → end "bottom bottom" over the 380vh container ≈ 270.5vh of
// scrub travel). Since the round-4 PINNED HANDOFF the container is pulled up
// one viewport (marginTop −100vh, armed desktop path only), so p = 0 sits
// 9.5vh AFTER the spine's pin end — inside the 100vh window where the spine's
// empty stage slides away over this one, which is already pinned at top:0.
// The plunge is NOT in this scrub range anymore: it is a triggered
// timeline in SECONDS (the *_S constants below) — and since 2026-08-09 it
// fires right after SETTLE, so the TRACK/HOLD/APPROACH beats below are
// forward-unreachable: they exist for reverse entry (up from the divario).
export const SEQ = {
  /** Desktop container height (sticky h-screen stage inside). */
  DESKTOP_HEIGHT_VH: 380,
  /** Mobile/coarse reduced runway height, in **svh** (small-viewport height —
   * the address-bar-VISIBLE viewport), which is the unit its single consumer
   * writes it in (singularity-passage.tsx). Named `_SVH` deliberately: `vh` is
   * the LARGE viewport, so reading this as `vh` would reintroduce exactly the
   * address-bar jump the svh unit was chosen to remove (MOBILE_AUDIT.md D-7).
   * The vertical section-05 panel adds its own flow height above this. */
  LITE_HEIGHT_SVH: 180,

  // --- Scrubbed beat boundaries (p) ----------------------------------------
  // Forward flow hands off to the one-shot at TRIGGER_P (0.10) — everything
  // past it below is the REVERSE-ENTRY scrub map (down-scrub replay after a
  // reverse entry included; the trigger only re-arms below REARM_P).
  SETTLE_END: 0.08, // panel 05 materializes (PANEL_ENTER band below) then
  // rests frame-left; 2% pan pre-drift
  TRACK_END: 0.52, // horizontal parallax traverse (the domus-tua grammar)
  HOLD1_END: 0.62, // dead-center rest at dist 12 — restraint beat
  APPROACH_END: 1, // dist 12→2.6 exponential (micro-hold plateau at d≈6);
  // p = 1 IS the "near hold": hole centered at DIST_NEAR — the designed
  // re-entry pose when scrolling UP from the divario.

  // --- The physics rule: apparent size = pure camera distance --------------
  // apparent height fraction = 2 / (2·tan(FOV/2)·d) = SEQ_APPARENT_K / d.
  DIST_FAR: 16, // ~13.4vh — first read: warped starlight, then the hole
  DIST_MID: 12, // ~17.9vh — HOLD 1 framing; also the one-shot TRAVERSE end
  DIST_HOLD2: 6, // ~35.7vh — the APPROACH micro-hold plateau
  DIST_NEAR: 2.6, // ~82.5vh — end of the scrubbed APPROACH (near hold)
  DIST_LS_END: 10, // ~21.4vh — hole distance at the END of the light-speed
  // beat: 17.9→21.4vh across the whole warp — a barely-perceptible approach
  // so the body reads as enormous and DISTANT, dead-center, never fading
  DIST_FLOOR: 1.9, // ~112.9vh — one-shot ENTER floor (dossier: never
  // cross r≈1.2; >100vh apparent — the veil completes frame coverage)

  // --- Raymarch fade (lensing-first reveal; NO scrub fade-out — owner: "il
  // buco nero non deve fare fade e sparire, ci dobbiamo entrare dentro").
  // holeFade only ever drops to 0 INSIDE the one-shot, at the black-frame
  // call after ENTER (veil closed), where the swap is invisible. -------------
  FADE_IN_START: 0.08,
  FADE_IN_END: 0.4,

  // --- Lensed-star alpha (graft 1: high through TRACK, falls on APPROACH) --
  STAR_HI: 0.9,
  STAR_LO: 0.4,

  // --- High-composition entrance (graft 2) ---------------------------------
  Y_FRAC_ENTER: -0.08, // of view height at the hole plane, easing to 0

  // --- Horizontal DOM track (credibility-strip lineage) --------------------
  /** Foreground depth rate: the DOM track translates at this multiple of the
   * world's screen-space pan (world 1.0×, far dust slower via z-spread). */
  TRACK_RATE_FG: 1.15,
  /** The in-place materialize band for panel 05 — the same crossfade grammar
   * as the spine's grouped panels (owner 2026-08-09: the 04→05 handoff must
   * read like the 02→03 transition, never like a scroll): the panel is
   * INVISIBLE while the section rides in (p ≈ 0) and fully lit well before
   * TRIGGER_P (0.10). Band WIDTH matches the spine's crossfade RATE: the
   * spine's stage bands are 0.03 of a 215vh scrub (≈ 6.5vh of travel); this
   * scrub is ~270.5vh (380vh container, start "2.5% top" → end "bottom
   * bottom" = 280 − 9.5), so 0.029 − 0.005 = 0.024 × 270.5vh ≈ 6.5vh — the
   * same scroll distance per crossfade.
   * Band START moved 0.02 → 0.005 with the round-4 PINNED HANDOFF (the
   * passage is pulled up one viewport, see singularity-passage.tsx): the
   * passage ST now engages right AT the spine's pin end instead of one
   * viewport later, so the band can start almost immediately — stage 04
   * dissolves across the spine's own 0.97→1 band, ~10.9vh of pinned black
   * pass (the 9.5vh ST start offset + 0.005), then 05 materializes over
   * 6.5vh. A short breath between two crossfades, both under a frame that
   * never moves. Symmetric on reverse — scrubbing back up fades it out in
   * place across 0.029→0.005 before the section detaches. */
  PANEL_ENTER_START: 0.005,
  PANEL_ENTER_END: 0.029,
  /** Panel 05 opacity ramp-out across the tail of the traverse (it has
   * tracked mostly off-frame by then; fully gone before HOLD 1 settles). */
  PANEL_FADE_START: 0.4,
  PANEL_FADE_END: 0.55,

  // --- Tunnel lifecycle ----------------------------------------------------
  TUNNEL_CREATE_P: 0.02, // instance created parked during SETTLE — the
  // forward flow never scrubs past ~0.10 anymore, so parking it this early
  // is what keeps the one-shot's first hot frame hitch-free
  TUNNEL_WARM_P: 0.8, // first warm renders at alpha 0 (mid-APPROACH —
  // reverse-entry band; the one-shot starts its own rAF at fire)
  TUNNEL_PARK_P: 0.72, // reverse-scroll: rAF halts below this

  // --- Virtual-orbit fade (island): the slow swim dies across late APPROACH
  // so the hole sits exactly centered at the reverse-entry near hold; on the
  // forward path the one-shot's center lock (plungeT × PLUNGE_LOCK_T) kills
  // the swim instead — see SequenceSingularity's orbitEnv ------------------
  ORBIT_FADE_START: 0.8,
  ORBIT_FADE_END: 0.95,

  // --- One-shot plunge trigger (hysteresis) --------------------------------
  /** Forward crossing of this p — the FIRST forward scroll of the
   * horizontal regime, right after SETTLE_END (0.08) — fires the one-shot. */
  TRIGGER_P: 0.1,
  /** After a played plunge, the trigger re-arms only once p < REARM_P. MUST
   * stay BELOW TRIGGER_P: a re-armed user parked between the two could
   * otherwise never produce the forward crossing (prev < TRIGGER ≤ p) again
   * and the passage would dead-end with no way to replay the plunge. */
  REARM_P: 0.05,
  /** Ceiling on the fire tick. The window must swallow one-tick MOMENTUM
   * jumps through the TRACK band: a fast Lenis fling (or a momentary rAF
   * stall) can advance p by 0.1–0.4 in a single ScrollTrigger update, and a
   * crossing tick landing past the ceiling silently drops the shot (live QA
   * 2026-08-09: the user fast-scrubbed the whole beat map to the divario
   * instead of getting the cinematic). Firing from a deeper pose is safe —
   * the TRAVERSE tweens start FROM the captured launch state (pan0/dist0/
   * fade0/y0 in startPlunge), so they adapt to wherever the tick landed.
   * What must stay EXCLUDED is the single-tick NATIVE jump to the container
   * end (End key, scrollbar click-jump land at p ≈ 1): firing there would
   * launch the 6.9s locked shot off-stage (over unrelated content, even the
   * footer where the band has disposed the island) and covert-jump the
   * visitor BACKWARD. Those landings stay scrubbed; mainST's onLeave closes
   * the map past the end. */
  FIRE_MAX_P: 0.6,
  /** Cumulative reverse-wheel px during the one-shot that skips it. */
  SKIP_REVERSE_PX: 120,

  // --- One-shot plunge timeline (seconds; total ≈ 6.9s) --------------------
  /** TRAVERSE: the horizontal passage plays itself (power2.inOut) — pan
   * completes to 1, dist rides launch→DIST_MID, the hole fades in
   * lensing-first to full. Warp stays WARP_MIN; veil untouched. */
  PLUNGE_TRAVERSE_S: 1.7,
  /** LIGHT-SPEED: the jump (power2.in) — warp WARP_MIN→WARP_MAX, streaks
   * rise, stars fall; the hole stays FULLY VISIBLE, DEAD-CENTER, at
   * near-constant apparent size (DIST_MID→DIST_LS_END). No veil. */
  PLUNGE_LIGHTSPEED_S: 1.6,
  /** ENTER: the slow final approach (power1.in) — dist DIST_LS_END→FLOOR;
   * the black veil completes coverage only in the tail (the color-seam
   * trick), then the black-frame call hides the march + covert-jumps. */
  PLUNGE_ENTER_S: 1.8,
  /** PURE SPEED: inside the black — streaks at full, warp holds WARP_MAX;
   * the camera pan silently unwinds beneath the covered frame. */
  PLUNGE_SPEED_S: 0.7,
  /** EMERGENCE: the black opens, streaks die, the divario ZOOMS IN. */
  PLUNGE_EMERGE_S: 1.1,

  // --- Warp drive (timeCoef target; module lerps 0.02/frame) ---------------
  WARP_MIN: 2,
  WARP_MAX: 100, // reached across LIGHT-SPEED (MIN→MAX), held through
  // ENTER + PURE SPEED
  WARP_EMERGE: 8, // the streaks die toward this as the black opens

  // --- Island center-lock ramp (fraction of plungeT) -----------------------
  // 0.25 × the ~6.9s total ≈ the end of TRAVERSE: the hole is exactly
  // centered as the lock completes, before the light-speed jump.
  PLUNGE_LOCK_T: 0.25,

  // --- Divario zoom-in landing (transform/opacity only) --------------------
  ZOOM_SCALE_START: 0.8, // [data-emerge] scale at black-open start
  ZOOM_PULL: 0.1, // translate toward the vanishing point (fraction)

  // --- DPR cap during the heavy near-hold + one-shot (hysteresis) ----------
  DPR_CAP_ON: 0.85,
  DPR_CAP_OFF: 0.82,
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
   * the passage): the island keeps its march build alive only inside it. */
  armed: boolean;
  /** True once the island's raymarch build is live — suppresses the DOM CSS
   * hole imposter on the non-WebGPU/fallback path. */
  marchLive: boolean;
  /** True when createPreloaderTunnel returned null (no WebGL1): the veil
   * carries the plunge alone — a dark entry, never a dead cut (graft 5). */
  tunnelNull: boolean;
  /** Main passage scrub progress 0..1 — FROZEN at ~TRIGGER_P while the
   * one-shot owns the frame; traverse → near hold on reverse entry only. */
  p: number;
  /** One-shot plunge timeline progress 0..1 (0 while idle/reversible). */
  plungeT: number;
  /** Eased camera-pan progress 0..1 (includes the 2% SETTLE pre-drift; the
   * one-shot completes it →1 across TRAVERSE, then unwinds it 1→0 under the
   * black frame). SignatureLine multiplies by SEQ_PAN_FRAC ×
   * worldViewWidth. */
  pan01: number;
  /** Camera→hole distance, world units (the ONLY size driver — the island
   * never scales the proxy sphere). Scrub (reverse entry): 16→2.6. One-shot:
   * launch→12→10→1.9 (TRAVERSE → LIGHT-SPEED → ENTER). */
  dist: number;
  /** Vertical hole offset as a fraction of view height at the hole plane
   * (graft 2: −0.08 entering, 0 by HOLD 1). */
  holeYFrac: number;
  /** Raymarch uFade 0..1. Lensing-first ramp-in on the traverse; NEVER fades
   * out on scroll — dropped to 0 only under the one-shot's full-black frame. */
  holeFade: number;
  /** uEnvStarAlpha 0.9→0.4 (graft 1 falloff across APPROACH). */
  starAlpha: number;
  /** Tunnel canvas opacity 0..1 — one-shot timeline territory only. */
  tunnelAlpha: number;
  /** Tunnel warp target (timeCoef; the module lerps toward it 0.02/frame).
   * WARP_MIN at rest; the one-shot rides it to WARP_MAX and back down. */
  warp: number;
  /** Hole apparent-center in canvas UV space (0..1, y-up — the zoom-blur
   * uCenter convention). Island-written; eased to exact 0.5/0.5 across the
   * one-shot's first PLUNGE_LOCK_T. */
  holeNdcX: number;
  holeNdcY: number;
}

const SEQ_DEFAULTS: SeqState = {
  active: false,
  armed: false,
  marchLive: false,
  tunnelNull: false,
  p: 0,
  plungeT: 0,
  pan01: 0,
  dist: SEQ.DIST_FAR,
  holeYFrac: SEQ.Y_FRAC_ENTER,
  holeFade: 0,
  starAlpha: SEQ.STAR_HI,
  tunnelAlpha: 0,
  warp: SEQ.WARP_MIN,
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
