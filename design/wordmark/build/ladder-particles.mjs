// How each weight reads AS A PARTICLE FIELD.
//
// The wordmark in the hero is never drawn as text: src/webgl/text/
// sampleTextPoints.ts rasterises it to an offscreen canvas, reads the alpha
// channel back, and scatters particles at random points inside the glyph
// coverage. A thin stroke therefore becomes a thin ribbon of points, and the
// particle disc can end up WIDER than the stroke it is meant to describe —
// which is the "too thin / wispy" the owner is reporting. This sheet
// reproduces that pipeline exactly, per weight.
//
// Sampling, step for step as sampleTextPoints does it:
//   pad = ceil(fontSizePx * 0.25); canvas = block + 2*pad
//   blockW = measureText = sum(advances) + letterSpacing after EVERY char
//   (Chromium counts the trailing one, and the component's own notes confirm
//   the DOM rect and the raster agree on that)
//   fill the glyphs, read alpha, collect covered cells on a stride-2 grid at
//   alpha > 128, then pick `count` of them at random WITH REPLACEMENT and
//   jitter each pick inside its stride cell.
//
// Two panels per weight:
//   LEFT   the brief's view — cap 100px, 9,000 points, hard 1px dots on cream.
//          Reads the sampled geometry: stroke width, coverage, granularity.
//   RIGHT  the hero's real numbers, measured out of the shipped components:
//          data-hero-brand is clamp(2.45rem, 7.2vw, 7.59rem) => 103.7px at a
//          1440px viewport => CAP 72.6PX, tracking 0.3em, and
//          HeroTextParticles draws COUNT_BY_TIER.full = 48,000 instances at
//          uPointSize 8. Light on the brand navy, accumulated with one shared
//          exposure across all seven rows so the weights stay comparable.
//          This is the panel that answers "is it thick enough".
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

const OUT =
  "C:/Users/alber/Desktop/sersan-v2-main/design/logo-exploration/png/_weight_ladder_particles.png";
const FONTS = "C:/Users/alber/Desktop/sersan-v2-main/src/fonts/";
const M = JSON.parse(readFileSync("ladder-measure.json", "utf8"));

const TEXT = "SERSAN";
const TRACK_EM = 0.3;
const STRIDE = 2; // sampleTextPoints
const ALPHA_MIN = 128; // sampleTextPoints

const CAP_BRIEF = 100;
const N_BRIEF = 9000;
const CAP_HERO = 72.6; // 7.2vw of 1440 = 103.68px font-size, x cap 700/upm 1000
const N_HERO = 48000; // COUNT_BY_TIER.full
const DISC_HERO = 8; // uPointSize

const CREAM = [246, 243, 238];
const INK = [11, 20, 34];
const LIGHT = [244, 246, 250];
const MUTED = "#8A8378";
const HIT = "#1E7F98";
const TARGET = [5.0, 6.5];
const MONO = "ui-monospace,Consolas,'Courier New',monospace";

// Deterministic RNG — the sheet must be reproducible run to run.
let seed = 0x5e751a4;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const F = {};
for (const r of M) F[r.weight] = fontkit.create(readFileSync(`${FONTS}sersan-display-${r.weight}.woff2`));

