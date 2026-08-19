// Weight-ladder proof sheet. Same approach as proof.mjs: the faces are loaded
// back with fontkit and drawn as GLYPH OUTLINES, so no system font can be
// substituted for them — what the sheet shows is what is in src/fonts/.
//
//   1  the ladder: SERSAN, cap 100px, 0.30em tracking, one row per weight,
//      captioned with the measured stem/cap % and a gauge against the
//      5.0-6.5 % reference band
//   2  A and R at cap 120px for every weight — the two amputated glyphs, big
//   3  loupes on the R bowl/stem gap and the A crossbar band, the two places a
//      heavier weight could close the cut or leave a nub
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

const OUT = "C:/Users/alber/Desktop/sersan-v2-main/design/logo-exploration/png/_weight_ladder.png";
const FONTS = "C:/Users/alber/Desktop/sersan-v2-main/src/fonts/";
const M = JSON.parse(readFileSync("ladder-measure.json", "utf8"));
const AMP = JSON.parse(readFileSync("amputated-ladder.json", "utf8"));

const CREAM = "#F6F3EE",
  INK = "#0B1422",
  MUTED = "#8A8378",
  RULE = "#E4DED4",
  BAND = "#D9E9EE",
  HIT = "#1E7F98";
const MONO = "ui-monospace,Consolas,'Courier New',monospace";
const TARGET = [5.0, 6.5];

const F = {};
for (const r of M) F[r.weight] = fontkit.create(readFileSync(`${FONTS}sersan-display-${r.weight}.woff2`));

const emForCap = (font, capPx) => (capPx * font.unitsPerEm) / font.capHeight;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** lay out `text` as outlines; `size` is px per em, `trackEm` letter-spacing */
function run(font, text, size, trackEm = 0, x = 0, baseline = 0, fill = INK) {
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
  return { g: `<g transform="translate(${x} ${baseline})" fill="${fill}">${d}</g>`, w: (pen - track) * s };
}

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

const X = 80,
  W = 1720,
  COLW = W - 2 * X;
let body = "",
  y = 100;
const label = (t, yy, fill = MUTED, size = 12.5) =>
  `<text x="${X}" y="${yy}" font-family="${MONO}" font-size="${size}" fill="${fill}" letter-spacing="1.5">${esc(t)}</text>`;
const tag = (t, xx, yy, fill = MUTED, size = 11.5, anchor = "start") =>
  `<text x="${xx}" y="${yy}" font-family="${MONO}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(t)}</text>`;
const rule = (yy) => `<rect x="${X}" y="${yy}" width="${COLW}" height="1" fill="${RULE}"/>`;

/* ── gauge: stem/cap % on a 4–10 % scale with the reference band shaded ── */
const GX = X + 1180,
  GW = 420,
  GLO = 4,
  GHI = 10;
const gx = (pct) => GX + (GW * (pct - GLO)) / (GHI - GLO);
function gauge(pct, yy, hit) {
  let s = `<rect x="${gx(TARGET[0])}" y="${yy - 11}" width="${gx(TARGET[1]) - gx(TARGET[0])}" height="22" fill="${BAND}"/>`;
  s += `<rect x="${GX}" y="${yy}" width="${GW}" height="1" fill="${RULE}"/>`;
  s += `<rect x="${(gx(pct) - 1.25).toFixed(2)}" y="${yy - 13}" width="2.5" height="26" fill="${hit ? HIT : INK}"/>`;
  return s;
}

/* ═══════════════════════════════════════════════════ 1 · the ladder ══ */
body += label("THE LADDER · SERSAN · CAP 100PX · 0.30EM TRACKING · ONE ROW PER WEIGHT", y);
body += tag(`REFERENCE BAND ${TARGET[0].toFixed(1)}–${TARGET[1].toFixed(1)}% STEM/CAP`, GX, y, MUTED);
body += tag("4%", GX, y + 16, RULE) + tag("10%", GX + GW, y + 16, RULE, 11.5, "end");
y += 30;

for (const r of M) {
  const f = F[r.weight];
  const hit = r.pctN >= TARGET[0] && r.pctN <= TARGET[1];
  const base = y + 100;
  body += run(f, "SERSAN", emForCap(f, 100), 0.3, X, base).g;
  const cap = `${String(r.weight).padStart(3)}  ·  stem ${String(r.stemN.toFixed(0)).padStart(2)}u / cap ${r.capMeasured}u  =  ${r.pctN.toFixed(2)}%${hit ? "   << IN BAND" : ""}`;
  body += tag(cap, X + 900, base - 38, hit ? HIT : MUTED, 14);
  body += gauge(r.pctN, base - 44, hit);
  y = base + 46;
}
body += rule(y - 16);
y += 26;

