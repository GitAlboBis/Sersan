"use client";

import { Search, FileText, Rocket } from "lucide-react";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { useLanguage } from "@/components/language-provider";

/**
 * HowWeWork — three-step engagement model: Audit → Proposal → Build &
 * handover. Includes HowTo JSON-LD inline because each step is named and
 * priced consistently across the rest of the site.
 */
export default function HowWeWork() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const steps = [
    {
      icon: Search,
      number: "0 1",
      title: isEn ? "Audit" : "Audit",
      desc: isEn
        ? "We go inside your business and find the opportunities. You get a written report."
        : "Entriamo nella vostra azienda e individuiamo le opportunità. Riceverete un report dettagliato.",
      duration: isEn ? "1 week" : "1 settimana",
      isOutcome: false,
    },
    {
      icon: FileText,
      number: "0 2",
      title: isEn ? "Proposal" : "Proposta",
      desc: isEn
        ? "Fixed scope, fixed price or structured retainer. No ambiguity."
        : "Scope definito, prezzo fisso o retainer strutturato. Senza ambiguità.",
      duration: isEn ? "Tailored" : "Su misura",
      isOutcome: false,
    },
    {
      icon: Rocket,
      number: "0 3",
      title: isEn ? "Build & handover" : "Sviluppo e handover",
      desc: isEn
        ? "We build it, document it, and hand it over. You own the code."
        : "Sviluppiamo, documentiamo e consegniamo. La proprietà del codice è vostra.",
      duration: isEn ? "Sprint-based" : "Per sprint",
      isOutcome: true,
    },
  ];

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: isEn
      ? "How Sersan engages with clients"
      : "Come Sersan ingaggia i clienti",
    description: isEn
      ? "Three-step engagement: audit, proposal, build and handover."
      : "Ingaggio in tre step: audit, proposta, sviluppo e handover.",
    totalTime: "P21D",
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.desc,
    })),
  };

  return (
    <section className="section-lg relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <div className="container-px relative z-10">
        <RevealOnScroll delay={0} className="text-center mb-16 sm:mb-20">
          <p
            className="eyebrow mb-5"
            style={{ color: "hsl(var(--accent))" }}
          >
            {isEn ? "Engagement model" : "Modello d'ingaggio"}
          </p>
          <h2 className="heading-2 mb-5 text-balance">
            {isEn ? "Three steps. " : "Tre step. "}
            <span className="italic text-accent">
              {isEn ? "Stated plainly." : "Detti chiaramente."}
            </span>
          </h2>

          <div
            aria-hidden="true"
            className="flex items-center justify-center gap-3 mt-8"
          >
            <span
              className="h-px w-16 sm:w-24"
              style={{ background: "hsl(var(--rule) / 0.7)" }}
            />
            <span
              className="w-1 h-1 rounded-full"
              style={{ background: "hsl(var(--accent))" }}
            />
            <span
              className="h-px w-16 sm:w-24"
              style={{ background: "hsl(var(--rule) / 0.7)" }}
            />
          </div>
        </RevealOnScroll>

        <div className="max-w-4xl mx-auto">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <RevealOnScroll key={step.number} delay={i * 0.1}>
                <div
                  className="group relative py-10 sm:py-14 flex flex-col md:flex-row items-start gap-6 md:gap-12 cursor-default border-t"
                  style={{
                    borderTopColor:
                      i === 0 ? "transparent" : "hsl(var(--rule) / 0.3)",
                  }}
                >
                  <div className="flex items-center gap-5 md:w-60 shrink-0">
                    <span
                      className="font-mono text-[11px] tracking-[0.14em] uppercase pt-1.5"
                      style={{ color: "hsl(var(--accent))" }}
                      aria-hidden="true"
                    >
                      {step.number}
                    </span>

                    <span
                      aria-hidden="true"
                      className="inline-flex items-center justify-center w-11 h-11 rounded-md bg-surface-elev border transition-colors duration-500 group-hover:border-[hsl(var(--accent))]"
                      style={{ borderColor: "hsl(var(--rule) / 0.7)" }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: "hsl(var(--accent))" }}
                      />
                    </span>

                    <div>
                      <h3 className="font-display text-xl sm:text-2xl font-semibold text-ink leading-tight">
                        {step.title}
                      </h3>
                      <span
                        className="text-[10px] font-mono uppercase tracking-[0.14em]"
                        style={{
                          color: step.isOutcome
                            ? "hsl(var(--accent))"
                            : "hsl(var(--ink-mute))",
                        }}
                      >
                        {step.duration}
                      </span>
                    </div>
                  </div>

                  <p className="text-base sm:text-lg text-ink-mute leading-relaxed flex-1">
                    {step.desc}
                  </p>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
