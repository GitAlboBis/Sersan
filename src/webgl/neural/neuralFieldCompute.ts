/**
 * Signal-stream particle build — the WebGL half of the 2026-08-21 "SIGNAL
 * STREAM" refactor (replaces the FIX 3 orb-triangle/arc field; file name kept
 * so NeuralLattice's lazy import stays put). Round-2 "life pass" (owner:
 * beauty pass — AT luminous nebula streaks + igloo crisp ignition rings):
 * phase-separated braid, flow-t edge fades, velocity-stretched sprites,
 * white-cyan→cyan→blue ramp, asymmetric surge head with comet tail, clean
 * fracture gap + spark burst (role 2), ring shockwave, idle breathing/shimmer.
 *
 * A braided river of particles flows left→right through the section rect.
 * Per-particle homes are computed IN-SHADER from a Catmull-Rom spline of five
 * control-point uniforms (uC0..uC4 — the uHub-style uniform-homes pattern):
 * each particle advances a flow parameter t = fract(basePhase + uTime·speed),
 * evaluates the spline (plus a slight z-bow toward camera at t=0.5), then
 * offsets onto one of four PHASE-SEPARATED twisting STRANDS plus per-particle
 * thickness jitter → a braid, not a line. Nothing but `meta`, per-particle
 * offsets and the reveal seed is baked into buffers, so a resize (or live
 * re-authoring of the meander) is a uniform update — NO rebuild.
 *
 *   - broken  (uBroken=1): past uFracture the particle loses the spline home
 *     and disperses into slow drifting debris (analytic drift here; wander
 *     force via unifiedForceStep on the compute tier), dimming through the
 *     ember ramp at ≤ DEBRIS_ALPHA_MAX. The break is CLEAN: a FRACTURE_GAP_T
 *     wide zero-alpha gap separates the last coherent x from the debris
 *     field. uSurgeT/uSurgeAmp/uFlash paint the surge that rides in from the
 *     left and DIES at the fracture with a >1.0 emissive flash — which also
 *     fires the SPARK BURST: SPARK_COUNT dedicated role-2 particles take a
 *     ~0.5s analytic outward kick + bright white-cyan flash, then die (park
 *     invisibly until the next flash). uRecohere is the hover tease — debris
 *     briefly pulls back toward the spline, then falls apart again.
 *   - healthy (uBroken=0): a RING_FRACTION of the particles are GUIDE-RING
 *     particles on three CRISP tori perpendicular to the flow at RING_T
 *     (halved tube, doubled density, slightly whiter than the stream); stream
 *     particles tighten stepwise (width envelope 1→~0.61 + spring gain) as
 *     they pass each ring. uRingFlash[i] (bumpCluster / surge crossings)
 *     fires each ring's >1.0 ignition flash AND a radial shockwave (ring
 *     radius ripples 1→1.25 as the flash decays); uRingGlow[i] is the damped
 *     hover flare.
 *
 * BACKEND CONTRACT (unchanged, mirrors gpgpuNodeSim.ts):
 *   - True-WebGPU compute path: storage buffers (`instancedArray`) advanced by
 *     a compute kernel through the shared unifiedForceStep. Render reads
 *     buffers via `.toAttribute().xyz` ONLY — the trailing `.xyz` is MANDATORY
 *     on a `"vec3"` buffer (padded to 16B). `.element(i)` on STORAGE buffers is
 *     COMPUTE-STAGE ONLY (three #31221); uniformArray `.element()` is fine in
 *     any stage. Buffer budget: 4 storage buffers in compute, 4
 *     `.toAttribute()` vertex-buffer slots in render (round-2 adds the
 *     velocity read for the streak stretch) — 5 of the 8 slots total with the
 *     quad position, still well inside the walls.
 *   - Non-compute path (WebGPURenderer WebGL2 sub-backend): the ANALYTIC
 *     build — particles sit at their reveal-blended home with a cheap shimmer
 *     and a mild fixed tangent elongation. Because the home is a pure
 *     function of uTime, the flow, surges, ring flashes/shockwaves, fracture
 *     and spark burst all still animate; only the physical debris inertia and
 *     the pointer bend are compute-only.
 *
 * All `three/webgpu` + `three/tsl` symbols are passed IN (caller lazy-imports
 * inside the webgpuEnabled()-gated effect — never module scope).
 *
 * Material contract (selective bloom): `MeshBasicNodeMaterial`, additive,
 * `toneMapped:false`, `depthWrite:false`, `depthTest:false`; output color
 * exceeds luminance 1.0 (emissive >1.0) so the threshold≈1.0 bloom catches it.
 *
 * VARYING DISCIPLINE (load-bearing): every varying below is a SELF-CONTAINED
 * expression (a pure function of attributes/storage reads + uniforms) fed
 * straight into `varying(...)`, and the SAME nodes are reused by the vertex
 * body — NEVER an outer `.toVar()` the vertex Fn `.assign()`s into. Three
 * writes every varying at the TOP of vertex main(), so an outer-var varying is
 * frozen at its initial value forever (VaryingNode hazard, gpgpuNodeSim.ts).
 * Round-2 folds ALL color math into the vertex stage (per-instance constants
 * anyway): the fragment receives vColor (premultiplied tone×emissive), vAlpha
 * and the quad UV — fewer scalars than the draft's five varyings.
 *
 * ROUND-3 "DE-CARD" STREAM v3 (2026-08-21 §B — the panes are gone, the river
 * owns the whole rows-stack band). Everything below is UNIFORMS + one new
 * float varying — the 4-storage-buffer / 5-vertex-slot budget is untouched:
 *   1. VERTICAL WEAVE — mode-authored y on the spline control points (config;
 *      pure uC0..4 re-author, zero shader change) + the ~44px envelope
 *      rescale for the taller band.
 *   2. CURL MICRO-TURBULENCE (compute tier only) — analytic 2-octave curl of
 *      a sin/cos vector potential displaces the strand offsets so filaments
 *      shred organically; the static tier keeps the analytic twist.
 *   3. ROW-REACTIVE CURRENT — uRowGlow[3] (uniformArray, driven from the DOM
 *      rows' setHovered): broken = gaussian brightness+thickness swell at the
 *      row's stream zone; healthy = the segment between ring i-1 and i
 *      tightens + brightens. The driver also fires a BIGGER re-cohere tease
 *      on broken row ignition (RECOHERE_ROW_BOOST).
 *   4. DEPTH-DOF ILLUSION — size × alpha modulated by the z-bow (far =
 *      smaller/dimmer; near = bigger + a SOFTER disc falloff via the new
 *      vSoft varying) — a cheap bokeh read, no post.
 */
