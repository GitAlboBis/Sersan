// QA: every font's A + R at big cap, plus extreme zooms for nubs and faceting.
import sharp from "file:///C:/Users/alber/Desktop/sersan-v2-main/node_modules/sharp/lib/index.js";
import { buildLogotype } from "file:///C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/logotype.mjs";
import { writeFileSync } from "node:fs";

const FONTS = "C:/Users/alber/Desktop/sersan-v2-main/public/_typelab/fonts/";
const set = [
  ["JOST 200", "jost-latin-200-normal.woff2"],
  ["JOST 300", "jost-latin-300-normal.woff2"],
  ["OUTFIT 200", "outfit-latin-200-normal.woff2"],
  ["OUTFIT 300", "outfit-latin-300-normal.woff2"],
  ["QUESTRIAL 400", "questrial-latin-400-normal.woff2"],
  ["POPPINS 200", "poppins-latin-200-normal.woff2"],
];
const CREAM = "#F6F3EE", INK = "#0B1422", MUTED = "#8A94A6";

async function render(name, svg) {
  writeFileSync(name + ".svg", svg);
  await sharp(Buffer.from(svg)).png().toFile(name + ".png");
}

/* ── all fonts × {A keep, A none, R none, R openbowl, R cutstem, R cutshoulder} */
const CAP = 200, GAP = 60, PADX = 190, ROWH = 300, TOP = 60;
let body = "", y = TOP, maxX = 0;
for (const [label, file] of set) {
  let x = PADX;
  for (const v of [
    { text: "A", a: "keep", r: "none" }, { text: "A", a: "none", r: "none" },
    { text: "R", a: "none", r: "none" }, { text: "R", a: "none", r: "openbowl" },
    { text: "R", a: "none", r: "cutstem" }, { text: "R", a: "none", r: "cutshoulder" },
  ]) {
    const b = await buildLogotype({ fontPath: FONTS + file, text: v.text, tracking: 0, aCrossbar: v.a, rVariant: v.r });
    const s = CAP / 100;
    body += `<g transform="translate(${x} ${(y - (b.bbox.y1 - 100) * s).toFixed(2)}) scale(${s})"><path fill="${INK}" fill-rule="evenodd" d="${b.d}"/></g>`;
    x += b.width * s + GAP;
  }
  maxX = Math.max(maxX, x);
  body += `<text x="24" y="${y + CAP / 2}" font-family="monospace" font-size="15" fill="${MUTED}">${label}</text>`;
  y += ROWH;
}
const W = maxX + 30, H = y + 20;
await render("qa_all", `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(0)}" height="${H}" viewBox="0 0 ${W.toFixed(0)} ${H}"><rect width="${W.toFixed(0)}" height="${H}" fill="${CREAM}"/>${body}</svg>`);

/* ── giant single letters for faceting / nub inspection (Jost 200) */
for (const [tag, file] of [["jost200", "jost-latin-200-normal.woff2"], ["jost300", "jost-latin-300-normal.woff2"], ["outfit200", "outfit-latin-200-normal.woff2"]]) {
  for (const [name, text, a, r] of [["S", "S", "none", "none"], ["Aamp", "A", "none", "none"], ["Rob", "R", "none", "openbowl"]]) {
    const b = await buildLogotype({ fontPath: FONTS + file, text, tracking: 0, aCrossbar: a, rVariant: r });
    const s = 900 / 100;
    const w = Math.ceil(b.width * s) + 40, h = Math.ceil(b.height * s) + 40;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${CREAM}"/><g transform="translate(20 20) scale(${s})"><path fill="${INK}" fill-rule="evenodd" d="${b.d}"/></g></svg>`;
    await render(`zoom_${tag}_${name}`, svg);
  }
}
console.log("qa done");
