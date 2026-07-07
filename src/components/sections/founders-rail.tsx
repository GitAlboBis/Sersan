"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionGlow } from "@/components/ui/section-glow";
import { founders, type FounderProfile } from "@/data/founders";
import { useLanguage } from "@/components/language-provider";
import { getLenis } from "@/lib/lenis-singleton";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * FoundersRail — the home founders block as a sticky horizontal set piece.
 * Replaces the static two-column FoundersSection (all copy carried over
 * verbatim from that file / src/data/founders.ts — this is a presentation
 * change only).
 *
 * MECHANICS (cloned from case-studies-rail.tsx — binding pattern):
 *   - CSS `position: sticky` pins the viewport frame; ScrollTrigger only
 *     scrubs `translateX`. NO `pin:` (a pin-spacer would re-parent the section
 *     and break every [data-line-anchor] measurement — same rule as the
 *     cinematic spine), NO scrub tween (Lenis already smooths the scroll the
 *     progress derives from), NO `scroller` option (the provider's
 *     scrollerProxy covers it).
 *   - Section height = 100vh + travel, travel = trackWidth − viewportWidth,
 *     set in px by measure(). 1 scrolled px = 1 translated px.
 *     `invalidateOnRefresh` + `onRefreshInit: measure` make every
 *     ScrollTrigger.refresh() self-heal; the one refresh the rail owns is the
 *     one-shot document.fonts.ready (the provider never refreshes on "/").
 *   - Panel widths are fixed in rem (never content/font-derived) so a font
 *     swap cannot change scrollWidth → document height → downstream anchors.
 *
 * MOTION (all analytic — per-panel centers derive from measure()-cached
 * offsets minus the live trackX; NEVER getBoundingClientRect in the loop):
 *   - windowed counter-sweep on the big display name:
 *     x = −t·SWEEP_PX, t = clamp((panelCenterX − vw/2)/(vw/2), −1, 1).
 *   - portrait counter-parallax: media layer is 112% wide / left −6% inside
 *     an overflow-hidden viewport; xPercent = −t·5 (5% of the 112% layer
 *     ≈ 5.6% of the viewport — inside the 6% bleed).
 *   - portrait entry reveal: an SVG <mask> circle grows r 0→final through a
 *     static feTurbulence→feDisplacementMap filter (organic "boiling" edge),
 *     scrubbed from the SAME rail progress windowed to the panel's entry
 *     segment. SSR renders the circle at its FINAL radius (no-JS / crawler
 *     views show the portrait); the pinned effect takes over on mount.
 *     Only 2 displacement filters exist page-wide (one per founder) and the
 *     filter region is constrained — SVG displacement rasterizes on CPU.
 *   - hover: CSS-only duotone→color — grayscale/navy-tinted base, color layer
 *     clip-path circle expanding from the pointer's entry point, thin cyan
 *     #3BE1FF ring riding the expanding edge. Fine-pointer only. NO violet.
 *
 * MODES:
 *   - pinned (desktop: fine pointer, >768px, no reduced-motion — SSR default
 *     so all links are in the initial HTML): scrub as above.
 *   - native (mobile / coarse pointer / prefers-reduced-motion): no pinning,
 *     a plain overflow-x snap scroller (data-lenis-prevent keeps Lenis off
 *     it); parallax/sweep stay at rest and the reveal mask stays at its
 *     final radius (static-final).
 *
 * KEYBOARD: in pinned mode, focusing a link inside an off-screen panel
 * converts to the equivalent VERTICAL scroll position via lenis.scrollTo
 * (same handler contract as case-studies-rail).
 *
 * Panels do NOT use `.card-steel` — the global CardTiltController owns that
 * class's transforms and these panels carry their own per-frame writers.
 */

