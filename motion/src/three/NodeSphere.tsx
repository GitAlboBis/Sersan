/**
 * NODE SPHERE — the film's payoff image.
 *
 * A dense shell of nodes wired to their nearest neighbours, lit pole to pole
 * by `build`, then left alive: pulses run every link, nodes twinkle on their
 * own clocks, and the whole body breathes a few percent in and out.
 *
 * Three decisions worth recording, because the obvious alternatives were tried:
 *
 *  · SHELL, NOT SKIN. Points strictly on the sphere read as a wireframe ball —
 *    dead, and the links all lie in one curved surface. A radius jitter of
 *    ~25% gives the links depth to cross through, which is what makes the
 *    camera's passage through the middle feel like entering something.
 *  · BREATHING IS A UNIFORM SCALE ABOUT THE ORIGIN, applied identically in both
 *    vertex shaders (see BREATHE). Anything per-vertex would tear the link
 *    tubes off their nodes; a shared radial scale keeps every joint welded
 *    while still rebuilding zero geometry per frame.
 *  · IGNITION ORDER IS NORMALISED INTO [0.02, 0.85], not [0,1]. The ignition
 *    flash decays in build-space, so if the last node ignited exactly at
 *    build === 1 it would sit frozen at full flash for the whole hold. Ending
 *    the wave at 85% gives it room to settle before the shot lands.
 */
import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng, onSphere } from "./rng";

type GroupProps = ThreeElements["group"];

/** Shared by both shaders so nodes and links swell as one body. Two incommensurate
 *  periods so the breath never lands on a repeating beat over the shot length. */
const BREATHE = /* glsl */ `
  float breathe(float t, float amp) {
    return 1.0 + amp * (0.65 * sin(t * 0.9) + 0.35 * sin(t * 1.63 + 1.1));
  }
`;

const NODE_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute float aOrder;
  uniform float uTime;
  uniform float uBuild;
  uniform float uScale;
  uniform float uBreath;
  varying float vA;
  varying float vHot;
  varying float vSeed;
  ${BREATHE}
  void main() {
    float age = uBuild - aOrder;
    float on = clamp(age / 0.03, 0.0, 1.0);
    float flash = exp(-max(age, 0.0) * 18.0) * on;
    // each node keeps its own clock; the rare 12th-power surge is the node "firing"
    float tw = 0.72 + 0.28 * sin(uTime * (1.1 + aSeed * 2.2) + aSeed * 40.0);
    float surge = pow(0.5 + 0.5 * sin(uTime * (0.7 + aSeed * 1.3) + aSeed * 23.0), 12.0);
    vec4 mv = modelViewMatrix * vec4(position * breathe(uTime, uBreath), 1.0);
    gl_PointSize = aSize * 2.4 * uScale * (1.0 + flash * 1.8 + surge * 0.9) * tw / max(-mv.z, 0.05);
    gl_Position = projectionMatrix * mv;
    vA = on * tw;
    vHot = clamp(flash + surge, 0.0, 1.0);
    vSeed = aSeed;
  }
`;

const NODE_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying float vA;
  varying float vHot;
  varying float vSeed;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p) * 2.0;
    float disc = pow(smoothstep(1.0, 0.0, d), 2.2);
    // two thin crossed rays: the sprite reads as a light source rather than a dot
    float ray = max(
      smoothstep(0.035, 0.0, abs(p.x)) * smoothstep(0.5, 0.0, abs(p.y)),
      smoothstep(0.035, 0.0, abs(p.y)) * smoothstep(0.5, 0.0, abs(p.x))
    ) * 0.55;
    vec3 cyan = vec3(0.231, 0.882, 1.0);
    vec3 blue = vec3(0.165, 0.498, 1.0);
    vec3 hot  = vec3(0.918, 0.965, 1.0);
    vec3 col = mix(cyan, blue, fract(vSeed * 5.13) * 0.55);
    col = mix(col, hot, clamp(smoothstep(0.5, 0.0, d) + vHot, 0.0, 1.0));
    col.r = min(col.r, col.g); // hard stop against any drift toward magenta
    float a = (disc + ray) * vA * 2.0 * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col * (1.0 + vHot * 1.6), a);
  }
`;

