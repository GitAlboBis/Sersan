"use client";

/**
 * CinematicSystemScroll — pinned 390vh cinematic spine of the homepage.
 *
 * One ScrollTrigger scrubs the CSS-sticky pin across 4 GROUPED panels
 * (hero · map · ship · handover — the 6 canonical STAGE_CONTENT copy blocks
 * compressed via DESKTOP_GROUPS, restyle step 4 / merge option A). Scroll
 * progress (0..1) is written into progressRef on every ScrollTrigger update.
 * The 3D scene reads from progressRef each frame; no React state churn.
 *
 * Text panels are absolutely positioned over the scene and fade in/out
 * across their group range, with a small lead-in/lead-out. lenis/snap softly
 * settles wheel flicks onto the INTERIOR group boundaries only — never 0
 * (HeroIntroGate owns the top) and never 1 (SpineExitGate owns the pin end).
 *
 * Mobile (≤768px) returns to a normal stacked layout — no pin, no Canvas —
 * iterating the UNGROUPED 6 copy blocks (compression is desktop-only).
 */

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Snap from "lenis/snap";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/magnetic";
import { HeroHoverLayer } from "@/components/hero-hover-layer";
import { HeroIntroGate } from "@/components/fx/hero-intro-gate";
import { useLanguage } from "@/components/language-provider";
import { useTextMorphStore } from "@/webgl/store/textMorphStore";
import { getLenis } from "@/lib/lenis-singleton";
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
  // Optional extra content rendered under the body — used on the final
  // handover stage to surface a proof bullet (categorical commit) and a
  // small credentials strip drawn from real founders.ts / case-studies.ts
  // data, right where the morph releases into the page.
  extras?: React.ReactNode;
};

type LocalizedStage = {
  id: string;
  eyebrow: { en: string; it: string };
  title: { en: React.ReactNode; it: React.ReactNode };
  body: { en: React.ReactNode; it: React.ReactNode };
  extras?: { en: React.ReactNode; it: React.ReactNode };
};

// === Proof-chip count-up ===================================================
// The handover stage's 13 / 5 / 1 proof chips count up ONCE, the first time
// their panel actually lights. Inside the pinned spine an IntersectionObserver
// or ScrollTrigger would be the WRONG trigger — the panel sits in the viewport
// for the whole pin and only *lights* via the rAF-driven panelOpacity —
// so the desktop trigger is the same `visible` threshold crossing that flips
// the panel's inert state. The mobile fallback is normal document flow and
// uses a standard one-shot IO instead.
//
// A11y contract mirrors CountUp (ui/count-up.tsx): sr-only static final value,
// aria-hidden animated span, direct textContent writes (no React state per
// frame), and reduced-motion never animates (the animated span ships with the
// final value in the SSR HTML, so "do nothing" = render the final value).
function ProofChip({ value, label }: { value: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="text-ink tabular-nums">
        <span className="sr-only">{value}</span>
        <span data-chip-count={value} aria-hidden="true">
          {value}
        </span>
      </span>
      <span>{label}</span>
    </li>
  );
}

function animateChipCount(node: HTMLElement) {
  // One-shot per DOM node. A language toggle remounts the chips (fresh nodes,
  // no flag), so a re-light after EN↔IT replays once — same re-arm semantics
  // as the site's other text engines.
  if (node.dataset.chipCounted === "1") return;
  node.dataset.chipCounted = "1";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const final = node.dataset.chipCount ?? "";
  const target = Number.parseInt(final, 10);
  if (!Number.isFinite(target)) return;
  const obj = { n: 0 };
  node.textContent = "0";
  gsap.to(obj, {
    n: target,
    duration: 0.8,
    ease: "expo.out",
    onUpdate: () => {
      if (!node.isConnected) return; // remounted mid-tween (language toggle)
      node.textContent = String(Math.round(obj.n));
    },
    onComplete: () => {
      if (node.isConnected) node.textContent = final;
    },
  });
}

