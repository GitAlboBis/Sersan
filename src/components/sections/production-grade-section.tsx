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
import { ChapterAnnotation } from "@/components/fx/chapter-annotation";
import { scrambleDecode } from "@/components/fx/glyph-decode";
import { RollLetters, rollDelay } from "@/components/fx/roll-letters";
import { useLedgerIgnition } from "@/components/fx/use-ledger-ignition";

/**
 * ProductionGradeSection — the SIGNATURE section, ProblemSection's twin.
 *
 * TYPOGRAPHIC LEDGER ROWS (round 3 de-card, 2026-08-21 — the glass panes are
 * GONE; same grammar as the Problem ledger, opposite narrative — the stream
 * is HEALTHY here):
 *   - Chapter heading (round 2, unchanged): chapter-scale h2 with
 *     data-split-reveal + key={language}, the D-17 description as the
 *     right-hung ChapterAnnotation (byte-identical string).
 *   - Each artifact is a FULL-WIDTH row over a hairline: a mono kicker line
 *     `[01·] [cluster label]`, then the CLAIM in display serif (wraps to two
 *     lines, leading-[1.05]) rendered as GHOST type at rest — outlined /
 *     transparent so the WebGL river threading the guide rings shines
 *     through the glyphs — with `why` as the right-cell mono annotation
 *     (grid [1fr_minmax(280px,34%)], Lusion big-left/small-right pairing).
 *   - IGNITION (fine-pointer hover, keyboard focus, touch centre-band): the
 *     claim FILLS to solid ink, the cluster eyebrow goes accent, the index
 *     brightens, and setHovered("healthy", i) flares ring i in the WebGL
 *     field (existing store link, untouched).
 *   - BAND GEOMETRY CONTRACT (§A round 3, shared with the stream agent): the
 *     `[data-lattice-anchor="production"]` rect is the FULL-BLEED background
 *     of the rows stack — absolute inset-y-0, x bled edge-to-edge past the
 *     container gutter, -z-10 inside the isolated rows container. Ring
 *     registration is UNCHANGED (40/62/84% of band x — RING_T in
 *     webgl/neural/neuralLatticeConfig.ts; the ghost callout x mirrors it).
 *     Ghost callouts + dot grid KEPT, callouts repositioned into the
 *     inter-row gaps.
 *   - ENTRANCE (IO once, RM never primes anything), rows staggered 110ms:
 *     the mono cluster KICKER plays the Lusion LETTER-ROLL (RollLetters —
 *     the work RollingTitle grammar) while the index fades behind it; the
 *     long CLAIM keeps the masked line-rise (Lusion line-rises long
 *     headings) and glyph-decodes (shared scrambleDecode) as its rise
 *     lands; `bumpCluster("healthy", i)` RIDES ROW i's REVEAL BEAT — DOM
 *     row and WebGL ring ignite together, in pipeline order (on the
 *     fallback tier the SVG twin draws its own ring ignition on mount);
 *     annotations fade 150ms later. Scroll-away/back never re-runs it.
 *   - `productionPulseStore.bump()` on every in-view edge is UNTOUCHED (the
 *     signature line's BEAT 1 emissive boost).
 *   - A11y: strings in source order (index → label → claim → why), ghost
 *     styling is pure CSS on real text, rows are tabIndex=0 with the global
 *     :focus-visible ring; focus = ignition. Reduced motion: solid-ink
 *     readable static — no ghost outline, no transitions, no timers, no
 *     store bumps.
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

/** Row reveal stagger (round-3 ledger grammar) — the bumpCluster ring
 * ignitions ride the SAME beats so DOM and WebGL ignite together. */
const ROW_STAGGER = 0.11;
/** Offset into each row's 0.7s expo.out rise at which it reads as "landed"
 * — the ring ignition fires here. */
const IGNITE_OFFSET = 0.25;
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
 * Ignition CSS — file-scoped (no globals.css edits, parallel-agent rule).
 * Same three-trigger contract as the Problem ledger; here the ghost CLAIM
 * fills to solid ink and the cluster eyebrow goes accent. Transitions are
 * color / stroke-color only. Reduced motion: solid readable ink, static.
 */
