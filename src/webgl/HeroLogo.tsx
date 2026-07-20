"use client";

/**
 * Hero logo — the SERSAN mark as a GPGPU particle cloud that dissolves &
 * regenerates.
 *
 * THE ENGINE (post-C3 consolidation, restyle step 4, 2026-06-13)
 * --------------------------------------------------------------
 * Two render paths survive (the FBO ping-pong rigs and the sprite debug modes
 * `solid` / `both` / `particles` / `particles-2layer` were retired — see
 * gpgpu/gpgpuNodeSim.ts):
 *
 *   "spores" (DEFAULT) — TRUE-WebGPU compute only. Two shells of instanced
 *   SHADED OPAQUE icospheres (violet erodible crust + glowing cyan immortal
 *   core) over a solid occluder mark, driven by the storage-buffer momentum
 *   sim: the unified anchor-spring force model + cursor attractor (radial
 *   push² repulsion + orbital swirl) + the DDD life machine (hover erode,
 *   scroll-out burst, respawn/regrow).
 *
 *   "particles-static" — the analytic fallback (and a debug toggle): billboard
 *   sprites at their HOME positions (per-instance vec3 attribute), displaced
 *   ANALYTICALLY near the cursor in the vertex stage (lift + violet→cyan,
 *   eased hover). Stateless, no compute — robust on every backend. The spores
 *   mode DEGRADES to this automatically off true WebGPU.
 *
 * HOME (rest) positions are sampled on the GLB mesh SURFACE via
 * MeshSurfaceSampler (geometry/sersanMark.ts); the solid mesh is never drawn —
 * it feeds the sampler, the spore occluder slab and the invisible raycast
 * target.
 *
 * BACKEND SPLIT (the dual-import discipline, mirrors DriftParticles):
 *   flag OFF (WebGL2)  → synchronous GLSL static build
 *                        (gpgpu/gpgpuRenderShader.ts). Never imports
 *                        three/webgpu.
 *   flag ON  (WebGPU)  → lazy-imported TSL builds (gpgpu/gpgpuNodeSim.ts); the
 *                        heavy three/webgpu + three/tsl namespaces are imported
 *                        ONCE here and passed in, so they never reach the OFF
 *                        bundle. Spores additionally require the TRUE WebGPU
 *                        sub-backend (`backend.isWebGLBackend !== true` AND
 *                        `gl.compute` — storage indexing no-ops on the WebGL2
 *                        sub-backend, three #31221) and degrade to the static
 *                        build otherwise.
 *
 * INTEGRATION CONTRACT (kept verbatim across engine swaps):
 *  - announces heroReady on the first frame (arms the drag-capture layer),
 *    resets on unmount;
 *  - screen-anchored across the sticky spine pin (position relative to
 *    camera.position.y, worldViewWidth, the `hp` hero-span progress, the
 *    `fade = 1 - smoothstep(hp,0.74,0.97)` recede+fade handoff, group.visible);
 *  - delta clamp for tab-refocus stalls;
 *  - ANCHORED orientation: NO drag-to-rotate and NO idle spin — the mark sits
 *    still at its front-facing rest and only eases a few degrees toward the
 *    cursor (a soft mouse-parallax tilt, damped toward rest). The hero-drag
 *    layer still feeds heroDragStore.hovering (the repulsion gate); its drag
 *    velocity is ignored, so click-and-hold never moves the mark.
 *
 * FALLBACKS: tier `off` / reduced-motion never mounts this (Scene gates home →
 * HeroLogo to full/lite). Every degradation lands on the static build or, at
 * worst, nothing renders — no crash, and heroReady still fires so the
 * poster/drag handoff is unaffected.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { SPINE_TRAVEL_VH } from "@/lib/spine";
import { WORLD_VIEW_HEIGHT } from "./constants";
import { useTextMorphStore } from "./store/textMorphStore";
import { useIntroStore } from "./store/introStore";
import {
  sampleMarkHomePositions,
  type MarkHomeField,
} from "./geometry/sersanMark";
import {
  createGpgpuStaticBuild,
  type GpgpuStaticUniforms,
} from "./gpgpu/gpgpuRenderShader";
import {
  DEFAULT_GPGPU_CONFIG,
  SIZE_BY_TIER,
  SPORE_SIZE_BY_TIER,
  SPORE_LITE_RADIUS_SCALE,
  type GpgpuConfig,
  type GpgpuSimRig,
  type GpgpuTickParams,
} from "./gpgpu/gpgpuConfig";
import { getSporePreset } from "./gpgpu/sporePresets";
import { webgpuEnabled } from "./renderer/createRenderer";
import { useScrollStore } from "./store/scrollStore";
import { useTierStore, type SceneTier } from "./store/tierStore";
import { useFxStore } from "./store/fxStore";
import { useHeroDragStore } from "./store/heroDragStore";
import { usePointerStore } from "./store/pointerStore";
import type { SectionAnchors } from "./hooks/useSectionAnchors";

interface HeroLogoProps {
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
}

/**
 * Resting tilt — a slight downward nod so the mark has depth/dimension but the
 * camera-facing FRONT plate stays clearly readable (like DDD's near-static "D").
 * The GLB's front face is +Z and the camera looks down −Z, so 0 yaw already
 * presents the mark face-on; we only add a small X tilt. This is the BASE rest
 * orientation; the mouse-parallax tilt below eases on top of it.
 *
 * Kept small (~4°) so the WIDE 2.64-unit mark reads as the letterform FACE-ON,
 * not a slanted box — at a larger near-plane scale a bigger tilt foreshortens
 * the wide plate and the mark stops looking like the mark.
 */
