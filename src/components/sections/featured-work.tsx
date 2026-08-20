"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { SectionHeading } from "@/components/ui/section-heading";
import { caseStudies, type CaseStudy } from "@/data/case-studies";
import { useLanguage } from "@/components/language-provider";
import { useFlipSource } from "@/lib/use-flip-source";
import { useFeaturedStore } from "@/webgl/store/featuredStore";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, CustomEase);

/**
 * FeaturedWork — the home Work section on the Lusion work-grid grammar
 * (ANALISI_LUSION_WORK.md §2; replaces the sticky horizontal rail,
 * work-section refactor 2026-08-20). Two-column grid of large media cards:
 *
 *   media (65% aspect, r15) ·· line-1 eyebrow (LabelScrambler decodes it —
 *   the delegated observer keys on `.eyebrow`) ·· line-2 rolling title.
 *
 * MOTION (all GSAP, armed only without prefers-reduced-motion — the SSR
 * resting state is the complete reduced-motion experience):
 *   - ENTRANCE: per-card ScrollTrigger (once). The card slides in from its
 *     own column's side (±8vw, ±3.5°, expo.out ~1.5s — Lusion slides the
 *     MESH; we slide the card) while the title columns roll down
 *     yPercent −300 → 0 (expo.inOut 1.25s) with the center-out cosine
 *     stagger (§2.4: delay_i = (cos(fit(i,0,n−1,π/2,3π/2))+1)·0.0625s).
 *   - HOVER (fine pointer): letter columns shift +1.5em with ease.lusion
 *     (CustomEase of --ease-lusion) staggered 4ms from the END (§2.3's
 *     (len+1−i)/100 offset over a 2.5/s ratio), the accent arrow slides in
 *     from the left clip, and the still unzooms via the CSS pair in
 *     globals.css (.fw-media rules). Coarse pointers keep the resting pose.
 *
 * TITLE MARKUP: each letter is a flex column of FOUR copies inside a 1em
 * overflow clip (Lusion's exact DOM). Columns are aria-hidden; the h3
 * carries aria-label with the real client name, so AT reads one clean
 * string. SSR ships the columns at transform:none (letter #1 visible) —
 * the roll is armed client-side only, so no-JS keeps a readable grid.
 *
 * WEBGL HANDOFF: the media box carries data-featured-media={id}; on the
 * WebGPU-flag full-tier path FeaturedWorkPlanes syncs depth-parallax planes
 * to those rects and flips featuredStore.planesLive — the grid mirrors it
 * into data-planes-live, and globals.css fades the DOM stills out under the
 * planes. Hover intent is published to featuredStore.hoverId for the shader
 * (focus/zoom springs), independent of the DOM letter tweens.
 *
 * CLICK: useFlipSource arms the zoom-to-fullscreen flight (data-flip-source
 * + data-rail-media contracts, same as the archive grid) — the DOM Flip
 * flight stands in for Lusion's in-shader zoom.
 */

