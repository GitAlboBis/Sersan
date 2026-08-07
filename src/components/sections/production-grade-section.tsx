"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionGlow } from "@/components/ui/section-glow";
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
 * cards use the shared NeuralCard chrome (compact → expand, cyan→blue glass)
 * identical to the Problem section; only the copy + healthy accent differ. The
 * copy from getArtifacts() stays as accessible, selectable DOM at all times.
 *
 * ENTRANCE — the "systems come online" BOOT SEQUENCE. One GSAP timeline, owned
 * by the section row's in-view edge, replaces the three independent fade-ups
 * the cards used to carry. In pipeline order (eval → trace → guardrail), each
 * beat ignites system i on EVERY presentation tier at once:
 *   - the DOM marker dot pops 0→1 with a one-shot halo ring (.is-igniting);
 *   - the matching side card rises in sync with its marker;
 *   - WebGPU tier: bumpCluster("healthy", i) fires on the SAME beat, so the 3D
 *     lattice orbs pulse in phase with the DOM ignition;
 *   - fallback tier: the SVG hub pops and the pathway stroke DRAWS from the
 *     previous node (stroke-dashoffset), so the network visibly wires itself
 *     up — the narrative reads without WebGL.
 * The timeline is the SINGLE owner of the per-cluster bumps (the old per-card
 * IntersectionObservers double-fired under fast scroll); it plays exactly once,
 * tolerates mounting already in view (IO fires at observe time), and reverses
 * nothing on exit — systems that came online stay online. Reduced-motion:
 * nothing is ever primed hidden, no halo, no store bumps — the section rests in
 * its final state, exactly like the rest of the file's guards.
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

// === Shared: bump the signature-line pulse on the section's appearance =====
// On each false→true edge it bumps the globalThis-pinned production pulse
// store; SignatureLine (the lazy WebGL island) reads + decays it, lifting the
// line's emissive above the bloom threshold near the production section
// (BEAT 1). This used to ride the three per-card observers (three bumps per
// pass); it now rides the ONE section-row observer — same 0..1 target, same
// liveness on re-entry, one writer. Inert under reduced-motion (the WebGL
// layer is unmounted at tier "off", and we early-return here too so the store
// is never even touched).
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

// === Boot choreography constants ==========================================
// Seconds between system ignitions, in pipeline order (eval → trace →
// guardrail). Tight enough to read as ONE boot pass, wide enough that the
// three halo pings and the lattice cluster pulses resolve as a sequence, not
// a chord.
const BOOT_BEAT = 0.15;
/** Number of systems in the pipeline (markers = cards = lattice clusters). */
const BOOT_NODES = 3;

