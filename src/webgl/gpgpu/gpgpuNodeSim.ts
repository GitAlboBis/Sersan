/**
 * GPGPU hero simulations — TSL compute + storage buffers (true-WebGPU backend)
 * plus the stateless analytic fallback render.
 *
 * ENGINE (post-C3 consolidation, restyle step 4, 2026-06-13)
 * ----------------------------------------------------------
 * Particle state (position / velocity / homes / life) lives in GPU storage
 * buffers (`instancedArray`, seeded straight from CPU Float32Arrays), advanced
 * by compute kernels (`Fn(...)().compute(count)`) dispatched with
 * `gl.compute(node)` once per frame from the caller's useFrame.
 *
 * RENDER-STAGE READS — TWO FORMS, TWO SEPARATE DEVICE BUDGETS.
 *   `.toAttribute()` binds the buffer as a per-instance VERTEX BUFFER. Works on
 *   every backend and in every stage; sampler-free (no texture round-trip, no
 *   orientation/LOD pitfalls), which is what retired the FBO rigs for good.
 *   Costs one of WebGPU's 8 `maxVertexBuffers` slots. Use it for buffers the
 *   COMPUTE KERNEL WRITES, and for anything that must survive the WebGL2
 *   fallback.
 *   `.element(instanceIndex)` binds the buffer as a read-only STORAGE buffer in
 *   the vertex stage instead (a different, separate 8-slot budget). True-WebGPU
 *   only (`.element(i)` no-ops under the WebGL2 emulation, three #31221) and
 *   vertex/compute stage only (`instanceIndex` degrades to a varying in the
 *   fragment stage). Use it for read-only per-instance payload on WebGPU-gated
 *   paths — this is what keeps the founders portrait's colour/ink targets off
 *   the vertex-buffer budget. See the RENDER BINDING BUDGET block in
 *   createTextMorphComputeBuild: overrunning either budget makes
 *   CreateRenderPipeline fail and the mesh silently never draws.
 * WIDTH CAVEAT: `.toAttribute()` is NOT a drop-in for `.element(i).xyz`. A
 * `"vec3"` storage buffer is padded to 16 bytes in the WebGPU storage layout
 * (WebGPUAttributeUtils rewrites itemSize 3 → 4), so `.toAttribute()` yields a
 * 4-COMPONENT node — every vec3-buffer `.toAttribute()` read MUST trail `.xyz`
 * (feeding a bare 4-comp into `vec4(p, 1.0)` / `length()` / a vec3 `.add()`
 * throws "Length of parameters exceeds maximum" or truncates). Scalar `"float"`
 * buffers are unpadded — no `.xyz` on those. `.element(i)` is unaffected by any
 * of this: it yields the DECLARED type (a `"vec3"` buffer reads as a real
 * vec3, a `"vec4"` buffer as a real vec4), so re-derive swizzles when you
 * switch a read between the two forms rather than carrying them across.
 *
 * RETIRED in C3: createGpgpuNodeSim (the TSL FBO ping-pong rig — its RT
 * round-trip scrambled on the WebGPU backend and it only served the parked
 * `particles` debug mode), createGpgpuComputeNodeSim (the billboard compute
 * sim behind `particles` / `particles-2layer`), and their GLSL twins
 * (gpgpuSim.ts deleted; createGpgpuRenderMaterial removed from
 * gpgpuRenderShader.ts). Survivors:
 *   - createSporeComputeNodeBuild   — the SHIPPING spores hero (HeroLogo)
 *   - createTextMorphComputeBuild   — the hero text intro (HeroTextParticles)
 *   - createStaticParticleNodeBuild — the analytic non-WebGPU fallback
 * The two compute kernels integrate through ONE shared force model
 * (`unifiedForceStep` below); the GLSL static twin stays in
 * gpgpuRenderShader.ts for the flag-OFF bundle.
 *
 * ALL `three/webgpu` + `three/tsl` symbols are passed IN by the caller (which
 * lazy-imports the namespaces, exactly like PostFXNodes feeds PointerFlowmap),
 * so this module never lands in the OFF bundle. Loosely typed for the same
 * reason PointerFlowmap is: the real node types are vast and generic.
 *
 * BACKEND CONTRACT — the compute kernels are only valid on the TRUE WebGPU
 * sub-backend (storage `.element()` indexing no-ops / misindexes under the
 * WebGL2 transform-feedback emulation, three #31221). Callers gate on
 *   `backend.isWebGLBackend !== true && typeof gl.compute === "function"`
 * and route every other backend to the static builds.
 */
import type { GpgpuConfig, GpgpuTickParams, GpgpuSimRig } from "./gpgpuConfig";

// --- Loose structural types for the lazily-imported namespaces --------------
type AnyNode = {
  add: (n: AnyNode | number) => AnyNode;
  sub: (n: AnyNode | number) => AnyNode;
  mul: (n: AnyNode | number) => AnyNode;
  div: (n: AnyNode | number) => AnyNode;
  negate: () => AnyNode;
  normalize: () => AnyNode;
  toVar: () => AnyNode;
  addAssign: (n: AnyNode | number) => void;
  mulAssign: (n: AnyNode | number) => void;
  subAssign: (n: AnyNode | number) => void;
  assign: (n: AnyNode | number) => void;
  lessThan: (n: AnyNode | number) => AnyNode;
  greaterThan: (n: AnyNode | number) => AnyNode;
  /** Storage-buffer element accessor (read/write handle) by index node.
   * READ/WRITE in compute. Read-only but LEGAL in the vertex stage on the true
   * WebGPU backend (WGSLNodeBuilder emits `var<storage, read>` and
   * getNodeAccess forces READ_ONLY outside compute) — costs a storage binding,
   * not a vertex-buffer slot. NOT usable on the WebGL fallback (three #31221),
   * and NOT in the fragment stage (`instanceIndex` degrades to a varying
   * there). Unlike `.toAttribute()`, this yields the DECLARED type: a `"vec3"`
   * buffer reads as a true vec3, so NO trailing `.xyz`. */
  element: (index: AnyNode) => AnyNode & { value: unknown };
  /** Expose a storage/instanced buffer as a per-instance VERTEX BUFFER. Works
   * on every backend and in every stage, but spends one of WebGPU's 8
   * `maxVertexBuffers` slots — see the RENDER BINDING BUDGET block in
   * createTextMorphComputeBuild before adding another. */
  toAttribute: () => AnyNode;
  /** Build a compute node from a kernel Fn result: `Fn(...)().compute(count)`. */
  compute: (count: number) => AnyNode;
  x: AnyNode;
  y: AnyNode;
  z: AnyNode;
  w: AnyNode;
  xy: AnyNode;
  xyz: AnyNode;
  rgb: AnyNode;
  toVec3: () => AnyNode;
};
type UniformNode<T> = AnyNode & { value: T };

interface Vec3Like {
  x: number;
  y: number;
  z: number;
  copy: (v: Vec3Like) => Vec3Like;
  set: (x: number, y: number, z: number) => Vec3Like;
}
interface Vec2Like {
  set: (x: number, y: number) => Vec2Like;
}
interface ColorLike {
  fromArray: (a: number[]) => ColorLike;
}
interface NodeMaterialLike {
  colorNode: unknown;
  opacityNode: unknown;
  vertexNode: unknown;
  /** Object-space position override (standard pipeline still applies MVP) —
   * the per-instance translate+scale hook for the spore sphere render. */
  positionNode: unknown;
  transparent: boolean;
  depthTest: boolean;
  depthWrite: boolean;
  blending: number;
  toneMapped: boolean;
  side: number;
  dispose: () => void;
}
interface RendererLike {
  /** Dispatch a TSL compute node (synchronous once the backend is initialised). */
  compute: (node: unknown) => void;
}

export interface WebGPUSymbolsGpgpu {
  InstancedBufferGeometry: new () => InstancedGeoLike;
  BufferAttribute: new (arr: ArrayLike<number>, itemSize: number) => unknown;
  InstancedBufferAttribute: new (arr: ArrayLike<number>, itemSize: number) => unknown;
  MeshBasicNodeMaterial: new () => NodeMaterialLike;
  /** Low-poly icosphere — the spore instance geometry (detail 1 = 80 tris).
   * PolyhedronGeometry output is NON-indexed (getIndex() → null). */
  IcosahedronGeometry: new (
    radius: number,
    detail: number,
  ) => { getAttribute: (name: string) => unknown; dispose: () => void };
  Color: new () => ColorLike;
  Vector2: new (x?: number, y?: number) => Vec2Like;
  Vector3: new (x?: number, y?: number, z?: number) => Vec3Like;
  AdditiveBlending: number;
  NormalBlending: number;
  DoubleSide: number;
}
interface InstancedGeoLike {
  setAttribute: (name: string, attr: unknown) => void;
  setIndex: (attr: unknown) => void;
  instanceCount: number;
  dispose: () => void;
}

export interface TslSymbolsGpgpu {
  uniform: (v: unknown) => UniformNode<unknown>;
  attribute: (name: string) => AnyNode;
  /** Allocate a GPU storage buffer (seed by passing a TypedArray as `count`). */
  instancedArray: (count: number | Float32Array, type: string) => AnyNode & { value: unknown };
  /** Per-invocation / per-instance index node (compute thread + vertex instance). */
  instanceIndex: AnyNode;
  positionLocal: AnyNode;
  /** View-space normal (normalMatrix × normalLocal) — correct under the spore
   * positionNode (per-instance translate + UNIFORM scale leave normals alone). */
  normalView: AnyNode;
  modelViewMatrix: AnyNode;
  cameraProjectionMatrix: AnyNode;
  Fn: (fn: () => AnyNode | void) => () => AnyNode;
  vec2: (x: AnyNode | number, y?: AnyNode | number) => AnyNode;
  vec3: (x: AnyNode | number, y?: AnyNode | number, z?: AnyNode | number) => AnyNode;
  vec4: (
    x: AnyNode | number,
    y?: AnyNode | number,
    z?: AnyNode | number,
    w?: AnyNode | number,
  ) => AnyNode;
  float: (v: number) => AnyNode;
  length: (n: AnyNode) => AnyNode;
  max: (a: AnyNode | number, b: AnyNode | number) => AnyNode;
  min: (a: AnyNode | number, b: AnyNode | number) => AnyNode;
  clamp: (n: AnyNode, a: number, b: number) => AnyNode;
  exp: (n: AnyNode) => AnyNode;
  sin: (n: AnyNode) => AnyNode;
  fract: (n: AnyNode) => AnyNode;
  dot: (a: AnyNode, b: AnyNode) => AnyNode;
  cross: (a: AnyNode, b: AnyNode) => AnyNode;
  mix: (a: AnyNode, b: AnyNode, t: AnyNode | number) => AnyNode;
  smoothstep: (a: AnyNode | number, b: AnyNode | number, x: AnyNode) => AnyNode;
  Discard: (cond: AnyNode) => void;
  varying: (n: AnyNode) => AnyNode;
  pow: (a: AnyNode, b: AnyNode | number) => AnyNode;
  abs: (n: AnyNode) => AnyNode;
  /** Deterministic per-index hash → [0,1) (TSL built-in). */
  hash: (n: AnyNode) => AnyNode;
  /** TSL stack-based branching: If(cond, fn).ElseIf(cond, fn).Else(fn). */
  If: (cond: AnyNode, fn: () => void) => TslIfChain;
}

/** Return shape of TSL `If` — chainable ElseIf/Else. */
export interface TslIfChain {
  ElseIf: (cond: AnyNode, fn: () => void) => TslIfChain;
  Else: (fn: () => void) => void;
}

const QUAD_CORNERS = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];

// ===========================================================================
// UNIFIED FORCE MODEL — the single integration code path shared by BOTH
// compute kernels (spores + text morph). C3 consolidation, 2026-06-13.
// ===========================================================================
// Model (the determinism contract from the 06-13 research): pos = anchor +
// offset. `anchor` is ALWAYS analytic — a pure function of the system's
// uniforms (the mark's home field; the text morph's staggered A→B→C→D blend +
// entry wave) plus per-particle hashes — so it is deterministic for ANY scrub
// state in either direction. The integrated state only ever RELAXES the
// implicit offset (pos − anchor) toward 0: the spring's unique fixed point is
// the anchor, exponential damping bounds the relaxation time, and the
// velocity clamp bounds the excursion. A hard "offset = 0" reset (respawn at
// home, rebuild-seeding at home) is therefore always legal.
//
// The attractor term is the force shape of the official r184
// `webgpu_tsl_compute_attractors_particles` example, adapted to our bounded
// cursor interaction:
//   - RADIAL: the approved push² falloff `(max(0, R − d)/R)² · PUSH`,
//     pointing AWAY from the attractor (negative-mass attractor = repulsion).
//   - ORBIT (new): the example's spin term `axis × direction`, scaled by the
//     SAME strength family (PUSH × orbit-ratio) and its own falloff exponent,
//     so displaced particles swirl around the cursor axis while the radial
//     term throws them out.
// Both terms perturb only the offset and are exactly zero with the cursor
// parked at 1e9 — the resting crust and every morph rest state are unchanged
// by construction.

export interface UnifiedAttractorOpts {
  /** Attractor position (model space). Park at ~1e9 to disable. */
  position: AnyNode;
  /** Radial strength — POSITIVE pushes AWAY (our cursor repulsion). */
  push: AnyNode;
  /** Influence radius (model space). */
  radius: AnyNode;
  /** Orbit (spin) strength as a RATIO of `push`. 0 = radial only. */
  orbit: AnyNode;
  /** Falloff exponent for the orbit term (radial keeps its push² shape). */
  orbitFalloff: AnyNode;
  /** Spin axis (unit, model space) — `cross(axis, dir)` is the swirl. */
  axis: AnyNode;
}

