/**
 * GPGPU "dissolve & regenerate" simulation — GLSL build (WebGL2 / flag-OFF path,
 * the live/verified path).
 *
 * THE TECHNIQUE (mirrors fluid/PointerFlowmap.ts, proven on this renderer)
 * -----------------------------------------------------------------------
 * Particle POSITION and VELOCITY live in two pairs of FLOAT RenderTargets
 * (ping-pong), one texel per particle on a SIZE×SIZE grid. Every frame a
 * fullscreen-quad sim pass advances them on the GPU — NO CPU per-particle work:
 *
 *   1. velocity pass : vel += f(spring, mouse-repulsion, turbulence) ; damp ; clamp
 *   2. position pass : pos += vel * dt
 *
 * Each pass renders an NDC-filling quad with a GLSL ShaderMaterial into the
 * "write" target while sampling the "read" target, exactly the
 * `gl.setRenderTarget(write); gl.render(quad, cam); gl.setRenderTarget(prev)`
 * pattern PointerFlowmap established (synchronous, works on WebGLRenderer and on
 * the WebGL2 sub-backend of WebGPURenderer). After both passes we swap.
 *
 * HOME / SEEDING
 *   `home` is an immutable DataTexture of the MeshSurfaceSampler surface points
 *   (geometry/sersanMark.ts → sampleMarkHomePositions). Position is SEEDED from
 *   the same data so the cloud starts already in the mark shape; velocity starts
 *   at zero. The mesh is never rendered — the sampler only feeds these textures.
 *
 * RENDER
 *   Built separately (gpgpuRender.ts on OFF). The render material samples THIS
 *   rig's `positionTexture` per instance via `aRef` (the grid UV).
 *
 * FORCES (model space — uMouse is the cursor projected into the assembly's local
 * frame so repulsion follows drag rotation; see HeroLogo):
 *   (a) elastic spring toward home   (regeneration)        — SPRING
 *   (b) mouse repulsion within RADIUS, PUSH falloff (push²) — dispersion
 *   (c) damping (exp) + max-speed clamp                     — DAMPING / MAX_SPEED
 *   (d) value-noise turbulence, low at rest, more far from home — TURB_BASE/MOVE
 *
 * This is the GLSL twin of gpgpuNodeSim.ts (TSL, flag-ON). It imports ONLY
 * `three` core (no three/webgpu), so it stays out of the heavy build and the ON
 * bundle's dual-namespace trap.
 */
import * as THREE from "three";
import type { GpgpuConfig } from "./gpgpuConfig";

/** Shared value-noise + turbulence GLSL (matches the TSL twin constant-for-constant). */
const NOISE_GLSL = /* glsl */ `
  float hash31(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }
  float vnoise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float c000 = hash31(i + vec3(0.0, 0.0, 0.0));
    float c100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float c010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float c110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float c001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float c101 = hash31(i + vec3(1.0, 0.0, 1.0));
    float c011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float c111 = hash31(i + vec3(1.0, 1.0, 1.0));
    float x00 = mix(c000, c100, f.x);
    float x10 = mix(c010, c110, f.x);
    float x01 = mix(c001, c101, f.x);
    float x11 = mix(c011, c111, f.x);
    float y0 = mix(x00, x10, f.y);
    float y1 = mix(x01, x11, f.y);
    return mix(y0, y1, f.z);
  }
  // Cheap 3D turbulence: three decorrelated value-noise lookups → a vec3 in
  // ~[-0.5,0.5]. Same recipe the TSL path approximates (mx_noise_vec3 there).
  vec3 turb3(vec3 p) {
    return vec3(
      vnoise3(p) - 0.5,
      vnoise3(p + vec3(31.4, 0.0, 11.7)) - 0.5,
      vnoise3(p.zxy + vec3(7.7, 53.1, 0.0)) - 0.5
    );
  }
`;