/** Windowed counter-sweep travel for the big display name (px at |t| = 1). */
const SWEEP_PX = 150;
/** Portrait counter-parallax at |t| = 1, in % of the 112%-bleed media layer. */
const PARALLAX_PCT = 5;
/** SVG mask coordinate space (portrait-ish, cover-cropped via `slice`). */
const MASK_W = 800;
const MASK_H = 1000;
/**
 * Final reveal radius: covers the farthest corner from center
 * (√(400² + 500²) ≈ 640) plus the displacement's max inward excursion
 * (scale 70 → ±35), with margin.
 */
const MASK_FINAL_R = 700;
/** Panel-center viewport fraction at which the entry reveal completes. */
const REVEAL_END = 0.55;

/**
 * Duotone→color hover treatment (shared visual contract with the About-page
 * portraits — about-client.tsx carries the same block; keep them in sync).
 * `--fr-hr` is a registered custom property so the clip-path radius (color
 * layer) and its +1.5px cyan annulus (ring layer) interpolate together from
 * one transition. `--fr-mx/--fr-my` are set once per pointerenter (JS writes
 * a CSS var — the animation itself is pure CSS). Without @property support
 * the reveal snaps instead of easing, which is an acceptable degradation.
 */
const PORTRAIT_CSS = `
@property --fr-hr {
  syntax: "<length-percentage>";
  inherits: true;
  initial-value: 0px;
}
.founder-portrait {
  --fr-hr: 0px;
  transition: --fr-hr 0.65s cubic-bezier(0.22, 1, 0.36, 1);
}
.founder-portrait__base {
  filter: grayscale(1) brightness(0.85);
}
.founder-portrait__color {
  clip-path: circle(var(--fr-hr) at var(--fr-mx, 50%) var(--fr-my, 50%));
}
.founder-portrait__ring {
  background: #3BE1FF;
  opacity: 0;
  transition: opacity 0.25s ease;
  clip-path: circle(calc(var(--fr-hr) + 1.5px) at var(--fr-mx, 50%) var(--fr-my, 50%));
}
@media (hover: hover) and (pointer: fine) {
  .founder-portrait:hover { --fr-hr: 150%; }
  .founder-portrait:hover .founder-portrait__ring { opacity: 0.9; }
}
@media (prefers-reduced-motion: reduce) {
  .founder-portrait,
  .founder-portrait__ring { transition: none; }
}
`;

/** Per-panel elements + cached geometry driven by the single ScrollTrigger. */
type PanelFx = {
  li: HTMLElement;
  circle: SVGCircleElement;
  name: HTMLElement;
  media: HTMLElement;
  setName: (v: number) => void;
  setMedia: (v: number) => void;
  width: number;
  baseCenter: number;
  lastR: number;
};

