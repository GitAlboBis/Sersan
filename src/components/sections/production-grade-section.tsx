"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
import { useProductionPulseStore } from "@/webgl/store/productionPulseStore";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { useNeuralLatticeFallback } from "@/components/fx/use-neural-lattice-fallback";
import { NeuralGraphFallback } from "@/components/fx/neural-graph-fallback";
import { RollLetters } from "@/components/fx/roll-letters";
import { useLedgerIgnition } from "@/components/fx/use-ledger-ignition";
import { useChapterScrub, useLedgerScrub } from "@/components/fx/use-type-scrub";

/**
 * ProductionGradeSection — the SIGNATURE section, ProblemSection's twin.
 *
 * SCROLL-SCRUBBED TYPOGRAPHIC LEDGER (round 4, 2026-08-21 — the round-3
 * IO-once entrances are gone; same scrub grammar as the Problem ledger,
 * opposite narrative — the stream is HEALTHY here):
 *   - Chapter heading: the h2 dropped `data-split-reveal` (the shared
 *     one-shot HeadingChoreographer no longer owns it — untouched for the
 *     rest of the site) and carries `data-chapter-h2` → useChapterScrub's
 *     SCRUBBED SplitText line-rise, with the D-17 description as the
 *     right-hung `[data-chapter-note]` annotation following in the last 25%
 *     (byte-identical string). key={language} + revert discipline unchanged.
 *   - Each artifact is a FULL-WIDTH row over a hairline: a mono kicker line
 *     `[01·] [cluster label]`, then the CLAIM in display serif rendered as
 *     GHOST type — outlined/transparent so the WebGL river threading the
 *     guide rings shines through — with `why` as the right-cell mono
 *     annotation (grid [1fr_minmax(280px,34%)], Lusion pairing).
 *   - PER-ROW SCRUB (useLedgerScrub; scrub:true raw — Lenis smooths; start
 *     "top 85%" / end "top 40%"; no pin): the ghost CLAIM line FILLS
 *     LEFT→RIGHT with solid ink exactly proportionally to the row's
 *     progress (background-clip:text gradient, background-size driven by
 *     GSAP; the stroke outline sits UNDER the un-filled part); the index and
 *     the claim rise/settle on the first 25%; the cluster KICKER's Lusion
 *     letter-roll (RollLetters) is scrub-driven; the hairline draws scaleX
 *     across the middle; the annotation fades+rises in the last 35%. All of
 *     it reverses scrubbing up; re-entry replays by construction.
 *   - `bumpCluster("healthy", i)` fires ONCE per row per page life as row
 *     i's scrub crosses its landing beat (IGNITE_AT in use-type-scrub) —
 *     DOM row and WebGL ring still ignite together, in pipeline order (on
 *     the fallback tier the SVG twin draws its own ring ignition on mount;
 *     the store write is a harmless no-op there).
 *   - IGNITION (fine-pointer hover, keyboard focus, touch centre-band) is an
 *     ACCENT ON TOP of the scroll fill — a subtle brightness + glyph-shaped
 *     accent drop-shadow glow + stroke hue shift, never a second fill; the
 *     cluster eyebrow goes accent, the index brightens, and
 *     setHovered("healthy", i) flares ring i in the WebGL field (existing
 *     store link, untouched).
 *   - BAND GEOMETRY CONTRACT (§A round 3, shared with the stream agent): the
 *     `[data-lattice-anchor="production"]` rect stays the FULL-BLEED -z-10
 *     background of the rows stack. Ring registration UNCHANGED (40/62/84%
 *     of band x — RING_T in webgl/neural/neuralLatticeConfig.ts; the ghost
 *     callout x mirrors it). Ghost callouts + dot grid KEPT.
 *   - `productionPulseStore.bump()` on every in-view edge is UNTOUCHED (the
 *     signature line's BEAT 1 emissive boost).
 *   - Guards: SSR/no-JS renders fully-solid ink fill (background-size 100%
 *     in CSS), full-width hairlines, visible notes; scrub poses primed only
 *     at arm with an immediate init snap. Reduced motion: static solid ink,
 *     zero scrub choreography, no store bumps from the scrub path.
 *   - A11y: strings in source order (index → label → claim → why), ghost
 *     styling is pure CSS on real text, rows are tabIndex=0 with the global
 *     :focus-visible ring; focus = ignition.
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

/** Number of pipeline systems (rows = rings = store clusters). */
const IGNITE_NODES = 3;

/** Ghost callout placement — x mirrors RING_T (40/62/84% of the band) in
 * webgl/neural/neuralLatticeConfig.ts; change them together (registration
 * contract, round 3 §A). Vertical `at` tracks the §B stream-v3 WEAVE
 * (coordination data 2026-08-21): the healthy river enters LOW and RISES
 * through the rings at band-y ≈ −0.05 / +0.06 / +0.17 (0 = center, + = up
 * → css top ≈ 55% / 44% / 33%). Each label hangs off its ring with the
 * leader line pointing at it (edge "top" = label above, "bottom" = below). */
