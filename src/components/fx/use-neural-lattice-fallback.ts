"use client";

/**
 * useNeuralLatticeFallback — decides whether the DOM SVG neural-graph fallback
 * (neural-graph-fallback.tsx) should render, i.e. whether the WebGL
 * NeuralLattice island is ABSENT for this client.
 *
 * The island mounts in Scene.tsx ONLY on `island && webgpuEnabled()`, where
 * `island = tier === "full" || phoneGL` (home route is already implied by where
 * the sections live). This hook returns the EXACT complement of that mount
 * condition, resolved after the tier probe:
 *
 *   show fallback  ⇔  resolved && !((tier === "full" || phoneGL) && webgpuEnabled())
 *
 * So the SVG shows on: off / reduced-motion (tier resolves to "off"), a phone
 * that fails the capability probe (phoneGL false — today's production
 * behaviour), and the classic flag-OFF WebGLRenderer build. When the flag is ON
 * and the client is either a full-tier desktop OR a capable phone, the WebGL
 * lattice carries the visual (including on WebGPURenderer's WebGL2 *fallback*
 * backend, exactly like RailPlanes — it is not compute-gated).
 *
 * THIS IS A COMPLEMENT, NOT A LAYOUT CHOICE — it is the one of the 13 `tier`
 * call sites that had to move with Scene.tsx's lattice gate. If the two ever
 * ship out of step, a capable phone renders the SVG neural graph AND the WebGL
 * lattice stacked on each other. Change them together, always.
 *
 * Returns false until the tier probe resolves, so SSR/first-paint never shows a
 * fallback that would then be replaced — matching resource-preview.tsx's tier
 * read. `resolve()` writes tier and phoneGL in a single set(), so there is no
 * intermediate state where one has landed and the other has not. The WebGL flag
 * is inlined at build time (NEXT_PUBLIC_WEBGPU), so the webgpuEnabled() branch
 * is static and tree-shakeable.
 */
import { useTierStore } from "@/webgl/store/tierStore";
import { webgpuEnabled } from "@/webgl/renderer/createRenderer";

export function useNeuralLatticeFallback(): boolean {
  const tier = useTierStore((s) => s.tier);
  const phoneGL = useTierStore((s) => s.phoneGL);
  const resolved = useTierStore((s) => s.resolved);
  if (!resolved) return false;
  return !((tier === "full" || phoneGL) && webgpuEnabled());
}
