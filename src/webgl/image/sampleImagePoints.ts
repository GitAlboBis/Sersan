/**
 * Founder portraits → particle home positions + per-particle colour, z-relief,
 * surface NORMAL and INK (presence / tonal weight).
 *
 * MODEL (rewrite 2026-07-20, DEPTH-MATTE extension 2026-08-27).
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
 *   - THE BACKDROP IS REMOVED SPATIALLY, NEVER CHROMATICALLY. A border-seeded
 *     flood fill (see BG_FILL_TOL) marks the wall; no per-pixel colour /
 *     luminance test is allowed to decide what is backdrop — see the
 *     flood-fill comment for why every one of them fails.
 *   - SHARED GRID / SHARED CELL LIST. EVERY portrait in the set is sampled onto
 *     the SAME grid and one cell list is built from the union of their ink, so
 *     output index `j` is the same cell in EVERY image. That gives A↔B↔C index
 *     pairing for free and replaces the old radial-sector sort entirely: the
 *     morph reads as the portrait re-forming in place.
 *
 * DEPTH MATTE (2026-08-27 — the "empty patches" fix). Until now `ink` was the
 * luma-weighted DISTANCE FROM THE BACKDROP COLOUR, and it drove particle SIZE
 * and alpha. HANDOFF contract 12 says it verbatim: "ink è distanza dallo
 * sfondo misurato, non oscurità". A lit bald scalp, a forehead highlight or a
 * cheek that shares the wall's colour is INSIDE the flood-fill mask (contract
 * 2 did its job) but still measures ~0 from the wall → a sub-pixel disc → the
 * alpha knee → Discard. That is exactly the halftone with holes in the bright
 * skin the owner rejected: the render inverted "bright = big" into "bright =
 * gone". No threshold fixes it, because colour genuinely cannot separate the
 * two (contract 2).
 *
 * The fix separates PRESENCE from TONE, the way lusion.co's team head does
 * (a 3D scan: every surface point exists; tone = baked shade × normal·light):
 *
 *   - A per-portrait DEPTH MAP (`/founders/<anchor>-depth.webp`, generated
 *     offline by scripts/generate-founder-depth.mjs with Depth Anything V2,
 *     WHITE = NEAR) supplies a SPATIAL matte: the studio wall is uniformly far,
 *     the bust is uniformly near, and the histogram is bimodal with an empty
 *     gap in between — `depthCut` sits in that gap. Depth is a geometric cue,
 *     so this is contract 2 honoured, not bypassed. The flood-fill mask is
 *     still AND-ed in: depth models blur their silhouette outward by a few
 *     px, and that wall-coloured halo is exactly what the border-seeded fill
 *     removes.
 *   - `ink` = presence × the vertical dissolve. Inside the subject it is ~1
 *     EVERYWHERE — scalp, highlights, beard alike — so every cell draws a
 *     full-size disc and coverage is uniform by construction.
 *   - TONE is carried by COLOUR and LIGHTING instead (gpgpuNodeSim's portrait
 *     path: luminance × (ambient + normal·light + rim)), never by size.
 *   - z-RELIEF is the depth map itself (nose, brow, glasses, jaw, shoulders),
 *     not a luminance guess — a dark beard next to lit skin is at the same
 *     depth, so the "comb tearing" that forced the old ±4 % cap does not
 *     occur, and the island can allow a real ~⅓-of-face-height relief.
 *   - NORMALS are the depth gradient at the SAME relief scale as z, so the
 *     lighting agrees with the geometry it shades.
 *
 * Without a depth map (asset missing) the sampler falls back to the previous
 * colour-distance ink, z from luminance, and flat normals — byte-identical to
 * the 2026-07-20 output.
 *
 * Backdrop colour is the per-channel MEDIAN of the two TOP corner patches —
 * median (not mean) to shrug off a stray dark pixel, top corners only because
 * the subject's shoulders reach the bottom ones.
 *
 * sRGB→LINEAR: every colour is converted per-channel (the exact three.js
 * SRGBToLinear curve). MANDATORY — the render is toneMapped:false, so raw sRGB
 * values would render dark/oversaturated.
 *
 * Returned coordinates/relief are in GRID px (the caller scales grid-px → world
 * to fit the [data-founder-stage] rect, exactly as HeroTextParticles scales
 * text px → world). xy is y-up, from the grid centre.
 */

