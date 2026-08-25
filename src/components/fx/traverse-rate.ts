/**
 * traverse-rate — THE WINDOWED LATERAL RATE (owner decision D11), in one pure,
 * stateless, allocation-free module. Kept OUT of the hook on purpose: a
 * reviewer must be able to check the continuity proof against ~60 lines rather
 * than ~300 (mechanism dossier §9).
 *
 * ── THE LAW (storyboard §B2 — the spec; the mechanism's |u|-based
 *    reconstruction in §2B.5 is the CHECK, not the authority) ───────────────
 *
 *   m        = bandInset · ih                    (0.12·h ⇒ 86 px @720)
 *   band     = [ headerH + m , ih − m ]
 *   overlap  = max(0, min(blockBottom, B1) − max(blockTop, B0))
 *   coverage = clamp( overlap / min(blockH, B1−B0), 0, 1 )
 *   V̂        = smoothstep(0, 1, coverage)        = 3c² − 2c³
 *   α(y)     = α_fast + (α_slow − α_fast) · V̂
 *
 * ── TRAP 1: THE RATE IS INTEGRATED, NOT MULTIPLIED ────────────────────────
 * `X_block = α(y)·X_scene(p)` is catastrophically wrong: differentiating it
 * leaves `X_scene·(dα/dy)·(dy/ds)`, which at mid-act (`X_scene ≈ 960 px`) and a
 * smoothstep over a ~100 px ramp is **36 px of lateral per scroll px — an 80×
 * rate spike**, arriving exactly as the block enters the reading window. The
 * block would be flung sideways. So `x` is the CLOSED-FORM ANTIDERIVATIVE of
 * the rate, which is available because the block's viewport-space top `y` is
 * affine in scroll (`y = docTop − scrollY`, `dy/ds = −1`):
 *
 *   A(y) = ∫_y^{y_c} α(t) dt = α_slow·(y_c − y) + Δ·[ (y_c − y) − Ĝ(y) ]
 *   Ĝ(y) = ∫_y^{y_c} V̂(t) dt = F(y_c) − F(y)          Δ = α_fast − α_slow
 *   x    = dir · R · A(y)                              R = tan(angle)
 *
 * Stateless and teleport-safe: `PageDown`, `End`, an anchor jump or browser
 * scroll restoration all land at the right `x` with no integrator to re-wind.
 *
 * ── TRAP 2: C¹ IS MANDATORY (handoff trap 11) ─────────────────────────────
 * `coverage` is piecewise-LINEAR and therefore has corners. `smoothstep` has
 * ZERO derivative at both ends, so composing it kills those corners: V̂ is C¹
 * even though coverage is only C⁰, hence α is C¹ and `x = ∫α` is **C²** —
 * continuous position, velocity AND acceleration, with zero acceleration at
 * every join. **NEVER put a `min()` or a hard clamp on the rate**; the project
 * has already shipped a flat-topped wavefront that way once. The `tanh` cap
 * below is applied to the SLOW COMPONENT ONLY (it would otherwise eat the
 * swing D11 bought) and to POSITION, not to rate, so it is C^∞ in `x` and
 * preserves C².
 *
 * There is no `|u|` in this construction and therefore no corner at the
 * viewport centre: the window is naturally two-sided through the coverage
 * trapezoid, and `y_c` — the plateau centre — is the exact midpoint of the
 * block's on-screen life, so the excursion is symmetric by construction.
 *
 * ── THE STRIP-X COMPENSATION IS STRUCTURAL ────────────────────────────────
 * `A(y_c) = 0`, so every block sits at its AUTHORED DESIGN LANE at the moment
 * it becomes readable, and everything either side of that is the swing
 * (storyboard §B3). No per-block offset table is needed.
 */