const CALLOUT_POS: { left: string; edge: "top" | "bottom"; at: string }[] = [
  { left: "40%", edge: "top", at: "46%" },
  { left: "62%", edge: "bottom", at: "47%" },
  { left: "84%", edge: "top", at: "24%" },
];

/**
 * Ghost + ignition CSS — file-scoped (no globals.css edits, parallel-agent
 * rule). Same scrub-fill machinery as the Problem ledger (see its header for
 * the full rationale), fill color = solid ink. Base state is fully filled
 * (background-size 100%) so SSR / no-JS / unsupported browsers read solid;
 * the scrub-derived partial fill is a GSAP inline write only. Ignition =
 * accent glow on top (drop-shadow, NOT text-shadow — text-shadow paints
 * over a background-clipped fill), never a second fill. Reduced motion:
 * solid readable ink, static, state selectors carried.
 */
const PGROW_CSS = `
.pgrow__ghost {
  color: hsl(var(--ink));
  transition:
    filter 0.6s var(--ease-lusion),
    -webkit-text-stroke-color 0.6s var(--ease-lusion);
}
@supports ((-webkit-background-clip: text) and (-webkit-text-stroke-width: 1px)) {
  .pgrow__ghost {
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: 1px hsl(var(--ink) / 0.35);
    background-image: linear-gradient(90deg, hsl(var(--ink)), hsl(var(--ink)));
    background-repeat: no-repeat;
    background-position: 0 0;
    background-size: 100% 100%;
    -webkit-background-clip: text;
    background-clip: text;
  }
}
.pgrow__index {
  color: hsl(var(--accent) / 0.6);
  transition: color 0.6s var(--ease-lusion);
}
.pgrow__label {
  color: hsl(var(--ink-mute));
  transition: color 0.6s var(--ease-lusion);
}
.pgrow:focus-visible .pgrow__ghost,
.pgrow[data-focus="true"] .pgrow__ghost {
  filter: brightness(1.12) drop-shadow(0 0 14px hsl(var(--accent) / 0.35));
  -webkit-text-stroke-color: hsl(var(--accent) / 0.4);
}
.pgrow:focus-visible .pgrow__label,
.pgrow[data-focus="true"] .pgrow__label { color: hsl(var(--accent)); }
.pgrow:focus-visible .pgrow__index,
.pgrow[data-focus="true"] .pgrow__index { color: hsl(var(--accent)); }
@media (hover: hover) and (pointer: fine) {
  .pgrow:hover .pgrow__ghost {
    filter: brightness(1.12) drop-shadow(0 0 14px hsl(var(--accent) / 0.35));
    -webkit-text-stroke-color: hsl(var(--accent) / 0.4);
  }
  .pgrow:hover .pgrow__label { color: hsl(var(--accent)); }
  .pgrow:hover .pgrow__index { color: hsl(var(--accent)); }
}
@media (prefers-reduced-motion: reduce) {
  /* Solid-ink readable static in EVERY state (see header note). */
  .pgrow__ghost,
  .pgrow:hover .pgrow__ghost,
  .pgrow:focus-visible .pgrow__ghost,
  .pgrow[data-focus="true"] .pgrow__ghost {
    color: hsl(var(--ink));
    -webkit-text-fill-color: currentColor;
    -webkit-text-stroke-width: 0;
    background-image: none;
    filter: none;
    transition: none;
  }
  .pgrow__index,
  .pgrow__label { transition: none; }
}
`;

