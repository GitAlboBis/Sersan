"use client";

/**
 * NeuralLattice — the FIX 3 v4 unified neural-network WebGL island.
 *
 * RECONCEPTION (v4): the network is EXACTLY 3 nodes — one per card (1:1) — each
 * a dense glowing particle ORB anchored to its card's measured screen position.
 * Hovering/focusing a card flares its hub (and the card opens); the other hubs
 * dim. Arcs wire the hubs as a triangle (0→1, 1→2, 0→2) with the travelling
 * signal. Applies to BOTH sections:
 *   mode "broken"  (Problem, anchor "problem"): resting look is fractured/dim,
 *     the span arc (0→2) is the "dead" segment whose flow particles disperse.
 *   mode "healthy" (ProductionGrade, anchor "production"): all arcs live; the 3
 *     hubs pulse in sequence (eval baseline → trace → guardrail) as the resting
 *     animation. Hover still flares the hovered hub + opens its card in both.
 *
 * ANCHORING — camera-LOCKED screen-space placement (same contract as before):
 *   - The OUTER group is camera-locked to the SECTION rect [data-lattice-anchor]
 *     (position from rect center, quaternion = camera.quaternion). It is NEVER
 *     rotated (that would break rect registration). v4: scale is REVERTED to
 *     rect-mapped `(w·k, h·k, zScale)` (zScale ≈ h·k) — no isotropic squish
 *     problem now because the content is 3 compact orbs + arcs mapped to the
 *     actual card positions, not a full-rect cloud.
 *   - The 3 hubs map to the measured `[data-lattice-node]` card centers, each
 *     converted to LOCAL space and fed in as uniforms uHub0/1/2 (vec3 + the
 *     STRONG-3D z-depths). On measureVersion bumps we re-measure the section rect
 *     AND the 3 card centers; resize updates ONLY these uniforms (no rebuild).
 *   - A small whole-group damped pointer parallax + faint auto-orbit (inner
 *     group) keeps the depth layering legible. Hub orbs self-rotate in-shader.
 *
 * HOVER: the DOM cards write useNeuralLatticeStore.setHovered(surface, i|null);
 * this island reads hovered[surface] each frame → uHovered + a damped per-hub
 * glow (uHubGlow) that flares the hovered hub and dims the rest. The in-view
 * bump/bumpCluster pulse remains the resting animation (additive).
 *
 * GATING: Scene.tsx mounts this only on `pathname === "/" && tier === "full" &&
 * webgpu`. Lazy TSL import is fenced by webgpuEnabled(). The DOM SVG fallback
 * carries the metaphor on every other tier.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { webgpuEnabled } from "./renderer/createRenderer";
import { CAMERA_Z, WORLD_VIEW_HEIGHT } from "./constants";
import { useSectionStore } from "./store/sectionStore";
import { useScrollStore } from "./store/scrollStore";
import { usePointerStore } from "./store/pointerStore";
import { useNeuralLatticeStore } from "./store/neuralLatticeStore";
import {
  CLUSTER_COUNT,
  HUB_COUNT,
  HUB_Z,
  HUB_DEFAULT_XY,
  FLOW_SPEED,
  NEURAL_PARTICLE_COUNT,
  NEURAL_Y_OFFSET,
  NEURAL_DEPTH_SCALE_FACTOR,
  NEURAL_PARALLAX,
  NEURAL_AUTO_ORBIT,
  NEURAL_ORBIT_FREQ_Y,
  NEURAL_ORBIT_FREQ_X,
  NEURAL_Z_BREATHE,
  HOVER_FLARE,
  HOVER_DIM,
  HOVER_GLOW_DAMP,
  cardCenterToLocal,
  type LatticeMode,
} from "./neural/neuralLatticeConfig";
import type { NeuralFieldBuild } from "./neural/neuralFieldCompute";

/** Off-screen cull margin in CSS px. */
const CULL_PAD = 220;

interface SectionRect {
  /** Viewport-x center of the section anchor. */
  cxBase: number;
  w: number;
  h: number;
  /** Document-space top of the anchor. */
  docTop: number;
  /** The 3 hub LOCAL positions [x,y,z] derived from the card centers. */
  hubs: [number, number, number][];
}

