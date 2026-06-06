"use client";

import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Workflow,
  Activity,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";

/**
 * ServicesSection — "What SerSan builds".
 *
 * Four services, two-by-two grid. Each card is engineered to feel
 * purchasable, not consultative — meaning every card has:
 *   - a number + title
 *   - a one-line positioning claim
 *   - "typical build includes" bullets (concrete deliverables)
 *   - the buyer pain it solves
 *   - a CTA link out
 *
 * The CTA hrefs point at the work section + future service detail pages
 * (which are out of scope this pass — they resolve cleanly to the homepage
 * anchor until those pages exist).
 */

type Service = {
  num: string;
  icon: LucideIcon;
  title: string;
  positioning: string;
  includes: string[];
  solves: string;
  ctaLabel: string;
  ctaHref: string;
};

function getServices(isEn: boolean): Service[] {
  return [
    {
      num: "01",
      icon: Boxes,
      title: isEn
        ? "AI-Native Software Development"
        : "Sviluppo software AI-native",
      positioning: isEn
        ? "Production software, AI wired in, not bolted on."
        : "Software in produzione, con l'AI integrata nel codice, non incollata sopra.",
      includes: isEn
        ? [
            "Full-stack product engineering",
            "Typed AI integration modules",
            "Eval harness running in CI",
            "Tracing from click to model to action",
          ]
        : [
            "Ingegneria di prodotto full-stack",
            "Moduli di integrazione AI tipizzati",
            "Eval harness eseguita in CI",
            "Tracing dal click al modello all'azione",
          ],
      solves: isEn
        ? "AI bolted onto fragile codebases."
        : "AI incollata su codebase fragili.",
      ctaLabel: isEn ? "Engineering" : "Ingegneria",
      ctaHref: "/services/engineering",
    },
    {
      num: "02",
      icon: Workflow,
      title: isEn ? "Workflow Automation" : "Automazione dei flussi di lavoro",
      positioning: isEn
        ? "Automation that compounds, not breaks."
        : "Automazione che si consolida, non che si rompe.",
      includes: isEn
        ? [
            "LLM workflows wired into existing systems",
            "Human-in-the-loop where it matters",
            "Retry, rollback, dead-letter paths",
            "Cost-per-run instrumentation",
          ]
        : [
            "Flussi LLM integrati nei sistemi esistenti",
            "Human-in-the-loop dove conta",
            "Percorsi di retry, rollback, dead-letter",
            "Strumentazione del costo per esecuzione",
          ],
      solves: isEn
        ? "Zapier-stack fragility no-one trusts."
        : "Fragilità degli stack tipo Zapier di cui nessuno si fida.",
      ctaLabel: isEn ? "Automation" : "Automazione",
      ctaHref: "/services/automation",
    },
    {
      num: "03",
      icon: Activity,
      title: isEn ? "MLOps & Evaluation" : "MLOps e valutazione",
      positioning: isEn
        ? "Models in production, not in notebooks."
        : "Modelli in produzione, non nei notebook.",
      includes: isEn
        ? [
            "Evaluation suite: regression, drift, safety",
            "Deployment pipeline and model registry",
            "Monitoring: latency, cost, accuracy",
            "Shadow, canary, rollback paths",
          ]
        : [
            "Suite di valutazione: regressione, drift, sicurezza",
            "Pipeline di deployment e model registry",
            "Monitoraggio: latenza, costo, accuratezza",
            "Percorsi shadow, canary, rollback",
          ],
      solves: isEn
        ? "Models that ship once and rot."
        : "Modelli che vanno in produzione una volta e poi si degradano.",
      ctaLabel: isEn ? "MLOps" : "MLOps",
      ctaHref: "/services/mlops",
    },
    {
      num: "04",
      icon: ScanSearch,
      title: isEn ? "AI Architecture & Audits" : "Architettura e audit AI",
      positioning: isEn
        ? "Find what should not be built, before code becomes debt."
        : "Capire cosa non andrebbe costruito, prima che il codice diventi debito.",
      includes: isEn
        ? [
            "Systems audit: architecture, data, risk",
            "Build vs. buy vs. don't-build call",
            "Reference architecture and sequencing",
            "Risk register: technical and regulatory",
          ]
        : [
            "Audit dei sistemi: architettura, dati, rischio",
            "Decisione costruire, acquistare o non costruire",
            "Architettura di riferimento e sequenziamento",
            "Registro dei rischi: tecnici e normativi",
          ],
      solves: isEn
        ? "Pilots that ate two quarters."
        : "Progetti pilota che hanno divorato due trimestri.",
      ctaLabel: isEn ? "Architecture & Audits" : "Architettura e audit",
      ctaHref: "/services/architecture",
    },
  ];
}