export interface PortraitSpec {
  /** Shared offscreen grid width. One particle per kept cell — the grid area
   * (not a `count`) is what sets the instance count. */
  gridW: number;
  /** Shared offscreen grid height (portrait, ~5:7). */
  gridH: number;
  /** z relief depth in grid-px. With a depth map: z = (depth01 − 0.5)·depth
   * over the subject's own near..far range. Without: z = (lum−0.5)·depth +
   * centre bulge (legacy). */
  depth: number;
  /** Extra forward push at the face centre (grid-px), falling off radially.
   * Legacy (no-depth-map) path only. */
  centerZBias: number;
  /** Ink contrast gain applied to the backdrop distance before the curve.
   * Legacy (no-depth-map) path only. */
  inkGain: number;
  /** Ink floor — distance below this is remapped to 0 (kills sensor noise).
   * Legacy (no-depth-map) path only. */
  inkFloor: number;
  /** Ink gamma (<1 lifts the mid-tones so cheeks/shirt keep some weight).
   * Legacy (no-depth-map) path only. */
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
  /** DEPTH MATTE: normalized depth (0 far … 1 near, from the depth map) above
   * which a cell is SUBJECT. Sits in the empty gap of the bimodal histogram
   * (measured on the four shipped depth maps: wall ≤ 0.19, bust ≥ 0.35). */
  depthCut: number;
  /** DEPTH MATTE: half-width (normalized depth) of the soft presence edge
   * around `depthCut`, so the silhouette anti-aliases instead of stepping. */
  depthEdge: number;
}

/** Per-image, per-particle outputs. Index `j` is the SAME shared cell in EVERY
 * image of the set, which is what pairs the A→B→C morph. A cell that is ink in
 * only ONE portrait still exists in all the others, there with ink 0 — the cell
 * list is a UNION, never an intersection. */
export interface PortraitPoints {
  /** count×2 floats: x,y GRID px from the grid centre, y-up. */
  xy: Float32Array;
  /** count×3 floats: LINEAR rgb (sRGB→linear converted). */
  rgb: Float32Array;
  /** count floats: z relief in GRID px (same space as xy). */
  z: Float32Array;
  /** count floats in 0..1: presence (depth-matte path) or tonal weight
   * (legacy path). Drives particle size and alpha. */
  ink: Float32Array;
  /** count×2 floats: surface normal x,y (model space: x right, y up, z toward
   * the camera; z = sqrt(1−x²−y²) is rebuilt in the shader). Flat (0,0) on
   * the legacy path. */
  nrm: Float32Array;
  /** True when this portrait was sampled with a depth map. */
  hasDepth: boolean;
  /** Half extent (grid px, from centre) of |x| over the cells with
   * ink > `extentInk` — a robust (~99th-percentile) measure of the sampled
   * FACE width; the caller fits it to the stage rect so the cloud FILLS (not
   * overflows) the stage. */
  halfExtentX: number;
  /** Half extent (grid px) of |y| over the same cells — the face height. */
  halfExtentY: number;
  /** Half extents over the HEAD rows only (normalized y < HEAD_ROW_LIMIT) —
   * what the island fits to the stage on the lit path (2026-08-27). */
  headHalfExtentX: number;
  headHalfExtentY: number;
}

