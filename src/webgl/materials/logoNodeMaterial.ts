/**
 * Dissolving SERSAN logo materials — TSL NodeMaterial twin (WebGPU backend /
 * flag-ON path).
 *
 * FAITHFUL 1:1 port of the GLSL materials in `logoShader.ts`
 * (`createDissolveBodyMaterial`, `createDissolveParticleMaterial`). Mirrors the
 * planet/particle ports: on the WebGPU path (NEXT_PUBLIC_WEBGPU=1) the renderer
 * is `WebGPURenderer`, whose NodeBuilder rejects raw-GLSL `ShaderMaterial` — so
 * the GLSL logo renders as a black silhouette. TSL NodeMaterials compile to
 * WGSL (and to GLSL on a WebGL2 backend).
 *
 * The classic `WebGLRenderer` path (flag OFF) keeps using the GLSL materials;
 * this file is ONLY constructed when `webgpuEnabled()` is true (the only path
 * that ever imports `three/webgpu` — the dual-namespace pitfall).
 *
 * Parity contract: each material reproduces its GLSL counterpart's math exactly.
 * The hash/value-noise/fbm is ported node-for-node, matching the JS source of
 * truth `markThreshold` (geometry/sersanMark.ts) and the GLSL `MARK_NOISE_GLSL`
 * constant-for-constant (3-octave value-noise fbm of object space, p*=2.02,
 * a*=0.5, freq 1.05, normalized by sum(a)). Uniform sets are structurally
 * identical to the GLSL `.uniforms` (same field names, each `{ value }`) so the
 * per-frame writes in HeroLogo drive both material types with one shared path.
 *
 * TSL node names verified against the INSTALLED build via `require('three/tsl')`
 * / `require('three/webgpu')`: MeshBasicNodeMaterial, Color, Vector2, Vector3,
 * AdditiveBlending, DoubleSide (three/webgpu); Fn, uniform, attribute, uv-free
 * positionLocal/normalLocal, transformNormalToView, positionView,
 * modelViewMatrix, cameraProjectionMatrix, sin, abs, pow, mix, smoothstep,
 * clamp, floor, fract, dot, length, max, float, vec3/4, normalize, Discard,
 * varying (three/tsl).
 */
import {
  Color,
  Vector2,
  Vector3,
  MeshBasicNodeMaterial,
  AdditiveBlending,
  DoubleSide,
  type Node,
} from "three/webgpu";
import {
  Fn,
  uniform,
  attribute,
  positionLocal,
  normalLocal,
  transformNormalToView,
  positionView,
  modelViewMatrix,
  cameraProjectionMatrix,
  sin,
  abs,
  pow,
  mix,
  smoothstep,
  clamp,
  floor,
  fract,
  dot,
  length,
  max,
  float,
  vec3,
  vec4,
  normalize,
  Discard,
  varying,
} from "three/tsl";

// === Shared dissolve noise (port of MARK_NOISE_GLSL / markThreshold) ========
// hash31(p) = fract(sin(dot(p,(127.1,311.7,74.7))) * 43758.5453123).
const hash31 = Fn(([p]: [Node<"vec3">]) => {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))).mul(43758.5453123));
});

// vnoise3(p): trilinear value noise with smoothstep weights.
const vnoise3 = Fn(([p]: [Node<"vec3">]) => {
  const i = floor(p).toVar();
  const f = fract(p).toVar();
  // f = f*f*(3 - 2f)
  const w = f.mul(f).mul(float(3.0).sub(f.mul(2.0))).toVar();
  const c000 = hash31(i.add(vec3(0.0, 0.0, 0.0)));
  const c100 = hash31(i.add(vec3(1.0, 0.0, 0.0)));
  const c010 = hash31(i.add(vec3(0.0, 1.0, 0.0)));
  const c110 = hash31(i.add(vec3(1.0, 1.0, 0.0)));
  const c001 = hash31(i.add(vec3(0.0, 0.0, 1.0)));
  const c101 = hash31(i.add(vec3(1.0, 0.0, 1.0)));
  const c011 = hash31(i.add(vec3(0.0, 1.0, 1.0)));
  const c111 = hash31(i.add(vec3(1.0, 1.0, 1.0)));
  const x00 = mix(c000, c100, w.x);
  const x10 = mix(c010, c110, w.x);
  const x01 = mix(c001, c101, w.x);
  const x11 = mix(c011, c111, w.x);
  const y0 = mix(x00, x10, w.y);
  const y1 = mix(x01, x11, w.y);
  return mix(y0, y1, w.z);
});

