/**
 * Portrait image → particle home positions + per-particle colour + z-relief.
 *
 * The image analog of text/sampleTextPoints.ts (same offscreen-2D-canvas →
 * getImageData → weighted-random-pick discipline, same xy convention: CSS-px
 * offsets from the block CENTER, y-UP), extended for a photographic morph:
 *
 *   - PORTRAIT CROP: the sources are landscape JPEGs (1920×1280) with NO
 *     cutout, so we cover-crop a centred portrait band onto a bounded grid
 *     (~300×420, stride 2) before reading pixels.
 *   - LUMINANCE × RADIAL weighting: each covered cell's pick-weight is its
 *     luminance (0.299/0.587/0.114) raised to `lumGamma`, times a center-radial
 *     falloff around the face — this biases particles ONTO the centred face and
 *     thins the corners/background (there is no alpha cutout to lean on).
 *   - Z-RELIEF: per-particle z = (lum−0.5)·depth + a center bias, so brighter
 *     (frontal, lit) pixels push toward the camera and the cloud reads as a 3D
 *     bust once the render depth-tests it.
 *   - sRGB→LINEAR: every colour is converted per-channel (the exact three.js
 *     SRGBToLinear curve). MANDATORY — the render is toneMapped:false, so raw
 *     sRGB values would render dark/oversaturated.
 *   - INDEX PAIRING: with `pair:true` the picks are radial-sorted (quantised
 *     atan2 sector, then radius) with a SEEDED rng, so index i in portrait A
 *     lands in a comparable region of portrait B — short, legible morph travel.
 *     The seed makes picks + jitter STABLE across resample (a mid-scroll
 *     rebuild must not snap the morph). Both portraits MUST be sampled with the
 *     same `count`. Pass `pair:false` for a chaotic swirl (no region matching).
 *
 * Returned coordinates/relief are in GRID px (the caller scales grid-px → world
 * to fit the [data-founder-stage] rect, exactly as HeroTextParticles scales
 * text px → world). xy is y-up, from the grid centre.
 */

export interface ImageSampleSpec {
  /** Offscreen grid width (bounded — cost cap). */
  gridW: number;
  /** Offscreen grid height (portrait-ish). */
  gridH: number;
  /** Sample stride on the grid (cost bound). */
  stride: number;
  /** z relief depth in grid-px: z = (lum−0.5)·depth + center bias. */
  depth: number;
  /** Extra forward push at the face centre (grid-px), falling off radially. */
  centerZBias: number;
  /** Radial weight falloff exponent (higher = tighter to the face centre). */
  radialFalloff: number;
  /** Radius (normalized) at which the radial weight reaches 0. */
  radius: number;
  /** Normalized face-centre Y (0 = top … 1 = bottom); faces sit a touch high. */
  faceBias: number;
  /** Luminance exponent — >1 pushes weight toward the brightest (lit) pixels. */
  lumGamma: number;
  /** Luminance floor: cells dimmer than this are treated as background, dropped. */
  lumFloor: number;
  /**
   * Saturation (chroma = max−min RGB) floor for BACKGROUND ISOLATION. Cells
   * with chroma below this are treated as neutral background and dropped, so a
   * headshot's dark/neutral surround never seeds particles. Skin tones clear a
   * small floor easily; 0 (default) disables the test. NOTE: this also culls
   * DARK neutral pixels (hair, beard) — prefer `bgLumCeil` for a white-wall
   * headshot so those are kept. Live-tunable.
   */
  satFloor?: number;
  /**
   * Bright-neutral BACKGROUND drop: cells BRIGHTER than this AND with chroma
   * below `bgChromaCeil` are dropped as backdrop. A near-white studio wall (and
   * a white shirt) is bright+neutral; dark hair/beard is dark+neutral — so this
   * removes the wall while KEEPING the hair/beard (which satFloor/lumFloor would
   * wrongly cull). This is what lets the face sample DENSE and complete instead
   * of a thin, holey cloud. Undefined disables. Live-tunable.
   */
  bgLumCeil?: number;
  /** Chroma ceiling for the bright-neutral drop (default 0.06). */
  bgChromaCeil?: number;
  /**
   * Optional NORMALIZED focus crop (0..1 of the source), applied BEFORE the
   * cover-crop-to-grid. Lets a non-headshot / environmental source be cropped to
   * the face region so the cloud reads as a face. Absent = full frame.
   */
  crop?: { x: number; y: number; w: number; h: number };
  /** Deterministic seed (stable picks + jitter across resample). */
  seed: number;
  /** Radial-sort the picks so index i pairs comparable A/B regions (default). */
  pair: boolean;
}

