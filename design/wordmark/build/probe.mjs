// Render "SERSAN" from each candidate woff2 as SVG glyph outlines, stack into one sheet.
import * as fontkit from "fontkit";
import sharp from "file:///C:/Users/alber/Desktop/sersan-v2-main/node_modules/sharp/lib/index.js";
import { readFileSync, writeFileSync } from "node:fs";

const FONTS = "C:/Users/alber/Desktop/sersan-v2-main/public/_typelab/fonts/";
const rows = [
  ["Jost 200",       "jost-latin-200-normal.woff2",     null],
  ["Jost 300",       "jost-latin-300-normal.woff2",     null],
  ["Jost 400",       "jost-latin-400-normal.woff2",     null],
  ["Poppins 200",    "poppins-latin-200-normal.woff2",  null],
  ["Poppins 300",    "poppins-latin-300-normal.woff2",  null],
  ["Outfit 200",     "outfit-latin-200-normal.woff2",   null],
  ["Outfit 300",     "outfit-latin-300-normal.woff2",   null],
  ["Questrial 400",  "questrial-latin-400-normal.woff2",null],
  ["Sora 200",       "sora-latin-200-normal.woff2",     null],
  ["Sora 300",       "sora-latin-300-normal.woff2",     null],
  ["Figtree 300",    "figtree-latin-wght-normal.woff2", 300],
];

const CAP_PX = 62;           // target cap height in px
const TRACK = 0.30;          // em
const W = 1500, PADX = 46, ROWH = 132;

function glyphSvg(font, text, capPx, trackEm) {
  const upm = font.unitsPerEm;
  // cap height: prefer OS/2 capHeight, else measure 'H'
  let cap = font.capHeight;
  if (!cap) { const h = font.layout("H").glyphs[0]; cap = h.bbox.maxY; }
  const scale = capPx / (cap / upm * upm) * 1; // px per font unit at capPx
  const s = capPx / cap;
  const run = font.layout(text);
  const trackUnits = trackEm * upm;
  let x = 0, d = "";
  run.glyphs.forEach((g, i) => {
    const p = g.path.toSVG();
    if (p) d += `<path transform="translate(${(x * s).toFixed(3)} 0) scale(${s.toFixed(6)} ${(-s).toFixed(6)})" d="${p}"/>`;
    x += run.positions[i].xAdvance + trackUnits;
  });
  const width = (x - trackUnits) * s;
  return { d, width };
}

let y = 40, body = "";
for (const [label, file, wght] of rows) {
  try {
    let font = fontkit.create(readFileSync(FONTS + file));
    if (font.getVariation && wght) font = font.getVariation({ wght });
    const { d, width } = glyphSvg(font, "SERSAN", CAP_PX, TRACK);
    body += `<g transform="translate(${PADX} ${y + CAP_PX})" fill="#0B1422">${d}</g>`;
    body += `<text x="${PADX}" y="${y + CAP_PX + 26}" font-family="monospace" font-size="13" fill="#8A94A6">${label} · 0.30em · w=${width.toFixed(0)}px</text>`;
  } catch (e) {
    body += `<text x="${PADX}" y="${y + CAP_PX}" font-family="monospace" font-size="14" fill="#c00">${label}: ${String(e.message).slice(0, 80)}</text>`;
  }
  y += ROWH;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${y + 20}" width="${W}" height="${y + 20}"><rect width="${W}" height="${y + 20}" fill="#F6F3EE"/>${body}</svg>`;
writeFileSync("sheet.svg", svg);
await sharp(Buffer.from(svg), { density: 144 }).png().toFile("C:/Users/alber/Desktop/sersan-v2-main/design/logo-exploration/png/_fontsheet.png");
console.log("rows:", rows.length);
