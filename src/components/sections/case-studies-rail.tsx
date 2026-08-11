"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { SectionHeading } from "@/components/ui/section-heading";
import { caseStudies, type CaseStudy } from "@/data/case-studies";
import { useLanguage } from "@/components/language-provider";
import { useRailStore } from "@/webgl/store/railStore";
import { useTierStore } from "@/webgl/store/tierStore";
import {
  railCardMotion,
  railCardFilter,
  RAIL_SWEEP_PX,
  RAIL_MEDIA_SHIFT,
} from "@/webgl/store/railMotion";
import { getLenis } from "@/lib/lenis-singleton";
import { snapPoint, suspendSnap } from "@/lib/scroll-snap";
import { useCentreFocus, type CentreFocusRef } from "@/lib/use-centre-focus";
import { CardImageDistort } from "@/components/fx/card-image-distort";
import { CardLogoReveal } from "@/components/fx/card-logo-reveal";
import { SeeMorePortal } from "@/components/fx/see-more-portal";
import { useFlipSource } from "@/lib/use-flip-source";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin);
}

/**
 * CaseStudiesRail — the home "Work" section as a sticky horizontal rail of
 * editorial case-study cards + one "see more" portal card (work-rail redesign:
 * taller cards, analytic center-focus motion, drag input, velocity skew).
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
 * MOTION (webgl/store/railMotion.ts — the ONE formula, mirrored by
 * webgl/RailPlanes so the planes stay pixel-registered):
 *   - center-focus falloff: each card's [data-rail-inner] wrapper gets
 *     scale = 1 − 0.06·f, opacity = 1 − 0.4·f and a pyramidal y-arc 12·f² px
 *     (f = |center − vw/2| / (vw/2)). Applied on the INNER wrapper so the
 *     card box ([data-rail-card]) stays untransformed for every measurement.
 *   - windowed counter-sweep: the metric block ([data-rail-sweep]) slides
 *     x = −t·60px against travel; the 112%-bleed media layer
 *     ([data-rail-media], preview cards) counter-parallaxes by −t·5 xPercent.
 *   - center-focus DoF: the same falloff drives a QUANTISED filter on the
 *     inner wrapper (blur 0→2.5px in 0.25px steps + brightness/saturate dim —
 *     railCardFilter), FULL tier only, written only on step crossings so the
 *     filter property never churns. The centred card carries no filter at
 *     all; the WebGL planes mirror the defocus procedurally via uFocus.
 *   - NO extra smoothing on any of the above: the input (trackX) is already
 *     Lenis-smoothed, and a second lerp on the DOM side only would lag the
 *     cards behind the analytically-placed WebGL planes (documented
 *     double-smoothing gotcha in the parallax-gallery research).
 *   - velocity stretch: the track wrapper shears skewX = clamp(v·k, ±2.2°)
 *     with a coupled scaleY compress (≤1.5%, derived from the same damped
 *     signal so both die together), damped to 0 at rest by a gsap.ticker
 *     writer that early-returns once parked. Velocity-derived → damped;
 *     position-derived → direct. Flattened synchronously in the rail's
 *     click-capture handler so a flip-flight snapshot (use-flip-source reads
 *     rects in the SAME click's bubble phase) never seeds from a sheared box.
 *
 * DRAG (pinned mode only): a gsap Draggable on the track with InertiaPlugin.
 * Drag is never a second source of truth — onDrag/onThrowUpdate convert
 * draggable.x into the equivalent page scroll via
 * lenis.scrollTo(secTop + travel·progress, { immediate: true }) (routing
 * through Lenis is mandatory or its internal target rubber-bands the page),
 * and the scroll re-enters through the same ScrollTrigger onUpdate as wheel
 * input. onUpdate keeps the Draggable's internal x in sync via update().
 *
 * MODES:
 *   - pinned (desktop: fine pointer, >768px, no reduced-motion — SSR default
 *     so the cards are in the initial HTML): scrub as above. WebGL planes
 *     (webgl/RailPlanes) sync to [data-rail-card] rects through railStore.
 *     Note: pinning is a DOM/Lenis feature, so a no-WebGL desktop still gets
 *     the pinned rail — it simply has no planes (tier gate lives in Scene.tsx).
 *   - native (mobile / coarse pointer / prefers-reduced-motion): no pinning,
 *     a plain overflow-x snap scroller. data-lenis-prevent keeps Lenis off it.
 *     No focus motion, no drag bridge, no skew.
 *
 * TOUCH REVEALS (D-2, D-16): everything the desktop card gates behind `:hover`
 * — the product shot / brand mark (globals.css) and the STACK pills — is gated
 * on `[data-focus="true"]` instead, written by lib/use-centre-focus on the card
 * nearest the viewport centre. The hook is inert on a fine pointer, so desktop
 * hover is untouched. Two deliberate differences from the hover choreography:
 * the card text does NOT fade out (a card that blanks its own title as you
 * scroll to it is worse than one that never shows its photo), and the pills
 * therefore move into the card's flow instead of overlaying it.
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

/** Shared card chrome: translucent over the WebGL plane (see header note).
 *  Taller editorial panel (redesign); overflow-hidden clips the counter-sweep
 *  and the 112%-bleed media layer at the card radius. Height/width both stay
 *  rem-clamped so fonts can never change the rail's scrollWidth. */