export default function ProductionGradeSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const artifacts = getArtifacts(isEn);
  const showFallback = useNeuralLatticeFallback();

  // ONE in-view edge for the whole network row. It (a) re-bumps the
  // signature-line pulse on every re-entry (tracking observer — preserves the
  // section's historical liveness) and (b) arms the once-only boot timeline.
  const { ref: rowRef, inView } = useInView<HTMLDivElement>();
  useProductionPulseOnEnter(inView);

  const bumpCluster = useNeuralLatticeStore((s) => s.bumpCluster);
  // The boot plays exactly once per page life; the observer keeps toggling for
  // the pulse hook above, so this latch is what makes the timeline calm —
  // scroll-away/scroll-back never re-runs (or reverses) the entrance.
  const playedRef = useRef(false);

  useGSAP(
    () => {
      const row = rowRef.current;
      if (!row) return;
      // Reduced-motion: never prime anything hidden, never stamp the halo,
      // never touch the stores — the section simply rests in its final state
      // (same early-return guard style as the hooks above).
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (playedRef.current) return;

      // --- Collect the per-system targets (scoped to THIS section's row, so
      // the Problem section's markers/SVG are never touched). The dot is the
      // WebGL-measured node anchor; scaling it composes around its own center,
      // so the hub pinning measure is unaffected even at scale 0.
      const systems: {
        dot: HTMLElement;
        label: HTMLElement | null;
        card: HTMLElement | null;
      }[] = [];
      for (let i = 0; i < BOOT_NODES; i++) {
        const dot = row.querySelector<HTMLElement>(
          `[data-lattice-node="production:${i}"]`,
        );
        if (!dot) return; // markers not mounted yet — a dep re-run retries
        systems.push({
          dot,
          label: dot.parentElement?.querySelector<HTMLElement>(
            ".neural-node-marker__label",
          ) ?? null,
          card: row.querySelector<HTMLElement>(`[data-boot-card="${i}"]`),
        });
      }

      // --- Fallback-tier targets: the SVG pathways + hubs that will draw/pop
      // on the same beats. Present only when the WebGL island is absent; the
      // hook flips false→true after the tier probe, which re-runs this effect
      // (pre-paint) so the freshly-mounted SVG is primed before it ever shows.
      const svg = showFallback
        ? row.querySelector<SVGSVGElement>(".neural-centerpiece svg")
        : null;
      const arcs = svg
        ? Array.from(svg.querySelectorAll<SVGPathElement>("[data-arc]"))
        : [];
      // Hubs carry no data hook of their own: they are the only circles that
      // are neither packets nor scatter dots (document order = hub index).
      const hubs = svg
        ? Array.from(
            svg.querySelectorAll<SVGCircleElement>(
              "circle:not([data-packet]):not([data-scatter])",
            ),
          )
        : [];

      // --- PRIME (idempotent across dep re-runs; useGSAP is a layout effect,
      // so this lands before paint — no hidden-then-visible flash). `.is-booting`
      // suspends the dot's 300ms hover transition while GSAP owns its transform
      // (a CSS transition would re-ease every per-frame write and smear the
      // pop); it is removed the moment the ignite tween completes.
      for (const s of systems) {
        s.dot.classList.add("is-booting");
        gsap.set(s.dot, { scale: 0 });
        if (s.label) gsap.set(s.label, { opacity: 0 });
        if (s.card) gsap.set(s.card, { opacity: 0, y: 16 });
      }
      for (const p of arcs) {
        const len = p.getTotalLength();
        // opacity 0 as well: with the dash fully offset, round linecaps can
        // still leak a cap-dot at the path start in some renderers; the
        // timeline flips each arc visible exactly when its draw begins.
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
      }
      if (hubs.length) {
        gsap.set(hubs, { scale: 0, transformOrigin: "50% 50%" });
      }

      // Primed but not yet on screen: wait for the IO edge (the inView dep
      // re-runs this effect, falls through the guards above, and plays).
      if (!inView) return;
      playedRef.current = true;

      // --- The boot. One timeline, one owner: every per-cluster store bump,
      // every DOM ignition and every SVG draw fires from these beats, so the
      // three presentation tiers can never drift out of phase (and fast scroll
      // can never double-fire a cluster, which the old per-card observers
      // could). Entrances ride expo.out; the node-to-node pathway draws ride
      // expo.inOut (they are crossings, not arrivals).
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      systems.forEach(({ dot, label, card }, i) => {
        const t = i * BOOT_BEAT;
        // WebGPU tier: pulse lattice cluster i on this exact beat. Harmless
        // no-op store write when the island is absent (fallback tier).
        tl.call(
          () => {
            bumpCluster("healthy", i);
          },
          undefined,
          t,
        );
        // Marker dot ignites. clearProps hands the transform back to the
        // stylesheet at rest so the CSS hover surge (scale 1.18) keeps winning
        // over what would otherwise be a stale inline transform.
        tl.to(
          dot,
          {
            scale: 1,
            duration: 0.5,
            onComplete: () => {
              gsap.set(dot, { clearProps: "transform" });
              dot.classList.remove("is-booting");
            },
          },
          t,
        );
        // One-shot halo ring (globals.css keyframe). The class persists after
        // its single run — the keyframe parks the ring invisible — so no
        // remove-choreography is needed.
        tl.call(
          () => {
            dot.classList.add("is-igniting");
          },
          undefined,
          t + 0.1,
        );
        if (label) tl.to(label, { opacity: 1, duration: 0.3 }, t + 0.08);
        // The card rises in sync with its marker. The tween rides the WRAPPER
        // div, never the card itself, so NeuralCard's own hover/open
        // transitions (box-shadow, grid-rows) stay CSS-owned throughout.
        if (card) tl.to(card, { opacity: 1, y: 0, duration: 0.7 }, t);
        // Fallback tier: the SVG hub pops on the beat, and the pathway from
        // the previous node draws INTO this one — the wire arrives as the
        // system comes online.
        if (hubs[i]) tl.to(hubs[i], { scale: 1, duration: 0.5 }, t);
        if (i > 0 && arcs[i - 1]) {
          const drawAt = (i - 1) * BOOT_BEAT + 0.02;
          tl.set(arcs[i - 1], { opacity: 1 }, drawAt);
          tl.to(
            arcs[i - 1],
            { strokeDashoffset: 0, duration: 0.2, ease: "expo.inOut" },
            drawAt,
          );
        }
      });
      // The 0→2 span closes the mesh last — the network is whole once every
      // system is up (arc order mirrors ARCS in neural-graph-fallback.tsx:
      // chain 0→1, 1→2, then the span).
      if (arcs[2]) {
        const spanAt = (BOOT_NODES - 1) * BOOT_BEAT + 0.12;
        tl.set(arcs[2], { opacity: 1 }, spanAt);
        tl.to(
          arcs[2],
          { strokeDashoffset: 0, duration: 0.5, ease: "expo.inOut" },
          spanAt,
        );
      }
    },
    { dependencies: [inView, showFallback, bumpCluster], scope: rowRef },
  );

  return (
    <section
      id="trust"
      data-snap
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
        {/* items-start (NOT center): a card expanding must not re-center this
            row, or the %-anchored node markers would shift out from under a
            still cursor and the hover would oscillate — the exact fix the
            Problem section's twin rows already carry. */}
        <div
          ref={rowRef}
          className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-start"
        >
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

          {/* Cards column — OFFSET from the network (never overlapping it).
              Each wrapper is a boot-timeline target (opacity/y only; the card
              inside keeps sole ownership of its hover/open transitions). */}
          <div className="relative flex flex-col gap-5 sm:gap-6">
            {artifacts.map((a, i) => (
              <div key={i} data-boot-card={i}>
                <NeuralCard
                  index={i}
                  surface="healthy"
                  tone="healthy"
                  bodyId={bodyId(i)}
                  eyebrow={clusterLabel(i, isEn)}
                  title={a.claim}
                  body={a.why}
                />
              </div>
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
