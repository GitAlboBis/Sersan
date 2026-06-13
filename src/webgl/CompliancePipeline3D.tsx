"use client";

/**
 * CompliancePipeline3D — the /trust compliance-pipeline centerpiece (step 7).
 *
 * A camera-locked WebGL group painted by the persistent canvas BEHIND the SVG
 * pipeline card (renderOrder -1; the card stays bg-surface/40 so the 3D shows
 * through). The SVG <CompliancePipeline /> stays the legible, accessible diagram
 * on EVERY tier — this is a SUBORDINATE bloomed echo (the AUGMENT decision).
 *
 * It hosts two children, both authored in the group's LOCAL space
 * (linkedParticlesConfig — a unit-ish rect mapped to the 6 stage centers):
 *   1. a TSL dashed-emissive WIREFRAME conduit (core TubeGeometry through the 6
 *      stage centers + createPipelineWireMaterial), opted into the EXISTING
 *      PostFXNodes selective bloom via >1.0 emissive + toneMapped:false;
 *   2. a TSL LINKED-PARTICLE sim (createLinkedParticlesBuild) flowing Input→
 *      Output with per-stage ignition.
 *
 * ANCHORING — camera-LOCKED screen-space placement, identical contract to
 * RailPlanes / ResourcePreviewPlane (see their headers for the full derivation):
 *
 *     camera-space (x, y, −CAMERA_Z), x = (cx − vw/2)·k, y = (ih/2 − cy)·k
 *     world = camera.position + camera.quaternion · (x, y, −CAMERA_Z)
 *     group.quaternion = camera.quaternion ; group.scale = (w·k, h·k, 1)
 *
 * This OVERRIDES the tsl-particles plan's world-anchor recommendation: a mid-page
 * world object de-registers under SignatureLine's lookAt tilt; a camera-locked
 * group at constant camera-space depth projects to an EXACT affine screen rect
 * under any camera pose, so it stays pixel-registered to the SVG card while the
 * line's tilt is active. The card rect is read from sectionStore.spans["pipeline"]
 * on measureVersion bumps (reactive subscribe) — NEVER getBoundingClientRect per
 * frame; cy is derived from the live window scroll + the span's measured top.
 *
 * GATING (the fallback matrix): Scene.tsx mounts this only on
 * `pathname === "/trust" && tier === "full" && webgpu`. Inside, a defense-in-
 * depth webgpuEnabled() guard fences the lazy TSL import, and the COMPUTE sim is
 * gated on the TRUE WebGPU sub-backend (backend.isWebGLBackend !== true &&
 * typeof gl.compute === "function", mirror HeroLogo) — on WebGL2-fallback this
 * renders NOTHING (the SVG is the baseline).
 *
 * Frame order: mounted AFTER SignatureLine (Scene JSX order), so within R3F's
 * priority-0 list its useFrame runs AFTER the single camera authority has
 * written camera.position/quaternion for the frame.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { webgpuEnabled } from "./renderer/createRenderer";
import { CAMERA_Z, WORLD_VIEW_HEIGHT } from "./constants";
import { useSectionStore } from "./store/sectionStore";
import { useScrollStore } from "./store/scrollStore";
import { useCompliancePipelineStore } from "./store/compliancePipelineStore";
import {
  STAGE_COUNT,
  STAGE_X,
  CONDUIT_HALF,
  COUNT_BY_TIER,
  TOTAL_DURATION,
  WIRE_DASH_SPEED,
} from "./gpgpu/linkedParticlesConfig";
import type { PipelineWireUniforms } from "./materials/compliancePipelineNodeMaterial";
import type { LinkedParticlesBuild } from "./gpgpu/linkedParticlesNodeSim";

/** Off-screen cull margin in CSS px. */
const CULL_PAD = 220;

/** The measured card rect (CSS px, document space). */
interface CardRect {
  /** Viewport-x center when scrollY would place the card top at `docTop`. */
  cxBase: number;
  w: number;
  h: number;
  /** Document-space top of the card (= span.start · scrollHeight). */
  docTop: number;
}

interface WireBuild {
  material: THREE.Material;
  uniforms: PipelineWireUniforms;
}

/** Build the conduit wireframe geometry in LOCAL space (core three only). */
function buildWireGeometry(): THREE.TubeGeometry {
  // A smooth conduit through the 6 stage centers, CONTAINED to the inset
  // conduit span (CONDUIT_HALF already insets ≈0.78× of |STAGE_X[0]| so the
  // wire + its bloom halo stay inside the card's ±0.5 local edges, matching the
  // particle field). Map each stage X to the inset half-width.
  const inset = CONDUIT_HALF / Math.abs(STAGE_X[0]);
  const points = STAGE_X.map((x) => new THREE.Vector3(x * inset, 0, 0));
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  // Thin tube: tubularSegments high (smooth dash), radius small (a wire, not a
  // pipe), radialSegments low (cheap — it's a subtle echo behind the SVG).
  return new THREE.TubeGeometry(curve, 96, 0.009, 6, false);
}