// markNoise(p): 3 octaves, a=0.5 halving, p*=2.02, freq 1.05, normalized.
const markNoise = Fn(([p0]: [Node<"vec3">]) => {
  const p = p0.mul(1.05).toVar();
  const v = float(0.0).toVar();
  const a = float(0.5).toVar();
  const norm = float(0.0).toVar();
  for (let octave = 0; octave < 3; octave++) {
    v.addAssign(a.mul(vnoise3(p)));
    norm.addAssign(a);
    p.mulAssign(2.02);
    a.mulAssign(0.5);
  }
  return v.div(norm);
});

// === Extruded mark body =====================================================

export type DissolveBodyNodeUniforms = {
  uTime: { value: number };
  uDissolve: { value: number };
  uEdge: { value: number };
  uDeep: { value: Color };
  uBand: { value: Color };
  uCyan: { value: Color };
  uViolet: { value: Color };
  uLightDir: { value: Vector3 };
};

export function createDissolveBodyNodeMaterial(): {
  material: MeshBasicNodeMaterial;
  uniforms: DissolveBodyNodeUniforms;
} {
  const uTime = uniform(0);
  const uDissolve = uniform(0);
  const uEdge = uniform(0.12);
  const uDeep = uniform(new Color("#0a1526"));
  const uBand = uniform(new Color("#1d3a63"));
  const uCyan = uniform(new Color("#3BE1FF"));
  const uViolet = uniform(new Color("#7C5CFF"));
  const uLightDir = uniform(new Vector3(-0.55, 0.42, 0.72).normalize());

  const material = new MeshBasicNodeMaterial();

  // vObj = object-space position (drives the dissolve noise). normalView =
  // view-space normal; vView toward the camera = normalize(-positionView).
  const vObj = varying(positionLocal);

  material.colorNode = Fn(() => {
    // Shared dissolve field; erode below the front (GLSL `if (n<uDissolve) discard`).
    const n = markNoise(vObj).toVar();
    Discard(n.lessThan(uDissolve));

    const nrm = normalize(transformNormalToView(normalLocal));

    // Matte navy body with a faint banded shimmer (object-space xy + time).
    const bands = vnoise3(vec3(vObj.xy.mul(2.4), uTime.mul(0.05)));
    const col = mix(uDeep, uBand, smoothstep(0.4, 0.75, bands)).toVec3().toVar();

    // View-space key lighting + fill (no Light objects).
    const ndl = dot(nrm, normalize(uLightDir));
    const day = smoothstep(-0.35, 0.6, ndl);
    col.mulAssign(float(0.22).add(float(0.95).mul(day)));

    // Cyan fresnel rim.
    const vView = normalize(positionView.negate());
    const fres = pow(float(1.0).sub(abs(dot(nrm, vView))), 3.0);
    col.addAssign(uCyan.rgb.mul(fres).mul(0.35));

    // Glowing erosion edge (HDR, >1.0 → selective bloom).
    const edge = float(1.0).sub(smoothstep(0.0, uEdge, n.sub(uDissolve))).toVar();
    const edgeCol = mix(uCyan, uViolet, smoothstep(0.0, 1.0, n));
    col.addAssign(edgeCol.rgb.mul(edge).mul(edge).mul(2.6));

    return col;
  })();

  // Body is opaque (GLSL alpha = 1.0); default material flags match.

  const uniforms: DissolveBodyNodeUniforms = {
    uTime,
    uDissolve,
    uEdge,
    uDeep,
    uBand,
    uCyan,
    uViolet,
    uLightDir,
  };
  return { material, uniforms };
}

// === Dissolve particles (instanced billboards) ==============================

export type DissolveParticleNodeUniforms = {
  uTime: { value: number };
  uDissolve: { value: number };
  uEdge: { value: number };
  uLift: { value: number };
  uSpread: { value: number };
  uFade: { value: number };
  uPixelRatio: { value: number };
  uViewport: { value: Vector2 };
  uCyan: { value: Color };
  uViolet: { value: Color };
};

