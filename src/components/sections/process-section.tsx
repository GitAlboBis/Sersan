"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";

/**
 * ProcessSection — "Four phases. No retainer creep."
 *
 * A fixed-scope DELIVERY MAP, not a brochure. Four columns
 * (01 Diagnose / 02 Architect / 03 Build / 04 Harden), each a card-steel
 * panel of compact structured rows the buyer actually evaluates:
 *
 *   Duration · Inputs · Outputs · What you get · Risk reduced · Decision point
 *
 * Every row label is aligned across all four columns so the eye can read
 * horizontally ("how long does each phase take?") or vertically (a single
 * phase end-to-end). Subtle connectors link the columns left-to-right to
 * read as a sequence. Rows are tight label/value pairs, never paragraphs.
 *
 * "Risk reduced" carries the lone --accent emphasis inside each card (the
 * field that does the commercial work). "No retainer creep" is made
 * visually prominent in the heading + a fixed-scope guarantee strip above
 * the map. Conforms to the shared section grammar: card-steel, tokens,
 * Geist, container-px, accent used sparingly, no em-dashes, EN + IT.
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
      name: isEn ? "Diagnose" : "Diagnosi",
      duration: isEn ? "1 call + ~1 week" : "1 call + ~1 settimana",
      inputs: isEn
        ? "Your stack, workflow, constraints, data sample."
        : "Stack, flussi di lavoro, vincoli, campione di dati.",
      outputs: isEn
        ? "Signal map, risk register, build vs. don't-build call."
        : "Mappa dei segnali, registro rischi, decisione se costruire.",
      delivers: isEn
        ? "A written recommendation. You can stop here with it in hand."
        : "Una raccomandazione scritta. Puoi fermarti qui con l'analisi.",
      reducesRisk: isEn
        ? "Spending a quarter on the wrong system."
        : "Spendere un trimestre sul sistema sbagliato.",
      decision: isEn
        ? "Continue to Architect, or stop with the recommendation."
        : "Proseguire con Architettura, o fermarsi con la raccomandazione.",
    },
    {
      num: "02",
      name: isEn ? "Architect" : "Architettura",
      duration: isEn ? "1 to 2 weeks" : "1 o 2 settimane",
      inputs: isEn
        ? "Agreed scope, technical interviews, representative data."
        : "Perimetro concordato, interviste tecniche, dati rappresentativi.",
      outputs: isEn
        ? "Reference architecture, evaluation plan, cost model, sequencing."
        : "Architettura di riferimento, piano di valutazione, modello di costo, sequenza.",
      delivers: isEn
        ? "The system on paper, reviewable by your team or an auditor."
        : "Il sistema sulla carta, revisionabile dal tuo team o da un auditor.",
      reducesRisk: isEn
        ? "Rebuilds at week 8 when the design meets reality."
        : "Riscritture alla settimana 8 quando il progetto incontra la realtà.",
      decision: isEn
        ? "Continue to Build, or pause with the architecture document."
        : "Proseguire con la Costruzione, o fermarsi con il documento di architettura.",
    },
    {
      num: "03",
      name: isEn ? "Build" : "Costruzione",
      duration: isEn ? "2 to 8 weeks, fixed scope" : "2 a 8 settimane, perimetro fisso",
      inputs: isEn
        ? "Signed architecture, access, an internal owner."
        : "Architettura approvata, accessi, un responsabile interno.",
      outputs: isEn
        ? "The system, eval harness, traces, runbook, handover docs."
        : "Il sistema, la suite di valutazione, tracce, runbook, documentazione.",
      delivers: isEn
        ? "Production code in your repo, with owner training."
        : "Codice di produzione nel tuo repository, con formazione.",
      reducesRisk: isEn
        ? "An agency black box your team can't operate."
        : "Una scatola nera in stile agenzia che il team non sa gestire.",
      decision: isEn
        ? "Continue to Harden, or take the production system as-is."
        : "Proseguire con il Consolidamento, o prendere il sistema così com'è.",
    },
    {
      num: "04",
      name: isEn ? "Harden" : "Consolidamento",
      duration: isEn ? "Post-launch, scoped" : "Post-lancio, su perimetro",
      inputs: isEn
        ? "Live telemetry, first month of incidents, real user signal."
        : "Telemetria reale, primo mese di incidenti, segnali degli utenti.",
      outputs: isEn
        ? "Drift checks tuned, rollback drills run, observability calibrated."
        : "Controlli di drift tarati, prove di rollback, osservabilità calibrata.",
      delivers: isEn
        ? "A system your on-call team trusts and keeps running."
        : "Un sistema di cui il team di on-call si fida e che resta acceso.",
      reducesRisk: isEn
        ? "Day-90 incidents nobody knows how to triage."
        : "Incidenti al novantesimo giorno che nessuno sa gestire.",
      decision: isEn
        ? "Hand over to your on-call team. The engagement closes."
        : "Consegna al team di on-call. L'ingaggio si chiude.",
    },
  ];
}

/** Row definitions, in display order. `accent` flags the lone --accent row. */
function getRows(isEn: boolean) {
  return [
    { key: "duration" as const, label: isEn ? "Duration" : "Durata", accent: false },
    { key: "inputs" as const, label: isEn ? "Inputs" : "Input", accent: false },
    { key: "outputs" as const, label: isEn ? "Outputs" : "Output", accent: false },
    { key: "delivers" as const, label: isEn ? "What you get" : "Cosa ottieni", accent: false },
    { key: "reducesRisk" as const, label: isEn ? "Risk reduced" : "Rischio ridotto", accent: true },
    { key: "decision" as const, label: isEn ? "Decision point" : "Punto di decisione", accent: false },
  ];
}

