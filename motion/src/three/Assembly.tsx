/**
 * ASSEMBLY — fragments flying in from everywhere and locking into one structure.
 *
 * The scaffold is an orthogonal lattice on a coarse grid: every member is one
 * module long, axis-aligned, and stops short of its node so the joints read as
 * joints. It is deliberately NOT filled — the outer cage is dense, the ribs are
 * thinned by a parity rule, and a clear tube is kept around x = y = 0 because
 * the camera flies straight down it. (Keeping the inner members and shrinking
 * the cage instead just put beams through the lens every other frame.)
 *
 * Two layers share one `assemble`: the beams themselves, and a hairline that
 * writes itself down the core of each beam once that beam has docked. Both read
 * the same instanced attribute buffers and the same GLSL pose function, so they
 * cannot drift apart. Everything is a pure function of props.
 */
import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { rng, onSphere } from "./rng";

type GroupProps = ThreeElements["group"];

/**
 * Shared preamble: instance attributes plus the pose maths, concatenated into
 * both vertex shaders — the beam and its hairline MUST solve the same flight
 * path, and hand-duplicating it is how they end up 3px apart on landing.
 */
const POSE = /* glsl */ `
  attribute vec3 aHome;
  attribute vec3 aAway;
  attribute vec3 aSize;   // (thin, thin, length) — every beam is modelled along local Z
  attribute vec4 aTumble; // xyz = tumble axis (unit), w = which world axis it runs along
  attribute vec4 aPhase;  // x = spin, y = delay, z = arc, w = seed
  uniform float uAssemble;
  uniform float uTime;

  const float PI = 3.14159265;
  const float W = 0.34;   // length of one beam's flight, in assemble units

  // Local Z is the long axis; swizzling (not rotating) onto X or Y keeps the
  // landed pose EXACTLY axis-aligned — a quaternion slerp leaves a fraction of
  // a degree of skew and the cage stops reading as engineered.
  vec3 orient(vec3 v, float ax) {
    if (ax < 0.5) return vec3(v.z, v.y, v.x);
    if (ax < 1.5) return vec3(v.x, v.z, v.y);
    return v;
  }
  vec3 rodrigues(vec3 v, vec3 ax, float a) {
    float c = cos(a), s = sin(a);
    return v * c + cross(ax, v) * s + ax * dot(ax, v) * (1.0 - c);
  }
  float startedAt() { return aPhase.y * (1.0 - W); }   // staggered, but everything is home by assemble = 1
  float landAge()   { return max(0.0, uAssemble - startedAt() - W); }
  float progress() {
    float t = clamp((uAssemble - startedAt()) / W, 0.0, 1.0);
    return 1.0 - pow(1.0 - t, 3.0);                     // ease-out: fast approach, soft dock
  }
  vec3 posed(vec3 local, float k) {
    vec3 body = rodrigues(orient(local * aSize, aTumble.w), aTumble.xyz, aPhase.x * (1.0 - k));
    vec3 c = mix(aAway, aHome, k);
    c += aTumble.xyz * sin(k * PI) * aPhase.z;          // a slight arc; dead-straight approaches look CG
    c += aTumble.xyz * sin(uTime * 1.7 + aPhase.w * 40.0) * 0.3 * (1.0 - k) * (1.0 - k);
    return body + c;                                     // drift squared → nothing moves once docked
  }
`;

const STRUT_VERT = /* glsl */ `
  varying vec2 vCross;
  varying float vK;
  varying float vFlash;
  void main() {
    float k = progress();
    vCross = position.xy * 2.0;   // transverse coords in [-1,1], taken BEFORE the swizzle
    vK = k;
    // Peaks the instant the beam docks, then decays in assemble units — there is
    // no reliable dt here and the caller may ease the assemble curve. The last
    // factor wipes the residual so a held assemble = 1 is genuinely still.
    vFlash = smoothstep(0.80, 1.0, k) * exp(-landAge() * 26.0) * (1.0 - smoothstep(0.94, 1.0, uAssemble));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(posed(position, k), 1.0);
  }
`;

