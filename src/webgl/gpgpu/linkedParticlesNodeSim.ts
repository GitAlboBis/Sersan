/**
 * Linked-particles TSL build — the /trust CompliancePipeline3D centerpiece
 * (step 7, SLICE B). A 6-stage horizontal conduit of particles flowing
 * Input(stage0) → Output(stage5), with a second draw call drawing a thin link
 * ribbon to each particle's fixed lane-successor. Authored in the camera-locked
 * group's LOCAL space (linkedParticlesConfig) — NOT world Y.
 *
 * Adapted from the three.js `webgpu_tsl_vfx_linkedparticles` example (MIT), with
 * the reconciled decisions applied:
 *   - FIXED cyan→violet ramp keyed to flow position s (NO hue() cycling — brand
 *     rule). cyan #3BE1FF at Input, violet tail #6E7BFF at Output.
 *   - FIXED sequential links: each particle links to its lane-successor at a
 *     fixed flow-phase offset (LANE_STEP), an O(1) ANALYTIC neighbour — the
 *     example's O(n²) Loop(nbParticles) neighbour search is REJECTED.
 *   - links = a SECOND draw call: a BufferGeometry with StorageBufferAttribute
 *     position+color quads (filled by the same compute kernel), MeshBasicNode-
 *     Material vertexColors + AdditiveBlending + toneMapped:false.
 *   - per-stage ignition is an EMISSIVE boost (brightness only, NO hue shift),
 *     driven by a 6-float ignition uniform the caller advances.
 *   - emissive >1.0 + toneMapped:false so the EXISTING PostFXNodes selective
 *     bloom catches it — NO bloom pass added here.
 *
 * STORAGE-BUFFER RULE (the step-4 regression, see gpgpuNodeSim.ts L15-20): the
 * particle state is packed as vec4 (xyz=pos, w=flow phase) to sidestep the vec3
 * 16-byte padding trap. `.toAttribute()` on a vec4 buffer is naturally 4-wide;
 * we STILL swizzle `.xyz` before any vec3 op / `vec4(...)` and read `.w` for the
 * phase. Every render read trails the correct swizzle.
 *
 * BACKEND CONTRACT: the compute kernel (`gl.compute`, storage `.element()`) is
 * valid ONLY on the TRUE WebGPU sub-backend (#31221). The CALLER gates on
 * `backend.isWebGLBackend !== true && typeof gl.compute === "function"` (mirror
 * HeroLogo) and never builds this on WebGL2-fallback.
 *
 * All `three/webgpu` + `three/tsl` symbols are passed IN by the caller (lazy
 * import), so this module never lands in the OFF bundle — exactly like
 * gpgpuNodeSim.ts. Loosely typed for the same reason.
 */
import {
  STAGE_COUNT,
  CONDUIT_HALF,
  LANE_COUNT,
  LANE_GAP,
  LANE_STEP,
  COL_CYAN,
  COL_VIOLET,
  EMISSIVE,
  PARTICLE_SIZE,
  LINK_WIDTH,
  LINK_OPACITY,
  FLOW_SPEED,
} from "./linkedParticlesConfig";

// --- Loose structural types for the lazily-imported namespaces --------------
// (Mirrors gpgpuNodeSim.ts' AnyNode shape; the real node types are vast/generic.)
type AnyNode = {
  add: (n: AnyNode | number) => AnyNode;
  sub: (n: AnyNode | number) => AnyNode;
  mul: (n: AnyNode | number) => AnyNode;
  div: (n: AnyNode | number) => AnyNode;
  negate: () => AnyNode;
  oneMinus: () => AnyNode;
  toVar: () => AnyNode;
  addAssign: (n: AnyNode | number) => void;
  assign: (n: AnyNode | number) => void;
  element: (index: AnyNode) => AnyNode & { value: unknown };
  toAttribute: () => AnyNode;
  compute: (count: number) => AnyNode;
  /** Vector length (node METHOD form, e.g. `uv().sub(0.5).length()`). */
  length: () => AnyNode;
  x: AnyNode;
  y: AnyNode;
  z: AnyNode;
  w: AnyNode;
  xy: AnyNode;
  xyz: AnyNode;
};
type UniformNode<T> = AnyNode & { value: T };