const TILT = THREE.MathUtils.degToRad(4);
/**
 * Mouse-parallax tilt — the mark is ANCHORED (no drag-to-rotate, no idle spin)
 * and only "looks toward" the cursor by a few degrees. The smoothed pointer
 * (normalized −1..1 from screen center) maps to a tiny target rotation
 * (rotY = pointerX·MAX, rotX = −pointerY·MAX) that the assembly DAMPS toward
 * each frame, easing back to the front-facing rest (0,0) when the pointer is
 * centered/absent. Live-tunable via fxStore.gpgpuTilt (default below).
 */
const TILT_DAMP = 3.5; // damp lambda — soft ease toward the pointer target

/**
 * ONE-SHOT intro REFORM-from-nothing, on HARD site entry (the REVERSE of a
 * decompose — client 2026-06-29).
 *
 * While the preloader curtain is up the whole mark is held DEAD (burst pinned
 * at PEAK) so there is NOTHING behind it; when the curtain lifts the spores
 * respawn AT HOME and regrow from nothing into the solid logo. The EXPLODE is
 * the OTHER half of the arc — the scroll dissolve as you reach the end of the
 * hero (the `burst` window in the frame loop). All three beats (intro reform,
 * scroll explode, scroll-back regrow) ride the SAME `uBurst` mechanism
 * (gpgpuNodeSim "disappear and regrow on top"), so they stay one coherent
 * system. Driven by a wall-clock (delta), NOT scroll, and composed with the
 * scroll burst via max(). Plays on HARD load only; a soft route re-entry just
 * shows the logo already present (no replay). The visible reform is the sim's
 * regrow bloom (~1s, paced by crust/core LIFE_REGROW in sporePresets — lower it
 * for a slower materialise). The core's stiffer spring + slower regrow
 * reassembles a beat behind the crust — a natural inside-out reform.
 */
const INTRO_REFORM_PEAK = 0.92; // burst that holds the mark as NOTHING (1 = gone)
const INTRO_REFORM_HOLD = 0.35; // s held as nothing after the curtain lifts
const INTRO_REFORM_RAMP = 0.4; // s to drop burst→0, releasing the regrow bloom
const INTRO_REFORM_BLOOM = 5.5; // s the SLOW materialise bloom is given to finish
/** Regrow-rate multiplier during the materialise — small ⇒ a MUCH slower bloom
 * than the preset's hover/scroll-back regrow (client 2026-06-29: "molto più
 * lento"). Lower this for an even slower first reveal. */
const INTRO_REFORM_REGROW_SLOW = 0.3;
/** Clock value past which the intro is fully over (burst 0 + regrow restored). */
const INTRO_REFORM_RELEASE =
  INTRO_REFORM_HOLD + INTRO_REFORM_RAMP + INTRO_REFORM_BLOOM;
/** Seconds (at the END of the intro) over which the dark occluder body fades
 * back in. Kept LATE so it never shows as a dim "spento" logo under the slowly-
 * blooming particles — the reform reads as forming from nothing/particles (core
 * already lit), with the dark body filling in behind only at the very end. */
const INTRO_REFORM_BODY_REVEAL = 2.2;

// EXPLODE (scroll-out) — STAGGERED so the OUTER crust expands BEFORE the inner
// core (client: "lo strato di sopra inizia ad espandersi prima di quello di
// sotto"). The crust scatters on a tight hp window; the core only STARTS later
// and completes by the end of the hero. The dark occluder body follows the
// (trailing) core so it stays solid behind the crust as that leads off.
const EXPLODE_CRUST_END = 0.78; // hp by which the outer crust is fully scattered
const EXPLODE_CORE_LAG = 0.33; // hp at which the inner core only STARTS to go
const EXPLODE_CORE_END = 1.0; // hp by which the core is fully scattered

/** Reform envelope vs seconds since the curtain lifted: PEAK before reveal
 * (te<0, held dead behind the curtain) → PEAK through HOLD → ramps to 0 over
 * RAMP, dropping below the respawn threshold and releasing the regrow bloom
 * (the visible "materialise from nothing"). */
function introReformEnvelope(te: number): number {
  if (te < 0) return INTRO_REFORM_PEAK;
  return (
    INTRO_REFORM_PEAK *
    (1 -
      THREE.MathUtils.smoothstep(
        te,
        INTRO_REFORM_HOLD,
        INTRO_REFORM_HOLD + INTRO_REFORM_RAMP,
      ))
  );
}

/** The Blender-built SERSAN mark. Geometry-only (no materials). */
const MARK_GLB = "/models/sersan-mark.glb";
/** Normalize the GLB to ~2 world units tall (same envelope as the old
 * procedural mark, so the anchoring/scale math is unchanged). */
const TARGET_HEIGHT = 2;
useGLTF.preload(MARK_GLB);

/** Cursor far away → repulsion vanishes (pointer-leave / coarse pointer). */
const MOUSE_OFF = new THREE.Vector3(1e9, 1e9, 1e9);

/**
 * TSL STATIC build (the home-position billboards, analytic dispersion). Shape
 * mirrors createStaticParticleNodeBuild's return, loose-typed because the
 * builder module is loose-typed for the lazy dual-import discipline.
 */
interface TslStatic {
  geometry: THREE.InstancedBufferGeometry;
  material: THREE.Material;
  uFade: { value: number };
  uPointSize: { value: number };
  uPixelRatio: { value: number };
  uViewport: { value: THREE.Vector2 };
  uEmissive: { value: number };
  uPointAlpha: { value: number };
  uMouse: { value: THREE.Vector3 };
  uHover: { value: number };
  uTime: { value: number };
  uRadius: { value: number };
  uPush: { value: number };
  dispose: () => void;
}

