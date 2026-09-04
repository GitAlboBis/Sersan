"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  Button,
  CTA_FLUID_SM,
  CTA_WRAPPER_SM,
} from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionGlow } from "@/components/ui/section-glow";
import { Reveal } from "@/components/ui/reveal";
import { UseCaseBeats } from "@/components/sections/use-case-beats";
import { useLanguage } from "@/components/language-provider";
import { caseStudies } from "@/data/case-studies";
import { CTA, FACTS, pick } from "@/data/copy";
import type { ServiceContent } from "@/data/services";
import { START_HREF } from "@/lib/site";
import { track, EVENTS } from "@/lib/analytics";
import { cn } from "@/lib/utils";

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
 * CTA labels come from src/data/copy.ts. They must never promise a booking:
 * CAL_ENABLED is false and /start is a written brief, not a calendar.
 *
 * No invented copy — everything comes from src/data/services.ts and
 * src/data/case-studies.ts.
 *
 * PER-SERVICE COPY. Section 03/04/05/08 headings and straplines used to be
 * written once in this template and rendered byte-identical on all four
 * service pages (the 05 strapline even promised "the code" on /services/
 * architecture, which ships a written recommendation and no code). They now
 * come from the service entry: buildsHeading/buildsNote, useCasesHeading,
 * deliverablesNote, closingHeading/closingNote. What stays shared here is what
 * is genuinely universal — the reply promise (FACTS.replyTime) and the
 * structural section labels.
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
  // The primary action is a written brief, never a booking. The contextual
  // variant matches the surface's subject (see CTA in src/data/copy.ts).
  const primaryCtaLabel = pick(
    isEn,
    service.slug === "automation"
      ? CTA.showWorkflow
      : service.slug === "architecture"
        ? CTA.discussDiagnostic
        : service.slug === "mlops"
          ? CTA.discussProject
          : CTA.tellUsBuilding,
  );
  /**
   * PROMPT 17 — a service CTA fires two events on purpose:
   *   - SERVICE_CTA_CLICKED answers "which of the four services converts",
   *     and carries the finer position (hero vs the closing panel);
   *   - CTA_PROJECT_BRIEF keeps this click inside the site-wide brief count,
   *     tagged `service_cta` so it is separable from nav/footer/hero.
   * Neither call is awaited and neither can block the navigation.
   */
  const trackServiceCta = (position: string) => {
    track(EVENTS.SERVICE_CTA_CLICKED, {
      service: service.slug,
      source_section: position,
    });
    track(EVENTS.CTA_PROJECT_BRIEF, {
      source_section: "service_cta",
      service: service.slug,
      lang: language,
    });
  };

  // Filter case studies by id, preserving the order given in services.ts
  const relevantCases = service.caseStudyIds
    .map((id) => caseStudies.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  // Attribution split — a "prior" entry is a founder's pre-SerSan delivery and
  // must never be counted as a SerSan client engagement (see case-studies.ts).
  const sersanCases = relevantCases.filter(
    (c) => c.attribution === "sersan",
  ).length;
  const priorCases = relevantCases.length - sersanCases;
  const workNote = isEn
    ? priorCases === 0
      ? `${relevantCases.length} projects that exemplify this service, all built by SerSan.`
      : sersanCases === 0
        ? `${relevantCases.length} projects that exemplify this service, from prior senior delivery before SerSan.`
        : `${relevantCases.length} projects that exemplify this service — ${sersanCases} built by SerSan, ${priorCases} from prior senior delivery.`
    : priorCases === 0
      ? `${relevantCases.length} progetti che esemplificano questo servizio, tutti realizzati da SerSan.`
      : sersanCases === 0
        ? `${relevantCases.length} progetti che esemplificano questo servizio, da precedenti consegne senior prima di SerSan.`
        : `${relevantCases.length} progetti che esemplificano questo servizio — ${sersanCases} realizzati da SerSan, ${priorCases} da precedenti consegne senior.`;
  // Section 04's heading counts the use cases it is about to render. It used
  // to say "Three" while /services/architecture ships four.
  const useCaseCountWord =
    (isEn
      ? ["", "One", "Two", "Three", "Four", "Five", "Six"]
      : ["", "Una", "Due", "Tre", "Quattro", "Cinque", "Sei"])[
      service.useCases.length
    ] ?? String(service.useCases.length);

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
              {/* CTA_*_SM: `items-start` makes these shrink-to-fit, and the
                  nowrap label ("Raccontaci cosa state costruendo") is far
                  wider than the 256px column at 320px. Inert at sm and up. */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                <Link
                  href={START_HREF}
                  className={CTA_WRAPPER_SM}
                  onClick={() => trackServiceCta("service_hero")}
                >
                  <Button
                    variant="hero"
                    size="xl"
                    className={cn("group", CTA_FLUID_SM)}
                  >
                    {primaryCtaLabel}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link
                  href="#work"
                  className={CTA_WRAPPER_SM}
                  onClick={() =>
                    track(EVENTS.CTA_SELECTED_WORK, {
                      source_section: "service_hero",
                      service: service.slug,
                    })
                  }
                >
                  <Button variant="heroOutline" size="xl" className={CTA_FLUID_SM}>
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
                <>
                  {isEn
                    ? service.buildsHeading.lead
                    : service.buildsHeading.leadIt}{" "}
                  <span className="font-display italic">
                    {isEn
                      ? service.buildsHeading.accent
                      : service.buildsHeading.accentIt}
                  </span>
                </>
              }
              description={isEn ? service.buildsNote : service.buildsNoteIt}
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
                <>
                  {useCaseCountWord}{" "}
                  {isEn
                    ? service.useCasesHeading.lead
                    : service.useCasesHeading.leadIt}{" "}
                  <span className="font-display italic">
                    {isEn
                      ? service.useCasesHeading.accent
                      : service.useCasesHeading.accentIt}
                  </span>
                </>
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
                      ? service.deliverablesNote
                      : service.deliverablesNoteIt
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
                        Projects behind this{" "}
                        <span className="font-display italic">service.</span>
                      </>
                    ) : (
                      <>
                        I progetti dietro questo{" "}
                        <span className="font-display italic">servizio.</span>
                      </>
                    )
                  }
                  description={workNote}
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
                          real projects.
                        </span>
                      </>
                    ) : (
                      <>
                        Risposte da{" "}
                        <span className="font-display italic">
                          progetti reali.
                        </span>
                      </>
                    )
                  }
                  /* description removed 2026-09-04 (owner: "scritte piccole
                     inutili") — a hedge under the FAQ heading restating the
                     reply promise. */
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
                    ? "Start with the problem"
                    : "Si parte dal problema"}
                </span>
              </p>
              <h2 className="font-display text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[1.02] tracking-[-0.028em] text-ink mb-5 text-balance">
                {isEn
                  ? service.closingHeading.lead
                  : service.closingHeading.leadIt}{" "}
                <span className="text-[hsl(var(--accent))] font-display font-medium">
                  {isEn
                    ? service.closingHeading.accent
                    : service.closingHeading.accentIt}
                </span>
              </h2>
              <p className="text-base sm:text-lg text-ink-mute leading-relaxed max-w-2xl mb-7">
                {isEn ? service.closingNote : service.closingNoteIt}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                <Link
                  href={START_HREF}
                  className={CTA_WRAPPER_SM}
                  onClick={() => trackServiceCta("service_close")}
                >
                  <Button
                    variant="hero"
                    size="xl"
                    className={cn("group", CTA_FLUID_SM)}
                  >
                    {primaryCtaLabel}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/consulting#process" className={CTA_WRAPPER_SM}>
                  <Button variant="heroOutline" size="xl" className={CTA_FLUID_SM}>
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
