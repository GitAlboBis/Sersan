/**
 * traverseConfig — THE DIAGONAL TRAVERSE, `#problem` only.
 *
 * Two authored numbers and everything else derived, per the mechanism dossier
 * §2B.0 (`2026-08-24-round11-diagonal-traverse-mechanism.md`):
 *
 *     ANGLE_DEG  = 23.61°   the diagonal the whole film is cut on (D12: the
 *                           ANGLE is the invariant, the screen-width count is
 *                           an artifact of aspect ratio)
 *     runway     = 6.10 vh  the section's own height (D10)
 *
 *     R  = tan(ANGLE_DEG)                       lateral CSS px per scroll px
 *     L  = R · runway_vh · WORLD_VIEW_HEIGHT    = 29.847 WORLD units, at EVERY
 *                                               viewport — `ih` cancels.
 *
 * `L` is never typed here: the island multiplies the published `xScenePx` by
 * its own `k = WORLD_VIEW_HEIGHT / size.height`, which is the SAME `k` it uses
 * to place the group. One conversion constant, one definition, no fudge.
 *
 * ⚠ ROLLBACK LEVERS (they are how the owner tunes this live — every look
 * constant below is reachable from `__sersanTraverse`):
 *   - `angleDeg = 0`   → R = 0 → no lateral offset, no opacity window: today's
 *                        composition at today's runway.
 *   - `gapVh = 0`      → the runway growth disappears: today's document, px
 *                        for px.
 *   - `bandVh = null`  → the `[data-lattice-anchor]` height override is
 *                        dropped: today's `inset-y-0` band.
 *   - `alphaEdge = alphaRead` (`collapseWindow()`) → the window collapses to a
 *                        constant α without touching any other code path.
 *                        THIS is the A/B that shows the owner what D11 bought.
 *   - `windowOpacity = false`  → the READING UNIT's opacity window is inert
 *                        (every block opaque); the mask lane keeps riding the
 *                        real window, so this is a pure opacity rollback.
 *   - `capBody = false`        → body copy drifts uncapped (pre-round-12).
 *   - `capDisplayMultiline = false` → multi-line display type drifts uncapped.
 *   These last three are the round-12 copy fixes, each independently revertible
 *   at runtime; `capDisplayFrameK` (default 0) is their opt-in extension.
 *   - `ribbon = false`  → ROUND 12 · STAGE 2's continuous field is gone: the
 *                        shipped centre-dense constellation, the anchor-centred
 *                        lateral, the anchor-keyed cull and no shear. The
 *                        island REBUILDS on this write (it is a generator arm,
 *                        not a uniform), so expect one dispose + one build.
 *   - `angleDeg = 23.61, bandVh = 0.8597` → the shipped GEOMETRY at whatever
 *                        field the `ribbon` flag currently selects. Both
 *                        spellings work:
 *                          setTraverseConfig({ problem: { angleDeg: 23.61,
 *                                              bandVh: 0.8597, ribbon: false }})
 *                          setTraverseConfig({ bands: { problem: { … } } })
 *                        Together with `ribbon: false` this is a byte-for-byte
 *                        return to the Stage 1 commit, live, with no reload.
 *   - `ribbonDensity`   → the D23 A/B: "onFrame" | "areal" | "nearest".
 *
 * ⚠ THE BAND HEIGHT IS PINNED TO THE VIEWPORT, AND THAT IS LOAD-BEARING.
 * `[data-lattice-anchor]` is `absolute inset-y-0` of the rows stack, so a
 * runway that grows the rows grows the anchor — and FOUR shipped constants key
 * off `rect.h`: the net's depth (`NEURAL_DEPTH_SCALE_FACTOR`), the net's
 * rendered aspect (`BAND_ASPECT` / `uPlaneAspect`), the stone's size
 * (`CRYSTAL_SCALE` — 1677 px, 186 % of the viewport, at a 4392 px band) and
 * the stone's tumble scalar `a`. Mechanism §4.4 shape **(b)** is taken here:
 * the anchor gets an explicit VIEWPORT-relative height, which is what stops
 * the runway from driving `rect.h` to ~4300 px.
 *
 * ⚠⚠ WHAT IT DOES **NOT** DO — measured, 2026-08-24, Chrome/CDP, this build.
 * The pin re-bases the band; it does not preserve it. It reproduces today's
 * geometry ONLY on the 1280×720 reference. Anchor height, HEAD vs shipped:
 *
 *     1280×720   618.8 → 619.0 px   (+0.0 %)   aspect 0.4834 → 0.4836
 *     1440×900   641.7 → 773.7 px   (+20.6 %)  aspect 0.4456 → 0.5373
 *     768×1024   515.5 → 880.3 px   (+70.8 %)  aspect 0.6712 → 1.1463
 *     390×844    482.4 → 725.6 px   (+50.4 %)  aspect 1.2369 → 1.8605
 *
 * So at every non-reference viewport the band, the stone (`CRYSTAL_SCALE` is a
 * fraction of `rect.h`), `uPlaneAspect`, the tumble scalar `a` and the fog
 * radius all move by that percentage. Against the build-time `BAND_ASPECT`
 * 0.45 the error goes ×2.75 → ×4.13 on the phone and ×1.49 → ×2.55 on the
 * tablet: **the phone's aspect gets worse, not better.** Only the DEPTH is
 * genuinely made a constant (see `NEURAL_DEPTH_VIEWPORT_SPAN`), and that is
 * because the island takes a separate viewport-relative branch for it.
 * Mechanism §4.4 shape **(c)** — decouple the group scale from the rect on all
 * three axes — is the fix that would hold at every viewport, and §4.4 calls
 * shape (b) vs (c) an OWNER-VISIBLE decision. It has not been taken.
 * `BAND_VH` reproduces today's 619 px band on the 1280×720 reference (619/720).
 *
 * ⚠ ROUND 12 · STAGE 1 — THE ISLAND LADDER IS GONE (owner decisions D14–D24).
 * Stage 1.5 answered the coverage hole with FIVE stacked bands. The owner read
 * the stack itself as the defect — *"la rete dev'essere una rete orizzontale
 * continua, non spezzata in piu sezioni verso il basso"* — so `TraverseIsland`,
 * `TraverseIslandsConfig`, `fitTraverseLadder()`, `MAX_TRAVERSE_ISLANDS` and
 * `traverseIslands()` are deleted here rather than switched off. What did NOT
 * die with them is the LATERAL RE-CENTRING: see `bandLateralPx()` below. It was
 * the `islands.compensate` flag; it is now unconditional, because a band that
 * is not re-centred on its own arrival is swept off the side of the frame.
 *
 * three-free by construction: this module is imported by the DOM hook AND by
 * the WebGL island. No `three`, no `gsap`.
 */

