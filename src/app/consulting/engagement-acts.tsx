"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useLanguage } from "@/components/language-provider";
import { ENGAGEMENT, FACTS, pick } from "@/data/copy";

/**
 * EngagementActs — the /consulting engagement formats as a sequential
 * big-type step-through ("less cards, big text", second application of the
 * PracticeLedger direction). Replaces the three bordered card-steel pricing
 * columns; every EN+IT content string (format name, duration line, one-line
 * positioning sentence, deliverables) is carried over byte-identical — only
 * the card chrome (border, bg, bullets-in-a-box, per-card Reveal) is retired.
 * The cards carried no links, so none exist here either (no fake affordance,
 * same rationale as the ledger's non-link rows).
 *
 * STRUCTURE — three full-width acts, separated by full-width hairlines and
 * generous rhythm (py clamp(3rem,7vh,5.5rem)):
 *   - mono index rail label "01 · FIXED SCOPE" (qualifier derived from each
 *     format's existing scope line) with a cyan side tick,
 *   - the format name huge in the display serif (the ledger's exact clamp
 *     family: clamp(2.25rem,5vw,4.5rem)),
 *   - the positioning sentence,
 *   - deliverables as a two-column hairline table (mono micro-labels, CSS
 *     uppercase — DOM strings untouched),
 *   - the existing duration line as the table's closing summary row.
 *   Act 02 offsets right by one grid column on xl — a quiet alternation that
 *   keeps the three acts from reading as a repeated template.
 *
 * MOTION — one-shot entrance per act (IO at the site's -18% bottom
 * rootMargin, the Reveal/ledger contract), NOT scrubbed: the ledger above
 * already owns the scrub, this section gets three confident acts. Per act,
 * a single paused timeline (defaults expo.out):
 *   rule scaleX 0→1 (0.9s) · number slides from the left rail (x -28, 0.6s)
 *   · cyan tick sweeps (scaleY, 0.5s) · title rises out of an overflow mask
 *   (yPercent 115→0, 0.85s — the HeadingChoreographer 'lines' values for a
 *   single line, without SplitText ownership of the subtree) · sentence
 *   rises (y 16, 0.6s) · deliverables cascade (50ms stagger) · duration row
 *   settles last. Transforms/opacity only — zero layout shift, so no
 *   ScrollTrigger.refresh is ever needed.
 *
 * MODES (the ledger's split): "interactive" (desktop, fine pointer, no
 * reduced-motion) vs "static" (≤768px, coarse pointer, prefers-reduced-
 * motion). SSR default is "static" — everything visible; hidden entrance
 * poses are imposed only under JS+motion, so no-JS, crawlers and
 * reduced-motion never lose content. Same DOM in both modes. Acts and
 * deliverable rows keep stable keys, so an EN↔IT toggle swaps text in place
 * (elements never remount) and a pending entrance still targets live nodes;
 * playedRef guarantees a language switch never replays or re-hides an act.
 *
 * A11Y: ul/li semantics for both the act list and each deliverables table;
 * acts hold no interactive elements (no links survived from the cards), so
 * there is nothing to focus — hover states were deliberately removed with
 * the card chrome.
 */

type EngagementFormat = {
  num: string;
  /** Mono rail qualifier — derived from the format's existing scope line. */
  qual: string;
  name: string;
  timing: string;
  desc: string;
  includes: string[];
};

