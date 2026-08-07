"use client";

/**
 * SequenceSingularity — the MID-PAGE black hole of the home plunge sequence
 * ("THE LONG TAKE": beat 05 "We hand over…" → the divario). The third
 * framing of the raymarch factory (singularity/blackHoleMaterial.ts), after
 * /audit's floated object and the home intro's eclipse.
 *
 * TWIN NOTE (the repo's duplicate-with-note convention): shares the
 * instantiable factories + the build/orbit/uCamWorld-uCamLocal grammar with
 * AuditSingularity / HomeSingularity (one build per island, never a live
 * shared instance), but the lifecycle is again structurally different — this
 * one is SCRUB-DRIVEN: every input (camera distance, fade, star alpha,
 * vertical framing) arrives from seqStore as a pure function of the
 * singularity passage's scroll progress, written by the DOM component
 * (singularity-passage.tsx) per scrubbed tick. A fix to the shared grammar
 * likely applies to ALL THREE files.
 *
 * PLACEMENT MODEL (hybrid anchor — deliberate):
 *   X — WORLD-ANCHORED at SEQ_PAN_FRAC × worldViewWidth: the camera's
 *       TRACK-RIGHT pan (SignatureLine's seqPan term, same product) sweeps
 *       the hole in from frame-right and lands it dead-center at pan end.
 *   Y — CAMERA-LOCKED (+ holeYFrac, graft 2's −0.08 → 0 high-composition
 *       entrance): the passage spans 360vh of real scroll, and a distant
 *       hole must not parallax a full frame while the sticky stage holds —
 *       camera-locking Y approximates the ~infinite-distance parallax of a
 *       deep-space object; the lateral move IS the deliberate camera verb.
 *   Z — camera.position.z − dist: apparent size is PURE CAMERA DISTANCE
 *       (apparent height fraction = 2.1445/dist), the owner's 1/distance
 *       divergence law verbatim. The proxy sphere is NEVER scaled
 *       (translation-only contract — uCamLocal + every march constant
 *       depend on it).
 *
 * QUALITY (transition-grade, graft 4): uIterations 96 / uStep 0.0095 at
 * build (path 0.0095·96·2 ≈ 1.824 ≈ the factory's 1.82 contract), stepped to
 * 64 / 0.0142 (path ≈ 1.818) while the tunnel overlay is ≥50% opaque — the
 * additive streak field masks the step; fully reversible when alpha drops.
 *
 * LIFECYCLE: build DEFERRED until seqStore.armed (the passage arms one
 * viewport before its section — during SpineExitGate's locked beat, a calm
 * compile window) and disposed when the viewer leaves the armed band
 * (>~250vh past the seam, or back above the spine end) — init on approach,
 * destroy on leave, per the heavy-layer mandate. The march pipeline is
 * WARMED via renderer.compileAsync before the mesh mounts (HomeSingularity /
 * pavel-mazhuga precedent) so the first lensed frame never hitches the
 * scrub. group.visible tracks holeFade: OFF past p 0.80 — the march NEVER
 * renders fullscreen at full fade (the crossfade mandate); the perceived
 * continuing plunge is carried entirely by the tunnel.
 *
 * LAYERING: same instance-level overrides as HomeSingularity (renderOrder −1
 * + depthWrite OFF + FrontSide) — the backdrop convention. With depth writes
 * on, the ~80–110vh transparent proxy silhouette would stamp depth over the
 * signature line / drift dust wherever they overlap; FrontSide is safe
 * because dist is floored at 1.9 ≫ 1 (the camera never enters the proxy —
 * the dossier's r≈1.2 limit is never approached).
 *
 * BACK-CHANNEL: publishes the hole's apparent-center in canvas UV
 * (seqStore.holeNdcX/Y, eased to exact 0.5/0.5 across the crossfade window)
 * so the DOM tunnel locks its zoom-blur center + particle vanishing point
 * onto the marched core. Does NOT publish holeField (that contract belongs
 * to the intro eclipse's flyby consumers).
 *
 * Island conventions honored: single useFrame at default priority, mounted
 * AFTER SignatureLine (camera authority), getState() reads only, no rect
 * reads, no per-frame allocations, clamped-dt damps, uniforms-only writes.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { webgpuEnabled } from "./renderer/createRenderer";
import { CAMERA_FOV, WORLD_VIEW_HEIGHT } from "./constants";
import { useScrollStore } from "./store/scrollStore";
import { useSeqStore, SEQ, SEQ_PAN_FRAC } from "./store/seqStore";
import type { SingularityBuild } from "./singularity/blackHoleMaterial";

/** tan(FOV/2) — the one trig constant the placement math needs. */
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2);

