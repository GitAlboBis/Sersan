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
 * to those rects and flips featuredStore.planesLive — mirrored PER CARD into
 * data-plane-owned (only cards with a depth twin yield their DOM still;
 * globals.css fades it under the plane). Hover intent is published to
 * featuredStore.hoverId for the shader springs, independent of the DOM
 * letter tweens.
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

  /* Whether the plane owns the media at ENTRANCE-FIRE time (the flag can
     flip between mount and the card scrolling into view — the mount-keyed
     effect below must read the live value, never a stale closure). */
  const planeOwnedRef = useRef(planeOwned);
  planeOwnedRef.current = planeOwned;

  /* Entrance choreography — MOUNT-KEYED and idempotent (ANALISI_LUSION_WORK
     §2.4). Faithful split: the DOM card never slides — the TITLE rolls,
     line-1 decodes (LabelScrambler), and the MEDIA slide belongs to the
     WebGL plane when one owns the box; the DOM INNER media (still img /
     logo panel) plays the slide only on the fallback path. The roll is a
     fromTo fired by a once-trigger, so no later effect cycle can strand the
     columns in the hidden pose. useLayoutEffect so hidden poses land before
     first paint. */
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
      ScrollTrigger.create({
        trigger: card,
        start: "top 88%",
        once: true,
        onEnter: () => {
          /* DOM media slide — fallback path only, and on the INNER element
             so the media BOX (the plane's sync rect + the flip flight's
             media rect) never carries a transform. */
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
        },
      });
    }, card);
    return () => ctx.revert();
  }, [side, study.id]);

  /* Hover — fine pointer only (matchMedia guard, not pointerType: a
     mouse+touchscreen laptop must keep the mouse path). UNIDIRECTIONAL:
     pointer events only WRITE featuredStore.hoverId; the letter/arrow tweens
     play from a store SUBSCRIPTION. This matters because pointerleave never
     fires when a card scrolls out from under a stationary pointer (measured
     live: stuck hover left the shader's focus target keyed to a pointer far
     outside the card, smearing the plane) — the section's scroll validator
     clears the store, and the subscription plays the leave tween no matter
     which writer cleared it. */
  useEffect(() => {
    const card = cardRef.current;
    if (!card || prefersReducedMotion()) return;
    const cols = Array.from(card.querySelectorAll<HTMLElement>("[data-fw-col]"));
    const icon = card.querySelector<HTMLElement>("[data-fw-icon]");
    const lusion =
      CustomEase.get("lusion") ?? CustomEase.create("lusion", "0.35, 0, 0, 1");
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

  /* STALE-HOVER VALIDATOR + MEASURE EPOCH.
     (a) pointerleave never fires when a card scrolls out from under a
     stationary pointer — on every scroll frame, if the store still claims a
     hover, re-test the last pointer position against that card's rect and
     clear the claim when it left. The per-card store subscription then
     plays the leave tween.
     (b) The WebGL planes measure document rects; pin-spacer heights above
     this section re-resolve on ScrollTrigger refresh AFTER plain resize
     events, so every refresh bumps the store's measure epoch for them. */
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
      const card = sectionRef.current?.querySelector<HTMLElement>(
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
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      ScrollTrigger.removeEventListener("refresh", bump);
    };
  }, []);

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
