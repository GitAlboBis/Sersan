"use client";

import Link from "next/link";
import { ArrowRight, Check, Mail } from "lucide-react";
import { Button, CTA_FLUID_SM } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalEmbed } from "@/components/cal-embed";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";
import { CTA, ENGAGEMENT, FACTS, pick } from "@/data/copy";
import { CONTACT_EMAIL, START_HREF } from "@/lib/site";
import AuditWeekTimeline from "@/components/sections/audit-week-timeline";
import { SurfacesLedger } from "./surfaces-ledger";
import { DoorBeats } from "./door-beats";
import { SelfAudit } from "./self-audit";
import { HonestFaq } from "@/components/ui/honest-faq";

export function AuditClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const reportContents = isEn
    ? [
        "How the work actually runs today, written down in one place",
        "What's costing you time or money, ranked by business impact",
        "What should change — and what already works and should be left alone",
        "Build, buy or automate, decided per problem, with the reasoning shown",
        "Where AI earns its place inside the business, and where it doesn't",
        "The recommended solution: sequence, rough effort, risks, and the next step",
      ]
    : [
        "Come funziona davvero il lavoro oggi, messo nero su bianco in un posto solo",
        "Cosa vi costa tempo o denaro, ordinato per impatto sul business",
        "Cosa va cambiato — e cosa già funziona e va lasciato dov'è",
        "Costruire, comprare o automatizzare: deciso caso per caso, con le ragioni",
        "Dove l'AI se lo merita davvero dentro l'azienda, e dove invece no",
        "La soluzione consigliata: sequenza, effort di massima, rischi e prossimo passo",
      ];

  const week = isEn
    ? [
        { day: "Stage 01", title: "Kick-off & walkthrough", desc: "Half a day, on-site or on a call. We meet the people who do the work and get access to whatever the business already runs on." },
        { day: "Stage 02", title: "Systems, tools & data", desc: "We work through the software, the data and the tooling behind the process, with whoever knows them best — technical or not." },
        { day: "Stage 03", title: "Watching the work", desc: "We sit with operations, support, sales, or wherever the manual work lives. We watch what people actually do." },
        { day: "Stage 04", title: "Synthesis & writing", desc: "We pull everything together into a written report: what to change, what to leave alone, what we'd build first." },
        { day: "Stage 05", title: "Read-out & decision", desc: "60–90 minute session. We walk through the findings, answer everything, and agree the next step, including not yet." },
      ]
    : [
        { day: "Fase 01", title: "Kick-off e walkthrough", desc: "Mezza giornata, in presenza o in call. Conosciamo chi fa il lavoro e otteniamo accesso a ciò su cui l'azienda già gira." },
        { day: "Fase 02", title: "Sistemi, strumenti e dati", desc: "Esaminiamo software, dati e strumenti dietro al processo, con chi li conosce meglio, che sia tecnico o no." },
        { day: "Fase 03", title: "Guardare il lavoro", desc: "Stiamo con operations, supporto, vendite, o ovunque viva il lavoro manuale. Guardiamo cosa fanno davvero le persone." },
        { day: "Fase 04", title: "Sintesi e stesura", desc: "Mettiamo insieme tutto in un report scritto: cosa cambiare, cosa lasciare com'è, cosa costruiremmo per primo." },
        { day: "Fase 05", title: "Read-out e decisione", desc: "Sessione di 60–90 minuti. Presentiamo i risultati, rispondiamo a tutto e concordiamo il passo successivo, incluso non ancora." },
      ];

  const after = isEn
    ? [
        { title: "Build it with us", desc: "If the audit reveals work you want to ship, we'll quote a fixed scope and timeline. Continuation is earned phase by phase, never assumed." },
        { title: "Build it with someone else", desc: "The plan is yours to keep. Hand it to your own people, a freelancer or another supplier. We're happy either way." },
        { title: "Sit on it", desc: "Some companies aren't ready to act immediately. The report doesn't expire. Come back when you are." },
      ]
    : [
        { title: "Costruitelo con noi", desc: "Se l'audit fa emergere lavori che volete realizzare, vi diamo una proposta a scope e tempi fissi. La continuità si guadagna fase per fase, non si dà per scontata." },
        { title: "Costruitelo con qualcun altro", desc: "Il piano resta vostro. Passatelo alle vostre persone, a un freelance o a un altro fornitore. Per noi va bene comunque." },
        { title: "Tenetelo lì", desc: "Alcune aziende non sono pronte ad agire subito. Il report non ha scadenza. Tornate quando lo sarete." },
      ];

  const faqs = isEn
    ? [
        { q: "Why is it paid?", a: `Because the deliverable is real engineering work. A senior engineer spends ${FACTS.auditDuration.en} inside the business and writes up what's happening, what it's costing you, and what to do about it — ranked, sequenced and costed. Fixed scope, no discovery theatre, and no obligation to continue with us afterwards.` },
        { q: "What do you need from us?", a: "Someone who knows how the work actually gets done, access to the tools you already use, and a couple of hours of their time. If you have repos, dashboards or a ticketing system, read access helps, but no internal engineering team is required. An NDA if you want one, we'll sign yours or use ours." },
        { q: "Who runs the audit?", a: "A founder. The technical side is led by our CPTO, whose prior senior delivery was at Revolut, J.P. Morgan, Deloitte and Accenture. Not a junior consultant, not an account manager. The person writing the report is the person who'd build the work." },
        { q: "What if we don't know what we need yet?", a: "Most clients don't, and that's the point. The audit exists to name the problem properly: what is quietly costing you, what is worth fixing first, and whether the answer is a piece of software, an automation, AI, or leaving something well alone. You bring the problem, not the solution." },
        { q: "How is this different from a sales discovery call?", a: `A discovery call is 30 minutes of questions to qualify you. The audit is ${FACTS.auditDuration.en} of work inside your business, ending in a written deliverable you keep. The output is the same whether you hire us afterwards or not.` },
        { q: "What if you find nothing?", a: "It happens, rarely, but it happens. If we genuinely think the work isn't there right now, we'll tell you, give you the reasoning in writing, and not waste anyone's time." },
        // Replaces the old pilot/trial answer (redundant: the focused
        // diagnostic already IS the small, fixed-price way in). The buyer
        // needs to understand their business problem, not the architecture.
        { q: "What if we're not technical?", a: "That's normal, and it isn't a problem. What you need to know is your own business: where the time goes, what breaks, what it costs. Working out the architecture is our job. The report is written to be read by whoever has to decide, not only by an engineer." },
      ]
    : [
        { q: "Perché è a pagamento?", a: `Perché il deliverable è lavoro ingegneristico vero. Un ingegnere senior passa ${FACTS.auditDuration.it} dentro l'azienda e mette per iscritto cosa sta succedendo, cosa vi sta costando e cosa farci — ordinato, sequenziato e stimato. Scope fisso, niente teatrino di discovery e nessun obbligo di proseguire con noi.` },
        { q: "Cosa vi serve da noi?", a: "Qualcuno che sappia come si svolge davvero il lavoro, accesso agli strumenti che già usate e un paio d'ore del suo tempo. Se avete repo, dashboard o un sistema di ticketing, l'accesso in lettura aiuta, ma non serve un team tecnico interno. Un NDA se lo volete: firmiamo il vostro o usiamo il nostro." },
        { q: "Chi conduce l'audit?", a: "Un founder. La parte tecnica è guidata dal nostro CPTO, con alle spalle consegne senior in Revolut, J.P. Morgan, Deloitte e Accenture. Non un consulente junior, non un account manager. La persona che scrive il report è la stessa che costruirebbe il lavoro." },
        { q: "E se ancora non sappiamo cosa ci serve?", a: "La maggior parte dei clienti non lo sa, ed è proprio il punto. L'audit serve a dare un nome preciso al problema: cosa vi costa in silenzio, cosa conviene sistemare per primo, e se la risposta è un software, un'automazione, l'AI o lasciare le cose come stanno. Voi portate il problema, non la soluzione." },
        { q: "In cosa è diverso da una call di discovery commerciale?", a: `Una discovery call sono 30 minuti di domande per qualificarvi. L'audit sono ${FACTS.auditDuration.it} dentro la vostra azienda, che finiscono in un deliverable scritto che resta vostro. Il risultato è lo stesso, che ci ingaggiate poi o no.` },
        { q: "E se non trovate nulla?", a: "Succede, raramente, ma succede. Se pensiamo davvero che il lavoro adesso non ci sia, ve lo diciamo, vi diamo il ragionamento per iscritto e non facciamo perdere tempo a nessuno." },
        { q: "E se non siamo tecnici?", a: "È normale, e non è un problema. Quello che dovete conoscere è la vostra azienda: dove se ne va il tempo, cosa si rompe, quanto costa. Capire l'architettura è il nostro mestiere. Il report è scritto per essere letto da chi deve decidere, non solo da un ingegnere." },
      ];

  const fitItems = isEn
    ? [
        "Something manual or slow is costing real time or money",
        "You need a decision: build, buy, automate, or leave it",
        "You'd rather find out in days than guess for months",
      ]
    : [
        "Qualcosa di manuale o lento vi costa tempo o denaro veri",
        "Vi serve una decisione: costruire, comprare, automatizzare o no",
        "Preferite saperlo in giorni invece di indovinare per mesi",
      ];

  return (
    <div className="min-h-[100svh] pt-24 relative">
      {/* Hero */}
      <div data-line-anchor="hero">
      <section className="relative section-lg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background pointer-events-none" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[55rem] max-w-[110vw] h-[24rem] opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(closest-side, hsl(var(--accent) / 0.4), transparent 75%)" }}
        />
        <div className="container-px relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <p className="eyebrow mb-6 inline-flex items-center justify-center gap-2">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--accent))" }}
                aria-hidden="true"
              />
              {isEn ? "Six surfaces · " : "Sei superfici · "}
              {pick(isEn, FACTS.auditDurationScoped)}
            </p>
            {/* key={language}: SplitText owns this subtree once split; a language
                swap must remount it or React reconciles against orphaned nodes
                (same contract as SectionHeading's h2). */}
            <h1 key={language} data-split-reveal className="font-display text-[clamp(2.25rem,7vw,4.75rem)] leading-[1.15] tracking-[-0.025em] text-ink text-balance mb-8 pb-1">
              {isEn ? (
                <>
                  Know what to build next{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    before you spend more.
                  </span>
                </>
              ) : (
                <>
                  Sapere cosa costruire{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    prima di spendere altro.
                  </span>
                </>
              )}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              {isEn
                ? "A senior engineer spends 2–6 business days inside your business: how the work actually runs, the systems behind it, the data, the tools. You leave with a written report on what's costing you, what to change, and what we'd build first. Software, automation or AI — whichever earns its place."
                : "Un ingegnere senior passa 2–6 giorni lavorativi dentro la vostra azienda: come funziona davvero il lavoro, i sistemi che lo reggono, i dati, gli strumenti. Uscite con un report scritto su cosa vi costa, cosa cambiare e cosa costruiremmo per primo. Software, automazione o AI — a seconda di cosa se lo merita."}
            </p>
            {/* `block sm:inline` on the <a>: it is an INLINE box outside any
                flex row, so the button's `w-full` would resolve against a
                shrink-to-fit parent and change nothing. `px-10` + the nowrap
                Italian label (then "Prenota una call di scoping") measured ~334px —
                well past the 256px column at 320px. `sm:inline` puts the
                wrapper back exactly as it was at every desktop width. */}
            <a href="#book-call" className="block sm:inline">
              <Button
                size="lg"
                className={cn(
                  "px-10 py-7 text-base font-semibold rounded-full",
                  CTA_FLUID_SM,
                )}
              >
                {pick(isEn, CTA.discussDiagnostic)}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <p className="mt-4 text-xs text-muted-foreground">
              {pick(isEn, FACTS.briefIsEnough)}. {pick(isEn, FACTS.replyTime)}.
            </p>
          </div>
        </div>
      </section>
      </div>

      {/* What we look at — full-bleed big-type numbered ledger (ports the
          /consulting practice-ledger grammar; the six surfaces moved from a
          md:grid-cols-2 card grid + DisplacementWipeReveal entrance into
          ./surfaces-ledger.tsx, copy byte-identical). */}
      <div data-line-anchor="surfaces">
      <section className="section-lg relative">
        <div className="container-px relative">
          <SectionHeading
            align="center"
            className="mx-auto mb-12"
            eyebrow={isEn ? "What we look at" : "Cosa guardiamo"}
            titleClassName="font-display text-3xl sm:text-[2.5rem] text-ink leading-[1.12] tracking-tight text-balance"
            title={
              isEn ? (
                <>
                  Six surfaces. Focused or full.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Real depth on each.
                  </span>
                </>
              ) : (
                <>
                  Sei superfici. Mirato o completo.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Profondità reale su ognuna.
                  </span>
                </>
              )
            }
            description={
              <>
                <span className="block mb-3">
                  <strong className="font-medium text-ink/90">
                    {pick(isEn, ENGAGEMENT.diagnostic.name)}
                  </strong>{" "}
                  &mdash; {pick(isEn, ENGAGEMENT.diagnostic.scope)}{" "}
                  {isEn
                    ? "For smaller businesses and targeted decisions."
                    : "Per aziende più piccole e decisioni mirate."}
                </span>
                <span className="block">
                  <strong className="font-medium text-ink/90">
                    {pick(isEn, ENGAGEMENT.audit.name)}
                  </strong>{" "}
                  &mdash; {pick(isEn, ENGAGEMENT.audit.scope)}{" "}
                  {isEn
                    ? "Same method, wider frame."
                    : "Stesso metodo, quadro più ampio."}
                </span>
              </>
            }
          />

          <SurfacesLedger />
        </div>
      </section>
      </div>

      {/* 60-second self-audit — the page's participation beat (./self-audit
          .tsx): five questions from src/data/audit-questions.ts, one at a
          time, ending in a top-3 scored findings preview. Sits between the
          six-surfaces thesis and the deliverable section on purpose — you
          try the 60-second read, then "What's in the report" shows the real
          thing. Deliberately NO data-line-anchor: the audit route's curve
          waypoints stay exactly as authored (anchors intact per the webgl
          contract). Round 8-A: `data-snap` removed with every other free
          section — only the pinned week-timeline runway still settles. */}
      <section className="section-lg relative">
        <div className="container-px relative">
          <Reveal className="max-w-3xl mx-auto">
            <SelfAudit isEn={isEn} />
          </Reveal>
        </div>
      </section>

      {/* What's in the report */}
      <div data-line-anchor="deliverable">
      <section className="section-lg relative">
        <div className="container-px relative">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <SectionHeading
              eyebrow={isEn ? "The deliverable" : "Il deliverable"}
              titleClassName="font-display text-3xl sm:text-[2.25rem] text-ink leading-[1.1] tracking-tight mb-6"
              title={
                isEn ? (
                  <>
                    What&apos;s in the{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      report.
                    </span>
                  </>
                ) : (
                  <>
                    Cosa c&apos;è nel{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      report.
                    </span>
                  </>
                )
              }
              description={
                <>
                  <span className="block mb-6">
                    {pick(isEn, FACTS.auditDeliverable)}
                  </span>
                  <span className="block">
                    {isEn
                      ? "Delivered as a PDF and walked through live in a 60–90 minute session — written to be understood by whoever has to decide, and precise enough for whoever has to build."
                      : "Consegnato come PDF e presentato live in una sessione di 60–90 minuti: scritto per essere capito da chi deve decidere e abbastanza preciso per chi deve costruire."}
                  </span>
                </>
              }
            />
            <ul className="space-y-3.5">
              {reportContents.map((item, i) => (
                <Reveal
                  key={i}
                  as="li"
                  delay={i * 60}
                  className="flex items-start gap-3 py-2 border-b border-rule/40 last:border-0"
                >
                  <Check
                    className="w-4 h-4 mt-1 shrink-0"
                    style={{ color: "hsl(var(--accent))" }}
                    strokeWidth={2.5}
                  />
                  <span className="text-sm sm:text-base text-ink/90 leading-[1.55]">{item}</span>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>
      </div>

      {/* The week — pinned phased chapters (BEAT 2, audit-week-timeline). The
          data-line-anchor="timeline" wrapper stays (the curve waypoint lives
          here); the component owns the SectionHeading + the six Day cards. */}
      <div data-line-anchor="timeline">
        <AuditWeekTimeline week={week} isEn={isEn} />
      </div>

      {/* What happens after */}
      <section className="section-lg relative">
        <div className="container-px relative">
          <SectionHeading
            align="center"
            className="mx-auto mb-14"
            eyebrow={isEn ? "What happens after" : "Cosa succede dopo"}
            titleClassName="font-display text-3xl sm:text-[2.5rem] text-ink leading-[1.12] tracking-tight text-balance"
            title={
              isEn ? (
                <>
                  Three doors.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    You pick.
                  </span>
                </>
              ) : (
                <>
                  Tre porte.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Scegliete voi.
                  </span>
                </>
              )
            }
          />
          {/* Three sequential full-width typographic beats (./door-beats.tsx)
              — the engagement-acts grammar at a smaller scale. Replaced the
              md:grid-cols-3 card grid; titles/descriptions carried over
              byte-identical, all three doors at equal typographic weight
              (the honesty arc of doors 02 and 03 is the point). */}
          <DoorBeats doors={after} isEn={isEn} />
        </div>
      </section>

      {/* FAQ */}
      <section className="section-lg relative">
        <div className="container-px relative">
          <SectionHeading
            align="center"
            className="mx-auto mb-16"
            title={isEn ? "Honest answers." : "Risposte oneste."}
          />
          {/* Hairline-divider accordion (./honest-faq.tsx, Radix — the same
              machinery consulting's FAQ uses). Replaced the stacked
              card-steel boxes; every Q+A string EN+IT byte-identical, all
              answers SSR'd into the DOM (forceMount + height-clip). One
              Reveal wraps the whole list — RM gets no entrance animation. */}
          <Reveal className="max-w-3xl mx-auto">
            <HonestFaq faqs={faqs} />
          </Reveal>
        </div>
      </section>

      {/* Qualifier */}
      <section className="section relative">
        <div className="container-px relative">
          <div className="max-w-3xl mx-auto">
            <div className="card-steel p-7 sm:p-8">
              <p
                className="text-[10px] font-mono uppercase tracking-[0.18em] mb-4"
                style={{ color: "hsl(var(--accent))" }}
              >
                {isEn ? "When it fits" : "Quando ha senso"}
              </p>
              <h3 className="font-display text-2xl sm:text-[1.75rem] text-ink leading-[1.15] tracking-tight mb-6">
                {isEn ? (
                  <>
                    It&apos;s the right first step when{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      any of this sounds familiar.
                    </span>
                  </>
                ) : (
                  <>
                    È il primo passo giusto se{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      qualcosa di questo vi suona familiare.
                    </span>
                  </>
                )}
              </h3>
              <ul className="space-y-3.5">
                {fitItems.map((line, i) => (
                  <Reveal key={line} as="li" delay={i * 60} className="flex items-start gap-3">
                    <Check
                      className="w-4 h-4 mt-1 shrink-0"
                      style={{ color: "hsl(var(--accent))" }}
                      strokeWidth={2.5}
                    />
                    <span className="text-sm sm:text-base text-ink/90 leading-[1.55]">{line}</span>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Ritual gap — transparent negative space so the persistent canvas
          (z-0) shows through; the route's 3D ritual object world-anchors
          here and the signature line threads it before the CTA. */}
      <div data-line-anchor="ritual" aria-hidden="true" className="py-28 sm:py-40" />

      {/* Closing CTA — booking (written-intake fallback while the Cal embed
          is disabled; see CAL_ENABLED in @/lib/site) */}
      <div data-line-anchor="final-cta">
      <section id="book-call" className="section-lg relative overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] opacity-25 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,hsl(var(--accent))_0%,transparent_60%)] blur-[140px]" />
        </div>
        <div className="container-px relative z-10">
          <SectionHeading
            align="center"
            className="mx-auto mb-10"
            eyebrow={pick(isEn, CTA.discussDiagnostic)}
            titleClassName="font-display text-3xl sm:text-[2.5rem] text-ink leading-[1.12] tracking-tight text-balance mb-5"
            title={
              isEn ? (
                <>
                  Start with the problem.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    No obligation to continue.
                  </span>
                </>
              ) : (
                <>
                  Si parte dal problema.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Nessun obbligo di proseguire.
                  </span>
                </>
              )
            }
            description={
              <>
                <span className="block max-w-lg mx-auto text-base sm:text-lg leading-[1.55]">
                  {isEn
                    ? "Tell us what's slowing the business down. If a diagnostic is the right shape, we'll scope it. If it isn't, we'll say so and tell you what we'd do instead."
                    : "Raccontateci cosa sta rallentando l'azienda. Se una diagnosi è la forma giusta, la definiamo. Se non lo è, ve lo diciamo e vi diciamo cosa faremmo al suo posto."}
                </span>
                <span className="block mt-4 max-w-md mx-auto text-sm">
                  {pick(isEn, FACTS.readByFounder)}. {pick(isEn, FACTS.replyTime)}.
                </span>
              </>
            }
          />

          <div className="section-divider max-w-3xl mx-auto" aria-hidden="true" />

          <div className="max-w-4xl mx-auto mt-10">
            <CalEmbed slug="sersan/scoping-call" theme="dark" />
          </div>

          <div className="section-divider max-w-3xl mx-auto mt-10" aria-hidden="true" />

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button asChild variant="outline" size="lg" className={cn("group", CTA_FLUID_SM)}>
              <Link href={START_HREF}>
                {pick(isEn, CTA.primary)}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </Button>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="w-3.5 h-3.5" /> {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
