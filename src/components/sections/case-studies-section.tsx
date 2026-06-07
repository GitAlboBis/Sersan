"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { CountUp } from "@/components/ui/count-up";
import { SectionGlow } from "@/components/ui/section-glow";
import { caseStudies, type CaseStudy } from "@/data/case-studies";
import { useLanguage } from "@/components/language-provider";

/**
 * CaseStudiesSection — selected work, engineering-portfolio feel.
 *
 * Tier 1: three large SerSan-led build cards (SphereNode, Quantex.live,
 *   Terra Noa) — sector, Live/In-production status, one-sentence outcome,
 *   2-3 hard metrics, tech-stack chips, live link.
 * Tier 2: compact senior-delivery archive (the remaining engagements),
 *   filterable by sector.
 *
 * Conforms to the shared section grammar: card-steel everywhere, hairline
 * rules, --accent used sparingly (status / active filter / one metric),
 * Geist type, container-px, fade-up reveals.
 */

const FEATURED_IDS = ["spherenode", "quantex", "terra-noa"] as const;

/** Live status per featured build (EN / IT), with a green/blue dot intent. */
const FEATURED_STATUS: Record<
  (typeof FEATURED_IDS)[number],
  { en: string; it: string; live: boolean }
> = {
  spherenode: { en: "Live", it: "Live", live: true },
  quantex: { en: "Live", it: "Live", live: true },
  "terra-noa": { en: "In production", it: "In produzione", live: false },
};

function getFeatured(): CaseStudy[] {
  return FEATURED_IDS.map((id) => caseStudies.find((c) => c.id === id)!);
}

function getRest(): CaseStudy[] {
  const featured = new Set<string>(FEATURED_IDS);
  return caseStudies.filter((c) => !featured.has(c.id));
}

const INDUSTRY_COLOR: Record<CaseStudy["industry"], string> = {
  FinTech: "text-[hsl(var(--accent))]",
  Healthcare: "text-[hsl(160_60%_60%)]",
  Aerospace: "text-[hsl(260_60%_70%)]",
  "Public Sector": "text-[hsl(200_30%_70%)]",
  Industrial: "text-[hsl(30_70%_65%)]",
  Energy: "text-[hsl(140_50%_60%)]",
  Agritech: "text-[hsl(100_45%_60%)]",
};

function StatusPill({
  label,
  live,
}: {
  label: string;
  live: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-ink-mute border border-[hsl(var(--rule))] rounded px-2 py-0.5">
      <span
        aria-hidden="true"
        className={`block w-1.5 h-1.5 rounded-full ${
          live
            ? "bg-[hsl(140_60%_55%)] shadow-[0_0_8px_hsl(140_60%_55%/0.7)]"
            : "bg-[hsl(var(--accent))]"
        }`}
      />
      {label}
    </span>
  );
}

