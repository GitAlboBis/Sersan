/**
 * Deep-space particle field behind every 3D beat: thousands of soft points
 * in a shell around the origin, white → cyan, twinkling on a deterministic
 * clock. Star size is screen-space (distant stars do not shrink with
 * perspective). `drift` yaws the whole field for a camera-parallax feel.
 */
import { useMemo } from "react";
import * as THREE from "three";
import { rng, onSphere } from "./rng";

const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uScale;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.6 + 0.4 * sin(uTime * (0.6 + aSeed * 1.9) + aSeed * 43.0);
    vAlpha = tw;
    vColor = aColor;
    gl_PointSize = aSize * uScale * (0.75 + 0.25 * tw);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = pow(smoothstep(1.0, 0.0, d), 2.2);
    gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
  }
`;

export const Starfield: React.FC<{
  time: number;
  count?: number;
  inner?: number;
  outer?: number;
  opacity?: number;
  seed?: number;
  viewportHeight: number;
  /** radians of slow yaw applied to the field */
  drift?: number;
  sizeMul?: number;
}> = ({ time, count = 3200, inner = 6, outer = 40, opacity = 1, seed = 3, viewportHeight, drift = 0, sizeMul = 1 }) => {
  const geometry = useMemo(() => {
    const r = rng(seed);
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const white = new THREE.Color("#F4F6FA");
    const cyan = new THREE.Color("#3BE1FF");
    const blue = new THREE.Color("#2A7FFF");
    const tmp = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const [x, y, z] = onSphere(r);
      const rad = inner + (outer - inner) * Math.pow(r(), 0.6);
      pos[i * 3] = x * rad;
      pos[i * 3 + 1] = y * rad * 0.75;
      pos[i * 3 + 2] = z * rad;
      // px at 1080p: mostly 1.2–2.5, a few up to ~4.5
      sizes[i] = 1.2 + r() * r() * 3.3;
      seeds[i] = r();
      const k = r();
      tmp.copy(white).lerp(k < 0.7 ? cyan : blue, r() * 0.7);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [count, inner, outer, seed]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uScale: { value: 1 }, uOpacity: { value: 1 } }), []);

  return (
    <points geometry={geometry} rotation={[0, drift, 0]} frustumCulled={false}>
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        uniforms-uTime-value={time}
        uniforms-uScale-value={(viewportHeight / 1080) * sizeMul}
        uniforms-uOpacity-value={opacity}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};