export type TraverseBandId = "problem";

/**
 * The three density arms of the D17 ribbon (D23 — the owner picks by eye).
 * Structurally identical to `RibbonDensity` in `neuralLatticeConfig`; declared
 * here rather than imported because THIS MODULE MUST STAY three-FREE (the DOM
 * hook imports it, and `neuralLatticeConfig` pulls in the crystal config).
 */
export type TraverseRibbonDensity = "onFrame" | "areal" | "nearest";

export interface TraverseBandConfig {
  /** Scene direction: −1 = the world runs LEFT (Act I), +1 = RIGHT (Act II). */
  dir: 1 | -1;
  /** The authored diagonal, degrees from vertical. 0 disables the lateral. */
  angleDeg: number;
  /** Runway growth per authored gap, in viewport heights. 0 = today's doc. */
  gapVh: number;
  /** Number of authored gaps the CSS distributes `gapVh` across. */
  gapCount: number;
  /** Band height in viewport heights (null = today's `inset-y-0`). */
  bandVh: number | null;
  /**
   * ROUND 12 · STAGE 2 — THE RIBBON FIELD (D17). `false` restores the shipped
   * centre-dense band exactly: the ellipsoid constellation, the anchor-centred
   * lateral, the anchor-keyed cull, no shear, no exit fade.
   *
   * It lives HERE rather than in the island because THREE consumers have to
   * agree about it in the same frame and two of them are not the island: the
   * net's rig, the stone's `cx`/`cy` (`CrystalCluster`), and the build effect
   * that chooses the generator arm. A flag any of them could disagree about is
   * the class of bug the frozen frame exists to prevent.
   */
  ribbon: boolean;
  /** Which of the three measured density arms the ribbon builds at (D23).
   * A live write rebuilds the field (build + dispose), which is why it is a
   * config revision and not a uniform. */
  ribbonDensity: TraverseRibbonDensity;
  /**
   * ══ ROUND 13f — THE METEOR HOLD (owner, 2026-08-26) ══════════════════════
   * "si bloccasse la camera al centro, e che con lo scroll continuasse ad
   * aprirsi il meteorite stando al centro e con un piccolo zoom in mentre si
   * vede il logo, poi allo successivo scroll fa zoom out e continua lo
   * scroll orizzontale." — the owner's own reversal of D7's no-pin rule, for
   * this ONE beat.
   *
   * `null` = no hold (byte-identical traverse). Otherwise: the act's tail
   * grows by `holdVh·100svh` of donated scroll (the `--tv-hold-vh` CSS var,
   * gapVh's grammar), and the scene lateral rides a C² closed-form warp that
   * plateaus over a window starting at `t0Frac` of the EFFECTIVE run
   * (secH − donated) — so the field geometry, the copy cadence and the act's
   * end registration are all byte-identical to the no-hold document; the
   * beat is pure added scroll. `rampFrac` is each ramp's share of the
   * window (smoothstep in rate ⇒ C² in position, the traverse-rate law).
   */
  meteorHold: {
    t0Frac: number;
    holdVh: number;
    rampFrac: number;
  } | null;
}

