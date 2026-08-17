"use client";

/**
 * useNeuralLatticeFallback — decides whether the DOM SVG neural-graph fallback
 * (neural-graph-fallback.tsx) should render, i.e. whether the WebGL
 * NeuralLattice island is ABSENT for this client.
 *
 * The island mounts in Scene.tsx ONLY on `island && webgpuEnabled()`, where
 * `island = fxBudget.level >= 2` (mobile-parity plan Phase 4a — by construction
 * identical to the former `tier === "full" || phoneGL`: tier full ⇒ level 3,
 * lite+coarse+phoneGL ⇒ level 2, everything else ≤ 1; and it follows
 * stepDownBudget() 2 → 1). Home route is already implied by where the sections
 * live. This hook returns the EXACT complement of that mount condition,
 * resolved after the tier probe:
 *
 *   show fallback  ⇔  resolved && !(fxBudget.level >= 2 && webgpuEnabled())
 *
 * So the SVG shows on: off / reduced-motion (level 0), a phone that fails the
 * capability probe or was stepped down (level 1 — today's production
 * behaviour), a narrow fine-pointer window (level 1), and the classic flag-OFF
 * WebGLRenderer build. When the flag is ON and the client is either a
 * full-tier desktop OR a capable phone, the WebGL lattice carries the visual
 * (including on WebGPURenderer's WebGL2 *fallback* backend, exactly like
 * RailPlanes — it is not compute-gated).
 *
 * THIS IS A COMPLEMENT, NOT A LAYOUT CHOICE — it is the one of the 13 `tier`
 * call sites that had to move with Scene.tsx's lattice gate. If the two ever
 * ship out of step, a capable phone renders the SVG neural graph AND the WebGL
 * lattice stacked on each other. Change them together, always.
 *
 * Returns false until the tier probe resolves, so SSR/first-paint never shows a
 * fallback that would then be replaced — matching resource-preview.tsx's tier
 * read. `resolve()` writes tier, phoneGL and fxBudget in a single set(), so
 * there is no intermediate state where one has landed and the other has not.
 * The WebGL flag is inlined at build time (NEXT_PUBLIC_WEBGPU), so the
 * webgpuEnabled() branch is static and tree-shakeable.
 */
import { useTierStore } from "@/webgl/store/tierStore";
import { webgpuEnabled } from "@/webgl/renderer/createRenderer";

export function useNeuralLatticeFallback(): boolean {
  const level = useTierStore((s) => s.fxBudget.level);
  const resolved = useTierStore((s) => s.resolved);
  if (!resolved) return false;
  return !(level >= 2 && webgpuEnabled());
}
