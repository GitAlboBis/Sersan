"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";
import { POSITIONING, pick } from "@/data/copy";
import { getLenis } from "@/lib/lenis-singleton";
import { applyRailOverscroll } from "@/lib/rail-overscroll";
import { snapPoint } from "@/lib/scroll-snap";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * ServicesSection — "Four services, one discipline" as a POV camera pan
 * (cards/scroll refactor, work package E — template 2: GSAP motionPath POV).
 *
 * MECHANICS (same binding contract as case-studies-rail.tsx):
 *   - CSS `position: sticky` pins the viewport frame; the runway height is a
 *     px value set by measure() (100vh + SEGMENTS×~85vh — pure vh, so a font
 *     swap can never change document height). NO ScrollTrigger `pin:` (a
 *     pin-spacer would re-parent the section and break every
 *     [data-line-anchor] measurement). ONE ScrollTrigger, start "top top",
 *     end "bottom bottom", invalidateOnRefresh, onRefreshInit: measure.
 *   - Inside the sticky frame an oversized stage (150vw × 140vh) holds the
 *     four service cards at organic diagonal positions (% of stage, fixed
 *     rem card widths). The stage's CSS left/top center it in the frame, so
 *     gsap x/y are pure deltas from the overview pose (SSR paints the
 *     overview, no hydration jump).
 *
 * MOTION (the template's signature — scrub a TARGET, chase it with a
 * smoother; the stage transform is NEVER written from the scrub directly):
 *   - progress 0..1 → 4 chained segments. Segment 0 eases the FOCAL POINT
 *     from the stage center (overview) to card 0's center; segment i eases
 *     card i−1 → card i. smoothstep per segment (zero slope at both ends —
 *     C1 across beat boundaries).
 *   - The focal target feeds gsap.quickTo pair x/y (duration ~1.0, expo) on
 *     the stage; scale rides a separate full-frame wrapper with
 *     transform-origin at the viewport center (focal invariance: the focused
 *     point stays centered under any scale/rotation): overview ~0.75 between
 *     cards → 1.0 locked on a card, plus a subtle alternating ±2.5° rotation
 *     per segment (sine.inOut chase). scaleX/scaleY quickTo pair, never the
 *     `scale` shorthand (repo-wide "not eligible for reset" gotcha).
 *   - Focus states: the segment's target card brightens to full opacity +
 *     CONTOUR IGNITION (a gradient SVG perimeter that draws around the slab
 *     via a strokeDashoffset quickTo, completing at lock), the card being
 *     left dims back (opacity 0.5, scale 0.96) — per-card quickTo writers on
 *     an INNER wrapper, no React state per frame.
 *   - ALL per-frame math is analytic from measure()-cached untransformed
 *     offsetLeft/offsetTop centers — zero getBoundingClientRect in the loop.
 *
 * MODES: pinned (SSR default — desktop, fine pointer, no reduced-motion) /
 * native (≤768px, coarse pointer, prefers-reduced-motion): the unpinned
 * stacked grid, same cards, no transforms. Heading + closing line live in
 * normal flow OUTSIDE the runway in both modes. Detection is a LIVE
 * media-query subscription (B15, fit-section's D-18 idiom), not a one-shot
 * sample: a window snapped narrow, a devtools dock, or an OS reduced-motion
 * toggle after mount flips pinned↔native without a reload — old-mode GSAP /
 * ScrollTrigger state tears down through the effects' own cleanups and the
 * mode-flip effect issues a deferred ScrollTrigger.refresh().
 *
 * KEYBOARD: focusin on a card converts to the equivalent vertical scroll
 * (segment lock position) through Lenis — same convention as the work rail.
 * The data-line-anchor="services" wrapper lives in page.tsx and is untouched.
 *
 * ---------------------------------------------------------------------------
 * MOBILE (MOBILE_HOME_SPEC §5.2 — chunk E). "Le card enormi": the stacked
 * native grid measured 2550px / 3.02 viewports at 390×844, of which 2011px was
 * the card grid alone. Below 640px that grid becomes a LATERAL RAIL of four
 * stations plus a discrete `01 / 04` stepper, and `ServiceCard` gains a
 * `compact` pose. Budget: ≤1013px / 1.20vh.
 *
 * THE ≥640px CONTRACT (non-negotiable, and enforced by construction, not by
 * review): a 640px-wide viewport must render this file byte-for-byte as it did
 * before. Two mechanisms, and nothing else:
 *   - `ServiceCard`'s compact pose follows the spec table literally — every
 *     condensed class ships its `sm:` restoration on the same element
 *     (`text-[6rem] sm:text-[9rem]`, …), so ≥640px resolves to today's value.
 *   - The rail is purely ADDITIVE `max-sm:` utilities layered over the ORIGINAL
 *     grid class string, which is left untouched. Above 639px the media query
 *     simply does not match and the element is the grid it always was. Nothing
 *     needs to be "reset back"; there is nothing to get wrong.
 * The stepper is `sm:hidden` for the same reason.
 *
 * THE RAIL IS A NATIVE SCROLLER — `overflow-x-auto snap-x snap-mandatory`, and
 * that is the whole mechanism. No drag translator, no pointer capture, no
 * `preventDefault`: a custom translator cannot be written without contesting
 * iOS momentum and the OS edge-swipe, and a horizontal drag must never be able
 * to swallow vertical intent (MOBILE_HOME_SPEC §7). `data-lenis-prevent` keeps
 * smooth-scroll off the axis. `overscroll-behavior-x` is written inline by an
 * effect below — same rule as DragRail via `applyRailOverscroll`
 * (`lib/rail-overscroll`: auto on coarse, contain on fine with motion, cleared
 * on fine under reduced motion) — so all three rails on the home page chain
 * (or not) the same way.
 *
 * WHY THIS IS NOT `<DragRail variant="stations">` YET. Chunk H's primitive
 * (`components/ui/drag-rail`) did not exist when this was written, and when it
 * landed it turned out to be structurally unconditional — correctly so for the
 * two rails it was designed for, which are rails at EVERY width on their native
 * branch. Services is the one rail that must become a GRID again at ≥640px, and
 * `DragRail` writes `paddingInline` + `scrollPaddingInline` as INLINE STYLES,
 * which no `sm:` class can override: adopting it would inset the ≥640px grid by
 * its gutter and break the byte-identity contract above. Its affordance row
 * also always occupies space, and its children must be `<li>`.
 * So the scroller is inline here, deliberately shaped as `[scroller] +
 * [stepper]` over the same native primitive: once `DragRail` can scope its
 * scroller/affordance to a breakpoint (and expresses the gutter as a class
 * rather than an inline style), adopting it is a swap of two elements.
 *
 * CONTENT IS NEVER GATED BEHIND THE SWIPE. Every card's full text — all four
 * `includes`, both `solves` lines, the CTA — is in the DOM at all times. Three
 * of four cards sit behind a swipe VISUALLY (spec §8.2 records and accepts
 * that); no disclosure widget, nothing hidden from a screen reader, and the
 * stepper dots give direct keyboard/AT access to each station.
 */

type Service = {
  num: string;
  title: string;
  positioning: string;
  includes: string[];
  /** Buyer pains this service answers — moved verbatim from the retired
   *  UseCasesSection (restyle step 2: the six pains now lead the cards). */
  solves: string[];
  ctaLabel: string;
  ctaHref: string;
};

function getServices(isEn: boolean): Service[] {
  return [
    {
      num: "01",
      title: isEn
        ? "Custom Software & Platforms"
        : "Software e piattaforme su misura",
      positioning: isEn
        ? "The software your business runs on, built to fit."
        : "Il software su cui gira la vostra azienda, costruito su misura.",
      includes: isEn
        ? [
            "Internal tools and management systems",
            "Customer portals and web applications",
            "SaaS products and academy/LMS platforms",
            "Integrations across the tools you use",
          ]
        : [
            "Strumenti interni e gestionali",
            "Portali clienti e applicazioni web",
            "Prodotti SaaS e piattaforme LMS/academy",
            "Integrazioni con gli strumenti che usate",
          ],
      solves: isEn
        ? [
            "The tools you run on don't talk to each other.",
            "You need software built properly, without hiring a team.",
          ]
        : [
            "Gli strumenti che usate non si parlano tra loro.",
            "Vi serve software fatto bene, senza assumere un team.",
          ],
      ctaLabel: isEn ? "Engineering" : "Ingegneria",
      ctaHref: "/services/engineering",
    },
    {
      num: "02",
      title: isEn ? "Workflow Automation" : "Automazione dei flussi di lavoro",
      positioning: isEn
        ? "Start with the process that eats the most time."
        : "Si parte dal processo che consuma più tempo.",
      includes: isEn
        ? [
            "Repetitive back-office work, handed off",
            "Documents read, checked and filed",
            "Leads, orders and CRM data kept in sync",
            "Nothing lost: failures surfaced and retried",
          ]
        : [
            "Lavoro ripetitivo di back-office, delegato",
            "Documenti letti, controllati e archiviati",
            "Lead, ordini e dati CRM sempre allineati",
            "Niente si perde: errori visibili e ripresi",
          ],
      solves: isEn
        ? ["Your team retypes the same data every week."]
        : ["Il vostro team riscrive gli stessi dati ogni settimana."],
      ctaLabel: isEn ? "Automation" : "Automazione",
      ctaHref: "/services/automation",
    },
    {
      num: "03",
      title: isEn ? "AI Features & Reliability" : "Funzioni AI e affidabilità",
      positioning: isEn
        ? "AI that holds up once real customers use it."
        : "AI che regge quando la usano i clienti veri.",
      includes: isEn
        ? [
            "Assistants and copilots on your own content",
            "Agents that act, with the limits you set",
            "Tested against real cases before release",
            "Monitored live: cost, quality, accuracy",
          ]
        : [
            "Assistenti e copiloti sui vostri contenuti",
            "Agenti che agiscono, con i limiti che decidete",
            "Testati su casi reali prima del rilascio",
            "Monitorati dal vivo: costo, qualità, precisione",
          ],
      solves: isEn
        ? ["The AI demo impressed everyone, then stalled."]
        : ["La demo AI ha entusiasmato tutti, poi si è fermata."],
      ctaLabel: isEn ? "AI features" : "Funzioni AI",
      ctaHref: "/services/mlops",
    },
    {
      num: "04",
      title: isEn
        ? "Technical Audits & Product Strategy"
        : "Audit tecnici e strategia di prodotto",
      positioning: isEn
        ? "Find what should not be built, before code becomes debt."
        : "Capire cosa non andrebbe costruito, prima che il codice diventi debito.",
      includes: isEn
        ? [
            "Systems and process audit: where it hurts",
            "Build vs. buy vs. don't-build call",
            "Where AI would actually pay off",
            "Target architecture, sequenced and costed",
          ]
        : [
            "Audit di sistemi e processi: dove fa male",
            "Decisione costruire, acquistare o non costruire",
            "Dove l'AI conviene davvero",
            "Architettura di riferimento, sequenziata e stimata",
          ],
      solves: isEn
        ? [
            "You know what's broken, not what to build first.",
            "You need readiness before a board, customer, or regulator.",
          ]
        : [
            "Sapete cosa non funziona, non da dove partire.",
            "Vi serve essere pronti prima di un consiglio, un cliente o un'autorità.",
          ],
      ctaLabel: isEn ? "Architecture & Audits" : "Architettura e audit",
      ctaHref: "/services/architecture",
    },
  ];
}

/* ------------------------------------------------------------------------ */
/* POV-pan constants (all analytic; the runway height is pure vh so fonts    */
/* can never change document height → no downstream anchor drift).           */
/* ------------------------------------------------------------------------ */

/** 4 segments: overview→card0, then card0→1→2→3. */
const SEGMENTS = 4;
/** Scroll runway per segment, in viewport heights. Runway = (1 + 4×0.85)vh. */
const SEGMENT_VH = 0.85;
/** Stage zoom between cards (establishing shot) vs locked on a card. */
const OVERVIEW_SCALE = 0.75;
const LOCKED_SCALE = 1;
/** Subtle alternating stage roll while traveling between cards. */
const ROT_MAX_DEG = 2.5;
/** Unfocused-card dim pose (opacity / scale on the inner wrapper). */
const DIM_OPACITY = 0.5;
const DIM_SCALE = 0.96;
/** Contour-draw dash length — the rect's pathLength, so offset CONTOUR_LEN
 *  is fully undrawn and 0 is a complete perimeter (resolution-independent). */
const CONTOUR_LEN = 1000;

/** Organic diagonal card placements, % of the 150vw × 140vh stage. */
const STAGE_POS: { left: string; top: string }[] = [
  { left: "7%", top: "9%" },
  { left: "56%", top: "20%" },
  { left: "13%", top: "48%" },
  { left: "58%", top: "58%" },
];

const smoothstep = (t: number) => t * t * (3 - 2 * t);

function ServiceCard({
  service,
  isEn,
  compact = false,
}: {
  service: Service;
  isEn: boolean;
  /**
   * The rail-station pose (<640px only). Every class it switches on ships its
   * own `sm:` restoration, so a ≥640px viewport renders the pinned card
   * byte-for-byte whether this is true or false. Passing it is therefore safe
   * on the native branch, which a coarse 1024px tablet also reaches.
   */
  compact?: boolean;
}) {
  return (
    // The SLAB (2026-08-21 restyle): a chrome-less glass surface — no border
    // box, no icon tile, no boxed solves strip. The only "edge" is the top
    // hairline; zones inside separate on rule/0.5 hairlines. `isolate` pins a
    // stacking context so the ghost number's -z-10 stays INSIDE the slab
    // (above its background, below its content) even where backdrop-filter
    // is unsupported. Hover (fine pointer, via Tailwind's hover-hover gate):
    // lift + hairline brighten + ghost number up — 500ms --ease-lusion,
    // transform/opacity/color only.
    <article className="group isolate relative flex h-full flex-col overflow-hidden rounded-2xl bg-[hsl(216_30%_9%/0.55)] p-7 sm:p-9 backdrop-blur-md shadow-[0_28px_90px_-40px_hsl(220_60%_2%/0.85)] transition-transform duration-500 ease-[var(--ease-lusion)] hover:-translate-y-1 motion-reduce:transition-none motion-reduce:transform-none">
      {/* POV focus CONTOUR IGNITION (round-2 life pass — restyled from the
          left-edge glow: same element, same data attribute, same GSAP-owned
          opacity contract, PLUS a draw channel). The span is an inset-0 gate
          whose opacity a quickTo drives to the card's focus value g in pinned
          mode; inside it one SVG <rect> traces the slab's perimeter. The SAME
          g also drives strokeDashoffset 1000→0 through a second quickTo
          ([data-pov-draw]), so the contour DRAWS around the card as the POV
          camera arrives and completes exactly at lock. pathLength=1000 makes
          the dash math resolution-independent; vector-effect keeps the stroke
          1.5 screen-px under the stage's 0.75→1 zoom. The glow is a STATIC
          drop-shadow on the rect — never animated (zero filter-animation
          cost); only the parent span's opacity gates it. The svg is inset by
          half the stroke (0.75px) so the edge-centred stroke renders fully
          INSIDE the article's overflow-hidden clip; rx 15.25 keeps the drawn
          corner concentric with rounded-2xl (16px − 0.75). On the rail
          (<640px) a CSS-only twin lights it: `data-focus` on the CENTRED
          station (written by the stepper sync below) transitions the span's
          opacity AND the rect's stroke-dashoffset (560ms --ease-lusion) —
          scoped `max-sm:` exactly as before, so the ≥640px native branch
          (coarse tablet) stays inert and GSAP's inline styles never race a
          CSS transition in pinned mode. The un-focused state keeps its edge
          via the always-on top hairline below. */}
      <span
        data-pov-focus
        aria-hidden="true"
        className={
          "pointer-events-none absolute inset-0 opacity-0" +
          (compact
            ? " max-sm:transition-opacity max-sm:duration-500 max-sm:group-data-[focus=true]:opacity-100 motion-reduce:transition-none"
            : "")
        }
      >
        <svg
          className="absolute inset-[0.75px] h-[calc(100%-1.5px)] w-[calc(100%-1.5px)] overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={`pov-contour-${service.num}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#3BE1FF" />
              <stop offset="100%" stopColor="#2A7FFF" />
            </linearGradient>
          </defs>
          <rect
            data-pov-draw
            x="0"
            y="0"
            width="100%"
            height="100%"
            rx="15.25"
            fill="none"
            stroke={`url(#pov-contour-${service.num})`}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            pathLength={1000}
            strokeDasharray="1000"
            strokeDashoffset="1000"
            style={{ filter: "drop-shadow(0 0 12px hsl(var(--accent)/0.55))" }}
            className={
              compact
                ? "max-sm:transition-[stroke-dashoffset] max-sm:duration-[560ms] max-sm:ease-[var(--ease-lusion)] max-sm:group-data-[focus=true]:[stroke-dashoffset:0] motion-reduce:transition-none"
                : undefined
            }
          />
        </svg>
      </span>
      {/* Top hairline — the slab's only edge. Cyan→transparent, always on,
          brightens on hover (opacity only). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[hsl(var(--accent)/0.6)] to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500 ease-[var(--ease-lusion)] motion-reduce:transition-none"
      />
      {/* Ghost number — huge display-serif watermark behind the content
          (-z-10 inside the slab's own stacking context). Decorative twin of
          the num in the eyebrow row below, so it is aria-hidden. */}
      <span
        aria-hidden="true"
        className={
          "pointer-events-none select-none absolute -top-6 -left-2 -z-10 font-display leading-none tracking-[-0.04em] text-ink/[0.05] transition-colors duration-500 ease-[var(--ease-lusion)] group-hover:text-ink/[0.09] motion-reduce:transition-none " +
          (compact ? "text-[6rem] sm:text-[9rem]" : "text-[9rem]")
        }
      >
        {service.num}
      </span>

      {/* Eyebrow row — mono "SERVICE 01" (the existing label + num strings) */}
      <p
        className={
          compact
            ? "mb-4 sm:mb-6 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute"
            : "mb-6 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute"
        }
      >
        {isEn ? "Service" : "Servizio"} {service.num}
      </p>

      {/* Slab title — wrapped in an overflow clip so the pinned type
          choreography can play a masked single-line rise on first stage
          entry (round-2 type pass). The paddings extend the clip window for
          serif descenders/overshoot (same trick as .split-line-mask) and the
          negative/compensating margins cancel them, so layout is
          byte-identical: −4px top margin + 4px top padding lands the h3 on
          the same pixel, and 4px bottom padding + 4px bottom margin equals
          the old mb-2 (8px). Inert on the native branch — no transform is
          ever written there. */}
      <div className="overflow-hidden pt-1 -mt-1 px-1 -mx-1 pb-1 mb-1">
        <h3
          data-slab-title
          className="font-display text-[30px] sm:text-[34px] leading-[1.02] tracking-[-0.025em] text-ink"
        >
          {service.title}
        </h3>
      </div>
      <p
        className={
          compact
            ? "text-[15px] text-ink-mute leading-snug mb-4 sm:mb-6"
            : "text-[15px] text-ink-mute leading-snug mb-6"
        }
      >
        {service.positioning}
      </p>

      {/* Typical build includes — mono micro-list over a hairline, `+`
          markers (ASCII garnish) instead of bullet dots, tight stack. */}
      <div
        className={
          compact
            ? "border-t border-[hsl(var(--rule)/0.5)] pt-4 mb-5 sm:mb-7"
            : "border-t border-[hsl(var(--rule)/0.5)] pt-4 mb-7"
        }
      >
        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute mb-3">
          {isEn ? "Typical build includes" : "Un progetto tipico include"}
        </p>
        <ul className="flex flex-col">
          {service.includes.map((line) => (
            <li
              key={line}
              data-slab-include
              className="flex items-start gap-2 font-mono text-[12px] leading-relaxed text-ink-mute"
            >
              <span
                aria-hidden="true"
                className="select-none text-[hsl(var(--accent)/0.7)]"
              >
                +
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Solves — hairline zone (no -mx bleed, no bg fill, no inset shadow),
          CTA as a bare mono text link with a leading `->` arrow. */}
      <div className="mt-auto border-t border-[hsl(var(--rule)/0.5)] pt-4">
        {/* The measured epicentre: a `shrink-0` CTA sharing a 326px row with
            two ~55-character sentences made this strip 253px — 42% of card 04.
            Stacking the CTA under the copy below 640px is the whole fix. */}
        <div
          className={
            compact
              ? "flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              : "flex items-baseline justify-between gap-4"
          }
        >
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[hsl(var(--accent))] mb-1">
              {isEn ? "Solves" : "Risolve"}
            </p>
            <ul className="flex flex-col gap-1">
              {service.solves.map((line) => (
                <li
                  key={line}
                  className="text-[13px] text-ink-mute leading-snug"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <Link
            href={service.ctaHref}
            className={
              compact
                ? "group/cta inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors duration-200 sm:shrink-0 sm:self-center"
                : "group/cta inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors duration-200 shrink-0 self-center"
            }
          >
            <span
              aria-hidden="true"
              className="transition-transform duration-300 ease-[var(--ease-lusion)] group-hover/cta:translate-x-1 motion-reduce:transition-none motion-reduce:transform-none"
            >
              {"->"}
            </span>
            {service.ctaLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function ServicesSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const services = getServices(isEn);

  // SSR default = pinned markup so the card links are in the initial HTML —
  // same convention as the work rail / cinematic spine.
  const [mode, setMode] = useState<"pinned" | "native">("pinned");
  const [detected, setDetected] = useState(false);
  const prevModeRef = useRef<"pinned" | "native" | null>(null);

  const runwayRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // ---- Rail (native branch, <640px) ------------------------------------
  const railRef = useRef<HTMLDivElement | null>(null);
  const readoutRef = useRef<HTMLSpanElement | null>(null);
  const stepperRef = useRef<HTMLDivElement | null>(null);

  // ---- Round-2 type choreography ----------------------------------------
  // The annotation blur-fade and the slab-title stage entry are each
  // replay-free for the page's life (played refs survive re-renders and the
  // pinned↔native branch swap at detection time).
  const annotationRef = useRef<HTMLParagraphElement | null>(null);
  const annotationPlayedRef = useRef(false);
  const slabTypePlayedRef = useRef(false);

  /** Centre the i-th station. Native `scrollTo` — never a transform. */
  const scrollToStation = useCallback((index: number) => {
    const rail = railRef.current;
    const station = rail?.children[index] as HTMLElement | undefined;
    if (!rail || !station) return;
    const railBox = rail.getBoundingClientRect();
    const box = station.getBoundingClientRect();
    const left =
      rail.scrollLeft +
      (box.left - railBox.left) -
      (rail.clientWidth - box.width) / 2;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
  }, []);

  // Stepper sync. ONE passive scroll listener, rAF-coalesced, and the paint is
  // written straight to the DOM: a per-frame React state would re-render four
  // cards mid-swipe on the device class that can least afford it. All rect
  // reads happen before any write, so the frame never thrashes layout.
  // `isEn` is a dep because a language toggle re-renders the readout's text
  // node — re-running resets `last` and re-asserts the live value.
  //
  // It also writes `data-focus` on the centred station — the same attribute
  // and the same `[data-pov-focus]` contract `useCentreFocus` (lib/use-centre-
  // focus) uses everywhere else, so adopting the shared hook later is a
  // substitution. It is deliberately NOT the shared hook HERE: that hook's
  // centre band is a full-viewport-width horizontal strip, and MEASURED at
  // 390×844 a centred 86vw station leaves both neighbours peeking, so all
  // three intersect and three of four rings light at once — which says
  // nothing. The rail already knows exactly which station is centred; using
  // that answer lights exactly one, and costs no second IntersectionObserver.
  useEffect(() => {
    if (!detected || mode !== "native") return;
    const rail = railRef.current;
    const stepper = stepperRef.current;
    if (!rail || !stepper) return;

    const dots = Array.from(
      stepper.querySelectorAll<HTMLElement>("[data-station-dot]"),
    );
    let raf = 0;
    let last = -1;

    const sync = () => {
      raf = 0;
      const stations = Array.from(rail.children) as HTMLElement[];
      if (stations.length === 0) return;
      const railBox = rail.getBoundingClientRect();
      const mid = railBox.left + railBox.width / 2;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < stations.length; i++) {
        const box = stations[i].getBoundingClientRect();
        const dist = Math.abs(box.left + box.width / 2 - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      if (best === last) return;
      last = best;
      if (readoutRef.current) {
        readoutRef.current.textContent = dots[best]?.dataset.num ?? "";
      }
      for (let i = 0; i < dots.length; i++) {
        if (i === best) {
          dots[i].setAttribute("data-active", "true");
          dots[i].setAttribute("aria-current", "true");
        } else {
          dots[i].removeAttribute("data-active");
          dots[i].removeAttribute("aria-current");
        }
      }
      for (let i = 0; i < stations.length; i++) {
        const card = stations[i].querySelector("article");
        if (!card) continue;
        if (i === best) card.setAttribute("data-focus", "true");
        else card.removeAttribute("data-focus");
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };

    rail.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    sync();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      rail.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [detected, mode, isEn]);

  // Mode detection is a SUBSCRIPTION, not a one-shot sample (B15, D-18 —
  // fit-section's idiom): a window snapped narrow, a devtools dock, or an OS
  // reduced-motion toggle after mount must flip pinned↔native live. Sampling
  // once kept the pinned path alive with measurements taken against a
  // viewport that no longer exists. On a flip the old mode's state tears
  // down through the existing effect discipline — the scrub effect's cleanup
  // (closure-captured nodes, so the by-then-detached runway still releases
  // its px height) kills the ScrollTrigger/tweens/snap points, the native
  // effects (stepper sync, rail overscroll) unhook via their own cleanups —
  // and the mode-flip effect below re-measures with a deferred
  // ScrollTrigger.refresh(). When the queries never flip, sync() computes
  // the exact same value as the old one-shot: no behavior change.
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

  // A mode flip swaps the pinned runway (vh + travel px) for the unpinned
  // stacked grid, so document height moves — and nothing else re-measures on
  // this path (the provider deliberately never refreshes on "/"). Deferred so
  // the refresh reads the committed layout. Same form as the work rail /
  // fit-section / audit-week-timeline.
  //
  // `prev === null` is the FIRST detection. It is NOT a no-op: the server
  // renders `pinned`, so a phone landing on `native` here is what REMOVES the
  // runway from the document and every trigger below moves with it. Landing
  // on `pinned` changes nothing versus SSR (and the scrub effect below arms
  // right after and measures its own fresh height), so only that case stays
  // quiet.
  useEffect(() => {
    if (!detected) return;
    const prev = prevModeRef.current;
    prevModeRef.current = mode;
    if (prev === mode) return;
    if (prev === null && mode === "pinned") return;
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(raf);
  }, [detected, mode]);

  // Overscroll chaining on the native rail — same rule as DragRail via
  // `applyRailOverscroll` (lib/rail-overscroll; decision (2) in DragRail's
  // header), so the three rails on this page agree: `auto` on a coarse pointer
  // (`contain` would also block the OS edge-swipe a reader uses to leave the
  // page), `contain` on a fine pointer with motion (a trackpad flick past the
  // end must not chain into the browser's back navigation), cleared on a fine
  // pointer under reduced motion (cascade `auto`, MOBILE_REVIEW A2). Written
  // inline because globals.css's `.lenis.lenis-smooth [data-lenis-prevent]`
  // gives every prevent-marked scroller a blunt `contain` — but only WHILE a
  // smooth wheel scroll animates — and inline is the only origin that beats
  // that selector deterministically; a `max-sm:` utility could not. Both
  // queries subscribed, never sampled once (a mouse plugged into a tablet, a
  // devtools emulation flip, an OS motion-setting change must re-resolve
  // without a reload). At ≥640px the element is the plain grid, not a scroll
  // container, so the write is inert.
  useEffect(() => {
    if (!detected || mode !== "native") return;
    const el = railRef.current;
    if (!el || typeof window === "undefined") return;
    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      applyRailOverscroll(el, coarseQuery.matches, reducedQuery.matches);
    };
    apply();
    coarseQuery.addEventListener("change", apply);
    reducedQuery.addEventListener("change", apply);
    return () => {
      coarseQuery.removeEventListener("change", apply);
      reducedQuery.removeEventListener("change", apply);
      el.style.overscrollBehaviorX = "";
    };
  }, [detected, mode]);

  // POV-pan scrub — pinned mode only, after viewport detection settles.
  // isEn is a dep on purpose: an EN↔IT toggle changes card heights → the
  // cached centers/secTop go stale; a full rebuild re-measures (cheap, rare).
  useEffect(() => {
    if (!detected || mode !== "pinned") return;
    const runway = runwayRef.current;
    const sticky = stickyRef.current;
    const scaleWrap = scaleRef.current;
    const stage = stageRef.current;
    if (!runway || !sticky || !scaleWrap || !stage) return;

    const cardEls = Array.from(
      stage.querySelectorAll<HTMLElement>("[data-pov-card]"),
    );
    if (cardEls.length === 0) return;

    // Prime the FULL transform of every quickTo target once (repo convention
    // from CardTiltController: unrecorded components trip "not eligible for
    // reset" when a quickTo later touches them). scaleWrap's origin is the
    // viewport center — the focal point stays centered under scale/rotation.
    gsap.set(stage, { x: 0, y: 0 });
    gsap.set(scaleWrap, {
      scaleX: OVERVIEW_SCALE,
      scaleY: OVERVIEW_SCALE,
      rotation: 0,
      transformOrigin: "50% 50%",
    });

    // ---- POV smoothers (template 2's signature): the scrub only re-targets
    // these chasers; discontinuities in the target are absorbed here.
    const xTo = gsap.quickTo(stage, "x", { duration: 1.0, ease: "expo" });
    const yTo = gsap.quickTo(stage, "y", { duration: 1.0, ease: "expo" });
    const sxTo = gsap.quickTo(scaleWrap, "scaleX", { duration: 0.9, ease: "expo" });
    const syTo = gsap.quickTo(scaleWrap, "scaleY", { duration: 0.9, ease: "expo" });
    const rTo = gsap.quickTo(scaleWrap, "rotation", {
      duration: 1.0,
      ease: "sine.inOut",
    });

    // ---- Per-card focus writers (quickTo, no React state per frame). The
    // focus value g drives THREE channels per card: the inner dim/brighten,
    // the contour gate's opacity (ring), and the contour draw itself — a
    // strokeDashoffset quickTo on the [data-pov-draw] rect (CONTOUR_LEN→0 as
    // g goes 0→1, so the perimeter completes exactly at lock).
    const fxCards = cardEls.map((el) => {
      const inner = el.querySelector<HTMLElement>("[data-pov-inner]");
      const ring = el.querySelector<HTMLElement>("[data-pov-focus]");
      const draw = el.querySelector<SVGRectElement>("[data-pov-draw]");
      if (inner) {
        gsap.set(inner, {
          opacity: DIM_OPACITY,
          scaleX: DIM_SCALE,
          scaleY: DIM_SCALE,
          transformOrigin: "50% 50%",
        });
      }
      if (ring) gsap.set(ring, { opacity: 0 });
      if (draw) gsap.set(draw, { strokeDashoffset: CONTOUR_LEN });
      return {
        inner,
        ring,
        draw,
        opacityTo: inner
          ? gsap.quickTo(inner, "opacity", { duration: 0.6, ease: "power2.out" })
          : null,
        sxTo: inner
          ? gsap.quickTo(inner, "scaleX", { duration: 0.6, ease: "power2.out" })
          : null,
        syTo: inner
          ? gsap.quickTo(inner, "scaleY", { duration: 0.6, ease: "power2.out" })
          : null,
        ringTo: ring
          ? gsap.quickTo(ring, "opacity", { duration: 0.6, ease: "power2.out" })
          : null,
        drawTo: draw
          ? gsap.quickTo(draw, "strokeDashoffset", {
              duration: 0.6,
              ease: "power2.out",
            })
          : null,
        last: -1,
      };
    });

    // ---- Measurement (measure-time only; the frame loop reads these caches
    // — zero getBoundingClientRect per frame). offsetLeft/offsetTop are
    // layout offsets relative to the stage: untransformed by definition (the
    // focus transforms live on the inner wrapper, never the measured box).
    let vw = 0;
    let vh = 0;
    let travel = 0;
    let secTop = 0;
    let overview = { x: 0, y: 0 };
    let centers: { x: number; y: number }[] = [];

    const measure = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      travel = Math.round(vh * SEGMENTS * SEGMENT_VH);
      runway.style.height = `${vh + travel}px`;
      secTop = runway.getBoundingClientRect().top + window.scrollY;
      overview = { x: stage.offsetWidth / 2, y: stage.offsetHeight / 2 };
      centers = cardEls.map((el) => ({
        x: el.offsetLeft + el.offsetWidth / 2,
        y: el.offsetTop + el.offsetHeight / 2,
      }));
    };
    measure();

    // ---- Analytic focal path. The stage's CSS left/top already center it in
    // the frame, so the delta that puts stage-point f at the viewport center
    // is simply (overview − f) — and the overview pose is x = y = 0 (the SSR
    // paint). Scratch object reused every frame (no allocation in the loop).
    const target = { x: 0, y: 0, zoom: OVERVIEW_SCALE, rot: 0, seg: 0, ease: 0 };

    const computeTarget = (progress: number) => {
      const p = Math.min(Math.max(progress, 0), 1) * SEGMENTS;
      const seg = Math.min(SEGMENTS - 1, Math.floor(p));
      const segF = Math.min(1, p - seg);
      const e = smoothstep(segF);
      const from = seg === 0 ? overview : centers[seg - 1];
      const to = centers[seg] ?? overview;
      target.x = overview.x - (from.x + (to.x - from.x) * e);
      target.y = overview.y - (from.y + (to.y - from.y) * e);
      // Zoom: locked (1.0) on each card, dipping to the overview scale while
      // traveling; segment 0 rises out of the establishing shot instead.
      const dip = Math.sin(Math.PI * segF); // 0 → 1 → 0, C1 at both ends
      target.zoom =
        seg === 0
          ? OVERVIEW_SCALE + (LOCKED_SCALE - OVERVIEW_SCALE) * e
          : LOCKED_SCALE - (LOCKED_SCALE - OVERVIEW_SCALE) * dip;
      // Subtle alternating roll, zero at every lock point.
      target.rot =
        (seg % 2 === 0 ? 1 : -1) * ROT_MAX_DEG * dip * (seg === 0 ? e : 1);
      target.seg = seg;
      target.ease = e;
    };

    const applyPose = (immediate: boolean) => {
      if (immediate) {
        gsap.set(stage, { x: target.x, y: target.y });
        gsap.set(scaleWrap, {
          scaleX: target.zoom,
          scaleY: target.zoom,
          rotation: target.rot,
        });
      } else {
        xTo(target.x);
        yTo(target.y);
        sxTo(target.zoom);
        syTo(target.zoom);
        rTo(target.rot);
      }
    };

    const applyFocus = (seg: number, e: number, immediate: boolean) => {
      for (let i = 0; i < fxCards.length; i++) {
        const g = i === seg ? e : i === seg - 1 ? 1 - e : 0;
        const fx = fxCards[i];
        if (!immediate && Math.abs(g - fx.last) < 0.001) continue; // parked
        fx.last = g;
        const op = DIM_OPACITY + (1 - DIM_OPACITY) * g;
        const sc = DIM_SCALE + (1 - DIM_SCALE) * g;
        const dash = CONTOUR_LEN * (1 - g);
        if (immediate) {
          if (fx.inner) gsap.set(fx.inner, { opacity: op, scaleX: sc, scaleY: sc });
          if (fx.ring) gsap.set(fx.ring, { opacity: g });
          if (fx.draw) gsap.set(fx.draw, { strokeDashoffset: dash });
        } else {
          fx.opacityTo?.(op);
          fx.sxTo?.(sc);
          fx.syTo?.(sc);
          fx.ringTo?.(g);
          fx.drawTo?.(dash);
        }
      }
    };

    const snapToProgress = (progress: number) => {
      computeTarget(progress);
      applyPose(true);
      applyFocus(target.seg, target.ease, true);
    };

    const st = ScrollTrigger.create({
      trigger: runway,
      start: "top top",
      end: "bottom bottom", // progress hits 1 exactly when sticky releases
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      // Post-refresh (resize, spine bursts): snap — a smoothed glide across a
      // re-measured layout reads as drift, not intent.
      onRefresh: (self) => snapToProgress(self.progress),
      onUpdate: (self) => {
        computeTarget(self.progress);
        applyPose(false);
        applyFocus(target.seg, target.ease, false);
      },
    });
    // Init snap (the template's gsap.set-at-load): covers a reload that
    // restores a scroll position inside the runway — no fly-in from origin.
    snapToProgress(st.progress);

    // Site-wide snap stations (lib/scroll-snap): the runway start (the
    // establishing overview shot) + the four segment LOCK positions — the
    // exact Ys the focusin handler computes, where zoom=1 / rotation=0 and
    // card i is fully focused. Lazy getters over the live measure() vars, so
    // refreshes need no re-registration; a wheel settle mid-runway glides to
    // the nearest intentional pose instead of parking half-travelled.
    const clearSnapPoints: Array<() => void> = [
      snapPoint(() => secTop),
      ...Array.from({ length: SEGMENTS }, (_, i) =>
        snapPoint(() => secTop + (travel * (i + 1)) / SEGMENTS),
      ),
    ];

    // One-shot late refresh once webfonts land: the heading above the runway
    // reflows on font swap → secTop shifts (the provider deliberately never
    // refreshes on "/" — same caveat as the work rail).
    let fontsCancelled = false;
    document.fonts?.ready
      .then(() => {
        if (!fontsCancelled) ScrollTrigger.refresh();
      })
      .catch(() => {});

    // Keyboard: focusing a card (its CTA link) converts to the segment's lock
    // position through Lenis — the same code path as wheel input.
    const onFocusIn = (e: FocusEvent) => {
      const card = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-pov-card]",
      );
      if (!card) return;
      // Undo the browser's auto-scroll of the overflow:hidden sticky frame
      // BEFORE anything reads layout (the stage overflows on both axes).
      sticky.scrollLeft = 0;
      sticky.scrollTop = 0;
      const idx = Number(card.dataset.povIndex ?? 0);
      const targetY = secTop + (travel * (idx + 1)) / SEGMENTS;
      if (Math.abs(window.scrollY - targetY) < 2) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(targetY, { duration: 0.6 });
      else window.scrollTo({ top: targetY });
    };
    sticky.addEventListener("focusin", onFocusIn);

    return () => {
      fontsCancelled = true;
      sticky.removeEventListener("focusin", onFocusIn);
      clearSnapPoints.forEach((off) => off());
      st.kill();
      gsap.killTweensOf([stage, scaleWrap]);
      gsap.set(stage, { clearProps: "transform" });
      gsap.set(scaleWrap, { clearProps: "transform" });
      fxCards.forEach((fx) => {
        if (fx.inner) {
          gsap.killTweensOf(fx.inner);
          gsap.set(fx.inner, { clearProps: "transform,opacity" });
        }
        if (fx.ring) {
          gsap.killTweensOf(fx.ring);
          gsap.set(fx.ring, { clearProps: "opacity" });
        }
        if (fx.draw) {
          gsap.killTweensOf(fx.draw);
          // Clearing the inline style resurfaces the SVG attribute
          // (strokeDashoffset=1000) — the undrawn rest state.
          gsap.set(fx.draw, { clearProps: "strokeDashoffset" });
        }
      });
      runway.style.height = "";
    };
  }, [detected, mode, isEn]);

  // ---- Annotation blur-fade (round-2 type pass) --------------------------
  // The right-hung annotation focuses in ~0.3s after the chapter title's
  // masked line-rise fires (the h2 is owned by HeadingChoreographer, whose
  // trigger and this IO's -18% rootMargin resolve to the same scroll beat).
  // Mirrors the `Reveal` idiom: hidden only from this effect (SSR/no-JS/RM
  // paint stays visible), IO-triggered so SPA-nav mounts that land in view
  // still play, once per page life. Deps re-arm it on the detection-time
  // branch swap (the node remounts); the played ref keeps it replay-free.
  useEffect(() => {
    const el = annotationRef.current;
    if (!el || annotationPlayedRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      annotationPlayedRef.current = true;
      return;
    }
    gsap.set(el, { autoAlpha: 0, y: 14, filter: "blur(10px)" });
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            annotationPlayedRef.current = true;
            gsap.to(el, {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.9,
              delay: 0.3,
              ease: "expo.out",
              // Drop the settled filter/transform so the static element costs
              // nothing after the reveal.
              onComplete: () => gsap.set(el, { clearProps: "filter,transform" }),
            });
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -18% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      gsap.killTweensOf(el);
      // Never leave the copy hidden on teardown if the reveal hasn't played.
      if (!annotationPlayedRef.current) {
        gsap.set(el, { clearProps: "opacity,visibility,transform,filter" });
      }
    };
  }, [detected, mode]);

  // ---- Slab type choreography (round-2 type pass, pinned mode only) ------
  // First stage entry (IO-once on the sticky frame): each card's serif title
  // plays a masked single-line rise inside its overflow clip (yPercent 115 —
  // clears the wrapper's 4px descender window, same margin the
  // heading-choreographer documents), staggered 90ms by card index; the
  // card's `includes` lines fade up behind it at a 40ms stagger. Ghost
  // numbers get NO animation (they are watermarks). Replay-free; native mode
  // (which covers reduced-motion by construction) never primes, and an extra
  // RM guard covers an OS toggle between detection and entry. Hiding happens
  // only here (JS-on, motion-on), so SSR/no-JS/RM paint is always settled.
  useEffect(() => {
    if (!detected || mode !== "pinned") return;
    if (slabTypePlayedRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sticky = stickyRef.current;
    const stage = stageRef.current;
    if (!sticky || !stage) return;

    const cardEls = Array.from(
      stage.querySelectorAll<HTMLElement>("[data-pov-card]"),
    );
    if (cardEls.length === 0) return;

    const primed: HTMLElement[] = [];
    const tl = gsap.timeline({ paused: true });
    cardEls.forEach((card, i) => {
      const title = card.querySelector<HTMLElement>("[data-slab-title]");
      const includes = Array.from(
        card.querySelectorAll<HTMLElement>("[data-slab-include]"),
      );
      if (title) {
        primed.push(title);
        gsap.set(title, { yPercent: 115 });
        tl.to(
          title,
          { yPercent: 0, duration: 0.85, ease: "expo.out" },
          i * 0.09,
        );
      }
      if (includes.length > 0) {
        primed.push(...includes);
        gsap.set(includes, { autoAlpha: 0, y: 10 });
        tl.to(
          includes,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            ease: "expo.out",
            stagger: 0.04,
          },
          i * 0.09 + 0.3,
        );
      }
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            slabTypePlayedRef.current = true;
            tl.play();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0 },
    );
    io.observe(sticky);

    return () => {
      io.disconnect();
      tl.kill();
      // Teardown before entry (branch swap / unmount): restore the settled
      // paint — content must never stay hidden without a pending reveal.
      if (!slabTypePlayedRef.current && primed.length > 0) {
        gsap.set(primed, { clearProps: "transform,opacity,visibility" });
      }
    };
  }, [detected, mode]);

  // Chapter heading (2026-08-21 restyle, shared grammar): the title is
  // promoted to a chapter statement and the description moves to a right-hung
  // ~320px annotation on lg:. SectionHeading cannot express the two-column
  // pairing (its description is hard-wired under the title at paragraph
  // width), so the heading is composed locally — per the slab spec — instead
  // of forking the site-wide component. Round-2 type pass: the block no
  // longer rides `Reveal` — ONE reveal owner per element (the site rule):
  //   - eyebrow: `.eyebrow` WITHOUT [data-eyebrow-text] → the root-layout
  //     LabelScrambler mono decode;
  //   - h2: `data-split-reveal` → HeadingChoreographer's masked SplitText
  //     line-rise (yPercent 115→0, 90ms stagger, expo.out). key={language}:
  //     SplitText owns the subtree once split; an EN/IT swap must remount it
  //     or React reconciles against orphaned nodes (same contract as
  //     SectionHeading's h2);
  //   - annotation: the local blur-fade effect above (~0.3s after the title).
  // All strings byte-identical.
  const heading = (
    <div className="mb-8 sm:mb-16 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
      <div>
        <p className="eyebrow mb-5 inline-flex items-center gap-2 text-ink-mute">
          <span
            aria-hidden="true"
            className="inline-block w-6 h-px bg-[hsl(var(--accent))]"
          />
          <span>{isEn ? "What SerSan builds" : "Cosa costruisce SerSan"}</span>
        </p>
        <h2
          key={language}
          data-split-reveal
          className="font-display text-[clamp(2.75rem,4.6vw,5.5rem)] leading-[0.98] tracking-[-0.02em] text-ink text-balance"
        >
          {isEn ? (
            <>
              Four services.{" "}
              <span className="font-display italic text-ink">One discipline.</span>
            </>
          ) : (
            <>
              Quattro servizi.{" "}
              <span className="font-display italic text-ink">Una sola disciplina.</span>
            </>
          )}
        </h2>
      </div>
      <p
        ref={annotationRef}
        className="max-w-md text-[13px] leading-relaxed text-ink-mute"
      >
        {`${pick(isEn, POSITIONING.range)} ${pick(isEn, POSITIONING.core)}`}
      </p>
    </div>
  );

  // Section closer — plain text only. The /start CTA that lived here was
  // removed in the restyle-step-2 CTA dedupe (home keeps exactly three
  // /start moments: spine handover, post-case-studies, FinalCTA).
  const closing = (
    <p className="max-w-xl text-[14px] text-ink-mute leading-relaxed">
      {isEn
        ? "Not sure which one fits? Describe the problem. We'll tell you which one fits, and how small the first piece can be."
        : "Non sapete quale sia quello giusto? Descriveteci il problema. Vi diciamo quale ingaggio serve e quanto può essere piccolo il primo passo."}
    </p>
  );

  // Native fallback (≤768px / coarse / reduced-motion): the unpinned stacked
  // grid — no runway, no transforms, browser-owned scroll.
  if (detected && mode === "native") {
    return (
      <section
        id="services"
        // Round 7-3 (continuous-space spec §B.3): tint + glows removed at
        // BOTH mounts (this native path and the pinned POV path below stay
        // twins) — the DOM must not own section-sized ambience; the slab
        // hairlines + ghost numbers + the continuous GL field carry it.
        className="relative section-lg scroll-mt-24 overflow-hidden"
      >
        <div className="container-px relative">
          {heading}
          {/* Below 640px this is a lateral rail; at 640px and above it is the
              ORIGINAL grid, untouched — every rail utility is `max-sm:`, so
              above the breakpoint none of them exist. The negative inline
              margin cancels container-px's gutter and the padding pays it
              straight back, so station 01 lines up with the heading while the
              rail itself bleeds to the viewport edge and station 02 peeks.
              No `overscroll-x-*` utility here: `overscroll-behavior-x` is
              written by the inline effect above — same rule as DragRail via
              `applyRailOverscroll` (auto on coarse so the OS edge-swipe
              survives, contain on fine with motion, cleared under RM). */}
          <div
            ref={railRef}
            data-lenis-prevent
            className="
              grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6
              max-sm:flex max-sm:snap-x max-sm:snap-mandatory
              max-sm:overflow-x-auto
              max-sm:mx-[calc(var(--margin)*-1)] max-sm:px-[var(--margin)]
              max-sm:pb-2 max-sm:[scrollbar-width:none]
              max-sm:[&::-webkit-scrollbar]:hidden
            "
          >
            {services.map((s, i) => (
              <Reveal
                key={s.num}
                delay={i * 80}
                className="max-sm:w-[86vw] max-sm:max-w-[30rem] max-sm:shrink-0 max-sm:snap-center"
              >
                <ServiceCard service={s} isEn={isEn} compact />
              </Reveal>
            ))}
          </div>
          {/* Station stepper — a DISCRETE `01 / 04` readout, deliberately a
              different register from the continuous progress bar the two other
              rails carry. `sm:hidden`: above the breakpoint there is no rail to
              step. The dots are the keyboard/AT route to each station (the card
              CTAs are the other: focusing one scrolls it into view natively).
              44×44 hit area, pulled back to a 28px row with `-my-2` so the
              affordance costs the page almost nothing; focus ring comes from
              the global `:focus-visible` rule. */}
          <div
            ref={stepperRef}
            className="mt-3 flex items-center justify-between sm:hidden"
          >
            <p
              aria-hidden="true"
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute"
            >
              <span ref={readoutRef} className="text-ink">
                {services[0].num}
              </span>
              {" / "}
              {services[services.length - 1].num}
            </p>
            <div className="flex items-center">
              {services.map((s, i) => (
                <button
                  key={s.num}
                  type="button"
                  data-station-dot
                  data-num={s.num}
                  data-active={i === 0 ? "true" : undefined}
                  aria-current={i === 0 ? "true" : undefined}
                  onClick={() => scrollToStation(i)}
                  className="group/dot -my-2 grid h-11 w-11 place-items-center rounded-full"
                >
                  <span className="sr-only">{s.title}</span>
                  <span
                    aria-hidden="true"
                    className="
                      block h-[3px] w-5 rounded-full bg-[hsl(var(--rule))]
                      transition-colors duration-300 motion-reduce:transition-none
                      group-data-[active=true]/dot:bg-[hsl(var(--accent))]
                    "
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8 sm:mt-14">{closing}</div>
        </div>
      </section>
    );
  }

  // Pinned POV-pan layout (SSR default). NO overflow-hidden on the section —
  // an ancestor overflow-hidden would defeat position: sticky; clipping lives
  // on the sticky frame itself.
  return (
    <section
      id="services"
      // Round 7-3 (continuous-space spec §B.3): tint removed (twin of the
      // native mount above). The POV camera pan now sweeps over a seamless
      // field instead of a tinted block — the whole point of the de-block.
      className="relative scroll-mt-24"
    >
      {/* Heading — normal flow, above the runway. */}
      <div className="container-px relative pt-20 sm:pt-[6.5rem] lg:pt-32">
        {heading}
      </div>

      {/* The tall scroll runway: height = 100vh + SEGMENTS×85vh, set in px by
          measure(). minHeight is the SSR placeholder before JS measures. */}
      <div ref={runwayRef} className="relative" style={{ minHeight: "100vh" }}>
        {/* Sticky viewport — this IS the pin (no pin-spacer, anchors stay
            valid). Clips the oversized stage on both axes. */}
        <div
          ref={stickyRef}
          className="sticky top-0 h-screen overflow-hidden"
        >
          {/* (Round 7-3: the two SectionGlows that lived here were removed
              with the section tint — no sweeping edges under the POV pan.) */}
          {/* Zoom/roll wrapper — full-frame, transform-origin at the viewport
              center so the focused point stays centered under scale/rotation.
              SSR paints the overview scale (inline transform GSAP then owns). */}
          <div
            ref={scaleRef}
            className="absolute inset-0 will-change-transform"
            style={{ transform: `scale(${OVERVIEW_SCALE})` }}
          >
            {/* The oversized stage. CSS left/top center it in the frame so
                gsap x/y are pure deltas from the overview pose (x = y = 0). */}
            <div
              ref={stageRef}
              className="absolute h-[140vh] w-[150vw] will-change-transform"
              style={{ left: "calc(50% - 75vw)", top: "calc(50% - 70vh)" }}
            >
              {services.map((s, i) => (
                <div
                  key={s.num}
                  data-pov-card
                  data-pov-index={i}
                  className="absolute w-[min(84vw,30rem)]"
                  style={STAGE_POS[i]}
                >
                  {/* Inner wrapper carries the focus dim/brighten transforms so
                      the card box above stays untransformed for measure(). */}
                  <div data-pov-inner className="will-change-transform">
                    <ServiceCard service={s} isEn={isEn} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Closing line — normal flow, below the runway. */}
      <div className="container-px relative pt-12 sm:pt-14 pb-20 sm:pb-[6.5rem] lg:pb-32">
        {closing}
      </div>
    </section>
  );
}
