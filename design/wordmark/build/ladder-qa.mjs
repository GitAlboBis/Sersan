// Geometry QA on the SHIPPED woff2 faces in src/fonts/ — not on the build
// intermediates. Thin-stem boolean cuts are the risky case (a heavier weight
// can close the R gap or leave a nub of crossbar on a leg), so every claim the
// eye would make about the proof sheets is asserted numerically here.
//
// Per face:
//   1  A resolves to exactly ONE contour (an A with any crossbar left would
//      still enclose its counter, i.e. 2 rings), and R to exactly TWO — the
//      stem+bowl, and the leg standing free. The R's second contour is the
//      DELIBERATE consequence of cutting past the severing ceiling: stopped at
//      that ceiling the cut showed no daylight at all, because the leg is
//      diagonal and the two pieces still touched. Neither glyph may enclose a
//      counter — the A's is cut away, the R's bowl is open at the bottom — so
//      "2 contours" for the R means two OUTER rings, never an outline + a hole.
//   2  A span profile: exactly one 1-span -> 2-span transition down the glyph,
//      never 3 spans, and never a return to 1. A leftover crossbar bridge shows
//      up as a re-merge; a nub shows up as an extra span or as a break in the
//      monotonic march of the two inner leg edges.
//   3  R cut genuinely open and genuinely saturated: no ink anywhere in the cut
//      band, from the stem's right edge out to the glyph's right extreme — in
//      particular no SPUR of the bowl's outer bottom left standing, which is
//      what a slab that stopped short of saturation leaves behind.
//   4  Everything outside the cut is the untouched typeface, scanline by
//      scanline, against the pinned instance the face was carved from.
//   5  No degenerate contour: >= 3 points, non-zero area, no zero-length edge,
//      no self-intersection.
//   6  Every glyph OTHER than A and R is identical to the source face, outline
//      command for outline command and advance for advance. 230 of the 232
//      glyphs must not have moved at all.
//   7  The two pieces are the letter's two halves, not a body plus a crumb:
//      both carry real area and a real stroke width (no sliver, no spur), they
//      do not overlap, the piece holding the stem at the baseline is not the
//      piece holding the leg's foot, and the free leg stays inside both the R's
//      advance and the untouched R's silhouette — a piece that drifted into the
//      neighbouring letter would be a hard fail. The DAYLIGHT between the two
//      pieces is measured here: it is the number the whole change exists for.
import {
  flattenGlyph,
  resolveFill,
  scanX,
  scanY,
  mpBBox,
  countRings,
} from "file:///C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/logotype.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

async function dep(name, entries, probe) {
  const tries = [name];
  for (const dir of (process.env.LOGOTYPE_MODULE_PATHS || "").split(path.delimiter).filter(Boolean))
    for (const e of entries) tries.push(pathToFileURL(path.join(dir, name, e)).href);
  for (const t of tries) {
    try {
      const m = await import(t);
      return m.default && probe(m.default) ? m.default : m;
    } catch {
      /* next */
    }
  }
  throw new Error(`cannot resolve "${name}" — set LOGOTYPE_MODULE_PATHS`);
}
const fontkit = await dep("fontkit", ["dist/module.mjs", "dist/main.cjs"], (m) => m.create);
const pc = await dep(
  "polygon-clipping",
  ["dist/polygon-clipping.esm.js", "dist/polygon-clipping.cjs.js"],
  (m) => m.union
);

const FONTS = "C:/Users/alber/Desktop/sersan-v2-main/src/fonts/";
const INST = "C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/build/instances/";
const HERE = "C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/build/";
const WEIGHTS = [200, 220, 240, 260, 280, 300, 340];
// The face each shipped weight was actually carved from. 200 and 300 come from
// the two static fontsource faces (patch.py); the rest from the pinned variable
// instances (ladder-patch.py). Comparing a face against the wrong one of these
// would charge it with sub-unit differences it did not introduce.
const SOURCE = (w) =>
  w === 200 || w === 300 ? `${HERE}jost-latin-${w}-normal.woff2` : `${INST}jost-var-${w}.ttf`;