function getFormats(isEn: boolean): EngagementFormat[] {
  return [
    {
      num: "01",
      qual: isEn ? "Fixed scope" : "Scope fisso",
      name: pick(isEn, ENGAGEMENT.diagnostic.name),
      timing: pick(isEn, FACTS.auditDuration),
      desc: isEn
        ? "One workflow, product problem or system, looked at properly — or widened to a full technical audit when the whole picture matters."
        : "Un processo, un problema di prodotto o un sistema, guardati sul serio; oppure allargati a un audit tecnico completo quando serve il quadro intero.",
      includes: isEn
        ? [
            "The problem, framed in writing",
            "Build, buy or leave it alone",
            "Prioritised next steps",
            "Effort and cost estimate",
            "Optional: full technical audit",
          ]
        : [
            "Il problema messo per iscritto",
            "Costruire, comprare o lasciar stare",
            "Prossimi passi in ordine",
            "Stima di effort e costo",
            "Opzionale: audit tecnico completo",
          ],
    },
    {
      num: "02",
      qual: isEn ? "Build + ship" : "Build operativo",
      name: pick(isEn, ENGAGEMENT.sprint.name),
      timing: pick(isEn, FACTS.sprintDuration),
      desc: isEn
        ? "Hands-on build in visible increments: design, implementation, testing, handover."
        : "Build operativo in incrementi visibili: design, implementazione, test, handover.",
      includes: isEn
        ? ["Design + implementation", "Written acceptance criteria", "Testing + QA", "Handover docs + training"]
        : ["Design + implementazione", "Criteri di accettazione scritti", "Testing + QA", "Handover documentato + formazione"],
    },
    {
      num: "03",
      qual: isEn ? "Continuation" : "Continuità",
      name: pick(isEn, ENGAGEMENT.partnership.name),
      timing: isEn ? "Scoped per phase, renewed on merit" : "Scope per fase, rinnovata sui risultati",
      desc: isEn
        ? "Continued development, support or fractional technical leadership — scoped separately each time."
        : "Sviluppo continuativo, supporto o direzione tecnica frazionale, con uno scope definito ogni volta.",
      includes: isEn
        ? [
            "Continued development",
            "Maintenance + support",
            "Optimisation + iteration",
            "Fractional technical leadership",
            "Roadmap + vendor decisions",
          ]
        : [
            "Sviluppo continuativo",
            "Manutenzione + supporto",
            "Ottimizzazione + iterazione",
            "Direzione tecnica frazionale",
            "Roadmap + scelta dei fornitori",
          ],
    },
  ];
}

/* ------------------------------------------------------------------------ */
/* Entrance choreography values (one paused timeline per act).              */
/* ------------------------------------------------------------------------ */

const EASE_ENTRANCE = "expo.out"; // the site's --ease-entrance equivalent
/** Deliverables cascade stagger — inside the 40–60ms band. */
const ITEM_STAGGER = 0.05;

type ActParts = {
  tl: gsap.core.Timeline;
  all: (HTMLElement | HTMLElement[])[];
};

