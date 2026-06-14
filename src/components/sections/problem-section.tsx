"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, GitBranch, ShieldOff } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
import { useScrollParallax } from "@/components/ui/use-scroll-parallax";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { NeuralGraphFallback } from "@/components/fx/neural-graph-fallback";
import { useNeuralLatticeFallback } from "@/components/fx/use-neural-lattice-fallback";

/**
 * ProblemSection — names the pain (demo-to-production gap).
 *
 * Split layout, conforming to the shared section grammar:
 *   - Left: eyebrow + editorial headline + paragraph (SectionHeading).
 *   - Right: the three failure modes as a "network that BREAKS" — three
 *     pathways through the site's neural-lattice visual language (FIX 3). The
 *     terminal/incident-console chrome (macOS dots, radar sweep, row-scan,
 *     "incident console" label) is GONE; the copy from getFailures() stays as
 *     accessible, selectable DOM rows, and a decorative lattice (WebGL when
 *     available, SVG fallback otherwise) shows the three severed signal paths.
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
  /** Severity tone for the warning dot — amber (warn) or red (critical). */
  tone: "warn" | "critical";
  Icon: LucideIcon;
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
      tone: "warn",
      Icon: Activity,
    },
    {
      num: "02",
      cause: isEn ? "No traces" : "Niente tracce",
      effect: isEn ? "no debugging" : "niente debugging",
      body: isEn
        ? "When the agent makes the wrong call, you need to know which step failed. Without structured tracing, every incident becomes archaeology."
        : "Quando l'agente prende la decisione sbagliata, devi sapere quale passo ha fallito. Senza un tracing strutturato, ogni incidente diventa un lavoro di archeologia.",
      tone: "warn",
      Icon: GitBranch,
    },
    {
      num: "03",
      cause: isEn ? "No boundaries" : "Niente confini",
      effect: isEn ? "no trust" : "niente fiducia",
      body: isEn
        ? "Tools and data without a permission model become a liability the first time the agent does something a regulator notices."
        : "Tool e dati senza un modello di permessi diventano un rischio la prima volta che l'agente fa qualcosa che un'autorità di vigilanza nota.",
      tone: "critical",
      Icon: ShieldOff,
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

// === Failure lattice =======================================================
// The three failures rendered as accessible rows over the decorative lattice.
// The lattice itself is the persistent WebGL canvas (NeuralLattice, anchored to
// [data-lattice-anchor="problem"]) when available, or the SVG fallback when the
// WebGL island is absent (lite/off/reduced-motion/no-WebGPU). The copy is
// byte-identical to the previous IncidentConsole — only the chrome changed.
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

  const toneColor = (tone: Failure["tone"]) =>
    tone === "critical" ? "hsl(0 72% 56%)" : "hsl(36 84% 56%)";

  return (
    <div ref={parallaxRef}>
      <div ref={ref} className="relative">
        {/* Decorative lattice layer. The WebGL NeuralLattice paints behind this
            via the persistent canvas (anchored to the rect below); when WebGL is
            absent the SVG fallback shows the same severed-pathway metaphor. Both
            are aria-hidden. The anchor element is the rect the WebGL island
            camera-locks to — give it real height so the lattice has room. */}
        <div
          data-lattice-anchor="problem"
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

        {/* Accessible copy — the three failure modes as plain rows. */}
        <ul className="relative space-y-px">
          {failures.map((f) => {
            const Icon = f.Icon;
            return (
              <li
                key={f.num}
                className="group/row relative rounded-lg border border-[hsl(var(--rule)/0.7)] bg-[hsl(var(--bg)/0.55)] backdrop-blur-[2px] px-5 py-4 transition-colors duration-300 hover:border-[hsl(var(--accent)/0.4)]"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[hsl(var(--rule))] bg-[hsl(var(--bg)/0.6)] text-ink-mute transition-colors duration-300 group-hover/row:text-[hsl(var(--accent))] group-hover/row:border-[hsl(var(--accent)/0.4)]"
                  >
                    <Icon
                      className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover/row:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
                      strokeWidth={1.6}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] uppercase">
                      <span className="text-[hsl(var(--accent)/0.85)]">
                        {f.num}
                      </span>
                      <span
                        aria-hidden="true"
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ background: toneColor(f.tone) }}
                      />
                    </div>

                    <h3 className="mt-1.5 font-mono text-[15px] sm:text-base leading-snug text-ink">
                      <span>{f.cause}</span>{" "}
                      <span aria-hidden="true" style={{ color: toneColor(f.tone) }}>
                        {"→"}
                      </span>{" "}
                      <span className="text-ink-mute">{f.effect}.</span>
                    </h3>
                    <p className="mt-1.5 text-[13.5px] text-ink-mute leading-relaxed">
                      {f.body}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
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
