"use client";

/**
 * CompliancePipeline — the compliance conduit, rebuilt as a single beam of
 * light (M4). Input → PII redaction → router → guardrail → audit log →
 * output, each stage labelled with the regulation it satisfies (copy
 * unchanged, EN/IT). A glowing streak runs the gradient conduit on one
 * deterministic GSAP timeline; each station ignites with a pulse as the
 * light crosses it. ScrollTrigger plays/pauses the loop with visibility.
 * Reduced-motion: solid conduit, stations softly lit, no movement.
 */

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLanguage } from "@/components/language-provider";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { useCompliancePipelineStore } from "@/webgl/store/compliancePipelineStore";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STAGE_KEYS = ["input", "pii", "router", "guardrail", "audit", "output"] as const;
type StageKey = (typeof STAGE_KEYS)[number];

const STAGE_LABELS: Record<StageKey, { en: string; it: string }> = {
  input: { en: "Input", it: "Input" },
  pii: { en: "PII redaction", it: "Redazione PII" },
  router: { en: "Model router", it: "Router modelli" },
  guardrail: { en: "Guardrail check", it: "Controllo guardrail" },
  audit: { en: "Audit log", it: "Log di audit" },
  output: { en: "Output", it: "Output" },
};

const REGULATIONS: Record<StageKey, string> = {
  input: "GDPR",
  pii: "GDPR · EU AI Act Art. 10",
  router: "EU AI Act",
  guardrail: "EU AI Act Art. 14",
  audit: "DORA · ISO 27001",
  output: "GDPR",
};

// Desktop geometry
const D_VB_W = 880;
const D_VB_H = 140;
const D_BOX_W = 110;
const D_BOX_H = 44;
const D_PILL_Y_OFFSET = 12;
const D_CENTER_Y = 56;
const D_STAGE_X = STAGE_KEYS.map((_, i) => {
  const margin = 70;
  const span = D_VB_W - margin * 2;
  return margin + (span * i) / (STAGE_KEYS.length - 1);
});

// Mobile geometry (vertical)
const M_VB_W = 280;
const M_VB_H = 720;
const M_BOX_W = 132;
const M_BOX_H = 44;
const M_CENTER_X = 80;
const M_STAGE_Y = STAGE_KEYS.map((_, i) => {
  const margin = 50;
  const span = M_VB_H - margin * 2;
  return margin + (span * i) / (STAGE_KEYS.length - 1);
});

/** Seconds for one full pass of the light. */
const TOTAL_DURATION = 8;
const STAGE_FRACTIONS = STAGE_KEYS.map((_, i) => i / (STAGE_KEYS.length - 1));

interface DiagramProps {
  mobile: boolean;
  stageLabel: (k: StageKey) => string;
}

