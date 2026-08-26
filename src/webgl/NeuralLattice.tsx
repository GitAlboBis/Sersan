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
 * ROUND 9-B (2026-08-24) — THE NET SITS UNDER THE COPY. Owner: "la rete
 * neurale ora sta sopra le scritte, deve stare sotto, le scritte non si
 * leggono." The look fix is entirely in neuralFieldCompute (a 2D mask on both
 * layers' output alpha); THIS FILE contributes the one thing a shader cannot
 * know — WHERE the copy column is. The rect effect now also measures the real
 * `[data-row-body]` boxes of the owning section and stores their right bound in
 * the band's LOCAL x (`rect.copyEdge`); a small effect publishes it, plus
 * COPY_EDGE_PAD, into the lane uniforms on every measure. No per-frame work is
 * added there, no store read, no state machine change — and because the write
 * is on measure rather than in useFrame, the dev handle's lane stays tunable
 * from the console between layout changes (round 11 moves it into the frame
 * path for a TRAVERSED band only).
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
 * ROUND 11 (2026-08-24) — THE DIAGONAL TRAVERSE, Stage 1. Four things, and
 * every one of them is INERT on a band no `traverseStore` entry owns (i.e. on
 * `#production`, and on `#problem` under reduced motion / fallback tier), so
 * the un-traversed island is byte-for-byte what shipped:
 *   1. THE RIG. The group graph gains two levels — `groupRef` (position +
 *      quaternion, scale 1) → `rigRef` (the lateral translate, in WORLD units)
 *      → `scaleRef` (the anisotropic (w·k, h·k, z) scale, MOVED off groupRef)
 *      → `innerRef` (the existing orbit/parallax). The rig must sit OUTSIDE
 *      the anisotropic scale or its magnitude would be sheared by the viewport
 *      aspect. SignatureLine remains the only camera writer and changes by
 *      ZERO lines — every island here is exactly invariant under a camera
 *      write, which is why the traverse has to be a local rig at all.
 *   2. THE FROZEN CLOCK. `vpTop` reads the traverse snapshot's `scrollY`, not
 *      `window.scrollY`, so the net's vertical and the copy's lateral can
 *      never come from two different reads of the same clock.
 *   3. THE MASK LANE. `uCopyEdge` became `uCopyLaneC` + `uCopyLaneW`: a swept
 *      half-plane goes degenerate, so the gate is a two-sided lane that tracks
 *      the copy's applied `x`, driven from the same window in the same frame.
 *   4. The LATERAL cull, the viewport-relative `zWorld`, and the act DPR cap.
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
import { useTraverseStore, type TraverseFrame } from "./store/traverseStore";
import {
  traverseConfig,
  setTraverseConfig,
  bandLateralPx,
  bandFieldLen,
  bandFieldSlope,
  bandRegisterPx,
  onTraverseConfigChange,
  type TraverseBandId,
} from "./neural/traverseConfig";
import {
  CLUSTER_COUNT,
  FLOW_SPEED,
  SPARK_COUNT,
  NEURAL_PARTICLE_COUNT,
  NEURAL_PARTICLE_COUNT_COMPACT,
  NEURAL_DEPTH_SCALE_FACTOR,
  NEURAL_DEPTH_VIEWPORT_SPAN,
  COPY_RAMP_SOFT,
  PLEXUS_RX,
  PLEXUS_RY,
  PLEXUS_RZ,
  FIELD_EXIT_VH,
  RIBBON_PARTICLE_SCALE_MAX,
  CONDUIT_FILL_RIBBON,
  RIBBON_RY,
  getPlexus,
  ribbonPlexusParams,
  COPY_MASK_FLOOR,
  COPY_MASK_FLOOR_LINE,
  COPY_MASK_FLOOR_STREAM,
  DUST_SIZE_RIBBON,
  CORE_SIZE_BOOST_RIBBON,
  FRINGE_SIZE_DROP_RIBBON,
  REST_OVERLAP,
  SIZE_NORM_MAX,
  RIVER_SIZE,
  FRONT_LEAD,
  FRONT_SPAN,
  RIVER_RATE,
  COPY_ROW_PAD,
  COPY_ROW_SOFT,
  COPY_ROW_SCREEN_C,
  COPY_Y_IN,
  COPY_Y_OUT,
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
  copyEdgeFallback,
  COPY_EDGE_PAD,
  type LatticeMode,
} from "./neural/neuralLatticeConfig";
import type { NeuralFieldBuild } from "./neural/neuralFieldCompute";

/**
 * ROUND 12 · D — CENTRE THE κ-WINDOW ON THE FRAME.
 *
 * `key` is the build's ASCENDING κ table (nodes or edges, sorted in
 * `buildPlexus`); `ph` is the frame centre's phase in the same nodeT units.
 * Binary search for the centre entry, then clamp a FIXED-WIDTH window around
 * it — fixed width is the whole point: it is what makes each element's
 * residue class, and therefore its particle population and its comb spacing,
 * a build-time constant rather than something that re-strides as the reader
 * scrolls.
 *
 * ~10 iterations, zero allocation, no `getBoundingClientRect`; safe to call
 * twice a frame from `useFrame`.
 */
function windowFirst(
  key: Float32Array | null,
  ph: number,
  win: number,
): number {
  if (!key || key.length === 0) return 0;
  let lo = 0;
  let hi = key.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (key[mid] < ph) lo = mid + 1;
    else hi = mid;
  }
  const first = lo - (win >> 1);
  return Math.max(0, Math.min(key.length - win, first));
}

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
  /**
   * ROUND 9-B — the copy column's RIGHT bound in the band's LOCAL x (fractions
   * of rect.w, 0 = the band centre-line). Measured off the real
   * `[data-row-body]` boxes of the owning section — the ledger body copy that
   * has to stay readable — so the mask boundary tracks the actual
   * `container-px` gutter, the `max-w-[34em]` measure and the `clamp()` font
   * size at every viewport instead of a guessed fraction. Falls back to
   * `copyEdgeFallback(bandWidth)` — the same geometry derived from the viewport
   * — when no body box is measurable, NOT to a constant: below 1280 the copy
   * grows rightward (+0.098 at 1024, +0.418 at 390) and a desktop-sized
   * constant would leave the net at full strength over a phone's copy.
   */
  copyEdge: number;
}

/**
 * ONE island of a band.
 *
 * `anchorId` is the DOM box it is camera-locked to and the dev-handle key.
 * `bandId` is the TRAVERSE band whose frozen frame it reads; they are the same
 * for every shipped anchor. There is exactly one scroll snapshot per act.
 *
 * ⚠ ROUND 12 · STAGE 1 — THE LADDER'S FOUR PROPS ARE GONE. `plexusSeed`,
 * `plexusWell`, `primary` and `strictCull` existed only to make four EXTRA
 * islands differ from the shipped one, and the owner rejected the stack of
 * bands they built (D14–D24). With one band per anchor there is no
 * cross-island singleton to own (`primary`), no neighbour to overlap
 * (`strictCull` — see the visibility note below, this is a real behaviour
 * change), and no second constellation to decorrelate (`plexusSeed` /
 * `plexusWell`). The DELETED prop that did not delete its idea is the lateral
 * re-centring: it is now `bandLateralPx()`, unconditional, shared with the
 * stone. See `traverseConfig.ts`.
 */
