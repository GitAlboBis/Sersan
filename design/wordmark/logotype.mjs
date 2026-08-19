/**
 * SERSAN — logotype built from REAL FONT OUTLINES.
 * ---------------------------------------------------------------------------
 * Unlike `wordmark.mjs` (a parametric monoline skeleton drawn from scratch),
 * this module takes the letterforms straight out of a font file and modifies
 * them with boolean path operations. Nothing is redrawn by hand: the S, E, N
 * are the typeface untouched; the A and the R are the typeface minus a
 * measured, geometrically derived cut.
 *
 *   import { buildLogotype } from './logotype.mjs'
 *   const { svg, d, width, height, meta } = await buildLogotype({
 *     fontPath: '.../jost-latin-200-normal.woff2',
 *     tracking: 0.30, aCrossbar: 'none', rVariant: 'openbowl',
 *   })
 *
 * ── The two amputations ────────────────────────────────────────────────────
 *
 * A — no crossbar.
 *   The filled A always encloses exactly one counter: the triangle above the
 *   crossbar. (In Questrial/Poppins that counter is an explicit contour in the
 *   font; in Jost/Outfit the A is drawn as a chevron plus a separate crossbar
 *   bar, and the counter only appears once the contours are unioned — either
 *   way it is the single interior ring of the resolved fill.)
 *
 *   The cut is the region strictly between the two inner leg edges, running
 *   from the inner apex down past the crossbar into the open space between the
 *   legs: counter ∪ bridge, where `bridge` is the quad whose top edge is the
 *   counter's bottom edge (the crossbar's top) and whose bottom edge is the
 *   crossbar's bottom, located by binary-searching the scanline at which the
 *   ink stops being one solid span and splits into two legs. Its left and
 *   right edges therefore lie exactly on the font's own inner leg edges.
 *
 *   This is the exact limit of "extend the counter's two apex edges downward
 *   past the baseline", without that construction's failure mode: several of
 *   these fonts kink the inner leg edge by 2–3 units where the crossbar meets
 *   it, so a straight extrapolation of the counter's edges either shaves the
 *   leg or leaves a tapering sliver of crossbar behind. Anchoring the cut on
 *   the measured crossbar corners leaves the legs bit-identical to the font.
 *
 * R — five amputations. The first four are a difference with one axis-aligned
 *   rectangle whose position and size are measured off the glyph (never
 *   hardcoded); the fifth is a difference with a slab perpendicular to the
 *   leg's own axis, clipped to the leg contour:
 *     'openbowl'      the bowl's lower-left join, where the bowl returns to the
 *                     stem — the bowl is left open at the bottom. The drawing
 *                     imposes its own ceiling on this one: run the slab far
 *                     enough right and it stops taking only the return and
 *                     starts taking the leg's junction with it, so the leg
 *                     floats free as a second polygon. That ceiling is a
 *                     property of the letterform, not of the weight — across
 *                     the Jost ladder it sits at 131–161 font units (18.7–23.1 %
 *                     of cap) at every weight, while `gapRatio` × stem spans
 *                     99–204, so one ratio that is safe at wght 200 severs the
 *                     leg at wght 340. The ceiling is therefore MEASURED (see
 *                     `openBowlCeiling`), the gap is clamped to `legMargin` ×
 *                     stem inside it, and `gapRequested` / `gapCeiling` /
 *                     `gapClamped` / `gapRatioAchieved` are reported back.
 *     'openbowl-full' the same cut, run out until the whole horizontal return
 *                     is gone: to the abscissa where the weld holding the leg
 *                     under the bowl has narrowed to half a stem. The bowl is
 *                     then the top bar plus the curve down, and the leg springs
 *                     from where that curve ends. It is as wide as the
 *                     letterform admits — a little further and the leg floats
 *                     free — so `gapRatio` is ignored and the achieved ratio is
 *                     reported back. The cut's lower edge sits exactly on the
 *                     bowl's outer bottom line (no over-cut), so the leg's
 *                     chopped top edge continues the line the return drew.
 *     'cutstem'       a slice of the stem immediately below the bowl junction.
 *     'cutshoulder'   the bowl's top where it leaves the stem — the bowl starts
 *                     detached.
 *     'detachedleg'   the bowl closes onto the stem normally; the leg is cut
 *                     back along its own axis by the gap, measured from the
 *                     deepest point at which it is still fused to the bowl, so
 *                     it floats free of the junction. The cutter is intersected
 *                     with the leg contour alone, which leaves the bowl and the
 *                     stem bit-identical to the font.
 *   Gap = `gapRatio` × the stem thickness, and the stem thickness is scanned
 *   off the outline just above the baseline, so the gap tracks the weight —
 *   except where 'openbowl' hits the ceiling described above, at which point it
 *   stops tracking the weight and tracks the drawing instead.
 *
 * All geometry is normalised to cap height = 100 units, y-up internally,
 * flipped once at emit time. Curves are flattened to polygons at `tolerance`
 * (default 0.03 units ≈ 0.03 % of cap height) before clipping.
 *
 * Dependencies: `fontkit` and `polygon-clipping`. They are resolved from the
 * usual places; if this file lives outside a project that has them installed,
 * point LOGOTYPE_MODULE_PATHS at one or more node_modules directories
 * (path.delimiter-separated), or pass `deps: { fontkit, polygonClipping }`.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

/* ══════════════════════════════════════════════════ dependency resolution ══ */

