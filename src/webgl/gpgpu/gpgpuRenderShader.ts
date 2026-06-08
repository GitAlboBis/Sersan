/**
 * GPGPU dissolve render material — GLSL instanced-billboard (WebGL2 / flag-OFF).
 *
 * One INSTANCED unit quad per particle (NOT THREE.Points — a WebGPU backend
 * hard-clamps point size to 1px, see DriftParticles / particleNodeMaterial). The
 * vertex shader reads the particle's LIVE position (and velocity) from the GPGPU
 * state textures at its own grid texel (`aRef`), billboards the quad toward the
 * camera at a perspective-scaled device-pixel size, and the fragment paints a
 * soft round additive sprite colored violet→cyan by speed.
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
  uniform float uMaxSpeed;         // for velocity → [0,1] color mapping

  varying vec2 vQuadUv;
  varying float vSpeed;            // 0..1 normalized speed → color mix

  void main() {
    vQuadUv = position.xy;

    vec3 p = texture2D(uPosTex, aRef).xyz;
    vec3 v = texture2D(uVelTex, aRef).xyz;
    vSpeed = clamp(length(v) / max(uMaxSpeed, 1e-4), 0.0, 1.0);

    // Particle center → view space (dist = -mv.z), then billboard the unit-quad
    // corner in clip space (same math as particleSpriteShader): a device-pixel
    // offset → clip is (px / uViewport * 2.0 * clip.w).
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;
    vec4 clip = projectionMatrix * mv;
    float size = uPointSize * uPixelRatio / max(dist, 0.1);
    clip.xy += position.xy * size / uViewport * 2.0 * clip.w;
    gl_Position = clip;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColCold;           // violet (slow)
  uniform vec3 uColHot;            // cyan (fast)
  uniform float uFade;             // scroll-handoff fade for the whole field

  varying vec2 vQuadUv;
  varying float vSpeed;

  void main() {
    // Soft round disc (radial alpha) — discard outside the circle.
    float circle = smoothstep(0.5, 0.12, length(vQuadUv));
    if (circle < 0.02) discard;

    // Violet → cyan by velocity. HDR (>1.0) so selective bloom catches the dust;
    // dispersing (fast) motes glow hotter.
    vec3 col = mix(uColCold, uColHot, vSpeed);
    float intensity = 1.6 + 1.2 * vSpeed;

    float alpha = circle * uFade;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col * intensity, alpha);
  }
`;

export type GpgpuRenderUniforms = {
  uPosTex: { value: THREE.Texture | null };
  uVelTex: { value: THREE.Texture | null };
  uPointSize: { value: number };
  uPixelRatio: { value: number };
  uViewport: { value: THREE.Vector2 };
  uMaxSpeed: { value: number };
  uColCold: { value: THREE.Color };
  uColHot: { value: THREE.Color };
  uFade: { value: number };
};

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
      uMaxSpeed: { value: config.MAX_SPEED },
      uColCold: { value: new THREE.Color().fromArray(config.COL_COLD) },
      uColHot: { value: new THREE.Color().fromArray(config.COL_HOT) },
      uFade: { value: 1 },
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