const LINK_VERT = /* glsl */ `
  attribute float aAlong;
  attribute float aSeed;
  attribute float aOrder;
  uniform float uTime;
  uniform float uBreath;
  varying float vAlong;
  varying float vSeed;
  varying float vOrder;
  varying vec3 vN;
  varying vec3 vV;
  ${BREATHE}
  void main() {
    vAlong = aAlong; vSeed = aSeed; vOrder = aOrder;
    vec4 mv = modelViewMatrix * vec4(position * breathe(uTime, uBreath), 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const LINK_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uBuild;
  uniform float uOpacity;
  varying float vAlong;
  varying float vSeed;
  varying float vOrder;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float draw = clamp((uBuild - vOrder) / 0.06, 0.0, 1.0);
    if (vAlong > draw) discard;
    // a travelling gaussian bead re-launches every cycle: discrete firing, not a hum
    float rate = 0.28 + 0.42 * fract(vSeed * 13.7);
    float head = fract(uTime * rate + vSeed);
    float bead = exp(-pow((vAlong - head) / 0.085, 2.0));
    float head2 = fract(uTime * rate * 0.61 + vSeed * 3.1);
    bead = max(bead, exp(-pow((vAlong - head2) / 0.06, 2.0)) * 0.7);
    float tip = smoothstep(draw - 0.12, draw, vAlong) * step(draw, 0.999);
    vec3 col = mix(vec3(0.231, 0.882, 1.0), vec3(0.165, 0.498, 1.0), 0.5 + 0.5 * sin(vAlong * 3.0 + vSeed * 6.2831));
    col = mix(col, vec3(0.918, 0.965, 1.0), max(bead * 0.9, tip));
    col.r = min(col.r, col.g);
    // grazing tubes are the ones that read as lines; face-on ones fade so the
    // interior does not turn into a solid fog of cyan when the camera is inside
    float facing = pow(abs(dot(normalize(vN), normalize(vV))), 1.3);
    float taper = 0.4 + 0.6 * smoothstep(0.0, 0.08, vAlong) * smoothstep(1.0, 0.92, vAlong);
    gl_FragColor = vec4(col * (1.0 + bead * 1.8 + tip * 1.6), facing * taper * (1.15 + bead * 1.2) * uOpacity);
  }
`;

export const NodeSphere: React.FC<
  GroupProps & {
    time: number;
    /** 0..1 ignition wave, +Y pole to -Y pole */
    build: number;
    viewportHeight: number;
    nodes?: number;
    radius?: number;
    opacity?: number;
    seed?: number;
    linkDist?: number;
  }
