"use client";

/**
 * NeuralLattice — the SIGNAL STREAM WebGL island (2026-08-21 refactor; the
 * component/file name is kept so Scene.tsx's mount gate stays byte-identical).
 * Round-2 "life pass": the look lives in neuralFieldCompute (phase-separated
 * braid, velocity streaks, clean fracture + spark burst on uFlash, ring
 * shockwaves on uRingFlash, idle breathing) — this driver's state machines
 * are unchanged; it only gained the dev-handle tunables surface below.
 *
 * A braided river of ~9000 particles (3200 compact tier) flows left→right
 * through the section's `[data-lattice-anchor]` rect. Two instances mount on
 * home:
 *   mode "broken"  (Problem, anchor "problem"): laminar until the FRACTURE at
 *     ~55% of the rect, then dispersal into drifting ember debris. Surges ride
 *     in from the left every ~4s (and on the DOM's in-view `bump("broken")`)
 *     and DIE at the fracture with a >1.0 emissive flash that decays at once.
 *     Pane hover → the debris briefly re-coheres toward the spline then falls
 *     apart again (the "what if it were fixed" tease).
 *   mode "healthy" (ProductionGrade, anchor "production"): the same stream
 *     threaded through THREE GUIDE RINGS (eval → trace → guardrail at 40/62/
 *     84% of the rect); particles tighten past each ring. The DOM's sequenced
 *     `bumpCluster("healthy", i)` ignites ring i (>1.0 ring-flash); every ~6s
 *     a surge rides the WHOLE stream and SURVIVES, ringing each ring as it
 *     passes. Pane hover → ring i flares.
 *
 * ANCHORING — camera-LOCKED screen-space placement (contract unchanged): the
 * OUTER group is positioned from the anchor rect's center, quaternion =
 * camera.quaternion, scale = (w·k, h·k, h·k). The spline control points are
 * mode-config uniforms in LOCAL space, so resize = re-measure rect only — no
 * per-particle re-anchoring, no buffer rebuild.
 *
 * STORES (the ONLY cross-layer channel): useNeuralLatticeStore —
 * bump/bumpCluster (DOM in-view writers) + hovered (DOM pane hover/focus) are
 * READ here via getState() in useFrame; pulse decay is written back with the
 * same damp discipline as before. No React commits drive per-frame visuals
 * inside this island (refs + getState only).
 *
 * GATING: Scene.tsx mounts this on `pathname === "/" && island && webgpu`
 * (island = fxBudget.level >= 2) — unchanged. Non-compute backends get the
 * analytic static build from neuralFieldCompute (rest-pose stream, rings lit,
 * fracture dispersed — still uniform-animated). The DOM SVG fallback
 * (use-neural-lattice-fallback.ts, the exact complement) carries the metaphor
 * everywhere else.
 *
 * PHONE BUDGET: `tier === "lite"` builds at NEURAL_PARTICLE_COUNT_COMPACT.
 * The tier is read with `getState()` in the build effect and NEVER subscribed
 * (a subscription here would be a React commit inside the <Canvas> island).
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
import { useTierStore } from "./store/tierStore";
import {
  CLUSTER_COUNT,
  FLOW_SPEED,
  FRACTURE_T,
  SPARK_COUNT,
  NEURAL_PARTICLE_COUNT,
  NEURAL_PARTICLE_COUNT_COMPACT,
  NEURAL_DEPTH_SCALE_FACTOR,
  NEURAL_PARALLAX,
  NEURAL_AUTO_ORBIT,
  NEURAL_ORBIT_FREQ_Y,
  NEURAL_ORBIT_FREQ_X,
  NEURAL_Z_BREATHE,
  RING_T,
  RING_GLOW_FLARE,
  RING_GLOW_DIM,
  RING_GLOW_DAMP,
  RECOHERE_ATTACK,
  RECOHERE_DECAY,
  SURGE_PERIOD_BROKEN,
  SURGE_PERIOD_HEALTHY,
  SURGE_SPEED,
  FLASH_DECAY,
  type LatticeMode,
} from "./neural/neuralLatticeConfig";
import type { NeuralFieldBuild } from "./neural/neuralFieldCompute";

/** Off-screen cull margin in CSS px. */
const CULL_PAD = 220;

