"use client";

import { useEffect, useRef, useState } from "react";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { useNeuralLatticeFallback } from "@/components/fx/use-neural-lattice-fallback";
import { NeuralGraphFallback } from "@/components/fx/neural-graph-fallback";
import { RollLetters } from "@/components/fx/roll-letters";
import { useLedgerIgnition } from "@/components/fx/use-ledger-ignition";
import { useChapterScrub, useLedgerScrub } from "@/components/fx/use-type-scrub";

/**
 * ProblemSection — names the pain (demo-to-production gap).
 *
 * SCROLL-SCRUBBED TYPOGRAPHIC LEDGER (round 4, 2026-08-21 — owner: the
 * round-3 IO-once entrances are gone; the type is BOUND TO SCROLL, building
 * with the scroll and reversing when scrubbing back; the /consulting
 * practice-ledger's scrub grammar promoted to per-row scrubs):
 *   - Chapter heading: the h2 dropped `data-split-reveal` (the shared
 *     one-shot HeadingChoreographer no longer owns it — untouched for the
 *     rest of the site) and carries `data-chapter-h2` → useChapterScrub
 *     drives a SCRUBBED SplitText line-rise (staggered sub-windows, start
 *     "top 90%" / end "top 45%") with the right-hung `[data-chapter-note]`
 *     annotation following in the last 25%. key={language} + revert
 *     discipline unchanged. The `[data-emerge]` wrapper — the singularity
 *     passage's zoom-in landing target — stays around the heading block.
 *   - Each failure is a FULL-WIDTH row over a hairline (no box, no bg):
 *     `[mono index 01·] [CAUSE display serif] [-> accent mono] [EFFECT ghost
 *     display serif]` on one big line, the body as a small mono annotation in
 *     the right cell (grid [1fr_minmax(280px,34%)] — Lusion pairing).
 *   - PER-ROW SCRUB (useLedgerScrub; scrub:true raw — Lenis smooths; start
 *     "top 85%" / end "top 40%"; no pin): the ghost EFFECT word FILLS
 *     LEFT→RIGHT with the amber failure tone exactly proportionally to the
 *     row's progress (background-clip:text gradient, background-size driven
 *     by GSAP; the text-stroke outline sits UNDER the un-filled part at all
 *     times); index + `->` rise/settle on the first 25%; the CAUSE word's
 *     Lusion letter-roll (RollLetters) is scrub-driven — letters stream
 *     through the clip WITH the scroll; the hairline draws scaleX across the
 *     middle; the annotation fades+rises in the last 35%. Everything
 *     reverses scrubbing up; re-entry replays by construction.
 *   - GHOST TYPE = the z-interleave illusion: un-filled glyphs are
 *     outlined/transparent serif so the WebGL river flowing BEHIND the DOM
 *     shines through. IGNITION (fine-pointer hover, keyboard focus, touch
 *     centre-band) is an ACCENT ON TOP of the scroll fill — a brightness +
 *     glyph-shaped drop-shadow glow and a stroke hue shift, never a second
 *     fill — and still fires setHovered("broken", i) (the debris re-cohere
 *     tease in the WebGL field) via useLedgerIgnition, unchanged.
 *   - BAND GEOMETRY CONTRACT (§A round 3, shared with the stream agent): the
 *     `[data-lattice-anchor="problem"]` rect stays the FULL-BLEED -z-10
 *     background of the rows stack; fracture registration unchanged. Ghost
 *     callouts + dot grid KEPT. bump("broken") on the in-view edge is
 *     untouched (the surge that dies at the fracture).
 *   - Guards: SSR/no-JS renders fully-solid amber fill (background-size 100%
 *     in CSS — no stroke-only state without JS), full-width hairlines,
 *     visible notes; scrub poses are primed only at arm with an immediate
 *     init snap. Reduced motion: static solid ink-mute, zero scrub
 *     choreography (the CSS pin below + the hook's early return).
 *   - A11y: strings in source order (index → cause → effect → body), ghost
 *     styling is pure CSS on real text (SR-transparent), rows are tabIndex=0
 *     with the global :focus-visible ring; focus = ignition (hover parity).
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
 * Ghost + ignition CSS — file-scoped (no globals.css edits, parallel-agent
 * rule).
 *
 * SCRUB-FILL MACHINERY (round 4): the ghost EFFECT word paints its fill as a
 * background-clip:text gradient. The BASE state is fully filled
 * (background-size 100%) so SSR / no-JS / unsupported browsers read solid
 * amber — the scrub-derived partial fill exists only as a GSAP inline
 * background-size write, primed at arm. The -webkit-text-stroke outline sits
 * under the fill at all times: where the wipe hasn't arrived the glyphs are
 * outline-only (the WebGL river window), where it has they're solid amber.
 *
 * IGNITION (hover / :focus-visible / [data-focus] centre-band) is an accent
 * ON TOP of the scroll fill — brightness + glyph-shaped drop-shadow glow +
 * stroke hue shift. NEVER a second fill (the scrub owns the fill). NOTE:
 * text-shadow is unusable here — with background-clip:text it paints OVER
 * the clipped fill; filter: drop-shadow() composites post-render instead.
 *
 * Reduced motion: the ghost is solid readable ink-mute, no stroke, no
 * gradient machinery, nothing transitions (the state selectors must be
 * carried too — use-centre-focus's static mode marks all rows
 * [data-focus="true"] on touch+RM and would out-specify the bare class).
 */
