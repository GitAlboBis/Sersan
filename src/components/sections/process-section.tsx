"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import {
  Button,
  CTA_FLUID_SM,
  CTA_WRAPPER_SM,
} from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
import { CONTINUATION, CTA, FACTS, PROPORTIONALITY, pick } from "@/data/copy";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * ProcessSection — "Four phases. Sized to the job."
 *
 * A DRAWN LEFT-TO-RIGHT SEQUENCE (third application of the /consulting
 * "less cards" direction, completing the PracticeLedger → EngagementActs
 * family without repeating either mechanic verbatim). The process is
 * inherently a line through time, so the LINE is the design: one horizontal
 * hairline "spine" spans the section on desktop and four stations sit on it
 * (node dot + mono number + phase name in the display serif at a mid scale —
 * subordinate to the ledger's titles — with the phase's structured rows
 * below). No borders, no card fills; the card-steel columns, CSS connector
 * pulses and the IntersectionObserver class-toggle machinery are retired.
 * Every EN+IT content string is carried over byte-identical.
 *
 * MOTION (scrubbed draw — the ledger scrubs a pick, the acts play one-shot,
 * this DRAWS): ONE ScrollTrigger over the map (start "top 72%" / end
 * "top 28%", no pin) maps progress directly to the spine drawing itself
 * left→right (scaleX, origin left, quickSetter — 1:1 with scroll, so
 * scrolling back un-draws it, fully reversible). Each station ignites AS THE
 * LINE REACHES IT: node dot scales in (back.out), number flips to full
 * accent (opacity 0.45→1), title brightens (0.55→1), rows fade up (opacity
 * 0→1, y 12→0) — all via per-station gsap.quickTo writers re-targeted only
 * when the station's threshold is crossed (never per-frame writes, never
 * React state). Thresholds are the stations' fractional positions along the
 * spine, cached at measure time (onRefreshInit) — zero rect reads in the
 * update path. Transforms/opacity only: zero layout shift.
 *
 * MODES (the siblings' split, with the breakpoint at 1024px because the
 * horizontal spine layout only exists at lg): "interactive" (lg+ viewport,
 * fine pointer, no reduced-motion) vs "static" (<1024px, coarse pointer,
 * prefers-reduced-motion). Static is the vertical variant: the spine
 * becomes a left vertical hairline and all four stations render fully lit,
 * stacked. Same DOM in both modes; SSR default is "static", so no-JS,
 * crawlers and reduced-motion always get the fully-lit sequence — content
 * is never hostage to motion. isEn is a dep on purpose (ledger convention):
 * an EN↔IT toggle changes heights above/inside the map, so the trigger
 * band and thresholds re-measure via a full rebuild (cheap, rare).
 *
 * A11Y: ordered-list semantics (ol) — it IS an ordered process. The list is
 * announced; the visual mono numerals stay aria-hidden so the enumeration
 * is not doubled. Rows keep dl semantics.
 */

type Phase = {
  num: string;
  name: string;
  duration: string;
  inputs: string;
  outputs: string;
  delivers: string;
  reducesRisk: string;
  decision: string;
};

