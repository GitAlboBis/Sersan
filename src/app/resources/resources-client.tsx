"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { resources } from "@/data/resources";
import { useLanguage } from "@/components/language-provider";
import { Reveal } from "@/components/ui/reveal";

export function ResourcesClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const categoryLabel: Record<string, string> = isEn
    ? {
        article: "Article",
        guide: "Guide",
        "case-study": "Case study",
        whitepaper: "Whitepaper",
      }
    : {
        article: "Articolo",
        guide: "Guida",
        "case-study": "Case study",
        whitepaper: "Whitepaper",
      };

  const dateLocale = isEn ? "en-GB" : "it-IT";

  return (
    <div className="min-h-screen text-foreground relative">
      {/* Hero */}
      <section data-line-anchor="hero" className="pt-24 pb-16 md:pb-24 relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[75vw] h-[36vw] max-w-[1000px] max-h-[560px] blur-3xl opacity-25"
            style={{ background: "radial-gradient(closest-side, hsl(var(--accent) / 0.22), transparent 70%)" }}
          />
        </div>
        <div className="container-px relative z-10">
          <Reveal className="max-w-3xl mx-auto text-center">
            <p className="eyebrow mb-6 inline-flex items-center justify-center gap-2">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--accent))" }}
                aria-hidden="true"
              />
              {isEn ? "Field notes" : "Appunti dal campo"}
            </p>
            <h1 className="font-display text-[clamp(2.25rem,7vw,4.5rem)] leading-[1.15] tracking-[-0.025em] text-ink text-balance mb-8 pb-1">
              {isEn ? (
                <>
                  What we&apos;ve learned{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    shipping.
                  </span>
                </>
              ) : (
                <>
                  Cosa abbiamo imparato{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    portando in produzione.
                  </span>
                </>
              )}
            </h1>
            <p className="text-lg md:text-xl text-ink-mute max-w-xl mx-auto leading-[1.5]">
              {isEn
                ? "No frameworks-of-frameworks. Just what worked, what failed, and why."
                : "Niente framework di framework. Solo cosa ha funzionato, cosa è andato male e perché."}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Articles list */}
      <section data-line-anchor="list" className="pb-24">
        <div className="container-px">
          <div className="max-w-4xl mx-auto space-y-5">
            {resources.map((r, i) => (
              <Reveal key={r.slug} delay={Math.min(i, 4) * 70}>
              <Link
                href={`/resources/${r.slug}`}
                className="card-steel group block p-7"
              >
                <div className="flex items-center gap-3 mb-3 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute">
                  <span style={{ color: "hsl(var(--accent))" }}>{categoryLabel[r.category]}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {new Date(r.publishedAt).toLocaleDateString(dateLocale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {r.readMinutes} min
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-[1.75rem] text-ink mb-3 leading-tight group-hover:text-[hsl(var(--accent))] transition-colors">
                  {isEn ? r.title : r.titleIt}
                </h2>
                <p className="text-sm sm:text-base text-ink-mute leading-[1.55] mb-4">
                  {isEn ? r.excerpt : r.excerptIt}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute">
                    {r.authorName} &middot; {isEn ? r.authorRole : r.authorRoleIt}
                  </p>
                  <ArrowRight className="w-4 h-4 text-ink-mute group-hover:text-[hsl(var(--accent))] group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Ritual gap — transparent negative space so the persistent canvas
          (z-0) shows through; the route's 3D ritual object world-anchors
          here and the signature line threads it before the CTA. */}
      <div data-line-anchor="ritual" aria-hidden="true" className="py-28 sm:py-40" />

      {/* Closing anchor — gives the signature line a tail waypoint (P5b).
          Zero-content block div, no layout/copy impact. */}
      <div data-line-anchor="final-cta" aria-hidden="true" />
    </div>
  );
}