const QUAD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/** Velocity pass: integrates the four forces into the velocity field. */
const VELOCITY_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D uPos;
  uniform sampler2D uVel;
  uniform sampler2D uHome;
  uniform vec3  uMouse;   // model-space cursor (pushed to ~1e9 when inactive)
  uniform float uDelta;
  uniform float uTime;
  uniform float uSpring;
  uniform float uDamping;
  uniform float uPush;
  uniform float uRadius;
  uniform float uMaxSpeed;
  uniform float uTurbBase;
  uniform float uTurbMove;
  varying vec2 vUv;

  ${NOISE_GLSL}

  void main() {
    vec3 pos  = texture2D(uPos, vUv).xyz;
    vec3 vel  = texture2D(uVel, vUv).xyz;
    vec3 home = texture2D(uHome, vUv).xyz;
    float dt = uDelta;

    // (a) elastic spring toward the rest (home) surface point — regeneration.
    vec3 toHome = home - pos;
    vel += toHome * uSpring * dt;

    // (b) mouse repulsion within uRadius (model space), push² falloff →
    //     1 at the cursor, 0 at the radius edge. normalize(away) gives the
    //     outward push direction.
    vec3 away = pos - uMouse;
    float dist = max(length(away), 1e-4);
    float push = max(0.0, uRadius - dist) / uRadius;
    vel += (away / dist) * (push * push) * uPush * dt;

    // (d) turbulence — low at rest, ramps up the farther a particle is from
    //     home (so the dispersed cloud shimmers, the recomposed mark is calm).
    float farness = min(length(toHome), 1.0);
    vec3 t = turb3(pos * 1.3 + uTime * 0.15);
    vel += t * (uTurbBase + farness * uTurbMove) * dt;

    // (c) exponential damping + max-speed clamp (frame-rate independent).
    vel *= exp(-uDamping * dt);
    float sp = length(vel);
    vel *= min(sp, uMaxSpeed) / max(sp, 1e-4);

    gl_FragColor = vec4(vel, 1.0);
  }
`;

/** Position pass: simple Euler integration of the freshly-written velocity. */
const POSITION_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D uPos;
  uniform sampler2D uVel;
  uniform float uDelta;
  varying vec2 vUv;
  void main() {
    vec3 pos = texture2D(uPos, vUv).xyz;
    vec3 vel = texture2D(uVel, vUv).xyz;
    gl_FragColor = vec4(pos + vel * uDelta, 1.0);
  }
`;

export interface GpgpuTickParams {
  /** Clamped frame delta (seconds). */
  dt: number;
  /** Wall-clock-ish accumulator for turbulence animation. */
  time: number;
  /** Model-space cursor; set far away (1e9) to disable repulsion. */
  mouse: THREE.Vector3;
}

/** Live-tunable force knobs (leva). Optional — defaults come from config. */
export interface GpgpuForces {
  spring: number;
  push: number;
  radius: number;
}

export interface GpgpuSimRig {
  /** Edge of the SIZE×SIZE state grid. */
  size: number;
  /** Freshly-written position texture for the render material to sample. */
  positionTexture: THREE.Texture;
  /** Freshly-written velocity texture (the render colors by its magnitude). */
  velocityTexture: THREE.Texture;
  /** Advance one sim step (velocity → position → swap). Called once/frame. */
  tick: (p: GpgpuTickParams) => void;
  /** Override the spring/push/radius force constants live (leva). */
  setForces: (f: GpgpuForces) => void;
  dispose: () => void;
}

interface RTLike {
  texture: THREE.Texture;
  dispose: () => void;
}

/**
 * Build the GLSL GPGPU rig on the classic WebGLRenderer.
 *
 * `floatType` is chosen by the caller (HeroLogo) after probing
 * `EXT_color_buffer_float` — FloatType when available (best precision for
 * accumulation), HalfFloatType otherwise. If neither renders, the caller falls
 * back to no GPGPU (a static mark), so this rig is only built when float/half RTs
 * are usable.
 */
