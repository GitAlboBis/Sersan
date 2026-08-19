// PAST THE SEVERING CEILING — six R treatments at weight 340, measured.
//
// This is the study that settled the cut. On 2026-08-18 the open-bowl slab was
// clamped to `min(3.0 x stem, ceiling - 0.15 x stem)`, because past the ceiling
// the slab reaches the LEG's junction with the bowl and the R falls into two
// pieces. The client authorised looking past that clamp, so this script builds
// that control plus five treatments that go there deliberately, measures each
// one, writes an SVG per treatment into r-beyond/, and renders one proof sheet.
//
// OUTCOME: the control shows ZERO daylight — the leg is diagonal, so the two
// pieces still touch and the cut reads as a dent. `past-03`'s family was chosen
// and now ships: the slab run out to where the cut band holds no more ink
// (logotype.mjs `openBowlSaturation`, gapRatio 'saturate'), which is the same
// letterform as past-03 at every weight, minus past-02's spur. So the CONTROL
// tile below must now ask for the old clamp explicitly — `legMargin` defaults
// to null since the change, and without it the control would silently rebuild
// itself as past-01.
//
// Nothing here is redrawn: every shape is buildLogotype() off the pinned Jost
// instance instances/jost-var-340.ttf, with `legMargin: null` where the ceiling
// has to be switched off.
//
//   node r-beyond.mjs        (needs LOGOTYPE_MODULE_PATHS -> a node_modules
//                             with fontkit + polygon-clipping)
import { writeFileSync, mkdirSync } from "node:fs";
import sharp from "file:///C:/Users/alber/Desktop/sersan-v2-main/node_modules/sharp/lib/index.js";
import {
  buildLogotype,
  mpBBox,
} from "file:///C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/logotype.mjs";

const ROOT = "C:/Users/alber/Desktop/sersan-v2-main";
const WGT = 340;
const INST = `${ROOT}/design/wordmark/build/instances/jost-var-${WGT}.ttf`;
const OUTDIR = `${ROOT}/design/wordmark/build/r-beyond`;
const SHEET = `${ROOT}/design/logo-exploration/png/_R_beyond_ceiling.png`;
mkdirSync(OUTDIR, { recursive: true });

const CAPU = 700; // cap height in font units
const STEMU = 68; // measured stem at wght 340, font units
const TOL = 0.012; // flattening tolerance, cap-100 units

/* ═══════════════════════════════════════════════════════ geometry probes ══ */

function ringArea(r) {
  let a = 0;
  for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return a / 2;
}
function ringPerimeter(r) {
  let p = 0;
  for (let i = 0; i < r.length - 1; i++) p += Math.hypot(r[i + 1][0] - r[i][0], r[i + 1][1] - r[i][1]);
  return p;
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
/** Net area of one polygon (outer ring minus its holes). */
function polyArea(poly) {
  return Math.abs(poly.reduce((a, r, i) => a + (i === 0 ? Math.abs(ringArea(r)) : -Math.abs(ringArea(r))), 0));
}

/** Ink spans [x0,x1] along the horizontal line y, over a ring-grouped fill. */
function spansAt(mp, y) {
  const xs = [];
  for (const poly of mp)
    for (const r of poly)
      for (let i = 0; i < r.length - 1; i++) {
        const [x0, y0] = r[i];
        const [x1, y1] = r[i + 1];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y))
          xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
  xs.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}

