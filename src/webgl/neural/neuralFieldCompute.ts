/**
 * Neural-field particle build — FIX 3 v4 (3 card-anchored 3D hubs).
 *
 * Replaces the v2/v3 dense-cloud topology with a purposeful, LAYOUT-WIRED graph
 * of exactly 3 hubs (one per card) + 3 arcs (a triangle 0→1, 1→2, 0→2). The hub
 * LOCAL positions are NOT baked into the buffers — they are fed in as uniforms
 * `uHub0/1/2` (vec3) so a resize that moves the cards only updates uniforms (NO
 * buffer rebuild). Each particle's read-only `meta` encodes its role and its hub
 * assignment (node → hub index; flow → from/to hub pair). Homes are computed
 * IN-SHADER from the uHub uniforms.
 *
 * STRONG-3D: hub node particles are distributed in a real-z SPHERE (a glowing
 * volume), the 3 hubs are z-layered (uHub.z distinct), and arcs bow toward the
 * camera (NEURAL_ARC_BOW). The hovered hub flares (uHovered) + its arcs converge;
 * others dim — damped per-hub glow (driven from the store via NeuralLattice).
 *
 * BACKEND CONTRACT (mirrors gpgpuNodeSim.ts):
 *   - True-WebGPU compute path: storage buffers (`instancedArray`) advanced by a
 *     compute kernel (`Fn(...)().compute(count)`, dispatched with `gl.compute()`
 *     once per frame). Render reads buffers via `.toAttribute().xyz` ONLY — the
 *     trailing `.xyz` is MANDATORY on a `"vec3"` buffer (padded to 16B, so
 *     `.toAttribute()` yields a 4-component node). `.element(i)` is COMPUTE-STAGE
 *     ONLY (breaks on the WebGL2 sub-backend, three #31221).
 *   - Non-compute path (WebGPURenderer WebGL2 sub-backend): a STATIC analytic
 *     build — particles sit at their reveal-blended home with a cheap shimmer.
 *
 * All `three/webgpu` + `three/tsl` symbols are passed IN (caller lazy-imports
 * the namespaces inside the webgpuEnabled()-gated effect — never module scope).
 *
 * Material contract (selective bloom): `MeshBasicNodeMaterial`, additive,
 * `toneMapped:false`, `depthWrite:false`, `depthTest:false`; output color
 * exceeds luminance 1.0 (emissive >1.0) so the threshold≈1.0 bloom catches it.
 */
import {
  unifiedForceStep,
  type TslSymbolsGpgpu,
} from "../gpgpu/gpgpuNodeSim";
import {
  COL_CYAN,
  COL_VIOLET,
  COL_DEAD,
  HUB_COUNT,
  HUB_ARCS,
  HUB_Z,
  HUB_Z_SPAN,
  HUB_Z_MIN,
  HUB_SPHERE_RADIUS,
  NODE_FRACTION,
  NODE_JITTER,
  FLOW_JITTER,
  NEURAL_ARC_BOW,
  DISPERSE_SPREAD,
  BREAK_T,
  FIELD_NODE_EMISSIVE,
  FIELD_FLOW_EMISSIVE,
  FIELD_ALPHA_FLOOR,
  FIELD_NODE_EMIS_FLOOR,
  FIELD_FLOW_EMIS_FLOOR,
  NEURAL_POINT_SIZE,
  NEURAL_NODE_SIZE_BOOST,
  NEURAL_DEPTH_ATTEN,
  NEURAL_SPRING,
  NEURAL_DAMPING,
  NEURAL_MAX_SPEED,
  HUB_SPIN_SPEED,
  SIGNAL_K,
  SIGNAL_FLOOR,
  SIGNAL_HEAD_SPEED,
  SIGNAL_PULSE_SPEED,
  SIGNAL_PULSE_GAIN,
  HOVER_RADIUS_PULSE,
  HOVER_ARC_BOOST,
  HOVER_BURST_AMP,
  HOVER_BURST_EMISSIVE,
  HOVER_BURST_ARC,
  SEED_SCATTER_XY,
  SEED_SCATTER_Z,
} from "./neuralLatticeConfig";

// Loose structural typings — the real node/namespace types are vast & generic
// (same rationale as gpgpuNodeSim.ts). We only need the shape we call.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

