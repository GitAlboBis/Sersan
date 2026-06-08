/**
 * GPGPU dissolve render material — GLSL instanced-billboard (WebGL2 / flag-OFF).
 *
 * One INSTANCED unit quad per particle (NOT THREE.Points — a WebGPU backend
 * hard-clamps point size to 1px, see DriftParticles / particleNodeMaterial). The
 * vertex shader reads the particle's LIVE position (and velocity) from the GPGPU
 * state textures at its own grid texel (`aRef`), billboards the quad toward the
 * camera at a perspective-scaled device-pixel size (with per-particle size
 * variance from a hash of aRef = the reference's ref.z), and the fragment paints
 * a soft round additive sprite colored violet→cyan by RAW speed, matching
 * particleDissolve.html's points material formula-for-formula.
 *
 * Geometry contract (set by HeroLogo): an InstancedBufferGeometry whose vertex
 * `position` is the unit-quad corner (z=0, xy in [-0.5,0.5]) and whose per-
 * INSTANCE attribute `aRef` (vec2) is the state-texture UV for that particle.
 *
 * Selective-bloom contract: HDR color (>1.0) + toneMapped:false so the single
 * existing Bloom glows the dust; AdditiveBlending, depthWrite/Test off.
 *
 * GLSL twin of gpgpuRenderNode.ts (TSL, flag-ON). Imports only `three` core.
 */
import * as THREE from "three";
import type { GpgpuConfig } from "./gpgpuConfig";