const AMP = JSON.parse(readFileSync("amputated-ladder.json", "utf8"));
const TOL = 0.02;
// The hero sets the wordmark at roughly cap 72px, so daylight is reported in
// CSS px there as well as in font units: it is the number a person can see.
const HERO_CAP_PX = 72;

const fill = (font, ch) => resolveFill(pc, flattenGlyph(font.layout(ch).glyphs[0], 1, TOL));

/* ─────────────────────────────────────────────────── degenerate / simple ── */
function ringChecks(ring) {
  const r = ring.slice(0, -1); // drop the repeated closing point
  const issues = [];
  if (r.length < 3) issues.push(`only ${r.length} points`);
  let area = 0;
  for (let i = 0; i < r.length; i++) {
    const a = r[i];
    const b = r[(i + 1) % r.length];
    area += a[0] * b[1] - b[0] * a[1];
    if (a[0] === b[0] && a[1] === b[1]) issues.push(`zero-length edge at ${i}`);
  }
  if (Math.abs(area / 2) < 1) issues.push(`near-zero area ${(area / 2).toFixed(3)}`);

  // proper self-intersection between non-adjacent edges
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const sgn = (v) => (v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0);
  for (let i = 0; i < r.length; i++) {
    const p1 = r[i];
    const p2 = r[(i + 1) % r.length];
    for (let j = i + 2; j < r.length; j++) {
      if (i === 0 && j === r.length - 1) continue; // adjacent through the wrap
      const q1 = r[j];
      const q2 = r[(j + 1) % r.length];
      const d1 = sgn(cross(p1, p2, q1));
      const d2 = sgn(cross(p1, p2, q2));
      const d3 = sgn(cross(q1, q2, p1));
      const d4 = sgn(cross(q1, q2, p2));
      if (d1 * d2 < 0 && d3 * d4 < 0) issues.push(`edges ${i} x ${j} cross`);
    }
  }
  return { area: area / 2, pts: r.length, issues };
}

/* ────────────────────────────────────────────────────────── the A profile ── */
function checkA(mp) {
  const bb = mpBBox(mp);
  const H = bb.y1 - bb.y0;
  const N = 1200;
  const prof = [];
  for (let i = 1; i < N; i++) {
    const y = bb.y0 + (H * i) / N;
    prof.push({ y, spans: scanX(mp, y) });
  }
  const counts = prof.map((p) => p.spans.length);
  const over = counts.filter((c) => c > 2).length;
  // transitions walking DOWN the glyph (from the apex to the baseline)
  const down = counts.slice().reverse();
  let transitions = 0;
  for (let i = 1; i < down.length; i++) if (down[i] !== down[i - 1]) transitions++;
  const remerge = (() => {
    let seenTwo = false;
    for (const c of down) {
      if (c === 2) seenTwo = true;
      else if (seenTwo && c === 1) return true;
    }
    return false;
  })();

  // inner leg edges must open monotonically as we descend
  const two = prof.filter((p) => p.spans.length === 2);
  let worstL = 0;
  let worstR = 0;
  for (let i = 1; i < two.length; i++) {
    // `two` runs bottom-up, so descending = walking backwards
    const hi = two[i];
    const lo = two[i - 1];
    worstL = Math.max(worstL, lo.spans[0][1] - hi.spans[0][1]); // left leg inner edge should move LEFT going down
    worstR = Math.max(worstR, hi.spans[1][0] - lo.spans[1][0]); // right leg inner edge should move RIGHT going down
  }
  const gapMin = Math.min(...two.map((p) => p.spans[1][0] - p.spans[0][1]));
  return { over, transitions, remerge, worstL, worstR, twoRows: two.length, gapMin };
}

