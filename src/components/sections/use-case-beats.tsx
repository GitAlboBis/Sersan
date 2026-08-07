"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/**
 * UseCaseBeats — the /services/<slug> "Use cases" as three sequential
 * full-width typographic beats: a direct port of src/app/audit/door-beats.tsx
 * at REDUCED AMPLITUDE (read that file for the long-form rationale of the
 * grammar: full-width hairline beats, one-shot masked entrances, no cards).
 * Replaces the md:grid-cols-3 card-steel grid on all four service-detail
 * routes; every EN+IT eyebrow/title/detail string is passed in from
 * service-detail pre-localized and byte-identical — only the card chrome
 * (border, fill, per-card Reveal) is retired. The cards carried no links or
 * CTAs, so none exist here either (no fake affordance).
 *
 * SCALE — these are secondary pages, so every value is subordinate to the
 * door-beats original: title clamp(1.4rem,2.5vw,2rem) vs door-beats'
 * clamp(1.75rem,3.2vw,2.75rem), row rhythm clamp(1.75rem,4.5vh,3rem) vs
 * clamp(2.5rem,6vh,4.25rem), and the entrance amplitudes roughly two thirds
 * (x -16 vs -24, y 10 vs 14, durations trimmed ~0.1s each). The cascade
 * order and ~60ms internal stagger are identical.
 *
 * MOTION — one-shot entrance per beat (IO at the site's -18% bottom
 * rootMargin, the Reveal/ledger contract), NOT scrubbed. Per beat, a single
 * paused timeline (defaults expo.out):
 *   rule scaleX 0→1 (0.7s, @0) · eyebrow slides from the rail (x -16, 0.5s,
 *   @0.06) · cyan tick sweeps (scaleY, 0.4s, @0.12) · title rises out of an
 *   overflow mask (yPercent 110→0, 0.65s, @0.18) · description rises
 *   (y 10, 0.5s, @0.24). Transforms/opacity only — zero layout shift, no
 *   ScrollTrigger.refresh ever needed.
 *
 * MODES (door-beats' split, verbatim): "interactive" (desktop, fine pointer,
 * no reduced-motion) vs "static" (≤768px, coarse pointer, prefers-reduced-
 * motion). SSR default is "static" — everything visible; hidden entrance
 * poses are imposed only under JS+motion, so no-JS, crawlers and
 * reduced-motion never lose content. Beats keep stable index keys, so an
 * EN↔IT toggle swaps text in place (elements never remount) and a pending
 * entrance still targets live nodes; playedRef guarantees a language switch
 * never replays or re-hides a beat.
 *
 * A11Y: ul/li semantics; no interactive elements inside (the cards had
 * none), so nothing to focus.
 */

type UseCaseBeat = {
  /** Mono rail label, e.g. "01 · Use case" — composed by the caller from the
   *  template's existing microcopy (uppercase is CSS-only). */
  eyebrow: string;
  title: string;
  desc: string;
};

const EASE_ENTRANCE = "expo.out"; // the site's --ease-entrance equivalent
/** Internal element cascade offset — the door-beats ~60ms stagger. */
const BEAT_STAGGER = 0.06;

type BeatParts = {
  tl: gsap.core.Timeline;
  all: HTMLElement[];
};