function animateChipCounts(root: HTMLElement) {
  root
    .querySelectorAll<HTMLElement>("[data-chip-count]")
    .forEach((node) => animateChipCount(node));
}

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
  {
    id: "handover",
    eyebrow: { en: "05 / Handover", it: "05 / Consegna" },
    title: {
      en: (
        <>
          We hand over something you can{" "}
          <span className="text-[hsl(var(--accent))] font-display font-medium">
            run.
          </span>
        </>
      ),
      it: (
        <>
          Consegniamo un sistema che potete{" "}
          <span className="text-[hsl(var(--accent))] font-display font-medium">
            gestire.
          </span>
        </>
      ),
    },
    body: {
      en: "A production system with its evals, traces, and boundaries documented. Your team owns it from day one, and you talk to one of us, not an account manager.",
      it: "Un sistema in produzione con eval, trace e limiti documentati. Il vostro team lo gestisce dal primo giorno, e parlate con uno di noi, non con un account manager.",
    },
    // Closing proof (user decision 2026-06-10: rewired here from the hero,
    // where the {!isHero} render gates kept it dead code): categorical commit
    // + real counts pulled from the actual case-studies.ts data and
    // founders.ts credentials. No invented metrics.
    extras: {
      en: (
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-[13px] sm:text-[14px] font-mono uppercase tracking-[0.14em] text-ink/85 leading-relaxed">
            Custom Software <span aria-hidden="true">·</span> AI Agents{" "}
            <span aria-hidden="true">·</span> Automation{" "}
            <span aria-hidden="true">·</span> MLOps{" "}
            <span aria-hidden="true">·</span> Audits
            <br />
            <span className="text-ink-mute/80">
              For SaaS, fintech &amp; regulated teams
            </span>
          </p>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-ink/75 list-none">
            <ProofChip value="13" label="named engagements" />
            <li aria-hidden="true" className="text-ink-mute/55">/</li>
            <ProofChip value="5" label="tier-1 institutions" />
            <li aria-hidden="true" className="text-ink-mute/55">/</li>
            <ProofChip value="1" label="PhD, applied maths" />
          </ul>
        </div>
      ),
      it: (
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-[13px] sm:text-[14px] font-mono uppercase tracking-[0.14em] text-ink/85 leading-relaxed">
            Software su misura <span aria-hidden="true">·</span> Agenti AI{" "}
            <span aria-hidden="true">·</span> Automazione{" "}
            <span aria-hidden="true">·</span> MLOps{" "}
            <span aria-hidden="true">·</span> Audit
            <br />
            <span className="text-ink-mute/80">
              Per SaaS, fintech e team regolamentati
            </span>
          </p>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-ink/75 list-none">
            <ProofChip value="13" label="progetti nominali" />
            <li aria-hidden="true" className="text-ink-mute/55">/</li>
            <ProofChip value="5" label="istituzioni tier-1" />
            <li aria-hidden="true" className="text-ink-mute/55">/</li>
            <ProofChip value="1" label="PhD, matematica applicata" />
          </ul>
        </div>
      ),
    },
  },
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
// STAGE_CONTENT stays the canonical, byte-identical 6 copy blocks (the
// mobile fallback and the IT localisation iterate it UNGROUPED). The desktop
// pin renders them as 4 grouped panels: hero · map (signals+audit) · ship
// (build+operate) · handover. Ranges are fractions of the spine's own
// ScrollTrigger progress; the scrub travel is SPINE_HEIGHT_VH − 100vh =
// 290vh, so: hero 58vh (the 2026-06-10 hero-widening decision set a ~60vh
// readability floor — after the intro gate releases, "We build..." must
// survive real scrolling), map 81vh, ship 75vh, handover 75vh. The handover
// group MUST stay final: the proof-chip count-up and the CTA cluster key off
// the final panel's lit state.
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
  { id: "hero", start: 0, end: 0.2, blockIds: ["dormant"] },
  { id: "map", start: 0.2, end: 0.48, blockIds: ["signals", "audit"] },
  { id: "ship", start: 0.48, end: 0.74, blockIds: ["build", "operate"] },
  { id: "handover", start: 0.74, end: 1, blockIds: ["handover"] },
];

// Soft-snap targets: the INTERIOR group boundaries only — never 0 (the
// HeroIntroGate owns the top of the page) and never 1 (SpineExitGate owns
// the pin end; snapping there would double-trigger the camera-descent beat).
// Each target sits one panel-fade PAST its boundary: panelOpacity fades
// strictly INSIDE [start, end], so the exact boundary is a blank crossfade
// frame (outgoing panel already 0, incoming still 0) — the inset settles the
// scroll on the incoming panel at full opacity instead.
const INTERIOR_SNAP_PROGRESS = DESKTOP_GROUPS.slice(1).map(
  (g) => g.start + Math.min(0.03, (g.end - g.start) * 0.3),
);

