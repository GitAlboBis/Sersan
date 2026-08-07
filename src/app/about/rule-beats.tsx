"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/**
 * RuleBeats — /about's "Three rules. Non-negotiable." as three sequential
 * full-width typographic beats. A direct port of ../audit/door-beats.tsx
 * (read that file for the long-form rationale of the grammar: full-width
 * hairline beats, one-shot masked entrances, no cards) replacing the
 * md:grid-cols-3 card-steel grid — the page's best moments are big text
 * (hero, blockquote, CountUp strip) and the card grid was its lone
 * offender. Every EN+IT num/title/body string is passed in from
 * about-client byte-identical; only the card chrome (border, fill,
 * per-card Reveal) is retired. The cards carried no links or CTAs, so
 * none exist here either (no fake affordance).
 *
 * ONE INFLECTION vs door-beats — these are RULES, so the NUMBER is the
 * hero: "01/02/03" is set LARGE in the display serif at
 * clamp(2.5rem,4.5vw,3.75rem), accent-dimmed at rest, replacing the mono
 * "DOOR NN" eyebrow entirely. The cyan side tick survives, scaled to the
 * numeral. The rule title sits NEXT TO the number (bottom-aligned) on sm+
 * and UNDER it on mobile, subordinate at clamp(1.5rem,2.6vw,2.25rem);
 * the description holds reading width in the right column on lg (the
 * door-beats shelf). The number is part of the one-shot entrance reveal
 * (it leads the type cascade out of its own overflow mask) — NOT a
 * scroll-scrubbed element.
 *
 * MOTION — one-shot entrance per beat (IO at the site's -18% bottom
 * rootMargin, the Reveal/ledger contract), NOT scrubbed. Per beat, a
 * single paused timeline (defaults expo.out) with a ~60ms cascade:
 *   rule scaleX 0→1 (0.8s, @0) · cyan tick sweeps (scaleY, 0.45s, @0.06) ·
 *   NUMBER rises out of an overflow mask (yPercent 110→0, 0.75s, @0.12 —
 *   the hero leads) · title rises out of its mask (0.75s, @0.18) ·
 *   description rises (y 14, 0.55s, @0.24). Transforms/opacity only —
 *   zero layout shift, no ScrollTrigger.refresh ever needed.
 *
 * MODES (door-beats' split, verbatim): "interactive" (desktop, fine
 * pointer, no reduced-motion) vs "static" (≤768px, coarse pointer,
 * prefers-reduced-motion). SSR default is "static" — everything visible;
 * hidden entrance poses are imposed only under JS+motion, so no-JS,
 * crawlers and reduced-motion never lose content. Beats keep stable num
 * keys, so an EN↔IT toggle swaps text in place (elements never remount)
 * and a pending entrance still targets live nodes; playedRef guarantees
 * a language switch never replays or re-hides a beat.
 *
 * A11Y: ul/li semantics; no interactive elements inside (the cards had
 * none), so nothing to focus.
 */

type Rule = { num: string; title: string; body: string };

const EASE_ENTRANCE = "expo.out"; // the site's --ease-entrance equivalent
/** Internal element cascade offset — the door-beats ~60ms stagger. */
const BEAT_STAGGER = 0.06;

type BeatParts = {
  tl: gsap.core.Timeline;
  all: HTMLElement[];
};

