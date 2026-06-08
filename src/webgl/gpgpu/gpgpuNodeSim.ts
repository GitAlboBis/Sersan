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
 * render (instanced billboard, violet→cyan by velocity, HDR additive) mirror the
 * GLSL twin. `mx_noise_vec3` is the TSL turbulence (the GLSL twin uses a triple
 * value-noise; both read as soft jitter, the look is tuned in-browser).
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
  mix: (a: AnyNode, b: AnyNode, t: AnyNode | number) => AnyNode;
  smoothstep: (a: number, b: number, x: AnyNode) => AnyNode;
  Discard: (cond: AnyNode) => void;
  varying: (n: AnyNode) => AnyNode;
  mx_noise_vec3: (p: AnyNode) => AnyNode;
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
    mix,
    smoothstep,
    Discard,
    varying,
    mx_noise_vec3,
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

    // (a) spring toward home.
    const toHome = homePos.sub(pos).toVar();
    vel.addAssign(toHome.mul(SPRING).mul(dt));

    // (b) mouse repulsion within RADIUS (model space), push² falloff.
    const away = pos.sub(uMouse as unknown as AnyNode).toVar();
    const dist = max(length(away), 1e-4);
    const push = max(float(0), RADIUS.sub(dist)).div(RADIUS).toVar();
    vel.addAssign(away.div(dist).mul(push.mul(push)).mul(PUSH).mul(dt));

    // (d) turbulence — low at rest, ramps with distance-from-home.
    const farness = min(length(toHome), 1.0);
    const t = mx_noise_vec3(pos.mul(1.3).add((uTime as unknown as AnyNode).mul(0.15)));
    vel.addAssign(t.mul(TURB_BASE.add(farness.mul(TURB_MOVE))).mul(dt));

    // (c) damping + max-speed clamp.
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
  const uMaxSpeedR = float(config.MAX_SPEED);

  // The render samples the live POSITION/VELOCITY targets at this instance's
  // grid texel. `.value` is repointed to the freshly-written targets each frame.
  const aRefNode = attribute("aRef");
  const uPosTexNode = texture(posRead.texture, aRefNode) as AnyNode & { value: unknown };
  const uVelTexNode = texture(velRead.texture, aRefNode) as AnyNode & { value: unknown };

  const material = new MeshBasicNodeMaterial();

  // vSpeed is a vertex-stage quantity (speed at the instance center) interpolated
  // to the fragment for the violet→cyan mix.
  const vSpeed = float(0).toVar();
  material.vertexNode = Fn(() => {
    const p = uPosTexNode.xyz.toVar();
    const v = uVelTexNode.xyz;
    vSpeed.assign(
      clamp(length(v).div(max(uMaxSpeedR, 1e-4)), 0.0, 1.0),
    );

    // Center → view space (dist = -mv.z), billboard the unit-quad corner in clip
    // space at a perspective-scaled device-pixel size (same math as the GLSL
    // twin / particleNodeMaterial).
    const mv = modelViewMatrix.mul(vec4(p, 1.0)).toVar();
    const dist = mv.z.negate();
    const clip = cameraProjectionMatrix.mul(mv).toVar();
    const sizeNode = (uPointSize as unknown as AnyNode)
      .mul(uPixelRatio as unknown as AnyNode)
      .div(max(dist, 0.1));
    const corner = positionLocal.xy;
    clip.xy.addAssign(
      corner.mul(sizeNode).div(uViewport as unknown as AnyNode).mul(2.0).mul(clip.w),
    );
    return clip;
  })();

  const vQuadUv = varying(positionLocal.xy);
  const vSpeedF = varying(vSpeed);

  const shade = Fn(() => {
    const circle = smoothstep(0.5, 0.12, length(vQuadUv)).toVar();
    Discard(circle.lessThan(0.02));

    const col = mix(uColCold as unknown as AnyNode, uColHot as unknown as AnyNode, vSpeedF);
    const intensity = float(1.6).add(float(1.2).mul(vSpeedF));
    const alpha = circle.mul(uFade as unknown as AnyNode);
    Discard(alpha.lessThan(0.004));
    return vec4(col.toVec3().mul(intensity), alpha);
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
    dispose() {
      rig.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
