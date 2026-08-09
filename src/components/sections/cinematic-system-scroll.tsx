"use client";

/**
 * CinematicSystemScroll — pinned 315vh cinematic spine of the homepage.
 *
 * One ScrollTrigger scrubs the CSS-sticky pin across 3 GROUPED panels
 * (hero · map · ship — the 5 canonical STAGE_CONTENT copy blocks compressed
 * via DESKTOP_GROUPS, restyle step 4 / merge option A). Scroll progress
 * (0..1) is written into progressRef on every ScrollTrigger update. The 3D
 * scene reads from progressRef each frame; no React state churn.
 *
 * STAGE 05 ("handover") IS NOT HERE (owner 2026-08-07: "hai duplicato la
 * sezione 05" — it rendered twice, spine + passage echo). Its full copy
 * block (eyebrow · title · body · proof chips · CTA cluster) now lives ONCE
 * as panel 1 of the singularity passage's horizontal track
 * (singularity-passage.tsx), which directly follows this section. The spine
 * runs 01→04 and hands the visitor to the passage at the pin end.
 *
 * Text panels are absolutely positioned over the scene and fade in/out
 * across their group range, with a small lead-in/lead-out. The site-wide
 * snap engine (lib/scroll-snap) settles wheel flicks onto each grouped
 * panel's MIDPOINT (plus progress 0), never 1 — a barrier at the pin end
 * vetoes settles crossing into the handoff, so leaving the spine is always
 * the visitor's own scroll (owner 2026-08-09: no scripted camera descent,
 * no page lock at the pin end — the passage owns the only camera move).
 *
 * Mobile (≤768px) returns to a normal stacked layout — no pin, no Canvas —
 * iterating the UNGROUPED 5 copy blocks (compression is desktop-only).
 */

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/magnetic";
import { HeroHoverLayer } from "@/components/hero-hover-layer";
import { HeroIntroGate } from "@/components/fx/hero-intro-gate";
import { useLanguage } from "@/components/language-provider";
import { useTextMorphStore } from "@/webgl/store/textMorphStore";
import { snapPoint, snapBarrier } from "@/lib/scroll-snap";
import type { Language } from "@/data/translations/types";
import { START_HREF } from "@/lib/site";
import { SPINE_HEIGHT_VH } from "@/lib/spine";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// === Stage definitions ====================================================
// Each stage carries both EN and IT copy. `localizeStages(language)` resolves
// them into a flat `Stage[]` for the active language; the default/SSR render
// is always English (the language provider starts at "en" on the server).
// Stages are pure COPY BLOCKS — the desktop scroll ranges live in
// DESKTOP_GROUPS below (a block can share a panel with a sibling).
type Stage = {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
  // Optional extra content rendered under the body. (Currently unused: the
  // handover stage that carried the proof-chip extras moved into the
  // singularity passage. The plumbing stays — it is generic panel
  // machinery any future block can use.)
  extras?: React.ReactNode;
};

type LocalizedStage = {
  id: string;
  eyebrow: { en: string; it: string };
  title: { en: React.ReactNode; it: React.ReactNode };
  body: { en: React.ReactNode; it: React.ReactNode };
  extras?: { en: React.ReactNode; it: React.ReactNode };
};

const STAGE_CONTENT: LocalizedStage[] = [
  {
    id: "dormant",
    eyebrow: {
      en: "AI engineering studio · production systems",
      it: "Studio di ingegneria AI · sistemi in produzione",
    },
    title: {
      en: (
        <>
          We build production software with{" "}
          <span className="text-[hsl(var(--accent))] font-display font-medium">
            AI agents
          </span>{" "}
          inside.
        </>
      ),
      it: (
        <>
          Costruiamo software di produzione con{" "}
          <span className="text-[hsl(var(--accent))] font-display font-medium">
            agenti AI
          </span>{" "}
          dentro.
        </>
      ),
    },
    body: {
      en: "SerSan builds custom software, AI agents, automations, MLOps architecture, and audit-ready systems for teams that need production reliability, not polished demos.",
      it: "SerSan costruisce software su misura, agenti AI, automazioni, architetture MLOps e sistemi pronti per l'audit per team che hanno bisogno di affidabilità in produzione, non di demo patinate.",
    },
  },
  {
    id: "signals",
    eyebrow: { en: "01 / Signals", it: "01 / Segnali" },
    title: {
      en: <>Every production system starts with messy signals.</>,
      it: <>Ogni sistema in produzione parte da segnali confusi.</>,
    },
    body: {
      en: "Roadmaps, workflows, tools, data, constraints, and risks. The first thing we do is map what you actually have, not what the deck says.",
      it: "Roadmap, workflow, strumenti, dati, vincoli e rischi. La prima cosa che facciamo è mappare ciò che avete davvero, non ciò che dice il deck.",
    },
  },
  {
    id: "audit",
    eyebrow: { en: "02 / Audit", it: "02 / Audit" },
    title: {
      en: (
        <>
          We find what{" "}
          <span className="text-[hsl(var(--accent))] font-display font-medium">
            should not
          </span>{" "}
          be built before code becomes debt.
        </>
      ),
      it: (
        <>
          Individuiamo cosa{" "}
          <span className="text-[hsl(var(--accent))] font-display font-medium">
            non va
          </span>{" "}
          costruito prima che il codice diventi debito.
        </>
      ),
    },
    body: {
      en: "Architecture, risk, cost, data quality, compliance, and failure modes. About a third of ideas don't survive this step. That's the point.",
      it: "Architettura, rischio, costi, qualità dei dati, compliance e modalità di guasto. Circa un terzo delle idee non supera questo passaggio. Ed è proprio il punto.",
    },
  },
  {
    id: "build",
    eyebrow: { en: "03 / Build", it: "03 / Sviluppo" },
    title: {
      en: <>Then we design and build the system.</>,
      it: <>Poi progettiamo e costruiamo il sistema.</>,
    },
    body: {
      en: "Agents, retrieval, automation, model workflows, APIs, and evaluation loops. Production-grade by the time it ships, not bolted on after launch.",
      it: "Agenti, retrieval, automazione, workflow di modelli, API e loop di valutazione. Pronto per la produzione già al rilascio, non aggiunto dopo il lancio.",
    },
  },
  {
    id: "operate",
    eyebrow: { en: "04 / Operate", it: "04 / Operatività" },
    title: {
      en: <>Production is not launch day.</>,
      it: <>La produzione non è il giorno del lancio.</>,
    },
    body: {
      en: "Monitoring, evals, human review, rollback paths, and handover are wired in from day one. The system that ships and the system in production are the same system.",
      it: "Monitoring, eval, revisione umana, percorsi di rollback e handover sono integrati dal primo giorno. Il sistema che rilasciate e il sistema in produzione sono lo stesso sistema.",
    },
  },
  // NOTE: the 6th canonical block ("handover", 05) moved WHOLESALE into
  // singularity-passage.tsx (HANDOVER_STAGE there) — panel 1 of the
  // horizontal track. One source, one render (owner 2026-08-07).
];

