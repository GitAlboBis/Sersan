"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/components/language-provider";
import { RevealOnScroll } from "@/components/reveal-on-scroll";

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

// Animation timing
const TOTAL_DURATION = 8; // seconds for one full pass
const STAGE_HIT_TIMES = STAGE_KEYS.map(
  (_, i) => (i / (STAGE_KEYS.length - 1)) * TOTAL_DURATION,
);
const ACTIVE_DURATION_MS = 600;

/**
 * CompliancePipeline — animated visualization of the data flow inside a
 * Sersan-run system. Input → PII redaction → router → guardrail → audit log
 * → output. Each stage labelled with the regulation it satisfies. A single
 * brass dot travels through the pipeline on a loop; stages light up briefly
 * as the dot crosses them. Reduced-motion honored: dashes go solid, dot
 * hidden, no flashing.
 */
export default function CompliancePipeline() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { margin: "-80px" });
  const [activeStages, setActiveStages] = useState<Set<number>>(new Set());

  const stageLabel = (k: StageKey) => (isEn ? STAGE_LABELS[k].en : STAGE_LABELS[k].it);
  const ariaLabel = isEn
    ? "Compliance data flow: input through PII redaction, model routing, guardrail checks, and audit logging to output, satisfying GDPR, EU AI Act, DORA, and ISO 27001"
    : "Flusso dati di conformità: input attraverso redazione PII, routing dei modelli, controllo guardrail e log di audit fino all'output, in conformità con GDPR, EU AI Act, DORA e ISO 27001";

  // Stage activation scheduler (synced with dot travel)
  useEffect(() => {
    if (reduce || !inView) {
      setActiveStages(new Set());
      return;
    }

    const timeouts: number[] = [];

    const scheduleLoop = () => {
      STAGE_HIT_TIMES.forEach((time, idx) => {
        timeouts.push(
          window.setTimeout(() => {
            setActiveStages((prev) => new Set(prev).add(idx));
            window.setTimeout(() => {
              setActiveStages((prev) => {
                const next = new Set(prev);
                next.delete(idx);
                return next;
              });
            }, ACTIVE_DURATION_MS);
          }, time * 1000),
        );
      });
    };

    scheduleLoop();
    const interval = window.setInterval(scheduleLoop, TOTAL_DURATION * 1000);

    return () => {
      window.clearInterval(interval);
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [reduce, inView]);

  const dotKeyframeTimes = useMemo(
    () => STAGE_HIT_TIMES.map((s) => s / TOTAL_DURATION),
    [],
  );

  const renderStage = (key: StageKey, idx: number, mobile: boolean) => {
    const isActive = activeStages.has(idx) && !reduce;
    const stroke = isActive ? "hsl(var(--accent))" : "hsl(var(--rule))";
    const strokeWidth = isActive ? 1.5 : 1;
    const transition = "stroke 200ms ease-out, stroke-width 200ms ease-out";

    if (mobile) {
      const cy = M_STAGE_Y[idx];
      return (
        <g key={key}>
          <rect
            x={M_CENTER_X - M_BOX_W / 2}
            y={cy - M_BOX_H / 2}
            width={M_BOX_W}
            height={M_BOX_H}
            rx={10}
            fill="hsl(var(--surface))"
            stroke={stroke}
            strokeWidth={strokeWidth}
            style={{ transition }}
          />
          <text
            x={M_CENTER_X}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="hsl(var(--ink))"
            style={{
              fontSize: 12,
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontWeight: 500,
            }}
          >
            {stageLabel(key)}
          </text>
          <text
            x={M_CENTER_X + M_BOX_W / 2 + 12}
            y={cy}
            dominantBaseline="middle"
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
    }

    const cx = D_STAGE_X[idx];
    return (
      <g key={key}>
        <rect
          x={cx - D_BOX_W / 2}
          y={D_CENTER_Y - D_BOX_H / 2}
          width={D_BOX_W}
          height={D_BOX_H}
          rx={10}
          fill="hsl(var(--surface))"
          stroke={stroke}
          strokeWidth={strokeWidth}
          style={{ transition }}
        />
        <text
          x={cx}
          y={D_CENTER_Y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="hsl(var(--ink))"
          style={{
            fontSize: 12,
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 500,
          }}
        >
          {stageLabel(key)}
        </text>
        <text
          x={cx}
          y={D_CENTER_Y + D_BOX_H / 2 + D_PILL_Y_OFFSET + 4}
          textAnchor="middle"
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

  return (
    <section
      className="section-lg relative overflow-hidden"
      aria-labelledby="compliance-pipeline-heading"
    >
      <div className="container mx-auto max-w-5xl relative z-10 px-0 sm:px-6">
        <RevealOnScroll delay={0}>
          <div className="max-w-3xl mb-12 sm:mb-14">
            <p className="eyebrow mb-5">
              {isEn ? "How data flows" : "Come fluiscono i dati"}
            </p>
            <h2
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
            <p className="text-base text-ink-mute leading-[1.55]">
              {isEn
                ? "Every request through a Sersan system passes the same controlled pipeline. The diagram below mirrors the actual checkpoints your data crosses."
                : "Ogni richiesta in un sistema Sersan attraversa la stessa pipeline controllata. Lo schema qui sotto rispecchia i checkpoint reali che i vostri dati attraversano."}
            </p>
          </div>
        </RevealOnScroll>

        <div
          ref={containerRef}
          role="img"
          aria-label={ariaLabel}
          className="w-full rounded-xl border border-rule/70 bg-surface/40 p-6 sm:p-8"
        >
          {/* Desktop horizontal */}
          <div className="hidden sm:block w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${D_VB_W} ${D_VB_H}`}
              className="w-full h-auto min-w-[720px]"
            >
              {STAGE_KEYS.slice(0, -1).map((_, i) => (
                <line
                  key={i}
                  x1={D_STAGE_X[i] + D_BOX_W / 2}
                  y1={D_CENTER_Y}
                  x2={D_STAGE_X[i + 1] - D_BOX_W / 2}
                  y2={D_CENTER_Y}
                  stroke="hsl(var(--rule))"
                  strokeWidth={1}
                  strokeDasharray={reduce ? "0" : "4,5"}
                />
              ))}

              {STAGE_KEYS.map((k, i) => renderStage(k, i, false))}

              {!reduce && inView && (
                <motion.circle
                  key="dot-d"
                  r={4}
                  cy={D_CENTER_Y}
                  cx={D_STAGE_X[0]}
                  fill="hsl(var(--accent))"
                  fillOpacity={0.95}
                  animate={{ cx: D_STAGE_X }}
                  transition={{
                    duration: TOTAL_DURATION,
                    times: dotKeyframeTimes,
                    repeat: Infinity,
                    repeatDelay: 0,
                    ease: "linear",
                  }}
                />
              )}
            </svg>
          </div>

          {/* Mobile vertical */}
          <div className="sm:hidden w-full">
            <svg
              viewBox={`0 0 ${M_VB_W} ${M_VB_H}`}
              className="w-full h-auto"
              style={{ maxHeight: 720 }}
            >
              {STAGE_KEYS.slice(0, -1).map((_, i) => (
                <line
                  key={i}
                  x1={M_CENTER_X}
                  y1={M_STAGE_Y[i] + M_BOX_H / 2}
                  x2={M_CENTER_X}
                  y2={M_STAGE_Y[i + 1] - M_BOX_H / 2}
                  stroke="hsl(var(--rule))"
                  strokeWidth={1}
                  strokeDasharray={reduce ? "0" : "4,5"}
                />
              ))}

              {STAGE_KEYS.map((k, i) => renderStage(k, i, true))}

              {!reduce && inView && (
                <motion.circle
                  key="dot-m"
                  r={4}
                  cx={M_CENTER_X}
                  cy={M_STAGE_Y[0]}
                  fill="hsl(var(--accent))"
                  fillOpacity={0.95}
                  animate={{ cy: M_STAGE_Y }}
                  transition={{
                    duration: TOTAL_DURATION,
                    times: dotKeyframeTimes,
                    repeat: Infinity,
                    repeatDelay: 0,
                    ease: "linear",
                  }}
                />
              )}
            </svg>
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
