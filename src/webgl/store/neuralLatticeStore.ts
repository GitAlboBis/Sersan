/**
 * Neural-lattice signal store — the 3D↔DOM bridge for the FIX 3 NeuralLattice
 * island (the unified neural-lattice that replaces the Problem section's
 * IncidentConsole and the ProductionGrade section's three file panels).
 *
 * WRITER: the two route-bundle DOM sections (problem-section.tsx,
 * production-grade-section.tsx) — on each section's in-view edge they bump that
 * surface's per-cluster pulse targets to 1. READER: NeuralLattice.useFrame
 * (lazy WebGL island), via `.getState()` — never a hook in the loop.
 *
 * Mirrors compliancePipelineStore / productionPulseStore's writer/reader
 * discipline EXACTLY: the store holds 0..1 pulse TARGETS, never a per-frame
 * increment. The WebGL reader decays each pulse toward 0 with
 * THREE.MathUtils.damp and writes the damped value back, skipping the write
 * once settled (<0.001) — so the value stays render-loop-agnostic and the idle
 * reader never churns the store. We use a DEDICATED store here (per
 * state-management.md: one signal store per surface family) rather than
 * hijacking sectionStore.pulse or productionPulseStore (the latter still serves
 * the signature line's BEAT 1 emissive boost; this lattice store is additive).
 *
 * On WebGL2-fallback / off / lite the reader never mounts, so the DOM writer's
 * bumps are harmless no-ops — the DOM sections are identical on every tier
 * (the SVG fallback carries the visual when the island is absent).
 *
 * GLOBALTHIS PIN: written by the route bundle and read by the lazy WebGL island
 * — the exact cross-bundle split that desynced textMorphStore/sectionStore in
 * prod (Turbopack inlines a copy of small store modules per chunk → two live
 * instances, writer/reader split). The global pin makes every bundled copy
 * resolve to the single real store.
 */
import { create } from "zustand";
import { CLUSTER_COUNT } from "../neural/neuralLatticeConfig";

/** Per-surface pulse state (three cluster targets). */
type SurfacePulse = number[]; // length CLUSTER_COUNT

interface NeuralLatticeState {
  /** Problem surface: 3 cluster pulse TARGETS (0..1). */
  broken: SurfacePulse;
  /** Production surface: 3 cluster pulse TARGETS (0..1). */
  healthy: SurfacePulse;
  /**
   * Bump all clusters of a surface to 1 (writer: the DOM section on in-view).
   * The lattice fires its packets from these; idempotent re-bump is fine.
   */
  bump: (surface: "broken" | "healthy") => void;
  /** Bump a single cluster of a surface to 1 (sequential per-panel ignition). */
  bumpCluster: (surface: "broken" | "healthy", index: number) => void;
  /** Decay write-back of a surface's whole pulse array (reader: NeuralLattice). */
  setPulse: (surface: "broken" | "healthy", pulse: SurfacePulse) => void;
}

const fresh = (): SurfacePulse => new Array(CLUSTER_COUNT).fill(0);

const createNeuralLatticeStore = () =>
  create<NeuralLatticeState>((set, get) => ({
    broken: fresh(),
    healthy: fresh(),
    bump: (surface) => set({ [surface]: new Array(CLUSTER_COUNT).fill(1) }),
    bumpCluster: (surface, index) => {
      if (index < 0 || index >= CLUSTER_COUNT) return;
      const next = get()[surface].slice();
      next[index] = 1;
      set({ [surface]: next });
    },
    setPulse: (surface, pulse) => set({ [surface]: pulse }),
  }));

declare global {
  // eslint-disable-next-line no-var
  var __sersanNeuralLattice:
    | ReturnType<typeof createNeuralLatticeStore>
    | undefined;
}

export const useNeuralLatticeStore = (globalThis.__sersanNeuralLattice ??=
  createNeuralLatticeStore());
