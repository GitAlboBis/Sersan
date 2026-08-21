"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { useNeuralLatticeFallback } from "@/components/fx/use-neural-lattice-fallback";
import { NeuralGraphFallback } from "@/components/fx/neural-graph-fallback";
import { ChapterAnnotation } from "@/components/fx/chapter-annotation";
import { RollLetters, rollDelay } from "@/components/fx/roll-letters";
import { useLedgerIgnition } from "@/components/fx/use-ledger-ignition";

/**
 * ProblemSection — names the pain (demo-to-production gap).
 *
 * TYPOGRAPHIC LEDGER ROWS (round 3 de-card, 2026-08-21 — the glass panes are
 * GONE; the reference grammar is Noomo's ghost display words + award list
 * rows, AT's `->` mono lists, Lusion's chrome-less rule):
 *   - Chapter heading (round 2, unchanged): chapter-scale display serif h2
 *     with data-split-reveal + key={language} (HeadingChoreographer masked
 *     line-rise) and the description as the right-hung ChapterAnnotation.
 *     The `[data-emerge]` wrapper — the singularity passage's zoom-in landing
 *     target — stays around the whole heading block.
 *   - Each failure is a FULL-WIDTH row over a hairline (no box, no bg, no
 *     radius): `[mono index 01·] [CAUSE display serif] [-> accent mono]
 *     [EFFECT ghost display serif]` on one big line, the body as a small mono
 *     annotation in the right cell (grid [1fr_minmax(280px,34%)] — Lusion
 *     big-left/small-right pairing).
 *   - GHOST TYPE = the z-interleave illusion: the EFFECT word renders as
 *     outlined/transparent serif (text-stroke; plain low-alpha ink where
 *     unsupported) so the WebGL river flowing BEHIND the DOM shines through
 *     the glyphs. On IGNITION (fine-pointer hover, keyboard focus, or the
 *     touch centre-band via use-centre-focus) the ghost FILLS amber-tinged
 *     (it names the failure), the `->` slides +6px, the index brightens, and
 *     setHovered("broken", i) fires the existing store link (the debris
 *     re-cohere tease in the WebGL field).
 *   - BAND GEOMETRY CONTRACT (§A round 3, shared with the stream agent): the
 *     `[data-lattice-anchor="problem"]` rect is now the FULL-BLEED background
 *     of the rows stack — absolute inset-y-0, x bled edge-to-edge past the
 *     container gutter, -z-10 inside the isolated rows container. The river
 *     runs edge-to-edge behind the type; the fracture registration (~55% of
 *     band x) is unchanged. Ghost callouts + dot grid KEPT, callouts
 *     repositioned into the inter-row gaps.
 *   - Reveal (IO once, RM never primes anything): the display words play the
 *     LUSION LETTER-ROLL (RollLetters — per-letter columns streaming through
 *     a clip, yPercent −500→0 expo.inOut, center-out cosine stagger; the
 *     work section's RollingTitle grammar), rows staggered 110ms. The ghost
 *     EFFECT word rolls in ALREADY-SCRAMBLED (deterministic decode decoys)
 *     and lands decoded — roll + AT glyph-decode composed, zero timers. The
 *     mono index and `->` blur-free fade in behind the roll; annotations
 *     fade 150ms later. bump("broken") on the in-view edge is untouched
 *     (the surge that dies at the fracture).
 *   - A11y: strings in source order (index → cause → effect → body), ghost
 *     styling is pure CSS on real text (SR-transparent), rows are tabIndex=0
 *     with the global :focus-visible ring; focus = ignition (hover parity).
 *     Reduced motion: solid-ink readable static — no ghost outline, no
 *     transitions, no timers.
 *
 * Copy is byte-identical to the pre-refactor section (EN + IT).
 */

type Failure = {
  num: string;
  cause: string;
  effect: string;
  body: string;
};

function getFailures(isEn: boolean): Failure[] {
  return [
    {
      num: "01",
      cause: isEn ? "No evals" : "Niente valutazioni",
      effect: isEn ? "no signal" : "niente segnale",
      body: isEn
        ? "A system you can't measure is a system you can't fix. Most teams ship without a regression set, then debug at 3am with prompt diffs and screenshots."
        : "Un sistema che non puoi misurare è un sistema che non puoi correggere. La maggior parte dei team va in produzione senza un set di regressione, poi fa debugging alle 3 di notte con diff dei prompt e screenshot.",
    },
    {
      num: "02",
      cause: isEn ? "No traces" : "Niente tracce",
      effect: isEn ? "no debugging" : "niente debugging",
      body: isEn
        ? "When the agent makes the wrong call, you need to know which step failed. Without structured tracing, every incident becomes archaeology."
        : "Quando l'agente prende la decisione sbagliata, devi sapere quale passo ha fallito. Senza un tracing strutturato, ogni incidente diventa un lavoro di archeologia.",
    },
    {
      num: "03",
      cause: isEn ? "No boundaries" : "Niente confini",
      effect: isEn ? "no trust" : "niente fiducia",
      body: isEn
        ? "Tools and data without a permission model become a liability the first time the agent does something a regulator notices."
        : "Tool e dati senza un modello di permessi diventano un rischio la prima volta che l'agente fa qualcosa che un'autorità di vigilanza nota.",
    },
  ];
}