import {
  unifiedForceStep,
  type TslSymbolsGpgpu,
} from "../gpgpu/gpgpuNodeSim";
import {
  COL_CORE,
  COL_CYAN,
  COL_BLUE,
  COL_EMBER,
  COL_EMBER2,
  STREAM_CTRL,
  STRAND_COUNT,
  STRAND_RADIUS,
  STRAND_THICKNESS,
  STRAND_PHASES,
  STRAND_THICK_BIAS,
  STRAND_RATE_BASE,
  STRAND_RATE_STEP,
  BRAID_TURNS,
  FLOW_SPEED,
  EDGE_FADE_IN,
  EDGE_FADE_OUT,
  STREAM_Z_BOW,
  CORE_SIZE_BOOST,
  FRINGE_SIZE_DROP,
  STRETCH_GAIN,
  STRETCH_MAX,
  STATIC_ELONG,
  SURGE_ADVECT,
  BREATHE_AMP,
  BREATHE_PERIOD,
  SHIMMER_AMP,
  RING_T,
  RING_RADIUS,
  RING_TUBE,
  RING_RADIAL_JITTER,
  RING_FRACTION,
  RING_SPIN,
  RING_WHITE,
  RING_SHOCKWAVE,
  TIGHTEN_PER_RING,
  RING_SPRING_GAIN,
  RING_PROX_K,
  FRACTURE_T,
  FRACTURE_WINDOW,
  FRACTURE_GAP_T,
  DEBRIS_GAP,
  DEBRIS_ALPHA_MAX,
  DEBRIS_SPREAD,
  DEBRIS_FADE,
  DEBRIS_WANDER_ACC,
  SPARK_COUNT,
  SPARK_REACH,
  SURGE_K,
  SURGE_TAIL,
  SURGE_GAIN,
  FLASH_K,
  FLASH_GAIN,
  RING_FLASH_GAIN,
  STREAM_EMISSIVE,
  RING_EMISSIVE,
  STREAM_ALPHA,
  NEURAL_POINT_SIZE,
  RING_POINT_SIZE_BOOST,
  NEURAL_DEPTH_ATTEN,
  DEPTH_Z_RANGE,
  ROW_ZONE_T,
  ROW_ZONE_K,
  ROW_SEG_START,
  ROW_SEG_FEATHER,
  ROW_GAIN,
  ROW_SWELL,
  ROW_TIGHTEN_RATIO,
  CURL_GAIN,
  CURL_SCALE,
  CURL_FREQ,
  CURL_FREQ_2,
  CURL_AMP_2,
  CURL_SPEED,
  CURL_SPEED_2,
  DOF_FAR_DIM,
  DOF_SOFT_MIN,
  DOF_SIZE_GAIN,
  NEURAL_SPRING,
  NEURAL_DAMPING,
  NEURAL_MAX_SPEED,
  WRAP_SNAP_DIST,
  SPARK_SNAP_DIST,
  POINTER_PUSH,
  POINTER_RADIUS,
  SEED_SCATTER_XY,
  SEED_SCATTER_Z,
  type LatticeMode,
} from "./neuralLatticeConfig";

// Loose structural typings — the real node/namespace types are vast & generic
// (same rationale as gpgpuNodeSim.ts).
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

export interface NeuralFieldUniforms {
  uTime: { value: number };
  /** 0→1 section fade (assemble-in from a loose cloud onto homes). */
  uReveal: { value: number };
  /** 0 healthy · 1 broken. */
  uBroken: { value: number };
  /** Base flow speed along the stream. */
  uFlowSpeed: { value: number };
  /** Fracture flow-t position (broken). */
  uFracture: { value: number };
  /** 0→1 hover tease — debris re-coheres toward the spline (broken). */
  uRecohere: { value: number };
  /** Surge head flow-t (park < 0 when idle) + its 0..1 amplitude. */
  uSurgeT: { value: number };
  uSurgeAmp: { value: number };
  /** 0→1 fracture death-flash envelope (broken) — also the spark-burst
   * clock: sparks fly/fade as it decays. */
  uFlash: { value: number };
  /** Per-ring damped hover glow, 1 = neutral (write to `.array`). */
  uRingGlow: { array: number[] };
  /** Per-ring ignition flash 0..1 (write to `.array`) — also drives the
   * ring's radial shockwave expansion. */
  uRingFlash: { array: number[] };
  /** The 5 spline control points (LOCAL space vec3). */
  uC0: { value: { set: (x: number, y: number, z: number) => unknown } };
  uC1: { value: { set: (x: number, y: number, z: number) => unknown } };
  uC2: { value: { set: (x: number, y: number, z: number) => unknown } };
  uC3: { value: { set: (x: number, y: number, z: number) => unknown } };
  uC4: { value: { set: (x: number, y: number, z: number) => unknown } };
  /** Cursor attractor in LOCAL space (park at 1e9 = off; compute tier only). */
  uPointer: { value: { set: (x: number, y: number, z: number) => unknown } };
  uPixelRatio: { value: number };
  uViewport: { value: { set: (x: number, y: number) => unknown } };
  /** Per-row attention glow 0..1 (write to `.array`) — round-3 row-reactive
   * current, driven from the DOM rows' setHovered by the useFrame driver.
   * broken: gaussian swell at ROW_ZONE_T[i]; healthy: segment ring i-1→i
   * tightens + brightens. */
  uRowGlow: { array: number[] };
  // --- Round-2 live tunables (surfaced on the dev handle) -------------------
  /** Master braid-thickness scale (1 = config rest ≈ 44px visual, round-3). */
  uEnvelope: { value: number };
  /** Idle envelope breathing amplitude (±, BREATHE_PERIOD seconds). */
  uBreathe: { value: number };
  /** Idle per-particle brightness shimmer amplitude (±). */
  uShimmer: { value: number };
  /** z-bow of the spline toward camera at t=0.5 (local units). */
  uZBow: { value: number };
  /** Clean-break zero-alpha gap width past the fracture (flow-t units). */
  uGap: { value: number };
  /** Velocity-stretch: total elongation = 1 + min(|v|·gain, max). */
  uStretchGain: { value: number };
  uStretchMax: { value: number };
  /** Surge-head emissive gain (rides on the >1.0 floor). */
  uSurgeGain: { value: number };
  /** Billboard base size in device px. */
  uPointSize: { value: number };
  /** Per-strand twist phases (rad) — write entries of `.array`. */
  uStrandPhase: { array: number[] };
  /** Per-strand tube-thickness biases — write entries of `.array`. */
  uStrandThick: { array: number[] };
  // --- Round-3 live tunables ------------------------------------------------
  /** Curl micro-turbulence gain (× CURL_SCALE displacement; compute tier
   * only — the static graph never reads it). */
  uCurl: { value: number };
  /** Depth-DOF strength 0..1 (0 = the round-2 flat look). */
  uDof: { value: number };
  /** Row-glow emissive boost at full attention. */
  uRowGain: { value: number };
  /** Row-glow width response (broken swell + / healthy tighten −·ratio). */
  uRowSwell: { value: number };
}

export interface NeuralFieldBuild {
  geometry: Any;
  material: Any;
  uniforms: NeuralFieldUniforms;
  /** Dispatch the compute step with a clamped frame delta (no-op on static). */
  compute: (delta: number) => void;
  dispose: () => void;
}

export interface NeuralFieldBuildArgs {
  THREE: typeof import("three");
  webgpu: Any;
  tsl: Any;
  /** The renderer (its `.compute()` dispatches the kernel). */
  gl: Any;
  /** True only on the genuine WebGPU compute sub-backend. */
  backendIsWebGPU: boolean;
  count: number;
  /** Which stream this build paints — decides the ring-particle allocation. */
  mode: LatticeMode;
}

const QUAD_CORNERS = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];

/** Deterministic [0,1) hash — the EXACT formula the compute kernel re-derives
 * for the reveal seed (fract(sin(i·127.1 + 311.7)·43758.545) family), so the
 * baked seed buffer and the kernel's analytic seed agree. */
function h(i: number, mulA: number, addB: number): number {
  const s = Math.sin(i * mulA + addB) * 43758.545;
  return s - Math.floor(s);
}