export interface TraverseConfigShape {
  bands: Record<TraverseBandId, TraverseBandConfig>;
  /** α in the reading plateau — display type (storyboard §B2.3). */
  alphaReadDisplay: number;
  /** α in the reading plateau — body copy. */
  alphaReadBody: number;
  /** α at the frame edges. DELIBERATELY COMMON to every layer (§B2.3). */
  alphaEdge: number;
  /**
   * THE A/B. `true` makes α_edge equal each block's own α_read, collapsing the
   * window to the CONSTANT rate the owner rejected (D11) — the one-line switch
   * that shows him what he chose over what he rejected. Nothing else changes.
   */
  collapse: boolean;
  /** Reading-band inset as a fraction of the viewport height (`m = 0.12·h`). */
  bandInset: number;
  /** Fallback for `--header-h` when the custom property cannot be read. */
  headerFallbackPx: number;
  /** `opacity = V̂` on the lateral wrapper (storyboard §B2.4). */
  windowOpacity: boolean;
  /** The per-block `tanh` cap on the SLOW component only (§B2b). */
  capBody: boolean;
  /**
   * D15-bis. Extend the §B2b cap to DISPLAY blocks that MEASURE more than one
   * line. §C0's premise — "a single line has no return sweep, so display drift
   * is free" — is true of the sweep and FALSE of the input: at 390×844 EN,
   * `02· No traces` and `03· No boundaries` wrap to two lines (h 67 px at a
   * 31.9 px line-height), so the row's two halves travel at 0.50 and 0.25 and
   * visibly tear apart. `false` restores the uncapped display rate exactly.
   */
  capDisplayMultiline: boolean;
  /**
   * D15-bis RIDER — the frame-keyed closure, OFF by default (0 = inert).
   *
   * `capDisplayMultiline` cannot catch a display block that is ONE line and
   * still slides half the frame: measured at 390×844, `01· No evals` (h 35) is
   * one line and its uncapped plateau drift is 111 px at 23.61° / 208 px at
   * 45° — 28 % / 53 % of a 390 px frame, next to a paragraph moving ~70 px. So
   * the phone's three ledger rows behave differently from one another, which
   * reads as a bug faster than the drift did.
   *
   * Set > 0 to also cap any DISPLAY block whose UNCAPPED plateau drift exceeds
   * `k · innerWidth`. `k = 0.15` is the authored candidate: 58 px @390 (catches
   * both phone headlines) and 288 px @1920 (leaves the desktop headline —
   * 119 px at 23.61°, 234 px at 45° — byte-identical, so the ledger keeps the
   * headline/paragraph parallax that IS its visible depth).
   *
   * Left at 0 because it is an OWNER-VISIBLE beat change on the phone, not a
   * defect fix: `setTraverseConfig({ capDisplayFrameK: 0.15 })` is the A/B.
   */
  capDisplayFrameK: number;
  /** Drive the net's copy mask as a tracking LANE (§2B.4). */
  laneEnabled: boolean;
  /** Freeze the DPR ceiling for the duration of the act (§6.3). */
  dprCap: boolean;
  /** Bumped by every live write; the hook re-measures on a change. */
  revision: number;
}

