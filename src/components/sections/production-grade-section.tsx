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
import {
  useChapterReveal,
  useLedgerReveal,
  useTextDrift,
} from "@/components/fx/lusion-type";

/**
 * ProductionGradeSection — the SIGNATURE section, ProblemSection's twin.
 *
 * TYPOGRAPHIC LEDGER, TEXT v3 (round 5, 2026-08-21 — the round-4 scrubbed
 * fill-wipe and the right-hung mono annotations are DEAD, owner call; same
 * Lusion pair as the Problem ledger — replayable viewport-entry choreography
 * + per-frame parallax drift (fx/lusion-type.ts) — opposite narrative: the
 * stream is HEALTHY here):
 *   - Chapter: the h2 carries `data-chapter-h2` (NOT data-split-reveal — the
 *     shared one-shot HeadingChoreographer must skip it) → useChapterReveal
 *     plays recipe H3 (SplitText words in line masks, y 115→0 1s lusion
 *     0.025s/word + x 200→0 trailing +0.4s), replayable (reset fully-out,
 *     replay on re-entry). key={language} + revert discipline unchanged. The
 *     D-17 description is no longer a 13px caption — a structural right grid
 *     column at BODY scale (`[data-chapter-desc]`), revealed in B3 spirit
 *     cascaded after the title, drifting at k=1.25. Byte-identical string.
 *   - Each artifact is a FULL-WIDTH row over a hairline (no right cell): a
 *     mono kicker line `[01·] [cluster label]`, the CLAIM in display serif
 *     as GHOST type (outlined/transparent — the river threading the guide
 *     rings shines through), then the WHY as a Switzer body-scale block
 *     (`[data-row-body]`, max-width 34em) UNDER the claim, then the
 *     hairline. Row = [kicker + claim] over [body] over [hairline].
 *   - ENTRANCES (useLedgerReveal, per row, replayable): the cluster label's
 *     RollLetters plays recipe R1 exactly (per-char column, yPercent −500→0,
 *     expo.inOut, 1.25s, center-out cosine); the index settles
 *     (autoAlpha+rise); the CLAIM plays recipe H3 (`[data-claim]` — SplitText
 *     words in line masks, y then x trailing +0.4s; the ghost stroke
 *     inherits through the split wrappers; key={language} remounts it); the
 *     hairline draws scaleX; the body plays recipe B1 (words, opacity .1→1 +
 *     y 100→0, 0.01s/word) cascaded +0.3s after the roll starts. Everything
 *     resets when the row fully leaves the viewport and replays on re-entry.
 *   - `bumpCluster("healthy", i)` fires ONCE per row per page life at the
 *     entrance's landing beat (timeline callback at IGNITE_BEAT in
 *     lusion-type; the latch survives EN/IT rebuilds) — DOM row and WebGL
 *     ring still ignite together. A load landing PAST a row fires its latch
 *     immediately (the field must read "already landed"). On the fallback
 *     tier the SVG twin draws its own ring ignition on mount; the store
 *     write is a harmless no-op there.
 *   - DRIFT (useTextDrift): kicker+claim block at k=0.5, body at k=1.5,
 *     chapter desc at 1.25. One shared ticker, transform-only, zero
 *     per-frame gBCR. Hairlines never drift. No arrows here → no Hv1 wave.
 *   - IGNITION (fine-pointer hover, keyboard focus, touch centre-band) stays
 *     the CSS accent — brightness + glyph-shaped accent drop-shadow glow +
 *     stroke hue shift, the cluster eyebrow goes accent, the index
 *     brightens — and setHovered("healthy", i) flares ring i in the WebGL
 *     field (existing store link, untouched).
 *   - BAND GEOMETRY CONTRACT (§A round 3, shared with the stream agent): the
 *     `[data-lattice-anchor="production"]` rect stays the FULL-BLEED -z-10
 *     background of the rows stack. Ring registration UNCHANGED (40/62/84%
 *     of band x — RING_T in webgl/neural/neuralLatticeConfig.ts; the ghost
 *     callout x mirrors it). Ghost callouts + dot grid KEPT.
 *   - `productionPulseStore.bump()` on every in-view edge is UNTOUCHED (the
 *     signature line's BEAT 1 emissive boost).
 *   - Guards: SSR/no-JS renders everything settled and visible (solid ink
 *     fallback where stroke is unsupported — @supports guard); FROM poses
 *     primed only by GSAP at arm (D-10). Reduced motion: static solid ink,
 *     zero choreography, no drift, no store bumps from the entrance path.
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
 * leader line pointing at it (edge "top" = label above, "bottom" = below).
 *
 * ROUND-5 W3 (2026-08-21): when the crystal island mounts, its driver
 * (webgl/CrystalCluster.tsx) writes `--callout-N-left`/`--callout-N-top`
 * custom properties on the [data-lattice-anchor] element — the labels then
 * ride the intact crystal's bbox anchors (damped, jitter-free). The values
 * below stay as the var() FALLBACKS, so SSR / fallback tier / RM keep
 * exactly this placement. The `edge` column must stay in sync with
 * webgl/neural/crystalConfig.ts CALLOUT_EDGE (`--callout-N-top` feeds
 * whichever edge property the callout uses). Placement only — strings are
 * byte-identical under the copy freeze. */
