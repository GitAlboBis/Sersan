"use client";

/**
 * lusion-type — the round-5 TEXT v3 grammar shared by the two signal-stream
 * sections (problem + production-grade). Replaces use-type-scrub.ts: the
 * owner rejected the scroll-scrubbed fill-wipe ("non mi piace l'animazione
 * del testo, voglio qualcosa con gsap"); the Lusion text dossier
 * (research/2026-08-21-lusion-text-dossier.md) shows the real Lusion feel is
 *
 *   (a) VIEWPORT-ENTRY CHOREOGRAPHY THAT REPLAYS — real-time GSAP tweens
 *       fired when the block enters the viewport (either direction), reset to
 *       their FROM state only when the block is FULLY out, replayed on
 *       re-entry (Lusion `_needsReset`);
 *   (b) CONTINUOUS PER-FRAME PARALLAX DRIFT — every text block translates by
 *       its distance from viewport center with a differential factor k
 *       (title 0.5 / body 1.5 / secondary 1.25), recomputed each frame.
 *
 * FOUR HOOKS, one contract:
 *
 * `useChapterReveal(scope, language)` — chapter h2 + `[data-chapter-desc]`
 *   column. Recipe H3 (dossier): SplitText words in line masks
 *   (linesClass "split-line" so the globals.css descender-headroom masks
 *   apply; the margin-collapse flex fix is imposed inline while split),
 *   yPercent 115→0 over 1s on the lusion ease, 0.025s/word, plus x 200px→0
 *   delayed +0.4s (y leads, x trails — the Lusion goal-title signature).
 *   yPercent 115 (not the dossier's 100): parts must clear the split mask's
 *   0.12em extended clip window (globals.css) or tops peek at the hidden
 *   pose. The desc column follows in B3 spirit: whole-block autoAlpha 0→1 +
 *   y 30px→0, expo.out, cascaded at +0.5s.
 *
 * `useLedgerReveal(scope, language, onIgnite?)` — one replayable entrance
 *   timeline PER `[data-ledger-row]`:
 *     t=0.00  `[data-roll-word]` columns — recipe R1 EXACTLY: per-char column
 *             through the 1em clip, yPercent −500→0, expo.inOut, 1.25s,
 *             center-out cosine stagger (rollDelay: center leads, edges trail
 *             by ~62ms — the real-time R1 numbers, no scrub remap).
 *     t=0.00  `[data-row-rise]` (mono index, arrow wrapper) — autoAlpha 0→1 +
 *             yPercent 60→0, 0.8s lusion.
 *     t=0.10  `[data-hairline]` — scaleX 0→1, origin left, 0.9s lusion.
 *     t=0.15  `[data-claim]` (production sentences) — recipe H3 (words in
 *             line masks, y then x+0.4s as above). Ghost stroke styling
 *             inherits through the split wrappers.
 *     t=0.30  `[data-row-body]` — recipe B1 word-wave: SplitText words,
 *             opacity 0.1→1 + yPercent 100→0, 1s expo.out, 0.01s/word —
 *             cascaded +0.3s after the display roll starts.
 *     t=1.10  onIgnite(row) — the "entrance landed" beat (production's
 *             bumpCluster ring flash). Fires ONCE per row per page life (the
 *             latch ref survives EN/IT rebuilds); a reload/SPA-nav landing
 *             PAST a row fires its latch immediately (the field must read
 *             "already landed") without playing the entrance.
 *
 * `useTextDrift(scope, language)` — the per-frame parallax (dossier §0/§4
 *   `showScreenOffset`). Every `[data-drift="<k>"]` wrapper translates
 *   dy = (1−k)·dCenter·DRIFT_SCALE where dCenter = block center − viewport
 *   center (px): zero when the row is centered/readable, peaking subtly
 *   (~16–32px at DRIFT_SCALE 0.12) at the viewport edges — depth layering,
 *   never collision. ONE module-level gsap.ticker driver serves every
 *   registered block across both sections. Per frame: one window.scrollY
 *   read + pure arithmetic + a transform write per visible block — ZERO
 *   getBoundingClientRect in the loop (rects cached at register and
 *   re-measured on every ScrollTrigger refresh, drift-corrected so the
 *   applied transform never feeds back into the measurement). Blocks whose
 *   section is fully off-screen are skipped. The drift wrapper's transform
 *   is owned EXCLUSIVELY by this driver — entrances animate inner elements,
 *   and the problem heading's drift wrapper nests INSIDE `[data-emerge]`
 *   (the passage's transform target), never shares it.
 *
 * `useIgnitionWave(scope)` — recipe Hv1 for rows with arrows (problem only):
 *   on ignition the EFFECT word's `[data-wave-word] [data-roll-col]` chars
 *   slide x 0→1.5em, 0.4s lusion, per-char delay (len−1−i)/100 (right-most
 *   first — the wave travels toward the arrow), while `[data-wave-arrow]`
 *   slides x 0→1.8em (its own 0.55em type ≈ one display-em) into the vacated
 *   space at +0.12s over 0.28s (Lusion's hoverRatio .3→1 window at 2.5/s).
 *   Un-ignition mirrors it back. The x channel never touches yPercent (GSAP
 *   composes them on the same [data-roll-col] elements); the word's clip
 *   must be `inset(0 -2em)` (RollLetters `clipInset`) so the x-shift escapes
 *   while the vertical roll clip survives. Returns a STABLE callback wired
 *   into useLedgerIgnition's resolved-index edge — same three entry points
 *   (fine-pointer hover / focus / touch centre-band), store link unchanged.
 *
 * GUARDS (binding, site discipline):
 *   - SSR / no-JS: none of this runs — rows, headings, bodies and hairlines
 *     render settled and visible. No hidden pose is ever baked into a
 *     className (D-10): FROM states are primed ONLY by GSAP at arm
 *     (immediateRender:true on every fromTo of the paused timelines).
 *   - Arm mid-viewport (reload restoring scroll / SPA nav): the trigger is
 *     created already-active and GSAP never fires onEnter for it — the
 *     creation-time isActive check plays the entrance (Lusion does the same).
 *   - Reduced motion: every hook early-returns before any priming — static
 *     settled content, zero timers, no drift, no wave, and onIgnite never
 *     fires from these hooks at all.
 *   - Splits happen only after document.fonts.ready (line boxes must be
 *     final); everything async-created is torn down manually (cancelled
 *     flag + kill/revert/clearProps) — the useGSAP context can't see it.
 *   - Split elements MUST be remounted on language change: the h2s carry
 *     key={language} already; claims/bodies carry it too (sections' JSX).
 *   - Constant-shape deps including `language`: an EN/IT toggle re-renders
 *     row text → full rebuild re-splits, re-primes, re-measures drift.
 */