/* ── rasterise the wordmark exactly as the offscreen canvas would ─────────── */
async function raster(font, capPx) {
  const em = (capPx * font.unitsPerEm) / font.capHeight;
  const s = em / font.unitsPerEm;
  const track = TRACK_EM * font.unitsPerEm; // FONT UNITS — the pen runs in font units
  const L = font.layout(TEXT);

  let pen = 0;
  let d = "";
  L.glyphs.forEach((g, i) => {
    const p = g.path.toSVG();
    if (p)
      d += `<path transform="translate(${((pen + L.positions[i].xOffset) * s).toFixed(4)} 0) scale(${s.toFixed(7)} ${(-s).toFixed(7)})" d="${p}"/>`;
    pen += L.positions[i].xAdvance + track;
  });
  const blockW = pen * s; // trailing letter-spacing included, as measureText counts it
  const lineH = em; // the DOM headline is leading-none
  const pad = Math.ceil(em * 0.25);
  const W = Math.ceil(blockW + pad * 2);
  const H = Math.ceil(lineH + pad * 2);
  // textBaseline "middle": the text's middle sits on the line's centre.
  const asc = (font.ascent * s + font.descent * s) / 2; // descent is negative in fontkit
  const baseline = pad + lineH * 0.5 + asc;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<g transform="translate(${pad} ${baseline.toFixed(3)})" fill="#fff">${d}</g></svg>`;
  const { data } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // ink must not be clipped by the canvas — the real code has the same contract
  let top = H;
  let bot = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (data[(y * W + x) * 4 + 3] > ALPHA_MIN) {
        if (y < top) top = y;
        if (y > bot) bot = y;
      }
  if (top <= 0 || bot >= H - 1) throw new Error(`ink touches the canvas edge (${top}..${bot} of ${H})`);

  return { data, W, H, blockW, capPx, inkTop: top, inkBot: bot };
}

/** stride-2 covered cells, then `count` random picks with replacement */
function sample(r, count) {
  const cand = [];
  for (let y = 0; y < r.H; y += STRIDE)
    for (let x = 0; x < r.W; x += STRIDE)
      if (r.data[(y * r.W + x) * 4 + 3] > ALPHA_MIN) cand.push(x, y);
  const n = cand.length / 2;
  const xy = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const k = (rnd() * n) | 0;
    xy[i * 2] = cand[k * 2] + rnd() * STRIDE;
    xy[i * 2 + 1] = cand[k * 2 + 1] + rnd() * STRIDE;
  }
  return { xy, inkCells: n };
}

/* ── page raster ──────────────────────────────────────────────────────────── */
const X = 70;
const W = 1740;
const ROW = 214;
const TOP = 128;
const H = TOP + M.length * ROW + 56;

const COL2 = 960; // hero panel origin

/** soft disc splat into an RGB float accumulator */
function splat(acc, W, H, cx, cy, rad, amp) {
  const x0 = Math.max(0, Math.floor(cx - rad));
  const x1 = Math.min(W - 1, Math.ceil(cx + rad));
  const y0 = Math.max(0, Math.floor(cy - rad));
  const y1 = Math.min(H - 1, Math.ceil(cy + rad));
  const inv = 1 / (rad * rad);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const t = (dx * dx + dy * dy) * inv;
      if (t >= 1) continue;
      const f = 1 - t; // smooth radial falloff, like a soft point sprite
      acc[y * W + x] += amp * f * f;
    }
}

const rows = [];
for (const r of M) {
  const font = F[r.weight];
  const rb = await raster(font, CAP_BRIEF);
  const sb = sample(rb, N_BRIEF);
  const rh = await raster(font, CAP_HERO);
  const sh = sample(rh, N_HERO);
  rows.push({ r, rb, sb, rh, sh });
  console.log(
    `wght ${String(r.weight).padStart(3)}  stem/cap ${r.pctN.toFixed(2)}%  ` +
      `cap100: block ${rb.blockW.toFixed(0)}px, ink cells ${sb.inkCells} (${(N_BRIEF / sb.inkCells).toFixed(2)} pts/cell)  |  ` +
      `hero cap ${CAP_HERO}: stem ${((r.pctN / 100) * CAP_HERO).toFixed(2)}px vs ${DISC_HERO}px disc, ` +
      `ink cells ${sh.inkCells} (${(N_HERO / sh.inkCells).toFixed(1)} pts/cell)`
  );
}

/** accumulate one hero panel's 48k soft discs into `acc` at unit amplitude */
function accumulate(acc, row, ox, oy) {
  acc.fill(0);
  for (let k = 0; k < N_HERO; k++)
    splat(acc, W, H, ox + row.sh.xy[k * 2], oy + row.sh.xy[k * 2 + 1], DISC_HERO / 2, 1);
}

/* background page: cream + all the type, rendered once, then dots on top */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const tag = (t, x, y, fill = MUTED, size = 11.5) =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" fill="${fill}">${esc(t)}</text>`;

let type = "";
type += tag(
  "SERSAN DISPLAY · WEIGHT LADDER AS PARTICLES · SAMPLED WITH src/webgl/text/sampleTextPoints.ts (STRIDE 2, ALPHA>128, RANDOM PICK WITH REPLACEMENT)",
  X,
  46,
  "#0B1422",
  13
);
type += tag(
  `LEFT  cap ${CAP_BRIEF}px · ${N_BRIEF.toLocaleString("en")} points · 1px dots — the sampled geometry`,
  X,
  74
);
type += tag(
  `RIGHT  the hero's own numbers: cap ${CAP_HERO}px (7.2vw @1440) · ${N_HERO.toLocaleString("en")} particles`,
  COL2,
  74
);
type += tag(`       ${DISC_HERO}px discs · light on brand navy · one shared exposure`, COL2, 96);
type += tag(
  "STEM/CAP TARGET 5.0-6.5% · a stem NARROWER than the 8px particle disc is what reads as a wispy cloud instead of a letter",
  X,
  96
);

const navy = [];
for (const [i, row] of rows.entries()) {
  const y = TOP + i * ROW;
  const hit = row.r.pctN >= TARGET[0] && row.r.pctN <= TARGET[1];
  const stemPx = (row.r.pctN / 100) * CAP_HERO;
  type += tag(
    `${row.r.weight} · ${row.r.pctN.toFixed(2)}% stem/cap${hit ? "  << IN BAND" : ""}`,
    X,
    y - 12,
    hit ? HIT : MUTED,
    13
  );
  type += tag(
    `${row.sb.inkCells} ink cells · ${(N_BRIEF / row.sb.inkCells).toFixed(2)} pts/cell`,
    X + 300,
    y - 12
  );
  type += tag(
    `hero stem ${stemPx.toFixed(1)}px vs ${DISC_HERO}px disc = ${(stemPx / DISC_HERO).toFixed(2)}x`,
    COL2,
    y - 12,
    stemPx >= DISC_HERO ? HIT : MUTED,
    13
  );
  navy.push({ x: COL2 - 16, y: y - 4, w: W - X - (COL2 - 16), h: ROW - 26 });
}
for (const n of navy)
  type += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="#0B1422"/>`;

const page = await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      `<rect width="${W}" height="${H}" fill="rgb(${CREAM})"/>${type}</svg>`
  )
)
  .raw()
  .toBuffer({ resolveWithObject: true });
const px = Buffer.from(page.data); // RGB
const CH = page.info.channels;

/* ── LEFT: hard 1px dots, ink on cream ── */
function dot(cx, cy, rad, col) {
  const x0 = Math.max(0, Math.floor(cx - rad));
  const x1 = Math.min(W - 1, Math.ceil(cx + rad));
  const y0 = Math.max(0, Math.floor(cy - rad));
  const y1 = Math.min(H - 1, Math.ceil(cy + rad));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const a = Math.max(0, Math.min(1, rad + 0.5 - dist));
      if (a <= 0) continue;
      const o = (y * W + x) * CH;
      for (let c = 0; c < 3; c++) px[o + c] = px[o + c] * (1 - a) + col[c] * a;
    }
}

for (const [i, row] of rows.entries()) {
  const y = TOP + i * ROW;
  // seat the ink band inside the row
  const ox = X - 0;
  const oy = y + (ROW - 26 - (row.rb.inkBot - row.rb.inkTop)) / 2 - row.rb.inkTop - 6;
  for (let k = 0; k < N_BRIEF; k++) dot(ox + row.sb.xy[k * 2], oy + row.sb.xy[k * 2 + 1], 1.0, INK);
}

/* ── RIGHT: 48k soft 8px discs, light accumulated on navy ── */
const acc = new Float32Array(W * H);
const heroOrigin = (row, i) => [
  COL2 + 24,
  TOP + i * ROW + (ROW - 26 - (row.rh.inkBot - row.rh.inkTop)) / 2 - row.rh.inkTop - 4,
];

// ONE shared exposure for all seven rows, calibrated off the 300 row (today's
// shipped hero weight): its 99.5th-percentile accumulation is put at 2.2, i.e.
// a well-exposed stroke core. Auto-levelling each row separately would erase
// exactly the density difference the sheet exists to show.
{
  const i = rows.findIndex((x) => x.r.weight === 300);
  const [ox, oy] = heroOrigin(rows[i], i);
  accumulate(acc, rows[i], ox, oy);
  const lit = Array.from(acc).filter((v) => v > 0).sort((a, b) => a - b);
  var EXPOSURE = 2.2 / lit[Math.floor(lit.length * 0.995)];
  console.log(`hero exposure calibrated on w300: p99.5 ${lit[Math.floor(lit.length * 0.995)].toFixed(2)} -> x${EXPOSURE.toFixed(4)}`);
}

for (const [i, row] of rows.entries()) {
  const [ox, oy] = heroOrigin(row, i);
  accumulate(acc, row, ox, oy);
  // film response: saturating, so dense cores clip the way a bloomed sprite
  // field does, instead of going linearly white
  for (let p = 0; p < W * H; p++) {
    if (acc[p] <= 0) continue;
    const a = 1 - Math.exp(-acc[p] * EXPOSURE);
    const o = p * CH;
    for (let c = 0; c < 3; c++) px[o + c] = px[o + c] * (1 - a) + LIGHT[c] * a;
  }
}

await sharp(px, { raw: { width: W, height: H, channels: CH } }).png().toFile(OUT);
console.log("wrote", OUT, `${W}x${H}`);
