/**
 * Production-grade per-panel line pulse — a single transient float bumped by
 * the ProductionGrade DOM panels (route bundle) and decayed-back-written by
 * SignatureLine (lazy WebGL island), folded into the signature line's emissive
 * boost near the production section (BEAT 1, PIANO_RESTYLE §4 / §9.6).
 *
 * Mirrors sectionStore.pulse's writer/reader discipline exactly: the store
 * holds a 0..1 TARGET, never a per-frame increment. The DOM panels bump it to
 * 1 on each in-view edge; SignatureLine.useFrame decays it toward 0 via
 * THREE.MathUtils.damp and writes the damped value back, so the value stays
 * render-loop-agnostic and the section bus's single-writer discipline is left
 * untouched (we use a dedicated field instead of hijacking sectionStore.pulse).
 */
import { create } from "zustand";

interface ProductionPulseState {
  /**
   * Per-panel pulse TARGET, 0..1. Bumped to 1 by the ProductionGrade DOM
   * panels (route bundle) on each in-view beat; decayed toward 0 per-frame by
   * SignatureLine (WebGL island, via THREE.MathUtils.damp) which writes the
   * damped value back. The store holds the target, never a per-frame
   * increment, so the value stays render-loop-agnostic.
   */
  pulse: number;
  /** Bump to 1 (writer: the DOM panels). Idempotent re-bump is fine. */
  bump: () => void;
  /** Decay write-back (reader: SignatureLine). */
  setPulse: (pulse: number) => void;
}

const createProductionPulseStore = () =>
  create<ProductionPulseState>((set) => ({
    pulse: 0,
    bump: () => set({ pulse: 1 }),
    setPulse: (pulse) => set({ pulse }),
  }));

declare global {
  // eslint-disable-next-line no-var
  var __sersanProductionPulseStore:
    | ReturnType<typeof createProductionPulseStore>
    | undefined;
}

/**
 * Pinned on globalThis: this field is WRITTEN by the route bundle
 * (production-grade-section.tsx) and READ by the lazy WebGL island
 * (SignatureLine) — exactly the cross-bundle split that desynced textMorphStore
 * and sectionStore in prod (Turbopack inlines separate copies of small store
 * modules per chunk → two live zustand instances, writer/reader split). The
 * global pin makes every bundled copy resolve to the single real store.
 */
export const useProductionPulseStore = (globalThis.__sersanProductionPulseStore ??=
  createProductionPulseStore());