const vertexShader = /* glsl */ `
  attribute vec2 aRef;             // this particle's texel in the state grid

  uniform sampler2D uPosTex;       // live positions (model space)
  uniform sampler2D uVelTex;       // live velocities
  uniform float uPointSize;        // base sprite size (device px)
  uniform float uPixelRatio;
  uniform vec2 uViewport;          // framebuffer size in DEVICE pixels

  varying vec2 vQuadUv;
  varying float vSpeed;            // RAW velocity magnitude → color (ref uses raw)
  varying float vRand;             // per-particle random → size + color variance

  // Per-instance pseudo-random in [0,1], the GLSL stand-in for the reference's
  // ref.z (a Math.random() stored per particle). aRef is the grid UV and is
  // unique per particle, so hashing it gives the same stable per-point variance
  // without touching the (vec2) aRef attribute the integration shell sets.
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vQuadUv = position.xy;
    vRand = hash21(aRef);

    vec3 p = texture2D(uPosTex, aRef).xyz;
    vec3 v = texture2D(uVelTex, aRef).xyz;
    // Reference uses the RAW speed (length of velocity), NOT normalized to
    // uMaxSpeed — the color/intensity terms below expect raw magnitude.
    vSpeed = length(v);

    // Particle center → view space (dist = -mv.z), then billboard the unit-quad
    // corner in clip space (same math as particleSpriteShader): a device-pixel
    // offset → clip is (px / uViewport * 2.0 * clip.w).
    // Reference size: uSize * uPR * (0.6 + 0.8*ref.z) / max(-mv.z, 0.001).
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    float size = uPointSize * uPixelRatio * (0.6 + 0.8 * vRand) / max(-mv.z, 0.001);
    clip.xy += position.xy * size / uViewport * 2.0 * clip.w;
    gl_Position = clip;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColCold;           // violet (slow / at-rest)
  uniform vec3 uColHot;            // cyan (fast / hovered-lift)
  uniform float uFade;             // scroll-handoff fade for the whole field
  uniform float uEmissive;         // HDR multiplier (keeps fast motes >1 for Bloom)
  uniform float uPointAlpha;       // disc-center alpha — high so sprites overlap

  varying vec2 vQuadUv;
  varying float vSpeed;
  varying float vRand;

  void main() {
    // Soft round disc. Widened the soft falloff (smoothstep 0.5→0.12, was 0.05)
    // so each sprite has a broad feathered core; with the larger POINT_SIZE the
    // neighbouring discs OVERLAP into one continuous velvety skin rather than
    // reading as separate dots (DDD's particles visually touch).
    float r = length(vQuadUv);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.12, r);

    // Color: violet→cyan by RAW speed. At rest vSpeed≈0 → pure violet (the solid
    // purple skin); only hovered/lifted particles gain speed → bright cyan glow.
    //   t = clamp(vSpeed*0.6, 0, 1); col = mix(uCold, uHot, t);
    //   col *= (1 + vSpeed*0.35);  col *= (0.7 + 0.5*vRand);
    float t = clamp(vSpeed * 0.6, 0.0, 1.0);
    vec3 col = mix(uColCold, uColHot, t);
    col *= (1.0 + vSpeed * 0.35);             // fast (cyan) motes glow hotter
    col *= (0.7 + 0.5 * vRand);               // per-point variance
    // Selective-bloom HDR contract: uEmissive lifts the resting violet across
    // the Bloom threshold (soft glow) and the fast cyan motes well past it.
    col *= uEmissive;

    // uPointAlpha (default 0.85, was a flat 0.55) so the dense field paints a
    // solid skin; modulated by the scroll-handoff fade.
    float alpha = a * uPointAlpha * uFade;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export type GpgpuRenderUniforms = {
  uPosTex: { value: THREE.Texture | null };
  uVelTex: { value: THREE.Texture | null };
  uPointSize: { value: number };
  uPixelRatio: { value: number };
  uViewport: { value: THREE.Vector2 };
  uColCold: { value: THREE.Color };
  uColHot: { value: THREE.Color };
  uFade: { value: number };
  uEmissive: { value: number };
  uPointAlpha: { value: number };
};

/**
 * HDR multiplier that keeps the selective-bloom contract while controlling the
 * at-rest glow. The reference's brightest (fast, cyan) motes already exceed 1.0
 * via ×(1+vSpeed*0.35); EMISSIVE additionally pushes the SLOW resting violet
 * (~0.4 base) across the cinematic Bloom threshold (~1.0) so the recomposed mark
 * reads as a softly-glowing centerpiece rather than near-black. Initialised from
 * config.EMISSIVE (single source of truth, default ~3.0) and driven live each
 * frame from fxStore.gpgpuEmissive by HeroLogo.
 */

export function createGpgpuRenderMaterial(
  config: GpgpuConfig,
): THREE.ShaderMaterial & { uniforms: GpgpuRenderUniforms } {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uPosTex: { value: null },
      uVelTex: { value: null },
      uPointSize: { value: config.POINT_SIZE },
      uPixelRatio: { value: 1 },
      uViewport: { value: new THREE.Vector2(1, 1) },
      uColCold: { value: new THREE.Color().fromArray(config.COL_COLD) },
      uColHot: { value: new THREE.Color().fromArray(config.COL_HOT) },
      uFade: { value: 1 },
      uEmissive: { value: config.EMISSIVE },
      uPointAlpha: { value: config.POINT_ALPHA },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  return material as THREE.ShaderMaterial & { uniforms: GpgpuRenderUniforms };
}

// ===========================================================================
// SHIPPING hero render — STATIC billboard + ANALYTIC dispersion (GLSL / flag-OFF)
// ===========================================================================
// Renders each instance at its HOME position read straight from a per-instance
// `aHome` vec3 attribute (no texture reads, no sim — robust on both backends),
// then ANALYTICALLY displaces the center near the cursor: particles within
// uRadius of the model-space mouse lift outward + toward the camera and shift
// violet→CYAN (glowing), gated by the eased uHover; they settle back smoothly
// when the cursor leaves. Same perspective-scaled device-pixel billboard math
// as the live material above. GLSL twin of createStaticParticleNodeBuild (TSL /
// flag-ON) — kept in lockstep, same displacement + color math.

const staticVertexShader = /* glsl */ `
  attribute vec3 aHome;            // this particle's HOME position (model space)
  attribute vec2 aRef;             // its grid UV (only hashed for size variance)

  uniform float uPointSize;        // base sprite size (device px)
  uniform float uPixelRatio;
  uniform vec2 uViewport;          // framebuffer size in DEVICE pixels
  uniform vec3 uMouse;             // model-space cursor (far when not hovering)
  uniform float uHover;            // eased global hover 0..1 (gates the lift)
  uniform float uTime;             // animation clock (shimmer on lifted points)
  uniform float uRadius;           // push radius in model space
  uniform float uPush;             // push strength

  varying vec2 vQuadUv;
  varying float vRand;             // per-particle random → size + color variance
  varying float vLift;             // per-particle displacement amount → color

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vQuadUv = position.xy;
    vRand = hash21(aRef);

    // ANALYTIC dispersion — displace the home center near the cursor.
    //   fromMouse = aHome - uMouse; d = length(fromMouse);
    //   falloff   = smoothstep(uRadius, 0.0, d);  // 1 at cursor, 0 at/after radius
    //   lift      = falloff * uHover;             // gated by the eased global hover
    vec3 fromMouse = aHome - uMouse;
    float d = length(fromMouse);
    float falloff = smoothstep(uRadius, 0.0, d);
    float lift = falloff * uHover;
    vLift = lift;

    vec3 dir = normalize(fromMouse + 1e-5);
    vec3 center = aHome
      + dir * (lift * uPush)                  // push outward in-plane
      + vec3(0.0, 0.0, lift * uPush * 0.5);   // + a little toward the camera
    // Subtle shimmer on LIFTED particles only (resting skin stays crisp).
    center += vec3(
      sin(aHome.y * 6.0 + uTime * 1.3),
      sin(aHome.z * 6.0 + uTime * 1.7),
      sin(aHome.x * 6.0 + uTime * 1.1)
    ) * (lift * 0.04);

    // SAME billboard math as the live material, around the displaced center.
    vec4 mv = modelViewMatrix * vec4(center, 1.0);
    vec4 clip = projectionMatrix * mv;
    float size = uPointSize * uPixelRatio * (0.6 + 0.8 * vRand) / max(-mv.z, 0.001);
    clip.xy += position.xy * size / uViewport * 2.0 * clip.w;
    gl_Position = clip;
  }
