"use client";

/**
 * HomeSingularity — the HOME-hero ECLIPSE: the same TSL raymarched black hole
 * as /audit (AuditSingularity), re-framed for the brand-intro beat. NOT a
 * repeat of /audit: there the hole is a ~65vh object floated beside the H1;
 * here it is HUGE and LOW-CENTER — the sphere's center sits ~42vh below the
 * viewport center at an apparent diameter of ~122vh, so only the UPPER ARC of
 * the gravitationally-lensed accretion ring crowns the frame's lower half
 * like an eclipse horizon rising behind the wordmark. "Sersan AI" (the
 * particle brand) floats IN FRONT of the ring's glow; the black core sinks
 * to the fold.
 *
 * TWIN NOTE (the repo's duplicate-with-note convention): this island and
 * AuditSingularity share the instantiable factories
 * (singularity/blackHoleMaterial.ts + proceduralTextures.ts — one build per
 * island, never a live shared instance; the two never coexist since each is
 * route-gated) and the same build/orbit/parallax GRAMMAR, but the lifecycles
 * are structurally different — /audit is WORLD-ANCHORED to a section with a
 * scroll fade, this one is CAMERA-LOCKED with an intro-lifecycle fade — so
 * the frame loops are deliberately duplicated, not extracted. A fix to the
 * shared grammar (orbit composition, the uCamWorld/uCamLocal write, the dev
 * handle shape) likely applies to BOTH files.
 *
 * PLACEMENT ARITHMETIC (the eclipse framing)
 * ------------------------------------------
 * The proxy sphere is radius 1 (diameter D = 2) and MUST stay unscaled
 * (every raymarch constant is calibrated to the unit sphere; the uCamLocal
 * shortcut is only exact translation-only) — apparent size comes purely from
 * camera distance. With CAMERA_FOV = 50°:
 *
 *   viewport height at distance d = 2·tan(FOV/2)·d = 0.93262·d
 *   apparent fraction = D / (0.93262·d)  →  d = D / (0.93262·frac)
 *
 * For frac = 1.22 (≈122vh, mid of the directed 110–130vh band):
 *   d = 2 / (0.93262·1.22) ≈ 1.758 world units → group z = cam.z − 1.758
 *   view height AT the group's plane = D/frac ≈ 1.639 world units (=100vh).
 * Vertical: yFrac −0.42 of that plane's view height ≈ −0.689 world units —
 * the center lands 92vh from the viewport top. Derived silhouette on a 100vh
 * frame: apparent radius 61vh → sphere top edge at ~31vh; the black core
 * (march radius 0.13 → apparent radius ~7.9vh) spans ~84vh→fold; the lensed
 * photon arc (march r ≈ 0.2–0.35) crowns ~71–80vh — the "horizon". x is
 * centered (xFrac 0). All three live in `placeRef`
 * (window.__sersanHomeSingularity.place) for live eclipse-framing tuning.
 *
 * CAMERA-LOCKED, NOT WORLD-ANCHORED: during its entire visible life the page
 * is parked at the top under HeroIntroGate's lock, and a distant horizon
 * should hold the frame under the gate's spring-back camera bob anyway — so
 * the group follows camera.position each frame (a HUD anchor, like
 * NeuralLattice) instead of a section anchor. No camDescend compensation and
 * no camRoll counter-rotation: both beats run long after the fade below has
 * fully retired the hole (and a rolled horizon would be correct regardless).
 *
 * LIFECYCLE (tied to the intro, the whole point):
 *   • never even STARTS BUILDING until textMorphStore.assembleDone flips
 *     true (REGRESSION FIX, lead live-verify 2026-08-07: this island's
 *     build — three/webgpu import + march material + 2048×1024 starfield
 *     generation + pipeline compile — co-resident with HeroTextParticles'
 *     compute build at the exact entry moment silently starved the text
 *     build, the documented no-exception pipeline-failure mode: the
 *     wordmark never assembled, the gate waited forever. The entry beat
 *     OWNS the GPU compile window, exactly as it did before this island
 *     existed; we arm on the assembleDone edge via a store subscription).
 *     An ESC-skip during the entry means assembleDone never flips → the
 *     island never builds at all;
 *   • the armed build still requires the true-WebGPU compute backend (the
 *     eclipse accompanies the compute-driven particle intro — mirror of
 *     HeroTextParticles' probe) and bails on a session-skipped intro; the
 *     march pipeline is then WARMED via renderer.compileAsync against the
 *     live scene BEFORE the mesh ever mounts, so the first visible frame
 *     never stalls the still-gate-locked page;
 *   • never SHOWS unless textMorphStore.active (the particle intro actually
 *     owns the hero — every fallback path leaves it false → a skipped/absent
 *     intro shows nothing) and the preloader curtain has lifted;
 *   • IGNITES over ~1.2s (smoothstep ease on its own clamped-dt clock) —
 *     the horizon RISES behind the already-formed brand rather than
 *     popping in with the deferred build;
 *   • FADES with the melt: uFade = ignite × eased(1 − domReveal) × damped
 *     route reveal. As the brand melts into the DOM hero (domReveal 0→1)
 *     the hole fades out FULLY — it never competes with the spore mark's
 *     hero-right rest pose. Scrolling back to top re-engages the gate,
 *     domReveal reverses, and the eclipse rises again with the re-forming
 *     brand (ignite is already pinned at 1 by then).
 *   • group.visible flips off when faded, so the march costs nothing outside
 *     the intro beat.
 *
 * LAYERING (why this instance overrides the material's depth/side): at
 * d ≈ 1.76 the sphere is NEARER the camera than the z=0 wordmark particles,
 * so three's back-to-front transparent sort would draw the eclipse LAST —
 * over the brand. renderOrder −1 on the mesh (the repo's backdrop
 * convention: RailPlanes / NeuralLattice / ResourcePreviewPlane) draws it
 * first instead, and the wordmark (additive, depth-off) settles in front of
 * the glow. That reordering forces two instance-level material overrides:
 * depthWrite OFF (the factory's depthWrite:true would otherwise stamp a
 * near-plane depth across a ~122vh disc BEFORE the depth-tested
 * SignatureLine draws, erasing the line inside the whole silhouette) and
 * side: FrontSide (the factory's DoubleSide relied on that same depth write
 * to let front faces overwrite the useless outside-view backface march;
 * with depth off the two layers would double-composite. The camera stays
 * outside the volume at any dist > 1, so the backface path is unreachable
 * here anyway). The factory itself stays untouched — /audit keeps its exact
 * behavior.
 *
 * GPU NOTE: the raymarch is heavy (128 steps over a near-fullscreen
 * silhouette) and home already carries the spore hero + the 48k text sim —
 * AdaptiveResolution owns the framerate (effects identical at any DPR); the
 * honest quality knob if it ever needs a manual floor is
 * u.uIterations (scale uStep inversely — keep the ≈1.82 path product).
 * Island frame-loop conventions honored: single useFrame at default
 * priority, mounted AFTER SignatureLine (camera-relative reads depend on the
 * single camera authority having written camera.position earlier in the same
 * priority-0 pass), no rect reads, no per-frame allocations, clamped-dt
 * damps.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { webgpuEnabled } from "./renderer/createRenderer";
import { CAMERA_FOV } from "./constants";
import { useScrollStore } from "./store/scrollStore";
import { useIntroStore } from "./store/introStore";
import { useTextMorphStore } from "./store/textMorphStore";
import { usePointerStore, installPointerTracking } from "./store/pointerStore";
import type { SingularityBuild } from "./singularity/blackHoleMaterial";

/** tan(FOV/2) — the one trig constant the placement math needs. */
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2);
/** Unit proxy sphere: radius 1 → diameter 2 (NEVER scaled — see header). */
const SPHERE_DIAMETER = 2;
/** Target apparent diameter as a fraction of viewport height (~122vh). */
const APPARENT_HEIGHT_FRAC = 1.22;
/** Camera→group distance for that apparent size: ≈ 1.758 world units. */
const DEFAULT_DIST =
  SPHERE_DIAMETER / (2 * TAN_HALF_FOV * APPARENT_HEIGHT_FRAC);