export function RuleBeats({ rules }: { rules: Rule[] }) {
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

  // One-shot entrance per beat. rules is deliberately NOT a dep: keys are
  // stable across EN↔IT (text swaps in place, elements survive), so the
  // poses and timelines built here stay valid across a language toggle.
  useEffect(() => {
    if (!detected || mode !== "interactive") return;
    const root = rootRef.current;
    if (!root) return;
    const beats = Array.from(root.querySelectorAll<HTMLElement>("[data-rb-beat]"));
    if (beats.length === 0) return;

    const played = playedRef.current;
    const recs = new Map<Element, BeatParts>();

    for (const el of beats) {
      const id = el.dataset.rbBeat ?? "";
      if (played.has(id)) continue;

      const rule = el.querySelector<HTMLElement>("[data-rb-rule]");
      const tick = el.querySelector<HTMLElement>("[data-rb-tick]");
      const num = el.querySelector<HTMLElement>("[data-rb-num]");
      const title = el.querySelector<HTMLElement>("[data-rb-title]");
      const desc = el.querySelector<HTMLElement>("[data-rb-desc]");
      if (!rule || !tick || !num || !title || !desc) continue;

      // Hidden entrance pose — imposed only here (JS + motion), never in
      // CSS, so SSR/static paints the full section.
      gsap.set(rule, { scaleX: 0, transformOrigin: "0% 50%" });
      gsap.set(tick, { scaleY: 0, transformOrigin: "50% 0%" });
      gsap.set(num, { yPercent: 110 }); // masked by the overflow wrapper
      gsap.set(title, { yPercent: 110 }); // masked by the overflow wrapper
      gsap.set(desc, { autoAlpha: 0, y: 14 });

      const tl = gsap.timeline({ paused: true, defaults: { ease: EASE_ENTRANCE } });
      tl.to(rule, { scaleX: 1, duration: 0.8 }, 0)
        .to(tick, { scaleY: 1, duration: 0.45 }, BEAT_STAGGER)
        .to(num, { yPercent: 0, duration: 0.75 }, BEAT_STAGGER * 2)
        .to(title, { yPercent: 0, duration: 0.75 }, BEAT_STAGGER * 3)
        .to(desc, { autoAlpha: 1, y: 0, duration: 0.55 }, BEAT_STAGGER * 4);

      recs.set(el, { tl, all: [rule, tick, num, title, desc] });
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
            played.add((entry.target as HTMLElement).dataset.rbBeat ?? "");
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
      {rules.map((r) => (
        <li key={r.num} data-rb-beat={r.num} className="relative">
          {/* Full-width hairline between beats — draws itself (scaleX) as
              the beat enters; plain visible rule in static mode. */}
          <span
            data-rb-rule
            aria-hidden="true"
            className="absolute inset-x-0 top-0 block h-px bg-rule/70"
          />
          <div className="py-[clamp(2.5rem,6vh,4.25rem)] lg:grid lg:grid-cols-12 lg:gap-x-10">
            <div className="lg:col-span-7">
              {/* Number-as-hero + title: stacked on mobile (title UNDER the
                  number), bottom-aligned row on sm+ (title NEXT TO it). */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-x-7">
                {/* The numeral — display serif, accent-dimmed at rest,
                    rising out of a line mask. Font size lives on this
                    wrapper so the em-scaled cyan tick tracks the numeral. */}
                <div className="relative shrink-0 pl-4 text-[clamp(2.5rem,4.5vw,3.75rem)] sm:pl-5">
                  <span
                    data-rb-tick
                    aria-hidden="true"
                    className="absolute left-0 top-[0.14em] h-[0.8em] w-[2px] origin-top bg-accent"
                  />
                  <div className="overflow-hidden">
                    <p
                      data-rb-num
                      className="font-display leading-[0.95] tracking-[-0.02em] pb-1"
                      style={{ color: "hsl(var(--accent) / 0.55)" }}
                    >
                      {r.num}
                    </p>
                  </div>
                </div>
                {/* Rule title — display serif, subordinate to the numeral. */}
                <div className="overflow-hidden">
                  <h3
                    data-rb-title
                    className="font-display text-[clamp(1.5rem,2.6vw,2.25rem)] leading-[1.12] tracking-[-0.02em] text-ink pb-1"
                  >
                    {r.title}
                  </h3>
                </div>
              </div>
            </div>
            {/* Description — reading width; beside the number/title on lg
                (bottom-aligned on their shelf), below them on smaller
                widths. */}
            <div className="lg:col-span-5 lg:flex lg:items-end">
              <p
                data-rb-desc
                className="mt-4 max-w-xl text-[15px] leading-[1.6] text-ink-mute sm:text-base lg:mt-0 lg:pb-1.5"
              >
                {r.body}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