/** Hard distance floor (defense in depth — the passage's dist curve already
 * floors at SEQ.DIST_FLOOR = 1.9; below ~1.2 the dossier forbids the dolly
 * and a FrontSide proxy renders nothing from inside). */
const DIST_HARD_FLOOR = 1.3;

/** Slow virtual-camera orbit (the audit/home grammar): angular-constant by
 * scaling the radius with distance, and FADED OUT across [0.60, 0.72] so the
 * marched center sits exactly on the group anchor when the tunnel's center
 * lock engages. */
const ORBIT_PERIOD = 26;
const ORBIT_RADIUS_PER_DIST = 0.12; // ≈7° apparent swim, capped below
const ORBIT_RADIUS_MAX = 1.0;
const ORBIT_BOB_PER_DIST = 0.05;
const ORBIT_BOB_MAX = 0.45;

/** Route-transition reveal damp (sibling grammar). */
const REVEAL_DAMP = 4;

export function SequenceSingularity() {
  const { camera, size, gl, scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // --- Arm on seqStore.armed (approach band) --------------------------------
  // zustand subscription fires per seq tick; setState with an unchanged
  // boolean is a React bail-out, so commits happen only on the band edges.
  const [armed, setArmed] = useState(() => useSeqStore.getState().armed);
  useEffect(
    () =>
      useSeqStore.subscribe((s) => {
        setArmed(s.armed);
      }),
    [],
  );

  // --- Lazy build (three/webgpu chunk loads ONLY here, and only ARMED) ------
  const [build, setBuild] = useState<SingularityBuild | null>(null);
  useEffect(() => {
    if (!armed) return;
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let built: SingularityBuild | null = null;

    void Promise.all([
      import("three/webgpu"),
      import("three/tsl"),
      import("./singularity/blackHoleMaterial"),
    ])
      .then(([webgpu, tslNs, mod]) => {
        if (cancelled) return null;
        built = mod.createBlackHoleBuild(webgpu as never, tslNs as never);
        // Transition-grade march quality (graft 4 baseline) — keep the
        // ≈1.82 path product per the factory contract.
        built.u.uIterations.value = SEQ.ITER_HI;
        built.u.uStep.value = SEQ.STEP_HI;
        // Backdrop overrides (HomeSingularity's LAYERING note) — the shared
        // factory stays untouched, /audit keeps its exact behavior.
        built.material.depthWrite = false;
        built.material.side = THREE.FrontSide;

        // WARM the pipeline against the live scene before the mesh mounts
        // (no first-lensed-frame hitch mid-scrub). Any failure falls through
        // to a first-render compile, exactly like /audit.
        const compileAsync = (
          gl as unknown as {
            compileAsync?: (
              scene: THREE.Object3D,
              camera: THREE.Camera,
              targetScene?: THREE.Scene | null,
            ) => Promise<unknown>;
          }
        ).compileAsync;
        if (typeof compileAsync === "function") {
          const holder = new THREE.Mesh(built.geometry, built.material);
          return compileAsync.call(gl, holder, camera, scene).catch(() => {});
        }
        return null;
      })
      .then(() => {
        if (cancelled || !built) return;
        setBuild(built);
        // Suppress the DOM CSS-imposter: the real march is live.
        useSeqStore.setState({ marchLive: true });
      });

    return () => {
      cancelled = true;
      built?.dispose();
      setBuild(null);
      useSeqStore.setState({ marchLive: false });
    };
  }, [armed, gl, camera, scene]);

  // --- Per-frame scratch (no allocations in the loop) -----------------------
  const revealDamped = useRef(0);
  const clockRef = useRef(0);
  const iterLow = useRef(false);
  const projScratch = useRef(new THREE.Vector3());
  const fadeRef = useRef(0);

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group || !build) return;
    const delta = Math.min(rawDelta, 1 / 30);

    const seq = useSeqStore.getState();
    if (!seq.active) {
      group.visible = false;
      return;
    }

    // --- Fade: scrubbed holeFade × damped route reveal (sibling grammar) ---
    revealDamped.current = THREE.MathUtils.damp(
      revealDamped.current,
      useScrollStore.getState().reveal,
      REVEAL_DAMP,
      delta,
    );
    const fade = seq.holeFade * revealDamped.current;
    fadeRef.current = fade;
    build.u.uFade.value = fade;
    group.visible = fade > 0.005;
    if (!group.visible) return;

    // Lensing-first star alpha (graft 1: 0.9 through TRACK, →0.4 on
    // APPROACH — the passage computes the curve, we only write the uniform).
    build.u.uEnvStarAlpha.value = seq.starAlpha;

    // Scripted iteration step (graft 4): 96→64 while the tunnel overlay is
    // ≥50% opaque, reversible when it drops back. Uniform writes only on the
    // band edge. Skipped on the null-tunnel path (nothing masks the step).
    const low = !seq.tunnelNull && seq.tunnelAlpha >= 0.5;
    if (low !== iterLow.current) {
      iterLow.current = low;
      build.u.uIterations.value = low ? SEQ.ITER_LO : SEQ.ITER_HI;
      build.u.uStep.value = low ? SEQ.STEP_LO : SEQ.STEP_HI;
    }

    // --- Placement (see the header's hybrid-anchor model) -------------------
    const dist = Math.max(seq.dist, DIST_HARD_FLOOR);
    const aspect = size.width / size.height;
    const viewHAtHole = 2 * TAN_HALF_FOV * dist;
    const holeX = SEQ_PAN_FRAC * WORLD_VIEW_HEIGHT * aspect;
    group.position.set(
      holeX,
      camera.position.y + seq.holeYFrac * viewHAtHole,
      camera.position.z - dist,
    );
    // ROTATION/SCALE STAY IDENTITY FOREVER (translation only) — the raymarch
    // constants and the uCamLocal shortcut both depend on it. Never scale:
    // apparent size is camera distance, and ONLY camera distance.

    // --- Slow virtual-camera orbit, faded out before the center lock --------
    clockRef.current += delta;
    const orbitEnv = 1 - THREE.MathUtils.smoothstep(seq.p, 0.6, 0.72);
    const radius =
      Math.min(ORBIT_RADIUS_PER_DIST * dist, ORBIT_RADIUS_MAX) * orbitEnv;
    const bob = Math.min(ORBIT_BOB_PER_DIST * dist, ORBIT_BOB_MAX) * orbitEnv;
    const oa = clockRef.current * ((Math.PI * 2) / ORBIT_PERIOD);
    const ox = Math.sin(oa) * radius;
    const oz = (Math.cos(oa) - 1) * radius;
    const oy = Math.sin(oa * 0.5) * bob;

    // Virtual march camera = real camera + orbit; group is scene-root with
    // identity rotation/scale, so uCamLocal is an exact subtraction.
    const camX = camera.position.x + ox;
    const camY = camera.position.y + oy;
    const camZ = camera.position.z + oz;
    build.u.uCamWorld.value.set(camX, camY, camZ);
    build.u.uCamLocal.value.set(
      camX - group.position.x,
      camY - group.position.y,
      camZ - group.position.z,
    );

    // --- Publish the hole's apparent center in canvas UV (tunnel lock) ------
    // Apparent center = group − orbit offset (the orbit swims the rays; the
    // content the eye tracks translates by −offset). Projection uses the
    // camera's last-committed matrices — up to one frame stale, invisible at
    // scrub speeds, and the lock lerps to exact center by p 0.80 anyway.
    const v = projScratch.current;
    v.set(
      group.position.x - ox,
      group.position.y - oy,
      group.position.z - oz,
    ).project(camera);
    const lock = THREE.MathUtils.smoothstep(
      seq.p,
      SEQ.TUNNEL_IN_START,
      SEQ.TUNNEL_IN_END,
    );
    const ux = THREE.MathUtils.lerp((v.x + 1) / 2, 0.5, lock);
    const uy = THREE.MathUtils.lerp((v.y + 1) / 2, 0.5, lock);
    if (
      Math.abs(ux - seq.holeNdcX) > 0.0005 ||
      Math.abs(uy - seq.holeNdcY) > 0.0005
    ) {
      useSeqStore.setState({ holeNdcX: ux, holeNdcY: uy });
    }
  });

  // Dev-only debug handle (sibling pattern).
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__sersanSeqSingularity = {
      get uniforms() {
        return build?.u ?? null;
      },
      get fade() {
        return fadeRef.current;
      },
      get seq() {
        return useSeqStore.getState();
      },
      armed,
      hasBuild: !!build,
      project: () => {
        const g = groupRef.current;
        if (!g || !g.visible) return null;
        const p = g.position.clone().project(camera);
        return [((p.x + 1) / 2) * size.width, ((1 - p.y) / 2) * size.height];
      },
    };
  }

  if (!build) return null;

  return (
    <group ref={groupRef} visible={false}>
      {/* renderOrder −1: backdrop convention — drawn before the signature
          line / dust so they settle in front of the glow (paired with the
          depthWrite/side overrides in the build effect). */}
      <mesh
        geometry={build.geometry}
        material={build.material}
        renderOrder={-1}
        frustumCulled={false}
      />
    </group>
  );
}
