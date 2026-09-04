/**
 * TANGLE — the problem, made visible.
 *
 * A writhing knot of filaments the camera has to fly through. Light is trying
 * to get down each strand and keeps running into the knot: beads crawl, lurch,
 * and never quite arrive. Every strand is a seeded CatmullRom path swept into a
 * tube; all 26 tubes are merged into ONE geometry so the whole mess is a single
 * draw call, and every frame of animation happens in the shader from uniforms.
 *
 * The one hard constraint the composition has to respect: the camera passes
 * through the middle, so the control points are kept off the central axis. A
 * strand allowed to cross x=y=0 fills the lens with a smear of cyan for four
 * frames and reads as a bug, not as a knot.
 */
import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "./rng";

type GroupProps = ThreeElements["group"];

// 76 x 5 x 2 tris per strand x 26 strands ≈ 20k tris. Radial 5 is the floor at
// which a 0.022 tube still silhouettes as round rather than as a ribbon.
const TUBULAR = 76;
const RADIAL = 5;
const TUBE_R = 0.055; // 0.022 was a hairline: invisible from inside the knot, which is where the camera lives

const VERT = /* glsl */ `
  attribute float aAlong;
  attribute float aSeed;
  uniform float uTime;
  uniform float uChaos;
  uniform float uWrithe;
  varying float vAlong;
  varying float vSeed;
  varying float vFacing;
  varying float vDepth;
  void main() {
    vec3 p = position;
    // Whole-strand sway. Deliberately LOW spatial frequency (p.z * ~0.15) and
    // small amplitude: the strands must drift against each other, not swap
    // places. Because the field is smooth at the scale of the tube's cross
    // section, the baked normals stay valid — no normal recompute needed.
    float w = uWrithe * uChaos;
    p.x += w * sin(uTime * 0.62 + p.z * 0.16 + aSeed * 41.0);
    p.y += w * cos(uTime * 0.51 + p.z * 0.13 + aSeed * 27.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // Facing term = cord shading. Silhouette edges dim, centre bright, so an
    // additive tube reads as a round cable instead of a flat highlighted band.
    vFacing = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
    vDepth = -mv.z;
    vAlong = aAlong;
    vSeed = aSeed;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  #define TAU 6.2831853
  uniform float uTime;
  uniform float uChaos;
  uniform float uOpacity;
  uniform float uFar;
  uniform vec3 uBody;
  uniform vec3 uBead;
  uniform vec3 uHot;
  varying float vAlong;
  varying float vSeed;
  varying float vFacing;
  varying float vDepth;
  void main() {
    // Every strand runs its bead at its own rate — a shared rate turns the
    // knot into a metronome and the whole thing snaps into a pattern.
    float rate = 0.10 + fract(vSeed * 13.71) * 0.22;
    // The hesitation term is the point of the shot: the bead does not glide,
    // it stalls and lurches, as if the light kept meeting something.
    float hesitate = 0.05 * sin(uTime * 0.9 + vSeed * 33.0);
    float bead = pow(0.5 + 0.5 * cos((vAlong - uTime * rate - hesitate - vSeed) * TAU), 20.0);
    // A dimmer bead running the other way: signal bouncing back off the knot.
    float echo = pow(0.5 + 0.5 * cos((vAlong + uTime * rate * 0.42 + vSeed * 3.1) * TAU), 34.0) * 0.35;

    // Fade the cut ends. Tubes stop dead in mid-air otherwise, and inside the
    // knot the camera is close enough to see the open ring.
    float ends = smoothstep(0.0, 0.05, vAlong) * (1.0 - smoothstep(0.95, 1.0, vAlong));
    // Near fade stops a strand grazing the lens from smearing the frame; far
    // fade kills the sub-pixel shimmer of a 0.022 tube at 30+ units.
    float dist = smoothstep(0.5, 2.2, vDepth) * (1.0 - smoothstep(uFar * 0.55, uFar, vDepth));
    float cord = pow(clamp(vFacing, 0.0, 1.0), 1.4);

    float light = bead + echo;
    vec3 col = uBody + mix(uBead, uHot, bead * 0.75) * light * 2.2;
    // Additive stacking inside the knot is what would push this warm: dozens
    // of overlapping strands sum red faster than they sum green. Clamp it.
    col.r = min(col.r, col.g);
    gl_FragColor = vec4(col, (0.5 + 1.4 * light) * cord * ends * dist * uChaos * uOpacity);
  }
`;