import { useCallback, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { rollDelay } from "@/components/fx/roll-letters";
import { lusionEase } from "@/components/fx/lusion-ease";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

// === Recipe constants (dossier numbers) ====================================

/** R1 letter-roll: per-char duration (s) and FROM offset (yPercent). */
const ROLL_DUR = 1.25;
const ROLL_FROM = -500;

/** H3 word rise: duration, per-word stagger, x trail delay + FROM px. */
const H3_DUR = 1;
const H3_STAGGER = 0.025;
const H3_X_DELAY = 0.4;
const H3_X_FROM = 200;
/** 115 not 100: clears the split-line mask's 0.12em extended clip window. */
const H3_Y_FROM = 115;

/** B1 word-wave: duration, per-word stagger, FROM opacity. */
const B1_DUR = 1;
const B1_STAGGER = 0.01;
const B1_ALPHA_FROM = 0.1;

/** Body cascade after the display roll starts (s). */
const BODY_AT = 0.3;

/** Row timeline beat at which the entrance reads as "landed" (onIgnite). */
const IGNITE_BEAT = 1.1;

/** Hv1: char shift (display em), char duration, arrow shift/delay/duration.
 * Arrow em is local to its 0.55em mono type → 1.8em ≈ one display-em. */
const WAVE_SHIFT_EM = 1.5;
const WAVE_DUR = 0.4;
const ARROW_SHIFT_EM = 1.8;
const ARROW_DELAY = 0.12;
const ARROW_DUR = 0.28;

/** Differential drift: dy = (1−k)·dCenter·DRIFT_SCALE. 0.12 puts the peak
 * offset at the viewport edge around 32px for k 0.5/1.5 and ~16px for 1.25. */
const DRIFT_SCALE = 0.12;

// === Shared plumbing =======================================================

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** One-shot late refresh once webfonts land: the display-serif swap reflows
 * the big type → trigger start/end and drift rects computed pre-swap go
 * stale. Module-latched — fonts.ready resolves once per page; the refresh
 * also re-measures every registered drift block (refresh listener below). */
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

/**
 * The REPLAY contract (Lusion `_needsReset`): play on entry from either
 * direction, reset to FROM only when the trigger element is FULLY out of the
 * viewport. start "top bottom" / end "bottom top" spans the whole visible
 * transit, so onLeave/onLeaveBack are exactly the fully-out edges. A trigger
 * created already inside the range never fires onEnter (GSAP only fires on an
 * active-state CHANGE), so the creation-time isActive check plays it.
 */
function createReplayTrigger(
  triggerEl: HTMLElement,
  tl: gsap.core.Timeline,
): ScrollTrigger {
  const play = () => tl.play(0);
  const reset = () => tl.pause(0);
  const st = ScrollTrigger.create({
    trigger: triggerEl,
    start: "top bottom",
    end: "bottom top",
    onEnter: play,
    onEnterBack: play,
    onLeave: reset,
    onLeaveBack: reset,
  });
  if (st.isActive) play();
  return st;
}

// === Chapter reveal ========================================================

export function useChapterReveal(
  scope: RefObject<HTMLElement | null>,
  language: string,
): void {
  useGSAP(
    () => {
      if (reducedMotion()) return;
      const scopeEl = scope.current;
      if (!scopeEl) return;
      const h2 = scopeEl.querySelector<HTMLElement>("[data-chapter-h2]");
      if (!h2) return;
      const desc = scopeEl.querySelector<HTMLElement>("[data-chapter-desc]");

      let cancelled = false;
      let split: SplitText | null = null;
      let tl: gsap.core.Timeline | null = null;
      let st: ScrollTrigger | null = null;

      // Fonts must be settled or line boxes split wrong mid-swap (the
      // HeadingChoreographer discipline). Everything created inside this
      // async callback escapes the useGSAP context → manual teardown below.
      document.fonts?.ready.then(() => {
        if (cancelled) return;
        split = new SplitText(h2, {
          type: "lines,words",
          mask: "lines",
          linesClass: "split-line",
        });
        // globals.css hangs the mask margin-collapse fix off
        // [data-split-reveal]; this h2 deliberately doesn't carry that
        // attribute (the shared HeadingChoreographer must skip it), so the
        // flex column is imposed inline for the split's lifetime.
        gsap.set(h2, { display: "flex", flexDirection: "column" });

        const words = split.words;
        tl = gsap.timeline({ paused: true });
        // H3: y leads…
        tl.fromTo(
          words,
          { yPercent: H3_Y_FROM },
          {
            yPercent: 0,
            duration: H3_DUR,
            ease: lusionEase(),
            stagger: H3_STAGGER,
            // Prime the FROM pose at arm (paused timeline renders nothing on
            // its own; fromTo at any position defaults immediateRender:false
            // → the settled CSS pose would flash on first entry).
            immediateRender: true,
          },
          0,
        );
        // …x trails by 0.4s (the goal-title signature).
        tl.fromTo(
          words,
          { x: H3_X_FROM },
          {
            x: 0,
            duration: H3_DUR,
            ease: lusionEase(),
            stagger: H3_STAGGER,
            immediateRender: true,
          },
          H3_X_DELAY,
        );
        // Chapter description column — B3 spirit: whole-block fade+rise,
        // cascaded after the title.
        if (desc) {
          tl.fromTo(
            desc,
            { autoAlpha: 0, y: 30 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 1,
              ease: "expo.out",
              immediateRender: true,
            },
            0.5,
          );
        }
        st = createReplayTrigger(scopeEl, tl);
      });

      refreshOnFontsReady();

      return () => {
        cancelled = true;
        st?.kill();
        tl?.kill();
        if (desc) {
          gsap.killTweensOf(desc);
          gsap.set(desc, { clearProps: "opacity,visibility,transform" });
        }
        if (split) split.revert();
        gsap.set(h2, { clearProps: "display,flexDirection" });
      };
    },
    { scope, dependencies: [language] },
  );
}

// === Ledger rows ===========================================================

export function useLedgerReveal(
  scope: RefObject<HTMLElement | null>,
  language: string,
  onIgnite?: (row: number) => void,
): void {
  // Once-per-page-life ignition latch — survives EN/IT rebuilds on purpose
  // (round-3 contract: the ring flash rides the FIRST landing only).
  const ignitedRef = useRef<boolean[]>([]);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      const scopeEl = scope.current;
      if (!scopeEl) return;
      const rows = Array.from(
        scopeEl.querySelectorAll<HTMLElement>("[data-ledger-row]"),
      );
      if (!rows.length) return;

      let cancelled = false;
      const splits: SplitText[] = [];
      const flexHosts: HTMLElement[] = [];
      const timelines: gsap.core.Timeline[] = [];
      const triggers: ScrollTrigger[] = [];

      document.fonts?.ready.then(() => {
        if (cancelled) return;
        rows.forEach((row, i) => {
          const rollWords = Array.from(
            row.querySelectorAll<HTMLElement>("[data-roll-word]"),
          );
          const rises = row.querySelectorAll<HTMLElement>("[data-row-rise]");
          const claim = row.querySelector<HTMLElement>("[data-claim]");
          const body = row.querySelector<HTMLElement>("[data-row-body]");
          const hairline = row.querySelector<HTMLElement>("[data-hairline]");

          let claimSplit: SplitText | null = null;
          if (claim) {
            claimSplit = new SplitText(claim, {
              type: "lines,words",
              mask: "lines",
              linesClass: "split-line",
            });
            gsap.set(claim, { display: "flex", flexDirection: "column" });
            splits.push(claimSplit);
            flexHosts.push(claim);
          }
          let bodySplit: SplitText | null = null;
          if (body) {
            bodySplit = new SplitText(body, {
              type: "words",
              wordsClass: "split-word",
            });
            splits.push(bodySplit);
          }

          const tl = gsap.timeline({ paused: true });

          // R1 letter-roll, real-time numbers: each word blooms center-out.
          rollWords.forEach((word) => {
            const cols = word.querySelectorAll<HTMLElement>("[data-roll-col]");
            const n = cols.length;
            cols.forEach((col, ci) => {
              tl.fromTo(
                col,
                { yPercent: ROLL_FROM },
                {
                  yPercent: 0,
                  duration: ROLL_DUR,
                  ease: "expo.inOut",
                  immediateRender: true,
                },
                rollDelay(ci, n),
              );
            });
          });
          // Index / arrow wrapper settle.
          if (rises.length) {
            tl.fromTo(
              rises,
              { autoAlpha: 0, yPercent: 60 },
              {
                autoAlpha: 1,
                yPercent: 0,
                duration: 0.8,
                ease: lusionEase(),
                stagger: 0.06,
                immediateRender: true,
              },
              0,
            );
          }
          // Hairline draw.
          if (hairline) {
            tl.fromTo(
              hairline,
              { scaleX: 0, transformOrigin: "0% 50%" },
              {
                scaleX: 1,
                duration: 0.9,
                ease: lusionEase(),
                immediateRender: true,
              },
              0.1,
            );
          }
          // Production claim — recipe H3 (ghost stroke inherits through the
          // split wrappers; the line masks clip the y rise, x slides within).
          if (claimSplit) {
            tl.fromTo(
              claimSplit.words,
              { yPercent: H3_Y_FROM },
              {
                yPercent: 0,
                duration: H3_DUR,
                ease: lusionEase(),
                stagger: H3_STAGGER,
                immediateRender: true,
              },
              0.15,
            );
            tl.fromTo(
              claimSplit.words,
              { x: H3_X_FROM },
              {
                x: 0,
                duration: H3_DUR,
                ease: lusionEase(),
                stagger: H3_STAGGER,
                immediateRender: true,
              },
              0.15 + H3_X_DELAY,
            );
          }
          // Body — recipe B1 word-wave, cascaded after the display roll.
          if (bodySplit) {
            tl.fromTo(
              bodySplit.words,
              { opacity: B1_ALPHA_FROM, yPercent: 100 },
              {
                opacity: 1,
                yPercent: 0,
                duration: B1_DUR,
                ease: "expo.out",
                stagger: B1_STAGGER,
                immediateRender: true,
              },
              BODY_AT,
            );
          }
          // Landing beat: ring i ignites as the entrance lands, once per
          // page life. Seeks (play(0)/pause(0)) suppress events — the call
          // fires only when forward playback crosses the beat.
          if (onIgnite) {
            tl.call(
              () => {
                if (!ignitedRef.current[i]) {
                  ignitedRef.current[i] = true;
                  onIgnite(i);
                }
              },
              [],
              IGNITE_BEAT,
            );
          }

          const st = createReplayTrigger(row, tl);
          // A reload / SPA nav landing PAST the row: the entrance stays
          // reset (it replays on scroll-back), but the WebGL ring must read
          // "already landed" — fire the latch without playing.
          if (onIgnite && st.progress >= 1 && !ignitedRef.current[i]) {
            ignitedRef.current[i] = true;
            onIgnite(i);
          }
          timelines.push(tl);
          triggers.push(st);
        });
      });

      refreshOnFontsReady();

      return () => {
        cancelled = true;
        triggers.forEach((t) => t.kill());
        timelines.forEach((t) => t.kill());
        // Roll cols / rises / hairlines are NOT split-managed — their GSAP
        // inline styles survive the kill on React-reused nodes. Clear them
        // so a language rebuild re-primes from clean markup. (An EN/IT
        // toggle reuses the same spans; stale transforms would stick.)
        rows.forEach((row) => {
          const leftovers = row.querySelectorAll<HTMLElement>(
            "[data-roll-col],[data-row-rise],[data-hairline]",
          );
          gsap.killTweensOf(leftovers);
          gsap.set(leftovers, { clearProps: "transform,opacity,visibility" });
        });
        splits.forEach((s) => s.revert());
        flexHosts.forEach((el) =>
          gsap.set(el, { clearProps: "display,flexDirection" }),
        );
      };
    },
    { scope, dependencies: [language, onIgnite] },
  );
}

