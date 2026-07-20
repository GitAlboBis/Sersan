/**
 * Founder portraits → particle home positions + per-particle colour, z-relief
 * and INK (the tonal weight that drives disc size).
 *
 * MODEL (rewrite 2026-07-20, after the weighted-pick sampler was rejected).
 * The previous sampler drew `count` weighted random picks WITH REPLACEMENT over
 * the candidate cells. Measured on the shipped Michele headshot it spent 63% of
 * the particle budget stacking duplicates while leaving 11% of the face with no
 * particle at all — the blocky voids the boss rejected. Its second defect was a
 * per-pixel `lumCeil`/`neutralSat` backdrop test, which cannot tell "white wall"
 * from "lit scalp" or "white shirt" and so punched holes through the brightest
 * parts of the SUBJECT.
 *
 * Both defects are gone because the model changed, following
 * brunoimbrizi/interactive-particles (`.refs/interactive-particles`):
 *
 *   - ONE PARTICLE PER GRID CELL, on a regular grid. Coverage is uniform by
 *     construction: no holes, no duplicates, no rng anywhere (the sampler is
 *     fully deterministic — there is no seed).
 *   - TONE IS CARRIED BY PARTICLE SIZE, NOT BY PARTICLE COUNT. The reference
 *     does `psize *= max(grey, 0.2)`; we invert it for a light backdrop and
 *     scale size by INK — the luma-weighted distance from the backdrop colour.
 *   - THE BACKDROP IS REMOVED SPATIALLY, NEVER CHROMATICALLY. A border-seeded
 *     flood fill (see BG_FILL_TOL) marks the wall; the ink curve itself stays
 *     gentle. No per-pixel colour/luminance test is allowed to decide what is
 *     backdrop — see the flood-fill comment for why every one of them fails.
 *   - SHARED GRID / SHARED CELL LIST. Both portraits are sampled onto the SAME
 *     grid and one cell list is built from the union of their ink, so output
 *     index `j` is the same cell in BOTH images. That gives A↔B index pairing
 *     for free and replaces the old radial-sector sort entirely: the morph
 *     reads as the portrait re-forming in place.
 *
 * Backdrop colour is the per-channel MEDIAN of the two TOP corner patches —
 * median (not mean) to shrug off a stray dark pixel, top corners only because
 * the subject's shoulders reach the bottom ones.
 *
 * z-RELIEF: per-particle z = (lum−0.5)·depth + a centre bulge, so brighter
 * (frontal, lit) pixels push toward the camera and the cloud reads as a 3D bust
 * once the render depth-tests it.
 *
 * sRGB→LINEAR: every colour is converted per-channel (the exact three.js
 * SRGBToLinear curve). MANDATORY — the render is toneMapped:false, so raw sRGB
 * values would render dark/oversaturated.
 *
 * Returned coordinates/relief are in GRID px (the caller scales grid-px → world
 * to fit the [data-founder-stage] rect, exactly as HeroTextParticles scales
 * text px → world). xy is y-up, from the grid centre.
 */

export interface PortraitPairSpec {
  /** Shared offscreen grid width. One particle per kept cell — the grid area
   * (not a `count`) is what sets the instance count. */
  gridW: number;
  /** Shared offscreen grid height (portrait, ~5:7). */
  gridH: number;
  /** z relief depth in grid-px: z = (lum−0.5)·depth + centre bulge. */
  depth: number;
  /** Extra forward push at the face centre (grid-px), falling off radially. */
  centerZBias: number;
  /** Ink contrast gain applied to the backdrop distance before the curve. */
  inkGain: number;
  /** Ink floor — distance below this is remapped to 0 (kills sensor noise). */
  inkFloor: number;
  /** Ink gamma (<1 lifts the mid-tones so cheeks/shirt keep some weight). */
  inkGamma: number;
  /** Normalized y at which the vertical dissolve starts (bust → darkness). */
  fadeStart: number;
  /** Normalized y span over which the dissolve completes. */
  fadeSpan: number;
  /** Union-ink above which a cell joins the SHARED cell list. */
  inkCut: number;
  /** Ink above which a cell counts toward the measured face extent. Cells
   * below it are the near-invisible fringe, which would otherwise inflate the
   * extent and render the face too small in the stage. */
  extentInk: number;
  /** Tier ceiling on the instance count (uniform stride subsample if over). */
  maxCount: number;
}

/** Per-image, per-particle outputs. Index `j` is the SAME shared cell in both
 * images of a pair, which is what pairs the A→B morph. */
