"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { useNeuralLatticeFallback } from "@/components/fx/use-neural-lattice-fallback";
import { NeuralGraphFallback } from "@/components/fx/neural-graph-fallback";
import { RollLetters } from "@/components/fx/roll-letters";
import { useLedgerIgnition } from "@/components/fx/use-ledger-ignition";
import { useDiagonalTraverse } from "@/components/fx/use-diagonal-traverse";
import {
  useChapterReveal,
  useLedgerReveal,
  useTextDrift,
  useIgnitionWave,
  rowDriftK,
} from "@/components/fx/lusion-type";

/**
 * ProblemSection — names the pain (demo-to-production gap).
 *
 * ROUND 10 (2026-08-24) — THE GHOST TYPE IS DEAD. The owner rejected the
 * outlined/hollow display word ("le scritte vuote dentro azzure non mi
 * piacciono"): the EFFECT word is now painted SOLID (see the PLROW_CSS note
 * below). Only the PAINT changed — every entrance (R1 rolls, line masks,
 * word waves, per-row replay, trailing offsets), the Hv1 ignition wave, the
 * drift, the focus/centre-band states, the leader lines and the callouts are
 * byte-for-byte the behaviour they were. Copy untouched.
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
 *     roll, solid amber]` on one big display line, the BODY as a Switzer
 *     body-scale block (`[data-row-body]`, max-width 34em) directly UNDER it,
 *     then the hairline. Row = [index+display line] over [body] over
 *     [hairline].
 *   - ENTRANCES (useLedgerReveal, per row, replayable): CAUSE and EFFECT
 *     words are both RollLetters → recipe R1 exactly (per-char column
 *     through the 1em clip, yPercent −500→0, expo.inOut, 1.25s, center-out
 *     cosine stagger); index + arrow wrapper settle (autoAlpha+rise, lusion);
 *     the hairline draws scaleX; the body plays recipe B1 (SplitText words,
 *     opacity .1→1 + y 100→0, expo.out, 0.01s/word) cascaded +0.3s after the
 *     roll starts. Everything resets when the row fully leaves the viewport
 *     and replays on re-entry (Lusion `_needsReset`).
 *   - DRIFT (useTextDrift, round-11 pairing): each row is ONE plane — its
 *     display line and its body share `rowDriftK(i)` (0.5 / 0.66 / 0.82 down
 *     the stack), so their gap is monotone in the block center and can only
 *     grow. The body's old k=1.5 counter-drift is DEAD: it pulled the
 *     paragraph up while the headline went down and, with the pre-round-11
 *     unbounded dCenter, closed the 12–20px gap to −44px (solid ink over
 *     solid ink once the round-10 type went opaque). The depth now lives
 *     BETWEEN rows, where the py-8/py-10 gutter can absorb it, and the
 *     chapter desc keeps its 1.25 counter-drift. Every dy is saturated at
 *     ±DRIFT_MAX (24px ≥lg / 8px below) — see THE COLLISION ALGEBRA in
 *     fx/lusion-type.ts. One shared ticker, transform-only, zero per-frame
 *     gBCR. Hairlines never drift.
 *   - SOLID DISPLAY TYPE (round 10 — replaces the round-3 z-interleave
 *     illusion, owner-rejected): the EFFECT word is filled serif in the
 *     sanctioned ember amber hsl(36 60% 72%) — 10.7:1 on --bg vs the body's
 *     6.1:1, so the display line is unambiguously the dominant one. No
 *     -webkit-text-stroke, no transparent fill, no @supports fallback dance
 *     (there is no longer a look to fall back FROM). The WebGL field no
 *     longer reads through the glyphs; it flows behind them.
 *     IGNITION (fine-pointer hover, keyboard focus, touch centre-band) is the
 *     same event in ink: a colour lift inside the amber hue family
 *     (→ hsl(36 75% 82%), 13.4:1) + the glyph-shaped drop-shadow glow, on the
 *     unchanged 0.6s var(--ease-lusion) — and it still plays recipe Hv1 (the
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
 *   - Guards: SSR/no-JS renders everything settled and visible (the rest pose
 *     IS the finished look — solid amber, no primed-hidden classes); FROM
 *     poses are primed only by GSAP at arm (D-10). Reduced motion: the solid
 *     rest colour in every state (the ignited pose is neutralised because
 *     use-centre-focus's static mode pins [data-focus="true"] on touch+RM),
 *     zero choreography, no drift, no wave.
 *   - A11y: strings in source order (index → cause → effect → body), the
 *     EFFECT styling is pure CSS colour on real text, rows are tabIndex=0
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
 * EFFECT-word + ignition CSS — file-scoped (no globals.css edits,
 * parallel-agent rule).
 *
 * REST STATE (round 10, 2026-08-24): SOLID ember amber, hsl(36 60% 72%).
 * The outlined/ghost pose — transparent fill + -webkit-text-stroke, and the
 * @supports guard that gated it — is DELETED (owner rejection: "le scritte
 * vuote dentro azzure non mi piacciono"). Nothing paints the glyphs but
 * `color`, so there is no unsupported-browser branch left to guard. Amber on
 * --bg measures 10.7:1 (body ink-mute is 6.1:1) — the display line reads as
 * the dominant one, both well clear of AA.
 *
 * IGNITION (hover / :focus-visible / [data-focus] centre-band) is the same
 * event re-expressed in ink, on the same 0.6s var(--ease-lusion) as the
 * index: a colour lift INSIDE the sanctioned amber hue family — rest
 * hsl(36 60% 72%) #E2C08D (L* 79.50, 10.61:1) → ignited hsl(36 75% 82%)
 * #F4D8AF (L* 87.70, 13.34:1). Measured: ΔL* +8.20, ΔE76 10.5, relative
 * luminance +28%. The word RISES on ignition — that is the direction the
 * Production twin had to be fixed to match in the same round (its first
 * round-10 pass DIMMED; see its PGROW_CSS note).
 *
 * The glow is TWO chained drop-shadows (round-10 check fix): a 10px tight
 * rim + a 28px soft field, hue 36 throughout. One 14px/0.4 halo is a
 * hairline next to a 52–62px display stem; chained filters compose (the wide
 * layer blurs the rim too), so the rim reaches ~0.63 amber alpha and the
 * halo reads 4.85:1 against --bg instead of 2.66:1. drop-shadow, not
 * text-shadow — it must wrap the glyph shapes, not the text box.
 *
 * The old `brightness(1.3)` is gone: on solid type the lift is the colour,
 * not a filter washing it toward white. It never touched the GLOW either —
 * brightness() is an RGB component transfer that leaves ALPHA alone, and
 * drop-shadow paints its own declared colour through the source alpha; what
 * strengthened the glow is the solid fill replacing the 1px ghost outline as
 * the shadow's mask. The arrow's ignited slide stays GSAP-owned (Hv1 wave in
 * lusion-type — one transform owner), so no arrow transition lives here.
 *
 * Reduced motion: transitions off, and the ignited pose is neutralised back
 * to rest in EVERY state. That is NOT stroke leftovers — use-centre-focus's
 * static mode marks all rows [data-focus="true"] on touch+RM, which would
 * otherwise paint all three rows permanently lifted + glowing; the state
 * selectors must be carried or the bare class is out-specified. Note the
 * rest colour under RM is the AMBER, not `--ink-mute`: the pre-round-10 RM
 * block forced ink-mute only to undo the stroke, which flattened the display
 * word to the body's own 6.07:1. Holding amber keeps 10.61:1 vs the body's
 * 6.07:1, so the RM hierarchy is stronger than it was, not weaker. SCOPE
 * NOTE (honest, checked 2026-08-24): only the EFFECT word is neutralised —
 * `.plrow__index` still takes its [data-focus] accent, so on touch+RM all
 * three indices read full accent. Unchanged HEAD behaviour, not a round-10
 * regression.
 */
