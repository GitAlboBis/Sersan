// Measure the shipped faces. No eyeballing: every number below is scanned off
// the real outlines of the real woff2 files in src/fonts/.
//
//   cap        the cap height. Reported twice: the OS/2 sCapHeight the font
//              declares, and the measured top of "H" (they agree in Jost).
//   stem       the width of the ink span crossed by a horizontal scanline
//              through a VERTICAL stem, in font units. Because the stem is
//              vertical, that span IS the stem thickness.
//                N  left vertical, scanned at mid-cap (the brief's measure)
//                E  stem, scanned at 0.25 cap (between the foot and middle arm,
//                   so the arms cannot merge into the span)
//                I  the whole glyph, at mid-cap — a stem with nothing else on
//                   the scanline, i.e. the cleanest possible control
//   stem/cap   the ratio the reference lettering is specified in.
//
// Glyph fills are resolved exactly as the logotype build resolves them
// (resolveFill under the non-zero rule), so overlapping source contours cannot
// double-count.
import {
  flattenGlyph,
  resolveFill,
  scanX,
  mpBBox,
} from "file:///C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/logotype.mjs";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

// fontkit / polygon-clipping are build-only tools and deliberately not project
// dependencies, so resolve them the same way logotype.mjs does: bare first,
// then any directory listed in LOGOTYPE_MODULE_PATHS.
async function dep(name, entries, probe) {
  const tries = [name];
  for (const dir of (process.env.LOGOTYPE_MODULE_PATHS || "").split(path.delimiter).filter(Boolean))
    for (const e of entries) tries.push(pathToFileURL(path.join(dir, name, e)).href);
  for (const t of tries) {
    try {
      const m = await import(t);
      return m.default && probe(m.default) ? m.default : m;
    } catch {
      /* next candidate */
    }
  }
  throw new Error(`cannot resolve "${name}" — set LOGOTYPE_MODULE_PATHS`);
}
const fontkit = await dep("fontkit", ["dist/module.mjs", "dist/main.cjs"], (m) => m.create);
const pc = await dep(
  "polygon-clipping",
  ["dist/polygon-clipping.esm.js", "dist/polygon-clipping.cjs.js"],
  (m) => m.union
);

const FONTS = "C:/Users/alber/Desktop/sersan-v2-main/src/fonts/";
const WEIGHTS = [200, 220, 240, 260, 280, 300, 340];
const TOL = 0.02; // font units — the scan only needs the outline, not a fill

/** Ink spans on the horizontal line y, in font units, for one glyph. */
function spansAt(font, ch, y) {
  const glyph = font.layout(ch).glyphs[0];
  const mp = resolveFill(pc, flattenGlyph(glyph, 1, TOL));
  return { spans: scanX(mp, y), bbox: mpBBox(mp) };
}

const AMP = JSON.parse(readFileSync("amputated-ladder.json", "utf8"));