/** Live, mutable — the dev handle writes straight into it. */
export const traverseConfig: TraverseConfigShape = {
  bands: {
    problem: {
      dir: -1,
      // ROUND 12 · STAGE 2 — 23.61° → 45°. At R = tan 45° = 1 every scroll
      // pixel is a lateral pixel: the act's 5358 px becomes 5358 px of run
      // = 2.791 screen widths @1920 (D15), and the field that has to cover the
      // frame for the whole of it is `Λ + 1` = 3.791 band-widths = 7278 px.
      // 23.61 is the rollback value (`R = 0.437097`).
      angleDeg: 45,
      // 1.85 vh of authored content today + 4 × 1.06 vh ⇒ ≈ 6.10 vh (D10).
      // Measured: 6.02 vh @1280×720, 5.74 @1440×900, 5.45 @390×844, 5.32
      // @768×1024 — the authored content is not 1.85 vh at every viewport. The
      // ANGLE is exact everywhere (D12's invariant); the RUN LENGTH is not,
      // so `L` is 26.0–29.4 world units rather than the spec's flat 29.847.
      //
      // ⚠⚠ THE COMPOSITION HOLE IS OPEN AGAIN, AND THAT IS DELIBERATE HERE.
      // One 619 px band inside a 4335 px act is on frame for ~31 % of the run,
      // and the census that first justified the ladder measured 40.0 % of the
      // act with neither net nor copy on it (1280×720, every 4 px, one
      // unbroken 1116 px run). The ladder closed that by stacking five bands;
      // the owner rejected the stack itself (D14–D24), so ROUND 12 · STAGE 1
      // deletes it and STAGE 2 closes the same hole with ONE continuous
      // ribbon — a band as long as the lateral run instead of five short ones.
      // This file is therefore a CHECKPOINT with a known void, not a shippable
      // state; `coverage().nothing` reports it honestly at every commit.
      gapVh: 1.06,
      gapCount: 4,
      // ROUND 12 · STAGE 2 — 0.8597 → 1.0. The band IS the frame now: the
      // owner chose "alta esattamente quanto il frame", accepting that the
      // net's top and bottom edges are visible, over a taller-than-frame net
      // with no edges. 0.8597 (619/720, the 1280×720 reference) is the
      // rollback value and the number `CRYSTAL_BAND_VH_REF` rebases against.
      // ⚠ `NEURAL_DEPTH_VIEWPORT_SPAN` carries 0.8597 too, for a completely
      // unrelated reason (the net's DEPTH). Do not touch it.
      bandVh: 1.0,
      ribbon: true,
      ribbonDensity: "onFrame",
      // Stone centred (a ≈ 0) measured at travelled ≈ 0.820·warpSecH; the
      // deceleration ramp itself advances the scene ~W·ρ/2 ≈ 124 px, so the
      // hold BEGINS half a ramp early (0.79) and the stone comes to rest at
      // dead centre. 1.15 vh of donated scroll, 22% ramps.
      meteorHold: { t0Frac: 0.79, holdVh: 1.15, rampFrac: 0.22 },
    },
  },
  alphaReadDisplay: 0.5,
  alphaReadBody: 0.25,
  alphaEdge: 3.5,
  collapse: false,
  bandInset: 0.12,
  headerFallbackPx: 98,
  windowOpacity: true,
  capBody: true,
  capDisplayMultiline: true,
  capDisplayFrameK: 0,
  laneEnabled: true,
  dprCap: true,
  revision: 0,
};