const PLROW_CSS = `
.plrow__effect {
  color: hsl(36 60% 72%);
  transition:
    color 0.6s var(--ease-lusion),
    filter 0.6s var(--ease-lusion);
}
.plrow__arrow {
  display: inline-block;
}
.plrow__index {
  color: hsl(var(--accent) / 0.6);
  transition: color 0.6s var(--ease-lusion);
}
.plrow:focus-visible .plrow__effect,
.plrow[data-focus="true"] .plrow__effect {
  color: hsl(36 75% 82%);
  filter:
    drop-shadow(0 0 10px hsl(36 60% 72% / 0.5))
    drop-shadow(0 0 28px hsl(36 60% 72% / 0.26));
}
.plrow:focus-visible .plrow__index,
.plrow[data-focus="true"] .plrow__index { color: hsl(var(--accent)); }
@media (hover: hover) and (pointer: fine) {
  .plrow:hover .plrow__effect {
    color: hsl(36 75% 82%);
    filter:
      drop-shadow(0 0 10px hsl(36 60% 72% / 0.5))
      drop-shadow(0 0 28px hsl(36 60% 72% / 0.26));
  }
  .plrow:hover .plrow__index { color: hsl(var(--accent)); }
}
@media (prefers-reduced-motion: reduce) {
  /* Rest colour in EVERY state, no transitions (see header note). */
  .plrow__effect,
  .plrow:hover .plrow__effect,
  .plrow:focus-visible .plrow__effect,
  .plrow[data-focus="true"] .plrow__effect {
    color: hsl(36 60% 72%);
    filter: none;
    transition: none;
  }
  .plrow__index { transition: none; }
}

/* === THE DIAGONAL TRAVERSE — ROUND 11 STAGE 1 (file-scoped, no globals.css
   edits). Everything below the first rule is inert until useDiagonalTraverse
   sets [data-traverse], so SSR / no-JS / reduced-motion / fallback-tier keep
   today's document px for px (the D-10 rule: no primed pose in a className).

   overflow-x: CLIP, not hidden (mechanism §3.1). "hidden" makes the section a
   scroll CONTAINER, so tabbing to a row translated off-frame lets the browser
   silently set section.scrollLeft and shear the composition — a bug this repo
   has already patched twice elsewhere. "clip" creates no scroll container at
   all, so that failure is structurally impossible; it also does not coerce the
   other axis the way overflow-x: hidden does, and it would not defeat a future
   position: sticky descendant. The full-bleed band is still trimmed exactly as
   overflow-hidden trimmed it.

   THE BAND IS PINNED TO THE VIEWPORT, and that is load-bearing: the anchor is
   "inset-y-0" of the rows stack, so the runway growth would otherwise inflate
   rect.h — and rect.h drives the net's depth, the net's rendered aspect, the
   stone's size (1677 px, 186 % of the viewport, at a 4392 px band), the
   stone's tumble scalar and the fog radius. Pinning it (mechanism §4.4-b)
   keeps the 4392 px catastrophe away. It does NOT keep today's value at every
   viewport — measured, it reproduces HEAD only at 1280×720 (619.0 vs 618.8)
   and re-bases the band by +20.6 % at 1440×900, +50.4 % at 390×844 and
   +70.8 % at 768×1024, moving the stone and uPlaneAspect with it. See
   traverseConfig's header for the table and for mechanism §4.4-c, the fix that
   would hold everywhere. 0.8597 = 619/720, the 1280×720 reference. */
#problem {
  overflow-x: clip;
  overflow-y: visible;
}
#problem[data-traverse] {
  --tv-gap: calc(var(--tv-gap-vh, 0) * 100svh);
}
#problem[data-traverse] [data-traverse-stack] { margin-top: var(--tv-gap); }
#problem[data-traverse] .plrow + .plrow { margin-top: var(--tv-gap); }
#problem[data-traverse] [data-traverse-tail] { height: var(--tv-gap); }
#problem[data-traverse] [data-lattice-anchor] {
  bottom: var(--tv-band-bottom, 0px);
  height: var(--tv-band-h, auto);
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
  // ROUND 11 STAGE 1 — the diagonal traverse. Owns the `x` + `opacity` of the
  // SAME `[data-drift]` wrappers useTextDrift owns the `y` of (three drivers,
  // three properties, never a shared one). Armed only when the WebGL island is
  // the one carrying the band — `!showFallback` is the exact complement of the
  // island's mount gate, and sliding a static SVG 1.5 screens sideways would
  // be worse than not arming.
  useDiagonalTraverse(sectionRef, "problem", !showFallback, language);

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
      // Round 11: `overflow-hidden` moved into the file-scoped style block as
      // `overflow-x: clip; overflow-y: visible` — same clip of the full-bleed
      // band, without creating the scroll container that lets a keyboard focus
      // shear the composition (mechanism §3.1/§3.3).
      className="relative section-lg scroll-mt-24"
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
            <div data-drift="0.5" data-traverse-alpha="display">
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
            <div data-drift="1.25" data-traverse-alpha="body">
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
        <div
          ref={rowRef}
          data-traverse-stack
          className="relative isolate mt-4 sm:mt-12"
        >
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
              {/* The display line — drift rowDriftK(i), the SAME k the body
                  below it uses (round-11 pairing rule: identical k makes the
                  gap between them monotone in the block center, so it can
                  only grow — the paragraph can never climb into the headline
                  again). Index and arrow settle on entry (inline-block
                  wrappers: GSAP transforms are no-ops on plain inline boxes);
                  the arrow's IGNITED slide is GSAP-owned (data-wave-arrow,
                  Hv1) — the entrance owns only the outer wrapper, never the
                  same element. The EFFECT word (solid amber since round 10)
                  rolls like the cause and carries the wave clip escape
                  (inset(0 -2em)). */}
              <div data-drift={rowDriftK(i)} data-traverse-alpha="display">
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
                    className="plrow__effect"
                    clipInset="inset(0 -2em)"
                    wave
                  />
                </h3>
              </div>
              {/* The body — UNDER the display line (W2), Switzer at body
                  scale, left-aligned to the line start, ~34em measure.
                  B1 word-wave entrance (split → remount on language).
                  DRIFT: rowDriftK(i) — the display line's k, not a deeper
                  one. It used to be 1.5, i.e. it counter-drifted UP while the
                  headline drifted DOWN, and with an unbounded dCenter that
                  differential ate the whole 12–20px gap (measured −44px).
                  The row now moves as ONE plane; the depth is between rows.
                  max-sm 0.875rem/1.45 + mt-3: §Mobile budget trim (still body
                  Switzer, clearly not a caption). */}
              <div
                data-drift={rowDriftK(i)}
                data-traverse-alpha="body"
                className="mt-3 sm:mt-5"
              >
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
        {/* Round 11 runway tail — the last authored gap of the traverse's
            vertical runway. Zero-height (and therefore invisible) until
            [data-traverse] arms; it sits OUTSIDE the rows stack so it can
            never enter the `[data-lattice-anchor]` box. */}
        <div data-traverse-tail aria-hidden="true" />
      </div>
    </section>
  );
}
