// Extract the APPROVED amputated A and R, in FONT UNITS, for the whole ladder.
//
// Identical in every parameter to extract.mjs — it just walks the pinned
// variable instances (design/wordmark/build/instances/jost-var-*.ttf) instead
// of the two static fontsource faces. design/wordmark/logotype.mjs is imported
// unchanged and run at its approved defaults (aCrossbar 'none', rVariant
// 'openbowl', gapRatio 'saturate', legMargin null, capHeight 100).
//
// The open-bowl slab is MEASURED per weight, not scaled off the stem: it runs
// out to the abscissa where the cut band holds no more ink and stops one font
// unit past it (logotype.mjs `openBowlSaturation`). That is the widest daylight
// the letterform can show and the narrowest slab that shows it — a fixed ratio
// cannot hit it at seven weights, because the saturation point lands at 7.5 x
// stem at wght 200 and 4.2 x at wght 340.
//
// The cut is deliberately PAST the severing ceiling (still measured and printed
// below, for the record): the leg comes away, so the R is TWO contours. Clamped
// to the ceiling it showed no daylight at all — see r-beyond.mjs.
//
// LOGOTYPE_MODULE_PATHS must point at a node_modules with fontkit +
// polygon-clipping (they are build-only tools, deliberately not project deps).
import { buildLogotype } from "file:///C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/logotype.mjs";
import { writeFileSync } from "node:fs";

const DIR = "C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/build/instances/";
const WEIGHTS = (process.env.WEIGHTS || "200,220,240,260,280,300,340").split(",").map(Number);
const TOL = Number(process.env.TOL || 0.012); // same as extract.mjs

/** parse the module's "M x yL x y...Z" output back into rings */
function parseD(d) {
  const rings = [];
  for (const chunk of d.split("Z")) {
    if (!chunk.trim()) continue;
    const nums = chunk.match(/-?\d+(?:\.\d+)?/g).map(Number);
    const ring = [];
    for (let i = 0; i < nums.length; i += 2) ring.push([nums[i], nums[i + 1]]);
    rings.push(ring);
  }
  return rings;
}

const out = {};
for (const w of WEIGHTS) {
  const fontPath = DIR + `jost-var-${w}.ttf`;
  out[w] = { fontPath, glyphs: {} };
  for (const ch of ["A", "R"]) {
    const b = await buildLogotype({ fontPath, text: ch, tracking: 0, tolerance: TOL });
    const k = 1 / b.meta.scale; // cap-100 units -> font units
    const rings = parseD(b.d).map((r) =>
      r.map(([x, y]) => [(x + b.bbox.x0) * k, (b.bbox.y1 - y) * k])
    );
    out[w].glyphs[ch] = {
      rings,
      capUnits: b.meta.capUnits,
      upm: b.meta.upm,
      k,
      ringCounts: b.meta.letters[0].rings,
      report: b.meta.reports[`${ch}0`] || null,
      pts: rings.reduce((n, r) => n + r.length, 0),
    };
    const rep = b.meta.reports[`${ch}0`];
    const extra =
      ch === "R"
        ? ` stem=${(rep.stem.thickness * k).toFixed(1)}u slab=${(rep.gap * k).toFixed(1)}u` +
          ` (saturates at ${(rep.gapSaturation * k).toFixed(1)}u = ${rep.gapRatioSaturation}x stem,` +
          ` severing ceiling ${(rep.gapCeiling * k).toFixed(1)}u${rep.pastCeiling ? " — PAST IT, leg free" : ""})`
        : ` crossbar=${(rep.crossbarThickness * k).toFixed(1)}u`;
    console.log(
      `w${w} ${ch}: rings=${rings.length} pts=${rings.reduce((n, r) => n + r.length, 0)} ` +
        `poly/ring=${JSON.stringify(b.meta.letters[0].rings)}${extra}`
    );
  }
}
writeFileSync("amputated-ladder.json", JSON.stringify(out));
console.log("wrote amputated-ladder.json");
