/**
 * traverseConfig — THE DIAGONAL TRAVERSE, Stage 1 (ROUND 11, `#problem` only).
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
      // ⚠⚠ THE COMPOSITION HOLE THIS OPENS — measured, Chrome/CDP, 1280×720.
      // The band is 619 px tall (pinned) inside a 4335 px act, so the net is
      // on frame for 1339 px = 30.9 % of the run. Census of the whole act by
      // what is on screen:  net+copy 18.8 % · copy only 29.1 % · net only
      // 12.1 % · **NOTHING AT ALL 40.0 %** (three runs of 228 / 392 / 1115 px;
      // the last is 1.55 viewports of black immediately before `#production`).
      // Mechanism §4.4 priced exactly this as the cost of shape (b) ("the net
      // is on frame for only ~2 of the 6.1 viewports") and the storyboard §B3
      // assumes the opposite — its G1–G4 gaps are "wordless NET", not wordless
      // void. Levers, in the order that costs least: `gapVh = 0` restores
      // today's document px-for-px and puts the net behind the whole act;
      // §4.4(c) (decouple the group scale from the rect) keeps the runway AND
      // the net. Both are owner-visible. NOT RESOLVED IN STAGE 1.
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