// === in-view bump =========================================================
// On the false→true edge, bump the neural-lattice store's "broken" surface so
// the WebGL stream fires the surge that dies at the fracture. Inert under
// reduced-motion (the island is unmounted at tier "off" and we early-return so
// the store is never even touched). Pure side-effect — no DOM change.
function useBrokenStreamOnEnter(inView: boolean) {
  const bump = useNeuralLatticeStore((s) => s.bump);
  useEffect(() => {
    if (!inView) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    bump("broken");
  }, [inView, bump]);
}

function useInView<T extends HTMLElement>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { rootMargin: margin, threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [margin]);
  return { ref, inView };
}

/**
 * Ignition CSS — file-scoped (no globals.css edits, parallel-agent rule).
 * Three visual triggers, one per input class: `:hover` (fine pointer only,
 * media-gated), `:focus-visible` (keyboard), `[data-focus="true"]` (touch
 * centre-band, written by lib/use-centre-focus). The store twin lives in
 * useLedgerIgnition. Transitions are color / stroke-color / transform only.
 * Reduced motion: the ghost is solid readable ink-mute, nothing transitions.
 */
const PLROW_CSS = `
.plrow__ghost {
  color: hsl(var(--ink) / 0.25);
  transition: color 0.6s var(--ease-lusion);
}
@supports (-webkit-text-stroke-width: 1px) {
  .plrow__ghost {
    color: transparent;
    -webkit-text-stroke: 1px hsl(var(--ink) / 0.35);
    transition:
      color 0.6s var(--ease-lusion),
      -webkit-text-stroke-color 0.6s var(--ease-lusion);
  }
}
.plrow__arrow {
  display: inline-block;
  transition: transform 0.6s var(--ease-lusion);
}
.plrow__index {
  color: hsl(var(--accent) / 0.6);
  transition: color 0.6s var(--ease-lusion);
}
.plrow:focus-visible .plrow__ghost,
.plrow[data-focus="true"] .plrow__ghost {
  color: hsl(36 60% 72%);
  -webkit-text-stroke-color: hsl(36 60% 72% / 0.45);
}
.plrow:focus-visible .plrow__arrow,
.plrow[data-focus="true"] .plrow__arrow { transform: translateX(6px); }
.plrow:focus-visible .plrow__index,
.plrow[data-focus="true"] .plrow__index { color: hsl(var(--accent)); }
@media (hover: hover) and (pointer: fine) {
  .plrow:hover .plrow__ghost {
    color: hsl(36 60% 72%);
    -webkit-text-stroke-color: hsl(36 60% 72% / 0.45);
  }
  .plrow:hover .plrow__arrow { transform: translateX(6px); }
  .plrow:hover .plrow__index { color: hsl(var(--accent)); }
}
@media (prefers-reduced-motion: reduce) {
  /* Solid-ink readable static in EVERY state: use-centre-focus's static
     mode marks all rows [data-focus="true"] on touch+RM, and the ignition
     selectors above out-specify the bare class — so the RM pin must carry
     the state selectors too. */
  .plrow__ghost,
  .plrow:hover .plrow__ghost,
  .plrow:focus-visible .plrow__ghost,
  .plrow[data-focus="true"] .plrow__ghost {
    color: hsl(var(--ink-mute));
    -webkit-text-stroke-width: 0;
    transition: none;
  }
  .plrow__arrow,
  .plrow:hover .plrow__arrow,
  .plrow:focus-visible .plrow__arrow,
  .plrow[data-focus="true"] .plrow__arrow {
    transform: none;
    transition: none;
  }
  .plrow__index { transition: none; }
}
`;

/** Ghost callout placement — tracks the §B stream-v3 WEAVE (coordination
 * data 2026-08-21): the broken river enters HIGH (band-y +0.18 → css top
 * ~32%), dips through the mid (−0.08 → ~58%), fractures at x≈55% y≈−0.12,
 * debris descending right of it. Callouts ride that descent: "no signal"
 * upstream high, "no debugging" near the dip, "no trust" in the debris zone.
 * (band-y is a fraction of band height, 0 = center, + = up; css top =
 * 50% − y·100. Leader lines point INTO the path: edge "top" hangs the label
 * above its target, "bottom" below it.)
 * max-sm:hidden — aria-hidden garnish; the same strings live in the rows. */
