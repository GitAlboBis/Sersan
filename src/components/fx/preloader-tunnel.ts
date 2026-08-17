/**
 * preloader-tunnel.ts — raw-WebGL particle tunnel: the preloader's backdrop.
 *
 * Faithful port of the GreenSock "Made with TroisJS" pen (codepen YzbPYMx),
 * archived verbatim at `_refs/snippets/preloader-intro-troisjs.js`: 50k points
 * looping infinitely through z as additive soft sprites, pointer tilt, and a
 * zoom-blur post pass whose strength tracks the time coefficient (timeCoef
 * lerped toward 100 is THE WARP). Ported WITHOUT three.js on purpose — the
 * preloader ships in the root layout's initial chunk and three must stay in
 * the lazy Scene chunk — so the projection/modelview matrices are hand-rolled
 * (camera at z=0, fov 50, near 0.1, far 1000; points group at z=-150) and the
 * shaders are the reference's GLSL 100.
 *
 * Reference math kept VERBATIM:
 *   p.z = -150. + mod(position.z + uTime, 300.)      — infinite tunnel loop
 *   gl_PointSize = size * (-50.0 / mvPosition.z)     — perspective falloff
 *   timeCoef = lerp(timeCoef, targetTimeCoef, 0.02)  — per frame
 *   uTime += delta * timeCoef * 4
 *   tilt  = lerp(rot, pointerN * ±0.05, 0.02)        — pointer tilt
 *   zoomStrength = timeCoef * 0.004                  — zoom-blur drive
 *   spread rndFS(200)/rndFS(200)/rndFS(300), size rnd(5, 20)
 *
 * SERSAN adaptation (palette + drive ONLY, never the math):
 *   - Brand colors instead of random nice-color palettes: ~72% dim off-white
 *     rgb(230,240,255), ~18% cyan #3BE1FF, ~10% blue #2A7FFF, with a per-point
 *     intensity PREMULTIPLIED into the color attribute so additive stacking
 *     doesn't blow out over the navy base.
 *   - targetTimeCoef is driven by the caller (breathes with load progress,
 *     slams to 100 on the reveal warp) instead of the pen's link hover.
 *   - The additive soft sprites carry the glow (replaces UnrealBloom); the
 *     soft radial sprite is a generated 64×64 canvas texture standing in for
 *     the pen's sprite.png.
 *   - 50k points on desktop, ~14k on small/weak devices, and — mobile-parity
 *     plan Phase 3.1.2 — `round(50k × fxBudget.particleScale)` (= 25k) on a
 *     CAPABLE phone (`fxBudget.level 2`), read from the tierStore once it is
 *     resolved, else from the pure `resolveFxBudget()` fallback (tierStore has
 *     no value import from three, so the "no three import" contract above
 *     holds); canvas DPR cap 1.5.
 *
 * The CALLER owns the rAF: render(deltaSec) is invoked from the preloader's
 * single frame() loop — this module never schedules a frame of its own. All
 * GL resources are deleted in dispose() and the context is dropped via
 * WEBGL_lose_context.
 *
 * If `canvas.getContext("webgl")` returns null, createPreloaderTunnel returns
 * null and the preloader runs its 2D starfield fallback on the same canvas
 * (a failed WebGL attempt leaves the canvas free for a "2d" context). If the
 * FBO for the zoom-blur pass can't be completed, the pass alone is skipped
 * and points render straight to the canvas.
 */

// Budget source: the tierStore is AUTHORITATIVE once resolved (it honours
// `stepDownBudget()` and costs no probe context); the PURE `resolveFxBudget()`
// (device facts + dev `?fx=` override; never `backend`) is the fallback ONLY
// for the preloader, which mounts before CanvasHost has resolved the tier.
// tierStore's only value import is zustand (its three import is type-only),
// so three stays out of this chunk.
import { resolveFxBudget, useTierStore } from "@/webgl/store/tierStore";

