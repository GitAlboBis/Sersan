"use client";

/**
 * NeuralLattice — the NEURAL PLEXUS WebGL island (2026-08-22 round-8-D
 * re-author; the component/file name is kept so Scene.tsx's mount gate stays
 * byte-identical). The look lives in neuralFieldCompute: a dense VOLUMETRIC
 * BRAIN PLEXUS — ~103 nodes (lite ~56) in an organic cloud filling the band,
 * ~227 near-neighbour LINKS (lite ~110), and a FILLED STAR-GLOW core per node
 * — replacing the round-6 layered diagram and its orbiting halos (the owner's
 * "cerchi vuoti"). THIS DRIVER IS UNCHANGED: no logic moved in round-8-D or
 * round-8-G, only the meaning of the mapping constants it already wrote.
 *
 * ROUND-8-G (2026-08-24) — THE LINKS ARE REAL LINES. Particles strung along an
 * edge could never be the reference's thin crisp continuous lines (a glowing
 * ≥4px sprite and a 1px line are different primitives), so the links are now
 * ONE `LineSegments` built by neuralFieldCompute.buildLinkLineLayer from the
 * same getPlexus tables. The ONLY change in this file is the extra
 * `<primitive object={build.links.object} />` mount below (plus its dispose,
 * which rides the existing build.dispose()) and the new dev-handle tunables —
 * no state-machine change, no new per-frame work, no new store reads.
 *
 * ~9000 particles (3200 compact tier) fill the section's
 * `[data-lattice-anchor]` rect. Two instances mount on home:
 *   mode "broken"  (Problem, anchor "problem"): the cloud is intact left of
 *     the fracture (nodeT 0.62 — spatially AT the fractured crystal) and
 *     DEGRADED right of it: links fray into ember debris, far stars drift off
 *     station. A PULSE sweeps the cloud left→right every ~2.4s (and on the
 *     DOM's in-view `bump("broken")`) and DIES at the fracture with a >1.0
 *     emissive flash + spark burst + nebula flare. Row ignition (setHovered)
 *     → a BIGGER re-cohere tease (frayed links re-connect, stars pull back) +
 *     a localized uRowGlow swell in the row's region of the cloud.
 *   mode "healthy" (ProductionGrade, anchor "production"): the whole cloud is
 *     intact; the three ignition REGIONS are eval → trace → guardrail (their
 *     round-4 membrane discs are retired since round-8 — the owner's
 *     unexplained "cerchi"; config MEMBRANE_ALPHA 0 gates the mesh build, so
 *     `build.membrane` is null). The DOM's sequenced
 *     `bumpCluster("healthy", i)` ignites region i's STARS (>1.0 flash +
 *     shockwave); every ~3.5s a pulse traverses the WHOLE cloud and SURVIVES,
 *     flashing each region as it crosses (RING_T = [.25,.5,.75] — since
 *     round-8-D these are nodeT REGION centres, blended gaussian-wise in the
 *     shader, not layer depths). Row ignition → region i's stars flare + its
 *     links tighten/brighten (uRowGlow).
 *
 * ANCHORING — camera-LOCKED screen-space placement (contract unchanged): the
 * OUTER group is positioned from the anchor rect's center, quaternion =
 * camera.quaternion, scale = (w·k, h·k, h·k). The node/link tables are
 * generated once by `getPlexus(mode, density)` and ride in LOCAL-space
 * uniformArrays, so resize = re-measure rect only — no per-particle
 * re-anchoring, no buffer rebuild.
 *
 * STORES (the ONLY cross-layer channel): useNeuralLatticeStore —
 * bump/bumpCluster (DOM in-view writers) + hovered (DOM row hover/focus) are
 * READ here via getState() in useFrame; pulse decay is written back with the
 * same damp discipline as before. No React commits drive per-frame visuals
 * inside this island (refs + getState only).
 *
 * GATING: Scene.tsx mounts this on `pathname === "/" && island && webgpu`
 * (island = fxBudget.level >= 2) — unchanged. Non-compute backends get the
 * analytic static build from neuralFieldCompute (a still-but-igniting plexus:
 * the SAME cloud at rest, pulses/flashes/fray/packets all uniform-animated).
 * The DOM SVG fallback (use-neural-lattice-fallback.ts, the exact
 * complement) draws the same plexus — same generator, `svg` density — with
 * static star cores and no rings, everywhere else.
 *
 * PHONE BUDGET: `tier === "lite"` builds at NEURAL_PARTICLE_COUNT_COMPACT.
 * The tier is read with `getState()` in the build effect and NEVER subscribed
 * (a subscription here would be a React commit inside the <Canvas> island).
 *
 * ROUND-4 §B carried forward (igloo-mined effects): this driver additionally
 *   - integrates the FLOW CLOCK (uFlowTime += dt·(1 + uVelFlow·vel)) and the
 *     damped uScrollVel from scrollStore velocity (§B.3 — the plexus swells,
 *     streaks longer, curls harder and flows faster while you scroll, calm
 *     at rest; velocity is 0 under RM/native scroll so RM stays calm by
 *     construction);
 *   - latches + damps each ignition REGION's MEMBRANE seal (0→1 on first
 *     ignition) and integrates its band phase (ripple = ×3 phase speed while
 *     uRingFlash burns — integration, never a backwards jump) (§B.1 — since
 *     round-8 the membrane MESH is retired by default (config MEMBRANE_ALPHA
 *     0 skips its build → `build.membrane` is null and nothing mounts); this
 *     cheap seal/phase integration is deliberately KEPT so a config revival
 *     needs zero driver work);
 *   - integrates the broken NEBULA wisp drift (igloo t·0.05, kicked +0.3
 *     while the death-flash burns) (§B.2 — the nebula survived the round-8
 *     review: it reads as fracture smoke, not a floating circle);
 *   - renders the mode's extra layer mesh (membrane / nebula) inside the SAME
 *     camera-locked inner group at renderOrder −2 (behind the particles; both
 *     additive, so ordering is cosmetic). Membrane: null since round-8.
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
  ROW_GLOW_DAMP,
  RECOHERE_ATTACK,
  RECOHERE_DECAY,
  RECOHERE_ROW_BOOST,
  SURGE_PERIOD_BROKEN,
  SURGE_PERIOD_HEALTHY,
  SURGE_SPEED,
  FLASH_DECAY,
  MEMBRANE_SEAL_DAMP,
  MEMBRANE_PHASE_SPEED,
  MEMBRANE_RIPPLE_SPEED,
  NEBULA_DRIFT_SPEED,
  NEBULA_DRIFT_KICK,
  VEL_DAMP,
  type LatticeMode,
} from "./neural/neuralLatticeConfig";
import type { NeuralFieldBuild } from "./neural/neuralFieldCompute";

/** Off-screen cull margin in CSS px. */
const CULL_PAD = 220;

