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
  resolve: () => void;
  degrade: () => void;
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

export const useTierStore = create<TierState>((set, get) => ({
  tier: "off",
  resolved: false,
  resolve: () => set({ tier: detectTier(), resolved: true }),
  degrade: () => {
    const { tier } = get();
    if (tier === "full") set({ tier: "lite" });
    else if (tier === "lite") set({ tier: "off" });
  },
}));
