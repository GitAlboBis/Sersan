"use client";

/**
 * TSL postprocessing rig — the WebGPU-backend counterpart of `PostFX.tsx`.
 *
 * WHY THIS EXISTS
 * ---------------
 * `@react-three/postprocessing` (`EffectComposer` in `PostFX.tsx`) is WebGL-only:
 * its `EffectComposer` constructor and `renderer` field are typed against
 * `WebGLRenderer`, and it calls `WebGLRenderTarget`-specific APIs that the
 * `three/webgpu` `WebGPURenderer` does NOT expose (on either backend). So when
 * the build-time flag `NEXT_PUBLIC_WEBGPU` is ON, `PostFX.tsx` is gated OUT in
 * `Scene.tsx` and the signature line gets NO bloom — it renders as a flat,
 * un-glowing tube. This component restores the cinematic grade for that path
 * using three's native TSL `PostProcessing` (a.k.a. `RenderPipeline`) class +
 * the `three/addons/tsl/display/*` `bloom` node, plus a hand-rolled vignette and
 * (optional) film grain (no `vignette` export exists in `three/tsl`, and the
 * addon `film`/`chromaticAberration` nodes are deliberately NOT used — see below).
 *
 * WHY NO `chromaticAberration` / `film` ADDON NODES (crash post-mortem)
 * --------------------------------------------------------------------
 * `chromaticAberration(node)` runs `convertToTexture(node)` and then SAMPLES the
 * result at offset UVs (`textureNode.sample(...)`, `textureNode.uvNode || uv()` —
 * see ChromaticAberrationNode.js L78/L111). It is built to wrap a PASS/texture
 * node. We were chaining it on top of an already-composited MATH node
 * (`color.add(bloom)`), which is NOT a texture node, so its internal input
 * resolved to null and the graph crashed at first runtime compile with
 * `THREE.TSL: TypeError: Cannot read properties of null (reading 'build')` inside
 * `generateInput()` (ChromaticAberrationNode.generate → FilmNode → ToneMapping).
 * The build-time `next build` can't catch it because TSL graphs only compile on
 * the first `PostProcessing.render()`. Fix: drop chromatic aberration entirely
 * (also off-brand for a sober AI consultancy) and re-implement grain HAND-ROLLED
 * with no texture sampling. The kept pipeline — scenePass → bloom → vignette →
 * tonemap — only ever feeds `bloom()` a real texture node (the scene-pass output),
 * and the vignette/grain operate on plain composited nodes, so no node receives a
 * null texture input.
 *
 * SELECTIVE BLOOM CONTRACT (preserved 1:1 with the WebGL2 path, "approach A")
 * --------------------------------------------------------------------------
 * The signature line / planet / particle TSL materials output color × emissive
 * ABOVE 1.0 with `toneMapped:false` (see `lineNodeMaterial.ts`), while the navy
 * UI/text live in the DOM behind a transparent canvas and the rest of the scene
 * stays ≤ 1.0. So a luminance-threshold bloom with `threshold ≈ 1.0` blooms ONLY
 * the >1.0 signal — exactly the trick `PostFX.tsx` uses
 * (`Bloom luminanceThreshold={bloomThreshold}`). We feed the scene-pass COLOR
 * target (not an MRT emissive slot) into `bloom(color, strength, radius, threshold)`;
 * the threshold is what makes it selective. No material change, no MRT pass —
 * the navy UI never blooms. (True MRT-emissive selective bloom — BloomNode's
 * "approach B" — would need the materials to write an `emissive` MRT slot; the
 * ports don't, so threshold-on-luminance is the faithful match.)
 *
 * SINGLE RENDER LOOP (FrameDriver/Lenis stays the only RAF)
 * ---------------------------------------------------------
 * R3F's render loop (`update()` in fiber) renders the scene automatically ONLY
 * when `state.internal.priority` is 0 (verified in
 * `@react-three/fiber/dist/events-*.js`: `if (!state.internal.priority && state.gl.render)
 * state.gl.render(state.scene, state.camera)`). Registering ANY `useFrame` with
 * a positive priority flips `internal.priority` truthy, which SUPPRESSES that
 * default render and hands rendering to us. We therefore drive `post.render()`
 * from a single `useFrame(..., 1)`. This adds NO new requestAnimationFrame — it
 * runs inside R3F's existing loop, alongside `FrameDriver`'s priority-0 Lenis
 * pump. On unmount, fiber's `useFrame` cleanup decrements `internal.priority`
 * back to 0, so the default scene render resumes automatically (matters if the
 * budget steps down to `postFx "off"` and this component unmounts).
 *
 * TONE MAPPING (no double-tonemap, no double-AA)
 * ----------------------------------------------
 * R3F's `<Canvas>` (no `flat` prop) sets the renderer to `ACESFilmicToneMapping`
 * by default. `PostProcessing` keeps `outputColorTransform = true`, so its
 * `render()` runs the effect chain in linear/HDR (it temporarily forces the
 * renderer to `NoToneMapping` during the quad render) and then applies the
 * renderer's configured tone mapping + output color space as the FINAL step —
 * reproducing the OFF path's filmic ACES look. Because the auto scene render is
 * suppressed (priority > 0) the scene is tone-mapped exactly once, at the
 * pipeline output. AA: `multisampling` is irrelevant here (the WebGPU path's
 * Canvas requests `antialias:false`); we add no separate AA pass, so there is no
 * double-AA. (FXAA/SMAA could be added later if needed; intentionally omitted.)
 *
 * BUNDLE DISCIPLINE (OFF path never pulls `three/webgpu`)
 * ------------------------------------------------------
 * This module is only ever MOUNTED on the ON path (see the `webgpuEnabled()`
 * guard in `Scene.tsx`), and — mirroring `SignatureLine`/`createRenderer` — it
 * imports `three/webgpu`, `three/tsl` and the addon nodes LAZILY via
 * `import(...)` inside the build effect. The static import graph of this file
 * touches only `react`, `@react-three/fiber`, local stores and the tiny DOM
 * cut-tick driver (components/fx/cut-tick + its CSS module — no three), so
 * even importing the component never drags the heavy node-material build into
 * the OFF bundle.
 *
 * SECTION-CUT WARP (ROUND 5 W4 — igloo composite cut, single-scene hybrid)
 * ------------------------------------------------------------------------
 * research/2026-08-21-igloo-cuts-spec.md §C. Between the home sections named
 * in sectionStore.CUT_BOUNDARY_PAIRS, a scrubbed diagonal seam-sweep band
 * (`uWipe`, 0→1 across ~one viewport of scroll centered on each boundary)
 * applies Igloo's falloff-cascade cut geometry as darkening + band-limited
 * spectral CA + block-displacement uv shove — their two-scene
 * `mix(scene1,scene2,cut)` is unreachable here (no second RT), so the band
 * modulates the single composite instead. All noise is procedural (hash /
 * value noise): zero new textures, zero new bindings (the gpgpu budget walls
 * are untouched — the CA taps re-sample the EXISTING scene-pass texture).
 * The CPU half lives in THIS component's single useFrame (no new loop):
 * boundary doc-fractions are re-derived from sectionStore ONLY on
 * `measureVersion` bumps and remapped there into Lenis-progress space
 * (igloo §A-EXT: window = one viewport of scroll, boundary at the viewport
 * CENTER at uWipe 0.5), with per-boundary caps so short sections can never
 * overlap two windows; per frame it is a crossing scan + nearest-boundary
 * scan + guarded uniform writes, and `uWipe` is written to a hard 0 exactly
 * ONCE when the window is left, so the `If(uWipe > 0.001)` graph branch
 * skips all texture math at rest (same idiom as the burst — idle cost ≈ one
 * guarded branch).
 * ROUND 6-A (owner: the band read as a visible STRIP on the near-black
 * starfield): igloo's darkening masks a REAL two-scene switch, but ours
 * modulates ONE image — on flat near-black pixels the flat 0.30 darkening
 * and the unconditional +0.075 leading-edge lift manufactured a grey/light
 * strip where there is no content. Two independent in-band fixes:
 *   • CONTENT-LUMA MASK — the darkening AND the leading-edge lift are
 *     scaled by mask = smoothstep(uWipeLumaLo 0.02, uWipeLumaHi 0.12,
 *     luma(scene at the shoved uv)), REUSING the one existing scene sample
 *     inside the guarded branch (no extra fetch). Empty space (the star
 *     field sits at ~0.01–0.03 luma) stays untouched; text glow, the
 *     stream, cards and images get the full sweep. The CA taps and the
 *     block shove stay UNMASKED — they are content-dependent and self-mask
 *     on flat pixels.
 *   • VELOCITY-GATED AMPLITUDE — the driver damps `state.amp` toward
 *     min(|lenis velocity| / ampVelNorm, 1) (λ 6 rising / λ 3 falling ⇒
 *     assembles fast, dissolves in ~0.3–0.5 s once you stop) and mirrors it
 *     to `uWipeAmp`, which multiplies ALL band terms (shove, darkening, CA,
 *     lift). The band exists only while actually scrubbing; parking
 *     mid-window fades it out completely — the honest native-scroll answer
 *     to igloo's autoCenter (deliberately not shipped). Once the amp
 *     settles below 0.001 the driver ALSO hard-zeros uWipe (write-once), so
 *     the guarded branch skips while parked mid-window. uWipe itself stays
 *     scrubbed (recomputed from progress on resume): geometry unchanged —
 *     only the amplitude gates. The crossing spike is untouched (it rides
 *     its own envelope).
 * The crossing detector is the prevP/p STRADDLE of a
 * boundary (jump-proof: a same-frame End/Home/anchor jump across one or
 * more cuts fires exactly once, for the boundary nearest the landing
 * point). At the crossing instant it fires:
 *   • the uWarpBurst SPIKE — the existing burst uniform GENERALIZED as a
 *     velocity-scaled crossing spike `min(1, 0.35 + 0.65·|vel|/velNorm)`
 *     riding a 0.5 s linear-in / 0.4 s linear-out envelope (igloo's power1
 *     pair IS linear), max()-merged with the passage's seqStore envelope
 *     (whichever source dominates also contributes its seed trio; fresh
 *     random seeds per crossing, intensity 1.0 scrolling up / 0.5 forward).
 *     Level "full" only.
 *   • the DOM `.cut-tick` 140 ms heading micro-glitch on the two adjacent
 *     sections (components/fx/cut-tick — compositor-only, RM-guarded in its
 *     CSS module, blue/cyan only).
 * Level "lite" keeps the darkening + CA and drops the block displacement
 * (one noise fetch fewer) + the spike. Dev/preview handle:
 * `window.__sersanSectionCuts` = { params, state, uniforms } for live tuning.
 *
 * BUDGET / REDUCED-MOTION GATING (mobile-parity plan, Phase 2)
 * ------------------------------------------------------------
 * Mounted whenever `fxBudget.postFx !== "off"` (identical to how `PostFX.tsx`
 * is gated in `Scene.tsx`) and told which profile to build via the `level` prop:
 *
 *   level "full" — desktop tier "full" (budget level 3): exactly the chain
 *                  described above, unchanged.
 *   level "lite" — capable phone (budget level 2, `tier lite` + coarse +
 *                  `phoneGL`): the SAME graph — scenePass → selective bloom →
 *                  vignette → tonemap — with the two optional layers omitted:
 *                  no film grain (the `noiseOpacity` knob is masked to 0 for the
 *                  build, so the grain node is never added; fxStore itself is
 *                  NOT mutated) and no pointer fluid (already fine-pointer-only,
 *                  and additionally forced off by the level so a dev
 *                  `?postfx=lite` on a desktop is honest about the profile).
 *                  Bloom uniforms (strength/radius/threshold) and the vignette
 *                  are byte-identical to "full".
 *
 * WHY "lite" IS NOT A CHEAPER BLOOM: three's `BloomNode` (`three/addons/tsl/
 * display/BloomNode.js`) has NO cost knob — `_nMips = 5` is private and fixed,
 * and its render targets are re-derived every frame from
 * `renderer.getDrawingBufferSize()`. `strength/radius/threshold` are compositing
 * uniforms, not fill levers. So the ONLY fill lever on this rig is the DPR:
 * coarse pointers already run at DPR 1.0 (tierStore.detectDprRange), which
 * shrinks every bloom mip with the drawing buffer. Do NOT reach for
 * `PassNode.setResolutionScale` here (it would soften the whole scene) and do
 * not touch the bloom threshold (it is the selective-bloom contract). A true
 * 3–4-mip bloom would be a BloomNode subclass — new work, tracked in the plan,
 * only if the Phase 6 device gate fails.
 *
 * `prefers-reduced-motion` resolves to tier `"off"` (budget level 0, postFx
 * "off"), so `CanvasHost` renders nothing and this never mounts: the
 * reduced-motion site is fully static with no animated grain by construction.
 * The premium base is Bloom + Vignette + ToneMapping (always on whenever this
 * mounts); a whisper of hand-rolled film grain is layered on top at level
 * "full" only, mapped off the existing `noiseOpacity` knob, and is the only
 * "extra" — it is omitted automatically when that knob is 0 or the level is
 * "lite". The level is DECIDED AT MOUNT (the graph is built once per renderer);
 * a budget step-down flips `postFx` to "off" and unmounts the rig instead.
 *
 * DEV / PREVIEW HANDLE: while mounted, `window.__sersanPostFx = { rig: "nodes",
 * level }` (same predicate as the `?fx= ?postfx=` overrides — dev builds or a
 * Vercel preview host), removed on unmount. Lets QA assert which rig/profile is
 * live without reading the frame.
 */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFxStore } from "./store/fxStore";