export interface ImagePoints {
  /** count×2 floats: x,y GRID px from the grid centre, y-up. */
  xy: Float32Array;
  /** count×3 floats: LINEAR rgb (sRGB→linear converted). */
  rgb: Float32Array;
  /** count floats: z relief in GRID px (same space as xy). */
  z: Float32Array;
  widthPx: number;
  heightPx: number;
  /** Covered (weighted) candidate cells found — a proportional ink measure. */
  inkPx: number;
  /** Half extent (grid px, from centre) of |x| across the picks — a robust
   * (~99th-percentile) measure of the sampled FACE width; the caller fits this
   * to the stage rect so the cloud FILLS (not overflows) the stage. */
  halfExtentX: number;
  /** Half extent (grid px) of |y| across the picks — the sampled face height. */
  halfExtentY: number;
}

/** Robust half extent of |component| (grid px, from centre) across the picks —
 * a high percentile so the sampler's few stray outliers don't inflate it. Used
 * by the caller to map the sampled face extent onto the stage rect. */
function percentileAbs(
  xy: Float32Array,
  count: number,
  comp: 0 | 1,
  p: number,
): number {
  if (count <= 0) return 1;
  const a = new Float32Array(count);
  for (let i = 0; i < count; i++) a[i] = Math.abs(xy[i * 2 + comp]);
  a.sort();
  const idx = Math.min(count - 1, Math.max(0, Math.floor(count * p)));
  return Math.max(a[idx], 1e-3);
}

/** Small, fast, deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Exact three.js sRGB→linear transfer (ColorManagement.SRGBToLinear). */
function srgbToLinear(c: number): number {
  return c < 0.04045
    ? c * 0.0773993808
    : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
}

/** Number of angular sectors used to pair A↔B (radial sort). */
const PAIR_SECTORS = 48;
/** Fixed seed for the post-pairing DRAW-ORDER shuffle. MUST be constant (not
 * per-image) so portraits A and B permute identically and their index pairing
 * survives — see the shuffle note in the pairing branch. */
const DRAW_SHUFFLE_SEED = 0x5eed5a;

const EMPTY = (count: number): ImagePoints => ({
  xy: new Float32Array(count * 2),
  rgb: new Float32Array(count * 3),
  z: new Float32Array(count),
  widthPx: 1,
  heightPx: 1,
  inkPx: 0,
  halfExtentX: 1,
  halfExtentY: 1,
});

/**
 * Rasterizes a centred portrait crop of `image` to `spec.gridW × spec.gridH`
 * and samples `count` weighted points inside it.
 */
