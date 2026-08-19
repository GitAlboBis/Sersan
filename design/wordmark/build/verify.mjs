// Numeric verification: amputated glyphs must equal the untouched font outline
// everywhere outside the intended cut, and curves must be smooth.
import { buildLogotype, scanX, scanY } from "file:///C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/logotype.mjs";
import { loadFont, resolveFill, flattenGlyph } from "file:///C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/logotype.mjs";

const FONTS = "C:/Users/alber/Desktop/sersan-v2-main/public/_typelab/fonts/";
const set = [
  ["JOST 200", "jost-latin-200-normal.woff2"],
  ["JOST 300", "jost-latin-300-normal.woff2"],
  ["OUTFIT 200", "outfit-latin-200-normal.woff2"],
  ["OUTFIT 300", "outfit-latin-300-normal.woff2"],
  ["QUESTRIAL 400", "questrial-latin-400-normal.woff2"],
  ["POPPINS 200", "poppins-latin-200-normal.woff2"],
];

// rebuild a multipolygon from a single-letter build by re-parsing its `d`
function mpFromD(d, height) {
  const mp = [];
  for (const sub of d.split("Z").filter((s) => s.trim())) {
    const ring = sub
      .trim()
      .split(/(?=[ML])/)
      .filter(Boolean)
      .map((c) => c.slice(1).split(" ").map(Number))
      .map(([x, y]) => [x, height - y]); // back to y-up
    ring.push([ring[0][0], ring[0][1]]);
    mp.push([ring]);
  }
  return mp;
}

function spansAt(mp, y) { return scanX(mp, y).map((s) => [ +s[0].toFixed(4), +s[1].toFixed(4) ]); }

let fail = 0;
for (const [label, file] of set) {
  const A0 = await buildLogotype({ fontPath: FONTS + file, text: "A", tracking: 0, aCrossbar: "keep" });
  const A1 = await buildLogotype({ fontPath: FONTS + file, text: "A", tracking: 0, aCrossbar: "none" });
  const H = Math.max(A0.height, A1.height);
  const m0 = mpFromD(A0.d, A0.height), m1 = mpFromD(A1.d, A1.height);
  const off = (A0.bbox.y1 - A1.bbox.y1); // both share baseline; d origins share ink-top
  // both were built from the same glyph, ink tops identical (apex untouched)
  const rep = A1.meta.reports;
  const r = Object.values(rep)[0];
  const barTop = r.crossbarTop[0][1], barBot = r.crossbarBottom[0][1];
  const gb0 = { y0: A0.bbox.y0, y1: A0.bbox.y1 };

  let worst = 0, worstY = null, changed = 0;
  for (let i = 1; i < 900; i++) {
    const y = gb0.y0 + ((gb0.y1 - gb0.y0) * i) / 900;
    if (y > barBot - 0.15 && y < barTop + 0.15) continue; // inside the cut band
    const s0 = spansAt(m0, y), s1 = spansAt(m1, y);
    if (s0.length !== s1.length) { changed++; worstY = y; continue; }
    for (let k = 0; k < s0.length; k++)
      for (let j = 0; j < 2; j++) {
        const d = Math.abs(s0[k][j] - s1[k][j]);
        if (d > worst) { worst = d; worstY = y; }
      }
  }
  const okA = changed === 0 && worst < 0.01;
  if (!okA) fail++;
  console.log(`${label.padEnd(14)} A: apexTop ${A0.bbox.y1.toFixed(3)} vs ${A1.bbox.y1.toFixed(3)} | outside-cut span mismatch=${changed} maxΔ=${worst.toFixed(5)} @y=${worstY && worstY.toFixed(1)} ${okA ? "OK" : "*** FAIL"}`);

  // R: only the cut rectangle may differ
  for (const v of ["openbowl", "cutstem", "cutshoulder"]) {
    const R0 = await buildLogotype({ fontPath: FONTS + file, text: "R", tracking: 0, rVariant: "none" });
    const R1 = await buildLogotype({ fontPath: FONTS + file, text: "R", tracking: 0, rVariant: v });
    const n0 = mpFromD(R0.d, R0.height), n1 = mpFromD(R1.d, R1.height);
    const rr = Object.values(R1.meta.reports)[0];
    const [rx0, ry0, rx1, ry1] = rr.rect;
    // rect is in glyph coords with ink x0 subtracted in `d`; shift accordingly
    const sx = R0.bbox.x0;
    let bad = 0, worstR = 0, wy = null;
    for (let i = 1; i < 900; i++) {
      const y = R0.bbox.y0 + ((R0.bbox.y1 - R0.bbox.y0) * i) / 900;
      if (y > ry0 - 0.15 && y < ry1 + 0.15) continue;
      const s0 = spansAt(n0, y), s1 = spansAt(n1, y);
      if (s0.length !== s1.length) { bad++; wy = y; continue; }
      for (let k = 0; k < s0.length; k++)
        for (let j = 0; j < 2; j++) {
          const d = Math.abs(s0[k][j] - s1[k][j]);
          if (d > worstR) { worstR = d; wy = y; }
        }
    }
    const ok = bad === 0 && worstR < 0.01;
    if (!ok) fail++;
    console.log(`${" ".repeat(14)} R/${v.padEnd(12)} gap=${rr.gap} (=${(rr.gap / rr.stem.thickness).toFixed(2)}×stem ${rr.stem.thickness}) rect=[${rr.rect}] outside-rect mismatch=${bad} maxΔ=${worstR.toFixed(5)} ${ok ? "OK" : "*** FAIL"}`);
  }
}

/* smoothness: longest flattened chord on the S, and max turn angle */
const { loadFont: lf } = await import("file:///C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/logotype.mjs");
for (const [label, file] of set) {
  const font = await lf(FONTS + file);
  const cap = font.capHeight || font.layout("H").glyphs[0].bbox.maxY;
  const rings = flattenGlyph(font.layout("S").glyphs[0], 100 / cap, 0.03);
  let maxChord = 0, maxTurn = 0, n = 0;
  for (const r of rings) {
    n += r.length;
    for (let i = 0; i < r.length - 1; i++) maxChord = Math.max(maxChord, Math.hypot(r[i + 1][0] - r[i][0], r[i + 1][1] - r[i][1]));
    for (let i = 1; i < r.length - 1; i++) {
      const a = Math.atan2(r[i][1] - r[i - 1][1], r[i][0] - r[i - 1][0]);
      const b = Math.atan2(r[i + 1][1] - r[i][1], r[i + 1][0] - r[i][0]);
      let t = Math.abs(((b - a + Math.PI) % (2 * Math.PI)) - Math.PI) * 180 / Math.PI;
      if (t < 60) maxTurn = Math.max(maxTurn, t); // ignore true corners
    }
  }
  console.log(`${label.padEnd(14)} S flatten: pts=${n} maxChord=${maxChord.toFixed(2)}u maxTurn=${maxTurn.toFixed(2)}°`);
}

/* tracking sweep: neighbour gaps */
for (const t of [0.22, 0.3, 0.38, 0.46]) {
  const b = await buildLogotype({ fontPath: FONTS + "jost-latin-200-normal.woff2", tracking: t });
  console.log(`tracking ${t}: gaps=${JSON.stringify(b.meta.gaps)} min=${b.meta.minGap}`);
}
console.log(fail ? `\n${fail} FAILURES` : "\nall geometry assertions passed");