export interface UnifiedForceStepOpts {
  /** Current position (storage element handle; advanced by the CALLER after
   * the step so system-specific state machines stay in control). */
  pos: AnyNode;
  /** Velocity WORKING VAR (`velH.toVar()`); assigned in place. */
  vel: AnyNode;
  /** The analytic anchor target — a pure function of uniforms (see above). */
  anchor: AnyNode;
  dt: AnyNode;
  spring: AnyNode;
  damping: AnyNode;
  maxSpeed: AnyNode;
  attractor?: UnifiedAttractorOpts;
  /** System-specific extra acceleration (turbulence, scroll burst), summed
   * into the accumulator before integration. */
  extraAcc?: (
    acc: AnyNode,
    ctx: { toAnchor: AnyNode; attractorFalloff: AnyNode | null },
  ) => void;
}

/**
 * Emit the shared force/integration statements into the calling kernel:
 * anchor spring + (optional) attractor radial/orbit + caller extras, then
 * `vel += acc·dt; vel *= exp(−damping·dt); |vel| ≤ maxSpeed`. Returns the
 * PRE-CLAMP speed (the spores' DDD kill curve keys off it, exactly as the
 * previous inline integration did) and the anchor delta.
 */
export function unifiedForceStep(
  tsl: TslSymbolsGpgpu,
  opts: UnifiedForceStepOpts,
): { speed: AnyNode; toAnchor: AnyNode } {
  const { float, length, max, min, exp, pow, cross } = tsl;

  // (a) elastic spring toward the analytic anchor — relaxes offset → 0.
  const toAnchor = opts.anchor.sub(opts.pos).toVar();
  const acc = toAnchor.mul(opts.spring).toVar();

  // (b) cursor attractor: radial push² repulsion + orbital spin term.
  let attractorFalloff: AnyNode | null = null;
  if (opts.attractor) {
    const a = opts.attractor;
    const fromA = opts.pos.sub(a.position).toVar();
    const d = length(fromA);
    const f = max(float(0), a.radius.sub(d)).div(a.radius).toVar();
    attractorFalloff = f;
    // Radial — the approved shape, unchanged: `(max(0,R−d)/R)² · PUSH`.
    acc.addAssign(fromA.add(1e-5).normalize().mul(f.mul(f)).mul(a.push));
    // Orbit — attractors-example spin: axis × (direction TOWARD the cursor),
    // strength = PUSH × ratio, gated by its own falloff exponent. The 1e-6
    // bias dodges pow(0, e) driver quirks; at rest it contributes ~1e-12.
    const dirIn = fromA.add(1e-5).normalize().negate();
    acc.addAssign(
      cross(a.axis, dirIn)
        .mul(pow(f.add(1e-6), a.orbitFalloff))
        .mul(a.push)
        .mul(a.orbit),
    );
  }

  // (c) system-specific extras (turbulence, scroll-out burst).
  opts.extraAcc?.(acc, { toAnchor, attractorFalloff });

  // (d) integrate + exponential damping + max-speed clamp (reference order).
  opts.vel.addAssign(acc.mul(opts.dt));
  opts.vel.mulAssign(exp(opts.damping.negate().mul(opts.dt)));
  const sp = length(opts.vel).toVar();
  opts.vel.assign(opts.vel.mul(min(sp, opts.maxSpeed).div(max(sp, 1e-4))));

  return { speed: sp, toAnchor };
}

// ===========================================================================
// SPORE render — compute sim + instanced SHADED icospheres (TSL / WebGPU only)
// ===========================================================================
// The DDD-correct primitive (production-bundle teardown, see task 06-08's
// research/ddd-bundle-teardown-spore-render.md): each particle is a small LIT
// OPAQUE sphere mesh — lambert + rim + per-spore value variation (fake packed
// AO) — depth-tested so front balls occlude back balls. NOT a feathered
// additive disc: additive/feathered can only brighten, never occlude or show a
// shadow side, so a dense cluster reads as fog instead of a packed-ball crust.
//
// The sim is the unified anchor-spring kernel above + the DDD LIFE state
// machine; the render places an icosphere per instance through the STANDARD
// pipeline (`positionNode = positionLocal·scale + positionBuffer.toAttribute()`
// — the three r184 webgpu_compute_particles_snow idiom). `.toAttribute()`
// (not `.element()`) in the render stage per three #31221. Spore radius is in
// MODEL space (DDD: diameter ≈ letterHeight/47) so the packing survives
// zoom/scale.
//
// GRAVITATIONAL FLYBY → ACCRETION (owner 2026-08-07, v2 the same day): a
// second, ATTRACTIVE interaction (uHole / uHoleStrength / uHolePull /
// uHoleRadius + the v2 uHoleCapture / uHoleKillRadius) rides the same
// unified integration beside the cursor repulsion. Far field: a subtle
// lean + hover-style glow. Near approach: spores inside the capture band
// are boosted into a runaway fall, flash via the infall term in the
// render, die at the horizon like the burst kill, and respawn at home on
// the standard LIFE_REGROW cycle. UNIFORMS ONLY, by design: storage
// buffers are a hard device budget (the text-morph compute kernel is already
// at its 8-of-8 wall, and every render-stage buffer costs a vertex-buffer or
// storage-binding slot — see the RENDER BINDING BUDGET block below), while
// uniforms live in a SEPARATE, roomy budget. Nothing bufferlike was added.
export interface SporeNodeBuild {
  rig: GpgpuSimRig;
  geometry: InstancedGeoLike;
  material: NodeMaterialLike;
  /** Scroll fade 0..1 — multiplies the (opaque) color toward the dark bg. */
  uFade: UniformNode<number>;
  /** Base sphere radius in MODEL space (live-tunable; variance on top). */
  uSporeRadius: UniformNode<number>;
  /** HDR emission strength on fast spores (selective-bloom driver). */
  uEmissive: UniformNode<number>;
  /** Cursor-attractor ORBIT strength as a ratio of the layer's PUSH
   * (live-tunable via fxStore.sporeAttractor; 0 = radial repulsion only). */
  uOrbit: UniformNode<number>;
  /** Orbit falloff exponent (live via fxStore.sporeOrbitFalloff). */
  uOrbitFalloff: UniformNode<number>;
  /**
   * Scroll-out dissolve 0..1 (fed from the hero scroll progress): radial push
   * from the MODEL CENTER + staggered kill, with respawn parked until it
   * clears — the mark scatters into space as it scrolls away and reassembles
   * when scrolled back.
   */
  uBurst: UniformNode<number>;
  /** Live regrow-rate multiplier (1 = preset rate). HeroLogo crawls it during
   * the intro materialise for a much slower first-reveal bloom, then restores
   * it to 1 so the hover / scroll-back regrow keep the preset's own rate. */
  uRegrowScale: UniformNode<number>;
  /** Flyby attractor center in MODEL space (park at 1e9 = off). Written per
   * frame by HeroLogo from holeField (HomeSingularity), projected onto the
   * mark's content plane along the camera ray and converted world→model. */
  uHole: UniformNode<Vec3Like>;
  /** Normalized flyby envelope 0..1 (eclipse fade × orbit proximity, damped
   * upstream). Gates BOTH the attraction force and the hover-style cyan
   * glow. CRUST-role layers only — HeroLogo writes 0 on the core, the same
   * selectivity as the auto-burst. */
  uHoleStrength: UniformNode<number>;
  /** Attraction gain — model-space acceleration at full falloff × envelope
   * (fx.holePullCrust). Equilibrium lean ≈ pull/SPRING model units. */
  uHolePull: UniformNode<number>;
  /** Flyby falloff radius in MODEL space (fx.holePullRadius world units ÷
   * the mark group's world scale, written per frame by HeroLogo). */
  uHoleRadius: UniformNode<number>;
  /** ACCRETION capture boost (fx.holeCapture): inside the capture band
   * (d < radius·0.6) the attraction is multiplied by
   * 1 + capture·(1−d/band)²·gate — quadratic runaway so gravity WINS against
   * the home spring and captured spores detach and travel to the hole.
   * 0 = pull-only lean (the v1 behavior). */
  uHoleCapture: UniformNode<number>;
  /** ACCRETION horizon radius in MODEL space (fx.holeKillRadius world units
   * ÷ group scale, floored > 0 by HeroLogo — 0 would make the kill
   * smoothstep's edges equal → NaN into the life buffer). Spores crossing it
   * die burst-style and respawn at home on the LIFE_REGROW cycle. */
  uHoleKillRadius: UniformNode<number>;
  dispose: () => void;
}

/** Spore-look constants consumed by the render (subset of SporeRenderConfig —
 * kept structural so this module needs no import from gpgpuConfig). */
export interface SporeRenderParams {
  VAR_MIN: number;
  VAR_MAX: number;
  ALBEDO: [number, number, number];
  ALBEDO_MUL: number;
  EMISSION: [number, number, number];
  EMISSIVE: number;
  RIM: number;
  SPEED_COLOR_K: number;
  LIFE_DECAY: number;
  LIFE_HEAL: number;
  LIFE_DIE: number;
  LIFE_REGROW: number;
  BASE_EMISSION: number;
}

