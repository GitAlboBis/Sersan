// Extract the APPROVED amputated A and R, in FONT UNITS, for the whole ladder.
//
// Identical in every parameter to extract.mjs — it just walks the pinned
// variable instances (design/wordmark/build/instances/jost-var-*.ttf) instead
// of the two static fontsource faces. design/wordmark/logotype.mjs is imported
// unchanged and run at its approved defaults (aCrossbar 'none', rVariant
// 'openbowl', gapRatio 3.0, legMargin 0.15, capHeight 100), so the cut geometry
// — including the gap being 3.0 x the *measured* stem, which is what makes it
// track the weight, and the per-weight ceiling that stops the slab severing the
// leg at the heavy end — is bit-for-bit the construction signed off on the
// treatments sheet (tile 03).
//
// The gap does NOT come out at 3.0 x stem at every weight: from 260 up, 3.0 x
// stem is wider than the letterform can give up, so logotype.mjs clamps to the
// measured ceiling and reports gapRatioAchieved / gapClamped. Printed below.
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
        ? ` stem=${(rep.stem.thickness * k).toFixed(1)}u gap=${(rep.gap * k).toFixed(1)}u` +
          ` (want ${(rep.gapRequested * k).toFixed(1)}u, ceiling ${(rep.gapCeiling * k).toFixed(1)}u,` +
          ` ratio ${rep.gapRatioAchieved}${rep.gapClamped ? ", CLAMPED" : ""})`
        : ` crossbar=${(rep.crossbarThickness * k).toFixed(1)}u`;
    console.log(
      `w${w} ${ch}: rings=${rings.length} pts=${rings.reduce((n, r) => n + r.length, 0)} ` +
        `poly/ring=${JSON.stringify(b.meta.letters[0].rings)}${extra}`
    );
  }
}
writeFileSync("amputated-ladder.json", JSON.stringify(out));
console.log("wrote amputated-ladder.json");
