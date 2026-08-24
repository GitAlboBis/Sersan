"use client";

/**
 * CrystalCluster — the ROUND-5 W3 "3D stones" island (igloo transplant,
 * research/2026-08-21-igloo-stones-dossier.md): ONE hero crystal per neural
 * section, floating in the open right two-thirds of the same
 * `[data-lattice-anchor]` band the signal stream owns, with the stream
 * demoted to ambient current around/behind it (config-level defaults in
 * neuralLatticeConfig — the round-5 demotion).
 *
 *   mode "broken"  (Problem, anchor "problem"): a FRACTURED CLUSTER of
 *     flat-shaded shards, exploded at rest by igloo's exact recipe (vertex
 *     path in crystalBuild), the gap breathing with the fracture surges
 *     (this driver's own eased read of the store's broken pulses). Row
 *     hover/focus → a brief RE-COHERE: gap →~0 with the NeuralLattice
 *     recohereEnv attack/decay grammar, driven from the SAME store.hovered
 *     (read-only — no store changes), and the cyan rim flashes with it.
 *   mode "healthy" (ProductionGrade, anchor "production"): ONE intact
 *     displaced-icosahedron crystal that slowly rotates upright at section
 *     center (igloo tumble: k·(centered − progress), k = (14,11,6)·sign per
 *     axis, derived from the SAME vpTop/rect math the placement uses — no
 *     gBCR, no scroll listeners) and flashes its rim on ring ignitions (the
 *     eased store pulses).
 *
 * ANCHORING — camera-locked like NeuralLattice, but UNIFORMLY scaled
 * (scale = rect.h·k·CRYSTAL_SCALE) so the mesh is never stretched by the
 * band's aspect; position offsets are rect fractions (crystalConfig
 * CRYSTAL_POS). NO camera writes, ever — SignatureLine stays the only camera
 * authority; this island mounts AFTER it in Scene.tsx.
 *
 * CALLOUT RE-ANCHORING (round-5 W3, DOM-first): each frame (guarded, damped,
 * write-on-change only) the driver projects three anchor points — broken:
 * shard centroids at centr·(1 + gap + idle drift); healthy: fixed bbox-lerp
 * points on the crystal (igloo §4 grammar) — through the mesh rotation +
 * group scale + the camera's perspective (anchors off the group's depth
 * plane, CAMERA_Z/(CAMERA_Z − v.z·s)) to PERCENTAGES OF THE ANCHOR RECT
 * (pure math on the cached rect — zero layout reads) and writes
 * `--callout-N-left`/`--callout-N-top`
 * on the `[data-lattice-anchor]` element. The DOM ghost callouts read them
 * with today's hardcoded positions as fallbacks, so SSR / fallback tier / RM
 * keep the historic placement. Values are damped (CALLOUT_DAMP) so the
 * labels never jitter with the wobble, and written only on >0.1% change.
 *
 * TIERS: build at fxBudget level 2 = lite (1 dispersion sample, single-octave
 * noise, lower detail — read via getState() in the build effect, never a
 * subscription: the island commit-wedge rule). Non-WebGPU backend: the build
 * is a plain node material (no compute anywhere), so the three/webgpu WebGL2
 * fallback compiles and renders it unchanged. RM / tier off: Scene.tsx's
 * gate never mounts the island.
 *
 * STORES: read-only — useNeuralLatticeStore pulses/hovered via getState() in
 * useFrame (NeuralLattice owns the pulse-decay write-back; this island NEVER
 * calls setPulse), scrollStore.reveal for the arrival ramp. Refs + getState
 * only inside useFrame; zero per-frame allocation (the only guarded
 * exception: a short `toFixed` string when a CSS var actually changes).
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { webgpuEnabled } from "./renderer/createRenderer";
import { CAMERA_Z, WORLD_VIEW_HEIGHT } from "./constants";
import { useSectionStore } from "./store/sectionStore";
import { useScrollStore } from "./store/scrollStore";
import { useNeuralLatticeStore } from "./store/neuralLatticeStore";
import { useTierStore } from "./store/tierStore";
import { CLUSTER_COUNT, type LatticeMode } from "./neural/neuralLatticeConfig";
import {
  CRYSTAL_POS,
  CRYSTAL_SCALE,
  FRACTURE_REST_GAP,
  FRACTURE_SURGE_GAIN,
  CRYSTAL_IDLE_DRIFT,
  CRYSTAL_PULSE_DAMP,
  CRYSTAL_RECOHERE_ATTACK,
  CRYSTAL_RECOHERE_DECAY,
  TUMBLE_K,
  TUMBLE_GAIN,
  TUMBLE_RAND,
  WOBBLE_AMP,
  WOBBLE_FREQ,
  WOBBLE_SEEDS,
  CALLOUT_EDGE,
  CALLOUT_LABEL_OFFSET_PX,
  HEALTHY_CALLOUT_ANCHORS,
  BROKEN_CALLOUT_SHARDS,
  CALLOUT_DAMP,
  CALLOUT_WRITE_EPS,
  CALLOUT_LEFT_MIN,
  CALLOUT_LEFT_MAX,
  CALLOUT_EDGE_MIN,
  CALLOUT_EDGE_MAX,
} from "./neural/crystalConfig";
import type { CrystalBuild } from "./neural/crystalBuild";

/** Off-screen cull margin in CSS px (the NeuralLattice value). */
const CULL_PAD = 220;

