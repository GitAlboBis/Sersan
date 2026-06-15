"use client";

import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionGlow } from "@/components/ui/section-glow";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";
import { useProductionPulseStore } from "@/webgl/store/productionPulseStore";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { useNeuralLatticeFallback } from "@/components/fx/use-neural-lattice-fallback";
import { NeuralCard } from "@/components/fx/neural-card";
import { NeuralCenterpiece } from "@/components/fx/neural-centerpiece";

/**
 * ProductionGradeSection — the SIGNATURE section.
 *
 * Three production-grade guarantees, rendered as a "network that is HEALTHY"
 * (FIX 3 v5): the neural NETWORK is the clearly-visible CENTERPIECE — dense
 * particle orbs + arcs + travelling signal, the 3 nodes pulsing in sequence
 * (eval baseline → trace propagation → guardrail clamp) — with the 3 cards
 * OFFSET to its side (never overlapping it). Heading on top; below = [network
 * centerpiece] beside [cards column]. The 3 focusable NODE MARKERS in the
 * centerpiece are the primary trigger: hovering/focusing node i flares + BURSTS
 * its hub (particle effect) and OPENS the matching side card; others dim. The
 * cards use the shared NeuralCard chrome (compact → expand, cyan→violet glass)
 * identical to the Problem section; only the copy + healthy accent differ. The
 * copy from getArtifacts() stays as accessible, selectable DOM at all times.
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

// Stable body id per index so the centerpiece node marker's aria-controls
// resolves to the matching side card (SSR-stable, no useId).
function bodyId(i: number) {
  return `neural-production-card-${i}`;
}

function ArtifactCard({ a, index }: { a: Artifact; index: number }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  // Keep the in-view bridge: an outer wrapper carries the IntersectionObserver
  // ref so the section's signature-line pulse + the healthy cluster sequence
  // still ignite on first appearance (additive to the hover flare/burst).
  const { ref, inView } = useInView<HTMLDivElement>();
  useProductionPulseOnEnter(inView);
  useHealthyClusterOnEnter(inView, index);

  return (
    <div ref={ref}>
      <NeuralCard
        index={index}
        surface="healthy"
        tone="healthy"
        bodyId={bodyId(index)}
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

        {/* FIX 3 v5 — RECOMPOSE: the healthy network is the clearly-visible
            CENTERPIECE beside the cards column (network one side, cards the
            other). The WebGL NeuralLattice (anchored to the centerpiece's
            [data-lattice-anchor="production"]) paints the dense particle orbs +
            arcs + travelling signal; the 3 focusable NODE MARKERS in the
            centerpiece are the primary trigger (flare + BURST the hub + open the
            matching side card). When WebGL is absent the SVG fallback shows the
            three healthy pathways. Both aria-hidden. Stacks on narrow widths
            (network on top, cards below). */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-center">
          <NeuralCenterpiece
            anchorId="production"
            surface="healthy"
            tone="healthy"
            showFallback={showFallback}
            className="min-h-[300px] sm:min-h-[360px]"
            nodes={[
              { label: clusterLabel(0, isEn), controls: bodyId(0) },
              { label: clusterLabel(1, isEn), controls: bodyId(1) },
              { label: clusterLabel(2, isEn), controls: bodyId(2) },
            ]}
          />

          {/* Cards column — OFFSET from the network (never overlapping it). */}
          <div className="relative flex flex-col gap-5 sm:gap-6">
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
