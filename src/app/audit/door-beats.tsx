"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/**
 * DoorBeats — the /audit "three doors after" as three sequential full-width
 * typographic beats (the engagement-acts family at a smaller scale; read
 * ../consulting/engagement-acts.tsx for the long-form rationale). Replaces
 * the md:grid-cols-3 card-steel grid; every EN+IT title/description pair is
 * passed in from audit-client byte-identical — only the card chrome (border,
 * fill, per-card Reveal) is retired. The cards carried no links or CTAs, so
 * none exist here either (no fake affordance).
 *
 * STRUCTURE — three full-width beats separated by full-width hairlines:
 *   - mono "DOOR 01/02/03" eyebrow ("PORTA" in IT; uppercase is CSS-only)
 *     with a cyan side tick,
 *   - the door title in the display serif at clamp(1.75rem,3.2vw,2.75rem) —
 *     deliberately subordinate to the surfaces ledger's clamp(2.25rem,5vw,
 *     4.5rem) above,
 *   - the description BESIDE the title on lg (bottom-aligned, right column)
 *     and below it on smaller viewports.
 *   All three doors get the identical treatment: the honesty arc (door 02
 *   "the roadmap is yours", door 03 "the report doesn't expire") is the
 *   point, so doors 2 and 3 hold equal typographic dignity with door 1 —
 *   no visual hierarchy that nudges toward "build it with us".
 *
 * MOTION — one-shot entrance per beat (IO at the site's -18% bottom
 * rootMargin, the Reveal/ledger contract), NOT scrubbed. Per beat, a single
 * paused timeline (defaults expo.out) with a ~60ms internal cascade:
 *   rule scaleX 0→1 (0.8s, @0) · eyebrow slides from the rail (x -24, 0.55s,
 *   @0.06) · cyan tick sweeps (scaleY, 0.45s, @0.12) · title rises out of an
 *   overflow mask (yPercent 110→0, 0.75s, @0.18) · description rises
 *   (y 14, 0.55s, @0.24). Transforms/opacity only — zero layout shift, no
 *   ScrollTrigger.refresh ever needed.
 *
 * MODES (the ledger's split): "interactive" (desktop, fine pointer, no
 * reduced-motion) vs "static" (≤768px, coarse pointer, prefers-reduced-
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

type Door = { title: string; desc: string };

const EASE_ENTRANCE = "expo.out"; // the site's --ease-entrance equivalent
/** Internal element cascade offset — the brief's ~60ms stagger. */
const BEAT_STAGGER = 0.06;

type BeatParts = {
  tl: gsap.core.Timeline;
  all: HTMLElement[];
};

export function DoorBeats({ doors, isEn }: { doors: Door[]; isEn: boolean }) {
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

  // One-shot entrance per beat. isEn/doors are deliberately NOT deps: keys
  // are stable across EN↔IT (text swaps in place, elements survive), so the
  // poses and timelines built here stay valid across a language toggle.
  useEffect(() => {
    if (!detected || mode !== "interactive") return;
    const root = rootRef.current;
    if (!root) return;
    const beats = Array.from(root.querySelectorAll<HTMLElement>("[data-db-beat]"));
    if (beats.length === 0) return;

    const played = playedRef.current;
    const recs = new Map<Element, BeatParts>();

    for (const el of beats) {
      const id = el.dataset.dbBeat ?? "";
      if (played.has(id)) continue;

      const rule = el.querySelector<HTMLElement>("[data-db-rule]");
      const num = el.querySelector<HTMLElement>("[data-db-num]");
      const tick = el.querySelector<HTMLElement>("[data-db-tick]");
      const title = el.querySelector<HTMLElement>("[data-db-title]");
      const desc = el.querySelector<HTMLElement>("[data-db-desc]");
      if (!rule || !num || !tick || !title || !desc) continue;

      // Hidden entrance pose — imposed only here (JS + motion), never in
      // CSS, so SSR/static paints the full section.
      gsap.set(rule, { scaleX: 0, transformOrigin: "0% 50%" });
      gsap.set(num, { autoAlpha: 0, x: -24 });
      gsap.set(tick, { scaleY: 0, transformOrigin: "50% 0%" });
      gsap.set(title, { yPercent: 110 }); // masked by the overflow wrapper
      gsap.set(desc, { autoAlpha: 0, y: 14 });

      const tl = gsap.timeline({ paused: true, defaults: { ease: EASE_ENTRANCE } });
      tl.to(rule, { scaleX: 1, duration: 0.8 }, 0)
        .to(num, { autoAlpha: 1, x: 0, duration: 0.55 }, BEAT_STAGGER)
        .to(tick, { scaleY: 1, duration: 0.45 }, BEAT_STAGGER * 2)
        .to(title, { yPercent: 0, duration: 0.75 }, BEAT_STAGGER * 3)
        .to(desc, { autoAlpha: 1, y: 0, duration: 0.55 }, BEAT_STAGGER * 4);

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
            played.add((entry.target as HTMLElement).dataset.dbBeat ?? "");
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
      {doors.map((d, i) => {
        const num = String(i + 1).padStart(2, "0");
        return (
          <li key={num} data-db-beat={num} className="relative">
            {/* Full-width hairline between beats — draws itself (scaleX) as
                the beat enters; plain visible rule in static mode. */}
            <span
              data-db-rule
              aria-hidden="true"
              className="absolute inset-x-0 top-0 block h-px bg-rule/70"
            />
            <div className="py-[clamp(2.5rem,6vh,4.25rem)] lg:grid lg:grid-cols-12 lg:gap-x-10">
              <div className="lg:col-span-7">
                {/* Mono "DOOR NN" eyebrow + cyan tick (uppercase is CSS-only;
                    the label itself is new task-mandated microcopy, not
                    ported card copy). */}
                <p
                  data-db-num
                  className="relative inline-block pl-3 font-mono text-[11px] uppercase tracking-[0.28em] text-accent sm:pl-4 sm:text-[13px]"
                >
                  <span
                    data-db-tick
                    aria-hidden="true"
                    className="absolute left-0 top-[0.05em] h-[1.15em] w-[2px] origin-top bg-accent"
                  />
                  {isEn ? "Door" : "Porta"} {num}
                </p>
                {/* Door title — display serif, rising out of a line mask;
                    subordinate scale to the surfaces ledger above. */}
                <div className="mt-4 overflow-hidden">
                  <h3
                    data-db-title
                    className="font-display text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.12] tracking-[-0.02em] text-ink pb-1"
                  >
                    {d.title}
                  </h3>
                </div>
              </div>
              {/* Description — beside the title on lg (bottom-aligned so it
                  sits on the title's shelf), below it on smaller widths. */}
              <div className="lg:col-span-5 lg:flex lg:items-end">
                <p
                  data-db-desc
                  className="mt-4 max-w-xl text-[15px] leading-[1.6] text-ink-mute sm:text-base lg:mt-0 lg:pb-1.5"
                >
                  {d.desc}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