function FounderPanel({
  f,
  index,
  total,
  isEn,
}: {
  f: FounderProfile;
  index: number;
  total: number;
  isEn: boolean;
}) {
  // SVG filter/mask ids must be document-unique AND SSR-stable → useId.
  // The delimiter chars (":" / "«»") break unquoted CSS url() references,
  // so strip them.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = `founder-boil-${uid}`;
  const maskId = `founder-mask-${uid}`;

  const role = isEn ? f.roleEn : f.roleIt;

  // One rect read per pointer ENTRY (event-driven — never in a frame loop):
  // anchors the CSS clip-path circle at the point the cursor came in.
  const onPortraitEnter = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    el.style.setProperty(
      "--fr-mx",
      `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`,
    );
    el.style.setProperty(
      "--fr-my",
      `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`,
    );
  };

  return (
    <article
      id={`founder-${f.anchor}`}
      className="group relative h-auto w-full overflow-hidden rounded-lg border border-[hsl(var(--rule))] bg-[hsl(216_28%_10%/0.45)] transition-colors duration-300 hover:border-[hsl(var(--accent)/0.45)] sm:h-[clamp(26rem,72vh,42rem)]"
    >
      <div className="grid h-full grid-cols-1 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Portrait viewport — overflow-hidden clips the 112% bleed layer. */}
        <div
          className="founder-portrait relative h-64 overflow-hidden sm:h-full"
          onPointerEnter={onPortraitEnter}
        >
          {/* Counter-parallax target: everything (masked base, ring, color
              layer) slides together so hover + reveal stay registered. */}
          <div
            data-founder-media
            className="absolute inset-y-0 left-[-6%] w-[112%] will-change-transform"
          >
            <svg
              className="h-full w-full"
              viewBox={`0 0 ${MASK_W} ${MASK_H}`}
              preserveAspectRatio="xMidYMid slice"
              role="img"
              aria-label={`${f.name}, ${role}`}
            >
              <defs>
                {/* Static noise field; only the circle animates through it.
                    Region constrained (perf: CPU rasterization). */}
                <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.035"
                    numOctaves="2"
                    result="noise"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="noise"
                    scale="70"
                    xChannelSelector="R"
                    yChannelSelector="G"
                  />
                </filter>
                <mask id={maskId}>
                  {/* SSR-final radius: the portrait is visible without JS;
                      the pinned scrub re-seeds it from rail progress. */}
                  <circle
                    data-founder-maskcircle
                    cx={MASK_W / 2}
                    cy={MASK_H / 2}
                    r={MASK_FINAL_R}
                    fill="#fff"
                    style={{ filter: `url(#${filterId})` }}
                  />
                </mask>
              </defs>
              <g mask={`url(#${maskId})`}>
                {/* Duotone base: grayscale image under a navy scrim. */}
                <image
                  href={f.image}
                  x="0"
                  y="0"
                  width={MASK_W}
                  height={MASK_H}
                  preserveAspectRatio="xMidYMid slice"
                  className="founder-portrait__base"
                />
                <rect
                  x="0"
                  y="0"
                  width={MASK_W}
                  height={MASK_H}
                  fill="#0B1422"
                  opacity="0.35"
                />
              </g>
            </svg>
            {/* Cyan annulus riding 1.5px outside the color layer's clip edge. */}
            <div aria-hidden="true" className="founder-portrait__ring absolute inset-0" />
            {/* Full-color layer, revealed by the expanding clip circle. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.image}
              alt=""
              aria-hidden="true"
              draggable={false}
              loading="lazy"
              className="founder-portrait__color absolute inset-0 h-full w-full object-cover"
            />
          </div>
          {/* Bottom gradient so the name band sits on a dark base. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
            style={{
              background:
                "linear-gradient(to top, hsl(var(--bg) / 0.9) 0%, transparent 100%)",
            }}
          />
        </div>

        {/* Body — bio, credentials, previously-at. Bottom padding clears the
            absolute name band. */}
        <div className="relative flex min-w-0 flex-col gap-4 p-6 pb-36 sm:p-7 sm:pb-36">
          <div className="flex items-center justify-between gap-2 border-b border-[hsl(var(--rule)/0.7)] pb-4">
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-dim tabular-nums">
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(total).padStart(2, "0")}
            </span>
          </div>

          <p className="text-[14px] sm:text-[15px] text-ink-mute leading-relaxed">
            {isEn ? f.shortBioEn : f.shortBioIt}
          </p>

          <ul className="flex flex-col gap-1.5 list-none">
            {(isEn ? f.credentialsEn : f.credentialsIt).map((c) => (
              <li
                key={c}
                className="flex items-start gap-2 text-[13px] text-ink leading-relaxed"
              >
                <span
                  aria-hidden="true"
                  className="mt-[7px] block w-1 h-1 rounded-full bg-[hsl(var(--accent)/0.8)] shrink-0"
                />
                <span>{c}</span>
              </li>
            ))}
          </ul>

          {f.previouslyAt && f.previouslyAt.length > 0 ? (
            <div className="pt-3 border-t border-[hsl(var(--rule)/0.7)]">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute/70 mb-2">
                {isEn ? "Previously" : "In precedenza"}
              </p>
              <ul className="flex flex-wrap gap-1.5 list-none">
                {f.previouslyAt.map((co) => (
                  <li
                    key={co}
                    className="inline-flex items-center px-2.5 py-1 rounded-full border border-[hsl(var(--rule))] bg-[hsl(var(--bg))] font-mono text-[10px] tracking-[0.1em] uppercase text-ink-mute"
                  >
                    {co}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {/* Name band — spans the whole panel; the huge display name carries the
          windowed counter-sweep (transform on the inner span, clipped by the
          panel's overflow-hidden). LinkedIn stays interactive. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 p-6 sm:p-7">
        <div className="min-w-0">
          <h3 className="font-display text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[0.95] text-ink">
            <span data-founder-name className="inline-block will-change-transform">
              {f.name}
            </span>
          </h3>
          <p className="mt-2 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute">
            {role}
          </p>
        </div>
        <Link
          href={f.linkedIn}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${f.name} on LinkedIn`}
          className="pointer-events-auto inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-full border border-[hsl(var(--ink)/0.25)] bg-[hsl(var(--bg)/0.6)] text-ink-mute hover:text-ink hover:border-[hsl(var(--accent)/0.6)] transition-colors backdrop-blur"
        >
          <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default function FoundersRail() {
  const { language } = useLanguage();
  const isEn = language === "en";

  // SSR default = pinned (desktop) layout so all links are in the initial
  // HTML — same convention as case-studies-rail.
  const [mode, setMode] = useState<"pinned" | "native">("pinned");
  const [detected, setDetected] = useState(false);

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLUListElement | null>(null);

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
    const track = trackRef.current;
    if (!section || !sticky || !track) return;

    const setX = gsap.quickSetter(track, "x", "px");
    let travel = 0;
    let secTop = 0;
    let trackX = 0;
    let vw = window.innerWidth;

    // Per-panel writer bundle: quickSetters built ONCE (elements are stable
    // across language toggles — only text nodes change), geometry refreshed
    // by measure().
    const fx: PanelFx[] = [];
    track
      .querySelectorAll<HTMLElement>("[data-founders-panel]")
      .forEach((li) => {
        const circle = li.querySelector<SVGCircleElement>(
          "[data-founder-maskcircle]",
        );
        const name = li.querySelector<HTMLElement>("[data-founder-name]");
        const media = li.querySelector<HTMLElement>("[data-founder-media]");
        if (!circle || !name || !media) return;
        fx.push({
          li,
          circle,
          name,
          media,
          setName: gsap.quickSetter(name, "x", "px") as (v: number) => void,
          setMedia: gsap.quickSetter(media, "xPercent") as (v: number) => void,
          width: 0,
          baseCenter: 0,
          lastR: -1,
        });
      });

    const measure = () => {
      vw = window.innerWidth;
      // Faure's limit formula; the track is w-max so scrollWidth == width.
      travel = Math.max(0, track.scrollWidth - vw);
      section.style.height = `${window.innerHeight + travel}px`;
      secTop = section.getBoundingClientRect().top + window.scrollY;
      // Panel centers at trackX = 0, translate-invariant: (panel.left −
      // track.left) cancels the live translateX because both rects carry it;
      // adding the (untranslated) sticky frame's left rebases into viewport
      // space. Rects are read HERE only — never in the frame loop.
      const stickyLeft = sticky.getBoundingClientRect().left;
      const trackLeft = track.getBoundingClientRect().left;
      for (const p of fx) {
        const r = p.li.getBoundingClientRect();
        p.width = r.width;
        p.baseCenter = stickyLeft + (r.left - trackLeft) + r.width / 2;
      }
    };

    // Analytic per-panel pass — pure math over cached measurements + trackX.
    const applyFx = () => {
      const half = vw / 2;
      for (const p of fx) {
        const centerX = p.baseCenter - trackX;
        const t = Math.max(-1, Math.min(1, (centerX - half) / half));
        p.setName(-t * SWEEP_PX);
        p.setMedia(-t * PARALLAX_PCT);
        // Entry reveal windowed to this panel's segment of the SAME rail
        // progress: 0 with the panel fully off the right edge → 1 by the
        // time its center reaches REVEAL_END·vw. Scrubbed both ways.
        const enterStart = vw + p.width / 2;
        const enterEnd = vw * REVEAL_END;
        const rev = Math.max(
          0,
          Math.min(1, (enterStart - centerX) / (enterStart - enterEnd)),
        );
        // Quantized to integers: every r change re-rasterizes the SVG
        // displacement filter, so skip sub-pixel churn.
        const r = Math.round(rev * MASK_FINAL_R);
        if (r !== p.lastR) {
          p.lastR = r;
          p.circle.setAttribute("r", String(r));
        }
      }
    };

    measure();

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom", // progress hits 1 exactly when sticky releases
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      onUpdate: (self) => {
        trackX = travel * self.progress;
        setX(-trackX);
        applyFx();
      },
    });
    // Sync the parked state immediately (covers a reload mid-page where the
    // browser restores a scroll position inside the rail's range) — this is
    // also the moment the SSR'd final-radius masks re-seed from progress.
    trackX = travel * st.progress;
    setX(-trackX);
    applyFx();

    // One-shot late refresh once webfonts land: the provider deliberately does
    // NOT refresh ScrollTrigger on "/" (the spine owns its refresh bursts), so
    // the rail covers its own font-driven header reflow.
    let fontsCancelled = false;
    document.fonts?.ready
      .then(() => {
        if (!fontsCancelled) ScrollTrigger.refresh();
      })
      .catch(() => {});

    // Keyboard: convert focus on a link inside an off-screen panel into the
    // equivalent vertical scroll position (same contract as the work rail).
    const onFocusIn = (e: FocusEvent) => {
      const panel = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-founders-panel]",
      );
      if (!panel) return;
      // Undo the browser's auto-scroll of the overflow:hidden sticky frame
      // BEFORE reading the panel rect, or every downstream measure is shifted.
      sticky.scrollLeft = 0;
      const vwNow = window.innerWidth;
      const rect = panel.getBoundingClientRect();
      // Already fully visible (e.g. click-focus) → don't move the page.
      if (rect.left >= 0 && rect.right <= vwNow) return;
      const baseCenter = rect.left + trackX + rect.width / 2; // at trackX = 0
      const desired = Math.min(Math.max(baseCenter - vwNow / 2, 0), travel);
      const targetY = secTop + desired; // 1px scrolled = 1px translated
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(targetY, { duration: 0.6 });
      else window.scrollTo({ top: targetY });
    };
    track.addEventListener("focusin", onFocusIn);

    return () => {
      fontsCancelled = true;
      track.removeEventListener("focusin", onFocusIn);
      st.kill();
      gsap.set(track, { x: 0 });
      section.style.height = "";
      // Leave every panel in its static-final pose (mode flip / unmount).
      for (const p of fx) {
        gsap.set(p.name, { x: 0 });
        gsap.set(p.media, { xPercent: 0 });
        p.circle.setAttribute("r", String(MASK_FINAL_R));
      }
    };
  }, [detected, mode]);

  const total = founders.length;

  // Copy below is verbatim from the retired founders-section.tsx.
  const eyebrow = isEn
    ? "Founder-led AI engineering studio"
    : "Studio di AI engineering guidato dai fondatori";

  const heading = (className?: string) => (
    <SectionHeading
      eyebrow={eyebrow}
      title={
        isEn ? (
          <>
            Built by engineers who{" "}
            <span className="font-display italic text-ink">
              ship production systems.
            </span>
          </>
        ) : (
          <>
            Costruito da ingegneri che{" "}
            <span className="font-display italic text-ink">
              portano sistemi in produzione.
            </span>
          </>
        )
      }
      description={
        isEn
          ? "Every engagement is owned by the people who scope, architect, and ship it. No account layer, no junior bench, no second team you didn't sign for."
          : "Ogni ingaggio è seguito dalle persone che ne definiscono lo scope, lo progettano e lo portano in produzione. Nessun livello di account, nessuna panchina di junior, nessun secondo team che non hai ingaggiato."
      }
      className={className}
    />
  );

  const panels = (liClass: string) => (
    <>
      {founders.map((f, i) => (
        <li key={f.anchor} data-founders-panel className={liClass}>
          <FounderPanel f={f} index={i} total={total} isEn={isEn} />
        </li>
      ))}
    </>
  );

  // Closer + CTA — carried over unchanged (the /start link that lived here
  // was removed in the restyle-step-2 CTA dedupe; home keeps exactly three
  // /start moments, none of them in this section).
  const closing = (
    <div className="container-px flex flex-col gap-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-14">
      <p className="max-w-2xl text-[14px] text-ink-mute leading-relaxed">
        {isEn ? (
          <>
            Read by one of us, not a queue. Briefs sent through{" "}
            <span className="text-ink">/start</span> get a reply within one
            business day.
          </>
        ) : (
          <>
            Letto da uno di noi, non da una coda. I brief inviati tramite{" "}
            <span className="text-ink">/start</span> ricevono risposta entro un
            giorno lavorativo.
          </>
        )}
      </p>
      <Link
        href="/about"
        className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors shrink-0"
      >
        {isEn ? "Full founder bios" : "Bio complete dei fondatori"}
        <ArrowUpRight
          className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden="true"
        />
      </Link>
    </div>
  );

  const portraitStyle = <style>{PORTRAIT_CSS}</style>;

  // Native fallback: normal-flow section, browser-owned horizontal scroll
  // with snap points. No pinning, no per-frame transforms; the reveal masks
  // keep their SSR final radius (portraits simply visible).
  if (detected && mode === "native") {
    return (
      <section
        id="founders"
        className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
      >
        <SectionGlow position="top-left" intensity={1.2} size="60rem" />
        <SectionGlow position="bottom-right" intensity={0.9} size="45rem" />
        <div className="container-px relative mb-8 sm:mb-10">{heading()}</div>
        <ul
          data-lenis-prevent
          className="relative flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={eyebrow}
        >
          {panels("snap-start shrink-0 w-[88vw] max-w-[30rem]")}
        </ul>
        {closing}
        {portraitStyle}
      </section>
    );
  }

  return (
    <section id="founders" className="relative scroll-mt-24">
      {/* The tall scroll runway: height = 100vh + travel, set in px by
          measure(). minHeight is the SSR placeholder before JS measures.
          The accent tint lives HERE (not on the sticky frame — the utility
          sets position:relative unlayered, which would beat Tailwind's
          layered `sticky` and break the pin). */}
      <div
        ref={sectionRef}
        className="section-accent-tint relative"
        style={{ minHeight: "100vh" }}
      >
        {/* Sticky viewport — this IS the pin (no pin-spacer, anchors stay
            valid). */}
        <div
          ref={stickyRef}
          className="sticky top-0 flex h-screen items-center overflow-hidden"
        >
          <SectionGlow position="top-left" intensity={1.2} size="60rem" />
          <SectionGlow position="bottom-right" intensity={0.9} size="45rem" />
          <ul
            ref={trackRef}
            className="relative flex w-max items-center gap-6 will-change-transform"
            style={{ paddingInline: "var(--margin)" }}
            aria-label={eyebrow}
          >
            {/* P0 — intro panel: the section heading rides the rail. */}
            <li className="flex w-[min(88vw,34rem)] shrink-0 items-center">
              {heading()}
            </li>
            {panels("w-[min(92vw,46rem)] shrink-0")}
          </ul>
        </div>
      </div>
      {closing}
      {portraitStyle}
    </section>
  );
}
