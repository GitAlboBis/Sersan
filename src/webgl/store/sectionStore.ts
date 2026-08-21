/**
 * Section-state bus — the single source of truth for "which section is the
 * reader in" across the whole app (DOM + WebGL).
 *
 * Written ONLY by the layout-level <SectionBus /> component (measurement,
 * IntersectionObserver identity, scroll direction), which mounts outside the
 * Canvas so the bus works on every tier — including "off" (reduced motion /
 * no WebGL), where the old useSectionAnchors writer never ran.
 *
 * Read two ways, per the repo's store discipline (see scrollStore.ts):
 * - Hot paths (useFrame / rAF): `useSectionStore.getState()` — transient,
 *   zero React re-renders per scroll tick.
 * - Reactive consumers (nav highlight, skip UI, snap rebuild): selector
 *   subscriptions on `active` / `index` / `measureVersion` — these change at
 *   section cadence (rare), never per scroll tick.
 *
 * ROUND 5 W4 (igloo section cuts): this module also owns the CUT-BOUNDARY
 * derivation — the single tunable list of "big cut" section pairs
 * (CUT_BOUNDARY_PAIRS) plus `deriveCutBoundaries`, which turns the measured
 * spans into boundary doc-fractions `cutᵢ = (spans[a].end + spans[b].start)/2`.
 * Consumed by PostFXNodes' useFrame driver, re-derived ONLY on a
 * `measureVersion` bump (allocation-free: the caller passes hoisted typed
 * arrays). See research/2026-08-21-igloo-cuts-spec.md §C.
 */
import { create } from "zustand";

/** Document-fraction span of a [data-line-anchor] element. */
export interface SectionSpan {
  /** Document fraction where the element starts. */
  start: number;
  /** Document fraction where the element ends. */
  end: number;
}

/**
 * Decorative [data-line-anchor] ids that exist purely as signature-line curve
 * waypoints (zero-height markers / transparent gaps — `work-in-progress`,
 * `gateway`, every `ritual`), never as scroll destinations. They are excluded
 * from section IDENTITY (`sections` / `active` / `index`) but still measured
 * into `spans`, because the curve geometry needs their positions.
 */
export const DECORATIVE_ANCHORS: ReadonlySet<string> = new Set([
  "work-in-progress",
  "gateway",
  "ritual",
]);

interface SectionState {
  /**
   * Ordered (DOM order) [data-line-anchor] ids of the current route that
   * count as real sections — decorative anchors excluded.
   */
  sections: string[];
  /**
   * Measured spans by anchor id, as document fractions. Contains ALL
   * anchors, including the decorative ones (curve geometry consumers —
   * useSectionAnchors — derive center fractions from these).
   */
  spans: Record<string, SectionSpan>;
  /** document.documentElement.scrollHeight at measure time. 1 = pre-measure sentinel. */
  scrollHeight: number;
  /**
   * Pathname the current spans were measured FOR ("" = pre-measure
   * sentinel). Written with every measure so curve consumers can detect the
   * route-change race: SignatureLine's geometry memo re-runs the instant
   * `pathname` flips, but the spans here still describe the PREVIOUS route
   * until SectionBus's post-paint effect re-measures — anchored waypoints
   * missing from the stale set would collapse to document top otherwise.
   */
  measuredPath: string;
  /** Bumped on every real re-measure (mount/resize/fonts/route) — consumers re-derive. */
  measureVersion: number;
  /**
   * The section id currently centered in the viewport (nearest to 50% of
   * screen height among the ≥35%-visible set), or null before the first
   * IntersectionObserver callback / when nothing qualifies.
   */
  active: string | null;
  /** Index of `active` within `sections`, -1 when null/unknown. */
  index: number;
  /** Scroll direction: 1 down, -1 up, 0 before the first scroll. Written only on flips. */
  direction: 1 | -1 | 0;
  /**
   * Section-arrival pulse TARGET, 0..1 (moved here from scrollStore's old
   * anchorPulse). Bumped to 1 when a new section becomes active; consumers
   * DECAY it toward 0 per-frame (SignatureLine, via THREE.MathUtils.damp)
   * and write the damped value back — the store holds the target, never a
   * per-frame increment, so the value stays render-loop-agnostic.
   */
  pulse: number;
  /**
   * Publishes a fresh measurement. Skips the update entirely (no
   * measureVersion bump, no curve rebuild) when nothing actually moved —
   * e.g. width-only resizes from the mobile URL bar. A `path` change always
   * counts as a real re-measure (never short-circuited), so the first
   * measure of every route bumps the version even when the new route's
   * layout happens to match the previous one.
   */
  setMeasured: (
    sections: string[],
    spans: Record<string, SectionSpan>,
    scrollHeight: number,
    path: string,
  ) => void;
  /**
   * Sets the active section and, when it actually changed, bumps `pulse`
   * to 1 and re-derives `index`. Re-setting the same id is a no-op (no
   * spurious pulse, no notify).
   */
  setActive: (id: string | null) => void;
  /** No-op unless the sign actually flips. */
  setDirection: (direction: 1 | -1 | 0) => void;
  /** Lets the per-frame consumer write back the decayed pulse value. */
  setPulse: (pulse: number) => void;
}

