"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { caseStudies, type CaseStudy } from "@/data/case-studies";
import { useFlipSource } from "@/lib/use-flip-source";
import { useFeaturedStore } from "@/webgl/store/featuredStore";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, CustomEase);

/**
 * WorkCard — THE Lusion-grammar project card (ANALISI_LUSION_WORK.md §2),
 * shared verbatim between the home Featured Work grid and the /case-studies
 * archive — exactly as lusion.co's home "Featured Work" and /projects render
 * one `.project-item`. Extracted from featured-work.tsx when the archive
 * adopted the grammar (2026-08-20 round 2).
 *
 * Anatomy: media box (65% aspect, r15; depth-parallax plane target via
 * data-featured-media) → mono category eyebrow (LabelScrambler decodes any
 * `.eyebrow`) → RollingTitle (4-copy letter columns in a 1em clip).
 *
 * MOTION (armed only without prefers-reduced-motion; the SSR resting state
 * is the complete reduced-motion experience):
 *  - ENTRANCE (once, mount-keyed + idempotent): title columns roll
 *    yPercent −400 → 0 (expo.inOut 1.25s, center-out cosine stagger); on
 *    the DOM-fallback path the INNER media slides in from the card's own
 *    column side (±8vw, ±3.5°, expo.out) — plane-owned cards leave the
 *    slide to the WebGL plane, and the media BOX never transforms (it is
 *    the plane's sync rect and the flip flight's media rect).
 *  - HOVER (fine pointer): UNIDIRECTIONAL — pointer events only write
 *    featuredStore.hoverId; the 1.5em letter shift + arrow slide-in play
 *    from a store subscription (so the section's stale-hover validator can
 *    clear a claim and the leave still animates). Ease: CustomEase "lusion"
 *    (--ease-lusion). The site-wide AudioTriggers hover tick covers the
 *    card via its [data-cursor] opt-in — Lusion's "focus" sample analogue.
 *  - CLICK: useFlipSource arms the zoom flight (data-flip-source +
 *    data-rail-media contracts).
 */

export const INDUSTRY_COLOR: Record<CaseStudy["industry"], string> = {
  FinTech: "text-[hsl(var(--accent))]",
  Healthcare: "text-[hsl(160_60%_60%)]",
  Aerospace: "text-[hsl(260_60%_70%)]",
  "Public Sector": "text-[hsl(200_30%_70%)]",
  Industrial: "text-[hsl(30_70%_65%)]",
  Energy: "text-[hsl(140_50%_60%)]",
  Agritech: "text-[hsl(100_45%_60%)]",
};

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Lusion roll: center-out cosine stagger (§2.4). Seconds of delay for
 *  column i of n — center columns lead, edges trail by ~62ms. */
function rollDelay(i: number, n: number): number {
  if (n <= 1) return 0;
  const phase = Math.PI / 2 + (i / (n - 1)) * Math.PI; // π/2 → 3π/2
  return (Math.cos(phase) + 1) * 0.0625;
}

/** The house ease as a shared GSAP CustomEase (created once, cached). */
export function lusionEase() {
  return CustomEase.get("lusion") ?? CustomEase.create("lusion", "0.35, 0, 0, 1");
}

