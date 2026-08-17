"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Workflow,
  Activity,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
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
 *     accent ring, the card being left dims back (opacity 0.5, scale 0.96) —
 *     per-card quickTo writers on an INNER wrapper, no React state per frame.
 *   - ALL per-frame math is analytic from measure()-cached untransformed
 *     offsetLeft/offsetTop centers — zero getBoundingClientRect in the loop.
 *
 * MODES: pinned (SSR default — desktop, fine pointer, no reduced-motion) /
 * native (≤768px, coarse pointer, prefers-reduced-motion): the unpinned
 * stacked grid, same cards, no transforms. Heading + closing line live in
 * normal flow OUTSIDE the runway in both modes.
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
 *     (`text-[2rem] sm:text-[4rem]`, …), so ≥640px resolves to today's value.
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
  icon: LucideIcon;
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
      icon: Boxes,
      title: isEn
        ? "AI-Native Software Development"
        : "Sviluppo software AI-native",
      positioning: isEn
        ? "Production software, AI wired in, not bolted on."
        : "Software in produzione, con l'AI integrata nel codice, non incollata sopra.",
      includes: isEn
        ? [
            "Full-stack product engineering",
            "Typed AI integration modules",
            "Eval harness running in CI",
            "Tracing from click to model to action",
          ]
        : [
            "Ingegneria di prodotto full-stack",
            "Moduli di integrazione AI tipizzati",
            "Eval harness eseguita in CI",
            "Tracing dal click al modello all'azione",
          ],
      solves: isEn
        ? [
            "Your agent works in demo, but fails in production.",
            "You need senior AI engineering judgment without hiring a full team.",
          ]
        : [
            "Il tuo agente funziona nelle demo, ma fallisce in produzione.",
            "Ti serve giudizio ingegneristico AI senior senza assumere un team completo.",
          ],
      ctaLabel: isEn ? "Engineering" : "Ingegneria",
      ctaHref: "/services/engineering",
    },
    {
      num: "02",
      icon: Workflow,
      title: isEn ? "Workflow Automation" : "Automazione dei flussi di lavoro",
      positioning: isEn
        ? "Automation that compounds, not breaks."
        : "Automazione che si consolida, non che si rompe.",
      includes: isEn
        ? [
            "LLM workflows wired into existing systems",
            "Human-in-the-loop where it matters",
            "Retry, rollback, dead-letter paths",
            "Cost-per-run instrumentation",
          ]
        : [
            "Flussi LLM integrati nei sistemi esistenti",
            "Human-in-the-loop dove conta",
            "Percorsi di retry, rollback, dead-letter",
            "Strumentazione del costo per esecuzione",
          ],
      solves: isEn
        ? ["Your automation stack is duct tape."]
        : ["Il tuo stack di automazioni è fatto di nastro adesivo."],
      ctaLabel: isEn ? "Automation" : "Automazione",
      ctaHref: "/services/automation",
    },
    {
      num: "03",
      icon: Activity,
      title: isEn ? "MLOps & Evaluation" : "MLOps e valutazione",
      positioning: isEn
        ? "Models in production, not in notebooks."
        : "Modelli in produzione, non nei notebook.",
      includes: isEn
        ? [
            "Evaluation suite: regression, drift, safety",
            "Deployment pipeline and model registry",
            "Monitoring: latency, cost, accuracy",
            "Shadow, canary, rollback paths",
          ]
        : [
            "Suite di valutazione: regressione, drift, sicurezza",
            "Pipeline di deployment e model registry",
            "Monitoraggio: latenza, costo, accuratezza",
            "Percorsi shadow, canary, rollback",
          ],
      solves: isEn
        ? ["Your models are still trapped in notebooks."]
        : ["I tuoi modelli sono ancora intrappolati nei notebook."],
      ctaLabel: isEn ? "MLOps" : "MLOps",
      ctaHref: "/services/mlops",
    },
    {
      num: "04",
      icon: ScanSearch,
      title: isEn ? "AI Architecture & Audits" : "Architettura e audit AI",
      positioning: isEn
        ? "Find what should not be built, before code becomes debt."
        : "Capire cosa non andrebbe costruito, prima che il codice diventi debito.",
      includes: isEn
        ? [
            "Systems audit: architecture, data, risk",
            "Build vs. buy vs. don't-build call",
            "Reference architecture and sequencing",
            "Risk register: technical and regulatory",
          ]
        : [
            "Audit dei sistemi: architettura, dati, rischio",
            "Decisione costruire, acquistare o non costruire",
            "Architettura di riferimento e sequenziamento",
            "Registro dei rischi: tecnici e normativi",
          ],
      solves: isEn
        ? [
            "You're about to commit engineering cycles to an AI product.",
            "You need readiness before a board, customer, or regulator.",
          ]
        : [
            "Stai per impegnare cicli di sviluppo su un prodotto AI.",
            "Ti serve essere pronti prima di un consiglio, un cliente o un'autorità.",
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
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-[hsl(var(--rule))] bg-[hsl(216_30%_8%/0.92)] p-6 sm:p-8 backdrop-blur-sm transition-colors duration-300 hover:border-[hsl(var(--accent)/0.45)]">
      {/* POV focus ring — opacity is driven to the card's focus value by a
          quickTo writer in pinned mode; inert (opacity 0) in the native grid.
          On the rail it is lit by `data-focus` on the CENTRED station (written
          by the stepper sync below): the touch answer to `:hover`, which on a
          phone is a gesture that does not exist. Scoped `max-sm:` so the
          ≥640px native branch (coarse tablet) stays inert — GSAP owns this
          opacity as an inline style in pinned mode and must never race a CSS
          transition. */}
      <span
        data-pov-focus
        aria-hidden="true"
        className={
          "pointer-events-none absolute inset-0 rounded-[inherit] border border-[hsl(var(--accent)/0.6)] opacity-0 shadow-[inset_0_1px_0_hsl(var(--accent)/0.4),0_0_48px_-12px_hsl(var(--accent)/0.55)]" +
          (compact
            ? " max-sm:transition-opacity max-sm:duration-500 max-sm:group-data-[focus=true]:opacity-100 motion-reduce:transition-none"
            : "")
        }
      />
      {/* Top-edge accent line — fades in on hover */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute top-0 left-0 right-0 h-px
          bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.7)] to-transparent
          opacity-0 group-hover:opacity-100
          transition-opacity duration-500
        "
      />
      {/* Soft radial sheen from top-left */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-0
          opacity-0 group-hover:opacity-100
          transition-opacity duration-500
        "
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 0% 0%, hsl(var(--accent) / 0.08) 0%, transparent 60%)",
        }}
      />
      {/* Header — editorial num + mono eyebrow + technical icon */}
      <div
        className={
          compact
            ? "mb-4 sm:mb-6 flex items-start justify-between gap-4"
            : "mb-6 flex items-start justify-between gap-4"
        }
      >
        <div className="flex items-baseline gap-3">
          <span
            className={
              compact
                ? "font-display text-[2rem] sm:text-[4rem] leading-[0.9] tracking-[-0.03em] text-[hsl(var(--accent)/0.9)]"
                : "font-display text-[3.25rem] sm:text-[4rem] leading-[0.9] tracking-[-0.03em] text-[hsl(var(--accent)/0.9)]"
            }
          >
            {service.num}
          </span>
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute">
            {isEn ? "Service" : "Servizio"}
          </span>
        </div>
        <span
          aria-hidden="true"
          className="grid place-items-center h-9 w-9 rounded-md border border-[hsl(var(--rule))] bg-[hsl(var(--accent)/0.05)] text-ink-mute group-hover:text-[hsl(var(--accent))] group-hover:border-[hsl(var(--accent)/0.4)] transition-colors duration-300"
        >
          <service.icon
            className="h-4 w-4 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[10deg] motion-reduce:transform-none motion-reduce:transition-none"
            strokeWidth={1.5}
          />
        </span>
      </div>

      <h3 className="font-display text-2xl sm:text-[28px] leading-[1.05] tracking-[-0.025em] text-ink mb-2">
        {service.title}
      </h3>
      <p
        className={
          compact
            ? "text-[15px] text-ink leading-snug mb-4 sm:mb-6"
            : "text-[15px] text-ink leading-snug mb-6"
        }
      >
        {service.positioning}
      </p>

      {/* Typical build includes — compact, scannable */}
      <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute mb-3">
        {isEn ? "Typical build includes" : "Un progetto tipico include"}
      </p>
      <ul
        className={
          compact
            ? "flex flex-col gap-1.5 mb-5 sm:gap-2 sm:mb-7"
            : "flex flex-col gap-2 mb-7"
        }
      >
        {service.includes.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2.5 text-[13.5px] text-ink-mute leading-snug"
          >
            <span
              aria-hidden="true"
              className="mt-[6px] block w-1 h-1 rounded-full bg-[hsl(var(--accent)/0.8)] shrink-0"
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {/* Solves — highlighted bottom strip. */}
      <div className="mt-auto -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 px-6 sm:px-8 py-4 border-t border-[hsl(var(--rule))] bg-[hsl(var(--accent)/0.04)] transition-shadow duration-300 group-hover:shadow-[inset_0_1px_0_hsl(var(--accent)/0.45),0_-8px_24px_-16px_hsl(var(--accent)/0.4)] motion-reduce:transition-none">
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
                ? "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors duration-200 sm:shrink-0 sm:self-center"
                : "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors duration-200 shrink-0 self-center"
            }
          >
            {service.ctaLabel}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(mobile || coarse || reduced ? "native" : "pinned");
    setDetected(true);
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

    // ---- Per-card focus writers (quickTo, no React state per frame).
    const fxCards = cardEls.map((el) => {
      const inner = el.querySelector<HTMLElement>("[data-pov-inner]");
      const ring = el.querySelector<HTMLElement>("[data-pov-focus]");
      if (inner) {
        gsap.set(inner, {
          opacity: DIM_OPACITY,
          scaleX: DIM_SCALE,
          scaleY: DIM_SCALE,
          transformOrigin: "50% 50%",
        });
      }
      if (ring) gsap.set(ring, { opacity: 0 });
      return {
        inner,
        ring,
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
        if (immediate) {
          if (fx.inner) gsap.set(fx.inner, { opacity: op, scaleX: sc, scaleY: sc });
          if (fx.ring) gsap.set(fx.ring, { opacity: g });
        } else {
          fx.opacityTo?.(op);
          fx.sxTo?.(sc);
          fx.syTo?.(sc);
          fx.ringTo?.(g);
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
      });
      runway.style.height = "";
    };
  }, [detected, mode, isEn]);

  const heading = (
    <SectionHeading
      eyebrow={isEn ? "What SerSan builds" : "Cosa costruisce SerSan"}
      title={
        isEn ? (
          <>
            Four services.{" "}
            <span className="font-display italic text-ink">One discipline.</span>
          </>
        ) : (
          <>
            Quattro servizi.{" "}
            <span className="font-display italic text-ink">Una sola disciplina.</span>
          </>
        )
      }
      description={
        isEn
          ? "Every engagement is delivered by senior engineers from scoping to handover. No account layer, no junior bench, no roadmap that quietly becomes a multi-year retainer."
          : "Ogni ingaggio è seguito da ingegneri senior, dallo scoping al passaggio di consegne. Nessun livello di account management, nessuna panchina di junior, nessuna roadmap che si trasforma silenziosamente in un retainer pluriennale."
      }
      className="mb-8 sm:mb-16 max-w-3xl"
    />
  );

  // Section closer — plain text only. The /start CTA that lived here was
  // removed in the restyle-step-2 CTA dedupe (home keeps exactly three
  // /start moments: spine handover, post-case-studies, FinalCTA).
  const closing = (
    <p className="max-w-xl text-[14px] text-ink-mute leading-relaxed">
      {isEn
        ? "Not sure which one fits? The scoping call diagnoses the problem first, then names the engagement."
        : "Non sai quale sia quello giusto? La call di scoping prima diagnostica il problema, poi definisce l'ingaggio."}
    </p>
  );

  // Native fallback (≤768px / coarse / reduced-motion): the unpinned stacked
  // grid — no runway, no transforms, browser-owned scroll.
  if (detected && mode === "native") {
    return (
      <section
        id="services"
        className="section-accent-tint section-accent-tint--strong relative section-lg scroll-mt-24 overflow-hidden"
      >
        <SectionGlow position="top-left" intensity={1.1} size="55rem" />
        <SectionGlow position="bottom-right" intensity={1} size="55rem" />
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
      className="section-accent-tint section-accent-tint--strong relative scroll-mt-24"
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
          <SectionGlow position="top-left" intensity={1.1} size="55rem" />
          <SectionGlow position="bottom-right" intensity={1} size="55rem" />
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
