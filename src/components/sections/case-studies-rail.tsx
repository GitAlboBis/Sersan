"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SectionHeading } from "@/components/ui/section-heading";
import { caseStudies, type CaseStudy } from "@/data/case-studies";
import { useLanguage } from "@/components/language-provider";
import { useRailStore } from "@/webgl/store/railStore";
import { getLenis } from "@/lib/lenis-singleton";
import { CardImageDistort } from "@/components/fx/card-image-distort";
import { SeeMorePortal } from "@/components/fx/see-more-portal";
import { useFlipSource } from "@/lib/use-flip-source";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * CaseStudiesRail — restyle step 2 part B: the home "Work" section as a
 * sticky horizontal rail of ALL case studies + one "In development" card.
 *
 * MECHANICS (research/horizontal-rail-pattern.md — binding):
 *   - CSS `position: sticky` pins the viewport frame; ScrollTrigger only
 *     scrubs `translateX`. NO `pin:` (a pin-spacer would re-parent the section
 *     and break every [data-line-anchor] measurement — same rule as the
 *     cinematic spine), NO scrub tween (Lenis already smooths the scroll the
 *     progress derives from), NO `scroller` option (the provider's
 *     scrollerProxy covers it).
 *   - Section height = 100vh + travel, travel = railWidth − viewportWidth
 *     (Faure's limit formula), set in px by measure(). 1 scrolled px = 1
 *     translated px. `invalidateOnRefresh` + `onRefreshInit: measure` make
 *     every ScrollTrigger.refresh() (spine bursts, provider resize debounce)
 *     self-heal; the one refresh the rail owns is the one-shot
 *     document.fonts.ready (the provider deliberately never refreshes on "/").
 *   - Card widths are fixed in rem (never content/font-derived) so a font
 *     swap cannot change scrollWidth → document height → downstream anchors.
 *
 * MODES:
 *   - pinned (desktop: fine pointer, >768px, no reduced-motion — SSR default
 *     so the cards are in the initial HTML): scrub as above. WebGL planes
 *     (webgl/RailPlanes) sync to [data-rail-card] rects through railStore.
 *     Note: pinning is a DOM/Lenis feature, so a no-WebGL desktop still gets
 *     the pinned rail — it simply has no planes (tier gate lives in Scene.tsx).
 *   - native (mobile / coarse pointer / prefers-reduced-motion): no pinning,
 *     a plain overflow-x snap scroller. data-lenis-prevent keeps Lenis off it.
 *
 * KEYBOARD: cards are real links in DOM order. In pinned mode, focusing an
 * off-screen card converts to the equivalent VERTICAL scroll position (the
 * browser's auto-scroll of the overflow:hidden frame is undone, then Lenis
 * drives the page so the scrub brings the card into view through the same
 * path as wheel input). Visible cards don't move (click-focus stays calm).
 *
 * The DOM cards keep a SEMI-TRANSPARENT background on purpose: the WebGL
 * canvas sits BEHIND the page (z-0), so the planes paint through the card
 * body. Without planes (lite/off tier, flag off) the page navy shows instead.
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

/** Shared card chrome: translucent over the WebGL plane (see header note). */
const CARD_CLASS =
  "group relative flex h-[clamp(19rem,52vh,26rem)] flex-col rounded-lg border border-[hsl(var(--rule))] bg-[hsl(216_28%_10%/0.45)] p-6 sm:p-7 transition-colors duration-300 hover:border-[hsl(var(--accent)/0.45)] focus-visible:outline-none focus-visible:border-[hsl(var(--accent)/0.7)]";

/** Home rail shows only the marquee studies (SphereNode → Apple UK). */
const RAIL_LIMIT = 6;

function StudyCard({
  study,
  index,
  total,
  isEn,
  onHover,
}: {
  study: CaseStudy;
  index: number;
  total: number;
  isEn: boolean;
  onHover: (index: number, target: number) => void;
}) {
  const metric = study.metrics[0];
  const engagement = isEn ? study.engagement : study.engagementIt;
  // The three SerSan builds (SphereNode, Quantex, Terra Noa) ship a product
  // preview → reuse the exact grid treatment: the Lusion-style hover-reveal
  // glitch image fades in BEHIND the text under a navy scrim. CardImageDistort
  // and its reveal CSS key off the `.card-steel` ancestor, so the distort cards
  // carry `card-steel` for the hook only — `data-no-tilt` keeps the global
  // CardTiltController from transforming the box (RailPlanes registration), and
  // the scoped `rail-card-distort` override (globals.css) restores the rail's
  // translucent chrome so the planes still paint through. The card box (fixed
  // w/h from CARD_CLASS / the <li>) is unchanged; the media is an absolute
  // inset-0 overlay clipped to the card radius.
  const hasPreview = Boolean(study.previewImage);
  // Hook called unconditionally (rules of hooks); the handler/attr are only
  // attached for cards WITH a preview so the other studies navigate as today.
  const onFlip = useFlipSource(study.id, study.previewImage);
  return (
    <Link
      href={`/case-studies/${study.id}`}
      className={
        hasPreview ? `${CARD_CLASS} card-steel rail-card-distort` : CARD_CLASS
      }
      {...(hasPreview
        ? { "data-no-tilt": "", onClick: onFlip, "data-flip-source": study.id }
        : {})}
      onPointerEnter={() => onHover(index, 1)}
      onPointerLeave={() => onHover(index, 0)}
      onFocus={() => onHover(index, 1)}
      onBlur={() => onHover(index, 0)}
    >
      {study.previewImage && (
        <CardImageDistort
          src={study.previewImage}
          alt={`${study.client} product preview`}
        />
      )}
      {/* Text content sits ABOVE the media layer (mirrors the grid's
          `relative z-10` wrapper); at rest the metric/text card reads as today. */}
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-[hsl(var(--rule)/0.7)]">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-dim tabular-nums">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <span
            className={`font-mono text-[10px] tracking-[0.16em] uppercase ${INDUSTRY_COLOR[study.industry]}`}
          >
            {study.industry}
          </span>
        </div>

        {/* The big mono metric — the card's proof, front and center. */}
        <div className="flex flex-1 flex-col justify-center gap-2.5 py-6">
          <span className="font-mono text-[1.9rem] sm:text-[2.2rem] leading-none tracking-tight tabular-nums text-ink transition-colors duration-300 group-hover:text-[hsl(var(--accent))]">
            {metric?.value}
          </span>
          {metric ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-mute leading-snug line-clamp-2 max-w-[18rem]">
              {isEn ? metric.label : metric.labelIt}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-[hsl(var(--rule)/0.7)]">
          <h3 className="flex items-start justify-between gap-2 font-display text-[1.3rem] text-ink leading-tight">
            {study.client}
            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-ink-mute opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </h3>
          <p className="font-mono text-[11.5px] text-ink-mute leading-relaxed line-clamp-2">
            {engagement}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function CaseStudiesRail() {
  const { language } = useLanguage();
  const isEn = language === "en";

  // SSR default = pinned (desktop) layout so all card links are in the
  // initial HTML — same convention as the cinematic spine.
  const [mode, setMode] = useState<"pinned" | "native">("pinned");
  const [detected, setDetected] = useState(false);

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(mobile || coarse || reduced ? "native" : "pinned");
    setDetected(true);
  }, []);

  // ScrollTrigger scrub — pinned mode only, after viewport detection settles.
  useEffect(() => {
    if (!detected || mode !== "pinned") return;
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const rail = railRef.current;
    if (!section || !sticky || !rail) return;

    const store = useRailStore.getState();
    const setX = gsap.quickSetter(rail, "x", "px");
    let travel = 0;

    const measure = () => {
      // Faure's limit formula; the rail is w-max so scrollWidth == full width.
      travel = Math.max(0, rail.scrollWidth - window.innerWidth);
      section.style.height = `${window.innerHeight + travel}px`;
      const secTop = section.getBoundingClientRect().top + window.scrollY;
      store.setLayout(travel, secTop);
      // RailPlanes re-reads card rects on this bump (post-refresh layout).
      store.bumpMeasure();
    };
    measure();

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom", // progress hits 1 exactly when sticky releases
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      onUpdate: (self) => {
        const x = travel * self.progress;
        setX(-x);
        store.setTrack(x, self.progress, self.getVelocity());
      },
    });
    // Sync the parked state immediately (covers a reload mid-page where the
    // browser restores a scroll position inside the rail's range).
    setX(-travel * st.progress);
    store.setTrack(travel * st.progress, st.progress, 0);
    store.setPinned(true);

    // One-shot late refresh once webfonts land: the provider deliberately does
    // NOT refresh ScrollTrigger on "/" (the spine owns its refresh bursts), so
    // the rail covers its own font-driven header reflow (caveat 2).
    let fontsCancelled = false;
    document.fonts?.ready
      .then(() => {
        if (!fontsCancelled) ScrollTrigger.refresh();
      })
      .catch(() => {});

    // Keyboard: convert focus on an off-screen card into the equivalent
    // vertical scroll position (see header). focusin bubbles from the links.
    const onFocusIn = (e: FocusEvent) => {
      const card = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-rail-card]",
      );
      if (!card) return;
      // Undo the browser's auto-scroll of the overflow:hidden sticky frame
      // BEFORE reading the card rect, or every downstream measure is shifted.
      sticky.scrollLeft = 0;
      const vw = window.innerWidth;
      const rect = card.getBoundingClientRect();
      // Already fully visible (e.g. click-focus) → don't move the page.
      if (rect.left >= 0 && rect.right <= vw) return;
      const { trackX, travel: t, secTop } = useRailStore.getState();
      const baseCenter = rect.left + trackX + rect.width / 2; // at trackX = 0
      const desired = Math.min(Math.max(baseCenter - vw / 2, 0), t);
      const targetY = secTop + desired; // 1px scrolled = 1px translated
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(targetY, { duration: 0.6 });
      else window.scrollTo({ top: targetY });
    };
    rail.addEventListener("focusin", onFocusIn);

    return () => {
      fontsCancelled = true;
      rail.removeEventListener("focusin", onFocusIn);
      st.kill();
      gsap.set(rail, { x: 0 });
      section.style.height = "";
      // WebGL layer must never read a stale rail after unmount (store
      // survives route changes).
      useRailStore.getState().reset();
    };
  }, [detected, mode]);

  const onHover = (index: number, target: number) =>
    useRailStore.getState().setHover(index, target);

  // Counter now reads "01/13"…"06/13" — the six shown studies against the full
  // archive count, teasing the rest via the SeeMorePortal closing slot.
  const total = caseStudies.length;

  const heading = (
    <div className="container-px flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
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
            ? `${caseStudies.length} engagements across FinTech, Healthcare, Aerospace, Public Sector, Industrial, Energy, and Agritech. Three SerSan-led builds running live in production. Senior-delivery engagements at tier-1 institutions and operating companies. No anonymised stand-ins.`
            : `${caseStudies.length} ingaggi tra FinTech, Healthcare, Aerospace, Settore Pubblico, Industriale, Energia e Agritech. Tre build guidate da SerSan live in produzione. Ingaggi di delivery senior presso istituzioni Tier-1 e aziende operative. Nessun caso anonimizzato di facciata.`
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
  );

  const cards = (liClass: string) => (
    <>
      {caseStudies.slice(0, RAIL_LIMIT).map((study, i) => (
        <li
          key={study.id}
          data-rail-card={study.id}
          data-rail-index={i}
          className={liClass}
        >
          <StudyCard
            study={study}
            index={i}
            total={total}
            isEn={isEn}
            onHover={onHover}
          />
        </li>
      ))}
      {/* Closing slot: the particle "see more" portal to the full archive. */}
      <li
        key="see-more"
        data-rail-card="see-more"
        data-rail-index={RAIL_LIMIT}
        className={liClass}
      >
        <SeeMorePortal
          total={caseStudies.length}
          shown={RAIL_LIMIT}
          index={RAIL_LIMIT}
          isEn={isEn}
          onHover={onHover}
          className={CARD_CLASS}
        />
      </li>
    </>
  );

  // Closing row: provenance + the mid-page /start CTA (one of the home's
  // three allowed /start moments — spine release, here, FinalCTA).
  const closing = (
    <div className="container-px flex flex-col gap-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-14">
      <div className="flex max-w-xl flex-col gap-3">
        <p className="text-[13px] text-ink-mute leading-relaxed">
          {isEn
            ? "Selected named work includes SerSan-led builds and prior senior-delivery work by the founding team."
            : "I lavori nominati selezionati includono build guidate da SerSan e precedenti lavori di delivery senior del team fondatore."}
        </p>
        <p className="text-[14px] text-ink-mute leading-relaxed">
          {isEn ? (
            <>
              See work like yours? Bring the brief. We&apos;ll tell you whether
              to build, harden, or stop.
            </>
          ) : (
            <>
              Vedi un lavoro simile al tuo? Porta il brief. Ti diremo se
              costruire, consolidare o fermarti.
            </>
          )}
        </p>
      </div>
      <Link
        href="/start"
        className="group inline-flex shrink-0 items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase text-ink transition-colors hover:text-[hsl(var(--accent))]"
      >
        {isEn ? "Discuss a similar build" : "Parliamo di una build simile"}
        <ArrowUpRight
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden="true"
        />
      </Link>
    </div>
  );

  // Native fallback: normal-flow section, browser-owned horizontal scroll
  // with snap points. No pinning, no transforms, no WebGL planes.
  if (detected && mode === "native") {
    return (
      <section id="work" className="relative section-lg scroll-mt-24">
        <div className="mb-8 sm:mb-10">{heading}</div>
        <ul
          data-lenis-prevent
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={isEn ? "Selected engagements" : "Incarichi selezionati"}
        >
          {cards("snap-start shrink-0 w-[85vw] max-w-[26rem]")}
        </ul>
        {closing}
      </section>
    );
  }

  return (
    <section id="work" className="relative scroll-mt-24">
      {/* The tall scroll runway: height = 100vh + travel, set in px by
          measure(). minHeight is the SSR placeholder before JS measures. */}
      <div ref={sectionRef} className="relative" style={{ minHeight: "100vh" }}>
        {/* Sticky viewport — this IS the pin (no pin-spacer, anchors stay
            valid). RailPlanes reads [data-rail-sticky] to resolve card
            offsets within this frame. */}
        <div
          ref={stickyRef}
          data-rail-sticky
          className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden"
        >
          <div className="mb-8 shrink-0 sm:mb-10">{heading}</div>
          <ul
            ref={railRef}
            data-rail-track
            className="flex w-max items-stretch gap-5 will-change-transform"
            style={{ paddingInline: "var(--margin)" }}
            aria-label={isEn ? "Selected engagements" : "Incarichi selezionati"}
          >
            {cards("shrink-0 w-[min(85vw,26rem)]")}
          </ul>
        </div>
      </div>
      {closing}
    </section>
  );
}
