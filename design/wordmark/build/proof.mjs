// Proof sheet for the produced woff2s — loaded back with fontkit, glyph
// outlines only (no system font substitution possible), rasterised with sharp.
import * as fontkit from "fontkit";
import sharp from "file:///C:/Users/alber/Desktop/sersan-v2-main/node_modules/sharp/lib/index.js";
import { readFileSync, writeFileSync } from "node:fs";

const OUT = "C:/Users/alber/Desktop/sersan-v2-main/design/logo-exploration/png/_sersan_display_proof.png";
const F = {
  200: fontkit.create(readFileSync("C:/Users/alber/Desktop/sersan-v2-main/src/fonts/sersan-display-200.woff2")),
  300: fontkit.create(readFileSync("C:/Users/alber/Desktop/sersan-v2-main/src/fonts/sersan-display-300.woff2")),
};
const AMP = JSON.parse(readFileSync("amputated.json", "utf8"));
for (const [w, f] of Object.entries(F))
  console.log(w, f.familyName, "|", f.subfamilyName, "| ps", f.postscriptName, "| glyphs", f.numGlyphs, "| upm", f.unitsPerEm, "| cap", f.capHeight);

const CREAM = "#F6F3EE", INK = "#0B1422", MUTED = "#8A8378", RULE = "#E4DED4";
const MONO = "ui-monospace,Consolas,'Courier New',monospace";

/** lay out `text` as outlines; `size` is px per em */
function run(font, text, size, trackEm = 0, x = 0, baseline = 0) {
  const s = size / font.unitsPerEm;
  const track = trackEm * font.unitsPerEm;
  const L = font.layout(text);
  let pen = 0, d = "";
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

const X = 70, W = 1720;
let body = "", y = 92;
const label = (t, yy) =>
  `<text x="${X}" y="${yy}" font-family="${MONO}" font-size="12.5" fill="${MUTED}" letter-spacing="1.5">${t}</text>`;
const tag = (t, xx, yy) =>
  `<text x="${xx}" y="${yy}" font-family="${MONO}" font-size="11.5" fill="${MUTED}">${t}</text>`;
const rule = (yy) => `<rect x="${X}" y="${yy}" width="${W - 2 * X}" height="1" fill="${RULE}"/>`;

// (a) + (b) SERSAN, cap 110px, 0.35em tracking, both weights
for (const w of [200, 300]) {
  const f = F[w];
  body += label(`SERSAN DISPLAY ${w} · CAP 110PX · 0.35EM TRACKING`, y);
  body += run(f, "SERSAN", emForCap(f, 110), 0.35, X, y + 34 + 110).g;
  y += 34 + 110 + 56;
  body += rule(y - 30);
}

// (extra) A and R big, both weights
{
  body += label("A · R · CAP 210PX — 300 THEN 200", y);
  const base = y + 32 + 210;
  const a = run(F[300], "AR", emForCap(F[300], 210), 0.14, X, base);
  const b = run(F[200], "AR", emForCap(F[200], 210), 0.14, X + a.w + 130, base);
  body += a.g + b.g + tag("300", X, base + 28) + tag("200", X + a.w + 130, base + 28);
  y = base + 74;
  body += rule(y - 30);
}

// (extra) magnified junctions — the two cuts under a loupe
{
  body += label("LOUPE · R BOWL/STEM GAP AND A APEX · 0.9PX PER FONT UNIT", y);
  const top = y + 22;
  const BW = 330, BH = 230, GAPX = 26;
  let x = X;
  for (const w of [300, 200]) {
    const r = AMP[w].glyphs.R.report; // cap-100 units -> font units = ×7
    const rect = r.rect.map((v) => v * 7);
    body += zoom(F[w], "R", (rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2, 1.5, BW, BH, x, top);
    body += tag(`R ${w} · gap ${(r.gap * 7).toFixed(0)}u = 1.6 × stem ${(r.stem.thickness * 7).toFixed(0)}u`, x, top + BH + 18);
    x += BW + GAPX;
    const ar = AMP[w].glyphs.A.report; // where the crossbar used to be
    const acx = ((ar.crossbarTop[0][0] + ar.crossbarTop[1][0]) / 2) * 7;
    const acy = ((ar.crossbarTop[0][1] + ar.crossbarBottom[0][1]) / 2) * 7;
    body += zoom(F[w], "A", acx, acy, 0.9, BW, BH, x, top);
    body += tag(`A ${w} · crossbar band removed`, x, top + BH + 18);
    x += BW + GAPX;
  }
  y = top + BH + 52;
  body += rule(y - 26);
}

// (c) uppercase alphabet, 300
{
  body += label("A–Z · 300 · CAP 62PX — every other glyph must be untouched", y);
  body += run(F[300], "ABCDEFGHIJKLMNOPQRSTUVWXYZ", emForCap(F[300], 62), 0.02, X, y + 28 + 62).g;
  y += 28 + 62 + 48;
  body += rule(y - 26);
}

// (d) lowercase pangram, 300
{
  body += label("PANGRAM · 300", y);
  body += run(F[300], "the quick brown fox jumps over a lazy dog", 42, 0, X, y + 28 + 32).g;
  body += run(F[300], "Perché il ghiaccio è più duro? — Àèìòù, «SERSAN» (0.5%) #@&", 32, 0, X, y + 28 + 32 + 50).g;
  y += 28 + 32 + 50 + 52;
  body += rule(y - 26);
}

// (e) digits
{
  body += label("DIGITS · 300 THEN 200 · 54PX/EM", y);
  const a = run(F[300], "0123456789", 54, 0.03, X, y + 28 + 40);
  const b = run(F[200], "0123456789", 54, 0.03, X + a.w + 70, y + 28 + 40);
  body += a.g + b.g;
  y += 28 + 40 + 50;
  body += rule(y - 24);
}

// (f) small-size survival
{
  body += label("SMALL SIZES · SERSAN · 0.35EM TRACKING", y);
  let yy = y + 28 + 18;
  for (const [w, px] of [[200, 16], [300, 16], [200, 22], [300, 22]]) {
    body += run(F[w], "SERSAN", px, 0.35, X + 110, yy).g;
    body += tag(`${w}/${px}px`, X, yy);
    yy += 34;
  }
  y = yy + 24;
}

const H = Math.ceil(y);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${CREAM}"/>
<text x="${X}" y="48" font-family="${MONO}" font-size="13" fill="${INK}" letter-spacing="2.8">SERSAN DISPLAY · PROOF · RENDERED FROM src/fonts/sersan-display-{200,300}.woff2 VIA FONTKIT</text>
${body}</svg>`;
writeFileSync("proof.svg", svg);
await sharp(Buffer.from(svg), { density: 72 }).png().toFile(OUT);
console.log("wrote", OUT, W + "x" + H);