import { routeFx, HOME_FX } from "./store/routeFxStore";
import { usePointerStore } from "./store/pointerStore";
import { useSeqStore } from "./store/seqStore";
import { useScrollStore } from "./store/scrollStore";
import { useIntroStore } from "./store/introStore";
import {
  CUT_BOUNDARY_PAIRS,
  CUT_BOUNDARY_ROUTE,
  MAX_CUT_BOUNDARIES,
  SECTION_CUTS,
  deriveCutBoundaries,
  deriveSectionCuts,
  useSectionStore,
} from "./store/sectionStore";
import { useCutStore } from "./store/cutStore";
import {
  bump,
  createCutEdgeState,
  stepCutEdges,
  wipeU,
  type CutEdgeState,
  stepToward,
} from "@/lib/cut-edge";
import { devOverridesAllowed, type FxBudget } from "./store/tierStore";
import { createPointerFlowmap, type PointerFlowmap } from "./fluid/PointerFlowmap";
import { fireCutTick } from "@/components/fx/cut-tick";

/** The two profiles this rig can build — `fxBudget.postFx` minus "off". */
type PostFxLevel = Exclude<FxBudget["postFx"], "off">;

/**
 * Minimal structural shapes for the lazily-imported TSL objects. We never import
 * `three/webgpu` types at module scope (that would risk pulling the heavy build
 * type-graph into the OFF path); these describe just the fields we touch.
 */
interface UniformNode {
  value: number;
}
interface BloomNodeLike {
  strength: UniformNode;
  radius: UniformNode;
  threshold: UniformNode;
}
interface PostProcessingLike {
  outputNode: unknown;
  outputColorTransform: boolean;
  needsUpdate: boolean;
  render: () => void;
  dispose: () => void;
}

/**
 * Resolve the effective bloom knobs exactly like `PostFX.tsx`: the per-route
 * tone (`routeFx`) is used unless a dev has tuned the fxStore value off its
 * default (then the leva/console override wins). Mirrors `PostFX.tsx` verbatim
 * so the two backends read the same numbers for the same route.
 */
function resolveBloom(pathname: string) {
  const s = useFxStore.getState();
  const route = routeFx(pathname);
  const intensity =
    s.bloomIntensity === HOME_FX.bloomIntensity ? route.bloomIntensity : s.bloomIntensity;
  const threshold =
    s.bloomThreshold === HOME_FX.bloomThreshold ? route.bloomThreshold : s.bloomThreshold;
  const radius =
    s.bloomRadius === HOME_FX.bloomRadius ? route.bloomRadius : s.bloomRadius;
  return { intensity, threshold, radius };
}

// === ROUND 5 W4 — section-cut wipe: CPU driver state (module scope so the
// useRef initializers never allocate per render; lazy `??=` in the loop) ====

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * TASK 6 — SECTION TRANSITIONS à la igloo.inc (scratchpad dossier
 * section-transitions.md §3.3/§3.4). `true` selects the v2 "drift-cut"
 * driver: boundaries from sectionStore.SECTION_CUTS at the measured CONTENT
 * edge, window = `windowVh` viewports of scroll, CONSTANT amplitude (no
 * velocity gate), the accent SCRUBBED (`uWarpBurst = spike·bump(u)`), the
 * .cut-tick fired from a hysteresis-armed edge detector (lib/cut-edge) that
 * ignores programmatic jumps (scrollStore.teleport), reverse = mirror (no
 * per-frame shove sign flip, no seedZ doubling), and the camera drift
 * published on cutStore for SignatureLine. `false` = the ROUND 6-A
 * velocity-gated driver below, kept selectable on purpose — AND the graph
 * is built with the legacy look (shove ×1, no frost jitter, no edge glow:
 * the three v2 shader terms are JS-branched at graph build on this same
 * constant, so the rendered output matches the pre-TASK-6 chain; the
 * `style/edgeGlow/frost` uniforms exist in both modes but are inert when
 * `false`). Zero new uniforms either way.
 */
const CUTS_V2: boolean = true;

/**
 * TASK C (2026-08-27) — "no visible line, always perceivable" (owner, with a
 * WebGPU screenshot of the work→services seam: the cyan edge line must go,
 * and a fast scroll must still show the transition). All CUTS_V2-only;
 * every constant keeps the pre-TASK-C value reachable in its comment.
 */
/** Navy-visible cyan edge-glow gain (the one term painted OUTSIDE the
 *  content-luma mask). 0 = no line over flat navy. Pre-TASK-C: 0.18. Live:
 *  `__sersanSectionCuts.uniforms.current.edgeGlow.value = 0.18`. */
const CUT_EDGE_GLOW_DEFAULT = 0;
/** Flat leading-edge LIFT (`edge·lift`, luma-masked). The lattice haze
 *  behind the seam gaps sits at luma ≈ 0.11 — INSIDE the content mask
 *  (lumaHi 0.12) — so this term still drew a whitish ridge (+11/255,
 *  TASK-C probe r2) over "navy" with the glow off. 0 = no ridge; the
 *  chroma boost `(base − luma)·edge·0.35` stays (zero on grey/navy).
 *  Pre-TASK-C: 0.075. Live: `uniforms.current.edgeLift.value = 0.075`. */
const CUT_EDGE_LIFT_DEFAULT = 0;
/** Multiplier on the band's CONTENT terms (block uv shove X/Y + 3-tap CA)
 *  so a card / the line crossing the seam visibly displaces and splits
 *  (igloo: displacement 0.025 of the frame + 5-tap CA modulator 12; ours
 *  was 0.006/0.012 + 0.12). 1 = pre-TASK-C. All three stay luma-safe (a uv
 *  shove / CA on flat pixels resamples identical pixels → self-masked). */
const CUT_BAND_GAIN = 2.5;
/** Falloff margin of the block-displacement band (igloo `0.9`): larger =
 *  wider band core in which blocks are displaced. Pre-TASK-C: 0.9. */
const CUT_TECH_MARGIN = 1.3;
/** Fade the block shove out over u ∈ [0.8, 1]: at u → 1 the displacement
 *  field saturates to 1 for EVERY pixel (a whole-frame uv shift that the
 *  exit hard-zero then snapped away — 11 px at the old gain, 27 px at
 *  ×2.5). `false` = pre-TASK-C (no fade). Symmetric in u → still a mirror. */
const CUT_SHOVE_TAIL_FADE = true;
/** MIN CYCLE — the DISPLAYED scrub (uniform + cutStore.live.u + accent)
 *  follows the position-law target through a rate limiter
 *  |du/dt| ≤ 1/CUT_MIN_CYCLE_S, so a flick that crosses a window in 100 ms
 *  still sweeps for ≥ 0.45 s and completes on its own after the seam passed
 *  (igloo-like lag); reverse mid-cycle reverses; at reading pace the limiter
 *  is inactive (display ≡ position law, probe law unchanged). The tick and
 *  the window ENTRY/EXIT logic stay on the TRUE position; the band only
 *  keeps `activeIdx` until its sweep lands on 0 / 1. `false` = pre-TASK-C
 *  (display ≡ position law, exit clears immediately). Live: `params.minCycleS`
 *  (0 = off). */
const CUT_MIN_CYCLE_ON = true;
const CUT_MIN_CYCLE_S = 0.45;

/** Deterministic per-boundary hash for the band seeds (spec §C:
 *  `hash(i)·25.424` / `hash(i)·64.453`, written once per window entry). */
