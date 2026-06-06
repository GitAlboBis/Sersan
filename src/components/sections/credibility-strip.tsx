"use client";

import {
  BRAND_WORDMARKS,
  type BrandName,
} from "@/components/trust-wordmarks";
import { useLanguage } from "@/components/language-provider";

/**
 * CredibilityStrip — calm row of tier-1 institutions where the SerSan team
 * trained. Single line, no stats noise. The work proves itself elsewhere.
 */

const LOGOS: BrandName[] = [
  "Revolut",
  "JPMorgan",
  "Deloitte",
  "Brevan Howard",
  "Accenture",
];

export default function CredibilityStrip() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <section
      id="credibility"
      aria-label={
        isEn
          ? "Trust band: audience and tier-1 institutions"
          : "Fascia di fiducia: pubblico e istituzioni di primo livello"
      }
      className="relative border-y border-[hsl(var(--rule))] bg-[hsl(var(--bg))]"
    >
      <div className="container-px py-7 sm:py-9 flex flex-col gap-5 sm:gap-6">
        {/* Audience trust band — names the buyer types in a single
            scannable line. Sits above the marquee so visitors see who
            this is for before they see where the team trained. */}
        <p className="text-center sm:text-left text-[11px] sm:text-[12px] font-mono uppercase tracking-[0.18em] text-ink-mute">
          <span className="text-ink/80">{isEn ? "Built for" : "Pensato per"}</span>{" "}
          <span className="text-ink">SaaS</span>
          <span aria-hidden="true" className="text-ink-mute/40">{" · "}</span>
          <span className="text-ink">fintech</span>
          <span aria-hidden="true" className="text-ink-mute/40">{" · "}</span>
          <span className="text-ink">{isEn ? "regulated teams" : "team regolamentati"}</span>
          <span aria-hidden="true" className="text-ink-mute/40">{" · "}</span>
          <span className="text-ink">{isEn ? "technical founders" : "founder tecnici"}</span>
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-10">
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.16em] text-ink-mute shrink-0">
            {isEn ? "Where our team trained" : "Dove si è formato il nostro team"}
          </span>

          <div className="relative flex-1 overflow-hidden marquee-mask">
            <div className="marquee-track">
              {[...LOGOS, ...LOGOS].map((name, i) => {
                const Wordmark = BRAND_WORDMARKS[name];
                return (
                  <span
                    key={`${name}-${i}`}
                    className="inline-flex items-center gap-x-14 shrink-0"
                    aria-hidden={i >= LOGOS.length}
                    aria-label={i < LOGOS.length ? name : undefined}
                  >
                    <span className="text-ink/80 inline-flex items-baseline">
                      <Wordmark />
                    </span>
                    <span
                      aria-hidden="true"
                      className="inline-block h-px w-5 bg-[hsl(var(--rule))]"
                    />
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .marquee-mask {
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%);
                  mask-image: linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%);
        }
      `}</style>
    </section>
  );
}
