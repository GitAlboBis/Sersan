/**
 * Transient state bridge between the /audit "How the week runs" pinned phased
 * timeline (the DOM component components/sections/audit-week-timeline) and the
 * signature line (the lazy WebGL island, webgl/SignatureLine) — BEAT 2,
 * research/step-6-audit-timeline.md.
 *
 * Same discipline as railStore / productionPulseStore: written from the pinned
 * section's ScrollTrigger onUpdate (never per React render), read via
 * useAuditTimelineStore.getState() inside SignatureLine's useFrame (no hooks in
 * the loop, no re-renders). The store holds the LIVE scrub progress (0..1
 * across the six Day chapters), not an eased value — SignatureLine derives the
 * six per-Day emissive ticks from it and folds them into the shared `uEmissive`
 * boost.
 *
 * WRITER: audit-week-timeline.tsx — setActive(true) on the pinned-mode
 *   ScrollTrigger create, setProgress(self.progress)/setDayIndex(...) on every
 *   onUpdate, reset() in the effect cleanup so the WebGL layer never reads a
 *   stale /audit timeline after navigation (the store outlives routes).
 * READER: SignatureLine.useFrame — gated `pathname === "/audit" && active`.
 *
 * globalThis-pinned because this module is imported by BOTH the route bundle
 * (the /audit client component) and the lazy WebGL island (SignatureLine).
 * Turbopack inlines a separate copy of a small store module into each chunk in
 * the production build → two live zustand instances, writer and reader split,
 * the effect silently dead (this is exactly how textMorphStore / sectionStore
 * desynced in prod). The global pin makes every bundled copy resolve to the
 * single real store.
 */
import { create } from "zustand";

interface AuditTimelineState {
  /** True while the desktop pinned timeline mode is active (ScrollTrigger attached). */
  active: boolean;
  /** Scrub progress 0..1 across the six Day chapters. */
  progress: number;
  /** Index of the currently-lit phase (0..count-1). */
  dayIndex: number;
  /**
   * Number of phase chapters in the live timeline.
   *
   * WHY THIS EXISTS: SignatureLine used to hard-code `const days = 6` while the
   * `week` array in audit-client.tsx exported a different number of phases, so
   * the per-phase emissive ticks drifted out of step with the DOM chapters they
   * are meant to punctuate. The count is authored in ONE place (the week array)
   * and published here, so the WebGL layer cannot disagree with the DOM.
   */
  count: number;
  setActive: (active: boolean) => void;
  setProgress: (progress: number) => void;
  setDayIndex: (dayIndex: number) => void;
  setCount: (count: number) => void;
  reset: () => void;
}

const INITIAL = {
  active: false,
  progress: 0,
  dayIndex: 0,
  /**
   * Overwritten by the writer on mount. Only a floor, so a read that lands
   * before the first write cannot divide by zero.
   */
  count: 1,
};

const createAuditTimelineStore = () =>
  create<AuditTimelineState>((set) => ({
    ...INITIAL,
    setActive: (active) => set({ active }),
    setProgress: (progress) => set({ progress }),
    setDayIndex: (dayIndex) =>
      set((s) => (s.dayIndex === dayIndex ? s : { dayIndex })),
    setCount: (count) =>
      set((s) => (s.count === count ? s : { count: Math.max(1, count) })),
    reset: () => set({ ...INITIAL }),
  }));

declare global {
  // eslint-disable-next-line no-var
  var __sersanAuditTimelineStore:
    | ReturnType<typeof createAuditTimelineStore>
    | undefined;
}

export const useAuditTimelineStore = (globalThis.__sersanAuditTimelineStore ??=
  createAuditTimelineStore());