/** Lateral CSS px per scroll px for a band — `tan(angle)`, nothing else. */
export function traverseRate(band: TraverseBandConfig): number {
  const a = band.angleDeg;
  if (!Number.isFinite(a) || a <= 0) return 0;
  return Math.tan((a * Math.PI) / 180);
}

/**
 * THE BAND'S LATERAL, RE-CENTRED ON ITS OWN ARRIVAL — one definition, two
 * callers (`NeuralLattice.tsx`'s rig and `CrystalCluster.tsx`'s `cx`).
 *
 * ⚠ THIS IS WHAT SURVIVED `islands.compensate`, AND IT IS NOT OPTIONAL.
 * The scene lateral runs `R · secH` across the act — 2342 px at 1920×935,
 * 5358 px once STAGE 2 takes the angle to 45°. A band drawn at the raw
 * `xScenePx` would sit at `x = 0` only at `p = 0` and would be a full screen
 * off the side by mid-act. Subtracting the scene lateral AT THE SCROLL
 * POSITION WHERE THIS BAND IS CENTRED IN THE VIEWPORT puts `x = 0` exactly
 * when the band is centred, and the band then sweeps symmetrically either
 * side of that. It is the storyboard's own strip-x compensation (§B3) applied
 * to the net rather than to the copy, with α ≡ 1.00.
 *
 * Pure arithmetic on the FROZEN frame plus the caller's already-cached rect:
 * no DOM read, no allocation, safe on the frame path. The stone and the net
 * that share an anchor pass identical arguments, so they can differ by float
 * noise only — which is what `__sersanCrystal_*.traverse.deltaPx` measures.
 *
 * ⚠ STAGE 2 TOOK THE SWAP THE OLD DOCSTRING PREPARED, AND IT IS GATED ON
 * `band.ribbon`, NOT ON THE ANGLE.
 * Under the ribbon the field is on frame for the WHOLE act, so the scroll
 * position at which it is centred is the act's own midpoint (`secH/2`) — and
 * that is the only origin under which the run is symmetric (`±R·secH/2`), i.e.
 * the only one under which a field of length `Λ+1` covers the frame at both
 * ends. Anchor-centred, `travelledAtCentre` is the scroll at which the ANCHOR
 * BOX is centred, which under a `bandVh = 1` pin near the top of the section
 * is a few hundred px: the run would go from 0 to −5358 instead of ±2679, the
 * lead-in half of the field would never be seen and the far end would leave
 * the frame before p = 1.
 *
 * The swap is worth 531 px on the stone at the SHIPPED geometry (measured
 * 1920×935: anchor-centred −639.67 px, act-centred −1170.87 px) — which is
 * exactly why Stage 1 refused it and why it is gated on the ribbon rather than
 * applied unconditionally: `ribbon: false` restores the shipped stone to the
 * pixel, in the same live write that restores the shipped constellation.
 */
export function bandLateralPx(
  band: TraverseBandConfig,
  /** `frame.xScenePx` — the act's scene lateral at the frozen scroll. */
  xScenePx: number,
  /** `frame.secTop` / `frame.secH` — from the SAME frozen snapshot. */
  secTop: number,
  secH: number,
  /** The band anchor's untransformed doc-space top and its height. */
  rectDocTop: number,
  rectH: number,
  viewportH: number,
): number {
  const r = traverseRate(band);
  if (r === 0) return xScenePx;
  if (band.ribbon) return xScenePx - band.dir * r * (secH / 2);
  const centreScroll = rectDocTop + rectH / 2 - viewportH / 2;
  const travelledAtCentre = Math.min(
    Math.max(centreScroll - secTop, 0),
    secH,
  );
  return xScenePx - band.dir * r * travelledAtCentre;
}