/** Pointer parallax: max translation in world units (±), damped. Audit ships
 * 0.15 at dist 3.2; scaled by the distance ratio (×1.76/3.2) so the ANGULAR
 * drift — what the eye reads — stays equally subtle this close. */
const PARALLAX_MAX = 0.08;
const PARALLAX_DAMP = 4;
/** Route-transition reveal damp (ignition through the opening curtain). */
const REVEAL_DAMP = 4;

/** Slow continuous orbit — the audit island's 26s grammar reused. Radius is
 * distance-scaled like the parallax (0.5·1.76/3.2 ≈ 0.275) so the virtual
 * march camera swims the same apparent amount; bob is cut to ~0.3× the
 * audit's 0.45 (owner direction: the framing is fixed-low, the inclination
 * breathing should stay a murmur under the horizon). */
const ORBIT_PERIOD = 26; // seconds per lateral revolution
const ORBIT_RADIUS = 0.275; // lateral (x/z) drift radius, world units
const ORBIT_BOB = 0.14; // vertical bob amplitude, world units (half rate)

/** domReveal band over which the hole melts out — starts just after the
 * brand starts dissolving, fully gone before the DOM cascade lands (the
 * crisp hero never shares the frame with a live event horizon). domReveal
 * is already damped upstream (derived from HeroTextParticles' smoothed g),
 * so the eased smoothstep needs no extra damping of its own. */