export function createSporeComputeNodeBuild(
  gl: RendererLike,
  webgpu: WebGPUSymbolsGpgpu,
  tsl: TslSymbolsGpgpu,
  homeRGBA: Float32Array,
  aRef: Float32Array,
  size: number,
  config: GpgpuConfig,
  spore: SporeRenderParams,
  baseRadius: number,
): SporeNodeBuild {
  const {
    InstancedBufferGeometry,
    InstancedBufferAttribute,
    IcosahedronGeometry,
    MeshBasicNodeMaterial,
    Color,
    Vector3,
    NormalBlending,
  } = webgpu;
  const {
    uniform,
    attribute,
    positionLocal,
    normalView,
    Fn,
    vec2,
    vec3,
    vec4,
    float,
    length,
    max,
    min,
    clamp,
    exp,
    sin,
    fract,
    dot,
    mix,
    smoothstep,
    pow,
    abs,
    hash,
    If,
    instancedArray,
    instanceIndex,
  } = tsl;

  const count = size * size;

  // --- Sim: storage-buffer anchor-spring kernel + the DDD LIFE machine ------
  const aHome = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    aHome[i * 3] = homeRGBA[i * 4];
    aHome[i * 3 + 1] = homeRGBA[i * 4 + 1];
    aHome[i * 3 + 2] = homeRGBA[i * 4 + 2];
  }
  const positionBuffer = instancedArray(aHome.slice(), "vec3");
  const velocityBuffer = instancedArray(count, "vec3"); // zero-initialised
  const homeBuffer = instancedArray(aHome.slice(), "vec3");
  // Per-spore life, seeded ALIVE (1). States — see SporeRenderConfig docs:
  // (0,1] alive/pinned · (−1,0] dying ghost flight · ≤−1 respawn · (1,2] regrow.
  const lifeBuffer = instancedArray(new Float32Array(count).fill(1), "float");

  const uMouse = uniform(new Vector3(1e9, 1e9, 1e9)) as UniformNode<Vec3Like>;
  const uDelta = uniform(1 / 60) as UniformNode<number>;
  const uTime = uniform(0) as UniformNode<number>;
  const uSpring = uniform(config.SPRING) as UniformNode<number>;
  const uPush = uniform(config.PUSH) as UniformNode<number>;
  const uRadiusN = uniform(config.RADIUS) as UniformNode<number>;
  const uDamping = uniform(config.DAMPING) as UniformNode<number>;
  const uTurbBaseN = uniform(config.TURB_BASE) as UniformNode<number>;
  // Cursor-attractor ORBIT term (C3 attractors port): swirl strength as a
  // ratio of PUSH (the pinned core's whisper-push keeps a whisper-orbit) and
  // its falloff exponent. Live-driven from fxStore by HeroLogo per frame.
  const uOrbit = uniform(config.ORBIT) as UniformNode<number>;
  const uOrbitFalloff = uniform(config.ORBIT_FALLOFF) as UniformNode<number>;
  // GRAVITATIONAL FLYBY attractor (owner 2026-08-07) — see the kernel and
  // glow notes below. Written per frame by HeroLogo (crust-role layers only;
  // the core gets envelope 0). UNIFORMS ONLY: no storage buffers, no
  // attribute slots — a separate device budget from both binding tables.
  const uHole = uniform(new Vector3(1e9, 1e9, 1e9)) as UniformNode<Vec3Like>;
  const uHoleStrength = uniform(0) as UniformNode<number>;
  const uHolePull = uniform(0) as UniformNode<number>;
  // Default nods to the brief's "~1.5× the mouse radius"; the LIVE value is
  // driven each frame from fx.holePullRadius (world units → model units in
  // HeroLogo — the projected hole center sits several units below the mark,
  // so the shipping well is much wider; see the fxStore knob doc).
  const uHoleRadius = uniform(config.RADIUS * 1.5) as UniformNode<number>;
  // ACCRETION extension (owner 2026-08-07 v2 — capture + horizon kill; the
  // pull-only lean was rejected: "vorrei che le spore andassero verso il buco
  // nero ed esplodessero"). Still uniforms only. Capture defaults DEAD (0 =
  // no boost); the kill radius default is a safe positive placeholder —
  // NEVER 0 (equal smoothstep edges divide by zero → NaN would eat the life
  // buffer). HeroLogo drives both per frame, kill radius floored there too.
  const uHoleCapture = uniform(0) as UniformNode<number>;
  const uHoleKillRadius = uniform(0.5) as UniformNode<number>;
  const holeN = uHole as unknown as AnyNode;
  const holeStrengthN = uHoleStrength as unknown as AnyNode;
  const holePullN = uHolePull as unknown as AnyNode;
  const holeRadiusN = uHoleRadius as unknown as AnyNode;
  const holeCaptureN = uHoleCapture as unknown as AnyNode;
  const holeKillRadiusN = uHoleKillRadius as unknown as AnyNode;
  const SPRING = uSpring as unknown as AnyNode;
  const PUSH = uPush as unknown as AnyNode;
  const RADIUS = uRadiusN as unknown as AnyNode;
  const DAMPING = uDamping as unknown as AnyNode;
  const TURB_BASE = uTurbBaseN as unknown as AnyNode;
  const ORBIT = uOrbit as unknown as AnyNode;
  const ORBIT_FALLOFF = uOrbitFalloff as unknown as AnyNode;
  const TURB_MOVE = float(config.TURB_MOVE);
  const TURB_DISP_K = float(config.TURB_DISP_K);
  const MAX_SPEED = float(config.MAX_SPEED);
  const dtN = uDelta as unknown as AnyNode;
  const timeN = uTime as unknown as AnyNode;
  const mouseN = uMouse as unknown as AnyNode;

  const LIFE_DECAY = float(spore.LIFE_DECAY);
  const LIFE_HEAL = float(spore.LIFE_HEAL);
  const LIFE_DIE = float(spore.LIFE_DIE);
  // Live regrow-rate multiplier (default 1 = preset rate): HeroLogo crawls it
  // during the intro materialise (slow first-reveal bloom) and restores it to 1
  // after, so hover / scroll-back regrow keep the preset's faster rate.
  const uRegrowScale = uniform(1) as UniformNode<number>;
  const LIFE_REGROW = float(spore.LIFE_REGROW).mul(
    uRegrowScale as unknown as AnyNode,
  );

  // Scroll-out dissolve (0..1, fed per frame from the hero scroll progress).
  const uBurst = uniform(0) as UniformNode<number>;
  const burstN = uBurst as unknown as AnyNode;

  // DDD life machine on top of the unified spring/attractor sim: the cursor
  // pushes a spore → its speed crosses the kill curve → it DIES mid-flight
  // (ghost drift, the render shrinks it to nothing) → respawns AT HOME and
  // regrows in place. "Spores disappear and regrow on top" — not just
  // displaced and back.
  const simulate = Fn(() => {
    const pos = positionBuffer.element(instanceIndex);
    const velH = velocityBuffer.element(instanceIndex);
    const home = homeBuffer.element(instanceIndex);
    const lifeH = lifeBuffer.element(instanceIndex);

    If(lifeH.greaterThan(1.0), () => {
      // REGROW (1,2] — pinned at home, invisible→grown via the render envelope.
      pos.assign(home);
      velH.assign(vec3(0.0, 0.0, 0.0));
      lifeH.subAssign(dtN.mul(LIFE_REGROW));
    }).ElseIf(lifeH.greaterThan(0.0), () => {
      // ALIVE (0,1] — the unified anchor-spring + cursor attractor/orbit
      // integration, plus the spore-specific extras (displacement-gated
      // turbulence + the scroll-out burst).
      const vel = velH.toVar();
      const rndI = hash(instanceIndex).toVar();
      // ACCRETION gate (owner 2026-08-07 v2): the capture/kill regime only
      // engages once the flyby envelope clears a floor — smoothstep 0.15→0.35
      // so it fades in/out with the orbit instead of switching. Shared by the
      // capture boost (extraAcc) and the horizon kill (decay) below; also the
      // structural core-safety: HeroLogo writes envelope 0 on non-crust
      // layers, so gate = 0 there and neither term can ever fire.
      const capGate = smoothstep(0.15, 0.35, holeStrengthN).toVar();
      // ACCRETION geometry — hoisted OUT of extraAcc (BUG-2 fix, owner
      // live-review 2026-08-07) so the post-step velocity RE-AIM below shares
      // the exact same LIVE-hole direction the force uses. `pos` is only
      // advanced after the step, so these read this frame's state; uHole is
      // re-written by HeroLogo every frame from the freshly projected
      // holeField, so dirHole tracks the hole as it orbits.
      const toHole = holeN.sub(pos).toVar();
      const dHole = length(toHole).toVar();
      const dirHole = toHole.add(1e-5).normalize().toVar();
      const fHole = smoothstep(holeRadiusN, 0.0, dHole).mul(holeStrengthN);
      const capT = clamp(
        float(1.0).sub(dHole.div(holeRadiusN.mul(0.6))),
        0.0,
        1.0,
      ).toVar();
      const step = unifiedForceStep(tsl, {
        pos,
        vel,
        anchor: home,
        dt: dtN,
        spring: SPRING,
        damping: DAMPING,
        maxSpeed: MAX_SPEED,
        attractor: {
          position: mouseN,
          push: PUSH,
          radius: RADIUS,
          orbit: ORBIT,
          orbitFalloff: ORBIT_FALLOFF,
          // The mark is front-facing (+Z toward the camera) and only
          // parallax-tilts a few degrees — the view axis is the natural spin
          // axis, so displaced spores swirl in the mark's plane.
          axis: vec3(0.0, 0.0, 1.0),
        },
        extraAcc: (acc, { toAnchor }) => {
          // Turbulence — sin-based per-axis shimmer GATED HARD by
          // displacement so particles glued to the surface (disp≈0) get
          // ~none and stay crisp; only lifted/hovered particles shimmer.
          const disp = clamp(length(toAnchor).mul(TURB_DISP_K), 0.0, 1.0).toVar();
          const turb = vec3(
            sin(pos.y.mul(6.0).add(timeN.mul(1.3))),
            sin(pos.z.mul(6.0).add(timeN.mul(1.7))),
            sin(pos.x.mul(6.0).add(timeN.mul(1.1))),
          );
          acc.addAssign(turb.mul(TURB_BASE.add(TURB_MOVE.mul(disp))).mul(disp));

          // SCROLL-OUT burst: radial push from the model center (the mark is
          // geometry.center()ed, so the origin IS the logo center), staggered
          // per spore so the dissolve ripples instead of popping uniformly.
          acc.addAssign(
            pos
              .add(1e-5)
              .normalize()
              .mul(burstN.mul(7.0).mul(float(0.6).add(rndI.mul(0.8)))),
          );

          // GRAVITATIONAL ACCRETION (owner 2026-08-07 v2 — supersedes the
          // pull-only lean: "vorrei che le spore andassero verso il buco
          // nero ed esplodessero"). OUTSIDE the capture band this is the
          // original subtle lean — the mouse lift's smoothstep falloff
          // family, attraction instead of repulsion, riding the same
          // spring/damping integration. INSIDE the band (d < radius×0.6,
          // envelope past the capGate floor) gravity WINS against the home
          // spring: the force is boosted quadratically toward the hole —
          //   acc += n̂(toHole) · fHole · pull · (1 + capture·capT²·gate)
          //   fHole = smoothstep(radius, 0, d) · envelope
          //   capT  = clamp(1 − d / (radius·0.6), 0, 1)
          // A runaway by construction: the boost grows quadratically as d
          // shrinks while the home spring only grows linearly with home
          // distance, so captured spores DETACH and genuinely TRAVEL to the
          // hole (race at the shipping defaults, model units: at d=2 the
          // pull ≈ 97 vs spring ≈ 53; at the horizon ≈ 250 vs ≈ 79 — with
          // MAX_SPEED clamping the fall to a visible ~0.5s streak). The
          // horizon kill in the decay below finishes them. Parked at 1e9 /
          // envelope 0 → exactly zero at any rest state. (Geometry nodes —
          // toHole/dHole/dirHole/fHole/capT — are hoisted above the step so
          // the post-step re-aim shares them; see the BUG-2 note there.)
          const boost = float(1.0).add(
            holeCaptureN.mul(capT.mul(capT)).mul(capGate),
          );
          acc.addAssign(dirHole.mul(fHole).mul(holePullN).mul(boost));
        },
      });

      // ACCRETION RE-AIM (BUG-2 fix, owner live-review 2026-08-07: "the
      // stream falls straight down while the hole is lower-right"). Capture
      // is acceleration-only, so a detached spore keeps its old momentum and
      // the quadratic boost barely bends the path once it is moving at
      // MAX_SPEED. As capture deepens, PROJECT the velocity onto the LIVE
      // infall direction (kills the perpendicular component), dt-scaled so
      // it is frame-rate independent: steer = 1 − exp(−capT²·gate·10·dt) —
      // perpendicular-decay time-constant ≈ 0.1s at full capture, ~zero at
      // the band edge (capT² ≈ 0.03 there, so hover physics outside the deep
      // well are untouched). Infalling spores now visibly CURVE and chase
      // the hole while it orbits.
      const steer = float(1.0).sub(
        exp(capT.mul(capT).mul(capGate).mul(10.0).negate().mul(dtN)),
      );
      vel.assign(mix(vel, dirHole.mul(dot(vel, dirHole)), steer));

      velH.assign(vel);
      pos.addAssign(vel.mul(dtN));

      // Velocity-gated decay — DDD's exact kill curve 50·min(1,|v|·0.35)⁵ —
      // minus a small heal so grazed survivors knit back to full life. Keys
      // off the PRE-CLAMP speed exactly as the previous inline kernel did.
      // The burst adds a direct staggered kill so the scroll dissolve
      // completes even for spores the radial push barely moves (pinned core).
      //
      // ACCRETION HORIZON KILL (owner 2026-08-07 v2): inside uHoleKillRadius
      // (≈ the black core's projected scale) the spore dies exactly like the
      // burst kill — a large per-spore-staggered decay spike (10–18 life/s ⇒
      // death within ~0.06–0.1s of crossing), soft-edged over
      // [killR, killR·0.5] and capGate-gated so an inert hole can never
      // kill. burstN is untouched, so the DYING → respawn machinery takes
      // its STANDARD path: the force-free ghost flight carries the spore's
      // infall momentum INTO the hole while it shrinks, then it respawns AT
      // HOME on the LIFE_REGROW cycle — a continuous detach → fall → flash →
      // die → regrow erosion stream during near approach, nothing at far
      // phase. Distance reads the POST-integration pos (the spore's actual
      // rendered position this frame).
      const dHoleKill = length(holeN.sub(pos));
      const horizon = smoothstep(
        holeKillRadiusN,
        holeKillRadiusN.mul(0.5),
        dHoleKill,
      ).mul(capGate);
      const decay = pow(min(step.speed.mul(0.35), 1.0), 5.0)
        .mul(LIFE_DECAY)
        .add(burstN.mul(float(2.0).add(rndI.mul(2.5))))
        .add(horizon.mul(float(10.0).add(rndI.mul(8.0))));
      lifeH.assign(min(lifeH.add(LIFE_HEAL.sub(decay).mul(dtN)), 1.0));
    }).Else(() => {
      // DYING (−1,0] — free ghost flight (DDD-style, no forces); the render
      // shrinks it to nothing as life → −1. Drift factor + gentler damping so
      // the dying spores sail a touch FARTHER into space (user feedback).
      //
      // ACCRETION GHOST HOMING (BUG-2 fix, owner live-review 2026-08-07):
      // the visible infall stream is mostly GHOSTS — the DDD speed-kill
      // fires within ms of terminal infall (MAX_SPEED × 0.35 ≥ 1 ⇒ full
      // LIFE_DECAY) — and this branch is force-free, so without steering the
      // dead spores flew BALLISTICALLY toward where the hole USED to be
      // while it orbited on (the owner's screenshot: stream straight down,
      // hole lower-right). Redirect the ghost's velocity (magnitude
      // preserved — mix toward dir·|v|) onto the LIVE hole direction,
      // dt-scaled (1 − exp(−capT·gate·6·dt)), gated by the capture band ×
      // envelope so every other death (hover erode, scroll burst — hole
      // parked at 1e9 ⇒ capT 0) keeps today's exact ghost flight.
      const toHoleD = holeN.sub(pos).toVar();
      const dirD = toHoleD.add(1e-5).normalize();
      const capTD = clamp(
        float(1.0).sub(length(toHoleD).div(holeRadiusN.mul(0.6))),
        0.0,
        1.0,
      );
      const gateD = smoothstep(0.15, 0.35, holeStrengthN);
      const steerD = float(1.0).sub(
        exp(capTD.mul(gateD).mul(6.0).negate().mul(dtN)),
      );
      velH.assign(mix(velH, dirD.mul(length(velH)), steerD));
      pos.addAssign(velH.mul(0.85).mul(dtN));
      velH.mulAssign(exp(float(-1.8).mul(dtN)));
      lifeH.subAssign(dtN.mul(LIFE_DIE));
      If(lifeH.lessThan(-1.0), () => {
        If(burstN.lessThan(0.05), () => {
          // RESPAWN — back at home, regrow countdown starts (life 2 → 1).
          pos.assign(home);
          velH.assign(vec3(0.0, 0.0, 0.0));
          lifeH.assign(2.0);
        }).Else(() => {
          // Scroll-out active: park DEAD at home (invisible) — no respawn
          // until the mark scrolls back, then the crust regrows in place.
          pos.assign(home);
          velH.assign(vec3(0.0, 0.0, 0.0));
          lifeH.assign(-1.0);
        });
      });
    });
  })().compute(count);

  // --- Render: instanced icosphere through the STANDARD pipeline ------------
  // Detail 1 = 80 tris / 240 verts (non-indexed soup) — at ~37k instances ≈ 3M
  // tris in one draw, routine for the desktop tier; opaque + early-Z makes it
  // cheaper per-pixel than the additive overdraw it replaces.
  const ico = new IcosahedronGeometry(1, 1);
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute("position", ico.getAttribute("position"));
  geometry.setAttribute("normal", ico.getAttribute("normal"));
  geometry.setAttribute("aRef", new InstancedBufferAttribute(aRef, 2));
  geometry.instanceCount = count;

  const uFade = uniform(1) as UniformNode<number>;
  const uSporeRadius = uniform(baseRadius) as UniformNode<number>;
  const uEmissive = uniform(spore.EMISSIVE) as UniformNode<number>;
  const uAlbedo = uniform(
    new Color().fromArray(spore.ALBEDO),
  ) as UniformNode<ColorLike>;
  const uEmissionCol = uniform(
    new Color().fromArray(spore.EMISSION),
  ) as UniformNode<ColorLike>;
  const uAlbedoMul = uniform(spore.ALBEDO_MUL) as UniformNode<number>;
  const uRim = uniform(spore.RIM) as UniformNode<number>;

  // Per-instance pseudo-random in [0,1] — same aRef hash as the sprite builds.
  // Used in BOTH stages (vertex scale, fragment AO); TSL bridges the attribute
  // into the fragment with an auto-generated varying.
  const aRefNode = attribute("aRef");
  const rnd = fract(
    sin(dot(aRefNode.xy, vec2(127.1, 311.7))).mul(43758.5453123),
  );

  const material = new MeshBasicNodeMaterial();

  // DDD life→scale envelope (exact formula from the bundle):
  //   linearStep(−1,−0.2,life) · (linearStep(1.5,1,life) + pulse(1.25)·0.5)
  // alive = 1 · dying shrinks to 0 as life→−1 · regrow grows 1.5→1 with an
  // overshoot pulse at 1.25 · freshly-respawned (life>1.5) = invisible.
  const lifeAttr = lifeBuffer.toAttribute();
  const dieEnv = clamp(lifeAttr.add(1.0).div(0.8), 0.0, 1.0);
  const regrowEnv = clamp(float(1.5).sub(lifeAttr).div(0.5), 0.0, 1.0);
  const pulse = max(
    float(0.0),
    float(1.0).sub(abs(lifeAttr.sub(1.25)).div(0.25)),
  ).mul(0.5);
  const lifeScale = dieEnv.mul(regrowEnv.add(pulse));

  // `.xyz` is MANDATORY on a `"vec3"` storage buffer read: `.toAttribute()`
  // returns a 4-component node (vec3 padded to 16 bytes in the WebGPU storage
  // layout), and positionNode must stay vec3 — `positionLocal.mul(scale)` is
  // vec3, so the `.add()` summand has to be vec3 too.
  material.positionNode = positionLocal
    .mul(
      (uSporeRadius as unknown as AnyNode)
        .mul(mix(float(spore.VAR_MIN), float(spore.VAR_MAX), rnd))
        .mul(lifeScale),
    )
    .add(positionBuffer.toAttribute().xyz);

  material.colorNode = Fn(() => {
    const N = normalView.normalize().toVar();
    // Fixed key light in VIEW space — stable as the mark parallax-tilts.
    const L = vec3(0.35, 0.55, 0.78).normalize();
    const lambert = max(dot(N, L), 0.0).toVar();
    // Vertical sky ambient + per-spore value variation = the cheap stand-in
    // for DDD's voxel-light-field AO (random darkening separates the balls).
    const ambient = float(0.32).add(N.y.mul(0.14));
    const ao = mix(float(0.55), float(1.0), rnd);
    const albedo = (uAlbedo as unknown as AnyNode)
      .toVec3()
      .mul(uAlbedoMul as unknown as AnyNode);
    const lit = albedo.mul(ambient.add(lambert.mul(0.95))).mul(ao).toVar();

    // Excitement = speed (storage read auto-varied into the fragment) OR the
    // regrow flash (DDD: brightness = max(0, life−1) — re-forming spores flash
    // cyan). Quadratic ramp so the resting crust stays dark violet and only
    // excited spores lerp toward cyan AND cross the selective-bloom threshold.
    // `.xyz` MANDATORY: `velocityBuffer` is a padded `"vec3"` storage buffer,
    // so `.toAttribute()` is 4-component — `length()` must see the true vec3.
    const speed = length(velocityBuffer.toAttribute().xyz);
    const regrowFlash = clamp(lifeAttr.sub(1.0), 0.0, 1.0); // max(0, life−1)
    // GRAVITATIONAL FLYBY glow + ACCRETION INFALL FLASH — the hovered-spore
    // cyan lift, driven by proximity instead of speed. Two terms, max()ed:
    //   (1) the wide-well glow (falloff × envelope, as the v1 lean shipped)
    //       — the resting near-edge warms up;
    //   (2) the INFALL FLASH: heats to FULL over the last stretch into the
    //       horizon (4·killR → killR), so captured spores streak bright and
    //       vanish in a flash (owner: "esplodessero"). At terminal infall
    //       the SPEED excitement already saturates t on its own (MAX_SPEED ×
    //       SPEED_COLOR_K ≫ 1) and the DYING ghost flight keeps this term
    //       lit as the shrinking spore crosses the horizon — the flash needs
    //       no life-machine plumbing here.
    // Self-contained expression (frozen-varying discipline); positionBuffer
    // is already bound for positionNode, so these reads cost no new binding
    // — uniforms only. `.xyz` mandatory on the padded `"vec3"` storage read.
    const dHoleF = length(holeN.sub(positionBuffer.toAttribute().xyz));
    const holeGlow = max(
      smoothstep(holeRadiusN, 0.0, dHoleF),
      smoothstep(holeKillRadiusN.mul(4.0), holeKillRadiusN, dHoleF),
    ).mul(holeStrengthN);
    const t = clamp(
      max(max(speed.mul(spore.SPEED_COLOR_K), regrowFlash), holeGlow),
      0.0,
      1.0,
    ).toVar();
    const emission = mix(
      (uAlbedo as unknown as AnyNode).toVec3(),
      (uEmissionCol as unknown as AnyNode).toVec3(),
      t,
    )
      .mul(t.mul(t))
      .mul(uEmissive as unknown as AnyNode);

    // Cyan rim at the sphere silhouette (N.z→0): a hint at rest, stronger on
    // excited spores — reads as backlight wrapping a solid ball, not glow.
    const rimF = float(1.0).sub(max(N.z, 0.0)).toVar();
    const rim = rimF
      .mul(rimF)
      .mul(uRim as unknown as AnyNode)
      .mul(float(0.25).add(t.mul(0.75)));

    // Always-on baseline emission (CORE shell: the layer carries its own
    // light, f_007 / live DDD zoom). Gently lambert-shaped so the lit side
    // glows brighter (the "light effect" on the revealed layer) but WITHOUT
    // the ao darkening — the glow fills the crevices, the albedo term above
    // keeps the per-ball form.
    const baseGlow = (uEmissionCol as unknown as AnyNode)
      .toVec3()
      .mul(float(spore.BASE_EMISSION))
      .mul(float(0.55).add(lambert.mul(0.45)));

    const col = lit
      .add(emission)
      .add(baseGlow)
      .add((uEmissionCol as unknown as AnyNode).toVec3().mul(rim));
    // Opaque pipeline → the scroll fade darkens toward the near-black bg
    // (the shell also scales/recedes during the fade, so this reads as a fade).
    return vec4(col.mul(uFade as unknown as AnyNode), 1.0);
  })();

  material.transparent = false;
  material.depthWrite = true;
  material.depthTest = true;
  material.blending = NormalBlending;
  material.toneMapped = false;

  const mouseScratch = uMouse.value;

  function tick(p: GpgpuTickParams) {
    uDelta.value = p.dt;
    uTime.value = p.time;
    mouseScratch.copy(p.mouse as unknown as Vec3Like);
    gl.compute(simulate);
  }

  const rig: GpgpuSimRig = {
    size,
    tick,
    dispose() {
      geometry.dispose();
      ico.dispose();
      material.dispose();
    },
  };

  return {
    rig,
    geometry,
    material,
    uFade,
    uSporeRadius,
    uEmissive,
    uOrbit,
    uOrbitFalloff,
    uBurst,
    uRegrowScale,
    uHole,
    uHoleStrength,
    uHolePull,
    uHoleRadius,
    uHoleCapture,
    uHoleKillRadius,
    dispose() {
      rig.dispose();
    },
  };
}

