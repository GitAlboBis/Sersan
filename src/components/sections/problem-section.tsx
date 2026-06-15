"use client";

import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
import { useScrollParallax } from "@/components/ui/use-scroll-parallax";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { NeuralGraphFallback } from "@/components/fx/neural-graph-fallback";
import { useNeuralLatticeFallback } from "@/components/fx/use-neural-lattice-fallback";
import { NeuralCard } from "@/components/fx/neural-card";

/**
 * ProblemSection — names the pain (demo-to-production gap).
 *
 * Split layout, conforming to the shared section grammar:
 *   - Left: eyebrow + editorial headline + paragraph (SectionHeading).
 *   - Right: the three failure modes as 3 card-anchored hubs of the site's
 *     neural NETWORK (FIX 3 v4) — the "broken" surface. The cards use the shared
 *     NeuralCard chrome (compact → expand on hover/focus, cyan→violet glass)
 *     identical to the ProductionGrade section; only the copy + the broken
 *     fracture cue differ. The copy from getFailures() stays as accessible,
 *     selectable DOM at all times; a decorative network (WebGL when available,
 *     SVG fallback otherwise) anchors a glowing hub behind each card. Hovering a
 *     card flares its hub via useNeuralLatticeStore.setHovered (inside NeuralCard).
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

// === Failure network =======================================================
// The three failures rendered as 3 card-anchored hubs (FIX 3 v4) using the
// shared NeuralCard chrome. The WebGL NeuralLattice (anchored to
// [data-lattice-anchor="problem"]) pins a glowing hub behind each card; when the
// WebGL island is absent the SVG fallback carries the same severed-pathway
// metaphor. The copy is byte-identical to the previous version — cards expand
// the body on hover/focus and the body stays in the DOM at all times.
function FailureLattice({
  failures,
  isEn,
}: {
  failures: Failure[];
  isEn: boolean;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  useBrokenLatticeOnEnter(inView);
  const showFallback = useNeuralLatticeFallback();
  // A tiny scroll-linked Y drift, kept off the lattice anchor's measured rect
  // so the WebGL placement stays stable (parallax lives on an outer wrapper).
  const parallaxRef = useScrollParallax<HTMLDivElement>(5);
  void isEn; // copy is built per-card below; kept for signature parity.

  return (
    <div ref={parallaxRef}>
      <div ref={ref} data-lattice-anchor="problem" className="relative">
        {/* Decorative network fallback layer. The WebGL NeuralLattice paints
            behind the cards via the persistent canvas (camera-locked to this
            anchor rect); when WebGL is absent the SVG fallback shows the same
            severed-pathway metaphor. Both are aria-hidden. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          {showFallback && (
            <NeuralGraphFallback
              variant="broken"
              className="w-full max-w-md opacity-90"
            />
          )}
        </div>

        {/* The three failure hubs as shared NeuralCards (compact → expand). */}
        <div className="relative flex flex-col gap-4">
          {failures.map((f, i) => (
            <NeuralCard
              key={f.num}
              anchorId="problem"
              index={i}
              surface="broken"
              tone="broken"
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
  );
}

export default function ProblemSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const failures = getFailures(isEn);

  return (
    <section
      id="problem"
      className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
    >
      <SectionGlow position="top-right" intensity={1.2} />
      <SectionGlow position="bottom-left" intensity={0.8} size="50rem" />
      <div className="container-px relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — headline + paragraph */}
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
          />

          {/* Right — the three failures as a severed neural lattice */}
          <Reveal delay={120}>
            <FailureLattice failures={failures} isEn={isEn} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