const MELT_START = 0.05;
const MELT_END = 0.9;

/** Ignite ease-in (seconds): with the build deferred until the brand has
 * assembled, the horizon rises behind the formed wordmark over this window
 * instead of popping in on its first frame. Smoothstep-eased, composed
 * multiplicatively with the melt fade-out and the route reveal. */
const IGNITE_DURATION = 1.2;

export function HomeSingularity() {
  const { camera, size, gl, scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // --- ARM on the assembleDone edge (regression fix — see the header) -------
  // Nothing below — not even the dynamic imports — may start before the
  // entry assemble has completed: the entry beat owns the GPU compile
  // window. Store subscription per the island conventions (no polling rAF,
  // no reactive hook in a hot path); assembleDone already true at mount
  // (in-page remount after the intro) arms immediately.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (useTextMorphStore.getState().assembleDone) {
      setArmed(true);
      return;
    }
    const unsub = useTextMorphStore.subscribe((s) => {
      if (s.assembleDone) {
        setArmed(true);
        unsub();
      }
    });
    return unsub;
  }, []);

  // --- Lazy build (three/webgpu chunk loads ONLY here, and only ARMED) ------
  const [build, setBuild] = useState<SingularityBuild | null>(null);
  useEffect(() => {
    if (!armed) return;
    if (!webgpuEnabled()) return;
    // Session-skipped intro: the eclipse exists ONLY for the brand-intro
    // beat — a visitor who skipped it must never pay the march compile.
    // (An Esc-skip DURING the entry never arms at all — assembleDone stays
    // false; a skip AFTER arming is handled by the frame loop.)
    if (useTextMorphStore.getState().introSkipped) return;
    let cancelled = false;
    let built: SingularityBuild | null = null;

    void Promise.all([
      import("three/webgpu"),
      import("three/tsl"),
      import("./singularity/blackHoleMaterial"),
    ])
      .then(([webgpu, tslNs, mod]) => {
        if (cancelled) return null;
        // TRUE WebGPU compute backend only — mirror of HeroTextParticles'
        // probe. The march itself would run on the WebGL2 fallback, but the
        // intro it accompanies never activates there: no intro, no eclipse.
        const bk = (gl as unknown as { backend?: { isWebGLBackend?: boolean } })
          .backend;
        const isWebGPUBackend =
          !!bk &&
          bk.isWebGLBackend !== true &&
          typeof (gl as unknown as { compute?: unknown }).compute ===
            "function";
        if (!isWebGPUBackend) return null;

        built = mod.createBlackHoleBuild(webgpu as never, tslNs as never);
        // INSTANCE-LEVEL backdrop overrides (see the LAYERING header note) —
        // the shared factory stays untouched, /audit keeps its exact behavior.
        built.material.depthWrite = false;
        built.material.side = THREE.FrontSide;

        // WARM the march pipeline before the mesh ever mounts: even armed
        // post-assemble, a synchronous first-frame compile would hitch the
        // still-gate-locked hold beat. renderer.compileAsync compiles the
        // holder against the LIVE scene (targetScene) so the compiled
        // variant matches the mounted one; on any failure we fall through —
        // the mesh then compiles on first render exactly like /audit.
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
      });

    return () => {
      cancelled = true;
      built?.dispose();
      setBuild(null);
    };
  }, [armed, gl, camera, scene]);

  // Pointer tracking for the parallax (refcounted window listener; no-op on
  // coarse pointers / reduced-motion — parallax simply stays centered there).
  useEffect(() => installPointerTracking(), []);

  // --- Live placement knobs (lead fine-tunes the eclipse framing) -----------
  const placeRef = useRef({
    /** Camera→group distance (world units). Smaller = bigger on screen.
     * DEFAULT_DIST ≈ 1.758 → ~122vh apparent diameter (header arithmetic). */
    dist: DEFAULT_DIST,
    /** Horizontal offset as a fraction of the view width at the group plane.
     * 0 = dead center (the eclipse is symmetric under the wordmark). */
    xFrac: 0,
    /** Vertical offset as a fraction of the view HEIGHT at the group plane
     * (negative = down). −0.42 sinks the center 42vh below the viewport
     * center — the directed 35–45vh band — putting the ring's upper arc at
     * ~71–80vh from the frame top and the core at the fold. */
    yFrac: -0.42,
  });

  // --- Live orbit knobs -----------------------------------------------------
  const orbitRef = useRef({
    /** Seconds per full lateral revolution. */
    period: ORBIT_PERIOD,
    /** Lateral (x/z) orbit radius, world units. */
    radius: ORBIT_RADIUS,
    /** Vertical bob amplitude, world units — runs at HALF the orbit rate. */
    bob: ORBIT_BOB,
  });

  // --- Per-frame scratch (no allocations in the loop) -----------------------
  const parallax = useRef({ x: 0, y: 0 });
  const revealDamped = useRef(0);
  const fadeRef = useRef(0);
  /** Orbit clock — accumulated clamped delta (sibling convention). */
  const clockRef = useRef(0);
  /** Ignite clock 0..1 — the ~1.2s rise behind the formed brand. Only
   * advances once the lifecycle gates pass, so it can never pre-burn while
   * the island is held invisible. */
  const igniteRef = useRef(0);

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group || !build) return;
    const delta = Math.min(rawDelta, 1 / 30);

    // --- Intro-lifecycle gates (getState reads — the island wedge rule) ----
    // active: the particle intro genuinely owns the hero (every fallback
    // path — mobile layout, fonts, build failure — leaves it false).
    // introSkipped: an Esc mid-intro pins domReveal at 1 anyway, but the
    // explicit check retires the march the same frame, no melt tail.
    // introComplete: hold behind the preloader curtain (HeroTextParticles'
    // own discipline) so the march never burns GPU under the cover.
    const morph = useTextMorphStore.getState();
    if (
      !morph.active ||
      morph.introSkipped ||
      !useIntroStore.getState().introComplete
    ) {
      group.visible = false;
      return;
    }

    // --- Fade wiring: ignite × eased (1 − domReveal) × damped route reveal --
    // ignite: the ~1.2s smoothstep rise behind the already-formed brand
    // (the build is deferred until assembleDone, so the first visible frame
    // is always post-assemble — the horizon RISES, never pops). The melt is
    // a pure function of domReveal, so the reverse replay (scrolling back
    // to top re-engages the gate) brings the eclipse back exactly as the
    // brand re-forms — ignite is pinned at 1 by then. The damped
    // scrollStore.reveal ties entry to the route beat (audit's REVEAL_DAMP
    // grammar).
    igniteRef.current = Math.min(
      igniteRef.current + delta / IGNITE_DURATION,
      1,
    );
    const ignite = THREE.MathUtils.smoothstep(igniteRef.current, 0, 1);
    const melt =
      1 - THREE.MathUtils.smoothstep(morph.domReveal, MELT_START, MELT_END);
    revealDamped.current = THREE.MathUtils.damp(
      revealDamped.current,
      useScrollStore.getState().reveal,
      REVEAL_DAMP,
      delta,
    );
    const opacity = ignite * melt * revealDamped.current;
    fadeRef.current = opacity;
    build.u.uFade.value = opacity;
    group.visible = opacity > 0.005;
    if (!group.visible) return;

    // --- Pointer parallax: TRANSLATION ONLY (±PARALLAX_MAX, damped). The
    // group counter-moves (near-layer depth parallax); uCamLocal keeps the
    // march correct under any translation. -----------------------------------
    const ptr = usePointerStore.getState();
    const px = ptr.active ? (ptr.smooth.x - 0.5) * 2 : 0;
    const py = ptr.active ? (ptr.smooth.y - 0.5) * 2 : 0;
    parallax.current.x = THREE.MathUtils.damp(
      parallax.current.x,
      -px * PARALLAX_MAX,
      PARALLAX_DAMP,
      delta,
    );
    parallax.current.y = THREE.MathUtils.damp(
      parallax.current.y,
      py * PARALLAX_MAX,
      PARALLAX_DAMP,
      delta,
    );

    // --- Placement: CAMERA-LOCKED (see the header — a horizon, not a
    // section object). view height at the group plane = 2·tan(FOV/2)·dist.
    const place = placeRef.current;
    const viewHAtGroup = 2 * TAN_HALF_FOV * place.dist;
    const aspect = size.width / size.height;
    group.position.set(
      camera.position.x +
        place.xFrac * viewHAtGroup * aspect +
        parallax.current.x,
      camera.position.y + place.yFrac * viewHAtGroup + parallax.current.y,
      camera.position.z - place.dist,
    );
    // ROTATION/SCALE STAY IDENTITY FOREVER (translation only) — the raymarch
    // constants and the uCamLocal shortcut both depend on it. Never scale.

    // --- Slow continuous orbit → the VIRTUAL march camera (audit grammar:
    // circular x/z drift + half-rate bob; (cos − 1) keeps the offset zero at
    // t=0 so the rest framing matches the tuned placement; composed WITH the
    // pointer parallax — group translation and camera offset simply sum
    // inside uCamLocal). The silhouette never moves; the rays swim. --------
    clockRef.current += delta;
    const orbit = orbitRef.current;
    const oa = clockRef.current * ((Math.PI * 2) / orbit.period);
    const ox = Math.sin(oa) * orbit.radius;
    const oz = (Math.cos(oa) - 1) * orbit.radius;
    const oy = Math.sin(oa * 0.5) * orbit.bob;

    // --- Virtual march camera: real camera + orbit. The group is a
    // scene-root child with identity rotation/scale, so worldToLocal
    // degenerates to an exact subtraction (position IS the world position
    // this frame). -----------------------------------------------------------
    const camX = camera.position.x + ox;
    const camY = camera.position.y + oy;
    const camZ = camera.position.z + oz;
    build.u.uCamWorld.value.set(camX, camY, camZ);
    build.u.uCamLocal.value.set(
      camX - group.position.x,
      camY - group.position.y,
      camZ - group.position.z,
    );
  });

  // Dev-only debug handle: live eclipse-framing knobs + uniform handles + a
  // screen projection of the group center (AuditSingularity's pattern).
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__sersanHomeSingularity = {
      place: placeRef.current,
      orbit: orbitRef.current,
      get uniforms() {
        return build?.u ?? null;
      },
      get fade() {
        return fadeRef.current;
      },
      /** False until assembleDone armed the deferred build (regression fix). */
      armed,
      hasBuild: !!build,
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
    <group ref={groupRef} visible={false}>
      {/* renderOrder −1: the backdrop convention — drawn before the wordmark
          particles / signature line so both settle IN FRONT of the glow
          (see the LAYERING header note for the paired material overrides). */}
      <mesh
        geometry={build.geometry}
        material={build.material}
        renderOrder={-1}
        frustumCulled={false}
      />
    </group>
  );
}