interface SectionRect {
  cxBase: number;
  w: number;
  h: number;
  docTop: number;
}

export function CrystalCluster({
  mode,
  anchorId,
}: {
  mode: LatticeMode;
  anchorId: string;
}) {
  const { size, camera } = useThree();
  const measureVersion = useSectionStore((s) => s.measureVersion);
  const broken = mode === "broken";
  const surfaceKey = broken ? ("broken" as const) : ("healthy" as const);

  // --- Lazy build (three/webgpu chunk loads ONLY here) ----------------------
  const [build, setBuild] = useState<CrystalBuild | null>(null);
  const liteRef = useRef(false);

  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let built: CrystalBuild | null = null;

    void Promise.all([
      import("three/webgpu"),
      import("three/tsl"),
      import("./neural/crystalBuild"),
    ]).then(([webgpu, tslNs, mod]) => {
      if (cancelled) return;
      // Phone budget: `getState()`, never a subscription (commit wedge).
      const lite = useTierStore.getState().fxBudget.level <= 2;
      liteRef.current = lite;
      built = mod.createCrystalBuild({
        webgpu: webgpu as never,
        tsl: tslNs as never,
        mode,
        lite,
      });
      setBuild(built);
    });

    return () => {
      cancelled = true;
      built?.dispose();
      setBuild(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // --- Section rect + the callout CSS-var host ------------------------------
  const [rect, setRect] = useState<SectionRect | null>(null);
  const anchorElRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(
      `[data-lattice-anchor="${anchorId}"]`,
    );
    anchorElRef.current = el;
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
    // size.* deliberately included — same rationale as NeuralLattice: pixel
    // quantities, re-run is a cheap setRect (the crystal re-anchors through
    // the group transform alone).
  }, [measureVersion, anchorId, size.width, size.height]);

  // Unmount-only cleanup: drop the CSS-var overrides so the DOM callouts
  // fall back to their hardcoded positions.
  useEffect(() => {
    return () => {
      const el = anchorElRef.current;
      if (!el) return;
      for (let i = 0; i < CLUSTER_COUNT; i++) {
        el.style.removeProperty(`--callout-${i}-left`);
        el.style.removeProperty(`--callout-${i}-top`);
      }
    };
  }, []);

  // --- Per-frame driver -----------------------------------------------------
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const scratch = useRef(new THREE.Vector3());
  const anchorScratch = useRef(new THREE.Vector3());
  const revealDamped = useRef(0);
  const clock = useRef(0);
  const pulseEased = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  const recohereTarget = useRef(0);
  const recohereEnv = useRef(0);
  const prevHovered = useRef<number | null>(null);
  const gapRef = useRef(broken ? FRACTURE_REST_GAP : 0);
  const flashRef = useRef(0);
  // Damped projected callout values (per index: left%, edge-offset%) + the
  // last WRITTEN values (write-on-change gate) + a first-frame snap flag.
  const calloutVals = useRef<number[]>(new Array(CLUSTER_COUNT * 2).fill(0));
  const calloutWritten = useRef<number[]>(
    new Array(CLUSTER_COUNT * 2).fill(-1e9),
  );
  const calloutInit = useRef(false);

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    const mesh = meshRef.current;
    if (!group || !mesh || !rect || !build) return;
    const delta = Math.min(rawDelta, 1 / 30);

    const ih = size.height;
    const vw = size.width;
    const k = WORLD_VIEW_HEIGHT / ih;
    const scrollY = window.scrollY;

    const vpTop = rect.docTop - scrollY;
    const pos = CRYSTAL_POS[mode];
    // Crystal center in viewport px (CSS y down; config +y is up).
    const cx = rect.cxBase + pos[0] * rect.w;
    const cy = vpTop + rect.h / 2 - pos[1] * rect.h;

    if (vpTop + rect.h < -CULL_PAD || vpTop > ih + CULL_PAD) {
      group.visible = false;
      return;
    }
    group.visible = true;

    // Arrival ramp — the NeuralLattice shape (scrollStore.reveal × a
    // visibility ramp, damped slow enough to read on entry).
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
    const reveal = revealDamped.current;

    // Camera-locked placement, UNIFORM scale (see header).
    const s = rect.h * k * CRYSTAL_SCALE * (0.8 + 0.2 * reveal);
    scratch.current
      .set((cx - vw / 2) * k, (ih / 2 - cy) * k, -CAMERA_Z)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    group.position.copy(scratch.current);
    group.quaternion.copy(camera.quaternion);
    group.scale.setScalar(s);

    clock.current += delta;
    const t = clock.current;

    // --- Igloo scroll tumble: k·rand·gain·(centered − progress) per axis,
    // settling upright when the band is centered; + the verbatim idle wobble
    // sin(t·0.3 + seed)·0.1. Centering derives from the SAME vpTop/rect math
    // as the placement (no gBCR, no scroll listeners). ---------------------
    const a = (vpTop + rect.h / 2 - ih / 2) / ih;
    const gain = TUMBLE_GAIN[mode];
    const rnd = TUMBLE_RAND[mode];
    mesh.rotation.set(
      TUMBLE_K[0] * rnd[0] * gain * a +
        Math.sin(t * WOBBLE_FREQ + WOBBLE_SEEDS[0]) * WOBBLE_AMP,
      TUMBLE_K[1] * rnd[1] * gain * a +
        Math.sin(t * WOBBLE_FREQ + WOBBLE_SEEDS[1]) * WOBBLE_AMP,
      TUMBLE_K[2] * rnd[2] * gain * a +
        Math.sin(t * WOBBLE_FREQ + WOBBLE_SEEDS[2]) * WOBBLE_AMP,
    );

    // --- Store link (read-only): eased pulses + the hover envelope --------
    // NeuralLattice owns the pulse DECAY write-back for both surfaces (it is
    // mounted in the same Scene gate) — this island only eases toward the
    // decaying targets, never a second setPulse writer.
    const store = useNeuralLatticeStore.getState();
    const surface = store[surfaceKey];
    let maxPulse = 0;
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      pulseEased.current[i] = THREE.MathUtils.damp(
        pulseEased.current[i],
        surface[i] ?? 0,
        CRYSTAL_PULSE_DAMP,
        delta,
      );
      if (pulseEased.current[i] > maxPulse) maxPulse = pulseEased.current[i];
    }
    const hoveredIdx = store.hovered[surfaceKey];
    if (broken) {
      // Rising edge (a row ignites) → the one-shot re-cohere (the
      // NeuralLattice recohereEnv grammar: fast attack, slow decay).
      if (hoveredIdx !== prevHovered.current && hoveredIdx !== null) {
        recohereTarget.current = 1;
      }
      recohereTarget.current = THREE.MathUtils.damp(
        recohereTarget.current,
        0,
        CRYSTAL_RECOHERE_DECAY,
        delta,
      );
      if (recohereTarget.current < 0.001) recohereTarget.current = 0;
      recohereEnv.current = THREE.MathUtils.damp(
        recohereEnv.current,
        recohereTarget.current,
        CRYSTAL_RECOHERE_ATTACK,
        delta,
      );
      // Gap: rest ≈ exploded, breathing outward with the fracture surges,
      // collapsing toward 0 while the re-cohere envelope burns.
      gapRef.current =
        FRACTURE_REST_GAP *
        (1 + FRACTURE_SURGE_GAIN * maxPulse) *
        (1 - Math.min(recohereEnv.current, 1));
      flashRef.current = Math.min(recohereEnv.current, 1);
    } else {
      // Healthy: the rim flashes with the ring ignitions.
      flashRef.current = Math.min(maxPulse, 1);
    }
    prevHovered.current = hoveredIdx;

    // --- Drive the uniforms ------------------------------------------------
    const u = build.uniforms;
    u.uTime.value = t;
    u.uReveal.value = reveal;
    u.uFlash.value = flashRef.current;
    u.uGap.value = gapRef.current;
    u.uCamDist0.value = camera.position.distanceTo(group.position);
    u.uWorldScale.value = s;

    // --- Callout re-anchoring: project 3 anchors → CSS vars ----------------
    // Pure math on the cached rect + the rotation just written; damped so
    // the labels never jitter; written only on >CALLOUT_WRITE_EPS% change.
    const el = anchorElRef.current;
    if (el) {
      // px-per-crystal-unit at the group's depth plane (== s / k).
      const pxScale = rect.h * CRYSTAL_SCALE * (0.8 + 0.2 * reveal);
      const rectLeft = rect.cxBase - rect.w / 2;
      const offPct = (CALLOUT_LABEL_OFFSET_PX / rect.h) * 100;
      for (let i = 0; i < CLUSTER_COUNT; i++) {
        const v = anchorScratch.current;
        if (broken) {
          const si = BROKEN_CALLOUT_SHARDS[i];
          const centr = build.shardCentrs[si];
          const rand = build.shardRands[si];
          if (!centr || !rand) continue;
          // Shard centroid = centr·(1 + gap + idle drift) — the exact twin
          // of the vertex path's explode term (rotate3D pivots on the
          // centroid, so it never moves it).
          const drift =
            rand[1] *
            Math.sin(rand[0] * 5 + t * 0.5) *
            CRYSTAL_IDLE_DRIFT;
          const m = 1 + gapRef.current + drift;
          v.set(centr[0] * m, centr[1] * m, centr[2] * m);
        } else {
          const p = HEALTHY_CALLOUT_ANCHORS[i];
          v.set(p[0], p[1], p[2]);
        }
        v.applyEuler(mesh.rotation);
        // Perspective twin of the render path (check fix): the group sits at
        // camera-space depth −CAMERA_Z with its quaternion = the camera's, so
        // the anchor's camera-space offset is exactly v·s and its depth is
        // CAMERA_Z − v.z·s. The px↔world factor k holds only AT the group
        // plane — an anchor rotated toward the camera (broken shard centroids
        // reach ~2+ world units at surge) projects up to ~20% wider. Scale
        // the FULL viewport-center offset (crystal center + local offset) by
        // CAMERA_Z/(CAMERA_Z − v.z·s), then rebase onto the anchor rect.
        // Denominator floored at 1 world unit so a pathological pose can
        // never explode the percentages (the clamps below also cap them).
        const persp = CAMERA_Z / Math.max(CAMERA_Z - v.z * s, 1);
        const ax = vw / 2 + ((cx - vw / 2) + v.x * pxScale) * persp - rectLeft;
        const ay = ih / 2 - ((ih / 2 - cy) + v.y * pxScale) * persp - vpTop;
        const leftT = THREE.MathUtils.clamp(
          (ax / rect.w) * 100,
          CALLOUT_LEFT_MIN,
          CALLOUT_LEFT_MAX,
        );
        const topPct = (ay / rect.h) * 100;
        // Edge-relative label offset: `top` callouts hang ABOVE the anchor
        // (leader points down at it), `bottom` callouts sit BELOW it.
        const edgeT = THREE.MathUtils.clamp(
          CALLOUT_EDGE[i] === "top"
            ? topPct - offPct
            : 100 - topPct - offPct,
          CALLOUT_EDGE_MIN,
          CALLOUT_EDGE_MAX,
        );
        const li = i * 2;
        const ei = i * 2 + 1;
        if (!calloutInit.current) {
          calloutVals.current[li] = leftT;
          calloutVals.current[ei] = edgeT;
        } else {
          calloutVals.current[li] = THREE.MathUtils.damp(
            calloutVals.current[li],
            leftT,
            CALLOUT_DAMP,
            delta,
          );
          calloutVals.current[ei] = THREE.MathUtils.damp(
            calloutVals.current[ei],
            edgeT,
            CALLOUT_DAMP,
            delta,
          );
        }
        if (
          Math.abs(calloutVals.current[li] - calloutWritten.current[li]) >
          CALLOUT_WRITE_EPS
        ) {
          calloutWritten.current[li] = calloutVals.current[li];
          el.style.setProperty(
            `--callout-${i}-left`,
            calloutVals.current[li].toFixed(2) + "%",
          );
        }
        if (
          Math.abs(calloutVals.current[ei] - calloutWritten.current[ei]) >
          CALLOUT_WRITE_EPS
        ) {
          calloutWritten.current[ei] = calloutVals.current[ei];
          el.style.setProperty(
            `--callout-${i}-top`,
            calloutVals.current[ei].toFixed(2) + "%",
          );
        }
      }
      calloutInit.current = true;
    }
  });

  // Dev-only debug handle (the NeuralLattice idiom).
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    const key = `__sersanCrystal_${anchorId}`;
    (window as unknown as Record<string, unknown>)[key] = {
      mode,
      hasBuild: !!build,
      lite: liteRef.current,
      rect,
      get uReveal() {
        return revealDamped.current;
      },
      get gap() {
        return gapRef.current;
      },
      get flash() {
        return flashRef.current;
      },
      get recohere() {
        return recohereEnv.current;
      },
      get pulses() {
        return pulseEased.current.slice();
      },
      get hovered() {
        return useNeuralLatticeStore.getState().hovered[surfaceKey];
      },
      /** Projected callout state: [left%, edgeOffset%] per callout index. */
      get callouts() {
        const out: number[][] = [];
        for (let i = 0; i < CLUSTER_COUNT; i++) {
          out.push([
            calloutVals.current[i * 2],
            calloutVals.current[i * 2 + 1],
          ]);
        }
        return out;
      },
      get shardCentrs() {
        return build ? build.shardCentrs : null;
      },
      /** The live uniform bag — set `.value` from the console for
       * zero-recompile tuning (ior/CA/thickness/rough/rim/alpha/fade/spots/
       * drift/spin — igloo numbers as defaults). */
      get uniforms() {
        return build ? build.uniforms : null;
      },
      get tunables() {
        const u = build?.uniforms;
        if (!u) return null;
        return {
          ior: u.uIor.value,
          ca: u.uCA.value,
          thickness: u.uThickness.value,
          rough: u.uRough.value,
          rimBase: u.uRimBase.value,
          rimFlash: u.uRimFlash.value,
          alpha: u.uAlpha.value,
          fadeProgress: u.uFadeProgress.value,
          spotGain: u.uSpotGain.value,
          drift: u.uDrift.value,
          shardSpin: u.uShardSpin.value,
          // round-7 realism pass (crystalBuild header):
          bodyDarken: u.uBodyDarken.value,
          specPow: u.uSpecPow.value,
          specGain: u.uSpecGain.value,
          fillGain: u.uFillGain.value,
          facetJit: u.uFacetJit.value,
          caEdge: u.uCAEdge.value,
          sparkleGain: u.uSparkleGain.value, // dead node on lite builds
          frostAmp: u.uFrostAmp.value, // dead node on lite builds
        };
      },
    };
  }

  if (!build) return null;

  return (
    <group ref={groupRef} renderOrder={-3} visible={false}>
      {/* renderOrder −3: painted before the constellation layers (−2/−1) —
          the additive net reads as current flowing in FRONT of the crystal. */}
      <mesh
        ref={meshRef}
        geometry={build.geometry}
        material={build.material}
        renderOrder={-3}
        frustumCulled={false}
      />
    </group>
  );
}