function localizeStages(language: Language): Stage[] {
  return STAGE_CONTENT.map((s) => ({
    id: s.id,
    eyebrow: s.eyebrow[language],
    title: s.title[language],
    body: s.body[language],
    extras: s.extras ? s.extras[language] : undefined,
  }));
}

// === Desktop grouping layer (restyle step 4 — merge option A) =============
// STAGE_CONTENT stays the canonical, byte-identical 5 copy blocks (the
// mobile fallback and the IT localisation iterate it UNGROUPED). The desktop
// pin renders them as 3 grouped panels: hero · map (signals+audit) · ship
// (build+operate). Ranges are fractions of the spine's own ScrollTrigger
// progress; the scrub travel is SPINE_HEIGHT_VH − 100vh = 215vh, so: hero
// 58vh (the 2026-06-10 hero-widening decision set a ~60vh readability floor
// — after the intro gate releases, "We build..." must survive real
// scrolling), map 81.7vh, ship 75.3vh — each group's REAL scroll length is
// unchanged from the 4-group layout; only the handover share was removed
// with its panel. The ship group gets NO end-of-pin special case (owner
// 2026-08-09: "da 04 a 05... la stessa animazione che c'è tra 02 e 03"):
// panelOpacity fades stage 04 out across its final band exactly like the map
// group's own exit — the 02→03 grammar — so the sticky stage scrolls away
// EMPTY (black space on black space, the section seam invisible) and section
// 05 materializes in place on the other side (the passage's PANEL_ENTER band
// mirrors this crossfade). The 04→05 handoff must never read as a scroll.
type StageGroup = {
  id: string;
  /** Spine-ScrollTrigger progress where this panel's lit window starts. */
  start: number;
  /** Progress where the lit window ends. Groups stay contiguous 0 → 1. */
  end: number;
  /** STAGE_CONTENT block ids rendered inside this panel (1-2, stage order). */
  blockIds: string[];
};

const DESKTOP_GROUPS: StageGroup[] = [
  { id: "hero", start: 0, end: 0.27, blockIds: ["dormant"] },
  { id: "map", start: 0.27, end: 0.65, blockIds: ["signals", "audit"] },
  { id: "ship", start: 0.65, end: 1, blockIds: ["build", "operate"] },
];

// Snap stations (2026-07-23 hardening — client: every scroll must come to
// rest ON a beat): the MIDPOINT of every grouped panel's range — maximal
// margin from both crossfade edges, so a settle always rests on a fully-lit
// panel. Never 1 (the pin end is the handoff into the singularity passage;
// a station there would park the visitor astride the seam — a barrier below
// vetoes any settle crossing it, so leaving the spine is always a deliberate
// user scroll). Progress 0 is registered separately as the "back to hero"
// station: a park at the very top is stable (the intro gate only re-engages
// on a further UP-wheel at y≈0, never on the settle itself).
const SNAP_STATION_PROGRESS = DESKTOP_GROUPS.map((g) => (g.start + g.end) / 2);

// CTA + hint labels used in the desktop spine, the mobile fallback, AND the
// singularity passage's panel 05 (exported: the passage renders the same
// ctaPrimary / seeSelectedWork strings on section 05's CTA cluster — one
// source, zero copy drift).
export const SPINE_COPY = {
  en: {
    ctaPrimary: "Book a 30-min scoping call",
    seeSelectedWork: "See selected work",
    // Hero cluster — the DOM payoff the intro gate releases onto (the
    // [data-hero-stagger] cascade in StagePanel's isHero branch). Eyebrow is
    // the brand's canonical positioning line (same string as the OG image).
    heroEyebrow: "AI-powered software engineering · London",
    heroSub:
      "We build it. We operate it. If it breaks at 3am, we're the ones who wake up.",
    // Intro-gate skip affordance (HeroIntroGate's bottom-right mono label).
    skipIntro: "Skip intro",
  },
  it: {
    ctaPrimary: "Prenota una call di scoping di 30 min",
    seeSelectedWork: "Guarda i nostri lavori",
    heroEyebrow: "Ingegneria software AI-powered · Londra",
    heroSub:
      "Lo costruiamo. Lo gestiamo. Se si rompe alle 3 di notte, siamo noi a svegliarci.",
    skipIntro: "Salta l'intro",
  },
} as const;