function getPhases(isEn: boolean): Phase[] {
  return [
    {
      num: "01",
      name: isEn ? "Understand" : "Comprensione",
      duration: isEn ? "One call" : "Una call",
      inputs: isEn
        ? "The problem in your words, and what it costs you today."
        : "Il problema nelle vostre parole e quanto vi costa oggi.",
      outputs: isEn
        ? "Agreement on the problem, and on what a good outcome is."
        : "Accordo sul problema e su cosa sia un buon risultato.",
      delivers: isEn
        ? "A written summary of what we heard and the options open."
        : "Un riepilogo scritto di ciò che abbiamo capito e delle opzioni.",
      reducesRisk: isEn
        ? "Buying a solution before the problem is clear."
        : "Comprare una soluzione prima che il problema sia chiaro.",
      decision: isEn
        ? "Stop here, or scope the smallest useful piece of work."
        : "Fermarsi qui, o definire il pezzo di lavoro utile più piccolo.",
    },
    {
      num: "02",
      name: isEn ? "Scope" : "Definizione",
      duration: pick(isEn, FACTS.auditDuration),
      inputs: isEn
        ? "Access to the workflow, system or data involved."
        : "Accesso al processo, al sistema o ai dati coinvolti.",
      outputs: isEn
        ? "The smallest valuable scope, priced, with acceptance criteria."
        : "Lo scope utile più piccolo, quotato, con criteri di accettazione.",
      delivers: isEn
        ? "A written plan you can act on, with us or without us."
        : "Un piano scritto su cui potete agire, con noi o senza di noi.",
      reducesRisk: isEn
        ? "Paying for a project nobody defined properly."
        : "Pagare per un progetto che nessuno ha definito davvero.",
      decision: isEn
        ? "Approve the scope, widen it to a full audit, or stop."
        : "Approvare lo scope, allargarlo a un audit completo, o fermarsi.",
    },
    {
      num: "03",
      name: isEn ? "Build" : "Costruzione",
      duration: pick(isEn, FACTS.sprintDuration),
      inputs: isEn
        ? "Agreed scope, access, and one person who can decide."
        : "Scope concordato, accessi e una persona che possa decidere.",
      outputs: isEn
        ? "Working software in visible increments, tested against real use."
        : "Software funzionante in incrementi visibili, testato sull'uso reale.",
      delivers: isEn
        ? "Code, accounts and documentation in your name. You own it."
        : "Codice, account e documentazione a vostro nome. È vostro.",
      reducesRisk: isEn
        ? "A system only the people who built it can run."
        : "Un sistema che solo chi l'ha costruito sa far funzionare.",
      decision: isEn
        ? "Launch, extend the scope, or stop with what already works."
        : "Lanciare, estendere lo scope, o fermarsi con ciò che funziona.",
    },
    {
      num: "04",
      name: isEn ? "Operate" : "Operatività",
      duration: isEn ? "Post-launch, scoped" : "Post-lancio, su scope",
      inputs: isEn
        ? "Real usage, the first weeks of incidents, user feedback."
        : "Uso reale, le prime settimane di incidenti, feedback degli utenti.",
      outputs: isEn
        ? "Measured results, fixes, tuning, an honest verdict."
        : "Risultati misurati, correzioni, tuning, un verdetto onesto.",
      delivers: isEn
        ? "Proof it did what it was supposed to do."
        : "La prova che ha fatto quello che doveva fare.",
      reducesRisk: isEn
        ? "A launch nobody measured and nobody owns."
        : "Un lancio che nessuno misura e di cui nessuno risponde.",
      decision: isEn
        ? "Hand over, or continue under a separately scoped agreement."
        : "Consegna, o proseguire con un accordo con scope a parte.",
    },
  ];
}

/** Row definitions, in display order. `accent` flags the lone --accent row. */
function getRows(isEn: boolean) {
  return [
    { key: "duration" as const, label: isEn ? "Duration" : "Durata", accent: false },
    { key: "inputs" as const, label: isEn ? "Inputs" : "Input", accent: false },
    { key: "outputs" as const, label: isEn ? "Outputs" : "Output", accent: false },
    { key: "delivers" as const, label: isEn ? "What you get" : "Cosa ottenete", accent: false },
    { key: "reducesRisk" as const, label: isEn ? "Risk reduced" : "Rischio ridotto", accent: true },
    { key: "decision" as const, label: isEn ? "Decision point" : "Punto di decisione", accent: false },
  ];
}

/* ------------------------------------------------------------------------ */
/* Motion constants (all ignition writes go through quickTo re-targeting).  */
/* ------------------------------------------------------------------------ */

/** Resting title ink opacity before the line reaches the station. */
const REST_TITLE = 0.55;
/** Resting mono-number accent opacity ("accent-dimmed", the ledger's value). */
const REST_NUM = 0.45;
/** Resting rows pose (fade-up distance in px). */
const REST_BODY_Y = 12;
/** Station-threshold clamp: station 01 sits at fraction ~0 of the spine —
 *  clamp so it ignites just after the draw starts, never before. */
const MIN_THRESHOLD = 0.04;
const MAX_THRESHOLD = 0.96;
/** The node dot's center offset from its station's left edge (dot spans
 *  0–7px, so its center is at 3.5px) — used for threshold measurement so we
 *  never read the rect of a scale(0) element. */
const DOT_CENTER_PX = 3.5;

type QuickWriter = (value: number) => gsap.core.Tween;