function pointInRing(pt, r) {
  let inside = false;
  for (let i = 0, j = r.length - 2; i < r.length - 1; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function pointInPoly(pt, poly) {
  if (!pointInRing(pt, poly[0])) return false;
  for (let i = 1; i < poly.length; i++) if (pointInRing(pt, poly[i])) return false;
  return true;
}
/** Index of the polygon that owns `pt`, or -1. */
function ownerOf(pt, mp) {
  for (let i = 0; i < mp.length; i++) if (pointInPoly(pt, mp[i])) return i;
  return -1;
}

function segDist(a, b, c, d) {
  // distance between segment ab and segment cd
  const d1 = [b[0] - a[0], b[1] - a[1]];
  const d2 = [d[0] - c[0], d[1] - c[1]];
  const r = [a[0] - c[0], a[1] - c[1]];
  const A = d1[0] * d1[0] + d1[1] * d1[1];
  const E = d2[0] * d2[0] + d2[1] * d2[1];
  const F = d2[0] * r[0] + d2[1] * r[1];
  let s = 0, t = 0;
  if (A <= 1e-12 && E <= 1e-12) return Math.hypot(r[0], r[1]);
  if (A <= 1e-12) { t = Math.min(1, Math.max(0, F / E)); }
  else {
    const C = d1[0] * r[0] + d1[1] * r[1];
    if (E <= 1e-12) { s = Math.min(1, Math.max(0, -C / A)); }
    else {
      const B = d1[0] * d2[0] + d1[1] * d2[1];
      const den = A * E - B * B;
      s = den !== 0 ? Math.min(1, Math.max(0, (B * F - C * E) / den)) : 0;
      t = (B * s + F) / E;
      if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -C / A)); }
      else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (B - C) / A)); }
    }
  }
  const p = [a[0] + d1[0] * s, a[1] + d1[1] * s];
  const q = [c[0] + d2[0] * t, c[1] + d2[1] * t];
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}
/** Shortest distance between the boundaries of two polygons. */
function polyDistance(pa, pb) {
  let best = Infinity;
  for (const ra of pa)
    for (let i = 0; i < ra.length - 1; i++)
      for (const rb of pb)
        for (let j = 0; j < rb.length - 1; j++)
          best = Math.min(best, segDist(ra[i], ra[i + 1], rb[j], rb[j + 1]));
  return best;
}

function segsCross(p1, p2, p3, p4) {
  const o = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  const d1 = o(p3, p4, p1), d2 = o(p3, p4, p2), d3 = o(p1, p2, p3), d4 = o(p1, p2, p4);
  return d1 !== d2 && d3 !== d4 && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0;
}
/** Count of properly crossing, non-adjacent edge pairs across the whole fill. */
function selfIntersections(mp) {
  const segs = [];
  for (const poly of mp)
    for (const r of poly) for (let i = 0; i < r.length - 1; i++) segs.push([r[i], r[i + 1]]);
  let n = 0;
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 2; j < segs.length; j++) {
      // adjacency inside a closed ring: first vs last also touch
      if (segs[i][1] === segs[j][0] || segs[i][0] === segs[j][1]) continue;
      if (segsCross(segs[i][0], segs[i][1], segs[j][0], segs[j][1])) n++;
    }
  return n;
}

/* ═════════════════════════════════════════════════════════ the treatments ══ */

const TREATMENTS = [
  {
    name: "ceiling",
    opts: { rVariant: "openbowl", gapRatio: 3.0, legMargin: 0.15 },
    blurb: "CONTROL — 3.0× clamped to the ceiling",
  },
  {
    name: "past-01",
    opts: { rVariant: "openbowl", gapRatio: 3.0, legMargin: null },
    blurb: "openbowl, the literal 3.0 × stem",
  },
  {
    name: "past-02",
    opts: { rVariant: "openbowl", gapRatio: 4.0, legMargin: null },
    blurb: "openbowl, 4.0 × stem — the return goes",
  },
  {
    name: "past-03",
    opts: { rVariant: "openbowl", gapRatio: 5.0, legMargin: null },
    blurb: "openbowl, 5.0 × stem — slab clears the glyph",
  },
  {
    name: "bowl-return-gone",
    opts: { rVariant: "openbowl-full" },
    blurb: "openbowl-full: cut to a half-stem weld",
  },
  {
    name: "leg-from-stem",
    opts: { rVariant: "detachedleg", gapRatio: 3.0 },
    blurb: "bowl closes; the LEG cut back 3.0 × stem",
  },
];

/** The untouched Jost R, same build path, for the ghost and as the datum. */
const ghost = await buildLogotype({ fontPath: INST, text: "R", tracking: 0, tolerance: TOL, rVariant: "none" });
const kFU = 1 / ghost.meta.scale; // cap-100 build units -> font units
const u = (v) => v * kFU;

