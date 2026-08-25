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

/**
 * ROUND 11 STAGE 1.5 — ONE EXTRA ISLAND. A band top expressed in viewport
 * heights RELATIVE TO THE PRIMARY BAND'S OWN TOP, plus the plexus master seed
 * that makes it a different constellation from the same code.
 *
 * Relative, not absolute, ON PURPOSE: the primary band is the shipped
 * `[data-lattice-anchor="problem"]` at `inset-y-0` of the rows stack, and its
 * position inside the section is layout-dependent (1.803 vh at 1280×720,
 * 1.554 at 1440×900, 1.419 at 768×1024 — measured, this build). Anchoring the
 * ladder to it makes the PITCH an authored viewport-invariant, which is what
 * both coverage gates are stated in:
 *
 *   presence of one band  = bandVh + 1        = 1.8597 vh   (invariant)
 *   no hole between two   ⇒ pitch ≤ 1.8597 vh
 *   never three on frame  ⇒ pitch > 0.9299 vh
 *
 * so every pitch must live in (0.930, 1.860] vh — and it does, at EVERY
 * viewport, because it is authored in vh and the band height is pinned in vh.
 */
export interface TraverseIsland {
  /** Plexus master seed (see PLEXUS_MASTER_SEED). */
  seed: number;
  /**
   * Manual override of the FITTED offset (vh from the primary band's top).
   * Leave undefined: the ladder is fitted to the MEASURED act every refresh
   * (see `fitTraverseLadder`), which is the only way the pitch bounds hold at
   * every viewport — the act is 6.02 vh at 1280×720 but 5.59 at 1440×900 and
   * 5.20 at 768×1024, and the primary band's own position moves with it.
   */
  dy?: number;
}

export interface TraverseIslandsConfig {
  /**
   * THE A/B. `false` un-places every extra island (CSS `display:none` ⇒ zero
   * rect ⇒ the island disposes its build and costs nothing), leaving Stage 1's
   * single band exactly as it shipped. One switch, no other code path.
   */
  enabled: boolean;
  /**
   * Re-centre each island's lateral on its OWN arrival (the storyboard's
   * strip-x compensation, §B3). MANDATORY for the sequence: an island 3.75 vh
   * down the act rides `xScenePx ≈ −1725 px` and would be culled off-frame.
   * `false` restores Stage 1's raw `xScenePx` on every island — useful only as
   * the demonstration of WHY the compensation exists.
   */
  compensate: boolean;
  /**
   * How far ABOVE the primary band the first extra sits, in vh. It is the one
   * placement number the fit does not derive, because nothing above the
   * primary band constrains it: it only has to reach the act's start
   * (top ≤ 1.0 vh) without opening a hole (pitch ≤ bandVh + 1). Both are
   * clamped in `fitTraverseLadder`.
   */
  leadVh: number;
  /**
   * Pin the LAST extra's BOTTOM to the section's bottom.
   *
   * ⚠ THIS IS A D2 CONSTRAINT, NOT A TUNING PREFERENCE. Coverage of the act's
   * final sample and "no net over `#work`" are the SAME condition from
   * opposite sides: the last band's bottom must be at the section's bottom —
   * one pixel short and the tail goes black, one pixel long and Act I's world
   * bleeds into the interlude the storyboard closes (§A, D2). Pinning it is
   * the only placement that satisfies both, and it has to be re-derived per
   * viewport because the act's height in vh is not a constant.
   */
  tailPin: boolean;
  /**
   * The extras, in DOM/index order: ONE above the primary band, then the rest
   * spread between the primary band and the pinned tail. The PRIMARY band is
   * not in this list — it is the shipped anchor at offset 0, and it keeps the
   * shipped seed, the crystal clearance well and the stone. Length is capped
   * by the section's authored anchor count (MAX_TRAVERSE_ISLANDS).
   */
  extras: TraverseIsland[];
}

/** The fitted ladder, plus the two bounds it was fitted against (QA gate 2). */
export interface TraverseLadderFit {
  /** Offsets in vh from the primary band's top, DOM/index order. */
  offsets: number[];
  /** Band tops in vh from the SECTION's top, ascending, primary included. */
  tops: number[];
  /** Pitches between consecutive tops, in vh. */
  pitches: number[];
  /** `bandVh + 1` — a pitch above this opens a hole. */
  maxPitch: number;
  /** `(bandVh + 1)/2` — a pitch below this puts THREE bands on frame. */
  minPitch: number;
  ok: boolean;
}

/**
 * FIT THE LADDER TO THE MEASURED ACT. Pure arithmetic on four measured vh
 * quantities — no DOM, no `three`, no allocation beyond the returned arrays
 * (it runs on refresh, never per frame).
 *
 * The invariants, and they are the gates:
 *   presence of one band = bandVh + 1                 (viewport-invariant)
 *   no hole between two  ⇒ pitch ≤ bandVh + 1
 *   never three on frame ⇒ pitch > (bandVh + 1)/2
 *   act START covered    ⇒ first top ≤ 1.0
 *   act END covered      ⇒ last top ≥ runwayVh − bandVh
 *   world closed at #work⇒ last top ≤ runwayVh − bandVh      ← same line
 */
