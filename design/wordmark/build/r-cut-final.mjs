// THE R CUT, AS IT NOW SHIPS — before beside after, one scale, one baseline,
// weight 340, R at cap 320px.
//
//   BEFORE  the cut that shipped on 2026-08-18: the open-bowl slab clamped to
//           the letterform's severing ceiling, 151u. One contour — and NO
//           daylight: the leg is diagonal, so past the return the two pieces
//           still touch, the cut reads as a dent, and the letter reads as an
//           ordinary R. That is the complaint this change answers.
//   AFTER   the slab run out to SATURATION (285u at this weight): out to where
//           the cut band holds no more ink. The leg comes away — the R is two
//           contours, deliberately — and the daylight is as wide as this
//           letterform can ever show, because the band saturates at 284u and
//           anything wider removes nothing more.
//
// Both Rs are read back out of real woff2 files (the archived old face and the
// shipped new one), not rebuilt, so the sheet cannot flatter either of them.
// Every number in the captions is MEASURED here, on those outlines.
//
//   node r-cut-final.mjs   (needs LOGOTYPE_MODULE_PATHS → a node_modules with
//                           fontkit + polygon-clipping)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import sharp from "file:///C:/Users/alber/Desktop/sersan-v2-main/node_modules/sharp/lib/index.js";
import {
  buildLogotype,
  flattenGlyph,
  resolveFill,
  scanX,
} from "file:///C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/logotype.mjs";

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

const WGT = 340;
const ROOT = "C:/Users/alber/Desktop/sersan-v2-main";
const INST = `${ROOT}/design/wordmark/build/instances/jost-var-${WGT}.ttf`;
const SHIPPED = `${ROOT}/src/fonts/sersan-display-${WGT}.woff2`;
// the face that shipped with the ceiling-clamped cut, kept aside before this
// rebuild overwrote it
const ARCHIVE =
  "C:/Users/alber/AppData/Local/Temp/claude/C--Users-alber-Desktop-sersan-v2-main/" +
  `af22389e-8cce-4b6d-878a-b414b24746c6/scratchpad/r-cut-backup/sersan-display-${WGT}.woff2`;
const OUT = `${ROOT}/design/logo-exploration/png/_R_cut_final.png`;

const HERO_CAP_PX = 72; // the hero sets the wordmark at about this cap height
const CAP = 320; // px, the R on this sheet
const TOL = 0.02;

const AMP = JSON.parse(readFileSync("amputated-ladder.json", "utf8"));
const rep = AMP[WGT].glyphs.R.report;
const kFU = AMP[WGT].glyphs.R.k; // cap-100 units → font units
const STEMU = rep.stem.thickness * kFU;
const STEM_R = rep.stem.right * kFU;
const BAND = [rep.rect[1] * kFU, rep.rect[3] * kFU]; // the cut band, font units
const CAPU = 700;

/* ═════════════════════════════════════════════════════════════ measuring ══ */

function segClosest(a, b, c, d) {
  const d1 = [b[0] - a[0], b[1] - a[1]];
  const d2 = [d[0] - c[0], d[1] - c[1]];
  const r = [a[0] - c[0], a[1] - c[1]];
  const A = d1[0] * d1[0] + d1[1] * d1[1];
  const E = d2[0] * d2[0] + d2[1] * d2[1];
  const F = d2[0] * r[0] + d2[1] * r[1];
  let s = 0;
  let t = 0;
  if (A <= 1e-12 && E <= 1e-12) {
    /* both degenerate */
  } else if (A <= 1e-12) t = Math.min(1, Math.max(0, F / E));
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
  const p = [a[0] + d1[0] * s, a[1] + d1[1] * s];
  const q = [c[0] + d2[0] * t, c[1] + d2[1] * t];
  return { d: Math.hypot(p[0] - q[0], p[1] - q[1]), p, q };
}

/** Closest approach between two polygons' boundaries, with the two points. */
function closest(pa, pb) {
  let best = { d: Infinity, p: null, q: null };
  for (const ra of pa)
    for (let i = 0; i < ra.length - 1; i++)
      for (const rb of pb)
        for (let j = 0; j < rb.length - 1; j++) {
          const c = segClosest(ra[i], ra[i + 1], rb[j], rb[j + 1]);
          if (c.d < best.d) best = c;
        }
  return best;
}