/**
 * Seed the read-only per-particle role buffers. Homes are NOT baked — they
 * derive from the uC0..4 spline uniforms in-shader. Layout:
 *
 *   meta : vec4
 *     role     (0 stream | 1 ring | 2 spark — spark is broken-only, round-2)
 *     aux      (stream: strand index 0..3 ; ring: ring index 0..2 ; spark: 0)
 *     speedVar (stream: 0.7..1.3 flow-speed variance; ring: spin variance;
 *               spark: 0.6..1.4 kick variance)
 *     rnd      (0..1 — tint variance / debris hashes)
 *   offA : vec3
 *     stream: [basePhase 0..1, jitter magnitude 0..1, jitter angle 0..2π]
 *     ring:   [base angle 0..2π, radial jitter −1..1, tube angle 0..2π]
 *     spark:  [burst azimuth 0..2π, spare, elevation −1..1]
 *   seed : vec3 scattered start (reveal coalesce)
 */
function seedBuffers(count: number, mode: LatticeMode) {
  const meta = new Float32Array(count * 4);
  const offA = new Float32Array(count * 3);
  const seed = new Float32Array(count * 3);

  const ringCutoff =
    mode === "healthy" ? Math.floor(count * (1 - RING_FRACTION)) : count;
  // Broken builds dedicate the allocation tail to the surge-death SPARK BURST.
  const sparkStart = mode === "broken" ? count - SPARK_COUNT : count;

  for (let i = 0; i < count; i++) {
    const r0 = h(i, 12.9898, 78.233);
    const r1 = h(i, 39.3467, 11.135);
    const r2 = h(i, 73.156, 52.235);
    const r3 = h(i, 91.318, 27.719);

    if (i >= sparkStart) {
      // SPARK particle (broken only) — analytic burst from the fracture pt.
      meta[i * 4] = 2;
      meta[i * 4 + 1] = 0;
      meta[i * 4 + 2] = 0.6 + r1 * 0.8; // kick variance
      meta[i * 4 + 3] = r3;
      offA[i * 3] = r0 * Math.PI * 2; // burst azimuth
      offA[i * 3 + 1] = r2; // spare
      offA[i * 3 + 2] = (r1 - 0.5) * 2; // elevation −1..1
    } else if (i < ringCutoff) {
      // STREAM particle.
      meta[i * 4] = 0;
      meta[i * 4 + 1] = Math.floor(r0 * STRAND_COUNT) % STRAND_COUNT;
      meta[i * 4 + 2] = 0.7 + r1 * 0.6; // flow-speed variance
      meta[i * 4 + 3] = r3;
      offA[i * 3] = r2; // basePhase
      // Jitter magnitude biased toward the core (sqrt keeps a bright center,
      // a softer fringe) — also the white-cyan→cyan→blue radial tint driver.
      offA[i * 3 + 1] = Math.sqrt(r0);
      offA[i * 3 + 2] = r1 * Math.PI * 2;
    } else {
      // RING particle (healthy only) — even thirds across the three rings.
      const ring = (i - ringCutoff) % 3;
      meta[i * 4] = 1;
      meta[i * 4 + 1] = ring;
      meta[i * 4 + 2] = 0.6 + r1 * 0.8; // spin variance
      meta[i * 4 + 3] = r3;
      offA[i * 3] = r0 * Math.PI * 2; // base angle on the ring
      offA[i * 3 + 1] = (r2 - 0.5) * 2; // radial jitter
      offA[i * 3 + 2] = r1 * Math.PI * 2; // tube angle
    }

    // Scattered seed (loose cloud) — matches the kernel's analytic re-derive.
    seed[i * 3] = (h(i, 127.1, 311.7) - 0.5) * SEED_SCATTER_XY;
    seed[i * 3 + 1] = (h(i, 269.5, 183.3) - 0.5) * SEED_SCATTER_XY;
    seed[i * 3 + 2] = (h(i, 419.2, 371.9) - 0.5) * SEED_SCATTER_Z;
  }

  return { meta, offA, seed };
}