const PGROW_CSS = `
.pgrow__ghost {
  color: hsl(var(--ink) / 0.25);
  transition: color 0.6s var(--ease-lusion);
}
@supports (-webkit-text-stroke-width: 1px) {
  .pgrow__ghost {
    color: transparent;
    -webkit-text-stroke: 1px hsl(var(--ink) / 0.35);
    transition:
      color 0.6s var(--ease-lusion),
      -webkit-text-stroke-color 0.6s var(--ease-lusion);
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
  color: hsl(var(--ink));
  -webkit-text-stroke-color: transparent;
}
.pgrow:focus-visible .pgrow__label,
.pgrow[data-focus="true"] .pgrow__label { color: hsl(var(--accent)); }
.pgrow:focus-visible .pgrow__index,
.pgrow[data-focus="true"] .pgrow__index { color: hsl(var(--accent)); }
@media (hover: hover) and (pointer: fine) {
  .pgrow:hover .pgrow__ghost {
    color: hsl(var(--ink));
    -webkit-text-stroke-color: transparent;
  }
  .pgrow:hover .pgrow__label { color: hsl(var(--accent)); }
  .pgrow:hover .pgrow__index { color: hsl(var(--accent)); }
}
@media (prefers-reduced-motion: reduce) {
  /* Solid-ink readable static in EVERY state: use-centre-focus's static
     mode marks all rows [data-focus="true"] on touch+RM, and the ignition
     selectors above out-specify the bare class — so the RM pin must carry
     the state selectors too. */
  .pgrow__ghost,
  .pgrow:hover .pgrow__ghost,
  .pgrow:focus-visible .pgrow__ghost,
  .pgrow[data-focus="true"] .pgrow__ghost {
    color: hsl(var(--ink));
    -webkit-text-stroke-width: 0;
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

  // ONE in-view edge for the whole ledger. It (a) re-bumps the signature-line
  // pulse on every re-entry (tracking observer) and (b) arms the once-only
  // entrance below.
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

      const rows = row.querySelectorAll<HTMLElement>("[data-ledger-row]");
      if (!rows.length) return;
      const masks = row.querySelectorAll<HTMLElement>("[data-row-mask]");
      const rises = row.querySelectorAll<HTMLElement>("[data-row-rise]");
      const cols = row.querySelectorAll<HTMLElement>("[data-roll-col]");
      const fades = row.querySelectorAll<HTMLElement>("[data-row-fade]");
      const notes = row.querySelectorAll<HTMLElement>("[data-row-note]");
      // PRIME (idempotent across dep re-runs; useGSAP is a layout effect, so
      // this lands before paint — no hidden-then-visible flash). Clip windows
      // are JS-owned: overflow set here, cleared after the timeline settles —
      // SSR/no-JS/RM never clip a descender.
      if (masks.length) gsap.set(masks, { overflow: "hidden" });
      if (rises.length) gsap.set(rises, { yPercent: 115 });
      if (cols.length) gsap.set(cols, { yPercent: -500 });
      if (fades.length) gsap.set(fades, { autoAlpha: 0, y: 8 });
      if (notes.length) gsap.set(notes, { autoAlpha: 0, y: 12 });

      // Primed but not yet on screen: wait for the IO edge (the inView dep
      // re-runs this effect, falls through the guards above, and plays).
      if (!inView) return;
      playedRef.current = true;

      // ONE timeline per row beat: the kicker LETTER-ROLLS, the claim
      // masked-rises and, ON THE SAME BEAT, ring i ignites (bumpCluster is
      // the store signal each ring's >1.0 flash decays from — harmless
      // no-op writes on the fallback tier, where the SVG twin runs its own
      // ignition on mount). The ghost claim glyph-decodes as its rise
      // lands; the annotation fades 150ms later.
      const tl = gsap.timeline();
      rows.forEach((r, i) => {
        const at = i * ROW_STAGGER;
        // Kicker letter-roll (center-out cosine stagger, the work
        // RollingTitle math).
        r.querySelectorAll<HTMLElement>("[data-roll-word]").forEach((word) => {
          const wordCols = word.querySelectorAll<HTMLElement>(
            "[data-roll-col]",
          );
          const n = wordCols.length;
          wordCols.forEach((col, ci) => {
            tl.fromTo(
              col,
              { yPercent: -500 },
              { yPercent: 0, duration: 1.25, ease: "expo.inOut" },
              at + rollDelay(ci, n),
            );
          });
        });
        const rowRises = r.querySelectorAll<HTMLElement>("[data-row-rise]");
        if (rowRises.length) {
          tl.to(
            rowRises,
            { yPercent: 0, duration: 0.7, ease: "expo.out", stagger: 0.06 },
            at + 0.1,
          );
        }
        // Ring i ignites exactly as row i lands — DOM and WebGL together.
        tl.call(
          () => {
            bumpCluster("healthy", i);
          },
          undefined,
          at + IGNITE_OFFSET,
        );
        const rowFades = r.querySelectorAll<HTMLElement>("[data-row-fade]");
        if (rowFades.length) {
          tl.to(
            rowFades,
            { autoAlpha: 1, y: 0, duration: 0.5, ease: "expo.out" },
            at + 0.25,
          );
        }
        const ghost = r.querySelector<HTMLElement>("[data-row-ghost]");
        if (ghost) {
          tl.call(
            () => {
              scrambleDecode(ghost);
            },
            undefined,
            at + 0.4,
          );
        }
        const note = r.querySelector<HTMLElement>("[data-row-note]");
        if (note) {
          tl.to(
            note,
            { autoAlpha: 1, y: 0, duration: 0.6, ease: "expo.out" },
            at + 0.45,
          );
        }
      });
      if (masks.length) tl.set(masks, { clearProps: "overflow" });
    },
    // `language` is a dep so an EN/IT toggle BEFORE the reveal re-primes the
    // fresh roll columns / rises (see the Problem ledger's twin note). After
    // the play the played guard returns early — settled visible, no replay.
    { dependencies: [inView, bumpCluster, language], scope: rowRef },
  );

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

          {/* The rows — full-width, chrome-less, each closed by a hairline.
              tabIndex + the global :focus-visible ring; hover/focus/centre
              ignite (CSS) and fire the store link (useLedgerIgnition). */}
          {artifacts.map((a, i) => (
            <article
              key={i}
              ref={rowRefs[i]}
              tabIndex={0}
              data-ledger-row={i}
              {...rowHandlers[i]}
              className="pgrow grid gap-x-10 gap-y-3 border-b border-[hsl(var(--rule)/0.5)] py-8 max-sm:py-5 lg:py-10 sm:grid-cols-[1fr_minmax(280px,34%)] sm:items-end"
            >
              <div>
                {/* Kicker line: the cluster label LETTER-ROLLS in (goes
                    accent on ignition); the mono index fades behind it. */}
                <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.16em]">
                  <span data-row-fade className="pgrow__index tabular-nums">
                    {`0${i + 1}`}
                    <span aria-hidden="true">·</span>
                  </span>{" "}
                  <RollLetters
                    text={clusterLabel(i, isEn)}
                    className="pgrow__label"
                  />
                </p>
                {/* The CLAIM — ghost display serif at rest (the river shines
                    through), fills to solid ink on ignition. Masked rise +
                    glyph decode. */}
                <div data-row-mask className="relative mt-2 sm:mt-3">
                  <h3
                    data-row-rise
                    data-row-ghost
                    className="pgrow__ghost font-display text-[clamp(1.9rem,3.2vw,3.4rem)] leading-[1.05] tracking-[-0.01em] text-balance"
                  >
                    {a.claim}
                  </h3>
                </div>
              </div>
              {/* The why as the right-cell mono annotation (Lusion pairing).
                  Fades in 150ms behind the row's rise; never primed under
                  RM/no-JS. */}
              <p
                data-row-note
                className="font-mono text-[13px] leading-relaxed text-ink-mute max-w-[44ch] sm:justify-self-end"
              >
                {a.why}
              </p>
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
