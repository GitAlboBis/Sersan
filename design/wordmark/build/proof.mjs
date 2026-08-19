// Proof sheet for the produced woff2s — loaded back with fontkit, glyph
// outlines only (no system font substitution possible), rasterised with sharp.
//
// Weights: 340 and 260, the two the hero actually sets the wordmark at. Every
// number in the captions is read out of ladder-qa.json, i.e. measured on these
// very files by ladder-qa.mjs — nothing here re-derives a figure of its own.
//
// The R now ships as TWO contours: the open-bowl slab is run out to saturation,
// past the abscissa at which the leg lets go, so the leg stands free and the cut
// shows real daylight. Held at that severing point it showed none at all (the
// leg is diagonal, so the two pieces still touched) — see r-beyond.mjs.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import sharp from "file:///C:/Users/alber/Desktop/sersan-v2-main/node_modules/sharp/lib/index.js";

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

const ROOT = "C:/Users/alber/Desktop/sersan-v2-main";
const OUT = `${ROOT}/design/logo-exploration/png/_sersan_display_proof.png`;
const WGT = [340, 260]; // heavy first, then the lighter of the pair
const F = {};
for (const w of WGT) F[w] = fontkit.create(readFileSync(`${ROOT}/src/fonts/sersan-display-${w}.woff2`));
const AMP = JSON.parse(readFileSync("amputated-ladder.json", "utf8"));
const QA = JSON.parse(readFileSync("ladder-qa.json", "utf8"));
const qa = (w) => QA.faces.find((f) => f.weight === w);

for (const w of WGT)
  console.log(
    w,
    F[w].familyName,
    "|",
    F[w].subfamilyName,
    "| ps",
    F[w].postscriptName,
    "| glyphs",
    F[w].numGlyphs,
    "| upm",
    F[w].unitsPerEm,
    "| cap",
    F[w].capHeight,
    "| R contours",
    qa(w).contours.R,
    "| daylight",
    qa(w).daylight + "u"
  );

const CREAM = "#F6F3EE",
  INK = "#0B1422",
  MUTED = "#8A8378",
  RULE = "#E4DED4",
  HIT = "#1E7F98";
const MONO = "ui-monospace,Consolas,'Courier New',monospace";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** lay out `text` as outlines; `size` is px per em */
function run(font, text, size, trackEm = 0, x = 0, baseline = 0) {
  const s = size / font.unitsPerEm;
  const track = trackEm * font.unitsPerEm;
  const L = font.layout(text);
  let pen = 0,
    d = "";
  L.glyphs.forEach((g, i) => {
    const p = g.path.toSVG();
    if (p)
      d += `<path transform="translate(${((pen + L.positions[i].xOffset) * s).toFixed(3)} 0) scale(${s.toFixed(6)} ${(-s).toFixed(6)})" d="${p}"/>`;
    pen += L.positions[i].xAdvance + track;
  });
  return { g: `<g transform="translate(${x} ${baseline})" fill="${INK}">${d}</g>`, w: (pen - track) * s };
}

const emForCap = (font, capPx) => (capPx * font.unitsPerEm) / font.capHeight;

/** magnified crop: `k` px per font unit, centred on (cx,cy) in font units */
let uid = 0;
function zoom(font, ch, cx, cy, k, boxW, boxH, x, y) {
  const id = `z${uid++}`;
  const p = font.layout(ch).glyphs[0].path.toSVG() || "";
  const tx = x + boxW / 2 - cx * k;
  const ty = y + boxH / 2 + cy * k;
  return (
    `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${boxW}" height="${boxH}"/></clipPath>` +
    `<g clip-path="url(#${id})"><rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" fill="#FFFDF9"/>` +
    `<path transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k} ${-k})" fill="${INK}" d="${p}"/></g>` +
    `<rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" fill="none" stroke="${RULE}"/>`
  );
}

const X = 70,
  W = 1720;
let body = "",
  y = 92;
const label = (t, yy) =>
  `<text x="${X}" y="${yy}" font-family="${MONO}" font-size="12.5" fill="${MUTED}" letter-spacing="1.5">${esc(t)}</text>`;
const tag = (t, xx, yy, fill = MUTED) =>
  `<text x="${xx}" y="${yy}" font-family="${MONO}" font-size="11.5" fill="${fill}">${esc(t)}</text>`;
const rule = (yy) => `<rect x="${X}" y="${yy}" width="${W - 2 * X}" height="1" fill="${RULE}"/>`;

// (a) SERSAN, cap 110px, 0.35em tracking, both weights
for (const w of WGT) {
  const f = F[w];
  const q = qa(w);
  body += label(
    `SERSAN DISPLAY ${w} · CAP 110PX · 0.35EM TRACKING · R = ${q.contours.R} CONTOURS, ` +
      `DAYLIGHT ${q.daylight}u = ${q.daylightPctCap}% OF CAP`,
    y
  );
  body += run(f, "SERSAN", emForCap(f, 110), 0.35, X, y + 34 + 110).g;
  y += 34 + 110 + 56;
  body += rule(y - 30);
}