export default function ProductionGradeSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const artifacts = getArtifacts(isEn);
  const showFallback = useNeuralLatticeFallback();

  // ONE in-view edge for the whole ledger — re-bumps the signature-line
  // pulse on every re-entry (tracking observer).
  const { ref: rowRef, inView } = useInView<HTMLDivElement>();
  useProductionPulseOnEnter(inView);

  // Ignition driver: centre-band on touch (data-focus), hover/focus on fine
  // pointer — visual is CSS above; the store link (ring i flare) rides the
  // same edges via setHovered("healthy", i).
  const { rowRefs, rowHandlers } = useLedgerIgnition(
    "healthy",
    artifacts.length,
  );

  const bumpCluster = useNeuralLatticeStore((s) => s.bumpCluster);
  // Ring i ignites exactly as row i's scrub lands — DOM and WebGL together
  // (once per page life; the latch lives inside useLedgerScrub). Stable
  // identity: bumpCluster is a zustand action, so this callback never
  // changes shape across renders (constant-shape deps in the hook).
  const igniteRing = useCallback(
    (i: number) => {
      bumpCluster("healthy", i);
    },
    [bumpCluster],
  );

  // Round-4 scroll-scrubbed type: chapter h2/annotation + per-row
  // fill-wipe/rise/roll/hairline/note choreography (see use-type-scrub.ts
  // for the full contract — RM static, SSR solid, init snap, revert on
  // language rebuild).
  const chapterRef = useRef<HTMLDivElement | null>(null);
  useChapterScrub(chapterRef, language);
  useLedgerScrub(rowRef, language, igniteRing);

  return (
    <section
      id="trust"
      data-snap
      className="section-accent-tint section-accent-tint--strong relative section-lg scroll-mt-24 overflow-hidden"
    >
      <style>{PGROW_CSS}</style>
      <SectionGlow position="bottom-right" intensity={1.25} size="65rem" />
      <SectionGlow position="top-left" intensity={0.9} size="50rem" />
      <div className="container-px relative">
        {/* Chapter heading + right-hung annotation (the Problem section's
            twin grammar). */}
        <div
          ref={chapterRef}
          className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end lg:gap-10"
        >
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
                data-chapter-h2 (NOT data-split-reveal — the shared one-shot
                choreographer must skip it) → useChapterScrub's SCRUBBED
                SplitText line-rise; key={language}: SplitText owns the
                subtree once split, a language swap must remount it
                (SectionHeading contract). */}
            <h2
              key={language}
              data-chapter-h2
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
          {/* Scrubbed into the chapter window's last 25% (round 4; the
              IO-once ChapterAnnotation blur-fade is retired here). */}
          <p
            data-chapter-note
            className="max-w-[320px] text-[13px] leading-relaxed text-ink-mute"
          >
            {/* Device-neutral verb (D-17, owner-approved 2026-08-11): ONE
                string per locale, byte-identical under the copy freeze. */}
            {isEn
              ? "Not a list of compliance buzzwords. These are artifacts you can ask to see in any scoping call. Open a panel to see why it matters."
              : "Non un elenco di buzzword sulla compliance. Sono artefatti che puoi chiedere di vedere in qualsiasi call di scoping. Apri un pannello per capire perché conta."}
          </p>
        </div>

        {/* THE LEDGER — full-width typographic rows; the WebGL band is their
            full-bleed -z-10 background (BAND GEOMETRY CONTRACT). `isolate`
            pins the negative-z band inside this container so it paints above
            the section wash but below every row. */}
        <div ref={rowRef} className="relative isolate mt-6 sm:mt-12">
          {/* The WebGL anchor rect — full-bleed to the viewport edges; the
              rings ignite at 40/62/84% of this box (registration unchanged).
              Decorative layer: aria-hidden, pointer-events-none. */}
          <div
            data-lattice-anchor="production"
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-[calc(50%-50vw)] right-[calc(50%-50vw)] -z-10"
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

          {/* The rows — full-width, chrome-less, each closed by a hairline
              (a scrub-drawn span now, not a border — no hidden pose baked in:
              SSR/no-JS/RM paint it full-width). tabIndex + the global
              :focus-visible ring; hover/focus/centre ignite (CSS) and fire
              the store link (useLedgerIgnition). */}
          {artifacts.map((a, i) => (
            <article
              key={i}
              ref={rowRefs[i]}
              tabIndex={0}
              data-ledger-row={i}
              {...rowHandlers[i]}
              className="pgrow relative grid gap-x-10 gap-y-3 py-8 max-sm:py-5 lg:py-10 sm:grid-cols-[1fr_minmax(280px,34%)] sm:items-end"
            >
              <div>
                {/* Kicker line: the mono index scrub-rises on the window's
                    first 25% (inline-block: GSAP transforms are no-ops on
                    plain inline boxes); the cluster label's letter-roll is
                    scrub-driven (goes accent on ignition). */}
                <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.16em]">
                  <span
                    data-scrub-rise
                    className="pgrow__index inline-block tabular-nums"
                  >
                    {`0${i + 1}`}
                    <span aria-hidden="true">·</span>
                  </span>{" "}
                  <RollLetters
                    text={clusterLabel(i, isEn)}
                    className="pgrow__label"
                  />
                </p>
                {/* The CLAIM — ghost display serif (the river shines through
                    the un-filled glyphs), scrub-FILLED to solid ink
                    left→right with the row's progress, riding the same
                    window's rise. */}
                <h3
                  data-scrub-rise
                  data-scrub-ghost
                  className="pgrow__ghost mt-2 sm:mt-3 font-display text-[clamp(1.9rem,3.2vw,3.4rem)] leading-[1.05] tracking-[-0.01em] text-balance"
                >
                  {a.claim}
                </h3>
              </div>
              {/* The why as the right-cell mono annotation (Lusion pairing).
                  Scrubbed across the window's last 35%; never primed under
                  RM/no-JS. */}
              <p
                data-row-note
                className="font-mono text-[13px] leading-relaxed text-ink-mute max-w-[44ch] sm:justify-self-end"
              >
                {a.why}
              </p>
              {/* Hairline — scaleX-drawn across the middle of the scrub
                  window (origin left). Hidden pose is GSAP-only (D-10). */}
              <span
                data-scrub-hairline
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px origin-left bg-[hsl(var(--rule)/0.5)]"
              />
            </article>
          ))}
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
