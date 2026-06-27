/**
 * SPORE HERO — VARIANT PRESETS ("Logo Lab")
 * ==========================================================================
 * The boss wants to PICK the hero-logo look from several options: he dislikes
 * the outer VIOLET crust and the site palette is blue/cyan. This file is the
 * single registry of selectable variants, each a full re-spec of the spore
 * hero (HeroLogo "spores" mode) — colours, particle physics, the hover/erode
 * feel and the regrow speed — so they can be switched LIVE from the Logo Lab
 * overlay (`components/fx/logo-lab.tsx`) and the winner baked as the default.
 *
 * WHAT A VARIANT CONTROLS (everything the boss asked to "play with"):
 *   • colours          → layer.spore.ALBEDO / EMISSION / ALBEDO_MUL / RIM
 *   • light            → layer.spore.EMISSIVE / BASE_EMISSION
 *   • hover push       → layer.config.PUSH
 *   • "wavelength"     → layer.config.RADIUS (cursor influence reach) + ORBIT
 *   • speed            → layer.config.MAX_SPEED / DAMPING / SPRING
 *   • particle life    → layer.spore.LIFE_DECAY (how readily a hovered spore
 *                        dies), LIFE_DIE (ghost-flight length)
 *   • regrow speed     → layer.spore.LIFE_REGROW / LIFE_HEAL (slow vs fast)
 *   • single vs double → 1 layer (no outer crust) or 2 (crust + glowing core)
 *   • the revealed hole→ preset.occluder colour
 *
 * SHADING CONTRACT (so the numbers below read true — see gpgpuNodeSim
 * createSporeComputeNodeBuild.colorNode):
 *   restColour ≈ ALBEDO·ALBEDO_MUL·(ambient≈0.32..0.46 + lambert·0.95)·ao
 *                + EMISSION·BASE_EMISSION·(0.55..1)         [always-on glow]
 *   hotColour  += mix(ALBEDO, EMISSION, t)·t²·EMISSIVE      [t = speed/regrow]
 *   rim        += EMISSION · RIM · (0.25 + t·0.75)          [silhouette wrap]
 * So: a layer with BASE_EMISSION 0 reads as DIM ALBEDO at rest (the old crust
 * was violet·0.25 ≈ near-black); to make a crust the boss can SEE as blue at
 * rest, raise ALBEDO_MUL (~0.4) and/or give it a small BASE_EMISSION (~0.12).
 * Anything that wants to bloom must push its lit/emission colour over ~1.0.
 *
 * All [r,g,b] are linear 0..1 (fed to THREE.Color.fromArray). NO violet: blue
 * channel leads, red kept low, so nothing reads purple.
 *
 * Anchored to the live engine types — adding a field to GpgpuConfig /
 * SporeRenderConfig is a compile error here until every preset supplies it.
 */
import {
  DEFAULT_GPGPU_CONFIG,
  type GpgpuConfig,
  type SporeRenderConfig,
} from "./gpgpuConfig";

/** One shell of a variant: its physics (config), how it is sampled onto the
 * mark surface, and its spore-render look. Mirrors the SPORE_LAYER shape. */
export interface SporeLayerSpec {
  /** Human label (debug only). */
  role: "crust" | "core" | "solo";
  config: GpgpuConfig;
  sampling: { frontBias: number; normalOffset: number; volumeJitter: number };
  spore: SporeRenderConfig;
}

export interface SporePreset {
  id: string;
  /** Shown big in the picker. */
  name: string;
  /** One line under the name — what makes this one different. */
  blurb: string;
  /** Loose grouping for the picker UI. */
  group: "colour" | "behaviour" | "single";
  /**
   * OUTER shell FIRST. Two layers = erodible crust over a calmer glowing core
   * (the revealed layer). One layer = no outer crust (the boss's "remove the
   * outer layer") — the lone shell must self-glow (BASE_EMISSION > 0) so the
   * mark is visible at rest.
   */
  layers: SporeLayerSpec[];
  /** Colour of the solid mark behind the shells — what shows in eroded gaps. */
  occluder: [number, number, number];
}

