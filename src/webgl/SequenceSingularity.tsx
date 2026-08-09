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
 * one is STORE-DRIVEN: every input (camera distance, fade, star alpha,
 * vertical framing) arrives from seqStore, written by the DOM component
 * (singularity-passage.tsx) — per scrubbed tick on the traverse/approach,
 * per timeline tick during the one-shot plunge. A fix to the shared grammar
 * likely applies to ALL THREE files.
 *
 * PLACEMENT MODEL (hybrid anchor — deliberate):
 *   X — WORLD-ANCHORED at SEQ_PAN_FRAC × worldViewWidth: the camera's
 *       TRACK-RIGHT pan (SignatureLine's seqPan term, same product) sweeps
 *       the hole in from frame-right and lands it dead-center at pan end.
 *   Y — CAMERA-LOCKED (+ holeYFrac, graft 2's −0.08 → 0 high-composition
 *       entrance): the passage spans ~270vh of real scroll, and a distant
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
 * 64 / 0.0142 (path ≈ 1.818) while the tunnel overlay is ≥80% opaque — late
 * LIGHT-SPEED, streak field at full density: only there does the additive
 * overlay mask the step. (The hole rides the warp unveiled, dead-center —
 * the owner's focal frame — so an earlier edge would pop detail in plain
 * sight.) Fully reversible when alpha drops.
 *
 * LIFECYCLE: build DEFERRED until seqStore.armed (the passage arms one
 * viewport before its section — the compileAsync warm happens during plain
 * scrolling; the SpineExitGate locked beat that used to cover this window
 * was removed 2026-08-09) and disposed when the viewer leaves the armed band
 * (>~250vh past the passage, or back above the spine end) — init on
 * approach, destroy on leave, per the heavy-layer mandate. The march
 * pipeline is WARMED via renderer.compileAsync before the mesh mounts
 * (HomeSingularity / pavel-mazhuga precedent) so the first lensed frame
 * never hitches the scrub. group.visible tracks holeFade — which NEVER
 * fades out on scroll (owner 2026-08-07: "non deve fare fade e sparire, ci
 * dobbiamo entrare dentro"): the one-shot plunge drops it to 0 only at the
 * black-frame call AFTER its ENTER beat (the veil completes coverage in
 * ENTER's tail; the hole stays fully visible, dead-center, through the
 * whole light-speed warp before it), so the viewer never sees the march
 * disappear — it swallows them, and the tunnel streaks take over inside
 * the black.
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

/** Slow virtual-camera orbit (the audit/home grammar, at the home islands'
 * 13s period — owner 2026-08-09: faster orbital swim through space, NOT the
 * disc spin; /audit keeps its 26s): angular-constant by scaling the radius
 * with distance, and FADED OUT twice over: across
 * [SEQ.ORBIT_FADE_START, SEQ.ORBIT_FADE_END] in p (late APPROACH — the
 * reverse-entry near hold), AND by the one-shot's center-lock smoothstep in
 * plungeT — seq.p FREEZES at ~TRIGGER_P when the one-shot fires, so only
 * the lock can kill the swim there (the hole must sit dead-center through
 * the warp, owner 2026-08-09). */
const ORBIT_PERIOD = 13; // seconds per revolution (half of /audit's 26)
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
        // Seed the route-reveal damp at its LIVE value: with the trigger at
        // p ≈ 0.10 a fast flick can outrun this import/compile chain, so the
        // resolve may land MID-SHOT — from 0 the march would fade in over
        // ~0.75s while applyHoleVisuals cuts the CSS imposter the same frame
        // (the hole blinking out and re-fading during TRAVERSE). Seeded, the
        // swap is a same-frame crossover at full fade; the normal
        // early-resolve path is unchanged (the group stays invisible until
        // holeFade ramps in anyway).
        revealDamped.current = useScrollStore.getState().reveal;
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
    // ≥80% opaque — late LIGHT-SPEED, where the full-density streak field
    // masks the step (at 50% the edge landed mid-warp on the unveiled,
    // dead-center hole; the veiled ENTER/SPEED beats hold ≥0.85 so the
    // heavy fullscreen frames still march LO). Reversible when it drops
    // back; uniform writes only on the band edge. Skipped on the
    // null-tunnel path (nothing masks the step).
    const low = !seq.tunnelNull && seq.tunnelAlpha >= 0.8;
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

    // --- One-shot center lock (shared: orbit kill + the UV publish below) ---
    // plungeT ramps 0→1 the moment the one-shot fires while seq.p stays
    // FROZEN at ~TRIGGER_P — an orbitEnv keyed on p alone would keep the
    // hole swimming through the whole warp.
    const lock = THREE.MathUtils.smoothstep(
      seq.plungeT,
      0,
      SEQ.PLUNGE_LOCK_T,
    );

    // --- Slow virtual-camera orbit, faded out before the reverse-entry near
    // hold (p term) and across the one-shot's first PLUNGE_LOCK_T (lock
    // term) so the body sits exactly dead-center through the light-speed
    // warp ------------------------------------------------------------------
    clockRef.current += delta;
    const orbitEnv =
      (1 -
        THREE.MathUtils.smoothstep(
          seq.p,
          SEQ.ORBIT_FADE_START,
          SEQ.ORBIT_FADE_END,
        )) *
      (1 - lock);
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
    // scrub speeds, and the lock lerps to exact center across the one-shot's
    // first PLUNGE_LOCK_T anyway (the same lock kills the orbit swim in
    // step above).
    const v = projScratch.current;
    v.set(
      group.position.x - ox,
      group.position.y - oy,
      group.position.z - oz,
    ).project(camera);
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
