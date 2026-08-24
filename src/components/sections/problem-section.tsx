"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { useNeuralLatticeFallback } from "@/components/fx/use-neural-lattice-fallback";
import { NeuralGraphFallback } from "@/components/fx/neural-graph-fallback";
import { RollLetters } from "@/components/fx/roll-letters";
import { useLedgerIgnition } from "@/components/fx/use-ledger-ignition";
import {
  useChapterReveal,
  useLedgerReveal,
  useTextDrift,
  useIgnitionWave,
} from "@/components/fx/lusion-type";

/**
 * ProblemSection — names the pain (demo-to-production gap).
 *
 * TYPOGRAPHIC LEDGER, TEXT v3 (round 5, 2026-08-21 — the round-4 scrubbed
 * fill-wipe and the right-hung mono annotations are DEAD, owner call; the
 * grammar is now the real Lusion pair: replayable viewport-entry
 * choreography + continuous per-frame parallax drift, both in
 * fx/lusion-type.ts):
 *   - Chapter: the h2 carries `data-chapter-h2` (NOT data-split-reveal — the
 *     shared one-shot HeadingChoreographer must skip it) → useChapterReveal
 *     plays recipe H3 (SplitText words in line masks, y 115→0 1s lusion
 *     0.025s/word + x 200→0 trailing +0.4s), replayable: reset when the
 *     chapter block is fully out of the viewport, replayed on re-entry.
 *     key={language} + revert discipline unchanged. The chapter description
 *     is no longer a 13px caption — it is a structural right grid column at
 *     BODY scale (`[data-chapter-desc]`, Lusion home grammar), revealed in
 *     B3 spirit (block fade+rise) cascaded +0.5s after the title. The
 *     `[data-emerge]` wrapper — the singularity passage's zoom-in landing
 *     target — stays around the heading block; the drift wrappers nest
 *     INSIDE it, never sharing its transform.
 *   - Each failure is a FULL-WIDTH row over a hairline (no box, no bg, no
 *     right cell): `[mono index 01·] [CAUSE roll] [-> accent mono] [EFFECT
 *     ghost roll]` on one big display line, the BODY as a Switzer body-scale
 *     block (`[data-row-body]`, max-width 34em) directly UNDER it, then the
 *     hairline. Row = [index+display line] over [body] over [hairline].
 *   - ENTRANCES (useLedgerReveal, per row, replayable): CAUSE and ghost
 *     EFFECT words are both RollLetters → recipe R1 exactly (per-char column
 *     through the 1em clip, yPercent −500→0, expo.inOut, 1.25s, center-out
 *     cosine stagger); index + arrow wrapper settle (autoAlpha+rise, lusion);
 *     the hairline draws scaleX; the body plays recipe B1 (SplitText words,
 *     opacity .1→1 + y 100→0, expo.out, 0.01s/word) cascaded +0.3s after the
 *     roll starts. Everything resets when the row fully leaves the viewport
 *     and replays on re-entry (Lusion `_needsReset`).
 *   - DRIFT (useTextDrift): the display line drifts at k=0.5, the body at
 *     k=1.5, the chapter desc at 1.25 — translateY by distance from viewport
 *     center, zero when the row is centered, subtle at the edges. One shared
 *     ticker, transform-only, zero per-frame gBCR. Hairlines never drift.
 *   - GHOST TYPE = the z-interleave illusion (round-3 rest grammar): the
 *     EFFECT word is permanently outlined serif (-webkit-text-stroke,
 *     transparent fill) so the WebGL river flowing BEHIND the DOM shines
 *     through. IGNITION (fine-pointer hover, keyboard focus, touch
 *     centre-band) is the accent — brightness + glyph-shaped drop-shadow
 *     glow + stroke hue shift (CSS) — and now also plays recipe Hv1 (the
 *     GSAP wave in lusion-type): the EFFECT chars slide x 0→1.5em
 *     right-to-left and the `->` arrow slides into the vacated space
 *     (`data-wave-arrow`; GSAP owns the arrow transform — the old 6px CSS
 *     translate is gone, one owner only). The EFFECT clip is
 *     `inset(0 -2em)` so the x-shift escapes while the roll clip survives.
 *     Ignition still fires setHovered("broken", i) via useLedgerIgnition
 *     (unchanged); its resolved-index edge drives the wave.
 *   - BAND GEOMETRY CONTRACT (§A round 3, shared with the stream agent): the
 *     `[data-lattice-anchor="problem"]` rect stays the FULL-BLEED -z-10
 *     background of the rows stack; fracture registration unchanged. Ghost
 *     callouts + dot grid KEPT. bump("broken") on the in-view edge is
 *     untouched (the surge that dies at the fracture).
 *   - Guards: SSR/no-JS renders everything settled and visible (solid amber
 *     fallback where stroke is unsupported — @supports guard); FROM poses
 *     are primed only by GSAP at arm (D-10). Reduced motion: static solid
 *     ink-mute, zero choreography, no drift, no wave.
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
 * REST STATE (round-3 grammar, restored in round 5 — the scrub fill-wipe and
 * its background-clip machinery are gone): the ghost EFFECT word is
 * permanently outlined — transparent fill + -webkit-text-stroke — so the
 * WebGL river behind the DOM shines through the glyphs. The @supports guard
 * keeps non-supporting browsers on solid readable amber.
 *
 * IGNITION (hover / :focus-visible / [data-focus] centre-band) is an accent:
 * brightness + glyph-shaped drop-shadow glow + stroke hue shift. The arrow's
 * ignited slide is GSAP-owned now (Hv1 wave in lusion-type — one transform
 * owner), so no arrow transition lives here.
 *
 * Reduced motion: the ghost is solid readable ink-mute, no stroke, nothing
 * transitions (the state selectors must be carried too — use-centre-focus's
 * static mode marks all rows [data-focus="true"] on touch+RM and would
 * out-specify the bare class).
 */
