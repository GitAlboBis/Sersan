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
  traverseIslands,
  fitTraverseLadder,
  onTraverseConfigChange,
  setTraverseConfig,
  MAX_TRAVERSE_ISLANDS,
  type TraverseBandId,
  type TraverseLadderFit,
} from "@/webgl/neural/traverseConfig";
import {
  registerTraverseBand,
  deactivateTraverseBand,
} from "@/webgl/store/traverseStore";
import {
  buildRateWindow,
  makeRateSample,
  rateAt,
  windowAt,
  excursionOf,
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
   *     the band while a member sits outside it — so such a unit keeps its
   *     per-block windows (`opWin === win`). The rule is self-limiting and
   *     needs no viewport table.
   */
  opWin: RateWindow;
  /** Doc-space top the `opWin` is evaluated at (the unit's, or the block's). */
  opTop: number;
  appliedX: number;
  appliedOp: number;
  row: HTMLElement | null;
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
        /** The last fitted island ladder (dev handle / QA gate 2). */
        let ladderFit: TraverseLadderFit | null = null;

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
          // The ladder is UNPLACED here and re-placed by `measure()` — it is a
          // function of the measured act, not of the config alone.
          if (!traverseConfig.islands.enabled) clearIslands();
        };

        /** Un-place every extra island: `display: none`, zero rect, no build. */
        const clearIslands = (): void => {
          for (let n = 0; n < MAX_TRAVERSE_ISLANDS; n++) {
            section.style.removeProperty(`--tv-island-${n}`);
            section.style.removeProperty(`--tv-island-${n}-on`);
          }
          ladderFit = null;
        };

        /**
         * ROUND 11 STAGE 1.5 — PLACE THE ISLAND LADDER, fitted to the act we
         * just measured. Each extra anchor is a pure measurement box authored
         * by the section; this writes the only two things it needs (an offset
         * and a display switch) as custom properties, so placement costs no
         * React commit and is live-tunable from the console.
         *
         * ⚠ The offsets CANNOT be authored constants. The act is 6.020 vh at
         * 1280×720, 5.590 at 1440×900 and 5.200 at 768×1024, and the primary
         * band's own top moves with the chapter's height (1.803 / 1.554 /
         * 1.419 vh, measured). A fixed ladder that covers the tail at one
         * viewport overhangs `#work` at another, or opens a hole. So the two
         * ends are pinned to the MEASURED act and the middle is spread evenly
         * between them; `fitTraverseLadder` is pure and reports the pitch
         * bounds it was fitted against.
         */
        const placeIslands = (): void => {
          const cfgI = traverseConfig.islands;
          if (!cfgI.enabled) {
            clearIslands();
            return;
          }
          const primary = section.querySelector<HTMLElement>(
            `[data-lattice-anchor="${bandId}"]`,
          );
          if (!primary) {
            clearIslands();
            return;
          }
          const pr = primary.getBoundingClientRect();
          if (pr.height < 2) {
            clearIslands();
            return;
          }
          const bandY = (pr.top + window.scrollY - secTop) / ih;
          const bandVh = pr.height / ih;
          const extras = traverseIslands();
          const fit = fitTraverseLadder(
            bandY,
            bandVh,
            secH / ih,
            extras,
            cfgI.leadVh,
            cfgI.tailPin,
          );
          ladderFit = fit;
          for (let n = 0; n < MAX_TRAVERSE_ISLANDS; n++) {
            const isl = extras[n];
            if (isl) {
              const dy = isl.dy ?? fit.offsets[n] ?? 0;
              section.style.setProperty(`--tv-island-${n}`, `${dy}`);
              section.style.setProperty(`--tv-island-${n}-on`, "block");
            } else {
              section.style.removeProperty(`--tv-island-${n}`);
              section.style.removeProperty(`--tv-island-${n}-on`);
            }
          }
        };
        armCss();
        section.dataset.traverse = bandId;

        // --- cached measurements -------------------------------------------
        const blocks: Block[] = [];
        let secTop = 0;
        let secH = 1;
        let ih = 1;
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
          { top: number; bottom: number; win: RateWindow | null }
        >();

        const els = Array.from(
          section.querySelectorAll<HTMLElement>("[data-drift]"),
        );
        els.forEach((el) => {
          const kind =
            el.dataset.traverseAlpha === "display" ? "display" : "body";
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
            win: buildRateWindow(1, headerPx, 1, 0.12, 0.25, 0.25, 0),
            opWin: buildRateWindow(1, headerPx, 1, 0.12, 0.25, 0.25, 0),
            opTop: 0,
            appliedX: 0,
            appliedOp: 1,
            row: el.closest<HTMLElement>("[data-ledger-row]"),
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
            const alphaRead =
              blk.kind === "display" ? cfg.alphaReadDisplay : cfg.alphaReadBody;
            blk.win = buildRateWindow(
              blk.h,
              headerPx,
              ih,
              cfg.bandInset,
              alphaRead,
              cfg.collapse ? alphaRead : cfg.alphaEdge,
              // ⚠ The cap is the block's OWN HEIGHT — "a paragraph may drift
              // sideways by at most its own height" (§B2b) — and display type
              // is never capped (§C0: a single line has no return sweep, so
              // its lateral drift is free).
              cfg.capBody && blk.kind === "body" ? blk.h : 0,
            );
          }
          // Placed LAST: the fit needs `secTop`/`secH`/`ih` from this pass, and
          // the extras are absolutely positioned so re-placing them cannot
          // move anything the pass above just measured.
          placeIslands();
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
            const op = wantOpacity ? s.vhat : 1;
            if (Math.abs(op - blk.appliedOp) >= OPACITY_DEADBAND) {
              blk.appliedOp = op;
              blk.setOpacity(op);
            }
            // The lane follows the block with the largest window value, ties
            // broken by proximity to the viewport centre. By the storyboard's
            // own layout at most one block is in the reading zone at a time.
            const u = Math.abs(blk.docTop + blk.h / 2 - sy - ih / 2);
            if (s.vhat > bestV + 1e-6 || (s.vhat > bestV - 1e-6 && u < bestU)) {
              bestV = s.vhat;
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
          if (best && cfg.laneEnabled) {
            // ⚠ From the block's FINAL APPLIED `x` — the same number written
            // to its transform, in the same loop, in the same frame. Never a
            // linearised α, never a separate integrator, never a damper
            // (§2B.4: those cost up to 292 px of lane error, 7.7× tolerance).
            frame.laneCenterPx =
              best.copyLeft + best.appliedX + best.copyW / 2;
            frame.laneHalfPx = best.copyW / 2;
            frame.laneWindow = bestV;
          } else {
            frame.laneWindow = 0;
            frame.laneHalfPx = 0;
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
          const targetY = blk.docTop - blk.win.yc;
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
                headerPx,
                rate,
                runwayVh: secH / ih,
                angleDeg: traverseConfig.bands[bandId].angleDeg,
                lateralPxAtEnd: rate * secH,
              };
            },
            get blocks() {
              return blocks.map((b, i) => ({
                i,
                kind: b.kind,
                tag: b.copyEl.tagName.toLowerCase(),
                h: Math.round(b.h),
                copyW: Math.round(b.copyW),
                alphaRead: b.win.alphaRead,
                capPx: Math.round(b.win.capPx),
                x: Math.round(b.appliedX * 10) / 10,
                opacity: Math.round(b.appliedOp * 1000) / 1000,
                plateauPx: Math.round(b.win.e2 - b.win.e1),
                excursion:
                  Math.round(
                    excursionOf(b.win, rate, headerPx, ih, b.h) * 10,
                  ) / 10,
              }));
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
            /** Park a block at its WORST case — the outer edge of its ramp. */
            park(index = 0, edge: "top" | "bottom" = "bottom") {
              const b = blocks[index];
              if (!b) return null;
              const y = edge === "bottom" ? b.win.e3 : b.win.e0;
              const targetY = b.docTop - y;
              const lenis = getLenis();
              if (lenis) lenis.scrollTo(targetY, { duration: 0.4 });
              else window.scrollTo({ top: targetY });
              return { index, edge, targetY };
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
              for (let i = 0; i < blocks.length; i++) {
                const b = blocks[i];
                const s = rateAt(b.win, b.docTop - sy, rate);
                const u = Math.abs(b.docTop + b.h / 2 - sy - ih / 2);
                if (s.vhat > bestV + 1e-6 || (s.vhat > bestV - 1e-6 && u < bestU)) {
                  bestV = s.vhat;
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
             * ROUND 11 STAGE 1.5 QA — GATE 1 + GATE 2, THE CENSUS.
             *
             * Walks the WHOLE act at `step` px and asks two questions per
             * sample: is any neural band on frame, and is any copy block
             * non-transparent. "On frame" is a STRICT viewport intersection
             * (pad 0), not the island's 220 px cull pad, and it includes the
             * LATERAL test — an island swept off the side is not on frame no
             * matter where its DOM box sits. "Copy on frame" is `V̂ > 0`, i.e.
             * exactly the opacity the traverse writes (§B2.4: outside the
             * window the block is transparent, so it is not on frame in any
             * sense the eye would agree with).
             *
             * This reproduces the pre-change baseline exactly — 18.8 / 29.1 /
             * 12.1 / 40.0 with a 1116 px longest run at 1280×720 — which is
             * what makes the after/before comparison worth quoting.
             */
            coverage(step = 4) {
              const cfgL = traverseConfig;
              const b = cfgL.bands[bandId];
              const dir = b.dir;
              const r = traverseRate(b);
              const compensate = cfgL.islands.compensate;
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
                    origin: compensate ? dir * r * trav : 0,
                    on: 0,
                  });
                });
              const vw = window.innerWidth;
              let both = 0;
              let copyOnly = 0;
              let netOnly = 0;
              let none = 0;
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
                let copy = false;
                for (let i = 0; i < blocks.length; i++) {
                  if (rateAt(blocks[i].win, blocks[i].docTop - s, r).vhat > 0) {
                    copy = true;
                    break;
                  }
                }
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
                maxIslandsOnFrame: maxOn,
                longestNothingRunPx: longest,
                longestNothingAtSectionY: Math.round(longestAt),
                nothingRuns: runs.sort((x, y) => y - x).slice(0, 6),
                islands: bands.map((bd) => ({
                  id: bd.id,
                  topVh: Math.round(((bd.docTop - secTop) / ih) * 1000) / 1000,
                  originPx: Math.round(bd.origin),
                  onFramePct: pct(bd.on),
                })),
              };
            },
            /** ROUND 11 STAGE 1.5 QA — GATE 2, the ladder as fitted, with the
             * two bounds it was fitted against. `ok` false means a bound was
             * clamped and the placement is a compromise, not a fit. */
            get ladder() {
              return ladderFit
                ? {
                    ok: ladderFit.ok,
                    maxPitchVh: Math.round(ladderFit.maxPitch * 1000) / 1000,
                    minPitchVh: Math.round(ladderFit.minPitch * 1000) / 1000,
                    topsVh: ladderFit.tops.map(
                      (t) => Math.round(t * 1000) / 1000,
                    ),
                    pitchesVh: ladderFit.pitches.map(
                      (p) => Math.round(p * 1000) / 1000,
                    ),
                    offsetsVh: ladderFit.offsets.map(
                      (o) => Math.round(o * 1000) / 1000,
                    ),
                    runwayVh: Math.round((secH / ih) * 1000) / 1000,
                  }
                : null;
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
          clearIslands();
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