interface ColorLike {
  set: (c: number | string) => ColorLike;
}
interface Vec3Like {
  set: (x: number, y: number, z: number) => Vec3Like;
}
interface NodeMaterialLike {
  colorNode: unknown;
  opacityNode: unknown;
  positionNode: unknown;
  scaleNode: unknown;
  vertexColors: boolean;
  transparent: boolean;
  depthTest: boolean;
  depthWrite: boolean;
  blending: number;
  toneMapped: boolean;
  side: number;
  dispose: () => void;
}
interface BufferGeometryLike {
  setAttribute: (name: string, attr: unknown) => void;
  setIndex: (attr: unknown) => void;
  instanceCount?: number;
  dispose: () => void;
}
interface RendererLike {
  compute: (node: unknown) => void;
}

export interface WebGPUSymbolsLinked {
  InstancedBufferGeometry: new () => BufferGeometryLike;
  BufferGeometry: new () => BufferGeometryLike;
  BufferAttribute: new (arr: ArrayLike<number>, itemSize: number) => unknown;
  StorageBufferAttribute: new (count: number, itemSize: number) => unknown;
  SpriteNodeMaterial: new () => NodeMaterialLike;
  MeshBasicNodeMaterial: new () => NodeMaterialLike;
  Color: new (c?: number | string) => ColorLike;
  Vector3: new (x?: number, y?: number, z?: number) => Vec3Like;
  AdditiveBlending: number;
  DoubleSide: number;
}

export interface TslSymbolsLinked {
  uniform: (v: unknown) => UniformNode<unknown>;
  instancedArray: (
    count: number | Float32Array,
    type: string,
  ) => AnyNode & { value: unknown };
  storage: (
    attr: unknown,
    type: string,
    count: number,
  ) => AnyNode & { value: unknown };
  instanceIndex: AnyNode;
  Fn: (fn: () => AnyNode | void) => () => AnyNode;
  vec2: (x: AnyNode | number, y?: AnyNode | number) => AnyNode;
  vec3: (
    x: AnyNode | number,
    y?: AnyNode | number,
    z?: AnyNode | number,
  ) => AnyNode;
  vec4: (
    x: AnyNode | number,
    y?: AnyNode | number,
    z?: AnyNode | number,
    w?: AnyNode | number,
  ) => AnyNode;
  float: (v: number) => AnyNode;
  clamp: (n: AnyNode, a: number, b: number) => AnyNode;
  sin: (n: AnyNode) => AnyNode;
  fract: (n: AnyNode) => AnyNode;
  mix: (a: AnyNode, b: AnyNode, t: AnyNode | number) => AnyNode;
  smoothstep: (a: AnyNode | number, b: AnyNode | number, x: AnyNode) => AnyNode;
  step: (edge: AnyNode | number, x: AnyNode | number) => AnyNode;
  uv: () => AnyNode;
}

export interface LinkedParticlesBuild {
  particleGeom: BufferGeometryLike;
  particleMat: NodeMaterialLike;
  linksGeom: BufferGeometryLike;
  linksMat: NodeMaterialLike;
  uniforms: {
    uTime: UniformNode<number>;
    uDelta: UniformNode<number>;
    uReveal: UniformNode<number>;
  };
  /** Advance the sim one frame: set uniforms, dispatch the compute kernel. */
  tick: (dt: number, time: number, reveal: number, ignite: number[]) => void;
  dispose: () => void;
}

/**
 * Build the linked-particle conduit. `opts.count` is the particle count for the
 * active tier (full = 4096). Everything is authored in LOCAL space — the caller
 * (CompliancePipeline3D) scales/positions the parent group to the SVG card rect.
 */
