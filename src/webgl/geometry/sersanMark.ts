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
 * noise field — `markThreshold(x, y, z)` here is the JS source of truth, baked
 * per-particle into the `aThreshold` attribute at sample time so a particle is
 * born precisely where the surface erodes (one `uDissolve` drives both). The
 * old in-shader replicas (logoShader.ts's `MARK_NOISE_GLSL` and its TSL twin
 * logoNodeMaterial.ts) were deleted with the legacy sprite pipeline — any
 * revived GPU evaluation must replicate this hash/fbm constant-for-constant.
 * The GLB is centered & ~2 units tall — the same envelope the procedural mark
 * produced — so this object-space field stays consistent.
 */
import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

// === Shared dissolve noise (JS source of truth) ============================
// A compact 3D value-noise fbm of OBJECT-SPACE position. The body shader and
// the particle birth both evaluate the SAME field so the eroding mesh front
// and the spawning particles agree. This is the only surviving implementation
// (the GLSL/TSL in-shader replicas, logoShader.ts / logoNodeMaterial.ts, were
// deleted); consumers read it baked into the `aThreshold` attribute.
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

export interface MarkHomeField {
  /** Grid edge (SIZE); total particles = size*size. */
  size: number;
  count: number;
  /**
   * RGBA-float home positions, ROW-MAJOR over the SIZE×SIZE grid — xyz = rest
   * surface point, w = 1. Seeds the GPGPU "home" (rest target) DataTexture AND
   * the live POSITION render target's initial state. Size = size*size*4.
   */
  homeRGBA: Float32Array;
  /**
   * Per-instance grid UV (`aRef`), one vec2 per particle: the cell center
   * `((col+0.5)/size, (row+0.5)/size)` so the render vertex shader looks up its
   * live position from the state texture/RT at exactly its own texel. Size =
   * size*size*2, ordered to MATCH `homeRGBA`'s row-major layout.
   */
  aRef: Float32Array;
}

/**
 * How strongly to bias surface sampling toward the camera-facing FRONT of the
 * mark (the large +Z plate) over the back/bevel walls.
 *
 * The Blender mark is a flat wide plate (Z-depth ≈ 0.44 vs height 2). Plain
 * area-weighted MeshSurfaceSampler scatters ~half the particles onto the BACK
 * face (−Z, hidden behind the front from a head-on view) and onto the thin side
 * bevels — which is exactly the "thin box outline" / sparse look the user
 * rejected. We rejection-sample instead: a candidate is KEPT with probability
 * `mix(FRONT_BIAS_MIN, 1, frontness)` where `frontness = saturate(normal.z)`
 * (1 dead-on front, 0 back/edge). The kept points therefore COAT the front face
 * densely, so the mark reads as a solid velvety skin face-on (like DDD's "D").
 */
const FRONT_BIAS_MIN = 0.12;

/**
 * Per-layer sampling options for the two-layer Lusion-DDD hero (body + skin).
 * All optional → the defaults reproduce the original single-layer behaviour, so
 * `sampleMarkHomePositions(geometry, size)` is unchanged for existing callers.
 *
 * - `frontBias` — rejection-sampling keep floor (see FRONT_BIAS_MIN). Lower
 *   (~0.4) coats the depth/back too so the BODY reads as a solid volume; the
 *   default 0.12 keeps the front-face bias for a face-on skin.
 * - `normalOffset` — push each home point OUT (+) / IN (−) along the surface
 *   normal. The SKIN sits a hair outside the body (`+0.02–0.04`) so the cyan
 *   glow floats over the blue solid (matches the DDD footer skin-over-body).
 * - `volumeJitter` — push each point INWARD along −normal by a random
 *   `[0, volumeJitter]`, faking a filled volume from a surface sampler so the
 *   BODY reads dense/solid rather than a hollow shell.
 */
export interface MarkLayerOptions {
  frontBias?: number;
  normalOffset?: number;
  volumeJitter?: number;
}

/**
 * Sample a SIZE×SIZE grid of points across the mark's surface for the GPGPU
 * dissolve hero. Returns the home-position field (to seed the position/home
 * float textures) and the per-instance grid `aRef` UVs (so each rendered
 * billboard reads its own texel from the simulation state). The mesh itself is
 * NOT rendered — the sampler only generates the rest positions the particles
 * spring back to.
 *
 * Sampling is FRONT-BIASED (see FRONT_BIAS_MIN) so the camera-facing face is
 * densely coated and the mark reads as a solid skin rather than a thin outline.
 * `opts` tunes the bias + a normal offset + a volume jitter PER LAYER (body vs
 * skin) — omitted, it reproduces the original single-layer field exactly.
 *
 * `homeRGBA[i]` and `aRef[i]` share the SAME row-major index: particle `i` sits
 * at grid cell `(col = i % size, row = floor(i / size))`, whose texel center is
 * `aRef[i] = ((col+0.5)/size, (row+0.5)/size)`. A DataTexture built from
 * `homeRGBA` (RGBAFormat/FloatType, width=height=size) is sampled at `aRef[i]`
 * to recover `homeRGBA[i]` exactly, so the spring target, the seeded position
 * and the render lookup all stay in lockstep.
 */
export function sampleMarkHomePositions(
  geometry: THREE.BufferGeometry,
  size: number,
  opts: MarkLayerOptions = {},
): MarkHomeField {
  const frontBias = opts.frontBias ?? FRONT_BIAS_MIN;
  const normalOffset = opts.normalOffset ?? 0;
  const volumeJitter = opts.volumeJitter ?? 0;

  const count = size * size;
  const mesh = new THREE.Mesh(geometry);
  const sampler = new MeshSurfaceSampler(mesh).build();

  const homeRGBA = new Float32Array(count * 4);
  const aRef = new Float32Array(count * 2);
  const pos = new THREE.Vector3();
  const nrm = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    // Rejection-sample toward the front face so the camera-facing plate is the
    // densest. Cap the retries so a degenerate normal field can never spin —
    // after MAX_TRIES we accept whatever we last drew (graceful, no crash).
    let tries = 0;
    const MAX_TRIES = 24;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      sampler.sample(pos, nrm);
      const frontness = Math.max(0, nrm.z); // 1 = dead-on front, 0 = back/edge
      const keepP = frontBias + (1 - frontBias) * frontness;
      if (Math.random() < keepP || ++tries >= MAX_TRIES) break;
    }

    // Per-layer offset along the surface normal: SKIN floats out (+), and a
    // random inward jitter fakes a filled VOLUME for the dense body. `nrm` is
    // unit-length from MeshSurfaceSampler.
    if (normalOffset !== 0) {
      pos.x += nrm.x * normalOffset;
      pos.y += nrm.y * normalOffset;
      pos.z += nrm.z * normalOffset;
    }
    if (volumeJitter > 0) {
      const j = Math.random() * volumeJitter;
      pos.x -= nrm.x * j;
      pos.y -= nrm.y * j;
      pos.z -= nrm.z * j;
    }

    homeRGBA[i * 4] = pos.x;
    homeRGBA[i * 4 + 1] = pos.y;
    homeRGBA[i * 4 + 2] = pos.z;
    homeRGBA[i * 4 + 3] = 1;

    // Row-major texel center matching the DataTexture's (width=height=size).
    const col = i % size;
    const row = Math.floor(i / size);
    aRef[i * 2] = (col + 0.5) / size;
    aRef[i * 2 + 1] = (row + 0.5) / size;
  }

  return { size, count, homeRGBA, aRef };
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