/** Read one real face: its R outline, its pieces, and the light between them. */
function readFace(file) {
  const font = fontkit.create(readFileSync(file));
  const glyph = font.layout("R").glyphs[0];
  const mp = resolveFill(pc, flattenGlyph(glyph, 1, TOL));
  const contours = mp.reduce((n, poly) => n + poly.length, 0);

  // The daylight, where there are two pieces to have daylight between.
  const light =
    mp.length > 1
      ? mp
          .flatMap((a, i) => mp.slice(i + 1).map((b) => closest(a, b)))
          .reduce((m, c) => (c.d < m.d ? c : m))
      : null;

  // Where the ink first comes back inside the cut band, right of the stem. With
  // one piece that IS the surviving weld — the place the eye reads as a dent
  // instead of a gap.
  let weldX = Infinity;
  let weldInk = 0;
  const N = 400;
  // inset a unit top and bottom: rounding to integer units leaves a half-unit
  // film of the cut's own edges on the band's boundary, which is not ink
  const yA = BAND[0] + 1;
  const yB = BAND[1] - 1;
  for (let i = 0; i < N; i++) {
    const y = yA + ((i + 0.5) * (yB - yA)) / N;
    for (const [x0, x1] of scanX(mp, y)) {
      const l = Math.max(x0, STEM_R + 1);
      if (x1 <= l) continue;
      if (l < weldX) weldX = l;
      weldInk += ((x1 - l) * (yB - yA)) / N;
    }
  }
  return {
    font,
    glyph,
    mp,
    pieces: mp.length,
    contours,
    light,
    weldX: weldX === Infinity ? null : weldX,
    weldInk,
    cap: font.capHeight,
  };
}

const ghost = await buildLogotype({
  fontPath: INST,
  text: "R",
  tracking: 0,
  tolerance: 0.012,
  rVariant: "none",
});
const K = CAP / 100; // px per cap-100 unit, for the ghost

if (!existsSync(ARCHIVE)) throw new Error(`the pre-change face is missing: ${ARCHIVE}`);

const panels = [
  {
    tag: "BEFORE",
    file: ARCHIVE,
    note: "slab clamped to the severing ceiling",
    slabU: 151,
    colour: "#0B1422",
  },
  {
    tag: "AFTER",
    file: SHIPPED,
    note: "slab run out to saturation",
    slabU: rep.gap * kFU,
    colour: "#0B1422",
  },
];
for (const p of panels) {
  p.face = readFace(p.file);
  p.daylight = p.face.light ? p.face.light.d : 0;
}

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
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const PW = 620;
const PH = 520;
const GAPX = 44;
const X = 80;
const TOP = 176;
const WORDTOP = TOP + PH + 200;

let body = "";
panels.forEach((p, i) => {
  const x = X + i * (PW + GAPX);
  const y = TOP;
  const gx = x + (PW - ghost.width * K) / 2;
  const gy = y + (PH - ghost.height * K) / 2;

  body += `<rect x="${x}" y="${y}" width="${PW}" height="${PH}" fill="${PANEL}" stroke="${RULE}"/>`;
  body +=
    `<g transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${K})" fill="${GHOSTC}">` +
    `<path fill-rule="evenodd" d="${ghost.d}"/></g>`;

  // the real face, in font units, cap-aligned with the ghost
  const s = CAP / p.face.cap;
  const tx = gx - ghost.bbox.x0 * K;
  const ty = gy + ghost.bbox.y1 * K;
  const PX = (fx, fy) => [tx + s * fx, ty - s * fy]; // font units → sheet px
  body +=
    `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(6)} ${(-s).toFixed(6)})" ` +
    `fill="${p.colour}"><path d="${p.face.glyph.path.toSVG()}"/></g>`;

  // the annotation: the measured daylight, or the weld that ate it
  if (p.face.light) {
    const a = PX(...p.face.light.p);
    const b = PX(...p.face.light.q);
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    body +=
      `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" ` +
      `stroke="${HIT}" stroke-width="3"/>` +
      `<circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="4" fill="${HIT}"/>` +
      `<circle cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" r="4" fill="${HIT}"/>` +
      `<text x="${(mx + 18).toFixed(1)}" y="${(my + 5).toFixed(1)}" font-family="${MONO}" font-size="17" ` +
      `fill="${HIT}" letter-spacing="1">${p.daylight.toFixed(0)}u</text>`;
  } else if (p.face.weldX !== null) {
    const c = PX(p.face.weldX + 0.5 * STEMU, (BAND[0] + BAND[1]) / 2);
    const r = 0.62 * STEMU * s;
    body +=
      `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${r.toFixed(1)}" fill="none" ` +
      `stroke="${WARN}" stroke-width="3"/>` +
      `<text x="${(c[0] + r + 14).toFixed(1)}" y="${(c[1] + 6).toFixed(1)}" font-family="${MONO}" ` +
      `font-size="16" fill="${WARN}" letter-spacing="1">STILL WELDED</text>`;
  }

  const t = (txt, dy, fill = MUTED, size = 14, ls = 0.7) =>
    `<text x="${x}" y="${y + PH + dy}" font-family="${MONO}" font-size="${size}" fill="${fill}" letter-spacing="${ls}">${esc(txt)}</text>`;
  body += t(p.tag, 36, p.daylight > 0 ? HIT : WARN, 19, 2.4);
  body += t(p.note, 62);
  body += t(
    `SLAB ${p.slabU.toFixed(0)}u = ${(p.slabU / STEMU).toFixed(2)}× STEM (${STEMU.toFixed(0)}u)  ·  ${p.face.contours} CONTOUR${p.face.contours > 1 ? "S" : ""}`,
    88,
    INK
  );
  body += t(
    p.daylight > 0
      ? `DAYLIGHT ${p.daylight.toFixed(0)}u  =  ${((100 * p.daylight) / CAPU).toFixed(2)} % OF CAP  =  ${((p.daylight * HERO_CAP_PX) / CAPU).toFixed(1)} CSS PX IN THE HERO`
      : "DAYLIGHT 0u  —  THE LEG NEVER LETS GO OF THE BOWL",
    112,
    p.daylight > 0 ? HIT : WARN,
    15,
    1
  );
  body += t(
    p.daylight > 0
      ? "THE CUT BAND IS EMPTY: NOTHING OF THE RETURN SURVIVES IN THE GAP"
      : `${p.face.weldInk.toFixed(0)}u² OF INK STILL BRIDGES THE CUT BAND — IT READS AS A DENT`,
    136,
    MUTED,
    13,
    0.6
  );
});

