"use client";

/**
 * useNeuralLatticeFallback — decides whether the DOM SVG neural-graph fallback
 * (neural-graph-fallback.tsx) should render, i.e. whether the WebGL
 * NeuralLattice island is ABSENT for this client.
 *
 * The island mounts in Scene.tsx ONLY on `tier === "full" && webgpuEnabled()`
 * (home route is already implied by where the sections live). This hook returns
 * the EXACT complement of that mount condition, resolved after the tier probe:
 *
 *   show fallback  ⇔  resolved && !(tier === "full" && webgpuEnabled())
 *
 * So the SVG shows on: lite / off / reduced-motion (tier resolves to "off") and
 * the classic flag-OFF WebGLRenderer build. When the flag is ON and tier is
 * "full" the WebGL lattice carries the visual (including on WebGPURenderer's
 * WebGL2 *fallback* backend, exactly like RailPlanes — it is not compute-gated).
 *
 * Returns false until the tier probe resolves, so SSR/first-paint never shows a
 * fallback that would then be replaced — matching resource-preview.tsx's tier
 * read. The WebGL flag is inlined at build time (NEXT_PUBLIC_WEBGPU), so the
 * webgpuEnabled() branch is static and tree-shakeable.
 */
import { useTierStore } from "@/webgl/store/tierStore";
import { webgpuEnabled } from "@/webgl/renderer/createRenderer";

export function useNeuralLatticeFallback(): boolean {
  const tier = useTierStore((s) => s.tier);
  const resolved = useTierStore((s) => s.resolved);
  if (!resolved) return false;
  return !(tier === "full" && webgpuEnabled());
}
