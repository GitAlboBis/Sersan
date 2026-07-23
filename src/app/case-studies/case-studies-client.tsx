"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { caseStudies, type CaseStudy } from "@/data/case-studies";
import { useLanguage } from "@/components/language-provider";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import WorkInProgress from "@/components/sections/work-in-progress";
import { CardImageDistort } from "@/components/fx/card-image-distort";
import { CardLogoReveal } from "@/components/fx/card-logo-reveal";
import { useFlipSource } from "@/lib/use-flip-source";
import { cn } from "@/lib/utils";

// Flip is already registered by the persistent flip-handoff overlay (root
// layout), so this adds no bundle weight — registering again is idempotent
// and keeps this module self-sufficient if the overlay is ever removed.
if (typeof window !== "undefined") gsap.registerPlugin(Flip, ScrollTrigger);

/**
 * Per-industry eyebrow tint — mirrors the home rail's INDUSTRY_COLOR map
 * (components/sections/case-studies-rail.tsx) so the archive grid speaks the
 * same card language. Kept as a local copy on purpose: importing it from the
 * rail module would pull gsap/ScrollTrigger/Draggable into this route's
 * bundle for one lookup table.
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

/* ------------------------------------------------------------------------- */
/* Sector filter rail + FLIP re-sort                                          */
/* ------------------------------------------------------------------------- */

/**
 * Spec-ordered sector rail (All · FinTech · Healthcare · Aerospace · Public
 * Sector · Industrial · Energy · Agritech), intersected with the sectors that
 * actually exist in the data: a sector with zero studies silently drops its
 * pill instead of offering a click that filters the grid into blankness.
 */
const SECTOR_ORDER: CaseStudy["industry"][] = [
  "FinTech",
  "Healthcare",
  "Aerospace",
  "Public Sector",
  "Industrial",
  "Energy",
  "Agritech",
];
const SECTORS = SECTOR_ORDER.filter((s) =>
  caseStudies.some((study) => study.industry === s),
);

type SectorFilter = "all" | CaseStudy["industry"];

/** URL slug for the ?filter= deep link ("Public Sector" → "public-sector"). */
const sectorSlug = (s: CaseStudy["industry"]) =>
  s.toLowerCase().replace(/\s+/g, "-");

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One mono filter pill. Eyebrow language (JetBrains Mono, uppercase, tracked)
 * with the site's dot idiom: the dot is ALWAYS in the layout (accent when
 * active, rule-grey at rest) so toggling never reflows the rail. h-9 keeps the
 * ≥36px tap height of the navbar's language pill (WCAG 2.5.8 target size);
 * keyboard focus is handled by the global :focus-visible ring.
 */
function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-cursor="link"
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-300",
        active
          ? "border-[hsl(var(--accent)/0.55)] bg-[hsl(var(--accent)/0.08)] text-ink"
          : "border-rule/80 text-ink-mute hover:border-rule hover:text-ink",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full transition-colors duration-300",
          active ? "bg-[hsl(var(--accent))]" : "bg-rule",
        )}
      />
      {label}
    </button>
  );
}