export interface RateWindow {
  /** Ramp length = min(blockH, bandH). */
  d: number;
  /** Coverage breakpoints in viewport-space block-top `y`, ASCENDING. */
  e0: number;
  e1: number;
  e2: number;
  e3: number;
  /** Plateau centre — the reference at which `A = 0`. */
  yc: number;
  /** `F(yc)`, precomputed. */
  fyc: number;
  /** α in the reading plateau. */
  alphaRead: number;
  /** α at the frame edges (common to every layer). */
  alphaEdge: number;
  /**
   * `tanh` ceiling on the SLOW component, in CSS px. 0 = uncapped.
   *
   * ⚠ IT IS A CEILING ON |x_slow|, NOT ON THE DRIFT. `x_slow = r·α_read·(y_c −
   * y)` is CENTRED and antisymmetric about `y_c` (see `rateAt`), so a block
   * that lives out its whole on-screen life swings from `+capPx·tanh(…)` to
   * `−capPx·tanh(…)`: peak-to-peak is **`2·capPx·tanh(…)`**. A caller that
   * wants "this block may drift by at most its own height" must therefore pass
   * `h / 2`, never `h`.
   */
  capPx: number;
}

export interface RateSample {
  /** Window value V̂ ∈ [0,1] — drives rate, opacity AND the mask lane. */
  vhat: number;
  /** Instantaneous α at this position (reporting / QA only). */
  alpha: number;
  /** The applied lateral offset magnitude in CSS px, unsigned by `dir`. */
  x: number;
}

/** A zeroed sample, for callers that want to hoist their own scratch. */
export function makeRateSample(): RateSample {
  return { vhat: 0, alpha: 0, x: 0 };
}

/**
 * The module's own fallback scratch, for the dev-handle / QA callers that are
 * not on the frame path. `rateAt` NEVER allocates: `apply()` runs every frame
 * over every block, so a returned object literal would be ~500 short-lived
 * allocations per second against a file whose header promises zero. Frame-path
 * callers MUST pass their own `out` — sharing this one across two live values
 * would alias them.
 */
const SCRATCH = makeRateSample();

/** smoothstep(0,1,c) — the C¹ maker. */
function smooth01(c: number): number {
  if (c <= 0) return 0;
  if (c >= 1) return 1;
  return c * c * (3 - 2 * c);
}

/** ∫ smoothstep dc = c³ − c⁴/2. S(0)=0, S(1)=0.5. */
function sInt(c: number): number {
  const c3 = c * c * c;
  return c3 - (c3 * c) / 2;
}

/**
 * Builds a block's window from its own height and the live viewport. Pure —
 * call it on MEASURE, never per frame.
 */
export function buildRateWindow(
  blockH: number,
  headerPx: number,
  viewportH: number,
  bandInset: number,
  alphaRead: number,
  alphaEdge: number,
  capPx: number,
): RateWindow {
  const bh = Math.max(blockH, 1);
  const m = bandInset * viewportH;
  const b0 = headerPx + m;
  const b1 = Math.max(viewportH - m, b0 + 1);
  const bandH = b1 - b0;
  const d = Math.max(Math.min(bh, bandH), 1);
  // The block is fully covering the band between these two, whichever way
  // round the two heights are (`|bandH − bh|` long, possibly zero).
  const p1 = Math.max(b0, b1 - bh);
  const p0 = Math.min(b0, b1 - bh);
  return {
    d,
    e0: p0 - d,
    e1: p0,
    e2: p1,
    e3: b1,
    // = (headerH + ih − bh)/2: the exact midpoint of the block's on-screen
    // life, which is what makes the excursion symmetric.
    yc: (p0 + p1) / 2,
    fyc: d / 2 + (p1 - p0) / 2,
    alphaRead,
    alphaEdge,
    capPx: capPx > 0 ? capPx : 0,
  };
}

/** Coverage → V̂ at a block-top position `y`. */
export function windowAt(w: RateWindow, y: number): number {
  if (y >= w.e3 || y <= w.e0) return 0;
  if (y >= w.e2) return smooth01((w.e3 - y) / w.d);
  if (y >= w.e1) return 1;
  return smooth01((y - w.e0) / w.d);
}