// === Per-frame parallax drift =============================================
// ONE module-level driver for every [data-drift] block across both sections.
// Registered entries cache their untransformed doc-space center (and their
// section's doc-space band for the off-screen skip); the tick is pure
// arithmetic + a quickSetter write. Rects re-measure on every ScrollTrigger
// refresh (resize, fonts, layout changes) — never in the loop.

interface DriftEntry {
  el: HTMLElement;
  k: number;
  section: HTMLElement;
  /** Untransformed doc-space Y center of the block (drift-corrected). */
  center: number;
  secTop: number;
  secBottom: number;
  /** Last applied dy (also the measurement correction). */
  dy: number;
  set: (value: number) => void;
}

// Plain array + indexed loops: the tick runs every frame — Set/forEach would
// allocate an iterator/closure per frame (zero-per-frame-allocation rule).
// Mutations (register/unregister/measure) are rare and event-driven.
const driftEntries: DriftEntry[] = [];
let driftArmed = false;
let driftWinH = 0;

function measureDriftEntry(en: DriftEntry, scrollY: number): void {
  const r = en.el.getBoundingClientRect();
  // Subtract the currently applied drift so the transform never feeds back
  // into the cached center.
  en.center = r.top + scrollY + r.height / 2 - en.dy;
  const sr = en.section.getBoundingClientRect();
  en.secTop = sr.top + scrollY;
  en.secBottom = sr.bottom + scrollY;
}