// CTA + hint labels used in both the desktop spine and the mobile fallback.
const SPINE_COPY = {
  en: {
    ctaPrimary: "Book a 30-min scoping call",
    seeWhatWeBuild: "See what we build",
    seeSelectedWork: "See selected work",
    scroll: "Scroll",
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
    seeWhatWeBuild: "Guarda cosa costruiamo",
    seeSelectedWork: "Guarda i nostri lavori",
    scroll: "Scorri",
    heroEyebrow: "Ingegneria software AI-powered · Londra",
    heroSub:
      "Lo costruiamo. Lo gestiamo. Se si rompe alle 3 di notte, siamo noi a svegliarci.",
    skipIntro: "Salta l'intro",
  },
} as const;

// Opacity for a panel given current progress + its stage range. The fade-in
// and fade-out happen STRICTLY INSIDE [start, end] so adjacent headlines never
// overlap — exactly one headline owns the screen at a time. The hero (start 0)
// stays lit at the very top; the final panel stays lit at the very bottom.
function panelOpacity(
  progress: number,
  start: number,
  end: number,
  isHero = false,
  isFinal = false,
): number {
  const fade = Math.min(0.03, (end - start) * 0.3);
  if (progress <= start) return isHero ? 1 : 0;
  if (progress >= end) return isFinal ? 1 : 0;
  let o = 1;
  if (!isHero && progress < start + fade) o = (progress - start) / fade;
  if (!isFinal && progress > end - fade) o = Math.min(o, (end - progress) / fade);
  return Math.max(0, o);
}