const PLROW_CSS = `
.plrow__ghost {
  color: hsl(36 60% 72%);
  transition:
    filter 0.6s var(--ease-lusion),
    -webkit-text-stroke-color 0.6s var(--ease-lusion);
}
@supports ((-webkit-background-clip: text) and (-webkit-text-stroke-width: 1px)) {
  .plrow__ghost {
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: 1px hsl(var(--ink) / 0.35);
    background-image: linear-gradient(90deg, hsl(36 60% 72%), hsl(36 60% 72%));
    background-repeat: no-repeat;
    background-position: 0 0;
    background-size: 100% 100%;
    -webkit-background-clip: text;
    background-clip: text;
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
  filter: brightness(1.3) drop-shadow(0 0 14px hsl(36 60% 72% / 0.4));
  -webkit-text-stroke-color: hsl(36 60% 72% / 0.5);
}
.plrow:focus-visible .plrow__arrow,
.plrow[data-focus="true"] .plrow__arrow { transform: translateX(6px); }
.plrow:focus-visible .plrow__index,
.plrow[data-focus="true"] .plrow__index { color: hsl(var(--accent)); }
@media (hover: hover) and (pointer: fine) {
  .plrow:hover .plrow__ghost {
    filter: brightness(1.3) drop-shadow(0 0 14px hsl(36 60% 72% / 0.4));
    -webkit-text-stroke-color: hsl(36 60% 72% / 0.5);
  }
  .plrow:hover .plrow__arrow { transform: translateX(6px); }
  .plrow:hover .plrow__index { color: hsl(var(--accent)); }
}
@media (prefers-reduced-motion: reduce) {
  /* Solid-ink readable static in EVERY state (see header note). */
  .plrow__ghost,
  .plrow:hover .plrow__ghost,
  .plrow:focus-visible .plrow__ghost,
  .plrow[data-focus="true"] .plrow__ghost {
    color: hsl(var(--ink-mute));
    -webkit-text-fill-color: currentColor;
    -webkit-text-stroke-width: 0;
    background-image: none;
    filter: none;
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

  // ONE latched in-view edge for the whole ledger: fires the store bump (the
  // surge that dies at the fracture). The reveal itself is scrubbed now — no
  // arm needed.
  const { ref: rowRef, inView } = useInView<HTMLDivElement>();
  useBrokenStreamOnEnter(inView);

  // Ignition driver: centre-band on touch (data-focus), hover/focus on fine
  // pointer — visual is CSS above; the store link (debris re-cohere tease)
  // rides the same edges via setHovered("broken", i).
  const { rowRefs, rowHandlers } = useLedgerIgnition("broken", failures.length);

  // Round-4 scroll-scrubbed type: the chapter h2/annotation and the per-row
  // fill-wipe/rise/roll/hairline/note choreography (see use-type-scrub.ts
  // for the full contract — RM static, SSR solid, init snap, revert on
  // language rebuild).
  const chapterRef = useRef<HTMLDivElement | null>(null);
  useChapterScrub(chapterRef, language);
  useLedgerScrub(rowRef, language, undefined);

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
                    ? "The demo-to-production gap"
                    : "Il divario tra demo e produzione"}
                </span>
              </p>
              {/* max-sm override: the chapter clamp's 2.6rem floor costs a
                  full extra title line at 390px — 2.1rem keeps the chapter
                  read while clawing ~80px back toward the §Mobile budget
                  (presentation-only; copy untouched).
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
                scrubbed into the chapter window's last 25% (round 4; the
                IO-once ChapterAnnotation blur-fade is retired here). */}
            <p
              data-chapter-note
              className="max-w-[320px] text-[13px] leading-relaxed text-ink-mute"
            >
              {isEn
                ? "The demo worked. The board nodded. Then real volume hit and the agent started lying, the retrieval drifted, cost-per-run tripled, and no-one on the team could tell which of the seven things you changed last week broke it."
                : "La demo funzionava. Il consiglio ha annuito. Poi è arrivato il volume reale e l'agente ha iniziato a inventare, il retrieval è andato in deriva, il costo per esecuzione è triplicato e nessuno nel team sapeva quale delle sette cose cambiate la settimana scorsa l'avesse rotto."}
            </p>
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

          {/* The rows — full-width, chrome-less, each closed by a hairline
              (a scrub-drawn span now, not a border — no hidden pose baked in:
              SSR/no-JS/RM paint it full-width). tabIndex + the global
              :focus-visible ring; hover/focus/centre ignite (CSS) and fire
              the store link (useLedgerIgnition). */}
          {failures.map((f, i) => (
            <article
              key={f.num}
              ref={rowRefs[i]}
              tabIndex={0}
              data-ledger-row={i}
              {...rowHandlers[i]}
              className="plrow relative grid gap-x-10 gap-y-3 py-8 max-sm:py-5 lg:py-10 sm:grid-cols-[1fr_minmax(280px,34%)] sm:items-end"
            >
              {/* The cause/effect line — index and `->` scrub-rise on the
                  window's first 25% (inline-block wrappers: GSAP transforms
                  are no-ops on plain inline boxes, and the arrow's hover
                  translate must stay CSS-owned — never share a transform
                  channel with the scrub); the CAUSE letter-roll is
                  scrub-driven; the ghost EFFECT is the fill-wipe canvas. */}
              <h3 className="font-display text-[clamp(1.9rem,3.2vw,3.4rem)] leading-[1.05] tracking-[-0.01em] text-ink">
                <span
                  data-scrub-rise
                  className="plrow__index inline-block font-mono text-[0.38em] align-middle tracking-[0.16em] tabular-nums"
                >
                  {`0${i + 1}`}
                  <span aria-hidden="true">·</span>
                </span>{" "}
                <RollLetters text={f.cause} />{" "}
                <span
                  data-scrub-rise
                  aria-hidden="true"
                  className="inline-block align-middle"
                >
                  <span className="plrow__arrow font-mono text-[0.55em] text-[hsl(var(--accent)/0.9)]">
                    {"->"}
                  </span>
                </span>{" "}
                <span data-scrub-ghost className="plrow__ghost">
                  {f.effect}
                </span>
              </h3>
              {/* The body as the right-cell mono annotation (Lusion pairing).
                  Scrubbed across the window's last 35%; never primed under
                  RM/no-JS. */}
              <p
                data-row-note
                className="font-mono text-[13px] leading-relaxed text-ink-mute max-w-[44ch] sm:justify-self-end"
              >
                {f.body}
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
      </div>
    </section>
  );
}
