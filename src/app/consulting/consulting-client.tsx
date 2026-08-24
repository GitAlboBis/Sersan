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

  // Engagement FAQ — absorbed verbatim from the retired /faq page (which
  // now 308-redirects to /consulting#faq). The pilot/trial answer moved to
  // /audit's "Honest answers"; the data-privacy answers moved to /trust.
  const faqs = [
    {
      q: isEn ? "How much does it cost?" : "Quanto costa?",
      a: isEn
        ? "It depends on the work. Tech Audits are fixed-price. Delivery Sprints are scoped per project. Fractional CTO is based on time allocation. After a short scoping call we'll come back with a clear proposal, usually within a business day."
        : "Dipende dal lavoro. I Tech Audit sono a prezzo fisso. I Delivery Sprint sono dimensionati progetto per progetto. Il Fractional CTO è basato sull'allocazione di tempo. Dopo una breve call di scoping vi mandiamo una proposta chiara, di solito entro un giorno lavorativo.",
    },
    {
      q: isEn
        ? "How long does a typical engagement last?"
        : "Quanto dura un ingaggio tipico?",
      a: isEn
        ? "Tech Audits are usually 1–2 weeks. Delivery Sprints run 4–8 weeks. Fractional CTO engagements are ongoing, typically 3–12 months. We scope each one up front so nothing comes out of nowhere later."
        : "I Tech Audit durano in genere 1–2 settimane. I Delivery Sprint 4–8 settimane. Gli ingaggi di Fractional CTO sono continuativi, tipicamente 3–12 mesi. Definiamo lo scope in anticipo, così non emergono sorprese in corso d'opera.",
    },
    {
      q: isEn
        ? "How do you handle knowledge transfer?"
        : "Come gestite il passaggio di conoscenze?",
      a: isEn
        ? "Every engagement ends with documentation, architecture decision records, team walkthroughs, and a proper handover. The goal is that your team owns the thing long after we've gone. We'd rather you don't need us next year than that you do."
        : "Ogni ingaggio si chiude con documentazione, architecture decision record, walkthrough con il team e un handover formale. L'obiettivo è che il vostro team mantenga in autonomia il sistema molto dopo la nostra uscita. Preferiamo che l'anno prossimo non abbiate bisogno di noi piuttosto che il contrario.",
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
                  Senior engineering.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    No layer of juniors.
                  </span>
                </>
              ) : (
                <>
                  Ingegneria senior.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Nessuno strato di junior.
                  </span>
                </>
              )}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              {isEn
                ? "Three engagement formats. The people who scope the work do the work. From £15K, scoped weekly. London-registered."
                : "Tre formati di ingaggio. Chi definisce il lavoro lo esegue. Da £15K, con scope settimanale. Società con sede a Londra."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button asChild size="lg" className={cn("group", CTA_FLUID_SM)}>
                <Link href="/audit">
                  {isEn ? "Book a scoping call" : "Prenota una call di scoping"}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className={CTA_FLUID_SM}>
                <Link href="/case-studies">
                  {isEn ? "See the work" : "Guarda i lavori"}
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
                  Eight surfaces. <span className="italic" style={{ color: "hsl(var(--accent))" }}>One team.</span>
                </>
              ) : (
                <>
                  Otto superfici. <span className="italic" style={{ color: "hsl(var(--accent))" }}>Un solo team.</span>
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
                    Pick the one that fits.
                  </span>
                </>
              ) : (
                <>
                  Tre formati.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Scegliete quello giusto.
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

      {/* Intake form */}
      <div>
      <section id="intake" className="section-lg relative">
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
                ? "Four short steps. A senior engineer replies within one business day with what we'd ship first and where we'd push back."
                : "Quattro passaggi brevi. Un ingegnere senior risponde entro un giorno lavorativo con cosa porteremmo in produzione per primo e dove faremmo obiezione."
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

      {/* Closing CTA */}
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
                    Tell us what&apos;s broken.{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      We&apos;ll tell you what we&apos;d ship first.
                    </span>
                  </>
                ) : (
                  <>
                    Diteci cosa non funziona.{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      Vi diciamo cosa metteremmo in produzione per primo.
                    </span>
                  </>
                )
              }
            />
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button asChild size="lg" className={cn("group", CTA_FLUID_SM)}>
                <Link href="/audit">
                  {isEn ? "Book a scoping call" : "Prenota una call di scoping"}
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