`;

const staticFragmentShader = /* glsl */ `
  uniform vec3 uColCold;           // violet (at rest)
  uniform vec3 uColHot;            // cyan (lifted / hovered)
  uniform float uFade;
  uniform float uEmissive;
  uniform float uPointAlpha;

  varying vec2 vQuadUv;
  varying float vRand;
  varying float vLift;

  void main() {
    float r = length(vQuadUv);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.12, r);

    // Color: violet→cyan by lift (like the GPGPU render did by speed). At rest
    // lift≈0 → pure violet skin; lifted/hovered particles glow toward cyan.
    //   t = clamp(lift*1.2, 0, 1); col = mix(cold, hot, t);
    //   col *= (1 + lift*0.8); col *= (0.7 + 0.5*rand); col *= uEmissive;
    float t = clamp(vLift * 1.2, 0.0, 1.0);
    vec3 col = mix(uColCold, uColHot, t);
    col *= (1.0 + vLift * 0.8);
    col *= (0.7 + 0.5 * vRand);
    col *= uEmissive;

    float alpha = a * uPointAlpha * uFade;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export type GpgpuStaticUniforms = {
  uPointSize: { value: number };
  uPixelRatio: { value: number };
  uViewport: { value: THREE.Vector2 };
  uColCold: { value: THREE.Color };
  uColHot: { value: THREE.Color };
  uFade: { value: number };
  uEmissive: { value: number };
  uPointAlpha: { value: number };
  uMouse: { value: THREE.Vector3 };
  uHover: { value: number };
  uTime: { value: number };
  uRadius: { value: number };
  uPush: { value: number };
};

export interface GpgpuStaticBuild {
  geometry: THREE.InstancedBufferGeometry;
  material: THREE.ShaderMaterial & { uniforms: GpgpuStaticUniforms };
  uniforms: GpgpuStaticUniforms;
  dispose: () => void;
}

/**
 * Build the SHIPPING hero render (static billboard + analytic dispersion, GLSL
 * / flag-OFF). `homeRGBA` is the RGBA-float home field (xyz used, w stripped);
 * `aRef` the row-major grid UVs.
 */
export function createGpgpuStaticBuild(
  config: GpgpuConfig,
  homeRGBA: Float32Array,
  aRef: Float32Array,
  count: number,
): GpgpuStaticBuild {
  // aHome = vec3 per particle, SAME row-major order as aRef (strip the w).
  const aHome = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    aHome[i * 3] = homeRGBA[i * 4];
    aHome[i * 3 + 1] = homeRGBA[i * 4 + 1];
    aHome[i * 3 + 2] = homeRGBA[i * 4 + 2];
  }

  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]),
      3,
    ),
  );
  geometry.setIndex(
    new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1),
  );
  geometry.setAttribute("aRef", new THREE.InstancedBufferAttribute(aRef, 2));
  geometry.setAttribute("aHome", new THREE.InstancedBufferAttribute(aHome, 3));
  geometry.instanceCount = count;

  const material = new THREE.ShaderMaterial({
    vertexShader: staticVertexShader,
    fragmentShader: staticFragmentShader,
    uniforms: {
      uPointSize: { value: config.POINT_SIZE },
      uPixelRatio: { value: 1 },
      uViewport: { value: new THREE.Vector2(1, 1) },
      uColCold: { value: new THREE.Color().fromArray(config.COL_COLD) },
      uColHot: { value: new THREE.Color().fromArray(config.COL_HOT) },
      uFade: { value: 1 },
      uEmissive: { value: config.EMISSIVE },
      uPointAlpha: { value: config.POINT_ALPHA },
      // Far value at rest → falloff resolves to 0 (no displacement). HeroLogo
      // feeds the real model-space cursor + eased hover while hovering.
      uMouse: { value: new THREE.Vector3(1e5, 1e5, 1e5) },
      uHover: { value: 0 },
      uTime: { value: 0 },
      uRadius: { value: config.RADIUS },
      uPush: { value: config.PUSH },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
  }) as THREE.ShaderMaterial & { uniforms: GpgpuStaticUniforms };

  return {
    geometry,
    material,
    uniforms: material.uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