const CALLOUT_POS: { left: string; edge: "top" | "bottom"; at: string }[] = [
  { left: "40%", edge: "top", at: "46%" },
  { left: "62%", edge: "bottom", at: "47%" },
  { left: "84%", edge: "top", at: "24%" },
];

/**
 * Ghost + ignition CSS — file-scoped (no globals.css edits, parallel-agent
 * rule). Same rest grammar as the Problem ledger (see its header note): the
 * claim is permanently outlined — transparent fill + stroke — so the river
 * shines through; the @supports guard keeps non-supporting browsers on solid
 * ink. Ignition = accent glow on top (drop-shadow, NOT text-shadow — the
 * glow must wrap the glyph shapes, not the text box). Reduced motion: solid
 * readable ink, static, state selectors carried.
 */
const PGROW_CSS = `
.pgrow__ghost {
  color: hsl(var(--ink));
  transition:
    filter 0.6s var(--ease-lusion),
    -webkit-text-stroke-color 0.6s var(--ease-lusion);
}
@supports ((-webkit-text-fill-color: transparent) and (-webkit-text-stroke-width: 1px)) {
  .pgrow__ghost {
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: 1px hsl(var(--ink) / 0.35);
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
  // same edges via setHovered("healthy", i). No arrows → no Hv1 wave here.
  const { rowRefs, rowHandlers } = useLedgerIgnition(
    "healthy",
    artifacts.length,
  );

  const bumpCluster = useNeuralLatticeStore((s) => s.bumpCluster);
  // Ring i ignites exactly as row i's entrance lands — DOM and WebGL together
  // (once per page life; the latch lives inside useLedgerReveal). Stable
  // identity: bumpCluster is a zustand action, so this callback never
  // changes shape across renders (constant-shape deps in the hook).
  const igniteRing = useCallback(
    (i: number) => {
      bumpCluster("healthy", i);
    },
    [bumpCluster],
  );

  // Round-5 text v3: replayable viewport-entry choreography (chapter H3 +
  // per-row R1/H3/B1/hairline) + the shared per-frame parallax drift (see
  // fx/lusion-type.ts for the full contract — RM static, SSR settled,
  // FROM primed at arm only, revert on language rebuild).
  const sectionRef = useRef<HTMLElement | null>(null);
  const chapterRef = useRef<HTMLDivElement | null>(null);
  useChapterReveal(chapterRef, language);
  useLedgerReveal(rowRef, language, igniteRing);
  useTextDrift(sectionRef, language);

  return (
    <section
      id="trust"
      ref={sectionRef}
      data-snap
      className="section-accent-tint section-accent-tint--strong relative section-lg scroll-mt-24 overflow-hidden"
    >
      <style>{PGROW_CSS}</style>
      <SectionGlow position="bottom-right" intensity={1.25} size="65rem" />
      <SectionGlow position="top-left" intensity={0.9} size="50rem" />
      <div className="container-px relative">
        {/* Chapter heading + body-scale description column (the Problem
            section's twin grammar). */}
        <div
          ref={chapterRef}
          className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,30rem)] lg:items-end lg:gap-12"
        >
          <div data-drift="0.5">
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
                choreographer must skip it) → useChapterReveal's replayable
                H3; key={language}: SplitText owns the subtree once split, a
                language swap must remount it (SectionHeading contract). */}
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
          {/* The chapter description — structural right column at BODY scale
              (W2). B3-spirit reveal after the title; drift k=1.25.
              max-sm 0.9rem: §Mobile budget trim (W2 scale-up overshot
              390×844 by ~90px) — body scale on desktop, one step down on
              phones. */}
          <div data-drift="1.25">
            <p
              data-chapter-desc
              className="max-w-[34em] text-[clamp(1rem,1.2vw,1.3rem)] max-sm:text-[0.9rem] leading-[1.5] text-ink-mute"
            >
              {/* Device-neutral verb (D-17, owner-approved 2026-08-11): ONE
                  string per locale, byte-identical under the copy freeze. */}
              {isEn
                ? "Not a list of compliance buzzwords. These are artifacts you can ask to see in any scoping call. Open a panel to see why it matters."
                : "Non un elenco di buzzword sulla compliance. Sono artefatti che puoi chiedere di vedere in qualsiasi call di scoping. Apri un pannello per capire perché conta."}
            </p>
          </div>
        </div>

        {/* THE LEDGER — full-width typographic rows; the WebGL band is their
            full-bleed -z-10 background (BAND GEOMETRY CONTRACT). `isolate`
            pins the negative-z band inside this container so it paints above
            the section wash but below every row. */}
        <div ref={rowRef} className="relative isolate mt-4 sm:mt-12">
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
                    left: `var(--callout-${i}-left, ${pos.left})`,
                    [pos.edge]: `var(--callout-${i}-top, ${pos.at})`,
                  }}
                >
                  {clusterLabel(i, isEn)}
                </span>
              );
            })}
          </div>

          {/* The rows — full-width, chrome-less: [kicker + claim] over
              [body] over [hairline] (W2 — the right cell is dead). Hairline
              is an entrance-drawn span (no hidden pose baked in: SSR/no-JS/RM
              paint it full-width). tabIndex + the global :focus-visible ring;
              hover/focus/centre ignite (CSS) and fire the store link
              (useLedgerIgnition). */}
          {artifacts.map((a, i) => (
            <article
              key={i}
              ref={rowRefs[i]}
              tabIndex={0}
              data-ledger-row={i}
              {...rowHandlers[i]}
              className="pgrow relative py-8 max-sm:py-4 lg:py-10"
            >
              {/* Kicker + claim — drift k=0.5. */}
              <div data-drift="0.5">
                {/* Kicker line: the mono index settles on entry (inline-block:
                    GSAP transforms are no-ops on plain inline boxes); the
                    cluster label's letter-roll is recipe R1 (goes accent on
                    ignition). */}
                <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.16em]">
                  <span
                    data-row-rise
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
                    the outlined glyphs), recipe H3 entrance (data-claim;
                    key={language}: SplitText owns the subtree once split). */}
                <h3
                  key={language}
                  data-claim
                  className="pgrow__ghost mt-2 sm:mt-3 font-display text-[clamp(1.9rem,3.6vw,3.9rem)] leading-[1.05] tracking-[-0.01em] text-balance"
                >
                  {a.claim}
                </h3>
              </div>
              {/* The why — UNDER the claim (W2), Switzer at body scale,
                  ~34em measure. B1 word-wave entrance (split → remount on
                  language); drift k=1.5. max-sm 0.875rem/1.45 + mt-3:
                  §Mobile budget trim (still body Switzer, not a caption). */}
              <div data-drift="1.5" className="mt-3 sm:mt-5">
                <p
                  key={language}
                  data-row-body
                  className="max-w-[34em] text-[clamp(0.95rem,1.05vw,1.15rem)] max-sm:text-[0.875rem] leading-[1.5] max-sm:leading-[1.45] text-ink-mute"
                >
                  {a.why}
                </p>
              </div>
              {/* Hairline — entrance-drawn scaleX (origin left), replayable.
                  Hidden pose is GSAP-only (D-10). Never drifts. */}
              <span
                data-hairline
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px origin-left bg-[hsl(var(--rule)/0.5)]"
              />
            </article>
          ))}
        </div>

        {/* Closing disclaimer — kept verbatim. mt-8 below sm: §Mobile budget
            trim (desktop sm:mt-14 unchanged). */}
        <p className="mt-8 sm:mt-14 text-[12px] font-mono uppercase tracking-[0.14em] text-ink-mute max-w-2xl">
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