export function NeuralLattice({
  mode,
  anchorId,
}: {
  mode: LatticeMode;
  anchorId: string;
}) {
  const { size, camera, gl } = useThree();
  const measureVersion = useSectionStore((s) => s.measureVersion);
  const broken = mode === "broken";

  // --- Lazy field build (three/webgpu chunk loads ONLY here) ----------------
  const [build, setBuild] = useState<NeuralFieldBuild | null>(null);
  const backendIsWebGPURef = useRef(false);

  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let built: NeuralFieldBuild | null = null;

    void Promise.all([
      import("three/webgpu"),
      import("three/tsl"),
      import("./neural/neuralFieldCompute"),
    ]).then(([webgpu, tslNs, mod]) => {
      if (cancelled) return;
      const bk = (gl as unknown as { backend?: { isWebGLBackend?: boolean } })
        .backend;
      const backendIsWebGPU =
        !!bk &&
        bk.isWebGLBackend !== true &&
        typeof (gl as unknown as { compute?: unknown }).compute === "function";
      backendIsWebGPURef.current = backendIsWebGPU;

      built = mod.createNeuralFieldBuild({
        THREE,
        webgpu: webgpu as never,
        tsl: tslNs as never,
        gl: gl as never,
        backendIsWebGPU,
        count: NEURAL_PARTICLE_COUNT,
      });
      built.uniforms.uBroken.value = broken ? 1 : 0;
      built.uniforms.uFlowSpeed.value = FLOW_SPEED;
      setBuild(built);
    });

    return () => {
      cancelled = true;
      built?.dispose();
      setBuild(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broken, gl]);

  // --- Section rect + 3 card centers: measured on measureVersion bumps ------
  const [rect, setRect] = useState<SectionRect | null>(null);
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(
      `[data-lattice-anchor="${anchorId}"]`,
    );
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const scrollY = window.scrollY;
    const sectionCx = r.left + r.width / 2;
    const sectionCy = r.top + r.height / 2;

    // Measure the 3 card centers; convert each to LOCAL space. Missing anchor →
    // sensible evenly-spread default (HUB_DEFAULT_XY + HUB_Z).
    const hubs: [number, number, number][] = [];
    for (let i = 0; i < HUB_COUNT; i++) {
      const node = el.querySelector<HTMLElement>(
        `[data-lattice-node="${anchorId}:${i}"]`,
      );
      if (node) {
        const nr = node.getBoundingClientRect();
        const cardCx = nr.left + nr.width / 2;
        const cardCy = nr.top + nr.height / 2;
        hubs.push(
          cardCenterToLocal(cardCx, cardCy, sectionCx, sectionCy, r.width, r.height, i),
        );
      } else {
        const [dx, dy] = HUB_DEFAULT_XY[i] ?? [0, 0];
        hubs.push([dx, dy, HUB_Z[i] ?? 0]);
      }
    }

    setRect({
      cxBase: sectionCx,
      w: r.width,
      h: r.height,
      docTop: r.top + scrollY,
      hubs,
    });
  }, [measureVersion, anchorId]);

  // Push the measured hub LOCAL positions into the build uniforms whenever the
  // rect (or build) changes — resize = uniform update, no buffer rebuild.
  useEffect(() => {
    if (!build || !rect) return;
    const u = build.uniforms;
    u.uHub0.value.set(rect.hubs[0][0], rect.hubs[0][1], rect.hubs[0][2]);
    u.uHub1.value.set(rect.hubs[1][0], rect.hubs[1][1], rect.hubs[1][2]);
    u.uHub2.value.set(rect.hubs[2][0], rect.hubs[2][1], rect.hubs[2][2]);
  }, [build, rect]);

  // --- Per-frame: camera-lock placement + parallax + uniforms ---------------
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const scratch = useRef(new THREE.Vector3());
  const revealDamped = useRef(0);
  const clock = useRef(0);
  const pulseEased = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  const disperseRef = useRef(0);
  const parallaxRef = useRef({ x: 0, y: 0 });
  // Per-hub damped glow toward its hover target (1 = neutral).
  const hubGlow = useRef<number[]>(new Array(HUB_COUNT).fill(1));
  const surfaceKey = broken ? "broken" : "healthy";

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    const inner = innerRef.current;
    if (!group || !inner || !rect || !build) return;
    const delta = Math.min(rawDelta, 1 / 30);

    const ih = size.height;
    const vw = size.width;
    const k = WORLD_VIEW_HEIGHT / ih;
    const scrollY = window.scrollY;

    const vpTop = rect.docTop - scrollY;
    const cx = rect.cxBase;
    const cy = vpTop + rect.h / 2;

    if (vpTop + rect.h < -CULL_PAD || vpTop > ih + CULL_PAD) {
      group.visible = false;
      return;
    }
    group.visible = true;

    // Camera-locked placement of the OUTER group. v4: REVERTED to rect-mapped
    // scale `(w·k, h·k, zScale)` because the hubs map to actual card screen
    // positions inside the rect — no squish problem (the content is 3 compact
    // orbs + arcs, not a full-rect cloud). zScale uses the rect HEIGHT (× a
    // factor) so the hub z-layering + arc bow have honest depth.
    const wWorld = rect.w * k;
    const hWorld = rect.h * k;
    const zWorld = hWorld * NEURAL_DEPTH_SCALE_FACTOR;
    scratch.current
      .set(
        (cx - vw / 2) * k,
        (ih / 2 - cy) * k + NEURAL_Y_OFFSET * hWorld,
        -CAMERA_Z,
      )
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    group.position.copy(scratch.current);
    group.quaternion.copy(camera.quaternion);
    group.scale.set(wWorld, hWorld, zWorld);

    revealDamped.current = THREE.MathUtils.damp(
      revealDamped.current,
      useScrollStore.getState().reveal,
      8,
      delta,
    );
    const reveal = revealDamped.current;

    clock.current += delta;
    const t = clock.current;

    // --- Cluster ignition: decay the DOM-bumped targets, ease toward them ----
    const store = useNeuralLatticeStore.getState();
    const surface = broken ? store.broken : store.healthy;
    let anyPulse = false;
    const decayed: number[] = new Array(CLUSTER_COUNT);
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      const target = surface[i] ?? 0;
      decayed[i] = THREE.MathUtils.damp(target, 0, 4, delta);
      if (target !== 0) anyPulse = true;
    }
    if (anyPulse) {
      store.setPulse(
        surfaceKey,
        decayed.map((d) => (d < 0.001 ? 0 : d)),
      );
    }
    let maxPulse = 0;
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      pulseEased.current[i] = THREE.MathUtils.damp(
        pulseEased.current[i],
        surface[i] ?? 0,
        6,
        delta,
      );
      if (pulseEased.current[i] > maxPulse) maxPulse = pulseEased.current[i];
    }

    // --- Hover ignition: damp a per-hub glow toward its target. The hovered hub
    // flares (×HOVER_FLARE); while one is hovered the others dim (×HOVER_DIM);
    // neutral resting glow = 1. Non-decaying source (store.hovered[surface]). --
    const hoveredIdx = store.hovered[surfaceKey];
    for (let i = 0; i < HUB_COUNT; i++) {
      let target = 1;
      if (hoveredIdx !== null && hoveredIdx >= 0) {
        target = hoveredIdx === i ? HOVER_FLARE : HOVER_DIM;
      }
      hubGlow.current[i] = THREE.MathUtils.damp(
        hubGlow.current[i],
        target,
        HOVER_GLOW_DAMP,
        delta,
      );
    }

    // --- Dispersal ramp (broken only) ---------------------------------------
    const disperseTarget = broken ? Math.max(0.2, maxPulse) : 0;
    disperseRef.current = THREE.MathUtils.damp(
      disperseRef.current,
      disperseTarget,
      2.5,
      delta,
    );

    // --- Subtle whole-group life: damped pointer parallax + faint auto-orbit +
    // z-breathe. NO free tumble (hubs are layout-pinned to their cards). --------
    const ptr = usePointerStore.getState();
    const px = (ptr.smooth.x - 0.5) * 2; // [-1,1]
    const py = (ptr.smooth.y - 0.5) * 2;
    parallaxRef.current.x = THREE.MathUtils.damp(
      parallaxRef.current.x,
      px * NEURAL_PARALLAX,
      4,
      delta,
    );
    parallaxRef.current.y = THREE.MathUtils.damp(
      parallaxRef.current.y,
      py * NEURAL_PARALLAX,
      4,
      delta,
    );
    const orbitY = Math.sin(t * NEURAL_ORBIT_FREQ_Y) * NEURAL_AUTO_ORBIT;
    const orbitX = Math.sin(t * NEURAL_ORBIT_FREQ_X) * NEURAL_AUTO_ORBIT;
    inner.rotation.set(
      orbitX + parallaxRef.current.y,
      orbitY + parallaxRef.current.x,
      0,
    );
    inner.position.z = Math.sin(t * 0.21) * NEURAL_Z_BREATHE;

    // --- Drive the field uniforms -------------------------------------------
    const u = build.uniforms;
    u.uTime.value = t;
    u.uReveal.value = reveal;
    for (let i = 0; i < CLUSTER_COUNT; i++) u.uPulse.array[i] = pulseEased.current[i];
    for (let i = 0; i < HUB_COUNT; i++) u.uHubGlow.array[i] = hubGlow.current[i];
    u.uHovered.value = hoveredIdx === null ? -1 : hoveredIdx;
    u.uFlowSpeed.value = FLOW_SPEED;
    u.uDisperse.value = disperseRef.current;
    const dpr = Math.min(gl.getPixelRatio(), 2);
    u.uPixelRatio.value = dpr;
    u.uViewport.value.set(size.width * dpr, size.height * dpr);

    // --- Advance the compute sim (WebGPU backend only) ----------------------
    if (backendIsWebGPURef.current) build.compute(delta);
  });

  // Dev-only debug handle: project the group center + expose hover/hub state.
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    const key = `__sersanNeuralLattice_${anchorId}`;
    (window as unknown as Record<string, unknown>)[key] = {
      mode,
      hasBuild: !!build,
      webgpu: backendIsWebGPURef.current,
      rect,
      get uReveal() {
        return revealDamped.current;
      },
      get hovered() {
        return useNeuralLatticeStore.getState().hovered[surfaceKey];
      },
      get hubGlow() {
        return hubGlow.current.slice();
      },
      get hubs() {
        return rect?.hubs ?? null;
      },
      count: NEURAL_PARTICLE_COUNT,
      project: () => {
        const g = groupRef.current;
        if (!g || !g.visible) return null;
        const v = g.position.clone().project(camera);
        return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
      },
    };
  }

  if (!build) return null;

  return (
    <group ref={groupRef} renderOrder={-1} visible={false}>
      <group ref={innerRef}>
        <mesh
          geometry={build.geometry}
          material={build.material}
          renderOrder={-1}
          frustumCulled={false}
        />
      </group>
    </group>
  );
}
