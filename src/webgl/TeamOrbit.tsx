"use client";

/**
 * TeamOrbit — the Team section's own backdrop (2026-08-27, owner: "sorprendimi
 * senza replicare Lusion"): an ASTROLABE of the person's real data.
 *
 * Three thin elliptical rings, tilted in 3D around the particle head, rotate
 * slowly (and precess). Along them orbit SATELLITES — one per fact about the
 * person currently on stage, straight from src/data/founders.ts:
 *   ring 0 (inner)  → where they have been / what they carry (previouslyAt,
 *                     else badges)
 *   ring 1 (middle) → what they do (expertiseEn / It)
 *   ring 2 (outer)  → what they ship with (stack)
 * Each satellite is an HDR dot (feeds the selective bloom) with a light trail
 * on its ring and a mono DOM label projected next to it. Satellites that pass
 * BEHIND the head dim and shrink (a cheap eclipse — the head's discs are
 * additive and depth-free, so occlusion is faked by depth sign). The rings
 * tilt with the pointer like the head (same rest-parallax law) so the whole
 * assembly reads as one object.
 *
 * PERSON CHANGE: the satellite set follows the morph scalar. Person k's
 * satellites live at envelope e_k = 1 − smoothstep(0.30, 0.70, |morph − k|):
 * they fly IN from the head's centre along their ring (radius × e_k) and fade
 * with it, so the previous person's facts collapse into the head while the
 * next person's emerge — synchronised with the particle morph, no extra
 * clock.
 *
 * PLACEMENT: camera-locked to the founders stage exactly like
 * FounderPortraitMorph (stage rect + sticky top measured on `measureVersion`
 * bumps only; per-frame from window.scrollY + store.secTop). Culled off-
 * screen, faded with the same 0.28·ih edge ramp, mounted only on the desktop
 * pinned morph (store.pinned) on a true WebGPU backend.
 *
 * COST: 3 Line objects (rings, vertex colours rewritten per frame for the
 * trails), 1 InstancedMesh (satellites), ≤ ORBIT_MAX DOM label writes per
 * frame. Plain three materials (WebGPURenderer converts them) — no TSL, no
 * storage buffers, no bindings shared with the morph.
 *
 * Kill switch: unmount in Scene.tsx. Dev handle: window.__sersanTeamOrbit.
 */
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CAMERA_Z, WORLD_VIEW_HEIGHT } from "./constants";
import { webgpuEnabled, backendOf } from "./renderer/createRenderer";
import { useFoundersMorphStore, MORPH_MAX } from "./store/foundersMorphStore";
import { founders } from "@/data/founders";
import { useLanguage } from "@/components/language-provider";

/** Max satellites addressable per person (DOM label pool size). */
export const ORBIT_MAX = 24;
/** Ring radii as multiples of the head's half-width (HEAD_FILL·stage/2). */
const RING_RADII = [1.28, 1.58, 1.92];
/** Ring plane tilts (rad): [about x, about y] — an astrolabe, not a halo. */
const RING_TILT: [number, number][] = [
  [1.05, 0.35],
  [-0.72, -0.55],
  [0.42, 1.0],
];
/** Angular speed per ring (rad/s) — slow, alternating directions. */
const RING_SPEED = [0.09, -0.065, 0.05];
/** Slow precession of each ring's tilt (rad, rad/s). */
const PRECESS_AMP = 0.12;
const PRECESS_SPEED = [0.05, 0.037, 0.043];
/** Ring line brightness (additive, HDR-safe) + trail length behind a satellite. */
const RING_BASE = 0.075;
const TRAIL_RAD = 0.9; // radians of ring lit behind each satellite
const TRAIL_PEAK = 0.9;
/** Satellite dot: world radius at the head's scale, HDR colour front/back. */
const DOT_RADIUS = 0.03;
/** Labels are hidden while their satellite projects INSIDE the head's
 * screen ellipse (half-axes as multiples of the head half-width) — a label
 * across the eyes is the one thing this layer must never do. */
const HEAD_MASK_RX = 1.12;
const HEAD_MASK_RY = 1.5;
const COL_FRONT = new THREE.Color(0.35, 1.05, 1.35); // cyan, > bloom threshold
const COL_BACK = new THREE.Color(0.12, 0.3, 0.45);
const RING_COL = new THREE.Color(0.55, 0.85, 1.0);
/** Pointer parallax at rest (mirrors FounderPortraitMorph REST_PARALLAX_*). */
const PARALLAX_YAW = 0.16;
const PARALLAX_PITCH = 0.1;
const CULL_PAD = 120;
const RING_SEGMENTS = 160;
/** Fraction of the stage width the HEAD occupies (FounderPortraitMorph
 * HEAD_FILL) — the orbit radii are relative to the head, not the stage. */
