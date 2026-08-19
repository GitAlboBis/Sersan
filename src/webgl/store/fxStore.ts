/**
 * Tunable look parameters for the signature line + postprocessing.
 *
 * Defaults are the shipped look. In development the leva panel (LineDebug)
 * writes here live; SignatureLine reads per-frame via getState() (cheap),
 * PostFX reads reactively (re-render on change is fine for dev tuning).
 */
import { create } from "zustand";
import { DEFAULT_GPGPU_CONFIG, SPORE_LAYER } from "../gpgpu/gpgpuConfig";
import { DEFAULT_SPORE_PRESET_ID } from "../gpgpu/sporePresets";

interface FxState {
  // Line material
  colorA: string;
  colorB: string;
  colorHot: string;
  emissive: number;
  glowFalloff: number;
  headSharp: number;
  flowSpeed: number;
  /** Fresnel rim exponent for the "gel tube" grazing-edge glow. */
  fresnelPower: number;
  /** Strength of the fake-scatter glow added at grazing angles. */
  scatter: number;
  /** Tube radius as a fraction of viewport world height. */
  radiusFactor: number;
  /**
   * Global intensity for the faint curl-noise tube-field background
   * (CurlTubeField, full-tier only). Default low so it reads as soft haze
   * subordinate to the signature line; set to 0 to hide the field entirely.
   */
  curlTubeIntensity: number;
  // Postprocessing
  bloomIntensity: number;
  bloomThreshold: number;
  bloomRadius: number;
  noiseOpacity: number;
  vignetteDarkness: number;
  // Hero Signal Core
  heroEmissive: number;
  heroPulseSpeed: number;
  /**
   * Hero mark scale as a fraction of viewport world height. Raised to frame the
   * SERSAN mark (1.62×2 normalized) as a PROMINENT particle logo at rest
   * (HeroLogo: `WORLD_VIEW_HEIGHT * heroScale`).
   */
  heroScale: number;
  /**
   * Hero mark horizontal anchor as a fraction of `worldViewWidth` (HeroLogo:
   * `group.position.x = worldViewWidth * (heroOffsetX - hp*0.05)`). Sits the
   * mark on the right of the hero; lower = less far right so the wide mark is
   * fully visible (not clipped). The hp term keeps the gentle scroll drift left.
   */
  heroOffsetX: number;
  /**
   * Hero mark vertical anchor as a fraction of `WORLD_VIEW_HEIGHT`, relative to
   * the camera (HeroLogo: `group.position.y = camera.position.y -
   * WORLD_VIEW_HEIGHT*(heroOffsetY + hp*0.04)`). 0 = centered on the camera row;
   * the hp term keeps the gentle sink as the story advances.
   */
  heroOffsetY: number;
  /**
   * Hero mark rest depth in world Z (HeroLogo: `group.position.z = heroPosZ -
   * hp*2.2`). Much closer than the old -1.6 so the mark reads big & front-facing
   * at rest near the content plane; the hp term keeps the scroll recede.
   */
  heroPosZ: number;
  /**
   * Render mode for the hero mark (HeroLogo).
   *   "spores" → THE SHIPPING HERO (DDD bundle teardown 2026-06-09, see task
   *                 06-08's research/ddd-bundle-teardown-spore-render.md): two
   *                 shells of instanced SHADED OPAQUE icospheres (lambert +
   *                 rim + per-spore AO darkening, depth-tested, world-space
   *                 radius ≈ markHeight/47) over a solid occluder mark, on the
   *                 unified compute momentum sim (anchor spring + cursor
   *                 attractor/orbit + DDD life machine). TRUE-WebGPU backend
   *                 only — every other backend auto-degrades to:
   *   "particles-static" → the analytic fallback (and a debug toggle): the
   *                 particle billboards at their HOME positions (per-instance
   *                 vec3 attribute), ANALYTICALLY displaced near the cursor in
   *                 the vertex shader (lift + violet→cyan, eased hover). No
   *                 sim, no compute → robust on every backend.
   * Retired 2026-06-13 (restyle step 4, C3): "solid" / "both" / "particles"
   * (FBO rig) / "particles-2layer" — the modes AND their rigs were deleted
   * (gpgpuSim.ts, createGpgpuNodeSim, createGpgpuComputeNodeSim,
   * createGpgpuRenderMaterial, BODY_LAYER/SKIN_LAYER).
   * Live-settable from the console:
   *   window.__sersanFx.getState().set({ heroRenderMode: "particles-static" })
   */
  heroRenderMode: "particles-static" | "spores";
  /**
   * Active spore VARIANT id (gpgpu/sporePresets.ts). Selects the whole look —
   * colours, particle physics, hover/erode feel, regrow speed, single vs
   * double shell. Switched live from the Logo Lab overlay
   * (components/fx/logo-lab.tsx); HeroLogo REBUILDS the spore rig when it
   * changes (the layer specs are baked into the compute build, not uniforms).
   */
  heroPreset: string;
  /**
   * Spore-mode live knobs: base sphere radius multiplier (1 = DDD's
   * markHeight/47 diameter) and HDR emission strength on fast spores.
   */
  sporeSize: number;
  sporeEmissive: number;
  /**
   * Cursor-attractor ORBIT (swirl) strength for the spores sim, as a ratio of
   * each layer's own PUSH (the attractors-example spin term `axis ×
   * direction-to-cursor`). Enriches hover/burst motion only — the term is
   * gated by the cursor-radius falloff, so the RESTING crust is unchanged by
   * construction at any value. 0 disables the swirl entirely.
   */
  sporeAttractor: number;
  /** Falloff exponent shaping the orbit term (higher hugs the cursor
   * tighter; the radial push keeps its approved push² shape independently). */
  sporeOrbitFalloff: number;
  // Spore AUTO-BURST — HeroLogo's crust explosion the moment the intro
  // assembly settles (mark reform released + "Sersan AI" wordmark forming).
  // One-shot per LOCKUP VISIT (owner 2026-08-09 round 2): it also replays
  // when the intro reverse-replay re-forms the brand lockup. It rides the
  // layers' existing uBurst mechanism (radial-from-center push + staggered
  // kill + parked respawn → LIFE_REGROW regrowth), composed into CRUST-role
  // layers only. These knobs shape its envelope.
  /** Peak uBurst the envelope ramps to (~0.9, next to the intro reform's
   * 0.92 — high enough that the staggered kill clears the whole crust). */
  sporeAutoBurstPeak: number;
  /** Seconds 0 → peak — the visible center-out explosion (owner spec:
   * ~0.5–0.7s). */
  sporeAutoBurstRamp: number;
  /** MINIMUM seconds held at peak so the staggered kill completes across the
   * crust. Owner 2026-08-09: HeroLogo pins the burst clock at the end of this
   * hold until the mark commits to its flight right (round 2: releases
   * mid-flight at flightRef ≥ 0.30, no longer at full arrival), so the actual
   * peak dwell stretches through the lockup (the fall never starts early). */
  sporeAutoBurstHold: number;
  /** Seconds peak → 0. Dropping under the sim's 0.05 respawn threshold is
   * what releases the standard LIFE_REGROW-paced regrowth. */
  sporeAutoBurstFall: number;
  /** Dev re-fire trigger: set to any NEW number to replay the burst envelope,
   *   window.__sersanFx.getState().set({ sporeAutoBurstFire: Date.now() })
   * (bypasses the one-shot / soft-entry latches — it is a tuning handle). */
  sporeAutoBurstFire: number;
  /** Wordmark-entry fraction 0..1 at which the auto-burst FIRES (owner
   * 2026-08-07: anticipated — was the assembleDone edge, i.e. effectively
   * 1.0; owner 2026-08-09 round 2: earlier again, 0.75 → 0.55).
   * entryProgressRef (HeroTextParticles' module-scope shared ref) crossing
   * this releases the envelope, so the explosion lands while the wordmark is
   * still settling. The mark-side guard (introReformClock ≥
   * INTRO_REFORM_RELEASE ≈ 2.07s) still applies — and at 0.55 (≈1.98s of the
   * 3.6s entry) it is the binding edge: net fire ≈2.07s. */
  sporeAutoBurstAt: number;
  // GRAVITATIONAL FLYBY / ACCRETION (owner 2026-08-07, v2 the same day) —
  // the home eclipse publishes its apparent center + a 0..1 envelope
  // (holeField in HomeSingularity.tsx). CRUST spores caught in the well
  // DETACH, travel to the hole, flash and DIE there (respawning at home on
  // the LIFE_REGROW cycle); the wordmark WARPS visibly toward the hole's
  // live position (displacement only, no colour). These knobs scale it;
  // all responses are damped (clamped dt) at the consumers.
  /** Crust flyby pull — MODEL-space acceleration at full falloff × envelope
   * (same force family as the layer's PUSH, through the same spring
   * integration; far-field lean ≈ pull/SPRING model units). The ACCRETION
   * capture boost (holeCapture) multiplies this inside the capture band.
   * 0 disables the whole crust interaction. */
  holePullCrust: number;
  /** Wordmark flyby warp — WORLD-unit displacement at full falloff ×
   * envelope. Displacement only, NO colour change. Owner v2 ("la scritta
   * non si distorce"): raised 0.14 → 0.9 so the warp is unmistakable —
   * ≈0.6 world ≈ 55–60px on the glyph edges nearest the hole at peak,
   * ≈30px on the far edge (a visible bend gradient), breathing 0→peak
   * with the orbit's proximity envelope and relaxing to exactly 0 at far
   * phase. 0 disables. */
  holePullText: number;
  /** Flyby falloff radius in WORLD units at the consumer's content plane
   * (HeroLogo converts to model units via the group scale). NOTE: the
   * brief's "~1.5× the mouse radius" does not survive the real geometry —
   * the hole's APPARENT center sits ~4.5–6.5 world units below the lockup
   * even at nearest approach (camera-ray projection ≈ ×6.8), so the well
   * must span that gap to produce any lean at all. */
  holePullRadius: number;
  /** ACCRETION capture boost (owner v2: "le spore vanno verso il buco nero
   * ed esplodono"). Inside the capture band (distance < holePullRadius×0.6,
   * envelope past the kernel's 0.15→0.35 gate) the attraction is multiplied
   * by 1 + holeCapture·(1−d/band)² — a quadratic runaway that beats the
   * home spring, so near-edge spores detach and genuinely fall in. At 30
   * (default) the pull at the horizon ≈ 250 model-units/s² vs the spring's
   * ≈ 79 at that stretch — gravity wins the whole descent. 0 restores the
   * v1 pull-only lean. */
  holeCapture: number;
  /** ACCRETION horizon (kill) radius in WORLD units at the mark's content
   * plane — spores inside it die burst-style (flash → shrink → respawn at
   * home at LIFE_REGROW pace). Default 0.9 ≈ the black core's PROJECTED
   * apparent scale: march radius 0.13 on the unit sphere → apparent radius
   * ≈ 7.9vh → × the ≈11.47-world view height at the mark plane ≈ 0.91
   * world. Never set 0 (HeroLogo floors it — equal smoothstep edges would
   * NaN the life buffer). */
  holeKillRadius: number;
  // Particle field
  particleOpacity: number;
  // GPGPU hero STATIC fallback (HeroLogo "particles-static") — the few
  // live-tunable render/dispersion knobs. Full param set + defaults live in
  // gpgpu/gpgpuConfig.ts; these override it. (The spore-mode forces are baked
  // per layer in the ACTIVE variant — sporePresets.ts; the retired sim knobs
  // gpgpuSpring/gpgpuDamping/gpgpuTurbBase were removed in C3.)
  /** Analytic-dispersion push strength near the cursor. */
  gpgpuPush: number;
  /** Analytic-dispersion radius in model space. */
  gpgpuRadius: number;
  /** Sprite size in device px (before perspective scale). */
  gpgpuPointSize: number;
  /**
   * Disc-center sprite alpha. High (~0.85) so neighbouring sprites overlap into
   * a continuous velvety SKIN rather than reading as separate dots.
   */
  gpgpuPointAlpha: number;
  /**
   * HDR emissive / at-rest glow multiplier on the particle render color.
   * Pushes the resting violet mark across the Bloom threshold so it reads as a
   * softly-glowing centerpiece; fast cyan motes bloom harder. Default from
   * gpgpuConfig.EMISSIVE.
   */
  gpgpuEmissive: number;
  /**
   * Max mouse-parallax tilt in radians (~0.06–0.10 ≈ 3.5–6°). The ANCHORED mark
   * eases this many radians toward the cursor (yaw from pointer-X, pitch from
   * pointer-Y) on top of its fixed rest tilt, returning to rest when centered.
   * This is NOT drag/rotation — the mark stays put and only "looks" at the
   * cursor. Set 0 for a fully static mark.
   */
  gpgpuTilt: number;
  // Pointer fluid (WebGPU/TSL path only — see PostFXNodes). A barely-there
  // liquid-glass refraction of the scene around the cursor.
  /** Max UV displacement of the scene sample, in screen fraction (~0.004–0.01). */
  fluidStrength: number;
  /** Per-frame flowmap accumulation fade (ping-pong), ~0.92–0.97. */
  dissipation: number;
  /** Gaussian splat radius in flowmap-UV units (~0.04–0.12). */
  splatRadius: number;
  // Cinematic scroll camera (lookAt-ahead tilt — full tier only)
  /** How far AHEAD along the curve the camera aims, in curve-param units (0..1). */
  lookAhead: number;
  /**
   * Scales the look target's X/Z offset before lookAt, so the camera yaws/pitches
   * only a few degrees. Keeps hero/section text stable (1 = full curve offset).
   */
  lookTiltScale: number;
  /**
   * Base view-space ROLL scale: the camera banks into serpentine bends by
   * rolling ∝ the curve tangent.x at the look-ahead point. Damped + clamped to
   * a few degrees (see CAM_ROLL_MAX in SignatureLine). Full tier only; every
   * billboard inherits camera.quaternion so the roll needs no re-registration.
   * Per-route biased by routeFx.cameraRollScale (0 = flat). 0 disables roll.
   */
  camRoll: number;
  /** Cinematic camera rig — breathing dolly-Z: max pull-back (world units)
   * reached at full flick velocity. Translation-only, damped, and gated to 0
   * while the page sits at the top (intro/brand registration). */
  camDollyMax: number;
  /** Arrival-orbit lateral sweep amplitude (world units) around the route's
   * ritual anchor (home: the gateway). Exactly 0 AT the anchor, so settles
   * always land back at head-on framing. 0 disables. */
  camOrbitAmp: number;
  /** Pointer micro-parallax amplitude on the camera (world units, x-axis;
   * y uses 0.7×). Full tier only; coarse pointers never feed it. */
  camParallax: number;
  set: (partial: Partial<Omit<FxState, "set">>) => void;
}

