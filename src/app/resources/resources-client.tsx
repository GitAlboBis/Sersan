"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { resources } from "@/data/resources";
import { useLanguage } from "@/components/language-provider";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import {
  useResourcePreview,
  ResourcePreviewCard,
} from "@/components/resources/resource-preview";

export function ResourcesClient() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const { getItemHandlers, onListPointerLeave } = useResourcePreview();

  const categoryLabel: Record<string, string> = isEn
    ? {
        article: "Article",
        guide: "Guide",
        "case-study": "Case study",
        whitepaper: "Whitepaper",
      }
    : {
        article: "Articolo",
        guide: "Guida",
        "case-study": "Case study",
        whitepaper: "Whitepaper",
      };

  const dateLocale = isEn ? "en-GB" : "it-IT";

  return (
    <div className="min-h-screen text-foreground relative">
      {/* Hero */}
      <section data-line-anchor="hero" className="pt-24 pb-16 md:pb-24 relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[75vw] h-[36vw] max-w-[1000px] max-h-[560px] blur-3xl opacity-25"
            style={{ background: "radial-gradient(closest-side, hsl(var(--accent) / 0.22), transparent 70%)" }}
          />
        </div>
        <div className="container-px relative z-10">
          {/* H1 outside the Reveal: the choreographer's line-mask reveal owns
              it (data-split-reveal) — no double animation. Eyebrow entrance =
              LabelScrambler decode; the sub keeps the Reveal fade. */}
          <div className="max-w-3xl mx-auto text-center">
            <p className="eyebrow mb-6 inline-flex items-center justify-center gap-2">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--accent))" }}
                aria-hidden="true"
              />
              {isEn ? "Field notes" : "Appunti dal campo"}
            </p>
            {/* key={language}: SplitText owns this subtree once split; a language
                swap must remount it or React reconciles against orphaned nodes
                (same contract as SectionHeading's h2). */}
            <h1 key={language} data-split-reveal className="font-display text-[clamp(2.25rem,7vw,4.5rem)] leading-[1.15] tracking-[-0.025em] text-ink text-balance mb-8 pb-1">
              {isEn ? (
                <>
                  What we&apos;ve learned{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    shipping.
                  </span>
                </>
              ) : (
                <>
                  Cosa abbiamo imparato{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    portando in produzione.
                  </span>
                </>
              )}
            </h1>
            <Reveal delay={150}>
              <p className="text-lg md:text-xl text-ink-mute max-w-xl mx-auto leading-[1.5]">
                {isEn
                  ? "No frameworks-of-frameworks. Just what worked, what failed, and why."
                  : "Niente framework di framework. Solo cosa ha funzionato, cosa è andato male e perché."}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Articles list */}
      <section data-line-anchor="list" className="pb-24">
        <div className="container-px">
          <div
            className="max-w-4xl mx-auto space-y-5"
            onPointerLeave={onListPointerLeave}
          >
            {resources.map((r, i) => (
              <Reveal key={r.slug} delay={Math.min(i, 4) * 70}>
              <Link
                href={`/resources/${r.slug}`}
                data-resource-index={i}
                className="card-steel group block p-7"
                {...getItemHandlers(i)}
              >
                <div className="flex items-center gap-3 mb-3 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute">
                  <span style={{ color: "hsl(var(--accent))" }}>{categoryLabel[r.category]}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {new Date(r.publishedAt).toLocaleDateString(dateLocale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {r.readMinutes} min
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-[1.75rem] text-ink mb-3 leading-tight group-hover:text-[hsl(var(--accent))] transition-colors">
                  {isEn ? r.title : r.titleIt}
                </h2>
                <p className="text-sm sm:text-base text-ink-mute leading-[1.55] mb-4">
                  {isEn ? r.excerpt : r.excerptIt}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute">
                    {r.authorName} &middot; {isEn ? r.authorRole : r.authorRoleIt}
                  </p>
                  <ArrowRight className="w-4 h-4 text-ink-mute group-hover:text-[hsl(var(--accent))] group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Ritual gap — transparent negative space so the persistent canvas
          (z-0) shows through; the route's 3D ritual object world-anchors
          here and the signature line threads it before the CTA. */}
      <div data-line-anchor="ritual" aria-hidden="true" className="py-28 sm:py-40" />

      {/* Closing CTA — a REAL section (BEAT 3) so the signature line gets a
          genuine terminus band instead of dying in the void. Copy + structure
          reuse the /case-studies closing CTA verbatim (frozen EN/IT strings);
          giving final-cta real height shifts its measured center fraction down
          the document, fixing the curve tail via the existing waypoint (no
          routeCurves edit). */}
      <section data-line-anchor="final-cta" className="section-lg relative">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] opacity-20 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,hsl(var(--accent))_0%,transparent_60%)] blur-[140px]" />
        </div>
        <div className="container-px relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            {/* SectionHeading owns the line-mask reveal AND carries
                key={language} on its internal h2 (data-heading-title) — adding
                data-split-reveal here would double-animate the title via
                HeadingChoreographer, so we reuse the /case-studies pattern as-is. */}
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
            </div>
          </div>
        </div>
      </section>

      {/* DOM/CSS fallback hover-preview card (BEAT 3). Renders only on the
          non-WebGPU paths (lite tier / flag-off desktop); suppressed on the
          desktop WebGPU full path where ResourcePreviewPlane is the preview,
          and on coarse/reduced-motion. */}
      <ResourcePreviewCard />
    </div>
  );
}