for (const t of TREATMENTS) {
  const R = await buildLogotype({ fontPath: INST, text: "R", tracking: 0, tolerance: TOL, ...t.opts });
  const word = await buildLogotype({
    fontPath: INST,
    text: "SERSAN",
    tracking: 0.3,
    tolerance: TOL,
    ...t.opts,
  });
  const rep = R.meta.reports.R0;
  t.R = R;
  t.word = word;
  t.rep = rep;

  // Reconstruct the resolved fill in build space from the emitted `d` (already
  // y-flipped, so y grows DOWN here: bbox.y0 is the cap line, y1 the baseline).
  const rings = [];
  for (const chunk of R.d.split("Z")) {
    if (!chunk.trim()) continue;
    const pts = chunk
      .trim()
      .split(/(?=[ML])/)
      .filter(Boolean)
      .map((c) => c.slice(1).split(" ").map(Number));
    pts.push(pts[0].slice());
    rings.push(pts);
  }
  // Nesting: a ring inside an odd number of other rings is a hole; assign each
  // hole to the smallest outer ring that contains it.
  const areas = rings.map((r) => Math.abs(ringArea(r)));
  const depth = rings.map((r, i) => rings.filter((o, j) => j !== i && pointInRing(r[0], o)).length);
  const outerIdx = rings.map((_, i) => i).filter((i) => depth[i] % 2 === 0);
  const mpParsed = outerIdx.map((i) => [rings[i]]);
  rings.forEach((r, i) => {
    if (depth[i] % 2 === 0) return;
    let host = -1;
    for (let k = 0; k < outerIdx.length; k++)
      if (pointInRing(r[0], rings[outerIdx[k]]) && (host < 0 || areas[outerIdx[k]] < areas[outerIdx[host]]))
        host = k;
    mpParsed[host].push(r);
  });

  t.polys = mpParsed.length;
  t.rings = rings.length;
  t.holes = rings.length - mpParsed.length;
  // Cross-check against the builder's own count so a parse slip cannot pass.
  const declared = R.meta.letters[0].rings;
  if (declared.polys !== t.polys || declared.rings !== t.rings)
    throw new Error(
      `${t.name}: parsed ${t.polys}/${t.rings} but builder reports ${declared.polys}/${declared.rings}`
    );

  // gap: the report's own number, plus the realised clearance where the cut
  // leaves two pieces (that is the number the eye actually reads).
  t.gapU = u(rep.gap);
  t.gapPct = (100 * t.gapU) / CAPU;
  t.ratio = t.gapU / STEMU;

  // Which piece owns the stem, which owns the leg's foot?
  const bb = mpBBox(mpParsed);
  const H = bb.y1 - bb.y0;
  t.pieces = mpParsed.map((p, i) => {
    const b = ringBBox(p[0]);
    const A = polyArea(p);
    const P = ringPerimeter(p[0]);
    return {
      i,
      area: u(1) * u(1) * A,
      bboxW: u(b.x1 - b.x0),
      bboxH: u(b.y1 - b.y0),
      width: u((2 * A) / P), // mean stroke width of the piece
      rings: p.length,
    };
  });
  t.selfInt = selfIntersections(mpParsed);
  t.minPieceDist =
    mpParsed.length > 1
      ? u(
          Math.min(
            ...mpParsed.flatMap((a, i) => mpParsed.slice(i + 1).map((b2) => polyDistance(a, b2)))
          )
        )
      : null;

  // Attachment test: sample the ink just above the baseline. Leftmost span is
  // the stem, rightmost is the leg's foot. Same owner => leg still attached.
  const yLine = bb.y1 - 0.04 * H; // near the baseline in the emitted y-down space
  const spans = spansAt(mpParsed, yLine);
  t.baselineSpans = spans.length;
  if (spans.length) {
    const stemPt = [(spans[0][0] + spans[0][1]) / 2, yLine];
    const legPt = [
      (spans[spans.length - 1][0] + spans[spans.length - 1][1]) / 2,
      yLine,
    ];
    t.stemOwner = ownerOf(stemPt, mpParsed);
    t.legOwner = ownerOf(legPt, mpParsed);
    t.legAttached = t.stemOwner === t.legOwner && t.stemOwner >= 0;
  } else {
    t.legAttached = null;
  }

  // What survives INSIDE the cut band but to the RIGHT of the slab. For a
  // narrow slab that is the bowl's return, still a full-height stroke with a
  // flat terminal. For a slab that stops just inside the glyph's right extreme
  // it is a tapering spur on the bowl's outer curve — a defect, not a terminal.
  t.residue = null;
  if (t.rep.rect) {
    const [, ry0, rx1, ry1] = t.rep.rect;
    const xd = rx1 - R.bbox.x0;
    const yd0 = R.bbox.y1 - ry1; // band top in the emitted y-down space
    const yd1 = R.bbox.y1 - ry0;
    const N = 400;
    const dy = (yd1 - yd0) / N;
    let area = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, maxW = 0, rowsHit = 0;
    for (let k = 0; k < N; k++) {
      const y = yd0 + (k + 0.5) * dy;
      for (const s of spansAt(mpParsed, y)) {
        const a = Math.max(s[0], xd);
        if (s[1] <= a) continue;
        area += (s[1] - a) * dy;
        maxW = Math.max(maxW, s[1] - a);
        x0 = Math.min(x0, a); x1 = Math.max(x1, s[1]);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        rowsHit++;
      }
    }
    t.residue = {
      area: u(1) * u(1) * area,
      w: area > 0 ? u(x1 - x0) : 0,
      h: area > 0 ? u(y1 - y0) : 0,
      maxW: u(maxW),
      bandCoverage: rowsHit / N, // 1 => spans the whole band (a real terminal)
    };
  }

  writeFileSync(`${OUTDIR}/${t.name}.svg`, R.svg);
  writeFileSync(`${OUTDIR}/${t.name}-sersan.svg`, word.svg);
}