// the word, both faces, so an isolated R cannot flatter either cut
const wordRun = (font, text, capPx, trackEm, x, baseline) => {
  const size = (capPx * font.unitsPerEm) / font.capHeight;
  const s = size / font.unitsPerEm;
  const track = trackEm * font.unitsPerEm;
  const L = font.layout(text);
  let pen = 0;
  let d = "";
  L.glyphs.forEach((g, i) => {
    const p = g.path.toSVG();
    if (p)
      d += `<path transform="translate(${((pen + L.positions[i].xOffset) * s).toFixed(3)} 0) scale(${s.toFixed(6)} ${(-s).toFixed(6)})" d="${p}"/>`;
    pen += L.positions[i].xAdvance + track;
  });
  return `<g transform="translate(${x} ${baseline})" fill="${INK}">${d}</g>`;
};

body +=
  `<text x="${X}" y="${WORDTOP - 34}" font-family="${MONO}" font-size="14" fill="${INK}" letter-spacing="2.4">` +
  `THE WORD — SERSAN AT CAP 96PX, 0.30EM TRACKING. AN ISOLATED R FLATTERS A CUT; THE WORD DOES NOT.</text>`;
panels.forEach((p, i) => {
  const yy = WORDTOP + 96 + i * 150;
  body += wordRun(p.face.font, "SERSAN", 96, 0.3, X + 150, yy);
  body +=
    `<text x="${X}" y="${yy}" font-family="${MONO}" font-size="15" fill="${p.daylight > 0 ? HIT : WARN}" ` +
    `letter-spacing="1.6">${p.tag}</text>`;
});

const W = X * 2 + panels.length * PW + (panels.length - 1) * GAPX;
const H = WORDTOP + 96 + panels.length * 150 + 40;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${CREAM}"/>
<text x="${X}" y="58" font-family="${MONO}" font-size="16" fill="${INK}" letter-spacing="3">SERSAN DISPLAY · THE R CUT AS IT NOW SHIPS · WEIGHT 340 · R AT CAP 320PX, ONE SCALE AND ONE BASELINE</text>
<text x="${X}" y="88" font-family="${MONO}" font-size="12.5" fill="${MUTED}" letter-spacing="1.1">UPM 1000 · CAP 700 · STEM ${STEMU.toFixed(0)}u · BOTH RS READ BACK OUT OF REAL woff2 FILES, NOT REBUILT · EVERY FIGURE MEASURED ON THOSE OUTLINES</text>
<text x="${X}" y="110" font-family="${MONO}" font-size="12.5" fill="${MUTED}" letter-spacing="1.1">THE PALE SHAPE BEHIND EACH R IS THE UNTOUCHED JOST R — WHAT READS PALE IS THE INK THE CUT REMOVES</text>
<text x="${X}" y="132" font-family="${MONO}" font-size="12.5" fill="${MUTED}" letter-spacing="1.1">THE LEG LETS GO AT ${(rep.gapCeiling * kFU).toFixed(0)}u AND THE BAND SATURATES AT ${(rep.gapSaturation * kFU).toFixed(0)}u: BEFORE STOPS SHORT OF THE FIRST, AFTER GOES PAST THE SECOND — WIDER WOULD REMOVE NOTHING MORE</text>
${body}</svg>`;

writeFileSync("r-cut-final.svg", svg);
await sharp(Buffer.from(svg), { density: 72 }).png().toFile(OUT);
console.log("wrote", OUT, `${W}x${H}`);
for (const p of panels)
  console.log(
    `  ${p.tag.padEnd(7)} ${p.file.split("/").pop()}  slab ${p.slabU.toFixed(0)}u  ` +
      `contours ${p.face.contours}  pieces ${p.face.pieces}  daylight ${p.daylight.toFixed(1)}u ` +
      `(${((100 * p.daylight) / CAPU).toFixed(2)}% cap, ${((p.daylight * HERO_CAP_PX) / CAPU).toFixed(1)} css px)  ` +
      `ink still in the band ${p.face.weldInk.toFixed(1)}u²`
  );
