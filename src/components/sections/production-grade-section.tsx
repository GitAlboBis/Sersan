"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
import { useProductionPulseStore } from "@/webgl/store/productionPulseStore";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { useNeuralLatticeFallback } from "@/components/fx/use-neural-lattice-fallback";
import { NeuralGraphFallback } from "@/components/fx/neural-graph-fallback";
import {
  StreamPane,
  ChapterAnnotation,
  scramblePaneEyebrow,
} from "@/components/fx/stream-pane";

/**
 * ProductionGradeSection — the SIGNATURE section, ProblemSection's twin.
 *
 * SIGNAL STREAM refactor (2026-08-21): the same grammar as the Problem
 * section, opposite narrative — the stream is HEALTHY here.
 *   - Chapter heading at the shared chapter scale + the description (D-17
 *     string, byte-identical) as the right-hung ~320px annotation.
 *   - The FIELD BAND: `[data-lattice-anchor="production"]` as its background.
 *     The WebGL stream (NeuralLattice, mode "healthy") threads THREE GUIDE
 *     RINGS (eval baseline → trace propagation → guardrail clamp, left→right
 *     across the band); particles tighten laminar past each ring; every ~6s
 *     a surge rides the whole stream and SURVIVES. SVG stream twin when the
 *     island is absent. Igloo garnish: dot-grid + the cluster-label ghost
 *     callouts with leader lines near the rings (aria-hidden, max-sm:hidden,
 *     `.eyebrow` → LabelScrambler decode).
 *   - THREE GLASS PANES (StreamPane) z-cascaded on the band's LEFT — rings in
 *     the open right two-thirds. ALWAYS-OPEN copy: mono cluster-label eyebrow,
 *     claim in display serif, `why` body under a hairline. Hover/focus on
 *     pane i → setHovered("healthy", i) → ring i flares in the WebGL field.
 *
 * ENTRANCE — replaces the old marker/halo/card boot timeline. ONE once-per-
 * life in-view edge, ROUND-2 award grammar (2026-08-21 life pass): each pane
 * slides in from its side (−48px x, the panes live on the row's LEFT) with a
 * rotateZ settle (−2.5°→ rest tilt) + blur 8→0 + opacity, staggered 120ms
 * expo.out; `bumpCluster("healthy", i)` fires ON THE SAME BEAT as pane i's
 * landing — DOM pane and WebGL ring ignite together, in pipeline order
 * (igloo ring-seal ignite; on the fallback tier the SVG twin draws its own
 * ring ignition on mount). As each pane lands its mono eyebrow scramble-
 * decodes, the claim + body masked-rise 60ms apart and the hairline divider
 * draws (scaleX). Scroll-away/back never re-runs it. Reduced-motion: no
 * reveal priming, no store bumps, no timers — the section rests in its
 * final state.
 *
 * Pane LIFE (round 2, in StreamPane itself): per-pane scroll parallax at
 * alternating depths, fine-pointer spring hover tilt (±3.5° quickTo,
 * back.out release), idle sine micro-float phase-offset per pane. Chapter
 * type: h2 data-split-reveal (HeadingChoreographer line-rise, key={language})
 * + ChapterAnnotation blur-fade.
 *
 * `productionPulseStore.bump()` on every in-view edge is UNTOUCHED (the
 * signature line's BEAT 1 emissive boost).
 *
 * Copy is byte-identical to the pre-refactor section (EN + IT), including the
 * D-17 "Open a panel…" description and the closing disclaimer.
 */

// === Shared: run a quiet status pulse only while in view ==================
function useInView<T extends HTMLElement>(margin = "0px 0px -10% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: margin, threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [margin]);
  return { ref, inView };
}

// === Shared: bump the signature-line pulse on the section's appearance =====
// On each false→true edge it bumps the globalThis-pinned production pulse
// store; SignatureLine (the lazy WebGL island) reads + decays it, lifting the
// line's emissive above the bloom threshold near the production section
// (BEAT 1). Inert under reduced-motion.
function useProductionPulseOnEnter(inView: boolean) {
  const bump = useProductionPulseStore((s) => s.bump);
  useEffect(() => {
    if (!inView) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    bump();
  }, [inView, bump]);
}

// === Section ==============================================================
type Artifact = {
  claim: string;
  why: string;
};

