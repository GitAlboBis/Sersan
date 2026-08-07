"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionGlow } from "@/components/ui/section-glow";
import { Reveal } from "@/components/ui/reveal";
import { UseCaseBeats } from "@/components/sections/use-case-beats";
import { useLanguage } from "@/components/language-provider";
import { caseStudies } from "@/data/case-studies";
import type { ServiceContent } from "@/data/services";
import { START_HREF } from "@/lib/site";

/**
 * ServiceDetail — shared template for every /services/<slug> route.
 *
 * Page structure:
 *
 *   01 Hero          number badge · service name · positioning · subhead · CTAs
 *   02 Problem       eyebrow / H2 / body — names the pain
 *   03 What we build compact numbered ledger rows (practice-ledger grammar,
 *                    static-open: NO scroll-scrub on a secondary page —
 *                    hover/focus brighten is the only interaction)
 *   04 Use cases     one-shot staggered typographic beats at small scale
 *                    (door-beats grammar, reduced amplitude — see
 *                    use-case-beats.tsx)
 *   05 Deliverables  two-column hairline table (engagement-acts grammar)
 *   06 Selected work typographic link list (title + sector tag + arrow,
 *                    hairline rows) — only entries listed in
 *                    service.caseStudyIds; rows still navigate to
 *                    /case-studies/[slug]
 *   07 FAQs          accordion-style stack
 *   08 Final CTA     primary → /start, secondary → /#process
 *
 * No invented copy — everything comes from src/data/services.ts and
 * src/data/case-studies.ts.
 */