const hash01 = (i: number): number => {
  const s = Math.sin((i + 1) * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

/** Hoisted section-cut driver state — typed arrays sized once, refilled in
 *  place on `measureVersion` bumps only. Zero per-frame allocation. */
interface CutDriverState {
  /** sectionStore.measureVersion the cuts were derived from (−1 = never). */
  version: number;
  /** Wired boundary count for the current measurement. */
  count: number;
  /** Boundary positions in LENIS-PROGRESS space, document order.
   *  `deriveCutBoundaries` fills DOC fractions; the driver remaps in place
   *  (measure cadence): cutP = (cutDoc·scrollHeight − innerHeight/2) /
   *  (scrollHeight − innerHeight), so `progress === cuts[i]` ⇔ the DOM
   *  boundary sits at the viewport CENTER (igloo §A-EXT; raw progress runs
   *  over scrollHeight − innerHeight, so comparing it against doc fractions
   *  directly would skew every window toward the document edges). */
  cuts: Float64Array;
  /** Index into CUT_BOUNDARY_PAIRS per wired boundary. */
  pairIdx: Int32Array;
  /** Half-window h = 0.5·innerHeight/(scrollHeight − innerHeight) (progress
   *  fraction) — Igloo's one-viewport scrub span (boundary enters at the
   *  viewport bottom at cut − h, exits at the top at cut + h), re-derived
   *  with the cuts. */
  halfWindow: number;
  /** Per-boundary window cap: half the progress-distance to the nearest
   *  OTHER boundary, so neighbouring windows can never overlap (short
   *  sections) — the nearest-boundary pick can then never flip mid-band,
   *  which would re-seed the block pattern and jump uWipe discontinuously.
   *  Infinity for a lone boundary. */
  maxH: Float64Array;
  /** Boundary whose window the scroll sits inside (−1 = none). */
  activeIdx: number;
  /** ROUND 6-A — damped velocity-gated band amplitude (0..1), mirrored to
   *  `uWipeAmp` while a window is active. 0 while parked (settled),
   *  exited, disarmed or re-measured. */
  amp: number;
  /** Previous frame's scroll progress (NaN = disarmed sentinel — set on
   *  mount, re-measure, route exit and kill-switch). The crossing detector
   *  is the prevP/p STRADDLE of a boundary, so a same-frame End/Home/anchor
   *  jump across a cut still fires exactly once even when neither frame is
   *  inside the boundary's window. */
  prevP: number;
  // --- TASK 6 (CUTS_V2) fields — untouched by the legacy path ------------
  /** Per-seam half-window (progress units): windowVh·iH/2/limit·windowScale,
   *  capped by maxH. */
  h: Float64Array;
  /** Hysteresis-armed edge detector state (lib/cut-edge). */
  edge: CutEdgeState;
  /** SECTION_CUTS index of the active window (−1 none) — survives a
   *  re-measure so P7 never re-seeds / pops the band mid-window. */
  activePair: number;
  /** Last frame direction with motion (1 down, −1 up). */
  dir: 1 | -1;
  /** Direction LATCHED at window entry — published to cutStore so the roll
   *  sign is fixed for the whole traversal (reverse mid-window = mirror). */
  entryDir: 1 | -1;
  /** Scrubbed accent value this frame: cfg.spike·bump(u). */
  burst: number;
  /** Accent seeds, re-rolled once per window entry. */
  burstSeedX: number;
  burstSeedY: number;
  /** TASK C — the DISPLAYED scrub (rate-limited follow of the position law;
   *  see CUT_MIN_CYCLE_ON). What `uWipe`, cutStore.live.u and the accent
   *  actually show. 0 outside every window. */
  uDisplay: number;
  /** TASK C — boundary index the edge detector fired THIS frame (−1 none).
   *  Lets a straddle that jumped over a whole window between two frames
   *  (violent fling / low fps) still open its min-cycle sweep. */
  lastFired: number;
}
const makeCutState = (): CutDriverState => ({
  version: -1,
  count: 0,
  cuts: new Float64Array(MAX_CUT_BOUNDARIES),
  pairIdx: new Int32Array(MAX_CUT_BOUNDARIES),
  halfWindow: 0,
  maxH: new Float64Array(MAX_CUT_BOUNDARIES),
  activeIdx: -1,
  amp: 0,
  prevP: Number.NaN,
  h: new Float64Array(MAX_CUT_BOUNDARIES),
  edge: createCutEdgeState(MAX_CUT_BOUNDARIES),
  activePair: -1,
  dir: 1,
  entryDir: 1,
  burst: 0,
  burstSeedX: 0,
  burstSeedY: 0,
  uDisplay: 0,
  lastFired: -1,
});

/** Live-tunable CPU knobs, exposed on `window.__sersanSectionCuts.params`
 *  (dev/preview only). Read per frame as plain property loads. */
interface CutParams {
  enabled: boolean;
  /** Multiplies the one-viewport half-window (band scrub length). */
  windowScale: number;
  /** Master switch for the crossing burst spike (level "full" only). */
  spike: boolean;
  /** Spike floor (spec: 0.35). */
  spikeBase: number;
  /** Velocity gain on top of the floor (spec: 0.65). */
  spikeVelGain: number;
  /** |lenis velocity| (px/frame-ish) that maps to a full-strength spike —
   *  the normalizer for the spec's 0..1 `scrollVelocity`. */
  velNorm: number;
  /** ROUND 6-A — |lenis velocity| that maps to full BAND amplitude (the
   *  velocity gate's normalizer; same scale/default as velNorm). */
  ampVelNorm: number;
  /** ROUND 6-A — amp damping λ while rising (fast assemble, τ ≈ 0.17 s). */
  ampLambdaUp: number;
  /** ROUND 6-A — amp damping λ while falling (band dissolves in ~0.3–0.5 s
   *  once you stop scrubbing). */
  ampLambdaDown: number;
  /** Master switch for the DOM .cut-tick heading micro-glitch. */
  tick: boolean;
  /** TASK 6 (CUTS_V2) — master multiplier on every seam's `amp` (0 = band off). */
  ampScale: number;
  /** TASK 6 (CUTS_V2) — the accent's block-glitch intensity (igloo seed.z);
   *  ONE constant both directions (reverse = mirror). */
  spikeSeedZ: number;
  /** TASK 6 (CUTS_V2) — master multiplier on cutStore dolly/roll (0 = no drift). */
  driftScale: number;
  /** TASK C — min sweep duration in seconds for the displayed scrub
   *  (|du/dt| ≤ 1/minCycleS); 0 = limiter off (display ≡ position law). */
  minCycleS: number;
}
const makeCutParams = (): CutParams => ({
  enabled: true,
  windowScale: 1,
  spike: true,
  spikeBase: 0.35,
  spikeVelGain: 0.65,
  velNorm: 50,
  ampVelNorm: 50,
  ampLambdaUp: 6,
  ampLambdaDown: 3,
  tick: true,
  ampScale: 1,
  spikeSeedZ: 0.75,
  driftScale: 1,
  minCycleS: CUT_MIN_CYCLE_ON ? CUT_MIN_CYCLE_S : 0,
});

/** Crossing-spike envelope (0.5 s linear in / 0.4 s linear out — igloo's
 *  power1 pair) advanced with wall-clock delta in the frame loop. */
interface SpikeState {
  peak: number;
  t: number;
  seedX: number;
  seedY: number;
  seedZ: number;
}
const makeSpikeState = (): SpikeState => ({
  peak: 0,
  t: 0,
  seedX: 0,
  seedY: 0,
  seedZ: 1,
});

/** The wipe uniform set (built with the graph). shove/dark/ca and the
 *  round 6-A lumaLo/lumaHi mask bounds are tuning uniforms written only from
 *  the dev handle — never per frame. The driver's only PER-FRAME writes are
 *  `wipe` (the scrub) and `amp` (the round 6-A velocity gate); dir + the
 *  seeds are event-cadence writes (direction flips / window entry). */
interface WipeUniforms {
  wipe: UniformNode;
  dir: UniformNode;
  seedX: UniformNode;
  seedY: UniformNode;
  shoveX: UniformNode;
  shoveY: UniformNode;
  dark: UniformNode;
  ca: UniformNode;
  amp: UniformNode;
  lumaLo: UniformNode;
  lumaHi: UniformNode;
  /** TASK 6 — 0 frost / 1 tech (shove ×0.6 → ×1.5, frost jitter off at 1). */
  style: UniformNode;
  /** TASK 6 — navy-visible cyan edge glow gain (outside the luma mask). */
  edgeGlow: UniformNode;
  /** TASK 6 — frost uv jitter amplitude (uv units) at style 0. */
  frost: UniformNode;
  /** TASK C — flat leading-edge lift gain (luma-masked; 0 = no ridge). */
  edgeLift: UniformNode;
}

/** Ignition ramp length (s) — handoff refactor 2026-08-28: how long the frame
 *  takes to come up from the near-black floor (×0.14) to full exposure after
 *  introComplete. Sized to bracket the overlay's 0.7s crossfade and hand into
 *  the wordmark's 3.6s assembly — Arago's 0→6 light ramp compressed to our
 *  tempo. */
const IGNITE_S = 2.0;

export function PostFXNodes({
  pathname = "/",
  level,
}: {
  pathname?: string;
  /** Budget profile to build — see the header ("BUDGET / REDUCED-MOTION
   *  GATING"). Decided at mount: the graph is built once per renderer. */
  level: PostFxLevel;
}) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  // The live PostProcessing object + the bloom node, kept in refs so the
  // per-frame render and the route-change effect can reach them without
  // re-running the (expensive) build effect. `null` until the lazy chunk lands.
  const postRef = useRef<PostProcessingLike | null>(null);
  const bloomRef = useRef<BloomNodeLike | null>(null);
  // C2 — warp-burst uniforms (round 3 §C, igloo ring-passage pass) + the
  // damped spike the per-frame reader integrates (seqStore.burst is the GSAP
  // envelope; this ref is the post-side smoothing the spec asks for).
  const burstRef = useRef<{
    burst: UniformNode;
    seedX: UniformNode;
    seedY: UniformNode;
    seedZ: UniformNode;
  } | null>(null);
  const burstDampedRef = useRef(0);
  // Ignition ramp (handoff refactor 2026-08-28, Arago's lights-up beat): the
  // whole composited frame is lifted from near-black to full exposure over
  // ~2s on the introComplete edge. The uniform is built at 1 (no-op) unless
  // the preloader curtain is still up at graph-build time; the clock ref
  // drives the one-shot ease in the frame loop below.
  const igniteRef = useRef<UniformNode | null>(null);
  const igniteClockRef = useRef(0);
  // W4 — section-cut wipe uniforms (built with the graph) + the CPU driver's
  // hoisted state. State/params/spike are lazy-init (`??=`) so the useRef
  // initializers stay allocation-free across re-renders.
  const wipeRef = useRef<WipeUniforms | null>(null);
  const cutStateRef = useRef<CutDriverState | null>(null);
  const cutParamsRef = useRef<CutParams | null>(null);
  const spikeRef = useRef<SpikeState | null>(null);
  // TASK 6 — the edge detector's fire callback, created once (allocation-free
  // per frame); reads the state/params refs so it never goes stale.
  const fireRef = useRef<((i: number, dir: 1 | -1) => void) | null>(null);
  // The pointer fluid flowmap (WebGPU-only). Null when disabled (coarse pointer
  // / reduced-motion / level "lite") or before the lazy build lands.
  const flowRef = useRef<PointerFlowmap | null>(null);
  // Resolve the fluid gate ONCE (matches custom-cursor.tsx / pointerStore): no
  // fluid on coarse pointers, under prefers-reduced-motion, or at level "lite".
  // On a real phone the coarse-pointer clause already excludes it; the level
  // clause only matters for a dev `?postfx=lite` on a fine pointer.
  const fluidEnabledRef = useRef(false);
  // The level the graph was BUILT with (mount-time). Read by the build effect,
  // whose deps are [gl, scene, camera] on purpose (see below).
  const levelRef = useRef(level);
  levelRef.current = level;

  // Dev/preview-only QA handle (same predicate as the `?fx= ?postfx=` URL
  // overrides and `window.__sersanTier`): announces which rig + profile is
  // live, removed on unmount. Never on the real domain.
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !(process.env.NODE_ENV !== "production" || devOverridesAllowed())
    ) {
      return;
    }
    const w = window as unknown as Record<string, unknown>;
    w.__sersanPostFx = { rig: "nodes", level };
    // W4 — section-cut live-tuning handle (same neural-handles idiom): CPU
    // knobs are plain mutable fields (incl. the round 6-A amp envelope:
    // ampVelNorm / ampLambdaUp / ampLambdaDown); `uniforms.current.*.value`
    // reaches the GL band amplitudes (shove/dark/ca) and the round 6-A
    // content-luma mask bounds (lumaLo/lumaHi) directly from the console.
    w.__sersanSectionCuts = {
      params: (cutParamsRef.current ??= makeCutParams()),
      state: (cutStateRef.current ??= makeCutState()),
      uniforms: wipeRef,
    };
    return () => {
      delete w.__sersanPostFx;
      delete w.__sersanSectionCuts;
    };
  }, [level]);
  // The LIVE pathname, reachable from the async build. Assigned during render
  // (no effect): it is only ever read from async/frame callbacks, never during
  // render, so there is no tearing concern. The build effect's deps are
  // [gl, scene, camera] — stable across client-side routing — so its `pathname`
  // closure is frozen at mount and cannot be trusted once the graph lands.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Build the node graph once (per renderer). All `three/webgpu` + `three/tsl`
  // imports are lazy here, so the OFF build never bundles them.
  useEffect(() => {
    let cancelled = false;
    let built: PostProcessingLike | null = null;

    // The profile is decided at mount (graph built once per renderer).
    const lite = levelRef.current === "lite";

    // Resolve the fluid gate once (no listener; the pointer listener lives in
    // FrameDriver/pointerStore). Coarse-pointer + reduced-motion + level "lite"
    // → no fluid. At level "full" this is byte-identical to before.
    fluidEnabledRef.current =
      !lite &&
      typeof window !== "undefined" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !window.matchMedia("(pointer: coarse)").matches;

    void (async () => {
      const [webgpu, tsl, { bloom }] = await Promise.all([
        import("three/webgpu"),
        import("three/tsl"),
        import("three/addons/tsl/display/BloomNode.js"),
      ]);
      if (cancelled) return;
      const { PostProcessing } = webgpu;

      // Loosely-typed views of the TSL helpers we use. The real `three/tsl`
      // types are extremely generic (every node is `Node` with a vast fluent
      // surface); narrowing them here to the exact shapes we touch keeps the
      // chain readable and lets `float()` satisfy the addon `Node` params. All
      // calls below are runtime-verified against the installed build.
      type TslNode = {
        add: (n: TslNode | number) => TslNode;
        sub: (n: TslNode | number) => TslNode;
        mul: (n: TslNode | number) => TslNode;
        div: (n: TslNode | number) => TslNode;
        oneMinus: () => TslNode;
        abs: () => TslNode;
        greaterThan: (n: TslNode | number) => TslNode;
        toVar: () => TslNode & { assign: (n: TslNode) => void };
        rg: TslNode;
        rgb: TslNode;
        r: TslNode;
        b: TslNode;
        x: TslNode;
        y: TslNode;
      };
      // The scene-pass texture node is a PassTextureNode (extends TextureNode):
      // `.sample(uvNode)` clones it sampling at a different UV — the supported
      // way to read the scene at an offset UV (verified: TextureNode.sample,
      // three.webgpu.js L12730). Plain color use stays a TslNode.
      type ScenePassTextureNode = TslNode & {
        sample: (uvNode: TslNode) => TslNode;
      };
      const {
        pass,
        screenUV,
        uv,
        vec2,
        vec3,
        vec4,
        smoothstep,
        clamp,
        mix,
        float,
        sin,
        cos,
        atan,
        length,
        floor,
        fract,
        dot,
        time,
        uniform,
        Fn,
        If,
        screenSize,
      } = tsl as unknown as {
        pass: (
          scene: unknown,
          camera: unknown,
        ) => { getTextureNode: (name?: string) => ScenePassTextureNode };
        screenUV: { distance: (p: TslNode) => TslNode; add: (n: TslNode) => TslNode };
        uv: () => TslNode;
        vec2: (x: TslNode | number, y: TslNode | number) => TslNode;
        vec3: (
          x: TslNode | number,
          y?: TslNode | number,
          z?: TslNode | number,
        ) => TslNode;
        vec4: (
          x: TslNode | number,
          y: TslNode | number,
          z?: TslNode | number,
          w?: TslNode | number,
        ) => TslNode;
        smoothstep: (
          a: TslNode | number,
          b: TslNode | number,
          x: TslNode,
        ) => TslNode;
        clamp: (x: TslNode, lo: number, hi: number) => TslNode;
        mix: (a: TslNode, b: TslNode, t: TslNode) => TslNode;
        float: (v: number) => TslNode;
        sin: (n: TslNode) => TslNode;
        cos: (n: TslNode) => TslNode;
        atan: (y: TslNode, x: TslNode) => TslNode;
        length: (n: TslNode) => TslNode;
        floor: (n: TslNode) => TslNode;
        fract: (n: TslNode) => TslNode;
        dot: (a: TslNode, b: TslNode) => TslNode;
        time: TslNode;
        uniform: (v: number) => TslNode & { value: number };
        Fn: (fn: () => TslNode) => () => TslNode;
        If: (cond: TslNode, fn: () => void) => unknown;
        screenSize: TslNode;
      };

      const { intensity, threshold, radius } = resolveBloom(pathname);
      const fx = useFxStore.getState();
      // Level "lite" masks the grain knob to 0 for THIS BUILD ONLY (the grain
      // node below is omitted when it is 0). fxStore is deliberately NOT
      // mutated: the knob keeps its value for the leva/console panel and for a
      // future "full" mount. Level "full" reads the live knob, as before.
      const noiseOpacity = lite ? 0 : fx.noiseOpacity;

      // --- Scene render → color target ---------------------------------------
      const scenePass = pass(scene, camera);
      const color = scenePass.getTextureNode("output");

      // 0) POINTER FLUID (WebGPU-only liquid-glass refraction). Build the
      //    flowmap rig (offscreen ping-pong RT + splat/fade quad) and offset the
      //    SCENE SAMPLE UV by `flow.rg * uStrength` BEFORE bloom, so the disturbed
      //    line still blooms. uStrength is TINY (~0.006) → a premium breath, not a
      //    warp. Gated: only when the fluid is enabled (fine pointer, no RM, level
      //    "full"). When disabled we sample the scene at the unmodified UV
      //    (identical to before).
      let baseUv: TslNode = uv();
      if (fluidEnabledRef.current) {
        const flow = createPointerFlowmap(
          gl as never,
          webgpu as never,
          tsl as never,
        );
        flowRef.current = flow;
        // Offset the scene-pass sample UV. `flowTexNode.rg` is the velocity field;
        // `uStrength` scales it to a fraction of a screen. `.sample(uv)` returns a
        // fresh textured color node — still a real texture node, so bloom() below
        // receives a valid texture input (no null-input crash).
        const flowVec = (flow.flowTexNode as unknown as TslNode).rg.mul(
          flow.uStrength as unknown as TslNode,
        );
        baseUv = baseUv.add(flowVec);
      }

      // 0b) WARP-BURST UV (round 3 §C2 — igloo's ring-passage pass, TSL port;
      //     inserted AFTER the flowmap refraction, BEFORE bloom). The angular
      //     smear (sample angle rotated by (noise − 0.5)·0.3·burst around the
      //     aspect-corrected screen centre) + the coarse block glitch (cell
      //     hash · 0.01 · seed.z · burst — the procedural stand-in for their
      //     tScroll squares) both live behind a REAL `If(uWarpBurst > 0.001)`
      //     on a uniform (uniform control flow — implicit-LOD sampling stays
      //     legal), so the idle frame's uv path is the untouched base uv and
      //     the polar round-trip costs nothing at burst 0. The seed trio is
      //     re-rolled per burst at FIRE time by the passage (never per frame).
      const uWarpBurst = uniform(0);
      const uBurstSeedX = uniform(0);
      const uBurstSeedY = uniform(0);
      const uBurstSeedZ = uniform(1);
      burstRef.current = {
        burst: uWarpBurst,
        seedX: uBurstSeedX,
        seedY: uBurstSeedY,
        seedZ: uBurstSeedZ,
      };
      const aspect = (screenSize as TslNode).x.div((screenSize as TslNode).y);

      // 0c) W4 — SECTION-CUT WIPE, GL half (round 5; igloo composite cut →
      //     single-scene hybrid, research/2026-08-21-igloo-cuts-spec.md §C —
      //     see the SECTION-CUT WARP header note). This block declares the
      //     wipe uniforms + the shared field helpers and applies the
      //     PRE-SAMPLE half (the block-displacement uv shove) BEFORE the
      //     burst block; the post-composite half (darkening / spectral CA /
      //     edge lift) lives in `wipeGrade` further down. Everything sits
      //     behind `If(uWipe > 0.001)` on a uniform (uniform control flow —
      //     implicit-LOD sampling stays legal on the WebGL2 fallback), so
      //     the idle frame costs one guarded branch. The seam slope is the
      //     igloo constant −0.2·aspect computed IN-GRAPH (the spec's
      //     uWipeSlope uniform is dropped: same value, no resize listener,
      //     cannot go stale); since the slope is always negative, igloo's
      //     `mix(1−uv.x+wob, uv.x+wob, step(slope,0))` statically resolves
      //     to the `uv.x + wob` branch. shove/dark/ca amplitudes are tuning
      //     uniforms written only from the dev handle, never per frame.
      //     ROUND 6-A adds uWipeAmp — the driver's velocity-gated amplitude,
      //     the ONE extra per-frame-written uniform, multiplying EVERY band
      //     term (shove here, darkening/CA/lift in wipeGrade) — and the
      //     tuning-only uWipeLumaLo/Hi content-luma mask bounds (see the
      //     SECTION-CUT WARP header note).
      const uWipe = uniform(0);
      const uWipeDir = uniform(1);
      const uWipeSeedX = uniform(0);
      const uWipeSeedY = uniform(0);
      // TASK C — content terms ×CUT_BAND_GAIN on the v2 path (pre-TASK-C:
      // 0.006 / 0.012 / 0.12).
      const bandGain = CUTS_V2 ? CUT_BAND_GAIN : 1;
      const uWipeShoveX = uniform(0.006 * bandGain);
      const uWipeShoveY = uniform(0.012 * bandGain);
      const uWipeDark = uniform(0.3);
      const uWipeCA = uniform(0.12 * bandGain);
      const uWipeAmp = uniform(0);
      const uWipeLumaLo = uniform(0.02);
      const uWipeLumaHi = uniform(0.12);
      // TASK 6 — per-seam style (written once per window entry by the v2
      // driver) + two tuning uniforms. The edge glow paints OUTSIDE the luma
      // mask so the seam exists over empty navy (the single-scene band has
      // to carry its own contrast — igloo's is visible because two scenes
      // differ); peak luma 0.18·luma(0.23,0.88,1.0) ≈ 0.13 ≪ the bloom
      // threshold 1.0. The frost jitter is igloo's tFrost idiom on the
      // existing vnoise — zero new textures, both backends.
      // Legacy default when CUTS_V2 = false: both tuning terms 0 → the graph
      // renders the ROUND 6-A look (see the CUTS_V2 doc comment).
      const uWipeStyle = uniform(0);
      // TASK C — edge glow OFF by default (CUT_EDGE_GLOW_DEFAULT 0, was 0.18):
      // the uniform stays so the owner can re-enable it live.
      const uWipeEdgeGlow = uniform(CUTS_V2 ? CUT_EDGE_GLOW_DEFAULT : 0);
      const uWipeFrost = uniform(CUTS_V2 ? 0.004 : 0);
      // TASK C — legacy graph keeps the constant 0.075 lift.
      const uWipeEdgeLift = uniform(CUTS_V2 ? CUT_EDGE_LIFT_DEFAULT : 0.075);
      wipeRef.current = {
        edgeLift: uWipeEdgeLift,
        wipe: uWipe,
        dir: uWipeDir,
        seedX: uWipeSeedX,
        seedY: uWipeSeedY,
        shoveX: uWipeShoveX,
        shoveY: uWipeShoveY,
        dark: uWipeDark,
        ca: uWipeCA,
        amp: uWipeAmp,
        lumaLo: uWipeLumaLo,
        lumaHi: uWipeLumaHi,
        style: uWipeStyle,
        edgeGlow: uWipeEdgeGlow,
        frost: uWipeFrost,
      };
      // |slope| with slope = −0.2·aspect, and the scrub remap
      // incP = fit(uWipe, 0, 1, 0, 1 + |slope|).
      const absSlope = aspect.mul(0.2);
      const incP = uWipe.mul(absSlope.add(1));
      // Igloo falloff (bundle L22983) specialised to the [0,1] range:
      // falloff(x, 0, 1, m, prog) = saturate((prog·(1+m) − x) / m).
      const falloff01 = (x: TslNode, margin: number, prog: TslNode): TslNode =>
        clamp(prog.mul(1 + margin).sub(x).div(margin), 0, 1);
      // Smooth 2D value noise — the procedural stand-in for their tScroll.b
      // wobble and the ice texture: 4 cell hashes + bilinear smoothstep mix.
      const vhash = (p: TslNode): TslNode =>
        fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453));
      const vnoise = (p: TslNode): TslNode => {
        const ip = floor(p);
        const fp = fract(p);
        const sm = fp.mul(fp).mul(fp.mul(-2).add(3));
        return mix(
          mix(vhash(ip), vhash(ip.add(vec2(1, 0))), sm.x),
          mix(vhash(ip.add(vec2(0, 1))), vhash(ip.add(vec2(1, 1))), sm.x),
          sm.y,
        );
      };
      // Seam diagonal: uv.y + (uv.x + wobble)·|slope| with wobble
      // = (vnoise(uv·2)·2 − 1)·0.4 (spec §C, replaces tScroll.b).
      const wipeDiag = (u: TslNode): TslNode =>
        u.y.add(
          u.x.add(vnoise(u.mul(2)).mul(2).sub(1).mul(0.4)).mul(absSlope),
        );
      // Coarse block field (their tScroll.g squares): flat per-cell hash at
      // ~24×14 cells, offset by the per-boundary seed.
      const blockNoise = (u: TslNode): TslNode =>
        fract(
          sin(
            dot(
              floor(u.mul(vec2(24, 14)).add(vec2(uWipeSeedX, uWipeSeedY))),
              vec2(41.34, 289.7),
            ),
          ).mul(43758.5453),
        );
      // PRE-SAMPLE uv shove — the block displacement (falloff margins
      // 0.9→1.0): uv += (0.006·(dispB·2−1), uWipeDir·0.012·dispB) — igloo's
      // 0.025 halved because we self-sample a single scene. Level "lite"
      // drops this whole branch (one noise fetch fewer, per the tier spec);
      // the darkening + CA in wipeGrade below stay. ROUND 6-A: the shove is
      // scaled by uWipeAmp (the velocity gate) but stays luma-UNMASKED — a
      // uv shove on flat content moves identical pixels onto themselves, so
      // it self-masks in empty space.
      let wipeUv: TslNode = baseUv;
      if (!lite) {
        wipeUv = Fn(() => {
          const u = baseUv.toVar();
          If(uWipe.greaterThan(0.001), () => {
            // TASK C — wider block band core (CUT_TECH_MARGIN, igloo 0.9).
            const dispB = falloff01(
              blockNoise(baseUv),
              1.0,
              falloff01(wipeDiag(baseUv), CUTS_V2 ? CUT_TECH_MARGIN : 0.9, incP),
            );
            // TASK 6: tech = shove ×1.5, frost = ×0.6 (uWipeStyle 0/1).
            // Legacy driver (CUTS_V2 = false): ×1, branched at graph build.
            const shoveMul: TslNode | number = CUTS_V2
              ? uWipeStyle.mul(0.9).add(0.6)
              : 1;
            // TASK 6: frost uv jitter vnoise(uv·9)·uWipeFrost·(1−|2u−1|),
            // both axes, frost style only.
            const frostAmt = uWipeFrost
              .mul(uWipeStyle.oneMinus())
              .mul(uWipe.mul(2).sub(1).abs().oneMinus());
            const jx = vnoise(baseUv.mul(9)).mul(2).sub(1);
            const jy = vnoise(baseUv.mul(9).add(vec2(17.3, 5.1))).mul(2).sub(1);
            // TASK C — tail fade: dispB saturates to 1 frame-wide as u → 1
            // (whole-frame shift); fade it over u ∈ [0.8, 1] so the exit
            // hard-zero is seamless. Function of u only → mirror-safe.
            const tailFade: TslNode | number =
              CUTS_V2 && CUT_SHOVE_TAIL_FADE
                ? smoothstep(0.8, 1.0, uWipe).oneMinus()
                : 1;
            u.assign(
              u.add(
                vec2(
                  dispB.mul(2).sub(1).mul(uWipeShoveX).mul(shoveMul),
                  dispB.mul(uWipeShoveY).mul(uWipeDir).mul(shoveMul),
                )
                  .mul(tailFade)
                  .add(vec2(jx, jy).mul(frostAmt))
                  .mul(uWipeAmp),
              ),
            );
          });
          return u;
        })();
      }

      const burstUv = Fn(() => {
        // Base uv includes the wipe shove (0c) — the cut block-displacement
        // rides through the burst transform and into the one scene sample.
        const u = wipeUv.toVar();
        If(uWarpBurst.greaterThan(0.001), () => {
          // Polar frame about the aspect-corrected centre (igloo: uv -= 0.5;
          // uv.x *= aspect).
          const cc = vec2(u.x.sub(0.5).mul(aspect), u.y.sub(0.5));
          const ang = atan(cc.y, cc.x);
          const dist = length(cc);
          // Screen-space hash — the blue-noise stand-in for the smear dither.
          const nR = fract(
            sin(
              dot(
                u.mul(719.3).add(vec2(uBurstSeedX, uBurstSeedY)),
                vec2(12.9898, 78.233),
              ),
            ).mul(43758.5453),
          );
          // igloo: angle1 = angle + 0.3 * (noise.r - 0.5) * uRingProximity.
          const ang1 = ang.add(nR.sub(0.5).mul(uWarpBurst.mul(0.3)));
          const nuv = vec2(
            cos(ang1).mul(dist).div(aspect).add(0.5),
            sin(ang1).mul(dist).add(0.5),
          );
          // igloo: dispSquares (coarse texture cells) * 0.01 * seed.z * prox.
          const cell = floor(
            vec2(nuv.x.mul(aspect), nuv.y)
              .mul(14.0)
              .add(vec2(uBurstSeedX, uBurstSeedY)),
          );
          const n2 = fract(sin(dot(cell, vec2(41.34, 289.7))).mul(43758.5453));
          u.assign(
            nuv.add(
              n2.mul(2.0).sub(1.0).mul(uWarpBurst.mul(uBurstSeedZ).mul(0.01)),
            ),
          );
        });
        return u;
      })();

      // The one scene sample — at the (flow + burst) displaced uv. `.sample()`
      // keeps this a REAL texture node, so bloom() below never falls back to
      // an RTT wrap (idle cost unchanged vs the previous plain-color feed).
      const colorForBloom = color.sample(burstUv) as ScenePassTextureNode;

      // 1) SELECTIVE BLOOM (the priority): threshold ≈ 1.0 so only the >1.0
      //    emissive signal (line/planet/particles) blooms. Additive over the
      //    color (matches PostFX.tsx: `<Bloom intensity radius luminanceThreshold>`).
      //    `bloom()` accepts plain-number strength/radius/threshold (it wraps
      //    them in uniforms internally — that is the .strength/.radius/.threshold
      //    we mutate on route change). Fed the (optionally fluid-displaced,
      //    optionally burst-smeared) scene color so the disturbed line still
      //    blooms.
      const bloomPass = bloom(
        colorForBloom as never,
        intensity,
        radius,
        threshold,
      );
      const bloomNode = bloomPass as unknown as TslNode;
      // Base the composite on the (optionally fluid-displaced) scene color so the
      // whole scene — not just the bloom halo — breathes around the pointer.
      let node: TslNode = (colorForBloom as TslNode).add(bloomNode);

      // 1b) WARP-BURST saturation/value lift (igloo: rgb2hsv → s += 0.05·prox,
      //     v += 0.075·prox → hsv2rgb, "highlight only when not already
      //     white"). Applied POST-bloom-composite as a luma-space push —
      //     (c − luma)·k reproduces the saturation lift, the flat +0.075·prox
      //     the value lift — so the bloom input stays a pure texture node (no
      //     RTT wrap) and the full HSV round-trip never runs. If-guarded on
      //     the same uniform → idle cost ≈ 0.
      const burstLift = Fn(() => {
        const d = vec3(0, 0, 0).toVar();
        If(uWarpBurst.greaterThan(0.001), () => {
          const c = (colorForBloom as TslNode).rgb;
          const l = dot(c, vec3(0.2125, 0.7154, 0.0721));
          d.assign(
            c
              .sub(l)
              .mul(uWarpBurst.mul(0.35))
              .add(uWarpBurst.mul(0.075)),
          );
        });
        return d;
      })();
      node = node.add(vec4(burstLift, 0));

      // 1c) W4 — WIPE GRADE (post-bloom-composite, the same delta idiom as
      //     the burst lift so the bloom input stays a pure texture node):
      //     • darkening: −base·0.30·core·(1−core)·4 — band-limited (zero at
      //       both band ends), the seam body that replaces igloo's scene mix.
      //     • spectral CA: 3-tap barrel split (R at +off, G in place, B at
      //       −off — their 5-tap loop reduced; 2 extra samples of the SAME
      //       scene-pass texture, no new binding), with bend
      //       = haloB·(1−haloB)·4·noise — zero at both ends, so band entry
      //       and exit are seamless.
      //     • leading-edge lift: the burst's luma-space HSV stand-in
      //       ((c−luma)·0.35 ≈ sat+0.05, flat +0.075 ≈ val+0.075) on
      //       edge = smoothstep(.35,.5,core)·(1 − smoothstep(.5,.65,core))
      //       (the descending smoothstep written via oneMinus — defined
      //       behavior on BOTH the WGSL and GLSL builders).
      //     Fields are computed at the un-shoved uv (igloo evaluates them at
      //     vUv); the CA taps sample at the final displaced uv ± the barrel
      //     offset. If-guarded on the same uniform → idle cost ≈ 0.
      //     ROUND 6-A (the visible-strip fix, see the header note):
      //     • content-luma mask — darkening AND leading-edge lift are scaled
      //       by mask = smoothstep(uWipeLumaLo, uWipeLumaHi, luma), where
      //       luma is the ALREADY-COMPUTED luminance of `base` (the one
      //       existing scene sample at the shoved uv — no extra fetch, and
      //       it stays inside this guarded branch). Near-black empty space
      //       no longer receives the flat darken/lift that manufactured the
      //       strip; the CA delta stays UNMASKED (rS/bS − base ≈ 0 on flat
      //       pixels — it self-masks).
      //     • the whole delta is multiplied by uWipeAmp (the driver's
      //       velocity-gated amplitude) so the band only exists while
      //       actually scrubbing.
      //     UNDERSHOOT BOUND (there is no clamp before the tonemap): both
      //     round 6-A factors (mask, amp) are in [0,1] and multiply the
      //     approved W4 delta, so its magnitude can only SHRINK; the masked
      //     darkening alone is bounded by 0.30·base (core·(1−core)·4 ≤ 1),
      //     i.e. base·(1 − dark·mask·amp) ≥ 0.7·base ≥ 0 — it can never
      //     push the composite negative by itself.
      const wipeGrade = Fn(() => {
        const d = vec3(0, 0, 0).toVar();
        If(uWipe.greaterThan(0.001), () => {
          const diag = wipeDiag(baseUv);
          const haloB = falloff01(diag, 2.0, incP);
          const core = falloff01(
            vnoise(baseUv.mul(3)),
            2.0,
            falloff01(diag, 0.2, incP),
          );
          const base = (colorForBloom as TslNode).rgb;
          const dark = core.mul(core.oneMinus()).mul(4).mul(uWipeDark);
          // Per-pixel dither on the CA bend — the blue-noise stand-in,
          // time-shifted like igloo's per-frame uBlueOffset re-roll.
          const nCA = fract(
            sin(
              dot(
                baseUv.mul(547.7).add(vec2(uWipeSeedX, uWipeSeedY)).add(time),
                vec2(12.9898, 78.233),
              ),
            ).mul(43758.5453),
          );
          const bend = haloB.mul(haloB.oneMinus()).mul(4).mul(nCA);
          const cc = burstUv.sub(0.5);
          const off = cc.mul(dot(cc, cc)).mul(bend.mul(uWipeCA));
          const rS = color.sample(burstUv.add(off)) as TslNode;
          const bS = color.sample(burstUv.sub(off)) as TslNode;
          const edge = smoothstep(0.35, 0.5, core).mul(
            smoothstep(0.5, 0.65, core).oneMinus(),
          );
          const luma = dot(base, vec3(0.2125, 0.7154, 0.0721));
          const mask = smoothstep(uWipeLumaLo, uWipeLumaHi, luma);
          d.assign(
            base
              .mul(dark)
              .mul(-1)
              .mul(mask)
              .add(vec3(rS.r.sub(base.r), 0, bS.b.sub(base.b)))
              .add(
                base
                  .sub(luma)
                  .mul(edge.mul(0.35))
                  .add(edge.mul(uWipeEdgeLift))
                  .mul(mask),
              )
              // TASK 6 — navy-visible cyan edge glow, OUTSIDE the luma mask.
              // TASK C — gain defaults to 0 (owner: no visible line); every
              // other term above is luma-masked or self-masking on flat
              // pixels, so with edgeGlow 0 nothing paints over bare navy.
              .add(vec3(0.23, 0.88, 1.0).mul(edge.mul(uWipeEdgeGlow)))
              .mul(uWipeAmp),
          );
        });
        return d;
      })();
      node = node.add(vec4(wipeGrade, 0));

      // 1b) IGNITION (handoff refactor 2026-08-28 — Arago's lights-up beat):
      //    multiply the whole composited frame by mix(0.14, 1, uIgnite). The
      //    uniform is built at 1 everywhere except a hard load still behind
      //    the preloader curtain (introComplete false), so every other
      //    route/rebuild renders byte-identically (×1 is a no-op). Applied
      //    AFTER bloom/wipe and BEFORE the vignette so the ramp lifts the
      //    entire lit frame, highlights included — exposure coming up, not a
      //    grey veil. Driven 0→1 over ~2s in the frame loop below.
      const uIgnite = uniform(useIntroStore.getState().introComplete ? 1 : 0);
      igniteRef.current = uIgnite;
      const igniteLift = uIgnite.mul(0.86).add(0.14);
      node = node.mul(vec4(igniteLift, igniteLift, igniteLift, 1));

      // 2) VIGNETTE (hand-rolled — no `vignette` export in three/tsl). Mirrors
      //    `<Vignette offset={0.35} darkness={...}>`: darken from ~0.5 of the way
      //    out to the corners. `screenUV.distance(center)` is 0 at center, grows
      //    toward the edges; smoothstep(offset, ~edge) ramps the darkening. This
      //    operates on the plain composited node (no texture sample) — safe.
      const dist = screenUV.distance(vec2(0.5, 0.5));
      const vig = smoothstep(0.35, 0.85, dist)
        .oneMinus()
        .mul(float(fx.vignetteDarkness))
        .oneMinus();
      node = node.mul(vig);

      // 3) FILM GRAIN (hand-rolled, whisper-only — replaces the crash-prone `film`
      //    addon). A screen-space value hash `fract(sin(dot(screenUV, k)) * m)`
      //    animated by `time`, remapped to [-0.5, 0.5] and scaled by the existing
      //    `noiseOpacity` knob (so it tracks the WebGL2 grain amount), added to the
      //    color as a tiny luminance jitter. NO texture sampling, NO pass/texture
      //    node — only plain TSL math — so it cannot reproduce the null-input
      //    crash. Omitted automatically when `noiseOpacity` is 0 (grain off, or
      //    level "lite" — see the mask above).
      if (noiseOpacity > 0) {
        const seed = screenUV.add(vec2(1, 1).mul(time));
        const grain = fract(sin(dot(seed, vec2(12.9898, 78.233))).mul(43758.5453));
        const jitter = grain.sub(0.5).mul(float(noiseOpacity));
        // vec4 with 0 alpha so the jitter adds to rgb only and matches the
        // composited vec4 color's component count (no vec3+vec4 mismatch).
        node = node.add(vec4(jitter, jitter, jitter, 0));
      }

      // 4) TONE MAPPING + output color space happen LAST, owned by the pipeline.
      //    `outputColorTransform = true` (default) makes PostProcessing.render()
      //    apply the renderer's tone mapping (R3F default = ACESFilmicToneMapping)
      //    and output color space after the chain — reproducing the OFF path's
      //    filmic look, with the scene tone-mapped exactly once.
      const post = new PostProcessing(gl as never) as unknown as PostProcessingLike;
      post.outputNode = node;
      post.needsUpdate = true;

      built = post;
      postRef.current = post;
      bloomRef.current = bloomPass;

      // The graph was built from the pathname captured at MOUNT. If the visitor
      // navigated while the BloomNode chunk was still in flight (its own chunk —
      // a real cold-cache round-trip), the [pathname] effect below already ran
      // and bailed on a null bloomRef, and it will never re-run because its only
      // dep did not change again. Re-apply the CURRENT route now so the stale
      // closure can never win. Idempotent on the no-navigation path (writes back
      // the same numbers already baked into bloom()), and it touches uniform
      // values only — no graph rebuild or recompile.
      const cur = resolveBloom(pathnameRef.current);
      bloomPass.strength.value = cur.intensity;
      bloomPass.radius.value = cur.radius;
      bloomPass.threshold.value = cur.threshold;
    })();

    return () => {
      cancelled = true;
      built?.dispose();
      if (postRef.current === built) postRef.current = null;
      bloomRef.current = null;
      burstRef.current = null;
      burstDampedRef.current = 0;
      // Drop the dead ignition uniform; a rebuilt graph re-derives its initial
      // value from introComplete (1 after any completed intro).
      igniteRef.current = null;
      igniteClockRef.current = 0;
      // W4 — drop the dead wipe uniforms and reset the driver so a rebuilt
      // graph re-derives its boundaries (state objects survive; version −1
      // forces the next frame's re-derivation).
      wipeRef.current = null;
      if (cutStateRef.current) {
        cutStateRef.current.version = -1;
        cutStateRef.current.activeIdx = -1;
        cutStateRef.current.amp = 0;
        cutStateRef.current.prevP = Number.NaN;
        cutStateRef.current.activePair = -1;
        cutStateRef.current.burst = 0;
        cutStateRef.current.uDisplay = 0;
        cutStateRef.current.edge.prevP = Number.NaN;
        cutStateRef.current.edge.latchKeep = false;
        useCutStore.getState().clear();
      }
      if (spikeRef.current) spikeRef.current.peak = 0;
      flowRef.current?.dispose();
      flowRef.current = null;
    };
    // Rebuild only when the renderer identity changes (route changes update the
    // bloom uniforms in the effect below — no graph rebuild needed).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  // Route-change beat: update the bloom uniforms in place (no rebuild). Mirrors
  // PostFX.tsx re-reading routeFx/fxStore on pathname change.
  useEffect(() => {
    const b = bloomRef.current;
    if (!b) return;
    const { intensity, threshold, radius } = resolveBloom(pathname);
    b.strength.value = intensity;
    b.radius.value = radius;
    b.threshold.value = threshold;
  }, [pathname]);

  // The single render authority for the WebGPU path. Positive priority (1)
  // suppresses R3F's default scene render (see header note) and lets us drive
  // the post pipeline instead — inside the ONE existing R3F/Lenis loop, no new
  // RAF. Until the lazy graph lands, fall back to a plain scene render so the
  // first frames are not black.
  useFrame((_, delta) => {
    // Stamp + fade the pointer flowmap FIRST (renders the offscreen quad into its
    // own RT and restores the previous target), so the post pipeline samples a
    // fresh field this frame. Idle cursor → only the cheap fade runs (no stamp).
    // delta threads through so fade/deposit are wall-clock-true at any refresh
    // rate (the flowmap clamps it to 1/30 itself).
    const flow = flowRef.current;
    if (flow) {
      const fx = useFxStore.getState();
      const { smooth, vel } = usePointerStore.getState();
      const w = (gl as unknown as { domElement?: { width?: number } }).domElement
        ?.width;
      const h = (gl as unknown as { domElement?: { height?: number } }).domElement
        ?.height;
      const aspect = w && h ? w / h : 1;
      flow.uStrength.value = fx.fluidStrength;
      flow.tick({
        dt: delta,
        px: smooth.x,
        py: smooth.y,
        vx: vel.x,
        vy: vel.y,
        aspect,
        dissipation: fx.dissipation,
        splatRadius: fx.splatRadius,
        strength: fx.fluidStrength,
      });
    }

    // W4 — section-cut wipe scrub + crossing detector (round 5, spec §C CPU
    // half — see the SECTION-CUT WARP header note). Runs only on the home
    // route with a built graph. Boundary fractions re-derive ONLY on a
    // sectionStore.measureVersion bump (and are remapped to progress space
    // there — see CutDriverState.cuts); per frame this is two ≤6-entry scans
    // + guarded uniform writes, `uWipe` is written to a hard 0 exactly once
    // on window exit, and there is ZERO allocation (hoisted typed arrays,
    // refs + getState — the island commit-wedge rule).
    const wp = wipeRef.current;
    if (wp) {
      const params = (cutParamsRef.current ??= makeCutParams());
      const cs = (cutStateRef.current ??= makeCutState());
      if (!params.enabled || pathnameRef.current !== CUT_BOUNDARY_ROUTE) {
        // Interior routes / kill switch: settle once, then this whole
        // branch is a couple of compares per frame (prevP stays NaN while
        // disarmed, so re-entering home can never diff against a stale p).
        if (
          cs.activeIdx !== -1 ||
          !Number.isNaN(cs.prevP) ||
          !Number.isNaN(cs.edge.prevP)
        ) {
          cs.activeIdx = -1;
          cs.amp = 0;
          cs.prevP = Number.NaN;
          cs.activePair = -1;
          cs.burst = 0;
          cs.uDisplay = 0;
          cs.edge.prevP = Number.NaN;
          cs.edge.latchKeep = false; // route entry re-latches from position
          if (wp.wipe.value !== 0) wp.wipe.value = 0;
          if (wp.amp.value !== 0) wp.amp.value = 0;
          useCutStore.getState().clear();
        }
      } else {
        const sec = useSectionStore.getState();
        if (sec.measureVersion !== cs.version) {
          cs.version = sec.measureVersion;
          cs.count = CUTS_V2
            ? deriveSectionCuts(cs.cuts, cs.pairIdx)
            : deriveCutBoundaries(cs.cuts, cs.pairIdx);
          // Remap the boundary DOC fractions into LENIS-PROGRESS space and
          // derive the scrub half-window — igloo §A-EXT exactly: the window
          // opens when the boundary enters at the viewport BOTTOM (cut − h)
          // and closes when it exits at the TOP (cut + h) — one viewport of
          // scroll — so its midpoint (uWipe 0.5, the crossing instant) is
          // the boundary passing the viewport CENTER (the .cut-tick
          // coincidence contract). Raw progress runs over scrollHeight −
          // innerHeight, so comparing it against doc fractions directly
          // would skew every window toward the document edges. innerHeight
          // is read here (measure cadence), never per frame.
          const sH = sec.scrollHeight;
          const iH = window.innerHeight;
          const limit = sH - iH;
          if (limit > 1 && iH > 0) {
            cs.halfWindow = (0.5 * iH) / limit;
            for (let i = 0; i < cs.count; i++) {
              cs.cuts[i] = (cs.cuts[i] * sH - 0.5 * iH) / limit;
            }
            // Per-boundary window cap: half the distance to the nearest
            // OTHER boundary → windows never overlap (see
            // CutDriverState.maxH). O(count²) at measure cadence, count ≤ 8.
            for (let i = 0; i < cs.count; i++) {
              let gap = Infinity;
              for (let j = 0; j < cs.count; j++) {
                if (j === i) continue;
                const g = Math.abs(cs.cuts[i] - cs.cuts[j]);
                if (g < gap) gap = g;
              }
              cs.maxH[i] = gap * 0.5;
            }
            // TASK 6 — per-seam window: `windowVh` viewports of scroll
            // (igloo: exactly 1), capped so neighbours never overlap.
            for (let i = 0; i < cs.count; i++) {
              const cfg = SECTION_CUTS[cs.pairIdx[i]];
              const vh = CUTS_V2 && cfg ? cfg.windowVh : 1;
              const hw = cs.halfWindow * vh * params.windowScale;
              cs.h[i] = hw < cs.maxH[i] ? hw : cs.maxH[i];
            }
          } else {
            cs.halfWindow = 0;
          }
          if (CUTS_V2) {
            // P7 fix: a re-measure NEVER zeroes amp/uWipe — the next frame
            // recomputes u from the fresh cuts (activePair survives, so the
            // band is not re-seeded); the edge detector re-latches with
            // `latchKeep`: boundaries the reader is outside of are armed,
            // the ones the reader is INSIDE of keep their arm state (live
            // probe round 1: a body-reflow re-measure while approaching a
            // seam inside its window used to disarm it and swallow the
            // crossing's tick; a just-fired seam stays spent either way).
            cs.activeIdx = -1;
            cs.edge.prevP = Number.NaN;
            cs.edge.latchKeep = true;
          } else {
            cs.activeIdx = -1;
            cs.amp = 0;
            cs.prevP = Number.NaN;
            if (wp.wipe.value !== 0) wp.wipe.value = 0;
            if (wp.amp.value !== 0) wp.amp.value = 0;
          }
        }
        if (CUTS_V2 && cs.count > 0 && cs.halfWindow > 0) {
          // === TASK 6 — the v2 "drift-cut" driver (igloo §2.2 + §2.4) ====
          // Everything is f(progress): window scrub u, constant amplitude,
          // scrubbed accent, camera drift. The ONLY wall-clock accent is
          // the 140 ms .cut-tick, fired by the hysteresis-armed edge
          // detector — never on a programmatic jump (scrollStore.teleport).
          const ss = useScrollStore.getState();
          const p = ss.progress;
          const tele = ss.teleport > 0;
          const moved = !Number.isNaN(cs.edge.prevP) && p !== cs.edge.prevP;
          const fire = (fireRef.current ??= (i: number, dir: 1 | -1) => {
            const st = cutStateRef.current;
            const pr = cutParamsRef.current;
            if (!st || !pr) return;
            st.lastFired = i; // TASK C — the straddled boundary, tick or not
            if (!pr.tick) return;
            const cfg = SECTION_CUTS[st.pairIdx[i]];
            if (cfg && cfg.tick) fireCutTick(cfg.out, cfg.in, dir);
          });
          cs.lastFired = -1;
          const fdir = stepCutEdges(cs.edge, cs.cuts, cs.h, cs.count, p, tele, fire);
          if (fdir !== 0) cs.dir = fdir;
          if (tele) {
            // Spend the budget the frame the jump is observed; otherwise let
            // it expire (a marked jump that never moved the page).
            ss.setTeleport(moved ? 0 : ss.teleport - 1);
          }
          // WINDOW SCRUB — the boundary whose window contains p (windows
          // never overlap, so at most one; nearest wins on the exact seam).
          let best = -1;
          let bestD = Infinity;
          for (let i = 0; i < cs.count; i++) {
            const dd = p - cs.cuts[i];
            const ad = dd < 0 ? -dd : dd;
            if (ad < cs.h[i] && ad < bestD) {
              bestD = ad;
              best = i;
            }
          }
          // TASK C — MIN CYCLE: the true position has LEFT every window but
          // the active pair's displayed sweep has not landed on 0 / 1 yet →
          // keep driving that pair toward the side the reader left through
          // (window identity by pairIdx, so a re-measure mid-finish — which
          // resets activeIdx — cannot lose it).
          const minCycle = CUT_MIN_CYCLE_ON && params.minCycleS > 0;
          let finishing = false;
          if (best === -1 && minCycle && cs.activePair !== -1) {
            for (let i = 0; i < cs.count; i++) {
              if (cs.pairIdx[i] === cs.activePair) {
                best = i;
                finishing = true;
                break;
              }
            }
          } else if (best === -1 && minCycle && cs.lastFired !== -1) {
            // TASK C — the true position jumped OVER a whole window between
            // two frames (violent fling / low fps): no frame ever sat
            // inside, but the armed edge detector saw the straddle → open
            // that seam's sweep in finishing mode (entry side → exit side
            // over ≥ minCycleS). Never on a teleport (the detector does not
            // fire on one — a jump is not a scroll).
            best = cs.lastFired;
            finishing = true;
          }
          const cfg = best === -1 ? undefined : SECTION_CUTS[cs.pairIdx[best]];
          if (best !== -1 && cfg) {
            const pairI = cs.pairIdx[best];
            const uPos = wipeU(p, cs.cuts[best], cs.h[best]);
            if (cs.activePair !== pairI) {
              // Window ENTRY (event cadence): band seed (hash(i)), style,
              // and the accent seeds — re-rolled ONCE per window entry.
              const hs = hash01(pairI);
              wp.seedX.value = hs * 25.424;
              wp.seedY.value = hs * 64.453;
              wp.style.value =
                cfg.style === "tech" || cfg.style === "tech-light" ? 1 : 0;
              cs.burstSeedX = Math.random() * 25.424;
              cs.burstSeedY = Math.random() * 64.453;
              cs.activePair = pairI;
              // Latch the crossing direction once per window entry: with no
              // motion this frame (teleport landing) fall back to the last
              // frame direction, which is what the entry would have been.
              cs.entryDir = fdir !== 0 ? fdir : cs.dir;
              // TASK C — the displayed sweep starts at the side the reader
              // entered from (down: 0, up: 1) and is rate-limited toward the
              // position law below; a teleport landing / reload inside the
              // window (no motion this frame) snaps to the law — a jump is
              // not a scroll and must not manufacture a sweep.
              cs.uDisplay = fdir !== 0 && !tele ? (fdir > 0 ? 0 : 1) : uPos;
            }
            cs.activeIdx = best;
            let u = uPos;
            if (minCycle) {
              // Target: the position law inside the window; the exit side
              // (0 above / 1 below the seam) while finishing. Reverse
              // mid-cycle reverses the limiter (symmetric); at reading pace
              // the step is under the cap and u === uPos exactly.
              const target = finishing ? (p > cs.cuts[best] ? 1 : 0) : uPos;
              if (finishing && cs.uDisplay === target) {
                // The sweep LANDED on the exit side last frame (that frame
                // rendered u = 0 / 1 exactly — both are identity in the
                // graph: every falloff saturates) → exit now, seamlessly.
                best = -1;
              } else {
                const dt = delta > 0.25 ? 0.25 : delta;
                u = tele
                  ? target
                  : stepToward(cs.uDisplay, target, dt / params.minCycleS);
                cs.uDisplay = u;
              }
            } else {
              cs.uDisplay = uPos;
            }
            if (best !== -1) {
              const amp = cfg.amp * params.ampScale;
              wp.wipe.value = u;
              if (wp.amp.value !== amp) wp.amp.value = amp; // CONSTANT inside the window
              cs.amp = amp;
              cs.burst = params.spike ? cfg.spike * bump(u) : 0;
              useCutStore
                .getState()
                .set(
                  best,
                  pairI,
                  u,
                  cs.entryDir,
                  cfg.dolly * params.driftScale,
                  cfg.roll * params.driftScale,
                  uPos,
                );
            }
          }
          if (
            best === -1 &&
            (cs.activeIdx !== -1 || cs.activePair !== -1 || wp.wipe.value !== 0)
          ) {
            // Window exit (or the min-cycle sweep landed): hard 0, written once.
            cs.activeIdx = -1;
            cs.activePair = -1;
            cs.amp = 0;
            cs.burst = 0;
            cs.uDisplay = 0;
            wp.wipe.value = 0;
            if (wp.amp.value !== 0) wp.amp.value = 0;
            useCutStore.getState().clear();
          }
        } else if (!CUTS_V2 && cs.count > 0 && cs.halfWindow > 0) {
          // One getState serves the scrub (progress), the round 6-A amp
          // gate (velocity, per frame) and the crossing spike (velocity,
          // event cadence).
          const ss = useScrollStore.getState();
          const p = ss.progress;
          // CROSSING DETECTOR — a prevP/p STRADDLE of any boundary, NOT an
          // inside-window side latch: `(prevP ≥ cutᵢ) !== (p ≥ cutᵢ)`
          // catches a slow scrub and a violent same-frame End/Home/anchor
          // jump identically (either frame may sit outside every window). A
          // multi-boundary jump fires exactly ONCE, for the crossed
          // boundary nearest the landing point. The first frame after
          // (re)arming only latches prevP — never a crossing.
          if (Number.isNaN(cs.prevP)) {
            cs.prevP = p;
          } else if (p !== cs.prevP) {
            const dir: 1 | -1 = p > cs.prevP ? 1 : -1;
            // The band shove follows real frame-to-frame motion (the
            // section bus direction can lag a one-frame jump). Written on
            // flips only.
            if (wp.dir.value !== dir) wp.dir.value = dir;
            let crossed = -1;
            let crossedD = Infinity;
            for (let i = 0; i < cs.count; i++) {
              const c = cs.cuts[i];
              if ((cs.prevP >= c) === (p >= c)) continue;
              const dd = p - c;
              const ad = dd < 0 ? -dd : dd;
              if (ad < crossedD) {
                crossedD = ad;
                crossed = i;
              }
            }
            cs.prevP = p;
            if (crossed !== -1) {
              // THE CROSSING INSTANT — the boundary passed the viewport
              // center. Event cadence (once per crossing): allocation and
              // Math.random are allowed here, never per frame.
              if (params.spike && levelRef.current === "full") {
                const vel = ss.velocity;
                const av = vel < 0 ? -vel : vel;
                const vn = av >= params.velNorm ? 1 : av / params.velNorm;
                const sp = (spikeRef.current ??= makeSpikeState());
                sp.peak = Math.min(
                  1,
                  params.spikeBase + params.spikeVelGain * vn,
                );
                sp.t = 0;
                // Igloo s() semantics: fresh random seed per burst;
                // intensity 1.0 scrolling up, 0.5 forward.
                sp.seedX = Math.random() * 25.424;
                sp.seedY = Math.random() * 64.453;
                sp.seedZ = dir === -1 ? 1 : 0.5;
              }
              if (params.tick) {
                const pair = CUT_BOUNDARY_PAIRS[cs.pairIdx[crossed]];
                fireCutTick(pair[0], pair[1], dir);
              }
            }
          }
          // WINDOW SCRUB — nearest boundary, its window capped by maxH so
          // neighbouring windows never overlap (h > 0 also guards the
          // degenerate coincident-cuts case against a 0/0 NaN reaching the
          // uniform). Outside every window uWipe settles to a hard 0,
          // written once.
          let best = 0;
          let bestD = Infinity;
          for (let i = 0; i < cs.count; i++) {
            const dd = p - cs.cuts[i];
            const ad = dd < 0 ? -dd : dd;
            if (ad < bestD) {
              bestD = ad;
              best = i;
            }
          }
          const hw = cs.halfWindow * params.windowScale;
          const h = hw < cs.maxH[best] ? hw : cs.maxH[best];
          if (h > 0 && bestD <= h) {
            if (cs.activeIdx !== best) {
              // Boundary-window ENTRY: reseed the band pattern once (spec
              // §C: hash(i)·25.424 / hash(i)·64.453).
              const hs = hash01(best);
              wp.seedX.value = hs * 25.424;
              wp.seedY.value = hs * 64.453;
              cs.activeIdx = best;
            }
            // ROUND 6-A — velocity-gated amplitude: damp cs.amp toward
            // min(|vel|/ampVelNorm, 1) (λ up 6 = fast assemble, λ down 3 =
            // ~0.3–0.5 s dissolve at rest). Sub-1% targets clamp to 0 so a
            // residual Lenis settle velocity can never hold the band (or
            // the GPU branch) alive. When settled (< 0.001) BOTH uniforms
            // hard-zero once — the `If(uWipe > 0.001)` branch skips while
            // parked mid-window and this path costs scalar math + two
            // compares per frame. uWipe stays scrubbed otherwise
            // (recomputed from p on resume — geometry unchanged, only the
            // amplitude gates). Zero allocation.
            const av = ss.velocity < 0 ? -ss.velocity : ss.velocity;
            const norm = params.ampVelNorm;
            let target = av >= norm ? 1 : av / norm;
            if (target < 0.01) target = 0;
            let amp = cs.amp;
            if (target !== amp) {
              const lam =
                target > amp ? params.ampLambdaUp : params.ampLambdaDown;
              const k = 1 - Math.exp(-lam * Math.min(delta, 1 / 30));
              amp += (target - amp) * k;
              if (target === 0 && amp < 0.001) amp = 0;
              cs.amp = amp;
            }
            if (amp < 0.001) {
              // Parked mid-window (amp settled): write the hard 0 once —
              // same write-once idiom as the window exit below.
              if (wp.wipe.value !== 0) wp.wipe.value = 0;
              if (wp.amp.value !== 0) wp.amp.value = 0;
            } else {
              wp.wipe.value = clamp01((p - cs.cuts[best] + h) / (2 * h));
              wp.amp.value = amp;
            }
          } else if (cs.activeIdx !== -1 || wp.wipe.value !== 0) {
            // Window exit: hard 0, written once (the guard above keeps this
            // branch from re-firing while idle). The amp resets with it so
            // the next window assembles from 0.
            cs.activeIdx = -1;
            cs.amp = 0;
            wp.wipe.value = 0;
            if (wp.amp.value !== 0) wp.amp.value = 0;
          }
        }
      }
    }

    // C2 — warp-burst envelope (round 3 §C2, GENERALIZED by round 5 W4):
    // seqStore.burst carries the passage's GSAP envelope (0.5s in / 0.4s out,
    // written by the home one-shot); the section-cut crossing spike (armed
    // above) rides its own 0.5s linear-in / 0.4s linear-out envelope (igloo's
    // power1 pair IS linear), advanced here with wall-clock delta. The two
    // sources max()-merge into the SAME damped uniform (λ 18 — softens
    // tween-tick stairs without stretching the igloo envelope) and whichever
    // dominates also contributes its seed trio. Uniforms-only writes. Idle
    // cost: one getState + a few comparisons; the uniform sits at exactly 0
    // so the If-guarded burst branches never execute.
    const bu = burstRef.current;
    if (bu) {
      const seq = useSeqStore.getState();
      let target = seq.burst;
      let sx = seq.burstSeedX;
      let sy = seq.burstSeedY;
      let sz = seq.burstSeedZ;
      // TASK 6 (CUTS_V2): the SCRUBBED accent — spike·bump(u), a pure
      // function of the scroll (igloo §2.4), max()-merged like the spike.
      const cs2 = cutStateRef.current;
      if (CUTS_V2 && cs2 && cs2.burst > target) {
        target = cs2.burst;
        sx = cs2.burstSeedX;
        sy = cs2.burstSeedY;
        sz = cutParamsRef.current?.spikeSeedZ ?? 0.75;
      }
      const sp = spikeRef.current;
      if (sp && sp.peak > 0) {
        sp.t += delta;
        const env = sp.t < 0.5 ? sp.t / 0.5 : 1 - (sp.t - 0.5) / 0.4;
        if (env <= 0) {
          sp.peak = 0;
        } else {
          const v = env * sp.peak;
          if (v > target) {
            target = v;
            sx = sp.seedX;
            sy = sp.seedY;
            sz = sp.seedZ;
          }
        }
      }
      const cur = burstDampedRef.current;
      if (target > 0 || cur > 1e-4) {
        const k = 1 - Math.exp(-18 * Math.min(delta, 1 / 30));
        let next = cur + (target - cur) * k;
        if (target === 0 && next < 1e-4) next = 0;
        burstDampedRef.current = next;
        bu.burst.value = next;
        bu.seedX.value = sx;
        bu.seedY.value = sy;
        bu.seedZ.value = sz;
      } else if (bu.burst.value !== 0) {
        bu.burst.value = 0;
      }
    }

    // Ignition ramp — one-shot: 0 → 1 over IGNITE_S with a cubic ease-out,
    // armed by the introComplete edge (getState, no subscription — island
    // rule). Once the uniform reaches 1 this is a single compare per frame
    // forever; graphs built after the intro start at 1 and never enter.
    const ig = igniteRef.current;
    if (ig && ig.value < 1) {
      if (useIntroStore.getState().introComplete) {
        igniteClockRef.current += Math.min(delta, 1 / 30);
        const t = Math.min(igniteClockRef.current / IGNITE_S, 1);
        const inv = 1 - t;
        ig.value = 1 - inv * inv * inv;
      }
    }

    const post = postRef.current;
    if (post) {
      post.render();
    } else {
      // Graph not built yet: render the scene normally (single tonemap via the
      // renderer's own ACES). This branch only runs for the brief async window.
      (gl as unknown as { render: (s: unknown, c: unknown) => void }).render(scene, camera);
    }
  }, 1);

  return null;
}