// ===========================================================================
// TEXT MORPH — compute particles morphing between two sampled texts
// (TSL / true-WebGPU only — same storage-buffer discipline as the spores)
// ===========================================================================
// The hero intro: home field A = "Sersan AI", home field B = the real
// headline. uMorph (0..1, scroll-driven) sweeps a per-particle staggered
// blend of the spring TARGET from A to B; the under-damped spring + a
// mid-transit turbulence kick give the "scatter and recompose" feel. At
// uMorph 0/1 the spring pins the text razor-crisp.
//
// DETERMINISM (the anchor+offset contract): the spring target below is the
// ANALYTIC ANCHOR — a pure function of uMorph/uMorph2/uMorph3/uAssemble/
// uSpread + per-particle hashes, valid for any scrub state in either
// direction. The integrated velocity only relaxes the offset onto it
// (unifiedForceStep), so a scrub reversal converges back within the spring's
// bounded relaxation time and a rebuild seeded at home is always legal.
export interface TextMorphNodeBuild {
  geometry: InstancedGeoLike;
  material: NodeMaterialLike;
  /** Morph progress 0 (text A) → 1 (text B), scroll-driven. */
  uMorph: UniformNode<number>;
  /** Second morph leg 0 (text B) → 1 (text C), scroll-driven. Lets the chain
   * run A → B → C (e.g. "Sersan AI" → headline → "see what we build"). */
  uMorph2: UniformNode<number>;
  /** Third morph leg 0 (text C) → 1 (text D). Extends the chain to A → B →
   * C → D (… → "see what we build" → "scroll", which travels to the bottom). */
  uMorph3: UniformNode<number>;
  /** Global alpha (cross-fade against the DOM headline). */
  uFade: UniformNode<number>;
  /**
   * Per-particle target jitter radius (world units). >0 = the text is a
   * DIFFUSE cloud shaped like the glyphs; → 0 = particles condense onto the
   * exact glyph pixels. Scroll drives this for the "density grows" intro.
   */
  uSpread: UniformNode<number>;
  /**
   * Entry assemble 0→1, TIME-driven (not scroll): the ICS-media particle-text
   * choreography. Each particle's spring target sweeps from its scattered
   * seed to the text with a LEFT→RIGHT stagger (delay = normalized home-A x)
   * and its alpha fades in as its own journey starts. At 1 the entry is over
   * and the buffers behave exactly as before this uniform existed. Callers
   * that skip the entrance (replays, rebuilds) just leave it at its default 1.
   */
  uAssemble: UniformNode<number>;
  /**
   * Per-particle size multiplier applied as uMorph → 1 (default 1 = off).
   * Compensates ink-area density: text B (the long headline) spreads the
   * same particle count over more ink pixels than text A, so without this
   * it reads dimmer/sparser. Callers set ≈ sqrt(inkB/inkA).
   */
  uSizeComp: UniformNode<number>;
  /** Ink-density compensation for text C (the second morph target). */
  uSizeComp2: UniformNode<number>;
  /** Ink-density compensation for text D (the third morph target). */
  uSizeComp3: UniformNode<number>;
  uPointSize: UniformNode<number>;
  uPixelRatio: UniformNode<number>;
  uViewport: UniformNode<unknown>;
  /** Colour multiplier — PORTRAIT PATH ONLY (live-tunable emissive). Absent on
   * the hero text path (which bakes params.EMISSIVE), so the hero graph is
   * byte-identical. */
  uEmissive?: UniformNode<number>;
  /** Flyby attractor center in the build's LOCAL space (park at 1e9 = off) —
   * the black-hole lean, owner 2026-08-07. Applied in the VERTEX stage as
   * displacement ONLY (no colour term — vSpeedF is untouched); never touches
   * the compute kernel, which sits at its 8-of-8 storage wall. */
  uHole: UniformNode<Vec3Like>;
  /** Flyby displacement amplitude in world units at full falloff. Owner
   * 2026-08-07 v2 ("la scritta non si distorce"): sized for a VISIBLE warp —
   * tens of px at near approach, breathing 0→peak with the orbit's
   * proximity envelope (fx.holePullText × the damped holeField.strength).
   * 0 = off — the portrait callers never write it, so their graphs behave
   * identically. */
  uHoleStrength: UniformNode<number>;
  /** Flyby falloff radius in world units (the text sim is world-scaled). */
  uHoleRadius: UniformNode<number>;
  tick: (p: { dt: number; time: number }) => void;
  dispose: () => void;
}

export interface TextMorphParams {
  SPRING: number;
  DAMPING: number;
  MAX_SPEED: number;
  /** Mid-transit turbulence amplitude (world units/s²-ish). */
  TURB: number;
  POINT_SIZE: number;
  POINT_ALPHA: number;
  EMISSIVE: number;
  COL_COLD: [number, number, number];
  COL_HOT: [number, number, number];
}

/**
 * OPTIONAL portrait-morph extension (P1R particle-portrait morph). When passed,
 * each particle carries a per-particle LINEAR colour AND an optional per-particle
 * INK scalar for target A and target B; the render blends both A→B with the SAME
 * per-particle stagger the compute kernel uses for the anchor, so colour, size
 * and position morph in lockstep. When ABSENT the build is BYTE-IDENTICAL to the
 * hero text intro (no colour buffers, no size buffers, additive unlit sprite
 * look) — the shared-engine contract for the hero regression.
 *
 * THIRD TARGET (A→B→C). `colorsC` + `sizeC` are OPTIONAL and, when present,
 * chain a second colour/ink leg driven by `uMorph2` on the SAME stagger —
 * CHAINED AFTER the A→B blend, exactly mirroring the kernel's
 * `mix(mix(A,B,m1), C, m2)` anchor. This is mandatory for a real third portrait,
 * not polish: colour and ink otherwise key off `uMorph` ALONE, so target C's
 * positions would render in target B's colours with target B's ink — and ink
 * gates disc size, the alpha knee, coverage and the alpha Discard, so cells that
 * are subject in C but backdrop in B would be culled outright (C would appear as
 * a B-shaped stencil). Absent → the exact 2-target graph.
 *
 * SEQUENCING INVARIANT (caller's responsibility). `uMorph` must reach EXACTLY
 * 1.0 before `uMorph2` leaves 0. The blend is chained, so driving both legs at
 * once yields `mix(mix(A,B,s), C, s)` — a shortcut that cuts the corner between
 * A and C and never touches B. Derive both uniforms from one progress scalar.
 *
 * INK → SIZE is the tonal model (after brunoimbrizi/interactive-particles, which
 * does `psize *= max(grey, 0.2)`): a portrait's tone is carried by particle SIZE
 * on a uniform one-per-cell grid, NOT by particle density. Density-based tone
 * needs random resampling, which leaves holes where the rng missed and wastes
 * the budget on duplicates — the defect this replaced.
 *
 * The photographic look uses NORMAL blending with depth OFF by default: the
 * sampler emits one particle per grid cell, so there is nothing meaningful to
 * occlude, and depth-testing overlapping discs at slightly different z mottles
 * and tears the face along luminance edges instead of reading as relief (the
 * reference implementation, .refs/interactive-particles Particles.js, likewise
 * sets depthTest:false). Only mid-flight travel + any >1.0 travelTint feed the
 * selective bloom, so faces stay photographic at rest.
 */