const CARD_CLASS =
  "group relative flex h-[clamp(21rem,60vh,30rem)] flex-col overflow-hidden rounded-lg border border-[hsl(var(--rule))] bg-[hsl(216_28%_10%/0.45)] p-6 sm:p-7 transition-colors duration-300 hover:border-[hsl(var(--accent)/0.45)] focus-visible:outline-none focus-visible:border-[hsl(var(--accent)/0.7)]";

/** Home rail shows only the marquee studies (SphereNode → Apple UK). */
const RAIL_LIMIT = 6;

/** Velocity stretch: max shear in degrees and deg per (px/s) of scrub
 *  velocity, plus the scaleY compress at full shear (one damped signal drives
 *  both — see writeStretch). */
const SKEW_MAX_DEG = 2.2;
const SKEW_DEG_PER_PXS = 0.002;
const SKEW_STRETCH = 0.015;

function StudyCard({
  study,
  index,
  total,
  isEn,
  onHover,
  focusRef,
  stackInFlow,
}: {
  study: CaseStudy;
  index: number;
  total: number;
  isEn: boolean;
  onHover: (index: number, target: number) => void;
  /** Centre-focus registration (touch only; inert on a fine pointer). */
  focusRef: CentreFocusRef;
  /**
   * Native/touch layout. The STACK pills move from the absolute overlay into
   * the card's flow: on touch the text layer does NOT fade out (globals.css —
   * blanking a card's own title as you scroll to it is worse than showing no
   * pills at all), so an overlay would land straight on the client name.
   */
  stackInFlow?: boolean;
}) {
  const metric = study.metrics[0];
  const engagement = isEn ? study.engagement : study.engagementIt;
  // The three SerSan builds (SphereNode, Quantex, Terra Noa) ship a product
  // preview → the Lusion-style hover-reveal glitch image fades in BEHIND the
  // text under a navy scrim. IN THE RAIL the screenshot leads over the brand
  // logo (redesign: the 112%-bleed media counter-parallax needs real cover
  // imagery; the /case-studies grid keeps its logo-first priority), so all
  // three preview studies carry the parallax layer.
  // CardImageDistort and its reveal CSS key off the `.card-steel` ancestor, so
  // the media cards carry `card-steel` for the hook only — `data-no-tilt`
  // keeps the global CardTiltController from transforming the box (RailPlanes
  // registration), and the scoped `rail-card-distort` override (globals.css)
  // restores the rail's translucent chrome so the planes still paint through.
  // The card box (fixed w/h from CARD_CLASS / the <li>) is unchanged; the
  // media is an absolute overlay clipped to the card radius.
  const showPreview = Boolean(study.previewImage);
  const showLogo = !showPreview && Boolean(study.logoImage);
  const hasMedia = showLogo || showPreview;
  // Hook called unconditionally (rules of hooks); EVERY card arms the
  // zoom-to-fullscreen handoff on a plain left click (fx/flip-handoff-overlay
  // inflates a clone of the card face while the <Link> navigates natively —
  // arming is passive, never preventDefault). Preview cards inflate their
  // shot and land on the detail hero; the rest inflate as a navy panel and
  // cross-fade out. The rail's drag click-suppression (capture handler below)
  // stops the event before it reaches this Link, so a real drag never arms.
  const onFlip = useFlipSource(study.id, study.previewImage);
  // STACK pills (D-16): hover/focus-visible only until now, i.e. visually dead
  // on touch. The list itself is identical in both placements — only the
  // wrapper's positioning + reveal trigger differ.
  const stackPills =
    study.techStack.length > 0 ? (
      <ul
        className={
          stackInFlow
            ? "stack-pills-focus mt-1 flex flex-wrap gap-1.5"
            : "pointer-events-none absolute inset-x-6 bottom-6 sm:inset-x-7 sm:bottom-7 z-10 flex flex-wrap gap-1.5 opacity-0 translate-y-2 transition-[opacity,transform] duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 motion-reduce:transition-none"
        }
      >
        {study.techStack.slice(0, 4).map((tech) => (
          <li
            key={tech}
            className="rounded-full border border-[hsl(var(--rule)/0.8)] bg-[hsl(216_28%_12%/0.72)] px-2.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-ink-mute backdrop-blur-sm"
          >
            {tech}
          </li>
        ))}
      </ul>
    ) : null;
  return (
    <Link
      href={`/case-studies/${study.id}`}
      ref={focusRef}
      className={
        hasMedia
          ? `${CARD_CLASS} card-steel rail-card-distort card-has-distort`
          : CARD_CLASS
      }
      onClick={onFlip}
      data-flip-source={study.id}
      {...(hasMedia ? { "data-no-tilt": "" } : {})}
      onPointerEnter={() => onHover(index, 1)}
      onPointerLeave={() => onHover(index, 0)}
      onFocus={() => onHover(index, 1)}
      onBlur={() => onHover(index, 0)}
    >
      {showPreview && study.previewImage && (
        /* Media clip + 112%-bleed counter-parallax: the outer div clips at
           the card radius; [data-rail-media] is 12% wider (6% bleed per side)
           and receives xPercent = −t·RAIL_MEDIA_SHIFT from the rail's
           onUpdate. Max shift 5% of the 112% layer ≈ 5.6% of the card — the
           image edge never enters the frame. */
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          <div
            data-rail-media
            className="absolute inset-y-0 left-[-6%] w-[112%] will-change-transform"
          >
            <CardImageDistort
              src={study.previewImage}
              alt={`${study.client} product preview`}
            />
          </div>
        </div>
      )}
      {showLogo && study.logoImage && <CardLogoReveal src={study.logoImage} />}
      {/* Text content sits ABOVE the media layer (mirrors the grid's
          `relative z-10` wrapper); at rest the metric/text card reads as today.
          `card-text-layer` fades the text out on hover (image shows clean) for
          the distort cards only — gated by `card-has-distort` on the root. */}
      <div className="relative z-10 flex h-full flex-col card-text-layer">
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

        {/* The huge mono metric — the card's proof, front and center. The
            block is the windowed counter-sweep target (x = −t·RAIL_SWEEP_PX,
            written by the rail's onUpdate; clipped by the card's
            overflow-hidden at the extremes, where the card is already half
            off-screen). */}
        <div
          data-rail-sweep
          className="flex flex-1 flex-col justify-center gap-2.5 py-6 will-change-transform"
        >
          <span className="font-mono text-[2.5rem] sm:text-[3rem] leading-[1.05] tracking-tight tabular-nums text-ink transition-colors duration-300 group-hover:text-[hsl(var(--accent))]">
            {metric?.value}
          </span>
          {metric ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-mute leading-snug line-clamp-2 max-w-[22rem]">
              {isEn ? metric.label : metric.labelIt}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-[hsl(var(--rule)/0.7)]">
          <h3 className="flex items-start justify-between gap-2 font-display text-[1.5rem] text-ink leading-tight">
            {study.client}
            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-ink-mute opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </h3>
          <p className="font-mono text-[11.5px] text-ink-mute leading-relaxed line-clamp-2">
            {engagement}
          </p>
          {/* TOUCH: the pills live here, in the card's flow under the client
              name, so they can never cover the copy that stays visible.
              In flow they also reserve their own height, so the centre-focus
              fade shifts nothing. */}
          {stackInFlow ? stackPills : null}
        </div>
      </div>
      {/* DESKTOP: hover/focus overlay OUTSIDE the text layer, so on the media
          cards they fade IN over the revealed shot exactly as the text fades
          out (spec-sheet moment). Data only: study.techStack. Animated props
          are opacity/transform only. */}
      {stackInFlow ? null : stackPills}
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

  // D-2/D-16: on touch there is no pointer to hover a card with, so the card
  // scrolled to the viewport centre reveals its imagery and its STACK pills
  // instead. Inert on a fine pointer — desktop keeps :hover, unchanged.
  const cardFocusRef = useCentreFocus();

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const skewRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLUListElement | null>(null);

  const prevModeRef = useRef<"pinned" | "native" | null>(null);

  // Mode detection is a SUBSCRIPTION, not a one-shot sample: a window snapped
  // narrow, devtools docked, or an OS reduced-motion toggle must flip the path
  // live. Sampling once on mount kept the pinned path alive with measurements
  // taken against a viewport that no longer exists.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const queries = [
      window.matchMedia("(max-width: 768px)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(prefers-reduced-motion: reduce)"),
    ];
    const sync = () => {
      setMode(queries.some((q) => q.matches) ? "native" : "pinned");
      setDetected(true);
    };
    sync();
    queries.forEach((q) => q.addEventListener("change", sync));
    return () => queries.forEach((q) => q.removeEventListener("change", sync));
  }, []);

  // A mode flip sets or clears the px runway height, so document height moves
  // — and an OS reduced-motion toggle fires no resize event, so nothing else
  // would re-measure. Deferred so the refresh reads the committed layout.
  useEffect(() => {
    if (!detected) return;
    const prev = prevModeRef.current;
    prevModeRef.current = mode;
    if (prev === null || prev === mode) return;
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(raf);
  }, [detected, mode]);

  // ScrollTrigger scrub + analytic card motion + drag bridge + velocity skew
  // — pinned mode only, after viewport detection settles.
  useEffect(() => {
    if (!detected || mode !== "pinned") return;
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const skewWrap = skewRef.current;
    const rail = railRef.current;
    if (!section || !sticky || !skewWrap || !rail) return;

    const store = useRailStore.getState();
    const setX = gsap.quickSetter(rail, "x", "px");
    const setStretch = gsap.quickSetter(skewWrap, "css");
    let travel = 0;
    let vw = window.innerWidth;
    let drag: Draggable | null = null;
    // Velocity-stretch state (ticker-damped; onUpdate feeds velTarget).
    let skewValue = 0;
    let velTarget = 0;
    // Reused across writes — quickSetter reads synchronously, no retention.
    // scaleY is DERIVED from the shear so one damped signal drives both and
    // they reach exactly {0°, 1} together at rest.
    const stretchProps = { skewX: 0, scaleY: 1 };
    const writeStretch = (deg: number) => {
      stretchProps.skewX = deg;
      stretchProps.scaleY = 1 - SKEW_STRETCH * (Math.abs(deg) / SKEW_MAX_DEG);
      setStretch(stretchProps);
    };

    // ---- Analytic per-card motion (railMotion.ts — shared with RailPlanes).
    // Element handles + un-translated centers are cached at measure() time;
    // per-scroll writes are quickSetter-only: no rects, no React state, no
    // extra smoothing (trackX is already Lenis-smoothed — see header).
    interface CardMotionTarget {
      baseCenter: number;
      inner: HTMLElement | null;
      setInner: ReturnType<typeof gsap.quickSetter> | null;
      setSweep: ReturnType<typeof gsap.quickSetter> | null;
      setMedia: ReturnType<typeof gsap.quickSetter> | null;
      /** Last filter string written (DoF change-guard) — "" = no filter. */
      lastFilter: string;
    }
    let cardTargets: CardMotionTarget[] = [];
    // Reused across writes — quickSetter reads synchronously, no retention.
    const innerProps = { y: 0, scale: 1, opacity: 1 };

    const collectCards = () => {
      const { trackX } = useRailStore.getState();
      cardTargets = Array.from(
        rail.querySelectorAll<HTMLElement>("[data-rail-card]"),
      ).map((el) => {
        // Un-translate to the trackX = 0 frame (same trick as RailPlanes).
        // The motion transforms live on the INNER wrapper, so the card box
        // rect itself is never contaminated by them.
        const r = el.getBoundingClientRect();
        const inner = el.querySelector<HTMLElement>("[data-rail-inner]");
        const sweep = el.querySelector<HTMLElement>("[data-rail-sweep]");
        const media = el.querySelector<HTMLElement>("[data-rail-media]");
        return {
          baseCenter: r.left + trackX + r.width / 2,
          inner,
          setInner: inner ? gsap.quickSetter(inner, "css") : null,
          setSweep: sweep ? gsap.quickSetter(sweep, "x", "px") : null,
          setMedia: media ? gsap.quickSetter(media, "xPercent") : null,
          // Seed the change-guard from the LIVE style, not "": a re-measure
          // mid-rail must not leave a stale blur unclearable.
          lastFilter: inner?.style.filter ?? "",
        };
      });
    };

    const applyMotion = (trackX: number) => {
      // DOM depth-of-field is FULL tier only (lite/off: zero filter writes).
      // Transient getState read per pass — a runtime degrade self-heals via
      // the change-guard: the next scroll frame computes "" and clears each
      // card's filter exactly once.
      const dof = useTierStore.getState().tier === "full";
      for (let i = 0; i < cardTargets.length; i++) {
        const c = cardTargets[i];
        const m = railCardMotion(c.baseCenter - trackX, vw);
        if (c.setInner) {
          innerProps.y = m.y;
          innerProps.scale = m.scale;
          innerProps.opacity = m.opacity;
          c.setInner(innerProps);
        }
        if (c.setSweep) c.setSweep(-m.t * RAIL_SWEEP_PX);
        if (c.setMedia) c.setMedia(-m.t * RAIL_MEDIA_SHIFT);
        // Center-focus DoF (railCardFilter — quantised): the string is
        // byte-stable between blur steps, so style.filter is only touched on
        // a step crossing (~10 states per card, no per-frame churn).
        const filter = dof ? railCardFilter(m.f) : "";
        if (c.inner && filter !== c.lastFilter) {
          c.inner.style.filter = filter;
          c.lastFilter = filter;
        }
      }
    };

    const measure = () => {
      // A live shear/compress would distort every rect read below — flatten
      // both first (writeStretch(0) restores {skewX: 0, scaleY: 1}).
      writeStretch(0);
      skewValue = 0;
      velTarget = 0;
      // Faure's limit formula; the rail is w-max so scrollWidth == full width.
      travel = Math.max(0, rail.scrollWidth - window.innerWidth);
      vw = window.innerWidth;
      section.style.height = `${window.innerHeight + travel}px`;
      const secTop = section.getBoundingClientRect().top + window.scrollY;
      store.setLayout(travel, secTop);
      // RailPlanes re-reads card rects on this bump (post-refresh layout).
      store.bumpMeasure();
      collectCards();
      drag?.applyBounds({ minX: -travel, maxX: 0 });
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
        applyMotion(x);
        // Velocity-skew target — re-fed on every scroll frame, decayed by the
        // ticker so the shear dies at rest. Gated to the active scrub window
        // (getVelocity is page-wide; parked cards must never shear).
        const scrubbing = self.progress > 0.0005 && self.progress < 0.9995;
        velTarget = scrubbing
          ? gsap.utils.clamp(
              -SKEW_MAX_DEG,
              SKEW_MAX_DEG,
              self.getVelocity() * SKEW_DEG_PER_PXS,
            )
          : 0;
        // Keep the Draggable's internal x in sync so a drag starts from the
        // wheel-scrubbed position. setX above already wrote the element
        // transform; update() re-reads it (x is readonly on the instance).
        drag?.update();
      },
    });
    // Sync the parked state immediately (covers a reload mid-page where the
    // browser restores a scroll position inside the rail's range).
    setX(-travel * st.progress);
    store.setTrack(travel * st.progress, st.progress, 0);
    applyMotion(travel * st.progress);
    store.setPinned(true);

    // Site-wide snap stations (lib/scroll-snap): one per rail card — the
    // vertical scrollY at which card i sits horizontally CENTERED (the same
    // formula the focusin handler uses; 1 scrolled px = 1 translated px).
    // Card 0 clamps to the runway start and the SeeMorePortal clamps to the
    // release edge, so the rail's entry/exit are covered by the same set.
    // Lazy getters over the live measure() caches — no re-registration.
    const clearSnapPoints: Array<() => void> = cardTargets.map((_, i) =>
      snapPoint(() => {
        const c = cardTargets[i];
        if (!c || travel <= 0) return Number.NaN;
        const { secTop } = useRailStore.getState();
        return secTop + Math.min(Math.max(c.baseCenter - vw / 2, 0), travel);
      }),
    );

    // ---- Velocity stretch writer (gsap.ticker, DOM-only, transform-only).
    // Damps the shear toward the decaying target (scaleY rides the same
    // signal inside writeStretch) and EARLY-RETURNS once parked — zero writes
    // at rest (repo invariant for DOM style writers).
    const skewTick = (_time: number, deltaTime: number) => {
      const dt = Math.min(0.05, deltaTime / 1000);
      // Decay the raw target: onUpdate re-feeds it while Lenis is moving, so
      // this only bites once scrolling stops.
      velTarget *= Math.exp(-5 * dt);
      const next =
        skewValue + (velTarget - skewValue) * (1 - Math.exp(-10 * dt));
      if (Math.abs(next) < 0.005 && Math.abs(velTarget) < 0.005) {
        if (skewValue !== 0) {
          skewValue = 0;
          writeStretch(0); // snap to exactly {0°, 1} once, then stop writing
        }
        return;
      }
      skewValue = next;
      writeStretch(skewValue);
    };
    gsap.ticker.add(skewTick);

    // One-shot late refresh once webfonts land: the provider deliberately does
    // NOT refresh ScrollTrigger on "/" (the spine owns its refresh bursts), so
    // the rail covers its own font-driven header reflow (caveat 2).
    let fontsCancelled = false;
    document.fonts?.ready
      .then(() => {
        if (!fontsCancelled) ScrollTrigger.refresh();
      })
      .catch(() => {});

    // ---- Drag bridge (Draggable ↔ ScrollTrigger, pinned mode only).
    // Drag is never a second source of truth: it converts draggable.x into
    // the equivalent PAGE scroll (1 translated px = 1 scrolled px) through
    // lenis.scrollTo(..., { immediate: true }) — routing through Lenis is
    // mandatory or its internal target rubber-bands the page back — and that
    // scroll re-enters through the ScrollTrigger onUpdate above, the same
    // code path wheel input takes.
    let suppressClick = false;
    const onRailClickCapture = (e: MouseEvent) => {
      // A real drag must not activate the card link under the pointer.
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Flip-snapshot neutrality: use-flip-source reads the card/media rects
      // in this SAME click's bubble phase (React delegates at the root, which
      // bubbles after this capture listener), so a live velocity shear would
      // seed the flight clone from a sheared rect — flatten it synchronously
      // first (≤2.2° mid-scrub only; imperceptible under the click).
      if (skewValue !== 0 || velTarget !== 0) {
        skewValue = 0;
        velTarget = 0;
        writeStretch(0);
      }
      // And drop the clicked card's DoF filter: filters never move rects, but
      // the flight clone is unfiltered — a blurred card under a crisp clone
      // would pop at frame 0. Cache stays truthful for later applyMotion runs.
      const inner = (e.target as HTMLElement | null)
        ?.closest<HTMLElement>("[data-rail-card]")
        ?.querySelector<HTMLElement>("[data-rail-inner]");
      if (inner && inner.style.filter) {
        inner.style.filter = "";
        const t = cardTargets.find((c) => c.inner === inner);
        if (t) t.lastFilter = "";
      }
    };
    rail.addEventListener("click", onRailClickCapture, true);

    const dragToScroll = () => {
      if (!drag || travel <= 0) return;
      // x runs 0 → −travel, so normalize(0, −travel, x) is already 0 → 1.
      const p = gsap.utils.clamp(
        0,
        1,
        gsap.utils.normalize(0, -travel, drag.x),
      );
      const { secTop } = useRailStore.getState();
      const target = secTop + travel * p;
      const lenis = getLenis();
      // Inside the pin range the write is IMMEDIATE (1 dragged px = 1
      // scrolled px, zero lag). If the user grabs the rail while the section
      // is still entering/leaving the viewport (scroll outside the range), an
      // immediate write would teleport the page by up to a viewport — glide
      // there instead; the next drag events land in-range and go immediate.
      const inPin =
        window.scrollY >= secTop - 1 && window.scrollY <= secTop + travel + 1;
      if (lenis)
        lenis.scrollTo(target, inPin ? { immediate: true } : { duration: 0.5 });
      else window.scrollTo({ top: target, behavior: inPin ? "auto" : "smooth" });
    };

    // Snap-engine hold while the hand owns the rail: a debounced settle from
    // a pre-drag wheel must never fire into the drag/throw scrub. Release is
    // idempotent (fires from both onDragEnd and onThrowComplete).
    let releaseDragHold: (() => void) | null = null;
    const endDragHold = () => {
      releaseDragHold?.();
      releaseDragHold = null;
    };
    drag = Draggable.create(rail, {
      type: "x",
      bounds: { minX: -travel, maxX: 0 },
      inertia: true,
      edgeResistance: 0.85,
      // The whole track is <Link> cards — drags must be able to start on them.
      dragClickables: true,
      minimumMovement: 3,
      cursor: "grab",
      activeCursor: "grabbing",
      onDragStart: () => {
        suppressClick = false;
        releaseDragHold ??= suspendSnap();
      },
      onDrag: dragToScroll,
      onThrowUpdate: dragToScroll,
      onThrowComplete: endDragHold,
      onDragEnd: () => {
        endDragHold();
        // Belt + braces over Draggable's own small-movement click pass-through:
        // a real drag arms the capture handler above for the click that
        // follows pointerup, then disarms on the next macrotask.
        if (drag && Math.abs(drag.endX - drag.startX) > 3) {
          suppressClick = true;
          window.setTimeout(() => {
            suppressClick = false;
          }, 120);
        }
      },
    })[0];

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
      const vw2 = window.innerWidth;
      const rect = card.getBoundingClientRect();
      // Already fully visible (e.g. click-focus) → don't move the page.
      if (rect.left >= 0 && rect.right <= vw2) return;
      const { trackX, travel: t, secTop } = useRailStore.getState();
      const baseCenter = rect.left + trackX + rect.width / 2; // at trackX = 0
      const desired = Math.min(Math.max(baseCenter - vw2 / 2, 0), t);
      const targetY = secTop + desired; // 1px scrolled = 1px translated
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(targetY, { duration: 0.6 });
      else window.scrollTo({ top: targetY });
    };
    rail.addEventListener("focusin", onFocusIn);

    // ---- Per-card noisy-reveal trigger (P2 #3, consumed by webgl/RailPlanes).
    // Fire-once, in-view via IntersectionObserver: robust when the section is
    // already scrolled into view on mount, and naturally staggered when each
    // card slides in horizontally during the pin. Harmless on the non-WebGPU
    // path — RailPlanes isn't mounted there, so nobody reads `reveal`.
    const revealIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.railIndex);
          if (!Number.isNaN(idx)) useRailStore.getState().setReveal(idx, 1);
          revealIO.unobserve(entry.target);
        }
      },
      { threshold: 0.15 },
    );
    rail
      .querySelectorAll<HTMLElement>("[data-rail-card]")
      .forEach((el) => revealIO.observe(el));

    return () => {
      fontsCancelled = true;
      revealIO.disconnect();
      rail.removeEventListener("focusin", onFocusIn);
      rail.removeEventListener("click", onRailClickCapture, true);
      gsap.ticker.remove(skewTick);
      endDragHold();
      clearSnapPoints.forEach((off) => off());
      drag?.kill();
      st.kill();
      gsap.set(rail, { x: 0 });
      gsap.set(skewWrap, { skewX: 0, scaleY: 1 });
      // Clear every per-card motion write so a later re-mount starts clean.
      rail
        .querySelectorAll<HTMLElement>(
          "[data-rail-inner], [data-rail-sweep], [data-rail-media]",
        )
        .forEach((el) => gsap.set(el, { clearProps: "transform,opacity,filter" }));
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

  // Native (touch) layout moves the STACK pills into the card's flow — see
  // StudyCard's `stackInFlow`. Before detection resolves, the SSR/desktop
  // overlay markup is what renders.
  const stackInFlow = detected && mode === "native";

  const cards = (liClass: string) => (
    <>
      {caseStudies.slice(0, RAIL_LIMIT).map((study, i) => (
        <li
          key={study.id}
          data-rail-card={study.id}
          data-rail-index={i}
          className={liClass}
        >
          {/* The inner wrapper carries the analytic center-focus transforms
              (scale/opacity/y-arc) so the card box above stays untransformed
              for RailPlanes' rect cache and the focus-scroll handler. Inert
              in native mode. */}
          <div data-rail-inner className="h-full will-change-transform [transition:filter_240ms_ease-out]">
            <StudyCard
              study={study}
              index={i}
              total={total}
              isEn={isEn}
              onHover={onHover}
              focusRef={cardFocusRef}
              stackInFlow={stackInFlow}
            />
          </div>
        </li>
      ))}
      {/* Closing slot: the particle "see more" portal to the full archive. */}
      <li
        key="see-more"
        data-rail-card="see-more"
        data-rail-index={RAIL_LIMIT}
        className={liClass}
      >
        <div data-rail-inner className="h-full will-change-transform [transition:filter_240ms_ease-out]">
          <SeeMorePortal
            total={caseStudies.length}
            shown={RAIL_LIMIT}
            index={RAIL_LIMIT}
            isEn={isEn}
            onHover={onHover}
            className={CARD_CLASS}
          />
        </div>
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
          {cards("snap-start shrink-0 w-[88vw] max-w-[34rem]")}
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
          {/* Velocity-stretch wrapper: the transient shear + scaleY compress
              live here, NEVER on the track itself, so the ScrollTrigger x
              writer and the Draggable stay the only transform owners of the
              <ul>. Flattened to {0°, 1} before every measure. */}
          <div ref={skewRef} className="will-change-transform">
            <ul
              ref={railRef}
              data-rail-track
              className="flex w-max cursor-grab items-stretch gap-5 will-change-transform"
              style={{ paddingInline: "var(--margin)" }}
              aria-label={isEn ? "Selected engagements" : "Incarichi selezionati"}
            >
              {cards("shrink-0 w-[min(88vw,34rem)]")}
            </ul>
          </div>
        </div>
      </div>
      {closing}
    </section>
  );
}
