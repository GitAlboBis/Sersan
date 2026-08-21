"use client";

/**
 * use-type-scrub — the round-4 SCROLL-SCRUBBED type grammar shared by the two
 * signal-stream sections (problem + production-grade). Owner feedback
 * 2026-08-21: the round-3 reveals were IO-once entrances; the display type
 * must be BOUND TO SCROLL — building proportionally with scroll position and
 * reversing when scrubbing back (the /consulting practice-ledger's
 * scroll-active grammar, promoted from "nearest row wins" to a true per-row
 * scrub).
 *
 * TWO HOOKS, one contract:
 *
 * `useChapterScrub(scope, language)` — the chapter h2 + right-hung annotation.
 *   SplitText lines (mask: "lines", linesClass "split-line" so the masks
 *   inherit the globals.css descender-headroom fix), each line's
 *   yPercent 115→0 + opacity mapped to a staggered sub-window of ONE scrubbed
 *   ScrollTrigger (start "top 90%" / end "top 45%"); the `[data-chapter-note]`
 *   annotation fades+rises across the last 25%. This deliberately REPLACES the
 *   shared HeadingChoreographer for these headings only: the h2s drop
 *   `data-split-reveal` (so the one-shot choreographer never double-drives
 *   them) and carry `data-chapter-h2` instead. Because globals.css hangs the
 *   mask margin-collapse fix off `[data-split-reveal]:has(> .split-line-mask)`
 *   (flex column — adjacent masks' negative block margins must never
 *   collapse or the heading grows per line break and shifts every
 *   [data-line-anchor] measurement), the same fix is imposed INLINE here
 *   while the split exists and cleared on revert. yPercent 115 (not 110):
 *   lines must clear the mask's 0.12em extended clip window (globals.css
 *   L455-469) or their top edge peeks through at rest.
 *
 * `useLedgerScrub(scope, language, onIgnite?)` — one raw scrub PER ROW
 *   (`scrub: true` — Lenis is the smoother; start "top 85%" / end "top 40%";
 *   invalidateOnRefresh; NO pin), driving a normalized timeline:
 *     - 0.00→1.00  `[data-scrub-ghost]` fill wipe: background-size
 *       "0% 100%" → "100% 100%" (ease none — the fill is EXACTLY proportional
 *       to the row's scrub progress, fully reversible). The CSS side
 *       (background-clip: text machinery, stroke outline under the un-filled
 *       part, SSR/no-JS solid-at-100% default) lives in each section's
 *       file-scoped <style>.
 *     - 0.00→0.25  `[data-scrub-rise]` assembly: yPercent 40→0,
 *       opacity 0.3→1, small stagger — index / arrow / claim settle as the
 *       row climbs.
 *     - 0.00→0.32  `[data-roll-word]` columns: the Lusion letter-roll
 *       (yPercent −500→0, center-out cosine offsets via rollDelay) driven by
 *       the scrub instead of a one-shot tween — letters stream through the
 *       clip with the scroll and stream back out scrubbing up.
 *     - 0.30→0.65  `[data-scrub-hairline]` scaleX 0→1, origin left.
 *     - 0.65→1.00  `[data-row-note]` annotation fade+rise.
 *   `onIgnite(row)` fires ONCE per row per page life when the row's scrub
 *   first crosses IGNITE_AT (production's bumpCluster ring flash — the
 *   latch lives in a ref so EN/IT rebuilds never re-fire it).
 *
 * GUARDS (binding, round-4 spec §4):
 *   - SSR / no-JS: nothing here runs — rows and headings render fully solid
 *     (fill 100%, hairlines full width, notes visible). No hidden pose is
 *     ever baked into a className (the D-10 rule).
 *   - Arm = init snap: every fromTo carries immediateRender:true (mid-
 *     timeline fromTos default false — they'd keep the CSS settled pose
 *     until the playhead first crossed them and visibly pop), then the
 *     timeline is rendered once at the trigger's current progress, both
 *     synchronously at build. A reload that restores a mid-page scroll
 *     position paints the correct partial pose immediately — never
 *     hidden-then-visible, never settled-then-hidden.
 *   - Reduced motion: early return before any priming — static solid, zero
 *     scrub choreography, onIgnite never fires.
 *   - Zero per-frame getBoundingClientRect (ScrollTrigger caches geometry;
 *     the scrub renders only when progress actually changes — the
 *     identical-value skip is native to the scrubbed-timeline idiom, no
 *     hand-rolled onUpdate writers).
 *   - Teardown: everything is created synchronously inside useGSAP's
 *     context, so cleanup revert() kills the triggers/tweens AND restores
 *     the pre-effect inline styles (back to the solid static markup) before
 *     a language rebuild re-primes. The chapter split is built async after
 *     fonts.ready (line boxes must be final) → manually reverted, exactly
 *     the HeadingChoreographer discipline.
 *   - Constant-shape deps including `language` (an EN/IT toggle re-renders
 *     row text and remounts the keyed h2 → full rebuild re-splits and
 *     re-measures).
 */