const createSectionStore = () =>
  create<SectionState>((set, get) => ({
    sections: [],
    spans: {},
    scrollHeight: 1,
    measuredPath: "",
    measureVersion: 0,
    active: null,
    index: -1,
    direction: 0,
    pulse: 0,
    setMeasured: (sections, spans, scrollHeight, path) => {
      const prev = get();
      const nextKeys = Object.keys(spans);
      const same =
        prev.measuredPath === path &&
        prev.scrollHeight === scrollHeight &&
        nextKeys.length === Object.keys(prev.spans).length &&
        nextKeys.every((k) => {
          const a = prev.spans[k];
          const b = spans[k];
          return (
            a !== undefined &&
            Math.abs(a.start - b.start) < 0.0005 &&
            Math.abs(a.end - b.end) < 0.0005
          );
        });
      if (same) return;
      set({
        sections,
        spans,
        scrollHeight,
        measuredPath: path,
        measureVersion: prev.measureVersion + 1,
      });
    },
    setActive: (id) => {
      const prev = get();
      if (id === prev.active) return;
      set({
        active: id,
        index: id ? prev.sections.indexOf(id) : -1,
        pulse: id ? 1 : 0,
      });
    },
    setDirection: (direction) => {
      if (direction === get().direction) return;
      set({ direction });
    },
    setPulse: (pulse) => set({ pulse }),
  }));

declare global {
  // eslint-disable-next-line no-var
  var __sersanSectionStore: ReturnType<typeof createSectionStore> | undefined;
}

/**
 * Pinned on globalThis: this module is imported from BOTH the route bundle
 * (SectionBus, future nav/snap/skip consumers) and the lazy WebGL island
 * (SignatureLine). Turbopack has inlined separate copies of small store
 * modules into each chunk in prod — two live zustand instances, writers and
 * readers split (reproduced 2026-06-10 on textMorphStore). The global pin
 * makes every bundled copy resolve to the single real store.
 */
export const useSectionStore = (globalThis.__sersanSectionStore ??=
  createSectionStore());

/**
 * Per-section progress, 0..1 — how far the viewport CENTER has traversed the
 * section's span. Pure derived helper: call it inside useFrame/rAF with
 * `useScrollStore.getState().progress` — deliberately NOT a store field, so
 * per-frame consumption never churns store notifications.
 *
 * @param id          [data-line-anchor] id
 * @param docProgress document scroll progress 0..1 (scrollStore.progress)
 * @param viewportH   window.innerHeight in px
 */
