/**
 * Drift-particle shader — all motion lives in the vertex shader (the old
 * Canvas2D NeuralNetLayer burned CPU on O(n²) link checks per frame; this
 * costs the GPU a few thousand vertices and the CPU nothing).
 *
 * Inline GLSL on purpose: Turbopack has no .glsl loader configured.
 */
import * as THREE from "three";

const vertexShader = /* glsl */ `
  attribute float aSeed;
  attribute float aScale;

  uniform float uTime;
  uniform float uPixelRatio;

  varying float vSeed;
  varying float vFade;

  void main() {
    vSeed = aSeed;

    vec3 p = position;
    // Slow per-point wander, desynced by seed.
    p.x += sin(uTime * 0.08 + aSeed * 43.7) * 0.45;
    p.y += cos(uTime * 0.06 + aSeed * 61.3) * 0.35;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;

    gl_PointSize = aScale * uPixelRatio * 38.0 / max(dist, 0.1);
    // Depth fade: distant dust dissolves into the navy.
    vFade = smoothstep(26.0, 6.0, dist);

    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uProgress;
  uniform float uOpacity;

  varying float vSeed;
  varying float vFade;

  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float circle = smoothstep(0.5, 0.12, length(d));

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
      uColorA: { value: new THREE.Color("#3BE1FF") },
      uColorB: { value: new THREE.Color("#7C5CFF") },
      uOpacity: { value: 0.35 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  return material as THREE.ShaderMaterial & { uniforms: ParticleUniforms };
}