// Opacity for a panel given current progress + its stage range. The fade-in
// and fade-out happen STRICTLY INSIDE [start, end] so adjacent headlines never
// overlap — exactly one headline owns the screen at a time. The hero (start 0)
// stays lit at the very top (it must be visible at progress 0 for SSR); EVERY
// panel — the ship group included — fades out across its final band, so
// stage 04 dissolves in place just before the pin releases and the stage
// scrolls away empty (owner 2026-08-09: the 04→05 handoff reads like 02→03,
// never like a scroll).
function panelOpacity(
  progress: number,
  start: number,
  end: number,
  isHero = false,
): number {
  const fade = Math.min(0.03, (end - start) * 0.3);
  if (progress <= start) return isHero ? 1 : 0;
  if (progress >= end) return 0;
  let o = 1;
  if (!isHero && progress < start + fade) o = (progress - start) / fade;
  if (progress > end - fade) o = Math.min(o, (end - progress) / fade);
  return Math.max(0, o);
}

// === Stage panel ==========================================================
// Renders one DESKTOP_GROUPS entry. Single-block groups (the hero)
// look exactly like the pre-compression panels; merged groups render BOTH
// copy blocks inside one lit window — the first block as a compact companion
// (its own eyebrow + smaller heading + body), the second as the lead with
// the display-size title (research: "audit title leads, signals as the
// upper companion"; same two-block layout for build/operate). Eyebrow
// numbering order (01 before 02, 03 before 04) is preserved in the DOM.
function StagePanel({
  group,
  blocks,
  progressRef,
  isHero,
  copy,
}: {
  group: StageGroup;
  blocks: Stage[];
  progressRef: React.MutableRefObject<number>;
  isHero?: boolean;
  copy: (typeof SPINE_COPY)[Language];
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Drive opacity via rAF (no React re-renders). Early-returns when the
  // computed opacity is unchanged so an idle (un-scrolled) spine stops
  // thrashing styles.
  useEffect(() => {
    let raf = 0;
    let lastO = Number.NaN;
    let lastReveal = Number.NaN;
    let lastActive = false;
    // Last applied inert/aria state. Starts null so the FIRST tick always
    // syncs in BOTH directions: panels that start hidden get their inert/
    // pointer-events-none write as before, and the hero — which starts
    // VISIBLE but ships the class-level pointer-events-none every stacked
    // panel shares — gets its pointer-events:auto write too. (A `true` seed
    // here would skip that first flip and leave the hero's CTA cluster
    // click-dead on every path where the morph never activates.)
    let lit: boolean | null = null;
    let kids: HTMLElement[] | null = null;
    const tick = () => {
      const el = ref.current;
      const p = progressRef.current;
      // The WebGL text-particle intro (HeroTextParticles) owns the hero
      // headline visuals while active: the white H1 is SUPPRESSED for the
      // whole hero stay (the particle text IS the title — user decision
      // 2026-06-10), and the cluster below it ([data-hero-stagger]: eyebrow,
      // sub, CTA pair) cascades in as domReveal rises over the gate's final
      // stretch — the intro releases onto an actionable invitation, not an
      // empty frame. Inactive (any fallback) → everything renders visible
      // from first paint, no cascade.
      const morph = isHero ? useTextMorphStore.getState() : null;
      const active = !!(morph && morph.active);
      const reveal = active && morph ? morph.domReveal : 1;
      const baseO = panelOpacity(p, group.start, group.end, isHero);
      const o = baseO;
      if (el && (o !== lastO || (active && reveal !== lastReveal) || active !== lastActive)) {
        lastO = o;
        lastReveal = reveal;
        el.style.opacity = String(o);
        // Subtle Y offset for entry — anchored at the top of viewport. Uses
        // the BASE opacity so the H1 rect the particle system anchors to
        // never shifts while the morph hides it.
        const yOffset = (1 - baseO) * 16;
        el.style.transform = `translate3d(0, ${yOffset}px, 0)`;
        if (isHero) {
          const h1 = el.querySelector<HTMLElement>("[data-hero-headline]");
          if (active) {
            // The real H1 CROSSFADES IN as the particle title yields
            // (HeroTextParticles fades its whole block by 1-reveal): during
            // the journey the particles ARE the title; at rest the page hands
            // back to crisp DOM text — without this the released hero has no
            // headline at all. Opacity ONLY, never transform: the particle
            // system anchors to this element's live rect, so it must not
            // move. Reverse scrubbing mirrors automatically (pure in reveal).
            if (h1) {
              const hT = Math.min(1, Math.max(0, (reveal - 0.35) / 0.6));
              h1.style.opacity = String(hT * hT * (3 - 2 * hT));
            }
            if (!kids) {
              kids = Array.from(
                el.querySelectorAll<HTMLElement>("[data-hero-stagger]"),
              );
            }
            kids.forEach((k, i) => {
              const t = Math.min(
                1,
                Math.max(0, (reveal - i * 0.14) / 0.55),
              );
              const e = t * t * (3 - 2 * t); // smoothstep ease
              k.style.opacity = String(e);
              k.style.transform = `translate3d(0, ${(1 - e) * 26}px, 0)`;
            });
          } else if (lastActive) {
            // Morph torn down (unmount/fallback) → restore the plain hero.
            if (h1) h1.style.opacity = "";
            kids?.forEach((k) => {
              k.style.opacity = "";
              k.style.transform = "";
            });
          }
        }
        // Below this threshold the panel is visually hidden: disable pointer
        // events AND remove it from focus order + the a11y tree (inert).
        // With the intro active the panel only counts as visible once the
        // cascade is actually in (hidden CTAs must never be clickable).
        const visible = o > 0.6 && (!active || reveal > 0.5);
        if (visible !== lit) {
          lit = visible;
          el.style.pointerEvents = visible ? "auto" : "none";
          // `inert` exists on HTMLElement in current TS lib; cast for safety.
          (el as HTMLElement & { inert: boolean }).inert = !visible;
          if (visible) el.removeAttribute("aria-hidden");
          else el.setAttribute("aria-hidden", "true");
          // (The proof-chip count-up moved with stage 05 into the
          // singularity passage — no chips render inside the spine now.)
        }
        lastActive = active;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, group.start, group.end, isHero]);

  // Initial opacity is computed from progress = 0 so the hero stage (which
  // begins at start=0) is fully visible in the server-rendered HTML. The
  // rAF loop in useEffect takes over once JS hydrates. This makes the H1
  // present and visible without waiting for client hydration.
  const initialOpacity = panelOpacity(0, group.start, group.end, isHero);
  const initialY = (1 - initialOpacity) * 16;
  const initiallyHidden = initialOpacity <= 0.6;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute inset-0 flex pointer-events-none",
        // Every stage is vertically centered so the copy sits on the orb's
        // eyeline — orb (right) + copy (left) read as one balanced scene
        // instead of the orb floating high while the text sinks to the bottom
        // (the old `items-end` opened a large diagonal void on wide screens).
        // The hero keeps top padding so the eyebrow + first headline line never
        // slide under the fixed nav on short/laptop viewports (~600-720px).
        isHero
          ? "items-center pt-[max(var(--header-h),6rem)] pb-12 sm:pb-16"
          : "items-center pb-12 sm:pb-16",
      )}
      // Panels that start hidden are inert + removed from the a11y tree from
      // first paint; the rAF tick toggles this as stages light/dim.
      inert={initiallyHidden}
      aria-hidden={initiallyHidden || undefined}
      style={{
        opacity: initialOpacity,
        transform: `translate3d(0, ${initialY}px, 0)`,
        willChange: "opacity, transform",
      }}
    >
      <div className="container-px w-full">
        {/* relative z-10 (hero only): the copy block must paint/hit ABOVE the
            HeroHoverLayer sense overlay (z-[5], right 46%, full height) — on
            ~1000-1300px viewports the CTA row crosses the 54% mark and the
            overlay would otherwise swallow clicks on the secondary button's
            right half. Lifting the block costs the mark's hover-erode only
            the pixels over the copy itself. */}
        <div className={cn("max-w-[42rem]", isHero && "relative z-10")}>
          {isHero ? (
            <>
              {/* The page's H1 — typography source for the WebGL text-particle
                  intro (HeroTextParticles samples its computed style + width).
                  While the morph is active the rAF above drives it: opacity 0
                  through the journey (the particle text IS the title), then a
                  crossfade IN over the gate's last stretch as the particle
                  block yields — so the released hero rests on a real DOM
                  headline. On every fallback path it renders as a normal
                  visible H1. */}
              <h1
                data-hero-headline
                className="font-display text-[clamp(2.35rem,4.8vw,4.5rem)] leading-[0.98] tracking-[-0.03em] text-ink mb-4 text-balance"
              >
                {blocks[0]?.title}
              </h1>
              {/* Hero cluster — the [data-hero-stagger] targets of the
                  domReveal cascade (eyebrow → sub → CTAs rise 26px on a
                  smoothstep as the gate's last stretch plays out, while the
                  particle cue composes below). The cluster sits BELOW the H1
                  so the headline's sampled rect/width never shifts. It ships
                  VISIBLE (no inline hiding): on paths where the morph never
                  activates (non-WebGPU, no-JS) the cascade engine never
                  touches these nodes, so inline opacity:0 would orphan them
                  hidden forever — instead they follow the H1's own
                  discipline: visible by default, suppressed by the rAF only
                  while the morph owns the hero, restored on teardown. On the
                  WebGPU path the preloader curtain still covers the page when
                  `active` flips, so they never flash before the cascade. */}
              <p
                data-hero-stagger
                className="eyebrow inline-flex items-center gap-2 text-ink/80 mb-3"
              >
                <span aria-hidden="true" className="status-dot" />
                <span>{copy.heroEyebrow}</span>
              </p>
              <p
                data-hero-stagger
                className="text-base sm:text-lg text-foreground/80 leading-[1.55] max-w-[40rem]"
              >
                {copy.heroSub}
              </p>
              {/* pointer-events-auto: the panel itself is pointer-events-none
                  (stacked full-viewport siblings must not swallow input), and
                  without JS the rAF never flips it — the CTAs must still be
                  clickable on the SSR-only path. Hidden panels stay inert
                  (attribute in the SSR HTML + re-asserted by the rAF), and
                  inert blocks child pointer events regardless, so this can
                  never make an invisible CTA clickable. */}
              <div className="mt-7 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center pointer-events-auto">
                {/* The stagger wrappers own the cascade transform; Magnetic
                    owns its own x/y chase on the node inside — separate
                    elements so the two transform writers never clobber each
                    other. */}
                <div data-hero-stagger>
                  <Magnetic>
                    <Link href={START_HREF} className="block">
                      <Button variant="hero" size="xl" className="group">
                        {copy.ctaPrimary}
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </Magnetic>
                </div>
                <div data-hero-stagger>
                  <Link href="#work" className="block">
                    <Button variant="heroOutline" size="xl">
                      {copy.seeSelectedWork}
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          ) : (
            (() => {
              // Merged groups: every block but the last renders as a compact
              // companion ABOVE the lead — stage order (and the 01/02 eyebrow
              // numbering) preserved, while the second block's title carries
              // the display weight. Single-block groups have no companions
              // and render exactly the pre-compression panel.
              const lead = blocks[blocks.length - 1];
              const companions = blocks.slice(0, -1);
              if (!lead) return null;
              return (
                <>
                  {companions.map((block) => (
                    <div key={block.id} className="mb-7 sm:mb-9">
                      <p className="eyebrow inline-flex items-center gap-2 text-ink/80 mb-3">
                        <span aria-hidden="true" className="status-dot" />
                        <span>{block.eyebrow}</span>
                      </p>
                      <h2 className="font-display text-[clamp(1.35rem,2.3vw,1.9rem)] leading-[1.12] tracking-[-0.02em] text-ink mb-2.5 text-balance">
                        {block.title}
                      </h2>
                      <p className="text-sm sm:text-[15px] text-foreground/70 leading-[1.55] max-w-[36rem]">
                        {block.body}
                      </p>
                      {block.extras}
                    </div>
                  ))}
                  <p className="eyebrow inline-flex items-center gap-2 text-ink/80 mb-4">
                    <span aria-hidden="true" className="status-dot" />
                    <span>{lead.eyebrow}</span>
                  </p>
                  {/* Subsequent stages are H2s because the cinematic spine
                      reads as one section to crawlers. The lead title drops
                      one step in scale when it shares the panel with a
                      companion block (two blocks must fit laptop heights). */}
                  <h2
                    className={cn(
                      "font-display leading-[0.98] text-ink mb-5 text-balance",
                      companions.length > 0
                        ? "text-[clamp(2rem,3.6vw,3.25rem)] tracking-[-0.026em]"
                        : "text-[clamp(2.25rem,4.5vw,4rem)] tracking-[-0.028em]",
                    )}
                  >
                    {lead.title}
                  </h2>
                  <p className="text-base sm:text-lg text-foreground/80 leading-[1.55] max-w-[40rem]">
                    {lead.body}
                  </p>
                  {lead.extras}
                </>
              );
            })()
          )}
          {/* No closing CTA cluster here anymore: it belongs to stage 05,
              which renders once inside the singularity passage (panel 1 of
              the horizontal track) with the proof chips + both CTAs. */}
        </div>
      </div>
    </div>
  );
}

