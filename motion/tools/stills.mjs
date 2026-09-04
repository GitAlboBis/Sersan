// Bundle once, then render stills for several compositions/frames with ANGLE WebGL.
//   node tools/stills.mjs S1Open:60,130 S4Build:60,110
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jobs = process.argv.slice(2).map((a) => {
  const [id, frames] = a.split(":");
  return { id, frames: frames.split(",").map(Number) };
});
mkdirSync(path.join(root, "out", "stills"), { recursive: true });
const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), publicDir: path.join(root, "public") });
console.log("bundled in", ((Date.now() - t0) / 1000).toFixed(1), "s");
for (const job of jobs) {
  const composition = await selectComposition({ serveUrl, id: job.id, chromiumOptions: { gl: "angle" } });
  for (const f of job.frames) {
    const t1 = Date.now();
    const output = path.join(root, "out", "stills", job.id + "-" + String(f).padStart(3, "0") + ".png");
    await renderStill({ composition, serveUrl, output, frame: f, imageFormat: "png", scale: Number(process.env.STILL_SCALE || 1), chromiumOptions: { gl: "angle" } });
    console.log("still", path.basename(output), ((Date.now() - t1) / 1000).toFixed(1), "s");
  }
}
