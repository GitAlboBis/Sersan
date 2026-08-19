// Render the logotype review sheets + per-variant SVGs.
import sharp from "file:///C:/Users/alber/Desktop/sersan-v2-main/node_modules/sharp/lib/index.js";
import { buildLogotype } from "file:///C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/logotype.mjs";
import { writeFileSync, mkdirSync } from "node:fs";

const FONTS = "C:/Users/alber/Desktop/sersan-v2-main/public/_typelab/fonts/";
const PNG = "C:/Users/alber/Desktop/sersan-v2-main/design/logo-exploration/png/";
const SVGDIR = "C:/Users/alber/Desktop/sersan-v2-main/public/_typelab/logotype/";
mkdirSync(SVGDIR, { recursive: true });

const CREAM = "#F6F3EE";
const INK = "#0B1422";
const MUTED = "#8A94A6";

const F = {
  "jost200": ["JOST 200", "jost-latin-200-normal.woff2"],
  "jost300": ["JOST 300", "jost-latin-300-normal.woff2"],
  "outfit200": ["OUTFIT 200", "outfit-latin-200-normal.woff2"],
  "outfit300": ["OUTFIT 300", "outfit-latin-300-normal.woff2"],
  "questrial400": ["QUESTRIAL 400", "questrial-latin-400-normal.woff2"],
  "poppins200": ["POPPINS 200", "poppins-latin-200-normal.woff2"],
};

const BEST = process.env.BEST || "jost200";

const rows = [
  { key: "jost200", t: 0.30, r: "openbowl", a: "none" },
  { key: "jost300", t: 0.30, r: "openbowl", a: "none" },
  { key: "outfit200", t: 0.30, r: "openbowl", a: "none" },
  { key: "outfit300", t: 0.30, r: "openbowl", a: "none" },
  { key: "questrial400", t: 0.30, r: "openbowl", a: "none" },
  { key: "poppins200", t: 0.30, r: "openbowl", a: "none" },
  { key: BEST, t: 0.22, r: "openbowl", a: "none" },
  { key: BEST, t: 0.38, r: "openbowl", a: "none" },
  { key: BEST, t: 0.46, r: "openbowl", a: "none" },
  { key: BEST, t: 0.30, r: "cutstem", a: "none" },
  { key: BEST, t: 0.30, r: "cutshoulder", a: "none" },
  { key: BEST, t: 0.30, r: "none", a: "none" },
];

const RLABEL = { openbowl: "R OPEN-BOWL", cutstem: "R CUT-STEM", cutshoulder: "R CUT-SHOULDER", none: "R UNTOUCHED (CONTROL)" };
const FNAME = { openbowl: "r-openbowl", cutstem: "r-cutstem", cutshoulder: "r-cutshoulder", none: "r-normal" };

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/* ───────────────────────────────────────────────────── main sheet ── */
const CAP = 86, PADX = 64, ROWH = 154, TOP = 62, W = 920;
const RULE = "#E5DFD4";
let body = "", y = TOP, n = 0;
const report = [];

for (const row of rows) {
  n++;
  const [label, file] = F[row.key];
  const built = await buildLogotype({
    fontPath: FONTS + file, tracking: row.t, rVariant: row.r, aCrossbar: row.a,
  });
  const s = CAP / 100;
  const yTop = y - (built.bbox.y1 - 100) * s;      // align cap lines, not ink tops
  body += `<g transform="translate(${PADX} ${yTop.toFixed(2)}) scale(${s})"><path fill="${INK}" fill-rule="evenodd" d="${built.d}"/></g>`;
  const num = String(n).padStart(2, "0");
  const cap = `${num}   ${label}  ·  A NO-CROSSBAR  ·  ${RLABEL[row.r]}  ·  ${row.t.toFixed(2)}EM  ·  ${(built.width * s).toFixed(0)}PX`;
  body += `<text x="${PADX}" y="${(y + CAP + 27).toFixed(1)}" font-family="ui-monospace,'JetBrains Mono',Consolas,monospace" font-size="12" letter-spacing="0.5" fill="${MUTED}">${esc(cap)}</text>`;
  if (n < rows.length)
    body += `<rect x="${PADX}" y="${(y + CAP + 46).toFixed(1)}" width="${W - 2 * PADX}" height="1" fill="${RULE}"/>`;

  const fn = `${num}-sersan-${row.key}-t${String(Math.round(row.t * 100)).padStart(3, "0")}-a-nocrossbar-${FNAME[row.r]}.svg`;
  writeFileSync(SVGDIR + fn, built.svg);
  report.push({ num, key: row.key, t: row.t, r: row.r, minGap: built.meta.minGap, w: +(built.width * s).toFixed(1), file: fn });
  y += ROWH;
}