function PipelineDiagram({ mobile, stageLabel }: DiagramProps) {
  const rootRef = useRef<SVGSVGElement>(null);
  const streakRef = useRef<SVGLineElement>(null);
  const pulseRefs = useRef<(SVGRectElement | null)[]>([]);

  const idSuffix = mobile ? "m" : "d";
  const conduitStart = mobile ? M_STAGE_Y[0] : D_STAGE_X[0];
  const conduitEnd = mobile
    ? M_STAGE_Y[M_STAGE_Y.length - 1]
    : D_STAGE_X[D_STAGE_X.length - 1];
  const pathLen = conduitEnd - conduitStart;
  const streakLen = mobile ? 80 : 110;

  useGSAP(
    () => {
      const streak = streakRef.current;
      if (!streak) return;

      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduce) {
        // Static, calm: no streak, every station softly acknowledged.
        gsap.set(streak, { opacity: 0 });
        pulseRefs.current.forEach((p) => p && gsap.set(p, { opacity: 0.3 }));
        return;
      }

      // The streak is a short dash sliding along the conduit. Offset starts
      // with the dash entirely before the line and exits past the far end.
      gsap.set(streak, {
        strokeDasharray: `${streakLen} ${pathLen + streakLen * 2}`,
        strokeDashoffset: streakLen,
      });

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 0.8,
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top 90%",
          toggleActions: "play pause resume pause",
        },
      });

      tl.to(streak, {
        strokeDashoffset: -(pathLen + streakLen),
        duration: TOTAL_DURATION,
      });

      // Stations ignite as the light's head crosses them.
      STAGE_FRACTIONS.forEach((f, i) => {
        const pulse = pulseRefs.current[i];
        if (!pulse) return;
        const t = f * TOTAL_DURATION;
        tl.fromTo(
          pulse,
          { opacity: 0 },
          { opacity: 0.95, duration: 0.16, ease: "power2.out" },
          Math.max(t - 0.08, 0),
        ).to(pulse, { opacity: 0, duration: 0.7, ease: "power2.in" }, t + 0.18);
      });
    },
    { scope: rootRef, dependencies: [mobile, pathLen, streakLen] },
  );

  const renderStage = (key: StageKey, idx: number) => {
    const cx = mobile ? M_CENTER_X : D_STAGE_X[idx];
    const cy = mobile ? M_STAGE_Y[idx] : D_CENTER_Y;
    const boxW = mobile ? M_BOX_W : D_BOX_W;
    const boxH = mobile ? M_BOX_H : D_BOX_H;

    return (
      <g key={key}>
        {/* Base station */}
        <rect
          x={cx - boxW / 2}
          y={cy - boxH / 2}
          width={boxW}
          height={boxH}
          rx={10}
          fill="hsl(var(--surface))"
          stroke="hsl(var(--rule))"
          strokeWidth={1}
        />
        {/* Ignition pulse — lit by the timeline as the light crosses. */}
        <rect
          ref={(el) => {
            pulseRefs.current[idx] = el;
          }}
          x={cx - boxW / 2}
          y={cy - boxH / 2}
          width={boxW}
          height={boxH}
          rx={10}
          fill="none"
          stroke={`url(#pipeGrad-${idSuffix})`}
          strokeWidth={1.6}
          opacity={0}
          filter={`url(#pipeGlow-${idSuffix})`}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="hsl(var(--ink))"
          style={{
            fontSize: 12,
            fontFamily: "var(--font-sans), system-ui, sans-serif",
            fontWeight: 500,
          }}
        >
          {stageLabel(key)}
        </text>
        <text
          x={mobile ? cx + boxW / 2 + 12 : cx}
          y={mobile ? cy : cy + boxH / 2 + D_PILL_Y_OFFSET + 4}
          textAnchor={mobile ? "start" : "middle"}
          dominantBaseline={mobile ? "middle" : undefined}
          fill="hsl(var(--ink-mute))"
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono), ui-monospace, monospace",
          }}
        >
          {REGULATIONS[key]}
        </text>
      </g>
    );
  };

  const x1 = mobile ? M_CENTER_X : conduitStart;
  const x2 = mobile ? M_CENTER_X : conduitEnd;
  const y1 = mobile ? conduitStart : D_CENTER_Y;
  const y2 = mobile ? conduitEnd : D_CENTER_Y;

  return (
    <svg
      ref={rootRef}
      viewBox={`0 0 ${mobile ? M_VB_W : D_VB_W} ${mobile ? M_VB_H : D_VB_H}`}
      className={mobile ? "w-full h-auto" : "w-full h-auto min-w-[720px]"}
      style={mobile ? { maxHeight: 720 } : undefined}
    >
      <defs>
        <linearGradient
          id={`pipeGrad-${idSuffix}`}
          gradientUnits="userSpaceOnUse"
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
        >
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--accent-2))" />
        </linearGradient>
        <filter
          id={`pipeGlow-${idSuffix}`}
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
        >
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Conduit: quiet gradient base the light travels on. */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={`url(#pipeGrad-${idSuffix})`}
        strokeWidth={1.4}
        opacity={0.28}
      />

      {/* The light: a glowing streak sliding the conduit (GSAP dashoffset). */}
      <line
        ref={streakRef}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={`url(#pipeGrad-${idSuffix})`}
        strokeWidth={2.6}
        strokeLinecap="round"
        filter={`url(#pipeGlow-${idSuffix})`}
      />

      {STAGE_KEYS.map((k, i) => renderStage(k, i))}
    </svg>
  );
}