const INDUSTRY_COLOR: Record<CaseStudy["industry"], string> = {
  FinTech: "text-[hsl(var(--accent))]",
  Healthcare: "text-[hsl(160_60%_60%)]",
  Aerospace: "text-[hsl(260_60%_70%)]",
  "Public Sector": "text-[hsl(200_30%_70%)]",
  Industrial: "text-[hsl(30_70%_65%)]",
  Energy: "text-[hsl(140_50%_60%)]",
  Agritech: "text-[hsl(100_45%_60%)]",
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Lusion roll: center-out cosine stagger (§2.4). Seconds of delay for
 *  column i of n — center columns lead, edges trail by ~62ms. */
function rollDelay(i: number, n: number): number {
  if (n <= 1) return 0;
  const phase = Math.PI / 2 + (i / (n - 1)) * Math.PI; // π/2 → 3π/2
  return (Math.cos(phase) + 1) * 0.0625;
}

/**
 * RollingTitle — the 4-copy letter-column title (client name). Pure markup;
 * FeaturedCard's effects drive the transforms via [data-fw-col] queries.
 */
function RollingTitle({ text }: { text: string }) {
  const cols = useMemo(() => text.split(""), [text]);
  return (
    <h3 aria-label={text} className="fw-title font-display text-ink">
      {/* Arrow parked outside the clip; the hover tween slides it in. */}
      <svg
        className="fw-title-icon"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        data-fw-icon=""
      >
        <path
          d="M4 12h14m0 0-6-6m6 6-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="fw-title-inner" aria-hidden="true">
        {cols.map((ch, i) =>
          ch === " " ? (
            <span key={i} className="fw-col fw-col-space" />
          ) : (
            <span key={i} className="fw-col" data-fw-col="">
              <span>{ch}</span>
              <span>{ch}</span>
              <span>{ch}</span>
              <span>{ch}</span>
            </span>
          ),
        )}
      </span>
    </h3>
  );
}

function FeaturedCard({
  study,
  index,
  isEn,
  planeOwned,
}: {
  study: CaseStudy;
  index: number;
  isEn: boolean;
  /** True when the WebGL depth-parallax plane owns this card's media box. */
  planeOwned: boolean;
}) {
  const cardRef = useRef<HTMLAnchorElement | null>(null);
  const onFlip = useFlipSource(study.id, study.previewImage);
  const engagement = isEn ? study.engagement : study.engagementIt;
  const domain = isEn ? study.domain : study.domainIt;
  const side = index % 2 ? 1 : -1; // right column enters from the right

  /* Entrance + hover choreography — armed once per mount, motion-gated.
     Faithful split (ANALISI_LUSION_WORK.md §2.4): the DOM card itself never
     slides — the TITLE rolls (here), line-1 decodes (LabelScrambler), and
     the MEDIA entrance belongs to the WebGL plane (slide + mask grow).
     Only on the DOM-fallback path (no plane for this card) does the media
     box play a DOM version of the slide. useLayoutEffect so hidden poses
     land before first paint. */
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || prefersReducedMotion()) return;
    const cols = Array.from(card.querySelectorAll<HTMLElement>("[data-fw-col]"));
    const icon = card.querySelector<HTMLElement>("[data-fw-icon]");
    const media = card.querySelector<HTMLElement>(".fw-media");
    const n = cols.length;
    const lusion = CustomEase.get("lusion") ?? CustomEase.create("lusion", "0.35, 0, 0, 1");
    /* HOVER — fine pointer only (matchMedia guard, not pointerType: a
       mouse+touchscreen laptop must keep the mouse path). */
    const fine = window.matchMedia("(pointer: fine)");
    const em = () =>
      parseFloat(getComputedStyle(card.querySelector(".fw-title")!).fontSize);
    const enter = () => {
      if (!fine.matches) return;
      useFeaturedStore.getState().setHover(study.id);
      gsap.to(cols, {
        x: () => em() * 1.5,
        duration: 0.55,
        ease: lusion,
        stagger: { each: 0.004, from: "end" },
        overwrite: "auto",
      });
      if (icon)
        gsap.to(icon, { x: () => em(), duration: 0.55, ease: lusion, overwrite: "auto" });
    };
    const leave = () => {
      useFeaturedStore.getState().clearHover(study.id);
      gsap.to(cols, {
        x: 0,
        duration: 0.55,
        ease: lusion,
        stagger: { each: 0.004, from: "end" },
        overwrite: "auto",
      });
      if (icon) gsap.to(icon, { x: 0, duration: 0.55, ease: lusion, overwrite: "auto" });
    };
    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointerleave", leave);

    const ctx = gsap.context(() => {
      /* Title roll pose. −400%: one slot ABOVE the top copy, so the 1em clip
         is EMPTY at rest and the roll streams all four copies through (−300
         would already show copy #4 parked in the window). `entered` dataset
         guards a planeOwned flip from replaying a finished entrance. */
      const entered = card.dataset.fwEntered === "1";
      if (!entered) gsap.set(cols, { yPercent: -400 });
      /* DOM-fallback media slide — only when no plane owns the box (the
         plane path keeps the DOM box untransformed so the WebGL sync rects
         stay truthful; the plane plays the slide itself). */
      const slideMedia = media && !planeOwned && !entered;
      if (slideMedia)
        gsap.set(media, {
          x: () => side * window.innerWidth * 0.08,
          rotation: side * 3.5,
          autoAlpha: 0,
        });
      if (!entered)
        ScrollTrigger.create({
          trigger: card,
          start: "top 88%",
          once: true,
          onEnter: () => {
            card.dataset.fwEntered = "1";
            if (slideMedia)
              gsap.to(media, {
                x: 0,
                rotation: 0,
                autoAlpha: 1,
                duration: 1.5,
                ease: "expo.out",
                clearProps: "transform,opacity,visibility",
              });
            cols.forEach((col, i) => {
              gsap.to(col, {
                yPercent: 0,
                duration: 1.25,
                ease: "expo.inOut",
                delay: 0.15 + rollDelay(i, n),
              });
            });
          },
        });
    }, card);

    return () => {
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("pointerleave", leave);
      useFeaturedStore.getState().clearHover(study.id);
      ctx.revert();
    };
  }, [side, study.id, planeOwned]);

  const hasStill = Boolean(study.previewImage);

  return (
    <Link
      ref={cardRef}
      href={`/case-studies/${study.id}`}
      className={cn(
        "fw-card group",
        index >= 2 ? "mt-16 md:mt-24" : index > 0 ? "mt-16 md:mt-0" : "",
      )}
      aria-label={`${study.client}, ${engagement}`}
      data-cursor="view"
      data-flip-source={study.id}
      onClick={onFlip}
    >
      {/* Media box — the WebGL plane's sync target AND the flip flight's
          media rect (data-rail-media, the overlay's generic contract).
          data-plane-owned fades the DOM still under the live plane
          (globals.css) — per-card, so logo cards keep their DOM panel. */}
      <div
        className="fw-media"
        data-featured-media={study.id}
        data-plane-owned={planeOwned ? "true" : undefined}
        data-rail-media=""
      >
        {hasStill ? (
          <img
            src={study.previewImage}
            alt=""
            className="fw-still"
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          study.logoImage && (
            <span className="fw-logo-panel" aria-hidden="true">
              <img src={study.logoImage} alt="" loading="lazy" decoding="async" />
            </span>
          )
        )}
      </div>

      {/* line-1: mono categories eyebrow. `.eyebrow` opts into the site-wide
          LabelScrambler decode on first view — Lusion's §2.4 scramble is the
          same idiom, so no local wiring. */}
      <p className={cn("eyebrow fw-line-1", INDUSTRY_COLOR[study.industry])}>
        {domain}
      </p>

      {/* line-2: the rolling title. */}
      <RollingTitle text={study.client} />
    </Link>
  );
}

