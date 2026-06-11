"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";

/**
 * FixedScopeStrip — the one-line distillation of the four-phase delivery
 * map that used to live on the homepage (ProcessSection, now rendered on
 * /consulting under "How we engage" — PIANO_RESTYLE.md §3).
 *
 * Keeps `id="process"` so existing /#process links (footer, /start,
 * service detail pages) still resolve; the link hands off to the full
 * process map at /consulting#process. Copy is the guarantee-strip line
 * moved verbatim from ProcessSection.
 */
export default function FixedScopeStrip() {
  const { language } = useLanguage();
  const isEn = language === "en";

  return (
    <section id="process" className="relative section scroll-mt-24">
      <div className="container-px">
        <Reveal>
          <div
            className="
              flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6
              rounded-[var(--radius-lg)] border border-[hsl(var(--accent)/0.3)]
              bg-[hsl(var(--accent)/0.05)] px-5 py-4
            "
          >
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[hsl(var(--accent))] shrink-0">
              {isEn ? "Fixed scope" : "Perimetro fisso"}
            </span>
            <p className="text-[13.5px] text-ink leading-relaxed flex-1">
              {isEn
                ? "Scope and price are agreed before work starts. No open-ended retainers, no hours billed against a moving target, no creep."
                : "Perimetro e prezzo concordati prima di iniziare. Nessun retainer a tempo indeterminato, nessuna ora fatturata su un obiettivo mobile, nessuna dilatazione."}
            </p>
            <Link
              href="/consulting#process"
              className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors shrink-0"
            >
              {isEn ? "How an engagement runs" : "Come si svolge un ingaggio"}
              <ArrowRight
                className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