type StationFx = {
  el: HTMLElement;
  dotEl: HTMLElement;
  numEl: HTMLElement;
  titleEl: HTMLElement;
  bodyEl: HTMLElement;
  dotTo: QuickWriter;
  numTo: QuickWriter;
  titleTo: QuickWriter;
  bodyTo: QuickWriter;
  bodyYTo: QuickWriter;
  /** Fractional position of the station's node along the spine [0..1]. */
  threshold: number;
  on: boolean;
};

export default function ProcessSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const phases = getPhases(isEn);
  const rows = getRows(isEn);

  // SSR default = "static": the fully-lit sequence (spine drawn, all
  // stations ignited) is what no-JS, crawlers and reduced-motion get. The
  // interactive draw is opted into after viewport detection.
  const [mode, setMode] = useState<"static" | "interactive">("static");
  const [detected, setDetected] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 1023px (not the siblings' 768px) because the horizontal spine layout
    // only exists at lg (1024px); below that the DOM is the vertical static
    // variant, so the scrub must never arm against the wrong geometry.
    const narrow = window.matchMedia("(max-width: 1023px)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(narrow || coarse || reduced ? "static" : "interactive");
    setDetected(true);
  }, []);

  // Scrubbed draw — interactive mode only. isEn is a dep on purpose (the
  // ledger's convention): an EN↔IT toggle changes text heights above and
  // inside the map, so the trigger band goes stale; a full rebuild
  // re-measures and re-applies the current progress (cheap, rare).
  useEffect(() => {
    if (!detected || mode !== "interactive") return;
    const map = mapRef.current;
    if (!map) return;
    const spineEl = map.querySelector<HTMLElement>("[data-ps-spine]");
    const stationEls = Array.from(map.querySelectorAll<HTMLElement>("[data-ps-station]"));
    if (!spineEl || stationEls.length === 0) return;

    // ---- Prime the hidden/resting pose (imposed only under JS + motion,
    // never in CSS, so SSR/static always paints the lit sequence).
    gsap.set(spineEl, { scaleX: 0, transformOrigin: "0% 50%" });
    const spineSet = gsap.quickSetter(spineEl, "scaleX") as (v: number) => void;

    const fx: StationFx[] = [];
    for (const el of stationEls) {
      const dotEl = el.querySelector<HTMLElement>("[data-ps-dot]");
      const numEl = el.querySelector<HTMLElement>("[data-ps-num]");
      const titleEl = el.querySelector<HTMLElement>("[data-ps-title]");
      const bodyEl = el.querySelector<HTMLElement>("[data-ps-body]");
      if (!dotEl || !numEl || !titleEl || !bodyEl) continue;

      gsap.set(dotEl, { scale: 0, transformOrigin: "50% 50%" });
      gsap.set(numEl, { opacity: REST_NUM });
      gsap.set(titleEl, { opacity: REST_TITLE });
      gsap.set(bodyEl, { opacity: 0, y: REST_BODY_Y });

      fx.push({
        el,
        dotEl,
        numEl,
        titleEl,
        bodyEl,
        dotTo: gsap.quickTo(dotEl, "scale", { duration: 0.45, ease: "back.out(2)" }),
        numTo: gsap.quickTo(numEl, "opacity", { duration: 0.4, ease: "power2.out" }),
        titleTo: gsap.quickTo(titleEl, "opacity", { duration: 0.45, ease: "expo.out" }),
        bodyTo: gsap.quickTo(bodyEl, "opacity", { duration: 0.5, ease: "power2.out" }),
        bodyYTo: gsap.quickTo(bodyEl, "y", { duration: 0.5, ease: "expo.out" }),
        threshold: 1,
        on: false,
      });
    }
    if (fx.length === 0) {
      gsap.set(spineEl, { clearProps: "transform" });
      return;
    }

    // ---- Measurement (measure-once discipline: runs at refresh time only;
    // the update path reads cached thresholds — zero rect reads per update).
    // Thresholds come from the station <li> (never transformed), not the
    // dot (scale-primed), offset to the dot's center.
    const measure = () => {
      const rect = map.getBoundingClientRect();
      const w = rect.width || 1;
      for (const f of fx) {
        const left = f.el.getBoundingClientRect().left - rect.left + DOT_CENTER_PX;
        f.threshold = gsap.utils.clamp(MIN_THRESHOLD, MAX_THRESHOLD, left / w);
      }
    };

    // ---- Apply: spine tracks progress 1:1 (reversible un-draw); stations
    // re-target their writers ONLY when their threshold is crossed.
    const apply = (p: number) => {
      spineSet(p);
      for (const f of fx) {
        const on = p >= f.threshold;
        if (on === f.on) continue;
        f.on = on;
        f.dotTo(on ? 1 : 0);
        f.numTo(on ? 1 : REST_NUM);
        f.titleTo(on ? 1 : REST_TITLE);
        f.bodyTo(on ? 1 : 0);
        f.bodyYTo(on ? 0 : REST_BODY_Y);
      }
    };

    measure();

    const st = ScrollTrigger.create({
      trigger: map,
      start: "top 72%",
      end: "top 28%",
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      onRefresh: (self) => apply(self.progress),
      onUpdate: (self) => apply(self.progress),
    });
    // Init pose: covers a reload (or SPA nav) that lands mid- or past-band —
    // the drawn state settles via the same writers, never a jump from blank.
    apply(st.progress);

    return () => {
      st.kill();
      gsap.killTweensOf(spineEl);
      gsap.set(spineEl, { clearProps: "transform" });
      for (const f of fx) {
        gsap.killTweensOf([f.dotEl, f.numEl, f.titleEl, f.bodyEl]);
        gsap.set(f.dotEl, { clearProps: "transform" });
        gsap.set(f.numEl, { clearProps: "opacity" });
        gsap.set(f.titleEl, { clearProps: "opacity" });
        gsap.set(f.bodyEl, { clearProps: "opacity,transform" });
      }
    };
  }, [detected, mode, isEn]);

  return (
    <section
      id="process"
      className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
    >
      <SectionGlow position="top-left" intensity={1.05} size="60rem" />
      <SectionGlow position="bottom-right" intensity={0.9} size="55rem" />
      <div className="container-px relative">
        <SectionHeading
          eyebrow={isEn ? "How an engagement runs" : "Come si svolge un ingaggio"}
          title={
            isEn ? (
              <>
                Four phases.{" "}
                <span className="text-[hsl(var(--accent))] font-semibold">
                  Sized to the job.
                </span>
              </>
            ) : (
              <>
                Quattro fasi.{" "}
                <span className="text-[hsl(var(--accent))] font-semibold">
                  Dimensionate sul lavoro.
                </span>
              </>
            )
          }
          description={
            isEn
              ? `Start at any phase, stop after any phase. Price and scope are fixed before work begins. ${pick(isEn, PROPORTIONALITY)}`
              : `Potete iniziare da qualsiasi fase e fermarvi dopo qualsiasi fase. Prezzo e scope sono fissati prima di iniziare. ${pick(isEn, PROPORTIONALITY)}`
          }
          className="mb-10 sm:mb-12 max-w-3xl"
        />

        {/* Fixed-scope guarantee strip — makes "sized to the job" concrete
            and prominent: one accent-bordered band stating that scope and
            price are agreed first and that continuation is earned. */}
        <Reveal>
          <div
            className="
              mb-10 sm:mb-14 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6
              rounded-[var(--radius-lg)] border border-[hsl(var(--accent)/0.3)]
              bg-[hsl(var(--accent)/0.05)] px-5 py-4
            "
          >
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[hsl(var(--accent))] shrink-0">
              {isEn ? "Fixed scope" : "Perimetro fisso"}
            </span>
            <p className="text-[13.5px] text-ink leading-relaxed">
              {isEn
                ? `Scope and price are agreed before work starts. ${pick(isEn, CONTINUATION)}`
                : `Perimetro e prezzo concordati prima di iniziare. ${pick(isEn, CONTINUATION)}`}
            </p>
          </div>
        </Reveal>

        {/* The drawn sequence. Desktop (lg+): one horizontal hairline spine
            spans the map; the accent overlay draws left→right with scroll and
            four stations sit on it. Below lg / static: the spine becomes a
            left vertical hairline and the stations stack, fully lit. Same
            DOM in both variants. */}
        <div ref={mapRef} className="relative">
          {/* Horizontal spine (lg+): structural rule track + accent draw
              overlay. The overlay's default CSS pose is fully drawn (static
              mode); the interactive effect imposes scaleX 0 before it draws. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-[3px] hidden h-px bg-[hsl(var(--rule))] lg:block"
          >
            <span
              data-ps-spine
              className="absolute inset-0 origin-left"
              style={{
                background:
                  "linear-gradient(90deg, hsl(var(--accent)), hsl(var(--accent) / 0.85) 55%, hsl(var(--accent-2)))",
              }}
            />
          </div>
          {/* Vertical spine (below lg): static, always fully lit. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 left-[3px] top-1 w-px lg:hidden"
            style={{
              background:
                "linear-gradient(180deg, hsl(var(--accent) / 0.7), hsl(var(--accent-2) / 0.35))",
            }}
          />

          <ol
            role="list"
            className="grid list-none grid-cols-1 gap-10 lg:grid-cols-4 lg:gap-8"
          >
            {phases.map((p) => (
              <li
                key={p.num}
                data-ps-station
                className="relative pl-7 lg:pl-0 lg:pt-9"
              >
                {/* Node dot — sits centered on the spine (horizontal at lg,
                    vertical hairline below). Scales in as the line arrives. */}
                <span
                  data-ps-dot
                  aria-hidden="true"
                  className="absolute left-0 top-[0.4rem] h-[7px] w-[7px] rounded-full bg-accent shadow-[0_0_10px_hsl(var(--accent)/0.55)] lg:top-0"
                />

                {/* Mono number + phase name (display serif, mid scale —
                    deliberately subordinate to the ledger's titles). */}
                <div className="flex items-baseline gap-3">
                  <span
                    data-ps-num
                    aria-hidden="true"
                    className="font-mono text-[11px] tracking-[0.22em] text-accent"
                  >
                    {p.num}
                  </span>
                  <h3
                    data-ps-title
                    className="font-display text-[clamp(1.5rem,2.6vw,2.25rem)] leading-[1.08] tracking-[-0.02em] text-ink"
                  >
                    {p.name}
                  </h3>
                </div>

                {/* Structured rows: aligned label/value pairs, never
                    paragraphs. "Risk reduced" keeps the lone --accent label.
                    The block fades up as its station ignites. */}
                <dl data-ps-body className="mt-5">
                  {rows.map((row) => (
                    <div
                      key={row.key}
                      className="border-b border-[hsl(var(--rule)/0.5)] py-3 last:border-b-0"
                    >
                      <dt
                        className={
                          row.accent
                            ? "font-mono text-[9.5px] tracking-[0.18em] uppercase text-[hsl(var(--accent))] mb-1"
                            : "font-mono text-[9.5px] tracking-[0.18em] uppercase text-ink-mute mb-1"
                        }
                      >
                        {row.label}
                      </dt>
                      <dd
                        className={
                          row.accent
                            ? "text-[12.5px] text-ink leading-snug"
                            : "text-[12.5px] text-ink-mute leading-snug"
                        }
                      >
                        {p[row.key]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ol>
        </div>

        {/* Closing line + CTA — the page's third strategic conversion point.
            The buying anxiety at this depth is "is this actually buyable in
            chunks?", answered by "start with Diagnose". */}
        <div className="mt-12 sm:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          <p className="lg:col-span-7 text-[14px] text-ink-mute leading-relaxed">
            {isEn ? (
              <>
                Most engagements run the full sequence. Many start at{" "}
                <span className="text-ink">Scope</span> or{" "}
                <span className="text-ink">Build</span> because the problem was
                already clear. About a third of early engagements end with
                &ldquo;don&apos;t build this,&rdquo; and that&apos;s a successful
                outcome.
              </>
            ) : (
              <>
                La maggior parte degli ingaggi percorre l&apos;intera sequenza.
                Molti iniziano da{" "}
                <span className="text-ink">Definizione</span> o{" "}
                <span className="text-ink">Costruzione</span> perché il problema
                era già chiaro. Circa un terzo degli ingaggi iniziali si
                chiude con &ldquo;non costruire questo&rdquo;, ed è un esito di
                successo.
              </>
            )}
          </p>
          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:justify-end gap-3">
            <Link href="/start" className={CTA_WRAPPER_SM}>
              <Button
                variant="hero"
                size="lg"
                className={cn("group", CTA_FLUID_SM)}
              >
                {pick(isEn, CTA.startWithProblem)}
                <ArrowRight
                  className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
