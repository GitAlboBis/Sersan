"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { useLanguage } from "@/components/language-provider";
import { caseStudies } from "@/data/case-studies";
import {
  WorkGrid,
  featuredStudies,
  usePlanesLive,
} from "@/components/work/work-card";

/**
 * FeaturedWork — the home Work section on the Lusion work-grid grammar
 * (ANALISI_LUSION_WORK.md §2; replaces the sticky horizontal rail,
 * work-section refactor 2026-08-20). The card/grid implementation is the
 * SHARED module components/work/work-card.tsx — the /case-studies archive
 * renders the same grammar over the full population, exactly as lusion.co's
 * home "Featured Work" and /projects share one `.project-item`. This file
 * only keeps the home-specific frame: SectionHeading + the archive link +
 * the featured selection.
 *
 * WebGL: FeaturedWorkPlanes (Scene.tsx, home + archive routes) syncs
 * depth-parallax planes to the grid's [data-featured-media] rects;
 * usePlanesLive mirrors ownership per card.
 */
/**
 * Italian labels for the `industry` union in src/data/case-studies.ts.
 * Keyed by the union itself, so adding a sector to the data is a type error
 * here until it is translated — which is the point: the hand-written sector
 * list this replaced had silently omitted Real Estate, the one sector whose
 * only entry (Domus Tua) is the flagship proof point for the new market, and
 * whose card renders inside this very section.
 */
const INDUSTRY_IT: Record<(typeof caseStudies)[number]["industry"], string> = {
  FinTech: "FinTech",
  Healthcare: "Healthcare",
  Aerospace: "Aerospace",
  "Public Sector": "Settore Pubblico",
  Industrial: "Industriale",
  Energy: "Energia",
  Agritech: "Agritech",
  "Real Estate": "Real Estate",
};

/** Distinct sectors, in first-appearance order, joined as "a, b and c". */
function sectorList(isEn: boolean): string {
  const seen = [...new Set(caseStudies.map((c) => c.industry))];
  const labels = seen.map((i) => (isEn ? i : INDUSTRY_IT[i]));
  if (labels.length < 2) return labels.join("");
  return `${labels.slice(0, -1).join(", ")}${isEn ? " and " : " e "}${labels[labels.length - 1]}`;
}

export default function FeaturedWork() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const planesLive = usePlanesLive();

  return (
    <section
      id="work"
      className="section relative"
      aria-label={isEn ? "Selected work" : "Lavori selezionati"}
    >
      {/* TASK 6 — zero-height content-edge markers for the section-cut
          driver (SectionBus measures them; no copy, no layout). */}
      <div data-cut-edge="top" aria-hidden="true" />
      <div className="container-px mb-14 flex flex-col gap-4 sm:flex-row sm:gap-6 sm:items-end sm:justify-between">
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
              ? `${caseStudies.length} projects across ${sectorList(true)}. SerSan builds and prior senior delivery, each one labelled for what it is.`
              : `${caseStudies.length} progetti tra ${sectorList(false)}. Build di SerSan e precedenti consegne senior, ognuno etichettato per quello che è.`
          }
        />
        <Link
          href="/case-studies"
          className="group inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-mono text-[11px] tracking-[0.16em] uppercase text-ink-mute transition-colors hover:text-ink"
        >
          {isEn ? "Full archive" : "Archivio completo"}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <div className="container-px">
        <WorkGrid studies={featuredStudies()} isEn={isEn} planesLive={planesLive} />
      </div>
      <div data-cut-edge="bottom" aria-hidden="true" />
    </section>
  );
}