export interface PreloaderTunnel {
  /** Advance + draw one frame. `deltaSec` comes from the caller's single rAF
   *  loop, already clamped by the caller (≤ 1/30 s). */
  render(deltaSec: number): void;
  /** Re-fit drawing buffer, projection and FBO to the window. */
  resize(): void;
  /** Set the warp drive; the actual timeCoef lerps toward it at 0.02/frame. */
  setTargetTimeCoef(v: number): void;
  /**
   * Aim the convergence point at canvas UV (u, v), 0..1, y-up (the zoom-blur
   * uCenter convention). Default 0.5/0.5 = screen center (the preloader's
   * hardcoded behavior, unchanged). Drives BOTH the zoom-blur center uniform
   * and — when constructed with `{ tilt: false }` — a matching group tilt so
   * the PARTICLE vanishing point converges on the same spot (the singularity
   * passage locks it onto the marched hole during the crossfade). With the
   * pointer tilt active (preloader default) only the blur center moves.
   */
  setCenter(u: number, v: number): void;
  /** Delete every GL resource (buffers, textures, programs, FBO), remove the
   *  pointer listener, and lose the context. */
  dispose(): void;
}

export interface PreloaderTunnelOptions {
  /**
   * `false` skips the pointermove listener entirely and derives the group
   * tilt from setCenter() instead — the preloader's ±0.05 pointer tilt would
   * fight the passage's NDC center-lock during the crossfade window.
   * Default `true` (preloader behavior, byte-identical).
   */
  tilt?: boolean;
}

// ---- Reference parameters (see header — do not tune these) ------------------
const FOV_RAD = (50 * Math.PI) / 180; // camera fov 50°
const NEAR = 0.1;
const FAR = 1000;
const GROUP_Z = -150; // points group at z=-150, camera at z=0
const TILT_AMOUNT = 0.05; // `da` in the reference
const TILT_LERP = 0.02;
const TIME_COEF_LERP = 0.02;
const TIME_SCALE = 4; // uTime += delta * timeCoef * 4
const ZOOM_STRENGTH_COEF = 0.004; // zoomStrength = timeCoef * 0.004

// ---- SERSAN adaptation parameters -------------------------------------------
const COUNT_DESKTOP = 50000; // the pen's POINTS_COUNT
const COUNT_SMALL = 14000; // narrow viewport or ≤4 cores
const DPR_CAP = 1.5; // glow field — resolution barely matters
// Palette distribution (premultiplied intensity, see header).
const WHITE_SHARE = 0.72; // rgb(230,240,255) × rnd(0.16, 0.36)
const CYAN_SHARE = 0.18; // #3BE1FF rgb(59,225,255) × rnd(0.55, 0.95)
// remaining ~10%:          #2A7FFF rgb(42,127,255) × rnd(0.50, 0.85)

// ---- Shaders (GLSL 100) -----------------------------------------------------
// Vertex math is VERBATIM from the reference; projectionMatrix/modelViewMatrix
// are plain uniforms here (raw WebGL has no built-ins).
const POINT_VERT = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec3 color;
  attribute float size;
  uniform float uTime;
  uniform mat4 projectionMatrix;
  uniform mat4 modelViewMatrix;
  varying vec4 vColor;
  void main(){
    vColor = vec4(color, 1.0);
    vec3 p = vec3(position);
    p.z = -150. + mod(position.z + uTime, 300.);
    vec4 mvPosition = modelViewMatrix * vec4( p, 1.0 );
    gl_PointSize = size * (-50.0 / mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const POINT_FRAG = /* glsl */ `
  precision mediump float;
  uniform sampler2D uTexture;
  varying vec4 vColor;
  void main() {
    gl_FragColor = vColor * texture2D(uTexture, gl_PointCoord);
  }
`;

// Fullscreen triangle for the post pass (3 verts cover the screen; uv beyond
// [0,1] is clipped away).
const QUAD_VERT = /* glsl */ `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Port of the reference's ZoomBlurPass (evanw glfx zoom blur): dithered taps
// marching radially toward the screen centre, triangular weights. 24 taps
// (the pen used 40) — visually identical at preloader scale, cheaper.
const ZOOM_FRAG = /* glsl */ `
  precision mediump float;
  uniform sampler2D tDiffuse;
  uniform vec2 uCenter;
  uniform float uStrength;
  varying vec2 vUv;
  float random(vec3 scale, float seed) {
    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
  }
  void main() {
    vec4 color = vec4(0.0);
    float total = 0.0;
    vec2 toCenter = uCenter - vUv;
    float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);
    for (float t = 0.0; t <= 24.0; t++) {
      float percent = (t + offset) / 24.0;
      float weight = 4.0 * (percent - percent * percent);
      color += texture2D(tDiffuse, vUv + toCenter * percent * uStrength) * weight;
      total += weight;
    }
    gl_FragColor = color / total;
  }
`;

// ---- Small helpers ----------------------------------------------------------
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rnd = (a: number, b: number) => a + Math.random() * (b - a); // randFloat
const rndFS = (n: number) => (Math.random() - 0.5) * n; // randFloatSpread

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("createShader failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader compile: ${log ?? "unknown"}`);
  }
  return shader;
}

