"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button, CTA_FLUID_SM } from "@/components/ui/button";
import { caseStudies } from "@/data/case-studies";
import { useLanguage } from "@/components/language-provider";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  WorkGrid,
  archiveStudies,
  usePlanesLive,
  lusionEase,
  prefersReducedMotion,
} from "@/components/work/work-card";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * /case-studies — the work archive on the Lusion /projects grammar
 * (ANALISI_LUSION_WORK.md round 2, boss directive 2026-08-20): a massive
 * display wordmark with the project count as a mono superscript and a
 * diagonal arrow, then the SAME two-column card grid the home Featured Work
 * renders (shared components/work/work-card.tsx) over the FULL population.
 * The sector filter rail, FLIP re-sort machinery and the in-progress block
 * of the previous archive are retired with the layout — lusion.co/projects
 * is title + grid, nothing else (disclaimer + closing CTA stay: legal +
 * business requirements, not layout).
 *
 * HEADER ENTRANCE (port of ProjectsMainSection, bundle ~1102k): each title
 * char rises from 100% below its clip while untwisting from 30°, staggered
 * i/30s on ease.lusion; the count chars follow ~0.33s later (no twist); the
 * arrow pops in with elastic.out. Fired once by a ScrollTrigger at mount
 * (the header is above the fold — it plays on load, after the curtain).
 *
 * Line anchors (hero/grid/disclaimer/ritual/final-cta) keep their names —
 * webgl/curves/routeCurves.ts glues the signature line to them.
 *
 * WebGL: Scene mounts FeaturedWorkPlanes on this route too — the archive's
 * media boxes carry the same [data-featured-media] contract, so the three
 * depth-mapped studies get the raymarched hover here as well.
 */
export function CaseStudiesClient() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const planesLive = usePlanesLive();
  const headerRef = useRef<HTMLDivElement | null>(null);

  const word = isEn ? "Work" : "Lavori";
  const count = String(caseStudies.length).padStart(2, "0");

  /* Header entrance — keyed on language (remount replays for the new word). */
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header || prefersReducedMotion()) return;
    const titleChars = Array.from(
      header.querySelectorAll<HTMLElement>(".cs-archive-title .cs-archive-char"),
    );
    const countChars = Array.from(
      header.querySelectorAll<HTMLElement>(".cs-archive-count .cs-archive-char"),
    );
    const arrow = header.querySelector<HTMLElement>(".cs-archive-arrow");
    const lusion = lusionEase();

    const ctx = gsap.context(() => {
      gsap.set(titleChars, { yPercent: 100, rotation: 30 });
      gsap.set(countChars, { yPercent: 100 });
      if (arrow) gsap.set(arrow, { scale: 0 });
      /* Exact port timings (ProjectsMainSection, fidelity pass):
         title runs on a 1.5× clock → per-char start (i/20 + 0.2)/1.5,
         duration 1/1.5 s; the count runs on the real clock → 0.5 + i/20,
         1 s; the arrow is elasticOut (amplitude 1, period 0.4) over 1 s
         from t = 0.6. */
      const play = () => {
        titleChars.forEach((ch, i) => {
          gsap.to(ch, {
            yPercent: 0,
            rotation: 0,
            duration: 0.667,
            ease: lusion,
            delay: 0.133 + i / 30,
          });
        });
        countChars.forEach((ch, i) => {
          gsap.to(ch, {
            yPercent: 0,
            duration: 1,
            ease: lusion,
            delay: 0.5 + i / 20,
          });
        });
        if (arrow)
          gsap.to(arrow, {
            scale: 1,
            duration: 1,
            ease: "elastic.out(1, 0.4)",
            delay: 0.6,
          });
      };
      const st = ScrollTrigger.create({
        trigger: header,
        start: "top 95%",
        once: true,
        onEnter: play,
      });
      /* The header is at the page top on every normal landing — and a
         freshly created trigger on this site does not evaluate until the
         first real scroll (measured live). Fire directly when in view. */
      if (header.getBoundingClientRect().top < window.innerHeight * 0.95) {
        st.kill();
        play();
      }
    }, header);
    return () => ctx.revert();
  }, [language]);

  return (
    <div className="min-h-[100svh] pt-24 relative">
      {/* Header — the /projects wordmark. */}
      <section data-line-anchor="hero" data-snap className="pt-16 pb-10 sm:pt-24 sm:pb-14">
        <div className="container-px">
          <div ref={headerRef} key={language} className="cs-archive-title-wrap">
            <h1
              className="cs-archive-title font-display text-ink"
              aria-label={
                isEn
                  ? "Work — engineering track record"
                  : "Lavori — track record di ingegneria"
              }
            >
              <span aria-hidden="true">
                {word.split("").map((ch, i) => (
                  <span key={i} className="cs-archive-char">
                    {ch}
                  </span>
                ))}
              </span>
            </h1>
            <span className="cs-archive-count" aria-hidden="true">
              {count.split("").map((ch, i) => (
                <span key={i} className="cs-archive-char">
                  {ch}
                </span>
              ))}
            </span>
            {/* Diagonal arrow (↘) — Lusion's projects-title mark. */}
            <svg
              className="cs-archive-arrow"
              viewBox="0 0 38 38"
              fill="none"
              aria-hidden="true"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="m2 2 34 34m0 0V6.046M36 36H6.046"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Grid — the shared Lusion-grammar cards, full population. */}
      <section data-line-anchor="grid" className="pb-16 sm:pb-24">
        <div className="container-px">
          <h2 className="sr-only">{isEn ? "Case studies" : "Case study"}</h2>
          <WorkGrid
            studies={archiveStudies()}
            isEn={isEn}
            planesLive={planesLive}
          />
        </div>
      </section>

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

      {/* Closing CTA — overflow-x-clip: the decorative 700px glow hangs past
          the right edge on narrow viewports and would drag the document
          (measured 190px at 320w); clip the horizontal escape only. */}
      <section data-line-anchor="final-cta" data-snap className="section-lg relative overflow-x-clip">
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
              <Button
                asChild
                size="lg"
                className={cn(
                  "px-10 py-7 text-base font-semibold rounded-full",
                  CTA_FLUID_SM,
                )}
              >
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