export function sectionProgress(
  id: string,
  docProgress: number,
  viewportH: number,
): number {
  const { spans, scrollHeight } = useSectionStore.getState();
  const span = spans[id];
  if (!span || scrollHeight <= 1) return 0;
  const centerFrac =
    (docProgress * Math.max(scrollHeight - viewportH, 0) + viewportH / 2) /
    scrollHeight;
  const len = span.end - span.start;
  if (len <= 0) return centerFrac >= span.start ? 1 : 0;
  return Math.min(1, Math.max(0, (centerFrac - span.start) / len));
}

// === ROUND 5 W4 — section-cut boundaries (igloo seam-sweep wipe) ===========

/**
 * The route whose sections get the cut wipe. The pairs below name HOME
 * anchors; other routes reuse some ids (`hero`, `founders`, `final-cta`), so
 * consumers must gate on this route before deriving.
 */
export const CUT_BOUNDARY_ROUTE = "/";

/**
 * THE tunable boundary list — the "big cuts" only (ROUND5-SPEC §2 W4), as
 * ordered [outgoing, incoming] pairs of home [data-line-anchor] ids. Skipped
 * on purpose:
 *  - hero→credibility (spine→passage) and credibility→problem: the
 *    singularity passage owns both of its edges (its own warp one-shot).
 *  - hero-fold→spine: NOT representable — the H1 fold and the pinned spine
 *    share the single "hero" anchor, and a mid-anchor cut would fight the
 *    spine's own scrubbed stage crossfades.
 *  - founders→process, process→fit: small cuts, add here later if wanted.
 * Decorative anchors between a pair (work-in-progress, gateway) don't break
 * adjacency — `sections` already excludes them.
 */
export const CUT_BOUNDARY_PAIRS: readonly (readonly [string, string])[] = [
  ["problem", "case-studies"], // problem → work
  ["case-studies", "services"], // work → services
  ["services", "production"], // services → production
  ["production", "founders"], // production → founders
  ["fit", "final-cta"], // fit → outro
];

/** Capacity hint for the caller's hoisted arrays. */
export const MAX_CUT_BOUNDARIES = 8;

/**
 * Fills `outCuts`/`outPairIdx` with the boundary doc-fractions
 * `cutᵢ = (spans[a].end + spans[b].start) / 2` for every CUT_BOUNDARY_PAIRS
 * entry whose two anchors are measured AND adjacent in `sections`, in
 * document order. Returns the count. Zero when the measured spans do not
 * describe CUT_BOUNDARY_ROUTE (route-change race: `measuredPath` lags the
 * live pathname until SectionBus re-measures — see the field's doc above).
 *
 * Allocation-free by contract: call it at `measureVersion`-bump cadence only
 * (never per frame) with hoisted typed arrays.
 *
 * NOTE the output space: DOC fractions (of scrollHeight), like `spans` —
 * NOT scrollStore.progress space (which runs over scrollHeight −
 * innerHeight). Consumers comparing against scroll progress must remap
 * (PostFXNodes does: cutP = (cut·sH − iH/2)/(sH − iH), which also centers
 * the boundary on the viewport).
 */
export function deriveCutBoundaries(
  outCuts: Float64Array,
  outPairIdx: Int32Array,
): number {
  const { sections, spans, measuredPath } = useSectionStore.getState();
  if (measuredPath !== CUT_BOUNDARY_ROUTE) return 0;
  let n = 0;
  for (let i = 0; i < CUT_BOUNDARY_PAIRS.length && n < outCuts.length; i++) {
    const pair = CUT_BOUNDARY_PAIRS[i];
    const ia = sections.indexOf(pair[0]);
    if (ia === -1 || sections[ia + 1] !== pair[1]) continue;
    const sa = spans[pair[0]];
    const sb = spans[pair[1]];
    if (!sa || !sb) continue;
    outCuts[n] = (sa.end + sb.start) / 2;
    outPairIdx[n] = i;
    n++;
  }
  return n;
}
