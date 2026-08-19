// Geometry QA on the SHIPPED woff2 faces in src/fonts/ — not on the build
// intermediates. Thin-stem boolean cuts are the risky case (a heavier weight
// can close the R gap or leave a nub of crossbar on a leg), so every claim the
// eye would make about the proof sheets is asserted numerically here.
//
// Per face:
//   1  A and R each resolve to exactly ONE contour. An A with any crossbar left
//      would still enclose its counter (2 rings); an R with a closed bowl would
//      still enclose its bowl (2 rings).
//   2  A span profile: exactly one 1-span -> 2-span transition down the glyph,
//      never 3 spans, and never a return to 1. A leftover crossbar bridge shows
//      up as a re-merge; a nub shows up as an extra span or as a break in the
//      monotonic march of the two inner leg edges.
//   3  R gap genuinely open: no ink at all in the corridor the cut removed, the
//      bowl's bottom stroke present again just past it, and the measured
//      stem->bowl clearance equal to the intended 1.6 x stem.
//   4  Everything outside the cut is the untouched typeface, scanline by
//      scanline, against the pinned instance the face was carved from.
//   5  No degenerate contour: >= 3 points, non-zero area, no zero-length edge,
//      no self-intersection.
//   6  Every glyph OTHER than A and R is identical to the source face, outline
//      command for outline command and advance for advance. 230 of the 232
//      glyphs must not have moved at all.
//   7  The junction survives the WIDER cut: past the corridor the bowl's lower
//      stroke must resume and RUN for a real distance (not end in a stub), and
//      the ink must stay continuous from there out to the leg, with no scanline
//      inside the run where the stroke thins to a hairline. This is the failure
//      mode a wider gap actually has - at gapRatio 3.0 x stem the slab reaches
//      past the leg's junction with the bowl and the leg floats free as a second
//      polygon, which is why logotype.mjs clamps the gap to a measured ceiling.
import {
  flattenGlyph,
  resolveFill,
  scanX,
  scanY,
  mpBBox,
  countRings,
} from "file:///C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/logotype.mjs";
import { readFileSync } from "node:fs";
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