function NeuralLatticeIsland({
  mode,
  anchorId,
  bandId,
}: {
  mode: LatticeMode;
  anchorId: string;
  /** Traverse band to read (defaults to `anchorId` for the shipped pair). */
  bandId?: string;
}) {
  const band = bandId ?? anchorId;
  const { size, camera, gl } = useThree();
  const measureVersion = useSectionStore((s) => s.measureVersion);
  const broken = mode === "broken";

  /**
   * ROUND 12 · STAGE 2 — the live-config revision this island last BUILT at.
   * Bumped by `setTraverseConfig`, which is how the owner's density A/B and
   * the `ribbon: false` rollback take effect without a reload. It is a build
   * dependency and nothing else: no per-frame visual reads it, so the R3F
   * island commit-wedge rule is intact (refs + `getState()` in `useFrame`).
   */
  const [cfgRev, setCfgRev] = useState(0);
  /**
   * ROUND 12 · STAGE 2 FIX — THE LEVER HAS TO WORK IN BOTH DIRECTIONS, AND
   * THE RECORDED DEFECT IS THAT IT DID NOT.
   *
   * `rollbackToStage1()` took; the matching `set({ problem: { ribbon: true }})`
   * left `field.ribbon === false`, i.e. a rollback lever that is one-way and
   * therefore useless for the A/B it exists to serve.
   *
   * The asymmetry is structural, not random. `ribbon: false` needs NO rebuild
   * to be VISIBLE — every ribbon consumer in the frame path is gated on
   * `bcfg.ribbon && build.field.ribbon`, so clearing the config flag alone
   * makes the island fall back to the shipped band on the very next frame,
   * with or without a commit. `ribbon: true` needs an actual rebuild, because
   * the node table, the link table and the baked per-particle roles are all
   * GENERATOR arguments. And the rebuild was reached through
   * `setCfgRev` → render → effect → `await import()` → `setBuild`, i.e.
   * through TWO React commits inside the Canvas island — the exact dependency
   * the island's own commit-wedge rule says never to take.
   *
   * So the signal now goes STRAIGHT to an imperative rebuild held in a ref.
   * One commit (`setBuild`, unavoidable — the meshes are JSX), no render pass
   * in between, no second effect, and no dynamic import on the re-entry: the
   * module is already resolved and cached in `modRef`. `cfgRev` survives ONLY
   * as the mount-time dependency it always was.
   */
  const rebuildRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    // TWO SIGNALS, ONE PATH. `onTraverseConfigChange` is the owner's live A/B
    // and the rollback; `sersan:remeasure` is the traverse ARMING, and it
    // matters for the same reason the RM path does — see the build gate.
    // Falling back to the counter is what keeps the FIRST arm working, before
    // any build exists to be rebuilt.
    const bump = () => {
      if (rebuildRef.current) rebuildRef.current();
      else setCfgRev((n) => n + 1);
    };
    const off = onTraverseConfigChange(bump);
    window.addEventListener("sersan:remeasure", bump);
    return () => {
      off();
      window.removeEventListener("sersan:remeasure", bump);
    };
  }, []);

  // --- Lazy field build (three/webgpu chunk loads ONLY here) ----------------
  const [build, setBuild] = useState<NeuralFieldBuild | null>(null);
  const backendIsWebGPURef = useRef(false);
  /** The count the CURRENT build was allocated with (dev debug handle only). */
  const countRef = useRef(NEURAL_PARTICLE_COUNT);

  /** ROUND 12 · STAGE 2 FIX — the resolved chunk, cached across rebuilds so
   * the owner's A/B is SYNCHRONOUS (no second dynamic import, no await, no
   * extra commit) once the island has booted once. */
  const modsRef = useRef<
    | [
        typeof import("three/webgpu"),
        typeof import("three/tsl"),
        typeof import("./neural/neuralFieldCompute"),
      ]
    | null
  >(null);

  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let built: NeuralFieldBuild | null = null;

    const make = (
      webgpu: typeof import("three/webgpu"),
      tslNs: typeof import("three/tsl"),
      mod: typeof import("./neural/neuralFieldCompute"),
    ) => {
      const bk = (gl as unknown as { backend?: { isWebGLBackend?: boolean } })
        .backend;
      const backendIsWebGPU =
        !!bk &&
        bk.isWebGLBackend !== true &&
        typeof (gl as unknown as { compute?: unknown }).compute === "function";
      backendIsWebGPURef.current = backendIsWebGPU;

      // Phone budget: `getState()`, never a subscription (island commit wedge).
      const lite = useTierStore.getState().tier === "lite";
      let count = lite
        ? NEURAL_PARTICLE_COUNT_COMPACT
        : NEURAL_PARTICLE_COUNT;

      // ── ROUND 12 · STAGE 2 — DOES THIS ISLAND CARRY THE RIBBON? ─────────
      // Read from `traverseConfig`, not from a prop, because the stone and
      // the lateral re-centring read the SAME field and a flag three
      // consumers could disagree about is the class of bug the frozen frame
      // exists to prevent. `getState()`-style: read once, at build time.
      const bcfg = traverseConfig.bands[band as TraverseBandId];
      // ⚠ THE BUILD IS GATED ON THE TRAVERSE BEING ARMED, NOT ON THE CONFIG.
      // Under `prefers-reduced-motion` the hook never runs, `data-traverse` is
      // never written and no band is registered — so `tv` is null in the frame
      // path forever. A ribbon built there would have no rig, no shear and no
      // registration: 7278 px of field crammed into a 1920 px band. Reading
      // the STORE rather than the config is the only signal that answers "will
      // this island actually be driven?", and it is the same `getState()` read
      // the frame path uses (never a subscription).
      //
      // The arm normally lands well before this: the DOM section's effects run
      // while `three/webgpu` is still loading. If it does not, `sersan:remeasure`
      // bumps `cfgRev` on arm and this effect re-runs — one dispose, one build.
      const armed = !!useTraverseStore.getState().bands[band];
      const ribbonParams =
        armed && bcfg && bcfg.ribbon
          ? ribbonPlexusParams(
              lite ? "lite" : "full",
              bcfg.ribbonDensity,
            )
          : undefined;

      if (ribbonParams) {
        // ⚠ THE PARTICLE COUNT HAS TO RIDE THE NODE COUNT, and it is not a
        // look preference. `seedBuffers` splits a FIXED count across the
        // delivered nodes and links — 40.19 sprites per star and 21.27 per
        // link at the shipped 9000/103/227. Leave `count` alone under a
        // 389-node field and every star core is TWO sprites: the filled
        // star-glow the owner approved becomes a pair of dots, and the
        // "same density" A/B stops measuring density at all.
        //
        // The brake is `RIBBON_PARTICLE_SCALE_MAX` (4.0 desktop / 3.0 phone).
        // Measured: onFrame/full asks ×3.78 and is granted in full (the
        // allocation is EXACT); the phone asks ×12.68 and is capped at ×3, so
        // its per-star allocation falls to 0.24×. THAT NUMBER IS STAGE 3's,
        // not this stage's — it is exactly the GPU-capture question PART 6
        // says nothing in source can answer.
        const ref = getPlexus(mode, lite ? "lite" : "full");
        const rib = getPlexus(
          mode,
          lite ? "lite" : "full",
          undefined,
          true,
          ribbonParams,
        );
        const want = rib.nodes.length / Math.max(ref.nodes.length, 1);
        // ROUND 13 — ×CONDUIT_FILL_RIBBON: the links are volumetric conduits
        // now and need more grain than a 1-D strand; the star budget is
        // per-node (STAR_PER_NODE_RIBBON), so the whole lift lands on the
        // links. Still braked by RIBBON_PARTICLE_SCALE_MAX (36k / 9.6k).
        const k = Math.min(
          want * CONDUIT_FILL_RIBBON,
          RIBBON_PARTICLE_SCALE_MAX[lite ? "lite" : "full"],
        );
        count = Math.round(count * k);
      }
      countRef.current = count;

      built = mod.createNeuralFieldBuild({
        THREE,
        webgpu: webgpu as never,
        tsl: tslNs as never,
        gl: gl as never,
        backendIsWebGPU,
        count,
        mode,
        plexusParams: ribbonParams,
      });
      // ⚠ ROUND 12 · D — the RIBBON runs a faster ambient drift
      // (`FLOW_SPEED_RIBBON` 0.25 vs 0.075: 8.4 → 28 px/s) and the build
      // already seeded `uFlowSpeed` with the right one of the two. Writing
      // the module constant unconditionally here would have quietly undone
      // that on every build.
      if (!built.field.ribbon) built.uniforms.uFlowSpeed.value = FLOW_SPEED;
      // ⚠ NOT `FRACTURE_T`. On the ribbon `nodeT ≡ u`, so the fracture is
      // "wherever the stone is" — inverted out of the DELIVERED cloud by the
      // build (see `field.fractureT`). On the ellipsoid arm it is 0.62, the
      // shipped constant, to the bit.
      built.uniforms.uFracture.value = built.field.fractureT;
      setBuild(built);
    };

    const loaded = modsRef.current
      ? Promise.resolve(modsRef.current)
      : Promise.all([
          import("three/webgpu"),
          import("three/tsl"),
          import("./neural/neuralFieldCompute"),
        ]).then((m) => {
          modsRef.current = m;
          return m;
        });

    void loaded.then((m) => {
      if (cancelled) return;
      make(m[0], m[1], m[2]);
    });

    // THE IMPERATIVE RE-ENTRY — the owner's A/B and the rollback, in ONE
    // commit and with no render pass in between. Dispose-then-make in the
    // same tick: React batches the two `setBuild` calls, so the meshes swap
    // exactly once and the disposed objects are never mounted for a frame.
    rebuildRef.current = () => {
      const m = modsRef.current;
      if (cancelled || !m) return;
      built?.dispose();
      built = null;
      setBuild(null);
      make(m[0], m[1], m[2]);
    };

    return () => {
      cancelled = true;
      rebuildRef.current = null;
      built?.dispose();
      setBuild(null);
    };
    // ⚠ `cfgRev` IS A BUILD DEPENDENCY, NOT A UNIFORM. The ribbon arm and its
    // density are GENERATOR arguments — the node table, the link table and the
    // baked per-particle roles all change — so the D23 A/B is a dispose + a
    // rebuild, and so is the `ribbon: false` rollback. `onTraverseConfigChange`
    // only ever fires from `setTraverseConfig`, i.e. from the dev handle, so
    // this costs one Set entry and zero frames in production.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, gl, band, cfgRev]);

  // --- Section rect: measured on measureVersion bumps -----------------------
  const [rect, setRect] = useState<SectionRect | null>(null);
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-lattice-anchor="${anchorId}"]`,
      );
      // A missing or zero-sized anchor means no rect, no frame work. `< 2`
      // rather than `=== 0` so a sub-pixel box can never half-arm the island.
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) {
        setRect(null);
        return;
      }
      const cxBase = r.left + r.width / 2;
      // ROUND 9-B: the copy column, measured rather than assumed. The band is
      // FULL-BLEED (rect.w = 100vw, so local x = 0 IS the viewport centre-line)
      // while the ledger body copy is `max-w-[34em]` inside `container-px` — the
      // two only line up at one width, and at 1280 the copy actually crosses the
      // centre-line. Reading the real boxes makes the mask boundary correct at
      // every viewport, font size and gutter without a per-width table in the
      // shader. Runs in the SAME effect as the rect measure (measureVersion /
      // resize), never per frame.
      // ⚠ ROUND 11 — SUBTRACT THE APPLIED LATERAL BEFORE CACHING. The traverse
      // writes an `x` on each `[data-drift]` wrapper, and `getBoundingClientRect`
      // returns the TRANSFORMED box, so a measure that lands anywhere but the
      // block's reading plateau reads a polluted right bound. It is not a small
      // pollution: a block whose window is closed rides α_edge, so a measure at
      // scrollY 0 read `copyEdge = 7.87` band widths (≈ 10 070 px) instead of
      // 0.03, which drives the half-plane so far off-band that the gate is
      // FULLY OPEN — round 9-B's "la rete sta sopra le scritte", back, on every
      // path that falls back to the measured edge. This is the mechanism's §3.4
      // trap and the fix is its own quoted idiom (`lusion-type.ts`
      // `measureDriftEntry`): subtract the offset that is currently applied.
      // `m41` of a `none` transform is 0, so an un-traversed band (`#production`,
      // and `#problem` under RM / fallback tier) measures exactly what it always
      // did — the `[data-drift]` wrappers only ever carry a `y` there.
      let copyRight = Number.NEGATIVE_INFINITY;
      const owner = el.closest("section");
      if (owner) {
        const bodies = owner.querySelectorAll<HTMLElement>("[data-row-body]");
        bodies.forEach((b) => {
          const br = b.getBoundingClientRect();
          if (br.width <= 0) return;
          let dx = 0;
          const wrap = b.closest<HTMLElement>("[data-drift]");
          if (wrap) {
            const t = getComputedStyle(wrap).transform;
            if (t && t !== "none") {
              try {
                dx = new DOMMatrixReadOnly(t).m41;
              } catch {
                dx = 0;
              }
            }
          }
          copyRight = Math.max(copyRight, br.right - dx);
        });
      }
      setRect({
        cxBase,
        w: r.width,
        h: r.height,
        docTop: r.top + window.scrollY,
        copyEdge:
          copyRight > Number.NEGATIVE_INFINITY
            ? (copyRight - cxBase) / Math.max(r.width, 1)
            : copyEdgeFallback(r.width),
      });
    };
    measure();
    // ⚠ THE BAND PIN IS A CSS CUSTOM PROPERTY, AND `measureVersion` CANNOT SEE
    // IT. `armCss()` writes `--tv-band-h` / `--tv-band-bottom`, which changes
    // THIS ANCHOR'S OWN HEIGHT without changing any `[data-line-anchor]` span,
    // so `sectionStore.setMeasured` can short-circuit and leave us camera-
    // locked to the pre-pin box. Listen to the remeasure event directly: it is
    // the signal the traverse hook already dispatches on arm, on teardown and
    // on every live config write, and it is event-driven (never per frame).
    // (It also predates ROUND 12 · STAGE 1's deletion of the island ladder,
    // which is NOT why it is here — the band pin is.)
    window.addEventListener("sersan:remeasure", measure);
    return () => window.removeEventListener("sersan:remeasure", measure);
    // size.* is included DELIBERATELY: everything stored above is a PIXEL
    // quantity, but sectionStore.setMeasured skips the measureVersion bump
    // when the NORMALIZED spans are unchanged — exactly what a width-only
    // resize produces. Cheap to re-run: this effect only setRect()s; the
    // net re-anchors through the group transform alone (no rebuild).
  }, [measureVersion, anchorId, size.width, size.height]);

  // --- ROUND 9-B: publish the measured copy-column boundary -----------------
  // Written HERE (on measure) rather than in useFrame on purpose: it only
  // changes when the layout does, it costs nothing per frame, and it leaves the
  // uniform writable from the dev handle between measures (a per-frame write
  // would stomp every console tune of `uCopyEdge`). COPY_EDGE_PAD is the margin
  // for the inner group's ±0.018 rotation drift plus scrollbar/measure slack —
  // see the constant.
  // ROUND 11: the half-plane is expressed as a LANE (see COPY_LANE_OPEN_W).
  // `laneC = edge − W, laneW = W` is EXACTLY the shipped half-plane, so an
  // un-traversed band is byte-identical and keeps its measure-time write.
  useEffect(() => {
    if (!build || !rect) return;
    // ⚠ ROUND 12 · D — PER BUILD, not the module constant. See the note on
    // the off-band restore branch: at 2.0 the lane's unused LEFT wall lands
    // inside a ±1.895 ribbon and every node left of it reads UNMASKED. This
    // effect fires on every ribbon build, so the defect was live from the
    // first measure, not latent.
    const openW = build.field.laneOpenW;
    build.uniforms.uCopyLaneC.value = rect.copyEdge + COPY_EDGE_PAD - openW;
    build.uniforms.uCopyLaneW.value = openW;
  }, [build, rect]);

  // Release the act DPR cap if this island unmounts while it holds one — a
  // leaked ceiling would freeze the whole page's resolution.
  useEffect(
    () => () => {
      if (armedDprCap.current === null) return;
      const tier = useTierStore.getState();
      if (tier.dprCap === armedDprCap.current) tier.setDprCap(null);
      armedDprCap.current = null;
    },
    [],
  );

  // --- Per-frame driver ------------------------------------------------------
  const groupRef = useRef<THREE.Group>(null);
  /**
   * ROUND 11 — THE TRAVERSE RIG. It sits OUTSIDE the anisotropic scale and
   * expresses its translation in WORLD units (mechanism §5.3): under
   * `S = diag(wWorld, hWorld, zWorld)` a child translation renders as
   * `(t.x·wWorld, t.y·hWorld, t.z·zWorld)`, so a rig INSIDE the scale would
   * make any depth component of the run shear by the viewport aspect (1.78×
   * on desktop, 0.46× on a phone — a 3.85× swing) and any yaw a
   * rotation-then-stretch. Outside it, `L = X·k` is right at every viewport.
   *
   * `groupRef` therefore keeps position + quaternion and NOTHING else; the
   * scale moved down to `scaleRef`. `project()` still reads `groupRef`, which
   * is the anchor point — unaffected by the restructure.
   */
  const rigRef = useRef<THREE.Group>(null);
  const scaleRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  /** The traverse band this island reads, or null when nothing owns it. */
  const traverseRef = useRef<TraverseFrame | null>(null);
  /** R1 clock instrument: frames consumed while the DOM's clock advanced. */
  const glFrames = useRef(0);
  /**
   * R1 baselines. The gate is `|Δdom − Δgl| === 0` over a window, so the reset
   * has to zero BOTH counters *from one call* — and this island cannot zero the
   * DOM's, because `frame.tick` is re-written from `apply()`'s own monotone
   * counter on the very next frame. So the reset takes a BASELINE of each and
   * the getter reports the deltas; the pair is then comparable no matter where
   * in the act the reset happened.
   */
  const glBase = useRef(0);
  const domBase = useRef(0);
  const lastSeenScroll = useRef(Number.NaN);
  /** The DPR ceiling this island armed (so it only ever releases its own). */
  const armedDprCap = useRef<number | null>(null);
  /** True while the mask lane is being driven per frame by the traverse. */
  const laneDriven = useRef(false);
  /**
   * ROUND 12 · STAGE 2 QA — the last frame's ribbon state, for the dev handle.
   * Mutated in place, never allocated, and only WRITTEN under a
   * `NODE_ENV !== "production"` constant the bundler folds away.
   */
  const ribbonProbe = useRef({
    on: false,
    lateralPx: 0,
    yRegPx: 0,
    slope: 0,
    len: 1,
    fade: 1,
    p: 0,
  });
  /**
   * Last-written field mapping — the change guard for the three geometry
   * uniforms (see the write site). Mutated in place; never allocated.
   *
   * ⚠ ROUND 12 · STAGE 2 FIX — IT CARRIES THE BUILD IT WROTE TO, AND IT HAD
   * TO. A change guard keyed on VALUES alone is correct only while the thing
   * it is guarding survives; a rebuild hands the driver a NEW uniform bag at
   * the build defaults `(1, 0, 0)` while this ref still says it already wrote
   * `(3.7906, 0, −2.0535)`, so the write is skipped and the field renders at
   * `uFieldLen = 1` — one band-width of a 3.79-band-width ribbon, crammed
   * back into the frame — FOREVER.
   *
   * MEASURED, and it is exactly the recorded "the A/B did not take": after a
   * `ribbon: false` → `ribbon: true` round trip the field reported every
   * healthy number (`ribbon: true`, 389 nodes, `centreScreenY() = ih/2`) and
   * put **247 of 389 nodes on frame at p = 0.45 and 0 at p = 0.05/0.25/0.85**
   * — an unmapped field sliding past the frame. Every rebuild lever (the D23
   * density A/B, the rollback, the traverse arm) walked into it.
   */
  const fieldWritten = useRef<{
    build: NeuralFieldBuild | null;
    len: number;
    origin: number;
    slope: number;
  }>({ build: null, len: 1, origin: 0, slope: 0 });
  /** ROUND 12 · STAGE 2 QA — `mute()`'s ref. A REF, not state, so the A/B
   * cannot depend on a React commit landing inside the Canvas island. Read
   * once per frame at the top of the cull; never written outside the dev
   * handle, so production pays one `if` on a `false`. */
  const mutedRef = useRef(false);
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
  // ROUND 12 · D — the two clocks of the travelling signal. `front` is the
  // BIRTH front (a damped pure function of `p`); `riverClock` is the LIGHT's
  // own clock, which is what keeps the crests moving when the reader stops.
  const frontRef = useRef(0);
  const riverClock = useRef(0);
  // Round-4 §B.1 (healthy): per-ring membrane seal latch + integrated band
  // phase. §B.2 (broken): integrated nebula wisp drift.
  const membraneSealTarget = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  const membraneSeal = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  const membranePhase = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));
  const nebulaDrift = useRef(0);
  const surfaceKey = broken ? ("broken" as const) : ("healthy" as const);

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    const rig = rigRef.current;
    const scaleGroup = scaleRef.current;
    const inner = innerRef.current;
    if (!group || !rig || !scaleGroup || !inner || !rect || !build) return;
    const delta = Math.min(rawDelta, 1 / 30);

    const ih = size.height;
    const vw = size.width;
    const k = WORLD_VIEW_HEIGHT / ih;

    // --- ROUND 11: the traverse snapshot ------------------------------------
    // ⚠ ONE FROZEN `scrollY`, READ BY ALL. When a band owns this island the
    // VERTICAL comes from the same snapshot the DOM copy's LATERAL came from —
    // recomputing it from `window.scrollY` here would put the net's y and the
    // net's x on two different reads of the same clock, and under a windowed
    // copy rate that is the shear the whole design exists to avoid. Off-band
    // (or unarmed) it falls back to today's read, byte-for-byte.
    let tv = traverseRef.current;
    if (!tv) {
      tv = useTraverseStore.getState().bands[band] ?? null;
      traverseRef.current = tv;
    }
    const onBand = !!tv && tv.active;
    const scrollY = onBand ? tv!.scrollY : window.scrollY;
    // ── THIS BAND'S AUTHORED STRIP-X ───────────────────────────────
    // The scene lateral runs `R·secH` across the act — 2342 px at 1920×935. A
    // band drawn at the raw `xScenePx` would sit at `x = 0` only at `p = 0`
    // and would be most of a screen off the side by mid-act.
    //
    // ONE definition, shared with the stone: `bandLateralPx()` in
    // `traverseConfig.ts`. It was the `islands.compensate` flag and it is now
    // unconditional — the ladder died, the re-centring did not. Pure
    // arithmetic on the frozen frame plus this island's already-cached rect:
    // no second read of the section, no `getBoundingClientRect` in the frame
    // path, no allocation. `lateral = −dir·R·ih·a`, where `a` is the SAME
    // centring scalar the stone tumbles on, so net and stone share one number
    // by construction (`__sersanCrystal_*.traverse.deltaPx` is the gate).
    const bcfg = traverseConfig.bands[band as TraverseBandId];
    let lateralPx = 0;
    if (onBand) {
      lateralPx = bcfg
        ? bandLateralPx(
            bcfg,
            tv!.xScenePx,
            tv!.secTop,
            tv!.secH,
            rect.docTop,
            rect.h,
            ih,
          )
        : tv!.xScenePx;
    }

    // ── ROUND 12 · STAGE 2 — THE RIBBON'S GEOMETRY ─────────────────────────
    // Four numbers, all pure arithmetic on the FROZEN frame plus this
    // island's already-cached rect: no DOM read, no allocation, and the SAME
    // three functions the stone calls on the same arguments, so net and stone
    // can differ by float noise only.
    //
    // `fieldSlope` is the one that earns its own gate. It is the shear that
    // makes a field which translates diagonally sit STILL on the screen, and
    // GATE 3 is its own prediction: the centreline's screen y at the frame's
    // centre column is constant in `p` to ≤ 2 px. If μ is wrong by 1 % the
    // net walks 54 px up or down the frame across the act.
    //
    // ⚠ `rect.h`, NEVER `size.height` — the band pin is `svh`, so on a phone
    // with a collapsing URL bar the two differ by the toolbar and the shear
    // would be wrong by that ratio for the whole act.
    const ribbonOn = !!tv && !!bcfg && bcfg.ribbon && build.field.ribbon;
    let fieldLen = 1;
    let fieldSlope = 0;
    let yRegPx = 0;
    let fieldFade = 1;
    if (ribbonOn) {
      fieldLen = bandFieldLen(bcfg!, tv!.secH, rect.w);
      fieldSlope = bandFieldSlope(bcfg!, rect.w, rect.h);
      yRegPx = bandRegisterPx(
        bcfg!,
        tv!.secTop,
        tv!.secH,
        rect.docTop,
        rect.h,
        ih,
      );
      // THE EXIT FADE (a NEW BEAT — FIELD_EXIT_VH). The ribbon's screen y is
      // constant in `p`, so at p = 1 the net is dead centre; and `frame.active`
      // goes false at exactly p = 1, which is also where ScrollTrigger stops
      // calling `apply()`. There is no natural exit to fall back on — without
      // this the field would simply stop, frame-centred, and stay there. One
      // smoothstep over the act's last `FIELD_EXIT_VH` viewport heights of
      // scroll, reaching 0 at p = 1 so the cull can flip without cutting
      // anything. `FIELD_EXIT_VH = 0` is the A/B that shows what it buys.
      const exitPx = Math.max(FIELD_EXIT_VH * ih, 1);
      const q = THREE.MathUtils.clamp(
        ((1 - tv!.p) * tv!.secH) / exitPx,
        0,
        1,
      );
      fieldFade = q * q * (3 - 2 * q);
    }
    if (onBand && scrollY !== lastSeenScroll.current) {
      lastSeenScroll.current = scrollY;
      glFrames.current++;
    }

    // Act DPR cap (§6.3): the traverse's load FALLS through the act, so the
    // performance monitor's natural response is to CLIMB dpr mid-film — and
    // every climb reallocates the swapchain + the PostFX targets, i.e. a hitch
    // inside a cinematic beat. Freeze the ceiling for the duration; a genuine
    // decline can still drop it, which is correct. One cap per act, never per
    // beat, and we only ever release the cap we ourselves armed.
    if (tv) {
      const tier = useTierStore.getState();
      if (onBand && armedDprCap.current === null && traverseConfig.dprCap) {
        const capped = gl.getPixelRatio();
        armedDprCap.current = capped;
        tier.setDprCap(capped);
      } else if (!onBand && armedDprCap.current !== null) {
        if (tier.dprCap === armedDprCap.current) tier.setDprCap(null);
        armedDprCap.current = null;
      }
    }

    const vpTop = rect.docTop - scrollY;
    const cx = rect.cxBase;
    const cy = vpTop + rect.h / 2;
    // Hoisted from the uniform-drive block below: the mask lane is now
    // written ABOVE the culls (see the note there), so it needs `u` first.
    const u = build.uniforms;

    // --- ROUND 11 — THE MASK LANE TRACKS THE COPY ---------------------------
    // A half-plane gate swept 1.70 band widths goes degenerate (it dims the
    // whole cloud at one end of the act and nothing at the other), so the gate
    // is a two-sided LANE centred on the copy. The centre comes from the
    // block's FINAL APPLIED `x`, published in the same frame by the same
    // window — never a linearised α, never a separate integrator, never a
    // damper: a lane driven at α_read while the copy runs at α_edge walks
    // 292 px off the text, 7.7× the tolerance, worst exactly at the top and
    // bottom of the frame where the eye first lands.
    //
    // ONE WINDOW, THREE OUTPUTS: `laneWindow` (V̂) drives the copy's opacity in
    // the DOM and, here, the lane's WIDTH, its SOFTNESS and its DEPTH. At
    // V̂ = 1 all three are the shipped values exactly; at V̂ = 0 the lane has
    // zero width, zero ramp and a floor of 1, i.e. the gate is fully OPEN —
    // which is what the copy-free stretches of the act need (§E4) and what
    // makes the whole transition C¹ rather than a pop.
    //
    // ⚠ THIS RUNS BEFORE THE CULLS, DELIBERATELY. It used to sit down with the
    // other uniform writes, below both `return`s — and a band is ALWAYS culled
    // at the moment `onBand` flips false (the band lives inside the section, so
    // it leaves the frame first), which made the restore branch unreachable and
    // left the gate parked on a 0.41-wide stripe wherever the copy last was.
    // Latent while the band is invisible; live the moment the traverse is torn
    // down off-frame (a runtime reduced-motion toggle) and the band comes back
    // with a stale lane. Five float writes is the right price for a state
    // machine that cannot get stuck.
    if (onBand && traverseConfig.laneEnabled) {
      laneDriven.current = true;
      const v = tv!.laneWindow;
      const bandW = Math.max(rect.w, 1);
      u.uCopyLaneC.value = (tv!.laneCenterPx - cx - lateralPx) / bandW;
      u.uCopyLaneW.value = (tv!.laneHalfPx / bandW + COPY_EDGE_PAD) * v;
      u.uCopySoft.value = COPY_RAMP_SOFT * v;
      u.uCopyFloor.value = 1 + (COPY_MASK_FLOOR - 1) * v;
      u.uCopyLineFloor.value = 1 + (COPY_MASK_FLOOR_LINE - 1) * v;
      // ROUND 12 · D — the LINK/continuity role's own floor, on the same lane
      // window. It is 170× the star floor and that is not an oversight: the
      // 2.8e-4 ceiling the 1e-4 was sized against is derived from an UNMASKED
      // STAR CENTRE of 69.4 and has no bearing on a role whose covered-pixel
      // luminance is O(1). The shader hands it to RESTING dust only.
      u.uCopyStreamFloor.value = 1 + (COPY_MASK_FLOOR_STREAM - 1) * v;
      // ── ROUND 12 · STAGE 2 FIX — THE LANE GETS A CEILING AND A SILL ─────
      // The five writes above are the shipped 1-D wall in x. On the D17
      // ribbon that wall is 1408 px of a 1920 px frame at 1/10000 brightness,
      // at EVERY y, for the whole act — the measured black frame (`meanL 3.95
      // / 1.45 % > L24` against `#production`'s approved 21.27 / 15.73 %).
      // These three bound it to the reading unit it exists to protect.
      //
      // ⚠ `bandH`, NOT `ih`, AND THE SAME `bandH` THE SHADER'S y IS IN. The
      // shader reads mapped LOCAL y, whose unit is `rect.h`; `laneCyPx` and
      // `laneHalfYPx` are viewport CSS px. Divide by `ih` instead and the
      // carve-out is wrong by `rect.h/ih` for the whole act — exactly the
      // `svh`-vs-`size.height` trap the shear note warns about, one axis over.
      //
      // ⚠ GATED ON `ribbonOn`, NOT ON `laneDriven`. A band whose field is no
      // wider than the frame does not have this problem and must not pay for
      // it: `uCopyRowLocal = 0` makes `mix(floor, 1, 0)` evaluate to `floor`
      // to the bit, so `#production` and the `ribbon: false` rollback keep the
      // shipped wall exactly, mis-sizing and all.
      const bandH = Math.max(rect.h, 1);
      u.uCopyYc.value = ribbonOn ? (cy - yRegPx - ih / 2) / bandH : 0;
      u.uCopyRowC.value = ribbonOn
        ? (ih * COPY_ROW_SCREEN_C - tv!.laneCyPx) / bandH
        : 0;
      u.uCopyRowH.value = ribbonOn
        ? tv!.laneHalfYPx / bandH + COPY_ROW_PAD
        : 1;
      u.uCopyRowSoft.value = COPY_ROW_SOFT;
      u.uCopyRowLocal.value = ribbonOn ? 1 : 0;
    } else if (laneDriven.current) {
      // Edge only (never per frame): the band left the traverse's range, so
      // hand the gate back to the shipped half-plane and the shipped floors
      // rather than leaving it parked wherever the copy last was.
      laneDriven.current = false;
      // ⚠ ROUND 12 · D — THE OPEN LANE'S WIDTH IS PER BUILD, NOT A MODULE
      // CONSTANT. At the shipped 2.0 the (unused) LEFT wall of the lane lands
      // at local x ≈ −1.52, which is INSIDE a ±1.895 ribbon — and every node
      // left of it then reads UNMASKED. The build already resolves the right
      // one (`field.laneOpenW` = `COPY_LANE_OPEN_W_RIBBON` 4.0 on a ribbon,
      // `COPY_LANE_OPEN_W` 2.0 otherwise). Not latent: live from the first
      // measure of any ribbon band whose lane driving is off.
      const openW = build.field.laneOpenW;
      u.uCopyLaneC.value = rect.copyEdge + COPY_EDGE_PAD - openW;
      u.uCopyLaneW.value = openW;
      u.uCopySoft.value = COPY_RAMP_SOFT;
      u.uCopyFloor.value = COPY_MASK_FLOOR;
      u.uCopyLineFloor.value = COPY_MASK_FLOOR_LINE;
      u.uCopyStreamFloor.value = COPY_MASK_FLOOR_STREAM;
      // The vertical twin hands back the SHIPPED state, not a ribbon-shaped
      // one: this branch's whole contract is "the gate is the half-plane it
      // has always been". `uCopyRowLocal = 0` restores it to the bit.
      u.uCopyYc.value = 0;
      u.uCopyRowC.value = 0;
      u.uCopyRowH.value = 1;
      u.uCopyRowLocal.value = 0;
    }

    // ── ROUND 12 · STAGE 2 — THE VERTICAL CULL IS KEYED TO THE SECTION ────
    // and it HAD to be. The anchor box is one viewport tall inside a 5358 px
    // act, so it leaves the frame after ~2 vh — while the ribbon, whose screen
    // y is constant in `p`, is on frame for the whole act. Keyed to the anchor
    // the net would be culled at p ≈ 0.35 with the reader still four screens
    // from the end of the section.
    //
    // ⚠ AND A SECTION-KEYED FLIP ON ITS OWN WOULD CUT A FRAME-CENTRED NET —
    // which is why the exit FADE above is a beat and not a nicety. The two are
    // one mechanism: `fieldFade` reaches 0 at p = 1, and p = 1 is exactly where
    // `frame.active` goes false.
    //
    // ⚠ `CULL_PAD` IS HYSTERESIS, NOT A VISIBILITY RULE. 220 px of padding is
    // what once put an entirely off-screen band in the draw list, so it is
    // applied on the ENTRY side only: past the end of the act the frozen frame
    // stops advancing (ScrollTrigger's range ends at `bottom top` = p 1), so a
    // padded exit test would read "just inside" forever and keep 34 000
    // particles in the draw list for the rest of the page.
    //
    // A ribbon band that is NOT active is not drawn at all: its rig would fall
    // back to `lateralPx = 0`, `yReg = 0` — the un-registered field, a screen
    // and a half off — and one frame of that is a flash.
    // The QA mute (dev handle `mute()`), read before every other cull so the
    // A/B screenshot is the island and nothing else.
    if (mutedRef.current) {
      group.visible = false;
      return;
    }
    if (ribbonOn) {
      const secVpTop = tv!.secTop - scrollY;
      if (secVpTop + tv!.secH < 1 || secVpTop > ih + CULL_PAD) {
        group.visible = false;
        return;
      }
    } else if (bcfg && bcfg.ribbon && build.field.ribbon) {
      group.visible = false;
      return;
    } else if (vpTop + rect.h < -CULL_PAD || vpTop > ih + CULL_PAD) {
      group.visible = false;
      return;
    }
    // ⚠ ROUND 12 · STAGE 1 — `#problem` GOES BACK TO PADDED VISIBILITY, AND
    // THAT IS A DELIBERATE BEHAVIOUR CHANGE, NOT A DEAD-CODE REMOVAL.
    // `strictCull` submitted a band only while it GENUINELY intersected the
    // frame, because a ladder at a 1.12 vh pitch put a third, entirely
    // off-screen band into the draw list. With ONE band there is no neighbour
    // to overlap, so the shipped `CULL_PAD` hysteresis (220 px, which keeps
    // the reveal ramp warm) is the whole rule again — exactly what
    // `#production` has always had. Cost: the band is submitted for
    // `h + ih + 2·PAD` ≈ 2.47 vh of scroll against a real presence of
    // 1.86 vh, i.e. ~0.6 vh of scroll drawing 9 000 clipped sprites.
    //
    // ⚠ AND IT IS NOT QUITE PIXEL-NEUTRAL, IN THE SAFE DIRECTION. The field is
    // NOT confined to its anchor box on screen: the box is `zWorld = 9.6215`
    // deep at `CAMERA_Z = 12`, so perspective maps it to between 0.714× (far
    // plane) and 1.669× (near plane) about the SCREEN CENTRE. A box that has
    // just left the frame still has far-plane nodes inside it, and `strictCull`
    // — a box test — clipped them. Padded visibility draws them again, which is
    // what `#production` has always drawn, so this restores the contract
    // rather than breaking it.
    //
    // The LATERAL cull went with it. It could only ever fire while the band
    // was ALSO vertically on frame (the vertical cull returns first), and
    // under the re-centring above `lateral = dir·R·(sy − sy_centre)` is linear
    // in scroll, so it is extremal exactly at the ends of that window:
    //   any pixel on frame  ⇒ |lateral| ≤ R·(ih + rect.h)/2
    //   inside the 220 px pad ⇒ |lateral| ≤ R·((ih + rect.h)/2 + CULL_PAD)
    // Measured against a firing point of ±(vw/2 + rect.w/2 + CULL_PAD):
    //   1920×935  ±380 px on frame (±476 padded)  vs  ±2140 px — 5.6× clear
    //    390×844  ±343 px on frame (±439 padded)  vs   ±610 px — 1.8× clear
    // so it could never delete a band with a pixel on screen. Deleting it is
    // pixel-neutral today; leaving it would have deleted STAGE 2's ribbon at
    // both ends of the act (`p < 0.101`, `p > 0.899` at 45°).
    group.visible = true;

    // Camera-locked placement of the OUTER group, scaled to the anchor rect.
    const wWorld = rect.w * k;
    const hWorld = rect.h * k;
    // ⚠ A band the traverse owns has a VIEWPORT-relative height, so its depth
    // is measured against WORLD_VIEW_HEIGHT and `ih` cancels: zWorld = 9.6215
    // at every viewport and every runway, instead of tracking an anchor box
    // that a 6.1-viewport runway would push to 68.26 (nodes behind the
    // camera). Every other band keeps the shipped formula byte-for-byte.
    const zWorld = tv
      ? WORLD_VIEW_HEIGHT * NEURAL_DEPTH_VIEWPORT_SPAN
      : hWorld * NEURAL_DEPTH_SCALE_FACTOR;
    scratch.current
      .set((cx - vw / 2) * k, (ih / 2 - cy) * k, -CAMERA_Z)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    group.position.copy(scratch.current);
    group.quaternion.copy(camera.quaternion);
    // The rig translates in WORLD units, OUTSIDE the anisotropic scale, using
    // the SAME `k` that placed the group — so the conversion constant is
    // written exactly once and `L = X·k` needs no fudge factor.
    rig.position.x = lateralPx * k;
    // THE VERTICAL RE-CENTRING — the lateral's exact twin, and 0 unless this
    // band carries a ribbon. The shear makes `screenY` constant; it does not
    // make it `ih/2`. Without this the constant is `docTop − secTop + rectH/2
    // − secH/2` ≈ −2500 px, i.e. the net sits two and a half screens above the
    // frame for the entire act. Same `k` as the lateral and the placement, so
    // the conversion constant is written once.
    rig.position.y = yRegPx * k;
    scaleGroup.scale.set(wWorld, hWorld, zWorld);

    // Arrival ramp: assemble when the READER arrives (same shape as the
    // lattice build this replaces — scrollStore.reveal gated by a per-section
    // visibility ramp, damped slow enough that the coalesce reads on entry).
    // ⚠ SECTION-KEYED UNDER THE RIBBON, for the same reason the cull is: the
    // anchor's `vpTop` runs away down the act, so an anchor-keyed ramp
    // saturates at 1 within the first screen and then means nothing. Keyed to
    // the section it is the same SHAPE — the field is fully revealed ~110 px
    // before p = 0, which is where the run starts.
    const rampTop = ribbonOn ? tv!.secTop - scrollY : vpTop;
    const vis = THREE.MathUtils.clamp(
      (ih + CULL_PAD / 2 - rampTop) / (ih * 0.7),
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
        // ⚠ `build.field.fractureT`, NOT the module constant. The surge runs
        // in `nodeT`, and on the ribbon `nodeT ≡ u` — so the fracture is the
        // stone's own `u` (0.7376), not the authored 0.62. Read off the same
        // build the shader's `uFracture` was written from, so the wavefront
        // cannot die 0.12 of the field short of the stone it dies AT.
        if (s.t >= build.field.fractureT) {
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
    // ⚠ ROUND 12 · STAGE 2 — THE ORBIT ANGLES SCALE WITH THE FIELD, PER AXIS.
    // `innerRef` rotates about the field ORIGIN, so a fixed 0.09 rad sweeps a
    // point in z by `extent · sin θ` — and the ribbon's extents are 1.90 in x
    // and 4.31 in y (the shear), not 0.48 and 0.42. Left alone the sweep takes
    // camera distance to [4.7, 19.3] against the authored [10.08, 13.92]: the
    // "nodes coming at the camera" failure `NEURAL_DEPTH_VIEWPORT_SPAN` exists
    // to prevent, arrived at through the back door.
    //
    // Rotation about X sweeps the Y extent into z and vice versa, so the two
    // factors are NOT the same number. Off the ribbon both are `PLEXUS_RX /
    // PLEXUS_RX` and `PLEXUS_RY / PLEXUS_RY` — exactly 1.0, and a multiply by
    // 1.0 is bit-exact, so `#production` is unmoved.
    const halfX = ribbonOn ? 0.5 * fieldLen : PLEXUS_RX;
    const halfY = ribbonOn
      ? RIBBON_RY + Math.abs(fieldSlope) * halfX
      : PLEXUS_RY;
    const orbitKx = PLEXUS_RY / halfY;
    const orbitKy = PLEXUS_RX / halfX;
    inner.rotation.set(
      (Math.sin(t * NEURAL_ORBIT_FREQ_X) * NEURAL_AUTO_ORBIT +
        parallaxRef.current.y) *
        orbitKx,
      (Math.sin(t * NEURAL_ORBIT_FREQ_Y) * NEURAL_AUTO_ORBIT +
        parallaxRef.current.x) *
        orbitKy,
      0,
    );
    inner.position.z = Math.sin(t * 0.21) * NEURAL_Z_BREATHE;

    // ── ROUND 12 · STAGE 2 — THE FIELD MAPPING, WRITTEN ON CHANGE ─────────
    // Geometry, not look: it only moves when the section or the viewport does.
    // Written through a change guard rather than unconditionally so a console
    // tune of `uFieldSlope` (the fastest way to see what GATE 3 is measuring)
    // survives more than one frame — the same discipline the lane pair keeps.
    const fw = fieldWritten.current;
    if (
      fw.build !== build ||
      fw.len !== fieldLen ||
      fw.origin !== 0 ||
      fw.slope !== fieldSlope
    ) {
      fw.build = build;
      fw.len = fieldLen;
      fw.origin = 0;
      fw.slope = fieldSlope;
      u.uFieldLen.value = fieldLen;
      u.uFieldOrigin.value = 0;
      u.uFieldSlope.value = fieldSlope;
      // 1/L on the LOCAL-units forces (pointer bend, curl) — the recycle-snap
      // invariant, see the `push` note in neuralFieldCompute.
      u.uFieldK.value = 1 / Math.max(fieldLen, 1e-6);
    }
    u.uFieldFade.value = fieldFade;

    // ══ ROUND 12 · D — THE ROLLING κ-WINDOW AND THE TRAVELLING SIGNAL ══════
    //
    // Both are one axis. `phase = y·uFrontKy + uFrontC` is nodeT along the
    // band's centreline, un-sheared by the 45° slope, and it is exactly the
    // key both tables were sorted on at build. So the window's centre and the
    // crests' position are read off the SAME arithmetic — a net that lights up
    // where the reader is looking cannot disagree with a window that keeps
    // particles where the reader is looking.
    //
    //   phase(y) = (y − yMid_of_frame + yMid_of_frame)·Ky + C, with
    //   Ky = dir·R·bandAspect / xSpan and C = −xMin/xSpan (see `phaseAt`).
    //
    // ⚠ `uWinYc` IS ITS OWN UNIFORM, not `uCopyYc`. The copy lane's centre is
    // only written inside `traverseConfig.laneEnabled`; if the lane were ever
    // disabled, a window fade keyed on `uCopyYc = 0` would mask the entire
    // field off (mapped y spans ±4.34 band-heights under the shear).
    const bandH = Math.max(rect.h, 1);
    const winYc = ribbonOn ? (cy - yRegPx - ih / 2) / bandH : 0;
    u.uWinYc.value = winYc;
    u.uWinHalf.value = ih / (2 * bandH);
    u.uWinOn.value = ribbonOn ? 1 : 0;
    u.uBandPx.value = ribbonOn ? rect.h : 0;
    if (ribbonOn) {
      const frontKy = build.field.frontKy;
      u.uFrontKy.value = frontKy;
      u.uFrontC.value = build.field.frontC;
      // THE BIRTH FRONT — a damped pure function of `p` from the FROZEN
      // frame, never `Math.max(prev, next)`: a latch cannot go back when the
      // reader does, and D16 rules that out. `uReveal` is NOT reusable here —
      // it arms the recycle snap and drives the coalesce, and it saturates
      // ~262 px before p = 0.
      const frontTarget = FRONT_LEAD + tv!.p * FRONT_SPAN;
      // Seed on the first ribbon frame rather than damping up from 0 — a
      // damper starting at 0 leaves the whole field unborn for ~0.3 s.
      frontRef.current = frontRef.current
        ? THREE.MathUtils.damp(frontRef.current, frontTarget, 10, delta)
        : frontTarget;
      u.uFront.value = frontRef.current;
      // ⚠ AND THE LIGHT GETS ITS OWN CLOCK. Without `RIVER_RATE` the crests
      // are a pure function of `p`, so a reader who stops scrolling sees
      // FROZEN BRIGHT PATCHES — the direct contradiction of the brief. At
      // 0.09 nodeT/s a crest crosses the frame in ~2.9 s whether or not
      // anyone is scrolling.
      riverClock.current += delta * RIVER_RATE;
      u.uRiver.value = frontRef.current + riverClock.current;
      // THE WINDOW, CENTRED ON THE FRAME. Binary search the ascending κ table
      // for the frame's centre entry, then clamp a fixed-width window around
      // it: fixed width is what makes each element's residue class — and
      // therefore its particle population and its comb — a build constant.
      const phC = winYc * frontKy + build.field.frontC;
      u.uWinFirstEdge.value = windowFirst(
        build.field.edgeKey,
        phC,
        build.field.winEdges,
      );
      u.uWinFirstNode.value = windowFirst(
        build.field.nodeKey,
        phC,
        build.field.winNodes,
      );
    }

    // --- Drive the field uniforms -------------------------------------------
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
      // ⚠ ROUND 12 · STAGE 2 — THE RIG'S OFFSETS COME OUT HERE OR THE CURSOR
      // BEND IS DEAD. `uPointer` is read in the field's LOCAL space, and under
      // the ribbon the field is translated by `lateralPx` (up to ±2679 px) and
      // `yRegPx` (≈ −2500 px). Un-subtracted, the pointer lands a screen and a
      // half from where the reader's cursor is and `ly` is past the influence
      // gate for essentially the whole act — the bend would simply never fire.
      // Gated on `ribbonOn` so the rollback keeps the shipped registration
      // byte-for-byte, mis-registration and all.
      const lx = (ptr.smooth.x * vw - cx - (ribbonOn ? lateralPx : 0)) / rect.w;
      const ly =
        (cy - (ribbonOn ? yRegPx : 0) - ptr.smooth.y * ih) / rect.h;
      // The influence ZONE is a different question from the coordinate. On the
      // band it is a ±0.75 box around the cloud. On the ribbon `lx` spans the
      // whole ±1.90 field by construction (the pointer is always inside the
      // frame, and the frame is always inside the field), so an x box would
      // clip the bend to mid-act; what still means something is the ACROSS
      // distance, `ly − μ·lx`.
      const inZone = ribbonOn
        ? Math.abs(ly - fieldSlope * lx) < 0.75
        : lx > -0.75 && lx < 0.75 && ly > -0.75 && ly < 0.75;
      if (inZone) {
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

    if (process.env.NODE_ENV !== "production") {
      const rp = ribbonProbe.current;
      rp.on = ribbonOn;
      rp.lateralPx = lateralPx;
      rp.yRegPx = yRegPx;
      rp.slope = fieldSlope;
      rp.len = fieldLen;
      rp.fade = fieldFade;
      rp.p = tv ? tv.p : 0;
    }

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
      bandId: band,
      /** QA GATE 4 — the structural fingerprint of this band's
       * constellation. The `#production` row is the byte-for-byte contract:
       * `{nodes: 101, edges: 229}`, checksum −420.464007. */
      get plexus() {
        if (!build) return null;
        const st = build.stats;
        return {
          seed: st.seed,
          well: st.well,
          nodes: st.nodes,
          edges: st.edges,
          meanDegree: Math.round(st.meanDegree * 1000) / 1000,
          minEdgeLocal: Math.round(st.minEdgeLocal * 10000) / 10000,
          components: st.components,
          largestComponent: st.largestComponent,
          meanEdgeLocal: Math.round(st.meanEdgeLocal * 10000) / 10000,
          checksum: st.checksum,
          particles: countRef.current,
        };
      },
      /** QA GATE 3 — is this band paying anything right now? `onFrame` false
       * ⇒ the frame callback returned at the vertical cull, before the
       * compute dispatch and before the draw (two comparisons, nothing
       * else). */
      get cost() {
        const g = groupRef.current;
        return {
          onFrame: !!g && g.visible,
          particlesShaded: !!g && g.visible ? countRef.current : 0,
          drawCalls: !!g && g.visible ? 2 : 0,
          computeDispatch:
            !!g && g.visible && backendIsWebGPURef.current ? 1 : 0,
        };
      },
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
          linkLines: build?.links?.edgeCount ?? 0,
          linkVerts: build?.links?.vertexCount ?? 0,
          lineAlpha: u.uLineAlpha.value,
          lineEmissive: u.uLineEmissive.value,
          lineLumMax: u.uLineLumMax.value,
          lineBlue: u.uLineBlue.value,
          lineSurgeGain: u.uLineSurgeGain.value,
          lineRowGain: u.uLineRowGain.value,
          dustAlpha: u.uDustAlpha.value,
          beadAlpha: u.uBeadAlpha.value,
          // ROUND 9-B / 11 — the copy mask, now a LANE. On an un-traversed
          // band the pair is DRIVER-WRITTEN per measure and is exactly the
          // shipped half-plane (`copyEdgeEquivalent` reports where that
          // half-plane's edge sits); on a traversed one it is written per
          // frame from the tracked block's applied `x`, so a console write
          // there survives one frame. Set copyFloor / copyLineFloor /
          // copyYFloor to 1 for exactly the round-8-I look.
          copyLaneC: u.uCopyLaneC.value,
          copyLaneW: u.uCopyLaneW.value,
          copyEdgeEquivalent: u.uCopyLaneC.value + u.uCopyLaneW.value,
          copyEdgeMeasured: rect?.copyEdge ?? null,
          copySoft: u.uCopySoft.value,
          copyFloor: u.uCopyFloor.value,
          copyLineFloor: u.uCopyLineFloor.value,
          copyYFloor: u.uCopyYFloor.value,
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
      /**
       * ROUND 11 QA — the numbers the Stage 1 gates are stated in.
       *  R2  `zWorld` must read 9.62 ± 0.05 and `minNodeDist` ≥ 10.0 at EVERY
       *      viewport, including 390×844.
       *  R1  `domFrames` and `glFrames` must be EQUAL on every frame across a
       *      3000 px/s flick — the gate is a skew of 0.
       *  R7  `laneCentrePx` must equal the tracked block's applied `x` to
       *      < 2 px (against a 38 px tolerance).
       */
      get traverse() {
        const g = scaleRef.current;
        const zWorld = g ? g.scale.z : 0;
        const nodeZ = zWorld * PLEXUS_RZ;
        const frame = traverseRef.current;
        return {
          bound: !!frame,
          active: !!frame && frame.active,
          p: frame ? frame.p : 0,
          xScenePx: frame ? frame.xScenePx : 0,
          lWorld: rigRef.current ? rigRef.current.position.x : 0,
          zWorld,
          minNodeDist: CAMERA_Z - nodeZ,
          maxNodeDist: CAMERA_Z + nodeZ,
          laneWindow: frame ? frame.laneWindow : 0,
          laneCentrePx: frame ? frame.laneCenterPx : 0,
          laneHalfPx: frame ? frame.laneHalfPx : 0,
          laneCentreLocal: build ? build.uniforms.uCopyLaneC.value : 0,
          /** The lane centre converted back to viewport px — compare this to
           * the tracked block's `left + x + width/2` (R7c, < 2 px). */
          laneCentreBackPx: build
            ? build.uniforms.uCopyLaneC.value * (rect?.w ?? 1) +
              (rect?.cxBase ?? 0) +
              (frame ? frame.xScenePx : 0)
            : 0,
          domFrames: (frame ? frame.tick : 0) - domBase.current,
          glFrames: glFrames.current - glBase.current,
          /** The gate: must be 0 on every frame across a 3000 px/s flick. */
          skew: Math.abs(
            (frame ? frame.tick : 0) -
              domBase.current -
              (glFrames.current - glBase.current),
          ),
          domFramesRaw: frame ? frame.tick : 0,
          glFramesRaw: glFrames.current,
          dprCap: armedDprCap.current,
        };
      },
      /**
       * ROUND 12 · STAGE 2 QA — the field this island is actually drawing.
       * `wrapSnapOk` is the one to read first: false means the recycle snap
       * cannot arm and the bright spring-flight streak is back on the WebGPU
       * tier. `packedEdgeKiB` is GATE 1 (≤ 6 KiB), read rather than asserted.
       */
      get field() {
        if (!build) return null;
        const f = build.field;
        const rp = ribbonProbe.current;
        const e = build.stats.edges;
        const want = !!traverseConfig.bands[band as TraverseBandId]?.ribbon;
        return {
          ...f,
          packedEdgeKiB: Math.round((Math.ceil(e / 4) * 16 * 100) / 1024) / 100,
          density: traverseConfig.bands[band as TraverseBandId]?.ribbonDensity,
          /** ROUND 12 · STAGE 2 FIX — what the CONFIG asks for, next to what
           * the BUILD delivered, and whether the traverse was armed when the
           * build ran. `ribbonWanted !== ribbon` is the one-way-lever defect,
           * named rather than left to be inferred from a black frame: the
           * recorded failure was a `ribbon: true` write that reported
           * `field.ribbon === false` with nothing anywhere saying so. */
          ribbonWanted: want,
          armed: !!useTraverseStore.getState().bands[band],
          leverOk: want === f.ribbon,
          live: { ...rp },
        };
      },
      /**
       * GATE 3 — MEASURED, not derived. Returns the SCREEN y of the ribbon's
       * centreline at the frame's centre column, walked through the real
       * transform chain (inner → scale → rig → group → camera), so it prices
       * the orbit and the parallax too. The algebra's prediction is that this
       * is CONSTANT in `p`; ≤ 2 px across 20 samples is the gate, and 1 % of
       * error in μ shows up as 54 px of walk across the act.
       *
       * `null` when the band is not drawing (culled, un-armed, or rolled back
       * to the ellipsoid, which has no centreline to speak of).
       */
      centreScreenY(): number | null {
        const g = groupRef.current;
        const inner = innerRef.current;
        const rp = ribbonProbe.current;
        if (!g || !inner || !g.visible || !rect || !rp.on) return null;
        // The field point currently at screen x = vw/2: local x·rect.w +
        // lateralPx = 0 (the group's own centre IS the viewport centre-line on
        // a full-bleed band), and the centreline is v = 0 ⇒ y = μ·x.
        const xl = -rp.lateralPx / Math.max(rect.w, 1);
        const v = new THREE.Vector3(xl, rp.slope * xl, 0);
        inner.localToWorld(v);
        v.project(camera);
        return ((1 - v.y) / 2) * size.height;
      },
      /**
       * GATE 6 — the frame gaps, MEASURED, and measured ACROSS THE RIBBON.
       *
       * ⚠ A NAIVE COLUMN SAMPLE IS THE WRONG INSTRUMENT HERE AND IT LIES BY
       * HUNDREDS OF PIXELS. The ribbon is a 45° swath: its centreline at
       * screen x is `ih/2 + (x − vw/2)/R`, so a ±60 px column catches ~8 of
       * 389 nodes and its extremes are a small sample of a 784 px-tall
       * distribution — measured `delta` swung to 402 px on pure sampling noise
       * while the geometry was symmetric to the float.
       *
       * So every delivered node is projected through the real transform chain
       * (perspective included — a near-plane node projects 1.67× off screen
       * centre) and reduced to its ACROSS distance from the predicted
       * centreline. The extremes of THAT are the ribbon's true half-widths in
       * screen px, and the gaps are what is left of the frame beyond them.
       *
       * The gate is `|top − bottom| ≤ 20 px`, and it is closed BY CONSTRUCTION
       * rather than by tuning: the generator re-centres the delivered cloud on
       * its own y bbox-centre (`recentre`), which is what the shipped band's
       * 77/153 asymmetry always needed. The MAGNITUDE (≈76 px a side) is `ry`.
       */
      frameGaps() {
        const g = groupRef.current;
        const inner = innerRef.current;
        if (!g || !inner || !g.visible || !build) return null;
        const arr = (
          build.uniforms.uNodePos as unknown as { array: THREE.Vector3[] }
        ).array;
        const u2 = build.uniforms;
        const cxPx = size.width / 2;
        const cyPx = size.height / 2;
        // Screen slope of the centreline: −μ·rect.h/rect.w, i.e. 1/R.
        const m =
          -u2.uFieldSlope.value * (rect ? rect.h / Math.max(rect.w, 1) : 0);
        const v = new THREE.Vector3();
        let lo = Infinity;
        let hi = -Infinity;
        let n = 0;
        for (let i = 0; i < arr.length; i++) {
          const p0 = arr[i];
          // The same `fieldMap` the shader applies, in JS.
          const x = p0.x * u2.uFieldLen.value + u2.uFieldOrigin.value;
          v.set(x, p0.y + u2.uFieldSlope.value * x, p0.z);
          inner.localToWorld(v);
          v.project(camera);
          const sx = ((v.x + 1) / 2) * size.width;
          const sy = ((1 - v.y) / 2) * size.height;
          const across = sy - (cyPx + (sx - cxPx) * m);
          n++;
          if (across < lo) lo = across;
          if (across > hi) hi = across;
        }
        if (!n) return { nodes: 0, top: null, bottom: null, delta: null };
        const top = cyPx + lo;
        const bottom = cyPx - hi;
        return {
          nodes: n,
          halfUp: Math.round(-lo * 10) / 10,
          halfDown: Math.round(hi * 10) / 10,
          top: Math.round(top * 10) / 10,
          bottom: Math.round(bottom * 10) / 10,
          delta: Math.round(Math.abs(top - bottom) * 10) / 10,
        };
      },
      /**
       * ═══ ROUND 12 · STAGE 2 — THE INSTRUMENT THAT WOULD HAVE CAUGHT IT ═══
       *
       * `cost.onFrame`, `centreScreenY()` and `frameGaps()` ALL reported
       * healthy while the screen was black, and none of them was lying about
       * what it measures. They measure "is the band in the draw list", "is the
       * centreline at ih/2 at the centre COLUMN" and "is the swath symmetric
       * ACROSS its own centreline". Not one of them measures *the viewer can
       * see the net*, and two of them are structurally incapable of it:
       *
       *  - `centreScreenY()` samples ONE column. The ribbon's centreline has a
       *    screen slope of `1/(dir·R)` = ±1 at 45°, so it is at `ih/2` at
       *    x = vw/2 and 960 px off frame at either edge — and the single
       *    sample cannot tell those two pictures apart.
       *  - `frameGaps()` reduces every node to its ACROSS distance from that
       *    same centreline, which is invariant along the ribbon. A swath that
       *    covers 44 % of the frame in a diagonal bar and a swath that covers
       *    100 % of it report the SAME `halfUp`/`halfDown`/`delta`.
       *  - `cost.onFrame` is `group.visible`, i.e. a cull result. A field
       *    multiplied by a 1e-4 mask is `visible === true`.
       *
       * This one answers the question the eye asks, in two independent
       * halves, and either half alone would have failed loudly:
       *
       *  1. **COVERAGE** — every delivered node is projected through the REAL
       *     transform chain and dropped into an `nx × ny` grid over the FRAME.
       *     `coverPct` is the share of cells that contain at least one node.
       *     A horizontal frame-height net reads ≈100; the measured Stage 2
       *     ribbon reads ≈44 because a rigidly-translated straight strip
       *     sheared by `μ` is a 45° BAR on screen, not a horizontal band.
       *  2. **THE MASK, AT THE NODES** — the shipped mask chain evaluated in
       *     JS at each ON-FRAME node (`copyGate × rowGate-floor × copyY ×
       *     fieldFade`), reduced to a median and to the share of on-frame
       *     nodes sitting below `1e-2`. `floored` near 100 % is the black
       *     frame, and it is black for a reason no geometry instrument can
       *     see.
       *
       * `litPct = coverPct × (1 − floored)` is the single number to read:
       * the share of the frame that has net in it AND is not masked away.
       *
       * Pair it with a screenshot luminance census (`mute()` below) — this
       * predicts the pixels, it does not read them, and the two disagreeing
       * is itself information.
       */
      /**
       * ROUND 12 · D — THE CONTINUITY GATE, MEASURED ON SCREEN.
       *
       * For every link currently inside the κ-window: project both endpoints
       * through the SAME `fieldMap` + rig the shader uses, take the delivered
       * SCREEN length in CSS px, and divide by the link's fixed sprite
       * population to get the delivered along-link spacing `s`. Against it,
       * the delivered sprite diameter `S = NEURAL_POINT_SIZE·sizeK/CAMERA_Z`
       * — the unit law, stated once, that ten months of this project were
       * spent compensating for by eye.
       *
       * REST must clear `S/s ≥ 1.65` (the comb criterion) at the MEAN link
       * AND at the LONGEST one; the LIT regime needs `S_axial/s ≥ 6.0`, and
       * `S_axial` is the anisotropic velocity stretch (up to ×2.95 at a
       * crest), never a bigger disc.
       */
      strand() {
        const g = groupRef.current;
        const inner = innerRef.current;
        if (!g || !inner || !build || !rect) return null;
        const f = build.field;
        if (!f.ribbon || !f.edgeAB) return null;
        const u2 = build.uniforms;
        const arr = (
          u2.uNodePos as unknown as { array: THREE.Vector3[] }
        ).array;
        const v = new THREE.Vector3();
        const sxy = (i: number): [number, number] => {
          const p0 = arr[i];
          const x = p0.x * u2.uFieldLen.value + u2.uFieldOrigin.value;
          v.set(x, p0.y + u2.uFieldSlope.value * x, p0.z);
          inner.localToWorld(v);
          v.project(camera);
          return [
            ((v.x + 1) / 2) * size.width,
            ((1 - v.y) / 2) * size.height,
          ];
        };
        // The delivered CSS diameter at the three points of the radial size
        // ramp. dpr-independent by construction (`sizeNode` is device px and
        // is divided by the camera distance).
        const sizeAt = (k: number) =>
          (u2.uPointSize.value * k * DUST_SIZE_RIBBON) / CAMERA_Z;
        const sMean = sizeAt(
          (CORE_SIZE_BOOST_RIBBON + FRINGE_SIZE_DROP_RIBBON) / 2,
        );
        const per = Math.max(f.perLink, 1e-6);
        /** The AXIAL growth of a sprite at a crest: the anisotropic velocity
         * stretch (1 + min(RIVER_ADVECT·STRETCH_GAIN, STRETCH_MAX) = 2.95,
         * along the chord only — a streak, never a bigger disc) times the
         * crest's own transverse swell (1 + RIVER_SIZE). */
        const CREST_AX = 2.95 * (1 + RIVER_SIZE);
        const first = u2.uWinFirstEdge.value;
        const rows: { len: number; s: number; ratio: number }[] = [];
        let onFrame = 0;
        for (let k = 0; k < f.winEdges; k++) {
          const e = first + k;
          if (e < 0 || e * 2 + 1 >= f.edgeAB.length) continue;
          const [ax, ay] = sxy(f.edgeAB[e * 2]);
          const [bx, by] = sxy(f.edgeAB[e * 2 + 1]);
          const inFrame =
            (ax >= 0 && ax < size.width && ay >= 0 && ay < size.height) ||
            (bx >= 0 && bx < size.width && by >= 0 && by < size.height);
          if (!inFrame) continue;
          onFrame++;
          const len = Math.hypot(bx - ax, by - ay);
          const sp = len / per;
          rows.push({ len, s: sp, ratio: sMean / Math.max(sp, 1e-6) });
        }
        if (!rows.length) return { onFrame: 0 };
        rows.sort((p, q) => p.len - q.len);
        const mean = (sel: (r: (typeof rows)[0]) => number) =>
          rows.reduce((t, r) => t + sel(r), 0) / rows.length;
        /** The DELIVERED overlap after the per-link normaliser. */
        const dlv = (r: (typeof rows)[0]) =>
          Math.max(r.ratio, Math.min(REST_OVERLAP, r.ratio * SIZE_NORM_MAX));
        const longest = rows[rows.length - 1];
        const r3 = (x: number) => Math.round(x * 1000) / 1000;
        return {
          onFrameLinks: onFrame,
          winEdges: f.winEdges,
          winNodes: f.winNodes,
          perLink: r3(f.perLink),
          starCount: f.starCount,
          edgeTotal: f.edgeTotal,
          particles: countRef.current,
          sizeCss: {
            core: r3(sizeAt(CORE_SIZE_BOOST_RIBBON)),
            mean: r3(sMean),
            fringe: r3(sizeAt(FRINGE_SIZE_DROP_RIBBON)),
          },
          meanLinkPx: r3(mean((r) => r.len)),
          medianLinkPx: r3(rows[rows.length >> 1].len),
          longestLinkPx: r3(longest.len),
          spacingPx: {
            mean: r3(mean((r) => r.s)),
            longest: r3(longest.s),
          },
          /** THE NUMBER. Rest must clear 1.65 on BOTH rows. */
          /** The RAW geometric overlap at the authored sprite size. */
          restOverlapRaw: {
            mean: r3(mean((r) => r.ratio)),
            longest: r3(longest.ratio),
          },
          /** What the per-link normaliser DELIVERS: the size grows (capped at
           * SIZE_NORM_MAX) wherever the raw overlap is under the law, and the
           * alpha drops wherever it is over, so `A` is flat. BOTH rows must
           * clear 1.65 at rest; the LIT rows carry the ×2.95 anisotropic
           * stretch and want ≥ 6.0. */
          restOverlap: {
            mean: r3(mean(dlv)),
            longest: r3(dlv(longest)),
            litMean: r3(mean(dlv) * CREST_AX),
            litLongest: r3(dlv(longest) * CREST_AX),
          },
          sizeNormAtLongest: r3(
            Math.min(SIZE_NORM_MAX, Math.max(1, REST_OVERLAP / longest.ratio)),
          ),
          scaledLinks: rows.filter((r) => r.ratio < REST_OVERLAP).length,
          front: r3(u2.uFront.value),
          river: r3(u2.uRiver.value),
          winFirstEdge: u2.uWinFirstEdge.value,
          winFirstNode: u2.uWinFirstNode.value,
          /** The phase axis, read at the frame's centre and at its two edges
           * — the numbers `uFront` has to LEAD or the birth front eats the
           * picture the reader is looking at. */
          phase: {
            centre: r3(u2.uWinYc.value * f.frontKy + f.frontC),
            lo: r3(
              (u2.uWinYc.value - u2.uWinHalf.value) * f.frontKy + f.frontC,
            ),
            hi: r3(
              (u2.uWinYc.value + u2.uWinHalf.value) * f.frontKy + f.frontC,
            ),
          },
          uniforms: {
            bandPx: r3(u2.uBandPx.value),
            winYc: r3(u2.uWinYc.value),
            winHalf: r3(u2.uWinHalf.value),
            winOn: u2.uWinOn.value,
            planeAspect: r3(u2.uPlaneAspect.value),
            dustAlpha: r3(u2.uDustAlpha.value),
            beadAlpha: r3(u2.uBeadAlpha.value),
            pointSize: r3(u2.uPointSize.value),
            flowSpeed: r3(u2.uFlowSpeed.value),
            reveal: r3(u2.uReveal.value),
            fieldFade: r3(u2.uFieldFade.value),
            copyFloor: u2.uCopyFloor.value,
            copyStreamFloor: u2.uCopyStreamFloor.value,
            fieldLen: r3(u2.uFieldLen.value),
            fieldSlope: r3(u2.uFieldSlope.value),
          },
          winKeyRange: f.edgeKey
            ? [
                r3(f.edgeKey[Math.max(0, first)]),
                r3(
                  f.edgeKey[
                    Math.min(f.edgeKey.length - 1, first + f.winEdges - 1)
                  ],
                ),
              ]
            : null,
        };
      },
      /** ROUND 12 · D — the on-frame link segments in CSS px, so a PNG probe
       * can sample luminance ALONG a link and 20 px OFF its axis (the
       * localisation / not-fog gate) instead of guessing where the net is. */
      linkScreen(limit = 40) {
        const inner = innerRef.current;
        if (!inner || !build || !rect) return null;
        const f = build.field;
        if (!f.ribbon || !f.edgeAB) return null;
        const u2 = build.uniforms;
        const arr = (
          u2.uNodePos as unknown as { array: THREE.Vector3[] }
        ).array;
        const v = new THREE.Vector3();
        const sxy = (i: number): [number, number] => {
          const p0 = arr[i];
          const x = p0.x * u2.uFieldLen.value + u2.uFieldOrigin.value;
          v.set(x, p0.y + u2.uFieldSlope.value * x, p0.z);
          inner.localToWorld(v);
          v.project(camera);
          return [
            ((v.x + 1) / 2) * size.width,
            ((1 - v.y) / 2) * size.height,
          ];
        };
        const first = u2.uWinFirstEdge.value;
        const segs: number[][] = [];
        for (let k = 0; k < f.winEdges && segs.length < limit; k++) {
          const e = first + k;
          if (e < 0 || e * 2 + 1 >= f.edgeAB.length) continue;
          const a = sxy(f.edgeAB[e * 2]);
          const b = sxy(f.edgeAB[e * 2 + 1]);
          const pad = 60;
          const on = (q: number[]) =>
            q[0] > pad &&
            q[0] < size.width - pad &&
            q[1] > pad &&
            q[1] < size.height - pad;
          if (!on(a) || !on(b)) continue;
          segs.push([a[0], a[1], b[0], b[1]]);
        }
        return segs;
      },
      frameCoverage(nx = 24, ny = 12) {
        const g = groupRef.current;
        const inner = innerRef.current;
        if (!g || !inner || !g.visible || !build || !rect) return null;
        const arr = (
          build.uniforms.uNodePos as unknown as { array: THREE.Vector3[] }
        ).array;
        const u2 = build.uniforms;
        const cells = new Uint8Array(nx * ny);
        const v = new THREE.Vector3();
        const bandH = Math.max(rect.h, 1);
        const masks: number[] = [];
        let onFrame = 0;
        let filled = 0;
        const sstep = (a: number, b: number, x: number) => {
          const t = Math.min(Math.max((x - a) / (b - a || 1e-6), 0), 1);
          return t * t * (3 - 2 * t);
        };
        for (let i = 0; i < arr.length; i++) {
          const p0 = arr[i];
          const x = p0.x * u2.uFieldLen.value + u2.uFieldOrigin.value;
          const y = p0.y + u2.uFieldSlope.value * x;
          v.set(x, y, p0.z);
          inner.localToWorld(v);
          v.project(camera);
          const sx = ((v.x + 1) / 2) * size.width;
          const sy = ((1 - v.y) / 2) * size.height;
          if (sx < 0 || sx >= size.width || sy < 0 || sy >= size.height)
            continue;
          onFrame++;
          const ci =
            Math.min(ny - 1, Math.floor((sy / size.height) * ny)) * nx +
            Math.min(nx - 1, Math.floor((sx / size.width) * nx));
          if (!cells[ci]) {
            cells[ci] = 1;
            filled++;
          }
          // The shipped mask chain, in JS, at this node — same order, same
          // constants, same uniforms the shader reads this frame.
          const d = Math.abs(x - u2.uCopyLaneC.value);
          const gate = sstep(
            u2.uCopyLaneW.value,
            u2.uCopyLaneW.value + Math.max(u2.uCopySoft.value, 1e-3),
            d,
          );
          const yl = y - u2.uCopyYc.value;
          const dr = Math.abs(yl - u2.uCopyRowC.value);
          const rowGate =
            sstep(
              u2.uCopyRowH.value,
              u2.uCopyRowH.value + Math.max(u2.uCopyRowSoft.value, 1e-3),
              dr,
            ) * u2.uCopyRowLocal.value;
          const floor =
            u2.uCopyFloor.value + (1 - u2.uCopyFloor.value) * rowGate;
          const bell = 1 - sstep(COPY_Y_IN, COPY_Y_OUT, Math.abs(yl));
          const yTerm = 1 + (u2.uCopyYFloor.value - 1) * bell;
          masks.push(
            (floor + (1 - floor) * gate) * yTerm * u2.uFieldFade.value,
          );
        }
        masks.sort((a, b) => a - b);
        const median = masks.length
          ? masks[masks.length >> 1]
          : 0;
        const floored = masks.length
          ? masks.filter((m) => m < 1e-2).length / masks.length
          : 1;
        const coverPct = (filled / (nx * ny)) * 100;
        return {
          nodes: arr.length,
          onFrame,
          grid: `${nx}x${ny}`,
          coverPct: Math.round(coverPct * 10) / 10,
          maskMedian: Math.round(median * 1e5) / 1e5,
          flooredPct: Math.round(floored * 1000) / 10,
          litPct: Math.round(coverPct * (1 - floored) * 10) / 10,
          /** Screen-y band-height unit, for reading `uCopyRow*` in px. */
          bandH,
        };
      },
      /**
       * The A/B lever the screenshot census needs. `mute(true)` takes the
       * whole island out of the draw list on the NEXT frame (a ref the frame
       * path reads, never a React commit — the island commit wedge); the
       * difference between the two screenshots is the net's contribution to
       * the pixels, and nothing else. Hiding the `<canvas>` element instead
       * also removes the signature line and the crystal and changes the page's
       * own compositing, which is how a 17-mean "difference" was once read off
       * a frame that had no net in it at all.
       */
      mute(on = true) {
        mutedRef.current = !!on;
        return mutedRef.current;
      },
      /**
       * The explicit lever. `setTraverseConfig` already routes here, but a
       * rebuild you can ask for BY NAME is what turns "the A/B did not take"
       * from a mystery into a one-line check: call it, then read
       * `field.leverOk`.
       */
      rebuild() {
        rebuildRef.current?.();
        return !!rebuildRef.current;
      },
      /**
       * THE OWNER'S DENSITY A/B (D23), in one call. Rebuilds the field — it is
       * a generator argument, not a uniform — and leaves everything else
       * (scroll position, camera, stone) exactly where it was, which is the
       * whole point: the three arms are meant to be compared at the SAME `p`.
       */
      setDensity(arm: "onFrame" | "areal" | "nearest") {
        setTraverseConfig({ problem: { ribbonDensity: arm } });
      },
      /** The ROLLBACK, both halves, in one call — the shipped geometry AND the
       * shipped constellation. Equivalent to
       * `setTraverseConfig({ bands: { problem: { … } } })`. */
      rollbackToStage1() {
        setTraverseConfig({
          problem: { angleDeg: 23.61, bandVh: 0.8597, ribbon: false },
        });
      },
      resetTraverseCounters() {
        // BASELINE, not zero — see glBase/domBase. Zeroing `frame.tick` here
        // would be undone on the next `apply()` (the hook's own `domFrames` is
        // monotone and this island cannot reach it), which made the shipped
        // reset report a skew equal to however many frames the band had
        // already been active for. Measured 56 and 64 on two scroll paths that
        // in fact had a true skew of 0.
        glBase.current = glFrames.current;
        domBase.current = traverseRef.current?.tick ?? 0;
      },
    };
  }

  if (!build) return null;

  // ROUND 11 — FOUR levels, not two (mechanism §5.2):
  //   groupRef  camera-locked position + quaternion, scale STAYS 1
  //   rigRef    the traverse: a rigid translate in WORLD units, OUTSIDE the
  //             anisotropic scale so its direction and magnitude are honest at
  //             every viewport
  //   scaleRef  the (wWorld, hWorld, zWorld) scale — moved OFF groupRef
  //   innerRef  the existing auto-orbit + pointer parallax, untouched
  return (
    <group ref={groupRef} renderOrder={-1} visible={false}>
      <group ref={rigRef}>
        <group ref={scaleRef}>
          <group ref={innerRef}>
            {/* Round-4 mined-effect layers — same camera-locked frame,
                behind the particles (additive → ordering is cosmetic). */}
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
                LineSegments (one draw call) built from the same getPlexus
                tables the particles read, mounted with <primitive> exactly
                like CrystalCluster mounts crystalPlexus's net. renderOrder /
                culling are set on the object in the build. */}
            {build.links && <primitive object={build.links.object} />}
            <mesh
              geometry={build.geometry}
              material={build.material}
              renderOrder={-1}
              frustumCulled={false}
            />
          </group>
        </group>
      </group>
    </group>
  );
}

