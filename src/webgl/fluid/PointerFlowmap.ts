/**
 * Pointer flowmap — a low-res velocity field stamped at the cursor, used to
 * subtly refract the rendered scene on the WebGPU/TSL path ONLY (PostFXNodes).
 *
 * WHY A FLOWMAP (and why offscreen-quad, not pure-node RTT)
 * --------------------------------------------------------
 * Each frame we stamp a soft Gaussian splat at the smoothed pointer, encoding
 * its velocity into RG (and strength into B), then fade the whole accumulation
 * by `dissipation` (~0.96 per 60 Hz frame — tick() dt-normalizes BOTH the fade,
 * `pow(base, dt*60)`, and the deposit, `×dt*60`, so the trail's wall-clock decay
 * and energy-per-second are refresh-rate independent; at dt=1/60 both collapse
 * to the plain per-frame multiply). Sampling this field in the post graph and offsetting
 * the scene-pass UV by `flow.rg * uStrength` (TINY, ~0.004–0.01) reads as a
 * premium liquid-glass breath around the cursor — the line/planet gently bow,
 * never a funhouse warp.
 *
 * We verified the three 0.184 node-RTT API (`rtt()`/`RTTNode`, `texture()`) and
 * a pure-node graph for *ping-pong accumulation that reads its own previous
 * output* is awkward (RTTNode owns its target; feeding last frame back into the
 * node graph is not a first-class op). So — exactly as the spec's fallback
 * prescribes — we drive it with a tiny offscreen `Scene` + `OrthographicCamera`
 * + fullscreen quad and `renderer.setRenderTarget(rt); renderer.render(quad,
 * cam); renderer.setRenderTarget(null)` inside the SINGLE existing useFrame.
 * `Renderer.render()` is synchronous (verified: three.webgpu.js Renderer.render
 * → _renderScene) and works on the WebGPURenderer's WebGPU and WebGL2 backends.
 *
 * PING-PONG
 * ---------
 * Two HALF_FLOAT RenderTargets (`rtA`,`rtB`, ~320px). The quad's read texture is
 * the PREVIOUS target; we render into the OTHER, then swap. The post graph's
 * flow texture node value is repointed to the freshly-written target each frame
 * (TextureNode.set value is the supported swap path; the renderer rebinds by
 * uuid). The first frame reads a cleared (zero) target → no garbage.
 *
 * SINGLE LOOP / GATING
 * --------------------
 * No requestAnimationFrame here — `tick()` is called from PostFXNodes' existing
 * priority-1 useFrame. The whole module is constructed ONLY on the WebGPU path
 * (PostFXNodes is mounted only when `webgpuEnabled()`), and PostFXNodes itself
 * only mounts at tier "full" (reduced-motion → tier "off" → no canvas). When the
 * pointer is idle (velocity ≈ 0) we still fade the field but skip stamping —
 * an idle cursor costs only the cheap fade.
 *
 * All `three/webgpu` + `three/tsl` symbols are passed IN (already lazy-imported
 * by PostFXNodes), so this module never statically imports the heavy build and
 * stays out of the OFF bundle.
 */

// Loose structural types for the lazily-imported three/webgpu + three/tsl
// symbols we use. We never import the heavy build's types at module scope.
type AnyNode = {
  add: (n: AnyNode | number) => AnyNode;
  sub: (n: AnyNode | number) => AnyNode;
  mul: (n: AnyNode | number) => AnyNode;
  div: (n: AnyNode | number) => AnyNode;
  x: AnyNode;
  y: AnyNode;
  z: AnyNode;
  rg: AnyNode;
};
type UniformNode<T> = { value: T };

interface Vec2Like {
  x: number;
  y: number;
  set: (x: number, y: number) => Vec2Like;
  isVector2: true;
}
interface Vec3Like {
  x: number;
  y: number;
  z: number;
  set: (x: number, y: number, z: number) => Vec3Like;
  isVector3: true;
}

interface WebGPUSymbols {
  RenderTarget: new (w: number, h: number, opts: Record<string, unknown>) => RenderTargetLike;
  Scene: new () => SceneLike;
  OrthographicCamera: new (
    l: number,
    r: number,
    t: number,
    b: number,
    n: number,
    f: number,
  ) => CameraLike;
  Mesh: new (geo: unknown, mat: unknown) => MeshLike;
  PlaneGeometry: new (w: number, h: number) => unknown;
  MeshBasicNodeMaterial: new () => NodeMaterialLike;
  Vector2: new (x?: number, y?: number) => Vec2Like;
  Vector3: new (x?: number, y?: number, z?: number) => Vec3Like;
  HalfFloatType: number;
  NoBlending: number;
  LinearFilter: number;
  ClampToEdgeWrapping: number;
}

interface TslSymbols {
  uniform: (v: unknown) => AnyNode & UniformNode<unknown>;
  texture: (tex: unknown, uvNode?: AnyNode) => AnyNode & { value: unknown };
  uv: () => AnyNode;
  vec2: (x: AnyNode | number, y: AnyNode | number) => AnyNode;
  vec4: (
    x: AnyNode | number,
    y: AnyNode | number,
    z: AnyNode | number,
    w: AnyNode | number,
  ) => AnyNode;
  length: (n: AnyNode) => AnyNode;
  exp: (n: AnyNode) => AnyNode;
  clamp: (n: AnyNode, a: number, b: number) => AnyNode;
}