// === Stage panel ==========================================================
// Renders one DESKTOP_GROUPS entry. Single-block groups (hero, handover)
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
  isFinal,
  isHero,
  copy,
}: {
  group: StageGroup;
  blocks: Stage[];
  progressRef: React.MutableRefObject<number>;
  isFinal?: boolean;
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
      const baseO = panelOpacity(p, group.start, group.end, isHero, isFinal);
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
          // First light of the handover panel → run the one-shot proof-chip
          // count-up (13/5/1). This lit-threshold crossing is the panel's only
          // honest "entered view" signal inside the pin; the per-node
          // data-chip-counted flag guards replays on later re-lights.
          if (visible && isFinal) animateChipCounts(el);
        }
        lastActive = active;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, group.start, group.end, isHero, isFinal]);

  // Initial opacity is computed from progress = 0 so the hero stage (which
  // begins at start=0) is fully visible in the server-rendered HTML. The
  // rAF loop in useEffect takes over once JS hydrates. This makes the H1
  // present and visible without waiting for client hydration.
  const initialOpacity = panelOpacity(0, group.start, group.end, isHero, isFinal);
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
          {isFinal ? (
            <div className="mt-7 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
              <Magnetic>
                <Link href={START_HREF} className="block">
                  <Button variant="hero" size="xl" className="group">
                    {copy.ctaPrimary}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
              </Magnetic>
              <Link href="#work" className="block">
                <Button variant="heroOutline" size="xl">
                  {copy.seeSelectedWork}
                </Button>
              </Link>
            </div>
          ) : null}
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
  const rootRef = useRef<HTMLElement | null>(null);

  // Proof chips (13/5/1) sit in NORMAL document flow here (no pin), so the
  // standard one-shot IO trigger applies. Re-runs when `stages` changes
  // (language toggle remounts the chips) to observe the fresh nodes;
  // animateChipCount itself bails under reduced motion, but skipping the
  // observer entirely keeps this path zero-cost for those users.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-chip-count]"),
    );
    if (targets.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            io.unobserve(entry.target);
            animateChipCount(entry.target as HTMLElement);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.4 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [stages]);

  return (
    <section ref={rootRef} className="relative">
      {stages.map((stage, i) => {
        const isHero = i === 0;
        const isFinal = i === stages.length - 1;
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
              {isFinal ? (
                <div className="mt-6 flex flex-col gap-3">
                  <Link href={START_HREF}>
                    <Button variant="hero" size="xl" className="w-full">
                      {copy.ctaPrimary}
                    </Button>
                  </Link>
                </div>
              ) : null}
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
  const stageRef = useRef<HTMLDivElement | null>(null);
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

    // --- Soft snap (lenis/snap, NOT ScrollTrigger snap) -------------------
    // Proximity-type: the debounced settle rides lenis.scrollTo with no
    // input lock, so a fresh wheel gesture cancels it naturally — a "soft
    // settle", never a fight with the Lenis lerp. Snap points are the
    // interior grouped boundaries only (INTERIOR_SNAP_PROGRESS); the snap
    // plugin triggers exclusively on Lenis' virtual-scroll (user input), so
    // its own programmatic scroll never re-triggers it, and the intro/exit
    // gates — which consume wheel at capture before Lenis sees it — keep it
    // naturally quiet while engaged. Reduced motion never creates Lenis, so
    // no snap exists on that path by construction.
    let snap: Snap | null = null;
    let clearSnapPoints: Array<() => void> = [];
    const registerSnapPoints = () => {
      if (!snap) return;
      clearSnapPoints.forEach((off) => off());
      clearSnapPoints = [];
      const ih = window.innerHeight;
      // Header-proof absolute base: the spine is the first section (top ≈ 0)
      // but measure it instead of assuming.
      const base = outer.getBoundingClientRect().top + window.scrollY;
      const travel = outer.offsetHeight - ih;
      if (travel <= 0) return;
      for (const p of INTERIOR_SNAP_PROGRESS) {
        clearSnapPoints.push(snap.add(Math.round(base + p * travel)));
      }
    };
    let unsubGate: (() => void) | null = null;
    const lenis = getLenis();
    if (lenis) {
      snap = new Snap(lenis, {
        type: "proximity",
        duration: 0.9,
        // Capture radius ≈ the crossfade neighbourhood of a boundary —
        // flicks that die mid-transition settle onto the incoming panel;
        // deliberate reading positions mid-stage are never pulled.
        distanceThreshold: "16%",
        debounce: 400,
      });
      registerSnapPoints();
      // Belt + braces: the intro gate already consumes input before Lenis,
      // but stop the snap outright while it's engaged so a pending debounce
      // can never land a scroll during the hijack.
      const syncGate = (engaged: boolean) => {
        if (!snap) return;
        if (engaged) snap.stop();
        else snap.start();
      };
      syncGate(useTextMorphStore.getState().gateEngaged);
      unsubGate = useTextMorphStore.subscribe((s) => syncGate(s.gateEngaged));
    }

    // Force a refresh after layout settles. Multiple short timeouts catch
    // late-arriving font / texture / canvas layout shifts. The final
    // resize listener catches mobile rotation + browser-chrome reveal.
    // Snap points re-derive on the same cadence (they are absolute px).
    const refresh = () => {
      ScrollTrigger.refresh();
      registerSnapPoints();
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
      unsubGate?.();
      clearSnapPoints.forEach((off) => off());
      snap?.destroy();
      snap = null;
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
      // 390vh (restyle step 4 — merge option A): four grouped panels over a
      // 290vh scrub. Each merged stage keeps 75-81vh of scroll (above the
      // ~60vh readability floor from the 2026-06-10 hero-widening decision)
      // while releasing the visitor into the page ~130vh sooner than the
      // previous 520vh six-panel spine.
      style={{ height: `${SPINE_HEIGHT_VH}vh` }}
    >
      {/* Pinned viewport. The text panels render immediately (so the H1 is in
          the initial paint). The hero visual is owned entirely by the
          persistent WebGL canvas (the procedural Saturn behind the DOM); no
          poster image is rendered here. During the brief cold-load gap before
          the canvas paints its first frame the hero is simply the dark brand
          background + the radial washes below + the SSR'd text. */}
      <div
        ref={stageRef}
        className="sticky top-0 h-screen overflow-hidden"
      >
        {/* Vignette gradient at bottom. Kept to the lower ~45% so it darkens
            the hex pedestal at the base of the orb (it fades into black as an
            intentional plinth instead of reading as a stray metallic block)
            WITHOUT swallowing the now-centered orb, whose glow sits above this
            band. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[45%] pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, hsl(var(--bg)) 0%, hsl(var(--bg) / 0.92) 24%, hsl(var(--bg) / 0.5) 58%, transparent 100%)",
          }}
        />

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

        {/* Brand intro headline — "Sersan AI", much larger than the H1. The
            WebGL text-particle intro (HeroTextParticles) reveals it at the top
            of the page and dissolves it into particles on the first scroll,
            which then recompose into the real headline. Hidden by default
            (opacity 0 inline) so every fallback path (no JS, mobile, non-
            WebGPU, reduced motion) never shows it — the H1 owns the hero as
            before. Decorative: the accessible heading stays the real H1. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center pointer-events-none pt-[max(var(--header-h),6rem)]"
        >
          <div className="container-px w-full">
            <span
              data-hero-brand
              // ml-[114px] ≈ the ~3cm right shift requested live (2026-06-10);
              // the span is the PARTICLE ANCHOR (opacity 0 forever), so
              // moving it moves the assembled "Sersan AI" particles.
              className="font-display text-[clamp(3.75rem,9vw,8.5rem)] leading-none tracking-[-0.03em] text-ink inline-block ml-[114px]"
              style={{ opacity: 0, willChange: "opacity" }}
            >
              Sersan AI
            </span>
          </div>
        </div>

        {/* Stage rail (left) — one tick per grouped panel. */}
        <StageRail progressRef={progressRef} groups={DESKTOP_GROUPS} />

        {/* Grouped stage panels stacked, each fades in during its range.
            The hero group (index 0) is the page H1; the final (handover)
            group carries the proof chips + scoping CTA cluster. */}
        {DESKTOP_GROUPS.map((group, i) => (
          <StagePanel
            key={group.id}
            group={group}
            blocks={group.blockIds
              .map((id) => stageById.get(id))
              .filter((s): s is Stage => s !== undefined)}
            progressRef={progressRef}
            isHero={i === 0}
            isFinal={i === DESKTOP_GROUPS.length - 1}
            copy={copy}
          />
        ))}

        {/* The old "Scroll" hint is gone — the particle intro now ends on the
            "see what we build" cue (third morph stage), which is the closing
            call to action instead of a scroll label. */}

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

        {/* The 3D camera-descent hand-off at the END of the spine (after
            stage 05) — locks the page once more and dives the WebGL camera
            AND the pinned DOM stage into the rest of the site. */}
        <SpineExitGate outerRef={outerRef} stageRef={stageRef} />
      </div>
    </section>
  );
}

// === Spine exit gate: the 3D camera-descent beat ==========================
// At the END of the pinned spine (stage 05 "handover" fully read), one more
// scroll hijacks the page a final time: the WebGL camera plays the immersive
// "head looks down" descent (textMorphStore.camTilt clock, applied by
// SignatureLine: monotonic ~1-viewport dive, pitch follows velocity) that
// carries the visitor into the rest of the site, then the page releases.
// Scrolling back up to the spine end replays it in reverse (the camera
// rises, head looks up). Time-driven like the intro beats — scroll only
// triggers and flips direction.
function SpineExitGate({
  outerRef,
  stageRef,
}: {
  outerRef: React.RefObject<HTMLDivElement | null>;
  stageRef: React.RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    let engaged = false;
    let target: 0 | 1 = 1;
    let raf = 0;
    let lastY = window.scrollY;
    let lastBottom = Number.NaN;
    let lastTilt = -1;
    let touchY: number | null = null;
    let prev = performance.now();

    const release = () => {
      if (!engaged) return;
      engaged = false;
      // FIX A3: drop any queued shake kicks with the lock — the user is
      // usually still turning the wheel when the beat completes, and a
      // pending gateKick would keep SignatureLine's under-damped camera
      // spring oscillating right over the landing hand-off.
      useTextMorphStore.setState({ gateKick: 0 });
      getLenis()?.start();
    };
    const engage = (dir: 0 | 1) => {
      engaged = true;
      target = dir;
      useTextMorphStore.setState({ tiltAnchorY: window.scrollY });
      getLenis()?.stop();
    };

    // While engaged: consume the gesture (page locked), feed the camera
    // shake, and let the gesture direction steer the beat (down → dive,
    // up → rise) so it stays fully reversible mid-flight.
    const consume = (deltaPx: number, e: Event) => {
      if (!engaged) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      target = deltaPx > 0 ? 1 : 0;
      useTextMorphStore.setState({
        gateKick: useTextMorphStore.getState().gateKick + deltaPx,
      });
    };
    const onWheel = (e: WheelEvent) => {
      const s = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 120 : 1;
      consume(e.deltaY * s, e);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY == null) return;
      const y = e.touches[0]?.clientY ?? touchY;
      consume((touchY - y) * 2.2, e);
      touchY = y;
    };

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - prev) / 1000, 1 / 30);
      prev = now;
      const outer = outerRef.current;
      if (outer) {
        const ih = window.innerHeight;
        const rect = outer.getBoundingClientRect();
        const y = window.scrollY;
        const st = useTextMorphStore.getState();
        if (!engaged) {
          // Engage ONLY on a plausible-speed CROSSING of the pin-end
          // boundary (smooth scrolling, < ~300px/frame) — never on mere
          // presence past it, and never on anchor-jump teleports, which
          // would otherwise yank the user back to the spine end.
          const crossedDown =
            Number.isFinite(lastBottom) &&
            lastBottom > ih + 2 &&
            rect.bottom <= ih + 2 &&
            lastBottom - rect.bottom < 300;
          const crossedUp =
            Number.isFinite(lastBottom) &&
            lastBottom < ih - 2 &&
            rect.bottom >= ih - 2 &&
            rect.bottom - lastBottom < 300;
          if (!st.tiltDone && y > lastY && crossedDown) {
            window.scrollBy(0, rect.bottom - ih); // align exactly at pin end
            engage(1);
          } else if (st.tiltDone && y < lastY && crossedUp) {
            window.scrollBy(0, rect.bottom - ih);
            engage(0);
          }
        } else {
          // Re-assert the Lenis stop every engaged frame (route code or the
          // intro gate could have restarted it).
          getLenis()?.stop();
          const cur = st.camTilt;
          if (cur !== target) {
            const dir = target > cur ? 1 : -1;
            const next = Math.min(1, Math.max(0, cur + (dir * dt) / 1.8));
            useTextMorphStore.setState({ camTilt: next });
            if (next >= 1) {
              useTextMorphStore.setState({ tiltDone: true });
              release();
              // Land the dive: glide the page one viewport down so the next
              // section arrives exactly as the camera move completes — the
              // beat genuinely CARRIES the visitor into the rest of the
              // site instead of dropping them on an empty frame.
              // FIX A3 — the glide must be C1 at BOTH ends of the hand-off:
              // the camera just eased to ZERO velocity (smoothstep'(1) = 0),
              // but the singleton's default out-expo easing starts at max
              // slope — a standstill→max-velocity kick in one frame. An
              // easeInOutCubic starts AND ends at zero slope, matching the
              // dive on entry and SignatureLine's one-viewport smoothstep
              // unwind on exit (desc hits 0 exactly as the glide lands).
              // lock: true keeps a mid-flight wheel notch from interrupting
              // or re-targeting the landing (the rubber-band).
              const lenis = getLenis();
              const dest = window.scrollY + ih;
              if (lenis) {
                lenis.scrollTo(dest, {
                  duration: 1.05,
                  lock: true,
                  easing: (t: number) =>
                    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
                });
              } else {
                window.scrollTo({ top: dest, behavior: "smooth" });
              }
            } else if (next <= 0) {
              useTextMorphStore.setState({ tiltDone: false });
              release();
            }
          }
          // Safety valve: if the page somehow moved while engaged
          // (keyboard, anchor jump), hand control back immediately.
          if (Math.abs(window.scrollY - st.tiltAnchorY) > 12) release();
        }
        // Immersive DOM sweep: the pinned stage content (stage-05 texts,
        // rail, scrims) rides the SAME move as the WebGL camera — sweeping
        // up and softly dimming as the head dives, returning on the reverse
        // beat. Without this the locked DOM sat still and the dive read as
        // fake (user 2026-06-10).
        const tilt = useTextMorphStore.getState().camTilt;
        if (tilt !== lastTilt) {
          lastTilt = tilt;
          const stage = stageRef.current;
          if (stage) {
            const e = tilt * tilt * (3 - 2 * tilt);
            stage.style.transform = `translate3d(0, ${(-e * ih * 0.85).toFixed(1)}px, 0)`;
            stage.style.opacity = String(1 - 0.45 * e);
          }
        }
        lastY = y;
        lastBottom = rect.bottom;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      const stage = stageRef.current;
      if (stage) {
        stage.style.transform = "";
        stage.style.opacity = "";
      }
      release();
    };
  }, [outerRef, stageRef]);

  return null;
}

