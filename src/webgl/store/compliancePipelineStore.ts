/**
 * Compliance-pipeline signal store — the 3D↔DOM bridge for the /trust
 * CompliancePipeline3D centerpiece (step 7).
 *
 * WRITER: the focusable DOM hotspot layer in compliance-pipeline.tsx (route
 * bundle) — on focus/hover of a stage hotspot it sets `hovered` and bumps that
 * stage's `pulse[i]` to 1. READER: CompliancePipeline3D.useFrame (lazy WebGL
 * island), via `.getState()` — never a hook in the loop.
 *
 * Mirrors sectionStore.pulse / productionPulseStore's writer/reader discipline:
 * the store holds 0..1 pulse TARGETS, never a per-frame increment. The WebGL
 * reader decays each pulse toward 0 with THREE.MathUtils.damp and writes the
 * damped value back, skipping the write once settled (<0.001) — so the value
 * stays render-loop-agnostic and the idle reader never churns the store. We use
 * a DEDICATED store here rather than hijacking sectionStore.pulse (one signal
 * store per surface, per state-management.md).
 *
 * On WebGL2-fallback / off / lite the reader never mounts, so the DOM writer's
 * sets are harmless no-ops — the DOM hotspot layer is identical on every tier.
 *
 * GLOBALTHIS PIN: written by the route bundle (compliance-pipeline.tsx) and read
 * by the lazy WebGL island (CompliancePipeline3D) — the exact cross-bundle split
 * that desynced textMorphStore/sectionStore in prod (Turbopack inlines a copy of
 * small store modules per chunk → two live instances, writer/reader split). The
 * global pin makes every bundled copy resolve to the single real store.
 */
import { create } from "zustand";
import { STAGE_COUNT } from "../gpgpu/linkedParticlesConfig";

interface CompliancePipelineState {
  /** Focused/hovered stage index 0..5, or -1 when none. */
  hovered: number;
  /**
   * Per-stage ignition pulse TARGETS, 0..1 (length STAGE_COUNT). Bumped to 1 by
   * the DOM hotspot on focus/hover; decayed toward 0 per-frame by the WebGL
   * reader (THREE.MathUtils.damp) which writes the damped array back.
   */
  pulse: number[];
  /** Sets the hovered stage (-1 clears). Idempotent re-set is a no-op. */
  setHovered: (index: number) => void;
  /** Bump a stage's pulse to 1 (writer: the DOM hotspot). */
  bump: (index: number) => void;
  /** Decay write-back of the whole pulse array (reader: CompliancePipeline3D). */
  setPulse: (pulse: number[]) => void;
}

const createCompliancePipelineStore = () =>
  create<CompliancePipelineState>((set, get) => ({
    hovered: -1,
    pulse: new Array(STAGE_COUNT).fill(0),
    setHovered: (index) => {
      if (get().hovered === index) return;
      set({ hovered: index });
    },
    bump: (index) => {
      if (index < 0 || index >= STAGE_COUNT) return;
      const next = get().pulse.slice();
      next[index] = 1;
      set({ pulse: next });
    },
    setPulse: (pulse) => set({ pulse }),
  }));

declare global {
  // eslint-disable-next-line no-var
  var __sersanCompliancePipeline:
    | ReturnType<typeof createCompliancePipelineStore>
    | undefined;
}

export const useCompliancePipelineStore = (globalThis.__sersanCompliancePipeline ??=
  createCompliancePipelineStore());