/**
 * useArchiveResort — entrance choreography + FLIP re-sort engine for the
 * archive grid. Deliberately a LOCAL twin of the hook in
 * resources/resources-client.tsx (same rationale as INDUSTRY_COLOR above:
 * the two archives stay independently tunable and neither route imports the
 * other's module for a shared hook).
 *
 * ENTRANCES — cards fade + rise 24px (0.85s expo.out) via ONE
 * IntersectionObserver over the card wrappers. Entries that arrive in the
 * SAME IO callback crossed the threshold together and stagger as one wave
 * (0.08s steps) instead of replaying a fixed per-row delay pair; a solo card
 * on a slow scroll enters alone. IO (not ScrollTrigger) so wrappers mounted
 * already-in-view after an SPA navigation still fire — same contract as
 * ui/reveal.tsx, which owned these entrances before the filter rail existed
 * (a Reveal wrapper can't be reused here: its once-only IO play would fight
 * the flip's onEnter when a filtered-out card returns).
 *
 * RE-SORT — the pill click calls arm() BEFORE the React state change:
 * Flip.getState captures the resting grid, React re-renders (display:none
 * via the `hidden` class — cards stay MOUNTED so Flip can classify
 * visible→hidden as "leaving" and hidden→visible as "entering", and so the
 * per-card zoom-handoff arming keeps stable element instances), then the
 * layout effect keyed on the filter plays Flip.from before paint: movers
 * glide (0.6s expo.inOut, 0.03 stagger, absolute so the grid re-packs
 * beneath them), leavers fall away (0.25s power2.in), enterers rise in
 * (0.4s expo.out). The CONTAINER itself is captured too, so the grid height
 * eases instead of snapping (no scrollbar jump). clearProps on complete:
 * transforms never rest on cards — critical because the [data-flip-source]
 * zoom flight measures card rects at click time.
 *
 * Reduced motion: arm() refuses to capture → the layout effect takes the
 * instant path (plain re-render + ScrollTrigger re-measure only).
 */
function useArchiveResort(
  containerRef: React.RefObject<HTMLDivElement | null>,
  filter: string,
) {
  const pendingState = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const mounted = useRef(false);

  const items = () =>
    containerRef.current
      ? Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(
            "[data-archive-item]",
          ),
        )
      : [];

  useEffect(() => {
    const els = items();
    if (!els.length) return;
    if (prefersReducedMotion()) {
      // Instant final state — SSR markup is already visible, so there is
      // nothing to set; just retire the choreography per element.
      els.forEach((el) => (el.dataset.entered = "1"));
      return;
    }
    const pending = els.filter((el) => el.dataset.entered !== "1");
    gsap.set(pending, { opacity: 0, y: 24 });
    const io = new IntersectionObserver(
      (entries) => {
        let wave = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          if (el.dataset.entered === "1") continue; // arm() got here first
          el.dataset.entered = "1";
          gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: 0.85,
            ease: "expo.out",
            delay: Math.min(wave++, 5) * 0.08,
            // Resting cards carry NO inline transform/opacity: the zoom
            // handoff and the next Flip capture both read clean rects.
            onComplete: () => gsap.set(el, { clearProps: "transform,opacity" }),
          });
        }
      },
      // -18% bottom rootMargin ≈ the old "top 82%" start (see ui/reveal.tsx).
      { rootMargin: "0px 0px -18% 0px", threshold: 0 },
    );
    pending.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      gsap.killTweensOf(pending);
    };
    // Mount-only: every card stays mounted across filter/language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const arm = () => {
    const container = containerRef.current;
    if (!container || prefersReducedMotion()) return; // instant swap instead
    const els = items();
    // Interrupted-flight discipline: force any in-flight re-sort to its END
    // state (progress 1 restores layout and runs its clearProps sweep) —
    // killing alone would strand absolute-positioned movers or half-faded
    // leavers, and the state captured below must be a RESTING layout.
    Flip.killFlipsOf([container, ...els], true);
    // Entrance tweens (running or still inside their wave delay) animate the
    // same transforms Flip is about to own. From the first filter interaction
    // the re-sort owns every wrapper: settle them all to the resting visible
    // state and retire the IO entrance for good. (Un-entered wrappers are
    // below the fold by definition — revealing them early is invisible, and
    // a flight that pulls one into the viewport SHOULD show it mid-glide.)
    gsap.killTweensOf(els);
    els.forEach((el) => (el.dataset.entered = "1"));
    gsap.set(els, { clearProps: "transform,opacity,visibility" });
    pendingState.current = Flip.getState([container, ...els]);
  };

  useLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const container = containerRef.current;
    const state = pendingState.current;
    pendingState.current = null;
    const els = items();
    if (!container || !state) {
      // Instant path — reduced motion, or the ?filter= deep-link init right
      // after mount. The document height still changed, so downstream
      // ScrollTriggers must re-measure (the signature line re-glues itself
      // separately via the section bus's body ResizeObserver).
      ScrollTrigger.refresh();
      return;
    }
    const tl = Flip.from(state, {
      targets: [container, ...els],
      duration: 0.6,
      ease: "expo.inOut",
      stagger: 0.03,
      // Movers/leavers leave document flow during the flight so the grid can
      // re-pack beneath them; the container is NOT absolutized — Flip eases
      // its width/height, which is what keeps the page height (and the
      // scrollbar) gliding instead of snapping.
      absolute: "[data-archive-item]",
      nested: false,
      onEnter: (entered) =>
        gsap.fromTo(
          entered,
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.4, ease: "expo.out" },
        ),
      onLeave: (left) =>
        gsap.to(left, {
          autoAlpha: 0,
          scale: 0.96,
          duration: 0.25,
          ease: "power2.in",
        }),
      onComplete: () => {
        // Never leave transforms resting on cards (zoom-handoff rect reads,
        // the next getState) — and hand the height back to natural flow.
        gsap.set(els, { clearProps: "transform,opacity,visibility" });
        gsap.set(container, { clearProps: "width,height" });
        ScrollTrigger.refresh();
      },
    });
    return () => {
      // Re-arms mid-flight are already force-completed inside arm(); this
      // only fires on unmount — jump to the end state so nothing ever rests
      // absolute or half-hidden while React tears the grid down.
      if (tl.isActive()) tl.progress(1).kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return arm;
}

