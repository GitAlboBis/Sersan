// Extract the APPROVED amputated A and R as flat rings in FONT UNITS.
//
// Reuses design/wordmark/logotype.mjs unchanged, at its approved defaults
// (aCrossbar 'none', rVariant 'openbowl', gapRatio 3.0, legMargin 0.15,
// capHeight 100) so the geometry is bit-for-bit the look that was signed off.
// The rings come back in cap-100 space; we multiply by 1/meta.scale to land in
// the font's own units. Every absolute constant inside the module (pad 0.6,
// the 1e-3/1e-4 epsilons) therefore keeps the exact value it had when the
// result was approved.
//
// The two static fontsource faces this reads used to live in
// public/_typelab/fonts/; that directory is gone, and the copies kept beside
// this script are the same files (ladder-instance.py diffs them against the
// variable instances, and patch.py's output still comes out byte-identical to
// the shipped faces outside the R).
import { buildLogotype } from "file:///C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/logotype.mjs";
import { writeFileSync } from "node:fs";

const FONTS = "C:/Users/alber/Desktop/sersan-v2-main/design/wordmark/build/";
const WEIGHTS = [200, 300];
// Flattening tolerance in cap-100 units. The approved sheets used the module
// default (0.03); we go finer here because the output is a real font that will
// be set at arbitrary sizes. Finer is strictly closer to the true outline — it
// cannot change the shape, only how well the polygon tracks it.
const TOL = Number(process.env.TOL || 0.012);

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
  const fontPath = FONTS + `jost-latin-${w}-normal.woff2`;
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
    console.log(
      `w${w} ${ch}: rings=${rings.length} pts=${rings.reduce((n, r) => n + r.length, 0)} ` +
        `poly/ring=${JSON.stringify(b.meta.letters[0].rings)}`
    );
  }
}
writeFileSync("amputated.json", JSON.stringify(out));
console.log("wrote amputated.json");
