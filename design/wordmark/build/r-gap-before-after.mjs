// HISTORY SHEET — how the R cut got wider, in three steps, one scale, one
// baseline, weight 340 (the weight the treatments sheet was judged at).
//
// SUPERSEDED as the current-state sheet by r-cut-final.mjs → _R_cut_final.png,
// which puts the cut that ships TODAY beside the last of these three. Every
// panel here is a state the letter has been in, and all three are read out of
// archived woff2 files or rebuilt at the ratio named, never out of src/fonts —
// so re-running this cannot quietly relabel the current face as an old one.
//
//   1.6 x STEM   what shipped until 2026-08-18. Drawn from the archived woff2
//                when it is available, so it is literally that face.
//   3.0 LITERAL  gapRatio 3.0 with the ceiling switched off (legMargin null).
//                The slab reaches past the leg's junction with the bowl and the
//                leg comes away: two contours, and the bowl's bottom-right left
//                standing as a stub. Not what was chosen — the cut that ships
//                now goes further still, out to where that stub is gone too.
//   3.0 CLAMPED  what shipped on 2026-08-18: the same ratio held inside the
//                letterform's severing ceiling. ONE contour — and no daylight
//                at all, because the leg is diagonal and the two pieces still
//                touch. That is the complaint that produced the current cut.
//
// Behind each R sits a pale ghost of the untouched Jost R, so the removed
// material reads at a glance.
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
  throw new Error(`cannot resolve "${name}" - set LOGOTYPE_MODULE_PATHS`);
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
const SCRATCH =
  "C:/Users/alber/AppData/Local/Temp/claude/C--Users-alber-Desktop-sersan-v2-main/" +
  "af22389e-8cce-4b6d-878a-b414b24746c6/scratchpad";
const ARCHIVE = `${SCRATCH}/backup-fonts-gap16/sersan-display-${WGT}.woff2`;
// the face carved at 3.0 clamped to the ceiling, kept aside before the
// saturating cut replaced it
const ARCHIVE_CLAMPED = `${SCRATCH}/r-cut-backup/sersan-display-${WGT}.woff2`;
const OUT = `${ROOT}/design/logo-exploration/png/_R_gap_before_after.png`;

const CREAM = "#F6F3EE";
const PANEL = "#FFFDF9";
const INK = "#0B1422";
const MUTED = "#8A8378";
const RULE = "#E4DED4";
const GHOST = "#E2DACB";
const WARN = "#C2402A";
const HIT = "#1E7F98";
const MONO = "ui-monospace,Consolas,'Courier New',monospace";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const CAP = 320;
const CAPU = 700;
const ghost = await buildLogotype({
  fontPath: INST,
  text: "R",
  tracking: 0,
  tolerance: 0.012,
  rVariant: "none",
});
const K = CAP / 100; // px per cap-100 unit
const kFU = 1 / ghost.meta.scale; // cap-100 units -> font units
const STEMU = 68;

const AMP = JSON.parse(readFileSync("amputated-ladder.json", "utf8"));
const bs = AMP[WGT].glyphs.R.report.bottomStroke;
const bandY = ((bs[0] + bs[1]) / 2) * kFU; // font units: mid-height of the cut

/** The realised clearance across the cut, scanned off a real face's outline. */
function measureFace(file) {
  const font = fontkit.create(readFileSync(file));
  const glyph = font.layout("R").glyphs[0];
  const mp = resolveFill(pc, flattenGlyph(glyph, 1, 0.02));
  const row = scanX(mp, bandY);
  return {
    font,
    glyph,
    gapU: row.length >= 2 ? row[1][0] - row[0][1] : NaN,
    contours: mp.reduce((n, poly) => n + poly.length, 0),
  };
}

const panels = [];
if (existsSync(ARCHIVE)) {
  panels.push({ tag: "1.6 × STEM", kind: "face", file: ARCHIVE, note: "shipped until 2026-08-18", colour: INK });
} else {
  panels.push({
    tag: "1.6 × STEM",
    kind: "build",
    opts: { gapRatio: 1.6, legMargin: 0.15 },
    note: "rebuilt at the old ratio 1.6",
    colour: INK,
  });
}
panels.push({
  tag: "3.0 LITERAL",
  kind: "build",
  opts: { gapRatio: 3.0, legMargin: null },
  note: "gapRatio 3.0, ceiling switched off",
  colour: INK,
});
if (existsSync(ARCHIVE_CLAMPED)) {
  panels.push({
    tag: "3.0 CLAMPED",
    kind: "face",
    file: ARCHIVE_CLAMPED,
    note: "shipped 2026-08-18 — superseded",
    colour: INK,
  });
} else {
  panels.push({
    tag: "3.0 CLAMPED",
    kind: "build",
    opts: { gapRatio: 3.0, legMargin: 0.15 },
    note: "rebuilt at 3.0 clamped to the ceiling",
    colour: INK,
  });
}