const STRUT_FRAG = /* glsl */ `
  uniform vec3 uBody;
  uniform vec3 uEdge;
  uniform vec3 uHot;
  uniform float uOpacity;
  varying vec2 vCross;
  varying float vK;
  varying float vFlash;
  void main() {
    float e = min(abs(vCross.x), abs(vCross.y));  // 1 on the four long arrises, 0 down a face centre
    float edge = smoothstep(0.42, 1.0, e);
    float lit = 0.22 + 0.78 * vK;                 // in flight a fragment is nearly dark matter
    vec3 col = uBody * (0.6 + 0.7 * vK) + uEdge * edge * lit * 0.75 + uHot * vFlash * (0.55 + edge);
    col.r = min(col.r, col.g);                    // hard stop: no additive stack may drift warm
    gl_FragColor = vec4(col, clamp(uOpacity * (0.14 + 0.6 * edge * lit + vFlash), 0.0, 1.0));
  }
`;

const LINE_VERT = /* glsl */ `
  varying float vT;
  varying float vFront;
  varying float vFlash;
  void main() {
    float k = progress();
    vT = position.z + 0.5;                        // 0..1 along the beam
    vFront = clamp(landAge() / 0.07, 0.0, 1.0);   // the filament writes itself in after the dock
    vFlash = smoothstep(0.80, 1.0, k) * exp(-landAge() * 26.0) * (1.0 - smoothstep(0.94, 1.0, uAssemble));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(posed(position, k), 1.0);
  }
`;

const LINE_FRAG = /* glsl */ `
  uniform vec3 uEdge;
  uniform vec3 uHot;
  uniform float uOpacity;
  varying float vT;
  varying float vFront;
  varying float vFlash;
  void main() {
    // 1.15 overshoot so a finished line is solid end to end — a plain smoothstep
    // up to the front leaves the last few percent permanently dim.
    float a = clamp((vFront * 1.15 - vT) / 0.14, 0.0, 1.0);
    float head = smoothstep(0.09, 0.0, abs(vFront * 1.15 - vT)) * (1.0 - step(0.999, vFront));
    // The filament always sits a quarter of the way to white: at one pixel wide
    // pure cyan reads grey-blue on a 1080p downscale, and this is the brightest
    // line in the shot.
    vec3 col = mix(uEdge, uHot, clamp(0.25 + vFlash + head, 0.0, 1.0));
    col.r = min(col.r, col.g);
    gl_FragColor = vec4(col, a * uOpacity * (0.55 + 0.45 * vFlash + head * 0.6));
  }
`;

export const Assembly: React.FC<
  GroupProps & {
    time: number;
    assemble: number;
    opacity?: number;
    seed?: number;
    size?: number;
    count?: number;
  }
