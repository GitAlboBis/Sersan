/**
 * Crystal-cluster build — the WebGL half of ROUND-5 W3 (the igloo "3D
 * stones" transplant, research/2026-08-21-igloo-stones-dossier.md). Pure
 * vertex/fragment node material: NO storage buffers, NO compute, NO textures
 * — the same graph compiles on the true-WebGPU backend AND the three/webgpu
 * WebGL2 fallback (only cross-backend TSL ops: the neuralFieldCompute /
 * PostFXNodes proven set plus dot/cross/sqrt, all core WGSL/GLSL builtins).
 *
 * GEOMETRY (procedural, dossier plan §1; Blender GLB is a later upgrade):
 *   healthy → ONE intact crystal: non-indexed IcosahedronGeometry displaced
 *     CPU-side by 2-octave fractal noise (0.34 amplitude, low octave terraced
 *     — round 7), squashed
 *     (1, 1.45, 0.85) for the shard silhouette, computeVertexNormals AFTER
 *     the squash → per-face FLAT normals (non-indexed), the facets that sell
 *     crystal.
 *   broken  → a FRACTURED CLUSTER of shards merged into ONE BufferGeometry
 *     (single draw call): each shard its own small displaced flat-shaded
 *     icosahedron baked AROUND its centroid, with per-VERTEX `aCentr` (offset
 *     from cluster center) + `aRand` (vec3) constant across the shard —
 *     igloo's centr/rand attribute contract. The vertex path applies igloo's
 *     exact explode recipe: pos += centr·(gap + rand.y·sin(rand.x·5 +
 *     t·0.5)·0.05), plus per-shard rotate3D(pos − centr, axis(rand), angle).
 *
 * MATERIAL — custom TSL fake transmission (NOT drei MeshTransmissionMaterial:
 * that is GLSL/onBeforeCompile, dead on three/webgpu). The dossier §2 loop
 * with ONE structural substitution: the "screen texture sample" becomes a
 * PROCEDURAL BACKDROP evaluated in-shader at the refracted direction — a navy
 * diagonal gradient, noise-modulated like the mined `diagonalGradient`, with
 * two sharp cyan bloom spots — so there is NO RT, NO second pass, NO texture
 * bindings. 3 samples (1 on lite), per-channel ior·(1 + k·CA·(i+noise)/3)
 * with k = 0/1/2, thickness smear thick·pow(rough, .33), normal jitter
 * rough²·2·normalize(noiseVec); hash noise (the repo's sin-dot family) stands
 * in for igloo's blue-noise texture.
 *
 * ROUND 7 — the igloo REALISM pass (owner: "not so bland"). All procedural,
 * zero new bindings (aFacet is a vertex-buffer slot, not a binding):
 *   1. 2-lobe environment — white-cyan key spec lobe pow(max(dot(N,H),0),
 *      SPEC_POW) + navy fill, with a baked per-FACE random (aFacet) tilting
 *      the lobe normal + jittering brightness → per-facet value separation
 *      (facets flash independently as the crystal tumbles).
 *   2. Dark glass body (trans × uBodyDarken — darker than the backdrop
 *      mid-tone) under a BRIGHT rim: RIM_BASE past 1.0 into bloom at grazing,
 *      per-channel fresnel exponents (RIM_DISPERSION) → spectral fringe, and
 *      fresnel-boosted CA (uCAEdge) → dispersion concentrated on the
 *      silhouette.
 *   3. Sparkle glints — hash cells over vLocal, per-cell micro-normal gated
 *      on view/normal/light alignment (pow 90) + a slow time wink; gain >1.0
 *      so single pixels bloom. FULL TIER ONLY.
 *   4. Frost grain — 3D value noise over vLocal modulating roughness /
 *      thickness / body density → internal veins instead of uniform glass.
 *      FULL TIER ONLY (lite keeps the cheap facet lobe, drops sparkle+frost).
 *
 * FOG ADAPTATION (dossier §5): igloo's opaque mix(bg, color, vFade) repaint
 * would paint solid navy over the DOM (our canvas is transparent) — instead
 * the SAME `falloffsmooth(camDist…)` window fades ALPHA, in crystal-local
 * units relative to the cluster center (uCamDist0 / uWorldScale are
 * driver-written), so deep/back shards dissolve into the page navy.
 *
 * VARYING DISCIPLINE (load-bearing, see neuralFieldCompute header): every
 * varying is a SELF-CONTAINED expression of attributes + uniforms, and the
 * SAME nodes feed the vertex body — never an outer .toVar() assigned from
 * the vertex Fn.
 *
 * All `three/webgpu` + `three/tsl` symbols are passed IN (the driver
 * lazy-imports inside its webgpuEnabled()-gated effect — never module scope).
 */