function measureAllDrift(): void {
  if (typeof window === "undefined") return;
  driftWinH = window.innerHeight;
  const sy = window.scrollY;
  for (let i = 0; i < driftEntries.length; i++) {
    measureDriftEntry(driftEntries[i], sy);
  }
}

function driftTick(): void {
  const sy = window.scrollY;
  const viewBottom = sy + driftWinH;
  const viewCenter = sy + driftWinH / 2;
  for (let i = 0; i < driftEntries.length; i++) {
    const en = driftEntries[i];
    // Skip writes while the block's section is fully off-screen.
    if (en.secBottom < sy || en.secTop > viewBottom) continue;
    const dy = (1 - en.k) * (en.center - viewCenter) * DRIFT_SCALE;
    if (Math.abs(dy - en.dy) < 0.05) continue;
    en.dy = dy;
    en.set(dy);
  }
}

function armDriftDriver(): void {
  if (driftArmed) return;
  driftArmed = true;
  measureAllDrift();
  gsap.ticker.add(driftTick);
  ScrollTrigger.addEventListener("refresh", measureAllDrift);
}

function disarmDriftDriverIfEmpty(): void {
  if (!driftArmed || driftEntries.length > 0) return;
  driftArmed = false;
  gsap.ticker.remove(driftTick);
  ScrollTrigger.removeEventListener("refresh", measureAllDrift);
}