export function sampleImagePoints(
  image: HTMLImageElement,
  srcW: number,
  srcH: number,
  count: number,
  spec: ImageSampleSpec,
): ImagePoints {
  const { gridW, gridH, stride } = spec;
  if (srcW <= 0 || srcH <= 0) return EMPTY(count);

  const canvas = document.createElement("canvas");
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return EMPTY(count);

  // Optional NORMALIZED focus crop (0..1 of the source) — isolates a face
  // region so a non-headshot / environmental source still samples face-only.
  // Defaults to the full frame. The cover-crop below fits THIS region to grid.
  const cr = spec.crop;
  const regX = cr ? cr.x * srcW : 0;
  const regY = cr ? cr.y * srcH : 0;
  const regW = cr ? Math.max(cr.w * srcW, 1) : srcW;
  const regH = cr ? Math.max(cr.h * srcH, 1) : srcH;

  // Cover-crop the region to the grid's aspect, centred within the region.
  const targetAspect = gridW / gridH;
  const regionAspect = regW / regH;
  let cropW: number;
  let cropH: number;
  let sx: number;
  let sy: number;
  if (regionAspect > targetAspect) {
    cropH = regH;
    cropW = regH * targetAspect;
    sx = regX + (regW - cropW) / 2;
    sy = regY;
  } else {
    cropW = regW;
    cropH = regW / targetAspect;
    sx = regX;
    sy = regY + (regH - cropH) / 2;
  }
  ctx.drawImage(image, sx, sy, cropW, cropH, 0, 0, gridW, gridH);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, gridW, gridH).data;
  } catch {
    // Tainted canvas (should not happen for same-origin static assets).
    return EMPTY(count);
  }

  // --- Collect covered cells with pick-weights + colour + relief -------------
  const candX: number[] = [];
  const candY: number[] = [];
  const candR: number[] = [];
  const candG: number[] = [];
  const candB: number[] = [];
  const candZ: number[] = [];
  const cum: number[] = []; // cumulative weight (for weighted pick)
  let total = 0;

  const faceCx = 0.5;
  const faceCy = spec.faceBias;
  // Aspect scale so the radial falloff is a true circle in grid space.
  const ax = gridW / gridH;
  const invR = 1 / Math.max(spec.radius, 1e-3);

  for (let y = 0; y < gridH; y += stride) {
    for (let x = 0; x < gridW; x += stride) {
      const idx = (y * gridW + x) * 4;
      const a = data[idx + 3];
      if (a < 8) continue;
      const rn = data[idx] / 255;
      const gn = data[idx + 1] / 255;
      const bn = data[idx + 2] / 255;
      const lum = 0.299 * rn + 0.587 * gn + 0.114 * bn;
      if (lum < spec.lumFloor) continue;
      const chroma = Math.max(rn, gn, bn) - Math.min(rn, gn, bn);
      // Background isolation — two complementary neutral-drop tests:
      //  - satFloor drops ALL near-neutral pixels (also culls dark hair/beard,
      //    so the founders morph leaves it at 0).
      //  - bgLumCeil drops only BRIGHT near-neutral pixels: a near-white studio
      //    wall / white shirt is bright+neutral, dark hair/beard is dark+neutral
      //    — so this strips the backdrop while KEEPING the hair and beard, and
      //    the face samples dense + complete instead of thin and holey.
      if (spec.satFloor && spec.satFloor > 0 && chroma < spec.satFloor) continue;
      if (
        spec.bgLumCeil != null &&
        lum > spec.bgLumCeil &&
        chroma < (spec.bgChromaCeil ?? 0.06)
      )
        continue;

      const nx = (x / gridW - faceCx) * ax;
      const ny = y / gridH - faceCy;
      const dist = Math.sqrt(nx * nx + ny * ny);
      const radial = Math.pow(Math.max(0, 1 - dist * invR), spec.radialFalloff);
      if (radial <= 0) continue;

      const w = Math.pow(lum, spec.lumGamma) * radial + 1e-4;
      total += w;
      candX.push(x);
      candY.push(y);
      candR.push(rn);
      candG.push(gn);
      candB.push(bn);
      // Relief: brighter → forward; plus a smooth center bulge for the bust.
      candZ.push(
        (lum - 0.5) * spec.depth + Math.max(0, 1 - dist * invR) * spec.centerZBias,
      );
      cum.push(total);
    }
  }

  const n = cum.length;
  if (n === 0 || total <= 0) return EMPTY(count);

  // --- Weighted random pick (with replacement) + sub-cell jitter ------------
  const rng = mulberry32(spec.seed);
  const cx = gridW / 2;
  const cy = gridH / 2;
  const xy = new Float32Array(count * 2);
  const rgb = new Float32Array(count * 3);
  const z = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const target = rng() * total;
    // Binary search the cumulative-weight array.
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const k = lo;
    const px = candX[k] + rng() * stride;
    const py = candY[k] + rng() * stride;
    xy[i * 2] = px - cx;
    xy[i * 2 + 1] = -(py - cy); // y-up
    rgb[i * 3] = srgbToLinear(candR[k]);
    rgb[i * 3 + 1] = srgbToLinear(candG[k]);
    rgb[i * 3 + 2] = srgbToLinear(candB[k]);
    z[i] = candZ[k];
  }

  // Robust sampled-face extent (grid px, from centre). Pairing below is a pure
  // permutation of the SAME point set, so the extent is identical either way —
  // compute it once here and return it on both branches.
  const halfExtentX = percentileAbs(xy, count, 0, 0.99);
  const halfExtentY = percentileAbs(xy, count, 1, 0.99);

  if (!spec.pair) {
    return {
      xy,
      rgb,
      z,
      widthPx: gridW,
      heightPx: gridH,
      inkPx: n,
      halfExtentX,
      halfExtentY,
    };
  }

  // --- Radial pairing: sort picks by (angular sector, radius) so index i in A
  // and B occupy comparable regions → short, legible morph travel. Deterministic
  // (pure function of the picks), so it is stable across a reseeded resample. --
  const order = new Int32Array(count);
  for (let i = 0; i < count; i++) order[i] = i;
  const keys = new Float64Array(count);
  let maxR = 1e-4;
  for (let i = 0; i < count; i++) {
    const r = Math.hypot(xy[i * 2], xy[i * 2 + 1]);
    if (r > maxR) maxR = r;
  }
  for (let i = 0; i < count; i++) {
    const vx = xy[i * 2];
    const vy = xy[i * 2 + 1];
    const ang = Math.atan2(vy, vx) + Math.PI; // 0..2π
    const sector = Math.floor((ang / (Math.PI * 2)) * PAIR_SECTORS);
    keys[i] = sector + Math.hypot(vx, vy) / maxR; // sector.radius
  }
  const idx = Array.from(order);
  idx.sort((p, q) => keys[p] - keys[q]);

  // Decorrelate DRAW ORDER from angle. `idx` above orders particles by angular
  // sector, so instance index (= GPU draw order) follows the angle. With
  // depth-tested, near-equal-depth discs the GPU resolves overlaps by draw
  // order, so that angular ordering paints a visible PINWHEEL of sectors across
  // the face (worst on flat regions where z ties). Apply a FIXED-seed shuffle on
  // top of the radial order: the shuffle is identical for portrait A and B
  // (same seed, same count), so index i still maps to the same radial rank in
  // both — the A↔B pairing (short morph travel) is preserved — while the draw
  // order becomes spatially random, so overlaps break as fine noise, not
  // sectors. `perm` maps output slot → radial-sorted slot.
  const perm = new Int32Array(count);
  for (let i = 0; i < count; i++) perm[i] = i;
  const srng = mulberry32(DRAW_SHUFFLE_SEED);
  for (let i = count - 1; i > 0; i--) {
    const k = Math.floor(srng() * (i + 1));
    const t = perm[i];
    perm[i] = perm[k];
    perm[k] = t;
  }

  const sxy = new Float32Array(count * 2);
  const srgb = new Float32Array(count * 3);
  const sz = new Float32Array(count);
  for (let out = 0; out < count; out++) {
    const j = idx[perm[out]];
    sxy[out * 2] = xy[j * 2];
    sxy[out * 2 + 1] = xy[j * 2 + 1];
    srgb[out * 3] = rgb[j * 3];
    srgb[out * 3 + 1] = rgb[j * 3 + 1];
    srgb[out * 3 + 2] = rgb[j * 3 + 2];
    sz[out] = z[j];
  }

  return {
    xy: sxy,
    rgb: srgb,
    z: sz,
    widthPx: gridW,
    heightPx: gridH,
    inkPx: n,
    halfExtentX,
    halfExtentY,
  };
}