export interface PortraitMorphOpts {
  /** count×3 LINEAR rgb for target A (index-matched to homeA). */
  colorsA: Float32Array;
  /** count×3 LINEAR rgb for target B (index-matched to homeB). */
  colorsB: Float32Array;
  /** OPTIONAL count×3 LINEAR rgb for target C (index-matched to homeC).
   * Present ONLY on a real 3-target chain; absent → the exact 2-target graph.
   * MUST be passed together with `sizeC` — colour without ink chains the
   * photograph to C while leaving the disc size and alpha on B. */
  colorsC?: Float32Array;
  /** count floats in 0..1: per-particle tonal weight for target A. Scales the
   * disc size and alpha. Both `sizeA` and `sizeB` must be present to enable the
   * ink path; absent = flat-size discs (the pre-ink portrait look). */
  sizeA?: Float32Array;
  /** count floats in 0..1: per-particle tonal weight for target B. */
  sizeB?: Float32Array;
  /** OPTIONAL count floats 0..1: per-particle tonal weight for target C.
   * Requires `colorsC` + `sizeA` + `sizeB` present. NOTE: there is deliberately
   * no colorsD/sizeD — a FOURTH portrait target would render target D's
   * positions with target C's colours. Add them if that day comes: colour and
   * ink pack together into ONE `tintD` vec4 buffer, so the render cost is +1
   * vertex-stage storage binding (4 of 8) and ZERO vertex-buffer slots. Read
   * the RENDER BINDING BUDGET block in createTextMorphComputeBuild first — the
   * COMPUTE kernel is the tighter wall, already at 8 of 8 storage buffers. */
  sizeC?: Float32Array;
  /** Render blending — "normal" (default, real occlusion) or "additive". */
  blending?: "normal" | "additive";
  /** Depth test (default false — one particle per cell has nothing to occlude,
   * and depth-testing overlapping discs tears the face at luminance edges). */
  depthTest?: boolean;
  /** Depth write (default false, same reason). */
  depthWrite?: boolean;
  /** Colour multiplier (default 1 — faces photographic, no bloom at rest). */
  emissive?: number;
  /** HDR cyan the discs surge toward mid-flight (>1 → selective bloom). */
  travelTint?: [number, number, number];
  /** Grid spacing in DEVICE px (`sqrt(stageAreaDev / count)`), i.e. the pitch
   * of the one-particle-per-cell lattice on screen. Used ONLY to size the
   * sub-pixel coverage compensation (see PORTRAIT_COV_MIN_PX): the disc
   * diameter is exactly `2·f·spacingDev`, so a spacing-relative threshold makes
   * the correction track stage size and dpr instead of assuming a retina
   * layout. Absent → the absolute 1.25 devpx floor is used alone. */
  spacingDev?: number;
}