function registerDrift(
  el: HTMLElement,
  k: number,
  section: HTMLElement,
): () => void {
  const en: DriftEntry = {
    el,
    k,
    section,
    center: 0,
    secTop: 0,
    secBottom: 0,
    dy: 0,
    set: gsap.quickSetter(el, "y", "px") as (value: number) => void,
  };
  if (!driftWinH) driftWinH = window.innerHeight;
  measureDriftEntry(en, window.scrollY);
  driftEntries.push(en);
  armDriftDriver();
  return () => {
    const idx = driftEntries.indexOf(en);
    if (idx !== -1) driftEntries.splice(idx, 1);
    gsap.set(el, { clearProps: "transform" });
    disarmDriftDriverIfEmpty();
  };
}

/**
 * Registers every `[data-drift="<k>"]` wrapper inside `scope` with the shared
 * driver. The scope element doubles as the "section" for the off-screen skip
 * (pass the section ref). Drift owns each wrapper's transform exclusively.
 */
export function useTextDrift(
  scope: RefObject<HTMLElement | null>,
  language: string,
): void {
  useGSAP(
    () => {
      if (reducedMotion()) return;
      const scopeEl = scope.current;
      if (!scopeEl) return;
      const blocks = scopeEl.querySelectorAll<HTMLElement>("[data-drift]");
      if (!blocks.length) return;
      const cleanups: (() => void)[] = [];
      blocks.forEach((el) => {
        const k = parseFloat(el.dataset.drift ?? "");
        if (!Number.isFinite(k) || k === 1) return;
        cleanups.push(registerDrift(el, k, scopeEl));
      });
      return () => {
        cleanups.forEach((fn) => fn());
      };
    },
    { scope, dependencies: [language] },
  );
}