const DEP_ENTRIES = {
  fontkit: ['dist/module.mjs', 'dist/main.cjs'],
  'polygon-clipping': ['dist/polygon-clipping.esm.js', 'dist/polygon-clipping.cjs.js'],
};

let _deps = null;

async function resolveDeps(override) {
  if (override) return override;
  if (_deps) return _deps;

  const candidates = (process.env.LOGOTYPE_MODULE_PATHS || '')
    .split(path.delimiter)
    .filter(Boolean);

  const load = async (name) => {
    try {
      return await import(name);
    } catch {
      /* fall through to explicit paths */
    }
    for (const dir of candidates) {
      for (const entry of DEP_ENTRIES[name]) {
        const file = path.join(dir, name, entry);
        try {
          return await import(pathToFileURL(file).href);
        } catch {
          /* try next */
        }
      }
    }
    throw new Error(
      `logotype.mjs: cannot resolve "${name}". Install it, or set ` +
        `LOGOTYPE_MODULE_PATHS to a node_modules directory that has it.`
    );
  };

  const fk = await load('fontkit');
  const pc = await load('polygon-clipping');
  _deps = {
    fontkit: fk.default && fk.default.create ? fk.default : fk,
    polygonClipping: pc.default && pc.default.union ? pc.default : pc,
  };
  return _deps;
}

/* ═══════════════════════════════════════════════════════ flat-poly helpers ══ */

const EPS = 1e-7;

function flattenQuad(out, p0, p1, p2, tol) {
  const mx = p0[0] - 2 * p1[0] + p2[0];
  const my = p0[1] - 2 * p1[1] + p2[1];
  const n = Math.max(1, Math.min(400, Math.ceil(Math.sqrt(Math.hypot(mx, my) / (4 * tol)))));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
      u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    ]);
  }
}

function flattenCubic(out, p0, p1, p2, p3, tol) {
  const m = Math.max(
    Math.hypot(p0[0] - 2 * p1[0] + p2[0], p0[1] - 2 * p1[1] + p2[1]),
    Math.hypot(p1[0] - 2 * p2[0] + p3[0], p1[1] - 2 * p2[1] + p3[1])
  );
  const n = Math.max(1, Math.min(400, Math.ceil(Math.sqrt((0.75 * m) / tol))));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
}

