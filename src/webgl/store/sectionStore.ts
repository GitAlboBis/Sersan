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

/** Document-fraction CONTENT edges of a section (NaN = no marker). */
export interface SectionEdges {
  top: number;
  bottom: number;
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
  /**
   * TASK 6 (section cuts) — measured CONTENT edges per anchor id, as document
   * fractions: `top` = the section's first `[data-cut-edge="top"]` marker,
   * `bottom` = its last `[data-cut-edge="bottom"]` marker (either may be
   * missing → NaN; the cut derivation then falls back to the wrapper edge).
   * Measured by SectionBus in the same pass as `spans`.
   */
  edges: Record<string, SectionEdges>;
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
    edges?: Record<string, SectionEdges>,
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
    edges: {},
    scrollHeight: 1,
    measuredPath: "",
    measureVersion: 0,
    active: null,
    index: -1,
    direction: 0,
    pulse: 0,
    setMeasured: (sections, spans, scrollHeight, path, edges = {}) => {
      const prev = get();
      const nextKeys = Object.keys(spans);
      const edgeKeys = Object.keys(edges);
      const sameEdge = (a: number, b: number): boolean =>
        (Number.isNaN(a) && Number.isNaN(b)) || Math.abs(a - b) < 0.0005;
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
        }) &&
        edgeKeys.length === Object.keys(prev.edges).length &&
        edgeKeys.every((k) => {
          const a = prev.edges[k];
          const b = edges[k];
          return (
            a !== undefined && sameEdge(a.top, b.top) && sameEdge(a.bottom, b.bottom)
          );
        });
      if (same) return;
      set({
        sections,
        spans,
        edges,
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
 *  - problem→production (D19 merge, owner 2026-08-26): the broken act and the
 *    healthy one are now adjacent ON PURPOSE — death → rebirth reads as ONE
 *    continuous on-camera passage, so a seam-sweep there would cut the very
 *    shot the merge exists to create.
 *  - founders→process, process→fit: small cuts, add here later if wanted.
 * Decorative anchors between a pair (work-in-progress, gateway) don't break
 * adjacency — `sections` already excludes them.
 *
 * ORDER CONTRACT: every pair must be LITERALLY adjacent in `sections`, i.e.
 * this list mirrors src/app/page.tsx's DOM order. A pair that drifts out of
 * order is silently skipped below and its cut simply stops firing, with
 * nothing on screen to say so — dev builds warn once per broken pair.
 */
export const CUT_BOUNDARY_PAIRS: readonly (readonly [string, string])[] = [
  ["production", "case-studies"], // rebirth → work
  ["case-studies", "services"], // work → services
  ["services", "founders"], // services → founders
  ["fit", "final-cta"], // fit → outro
];

// === TASK 6 — SECTION_CUTS: the igloo "drift-cut" per-seam table ============
// (scratchpad dossier section-transitions.md §3.3, decisions §3.4 item 1.)
// The `CUTS_V2` driver in PostFXNodes reads THIS table; the legacy
// velocity-gated driver (`CUTS_V2 = false`) keeps reading CUT_BOUNDARY_PAIRS
// above, byte-identically. Kill-switch: `SECTION_CUTS = []` (or `amp: 0`
// per seam; `style: "none"` removes the seam from the driver entirely).

/**
 * Every home [data-line-anchor] id, in src/app/page.tsx DOM order. `out`/`in`
 * below are typed against it, so a typo in the table fails `tsc`. (page.tsx
 * itself still spells the ids as strings — renaming an anchor there must be
 * mirrored here, and the dev-only adjacency warn in deriveBoundaries catches
 * a drifted table at runtime.)
 */
export type HomeAnchorId =
  | "hero"
  | "credibility"
  | "problem"
  | "production"
  | "case-studies"
  | "work-in-progress"
  | "services"
  | "founders"
  | "process"
  | "fit"
  | "gateway"
  | "final-cta";

/** Seam vocabulary: `frost` = ice edge + crystalline uv jitter (shove ×0.6);
 *  `tech` = block displacement dominant (shove ×1.5, no jitter); the `-light`
 *  variants are the same look at a lower `amp`; `none` = no seam (the pair
 *  is skipped by the driver — kept in the table for the record). */
export type CutStyle = "frost" | "tech" | "frost-light" | "tech-light" | "none";

export interface SectionCut {
  /** Outgoing (upper) anchor. */
  out: HomeAnchorId;
  /** Incoming (lower) anchor — must be literally adjacent in `sections`. */
  in: HomeAnchorId;
  style: CutStyle;
  /** Window length in viewports of scroll (igloo: exactly 1). */
  windowVh: number;
  /** Constant band amplitude inside the window (uWipeAmp). */
  amp: number;
  /** Camera dolly-Z bump amplitude, world units (SignatureLine adds dolly·sin πu). */
  dolly: number;
  /** Camera roll bump amplitude, radians (added as roll·dir·sin πu). */
  roll: number;
  /** Scrubbed uWarpBurst peak at the crossing (spike·bump(u)); 0 = none. */
  spike: number;
  /** Fire the 140 ms DOM .cut-tick on the straddle (hysteresis-armed). */
  tick: boolean;
  /** `content` = boundary between measured [data-cut-edge] markers (falls
   *  back per side to the wrapper edge); `wrapper` = wrapper midpoint. */
  edge: "content" | "wrapper";
}

export const SECTION_CUTS: readonly SectionCut[] = [
  // S2 hero→credibility, S3 credibility→problem: no entries — the pinned
  // handoff and the passage one-shot own those edges (owner decisions).
  // S4 problem→production — D19 merge (owner 2026-08-26): NO seam by default.
  // Optional owner-visible variant, kept as a comment:
  // { out: "problem", in: "production", style: "frost-light", windowVh: 0.6, amp: 0.35, dolly: 0, roll: 0, spike: 0, tick: false, edge: "content" },
  { out: "problem", in: "production", style: "none", windowVh: 0.6, amp: 0, dolly: 0, roll: 0, spike: 0, tick: false, edge: "content" },
  // S5 production→case-studies — the reference cut.
  { out: "production", in: "case-studies", style: "frost", windowVh: 1.0, amp: 1.0, dolly: 0.35, roll: 0.006, spike: 0.5, tick: true, edge: "content" },
  // S6 case-studies→services — uWipe 1 = the services runway pin.
  { out: "case-studies", in: "services", style: "tech", windowVh: 1.0, amp: 1.0, dolly: 0.35, roll: 0.006, spike: 0.5, tick: true, edge: "content" },
  // S7 services→founders — the gate engages only at uWipe ≥ 0.98 (founders-rail).
  { out: "services", in: "founders", style: "frost", windowVh: 1.0, amp: 1.0, dolly: 0.25, roll: 0.004, spike: 0.35, tick: true, edge: "content" },
  // S8 founders→process — traversed by the gate's 0.6 s release nudge.
  { out: "founders", in: "process", style: "tech-light", windowVh: 0.8, amp: 0.6, dolly: 0.2, roll: 0, spike: 0.25, tick: true, edge: "content" },
  // S9 process→fit — DROPPED (2026-08-27 live probe): the process strip is
  // only ~286 px tall, so S8 and S9 sat 182 px apart and the neighbour-distance
  // cap shrank BOTH windows to ±91 px — two cuts flickering through in 182 px
  // of scroll. With S9 gone S8 keeps its full window and the fit runway pin
  // reads as the seam on its own. Re-enable only if the strip grows:
  // { out: "process", in: "fit", style: "frost-light", windowVh: 0.8, amp: 0.5, dolly: 0.2, roll: 0, spike: 0, tick: false, edge: "content" },
  // S10 fit→final-cta — dolly 0 (the gateway orbit bell already moves the camera).
  { out: "fit", in: "final-cta", style: "frost", windowVh: 0.8, amp: 1.0, dolly: 0, roll: 0.006, spike: 0.35, tick: true, edge: "content" },
];

/** Dev-only: pair indices already reported as out-of-order (warn once each). */
const warnedPairs = new Set<number>();

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
  return deriveBoundaries(outCuts, outPairIdx, CUT_BOUNDARY_PAIRS, false, "CUT_BOUNDARY_PAIRS");
}

/**
 * TASK 6 — the `CUTS_V2` twin: boundaries from SECTION_CUTS (entries with
 * `style: "none"` skipped), each at the CONTENT edge when the seam asks for
 * it and the markers were measured: `(edges[out].bottom + edges[in].top)/2`,
 * falling back PER SIDE to the wrapper edge (`spans[out].end` /
 * `spans[in].start`) when that side has no marker. `outPairIdx[i]` indexes
 * SECTION_CUTS. Same contract as deriveCutBoundaries otherwise.
 */
export function deriveSectionCuts(
  outCuts: Float64Array,
  outPairIdx: Int32Array,
): number {
  return deriveBoundaries(outCuts, outPairIdx, SECTION_CUT_PAIRS, true, "SECTION_CUTS");
}

/** SECTION_CUTS as [out, in] pairs (index-aligned; "none" entries keep their slot). */
const SECTION_CUT_PAIRS: readonly (readonly [string, string])[] = SECTION_CUTS.map(
  (c) => [c.out, c.in] as const,
);

function deriveBoundaries(
  outCuts: Float64Array,
  outPairIdx: Int32Array,
  pairs: readonly (readonly [string, string])[],
  v2: boolean,
  listName: string,
): number {
  const { sections, spans, edges, measuredPath } = useSectionStore.getState();
  if (measuredPath !== CUT_BOUNDARY_ROUTE) return 0;
  let n = 0;
  for (let i = 0; i < pairs.length && n < outCuts.length; i++) {
    const pair = pairs[i];
    const cfg = v2 ? SECTION_CUTS[i] : undefined;
    if (cfg && cfg.style === "none") continue;
    const ia = sections.indexOf(pair[0]);
    if (ia === -1 || sections[ia + 1] !== pair[1]) {
      // ORDER CONTRACT guard (dev only). Flag the unambiguous case: BOTH
      // anchors are measured but not adjacent — that is always a stale pair
      // list, never a transient. A merely missing anchor is legitimate during
      // boot and on other routes, so it stays silent.
      const key = v2 ? 1000 + i : i;
      if (
        process.env.NODE_ENV !== "production" &&
        ia !== -1 &&
        !warnedPairs.has(key) &&
        sections.indexOf(pair[1]) !== -1
      ) {
        warnedPairs.add(key);
        console.warn(
          `[sectionStore] ${listName}[${i}] "${pair[0]}"→"${pair[1]}" is not adjacent in the measured DOM ` +
            `(measured: "${pair[0]}"→"${sections[ia + 1] ?? "∅"}"). That cut will never fire. ` +
            `Re-order ${listName} to mirror src/app/page.tsx.`,
        );
      }
      continue;
    }
    const sa = spans[pair[0]];
    const sb = spans[pair[1]];
    if (!sa || !sb) continue;
    let aEnd = sa.end;
    let bStart = sb.start;
    if (cfg && cfg.edge === "content") {
      const ea = edges[pair[0]];
      const eb = edges[pair[1]];
      if (ea && !Number.isNaN(ea.bottom)) aEnd = ea.bottom;
      if (eb && !Number.isNaN(eb.top)) bStart = eb.top;
    }
    outCuts[n] = (aEnd + bStart) / 2;
    outPairIdx[n] = i;
    n++;
  }
  return n;
}