export function UseCaseBeats({ items }: { items: UseCaseBeat[] }) {
  // SSR default = "static": everything visible is what no-JS, crawlers and
  // reduced-motion get. Interactive mode is opted into after detection.
  const [mode, setMode] = useState<"static" | "interactive">("static");
  const [detected, setDetected] = useState(false);
  const rootRef = useRef<HTMLUListElement | null>(null);
  /** Beats (by num) whose entrance already played — never re-hidden. */
  const playedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(mobile || coarse || reduced ? "static" : "interactive");
    setDetected(true);
  }, []);

  // One-shot entrance per beat. items is deliberately NOT a dep: keys are
  // stable across EN↔IT (text swaps in place, elements survive), so the
  // poses and timelines built here stay valid across a language toggle.
  useEffect(() => {
    if (!detected || mode !== "interactive") return;
    const root = rootRef.current;
    if (!root) return;
    const beats = Array.from(root.querySelectorAll<HTMLElement>("[data-ucb-beat]"));
    if (beats.length === 0) return;

    const played = playedRef.current;
    const recs = new Map<Element, BeatParts>();

    for (const el of beats) {
      const id = el.dataset.ucbBeat ?? "";
      if (played.has(id)) continue;

      const rule = el.querySelector<HTMLElement>("[data-ucb-rule]");
      const num = el.querySelector<HTMLElement>("[data-ucb-num]");
      const tick = el.querySelector<HTMLElement>("[data-ucb-tick]");
      const title = el.querySelector<HTMLElement>("[data-ucb-title]");
      const desc = el.querySelector<HTMLElement>("[data-ucb-desc]");
      if (!rule || !num || !tick || !title || !desc) continue;

      // Hidden entrance pose — imposed only here (JS + motion), never in
      // CSS, so SSR/static paints the full section.
      gsap.set(rule, { scaleX: 0, transformOrigin: "0% 50%" });
      gsap.set(num, { autoAlpha: 0, x: -16 });
      gsap.set(tick, { scaleY: 0, transformOrigin: "50% 0%" });
      gsap.set(title, { yPercent: 110 }); // masked by the overflow wrapper
      gsap.set(desc, { autoAlpha: 0, y: 10 });

      const tl = gsap.timeline({ paused: true, defaults: { ease: EASE_ENTRANCE } });
      tl.to(rule, { scaleX: 1, duration: 0.7 }, 0)
        .to(num, { autoAlpha: 1, x: 0, duration: 0.5 }, BEAT_STAGGER)
        .to(tick, { scaleY: 1, duration: 0.4 }, BEAT_STAGGER * 2)
        .to(title, { yPercent: 0, duration: 0.65 }, BEAT_STAGGER * 3)
        .to(desc, { autoAlpha: 1, y: 0, duration: 0.5 }, BEAT_STAGGER * 4);

      recs.set(el, { tl, all: [rule, num, tick, title, desc] });
    }
    if (recs.size === 0) return;

    // IO batch (Reveal's exact contract: -18% bottom rootMargin, threshold 0,
    // fires immediately for elements already in view after an SPA nav).
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const rec = recs.get(entry.target);
          if (rec) {
            played.add((entry.target as HTMLElement).dataset.ucbBeat ?? "");
            rec.tl.play();
          }
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -18% 0px", threshold: 0 },
    );
    recs.forEach((_, el) => io.observe(el));

    return () => {
      io.disconnect();
      recs.forEach(({ tl, all }) => {
        tl.kill();
        gsap.killTweensOf(all);
        gsap.set(all, { clearProps: "opacity,visibility,transform" });
      });
    };
  }, [detected, mode]);

  return (
    <ul ref={rootRef} role="list" className="border-b border-rule/70">
      {items.map((uc, i) => {
        const num = String(i + 1).padStart(2, "0");
        return (
          <li key={num} data-ucb-beat={num} className="relative">
            {/* Full-width hairline between beats — draws itself (scaleX) as
                the beat enters; plain visible rule in static mode. */}
            <span
              data-ucb-rule
              aria-hidden="true"
              className="absolute inset-x-0 top-0 block h-px bg-rule/70"
            />
            <div className="py-[clamp(1.75rem,4.5vh,3rem)] lg:grid lg:grid-cols-12 lg:gap-x-10">
              <div className="lg:col-span-7">
                {/* Mono "NN · Use case" eyebrow + cyan tick — the retired
                    card's exact label strings (uppercase is CSS-only). */}
                <p
                  data-ucb-num
                  className="relative inline-block pl-3 font-mono text-[10px] uppercase tracking-[0.18em] text-accent sm:text-[11px]"
                >
                  <span
                    data-ucb-tick
                    aria-hidden="true"
                    className="absolute left-0 top-[0.05em] h-[1.15em] w-[2px] origin-top bg-accent"
                  />
                  {uc.eyebrow}
                </p>
                {/* Use-case title — display serif, rising out of a line mask;
                    subordinate scale to door-beats (secondary page). */}
                <div className="mt-3 overflow-hidden">
                  <h3
                    data-ucb-title
                    className="font-display text-[clamp(1.4rem,2.5vw,2rem)] leading-[1.15] tracking-[-0.018em] text-ink pb-1"
                  >
                    {uc.title}
                  </h3>
                </div>
              </div>
              {/* Description — beside the title on lg (bottom-aligned so it
                  sits on the title's shelf), below it on smaller widths. */}
              <div className="lg:col-span-5 lg:flex lg:items-end">
                <p
                  data-ucb-desc
                  className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-mute lg:mt-0 lg:pb-1.5"
                >
                  {uc.desc}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