/** Flatten a fontkit glyph path into closed rings, scaled by `s` (y stays up). */
function flattenGlyph(glyph, s, tol) {
  const rings = [];
  let ring = null;
  let cur = [0, 0];
  const P = (x, y) => [x * s, y * s];

  for (const c of glyph.path.commands) {
    const a = c.args;
    switch (c.command) {
      case 'moveTo':
        ring = [];
        rings.push(ring);
        cur = P(a[0], a[1]);
        ring.push(cur);
        break;
      case 'lineTo':
        cur = P(a[0], a[1]);
        ring.push(cur);
        break;
      case 'quadraticCurveTo':
        flattenQuad(ring, cur, P(a[0], a[1]), (cur = P(a[2], a[3])), tol);
        break;
      case 'bezierCurveTo':
        flattenCubic(ring, cur, P(a[0], a[1]), P(a[2], a[3]), (cur = P(a[4], a[5])), tol);
        break;
      case 'closePath':
        break;
      default:
        throw new Error(`unhandled path command ${c.command}`);
    }
  }

  return rings
    .map((r) => {
      const out = [r[0]];
      for (let i = 1; i < r.length; i++) {
        const p = r[i];
        const q = out[out.length - 1];
        if (Math.abs(p[0] - q[0]) > EPS || Math.abs(p[1] - q[1]) > EPS) out.push(p);
      }
      const f = out[0];
      const l = out[out.length - 1];
      if (Math.abs(f[0] - l[0]) > EPS || Math.abs(f[1] - l[1]) > EPS) out.push([f[0], f[1]]);
      return out;
    })
    .filter((r) => r.length > 3);
}

function ringArea(r) {
  let a = 0;
  for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return a / 2;
}

/**
 * Resolve a glyph's contours into a normalised MultiPolygon under the
 * non-zero winding rule. The largest-|area| contour defines the "ink"
 * orientation (fonts here disagree: Jost/Outfit run CCW, Questrial/Poppins
 * CW); contours with the opposite orientation are holes. Same-orientation
 * contours are unioned, so overlapping pieces (Jost's A = chevron + separate
 * crossbar bar, its R = stem + leg + bowl) merge cleanly.
 */
function resolveFill(pc, rings) {
  const areas = rings.map(ringArea);
  let big = 0;
  for (let i = 1; i < areas.length; i++) if (Math.abs(areas[i]) > Math.abs(areas[big])) big = i;
  const sign = Math.sign(areas[big]);

  const add = rings.filter((_, i) => Math.sign(areas[i]) === sign).map((r) => [[r]]);
  const sub = rings.filter((_, i) => Math.sign(areas[i]) !== sign).map((r) => [[r]]);

  let mp = add.length > 1 ? pc.union(add[0], ...add.slice(1)) : add[0];
  if (sub.length) mp = pc.difference(mp, ...sub);
  return mp;
}

/* ════════════════════════════════════════════════════════ measuring tools ══ */

/** Ink spans [x0,x1] along the horizontal line y. */
function scanX(mp, y) {
  const xs = [];
  for (const poly of mp)
    for (const ring of poly)
      for (let i = 0; i < ring.length - 1; i++) {
        const [x0, y0] = ring[i];
        const [x1, y1] = ring[i + 1];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y))
          xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
  return pair(xs);
}

/** Ink spans [y0,y1] along the vertical line x. */
function scanY(mp, x) {
  const ys = [];
  for (const poly of mp)
    for (const ring of poly)
      for (let i = 0; i < ring.length - 1; i++) {
        const [x0, y0] = ring[i];
        const [x1, y1] = ring[i + 1];
        if ((x0 <= x && x1 > x) || (x1 <= x && x0 > x))
          ys.push(y0 + ((x - x0) * (y1 - y0)) / (x1 - x0));
      }
  return pair(ys);
}

function pair(vs) {
  vs.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < vs.length; i += 2) {
    const seg = [vs[i], vs[i + 1]];
    const prev = out[out.length - 1];
    if (prev && seg[0] - prev[1] < 1e-4) prev[1] = Math.max(prev[1], seg[1]);
    else if (seg[1] - seg[0] > 1e-4) out.push(seg);
  }
  return out;
}

function mpBBox(mp) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of mp)
    for (const p of poly[0]) {
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    }
  return { x0, y0, x1, y1 };
}

