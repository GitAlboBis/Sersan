/**
 * GPGPU "dissolve & regenerate" simulation + render — TSL build (WebGPU backend
 * / flag-ON path).
 *
 * TSL twin of gpgpuSim.ts + gpgpuRenderShader.ts. Same FBO ping-pong technique
 * proven on WebGPURenderer by fluid/PointerFlowmap.ts: an offscreen quad +
 * OrthographicCamera, two pairs of float RenderTargets (POSITION / VELOCITY),
 * advanced with `gl.setRenderTarget(rt); gl.render(quad, cam); gl.setRenderTarget
 * (prev)` inside the SINGLE useFrame, then swapped. `Renderer.render()` is
 * synchronous and works on BOTH the WebGPU and WebGL2 sub-backends of
 * WebGPURenderer, so this one TSL path covers the whole flag-ON build with no
 * sub-backend special-case (unlike storage-buffer compute, which silently
 * no-ops on the WebGL2 fallback sub-backend — see the research spec §5.3).
 *
 * The sim MATH (spring + mouse repulsion + turbulence + damping/clamp) and the
 * render (instanced billboard, violet→cyan by RAW velocity, HDR additive) mirror
 * the GLSL twin and particleDissolve.html formula-for-formula. Turbulence is the
 * reference's sin-based per-axis shimmer (both backends identical).
 *
 * ALL `three/webgpu` + `three/tsl` symbols are passed IN by HeroLogo (which
 * lazy-imports the namespaces, exactly like PostFXNodes feeds PointerFlowmap),
 * so this module imports the heavy build only via the dynamic import in HeroLogo
 * and never lands in the OFF bundle. Loosely typed for the same reason
 * PointerFlowmap is: the real node types are vast and generic.
 */
import type { GpgpuConfig, GpgpuRenderOpts } from "./gpgpuConfig";
import type { GpgpuTickParams, GpgpuSimRig, GpgpuForces } from "./gpgpuSim";

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
  /** Storage-buffer element accessor (read/write handle) by index node. */
  element: (index: AnyNode) => AnyNode & { value: unknown };
  /** Expose a storage/instanced buffer as a per-instance vertex attribute. */
  toAttribute: () => AnyNode;
  /** Build a compute node from a kernel Fn result: `Fn(...)().compute(count)`. */
  compute: (count: number) => AnyNode;
  /**
   * TSL `TextureNode.level(levelNode)` — pins an explicit mip level on a texture
   * sample (three 0.184 `src/nodes/accessors/TextureNode.js`). Required for any
   * texture read used inside a VERTEX stage on the WebGPU backend: a plain
   * `texture()` auto-sample emits a fragment-only `textureSample` (no implicit
   * LOD is legal in a WGSL vertex shader), so the vertex-stage read returns
   * garbage. `.level(0)` routes code-gen through `generateTextureLevel`, which
   * emits an explicit-LOD fetch valid in the vertex stage.
   */
  level: (n: AnyNode | number) => AnyNode & { value: unknown };
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
interface TextureLike {
  needsUpdate: boolean;
  minFilter: number;
  magFilter: number;
  wrapS: number;
  wrapT: number;
}
interface RenderTargetLike {
  texture: TextureLike;
  dispose: () => void;
}
interface MeshLike {
  frustumCulled: boolean;
  material: unknown;
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
  // Sim passes write raw float data → no implicit color-space conversion on out.
  outputColorTransform?: boolean;
  dispose: () => void;
}
interface RendererLike {
  getRenderTarget: () => RenderTargetLike | null;
  setRenderTarget: (rt: RenderTargetLike | null) => void;
  render: (scene: unknown, camera: unknown) => void;
  clear: (color?: boolean, depth?: boolean, stencil?: boolean) => void;
  /** Dispatch a TSL compute node (synchronous once the backend is initialised). */
  compute: (node: unknown) => void;
  /** Runtime backend probe — `false` on the true WebGPU sub-backend. */
  backend?: { isWebGLBackend?: boolean };
}

