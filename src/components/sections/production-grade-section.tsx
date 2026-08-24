"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
 * ROUND 10 (2026-08-24) — THE GHOST TYPE IS DEAD. The owner rejected the
 * outlined/hollow display type ("le scritte vuote dentro azzure non mi
 * piacciono"): the CLAIM is now painted SOLID ink (see the PGROW_CSS note
 * below). Only the PAINT changed — the H3 claim entrance, the R1 label roll,
 * the B1 body wave, the hairline draw, the per-row replay, the drift, the
 * bumpCluster latch and every focus/centre-band state are byte-for-byte the
 * behaviour they were. Copy untouched.
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
 *     mono kicker line `[01·] [cluster label]`, the CLAIM in SOLID display
 *     serif (round 10 — the WebGL field flows behind it, not through it),
 *     then the WHY as a Switzer body-scale block (`[data-row-body]`,
 *     max-width 34em) UNDER the claim, then the hairline.
 *     Row = [kicker + claim] over [body] over [hairline].
 *   - ENTRANCES (useLedgerReveal, per row, replayable): the cluster label's
 *     RollLetters plays recipe R1 exactly (per-char column, yPercent −500→0,
 *     expo.inOut, 1.25s, center-out cosine); the index settles
 *     (autoAlpha+rise); the CLAIM plays recipe H3 (`[data-claim]` — SplitText
 *     words in line masks, y then x trailing +0.4s; the claim colour
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
 *     the CSS accent, now expressed in ink: the claim lifts from ink to an
 *     icy cyan-white hsl(189 100% 96%) — BRIGHTER than rest, never dimmer
 *     (round-10 check fix; the first pass dimmed it — measurements in the
 *     PGROW_CSS note) — inside a two-layer glyph-shaped accent glow; the
 *     cluster eyebrow goes accent, the index brightens — same 0.6s
 *     var(--ease-lusion) — and setHovered("healthy", i) flares ring i in the
 *     WebGL field (existing store link, untouched).
 *   - BAND GEOMETRY CONTRACT (§A round 3, shared with the stream agent): the
 *     `[data-lattice-anchor="production"]` rect stays the FULL-BLEED -z-10
 *     background of the rows stack. ROUND-6: the WebGL "rings" are now the
 *     three MIDDLE LAYERS of the constellation (RING_T = [.25,.5,.75]
 *     topological depth, membranes at the layer centroids); the ghost
 *     callout x values below stay as the historic var() FALLBACKS (round-6
 *     spec §6 accepts the small drift). Ghost callouts + dot grid KEPT.
 *   - `productionPulseStore.bump()` on every in-view edge is UNTOUCHED (the
 *     signature line's BEAT 1 emissive boost).
 *   - Guards: SSR/no-JS renders everything settled and visible (the rest pose
 *     IS the finished look — solid ink, no primed-hidden classes); FROM poses
 *     primed only by GSAP at arm (D-10). Reduced motion: the solid rest
 *     colour in every state (the ignited pose is neutralised because
 *     use-centre-focus's static mode pins [data-focus="true"] on touch+RM),
 *     zero choreography, no drift, no store bumps from the entrance path.
 *   - A11y: strings in source order (index → label → claim → why), the claim
 *     styling is pure CSS colour on real text, rows are tabIndex=0 with the
 *     global :focus-visible ring; focus = ignition.
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

/** Ghost callout placement — HISTORIC round-3 values (x mirrored the old
 * RING_T 40/62/84% band-x; the vertical `at` tracked the stream-v3 weave).
 * ROUND-6 moved the WebGL registration to the constellation's middle-layer
 * centroids (RING_T is topological depth now), but these values stay as the
 * var() FALLBACKS only — SSR / fallback tier / RM placement, where the
 * round-6 spec §6 measured the drift vs the new layer x's as acceptable.
 * Each label hangs off its ring with the
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
 * CLAIM + ignition CSS — file-scoped (no globals.css edits, parallel-agent
 * rule). Same rest grammar as the Problem ledger (see its header note):
 * round 10 (2026-08-24) killed the outlined/ghost pose — transparent fill,
 * -webkit-text-stroke and the @supports guard that gated them are all
 * DELETED (owner rejection: "le scritte vuote dentro azzure non mi
 * piacciono"). The claim is SOLID hsl(var(--ink)), 17.0:1 on --bg against
 * the body's 6.1:1 — the claim is the dominant line by a wide margin.
 *
 * IGNITION is the same event re-expressed in ink, same 0.6s
 * var(--ease-lusion) as the index/label.
 *
 * ROUND-10 CHECK FIX (2026-08-24) — THE IGNITION WAS A DIMMING. The first
 * pass ignited to hsl(189 80% 84%) #B6EDF7. Measured against the rest ink
 * #F4F6FA over --bg #0B1523: relative luminance 0.9205 → 0.7723 (−16.1%),
 * CIELAB L* 96.84 → 90.43 (−6.41), contrast 16.94:1 → 14.35:1. The glyph got
 * DARKER on hover — it read as fading to cyan, not igniting — while the
 * Problem ledger's twin word ROSE (+8.20 L*, 10.61 → 13.34:1). Twins cannot
 * ignite in opposite directions. The ignited colour is now hsl(189 100% 96%)
 * #EBFCFF: L* 97.83 (+0.99), Y +2.7%, 17.37:1 — it never dims — and it still
 * carries a real cyan cast (ΔE76 5.3 vs the rest ink, ~2× the ~2.3 JND), so
 * the hue event survives.
 *
 * Because the rest ink already sits at the luminance ceiling (L* 96.84 —
 * there is no headroom above it inside the palette), the EMPHASIS is carried
 * by the GLOW, and one 14px/0.35 halo could not carry it at
 * clamp(1.9rem,3.6vw,3.9rem): that is a hairline next to a 52–62px stem.
 * Two CHAINED drop-shadows now — a 10px tight rim + a 28px soft field.
 * Chained filters compose (the second samples the first's output, halo
 * included), so the rim reaches ~0.69 accent alpha instead of 0.35 and the
 * halo reads 6.04:1 against --bg instead of 2.49:1. drop-shadow, NOT
 * text-shadow: the glow must wrap the glyph shapes, not the text box.
 *
 * The old `brightness(1.12)` is gone — on already-white solid type it
 * clipped to nothing. It never touched the GLOW either: brightness() is an
 * RGB component transfer that leaves ALPHA alone, and drop-shadow paints its
 * own declared colour through the source alpha. What did change the glow is
 * the fill — a solid glyph hands the shadow a solid mask where the dead
 * ghost pose handed it only a 1px outline.
 *
 * The mono kicker (index + label) still goes full accent (L* 83.2 at 11px)
 * while the claim holds the luminance top at 52–62px display: the two ignite
 * in DIFFERENT channels (chroma vs light), so the row's three-element
 * hierarchy resolves instead of two elements competing.
 *
 * Reduced motion: transitions off, and the ignited pose neutralised back to
 * rest in EVERY state — not stroke leftovers, but because use-centre-focus's
 * static mode pins every row [data-focus="true"] on touch+RM and would
 * otherwise paint all three claims permanently lifted + glowing. SCOPE NOTE
 * (honest, checked 2026-08-24): only the CLAIM is neutralised —
 * `.pgrow__index` / `.pgrow__label` still take their [data-focus] accent, so
 * on touch+RM all three mono kickers read full accent. That is unchanged
 * HEAD behaviour, not a round-10 regression; it is written down here so the
 * next reader does not have to re-derive it.
 */
const PGROW_CSS = `
.pgrow__claim {
  color: hsl(var(--ink));
  transition:
    color 0.6s var(--ease-lusion),
    filter 0.6s var(--ease-lusion);
}
.pgrow__index {
  color: hsl(var(--accent) / 0.6);
  transition: color 0.6s var(--ease-lusion);
}
.pgrow__label {
  color: hsl(var(--ink-mute));
  transition: color 0.6s var(--ease-lusion);
}
.pgrow:focus-visible .pgrow__claim,
.pgrow[data-focus="true"] .pgrow__claim {
  color: hsl(189 100% 96%);
  filter:
    drop-shadow(0 0 10px hsl(var(--accent) / 0.55))
    drop-shadow(0 0 28px hsl(var(--accent) / 0.3));
}
.pgrow:focus-visible .pgrow__label,
.pgrow[data-focus="true"] .pgrow__label { color: hsl(var(--accent)); }
.pgrow:focus-visible .pgrow__index,
.pgrow[data-focus="true"] .pgrow__index { color: hsl(var(--accent)); }
@media (hover: hover) and (pointer: fine) {
  .pgrow:hover .pgrow__claim {
    color: hsl(189 100% 96%);
    filter:
      drop-shadow(0 0 10px hsl(var(--accent) / 0.55))
      drop-shadow(0 0 28px hsl(var(--accent) / 0.3));
  }
  .pgrow:hover .pgrow__label { color: hsl(var(--accent)); }
  .pgrow:hover .pgrow__index { color: hsl(var(--accent)); }
}
@media (prefers-reduced-motion: reduce) {
  /* Rest colour in EVERY state, no transitions (see header note). */
  .pgrow__claim,
  .pgrow:hover .pgrow__claim,
  .pgrow:focus-visible .pgrow__claim,
  .pgrow[data-focus="true"] .pgrow__claim {
    color: hsl(var(--ink));
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
      // Round 8-A: `data-snap` removed — same band-vs-section framing bug as
      // #problem (dossier §1.3). Free sections no longer settle at all.
      //
      // Round 7-3 (continuous-space spec §B.3): section-accent-tint--strong
      // + both SectionGlows removed — this was the strongest tint on the
      // page, the owner's "teal-tinted BLOCK" band. The DOM must not own
      // section-sized ambience; the healthy constellation + starfield +
      // PostFX carry the band, and the W4 cut now sweeps over a seamless
      // field instead of a tinted rectangle. Contrast improves (§B.5).
      className="relative section-lg scroll-mt-24 overflow-hidden"
    >
      <style>{PGROW_CSS}</style>
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
            pins the negative-z band inside this container so it paints below
            every row (the section wash it once sat above was removed round
            7-3). */}
        <div ref={rowRef} className="relative isolate mt-4 sm:mt-12">
          {/* The WebGL anchor rect — full-bleed to the viewport edges; the
              rings ignite at 40/62/84% of this box (registration unchanged).
              Decorative layer: aria-hidden, pointer-events-none. */}
          <div
            data-lattice-anchor="production"
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-[calc(50%-50vw)] right-[calc(50%-50vw)] -z-10"
          >
            {/* Faint blueprint dot-grid (igloo garnish). Round 7-3: masked so
                it dissolves INSIDE its own band (quad-edge hygiene, spec
                §B.3) — the problem section's twin mask, kept identical. */}
            <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--ink)/0.05)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_55%,transparent_95%)]" />
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
                {/* The CLAIM — solid display serif (round 10; the outlined
                    ghost pose is dead), recipe H3 entrance (data-claim;
                    key={language}: SplitText owns the subtree once split —
                    the colour inherits through the split wrappers). */}
                <h3
                  key={language}
                  data-claim
                  className="pgrow__claim mt-2 sm:mt-3 font-display text-[clamp(1.9rem,3.6vw,3.9rem)] leading-[1.05] tracking-[-0.01em] text-balance"
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