/** Where a surge starts (just off the left edge) and overshoots the end. */
const SURGE_START_T = -0.08;
const SURGE_END_HEALTHY = 1.08;

interface SectionRect {
  /** Viewport-x center of the section anchor. */
  cxBase: number;
  w: number;
  h: number;
  /** Document-space top of the anchor. */
  docTop: number;
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
  /** The count the CURRENT build was allocated with (dev debug handle only). */
  const countRef = useRef(NEURAL_PARTICLE_COUNT);

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

      // Phone budget: `getState()`, never a subscription (island commit wedge).
      const count =
        useTierStore.getState().tier === "lite"
          ? NEURAL_PARTICLE_COUNT_COMPACT
          : NEURAL_PARTICLE_COUNT;
      countRef.current = count;

      built = mod.createNeuralFieldBuild({
        THREE,
        webgpu: webgpu as never,
        tsl: tslNs as never,
        gl: gl as never,
        backendIsWebGPU,
        count,
        mode,
      });
      built.uniforms.uFlowSpeed.value = FLOW_SPEED;
      built.uniforms.uFracture.value = FRACTURE_T;
      setBuild(built);
    });

    return () => {
      cancelled = true;
      built?.dispose();
      setBuild(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, gl]);

  // --- Section rect: measured on measureVersion bumps -----------------------
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
    setRect({
      cxBase: r.left + r.width / 2,
      w: r.width,
      h: r.height,
      docTop: r.top + window.scrollY,
    });
    // size.* is included DELIBERATELY: everything stored above is a PIXEL
    // quantity, but sectionStore.setMeasured skips the measureVersion bump
    // when the NORMALIZED spans are unchanged — exactly what a width-only
    // resize produces. Cheap to re-run: this effect only setRect()s; the
    // stream re-anchors through the group transform alone (no rebuild).
  }, [measureVersion, anchorId, size.width, size.height]);

  // --- Per-frame driver ------------------------------------------------------
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const scratch = useRef(new THREE.Vector3());
  const revealDamped = useRef(0);
  const clock = useRef(0);
  const parallaxRef = useRef({ x: 0, y: 0 });
  // Store-pulse decay (bumpCluster targets → ring flashes on healthy; the
  // all-cluster bump("broken") doubles as the surge trigger on broken).
  const pulseEased = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  // Hoisted decay scratch — reused every frame, never allocated in the loop.
  // Safe to hand to setPulse by reference: bump() always REPLACES the store
  // array and bumpCluster() slices before writing, so aliasing cannot corrupt
  // a writer, and this island is the array's only per-frame reader.
  const decayScratch = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  const prevMaxPulse = useRef(0);
  // Surge state machine.
  const surge = useRef({ active: false, t: SURGE_START_T, amp: 0, timer: 0 });
  // Fracture death-flash envelope (broken).
  const flashEnv = useRef(0);
  // Internal ring-flash targets (surge crossings) + the eased uniform values.
  const ringFlashTarget = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  const ringFlashEased = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  // Per-ring damped hover glow (1 = neutral).
  const ringGlow = useRef<number[]>(new Array(CLUSTER_COUNT).fill(1));
  // Broken hover tease — one-shot re-cohere envelope.
  const recohereTarget = useRef(0);
  const recohereEnv = useRef(0);
  const prevHovered = useRef<number | null>(null);
  const surfaceKey = broken ? ("broken" as const) : ("healthy" as const);

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

    // Camera-locked placement of the OUTER group, scaled to the anchor rect.
    const wWorld = rect.w * k;
    const hWorld = rect.h * k;
    const zWorld = hWorld * NEURAL_DEPTH_SCALE_FACTOR;
    scratch.current
      .set((cx - vw / 2) * k, (ih / 2 - cy) * k, -CAMERA_Z)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    group.position.copy(scratch.current);
    group.quaternion.copy(camera.quaternion);
    group.scale.set(wWorld, hWorld, zWorld);

    // Arrival ramp: assemble when the READER arrives (same shape as the
    // lattice build this replaces — scrollStore.reveal gated by a per-section
    // visibility ramp, damped slow enough that the coalesce reads on entry).
    const vis = THREE.MathUtils.clamp(
      (ih + CULL_PAD / 2 - vpTop) / (ih * 0.7),
      0,
      1,
    );
    revealDamped.current = THREE.MathUtils.damp(
      revealDamped.current,
      useScrollStore.getState().reveal * vis,
      2.5,
      delta,
    );

    clock.current += delta;
    const t = clock.current;

    // --- Store pulses: decay the DOM-bumped targets, ease toward them -------
    const store = useNeuralLatticeStore.getState();
    const surface = store[surfaceKey];
    let anyPulse = false;
    const decayed = decayScratch.current;
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      const target = surface[i] ?? 0;
      const d = THREE.MathUtils.damp(target, 0, 4, delta);
      decayed[i] = d < 0.001 ? 0 : d;
      if (target !== 0) anyPulse = true;
    }
    if (anyPulse) store.setPulse(surfaceKey, decayed);
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

    // --- Surge state machine -------------------------------------------------
    const s = surge.current;
    const period = broken ? SURGE_PERIOD_BROKEN : SURGE_PERIOD_HEALTHY;
    // Trigger = the rising edge of the DOM's in-view bump("broken") (all three
    // clusters snap to 1 — the packet that dies on cue) ∨ the mode's own
    // automatic period. No closure — this runs every frame.
    const bumpEdge = broken && maxPulse > 0.5 && prevMaxPulse.current <= 0.5;
    prevMaxPulse.current = maxPulse;
    s.timer += delta;
    if ((bumpEdge || s.timer >= period) && !s.active) {
      s.active = true;
      s.t = SURGE_START_T;
      s.timer = 0;
    }

    if (s.active) {
      const prevT = s.t;
      s.t += delta * SURGE_SPEED;
      s.amp = Math.min(s.amp + delta * 5, 1);
      if (broken) {
        // The surge dies at the fracture: small burst, flash decays at once.
        if (s.t >= FRACTURE_T) {
          s.active = false;
          flashEnv.current = 1;
        }
      } else {
        // The surge survives — ring each guide ring as the head crosses it.
        for (let i = 0; i < RING_T.length; i++) {
          if (prevT < RING_T[i] && s.t >= RING_T[i]) {
            ringFlashTarget.current[i] = 1;
          }
        }
        if (s.t >= SURGE_END_HEALTHY) s.active = false;
      }
    } else {
      s.amp = THREE.MathUtils.damp(s.amp, 0, 10, delta);
    }
    flashEnv.current = THREE.MathUtils.damp(flashEnv.current, 0, FLASH_DECAY, delta);

    // --- Ring flashes: DOM bumpCluster (store pulse) ∨ surge crossings ------
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      ringFlashTarget.current[i] = THREE.MathUtils.damp(
        ringFlashTarget.current[i],
        0,
        2.6,
        delta,
      );
      if (ringFlashTarget.current[i] < 0.001) ringFlashTarget.current[i] = 0;
      const target = Math.max(pulseEased.current[i], ringFlashTarget.current[i]);
      ringFlashEased.current[i] = THREE.MathUtils.damp(
        ringFlashEased.current[i],
        target,
        8,
        delta,
      );
    }

    // --- Hover link (store.hovered — DOM panes are the only writer) ----------
    const hoveredIdx = store.hovered[surfaceKey];
    if (broken) {
      // Rising edge (a pane becomes hovered) → one-shot re-cohere tease: the
      // debris pulls toward the spline, then falls apart again on its own.
      if (hoveredIdx !== prevHovered.current && hoveredIdx !== null) {
        recohereTarget.current = 1;
      }
      recohereTarget.current = THREE.MathUtils.damp(
        recohereTarget.current,
        0,
        RECOHERE_DECAY,
        delta,
      );
      if (recohereTarget.current < 0.001) recohereTarget.current = 0;
      recohereEnv.current = THREE.MathUtils.damp(
        recohereEnv.current,
        recohereTarget.current,
        RECOHERE_ATTACK,
        delta,
      );
    } else {
      for (let i = 0; i < CLUSTER_COUNT; i++) {
        let target = 1;
        if (hoveredIdx !== null && hoveredIdx >= 0) {
          target = hoveredIdx === i ? RING_GLOW_FLARE : RING_GLOW_DIM;
        }
        ringGlow.current[i] = THREE.MathUtils.damp(
          ringGlow.current[i],
          target,
          RING_GLOW_DAMP,
          delta,
        );
      }
    }
    prevHovered.current = hoveredIdx;

    // --- Subtle whole-group life: damped pointer parallax + faint orbit -----
    const ptr = usePointerStore.getState();
    const px = (ptr.smooth.x - 0.5) * 2;
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
    inner.rotation.set(
      Math.sin(t * NEURAL_ORBIT_FREQ_X) * NEURAL_AUTO_ORBIT +
        parallaxRef.current.y,
      Math.sin(t * NEURAL_ORBIT_FREQ_Y) * NEURAL_AUTO_ORBIT +
        parallaxRef.current.x,
      0,
    );
    inner.position.z = Math.sin(t * 0.21) * NEURAL_Z_BREATHE;

    // --- Drive the field uniforms -------------------------------------------
    const u = build.uniforms;
    u.uTime.value = t;
    u.uReveal.value = revealDamped.current;
    u.uSurgeT.value = s.t;
    u.uSurgeAmp.value = s.amp;
    u.uFlash.value = flashEnv.current;
    u.uRecohere.value = recohereEnv.current;
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      u.uRingGlow.array[i] = ringGlow.current[i];
      u.uRingFlash.array[i] = ringFlashEased.current[i];
    }
    // Cursor bend (compute tier): pointer → LOCAL rect space; parked at 1e9
    // when idle, coarse, or outside the band's influence zone. Pure math on
    // the cached rect — zero layout reads in this loop.
    if (ptr.active) {
      const lx = (ptr.smooth.x * vw - cx) / rect.w;
      const ly = (cy - ptr.smooth.y * ih) / rect.h;
      if (lx > -0.75 && lx < 0.75 && ly > -0.75 && ly < 0.75) {
        u.uPointer.value.set(lx, ly, 0);
      } else {
        u.uPointer.value.set(1e9, 1e9, 1e9);
      }
    } else {
      u.uPointer.value.set(1e9, 1e9, 1e9);
    }
    const dpr = Math.min(gl.getPixelRatio(), 2);
    u.uPixelRatio.value = dpr;
    u.uViewport.value.set(size.width * dpr, size.height * dpr);

    // --- Advance the compute sim (WebGPU backend only) ----------------------
    if (backendIsWebGPURef.current) build.compute(delta);
  });

  // Dev-only debug handle.
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
      get surge() {
        return { ...surge.current };
      },
      get flash() {
        return flashEnv.current;
      },
      get recohere() {
        return recohereEnv.current;
      },
      get ringFlash() {
        return ringFlashEased.current.slice();
      },
      get ringGlow() {
        return ringGlow.current.slice();
      },
      get count() {
        return countRef.current;
      },
      /** The live uniform bag — set `.value` (or `.array` entries) from the
       * console for zero-recompile tuning of anything the shader reads. */
      get uniforms() {
        return build ? build.uniforms : null;
      },
      /** Round-2 beauty-pass tunables, snapshot form (write via `uniforms`).
       * sparkCount is BUILD-TIME (baked into the meta buffer — a rebuild is
       * needed to change it; broken mode only). */
      get tunables() {
        const u = build?.uniforms;
        if (!u) return null;
        return {
          envelope: u.uEnvelope.value,
          breathe: u.uBreathe.value,
          shimmer: u.uShimmer.value,
          zBow: u.uZBow.value,
          gap: u.uGap.value,
          stretchGain: u.uStretchGain.value,
          stretchMax: u.uStretchMax.value,
          surgeGain: u.uSurgeGain.value,
          pointSize: u.uPointSize.value,
          flowSpeed: u.uFlowSpeed.value,
          strandPhase: [...u.uStrandPhase.array],
          strandThick: [...u.uStrandThick.array],
          sparkCount: mode === "broken" ? SPARK_COUNT : 0,
        };
      },
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
