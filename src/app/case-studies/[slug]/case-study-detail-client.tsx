"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowLeft, ArrowUpRight, ArrowRight } from "lucide-react";
import { Button, CTA_FLUID_SM } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";
import { type CaseStudy } from "@/data/case-studies";
import { isFlipArmedFor } from "@/lib/flip-handoff-store";
import { useReturnFlipSource } from "@/lib/use-flip-source";

const INDUSTRY_ACCENT: Record<CaseStudy["industry"], string> = {
  FinTech: "var(--accent)",
  Healthcare: "var(--refusal)",
  Aerospace: "var(--accent)",
  "Public Sector": "var(--accent)",
  Industrial: "var(--accent)",
  Energy: "var(--accent)",
  Agritech: "var(--accent)",
};

interface CaseStudyDetailClientProps {
  study: CaseStudy;
  prevStudy: CaseStudy;
  nextStudy: CaseStudy;
}

export function CaseStudyDetailClient({ study, prevStudy, nextStudy }: CaseStudyDetailClientProps) {
  const { language } = useLanguage();
  const isEn = language === "en";

  const engagement = isEn ? study.engagement : study.engagementIt;
  const role = isEn ? study.role : study.roleIt;
  const domain = isEn ? study.domain : study.domainIt;
  const summary = isEn ? study.summary : study.summaryIt;

  const accent = INDUSTRY_ACCENT[study.industry] || "var(--accent)";
  const [firstWord, ...rest] = study.client.split(" ");

  const hasHero = Boolean(study.previewImage);
  const heroRef = useRef<HTMLElement>(null);

  // The breadcrumb is the page's EXPLICIT way back to the work archive: a
  // plain left click on it arms the REVERSE flight (the hero deflates onto
  // its matching card — fx/flip-handoff-overlay) while the <Link> navigates
  // natively. Arming is passive and per-click gated inside the hook —
  // reduced-motion / coarse pointers whose source is < 60 % on-screen /
  // modified clicks / no-hero studies all fall through to the standard route
  // cover unchanged (mobile-parity Phase 5: a coarse tap on a mostly-visible
  // card DOES arm the flight), and browser
  // back/forward (popstate) never arms since no click handler runs. The hook
  // also toggles [data-no-curtain] on the link so the generic cover twin
  // (navbar's RouteTransitionCover) never double-covers an armed flight.
  const onReturnFlip = useReturnFlipSource(study.id, study.previewImage);

  // Hero image entrance. The hook is called unconditionally (rules of hooks);
  // `if (!el) return` covers the no-figure case so the effect is a no-op when
  // !hasHero. The 0.62 / expo.out timing deliberately echoes the route
  // curtain's open beat (CURTAIN_DURATION = 0.62, expo.inOut in
  // src/app/template.tsx) so the image resolves in as the curtain lifts.
  useGSAP(
    () => {
      const el = heroRef.current;
      if (!el) return;
      if (isFlipArmedFor(study.id)) {
        // A card→detail Flip is incoming: the flying clone IS the entrance.
        // Stay hidden until the overlay lands it; safety-reveal if the flight
        // never runs. This PEEKS (non-consuming) while the overlay CONSUMES, so
        // the figure reliably sees "armed" and hides before the overlay flies
        // (useGSAP is a layout effect, runs child-before-parent ahead of the
        // overlay's useEffect). The figure must NEVER stay stuck hidden — this
        // 1.3s safety plus the overlay's reveal-on-complete both guarantee it.
        gsap.set(el, { autoAlpha: 0 });
        const safety = gsap.delayedCall(1.3, () =>
          gsap.to(el, { autoAlpha: 1, duration: 0.3 }),
        );
        return () => safety.kill();
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(el, { clipPath: "inset(0 0 0 0)", autoAlpha: 1 });
        return;
      }
      gsap.fromTo(
        el,
        { clipPath: "inset(0 0 100% 0)", autoAlpha: 0, scale: 1.03 },
        {
          clipPath: "inset(0 0 0% 0)",
          autoAlpha: 1,
          scale: 1,
          duration: 0.62,
          ease: "expo.out",
          delay: 0.05,
          clearProps: "clipPath,scale",
        },
      );
    },
    { scope: heroRef },
  );

  return (
    <div className="min-h-[100svh] pt-24 relative">
      {/* Hero halo */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[60vh] pointer-events-none">
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 w-[80vw] max-w-[1100px] h-[55vh] blur-3xl opacity-25"
          style={{ background: `radial-gradient(closest-side, hsl(${accent} / 0.28), transparent 70%)` }}
        />
      </div>

      <article className="container-px max-w-5xl relative z-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-10">
          <Link
            href="/case-studies"
            onClick={onReturnFlip}
            className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-ink-mute hover:text-[hsl(var(--accent))] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {isEn ? "All work" : "Tutti i lavori"}
          </Link>
        </nav>

        {/* Hero product image. Rendered only for studies with a previewImage
            (SphereNode, Quantex, Terra Noa). When the study has a live URL the
            shot carries a "View site" link out to it (new tab) — full-bleed
            with a hover cue on fine pointers, collapsed to a permanently
            visible corner pill on coarse ones (see the link's own note).
            data-flip-id / data-flip-hero are inert hooks for a
            future cross-route Flip transition. Height-capped so the eyebrow +
            h1 stay near the top of the viewport — in `svh`, because this is a
            REAL layout height: in `vh` it would re-size when the iOS URL bar
            collapses and reflow the article under the reader's thumb. */}
        {study.previewImage && (
          <figure
            ref={heroRef}
            data-flip-id={study.id}
            data-flip-hero
            className="group relative mb-12 overflow-hidden rounded-xl border border-rule/70 h-[min(44svh,24rem)] bg-[hsl(216_28%_10%)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={study.previewImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
            {/* subtle bottom-up navy scrim for depth + to seat it against the page */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, transparent 40%, hsl(216 30% 6% / 0.55) 100%)" }}
            />
            {/* "View site" — the shape of this link is pointer-dependent
                (D-22). On a FINE pointer it stays exactly as designed: the
                whole shot is the target, a scrim washes in on hover and the
                pill rises with it — the hover itself is the affordance, and
                the custom cursor reads `data-cursor="view"`.

                On a COARSE pointer there is no hover, so a full-bleed
                `inset-0` anchor is a large invisible trap that throws the
                reader onto an external site in a new tab with no warning.
                There the anchor collapses to the pill alone (`inset-auto` +
                bottom-right offset, min-h-11 so it clears 44×44) and the pill
                is painted permanently: the tap target and the affordance
                become the same object, and tapping the image does nothing.
                The hover-only scrim is dropped on coarse — the figure's own
                bottom-up navy gradient already seats the pill. The aria-label
                carries the accessible name in BOTH modes. */}
            {study.liveUrl && (
              <a
                href={study.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="view"
                aria-label={`${isEn ? "View" : "Visita"} ${study.client} — ${isEn ? "live site" : "sito live"}`}
                className="absolute inset-0 z-10 flex items-center justify-center pointer-coarse:inset-auto pointer-coarse:bottom-3 pointer-coarse:right-3 pointer-coarse:rounded-full"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-[hsl(216_30%_6%/0)] transition-colors duration-300 group-hover:bg-[hsl(216_30%_6%/0.5)] pointer-coarse:hidden"
                />
                <span className="relative inline-flex translate-y-1 items-center gap-2 rounded-full border border-[hsl(var(--accent)/0.5)] bg-[hsl(216_30%_8%/0.72)] px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 pointer-coarse:min-h-11 pointer-coarse:translate-y-0 pointer-coarse:opacity-100">
                  {isEn ? "View site" : "Visita il sito"}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </a>
            )}
          </figure>
        )}

        {/* Eyebrow */}
        <p className="eyebrow mb-5 inline-flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: `hsl(${accent})` }}
            aria-hidden="true"
          />
          {study.industry} · {engagement}
        </p>

        {/* Headline. Studies with a brand logo show the LOGO in place of the
            wordmark title (real full-colour SVG, left-aligned); the rest keep
            the split-reveal text title. The <h1> stays for document structure —
            the logo's alt carries the client name. key={language}: SplitText
            owns the TEXT subtree once split, so a language swap must remount it
            (same contract as SectionHeading's h2). */}
        {study.logoImage ? (
          <h1 key={language} className="mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={study.logoImage}
              alt={study.client}
              draggable={false}
              className="block h-auto w-auto max-h-[clamp(2.75rem,8vw,5rem)] max-w-full sm:max-w-md object-contain object-left"
            />
          </h1>
        ) : (
          <h1 key={language} data-split-reveal className="font-display text-[clamp(2.25rem,7vw,4.75rem)] leading-[1.12] tracking-[-0.025em] text-ink text-balance mb-6">
            {firstWord}
            {rest.length > 0 ? (
              <>
                {" "}
                <span className="italic" style={{ color: `hsl(${accent})` }}>
                  {rest.join(" ")}.
                </span>
              </>
            ) : (
              <span style={{ color: `hsl(${accent})` }}>.</span>
            )}
          </h1>
        )}

        {/* Role + domain */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-10 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute">
          <span>
            <span className="text-ink/70">{isEn ? "Role:" : "Ruolo:"}</span>{" "}
            <span className="text-ink">{role}</span>
          </span>
          <span aria-hidden="true" className="inline-block w-1 h-1 rounded-full bg-rule" />
          <span>
            <span className="text-ink/70">{isEn ? "Domain:" : "Ambito:"}</span>{" "}
            <span className="text-ink">{domain}</span>
          </span>
        </div>

        {/* Lead */}
        <p className="text-lg sm:text-xl text-ink-mute max-w-3xl leading-[1.55] mb-16">{summary}</p>

        {/* Brass rule */}
        <div
          className="h-px w-full mb-12"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, hsl(var(--accent) / 0.4) 50%, transparent 100%)",
          }}
        />

        {/* Metrics */}
        {study.metrics.length > 0 && (
          <section className="mb-20">
            <p className="eyebrow mb-8" style={{ color: "hsl(var(--accent))" }}>
              {isEn ? "What shipped" : "Cosa abbiamo consegnato"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {study.metrics.map((metric, i) => (
                <Reveal key={i} delay={i * 70} className="flex flex-col">
                  <span
                    className="font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.1] text-ink mb-3"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {/* CountUp animates only values its parser classifies as
                        metrics (leading number + unit token: −47%, ~€18M/year,
                        0.94 AUC…). Label-led, date, and word values ("p99 220ms
                        → 38ms", "Exit · Oct 2024", "Live") render statically —
                        that contract lives in count-up.tsx, not here. */}
                    <CountUp value={metric.value} />
                  </span>
                  <span className="text-sm text-ink-mute leading-[1.5]">
                    {isEn ? metric.label : metric.labelIt}
                  </span>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* Tech stack */}
        {study.techStack.length > 0 && (
          <section className="mb-20">
            <p className="eyebrow mb-6">{isEn ? "Tech stack" : "Stack tecnologico"}</p>
            <div className="flex flex-wrap gap-2">
              {study.techStack.map((tech, i) => (
                <Reveal key={tech} as="span" delay={i * 40} from="left">
                <span
                  className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.12em] rounded-full border border-rule/70 bg-surface/40 text-ink-mute"
                >
                  {tech}
                </span>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mb-20">
          <Reveal>
          <div className="rounded-xl border border-rule/70 bg-surface/40 backdrop-blur-sm p-8 sm:p-10">
            <p className="eyebrow mb-4" style={{ color: "hsl(var(--accent))" }}>
              {isEn ? "Next" : "Prossimo"}
            </p>
            <h3 className="font-display text-2xl sm:text-[1.75rem] text-ink mb-4 leading-tight max-w-2xl">
              {isEn ? (
                <>
                  Want this kind of work in{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    your business?
                  </span>
                </>
              ) : (
                <>
                  Volete questo tipo di lavoro nel{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    vostro business?
                  </span>
                </>
              )}
            </h3>
            <p className="text-sm text-ink-mute mb-6 max-w-2xl">
              {isEn ? (
                <>
                  One week, inside your stack. We hand you a written report on what&apos;s broken, what&apos;s manual, and
                  what AI can actually do.
                </>
              ) : (
                <>
                  Una settimana, dentro il vostro stack. Vi consegniamo un report scritto su cosa è rotto, cosa è
                  manuale e cosa l&apos;AI può davvero fare.
                </>
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className={cn("group", CTA_FLUID_SM)}>
                <Link href="/audit">
                  {isEn ? "Book a scoping call" : "Prenota una call di scoping"}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className={CTA_FLUID_SM}>
                <Link href="/contact">{isEn ? "Or just say hello" : "Oppure scriveteci e basta"}</Link>
              </Button>
            </div>
          </div>
          </Reveal>
        </section>

        {/* Prev / Next */}
        {(prevStudy || nextStudy) && (
          <nav className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-16">
            {prevStudy && (
              <Link
                href={`/case-studies/${prevStudy.id}`}
                data-cursor="view"
                className="group p-5 rounded-xl border border-rule/70 hover:border-[hsl(var(--accent)/0.5)] hover:bg-surface/40 transition-colors"
              >
                <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-2 inline-flex items-center gap-1.5">
                  <ArrowLeft className="w-3 h-3" />
                  {isEn ? "Previous" : "Precedente"}
                </p>
                <p className="font-display text-lg text-ink leading-tight group-hover:text-[hsl(var(--accent))] transition-colors">
                  {prevStudy.client}
                </p>
                <p className="text-xs text-ink-mute mt-1">
                  {isEn ? prevStudy.engagement : prevStudy.engagementIt}
                </p>
              </Link>
            )}
            {nextStudy && (
              <Link
                href={`/case-studies/${nextStudy.id}`}
                data-cursor="view"
                className="group p-5 rounded-xl border border-rule/70 hover:border-[hsl(var(--accent)/0.5)] hover:bg-surface/40 transition-colors text-right"
              >
                <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-2 inline-flex items-center gap-1.5 justify-end w-full">
                  {isEn ? "Next" : "Successivo"}
                  <ArrowUpRight className="w-3 h-3" />
                </p>
                <p className="font-display text-lg text-ink leading-tight group-hover:text-[hsl(var(--accent))] transition-colors">
                  {nextStudy.client}
                </p>
                <p className="text-xs text-ink-mute mt-1">
                  {isEn ? nextStudy.engagement : nextStudy.engagementIt}
                </p>
              </Link>
            )}
          </nav>
        )}
      </article>
    </div>
  );
}
