"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { useNeuralLatticeFallback } from "@/components/fx/use-neural-lattice-fallback";
import { NeuralGraphFallback } from "@/components/fx/neural-graph-fallback";
import { StreamPane } from "@/components/fx/stream-pane";

/**
 * ProblemSection — names the pain (demo-to-production gap).
 *
 * SIGNAL STREAM refactor (2026-08-21, Lusion detail grammar + Noomo pairing):
 *   - Chapter heading: the existing title promoted to chapter scale
 *     (clamp(2.6rem, 4.8vw, 5.75rem) display serif, full container width,
 *     italic span on the second sentence); the description moves to a
 *     right-hung ~320px annotation. The `[data-emerge]` wrapper — the
 *     singularity passage's zoom-in landing target — stays around this whole
 *     heading block.
 *   - The FIELD BAND below: a full-width band whose background is the
 *     `[data-lattice-anchor="problem"]` rect. The WebGL SIGNAL STREAM
 *     (NeuralLattice, mode "broken") flows left→right through it and
 *     FRACTURES at ~55% — laminar signal decaying into ember debris, surges
 *     that die on contact. When the island is absent the SVG stream twin
 *     (neural-graph-fallback.tsx) carries the metaphor. Igloo garnish inside
 *     the band (aria-hidden): a faint dot-grid + mono ghost callouts (the
 *     EXISTING effect strings) with leader lines, scramble-decoded by the
 *     global LabelScrambler (they carry `.eyebrow`), hidden below sm.
 *   - THREE GLASS PANES (StreamPane chrome) z-cascaded on the band's right —
 *     the stream flows toward/under them, the fracture visibly in the open
 *     left two-thirds. ALWAYS-OPEN copy (cause -> effect eyebrow + body; the
 *     accordion machinery is gone — the panes ARE the accessible content).
 *     Hover/focus on pane i → setHovered("broken", i) → the WebGL debris
 *     briefly re-coheres toward the spline then falls apart again. Below lg
 *     the panes stack in normal flow under the band.
 *   - In-view (once): bump("broken") — the WebGL stream fires the surge that
 *     dies at the fracture — and the panes blur-up in from the right,
 *     staggered 90ms. Reduced-motion: nothing primed hidden, no bumps.
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

/** Ghost callout placement inside the band (≈ the WebGL fracture/debris zone:
 * uFracture = 0.55 → band-x ~55%; debris drifts right of it). max-sm:hidden —
 * aria-hidden garnish; the same strings live in the panes. */
const CALLOUT_POS: { left: string; edge: "top" | "bottom"; at: string }[] = [
  { left: "48%", edge: "top", at: "14%" },
  { left: "54%", edge: "bottom", at: "12%" },
  { left: "59%", edge: "top", at: "26%" },
];

export default function ProblemSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const failures = getFailures(isEn);
  const showFallback = useNeuralLatticeFallback();

  // ONE latched in-view edge for the whole field row: fires the store bump
  // and arms the pane reveal.
  const { ref: rowRef, inView } = useInView<HTMLDivElement>();
  useBrokenStreamOnEnter(inView);

  // Once-per-life pane reveal: slide in from the right with blur-up,
  // staggered 90ms. Primed idempotently on every dep re-run BEFORE the play
  // guard (useGSAP is a layout effect — no hidden-then-visible flash);
  // reduced-motion never primes anything hidden.
  const playedRef = useRef(false);
  useGSAP(
    () => {
      const row = rowRef.current;
      if (!row) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (playedRef.current) return;
      const panes = row.querySelectorAll<HTMLElement>("[data-stream-pane]");
      if (!panes.length) return;
      gsap.set(panes, { opacity: 0, x: 28, y: 24, filter: "blur(6px)" });
      if (!inView) return;
      playedRef.current = true;
      gsap.to(panes, {
        opacity: 1,
        x: 0,
        y: 0,
        filter: "blur(0px)",
        duration: 0.9,
        ease: "expo.out",
        stagger: 0.09,
        clearProps: "filter",
      });
    },
    { dependencies: [inView], scope: rowRef },
  );

  return (
    <section
      id="problem"
      data-snap
      className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
    >
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
                  (presentation-only; copy untouched). */}
              <h2 className="font-display text-[clamp(2.6rem,4.8vw,5.75rem)] max-sm:text-[2.1rem] leading-[0.98] tracking-[-0.02em] text-ink text-balance">
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
            {/* The right-hung annotation (~320px, Noomo/Lusion pairing). */}
            <p className="max-w-[320px] text-[13px] leading-relaxed text-ink-mute">
              {isEn
                ? "The demo worked. The board nodded. Then real volume hit and the agent started lying, the retrieval drifted, cost-per-run tripled, and no-one on the team could tell which of the seven things you changed last week broke it."
                : "La demo funzionava. Il consiglio ha annuito. Poi è arrivato il volume reale e l'agente ha iniziato a inventare, il retrieval è andato in deriva, il costo per esecuzione è triplicato e nessuno nel team sapeva quale delle sette cose cambiate la settimana scorsa l'avesse rotto."}
            </p>
          </div>
        </div>

        {/* The field row: the band (WebGL anchor as background) + the panes
            cascaded over its right side (lg+) / stacked below it (< lg).
            On lg the band is the ABSOLUTE background of the whole row, so its
            height tracks the pane stack (no fixed-height overflow); below lg
            it is a fixed-height block with the panes in flow underneath. */}
        <div ref={rowRef} className="relative mt-8 sm:mt-12">
          <div className="relative min-h-[280px] sm:min-h-[420px] lg:absolute lg:inset-0 lg:min-h-0">
            {/* The WebGL anchor rect — the stream is camera-locked to this box
                (persistent canvas paints behind the DOM). Decorative layer:
                aria-hidden, pointer-events-none. */}
            <div
              data-lattice-anchor="problem"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
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

          </div>

          {/* The panes — ONE container, responsive pose: below lg a flat
              stack in normal flow under the band (no cascade, no tilt;
              max-sm tightens paddings — the mobile budget); lg+ a z-cascade
              hugging the row's right edge, the stream flowing under them. */}
          <div className="relative z-10 mt-4 flex flex-col gap-3 sm:gap-4 lg:ml-auto lg:mt-0 lg:min-h-[520px] lg:w-[380px] lg:justify-center lg:gap-4 lg:py-4 xl:w-[420px]">
            {failures.map((f, i) => (
              <StreamPane key={f.num} index={i} surface="broken" side="right">
                <h3 className="relative font-mono text-[11px] uppercase leading-relaxed tracking-[0.16em] text-ink">
                  <span className="tabular-nums text-[hsl(var(--accent)/0.9)]">
                    {`0${i + 1}`}
                  </span>
                  <span aria-hidden="true" className="px-1.5 text-ink-dim">
                    ·
                  </span>
                  <span>{f.cause}</span>{" "}
                  <span
                    aria-hidden="true"
                    className="text-[hsl(var(--accent)/0.9)]"
                  >
                    {"->"}
                  </span>{" "}
                  <span className="text-ink-mute">{f.effect}</span>
                </h3>
                <p className="relative mt-3 text-[13px] leading-relaxed text-ink-mute">
                  {f.body}
                </p>
              </StreamPane>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
