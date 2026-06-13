"use client";

import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionGlow } from "@/components/ui/section-glow";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";
import { useScrollStore } from "@/webgl/store/scrollStore";
import { useProductionPulseStore } from "@/webgl/store/productionPulseStore";

/**
 * ProductionGradeSection — the SIGNATURE section.
 *
 * Three REAL artifact panels, not decorative visuals. Each panel is the kind of
 * file or record you would actually open in a repo or an observability tool:
 *
 *   - evals/agent_v0.4.3.json   a versioned regression set, rendered as a
 *                               line-numbered JSON file with pass/fail status.
 *   - trace · request timeline  a per-request span log with depths + latencies.
 *   - permissions.yaml          a scoped capability file: allow / review / deny.
 *
 * Crisp monospace, subtle syntax styling, tiny status labels, restrained
 * animation (a single quiet status dot per panel). On hover the panel reveals a
 * short "why it matters" line. Real, not pretty.
 */

// === Shared: detect hover-capable pointers ================================
// On touch devices there is no hover, so the "why it matters" line is shown
// inline beneath the panel instead of as a hover overlay.
function useHoverCapable() {
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(mq.matches);
    const on = () => setCanHover(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return canHover;
}

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

// === Shared: bump the signature-line pulse on a panel's first appearance ===
// Each of the 3 panels calls this with its own `inView` flag. On the false→true
// edge it bumps the globalThis-pinned production pulse store; SignatureLine
// (the lazy WebGL island) reads + decays it, lifting the line's emissive above
// the bloom threshold near the production section (BEAT 1). The three panels
// enter the viewport sequentially, so this fires three staggered pulses — the
// line beats once per panel scan. Inert under reduced-motion (the WebGL layer
// is unmounted at tier "off", and we early-return here too so the store is
// never even touched). No DOM copy/layout effect — pure side-effect.
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

// Status colors, reused across panels so the visual language is consistent.
const C_PASS = "hsl(150 60% 52%)";
const C_WARN = "hsl(38 88% 58%)";
const C_DENY = "hsl(0 70% 60%)";

// Shared panel chrome -------------------------------------------------------
function PanelChrome({
  file,
  status,
  statusColor,
  live,
  children,
}: {
  file: string;
  status: string;
  statusColor: string;
  live?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full h-[15.5rem] sm:h-[16.5rem] rounded-lg border border-[hsl(var(--rule))] bg-[hsl(220_24%_7%)] overflow-hidden font-mono text-[11px] leading-[1.5]">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3.5 h-9 border-b border-[hsl(var(--rule)/0.7)] bg-[hsl(220_22%_9%)]">
        <span className="flex items-center gap-2 text-ink-mute">
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              background: statusColor,
              boxShadow: `0 0 6px ${statusColor}`,
              animation: live ? "pulse 1.6s ease-in-out infinite" : "none",
            }}
          />
          <span className="truncate">{file}</span>
        </span>
        <span
          className="text-[10px] tracking-[0.12em] uppercase tabular-nums shrink-0"
          style={{ color: statusColor }}
        >
          {status}
        </span>
      </div>
      {children}
    </div>
  );
}

// Line-number gutter cell.
function Ln({ n }: { n: number }) {
  return (
    <span className="select-none text-ink-mute/40 tabular-nums w-5 text-right shrink-0">
      {n}
    </span>
  );
}

// === 1. evals/agent_v0.4.3.json ===========================================
// A real-looking versioned regression set: named cases with pass counts and a
// status. One case is amber (a known flake under watch) so it reads honest.
type EvalCase = {
  name: string;
  passed: number;
  total: number;
  status: "pass" | "warn";
};
const EVAL_CASES: EvalCase[] = [
  { name: "tool_choice_correct", passed: 38, total: 38, status: "pass" },
  { name: "retrieval_grounded", passed: 27, total: 28, status: "warn" },
  { name: "refusal_on_oos", passed: 12, total: 12, status: "pass" },
  { name: "latency_p95_lt_4s", passed: 9, total: 9, status: "pass" },
];