// === Hv1 — the hover letter-shift + arrow slide ===========================

function waveTargets(row: HTMLElement) {
  return {
    cols: Array.from(
      row.querySelectorAll<HTMLElement>("[data-wave-word] [data-roll-col]"),
    ),
    arrow: row.querySelector<HTMLElement>("[data-wave-arrow]"),
  };
}

function waveIn(row: HTMLElement): void {
  const { cols, arrow } = waveTargets(row);
  const n = cols.length;
  if (n) {
    gsap.killTweensOf(cols, "x");
    cols.forEach((col, i) => {
      gsap.to(col, {
        x: `${WAVE_SHIFT_EM}em`,
        duration: WAVE_DUR,
        ease: lusionEase(),
        // Right-most chars move first — the wave travels toward the arrow.
        delay: (n - 1 - i) / 100,
      });
    });
  }
  if (arrow) {
    gsap.killTweensOf(arrow, "x");
    gsap.to(arrow, {
      x: `${ARROW_SHIFT_EM}em`,
      duration: ARROW_DUR,
      ease: lusionEase(),
      delay: ARROW_DELAY,
    });
  }
}

function waveOut(row: HTMLElement): void {
  const { cols, arrow } = waveTargets(row);
  if (cols.length) {
    gsap.killTweensOf(cols, "x");
    cols.forEach((col, i) => {
      gsap.to(col, {
        x: 0,
        duration: WAVE_DUR,
        ease: lusionEase(),
        // Mirror: left-most returns first as the ratio ramps down.
        delay: i / 100,
      });
    });
  }
  if (arrow) {
    gsap.killTweensOf(arrow, "x");
    gsap.to(arrow, { x: 0, duration: ARROW_DUR, ease: lusionEase() });
  }
}

/**
 * Returns a STABLE `(index | null) => void` callback for useLedgerIgnition's
 * `onResolvedChange`: waves the newly ignited row in and the previous one
 * out. Queries lazily per edge (event-driven, never per-frame) so EN/IT
 * rebuilds are picked up automatically. Inert under reduced motion.
 */
export function useIgnitionWave(
  scope: RefObject<HTMLElement | null>,
): (index: number | null) => void {
  const litRef = useRef<number | null>(null);
  return useCallback(
    (index: number | null) => {
      if (typeof window === "undefined" || reducedMotion()) return;
      const prev = litRef.current;
      if (prev === index) return;
      litRef.current = index;
      const scopeEl = scope.current;
      if (!scopeEl) return;
      const rowEl = (i: number) =>
        scopeEl.querySelector<HTMLElement>(`[data-ledger-row="${i}"]`);
      if (prev !== null) {
        const row = rowEl(prev);
        if (row) waveOut(row);
      }
      if (index !== null) {
        const row = rowEl(index);
        if (row) waveIn(row);
      }
    },
    [scope],
  );
}