function ServiceCard({ service, isEn }: { service: Service; isEn: boolean }) {
  return (
    <article className="card-steel group flex flex-col h-full p-6 sm:p-8 overflow-hidden">
      {/* Top-edge accent line — fades in on hover */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute top-0 left-0 right-0 h-px
          bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.7)] to-transparent
          opacity-0 group-hover:opacity-100
          transition-opacity duration-500
        "
      />
      {/* Soft radial sheen from top-left */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-0
          opacity-0 group-hover:opacity-100
          transition-opacity duration-500
        "
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 0% 0%, hsl(var(--accent) / 0.08) 0%, transparent 60%)",
        }}
      />
      {/* Header — number + technical icon */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute">
          {service.num} {isEn ? "Service" : "Servizio"}
        </span>
        <span
          aria-hidden="true"
          className="grid place-items-center h-9 w-9 rounded-md border border-[hsl(var(--rule))] bg-[hsl(var(--accent)/0.05)] text-ink-mute group-hover:text-[hsl(var(--accent))] group-hover:border-[hsl(var(--accent)/0.4)] transition-colors duration-300"
        >
          <service.icon className="h-4 w-4" strokeWidth={1.5} />
        </span>
      </div>

      <h3 className="font-display text-2xl sm:text-[28px] leading-[1.05] tracking-[-0.025em] text-ink mb-2">
        {service.title}
      </h3>
      <p className="text-[15px] text-ink leading-snug mb-6">
        {service.positioning}
      </p>

      {/* Typical build includes — compact, scannable */}
      <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute mb-3">
        {isEn ? "Typical build includes" : "Un progetto tipico include"}
      </p>
      <ul className="flex flex-col gap-2 mb-7">
        {service.includes.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2.5 text-[13.5px] text-ink-mute leading-snug"
          >
            <span
              aria-hidden="true"
              className="mt-[6px] block w-1 h-1 rounded-full bg-[hsl(var(--accent)/0.8)] shrink-0"
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {/* Solves — highlighted bottom strip */}
      <div className="mt-auto -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 px-6 sm:px-8 py-4 border-t border-[hsl(var(--rule))] bg-[hsl(var(--accent)/0.04)]">
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[hsl(var(--accent))] mb-1">
              {isEn ? "Solves" : "Risolve"}
            </p>
            <p className="text-[13px] text-ink-mute leading-snug">
              {service.solves}
            </p>
          </div>
          <Link
            href={service.ctaHref}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors duration-200 shrink-0 self-center"
          >
            {service.ctaLabel}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function ServicesSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const services = getServices(isEn);

  return (
    <section
      id="services"
      className="section-accent-tint section-accent-tint--strong relative section-lg scroll-mt-24 overflow-hidden"
    >
      <SectionGlow position="top-left" intensity={1.1} size="55rem" />
      <SectionGlow position="bottom-right" intensity={1} size="55rem" />
      <div className="container-px relative">
        <SectionHeading
          eyebrow={isEn ? "What SerSan builds" : "Cosa costruisce SerSan"}
          title={
            isEn ? (
              <>
                Four services.{" "}
                <span className="font-display italic text-ink">One discipline.</span>
              </>
            ) : (
              <>
                Quattro servizi.{" "}
                <span className="font-display italic text-ink">Una sola disciplina.</span>
              </>
            )
          }
          description={
            isEn
              ? "Every engagement is delivered by senior engineers from scoping to handover. No account layer, no junior bench, no roadmap that quietly becomes a multi-year retainer."
              : "Ogni ingaggio è seguito da ingegneri senior, dallo scoping al passaggio di consegne. Nessun livello di account management, nessuna panchina di junior, nessuna roadmap che si trasforma silenziosamente in un retainer pluriennale."
          }
          className="mb-12 sm:mb-16 max-w-3xl"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {services.map((s, i) => (
            <Reveal key={s.num} delay={i * 80}>
              <ServiceCard service={s} isEn={isEn} />
            </Reveal>
          ))}
        </div>

        {/* Section-end CTA — not every visitor will scroll all four
            services before deciding. Surface a soft escape hatch toward
            the scoping call here. */}
        <div className="mt-12 sm:mt-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <p className="max-w-xl text-[14px] text-ink-mute leading-relaxed">
            {isEn
              ? "Not sure which one fits? The scoping call diagnoses the problem first, then names the engagement."
              : "Non sai quale sia quello giusto? La call di scoping prima diagnostica il problema, poi definisce l'ingaggio."}
          </p>
          <Link
            href="/start"
            className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors shrink-0"
          >
            {isEn ? "Map your system risk" : "Mappa i rischi del tuo sistema"}
            <ArrowRight
              className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
