/**
 * PANEL WALL — options under assessment, and the ones we refuse.
 *
 * A grid of thin holographic panels laid on a cylindrical arc around the Z
 * axis, so the camera flying down that axis is inside the wall rather than
 * looking at it. Two structural axes and no third: on a cylinder the only
 * free parameters are angle and depth, so `cols` runs around the arc and
 * `rows` runs down the corridor. The arc stops ~60deg short of closing, with
 * the gap under the camera — a closed ring read as a pipe, and the film
 * already has a tunnel.
 *
 * `sweep` (0 -> ~1.1) is a travelling front. Every panel carries its own
 * `aOrder` (a diagonal across angle and depth, lightly jittered), and the
 * whole state machine is `t = (sweep - order) / rise`: rise into place,
 * border hairline ignites, content rules wipe in one after another. About one
 * in five panels is marked refused at build time — it lights, holds, flashes,
 * then loses its border and tumbles out of the wall. Nothing here is stateful:
 * the same `sweep` always produces the same wall.
 *
 * The face is deliberately almost nothing. All the light is in the border and
 * the rules; the glass only catches a slow scan. Every colour is a mix of
 * cyan/blue/white, all of which satisfy r < g <= b, so no gradient here can
 * drift warm and none needs clamping.
 */
import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { rng } from "./rng";

type GroupProps = ThreeElements["group"];

/** World thickness of every lit hairline — constant across panel sizes so the
 *  wall reads as one drawing rather than panels at different zooms. */
const LINE = 0.015;
/** Arc swept by the wall. 300deg: surrounds the lens, leaves a floor. */
const ARC = Math.PI * (300 / 180);
/** Depth between rings. Must exceed panel height or the rows interpenetrate. */
const DZ = 2.5;

const VERT = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec2 aSize;
  attribute float aAngle;
  attribute float aOrder;
  attribute float aSeed;
  attribute float aRefused;
  uniform float uSweep;
  uniform float uRise;
  uniform float uHold;
  uniform float uLine;
  varying vec2 vUv;
  varying vec2 vEdge;
  varying float vT;
  varying float vSeed;
  varying float vRefused;
  void main() {
    // 0 the instant the front arrives, 1 once locked in. Clamped at 4 so the
    // tumble has a finite end state — unclamped, the first refused panel had
    // spun twice before the last panel ignited.
    float t = clamp((uSweep - aOrder) / uRise, -1.0, 4.0);
    float e = clamp(t, 0.0, 1.0);
    float settle = e * e * (3.0 - 2.0 * e);

    vec3 nOut = vec3(cos(aAngle), sin(aAngle), 0.0);   // radially outward
    vec3 right = vec3(-sin(aAngle), cos(aAngle), 0.0); // tangential
    vec3 up = vec3(0.0, 0.0, 1.0);                     // along the corridor

    // It rises INWARD out of the wall, not upward: a cylinder around Z has no
    // vertical axis left, and rising along Z just slid panels down the flight
    // path — that read as lag, not as assembly.
    float recess = (1.0 - settle) * 0.9;
    float grow = mix(0.87, 1.0, settle);

    float fall = aRefused * max(t - uHold, 0.0);
    // accelerating, then easing off: something letting go, not a fan blade
    float ang = 0.55 * fall * fall / (1.0 + fall * 0.8);

    vec2 lp = position.xy * aSize * grow;
    // tumble pivots about the panel's own tangential axis
    vec3 local = right * lp.x + up * (lp.y * cos(ang)) + nOut * (lp.y * sin(ang));
    vec3 world = aCenter + local
      + nOut * (recess + fall * 0.5)   // pushed out before it locks, and again when it lets go
      + vec3(0.0, 0.0, fall * 0.55);   // and drifts backwards down the corridor

    vUv = uv;
    vEdge = vec2(uLine) / (aSize * grow);
    vT = t;
    vSeed = aSeed;
    vRefused = aRefused;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uHold;
  uniform float uOpacity;
  uniform vec3 uCyan;
  uniform vec3 uBlue;
  uniform vec3 uHot;
  varying vec2 vUv;
  varying vec2 vEdge;
  varying float vT;
  varying float vSeed;
  varying float vRefused;
  void main() {
    float reached = step(0.0, vT);
    float fall = vRefused * max(vT - uHold, 0.0);
    float dead = vRefused * smoothstep(0.0, 0.28, fall);
    float ghost = vRefused * exp(-fall * 0.85);      // dark glass still catches an edge as it falls
    float live = smoothstep(0.0, 0.10, vT) * (1.0 - dead);

    // border: distance to the nearest edge measured in hairline widths, so the
    // line is the same world thickness on every panel whatever its size
    vec2 dE = min(vUv, 1.0 - vUv) / vEdge;
    float border = (1.0 - smoothstep(0.45, 1.35, min(dE.x, dE.y)))
                 * (0.74 + 0.26 * sin(uTime * 1.7 + vSeed * 31.0));

    // content rules — two always, a third on about half the panels. Each wipes
    // left to right on its own stagger, with a bright head at the wipe tip, so
    // a reached panel reads as filling with an assessment.
    float rules = 0.0;
    float head = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float rs = fract(vSeed * (7.31 + fi * 4.17) + fi * 0.37);
      float keep = i == 2 ? step(0.45, fract(vSeed * 11.3)) : 1.0;
      float y = 0.68 - fi * 0.19;
      float len = 0.30 + rs * 0.44;
      float w = smoothstep(0.30 + fi * 0.20, 0.72 + fi * 0.20, vT);
      float x1 = 0.14 + len * w;
      float ly = 1.0 - smoothstep(vEdge.y * 0.45, vEdge.y * 1.20, abs(vUv.y - y));
      float lx = smoothstep(0.130, 0.152, vUv.x) * (1.0 - smoothstep(x1 - 0.012, x1 + 0.012, vUv.x));
      rules += ly * lx * keep;
      head += ly * exp(-abs(vUv.x - x1) * 60.0) * keep * step(0.001, w) * (1.0 - w) * 3.0;
    }

    // ignition flash, and the harder spike a refused panel throws before it dies
    float hot = max(exp(-max(vT, 0.0) * 2.4) * reached,
                    vRefused * exp(-abs(vT - uHold) * 8.0) * reached * 1.25);

    float sc = (vUv.y - fract(uTime * 0.13 + vSeed)) * 6.0;
    float face = 0.05 + 0.045 * (1.0 - vUv.y) + 0.07 * exp(-sc * sc);

    vec3 col = uBlue * face * 0.9;
    col += mix(uCyan, uHot, 0.18) * border * live;
    col += mix(uCyan, uHot, 0.45) * (rules + head) * live;
    col += uHot * hot;

    float a = (face * (live * 0.9 + ghost * 0.55)
            + (border * 1.7 + rules * 1.6 + head * 1.3) * live
            + hot * (0.45 + face * 3.0)) * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
  }