const HEAD_FILL = 0.66;

interface Satellite {
  person: number;
  ring: number;
  /** Base angle on the ring (rad). */
  angle: number;
  label: string;
}

/** Build the satellite list for all people — ring by ring, evenly spread. */
function buildSatellites(isEn: boolean): Satellite[] {
  const out: Satellite[] = [];
  founders.slice(0, MORPH_MAX + 1).forEach((f, person) => {
    const rings: string[][] = [
      f.previouslyAt && f.previouslyAt.length > 0 ? f.previouslyAt : f.badges,
      isEn ? f.expertiseEn : f.expertiseIt,
      f.stack ?? [],
    ];
    let budget = ORBIT_MAX;
    rings.forEach((items, ring) => {
      const take = items.slice(0, Math.min(items.length, budget, 12));
      budget -= take.length;
      const n = take.length;
      take.forEach((label, i) => {
        // Even spread with a per-ring phase so rings never align.
        const angle = (i / Math.max(1, n)) * Math.PI * 2 + ring * 0.9 + person * 0.37;
        out.push({ person, ring, angle, label });
      });
    });
  });
  return out;
}

interface StageRect {
  offsetY: number;
  baseVpX: number;
  w: number;
  h: number;
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function TeamOrbit() {
  const { camera, size, gl } = useThree();
  const { language } = useLanguage();
  const isEn = language === "en";
  const measureVersion = useFoundersMorphStore((s) => s.measureVersion);
  const pinned = useFoundersMorphStore((s) => s.pinned);

  const ok = webgpuEnabled() && backendOf(gl) === "webgpu";

  const groupRef = useRef<THREE.Group>(null);
  const ringGroupRefs = useRef<THREE.Group[]>([]);
  const rectRef = useRef<StageRect | null>(null);
  const labelsRef = useRef<HTMLElement[]>([]);
  const labelTextRef = useRef<string[]>([]);
  const fadeRef = useRef(0);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const timeRef = useRef(0);
  const scratch = useRef(new THREE.Vector3()).current;
  const scratch2 = useRef(new THREE.Vector3()).current;
  const euler = useRef(new THREE.Euler()).current;
  const quat = useRef(new THREE.Quaternion()).current;
  const mat = useRef(new THREE.Matrix4()).current;
  const colScratch = useRef(new THREE.Color()).current;
  const tuneRef = useRef({ intensity: 1, speed: 1, radius: 1, labels: 1 });

  const sats = useMemo(() => buildSatellites(isEn), [isEn]);

  // --- Geometry / materials (plain three; WebGPURenderer converts them) -----
  const rings = useMemo(() => {
    return RING_RADII.map(() => {
      const pos = new Float32Array((RING_SEGMENTS + 1) * 3);
      const col = new Float32Array((RING_SEGMENTS + 1) * 3);
      for (let i = 0; i <= RING_SEGMENTS; i++) {
        const a = (i / RING_SEGMENTS) * Math.PI * 2;
        pos[i * 3] = Math.cos(a);
        pos[i * 3 + 1] = 0;
        pos[i * 3 + 2] = Math.sin(a);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const m = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      });
      const line = new THREE.Line(geo, m);
      line.frustumCulled = false;
      line.renderOrder = -1;
      return line;
    });
  }, []);
  const dots = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 10, 8);
    const m = new THREE.MeshBasicMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      color: 0xffffff,
    });
    const mesh = new THREE.InstancedMesh(geo, m, sats.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.renderOrder = -1;
    // Per-instance colour (three ≥ r150 supports instanceColor on InstancedMesh).
    for (let i = 0; i < sats.length; i++) mesh.setColorAt(i, COL_FRONT);
    return mesh;
  }, [sats.length]);

  useEffect(() => {
    return () => {
      rings.forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      });
      dots.geometry.dispose();
      (dots.material as THREE.Material).dispose();
    };
  }, [rings, dots]);

  // --- Measure the stage (on measureVersion bumps only) ----------------------
  useEffect(() => {
    if (!ok || !pinned) return;
    const sticky = document.querySelector<HTMLElement>("[data-founders-morph-sticky]");
    const stage = document.querySelector<HTMLElement>("[data-founder-stage]");
    if (!sticky || !stage) return;
    const st = sticky.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    if (sr.width === 0 || sr.height === 0) return;
    rectRef.current = {
      offsetY: sr.top - st.top,
      baseVpX: sr.left,
      w: sr.width,
      h: sr.height,
    };
    labelsRef.current = Array.from(
      sticky.querySelectorAll<HTMLElement>("[data-orbit-label]"),
    );
    labelTextRef.current = labelsRef.current.map(() => "");
  }, [ok, pinned, measureVersion, size.width, size.height]);

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;
    const store = useFoundersMorphStore.getState();
    const rect = rectRef.current;
    if (!ok || !store.pinned || !rect) {
      group.visible = false;
      return;
    }
    const delta = Math.min(rawDelta, 1 / 30);
    const ih = size.height;
    const vw = size.width;
    const k = WORLD_VIEW_HEIGHT / ih;
    const scrollY = window.scrollY;
    const clampedTop = Math.min(
      Math.max(scrollY, store.secTop),
      store.secTop + store.travel,
    );
    const stickyVpTop = clampedTop - scrollY;
    const vpY = stickyVpTop + rect.offsetY;
    const cx = rect.baseVpX + rect.w / 2;
    const cy = vpY + rect.h / 2;
    if (vpY + rect.h < -CULL_PAD || vpY > ih + CULL_PAD || !store.active) {
      group.visible = false;
      fadeRef.current = 0;
      hideLabels(labelsRef.current);
      return;
    }
    group.visible = true;

    // In-view fade (same ramp as the portrait).
    const ramp = ih * 0.28;
    const edge = Math.min(1, (ih - vpY) / ramp, (vpY + rect.h) / ramp);
    fadeRef.current = THREE.MathUtils.damp(
      fadeRef.current,
      store.reveal >= 1 ? THREE.MathUtils.clamp(edge, 0, 1) : 0,
      8,
      delta,
    );
    const fade = fadeRef.current * tuneRef.current.intensity;

    // Camera-locked placement at the stage centre.
    scratch
      .set((cx - vw / 2) * k, (ih / 2 - cy) * k, -CAMERA_Z)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    group.position.copy(scratch);
    // Pointer parallax, same law as the head at rest.
    const hov = store.hover;
    const yawT = (store.mouse.x - 0.5) * PARALLAX_YAW * hov;
    const pitchT = (0.5 - store.mouse.y) * PARALLAX_PITCH * hov;
    yawRef.current = THREE.MathUtils.damp(yawRef.current, yawT, 6, delta);
    pitchRef.current = THREE.MathUtils.damp(pitchRef.current, pitchT, 6, delta);
    euler.set(pitchRef.current, yawRef.current, 0);
    quat.setFromEuler(euler);
    group.quaternion.copy(camera.quaternion).multiply(quat);

    // Scale: head half-width in world units.
    const headHalf = (rect.w * HEAD_FILL * 0.5 * k) * tuneRef.current.radius;
    timeRef.current += delta * tuneRef.current.speed;
    const t = timeRef.current;

    // Ring transforms (precessing tilts) + trail colours.
    const m = store.morph;
    for (let r = 0; r < rings.length; r++) {
      const rg = ringGroupRefs.current[r];
      if (!rg) continue;
      const [tx, ty] = RING_TILT[r];
      rg.rotation.set(
        tx + Math.sin(t * PRECESS_SPEED[r]) * PRECESS_AMP,
        ty + Math.cos(t * PRECESS_SPEED[r] * 0.7) * PRECESS_AMP,
        0,
      );
      const rad = RING_RADII[r] * headHalf;
      rg.scale.setScalar(rad);
      // Trails: brighten the ring behind every satellite on it (its own person
      // envelope applies), else the faint base.
      const colAttr = rings[r].geometry.getAttribute("color") as THREE.BufferAttribute;
      const col = colAttr.array as Float32Array;
      for (let i = 0; i <= RING_SEGMENTS; i++) {
        const a = (i / RING_SEGMENTS) * Math.PI * 2;
        let lit = RING_BASE;
        for (let s = 0; s < sats.length; s++) {
          const sat = sats[s];
          if (sat.ring !== r) continue;
          const e = 1 - smoothstep(0.3, 0.7, Math.abs(m - sat.person));
          if (e <= 0.001) continue;
          const sa = sat.angle + t * RING_SPEED[r];
          // signed angular distance a − sa in (−π, π]; the trail is BEHIND the
          // satellite w.r.t. its motion direction.
          let d = a - sa;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          const behind = RING_SPEED[r] > 0 ? -d : d;
          if (behind > 0 && behind < TRAIL_RAD) {
            const w = 1 - behind / TRAIL_RAD;
            lit = Math.max(lit, RING_BASE + TRAIL_PEAK * w * w * e);
          }
        }
        col[i * 3] = RING_COL.r * lit * fade;
        col[i * 3 + 1] = RING_COL.g * lit * fade;
        col[i * 3 + 2] = RING_COL.b * lit * fade;
      }
      colAttr.needsUpdate = true;
    }

    // Satellites + labels.
    const labels = labelsRef.current;
    const texts = labelTextRef.current;
    let li = 0;
    const frameTop = stickyVpTop;
    for (let s = 0; s < sats.length; s++) {
      const sat = sats[s];
      const e = 1 - smoothstep(0.3, 0.7, Math.abs(m - sat.person));
      if (e <= 0.001) {
        mat.makeScale(0, 0, 0);
        dots.setMatrixAt(s, mat);
        continue;
      }
      const rg = ringGroupRefs.current[sat.ring];
      if (!rg) continue;
      const rad = RING_RADII[sat.ring] * headHalf * e; // flies in from the centre
      const ang = sat.angle + t * RING_SPEED[sat.ring];
      // Local ring-plane point → group space via the ring's rotation.
      scratch.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
      scratch.applyEuler(rg.rotation);
      const behind = scratch.z < 0; // group-local z: toward the camera is +
      const depthK = THREE.MathUtils.clamp(0.5 + scratch.z / (headHalf * 2.2), 0, 1);
      const sizeK = (0.6 + 0.4 * depthK) * (0.5 + 0.5 * e);
      mat.makeScale(DOT_RADIUS * headHalf * sizeK, DOT_RADIUS * headHalf * sizeK, DOT_RADIUS * headHalf * sizeK);
      mat.setPosition(scratch);
      dots.setMatrixAt(s, mat);
      colScratch
        .copy(behind ? COL_BACK : COL_FRONT)
        .multiplyScalar(fade * (0.35 + 0.65 * e));
      dots.setColorAt(s, colScratch);

      // Label: project the group-space point to the viewport, then into the
      // sticky frame's coordinates.
      const el = labels[li];
      if (el) {
        scratch2.copy(scratch).applyMatrix4(group.matrixWorld).project(camera);
        const px = ((scratch2.x + 1) / 2) * vw;
        const pyVp = ((1 - scratch2.y) / 2) * ih;
        const py = pyVp - frameTop;
        // Head mask in viewport px (the head is HEAD_FILL of the stage width,
        // centred on the stage).
        const headPx = rect.w * HEAD_FILL * 0.5;
        const dx = (px - cx) / (headPx * HEAD_MASK_RX);
        const dy = (pyVp - cy) / (headPx * HEAD_MASK_RY);
        const overFace = dx * dx + dy * dy < 1;
        const op =
          fade * e * (behind ? 0.3 : 0.92) * (overFace ? 0 : 1) * tuneRef.current.labels;
        if (texts[li] !== sat.label) {
          texts[li] = sat.label;
          el.textContent = sat.label;
        }
        el.style.opacity = op < 0.01 ? "0" : op.toFixed(3);
        el.style.transform = `translate3d(${(px + 9).toFixed(1)}px,${(py - 7).toFixed(1)}px,0)`;
        li++;
      }
    }
    for (; li < labels.length; li++) {
      if (labels[li].style.opacity !== "0") labels[li].style.opacity = "0";
    }
    dots.instanceMatrix.needsUpdate = true;
    if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
    group.updateMatrixWorld(true);
  });

  // Dev handle.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;
    (window as unknown as Record<string, unknown>).__sersanTeamOrbit = {
      setIntensity: (v: number) => (tuneRef.current.intensity = v),
      setSpeed: (v: number) => (tuneRef.current.speed = v),
      setRadius: (v: number) => (tuneRef.current.radius = v),
      setLabels: (v: number) => (tuneRef.current.labels = v),
      getState: () => ({
        ...tuneRef.current,
        satellites: sats.length,
        rect: rectRef.current,
        fade: fadeRef.current,
        labels: labelsRef.current.length,
      }),
    };
  }, [sats.length]);

  if (!ok) return null;

  return (
    <group ref={groupRef} visible={false}>
      {rings.map((line, i) => (
        <group
          key={i}
          ref={(g) => {
            if (g) ringGroupRefs.current[i] = g;
          }}
        >
          <primitive object={line} />
        </group>
      ))}
      <primitive object={dots} />
    </group>
  );
}

function hideLabels(labels: HTMLElement[]) {
  for (const el of labels) if (el.style.opacity !== "0") el.style.opacity = "0";
}
