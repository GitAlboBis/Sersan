"use client";

/**
 * useDiagonalTraverse — THE DIAGONAL TRAVERSE, Stage 1 (`#problem` only).
 *
 * The page descends at completely natural speed while the scene slides
 * sideways: vertical + lateral at the same time = a diagonal (owner decisions
 * D6–D13). **No `pin:`, no sticky stage, no snap, no parking** — that is D7 and
 * it is the whole point.
 *
 * ── WHERE `p` COMES FROM (mechanism §1.2) ─────────────────────────────────
 * ONE plain, un-pinned, un-scrubbed `ScrollTrigger` per section whose
 * `onUpdate` writes both consumers' source of truth. Not `scrollStore.progress`
 * (document-global and damped), not `gsap.ticker` (its rAF is registered at
 * import time, so it fires BEFORE `pumpLenis` has advanced the scroll — a
 * guaranteed one-frame lead of the DOM over the WebGL), not a hand-rolled rAF,
 * and not `scrub:` (a second smoothing on top of Lenis's).
 *
 * The trigger spans the whole visible transit (`top bottom` → `bottom top`) so
 * a block entering from below is already offset before the section's top
 * reaches the viewport top; `p` is derived from the section's OWN height, which
 * is the storyboard's definition (§B0) and the one that reproduces its beat
 * table exactly:  `p = clamp((scrollY − secTop) / secH, 0, 1)`.
 *
 * ── THE FROZEN SNAPSHOT ───────────────────────────────────────────────────
 * `apply()` reads `window.scrollY` EXACTLY ONCE and publishes it. Every
 * consumer — the DOM copy, the net's rig, the net's `vpTop`, the mask lane —
 * derives from that one number. See `traverseStore`'s header for why sharing
 * the ARGUMENT (not the result) is what keeps the copy and the net from
 * betraying themselves as two layers.
 *
 * ── ZERO PER-FRAME ALLOCATION, ZERO PER-FRAME `getBoundingClientRect` ─────
 * `measure()` runs on `onRefreshInit` (every `ScrollTrigger.refresh()`) and
 * caches, per block, its untransformed doc-space top, its height, its copy
 * box's design left/width and its `RateWindow`. `apply()` is pure arithmetic
 * over those plus pre-built `quickSetter`s. Modelled on `founders-rail.tsx`,
 * the site's shipped scroll-driven horizontal transport.
 *
 * ── TRANSFORM-TARGET DISCIPLINE (storyboard §B2.4) ────────────────────────
 * `[data-drift]` already owns each wrapper's `y` (lusion-type's module driver,
 * on `gsap.ticker`). This hook owns the SAME wrapper's `x` and `opacity`. Two
 * quickSetters on `x` and `y` of one element are safe — both resolve through
 * CSSPlugin's per-element transform cache and each mutates its own component;
 * two writers of the same COMPONENT would not be. The entrance recipes
 * (H3 / R1 / B1) write on the SPLIT CHILDREN, never on these wrappers. Three
 * drivers, three targets, never a shared one.
 *
 * `y` stays on `gsap.ticker` deliberately: its one-frame lead is worth ≤3 px
 * (it is the same staleness the shipped drift already has), while `x` at
 * α_edge is worth 57 px — which is why `x` must ride the frozen snapshot.
 *
 * ── ROUND 12 · D21 — THE WINNER'S IDENTITY IS PUBLISHED, NOT THROWN AWAY ──
 * `apply()` has always resolved a single winning block per frame (the
 * `bestV`/`bestU` comparison) and kept only its VALUE, as `frame.laneWindow`.
 * It now also writes `frame.laneRow` — the winner's cached ledger-row index —
 * and mirrors it onto `traverseStore`'s edge-deduped lit-row channel, which is
 * what lets the DOM type ignite from the SCROLL instead of the pointer
 * (fx/scroll-ignition, `[data-lit]`). It costs no second read, no rect, no
 * measurement and no allocation: the index is cached on `Block` at
 * construction and the channel returns on its first line when nothing changed.
 *
 * ── DEGRADATION ──────────────────────────────────────────────────────────
 *  - `prefers-reduced-motion` — the whole hook lives inside a matchMedia
 *    `(prefers-reduced-motion: no-preference)` context, so a runtime toggle
 *    REVERTS it: no lateral offset, no opacity window, content settled at its
 *    authored position, zero timers, zero transforms. (The drift driver is
 *    already RM-gated, so `y` is zero too.)
 *  - fallback tier / no WebGL — `armed` is the exact complement of the
 *    island's mount gate (`!showFallback`). A traverse over a static SVG would
 *    slide a still image sideways, which is worse than not arming.
 *  - SSR / no-JS — nothing runs and nothing is primed hidden (D-10): the
 *    runway growth, the band pin and the lateral all ship behind the
 *    `data-traverse` attribute this hook sets, and are inert without it.
 */
import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { getLenis } from "@/lib/lenis-singleton";
import { suspendSnap } from "@/lib/scroll-snap";
import {
  traverseConfig,
  traverseRate,
  onTraverseConfigChange,
  setTraverseConfig,
  type TraverseBandId,
} from "@/webgl/neural/traverseConfig";
import {
  registerTraverseBand,
  deactivateTraverseBand,
  publishLitRow,
} from "@/webgl/store/traverseStore";
import {
  IGNITE_V,
  setScrollIgnition,
  scrollIgnitionEnabled,
} from "./scroll-ignition";
import {
  buildRateWindow,
  makeRateSample,
  rateAt,
  windowAt,
  excursionOf,
  plateauDriftOf,
  type RateSample,
  type RateWindow,
} from "./traverse-rate";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/** Write dead-bands — the same 0.05 px convention the drift driver uses. */
const X_DEADBAND = 0.05;
const OPACITY_DEADBAND = 0.003;

/** The copy boxes whose real width defines the mask lane, in priority order. */
const COPY_BOX_SELECTOR =
  "[data-row-body],[data-chapter-desc],[data-chapter-h2],h3";

/**
 * A READING UNIT — the box whose two halves are ONE statement (a ledger row's
 * display line + its own body; the chapter's H2 + its description). See the
 * `opWin` note in `Block`: opacity is a property of the unit, never of the
 * half.
 */
const UNIT_SELECTOR = "[data-ledger-row],[data-traverse-unit]";

/** Type metrics scratch — module-scoped, so `measure()` allocates nothing. */
const TYPE_METRICS = { linePx: 1, fontPx: 1 };

/**
 * Used line-height and used font-size of a COPY BOX, in px. **MEASURE TIME
 * ONLY** — `getComputedStyle` is a style-resolution barrier and has no business
 * anywhere near the frame path.
 *
 * `getComputedStyle` returns the USED value for a numeric or length
 * `line-height`, so `parseFloat` is exact; `normal` is the one keyword that
 * will not parse, and 1.2 × font-size is its CSS default. Writes into the
 * caller's scratch rather than returning an object.
 */
function readTypeMetrics(
  el: HTMLElement,
  out: { linePx: number; fontPx: number },
): void {
  const cs = getComputedStyle(el);
  const fs = parseFloat(cs.fontSize);
  out.fontPx = Number.isFinite(fs) && fs > 0 ? fs : 16;
  const lh = parseFloat(cs.lineHeight);
  out.linePx = Number.isFinite(lh) && lh > 0 ? lh : out.fontPx * 1.2;
}