`;

export const PanelWall: React.FC<
  GroupProps & {
    time: number;
    /** the travelling front, 0 -> ~1.1 sweeps the whole wall */
    sweep: number;
    cols?: number;
    rows?: number;
    opacity?: number;
    seed?: number;
    radius?: number;
  }
> = ({
  time,
  sweep,
  cols = 14,
  rows = 5,
  opacity = 1,
  seed = 41,
  radius = 7,
  ...group
}) => {
  const geometry = useMemo(() => {
    const r = rng(seed);
    const count = cols * rows;
    const centers = new Float32Array(count * 3);
    const sizes = new Float32Array(count * 2);
    const angles = new Float32Array(count);
    const orders = new Float32Array(count);
    const seeds = new Float32Array(count);
    const refused = new Float32Array(count);

    const aStep = ARC / Math.max(1, cols - 1);
    const a0 = -Math.PI / 2 + (Math.PI * 2 - ARC) / 2; // gap centred under the camera
    const w = aStep * radius * 0.8;
    const h = DZ * 0.74;
    let hi = 0;
    for (let c = 0; c < cols; c++) {
      for (let rw = 0; rw < rows; rw++) {
        const i = c * rows + rw;
        const ang = a0 + c * aStep;
        const z = ((rows - 1) / 2 - rw) * DZ; // row 0 nearest the approaching camera
        centers[i * 3] = Math.cos(ang) * radius;
        centers[i * 3 + 1] = Math.sin(ang) * radius;
        centers[i * 3 + 2] = z;
        // +-6% size jitter: a perfectly uniform grid reads as a texture, not glass
        sizes[i * 2] = w * (0.94 + r() * 0.12);
        sizes[i * 2 + 1] = h * (0.94 + r() * 0.12);
        angles[i] = ang;
        seeds[i] = r();
        refused[i] = r() < 0.2 ? 1 : 0;
        // diagonal front: mostly around the arc, partly down the corridor
        const o =
          0.66 * (c / Math.max(1, cols - 1)) +
          0.34 * (rw / Math.max(1, rows - 1)) +
          (r() - 0.5) * 0.05;
        orders[i] = o;
        hi = Math.max(hi, o);
      }
    }
    for (let i = 0; i < count; i++) orders[i] = Math.max(orders[i], 0) / hi; // normalise so sweep=1 clears the wall

    // one quad, instanced; the panel is entirely drawn in the fragment shader
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.setIndex(base.getIndex()!.clone());
    geo.setAttribute("position", base.getAttribute("position").clone());
    geo.setAttribute("uv", base.getAttribute("uv").clone());
    base.dispose();
    geo.setAttribute("aCenter", new THREE.InstancedBufferAttribute(centers, 3));
    geo.setAttribute("aSize", new THREE.InstancedBufferAttribute(sizes, 2));
    geo.setAttribute("aAngle", new THREE.InstancedBufferAttribute(angles, 1));
    geo.setAttribute("aOrder", new THREE.InstancedBufferAttribute(orders, 1));
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    geo.setAttribute(
      "aRefused",
      new THREE.InstancedBufferAttribute(refused, 1),
    );
    geo.instanceCount = count;
    // generous: refused panels drift outward and backwards well past the wall
    const depth = (rows - 1) * DZ * 0.5 + 3;
    geo.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, 0),
      Math.sqrt((radius + 3) * (radius + 3) + depth * depth),
    );
    return geo;
  }, [cols, rows, radius, seed]);

  const uniforms = useMemo(
    () => ({
      uSweep: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uLine: { value: LINE },
      uRise: { value: 0.12 }, // sweep units a panel takes to lock in
      uHold: { value: 0.9 }, // a refused panel gets one rule in before it flashes
      uCyan: { value: new THREE.Color("#3BE1FF") },
      uBlue: { value: new THREE.Color("#2A7FFF") },
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
          uniforms-uSweep-value={sweep}
          uniforms-uTime-value={time}
          uniforms-uOpacity-value={opacity}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};