export function HeroLogo({ tier, anchors }: HeroLogoProps) {
  const { camera, size, gl, raycaster } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const assemblyRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const fadeRef = useRef(1);
  const simTimeRef = useRef(0);
  const announcedReady = useRef(false);
  // One-shot intro REFORM clock (seconds). -1 = pre-reveal (mark held dead);
  // set to 0 on the preloader hand-off at the hero top, counts to
  // INTRO_REFORM_RELEASE then holds (plays once per mount, hard load only).
  const introReformClock = useRef(-1);
  // Entry type, snapshotted on the first frame: true ⇒ soft route re-entry
  // (introComplete already true → no intro replay); false ⇒ hard load.
  const softEntryRef = useRef(false);
  // Eased global hover intensity for the analytic-dispersion static render:
  // target 1 while hovering, 0 otherwise; damped so the lift fades in/out and
  // the particles settle back softly when the cursor leaves.
  const hoverRef = useRef(0);

  // Render mode (fxStore). Subscribed REACTIVELY so toggling it live
  // (window.__sersanFx.getState().set({ heroRenderMode: "..." })) re-renders
  // the component and mounts/unmounts the particle meshes accordingly.
  const heroRenderMode = useFxStore((s) => s.heroRenderMode);
  // Explicit static debug toggle (also the shape of every degradation).
  const showStatic = heroRenderMode === "particles-static";
  // SPORES: the DDD-correct shipping render — instanced SHADED icospheres on
  // the compute sim + a solid occluder mark (bundle teardown, see gpgpuConfig).
  const showSpores = heroRenderMode === "spores";
  // Active VARIANT (Logo Lab): the whole spore look — colours, physics, hover
  // feel, regrow speed, single/double shell. Subscribed REACTIVELY so the
  // picker re-renders the component and the build effect rebuilds the rig.
  const heroPreset = useFxStore((s) => s.heroPreset);
  const preset = useMemo(() => getSporePreset(heroPreset), [heroPreset]);
  // Spore mode needs TRUE WebGPU compute. Flag-OFF (plain WebGL2 renderer) is
  // known synchronously; the WebGPURenderer's WebGL2 sub-backend is detected in
  // the spore build effect (async) and flips this state. Either way the mode
  // DEGRADES to the robust static-particle mark instead of going blank.
  const [sporeBackendFallback, setSporeBackendFallback] = useState(false);
  const sporeStaticFallback =
    showSpores && (!webgpuEnabled() || sporeBackendFallback);
  // The static build serves two masters: the explicit debug mode and the
  // spores degradation path.
  const showStaticBuild = showStatic || sporeStaticFallback;

  const worldViewWidth = WORLD_VIEW_HEIGHT * (size.width / size.height);

  // Static-fallback grid size for the active tier (full 448², lite 224²).
  // The BACKEND-FALLBACK path gets an honest budget instead of the tier's: it
  // only engages because the WebGPU renderer resolved to its WebGL2 sub-backend
  // — i.e. a weak/older GPU — and detectTier() returns "full" for any fine-
  // pointer viewport ≥768px without ever consulting GPU strength. Sampling 448²
  // (≈200k) there stalls exactly the machines least able to absorb it; lite
  // (224² ≈ 50k) is ~4× less work.
  const gridSize = sporeStaticFallback
    ? SIZE_BY_TIER.lite
    : (SIZE_BY_TIER[tier] ?? SIZE_BY_TIER.lite);

  // === Geometry: the Blender-built mark (sampled, NEVER rendered). ==========
  // drei caches the loaded geometry across remounts, so we CLONE it and only
  // ever mutate/dispose the clone — never the shared cached `src.geometry`.
  const { nodes } = useGLTF(MARK_GLB) as unknown as {
    nodes: Record<string, THREE.Object3D>;
  };
  const bodyGeometry = useMemo(() => {
    const src = Object.values(nodes).find(
      (n) => (n as THREE.Mesh).isMesh,
    ) as THREE.Mesh | undefined;
    if (!src) {
      throw new Error(`HeroLogo: no mesh found in ${MARK_GLB}`);
    }

    // Clone so the normalization below cannot touch drei's cached geometry.
    const geometry = src.geometry.clone();

    // Center, then uniformly scale to ~TARGET_HEIGHT tall, recenter — the SAME
    // envelope the procedural mark produced, so the anchoring math is unchanged.
    geometry.center();
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    if (bbox) {
      const height = bbox.max.y - bbox.min.y || 1;
      const s = TARGET_HEIGHT / height;
      geometry.scale(s, s, s);
    }
    geometry.center();
    return geometry;
  }, [nodes]);
  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry]);

  // === Raycast-target material ==============================================
  // The invisible cursor-raycast mesh needs SOME material on both backends
  // (never drawn — visible:false; the raycaster ignores visibility). Basic so
  // the WebGPU renderer auto-converts it without scene-lighting dependencies.
  const raycastMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0x7c5cff }),
    [],
  );
  useEffect(() => () => raycastMaterial.dispose(), [raycastMaterial]);

  // === Home positions: SIZE×SIZE surface samples → the rest field. ==========
  // homeRGBA seeds the per-instance aHome attribute; aRef is the per-instance
  // grid UV (hashed for size variance). The mesh is unrendered. GATED on the
  // static build actually being shown (448² ≈ 200k samples is real startup
  // work — don't pay it under the shipping spores mode).
  // NOT a useMemo: the sampling is a rejection loop over gridSize² surface
  // samples (hundreds of ms), and the flip that turns it on (setSporeBackendFallback
  // from the ASYNC backend probe) is a state set — so a memo body ran it
  // synchronously INSIDE a React commit, freezing the main thread (and the
  // shared Lenis/R3F loop with it) right across the preloader handoff. The rAF
  // defers the work past the commit so the frame that flips the fallback still
  // paints. Consumers already tolerate `null` (it is null for the whole spores
  // path), so the one-frame delay is safe.
  const [homeField, setHomeField] = useState<MarkHomeField | null>(null);
  useEffect(() => {
    if (!showStaticBuild) {
      setHomeField(null);
      return;
    }
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      setHomeField(sampleMarkHomePositions(bodyGeometry, gridSize));
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [bodyGeometry, gridSize, showStaticBuild]);

  // Spore home fields — TWO shells on their own (smaller) grid: the erodible
  // violet CRUST outside + the immortal glowing cyan CORE inset beneath it
  // (f_007: the revealed layer is the same spore material, lit). Gated on the
  // mode so the sampling cost isn't paid by the fallback path.
  const sporeGridSize = SPORE_SIZE_BY_TIER[tier] ?? SPORE_SIZE_BY_TIER.lite;
  // One home field per ACTIVE-PRESET layer (1 or 2). Variant switch → `preset`
  // changes → new array reference → the build effect below rebuilds the rig.
  const sporeHomes = useMemo(
    () =>
      showSpores && !sporeStaticFallback
        ? preset.layers.map((l) =>
            sampleMarkHomePositions(bodyGeometry, sporeGridSize, l.sampling),
          )
        : null,
    [bodyGeometry, sporeGridSize, showSpores, sporeStaticFallback, preset],
  );

  // Base spore radius in MODEL space: DDD's diameter ≈ markHeight/47, scaled up
  // on lite (fewer but bigger, like DDD mobile). fx.sporeSize multiplies live.
  // Taken from the OUTER layer so the per-preset diameter applies to both.
  const sporeBaseRadius =
    ((TARGET_HEIGHT * preset.layers[0].spore.DIAMETER_RATIO) / 2) *
    (tier === "lite" ? SPORE_LITE_RADIUS_SCALE : 1);

  // Solid GLOWING occluder under the spore crust (the DDD "SOLID.buf" trick):
  // the interior revealed when spores disperse. toneMapped:false so any HDR
  // values survive into the bloom pass (same discipline as the particle
  // materials). Color is written per frame from the ACTIVE variant's
  // `preset.occluder` (base × fade) so the opaque mesh follows the scroll fade
  // and recolours instantly on a Logo Lab switch.
  const sporeOccluderMaterial = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: 0x000000 });
    m.toneMapped = false;
    // Transparent so the scroll-out burst can fade the solid slab away while
    // its spore shells scatter (opacity driven per frame).
    m.transparent = true;
    return m;
  }, []);
  useEffect(() => () => sporeOccluderMaterial.dispose(), [sporeOccluderMaterial]);

  // Depth-only occluder for the STATIC fallback path (PIANO_FIX_VISUAL FIX 1a
  // fallback). The static particle build is additive with depthWrite:false, and
  // the spore occluder above is NOT mounted on this path — so with the line now
  // depthTest:true there would be nothing for it to test against and it would
  // float back over the static mark. This invisible mesh (colorWrite:false →
  // writes ONLY depth, no color, no visual change to the particle look) supplies
  // the solid mark-shaped depth footprint the line tests against, exactly like
  // the spore occluder does on the WebGPU path. Opaque so it draws before the
  // transparent line; visibility/depthWrite are gated by the scroll fade per
  // frame so the line can draw through once the mark recedes and leaves.
  const staticOccluderMaterial = useMemo(() => {
    const m = new THREE.MeshBasicMaterial();
    m.colorWrite = false; // depth-only: no color output, mark look unchanged
    m.depthWrite = true;
    m.depthTest = true;
    m.toneMapped = false;
    return m;
  }, []);
  useEffect(
    () => () => staticOccluderMaterial.dispose(),
    [staticOccluderMaterial],
  );

  // Static-build config (defaults + the live leva knobs applied per frame).
  const config = useMemo<GpgpuConfig>(
    () => ({ ...DEFAULT_GPGPU_CONFIG, SIZE: gridSize }),
    [gridSize],
  );

  // === STATIC build =========================================================
  // OFF → synchronous GLSL static build; ON → lazy TSL static build (same
  // dual-import discipline as the spore build). Reads POSITION from a
  // per-instance `aHome` vec3 attribute — no sim, no storage buffers.
  interface GlslStatic {
    geometry: THREE.InstancedBufferGeometry;
    material: THREE.ShaderMaterial & { uniforms: GpgpuStaticUniforms };
    uniforms: GpgpuStaticUniforms;
    dispose: () => void;
  }
  const [glslStatic, setGlslStatic] = useState<GlslStatic | null>(null);
  useEffect(() => {
    if (webgpuEnabled() || !showStaticBuild || !homeField) return;
    const build = createGpgpuStaticBuild(
      config,
      homeField.homeRGBA,
      homeField.aRef,
      homeField.count,
    );
    setGlslStatic(build);
    return () => {
      build.dispose();
      setGlslStatic(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStaticBuild, gridSize, homeField]);

  const [tslStatic, setTslStatic] = useState<TslStatic | null>(null);
  useEffect(() => {
    if (!webgpuEnabled() || !showStaticBuild || !homeField) return;
    let cancelled = false;
    let built: TslStatic | null = null;
    void Promise.all([
      import("three/webgpu"),
      import("three/tsl"),
      import("./gpgpu/gpgpuNodeSim"),
    ]).then(([webgpu, tslNs, mod]) => {
      if (cancelled) return;
      const b = mod.createStaticParticleNodeBuild(
        webgpu as never,
        tslNs as never,
        homeField.homeRGBA,
        homeField.aRef,
        homeField.count,
        config,
      );
      built = {
        geometry: b.geometry as unknown as THREE.InstancedBufferGeometry,
        material: b.material as unknown as THREE.Material,
        uFade: b.uFade,
        uPointSize: b.uPointSize,
        uPixelRatio: b.uPixelRatio,
        uViewport: b.uViewport as unknown as { value: THREE.Vector2 },
        uEmissive: b.uEmissive,
        uPointAlpha: b.uPointAlpha,
        uMouse: b.uMouse as unknown as { value: THREE.Vector3 },
        uHover: b.uHover,
        uTime: b.uTime,
        uRadius: b.uRadius,
        uPush: b.uPush,
        dispose: b.dispose,
      };
      setTslStatic(built);
    });
    return () => {
      cancelled = true;
      built?.dispose();
      setTslStatic(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStaticBuild, gridSize, homeField]);

  // === SPORE build (spores) ==================================================
  // Unified compute sim + instanced SHADED icospheres — TRUE WebGPU sub-backend
  // ONLY (storage-buffer compute no-ops on the WebGL2 fallback, three #31221).
  // On any other backend the mode degrades to the static-particle mark above
  // (no crash, no blank canvas).
  interface TslSpore {
    rig: GpgpuSimRig;
    geometry: THREE.InstancedBufferGeometry;
    material: THREE.Material;
    uFade: { value: number };
    uSporeRadius: { value: number };
    uEmissive: { value: number };
    uOrbit: { value: number };
    uOrbitFalloff: { value: number };
    uBurst: { value: number };
    uRegrowScale: { value: number };
    dispose: () => void;
  }
  const [tslSpore, setTslSpore] = useState<TslSpore[] | null>(null);
  useEffect(() => {
    if (!webgpuEnabled() || !showSpores || !sporeHomes) return;
    let cancelled = false;
    let built: TslSpore[] | null = null;
    void Promise.all([
      import("three/webgpu"),
      import("three/tsl"),
      import("./gpgpu/gpgpuNodeSim"),
    ]).then(([webgpu, tslNs, mod]) => {
      if (cancelled) return;
      // TRUE WebGPU sub-backend detection. The WebGPU backend leaves
      // `isWebGLBackend` UNDEFINED; only the WebGL backend sets it `true`. So
      // "is WebGPU" = backend present, NOT the WebGL backend, AND the renderer
      // exposes `compute`. (`=== false` was wrong: undefined !== false.)
      const bk = (gl as unknown as { backend?: { isWebGLBackend?: boolean } })
        .backend;
      const isWebGPUBackend =
        !!bk &&
        bk.isWebGLBackend !== true &&
        typeof (gl as unknown as { compute?: unknown }).compute === "function";
      if (!isWebGPUBackend) {
        // WebGL2 sub-backend: storage compute no-ops there (#31221) → degrade
        // the spores mode to the static-particle mark instead of going blank.
        setSporeBackendFallback(true);
        return;
      }
      // The ACTIVE variant's layers (1 = no outer crust, 2 = crust + core).
      const defs = preset.layers;
      built = defs.map((layer, i) => {
        const cfg: GpgpuConfig = { ...layer.config, SIZE: sporeGridSize };
        const b = mod.createSporeComputeNodeBuild(
          gl as never,
          webgpu as never,
          tslNs as never,
          sporeHomes[i].homeRGBA,
          sporeHomes[i].aRef,
          sporeGridSize,
          cfg,
          layer.spore,
          sporeBaseRadius,
        );
        return {
          rig: b.rig,
          geometry: b.geometry as unknown as THREE.InstancedBufferGeometry,
          material: b.material as unknown as THREE.Material,
          uFade: b.uFade,
          uSporeRadius: b.uSporeRadius,
          uEmissive: b.uEmissive,
          uOrbit: b.uOrbit,
          uOrbitFalloff: b.uOrbitFalloff,
          uBurst: b.uBurst,
          uRegrowScale: b.uRegrowScale,
          dispose: b.dispose,
        };
      });
      setTslSpore(built);
    });
    return () => {
      cancelled = true;
      built?.forEach((b) => b.dispose());
      setTslSpore(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sporeGridSize, sporeHomes, showSpores, preset]);

  // Active static build. OFF → GLSL; ON → TSL once resolved.
  const staticGeometry = glslStatic?.geometry ?? tslStatic?.geometry;
  const staticMaterial = (glslStatic?.material ?? tslStatic?.material) as
    | THREE.Material
    | undefined;

  // Reset the poster cross-fade if this component unmounts (tier change).
  useEffect(
    () => () => {
      useTierStore.getState().setHeroReady(false);
      announcedReady.current = false;
    },
    [],
  );

  // === Per-frame: shell choreography + model-space mouse + sim step =========
  // Scratch objects (no per-frame allocation).
  const planeN = useMemo(() => new THREE.Vector3(), []);
  const worldHit = useMemo(() => new THREE.Vector3(), []);
  const worldCenter = useMemo(() => new THREE.Vector3(), []);
  const plane = useMemo(() => new THREE.Plane(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const modelMouse = useMemo(() => new THREE.Vector3(), []);
  const tickParams = useMemo<GpgpuTickParams>(
    () => ({ dt: 1 / 60, time: 0, mouse: new THREE.Vector3() }),
    [],
  );
  const raycastHits = useMemo<THREE.Intersection[]>(() => [], []);
  // Invisible raycast target — the SAME normalized mark geometry under the SAME
  // spin transform, so a cursor ray returns the exact surface point being
  // pointed at. Fixes the parallax of the old plane-through-CENTER projection:
  // with the mark high in the viewport, the center-depth plane hit lands a few
  // tenths BELOW where the cursor visually sits on the front plate (user
  // report: parked cursor on the top bar eroded nothing).
  const raycastTargetRef = useRef<THREE.Mesh>(null);
  // Model-space z of the front plate — the plane fallback (cursor just off the
  // letter silhouette) passes through the FRONT FACE, not the center.
  const markFrontZ = useMemo(() => {
    bodyGeometry.computeBoundingBox();
    return bodyGeometry.boundingBox?.max.z ?? 0;
  }, [bodyGeometry]);

  /**
   * Project the smoothed cursor into the mark's model space → modelMouse.
   * Raycast the mark mesh first (exact point under the cursor, perspective-
   * correct); fall back to a camera-facing plane through the FRONT PLATE when
   * the ray misses the silhouette. MOUSE_OFF when not hovering.
   */
  function projectCursorToModel(spin: THREE.Group) {
    const drag = useHeroDragStore.getState();
    const ptr = usePointerStore.getState();
    if (!(drag.hovering && ptr.active)) {
      modelMouse.copy(MOUSE_OFF);
      return;
    }
    ndc.set(ptr.smooth.x * 2 - 1, -(ptr.smooth.y * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    const target = raycastTargetRef.current;
    if (target) {
      raycastHits.length = 0;
      raycaster.intersectObject(target, false, raycastHits);
      if (raycastHits.length > 0) {
        modelMouse.copy(raycastHits[0].point);
        spin.worldToLocal(modelMouse);
        return;
      }
    }
    // Near-miss fallback: plane through the front plate, camera-facing.
    worldCenter.set(0, 0, markFrontZ);
    spin.localToWorld(worldCenter);
    camera.getWorldDirection(planeN);
    plane.setFromNormalAndCoplanarPoint(planeN, worldCenter);
    if (raycaster.ray.intersectPlane(plane, worldHit)) {
      modelMouse.copy(worldHit);
      spin.worldToLocal(modelMouse);
    } else {
      modelMouse.copy(MOUSE_OFF);
    }
  }

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    const assembly = assemblyRef.current;
    const spin = spinRef.current;
    if (!group || !assembly || !spin) return;

    // Clamp delta: after a tab refocus / long stall R3F hands us a multi-second
    // delta that would over-shoot the tilt damp and the sim.
    const delta = Math.min(rawDelta, 1 / 30);

    if (!announcedReady.current) {
      announcedReady.current = true;
      useTierStore.getState().setHeroReady(true);
      // Snapshot entry type ONCE: introComplete already true here ⇒ a soft
      // route re-entry (skip the intro reform); false ⇒ a hard load (play it).
      softEntryRef.current = useIntroStore.getState().introComplete;
    }

    const fx = useFxStore.getState();
    const { progress } = useScrollStore.getState();
    const drag = useHeroDragStore.getState();
    const sh = anchors.scrollHeight;
    const ih = size.height;
    const scrollPx = progress * Math.max(sh - ih, 0);

    const heroSpan = anchors.spans["hero"];
    // No-span fallback = the spine's scrub travel (outer height − viewport),
    // derived from the shared SPINE constants instead of a stale hard-coded
    // multiple so a height change can never silently desync the choreography.
    const heroEndPx = heroSpan
      ? Math.max(heroSpan.end * sh - ih, 1)
      : ih * (SPINE_TRAVEL_VH / 100);
    const hp = THREE.MathUtils.clamp(scrollPx / heroEndPx, 0, 1);

    // Hold through the pin; recede + fade over the last quarter (identical to
    // the previous HeroLogo so the handoff is unchanged).
    const fade = 1 - THREE.MathUtils.smoothstep(hp, 0.74, 0.97);
    fadeRef.current = fade;
    group.visible = fade > 0.005;
    if (!group.visible) return;

    // Framing + scroll choreography. The at-rest values come from LIVE fxStore
    // knobs (heroOffsetX / heroOffsetY / heroPosZ / heroScale) so the mark can
    // be tuned in the leva "GPGPU hero" folder (window.__sersanFx in dev). The
    // defaults frame the wide 2.64×2 mark as a PROMINENT, front-facing, fully-
    // visible particle logo on the hero right, near the content plane (verified
    // against CAMERA_Z/FOV: at hp=0 the full mark sits inside the viewport with
    // margin across every desktop aspect). The hp terms keep the loved scroll
    // choreography on top of those rest values: the mark drifts gently left,
    // sinks a touch, and recedes as the camera "passes" it, Lusion-style.
    const baseScale = WORLD_VIEW_HEIGHT * fx.heroScale;
    // camDescend: during the intro's camera-descent beat the camera dives
    // ~one viewport while the page is still pinned — subtracting the applied
    // offset keeps the mark at its pre-descent station so the camera
    // genuinely leaves it behind (above the frame) instead of dragging it
    // along. 0 in every other state → identical to before.
    const camDescend = useTextMorphStore.getState().camDescend;
    group.position.set(
      worldViewWidth * (fx.heroOffsetX - hp * 0.05),
      camera.position.y +
        camDescend -
        WORLD_VIEW_HEIGHT * (fx.heroOffsetY + hp * 0.04),
      fx.heroPosZ - hp * 2.2,
    );
    group.scale.setScalar(baseScale * (1 - 0.2 * hp) * (0.92 + 0.08 * fade));

    // ANCHORED mark — no drag-to-rotate, no idle spin. The mark sits STILL at
    // its front-facing rest and only "looks toward" the cursor by a few degrees:
    // a soft mouse-parallax tilt that eases on top of the fixed TILT base and
    // returns to rest (0,0) when the pointer is centered/absent.
    //
    // The smoothed pointer is clip [0..1] top-left; map to NDC-ish −1..1 from
    // screen center (X→right, Y→up). Target yaw follows X, target pitch is the
    // BASE tilt minus pointer-Y (look up when the cursor is high). Damp toward
    // it with THREE.MathUtils.damp so it eases smoothly. The drag layer still
    // captures the pointer (it feeds `hovering` for the repulsion below) — its
    // drag velocity is simply ignored, so click-and-hold never moves the mark.
    const ptr = usePointerStore.getState();
    const maxTilt = fx.gpgpuTilt;
    const px = ptr.active ? ptr.smooth.x * 2 - 1 : 0;
    const py = ptr.active ? -(ptr.smooth.y * 2 - 1) : 0;
    const targetYaw = px * maxTilt;
    const targetPitch = TILT - py * maxTilt;
    // `spin` carries the parallax yaw, `assembly` the parallax pitch (its base
    // is the fixed TILT). damp(current, target, lambda, dt) eases frame-rate
    // independently toward rest when the pointer is centered/absent.
    spin.rotation.y = THREE.MathUtils.damp(
      spin.rotation.y,
      targetYaw,
      TILT_DAMP,
      delta,
    );
    assembly.rotation.x = THREE.MathUtils.damp(
      assembly.rotation.x,
      targetPitch,
      TILT_DAMP,
      delta,
    );

    // --- STATIC fallback feed (analytic dispersion) --------------------------
    // The static render reads its own per-instance `aHome` positions (no sim,
    // no rig to step) and analytically displaces particles near the cursor in
    // the vertex shader. Feed it the model-space cursor + eased hover so the
    // lift fades in/out, plus the live render/force knobs.
    if (showStaticBuild) {
      const dprStatic = Math.min(gl.getPixelRatio(), 2);

      // Depth-only occluder follows the scroll fade: while the mark is on screen
      // it writes depth so the signature line is clipped behind the mark's
      // silhouette; once the mark recedes/fades out (fade → 0) stop writing depth
      // so the line can draw through the empty frame the mark left behind.
      const occlude = fade > 0.5;
      staticOccluderMaterial.depthWrite = occlude;
      staticOccluderMaterial.visible = occlude;

      // Eased hover: target 1 while the hero is hovered (and a pointer is
      // active), else 0. Damping it gives the soft settle on cursor-leave.
      const hoverTarget = drag.hovering && ptr.active ? 1 : 0;
      hoverRef.current = THREE.MathUtils.damp(
        hoverRef.current,
        hoverTarget,
        4,
        delta,
      );

      // Model-space cursor — raycast the mark mesh / front-plate plane (shared
      // helper), so the dispersion lands exactly under the cursor.
      projectCursorToModel(spin);

      simTimeRef.current += delta;

      if (glslStatic) {
        const u = glslStatic.uniforms;
        u.uPointSize.value = fx.gpgpuPointSize;
        u.uPixelRatio.value = dprStatic;
        u.uViewport.value.set(size.width * dprStatic, size.height * dprStatic);
        u.uFade.value = fade;
        u.uEmissive.value = fx.gpgpuEmissive;
        u.uPointAlpha.value = fx.gpgpuPointAlpha;
        u.uMouse.value.copy(modelMouse);
        u.uHover.value = hoverRef.current;
        u.uTime.value = simTimeRef.current;
        u.uRadius.value = fx.gpgpuRadius;
        u.uPush.value = fx.gpgpuPush;
      }
      if (tslStatic) {
        tslStatic.uPointSize.value = fx.gpgpuPointSize;
        tslStatic.uPixelRatio.value = dprStatic;
        tslStatic.uViewport.value.set(
          size.width * dprStatic,
          size.height * dprStatic,
        );
        tslStatic.uFade.value = fade;
        tslStatic.uEmissive.value = fx.gpgpuEmissive;
        tslStatic.uPointAlpha.value = fx.gpgpuPointAlpha;
        tslStatic.uMouse.value.copy(modelMouse);
        tslStatic.uHover.value = hoverRef.current;
        tslStatic.uTime.value = simTimeRef.current;
        tslStatic.uRadius.value = fx.gpgpuRadius;
        tslStatic.uPush.value = fx.gpgpuPush;
      }
      return;
    }

    // --- SPORES (instanced shaded spheres on the unified compute sim) -------
    if (showSpores && !sporeStaticFallback) {
      // Scroll-out dissolve — the EXPLODE half of the arc, STAGGERED per layer:
      // the OUTER crust expands FIRST on a tight window, the inner core LAGS and
      // only completes by the END of the hero (client 2026-06-29: "lo strato di
      // sopra inizia ad espandersi prima di quello di sotto"). Still starts with
      // the first scroll ticks; both reach ~full by hp≈1 ⇒ a complete explosion
      // to nothing. Regrow in place on scroll-back.
      const burstCrust = THREE.MathUtils.smoothstep(hp, 0.02, EXPLODE_CRUST_END);
      const burstCore = THREE.MathUtils.smoothstep(
        hp,
        EXPLODE_CORE_LAG,
        EXPLODE_CORE_END,
      );

      // ONE-SHOT intro REFORM-from-nothing (HARD load only): the mark is held
      // DEAD behind the preloader curtain (clock < 0 ⇒ envelope PEAK) and
      // respawns + regrows from nothing once it lifts — the reverse of the
      // scroll explode above. A soft route re-entry shows the logo already
      // present (softEntryRef ⇒ introBurst 0, no replay).
      if (!softEntryRef.current) {
        if (introReformClock.current < 0) {
          if (tslSpore && useIntroStore.getState().introComplete && hp < 0.05) {
            introReformClock.current = 0;
          }
        } else if (introReformClock.current < INTRO_REFORM_RELEASE) {
          introReformClock.current += delta;
        }
      }
      const introBurst = softEntryRef.current
        ? 0
        : introReformEnvelope(introReformClock.current);
      // Crawl the regrow rate ONLY during the intro window so the first reveal
      // blooms in very slowly (client: "molto più lento"); 1 everywhere else
      // keeps the preset's faster hover / scroll-back regrow.
      const introRegrowScale =
        !softEntryRef.current &&
        introReformClock.current >= 0 &&
        introReformClock.current < INTRO_REFORM_RELEASE
          ? INTRO_REFORM_REGROW_SLOW
          : 1;
      // Occluder body: on scroll it follows the TRAILING core (stays solid
      // behind the crust as that leads off). During the intro reform it must NOT
      // show as a dim "spento" logo under the slowly-blooming particles (client
      // 2026-06-29) — keep it HIDDEN through the materialise and fade it in only
      // over the LAST INTRO_REFORM_BODY_REVEAL seconds, so the reform reads as
      // forming from nothing/particles with the body filling in behind at the end.
      const introBodyReveal = softEntryRef.current
        ? 1
        : THREE.MathUtils.smoothstep(
            introReformClock.current,
            INTRO_REFORM_RELEASE - INTRO_REFORM_BODY_REVEAL,
            INTRO_REFORM_RELEASE,
          );
      const occBurst = Math.max(burstCore, 1 - introBodyReveal);

      // The opaque occluder follows the scroll fade AND that burst — a solid
      // dark slab can't hang around while the shells scatter, and it must vanish
      // ENTIRELY during the intro for a true "from nothing" reform. Colour is
      // the ACTIVE variant's occluder (what shows through eroded gaps) — read
      // from the live store so a Logo Lab switch recolours it now.
      const occDim = fade * (1 - occBurst) * (1 - occBurst);
      const occCol = getSporePreset(fx.heroPreset).occluder;
      sporeOccluderMaterial.color.setRGB(
        occCol[0] * occDim,
        occCol[1] * occDim,
        occCol[2] * occDim,
      );
      sporeOccluderMaterial.opacity = 1 - occBurst;
      sporeOccluderMaterial.visible = occBurst < 0.97;
      if (!tslSpore) return; // occluder-only until the lazy build resolves

      // Model-space cursor via the raycast helper: the repulsion center is the
      // exact mark-surface point under the cursor (perspective-correct).
      projectCursorToModel(spin);

      simTimeRef.current += delta;
      tickParams.dt = delta;
      tickParams.time = simTimeRef.current;
      tickParams.mouse.copy(modelMouse);

      for (let i = 0; i < tslSpore.length; i++) {
        const layer = tslSpore[i];
        layer.rig.tick(tickParams);
        layer.uFade.value = fade;
        layer.uSporeRadius.value = sporeBaseRadius * fx.sporeSize;
        layer.uEmissive.value = fx.sporeEmissive;
        // Attractor orbit term (C3): ratio of each layer's own PUSH, so the
        // pinned core keeps its whisper while the crust swirls. Falloff-gated
        // → the resting crust is untouched at any knob value.
        layer.uOrbit.value = fx.sporeAttractor;
        layer.uOrbitFalloff.value = fx.sporeOrbitFalloff;
        // STAGGERED explode: the OUTER crust (i=0) leads, inner layers (the
        // core) lag, so the upper layer expands before the lower. The intro
        // reform (when active) hits every layer together via max().
        const scrollBurst = i === 0 ? burstCrust : burstCore;
        layer.uBurst.value = Math.max(scrollBurst, introBurst);
        // Slow ONLY the intro materialise bloom; 1 the rest of the time.
        layer.uRegrowScale.value = introRegrowScale;
      }
      return;
    }
  });

  // STATIC mesh — the particle billboards at their HOME positions
  // (per-instance `aHome`), analytic cursor dispersion in the vertex stage.
  // Parented under the SAME spin/assembly/group stack as the spores so every
  // path is framed identically. Renders once the build resolves (synchronous
  // on OFF; after the lazy TSL chunk on ON).
  const staticMesh =
    showStaticBuild && staticGeometry && staticMaterial ? (
      <mesh
        geometry={staticGeometry}
        material={staticMaterial}
        frustumCulled={false}
      />
    ) : null;

  // Depth-only occluder for the static path (FIX 1a fallback) — invisible
  // (colorWrite:false) solid mark that writes depth so the signature line is
  // clipped behind the static mark, mirroring the spore occluder on the WebGPU
  // path. Parented under the SAME spin/assembly/group stack as the particles so
  // its depth footprint lines up exactly with the rendered mark.
  const staticOccluderMesh = showStaticBuild ? (
    <mesh
      geometry={bodyGeometry}
      material={staticOccluderMaterial}
      frustumCulled={false}
    />
  ) : null;

  // SPORE meshes (spores): dark occluder mark + TWO instanced sphere shells
  // (violet erodible crust outside, glowing cyan immortal core beneath). ALL
  // opaque + depth-tested — the depth buffer does the compositing (front balls
  // occlude back balls and nest into the occluder), no renderOrder/blending.
  const sporeMeshes =
    showSpores && !sporeStaticFallback ? (
    <>
      <mesh geometry={bodyGeometry} material={sporeOccluderMaterial} />
      {tslSpore?.map((layer, i) => (
        <mesh
          key={i}
          geometry={layer.geometry}
          material={layer.material}
          frustumCulled={false}
        />
      ))}
    </>
  ) : null;

  return (
    <group ref={groupRef} visible={false}>
      {/* Assembly carries the pitch (base TILT + parallax); the model-space
          mouse is computed against THIS group's worldToLocal so repulsion
          follows the faint parallax tilt. `spin` carries the parallax yaw. */}
      <group ref={assemblyRef} rotation={[TILT, 0, 0]}>
        <group ref={spinRef}>
          {/* Invisible cursor-raycast target: the SAME normalized mark geometry
              under the SAME transform. Never rendered (visible=false — the
              raycaster ignores visibility), purely the projection surface for
              projectCursorToModel. */}
          <mesh
            ref={raycastTargetRef}
            geometry={bodyGeometry}
            material={raycastMaterial}
            visible={false}
          />
          {staticOccluderMesh}
          {staticMesh}
          {sporeMeshes}
        </group>
      </group>
    </group>
  );
}