export function createNeuralFieldBuild(
  args: NeuralFieldBuildArgs,
): NeuralFieldBuild {
  const { webgpu, tsl, gl, backendIsWebGPU, count, mode } = args;
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
  } = webgpu as Any;
  const {
    uniform,
    uniformArray,
    attribute,
    instancedArray,
    instanceIndex,
    positionLocal,
    modelViewMatrix,
    cameraProjectionMatrix,
    Fn,
    If,
    vec2,
    vec3,
    vec4,
    float,
    int,
    length,
    max,
    min,
    clamp,
    sin,
    cos,
    floor,
    fract,
    mix,
    pow,
    smoothstep,
    Discard,
    varying,
    select,
    exp,
  } = tsl as Any;

  const { meta, offA, seed } = seedBuffers(count, mode);
  const ctrlInit = STREAM_CTRL[mode];

  // --- Shared uniforms ------------------------------------------------------
  const uTime = uniform(0);
  const uReveal = uniform(0);
  const uBroken = uniform(mode === "broken" ? 1 : 0);
  const uFlowSpeed = uniform(FLOW_SPEED);
  const uFracture = uniform(FRACTURE_T);
  const uRecohere = uniform(0);
  const uSurgeT = uniform(-1);
  const uSurgeAmp = uniform(0);
  const uFlash = uniform(0);
  const uRingGlow = uniformArray([1, 1, 1]);
  const uRingFlash = uniformArray([0, 0, 0]);
  const uC0 = uniform(new Vector3(...ctrlInit[0]));
  const uC1 = uniform(new Vector3(...ctrlInit[1]));
  const uC2 = uniform(new Vector3(...ctrlInit[2]));
  const uC3 = uniform(new Vector3(...ctrlInit[3]));
  const uC4 = uniform(new Vector3(...ctrlInit[4]));
  const uPointer = uniform(new Vector3(1e9, 1e9, 1e9));
  const uPixelRatio = uniform(1);
  const uViewport = uniform(new Vector2(1, 1));
  const uColCore = uniform(new Color(COL_CORE));
  const uColCyan = uniform(new Color(COL_CYAN));
  const uColBlue = uniform(new Color(COL_BLUE));
  const uColEmber = uniform(new Color(COL_EMBER));
  const uColEmber2 = uniform(new Color(COL_EMBER2));
  const uPointSize = uniform(NEURAL_POINT_SIZE);
  // Round-2 live tunables (dev-handle surfaced; defaults from config).
  const uEnvelope = uniform(1);
  const uBreathe = uniform(BREATHE_AMP);
  const uShimmer = uniform(SHIMMER_AMP);
  const uZBow = uniform(STREAM_Z_BOW);
  const uGap = uniform(FRACTURE_GAP_T);
  const uStretchGain = uniform(STRETCH_GAIN);
  const uStretchMax = uniform(STRETCH_MAX);
  const uSurgeGain = uniform(SURGE_GAIN);
  const uStrandPhase = uniformArray([...STRAND_PHASES]);
  const uStrandThick = uniformArray([...STRAND_THICK_BIAS]);
  // Round-3 (§B): row-reactive current + curl turbulence + depth-DOF. All
  // uniforms/uniformArrays — the storage-buffer and vertex-slot budgets are
  // untouched.
  const uRowGlow = uniformArray([0, 0, 0]);
  const uCurl = uniform(CURL_GAIN);
  const uDof = uniform(1);
  const uRowGain = uniform(ROW_GAIN);
  const uRowSwell = uniform(ROW_SWELL);

  // --- Geometry: shared billboard quad + per-instance role attributes -------
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(QUAD_CORNERS), 3),
  );
  geometry.setIndex(new BufferAttribute(new Uint16Array(QUAD_INDEX), 1));
  geometry.setAttribute("aMeta", new InstancedBufferAttribute(meta, 4));
  geometry.setAttribute("aOff", new InstancedBufferAttribute(offA, 3));
  geometry.setAttribute("aSeed", new InstancedBufferAttribute(seed, 3));
  geometry.instanceCount = count;

  // ------------------------------------------------------------------------
  // In-shader spline: Catmull-Rom through the 5 control-point uniforms.
  // ------------------------------------------------------------------------
  function ctrl(idx: Any): Any {
    const i0 = idx.lessThan(float(0.5));
    const i1 = idx.lessThan(float(1.5));
    const i2 = idx.lessThan(float(2.5));
    const i3 = idx.lessThan(float(3.5));
    return select(
      i0,
      uC0,
      select(i1, uC1, select(i2, uC2, select(i3, uC3, uC4))),
    );
  }
  /** Catmull-Rom over 4 equal segments, t ∈ [0,1]. */
  function splineCR(t: Any): Any {
    const x = clamp(t, float(0), float(0.99999)).mul(4.0).toVar();
    const seg = floor(x).toVar();
    const u = x.sub(seg).toVar();
    const p0 = ctrl(max(seg.sub(1.0), float(0))).toVar();
    const p1 = ctrl(seg).toVar();
    const p2 = ctrl(min(seg.add(1.0), float(4))).toVar();
    const p3 = ctrl(min(seg.add(2.0), float(4))).toVar();
    const u2 = u.mul(u);
    const u3 = u2.mul(u);
    return p1
      .mul(2.0)
      .add(p2.sub(p0).mul(u))
      .add(
        p0
          .mul(2.0)
          .sub(p1.mul(5.0))
          .add(p2.mul(4.0))
          .sub(p3)
          .mul(u2),
      )
      .add(p3.sub(p0).add(p1.sub(p2).mul(3.0)).mul(u3))
      .mul(0.5);
  }
  /** The bowed stream center: spline + a slight z-bow toward the camera at
   * t=0.5 (round-2 dimensionality). Every consumer (stream, fracture point,
   * ring centers, spark origin) reads THIS so registration stays exact. */
  function streamCenter(t: Any): Any {
    const tc = clamp(t, float(0), float(1));
    return splineCR(tc).add(
      vec3(float(0), float(0), sin(tc.mul(Math.PI)).mul(uZBow)),
    );
  }

  function ringGlowAt(idx: Any): Any {
    return uRingGlow.element(int(clamp(idx, float(0), float(2)))) as Any;
  }
  function ringFlashAt(idx: Any): Any {
    return uRingFlash.element(int(clamp(idx, float(0), float(2)))) as Any;
  }
  function strandPhaseAt(idx: Any): Any {
    return uStrandPhase.element(int(clamp(idx, float(0), float(3)))) as Any;
  }
  function strandThickAt(idx: Any): Any {
    return uStrandThick.element(int(clamp(idx, float(0), float(3)))) as Any;
  }
  /** Round-3 row glow by JS-literal row index (uniformArray element — legal
   * in any stage, costs no buffer slot). */
  function rowGlowAt(i: number): Any {
    return uRowGlow.element(int(i)) as Any;
  }
  /** Row i's attention window over flow-t — mode-blended by uBroken:
   * broken = gaussian at ROW_ZONE_T[i] (the stream zone nearest the row;
   * row 2 sits ON the fracture), healthy = smooth box over the segment
   * between ring i-1 (or the entry) and ring i (§B.3). */
  function rowWin(t: Any, i: number): Any {
    const dz = t.sub(float(ROW_ZONE_T[i]));
    const gauss = exp(float(ROW_ZONE_K).mul(dz.mul(dz)).negate());
    const lo = i === 0 ? ROW_SEG_START : RING_T[i - 1];
    const hi = RING_T[i];
    const seg = smoothstep(
      float(lo - ROW_SEG_FEATHER),
      float(lo + ROW_SEG_FEATHER),
      t,
    ).mul(
      float(1).sub(
        smoothstep(float(hi - ROW_SEG_FEATHER), float(hi + ROW_SEG_FEATHER), t),
      ),
    );
    return mix(seg, gauss, uBroken);
  }
  /** Σ rowGlow[i] · window_i(t) — 0..~1 "attention at t" (rows are mutually
   * exclusive hover targets, so the sum never stacks in practice). */
  function rowResponse(t: Any): Any {
    let s: Any = float(0);
    for (let i = 0; i < ROW_ZONE_T.length; i++) {
      s = s.add(rowGlowAt(i).mul(rowWin(t, i)));
    }
    return s;
  }

  /** Round-3 curl-noise micro-turbulence (§B.2): analytic curl of a sin/cos
   * vector potential — divergence-free by construction, two octaves, six trig
   * evals per octave. A PURE spatial+time field (no per-particle hash), so
   * neighbours along a filament read coherent offsets and the strands BEND /
   * SHRED organically instead of fuzzing per-particle. Components ∈ ~[-1,1]. */
  function curlAt(p: Any): Any {
    const octave = (freq: number, speed: number): Any => {
      const K = float(freq);
      const t1 = uTime.mul(speed);
      // Potential ψ = (sin a1, sin a2, sin a3) with skewed frequency pairs;
      // curl(ψ) = (1.7K·c3 − K·c2, 1.7K·c1 − K·c3, 1.7K·c2 − K·c1) / (2.7K).
      const a1 = p.y.mul(K).add(p.z.mul(K).mul(1.7)).add(t1);
      const a2 = p.z.mul(K).add(p.x.mul(K).mul(1.7)).add(t1.mul(1.31));
      const a3 = p.x.mul(K).add(p.y.mul(K).mul(1.7)).add(t1.mul(0.87));
      const c1 = cos(a1).toVar();
      const c2 = cos(a2).toVar();
      const c3 = cos(a3).toVar();
      return vec3(
        c3.mul(1.7).sub(c2),
        c1.mul(1.7).sub(c3),
        c2.mul(1.7).sub(c1),
      ).div(2.7);
    };
    return octave(CURL_FREQ, CURL_SPEED)
      .add(octave(CURL_FREQ_2, CURL_SPEED_2).mul(float(CURL_AMP_2)))
      .div(1 + CURL_AMP_2);
  }

  /** Normalized local-z 0 (far) → 1 (near) over the depth range. */
  function zNorm(z: Any): Any {
    return clamp(
      z.div(float(DEPTH_Z_RANGE)).mul(0.5).add(0.5),
      float(0),
      float(1),
    );
  }
  /** Depth-DOF alpha: the FAR half of the z range dims toward DOF_FAR_DIM
   * (far = smaller/dimmer); the near half stays at 1 (§B.4). */
  function dofAlphaAt(z: Any): Any {
    const far01 = clamp(float(1).sub(zNorm(z).mul(2.0)), float(0), float(1));
    return float(1).sub(far01.mul(float(1 - DOF_FAR_DIM)).mul(uDof));
  }
  /** Depth-DOF disc softness 0..1: only the NEAR half softens (bokeh read);
   * mid/far keep the crisp round-2 disc. Feeds the vSoft varying. */
  function dofSoftAt(z: Any): Any {
    const near01 = clamp(zNorm(z).mul(2.0).sub(1.0), float(0), float(1));
    return near01.mul(uDof);
  }
  /** Ring flow-t by index (config constants — fixed topology). */
  function ringT(idx: Any): Any {
    const i0 = idx.lessThan(float(0.5));
    const i1 = idx.lessThan(float(1.5));
    return select(
      i0,
      float(RING_T[0]),
      select(i1, float(RING_T[1]), float(RING_T[2])),
    );
  }

  /** Flow parameter of a stream particle — deterministic in uTime. */
  function flowParam(basePhase: Any, speedVar: Any): Any {
    return fract(basePhase.add(uTime.mul(uFlowSpeed).mul(speedVar)));
  }

  /** Laminar width envelope: 1 at entry, tightening STEPWISE past each ring
   * (healthy; 1 → ~0.61 after all three — the igloo lock), times the idle
   * BREATHING (±uBreathe over BREATHE_PERIOD s) and the master uEnvelope.
   * uBroken gates the ring tightening off; breathing applies to both modes.
   * Round-3: times the ROW-REACTIVE width response — the ignited row's zone
   * SWELLS on broken (+uRowSwell) and TIGHTENS on healthy
   * (−uRowSwell·ROW_TIGHTEN_RATIO, the laminar squeeze). */
  function widthEnvelope(t: Any): Any {
    let w: Any = float(1);
    for (let i = 0; i < RING_T.length; i++) {
      w = w.sub(
        smoothstep(float(RING_T[i] - 0.02), float(RING_T[i] + 0.012), t).mul(
          float(TIGHTEN_PER_RING),
        ),
      );
    }
    const breathe = float(1).add(
      sin(uTime.mul((Math.PI * 2) / BREATHE_PERIOD)).mul(uBreathe),
    );
    const rowW = float(1).add(
      rowResponse(t).mul(
        mix(uRowSwell.mul(-ROW_TIGHTEN_RATIO), uRowSwell, uBroken),
      ),
    );
    return mix(w, float(1), uBroken).mul(breathe).mul(rowW).mul(uEnvelope);
  }

  /** Fracture detachment factor 0..1 for a stream particle (broken only,
   * softened by the hover re-cohere tease). */
  function dispFactor(t: Any): Any {
    const past = smoothstep(
      uFracture,
      uFracture.add(float(FRACTURE_WINDOW)),
      t,
    );
    return clamp(
      past.mul(uBroken).mul(float(1).sub(uRecohere.mul(0.9))),
      float(0),
      float(1),
    );
  }

  /** Spark burst direction (role 2) — mostly radial with a +x forward bias
   * out of the fracture. Pure function of the seeded offsets. */
  function sparkDir(offN: Any): Any {
    return vec3(
      cos(offN.x).mul(0.6).add(0.3),
      sin(offN.x),
      offN.z.mul(0.8),
    ).normalize();
  }

  /**
   * The analytic anchor: where particle i WANTS to be, from the spline
   * uniforms + its read-only role/offset attributes. Pure function of uTime →
   * deterministic for any scrub state (the unified-force contract; the curl
   * field is a pure function of position+uTime, so the contract holds).
   * `curl` is a BUILD-TIME flag: the compute kernel passes true (filaments
   * shred through the spring), the static tier keeps the analytic twist.
   */
  function anchorNode(opts: { metaN: Any; offN: Any; curl?: boolean }): Any {
    const { metaN, offN } = opts;
    const role = metaN.x;
    const aux = metaN.y;
    const speedVar = metaN.z;
    const rnd = metaN.w;

    // -------- STREAM branch --------
    const t = flowParam(offN.x, speedVar).toVar();
    const center = streamCenter(t).toVar();
    const w = widthEnvelope(t).toVar();
    // PHASE-SEPARATED braid (round-2): per-strand twist phase (uniformArray,
    // live-tunable) + slightly different twist RATES so the four filaments
    // visibly cross like a braided river instead of running as one fused
    // tube. Fixed y/z frame (the meander is gentle enough that a true Frenet
    // frame buys nothing visible).
    const strandAng = strandPhaseAt(aux).add(
      t
        .mul(float(Math.PI * 2))
        .mul(
          float(BRAID_TURNS).mul(
            float(STRAND_RATE_BASE).add(aux.mul(float(STRAND_RATE_STEP))),
          ),
        ),
    );
    const strandOff = vec3(
      float(0),
      sin(strandAng).mul(float(STRAND_RADIUS)),
      cos(strandAng).mul(float(STRAND_RADIUS)),
    );
    // Thickness jitter within the strand — per-strand thickness BIAS keeps
    // the filaments individually legible (thick lead strand, thin satellites).
    const jit = vec3(
      float(0),
      sin(offN.z).mul(offN.y).mul(float(STRAND_THICKNESS)),
      cos(offN.z).mul(offN.y).mul(float(STRAND_THICKNESS)),
    ).mul(strandThickAt(aux));
    // Round-3 curl micro-turbulence (compute tier only): displace the strand
    // offset with the analytic curl field sampled AT the braid position, so
    // the field varies along the stream AND across the cross-section.
    const preStream = center.add(strandOff.add(jit).mul(w)).toVar();
    const onStream = (
      opts.curl
        ? preStream.add(curlAt(preStream).mul(uCurl).mul(float(CURL_SCALE)))
        : preStream
    ).toVar();

    // Broken: past the fracture the particle loses the spline home and
    // becomes slow drifting debris — offset past the CLEAN-BREAK gap so the
    // debris field starts visibly beyond the empty band.
    const disp = dispFactor(t).toVar();
    const fracPt = streamCenter(uFracture).toVar();
    const u = clamp(
      t.sub(uFracture).div(float(1).sub(uFracture)),
      float(0),
      float(1),
    ).toVar(); // debris life progress
    const h1 = fract(sin(rnd.mul(137.9).add(offN.x.mul(311.7))).mul(43758.545));
    const h2 = fract(sin(rnd.mul(269.5).add(offN.z.mul(183.3))).mul(43758.545));
    const dir = vec3(
      float(0.8).add(h1.mul(0.4)),
      h1.sub(0.5).mul(1.5),
      h2.sub(0.5).mul(1.1),
    )
      .normalize()
      .toVar();
    const wander = vec3(
      sin(uTime.mul(0.5).add(h1.mul(21.0))),
      sin(uTime.mul(0.42).add(h2.mul(17.0))),
      sin(uTime.mul(0.36).add(h1.mul(13.0))),
    ).mul(u.mul(0.06));
    const debris = fracPt
      .add(strandOff.add(jit).mul(0.5))
      .add(dir.mul(u.mul(float(DEBRIS_SPREAD)).add(float(DEBRIS_GAP))))
      .add(wander);
    const streamAnchor = mix(onStream, debris, disp).toVar();

    // -------- RING branch (healthy) --------
    const rC = streamCenter(ringT(aux)).toVar();
    const ang = offN.x.add(uTime.mul(float(RING_SPIN)).mul(speedVar));
    // Crisp torus (halved tube/jitter) + the ignition SHOCKWAVE: the radius
    // ripples out 1 → 1+RING_SHOCKWAVE while the flash envelope decays.
    const rr = float(RING_RADIUS)
      .mul(float(1).add(offN.y.mul(float(RING_RADIAL_JITTER))))
      .mul(float(1).add(ringFlashAt(aux).mul(float(RING_SHOCKWAVE))));
    const tube = vec3(
      sin(offN.z).mul(float(RING_TUBE)),
      cos(offN.z).mul(float(RING_TUBE)),
      float(0),
    );
    // The ring's circle lives in the y/z plane (perpendicular to the flow),
    // with a slight x tube-jitter so it reads as a torus, not a flat washer.
    const ringAnchor = rC
      .add(vec3(tube.x, sin(ang).mul(rr).add(tube.y), cos(ang).mul(rr)))
      .toVar();

    // -------- SPARK branch (broken, role 2) --------
    // Analytic burst: the uFlash 1→0 decay maps to outward flight 0→1 — a
    // pure function of the flash uniform, identical on both backends. Idle
    // (uFlash 0) parks the spark at full reach with zero alpha.
    const prog = pow(clamp(float(1).sub(uFlash), float(0), float(1)), 0.6);
    const sparkAnchor = fracPt
      .add(sparkDir(offN).mul(prog.mul(float(SPARK_REACH)).mul(speedVar)))
      .add(vec3(float(0), prog.mul(prog).mul(-0.06), float(0)))
      .toVar();

    return select(
      role.lessThan(float(0.5)),
      streamAnchor,
      select(role.lessThan(float(1.5)), ringAnchor, sparkAnchor),
    );
  }

  // === Shared fragment-bound scalar builders ================================
  // (Self-contained expressions — see the VARYING DISCIPLINE header note.)

  /** Surge brightness at flow-t: sharp gaussian LEADING edge + a trailing
   * comet gradient (SURGE_TAIL long) behind the head. Dies past the fracture
   * when broken. */
  function surgeAt(t: Any): Any {
    const d = t.sub(uSurgeT);
    const headP = exp(float(SURGE_K).mul(d.mul(d)).negate());
    const tailP = select(
      d.lessThan(float(0)),
      exp(d.div(float(SURGE_TAIL))),
      float(0),
    );
    const s = uSurgeAmp.mul(max(headP, tailP.mul(0.65)));
    const past = smoothstep(
      uFracture,
      uFracture.add(float(FRACTURE_WINDOW)),
      t,
    );
    return s.mul(float(1).sub(past.mul(uBroken)));
  }
  /** Fracture death-flash brightness at flow-t (broken only). */
  function flashAt(t: Any): Any {
    const d = t.sub(uFracture);
    return uFlash
      .mul(exp(float(FLASH_K).mul(d.mul(d)).negate()))
      .mul(uBroken);
  }

  /** Spline tangent at flow-t (central difference over the bowed center) —
   * the static tier's elongation axis + the surge advection direction. */
  function tangentAt(t: Any): Any {
    return streamCenter(t.add(float(0.015)))
      .sub(streamCenter(t.sub(float(0.015))))
      .normalize();
  }

  /** Screen-motion vector (local units/s) feeding the velocity stretch.
   * Compute tier passes the LIVE velocity (plus the analytic surge advection
   * on stream particles); the static tier derives a mild fixed tangent
   * elongation + surge/spark boosts — parity of look, not of physics. */
  function motionNode(metaN: Any, offN: Any, physVel: Any | null): Any {
    const role = metaN.x;
    const t = flowParam(offN.x, metaN.z);
    const tan = tangentAt(t);
    const surge = surgeAt(t);
    const streamGate = float(1).sub(clamp(role, float(0), float(1)));
    if (physVel) {
      return physVel.add(
        tan.mul(surge).mul(float(SURGE_ADVECT)).mul(streamGate),
      );
    }
    const streamMotion = tan.mul(
      float(STATIC_ELONG).add(surge.mul(float(SURGE_ADVECT))),
    );
    const sparkMotion = sparkDir(offN).mul(uFlash.mul(1.2));
    return select(
      role.lessThan(float(0.5)),
      streamMotion,
      select(role.lessThan(float(1.5)), vec3(0.0, 0.0, 0.0), sparkMotion),
    );
  }

  /** Build the per-particle COLOR (tone × emissive), ALPHA and SIZE from a
   * meta/off pair (attributes on the static path, storage `.toAttribute()`
   * reads on the compute path — identical math). All per-instance constants,
   * so the whole ramp lives in the vertex stage (round-2). */
  function particleScalars(metaN: Any, offN: Any) {
    const role = metaN.x;
    const t = flowParam(offN.x, metaN.z);
    const disp = dispFactor(t);
    const u = clamp(
      t.sub(uFracture).div(float(1).sub(uFracture)),
      float(0),
      float(1),
    );
    // Debris dims + fades with its drift progress.
    const deadMix = clamp(
      disp.mul(float(0.4).add(u.mul(0.6))),
      float(0),
      float(1),
    );
    // Flow-t edge fades — soft band entry/exit AND the recycle-pop killer
    // (a particle wraps flow-t at zero alpha on both sides of the seam).
    const edge = smoothstep(float(0), float(EDGE_FADE_IN), t).mul(
      float(1).sub(smoothstep(float(1 - EDGE_FADE_OUT), float(1), t)),
    );
    // CLEAN BREAK (broken): zero alpha between the last coherent x and the
    // debris field — a gap, not mush.
    const gap = float(1).sub(
      smoothstep(uFracture.sub(float(0.008)), uFracture, t)
        .mul(
          float(1).sub(
            smoothstep(
              uFracture.add(uGap),
              uFracture.add(uGap).add(float(0.02)),
              t,
            ),
          ),
        )
        .mul(uBroken),
    );
    // Radial fringe 0..1 → the three-stop ramp driver.
    const fringe = clamp(
      offN.y.mul(0.85).add(metaN.w.mul(0.3)),
      float(0),
      float(1),
    );
    const surge = surgeAt(t);
    const flash = flashAt(t);

    // --- STREAM: white-cyan core → cyan body → blue fringe; ember debris;
    //     white-cyan surge head with its trailing gradient. ---
    const coreMix = float(1).sub(smoothstep(float(0), float(0.3), fringe));
    const bodyCol = mix(
      uColCyan,
      uColBlue,
      smoothstep(float(0.2), float(1), fringe),
    );
    const gradCol = mix(bodyCol, uColCore, coreMix);
    const emberCol = mix(
      uColEmber,
      uColEmber2,
      clamp(metaN.w.mul(0.6).add(u.mul(0.4)), float(0), float(1)),
    );
    const headMix = clamp(surge.mul(0.85), float(0), float(1)).mul(
      float(1).sub(deadMix),
    );
    const toneStream = mix(mix(gradCol, emberCol, deadMix), uColCore, headMix);
    // Idle dignity: slow per-particle brightness shimmer (±uShimmer).
    const shimmer = float(1).add(
      sin(uTime.mul(0.5).add(metaN.w.mul(37.0)).add(t.mul(9.0))).mul(uShimmer),
    );
    // Round-3 row-reactive brightness: the ignited row's zone glows. On
    // broken the window reaches into the debris (row 2 = the fracture) where
    // deadMix keeps the boost a warm ember lift, not a debris flare.
    const rowBright = float(1).add(rowResponse(t).mul(uRowGain));
    const emisStream = float(1)
      .add(surge.mul(uSurgeGain))
      .add(flash.mul(float(FLASH_GAIN)))
      .mul(float(STREAM_EMISSIVE))
      .mul(shimmer)
      .mul(rowBright)
      .mul(float(1).sub(deadMix.mul(0.75)));
    // Fringe alpha drop (edges dissolve into the navy) + the debris ceiling.
    const fringeA = mix(
      float(1),
      float(0.35),
      smoothstep(float(0.55), float(1), fringe),
    );
    const debrisA = float(DEBRIS_ALPHA_MAX).mul(
      float(1).sub(u.mul(float(DEBRIS_FADE))),
    );
    const alphaStream = mix(fringeA, debrisA, disp)
      .mul(edge)
      .mul(gap)
      .mul(float(STREAM_ALPHA));
    // Size falloff: bright fat core, fine fringe; the surge fattens the head.
    const sizeStream = mix(
      float(CORE_SIZE_BOOST),
      float(FRINGE_SIZE_DROP),
      fringe,
    ).mul(float(1).add(surge.mul(0.45)));

    // --- RING: igloo crisp/white; ignition flash pushes whiter + pops. ---
    const glow = ringGlowAt(metaN.y);
    const ringFlash = ringFlashAt(metaN.y);
    const emisRing = float(RING_EMISSIVE)
      .mul(glow)
      .mul(float(1).add(ringFlash.mul(float(RING_FLASH_GAIN))));
    const toneRing = mix(
      uColCyan,
      uColCore,
      clamp(float(RING_WHITE).add(ringFlash.mul(0.5)), float(0), float(1)),
    );
    const alphaRing = float(STREAM_ALPHA);
    const sizeRing = float(RING_POINT_SIZE_BOOST).add(ringFlash.mul(0.35));

    // --- SPARK: white-hot burst, alive only while uFlash burns. ---
    const sparkLife = clamp(float(1).sub(uFlash), float(0), float(1));
    const alphaSpark = smoothstep(float(0), float(0.25), uFlash)
      .mul(float(0.9))
      .mul(uBroken);
    const toneSpark = mix(uColCore, uColCyan, sparkLife);
    const emisSpark = float(STREAM_EMISSIVE).mul(
      float(1).add(uFlash.mul(float(FLASH_GAIN))),
    );
    const sizeSpark = float(0.9).add(metaN.w.mul(0.5));

    // --- Combine by role (0 stream · 1 ring · 2 spark). ---
    const isStream = role.lessThan(float(0.5));
    const isRing = role.lessThan(float(1.5));
    const tone = select(
      isStream,
      toneStream,
      select(isRing, toneRing, toneSpark),
    );
    const emis = select(
      isStream,
      emisStream,
      select(isRing, emisRing, emisSpark),
    );
    const alpha = select(
      isStream,
      alphaStream,
      select(isRing, alphaRing, alphaSpark),
    );
    const sizeK = select(
      isStream,
      sizeStream,
      select(isRing, sizeRing, sizeSpark),
    );

    return { colorE: tone.toVec3().mul(emis), alpha, sizeK };
  }

  /** Shared fragment shade — identical on both backends. The disc UV is the
   * UNROTATED quad corner, so the screen-space stretch below renders it as an
   * ellipse along the motion axis (the streak). Round-3 depth-DOF: vSoft
   * (0 crisp → 1 near-bokeh) widens the disc falloff and sheds a little peak
   * brightness — near particles read as soft out-of-focus discs. */
  function buildShade(v: {
    vQuadUv: Any;
    vColor: Any;
    vAlpha: Any;
    vSoft: Any;
  }): Any {
    return Fn(() => {
      const inner = mix(float(0.12), float(DOF_SOFT_MIN), v.vSoft);
      const disc = smoothstep(float(0.5), inner, length(v.vQuadUv))
        .mul(float(1).sub(v.vSoft.mul(0.2)))
        .toVar();
      const alpha = disc.mul(v.vAlpha).mul(uReveal).toVar();
      Discard(alpha.lessThan(0.004));
      return vec4(v.vColor.toVec3(), alpha);
    })();
  }

  /** Shared vertex clip-position builder — billboard quad in device px with
   * VELOCITY STRETCH (round-2, the AT streak look): the quad elongates along
   * the screen projection of `motion` by 1 + min(|motion|·uStretchGain,
   * uStretchMax) — 3× at surge speed. Magnitude comes from LOCAL speed
   * (rect-scale independent); direction from view space (what the eye sees).
   * Zero/slow motion degrades to the plain round disc. */
  function buildVertex(center: Any, depthK: Any, sizeK: Any, motion: Any): Any {
    return Fn(() => {
      const mv = modelViewMatrix.mul(vec4(center, 1.0)).toVar();
      const dist = mv.z.negate();
      const clip = cameraProjectionMatrix.mul(mv).toVar();
      const sizeNode = uPointSize
        .mul(uPixelRatio)
        .mul(sizeK)
        .mul(depthK)
        .div(max(dist, 0.001));
      const spd = length(motion);
      const stretch = float(1).add(min(spd.mul(uStretchGain), uStretchMax));
      // The 1e-4 x-bias makes zero motion degrade to the unrotated quad
      // (stretch ≈ 1 there, so the orientation is invisible anyway).
      const mView = modelViewMatrix.mul(vec4(motion, 0.0)).toVar();
      const dl = length(mView.xy);
      const dir = mView.xy.add(vec2(1e-4, 0.0)).div(max(dl, 1e-4)).toVar();
      const corner = positionLocal.xy;
      const cs = corner.x.mul(stretch);
      const off = vec2(
        dir.x.mul(cs).sub(dir.y.mul(corner.y)),
        dir.y.mul(cs).add(dir.x.mul(corner.y)),
      );
      clip.xy.addAssign(off.mul(sizeNode).div(uViewport).mul(2.0).mul(clip.w));
      return clip;
    })();
  }

  /** Depth attenuation (nearer = bigger) from local z: the round-2 aerial
   * cue × the round-3 DOF size gain (uDof-scaled — far smaller, near bigger). */
  function depthAtten(z: Any): Any {
    const zn = zNorm(z);
    const base = float(1).add(zn.sub(0.5).mul(float(NEURAL_DEPTH_ATTEN)));
    const dof = float(1).add(
      zn.sub(0.5).mul(float(DOF_SIZE_GAIN)).mul(uDof),
    );
    return base.mul(dof);
  }

  function configureMaterial(material: Any, shade: Any) {
    material.colorNode = (shade as Any).xyz;
    material.opacityNode = (shade as Any).w;
    material.transparent = true;
    material.depthWrite = false;
    material.depthTest = false;
    material.blending = AdditiveBlending;
    material.toneMapped = false;
    material.side = DoubleSide;
  }

  // === Static (no-compute) build ===========================================
  if (!backendIsWebGPU) {
    const material = new MeshBasicNodeMaterial();
    const aMeta = attribute("aMeta");
    const aOff = attribute("aOff");
    const aSeed = attribute("aSeed");

    // Reveal-blended, shimmered instance center (the shimmer reads the
    // PRE-shimmer center — cheap life on the no-sim tier).
    const anchorS = anchorNode({ metaN: aMeta, offN: aOff });
    const rvS = smoothstep(float(0), float(1), uReveal);
    const centerBase = mix(aSeed, anchorS, rvS);
    const centerS = centerBase.add(
      vec3(
        sin(centerBase.y.mul(7.0).add(uTime.mul(0.9))),
        sin(centerBase.z.mul(7.0).add(uTime.mul(1.1))),
        sin(centerBase.x.mul(7.0).add(uTime.mul(0.7))),
      ).mul(0.003),
    );
    const sc = particleScalars(aMeta, aOff);
    // Static-tier streaks: mild fixed elongation along the spline tangent,
    // boosted by the surge head / the spark burst.
    const motionS = motionNode(aMeta, aOff, null);

    material.vertexNode = buildVertex(
      centerS,
      depthAtten(centerS.z),
      sc.sizeK,
      motionS,
    );

    const vQuadUv = varying(positionLocal.xy);
    const vColor = varying(sc.colorE);
    // Round-3 depth-DOF: far half of the z-bow dims; near half softens (each
    // varying stays a SELF-CONTAINED expression — varying discipline).
    const vAlpha = varying(sc.alpha.mul(dofAlphaAt(centerS.z)));
    const vSoft = varying(dofSoftAt(centerS.z));

    configureMaterial(
      material,
      buildShade({ vQuadUv, vColor, vAlpha, vSoft }),
    );

    return {
      geometry,
      material,
      uniforms: buildUniforms(),
      compute: () => {},
      dispose() {
        geometry.dispose();
        material.dispose();
      },
    } satisfies NeuralFieldBuild;
  }

  // === True-WebGPU compute build ===========================================
  const positionBuffer = instancedArray(seed.slice(), "vec3");
  const velocityBuffer = instancedArray(count, "vec3");
  const offBuffer = instancedArray(offA.slice(), "vec3");
  const metaBuffer = instancedArray(meta.slice(), "vec4");

  const uDelta = uniform(1 / 60);
  const SPRING = float(NEURAL_SPRING);
  const DAMPING = float(NEURAL_DAMPING);
  const MAX_SPEED = float(NEURAL_MAX_SPEED);

  const simulate = Fn(() => {
    const pos = positionBuffer.element(instanceIndex);
    const velH = velocityBuffer.element(instanceIndex);
    const offN = offBuffer.element(instanceIndex);
    const metaN = metaBuffer.element(instanceIndex);

    const role = metaN.x;
    // 0 on stream, 1 on ring AND spark — the "not a stream particle" gate
    // (role 2 must never read as −1 through a `1 − role` term).
    const nonStream = clamp(role, float(0), float(1)).toVar();

    // Round-3: the compute anchor carries the curl micro-turbulence (build-
    // time flag — the static tier keeps the analytic twist).
    const liveAnchor = anchorNode({ metaN, offN, curl: true }).toVar();
    // Reconstruct the scattered seed deterministically (matches seedBuffers).
    const idxF = float(instanceIndex);
    const s0 = fract(sin(idxF.mul(127.1).add(311.7)).mul(43758.545));
    const s1 = fract(sin(idxF.mul(269.5).add(183.3)).mul(43758.545));
    const s2 = fract(sin(idxF.mul(419.2).add(371.9)).mul(43758.545));
    const seedPos = vec3(
      s0.sub(0.5).mul(SEED_SCATTER_XY),
      s1.sub(0.5).mul(SEED_SCATTER_XY),
      s2.sub(0.5).mul(SEED_SCATTER_Z),
    );
    const rv = smoothstep(float(0), float(1), uReveal);
    const anchor = mix(seedPos, liveAnchor, rv).toVar();

    // RECYCLE / RE-PARK SNAP (round-2 streak fix): a flow-t wrap teleports a
    // stream particle's anchor across the whole band (and a fresh flash
    // re-parks a spark). The wrap happens at ZERO alpha (EDGE_FADE_*), so
    // instead of a bright spring-flight streak the particle hard-resets onto
    // its anchor — an offset reset, always legal per the unified-force
    // contract. Rings never jump (their anchor is continuous → huge bound).
    const snapDist = select(
      role.lessThan(float(0.5)),
      float(WRAP_SNAP_DIST),
      select(role.lessThan(float(1.5)), float(1e9), float(SPARK_SNAP_DIST)),
    );
    If(length(anchor.sub(pos)).greaterThan(snapDist), () => {
      pos.assign(anchor);
      velH.assign(vec3(0.0, 0.0, 0.0));
    });

    // Fracture: dispersing debris loses most of its spring and gains wander.
    const tSim = flowParam(offN.x, metaN.z);
    const dispersing = dispFactor(tSim)
      .mul(float(1).sub(nonStream)) // rings/sparks never disperse
      .toVar();
    // Laminar lock (healthy): spring gain near the guide rings, so the sim
    // visibly snaps particles tighter as they cross each ring.
    let ringProx: Any = float(0);
    for (let i = 0; i < RING_T.length; i++) {
      const d = tSim.sub(float(RING_T[i]));
      ringProx = ringProx.add(exp(float(RING_PROX_K).mul(d.mul(d)).negate()));
    }
    const lockGain = float(1)
      .add(
        ringProx
          .mul(float(RING_SPRING_GAIN))
          .mul(float(1).sub(uBroken))
          .mul(float(1).sub(nonStream)),
      )
      .toVar();
    const spring = SPRING.mul(lockGain).mul(
      float(1).sub(dispersing.mul(0.85)),
    );

    const vel = velH.toVar();
    unifiedForceStep(tsl as TslSymbolsGpgpu, {
      pos: pos as Any,
      vel: vel as Any,
      anchor: anchor as Any,
      dt: uDelta as Any,
      spring: spring as Any,
      damping: DAMPING as Any,
      maxSpeed: MAX_SPEED as Any,
      // Cursor bend: the pointer locally repels the river (parked at 1e9
      // when idle/coarse → exactly zero at rest).
      attractor: {
        position: uPointer as Any,
        push: float(POINTER_PUSH) as Any,
        radius: float(POINTER_RADIUS) as Any,
        orbit: float(0) as Any,
        orbitFalloff: float(1) as Any,
        axis: vec3(0.0, 0.0, 1.0) as Any,
      },
      extraAcc: (acc: Any) => {
        // Debris wander — slow turbulent drift on detached particles.
        const turb = vec3(
          sin(pos.y.mul(6.0).add(uTime.mul(1.4))),
          sin(pos.z.mul(6.0).add(uTime.mul(1.1))),
          sin(pos.x.mul(6.0).add(uTime.mul(0.9))),
        );
        acc.addAssign(turb.mul(dispersing.mul(float(DEBRIS_WANDER_ACC))));
      },
    });

    velH.assign(vel);
    pos.addAssign(vel.mul(uDelta));
  })().compute(count);

  // --- Render: instanced billboard reading the storage buffers --------------
  const material = new MeshBasicNodeMaterial();

  // `.xyz` MANDATORY on a "vec3" storage buffer read (padded to 16B → 4-comp).
  const posR = positionBuffer.toAttribute().xyz;
  const metaR = metaBuffer.toAttribute();
  const offR = offBuffer.toAttribute().xyz;
  // Round-2: the LIVE velocity feeds the streak stretch. +1 vertex-buffer
  // slot → 5 of 8 total (quad position + 4 storage reads). `.xyz` mandatory.
  const velR = velocityBuffer.toAttribute().xyz;

  const scR = particleScalars(metaR, offR);
  const motionR = motionNode(metaR, offR, velR);

  material.vertexNode = buildVertex(
    posR,
    depthAtten(posR.z),
    scR.sizeK,
    motionR,
  );

  const vQuadUv = varying(positionLocal.xy);
  const vColor = varying(scR.colorE);
  // Round-3 depth-DOF on the LIVE position z (pointer-bent particles pushed
  // toward camera go soft too). Self-contained expressions per the varying
  // discipline; posR is already a bound vertex-buffer read — no new slot.
  const vAlpha = varying(scR.alpha.mul(dofAlphaAt(posR.z)));
  const vSoft = varying(dofSoftAt(posR.z));

  configureMaterial(material, buildShade({ vQuadUv, vColor, vAlpha, vSoft }));

  return {
    geometry,
    material,
    uniforms: buildUniforms(),
    compute(delta: number) {
      uDelta.value = delta;
      gl.compute(simulate);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  } satisfies NeuralFieldBuild;

  // Package the externally-driven uniforms (shared by both backends).
  function buildUniforms(): NeuralFieldUniforms {
    return {
      uTime,
      uReveal,
      uBroken,
      uFlowSpeed,
      uFracture,
      uRecohere,
      uSurgeT,
      uSurgeAmp,
      uFlash,
      uRingGlow: uRingGlow as unknown as { array: number[] },
      uRingFlash: uRingFlash as unknown as { array: number[] },
      uC0: uC0 as Any,
      uC1: uC1 as Any,
      uC2: uC2 as Any,
      uC3: uC3 as Any,
      uC4: uC4 as Any,
      uPointer: uPointer as Any,
      uPixelRatio,
      uViewport: uViewport as Any,
      uEnvelope,
      uBreathe,
      uShimmer,
      uZBow,
      uGap,
      uStretchGain,
      uStretchMax,
      uSurgeGain,
      uPointSize,
      uStrandPhase: uStrandPhase as unknown as { array: number[] },
      uStrandThick: uStrandThick as unknown as { array: number[] },
      uRowGlow: uRowGlow as unknown as { array: number[] },
      uCurl,
      uDof,
      uRowGain,
      uRowSwell,
    };
  }
}
