/**
 * Signal-stream particle build — the WebGL half of the 2026-08-21 "SIGNAL
 * STREAM" refactor (replaces the FIX 3 orb-triangle/arc field; file name kept
 * so NeuralLattice's lazy import stays put).
 *
 * A braided river of particles flows left→right through the section rect.
 * Per-particle homes are computed IN-SHADER from a Catmull-Rom spline of five
 * control-point uniforms (uC0..uC4 — the uHub-style uniform-homes pattern):
 * each particle advances a flow parameter t = fract(basePhase + uTime·speed),
 * evaluates the spline, then offsets onto one of four twisting STRANDS plus
 * per-particle thickness jitter → a braid, not a line. Nothing but `meta`,
 * per-particle offsets and the reveal seed is baked into buffers, so a resize
 * (or live re-authoring of the meander) is a uniform update — NO rebuild.
 *
 *   - broken  (uBroken=1): past uFracture the particle loses the spline home
 *     and disperses into slow drifting debris (analytic drift here; wander
 *     force via unifiedForceStep on the compute tier), dimming cyan → ember.
 *     uSurgeT/uSurgeAmp/uFlash paint the surge that rides in from the left and DIES at
 *     the fracture with a >1.0 emissive flash that immediately decays.
 *     uRecohere is the hover tease — debris briefly pulls back toward the
 *     spline, then falls apart again.
 *   - healthy (uBroken=0): a RING_FRACTION of the particles are GUIDE-RING
 *     particles on three circles perpendicular to the flow at RING_T; stream
 *     particles tighten (width envelope + spring gain) as they pass each
 *     ring. uRingFlash[i] (bumpCluster / surge crossings) fires each ring's
 *     >1.0 ignition flash; uRingGlow[i] is the damped hover flare.
 *
 * BACKEND CONTRACT (unchanged, mirrors gpgpuNodeSim.ts):
 *   - True-WebGPU compute path: storage buffers (`instancedArray`) advanced by
 *     a compute kernel through the shared unifiedForceStep. Render reads
 *     buffers via `.toAttribute().xyz` ONLY — the trailing `.xyz` is MANDATORY
 *     on a `"vec3"` buffer (padded to 16B). `.element(i)` on STORAGE buffers is
 *     COMPUTE-STAGE ONLY (three #31221); uniformArray `.element()` is fine in
 *     any stage. Buffer budget: 4 storage buffers in compute, 3
 *     `.toAttribute()` vertex-buffer slots in render — same footprint as the
 *     lattice build this replaces, well inside the 8-slot walls.
 *   - Non-compute path (WebGPURenderer WebGL2 sub-backend): the ANALYTIC
 *     build — particles sit at their reveal-blended home with a cheap shimmer.
 *     Because the home is a pure function of uTime, the flow, surges, ring
 *     flashes and fracture all still animate; only the physical debris
 *     inertia and the pointer bend are compute-only.
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
 */