interface RenderTargetLike {
  width: number;
  height: number;
  texture: { minFilter: number; magFilter: number; wrapS: number; wrapT: number };
  setSize: (w: number, h: number) => void;
  dispose: () => void;
}
interface SceneLike {
  add: (o: unknown) => void;
}
interface CameraLike {
  [k: string]: unknown;
}
interface MeshLike {
  frustumCulled: boolean;
}
interface NodeMaterialLike {
  colorNode: unknown;
  transparent: boolean;
  depthTest: boolean;
  depthWrite: boolean;
  blending: number;
  toneMapped: boolean;
  dispose: () => void;
}

interface RendererLike {
  getRenderTarget: () => RenderTargetLike | null;
  setRenderTarget: (rt: RenderTargetLike | null) => void;
  render: (scene: unknown, camera: unknown) => void;
  clear: (color?: boolean, depth?: boolean, stencil?: boolean) => void;
}

const FLOW_SIZE = 320;

export interface PointerFlowmap {
  /** The TSL texture node to sample in the post graph (current accumulation). */
  flowTexNode: AnyNode & { value: unknown };
  /** Strength uniform node (mutated from fxStore). */
  uStrength: UniformNode<number>;
  /** Advance one frame: stamp (unless idle) + fade + ping-pong. */
  tick: (params: {
    dt: number; // frame delta, seconds (clamped internally to 1/30)
    px: number; // smoothed pointer x, clip [0..1] top-left
    py: number; // smoothed pointer y, clip [0..1] top-left
    vx: number; // velocity (clip/sec)
    vy: number;
    aspect: number; // width / height (for circular splat)
    dissipation: number; // per-60Hz-frame fade factor (dt-normalized in tick)
    splatRadius: number;
    strength: number;
  }) => void;
  dispose: () => void;
}

/**
 * Build the flowmap rig. `webgpu`/`tsl` are the lazily-imported namespaces from
 * PostFXNodes; `gl` is the live WebGPURenderer.
 */