function PhaseColumn({
  phase,
  rows,
  showConnector,
}: {
  phase: Phase;
  rows: ReturnType<typeof getRows>;
  showConnector: boolean;
}) {
  return (
    <div className="relative">
      {/* Subtle connector to the next column (desktop only). A hairline rule
          with a small node, reading as the link in the delivery sequence. */}
      {showConnector ? (
        <span
          aria-hidden="true"
          className="hidden lg:flex absolute top-8 -right-3 z-10 items-center"
        >
          <span className="block h-px w-6 bg-[hsl(var(--rule))]" />
          <span className="block w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent)/0.55)] -ml-px" />
        </span>
      ) : null}

      <article className="card-steel group relative flex h-full flex-col p-5 sm:p-6 overflow-hidden">
        {/* Top-edge accent line — faint at rest, brightens on hover. */}
        <span
          aria-hidden="true"
          className="
            pointer-events-none absolute top-0 left-0 right-0 h-px
            bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.45)] to-transparent
            opacity-50 group-hover:opacity-100 transition-opacity duration-500
          "
        />

        {/* Header: numeral + phase name */}
        <div className="relative flex items-baseline gap-3">
          <span
            aria-hidden="true"
            className="
              font-display text-3xl sm:text-[2.25rem] leading-none tracking-[-0.04em]
              text-[hsl(var(--accent)/0.85)] group-hover:text-[hsl(var(--accent))]
              transition-colors duration-300
            "
          >
            {phase.num}
          </span>
          <h3 className="font-display text-lg sm:text-xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink">
            {phase.name}
          </h3>
        </div>

        <div
          aria-hidden="true"
          className="relative mt-4 mb-1 h-px bg-[hsl(var(--rule))]"
        />

        {/* Structured rows: aligned label/value pairs, never paragraphs. */}
        <dl className="relative flex-1">
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
                {phase[row.key]}
              </dd>
            </div>
          ))}
        </dl>
      </article>
    </div>
  );
}

export default function ProcessSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const phases = getPhases(isEn);
  const rows = getRows(isEn);

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
                  No retainer creep.
                </span>
              </>
            ) : (
              <>
                Quattro fasi.{" "}
                <span className="text-[hsl(var(--accent))] font-semibold">
                  Nessun retainer che si dilata.
                </span>
              </>
            )
          }
          description={
            isEn
              ? "Every engagement maps to one of these four phases. You can start at any phase, and stop after any phase. Pricing and scope are fixed before work begins."
              : "Ogni ingaggio corrisponde a una di queste quattro fasi. Puoi iniziare da qualsiasi fase e fermarti dopo qualsiasi fase. Prezzo e perimetro vengono fissati prima dell'inizio dei lavori."
          }
          className="mb-10 sm:mb-12 max-w-3xl"
        />

        {/* Fixed-scope guarantee strip — makes "No retainer creep" concrete
            and prominent: one accent-bordered band stating the three rules
            that distinguish this from open-ended retainers. */}
        <Reveal>
          <div
            className="
              mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6
              rounded-[var(--radius-lg)] border border-[hsl(var(--accent)/0.3)]
              bg-[hsl(var(--accent)/0.05)] px-5 py-4
            "
          >
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[hsl(var(--accent))] shrink-0">
              {isEn ? "Fixed scope" : "Perimetro fisso"}
            </span>
            <p className="text-[13.5px] text-ink leading-relaxed">
              {isEn
                ? "Scope and price are agreed before work starts. No open-ended retainers, no hours billed against a moving target, no creep."
                : "Perimetro e prezzo concordati prima di iniziare. Nessun retainer a tempo indeterminato, nessuna ora fatturata su un obiettivo mobile, nessuna dilatazione."}
            </p>
          </div>
        </Reveal>

        {/* Delivery map: 4 columns on desktop, 2 on tablet, 1 on mobile.
            Subtle connectors link the columns into a left-to-right sequence. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {phases.map((p, i) => (
            <Reveal key={p.num} delay={i * 80}>
              <PhaseColumn
                phase={p}
                rows={rows}
                showConnector={i < phases.length - 1}
              />
            </Reveal>
          ))}
        </div>

        {/* Closing line + CTA — the page's third strategic conversion point.
            The buying anxiety at this depth is "is this actually buyable in
            chunks?", answered by "start with Diagnose". */}
        <div className="mt-12 sm:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          <p className="lg:col-span-7 text-[14px] text-ink-mute leading-relaxed">
            {isEn ? (
              <>
                Most engagements run the full sequence. Many start at{" "}
                <span className="text-ink">Architect</span> or{" "}
                <span className="text-ink">Build</span> because the diagnosis was
                already done. About a third of Diagnose engagements end with
                &ldquo;don&apos;t build this,&rdquo; and that&apos;s a successful
                outcome.
              </>
            ) : (
              <>
                La maggior parte degli ingaggi percorre l&apos;intera sequenza.
                Molti iniziano da{" "}
                <span className="text-ink">Architettura</span> o{" "}
                <span className="text-ink">Costruzione</span> perché la diagnosi
                era già stata fatta. Circa un terzo degli ingaggi di Diagnosi si
                chiude con &ldquo;non costruire questo&rdquo;, ed è un esito di
                successo.
              </>
            )}
          </p>
          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:justify-end gap-3">
            <Link href="/start">
              <Button variant="hero" size="lg" className="group">
                {isEn ? "Start with Diagnose" : "Inizia dalla Diagnosi"}
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