export interface PortraitPoints {
  /** count×2 floats: x,y GRID px from the grid centre, y-up. */
  xy: Float32Array;
  /** count×3 floats: LINEAR rgb (sRGB→linear converted). */
  rgb: Float32Array;
  /** count floats: z relief in GRID px (same space as xy). */
  z: Float32Array;
  /** count floats in 0..1: tonal weight. Drives particle size and alpha. */
  ink: Float32Array;
  /** Half extent (grid px, from centre) of |x| over the cells with
   * ink > `extentInk` — a robust (~99th-percentile) measure of the sampled
   * FACE width; the caller fits it to the stage rect so the cloud FILLS (not
   * overflows) the stage. */
  halfExtentX: number;
  /** Half extent (grid px) of |y| over the same cells — the face height. */
  halfExtentY: number;
}

export interface PortraitPair {
  a: PortraitPoints;
  b: PortraitPoints;
  /** Final instance count — the caller's particle count FOLLOWS this. */
  count: number;
  /** Shared cells found, BEFORE any stride subsample (the calibration number). */
  sharedCells: number;
  /** Subsample stride used to reach `count` (1 = none). */
  stride: number;
  gridW: number;
  gridH: number;
}

/** Backdrop-probe patch size (px) taken from each TOP corner. */
const CORNER_PATCH = 14;
/** Normalized y of the face centre — the centre-bulge origin (faces sit high). */
const FACE_CY = 0.44;
/** Normalized radius over which the centre bulge falls to 0. */
const BULGE_RADIUS = 0.75;
/** Sub-cell jitter amplitude in CELL units (breaks the grid without blurring). */
const JITTER = 0.9;
/** Colour-distance tolerance admitted by the backdrop flood fill (same
 * luma-weighted metric as the ink). Wide enough to walk the wall's own
 * vignetting / shadow-side falloff / JPEG blocking, far too tight to step
 * across the shoulder shadow or a hairline. */
const BG_FILL_TOL = 0.055;
/** Normalized y below which the flood fill may not travel (see the fill). */
const BG_FILL_ROW_LIMIT = 0.62;

/** Exact three.js sRGB→linear transfer (ColorManagement.SRGBToLinear). */
function srgbToLinear(c: number): number {
  return c < 0.04045
    ? c * 0.0773993808
    : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
}

/** Deterministic scalar hash → [0,1). Fed the CELL index (never the particle
 * index) so A and B jitter identically and a particle cannot twitch at rest. */
function hash01(n: number): number {
  const s = Math.sin(n) * 43758.5453123;
  return s - Math.floor(s);
}

/** Robust half extent of |component| (grid px, from centre) — a high percentile
 * so a few stray fringe cells don't inflate it. */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 1;
  const a = Float64Array.from(values).sort();
  const idx = Math.min(a.length - 1, Math.max(0, Math.floor(a.length * p)));
  return Math.max(a[idx], 1e-3);
}

/** Full-grid rasterization of one portrait: normalized rgb + luminance + ink. */
interface GridRead {
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  lum: Float32Array;
  ink: Float32Array;
}

/**
 * Cover-crop `image` to the grid aspect (centred), rasterize it, then derive
 * per-cell ink = luma-weighted distance from the measured backdrop colour,
 * contrast-curved and vertically dissolved toward the bottom.
 */