function getArtifacts(isEn: boolean): Artifact[] {
  return [
    {
      claim: isEn
        ? "Every system ships with a regression set."
        : "Ogni sistema viene rilasciato con un set di regressione.",
      why: isEn
        ? "Versioned cases and day-zero baselines mean you can prove the system still works after every change, instead of hoping."
        : "Casi versionati e baseline al day-zero ti permettono di dimostrare che il sistema funziona ancora dopo ogni modifica, invece di sperarlo.",
    },
    {
      claim: isEn
        ? "Traceable from input to action."
        : "Tracciabile dall'input all'azione.",
      why: isEn
        ? "When something breaks at 3am, the answer is in the trace: retrieval, plan, tool call, human review. Not in Slack archaeology."
        : "Quando qualcosa si rompe alle 3 di notte, la risposta è nel trace: retrieval, plan, chiamata a tool, revisione umana. Non in un'archeologia su Slack.",
    },
    {
      claim: isEn
        ? "Boundaries before features."
        : "I confini prima delle feature.",
      why: isEn
        ? "Data access and agent tools are scoped before the first feature ships. The default answer to an unscoped action is no."
        : "L'accesso ai dati e i tool degli agenti vengono definiti prima della prima feature. La risposta di default a un'azione non prevista è no.",
    },
  ];
}

// The label for each healthy cluster (JetBrains-mono caption) — the
// pipeline-stage names, EN/IT. Also the ghost callouts near the WebGL rings.
function clusterLabel(index: number, isEn: boolean): string {
  if (index === 0) return isEn ? "eval baseline" : "baseline eval";
  if (index === 1) return isEn ? "trace propagation" : "propagazione trace";
  return isEn ? "guardrail clamp" : "clamp guardrail";
}

/** Pane reveal stagger (round-2 award grammar) — the bumpCluster ring
 * ignitions ride the SAME beats so DOM and WebGL ignite together. */
const PANE_STAGGER = 0.12;
/** Offset into each pane's 0.9s expo.out slide at which it reads as
 * "landed" — the ring ignition + eyebrow decode fire here. */
const IGNITE_OFFSET = 0.25;
/** Number of pipeline systems (panes = rings = store clusters). */
const IGNITE_NODES = 3;

/** Ghost callout placement — mirrors RING_T (40/62/84% of the band) in
 * webgl/neural/neuralLatticeConfig.ts; change them together. */
const CALLOUT_POS: { left: string; edge: "top" | "bottom"; at: string }[] = [
  { left: "43%", edge: "top", at: "14%" },
  { left: "62%", edge: "bottom", at: "12%" },
  { left: "84%", edge: "top", at: "22%" },
];