export function CompliancePipeline3D({ tier }: { tier: "full" | "lite" }) {
  const { size, camera, gl } = useThree();

  // Reactive only on measure bumps (rare). Per-frame state goes through getState().
  const measureVersion = useSectionStore((s) => s.measureVersion);

  // --- Lazy TSL builds: wireframe material + the linked-particle sim ---------
  // The three/webgpu + three/tsl chunk loads ONLY here (mirrors RailPlanes /
  // ResourcePreviewPlane / HeroLogo). Hard no-op when the flag is off (defense
  // in depth; Scene.tsx already gates the mount). The particle sim additionally
  // requires the TRUE WebGPU sub-backend (compute) — on WebGL2-fallback only the
  // wireframe is skipped too (we render nothing; the SVG is the baseline).
  const [wire, setWire] = useState<WireBuild | null>(null);
  const [sim, setSim] = useState<LinkedParticlesBuild | null>(null);

  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let builtSim: LinkedParticlesBuild | null = null;
    let builtWireDispose: (() => void) | null = null;
    void Promise.all([
      import("three/webgpu"),
      import("three/tsl"),
      import("./materials/compliancePipelineNodeMaterial"),
      import("./gpgpu/linkedParticlesNodeSim"),
    ]).then(([webgpu, tslNs, wireMod, simMod]) => {
      if (cancelled) return;
      // TRUE WebGPU sub-backend detection (mirror HeroLogo exactly): the WebGPU
      // backend leaves isWebGLBackend UNDEFINED; only the WebGL backend sets it
      // true. Storage compute no-ops on the WebGL2 sub-backend (#31221), so the
      // whole 3D degrades to NOTHING there (SVG is the complete visual).
      const bk = (gl as unknown as { backend?: { isWebGLBackend?: boolean } })
        .backend;
      const isWebGPUBackend =
        !!bk &&
        bk.isWebGLBackend !== true &&
        typeof (gl as unknown as { compute?: unknown }).compute === "function";
      if (!isWebGPUBackend) return;

      const w = wireMod.createPipelineWireMaterial();
      builtWireDispose = () => w.material.dispose();
      setWire({
        material: w.material as unknown as THREE.Material,
        uniforms: w.uniforms,
      });

      const count = COUNT_BY_TIER[tier] ?? 0;
      if (count > 0) {
        builtSim = simMod.createLinkedParticlesBuild(
          gl as never,
          webgpu as never,
          tslNs as never,
          { count },
        );
        setSim(builtSim);
      }
    });
    return () => {
      cancelled = true;
      builtSim?.dispose();
      builtWireDispose?.();
      setSim(null);
      setWire(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  // --- Wireframe geometry (LOCAL space, core three) --------------------------
  const wireGeometry = useMemo(() => buildWireGeometry(), []);
  useEffect(() => () => wireGeometry.dispose(), [wireGeometry]);

  // --- Card rect: measured on measureVersion bumps (NOT per frame) -----------
  const [rect, setRect] = useState<CardRect | null>(null);
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(
      '[data-line-anchor="pipeline"]',
    );
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const scrollY = window.scrollY;
    setRect({
      cxBase: r.left + r.width / 2,
      w: r.width,
      h: r.height,
      docTop: r.top + scrollY,
    });
  }, [measureVersion]);

  // --- Per-frame: camera-lock placement + sim tick + ignition clock ----------
  const groupRef = useRef<THREE.Group>(null);
  const scratch = useRef(new THREE.Vector3());
  const revealDamped = useRef(0);
  const clock = useRef(0); // autonomous ignition traversal clock (seconds)
  // Eased per-stage pulse (DOM-hotspot focus) — decayed from the store.
  const pulseEased = useRef<number[]>(new Array(STAGE_COUNT).fill(0));
  // Reused ignition array fed to the sim each frame (no per-frame alloc).
  const igniteArr = useRef<number[]>(new Array(STAGE_COUNT).fill(0));

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group || !rect) return;
    const delta = Math.min(rawDelta, 1 / 30);

    const ih = size.height;
    const vw = size.width;
    const k = WORLD_VIEW_HEIGHT / ih;
    const scrollY = window.scrollY;

    // Card viewport rect from the measured doc-space top (Lenis animates the
    // real window scroll, so window.scrollY is the live position).
    const vpTop = rect.docTop - scrollY;
    const cx = rect.cxBase;
    const cy = vpTop + rect.h / 2;

    // Cheap manual cull (frustumCulled off — positions are per-frame).
    if (vpTop + rect.h < -CULL_PAD || vpTop > ih + CULL_PAD) {
      group.visible = false;
      return;
    }
    group.visible = true;

    // Camera-locked placement (see header): camera-space offset at view
    // distance CAMERA_Z, rotated into world by the camera's live pose.
    scratch.current
      .set((cx - vw / 2) * k, (ih / 2 - cy) * k, -CAMERA_Z)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    group.position.copy(scratch.current);
    group.quaternion.copy(camera.quaternion);
    group.scale.set(rect.w * k, rect.h * k, 1);

    // Route-transition / presence fade (damped scrollStore.reveal).
    revealDamped.current = THREE.MathUtils.damp(
      revealDamped.current,
      useScrollStore.getState().reveal,
      8,
      delta,
    );
    const reveal = revealDamped.current;

    // --- Ignition: autonomous traversal clock + DOM-hotspot pulses ----------
    // A single head walks the 6 stages every TOTAL_DURATION (echoes the SVG
    // streak); brightness only, NO hue shift. The head's flow position cycles
    // 0..1; each stage ignites as the head crosses its s.
    clock.current += delta;
    const headS = (clock.current % TOTAL_DURATION) / TOTAL_DURATION;

    // Decay the DOM-hotspot pulses (signal-store convention): the store holds
    // the TARGET; we damp eased copies toward those targets and write the
    // damped store array back, skipping the write once everything settled.
    const store = useCompliancePipelineStore.getState();
    const storePulse = store.pulse;
    let anyPulse = false;
    const damped: number[] = igniteArr.current; // reuse as scratch then refill
    for (let i = 0; i < STAGE_COUNT; i++) {
      const target = storePulse[i] ?? 0;
      const d = THREE.MathUtils.damp(target, 0, 7, delta);
      damped[i] = d;
      if (target !== 0) anyPulse = true;
    }
    if (anyPulse) {
      store.setPulse(
        damped.map((d) => (d < 0.001 ? 0 : d)),
      );
    }

    // Compose the per-stage ignition fed to the sim + wire: the autonomous
    // head bump OR the hotspot pulse, whichever is brighter.
    const ig = igniteArr.current;
    for (let i = 0; i < STAGE_COUNT; i++) {
      const stageS = i / (STAGE_COUNT - 1);
      // Soft head bump as it crosses the stage (width ~0.08 in flow units).
      const dHead = Math.abs(headS - stageS);
      const head = Math.max(0, 1 - dHead / 0.08);
      // Eased hotspot pulse toward the (decayed) store target.
      pulseEased.current[i] = THREE.MathUtils.damp(
        pulseEased.current[i],
        storePulse[i] ?? 0,
        9,
        delta,
      );
      ig[i] = Math.max(head, pulseEased.current[i]);
    }

    // --- Drive the wireframe + sim ------------------------------------------
    if (wire) {
      wire.uniforms.uDashOffset.value -= delta * WIRE_DASH_SPEED;
      wire.uniforms.uReveal.value = reveal;
    }
    if (sim) {
      sim.tick(delta, clock.current, reveal, ig);
    }
  });

  // Dev-only debug handle (mirrors __sersanRailPlanes / __sersanResourcePreview):
  // screen-projects the group center so registration with the SVG card rect can
  // be asserted in QA (delta ~0px when the 3D tracks the DOM card).
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__sersanPipeline3D = {
      hasWire: !!wire,
      hasSim: !!sim,
      rect,
      project: () => {
        const g = groupRef.current;
        if (!g || !g.visible) return null;
        const v = g.position.clone().project(camera);
        return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
      },
    };
  }

  // Nothing resolved yet (lazy build pending / non-WebGPU backend) → render
  // nothing; the SVG is the complete visual.
  if (!wire && !sim) return null;

  return (
    <group ref={groupRef} renderOrder={-1} visible={false}>
      {wire && (
        <mesh
          geometry={wireGeometry}
          material={wire.material}
          renderOrder={-1}
          frustumCulled={false}
        />
      )}
      {sim && (
        <>
          <mesh
            geometry={sim.linksGeom as unknown as THREE.BufferGeometry}
            material={sim.linksMat as unknown as THREE.Material}
            renderOrder={-1}
            frustumCulled={false}
          />
          <mesh
            geometry={sim.particleGeom as unknown as THREE.BufferGeometry}
            material={sim.particleMat as unknown as THREE.Material}
            renderOrder={-1}
            frustumCulled={false}
          />
        </>
      )}
    </group>
  );
}
