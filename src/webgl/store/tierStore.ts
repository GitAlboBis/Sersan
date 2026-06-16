/**
 * Device/performance tier for the WebGL layer.
 *
 * Resolved once on the client (CanvasHost effect) so SSR markup never
 * depends on it; downgradable at runtime by drei's PerformanceMonitor
 * when sustained fps dips are detected.
 *
 *   full — desktop, capable GPU: tube line + postprocessing + extras
 *   lite — mobile / weak GPU: simplified line, no postprocessing
 *   off  — prefers-reduced-motion or no WebGL: no canvas at all
 */
import { create } from "zustand";

export type SceneTier = "full" | "lite" | "off";

interface TierState {
  tier: SceneTier;
  resolved: boolean;
  /**
   * GPU-aware render device-pixel-ratio range, resolved on the client. The
   * EFFECTS are identical at any DPR — only the render resolution differs — so
   * this lets the FULL WebGPU scene run on weak/ARM GPUs (which are fill-bound:
   * cost scales with DPR²) by starting them at a low DPR and adapting, while
   * strong desktops stay at their device DPR. `initial` is the Canvas's starting
   * dpr; AdaptiveResolution steps within [min, max] on fps dips/headroom.
   */
  dprInitial: number;
  dprMin: number;
  dprMax: number;
  /** True once the WebGL hero (the procedural Saturn) has rendered its first
   *  frame. Gates the hero drag-to-rotate capture layer so dragging only
   *  arms once the planet is live. */
  heroReady: boolean;
  resolve: () => void;
  degrade: () => void;
  setHeroReady: (ready: boolean) => void;
}

function detectTier(): SceneTier {
  if (typeof window === "undefined") return "off";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return "off";
  }
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    if (!gl) return "off";
  } catch {
    return "off";
  }
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse || window.innerWidth < 768) return "lite";
  return "full";
}

type GpuClass = "weak" | "mid" | "strong";

/**
 * Rough GPU strength from the WebGL UNMASKED_RENDERER string. Heuristic, not a
 * contract (the string is non-standard + may be hidden), so it only picks the
 * STARTING render resolution — AdaptiveResolution then climbs/drops from there.
 *   weak   — mobile/ARM tile GPUs (incl. Snapdragon/Adreno on Windows-ARM): very
 *            fill-bound, must start low.
 *   mid    — desktop integrated (Intel UHD/Iris).
 *   strong — discrete / Apple Silicon / unknown-but-capable: unchanged behaviour.
 */
function detectGpuClass(): GpuClass {
  if (typeof window === "undefined") return "strong";
  try {
    const probe = document.createElement("canvas");
    const gl = (probe.getContext("webgl2") ??
      probe.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return "mid";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const r = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
      : "";
    if (/adreno|mali|powervr|qualcomm/i.test(r)) return "weak";
    if (/intel|\bUHD\b|Iris/i.test(r)) return "mid";
    return "strong";
  } catch {
    return "mid";
  }
}

/**
 * GPU-aware DPR range, clamped to the device dpr (never supersample beyond it).
 * Weak/ARM starts at 1.0 (≈4× fewer pixels than dpr 2 on a hi-DPI screen) and
 * may climb to 1.5; strong desktops are unchanged (start at their device dpr).
 */
function detectDprRange(): { initial: number; min: number; max: number } {
  if (typeof window === "undefined") return { initial: 2, min: 1, max: 2 };
  const device = Math.min(window.devicePixelRatio || 1, 2);
  const clamp = (n: number) => Math.min(device, n);
  switch (detectGpuClass()) {
    case "weak":
      return { initial: clamp(1.0), min: clamp(1.0), max: clamp(1.5) };
    case "mid":
      return { initial: clamp(1.25), min: clamp(1.0), max: clamp(1.75) };
    default:
      return { initial: clamp(2.0), min: clamp(1.0), max: clamp(2.0) };
  }
}

export const useTierStore = create<TierState>((set, get) => ({
  tier: "off",
  resolved: false,
  dprInitial: 2,
  dprMin: 1,
  dprMax: 2,
  heroReady: false,
  resolve: () => {
    const dpr = detectDprRange();
    set({
      tier: detectTier(),
      resolved: true,
      dprInitial: dpr.initial,
      dprMin: dpr.min,
      dprMax: dpr.max,
    });
  },
  degrade: () => {
    const { tier } = get();
    if (tier === "full") set({ tier: "lite", heroReady: false });
    else if (tier === "lite") set({ tier: "off", heroReady: false });
  },
  setHeroReady: (heroReady) => set({ heroReady }),
}));