import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { rollDelay } from "@/components/fx/roll-letters";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

/** Row scrub progress at which onIgnite fires (the "row has landed" beat —
 * rises settle at 0.25; 0.35 reads as just-landed). */
const IGNITE_AT = 0.35;

/** rollDelay's max offset in seconds (center leads at 0, edges trail). */
const ROLL_DELAY_MAX = 0.0625;

/** One-shot late refresh once webfonts land: the display-serif swap reflows
 * the big type → trigger start/end computed pre-swap go stale
 * (invalidateOnRefresh picks the refresh up). Module-latched — fonts.ready
 * resolves once per page, one global refresh covers every consumer. */
let fontsRefreshQueued = false;
function refreshOnFontsReady() {
  if (fontsRefreshQueued || typeof document === "undefined") return;
  fontsRefreshQueued = true;
  document.fonts?.ready
    .then(() => {
      ScrollTrigger.refresh();
    })
    .catch(() => {});
}

export function useChapterScrub(
  scope: RefObject<HTMLElement | null>,
  language: string,
): void {
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const scopeEl = scope.current;
      if (!scopeEl) return;
      const h2 = scopeEl.querySelector<HTMLElement>("[data-chapter-h2]");
      if (!h2) return;
      const note = scopeEl.querySelector<HTMLElement>("[data-chapter-note]");

      let cancelled = false;
      let split: SplitText | null = null;
      let tl: gsap.core.Timeline | null = null;

      // Fonts must be settled or line boxes split wrong mid-swap (the
      // HeadingChoreographer discipline). Everything created inside this
      // async callback escapes the useGSAP context → manual teardown below.
      document.fonts?.ready.then(() => {
        if (cancelled) return;
        split = new SplitText(h2, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
        });
        // globals.css applies the mask margin-collapse fix only to
        // [data-split-reveal] hosts; this h2 deliberately doesn't carry that
        // attribute (see file header), so the flex column is imposed inline
        // for the split's lifetime.
        gsap.set(h2, { display: "flex", flexDirection: "column" });

        const lines = split.lines;
        const n = lines.length;
        tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: h2,
            start: "top 90%",
            end: "top 45%",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
        // Staggered sub-windows: line i rises across [i·step, i·step + span],
        // all lines settled by 0.75; the annotation takes the last 25%.
        const span = 0.55;
        const step = n > 1 ? (0.75 - span) / (n - 1) : 0;
        lines.forEach((line, i) => {
          tl!.fromTo(
            line,
            { yPercent: 115, opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              duration: span,
              ease: "power1.out",
              // fromTo at a position > 0 defaults immediateRender:false —
              // without this the line keeps its CSS settled pose until the
              // playhead first crosses it (settled → pop-hidden → rise).
              // Explicit true = the repo's prime-the-full-pose-at-arm rule.
              immediateRender: true,
            },
            i * step,
          );
        });
        if (note) {
          tl!.fromTo(
            note,
            { autoAlpha: 0, y: 14 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.25,
              ease: "power1.out",
              immediateRender: true,
            },
            0.75,
          );
        }
        // Init snap: the ScrollTrigger was created on the then-empty
        // timeline, so nothing has rendered the scroll-derived pose yet —
        // render it synchronously (a reload mid-section paints the correct
        // partial pose this frame, never primed-then-visible).
        const st = tl!.scrollTrigger;
        tl!.totalProgress(st ? st.progress : 0, true);
      });

      refreshOnFontsReady();

      return () => {
        cancelled = true;
        if (tl) {
          tl.scrollTrigger?.kill();
          tl.kill();
        }
        if (note) {
          gsap.killTweensOf(note);
          gsap.set(note, { clearProps: "opacity,visibility,transform" });
        }
        if (split) split.revert();
        gsap.set(h2, { clearProps: "display,flexDirection" });
      };
    },
    { scope, dependencies: [language] },
  );
}