/* ═══════════════════════════════════════════════ what each one actually did ══ */

const CEIL = u(TREATMENTS[0].rep.gapCeiling); // the measured severing ceiling
const bodyArea = (t) => Math.max(...t.pieces.map((p) => p.area));
// Past this slab width there is no ink left in the cut band to remove: the
// openbowl slab saturates. Scanned off the UNTOUCHED R across the same band.
const SAT = (() => {
  const [, ry0, , ry1] = TREATMENTS[0].rep.rect;
  const g = [];
  for (const chunk of ghost.d.split("Z")) {
    if (!chunk.trim()) continue;
    const pts = chunk.trim().split(/(?=[ML])/).filter(Boolean).map((c) => c.slice(1).split(" ").map(Number));
    pts.push(pts[0].slice());
    g.push(pts);
  }
  const mp = [g]; // one grouped fill is enough: spansAt only needs the edges
  let maxX = -Infinity;
  for (let k = 0; k < 400; k++) {
    const yu = ry0 + ((k + 0.5) / 400) * (ry1 - ry0);
    for (const sp of spansAt(mp, ghost.bbox.y1 - yu)) maxX = Math.max(maxX, sp[1]);
  }
  return u(maxX + ghost.bbox.x0 - TREATMENTS[0].rep.stem.right);
})();

for (const t of TREATMENTS) {
  const r = t.residue;
  // A spur is a scrap of stroke the slab's right edge failed to clear: tiny
  // area AND never more than a third of a stem wide. A flat-cut return
  // terminal is neither, and is a legitimate shape.
  t.spur = r && r.area > 0.5 && r.area < 0.15 * STEMU * STEMU && r.maxW < 0.4 * STEMU ? r : null;
  const notes = [];
  notes.push(
    t.minPieceDist === null
      ? `ONE PIECE OF INK · ${(CEIL - t.gapU).toFixed(0)}u SHORT OF THE SEVERING CEILING`
      : `PIECES ${t.minPieceDist.toFixed(0)}u (${((100 * t.minPieceDist) / CAPU).toFixed(1)}% CAP) APART AT THE NEAREST POINT`
  );
  if (t.spur)
    notes.push(
      `SPUR LEFT ON THE BOWL'S OUTER BOTTOM: ${t.spur.w.toFixed(0)}×${t.spur.h.toFixed(0)}u, ${t.spur.area.toFixed(0)}u² — TAPERS TO NOTHING`
    );
  else if (r && t.legAttached === false && t.rep.rect)
    notes.push(
      r.area > 0.5
        ? `THE BOWL'S BOTTOM-RIGHT SURVIVES AS A ${r.w.toFixed(0)}×${r.h.toFixed(0)}u STUB, CUT FLAT`
        : "NOTHING OF THE RETURN SURVIVES"
    );
  // openbowl-full stops at a half-stem weld, which at THIS weight bites before
  // the shipped clamp does. The tile's name has to not lie about that.
  if (t.name === "bowl-return-gone" && t.gapU < TREATMENTS[0].gapU)
    notes.push(
      `THE NAME OVERSTATES IT: THE RETURN IS NOT GONE — THIS CUT IS ${(TREATMENTS[0].gapU - t.gapU).toFixed(0)}u NARROWER THAN 01`
    );
  t.notes = notes;
}
// Flag the pairs the slab has driven to the same letterform.
for (let i = 1; i < TREATMENTS.length; i++) {
  const a = TREATMENTS[i - 1];
  const b = TREATMENTS[i];
  if (
    a.polys === b.polys &&
    Math.abs(bodyArea(a) - bodyArea(b)) / bodyArea(a) < 0.002 &&
    Math.abs((a.minPieceDist ?? 0) - (b.minPieceDist ?? 0)) < 0.5
  )
    b.notes.push(
      `SAME LETTERFORM AS ${String(i).padStart(2, "0")}, MINUS ITS SPUR — THE SLAB SATURATED AT ${SAT.toFixed(0)}u`
    );
}

