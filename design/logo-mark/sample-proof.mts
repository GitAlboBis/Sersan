/**
 * Proof that the NEW mark GLB feeds the site's own sampler correctly.
 * Imports the SHIPPED sampleMarkHomePositions() and runs it on the GLB exactly
 * as HeroLogo does (clone → center → scale to height 2 → center), for both
 * spore layers (crust + core sampling options), then rasterises the resulting
 * home-position field. Run: node --experimental-strip-types design/logo-mark/sample-proof.mts
 */
import { readFileSync } from "node:fs";
import * as THREE from "three";
import sharp from "sharp";
import { sampleMarkHomePositions } from "../../src/webgl/geometry/sersanMark.ts";

// --- GLB → BufferGeometry (same container parse as scripts/inspect-mark.mjs) --
const buf = readFileSync("public/models/sersan-mark.glb");
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
let off = 12, json: any = null, bin: Uint8Array | null = null;
while (off < buf.byteLength) {
  const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), start = off + 8;
  if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(buf.subarray(start, start + len)));
  else if (type === 0x004e4942) bin = buf.subarray(start, start + len);
  off = start + len + ((4 - (len % 4)) % 4);
}
const CT: Record<number, any> = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NC: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function read(idx: number) {
  const acc = json.accessors[idx], bv = json.bufferViews[acc.bufferView];
  const Ctor = CT[acc.componentType], n = NC[acc.type];
  const start = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  return new Ctor(bin!.buffer, bin!.byteOffset + start, acc.count * n);
}
const prim = json.meshes[0].primitives[0];
const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(read(prim.attributes.POSITION), 3));
if (prim.attributes.NORMAL) geometry.setAttribute("normal", new THREE.BufferAttribute(read(prim.attributes.NORMAL), 3));
geometry.setIndex(new THREE.BufferAttribute(read(prim.indices), 1));

// --- HeroLogo's normalization, verbatim --------------------------------------
geometry.center();
geometry.computeBoundingBox();
const bb = geometry.boundingBox!;
geometry.scale(2 / (bb.max.y - bb.min.y), 2 / (bb.max.y - bb.min.y), 2 / (bb.max.y - bb.min.y));
geometry.center();
geometry.computeBoundingBox();
console.log("normalized bbox", JSON.stringify(geometry.boundingBox));

// --- the two spore layers (sporePresets: crust, then core) --------------------
const LAYERS = [
  { name: "crust", sampling: { frontBias: 0.3, normalOffset: 0.022, volumeJitter: 0.015 } },
  { name: "core", sampling: { frontBias: 0.3, normalOffset: 0.002, volumeJitter: 0.006 } },
];
const SIZE = 160; // 25 600 samples per layer — enough to read the silhouette
const RES = 520;
for (const L of LAYERS) {
  const t0 = Date.now();
  const f = sampleMarkHomePositions(geometry, SIZE, L.sampling);
  const acc = new Float32Array(RES * RES);
  let zmin = 1e9, zmax = -1e9;
  for (let i = 0; i < f.count; i++) {
    const x = f.homeRGBA[i * 4], y = f.homeRGBA[i * 4 + 1], z = f.homeRGBA[i * 4 + 2];
    zmin = Math.min(zmin, z); zmax = Math.max(zmax, z);
    const px = Math.round((x / 1.15 + 1) / 2 * (RES - 1));
    const py = Math.round((1 - y / 1.15) / 2 * (RES - 1));
    if (px >= 0 && px < RES && py >= 0 && py < RES) acc[py * RES + px] += 1;
  }
  const img = Buffer.alloc(RES * RES * 3);
  for (let i = 0; i < RES * RES; i++) {
    const v = Math.min(1, acc[i] / 2.2);
    img[i * 3] = Math.round(11 + v * 40); img[i * 3 + 1] = Math.round(20 + v * 190); img[i * 3 + 2] = Math.round(34 + v * 215);
  }
  await sharp(img, { raw: { width: RES, height: RES, channels: 3 } }).png()
    .toFile(`design/logo-mark/_samples_${L.name}.png`);
  console.log(`${L.name}: ${f.count} homes in ${Date.now() - t0}ms  z ${zmin.toFixed(3)}..${zmax.toFixed(3)}`);
}