export function EngagementActs() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const formats = getFormats(isEn);

  // SSR default = "static": everything visible is what no-JS, crawlers and
  // reduced-motion get. Interactive mode is opted into after detection.
  const [mode, setMode] = useState<"static" | "interactive">("static");
  const [detected, setDetected] = useState(false);
  const rootRef = useRef<HTMLUListElement | null>(null);
  /** Acts (by num) whose entrance already played — never re-hidden. */
  const playedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(mobile || coarse || reduced ? "static" : "interactive");
    setDetected(true);
  }, []);

  // One-shot entrance per act. isEn is deliberately NOT a dependency: keys
  // are stable across EN↔IT (text swaps in place, elements survive), so the
  // poses and timelines built here stay valid across a language toggle.
  useEffect(() => {
    if (!detected || mode !== "interactive") return;
    const root = rootRef.current;
    if (!root) return;
    const acts = Array.from(root.querySelectorAll<HTMLElement>("[data-ea-act]"));
    if (acts.length === 0) return;

    const played = playedRef.current;
    const recs = new Map<Element, ActParts>();

    for (const el of acts) {
      const id = el.dataset.eaAct ?? "";
      if (played.has(id)) continue;

      const rule = el.querySelector<HTMLElement>("[data-ea-rule]");
      const num = el.querySelector<HTMLElement>("[data-ea-num]");
      const tick = el.querySelector<HTMLElement>("[data-ea-tick]");
      const title = el.querySelector<HTMLElement>("[data-ea-title]");
      const desc = el.querySelector<HTMLElement>("[data-ea-desc]");
      const timing = el.querySelector<HTMLElement>("[data-ea-timing]");
      const items = Array.from(el.querySelectorAll<HTMLElement>("[data-ea-item]"));
      if (!rule || !num || !tick || !title || !desc || !timing) continue;

      // Hidden entrance pose — imposed only here (JS + motion), never in CSS,
      // so SSR/static paints the full section.
      gsap.set(rule, { scaleX: 0, transformOrigin: "0% 50%" });
      gsap.set(num, { autoAlpha: 0, x: -28 });
      gsap.set(tick, { scaleY: 0, transformOrigin: "50% 0%" });
      gsap.set(title, { yPercent: 115 }); // masked by the overflow wrapper
      gsap.set(desc, { autoAlpha: 0, y: 16 });
      if (items.length > 0) gsap.set(items, { autoAlpha: 0, y: 14 });
      gsap.set(timing, { autoAlpha: 0, y: 8 });

      const tl = gsap.timeline({ paused: true, defaults: { ease: EASE_ENTRANCE } });
      tl.to(rule, { scaleX: 1, duration: 0.9 }, 0)
        .to(num, { autoAlpha: 1, x: 0, duration: 0.6 }, 0.05)
        .to(tick, { scaleY: 1, duration: 0.5 }, 0.15)
        .to(title, { yPercent: 0, duration: 0.85 }, 0.12)
        .to(desc, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.3);
      if (items.length > 0) {
        tl.to(items, { autoAlpha: 1, y: 0, duration: 0.55, stagger: ITEM_STAGGER }, 0.35);
      }
      tl.to(timing, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.55);

      recs.set(el, { tl, all: [rule, num, tick, title, desc, timing, items] });
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
            played.add((entry.target as HTMLElement).dataset.eaAct ?? "");
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
        for (const t of all) {
          if (Array.isArray(t) && t.length === 0) continue;
          gsap.killTweensOf(t);
          gsap.set(t, { clearProps: "opacity,visibility,transform" });
        }
      });
    };
  }, [detected, mode]);

  return (
    <ul ref={rootRef} role="list" className="border-b border-rule/80">
      {formats.map((f, i) => (
        <li key={f.num} data-ea-act={f.num} className="relative">
          {/* Full-width hairline between acts — draws itself (scaleX) as the
              act enters; plain visible rule in static mode. */}
          <span
            data-ea-rule
            aria-hidden="true"
            className="absolute inset-x-0 top-0 block h-px bg-rule/80"
          />
          <div className="py-[clamp(3rem,7vh,5.5rem)] xl:grid xl:grid-cols-12">
            {/* Act 02 steps one column right on xl — quiet alternation. */}
            <div className={i === 1 ? "xl:col-start-2 xl:col-span-11" : "xl:col-span-12"}>
              {/* Mono index rail label + cyan tick. */}
              <p
                data-ea-num
                className="relative inline-block pl-3 font-mono text-[13px] uppercase tracking-[0.3em] text-accent sm:pl-4 sm:text-[15px]"
              >
                <span
                  data-ea-tick
                  aria-hidden="true"
                  className="absolute left-0 top-[0.05em] h-[1.15em] w-[2px] origin-top bg-accent"
                />
                {f.num} · {f.qual}
              </p>
              {/* Format name — huge display serif, rising out of a line mask
                  (single line, so the mask == the site's split-lines beat). */}
              <div className="mt-4 overflow-hidden">
                <h3
                  data-ea-title
                  className="font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.08] tracking-[-0.025em] text-ink pb-1"
                >
                  {f.name}
                </h3>
              </div>
              {/* One-line positioning sentence. */}
              <p
                data-ea-desc
                className="mt-4 max-w-2xl text-[15px] leading-[1.6] text-ink-mute sm:text-base"
              >
                {f.desc}
              </p>
              {/* Deliverables — two-column hairline table, mono micro-labels
                  (uppercase is CSS-only; DOM strings stay byte-identical). */}
              <ul role="list" className="mt-9 grid grid-cols-1 gap-x-12 sm:grid-cols-2">
                {f.includes.map((inc, j) => (
                  <li
                    key={j}
                    data-ea-item
                    className="border-t border-rule/60 py-3 font-mono text-[11px] uppercase leading-relaxed tracking-[0.16em] text-ink/80"
                  >
                    {inc}
                  </li>
                ))}
              </ul>
              {/* Duration line — the table's closing summary row (the exact
                  string + mono/accent treatment the card carried). */}
              <p
                data-ea-timing
                className="border-t border-rule/60 py-3 font-mono text-[10px] uppercase tracking-[0.2em]"
                style={{ color: "hsl(var(--accent))" }}
              >
                {f.timing}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