export const useFxStore = create<FxState>((set) => ({
  colorA: "#3BE1FF",
  colorB: "#2A7FFF", // was violet #7C5CFF; value now blue (site-wide de-violet)
  colorHot: "#EAF6FF",
  emissive: 2.8,
  glowFalloff: 1.6,
  headSharp: 0.012,
  flowSpeed: 0.06,
  fresnelPower: 2.5,
  scatter: 0.4,
  radiusFactor: 0.013,
  curlTubeIntensity: 0.5,
  bloomIntensity: 1.1,
  bloomThreshold: 1.0,
  bloomRadius: 0.7,
  noiseOpacity: 0.025,
  vignetteDarkness: 0.55,
  heroEmissive: 2.6,
  heroPulseSpeed: 0.45,
  // Framing the mark as a sober, FULLY-VISIBLE particle logo on the hero right.
  // RAISED 0.17 → 0.21 for the hexagon (owner, 2026-08-19): the mark is
  // height-anchored and the new one is 38% narrower than the old two-S plate,
  // so at 0.17 it lost real optical mass. 0.21 puts the visual area back where
  // it was — baseScale = WORLD_VIEW_HEIGHT(≈11.19)×0.21 ≈ 2.35 → ~3.8w×4.7h at
  // world x = worldViewWidth×0.2, still inside the viewport across desktop
  // aspect ratios.
  //
  // The ceiling is the LOCKUP, not the hero: the lockup's half-height in vh is
  // exactly heroScale×LOCKUP_SCALE(0.66)×100, and its centre sits ≈22vh from
  // the frame top, so the mark's top edge is 22 − 13.9 ≈ 8.1vh — still clear of
  // the ~7vh header band. Past ≈0.225 the lockup starts to tuck under it.
  heroScale: 0.21,
  heroOffsetX: 0.2,
  heroOffsetY: 0.0,
  heroPosZ: -0.3,
  // SHIPPING hero: the DDD spore mode (instanced shaded spheres — blue
  // erodible crust + glowing cyan core — on the compute momentum sim). Loads
  // with the page like the rest of the WebGL scene; on browsers without true
  // WebGPU compute, HeroLogo degrades it to the robust static-particle mark
  // automatically. Other modes remain debug toggles via window.__sersanFx.
  heroRenderMode: "spores",
  // Default variant: blue/cyan, NO violet (the boss's brief). Swap live from
  // the Logo Lab; bake the winner by changing DEFAULT_SPORE_PRESET_ID.
  heroPreset: DEFAULT_SPORE_PRESET_ID,
  sporeSize: 1.0,
  sporeEmissive: SPORE_LAYER.spore.EMISSIVE,
  // Attractor orbit defaults from gpgpuConfig (single source of truth) —
  // rest state is identical at any value (falloff-gated); these only shape
  // the hover/burst swirl.
  sporeAttractor: DEFAULT_GPGPU_CONFIG.ORBIT,
  sporeOrbitFalloff: DEFAULT_GPGPU_CONFIG.ORBIT_FALLOFF,
  // Intro-completion crust auto-burst envelope (HeroLogo one-shot).
  sporeAutoBurstPeak: 0.9,
  sporeAutoBurstRamp: 0.6, // owner spec ~0.5–0.7s to peak
  sporeAutoBurstHold: 0.18,
  sporeAutoBurstFall: 0.35,
  sporeAutoBurstFire: 0,
  sporeAutoBurstAt: 0.55, // round 2: ~55% of the entry (≈1.98s of 3.6s; mark guard ≈2.07s binds)
  // Flyby/accretion defaults (owner v2). Crust: far-field lean ≈ 12/22 ≈
  // 0.55 model units × falloff × envelope; inside the capture band the
  // ×(1+30·capT²) boost takes over and near-edge spores fall in and die at
  // the 0.9-world horizon (derivations on the interface docs above). Text:
  // 0.9 × falloff(0.36–0.68 across the wordmark at nearest approach) ≈
  // 0.32–0.61 world ≈ 31–59 px @1080 — an unmistakable, gradient bend that
  // breathes with the orbit (envelope: rest ≈ 0.58, near 1, far 0). Radius
  // 9 ≈ 80vh: the well spans the horizon→lockup gap (holePullRadius doc).
  holePullCrust: 12,
  holePullText: 0.9, // was 0.14 (v1 "a few px") — owner v2: visible warp
  holePullRadius: 9,
  holeCapture: 30,
  holeKillRadius: 0.9,
  particleOpacity: 0.35,
  gpgpuPush: DEFAULT_GPGPU_CONFIG.PUSH,
  gpgpuRadius: DEFAULT_GPGPU_CONFIG.RADIUS,
  gpgpuPointSize: DEFAULT_GPGPU_CONFIG.POINT_SIZE,
  gpgpuPointAlpha: DEFAULT_GPGPU_CONFIG.POINT_ALPHA,
  gpgpuEmissive: DEFAULT_GPGPU_CONFIG.EMISSIVE,
  gpgpuTilt: 0.06, // ~3.4° max parallax tilt toward the cursor (sober)
  fluidStrength: 0.006,
  dissipation: 0.96,
  splatRadius: 0.07,
  // Cinematic scroll camera (full tier only). lookAhead/lookTiltScale are back at
  // the SHIPPED values (0.05/0.2): raising lookTiltScale to 0.45 over-pitched the
  // camera at the hero and pushed the "Sersan AI" wordmark + right-hand logo out
  // of frame (regression). The added cinematic bank now comes ENTIRELY from
  // camRoll (view-axis roll), which leans into curve bends WITHOUT changing the
  // lookAt framing — so the hero stays framed.
  lookAhead: 0.05,
  lookTiltScale: 0.2,
  camRoll: 0.12, // × tangent.x, then clamped to CAM_ROLL_MAX (~2.6°) in SignatureLine
  camDollyMax: 1.15,
  camOrbitAmp: 0.34,
  camParallax: 0.07,
  set: (partial) => set(partial),
}));