export function createPointerFlowmap(
  gl: RendererLike,
  webgpu: WebGPUSymbols,
  tsl: TslSymbols,
): PointerFlowmap {
  const {
    RenderTarget,
    Scene,
    OrthographicCamera,
    Mesh,
    PlaneGeometry,
    MeshBasicNodeMaterial,
    Vector2,
    Vector3,
    HalfFloatType,
    NoBlending,
    LinearFilter,
    ClampToEdgeWrapping,
  } = webgpu;
  const { uniform, texture, uv, vec2, vec4, length, exp, clamp } = tsl;

  const rtOpts = {
    type: HalfFloatType,
    depthBuffer: false,
    stencilBuffer: false,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
  };
  let rtRead = new RenderTarget(FLOW_SIZE, FLOW_SIZE, rtOpts);
  let rtWrite = new RenderTarget(FLOW_SIZE, FLOW_SIZE, rtOpts);

  // --- Offscreen quad scene ----------------------------------------------------
  const quadScene = new Scene();
  // NDC-filling quad: a 2×2 plane at z=0, viewed by an ortho camera whose frustum
  // spans [-1,1] in x/y and [-1,1] in z (near=-1, far=1) so the z=0 plane is in
  // view without repositioning the camera.
  const quadCam = new OrthographicCamera(-1, 1, 1, -1, -1, 1);

  // Uniform nodes the colorNode reads. `uPrev` samples the PREVIOUS field.
  const uPrev = texture(rtRead.texture, uv());
  const pointerVec = new Vector2(0.5, 0.5);
  const velVec = new Vector3(0, 0, 0);
  const uPointer = uniform(pointerVec as unknown);
  const uVelStrength = uniform(velVec as unknown);
  const uAspect = uniform(1);
  // Written per tick() as pow(baseDissipation, dt*60) — never the raw base.
  const uDissipation = uniform(0.96);
  const uRadius = uniform(0.07);

  const quadMat = new MeshBasicNodeMaterial();
  quadMat.transparent = false;
  quadMat.depthTest = false;
  quadMat.depthWrite = false;
  quadMat.blending = NoBlending;
  quadMat.toneMapped = false;

  // colorNode: faded previous field + Gaussian velocity splat.
  //   prev = sample(prevField) * dissipation
  //   d    = distance(uv, pointer), aspect-corrected so the splat is circular
  //   g    = exp(-(d/radius)^2 * 4)                 (soft Gaussian falloff)
  //   splat= vec4(vel.xy, strength, 0) * g
  //   out  = clamp(prev + splat)                    (RG can be ±, B in [0,1])
  // Encoding: RG holds the velocity (signed), B a presence/strength channel.
  const fragUv = uv();
  const prevField = uPrev as unknown as AnyNode;
  const pointerNode = uPointer as unknown as AnyNode;
  const velNode = uVelStrength as unknown as AnyNode;
  const dissipationNode = uDissipation as unknown as AnyNode;
  const radiusNode = uRadius as unknown as AnyNode;
  const aspectNode = uAspect as unknown as AnyNode;

  const prev = prevField.mul(dissipationNode);
  // Aspect-correct the X delta so a circular splat is round on wide screens.
  const dx = fragUv.x.sub(pointerNode.x).mul(aspectNode);
  const dy = fragUv.y.sub(pointerNode.y);
  const d = length(vec2(dx, dy));
  const norm = d.div(radiusNode);
  const g = exp(norm.mul(norm).mul(-4.0));
  const splat = vec4(velNode.x.mul(g), velNode.y.mul(g), velNode.z.mul(g), 0);
  const sum = prev.add(splat);
  // Clamp magnitude so accumulation can't blow past a sane range.
  quadMat.colorNode = vec4(
    clamp(sum.x, -1, 1),
    clamp(sum.y, -1, 1),
    clamp(sum.z, 0, 1),
    1,
  );

  const quad = new Mesh(new PlaneGeometry(2, 2), quadMat);
  quad.frustumCulled = false;
  quadScene.add(quad);

  // Clear both targets to zero ONCE so the first frame's `prev` sample reads a
  // clean field (no uninitialized-texture garbage), then restore the screen.
  {
    const prevTarget = gl.getRenderTarget();
    gl.setRenderTarget(rtRead);
    gl.clear(true, false, false);
    gl.setRenderTarget(rtWrite);
    gl.clear(true, false, false);
    gl.setRenderTarget(prevTarget);
  }

  // --- Post-graph sample node (current accumulation) ---------------------------
  // The post graph reads THIS node; its value is repointed each frame to the RT
  // we just wrote. Starts on rtWrite (becomes rtRead after the first swap).
  const flowTexNode = texture(rtWrite.texture, uv()) as AnyNode & { value: unknown };
  const uStrength = uniform(0.006) as unknown as UniformNode<number>;

  function tick(params: {
    dt: number;
    px: number;
    py: number;
    vx: number;
    vy: number;
    aspect: number;
    dissipation: number;
    splatRadius: number;
    strength: number;
  }) {
    // dt-normalize the integrator (this was the last frame-rate-dependent one
    // in the codebase). `dissipation` is a PER-60HZ-FRAME factor; applied raw
    // once per tick, a 144 Hz display decays the field ~2.4× faster in
    // wall-clock (and deposits ~2.4× more splat energy/second) than 60 Hz.
    // Raising the fade to dt·60 and scaling the deposit by the same dt·60
    // makes both wall-clock-true: dt=1/60 → pow(base, 1) and ×1, so 60 Hz
    // behavior is exactly the old per-frame multiply. Clamped to 1/30
    // (sibling convention) so a background-tab refocus can't land the whole
    // away-time as one giant fade/deposit.
    const dt = Math.min(params.dt, 1 / 30);
    const dtScale = dt * 60;
    (uStrength as UniformNode<number>).value = params.strength;
    (uDissipation as unknown as UniformNode<number>).value = Math.pow(
      params.dissipation,
      dtScale,
    );
    (uRadius as unknown as UniformNode<number>).value = params.splatRadius;
    (uAspect as unknown as UniformNode<number>).value = params.aspect;

    // Flowmap UV space is bottom-left origin (GL/RT), pointer is top-left → flip Y.
    pointerVec.set(params.px, 1 - params.py);

    // Idle cursor → no stamp (zero strength), only the cheap fade runs.
    const speed = Math.hypot(params.vx, params.vy);
    const moving = speed > 0.0008;
    // Encode velocity (flip Y to match the flipped UV space). Scale into a sane
    // range; the splat strength channel marks "freshly disturbed". ×dtScale
    // AFTER the clamp so the per-SECOND deposit matches 60 Hz at any refresh
    // rate (dtScale is exactly 1 at dt=1/60 — see the block above).
    const vScale = 1.5;
    velVec.set(
      moving ? clampN(params.vx * vScale, -1, 1) * dtScale : 0,
      moving ? clampN(-params.vy * vScale, -1, 1) * dtScale : 0,
      moving ? Math.min(speed * 6, 1) * dtScale : 0,
    );

    // Read from rtRead (uPrev points at it), write into rtWrite.
    (uPrev as { value: unknown }).value = rtRead.texture;

    const prevTarget = gl.getRenderTarget();
    gl.setRenderTarget(rtWrite);
    gl.render(quadScene, quadCam);
    gl.setRenderTarget(prevTarget);

    // The post graph samples the just-written target.
    flowTexNode.value = rtWrite.texture;

    // Swap for next frame.
    const tmp = rtRead;
    rtRead = rtWrite;
    rtWrite = tmp;
  }

  function dispose() {
    rtRead.dispose();
    rtWrite.dispose();
    quadMat.dispose();
    (quad as unknown as { geometry: { dispose: () => void } }).geometry.dispose();
  }

  return { flowTexNode, uStrength, tick, dispose };
}

function clampN(v: number, a: number, b: number) {
  return Math.min(Math.max(v, a), b);
}
