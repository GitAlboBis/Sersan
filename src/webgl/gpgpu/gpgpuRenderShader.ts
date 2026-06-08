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
  uniform vec3 uColCold;           // violet (slow)
  uniform vec3 uColHot;            // cyan (fast)
  uniform float uFade;             // scroll-handoff fade for the whole field
  uniform float uEmissive;         // HDR multiplier (keeps fast motes >1 for Bloom)

  varying vec2 vQuadUv;
  varying float vSpeed;
  varying float vRand;

  void main() {
    // Soft round disc (radial alpha). Reference: a = smoothstep(0.5, 0.05, r),
    // discard r > 0.5 (here r = length(vQuadUv), the unit-quad center distance).
    float r = length(vQuadUv);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.05, r);

    // Reference color relationship (violet→cyan by RAW speed):
    //   t = clamp(vSpeed*0.6, 0, 1); col = mix(uCold, uHot, t);
    //   col *= (1 + vSpeed*0.35);  col *= (0.7 + 0.5*vRand);
    float t = clamp(vSpeed * 0.6, 0.0, 1.0);
    vec3 col = mix(uColCold, uColHot, t);
    col *= (1.0 + vSpeed * 0.35);             // fast motes glow hotter
    col *= (0.7 + 0.5 * vRand);               // per-point variance
    // Keep the selective-bloom HDR contract: uEmissive pushes the bright/fast
    // particles past the Bloom threshold (~1.0). Folded INTO the reference
    // relationship (default 1.0) rather than dropping the brightness.
    col *= uEmissive;

    // Reference alpha = a * 0.55, modulated by the scroll-handoff fade.
    float alpha = a * 0.55 * uFade;
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