function buildProgram(
  gl: WebGLRenderingContext,
  vertSrc: string,
  fragSrc: string,
): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    throw new Error("createProgram failed");
  }
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  // Shaders can be flagged for deletion once linked — no dangling GL objects.
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`program link: ${log ?? "unknown"}`);
  }
  return program;
}

/** Column-major perspective projection, written in place (no allocations). */
function setPerspective(
  out: Float32Array,
  fovRad: number,
  aspect: number,
  near: number,
  far: number,
): void {
  const f = 1 / Math.tan(fovRad / 2);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
}

/**
 * Column-major modelView for the points group, written in place: identity
 * camera at the origin × translate(0,0,GROUP_Z) × Rx(tiltX) × Ry(tiltY) —
 * the exact matrix three composes for a Points object at z=-150 with an XYZ
 * euler of (tiltX, tiltY, 0), as in the reference.
 */
function setModelView(out: Float32Array, tiltX: number, tiltY: number): void {
  const a = Math.cos(tiltX);
  const b = Math.sin(tiltX);
  const c = Math.cos(tiltY);
  const d = Math.sin(tiltY);
  out[0] = c;
  out[1] = b * d;
  out[2] = -a * d;
  out[3] = 0;
  out[4] = 0;
  out[5] = a;
  out[6] = b;
  out[7] = 0;
  out[8] = d;
  out[9] = -b * c;
  out[10] = a * c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = GROUP_Z;
  out[15] = 1;
}

/** 64×64 soft radial sprite (white core → transparent), standing in for the
 *  pen's sprite.png. Uploaded PREMULTIPLIED so, under (ONE, ONE) additive
 *  blending, the RGB itself carries the radial falloff — round soft glows,
 *  not square points. */
function makeSpriteTexture(gl: WebGLRenderingContext): WebGLTexture {
  const size = 64;
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("2d context for sprite failed");
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = gl.createTexture();
  if (!tex) throw new Error("createTexture failed");
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.generateMipmap(gl.TEXTURE_2D); // 64 is POT — mips keep far points clean
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/**
 * Try to build the tunnel on `canvas`. Returns null if a WebGL1 context is
 * unavailable (caller falls back to the 2D starfield on the same canvas) or
 * if — theoretically — program setup fails on a live context (in that case
 * the context is lost so nothing keeps rendering; the CSS radial base
 * remains as the backdrop).
 */
export function createPreloaderTunnel(
  canvas: HTMLCanvasElement,
  options?: PreloaderTunnelOptions,
): PreloaderTunnel | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl", {
      alpha: true, // clear transparent — composite over the CSS navy radial
      premultipliedAlpha: true,
      antialias: false, // additive glow field — MSAA buys nothing
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
  } catch {
    gl = null;
  }
  if (!gl) return null;

  try {
    return initTunnel(gl, canvas, options);
  } catch {
    // Unreachable in practice (trivial GLSL 100 on a live context). Drop the
    // context so nothing leaks; the canvas is already in "webgl" mode so the
    // 2d fallback can't attach — the CSS radial base remains.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
}