function readGrid(
  image: HTMLImageElement,
  spec: PortraitPairSpec,
): GridRead | null {
  const { gridW, gridH } = spec;
  const srcW = image.naturalWidth;
  const srcH = image.naturalHeight;
  if (srcW <= 0 || srcH <= 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  // Cover-crop the source to the grid's aspect, centred on both axes.
  const targetAspect = gridW / gridH;
  const srcAspect = srcW / srcH;
  let cropW: number;
  let cropH: number;
  if (srcAspect > targetAspect) {
    cropH = srcH;
    cropW = srcH * targetAspect;
  } else {
    cropW = srcW;
    cropH = srcW / targetAspect;
  }
  const sx = (srcW - cropW) / 2;
  const sy = (srcH - cropH) / 2;
  ctx.drawImage(image, sx, sy, cropW, cropH, 0, 0, gridW, gridH);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, gridW, gridH).data;
  } catch {
    // Tainted canvas (should not happen for same-origin static assets).
    return null;
  }

  const cells = gridW * gridH;
  const r = new Float32Array(cells);
  const g = new Float32Array(cells);
  const b = new Float32Array(cells);
  const lum = new Float32Array(cells);
  for (let i = 0; i < cells; i++) {
    const o = i * 4;
    const rn = data[o] / 255;
    const gn = data[o + 1] / 255;
    const bn = data[o + 2] / 255;
    r[i] = rn;
    g[i] = gn;
    b[i] = bn;
    lum[i] = 0.299 * rn + 0.587 * gn + 0.114 * bn;
  }

  // --- Backdrop colour: per-channel MEDIAN of the two TOP corner patches -----
  // Median, not mean: robust to a stray dark pixel. Top corners only: the
  // subject's shoulders reach the bottom corners.
  const patch = Math.min(CORNER_PATCH, gridW >> 1, gridH);
  const cr: number[] = [];
  const cg: number[] = [];
  const cb: number[] = [];
  for (let y = 0; y < patch; y++) {
    for (let x = 0; x < patch; x++) {
      const left = y * gridW + x;
      const right = y * gridW + (gridW - 1 - x);
      cr.push(r[left], r[right]);
      cg.push(g[left], g[right]);
      cb.push(b[left], b[right]);
    }
  }
  const median = (a: number[]) => {
    a.sort((p, q) => p - q);
    return a[a.length >> 1];
  };
  const bgR = median(cr);
  const bgG = median(cg);
  const bgB = median(cb);

  // --- Per-cell colour distance from the backdrop (the one shared metric) ----
  const dist = new Float32Array(cells);
  for (let i = 0; i < cells; i++) {
    const dr = r[i] - bgR;
    const dg = g[i] - bgG;
    const db = b[i] - bgB;
    dist[i] = Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
  }

  // --- Backdrop mask: BORDER-SEEDED FLOOD FILL (spatial, not chromatic) ------
  // WHY NO PER-PIXEL COLOUR TEST CAN WORK HERE — do not reintroduce one. A lit
  // bald scalp and a white shirt are chromatically THE SAME as a white studio
  // wall, so every threshold that deletes the wall (the old `lumCeil`/
  // `neutralSat` test, then the `inkGateLo`/`inkGateHi` noise gate) also punches
  // a hole through the top of the head and hollows the bust. Colour cannot
  // separate them; POSITION can. The wall is exactly the region CONNECTED TO THE
  // IMAGE BORDER: a scalp is enclosed by hair/ears/face and a shirt by the
  // shoulders, so neither is reachable from the border without crossing an edge
  // far wider than BG_FILL_TOL.
  //
  // ROW LIMIT — LOAD-BEARING, DO NOT REMOVE. The shirt touches the BOTTOM
  // border, and a white shirt against a white wall is separated only by a soft
  // shoulder shadow. Seeding from the bottom, or letting the fill run down past
  // the shoulders, leaks into the shirt and deletes the bust. Below the limit
  // the vertical dissolve already fades everything out, so the wall down there
  // costs nothing.
  //
  // Explicit stack, never recursion: the grid is ~117k cells.
  const bgMask = new Uint8Array(cells);
  const rowLimit = Math.max(1, Math.floor(gridH * BG_FILL_ROW_LIMIT));
  const stack = new Int32Array(cells);
  let sp = 0;
  const admit = (i: number) => {
    if (bgMask[i] === 0 && dist[i] < BG_FILL_TOL) {
      bgMask[i] = 1;
      stack[sp++] = i;
    }
  };
  // Seeds: the entire TOP row, plus the left/right columns above the row limit.
  for (let x = 0; x < gridW; x++) admit(x);
  for (let y = 1; y < rowLimit; y++) {
    admit(y * gridW);
    admit(y * gridW + gridW - 1);
  }
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % gridW;
    const y = (i / gridW) | 0;
    if (x > 0) admit(i - 1);
    if (x < gridW - 1) admit(i + 1);
    if (y > 0) admit(i - gridW);
    if (y + 1 < rowLimit) admit(i + gridW);
  }

  // --- Ink: luma-weighted distance from the backdrop, curved + dissolved -----
  const ink = new Float32Array(cells);
  const invFloor = 1 / Math.max(1 - spec.inkFloor, 1e-4);
  for (let y = 0; y < gridH; y++) {
    const ny = y / gridH;
    // Vertical dissolve so the bust emerges from darkness instead of reading
    // as a cut-out. smoothstep so the fringe has no hard edge.
    const f = Math.min(
      1,
      Math.max(0, 1 - (ny - spec.fadeStart) / Math.max(spec.fadeSpan, 1e-4)),
    );
    const fade = f * f * (3 - 2 * f);
    if (fade <= 0) continue;
    const row = y * gridW;
    for (let x = 0; x < gridW; x++) {
      const i = row + x;
      // Flood-filled backdrop is gone unconditionally — the mask, not the
      // curve, owns the wall. That is what lets the curve below stay GENTLE:
      // every low-end gate we ever put here to kill the wall also dimmed the
      // subject's own mid-band (facial detail) or deleted a lit scalp.
      if (bgMask[i] === 1) continue;
      const v = Math.min(
        1,
        Math.max(0, (dist[i] * spec.inkGain - spec.inkFloor) * invFloor),
      );
      ink[i] = Math.pow(v, spec.inkGamma) * fade;
    }
  }

  return { r, g, b, lum, ink };
}

