/**
 * Signature-line shader material.
 *
 * GLSL lives in inline template literals on purpose — Next 16 builds with
 * Turbopack and no .glsl loader is configured; inline strings sidestep the
 * whole loader question (signature-line spec §7.5).
 *
 * The material is intentionally unlit + additive: color values are pushed
 * above 1.0 via uEmissive with toneMapped output left untouched, so a
 * luminance-threshold Bloom (threshold = 1.0) picks out ONLY this line —
 * selective bloom without a Selection pass (spec §4, approach A).
 */
import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewNormal;

  void main() {
    vUv = uv;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewNormal;

  uniform float uProgress;
  uniform float uTime;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorHot;
  uniform float uGlowFalloff;
  uniform float uHeadSharp;
  uniform float uEmissive;
  uniform float uFlowSpeed;
  uniform float uReveal;

  void main() {
    // three.js TubeGeometry maps uv.x ALONG the tube (0 = start, 1 = end)
    // and uv.y around the circumference.
    float along = vUv.x;

    // Draw mask: lit up to uProgress. fwidth keeps the head edge crisp and
    // resolution-independent (screen-space AA, no shimmer).
    float aa = fwidth(along) + 0.0005;
    float drawn = 1.0 - smoothstep(uProgress - aa, uProgress + aa, along);

    // Bright "signal head" band right behind the leading edge.
    float head = smoothstep(uProgress - uHeadSharp, uProgress, along) * drawn;

    // Animated cyan -> violet gradient flowing along the tube. Sine keeps
    // the wrap seamless (no fract() seam).
    float t = 0.5 + 0.5 * sin(6.28318 * (along * 1.5 - uTime * uFlowSpeed));
    vec3 grad = mix(uColorA, uColorB, t);

    // View-dependent core: bright where the tube faces the camera, soft at
    // the silhouette — reads as a glowing filament without geometry cost.
    float facing = abs(vViewNormal.z);
    float core = pow(facing, uGlowFalloff);

    vec3 col = mix(grad, uColorHot, head * 0.85) * uEmissive;
    float alpha = drawn * core * uReveal;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export type LineUniforms = {
  uProgress: { value: number };
  uTime: { value: number };
  uColorA: { value: THREE.Color };
  uColorB: { value: THREE.Color };
  uColorHot: { value: THREE.Color };
  uGlowFalloff: { value: number };
  uHeadSharp: { value: number };
  uEmissive: { value: number };
  uFlowSpeed: { value: number };
  uReveal: { value: number };
};

export function createLineMaterial(): THREE.ShaderMaterial & {
  uniforms: LineUniforms;
} {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color("#3BE1FF") },
      uColorB: { value: new THREE.Color("#7C5CFF") },
      uColorHot: { value: new THREE.Color("#EAF6FF") },
      uGlowFalloff: { value: 2.0 },
      uHeadSharp: { value: 0.045 },
      uEmissive: { value: 2.6 },
      uFlowSpeed: { value: 0.05 },
      uReveal: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  return material as THREE.ShaderMaterial & { uniforms: LineUniforms };
}