/**
 * THE BAND. `Scene.tsx` mounts this exactly as it always did (`mode` +
 * `anchorId`), and it is now what it says: ONE island on ONE anchor.
 *
 * ⚠ ROUND 12 · STAGE 1 — THE LADDER IS DELETED, NOT SWITCHED OFF.
 * Stage 1.5 rendered four EXTRA islands here, stacked down `#problem` at a
 * fitted pitch, because one 619 px band inside a 4335 px act left 40.0 % of
 * the act with neither net nor copy on it. The owner read the stack itself as
 * the defect — *"la rete dev'essere una rete orizzontale continua, non
 * spezzata in piu sezioni verso il basso"* (D14–D24) — so the extras, their
 * per-island seeds, the `primary`/`strictCull` props and the dev-only
 * `onTraverseConfigChange` subscription that re-derived them all go with it.
 *
 * The coverage hole they were answering is therefore OPEN AGAIN at this
 * commit, by design: this is a checkpoint, and STAGE 2 closes it with a single
 * continuous ribbon as long as the lateral run. `coverage().nothing` reports
 * the void honestly in the meantime.
 */
export function NeuralLattice({
  mode,
  anchorId,
}: {
  mode: LatticeMode;
  anchorId: string;
}) {
  return (
    <NeuralLatticeIsland mode={mode} anchorId={anchorId} bandId={anchorId} />
  );
}
