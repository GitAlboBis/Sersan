"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { caseStudies, type CaseStudy } from "@/data/case-studies";
import { useLanguage } from "@/components/language-provider";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import WorkInProgress from "@/components/sections/work-in-progress";
import { CardImageDistort } from "@/components/fx/card-image-distort";
import { useFlipSource } from "@/lib/use-flip-source";

/**
 * GridCard — one archive grid card, extracted so useFlipSource (a hook) is
 * called once per card at component top level (rules of hooks). The card markup
 * is unchanged from the inline version; the only additions are onClick +
 * data-flip-source on the <Link>, applied ONLY for studies WITH a previewImage
 * (the three SerSan builds). Cards without a preview get no handler/attr and
 * navigate exactly as before.
 */
function GridCard({ study, isEn }: { study: CaseStudy; isEn: boolean }) {
  const engagement = isEn ? study.engagement : study.engagementIt;
  const role = isEn ? study.role : study.roleIt;
  const summary = isEn ? study.summary : study.summaryIt;
  // Hook called unconditionally; passing undefined src is a no-op arm.
  const onFlip = useFlipSource(study.id, study.previewImage);
  return (
    <Link
      href={`/case-studies/${study.id}`}
      data-cursor="view"
      className="card-steel group flex flex-col h-full p-7"
      aria-label={`${study.client}, ${engagement}`}
      {...(study.previewImage
        ? { onClick: onFlip, "data-flip-source": study.id }
        : {})}
    >
      {study.previewImage && (
        <CardImageDistort
          src={study.previewImage}
          alt={`${study.client} product preview`}
        />
      )}
      <div className="relative z-10 flex flex-col h-full">
        <p
          className="text-[10px] font-mono uppercase tracking-[0.18em] mb-3"
          style={{ color: "hsl(var(--accent))" }}
        >
          {study.industry}
        </p>
        <h3 className="font-display text-2xl text-ink leading-tight mb-2 transition-colors duration-300 group-hover:text-[hsl(var(--accent))]">
          {study.client}
        </h3>
        <p className="text-sm text-ink-mute mb-4">{engagement}</p>
        <p className="text-sm text-ink/85 leading-[1.55] line-clamp-4 mb-6">{summary}</p>
        <div className="mt-auto flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute">
          <span className="transition-colors duration-300 group-hover:text-ink">
            {role}
          </span>
          {/* Arrow slides + fades in on hover (asset-free affordance). */}
          <ArrowRight className="w-3.5 h-3.5 -translate-x-1 opacity-50 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-[hsl(var(--accent))] motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:opacity-100" />
        </div>
      </div>
    </Link>
  );
}

