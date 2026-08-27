/**
 * cutStore — the live section-cut scrub, published for the camera drift
 * (TASK 6 / dossier section-transitions.md §3.4 items 4–5).
 *
 * WRITTEN ONLY by the PostFX cut driver (PostFXNodes.tsx, `CUTS_V2` path):
 * per frame while a seam window is active, cleared once on exit. READ by
 * SignatureLine (the single camera writer), which folds
 * `dolly·sin(π·u)·rigGate` into its dolly target and `roll·dir·sin(π·u)`
 * into its roll target — the camera is still written in exactly one place.
 *
 * Hot-path discipline: getState() inside frame loops only, never a React
 * subscription. The per-frame scrub (`u`) lives in the MUTABLE `live`
 * snapshot — written in place, so a scrolling frame inside a window
 * allocates nothing; zustand `set` runs only on window entry/exit (idx,
 * pairIdx, dir, dolly, roll change at event cadence). `dir` is LATCHED once
 * per window entry (reverse mid-window = mirror, like the band and dolly —
 * no one-frame roll sign flip).
 *
 * TASK C (2026-08-27, min-cycle): `live.u` is the DISPLAYED scrub — the
 * position-law value passed through the driver's rate limiter
 * (CUT_MIN_CYCLE_ON / CUT_MIN_CYCLE_S in PostFXNodes) — i.e. exactly what
 * the band renders, so the camera drift and the band stay in phase on a
 * fast flick. `live.uPos` is the raw position-law value (diagnostics /
 * probes); at reading pace the two are identical. NO three import — shared by the route
 * bundle and the WebGL island chunk, and pinned on globalThis for the same
 * reason seqStore / sectionStore are (Turbopack can inline separate copies
 * of small store modules per chunk, splitting writers from readers).
 */
import { create } from "zustand";

interface CutLive {
  /** DISPLAYED window scrub 0..1 (0 = edge at viewport bottom, 1 = edge at top) — rate-limited. Mutated in place per frame. */
  u: number;
  /** Raw position-law scrub (un-limited). Mutated in place per frame. */
  uPos: number;
}

interface CutState {
  /** Active seam index (driver order), −1 when no window is active. */
  idx: number;
  /** SECTION_CUTS index of the active window (−1 none) — the seam's identity for readers. */
  pairIdx: number;
  /** Per-frame scrub, mutable (never replaced while a window is active). */
  live: CutLive;
  /** Crossing direction latched at window entry (1 down, −1 up). */
  dir: 1 | -1;
  /** Per-seam dolly amplitude (world units) — the camera reads dolly·sin(πu). */
  dolly: number;
  /** Per-seam roll amplitude (radians) — the camera reads roll·dir·sin(πu). */
  roll: number;
  set: (
    idx: number,
    pairIdx: number,
    u: number,
    dir: 1 | -1,
    dolly: number,
    roll: number,
    uPos?: number,
  ) => void;
  clear: () => void;
}

const createCutStore = () =>
  create<CutState>((set, get) => ({
    idx: -1,
    pairIdx: -1,
    live: { u: 0, uPos: 0 },
    dir: 1,
    dolly: 0,
    roll: 0,
    set: (idx, pairIdx, u, dir, dolly, roll, uPos = u) => {
      const s = get();
      s.live.u = u; // hot path: in place, allocation-free
      s.live.uPos = uPos;
      if (
        s.idx === idx &&
        s.pairIdx === pairIdx &&
        s.dir === dir &&
        s.dolly === dolly &&
        s.roll === roll
      )
        return;
      set({ idx, pairIdx, dir, dolly, roll }); // event cadence only
    },
    clear: () => {
      const s = get();
      s.live.u = 0;
      s.live.uPos = 0;
      if (s.idx === -1) return;
      set({ idx: -1, pairIdx: -1, dolly: 0, roll: 0 });
    },
  }));

declare global {
  // eslint-disable-next-line no-var
  var __sersanCutStore: ReturnType<typeof createCutStore> | undefined;
}

export const useCutStore = (globalThis.__sersanCutStore ??= createCutStore());