/**
 * Focusable, keyboard-navigable annotated-hotspot OVERLAY (Radian-EXR pattern):
 * one focusable element per stage carrying the FROZEN STAGE_LABELS + REGULATIONS,
 * tab-ordered Input→Output, with a bilingual composed aria-label. These are
 * ADDITIVE real focusable elements positioned as a TRANSPARENT overlay directly
 * over the SVG's stage boxes (using the SVG viewBox geometry as percentages, so
 * they track the responsive SVG scale) — they do NOT replace the SVG role=img
 * label or any copy, and they render NO visible duplicate row (transparent by
 * default; only a focus/hover ring shows). The overlay must stay a DOM SIBLING
 * of the role="img" div (never a child — interactive elements inside role=img
 * are hidden from assistive tech). On focus/hover a hotspot bumps
 * compliancePipelineStore so the (full+webgpu only) CompliancePipeline3D ignites
 * that stage; on every other tier the reader is unmounted and the set is a
 * harmless no-op.
 *
 * `mobile` selects the vertical (M_*) vs horizontal (D_*) viewBox mapping so the
 * overlay matches whichever PipelineDiagram its sibling card is rendering.
 */
function PipelineHotspots({
  isEn,
  stageLabel,
  mobile,
}: {
  isEn: boolean;
  stageLabel: (k: StageKey) => string;
  mobile: boolean;
}) {
  const setHovered = useCompliancePipelineStore((s) => s.setHovered);
  const bump = useCompliancePipelineStore((s) => s.bump);

  const ignite = (idx: number) => {
    setHovered(idx);
    bump(idx);
  };
  const clear = () => setHovered(-1);

  const ariaFor = (k: StageKey, idx: number) => {
    const label = stageLabel(k);
    const regs = REGULATIONS[k];
    return isEn
      ? `Stage ${idx + 1} of ${STAGE_KEYS.length}: ${label}. ${regs}`
      : `Fase ${idx + 1} di ${STAGE_KEYS.length}: ${label}. ${regs}`;
  };

  return (
    // pointer-events-none so the SVG underneath stays the visual; only the
    // buttons re-enable pointer events. inset-0 matches the SVG's rendered rect
    // (same content box as its sibling card, see caller).
    <div
      className="pointer-events-none absolute inset-0"
      aria-label={
        isEn ? "Pipeline stage details" : "Dettagli delle fasi della pipeline"
      }
    >
      {STAGE_KEYS.map((k, idx) => {
        // Percentage-of-viewBox positioning tracks the responsive SVG scale.
        const leftPct = mobile
          ? (M_CENTER_X / M_VB_W) * 100
          : (D_STAGE_X[idx] / D_VB_W) * 100;
        const topPct = mobile
          ? (M_STAGE_Y[idx] / M_VB_H) * 100
          : (D_CENTER_Y / D_VB_H) * 100;

        return (
          <button
            key={k}
            type="button"
            aria-label={ariaFor(k, idx)}
            onFocus={() => ignite(idx)}
            onBlur={clear}
            onMouseEnter={() => ignite(idx)}
            onMouseLeave={clear}
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: "translate(-50%, -50%)",
            }}
            className="pointer-events-auto absolute h-10 w-24 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 hover:ring-2 hover:ring-accent/40"
          />
        );
      })}
    </div>
  );
}