/* ════════════════════════════════════════════════════════════ the console ══ */

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
console.log(
  `\nweight ${WGT} · upm 1000 · cap ${CAPU} · stem ${STEMU}u · ceiling ${u(TREATMENTS[0].rep.gapCeiling).toFixed(1)}u\n`
);
console.log(
  pad("treatment", 18) + rp("gap u", 7) + rp("% cap", 8) + rp("x stem", 8) +
    rp("polys", 7) + rp("rings", 7) + rp("holes", 7) + rp("leg", 11) + rp("selfInt", 9) + rp("min piece w", 13) + rp("piece gap u", 12)
);
for (const t of TREATMENTS) {
  const minW = Math.min(...t.pieces.map((p) => p.width));
  console.log(
    pad(t.name, 18) +
      rp(t.gapU.toFixed(1), 7) +
      rp(t.gapPct.toFixed(2) + "%", 8) +
      rp(t.ratio.toFixed(3), 8) +
      rp(t.polys, 7) +
      rp(t.rings, 7) +
      rp(t.holes, 7) +
      rp(t.legAttached === null ? "?" : t.legAttached ? "attached" : "FLOATING", 11) +
      rp(t.selfInt, 9) +
      rp(minW.toFixed(1) + "u", 13) +
      rp(t.minPieceDist === null ? "-" : t.minPieceDist.toFixed(1), 12)
  );
}
console.log("\nper-piece detail (font units):");
for (const t of TREATMENTS) {
  console.log(
    "  " +
      pad(t.name, 18) +
      t.pieces
        .map(
          (p) =>
            `[${p.i}] area ${Math.round(p.area)}  bbox ${p.bboxW.toFixed(0)}x${p.bboxH.toFixed(0)}  meanW ${p.width.toFixed(1)}  rings ${p.rings}`
        )
        .join("   ")
  );
}
console.log("\nink left in the cut band, right of the slab (font units):");
for (const t of TREATMENTS)
  console.log(
    "  " +
      pad(t.name, 18) +
      (t.residue === null
        ? "n/a (no rectangular slab)"
        : `area ${t.residue.area.toFixed(0)}u²  ${t.residue.w.toFixed(0)}x${t.residue.h.toFixed(0)}u  maxW ${t.residue.maxW.toFixed(0)}u  ` +
          `band coverage ${(100 * t.residue.bandCoverage).toFixed(0)}%  ` +
          (t.spur ? "<= SPUR (tapers, does not span the band)" : "cut return terminal"))
  );
console.log("\nnotes:");
for (const t of TREATMENTS) console.log("  " + pad(t.name, 18) + t.notes.join(" | "));

writeFileSync(
  `${OUTDIR}/measure.json`,
  JSON.stringify(
    TREATMENTS.map((t) => ({
      name: t.name,
      blurb: t.blurb,
      opts: t.opts,
      gapFontUnits: +t.gapU.toFixed(2),
      gapPctCap: +t.gapPct.toFixed(2),
      gapRatioStem: +t.ratio.toFixed(3),
      polys: t.polys,
      rings: t.rings,
      holes: t.holes,
      legAttached: t.legAttached,
      selfIntersections: t.selfInt,
      minPieceSeparationU: t.minPieceDist === null ? null : +t.minPieceDist.toFixed(2),
      pieces: t.pieces.map((p) => ({
        area: +p.area.toFixed(1),
        bbox: [+p.bboxW.toFixed(1), +p.bboxH.toFixed(1)],
        meanWidth: +p.width.toFixed(2),
        rings: p.rings,
      })),
      report: t.rep,
      residue: t.residue,
      spur: t.spur ? { w: +t.spur.w.toFixed(1), h: +t.spur.h.toFixed(1), area: +t.spur.area.toFixed(1) } : null,
      notes: t.notes,
      wordMinGap: t.word.meta.minGap,
    })),
    null,
    1
  )
);