import {
  CRYSTAL_DETAIL,
  CRYSTAL_DETAIL_LITE,
  SHARD_DETAIL,
  SHARD_DETAIL_LITE,
  SHARD_COUNT,
  SHARD_COUNT_LITE,
  CRYSTAL_NOISE_FREQ,
  CRYSTAL_NOISE_AMP,
  CRYSTAL_NOISE_AMP2,
  CRYSTAL_FACET_QUANT,
  CRYSTAL_FACET_MIX,
  CRYSTAL_SQUASH,
  SHARD_RADIUS,
  SHARD_SIZES,
  CHIP_SCATTER,
  SHARD_SPREAD_MIN,
  SHARD_SPREAD_MAX,
  FRACTURE_REST_GAP,
  CRYSTAL_IDLE_DRIFT,
  SHARD_SPIN,
  CRYSTAL_IOR,
  CRYSTAL_CA,
  CA_EDGE_BOOST,
  CRYSTAL_THICKNESS,
  CRYSTAL_ROUGH,
  CRYSTAL_SAMPLES,
  CRYSTAL_SAMPLES_LITE,
  REFR_OFFSET_SCALE,
  BACKDROP_COORD_SCALE,
  BACKDROP_NAVY,
  BACKDROP_NAVY2,
  BACKDROP_CYAN,
  BACKDROP_SPOTS,
  BACKDROP_SPOT_GAIN,
  FACET_KEY_DIR,
  FACET_FILL_DIR,
  FACET_KEY_COLOR,
  FACET_FILL_COLOR,
  SPEC_POW,
  SPEC_GAIN,
  FILL_GAIN,
  FACET_JITTER,
  FACET_SPEC_JIT,
  FACET_VALUE_JIT,
  BODY_DARKEN,
  SPARKLE_FREQ,
  SPARKLE_TILT,
  SPARKLE_POW,
  SPARKLE_DENSITY,
  SPARKLE_TWINKLE,
  SPARKLE_GAIN,
  FROST_FREQ,
  FROST_AMP,
  FROST_ROUGH_K,
  FROST_THICK_K,
  FROST_DENSITY_K,
  FRESNEL_POW,
  RIM_BASE,
  RIM_FLASH_GAIN,
  RIM_DISPERSION,
  RIM_WHITEN,
  CRYSTAL_ALPHA,
  FADE_FROM,
  FADE_TO,
  FADE_MARGIN,
  FADE_PROGRESS,
  FADE_MAX,
} from "./crystalConfig";
import type { LatticeMode } from "./neuralLatticeConfig";

// Loose structural typings — the real node/namespace types are vast & generic
// (same rationale as gpgpuNodeSim.ts / neuralFieldCompute.ts).
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

export interface CrystalUniforms {
  uTime: { value: number };
  /** 0→1 section reveal (driver: scrollStore.reveal × visibility ramp). */
  uReveal: { value: number };
  /** 0→1 rim ignition — healthy: eased ring flashes; broken: the re-cohere
   * envelope. Pushes the fresnel rim past 1.0 (selective bloom). */
  uFlash: { value: number };
  /** Explode gap (broken; dead node on healthy). Rest ≈ FRACTURE_REST_GAP,
   * breathes with the fracture surges, →~0 on the row-hover re-cohere. */
  uGap: { value: number };
  /** Camera→cluster-center distance in WORLD units (driver-written). */
  uCamDist0: { value: number };
  /** The group's uniform world scale (crystal-unit normalizer). */
  uWorldScale: { value: number };
  // --- live tunables (dev-handle surfaced; igloo numbers as defaults) -------
  uIor: { value: number };
  uCA: { value: number };
  uThickness: { value: number };
  uRough: { value: number };
  uRimBase: { value: number };
  uRimFlash: { value: number };
  uAlpha: { value: number };
  uFadeProgress: { value: number };
  uSpotGain: { value: number };
  uDrift: { value: number };
  uShardSpin: { value: number };
  // --- round-7 realism tunables (dev-handle surfaced) -----------------------
  /** Dark-glass body gain on the transmitted color (< 1 = meteorite read). */
  uBodyDarken: { value: number };
  /** Key-lobe exponent (lowish — whole facets flash). */
  uSpecPow: { value: number };
  /** Key-lobe gain (white-cyan sun). */
  uSpecGain: { value: number };
  /** Navy fill-lobe gain. */
  uFillGain: { value: number };
  /** Per-facet lobe-normal tilt (aFacet driven). */
  uFacetJit: { value: number };
  /** Fresnel CA boost — dispersion concentrated on the silhouette. */
  uCAEdge: { value: number };
  /** Sparkle glint gain (>1 blooms; dead node on lite — branch not built). */
  uSparkleGain: { value: number };
  /** Frost-grain master amplitude (dead node on lite). */
  uFrostAmp: { value: number };
}

export interface CrystalBuild {
  geometry: Any;
  material: Any;
  uniforms: CrystalUniforms;
  /** Broken only: per-shard cluster-center offsets [x,y,z]·count — the
   * driver's callout anchors ride these (empty on healthy). */
  shardCentrs: number[][];
  /** Broken only: the per-shard rand vec3s (idle-drift twin math). */
  shardRands: number[][];
  dispose: () => void;
}