// ===========================================================================
// Base shells + deep-merge factories — every preset is a small override of one
// of these, so a variant only states what it CHANGES.
// ===========================================================================

const CRUST_BASE: SporeLayerSpec = {
  role: "crust",
  // Under-damped momentum: sprays on hover, hangs, eases back over ~1–2s.
  config: {
    ...DEFAULT_GPGPU_CONFIG,
    SPRING: 30,
    DAMPING: 5,
    PUSH: 70,
    RADIUS: 0.5,
    MAX_SPEED: 5,
    TURB_BASE: 0.03,
    TURB_MOVE: 1.6,
    TURB_DISP_K: 5,
    ORBIT: 0.6,
    ORBIT_FALLOFF: 2.0,
  },
  sampling: { frontBias: 0.3, normalOffset: 0.022, volumeJitter: 0.015 },
  spore: {
    DIAMETER_RATIO: 1 / 47,
    VAR_MIN: 0.7,
    VAR_MAX: 1.45,
    // Blue-leaning by default (no violet); presets recolour freely.
    ALBEDO: [0.12, 0.42, 0.92],
    // Raised from the old 0.25 so a BLUE crust reads as blue at rest, not
    // near-black like the original violet crust did.
    ALBEDO_MUL: 0.42,
    EMISSION: [0.1, 0.9, 1.3],
    EMISSIVE: 2.2,
    RIM: 0.5,
    SPEED_COLOR_K: 0.55,
    // A whisper of always-on glow so the resting crust has presence in blue.
    BASE_EMISSION: 0.12,
    LIFE_DECAY: 40,
    LIFE_HEAL: 0.2,
    LIFE_DIE: 1.2,
    LIFE_REGROW: 1.0,
  },
};

const CORE_BASE: SporeLayerSpec = {
  role: "core",
  // Pinned: stiff spring, whisper push, tiny speed clamp → it shivers, never
  // leaves, so the cursor can't punch a hole through to the occluder.
  config: {
    ...DEFAULT_GPGPU_CONFIG,
    SPRING: 70,
    DAMPING: 11,
    PUSH: 4,
    RADIUS: 0.35,
    MAX_SPEED: 1.2,
    TURB_BASE: 0.02,
    TURB_MOVE: 0.2,
    TURB_DISP_K: 6,
    ORBIT: 0.6,
    ORBIT_FALLOFF: 2.0,
  },
  sampling: { frontBias: 0.3, normalOffset: 0.002, volumeJitter: 0.006 },
  spore: {
    DIAMETER_RATIO: 1 / 47,
    VAR_MIN: 0.8,
    VAR_MAX: 1.05,
    ALBEDO: [0.55, 0.95, 1.0],
    ALBEDO_MUL: 0.8,
    EMISSION: [0.2, 0.95, 1.3],
    EMISSIVE: 2.2,
    RIM: 0.7,
    SPEED_COLOR_K: 0.55,
    BASE_EMISSION: 1.0,
    LIFE_DECAY: 0, // immortal vs the cursor (scroll burst still dissolves it)
    LIFE_HEAL: 0.3,
    LIFE_DIE: 1.15,
    LIFE_REGROW: 0.8,
  },
};

/** A self-lit single shell: erodible like a crust BUT glowing like a core, so
 * a no-outer-layer variant is still visible at rest and reveals nicely. */
