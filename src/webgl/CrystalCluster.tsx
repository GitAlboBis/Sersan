"use client";

/**
 * CrystalCluster — the ROUND-5 W3 "3D stones" island (igloo transplant,
 * research/2026-08-21-igloo-stones-dossier.md): ONE hero crystal per neural
 * section, floating in the open right two-thirds of the same
 * `[data-lattice-anchor]` band the signal stream owns, with the stream
 * demoted to ambient current around/behind it (config-level defaults in
 * neuralLatticeConfig — the round-5 demotion).
 *
 * ROUND 8-H — THE MESH IS NOW AUTHORED, NOT PROCEDURAL (research/
 * 2026-08-22-round8-blender-slab-log.md). This driver loads
 * `/models/crystal-intact.glb` (healthy, 450 tris) or
 * `/models/crystal-fractured.glb` (broken, 1 114 tris, 8 pieces tiling the
 * slab) through crystalBuild's module-cached NON-SUSPENDING loader — awaited
 * inside the existing lazy-build effect, never useGLTF/Suspense, which would
 * wedge the island's commit queue (the RouteHeroLogo post-mortem). Both tiers
 * get the same file (it is cheaper than the procedural lite build); a failed
 * load falls back to the round-7 procedural geometry so the section can never
 * be stone-less. `build.shardCentrs` / `.shardRands` — which this driver's
 * callout projection and the ember SDF both ride — are read straight out of
 * the GLB's 8 unique `_CENTR`/`_RAND` values in authoring (= volume
 * descending) order, so the "one source" contract below is unchanged: the
 * SAME numbers fill the vertex attributes and the CPU twin. The REST EXPLODE
 * GAP comes off the build too (`build.restGap`) rather than off the config:
 * the offset is `centr·gap`, and the authored centroids are ~1.9× longer than
 * the procedural fallback's, so the two paths need different rest values to
 * occupy the same band (derivation on FRACTURE_REST_GAP_AUTHORED).
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
 * calls setPulse), scrollStore.reveal for the arrival ramp + .velocity for
 * the §B-f speed compression. Refs + getState only inside useFrame; zero
 * per-frame allocation (the only guarded exceptions: a short `toFixed`
 * string when a CSS var actually changes, and a CustomEvent on the RARE
 * callout-window rising edge).
 *
 * ROUND 7-2b (research/2026-08-22-round7-stones-v2-anatomy.md, Part B):
 *   - §B-a INNER OBJECT — healthy + full tier + true-WebGPU backend builds
 *     the SERSAN-mark transmission RT (crystalMarkRT.ts): the shared
 *     RouteHeroLogo mark geometry rendered unlit into a mipmapped RT from
 *     THIS island's existing useFrame (no new loops — the PointerFlowmap
 *     idiom), sampled by crystalBuild (+2 fragment bindings, the material's
 *     ONLY texture). MARK_SPIN=0 default → the RT renders ONCE (igloo-rigid);
 *     a dev-handle spin re-renders per visible frame. WebGL2 fallback: branch
 *     not built until the ?backend=webgl2 proof (MARK_RT_WEBGL2). Broken
 *     instead gets the in-shader amber ember core (zero bindings — all in
 *     crystalBuild). ROUND 9-C moved the SAMPLING (crystal-local ortho map →
 *     igloo's origin-registered projective one) entirely inside crystalBuild's
 *     fragment; this island is unchanged except that it now hands the mesh
 *     quaternion to `rig.render()` for the documented MARK_TUMBLE flag, which
 *     is false by default and leaves the RT render-once.
 *   - §B-c PLEXUS — healthy + full tier only (restraint): the igloo net
 *     (crystalPlexus.ts), 2 position-only draw calls mounted in this group,
 *     advanced from this useFrame; its connect gate |a| < 0.30 makes it
 *     dissolve itself between sections via the 0.35 s tweens.
 *   - §B-d CALLOUT GATING — per-callout visibility windows over the same
 *     centering scalar `a`, damped asymmetrically (0.4 s in / 0.2 s out) and
 *     written as `--callout-N-vis` CSS vars (globals.css maps them to
 *     opacity; fallback 1 keeps SSR/fallback tiers always-visible). A rising
 *     edge re-triggers the LabelScrambler decode via a bubbling
 *     "sersan:scramble" CustomEvent on the callout span.
 *   - §B-f SCROLL FEEL — tumble reads the deadzone-remapped a′ (settles
 *     upright through a ±0.08 window, the no-hijack autoCenter twin) and the
 *     group scale compresses with damped |velocity| (the camera-write-free
 *     twin of igloo's fov coupling; PostFXNodes already consumes the same
 *     velocity channel for warp/vignette — nothing new there). NO camera
 *     writes, ever.
 *
 * ROUND 8-E — THE VALUE WORLD (research/2026-08-22-round8-stone-source-
 * anatomy.md §B4.2). This driver owns the COUPLING that makes the fix work.
 * The stone reads as a glowing outline on black because its body sits at
 * 1.03:1 against the page while its highlights run to 54:1; the cure needs a
 * luminous world behind it — but `crystalBuild` never samples the framebuffer
 * (its body comes from the procedural `backdrop()`, and it composites at
 * CRYSTAL_ALPHA 0.94, so only 6 % of anything drawn behind it reaches the
 * body). So the fix is TWO halves that must move together:
 *   1. `crystalFog.ts` — one soft navy quad mounted in THIS group at
 *      renderOrder −4 (drawn BEFORE the crystal, so the stone composites OVER
 *      it rather than being washed by an additive layer on top). Anisotropic
 *      and ASYMMETRIC: its inward x radius is the crystal's own distance to
 *      the band centre-line, so the falloff reaches exactly 0 there — the
 *      hard a11y gate (`--ink-mute` over the fog core is 2.8:1, an AA fail)
 *      is satisfied BY CONSTRUCTION at every viewport width, not by tuning.
 *      The copy does cross the centre-line at 1280; the worst pixel any copy
 *      sees is alpha 0.017 → 5.8:1, and AA only breaks at 0.164. The full
 *      per-width derivation lives on FOG_CLEAR in crystalConfig — re-run it
 *      if the gain, the opacity or the copy measure move.
 *   2. `uBackdropGain` on the crystal, written from the SAME `fogDrive`
 *      scalar as the quad's opacity, so body and surround always track and
 *      igloo's 0.79 body/surround ratio is CONSTRUCTED rather than the
 *      coincidence of two independent constants it used to be (doc §B3's ⚠).
 * One dev-handle knob (`feel.fogEnergy`) moves both; at 0 the render is
 * exactly the pre-round-8 look. Everything else (radii, clearance, falloff,
 * gain, opacity) is on the same handle.
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
import { useTraverseStore, type TraverseFrame } from "./store/traverseStore";
import {
  traverseConfig,
  traverseRate,
  type TraverseBandId,
} from "./neural/traverseConfig";
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
  // Round 7-2b (anatomy pass)
  MARK_RT_WEBGL2,
  PLEXUS_CONNECT_WINDOW,
  CALLOUT_VIS_WINDOWS,
  CALLOUT_VIS_IN_LAMBDA,
  CALLOUT_VIS_OUT_LAMBDA,
  CALLOUT_VIS_EPS,
  TUMBLE_DEADZONE,
  CRYSTAL_VEL_NORM,
  CRYSTAL_VEL_SCALE_K,
  CRYSTAL_VEL_LAMBDA_UP,
  CRYSTAL_VEL_LAMBDA_DOWN,
  // Round 8-E (the value world)
  BACKDROP_GAIN,
  FOG_CLEAR,
  FOG_ENERGY,
  FOG_FALLOFF,
  FOG_GAIN,
  FOG_OPACITY,
  FOG_RADIUS_OUT,
  FOG_RADIUS_Y,
} from "./neural/crystalConfig";
import type { CrystalBuild } from "./neural/crystalBuild";
import type { CrystalFogBuild } from "./neural/crystalFog";
import type { MarkRTRig } from "./neural/crystalMarkRT";
import type { CrystalPlexus } from "./neural/crystalPlexus";
import { loadMarkGeometry } from "./RouteHeroLogo";

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
  const { size, camera, gl } = useThree();
  const measureVersion = useSectionStore((s) => s.measureVersion);
  const broken = mode === "broken";
  const surfaceKey = broken ? ("broken" as const) : ("healthy" as const);

  // --- Lazy build (three/webgpu chunk loads ONLY here) ----------------------
  const [build, setBuild] = useState<CrystalBuild | null>(null);
  const [plexus, setPlexus] = useState<CrystalPlexus | null>(null);
  const [fog, setFog] = useState<CrystalFogBuild | null>(null);
  const markRigRef = useRef<MarkRTRig | null>(null);
  const liteRef = useRef(false);
  /** Round 8-H — did the authored slab actually land (vs the procedural
   * fallback)? Dev-handle only; the render path never branches on it. */
  const authoredRef = useRef(false);

  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let built: CrystalBuild | null = null;
    let markRig: MarkRTRig | null = null;
    let plexusBuilt: CrystalPlexus | null = null;
    let fogBuilt: CrystalFogBuild | null = null;

    void Promise.all([
      import("three/webgpu"),
      import("three/tsl"),
      import("./neural/crystalBuild"),
      import("./neural/crystalMarkRT"),
      import("./neural/crystalPlexus"),
      import("./neural/crystalFog"),
    ]).then(async ([webgpu, tslNs, mod, markMod, plexusMod, fogMod]) => {
      if (cancelled) return;
      // ROUND 8-H — the authored slab (crystal-intact / crystal-fractured
      // .glb). NON-SUSPENDING by construction: a module-cached loader promise
      // awaited inside this existing lazy-build effect, exactly like
      // RouteHeroLogo.loadMarkGeometry — never useGLTF/Suspense, which would
      // wedge the island's commit queue (RouteHeroLogo header post-mortem).
      // 84 KB / 160 KB uncompressed, fetched behind the island chunk, and
      // shared by every mount of the same mode for the session. `null` (404,
      // parse failure) → createCrystalBuild rebuilds the round-7 procedural
      // geometry, so the section can never end up stone-less.
      const sourceGeometry = await mod.loadCrystalGeometry(mode);
      if (cancelled) return;
      authoredRef.current = !!sourceGeometry;
      // Phone budget: `getState()`, never a subscription (commit wedge).
      const lite = useTierStore.getState().fxBudget.level <= 2;
      liteRef.current = lite;
      // Round 7-2b §B-a — the mark transmission RT (healthy + full tier).
      // Backend probe (NeuralLattice idiom): the WebGL2 fallback compiles
      // the node material unchanged, but the mark-RT branch stays UN-BUILT
      // there (procedural backdrop only — graceful, no black frame) until
      // the repo-wide ?backend=webgl2 proof passes (flip MARK_RT_WEBGL2).
      const bk = (gl as unknown as { backend?: { isWebGLBackend?: boolean } })
        .backend;
      const backendIsWebGPU = !!bk && bk.isWebGLBackend !== true;
      if (!broken && !lite && (backendIsWebGPU || MARK_RT_WEBGL2)) {
        markRig = markMod.createMarkRT(webgpu as never);
        markRigRef.current = markRig;
        // The SAME session-shared normalized mark geometry RouteHeroLogo
        // preloads at module eval — virtually always resolved already.
        void loadMarkGeometry().then((geo) => {
          if (!cancelled && geo) markRig?.setGeometry(geo);
        });
      }
      built = mod.createCrystalBuild({
        webgpu: webgpu as never,
        tsl: tslNs as never,
        mode,
        lite,
        markTexture: markRig ? markRig.texture : undefined,
        // Round 8-H: BOTH tiers get the authored asset — 450 / 1 114 tris is
        // cheaper than the procedural lite build, so there is no reduced
        // variant and no tier branch here.
        sourceGeometry,
      });
      // Round 7-2b §B-c — the plexus net (healthy + full tier; restraint).
      if (!broken && !lite) {
        plexusBuilt = plexusMod.createCrystalPlexus(
          webgpu as never,
          tslNs as never,
        );
      }
      // Round 8-E §B4.2 part 1 — the fog volume, on EVERY tier including
      // lite: one quad, one draw call, ~15 ALU. The value world is what makes
      // the stone read as mass at all, so it is not a full-tier garnish.
      fogBuilt = fogMod.createCrystalFog({
        webgpu: webgpu as never,
        tsl: tslNs as never,
      });
      setBuild(built);
      setPlexus(plexusBuilt);
      setFog(fogBuilt);
    });

    return () => {
      cancelled = true;
      built?.dispose();
      markRig?.dispose();
      plexusBuilt?.dispose();
      fogBuilt?.dispose();
      markRigRef.current = null;
      setBuild(null);
      setPlexus(null);
      setFog(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, gl]);

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
        el.style.removeProperty(`--callout-${i}-vis`);
      }
    };
  }, []);

  // --- Per-frame driver -----------------------------------------------------
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  /**
   * ROUND 11 STAGE 1.5 — THE STONE TRAVELS. Stage 1 gave the net a lateral rig
   * and gave the stone nothing, so while the net slid 1895 px left the
   * meteorite sat perfectly still on a moving world. This ref is the whole
   * fix's input: the SAME frozen frame the net reads, never a second one.
   */
  const traverseRef = useRef<TraverseFrame | null>(null);
  /** Round 8-E — the fog quad. Scaled per-frame to world radii derived from
   * the anchor rect (the group is UNIFORMLY scaled, so the anisotropy has to
   * live on the child's own scale). */
  const fogRef = useRef<THREE.Mesh>(null);
  const scratch = useRef(new THREE.Vector3());
  const anchorScratch = useRef(new THREE.Vector3());
  const revealDamped = useRef(0);
  const clock = useRef(0);
  const pulseEased = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  const recohereTarget = useRef(0);
  const recohereEnv = useRef(0);
  const prevHovered = useRef<number | null>(null);
  // Placeholder only — the frame loop bails on `!build` and re-derives this
  // from `build.restGap` before any consumer (uGap, the callout twin) reads it.
  const gapRef = useRef(broken ? FRACTURE_REST_GAP : 0);
  const flashRef = useRef(0);
  // Damped projected callout values (per index: left%, edge-offset%) + the
  // last WRITTEN values (write-on-change gate) + a first-frame snap flag.
  const calloutVals = useRef<number[]>(new Array(CLUSTER_COUNT * 2).fill(0));
  const calloutWritten = useRef<number[]>(
    new Array(CLUSTER_COUNT * 2).fill(-1e9),
  );
  const calloutInit = useRef(false);
  // Round 7-2b §B-d — per-callout gating (target, damped value, last write).
  const visTargets = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  const visVals = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  const visWritten = useRef<number[]>(new Array(CLUSTER_COUNT).fill(-1));
  // §B-f — damped normalized |velocity| for the scale compression.
  const velEased = useRef(0);
  // Live-tunable FEEL knobs (dev handle `feel` — mutate from the console;
  // config constants are the defaults, spec: dev-handle tunables for every
  // new knob, including the JS-side ones).
  const feel = useRef({
    /** ROUND 10-A — the stone's uniform size (CRYSTAL_SCALE), wired live
     * because it is the one number the owner judges by eye and it used to
     * need an edit + reload. Read in BOTH the group's world scale AND the
     * callout projection's px-per-unit twin, so the twin can never desync
     * from the render. ⚠ RIPPLE_FREQ / RIPPLE_AMP / SPARKLE_FREQ are BAKED
     * graph literals derived against this value (they hold their on-screen
     * period) — moving it live does NOT move them; bake a found value back
     * into crystalConfig and re-derive there. */
    scale: CRYSTAL_SCALE,
    deadzone: TUMBLE_DEADZONE,
    velNorm: CRYSTAL_VEL_NORM,
    velScaleK: CRYSTAL_VEL_SCALE_K,
    connectWindow: PLEXUS_CONNECT_WINDOW,
    visWindows: CALLOUT_VIS_WINDOWS.map(
      (w) => [w[0], w[1]] as [number, number],
    ),
    // --- Round 8-E value world (every new knob is live-tunable) -----------
    /** THE coupling scalar. Drives the fog quad's opacity AND the crystal's
     * uBackdropGain from one value, so body and surround can never drift
     * apart. 0 = exactly the pre-round-8 render. */
    fogEnergy: FOG_ENERGY,
    /** Target for uBackdropGain at full energy. */
    backdropGain: BACKDROP_GAIN,
    fogGain: FOG_GAIN,
    fogOpacity: FOG_OPACITY,
    fogFalloff: FOG_FALLOFF,
    /** ⚠ A11Y GATE — multiplier on |CRYSTAL_POS[mode].x| for the fog's INWARD
     * x radius. ≤ 1 keeps the falloff's zero at (or right of) the band
     * centre-line, i.e. out of the copy column, where `--ink-mute` over the
     * fog core would be 2.8:1 (AA fail). CLAMPED to [0,1] in the driver —
     * setting it higher from the console does nothing, by design. */
    fogClear: FOG_CLEAR,
    fogRadiusOut: FOG_RADIUS_OUT,
    fogRadiusY: FOG_RADIUS_Y,
  });

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    const mesh = meshRef.current;
    if (!group || !mesh || !rect || !build) return;
    const delta = Math.min(rawDelta, 1 / 30);

    const ih = size.height;
    const vw = size.width;
    const k = WORLD_VIEW_HEIGHT / ih;

    // ── ROUND 11 STAGE 1.5 — THE TRAVERSE RIG ──────────────────────────────
    // ONE FROZEN READ, SHARED. The stone's vertical (`vpTop`), its lateral,
    // its tumble scalar `a`, its callout windows, its plexus gate and its
    // projected callout vars all derive from the SAME snapshot the net's rig
    // derives from. A stone on `window.scrollY` and a net on the frame would
    // shear by up to 22 px at a hard flick — two objects at the same depth
    // disagreeing, which is exactly what the store exists to prevent.
    //
    // THE LATERAL IS APPLIED TO `cx`, NOT TO A CHILD TRANSFORM, and that is
    // deliberate. This group is UNIFORMLY scaled by `s` (≈1.106 world units at
    // the reference band), so a child translate would render at `x·s` — off by
    // 10.6 % here and by whatever `s` happens to be at every other viewport,
    // band height and velocity compression. Folded into `cx` it goes through
    // the same `(cx − vw/2)·k` + camera-quaternion path the placement already
    // uses, i.e. OUTSIDE the group scale by construction, exactly equivalent
    // to NeuralLattice's `rig.position.x = lateralPx·k` inside a scale-1 group.
    //
    // The origin is this band's own arrival — the identical expression the
    // island uses on the identical rect — so the stone and the net that share
    // this anchor can never differ by more than float noise.
    let tv = traverseRef.current;
    if (!tv) {
      tv = useTraverseStore.getState().bands[anchorId] ?? null;
      traverseRef.current = tv;
    }
    const onBand = !!tv && tv.active;
    const scrollY = onBand ? tv!.scrollY : window.scrollY;
    let lateralPx = 0;
    if (onBand) {
      lateralPx = tv!.xScenePx;
      const bcfg = traverseConfig.bands[anchorId as TraverseBandId];
      if (bcfg && traverseConfig.islands.compensate) {
        const centreScroll = rect.docTop + rect.h / 2 - ih / 2;
        const travelledAtCentre = Math.min(
          Math.max(centreScroll - tv!.secTop, 0),
          tv!.secH,
        );
        lateralPx -= bcfg.dir * traverseRate(bcfg) * travelledAtCentre;
      }
    }

    const vpTop = rect.docTop - scrollY;
    const pos = CRYSTAL_POS[mode];
    // Crystal center in viewport px (CSS y down; config +y is up).
    const cx = rect.cxBase + pos[0] * rect.w + lateralPx;
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
    const ss = useScrollStore.getState();
    revealDamped.current = THREE.MathUtils.damp(
      revealDamped.current,
      ss.reveal * vis,
      2.5,
      delta,
    );
    const reveal = revealDamped.current;
    const feelC = feel.current;

    // --- Round 7-2b §B-f — velocity → scale compression: the camera-write-
    // free twin of igloo's fov = 45 − 5·vel (SignatureLine owns the camera).
    // Damped with the PostFXNodes λ 6/3 grammar so both speed-compressions
    // read as one system; PostFXNodes already consumes the same velocity
    // channel for warp/vignette — nothing to feed there. -------------------
    const velTarget = Math.min(
      (ss.velocity < 0 ? -ss.velocity : ss.velocity) / feelC.velNorm,
      1,
    );
    velEased.current = THREE.MathUtils.damp(
      velEased.current,
      velTarget,
      velTarget > velEased.current
        ? CRYSTAL_VEL_LAMBDA_UP
        : CRYSTAL_VEL_LAMBDA_DOWN,
      delta,
    );
    const scaleMul =
      (0.8 + 0.2 * reveal) * (1 - feelC.velScaleK * velEased.current);

    // Camera-locked placement, UNIFORM scale (see header). ROUND 10-A reads
    // the size off the dev handle (`feel.scale`, default CRYSTAL_SCALE 0.115)
    // so it can be judged live; the callout projection below reads the SAME
    // value, which is what keeps its px-per-unit twin exact.
    // ⚠ CHECK-ROUND — THIS IS ONE OF THE TWO LINES THAT MUST CHANGE WHEN THE
    // §problem / §trust SECTIONS GROW. `rect.h` is the band, and a band-keyed
    // scale makes the stone 1677 px tall at the round-11 4392 px band. The
    // prepared one-liner is `ih * k * feelC.scale * scaleMul` with
    // CRYSTAL_SCALE re-based to 0.0926; the other line is `pxScale` below and
    // the two MUST move together. Full audit table on crystalConfig
    // CRYSTAL_SCALE ("PREPARED CHANGE"). Deliberately NOT applied yet — the
    // owner is still judging the 0.17 → 0.115 shrink at today's band size.
    const s = rect.h * k * feelC.scale * scaleMul;
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
    // Round 7-2b §B-f — settle deadzone: the TUMBLE reads a′ (remapped so a
    // ±deadzone window around center holds exactly upright) — native scroll
    // never rests at exact center, this is the no-hijack twin of igloo's
    // autoCenter outcome. Gating (callout windows, plexus) keeps the raw a.
    const dz = feelC.deadzone;
    const aT =
      dz > 0 && dz < 1
        ? (Math.sign(a) * Math.max(Math.abs(a) - dz, 0)) / (1 - dz)
        : a;
    const gain = TUMBLE_GAIN[mode];
    const rnd = TUMBLE_RAND[mode];
    mesh.rotation.set(
      TUMBLE_K[0] * rnd[0] * gain * aT +
        Math.sin(t * WOBBLE_FREQ + WOBBLE_SEEDS[0]) * WOBBLE_AMP,
      TUMBLE_K[1] * rnd[1] * gain * aT +
        Math.sin(t * WOBBLE_FREQ + WOBBLE_SEEDS[1]) * WOBBLE_AMP,
      TUMBLE_K[2] * rnd[2] * gain * aT +
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
      // ROUND 8-H (CHECK): the REST gap comes off the build, not off the
      // config — the explode offset is `centr·gap` and the authored partition's
      // centroids are ~1.9× longer than the procedural fallback's, so the two
      // paths need different rest values to occupy the same band (derivation on
      // FRACTURE_REST_GAP_AUTHORED). Surge/re-cohere multipliers are unchanged.
      gapRef.current =
        build.restGap *
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

    // --- Round 8-E §B4.2 — THE VALUE WORLD, both halves from ONE value. ----
    // `fogDrive` is the single coupling scalar (doc §B3's ⚠: the old
    // body/surround match was a coincidence of two independent constants, and
    // the moment a fog exists that coincidence breaks unless the same number
    // sets both). It rides `reveal` so the lit volume and the raised body
    // arrive and leave together with the band.
    // The gate is STRUCTURAL, not documentary: `fogDrive` is derived from the
    // fog quad's own liveness, so there is no ordering, chunk-failure or
    // commit-timing path that can raise the body without its surround (a
    // ×8 backdrop with nothing behind it is the round's failure mode read
    // backwards — a glowing block on the page). Cull, unmount, mode swap and
    // reveal all already move both through `reveal`.
    const fogM = fogRef.current;
    const fogLive = fog !== null && fogM !== null;
    const fogDrive = fogLive ? reveal * feelC.fogEnergy : 0;
    // Half 2 (LOAD-BEARING): the crystal composites at alpha 0.94 and its
    // body comes from the procedural backdrop(), so the quad behind it
    // reaches only 6 % of the body — without this the stone stays invisible
    // against the new fog. 1 = today's look, ramping to feelC.backdropGain.
    u.uBackdropGain.value = 1 + (feelC.backdropGain - 1) * fogDrive;
    // Half 1: the fog quad itself. Anisotropic (the band is far wider than
    // the stone) and ASYMMETRIC — the inward x radius is the crystal's own
    // distance to the band centre-line, so the falloff hits exactly 0 there
    // at every viewport width (the a11y gate; the copy does cross that line at
    // 1280, and the measured worst case is 5.8:1 — see FOG_CLEAR for the
    // per-width derivation and the 9.6× alpha headroom). The quad's coords are
    // [-1,1]², so the mesh scale IS the world radius; dividing by `s` keeps
    // the fog's world size invariant under the group's uniform scale
    // (including the §B-f velocity compression — the fog must not breathe
    // with scroll speed, it is the world, not the object).
    if (fog && fogM) {
      const sSafe = Math.max(s, 1e-4);
      // CRYSTAL_POS x is positive for both modes (the stone sits right of
      // centre, clearing the left type column); Math.abs keeps the clearance
      // honest if that ever flips.
      // ⚠ THE A11Y GATE IS ENFORCED HERE, not just documented on FOG_CLEAR.
      // `fogClear` is a live console knob and >1 walks the inward zero LEFT of
      // the centre-line at |pos.x|·(clear−1)·w per unit; once the inward
      // radius overtakes the outward one the `Math.max(…, 1)` below pins the
      // shape to SYMMETRIC. Clamping to [0,1] makes the worst reachable state
      // the one the FOG_CLEAR derivation actually covers.
      // ROUND 10-A — FOG_RADIUS_OUT fell 0.30 → 0.203 with the stone, so those
      // crossover points moved and one of them is now BELOW 1:
      //   broken   rxOut/rxIn = 0.203/0.17 = 1.194 (was 1.765) — asymmetric at
      //            clear = 1, inward zero exactly ON the centre-line, unchanged
      //            worst-case alpha 0.017 (5.8:1) under the 1280 copy edge;
      //   healthy  0.203/0.22 = 0.923 (was 1.364) — ALREADY pinned symmetric at
      //            clear = 1, and that is now the SAFE state, not the dangerous
      //            one: the quad's inward bound lands 0.017·w RIGHT of the
      //            centre-line, so alpha under the 1280 copy edge is 0.0011,
      //            below the shader's 0.002 Discard. Geometric clearance.
      // Consequence for QA: on `healthy`, fogClear is inert at ≥0.923 and only
      // tightens below it. Full per-width derivation on FOG_CLEAR.
      const clear = Math.min(Math.max(feelC.fogClear, 0), 1);
      const rxIn = Math.abs(pos[0]) * clear * rect.w * k;
      const rxOut = feelC.fogRadiusOut * rect.w * k;
      const ry = feelC.fogRadiusY * rect.h * k;
      fogM.scale.set(rxOut / sSafe, ry / sSafe, 1);
      const fu = fog.uniforms;
      fu.uFogAsym.value = rxIn > 1e-4 ? Math.max(rxOut / rxIn, 1) : 1;
      fu.uFogGain.value = feelC.fogGain;
      fu.uFogOpacity.value = feelC.fogOpacity * fogDrive;
      fu.uFogFalloff.value = feelC.fogFalloff;
    }

    // --- Round 7-2b §B-a — the mark transmission RT (healthy full only;
    // markRigRef is null otherwise). Driven from THIS existing useFrame —
    // no new loops (PointerFlowmap idiom); the cull early-return above
    // already gates it to "band inside the cull window". With the default
    // MARK_SPIN 0 this is a one-time render, then a no-op every frame.
    //
    // ROUND 9-C: the mesh quaternion is handed over for the documented
    // MARK_TUMBLE path only — the rig ignores it while the flag is false (the
    // shipped default), so this stays render-once. Variant A's mark is
    // screen-upright by design; the tumble reaches 90° off the view axis inside
    // a normal scroll pass, at which point no logo is readable. --------------
    const rig = markRigRef.current;
    if (rig) rig.render(gl, t, mesh.quaternion);

    // --- Round 7-2b §B-c — advance the plexus (healthy full only). The
    // tumble quaternion just written above is applied to the point positions
    // CPU-side (the igloo group-rotation copy); the |a| gate makes the net
    // tween itself out between sections. ----------------------------------
    if (plexus) {
      plexus.uniforms.uPlexusAlpha.value = reveal;
      plexus.update(
        delta,
        t,
        Math.abs(a) < feelC.connectWindow,
        mesh.quaternion,
      );
    }

    // --- Callout re-anchoring: project 3 anchors → CSS vars ----------------
    // Pure math on the cached rect + the rotation just written; damped so
    // the labels never jitter; written only on >CALLOUT_WRITE_EPS% change.
    const el = anchorElRef.current;
    if (el) {
      // px-per-crystal-unit at the group's depth plane (== s / k — includes
      // the §B-f velocity compression so the projection twin stays exact).
      // ROUND 10-A: `feelC.scale`, the SAME value `s` was built from — never
      // the config constant, or a live size tweak would silently detach every
      // leader line from its anchor.
      // ⚠ CHECK-ROUND — the SECOND of the two band-keyed lines (see `s` above).
      // It must switch to `ih` in the same commit as `s` does, or the leader
      // lines detach. The round-10 callout fit (BROKEN_CALLOUT_SHARDS /
      // HEALTHY_CALLOUT_ANCHORS) is a px-vs-px fit against 47 px label offsets,
      // so it survives the section growth ONLY under the viewport re-base —
      // band-keyed, pxScale triples and the labels scatter.
      const pxScale = rect.h * feelC.scale * scaleMul;
      // ⚠ ROUND 11 STAGE 1.5 — THE CALLOUTS FOLLOW THE STONE LATERALLY, and
      // they do it through `cx` alone. `rectLeft` is the DOM anchor's left
      // edge and the anchor does NOT move (it carries no transform); `cx` is
      // the stone's true screen centre and now includes the traverse lateral.
      // So `ax` — which is `cx` re-based onto the anchor rect — already
      // carries the offset, from the SAME frame snapshot that placed the
      // stone, in the same frame. Do NOT add it a second time here, and do
      // NOT re-read it from the store: the projection twin's whole contract is
      // that it is a pure function of the values the render path just used.
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

      // --- Round 7-2b §B-d — gating windows: each callout is visible only
      // while `a` sits inside ITS window (staggered arrive/leave — the igloo
      // life-giver), damped asymmetrically (λ 8 in ≈ 0.4 s, λ 16 out ≈
      // 0.2 s) and written as --callout-N-vis (globals.css → opacity;
      // fallback 1 keeps SSR / fallback tiers always-visible). A rising
      // edge re-fires the LabelScrambler decode on the span (bubbling
      // CustomEvent — the scrambler's document listener; edge-only, the
      // sanctioned rare allocation). --------------------------------------
      for (let i = 0; i < CLUSTER_COUNT; i++) {
        const w = feelC.visWindows[i] ?? feelC.visWindows[0];
        const target = a > w[0] && a < w[1] ? 1 : 0;
        if (
          target === 1 &&
          visTargets.current[i] === 0 &&
          calloutInit.current
        ) {
          const span = el.querySelector<HTMLElement>(
            `span[style*="--callout-${i}-"]`,
          );
          span?.dispatchEvent(
            new CustomEvent("sersan:scramble", { bubbles: true }),
          );
        }
        visTargets.current[i] = target;
        const prevVis = visVals.current[i];
        visVals.current[i] = calloutInit.current
          ? THREE.MathUtils.damp(
              prevVis,
              target,
              target > prevVis
                ? CALLOUT_VIS_IN_LAMBDA
                : CALLOUT_VIS_OUT_LAMBDA,
              delta,
            )
          : target;
        if (
          Math.abs(visVals.current[i] - visWritten.current[i]) >
          CALLOUT_VIS_EPS
        ) {
          visWritten.current[i] = visVals.current[i];
          el.style.setProperty(
            `--callout-${i}-vis`,
            visVals.current[i].toFixed(3),
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
      /**
       * ROUND 11 STAGE 1.5 QA — GATE 5. The stone's lateral, recomputed from
       * the published frame by the SAME closed form the frame path uses, plus
       * the net island that shares this anchor. `deltaPx` is the gate and it is
       * 0 by construction: one frozen `scrollY`, one rect, one expression.
       */
      get traverse() {
        const frame = traverseRef.current;
        const g = groupRef.current;
        if (!frame || !rect) return { bound: false };
        const ihNow = size.height;
        const bcfg = traverseConfig.bands[anchorId as TraverseBandId];
        let origin = 0;
        if (bcfg && traverseConfig.islands.compensate) {
          const centreScroll = rect.docTop + rect.h / 2 - ihNow / 2;
          origin =
            bcfg.dir *
            traverseRate(bcfg) *
            Math.min(Math.max(centreScroll - frame.secTop, 0), frame.secH);
        }
        const stone = frame.active ? frame.xScenePx - origin : 0;
        const net = (
          window as unknown as Record<
            string,
            { traverse?: { lWorld?: number } } | undefined
          >
        )[`__sersanNeuralLattice_${anchorId}`]?.traverse;
        const kNow = WORLD_VIEW_HEIGHT / ihNow;
        const netPx =
          net && typeof net.lWorld === "number" ? net.lWorld / kNow : null;
        return {
          bound: true,
          active: frame.active,
          scrollY: frame.scrollY,
          xScenePx: Math.round(frame.xScenePx * 100) / 100,
          originPx: Math.round(origin * 100) / 100,
          stoneLateralPx: Math.round(stone * 100) / 100,
          netLateralPx: netPx === null ? null : Math.round(netPx * 100) / 100,
          deltaPx:
            netPx === null ? null : Math.round((stone - netPx) * 1000) / 1000,
          tolerancePx: 1,
          visible: !!g && g.visible,
        };
      },
      /** Round 8-H — true once the authored slab GLB is the mesh in use;
       * false means the procedural round-7 fallback is on screen (asset
       * failure), which is worth knowing before judging the stone. */
      get authored() {
        return authoredRef.current;
      },
      /** Triangle count of whatever geometry actually built. */
      get tris() {
        const p = build?.geometry?.attributes?.position;
        return p ? p.count / 3 : null;
      },
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
      /** Round 7-2b — mark-RT state + the QA perf counter (lastMs = CPU
       * encode time of the last RT render; spin.value is the live yaw knob,
       * 0 = igloo-rigid render-once). Null on broken / lite / WebGL2. */
      get markRt() {
        const r = markRigRef.current;
        return r
          ? {
              ready: r.ready,
              renders: r.renders,
              lastMs: r.lastMs,
              spin: r.spin,
            }
          : null;
      },
      /** Round 7-2b — plexus state (healthy full only). */
      get plexusInfo() {
        return plexus
          ? {
              connections: plexus.activeConnections,
              alpha: plexus.uniforms.uPlexusAlpha.value,
            }
          : null;
      },
      /** Round 7-2b — live FEEL knobs (mutate from the console): deadzone,
       * velNorm, velScaleK, connectWindow, visWindows[[min,max]×3].
       * Round 8-E adds the value world: fogEnergy (THE coupling knob — 0
       * restores the pre-round-8 render), backdropGain, fogGain, fogOpacity,
       * fogFalloff, fogClear (⚠ a11y gate — clamped to [0,1] in the driver),
       * fogRadiusOut, fogRadiusY.
       * Round 10-A adds `scale` — the stone's uniform size (CRYSTAL_SCALE
       * 0.115 = 38.2 % of band height). ⚠ It does NOT drag the fog radii with
       * it (they are their own knobs, deliberately ratio-fitted to 0.115 —
       * scale them by the same factor if you move it) and it does NOT move the
       * baked ripple/sparkle frequencies. */
      feel: feel.current,
      /** Round 8-E — the fog quad's live uniforms + its resolved geometry
       * (world radii in crystal-group units; asym = outward ÷ inward x
       * radius, the a11y clearance ratio). Null until the lazy build lands. */
      get fogInfo() {
        const fm = fogRef.current;
        return fog
          ? {
              gain: fog.uniforms.uFogGain.value,
              opacity: fog.uniforms.uFogOpacity.value,
              asym: fog.uniforms.uFogAsym.value,
              falloff: fog.uniforms.uFogFalloff.value,
              scale: fm ? [fm.scale.x, fm.scale.y] : null,
            }
          : null;
      },
      /** Round 7-2b — damped callout visibilities (0..1 per index). */
      get calloutVis() {
        return visVals.current.slice();
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
          // round-7-2b anatomy pass (crystalBuild header):
          rippleAmp: u.uRippleAmp.value, // dead node on lite
          warmGain: u.uWarmGain.value, // dead node on lite
          emberGain: u.uEmberGain.value, // dead node on healthy / lite
          markGain: u.uMarkGain.value, // dead node unless mark branch built
          // ROUND 9-C — the origin-registered perspective map's three knobs
          // (crystalConfig MARK_THICKNESS / MARK_WORLD_HALF / MARK_FLIP_Y); all
          // dead nodes unless the mark branch is built. `markScale` is GONE —
          // the crystal-local ortho map it scaled IS the defect 9-C removed.
          //   markThick — THE swim knob, 0.15 (reads like a decal) … 0.9
          //     (today's old effective, strokes break between patches). It
          //     moves the REFRACTIVE DISPLACEMENT only: Δuv = markThick·sin δ /
          //     (2·markHalf); the mark's placement is the projective identity
          //     and does not depend on it.
          //   markHalf  — size, LOWER = BIGGER (0.7 … 1.6). 1.15 puts the mark
          //     at 60 % of the slab's height, inside the silhouette.
          //   markFlipY — **−1**, derived from the three source, not guessed
          //     (config MARK_FLIP_Y: three's RT-texture uv convention is
          //     y-DOWN on both backends). +1 renders the logo upside-down.
          markThick: u.uMarkThick.value,
          markHalf: u.uMarkHalf.value,
          markFlipY: u.uMarkFlipY.value,
          // round-8-E value world (crystalBuild header §1–§4):
          backdropGain: u.uBackdropGain.value, // coupled to feel.fogEnergy
          ambGain: u.uAmbGain.value,
          ceil: u.uCeil.value, // 1.0 = the igloo-faithful no-bloom variant
          rimEdgeStart: u.uRimEdgeStart.value,
          rimEdge: u.uRimEdge.value, // 0 = no crystal bloom at all
        };
      },
    };
  }

  if (!build) return null;

  return (
    <group ref={groupRef} renderOrder={-3} visible={false}>
      {/* Round 8-E §B4.2 part 1 — THE FOG VOLUME. renderOrder −4: painted
          BEFORE the crystal, so the stone composites OVER the lit volume
          (an additive layer on TOP would wash the body and destroy the
          "darker than its surround" read the whole round exists to build).
          depthWrite:false so it never punches the depth-tested SignatureLine;
          culled with the group; swept by the W4 cut like any other GL pixel.
          Its radial falloff reaches exactly 0 inside its own quad — the round
          7-3 §A.6 hygiene rule: no rectangles, no visible edges, nothing that
          could resurrect the "vecchi blocchi pagina". */}
      {fog && (
        <mesh
          ref={fogRef}
          geometry={fog.geometry}
          material={fog.material}
          renderOrder={-4}
          frustumCulled={false}
        />
      )}
      {/* renderOrder −3: painted before the constellation layers (−2/−1) —
          the additive net reads as current flowing in FRONT of the crystal. */}
      <mesh
        ref={meshRef}
        geometry={build.geometry}
        material={build.material}
        renderOrder={-3}
        frustumCulled={false}
      />
      {/* Round 7-2b §B-c — the plexus net (healthy + full tier only; null
          otherwise). Two position-only LineSegments at renderOrder −2
          (between crystal −3 and the constellation), positions rewritten
          CPU-side in the useFrame above. Mounted in the CAMERA-LOCKED group
          (not the tumbling mesh): the tumble is applied to the point
          positions CPU-side so the marker crosses stay screen-facing. */}
      {plexus && (
        <>
          <primitive object={plexus.lines} />
          <primitive object={plexus.cross} />
        </>
      )}
    </group>
  );
}