export default function CompliancePipeline() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const stageLabel = (k: StageKey) =>
    isEn ? STAGE_LABELS[k].en : STAGE_LABELS[k].it;
  const ariaLabel = isEn
    ? "Compliance data flow: input through PII redaction, model routing, guardrail checks, and audit logging to output, satisfying GDPR, EU AI Act, DORA, and ISO 27001"
    : "Flusso dati di conformità: input attraverso redazione PII, routing dei modelli, controllo guardrail e log di audit fino all'output, in conformità con GDPR, EU AI Act, DORA e ISO 27001";

  return (
    <section
      className="section-lg relative overflow-hidden"
      aria-labelledby="compliance-pipeline-heading"
    >
      <div className="container mx-auto max-w-5xl relative z-10 px-0 sm:px-6">
        {/* Eyebrow + H2 outside the RevealOnScroll fade: the eyebrow's
            entrance is the LabelScrambler decode, the H2's is the
            HeadingChoreographer line-mask (data-split-reveal) — keeping them
            in the block fade would double-animate. The description keeps the
            fade. */}
        <div className="max-w-3xl mb-12 sm:mb-14">
          <p className="eyebrow mb-5">
            {isEn ? "How data flows" : "Come fluiscono i dati"}
          </p>
          {/* key={language}: SplitText owns this subtree once split; a
              language swap must remount it or React reconciles against
              orphaned nodes (same contract as SectionHeading's h2). */}
          <h2
            key={language}
            data-split-reveal
            id="compliance-pipeline-heading"
            className="font-display text-2xl sm:text-[2rem] leading-[1.15] tracking-tight text-ink text-balance mb-5"
          >
            {isEn ? (
              <>
                Compliance{" "}
                <span className="italic text-accent">wired in</span>, not
                stuck on at the end.
              </>
            ) : (
              <>
                Conformità{" "}
                <span className="italic text-accent">integrata</span>,
                non appiccicata alla fine.
              </>
            )}
          </h2>
          <RevealOnScroll delay={0}>
            <p className="text-base text-ink-mute leading-[1.55]">
              {isEn
                ? "Every request through a Sersan system passes the same controlled pipeline. The diagram below mirrors the actual checkpoints your data crosses."
                : "Ogni richiesta in un sistema Sersan attraversa la stessa pipeline controllata. Lo schema qui sotto rispecchia i checkpoint reali che i vostri dati attraversano."}
            </p>
          </RevealOnScroll>
        </div>

        {/* position: relative so the focusable hotspot OVERLAY (a DOM sibling
            of the role="img" div, never a child) can lay over the SVG's stage
            boxes. The overlay matches the SVG's rendered content box: it is
            inset by the card padding (p-6 sm:p-8) so inset-0 inside it lands on
            the SVG rect, not the card border. */}
        <div className="relative">
          <div
            role="img"
            aria-label={ariaLabel}
            className="w-full rounded-xl border border-rule/70 bg-surface/40 p-6 sm:p-8"
          >
            {/* Desktop horizontal */}
            <div className="hidden sm:block w-full overflow-x-auto">
              <PipelineDiagram mobile={false} stageLabel={stageLabel} />
            </div>

            {/* Mobile vertical */}
            <div className="sm:hidden w-full">
              <PipelineDiagram mobile stageLabel={stageLabel} />
            </div>
          </div>

          {/* Focusable, keyboard-navigable stage hotspots (ADDITIVE to the SVG
              role=img diagram above). Kept OUTSIDE (a SIBLING of) the role="img"
              wrapper: that element collapses its whole subtree into one
              presentational image for assistive tech, which would hide these
              real interactive buttons. Rendered as a TRANSPARENT overlay over
              the SVG stage boxes — no visible duplicate row. The padding insets
              align the overlay's inset-0 with the SVG content box. Separate
              desktop/mobile instances so each maps the matching viewBox.
              Tab Input→Output; bilingual aria-labels reuse the frozen
              STAGE_LABELS/REGULATIONS. On focus/hover they ignite the full+webgpu
              CompliancePipeline3D via compliancePipelineStore. */}
          <div className="pointer-events-none absolute inset-0 hidden p-6 sm:block sm:p-8">
            <PipelineHotspots isEn={isEn} stageLabel={stageLabel} mobile={false} />
          </div>
          <div className="pointer-events-none absolute inset-0 p-6 sm:hidden">
            <PipelineHotspots isEn={isEn} stageLabel={stageLabel} mobile />
          </div>
        </div>

        <p className="mt-5 text-xs text-ink-mute leading-[1.55]">
          {isEn
            ? "GDPR · EU AI Act · DORA · ISO 27001 — each checkpoint backed by the regulation it satisfies."
            : "GDPR · EU AI Act · DORA · ISO 27001 — ogni checkpoint coperto dalla normativa che soddisfa."}
        </p>
      </div>
    </section>
  );
}