const CALLOUT_POS: { left: string; edge: "top" | "bottom"; at: string }[] = [
  { left: "30%", edge: "top", at: "23%" },
  { left: "45%", edge: "bottom", at: "31%" },
  { left: "62%", edge: "top", at: "71%" },
];

export default function ProblemSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const failures = getFailures(isEn);
  const showFallback = useNeuralLatticeFallback();

  // ONE latched in-view edge for the whole ledger: fires the store bump and
  // arms the row reveal.
  const { ref: rowRef, inView } = useInView<HTMLDivElement>();
  useBrokenStreamOnEnter(inView);

  // Ignition driver: centre-band on touch (data-focus), hover/focus on fine
  // pointer — visual is CSS above; the store link (debris re-cohere tease)
  // rides the same edges via setHovered("broken", i).
  const { rowRefs, rowHandlers } = useLedgerIgnition("broken", failures.length);

  // Once-per-life ledger reveal — the LUSION LETTER-ROLL on the display
  // words (rows staggered 110ms; per-word columns roll yPercent −500→0
  // expo.inOut with the center-out cosine stagger — the work RollingTitle
  // math), the mono index/arrow fade in behind, annotations fade 150ms
  // later. The ghost EFFECT word's decoy copies are pre-scrambled glyphs, so
  // the roll IS the decode. Primed idempotently on every dep re-run BEFORE
  // the play guard (useGSAP is a layout effect — no hidden-then-visible
  // flash); reduced-motion never primes anything hidden and never starts a
  // timer.
  const playedRef = useRef(false);
  useGSAP(
    () => {
      const row = rowRef.current;
      if (!row) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (playedRef.current) return;
      const rows = row.querySelectorAll<HTMLElement>("[data-ledger-row]");
      if (!rows.length) return;
      const cols = row.querySelectorAll<HTMLElement>("[data-roll-col]");
      const fades = row.querySelectorAll<HTMLElement>("[data-row-fade]");
      const notes = row.querySelectorAll<HTMLElement>("[data-row-note]");
      if (cols.length) gsap.set(cols, { yPercent: -500 });
      if (fades.length) gsap.set(fades, { autoAlpha: 0, y: 8 });
      if (notes.length) gsap.set(notes, { autoAlpha: 0, y: 12 });
      if (!inView) return;
      playedRef.current = true;
      const tl = gsap.timeline();
      rows.forEach((r, i) => {
        const at = i * 0.11;
        // Letter-roll per word: cause leads, the ghost effect follows a
        // beat later (it lands already-decoded — the decoys carry the
        // scramble).
        r.querySelectorAll<HTMLElement>("[data-roll-word]").forEach(
          (word, wi) => {
            const wordCols = word.querySelectorAll<HTMLElement>(
              "[data-roll-col]",
            );
            const n = wordCols.length;
            wordCols.forEach((col, ci) => {
              tl.fromTo(
                col,
                { yPercent: -500 },
                { yPercent: 0, duration: 1.25, ease: "expo.inOut" },
                at + wi * 0.12 + rollDelay(ci, n),
              );
            });
          },
        );
        const rowFades = r.querySelectorAll<HTMLElement>("[data-row-fade]");
        if (rowFades.length) {
          tl.to(
            rowFades,
            { autoAlpha: 1, y: 0, duration: 0.5, ease: "expo.out" },
            at + 0.35,
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
    },
    // `language` is a dep so an EN/IT toggle BEFORE the reveal re-primes the
    // fresh roll columns (a longer word renders NEW cols; without a re-run
    // they'd sit unprimed-visible next to hidden siblings while the section
    // scrolls in). After the play the played guard returns early — settled
    // visible, no replay.
    { dependencies: [inView, language], scope: rowRef },
  );

  return (
    <section
      id="problem"
      data-snap
      className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
    >
      <style>{PLROW_CSS}</style>
      <SectionGlow position="top-right" intensity={1.2} />
      <SectionGlow position="bottom-left" intensity={0.8} size="50rem" />
      <div className="container-px relative">
        {/* Chapter heading — the [data-emerge] wrapper is the singularity
            passage's zoom-in landing target: the one-shot plunge timeline
            drives this div transform-only (scale 0.8 + a 10% offset toward
            the tunnel's vanishing point → identity). Inert on every path
            where the passage never arms. */}
        <div data-emerge style={{ willChange: "transform" }}>
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
                    ? "The demo-to-production gap"
                    : "Il divario tra demo e produzione"}
                </span>
              </p>
              {/* max-sm override: the chapter clamp's 2.6rem floor costs a
                  full extra title line at 390px — 2.1rem keeps the chapter
                  read while clawing ~80px back toward the §Mobile budget
                  (presentation-only; copy untouched).
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
                    Most AI projects don&apos;t fail at the prototype.{" "}
                    <span className="font-display italic text-ink-mute">
                      They fail two months after.
                    </span>
                  </>
                ) : (
                  <>
                    La maggior parte dei progetti AI non fallisce al prototipo.{" "}
                    <span className="font-display italic text-ink-mute">
                      Fallisce due mesi dopo.
                    </span>
                  </>
                )}
              </h2>
            </div>
            {/* The right-hung annotation (~320px, Noomo/Lusion pairing) —
                blur-fades in ~0.3s behind the title's line-rise. */}
            <ChapterAnnotation>
              {isEn
                ? "The demo worked. The board nodded. Then real volume hit and the agent started lying, the retrieval drifted, cost-per-run tripled, and no-one on the team could tell which of the seven things you changed last week broke it."
                : "La demo funzionava. Il consiglio ha annuito. Poi è arrivato il volume reale e l'agente ha iniziato a inventare, il retrieval è andato in deriva, il costo per esecuzione è triplicato e nessuno nel team sapeva quale delle sette cose cambiate la settimana scorsa l'avesse rotto."}
            </ChapterAnnotation>
          </div>
        </div>

        {/* THE LEDGER — a stack of full-width typographic rows; the WebGL
            band is its full-bleed -z-10 background (BAND GEOMETRY CONTRACT).
            `isolate` pins the negative-z band inside this container so it
            paints above the section wash but below every row. */}
        <div ref={rowRef} className="relative isolate mt-6 sm:mt-12">
          {/* The WebGL anchor rect — the stream is camera-locked to this box
              (persistent canvas paints behind the DOM). Full-bleed: the x
              inset escapes the container gutter to the viewport edges (the
              section's overflow-hidden trims the scrollbar sliver).
              Decorative layer: aria-hidden, pointer-events-none. */}
          <div
            data-lattice-anchor="problem"
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-[calc(50%-50vw)] right-[calc(50%-50vw)] -z-10"
          >
            {/* Faint blueprint dot-grid (igloo garnish). */}
            <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--ink)/0.05)_1px,transparent_1px)] [background-size:26px_26px]" />
            {showFallback && (
              <NeuralGraphFallback
                variant="broken"
                className="absolute inset-0 h-full w-full opacity-90"
              />
            )}
            {/* Ghost callouts — EXISTING effect strings only, leader lines
                pointing into the field. `.eyebrow` → LabelScrambler decode. */}
            {failures.map((f, i) => {
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
                  {f.effect}
                </span>
              );
            })}
          </div>

          {/* The rows — full-width, chrome-less, each closed by a hairline.
              tabIndex + the global :focus-visible ring; hover/focus/centre
              ignite (CSS) and fire the store link (useLedgerIgnition). */}
          {failures.map((f, i) => (
            <article
              key={f.num}
              ref={rowRefs[i]}
              tabIndex={0}
              data-ledger-row={i}
              {...rowHandlers[i]}
              className="plrow grid gap-x-10 gap-y-3 border-b border-[hsl(var(--rule)/0.5)] py-8 max-sm:py-5 lg:py-10 sm:grid-cols-[1fr_minmax(280px,34%)] sm:items-end"
            >
              {/* The cause/effect line — CAUSE letter-rolls in (pure Lusion),
                  the ghost EFFECT rolls in pre-scrambled and lands decoded
                  (the river window). Index and `->` fade behind the roll. */}
              <h3 className="font-display text-[clamp(1.9rem,3.2vw,3.4rem)] leading-[1.05] tracking-[-0.01em] text-ink">
                <span
                  data-row-fade
                  className="plrow__index font-mono text-[0.38em] align-middle tracking-[0.16em] tabular-nums"
                >
                  {`0${i + 1}`}
                  <span aria-hidden="true">·</span>
                </span>{" "}
                <RollLetters text={f.cause} />{" "}
                <span
                  data-row-fade
                  aria-hidden="true"
                  className="plrow__arrow font-mono text-[0.55em] align-middle text-[hsl(var(--accent)/0.9)]"
                >
                  {"->"}
                </span>{" "}
                <RollLetters
                  text={f.effect}
                  decoys="decode"
                  className="plrow__ghost"
                />
              </h3>
              {/* The body as the right-cell mono annotation (Lusion pairing).
                  Fades in 150ms behind the row's rise; never primed under
                  RM/no-JS. */}
              <p
                data-row-note
                className="font-mono text-[13px] leading-relaxed text-ink-mute max-w-[44ch] sm:justify-self-end"
              >
                {f.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