/* ══════════════════════════════════════════════════════════════ the sheet ══ */

const CREAM = "#F6F3EE";
const PANEL = "#FFFDF9";
const INK = "#0B1422";
const MUTED = "#8A8378";
const RULE = "#E4DED4";
const GHOSTC = "#E2DACB";
const WARN = "#C2402A";
const HIT = "#1E7F98";
const MONO = "ui-monospace,Consolas,'Courier New',monospace";
/** Greedy wrap so a caption can never run into the next tile's column. */
function wrap(text, maxChars) {
  const out = [];
  let line = "";
  for (const w of String(text).split(" ")) {
    if (line && (line + " " + w).length > maxChars) { out.push(line); line = w; }
    else line = line ? line + " " + w : w;
  }
  if (line) out.push(line);
  return out;
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const RCAP = 300; // px
const KR = RCAP / 100; // px per cap-100 unit for the R row
const WCAP = 100; // px
const KW = WCAP / 100;

const M = 80;
const TW = 352; // tile width
const TG = 30;
const TH = 400; // tile height
const TOP = 176;
const CAPH = 236; // caption block under each tile

const W = M * 2 + TREATMENTS.length * TW + (TREATMENTS.length - 1) * TG;
const wordTop = TOP + TH + CAPH + 92;
const ROWH = 168;
const H = wordTop + 76 + TREATMENTS.length * ROWH + 70;

let body = "";

TREATMENTS.forEach((t, i) => {
  const x = M + i * (TW + TG);
  const y = TOP;
  const gx = x + (TW - ghost.width * KR) / 2;
  const gy = y + (TH - ghost.height * KR) / 2;
  const broken = t.polys > 1;

  body += `<rect x="${x}" y="${y}" width="${TW}" height="${TH}" fill="${PANEL}" stroke="${RULE}"/>`;
  body +=
    `<g transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${KR})" fill="${GHOSTC}">` +
    `<path fill-rule="evenodd" d="${ghost.d}"/></g>`;
  const bx = gx + (t.R.bbox.x0 - ghost.bbox.x0) * KR;
  const by = gy + (ghost.bbox.y1 - t.R.bbox.y1) * KR;
  body +=
    `<g transform="translate(${bx.toFixed(2)} ${by.toFixed(2)}) scale(${KR})" fill="${broken ? WARN : INK}">` +
    `<path fill-rule="evenodd" d="${t.R.d}"/></g>`;

  const line = (txt, dy, fill = MUTED, size = 12.5, ls = 0.55) =>
    `<text x="${x}" y="${y + TH + dy}" font-family="${MONO}" font-size="${size}" fill="${fill}" letter-spacing="${ls}">${esc(txt)}</text>`;
  body += line(
    `${String(i + 1).padStart(2, "0")}  ${t.name.toUpperCase()}`,
    30,
    broken ? WARN : i === 0 ? HIT : INK,
    16.5,
    1.6
  );
  body += line(t.blurb, 52);
  body += line(`GAP ${t.gapU.toFixed(0)}u · ${t.gapPct.toFixed(2)}% OF CAP · ${t.ratio.toFixed(2)}× STEM`, 74, INK);
  body += line(
    `${t.polys} CONTOUR${t.polys > 1 ? "S" : ""}${t.holes ? ` + ${t.holes} COUNTER` : ""} · LEG ${t.legAttached ? "ATTACHED" : "FLOATING"}`,
    94,
    t.legAttached ? INK : WARN
  );
  let dy = 114;
  t.notes.forEach((n, k) => {
    const fill = k === 0 ? (t.legAttached ? MUTED : WARN) : WARN;
    for (const l of wrap(n, 52)) { body += line(l, dy, fill, 11.5, 0.4); dy += 17; }
    dy += 3;
  });
});

body +=
  `<text x="${M}" y="${wordTop}" font-family="${MONO}" font-size="15" fill="${INK}" letter-spacing="2.6">` +
  `THE WORD — SERSAN AT CAP 100PX, 0.30EM TRACKING, WEIGHT 340. AN ISOLATED R FLATTERS A CUT; THE WORD DOES NOT.</text>`;

TREATMENTS.forEach((t, i) => {
  const y = wordTop + 52 + i * ROWH;
  const broken = t.polys > 1;
  body += `<rect x="${M}" y="${y}" width="${W - 2 * M}" height="${ROWH - 20}" fill="${PANEL}" stroke="${RULE}"/>`;
  const wx = M + 34;
  const wy = y + (ROWH - 20 - t.word.height * KW) / 2;
  body +=
    `<g transform="translate(${wx.toFixed(2)} ${wy.toFixed(2)}) scale(${KW})" fill="${broken ? WARN : INK}">` +
    `<path fill-rule="evenodd" d="${t.word.d}"/></g>`;
  const cx = wx + t.word.width * KW + 60;
  const tl = (txt, dy, fill = MUTED, size = 13, ls = 0.6) =>
    `<text x="${cx}" y="${y + dy}" font-family="${MONO}" font-size="${size}" fill="${fill}" letter-spacing="${ls}">${esc(txt)}</text>`;
  body += tl(`${String(i + 1).padStart(2, "0")}  ${t.name.toUpperCase()}`, 44, broken ? WARN : i === 0 ? HIT : INK, 16, 1.6);
  body += tl(`GAP ${t.gapU.toFixed(0)}u · ${t.gapPct.toFixed(2)}% CAP · ${t.ratio.toFixed(2)}× STEM · ${t.blurb.toUpperCase()}`, 70, INK);
  body += tl(
    `${t.polys} CONTOUR${t.polys > 1 ? "S" : ""} PER R · LEG ${t.legAttached ? "ATTACHED" : "FLOATING"}`,
    92,
    t.legAttached ? MUTED : WARN
  );
  t.notes.forEach((n, k) => (body += tl(n, 114 + k * 20, k === 0 ? MUTED : WARN, 12, 0.5)));
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${CREAM}"/>
<text x="${M}" y="60" font-family="${MONO}" font-size="17" fill="${INK}" letter-spacing="3">SERSAN DISPLAY · THE R PAST THE SEVERING CEILING · WEIGHT 340</text>
<text x="${M}" y="90" font-family="${MONO}" font-size="12.5" fill="${MUTED}" letter-spacing="1.1">UPM 1000 · CAP 700 · STEM 68u (9.71 % OF CAP) · ALL SIX AT ONE SCALE AND ONE BASELINE · R AT CAP 300PX</text>
<text x="${M}" y="112" font-family="${MONO}" font-size="12.5" fill="${MUTED}" letter-spacing="1.1">THE PALE SHAPE BEHIND EACH R IS THE UNTOUCHED JOST R — WHAT READS PALE IS THE INK THE CUT REMOVES</text>
<text x="${M}" y="134" font-family="${MONO}" font-size="12.5" fill="${MUTED}" letter-spacing="1.1">THE LETTERFORM SEVERS AT ${u(TREATMENTS[0].rep.gapCeiling).toFixed(0)}u (${((100 * u(TREATMENTS[0].rep.gapCeiling)) / CAPU).toFixed(2)} % OF CAP, ${(u(TREATMENTS[0].rep.gapCeiling) / STEMU).toFixed(2)}× STEM) · 01 STOPS SHORT OF IT, 02-06 GO PAST IT ON PURPOSE</text>
<text x="${M}" y="156" font-family="${MONO}" font-size="12.5" fill="${WARN}" letter-spacing="1.1">RED = MORE THAN ONE PIECE OF INK · THE SLAB SATURATES AT ${SAT.toFixed(0)}u (${(SAT / STEMU).toFixed(2)}× STEM): PAST THAT THE BAND HOLDS NO MORE INK AND THE LETTER STOPS CHANGING</text>
${body}</svg>`;

writeFileSync(`${OUTDIR}/_sheet.svg`, svg);
await sharp(Buffer.from(svg), { density: 72 }).png().toFile(SHEET);
console.log(`\nwrote ${SHEET}  ${W}x${H}`);
console.log(`wrote ${OUTDIR}/{${TREATMENTS.map((t) => t.name).join(",")}}.svg (+ -sersan.svg) and measure.json`);