export default function FeaturedWork() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const sectionRef = useRef<HTMLElement | null>(null);

  const featured = useMemo(
    () =>
      caseStudies
        .filter((s) => typeof s.featured === "number")
        .sort((a, b) => (a.featured ?? 0) - (b.featured ?? 0)),
    [],
  );

  /* Mirror the WebGL ownership flag into the DOM so globals.css can fade the
     stills under the planes. Subscribed, not sampled: the planes mount after
     the backend resolves. */
  const [planesLive, setPlanesLive] = useState(false);
  useEffect(
    () =>
      useFeaturedStore.subscribe((s) => {
        setPlanesLive(s.planesLive);
      }),
    [],
  );

  return (
    <section
      ref={sectionRef}
      id="work"
      className="section relative"
      aria-label={isEn ? "Selected engagements" : "Incarichi selezionati"}
    >
      <div className="container-px mb-14 flex flex-col gap-4 sm:flex-row sm:gap-6 sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow={isEn ? "Selected work" : "Lavori selezionati"}
          title={
            isEn ? (
              <>
                Engineering you can{" "}
                <span className="font-display italic text-ink">name.</span>
              </>
            ) : (
              <>
                Ingegneria che puoi{" "}
                <span className="font-display italic text-ink">nominare.</span>
              </>
            )
          }
          description={
            isEn
              ? `${caseStudies.length} engagements across FinTech, Healthcare, Aerospace, Public Sector, Industrial, Energy, and Agritech. Sersan-led builds running live in production. No anonymised stand-ins.`
              : `${caseStudies.length} ingaggi tra FinTech, Healthcare, Aerospace, Settore Pubblico, Industriale, Energia e Agritech. Build guidate da Sersan live in produzione. Nessun caso anonimizzato di facciata.`
          }
        />
        <Link
          href="/case-studies"
          className="group inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-mono text-[11px] tracking-[0.16em] uppercase text-ink-mute transition-colors hover:text-ink"
        >
          {isEn ? "Full archive" : "Archivio completo"}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <div className="container-px">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[2vw]">
          {featured.map((study, i) => (
            <FeaturedCard
              key={study.id}
              study={study}
              index={i}
              isEn={isEn}
              planeOwned={planesLive && Boolean(study.depthImage)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