import {
  unifiedForceStep,
  type TslSymbolsGpgpu,
} from "../gpgpu/gpgpuNodeSim";
import {
  COL_CYAN,
  COL_BLUE,
  COL_EMBER,
  STREAM_CTRL,
  STRAND_COUNT,
  STRAND_RADIUS,
  STRAND_THICKNESS,
  BRAID_TURNS,
  FLOW_SPEED,
  RING_T,
  RING_RADIUS,
  RING_TUBE,
  RING_FRACTION,
  RING_SPIN,
  TIGHTEN_PER_RING,
  RING_SPRING_GAIN,
  RING_PROX_K,
  FRACTURE_T,
  FRACTURE_WINDOW,
  DEBRIS_SPREAD,
  DEBRIS_FADE,
  DEBRIS_WANDER_ACC,
  SURGE_K,
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
  NEURAL_SPRING,
  NEURAL_DAMPING,
  NEURAL_MAX_SPEED,
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
  /** 0→1 fracture death-flash envelope (broken). */
  uFlash: { value: number };
  /** Per-ring damped hover glow, 1 = neutral (write to `.array`). */
  uRingGlow: { array: number[] };
  /** Per-ring ignition flash 0..1 (write to `.array`). */
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
 *     role     (0 stream | 1 ring)
 *     aux      (stream: strand index 0..3 ; ring: ring index 0..2)
 *     speedVar (stream: 0.7..1.3 flow-speed variance; ring: spin variance)
 *     rnd      (0..1 — tint variance / debris hashes)
 *   offA : vec3
 *     stream: [basePhase 0..1, jitter magnitude 0..1, jitter angle 0..2π]
 *     ring:   [base angle 0..2π, radial jitter −1..1, tube angle 0..2π]
 *   seed : vec3 scattered start (reveal coalesce)
 */
function seedBuffers(count: number, mode: LatticeMode) {
  const meta = new Float32Array(count * 4);
  const offA = new Float32Array(count * 3);
  const seed = new Float32Array(count * 3);

  const ringCutoff =
    mode === "healthy" ? Math.floor(count * (1 - RING_FRACTION)) : count;

  for (let i = 0; i < count; i++) {
    const r0 = h(i, 12.9898, 78.233);
    const r1 = h(i, 39.3467, 11.135);
    const r2 = h(i, 73.156, 52.235);
    const r3 = h(i, 91.318, 27.719);

    if (i < ringCutoff) {
      // STREAM particle.
      meta[i * 4] = 0;
      meta[i * 4 + 1] = Math.floor(r0 * STRAND_COUNT) % STRAND_COUNT;
      meta[i * 4 + 2] = 0.7 + r1 * 0.6; // flow-speed variance
      meta[i * 4 + 3] = r3;
      offA[i * 3] = r2; // basePhase
      // Jitter magnitude biased toward the core (sqrt keeps a bright center,
      // a softer fringe) — also the cyan→blue radial tint driver.
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
  const uColCyan = uniform(new Color(COL_CYAN));
  const uColBlue = uniform(new Color(COL_BLUE));
  const uColEmber = uniform(new Color(COL_EMBER));
  const uPointSize = uniform(NEURAL_POINT_SIZE);

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

  function ringGlowAt(idx: Any): Any {
    return uRingGlow.element(int(clamp(idx, float(0), float(2)))) as Any;
  }
  function ringFlashAt(idx: Any): Any {
    return uRingFlash.element(int(clamp(idx, float(0), float(2)))) as Any;
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

  /** Laminar width envelope (healthy): 1 at entry, tightening past each ring.
   * uBroken gates it off so the broken stream keeps its full braid width. */
  function widthEnvelope(t: Any): Any {
    let w: Any = float(1);
    for (let i = 0; i < RING_T.length; i++) {
      w = w.sub(
        smoothstep(float(RING_T[i] - 0.05), float(RING_T[i] + 0.02), t).mul(
          float(TIGHTEN_PER_RING),
        ),
      );
    }
    return mix(w, float(1), uBroken);
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

  /**
   * The analytic anchor: where particle i WANTS to be, from the spline
   * uniforms + its read-only role/offset attributes. Pure function of uTime →
   * deterministic for any scrub state (the unified-force contract).
   */
  function anchorNode(opts: { metaN: Any; offN: Any }): Any {
    const { metaN, offN } = opts;
    const role = metaN.x;
    const aux = metaN.y;
    const speedVar = metaN.z;
    const rnd = metaN.w;

    // -------- STREAM branch --------
    const t = flowParam(offN.x, speedVar).toVar();
    const center = splineCR(t).toVar();
    const w = widthEnvelope(t).toVar();
    // Strand orbit: the strand's sub-tube revolves around the spline as t
    // advances → the braid. Fixed y/z frame (the meander is gentle enough
    // that a true Frenet frame buys nothing visible).
    const strandAng = aux
      .mul(float((Math.PI * 2) / STRAND_COUNT))
      .add(t.mul(float(BRAID_TURNS * Math.PI * 2)));
    const strandOff = vec3(
      float(0),
      sin(strandAng).mul(float(STRAND_RADIUS)),
      cos(strandAng).mul(float(STRAND_RADIUS)),
    );
    // Thickness jitter within the strand.
    const jit = vec3(
      float(0),
      sin(offN.z).mul(offN.y).mul(float(STRAND_THICKNESS)),
      cos(offN.z).mul(offN.y).mul(float(STRAND_THICKNESS)),
    );
    const onStream = center.add(strandOff.add(jit).mul(w)).toVar();

    // Broken: past the fracture the particle loses the spline home and
    // becomes slow drifting debris from the fracture point.
    const disp = dispFactor(t).toVar();
    const fracPt = splineCR(uFracture).toVar();
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
      .add(dir.mul(u.mul(float(DEBRIS_SPREAD)).add(0.03)))
      .add(wander);
    const streamAnchor = mix(onStream, debris, disp).toVar();

    // -------- RING branch (healthy) --------
    const rC = splineCR(ringT(aux)).toVar();
    const ang = offN.x.add(uTime.mul(float(RING_SPIN)).mul(speedVar));
    const rr = float(RING_RADIUS).mul(
      float(1).add(offN.y.mul(0.1)),
    );
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

    return mix(streamAnchor, ringAnchor, role);
  }

  // === Shared fragment-bound scalar builders ================================
  // (Self-contained expressions — see the VARYING DISCIPLINE header note.)

  /** Surge brightness at flow-t (dies past the fracture when broken). */
  function surgeAt(t: Any): Any {
    const d = t.sub(uSurgeT);
    const s = uSurgeAmp.mul(exp(float(SURGE_K).mul(d.mul(d)).negate()));
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

  /** Build every per-particle scalar the fragment needs, from a meta/off pair
   * (attributes on the static path, storage `.toAttribute()` reads on the
   * compute path — identical math). */
  function particleScalars(metaN: Any, offN: Any) {
    const role = metaN.x;
    const t = flowParam(offN.x, metaN.z);
    const disp = dispFactor(t);
    const u = clamp(
      t.sub(uFracture).div(float(1).sub(uFracture)),
      float(0),
      float(1),
    );
    // Debris dims + fades with its drift progress (leaves a faint ember ghost).
    const deadMix = clamp(disp.mul(float(0.4).add(u.mul(0.6))), float(0), float(1));
    const alive = float(1).sub(disp.mul(u).mul(float(DEBRIS_FADE)));
    // Radial fringe 0..1 → cyan core, blue fringe (+ per-particle variance).
    const fringe = clamp(
      offN.y.mul(0.85).add(metaN.w.mul(0.3)),
      float(0),
      float(1),
    );
    const surge = surgeAt(t);
    const flash = flashAt(t);
    const glow = ringGlowAt(metaN.y);
    const ringFlash = ringFlashAt(metaN.y);
    // Stream emissive: floor + surge + death-flash, dimmed on debris.
    const emisStream = float(1)
      .add(surge.mul(float(SURGE_GAIN)))
      .add(flash.mul(float(FLASH_GAIN)))
      .mul(float(STREAM_EMISSIVE))
      .mul(float(1).sub(deadMix.mul(0.75)));
    // Ring emissive: hover glow × ignition flash.
    const emisRing = float(RING_EMISSIVE)
      .mul(glow)
      .mul(float(1).add(ringFlash.mul(float(RING_FLASH_GAIN))));
    const emis = mix(emisStream, emisRing, role);
    // Size: rings denser; surge fattens the stream head; flash pops the ring.
    const sizeK = mix(
      float(1).add(surge.mul(0.45)),
      float(RING_POINT_SIZE_BOOST).add(ringFlash.mul(0.35)),
      role,
    );
    return { role, t, disp, deadMix, alive, fringe, emis, sizeK };
  }

  /** Shared fragment shade — identical on both backends. */
  function buildShade(v: {
    vQuadUv: Any;
    vFringe: Any;
    vDead: Any;
    vAlive: Any;
    vEmis: Any;
  }): Any {
    return Fn(() => {
      const disc = smoothstep(0.5, 0.12, length(v.vQuadUv)).toVar();
      const grad = mix(
        uColCyan,
        uColBlue,
        clamp(v.vFringe, float(0), float(1)),
      );
      const tone = mix(
        grad,
        uColEmber,
        clamp(v.vDead, float(0), float(1)),
      ).toVar();
      const col = tone.toVec3().mul(v.vEmis);
      const alpha = disc
        .mul(float(STREAM_ALPHA))
        .mul(v.vAlive)
        .mul(uReveal)
        .toVar();
      Discard(alpha.lessThan(0.004));
      return vec4(col, alpha);
    })();
  }

  /** Shared vertex clip-position builder (billboard quad in device px). */
  function buildVertex(center: Any, depthK: Any, sizeK: Any): Any {
    return Fn(() => {
      const mv = modelViewMatrix.mul(vec4(center, 1.0)).toVar();
      const dist = mv.z.negate();
      const clip = cameraProjectionMatrix.mul(mv).toVar();
      const sizeNode = uPointSize
        .mul(uPixelRatio)
        .mul(sizeK)
        .mul(depthK)
        .div(max(dist, 0.001));
      const corner = positionLocal.xy;
      clip.xy.addAssign(
        corner.mul(sizeNode).div(uViewport).mul(2.0).mul(clip.w),
      );
      return clip;
    })();
  }

  /** Depth attenuation (nearer = slightly bigger/brighter) from local z. */
  function depthAtten(z: Any): Any {
    const zn = clamp(
      z.div(float(DEPTH_Z_RANGE)).mul(0.5).add(0.5),
      float(0),
      float(1),
    );
    return float(1).add(zn.sub(0.5).mul(float(NEURAL_DEPTH_ATTEN)));
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

    material.vertexNode = buildVertex(centerS, depthAtten(centerS.z), sc.sizeK);

    const vQuadUv = varying(positionLocal.xy);
    const vFringe = varying(sc.fringe);
    const vDead = varying(sc.deadMix);
    const vAlive = varying(sc.alive);
    const vEmis = varying(sc.emis);

    configureMaterial(
      material,
      buildShade({ vQuadUv, vFringe, vDead, vAlive, vEmis }),
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

    const liveAnchor = anchorNode({ metaN, offN }).toVar();
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

    // Fracture: dispersing debris loses most of its spring and gains wander.
    const tSim = flowParam(offN.x, metaN.z);
    const dispersing = dispFactor(tSim)
      .mul(float(1).sub(role)) // rings never disperse
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
          .mul(float(1).sub(role)),
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

  const scR = particleScalars(metaR, offR);

  material.vertexNode = buildVertex(posR, depthAtten(posR.z), scR.sizeK);

  const vQuadUv = varying(positionLocal.xy);
  const vFringe = varying(scR.fringe);
  const vDead = varying(scR.deadMix);
  const vAlive = varying(scR.alive);
  const vEmis = varying(scR.emis);

  configureMaterial(
    material,
    buildShade({ vQuadUv, vFringe, vDead, vAlive, vEmis }),
  );

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
    };
  }
}
