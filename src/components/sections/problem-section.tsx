"use client";

import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
import { useScrollParallax } from "@/components/ui/use-scroll-parallax";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { useNeuralLatticeFallback } from "@/components/fx/use-neural-lattice-fallback";
import { NeuralCard } from "@/components/fx/neural-card";
import { NeuralCenterpiece } from "@/components/fx/neural-centerpiece";

/**
 * ProblemSection — names the pain (demo-to-production gap).
 *
 * Split layout, conforming to the shared section grammar:
 *   - Left: eyebrow + editorial headline + paragraph (SectionHeading).
 *   - Right: a row of [neural NETWORK centerpiece] + [cards column] (FIX 3 v5 —
 *     the "broken" surface). The network is the clearly-visible CENTERPIECE
 *     (dense particle orbs + arcs + travelling signal, the 3 nodes laid out as a
 *     3D graph) with the 3 cards OFFSET to its outer side (never overlapping it).
 *     The 3 focusable NODE MARKERS in the centerpiece are the primary trigger:
 *     hovering/focusing node i flares + BURSTS its hub (particle effect) and
 *     OPENS the matching side card; other nodes dim. The cards use the shared
 *     NeuralCard chrome (compact → expand, cyan→blue glass) identical to the
 *     ProductionGrade section; only the copy + the broken fracture cue differ.
 *     The copy from getFailures() stays as accessible, selectable DOM at all
 *     times; the SVG fallback carries the metaphor when WebGL is absent.
 *
 * Three failure modes, deliberately framed as engineering problems rather than
 * business problems — because the buyer is technical and "we can't tell why our
 * agent is failing" lands harder than "AI ROI is unclear".
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
// the WebGL lattice fires its three pathway packets (which then die at the
// break). Inert under reduced-motion (the WebGL layer is unmounted at tier
// "off" and we early-return so the store is never even touched). Pure
// side-effect — no DOM copy/layout change.
function useBrokenLatticeOnEnter(inView: boolean) {
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

// Stable body id per (anchor, index) so the centerpiece node marker's
// aria-controls resolves to the matching side card body (SSR-stable, no useId).
function bodyId(anchorId: string, i: number) {
  return `neural-${anchorId}-card-${i}`;
}

// === Failure network =======================================================
// FIX 3 v5 — RECOMPOSE: the network is the clearly-visible CENTERPIECE; the 3
// cards sit OFFSET to its outer side. The WebGL NeuralLattice (anchored to
// [data-lattice-anchor="problem"]) paints the dense particle orbs + arcs +
// travelling signal; the 3 focusable NODE MARKERS in the centerpiece are the
// primary trigger — hovering/focusing node i flares + BURSTS its hub and opens
// side card i (others dim). When the WebGL island is absent the SVG fallback
// carries the same severed-pathway metaphor. The copy is byte-identical.
function FailureLattice({
  failures,
}: {
  failures: Failure[];
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  useBrokenLatticeOnEnter(inView);
  const showFallback = useNeuralLatticeFallback();
  // A tiny scroll-linked Y drift, kept off the lattice anchor's measured rect
  // so the WebGL placement stays stable (parallax lives on an outer wrapper).
  const parallaxRef = useScrollParallax<HTMLDivElement>(5);

  return (
    <div ref={parallaxRef}>
      {/* The in-view observer rides this outer wrapper so the rect that the
          island measures (inside NeuralCenterpiece) is NOT affected by parallax. */}
      <div ref={ref}>
        {/* Network CENTERPIECE (~55%) beside the cards column (~45%); stacks on
            narrow widths (network on top, cards below). The network area is
            unobstructed — nothing overlaps it. */}
        {/* items-start (NOT center): a card expanding must not re-center this row, or the %-anchored node markers would shift out from under a still cursor and the hover would oscillate. */}
        {/* D-24 — the split is `lg:`, matching production-grade-section's twin
            row, NOT `sm:`. At `sm` this row halved a ~600px column into two
            ~285px ones, and the node markers' `whitespace-nowrap` labels —
            centred at 24% / 78% of the centerpiece — overran both of its edges
            and were cut by this section's `overflow-hidden`. Below `lg` the
            centerpiece now takes the full column, which is the only width where
            those labels are guaranteed to fit. ≥1024px is unchanged: the outer
            row is already two columns there, so both breakpoints resolved to
            the identical layout. */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8 items-start">
          <NeuralCenterpiece
            anchorId="problem"
            surface="broken"
            tone="broken"
            showFallback={showFallback}
            className="min-h-[260px] sm:min-h-[320px]"
            nodes={[
              { label: failures[0].cause, controls: bodyId("problem", 0) },
              { label: failures[1].cause, controls: bodyId("problem", 1) },
              { label: failures[2].cause, controls: bodyId("problem", 2) },
            ]}
          />

          {/* Cards column — OFFSET from the network (never overlapping it). */}
          <div className="relative flex flex-col gap-4">
            {failures.map((f, i) => (
              <NeuralCard
                key={f.num}
                index={i}
                surface="broken"
                tone="broken"
                bodyId={bodyId("problem", i)}
                eyebrow={f.cause}
                title={
                  <>
                    <span>{f.cause}</span>{" "}
                    <span aria-hidden="true" className="text-[hsl(var(--accent-2)/0.9)]">
                      {"→"}
                    </span>{" "}
                    <span className="text-ink-mute">{f.effect}.</span>
                  </>
                }
                body={f.body}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProblemSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const failures = getFailures(isEn);

  return (
    <section
      id="problem"
      data-snap
      className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
    >
      <SectionGlow position="top-right" intensity={1.2} />
      <SectionGlow position="bottom-left" intensity={0.8} size="50rem" />
      <div className="container-px relative">
        {/* items-start here too: when a card expands, the FailureLattice column grows; with items-center the outer row re-centered it, nudging the %-anchored node markers ~9px out from under a still cursor (residual hover oscillation). Pinning the row top removes that residual. */}
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16 items-start">
          {/* Left — headline + paragraph. The [data-emerge] wrapper is the
              singularity passage's zoom-in landing target: the one-shot
              plunge timeline drives this div transform-only (scale 0.8 + a
              10% offset toward the tunnel's vanishing point → identity) so
              the section materializes as a ZOOM as the black opens and the
              light-speed streaks die. Inert on every path where the passage
              never arms. */}
          <div data-emerge style={{ willChange: "transform" }}>
          <SectionHeading
            eyebrow={isEn ? "The demo-to-production gap" : "Il divario tra demo e produzione"}
            title={
              isEn ? (
                <>
                  Most AI projects don&apos;t fail at the prototype.{" "}
                  <span className="text-ink-mute">They fail two months after.</span>
                </>
              ) : (
                <>
                  La maggior parte dei progetti AI non fallisce al prototipo.{" "}
                  <span className="text-ink-mute">Fallisce due mesi dopo.</span>
                </>
              )
            }
            description={
              isEn
                ? "The demo worked. The board nodded. Then real volume hit and the agent started lying, the retrieval drifted, cost-per-run tripled, and no-one on the team could tell which of the seven things you changed last week broke it."
                : "La demo funzionava. Il consiglio ha annuito. Poi è arrivato il volume reale e l'agente ha iniziato a inventare, il retrieval è andato in deriva, il costo per esecuzione è triplicato e nessuno nel team sapeva quale delle sette cose cambiate la settimana scorsa l'avesse rotto."
            }
            className="max-w-xl"
            // POSITIVE bottom margin: the cascade is already mid-composition
            // while the singularity passage's sticky stage releases (behind
            // the tunnel/veil overlay), so the incoming viewport is never an
            // empty dark slab — exactly the pre-compose hook the plunge's
            // emergence beat relies on.
            ioRootMargin="0px 0px 15% 0px"
          />
          </div>

          {/* Right — the network centerpiece + the three failure cards */}
          <Reveal delay={120} ioRootMargin="0px 0px 15% 0px">
            <FailureLattice failures={failures} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