/* ──────────────────────────────────────────────────────────── the R's band ── */
// The cut band, measured off the build report and walked scanline by scanline
// on the SHIPPED outline. Every scrap of ink right of the stem's right edge has
// to be gone — not merely as far as the slab ran, but out to the glyph's right
// extreme, because the slab was run to saturation precisely so that nothing of
// the bowl's outer bottom could survive standing in the daylight.
//
// The band is inset one unit top and bottom: rounding the outline to integer
// font units puts the cut edges within half a unit of the band's own edges, and
// a half-unit rounding sliver on the boundary is not ink in the corridor.
function checkR(mp, rep, k) {
  const stemR = rep.stem.right * k;
  const gap = rep.gap * k;
  const yA = rep.rect[1] * k + 1;
  const yB = rep.rect[3] * k - 1;
  const bb = mpBBox(mp);
  const N = 600;
  const dy = (yB - yA) / N;
  let inBand = 0; // area of surviving ink in the band, right of the stem
  let maxX = -Infinity; // how far right it reaches — a spur's fingerprint
  let rows = 0;
  for (let i = 0; i < N; i++) {
    const y = yA + (i + 0.5) * dy;
    let hit = false;
    for (const [a, b] of scanX(mp, y)) {
      const l = Math.max(a, stemR + 1); // clear of the stem's own rounded edge
      if (b <= l) continue;
      inBand += (b - l) * dy;
      if (b > maxX) maxX = b;
      hit = true;
    }
    if (hit) rows++;
  }
  return {
    stemR,
    gap,
    slabEnd: stemR + gap,
    glyphEnd: bb.x1,
    bandH: yB - yA + 2,
    inBand,
    rows,
    spurAt: maxX === -Infinity ? null : maxX,
  };
}

/* ─────────────────────────────────────────── outside-the-cut equivalence ── */
// Area, not scanlines. A scanline comparison of a flattened+integer-rounded
// outline against the source's true curves explodes wherever the outline runs
// near-horizontal (half a unit of vertical rounding becomes several units of
// horizontal span there), which says nothing about the shape. Set algebra does
// not have that failure mode:
//
//   added   = shipped \ source   must be ~0: the cut may only ever REMOVE ink,
//             so any added area is rounding and nothing else.
//   removed = source \ shipped   must lie entirely inside the intended cut box.
//
// Both areas are also reported as a mean edge deviation (area / perimeter), the
// units-per-edge figure that rounding is allowed to produce (<= 0.5u).
function mpArea(mp) {
  let a = 0;
  for (const poly of mp)
    for (let i = 0; i < poly.length; i++) {
      const ring = poly[i];
      let s = 0;
      for (let j = 0; j < ring.length - 1; j++)
        s += ring[j][0] * ring[j + 1][1] - ring[j + 1][0] * ring[j][1];
      a += (i === 0 ? 1 : -1) * Math.abs(s / 2);
    }
  return a;
}

function mpPerimeter(mp) {
  let p = 0;
  for (const poly of mp)
    for (const ring of poly)
      for (let j = 0; j < ring.length - 1; j++)
        p += Math.hypot(ring[j + 1][0] - ring[j][0], ring[j + 1][1] - ring[j][1]);
  return p;
}