/* ────────────────────────────────────────────────────────── the R corridor ── */
function checkR(mp, rep, k) {
  const stemR = rep.stem.right * k;
  const gap = rep.gap * k;
  const y0 = rep.bottomStroke[0] * k;
  const y1 = rep.bottomStroke[1] * k;
  const mid = (y0 + y1) / 2;

  // (a) the corridor is empty over the whole cut width
  let inkInCorridor = 0;
  for (let i = 1; i < 40; i++) {
    const x = stemR + (gap * i) / 40;
    for (const [a, b] of scanY(mp, x)) if (b > y0 - 0.5 && a < y1 + 0.5) inkInCorridor++;
  }
  // (b) the bowl's bottom stroke is back just past the corridor
  const past = scanY(mp, stemR + gap + Math.max(2, 0.05 * gap)).filter(
    ([a, b]) => b > y0 - 0.5 && a < y1 + 0.5
  );
  // (c) the clearance actually measured across the cut, stem edge to bowl edge
  const row = scanX(mp, mid);
  const clearance = row.length >= 2 ? row[1][0] - row[0][1] : NaN;
  return { stemR, gap, inkInCorridor, bowlBack: past.length, clearance, rowSpans: row.length };
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
// Outline command stream + advance, glyph by glyph. Both files are TrueType with
// integer coordinates, so "same commands, same advance" is identity of the
// drawing; nothing here can be true by accident.
function glyphSig(font, ch) {
  const g = font.layout(ch).glyphs[0];
  const cmds = g.path.commands
    .map((c) => c.command + "(" + c.args.map((v) => Math.round(v * 1e4) / 1e4).join(",") + ")")
    .join(" ");
  return `${g.advanceWidth}|${cmds}`;
}

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" +
  ".,:;!?'()[]{}-/&@#%*+=<>$";

function untouchedGlyphs(shipped, source) {
  const moved = [];
  let n = 0;
  for (const ch of ALPHABET) {
    if (ch === "A" || ch === "R") continue;
    n++;
    if (glyphSig(shipped, ch) !== glyphSig(source, ch)) moved.push(ch);
  }
  return { n, moved };
}

/* ------------------------------------ the junction, at the WIDER gap -- */
// Whether the leg is still ATTACHED is already settled by the contour count: a
// severed leg is a second contour, and check 1 fails. What that does not catch
// is the leg hanging on by a thread - so measure the material at the junction.
//
// Walk right from the cut's edge along the band the bowl's lower stroke used to
// occupy and record how far the stroke runs before it curves up out of the band
// (leaving the band is the letterform, not a break - the bowl's bottom rises to
// the right), and how thin it ever gets along that run.
function checkJunction(mp, rep, k) {
  const x0 = (rep.stem.right + rep.gap) * k;
  const yA = rep.bottomStroke[0] * k;
  const yB = rep.bottomStroke[1] * k;
  const xEnd = mpBBox(mp).x1;
  const N = 240;

  let run = 0;
  let minH = Infinity;
  let ended = false;
  for (let i = 0; i <= N; i++) {
    const x = x0 + ((xEnd - x0) * i) / N;
    const h = scanY(mp, x)
      .filter(([a, b]) => b > yA - 1 && a < yB + 1)
      .reduce((t, [a, b]) => t + (b - a), 0);
    if (ended) continue;
    if (h > 0) {
      run = x - x0;
      minH = Math.min(minH, h);
    } else if (run > 0) {
      ended = true; // the stroke has climbed out of the band - end of the run
    }
  }
  const stem = rep.stem.thickness * k;
  // How much room the cut left between itself and the abscissa at which the leg
  // would have let go. This is the margin that integer rounding eats into.
  const headroom = rep.gapCeiling == null ? Infinity : (rep.gapCeiling - rep.gap) * k;
  return { run, minH: minH === Infinity ? 0 : minH, stem, headroom };
}


/* ═══════════════════════════════════════════════════════════════════ run ══ */
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
  const rc = { A: countRings(A), R: countRings(R) };

  let line = `wght ${String(w).padStart(3)}  contours A=${rc.A.rings} R=${rc.R.rings}`;
  line += bad(rc.A.rings !== 1, "A is not a single contour (crossbar remnant?)");
  line += bad(rc.R.rings !== 1, "R is not a single contour (bowl closed?)");

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
  line +=
    `\n         R: corridor ink ${r.inkInCorridor}, bowl resumes past gap ${r.bowlBack}, ` +
    `measured clearance ${r.clearance.toFixed(1)}u vs intended gap ${r.gap.toFixed(1)}u ` +
    `(${((100 * r.gap) / 700).toFixed(2)}% of cap, ratio ${rrep.gapRatioAchieved}` +
    `${rrep.gapClamped ? " CLAMPED from " + rrep.gapRatioRequested : ""})`;
  line += bad(r.inkInCorridor !== 0, "R gap is not clear (bowl still joins the stem)");
  line += bad(r.bowlBack < 1, "R bowl does not resume past the gap (bowl over-cut)");
  line += bad(Math.abs(r.clearance - r.gap) > 1.5, "R clearance != intended gap");

  const j = checkJunction(R, rrep, k);
  line +=
    `\n         R junction: bowl runs ${j.run.toFixed(0)}u past the cut ` +
    `(${(j.run / j.stem).toFixed(2)} x stem), thinnest stroke in that run ${j.minH.toFixed(1)}u ` +
    `(${(j.minH / j.stem).toFixed(2)} x stem), headroom to the severing point ${j.headroom.toFixed(1)}u`;
  line += bad(j.run < 0.5 * j.stem, "R bowl arc past the cut is a stub, not an arc");
  line += bad(j.minH < 0.35 * j.stem, "R bowl/leg junction thins to a hairline");
  line += bad(j.headroom < 2, "R cut sits within rounding distance of severing the leg");

  const u = untouchedGlyphs(font, src);
  line += `\n         untouched glyphs: ${u.n - u.moved.length}/${u.n} identical to the source face`;
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

  console.log(line + "\n");
}
console.log(fails ? `${fails} FAILURES` : "all ladder geometry assertions passed");
process.exit(fails ? 1 : 0);
