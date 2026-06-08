// Parse public/models/sersan-mark.glb directly (no three needed) and rasterize
// its XY (front-face) silhouette + the triangle fill to ASCII so we can SEE the
// mark shape. Reads POSITION accessor + indices, scan-converts every triangle
// onto a grid, prints it. Definitive answer to "does the geometry read as the
// SERSAN mark?".
import { readFileSync } from "node:fs";

const buf = readFileSync(
  "C:/Users/alber/Desktop/sersan-v2-main/public/models/sersan-mark.glb",
);

// --- GLB container parse ---------------------------------------------------
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const magic = dv.getUint32(0, true);
if (magic !== 0x46546c67) throw new Error("not a GLB");
let off = 12;
let json = null;
let bin = null;
while (off < buf.byteLength) {
  const len = dv.getUint32(off, true);
  const type = dv.getUint32(off + 4, true);
  const start = off + 8;
  if (type === 0x4e4f534a) {
    json = JSON.parse(new TextDecoder().decode(buf.subarray(start, start + len)));
  } else if (type === 0x004e4942) {
    bin = buf.subarray(start, start + len);
  }
  off = start + len + ((4 - (len % 4)) % 4);
}

const COMP = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function readAccessor(idx) {
  const acc = json.accessors[idx];
  const bv = json.bufferViews[acc.bufferView];
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const n = NUM[acc.type];
  const out = [];
  const dvb = new DataView(bin.buffer, bin.byteOffset + base, bv.byteLength - (acc.byteOffset || 0));
  const stride = bv.byteStride || COMP[acc.componentType] * n;
  for (let i = 0; i < acc.count; i++) {
    const row = [];
    for (let c = 0; c < n; c++) {
      const p = i * stride + c * COMP[acc.componentType];
      if (acc.componentType === 5126) row.push(dvb.getFloat32(p, true));
      else if (acc.componentType === 5125) row.push(dvb.getUint32(p, true));
      else if (acc.componentType === 5123) row.push(dvb.getUint16(p, true));
      else if (acc.componentType === 5121) row.push(dvb.getUint8(p));
    }
    out.push(row);
  }
  return out;
}

// Find the first mesh primitive.
const prim = json.meshes[0].primitives[0];
const pos = readAccessor(prim.attributes.POSITION);
const idx = readAccessor(prim.indices).map((r) => r[0]);

// Bounds
let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
for (const [x, y, z] of pos) {
  minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
}
console.log("mesh:", json.meshes[0].name, "verts:", pos.length, "tris:", idx.length / 3);
console.log("bbox X", minX.toFixed(2), maxX.toFixed(2), " Y", minY.toFixed(2), maxY.toFixed(2), " Z", minZ.toFixed(2), maxZ.toFixed(2));

// --- Rasterize FRONT (+Z) faces only, XY projection -----------------------
const W = 100, H = 38;
const grid = Array.from({ length: H }, () => new Array(W).fill(" "));
function toCol(x) { return Math.round(((x - minX) / (maxX - minX)) * (W - 1)); }
function toRow(y) { return Math.round((1 - (y - minY) / (maxY - minY)) * (H - 1)); }

function fillTri(a, b, c) {
  // Only front-facing (normal.z > 0) triangles, so we see the camera face.
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nz = ux * vy - uy * vx; // z of cross(u,v)
  if (nz <= 0) return; // back/edge facing away from +Z
  const r0 = Math.min(toRow(a[1]), toRow(b[1]), toRow(c[1]));
  const r1 = Math.max(toRow(a[1]), toRow(b[1]), toRow(c[1]));
  const c0 = Math.min(toCol(a[0]), toCol(b[0]), toCol(c[0]));
  const c1 = Math.max(toCol(a[0]), toCol(b[0]), toCol(c[0]));
  for (let r = r0; r <= r1; r++) {
    for (let cc = c0; cc <= c1; cc++) {
      // barycentric test in screen space
      const px = minX + (cc / (W - 1)) * (maxX - minX);
      const py = minY + (1 - r / (H - 1)) * (maxY - minY);
      const d1 = sign(px, py, a, b);
      const d2 = sign(px, py, b, c);
      const d3 = sign(px, py, c, a);
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(hasNeg && hasPos)) grid[r][cc] = "#";
    }
  }
}
function sign(px, py, p1, p2) {
  return (px - p2[0]) * (p1[1] - p2[1]) - (p1[0] - p2[0]) * (py - p2[1]);
}

for (let i = 0; i < idx.length; i += 3) {
  fillTri(pos[idx[i]], pos[idx[i + 1]], pos[idx[i + 2]]);
}

console.log("\nFRONT (+Z) face silhouette, XY projection:\n");
console.log(grid.map((row) => row.join("")).join("\n"));