const PLROW_CSS = `
.plrow__ghost {
  color: hsl(36 60% 72%);
  transition:
    filter 0.6s var(--ease-lusion),
    -webkit-text-stroke-color 0.6s var(--ease-lusion);
}
@supports ((-webkit-text-fill-color: transparent) and (-webkit-text-stroke-width: 1px)) {
  .plrow__ghost {
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: 1px hsl(var(--ink) / 0.35);
  }
}
.plrow__arrow {
  display: inline-block;
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
.plrow:focus-visible .plrow__index,
.plrow[data-focus="true"] .plrow__index { color: hsl(var(--accent)); }
@media (hover: hover) and (pointer: fine) {
  .plrow:hover .plrow__ghost {
    filter: brightness(1.3) drop-shadow(0 0 14px hsl(36 60% 72% / 0.4));
    -webkit-text-stroke-color: hsl(36 60% 72% / 0.5);
  }
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
    filter: none;
    transition: none;
  }
  .plrow__index { transition: none; }
}
`;

/** Ghost callout placement — HISTORIC stream-v3 WEAVE values (the broken
 * river entered high, dipped, fractured at x≈55%). ROUND-6 replaced the
 * river with the layered constellation (fracture at topological t 0.62,
 * spatially at the broken crystal ≈ x 65%); these values stay as the var()
 * FALLBACKS only — SSR / fallback tier / RM placement, drift measured
 * acceptable in the round-6 spec §6: "no signal" over the input layers,
 * "no debugging" mid-net, "no trust" near the fracture/debris.
 * (band-y is a fraction of band height, 0 = center, + = up; css top =
 * 50% − y·100. Leader lines point INTO the graph: edge "top" hangs the label
 * above its target, "bottom" below it.)
 * max-sm:hidden — aria-hidden garnish; the same strings live in the rows.
 *
 * ROUND-5 W3 (2026-08-21): when the crystal island mounts, its driver
 * (webgl/CrystalCluster.tsx) writes `--callout-N-left`/`--callout-N-top`
 * custom properties on the [data-lattice-anchor] element — the labels then
 * ride the fractured cluster's shards (damped, jitter-free). The values
 * below stay as the var() FALLBACKS, so SSR / fallback tier / RM keep
 * exactly this placement. The `edge` column must stay in sync with
 * webgl/neural/crystalConfig.ts CALLOUT_EDGE (`--callout-N-top` feeds
 * whichever edge property the callout uses). Placement only — strings are
 * byte-identical under the copy freeze. */
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
  // surge that dies at the fracture).
  const { ref: rowRef, inView } = useInView<HTMLDivElement>();
  useBrokenStreamOnEnter(inView);

  // Ignition driver: centre-band on touch (data-focus), hover/focus on fine
  // pointer — visual is CSS above + the Hv1 wave; the store link (debris
  // re-cohere tease) rides the same edges via setHovered("broken", i). The
  // wave callback is stable (useIgnitionWave contract).
  const onIgnitionChange = useIgnitionWave(rowRef);
  const { rowRefs, rowHandlers } = useLedgerIgnition(
    "broken",
    failures.length,
    onIgnitionChange,
  );

  // Round-5 text v3: replayable viewport-entry choreography (chapter H3 +
  // per-row R1/B1/hairline) + the shared per-frame parallax drift (see
  // fx/lusion-type.ts for the full contract — RM static, SSR settled,
  // FROM primed at arm only, revert on language rebuild).
  const sectionRef = useRef<HTMLElement | null>(null);
  const chapterRef = useRef<HTMLDivElement | null>(null);
  useChapterReveal(chapterRef, language);
  useLedgerReveal(rowRef, language);
  useTextDrift(sectionRef, language);

  return (
    <section
      id="problem"
      ref={sectionRef}
      // Round 8-A: `data-snap` removed. This section's settle centered the
      // SECTION rect, which sits ~100–170 px above the constellation band the
      // reader is framing — the owner's "si assesta troppo in alto". Free
      // sections no longer settle at all; the page rests where you leave it.
      //
      // Round 7-3 (continuous-space spec §B.3): section-accent-tint + both
      // SectionGlows removed — the DOM must not own section-sized ambience.
      // The page's one continuous space (body --bg + starfield + the
      // constellation island + PostFX) carries the band; the tint's left
      // lobe was the owner's "ombra blu a sinistra dopo la transizione" and
      // its section-top edge the floating horizontal line after the plunge
      // landing. Removal also IMPROVES contrast (§B.5: ink-mute over the
      // tint core was 1.9:1 — failing AA — vs 6.1:1 on plain bg).
      className="relative section-lg scroll-mt-24 overflow-hidden"
    >
      <style>{PLROW_CSS}</style>
      <div className="container-px relative">
        {/* Chapter heading — the [data-emerge] wrapper is the singularity
            passage's zoom-in landing target: the one-shot plunge timeline
            drives this div transform-only (scale 0.8 + a 10% offset toward
            the tunnel's vanishing point → identity). Inert on every path
            where the passage never arms. The drift wrappers live INSIDE it —
            the passage and the drift never share a transform target. */}
        <div data-emerge style={{ willChange: "transform" }}>
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
                    ? "The demo-to-production gap"
                    : "Il divario tra demo e produzione"}
                </span>
              </p>
              {/* max-sm override: the chapter clamp's 2.6rem floor costs a
                  full extra title line at 390px — 2.1rem keeps the chapter
                  read while clawing ~80px back toward the §Mobile budget
                  (presentation-only; copy untouched).
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
            {/* The chapter description — a structural right column at BODY
                scale (W2: no more 13px caption; Lusion home desc grammar).
                Revealed in B3 spirit after the title; drifts at k=1.25. */}
            {/* max-sm 0.9rem: §Mobile budget trim (W2 scale-up overshot 390×844
                by ~90px) — body scale on desktop, one step down on phones. */}
            <div data-drift="1.25">
              <p
                data-chapter-desc
                className="max-w-[34em] text-[clamp(1rem,1.2vw,1.3rem)] max-sm:text-[0.9rem] leading-[1.5] text-ink-mute"
              >
                {isEn
                  ? "The demo worked. The board nodded. Then real volume hit and the agent started lying, the retrieval drifted, cost-per-run tripled, and no-one on the team could tell which of the seven things you changed last week broke it."
                  : "La demo funzionava. Il consiglio ha annuito. Poi è arrivato il volume reale e l'agente ha iniziato a inventare, il retrieval è andato in deriva, il costo per esecuzione è triplicato e nessuno nel team sapeva quale delle sette cose cambiate la settimana scorsa l'avesse rotto."}
              </p>
            </div>
          </div>
        </div>

        {/* THE LEDGER — a stack of full-width typographic rows; the WebGL
            band is its full-bleed -z-10 background (BAND GEOMETRY CONTRACT).
            `isolate` pins the negative-z band inside this container so it
            paints below every row (the section wash it once sat above was
            removed round 7-3). */}
        <div ref={rowRef} className="relative isolate mt-4 sm:mt-12">
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
            {/* Faint blueprint dot-grid (igloo garnish). Round 7-3: masked so
                it dissolves INSIDE its own band (quad-edge hygiene, spec
                §B.3) — a grid that fades out before the band bounds reads as
                a field IN the world; one that stops at the bounds reads as a
                page block. */}
            <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--ink)/0.05)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_55%,transparent_95%)]" />
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
                    left: `var(--callout-${i}-left, ${pos.left})`,
                    [pos.edge]: `var(--callout-${i}-top, ${pos.at})`,
                  }}
                >
                  {f.effect}
                </span>
              );
            })}
          </div>

          {/* The rows — full-width, chrome-less: [index + display line] over
              [body] over [hairline] (W2 — the right cell is dead). Hairline
              is an entrance-drawn span (no hidden pose baked in: SSR/no-JS/RM
              paint it full-width). tabIndex + the global :focus-visible ring;
              hover/focus/centre ignite (CSS + Hv1 wave) and fire the store
              link (useLedgerIgnition). */}
          {failures.map((f, i) => (
            <article
              key={f.num}
              ref={rowRefs[i]}
              tabIndex={0}
              data-ledger-row={i}
              {...rowHandlers[i]}
              className="plrow relative py-8 max-sm:py-4 lg:py-10"
            >
              {/* The display line — drift k=0.5. Index and arrow settle on
                  entry (inline-block wrappers: GSAP transforms are no-ops on
                  plain inline boxes); the arrow's IGNITED slide is GSAP-owned
                  (data-wave-arrow, Hv1) — the entrance owns only the outer
                  wrapper, never the same element. The ghost EFFECT rolls like
                  the cause and carries the wave clip escape (inset(0 -2em)). */}
              <div data-drift="0.5">
                <h3 className="font-display text-[clamp(1.9rem,3.6vw,3.9rem)] leading-[1.05] tracking-[-0.01em] text-ink">
                  <span
                    data-row-rise
                    className="plrow__index inline-block font-mono text-[0.38em] align-middle tracking-[0.16em] tabular-nums"
                  >
                    {`0${i + 1}`}
                    <span aria-hidden="true">·</span>
                  </span>{" "}
                  <RollLetters text={f.cause} />{" "}
                  <span
                    data-row-rise
                    aria-hidden="true"
                    className="inline-block align-middle"
                  >
                    <span
                      data-wave-arrow
                      className="plrow__arrow font-mono text-[0.55em] text-[hsl(var(--accent)/0.9)]"
                    >
                      {"->"}
                    </span>
                  </span>{" "}
                  <RollLetters
                    text={f.effect}
                    className="plrow__ghost"
                    clipInset="inset(0 -2em)"
                    wave
                  />
                </h3>
              </div>
              {/* The body — UNDER the display line (W2), Switzer at body
                  scale, left-aligned to the line start, ~34em measure.
                  B1 word-wave entrance (split → remount on language);
                  drift k=1.5. max-sm 0.875rem/1.45 + mt-3: §Mobile budget
                  trim (still body Switzer, clearly not a caption). */}
              <div data-drift="1.5" className="mt-3 sm:mt-5">
                <p
                  key={language}
                  data-row-body
                  className="max-w-[34em] text-[clamp(0.95rem,1.05vw,1.15rem)] max-sm:text-[0.875rem] leading-[1.5] max-sm:leading-[1.45] text-ink-mute"
                >
                  {f.body}
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
      </div>
    </section>
  );
}
