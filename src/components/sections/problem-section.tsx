"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, GitBranch, ShieldOff } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
import { useScrollParallax } from "@/components/ui/use-scroll-parallax";

/**
 * ProblemSection — names the pain (demo-to-production gap).
 *
 * Split layout, conforming to the shared section grammar:
 *   - Left: eyebrow + editorial headline + paragraph (SectionHeading).
 *   - Right: a dark "incident console" panel listing the three failure
 *     modes as operational incident rows.
 *
 * The console reads as a real monitoring surface: a header bar with a
 * status line, then three rows (No evals → no signal / No traces → no
 * debugging / No boundaries → no trust). Warning accents (amber/red) are
 * used sparingly on the severity dots and cause→effect arrow only —
 * brand blue stays dominant on the active/structural chrome so the
 * section still belongs to the page's one system.
 *
 * Three failure modes, deliberately framed as engineering problems rather
 * than business problems — because the buyer is technical and "we can't
 * tell why our agent is failing" lands harder than "AI ROI is unclear".
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

// === Incident console ======================================================
// A real-monitoring-surface card: the cursor scans down the incident rows
// over ~4s then rests, the active row's severity dot pulses, and a faint
// radar sweep loops across the card. ONE shared rAF, IntersectionObserver-
// gated so it never burns frames off-screen. Pure ref/style updates — the
// DOM structure and all copy are unchanged.
const SCAN_STEP_MS = 900; // ~0.9s per row → ~2.7s sweep over 3 rows
const SCAN_REST_MS = 1300; // then rest before looping (≈4s total cycle)

function IncidentConsole({
  failures,
  isEn,
}: {
  failures: Failure[];
  isEn: boolean;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  // Parallax lives on a wrapper (separate from the tilt-owned .card-steel
  // root): a tiny scroll-linked Y drift that never touches the card's
  // rotationX/Y/scale transform.
  const parallaxRef = useScrollParallax<HTMLDivElement>(5);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let start = 0;
    let running = false;
    const rows = failures.length;
    const cycle = rows * SCAN_STEP_MS + SCAN_REST_MS;

    const tick = (now: number) => {
      if (!start) start = now;
      const e = (now - start) % cycle;
      const idx =
        e < rows * SCAN_STEP_MS
          ? Math.min(Math.floor(e / SCAN_STEP_MS), rows - 1)
          : -1;
      setActive((prev) => (prev === idx ? prev : idx));
      raf = requestAnimationFrame(tick);
    };

    // Gate the loop with an IntersectionObserver: only run while on-screen.
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          start = 0;
          raf = requestAnimationFrame(tick);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
          setActive(-1);
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);

    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [failures.length]);

  return (
    <div ref={parallaxRef}>
    <div ref={cardRef} className="card-steel relative overflow-hidden">
      {/* Radar sweep — a faint conic light that rotates across the card,
          masked to the card bounds. Decorative, low-opacity, ~7s loop.
          Removed entirely under reduced-motion (see globals motion-reduce). */}
      <span
        aria-hidden="true"
        className="incident-radar pointer-events-none absolute inset-0 -z-0"
      />
      {/* Console header bar */}
      <div className="relative flex items-center justify-between gap-3 border-b border-[hsl(var(--rule))] px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[hsl(0_72%_56%/0.85)]" />
            <span className="w-2 h-2 rounded-full bg-[hsl(36_84%_56%/0.85)]" />
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--accent)/0.85)]" />
          </span>
          <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-mute">
            {isEn ? "incident console" : "console incidenti"}
          </span>
        </div>
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[hsl(36_70%_62%)]">
          {isEn ? "3 unresolved" : "3 non risolti"}
        </span>
      </div>

      {/* Incident rows */}
      <ul className="relative divide-y divide-[hsl(var(--rule))]">
        {failures.map((f, i) => {
          const Icon = f.Icon;
          const toneVar = f.tone === "critical" ? "0 72% 56%" : "36 84% 56%";
          const isActive = i === active;
          return (
            <li
              key={f.num}
              className="group/row relative px-5 py-4 transition-colors duration-300 hover:bg-[hsl(var(--accent)/0.04)]"
              style={{
                background: isActive ? "hsl(var(--accent)/0.05)" : undefined,
              }}
            >
              {/* Left severity edge */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-px"
                style={{ background: `hsl(${toneVar} / 0.45)` }}
              />
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[hsl(var(--rule))] bg-[hsl(var(--bg)/0.6)] text-ink-mute transition-colors duration-300 group-hover/row:text-[hsl(var(--accent))] group-hover/row:border-[hsl(var(--accent)/0.4)]"
                >
                  <Icon
                    className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover/row:scale-110 group-hover/row:rotate-[8deg] motion-reduce:transform-none motion-reduce:transition-none"
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
                      style={{
                        background: `hsl(${toneVar})`,
                        boxShadow: isActive
                          ? `0 0 7px hsl(${toneVar})`
                          : "none",
                        transform: isActive ? "scale(1.35)" : "scale(1)",
                        transition:
                          "transform 220ms ease-out, box-shadow 220ms ease-out",
                      }}
                    />
                  </div>

                  <h3 className="mt-1.5 font-mono text-[15px] sm:text-base leading-snug text-ink">
                    <span>{f.cause}</span>{" "}
                    <span aria-hidden="true" style={{ color: `hsl(${toneVar})` }}>
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

      <style>{`
        .incident-radar {
          background: conic-gradient(
            from 0deg at 70% 30%,
            transparent 0deg,
            hsl(var(--accent) / 0.12) 24deg,
            transparent 70deg,
            transparent 360deg
          );
          opacity: 0.5;
          animation: incident-radar-spin 7s linear infinite;
          mix-blend-mode: screen;
        }
        @keyframes incident-radar-spin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .incident-radar { display: none; }
        }
      `}</style>
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

          {/* Right — incident console */}
          <Reveal delay={120}>
            <IncidentConsole failures={failures} isEn={isEn} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
