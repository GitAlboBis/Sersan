"use client";

import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionGlow } from "@/components/ui/section-glow";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";
import { useProductionPulseStore } from "@/webgl/store/productionPulseStore";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { NeuralGraphFallback } from "@/components/fx/neural-graph-fallback";
import { useNeuralLatticeFallback } from "@/components/fx/use-neural-lattice-fallback";
import { NeuralCard } from "@/components/fx/neural-card";

/**
 * ProductionGradeSection — the SIGNATURE section.
 *
 * Three production-grade guarantees, rendered as a "network that is HEALTHY"
 * (FIX 3 v4): three card-anchored hubs through the site's neural-network visual
 * language, pulsing in sequence — eval baseline → trace propagation → guardrail
 * clamp. The cards use the shared NeuralCard chrome (compact → expand on
 * hover/focus, cyan→violet glass) identical to the Problem section; only the
 * copy + healthy accent differ. The copy from getArtifacts() stays as
 * accessible, selectable DOM at all times. Hovering a card flares its WebGL hub
 * via useNeuralLatticeStore.setHovered (done inside NeuralCard).
 *
 * The three claims:
 *   - Every system ships with a regression set.   (eval baseline)
 *   - Traceable from input to action.              (trace propagation)
 *   - Boundaries before features.                  (guardrail clamp)
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

// === Shared: bump the signature-line pulse on a card's first appearance ====
// Each of the 3 cards calls this with its own `inView` flag. On the false→true
// edge it bumps the globalThis-pinned production pulse store; SignatureLine
// (the lazy WebGL island) reads + decays it, lifting the line's emissive above
// the bloom threshold near the production section (BEAT 1). PRESERVED VERBATIM
// from the file-panel version — the signature-line boost is unchanged. Inert
// under reduced-motion (the WebGL layer is unmounted at tier "off", and we
// early-return here too so the store is never even touched).
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

// === Shared: ignite this card's lattice cluster (healthy, in sequence) =====
// The 3 cards enter the viewport sequentially, so this fires three staggered
// cluster ignitions on the new neural-lattice store's "healthy" surface; the
// WebGL NeuralLattice reads + decays them, pulsing eval baseline → trace →
// guardrail in order. Additive to the productionPulse boost above (different
// store). Inert under reduced-motion.
function useHealthyClusterOnEnter(inView: boolean, index: number) {
  const bumpCluster = useNeuralLatticeStore((s) => s.bumpCluster);
  useEffect(() => {
    if (!inView) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    bumpCluster("healthy", index);
  }, [inView, bumpCluster, index]);
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

// The label for each healthy cluster (JetBrains-mono caption). Copy is the
// pipeline-stage name from PIANO_FIX_VISUAL §FIX 3, EN/IT.
function clusterLabel(index: number, isEn: boolean): string {
  if (index === 0) return isEn ? "eval baseline" : "baseline eval";
  if (index === 1) return isEn ? "trace propagation" : "propagazione trace";
  return isEn ? "guardrail clamp" : "clamp guardrail";
}

function ArtifactCard({ a, index }: { a: Artifact; index: number }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  // Keep the in-view bridge: an outer wrapper carries the IntersectionObserver
  // ref so the section's signature-line pulse + the healthy cluster sequence
  // still ignite on first appearance (additive to the NeuralCard hover flare).
  const { ref, inView } = useInView<HTMLDivElement>();
  useProductionPulseOnEnter(inView);
  useHealthyClusterOnEnter(inView, index);

  return (
    <div ref={ref}>
      <NeuralCard
        anchorId="production"
        index={index}
        surface="healthy"
        tone="healthy"
        eyebrow={clusterLabel(index, isEn)}
        title={a.claim}
        body={a.why}
      />
    </div>
  );
}

export default function ProductionGradeSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const artifacts = getArtifacts(isEn);
  const showFallback = useNeuralLatticeFallback();
  return (
    <section
      id="trust"
      className="section-accent-tint section-accent-tint--strong relative section-lg scroll-mt-24 overflow-hidden"
    >
      <SectionGlow position="bottom-right" intensity={1.25} size="65rem" />
      <SectionGlow position="top-left" intensity={0.9} size="50rem" />
      <div className="container-px relative">
        <SectionHeading
          eyebrow={
            isEn
              ? "What production-grade actually means"
              : "Cosa significa davvero production-grade"
          }
          title={
            isEn ? (
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
            )
          }
          description={
            isEn
              ? "Not a list of compliance buzzwords. These are artifacts you can ask to see in any scoping call. Hover a panel to see why it matters."
              : "Non un elenco di buzzword sulla compliance. Sono artefatti che puoi chiedere di vedere in qualsiasi call di scoping. Passa sopra un pannello per capire perché conta."
          }
          className="mb-12 sm:mb-16"
        />

        {/* The healthy lattice: a decorative backdrop spanning the three cards.
            The WebGL NeuralLattice (anchored to [data-lattice-anchor="production"])
            paints behind the grid via the persistent canvas; when WebGL is absent
            the SVG fallback shows the same three healthy pathways. Both
            aria-hidden. The anchor wraps the grid so its measured rect matches the
            card row the lattice should register to. */}
        <div data-lattice-anchor="production" className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            {showFallback && (
              <NeuralGraphFallback
                variant="healthy"
                className="w-full max-w-2xl opacity-80"
              />
            )}
          </div>

          <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-7">
            {artifacts.map((a, i) => (
              <Reveal key={i} delay={i * 90}>
                <ArtifactCard a={a} index={i} />
              </Reveal>
            ))}
          </div>
        </div>

        <p className="mt-14 text-[12px] font-mono uppercase tracking-[0.14em] text-ink-mute max-w-2xl">
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
