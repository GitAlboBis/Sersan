/**
 * Drift-particle material — instanced-billboard GLSL ShaderMaterial (WebGL2 /
 * flag-OFF path).
 *
 * WHY NOT THREE.Points anymore: a true WebGPU backend hard-caps `gl_PointSize`
 * (and `PointsNodeMaterial.sizeNode`) to 1px — a documented WebGPU primitive
 * limitation — so the old THREE.Points starfield rendered as invisible 1px
 * specks under the ON flag. The fix (see DriftParticles.tsx) is to draw the
 * dust as an InstancedMesh of a unit quad, billboarded toward the camera in the
 * vertex stage with a per-instance screen size, so the particles have REAL
 * on-screen size on both backends. This GLSL material is the flag-OFF build;
 * `particleNodeMaterial.ts` is the TSL twin for the ON/WebGPU build.
 *
 * Parity with the OLD THREE.Points look (particleShader.ts) — reproduced exactly:
 *   - per-instance wander  p += sin/cos(uTime, aSeed) * (0.45, 0.35)
 *   - screen size in DEVICE px  = aScale * uPixelRatio * 38.0 / max(dist, 0.1)
 *     (the OLD gl_PointSize), applied here as a clip-space corner offset so the
 *     billboard subtends that same pixel diameter regardless of backend.
 *   - soft round disc  circle = smoothstep(0.5, 0.12, length(quadUv))
 *     (quadUv = the unit-quad corner in [-0.5,0.5], identical range to the old
 *      gl_PointCoord-0.5).
 *   - depth fade  vFade = smoothstep(26.0, 6.0, dist)
 *   - two-color blend  col = mix(uColorA, uColorB, fract(aSeed + uProgress*0.25))
 *   - alpha = circle * vFade * uOpacity, early-discard < 0.004; additive,
 *     depthWrite/depthTest off.
 *
 * Inline GLSL on purpose: Turbopack has no .glsl loader configured.
 *
 * Geometry contract (set by DriftParticles.tsx): an InstancedBufferGeometry
 * whose vertex `position` is the unit-quad corner (z = 0, xy in [-0.5,0.5]) and
 * whose per-INSTANCE attributes are `aOffset` (vec3 spawn position), `aSeed`
 * (float) and `aScale` (float).
 */
import * as THREE from "three";

const vertexShader = /* glsl */ `
  // Per-instance attributes (one value per dust mote).
  attribute vec3 aOffset;
  attribute float aSeed;
  attribute float aScale;

  uniform float uTime;
  uniform float uPixelRatio;
  // Framebuffer size in DEVICE pixels (size * dpr). NDC spans 2 units across
  // this many pixels, so it converts the device-pixel sprite size to a
  // clip-space corner offset.
  uniform vec2 uViewport;

  varying vec2 vQuadUv;
  varying float vSeed;
  varying float vFade;

  void main() {
    vSeed = aSeed;
    // The unit-quad corner in [-0.5, 0.5] — same span as the old
    // gl_PointCoord-0.5, so the disc math in the fragment is unchanged.
    vQuadUv = position.xy;

    // Per-instance spawn position + slow wander, desynced by seed
    // (identical to the old THREE.Points vertex shader).
    vec3 p = aOffset;
    p.x += sin(uTime * 0.08 + aSeed * 43.7) * 0.45;
    p.y += cos(uTime * 0.06 + aSeed * 61.3) * 0.35;

    // The PARTICLE CENTER in view space (instance position only — the quad
    // corner is added later, in clip space, as a billboard offset).
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;

    // Depth fade: distant dust dissolves into the navy (unchanged).
    vFade = smoothstep(26.0, 6.0, dist);

    // Billboard: take the center to clip space, then offset the corner in the
    // clip-space XY plane so the quad always faces the camera. The offset
    // magnitude in DEVICE pixels equals the OLD gl_PointSize
    //   = aScale * uPixelRatio * 38.0 / max(dist, 0.1).
    // A device-pixel offset → clip space is (px / uViewport * 2.0 * clip.w),
    // because NDC [-1,1] (2 units) maps across uViewport device pixels and
    // clip.xy is later divided by clip.w. gl_PointSize is the full diameter and
    // the corner is in [-0.5,0.5], so corner * size gives the right half-extent.
    vec4 clip = projectionMatrix * mv;
    float size = aScale * uPixelRatio * 38.0 / max(dist, 0.1);
    clip.xy += position.xy * size / uViewport * 2.0 * clip.w;

    gl_Position = clip;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uProgress;
  uniform float uOpacity;

  varying vec2 vQuadUv;
  varying float vSeed;
  varying float vFade;

  void main() {
    // Soft round sprite — identical to the old gl_PointCoord disc.
    float circle = smoothstep(0.5, 0.12, length(vQuadUv));

    // Hue drifts with scroll so the field stays tied to the signature line.
    vec3 col = mix(uColorA, uColorB, fract(vSeed + uProgress * 0.25));

    float alpha = circle * vFade * uOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export type ParticleUniforms = {
  uTime: { value: number };
  uProgress: { value: number };
  uPixelRatio: { value: number };
  uViewport: { value: THREE.Vector2 };
  uColorA: { value: THREE.Color };
  uColorB: { value: THREE.Color };
  uOpacity: { value: number };
};

export function createParticleMaterial(): THREE.ShaderMaterial & {
  uniforms: ParticleUniforms;
} {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPixelRatio: { value: 1 },
      uViewport: { value: new THREE.Vector2(1, 1) },
      uColorA: { value: new THREE.Color("#3BE1FF") },
      uColorB: { value: new THREE.Color("#2A7FFF") }, // name kept; value now blue (was violet #7C5CFF)
      uOpacity: { value: 0.35 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    // Billboard winding can flip in clip space depending on camera; render both
    // sides so a mote is never culled (the old THREE.Points had no face culling).
    side: THREE.DoubleSide,
  });
  return material as THREE.ShaderMaterial & { uniforms: ParticleUniforms };
}
