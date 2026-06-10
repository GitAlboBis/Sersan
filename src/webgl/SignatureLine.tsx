"use client";

/**
 * The signature scroll line (AGENTS.md §3a) — a CatmullRom tube snaking
 * through document space, progressively "drawn" by scroll.
 *
 * World mapping: document pixels scale to world units by
 * k = viewport.height / window.innerHeight, so the curve spans the whole
 * page in world-Y and the camera glides down it as the user scrolls —
 * waypoints stay visually glued to their sections at any page height.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { createLineMaterial, type LineUniforms } from "./materials/lineShader";
import { webgpuEnabled } from "./renderer/createRenderer";
import { getRouteCurve } from "./curves/routeCurves";
import { WORLD_VIEW_HEIGHT } from "./constants";
import { useScrollStore } from "./store/scrollStore";
import { useTextMorphStore } from "./store/textMorphStore";
import { useIntroStore } from "./store/introStore";
import { useFxStore } from "./store/fxStore";
import { routeFx } from "./store/routeFxStore";
import type { SectionAnchors } from "./hooks/useSectionAnchors";
import type { SceneTier } from "./store/tierStore";

interface SignatureLineProps {
  tier: Exclude<SceneTier, "off">;
  pathname: string;
  anchors: SectionAnchors;
}

/** Damping speed for the drawn-progress chase (higher = snappier). */
const PROGRESS_DAMP = 6;

// --- Intro-gate camera shake (textMorphStore.gateKick consumer) -----------
// While HeroIntroGate holds the page at scrollY=0, each consumed wheel/touch
// gesture lands here as a signed px impulse. It drives a slightly
// under-damped spring on the camera's Y (the same axis real scroll moves),
// so the camera dips with the gesture and swings back — the scene keeps the
// alive "scroll shake" while the document genuinely never moves. The kick is
// only ever written by the gate, so normal scrolling is untouched.
/** World-units/s of spring velocity per px of consumed gesture. */
const GATE_KICK_SCALE = 0.01;
/** Spring stiffness (ω² ≈ 90 → ~1.5 Hz wobble). */
const GATE_SPRING = 90;
/** Spring damping — under-damped (ζ ≈ 0.47): a couple of micro-overshoots. */
const GATE_DAMP = 9;
/** Hard clamp on the bob amplitude (world units, ~3% of viewport height). */
const GATE_SHAKE_MAX = 0.35;
/** px-ish energy per px of gesture, fed into the velocity glow/breath. */
const GATE_ENERGY_SCALE = 0.5;
const GATE_ENERGY_MAX = 150;
/** damp() lambda for the energy decay back to rest. */
const GATE_ENERGY_DECAY = 4;