/**
 * RollingTitle — the 4-copy letter-column title. Pure markup; WorkCard's
 * effects drive the transforms via [data-fw-col] queries. Columns are
 * aria-hidden; the h3 aria-label carries the clean client name.
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

export function WorkCard({
  study,
  index,
  isEn,
  planeOwned,
  className,
}: {
  study: CaseStudy;
  index: number;
  isEn: boolean;
  /** True when the WebGL depth-parallax plane owns this card's media box. */
  planeOwned: boolean;
  className?: string;
}) {
  const cardRef = useRef<HTMLAnchorElement | null>(null);
  const onFlip = useFlipSource(study.id, study.previewImage);
  const engagement = isEn ? study.engagement : study.engagementIt;
  const domain = isEn ? study.domain : study.domainIt;
  const side = index % 2 ? 1 : -1; // right column enters from the right

  /* Live plane-ownership for the ENTRANCE-FIRE moment (the flag can flip
     between mount and the card scrolling into view). */
  const planeOwnedRef = useRef(planeOwned);
  planeOwnedRef.current = planeOwned;

  /* Ownership handover: when the plane claims the box AFTER a DOM slide
     already started (planesLive resolves async — an in-view card at mount
     fires its entrance on the DOM path), the in-flight tween would strand
     the still mid-pose with inline opacity/transform that beat the CSS
     hide (measured live: stills frozen at 0.625 ghosting over the plane).
     Kill and clear — CSS then owns the fade to 0. */
  useEffect(() => {
    if (!planeOwned) return;
    const inner = cardRef.current?.querySelector<HTMLElement>(
      ".fw-media > img.fw-still",
    );
    if (!inner) return;
    gsap.killTweensOf(inner);
    gsap.set(inner, { clearProps: "transform,opacity,visibility" });
  }, [planeOwned]);

  /* Entrance — mount-keyed and idempotent (see header). */
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || prefersReducedMotion()) return;
    const cols = Array.from(card.querySelectorAll<HTMLElement>("[data-fw-col]"));
    const inner = card.querySelector<HTMLElement>(
      ".fw-media > img.fw-still, .fw-media > .fw-logo-panel",
    );
    const n = cols.length;

    const ctx = gsap.context(() => {
      /* −400%: one slot ABOVE the top copy, so the 1em clip is EMPTY at
         rest and the roll streams all four copies through. */
      gsap.set(cols, { yPercent: -400 });
      const play = () => {
        if (inner && !planeOwnedRef.current)
          gsap.fromTo(
            inner,
            { x: side * window.innerWidth * 0.08, rotation: side * 3.5, autoAlpha: 0 },
            {
              x: 0,
              rotation: 0,
              autoAlpha: 1,
              duration: 1.5,
              ease: "expo.out",
              clearProps: "transform,opacity,visibility",
            },
          );
        cols.forEach((col, i) => {
          gsap.fromTo(
            col,
            { yPercent: -400 },
            {
              yPercent: 0,
              duration: 1.25,
              ease: "expo.inOut",
              delay: 0.15 + rollDelay(i, n),
              overwrite: "auto",
            },
          );
        });
      };
      const st = ScrollTrigger.create({
        trigger: card,
        start: "top 88%",
        once: true,
        onEnter: play,
      });
      /* Already past the start at mount (page-top cards, deep landings):
         on this site a freshly created trigger does not evaluate until the
         first real scroll (measured live on the archive header), so fire
         the entrance directly and retire the trigger. */
      if (card.getBoundingClientRect().top < window.innerHeight * 0.88) {
        st.kill();
        play();
      }
    }, card);
    return () => ctx.revert();
  }, [side, study.id]);

  /* Hover — store-driven (see header). */
  useEffect(() => {
    const card = cardRef.current;
    if (!card || prefersReducedMotion()) return;
    const cols = Array.from(card.querySelectorAll<HTMLElement>("[data-fw-col]"));
    const icon = card.querySelector<HTMLElement>("[data-fw-icon]");
    const lusion = lusionEase();
    const fine = window.matchMedia("(pointer: fine)");
    const em = () =>
      parseFloat(getComputedStyle(card.querySelector(".fw-title")!).fontSize);
    const play = (on: boolean) => {
      gsap.to(cols, {
        x: on ? () => em() * 1.5 : 0,
        duration: 0.55,
        ease: lusion,
        stagger: { each: 0.004, from: "end" },
        overwrite: "auto",
      });
      if (icon)
        gsap.to(icon, {
          x: on ? () => em() : 0,
          duration: 0.55,
          ease: lusion,
          overwrite: "auto",
        });
    };
    let wasHover = false;
    const unsub = useFeaturedStore.subscribe((s) => {
      const isHover = s.hoverId === study.id;
      if (isHover !== wasHover) {
        wasHover = isHover;
        play(isHover);
      }
    });
    const enter = () => {
      if (fine.matches) useFeaturedStore.getState().setHover(study.id);
    };
    const leave = () => useFeaturedStore.getState().clearHover(study.id);
    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointerleave", leave);
    return () => {
      unsub();
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("pointerleave", leave);
      useFeaturedStore.getState().clearHover(study.id);
    };
  }, [study.id]);

  const hasStill = Boolean(study.previewImage);

  return (
    <Link
      ref={cardRef}
      href={`/case-studies/${study.id}`}
      className={cn("fw-card group", className)}
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
          /* eslint-disable-next-line @next/next/no-img-element */
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={study.logoImage} alt="" loading="lazy" decoding="async" />
            </span>
          )
        )}
      </div>

      {/* line-1: mono categories eyebrow — `.eyebrow` opts into the
          site-wide LabelScrambler decode (Lusion's §2.4 scramble idiom). */}
      <p className={cn("eyebrow fw-line-1", INDUSTRY_COLOR[study.industry])}>
        {domain}
      </p>

      {/* line-2: the rolling title. */}
      <RollingTitle text={study.client} />
    </Link>
  );
}