export interface PortraitSet {
  /** One entry per input image, in input order. `points[k].xy[j*2]` and
   * `points[m].xy[j*2]` are the SAME grid cell for every k, m — that shared
   * index is what pairs particle `j` across every leg of the morph. */
  points: PortraitPoints[];
  /** Final instance count — the caller's particle count FOLLOWS this. */
  count: number;
  /** UNION cells found, BEFORE any stride subsample (the calibration number).
   * GROWS monotonically with each portrait added: a cell joins if ANY portrait
   * inks it. Watch this against `spec.maxCount` — the stride is an INTEGER
   * CLIFF and crossing it halves the count for EVERY portrait at once. */
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
 * across the shoulder shadow or a hairline.
 *
 * Backdrop detection is PER-PORTRAIT (colour + flood fill both run inside
 * `readGrid` on one image), so adding a portrait cannot perturb the others. It
 * does assume each portrait's backdrop is far in colour from its subject's
 * CLOTHING — a dark garment against a dark backdrop would sit within
 * BG_FILL_TOL of the wall and the fill could walk into the torso from the side
 * seeds above BG_FILL_ROW_LIMIT. */
const BG_FILL_TOL = 0.055;
/** Normalized y below which the flood fill may not travel (see the fill). */
const BG_FILL_ROW_LIMIT = 0.62;
/** Normalized y of the shoulder line on the framing contract (skull top ≈
 * 0.17, chin ≈ 0.58) — rows above it measure the HEAD extent. */
const HEAD_ROW_LIMIT = 0.6;

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

/** Full-grid rasterization of one portrait: normalized rgb + luminance + ink,
 * plus (depth-matte path) the normalized depth field. */
interface GridRead {
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  lum: Float32Array;
  ink: Float32Array;
  /** Normalized depth 0 (far) … 1 (near) per cell, or null on the legacy
   * path. Raw map values — the presence curve is applied in `readGrid`. */
  dep: Float32Array | null;
}

/** Cover-crop `image` to the grid's aspect (centred) and rasterize it into a
 * gridW×gridH RGBA byte buffer. Shared by the colour and the depth reads so
 * both land on the SAME cells. */
function rasterize(
  image: HTMLImageElement,
  gridW: number,
  gridH: number,
): Uint8ClampedArray | null {
  const srcW = image.naturalWidth;
  const srcH = image.naturalHeight;
  if (srcW <= 0 || srcH <= 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

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

  try {
    return ctx.getImageData(0, 0, gridW, gridH).data;
  } catch {
    // Tainted canvas (should not happen for same-origin static assets).
    return null;
  }
}

/**
 * Rasterize one portrait (and its depth twin, when supplied), then derive the
 * per-cell ink: on the depth-matte path presence = smoothstep around
 * `depthCut` AND-ed with the flood-fill wall mask, vertically dissolved toward
 * the bottom; on the legacy path the luma-weighted distance from the measured
 * backdrop colour, contrast-curved and dissolved.
 */
function readGrid(
  image: HTMLImageElement,
  spec: PortraitSpec,
  depthImage: HTMLImageElement | null,
): GridRead | null {
  const { gridW, gridH } = spec;
  const data = rasterize(image, gridW, gridH);
  if (!data) return null;

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

  // --- Depth twin (optional): same cover-crop, same cells -------------------
  // The map is single-channel-in-RGB, WHITE = NEAR (scripts/generate-founder-
  // depth.mjs). A twin whose aspect differs from the headshot would land on
  // different cells; the script writes it at exactly half the headshot's
  // resolution so the crop is identical.
  let dep: Float32Array | null = null;
  if (depthImage) {
    const dd = rasterize(depthImage, gridW, gridH);
    if (dd) {
      dep = new Float32Array(cells);
      for (let i = 0; i < cells; i++) dep[i] = dd[i * 4] / 255;
    }
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
  // On the depth-matte path the fill is the SECOND opinion: it is AND-ed with
  // the depth presence so the depth model's blurred silhouette halo (wall-
  // coloured, border-connected) is removed too.
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

  // --- Ink ------------------------------------------------------------------
  const ink = new Float32Array(cells);
  const invFloor = 1 / Math.max(1 - spec.inkFloor, 1e-4);
  const edge = Math.max(spec.depthEdge, 1e-4);
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
      if (dep) {
        // DEPTH MATTE: presence, not tone. A soft edge of ±depthEdge around
        // depthCut anti-aliases the silhouette; inside the bust this is 1
        // everywhere, which is the whole point (uniform coverage).
        const t = Math.min(
          1,
          Math.max(0, (dep[i] - (spec.depthCut - edge)) / (2 * edge)),
        );
        ink[i] = t * t * (3 - 2 * t) * fade;
      } else {
        const v = Math.min(
          1,
          Math.max(0, (dist[i] * spec.inkGain - spec.inkFloor) * invFloor),
        );
        ink[i] = Math.pow(v, spec.inkGamma) * fade;
      }
    }
  }

  return { r, g, b, lum, ink, dep };
}

/**
 * Per-cell z relief (GRID px) over the FULL grid — computed once per portrait
 * so the normals can be taken as finite differences of the very same field.
 *
 * Depth path: the subject's own near..far range (depthCut..1) is mapped to
 * −depth/2 … +depth/2; wall cells sit at −depth/2 (they are collapsed anyway,
 * and a cell that is subject in one portrait but wall in another then SINKS
 * BACK as it dissolves mid-morph — a small free effect). A 3×3 box blur on the
 * raw map first: the twin is half-resolution and lossless, but the model's own
 * output has faint block structure that the gradient would amplify.
 */
function reliefField(read: GridRead, spec: PortraitSpec): Float32Array {
  const { gridW, gridH } = spec;
  const cells = gridW * gridH;
  const z = new Float32Array(cells);
  const dep = read.dep;
  if (dep) {
    const invRange = 1 / Math.max(1 - spec.depthCut, 1e-4);
    const sm = new Float32Array(cells);
    for (let y = 0; y < gridH; y++) {
      const y0 = Math.max(0, y - 1);
      const y1 = Math.min(gridH - 1, y + 1);
      for (let x = 0; x < gridW; x++) {
        const x0 = Math.max(0, x - 1);
        const x1 = Math.min(gridW - 1, x + 1);
        let s = 0;
        let n = 0;
        for (let yy = y0; yy <= y1; yy++)
          for (let xx = x0; xx <= x1; xx++) {
            s += dep[yy * gridW + xx];
            n++;
          }
        sm[y * gridW + x] = s / n;
      }
    }
    for (let i = 0; i < cells; i++) {
      const v = Math.min(1, Math.max(0, (sm[i] - spec.depthCut) * invRange));
      z[i] = (v - 0.5) * spec.depth;
    }
    return z;
  }
  // Legacy: brighter → forward, plus a smooth centre bulge for the bust.
  const ax = gridW / gridH;
  for (let y = 0; y < gridH; y++) {
    const ny = y / gridH - FACE_CY;
    for (let x = 0; x < gridW; x++) {
      const i = y * gridW + x;
      const nx = (x / gridW - 0.5) * ax;
      const rad = Math.sqrt(nx * nx + ny * ny) / BULGE_RADIUS;
      z[i] =
        (read.lum[i] - 0.5) * spec.depth +
        Math.max(0, 1 - rad) * spec.centerZBias;
    }
  }
  return z;
}

/** Emit the per-particle arrays for one image over the SHARED cell list. */
function emit(
  read: GridRead,
  cells: Int32Array,
  spec: PortraitSpec,
): PortraitPoints {
  const { gridW, gridH } = spec;
  const count = cells.length;
  const xy = new Float32Array(count * 2);
  const rgb = new Float32Array(count * 3);
  const z = new Float32Array(count);
  const ink = new Float32Array(count);
  const nrm = new Float32Array(count * 2);
  const cx = gridW / 2;
  const cy = gridH / 2;
  const extX: number[] = [];
  const extY: number[] = [];
  const headX: number[] = [];
  const headY: number[] = [];
  const hasDepth = !!read.dep;
  const field = reliefField(read, spec);

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
    z[j] = field[i];

    if (hasDepth) {
      // Surface normal from the relief gradient (central differences, grid
      // px), in MODEL space: x right, y UP (grid y is down → negate), z toward
      // the camera. Same scale as z, so light and geometry agree.
      const xl = gx > 0 ? field[i - 1] : field[i];
      const xr = gx < gridW - 1 ? field[i + 1] : field[i];
      const yu = gy > 0 ? field[i - gridW] : field[i];
      const yd = gy < gridH - 1 ? field[i + gridW] : field[i];
      const dzdx = (xr - xl) * 0.5;
      const dzdyUp = (yu - yd) * 0.5; // toward +y (up)
      const inv = 1 / Math.sqrt(dzdx * dzdx + dzdyUp * dzdyUp + 1);
      nrm[j * 2] = -dzdx * inv;
      nrm[j * 2 + 1] = -dzdyUp * inv;
    }

    const v = read.ink[i];
    ink[j] = v;
    if (v > spec.extentInk) {
      extX.push(Math.abs(px));
      extY.push(Math.abs(py));
      // HEAD-ONLY extent (2026-08-27): the rows above the shoulders. With the
      // depth matte the shoulders ink at 1.0 to the frame edge, so the full
      // extent is always ≈ the frame and the FACE ends up small in the stage.
      // The island fits the head to the stage and lets the bust overflow.
      if (gy / gridH < HEAD_ROW_LIMIT) {
        headX.push(Math.abs(px));
        headY.push(Math.abs(py));
      }
    }
  }