export interface NeuralFieldUniforms {
  uTime: { value: number };
  /** 0→1 section fade (assemble-in from a loose cloud onto homes). */
  uReveal: { value: number };
  /** 0 healthy · 1 broken. */
  uBroken: { value: number };
  /** Per-cluster (per-hub) eased pulse 0..1 (write to `.array`, NOT `.value`). */
  uPulse: { array: number[] };
  /** Base flow speed along the arcs. */
  uFlowSpeed: { value: number };
  /** 0→1 dispersal ramp while broken & in view (per-frame). */
  uDisperse: { value: number };
  /** The 3 hub LOCAL positions (vec3) — fed from the measured card centers. */
  uHub0: { value: { set: (x: number, y: number, z: number) => unknown } };
  uHub1: { value: { set: (x: number, y: number, z: number) => unknown } };
  uHub2: { value: { set: (x: number, y: number, z: number) => unknown } };
  /** Which hub is hovered (-1 none, 0..2). Drives the flare/dim ignition. */
  uHovered: { value: number };
  /** Per-hub damped glow 0..~HOVER_FLARE (write to `.array`). */
  uHubGlow: { array: number[] };
  /** Per-hub one-shot burst envelope 0..1 (write to `.array`). The hovered hub
   * surges outward + spikes emissive on the rising edge of a hover, then decays.
   * v5 particle effect on open. */
  uHubBurst: { array: number[] };
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
}

const QUAD_CORNERS = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];

