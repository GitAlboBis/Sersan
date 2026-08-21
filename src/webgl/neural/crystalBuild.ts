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
 *     CPU-side by 2-octave fractal noise (~0.25 amplitude), squashed
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
 * #0B1422→#16233a diagonal gradient, noise-modulated like the mined
 * `diagonalGradient`, with two soft cyan bloom spots — so there is NO RT, NO
 * second pass, NO texture bindings. 3 samples (1 on lite), per-channel
 * ior·(1 + k·uCA·(i+noise)/3) with k = 0/1/2, thickness smear
 * uThickness·pow(rough, .33), normal jitter rough²·2·normalize(noiseVec);
 * hash noise (the repo's sin-dot family) stands in for igloo's blue-noise
 * texture. Fresnel rim + cyan emissive rim that exceeds 1.0 on ignition (the
 * selective-bloom contract — only the flashed rim trips the threshold).
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
  CRYSTAL_SQUASH,
  SHARD_RADIUS,
  SHARD_SPREAD_MIN,
  SHARD_SPREAD_MAX,
  FRACTURE_REST_GAP,
  CRYSTAL_IDLE_DRIFT,
  SHARD_SPIN,
  CRYSTAL_IOR,
  CRYSTAL_CA,
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
  FRESNEL_POW,
  RIM_BASE,
  RIM_FLASH_GAIN,
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
    if (!lite) {
      // Second octave — dropped on the lite build (round-5 tier spec).
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
      const rad = SHARD_SPREAD_MIN + r0 * (SHARD_SPREAD_MAX - SHARD_SPREAD_MIN);
      const centr: [number, number, number] = [
        Math.sin(phi) * Math.cos(theta) * rad * CRYSTAL_SQUASH[0],
        Math.cos(phi) * rad * CRYSTAL_SQUASH[1] * 1.2,
        Math.sin(phi) * Math.sin(theta) * rad * CRYSTAL_SQUASH[2],
      ];
      const rand: [number, number, number] = [r0, r1, r2];

      const shard = new IcosahedronGeometry(SHARD_RADIUS, detail);
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
  const uColNavy = uniform(new Color(BACKDROP_NAVY));
  const uColNavy2 = uniform(new Color(BACKDROP_NAVY2));
  const uColCyan = uniform(new Color(BACKDROP_CYAN));

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

  // === Fragment =============================================================
  const shade = Fn(() => {
    const N = normalize(vNrmView).toVar();
    const V = normalize(vPosView.negate()).toVar();
    const I = V.negate().toVar(); // incident, camera → surface

    // Blue-noise stand-in trio (per-fragment, object-stable).
    const nz = vec3(
      hash3(vLocal.mul(41.3)),
      hash3(vLocal.mul(73.7).add(vec3(11.0, 7.0, 3.0))),
      hash3(vLocal.mul(57.1).add(vec3(5.0, 17.0, 9.0))),
    ).toVar();
    // Igloo: distortionNormal = rough²·2·normalize(noise) — refraction-only
    // jitter (frosted grain); shading keeps the clean facet normal.
    const Nj = normalize(
      N.add(
        normalize(nz.sub(0.5).add(vec3(1e-4, 2e-4, 3e-4))).mul(
          uRough.mul(uRough).mul(2.0),
        ),
      ),
    ).toVar();

    // --- Dispersion ladder (igloo §2, 3 samples, k = 0/1/2 per channel) ----
    const smear = uThickness.mul(pow(uRough, 0.33)).toVar();
    const base = vLocal.xy.mul(BACKDROP_COORD_SCALE).toVar();
    const inv = float(1).div(uIor);
    let accR: Any = float(0);
    let accG: Any = float(0);
    let accB: Any = float(0);
    for (let i = 0; i < samples; i++) {
      const fi = float(i);
      const th = uThickness
        .add(smear.mul(fi.add(nz.y).div(3.0)))
        .mul(REFR_OFFSET_SCALE);
      const etaR = inv; // k = 0
      const etaG = float(1).div(
        uIor.mul(float(1).add(uCA.mul(fi.add(nz.x)).div(3.0))),
      );
      const etaB = float(1).div(
        uIor.mul(float(1).add(uCA.mul(2.0).mul(fi.add(nz.z)).div(3.0))),
      );
      accR = accR.add(backdrop(base.add(refractDir(I, Nj, etaR).xy.mul(th))).x);
      accG = accG.add(backdrop(base.add(refractDir(I, Nj, etaG).xy.mul(th))).y);
      accB = accB.add(backdrop(base.add(refractDir(I, Nj, etaB).xy.mul(th))).z);
    }
    const trans = vec3(accR, accG, accB).div(samples).toVar();

    // --- Facet key response + fresnel rim ----------------------------------
    const key = normalize(vec3(...FACET_KEY_DIR));
    const facet = dot(N, key).mul(0.5).add(0.5);
    const fres = pow(
      clamp(float(1).sub(dot(N, V)), float(0), float(1)),
      float(FRESNEL_POW),
    ).toVar();
    let col: Any = trans.mul(facet.mul(0.5).add(0.75));
    // Grazing-angle cool reflection tint (ice, sub-bloom).
    col = col.add(mix(uColNavy2, uColCyan, 0.35).mul(fres).mul(0.25));
    // Cyan emissive rim — >1.0 only while the ignition flash burns
    // (selective-bloom contract: threshold ≈ 1.0 catches the rim alone).
    col = col.add(uColCyan.mul(fres).mul(uRimBase.add(uFlash.mul(uRimFlash))));

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
    // 0.05 sits just above the fade floor so fully-faded shards vanish
    // instead of holding a ghost film + phantom occlusion.
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