  return {
    xy,
    rgb,
    z,
    ink,
    nrm,
    hasDepth,
    halfExtentX: percentile(extX, 0.99),
    halfExtentY: percentile(extY, 0.99),
    headHalfExtentX: percentile(headX, 0.985),
    headHalfExtentY: percentile(headY, 0.985),
  };
}

/**
 * Sample N founder portraits onto ONE shared grid and return index-paired
 * per-particle arrays. The instance count FOLLOWS the sampler (one particle
 * per union cell, uniformly strided down to `spec.maxCount` if the grid
 * overshoots) — never the other way round, because padding to a fixed count
 * means duplicates, and duplicates were the bug.
 *
 * THE CELL LIST IS A UNION, AND IT GROWS WITH N. A cell joins if ANY portrait
 * inks it above `inkCut`; portraits that do NOT ink it still emit it, at ink
 * 0, and the renderer collapses it (PORTRAIT_SIZE_MIN). Adding a portrait
 * therefore never removes coverage — but `stride` is an INTEGER CLIFF against
 * `maxCount`, so re-measure `sharedCells` whenever a portrait is added.
 * Retarget the grid with `scale = sqrt(wanted / measured)`.
 *
 * `depths[k]` (optional, index-matched to `images`) is the depth twin of
 * portrait k; a null entry puts that ONE portrait on the legacy path while the
 * others keep their matte — the shared grid is unaffected either way.
 */
export function samplePortraitSet(
  images: HTMLImageElement[],
  spec: PortraitSpec,
  depths?: (HTMLImageElement | null)[],
): PortraitSet | null {
  if (images.length === 0) return null;
  const reads: GridRead[] = [];
  for (let k = 0; k < images.length; k++) {
    const rd = readGrid(images[k], spec, depths?.[k] ?? null);
    if (!rd) return null; // one bad decode invalidates the shared grid
    reads.push(rd);
  }

  // --- Shared cell list: the UNION of every ink -----------------------------
  // Index j in the output arrays is cells[j] in EVERY image, so particle j
  // morphs from its own cell in A to the SAME cell in B, then in C.
  const total = spec.gridW * spec.gridH;
  const hits: number[] = [];
  for (let i = 0; i < total; i++) {
    let maxInk = 0;
    for (let k = 0; k < reads.length; k++) {
      const v = reads[k].ink[i];
      if (v > maxInk) maxInk = v;
    }
    if (maxInk > spec.inkCut) hits.push(i);
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
    points: reads.map((rd) => emit(rd, cells, spec)),
    count,
    sharedCells,
    stride,
    gridW: spec.gridW,
    gridH: spec.gridH,
  };
}