const rows = [];
for (const w of WEIGHTS) {
  const file = `${FONTS}sersan-display-${w}.woff2`;
  const font = fontkit.create(readFileSync(file));
  const capDeclared = font.capHeight;
  const capMeasured = spansAt(font, "H", capDeclared / 2).bbox.y1;

  const probe = (ch, y) => {
    const { spans } = spansAt(font, ch, y);
    if (!spans.length) throw new Error(`${ch}@${y}: no ink on the scanline`);
    return { w: spans[0][1] - spans[0][0], n: spans.length };
  };

  // N: left vertical at mid-cap. E: stem at quarter-cap. I: stem at mid-cap.
  const N = probe("N", capMeasured * 0.5);
  const E = probe("E", capMeasured * 0.25);
  const I = probe("I", capMeasured * 0.5);

  // The R stem the amputation itself measured on the UNPATCHED source. The cut
  // slab is NOT a multiple of it: it is measured per weight, out to where the
  // cut band holds no more ink (logotype.mjs `openBowlSaturation`), which lands
  // anywhere from 4.2 x stem at wght 340 to 7.5 x at wght 200. Read from
  // amputated-ladder.json — the patched R has no enclosed counter any more,
  // which is precisely the point of the open bowl, so it cannot be re-measured
  // the same way. Cross-checked below by scanning the patched R's stem directly
  // at the same height logotype.mjs used.
  const amp = AMP[w].glyphs.R;
  const k = amp.k;
  const r = amp.report;
  const rStemPatched = probe("R", capMeasured * 0.1).w;

  rows.push({
    weight: w,
    file,
    bytes: statSync(file).size,
    upm: font.unitsPerEm,
    capDeclared,
    capMeasured: +capMeasured.toFixed(1),
    stemN: +N.w.toFixed(2),
    stemE: +E.w.toFixed(2),
    stemI: +I.w.toFixed(2),
    spansN: N.n,
    spansE: E.n,
    spansI: I.n,
    pctN: +((100 * N.w) / capMeasured).toFixed(2),
    pctE: +((100 * E.w) / capMeasured).toFixed(2),
    pctI: +((100 * I.w) / capMeasured).toFixed(2),
    rStem: +(r.stem.thickness * k).toFixed(2),
    rStemPatched: +rStemPatched.toFixed(2),
    rGap: +(r.gap * k).toFixed(2),
    rGapPctCap: +((100 * r.gap * k) / capMeasured).toFixed(2),
    rGapSaturation: +(r.gapSaturation * k).toFixed(2),
    rGapRatioSaturation: r.gapRatioSaturation,
    rGapCeiling: +(r.gapCeiling * k).toFixed(2),
    rGapRatio: r.gapRatioAchieved,
    rPastCeiling: r.pastCeiling,
    rPct: +((100 * r.stem.thickness * k) / capMeasured).toFixed(2),
  });
}

const pad = (s, n) => String(s).padStart(n);
console.log(
  "wght   cap(decl/meas)   stem N    stem E    stem I  |  stem/cap %  N     E     I  |  R stem R slab R slab/cap   ratio  severs   bytes"
);
for (const r of rows)
  console.log(
    `${pad(r.weight, 4)}   ${pad(r.capDeclared, 4)} / ${pad(r.capMeasured, 5)}   ` +
      `${pad(r.stemN.toFixed(1), 6)}    ${pad(r.stemE.toFixed(1), 6)}    ${pad(r.stemI.toFixed(1), 6)}  |  ` +
      `${pad(r.pctN.toFixed(2), 10)} ${pad(r.pctE.toFixed(2), 5)} ${pad(r.pctI.toFixed(2), 5)}  |  ` +
      `${pad(r.rStem.toFixed(0), 6)} ${pad(r.rGap.toFixed(0), 6)}  ${pad(r.rGapPctCap.toFixed(2) + "%", 10)}  ` +
      `${pad(r.rGapRatio.toFixed(3), 6)}${r.rPastCeiling ? "*" : " "} ${pad(r.rGapCeiling.toFixed(0), 6)}   ${pad(r.bytes, 6)}`
  );
console.log(
  "\n* the slab is run to SATURATION: out to where the cut band holds no more ink, plus one unit." +
    "\n  `severs` is the abscissa at which the leg lets go — every slab above is deliberately past it," +
    "\n  so the R is two contours and the cut shows daylight. Held at the severing point it showed none:" +
    "\n  the leg is diagonal, so the two pieces still touched (design/wordmark/build/r-beyond.mjs)." +
    "\n  Daylight itself is measured on the shipped outlines by ladder-qa.mjs."
);
console.log(
  "\nspan counts on the scanline (sanity — N must be 3, E 1, I 1): " +
    rows.map((r) => `${r.weight}:${r.spansN}/${r.spansE}/${r.spansI}`).join("  ")
);

writeFileSync("ladder-measure.json", JSON.stringify(rows, null, 1));
console.log("wrote ladder-measure.json");