/** Emit the per-particle arrays for one image over the SHARED cell list. */
function emit(
  read: GridRead,
  cells: Int32Array,
  spec: PortraitPairSpec,
): PortraitPoints {
  const { gridW, gridH } = spec;
  const count = cells.length;
  const xy = new Float32Array(count * 2);
  const rgb = new Float32Array(count * 3);
  const z = new Float32Array(count);
  const ink = new Float32Array(count);
  const cx = gridW / 2;
  const cy = gridH / 2;
  // Aspect scale so the centre bulge is a true circle in grid space.
  const ax = gridW / gridH;
  const extX: number[] = [];
  const extY: number[] = [];

  for (let j = 0; j < count; j++) {
    const i = cells[j];
    const gx = i % gridW;
    const gy = (i / gridW) | 0;
    // Stable sub-cell jitter, hashed from the CELL index so A and B agree.
    const jx = (hash01(i * 12.9898) - 0.5) * JITTER;
    const jy = (hash01(i * 78.233) - 0.5) * JITTER;
    const px = gx + 0.5 + jx - cx;
    const py = -(gy + 0.5 + jy - cy); // y-up
    xy[j * 2] = px;
    xy[j * 2 + 1] = py;
    rgb[j * 3] = srgbToLinear(read.r[i]);
    rgb[j * 3 + 1] = srgbToLinear(read.g[i]);
    rgb[j * 3 + 2] = srgbToLinear(read.b[i]);

    // Relief: brighter → forward, plus a smooth centre bulge for the bust.
    const nx = (gx / gridW - 0.5) * ax;
    const ny = gy / gridH - FACE_CY;
    const rad = Math.sqrt(nx * nx + ny * ny) / BULGE_RADIUS;
    z[j] =
      (read.lum[i] - 0.5) * spec.depth +
      Math.max(0, 1 - rad) * spec.centerZBias;

    const v = read.ink[i];
    ink[j] = v;
    if (v > spec.extentInk) {
      extX.push(Math.abs(px));
      extY.push(Math.abs(py));
    }
  }

  return {
    xy,
    rgb,
    z,
    ink,
    halfExtentX: percentile(extX, 0.99),
    halfExtentY: percentile(extY, 0.99),
  };
}

/**
 * Sample BOTH founder portraits onto one shared grid and return index-paired
 * per-particle arrays. The instance count FOLLOWS the sampler (one particle per
 * shared cell, uniformly strided down to `spec.maxCount` if the grid overshoots)
 * — never the other way round, because padding to a fixed count means
 * duplicates, and duplicates were the bug.
 */
export function samplePortraitPair(
  imageA: HTMLImageElement,
  imageB: HTMLImageElement,
  spec: PortraitPairSpec,
): PortraitPair | null {
  const readA = readGrid(imageA, spec);
  const readB = readGrid(imageB, spec);
  if (!readA || !readB) return null;

  // --- Shared cell list: the UNION of both inks -----------------------------
  // Index j in the output arrays is cells[j] in BOTH images, so particle j
  // morphs from its own cell in A to the SAME cell in B.
  const total = spec.gridW * spec.gridH;
  const hits: number[] = [];
  for (let i = 0; i < total; i++) {
    if (Math.max(readA.ink[i], readB.ink[i]) > spec.inkCut) hits.push(i);
  }
  const sharedCells = hits.length;
  if (sharedCells === 0) return null;

  // Over the tier ceiling → FIXED uniform stride. Never a random subsample
  // (that reintroduces clumping) and never a duplicate pad.
  const stride =
    sharedCells > spec.maxCount ? Math.ceil(sharedCells / spec.maxCount) : 1;
  const count = Math.ceil(sharedCells / stride);
  const cells = new Int32Array(count);
  for (let j = 0; j < count; j++) cells[j] = hits[j * stride];

  return {
    a: emit(readA, cells, spec),
    b: emit(readB, cells, spec),
    count,
    sharedCells,
    stride,
    gridW: spec.gridW,
    gridH: spec.gridH,
  };
}