export function fitTraverseLadder(
  /** Primary band top, in vh from the section top. */
  bandY: number,
  /** Primary band height, in vh (the pinned 0.8597 by default). */
  bandVh: number,
  /** The act's height, in vh. */
  runwayVh: number,
  extras: TraverseIsland[],
  leadVh: number,
  tailPin: boolean,
): TraverseLadderFit {
  const maxPitch = bandVh + 1;
  const minPitch = maxPitch / 2;
  const n = extras.length;
  const offsets: number[] = [];
  if (n > 0) {
    // (1) the lead band: high enough to cover the act's start, close enough
    //     not to open a hole above the primary.
    let tFirst = bandY - leadVh;
    if (tFirst > 0.98) tFirst = 0.98;
    if (tFirst < bandY - maxPitch) tFirst = bandY - maxPitch;
    offsets.push(tFirst - bandY);
    // (2) the tail, then everything between it and the primary, evenly.
    const after = n - 1;
    if (after > 0) {
      let tLast = tailPin ? runwayVh - bandVh : bandY + after * leadVh;
      // Never let the fit produce a pitch that puts three bands on frame; an
      // overhang past the seam is the lesser of the two failures and it is
      // reported rather than hidden (`ok`).
      if (tLast < bandY + after * minPitch) tLast = bandY + after * minPitch;
      if (tLast > bandY + after * maxPitch) tLast = bandY + after * maxPitch;
      const step = (tLast - bandY) / after;
      for (let i = 1; i <= after; i++) offsets.push(step * i);
    }
  }
  const tops = [bandY, ...offsets.map((d) => bandY + d)].sort((a, b) => a - b);
  const pitches: number[] = [];
  for (let i = 1; i < tops.length; i++) pitches.push(tops[i] - tops[i - 1]);
  const ok =
    tops.length > 0 &&
    tops[0] <= 1.0 + 1e-6 &&
    tops[tops.length - 1] >= runwayVh - bandVh - 1e-6 &&
    pitches.every((p) => p > minPitch - 1e-6 && p <= maxPitch + 1e-6);
  return { offsets, tops, pitches, maxPitch, minPitch, ok };
}

/** How many extra anchors `problem-section.tsx` authors. `extras` longer than
 * this is ignored — the DOM is the ceiling, not this array. */
export const MAX_TRAVERSE_ISLANDS = 4;

export interface TraverseConfigShape {
  bands: Record<TraverseBandId, TraverseBandConfig>;
  /** ROUND 11 STAGE 1.5 — the island sequence (Act I only). */
  islands: TraverseIslandsConfig;
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
  // ── THE ISLAND SEQUENCE ───────────────────────────────────────────────
  // Measured at 1280×720 on this build: act 4335 px (6.020 vh), primary band
  // top 1298 px (1.803 vh), band height 619 px (0.8597 vh). The fit then puts
  // the five band tops at, in vh from the section top:
  //
  //     0.600 · 1.803 (primary) · 2.922 · 4.041 · 5.161
  //     pitch  1.203      1.119     1.119    1.119
  //
  // against maxPitch 1.8597 (a hole) and minPitch 0.9299 (three on frame).
  // The last top is `runwayVh − bandVh` exactly, so the band's bottom edge
  // and the section's bottom edge are the same line: the act is covered to
  // its final sample AND the net never reaches `#work`.
  //
  // ⚠ WHY THIS IS NOT THE STORYBOARD'S OWN FIVE GAP CENTRES. §B3 places its
  // wordless gaps at section-y 285/1236/2001/2766/3667 of a 4392 px act, and
  // the last of those assumes beat M5 (THE WALL + the three callouts,
  // 4089→4392) carries COPY. The shipped section has no M5: its last 1116 px
  // are the runway tail, and the census proves it — that tail is the single
  // longest "nothing at all" run in the whole act. A ladder that stopped at
  // the G4 centre would leave it black. The fitted tops sit within 0.12 vh of
  // §B3's first two gaps and redistribute the rest across G2/G3/G4 + the
  // tail; the pitch (1.12 vh) is inside §B3's own 1.06–1.32 vh range.
  //
  // Seeds: 11.37 is the shipped Problem constellation and stays on the
  // primary band (the stone's band — the only one that keeps the crystal
  // clearance well). The four below are arbitrary, well-separated master
  // seeds; their structural fingerprints are reported per island by
  // `__sersanNeuralLattice_problem-i<N>.plexus`.
  islands: {
    enabled: true,
    compensate: true,
    leadVh: 1.203,
    tailPin: true,
    extras: [
      { seed: 3.71 },
      { seed: 23.09 },
      { seed: 41.53 },
      { seed: 68.27 },
    ],
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

// --- live tuning ------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

export function onTraverseConfigChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** The single write path — bumps `revision` and re-measures every consumer.
 * `islands` is MERGED, not replaced, so `set({ islands: { enabled: false } })`
 * cannot silently drop the authored ladder. */
export function setTraverseConfig(
  patch: Partial<
    Omit<TraverseConfigShape, "bands" | "revision" | "islands">
  > & {
    problem?: Partial<TraverseBandConfig>;
    islands?: Partial<TraverseIslandsConfig>;
  },
): TraverseConfigShape {
  const { problem, islands, ...rest } = patch;
  Object.assign(traverseConfig, rest);
  if (problem) Object.assign(traverseConfig.bands.problem, problem);
  if (islands) Object.assign(traverseConfig.islands, islands);
  traverseConfig.revision++;
  listeners.forEach((fn) => fn());
  return traverseConfig;
}

/** The ladder, resolved and clamped to what the DOM actually authors. */
export function traverseIslands(): TraverseIsland[] {
  const cfg = traverseConfig.islands;
  if (!cfg.enabled) return [];
  return cfg.extras.slice(0, MAX_TRAVERSE_ISLANDS);
}