export const Tangle: React.FC<
  GroupProps & {
    time: number;
    chaos?: number;
    count?: number;
    radius?: number;
    length?: number;
    opacity?: number;
    seed?: number;
  }
> = ({
  time,
  chaos = 1,
  count = 26,
  radius = 7,
  length = 36,
  opacity = 1,
  seed = 17,
  ...group
}) => {
  const geometry = useMemo(() => {
    const r = rng(seed);
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < count; i++) {
      const knots = 9 + Math.floor(r() * 4); // 9..12 control points: fewer reads as a swoop, more as noise
      const span = 1.06 + r() * 0.22; // each strand overshoots both ends by its own amount, so no shared cut plane
      const z0 = length * 0.5 * span + (r() - 0.5) * length * 0.1;
      const dz = (length * span) / (knots - 1);
      let ang = r() * Math.PI * 2;
      // Radius never goes below 0.34R — that is the clear tube the camera flies down.
      let rad = radius * (0.42 + 0.58 * r());
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k < knots; k++) {
        ang += (r() - 0.5) * 3.4; // up to ±1.7 rad per hop; enough for a strand to wrap back over itself
        rad = Math.min(
          radius * 1.12,
          Math.max(radius * 0.34, rad + (r() - 0.5) * radius * 0.72),
        );
        // The z jitter is larger than half a hop on purpose: it lets a segment
        // run BACKWARDS up the corridor. That reversal is the entire difference
        // between a knot and a combed bundle of cables.
        const z = z0 - k * dz + (r() - 0.5) * dz * 1.3;
        pts.push(
          new THREE.Vector3(Math.cos(ang) * rad, Math.sin(ang) * rad * 0.82, z),
        );
      }
      // Centripetal, not the default uniform: with control points this
      // irregularly spaced, uniform CatmullRom overshoots into cusps and loops
      // that punch straight through the middle of the frame.
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
      const tube = new THREE.TubeGeometry(
        curve,
        TUBULAR,
        TUBE_R,
        RADIAL,
        false,
      );

      // three's TubeGeometry writes the ALONG coordinate into uv.x and the
      // around-the-tube coordinate into uv.y (checked against the r184 source —
      // it is easy to assume the opposite). Copy it out to our own attribute,
      // stamp the per-filament random, then drop uv so the merged buffer is lean.
      const n = tube.attributes.position.count;
      const uv = tube.attributes.uv;
      const along = new Float32Array(n);
      const sd = new Float32Array(n);
      const fil = r();
      for (let v = 0; v < n; v++) {
        along[v] = uv.getX(v);
        sd[v] = fil;
      }
      tube.setAttribute("aAlong", new THREE.BufferAttribute(along, 1));
      tube.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
      tube.deleteAttribute("uv");
      parts.push(tube);
    }
    const merged = mergeGeometries(parts, false)!;
    // The sources were never uploaded, but they hold ~12k verts of CPU buffers
    // each; drop them now rather than at the next GC.
    for (const p of parts) p.dispose();
    // Generous sphere: the shader sway pushes vertices past the baked extent,
    // and frustumCulled is off anyway — this exists so nothing downstream
    // (raycast, bounds math) trips over a null boundingSphere.
    merged.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, 0),
      Math.sqrt(length * length * 0.36 + radius * radius * 1.6),
    );
    return merged;
  }, [count, radius, length, seed]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uChaos: { value: 1 },
      uOpacity: { value: 1 },
      uWrithe: { value: 0.18 },
      uFar: { value: 36 },
      uBody: { value: new THREE.Color("#0e2447") }, // deep navy body: present, never readable as a colour
      uBead: { value: new THREE.Color("#3BE1FF") },
      uHot: { value: new THREE.Color("#EAF6FF") },
    }),
    [],
  );

  return (
    <group {...group}>
      <mesh geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={uniforms}
          uniforms-uTime-value={time}
          uniforms-uChaos-value={chaos}
          uniforms-uOpacity-value={opacity}
          // Sway amplitude scales with the knot: ~2.5% of radius keeps strands
          // from ever being pushed into the central corridor.
          uniforms-uWrithe-value={radius * 0.026}
          uniforms-uFar-value={length}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};