// (b) A and R big, both weights
{
  body += label(`A · R · CAP 210PX — ${WGT[0]} THEN ${WGT[1]} — THE TWO AMPUTATED GLYPHS`, y);
  const base = y + 32 + 210;
  const a = run(F[WGT[0]], "AR", emForCap(F[WGT[0]], 210), 0.14, X, base);
  const b = run(F[WGT[1]], "AR", emForCap(F[WGT[1]], 210), 0.14, X + a.w + 130, base);
  body += a.g + b.g;
  body += tag(`${WGT[0]}`, X, base + 28) + tag(`${WGT[1]}`, X + a.w + 130, base + 28);
  body += tag(
    "A: ONE CONTOUR, NO CROSSBAR   ·   R: TWO CONTOURS, THE LEG STANDING FREE",
    X + a.w + 130 + 260,
    base + 28,
    HIT
  );
  y = base + 74;
  body += rule(y - 30);
}

// (c) magnified junctions — the two cuts under a loupe
{
  body += label("LOUPE · THE R'S DAYLIGHT AND THE A'S APEX · PX PER FONT UNIT AS MARKED", y);
  const top = y + 22;
  const BW = 330,
    BH = 230,
    GAPX = 26;
  let x = X;
  for (const w of WGT) {
    const g = AMP[w].glyphs.R;
    const k = g.k; // cap-100 units -> font units
    const rect = g.report.rect.map((v) => v * k);
    const q = qa(w);
    // centred on the daylight itself: just right of the stem, mid-band
    const cx = rect[0] + 0.36 * (rect[2] - rect[0]);
    const cy = (rect[1] + rect[3]) / 2;
    body += zoom(F[w], "R", cx, cy, 1.15, BW, BH, x, top);
    body += tag(`R ${w} · daylight ${q.daylight}u (${q.daylightPctCap}% of cap)`, x, top + BH + 18, HIT);
    body += tag(`slab ${q.slab}u = ${q.slabRatioStem}× stem ${q.stem}u`, x, top + BH + 34);
    x += BW + GAPX;
    const ar = AMP[w].glyphs.A.report;
    const acx = ((ar.crossbarTop[0][0] + ar.crossbarTop[1][0]) / 2) * AMP[w].glyphs.A.k;
    const acy = ((ar.crossbarTop[0][1] + ar.crossbarBottom[0][1]) / 2) * AMP[w].glyphs.A.k;
    body += zoom(F[w], "A", acx, acy, 0.9, BW, BH, x, top);
    body += tag(`A ${w} · crossbar band removed`, x, top + BH + 18);
    body += tag(`one contour, no nub`, x, top + BH + 34);
    x += BW + GAPX;
  }
  y = top + BH + 66;
  body += rule(y - 26);
}

// (d) uppercase alphabet
{
  body += label(`A–Z · ${WGT[0]} · CAP 62PX — every other glyph must be untouched`, y);
  body += run(F[WGT[0]], "ABCDEFGHIJKLMNOPQRSTUVWXYZ", emForCap(F[WGT[0]], 62), 0.02, X, y + 28 + 62).g;
  y += 28 + 62 + 48;
  body += rule(y - 26);
}

// (e) lowercase pangram
{
  body += label(`PANGRAM · ${WGT[0]}`, y);
  body += run(F[WGT[0]], "the quick brown fox jumps over a lazy dog", 42, 0, X, y + 28 + 32).g;
  body += run(
    F[WGT[0]],
    "Perché il ghiaccio è più duro? — Àèìòù, «SERSAN» (0.5%) #@&",
    32,
    0,
    X,
    y + 28 + 32 + 50
  ).g;
  y += 28 + 32 + 50 + 52;
  body += rule(y - 26);
}

// (f) digits
{
  body += label(`DIGITS · ${WGT[0]} THEN ${WGT[1]} · 54PX/EM`, y);
  const a = run(F[WGT[0]], "0123456789", 54, 0.03, X, y + 28 + 40);
  const b = run(F[WGT[1]], "0123456789", 54, 0.03, X + a.w + 70, y + 28 + 40);
  body += a.g + b.g;
  y += 28 + 40 + 50;
  body += rule(y - 24);
}

// (g) small-size survival — where a free-standing leg would fall apart first
{
  body += label("SMALL SIZES · SERSAN · 0.35EM TRACKING — the leg must still read as an R", y);
  let yy = y + 28 + 18;
  for (const [w, px] of [
    [WGT[1], 16],
    [WGT[0], 16],
    [WGT[1], 22],
    [WGT[0], 22],
  ]) {
    body += run(F[w], "SERSAN", px, 0.35, X + 110, yy).g;
    body += tag(`${w}/${px}px`, X, yy);
    yy += 34;
  }
  y = yy + 24;
}

const H = Math.ceil(y);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${CREAM}"/>
<text x="${X}" y="40" font-family="${MONO}" font-size="13" fill="${INK}" letter-spacing="2.8">SERSAN DISPLAY · PROOF · RENDERED FROM src/fonts/sersan-display-{${WGT.join(",")}}.woff2 VIA FONTKIT</text>
<text x="${X}" y="64" font-family="${MONO}" font-size="12" fill="${MUTED}" letter-spacing="1.2">UPM 1000 · CAP 700 · A = 1 CONTOUR · R = 2 CONTOURS (LEG FREE, BY DESIGN) · DAYLIGHT ${qa(WGT[0]).daylight}u AT ${WGT[0]}, ${qa(WGT[1]).daylight}u AT ${WGT[1]} — MEASURED BY ladder-qa.mjs</text>
${body}</svg>`;
writeFileSync("proof.svg", svg);
await sharp(Buffer.from(svg), { density: 72 }).png().toFile(OUT);
console.log("wrote", OUT, W + "x" + H);