/**
 * GridCard — one archive grid card, extracted so useFlipSource (a hook) is
 * called once per card at component top level (rules of hooks). The card markup
 * is unchanged from the inline version; the only additions are onClick +
 * data-flip-source on the <Link>: EVERY card arms the zoom-to-fullscreen
 * handoff (fx/flip-handoff-overlay) on a plain left click — arming is passive
 * (never preventDefault), the <Link> navigates natively while the clone
 * inflates above. Studies with a previewImage inflate the shot (even when the
 * grid shows their logo first — the zoom reveals the product and lands on the
 * detail hero); the rest inflate as a navy panel that cross-fades out.
 * Typography + the static STACK chips are aligned to the redesigned home rail
 * cards (visual language only — the grid keeps its layout, media priority and
 * wave entrances untouched).
 */
function GridCard({ study, isEn }: { study: CaseStudy; isEn: boolean }) {
  const engagement = isEn ? study.engagement : study.engagementIt;
  const role = isEn ? study.role : study.roleIt;
  const summary = isEn ? study.summary : study.summaryIt;
  // Hook called unconditionally; undefined src arms the image-less (navy
  // panel) variant of the zoom flight.
  const onFlip = useFlipSource(study.id, study.previewImage);
  // A brand logo (when present) takes priority over a product screenshot.
  const showLogo = Boolean(study.logoImage);
  const showPreview = !showLogo && Boolean(study.previewImage);
  const hasMedia = showLogo || showPreview;
  return (
    <Link
      href={`/case-studies/${study.id}`}
      data-cursor="view"
      className={
        hasMedia
          ? "card-steel group flex flex-col h-full p-7 card-has-distort"
          : "card-steel group flex flex-col h-full p-7"
      }
      aria-label={`${study.client}, ${engagement}`}
      onClick={onFlip}
      data-flip-source={study.id}
    >
      {showPreview && study.previewImage && (
        <CardImageDistort
          src={study.previewImage}
          alt={`${study.client} product preview`}
        />
      )}
      {showLogo && study.logoImage && <CardLogoReveal src={study.logoImage} />}
      <div className="relative z-10 flex flex-col h-full card-text-layer">
        <p
          className={`text-[10px] font-mono uppercase tracking-[0.16em] mb-3 ${INDUSTRY_COLOR[study.industry]}`}
        >
          {study.industry}
        </p>
        <h3 className="font-display text-2xl text-ink leading-tight mb-2 transition-colors duration-300 group-hover:text-[hsl(var(--accent))]">
          {study.client}
        </h3>
        <p className="font-mono text-[11.5px] text-ink-mute leading-relaxed mb-4">
          {engagement}
        </p>
        <p className="text-sm text-ink/85 leading-[1.55] line-clamp-4 mb-4">{summary}</p>
        {/* Static STACK chips — same pill language as the rail cards (data
            only: study.techStack). Inside the text layer, so on the distort
            cards they fade with the rest of the text when the shot reveals. */}
        {study.techStack.length > 0 && (
          <ul className="mb-6 flex flex-wrap gap-1.5">
            {study.techStack.slice(0, 4).map((tech) => (
              <li
                key={tech}
                className="rounded-full border border-[hsl(var(--rule)/0.8)] bg-[hsl(216_28%_12%/0.72)] px-2.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-ink-mute"
              >
                {tech}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute">
          <span className="transition-colors duration-300 group-hover:text-ink">
            {role}
          </span>
          {/* Arrow slides + fades in on hover (asset-free affordance). */}
          <ArrowRight className="w-3.5 h-3.5 -translate-x-1 opacity-50 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-[hsl(var(--accent))] motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:opacity-100" />
        </div>
      </div>
    </Link>
  );
}

export function CaseStudiesClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  // Sector filter — SSR always renders the full archive ("all"); a ?filter=
  // deep link applies after hydration (instant path, under the initial
  // reveal) so server and client markup never diverge.
  const [sector, setSector] = useState<SectorFilter>("all");
  const gridRef = useRef<HTMLDivElement | null>(null);
  const armResort = useArchiveResort(gridRef, sector);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("filter");
    if (!param) return;
    const match = SECTORS.find((s) => sectorSlug(s) === param.toLowerCase());
    if (match) setSector(match);
  }, []);

  const selectSector = (next: SectorFilter) => {
    if (next === sector) return;
    armResort(); // capture the resting layout BEFORE React re-renders
    setSector(next);
    // Deep-linkable choice: sync ?filter= via replaceState — no navigation,
    // no route transition, no scroll reset. Passing the existing
    // history.state keeps Next's App Router history entry intact.
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", sectorSlug(next));
    window.history.replaceState(window.history.state, "", url.toString());
  };

  const visibleCount =
    sector === "all"
      ? caseStudies.length
      : caseStudies.filter((s) => s.industry === sector).length;

  return (
    <div className="min-h-screen pt-24 relative">
      {/* Hero */}
      <section data-line-anchor="hero" data-snap className="py-20 sm:py-32 relative">
        <div className="container-px relative">
          {/* H1 outside the Reveal: the choreographer's line-mask reveal owns
              it (data-split-reveal) — no double animation. Eyebrow entrance =
              LabelScrambler decode; sub + divider keep the Reveal fade. */}
          <div className="max-w-3xl mx-auto text-center">
            <p className="eyebrow mb-6 inline-flex items-center justify-center gap-2">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--accent))" }}
                aria-hidden="true"
              />
              {isEn ? "Selected work" : "Lavori selezionati"}
            </p>
            {/* key={language}: SplitText owns this subtree once split; a language
                swap must remount it or React reconciles against orphaned nodes
                (same contract as SectionHeading's h2). */}
            <h1 key={language} data-split-reveal className="font-display text-[clamp(2.25rem,7vw,4.5rem)] leading-[1.15] tracking-[-0.025em] text-ink text-balance mb-8 pb-1">
              {isEn ? (
                <>
                  Engineering{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    track record.
                  </span>
                </>
              ) : (
                <>
                  Track record di{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    ingegneria.
                  </span>
                </>
              )}
            </h1>
            <Reveal delay={150}>
              <p className="text-base sm:text-lg text-ink-mute max-w-2xl mx-auto leading-[1.55]">
                {isEn
                  ? "AI-powered software CPTO Michele Sanna has shipped across tier-1 institutions, plus current Sersan product builds. Each entry labels the role and the delivery context."
                  : "Software AI-powered che il CPTO Michele Sanna ha portato in produzione in istituzioni tier-1, insieme ai build di prodotto attuali di Sersan. Ogni voce indica il ruolo e il contesto di delivery."}
              </p>
              <div
                className="mt-10 mx-auto h-px w-48 origin-center"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, hsl(var(--accent) / 0.6) 50%, transparent 100%)",
                }}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Grid + sector filter rail */}
      <section data-line-anchor="grid" className="py-16 sm:py-24">
        <div className="container-px">
          <div className="max-w-6xl mx-auto">
            <h2 className="sr-only">{isEn ? "Case studies" : "Case study"}</h2>

            {/* Filter rail — mono pills (spec: All · FinTech · … · Agritech)
                plus a live entry count. The count span REMOUNTS on every
                filter change (key), so the delegated LabelScrambler sees a
                fresh .eyebrow and decodes it once per change — one calm
                decode for the whole rail, never one per pill. It is
                aria-hidden (the decode mutates its text nodes); the sr-only
                status line is the assistive announcement, and each pill
                carries aria-pressed. Sector names stay untranslated in IT on
                purpose: the card eyebrows show them raw in both languages. */}
            <div className="mb-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div
                role="group"
                aria-label={
                  isEn
                    ? "Filter case studies by sector"
                    : "Filtra i case study per settore"
                }
                className="flex flex-wrap items-center gap-2"
              >
                <FilterPill
                  active={sector === "all"}
                  label={isEn ? "All" : "Tutti"}
                  onClick={() => selectSector("all")}
                />
                {SECTORS.map((s) => (
                  <FilterPill
                    key={s}
                    active={sector === s}
                    label={s}
                    onClick={() => selectSector(s)}
                  />
                ))}
              </div>
              <span key={sector} className="eyebrow ms-auto" aria-hidden="true">
                {visibleCount}{" "}
                {visibleCount === 1
                  ? isEn
                    ? "entry"
                    : "voce"
                  : isEn
                    ? "entries"
                    : "voci"}
              </span>
              <span className="sr-only" role="status">
                {isEn
                  ? `Showing ${visibleCount} of ${caseStudies.length} case studies`
                  : `${visibleCount} case study su ${caseStudies.length} visibili`}
              </span>
            </div>

            {/* relative: the FLIP re-sort absolutizes cards mid-flight — give
                them a positioning context that IS the grid. */}
            <div
              ref={gridRef}
              className="relative grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8"
            >
              {caseStudies.map((study) => {
                const hidden = sector !== "all" && study.industry !== sector;
                return (
                  /* Filtered-out cards are `hidden`, never UNMOUNTED: gsap
                     Flip needs leaving elements alive to animate them off,
                     display:none children vanish from the grid flow for
                     free, and stable instances preserve entrance state, the
                     per-card WebGL distort contexts and the zoom-handoff
                     arming across re-sorts. Card hover behavior (distort /
                     logo reveal / tilt) is documented on GridCard. */
                  <div
                    key={study.id}
                    data-archive-item=""
                    className={cn("h-full", hidden && "hidden")}
                  >
                    <GridCard study={study} isEn={isEn} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Work in progress — internal builds, shown after the shipped archive
          (restyle step 2: the archive grid leads, in-development work trails). */}
      <WorkInProgress variant="full" />

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

      {/* Closing CTA */}
      <section data-line-anchor="final-cta" data-snap className="section-lg relative">
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
              <Button asChild size="lg" className="px-10 py-7 text-base font-semibold rounded-full">
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