export function createTextMorphComputeBuild(
  gl: RendererLike,
  webgpu: WebGPUSymbolsGpgpu,
  tsl: TslSymbolsGpgpu,
  homeA: Float32Array, // count×3 world-unit offsets from block center
  homeB: Float32Array,
  homeC: Float32Array, // third target (B → C second morph leg)
  homeD: Float32Array, // fourth target (C → D third morph leg)
  count: number,
  params: TextMorphParams,
  /** Optional initial particle positions (e.g. a scattered cloud for the
   * entry "particles assemble into the text" beat). Defaults to homeA. */
  seedPositions?: Float32Array,
  /** Optional per-particle colour morph (see PortraitMorphOpts). Absent = the
   * byte-identical hero text look. */
  portrait?: PortraitMorphOpts,
  /** Optional entry-assemble START field (the scattered cloud uAssemble
   * interpolates the anchor FROM). Defaults to seedPositions. Callers that
   * REBUILD an already-formed text pass homes as seedPositions (no spurious
   * re-flight) but must still pass the scatter cloud here — with the live
   * uAssemble scrub (2026-07-23 one-beat intro) start==home would pin the
   * anchor and silently degrade the dissolve to a flat alpha wipe. */
  startPositions?: Float32Array,
): TextMorphNodeBuild {
  const {
    InstancedBufferGeometry,
    BufferAttribute,
    MeshBasicNodeMaterial,
    Color,
    Vector2,
    Vector3,
    AdditiveBlending,
    NormalBlending,
    DoubleSide,
  } = webgpu;
  const {
    uniform,
    positionLocal,
    modelViewMatrix,
    cameraProjectionMatrix,
    Fn,
    vec3,
    vec4,
    float,
    length,
    max,
    clamp,
    sin,
    mix,
    smoothstep,
    Discard,
    varying,
    hash,
    instancedArray,
    instanceIndex,
  } = tsl;

  const positionBuffer = instancedArray(
    (seedPositions ?? homeA).slice(),
    "vec3",
  );
  const velocityBuffer = instancedArray(count, "vec3");
  const homeABuffer = instancedArray(homeA.slice(), "vec3");
  const homeBBuffer = instancedArray(homeB.slice(), "vec3");
  const homeCBuffer = instancedArray(homeC.slice(), "vec3");
  const homeDBuffer = instancedArray(homeD.slice(), "vec3");
  // === PORTRAIT per-particle data — colour + ink PACKED into ONE vec4 =======
  // Render-only (the kernel never reads these). Absent → no buffers at all, and
  // the hero graph is byte-identical.
  //
  // WHY PACKED, and why these are read with `.element()` and not
  // `.toAttribute()`: see the RENDER BINDING BUDGET block above
  // `material.vertexNode` below. Short version — `.toAttribute()` binds the
  // storage buffer as a VERTEX BUFFER, WebGPU allows only 8 of those, and six
  // independent colour/ink attributes took the 3-target build to 10 and the
  // render pipeline failed to create (nothing drew at all). Packing rgb into
  // `.xyz` and the ink scalar into `.w` halves the per-target cost, and reading
  // via `.element(instanceIndex)` moves it off the vertex-buffer budget
  // entirely onto the (separate, roomier) read-only-storage budget.
  //
  // LAYOUT: `"vec4"` is NOT padded — WebGPUAttributeUtils only rewrites
  // itemSize 3 → 4 (that rewrite is exactly why a `"vec3"` `.toAttribute()`
  // yields a 4-component node). So each instance is literally [r, g, b, ink],
  // and `.element(i)` on it yields a true vec4: `.xyz` = colour, `.w` = ink.
  const hasPortrait = !!portrait;
  const hasPortraitSize = !!portrait?.sizeA && !!portrait?.sizeB;
  // Optional THIRD portrait target (A→B→C). Absent → the exact 2-target graph.
  // All gates are build-time JS booleans, so the hero emits an unchanged graph.
  const hasPortraitC = !!portrait?.colorsC;
  // `hasPortraitC` FIRST: `sizeC` without `colorsC` would leave
  // `portraitMorph2Expr` null while this gate is true, and the `!` below would
  // then dereference it and throw at shader-build time.
  const hasPortraitSizeC = hasPortraitC && hasPortraitSize && !!portrait?.sizeC;

  /**
   * Interleave a count×3 LINEAR rgb array and an optional count ink array into
   * one count×4 `[r, g, b, ink]` buffer. Ink defaults to 0 when the caller
   * supplied none — harmless, because `.w` is only ever READ behind the
   * `hasPortraitSize` / `hasPortraitSizeC` build-time gates, so the flat-size
   * portrait path (colours, no ink) never sees it.
   */
  const packTint = (rgb: Float32Array, ink?: Float32Array): Float32Array => {
    const out = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      out[i * 4] = rgb[i * 3];
      out[i * 4 + 1] = rgb[i * 3 + 1];
      out[i * 4 + 2] = rgb[i * 3 + 2];
      out[i * 4 + 3] = ink ? ink[i] : 0;
    }
    return out;
  };

  const tintABuffer = portrait
    ? instancedArray(packTint(portrait.colorsA, portrait.sizeA), "vec4")
    : null;
  const tintBBuffer = portrait
    ? instancedArray(packTint(portrait.colorsB, portrait.sizeB), "vec4")
    : null;
  const tintCBuffer = hasPortraitC
    ? instancedArray(packTint(portrait!.colorsC!, portrait!.sizeC), "vec4")
    : null;
  // Element handles — plain node EXPRESSIONS (NOT `.toVar()`s), so they are
  // safe to feed `varying(...)`; see the VaryingNode hazard note below. Every
  // read of these happens in the VERTEX stage: `instanceIndex` degrades to an
  // interpolated varying in the fragment stage (IndexNode.generate), which
  // would turn a per-instance load into a per-PIXEL storage read.
  const tintA = tintABuffer ? tintABuffer.element(instanceIndex) : null;
  const tintB = tintBBuffer ? tintBBuffer.element(instanceIndex) : null;
  const tintC = tintCBuffer ? tintCBuffer.element(instanceIndex) : null;
  // Entry-assemble fields: the scattered start each particle flies in FROM,
  // and its stagger delay = normalized home-A x (ICS-media: "the normalized X
  // position directly becomes the delay value" → a left→right forming wave).
  const startBuffer = instancedArray(
    (startPositions ?? seedPositions ?? homeA).slice(),
    "vec3",
  );
  const delays = new Float32Array(count);
  {
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < count; i++) {
      const x = homeA[i * 3];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    const span = Math.max(maxX - minX, 1e-4);
    for (let i = 0; i < count; i++) {
      delays[i] = (homeA[i * 3] - minX) / span;
    }
  }
  const delayBuffer = instancedArray(delays, "float");

  const uMorph = uniform(0) as UniformNode<number>;
  const uMorph2 = uniform(0) as UniformNode<number>;
  const uMorph3 = uniform(0) as UniformNode<number>;
  const uSpread = uniform(0) as UniformNode<number>;
  // Default 1 = "entry already done" so rebuild/replay callers are unaffected.
  const uAssemble = uniform(1) as UniformNode<number>;
  const uSizeComp = uniform(1) as UniformNode<number>;
  const uSizeComp2 = uniform(1) as UniformNode<number>;
  const uSizeComp3 = uniform(1) as UniformNode<number>;
  // GRAVITATIONAL FLYBY attractor (owner 2026-08-07) — displacement-only
  // lean toward the black hole's apparent center, applied in the VERTEX
  // stage (see the note inside material.vertexNode). UNIFORMS ONLY: zero
  // storage buffers, zero binding slots (see the RENDER BINDING BUDGET).
  // Defaults are dead (strength 0, center parked at 1e9) — only
  // HeroTextParticles ever writes them, so portraits are untouched.
  const uHole = uniform(new Vector3(1e9, 1e9, 1e9)) as UniformNode<Vec3Like>;
  const uHoleStrength = uniform(0) as UniformNode<number>;
  const uHoleRadius = uniform(9) as UniformNode<number>;
  const holeN = uHole as unknown as AnyNode;
  const holeStrengthN = uHoleStrength as unknown as AnyNode;
  const holeRadiusN = uHoleRadius as unknown as AnyNode;
  const uDelta = uniform(1 / 60) as UniformNode<number>;
  const uTime = uniform(0) as UniformNode<number>;
  const morphN = uMorph as unknown as AnyNode;
  const morph2N = uMorph2 as unknown as AnyNode;
  const morph3N = uMorph3 as unknown as AnyNode;
  const spreadN = uSpread as unknown as AnyNode;
  const assembleN = uAssemble as unknown as AnyNode;
  const dtN = uDelta as unknown as AnyNode;
  const timeN = uTime as unknown as AnyNode;
  const SPRING = float(params.SPRING);
  const DAMPING = float(params.DAMPING);
  const MAX_SPEED = float(params.MAX_SPEED);
  const TURB = float(params.TURB);
  /** Per-particle assemble window: each particle's own start→text journey
   * occupies this fraction of the global uAssemble sweep (the rest is its
   * stagger delay). ~0.45 reads as a continuous travelling wave. */
  const ASSEMBLE_WINDOW = 0.45;

  const simulate = Fn(() => {
    const pos = positionBuffer.element(instanceIndex);
    const velH = velocityBuffer.element(instanceIndex);
    const hA = homeABuffer.element(instanceIndex);
    const hB = homeBBuffer.element(instanceIndex);
    const start = startBuffer.element(instanceIndex);
    const delay = delayBuffer.element(instanceIndex);

    // === ANALYTIC ANCHOR — a pure function of the morph/assemble uniforms ===
    // Per-particle staggered transition: particle r starts its A→B journey at
    // uMorph = r·0.55 and completes it 0.45 later → a travelling recomposition
    // wave instead of a uniform pop.
    const r = hash(instanceIndex).toVar();
    const m = clamp(morphN.sub(r.mul(0.55)).div(0.45), 0.0, 1.0).toVar();
    const target = mix(hA, hB, smoothstep(0.0, 1.0, m)).toVar();
    // Second morph leg: headline B → cue C ("see what we build"), same
    // per-particle staggered wave, driven by uMorph2.
    const hC = homeCBuffer.element(instanceIndex);
    const m2 = clamp(morph2N.sub(r.mul(0.55)).div(0.45), 0.0, 1.0).toVar();
    target.assign(mix(target, hC, smoothstep(0.0, 1.0, m2)));
    // Third morph leg: cue C → "scroll" D, whose home sits LOW in the block,
    // so the particles travel downward and recompose at the bottom.
    const hD = homeDBuffer.element(instanceIndex);
    const m3 = clamp(morph3N.sub(r.mul(0.55)).div(0.45), 0.0, 1.0).toVar();
    target.assign(mix(target, hD, smoothstep(0.0, 1.0, m3)));

    // Diffuse-cloud spread: a stable per-particle offset direction whose
    // radius (uSpread) the scroll shrinks to 0 — the text visibly CONDENSES
    // from a loose particle cloud into the exact glyph shape.
    const jdir = vec3(
      hash(instanceIndex.add(7919)).mul(2.0).sub(1.0),
      hash(instanceIndex.add(104729)).mul(2.0).sub(1.0),
      hash(instanceIndex.add(1299709)).mul(2.0).sub(1.0).mul(0.5),
    );
    target.addAssign(jdir.mul(spreadN));

    // ENTRY assemble (time-driven, ICS-media style): this particle's own
    // journey runs aw 0→1 inside the global sweep, offset by its left→right
    // delay. The spring TARGET glides start→text, so the spring + transit
    // turbulence shape the flight organically; at uAssemble=1 this whole
    // term is the identity (target unchanged).
    const aw = clamp(
      assembleN
        .mul(1.0 + ASSEMBLE_WINDOW)
        .sub(delay)
        .div(ASSEMBLE_WINDOW),
      0.0,
      1.0,
    ).toVar();
    target.assign(mix(start, target, smoothstep(0.0, 1.0, aw)));

    // === Integrated offset relaxing onto the anchor (unified force model) ===
    // Mid-transit scatter: peaks at the middle of EITHER journey (entry
    // start→A or any morph leg), zero at rest, so particles wander
    // organically while travelling and land crisp.
    const transitMorph = m.mul(float(1.0).sub(m)).mul(4.0);
    const transitMorph2 = m2.mul(float(1.0).sub(m2)).mul(4.0);
    const transitMorph3 = m3.mul(float(1.0).sub(m3)).mul(4.0);
    const transitEntry = aw.mul(float(1.0).sub(aw)).mul(4.0);
    const transit = max(
      max(max(transitMorph, transitMorph2), transitMorph3),
      transitEntry,
    ).toVar();
    const turb = vec3(
      sin(pos.y.mul(7.0).add(timeN.mul(2.1)).add(r.mul(6.28))),
      sin(pos.x.mul(8.0).add(timeN.mul(1.7)).add(r.mul(4.1))),
      sin(pos.x.mul(5.0).add(pos.y.mul(5.0)).add(timeN.mul(1.3))).mul(0.4),
    );

    const vel = velH.toVar();
    unifiedForceStep(tsl, {
      pos,
      vel,
      anchor: target,
      dt: dtN,
      spring: SPRING,
      damping: DAMPING,
      maxSpeed: MAX_SPEED,
      // No attractor: the intro has no pointer interaction by design — the
      // shared code path here is the anchor-spring/damping/clamp integration.
      extraAcc: (acc) => {
        acc.addAssign(turb.mul(TURB).mul(transit));
      },
    });

    velH.assign(vel);
    pos.addAssign(vel.mul(dtN));
  })().compute(count);

  // --- Render: instanced billboard quads in device px (text = tiny motes) ---
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(QUAD_CORNERS), 3),
  );
  geometry.setIndex(new BufferAttribute(new Uint16Array(QUAD_INDEX), 1));
  geometry.instanceCount = count;

  const uPointSize = uniform(params.POINT_SIZE) as UniformNode<number>;
  const uPixelRatio = uniform(1) as UniformNode<number>;
  const uViewport = uniform(new Vector2(1, 1)) as UniformNode<unknown>;
  const uFade = uniform(1) as UniformNode<number>;
  const uColCold = uniform(
    new Color().fromArray(params.COL_COLD),
  ) as UniformNode<ColorLike>;
  const uColHot = uniform(
    new Color().fromArray(params.COL_HOT),
  ) as UniformNode<ColorLike>;

  // === Per-particle scalars carried to the FRAGMENT stage ==================
  // These three MUST stay self-contained node EXPRESSIONS. Do NOT "simplify"
  // them back into an outer `float(x).toVar()` that the vertex `Fn` `.assign()`s
  // into — that idiom is silently broken. See the full VaryingNode hazard note
  // on `portraitMorphExpr` immediately below: three writes every varying at the
  // TOP of vertex `main()`, BEFORE the `material.vertexNode` body runs, so a
  // varying built from an outer var carries that var's DECLARED INITIAL value
  // forever, whatever the Fn later assigns.
  //
  // That is exactly the bug this shape fixes: `vSpeedF` read a constant 0 (hero
  // colour pinned to COL_COLD, no speed brightening, and the portrait's
  // mid-flight HDR travel tint dead), `vRandF` a constant 0 (no per-particle
  // 0.75–1.15 brightness spread — a flat, uniformly dimmer cloud), and
  // `vAssembleF` a constant 1 (the staggered per-particle entry FADE never ran;
  // only the staggered motion did, since that comes from the kernel's anchor).
  /** Per-particle speed (world units/s). Hero: cold→hot colour ramp + a
   * brightness boost. Portrait: gain into the HDR travel tint that feeds
   * selective bloom. */
  const heroSpeedExpr = length(velocityBuffer.toAttribute().xyz);
  /** Stable per-particle random in [0,1) — brightness and size spread. */
  const heroRandExpr = hash(instanceIndex);
  /** Per-particle entry visibility: alpha rises as the particle's own journey
   * starts (ICS: each particle tweens `alpha: 0 → visible` with its delay).
   * Mirrors the compute kernel's `aw` window EXACTLY — same `ASSEMBLE_WINDOW`,
   * same `delayBuffer` read (a `"float"` buffer: unpadded, NO `.xyz`) — so the
   * fade tracks the travelling recomposition wave it belongs to. */
  const heroAssembleExpr = smoothstep(
    0.0,
    0.35,
    clamp(
      assembleN
        .mul(1.0 + ASSEMBLE_WINDOW)
        .sub(delayBuffer.toAttribute())
        .div(ASSEMBLE_WINDOW),
      0.0,
      1.0,
    ),
  );
  // Portrait: the per-particle A→B colour-blend scalar and the A→B-blended ink,
  // held as plain node EXPRESSIONS — deliberately NOT as outer `.toVar()`s that
  // the vertex Fn assigns into.
  //
  // WHY (three r184, verified by generating the shader): `varying(node)` does
  // NOT read the node where you wrote it. `VaryingNode.generate`
  // (three/src/nodes/core/VaryingNode.js:162-182) calls
  // `builder.flowNodeFromShaderStage(VERTEX, node, type, propertyName)`
  // (NodeBuilder.js:2572-2600), which appends `<varying> = <node>;` to
  // `flowCode.vertex`; `buildCode()` then PREPENDS `flowCode[stage]` ahead of
  // the stage's flow nodes (GLSLNodeBuilder.js:1478-1497,
  // WGSLNodeBuilder.js:2106-2128). So the varying is written at the TOP of the
  // vertex `main()`, BEFORE the `material.vertexNode` body runs. A varying built
  // from an outer `.toVar()` therefore carries that var's INITIAL value forever,
  // no matter where inside the Fn the `.assign()` sits — which is exactly how
  // `vMorphColorF` read a constant 0 (face never left target A) and `vInkF` read
  // a constant 0 (fringe alpha pinned at the ink term's floor → the halo behind
  // the face).
  //
  // A varying built from a self-contained EXPRESSION is correct instead: three
  // re-emits the whole expression at the top of `main()`, where uniforms and
  // per-instance attributes are already available, and the Fn body below then
  // reuses the very same generated var for the size math. Keep it this way; do
  // not "simplify" these back into an outer var + `.assign()` inside the Fn.
  const portraitMorphExpr = hasPortrait
    ? smoothstep(
        0.0,
        1.0,
        clamp(morphN.sub(hash(instanceIndex).mul(0.55)).div(0.45), 0.0, 1.0),
      )
    : null;
  /** Second-leg (B→C) stagger. MUST mirror the kernel's `m2` EXACTLY — same
   * 0.55 delay, same 0.45 window, same hash — or colour and ink travel a
   * different path than position. Self-contained expression, never an outer
   * `.toVar()` (VaryingNode hazard, documented above). */
  const portraitMorph2Expr = hasPortraitC
    ? smoothstep(
        0.0,
        1.0,
        clamp(morph2N.sub(hash(instanceIndex).mul(0.55)).div(0.45), 0.0, 1.0),
      )
    : null;
  // Ink lives in `.w` of the packed tint vec4 — a `.element()` read of a
  // `"vec4"` buffer is a TRUE vec4 (no 3→4 padding rewrite applies), so `.w` is
  // the real scalar and there is no `.xyz` question here at all.
  // CHAINED to match the kernel's `target`: mix(mix(A,B,m1), C, m2). Rewriting
  // this one expression is what makes the third leg cheap — it is read by the
  // vertex Fn's `inkNow`, by `portraitSizePxExpr` and by the `vInkF` varying, so
  // disc size, sub-pixel coverage compensation and fragment alpha all pick up
  // the 3-way chain and stay in lockstep with no further edits.
  const portraitInkExpr = hasPortraitSize
    ? hasPortraitSizeC
      ? mix(mix(tintA!.w, tintB!.w, portraitMorphExpr!), tintC!.w, portraitMorph2Expr!)
      : mix(tintA!.w, tintB!.w, portraitMorphExpr!)
    : null;

  /** Portrait disc size floor — kept barely non-zero ONLY so the quad never
   * degenerates. A backdrop cell (ink 0) MUST collapse to nothing: it is the
   * vanishing of the backdrop that makes the subject read. Anything larger
   * leaves ~48% of the cloud (the cells that are subject in only one of the two
   * headshots, plus the dissolve band) drawn as a ghost fringe. */
  const PORTRAIT_SIZE_MIN = 0.06;
  /** Portrait disc size gained at full ink — carries essentially the whole
   * tonal signal, since the floor above is now negligible. */
  const PORTRAIT_SIZE_INK = 0.94;

  // === Sub-pixel COVERAGE COMPENSATION (portrait only) =====================
  // The renderer runs with `antialias: false` (Scene.tsx), so there is no MSAA
  // and a quad narrower than one device pixel CANNOT attenuate: the rasterizer
  // either shades a whole fragment at the disc term's full value
  // (smoothstep(0.5,0.34,rr) = 1 at rr≈0) or misses it entirely. Coverage
  // therefore saturates at one whole pixel, and every low-ink disc in the
  // sub-pixel band paints an isolated FULL-BRIGHTNESS near-white pixel on the
  // jittered lattice — the ragged pale fringe beside the head and shoulders.
  // Size is the only tonal control down there and it has stopped working.
  //
  // Fix: fold the size deficit back into alpha (standard antialiased
  // point-sprite coverage compensation), `alpha *= cov²` with
  // `cov = clamp(diameterPx / threshold, 0, 1)`.
  //
  // THRESHOLD: 1.25 devpx, NOT 2.0. The rasterizer floors a sub-pixel disc at
  // one whole pixel, so the energy deficit normalizes at ~1.1–1.2 devpx; a 2.0
  // denominator over-corrects and thins the SUBJECT's own soft edge (the ink
  // 0.14–0.23 shell, whose 1.6–2.1 devpx discs are already correctly sized).
  // Spacing-relative form preferred where the caller supplies `spacingDev`:
  // diameter = 2·f·spacingDev exactly, so `0.35·spacingDev` keeps the
  // correction tracking stage size and dpr instead of assuming a retina layout.
  const PORTRAIT_COV_MIN_PX = Math.max(
    1.25,
    0.35 * (portrait?.spacingDev ?? 0),
  );
  const uPortraitCovPx = hasPortraitSize
    ? (uniform(PORTRAIT_COV_MIN_PX) as UniformNode<number>)
    : null;
  // Device-px disc DIAMETER as a self-contained EXPRESSION (never an outer
  // `.toVar()` — see the VaryingNode hazard documented above: a varying built
  // from an outer var is written at the top of vertex main() and carries that
  // var's INITIAL value forever). This mirrors `sizeNode` below EXACTLY, with
  // its own `hash(instanceIndex)` where `sizeNode` uses `heroRandExpr` (the
  // same hash of the same seed → bit-identical value) and the `/dist` divide
  // deferred to the fragment via `vPortraitDistF`.
  //
  // EXACTNESS NOTE: omitting `sizeFD` here is exact — NOT an approximation —
  // only because `uSizeComp`/`uSizeComp2`/`uSizeComp3` are hard-set to 1 on the
  // portrait path (FounderPortraitMorph.tsx, the `built.uSizeComp*` pins right
  // after the build call) and never animated — including on the 3-target
  // founders chain, where `uMorph2` DOES animate and would otherwise make
  // `sizeFC` a live term. If anyone ever animates them, this varying silently
  // DESYNCHRONISES from the real disc size and the coverage term starts lying.
  // Fold `sizeFD` in here if that day comes.
  const portraitSizePxExpr = hasPortraitSize
    ? (uPointSize as unknown as AnyNode)
        .mul(uPixelRatio as unknown as AnyNode)
        .mul(
          float(PORTRAIT_SIZE_MIN).add(
            float(PORTRAIT_SIZE_INK).mul(portraitInkExpr!),
          ),
        )
        .mul(float(0.85).add(float(0.3).mul(hash(instanceIndex))))
    : null;
  // View-space distance carried as its own varying rather than divided out by a
  // constant CAMERA_Z: the group dollies ±2.2 world units mid-morph, which is
  // up to ±18% error on the diameter otherwise. One extra interpolant.
  const portraitDistExpr = hasPortraitSize
    ? max(
        modelViewMatrix
          .mul(vec4(positionBuffer.toAttribute().xyz, 1.0))
          .z.negate(),
        0.001,
      )
    : null;

  // ===========================================================================
  // RENDER BINDING BUDGET — read this BEFORE adding another morph target.
  // ===========================================================================
  // Two hard DEVICE limits govern this material. Neither is visible to
  // TypeScript, to a code review of the colour/ink chain, or to any test that
  // is not a real WebGPU browser session. Exceeding either makes
  // `CreateRenderPipeline` FAIL, which means the mesh silently never draws —
  // no exception, no visual artefact, just an empty stage plus one console
  // line. That is exactly how the 3-target founders portrait shipped invisible.
  //
  //   (1) maxVertexBuffers = 8.  EVERY `storageBuffer.toAttribute()` in the
  //       render stage costs ONE slot (three binds the storage buffer as a
  //       per-instance vertex buffer — WebGPUAttributeUtils keys its
  //       `vertexBuffers` map by bufferAttribute). Geometry attributes cost
  //       slots too. The index buffer does not.
  //   (2) maxStorageBuffersInVertexStage = 8.  Every distinct storage buffer
  //       read with `.element(i)` in the vertex stage costs one read-only
  //       storage binding instead (WGSLNodeBuilder emits
  //       `var<storage, read>`; getNodeAccess forces READ_ONLY outside
  //       compute). Separate budget, separate ceiling.
  //
  // MEASURED SLOT COUNTS (r184, this material):
  //                                   vertex buffers | vertex-stage storage
  //   hero text (no portrait)                4 of 8  |        0 of 8
  //   portrait, 2 targets                    4 of 8  |        2 of 8
  //   portrait, 3 targets (ships today)      4 of 8  |        3 of 8
  //   ── for comparison, the layout this replaced ──
  //   portrait, 2 targets (all toAttribute)  8 of 8  |        0    ← at the wall
  //   portrait, 3 targets (all toAttribute) 10 of 8  |        0    ← FAILED
  //
  // The 4 vertex buffers are: the quad `position` geometry attribute, plus
  // `positionBuffer`, `velocityBuffer` and `delayBuffer` via `.toAttribute()`.
  // Those three are identical on the hero path, which is why the hero graph is
  // untouched by all of this. The portrait storage bindings are the packed
  // `tintA` / `tintB` / `tintC` vec4s — ONE per target, colour in `.xyz`, ink
  // in `.w`.
  //
  // COST OF A FOURTH TARGET: +1 vertex-stage storage binding (a `tintD`), i.e.
  // 4 of 8. There is room. What there is NOT room for is going back to a
  // buffer-per-attribute layout.
  //
  // AND CHECK THE COMPUTE KERNEL TOO: `simulate` above already binds EIGHT
  // storage buffers (position, velocity, homeA–homeD, start, delay) — it is at
  // 8 of 8 on maxStorageBuffersPerShaderStage. A fifth home target breaks the
  // COMPUTE pipeline before the render budget above is anywhere near spent.
  //
  // UNIFORMS ARE A SEPARATE BUDGET from both tables above (and from the
  // compute kernel's storage wall): the 2026-08-07 flyby attractor — uHole /
  // uHoleStrength / uHoleRadius here, + uHolePull on the spore build — costs
  // ZERO vertex-buffer slots, ZERO storage bindings and ZERO kernel buffers.
  // Any future hole/interaction work must stay uniform-shaped the same way.
  // ===========================================================================
  const material = new MeshBasicNodeMaterial();
  material.vertexNode = Fn(() => {
    // Buffers the COMPUTE KERNEL WRITES are read here via `.toAttribute()`
    // (three #31221): sampler-free, valid in any stage, and the only form that
    // also works under the WebGL fallback. NOTE: `.toAttribute()` on
    // a `"vec3"` storage buffer yields a 4-COMPONENT node — vec3 is padded to
    // 16 bytes in the WebGPU storage layout — so the trailing `.xyz` swizzle is
    // MANDATORY (it is NOT a drop-in for `.element(i).xyz`); without it
    // `vec4(p, 1.0)` becomes 5 components and the shader throws / truncates.
    // The read-only PORTRAIT buffers deliberately do NOT use `.toAttribute()`
    // — see the binding budget above.
    const p = positionBuffer.toAttribute().xyz.toVar();
    // GRAVITATIONAL FLYBY (owner 2026-08-07, amplitude raised in v2: "la
    // scritta non si distorce... dovrebbe distorcere in direzione
    // dell'attuale posizione del buco nero") — displacement-only warp toward
    // the black hole's apparent center (uHole, LOCAL space; parked at 1e9 =
    // off, reversed-edge smoothstep resolves to 0 there). Same falloff
    // family as the crust's attraction; the per-particle falloff makes
    // glyphs NEAREST the hole bend visibly more (tens of px at peak, ~2×
    // bottom-vs-top gradient at the shipping defaults), swinging with the
    // hole's live position as it orbits. Deliberately NO colour term —
    // vSpeedF/vRandF are untouched, warp without any cyan lift. No new
    // varying is introduced;
    // p is displaced BEFORE mv/clip so all four quad corners move together.
    // NOTE: portraitDistExpr/portraitSizePxExpr (outer expressions) read the
    // UNDISPLACED buffer — exact on every shipping path, because the
    // portrait callers never write uHoleStrength (it defaults to 0).
    const toHoleV = holeN.sub(p);
    p.addAssign(
      toHoleV
        .add(1e-5)
        .normalize()
        .mul(smoothstep(holeRadiusN, 0.0, length(toHoleV)).mul(holeStrengthN)),
    );
    // NOTE: speed / rand / assemble are NOT computed here any more. They are
    // outer expression nodes (`heroSpeedExpr` / `heroRandExpr` /
    // `heroAssembleExpr`) fed straight into `varying(...)` — assigning them into
    // outer `.toVar()`s from inside this Fn is the VaryingNode hazard that made
    // all three read their initial constants. Only `heroRandExpr` has a
    // vertex-stage consumer (the size spread below); it reads the expression
    // node directly, which three materialises once (see below).
    // Portrait ink for the size expression below — the SAME expression node the
    // `vInkF` varying is built from, so the disc size and the fragment's fringe
    // alpha read one identical value (three reuses the generated var here rather
    // than recomputing it). The staggered A→B wave inside it matches the one the
    // kernel applies to the anchor (delay = hash(instanceIndex)·0.55, window
    // 0.45), so colour, size and position cross from A to B in lockstep.
    // Hero path: `portraitInkExpr` is null and this contributes nothing.
    const inkNow: AnyNode | null = hasPortraitSize ? portraitInkExpr! : null;
    const mv = modelViewMatrix.mul(vec4(p, 1.0)).toVar();
    const dist = mv.z.negate();
    const clip = cameraProjectionMatrix.mul(mv).toVar();
    // Ink-density compensation: grow the discs as the morph settles into
    // text B (uSizeComp), then re-target text C's density (uSizeComp2) as the
    // second leg settles — so each text reads as bright/dense as the brand.
    const sizeFB = mix(
      float(1.0),
      uSizeComp as unknown as AnyNode,
      smoothstep(0.25, 0.75, morphN),
    );
    const sizeFC = mix(
      sizeFB,
      uSizeComp2 as unknown as AnyNode,
      smoothstep(0.25, 0.75, morph2N),
    );
    const sizeFD = mix(
      sizeFC,
      uSizeComp3 as unknown as AnyNode,
      smoothstep(0.25, 0.75, morph3N),
    );
    // Portrait: tone is carried by SIZE — scale the disc by the blended ink,
    // and NARROW the per-particle random spread (0.85+0.3·rand instead of
    // 0.7+0.7·rand), because the old wide range fights the tonal signal once
    // ink drives size. Hero path keeps its exact original expression.
    const sizeNode = hasPortraitSize
      ? (uPointSize as unknown as AnyNode)
          .mul(uPixelRatio as unknown as AnyNode)
          .mul(
            float(PORTRAIT_SIZE_MIN).add(float(PORTRAIT_SIZE_INK).mul(inkNow!)),
          )
          .mul(float(0.85).add(float(0.3).mul(heroRandExpr)))
          .mul(sizeFD)
          .div(max(dist, 0.001))
      : (uPointSize as unknown as AnyNode)
          .mul(uPixelRatio as unknown as AnyNode)
          .mul(float(0.7).add(float(0.7).mul(heroRandExpr)))
          .mul(sizeFD)
          .div(max(dist, 0.001));
    const corner = positionLocal.xy;
    clip.xy.addAssign(
      corner.mul(sizeNode).div(uViewport as unknown as AnyNode).mul(2.0).mul(clip.w),
    );
    return clip;
  })();

  const vQuadUv = varying(positionLocal.xy);
  // All built from expressions, not from outer vars — see the comments on the
  // `heroSpeedExpr` block and on `portraitMorphExpr` for why that distinction
  // is load-bearing.
  const vSpeedF = varying(heroSpeedExpr);
  const vRandF = varying(heroRandExpr);
  const vAssembleF = varying(heroAssembleExpr);
  const vInkF = hasPortraitSize ? varying(portraitInkExpr!) : null;
  // Sub-pixel coverage inputs (portrait only): the disc diameter BEFORE the
  // perspective divide, and the view-space distance to divide it by.
  const vSizePxF = hasPortraitSize ? varying(portraitSizePxExpr!) : null;
  const vPortraitDistF = hasPortraitSize ? varying(portraitDistExpr!) : null;

  // Portrait travel tint (HDR cyan) + emissive — created only on the portrait
  // path so the hero fragment graph is unchanged.
  const uTravelTint = portrait
    ? (uniform(new Color().fromArray(portrait.travelTint ?? [0.16, 2.4, 3.0])) as UniformNode<ColorLike>)
    : null;
  // Live-tunable emissive on the portrait path (uniform, not a baked constant)
  // so the human can dial face brightness without a rebuild. Hero path: null →
  // the fragment keeps its `params.EMISSIVE` constant, byte-identical.
  const uPortraitEmissive = portrait
    ? (uniform(portrait.emissive ?? 1) as UniformNode<number>)
    : null;
  /** Speed→travel-tint gain: fast (mid-flight) discs surge to the HDR cyan. */
  const PORTRAIT_TRAVEL_K = 0.16;

  /**
   * PORTRAIT COLOUR — resolved ENTIRELY in the vertex stage and handed to the
   * fragment as ONE vec3 varying (`vPortraitColorF`).
   *
   * This used to be assembled in the fragment `Fn` from three separate
   * `colorXBuffer.toAttribute().xyz` reads plus two stagger varyings. It moved
   * here for two reasons, in this order of importance:
   *   1. BINDING BUDGET (see the block above `material.vertexNode`). The reads
   *      are now `.element(instanceIndex)` on the packed tint vec4s, and
   *      `instanceIndex` is only a real builtin in the vertex and compute
   *      stages — in the fragment stage `IndexNode.generate` silently wraps it
   *      in a varying, which would turn one per-instance load into a
   *      per-PIXEL storage read across every disc's coverage.
   *   2. It is EXACT, not an approximation. All four quad vertices of an
   *      instance carry identical per-instance values, so interpolating the
   *      finished colour is bit-equivalent to interpolating the inputs and
   *      blending per-fragment — and it replaces 3 colour + 2 scalar
   *      interpolants with 1.
   *
   * The blend is CHAINED — mix(mix(A,B,m1), C, m2) — mirroring the kernel's
   * `target` exactly, so colour, ink and position cross targets in lockstep.
   * `.xyz` here is a genuine vec4 swizzle, NOT the `"vec3"`-padding workaround:
   * a `.element()` read of a `"vec4"` buffer is a true 4-component value.
   *
   * VaryingNode discipline: built by JS-level composition of plain node
   * expressions. Do NOT rewrite this as an outer `.toVar()` that a vertex `Fn`
   * `.assign()`s into — three writes every varying at the TOP of vertex
   * `main()`, before any `Fn` body runs, so such a varying would carry the
   * var's declared initial value forever. That is the bug that pinned
   * `vMorphColorF` at 0 (every face stuck on target A) once already.
   */
  const portraitColorExpr = hasPortrait
    ? (() => {
        let base = mix(tintA!.xyz, tintB!.xyz, portraitMorphExpr!);
        if (hasPortraitC) {
          base = mix(base, tintC!.xyz, portraitMorph2Expr!);
        }
        // Travel glow: fast (mid-flight) discs surge toward HDR cyan → the >1.0
        // values feed the selective bloom; at rest speed≈0 so faces stay photo.
        base = mix(
          base,
          (uTravelTint as unknown as AnyNode).toVec3(),
          clamp(heroSpeedExpr.mul(PORTRAIT_TRAVEL_K), 0.0, 1.0),
        );
        return base.mul(uPortraitEmissive as unknown as AnyNode);
      })()
    : null;
  const vPortraitColorF = hasPortrait ? varying(portraitColorExpr!) : null;

  const shade = Fn(() => {
    const rr = length(vQuadUv);
    // Portrait: a much crisper disc edge — the hero's soft mote (0.5→0.12
    // feather) averages overlapping photographic discs into mush; a tight
    // edge lets depth-tested neighbours resolve facial detail. Hero path
    // unchanged (byte-identical contract).
    const a = (
      hasPortrait ? smoothstep(0.5, 0.34, rr) : smoothstep(0.5, 0.12, rr)
    ).toVar();
    let col: AnyNode;
    if (hasPortrait) {
      // The whole A→B→C blend + travel tint + emissive is resolved in the
      // VERTEX stage and arrives as one interpolant — see `portraitColorExpr`.
      // Nothing portrait-specific may read a storage buffer down here: doing so
      // drags `instanceIndex` into the fragment stage as a varying and turns a
      // per-instance load into a per-pixel one.
      col = vPortraitColorF!;
    } else {
      const t = clamp(vSpeedF.mul(0.5), 0.0, 1.0);
      col = mix(uColCold as unknown as AnyNode, uColHot as unknown as AnyNode, t)
        .toVec3()
        .mul(float(1.0).add(vSpeedF.mul(0.25)))
        .mul(float(0.75).add(float(0.4).mul(vRandF)))
        .mul(float(params.EMISSIVE));
    }
    const alpha = a
      .mul(float(params.POINT_ALPHA))
      .mul(uFade as unknown as AnyNode)
      .mul(vAssembleF)
      .toVar();
    // Portrait: the ink term must reach EXACTLY 0 at ink 0 so a backdrop cell
    // disappears rather than lingering as a pale fringe. Smoothsteps (never a
    // step) keep the subject's own faint edge fading smoothly instead of
    // clipping to a hard cut-out. The Discard below then removes the
    // true-zero particles entirely.
    if (hasPortraitSize) {
      // (a) TONAL KNEE — deliberately NARROW and UNSQUARED. The previous wide
      // squared knee (`smoothstep(0.03, 0.35, ink)²`) was compensating for a
      // BACKDROP problem, and it paid for it with the subject: the whole mid
      // band where facial detail lives was dimmed, which is why the faces read
      // as less defined. Two independent changes make the narrow knee safe:
      //   1. The sampler's border-seeded flood fill now drives true backdrop to
      //      EXACTLY 0 ink (sampleImagePoints.ts), so there is no wall
      //      population left to ghost — alpha no longer has to suppress one.
      //   2. The sub-pixel coverage compensation below still handles every disc
      //      under the rasterizer's one-pixel floor, which is the other half of
      //      what the wide knee was doing by hand.
      // What remains is a short fade-in off zero so the subject's own faint
      // edge (and the dissolve band) still ramps smoothly instead of clipping
      // to a cut-out. The FACE (ink ≫ 0.10) gets exactly 1.0, untouched.
      alpha.mulAssign(smoothstep(0.0, 0.1, vInkF!));
      // (b) SUB-PIXEL COVERAGE COMPENSATION — see PORTRAIT_COV_MIN_PX. With
      // `antialias:false` a disc narrower than a device pixel is shaded at FULL
      // intensity over one whole fragment, so its energy must be scaled back by
      // hand. cov is EXACTLY 1 for every disc at or above the threshold, which
      // is the guarantee that full-ink face discs (~8.4 devpx ≈ 2× spacing) are
      // untouched; it is a smooth quadratic ramp below it, so the subject's own
      // faint edge fades rather than clipping.
      const cov = clamp(
        vSizePxF!.div(vPortraitDistF!).div(uPortraitCovPx as unknown as AnyNode),
        0.0,
        1.0,
      ).toVar();
      alpha.mulAssign(cov.mul(cov));
    }
    // Portrait cull stays at 0.02, but the narrow knee above changed what it
    // MEANS, and the new meaning is what makes it safe. Under the old wide
    // squared knee 0.02 corresponded to ink ≈ 0.105 — with today's knee that
    // same ink is a fully opaque disc, so keeping the old pairing would clip
    // the subject. Re-derived against the current terms
    // (alpha = smoothstep(0,0.1,ink)·cov², POINT_ALPHA 1) the threshold now
    // culls only ink ≲ 0.018 in the spacing-relative worst case (covPx =
    // 0.35·spacingDev) and ink ≲ 0.008 whenever cov has already saturated:
    // i.e. sub-2%-opacity sub-pixel discs over a near-black stage, genuinely
    // invisible, while the faint-edge band the knee is there to preserve
    // (ink 0.02–0.1) survives. It still keeps near-invisible fragments out of
    // the HDR/selective-bloom pass. JS ternary on a BUILD-TIME boolean → the
    // hero emits the literal 0.004 verbatim.
    Discard(alpha.lessThan(hasPortraitSize ? 0.02 : 0.004));
    return vec4(col, alpha);
  })();
  material.colorNode = (shade as AnyNode).xyz;
  material.opacityNode = (shade as AnyNode).w;
  material.transparent = true;
  // Portrait: normal blending, depth OFF (one particle per cell → nothing to
  // occlude; depth-testing overlapping discs mottles/tears luminance edges);
  // hero: additive, depth off (byte-identical to before).
  material.depthWrite = hasPortrait ? (portrait!.depthWrite ?? false) : false;
  material.depthTest = hasPortrait ? (portrait!.depthTest ?? false) : false;
  material.blending = hasPortrait
    ? portrait!.blending === "additive"
      ? AdditiveBlending
      : NormalBlending
    : AdditiveBlending;
  material.toneMapped = false;
  material.side = DoubleSide;

  function tick(p: { dt: number; time: number }) {
    uDelta.value = p.dt;
    uTime.value = p.time;
    gl.compute(simulate);
  }

  return {
    geometry,
    material,
    uMorph,
    uMorph2,
    uMorph3,
    uFade,
    uSpread,
    uAssemble,
    uSizeComp,
    uSizeComp2,
    uSizeComp3,
    uPointSize,
    uPixelRatio,
    uViewport,
    uEmissive: uPortraitEmissive ?? undefined,
    uHole,
    uHoleStrength,
    uHoleRadius,
    tick,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

// ===========================================================================
// STATIC fallback — analytic billboard (TSL / flag-ON, non-WebGPU backends)
// ===========================================================================
// FLYBY NOTE (owner 2026-08-07): the black-hole flyby attractor (uHole /
// uHoleStrength on the spore + text-morph builds above) is deliberately NOT
// mirrored here or in the GLSL twin (gpgpuRenderShader.ts): holeField's only
// writer — HomeSingularity — is gated to the TRUE-WebGPU compute backend,
// the exact same gate that routes the hero AWAY from these static builds, so
// the pathway can never be live on a frame this material draws. Adding it to
// one twin only would break the documented GLSL/TSL lockstep for dead code.
export interface GpgpuStaticNodeBuild {
  geometry: InstancedGeoLike;
  material: NodeMaterialLike;
  uFade: UniformNode<number>;
  uPointSize: UniformNode<number>;
  uPixelRatio: UniformNode<number>;
  uViewport: UniformNode<unknown>;
  uEmissive: UniformNode<number>;
  uPointAlpha: UniformNode<number>;
  /** Model-space cursor (push center). Far value when not hovering → falloff→0. */
  uMouse: UniformNode<Vec3Like>;
  /** Eased global hover intensity 0..1 — gates the lift in/out for a soft settle. */
  uHover: UniformNode<number>;
  /** Animation clock for the lifted-particle shimmer. */
  uTime: UniformNode<number>;
  /** Push radius in model space (live from fxStore.gpgpuRadius). */
  uRadius: UniformNode<number>;
  /** Push strength (live from fxStore.gpgpuPush). */
  uPush: UniformNode<number>;
  dispose: () => void;
}

/**
 * Build the FALLBACK hero render on the WebGPURenderer — each instance is
 * placed at its HOME position read from a per-instance `aHome` vec3 attribute
 * (a CRISP dense violet "52", no storage/texture reads) and then ANALYTICALLY
 * displaced near the cursor: particles within `uRadius` of the model-space
 * mouse lift outward + toward the camera, shifting violet→CYAN (glowing)
 * gated by the eased `uHover`, and settle back smoothly when the cursor
 * leaves. Stateless (no sim, no compute) so it is robust on EVERY backend —
 * this is where the `spores` mode degrades when true-WebGPU compute is
 * unavailable (WebGL2 sub-backend, three #31221).
 *
 * SAME perspective-scaled device-pixel billboard math as the compute renders;
 * additive, soft round disc, selective-bloom HDR contract preserved.
 * GLSL twin: createGpgpuStaticBuild in gpgpuRenderShader.ts (kept in lockstep,
 * same displacement + color math).
 */
export function createStaticParticleNodeBuild(
  webgpu: WebGPUSymbolsGpgpu,
  tsl: TslSymbolsGpgpu,
  homeRGBA: Float32Array,
  aRef: Float32Array,
  count: number,
  config: GpgpuConfig,
): GpgpuStaticNodeBuild {
  const {
    InstancedBufferGeometry,
    BufferAttribute,
    InstancedBufferAttribute,
    MeshBasicNodeMaterial,
    Color,
    Vector2,
    Vector3,
    AdditiveBlending,
    DoubleSide,
  } = webgpu;
  const {
    uniform,
    attribute,
    positionLocal,
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
    fract,
    dot,
    mix,
    smoothstep,
    Discard,
    varying,
  } = tsl;

  // aHome = vec3 per particle, SAME row-major order as aRef (strip the w).
  const aHome = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    aHome[i * 3] = homeRGBA[i * 4];
    aHome[i * 3 + 1] = homeRGBA[i * 4 + 1];
    aHome[i * 3 + 2] = homeRGBA[i * 4 + 2];
  }

  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(QUAD_CORNERS), 3),
  );
  geometry.setIndex(new BufferAttribute(new Uint16Array(QUAD_INDEX), 1));
  geometry.setAttribute("aRef", new InstancedBufferAttribute(aRef, 2));
  geometry.setAttribute("aHome", new InstancedBufferAttribute(aHome, 3));
  geometry.instanceCount = count;

  const uPointSize = uniform(config.POINT_SIZE) as UniformNode<number>;
  const uPixelRatio = uniform(1) as UniformNode<number>;
  const uViewport = uniform(new Vector2(1, 1)) as UniformNode<unknown>;
  const uFade = uniform(1) as UniformNode<number>;
  const uPointAlpha = uniform(config.POINT_ALPHA) as UniformNode<number>;
  const uEmissive = uniform(config.EMISSIVE) as UniformNode<number>;
  const uColCold = uniform(
    new Color().fromArray(config.COL_COLD),
  ) as UniformNode<ColorLike>;
  const uColHot = uniform(
    new Color().fromArray(config.COL_HOT),
  ) as UniformNode<ColorLike>;

  // --- Analytic dispersion uniforms (fed per-frame by HeroLogo) -------------
  // Far value at rest → falloff resolves to 0 (no displacement); HeroLogo
  // pushes the real model-space cursor in only while hovering.
  const uMouse = uniform(new Vector3(1e5, 1e5, 1e5)) as UniformNode<Vec3Like>;
  const uHover = uniform(0) as UniformNode<number>;
  const uTime = uniform(0) as UniformNode<number>;
  const uRadius = uniform(config.RADIUS) as UniformNode<number>;
  const uPush = uniform(config.PUSH) as UniformNode<number>;

  const aHomeNode = attribute("aHome");
  const aRefNode = attribute("aRef");

  // Per-instance pseudo-random (size variance), same hash as the live build.
  const vRandSrc = fract(
    sin(dot(aRefNode.xy, vec2(127.1, 311.7))).mul(43758.5453123),
  ).toVar();

  // Carry the per-particle lift (displacement amount) to the fragment so the
  // color shifts violet→cyan exactly where the surface is disturbed. The lift
  // is a SELF-CONTAINED expression (a pure function of aHome/uMouse/uRadius/
  // uHover) fed straight into `varying(...)` below — NEVER an outer `.toVar()`
  // the vertex Fn `.assign()`s into. Three writes every varying at the TOP of
  // vertex main(), BEFORE the vertexNode body runs, so an outer-var varying is
  // frozen at its declared initial value forever (full VaryingNode hazard note
  // on `portraitMorphExpr` above) — which is exactly how vLiftF read a
  // constant 0 here: particles displaced under the cursor but stayed pure
  // violet at rest brightness. The vertex body reuses these SAME nodes for the
  // displacement, so vertex and fragment can never diverge.
  //   fromMouse = aHome - uMouse; d = length(fromMouse);
  //   falloff   = smoothstep(uRadius, 0, d);   // 1 at cursor, 0 at/after radius
  //   lift      = falloff * uHover;            // gated by the eased global hover
  const fromMouse = aHomeNode.xyz.sub(uMouse as unknown as AnyNode);
  const liftExpr = smoothstep(
    uRadius as unknown as AnyNode,
    0.0,
    length(fromMouse),
  ).mul(uHover as unknown as AnyNode);

  const material = new MeshBasicNodeMaterial();
  material.vertexNode = Fn(() => {
    // ANALYTIC dispersion — displace the home center near the cursor (model
    // space). GLSL twin in gpgpuRenderShader.ts must stay in lockstep. The
    // dispersion math itself (`fromMouse`/`liftExpr`) lives OUTSIDE this Fn,
    // shared with the vLiftF varying (VaryingNode hazard, above).
    const home = aHomeNode.xyz.toVar();

    const dir = fromMouse.add(1e-5).normalize();
    const center = home
      // push outward in-plane …
      .add(dir.mul(liftExpr.mul(uPush as unknown as AnyNode)))
      // … plus a little toward the camera (+z) so the lifted ones read.
      .add(vec3(0.0, 0.0, liftExpr.mul(uPush as unknown as AnyNode).mul(0.5)))
      .toVar();
    // Subtle shimmer on LIFTED particles only (resting skin stays crisp).
    const time = uTime as unknown as AnyNode;
    center.addAssign(
      vec3(
        sin(home.y.mul(6.0).add(time.mul(1.3))),
        sin(home.z.mul(6.0).add(time.mul(1.7))),
        sin(home.x.mul(6.0).add(time.mul(1.1))),
      ).mul(liftExpr.mul(0.04)),
    );

    // SAME billboard math as the compute renders, around the displaced center.
    const mv = modelViewMatrix.mul(vec4(center, 1.0)).toVar();
    const dist = mv.z.negate();
    const clip = cameraProjectionMatrix.mul(mv).toVar();
    const sizeNode = (uPointSize as unknown as AnyNode)
      .mul(uPixelRatio as unknown as AnyNode)
      .mul(float(0.7).add(float(0.9).mul(vRandSrc)))
      .div(max(dist, 0.001));
    const corner = positionLocal.xy;
    clip.xy.addAssign(
      corner.mul(sizeNode).div(uViewport as unknown as AnyNode).mul(2.0).mul(clip.w),
    );
    return clip;
  })();

  const vQuadUv = varying(positionLocal.xy);
  const vRandF = varying(vRandSrc);
  const vLiftF = varying(liftExpr);

  const shade = Fn(() => {
    const r = length(vQuadUv);
    const a = smoothstep(0.5, 0.18, r).toVar();
    // Color: violet→cyan by lift (like the GPGPU render did by speed). At rest
    // lift≈0 → pure violet skin; lifted/hovered particles glow toward cyan.
    //   t = clamp(lift*1.2, 0, 1); col = mix(cold, hot, t);
    //   col *= (1 + lift*0.8); col *= (0.7 + 0.5*rand); col *= uEmissive;
    const t = clamp(vLiftF.mul(1.2), 0.0, 1.0);
    const col = mix(
      uColCold as unknown as AnyNode,
      uColHot as unknown as AnyNode,
      t,
    )
      .toVec3()
      .mul(float(1.0).add(vLiftF.mul(0.8)))
      .mul(float(0.7).add(float(0.5).mul(vRandF)))
      .mul(uEmissive as unknown as AnyNode);
    const alpha = a
      .mul(uPointAlpha as unknown as AnyNode)
      .mul(uFade as unknown as AnyNode)
      .toVar();
    Discard(alpha.lessThan(0.004));
    return vec4(col, alpha);
  })();
  material.colorNode = (shade as AnyNode).xyz;
  material.opacityNode = (shade as AnyNode).w;
  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = false;
  material.blending = AdditiveBlending;
  material.toneMapped = false;
  material.side = DoubleSide;

  return {
    geometry,
    material,
    uFade,
    uPointSize,
    uPixelRatio,
    uViewport,
    uEmissive,
    uPointAlpha,
    uMouse,
    uHover,
    uTime,
    uRadius,
    uPush,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