export function createGpgpuSim(
  gl: THREE.WebGLRenderer,
  homeRGBA: Float32Array,
  size: number,
  config: GpgpuConfig,
  floatType: THREE.TextureDataType,
): GpgpuSimRig {
  // --- Home (immutable rest target) + initial position seed ------------------
  // One texel per particle, row-major, RGBA-float. Position starts AT home so
  // the cloud is already the mark on the first frame; velocity starts at zero.
  const home = new THREE.DataTexture(
    homeRGBA,
    size,
    size,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  home.needsUpdate = true;

  const rtOpts: THREE.RenderTargetOptions = {
    type: floatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  };
  let posRead = new THREE.WebGLRenderTarget(size, size, rtOpts) as RTLike;
  let posWrite = new THREE.WebGLRenderTarget(size, size, rtOpts) as RTLike;
  let velRead = new THREE.WebGLRenderTarget(size, size, rtOpts) as RTLike;
  let velWrite = new THREE.WebGLRenderTarget(size, size, rtOpts) as RTLike;

  // --- Offscreen quad + sim materials ---------------------------------------
  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);

  const velMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: VELOCITY_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uPos: { value: posRead.texture },
      uVel: { value: velRead.texture },
      uHome: { value: home },
      uMouse: { value: new THREE.Vector3(1e9, 1e9, 1e9) },
      uDelta: { value: 1 / 60 },
      uTime: { value: 0 },
      uSpring: { value: config.SPRING },
      uDamping: { value: config.DAMPING },
      uPush: { value: config.PUSH },
      uRadius: { value: config.RADIUS },
      uMaxSpeed: { value: config.MAX_SPEED },
      uTurbBase: { value: config.TURB_BASE },
      uTurbMove: { value: config.TURB_MOVE },
    },
  });
  const posMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: POSITION_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uPos: { value: posRead.texture },
      uVel: { value: velWrite.texture },
      uDelta: { value: 1 / 60 },
    },
  });

  const quad = new THREE.Mesh(quadGeo, velMat);
  quad.frustumCulled = false;
  quadScene.add(quad);

  // --- Seed the position targets to the home shape (both ping-pong slots) ----
  // Render the home DataTexture straight into both POSITION targets so the very
  // first sim frame reads the mark shape, not uninitialised garbage. Velocity
  // targets are cleared to zero.
  const seedMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uHome;
      varying vec2 vUv;
      void main() { gl_FragColor = vec4(texture2D(uHome, vUv).xyz, 1.0); }
    `,
    depthTest: false,
    depthWrite: false,
    uniforms: { uHome: { value: home } },
  });
  {
    const prevTarget = gl.getRenderTarget();
    quad.material = seedMat;
    for (const rt of [posRead, posWrite]) {
      gl.setRenderTarget(rt as unknown as THREE.WebGLRenderTarget);
      gl.render(quadScene, quadCam);
    }
    // Clear velocity to true zero (force black clear color regardless of the
    // scene's clear color, then restore it) so the first sim step reads vel=0.
    const prevClear = gl.getClearColor(new THREE.Color());
    const prevAlpha = gl.getClearAlpha();
    gl.setClearColor(0x000000, 0);
    for (const rt of [velRead, velWrite]) {
      gl.setRenderTarget(rt as unknown as THREE.WebGLRenderTarget);
      gl.clear(true, false, false);
    }
    gl.setClearColor(prevClear, prevAlpha);
    gl.setRenderTarget(prevTarget);
    quad.material = velMat;
    seedMat.dispose();
  }

  // Mutated each frame.
  const uMouse = velMat.uniforms.uMouse.value as THREE.Vector3;

  function tick(p: GpgpuTickParams) {
    const prevTarget = gl.getRenderTarget();

    // --- 1) VELOCITY pass: read pos/vel(read) → write velWrite -------------
    velMat.uniforms.uPos.value = posRead.texture;
    velMat.uniforms.uVel.value = velRead.texture;
    velMat.uniforms.uDelta.value = p.dt;
    velMat.uniforms.uTime.value = p.time;
    uMouse.copy(p.mouse);
    quad.material = velMat;
    gl.setRenderTarget(velWrite as unknown as THREE.WebGLRenderTarget);
    gl.render(quadScene, quadCam);

    // --- 2) POSITION pass: read pos(read) + the JUST-written velWrite ------
    posMat.uniforms.uPos.value = posRead.texture;
    posMat.uniforms.uVel.value = velWrite.texture;
    posMat.uniforms.uDelta.value = p.dt;
    quad.material = posMat;
    gl.setRenderTarget(posWrite as unknown as THREE.WebGLRenderTarget);
    gl.render(quadScene, quadCam);

    gl.setRenderTarget(prevTarget);

    // --- 3) swap read/write for both fields --------------------------------
    let tmp = posRead;
    posRead = posWrite;
    posWrite = tmp;
    tmp = velRead;
    velRead = velWrite;
    velWrite = tmp;
  }

  // The render material always samples the most-recent position field, which —
  // after the swap above — is `posRead`. A getter keeps the reference fresh.
  const rig: GpgpuSimRig = {
    size,
    get positionTexture() {
      return posRead.texture;
    },
    get velocityTexture() {
      return velRead.texture;
    },
    tick,
    setForces(f: GpgpuForces) {
      velMat.uniforms.uSpring.value = f.spring;
      velMat.uniforms.uPush.value = f.push;
      velMat.uniforms.uRadius.value = f.radius;
    },
    dispose() {
      posRead.dispose();
      posWrite.dispose();
      velRead.dispose();
      velWrite.dispose();
      home.dispose();
      velMat.dispose();
      posMat.dispose();
      quadGeo.dispose();
    },
  };
  return rig;
}