function EvalPanel() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const { ref, inView } = useInView<HTMLDivElement>();
  useProductionPulseOnEnter(inView);

  return (
    <div ref={ref}>
      <PanelChrome
        file="evals/agent_v0.4.3.json"
        status="94 / 100"
        statusColor="hsl(var(--accent))"
        live={inView}
      >
        <div className="px-3.5 py-2.5 flex flex-col gap-[3px]">
          <div className="flex gap-2">
            <Ln n={1} />
            <span className="text-ink-mute">{"{"}</span>
          </div>
          <div className="flex gap-2">
            <Ln n={2} />
            <span className="pl-3">
              <span className="text-[hsl(var(--accent)/0.95)]">&quot;suite&quot;</span>
              <span className="text-ink-mute">: </span>
              <span className="text-ink/85">&quot;agent_v0.4.3&quot;</span>
              <span className="text-ink-mute">,</span>
            </span>
          </div>
          <div className="flex gap-2">
            <Ln n={3} />
            <span className="pl-3">
              <span className="text-[hsl(var(--accent)/0.95)]">&quot;cases&quot;</span>
              <span className="text-ink-mute">: [</span>
            </span>
          </div>
          {EVAL_CASES.map((c, i) => (
            <div key={c.name} className="flex gap-2 items-center">
              <Ln n={4 + i} />
              <span className="pl-6 flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: c.status === "pass" ? C_PASS : C_WARN,
                    boxShadow: `0 0 5px ${c.status === "pass" ? C_PASS : C_WARN}`,
                  }}
                />
                <span className="text-ink/85 truncate">{c.name}</span>
                <span className="text-ink-mute tabular-nums">
                  {c.passed}/{c.total}
                </span>
              </span>
            </div>
          ))}
          <div className="flex gap-2">
            <Ln n={8} />
            <span className="pl-3 text-ink-mute">]</span>
          </div>
        </div>
        <div className="absolute bottom-2 right-3.5 text-[9px] text-ink-mute uppercase tracking-[0.16em]">
          {isEn ? "weekly regression" : "regressione settimanale"}
        </div>
      </PanelChrome>
    </div>
  );
}

// === 2. trace · request timeline ==========================================
// A per-request span log: name, depth indent, duration. One human-review step
// reads as the in-the-loop checkpoint. The active row pulses while in view.
type Span = { name: string; depth: number; ms: number; kind?: "review" };
const TRACE_SPANS: Span[] = [
  { name: "agent.run", depth: 0, ms: 3410 },
  { name: "retrieve.docs", depth: 1, ms: 740 },
  { name: "rerank", depth: 1, ms: 210 },
  { name: "llm.plan", depth: 1, ms: 980 },
  { name: "tool.search", depth: 2, ms: 320 },
  { name: "tool.write_ticket", depth: 2, ms: 410 },
  { name: "human.review", depth: 1, ms: 0, kind: "review" },
];
const TRACE_MAX = 3410;