const SOLO_BASE: SporeLayerSpec = {
  role: "solo",
  config: {
    ...DEFAULT_GPGPU_CONFIG,
    SPRING: 38,
    DAMPING: 6,
    PUSH: 56,
    RADIUS: 0.5,
    MAX_SPEED: 4.5,
    TURB_BASE: 0.025,
    TURB_MOVE: 1.3,
    TURB_DISP_K: 5,
    ORBIT: 0.6,
    ORBIT_FALLOFF: 2.0,
  },
  sampling: { frontBias: 0.32, normalOffset: 0.012, volumeJitter: 0.02 },
  spore: {
    DIAMETER_RATIO: 1 / 47,
    VAR_MIN: 0.75,
    VAR_MAX: 1.2,
    ALBEDO: [0.3, 0.8, 1.05],
    ALBEDO_MUL: 0.7,
    EMISSION: [0.25, 0.95, 1.35],
    EMISSIVE: 2.3,
    RIM: 0.6,
    SPEED_COLOR_K: 0.55,
    BASE_EMISSION: 0.6, // self-glows (no core beneath it)
    // Moderate decay so hover erodes it WITHOUT fully exposing the occluder.
    LIFE_DECAY: 24,
    LIFE_HEAL: 0.25,
    LIFE_DIE: 1.2,
    LIFE_REGROW: 1.0,
  },
};

type LayerOverride = {
  config?: Partial<GpgpuConfig>;
  sampling?: Partial<SporeLayerSpec["sampling"]>;
  spore?: Partial<SporeRenderConfig>;
};

function layer(base: SporeLayerSpec, o: LayerOverride = {}): SporeLayerSpec {
  return {
    role: base.role,
    config: { ...base.config, ...o.config },
    sampling: { ...base.sampling, ...o.sampling },
    spore: { ...base.spore, ...o.spore },
  };
}

const crust = (o?: LayerOverride) => layer(CRUST_BASE, o);
const core = (o?: LayerOverride) => layer(CORE_BASE, o);
const solo = (o?: LayerOverride) => layer(SOLO_BASE, o);

// A dark blue-cyan occluder (what shows through eroded gaps). Default keeps the
// gaps reading as deep shadowed blue, never a grey/black hole.
const OCC_DEEP: [number, number, number] = [0.012, 0.07, 0.13];
const OCC_TEAL: [number, number, number] = [0.01, 0.1, 0.1];
const OCC_COBALT: [number, number, number] = [0.02, 0.05, 0.16];

