"use client";

import Link from "next/link";
import { ArrowRight, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalEmbed } from "@/components/cal-embed";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";
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
        "Executive summary written for both your CEO and your CTO",
        "What's broken, ranked by business impact, not technical debt",
        "What's manual, with realistic time-savings estimates",
        "What AI can actually do inside your product, and what it can't, said honestly",
        "What we'd build first, scoped, sequenced, with rough effort estimates",
        "A 90-day roadmap if you wanted to start tomorrow",
      ]
    : [
        "Executive summary pensato sia per il vostro CEO che per il vostro CTO",
        "Cosa non funziona, ordinato per impatto sul business, non per debito tecnico",
        "Cosa è manuale, con stime realistiche di risparmio di tempo",
        "Cosa l'AI può davvero fare dentro il vostro prodotto, e cosa no, detto onestamente",
        "Cosa costruiremmo per primo, con scope, sequenza e stime di effort di massima",
        "Una roadmap a 90 giorni, se voleste partire domani",
      ];

  const week = isEn
    ? [
        { day: "Day 1", title: "Kick-off & systems walkthrough", desc: "Half-day on-site or video call. We meet your team, get access to repos, dashboards, and key systems." },
        { day: "Days 2–3", title: "Architecture & data deep-dive", desc: "We work through your codebase, data pipelines, and infrastructure with your engineers." },
        { day: "Days 3–4", title: "Workflow shadowing", desc: "We sit with operations, support, sales, or wherever the manual work lives. We watch what people actually do." },
        { day: "Day 5", title: "Synthesis & report drafting", desc: "We pull everything together into a written report and a 90-day roadmap." },
        { day: "Day 6", title: "Read-out & Q&A", desc: "60–90 minute session with your leadership. We walk through findings, prioritise opportunities, and answer everything." },
      ]
    : [
        { day: "Giorno 1", title: "Kick-off e walkthrough dei sistemi", desc: "Mezza giornata in presenza o in call. Conosciamo il team, otteniamo accesso a repo, dashboard e sistemi chiave." },
        { day: "Giorni 2–3", title: "Deep dive su architettura e dati", desc: "Esaminiamo codebase, pipeline dati e infrastruttura insieme ai vostri ingegneri." },
        { day: "Giorni 3–4", title: "Shadowing dei workflow", desc: "Stiamo con operations, supporto, vendite, o ovunque viva il lavoro manuale. Guardiamo cosa fanno davvero le persone." },
        { day: "Giorno 5", title: "Sintesi e stesura del report", desc: "Mettiamo insieme tutto in un report scritto e in una roadmap a 90 giorni." },
        { day: "Giorno 6", title: "Read-out e Q&A", desc: "Sessione di 60–90 minuti con la vostra leadership. Presentiamo i risultati, prioritizziamo le opportunità e rispondiamo a tutto." },
      ];

  const after = isEn
    ? [
        { title: "Build it with us", desc: "If the audit reveals work you want to ship, we'll quote a fixed scope and timeline. No multi-year retainers, no surprises." },
        { title: "Build it with someone else", desc: "The roadmap is yours. Hand it to your internal team or another vendor. We're happy either way." },
        { title: "Sit on it", desc: "Some companies aren't ready to act immediately. The report doesn't expire. Come back when you are." },
      ]
    : [
        { title: "Costruitelo con noi", desc: "Se l'audit fa emergere lavori che volete portare in produzione, vi diamo una proposta a scope e tempi fissi. Niente retainer pluriennali, niente sorprese." },
        { title: "Costruitelo con qualcun altro", desc: "La roadmap è vostra. Passatela al vostro team interno o a un altro fornitore. Per noi va bene comunque." },
        { title: "Tenetelo lì", desc: "Alcune aziende non sono pronte ad agire subito. Il report non ha scadenza. Tornate quando lo sarete." },
      ];

  const faqs = isEn
    ? [
        { q: "Why is it paid?", a: "Because the deliverable is real engineering work. Senior engineers spend two to three weeks inside your stack producing a scored opportunity portfolio, sequenced roadmap, and executive deck. We scope it tightly so there's no discovery theatre, and no obligation to hire us afterwards." },
        { q: "What do you need from us?", a: "Read access to relevant systems (repos, dashboards, data warehouse, ticketing). Calendar time with 4–8 people across engineering, ops, and leadership. An NDA if you want one, we'll sign yours or use ours." },
        { q: "Who runs the audit?", a: "One of our senior engineers, typically someone who's shipped production systems at the scale of Revolut, JP Morgan, or similar. Not a junior consultant, not an account manager. The person writing the report is the person who'd build the work." },
        { q: "What if we don't know what we need yet?", a: "Most of our clients don't. That's literally what the audit is for: finding the AI opportunities you can't see from the inside, plus the rebuilds, automations, and fixes that need to happen first before AI can do anything useful in your product." },
        { q: "How is this different from a sales discovery call?", a: "A discovery call is 30 minutes of questions to qualify you. The audit is a week of work where senior engineers go inside your business and produce a written deliverable. The output is the same whether you hire us or not." },
        { q: "What if you find nothing?", a: "It happens, rarely, but it happens. If we genuinely think the work isn't there right now, we'll tell you, give you the reasoning in writing, and not waste anyone's time." },
        // Absorbed from the retired /faq page (engagement answer that fits
        // the audit: the audit IS the pilot).
        { q: "Do you offer a pilot or trial?", a: "Yes. For larger AI builds, we'll do a scoped pilot to make sure the idea actually works before anyone commits to the full thing. For consulting more generally, the Tech Audit plays the same role. You get a complete picture before we touch implementation." },
      ]
    : [
        { q: "Perché è a pagamento?", a: "Perché il deliverable è lavoro ingegneristico vero. Ingegneri senior passano due o tre settimane dentro il vostro stack producendo un portfolio di opportunità con punteggio, una roadmap sequenziata e un deck per la leadership. Lo definiamo strettamente, così niente teatrino di discovery e nessun obbligo di ingaggiarci dopo." },
        { q: "Cosa vi serve da noi?", a: "Accesso in lettura ai sistemi rilevanti (repo, dashboard, data warehouse, ticketing). Tempo in calendario con 4–8 persone tra engineering, operations e leadership. Un NDA se lo volete: firmiamo il vostro o usiamo il nostro." },
        { q: "Chi conduce l'audit?", a: "Uno dei nostri ingegneri senior, tipicamente qualcuno che ha portato in produzione sistemi alla scala di Revolut, JP Morgan o simili. Non un consulente junior, non un account manager. La persona che scrive il report è la stessa che costruirebbe il lavoro." },
        { q: "E se ancora non sappiamo cosa ci serve?", a: "La maggior parte dei nostri clienti non lo sa. È letteralmente per questo che esiste l'audit: trovare le opportunità AI che non vedete dall'interno, oltre ai rebuild, alle automazioni e ai fix che vanno fatti prima che l'AI possa fare qualcosa di utile nel vostro prodotto." },
        { q: "In cosa è diverso da una call di discovery commerciale?", a: "Una discovery call sono 30 minuti di domande per qualificarvi. L'audit è una settimana di lavoro in cui ingegneri senior entrano nel vostro business e producono un deliverable scritto. Il risultato è lo stesso, che ci ingaggiate poi o no." },
        { q: "E se non trovate nulla?", a: "Succede, raramente, ma succede. Se pensiamo davvero che il lavoro adesso non ci sia, ve lo diciamo, vi diamo il ragionamento per iscritto e non facciamo perdere tempo a nessuno." },
        { q: "Offrite un pilot o un periodo di prova?", a: "Sì. Per i build AI più grandi facciamo un pilot a scope definito, per verificare che l'idea funzioni davvero prima di impegnarci sul progetto pieno. Più in generale per la consulenza, è il Tech Audit a svolgere questo ruolo: avete un quadro completo prima di toccare l'implementazione." },
      ];

  const fitItems = isEn
    ? [
        "Engagement budget £15K+",
        "You have a real production system, not a slide deck",
        "Founder, CTO, or VP Engineering is the decision-maker",
      ]
    : [
        "Budget di ingaggio da £15K in su",
        "Avete un sistema vero in produzione, non una presentazione",
        "Il decisore è founder, CTO o VP Engineering",
      ];

  return (
    <div className="min-h-screen pt-24 relative">
      {/* Hero */}
      <div data-line-anchor="hero">
      <section data-snap className="relative section-lg overflow-hidden">
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
              {isEn
                ? "Six surfaces · one week · fixed scope"
                : "Sei superfici · una settimana · scope fisso"}
            </p>
            {/* key={language}: SplitText owns this subtree once split; a language
                swap must remount it or React reconciles against orphaned nodes
                (same contract as SectionHeading's h2). */}
            <h1 key={language} data-split-reveal className="font-display text-[clamp(2.25rem,7vw,4.75rem)] leading-[1.15] tracking-[-0.025em] text-ink text-balance mb-8 pb-1">
              {isEn ? (
                <>
                  A scored map of what to{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    build, fix, and ship next.
                  </span>
                </>
              ) : (
                <>
                  Una mappa con punteggio di cosa{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    costruire, sistemare e portare in produzione subito.
                  </span>
                </>
              )}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              {isEn
                ? "A senior engineer spends a week inside your business: your product, your systems, your data, your workflows. You leave with a written report on what's broken, what's manual, where AI could actually power your product, and what we'd build first if you hired us."
                : "Un ingegnere senior passa una settimana dentro il vostro business: prodotto, sistemi, dati, workflow. Esci con un report scritto su cosa non funziona, cosa è manuale, dove l'AI può davvero alimentare il prodotto e cosa costruiremmo per primo se ci ingaggiaste."}
            </p>
            <a href="#book-call">
              <Button size="lg" className="px-10 py-7 text-base font-semibold rounded-full">
                {isEn ? "Book a scoping call" : "Prenota una call di scoping"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <p className="mt-4 text-xs text-muted-foreground">
              {isEn
                ? "1-business-day reply. No sales pitch on the first call."
                : "Risposta entro 1 giorno lavorativo. Nessun pitch commerciale alla prima call."}
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
      <section data-snap className="section-lg relative">
        <div className="container-px relative">
          <SectionHeading
            align="center"
            className="mx-auto mb-12"
            eyebrow={isEn ? "What we look at" : "Cosa guardiamo"}
            titleClassName="font-display text-3xl sm:text-[2.5rem] text-ink leading-[1.12] tracking-tight text-balance"
            title={
              isEn ? (
                <>
                  Six surfaces. One week.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Real depth on each.
                  </span>
                </>
              ) : (
                <>
                  Sei superfici. Una settimana.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Profondità reale su ognuna.
                  </span>
                </>
              )
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
          contract); data-snap centres it like the page's other focal beats
          (the snap engine measures live, so the quiz's height changes never
          go stale). */}
      <section data-snap className="section-lg relative">
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
                    {isEn
                      ? "A written document. Roughly 20–30 pages. No 80-slide deck. Built to be read by leadership and acted on by engineering."
                      : "Un documento scritto. Tra le 20 e le 30 pagine. Niente deck da 80 slide. Pensato per essere letto dalla leadership e messo in pratica dall'ingegneria."}
                  </span>
                  <span className="block">
                    {isEn
                      ? "Delivered as a PDF and walked through live with your team in a 60–90 minute session."
                      : "Consegnato come PDF e presentato live al vostro team in una sessione di 60–90 minuti."}
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
      <section data-snap className="section-lg relative">
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
                {isEn ? "Is this for you?" : "È per voi?"}
              </p>
              <h3 className="font-display text-2xl sm:text-[1.75rem] text-ink leading-[1.15] tracking-tight mb-6">
                {isEn ? (
                  <>
                    We&apos;re a fit when{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      three things are true.
                    </span>
                  </>
                ) : (
                  <>
                    Siamo la scelta giusta quando{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      tre cose sono vere.
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
      <section id="book-call" data-snap className="section-lg relative overflow-hidden">
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
            eyebrow={isEn ? "Book a scoping call" : "Prenota una call di scoping"}
            titleClassName="font-display text-3xl sm:text-[2.5rem] text-ink leading-[1.12] tracking-tight text-balance mb-5"
            title={
              isEn ? (
                <>
                  Request the call.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    30 minutes, no pitch.
                  </span>
                </>
              ) : (
                <>
                  Richiedete la call.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    30 minuti, nessun pitch.
                  </span>
                </>
              )
            }
            description={
              <>
                <span className="block max-w-lg mx-auto text-base sm:text-lg leading-[1.55]">
                  {isEn
                    ? "Free scoping call. If you commission the full audit, the deliverable is yours to keep, whether you hire us after or not."
                    : "Call di scoping gratuita. Se commissionate l'audit completo, il deliverable resta vostro, che ci ingaggiate dopo o no."}
                </span>
                <span className="block mt-4 max-w-md mx-auto text-sm">
                  {isEn
                    ? "Send a written intake below — a senior engineer replies within 1 business day to set up the call."
                    : "Inviate un intake scritto qui sotto — un ingegnere senior risponde entro 1 giorno lavorativo per fissare la call."}
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
            <Button asChild variant="outline" size="lg" className="group">
              <Link href="/contact">
                {isEn ? "Or send a written intake" : "Oppure inviate un intake scritto"}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </Button>
            <a
              href="mailto:alex.s@sersan.dev"
              className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="w-3.5 h-3.5" /> alex.s@sersan.dev
            </a>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