function initTunnel(
  gl: WebGLRenderingContext,
  canvas: HTMLCanvasElement,
  options?: PreloaderTunnelOptions,
): PreloaderTunnel {
  const pointerTilt = options?.tilt !== false;

  // ---- Point count tier (SERSAN adaptation) ----
  // Mobile-parity plan Phase 3.1.2: a CAPABLE phone (`fxBudget.level 2`) is
  // sized by BUDGET, not by viewport width — `round(COUNT_DESKTOP ×
  // particleScale)` = 25k (a coarse tablet ≥768 px no longer takes the full
  // 50k). Every other level keeps the ORIGINAL heuristic unchanged (14k on
  // narrow/≤4-core, 50k otherwise) so desktop `level 3` and today's lite
  // `level 1` are byte-identical. The store is authoritative once resolved
  // (it honours `stepDownBudget()` and costs no probe context); the pure
  // `resolveFxBudget()` fallback exists only for the preloader, which mounts
  // BEFORE CanvasHost resolves (it reads the dev `?fx=` override itself). The
  // singularity passage's tunnels mount after resolve, so they read the store
  // and share this rule automatically (level 2 only when the phone is capable).
  const ts = useTierStore.getState();
  const budget = ts.resolved ? ts.fxBudget : resolveFxBudget();
  const small =
    window.innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4;
  const count =
    budget.level === 2
      ? Math.round(COUNT_DESKTOP * budget.particleScale)
      : small
        ? COUNT_SMALL
        : COUNT_DESKTOP;

  // ---- Programs ----
  const pointProgram = buildProgram(gl, POINT_VERT, POINT_FRAG);
  const aPosition = gl.getAttribLocation(pointProgram, "position");
  const aColor = gl.getAttribLocation(pointProgram, "color");
  const aSize = gl.getAttribLocation(pointProgram, "size");
  const uTimeLoc = gl.getUniformLocation(pointProgram, "uTime");
  const uProjLoc = gl.getUniformLocation(pointProgram, "projectionMatrix");
  const uMvLoc = gl.getUniformLocation(pointProgram, "modelViewMatrix");
  const uTexLoc = gl.getUniformLocation(pointProgram, "uTexture");

  const zoomProgram = buildProgram(gl, QUAD_VERT, ZOOM_FRAG);
  const qaPosition = gl.getAttribLocation(zoomProgram, "position");
  const zTexLoc = gl.getUniformLocation(zoomProgram, "tDiffuse");
  const zCenterLoc = gl.getUniformLocation(zoomProgram, "uCenter");
  const zStrengthLoc = gl.getUniformLocation(zoomProgram, "uStrength");

  // ---- Geometry: interleaved [x y z | r g b | size], built ONCE ----
  // Spread + size are the reference's exact distributions; the color mix is
  // the SERSAN palette with intensity premultiplied in (see header).
  const STRIDE = 7 * 4; // bytes
  const interleaved = new Float32Array(count * 7);
  for (let i = 0; i < count; i++) {
    const o = i * 7;
    interleaved[o] = rndFS(200);
    interleaved[o + 1] = rndFS(200);
    interleaved[o + 2] = rndFS(300);
    const roll = Math.random();
    let r: number, g: number, b: number, intensity: number;
    if (roll < WHITE_SHARE) {
      r = 230 / 255; g = 240 / 255; b = 1; // dim off-white
      intensity = rnd(0.16, 0.36);
    } else if (roll < WHITE_SHARE + CYAN_SHARE) {
      r = 59 / 255; g = 225 / 255; b = 1; // #3BE1FF
      intensity = rnd(0.55, 0.95);
    } else {
      r = 42 / 255; g = 127 / 255; b = 1; // #2A7FFF
      intensity = rnd(0.5, 0.85);
    }
    interleaved[o + 3] = r * intensity;
    interleaved[o + 4] = g * intensity;
    interleaved[o + 5] = b * intensity;
    interleaved[o + 6] = rnd(5, 20);
  }
  const pointBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);

  // Fullscreen triangle for the zoom-blur pass.
  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );

  const sprite = makeSpriteTexture(gl);

  // ---- Zoom-blur FBO (optional — pass is skipped gracefully if incomplete) --
  let fbo: WebGLFramebuffer | null = gl.createFramebuffer();
  let fboTex: WebGLTexture | null = gl.createTexture();
  let fboOk = false;

  // ---- Per-frame state (all preallocated — no allocations in render()) ----
  const proj = new Float32Array(16);
  const modelView = new Float32Array(16);
  let width = 0; // device px
  let height = 0;
  let uTime = 0;
  let timeCoef = 1;
  let targetTimeCoef = 1;
  let rotX = 0;
  let rotY = 0;
  let pointerNX = 0;
  let pointerNY = 0;
  // Convergence point in canvas UV (0..1, y-up). 0.5/0.5 = screen center —
  // the preloader's original hardcoded zoom-blur center.
  let centerU = 0.5;
  let centerV = 0.5;
  let disposed = false;

  // Pointer normalized to [-1, 1] from the window centre, y up (three.js
  // pointer convention, matching the reference's positionN). Skipped
  // entirely under `{ tilt: false }` (the passage's center lock owns the
  // tilt there — no listener, no fight).
  const onPointerMove = (e: PointerEvent) => {
    pointerNX = (e.clientX / window.innerWidth) * 2 - 1;
    pointerNY = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  if (pointerTilt) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
  }

  function allocFbo(): void {
    if (!fbo || !fboTex) {
      fboOk = false;
      return;
    }
    gl.bindTexture(gl.TEXTURE_2D, fboTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      fboTex,
      0,
    );
    fboOk =
      gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function resize(): void {
    if (disposed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    width = canvas.width;
    height = canvas.height;
    setPerspective(proj, FOV_RAD, width / height, NEAR, FAR);
    allocFbo();
  }
  resize();

  function render(deltaSec: number): void {
    if (disposed || width === 0 || height === 0) return;

    // Time + tilt advance — reference math, verbatim.
    timeCoef = lerp(timeCoef, targetTimeCoef, TIME_COEF_LERP);
    uTime += deltaSec * timeCoef * TIME_SCALE;
    const zoomStrength = timeCoef * ZOOM_STRENGTH_COEF;
    if (pointerTilt) {
      rotX = lerp(rotX, pointerNY * TILT_AMOUNT, TILT_LERP);
      rotY = lerp(rotY, -pointerNX * TILT_AMOUNT, TILT_LERP);
    } else {
      // Center-lock tilt: aim the PARTICLE convergence at the same UV the
      // zoom blur converges on. A true point at infinity along the group's
      // −z axis lands at ndc.x ≈ −(f/aspect)·tiltY, ndc.y ≈ f·tiltX
      // (f = 1/tan(fov/2)), but this tunnel's finite z-loop clusters its far
      // points at view-z ≈ 2·|GROUP_Z| with lateral GROUP_Z·tilt — HALF the
      // infinite displacement — so the aim carries a ×2 to land the visible
      // cluster on target. The blur center is exact regardless; the tilt is
      // the matching heuristic. Reference's 0.02 lerp keeps the chase smooth
      // in both scrub directions.
      const f = 1 / Math.tan(FOV_RAD / 2);
      const nx = centerU * 2 - 1;
      const ny = centerV * 2 - 1;
      const aspect = height > 0 ? width / height : 1;
      rotX = lerp(rotX, (2 * ny) / f, TILT_LERP);
      rotY = lerp(rotY, (-2 * nx * aspect) / f, TILT_LERP);
    }
    setModelView(modelView, rotX, rotY);

    // Pass 1 — points into the FBO (or straight to canvas if the FBO failed).
    const useFbo = fboOk && fbo !== null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, useFbo ? fbo : null);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(pointProgram);
    gl.disable(gl.DEPTH_TEST); // reference: depth-test off
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE); // additive — the sprites carry the glow
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, STRIDE, 12);
    gl.enableVertexAttribArray(aSize);
    gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, STRIDE, 24);
    gl.uniform1f(uTimeLoc, uTime);
    gl.uniformMatrix4fv(uProjLoc, false, proj);
    gl.uniformMatrix4fv(uMvLoc, false, modelView);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sprite);
    gl.uniform1i(uTexLoc, 0);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.disableVertexAttribArray(aColor);
    gl.disableVertexAttribArray(aSize);

    // Pass 2 — zoom blur toward the screen centre (the reference's
    // ZoomBlurPass). The FBO texture already holds accumulated rgb+alpha, so
    // it is written straight out with blending off.
    if (useFbo) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.BLEND);
      gl.useProgram(zoomProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.enableVertexAttribArray(qaPosition);
      gl.vertexAttribPointer(qaPosition, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fboTex);
      gl.uniform1i(zTexLoc, 0);
      gl.uniform2f(zCenterLoc, centerU, centerV);
      gl.uniform1f(zStrengthLoc, zoomStrength);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    if (pointerTilt) window.removeEventListener("pointermove", onPointerMove);
    gl.deleteBuffer(pointBuffer);
    gl.deleteBuffer(quadBuffer);
    gl.deleteTexture(sprite);
    if (fboTex) gl.deleteTexture(fboTex);
    if (fbo) gl.deleteFramebuffer(fbo);
    fboTex = null;
    fbo = null;
    fboOk = false;
    gl.deleteProgram(pointProgram);
    gl.deleteProgram(zoomProgram);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  return {
    render,
    resize,
    setTargetTimeCoef(v: number) {
      targetTimeCoef = v;
    },
    setCenter(u: number, v: number) {
      centerU = Math.min(1, Math.max(0, u));
      centerV = Math.min(1, Math.max(0, v));
    },
    dispose,
  };
}