// Rounding to integer font units leaves half-unit slivers along the ENTIRE
// outline, so "removed" is the real cut plus a hairline all the way round the
// glyph — its bounding box is therefore the whole glyph and says nothing. Split
// it by the cut box instead and weigh the two parts: everything inside is the
// amputation, everything outside must be sliver-thin.
function cutFidelity(shipped, source, cutBox) {
  const [x0, y0, x1, y1] = cutBox;
  const box = [[[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]];
  const metric = (mp) =>
    mp && mp.length
      ? { area: mpArea(mp), dev: mpArea(mp) / Math.max(1, mpPerimeter(mp)) }
      : { area: 0, dev: 0 };

  const added = pc.difference(shipped, source);
  const removed = pc.difference(source, shipped);
  return {
    added: metric(added),
    inCut: metric(removed.length ? pc.intersection(removed, box) : []),
    outCut: metric(removed.length ? pc.difference(removed, box) : []),
  };
}

/* ------------------------------ every other glyph must be the untouched face -- */
// Outline command stream + advance, glyph by glyph, over the WHOLE glyph order —
// not a sample of the alphabet. Both files are TrueType with integer
// coordinates and the patch only ever replaces glyf entries in place, so the
// two share a glyph order and "same commands, same advance" is identity of the
// drawing; nothing here can be true by accident.
function glyphSig(glyph) {
  const cmds = glyph.path.commands
    .map((c) => c.command + "(" + c.args.map((v) => Math.round(v * 1e4) / 1e4).join(",") + ")")
    .join(" ");
  return `${glyph.advanceWidth}|${cmds}`;
}

function untouchedGlyphs(shipped, source) {
  if (shipped.numGlyphs !== source.numGlyphs)
    return { n: 0, moved: [`glyph count ${shipped.numGlyphs} vs ${source.numGlyphs}`] };
  const cut = new Set(
    ["A", "R"].map((c) => shipped.glyphForCodePoint(c.codePointAt(0)).id)
  );
  const moved = [];
  let n = 0;
  for (let id = 0; id < shipped.numGlyphs; id++) {
    if (cut.has(id)) continue;
    n++;
    if (glyphSig(shipped.getGlyph(id)) !== glyphSig(source.getGlyph(id))) moved.push(`gid${id}`);
  }
  return { n, moved };
}

/* ------------------------------------------ the two pieces, and the light -- */
// Shortest distance between two segments, and from it between two polygons'
// boundaries. The pieces being disjoint, that distance IS the daylight the eye
// reads across the cut.
function segDist(a, b, c, d) {
  const d1 = [b[0] - a[0], b[1] - a[1]];
  const d2 = [d[0] - c[0], d[1] - c[1]];
  const r = [a[0] - c[0], a[1] - c[1]];
  const A = d1[0] * d1[0] + d1[1] * d1[1];
  const E = d2[0] * d2[0] + d2[1] * d2[1];
  const F = d2[0] * r[0] + d2[1] * r[1];
  let s = 0;
  let t = 0;
  if (A <= 1e-12 && E <= 1e-12) return Math.hypot(r[0], r[1]);
  if (A <= 1e-12) t = Math.min(1, Math.max(0, F / E));
  else {
    const C = d1[0] * r[0] + d1[1] * r[1];
    if (E <= 1e-12) s = Math.min(1, Math.max(0, -C / A));
    else {
      const B = d1[0] * d2[0] + d1[1] * d2[1];
      const den = A * E - B * B;
      s = den !== 0 ? Math.min(1, Math.max(0, (B * F - C * E) / den)) : 0;
      t = (B * s + F) / E;
      if (t < 0) {
        t = 0;
        s = Math.min(1, Math.max(0, -C / A));
      } else if (t > 1) {
        t = 1;
        s = Math.min(1, Math.max(0, (B - C) / A));
      }
    }
  }
  return Math.hypot(a[0] + d1[0] * s - (c[0] + d2[0] * t), a[1] + d1[1] * s - (c[1] + d2[1] * t));
}

function polyDistance(pa, pb) {
  let best = Infinity;
  for (const ra of pa)
    for (let i = 0; i < ra.length - 1; i++)
      for (const rb of pb)
        for (let j = 0; j < rb.length - 1; j++)
          best = Math.min(best, segDist(ra[i], ra[i + 1], rb[j], rb[j + 1]));
  return best;
}

function pointInRing(pt, r) {
  let inside = false;
  for (let i = 0, j = r.length - 2; i < r.length - 1; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

/** Index of the polygon whose filled area owns `pt`, or -1. */
function ownerOf(pt, mp) {
  for (let i = 0; i < mp.length; i++) {
    if (!pointInRing(pt, mp[i][0])) continue;
    let inHole = false;
    for (let h = 1; h < mp[i].length; h++) if (pointInRing(pt, mp[i][h])) inHole = true;
    if (!inHole) return i;
  }
  return -1;
}

// The R as the cut leaves it. `srcMp` is the untouched glyph's fill, `advance`
// the R's advance width — both in font units.
function checkPieces(mp, rep, k, srcMp, advance) {
  const bb = mpBBox(mp);
  const stem = rep.stem.thickness * k;
  const pieces = mp.map((poly) => {
    const area = Math.abs(mpArea([poly]));
    const per = mpPerimeter([poly]);
    return { area, meanWidth: (2 * area) / Math.max(1, per), bbox: mpBBox([poly]), rings: poly.length };
  });

  // Which piece holds the stem at the baseline, which the leg's foot?
  const y = bb.y0 + 0.04 * (bb.y1 - bb.y0);
  const row = scanX(mp, y);
  const stemOwner = row.length ? ownerOf([(row[0][0] + row[0][1]) / 2, y], mp) : -1;
  const legOwner = row.length
    ? ownerOf([(row[row.length - 1][0] + row[row.length - 1][1]) / 2, y], mp)
    : -1;

  const daylight =
    mp.length > 1
      ? Math.min(...mp.flatMap((a, i) => mp.slice(i + 1).map((b2) => polyDistance(a, b2))))
      : null;

  let overlap = 0;
  for (let i = 0; i < mp.length; i++)
    for (let j = i + 1; j < mp.length; j++) {
      const x = pc.intersection([mp[i]], [mp[j]]);
      if (x.length) overlap += Math.abs(mpArea(x));
    }

  // The free leg must not have wandered: inside the R's advance, and inside the
  // untouched R's own silhouette (the cut may only ever REMOVE ink).
  const legIdx = legOwner >= 0 && legOwner !== stemOwner ? legOwner : -1;
  const leg = legIdx >= 0 ? pieces[legIdx] : null;
  const strayed = legIdx >= 0 ? pc.difference([mp[legIdx]], srcMp) : [];
  const strayArea = strayed.length ? Math.abs(mpArea(strayed)) : 0;
  return {
    pieces,
    stem,
    stemOwner,
    legOwner,
    daylight,
    overlap,
    leg,
    strayArea,
    // as a mean edge deviation: rounding to integer units is allowed to lift
    // the outline half a unit off the true curve, all the way round
    strayDev: leg ? strayArea / Math.max(1, mpPerimeter([mp[legIdx]])) : 0,
    outsideAdvance: leg ? Math.max(0, -leg.bbox.x0) + Math.max(0, leg.bbox.x1 - advance) : 0,
    advance,
  };
}


/* ═══════════════════════════════════════════════════════════════════ run ══ */
// Everything measured here is also written to ladder-qa.json, so the proof
// sheets caption themselves off the SHIPPED outlines rather than off a number
// re-derived in the drawing code.
const record = [];
let fails = 0;
const bad = (cond, msg) => {
  if (cond) {
    fails++;
    return ` *** FAIL ${msg}`;
  }
  return "";
};

for (const w of WEIGHTS) {
  const font = fontkit.create(readFileSync(`${FONTS}sersan-display-${w}.woff2`));
  const src = fontkit.create(readFileSync(SOURCE(w)));
  const k = AMP[w].glyphs.A.k;
  const A = fill(font, "A");
  const R = fill(font, "R");
  const srcR = fill(src, "R");
  const advR = font.layout("R").glyphs[0].advanceWidth;
  const cap = font.capHeight;
  const rc = { A: countRings(A), R: countRings(R) };

  let line =
    `wght ${String(w).padStart(3)}  contours A=${rc.A.rings} R=${rc.R.rings} ` +
    `(pieces A=${rc.A.polys} R=${rc.R.polys}, holes A=${rc.A.rings - rc.A.polys} R=${rc.R.rings - rc.R.polys})`;
  line += bad(rc.A.rings !== 1, "A is not a single contour (crossbar remnant?)");
  line += bad(rc.R.polys !== 2, `R is ${rc.R.polys} piece(s), expected 2 (stem+bowl, and the free leg)`);
  line += bad(rc.R.rings !== 2, "R encloses a counter — the bowl did not open, or a ring is nested");

  const a = checkA(A);
  line +=
    `\n         A: spans>2 ${a.over}, 1->2 transitions ${a.transitions}, re-merge ${a.remerge}, ` +
    `min leg gap ${a.gapMin.toFixed(1)}u, inner-edge backtrack L ${a.worstL.toFixed(3)} R ${a.worstR.toFixed(3)}`;
  line += bad(a.over > 0, "A has a scanline with 3+ spans (nub)");
  line += bad(a.transitions !== 1, `A profile has ${a.transitions} transitions, expected 1`);
  line += bad(a.remerge, "A ink re-merges below the apex (crossbar bridge left)");
  line += bad(a.worstL > 0.5 || a.worstR > 0.5, "A inner leg edge backtracks (nub)");

  const rrep = AMP[w].glyphs.R.report;
  const r = checkR(R, rrep, k);
  const sat = rrep.gapSaturation * k;
  const ceil = rrep.gapCeiling == null ? null : rrep.gapCeiling * k;
  line +=
    `\n         R: slab ${r.gap.toFixed(1)}u (${((100 * r.gap) / cap).toFixed(2)}% of cap, ` +
    `${rrep.gapRatioAchieved} x stem) · saturates at ${sat.toFixed(1)}u · ` +
    `severing ceiling ${ceil === null ? "none" : ceil.toFixed(1) + "u"}` +
    `${rrep.pastCeiling ? " — PAST IT, leg free by design" : ""}` +
    `\n         R band: ink surviving right of the stem ${r.inBand.toFixed(1)}u^2 on ${r.rows}/600 ` +
    `scanlines${r.spurAt === null ? "" : `, reaching x=${r.spurAt.toFixed(1)}u`} ` +
    `(band ${r.bandH.toFixed(1)}u tall, slab ends ${r.slabEnd.toFixed(0)}u, glyph ends ${r.glyphEnd.toFixed(0)}u)`;
  line += bad(!rrep.pastCeiling, "R cut is not past the severing ceiling — the leg is still attached");
  line += bad(r.inBand > 4, "R cut band is not clear: a spur of the bowl survives in the daylight");
  line += bad(r.gap < sat, "R slab is narrower than the saturation width");

  const j = checkPieces(R, rrep, k, srcR, advR);
  const minA = Math.min(...j.pieces.map((p) => p.area));
  const minW = Math.min(...j.pieces.map((p) => p.meanWidth));
  line +=
    `\n         R pieces: ` +
    j.pieces
      .map(
        (p, i) =>
          `[${i}] ${p.area.toFixed(0)}u^2, mean stroke ${p.meanWidth.toFixed(1)}u ` +
          `(${(p.meanWidth / j.stem).toFixed(2)} x stem), bbox ${(p.bbox.x1 - p.bbox.x0).toFixed(0)}x${(p.bbox.y1 - p.bbox.y0).toFixed(0)}`
      )
      .join(" · ") +
    `\n         R daylight: ${j.daylight === null ? "NONE (one piece)" : j.daylight.toFixed(1) + "u"}` +
    `${j.daylight === null ? "" : ` = ${((100 * j.daylight) / cap).toFixed(2)}% of cap = ` +
      `${((j.daylight * HERO_CAP_PX) / cap).toFixed(1)} CSS px at cap ${HERO_CAP_PX}px`}` +
    ` · stem piece ${j.stemOwner}, leg piece ${j.legOwner} · overlap ${j.overlap.toFixed(2)}u^2` +
    ` · leg outside the untouched R ${j.strayArea.toFixed(1)}u^2 (dev ${j.strayDev.toFixed(3)}u), ` +
    `outside the advance (${j.advance}u) ${j.outsideAdvance.toFixed(2)}u`;
  line += bad(j.daylight === null, "R shows no daylight — the two pieces are one");
  line += bad(j.daylight !== null && j.daylight < 0.04 * cap, "R daylight under 4% of cap — the cut will not read");
  line += bad(j.stemOwner < 0 || j.legOwner < 0, "R: could not attribute the stem or the leg to a piece");
  line += bad(j.stemOwner === j.legOwner, "R: stem and leg foot belong to the same piece (leg not free)");
  line += bad(minA < 0.05 * j.pieces.reduce((t, p) => t + p.area, 0), "R: one piece is a crumb, not a half of the letter");
  line += bad(minW < 0.5 * j.stem, "R: one piece is a sliver (mean stroke under half a stem)");
  line += bad(j.overlap > 1, "R: the two pieces overlap");
  line += bad(j.strayDev > 0.6, "R: the free leg carries ink the untouched R never had");
  line += bad(j.outsideAdvance > 0.5, "R: the free leg reaches outside the glyph's advance");

  const u = untouchedGlyphs(font, src);
  line +=
    `\n         untouched glyphs: ${u.n - u.moved.length}/${u.n} of the ${font.numGlyphs} in the font ` +
    `identical to the source face, outline command stream and advance`;
  line += bad(u.moved.length > 0, `glyphs other than A/R changed: ${u.moved.join(" ")}`);

  // Intended cut boxes, in font units, straight off the build reports.
  const rep = AMP[w].glyphs.A.report;
  const aBox = [
    Math.min(rep.crossbarTop[0][0], rep.crossbarBottom[0][0]) * k - 1,
    rep.crossbarBottom[0][1] * k - 1,
    Math.max(rep.crossbarTop[1][0], rep.crossbarBottom[1][0]) * k + 1,
    rep.counterBBox.y1 * k + 1,
  ];
  const rr = rrep;
  const rBox = [rr.rect[0] * k - 1, rr.rect[1] * k - 1, rr.rect[2] * k + 1, rr.rect[3] * k + 1];

  const oa = cutFidelity(A, fill(src, "A"), aBox);
  const or = cutFidelity(R, fill(src, "R"), rBox);
  for (const [ch, o] of [
    ["A", oa],
    ["R", or],
  ]) {
    line +=
      `\n         ${ch} vs typeface: ADDED ${o.added.area.toFixed(0)}u^2 (dev ${o.added.dev.toFixed(3)}u) | ` +
      `REMOVED inside cut ${o.inCut.area.toFixed(0)}u^2 | ` +
      `REMOVED outside cut ${o.outCut.area.toFixed(0)}u^2 (dev ${o.outCut.dev.toFixed(3)}u)`;
    line += bad(o.added.dev > 0.6, `${ch}: ink added beyond rounding`);
    line += bad(o.inCut.area < 100, `${ch}: nothing was actually cut`);
    line += bad(o.outCut.dev > 0.6, `${ch}: ink removed outside the intended cut`);
  }

  for (const [ch, mp] of [
    ["A", A],
    ["R", R],
  ])
    for (const poly of mp)
      for (const ring of poly) {
        const c = ringChecks(ring);
        line += `\n         ${ch} ring: ${c.pts} pts, area ${c.area.toFixed(0)}u^2`;
        line += bad(c.issues.length, `${ch}: ${c.issues.slice(0, 3).join("; ")}`);
      }

  record.push({
    weight: w,
    cap,
    contours: { A: rc.A.rings, R: rc.R.rings },
    pieces: { A: rc.A.polys, R: rc.R.polys },
    stem: +j.stem.toFixed(1),
    slab: +r.gap.toFixed(1),
    slabRatioStem: rrep.gapRatioAchieved,
    saturation: +sat.toFixed(1),
    severingCeiling: ceil === null ? null : +ceil.toFixed(1),
    pastCeiling: rrep.pastCeiling,
    daylight: j.daylight === null ? null : +j.daylight.toFixed(1),
    daylightPctCap: j.daylight === null ? null : +((100 * j.daylight) / cap).toFixed(2),
    daylightHeroPx:
      j.daylight === null ? null : +((j.daylight * HERO_CAP_PX) / cap).toFixed(1),
    inBandInk: +r.inBand.toFixed(2),
    rPieces: j.pieces.map((p) => ({
      area: Math.round(p.area),
      meanWidth: +p.meanWidth.toFixed(1),
      bbox: [+(p.bbox.x1 - p.bbox.x0).toFixed(0), +(p.bbox.y1 - p.bbox.y0).toFixed(0)],
      rings: p.rings,
    })),
    advance: j.advance,
    untouchedGlyphs: [u.n - u.moved.length, u.n],
  });

  console.log(line + "\n");
}
writeFileSync("ladder-qa.json", JSON.stringify({ heroCapPx: HERO_CAP_PX, faces: record }, null, 1));
console.log(
  "daylight, measured on the shipped outlines: " +
    record.map((f) => `${f.weight}:${f.daylight}u`).join("  ")
);
console.log(fails ? `${fails} FAILURES` : "all ladder geometry assertions passed");
process.exit(fails ? 1 : 0);