/**
 * THE RIBBON'S SHEAR, `μ` — the one number that makes a field which translates
 * diagonally sit STILL on the screen.
 *
 * A fixed point of the field moves `dir·R` px laterally and −1 px vertically
 * per scroll px, i.e. it travels a screen line of slope `1/R`. For the slice
 * of the field that is on frame to stay at ONE screen height, the field's
 * centreline must be pre-sheared along that same line. Writing the local
 * mapping as `y = v + μ·x` (x in band-width units, y in band-height units,
 * local +y = screen UP) and solving `d(screenY)/d(travelled) = 0`:
 *
 *     screenY = (docTop − secTop − s) + rectH/2 + dir²·(τ − secH/2) − yReg
 *     ⇒ μ = dir · (rectW / rectH) / R
 *
 * At `dir = −1`, R = 1, 1920×935 that is **−2.0535**, and the on-frame picture
 * is a 45° diagonal swath — the road you are travelling ALONG, not a
 * horizontal bar. GATE 3 IS THIS FUNCTION'S OWN PREDICTION: `screenY` of the
 * centreline at the frame's centre column is constant in `p`.
 *
 * ⚠ `rectH`, NEVER `size.height`. The band pin is `svh`, so on a mobile
 * browser with a collapsing URL bar the two differ by the toolbar height and
 * the shear would be wrong by that ratio for the whole act.
 */
export function bandFieldSlope(
  band: TraverseBandConfig,
  rectW: number,
  rectH: number,
): number {
  const r = traverseRate(band);
  if (!band.ribbon || r === 0 || rectH <= 0) return 0;
  return (band.dir * (rectW / Math.max(rectH, 1))) / r;
}

/**
 * THE RIBBON'S FIELD LENGTH, in band-width units — `Λ + 1`.
 *
 * `Λ = R·secH/rectW` is the lateral run in screen widths. The field has to
 * reach half a screen past each end of that run or the reader sees where the
 * net stops: half-length ≥ rectW/2 + run/2 ⇒ length ≥ rectW + run. Anything
 * longer is paid for in nodes and never seen.
 */
export function bandFieldLen(
  band: TraverseBandConfig,
  secH: number,
  rectW: number,
): number {
  const r = traverseRate(band);
  if (!band.ribbon || r === 0 || rectW <= 0) return 1;
  return (r * secH) / rectW + 1;
}

/**
 * THE RIBBON'S VERTICAL REGISTRATION, in CSS px, positive = lift the field UP.
 *
 * The shear above makes `screenY` constant; it does not make it `ih/2`. Solved
 * out, the constant is `docTop − secTop + rectH/2 − secH/2` — for a band
 * pinned near the top of a 5358 px act that is ≈ −2500 px, i.e. the net would
 * sit two and a half screens above the frame. This is the lateral re-centring's
 * exact vertical twin, and like it, it must be ONE definition shared by the
 * net's rig and the stone or the two drift apart by a constant.
 *
 * Zero when the band carries no ribbon: `rig.position.y` then stays at the
 * shipped 0 and nothing moves.
 */
export function bandRegisterPx(
  band: TraverseBandConfig,
  secTop: number,
  secH: number,
  rectDocTop: number,
  rectH: number,
  viewportH: number,
): number {
  if (!band.ribbon || traverseRate(band) === 0) return 0;
  return rectDocTop - secTop + rectH / 2 - secH / 2 - viewportH / 2;
}

// --- live tuning ------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

export function onTraverseConfigChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * The single write path — bumps `revision` and re-measures every consumer.
 *
 * TWO SPELLINGS OF THE BAND PATCH, DELIBERATELY. `{ problem: {…} }` is the
 * shipped shorthand; `{ bands: { problem: {…} } }` mirrors the config's own
 * shape and is the form the ROUND 12 rollback is written in. Accepting both
 * costs four lines and means a rollback typed from the handoff note cannot
 * silently no-op — which, for a lever whose whole job is to be usable in a
 * hurry with the owner watching, is the only acceptable failure mode.
 */
export function setTraverseConfig(
  patch: Partial<Omit<TraverseConfigShape, "bands" | "revision">> & {
    problem?: Partial<TraverseBandConfig>;
    bands?: Partial<Record<TraverseBandId, Partial<TraverseBandConfig>>>;
  },
): TraverseConfigShape {
  const { problem, bands, ...rest } = patch;
  Object.assign(traverseConfig, rest);
  if (problem) Object.assign(traverseConfig.bands.problem, problem);
  if (bands?.problem) Object.assign(traverseConfig.bands.problem, bands.problem);
  traverseConfig.revision++;
  listeners.forEach((fn) => fn());
  return traverseConfig;
}