export function useLedgerScrub(
  scope: RefObject<HTMLElement | null>,
  language: string,
  onIgnite?: (row: number) => void,
): void {
  // Once-per-page-life ignition latch — survives EN/IT rebuilds on purpose
  // (round-3 contract: the ring flash rides the FIRST landing only).
  const ignitedRef = useRef<boolean[]>([]);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const scopeEl = scope.current;
      if (!scopeEl) return;
      const rows = Array.from(
        scopeEl.querySelectorAll<HTMLElement>("[data-ledger-row]"),
      );
      if (!rows.length) return;

      rows.forEach((row, i) => {
        const rises = row.querySelectorAll<HTMLElement>("[data-scrub-rise]");
        const ghost = row.querySelector<HTMLElement>("[data-scrub-ghost]");
        const hairline = row.querySelector<HTMLElement>(
          "[data-scrub-hairline]",
        );
        const note = row.querySelector<HTMLElement>("[data-row-note]");
        const words = row.querySelectorAll<HTMLElement>("[data-roll-word]");

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: row,
            start: "top 85%",
            end: "top 40%",
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: onIgnite
              ? (self) => {
                  if (!ignitedRef.current[i] && self.progress >= IGNITE_AT) {
                    ignitedRef.current[i] = true;
                    onIgnite(i);
                  }
                }
              : undefined,
          },
        });

        // The hero move: the ghost fill wipe, exactly proportional to the
        // row's scrub progress (position 0, duration 1, ease none).
        if (ghost) {
          tl.fromTo(
            ghost,
            { backgroundSize: "0% 100%" },
            { backgroundSize: "100% 100%", duration: 1, ease: "none" },
            0,
          );
        }
        // Assembly: index / arrow / claim rise-settle on the first 25%.
        if (rises.length) {
          tl.fromTo(
            rises,
            { yPercent: 40, opacity: 0.3 },
            {
              yPercent: 0,
              opacity: 1,
              duration: 0.22,
              ease: "power1.out",
              stagger: 0.03,
            },
            0,
          );
        }
        // Scrub-driven Lusion letter-roll (RollLetters markup): each column
        // streams yPercent −500→0 with the center-out cosine offset mapped
        // into the window's first ~third.
        words.forEach((word) => {
          const cols = word.querySelectorAll<HTMLElement>("[data-roll-col]");
          const n = cols.length;
          cols.forEach((col, ci) => {
            tl.fromTo(
              col,
              { yPercent: -500 },
              {
                yPercent: 0,
                duration: 0.24,
                ease: "expo.inOut",
                // fromTo at a position > 0 defaults immediateRender:false —
                // explicit true primes the full pose at arm (the repo rule;
                // otherwise the element keeps its CSS settled state until
                // the playhead first crosses it and visibly pops).
                immediateRender: true,
              },
              (rollDelay(ci, n) / ROLL_DELAY_MAX) * 0.08,
            );
          });
        });
        // Hairline draws across the middle of the window.
        if (hairline) {
          tl.fromTo(
            hairline,
            { scaleX: 0, transformOrigin: "0% 50%" },
            {
              scaleX: 1,
              duration: 0.35,
              ease: "power1.out",
              immediateRender: true,
            },
            0.3,
          );
        }
        // Annotation (right cell) fades+rises across the last 35%.
        if (note) {
          tl.fromTo(
            note,
            { autoAlpha: 0, y: 14 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.35,
              ease: "power1.out",
              immediateRender: true,
            },
            0.65,
          );
        }

        // Init snap: the ScrollTrigger was created on the then-empty
        // timeline, so nothing has rendered the scroll-derived pose yet —
        // render it synchronously so a reload that restores a mid-page
        // scroll position paints the correct partial pose this frame.
        const st = tl.scrollTrigger;
        tl.totalProgress(st ? st.progress : 0, true);

        // Init-snap ignition check: a reload restoring a scroll position past
        // the beat must still fire (onUpdate only fires on subsequent
        // changes).
        if (
          onIgnite &&
          st &&
          !ignitedRef.current[i] &&
          st.progress >= IGNITE_AT
        ) {
          ignitedRef.current[i] = true;
          onIgnite(i);
        }
      });

      refreshOnFontsReady();
      // No manual teardown: everything above is synchronous inside the
      // useGSAP context — cleanup revert() kills the triggers and restores
      // pre-effect inline styles (the solid static markup).
    },
    { scope, dependencies: [language, onIgnite] },
  );
}