export interface CrystalBuildArgs {
  webgpu: Any;
  tsl: Any;
  mode: LatticeMode;
  /** fxBudget level 2 build: 1 dispersion sample, single-octave noise
   * (geometry + backdrop), lower subdivision detail. */
  lite: boolean;
}

/** Deterministic [0,1) hash — the repo's sin-dot family (neuralFieldCompute
 * seedBuffers twin), JS side. */
function h(i: number, mulA: number, addB: number): number {
  const s = Math.sin(i * mulA + addB) * 43758.545;
  return s - Math.floor(s);
}

/** Continuous [-1,1] 3D "sinenoise" for the CPU displacement — any smooth
 * deterministic f(position) keeps shared edge positions matched, so the
 * non-indexed facets never crack. */
function sNoise3(x: number, y: number, z: number): number {
  return (
    Math.sin(x * 1.7 + Math.sin(y * 2.3 + 1.3)) *
    Math.sin(y * 1.3 + Math.sin(z * 2.9 + 2.1)) *
    Math.sin(z * 1.9 + Math.sin(x * 2.1 + 4.2))
  );
}

/**
 * In-place fractal displacement + squash of a (non-indexed) position buffer:
 * p ← p·(1 + amp·fbm(p·freq + seed))·squash. Normals are computed by the
 * caller AFTER this (flat facets need the final positions).
 */
function displaceAndSquash(
  pos: { count: number; getX: Any; getY: Any; getZ: Any; setXYZ: Any },
  seed: number,
  squash: [number, number, number],
  lite: boolean,
): void {
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const f = CRYSTAL_NOISE_FREQ;
    let n = sNoise3(x * f + seed, y * f + seed * 1.7, z * f + seed * 0.6);
    // Round 7 (§5 silhouette): terrace the low octave toward quantized
    // ledges — chiseled angular plateaus instead of a smooth potato.
    // Deterministic f(position) → coincident soup vertices stay matched.
    const q = Math.round(n * CRYSTAL_FACET_QUANT) / CRYSTAL_FACET_QUANT;
    n += (q - n) * CRYSTAL_FACET_MIX;
    if (!lite) {
      // Second octave — dropped on the lite build (round-5 tier spec);
      // round 7 flattened its amplitude (micro-noise ate the big moves).
      n +=
        CRYSTAL_NOISE_AMP2 *
        sNoise3(
          x * f * 2.1 + seed + 7.3,
          y * f * 2.1 + seed + 3.1,
          z * f * 2.1 + seed + 9.7,
        );
    }
    const k = 1 + CRYSTAL_NOISE_AMP * n;
    pos.setXYZ(i, x * k * squash[0], y * k * squash[1], z * k * squash[2]);
  }
}

/**
 * Round 7 — bake a per-FACE random vec3 (`aFacet`, constant across each
 * triangle of the non-indexed soup) for the 2-lobe facet response: .x/.y
 * jitter key-lobe brightness / body value, the full vec3 tilts the lobe
 * normal. A baked attribute (NOT a hash of an interpolated varying) so the
 * value is bit-stable across the face — fp jitter through sin-hash would
 * speckle. One extra vertex-buffer slot, zero bindings.
 */
function bakeFacetRand(
  geometry: Any,
  BufferAttribute: Any,
  seed: number,
): void {
  const count = geometry.attributes.position.count as number;
  const arr = new Float32Array(count * 3);
  for (let fIdx = 0; fIdx * 3 < count; fIdx++) {
    const r0 = h(fIdx, 17.23 + seed, 91.7);
    const r1 = h(fIdx, 47.77 + seed, 13.9);
    const r2 = h(fIdx, 83.13 + seed, 57.3);
    const base = fIdx * 9;
    for (let v = 0; v < 3; v++) {
      arr[base + v * 3] = r0;
      arr[base + v * 3 + 1] = r1;
      arr[base + v * 3 + 2] = r2;
    }
  }
  geometry.setAttribute("aFacet", new BufferAttribute(arr, 3));
}