export function createLinkedParticlesBuild(
  gl: RendererLike,
  webgpu: WebGPUSymbolsLinked,
  tsl: TslSymbolsLinked,
  opts: { count: number },
): LinkedParticlesBuild {
  const {
    BufferGeometry,
    InstancedBufferGeometry,
    BufferAttribute,
    StorageBufferAttribute,
    SpriteNodeMaterial,
    MeshBasicNodeMaterial,
    Color,
    Vector3,
    AdditiveBlending,
    DoubleSide,
  } = webgpu;
  const {
    uniform,
    instancedArray,
    storage,
    instanceIndex,
    Fn,
    vec2,
    vec3,
    vec4,
    float,
    clamp,
    sin,
    fract,
    mix,
    smoothstep,
    step,
    uv,
  } = tsl;

  const N = opts.count;

  // --- Seed: particle state vec4 (xyz = local pos, w = flow phase s) --------
  // Distribute particles across LANE_COUNT lanes, staggered along s so the
  // conduit reads as a continuous stream rather than a marching grid.
  const seed = new Float32Array(N * 4);
  const laneData = new Float32Array(N);
  const laneCenter = (LANE_COUNT - 1) / 2;
  for (let i = 0; i < N; i++) {
    const lane = i % LANE_COUNT;
    const laneY = (lane - laneCenter) * LANE_GAP;
    const s = (i / N + (i % 7) * 0.013) % 1; // staggered initial phase
    const x = -CONDUIT_HALF + s * (CONDUIT_HALF * 2);
    seed[i * 4] = x;
    seed[i * 4 + 1] = laneY;
    seed[i * 4 + 2] = 0;
    seed[i * 4 + 3] = s;
    laneData[i] = laneY;
  }

  const posBuf = instancedArray(seed, "vec4");
  const laneBuf = instancedArray(laneData, "float");

  // Link vertex/color storage buffers — 4 verts per particle (one quad to the
  // lane-successor). Raw StorageBufferAttribute so they bind as NON-instanced
  // geometry attributes (position + color).
  const linkVerts = new StorageBufferAttribute(N * 4, 4);
  const linkColors = new StorageBufferAttribute(N * 4, 4);

  // --- Uniforms --------------------------------------------------------------
  const uTime = uniform(0) as UniformNode<number>;
  const uDelta = uniform(1 / 60) as UniformNode<number>;
  const uFlow = uniform(FLOW_SPEED) as UniformNode<number>;
  const uReveal = uniform(0) as UniformNode<number>;
  const uEmissive = uniform(EMISSIVE) as UniformNode<number>;
  const uLinkW = uniform(LINK_WIDTH) as UniformNode<number>;
  const uLinkOpacity = uniform(LINK_OPACITY) as UniformNode<number>;
  // Two vec3 uniforms carrying the 6 per-stage ignition values (0..1). Packed
  // as 2× vec3 to avoid an array-uniform dependency; ignite0 = stages 0..2,
  // ignite1 = stages 3..5. Real THREE.Vector3 values so `.value.set(...)` works
  // exactly like the Vector uniforms in gpgpuNodeSim/HeroLogo.
  const uIgnite0 = uniform(new Vector3(0, 0, 0)) as UniformNode<Vec3Like>;
  const uIgnite1 = uniform(new Vector3(0, 0, 0)) as UniformNode<Vec3Like>;

  const colCyan = uniform(new Color(COL_CYAN)) as UniformNode<ColorLike>;
  const colViolet = uniform(new Color(COL_VIOLET)) as UniformNode<ColorLike>;

  const dtN = uDelta as unknown as AnyNode;
  const timeN = uTime as unknown as AnyNode;
  const flowN = uFlow as unknown as AnyNode;
  const emissiveN = uEmissive as unknown as AnyNode;
  const linkWN = uLinkW as unknown as AnyNode;
  const linkOpacityN = uLinkOpacity as unknown as AnyNode;
  const cyanN = colCyan as unknown as AnyNode;
  const violetN = colViolet as unknown as AnyNode;
  const ignite0N = uIgnite0 as unknown as AnyNode;
  const ignite1N = uIgnite1 as unknown as AnyNode;

  const HALF = float(CONDUIT_HALF);
  const NEG_HALF = float(-CONDUIT_HALF);

  /** FIXED cyan→violet ramp at flow position s (NO hue cycling). */
  const brandRamp = (s: AnyNode): AnyNode => mix(cyanN, violetN, clamp(s, 0, 1));

  // Per-stage ignition channels (0..1), one per stage, read from the two packed
  // vec3 uniforms (ignite0 = stages 0..2, ignite1 = stages 3..5).
  const igniteChannels: AnyNode[] = [
    ignite0N.x,
    ignite0N.y,
    ignite0N.z,
    ignite1N.x,
    ignite1N.y,
    ignite1N.z,
  ];

  /**
   * Per-stage ignition at flow position s: sum each stage's 0..1 ignition with a
   * smooth falloff around its s position (stages evenly spaced in s ∈ [0,1]).
   * Returns an emissive BOOST (added to the base emissive — brightness only, NO
   * hue shift). Falloff = smoothstep on (W² − d²) so it's a soft bump of half-
   * width W without needing abs() chaining on the loose node type.
   */
  const IGNITE_W = 0.1;
  const stageIgnite = (s: AnyNode): AnyNode => {
    let boost = float(0) as AnyNode;
    for (let i = 0; i < STAGE_COUNT; i++) {
      const stageS = i / (STAGE_COUNT - 1);
      const d = s.sub(stageS);
      const falloff = smoothstep(
        0.0,
        IGNITE_W * IGNITE_W,
        d.mul(d).negate().add(IGNITE_W * IGNITE_W),
      );
      boost = boost.add(igniteChannels[i].mul(falloff));
    }
    return boost;
  };

  // === Compute kernel: flow + analytic links ================================
  const simulate = Fn(() => {
    const st = posBuf.element(instanceIndex);
    const lane = laneBuf.element(instanceIndex);
    const sV = st.w.toVar();
    sV.addAssign(dtN.mul(flowN));
    const s = fract(sV).toVar();

    // Analytic conduit position from s + lane (deterministic flow). Write the
    // whole vec4 in one assign (xyz=pos, w=phase) — the storage-element write
    // discipline of the spore/text kernels (whole-vector .assign, never per-
    // component), which sidesteps any component-assign hazard on the buffer.
    const x = mix(NEG_HALF, HALF, s);
    const y = lane.add(sin(s.mul(20.0).add(timeN)).mul(0.01)); // tiny shimmer
    st.assign(vec4(x, y, float(0.0), s));

    // --- Link quad to the lane-successor (analytic — no buffer read) --------
    const lv = storage(linkVerts, "vec4", N * 4);
    const lc = storage(linkColors, "vec4", N * 4);
    const base = instanceIndex.mul(4);
    const nextS = fract(s.add(LANE_STEP));
    const nx = mix(NEG_HALF, HALF, nextS);
    const me = vec3(x, y, 0.0);
    const them = vec3(nx, y, 0.0);

    lv.element(base).assign(vec4(me.x, me.y.add(linkWN), me.z, 1.0));
    lv.element(base.add(1)).assign(vec4(me.x, me.y.sub(linkWN), me.z, 1.0));
    lv.element(base.add(2)).assign(vec4(them.x, them.y.sub(linkWN), them.z, 1.0));
    lv.element(base.add(3)).assign(vec4(them.x, them.y.add(linkWN), them.z, 1.0));

    // Link color = brand ramp at s × emissive, fade near the conduit ends.
    // Reversed-edge smoothsteps written as forward + oneMinus (a reversed edge
    // is undefined in WGSL's smoothstep — railPlaneNodeMaterial header).
    const ramp = brandRamp(s);
    const endFade = smoothstep(0.0, 0.06, s).mul(
      smoothstep(0.94, 1.0, s).oneMinus(),
    );
    const a = endFade.mul(linkOpacityN);
    const lcol = ramp.mul(emissiveN);
    lc.element(base).assign(vec4(lcol.x, lcol.y, lcol.z, a));
    lc.element(base.add(1)).assign(vec4(lcol.x, lcol.y, lcol.z, a));
    lc.element(base.add(2)).assign(vec4(lcol.x, lcol.y, lcol.z, a));
    lc.element(base.add(3)).assign(vec4(lcol.x, lcol.y, lcol.z, a));
  })().compute(N);

  // === Particle render — SpriteNodeMaterial billboards ======================
  // SpriteNodeMaterial reads positionGeometry.xy for the quad CORNER and uv()
  // for the disc mask (see three's SpriteNodeMaterial.setupPositionView), so the
  // instance geometry MUST carry a unit quad (position + uv); the per-instance
  // CENTER comes from positionNode (the compute buffer). InstancedBufferGeometry
  // + instanceCount = N draws the quad once per particle.
  const particleGeom = new InstancedBufferGeometry();
  // Unit quad corners in [-0.5, 0.5] (xy; z=0) + uv in [0,1].
  const QUAD_POS = new Float32Array([
    -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
  ]);
  const QUAD_UV = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
  const QUAD_IDX = new Uint16Array([0, 1, 2, 0, 2, 3]);
  particleGeom.setAttribute("position", new BufferAttribute(QUAD_POS, 3));
  particleGeom.setAttribute("uv", new BufferAttribute(QUAD_UV, 2));
  particleGeom.setIndex(new BufferAttribute(QUAD_IDX, 1));
  particleGeom.instanceCount = N;

  const particleMat = new SpriteNodeMaterial();
  particleMat.blending = AdditiveBlending;
  particleMat.depthWrite = false;
  particleMat.depthTest = false;
  particleMat.transparent = true;
  particleMat.toneMapped = false;

  // vec4 buffer: `.toAttribute()` is 4-wide. `.xyz` for the sprite CENTER
  // (MANDATORY — w=phase must not leak into the position); `.w` for the phase.
  particleMat.positionNode = posBuf.toAttribute().xyz;
  particleMat.scaleNode = vec2(float(PARTICLE_SIZE), float(PARTICLE_SIZE));

  const sN = posBuf.toAttribute().w;
  const boost = stageIgnite(sN);
  particleMat.colorNode = brandRamp(sN).mul(emissiveN.add(boost));
  // Round disc + end fade + presence reveal. Reversed-edge smoothstep written
  // as forward + oneMinus (WGSL-safe, see railPlaneNodeMaterial header).
  particleMat.opacityNode = step(uv().sub(0.5).length(), 0.5)
    .mul(smoothstep(0.0, 0.06, sN))
    .mul(smoothstep(0.94, 1.0, sN).oneMinus())
    .mul(uReveal as unknown as AnyNode);

  // === Links render — second draw call (BufferGeometry + storage quads) =====
  const linksGeom = new BufferGeometry();
  linksGeom.setAttribute("position", linkVerts);
  linksGeom.setAttribute("color", linkColors);
  // Fixed index buffer: two triangles per quad (i*4 + {0,1,2, 0,2,3}).
  const idx = new Uint32Array(N * 6);
  for (let i = 0; i < N; i++) {
    const b = i * 4;
    const o = i * 6;
    idx[o] = b;
    idx[o + 1] = b + 1;
    idx[o + 2] = b + 2;
    idx[o + 3] = b;
    idx[o + 4] = b + 2;
    idx[o + 5] = b + 3;
  }
  linksGeom.setIndex(new BufferAttribute(idx, 1));

  const linksMat = new MeshBasicNodeMaterial();
  linksMat.vertexColors = true;
  linksMat.transparent = true;
  linksMat.depthTest = false;
  linksMat.depthWrite = false;
  linksMat.blending = AdditiveBlending;
  linksMat.toneMapped = false;
  linksMat.side = DoubleSide;
  // Opacity = the link color's w (written by the kernel) × the presence reveal.
  linksMat.opacityNode = storage(linkColors, "vec4", N * 4)
    .toAttribute()
    .w.mul(uReveal as unknown as AnyNode);

  // --- tick / dispose --------------------------------------------------------
  // Ignition uniforms hold real Vector3s — mutate via `.value.set(...)`,
  // mirroring how Vector uniforms are written in gpgpuNodeSim/HeroLogo.
  const ignite0Val = uIgnite0.value;
  const ignite1Val = uIgnite1.value;

  function tick(dt: number, time: number, reveal: number, ignite: number[]) {
    uDelta.value = dt;
    uTime.value = time;
    uReveal.value = reveal;
    ignite0Val.set(ignite[0] ?? 0, ignite[1] ?? 0, ignite[2] ?? 0);
    ignite1Val.set(ignite[3] ?? 0, ignite[4] ?? 0, ignite[5] ?? 0);
    gl.compute(simulate);
  }

  return {
    particleGeom,
    particleMat,
    linksGeom,
    linksMat,
    uniforms: {
      uTime,
      uDelta,
      uReveal,
    },
    tick,
    dispose() {
      particleGeom.dispose();
      particleMat.dispose();
      linksGeom.dispose();
      linksMat.dispose();
    },
  };
}