// === Stage progress indicator (left rail) =================================
// One tick per GROUPED panel (4 post-compression) — generated from
// DESKTOP_GROUPS so a range change renumbers it automatically.
function StageRail({
  progressRef,
  groups,
}: {
  progressRef: React.MutableRefObject<number>;
  groups: StageGroup[];
}) {
  const rail = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    let raf = 0;
    let lastP = Number.NaN;
    const tick = () => {
      const p = progressRef.current;
      if (p !== lastP) {
        lastP = p;
        groups.forEach((group, i) => {
          const el = rail.current[i];
          if (!el) return;
          const active = p >= group.start - 0.02 && p <= group.end + 0.02;
          // Quiet secondary detail: only the active tick lights (in accent);
          // everything else is a faint uniform rule. No past/future contrast.
          el.style.background = active
            ? "hsl(var(--accent) / 0.8)"
            : "hsl(var(--rule) / 0.5)";
          el.style.opacity = active ? "1" : "0.5";
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, groups]);

  return (
    <div className="hidden lg:flex absolute left-8 top-1/2 -translate-y-1/2 flex-col gap-3.5 z-20">
      {groups.map((s, i) => (
        <span
          key={s.id}
          ref={(el) => {
            rail.current[i] = el;
          }}
          className="block w-px h-7 rounded-full transition-[background-color,opacity] duration-300"
          style={{ background: "hsl(var(--rule) / 0.5)", opacity: 0.5 }}
        />
      ))}
    </div>
  );
}

// === Mobile fallback ======================================================
// Stacked layout used when the desktop pinned cinematic is too heavy.
// The hero panel (i === 0) renders an H1 so the page heading hierarchy
// stays consistent across viewports.
function MobileFallback({
  stages,
  copy,
}: {
  stages: Stage[];
  copy: (typeof SPINE_COPY)[Language];
}) {
  // (The proof-chip IO trigger moved with stage 05 into the singularity
  // passage — no chips render in this stacked path anymore.)
  return (
    <section className="relative">
      {stages.map((stage, i) => {
        const isHero = i === 0;
        return (
          <div
            key={stage.id}
            className={cn(
              "min-h-[80svh] flex items-center container-px py-20 border-b border-[hsl(var(--rule))]",
              // Hero clears the fixed nav so the eyebrow/H1 never sit under it
              // on short mobile/landscape heights.
              isHero && "relative overflow-hidden pt-[max(var(--header-h),6rem)]",
            )}
          >
            {isHero ? (
              // Ambient brand wash behind the hero copy. The old orb poster
              // image was removed (the live WebGL Saturn is the only hero
              // visual); this subtle navy radial keeps depth in the upper-right
              // without reintroducing any image asset.
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(125% 115% at 100% 0%, hsl(var(--accent) / 0.06) 0%, hsl(var(--bg) / 0.6) 30%, hsl(var(--bg) / 0.92) 58%, hsl(var(--bg)) 100%)",
                }}
              />
            ) : null}
            <div className={cn("max-w-2xl", isHero && "relative z-10")}>
              {/* The hero mirrors the desktop cluster (eyebrow · H1 · sub ·
                  CTA pair) STATICALLY: this stacked path has no cascade
                  engine, so the cluster simply ships visible from first
                  paint — no gating, no entrance choreography (correct for
                  reduced motion, which also lands here). Eyebrow reads above
                  the title like every other stacked block. */}
              <p className="eyebrow mb-4 inline-flex items-center gap-2 text-ink-mute">
                <span aria-hidden="true" className="status-dot" />
                <span>{isHero ? copy.heroEyebrow : stage.eyebrow}</span>
              </p>
              {isHero ? (
                <h1 className="font-display text-[clamp(2.25rem,8vw,3.25rem)] leading-[1.02] tracking-[-0.028em] text-ink mb-4">
                  {stage.title}
                </h1>
              ) : (
                <h2 className="font-display text-[clamp(2rem,7vw,3rem)] leading-[1.02] tracking-[-0.025em] text-ink mb-4">
                  {stage.title}
                </h2>
              )}
              <p className="text-base text-ink-mute leading-relaxed">
                {isHero ? copy.heroSub : stage.body}
              </p>
              {!isHero && stage.extras}
              {isHero ? (
                <div className="mt-6 flex flex-col gap-3">
                  <Link href={START_HREF}>
                    <Button variant="hero" size="xl" className="w-full">
                      {copy.ctaPrimary}
                    </Button>
                  </Link>
                  <Link href="#work">
                    <Button variant="heroOutline" size="xl" className="w-full">
                      {copy.seeSelectedWork}
                    </Button>
                  </Link>
                </div>
              ) : null}
              {/* The closing scoping CTA moved with stage 05 into the
                  singularity passage (fully readable vertical section on
                  this same viewport class, directly below). */}
            </div>
          </div>
        );
      })}
    </section>
  );
}