for (const p of panels) {
  if (p.kind === "build") {
    const b = await buildLogotype({ fontPath: INST, text: "R", tracking: 0, tolerance: 0.012, ...p.opts });
    const rep = b.meta.reports.R0;
    p.build = b;
    p.gapU = rep.gap * kFU;
    p.contours = rep.after.rings;
  } else {
    const m = measureFace(p.file);
    p.face = m;
    p.gapU = m.gapU;
    p.contours = m.contours;
  }
  p.ratio = +(p.gapU / STEMU).toFixed(3);
}

const PW = 520;
const PH = 470;
const GAPX = 34;
const X = 80;
const TOP = 176;

let body = "";
panels.forEach((p, i) => {
  const x = X + i * (PW + GAPX);
  const y = TOP;
  const gx = x + (PW - ghost.width * K) / 2;
  const gy = y + (PH - ghost.height * K) / 2;

  body += `<rect x="${x}" y="${y}" width="${PW}" height="${PH}" fill="${PANEL}" stroke="${RULE}"/>`;
  body +=
    `<g transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${K})" fill="${GHOST}">` +
    `<path fill-rule="evenodd" d="${ghost.d}"/></g>`;

  if (p.kind === "build") {
    const bx = gx + (p.build.bbox.x0 - ghost.bbox.x0) * K;
    const by = gy + (ghost.bbox.y1 - p.build.bbox.y1) * K;
    body +=
      `<g transform="translate(${bx.toFixed(2)} ${by.toFixed(2)}) scale(${K})" fill="${p.colour}">` +
      `<path fill-rule="evenodd" d="${p.build.d}"/></g>`;
  } else {
    // font units, y-up: place so the glyph's cap sits where the ghost's does
    const s = CAP / p.face.font.capHeight;
    const tx = gx - ghost.bbox.x0 * K;
    const ty = gy + ghost.bbox.y1 * K;
    body +=
      `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(6)} ${(-s).toFixed(6)})" ` +
      `fill="${p.colour}"><path d="${p.face.glyph.path.toSVG()}"/></g>`;
  }

  const t = (txt, dy, fill = MUTED, size = 13.5, ls = 0.6) =>
    `<text x="${x}" y="${y + PH + dy}" font-family="${MONO}" font-size="${size}" fill="${fill}" letter-spacing="${ls}">${esc(txt)}</text>`;
  const split = p.contours > 1;
  body += t(p.tag, 32, INK, 17, 2);
  body += t(p.note, 56);
  body += t(`SLAB ${p.gapU.toFixed(0)} FONT UNITS  ·  ${((100 * p.gapU) / CAPU).toFixed(2)} % OF CAP`, 80, INK);
  body += t(`${p.ratio} × STEM (68u)  ·  ${p.contours} CONTOUR${split ? "S" : ""}`, 100);
  body += t(
    split
      ? "THE LEG HAS COME AWAY — BUT THE BOWL'S BOTTOM-RIGHT IS STILL STANDING"
      : "ONE PIECE OF INK: NO DAYLIGHT, THE CUT READS AS A DENT",
    122,
    split ? MUTED : WARN,
    13.5,
    1
  );
});

const W = X * 2 + panels.length * PW + (panels.length - 1) * GAPX;
const H = TOP + PH + 160;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${CREAM}"/>
<text x="${X}" y="58" font-family="${MONO}" font-size="15" fill="${INK}" letter-spacing="2.8">SERSAN DISPLAY · THE R CUT, WIDENED — A HISTORY · WEIGHT 340 · R AT CAP 320PX, ONE SCALE AND ONE BASELINE</text>
<text x="${X}" y="86" font-family="${MONO}" font-size="12.5" fill="${MUTED}" letter-spacing="1.1">UPM 1000 · CAP 700 · STEM 68 UNITS (9.71 % OF CAP) · THE PALE SHAPE IS THE UNTOUCHED JOST R — WHAT READS PALE IS WHAT THE CUT REMOVES</text>
<text x="${X}" y="110" font-family="${MONO}" font-size="12.5" fill="${MUTED}" letter-spacing="1.1">THE LETTERFORM CEILINGS THE OPEN BOWL AT 161 UNITS AT THIS WEIGHT — CUT PAST THAT AND THE SLAB TAKES THE LEG&#39;S JUNCTION WITH THE BOWL</text>
<text x="${X}" y="132" font-family="${MONO}" font-size="12.5" fill="${HIT}" letter-spacing="1.1">SUPERSEDED: WHAT SHIPS NOW IS THE SLAB RUN TO SATURATION (285u, 68u OF DAYLIGHT) — SEE _R_cut_final.png</text>
${body}</svg>`;
writeFileSync("r-gap-before-after.svg", svg);
await sharp(Buffer.from(svg), { density: 72 }).png().toFile(OUT);
console.log("wrote", OUT, `${W}x${H}`);
for (const p of panels)
  console.log(
    `  ${p.tag.padEnd(10)} gap ${p.gapU.toFixed(1)}u  ${((100 * p.gapU) / CAPU).toFixed(2)}% cap  ` +
      `ratio ${p.ratio}  contours ${p.contours}`
  );