interface Block {
  el: HTMLElement;
  copyEl: HTMLElement;
  kind: "display" | "body";
  setX: (value: number) => void;
  setOpacity: (value: number) => void;
  /** Untransformed doc-space top of the wrapper. */
  docTop: number;
  h: number;
  /** Untransformed viewport-x left of the COPY box (not the wrapper). */
  copyLeft: number;
  copyW: number;
  /**
   * Measured line count of the COPY BOX — `round(copyH / usedLineHeight)`.
   * Drives the display cap (§C0's "a single line has no return sweep" premise
   * is an INPUT, not an axiom: it is false at 390×844) and QA gate 3's
   * em/line. Measured from the copy box (`h3` / `[data-chapter-h2]` / `p`),
   * never from the wrapper — the chapter's display wrapper also carries the
   * eyebrow, which would read as two extra lines.
   */
  lines: number;
  /** Used font-size of the copy box, px — the denominator of `emPerLine`. */
  fontPx: number;
  win: RateWindow;
  /**
   * ⚠ THE OPACITY WINDOW IS THE READING UNIT'S, NOT THE BLOCK'S — and the
   * distinction is the whole of the round-11.5 legibility fix.
   *
   * `win` is the block's own coverage window and it MUST stay per-block: the
   * lateral rate is `α_fast + (α_slow − α_fast)·V̂` with α_slow 0.50 on display
   * type and 0.25 on body (§B2.3), i.e. the two halves of a row are at two
   * DEPTHS and that is the design. But §B2.4's `opacity = V̂` on that same
   * per-block window makes each half fade on ITS OWN box, and the two boxes are
   * 97 px apart: both halves reach V̂ = 1 when their own top clears
   * `headerH + m`, so the display line — which is above — clears it 97 px of
   * scroll EARLIER and dies 97 px EARLIER. Measured at 1920×935 on the shipped
   * build, every ledger row spent 60–80 px of scroll showing a fully opaque
   * paragraph under a headline at opacity 0.000, and another 60–80 px showing
   * the headline with a dead paragraph. A row is one statement; a statement
   * with half of it invisible is not a beat, it is a bug.
   *
   * So opacity (and, with it, the mask lane — §E's "one window, three outputs"
   * pairing is preserved, just at the unit) rides the window of the UNION BOX
   * of the unit's blocks. Two consequences worth stating because they are
   * guarantees, not side effects:
   *
   *  1. `unitH ≤ bandH` ⇒ V̂_unit = 1 ⇔ the union box is inside the band ⇒ every
   *     member box is inside the band ⇒ every member is in its OWN rate plateau
   *     (α = α_slow). The copy is now opaque only where it is slowest — §B2.4's
   *     "never legible and fast at the same time" holds MORE strictly than it
   *     did per-block, not less.
   *  2. A unit TALLER than the band cannot satisfy (1) — the union could cover
   *     the band while a member sits outside it. ROUND 12 · STAGE 1 makes that
   *     case DEGRADE rather than switch off: see `opK`.
   */
  opWin: RateWindow;
  /** Doc-space top the `opWin` is evaluated at (the unit's, or the block's). */
  opTop: number;
  /** Height of the box `opWin` was built on — the paired box, see `opK`. */
  opH: number;
  /**
   * PAIRING STRENGTH ∈ [0,1] — how far this block's opacity box is inflated
   * from its OWN box toward its reading unit's union box.
   *
   * ⚠ THIS REPLACES A CLIFF, AND THE CLIFF WAS REACHABLE. The guard in (2)
   * above used to be a hard switch: `unitH > bandH` ⇒ every member fell all the
   * way back to its own window, i.e. straight back to the round-11.5 tear (a
   * fully opaque paragraph under an invisible headline) with no signal but a
   * dev-only getter. Measured live 2026-08-25, this build, against
   * `bandH = 0.76·ih − headerPx` (headerPx 97.6, 99.6 at ≥ 1536 wide):
   *
   *    768 wide   chapter union 264 EN / 288 IT   fires below ih 475.8 / 507.4
   *   1280 wide         "       407 EN / 467 IT     "     "    "  664.0 / 742.9
   *   1366 wide         "       367 EN              "     "    "  611.3
   *   1920 wide         "       407 EN              "     "    "  666.6
   *
   * ⚠ THE DESKTOP ROW IS THE REACHABLE ONE, NOT THE 768 CASE. At ≥ 1024 the
   * chapter is a TWO-COLUMN grid, so its union is the display block ALONE —
   * 407 px in EN and 467 px in IT at 1280 — and the switch therefore fires at
   * **1280×720 in Italian (k = 0.962)**, which is this project's own reference
   * viewport, and at 1280×640 / 1920×660 in English. Not a 13-inch edge case.
   *
   * So the box is INTERPOLATED instead:
   *
   *     k        = min(1, bandH / unitH)
   *     top_i(k) = T_i − k·(T_i − T_unit)
   *     h_i(k)   = h_i + k·(unitH − h_i)      = bandH + h_i·(1 − k)  when k<1
   *
   * `k = 1` (unitH ≤ bandH) reproduces the shared unit window EXACTLY — same
   * object, same numbers, so the census-invariance gate is untouched wherever
   * the lemma actually holds. Below it the two halves of a unit separate
   * LINEARLY in `(1 − k)`: the residual tear between a unit's first and last
   * member is `(1 − k)·[(T_last − T_first) + (h_last − h_first)]`, which is 0
   * at k = 1 and is the full HEAD tear at k = 0. And the §B2.4 guarantee
   * degrades with a bound rather than vanishing: since the inflated box
   * exceeds the band by only `h_i·(1 − k)`, a block whose own V̂ would be 1
   * under pairing still has `V̂_i ≥ smoothstep(k)` — with `smooth01`'s cubic
   * that is 0.9958 at the worst ORDINARY viewport measured (1280×720 IT,
   * k = 0.962) and 0.9941 at 768×460 / 1280×640 (k = 0.955), i.e. α within
   * 0.6 % of α_slow. The instrument that proves it is `blocks[].opSpan`: the
   * chapter's two halves differ by 13 px of scroll at 1280×720 IT and 14 px
   * at 1280×640 EN, against a ~900 px window.
   *
   * `k = 0` on a block with no reading unit (it is its own unit, by definition
   * un-paired).
   */
  opK: number;
  /** Members sharing this block's reading unit (1 = it is its own unit). */
  opN: number;
  appliedX: number;
  appliedOp: number;
  row: HTMLElement | null;
  /**
   * The ledger row's index, CACHED AT CONSTRUCTION — `-1` when the block does
   * not live in a row (the chapter's two halves).
   *
   * ⚠ It is cached, not parsed, because `apply()` runs on every ScrollTrigger
   * update: reading `row.dataset.ledgerRow` there would resolve a DOM
   * attribute and allocate a string 8 blocks × 60 times a second for a value
   * that changes only when the section is rebuilt.
   */
  rowIndex: number;
  /** The reading unit this block belongs to (null = it is its own unit). */
  unit: HTMLElement | null;
}

