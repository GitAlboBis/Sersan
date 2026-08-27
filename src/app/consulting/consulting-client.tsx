"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Button, CTA_FLUID_SM } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MultiStepIntake } from "@/components/multi-step-intake";
import ProcessSection from "@/components/sections/process-section";
import { PracticeLedger } from "./practice-ledger";
import { EngagementActs } from "./engagement-acts";
import { SectionHeading } from "@/components/ui/section-heading";
import { useLanguage } from "@/components/language-provider";
import { CTA, FACTS, POSITIONING, pick } from "@/data/copy";
import { START_HREF } from "@/lib/site";

export function ConsultingClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  // Practice-area content lives in ./practice-ledger.tsx (the big-type
  // numbered index that replaced the 4×2 icon-card grid). The per-card
  // /services/* links were retired with the cards — those detail pages stay
  // reachable from the home ServicesSection cards, /audit from the hero CTA
  // above, and #engage from the engagement-formats section below.

  // Engagement-format content lives in ./engagement-acts.tsx (the sequential
  // big-type step-through that replaced the three card-steel pricing columns
  // — second application of the ledger's "less cards, big text" direction).
  // All EN+IT strings carried over byte-identical; the cards held no links.

  // Engagement FAQ — absorbed from the retired /faq page (which now
  // 308-redirects to /consulting#faq); the data-privacy answers moved to
  // /trust. 2026-08 repositioning: re-aimed at the buyer who has no
  // internal engineering team — no minimum programme, and the post-launch
  // answer (handover → stabilisation → optional scoped continuation)
  // replaces the narrower knowledge-transfer question.
  const faqs = [
    {
      q: isEn
        ? "How much does it cost, and how big does a project need to be?"
        : "Quanto costa, e quanto deve essere grande un progetto?",
      // The old closing clause promised a costed proposal inside the reply
      // window — a DELIVERY promise, where every other surface promises a
      // REPLY (FACTS.replyTime). Aligned. The "continued work is agreed phase
      // by phase" clause also went: the same idea is stated in full by the
      // fixed-scope strip in the process section further up this page.
      a: isEn
        ? `It depends on the work. Diagnostics are fixed-price. Builds are scoped and priced per project. There's no minimum programme to buy into — one well-defined problem is a good place to start, and it can grow from there. ${pick(isEn, FACTS.replyTime)}.`
        : `Dipende dal lavoro. Le diagnosi sono a prezzo fisso. Gli sviluppi sono dimensionati e quotati progetto per progetto. Non c'è un programma minimo da sottoscrivere: un singolo problema ben definito è un ottimo punto di partenza, e da lì può crescere. ${pick(isEn, FACTS.replyTime)}.`,
    },
    {
      q: isEn
        ? "How long does a typical engagement last?"
        : "Quanto dura un ingaggio tipico?",
      a: isEn
        ? `A Focused Diagnostic runs ${pick(isEn, FACTS.auditDuration)}. A Delivery Sprint runs ${pick(isEn, FACTS.sprintDuration)}. Longer builds are split into sprints you can stop between. We scope each one up front so nothing comes out of nowhere later.`
        : `Una Diagnosi mirata dura ${pick(isEn, FACTS.auditDuration)}. Uno Sprint di delivery dura ${pick(isEn, FACTS.sprintDuration)}. I progetti più lunghi si dividono in sprint tra i quali potete fermarvi. Definiamo tutto in anticipo, così non emergono sorprese in corso d'opera.`,
    },
    {
      q: isEn ? "What happens after launch?" : "Cosa succede dopo il lancio?",
      a: isEn
        ? "Handover and a stabilisation period: documentation, architecture decision records, a walkthrough with whoever will run it, and us on hand while it settles. You own the code and the system outright — no licensing, no lock-in, no source held back. Continued development or support is available if you want it, scoped and priced separately."
        : "Handover e un periodo di stabilizzazione: documentazione, architecture decision record, un walkthrough con chi dovrà gestirlo e noi a disposizione mentre il sistema si assesta. Il codice e il sistema sono vostri: nessuna licenza, nessun lock-in, nessun sorgente trattenuto. Sviluppo o supporto continuativo sono disponibili se li volete, con scope e prezzo a parte.",
    },
  ];

  return (
    <div className="min-h-[100svh] pt-24 relative">
      {/* Hero */}
      <div data-line-anchor="hero">
      <section className="relative section-lg overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[55rem] max-w-[110vw] h-[24rem] opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(closest-side, hsl(var(--accent) / 0.32), transparent 75%)" }}
        />
        <div className="container-px relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <p className="eyebrow mb-6 inline-flex items-center justify-center gap-2">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--accent))" }}
                aria-hidden="true"
              />
              {isEn ? "Practice areas" : "Aree di intervento"}
            </p>
            {/* key={language}: SplitText owns this subtree once split; a language
                swap must remount it or React reconciles against orphaned nodes
                (same contract as SectionHeading's h2). */}
            <h1 key={language} data-split-reveal className="font-display text-[clamp(2.25rem,7vw,4.75rem)] leading-[1.15] tracking-[-0.025em] text-ink text-balance mb-8 pb-1">
              {isEn ? (
                <>
                  Custom software, AI and automation.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Built to earn its place.
                  </span>
                </>
              ) : (
                <>
                  Software su misura, AI e automazione.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Costruiti dove servono davvero.
                  </span>
                </>
              )}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              {isEn
                ? `Three formats. The people who scope the work do the work. ${pick(isEn, POSITIONING.range)} London-registered.`
                : `Tre formati. Chi definisce il lavoro lo esegue. ${pick(isEn, POSITIONING.range)} Sede legale a Londra.`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button asChild size="lg" className={cn("group", CTA_FLUID_SM)}>
                <Link href={START_HREF}>
                  {pick(isEn, CTA.primary)}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className={CTA_FLUID_SM}>
                <Link href="/case-studies">
                  {pick(isEn, CTA.seeWork)}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      </div>

      {/* Practice areas — full-bleed big-type numbered index (the ledger
          replaced the 4×2 icon-card grid; see ./practice-ledger.tsx). */}
      <div data-line-anchor="practice">
      <section className="section-lg">
        <div className="container-px">
          <SectionHeading
            align="center"
            className="mx-auto mb-12"
            eyebrow={isEn ? "What we do" : "Cosa facciamo"}
            titleClassName="font-display text-3xl sm:text-[2.25rem] text-ink leading-[1.12] tracking-tight text-balance"
            title={
              isEn ? (
                <>
                  Eight things we do. <span className="italic" style={{ color: "hsl(var(--accent))" }}>One team.</span>
                </>
              ) : (
                <>
                  Otto cose che facciamo. <span className="italic" style={{ color: "hsl(var(--accent))" }}>Un solo team.</span>
                </>
              )
            }
          />
          <PracticeLedger />
        </div>
      </section>
      </div>

      {/* Engagement formats — sequential big-type step-through (the acts
          replaced the three card-steel columns; see ./engagement-acts.tsx). */}
      <div data-line-anchor="engage">
      <section id="engage" className="section-lg scroll-mt-24">
        <div className="container-px">
          <SectionHeading
            align="center"
            className="mx-auto mb-12"
            eyebrow={isEn ? "Engagement formats" : "Formati di ingaggio"}
            titleClassName="font-display text-3xl sm:text-[2.25rem] text-ink leading-[1.12] tracking-tight text-balance"
            title={
              isEn ? (
                <>
                  Three formats.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Start as small as you need.
                  </span>
                </>
              ) : (
                <>
                  Tre formati.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Si può iniziare in piccolo.
                  </span>
                </>
              )
            }
          />
          <EngagementActs />
        </div>
      </section>
      </div>

      {/* Process map — the four-phase delivery table, moved here from the
          homepage (restyle step 2: "How we engage" owns the full process;
          home keeps a one-line fixed-scope strip). The section carries the
          "process" line anchor that previously wrapped the intake. */}
      <div data-line-anchor="process">
        <ProcessSection />
      </div>

      {/* FAQ — engagement answers absorbed from the retired /faq page
          (/faq 308-redirects to /consulting#faq). */}
      <section id="faq" className="section-lg scroll-mt-24">
        <div className="container-px">
          <SectionHeading
            align="center"
            className="mx-auto mb-10"
            eyebrow="FAQ"
            titleClassName="font-display text-3xl sm:text-[2.25rem] text-ink leading-[1.12] tracking-tight text-balance"
            title={
              isEn ? (
                <>
                  The questions buyers{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    actually ask.
                  </span>
                </>
              ) : (
                <>
                  Le domande che i clienti{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    ci fanno davvero.
                  </span>
                </>
              )
            }
          />
          {/* D-27 — built on the Radix PRIMITIVE, not ui/accordion.tsx, for
              one reason: `forceMount` on Content. The shared wrapper unmounts
              closed answers, so this page shipped SSR HTML with two of its
              three answers missing — a different content contract from
              /audit's Honest FAQ (ui/honest-faq.tsx), which is the same UI.
              With forceMount every answer is in the DOM, height-CLIPPED when
              closed (grid-template-rows 0fr→1fr, the site's entrance ease,
              animating both directions without measuring) — so no-JS readers,
              crawlers and assistive tech always get the full text. Chrome,
              copy and Radix semantics (h3 header, aria-expanded/controls,
              roving focus, Enter/Space) are unchanged. */}
          <div className="max-w-3xl mx-auto">
            <AccordionPrimitive.Root
              type="single"
              collapsible
              className="space-y-3"
            >
              {faqs.map((f, i) => (
                <AccordionPrimitive.Item
                  key={f.q}
                  value={`faq-${i}`}
                  className="rounded-xl border border-rule/70 bg-surface/40 backdrop-blur-[1px] px-6 transition-colors data-[state=open]:border-[hsl(var(--accent)/0.5)] data-[state=open]:bg-surface/60"
                >
                  <AccordionPrimitive.Header className="flex">
                    <AccordionPrimitive.Trigger className="group flex flex-1 items-center justify-between gap-6 py-5 text-left text-sm font-medium text-ink outline-none transition-colors hover:text-[hsl(var(--accent))] focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent)/0.45)]">
                      {f.q}
                      <ChevronDown
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                      />
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionPrimitive.Content
                    forceMount
                    className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-[var(--ease-entrance)] data-[state=open]:grid-rows-[1fr] motion-reduce:transition-none"
                  >
                    <div className="min-h-0 overflow-hidden">
                      <p className="pb-5 text-sm leading-[1.6] text-ink-mute">
                        {f.a}
                      </p>
                    </div>
                  </AccordionPrimitive.Content>
                </AccordionPrimitive.Item>
              ))}
            </AccordionPrimitive.Root>
          </div>
        </div>
      </section>

      {/* Intake form — this is /consulting's conversion. The page used to
          embed this AND then close with a primary CTA into /start, a second,
          different form for the same job; the closing beat now points back
          here instead (see below). scroll-mt-24 matches #engage / #faq for
          the no-JS landing (the smooth-scroll provider already offsets
          hash-link clicks by 72px). */}
      <div>
      <section id="intake" className="section-lg relative scroll-mt-24">
        <div className="container-px relative">
          <SectionHeading
            align="center"
            className="mx-auto mb-10"
            eyebrow={isEn ? "Intake" : "Intake"}
            titleClassName="font-display text-3xl sm:text-[2.5rem] text-ink leading-[1.12] tracking-tight text-balance mb-4"
            title={
              isEn ? (
                <>
                  Start a{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    scoping conversation.
                  </span>
                </>
              ) : (
                <>
                  Avvia una{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    conversazione di scoping.
                  </span>
                </>
              )
            }
            description={
              isEn
                ? "Four short steps. Two or three sentences is enough. A founder reads it and replies within one business day with what we'd build first."
                : "Quattro passaggi brevi. Bastano due o tre frasi. Un founder lo legge e risponde entro un giorno lavorativo con cosa costruiremmo per primo."
            }
          />
          <div className="max-w-2xl mx-auto">
            <MultiStepIntake />
          </div>
        </div>
      </section>
      </div>

      {/* Ritual gap — transparent negative space so the persistent canvas
          (z-0) shows through; the route's 3D ritual object world-anchors
          here and the signature line threads it before the CTA. */}
      <div data-line-anchor="ritual" aria-hidden="true" className="py-28 sm:py-40" />

      {/* Closing CTA — contextual, not a second conversion. It points at the
          intake above rather than at /start, so the page asks for exactly one
          brief in exactly one form. The heading no longer restates the
          intake's own promise ("...what we'd build first"); it answers the
          objection that actually stops people filling the form in. */}
      <div data-line-anchor="final-cta">
      <section className="section-lg">
        <div className="container-px">
          <div className="max-w-2xl mx-auto text-center">
            <SectionHeading
              align="center"
              className="mx-auto mb-6"
              titleClassName="font-display text-3xl sm:text-[2.5rem] text-ink leading-[1.12] tracking-tight text-balance"
              title={
                isEn ? (
                  <>
                    You don&apos;t need a spec or a budget.{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      Just the problem you want gone.
                    </span>
                  </>
                ) : (
                  <>
                    Non servono capitolato né budget.{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      Basta il problema da risolvere.
                    </span>
                  </>
                )
              }
            />
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button asChild size="lg" className={cn("group", CTA_FLUID_SM)}>
                <Link href="#intake">
                  {pick(isEn, CTA.discussProject)}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className={CTA_FLUID_SM}>
                <Link href="/contact">
                  {isEn ? "Contact us" : "Contattaci"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