/* ═════════════════════════════════════ 2 · the two amputated glyphs ══ */
{
  // Fit the seven pairs to the column instead of guessing a cap: measure at a
  // reference cap, then scale so the widest ladder still clears the margin.
  const GAPX = 22;
  const probe = M.map((r) => run(F[r.weight], "AR", emForCap(F[r.weight], 100), 0.1, 0, 0).w);
  const CAP2 = Math.min(
    120,
    (100 * (COLW - GAPX * (M.length - 1))) / probe.reduce((a, b) => a + b, 0)
  );
  body += label(`THE TWO CUTS · A (NO CROSSBAR) · R (OPEN BOWL) · CAP ${CAP2.toFixed(0)}PX`, y);
  const base = y + 30 + CAP2;
  let x = X;
  for (const r of M) {
    const f = F[r.weight];
    const a = run(f, "AR", emForCap(f, CAP2), 0.1, x, base);
    body += a.g + tag(`${r.weight} · ${r.pctN.toFixed(2)}%`, x, base + 24, r.pctN >= TARGET[0] && r.pctN <= TARGET[1] ? HIT : MUTED);
    x += a.w + GAPX;
  }
  y = base + 62;
  body += rule(y - 22);
  y += 26;
}

/* ═══════════════════════════════════════════════════════ 3 · loupes ══ */
{
  const N = M.length;
  const GAPX = 10;
  const BW = Math.floor((COLW - GAPX * (N - 1)) / N);
  const BH = BW;

  body += label("LOUPE · R BOWL/STEM GAP · 0.62PX PER FONT UNIT — the gap must stay open and the bowl must resume past it", y);
  let top = y + 22;
  M.forEach((r, i) => {
    const rep = AMP[r.weight].glyphs.R.report;
    const k = AMP[r.weight].glyphs.R.k;
    const rect = rep.rect.map((v) => v * k);
    const x = X + i * (BW + GAPX);
    body += zoom(F[r.weight], "R", (rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2, 0.62, BW, BH, x, top);
    body += tag(`${r.weight} · gap ${(rep.gap * k).toFixed(0)}u = 1.6x stem ${(rep.stem.thickness * k).toFixed(0)}u`, x, top + BH + 16);
  });
  y = top + BH + 44;

  body += label("LOUPE · A CROSSBAR BAND · 0.42PX PER FONT UNIT — the band must be empty, the legs clean, the peak bare", y);
  top = y + 22;
  M.forEach((r, i) => {
    const rep = AMP[r.weight].glyphs.A.report;
    const k = AMP[r.weight].glyphs.A.k;
    const cx = ((rep.crossbarTop[0][0] + rep.crossbarTop[1][0]) / 2) * k;
    const cy = ((rep.crossbarTop[0][1] + rep.crossbarBottom[0][1]) / 2) * k;
    const x = X + i * (BW + GAPX);
    body += zoom(F[r.weight], "A", cx, cy, 0.42, BW, BH, x, top);
    body += tag(`${r.weight} · crossbar ${(rep.crossbarThickness * k).toFixed(0)}u removed`, x, top + BH + 16);
  });
  y = top + BH + 44;

  body += label("LOUPE · A APEX · 0.42PX PER FONT UNIT — no counter, no bar stub at the top of the chevron", y);
  top = y + 22;
  M.forEach((r, i) => {
    const f = F[r.weight];
    const bb = f.layout("A").glyphs[0].bbox;
    const x = X + i * (BW + GAPX);
    body += zoom(f, "A", (bb.minX + bb.maxX) / 2, bb.maxY - BH / 2 / 0.42, 0.42, BW, BH, x, top);
    body += tag(`${r.weight} · apex`, x, top + BH + 16);
  });
  y = top + BH + 40;
}

const H = Math.ceil(y);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${CREAM}"/>
<text x="${X}" y="52" font-family="${MONO}" font-size="13" fill="${INK}" letter-spacing="2.8">SERSAN DISPLAY · WEIGHT LADDER · RENDERED FROM src/fonts/sersan-display-*.woff2 VIA FONTKIT OUTLINES</text>
<text x="${X}" y="74" font-family="${MONO}" font-size="12" fill="${MUTED}" letter-spacing="1.2">STEM = INK SPAN ACROSS THE N LEFT VERTICAL AT MID-CAP, SCANNED OFF THE OUTLINE · CAP = 700 UNITS (UPM 1000)</text>
${body}</svg>`;
writeFileSync("ladder-proof.svg", svg);
await sharp(Buffer.from(svg), { density: 72 }).png().toFile(OUT);
console.log("wrote", OUT, W + "x" + H);