export function useDiagonalTraverse(
  sectionRef: RefObject<HTMLElement | null>,
  bandId: TraverseBandId,
  armed: boolean,
  language: string,
): void {
  /** Dev-handle mirror — refs so the handle can read live values. */
  const dbg = useRef<{
    blocks: Block[];
    counters: { dom: number; secTop: number; secH: number; ih: number };
  }>({ blocks: [], counters: { dom: 0, secTop: 0, secH: 0, ih: 0 } });

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section || !armed) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const band = traverseConfig.bands[bandId];
        const frame = registerTraverseBand(bandId);

        // --- arm the file-scoped CSS (runway growth + band pin) -------------
        const armCss = (): void => {
          const b = traverseConfig.bands[bandId];
          section.style.setProperty("--tv-gap-vh", `${b.gapVh}`);
          if (b.bandVh != null) {
            // Pin the band to the VIEWPORT so the runway growth cannot inflate
            // rect.h (which drives the net's depth + aspect and the stone's
            // size, position, tumble and fog radius). `bandVh = null` removes
            // both properties and the rule falls back to `bottom: 0; height:
            // auto`, i.e. today's `inset-y-0` exactly.
            section.style.setProperty("--tv-band-bottom", "auto");
            section.style.setProperty(
              "--tv-band-h",
              `calc(${b.bandVh} * 100svh)`,
            );
          } else {
            section.style.removeProperty("--tv-band-bottom");
            section.style.removeProperty("--tv-band-h");
          }
        };
        armCss();
        section.dataset.traverse = bandId;

        // --- cached measurements -------------------------------------------
        const blocks: Block[] = [];
        let secTop = 0;
        let secH = 1;
        let ih = 1;
        let iw = 1;
        /** The reading band's height in px — the reading unit's guard rail. */
        let bandH = 1;
        let headerPx = traverseConfig.headerFallbackPx;
        let rate = 0;
        let domFrames = 0;
        let domBase = 0;
        let prevScrollY = Number.NaN;
        // The frame path's ONE scratch. `rateAt` writes into it and returns it,
        // so `apply()` allocates nothing over 8 blocks × 60 fps.
        const sample: RateSample = makeRateSample();
        // Reading-unit scratch — allocated ONCE and cleared per measure, never
        // per frame (see the `opWin` note in `Block`).
        const unitSpan = new Map<
          HTMLElement,
          {
            top: number;
            bottom: number;
            n: number;
            /** Shared window — built ONLY in the fully-paired case (k = 1). */
            win: RateWindow | null;
          }
        >();
        /**
         * How many reading units are only PARTIALLY paired this measure
         * (`unitH > bandH` ⇒ `k < 1`). Published on `coverage()` and warned in
         * dev, so the round-11.5 tear can never again be silently half-true.
         */
        let unitFallback = 0;
        /**
         * De-dupes the dev warn: ONE warn per viewport, for the life of this
         * arm. Keyed on the viewport alone (see the warn below).
         */
        let unitFallbackSig = "";

        const els = Array.from(
          section.querySelectorAll<HTMLElement>("[data-drift]"),
        );
        els.forEach((el) => {
          const kind =
            el.dataset.traverseAlpha === "display" ? "display" : "body";
          const rowEl = el.closest<HTMLElement>("[data-ledger-row]");
          const rowIdx = rowEl
            ? Number.parseInt(rowEl.dataset.ledgerRow ?? "", 10)
            : Number.NaN;
          blocks.push({
            el,
            copyEl: el.querySelector<HTMLElement>(COPY_BOX_SELECTOR) ?? el,
            kind,
            setX: gsap.quickSetter(el, "x", "px") as (v: number) => void,
            setOpacity: gsap.quickSetter(el, "opacity") as (v: number) => void,
            docTop: 0,
            h: 1,
            copyLeft: 0,
            copyW: 1,
            lines: 1,
            fontPx: 16,
            win: buildRateWindow(1, headerPx, 1, 0.12, 0.25, 0.25, 0),
            opWin: buildRateWindow(1, headerPx, 1, 0.12, 0.25, 0.25, 0),
            opTop: 0,
            opH: 1,
            opK: 0,
            opN: 1,
            appliedX: 0,
            appliedOp: 1,
            row: rowEl,
            rowIndex: Number.isFinite(rowIdx) && rowIdx >= 0 ? rowIdx : -1,
            unit: el.closest<HTMLElement>(UNIT_SELECTOR),
          });
        });
        dbg.current.blocks = blocks;
        if (!blocks.length) {
          delete section.dataset.traverse;
          return;
        }

        // Arrow consts, not function declarations: TypeScript only preserves
        // the `const section` narrowing inside functions created AFTER it.
        const measure = (): void => {
          const cfg = traverseConfig;
          const b = cfg.bands[bandId];
          rate = traverseRate(b);
          ih = Math.max(window.innerHeight, 1);
          // `--header-h` is an UNREGISTERED custom property, so
          // getPropertyValue hands back the authored token ("6.1rem"), not a
          // resolved px length — resolve the unit here rather than guessing.
          const rootEl = document.documentElement;
          const raw = getComputedStyle(rootEl)
            .getPropertyValue("--header-h")
            .trim();
          const rawNum = parseFloat(raw);
          const rootPx = parseFloat(getComputedStyle(rootEl).fontSize) || 16;
          headerPx = Number.isFinite(rawNum)
            ? /r?em$/.test(raw)
              ? rawNum * rootPx
              : rawNum
            : cfg.headerFallbackPx;

          const sy = window.scrollY;
          const sr = section.getBoundingClientRect();
          secTop = sr.top + sy;
          secH = Math.max(sr.height, 1);
          iw = Math.max(window.innerWidth, 1);
          // The reading band, written out exactly as `buildRateWindow` derives
          // it (`b1 − b0` with `m = bandInset·ih`). It is the guard rail for
          // the reading unit below, so it must be the SAME number, not a
          // second definition of it.
          bandH = Math.max(ih - 2 * cfg.bandInset * ih - headerPx, 1);
          unitSpan.clear();

          // THE A/B (QA gate 3): `collapse` makes α_edge equal each block's own
          // α_read, which flattens the window to the CONSTANT rate the owner
          // rejected — without touching any other code path.
          for (let i = 0; i < blocks.length; i++) {
            const blk = blocks[i];
            // Subtract the transforms currently applied by the two owners so
            // the cache never feeds back into itself (the `lusion-type.ts`
            // `measureDriftEntry` idiom).
            const dy = Number(gsap.getProperty(blk.el, "y")) || 0;
            const r = blk.el.getBoundingClientRect();
            blk.docTop = r.top + sy - dy;
            blk.h = Math.max(r.height, 1);
            const cr = blk.copyEl.getBoundingClientRect();
            blk.copyLeft = cr.left - blk.appliedX;
            blk.copyW = Math.max(cr.width, 1);
            readTypeMetrics(blk.copyEl, TYPE_METRICS);
            blk.fontPx = TYPE_METRICS.fontPx;
            blk.lines = Math.max(
              1,
              Math.round(cr.height / TYPE_METRICS.linePx),
            );
            const alphaRead =
              blk.kind === "display" ? cfg.alphaReadDisplay : cfg.alphaReadBody;
            const alphaEdge = cfg.collapse ? alphaRead : cfg.alphaEdge;
            // ⚠ HALF THE BLOCK'S HEIGHT, AND THE HALF IS THE WHOLE POINT.
            // `capPx` is the `tanh` CEILING on |x_slow|, and
            // `x_slow = R·α_read·(y_c − y)` is CENTRED and antisymmetric over
            // the block's on-screen life (`traverse-rate.ts` — `y_c` is the
            // exact midpoint of `y ∈ [headerH − h, ih]`). Peak-to-peak is
            // therefore `2·capPx·tanh(…)`, NOT `capPx`: passing `blk.h` bought
            // TWICE §B2b's authored law ("a paragraph may drift sideways by at
            // most its own height"). With `blk.h/2` the ceiling is exactly
            // `blk.h/(lines·fontSize)` — the block's own CSS leading for the
            // two body wrappers — at every viewport AND every angle, because
            // `tanh` saturates.
            //
            // §C0 exempted display type on the premise that a single line has
            // no return sweep. The premise is an INPUT and it is FALSE on the
            // phone (390×844 EN: `02· No traces` and `03· No boundaries` wrap
            // to two lines), so the exemption is keyed to the MEASURED line
            // count, not to the kind. `capDisplayFrameK` (default 0, inert) is
            // the opt-in extension that also catches a one-line headline whose
            // uncapped plateau drift is a large fraction of the frame.
            let capOn =
              blk.kind === "body"
                ? cfg.capBody
                : cfg.capDisplayMultiline && blk.lines > 1;
            if (!capOn && blk.kind === "display" && cfg.capDisplayFrameK > 0) {
              const probe = buildRateWindow(
                blk.h,
                headerPx,
                ih,
                cfg.bandInset,
                alphaRead,
                alphaEdge,
                0,
              );
              capOn = plateauDriftOf(probe, rate) > cfg.capDisplayFrameK * iw;
            }
            blk.win = buildRateWindow(
              blk.h,
              headerPx,
              ih,
              cfg.bandInset,
              alphaRead,
              alphaEdge,
              capOn ? blk.h / 2 : 0,
            );
            // Accumulate the reading unit's union span from the values we just
            // de-transformed. NEVER from the unit element's own rect: a rect
            // read here is the TRANSFORMED box (the stage-1 P0), and the unit
            // is the parent of the very wrappers this hook is translating.
            if (blk.unit) {
              const sp = unitSpan.get(blk.unit);
              if (sp) {
                if (blk.docTop < sp.top) sp.top = blk.docTop;
                const bot = blk.docTop + blk.h;
                if (bot > sp.bottom) sp.bottom = bot;
                sp.n++;
              } else {
                unitSpan.set(blk.unit, {
                  top: blk.docTop,
                  bottom: blk.docTop + blk.h,
                  n: 1,
                  win: null,
                });
              }
            }
          }
          // ── SECOND PASS — ONE OPACITY WINDOW PER READING UNIT ────────────
          // Separate from the loop above on purpose: the union span is only
          // complete once every member's rect has been read, and nothing may
          // run between those reads (a `getComputedStyle`/`buildRateWindow`
          // interleave is harmless, a layout write is not).
          //
          // A unit TALLER than the band cannot satisfy the `opWin` guarantee —
          // the union could cover the band while a member sits outside it. It
          // used to fall all the way back to per-block windows, i.e. straight
          // back to the round-11.5 tear, silently, below ih 475.8 (EN) /
          // 507.4 (IT) at 768 px wide — and, because the chapter is a
          // two-column grid at ≥ 1024, below ih 664 (EN) / 743 (IT) at 1280,
          // i.e. AT 1280×720 IN ITALIAN. It now DEGRADES: `k = bandH/unitH`
          // inflates each member's own box toward the union instead of
          // swapping between the two. See `opK` in `Block` for the algebra and
          // the measured thresholds.
          //
          // `k = 1` is byte-identical to the shared-window path — same object,
          // same numbers — so the census-invariance proof (QA gate 2) is
          // untouched wherever its own precondition holds: the members'
          // supports overlap only because
          // `t_j − t_i ≤ unitH − h_j ≤ bandH < bandH + h_i`. At `k < 1` that
          // precondition has failed by definition, and the census is no longer
          // claimed invariant there — it is REPORTED instead (`unitFallback`).
          unitFallback = 0;
          for (const sp of unitSpan.values()) {
            if (sp.bottom - sp.top > bandH) unitFallback++;
          }
          for (let i = 0; i < blocks.length; i++) {
            const blk = blocks[i];
            const sp = blk.unit ? unitSpan.get(blk.unit) : undefined;
            if (!sp) {
              blk.opWin = blk.win;
              blk.opTop = blk.docTop;
              blk.opH = blk.h;
              blk.opK = 0;
              blk.opN = 1;
              continue;
            }
            const unitH = Math.max(sp.bottom - sp.top, 1);
            blk.opN = sp.n;
            if (unitH <= bandH) {
              if (!sp.win) {
                // Only `windowAt` is ever evaluated on this window — it reads
                // `d`/`e0..e3` only. NEVER call `rateAt` on it: `x` must stay
                // the block's own, or the two halves of a row move as one flat
                // plane and §B2.3's two depths are gone. α_read is therefore
                // inert here; it is passed as the body value so the window is
                // a pure function of the union geometry.
                sp.win = buildRateWindow(
                  unitH,
                  headerPx,
                  ih,
                  cfg.bandInset,
                  cfg.alphaReadBody,
                  cfg.collapse ? cfg.alphaReadBody : cfg.alphaEdge,
                  0,
                );
              }
              blk.opWin = sp.win;
              blk.opTop = sp.top;
              blk.opH = unitH;
              blk.opK = 1;
              continue;
            }
            // PARTIAL PAIRING. One window per BLOCK now (the boxes differ by
            // `h_i`), built once per measure — never per frame.
            const k = bandH / unitH;
            const opH = blk.h + k * (unitH - blk.h);
            blk.opTop = blk.docTop - k * (blk.docTop - sp.top);
            blk.opH = opH;
            blk.opK = k;
            blk.opWin = buildRateWindow(
              opH,
              headerPx,
              ih,
              cfg.bandInset,
              cfg.alphaReadBody,
              cfg.collapse ? cfg.alphaReadBody : cfg.alphaEdge,
              0,
            );
          }
          if (process.env.NODE_ENV !== "production") {
            // ⚠ KEYED ON THE VIEWPORT ALONE, AND NEVER CLEARED. Keying it on
            // the COUNT as well and resetting it whenever the count came back
            // to 0 made "once per viewport" false: a refresh burst passes
            // through measures where the unit momentarily fits, each of which
            // re-armed the warn — measured 3× at ONE viewport (1920×660) on a
            // single load. A language switch re-arms the whole hook (and this
            // variable) from scratch, so an EN→IT that newly overflows still
            // reports. One string, never a Set: it cannot grow across resizes.
            const sig = `${iw}x${ih}`;
            if (unitFallback > 0 && sig !== unitFallbackSig) {
              unitFallbackSig = sig;
              const worst = Math.min(
                ...Array.from(unitSpan.values(), (sp) =>
                  sp.bottom - sp.top > bandH
                    ? bandH / (sp.bottom - sp.top)
                    : 1,
                ),
              );
              console.warn(
                `[traverse:${bandId}] ${unitFallback} reading unit(s) taller ` +
                  `than the reading band at ${iw}×${ih} (bandH ` +
                  `${Math.round(bandH)} px). Opacity pairing degraded to ` +
                  `k=${Math.round(worst * 1000) / 1000}; the unit's halves ` +
                  `separate by (1−k) of the full round-11.5 tear. ` +
                  `coverage().unitFallback reports this.`,
              );
            }
          }
          const c = dbg.current.counters;
          c.secTop = secTop;
          c.secH = secH;
          c.ih = ih;
        };

        const apply = (): void => {
          const cfg = traverseConfig;
          const dir = cfg.bands[bandId].dir;
          // ── THE ONE FROZEN READ ─────────────────────────────────────────
          const sy = window.scrollY;
          const travelled = Math.min(Math.max(sy - secTop, 0), secH);
          const p = travelled / secH;
          const wantOpacity = cfg.windowOpacity && rate !== 0;

          let bestV = -1;
          let bestU = Number.POSITIVE_INFINITY;
          let best: Block | null = null;

          for (let i = 0; i < blocks.length; i++) {
            const blk = blocks[i];
            const y = blk.docTop - sy;
            const s = rateAt(blk.win, y, rate, sample);
            const x = dir * s.x;
            if (Math.abs(x - blk.appliedX) >= X_DEADBAND) {
              blk.appliedX = x;
              blk.setX(x);
            }
            // ⚠ THE READING UNIT'S WINDOW, NOT THE BLOCK'S. A row is one
            // statement; a statement with half of it invisible is a bug, not a
            // beat. `s.vhat` (the block's own) still owns the RATE — the two
            // halves stay at two depths (§B2.3) — but the opacity and the mask
            // lane ride the union box (see the `opWin` note in `Block`).
            //
            // ⚠ `uv` IS EVALUATED UNCONDITIONALLY, AND THAT IS THE GUARD. The
            // lane must ride `uv`, never `op`: with `windowOpacity: false` (or
            // `angleDeg: 0` ⇒ `rate === 0`) every block would report `op ≡ 1`,
            // pinning `frame.laneWindow` at 1 for the whole act — and
            // `NeuralLattice.tsx` scales uCopyLaneW, uCopySoft, uCopyFloor AND
            // uCopyLineFloor by it. The rollback would carve the mask lane
            // permanently open, i.e. stop being a rollback.
            const uv = windowAt(blk.opWin, blk.opTop - sy);
            const op = wantOpacity ? uv : 1;
            if (Math.abs(op - blk.appliedOp) >= OPACITY_DEADBAND) {
              blk.appliedOp = op;
              blk.setOpacity(op);
            }
            // The lane follows the block with the largest window value, ties
            // broken by proximity to the viewport centre. By the storyboard's
            // own layout at most one block is in the reading zone at a time.
            const u = Math.abs(blk.docTop + blk.h / 2 - sy - ih / 2);
            if (uv > bestV + 1e-6 || (uv > bestV - 1e-6 && u < bestU)) {
              bestV = uv;
              bestU = u;
              best = blk;
            }
          }

          // `active` is derived from the SAME frozen `scrollY`, not from the
          // trigger's own toggle state: ScrollTrigger's callback order between
          // onToggle and onUpdate is not a contract we should depend on, and a
          // snapshot whose `active` disagreed with its own `scrollY` is exactly
          // the kind of one-frame lie this store exists to prevent. This is the
          // trigger's range (`top bottom` → `bottom top`) written out.
          frame.active = sy + ih > secTop && sy < secTop + secH;
          frame.scrollY = sy;
          frame.p = p;
          // Published so the WebGL islands and the stone can express their own
          // authored strip-x from THIS frozen snapshot rather than measuring
          // the section a second time (see traverseStore's `secTop`).
          frame.secTop = secTop;
          frame.secH = secH;
          frame.xScenePx = dir * rate * travelled;
          // ── ROUND 12 · D21 — THE LIT ROW ────────────────────────────────
          // ⚠ OUTSIDE the `laneEnabled` branch below, deliberately. That flag
          // is the mask lane's rollback lever; if the ignition rode inside it,
          // rolling the mask back would silently freeze the type's ignition
          // too and stop being a rollback.
          //
          // The winner is already resolved above, from the SAME frozen `sy`,
          // in the SAME loop, over the SAME reading-unit windows that write
          // the opacity. All that is added here is the threshold and the
          // winner's identity.
          //
          // `IGNITE_V ≈ 1 − ε`, not 0.85, and the reason is the rate law:
          // α = α_edge + (α_read − α_edge)·V̂, so V̂ = 0.85 is still ~1.9× the
          // plateau rate. The row lights when it is opaque AND slowest, which
          // is the same instant the reader is actually reading it. Every
          // window reaches exactly 1 somewhere in its plateau (`windowAt`
          // returns 1 on `[e1, e2]`, and `e2 > e1` for every block whose
          // height differs from the band's), so the threshold is always
          // reachable — including under the partially-paired `opWin`.
          //
          // A block outside any `[data-ledger-row]` — the chapter's headline
          // and its description — carries `rowIndex === -1`, so while the
          // chapter is the winner NOTHING is lit. That is correct: the
          // chapter is not a row and has no ignited pose.
          frame.laneRow =
            best !== null && bestV >= IGNITE_V ? best.rowIndex : -1;
          publishLitRow(bandId, frame.laneRow < 0 ? null : frame.laneRow);
          if (best && cfg.laneEnabled) {
            // ⚠ From the block's FINAL APPLIED `x` — the same number written
            // to its transform, in the same loop, in the same frame. Never a
            // linearised α, never a separate integrator, never a damper
            // (§2B.4: those cost up to 292 px of lane error, 7.7× tolerance).
            frame.laneCenterPx =
              best.copyLeft + best.appliedX + best.copyW / 2;
            frame.laneHalfPx = best.copyW / 2;
            // ROUND 12 · STAGE 2 FIX — THE LANE'S VERTICAL TWIN. Same frozen
            // `sy`, same `best`, same frame: the tracked READING UNIT's box
            // (`opTop`/`opH`, never `docTop`/`h` — the unit is the statement,
            // and a carve-out sized on the headline alone would leave its own
            // paragraph over an unmasked net). Two subtractions, no
            // measurement, no allocation.
            frame.laneCyPx = best.opTop + best.opH / 2 - sy;
            frame.laneHalfYPx = best.opH / 2;
            frame.laneWindow = bestV;
          } else {
            frame.laneWindow = 0;
            frame.laneHalfPx = 0;
            frame.laneHalfYPx = 0;
          }
          // R1's clock instrument. `tick` counts FRAMES ON WHICH THE SCROLL
          // ADVANCED, not calls — ScrollTrigger also updates on native scroll
          // events and on refresh, and those are idempotent re-applications of
          // the same `scrollY`. The island counts the same quantity, so
          // `tick === glFrames` iff it consumed every DOM update exactly once.
          if (sy !== prevScrollY) {
            prevScrollY = sy;
            if (frame.active) {
              domFrames++;
              frame.tick = domFrames;
              dbg.current.counters.dom = domFrames;
            }
          }
        };

        // --- the ONE trigger ------------------------------------------------
        const st = ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          invalidateOnRefresh: true,
          onRefreshInit: measure,
          // Snap, never glide, across a re-measure.
          onRefresh: apply,
          onUpdate: apply,
          // One last apply on the way out so the pose at the boundary is the
          // pose the law asks for; `frame.active` re-derives itself inside.
          onToggle: () => apply(),
        });
        measure();
        // Init snap: a reload restoring mid-section must not fly in.
        apply();

        // The runway growth changes the DOCUMENT height, so every trigger and
        // every SectionBus span resolved before this arm is stale — including
        // the `[data-lattice-anchor]` rect the island is camera-locked to.
        // One deferred refresh + one remeasure, on the next frame so the CSS
        // has laid out; `setMeasured`'s no-op short-circuit keeps it from
        // bumping anything that did not actually move.
        const armRaf = requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          window.dispatchEvent(new CustomEvent("sersan:remeasure"));
        });

        // --- keyboard focus on an off-frame row (§3.3) -----------------------
        let snapTimer = 0;
        let snapRelease: (() => void) | null = null;
        // `overflow-x: clip` removes the scroll container, so the browser
        // cannot shear the composition via `section.scrollLeft`. What it CAN
        // do is nothing at all — the row's vertical box is already in view, so
        // scroll-into-view may leave the focus ring off-frame, which is the
        // WCAG 2.4.11 failure. Convert the focus into the vertical scroll
        // position at which that row sits in its reading plateau.
        const onFocusIn = (e: FocusEvent) => {
          const target = e.target as HTMLElement | null;
          const row = target?.closest?.(
            "[data-ledger-row]",
          ) as HTMLElement | null;
          if (!row) return;
          (section as HTMLElement).scrollLeft = 0;
          let blk: Block | null = null;
          for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].row === row) {
              blk = blocks[i];
              if (blocks[i].kind === "display") break;
            }
          }
          if (!blk) return;
          // WCAG 2.4.11 follows the READING UNIT: parking the row's display
          // half at its OWN plateau centre would leave the paragraph — which is
          // what the opacity window now keys off — part-way up its ramp.
          const targetY = blk.opTop - blk.opWin.yc;
          if (Math.abs(window.scrollY - targetY) < 2) return;
          // Tracked so the teardown can release it: an unmount mid-glide (an
          // EN/IT rebuild, a runtime RM toggle) would otherwise leave snap
          // suspended for the rest of the session.
          if (snapTimer !== 0) {
            window.clearTimeout(snapTimer);
            snapRelease?.();
          }
          snapRelease = suspendSnap();
          snapTimer = window.setTimeout(() => {
            snapTimer = 0;
            snapRelease?.();
            snapRelease = null;
          }, 1100);
          const lenis = getLenis();
          if (lenis) lenis.scrollTo(targetY, { duration: 0.6 });
          else window.scrollTo({ top: targetY, behavior: "smooth" });
        };
        section.addEventListener("focusin", onFocusIn);

        // --- live tuning ----------------------------------------------------
        const offConfig = onTraverseConfigChange(() => {
          armCss();
          // The runway growth changes the document height, so the whole page
          // has to re-resolve; `refresh()` re-enters `measure()` for us.
          ScrollTrigger.refresh();
          window.dispatchEvent(new CustomEvent("sersan:remeasure"));
        });

        // --- dev handle -----------------------------------------------------
        if (process.env.NODE_ENV !== "production") {
          const w = window as unknown as Record<string, unknown>;
          w[`__sersanTraverse_${bandId}`] = {
            get frame() {
              return { ...frame };
            },
            get geometry() {
              return {
                secTop,
                secH,
                ih,
                iw,
                bandH: Math.round(bandH * 10) / 10,
                headerPx,
                rate,
                runwayVh: secH / ih,
                angleDeg: traverseConfig.bands[bandId].angleDeg,
                lateralPxAtEnd: rate * secH,
              };
            },
            get blocks() {
              return blocks.map((b, i) => {
                const drift = plateauDriftOf(b.win, rate);
                const denom = Math.max(b.lines * b.fontPx, 1);
                return {
                  i,
                  kind: b.kind,
                  tag: b.copyEl.tagName.toLowerCase(),
                  h: Math.round(b.h),
                  copyW: Math.round(b.copyW),
                  lines: b.lines,
                  fontPx: Math.round(b.fontPx * 100) / 100,
                  alphaRead: b.win.alphaRead,
                  capPx: Math.round(b.win.capPx * 10) / 10,
                  x: Math.round(b.appliedX * 10) / 10,
                  opacity: Math.round(b.appliedOp * 1000) / 1000,
                  plateauPx: Math.round(b.win.e2 - b.win.e1),
                  excursion:
                    Math.round(
                      excursionOf(b.win, rate, headerPx, ih, b.h) * 10,
                    ) / 10,
                  // QA GATE 3 — the drift the reader actually sees, over the
                  // plateau where the block is opaque, in px and in ems of its
                  // OWN type. `emCeiling = h/(lines·fontSize)` is the block's
                  // measured CSS leading; `capOk` is the gate.
                  plateauDrift: Math.round(drift * 10) / 10,
                  emPerLine: Math.round((drift / denom) * 1000) / 1000,
                  emCeiling: Math.round((b.h / denom) * 1000) / 1000,
                  capOk: drift <= b.h + 1e-6,
                  // The reading unit this block's OPACITY (and the mask lane)
                  // is keyed to. `unit` is now a MATTER OF DEGREE, not a
                  // boolean: `unitK === 1` is full pairing (the members share
                  // one window object), `0 < unitK < 1` is the degraded pairing
                  // a too-short viewport forces, `unitK === 0` means the block
                  // has no reading unit at all. `unit` is kept as the coarse
                  // flag the round-11.5 QA quoted.
                  unit: b.opK > 0,
                  unitK: Math.round(b.opK * 1000) / 1000,
                  unitFallback: b.opK > 0 && b.opK < 1,
                  unitMembers: b.opN,
                  /** Height of the box the opacity window was built on. */
                  unitH: Math.round(b.opH),
                  /**
                   * THE TEAR INSTRUMENT. `[scrollY_in, scrollY_out]` — the
                   * scroll interval over which this block is non-transparent
                   * (`V̂ > 0`), read straight off the window that drives the
                   * opacity. Two blocks of ONE reading unit must report the
                   * SAME pair; the amount by which they differ IS the
                   * round-11.5 tear, in px of scroll, and it is `(1 − unitK)`
                   * of the un-paired figure.
                   */
                  opSpan: [
                    Math.round(b.opTop - b.opWin.e3),
                    Math.round(b.opTop - b.opWin.e0),
                  ],
                };
              });
            },
            /**
             * QA GATE 3, as one table. `plateauDriftOf(w, r)` is the lateral
             * distance a block travels while it is FULLY OPAQUE (V̂ ≡ 1), which
             * is the only drift the reader can see; `emPerLine` divides it by
             * the block's own `lines · fontSize`. The gate is
             * `emPerLine ≤ h/(lines·fontSize)`, i.e. `plateauDrift ≤ h`.
             *
             * Run it at the committed 23.61° AND at 45°:
             *   set({ problem: { angleDeg: 45 } }); plateauDrift();
             *   set({ problem: { angleDeg: 23.61 } });
             *
             * `capped:false` rows are the blocks §C0 exempts (display type that
             * measures ONE line); they are reported, not hidden, because they
             * are exactly what `capDisplayFrameK` exists to close.
             */
            plateauDrift() {
              const rows = blocks.map((b, i) => {
                const drift = plateauDriftOf(b.win, rate);
                const denom = Math.max(b.lines * b.fontPx, 1);
                return {
                  i,
                  kind: b.kind,
                  tag: b.copyEl.tagName.toLowerCase(),
                  h: Math.round(b.h),
                  lines: b.lines,
                  fontPx: Math.round(b.fontPx * 100) / 100,
                  capped: b.win.capPx > 0,
                  driftPx: Math.round(drift * 10) / 10,
                  frameFrac: Math.round((drift / iw) * 1000) / 1000,
                  emPerLine: Math.round((drift / denom) * 1000) / 1000,
                  emCeiling: Math.round((b.h / denom) * 1000) / 1000,
                  ok: drift <= b.h + 1e-6,
                };
              });
              return {
                angleDeg: traverseConfig.bands[bandId].angleDeg,
                viewport: [iw, ih],
                pass: rows.every((r) => r.ok),
                failing: rows.filter((r) => !r.ok).map((r) => r.i),
                rows,
              };
            },
            /** QA gate 4a — max |dx/dscrollY| sampled across a full transit. */
            rateMax(samples = 4000) {
              let max = 0;
              for (let i = 0; i < blocks.length; i++) {
                const b = blocks[i];
                const lo = headerPx - b.h - 40;
                const step = (ih - lo + 80) / samples;
                let prev = rateAt(b.win, lo, rate).x;
                for (let s = 1; s <= samples; s++) {
                  const y = lo + s * step;
                  const cur = rateAt(b.win, y, rate).x;
                  // dy/ds = −1, so |dx/ds| = |dx/dy|.
                  max = Math.max(max, Math.abs(cur - prev) / step);
                  prev = cur;
                }
              }
              return {
                max: Math.round(max * 1000) / 1000,
                ceiling:
                  Math.round(traverseConfig.alphaEdge * rate * 1000) / 1000,
              };
            },
            /** QA gate 4b — numeric d²x/ds² at every window join. */
            secondDerivative(index = 0, h = 0.5) {
              const b = blocks[index];
              if (!b) return null;
              const at = (y: number) => rateAt(b.win, y, rate).x;
              const d2 = (y: number) =>
                (at(y + h) - 2 * at(y) + at(y - h)) / (h * h);
              return {
                e0: d2(b.win.e0),
                e1: d2(b.win.e1),
                e2: d2(b.win.e2),
                e3: d2(b.win.e3),
                yc: d2(b.win.yc),
              };
            },
            /**
             * Park a block at its WORST case — the outer edge of its ramp.
             *
             * ⚠ THE RAMP IS THE READING UNIT'S (`opWin`/`opTop`), NOT THE
             * BLOCK'S, and that is what makes `laneCheck()` meaningful here:
             * the lane is published from the unit's window value, so the worst
             * case for the lane is the edge of the window the lane rides. On
             * `b.win.e3` the row's paragraph would already be transparent
             * while its headline still tracked, and the check would be
             * measuring a block the lane is no longer following. `e0`/`e3` are
             * the two ends of the support: V̂ = 0 outside, so these are the
             * extremes of the tracked span, not of the drift.
             */
            park(index = 0, edge: "top" | "bottom" = "bottom") {
              const b = blocks[index];
              if (!b) return null;
              const y = edge === "bottom" ? b.opWin.e3 : b.opWin.e0;
              const targetY = b.opTop - y;
              const lenis = getLenis();
              if (lenis) lenis.scrollTo(targetY, { duration: 0.4 });
              else window.scrollTo({ top: targetY });
              return { index, edge, targetY, unitK: b.opK };
            },
            /** THE A/B: collapse the window to a constant α (the rejected
             * design), and restore it. One number, no other code path. */
            collapseWindow() {
              return setTraverseConfig({ collapse: true });
            },
            restoreWindow() {
              return setTraverseConfig({ collapse: false });
            },
            /**
             * ROUND 12 · D21 — THE ONE LIVE SWITCH for scroll-driven type
             * ignition, so the owner can A/B it without a reload:
             *
             *   __sersanTraverse_problem.scrollIgnition(false)  // back to hover
             *   __sersanTraverse_problem.scrollIgnition(true)   // scroll commands
             *   __sersanTraverse_problem.scrollIgnition()       // read it
             *
             * It flips BOTH acts at once (`#problem` and `#trust`) — the whole
             * point of D21 is one grammar, so a switch that split them would
             * be measuring something the owner never asked for. Mirrored on
             * `window.__sersanScrollIgnition` for the act that has no traverse
             * handle of its own.
             */
            scrollIgnition(on?: boolean) {
              if (typeof on === "boolean") setScrollIgnition(on);
              return scrollIgnitionEnabled();
            },
            /**
             * QA gate 5 (R7 / R7c) — the published lane centre against where
             * the tracked copy box ACTUALLY renders. This reads a rect on
             * purpose: it is the only way to catch a lane derived from
             * anything other than the applied transform. Park a block first
             * (`park(i)`) so it is measured at its worst case, not at p = 0.5.
             */
            laneCheck() {
              let tracked: Block | null = null;
              let bestV = -1;
              let bestU = Number.POSITIVE_INFINITY;
              const sy = window.scrollY;
              // MIRRORS `apply()` EXACTLY — the unit's window, not the
              // block's. A dev handle that selected the tracked block by a
              // different rule than the frame path would make the gate lie.
              for (let i = 0; i < blocks.length; i++) {
                const b = blocks[i];
                const v = windowAt(b.opWin, b.opTop - sy);
                const u = Math.abs(b.docTop + b.h / 2 - sy - ih / 2);
                if (v > bestV + 1e-6 || (v > bestV - 1e-6 && u < bestU)) {
                  bestV = v;
                  bestU = u;
                  tracked = b;
                }
              }
              if (!tracked) return null;
              const cr = tracked.copyEl.getBoundingClientRect();
              const rendered = cr.left + cr.width / 2;
              return {
                tracked: blocks.indexOf(tracked),
                laneWindow: Math.round(bestV * 1000) / 1000,
                publishedPx: Math.round(frame.laneCenterPx * 100) / 100,
                renderedPx: Math.round(rendered * 100) / 100,
                deltaPx:
                  Math.round((rendered - frame.laneCenterPx) * 100) / 100,
                tolerancePx: 38,
              };
            },
            /**
             * THE CENSUS — GATE 1 (`maxIslandsOnFrame`) + GATE 2 (invariance).
             *
             * Walks the WHOLE act at `step` px and asks two questions per
             * sample: is any neural band on frame, and is any copy block
             * non-transparent. "On frame" is a STRICT viewport intersection
             * (pad 0), not the island's 220 px cull pad, and it includes the
             * LATERAL test — a band swept off the side is not on frame no
             * matter where its DOM box sits. "Copy on frame" is `V̂ > 0`, i.e.
             * exactly the opacity the traverse writes (§B2.4: outside the
             * window the block is transparent, so it is not on frame in any
             * sense the eye would agree with).
             *
             * ⚠ ROUND 12 · STAGE 1 — THE LADDER IS GONE, SO THIS NUMBER GETS
             * WORSE ON PURPOSE. With one band the act is back to the census
             * that first justified the ladder (~31 % net presence at 1280×720,
             * ~40 % of the act with nothing on it). That is the checkpoint's
             * known void; STAGE 2's continuous ribbon is what closes it.
             *
             * The `origin` term below is NOT optional and is not a leftover of
             * the ladder: it is the same lateral re-centring the frame path
             * applies (`bandLateralPx`). An instrument that measured the raw
             * `xScenePx` would report the band off-frame from mid-act onward.
             */
            coverage(step = 4) {
              const cfgL = traverseConfig;
              const b = cfgL.bands[bandId];
              const dir = b.dir;
              const r = traverseRate(b);
              const bands: {
                id: string;
                docTop: number;
                h: number;
                w: number;
                cx: number;
                origin: number;
                on: number;
              }[] = [];
              section
                .querySelectorAll<HTMLElement>("[data-lattice-anchor]")
                .forEach((el) => {
                  const cr = el.getBoundingClientRect();
                  if (cr.height < 2 || cr.width < 2) return;
                  const docTop = cr.top + window.scrollY;
                  const centre = docTop + cr.height / 2 - ih / 2;
                  const trav = Math.min(
                    Math.max(centre - secTop, 0),
                    secH,
                  );
                  bands.push({
                    id: el.getAttribute("data-lattice-anchor") ?? "?",
                    docTop,
                    h: cr.height,
                    w: cr.width,
                    cx: cr.left + cr.width / 2,
                    origin: dir * r * trav,
                    on: 0,
                  });
                });
              const vw = window.innerWidth;
              let both = 0;
              let copyOnly = 0;
              let netOnly = 0;
              let none = 0;
              // ROUND 12 QA GATE 2 — the SAME census keyed on the PER-BLOCK
              // windows, i.e. the pre-(a) instrument, run in the same walk so
              // the two are compared sample-for-sample rather than across two
              // builds. They must agree exactly: for `unitH ≤ bandH` the unit
              // window's support is the union of its members' supports, so the
              // "is any copy non-transparent" predicate is invariant. A
              // divergence means the `unitH > bandH` guard is not holding.
              let bothB = 0;
              let copyOnlyB = 0;
              let netOnlyB = 0;
              let noneB = 0;
              let total = 0;
              let run = 0;
              let longest = 0;
              let longestAt = 0;
              let maxOn = 0;
              const runs: number[] = [];
              for (let s = secTop; s <= secTop + secH; s += step) {
                total++;
                const trav = Math.min(Math.max(s - secTop, 0), secH);
                const xScene = dir * r * trav;
                let on = 0;
                for (let i = 0; i < bands.length; i++) {
                  const bd = bands[i];
                  const vpTop = bd.docTop - s;
                  if (vpTop + bd.h < 0 || vpTop > ih) continue;
                  const cxNow = bd.cx + xScene - bd.origin;
                  if (cxNow + bd.w / 2 < 0 || cxNow - bd.w / 2 > vw) continue;
                  on++;
                  bd.on++;
                }
                if (on > maxOn) maxOn = on;
                // MIRRORS `apply()`: the opacity the traverse actually writes
                // is the READING UNIT's window. The census is invariant under
                // that swap while every unit is FULLY paired — for
                // `unitH ≤ bandH` the unit window's support is exactly the
                // union of its members' supports (the contiguity lemma) — and
                // reproducing the pre-(a) figure to the sample is QA gate 2.
                // Where a unit is only PARTIALLY paired (`unitFallback > 0`)
                // the lemma's precondition has failed and invariance is not
                // claimed; `censusInvariant` then reports what it measures
                // rather than what it assumes.
                let copy = false;
                let copyB = false;
                for (let i = 0; i < blocks.length; i++) {
                  const bl = blocks[i];
                  if (!copy && windowAt(bl.opWin, bl.opTop - s) > 0) copy = true;
                  if (!copyB && rateAt(bl.win, bl.docTop - s, r).vhat > 0)
                    copyB = true;
                  if (copy && copyB) break;
                }
                if (on > 0 && copyB) bothB++;
                else if (copyB) copyOnlyB++;
                else if (on > 0) netOnlyB++;
                else noneB++;
                if (on > 0 && copy) both++;
                else if (copy) copyOnly++;
                else if (on > 0) netOnly++;
                else {
                  none++;
                  run += step;
                  if (run > longest) {
                    longest = run;
                    longestAt = s - secTop;
                  }
                  continue;
                }
                if (run > 0) {
                  runs.push(run);
                  run = 0;
                }
              }
              if (run > 0) runs.push(run);
              const pct = (n: number) => Math.round((n / total) * 1000) / 10;
              return {
                viewport: [vw, ih],
                secH: Math.round(secH),
                runwayVh: Math.round((secH / ih) * 100) / 100,
                samples: total,
                netAndCopy: pct(both),
                copyOnly: pct(copyOnly),
                netOnly: pct(netOnly),
                nothing: pct(none),
                netOnFrame: pct(both + netOnly),
                /** QA GATE 2 — the pre-(a) per-block census, same walk. */
                perBlockCensus: {
                  netAndCopy: pct(bothB),
                  copyOnly: pct(copyOnlyB),
                  netOnly: pct(netOnlyB),
                  nothing: pct(noneB),
                  copySamples: bothB + copyOnlyB,
                },
                copySamples: both + copyOnly,
                /** True iff (a) left the census invariant, sample for sample. */
                censusInvariant:
                  both === bothB &&
                  copyOnly === copyOnlyB &&
                  netOnly === netOnlyB &&
                  none === noneB,
                maxIslandsOnFrame: maxOn,
                longestNothingRunPx: longest,
                longestNothingAtSectionY: Math.round(longestAt),
                nothingRuns: runs.sort((x, y) => y - x).slice(0, 6),
                /**
                 * ROUND 12 · STAGE 1 — THE READING-UNIT PAIRING, PUBLISHED.
                 * How many reading units are taller than the reading band and
                 * are therefore only PARTIALLY paired (`k < 1`). It must never
                 * again be possible for this to be true and unreported: at
                 * `k = 0` the round-11.5 tear is fully back, and the only
                 * previous signal was a boolean on a dev-only getter.
                 */
                unitFallback,
                unitPairing: Array.from(unitSpan.values(), (sp) => {
                  const uh = Math.max(sp.bottom - sp.top, 1);
                  return {
                    members: sp.n,
                    unitH: Math.round(uh),
                    bandH: Math.round(bandH),
                    k: Math.round(Math.min(1, bandH / uh) * 1000) / 1000,
                  };
                }),
                islands: bands.map((bd) => ({
                  id: bd.id,
                  topVh: Math.round(((bd.docTop - secTop) / ih) * 1000) / 1000,
                  originPx: Math.round(bd.origin),
                  onFramePct: pct(bd.on),
                })),
              };
            },
            get counters() {
              return { ...dbg.current.counters };
            },
            config: traverseConfig,
            set: setTraverseConfig,
            remeasure: () => {
              measure();
              apply();
            },
          };
        }

        return () => {
          cancelAnimationFrame(armRaf);
          if (snapTimer !== 0) window.clearTimeout(snapTimer);
          snapRelease?.();
          snapRelease = null;
          offConfig();
          section.removeEventListener("focusin", onFocusIn);
          st.kill();
          deactivateTraverseBand(bandId);
          delete section.dataset.traverse;
          section.style.removeProperty("--tv-gap-vh");
          section.style.removeProperty("--tv-band-bottom");
          section.style.removeProperty("--tv-band-h");
          // Clear our OWN properties only, and do not assume `x` survives the
          // drift driver's `clearProps:"transform"` teardown (lusion-type
          // `registerDrift`): both are RM-gated and unmount together, so
          // whichever runs first, the pose ends settled.
          blocks.forEach((b) => {
            b.appliedX = 0;
            b.appliedOp = 1;
            gsap.set(b.el, { x: 0, clearProps: "opacity" });
          });
          // The document shrinks back to today's height — same reasoning as
          // the arm, in reverse.
          requestAnimationFrame(() => {
            ScrollTrigger.refresh();
            window.dispatchEvent(new CustomEvent("sersan:remeasure"));
          });
        };
      });

      return () => {
        mm.revert();
      };
    },
    { dependencies: [armed, language, bandId], revertOnUpdate: true },
  );
}
