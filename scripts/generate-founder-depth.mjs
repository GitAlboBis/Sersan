/**
 * generate-founder-depth.mjs — offline DEPTH twins for the founders particle
 * portrait (FounderPortraitMorph / sampleImagePoints).
 *
 * WHY. Lusion's /about TEAM head is a 3D scan: 8192 surface points, each with
 * a normal and a baked shade (reverse-engineered 2026-08-27, see
 * docs/recon-2026-08-27/lusion-team-reverse.md). We only have 2D studio
 * headshots, so the equivalent input is a monocular depth map per portrait:
 * it gives the sampler (a) a SPATIAL subject/backdrop matte that does not
 * care that a lit scalp and a white wall share a colour (HANDOFF contract 2
 * — spatial, never chromatic), (b) a real z-relief per particle (nose,
 * brow, glasses, jaw) instead of the luminance guess, and (c) surface
 * normals (depth gradients) for the lit point-cloud look.
 *
 * For every founder anchor in src/data/founders.ts, reads
 * public/founders/<anchor>-headshot.<ext> and writes
 * public/founders/<anchor>-depth.webp — single-channel in RGB, WHITE = NEAR
 * (Depth Anything emits relative inverse depth), lossless so the silhouette
 * threshold in the sampler sees no codec ringing. Half the headshot's
 * resolution (600×900 for a 1200×1800 source): the sampler grid is 380×532,
 * so nothing finer is ever read, and the file stays ~50 KB.
 *
 * LICENCE. The default (and the shipped twins) is Depth Anything V2 SMALL,
 * Apache-2.0. The BASE/LARGE checkpoints are CC-BY-NC-4.0 — never ship twins
 * made with them on the commercial site; `--model base` is kept for local
 * comparison only (research synthesis 2026-08-27 flagged this).
 *
 * Run:  node scripts/generate-founder-depth.mjs [--model small|base] [anchor…]
 * First run downloads the model into the HF cache (~100 MB small). Re-run
 * whenever a headshot changes or a person is added. Commit the output — the
 * site never runs the model.
 */
import { pipeline, RawImage } from "@huggingface/transformers";
import sharp from "sharp";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const modelArg = args.includes("--model")
  ? args[args.indexOf("--model") + 1]
  : "small";
const model =
  modelArg === "small"
    ? "onnx-community/depth-anything-v2-small"
    : "onnx-community/depth-anything-v2-base";
const only = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--model");

/** Anchors straight out of the data module (a TS file; a regex beats a TS
 *  loader for one string field). */
function collectAnchors() {
  const src = readFileSync(join(root, "src/data/founders.ts"), "utf8");
  return [...src.matchAll(/anchor:\s*"([^"]+)"/g)].map((m) => m[1]);
}

const EXTS = ["webp", "jpg", "jpeg", "png"];
const anchors = collectAnchors().filter((a) => only.length === 0 || only.includes(a));
if (anchors.length === 0) {
  console.log("No founder anchors found — nothing to do.");
  process.exit(0);
}
console.log(`Depth for ${anchors.length} headshot(s) with ${model}…`);

const estimator = await pipeline("depth-estimation", model);

for (const anchor of anchors) {
  const inPath = EXTS.map((e) => join(root, "public/founders", `${anchor}-headshot.${e}`)).find(existsSync);
  if (!inPath) {
    console.warn(`  ${anchor}: no -headshot asset, skipped`);
    continue;
  }
  const outPath = join(root, "public/founders", `${anchor}-depth.webp`);
  const t0 = Date.now();
  const image = await RawImage.read(inPath);
  const { predicted_depth } = await estimator(image);
  // Normalise the float tensor ourselves (the pipeline's 8-bit `depth`
  // image is fine, but doing it here keeps the near/far mapping explicit).
  const [h, w] = predicted_depth.dims.slice(-2);
  const data = predicted_depth.data;
  let mn = Infinity;
  let mx = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  const buf = Buffer.alloc(w * h);
  const inv = 255 / Math.max(mx - mn, 1e-6);
  for (let i = 0; i < data.length; i++) buf[i] = Math.round((data[i] - mn) * inv);
  const meta = await sharp(inPath).metadata();
  const outW = Math.round(meta.width / 2);
  const outH = Math.round(meta.height / 2);
  await sharp(buf, { raw: { width: w, height: h, channels: 1 } })
    .resize(outW, outH, { fit: "fill" })
    .webp({ lossless: true })
    .toFile(outPath);
  console.log(
    `  ${anchor}: ${inPath.split(/[\\/]/).pop()} → ${anchor}-depth.webp (${outW}×${outH}, ${Date.now() - t0} ms)`,
  );
}
console.log("Done.");