export function createDissolveParticleNodeMaterial(): {
  material: MeshBasicNodeMaterial;
  uniforms: DissolveParticleNodeUniforms;
} {
  const uTime = uniform(0);
  const uDissolve = uniform(0);
  const uEdge = uniform(0.12);
  const uLift = uniform(0.45);
  const uSpread = uniform(0.6);
  const uFade = uniform(1);
  const uPixelRatio = uniform(1);
  const uViewport = uniform(new Vector2(1, 1));
  const uCyan = uniform(new Color("#3BE1FF"));
  const uViolet = uniform(new Color("#7C5CFF"));

  const material = new MeshBasicNodeMaterial();

  // Per-instance attributes (resolved by name on the InstancedBufferGeometry,
  // exactly like the GLSL build's `attribute`s).
  const aRest = attribute<"vec3">("aRest");
  const aNormal = attribute<"vec3">("aNormal");
  const aSeed = attribute<"float">("aSeed");
  const aThreshold = attribute<"float">("aThreshold");

  // disp is a vertex-stage quantity used by both stages; declare it as a var set
  // inside vertexNode and read in the fragment via the `vDisp` varying.
  const disp = float(0).toVar();

  // --- Vertex: birth at the front, lift + drift, billboard quad --------------
  material.vertexNode = Fn(() => {
    // disp = smoothstep(aThreshold - uEdge, aThreshold + uEdge, uDissolve).
    disp.assign(
      smoothstep(aThreshold.sub(uEdge), aThreshold.add(uEdge), uDissolve),
    );

    // Lift along the normal + curl-ish value-noise drift, both scaled by disp.
    const p = aRest.toVar();
    p.addAssign(aNormal.mul(uLift.mul(disp)));
    const t = uTime.mul(0.35).add(aSeed.mul(53.1));
    const drift = vec3(
      vnoise3(aRest.mul(1.7).add(vec3(t, 0.0, 0.0))).sub(0.5),
      vnoise3(aRest.mul(1.7).add(vec3(0.0, t, 11.3))).sub(0.5),
      vnoise3(aRest.mul(1.7).add(vec3(7.7, 0.0, t))).sub(0.5),
    );
    p.addAssign(drift.mul(uSpread.mul(disp)));

    // Center → view space (dist = -mv.z), then billboard the unit-quad corner in
    // clip space. Device-pixel size = (1.0 + 2.2*disp) * uPixelRatio * 30 / dist
    // — MUST match the GLSL twin (logoShader.ts): the original 9.0 base rendered
    // sub-pixel quads that rasterized to nothing (invisible cloud).
    const mv = modelViewMatrix.mul(vec4(p, 1.0)).toVar();
    const dist = mv.z.negate();
    const clip = cameraProjectionMatrix.mul(mv).toVar();
    const size = float(1.0)
      .add(float(2.2).mul(disp))
      .mul(uPixelRatio)
      .mul(30.0)
      .div(max(dist, 0.1));
    const corner = positionLocal.xy;
    clip.xy.addAssign(corner.mul(size).div(uViewport).mul(2.0).mul(clip.w));
    return clip;
  })();

  // Varyings to the fragment: the disc corner, the seed, and disp.
  const vQuadUv = varying(positionLocal.xy);
  const vSeed = varying(aSeed);
  const vDisp = varying(disp);

  // --- Fragment: soft disc + HDR color, born/fade by disp --------------------
  const shade = Fn(() => {
    // Only dispersing particles are visible.
    Discard(vDisp.lessThanEqual(0.001));

    const circle = smoothstep(0.5, 0.12, length(vQuadUv));
    Discard(circle.lessThan(0.02));

    // HDR cyan→violet so selective bloom catches the dust. Fade IN as the mote
    // is born; HOLD full brightness while dispersed so the cloud persists —
    // MUST match the GLSL twin (logoShader.ts). The earlier
    // life*(1 - smoothstep(0.7,1.0,vDisp)) faded fully-dispersed motes to zero
    // alpha, blanking the cloud at rest.
    const col = mix(
      uCyan,
      uViolet,
      clamp(vSeed.mul(0.6).add(vDisp.mul(0.4)), 0.0, 1.0),
    );
    const life = smoothstep(0.0, 0.16, vDisp);
    const intensity = float(2.2).add(float(1.4).mul(vDisp));

    const alpha = circle.mul(life).mul(uFade);
    Discard(alpha.lessThan(0.004));

    return vec4(col.toVec3().mul(intensity), alpha);
  })();

  material.colorNode = shade.xyz;
  material.opacityNode = shade.w;

  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = false;
  material.blending = AdditiveBlending;
  material.toneMapped = false;
  material.side = DoubleSide;

  const uniforms: DissolveParticleNodeUniforms = {
    uTime,
    uDissolve,
    uEdge,
    uLift,
    uSpread,
    uFade,
    uPixelRatio,
    uViewport,
    uCyan,
    uViolet,
  };
  return { material, uniforms };
}
