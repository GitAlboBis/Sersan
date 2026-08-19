// Why the R changed, and how far it could go. Three panels, one scale, one
// baseline, weight 340 (the weight the treatments sheet was judged at):
//
//   BEFORE     the gap that shipped until 2026-08-18: 1.6 x stem. Drawn from the
//              archived woff2 when it is available, so it is literally the old
//              face rather than a rebuild of it.
//   ASKED FOR  gapRatio 3.0 taken literally (legMargin null). At 340 the slab
//              reaches past the leg's junction with the bowl and the leg comes
//              away: two contours, a floating parallelogram. Drawn in red.
//   SHIPS NOW  gapRatio 3.0 clamped to the ceiling the letterform imposes,
//              read back out of src/fonts/sersan-display-340.woff2.
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
const SHIPPED = `${ROOT}/src/fonts/sersan-display-${WGT}.woff2`;
const ARCHIVE =
  "C:/Users/alber/AppData/Local/Temp/claude/C--Users-alber-Desktop-sersan-v2-main/" +
  `af22389e-8cce-4b6d-878a-b414b24746c6/scratchpad/backup-fonts-gap16/sersan-display-${WGT}.woff2`;
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
  panels.push({ tag: "BEFORE", kind: "face", file: ARCHIVE, note: "what shipped until 2026-08-18", colour: INK });
} else {
  panels.push({
    tag: "BEFORE",
    kind: "build",
    opts: { gapRatio: 1.6 },
    note: "rebuilt at the old ratio 1.6",
    colour: INK,
  });
}
panels.push({
  tag: "ASKED FOR",
  kind: "build",
  opts: { gapRatio: 3.0, legMargin: null },
  note: "gapRatio 3.0 taken literally",
  colour: WARN,
});
panels.push({
  tag: "SHIPS NOW",
  kind: "face",
  file: SHIPPED,
  note: "3.0 clamped to the letterform's ceiling",
  colour: INK,
});

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
const TOP = 150;

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
  const broken = p.contours > 1;
  body += t(p.tag, 32, broken ? WARN : i === panels.length - 1 ? HIT : INK, 17, 2);
  body += t(p.note, 56);
  body += t(`GAP ${p.gapU.toFixed(0)} FONT UNITS  ·  ${((100 * p.gapU) / CAPU).toFixed(2)} % OF CAP`, 80, INK);
  body += t(`${p.ratio} × STEM (68u)  ·  ${p.contours} CONTOUR${broken ? "S" : ""}`, 100);
  if (broken) body += t("LEG SEVERED — FLOATS FREE. NOT SHIPPABLE.", 122, WARN, 13.5, 1);
});

const W = X * 2 + panels.length * PW + (panels.length - 1) * GAPX;
const H = TOP + PH + 160;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${CREAM}"/>
<text x="${X}" y="58" font-family="${MONO}" font-size="15" fill="${INK}" letter-spacing="2.8">SERSAN DISPLAY · THE R CUT, WIDENED · WEIGHT 340 · R AT CAP 320PX, ONE SCALE AND ONE BASELINE</text>
<text x="${X}" y="86" font-family="${MONO}" font-size="12.5" fill="${MUTED}" letter-spacing="1.1">UPM 1000 · CAP 700 · STEM 68 UNITS (9.71 % OF CAP) · THE PALE SHAPE IS THE UNTOUCHED JOST R — WHAT READS PALE IS WHAT THE CUT REMOVES</text>
<text x="${X}" y="110" font-family="${MONO}" font-size="12.5" fill="${MUTED}" letter-spacing="1.1">THE LETTERFORM CEILINGS THE OPEN BOWL AT 161 UNITS AT THIS WEIGHT — CUT PAST THAT AND THE SLAB TAKES THE LEG&#39;S JUNCTION WITH THE BOWL</text>
${body}</svg>`;
writeFileSync("r-gap-before-after.svg", svg);
await sharp(Buffer.from(svg), { density: 72 }).png().toFile(OUT);
console.log("wrote", OUT, `${W}x${H}`);
for (const p of panels)
  console.log(
    `  ${p.tag.padEnd(10)} gap ${p.gapU.toFixed(1)}u  ${((100 * p.gapU) / CAPU).toFixed(2)}% cap  ` +
      `ratio ${p.ratio}  contours ${p.contours}`
  );