/** Deterministic [0,1) hash from an integer (matches config hash1 family). */
function h1(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * Seed the read-only per-particle role buffers. v4: homes are NO LONGER baked
 * (they derive from the uHub uniforms in-shader), so we only bake `meta` and the
 * per-particle SPHERE/jitter offsets + arc parameters that the shader combines
 * with the live hub positions.
 *
 *   meta : vec4
 *     role  (0 node | 1 flow)
 *     hubA  (node: this hub index 0..2 ; flow: FROM hub index)
 *     hubB  (node: unused/=hubA       ; flow: TO   hub index)
 *     dead  (1 if this is a "dead" arc/node in broken mode)
 *   offA : vec3 (node: sphere/jitter offset around the hub center;
 *                flow: basePhase in .x, perpendicular jitter in .yz)
 *   seed : vec3 scattered start (reveal coalesce)
 */
function seedBuffers(count: number) {
  const meta = new Float32Array(count * 4);
  const offA = new Float32Array(count * 3);
  const seed = new Float32Array(count * 3);

  const nodeCutoff = Math.floor(count * NODE_FRACTION);
  const arcCount = HUB_ARCS.length;

  for (let i = 0; i < count; i++) {
    const r0 = h1(i * 3 + 1);
    const r1 = h1(i * 7 + 5);
    const r2 = h1(i * 11 + 9);
    const r3 = h1(i * 17 + 13);

    if (i < nodeCutoff) {
      // NODE particle → assigned to a hub; offset = a point in a real-z SPHERE
      // (uniform-on-sphere via the standard z/azimuth parameterization) scaled
      // to HUB_SPHERE_RADIUS, with a small radial jitter so the orb is FILLED
      // (dense), not a hollow shell.
      const hub = Math.floor(r0 * HUB_COUNT) % HUB_COUNT;
      const az = r1 * Math.PI * 2;
      const zc = (r2 - 0.5) * 2; // cos(polar) ∈ [-1,1]
      const ring = Math.sqrt(Math.max(0, 1 - zc * zc));
      // radius: bias toward the shell but fill the interior a bit (r3 sqrt).
      const rad = HUB_SPHERE_RADIUS * (0.45 + 0.55 * Math.sqrt(r3));
      offA[i * 3] = Math.cos(az) * ring * rad;
      offA[i * 3 + 1] = Math.sin(az) * ring * rad;
      offA[i * 3 + 2] = zc * rad;
      meta[i * 4] = 0; // role = node
      meta[i * 4 + 1] = hub;
      meta[i * 4 + 2] = hub; // hubB = hubA for nodes
      meta[i * 4 + 3] = 0; // hub nodes never "dead" in v4 (dispersal is arcs)
    } else {
      // FLOW particle → assigned to an arc; rides the Bézier between its two
      // hubs. offA.x = basePhase along the arc; offA.yz = perpendicular jitter.
      const arc = Math.floor(r0 * arcCount) % arcCount;
      const [fromHub, toHub] = HUB_ARCS[arc];
      const ja = r1 * Math.PI * 2;
      const jr = FLOW_JITTER * (0.2 + r3 * 0.8);
      offA[i * 3] = r2; // basePhase ∈ [0,1)
      offA[i * 3 + 1] = Math.cos(ja) * jr;
      offA[i * 3 + 2] = Math.sin(ja) * jr;
      meta[i * 4] = 1; // role = flow
      meta[i * 4 + 1] = fromHub;
      meta[i * 4 + 2] = toHub;
      // The span arc (0→2) is the "dead" segment that fractures in broken mode.
      meta[i * 4 + 3] = fromHub === 0 && toHub === 2 ? 1 : 0;
    }

    // Scattered seed (loose cloud) — particles coalesce onto homes as uReveal
    // rises.
    seed[i * 3] = (r0 - 0.5) * SEED_SCATTER_XY;
    seed[i * 3 + 1] = (r1 - 0.5) * SEED_SCATTER_XY;
    seed[i * 3 + 2] = (r2 - 0.5) * SEED_SCATTER_Z;
  }

  return { meta, offA, seed };
}

export function createNeuralFieldBuild(
  args: NeuralFieldBuildArgs,
): NeuralFieldBuild {
  const { webgpu, tsl, gl, backendIsWebGPU, count } = args;
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
    fract,
    mix,
    smoothstep,
    Discard,
    varying,
    select,
    pow,
    abs,
    exp,
  } = tsl as Any;

  const { meta, offA, seed } = seedBuffers(count);

  // --- Shared uniforms ------------------------------------------------------
  const uTime = uniform(0);
  const uReveal = uniform(0);
  const uBroken = uniform(0);
  const uPulse = uniformArray([0, 0, 0]);
  const uFlowSpeed = uniform(0.22);
  const uDisperse = uniform(0);
  // Hub LOCAL positions (default until the first measure).
  const uHub0 = uniform(new Vector3(...(arrXY(0))));
  const uHub1 = uniform(new Vector3(...(arrXY(1))));
  const uHub2 = uniform(new Vector3(...(arrXY(2))));
  const uHovered = uniform(-1);
  const uHubGlow = uniformArray([1, 1, 1]);
  const uHubBurst = uniformArray([0, 0, 0]);
  const uPixelRatio = uniform(1);
  const uViewport = uniform(new Vector2(1, 1));
  const uColCyan = uniform(new Color(COL_CYAN));
  const uColViolet = uniform(new Color(COL_VIOLET));
  const uColDead = uniform(new Color(COL_DEAD));
  const uPointSize = uniform(NEURAL_POINT_SIZE);

  function arrXY(hub: number): [number, number, number] {
    // default fallback positions baked into the uniform initial values.
    const xy: [number, number][] = [
      [-0.34, 0],
      [0, 0],
      [0.34, 0],
    ];
    const [x, y] = xy[hub] ?? [0, 0];
    return [x, y, HUB_Z[hub] ?? 0];
  }

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
  // In-shader hub picker: returns hub center vec3 for index ∈ {0,1,2} from the
  // live uHub uniforms (so resize = uniform update, no rebuild).
  // ------------------------------------------------------------------------
  function hubPos(idx: Any): Any {
    const is0 = idx.lessThan(float(0.5));
    const is1 = idx.lessThan(float(1.5));
    return select(is0, uHub0, select(is1, uHub1, uHub2));
  }
  function hubGlow(idx: Any): Any {
    const ci = int(clamp(idx, float(0), float(2)));
    return uHubGlow.element(ci) as Any;
  }
  function hubBurst(idx: Any): Any {
    const ci = int(clamp(idx, float(0), float(2)));
    return uHubBurst.element(ci) as Any;
  }

  function quadBezier(a: Any, c: Any, b: Any, t: Any): Any {
    const omt = float(1).sub(t);
    return a
      .mul(omt.mul(omt))
      .add(c.mul(float(2).mul(omt).mul(t)))
      .add(b.mul(t.mul(t)));
  }

  // Hub self-spin: rotate a node's sphere offset about Y so near/far particles
  // parallax (the orb reads as a 3D volume). Per-hub phase from the hub index.
  function spinOffset(off: Any, hubIdx: Any): Any {
    const ang = uTime
      .mul(float(HUB_SPIN_SPEED))
      .add(hubIdx.mul(float(2.1)));
    const ca = cos(ang);
    const sa = sin(ang);
    const x = off.x.mul(ca).add(off.z.mul(sa));
    const z = off.z.mul(ca).sub(off.x.mul(sa));
    return vec3(x, off.y, z);
  }

  /**
   * The analytic anchor: where particle i WANTS to be, from the live uHub
   * uniforms + its read-only role/offset buffers.
   *   role 0 (node): anchor = hub[hubA] + spin(sphereOffset)
   *   role 1 (flow): anchor = Bézier(hubFrom, control, hubTo) at
   *                  t = fract(basePhase + uTime*uFlowSpeed*hubSpeed) + perp jitter
   *                  ; dead+broken+t>BREAK_T → blend toward outward dispersal.
   */
  function anchorNode(opts: { metaN: Any; offN: Any }): Any {
    const { metaN, offN } = opts;
    const role = metaN.x;
    const hubA = metaN.y;
    const hubB = metaN.z;
    const dead = metaN.w;

    // -------- NODE branch --------
    // v5 burst: on the rising edge of a hover the hovered hub's node particles
    // SURGE outward along their sphere offset (a real expansion), then re-settle
    // as the burst envelope decays. Steady radius pulse (glow) stays additive.
    const hubC = hubPos(hubA).toVar();
    const burst = hubBurst(hubA);
    const surge = float(1).add(burst.mul(float(HOVER_BURST_AMP)));
    const nodeAnchor = hubC.add(spinOffset(offN, hubA).mul(surge)).toVar();

    // -------- FLOW branch --------
    const aHub = hubPos(hubA).toVar();
    const bHub = hubPos(hubB).toVar();
    // Control = midpoint bowed toward the camera (+z) so the arc curves in 3D.
    const mid = aHub.add(bHub).mul(0.5).toVar();
    const ctrl = mid.add(vec3(0, 0, float(NEURAL_ARC_BOW))).toVar();

    // Per-arc flow speed: base × the larger of the two hub glows (incident arcs
    // of the hovered hub race) × the cluster pulse boost on the FROM hub × the
    // burst surge (v5: signal accelerates toward the opening card).
    const ci = int(clamp(hubA, float(0), float(2)));
    const pulse = (uPulse.element(ci) as Any).mul(1.0);
    const glowBoost = max(hubGlow(hubA), hubGlow(hubB));
    const arcBurst = max(hubBurst(hubA), hubBurst(hubB));
    const clusterSpeed = float(0.7)
      .add(pulse.mul(0.9))
      .mul(float(1).add(glowBoost.sub(1.0).mul(float(HOVER_ARC_BOOST - 1.0))))
      .mul(float(1).add(arcBurst.mul(float(HOVER_BURST_ARC))));

    const basePhase = offN.x;
    const tFlow = fract(
      basePhase.add(uTime.mul(uFlowSpeed).mul(clusterSpeed)),
    ).toVar();
    const bez = quadBezier(aHub, ctrl, bHub, tFlow).toVar();
    // perpendicular jitter (offN.yz) gives the stream thickness.
    const jit = vec3(offN.y, offN.z, float(0));
    const flowOnArc = bez.add(jit).toVar();

    // Broken dispersal: dead flow particles past BREAK_T detach outward.
    const past = smoothstep(float(BREAK_T), float(BREAK_T).add(0.12), tFlow);
    const outDir = bHub.add(vec3(1e-5, 1e-5, 1e-5)).normalize();
    const dispersed = bHub.add(
      outDir.mul(uDisperse.mul(past).mul(dead).mul(uBroken).mul(DISPERSE_SPREAD)),
    );
    const flowAnchor = mix(
      flowOnArc,
      dispersed,
      clamp(uDisperse.mul(past).mul(dead).mul(uBroken), float(0), float(1)),
    );

    return mix(nodeAnchor, flowAnchor, role);
  }

  /** Flow parameter t recomputed in render (matches anchor's fract). */
  function flowParam(basePhase: Any, hubA: Any, hubB: Any): Any {
    const ci = int(clamp(hubA, float(0), float(2)));
    const pulse = (uPulse.element(ci) as Any).mul(1.0);
    const glowBoost = max(hubGlow(hubA), hubGlow(hubB));
    const arcBurst = max(hubBurst(hubA), hubBurst(hubB));
    const clusterSpeed = float(0.7)
      .add(pulse.mul(0.9))
      .mul(float(1).add(glowBoost.sub(1.0).mul(float(HOVER_ARC_BOOST - 1.0))))
      .mul(float(1).add(arcBurst.mul(float(HOVER_BURST_ARC))));
    return fract(basePhase.add(uTime.mul(uFlowSpeed).mul(clusterSpeed)));
  }

  /** Travelling SIGNAL: a moving gaussian brightness peak running hub→hub. */
  function signalBrightness(tFlow: Any, hubA: Any, hubB: Any): Any {
    const ci = int(clamp(hubA, float(0), float(2)));
    const pulse = (uPulse.element(ci) as Any).mul(1.0);
    const glowBoost = max(hubGlow(hubA), hubGlow(hubB));
    const arcBurst = max(hubBurst(hubA), hubBurst(hubB));
    const headSpeed = float(SIGNAL_HEAD_SPEED)
      .mul(float(1).add(pulse.mul(float(SIGNAL_PULSE_SPEED))))
      .mul(float(1).add(glowBoost.sub(1.0).mul(float(HOVER_ARC_BOOST - 1.0))))
      .mul(float(1).add(arcBurst.mul(float(HOVER_BURST_ARC))));
    const headT = fract(uTime.mul(headSpeed));
    const d = fract(tFlow.sub(headT).add(1.0));
    const dWrap = min(d, float(1).sub(d));
    const peak = exp(float(SIGNAL_K).mul(dWrap.mul(dWrap)).negate());
    const amp = float(1)
      .add(pulse.mul(float(SIGNAL_PULSE_GAIN)))
      .add(glowBoost.sub(1.0).mul(0.8))
      .add(arcBurst.mul(0.9));
    return float(SIGNAL_FLOOR).add(peak.mul(amp));
  }

  // Shared depthT: local z of an anchor mapped to [0,1] over the hub-z span.
  function depthT(z: Any): Any {
    return clamp(z.sub(float(HUB_Z_MIN)).div(float(HUB_Z_SPAN)), float(0), float(1));
  }

  // === Static (no-compute) build ===========================================
  if (!backendIsWebGPU) {
    const material = new MeshBasicNodeMaterial();
    const aMeta = attribute("aMeta");
    const aOff = attribute("aOff");
    const aSeed = attribute("aSeed");

    const vDepth = float(0).toVar();
    const vRole = float(0).toVar();
    const vDead = float(0).toVar();
    const vGlow = float(1).toVar();
    const vBurst = float(0).toVar();
    const vSignal = float(1).toVar();

    material.vertexNode = Fn(() => {
      const anchor = anchorNode({ metaN: aMeta, offN: aOff }).toVar();
      const tFlowS = flowParam(aOff.x, aMeta.y, aMeta.z);
      vSignal.assign(mix(float(1), signalBrightness(tFlowS, aMeta.y, aMeta.z), aMeta.x));
      const rv = smoothstep(float(0), float(1), uReveal);
      const center = mix(aSeed, anchor, rv).toVar();
      center.addAssign(
        vec3(
          sin(center.y.mul(7.0).add(uTime.mul(0.9))),
          sin(center.z.mul(7.0).add(uTime.mul(1.1))),
          sin(center.x.mul(7.0).add(uTime.mul(0.7))),
        ).mul(0.004),
      );

      // hub glow that this particle belongs to (node → its hub; flow → max of
      // its two hubs, so an arc lights with the brighter endpoint).
      const glowN = mix(
        hubGlow(aMeta.y),
        max(hubGlow(aMeta.y), hubGlow(aMeta.z)),
        aMeta.x,
      );
      vGlow.assign(glowN);
      // v5 burst envelope for this particle (node → its hub; flow → max of arc
      // endpoints) → emissive spike in the fragment shade.
      vBurst.assign(
        mix(hubBurst(aMeta.y), max(hubBurst(aMeta.y), hubBurst(aMeta.z)), aMeta.x),
      );
      vDepth.assign(depthT(center.z));
      vRole.assign(aMeta.x);
      vDead.assign(aMeta.w);

      const mv = modelViewMatrix.mul(vec4(center, 1.0)).toVar();
      const dist = mv.z.negate();
      const clip = cameraProjectionMatrix.mul(mv).toVar();
      const roleBoost = mix(float(NEURAL_NODE_SIZE_BOOST), float(1.0), aMeta.x);
      // hovered hub radius pulse + depth attenuation (nearer = bigger).
      const depthAtten = float(1).add(depthT(center.z).sub(0.5).mul(float(NEURAL_DEPTH_ATTEN)));
      const sizeNode = uPointSize
        .mul(uPixelRatio)
        .mul(roleBoost)
        .mul(float(1).add(glowN.sub(1.0).mul(float(HOVER_RADIUS_PULSE))))
        .mul(depthAtten)
        .div(max(dist, 0.001));
      const corner = positionLocal.xy;
      clip.xy.addAssign(
        corner.mul(sizeNode).div(uViewport).mul(2.0).mul(clip.w),
      );
      return clip;
    })();

    const vQuadUv = varying(positionLocal.xy);
    const vDepthF = varying(vDepth);
    const vRoleF = varying(vRole);
    const vDeadF = varying(vDead);
    const vGlowF = varying(vGlow);
    const vBurstF = varying(vBurst);
    const vSignalF = varying(vSignal);

    const shade = Fn(() => {
      const disc = smoothstep(0.5, 0.12, length(vQuadUv)).toVar();
      const grad = mix(uColCyan, uColViolet, clamp(vDepthF, float(0), float(1)));
      const deadMix = uBroken.mul(vDeadF);
      const tone = mix(grad, uColDead, deadMix.mul(0.6)).toVar();
      const emis = mix(
        float(FIELD_NODE_EMISSIVE).mul(float(FIELD_NODE_EMIS_FLOOR)),
        float(FIELD_FLOW_EMISSIVE).mul(float(FIELD_FLOW_EMIS_FLOOR)),
        vRoleF,
      )
        .mul(vGlowF)
        .mul(float(1).add(vBurstF.mul(float(HOVER_BURST_EMISSIVE))))
        .mul(float(1).sub(deadMix.mul(0.5)))
        .mul(vSignalF);
      const col = tone.toVec3().mul(emis);
      const alpha = disc.mul(float(FIELD_ALPHA_FLOOR)).mul(uReveal).toVar();
      Discard(alpha.lessThan(0.004));
      return vec4(col, alpha);
    })();
    material.colorNode = (shade as Any).xyz;
    material.opacityNode = (shade as Any).w;
    material.transparent = true;
    material.depthWrite = false;
    material.depthTest = false;
    material.blending = AdditiveBlending;
    material.toneMapped = false;
    material.side = DoubleSide;

    void pow;
    void abs;

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
    const dead = metaN.w;

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

    // Weaken the spring for dispersing dead flow particles (broken span arc).
    const tFlowSim = flowParam(offN.x, metaN.y, metaN.z);
    const past = smoothstep(float(BREAK_T), float(BREAK_T).add(0.12), tFlowSim);
    const dispersing = clamp(
      uDisperse.mul(past).mul(dead).mul(role).mul(uBroken),
      float(0),
      float(1),
    ).toVar();
    const spring = SPRING.mul(float(1).sub(dispersing.mul(0.85)));

    const vel = velH.toVar();
    unifiedForceStep(tsl as TslSymbolsGpgpu, {
      pos: pos as Any,
      vel: vel as Any,
      anchor: anchor as Any,
      dt: uDelta as Any,
      spring: spring as Any,
      damping: DAMPING as Any,
      maxSpeed: MAX_SPEED as Any,
      extraAcc: (acc: Any) => {
        const turb = vec3(
          sin(pos.y.mul(6.0).add(uTime.mul(2.1))),
          sin(pos.z.mul(6.0).add(uTime.mul(1.7))),
          sin(pos.x.mul(6.0).add(uTime.mul(1.3))),
        );
        acc.addAssign(turb.mul(dispersing.mul(6.0)));
      },
    });

    velH.assign(vel);
    pos.addAssign(vel.mul(uDelta));
  })().compute(count);

  // --- Render: instanced billboard reading the storage buffers --------------
  const material = new MeshBasicNodeMaterial();

  const vDepth = float(0).toVar();
  const vRole = float(0).toVar();
  const vDead = float(0).toVar();
  const vGlow = float(1).toVar();
  const vBurst = float(0).toVar();
  const vAlive = float(1).toVar();
  const vSignal = float(1).toVar();

  material.vertexNode = Fn(() => {
    // `.xyz` MANDATORY on a "vec3" storage buffer read (padded to 16B → 4-comp).
    const p = positionBuffer.toAttribute().xyz.toVar();
    const m = metaBuffer.toAttribute();
    const role = m.x;
    const hubA = m.y;
    const hubB = m.z;
    const dead = m.w;
    const off = offBuffer.toAttribute().xyz;

    const glowN = mix(hubGlow(hubA), max(hubGlow(hubA), hubGlow(hubB)), role);
    vGlow.assign(glowN);
    // v5 burst envelope (node → its hub; flow → max of arc endpoints).
    vBurst.assign(mix(hubBurst(hubA), max(hubBurst(hubA), hubBurst(hubB)), role));
    vDepth.assign(depthT(p.z));
    vRole.assign(role);
    vDead.assign(dead);

    const tF = flowParam(off.x, hubA, hubB);
    const past = smoothstep(float(BREAK_T), float(BREAK_T).add(0.12), tF);
    const disp = clamp(
      uDisperse.mul(past).mul(dead).mul(role).mul(uBroken),
      float(0),
      float(1),
    );
    vAlive.assign(float(1).sub(disp.mul(0.85)));
    vSignal.assign(mix(float(1), signalBrightness(tF, hubA, hubB), role));

    const mv = modelViewMatrix.mul(vec4(p, 1.0)).toVar();
    const dist = mv.z.negate();
    const clip = cameraProjectionMatrix.mul(mv).toVar();
    const roleBoost = mix(float(NEURAL_NODE_SIZE_BOOST), float(1.0), role);
    const depthAtten = float(1).add(depthT(p.z).sub(0.5).mul(float(NEURAL_DEPTH_ATTEN)));
    const sizeNode = uPointSize
      .mul(uPixelRatio)
      .mul(roleBoost)
      .mul(float(1).add(glowN.sub(1.0).mul(float(HOVER_RADIUS_PULSE))))
      .mul(depthAtten)
      .div(max(dist, 0.001));
    const corner = positionLocal.xy;
    clip.xy.addAssign(
      corner.mul(sizeNode).div(uViewport).mul(2.0).mul(clip.w),
    );
    return clip;
  })();

  const vQuadUv = varying(positionLocal.xy);
  const vDepthF = varying(vDepth);
  const vRoleF = varying(vRole);
  const vDeadF = varying(vDead);
  const vGlowF = varying(vGlow);
  const vBurstF = varying(vBurst);
  const vAliveF = varying(vAlive);
  const vSignalF = varying(vSignal);

  const shade = Fn(() => {
    const disc = smoothstep(0.5, 0.12, length(vQuadUv)).toVar();
    const grad = mix(uColCyan, uColViolet, clamp(vDepthF, float(0), float(1)));
    // broken: the dead span arc desaturates toward COL_DEAD + dims.
    const deadMix = uBroken.mul(vDeadF);
    const tone = mix(grad, uColDead, deadMix.mul(0.6)).toVar();
    const emis = mix(
      float(FIELD_NODE_EMISSIVE).mul(float(FIELD_NODE_EMIS_FLOOR)),
      float(FIELD_FLOW_EMISSIVE).mul(float(FIELD_FLOW_EMIS_FLOOR)),
      vRoleF,
    )
      .mul(vGlowF)
      .mul(float(1).add(vBurstF.mul(float(HOVER_BURST_EMISSIVE))))
      .mul(float(1).sub(deadMix.mul(0.5)))
      .mul(vSignalF);
    const col = tone.toVec3().mul(emis);
    const alpha = disc
      .mul(float(FIELD_ALPHA_FLOOR))
      .mul(vAliveF)
      .mul(uReveal)
      .toVar();
    Discard(alpha.lessThan(0.004));
    return vec4(col, alpha);
  })();
  material.colorNode = (shade as Any).xyz;
  material.opacityNode = (shade as Any).w;
  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = false;
  material.blending = AdditiveBlending;
  material.toneMapped = false;
  material.side = DoubleSide;

  // avoid unused-import lint for symbols only used on one branch.
  void pow;
  void abs;

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
      uPulse: uPulse as unknown as { array: number[] },
      uFlowSpeed,
      uDisperse,
      uHub0: uHub0 as Any,
      uHub1: uHub1 as Any,
      uHub2: uHub2 as Any,
      uHovered: uHovered as Any,
      uHubGlow: uHubGlow as unknown as { array: number[] },
      uHubBurst: uHubBurst as unknown as { array: number[] },
      uPixelRatio,
      uViewport: uViewport as Any,
    };
  }
}