export interface WebGPUSymbolsGpgpu {
  RenderTarget: new (w: number, h: number, opts: Record<string, unknown>) => RenderTargetLike;
  DataTexture: new (
    data: Float32Array,
    w: number,
    h: number,
    format: number,
    type: number,
  ) => TextureLike;
  Scene: new () => { add: (o: unknown) => void };
  OrthographicCamera: new (
    l: number,
    r: number,
    t: number,
    b: number,
    n: number,
    f: number,
  ) => unknown;
  Mesh: new (geo: unknown, mat: unknown) => MeshLike;
  PlaneGeometry: new (w: number, h: number) => { dispose: () => void };
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
  /** Float32 → IEEE-754 half-float encode (for a HalfFloat `home` DataTexture). */
  DataUtils: { toHalfFloat: (v: number) => number };
  FloatType: number;
  HalfFloatType: number;
  RGBAFormat: number;
  NearestFilter: number;
  ClampToEdgeWrapping: number;
  AdditiveBlending: number;
  NormalBlending: number;
  NoBlending: number;
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
  texture: (tex: unknown, uvNode?: AnyNode) => AnyNode & { value: unknown };
  /**
   * `textureLoad(tex, ivec2Coord)` — sampler-FREE integer texel fetch
   * (`texture(tex, uv).setSampler(false)`, three 0.184). The ROBUST vertex-stage
   * read on the WebGPU backend: a plain `textureSampleLevel` (`.level(0)`) binds
   * a filtering sampler and returned garbage in the vertex stage here, whereas
   * `textureLoad` needs no sampler/derivatives and is valid in any stage.
   */
  textureLoad: (tex: unknown, uvNode: AnyNode) => AnyNode & { value: unknown };
  ivec2: (x: AnyNode | number, y?: AnyNode | number) => AnyNode;
  attribute: (name: string) => AnyNode;
  /** Allocate a GPU storage buffer (seed by passing a TypedArray as `count`). */
  instancedArray: (count: number | Float32Array, type: string) => AnyNode & { value: unknown };
  /** Per-invocation / per-instance index node (compute thread + vertex instance). */
  instanceIndex: AnyNode;
  uv: () => AnyNode;
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

export interface GpgpuNodeBuild {
  rig: GpgpuSimRig;
  /** Instanced billboard geometry (one quad per particle, `aRef` per instance). */
  geometry: InstancedGeoLike;
  /** TSL render material reading position/velocity from the sim's RTs. */
  material: NodeMaterialLike;
  /** Live-tunable scroll fade (the render's uFade). */
  uFade: UniformNode<number>;
  /** Base sprite size in device px (leva-tunable). */
  uPointSize: UniformNode<number>;
  /** Device-pixel-ratio uniform (capped upstream). */
  uPixelRatio: UniformNode<number>;
  /** Framebuffer size in DEVICE pixels. */
  uViewport: UniformNode<unknown>;
  /** HDR emissive / at-rest glow multiplier (leva-tunable, mirrors GLSL). */
  uEmissive: UniformNode<number>;
  /** Disc-center alpha — solid-skin density (leva-tunable, mirrors GLSL). */
  uPointAlpha: UniformNode<number>;
  dispose: () => void;
}

/**
 * Build the TSL GPGPU sim + render on the WebGPURenderer.
 *
 * `floatType` is FloatType or HalfFloatType (chosen by HeroLogo). `aRef` is the
 * per-instance grid-UV array from sampleMarkHomePositions; `homeRGBA` seeds the
 * home/position fields.
 */
export function createGpgpuNodeSim(
  gl: RendererLike,
  webgpu: WebGPUSymbolsGpgpu,
  tsl: TslSymbolsGpgpu,
  homeRGBA: Float32Array,
  aRef: Float32Array,
  size: number,
  config: GpgpuConfig,
  floatType: number,
  renderOpts: GpgpuRenderOpts = {
    blending: "additive",
    depthWrite: false,
    transparent: true,
  },
): GpgpuNodeBuild {
  const {
    RenderTarget,
    DataTexture,
    Scene,
    OrthographicCamera,
    Mesh,
    PlaneGeometry,
    InstancedBufferGeometry,
    BufferAttribute,
    InstancedBufferAttribute,
    MeshBasicNodeMaterial,
    Color,
    Vector2,
    Vector3,
    DataUtils,
    HalfFloatType,
    RGBAFormat,
    NearestFilter,
    ClampToEdgeWrapping,
    AdditiveBlending,
    NormalBlending,
    NoBlending,
    DoubleSide,
  } = webgpu;
  const {
    uniform,
    texture,
    textureLoad,
    ivec2,
    attribute,
    uv,
    positionLocal,
    modelViewMatrix,
    cameraProjectionMatrix,
    Fn,
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
    Discard,
    varying,
    vec2,
  } = tsl;

  const rtOpts = {
    type: floatType,
    format: RGBAFormat,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  };
  let posRead = new RenderTarget(size, size, rtOpts);
  let posWrite = new RenderTarget(size, size, rtOpts);
  let velRead = new RenderTarget(size, size, rtOpts);
  let velWrite = new RenderTarget(size, size, rtOpts);

  // Immutable home (rest target). Its TYPE MUST MATCH the render targets'
  // `floatType`, NOT a hardcoded FloatType — this is the WebGPU-backend fix.
  //
  // WHY (three 0.184, WebGPURenderer): an RGBA32Float (FloatType) DataTexture is
  // bound with `sampleType = unfilterable-float` unless the device exposes the
  // `float32-filterable` feature (which this renderer does NOT request — see
  // createRenderer.ts). But three's WebGPU bind-group LAYOUT declares the
  // accompanying sampler as the default FILTERING type for any non-depth texture
  // (WebGPUBindingUtils.js). An unfilterable-float texture paired with a
  // filtering sampler is INVALID per the WebGPU spec → the sim's `texture(home,
  // …)` and the seed's `vec4(uHome.xyz,1)` read garbage → every particle springs
  // toward a garbage target → the diffuse "vertical-seam" cloud instead of the
  // "52". (The position/velocity RTs never hit this: they are HalfFloat on
  // WebGPU, and a HalfFloat render-target texture keeps the filterable `float`
  // sampleType — RGBA16Float is filterable by default.)
  //
  // FIX: build `home` as the SAME `floatType` the RTs use. On WebGPU that is
  // HalfFloatType → RGBA16Float, which is filterable-by-default → the sampleType
  // matches the filtering sampler layout → the sim reads the REAL home positions.
  // A HalfFloat DataTexture wants IEEE-754 half-encoded Uint16 data, so encode
  // homeRGBA when HalfFloat. Half precision (~0.001 near 1.0) is ample for the
  // ±1.4 home coords, and positions already live in HalfFloat RTs on WebGPU. On
  // the forced-WebGL sub-backend `floatType` is whatever HeroLogo probed (Float
  // or Half) and RGBA32F is fine there, so the same code path is correct for both
  // WebGPU sub-backends. NearestFilter both ways (exact texel reads).
  const homeIsHalf = floatType === HalfFloatType;
  const homeData = homeIsHalf
    ? (() => {
        const half = new Uint16Array(homeRGBA.length);
        for (let i = 0; i < homeRGBA.length; i++) {
          half[i] = DataUtils.toHalfFloat(homeRGBA[i]);
        }
        return half as unknown as Float32Array;
      })()
    : homeRGBA;
  const home = new DataTexture(homeData, size, size, RGBAFormat, floatType);
  home.needsUpdate = true;
  home.minFilter = NearestFilter;
  home.magFilter = NearestFilter;
  home.wrapS = ClampToEdgeWrapping;
  home.wrapT = ClampToEdgeWrapping;

  // --- Offscreen quad ---------------------------------------------------------
  const quadScene = new Scene();
  const quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new PlaneGeometry(2, 2);

  // Texture nodes for the sim passes. SAMPLER-FREE (`textureLoad`, integer
  // texel) on EVERY read — including the fragment-stage sim reads — to sidestep
  // the WebGPU sampleType/sampler mismatch entirely: a float/half RT or a
  // half-float DataTexture paired with a FILTERING sampler is invalid per the
  // WebGPU spec and read garbage on this backend (the diffuse/convergent cloud).
  // `textureLoad` binds NO sampler, so the read is valid regardless of the
  // texture's filterability. The fullscreen sim quad rasterises one fragment per
  // texel; its uv pixel-centre ((i+0.5)/size) × size truncates to the exact texel
  // `i`. `.value` is repointed each frame for the ping-pong swap (base nodes).
  const simTexel = ivec2(uv().mul(float(size)));
  const uPosRead = textureLoad(posRead.texture, simTexel) as AnyNode & { value: unknown };
  const uVelRead = textureLoad(velRead.texture, simTexel) as AnyNode & { value: unknown };
  const uHome = textureLoad(home, simTexel) as AnyNode & { value: unknown };
  // The position pass needs the JUST-written velocity (velWrite), fetched fresh.
  const uVelForPos = textureLoad(velWrite.texture, simTexel) as AnyNode & { value: unknown };

  const uMouse = uniform(new Vector3(1e9, 1e9, 1e9)) as UniformNode<Vec3Like>;
  const uDelta = uniform(1 / 60) as UniformNode<number>;
  const uTime = uniform(0) as UniformNode<number>;

  // Spring/push/radius/damping/turbBase are uniforms so leva can tune them live
  // (mirrors the GLSL twin's setForces); the rest are baked constants.
  const uSpring = uniform(config.SPRING) as UniformNode<number>;
  const uPush = uniform(config.PUSH) as UniformNode<number>;
  const uRadiusN = uniform(config.RADIUS) as UniformNode<number>;
  const uDamping = uniform(config.DAMPING) as UniformNode<number>;
  const uTurbBaseN = uniform(config.TURB_BASE) as UniformNode<number>;
  const SPRING = uSpring as unknown as AnyNode;
  const DAMPING = uDamping as unknown as AnyNode;
  const PUSH = uPush as unknown as AnyNode;
  const RADIUS = uRadiusN as unknown as AnyNode;
  const MAX_SPEED = float(config.MAX_SPEED);
  const TURB_BASE = uTurbBaseN as unknown as AnyNode;
  const TURB_MOVE = float(config.TURB_MOVE);
  const TURB_DISP_K = float(config.TURB_DISP_K);

  // Sim passes write RAW float data into the targets — disable blending, tone
  // mapping and any output color-space transform so the bytes are preserved.
  const configureSimMat = (m: NodeMaterialLike) => {
    m.transparent = false;
    m.depthTest = false;
    m.depthWrite = false;
    m.blending = NoBlending;
    m.toneMapped = false;
    m.outputColorTransform = false;
  };

  // --- VELOCITY sim material --------------------------------------------------
  const velMat = new MeshBasicNodeMaterial();
  configureSimMat(velMat);
  velMat.colorNode = Fn(() => {
    const pos = uPosRead.xyz.toVar();
    const vel = uVelRead.xyz.toVar();
    const homePos = uHome.xyz;
    const dt = uDelta as unknown as AnyNode;
    const time = uTime as unknown as AnyNode;

    // Mirror of particleDissolve.html: accumulate an acceleration vector from
    // the three forces, then integrate (vel += acc*dt). Faithful TSL of the
    // reference velocity shader.

    // (a) elastic spring toward home — ref: acc = (home - pos) * uSpring.
    const toHome = homePos.sub(pos).toVar();
    const acc = toHome.mul(SPRING).toVar();

    // (b) mouse repulsion within RADIUS (model space), push² falloff. The
    //     reference's `if (d < uRadius) { f = 1 - d/uRadius; ... f*f }` equals
    //     `(max(0, R - d)/R)²`, which is 0 outside the radius — same branch,
    //     branch-free. normalize(fromMouse + 1e-5) is the outward push direction.
    const fromMouse = pos.sub(uMouse as unknown as AnyNode).toVar();
    const d = length(fromMouse);
    const f = max(float(0), RADIUS.sub(d)).div(RADIUS).toVar();
    acc.addAssign(fromMouse.add(1e-5).normalize().mul(f.mul(f)).mul(PUSH));

    // (d) turbulence — sin-based per-axis shimmer GATED HARD by displacement so
    //     particles glued to the surface (disp≈0) get ~none and stay crisp; only
    //     lifted/hovered particles shimmer. The whole term is ×disp so the
    //     resting skin is still (mirrors the GLSL twin's fix vs the old constant
    //     TURB_BASE 0.35 that loosened every particle).
    //     disp = clamp(length(home - pos) * TURB_DISP_K, 0, 1);
    //     acc += turb * (uTurbBase + uTurbMove * disp) * disp.
    const disp = clamp(length(toHome).mul(TURB_DISP_K), 0.0, 1.0).toVar();
    const turb = vec3(
      sin(pos.y.mul(6.0).add(time.mul(1.3))),
      sin(pos.z.mul(6.0).add(time.mul(1.7))),
      sin(pos.x.mul(6.0).add(time.mul(1.1))),
    );
    acc.addAssign(turb.mul(TURB_BASE.add(TURB_MOVE.mul(disp))).mul(disp));

    // Integrate + exponential damping + max-speed clamp (ref order):
    //   vel += acc*dt; vel *= exp(-uDamping*dt);
    //   sp = length(vel); if (sp > uMaxSpeed) vel *= uMaxSpeed/sp;
    vel.addAssign(acc.mul(dt));
    vel.mulAssign(exp(DAMPING.negate().mul(dt)));
    const sp = length(vel).toVar();
    vel.assign(vel.mul(min(sp, MAX_SPEED).div(max(sp, 1e-4))));

    return vec4(vel, 1.0);
  })();

  // --- POSITION sim material --------------------------------------------------
  const posMat = new MeshBasicNodeMaterial();
  configureSimMat(posMat);
  posMat.colorNode = Fn(() => {
    const pos = uPosRead.xyz;
    const vel = uVelForPos.xyz;
    return vec4(pos.add(vel.mul(uDelta as unknown as AnyNode)), 1.0);
  })();

  // --- Seed materials (home → position targets; zero → velocity targets) -----
  // Render explicit seed values rather than relying on the renderer's clear
  // color (which differs across the WebGPU/WebGL2 sub-backends and is the
  // scene's navy, not zero).
  const seedPosMat = new MeshBasicNodeMaterial();
  configureSimMat(seedPosMat);
  seedPosMat.colorNode = vec4(uHome.xyz, 1.0);

  const seedVelMat = new MeshBasicNodeMaterial();
  configureSimMat(seedVelMat);
  seedVelMat.colorNode = vec4(0, 0, 0, 1.0);

  const quad = new Mesh(quadGeo, seedPosMat);
  quad.frustumCulled = false;
  quadScene.add(quad);

  // SEED on the FIRST tick (inside the useFrame render loop), NOT here in the
  // build. On the WebGPU backend a `gl.render(...)` issued from a React effect
  // (outside the renderer's frame loop) does NOT execute — the offscreen seed
  // silently no-ops, posRead stays at the cleared zero, and the sim then springs
  // every particle from the origin through heavy turbulence → the diffuse
  // scatter (home + the textureLoad render are fine; this was the FBO-pass bug).
  // Running the seed from within tick() makes WebGPU actually execute it. WebGL
  // is unaffected (it renders immediately in either place).
  let seeded = false;
  const runSeed = () => {
    const prevTarget = gl.getRenderTarget();
    quad.material = seedPosMat;
    gl.setRenderTarget(posRead);
    gl.render(quadScene, quadCam);
    gl.setRenderTarget(posWrite);
    gl.render(quadScene, quadCam);
    quad.material = seedVelMat;
    gl.setRenderTarget(velRead);
    gl.render(quadScene, quadCam);
    gl.setRenderTarget(velWrite);
    gl.render(quadScene, quadCam);
    gl.setRenderTarget(prevTarget);
    quad.material = velMat;
  };

  // === Render: instanced billboard reading the live position field ===========
  const count = size * size;
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(QUAD_CORNERS), 3),
  );
  geometry.setIndex(new BufferAttribute(new Uint16Array(QUAD_INDEX), 1));
  geometry.setAttribute("aRef", new InstancedBufferAttribute(aRef, 2));
  geometry.instanceCount = count;

  const uPointSize = uniform(config.POINT_SIZE) as UniformNode<number>;
  const uPixelRatio = uniform(1) as UniformNode<number>;
  const uViewport = uniform(new Vector2(1, 1)) as UniformNode<unknown>;
  const uFade = uniform(1) as UniformNode<number>;
  // Disc-center alpha (default 0.85, was a flat 0.55) so the dense field paints a
  // solid skin instead of separate dots; mirrors the GLSL twin's uPointAlpha.
  const uPointAlpha = uniform(config.POINT_ALPHA) as UniformNode<number>;
  const uColCold = uniform(new Color().fromArray(config.COL_COLD)) as UniformNode<ColorLike>;
  const uColHot = uniform(new Color().fromArray(config.COL_HOT)) as UniformNode<ColorLike>;
  // HDR multiplier — keeps the selective-bloom contract while controlling the
  // at-rest glow (see gpgpuRenderShader.ts EMISSIVE). A live uniform so HeroLogo
  // can drive it from fxStore.gpgpuEmissive each frame; initialised from
  // config.EMISSIVE (single source of truth, default ~3.0) so the resting violet
  // crosses the Bloom threshold and the fast cyan motes bloom hard.
  const uEmissive = uniform(config.EMISSIVE) as UniformNode<number>;

  // The render samples the live POSITION/VELOCITY targets at this instance's
  // grid texel, inside the render material's `vertexNode` (below). `.value` is
  // repointed to the freshly-written targets each frame.
  //
  // VERTEX-STAGE READ FIX (WebGPU backend, three 0.184). A vertex-stage texture
  // read must NOT rely on implicit derivatives. The previous `.level(0)`
  // (textureSampleLevel) still binds a FILTERING SAMPLER, and on this WebGPU
  // backend that returned garbage in the vertex stage → the scrambled cloud.
  // `textureLoad(tex, ivec2)` (= `texture(tex,uv).setSampler(false)`) is a
  // sampler-FREE integer texel fetch — no sampler, no derivatives, no LOD — and
  // is unambiguously valid in any stage. The SIM's reads (uPosRead/uVelRead/
  // uHome/uVelForPos) are in `colorNode` (fragment stage) and stay as plain
  // samples. `textureLoad` returns the base texture node, so the per-frame swap
  // below repoints `.value` directly (no referenceNode forwarding needed).
  const aRefNode = attribute("aRef");
  // Integer texel for the sampler-free vertex-stage fetch (works on WebGPU).
  // NOTE: the RT round-trip (quad-write → textureLoad-read) has an unresolved
  // orientation/layout mismatch on this WebGPU backend (neither raw nor Y-flipped
  // aRef matches the seed's uv-write) — see ParticleDissolve.md. The render path
  // itself is proven correct (reading the home DataTexture via this exact texel
  // renders a clean "52"); the open issue is the render-target write/read layout.
  const texelCoord = ivec2(aRefNode.mul(float(size)));
  const uPosTexNode = textureLoad(posRead.texture, texelCoord) as AnyNode & {
    value: unknown;
  };
  const uVelTexNode = textureLoad(velRead.texture, texelCoord) as AnyNode & {
    value: unknown;
  };

  const material = new MeshBasicNodeMaterial();

  // Per-instance pseudo-random in [0,1] — the TSL stand-in for the reference's
  // ref.z (Math.random() per particle). aRef is unique per particle, so hashing
  // it gives stable per-point size+color variance without changing the (vec2)
  // aRef attribute the integration shell supplies. Same hash as the GLSL twin:
  //   fract(sin(dot(aRef, (127.1, 311.7))) * 43758.5453123).
  const vRandSrc = fract(
    sin(dot(aRefNode.xy, vec2(127.1, 311.7))).mul(43758.5453123),
  ).toVar();

  // vSpeed is the RAW velocity magnitude at the instance center (the reference
  // uses raw length, NOT normalized to uMaxSpeed); interpolated to the fragment.
  const vSpeed = float(0).toVar();
  material.vertexNode = Fn(() => {
    const p = uPosTexNode.xyz.toVar();
    const v = uVelTexNode.xyz;
    vSpeed.assign(length(v));

    // Center → view space (dist = -mv.z), billboard the unit-quad corner in clip
    // space at a perspective-scaled device-pixel size (same math as the GLSL
    // twin / particleNodeMaterial). Reference size:
    //   uSize * uPR * (0.6 + 0.8*ref.z) / max(-mv.z, 0.001).
    const mv = modelViewMatrix.mul(vec4(p, 1.0)).toVar();
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
  const vSpeedF = varying(vSpeed);
  const vRandF = varying(vRandSrc);

  const shade = Fn(() => {
    // Soft round disc with a WIDE feathered core (smoothstep 0.5→0.12, was
    // 0.05) so neighbouring discs OVERLAP into a continuous velvety skin rather
    // than separate dots. smoothstep is already 0 at r ≥ 0.5, so the alpha-floor
    // discard below removes those fragments (no greaterThan node needed).
    const r = length(vQuadUv);
    const a = smoothstep(0.5, 0.18, r).toVar();

    // Color: violet→cyan by RAW speed. At rest vSpeed≈0 → pure violet (solid
    // purple skin); only hovered/lifted particles gain speed → bright cyan glow.
    //   t = clamp(vSpeed*0.6, 0, 1); col = mix(uCold, uHot, t);
    //   col *= (1 + vSpeed*0.35); col *= (0.7 + 0.5*vRand);
    const t = clamp(vSpeedF.mul(0.6), 0.0, 1.0);
    const col = mix(uColCold as unknown as AnyNode, uColHot as unknown as AnyNode, t)
      .toVec3()
      .mul(float(1.0).add(vSpeedF.mul(0.35)))
      .mul(float(0.7).add(float(0.5).mul(vRandF)))
      .mul(uEmissive); // fold the HDR push into the reference relationship

    // uPointAlpha (default 0.85, was a flat 0.55), modulated by the scroll fade.
    const alpha = a.mul(uPointAlpha as unknown as AnyNode).mul(uFade as unknown as AnyNode).toVar();
    Discard(alpha.lessThan(0.004));
    return vec4(col, alpha);
  })();
  material.colorNode = (shade as AnyNode).xyz;
  material.opacityNode = (shade as AnyNode).w;
  // Render options per layer: BODY = NormalBlending + depthWrite (occludes, reads
  // solid); SKIN = additive glow, no depth write (default). Mirrors the GLSL twin.
  material.transparent = renderOpts.transparent;
  material.depthWrite = renderOpts.depthWrite;
  material.depthTest = renderOpts.depthWrite;
  material.blending =
    renderOpts.blending === "normal" ? NormalBlending : AdditiveBlending;
  material.toneMapped = false;
  material.side = DoubleSide;

  const mouseScratch = uMouse.value;

  function tick(p: GpgpuTickParams) {
    // Seed on the first frame from INSIDE the render loop (WebGPU executes
    // offscreen renders here, not from the build-time effect — see runSeed).
    if (!seeded) {
      runSeed();
      seeded = true;
    }
    const prevTarget = gl.getRenderTarget();

    // 1) VELOCITY: read pos/vel(read) → write velWrite.
    uPosRead.value = posRead.texture;
    uVelRead.value = velRead.texture;
    uHome.value = home;
    uDelta.value = p.dt;
    uTime.value = p.time;
    mouseScratch.copy(p.mouse as unknown as Vec3Like);
    quad.material = velMat;
    gl.setRenderTarget(velWrite);
    gl.render(quadScene, quadCam);

    // 2) POSITION: read pos(read) + just-written velWrite → write posWrite.
    uPosRead.value = posRead.texture;
    uVelForPos.value = velWrite.texture;
    uDelta.value = p.dt;
    quad.material = posMat;
    gl.setRenderTarget(posWrite);
    gl.render(quadScene, quadCam);

    gl.setRenderTarget(prevTarget);

    // 3) swap; repoint the render lookups to the fresh fields.
    let tmp = posRead;
    posRead = posWrite;
    posWrite = tmp;
    tmp = velRead;
    velRead = velWrite;
    velWrite = tmp;
    uPosTexNode.value = posRead.texture;
    uVelTexNode.value = velRead.texture;
  }

  const rig: GpgpuSimRig = {
    size,
    get positionTexture() {
      return posRead.texture as unknown as import("three").Texture;
    },
    get velocityTexture() {
      return velRead.texture as unknown as import("three").Texture;
    },
    tick,
    setForces(f: GpgpuForces) {
      uSpring.value = f.spring;
      uPush.value = f.push;
      uRadiusN.value = f.radius;
      uDamping.value = f.damping;
      uTurbBaseN.value = f.turbBase;
    },
    dispose() {
      posRead.dispose();
      posWrite.dispose();
      velRead.dispose();
      velWrite.dispose();
      velMat.dispose();
      posMat.dispose();
      seedPosMat.dispose();
      seedVelMat.dispose();
      quadGeo.dispose();
    },
  };

  return {
    rig,
    geometry,
    material,
    uFade,
    uPointSize,
    uPixelRatio,
    uViewport,
    uEmissive,
    uPointAlpha,
    dispose() {
      rig.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}

// ===========================================================================
// WebGPU-NATIVE sim — TSL COMPUTE + STORAGE BUFFERS (no FBO round-trip)
// ===========================================================================
// The idiomatic WebGPU GPGPU: particle position/velocity live in storage buffers
// (`instancedArray`), advanced by a compute kernel (`Fn().compute(count)`,
// dispatched with `gl.compute(node)` each frame). The render reads each
// particle's position from the buffer via `.element(instanceIndex)` IN THE
// VERTEX STAGE — a sampler-free storage read with NO texture, NO orientation,
// NO LOD — which sidesteps the render-target round-trip layout bug that the FBO
// path (createGpgpuNodeSim) hits on this WebGPU backend (see ParticleDissolve.md
// §11). Seeding is trivial: pass the home Float32Array straight into
// `instancedArray` (StorageInstancedBufferAttribute uses it as the backing
// array). Same force model + billboard render + violet→cyan color as the FBO
// twin, so the look is identical.
//
// IMPORTANT — only valid on the TRUE WebGPU sub-backend. Storage-buffer dynamic
// indexing (`.element(i)`) is broken on WebGPURenderer's WebGL2 fallback
// sub-backend (three issue #31221). HeroLogo must gate this on
// `gl.backend.isWebGLBackend === false` and route the WebGL2 sub-backend to the
// stateless analytic build (createStaticParticleNodeBuild) instead.
export function createGpgpuComputeNodeSim(
  gl: RendererLike,
  webgpu: WebGPUSymbolsGpgpu,
  tsl: TslSymbolsGpgpu,
  homeRGBA: Float32Array,
  aRef: Float32Array,
  size: number,
  config: GpgpuConfig,
  renderOpts: GpgpuRenderOpts = {
    blending: "additive",
    depthWrite: false,
    transparent: true,
  },
): GpgpuNodeBuild {
  const {
    InstancedBufferGeometry,
    BufferAttribute,
    InstancedBufferAttribute,
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
    min,
    clamp,
    exp,
    sin,
    fract,
    dot,
    mix,
    smoothstep,
    Discard,
    varying,
    instancedArray,
    instanceIndex,
  } = tsl;

  const count = size * size;

  // Per-particle home (vec3, row-major like aRef). Seed the live position buffer
  // from it and keep an immutable copy as the spring target.
  const aHome = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    aHome[i * 3] = homeRGBA[i * 4];
    aHome[i * 3 + 1] = homeRGBA[i * 4 + 1];
    aHome[i * 3 + 2] = homeRGBA[i * 4 + 2];
  }
  // Seeding by passing the TypedArray straight in (StorageInstancedBufferAttribute
  // adopts it as backing storage). Separate copies so the live position can drift
  // while `home` stays put.
  const positionBuffer = instancedArray(aHome.slice(), "vec3");
  const velocityBuffer = instancedArray(count, "vec3"); // zero-initialised
  const homeBuffer = instancedArray(aHome.slice(), "vec3");

  // Force uniforms (live-tunable via setForces); the rest are baked constants.
  const uMouse = uniform(new Vector3(1e9, 1e9, 1e9)) as UniformNode<Vec3Like>;
  const uDelta = uniform(1 / 60) as UniformNode<number>;
  const uTime = uniform(0) as UniformNode<number>;
  const uSpring = uniform(config.SPRING) as UniformNode<number>;
  const uPush = uniform(config.PUSH) as UniformNode<number>;
  const uRadiusN = uniform(config.RADIUS) as UniformNode<number>;
  const uDamping = uniform(config.DAMPING) as UniformNode<number>;
  const uTurbBaseN = uniform(config.TURB_BASE) as UniformNode<number>;
  const SPRING = uSpring as unknown as AnyNode;
  const PUSH = uPush as unknown as AnyNode;
  const RADIUS = uRadiusN as unknown as AnyNode;
  const DAMPING = uDamping as unknown as AnyNode;
  const TURB_BASE = uTurbBaseN as unknown as AnyNode;
  const TURB_MOVE = float(config.TURB_MOVE);
  const TURB_DISP_K = float(config.TURB_DISP_K);
  const MAX_SPEED = float(config.MAX_SPEED);
  const dtN = uDelta as unknown as AnyNode;
  const timeN = uTime as unknown as AnyNode;
  const mouseN = uMouse as unknown as AnyNode;

  // Compute kernel — identical force model to the FBO/GLSL twins (spring + mouse
  // repulsion push² falloff + displacement-gated turbulence + exp damping +
  // max-speed clamp), per thread keyed by instanceIndex.
  const simulate = Fn(() => {
    const pos = positionBuffer.element(instanceIndex);
    const vel = velocityBuffer.element(instanceIndex).toVar();
    const home = homeBuffer.element(instanceIndex);

    const toHome = home.sub(pos).toVar();
    const acc = toHome.mul(SPRING).toVar();

    const fromMouse = pos.sub(mouseN).toVar();
    const d = length(fromMouse);
    const f = max(float(0), RADIUS.sub(d)).div(RADIUS).toVar();
    acc.addAssign(fromMouse.add(1e-5).normalize().mul(f.mul(f)).mul(PUSH));

    const disp = clamp(length(toHome).mul(TURB_DISP_K), 0.0, 1.0).toVar();
    const turb = vec3(
      sin(pos.y.mul(6.0).add(timeN.mul(1.3))),
      sin(pos.z.mul(6.0).add(timeN.mul(1.7))),
      sin(pos.x.mul(6.0).add(timeN.mul(1.1))),
    );
    acc.addAssign(turb.mul(TURB_BASE.add(TURB_MOVE.mul(disp))).mul(disp));

    vel.addAssign(acc.mul(dtN));
    vel.mulAssign(exp(DAMPING.negate().mul(dtN)));
    const sp = length(vel).toVar();
    vel.assign(vel.mul(min(sp, MAX_SPEED).div(max(sp, 1e-4))));

    velocityBuffer.element(instanceIndex).assign(vel);
    pos.addAssign(vel.mul(dtN));
  })().compute(count);

  // === Render: instanced billboard reading the buffers in the vertex stage =====
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(QUAD_CORNERS), 3),
  );
  geometry.setIndex(new BufferAttribute(new Uint16Array(QUAD_INDEX), 1));
  geometry.setAttribute("aRef", new InstancedBufferAttribute(aRef, 2));
  geometry.instanceCount = count;

  const uPointSize = uniform(config.POINT_SIZE) as UniformNode<number>;
  const uPixelRatio = uniform(1) as UniformNode<number>;
  const uViewport = uniform(new Vector2(1, 1)) as UniformNode<unknown>;
  const uFade = uniform(1) as UniformNode<number>;
  const uPointAlpha = uniform(config.POINT_ALPHA) as UniformNode<number>;
  const uColCold = uniform(
    new Color().fromArray(config.COL_COLD),
  ) as UniformNode<ColorLike>;
  const uColHot = uniform(
    new Color().fromArray(config.COL_HOT),
  ) as UniformNode<ColorLike>;
  const uEmissive = uniform(config.EMISSIVE) as UniformNode<number>;

  const aRefNode = attribute("aRef");
  const vRandSrc = fract(
    sin(dot(aRefNode.xy, vec2(127.1, 311.7))).mul(43758.5453123),
  ).toVar();
  const vSpeed = float(0).toVar();

  const material = new MeshBasicNodeMaterial();
  material.vertexNode = Fn(() => {
    // Vertex-stage STORAGE read (no sampler/texture/orientation) — the fix.
    const p = positionBuffer.element(instanceIndex).xyz.toVar();
    const v = velocityBuffer.element(instanceIndex).xyz;
    vSpeed.assign(length(v));
    const mv = modelViewMatrix.mul(vec4(p, 1.0)).toVar();
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
  const vSpeedF = varying(vSpeed);
  const vRandF = varying(vRandSrc);

  const shade = Fn(() => {
    const r = length(vQuadUv);
    const a = smoothstep(0.5, 0.18, r).toVar();
    const t = clamp(vSpeedF.mul(0.6), 0.0, 1.0);
    const col = mix(uColCold as unknown as AnyNode, uColHot as unknown as AnyNode, t)
      .toVec3()
      .mul(float(1.0).add(vSpeedF.mul(0.35)))
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
  material.transparent = renderOpts.transparent;
  material.depthWrite = renderOpts.depthWrite;
  material.depthTest = renderOpts.depthWrite;
  material.blending =
    renderOpts.blending === "normal" ? NormalBlending : AdditiveBlending;
  material.toneMapped = false;
  material.side = DoubleSide;

  const mouseScratch = uMouse.value;

  function tick(p: GpgpuTickParams) {
    uDelta.value = p.dt;
    uTime.value = p.time;
    mouseScratch.copy(p.mouse as unknown as Vec3Like);
    // Dispatch the compute kernel (synchronous; backend is up by useFrame).
    gl.compute(simulate);
  }

  const rig: GpgpuSimRig = {
    size,
    // No textures on the compute path — the render reads the storage buffers
    // directly. These getters exist only to satisfy the shared rig interface.
    get positionTexture() {
      return null as unknown as import("three").Texture;
    },
    get velocityTexture() {
      return null as unknown as import("three").Texture;
    },
    tick,
    setForces(f: GpgpuForces) {
      uSpring.value = f.spring;
      uPush.value = f.push;
      uRadiusN.value = f.radius;
      uDamping.value = f.damping;
      uTurbBaseN.value = f.turbBase;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };

  return {
    rig,
    geometry,
    material,
    uFade,
    uPointSize,
    uPixelRatio,
    uViewport,
    uEmissive,
    uPointAlpha,
    dispose() {
      rig.dispose();
    },
  };
}

// ===========================================================================
// SPORE render — compute sim + instanced SHADED icospheres (TSL / WebGPU only)
// ===========================================================================
// The DDD-correct primitive (production-bundle teardown, see the task's
// research/ddd-bundle-teardown-spore-render.md): each particle is a small LIT
// OPAQUE sphere mesh — lambert + rim + per-spore value variation (fake packed
// AO) — depth-tested so front balls occlude back balls. NOT a feathered
// additive disc: additive/feathered can only brighten, never occlude or show a
// shadow side, so a dense cluster reads as fog instead of a packed-ball crust.
//
// Same compute kernel as createGpgpuComputeNodeSim (one under-damped layer);
// the render swaps the billboard quad for an icosphere whose per-instance
// translation comes from the position storage buffer via the STANDARD pipeline
// (`positionNode = positionLocal·scale + positionBuffer.toAttribute()` — the
// three r184 webgpu_compute_particles_snow idiom). `.toAttribute()` (not
// `.element()`) in the render stage per three #31221. Spore radius is in MODEL
// space (DDD: diameter ≈ letterHeight/47) so the packing survives zoom/scale —
// unlike the device-px sizing of the sprite builds.
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
  /**
   * Scroll-out dissolve 0..1 (fed from the hero scroll progress): radial push
   * from the MODEL CENTER + staggered kill, with respawn parked until it
   * clears — the mark scatters into space as it scrolls away and reassembles
   * when scrolled back.
   */
  uBurst: UniformNode<number>;
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
    pow,
    abs,
    hash,
    If,
    instancedArray,
    instanceIndex,
  } = tsl;

  const count = size * size;

  // --- Sim: storage-buffer spring kernel + the DDD LIFE state machine -------
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
  const SPRING = uSpring as unknown as AnyNode;
  const PUSH = uPush as unknown as AnyNode;
  const RADIUS = uRadiusN as unknown as AnyNode;
  const DAMPING = uDamping as unknown as AnyNode;
  const TURB_BASE = uTurbBaseN as unknown as AnyNode;
  const TURB_MOVE = float(config.TURB_MOVE);
  const TURB_DISP_K = float(config.TURB_DISP_K);
  const MAX_SPEED = float(config.MAX_SPEED);
  const dtN = uDelta as unknown as AnyNode;
  const timeN = uTime as unknown as AnyNode;
  const mouseN = uMouse as unknown as AnyNode;

  const LIFE_DECAY = float(spore.LIFE_DECAY);
  const LIFE_HEAL = float(spore.LIFE_HEAL);
  const LIFE_DIE = float(spore.LIFE_DIE);
  const LIFE_REGROW = float(spore.LIFE_REGROW);
  // Scroll-out dissolve (0..1, fed per frame from the hero scroll progress).
  const uBurst = uniform(0) as UniformNode<number>;
  const burstN = uBurst as unknown as AnyNode;

  // DDD life machine on top of the spring sim: the cursor pushes a spore →
  // its speed crosses the kill curve → it DIES mid-flight (ghost drift, the
  // render shrinks it to nothing) → respawns AT HOME and regrows in place.
  // "Spores disappear and regrow on top" — not just displaced and back.
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
      // ALIVE (0,1] — the original spring + repulsion + turbulence integration.
      const vel = velH.toVar();
      const toHome = home.sub(pos).toVar();
      const acc = toHome.mul(SPRING).toVar();

      const fromMouse = pos.sub(mouseN).toVar();
      const d = length(fromMouse);
      const f = max(float(0), RADIUS.sub(d)).div(RADIUS).toVar();
      acc.addAssign(fromMouse.add(1e-5).normalize().mul(f.mul(f)).mul(PUSH));

      const disp = clamp(length(toHome).mul(TURB_DISP_K), 0.0, 1.0).toVar();
      const turb = vec3(
        sin(pos.y.mul(6.0).add(timeN.mul(1.3))),
        sin(pos.z.mul(6.0).add(timeN.mul(1.7))),
        sin(pos.x.mul(6.0).add(timeN.mul(1.1))),
      );
      acc.addAssign(turb.mul(TURB_BASE.add(TURB_MOVE.mul(disp))).mul(disp));

      // SCROLL-OUT burst: radial push from the model center (the mark is
      // geometry.center()ed, so the origin IS the logo center), staggered per
      // spore so the dissolve ripples instead of popping uniformly.
      const rndI = hash(instanceIndex).toVar();
      acc.addAssign(
        pos
          .add(1e-5)
          .normalize()
          .mul(burstN.mul(7.0).mul(float(0.6).add(rndI.mul(0.8)))),
      );

      vel.addAssign(acc.mul(dtN));
      vel.mulAssign(exp(DAMPING.negate().mul(dtN)));
      const sp = length(vel).toVar();
      vel.assign(vel.mul(min(sp, MAX_SPEED).div(max(sp, 1e-4))));

      velH.assign(vel);
      pos.addAssign(vel.mul(dtN));

      // Velocity-gated decay — DDD's exact kill curve 50·min(1,|v|·0.35)⁵ —
      // minus a small heal so grazed survivors knit back to full life. The
      // burst adds a direct staggered kill so the scroll dissolve completes
      // even for spores the radial push barely moves (the pinned core).
      const decay = pow(min(sp.mul(0.35), 1.0), 5.0)
        .mul(LIFE_DECAY)
        .add(burstN.mul(float(2.0).add(rndI.mul(2.5))));
      lifeH.assign(
        min(lifeH.add(LIFE_HEAL.sub(decay).mul(dtN)), 1.0),
      );
    }).Else(() => {
      // DYING (−1,0] — free ghost flight (DDD-style, no forces); the render
      // shrinks it to nothing as life → −1. Drift factor + gentler damping so
      // the dying spores sail a touch FARTHER into space (user feedback).
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

  material.positionNode = positionLocal
    .mul(
      (uSporeRadius as unknown as AnyNode)
        .mul(mix(float(spore.VAR_MIN), float(spore.VAR_MAX), rnd))
        .mul(lifeScale),
    )
    .add(positionBuffer.toAttribute());

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
    const speed = length(velocityBuffer.toAttribute());
    const regrowFlash = clamp(lifeAttr.sub(1.0), 0.0, 1.0); // max(0, life−1)
    const t = clamp(
      max(speed.mul(spore.SPEED_COLOR_K), regrowFlash),
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
    get positionTexture() {
      return null as unknown as import("three").Texture;
    },
    get velocityTexture() {
      return null as unknown as import("three").Texture;
    },
    tick,
    setForces(f: GpgpuForces) {
      uSpring.value = f.spring;
      uPush.value = f.push;
      uRadiusN.value = f.radius;
      uDamping.value = f.damping;
      uTurbBaseN.value = f.turbBase;
    },
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
    uBurst,
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
export interface TextMorphNodeBuild {
  geometry: InstancedGeoLike;
  material: NodeMaterialLike;
  /** Morph progress 0 (text A) → 1 (text B), scroll-driven. */
  uMorph: UniformNode<number>;
  /** Global alpha (cross-fade against the DOM headline). */
  uFade: UniformNode<number>;
  uPointSize: UniformNode<number>;
  uPixelRatio: UniformNode<number>;
  uViewport: UniformNode<unknown>;
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

export function createTextMorphComputeBuild(
  gl: RendererLike,
  webgpu: WebGPUSymbolsGpgpu,
  tsl: TslSymbolsGpgpu,
  homeA: Float32Array, // count×3 world-unit offsets from block center
  homeB: Float32Array,
  count: number,
  params: TextMorphParams,
): TextMorphNodeBuild {
  const {
    InstancedBufferGeometry,
    BufferAttribute,
    MeshBasicNodeMaterial,
    Color,
    Vector2,
    AdditiveBlending,
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
    min,
    clamp,
    exp,
    sin,
    mix,
    smoothstep,
    Discard,
    varying,
    hash,
    instancedArray,
    instanceIndex,
  } = tsl;

  const positionBuffer = instancedArray(homeA.slice(), "vec3");
  const velocityBuffer = instancedArray(count, "vec3");
  const homeABuffer = instancedArray(homeA.slice(), "vec3");
  const homeBBuffer = instancedArray(homeB.slice(), "vec3");

  const uMorph = uniform(0) as UniformNode<number>;
  const uDelta = uniform(1 / 60) as UniformNode<number>;
  const uTime = uniform(0) as UniformNode<number>;
  const morphN = uMorph as unknown as AnyNode;
  const dtN = uDelta as unknown as AnyNode;
  const timeN = uTime as unknown as AnyNode;
  const SPRING = float(params.SPRING);
  const DAMPING = float(params.DAMPING);
  const MAX_SPEED = float(params.MAX_SPEED);
  const TURB = float(params.TURB);

  const simulate = Fn(() => {
    const pos = positionBuffer.element(instanceIndex);
    const velH = velocityBuffer.element(instanceIndex);
    const hA = homeABuffer.element(instanceIndex);
    const hB = homeBBuffer.element(instanceIndex);

    // Per-particle staggered transition: particle r starts its A→B journey at
    // uMorph = r·0.55 and completes it 0.45 later → a travelling recomposition
    // wave instead of a uniform pop.
    const r = hash(instanceIndex).toVar();
    const m = clamp(morphN.sub(r.mul(0.55)).div(0.45), 0.0, 1.0).toVar();
    const target = mix(hA, hB, smoothstep(0.0, 1.0, m)).toVar();

    const vel = velH.toVar();
    const acc = target.sub(pos).mul(SPRING).toVar();

    // Mid-transit scatter: peaks at m=0.5, zero at rest on either text, so
    // particles wander organically while travelling and land crisp.
    const transit = m.mul(float(1.0).sub(m)).mul(4.0).toVar();
    const turb = vec3(
      sin(pos.y.mul(7.0).add(timeN.mul(2.1)).add(r.mul(6.28))),
      sin(pos.x.mul(8.0).add(timeN.mul(1.7)).add(r.mul(4.1))),
      sin(pos.x.mul(5.0).add(pos.y.mul(5.0)).add(timeN.mul(1.3))).mul(0.4),
    );
    acc.addAssign(turb.mul(TURB).mul(transit));

    vel.addAssign(acc.mul(dtN));
    vel.mulAssign(exp(DAMPING.negate().mul(dtN)));
    const sp = length(vel).toVar();
    vel.assign(vel.mul(min(sp, MAX_SPEED).div(max(sp, 1e-4))));

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

  const vSpeed = float(0).toVar();
  const vRandSrc = float(0).toVar();

  const material = new MeshBasicNodeMaterial();
  material.vertexNode = Fn(() => {
    const p = positionBuffer.element(instanceIndex).xyz.toVar();
    const v = velocityBuffer.element(instanceIndex).xyz;
    vSpeed.assign(length(v));
    vRandSrc.assign(hash(instanceIndex));
    const mv = modelViewMatrix.mul(vec4(p, 1.0)).toVar();
    const dist = mv.z.negate();
    const clip = cameraProjectionMatrix.mul(mv).toVar();
    const sizeNode = (uPointSize as unknown as AnyNode)
      .mul(uPixelRatio as unknown as AnyNode)
      .mul(float(0.7).add(float(0.7).mul(vRandSrc)))
      .div(max(dist, 0.001));
    const corner = positionLocal.xy;
    clip.xy.addAssign(
      corner.mul(sizeNode).div(uViewport as unknown as AnyNode).mul(2.0).mul(clip.w),
    );
    return clip;
  })();

  const vQuadUv = varying(positionLocal.xy);
  const vSpeedF = varying(vSpeed);
  const vRandF = varying(vRandSrc);

  const shade = Fn(() => {
    const rr = length(vQuadUv);
    const a = smoothstep(0.5, 0.12, rr).toVar();
    const t = clamp(vSpeedF.mul(0.5), 0.0, 1.0);
    const col = mix(uColCold as unknown as AnyNode, uColHot as unknown as AnyNode, t)
      .toVec3()
      .mul(float(1.0).add(vSpeedF.mul(0.25)))
      .mul(float(0.75).add(float(0.4).mul(vRandF)))
      .mul(float(params.EMISSIVE));
    const alpha = a
      .mul(float(params.POINT_ALPHA))
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

  function tick(p: { dt: number; time: number }) {
    uDelta.value = p.dt;
    uTime.value = p.time;
    gl.compute(simulate);
  }

  return {
    geometry,
    material,
    uMorph,
    uFade,
    uPointSize,
    uPixelRatio,
    uViewport,
    tick,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

// ===========================================================================
// BISECTION DEBUG — STATIC billboard (TSL / flag-ON)
// ===========================================================================
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
 * Build the SHIPPING hero render on the WebGPURenderer — each instance is
 * placed at its HOME position read from a per-instance `aHome` vec3 attribute
 * (a CRISP dense violet "52" on WebGPU, no vertex-stage texture read) and then
 * ANALYTICALLY displaced near the cursor: particles within `uRadius` of the
 * model-space mouse lift outward + toward the camera, shifting violet→CYAN
 * (glowing) gated by the eased `uHover`, and settle back smoothly when the
 * cursor leaves. Stateless (no FBO, no sim) so it is robust on the WebGPU
 * backend — the GPGPU FBO sim above is parked (gated) because its vertex-stage
 * float-RT read scrambled on WebGPU.
 *
 * SAME perspective-scaled device-pixel billboard math as the live render
 * material; additive, soft round disc, selective-bloom HDR contract preserved.
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
  // color shifts violet→cyan exactly where the surface is disturbed.
  const vLift = float(0).toVar();

  const material = new MeshBasicNodeMaterial();
  material.vertexNode = Fn(() => {
    // ANALYTIC dispersion — displace the home center near the cursor (model
    // space). GLSL twin in gpgpuRenderShader.ts must stay in lockstep.
    //   fromMouse = aHome - uMouse; d = length(fromMouse);
    //   falloff   = smoothstep(uRadius, 0, d);   // 1 at cursor, 0 at/after radius
    //   lift      = falloff * uHover;            // gated by the eased global hover
    const home = aHomeNode.xyz.toVar();
    const fromMouse = home.sub(uMouse as unknown as AnyNode).toVar();
    const d = length(fromMouse);
    const falloff = smoothstep(uRadius as unknown as AnyNode, 0.0, d);
    const lift = falloff.mul(uHover as unknown as AnyNode).toVar();
    vLift.assign(lift);

    const dir = fromMouse.add(1e-5).normalize();
    const center = home
      // push outward in-plane …
      .add(dir.mul(lift.mul(uPush as unknown as AnyNode)))
      // … plus a little toward the camera (+z) so the lifted ones read.
      .add(vec3(0.0, 0.0, lift.mul(uPush as unknown as AnyNode).mul(0.5)))
      .toVar();
    // Subtle shimmer on LIFTED particles only (resting skin stays crisp).
    const time = uTime as unknown as AnyNode;
    center.addAssign(
      vec3(
        sin(home.y.mul(6.0).add(time.mul(1.3))),
        sin(home.z.mul(6.0).add(time.mul(1.7))),
        sin(home.x.mul(6.0).add(time.mul(1.1))),
      ).mul(lift.mul(0.04)),
    );

    // SAME billboard math as the live render, around the displaced center.
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
  const vLiftF = varying(vLift);

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
