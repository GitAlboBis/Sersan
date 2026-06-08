/**
 * SERSAN mark — shared, backend-agnostic SURFACE SAMPLING + dissolve noise for
 * the dissolving hero logo (replaces the procedural Saturn).
 *
 * The mark GEOMETRY now comes from a Blender-built GLB
 * (`public/models/sersan-mark.glb` — a single clean beveled mesh: two stencil
 * "S" letters flanking a central divider). HeroLogo loads + normalizes that
 * GLB; this module no longer builds geometry. What remains here is the part
 * that operates on WHATEVER geometry it is handed:
 *   - `sampleMarkParticles(geometry, count)` — samples the surface into the
 *     instanced-billboard particle attribute arrays;
 *   - `markThreshold(x, y, z)` — the JS source of truth for the shared
 *     object-space dissolve noise field.
 *
 * Everything here is pure geometry/math from the `three` core + one example
 * addon (`MeshSurfaceSampler`) — NO materials, NO `three/webgpu`. It is
 * therefore backend-agnostic and safe to import on both the GLSL (flag-OFF) and
 * TSL (flag-ON) paths; only the MATERIALS split by backend.
 *
 * API verified against the installed three 0.184.0:
 *   - `three/examples/jsm/math/MeshSurfaceSampler.js` — `new MeshSurfaceSampler(mesh)
 *     .build()`, then `sample(pos, normal?)` writes a surface point + its normal.
 *   (`three/addons/*` is an export alias for the same `examples/jsm/*` files;
 *    we use the `examples/jsm` specifier, which resolves physically AND has the
 *    matching `@types/three` declarations.)
 *
 * The body dissolve shader and the particle birth share the SAME object-space
 * noise field — `markThreshold(x, y, z)` here is the JS source of truth, and
 * `MARK_NOISE_GLSL` / the TSL twin replicate it exactly so a particle is born
 * precisely where the surface erodes (one `uDissolve` drives both). The GLB is
 * centered & ~2 units tall — the same envelope the procedural mark produced —
 * so this object-space field stays consistent.
 */
import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

// === Shared dissolve noise (JS source of truth) ============================
// A compact 3D value-noise fbm of OBJECT-SPACE position. The body shader and
// the particle birth both evaluate the SAME field so the eroding mesh front
// and the spawning particles agree. `MARK_NOISE_GLSL` (logoShader.ts) and the
// TSL twin (logoNodeMaterial.ts) replicate this hash/fbm constant-for-constant.
//
// Returned threshold is normalized to ~[0,1] so a single `uDissolve` ∈ [0,1]
// sweeps the whole mark.

const NOISE_FREQ = 1.05; // object-space frequency of the first octave

function hash31(x: number, y: number, z: number): number {
  // fract(sin(dot(p, (127.1, 311.7, 74.7))) * 43758.5453123)
  const d = x * 127.1 + y * 311.7 + z * 74.7;
  const s = Math.sin(d) * 43758.5453123;
  return s - Math.floor(s);
}

function smoothstep01(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Trilinear value noise in [0,1]. Mirrors vnoise3 in the shaders. */
function vnoise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smoothstep01(x - ix);
  const fy = smoothstep01(y - iy);
  const fz = smoothstep01(z - iz);

  const c000 = hash31(ix, iy, iz);
  const c100 = hash31(ix + 1, iy, iz);
  const c010 = hash31(ix, iy + 1, iz);
  const c110 = hash31(ix + 1, iy + 1, iz);
  const c001 = hash31(ix, iy, iz + 1);
  const c101 = hash31(ix + 1, iy, iz + 1);
  const c011 = hash31(ix, iy + 1, iz + 1);
  const c111 = hash31(ix + 1, iy + 1, iz + 1);

  const x00 = lerp(c000, c100, fx);
  const x10 = lerp(c010, c110, fx);
  const x01 = lerp(c001, c101, fx);
  const x11 = lerp(c011, c111, fx);
  const y0 = lerp(x00, x10, fy);
  const y1 = lerp(x01, x11, fy);
  return lerp(y0, y1, fz);
}

/**
 * fbm of object-space position, normalized to ~[0,1]. THE shared dissolve
 * field. Three octaves (a=0.5 halving, p*=2.02), same as the GLSL/TSL twins.
 */
export function markThreshold(x: number, y: number, z: number): number {
  let px = x * NOISE_FREQ;
  let py = y * NOISE_FREQ;
  let pz = z * NOISE_FREQ;
  let v = 0;
  let a = 0.5;
  let norm = 0;
  for (let i = 0; i < 3; i++) {
    v += a * vnoise3(px, py, pz);
    norm += a;
    px *= 2.02;
    py *= 2.02;
    pz *= 2.02;
    a *= 0.5;
  }
  return v / norm; // ~[0,1]
}

export interface MarkParticleBuffers {
  count: number;
  /** Rest (surface) position, vec3. */
  aRest: Float32Array;
  /** Surface normal, vec3. */
  aNormal: Float32Array;
  /** Per-particle random seed, float. */
  aSeed: Float32Array;
  /** Dissolve threshold = markThreshold(aRest), float — birth at the front. */
  aThreshold: Float32Array;
}

/**
 * Sample `count` points across the mark's surface with `MeshSurfaceSampler`.
 * Returns per-instance attribute arrays for the instanced-billboard particle
 * material. `aThreshold` is the SAME object-space noise the body shader uses,
 * so particles are born exactly at the eroding surface front.
 */
export function sampleMarkParticles(
  geometry: THREE.BufferGeometry,
  count: number,
): MarkParticleBuffers {
  // The sampler reads a real Mesh's geometry; a throwaway material is fine.
  const mesh = new THREE.Mesh(geometry);
  const sampler = new MeshSurfaceSampler(mesh).build();

  const aRest = new Float32Array(count * 3);
  const aNormal = new Float32Array(count * 3);
  const aSeed = new Float32Array(count);
  const aThreshold = new Float32Array(count);

  const pos = new THREE.Vector3();
  const nrm = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    sampler.sample(pos, nrm);
    aRest[i * 3] = pos.x;
    aRest[i * 3 + 1] = pos.y;
    aRest[i * 3 + 2] = pos.z;
    aNormal[i * 3] = nrm.x;
    aNormal[i * 3 + 1] = nrm.y;
    aNormal[i * 3 + 2] = nrm.z;
    aSeed[i] = Math.random();
    aThreshold[i] = markThreshold(pos.x, pos.y, pos.z);
  }

  return { count, aRest, aNormal, aSeed, aThreshold };
}