export default function ServiceDetail({
  service,
}: {
  service: ServiceContent;
}) {
  const { language } = useLanguage();
  const isEn = language === "en";
  // Localized data fields — choose EN vs IT for every user-facing string.
  const name = isEn ? service.name : service.nameIt;
  const positioning = isEn ? service.positioning : service.positioningIt;
  const description = isEn ? service.description : service.descriptionIt;
  const problemEyebrow = isEn ? service.problem.eyebrow : service.problem.eyebrowIt;
  const problemTitle = isEn ? service.problem.title : service.problem.titleIt;
  const problemBody = isEn ? service.problem.body : service.problem.bodyIt;
  const timeline = isEn ? service.timeline : service.timelineIt;
  const bookCallLabel =
    language === "it"
      ? "Prenota una call di scoping di 30 min"
      : "Book a 30-min scoping call";
  // Filter case studies by id, preserving the order given in services.ts
  const relevantCases = service.caseStudyIds
    .map((id) => caseStudies.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="relative min-h-[100svh]">
      <main className="pt-32 sm:pt-40 pb-24 sm:pb-32">
        {/* ===== 01 Hero =================================================== */}
        <section className="section-accent-tint section-accent-tint--strong relative section-lg scroll-mt-24 overflow-hidden">
          <SectionGlow position="top-right" intensity={1.2} size="60rem" />
          <SectionGlow position="bottom-left" intensity={0.85} size="50rem" />
          <div className="container-px relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-3 mb-6">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[hsl(var(--accent))]">
                  {service.number} · {isEn ? "Service" : "Servizio"}
                </span>
                <span
                  aria-hidden="true"
                  className="block h-px w-12 bg-[hsl(var(--accent)/0.5)]"
                />
              </div>
              <p className="eyebrow mb-5 inline-flex items-center gap-2 text-ink-mute">
                <span aria-hidden="true" className="status-dot" />
                <span>SerSan · {name}</span>
              </p>
              {/* key={language}: SplitText owns this subtree once split; a
                  language swap must remount it or React reconciles against
                  orphaned nodes (same contract as SectionHeading's h2). */}
              <h1 key={language} data-split-reveal className="font-display text-[clamp(2.5rem,5.2vw,4.5rem)] leading-[0.98] tracking-[-0.03em] text-ink mb-6 text-balance">
                {name}
                <span className="block mt-2 text-[hsl(var(--accent))] font-display font-medium">
                  {positioning}
                </span>
              </h1>
              <p className="text-base sm:text-lg text-ink-mute leading-[1.55] max-w-2xl">
                {description}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                <Link href={START_HREF}>
                  <Button variant="hero" size="xl" className="group">
                    {bookCallLabel}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="#work">
                  <Button variant="heroOutline" size="xl">
                    {isEn ? "See related work" : "Vedi lavori correlati"}
                  </Button>
                </Link>
              </div>
              <p className="mt-6 font-mono text-[11px] tracking-[0.14em] uppercase text-ink-mute/80">
                {timeline}
              </p>
            </div>
          </div>
        </section>

        {/* Section divider */}
        <div aria-hidden="true" className="container-px py-1 relative z-10">
          <div className="section-rule mx-auto max-w-3xl" />
        </div>

        {/* ===== 02 Problem ================================================ */}
        <section className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden">
          <SectionGlow position="center-right" intensity={0.85} size="55rem" />
          <div className="container-px relative">
            <SectionHeading
              eyebrow={problemEyebrow}
              title={problemTitle}
              description={problemBody}
              className="max-w-3xl"
            />
          </div>
        </section>

        <div aria-hidden="true" className="container-px py-1 relative z-10">
          <div className="section-rule mx-auto max-w-3xl" />
        </div>

        {/* ===== 03 What we build ========================================== */}
        <section className="section-accent-tint section-accent-tint--strong relative section-lg scroll-mt-24 overflow-hidden">
          <SectionGlow position="top-left" intensity={1} size="55rem" />
          <SectionGlow position="bottom-right" intensity={0.9} size="55rem" />
          <div className="container-px relative">
            <SectionHeading
              eyebrow={isEn ? "Typical build includes" : "Cosa include di solito"}
              title={
                isEn ? (
                  <>
                    What ships when you engage SerSan for{" "}
                    <span className="font-display italic">{name}.</span>
                  </>
                ) : (
                  <>
                    Cosa consegniamo quando ingaggiate SerSan per{" "}
                    <span className="font-display italic">{name}.</span>
                  </>
                )
              }
              description={
                isEn
                  ? "Each item below appears in most engagements of this service. The exact mix is set in the Diagnose phase, never speculatively, never as a default checklist."
                  : "Ogni voce qui sotto compare nella maggior parte degli ingaggi di questo servizio. Il mix esatto si definisce nella fase di Diagnosi, mai in modo speculativo, mai come checklist di default."
              }
              className="mb-12 sm:mb-16 max-w-3xl"
            />

            {/* Compact numbered ledger (practice-ledger grammar, subordinate
                scale): mono number + cyan side tick + display title + hairline
                rows. STATIC-OPEN — every detail is always visible; unlike
                /consulting there is NO scroll-scrub on this secondary page.
                Hover/focus brighten is the only interaction, all paint-only
                (color + transform sweeps on constant-space elements — zero
                layout shift). Rows are non-link (no fake affordance, the
                ledger's rationale), so no tab stops are added; the
                focus-within variants cover any future focusable content.
                Entrances via the site's Reveal/IO contract (RM-gated, SSR
                paints everything); stable index keys so an EN↔IT toggle
                swaps text in place without replaying the entrance. */}
            <ul role="list" className="list-none border-y border-rule/70 divide-y divide-rule/70">
              {service.builds.map((b, i) => (
                <Reveal as="li" key={i} delay={i * 60} className="group py-6 sm:py-7">
                  <div className="grid grid-cols-[2.75rem_1fr] items-baseline gap-x-2 sm:grid-cols-[4.25rem_1fr]">
                    <span className="relative pl-3 font-mono text-[11px] tracking-[0.22em] text-accent/50 transition-colors duration-300 group-hover:text-accent group-focus-within:text-accent sm:pl-4">
                      {/* Side tick — sweeps in (scaleY) on hover/focus. */}
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-[0.05em] h-[1.15em] w-[2px] origin-top scale-y-0 bg-accent transition-transform duration-300 ease-[var(--ease-entrance)] group-hover:scale-y-100 group-focus-within:scale-y-100 motion-reduce:transition-none"
                      />
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-[clamp(1.35rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] text-ink/75 transition-colors duration-300 group-hover:text-ink group-focus-within:text-ink text-balance">
                        {isEn ? b.title : b.titleIt}
                      </h3>
                      {/* Underline — sweeps open (scaleX, origin left) on
                          hover/focus. Occupies constant space: zero layout
                          shift. */}
                      <span
                        aria-hidden="true"
                        className="mt-2.5 block h-px w-20 origin-left scale-x-0 bg-accent/80 transition-transform duration-500 ease-[var(--ease-entrance)] group-hover:scale-x-100 group-focus-within:scale-x-100 motion-reduce:transition-none sm:w-28"
                      />
                      {/* Detail — static-open, never height-clipped. */}
                      <p className="mt-2.5 max-w-2xl text-[14px] leading-relaxed text-ink-mute">
                        {isEn ? b.detail : b.detailIt}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        <div aria-hidden="true" className="container-px py-1 relative z-10">
          <div className="section-rule mx-auto max-w-3xl" />
        </div>

        {/* ===== 04 Use cases ============================================== */}
        <section className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden">
          <SectionGlow position="top-right" intensity={1} size="55rem" />
          <div className="container-px relative">
            <SectionHeading
              eyebrow={isEn ? "Where this lands" : "Dove si applica"}
              title={
                isEn ? (
                  <>
                    Three places SerSan typically gets called in for{" "}
                    <span className="font-display italic">{name}.</span>
                  </>
                ) : (
                  <>
                    Tre situazioni in cui SerSan viene tipicamente chiamata per{" "}
                    <span className="font-display italic">{name}.</span>
                  </>
                )
              }
              className="mb-12 sm:mb-16 max-w-3xl"
            />

            {/* One-shot staggered beats (door-beats grammar at reduced
                amplitude — see use-case-beats.tsx). The eyebrow strings are
                the retired card's exact "NN · Use case / Caso d'uso" labels,
                composed here so the beats component stays copy-free. */}
            <UseCaseBeats
              items={service.useCases.map((uc, i) => ({
                eyebrow: `${String(i + 1).padStart(2, "0")} · ${
                  isEn ? "Use case" : "Caso d'uso"
                }`,
                title: isEn ? uc.title : uc.titleIt,
                desc: isEn ? uc.detail : uc.detailIt,
              }))}
            />
          </div>
        </section>

        <div aria-hidden="true" className="container-px py-1 relative z-10">
          <div className="section-rule mx-auto max-w-3xl" />
        </div>

        {/* ===== 05 Deliverables =========================================== */}
        <section className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden">
          <SectionGlow position="bottom-left" intensity={1} size="55rem" />
          <div className="container-px relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
              <div className="lg:col-span-5">
                <SectionHeading
                  eyebrow={isEn ? "Deliverables" : "Deliverable"}
                  title={
                    isEn ? (
                      <>
                        What you actually{" "}
                        <span className="font-display italic">hold</span> at the
                        end.
                      </>
                    ) : (
                      <>
                        Cosa avete{" "}
                        <span className="font-display italic">in mano</span> alla
                        fine.
                      </>
                    )
                  }
                  description={
                    isEn
                      ? "Concrete artefacts handed to your team. Yours after handover: no licensing, no lock-in, no source held back."
                      : "Artefatti concreti consegnati al vostro team. Vostri dopo l'handover: nessuna licenza, nessun lock-in, nessun codice trattenuto."
                  }
                />
              </div>
              <div className="lg:col-span-7">
                {/* Two-column hairline table (engagement-acts grammar): mono
                    micro-labels over per-row hairlines, no card fill, no tick
                    icons (uppercase is CSS-only; DOM strings stay
                    byte-identical). Entrances via the site's Reveal/IO
                    contract; stable index keys so an EN↔IT toggle swaps text
                    in place without replaying the entrance. */}
                <ul
                  role="list"
                  className="list-none grid grid-cols-1 gap-x-12 border-b border-rule/60 sm:grid-cols-2 lg:pt-2"
                >
                  {service.deliverables.map((d, i) => (
                    <Reveal
                      as="li"
                      key={i}
                      delay={i * 50}
                      className="border-t border-rule/60 py-3 font-mono text-[11px] uppercase leading-relaxed tracking-[0.16em] text-ink/80"
                    >
                      {isEn ? d.text : d.textIt}
                    </Reveal>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 06 Selected work ========================================== */}
        {relevantCases.length > 0 ? (
          <>
            <div aria-hidden="true" className="container-px py-1 relative z-10">
              <div className="section-rule mx-auto max-w-3xl" />
            </div>
            <section
              id="work"
              className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
            >
              <SectionGlow position="top-right" intensity={1} size="55rem" />
              <SectionGlow
                position="bottom-left"
                intensity={0.85}
                size="50rem"
              />
              <div className="container-px relative">
                <SectionHeading
                  eyebrow={isEn ? "Selected work" : "Lavori selezionati"}
                  title={
                    isEn ? (
                      <>
                        {name} engagements you can{" "}
                        <span className="font-display italic">name.</span>
                      </>
                    ) : (
                      <>
                        Ingaggi di {name} che potete{" "}
                        <span className="font-display italic">nominare.</span>
                      </>
                    )
                  }
                  description={
                    isEn
                      ? `${relevantCases.length} of SerSan's ${caseStudies.length} engagements that exemplify this service.`
                      : `${relevantCases.length} dei ${caseStudies.length} ingaggi di SerSan che esemplificano questo servizio.`
                  }
                  className="mb-12 sm:mb-16 max-w-3xl"
                />

                {/* Typographic link list (no cards, no images): hairline
                    rows, mono sector tag + display title + arrow. Each row is
                    the SAME Link the cards carried — /case-studies/[slug]
                    navigation survives the redesign. Hover: underline sweep
                    under the title (absolute, paint-only — zero layout
                    shift) + the arrow's existing nudge. */}
                <ul role="list" className="list-none border-t border-rule/70">
                  {relevantCases.map((c, i) => (
                    <Reveal
                      as="li"
                      key={c.id}
                      delay={i * 60}
                      className="border-b border-rule/70"
                    >
                      <Link
                        href={`/case-studies/${c.id}`}
                        className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 rounded-sm py-5 outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent)/0.45)] sm:py-6"
                      >
                        <span className="min-w-0">
                          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[hsl(var(--accent)/0.85)]">
                            {c.industry}
                          </span>
                          <span className="mt-1.5 block">
                            <span className="relative inline-block font-display text-xl leading-[1.15] tracking-[-0.018em] text-ink sm:text-2xl">
                              {c.client}
                              {/* Underline sweep — scaleX from the left on
                                  hover/focus; absolute, so no layout shift. */}
                              <span
                                aria-hidden="true"
                                className="absolute inset-x-0 -bottom-0.5 block h-px origin-left scale-x-0 bg-accent/80 transition-transform duration-500 ease-[var(--ease-entrance)] group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
                              />
                            </span>
                          </span>
                        </span>
                        <ArrowUpRight
                          className="h-4 w-4 shrink-0 self-center text-ink-mute transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </Reveal>
                  ))}
                </ul>

                <div className="mt-10 flex justify-end">
                  <Link
                    href="/case-studies"
                    className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase text-ink-mute hover:text-ink transition-colors"
                  >
                    {isEn ? "Full archive" : "Archivio completo"} (
                    {caseStudies.length})
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </div>
              </div>
            </section>
          </>
        ) : null}

        <div aria-hidden="true" className="container-px py-1 relative z-10">
          <div className="section-rule mx-auto max-w-3xl" />
        </div>

        {/* ===== 07 FAQs =================================================== */}
        <section className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden">
          <SectionGlow position="center-left" intensity={0.9} size="55rem" />
          <div className="container-px relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
              <div className="lg:col-span-5">
                <SectionHeading
                  eyebrow={isEn ? "Common questions" : "Domande frequenti"}
                  title={
                    isEn ? (
                      <>
                        Answers from{" "}
                        <span className="font-display italic">
                          scoping calls.
                        </span>
                      </>
                    ) : (
                      <>
                        Risposte dalle{" "}
                        <span className="font-display italic">
                          scoping call.
                        </span>
                      </>
                    )
                  }
                  description={
                    isEn
                      ? "If your question isn't here, the scoping call is where it gets answered. Reply within one business day."
                      : "Se la vostra domanda non è qui, la scoping call è il momento in cui trova risposta. Risposta entro un giorno lavorativo."
                  }
                />
              </div>
              <div className="lg:col-span-7">
                <div className="card-steel divide-y divide-[hsl(var(--rule)/0.7)]">
                  {service.faqs.map((f) => (
                    <details
                      key={f.q}
                      className="group p-5 sm:p-6 [&_summary::-webkit-details-marker]:hidden"
                    >
                      <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-ink hover:text-[hsl(var(--accent))] transition-colors">
                        <span className="font-display text-base sm:text-lg leading-snug">
                          {isEn ? f.q : f.qIt}
                        </span>
                        <span
                          aria-hidden="true"
                          className="shrink-0 w-6 h-6 rounded-full border border-[hsl(var(--rule))] flex items-center justify-center text-ink-mute transition-transform duration-300 group-open:rotate-45"
                        >
                          <span className="font-mono text-[14px] leading-none">
                            +
                          </span>
                        </span>
                      </summary>
                      <p className="mt-4 text-[14px] text-ink-mute leading-relaxed pr-8">
                        {isEn ? f.a : f.aIt}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div aria-hidden="true" className="container-px py-1 relative z-10">
          <div className="section-rule mx-auto max-w-3xl" />
        </div>

        {/* ===== 08 Final CTA ============================================== */}
        <section className="section-accent-tint section-accent-tint--strong relative section-lg scroll-mt-24 overflow-hidden">
          <SectionGlow position="top-right" intensity={1.2} size="60rem" />
          <SectionGlow position="bottom-left" intensity={1} size="55rem" />
          <div className="container-px relative">
            <div className="max-w-3xl">
              <p className="eyebrow mb-5 inline-flex items-center gap-2 text-ink-mute">
                <span aria-hidden="true" className="status-dot" />
                <span>
                  {isEn
                    ? "Start with a scoping call"
                    : "Si parte da una scoping call"}
                </span>
              </p>
              <h2 className="font-display text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[1.02] tracking-[-0.028em] text-ink mb-5 text-balance">
                {isEn ? (
                  <>
                    Tell us what you&apos;re trying to build with{" "}
                    <span className="text-[hsl(var(--accent))] font-display font-medium">
                      {name.toLowerCase()}.
                    </span>
                  </>
                ) : (
                  <>
                    Raccontateci cosa volete costruire con{" "}
                    <span className="text-[hsl(var(--accent))] font-display font-medium">
                      {name.toLowerCase()}.
                    </span>
                  </>
                )}
              </h2>
              <p className="text-base sm:text-lg text-ink-mute leading-relaxed max-w-2xl mb-7">
                {isEn
                  ? "Read by one of the founders. We'll review the context and reply within one business day with a recommended next step. Sometimes that's a build, sometimes an audit, sometimes “don't do this.”"
                  : "La legge uno dei fondatori. Esaminiamo il contesto e rispondiamo entro un giorno lavorativo con il prossimo step consigliato. A volte è un build, a volte un audit, a volte «non fatelo»."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                <Link href={START_HREF}>
                  <Button variant="hero" size="xl" className="group">
                    {bookCallLabel}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/#process">
                  <Button variant="heroOutline" size="xl">
                    {isEn
                      ? "See how engagements run"
                      : "Scopri come funzionano gli ingaggi"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