export function SignatureLine({ tier, pathname, anchors }: SignatureLineProps) {
  const { camera, size } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const dampedProgress = useRef(0);
  const dampedReveal = useRef(1);
  // The live signature curve — captured during geometry build so the camera
  // (the single authority in this useFrame) can aim slightly AHEAD along it for
  // the cinematic lookAt-ahead tilt. Rebuilt per route/resize alongside the
  // geometry, so the camera motion adapts per route for free. `null` while a
  // rebuild is mid-flight (guarded in useFrame).
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  // Persistent look target damped toward the ahead-point each frame (no
  // per-frame allocation; smooths out jitter at curve bends).
  const lookTarget = useRef(new THREE.Vector3());
  const lookInitialized = useRef(false);
  const aheadPoint = useRef(new THREE.Vector3());
  // Intro-gate shake spring state (world units / world units per second) and
  // the decaying px-ish energy that feeds the velocity glow/breath channels.
  const shakeY = useRef(0);
  const shakeVel = useRef(0);
  const gateEnergy = useRef(0);
  // Camera-descent beat state (tilt phase): last applied offset (for the
  // velocity-coupled pitch) and the smoothed pitch itself.
  const prevDescend = useRef(0);
  const descendPitch = useRef(0);

  // Material selection by the build-time WebGPU flag (createRenderer.ts):
  //   flag OFF → the GLSL ShaderMaterial (unchanged, byte-identical to today),
  //   flag ON  → the TSL NodeMaterial (compiles to WGSL; raw GLSL would render
  //              as a black silhouette under a WebGPU backend).
  // Both expose the SAME uniform shape `{ uX: { value } }`, so the per-frame
  // update logic below drives either one identically. `uniforms` is the shared
  // reference the useFrame body writes to; `material` is the Object3D-attachable
  // material for the mesh.
  //
  // The TSL module imports `three/webgpu` + `three/tsl` — a SECOND, self-contained
  // copy of three (the node-material build). To keep that heavy build out of the
  // classic-WebGL (flag-OFF) bundle entirely — the dual-namespace pitfall in
  // webgpu-migration-spec §1.6 / §6.1, and mirroring createRenderer.ts's dynamic
  // `import("three/webgpu")` — `lineNodeMaterial` is imported ONLY behind the ON
  // flag, lazily. On the OFF path it is never referenced, so it never bundles.
  const glsl = useMemo(() => (webgpuEnabled() ? null : createLineMaterial()), []);
  const [tsl, setTsl] = useState<{
    material: THREE.Material;
    uniforms: LineUniforms;
  } | null>(null);

  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let built: { material: THREE.Material; uniforms: LineUniforms } | null = null;
    // Dynamic import → the `three/webgpu`/`three/tsl` chunk loads only on the ON
    // path. Lands inside the already-lazy Scene island, never the entry bundle.
    void import("./materials/lineNodeMaterial").then(
      ({ createLineNodeMaterial }) => {
        if (cancelled) return;
        const m = createLineNodeMaterial();
        // LineNodeUniforms is structurally the GLSL LineUniforms shape (same
        // field names, each `{ value }`); the per-frame writes only set `.value`.
        built = {
          material: m.material as unknown as THREE.Material,
          uniforms: m.uniforms as unknown as LineUniforms,
        };
        setTsl(built);
      },
    );
    return () => {
      cancelled = true;
      // Dispose whichever TSL material this effect instance created (route/anchor
      // churn does not re-run this effect — deps are empty — but unmount must).
      built?.material.dispose();
    };
  }, []);

  // The active material + its shared uniform reference. OFF: GLSL (synchronous,
  // byte-identical to today). ON: the TSL material once its lazy chunk resolves.
  const material = (glsl ?? tsl?.material) as THREE.Material | undefined;
  const uniforms = (glsl?.uniforms ?? tsl?.uniforms) as LineUniforms | undefined;

  // Dispose the GLSL material on unmount (OFF path). The TSL material is disposed
  // by its own effect cleanup above.
  useEffect(() => () => glsl?.dispose(), [glsl]);

  // Per-route tone for the line. The color-blend factor is 0 on home (colors
  // untouched) and a small fixed weight on interior routes; even off-home the
  // home output is unchanged because routeFx('/') colors equal the fxStore
  // colors (lerp of equal endpoints is a no-op). Scratch Colors avoid
  // per-frame allocation in useFrame.
  const route = useMemo(() => routeFx(pathname), [pathname]);
  const colorBlend = pathname === "/" ? 0 : 0.6;
  const routeColors = useMemo(
    () => ({
      a: new THREE.Color(route.lineColorA),
      b: new THREE.Color(route.lineColorB),
      hot: new THREE.Color(route.lineColorHot),
    }),
    [route.lineColorA, route.lineColorB, route.lineColorHot],
  );

  // World units per document/CSS pixel (stable: size only changes on resize).
  const k = WORLD_VIEW_HEIGHT / size.height;
  const worldViewWidth = WORLD_VIEW_HEIGHT * (size.width / size.height);

  const geometry = useMemo(() => {
    // Before the first anchor measurement (scrollHeight still at its initial
    // sentinel) every anchored waypoint would collapse to fraction 0 — a
    // degenerate curve. Skip building until real layout data exists.
    if (anchors.scrollHeight <= 1) return null;

    const config = getRouteCurve(pathname);
    const radiusFactor = useFxStore.getState().radiusFactor;
    const { tessellationScale } = routeFx(pathname);

    const points = config.waypoints.map((wp) => {
      const fraction =
        (wp.anchor ? anchors.fractions[wp.anchor] : undefined) ?? wp.at ?? 0;
      return new THREE.Vector3(
        wp.x * worldViewWidth * 0.45,
        -fraction * anchors.scrollHeight * k,
        wp.z ?? 0,
      );
    });

    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    // Keep the live curve for the camera lookAt-ahead (see useFrame). Captured
    // here (not discarded) so the single camera authority can sample it.
    curveRef.current = curve;
    // Density matters at the serpentine turn-arounds: too few tubular
    // segments between adjacent waypoints renders the bends as polygonal
    // elbows (and the tube can self-intersect). ~40 segments per waypoint
    // keeps every visible sweep perfectly smooth.
    // tessellationScale (1 on home → unchanged) biases segment density per
    // route before the same min/max clamp; rounded so the count stays integral.
    const tubularSegments = THREE.MathUtils.clamp(
      Math.round(config.waypoints.length * 40 * tessellationScale),
      256,
      tier === "full" ? 640 : 320,
    );
    const radius = WORLD_VIEW_HEIGHT * radiusFactor;
    const radialSegments = tier === "full" ? 8 : 6;

    const geo = new THREE.TubeGeometry(
      curve,
      tubularSegments,
      radius,
      radialSegments,
      false,
    );

    // Per-vertex centerline tangent for the breath normal-correction (WI-2).
    // TubeGeometry exposes its Frenet tangents (one unit vector per tubular
    // ring i ∈ [0..tubularSegments]); its vertex layout is, in order, for each
    // ring i, (radialSegments + 1) vertices. So aTangent is the ring tangent
    // repeated across that ring — matching position/normal/uv ordering exactly.
    const ringTangents = geo.tangents; // Vector3[], length tubularSegments + 1
    const ringVerts = radialSegments + 1;
    const tangentArr = new Float32Array((tubularSegments + 1) * ringVerts * 3);
    for (let i = 0; i <= tubularSegments; i++) {
      const t = ringTangents[i];
      for (let j = 0; j < ringVerts; j++) {
        const o = (i * ringVerts + j) * 3;
        tangentArr[o] = t.x;
        tangentArr[o + 1] = t.y;
        tangentArr[o + 2] = t.z;
      }
    }
    geo.setAttribute("aTangent", new THREE.BufferAttribute(tangentArr, 3));

    if (process.env.NODE_ENV !== "production") {
      geo.computeBoundingBox();
    }
    return geo;
    // anchors.version covers fraction/scrollHeight changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, anchors.version, size.width, size.height, k, worldViewWidth, tier]);

  // Dispose replaced geometries (rebuilds on resize/route would leak GPU
  // buffers otherwise).
  useEffect(() => () => geometry?.dispose(), [geometry]);

  // First-load hand-off (preloader → line). The preloader holds the viewport
  // while readiness counts to 100, then flips introStore.introComplete. On that
  // false→true edge we re-kick the reveal beat (setReveal 0 → 1) so the line
  // draws in EXACTLY as the curtain lifts — the eye reads "the loading bar
  // became the signature line". On a soft route change the preloader never
  // remounts, so introComplete is already true and this never re-fires; the
  // per-route re-curve beat (Scene.tsx, keyed on pathname) owns those.
  useEffect(() => {
    const { setReveal } = useScrollStore.getState();
    // If the intro already completed (e.g. this SignatureLine instance mounted
    // late, after the preloader handed off), don't re-trigger — just ensure the
    // line is drawn.
    if (useIntroStore.getState().introComplete) {
      setReveal(1);
      return;
    }
    // While the preloader covers the screen, keep the line undrawn so its
    // draw-in is the reveal, not a pop-in behind the overlay.
    setReveal(0);
    let timeoutId = 0;
    const unsubscribe = useIntroStore.subscribe((state, prev) => {
      if (state.introComplete && !prev.introComplete) {
        setReveal(0);
        // Brief beat so the curve is settled before the draw-in begins,
        // matching the ~420ms route-reveal window.
        timeoutId = window.setTimeout(() => setReveal(1), 60);
      }
    });
    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  useFrame((_, delta) => {
    const scroll = useScrollStore.getState();
    const { progress, velocity, reveal, anchorPulse } = scroll;
    const fx = useFxStore.getState();

    // Section-arrival pulse: the store holds a TARGET bumped to 1 each time a
    // new section centers (set in useSectionAnchors). Decay it toward 0 here
    // (~400ms feel, frame-rate independent) and write the damped value back so
    // the store stays the single source of truth — never incremented per frame.
    const decayedPulse = THREE.MathUtils.damp(anchorPulse, 0, 7, delta);
    // Write the damped value back only while there's actually a pulse to
    // decay — once it has settled to 0, skip the store write so the idle
    // line never churns the store every frame (no spurious set/notify).
    if (anchorPulse !== 0) {
      scroll.setAnchorPulse(decayedPulse < 0.001 ? 0 : decayedPulse);
    }

    dampedProgress.current = THREE.MathUtils.damp(
      dampedProgress.current,
      progress,
      PROGRESS_DAMP,
      delta,
    );
    dampedReveal.current = THREE.MathUtils.damp(
      dampedReveal.current,
      reveal,
      8,
      delta,
    );

    const sh = anchors.scrollHeight;
    const ih = size.height;
    const scrollYWorld = dampedProgress.current * Math.max(sh - ih, 0);

    // Camera glides down the world strip; the viewport center tracks the
    // document position exactly (see file header for the k mapping).
    camera.position.y = -(scrollYWorld + ih / 2) * k;

    // Intro-gate shake: consume the gesture impulse the gate accumulated and
    // integrate the under-damped spring (semi-implicit Euler at a clamped dt
    // so a background-tab hiccup can't explode the spring). Applied BEFORE
    // the lookAt-ahead block so the tilt follows the bob. Screen-anchored
    // objects (HeroLogo, the particle text) position themselves relative to
    // camera.position.y per frame, so they stay readable while the
    // world-anchored line/scene visibly shakes — exactly the intended feel.
    const kick = useTextMorphStore.getState().gateKick;
    if (kick !== 0) {
      // Signed: scroll-down dips the camera down, then it springs back.
      shakeVel.current -= kick * GATE_KICK_SCALE;
      gateEnergy.current = Math.min(
        gateEnergy.current + Math.abs(kick) * GATE_ENERGY_SCALE,
        GATE_ENERGY_MAX,
      );
      useTextMorphStore.setState({ gateKick: 0 });
    }
    if (shakeY.current !== 0 || shakeVel.current !== 0) {
      const dt = Math.min(delta, 1 / 30);
      shakeVel.current +=
        (-GATE_SPRING * shakeY.current - GATE_DAMP * shakeVel.current) * dt;
      shakeY.current = THREE.MathUtils.clamp(
        shakeY.current + shakeVel.current * dt,
        -GATE_SHAKE_MAX,
        GATE_SHAKE_MAX,
      );
      // Snap to rest once imperceptible so the idle frame loop stays a no-op.
      if (Math.abs(shakeY.current) < 1e-4 && Math.abs(shakeVel.current) < 1e-3) {
        shakeY.current = 0;
        shakeVel.current = 0;
      }
      camera.position.y += shakeY.current;
    }
    gateEnergy.current =
      gateEnergy.current < 0.01
        ? 0
        : THREE.MathUtils.damp(gateEnergy.current, 0, GATE_ENERGY_DECAY, delta);
    // Velocity the "alive" channels see: real scroll velocity plus the gate
    // gesture energy — during the gate scroll velocity is 0, this keeps the
    // line glow/breath responding to the user's hand exactly like scrolling.
    const aliveVelocity = Math.abs(velocity) + gateEnergy.current;

    // The lit head sits where the reader is: document fraction of the
    // viewport center. Curve param ≈ doc fraction (waypoints are spread by
    // doc fraction, so the approximation holds visually).
    const headFraction = sh > 0 ? (scrollYWorld + ih * 0.5) / sh : 0;

    // Cinematic lookAt-ahead (ANALISI_LUSION §3.7) — FULL tier only.
    // The camera aims slightly ahead along the SAME signature curve, producing
    // a gentle parallax tilt as the user scrolls. This is the single camera
    // authority (we already own camera.position.y above); no second writer.
    // X/Z of the ahead-point are scaled DOWN by lookTiltScale so the camera
    // yaws/pitches only a few degrees — hero/section text stays stable. Y of
    // the target tracks the curve naturally (small relative to camera.position.y),
    // giving a subtle pitch without altering the vertical glide.
    // On lite/off tiers we skip this entirely → camera looks straight down -Z
    // (its default orientation), exactly as before this change.
    const curve = curveRef.current;
    if (tier === "full" && curve) {
      const t = THREE.MathUtils.clamp(dampedProgress.current, 0, 1);
      const ahead = THREE.MathUtils.clamp(t + fx.lookAhead, 0, 1);
      // getPointAt → arc-length-parameterized point on the curve.
      curve.getPointAt(ahead, aheadPoint.current);
      // Build the desired look target relative to the camera's current position:
      // dampen the lateral (x) and depth (z) curve offset so the tilt is subtle,
      // and keep the target's y near the camera's y plane (the curve's own y is
      // the full page strip — using it directly would over-pitch).
      const tilt = fx.lookTiltScale;
      const targetX = aheadPoint.current.x * tilt;
      const targetY = camera.position.y + (aheadPoint.current.y - camera.position.y) * tilt;
      const targetZ = aheadPoint.current.z * tilt;
      if (!lookInitialized.current) {
        // First frame at full tier: snap (no swing-in from origin).
        lookTarget.current.set(targetX, targetY, targetZ);
        lookInitialized.current = true;
      } else {
        lookTarget.current.x = THREE.MathUtils.damp(lookTarget.current.x, targetX, 3.5, delta);
        lookTarget.current.y = THREE.MathUtils.damp(lookTarget.current.y, targetY, 3.5, delta);
        lookTarget.current.z = THREE.MathUtils.damp(lookTarget.current.z, targetZ, 3.5, delta);
      }
      camera.lookAt(lookTarget.current);
    }

    // Camera-descent beat (textMorphStore.camTilt 0..1, written by the
    // SpineExitGate clock at the END of the cinematic spine) — a TRUE
    // immersive move, not a transient dip: the camera DESCENDS monotonically
    // by ~one viewport, and the pitch follows the descent VELOCITY: diving →
    // head looks down; reversing back up → head looks UP; at rest → level.
    // Reversing the scroll therefore plays the move backwards instead of
    // re-dipping. The offset eases out by |scroll − tiltAnchorY| (the spot
    // where the beat anchored), restoring the exact camera↔document mapping
    // within ~1.5 viewports on EITHER side — so even if the user escapes
    // upward without the reverse beat, the world re-syncs. The applied
    // offset is published to the store (camDescend) so camera-anchored hero
    // objects can hold their pre-descent station. Applied AFTER the lookAt
    // above so the rotateX composes absolutely per frame (lite tier resets
    // orientation first — nothing else writes it there).
    const { camTilt, tiltAnchorY } = useTextMorphStore.getState();
    {
      const tiltEase = camTilt * camTilt * (3 - 2 * camTilt);
      const scrollPxNow = dampedProgress.current * Math.max(sh - ih, 0);
      const scrollRamp =
        1 - Math.min(Math.abs(scrollPxNow - tiltAnchorY) / (ih * 1.5), 1);
      const desc = WORLD_VIEW_HEIGHT * 1.0 * tiltEase * scrollRamp;
      // Pitch ∝ descent velocity (world units/s), damped for smoothness.
      const dVel = (desc - prevDescend.current) / Math.max(delta, 1e-4);
      prevDescend.current = desc;
      descendPitch.current = THREE.MathUtils.damp(
        descendPitch.current,
        THREE.MathUtils.clamp(dVel * 0.055, -0.6, 0.6),
        6,
        delta,
      );
      if (desc !== 0 || Math.abs(descendPitch.current) > 0.0001) {
        camera.position.y -= desc;
        if (tier !== "full" || !curve) camera.quaternion.set(0, 0, 0, 1);
        camera.rotateX(-descendPitch.current);
      }
      if (useTextMorphStore.getState().camDescend !== desc) {
        useTextMorphStore.setState({ camDescend: desc });
      }
    }

    // On the ON path the TSL material loads lazily; until its chunk resolves
    // `uniforms` is undefined. The camera glide above still runs every frame
    // (so the view is in place when the material lands); the uniform writes are
    // skipped until then. On the OFF path `uniforms` is always set synchronously.
    const u = uniforms;
    if (!u) return;
    u.uProgress.value = headFraction;
    u.uTime.value += delta;
    u.uReveal.value = dampedReveal.current;
    // Velocity feeds a subtle energy boost into the glow; the section-arrival
    // pulse adds a brief ~×1.2 bump as the head "arrives" at each section
    // (proportional to base emissive so it reads as ×1.0→1.2→1.0). Both are
    // SUMMED then clamped to the same single ceiling — no double-counting.
    const velocityBoost = aliveVelocity * 0.004;
    const pulseBoost = fx.emissive * 0.2 * decayedPulse;
    const boost = Math.min(velocityBoost + pulseBoost, 0.6);
    u.uEmissive.value = (fx.emissive + boost) * route.lineEmissiveScale;
    u.uGlowFalloff.value = fx.glowFalloff;
    u.uHeadSharp.value = fx.headSharp;
    u.uFlowSpeed.value = fx.flowSpeed;
    // "Gel tube" fresnel rim + fake-scatter (ANALISI_LUSION §3.2A). View-
    // dependent, no per-frame animation; same uniforms drive GLSL + TSL.
    u.uFresnelPower.value = fx.fresnelPower;
    u.uScatter.value = fx.scatter;

    // Breath (WI-2): RE-ENABLED after the P1 check, with the overscaled normal
    // correction removed in lineShader.ts. Only the radial POSITION breath
    // remains — a uniform per-ring inflate (≤ 0.4*radius) that leaves the uv.x
    // head-mask coordinate undisturbed. The facing-core normal is now passed
    // through unperturbed: the physically-correct tilt is < 0.2° (because uv.x
    // spans the full ~150-unit curve, so d/ds is divided by L), i.e. below
    // perception, so dropping the correction produces no shimmer. Driver gated
    // to the full tier; 0 elsewhere makes the shader skip the breath branch
    // (uBreath <= 0.0001), and under prefers-reduced-motion the Canvas is
    // unmounted anyway (tier "off").
    const radius = WORLD_VIEW_HEIGHT * fx.radiusFactor;
    const velNorm = Math.min(aliveVelocity * 0.01, 1);
    u.uBreath.value =
      tier === "full" ? 0.4 * radius * (0.45 + 0.55 * velNorm) : 0;
    // Base = the live fxStore color (dev tuning), lerped toward the route tone
    // by colorBlend. On home colorBlend is 0 AND the endpoints are equal, so
    // the result is byte-identical to today's fx.color* set.
    u.uColorA.value.set(fx.colorA).lerp(routeColors.a, colorBlend);
    u.uColorB.value.set(fx.colorB).lerp(routeColors.b, colorBlend);
    u.uColorHot.value.set(fx.colorHot).lerp(routeColors.hot, colorBlend);

    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__sersanLineDebug = {
        camY: camera.position.y,
        uProgress: u.uProgress.value,
        storeProgress: progress,
        anchorsScrollHeight: sh,
        anchorsVersion: anchors.version,
        k,
        viewportH: WORLD_VIEW_HEIGHT,
        sizeH: ih,
        bboxY: geometry?.boundingBox
          ? [geometry.boundingBox.max.y, geometry.boundingBox.min.y]
          : null,
        bboxX: geometry?.boundingBox
          ? [geometry.boundingBox.min.x, geometry.boundingBox.max.x]
          : null,
      };
    }
  });

  // No geometry until the first anchor measurement; no material until the lazy
  // TSL chunk resolves on the ON path (OFF path has it synchronously).
  if (!geometry || !material) return null;

  return <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />;
}