// === Main component =======================================================
export default function CinematicSystemScroll() {
  const { language } = useLanguage();
  const stages = localizeStages(language);
  const copy = SPINE_COPY[language];
  const outerRef = useRef<HTMLDivElement | null>(null);
  const leftScrimRef = useRef<HTMLDivElement | null>(null);
  const radialScrimRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<number>(0);
  // Default to desktop layout on the server so the hero H1 + subhead are
  // present in the initial HTML (good for SEO, first paint, accessibility).
  // The client detects mobile and switches after mount; the resulting
  // flash on a mobile cold-load is acceptable trade for an SSR'd hero.
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [hasDetectedViewport, setHasDetectedViewport] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const prevFallbackRef = useRef<boolean | null>(null);

  // Mode detection is a SUBSCRIPTION, not a one-shot sample: a window snapped
  // narrow, devtools docked, or an OS reduced-motion toggle must flip the path
  // live. Sampling once on mount kept the pinned spine alive with
  // measurements taken against a viewport that no longer exists.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mobileQ = window.matchMedia("(max-width: 768px)");
    const reducedQ = window.matchMedia("(prefers-reduced-motion: reduce)");
    const queries = [mobileQ, reducedQ];
    const sync = () => {
      setIsMobile(mobileQ.matches);
      setReduceMotion(reducedQ.matches);
      setHasDetectedViewport(true);
    };
    sync();
    queries.forEach((q) => q.addEventListener("change", sync));
    return () => queries.forEach((q) => q.removeEventListener("change", sync));
  }, []);

  // The spine (390vh runway) and the stacked fallback have very different
  // document heights, so a flip between them must re-measure every trigger on
  // the page — and an OS reduced-motion toggle fires no resize event, so
  // nothing else would. Deferred so the refresh reads the committed layout.
  const usesFallback = hasDetectedViewport && (isMobile || reduceMotion);
  useEffect(() => {
    if (!hasDetectedViewport) return;
    const prev = prevFallbackRef.current;
    prevFallbackRef.current = usesFallback;
    if (prev === null || prev === usesFallback) return;
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(raf);
  }, [hasDetectedViewport, usesFallback]);

  // (Removed: the orb-core poster image + its cross-fade machinery. The hero
  // visual is now owned entirely by the persistent WebGL Saturn; on a cold
  // load the hero is just the dark brand background + radial washes + the
  // SSR'd text until the canvas paints. Also previously removed: the JS
  // `new Image()` preloader that warmed orb-core + dead planet jpgs.)

  // (Removed: canvas-on-demand IntersectionObserver gate.) The spine is
  // the homepage hero — always in view from first paint, so the gate was
  // dead weight that could leave the canvas un-mounted if the observer's
  // first callback was deferred. The Canvas now mounts on first render.

  // (Removed: the mouse-smoothing rAF loop. Its only consumer was the live
  // WebGL scene, which was replaced by the static orb render — the smoothed
  // mouse position was no longer read anywhere, so the loop + its refs were
  // dead per-frame work.)

  // ScrollTrigger pin + scrub. Only attach once the viewport detection
  // has settled — otherwise on a mobile cold load we'd briefly pin to a
  // section that's about to be replaced by MobileFallback.
  // reduceMotion is a GUARD and a DEP, not just a render-branch input: it is
  // live-subscribed now, so a mid-session toggle must tear this down. Without
  // it the trigger and the Lenis snap points survive on a detached spine node
  // (the fallback has replaced it) and keep pulling the scroll position.
  useEffect(() => {
    if (!hasDetectedViewport || isMobile || reduceMotion) return;
    if (typeof window === "undefined") return;

    const outer = outerRef.current;
    if (!outer) return;

    const st = ScrollTrigger.create({
      trigger: outer,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      // No pin here — the inner stage uses CSS `position: sticky` which
      // already pins it visually. Adding ScrollTrigger.pin on top would
      // double-pin and break layout.
      onUpdate: (self) => {
        progressRef.current = self.progress;
      },
    });

    // --- Snap stations (site-wide engine, lib/scroll-snap) ----------------
    // Value-based getters measured LIVE at snap time, so no re-registration
    // cadence is needed: one per grouped-panel midpoint + progress 0 (the
    // "back to hero" park). The engine triggers only on user wheel input, so
    // the intro gate — which consumes wheel at capture before Lenis —
    // keeps it naturally quiet while engaged (the provider also hard-suspends
    // it on gateEngaged). The barrier at the pin end vetoes any settle that
    // would auto-glide the page across the handoff into the singularity
    // passage un-asked — leaving the spine stays the visitor's own scroll.
    // Reduced motion never creates Lenis, so no snap exists on that path by
    // construction.
    const stationAt = (p: number) => () => {
      const ih = window.innerHeight;
      const base = outer.getBoundingClientRect().top + window.scrollY;
      const travel = outer.offsetHeight - ih;
      return travel > 0 ? base + p * travel : Number.NaN;
    };
    const clearSnapPoints: Array<() => void> = [
      snapPoint(stationAt(0)),
      ...SNAP_STATION_PROGRESS.map((p) => snapPoint(stationAt(p))),
      snapBarrier(stationAt(1)),
    ];

    // Force a refresh after layout settles. Multiple short timeouts catch
    // late-arriving font / texture / canvas layout shifts. The final
    // resize listener catches mobile rotation + browser-chrome reveal.
    const refresh = () => {
      ScrollTrigger.refresh();
    };
    const ids = [60, 250, 700, 1500].map((ms) => window.setTimeout(refresh, ms));
    // Debounced resize handler — coalesce the event burst from a resize /
    // orientation change into a single re-measure once it settles.
    let resizeId = 0;
    const onResize = () => {
      window.clearTimeout(resizeId);
      resizeId = window.setTimeout(refresh, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      st.kill();
      ids.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(resizeId);
      window.removeEventListener("resize", onResize);
      clearSnapPoints.forEach((off) => off());
    };
  }, [isMobile, reduceMotion, hasDetectedViewport]);

  // Scrim dimmer: while the WebGL particle text owns the hero (textMorph
  // active, DOM headline hidden) the two center-left contrast scrims drop to
  // a whisper — they paint OVER the canvas and were swallowing the left half
  // of the particle text — then ease back to full exactly as domReveal brings
  // the crisp DOM H1 in (which is what they exist to keep readable). Inactive
  // morph (every fallback path) → opacity 1, identical to before.
  // Gated on the SAME condition as the render branch below: on the mobile /
  // reduced-motion fallback the two scrim nodes are never rendered, so this
  // loop would spin forever writing to permanently-null refs. The dep array
  // is widened accordingly so it also tears down if detection resolves into
  // the fallback (or an OS toggle flips into it) after mount.
  useEffect(() => {
    if (usesFallback) return;
    let raf = 0;
    let last = -1;
    const tick = () => {
      const m = useTextMorphStore.getState();
      const o = m.active ? 0.15 + 0.85 * m.domReveal : 1;
      if (o !== last) {
        last = o;
        const os = String(o);
        if (leftScrimRef.current) leftScrimRef.current.style.opacity = os;
        if (radialScrimRef.current) radialScrimRef.current.style.opacity = os;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [usesFallback]);

  // Mobile users — and anyone with prefers-reduced-motion (on any viewport)
  // — get the stacked fallback once detection has resolved. The pinned
  // scrub is motion-heavy by nature, so under reduced-motion we serve
  // the static stacked layout on desktop too. On the server we always render
  // the desktop layout, so the hero copy is in the initial HTML regardless.
  if (usesFallback) {
    return <MobileFallback stages={stages} copy={copy} />;
  }

  // Desktop blocks are looked up per group (the same localized array the
  // mobile fallback iterates ungrouped — one copy source, two layouts).
  const stageById = new Map(stages.map((s) => [s.id, s]));

  return (
    <section
      ref={outerRef}
      id="top"
      className="relative"
      // 315vh (2026-08-07: stage 05 moved into the singularity passage):
      // three grouped panels over a 215vh scrub. Each stage keeps 58-82vh of
      // scroll (above the ~60vh readability floor from the 2026-06-10
      // hero-widening decision); the pin releases straight into section 05 —
      // panel 1 of the passage's horizontal track.
      style={{ height: `${SPINE_HEIGHT_VH}vh` }}
    >
      {/* Pinned viewport. The text panels render immediately (so the H1 is in
          the initial paint). The hero visual is owned entirely by the
          persistent WebGL canvas (the procedural Saturn behind the DOM); no
          poster image is rendered here. During the brief cold-load gap before
          the canvas paints its first frame the hero is simply the dark brand
          background + the radial washes below + the SSR'd text. */}
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Left-side horizontal gradient — pushes the text panel's
            readability up by darkening the planet/nebula behind it on
            the left third of the viewport. Strongest near the left edge
            (where the H1 + paragraph sit), fading to transparent at the
            centre. Critical for the wider stage 0 / hero waypoint where
            the planet drifts left at the wide-shot camera.
            ScrimDimmer fades it (and the radial scrim below) way down while
            the WebGL particle text owns the hero — these overlays paint OVER
            the canvas and were eating the left half of the particle
            headline — and eases it back in as the DOM H1 reveals. */}
        <div
          ref={leftScrimRef}
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[58%] pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, hsl(var(--bg) / 0.88) 0%, hsl(var(--bg) / 0.45) 38%, transparent 74%)",
          }}
        />

        {/* Guaranteed text-contrast scrim. Sits directly behind the text
            column (center-left, where every panel now anchors) and above the
            orb + overlay, so the headline/body keep ≥4.5:1 contrast at ALL
            scroll positions — even when the bright orb drifts under the text on
            the push-in. Concentrated center-left and faded out toward the orb
            on the right so it never washes out the focal subject. */}
        <div
          ref={radialScrimRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(58% 85% at 0% 50%, hsl(var(--bg) / 0.85) 0%, hsl(var(--bg) / 0.4) 38%, transparent 72%)",
          }}
        />

        {/* Brand intro headline — "Sersan AI", the monumental opening beat.
            The WebGL text-particle intro (HeroTextParticles) assembles it out
            of a particle field on entry and melts it back out on the first
            scroll while the DOM hero cascades in. Restacked 2026-08-07
            (owner): the spore MARK now leads the lockup, parked centered
            ABOVE the viewport center (HeroLogo's LOCKUP_* constants, with the
            full derivation), and this wordmark sits BELOW it, smaller than
            before. The span is the PARTICLE ANCHOR + typography source
            (opacity 0 forever — the particles are the only visible render);
            hidden by default so every fallback path (no JS, mobile,
            non-WebGPU, reduced motion) never shows it — the H1 owns the hero
            as before. Decorative: the accessible heading stays the real H1. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span
            data-hero-brand
            // 9.5vw (was 13vw) + an +18vh push below the flex center: the mark
            // sits ABOVE this line now (see HeroLogo's LOCKUP_* block). The
            // translate is calibrated against the LIVE particle render, not
            // rect math — the WebGL lockup renders ~19vh above the DOM-center
            // mapping on a 1440×810 desktop (browser-verified 2026-08-07), so
            // +13vh landed the observed text center at ≈44vh from the frame
            // top; 13→18vh is the owner's 2026-08-07 5vh composition nudge
            // (taller viewports left dead space below) — center ≈49vh, top
            // ≈40.5vh, bottom ≈57.5vh, moved IN LOCKSTEP with HeroLogo's
            // LOCKUP_OFFSET_Y (−0.09→−0.04) and the eclipse yFrac
            // (−0.42→−0.47) so the whole hero drops coherently.
            // HeroTextParticles samples this rect + computed style (transforms
            // included), so the size/translate here IS the particle wordmark's
            // frame; the wrapper keeps X flex-centered.
            className="font-sans font-semibold text-[clamp(3.25rem,9.5vw,10rem)] leading-none tracking-[-0.045em] text-ink inline-block whitespace-nowrap"
            style={{
              opacity: 0,
              transform: "translateY(18vh)",
              willChange: "opacity",
            }}
          >
            Sersan AI
          </span>
        </div>

        {/* Stage rail (left) — one tick per grouped panel. */}
        <StageRail progressRef={progressRef} groups={DESKTOP_GROUPS} />

        {/* Grouped stage panels stacked, each fades in/out strictly inside
            its range. The hero group (index 0) is the page H1 (lit at
            progress 0 for SSR); the ship group dissolves in place across its
            final band, so the sticky stage scrolls away EMPTY and section 05
            materializes inside the passage on the other side of the seam
            (the 02→03 crossfade grammar, owner 2026-08-09). */}
        {DESKTOP_GROUPS.map((group, i) => (
          <StagePanel
            key={group.id}
            group={group}
            blocks={group.blockIds
              .map((id) => stageById.get(id))
              .filter((s): s is Stage => s !== undefined)}
            progressRef={progressRef}
            isHero={i === 0}
            copy={copy}
          />
        ))}

        {/* No scroll hint here — the one-beat intro ends on the DOM hero
            cascade (domReveal), which hands straight into an actionable
            cluster (eyebrow · sub · CTAs), so a scroll label would be
            redundant chrome. */}

        {/* Hover-sense layer over the mark (right half) — gates the cursor
            erode/dissolve. Mounts only once the WebGL hero is live; wheel
            scrolling bubbles through. (The old drag-to-rotate capture was
            retired: nothing consumed the rotation, so the grab cursor
            promised an interaction that never happened.) */}
        <HeroHoverLayer />

        {/* Scroll hijack for the text intro: while the gate is engaged the
            page does NOT scroll — wheel/touch input only drives the
            "Sersan AI" → headline particle transition. Self-gates on the
            WebGL morph being active; inert on every fallback. Also renders
            the explicit skip affordance (Esc + the bottom-right mono label)
            — kept OUTSIDE the inert stage panels so it stays reachable while
            they are hidden. */}
        <HeroIntroGate skipLabel={copy.skipIntro} />

        {/* (Removed 2026-08-09, owner: the SpineExitGate camera-descent beat.
            It locked the page at the pin end and played a scripted one-viewport
            3D dive + DOM stage sweep-up into section 05, which read as a
            slide-up. Scrolling past the pin end is now plain scrolling; the
            SingularityPassage owns the only scripted camera move in the
            handoff — its rightward pan. The textMorphStore tilt fields
            (camTilt/tiltDone/tiltAnchorY/camDescend) stay: nothing drives them
            now, so their consumers degrade to no-ops at 0/false.) */}
      </div>
    </section>
  );
}