/** `F(y) = ∫_{e0}^{y} V̂ dt` — the closed-form antiderivative of the window. */
function fAt(w: RateWindow, y: number): number {
  if (y <= w.e0) return 0;
  const plateau = w.e2 - w.e1;
  if (y >= w.e3) return w.d + plateau;
  if (y >= w.e2) return w.d + plateau - w.d * sInt((w.e3 - y) / w.d);
  if (y >= w.e1) return w.d / 2 + (y - w.e1);
  return w.d * sInt((y - w.e0) / w.d);
}

/**
 * The shipped offset. `y` is the block's top in viewport coordinates
 * (`docTop − scrollY`), `r` is `tan(angle)` in lateral px per scroll px.
 * Returns the UNSIGNED offset; the caller applies `dir`.
 */
export function rateAt(
  w: RateWindow,
  y: number,
  r: number,
  out: RateSample = SCRATCH,
): RateSample {
  const vhat = windowAt(w, y);
  out.vhat = vhat;
  out.alpha = w.alphaEdge + (w.alphaRead - w.alphaEdge) * vhat;
  if (r === 0) {
    out.x = 0;
    return out;
  }
  const dy = w.yc - y;
  const gHat = w.fyc - fAt(w, y);
  const xSlow = r * w.alphaRead * dy;
  const xFast = r * (w.alphaEdge - w.alphaRead) * (dy - gHat);
  // ⚠ The cap rides the SLOW component only: applied to the whole offset it
  // would eat the very swing D11 bought. `tanh` is C^∞ so `x` stays C².
  const capped = w.capPx > 0 ? w.capPx * Math.tanh(xSlow / w.capPx) : xSlow;
  out.x = xFast + capped;
  return out;
}

/**
 * The block's TOTAL on-screen lateral excursion, in CSS px — QA gate 3.
 * Measured over the block's visible life as the storyboard defines it: from
 * its top touching the viewport bottom to its bottom touching the header line
 * (`y ∈ [headerH − bh, ih]`), which is symmetric about `yc`.
 */
export function excursionOf(
  w: RateWindow,
  r: number,
  headerPx: number,
  viewportH: number,
  blockH: number,
): number {
  const yLo = headerPx - blockH;
  const yHi = viewportH;
  // Read each `x` into a local BEFORE the next call: `rateAt` writes into a
  // shared scratch, so holding two returned references would alias them.
  const xLo = rateAt(w, yLo, r).x;
  const xHi = rateAt(w, yHi, r).x;
  return Math.abs(xLo - xHi);
}

/**
 * THE PLATEAU DRIFT, in CSS px — QA gate 3, and the number the storyboard's
 * "em/line" table is actually about.
 *
 * `excursionOf` measures the block's WHOLE on-screen swing, most of which
 * happens at α_edge while the block is transparent (§B2.4). What the reader
 * sees moving is the part travelled while the block is fully opaque and fully
 * legible — the coverage plateau `[e1, e2]`, where V̂ ≡ 1, α ≡ α_read and (as
 * `rateAt` shows) `dy − Ĝ = 0`, so the fast component vanishes identically and
 * the drift is the CAPPED SLOW COMPONENT ALONE:
 *
 *   plateauDrift = |x(e1) − x(e2)| = 2·capPx·tanh( r·α_read·(e2 − e1) / (2·capPx) )
 *
 * which is why `capPx = h/2` — and only `h/2` — buys the authored "at most its
 * own height" ceiling, at every viewport and every angle, since `tanh < 1`.
 * Uncapped it is simply `r·α_read·(e2 − e1)`.
 *
 * Pure; measure-time / QA only (it calls `rateAt` twice against the shared
 * scratch, so each `x` is read into a local before the next call).
 */
export function plateauDriftOf(w: RateWindow, r: number): number {
  const x1 = rateAt(w, w.e1, r).x;
  const x2 = rateAt(w, w.e2, r).x;
  return Math.abs(x1 - x2);
}
