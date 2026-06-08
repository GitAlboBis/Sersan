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
  smoothstep: (a: number, b: number, x: AnyNode) => AnyNode;
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
    FloatType,
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

  // Immutable home (rest target). FloatType regardless of RT type — it is only a
  // source, never a render target.
  const home = new DataTexture(homeRGBA, size, size, RGBAFormat, FloatType);
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

  // Spring/push/radius are uniforms so leva can tune them live; the rest are
  // baked constants.
  const uSpring = uniform(config.SPRING) as UniformNode<number>;
  const uPush = uniform(config.PUSH) as UniformNode<number>;
  const uRadiusN = uniform(config.RADIUS) as UniformNode<number>;
  const SPRING = uSpring as unknown as AnyNode;
  const DAMPING = float(config.DAMPING);
  const PUSH = uPush as unknown as AnyNode;
  const RADIUS = uRadiusN as unknown as AnyNode;
  const MAX_SPEED = float(config.MAX_SPEED);
  const TURB_BASE = float(config.TURB_BASE);
  const TURB_MOVE = float(config.TURB_MOVE);

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

    // (d) turbulence — reference sin-based per-axis form (replaces mx_noise):
    //     disp = clamp(length(home - pos) * 3, 0, 1);
    //     turb = vec3(sin(pos.y*6 + t*1.3), sin(pos.z*6 + t*1.7), sin(pos.x*6 + t*1.1));
    //     acc += turb * (uTurbBase + uTurbMove * disp).
    const disp = clamp(length(toHome).mul(3.0), 0.0, 1.0);
    const turb = vec3(
      sin(pos.y.mul(6.0).add(time.mul(1.3))),
      sin(pos.z.mul(6.0).add(time.mul(1.7))),
      sin(pos.x.mul(6.0).add(time.mul(1.1))),
    );
    acc.addAssign(turb.mul(TURB_BASE.add(TURB_MOVE.mul(disp))));

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
  const aRefNode = attribute("aRef");
  const uPosTexNode = texture(posRead.texture, aRefNode) as AnyNode & { value: unknown };
  const uVelTexNode = texture(velRead.texture, aRefNode) as AnyNode & { value: unknown };

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
    // Soft round disc — ref: a = smoothstep(0.5, 0.05, r), discard r > 0.5.
    // smoothstep(0.5, 0.05, r) is already 0 at r ≥ 0.5, so the alpha-floor
    // discard below removes those fragments (no greaterThan node needed).
    const r = length(vQuadUv);
    const a = smoothstep(0.5, 0.05, r).toVar();

    // Reference color relationship (violet→cyan by RAW speed):
    //   t = clamp(vSpeed*0.6, 0, 1); col = mix(uCold, uHot, t);
    //   col *= (1 + vSpeed*0.35); col *= (0.7 + 0.5*vRand);
    const t = clamp(vSpeedF.mul(0.6), 0.0, 1.0);
    const col = mix(uColCold as unknown as AnyNode, uColHot as unknown as AnyNode, t)
      .toVec3()
      .mul(float(1.0).add(vSpeedF.mul(0.35)))
      .mul(float(0.7).add(float(0.5).mul(vRandF)))
      .mul(uEmissive); // fold the HDR push into the reference relationship

    // Reference alpha = a * 0.55, modulated by the scroll-handoff fade.
    const alpha = a.mul(0.55).mul(uFade as unknown as AnyNode).toVar();
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
    dispose() {
      rig.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
