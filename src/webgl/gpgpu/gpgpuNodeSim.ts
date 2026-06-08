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
import type { GpgpuConfig } from "./gpgpuConfig";
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
  assign: (n: AnyNode | number) => void;
  lessThan: (n: AnyNode | number) => AnyNode;
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
  attribute: (name: string) => AnyNode;
  uv: () => AnyNode;
  positionLocal: AnyNode;
  modelViewMatrix: AnyNode;
  cameraProjectionMatrix: AnyNode;
  Fn: (fn: () => AnyNode) => () => AnyNode;
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
    NoBlending,
    DoubleSide,
  } = webgpu;
  const {
    uniform,
    texture,
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

  // Texture nodes that sample the READ targets each pass; their `.value` is
  // repointed before each render (the supported swap path, see PointerFlowmap).
  const fragUv = uv();
  const uPosRead = texture(posRead.texture, fragUv) as AnyNode & { value: unknown };
  const uVelRead = texture(velRead.texture, fragUv) as AnyNode & { value: unknown };
  const uHome = texture(home, fragUv) as AnyNode & { value: unknown };
  // The position pass needs the JUST-written velocity (velWrite), sampled fresh.
  const uVelForPos = texture(velWrite.texture, fragUv) as AnyNode & { value: unknown };

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

  // Seed both POSITION targets to the home shape; both VELOCITY targets to zero.
  {
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
    seedVelMat.dispose();
  }

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
  // grid texel. `.value` is repointed to the freshly-written targets each frame.
  //
  // VERTEX-STAGE LOD FIX (WebGPU backend, three 0.184). These two reads happen
  // inside the render material's `vertexNode` (below). On the WGSL backend a
  // bare `texture(tex, uv)` auto-sample code-gens to `textureSample(...)`, which
  // is only legal in the FRAGMENT stage (it needs implicit derivatives); in a
  // vertex shader it returns garbage with no validation error → the scrambled
  // cloud. The SIM's reads (uPosRead/uVelRead/uHome/uVelForPos) are inside
  // `colorNode` (fragment stage), so they're unaffected and stay as-is.
  //
  // `.level(0)` pins an explicit mip level: `TextureNode.level()` sets the node's
  // `levelNode`, which routes generation through `WGSLNodeBuilder.generateTexture
  // Level` → an explicit-LOD fetch (`textureLoad`/`textureSampleLevel`) that is
  // valid in the vertex stage. (Verified in node_modules/three:
  // `src/nodes/accessors/TextureNode.js` line ~694 `level()`, and
  // `src/renderers/webgpu/nodes/WGSLNodeBuilder.js` `generateTextureLevel` /
  // `generateTextureLod`.)
  //
  // `.level()` returns a CLONE whose `referenceNode` is the base texture node, and
  // TextureNode's `value` setter/getter forward through `referenceNode`. So the
  // per-frame swap below MUST repoint `.value` on THESE wrapped nodes (kept here);
  // doing so writes through to the shared base, keeping the live ping-pong swap
  // working exactly as before.
  const aRefNode = attribute("aRef");
  const uPosTexNode = texture(posRead.texture, aRefNode).level(0) as AnyNode & {
    value: unknown;
  };
  const uVelTexNode = texture(velRead.texture, aRefNode).level(0) as AnyNode & {
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
      .mul(float(0.6).add(float(0.8).mul(vRandSrc)))
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
    const a = smoothstep(0.5, 0.12, r).toVar();

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
  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = false;
  material.blending = AdditiveBlending;
  material.toneMapped = false;
  material.side = DoubleSide;

  const mouseScratch = uMouse.value;

  function tick(p: GpgpuTickParams) {
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
      .mul(float(0.6).add(float(0.8).mul(vRandSrc)))
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
    const a = smoothstep(0.5, 0.12, r).toVar();
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