/** Where a surge starts (just off the left edge) and overshoots the end. */
const SURGE_START_T = -0.08;
const SURGE_END_HEALTHY = 1.08;

/** Membrane band-phase wrap — an EXACT multiple of 2π (the shader only reads
 * the phase through sin(), so subtracting it is invisible) that keeps the
 * accumulator inside fp32-comfortable range on long sessions. */
const MEMBRANE_PHASE_WRAP = Math.PI * 2 * 512;

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
    // net re-anchors through the group transform alone (no rebuild).
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
  // Round-3 row-reactive current: per-row damped attention glow (0 = idle),
  // driven from the SAME store.hovered value the ring flare / re-cohere tease
  // read — the DOM ledger rows are the only writer (setHovered unchanged).
  const rowGlow = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  // Broken hover tease — one-shot re-cohere envelope.
  const recohereTarget = useRef(0);
  const recohereEnv = useRef(0);
  const prevHovered = useRef<number | null>(null);
  // Round-4 §B.3: damped scroll velocity + the integrated flow clock.
  const scrollVel = useRef(0);
  const flowTime = useRef(0);
  // Round-4 §B.1 (healthy): per-ring membrane seal latch + integrated band
  // phase. §B.2 (broken): integrated nebula wisp drift.
  const membraneSealTarget = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  const membraneSeal = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  const membranePhase = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  const nebulaDrift = useRef(0);
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
        // The pulse dies at the fracture (before the 4th layer ever lights):
        // small burst, flash decays at once.
        if (s.t >= FRACTURE_T) {
          s.active = false;
          flashEnv.current = 1;
        }
      } else {
        // The pulse survives — flash each MIDDLE LAYER (eval → trace →
        // guardrail, RING_T = the layer depths) as the head crosses it.
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

    // --- Hover link (store.hovered — the DOM ledger rows are the only
    // writer; round-3 de-card: rows replaced the panes, same store call) -----
    const hoveredIdx = store.hovered[surfaceKey];
    if (broken) {
      // Rising edge (a row ignites) → one-shot re-cohere tease. Round-3:
      // fired at RECOHERE_ROW_BOOST (>1 saturates the shader's uRecohere·0.9
      // term) — the BIGGER tease: debris fully re-coheres for a beat before
      // falling apart again on its own.
      if (hoveredIdx !== prevHovered.current && hoveredIdx !== null) {
        recohereTarget.current = RECOHERE_ROW_BOOST;
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
    // Round-3 row glow (BOTH modes): damp each row's attention 0↔1. The
    // shader localizes it (broken: gaussian zone; healthy: ring segment).
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      rowGlow.current[i] = THREE.MathUtils.damp(
        rowGlow.current[i],
        hoveredIdx === i ? 1 : 0,
        ROW_GLOW_DAMP,
        delta,
      );
    }

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
      u.uRowGlow.array[i] = rowGlow.current[i];
    }

    // --- Round-4 §B.3: scroll-velocity net ----------------------------------
    // scrollStore velocity is px/frame-ish (0 under RM/native scroll — the
    // fields stay calm there by construction). Damped so the swell/streak/
    // curl response is C1 and only a genuine flick registers.
    const velNorm = Math.min(
      Math.abs(useScrollStore.getState().velocity) /
        Math.max(u.uVelNorm.value, 1),
      1,
    );
    scrollVel.current = THREE.MathUtils.damp(
      scrollVel.current,
      velNorm,
      VEL_DAMP,
      delta,
    );
    u.uScrollVel.value = scrollVel.current;
    // The flow clock: 1×/s at rest, up to (1 + uVelFlow)× while scrolling.
    // Integrated HERE (not scaled in-shader) so a velocity change bends the
    // flow rate without teleporting every particle's phase.
    flowTime.current += delta * (1 + u.uVelFlow.value * scrollVel.current);
    u.uFlowTime.value = flowTime.current;

    // --- Round-4 §B.1/§B.2: membrane seal+phase / nebula drift --------------
    // Aspect correction for both quad layers (screen-circular discs inside
    // the (w·k, h·k)-scaled group). Pure math on the cached rect.
    u.uPlaneAspect.value = rect.h / Math.max(rect.w, 1);
    if (!broken) {
      for (let i = 0; i < CLUSTER_COUNT; i++) {
        // Seal latch: the first ignition (bumpCluster or a surge crossing —
        // both land in ringFlashEased) closes membrane i for good; the damp
        // makes the disc visibly grow shut while the flash decays (igloo
        // ring-seal read). ROUND-8: the membrane mesh itself is retired
        // (build.membrane is null) — this integration keeps running into the
        // live uniforms so a config revival (MEMBRANE_ALPHA > 0) needs zero
        // driver work; three scalar damps/adds per frame is noise.
        if (ringFlashEased.current[i] > 0.15) membraneSealTarget.current[i] = 1;
        membraneSeal.current[i] = THREE.MathUtils.damp(
          membraneSeal.current[i],
          membraneSealTarget.current[i],
          MEMBRANE_SEAL_DAMP,
          delta,
        );
        // Band phase: ×(1 + RIPPLE·flash) speed while the flash burns — the
        // surge passage visibly ripples the membrane, and because this is an
        // integral the decay never runs the bands backwards.
        membranePhase.current[i] +=
          delta *
          MEMBRANE_PHASE_SPEED *
          (1 + MEMBRANE_RIPPLE_SPEED * ringFlashEased.current[i]);
        if (membranePhase.current[i] > MEMBRANE_PHASE_WRAP)
          membranePhase.current[i] -= MEMBRANE_PHASE_WRAP;
        u.uMembraneSeal.array[i] = membraneSeal.current[i];
        u.uMembranePhase.array[i] = membranePhase.current[i];
      }
    } else {
      // Nebula wisp drift: igloo's slow t·0.05, kicked +NEBULA_DRIFT_KICK
      // while the surge death-flash burns (~0.5s at FLASH_DECAY 4).
      nebulaDrift.current +=
        delta * (NEBULA_DRIFT_SPEED + NEBULA_DRIFT_KICK * flashEnv.current);
      u.uNebulaDrift.value = nebulaDrift.current;
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
      get rowGlow() {
        return rowGlow.current.slice();
      },
      get count() {
        return countRef.current;
      },
      // Round-4 §B live state.
      get scrollVel() {
        return scrollVel.current;
      },
      get flowTime() {
        return flowTime.current;
      },
      get membraneSeal() {
        return membraneSeal.current.slice();
      },
      get nebulaDrift() {
        return nebulaDrift.current;
      },
      /** The live uniform bag — set `.value` (or `.array` entries) from the
       * console for zero-recompile tuning of anything the shader reads. */
      get uniforms() {
        return build ? build.uniforms : null;
      },
      /** Round-2 + round-3 tunables, snapshot form (write via `uniforms`).
       * sparkCount is BUILD-TIME (baked into the meta buffer — a rebuild is
       * needed to change it; broken mode only). Round-3 knobs: curl (compute
       * tier only), dof (0 = flat round-2 look), rowGain/rowSwell (the
       * row-reactive current's brightness / width response). */
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
          // ROUND-8-G: the link LINE layer + the traffic ramp that rides it.
          // linkLines/linkVerts are BUILD-TIME (baked geometry — LINK_SEGMENTS
          // needs a rebuild, not a uniform write).
          linkLines: build?.links.edgeCount ?? 0,
          linkVerts: build?.links.vertexCount ?? 0,
          lineAlpha: u.uLineAlpha.value,
          lineEmissive: u.uLineEmissive.value,
          lineLumMax: u.uLineLumMax.value,
          lineBlue: u.uLineBlue.value,
          lineSurgeGain: u.uLineSurgeGain.value,
          lineRowGain: u.uLineRowGain.value,
          dustAlpha: u.uDustAlpha.value,
          beadAlpha: u.uBeadAlpha.value,
          strandPhase: [...u.uStrandPhase.array],
          strandThick: [...u.uStrandThick.array],
          sparkCount: mode === "broken" ? SPARK_COUNT : 0,
          curl: u.uCurl.value,
          dof: u.uDof.value,
          rowGain: u.uRowGain.value,
          rowSwell: u.uRowSwell.value,
          // Round-4 §B knobs (write via `uniforms`): the uScrollVel response
          // gains + the membrane / nebula looks. velFlow + velNorm are
          // driver-read (they shape the integration, not a shader).
          // ROUND-8: membraneAlpha/membraneBulge are INERT at the default —
          // config MEMBRANE_ALPHA 0 skips the mesh build, so no shader reads
          // them; reviving needs the config constant > 0 + a rebuild, not
          // this live knob.
          velNorm: u.uVelNorm.value,
          velSwell: u.uVelSwell.value,
          velStretch: u.uVelStretch.value,
          velFlow: u.uVelFlow.value,
          velCurl: u.uVelCurl.value,
          velDebris: u.uVelDebris.value,
          membraneAlpha: u.uMembraneAlpha.value,
          membraneBulge: u.uMembraneBulge.value,
          nebulaAlpha: u.uNebulaAlpha.value,
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
        {/* Round-4 mined-effect layers — same camera-locked frame, behind the
            particles (additive → ordering is cosmetic, never occluding). */}
        {build.membrane && (
          <mesh
            geometry={build.membrane.geometry}
            material={build.membrane.material}
            renderOrder={-2}
            frustumCulled={false}
          />
        )}
        {build.nebula && (
          <mesh
            geometry={build.nebula.geometry}
            material={build.nebula.material}
            renderOrder={-2}
            frustumCulled={false}
          />
        )}
        {/* ROUND-8-G — the plexus LINKS, as real line geometry: ONE
            LineSegments (one draw call) built from the same getPlexus tables
            the particles read, mounted with <primitive> exactly like
            CrystalCluster mounts crystalPlexus's net. renderOrder / culling
            are set on the object in the build. */}
        <primitive object={build.links.object} />
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