export default function ProductionGradeSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const artifacts = getArtifacts(isEn);
  const showFallback = useNeuralLatticeFallback();

  // ONE in-view edge for the whole field row. It (a) re-bumps the
  // signature-line pulse on every re-entry (tracking observer) and (b) arms
  // the once-only entrance below.
  const { ref: rowRef, inView } = useInView<HTMLDivElement>();
  useProductionPulseOnEnter(inView);

  const bumpCluster = useNeuralLatticeStore((s) => s.bumpCluster);
  // The entrance plays exactly once per page life; the observer keeps
  // toggling for the pulse hook above, so this latch keeps it calm.
  const playedRef = useRef(false);

  useGSAP(
    () => {
      const row = rowRef.current;
      if (!row) return;
      // Reduced-motion: never prime anything hidden, never touch the stores —
      // the section simply rests in its final state.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (playedRef.current) return;

      const panes = row.querySelectorAll<HTMLElement>("[data-stream-pane]");
      if (!panes.length) return;
      const masks = row.querySelectorAll<HTMLElement>("[data-pane-mask]");
      const rises = row.querySelectorAll<HTMLElement>("[data-pane-rise]");
      const dividers = row.querySelectorAll<HTMLElement>("[data-pane-divider]");
      // PRIME (idempotent across dep re-runs; useGSAP is a layout effect, so
      // this lands before paint — no hidden-then-visible flash). The award
      // grammar: side slide (−48px, panes live LEFT) + rotateZ −2.5° + blur.
      // Clip windows are JS-owned: overflow set here, cleared after the
      // timeline settles — SSR/no-JS/RM never clip a Fraunces descender.
      gsap.set(panes, { opacity: 0, x: -48, rotation: -2.5, filter: "blur(8px)" });
      if (masks.length) gsap.set(masks, { overflow: "hidden" });
      if (rises.length) gsap.set(rises, { yPercent: 115 });
      if (dividers.length) {
        gsap.set(dividers, { scaleX: 0, transformOrigin: "left center" });
      }

      // Primed but not yet on screen: wait for the IO edge (the inView dep
      // re-runs this effect, falls through the guards above, and plays).
      if (!inView) return;
      playedRef.current = true;

      // ONE timeline: pane i slides/settles in and, ON THE SAME BEAT, ring i
      // ignites (bumpCluster is the store signal each ring's >1.0 flash
      // decays from — harmless no-op writes on the fallback tier, where the
      // SVG twin runs its own ignition on mount). Then the pane's content
      // sequences: eyebrow decode → claim/body masked-rise → divider draw.
      const tl = gsap.timeline();
      tl.to(
        panes,
        {
          opacity: 1,
          x: 0,
          rotation: 0,
          filter: "blur(0px)",
          duration: 0.9,
          ease: "expo.out",
          stagger: PANE_STAGGER,
          clearProps: "filter",
        },
        0,
      );
      panes.forEach((pane, i) => {
        const at = i * PANE_STAGGER;
        // Ring i ignites exactly as pane i lands — DOM and WebGL together.
        tl.call(
          () => {
            bumpCluster("healthy", i);
          },
          undefined,
          at + IGNITE_OFFSET,
        );
        const eyebrow = pane.querySelector<HTMLElement>("[data-pane-eyebrow]");
        if (eyebrow) {
          tl.call(
            () => {
              scramblePaneEyebrow(eyebrow);
            },
            undefined,
            at + 0.1,
          );
        }
        const paneRises = pane.querySelectorAll<HTMLElement>("[data-pane-rise]");
        if (paneRises.length) {
          tl.to(
            paneRises,
            { yPercent: 0, duration: 0.7, ease: "expo.out", stagger: 0.06 },
            at + 0.35,
          );
        }
        const divider = pane.querySelector<HTMLElement>("[data-pane-divider]");
        if (divider) {
          tl.to(
            divider,
            { scaleX: 1, duration: 0.6, ease: "expo.out" },
            at + 0.42,
          );
        }
      });
      if (masks.length) tl.set(masks, { clearProps: "overflow" });
    },
    { dependencies: [inView, bumpCluster], scope: rowRef },
  );

  return (
    <section
      id="trust"
      data-snap
      className="section-accent-tint section-accent-tint--strong relative section-lg scroll-mt-24 overflow-hidden"
    >
      <SectionGlow position="bottom-right" intensity={1.25} size="65rem" />
      <SectionGlow position="top-left" intensity={0.9} size="50rem" />
      <div className="container-px relative">
        {/* Chapter heading + right-hung annotation (the Problem section's
            twin grammar). */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end lg:gap-10">
          <div>
            {/* Plain `.eyebrow` (no [data-eyebrow-text]) → the global
                LabelScrambler owns its decode reveal. */}
            <p className="eyebrow mb-5 inline-flex items-center gap-2 text-ink-mute">
              <span
                aria-hidden="true"
                className="inline-block w-6 h-px bg-[hsl(var(--accent))]"
              />
              <span>
                {isEn
                  ? "What production-grade actually means"
                  : "Cosa significa davvero production-grade"}
              </span>
            </p>
            {/* max-sm override — the Problem chapter title's twin (same
                budget arithmetic; presentation-only).
                data-split-reveal → HeadingChoreographer masked line-rise;
                key={language}: SplitText owns the subtree once split, a
                language swap must remount it (SectionHeading contract). */}
            <h2
              key={language}
              data-split-reveal
              className="font-display text-[clamp(2.6rem,4.8vw,5.75rem)] max-sm:text-[2.1rem] leading-[0.98] tracking-[-0.02em] text-ink text-balance"
            >
              {isEn ? (
                <>
                  Three things every SerSan system ships with,
                  <br className="hidden sm:block" />
                  <span className="text-ink-mute"> before we call it done.</span>
                </>
              ) : (
                <>
                  Tre cose che ogni sistema SerSan porta con sé,
                  <br className="hidden sm:block" />
                  <span className="text-ink-mute"> prima di dirlo finito.</span>
                </>
              )}
            </h2>
          </div>
          {/* Blur-fades in ~0.3s behind the title's line-rise. */}
          <ChapterAnnotation>
            {/* Device-neutral verb (D-17, owner-approved 2026-08-11): ONE
                string per locale, byte-identical under the copy freeze. */}
            {isEn
              ? "Not a list of compliance buzzwords. These are artifacts you can ask to see in any scoping call. Open a panel to see why it matters."
              : "Non un elenco di buzzword sulla compliance. Sono artefatti che puoi chiedere di vedere in qualsiasi call di scoping. Apri un pannello per capire perché conta."}
          </ChapterAnnotation>
        </div>

        {/* The field row: the band (WebGL anchor as background) + the panes
            cascaded over its LEFT side (lg+) / stacked below it (< lg) —
            rings ignite in the open right two-thirds. On lg the band is the
            ABSOLUTE background of the whole row, so its height tracks the
            pane stack (no fixed-height overflow); below lg it is a
            fixed-height block with the panes in flow underneath. */}
        <div ref={rowRef} className="relative mt-8 sm:mt-12">
          <div className="relative min-h-[280px] sm:min-h-[420px] lg:absolute lg:inset-0 lg:min-h-0">
            <div
              data-lattice-anchor="production"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              {/* Faint blueprint dot-grid (igloo garnish). */}
              <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--ink)/0.05)_1px,transparent_1px)] [background-size:26px_26px]" />
              {showFallback && (
                <NeuralGraphFallback
                  variant="healthy"
                  className="absolute inset-0 h-full w-full opacity-90"
                />
              )}
              {/* Ghost callouts — the EXISTING cluster-label strings near the
                  rings, leader lines pointing into the field. */}
              {Array.from({ length: IGNITE_NODES }, (_, i) => {
                const pos = CALLOUT_POS[i];
                return (
                  <span
                    key={i}
                    className={
                      "eyebrow max-sm:hidden absolute -translate-x-1/2 whitespace-nowrap text-[10px] tracking-[0.18em] text-ink-mute/80 " +
                      (pos.edge === "top"
                        ? "after:content-[''] after:absolute after:left-1/2 after:top-full after:mt-1 after:h-7 after:w-px after:bg-gradient-to-b after:from-[hsl(var(--accent)/0.45)] after:to-transparent"
                        : "after:content-[''] after:absolute after:left-1/2 after:bottom-full after:mb-1 after:h-7 after:w-px after:bg-gradient-to-t after:from-[hsl(var(--accent)/0.45)] after:to-transparent")
                    }
                    style={{
                      left: pos.left,
                      [pos.edge]: pos.at,
                    }}
                  >
                    {clusterLabel(i, isEn)}
                  </span>
                );
              })}
            </div>
          </div>

          {/* The panes — ONE container, responsive pose: below lg a flat
              stack under the band; lg+ a z-cascade hugging the row's left
              edge, the rings igniting in the open field to their right. */}
          <div className="relative z-10 mt-4 flex flex-col gap-3 sm:gap-4 lg:mr-auto lg:mt-0 lg:min-h-[520px] lg:w-[380px] lg:justify-center lg:gap-4 lg:py-4 xl:w-[420px]">
            {artifacts.map((a, i) => (
              <StreamPane key={i} index={i} surface="healthy" side="left">
                {/* data-pane-eyebrow → timeline-sequenced scramble decode
                    (aria-hidden separators never scramble). */}
                <span
                  data-pane-eyebrow
                  className="relative block font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--accent)/0.85)]"
                >
                  <span className="tabular-nums">{`0${i + 1}`}</span>
                  <span aria-hidden="true" className="px-1.5 text-ink-dim">
                    ·
                  </span>
                  <span className="text-[hsl(var(--accent)/0.8)]">
                    {clusterLabel(i, isEn)}
                  </span>
                </span>
                {/* Masked line-rises after the pane lands: clip windows are
                    GSAP-owned (overflow set at prime, cleared once settled)
                    so SSR/no-JS/RM never clip anything. */}
                <div data-pane-mask className="relative mt-2.5">
                  <h3
                    data-pane-rise
                    className="font-display text-[22px] leading-tight text-ink max-sm:text-[19px]"
                  >
                    {a.claim}
                  </h3>
                </div>
                <div
                  aria-hidden="true"
                  data-pane-divider
                  className="relative my-3 h-px bg-[hsl(var(--rule)/0.6)]"
                />
                <div data-pane-mask className="relative">
                  <p data-pane-rise className="text-[13px] leading-relaxed text-ink-mute">
                    {a.why}
                  </p>
                </div>
              </StreamPane>
            ))}
          </div>
        </div>

        {/* Closing disclaimer — kept verbatim. */}
        <p className="mt-10 sm:mt-14 text-[12px] font-mono uppercase tracking-[0.14em] text-ink-mute max-w-2xl">
          {isEn ? (
            <>
              We do not claim compliance certifications we don&apos;t hold.
              <br />
              We do build systems that pass them.
            </>
          ) : (
            <>
              Non rivendichiamo certificazioni di compliance che non
              possediamo.
              <br />
              Costruiamo sistemi che le superano.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