> = ({
  time,
  build,
  viewportHeight,
  nodes = 260,
  radius = 6,
  opacity = 1,
  seed = 71,
  linkDist = 2.2,
  ...group
}) => {
  const data = useMemo(() => {
    const r = rng(seed);
    const pts: THREE.Vector3[] = [];
    const order = new Float32Array(nodes);
    const nsize = new Float32Array(nodes);
    const nseed = new Float32Array(nodes);
    for (let i = 0; i < nodes; i++) {
      const [x, y, z] = onSphere(r);
      // cube-rooted jitter keeps the shell dense at its outer face rather than
      // piling nodes toward the centre, which reads as a fog ball
      const rad = radius * (0.74 + 0.26 * Math.cbrt(r()));
      pts.push(new THREE.Vector3(x * rad, y * rad, z * rad));
      // ignition order is latitude, with a little noise so the wavefront is a
      // ragged edge and not a machined ring sliding down the sphere
      order[i] =
        THREE.MathUtils.clamp(0.5 - y / 2 + (r() - 0.5) * 0.06, 0, 1) * 0.83 +
        0.02;
      nsize[i] = 5 + r() * r() * 13;
      nseed[i] = r();
    }
    const npos = new Float32Array(nodes * 3);
    pts.forEach((p, i) => {
      npos[i * 3] = p.x;
      npos[i * 3 + 1] = p.y;
      npos[i * 3 + 2] = p.z;
    });
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(npos, 3));
    nodeGeo.setAttribute("aSize", new THREE.BufferAttribute(nsize, 1));
    nodeGeo.setAttribute("aSeed", new THREE.BufferAttribute(nseed, 1));
    nodeGeo.setAttribute("aOrder", new THREE.BufferAttribute(order, 1));
    // breathing pushes vertices a few percent out, so pad the bound rather than
    // ever letting the sphere pop while the camera is inside it
    const bounds = new THREE.Sphere(new THREE.Vector3(0, 0, 0), radius * 1.5);
    nodeGeo.boundingSphere = bounds.clone();

    // 2–3 nearest neighbours within linkDist, deduped by an ordered key so an
    // A→B and B→A pair never both become geometry
    const up = new THREE.Vector3(0, 1, 0);
    const seen = new Set<number>();
    const cyls: THREE.BufferGeometry[] = [];
    for (let i = 0; i < nodes; i++) {
      const near: { j: number; d: number }[] = [];
      for (let j = 0; j < nodes; j++) {
        if (j === i) continue;
        const d = pts[i].distanceTo(pts[j]);
        if (d <= linkDist) near.push({ j, d });
      }
      near.sort((a, b) => a.d - b.d);
      const take = 2 + (nseed[i] > 0.55 ? 1 : 0);
      for (const { j } of near.slice(0, take)) {
        const key = Math.min(i, j) * nodes + Math.max(i, j);
        if (seen.has(key)) continue;
        seen.add(key);
        const A = pts[i];
        const B = pts[j];
        const dir = B.clone().sub(A);
        const len = dir.length();
        dir.normalize();
        const g = new THREE.CylinderGeometry(0.016, 0.016, len, 5, 1, true);
        const uv = g.getAttribute("uv");
        const along = new Float32Array(uv.count);
        const sd = new Float32Array(uv.count);
        const od = new Float32Array(uv.count);
        const s = r();
        // a link waits for its LATER end, so no wire is ever lit from a dark node
        const o = Math.max(order[i], order[j]);
        for (let k = 0; k < uv.count; k++) {
          along[k] = uv.getY(k);
          sd[k] = s;
          od[k] = o;
        }
        g.setAttribute("aAlong", new THREE.BufferAttribute(along, 1));
        g.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
        g.setAttribute("aOrder", new THREE.BufferAttribute(od, 1));
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
        g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
        cyls.push(g);
      }
    }
    const linkGeo = cyls.length
      ? mergeGeometries(cyls, false)!
      : new THREE.BufferGeometry();
    linkGeo.boundingSphere = bounds.clone();
    return { nodeGeo, linkGeo };
  }, [nodes, radius, seed, linkDist]);

  const nodeU = useMemo(
    () => ({
      uTime: { value: 0 },
      uBuild: { value: 0 },
      uScale: { value: 1 },
      uBreath: { value: 0.035 },
      uOpacity: { value: 1 },
    }),
    [],
  );
  const linkU = useMemo(
    () => ({
      uTime: { value: 0 },
      uBuild: { value: 0 },
      uBreath: { value: 0.035 },
      uOpacity: { value: 1 },
    }),
    [],
  );

  return (
    <group {...group}>
      <mesh geometry={data.linkGeo} frustumCulled={false}>
        <shaderMaterial
          vertexShader={LINK_VERT}
          fragmentShader={LINK_FRAG}
          uniforms={linkU}
          uniforms-uTime-value={time}
          uniforms-uBuild-value={build}
          uniforms-uBreath-value={0.035}
          uniforms-uOpacity-value={opacity}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <points geometry={data.nodeGeo} frustumCulled={false}>
        <shaderMaterial
          vertexShader={NODE_VERT}
          fragmentShader={NODE_FRAG}
          uniforms={nodeU}
          uniforms-uTime-value={time}
          uniforms-uBuild-value={build}
          uniforms-uScale-value={viewportHeight * 0.012}
          uniforms-uBreath-value={0.035}
          uniforms-uOpacity-value={opacity}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};