const H = y + 30;
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${CREAM}"/><text x="${PADX}" y="36" font-family="ui-monospace,'JetBrains Mono',Consolas,monospace" font-size="12" letter-spacing="2.6" fill="${MUTED}">SERSAN · REAL FONT OUTLINES · A WITHOUT CROSSBAR + AMPUTATED R · CAP 86PX</text>${body}</svg>`;
writeFileSync("sheet_fonts.svg", sheet);
await sharp(Buffer.from(sheet)).png().toFile(PNG + "_logotype_fonts.png");

/* ───────────────────────────────────────────────────── A/R zoom sheet ── */
const [bl, bf] = F[BEST];
const ZCAP = 300;
const items = [
  [{ text: "A", a: "keep", r: "none" }, { text: "A", a: "none", r: "none" }],
  [
    { text: "R", a: "none", r: "none" }, { text: "R", a: "none", r: "openbowl" },
    { text: "R", a: "none", r: "cutstem" }, { text: "R", a: "none", r: "cutshoulder" },
  ],
];
const CAPS = [
  ["A · UNTOUCHED", "A · CROSSBAR REMOVED"],
  ["R · UNTOUCHED", "R · OPEN-BOWL", "R · CUT-STEM", "R · CUT-SHOULDER"],
];

const GAP = 118, ZPADX = 64, ZTOP = 92, ZROW = 300 + 150;
let zbody = "", zw = 0, zy = ZTOP;
for (let ri = 0; ri < items.length; ri++) {
  let x = ZPADX;
  for (let ci = 0; ci < items[ri].length; ci++) {
    const it = items[ri][ci];
    const built = await buildLogotype({
      fontPath: FONTS + bf, text: it.text, tracking: 0, rVariant: it.r, aCrossbar: it.a,
    });
    const s = ZCAP / 100;
    const yTop = zy - (built.bbox.y1 - 100) * s;
    zbody += `<g transform="translate(${x} ${yTop.toFixed(2)}) scale(${s})"><path fill="${INK}" fill-rule="evenodd" d="${built.d}"/></g>`;
    zbody += `<text x="${x}" y="${zy + ZCAP + 38}" font-family="ui-monospace,'JetBrains Mono',Consolas,monospace" font-size="12.5" letter-spacing="1.4" fill="${MUTED}">${esc(CAPS[ri][ci])}</text>`;
    x += built.width * s + GAP;
  }
  zw = Math.max(zw, x - GAP + ZPADX);
  zy += ZROW;
}
const ZH = zy - ZROW + ZCAP + 96;
const ZW = Math.max(zw, 900);
const zsheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${ZW.toFixed(0)}" height="${ZH.toFixed(0)}" viewBox="0 0 ${ZW.toFixed(0)} ${ZH.toFixed(0)}"><rect width="${ZW.toFixed(0)}" height="${ZH.toFixed(0)}" fill="${CREAM}"/><text x="${ZPADX}" y="40" font-family="ui-monospace,'JetBrains Mono',Consolas,monospace" font-size="12" letter-spacing="2.6" fill="${MUTED}">${esc(bl)} · A AND R AT CAP 300PX · UNTOUCHED VS AMPUTATED</text><rect x="${ZPADX}" y="${(ZTOP + ZCAP + 82).toFixed(0)}" width="${(ZW - 2 * ZPADX).toFixed(0)}" height="1" fill="#E5DFD4"/>${zbody}</svg>`;
writeFileSync("sheet_ar.svg", zsheet);
await sharp(Buffer.from(zsheet)).png().toFile(PNG + "_logotype_AR.png");

/* ───────────────────────────────────── private: untouched vs modified ── */
{
  let b = "", yy = 70;
  for (const mode of [
    ["UNTOUCHED TYPEFACE", { aCrossbar: "keep", rVariant: "none" }],
    ["STYLISED", { aCrossbar: "none", rVariant: "openbowl" }],
  ]) {
    const built = await buildLogotype({ fontPath: FONTS + bf, tracking: 0.30, ...mode[1] });
    const s = 120 / 100;
    b += `<g transform="translate(64 ${(yy - (built.bbox.y1 - 100) * s).toFixed(2)}) scale(${s})"><path fill="${INK}" fill-rule="evenodd" d="${built.d}"/></g>`;
    b += `<text x="64" y="${yy + 120 + 28}" font-family="monospace" font-size="14" fill="${MUTED}">${mode[0]}</text>`;
    yy += 210;
  }
  const s2 = `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="${yy}" viewBox="0 0 1240 ${yy}"><rect width="1240" height="${yy}" fill="${CREAM}"/>${b}</svg>`;
  await sharp(Buffer.from(s2)).png().toFile("cmp_untouched.png");
}

console.table(report);
console.log("BEST =", BEST);