> = ({
  time,
  assemble,
  opacity = 1,
  seed = 7,
  size = 22,
  count = 150,
  ...group
}) => {
  // Structural only — never keyed on time or assemble. Both geometries share one
  // set of attribute buffers: cheaper, and a guarantee the layers stay in step.
  const { geometry, lineGeometry } = useMemo(() => {
    const r = rng(seed);
    const m = size / 4; // grid module: coords -2..2, so the cage spans `size`
    const half = (m * 0.92) / 2; // members stop 8% short of the node
    const clearance = m * 0.62; // the camera owns the tube around x = y = 0
    const homes: number[][] = [];
    const axes: number[] = [];
    const rings: number[] = [];

    for (let axis = 0; axis < 3; axis++) {
      for (let a = -2; a <= 2; a++) {
        for (let b = -2; b <= 2; b++) {
          for (let n = 0; n < 4; n++) {
            const along = (-2 + n + 0.5) * m;
            const p =
              axis === 0
                ? [along, a * m, b * m]
                : axis === 1
                  ? [a * m, along, b * m]
                  : [a * m, b * m, along];
            const ring = Math.max(Math.abs(p[0]), Math.abs(p[1])) / m;
            const roll = r(); // consumed per candidate, so rejections never shift the sequence
            const keep =
              ring >= 1.9
                ? roll > 0.16 // outer cage, with a few members missing on purpose
                : ring >= 0.9
                  ? ((n + a + b) & 1) === 0 && roll > 0.28 // parity thins the ribs into a repeating module
                  : roll > 0.72;
            if (!keep) continue;
            const dx =
              axis === 0 ? Math.max(0, Math.abs(p[0]) - half) : Math.abs(p[0]);
            const dy =
              axis === 1 ? Math.max(0, Math.abs(p[1]) - half) : Math.abs(p[1]);
            if (Math.hypot(dx, dy) < clearance) continue;
            homes.push(p);
            axes.push(axis);
            rings.push(ring);
          }
        }
      }
    }
    // Seeded shuffle before the cap, so trimming to `count` thins the lattice
    // evenly instead of lopping off whichever side got generated last.
    for (let i = homes.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [homes[i], homes[j]] = [homes[j], homes[i]];
      [axes[i], axes[j]] = [axes[j], axes[i]];
      [rings[i], rings[j]] = [rings[j], rings[i]];
    }
    const n = Math.min(count, homes.length);

    const aHome = new Float32Array(n * 3);
    const aAway = new Float32Array(n * 3);
    const aSize = new Float32Array(n * 3);
    const aTumble = new Float32Array(n * 4);
    const aPhase = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      aHome.set(homes[i], i * 3);
      const dir = onSphere(r);
      const d = size * (1.5 + 1.5 * r());
      aAway.set([dir[0] * d, dir[1] * d, dir[2] * d], i * 3);
      aSize.set([m * 0.055, m * 0.055, m * 0.92], i * 3);
      const t = onSphere(r);
      aTumble.set([t[0], t[1], t[2], axes[i]], i * 4);
      // Outer cage first, ribs after: the silhouette declares itself, then fills.
      const order = rings[i] >= 1.9 ? 0 : rings[i] >= 0.9 ? 0.42 : 0.72;
      aPhase.set(
        [
          (r() * 2 - 1) * 5,
          Math.min(0.85, order * 0.75 + r() * 0.32),
          (r() * 2 - 1) * m * 0.6,
          r(),
        ],
        i * 4,
      );
    }

    const attrs = {
      aHome: new THREE.InstancedBufferAttribute(aHome, 3),
      aAway: new THREE.InstancedBufferAttribute(aAway, 3),
      aSize: new THREE.InstancedBufferAttribute(aSize, 3),
      aTumble: new THREE.InstancedBufferAttribute(aTumble, 4),
      aPhase: new THREE.InstancedBufferAttribute(aPhase, 4),
    };
    const sphere = new THREE.Sphere(new THREE.Vector3(), size * 3.2); // must contain the away poses

    const box = new THREE.BoxGeometry(1, 1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = box.index;
    g.setAttribute("position", box.attributes.position);
    const lg = new THREE.InstancedBufferGeometry();
    lg.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([0, 0, -0.5, 0, 0, 0.5]), 3),
    );
    for (const target of [g, lg]) {
      for (const [key, value] of Object.entries(attrs))
        target.setAttribute(key, value);
      target.instanceCount = n;
      target.boundingSphere = sphere;
    }
    return { geometry: g, lineGeometry: lg };
  }, [count, seed, size]);

  const strutUniforms = useMemo(
    () => ({
      uAssemble: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uBody: { value: new THREE.Color("#0d1a2e") },
      uEdge: { value: new THREE.Color("#3BE1FF") },
      uHot: { value: new THREE.Color("#EAF6FF") },
    }),
    [],
  );
  const lineUniforms = useMemo(
    () => ({
      uAssemble: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uEdge: { value: new THREE.Color("#3BE1FF") },
      uHot: { value: new THREE.Color("#EAF6FF") },
    }),
    [],
  );

  return (
    <group {...group}>
      <mesh geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={POSE + STRUT_VERT}
          fragmentShader={STRUT_FRAG}
          uniforms={strutUniforms}
          uniforms-uAssemble-value={assemble}
          uniforms-uTime-value={time}
          uniforms-uOpacity-value={opacity}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={lineGeometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={POSE + LINE_VERT}
          fragmentShader={LINE_FRAG}
          uniforms={lineUniforms}
          uniforms-uAssemble-value={assemble}
          uniforms-uTime-value={time}
          uniforms-uOpacity-value={opacity}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
};