export function CaseStudiesClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  return (
    <div className="min-h-screen pt-24 relative">
      {/* Hero */}
      <section data-line-anchor="hero" className="py-20 sm:py-32 relative">
        <div className="container-px relative">
          {/* H1 outside the Reveal: the choreographer's line-mask reveal owns
              it (data-split-reveal) — no double animation. Eyebrow entrance =
              LabelScrambler decode; sub + divider keep the Reveal fade. */}
          <div className="max-w-3xl mx-auto text-center">
            <p className="eyebrow mb-6 inline-flex items-center justify-center gap-2">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--accent))" }}
                aria-hidden="true"
              />
              {isEn ? "Selected work" : "Lavori selezionati"}
            </p>
            {/* key={language}: SplitText owns this subtree once split; a language
                swap must remount it or React reconciles against orphaned nodes
                (same contract as SectionHeading's h2). */}
            <h1 key={language} data-split-reveal className="font-display text-[clamp(2.25rem,7vw,4.5rem)] leading-[1.15] tracking-[-0.025em] text-ink text-balance mb-8 pb-1">
              {isEn ? (
                <>
                  Engineering{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    track record.
                  </span>
                </>
              ) : (
                <>
                  Track record di{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    ingegneria.
                  </span>
                </>
              )}
            </h1>
            <Reveal delay={150}>
              <p className="text-base sm:text-lg text-ink-mute max-w-2xl mx-auto leading-[1.55]">
                {isEn
                  ? "AI-powered software CPTO Michele Sanna has shipped across tier-1 institutions, plus current Sersan product builds. Each entry labels the role and the delivery context."
                  : "Software AI-powered che il CPTO Michele Sanna ha portato in produzione in istituzioni tier-1, insieme ai build di prodotto attuali di Sersan. Ogni voce indica il ruolo e il contesto di delivery."}
              </p>
              <div
                className="mt-10 mx-auto h-px w-48 origin-center"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, hsl(var(--accent) / 0.6) 50%, transparent 100%)",
                }}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section data-line-anchor="grid" className="py-16 sm:py-24">
        <div className="container-px">
          <div className="max-w-6xl mx-auto">
            <h2 className="sr-only">{isEn ? "Case studies" : "Case study"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {caseStudies.map((study, i) => (
                /* Cards WITH a product preview (the three Sersan builds —
                   SphereNode, Quantex, Terra Noa) get the Lusion-style
                   hover-reveal: the shot fades in BEHIND the text and distorts
                   (RGB-shift + parallax + zoom) via a self-contained WebGL2
                   canvas, with a CSS-only fade fallback for reduced-motion /
                   touch / no-WebGL2. The media layer is the FIRST child so it
                   sits behind the text under a navy scrim; the text is wrapped
                   in a relative z-10 stack so it stays fully readable. Cards
                   WITHOUT a preview keep the asset-free CSS/GSAP hover (tilt +
                   sheen + glow + arrow) unchanged. */
                <Reveal key={study.id} delay={(i % 2) * 90} className="h-full">
                  <GridCard study={study} isEn={isEn} />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Work in progress — internal builds, shown after the shipped archive
          (restyle step 2: the archive grid leads, in-development work trails). */}
      <WorkInProgress variant="full" />

      {/* Disclaimer */}
      <section data-line-anchor="disclaimer" className="pb-12">
        <div className="container-px">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-muted-foreground leading-relaxed text-center italic">
              {isEn
                ? "All figures reflect measured impact in production or validated simulation environments. Engagements are labelled by the delivery context in which they were performed; some predate Sersan or were delivered through previous employers or consulting partners. Specific client data and proprietary methods are abstracted where required by confidentiality."
                : "Tutti i numeri riflettono l'impatto misurato in produzione o in ambienti di simulazione validati. Gli ingaggi sono etichettati in base al contesto di delivery in cui sono stati svolti; alcuni precedono Sersan o sono stati erogati tramite precedenti datori di lavoro o partner di consulenza. Dati specifici dei clienti e metodi proprietari sono astratti dove richiesto dalla riservatezza."}
            </p>
          </div>
        </div>
      </section>

      {/* Ritual gap — transparent negative space so the persistent canvas
          (z-0) shows through; the route's 3D ritual object world-anchors
          here and the signature line threads it before the CTA. */}
      <div data-line-anchor="ritual" aria-hidden="true" className="py-28 sm:py-40" />

      {/* Closing CTA */}
      <section data-line-anchor="final-cta" className="section-lg relative">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] opacity-20 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,hsl(var(--accent))_0%,transparent_60%)] blur-[140px]" />
        </div>
        <div className="container-px relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <SectionHeading
              align="center"
              className="mx-auto mb-10 max-w-2xl"
              title={
                isEn ? (
                  <>
                    Want this kind of work in{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      your business?
                    </span>
                  </>
                ) : (
                  <>
                    Volete questo tipo di lavoro nella{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      vostra azienda?
                    </span>
                  </>
                )
              }
              description={
                isEn
                  ? "A free scoping call is the easiest way to find out where it would have the highest impact."
                  : "Una call di scoping gratuita è il modo più semplice per capire dove avrebbe l'impatto maggiore."
              }
            />
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="px-10 py-7 text-base font-semibold rounded-full">
                <Link href="/audit">
                  {isEn ? "Book a scoping call" : "Prenota una call di scoping"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <a
                href="mailto:alex.s@sersan.dev"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isEn ? (
                  <>
                    Or email{" "}
                    <span className="underline decoration-dotted underline-offset-4">alex.s@sersan.dev</span>
                  </>
                ) : (
                  <>
                    Oppure scrivete a{" "}
                    <span className="underline decoration-dotted underline-offset-4">alex.s@sersan.dev</span>
                  </>
                )}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