export function createCrystalBuild(args: CrystalBuildArgs): CrystalBuild {
  const { webgpu, tsl, mode, lite } = args;
  const {
    IcosahedronGeometry,
    BufferGeometry,
    BufferAttribute,
    MeshBasicNodeMaterial,
    Color,
  } = webgpu as Any;
  const {
    uniform,
    attribute,
    positionLocal,
    normalLocal,
    modelViewMatrix,
    cameraProjectionMatrix,
    Fn,
    vec2,
    vec3,
    vec4,
    float,
    length,
    max,
    clamp,
    sin,
    cos,
    floor,
    fract,
    mix,
    pow,
    smoothstep,
    varying,
    select,
    exp,
    dot,
    cross,
    normalize,
    sqrt,
    Discard,
  } = tsl as Any;

  const broken = mode === "broken";
  const samples = lite ? CRYSTAL_SAMPLES_LITE : CRYSTAL_SAMPLES;

  // === Geometry =============================================================
  let geometry: Any;
  const shardCentrs: number[][] = [];
  const shardRands: number[][] = [];

  if (!broken) {
    // ONE intact crystal — displaced, squashed, flat-shaded.
    geometry = new IcosahedronGeometry(
      1,
      lite ? CRYSTAL_DETAIL_LITE : CRYSTAL_DETAIL,
    );
    displaceAndSquash(geometry.attributes.position, 3.7, CRYSTAL_SQUASH, lite);
    geometry.computeVertexNormals(); // non-indexed → per-face flat normals
    bakeFacetRand(geometry, BufferAttribute, 3.7); // round-7 facet randoms
  } else {
    // FRACTURED CLUSTER — shards merged into one geometry (one draw call).
    const count = lite ? SHARD_COUNT_LITE : SHARD_COUNT;
    const detail = lite ? SHARD_DETAIL_LITE : SHARD_DETAIL;
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));

    const parts: {
      pos: Float32Array;
      nrm: Float32Array;
      centr: [number, number, number];
      rand: [number, number, number];
    }[] = [];
    let total = 0;

    for (let s = 0; s < count; s++) {
      const r0 = h(s, 12.9898, 78.233);
      const r1 = h(s, 39.3467, 11.135);
      const r2 = h(s, 73.156, 52.235);
      // Golden-spiral centroid direction → even shard spread; the cluster
      // keeps the intact crystal's squashed silhouette.
      const t = (s + 0.5) / count;
      const phi = Math.acos(1 - 2 * t);
      const theta = GOLDEN * s;
      // Round 7 (§5): fractured-family size variance — 2 large + mid + chips;
      // chips (size < 1) scatter further than the bodies (the centroid radius
      // gains the CHIP_SCATTER factor). The callout twin stays exact: this
      // SAME `centr` translates the verts, fills aCentr AND is pushed to
      // shardCentrs — the driver never re-derives it from config.
      const sizeMul = SHARD_SIZES[s % SHARD_SIZES.length];
      const rad =
        (SHARD_SPREAD_MIN + r0 * (SHARD_SPREAD_MAX - SHARD_SPREAD_MIN)) *
        (1 + Math.max(0, 1 - sizeMul) * CHIP_SCATTER);
      const centr: [number, number, number] = [
        Math.sin(phi) * Math.cos(theta) * rad * CRYSTAL_SQUASH[0],
        Math.cos(phi) * rad * CRYSTAL_SQUASH[1] * 1.2,
        Math.sin(phi) * Math.sin(theta) * rad * CRYSTAL_SQUASH[2],
      ];
      const rand: [number, number, number] = [r0, r1, r2];

      const shard = new IcosahedronGeometry(SHARD_RADIUS * sizeMul, detail);
      displaceAndSquash(
        shard.attributes.position,
        11.3 + s * 9.7,
        [1, 1.1 + r1 * 0.5, 0.75 + r2 * 0.3],
        lite,
      );
      shard.computeVertexNormals();
      const pos = new Float32Array(shard.attributes.position.array);
      const nrm = new Float32Array(shard.attributes.normal.array);
      // Bake the shard AROUND its centroid — the shader's rotate3D pivots on
      // aCentr and the explode offset rides on top (igloo contract).
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] += centr[0];
        pos[i + 1] += centr[1];
        pos[i + 2] += centr[2];
      }
      shard.dispose();
      parts.push({ pos, nrm, centr, rand });
      total += pos.length / 3;
      shardCentrs.push([...centr]);
      shardRands.push([...rand]);
    }

    const mPos = new Float32Array(total * 3);
    const mNrm = new Float32Array(total * 3);
    const mCentr = new Float32Array(total * 3);
    const mRand = new Float32Array(total * 3);
    let off = 0;
    for (const p of parts) {
      mPos.set(p.pos, off * 3);
      mNrm.set(p.nrm, off * 3);
      const n = p.pos.length / 3;
      for (let i = 0; i < n; i++) {
        mCentr.set(p.centr, (off + i) * 3);
        mRand.set(p.rand, (off + i) * 3);
      }
      off += n;
    }
    geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(mPos, 3));
    geometry.setAttribute("normal", new BufferAttribute(mNrm, 3));
    geometry.setAttribute("aCentr", new BufferAttribute(mCentr, 3));
    geometry.setAttribute("aRand", new BufferAttribute(mRand, 3));
    bakeFacetRand(geometry, BufferAttribute, 11.3); // round-7 facet randoms
  }

  // === Uniforms =============================================================
  const uTime = uniform(0);
  const uReveal = uniform(0);
  const uFlash = uniform(0);
  const uGap = uniform(broken ? FRACTURE_REST_GAP : 0);
  const uCamDist0 = uniform(12);
  const uWorldScale = uniform(1);
  const uIor = uniform(CRYSTAL_IOR);
  const uCA = uniform(CRYSTAL_CA);
  const uThickness = uniform(CRYSTAL_THICKNESS);
  const uRough = uniform(CRYSTAL_ROUGH);
  const uRimBase = uniform(RIM_BASE);
  const uRimFlash = uniform(RIM_FLASH_GAIN);
  const uAlpha = uniform(CRYSTAL_ALPHA);
  const uFadeProgress = uniform(FADE_PROGRESS);
  const uSpotGain = uniform(BACKDROP_SPOT_GAIN);
  const uDrift = uniform(CRYSTAL_IDLE_DRIFT);
  const uShardSpin = uniform(SHARD_SPIN);
  // Round-7 realism tunables (all in the dev handle).
  const uBodyDarken = uniform(BODY_DARKEN);
  const uSpecPow = uniform(SPEC_POW);
  const uSpecGain = uniform(SPEC_GAIN);
  const uFillGain = uniform(FILL_GAIN);
  const uFacetJit = uniform(FACET_JITTER);
  const uCAEdge = uniform(CA_EDGE_BOOST);
  const uSparkleGain = uniform(SPARKLE_GAIN);
  const uFrostAmp = uniform(FROST_AMP);
  const uColNavy = uniform(new Color(BACKDROP_NAVY));
  const uColNavy2 = uniform(new Color(BACKDROP_NAVY2));
  const uColCyan = uniform(new Color(BACKDROP_CYAN));
  // Lobe colors — plain constants (config-frozen, not uniforms): the dev
  // handle exposes the scalar gains; hue stays the white-cyan/navy contract.
  const keyCol = new Color(FACET_KEY_COLOR);
  const fillCol = new Color(FACET_FILL_COLOR);

  // === Shared TSL helpers ===================================================
  /** Rodrigues rotation of p about unit axis by angle. */
  function rotate3D(p: Any, axis: Any, ang: Any): Any {
    const c = cos(ang);
    const s = sin(ang);
    return p
      .mul(c)
      .add(cross(axis, p).mul(s))
      .add(axis.mul(dot(axis, p)).mul(float(1).sub(c)));
  }
  /** Deterministic [0,1) hash of a vec3 (blue-noise stand-in, repo idiom). */
  function hash3(p: Any): Any {
    return fract(
      sin(p.x.mul(127.1).add(p.y.mul(311.7)).add(p.z.mul(74.7))).mul(
        43758.5453,
      ),
    );
  }
  /** Bilinear 2D value noise (the neuralFieldCompute vnoise2 twin) — the
   * procedural stand-in for igloo's sinenoise texture taps. */
  function hash2(p: Any): Any {
    return fract(sin(p.x.mul(127.1).add(p.y.mul(311.7))).mul(43758.5453));
  }
  function vnoise2(p: Any): Any {
    const ip = floor(p).toVar();
    const fp = fract(p).toVar();
    const wf = fp.mul(fp).mul(float(3.0).sub(fp.mul(2.0))).toVar();
    const n00 = hash2(ip);
    const n10 = hash2(ip.add(vec2(1.0, 0.0)));
    const n01 = hash2(ip.add(vec2(0.0, 1.0)));
    const n11 = hash2(ip.add(vec2(1.0, 1.0)));
    return mix(mix(n00, n10, wf.x), mix(n01, n11, wf.x), wf.y);
  }
  /** Trilinear 3D value noise (round-7 frost grain) — the vnoise2 recipe
   * lifted to 3D on hash3. Same cross-backend op set (floor/fract/mix). */
  function vnoise3(p: Any): Any {
    const ip = floor(p).toVar();
    const fp = fract(p).toVar();
    const wf = fp.mul(fp).mul(float(3.0).sub(fp.mul(2.0))).toVar();
    const nx00 = mix(hash3(ip), hash3(ip.add(vec3(1.0, 0.0, 0.0))), wf.x);
    const nx10 = mix(
      hash3(ip.add(vec3(0.0, 1.0, 0.0))),
      hash3(ip.add(vec3(1.0, 1.0, 0.0))),
      wf.x,
    );
    const nx01 = mix(
      hash3(ip.add(vec3(0.0, 0.0, 1.0))),
      hash3(ip.add(vec3(1.0, 0.0, 1.0))),
      wf.x,
    );
    const nx11 = mix(
      hash3(ip.add(vec3(0.0, 1.0, 1.0))),
      hash3(ip.add(vec3(1.0, 1.0, 1.0))),
      wf.x,
    );
    return mix(mix(nx00, nx10, wf.y), mix(nx01, nx11, wf.y), wf.z);
  }
  /** Igloo falloffsmooth VERBATIM (dossier §3, pretty-bundle L25961):
   * edge = mix(from − margin·sign, to, progress);
   * return smoothstep(edge + margin·sign, edge, x).  sign = sign(to − from),
   * a JS constant here (from/to/margin are config constants). */
  function falloffsmooth(
    x: Any,
    from: number,
    to: number,
    margin: number,
    progress: Any,
  ): Any {
    const s = Math.sign(to - from);
    const edge = mix(float(from - margin * s), float(to), progress);
    return smoothstep(edge.add(float(margin * s)), edge, x);
  }
  /** Hand-rolled refract (cross-backend safe — no MathNode dependency):
   * falls back to the reflected direction on total internal reflection. */
  function refractDir(I: Any, N: Any, eta: Any): Any {
    const nDotI = dot(N, I).toVar();
    const k = float(1)
      .sub(eta.mul(eta).mul(float(1).sub(nDotI.mul(nDotI))))
      .toVar();
    const refr = I.mul(eta).sub(N.mul(eta.mul(nDotI).add(sqrt(max(k, 0.0)))));
    const refl = I.sub(N.mul(nDotI.mul(2.0)));
    return select(k.lessThan(0.0), refl, refr);
  }
  /**
   * THE PROCEDURAL REFRACTION BACKDROP — the structural substitution for
   * igloo's transmission RT (dossier §2/§5): navy diagonal gradient ×
   * noise modulation (the mined diagonalGradient recipe; the lite build
   * drops the second multiply) + two soft cyan bloom spots. Evaluated at a
   * 2D coordinate derived from the crystal-local position + the refracted
   * direction, so tumbling shifts the "internal world" like real refraction.
   */
  function backdrop(c: Any): Any {
    let g: Any = clamp(c.x.add(c.y).mul(0.25).add(0.5), float(0), float(1));
    const n1 = vnoise2(
      c.add(vec2(uTime.mul(0.0614), uTime.mul(0.0614).negate())),
    );
    g = g.mul(n1.mul(0.7).add(0.3));
    if (!lite) {
      const n2 = vnoise2(c.mul(2.0).add(vec2(0.0, uTime.mul(0.017))));
      g = g.mul(n2.mul(0.5).add(0.5));
    }
    let col: Any = mix(uColNavy, uColNavy2, g).mul(1.1);
    for (const [sx, sy, sk] of BACKDROP_SPOTS) {
      const d = c.sub(vec2(sx, sy));
      col = col.add(
        uColCyan.mul(exp(dot(d, d).mul(sk).negate())).mul(uSpotGain),
      );
    }
    return col;
  }

  // === Vertex path ==========================================================
  // Broken: per-shard rotate3D about the shard centroid + igloo's explode.
  // Healthy: identity (the driver owns tumble/wobble via mesh.rotation).
  let pos: Any;
  let nrm: Any;
  if (broken) {
    const aCentr = attribute("aCentr");
    const aRand = attribute("aRand");
    // Epsilon keeps normalize() finite even for a pathological mid-cube rand.
    const axis = normalize(
      aRand.mul(2.0).sub(1.0).add(vec3(1e-4, 2e-4, 3e-4)),
    );
    const spinAng = uTime
      .mul(uShardSpin)
      .mul(aRand.x.sub(0.5).mul(2.0))
      .add(aRand.z.mul(6.2832));
    const pR = rotate3D(positionLocal.sub(aCentr), axis, spinAng).add(aCentr);
    // Igloo explode, verbatim: += centr·(gap + rand.y·sin(rand.x·5+t·.5)·drift)
    const explode = aCentr.mul(
      uGap.add(
        aRand.y.mul(sin(aRand.x.mul(5.0).add(uTime.mul(0.5)))).mul(uDrift),
      ),
    );
    pos = pR.add(explode);
    nrm = rotate3D(normalLocal, axis, spinAng);
  } else {
    pos = positionLocal;
    nrm = normalLocal;
  }

  const material = new MeshBasicNodeMaterial();
  const mvPos = modelViewMatrix.mul(vec4(pos, 1.0));
  material.vertexNode = Fn(() => cameraProjectionMatrix.mul(mvPos))();

  // Varyings — self-contained expressions, same nodes as the vertex body.
  // View transform in the VERTEX stage (uniform group scale → directions
  // survive the normalize; the anisotropic-stream caveat does not apply).
  const vPosView = varying(mvPos.xyz);
  const vNrmView = varying(
    normalize(modelViewMatrix.mul(vec4(nrm, 0.0)).xyz),
  );
  const vLocal = varying(pos);
  // Round 7 — per-face random (constant across each soup triangle, so the
  // interpolation is bit-stable; see bakeFacetRand).
  const vFacet = varying(attribute("aFacet"));

  // === Fragment =============================================================
  // Lobe colors as constant vec3 nodes (linear, via Color) — round 7.
  const keyC = vec3(keyCol.r, keyCol.g, keyCol.b);
  const fillC = vec3(fillCol.r, fillCol.g, fillCol.b);

  const shade = Fn(() => {
    const N = normalize(vNrmView).toVar();
    const V = normalize(vPosView.negate()).toVar();
    const I = V.negate().toVar(); // incident, camera → surface

    // Fresnel FIRST (round 7: it now feeds the CA edge boost + the rim).
    const f1 = clamp(float(1).sub(dot(N, V)), float(0), float(1)).toVar();
    const fres = pow(f1, float(FRESNEL_POW)).toVar();

    // --- Round 7 §4 — frost grain (FULL tier; lite keeps uniform glass):
    // signed 3D value noise over the stable local position modulating
    // roughness/thickness/density → internal veins, not white noise. ------
    let frost: Any = null;
    let roughEff: Any = uRough;
    let thickEff: Any = uThickness;
    if (!lite) {
      frost = vnoise3(vLocal.mul(FROST_FREQ))
        .sub(0.5)
        .mul(uFrostAmp)
        .toVar();
      roughEff = clamp(
        uRough.mul(frost.mul(FROST_ROUGH_K).add(1.0)),
        float(0.05),
        float(1.0),
      ).toVar();
      thickEff = uThickness.mul(frost.mul(FROST_THICK_K).add(1.0)).toVar();
    }

    // Blue-noise stand-in trio (per-fragment, object-stable).
    const nz = vec3(
      hash3(vLocal.mul(41.3)),
      hash3(vLocal.mul(73.7).add(vec3(11.0, 7.0, 3.0))),
      hash3(vLocal.mul(57.1).add(vec3(5.0, 17.0, 9.0))),
    ).toVar();
    // Igloo: distortionNormal = rough²·2·normalize(noise) — refraction-only
    // jitter (frosted grain); shading keeps the clean facet normal. Round 7:
    // rough is the frost-veined roughEff, so the jitter has STRUCTURE.
    const Nj = normalize(
      N.add(
        normalize(nz.sub(0.5).add(vec3(1e-4, 2e-4, 3e-4))).mul(
          roughEff.mul(roughEff).mul(2.0),
        ),
      ),
    ).toVar();

    // --- Dispersion ladder (igloo §2, 3 samples, k = 0/1/2 per channel).
    // Round 7 §2: CA is fresnel-boosted — fringes concentrate on the
    // silhouette (caEff = uCA·(1 + fres·uCAEdge)), igloo's visible fringes.
    const caEff = uCA.mul(fres.mul(uCAEdge).add(1.0)).toVar();
    const smear = thickEff.mul(pow(roughEff, 0.33)).toVar();
    const base = vLocal.xy.mul(BACKDROP_COORD_SCALE).toVar();
    const inv = float(1).div(uIor);
    let accR: Any = float(0);
    let accG: Any = float(0);
    let accB: Any = float(0);
    for (let i = 0; i < samples; i++) {
      const fi = float(i);
      const th = thickEff
        .add(smear.mul(fi.add(nz.y).div(3.0)))
        .mul(REFR_OFFSET_SCALE);
      const etaR = inv; // k = 0
      const etaG = float(1).div(
        uIor.mul(float(1).add(caEff.mul(fi.add(nz.x)).div(3.0))),
      );
      const etaB = float(1).div(
        uIor.mul(float(1).add(caEff.mul(2.0).mul(fi.add(nz.z)).div(3.0))),
      );
      accR = accR.add(backdrop(base.add(refractDir(I, Nj, etaR).xy.mul(th))).x);
      accG = accG.add(backdrop(base.add(refractDir(I, Nj, etaG).xy.mul(th))).y);
      accB = accB.add(backdrop(base.add(refractDir(I, Nj, etaB).xy.mul(th))).z);
    }
    const trans = vec3(accR, accG, accB).div(samples).toVar();

    // --- Round 7 §2 — DARK GLASS BODY: transmitted color × uBodyDarken (the
    // stone reads darker than the backdrop mid-tone — the meteorite read),
    // with per-facet value jitter (§1) + frost density veining (§4). -------
    const fJit = vFacet;
    let col: Any = trans
      .mul(uBodyDarken)
      .mul(fJit.y.mul(FACET_VALUE_JIT).add(1 - FACET_VALUE_JIT / 2));
    if (frost !== null) {
      col = col.mul(frost.mul(FROST_DENSITY_K).add(1.0));
    }

    // --- Round 7 §1 — 2-lobe environment: white-cyan key spec lobe + navy
    // fill. The key lobe uses a PER-FACET tilted normal (baked aFacet) with
    // a lowish exponent → facets catch distinct values and flash
    // independently as the crystal tumbles (the #1 flatness killer). ------
    const key = normalize(vec3(...FACET_KEY_DIR));
    const fill = normalize(vec3(...FACET_FILL_DIR));
    const H = normalize(key.add(V)).toVar();
    const Nf = normalize(N.add(fJit.sub(0.5).mul(uFacetJit))).toVar();
    const spec = pow(max(dot(Nf, H), 0.0), uSpecPow);
    const specAmp = fJit.x.mul(FACET_SPEC_JIT).add(1 - FACET_SPEC_JIT / 2);
    col = col.add(keyC.mul(spec).mul(uSpecGain).mul(specAmp));
    col = col.add(fillC.mul(max(dot(N, fill), 0.0)).mul(uFillGain));

    // --- Round 7 §3 — sparkle glints (FULL tier): hash cells over the
    // stable local position; each live cell owns a micro-normal, its glint
    // gates on view/normal/light alignment (winks as the crystal tumbles)
    // plus a slow time wink; gain >1.0 so single pixels bloom. Sparse by
    // contract: SPARKLE_DENSITY culls ~72% of cells. ----------------------
    if (!lite) {
      const cell = floor(vLocal.mul(SPARKLE_FREQ)).toVar();
      const c1 = hash3(cell.add(vec3(0.31, 0.47, 0.71))).toVar();
      const c2 = hash3(cell.add(vec3(5.2, 1.3, 7.7)));
      const c3 = hash3(cell.add(vec3(9.1, 3.7, 2.3)));
      const micro = normalize(
        N.add(vec3(c1, c2, c3).sub(0.5).mul(SPARKLE_TILT)),
      );
      const glint = pow(max(dot(micro, H), 0.0), float(SPARKLE_POW));
      const gate = smoothstep(
        float(SPARKLE_DENSITY),
        float(SPARKLE_DENSITY + 0.08),
        hash3(cell.add(vec3(2.4, 8.8, 4.4))),
      );
      const wink = smoothstep(
        float(0.35),
        float(0.9),
        sin(uTime.mul(SPARKLE_TWINKLE).add(c1.mul(6.2832)))
          .mul(0.5)
          .add(0.5),
      );
      col = col.add(
        keyC.mul(glint).mul(gate).mul(wink).mul(uSparkleGain),
      );
    }

    // --- Round 7 §2 — BRIGHT DISPERSIVE RIM: per-channel fresnel exponents
    // (blue reaches further inward than red → spectral fringe), whitened
    // toward extreme grazing. RIM_BASE now pushes the grazing rim past 1.0
    // into bloom on its own — sized on Rec709 LUMINANCE post-blend, the
    // metric BloomNode's high-pass actually reads (see RIM_BASE comment);
    // the ignition flash burns far beyond. --------------------------------
    const rim3 = vec3(
      pow(f1, float(FRESNEL_POW * RIM_DISPERSION)),
      fres,
      pow(f1, float(FRESNEL_POW / RIM_DISPERSION)),
    );
    const rimCol = mix(uColCyan, vec3(1.0, 1.0, 1.0), f1.mul(RIM_WHITEN));
    col = col.add(rimCol.mul(rim3).mul(uRimBase.add(uFlash.mul(uRimFlash))));

    // --- Depth fade (igloo fog-mix window, adapted to ALPHA — header) ------
    const dRel = length(vPosView)
      .sub(uCamDist0)
      .div(max(uWorldScale, 1e-4));
    const fade = falloffsmooth(
      dRel,
      FADE_FROM,
      FADE_TO,
      FADE_MARGIN,
      uFadeProgress,
    );
    const alpha = uAlpha
      .mul(fade.mul(FADE_MAX).add(1 - FADE_MAX))
      .mul(uReveal)
      .toVar();
    // depthWrite:true + transparent body (header): fragments that are
    // effectively invisible — the reveal ramp near 0 (reload mid-page), and
    // deep shards settled at the fade FLOOR (uAlpha·(1−FADE_MAX) ≈ 0.046) —
    // must NOT stamp the depth buffer: the SignatureLine renders later with
    // depthTest:true (lineNodeMaterial) and an invisible occluder would
    // punch holes in it (the SequenceSingularity depth-stamp post-mortem).
    // Same alpha-Discard idiom as particleNodeMaterial / neuralFieldCompute;
    // 0.05 sits just above the fade floor (round 7: 0.94·(1−FADE_MAX) ≈
    // 0.047 — still under) so fully-faded shards vanish instead of holding a
    // ghost film + phantom occlusion. Round-7 §6 check: the darker body is
    // carried through the fade window by the >1.0 rim + glints (additive on
    // top of the body term), so the silhouette reads until Discard.
    Discard(alpha.lessThan(0.05));
    return vec4(col, alpha);
  })();

  material.colorNode = (shade as Any).xyz;
  material.opacityNode = (shade as Any).w;
  material.transparent = true;
  // Solid-ish body: keep depth so shards occlude each other correctly; the
  // additive stream layers render later (depthTest:false) and read as
  // current flowing in front — intended composition.
  material.depthWrite = true;
  material.depthTest = true;
  material.toneMapped = false;

  const uniforms: CrystalUniforms = {
    uTime,
    uReveal,
    uFlash,
    uGap,
    uCamDist0,
    uWorldScale,
    uIor,
    uCA,
    uThickness,
    uRough,
    uRimBase,
    uRimFlash,
    uAlpha,
    uFadeProgress,
    uSpotGain,
    uDrift,
    uShardSpin,
    uBodyDarken,
    uSpecPow,
    uSpecGain,
    uFillGain,
    uFacetJit,
    uCAEdge,
    uSparkleGain,
    uFrostAmp,
  };

  return {
    geometry,
    material,
    uniforms,
    shardCentrs,
    shardRands,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