function ringBBox(r) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of r) {
    if (p[0] < x0) x0 = p[0];
    if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[1] > y1) y1 = p[1];
  }
  return { x0, y0, x1, y1 };
}

/** Every interior ring in the multipolygon, largest first. */
function holes(mp) {
  const out = [];
  for (const poly of mp) for (let i = 1; i < poly.length; i++) out.push(poly[i]);
  return out.sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)));
}

function countRings(mp) {
  return { polys: mp.length, rings: mp.reduce((n, p) => n + p.length, 0) };
}

/* ══════════════════════════════════════════════════════════════════ the A ══ */

function stripCrossbar(pc, mpA, report) {
  const hs = holes(mpA);
  if (!hs.length) throw new Error('A: no enclosed counter found — cannot locate the crossbar');
  const counter = hs[0];
  const cb = ringBBox(counter);
  const gb = mpBBox(mpA);

  // Counter's bottom edge = the crossbar's top edge.
  const band = cb.y0 + 0.02 * (cb.y1 - cb.y0);
  const low = counter.filter((p) => p[1] <= band);
  const CL = low.reduce((a, p) => (p[0] < a[0] ? p : a), low[0]);
  const CR = low.reduce((a, p) => (p[0] > a[0] ? p : a), low[0]);

  // Crossbar's bottom edge: the scanline where one solid span splits in two.
  const nSpans = (y) => scanX(mpA, y).length;
  let lo = gb.y0 + 0.04 * (gb.y1 - gb.y0);
  let hi = cb.y0 - 1e-3;
  if (nSpans(lo) < 2) throw new Error('A: legs never separate below the crossbar');
  if (nSpans(hi) !== 1) throw new Error('A: no solid crossbar span under the counter');
  for (let i = 0; i < 60 && hi - lo > 1e-5; i++) {
    const mid = (lo + hi) / 2;
    if (nSpans(mid) === 1) hi = mid;
    else lo = mid;
  }
  const spans = scanX(mpA, lo);
  const GL = [spans[0][1], lo];
  const GR = [spans[spans.length - 1][0], lo];

  const bridge = [[[[CL[0], CL[1]], [CR[0], CR[1]], [GR[0], GR[1]], [GL[0], GL[1]], [CL[0], CL[1]]]]];
  const cut = pc.union([[counter.slice()]], bridge);
  const out = pc.difference(mpA, cut);

  if (report) {
    report.a = {
      counterVerts: counter.length - 1,
      counterBBox: cb,
      crossbarTop: [CL, CR],
      crossbarBottom: [GL, GR],
      crossbarThickness: +(CL[1] - lo).toFixed(3),
      before: countRings(mpA),
      after: countRings(out),
    };
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════ the R ══ */

function measureR(mpR) {
  const gb = mpBBox(mpR);
  const hs = holes(mpR);
  if (!hs.length) throw new Error('R: no bowl counter found');
  const cb = ringBBox(hs[0]);

  // Stem: first ink span on a scanline just above the baseline.
  const yScan = gb.y0 + 0.10 * (gb.y1 - gb.y0);
  const spans = scanX(mpR, yScan);
  const stemL = spans[0][0];
  const stemR = cb.x0; // the counter's left wall IS the stem's right edge
  const stemT = stemR - stemL;
  if (!(stemT > 0)) throw new Error('R: could not measure the stem');

  // Vertical probe just right of the stem: isolates the bowl's two strokes.
  const probeX = stemR + 0.8 * stemT;
  const ivs = scanY(mpR, probeX);
  const under = ivs.filter((v) => v[1] <= cb.y0 + 1e-3);
  const over = ivs.filter((v) => v[0] >= cb.y1 - 1e-3);
  if (!under.length) throw new Error('R: no bowl-bottom stroke beside the stem');
  if (!over.length) throw new Error('R: no bowl-top stroke beside the stem');
  const bottomStroke = under.reduce((a, v) => (Math.abs(v[1] - cb.y0) < Math.abs(a[1] - cb.y0) ? v : a));
  const topStroke = over.reduce((a, v) => (Math.abs(v[0] - cb.y1) < Math.abs(a[0] - cb.y1) ? v : a));

  return { gb, cb, stemL, stemR, stemT, probeX, bottomStroke, topStroke };
}

/** Total length over which two interval lists overlap. */
function overlapLen(a, b) {
  let t = 0;
  for (const p of a)
    for (const q of b) t += Math.max(0, Math.min(p[1], q[1]) - Math.max(p[0], q[0]));
  return t;
}

/**
 * How far right the bowl's lower stroke can be removed.
 *
 * The leg is welded to the underside of the bowl over a short stretch; that
 * weld is the whole junction, and it tapers to nothing at the abscissa where
 * the leg finally slides out from under the bowl. Cut past that point and the
 * leg floats free of the letter; cut close to it and the letter hangs together
 * on a hairline. So the return is removed out to where the weld has narrowed
 * to `keep` (half a stem by default) — the whole flat return and the start of
 * the corner go, and what is left is a junction still half a stem deep.
 *
 * Returns { x, weld }, both in cap-100 units.
 */
function returnEndX(pc, legRing, restMp, m, keep) {
  const legMp = [[legRing.slice()]];
  const weldAt = (x) => overlapLen(scanY(legMp, x), scanY(restMp, x));
  const x0 = m.stemR;
  const x1 = m.cb.x1;
  const N = 600;
  let peak = x0;
  let peakW = -1;
  for (let i = 0; i <= N; i++) {
    const x = x0 + ((x1 - x0) * i) / N;
    const w = weldAt(x);
    if (w > peakW) {
      peakW = w;
      peak = x;
    }
  }
  if (peakW <= keep) return { x: peak, weld: peakW }; // weld never gets that deep
  let lo = peak;
  let hi = x1;
  for (let i = 0; i < 60 && hi - lo > 1e-5; i++) {
    const mid = (lo + hi) / 2;
    if (weldAt(mid) > keep) lo = mid;
    else hi = mid;
  }
  return { x: lo, weld: weldAt(lo) };
}

/**
 * The leg's own contour: it lands on the baseline, reaches the glyph's right
 * extreme, starts to the right of the stem, and stops well short of the cap
 * line (the stem and the bowl both reach it). Null if that does not single out
 * exactly one contour.
 */
function findLegRing(rings, gb, stemR) {
  const H = gb.y1 - gb.y0;
  const hit = rings.filter((r) => {
    const b = ringBBox(r);
    return (
      b.y0 <= gb.y0 + 1e-3 &&
      b.x1 >= gb.x1 - 1e-3 &&
      b.x0 > stemR - 1e-3 &&
      b.y1 < gb.y0 + 0.8 * H
    );
  });
  return hit.length === 1 ? hit[0] : null;
}

/** Unit vector down the leg, read off the leg contour's longest edge. */
function legAxis(ring) {
  let dir = null;
  let best = -1;
  for (let i = 0; i < ring.length - 1; i++) {
    const dx = ring[i + 1][0] - ring[i][0];
    const dy = ring[i + 1][1] - ring[i][1];
    const l = Math.hypot(dx, dy);
    if (l > best) {
      best = l;
      dir = [dx, dy];
    }
  }
  const sgn = dir[0] < 0 ? -1 : 1; // orient down-and-to-the-right
  return [(sgn * dir[0]) / best, (sgn * dir[1]) / best];
}

/** The open-bowl cutter's rectangle: a slab across the bowl's return. */
function openBowlRect(m, gap, pad) {
  return [m.stemR, m.bottomStroke[0] - pad, m.stemR + gap, m.bottomStroke[1] + pad];
}

function rectMp([x0, y0, x1, y1]) {
  return [[[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]];
}

/**
 * The widest open-bowl gap this drawing admits before the leg floats free.
 *
 * Bisected on the only property that matters — does the R still resolve to ONE
 * polygon? — rather than on any proxy for it, because the proxies lie: the
 * `fusionEndX` measure ('openbowl-full' uses it) tracks where leg and bowl part
 * company *below the counter*, which at the heavier weights is well past the
 * abscissa at which the slab has already eaten the junction.
 *
 * Returns Infinity when the letterform never splits at any cut this side of the
 * glyph's right edge.
 */
function openBowlCeiling(pc, mpR, m, pad, seed) {
  const whole = (g) => pc.difference(mpR, rectMp(openBowlRect(m, g, pad))).length === 1;
  const limit = m.gb.x1 - m.stemR; // beyond this the slab has left the glyph

  let lo = Math.min(seed, 0.25 * m.stemT);
  if (!(lo > 0) || !whole(lo)) throw new Error('R: even a minimal open-bowl cut splits the letter');

  let hi = Math.max(seed, lo);
  while (hi < limit && whole(hi)) hi = Math.min(hi * 1.5, limit);
  if (whole(hi)) return Infinity;

  for (let i = 0; i < 60 && hi - lo > 1e-4; i++) {
    const mid = (lo + hi) / 2;
    if (whole(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The half-plane { p·u <= c } as a polygon large enough to cover the glyph. */
function halfPlane(u, c, span) {
  const v = [-u[1], u[0]];
  const P = [c * u[0], c * u[1]];
  const A = [P[0] + v[0] * span, P[1] + v[1] * span];
  const B = [P[0] - v[0] * span, P[1] - v[1] * span];
  const C = [B[0] - u[0] * 2 * span, B[1] - u[1] * 2 * span];
  const D = [A[0] - u[0] * 2 * span, A[1] - u[1] * 2 * span];
  return [[[A, B, C, D, A]]];
}

function amputateR(pc, mpR, variant, gapRatio, report, rings, legMargin) {
  const m = measureR(mpR);
  let gap = gapRatio * m.stemT;
  const pad = 0.6;
  let rect = null;
  let cutter = null;
  const extra = {};

  if (variant === 'openbowl') {
    // Kill the run where the bowl returns and rejoins the stem — as much of it
    // as the letterform will give up while the leg stays welded to the bowl.
    const want = gap;
    // legMargin === null asks for the ratio LITERALLY, ceiling and all. Nothing
    // should ship that way - it is how the proof sheets show what a ratio does
    // to the letterform when nothing stops it.
    const ceiling = legMargin === null ? Infinity : openBowlCeiling(pc, mpR, m, pad, want);
    const allowed = ceiling === Infinity ? Infinity : ceiling - legMargin * m.stemT;
    if (!(allowed > 0)) throw new Error('R: no open-bowl cut leaves the leg attached');
    gap = Math.min(want, allowed);
    extra.gapRequested = +want.toFixed(3);
    extra.gapRatioRequested = +gapRatio.toFixed(3);
    extra.gapCeiling = ceiling === Infinity ? null : +ceiling.toFixed(3);
    extra.gapClamped = gap < want - 1e-6;
    extra.gapRatioAchieved = +(gap / m.stemT).toFixed(3);
    rect = openBowlRect(m, gap, pad);
  } else if (variant === 'openbowl-full') {
    // Kill the return outright: out to where the weld that holds the leg under
    // the bowl is down to half a stem. The lower edge sits exactly on the
    // bowl's outer bottom, so the leg's new top edge lies on the line the
    // removed return used to draw. `gapRatio` plays no part.
    if (!rings) throw new Error('R: "openbowl-full" needs the raw glyph contours');
    const leg = findLegRing(rings, m.gb, m.stemR);
    if (!leg) throw new Error('R: cannot single out the leg contour for "openbowl-full"');
    const rest = resolveFill(pc, rings.filter((r) => r !== leg));
    const keep = 0.5 * m.stemT;
    const e = returnEndX(pc, leg, rest, m, keep);
    gap = e.x - m.stemR;
    extra.returnEndX = +e.x.toFixed(3);
    extra.weldKept = +e.weld.toFixed(3);
    extra.gapRatioAchieved = +(gap / m.stemT).toFixed(3);
    rect = [m.stemR, m.bottomStroke[0], e.x, m.bottomStroke[1] + pad];
  } else if (variant === 'cutshoulder') {
    // Kill the bowl's top where it leaves the stem.
    rect = [m.stemR, m.topStroke[0] - pad, m.stemR + gap, m.topStroke[1] + pad];
  } else if (variant === 'cutstem') {
    // Kill a slice of the stem immediately below the bowl junction.
    rect = [m.stemL - pad, m.bottomStroke[0] - gap, m.stemR + pad, m.bottomStroke[0]];
  } else if (variant === 'detachedleg') {
    // Push the leg `gap` down its own axis, measured from the deepest point at
    // which it is still fused to the bowl. Clipped to the leg contour, so the
    // bowl closes onto the stem exactly as the font drew it.
    if (!rings) throw new Error('R: "detachedleg" needs the raw glyph contours');
    const leg = findLegRing(rings, m.gb, m.stemR);
    if (!leg) throw new Error('R: cannot single out the leg contour for "detachedleg"');
    const u = legAxis(leg);
    const legMp = [[leg.slice()]];
    const rest = resolveFill(pc, rings.filter((r) => r !== leg));
    const joint = pc.intersection(legMp, rest);
    if (!joint.length) throw new Error('R: the leg does not touch the rest of the letter');
    let t0 = -Infinity;
    for (const poly of joint)
      for (const ring of poly)
        for (const p of ring) t0 = Math.max(t0, p[0] * u[0] + p[1] * u[1]);
    // Only the leg's OWN material may go: where the leg lies inside the bowl it
    // is also the bowl, and the bowl must close onto the stem untouched.
    const legOnly = pc.difference(legMp, rest);
    const span = 4 * Math.max(m.gb.x1 - m.gb.x0, m.gb.y1 - m.gb.y0);
    cutter = pc.intersection(legOnly, halfPlane(u, t0 + gap, span));
    extra.legAxis = u.map((v) => +v.toFixed(4));
    extra.junctionT = +t0.toFixed(3);
    extra.cutPlaneT = +(t0 + gap).toFixed(3);
  } else {
    throw new Error(`unknown rVariant "${variant}"`);
  }

  if (!cutter) {
    const [rx0, ry0, rx1, ry1] = rect;
    cutter = [[[[rx0, ry0], [rx1, ry0], [rx1, ry1], [rx0, ry1], [rx0, ry0]]]];
  }
  const out = pc.difference(mpR, cutter);

  if (report) {
    report.r = {
      variant,
      stem: { left: +m.stemL.toFixed(3), right: +m.stemR.toFixed(3), thickness: +m.stemT.toFixed(3) },
      counterBBox: m.cb,
      bottomStroke: m.bottomStroke.map((v) => +v.toFixed(3)),
      topStroke: m.topStroke.map((v) => +v.toFixed(3)),
      gap: +gap.toFixed(3),
      rect: rect ? rect.map((v) => +v.toFixed(3)) : null,
      ...extra,
      before: countRings(mpR),
      after: countRings(out),
    };
  }
  return out;
}

/* ═════════════════════════════════════════════════════════════════ public ══ */

export async function loadFont(fontPath, weight = null, deps = null) {
  const { fontkit } = await resolveDeps(deps);
  let font = fontkit.create(readFileSync(fontPath));
  if (weight && typeof font.getVariation === 'function' && font.variationAxes && font.variationAxes.wght)
    font = font.getVariation({ wght: weight });
  return font;
}

/**
 * Build the logotype as pure filled outlines.
 * Returns `{ svg, d, width, height, bbox, meta }`; `d` is already y-flipped
 * with its origin at the ink's top-left, so a caller can drop it straight into
 * a `<g transform="translate(x y)">`.
 */
export async function buildLogotype({
  fontPath,
  weight = null,
  font: preloaded = null,
  text = 'SERSAN',
  tracking = 0.3,
  capHeight = 100,
  aCrossbar = 'none', // 'none' | 'keep'
  // 'none' | 'openbowl' | 'openbowl-full' | 'cutstem' | 'cutshoulder' | 'detachedleg'
  rVariant = 'openbowl',
  // The brand cut. 3.0 is the art director's pick off design/logo-exploration/
  // png/_R_treatments.png (tile 03), replacing the 1.6 that shipped until
  // 2026-08-18 and read as far too subtle against the reference artwork.
  // 'openbowl' clamps it per weight to what the drawing can take — see
  // `openBowlCeiling` and the `gapClamped` / `gapRatioAchieved` report fields.
  gapRatio = 3.0,
  // How much stem-width of welded junction the open-bowl cut must leave between
  // the leg and the bowl. 0 would cut exactly to the point where the leg lets
  // go; this keeps a real neck there, so integer rounding at font-build time
  // cannot turn a hairline join into a broken letter. null disables the ceiling
  // altogether and honours `gapRatio` literally - for proof sheets only, since
  // past the ceiling the leg comes away as a second, floating contour.
  legMargin = 0.15,
  tolerance = 0.03,
  ink = '#0B1422',
  deps = null,
} = {}) {
  const { polygonClipping: pc } = await resolveDeps(deps);
  const font = preloaded || (await loadFont(fontPath, weight, deps));

  const upm = font.unitsPerEm;
  let cap = font.capHeight;
  if (!cap) cap = font.layout('H').glyphs[0].bbox.maxY;
  const s = capHeight / cap; // font units → cap-100 units
  const meta = { font: font.familyName, upm, capUnits: cap, scale: s, letters: [], reports: {} };

  const run = font.layout(text);
  const track = tracking * upm * s;

  let pen = 0;
  const placed = [];
  for (let i = 0; i < run.glyphs.length; i++) {
    const glyph = run.glyphs[i];
    const ch = text[i];
    const rings = flattenGlyph(glyph, s, tolerance);
    let mp = resolveFill(pc, rings);

    const report = {};
    if (ch === 'A' && aCrossbar === 'none') mp = stripCrossbar(pc, mp, report);
    if (ch === 'R' && rVariant !== 'none')
      mp = amputateR(pc, mp, rVariant, gapRatio, report, rings, legMargin);
    if (report.a || report.r) meta.reports[`${ch}${i}`] = report.a || report.r;

    const dx = pen + run.positions[i].xOffset * s;
    const moved = mp.map((poly) => poly.map((ring) => ring.map((p) => [p[0] + dx, p[1]])));
    const bb = mpBBox(moved);
    placed.push(moved);
    meta.letters.push({
      ch,
      x0: +bb.x0.toFixed(3),
      x1: +bb.x1.toFixed(3),
      rings: countRings(moved),
    });
    pen += run.positions[i].xAdvance * s + track;
  }

  const all = placed.flat();
  const bb = mpBBox(all);
  const width = bb.x1 - bb.x0;
  const height = bb.y1 - bb.y0;

  // gaps between neighbouring letters (negative ⇒ overlap)
  meta.gaps = [];
  for (let i = 1; i < meta.letters.length; i++)
    meta.gaps.push(+(meta.letters[i].x0 - meta.letters[i - 1].x1).toFixed(3));
  meta.minGap = meta.gaps.length ? Math.min(...meta.gaps) : null;

  const r3 = (v) => (Math.round(v * 1000) / 1000).toString();
  let d = '';
  for (const poly of all)
    for (const ring of poly) {
      for (let i = 0; i < ring.length - 1; i++) {
        const x = ring[i][0] - bb.x0;
        const y = bb.y1 - ring[i][1];
        d += (i ? 'L' : 'M') + r3(x) + ' ' + r3(y);
      }
      d += 'Z';
    }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r3(width)} ${r3(height)}" ` +
    `width="${r3(width)}" height="${r3(height)}" role="img" aria-label="${text}">` +
    `<path fill="${ink}" fill-rule="evenodd" d="${d}"/></svg>`;

  return { svg, d, width, height, bbox: bb, meta };
}

export { resolveFill, flattenGlyph, scanX, scanY, mpBBox, holes, countRings };