function FeaturedCard({ study, isEn }: { study: CaseStudy; isEn: boolean }) {
  const topMetrics = study.metrics.slice(0, 3);
  const role = isEn ? study.role : study.roleIt;
  const summary = isEn ? study.summary : study.summaryIt;
  const status = FEATURED_STATUS[study.id as (typeof FEATURED_IDS)[number]];

  return (
    <article className="card-steel group flex flex-col h-full overflow-hidden">
      {/* Preview image — the actual product */}
      {study.previewImage ? (
        <div className="relative aspect-[16/9] border-b border-[hsl(var(--rule))] overflow-hidden">
          <Image
            src={study.previewImage}
            alt={`${study.client} preview`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity duration-300"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--bg))] via-transparent to-transparent opacity-60"
          />
        </div>
      ) : null}

      <div className="p-7 sm:p-8 flex flex-col gap-5 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`font-mono text-[10px] tracking-[0.16em] uppercase ${INDUSTRY_COLOR[study.industry]}`}
          >
            {study.industry} · {role.split(".")[0]}
          </span>
          {status ? (
            <StatusPill
              label={isEn ? status.en : status.it}
              live={status.live}
            />
          ) : null}
        </div>

        <h3 className="font-display text-[1.5rem] sm:text-[1.7rem] text-ink leading-[1.12]">
          {study.client}
        </h3>

        <p className="text-[14.5px] text-ink-mute leading-relaxed line-clamp-4">
          {summary}
        </p>

        <div className="grid grid-cols-3 gap-3 mt-auto pt-5 border-t border-[hsl(var(--rule))] transition-colors duration-300 group-hover:border-[hsl(var(--accent)/0.35)] motion-reduce:transition-none">
          {topMetrics.map((m, i) => (
            <div key={i} className="flex flex-col gap-1">
              <CountUp
                value={m.value}
                className={`font-display text-[1.1rem] sm:text-[1.25rem] leading-tight tabular-nums ${
                  i === 0 ? "text-[hsl(var(--accent))]" : "text-ink"
                }`}
              />
              <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-ink-mute leading-snug line-clamp-2">
                {isEn ? m.label : m.labelIt}
              </span>
            </div>
          ))}
        </div>

        <ul className="flex flex-wrap gap-1.5">
          {study.techStack.slice(0, 6).map((tech) => (
            <li
              key={tech}
              className="font-mono text-[10px] tracking-[0.06em] px-2 py-1 rounded border border-[hsl(var(--rule))] text-ink-mute"
            >
              {tech}
            </li>
          ))}
          {study.techStack.length > 6 ? (
            <li className="font-mono text-[10px] tracking-[0.06em] px-2 py-1 rounded text-ink-mute">
              +{study.techStack.length - 6}
            </li>
          ) : null}
        </ul>

        {study.liveUrl ? (
          <Link
            href={study.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors duration-200"
          >
            {isEn ? "Visit live product" : "Vai al prodotto live"}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function CompactCard({ study, isEn }: { study: CaseStudy; isEn: boolean }) {
  const topMetric = study.metrics[0];
  const engagement = isEn ? study.engagement : study.engagementIt;
  const summary = isEn ? study.summary : study.summaryIt;
  return (
    <Link
      href={`/case-studies/${study.id}`}
      className="card-steel group flex flex-col gap-4 p-5 sm:p-6 h-full"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[hsl(var(--rule))]">
        <span
          className={`font-mono text-[9px] tracking-[0.16em] uppercase ${INDUSTRY_COLOR[study.industry]}`}
        >
          {study.industry}
        </span>
        <ArrowUpRight className="h-3 w-3 text-ink-mute opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>

      <h3 className="font-display text-[1.15rem] sm:text-[1.2rem] text-ink leading-tight">
        {study.client}
      </h3>

      <p className="text-[12px] font-mono text-ink-mute leading-relaxed line-clamp-2">
        {engagement}
      </p>

      <p className="text-[13px] text-ink-mute leading-relaxed line-clamp-3 flex-1">
        {summary}
      </p>

      {topMetric ? (
        <div className="flex flex-col gap-1 pt-3 border-t border-[hsl(var(--rule))]">
          <CountUp
            value={topMetric.value}
            className="font-display text-[1.05rem] leading-tight tabular-nums text-ink"
          />
          <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-ink-mute leading-snug line-clamp-2">
            {isEn ? topMetric.label : topMetric.labelIt}
          </span>
        </div>
      ) : null}

      <ul className="flex flex-wrap gap-1">
        {study.techStack.slice(0, 4).map((tech) => (
          <li
            key={tech}
            className="font-mono text-[9px] tracking-[0.06em] px-1.5 py-0.5 rounded border border-[hsl(var(--rule))] text-ink-mute"
          >
            {tech}
          </li>
        ))}
        {study.techStack.length > 4 ? (
          <li className="font-mono text-[9px] tracking-[0.06em] px-1.5 py-0.5 text-ink-mute">
            +{study.techStack.length - 4}
          </li>
        ) : null}
      </ul>
    </Link>
  );
}

export default function CaseStudiesSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const featured = getFeatured();
  const rest = getRest();

  const [filter, setFilter] = useState<CaseStudy["industry"] | "all">("all");

  // Only offer filters for sectors that actually appear in the archive.
  const archiveSectors = useMemo(() => {
    const seen = new Set<CaseStudy["industry"]>();
    for (const s of rest) seen.add(s.industry);
    return Array.from(seen);
  }, [rest]);

  const visibleRest =
    filter === "all" ? rest : rest.filter((s) => s.industry === filter);

  return (
    <section
      id="work"
      className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
    >
      <SectionGlow position="top-right" intensity={1} size="60rem" />
      <SectionGlow position="bottom-left" intensity={0.9} size="55rem" />
      <div className="container-px relative">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8 sm:mb-10">
          <SectionHeading
            eyebrow={isEn ? "Selected work" : "Lavori selezionati"}
            title={
              isEn ? (
                <>
                  Engineering you can{" "}
                  <span className="font-display italic text-ink">name.</span>
                </>
              ) : (
                <>
                  Ingegneria che puoi{" "}
                  <span className="font-display italic text-ink">nominare.</span>
                </>
              )
            }
            description={
              isEn
                ? `${caseStudies.length} engagements across FinTech, Healthcare, Aerospace, Public Sector, Industrial, Energy, and Agritech. Three SerSan-led builds running live in production. Senior-delivery engagements at tier-1 institutions and operating companies. No anonymised stand-ins.`
                : `${caseStudies.length} ingaggi tra FinTech, Healthcare, Aerospace, Settore Pubblico, Industriale, Energia e Agritech. Tre build guidate da SerSan live in produzione. Ingaggi di delivery senior presso istituzioni Tier-1 e aziende operative. Nessun caso anonimizzato di facciata.`
            }
          />
          <Link
            href="/case-studies"
            className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase text-ink-mute hover:text-ink transition-colors shrink-0 whitespace-nowrap"
          >
            {isEn ? "Full archive" : "Archivio completo"}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Trust label — provenance of the named work. */}
        <p className="mb-12 sm:mb-16 max-w-2xl text-[13px] text-ink-mute leading-relaxed">
          {isEn
            ? "Selected named work includes SerSan-led builds and prior senior-delivery work by the founding team."
            : "I lavori nominati selezionati includono build guidate da SerSan e precedenti lavori di delivery senior del team fondatore."}
        </p>

        {/* Tier 1 — Featured SerSan Builds */}
        <div className="mb-6 flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-mute">
            {isEn ? "SerSan-led builds" : "Build guidate da SerSan"}
          </span>
          <span className="h-px flex-1 bg-[hsl(var(--rule))]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mb-14 sm:mb-16">
          {featured.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 100}>
              <FeaturedCard study={s} isEn={isEn} />
            </Reveal>
          ))}
        </div>

        {/* Tier 2 — Senior delivery archive */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-mute shrink-0">
            {isEn
              ? `Senior delivery · ${rest.length} engagements`
              : `Delivery senior · ${rest.length} ingaggi`}
          </span>
          <span className="hidden sm:block h-px flex-1 bg-[hsl(var(--rule))]" />
          {/* Sector filter — cheap, archive-only. */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              aria-pressed={filter === "all"}
              className={`font-mono text-[10px] tracking-[0.12em] uppercase rounded border px-2.5 py-1 transition-colors duration-200 ${
                filter === "all"
                  ? "border-[hsl(var(--accent)/0.5)] text-[hsl(var(--accent))]"
                  : "border-[hsl(var(--rule))] text-ink-mute hover:text-ink"
              }`}
            >
              {isEn ? "All" : "Tutti"}
            </button>
            {archiveSectors.map((sector) => (
              <button
                key={sector}
                type="button"
                onClick={() => setFilter(sector)}
                aria-pressed={filter === sector}
                className={`font-mono text-[10px] tracking-[0.12em] uppercase rounded border px-2.5 py-1 transition-colors duration-200 ${
                  filter === sector
                    ? "border-[hsl(var(--accent)/0.5)] text-[hsl(var(--accent))]"
                    : "border-[hsl(var(--rule))] text-ink-mute hover:text-ink"
                }`}
              >
                {sector}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {visibleRest.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 60}>
              <CompactCard study={s} isEn={isEn} />
            </Reveal>
          ))}
        </div>

        {/* Section-end CTA — point them at the next step while proof is fresh. */}
        <div className="mt-12 sm:mt-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <p className="max-w-xl text-[14px] text-ink-mute leading-relaxed">
            {isEn ? (
              <>
                See work like yours? Bring the brief. We&apos;ll tell you
                whether to build, harden, or stop.
              </>
            ) : (
              <>
                Vedi un lavoro simile al tuo? Porta il brief. Ti diremo se
                costruire, consolidare o fermarti.
              </>
            )}
          </p>
          <Link
            href="/start"
            className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors shrink-0"
          >
            {isEn ? "Discuss a similar build" : "Parliamo di una build simile"}
            <ArrowUpRight
              className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