/**
 * WorkGrid — the shared two-column grid + stale-hover validator wiring.
 * `studies` picks the population (home: featured order; archive: all).
 * Row rhythm: rows 2+ get extra top air (Lusion's nth-child(n+3) 10em, at
 * our scale). The validator + ScrollTrigger-refresh measure bump live here
 * so BOTH grids carry them without duplication.
 */
export function WorkGrid({
  studies,
  isEn,
  planesLive,
}: {
  studies: CaseStudy[];
  isEn: boolean;
  planesLive: boolean;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);

  /* STALE-HOVER VALIDATOR + MEASURE EPOCH (see fix commit b9b3318):
     pointerleave never fires when a card scrolls out from under a
     stationary pointer — re-test the claim each scroll frame; and bump the
     planes' measure epoch on every ScrollTrigger refresh (pin spacers
     above the grid re-resolve after plain resize events). */
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let px = -1;
    let py = -1;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
    };
    const validate = () => {
      raf = 0;
      const { hoverId, clearHover } = useFeaturedStore.getState();
      if (!hoverId || px < 0) return;
      const card = gridRef.current?.querySelector<HTMLElement>(
        `[data-flip-source="${hoverId}"]`,
      );
      if (!card) return clearHover(hoverId);
      const r = card.getBoundingClientRect();
      if (px < r.left || px > r.right || py < r.top || py > r.bottom)
        clearHover(hoverId);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(validate);
    };
    const bump = () => useFeaturedStore.getState().bumpMeasure();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    ScrollTrigger.addEventListener("refresh", bump);
    /* Route-change coverage: FeaturedWorkPlanes stays MOUNTED across the
       home ↔ archive swap (both routes render it at the same JSX position),
       so no island-side remount re-measures — the GRID announces its own
       mount (this effect runs after the cards commit, rects are live) and
       its teardown. */
    bump();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      ScrollTrigger.removeEventListener("refresh", bump);
      bump();
    };
  }, []);

  return (
    <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-x-[2vw]">
      {studies.map((study, i) => (
        <WorkCard
          key={study.id}
          study={study}
          index={i}
          isEn={isEn}
          planeOwned={planesLive && Boolean(study.depthImage)}
          className={i >= 2 ? "mt-16 md:mt-24" : i > 0 ? "mt-16 md:mt-0" : ""}
        />
      ))}
    </div>
  );
}

/** Reactive planesLive mirror — shared by both grid hosts. */
export function usePlanesLive() {
  const planesLive = useFeaturedStore((s) => s.planesLive);
  return planesLive;
}

/** All studies in archive order (data order = the curated sequence). */
export function archiveStudies(): CaseStudy[] {
  return caseStudies;
}

/** Home selection: `featured` order. */
export function featuredStudies(): CaseStudy[] {
  return caseStudies
    .filter((s) => typeof s.featured === "number")
    .sort((a, b) => (a.featured ?? 0) - (b.featured ?? 0));
}
