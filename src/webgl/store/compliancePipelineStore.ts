/**
 * Compliance-pipeline signal store — the 3D↔DOM bridge for the /trust
 * compliance-pipeline surface (step 7).
 *
 * WRITER: the focusable DOM hotspot layer in compliance-pipeline.tsx (route
 * bundle) — on focus/hover of a stage hotspot it sets `hovered` and bumps that
 * stage's `pulse[i]` to 1. READER: currently none — the WebGL echo that read
 * this (CompliancePipeline3D.useFrame, via `.getState()` — never a hook in the
 * loop) was deleted as dead code. The writer's sets are harmless no-ops, kept
 * so a revived echo re-syncs for free.
 *
 * Mirrors sectionStore.pulse / productionPulseStore's writer/reader discipline:
 * the store holds 0..1 pulse TARGETS, never a per-frame increment. The WebGL
 * reader decays each pulse toward 0 with THREE.MathUtils.damp and writes the
 * damped value back, skipping the write once settled (<0.001) — so the value
 * stays render-loop-agnostic and the idle reader never churns the store. We use
 * a DEDICATED store here rather than hijacking sectionStore.pulse (one signal
 * store per surface, per state-management.md).
 *
 * The DOM hotspot layer is identical on every tier regardless of any reader.
 *
 * GLOBALTHIS PIN: written by the route bundle (compliance-pipeline.tsx) and
 * formerly read by a lazy WebGL island — the exact cross-bundle split
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
  /** Decay write-back of the whole pulse array (for a revived WebGL reader). */
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
