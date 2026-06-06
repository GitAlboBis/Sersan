"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { useLanguage } from "@/components/language-provider";

/**
 * ConsultingCTA — closing call-to-action card with twin brass corner glows.
 * Primary CTA goes to /contact via the `hero` button variant.
 */
export default function ConsultingCTA() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <section className="section-lg relative overflow-hidden">
      <div className="container-px relative z-10">
        <RevealOnScroll delay={0}>
          <div className="relative max-w-3xl mx-auto bg-surface-elev border border-[hsl(var(--rule)/0.4)] rounded-2xl px-6 sm:px-12 py-14 sm:py-16 text-center overflow-hidden">
            {/* Twin corner glows */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] opacity-60 blur-3xl"
              style={{
                background:
                  "radial-gradient(closest-side, hsl(var(--accent) / 0.18), transparent 70%)",
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-32 -left-24 w-[360px] h-[360px] opacity-40 blur-3xl"
              style={{
                background:
                  "radial-gradient(closest-side, hsl(var(--accent) / 0.12), transparent 70%)",
              }}
            />

            <div className="relative z-10">
              <p className="eyebrow mb-6">
                {isEn ? "The next step" : "Il prossimo passo"}
              </p>
              <h2 className="font-display text-3xl sm:text-[2.5rem] text-ink leading-[1.12] tracking-tight text-balance mb-8">
                {isEn ? (
                  <>
                    Curious what we&apos;d{" "}
                    <span className="italic text-accent">find?</span>
                  </>
                ) : (
                  <>
                    Vi interessa scoprire{" "}
                    <span className="italic text-accent">
                      cosa troveremmo?
                    </span>
                  </>
                )}
              </h2>
              <p className="text-lg sm:text-xl text-ink-mute mb-12 max-w-xl mx-auto leading-[1.55]">
                {isEn
                  ? "Start with a free scoping call. If you commission the full audit, the deliverable is yours to keep, whether you hire us or not."
                  : "Iniziate con una scoping call gratuita. Se commissionate l'audit completo, il deliverable è vostro, che decidiate di ingaggiarci o meno."}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button variant="hero" size="xl" asChild>
                  <Link href="/contact">
                    {isEn ? "Book a scoping call" : "Prenota una scoping call"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <a
                  href="mailto:alex.s@sersan.dev"
                  className="text-sm text-ink-mute hover:text-accent transition-colors"
                >
                  {isEn ? "Or email " : "Oppure scriveteci a "}
                  <span className="underline decoration-dotted underline-offset-4">
                    alex.s@sersan.dev
                  </span>
                </a>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
