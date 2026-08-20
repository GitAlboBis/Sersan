/**
 * generate-depth-maps.mjs — offline depth-map twins for the Featured Work
 * depth-parallax cards (ANALISI_LUSION_WORK.md §2.2: Lusion ships a
 * `home_depth.webp` beside every `home.webp`; this script is our pipeline).
 *
 * For every case study with BOTH `previewImage` and `depthImage` declared in
 * src/data/case-studies.ts, runs monocular depth estimation
 * (Depth-Anything V2 small, ONNX via @huggingface/transformers — dev
 * dependency only) on the still and writes the depth twin to the declared
 * `depthImage` path under public/. Grayscale in RGB, WHITE = NEAR (the
 * shader treats depth.r as height toward the camera, matching the port
 * source's `-depth·zMultiplier` convention).
 *
 * Run:  node scripts/generate-depth-maps.mjs
 * Re-run whenever a preview still changes or a new study gains a still.
 * First run downloads the ~50MB model into the HF cache.
 */
import { pipeline, RawImage } from "@huggingface/transformers";
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Parse previewImage/depthImage pairs straight out of the data module —
 *  a TS file, so a tolerant regex beats spinning up a TS loader for two
 *  string fields. Pairs only count when BOTH fields are on the same study. */
function collectPairs() {
  const src = readFileSync(join(root, "src/data/case-studies.ts"), "utf8");
  const pairs = [];
  // Split on study object boundaries (id: "...") and scan each chunk.
  const chunks = src.split(/\n\s{4}id:\s*"/).slice(1);
  for (const chunk of chunks) {
    const id = chunk.slice(0, chunk.indexOf('"'));
    const preview = chunk.match(/previewImage:\s*"([^"]+)"/)?.[1];
    const depth = chunk.match(/depthImage:\s*"([^"]+)"/)?.[1];
    if (preview && depth) pairs.push({ id, preview, depth });
  }
  return pairs;
}

const pairs = collectPairs();
if (pairs.length === 0) {
  console.log("No previewImage+depthImage pairs declared — nothing to do.");
  process.exit(0);
}
console.log(`Estimating depth for ${pairs.length} still(s)…`);

const estimator = await pipeline(
  "depth-estimation",
  "onnx-community/depth-anything-v2-small",
);

for (const { id, preview, depth } of pairs) {
  const inPath = join(root, "public", preview);
  const outPath = join(root, "public", depth);
  const image = await RawImage.read(inPath);
  const { depth: depthImage } = await estimator(image);
  // Model output: single-channel, white = near. Resize to the still's own
  // resolution so the shader's cover-fit mapping is exact for both textures.
  const meta = await sharp(inPath).metadata();
  await sharp(depthImage.data, {
    raw: {
      width: depthImage.width,
      height: depthImage.height,
      channels: depthImage.channels,
    },
  })
    .resize(meta.width, meta.height, { fit: "fill" })
    .webp({ quality: 82 })
    .toFile(
      (mkdirSync(dirname(outPath), { recursive: true }), outPath),
    );
  console.log(`  ${id}: ${preview} → ${depth} (${meta.width}×${meta.height})`);
}
console.log("Done.");