// ===========================================================================
// THE VARIANTS
// ===========================================================================
export const SPORE_PRESETS: SporePreset[] = [
  // --- COLOUR families (2-layer, the default "Signal" hover) ---------------
  {
    id: "azure",
    name: "Azure Signal",
    blurb: "Deep azure crust over an electric-cyan core. The new default.",
    group: "colour",
    layers: [crust(), core()],
    occluder: OCC_DEEP,
  },
  {
    id: "ice",
    name: "Ice",
    blurb: "Pale ice-blue crust, white-cyan core — bright, frosty, crisp.",
    group: "colour",
    layers: [
      crust({
        spore: {
          ALBEDO: [0.5, 0.74, 0.95],
          ALBEDO_MUL: 0.5,
          EMISSION: [0.6, 0.95, 1.2],
          BASE_EMISSION: 0.18,
          RIM: 0.6,
        },
      }),
      core({
        spore: {
          ALBEDO: [0.7, 0.92, 1.05],
          EMISSION: [0.6, 0.98, 1.3],
          EMISSIVE: 2.4,
        },
      }),
    ],
    occluder: OCC_DEEP,
  },
  {
    id: "electric",
    name: "Electric Blue",
    blurb: "Royal-blue crust, neon-cyan core, hot bloom on hover.",
    group: "colour",
    layers: [
      crust({
        spore: {
          ALBEDO: [0.1, 0.28, 1.0],
          ALBEDO_MUL: 0.4,
          EMISSION: [0.15, 0.85, 1.5],
          EMISSIVE: 2.8,
          BASE_EMISSION: 0.14,
        },
      }),
      core({
        spore: {
          ALBEDO: [0.3, 0.7, 1.1],
          EMISSION: [0.25, 0.95, 1.6],
          EMISSIVE: 2.8,
          BASE_EMISSION: 1.2,
        },
      }),
    ],
    occluder: OCC_COBALT,
  },
  {
    id: "ocean",
    name: "Deep Ocean",
    blurb: "Teal-aqua crust over an aqua core — calmer, organic, green-cyan.",
    group: "colour",
    layers: [
      crust({
        spore: {
          ALBEDO: [0.04, 0.5, 0.55],
          ALBEDO_MUL: 0.45,
          EMISSION: [0.05, 1.0, 0.95],
          BASE_EMISSION: 0.12,
        },
      }),
      core({
        spore: {
          ALBEDO: [0.3, 0.95, 0.92],
          EMISSION: [0.1, 1.0, 0.95],
        },
      }),
    ],
    occluder: OCC_TEAL,
  },
  {
    id: "steel",
    name: "Steel Frost",
    blurb: "Cool slate-blue crust, white-hot core — restrained and premium.",
    group: "colour",
    layers: [
      crust({
        spore: {
          ALBEDO: [0.34, 0.48, 0.68],
          ALBEDO_MUL: 0.5,
          EMISSION: [0.55, 0.85, 1.1],
          BASE_EMISSION: 0.1,
          RIM: 0.45,
        },
      }),
      core({
        spore: {
          ALBEDO: [0.72, 0.86, 1.0],
          EMISSION: [0.6, 0.9, 1.2],
          EMISSIVE: 2.3,
        },
      }),
    ],
    occluder: OCC_DEEP,
  },
  {
    id: "cobalt",
    name: "Cobalt Neon",
    blurb: "Near-black cobalt crust, vivid neon core — high contrast, moody.",
    group: "colour",
    layers: [
      crust({
        spore: {
          ALBEDO: [0.03, 0.14, 0.6],
          ALBEDO_MUL: 0.5,
          EMISSION: [0.2, 0.9, 1.6],
          EMISSIVE: 3.0,
          BASE_EMISSION: 0.08,
        },
      }),
      core({
        spore: {
          ALBEDO: [0.25, 0.8, 1.15],
          EMISSION: [0.25, 0.95, 1.7],
          EMISSIVE: 3.0,
          BASE_EMISSION: 1.3,
        },
      }),
    ],
    occluder: OCC_COBALT,
  },

  // --- BEHAVIOUR families (Azure palette, distinct hover/erode feel) -------
  {
    id: "strip-reveal",
    name: "Strip & Reveal",
    blurb:
      "Hover wipes the whole crust off at once and it stays gone — slow regrow.",
    group: "behaviour",
    layers: [
      crust({
        // Wide reach + hard push so the cursor strips a large area; fast death,
        // SLOW regrow so the revealed core lingers ("si toglie tutto e sparisce
        // subito, rigenerazione lenta").
        config: { PUSH: 95, RADIUS: 0.85, MAX_SPEED: 6.5, DAMPING: 4.5 },
        spore: { LIFE_DECAY: 75, LIFE_DIE: 1.6, LIFE_REGROW: 0.35, LIFE_HEAL: 0.08 },
      }),
      core(),
    ],
    occluder: OCC_DEEP,
  },
  {
    id: "instant-heal",
    name: "Instant Heal",
    blurb: "Particles scatter on hover and snap back almost instantly.",
    group: "behaviour",
    layers: [
      crust({
        config: { PUSH: 60, RADIUS: 0.45, SPRING: 42, DAMPING: 7 },
        spore: { LIFE_DECAY: 22, LIFE_DIE: 2.2, LIFE_REGROW: 2.6, LIFE_HEAL: 0.6 },
      }),
      core(),
    ],
    occluder: OCC_DEEP,
  },
  {
    id: "swirl",
    name: "Magnetic Swirl",
    blurb: "Spores orbit the cursor like a vortex before easing home.",
    group: "behaviour",
    layers: [
      crust({
        config: {
          PUSH: 48,
          RADIUS: 0.7,
          ORBIT: 2.2,
          ORBIT_FALLOFF: 1.4,
          MAX_SPEED: 6,
          DAMPING: 4,
        },
        spore: { LIFE_DECAY: 18, LIFE_REGROW: 1.4 },
      }),
      core({ config: { ORBIT: 1.0 } }),
    ],
    occluder: OCC_DEEP,
  },
  {
    id: "explosive",
    name: "Explosive",
    blurb: "A hard burst flings spores far on hover; sparse, energetic.",
    group: "behaviour",
    layers: [
      crust({
        config: { PUSH: 130, RADIUS: 0.75, MAX_SPEED: 9, DAMPING: 3.5, SPRING: 22 },
        spore: { LIFE_DECAY: 95, LIFE_DIE: 0.9, LIFE_REGROW: 0.7, SPEED_COLOR_K: 0.8 },
      }),
      core(),
    ],
    occluder: OCC_DEEP,
  },
  {
    id: "ripple",
    name: "Gentle Ripple",
    blurb: "A soft swell follows the cursor — spores lift and settle, rarely die.",
    group: "behaviour",
    layers: [
      crust({
        config: { PUSH: 34, RADIUS: 0.95, MAX_SPEED: 3, SPRING: 26, DAMPING: 6 },
        spore: { LIFE_DECAY: 5, LIFE_HEAL: 0.5, LIFE_REGROW: 1.6 },
      }),
      core(),
    ],
    occluder: OCC_DEEP,
  },
  {
    id: "liquid",
    name: "Liquid",
    blurb: "Slow, gooey displacement — spores flow away and pour back.",
    group: "behaviour",
    layers: [
      crust({
        config: { PUSH: 52, RADIUS: 0.7, MAX_SPEED: 2.6, SPRING: 16, DAMPING: 8 },
        spore: { LIFE_DECAY: 12, LIFE_DIE: 1.0, LIFE_REGROW: 0.9, LIFE_HEAL: 0.35 },
      }),
      core({ config: { SPRING: 50, DAMPING: 12 } }),
    ],
    occluder: OCC_DEEP,
  },

  // --- SINGLE-LAYER families (no outer crust — the boss's "remove it") -----
  {
    id: "solo-cyan",
    name: "Solo Cyan",
    blurb: "One glowing cyan shell, no outer crust. Erodes softly on hover.",
    group: "single",
    layers: [solo()],
    // Richer occluder: with no core beneath, eroded gaps must still read blue.
    occluder: [0.02, 0.13, 0.2],
  },
  {
    id: "solo-ice",
    name: "Solo Ice",
    blurb: "A single pale ice-blue shell — minimal, bright, frosted.",
    group: "single",
    layers: [
      solo({
        spore: {
          ALBEDO: [0.55, 0.78, 0.98],
          ALBEDO_MUL: 0.85,
          EMISSION: [0.6, 0.95, 1.25],
          BASE_EMISSION: 0.7,
          RIM: 0.7,
        },
      }),
    ],
    occluder: [0.04, 0.13, 0.2],
  },
  {
    id: "solo-strip",
    name: "Solo Strip",
    blurb:
      "Single shell that the cursor wipes clear on contact, then slowly reforms.",
    group: "single",
    layers: [
      solo({
        config: { PUSH: 90, RADIUS: 0.8, MAX_SPEED: 6.5, DAMPING: 4.5 },
        spore: { LIFE_DECAY: 55, LIFE_DIE: 1.5, LIFE_REGROW: 0.4, LIFE_HEAL: 0.1 },
      }),
    ],
    occluder: [0.02, 0.12, 0.19],
  },
];

/** The look the page ships with (blue/cyan, no violet). */
export const DEFAULT_SPORE_PRESET_ID = "azure";

const PRESET_BY_ID = new Map(SPORE_PRESETS.map((p) => [p.id, p]));

/** Resolve a preset id to its spec, falling back to the default. */
export function getSporePreset(id: string | undefined): SporePreset {
  return (id && PRESET_BY_ID.get(id)) || PRESET_BY_ID.get(DEFAULT_SPORE_PRESET_ID)!;
}
