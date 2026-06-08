// Replicate sampleMarkHomePositions (MeshSurfaceSampler area-weighted + the
// front-bias rejection) against the real GLB, then PLOT the resulting home
// points (XY) to ASCII. Definitive: does the home field trace the "52"?
import { readFileSync } from "node:fs";

const buf = readFileSync(
  "C:/Users/alber/Desktop/sersan-v2-main/public/models/sersan-mark.glb",
);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
let off = 12, json = null, bin = null;
while (off < buf.byteLength) {
  const len = dv.getUint32(off, true);
  const type = dv.getUint32(off + 4, true);
  const start = off + 8;
  if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(buf.subarray(start, start + len)));
  else if (type === 0x004e4942) bin = buf.subarray(start, start + len);
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
    }
    out.push(row);
  }
  return out;
}
const prim = json.meshes[0].primitives[0];
const pos = readAccessor(prim.attributes.POSITION);
const nrmAttr = prim.attributes.NORMAL != null ? readAccessor(prim.attributes.NORMAL) : null;
const idx = readAccessor(prim.indices).map((r) => r[0]);

// --- MeshSurfaceSampler: build per-triangle area CDF (weighted by area) -----
const tris = idx.length / 3;
const areas = new Float64Array(tris);
let total = 0;
function sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function cross(u, v) { return [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]; }
function len(v){ return Math.hypot(v[0],v[1],v[2]); }
for (let t = 0; t < tris; t++) {
  const a = pos[idx[t*3]], b = pos[idx[t*3+1]], c = pos[idx[t*3+2]];
  const cr = cross(sub(b,a), sub(c,a));
  areas[t] = len(cr) * 0.5;
  total += areas[t];
}
const cdf = new Float64Array(tris);
let acc = 0;
for (let t = 0; t < tris; t++) { acc += areas[t]; cdf[t] = acc / total; }
function pickTri(r){ let lo=0,hi=tris-1; while(lo<hi){const m=(lo+hi)>>1; if(cdf[m]<r) lo=m+1; else hi=m;} return lo; }

const FRONT_BIAS_MIN = 0.12;
const SIZE = 96; // smaller grid is enough to see the shape
const homePts = [];
for (let i = 0; i < SIZE*SIZE; i++) {
  let tries = 0; let p = null;
  while (true) {
    const t = pickTri(Math.random());
    const a = pos[idx[t*3]], b = pos[idx[t*3+1]], c = pos[idx[t*3+2]];
    let u = Math.random(), v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const px = a[0] + u*(b[0]-a[0]) + v*(c[0]-a[0]);
    const py = a[1] + u*(b[1]-a[1]) + v*(c[1]-a[1]);
    const pz = a[2] + u*(b[2]-a[2]) + v*(c[2]-a[2]);
    // geometric face normal z (same as sampler would interpolate ~ for flat faces)
    const cr = cross(sub(b,a), sub(c,a));
    const nl = len(cr) || 1;
    const nz = cr[2] / nl;
    const frontness = Math.max(0, nz);
    const keepP = FRONT_BIAS_MIN + (1 - FRONT_BIAS_MIN) * frontness;
    p = [px, py, pz];
    if (Math.random() < keepP || ++tries >= 24) break;
  }
  homePts.push(p);
}

// bounds for plotting
let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
for (const [x,y] of homePts){ minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y); }
const W=100,H=40;
const grid = Array.from({length:H},()=>new Array(W).fill(" "));
const counts = Array.from({length:H},()=>new Array(W).fill(0));
for (const [x,y] of homePts){
  const c = Math.round(((x-minX)/(maxX-minX))*(W-1));
  const r = Math.round((1-(y-minY)/(maxY-minY))*(H-1));
  counts[r][c]++;
}
for(let r=0;r<H;r++)for(let c=0;c<W;c++){ const n=counts[r][c]; grid[r][c]= n===0?" ":n<2?".":n<5?"+":"#"; }
console.log("home points:", homePts.length, " bbox X", minX.toFixed(2), maxX.toFixed(2), "Y", minY.toFixed(2), maxY.toFixed(2));
console.log("\nHOME POSITIONS (XY), density . + #:\n");
console.log(grid.map(r=>r.join("")).join("\n"));
