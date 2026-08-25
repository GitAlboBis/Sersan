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
      angleDeg: 23.61,
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
      // 619 / 720 — today's band on the 1280×720 reference, made viewport-
      // relative so it is the same band at every viewport and every runway.
      bandVh: 0.8597,
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
 * ⚠ STAGE 2 REPLACES THE ARGUMENT, NOT THE SHAPE. Under the ribbon the
 * re-centring becomes the act's own midpoint (`secH/2`) because the band is on
 * frame for the whole act. At today's geometry that is NOT the same number —
 * measured 1920×935: the anchor-centred origin is −639.67 px and `secH/2`
 * would be −1170.87 px, i.e. the stone would jump 531 px — so the swap belongs
 * with the ribbon, not here.
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
  const centreScroll = rectDocTop + rectH / 2 - viewportH / 2;
  const travelledAtCentre = Math.min(
    Math.max(centreScroll - secTop, 0),
    secH,
  );
  return xScenePx - band.dir * r * travelledAtCentre;
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

/** The single write path — bumps `revision` and re-measures every consumer. */
export function setTraverseConfig(
  patch: Partial<Omit<TraverseConfigShape, "bands" | "revision">> & {
    problem?: Partial<TraverseBandConfig>;
  },
): TraverseConfigShape {
  const { problem, ...rest } = patch;
  Object.assign(traverseConfig, rest);
  if (problem) Object.assign(traverseConfig.bands.problem, problem);
  traverseConfig.revision++;
  listeners.forEach((fn) => fn());
  return traverseConfig;
}