function TracePanel() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const { ref, inView } = useInView<HTMLDivElement>();
  const [active, setActive] = useState(-1);
  useProductionPulseOnEnter(inView);

  // A single quiet sweep: the cursor steps down the spans, then rests. The
  // per-row STEP is gently modulated by the page scroll progress so the sweep
  // tightens as the reader moves down the page (clamped so it never thrashes).
  // Reads the transient scroll store via getState() — no re-render per frame.
  useEffect(() => {
    if (!inView) return;
    // Honor reduced-motion: no scanning rAF loop, rest the panel on its
    // first row so it still reads as a populated trace (invariant 7).
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setActive(-1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const REST = 1600;
    const tick = (now: number) => {
      const progress = useScrollStore.getState().progress;
      const STEP = Math.max(240, 360 * (1 - progress * 0.3));
      const elapsed = now - start;
      const cycle = TRACE_SPANS.length * STEP + REST;
      const e = elapsed % cycle;
      const idx = Math.min(Math.floor(e / STEP), TRACE_SPANS.length - 1);
      setActive(e < TRACE_SPANS.length * STEP ? idx : -1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  return (
    <div ref={ref}>
      <PanelChrome
        file="trace · 7c3a · 3.41s"
        status="200 OK"
        statusColor={C_PASS}
        live={inView}
      >
        <div className="px-3.5 py-2.5 flex flex-col gap-[3px]">
          {TRACE_SPANS.map((s, i) => {
            const isActive = i === active;
            const isReview = s.kind === "review";
            const w = s.ms === 0 ? 6 : Math.max(6, (s.ms / TRACE_MAX) * 100);
            const barColor = isReview ? C_WARN : "hsl(var(--accent)/0.7)";
            return (
              <div
                key={s.name}
                className="flex items-center gap-2 h-[18px]"
                style={{
                  opacity: active === -1 || isActive ? 1 : 0.5,
                  transition: "opacity 220ms",
                }}
              >
                <span
                  className="text-ink/85 whitespace-nowrap tabular-nums"
                  style={{
                    paddingLeft: `${s.depth * 12}px`,
                    color: isActive ? "hsl(var(--ink))" : undefined,
                  }}
                >
                  {s.depth > 0 ? "└ " : ""}
                  {s.name}
                </span>
                <span className="flex-1 min-w-0 relative h-[5px]">
                  <span
                    className="absolute top-1/2 -translate-y-1/2 left-0 h-[5px] rounded-full"
                    style={{
                      width: `${w}%`,
                      background: barColor,
                      boxShadow: isActive ? `0 0 6px ${barColor}` : "none",
                      transition: "box-shadow 220ms",
                    }}
                  />
                </span>
                <span className="text-ink-mute tabular-nums w-12 text-right shrink-0">
                  {isReview ? (isEn ? "review" : "revis.") : `${s.ms}ms`}
                </span>
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-2 right-3.5 text-[9px] text-ink-mute uppercase tracking-[0.16em]">
          {isEn ? "per-request trace" : "trace per richiesta"}
        </div>
      </PanelChrome>
    </div>
  );
}

// === 3. permissions.yaml ===================================================
// A scoped capability file: each tool is allow / review / deny. The deny line
// is the load-bearing one — the system refuses an action by default.
type Perm = { key: string; value: string; kind: "allow" | "review" | "deny" };
const PERMS: Perm[] = [
  { key: "tickets.read", value: "own_team", kind: "allow" },
  { key: "tickets.comment", value: "draft_only", kind: "review" },
  { key: "docs.read", value: "public", kind: "allow" },
  { key: "external.api", value: "denied", kind: "deny" },
];
const PERM_COLOR: Record<Perm["kind"], { fg: string; bg: string; bd: string }> = {
  allow: { fg: C_PASS, bg: "hsl(150 60% 52% / 0.12)", bd: "hsl(150 60% 52% / 0.3)" },
  review: { fg: C_WARN, bg: "hsl(38 88% 58% / 0.12)", bd: "hsl(38 88% 58% / 0.3)" },
  deny: { fg: C_DENY, bg: "hsl(0 70% 60% / 0.12)", bd: "hsl(0 70% 60% / 0.3)" },
};
const PERM_TAG: Record<Perm["kind"], { en: string; it: string }> = {
  allow: { en: "allow", it: "consenti" },
  review: { en: "review", it: "revisione" },
  deny: { en: "deny", it: "nega" },
};

function PermissionsPanel() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const { ref, inView } = useInView<HTMLDivElement>();
  useProductionPulseOnEnter(inView);

  return (
    <div ref={ref}>
      <PanelChrome
        file="permissions.yaml"
        status={isEn ? "scoped" : "definito"}
        statusColor="hsl(var(--accent))"
        live={inView}
      >
        <div className="px-3.5 py-2.5 flex flex-col gap-[3px]">
          <div className="flex gap-2">
            <Ln n={1} />
            <span>
              <span className="text-[hsl(var(--accent)/0.95)]">role</span>
              <span className="text-ink-mute">: </span>
              <span className="text-ink/85">ops_assistant</span>
            </span>
          </div>
          <div className="flex gap-2">
            <Ln n={2} />
            <span>
              <span className="text-[hsl(var(--accent)/0.95)]">tools</span>
              <span className="text-ink-mute">:</span>
            </span>
          </div>
          {PERMS.map((p, i) => (
            <div key={p.key} className="flex gap-2 items-center">
              <Ln n={3 + i} />
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-ink-mute">-</span>
                <span className="text-ink/85 truncate">{p.key}</span>
                <span className="text-ink-mute">:</span>
                <span
                  className="inline-flex items-center gap-1.5 px-1.5 rounded-[3px] text-[9px] tracking-[0.1em] uppercase shrink-0"
                  style={{
                    color: PERM_COLOR[p.kind].fg,
                    background: PERM_COLOR[p.kind].bg,
                    border: `1px solid ${PERM_COLOR[p.kind].bd}`,
                  }}
                >
                  {isEn ? PERM_TAG[p.kind].en : PERM_TAG[p.kind].it}
                </span>
                <span className="text-ink-mute truncate hidden sm:inline">
                  {p.value}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className="absolute bottom-2 right-3.5 text-[9px] text-ink-mute uppercase tracking-[0.16em]">
          {isEn ? "per-agent scope" : "scope per agente"}
        </div>
      </PanelChrome>
    </div>
  );
}

// === Section ==============================================================
type Artifact = {
  visual: React.ReactNode;
  claim: string;
  why: string;
};

function getArtifacts(isEn: boolean): Artifact[] {
  return [
    {
      visual: <EvalPanel />,
      claim: isEn
        ? "Every system ships with a regression set."
        : "Ogni sistema viene rilasciato con un set di regressione.",
      why: isEn
        ? "Versioned cases and day-zero baselines mean you can prove the system still works after every change, instead of hoping."
        : "Casi versionati e baseline al day-zero ti permettono di dimostrare che il sistema funziona ancora dopo ogni modifica, invece di sperarlo.",
    },
    {
      visual: <TracePanel />,
      claim: isEn
        ? "Traceable from input to action."
        : "Tracciabile dall'input all'azione.",
      why: isEn
        ? "When something breaks at 3am, the answer is in the trace: retrieval, plan, tool call, human review. Not in Slack archaeology."
        : "Quando qualcosa si rompe alle 3 di notte, la risposta è nel trace: retrieval, plan, chiamata a tool, revisione umana. Non in un'archeologia su Slack.",
    },
    {
      visual: <PermissionsPanel />,
      claim: isEn
        ? "Boundaries before features."
        : "I confini prima delle feature.",
      why: isEn
        ? "Data access and agent tools are scoped before the first feature ships. The default answer to an unscoped action is no."
        : "L'accesso ai dati e i tool degli agenti vengono definiti prima della prima feature. La risposta di default a un'azione non prevista è no.",
    },
  ];
}

function ArtifactCard({ a }: { a: Artifact }) {
  const canHover = useHoverCapable();
  return (
    <article className="group relative flex flex-col gap-5">
      {a.visual}
      {canHover ? (
        // Hover-capable: claim and why occupy the SAME reserved box and
        // crossfade in place on hover. The box is tall enough for the longest
        // why text (EN/IT) at the narrowest card width, so nothing clips,
        // overflows, or shifts layout.
        <div className="relative min-h-[8rem] sm:min-h-[8.5rem]">
          <h3
            className="absolute inset-0 text-base sm:text-lg font-medium text-ink leading-snug opacity-100 transition-opacity duration-300 group-hover:opacity-0"
            style={{ transitionTimingFunction: "var(--ease-entrance)" }}
          >
            {a.claim}
          </h3>
          <p
            aria-hidden="true"
            className="absolute inset-0 text-[13px] text-ink-mute leading-relaxed opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ transitionTimingFunction: "var(--ease-entrance)" }}
          >
            {a.why}
          </p>
        </div>
      ) : (
        // Touch devices: show claim + "why it matters" stacked inline.
        <div>
          <h3 className="text-base sm:text-lg font-medium text-ink leading-snug">
            {a.claim}
          </h3>
          <p className="mt-3 text-[13px] text-ink-mute leading-relaxed">
            {a.why}
          </p>
        </div>
      )}
    </article>
  );
}

export default function ProductionGradeSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const artifacts = getArtifacts(isEn);
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-7">
          {artifacts.map((a, i) => (
            <Reveal key={i} delay={i * 90}>
              <ArtifactCard a={a} />
            </Reveal>
          ))}
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
