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
import { useEffect, useMemo, useRef, useState } from "react";
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
  traverseRate,
  traverseIslands,
  onTraverseConfigChange,
  type TraverseBandId,
} from "./neural/traverseConfig";
import {
  CLUSTER_COUNT,
  FLOW_SPEED,
  FRACTURE_T,
  SPARK_COUNT,
  NEURAL_PARTICLE_COUNT,
  NEURAL_PARTICLE_COUNT_COMPACT,
  NEURAL_DEPTH_SCALE_FACTOR,
  NEURAL_DEPTH_VIEWPORT_SPAN,
  COPY_LANE_OPEN_W,
  COPY_RAMP_SOFT,
  PLEXUS_RZ,
  COPY_MASK_FLOOR,
  COPY_MASK_FLOOR_LINE,
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
 * ROUND 11 STAGE 1.5 — ONE island of a band. Everything below this line is the
 * shipped driver; the only additions are the four props above `size` and the
 * ~15 lines they reach.
 *
 * `anchorId` is the DOM box it is camera-locked to and the dev-handle key.
 * `bandId` is the TRAVERSE band whose frozen frame it reads — the two are the
 * same for the shipped anchors and differ for the extra islands, which share
 * `#problem`'s one clock while owning their own box. There is exactly one
 * scroll snapshot per act, and five readers of it.
 */
function NeuralLatticeIsland({
  mode,
  anchorId,
  bandId,
  plexusSeed,
  plexusWell = true,
  primary = true,
  strictCull = false,
}: {
  mode: LatticeMode;
  anchorId: string;
  /** Traverse band to read (defaults to `anchorId` for the shipped pair). */
  bandId?: string;
  /** Plexus master seed — undefined = the mode's shipped constellation. */
  plexusSeed?: number;
  /** Carve the crystal clearance well (only the stone's band needs it). */
  plexusWell?: boolean;
  /**
   * The band's ONE owner of the cross-island singletons: the store pulse
   * decay write-back and the act DPR cap. Five islands each damping the same
   * `neuralLatticeStore` pulse array would decay it five times per frame, and
   * five DPR caps would fight over one ceiling. Everything else — reveal,
   * surge, flash, row glow, the mask lane — is genuinely per-island state.
   */
  primary?: boolean;
  /**
   * Submit this band for drawing only while it GENUINELY intersects the frame,
   * instead of throughout the 220 px cull-pad hysteresis. True for every band
   * of a ladder — including the primary, whose padded window is 2.47 vh against
   * a real presence of 1.86 vh and is therefore the thing that puts a THIRD
   * (entirely off-screen) band into the draw list at a 0.98 vh pitch. False for
   * a lone band, which is what `#production` is: no neighbour, nothing to
   * overlap, and its expression stays byte-for-byte the shipped one.
   */
  strictCull?: boolean;
}) {
  const band = bandId ?? anchorId;
  const { size, camera, gl } = useThree();
  const measureVersion = useSectionStore((s) => s.measureVersion);
  const broken = mode === "broken";

  // --- Lazy field build (three/webgpu chunk loads ONLY here) ----------------
  const [build, setBuild] = useState<NeuralFieldBuild | null>(null);
  const backendIsWebGPURef = useRef(false);
  /** The count the CURRENT build was allocated with (dev debug handle only). */
  const countRef = useRef(NEURAL_PARTICLE_COUNT);

  /**
   * ROUND 11 STAGE 1.5 — is this island's anchor actually laid out? An extra
   * island whose `--tv-island-N-on` was never written is `display: none` and
   * measures 0×0, so it must not allocate 9 000 particles, a material and a
   * compute kernel. This is a BOOLEAN, deliberately, and NOT `rect !== null`:
   * the rect object changes on every resize and the build must never be a
   * function of the viewport. It flips only when the ladder is armed or torn
   * down — which is also the whole A/B for `islands.enabled`.
   */
  const [anchorLive, setAnchorLive] = useState(false);
  // ⚠ The gate is for EXTRAS ONLY. A primary band always has its anchor, and
  // making its build wait for the first rect measure would delay every shipped
  // lattice (`#production` included) by a commit for no reason. `primary` is a
  // per-instance constant, so the dependency array's shape never changes.
  const buildGate = primary || anchorLive;

  useEffect(() => {
    if (!webgpuEnabled() || !buildGate) return;
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
        plexusSeed,
        plexusWell,
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
  }, [mode, gl, buildGate, plexusSeed, plexusWell]);

  // --- Section rect: measured on measureVersion bumps -----------------------
  const [rect, setRect] = useState<SectionRect | null>(null);
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-lattice-anchor="${anchorId}"]`,
      );
      // ROUND 11 STAGE 1.5 — an UNPLACED extra island is `display: none` and
      // measures 0×0. Treat that exactly like a missing anchor: no rect, no
      // build, no frame work. `< 2` rather than `=== 0` so a sub-pixel box can
      // never half-arm the island.
      if (!el) {
        setAnchorLive(false);
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) {
        setAnchorLive(false);
        setRect(null);
        return;
      }
      setAnchorLive(true);
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
    // ROUND 11 STAGE 1.5 — the ladder is armed by writing CSS custom
    // properties, which changes NO `[data-line-anchor]` span and NO document
    // height, so `sectionStore.setMeasured` short-circuits and `measureVersion`
    // never bumps. Listen to the remeasure event directly: it is the signal the
    // traverse hook already dispatches on arm, on teardown and on every live
    // config write, and it is event-driven (never per frame).
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
    build.uniforms.uCopyLaneC.value =
      rect.copyEdge + COPY_EDGE_PAD - COPY_LANE_OPEN_W;
    build.uniforms.uCopyLaneW.value = COPY_LANE_OPEN_W;
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
    // ── ROUND 11 STAGE 1.5 — THIS ISLAND'S AUTHORED STRIP-X ────────────────
    // The scene lateral runs 1895 px across the act. An island that is on
    // frame at the END of that run would be drawn 1725 px left of its own box
    // — off the side of the screen, and the lateral cull below would delete
    // it, which is the whole reason five bands need five origins.
    //
    // The origin is the scene lateral at the scroll position where THIS band
    // is centred in the viewport, so `x = 0` exactly when the band is centred
    // and the island sweeps a symmetric ±292 px either side of it. That is the
    // storyboard's own strip-x compensation (§B3), applied to the net instead
    // of the copy: `strip-x = designLane + α·1.5W·p_arrival`, α ≡ 1.00 here.
    //
    // Derived ENTIRELY from the frozen frame (`secTop`/`secH` travel with the
    // snapshot) plus this island's already-cached rect — no second read of the
    // section, no `getBoundingClientRect` in the frame path, no allocation.
    // A one-line identity worth carrying: with the compensation on,
    // `lateral = −dir·R·ih·a`, where `a` is the SAME centring scalar the stone
    // tumbles on. Net and stone therefore share one number by construction.
    let lateralPx = 0;
    if (onBand) {
      lateralPx = tv!.xScenePx;
      const bcfg = traverseConfig.bands[band as TraverseBandId];
      if (bcfg && traverseConfig.islands.compensate) {
        const centreScroll = rect.docTop + rect.h / 2 - ih / 2;
        const travelledAtCentre = Math.min(
          Math.max(centreScroll - tv!.secTop, 0),
          tv!.secH,
        );
        lateralPx -= bcfg.dir * traverseRate(bcfg) * travelledAtCentre;
      }
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
    // ⚠ PRIMARY ONLY. Five islands arming five caps on one ceiling would let
    // the first to leave the frame release a cap four others still want.
    if (tv && primary) {
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
    } else if (laneDriven.current) {
      // Edge only (never per frame): the band left the traverse's range, so
      // hand the gate back to the shipped half-plane and the shipped floors
      // rather than leaving it parked wherever the copy last was.
      laneDriven.current = false;
      u.uCopyLaneC.value = rect.copyEdge + COPY_EDGE_PAD - COPY_LANE_OPEN_W;
      u.uCopyLaneW.value = COPY_LANE_OPEN_W;
      u.uCopySoft.value = COPY_RAMP_SOFT;
      u.uCopyFloor.value = COPY_MASK_FLOOR;
      u.uCopyLineFloor.value = COPY_MASK_FLOOR_LINE;
    }

    if (vpTop + rect.h < -CULL_PAD || vpTop > ih + CULL_PAD) {
      group.visible = false;
      return;
    }
    // ROUND 11 — the LATERAL cull (§5.4b). Every mesh here is
    // `frustumCulled={false}` (which is what makes the rig safe against a
    // stale bounding sphere), so a band that has travelled 1.5 screens
    // off-frame would otherwise keep submitting ~9000 sprites and a
    // 227-segment LineSegments every frame. Two comparisons, no allocation.
    if (lateralPx !== 0) {
      const cxNow = cx + lateralPx;
      if (
        cxNow + rect.w / 2 < -CULL_PAD ||
        cxNow - rect.w / 2 > vw + CULL_PAD
      ) {
        group.visible = false;
        return;
      }
    }
    // ROUND 11 STAGE 1.5 — DRAW ONLY WHAT IS ACTUALLY ON FRAME.
    // `CULL_PAD` (220 px) is hysteresis for the reveal ramp, not a visibility
    // rule: it makes a band "visible" for `h + ih + 2·PAD` = 2.47 vh of scroll
    // against a real on-frame presence of 1.86 vh. With ONE band that costs
    // nothing (nobody is next to it); with a ladder at a 1.12 vh pitch it puts
    // a THIRD band — entirely off screen — into the draw list, i.e. 9 000
    // extra sprites vertex-shaded and clipped, and on the WebGL2 analytic tier
    // that is 9 000 extra `anchorNode()` evaluations for zero pixels.
    //
    // So the extras keep the padded state machine (the ramp stays warm) but
    // are SUBMITTED only while they genuinely intersect the frame. The primary
    // band keeps the shipped expression byte-for-byte — `#production` must not
    // change, and an off-screen band draws nothing either way, so this is a
    // cost fix with no pixel consequence.
    group.visible =
      !strictCull ||
      (vpTop + rect.h > 0 &&
        vpTop < ih &&
        cx + lateralPx + rect.w / 2 > 0 &&
        cx + lateralPx - rect.w / 2 < vw);

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
    scaleGroup.scale.set(wWorld, hWorld, zWorld);

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
    // ⚠ PRIMARY ONLY (round 11 stage 1.5). The decay is a WRITE-BACK to a
    // store slot shared by every island of the band: five islands each damping
    // it once per frame would decay the DOM's bump five times as fast and the
    // packet would die before it reached the fracture. Every island still
    // READS the same targets — only the write-back is owned.
    if (primary && anyPulse) store.setPulse(surfaceKey, decayed);
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
      primary,
      bandId: band,
      /** ROUND 11 STAGE 1.5 QA — GATE 4. The structural fingerprint of this
       * island's constellation. Five islands, five different rows. */
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
      /** ROUND 11 STAGE 1.5 QA — GATE 3. Is this island paying anything right
       * now? `visible` false ⇒ the frame callback returned before the compute
       * dispatch and before the draw (two comparisons, nothing else). */
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
            <primitive object={build.links.object} />
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
 * ROUND 11 STAGE 1.5 — THE ISLAND SEQUENCE.
 *
 * Scene.tsx mounts this component exactly as it always did (`mode` + `anchorId`,
 * zero lines changed there). What it renders is now a LADDER: the shipped
 * island on the shipped anchor, plus the extras the traverse config authors.
 *
 * WHY A SEQUENCE AT ALL. Stage 1 pinned one 619 px band inside a 4335 px act,
 * so the net was on frame for 30.9 % of the run and 40.0 % of the act had
 * neither net nor copy on it — measured every 4 px at 1280×720, with one
 * unbroken 1116 px run of black. Coverage is `(bandVh + 1)/runwayVh` and it is
 * arithmetic, not taste: the only ways out are a shorter act, a bigger cloud,
 * or MORE CLOUDS. The first two were priced and rejected (coverage-trilemma
 * dossier §2, §8⑤); this is §8①, and it is also the literal reading of the
 * owner's own sentence — *"si va avanti nella rete e ne appare un'altra."*
 *
 * WHAT IT COSTS, and why it is nearly free:
 *   - an off-frame island returns at the vertical cull, which is ABOVE the
 *     compute dispatch and above every draw — so it costs two comparisons;
 *   - the ladder's pitch guarantees at most TWO are on frame at once, so the
 *     shaded budget is 2 × per-island regardless of how many exist;
 *   - each island has its OWN material and therefore its own uniform-block
 *     budget, and that budget lands exactly where it was: five islands do not
 *     add a block, because nothing is shared between them. (The per-stage
 *     block counts live in ONE place — the BLOCK-COUNT BUDGET note in
 *     `neuralFieldCompute.ts`, measured live on the WebGL2 fallback. The
 *     "12 of 12" this line used to quote was never measured and was wrong;
 *     the load-bearing claim, that islands add nothing, is unaffected.)
 *   - and there is no shader edit anywhere. The seed reaches the GPU only as
 *     the CONTENTS of the plexus tables — `uNodePos` / `uNodeT` and the
 *     endpoint table, which ROUND 12 · STAGE 0B packed into `uEdgePack`
 *     (`uEdgeA` / `uEdgeB` reach the GPU only under the EDGE_PACKED
 *     rollback).
 *
 * `#production` and every non-traversed band take the `extras.length === 0`
 * path and are byte-for-byte the shipped single island.
 */
export function NeuralLattice({
  mode,
  anchorId,
}: {
  mode: LatticeMode;
  anchorId: string;
}) {
  // Only the traversed band has a ladder. Everything else keeps ONE island.
  const traversed = anchorId === "problem";
  const [cfgRev, setCfgRev] = useState(0);
  useEffect(() => {
    // Dev only: `setTraverseConfig` is a console-handle write path, and this
    // is the one subscription in the island tree that turns into a React
    // commit. Production never calls it, so production never subscribes.
    if (process.env.NODE_ENV === "production" || !traversed) return;
    return onTraverseConfigChange(() => setCfgRev((r) => r + 1));
  }, [traversed]);
  const extras = useMemo(
    () => (traversed ? traverseIslands() : []),
    // cfgRev is the live-tuning trigger; traverseIslands() reads the mutable
    // config object, so the dependency is deliberate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [traversed, cfgRev],
  );

  return (
    <>
      <NeuralLatticeIsland
        mode={mode}
        anchorId={anchorId}
        bandId={anchorId}
        primary
        // A lone band keeps the shipped padded visibility; a band with
        // neighbours must not be submitted while it is off screen.
        strictCull={extras.length > 0}
      />
      {extras.map((isl, i) => (
        // Keyed by SEED: a live seed change remounts (and rebuilds) that one
        // island; a live `dy` change is pure CSS and must not.
        <NeuralLatticeIsland
          key={`${i}:${isl.seed}`}
          mode={mode}
          anchorId={`${anchorId}-i${i}`}
          bandId={anchorId}
          plexusSeed={isl.seed}
          // No stone on an extra island ⇒ no silhouette clearance to carve.
          plexusWell={false}
          primary={false}
          strictCull
        />
      ))}
    </>
  );
}
