"use client";

import { ArrowRight, Check, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";

/**
 * FitSection: "Selective on purpose".
 *
 * Two equal columns: good-fit signals on the left, not-a-fit signals on
 * the right. This section is deliberately disqualifying: it is how a
 * studio that values its time signals seriousness. CTOs read the not-a-fit
 * column more carefully than the good-fit column.
 */

const GOOD_FIT_EN = [
  "You have a real workflow with cost or revenue tied to it.",
  "You have an internal owner who'll run the system after handover.",
  "You're moving prototype → production, or hardening live AI.",
  "You're regulated (or about to be) and want to be ready.",
  "You're technical, or have technical authority on the team.",
  "You can budget for senior engineering, not just license costs.",
];

const GOOD_FIT_IT = [
  "Avete un workflow reale con costi o ricavi che ne dipendono.",
  "Avete un referente interno che gestirà il sistema dopo il passaggio di consegne.",
  "State portando un prototipo in produzione, o irrobustendo un'AI già live.",
  "Siete regolamentati (o lo sarete a breve) e volete farvi trovare pronti.",
  "Siete tecnici, o avete autorità tecnica nel team.",
  "Potete mettere a budget ingegneria senior, non solo i costi di licenza.",
];

const NOT_A_FIT_EN = [
  "You want a chatbot gimmick for a press release.",
  "No internal owner, no roadmap, no operational plan.",
  "You're at the slide-deck stage with no engineering budget.",
  "You want to skip compliance to ship faster.",
  "You need a partner to convince your CTO this is a good idea.",
  "“Can you do it for equity?”",
];

const NOT_A_FIT_IT = [
  "Volete un chatbot d'effetto per un comunicato stampa.",
  "Nessun referente interno, nessuna roadmap, nessun piano operativo.",
  "Siete alla fase di slide-deck, senza budget per l'ingegneria.",
  "Volete saltare la compliance per rilasciare più in fretta.",
  "Vi serve un partner per convincere il vostro CTO che sia una buona idea.",
  "«Lo fareste in cambio di equity?»",
];

const START_HREF = "/start";

export default function FitSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const goodFit = isEn ? GOOD_FIT_EN : GOOD_FIT_IT;
  const notAFit = isEn ? NOT_A_FIT_EN : NOT_A_FIT_IT;
  return (
    <section
      id="fit"
      className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
    >
      <SectionGlow position="top-left" intensity={1} size="50rem" />
      <div className="container-px relative">
        <SectionHeading
          eyebrow={isEn ? "Selective on purpose" : "Selettivi per scelta"}
          title={
            isEn ? (
              <>
                We are honest about{" "}
                <span className="font-display italic text-ink">
                  who we work with.
                </span>
              </>
            ) : (
              <>
                Siamo onesti su{" "}
                <span className="font-display italic text-ink">
                  con chi lavoriamo.
                </span>
              </>
            )
          }
          description={
            isEn
              ? "A clear no protects both of us. About a third of scoping calls end with us recommending you don't engage SerSan: sometimes because it's the wrong moment, sometimes because we're the wrong studio."
              : "Un no chiaro tutela entrambi. Circa un terzo delle scoping call si chiude con la nostra raccomandazione di non ingaggiare SerSan: a volte perché è il momento sbagliato, a volte perché siamo lo studio sbagliato."
          }
          className="mb-12 sm:mb-16 max-w-3xl"
        />

        {/* Two columns. Good-fit rows stagger in from the LEFT, not-a-fit
            rows mirror from the RIGHT. Hovering one column dims the other via
            the `fit-grid`/`fit-col` sibling-hover rule (CSS only). Reduced
            motion settles rows immediately (handled inside Reveal). */}
        <div className="fit-grid grid grid-cols-1 lg:grid-cols-2 gap-px bg-[hsl(var(--rule))] border border-[hsl(var(--rule))] rounded-lg overflow-hidden">
          {/* Good fit column */}
          <div className="fit-col fit-col--good bg-[hsl(var(--bg))] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <span
                aria-hidden="true"
                className="fit-icon flex items-center justify-center w-6 h-6 rounded-full bg-[hsl(var(--accent)/0.15)] border border-[hsl(var(--accent)/0.5)] shadow-[0_0_0_0_hsl(var(--accent)/0)]"
                style={{ ["--fit-glow" as string]: "var(--accent)" }}
              >
                <Check className="w-3 h-3 text-[hsl(var(--accent))]" aria-hidden="true" />
              </span>
              <h3 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink">
                {isEn ? "Good fit" : "Buon fit"}
              </h3>
            </div>
            <ul className="flex flex-col gap-3.5">
              {goodFit.map((line, i) => (
                <Reveal key={i} delay={i * 50} from="left" as="li">
                  <p className="fit-good rounded-md px-3 py-2 text-[14px] sm:text-[15px] text-ink leading-relaxed">
                    {line}
                  </p>
                </Reveal>
              ))}
            </ul>
          </div>

          {/* Not a fit column */}
          <div className="fit-col fit-col--warn bg-[hsl(var(--bg))] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <span
                aria-hidden="true"
                className="fit-icon flex items-center justify-center w-6 h-6 rounded-full bg-[hsl(36_84%_56%/0.1)] border border-[hsl(36_84%_56%/0.32)]"
                style={{ ["--fit-glow" as string]: "36 84% 56%" }}
              >
                <X className="w-3 h-3 text-[hsl(36_84%_62%)]" aria-hidden="true" />
              </span>
              <h3 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-mute">
                {isEn ? "Not a fit" : "Non è un fit"}
              </h3>
            </div>
            <ul className="flex flex-col gap-3.5">
              {notAFit.map((line, i) => (
                <Reveal key={i} delay={i * 50} from="right" as="li">
                  <p className="fit-warn rounded-md px-3 py-2 text-[14px] sm:text-[15px] text-ink-mute leading-relaxed">
                    {line}
                  </p>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <p className="text-[14px] text-ink-mute max-w-md">
            {isEn ? (
              <>
                If you&apos;re unsure, book the call. We&apos;ll tell you
                quickly, and in writing.
              </>
            ) : (
              <>
                Se avete dubbi, prenotate la call. Ve lo diremo in fretta, e per
                iscritto.
              </>
            )}
          </p>
          <Link href={START_HREF}>
            <Button variant="hero" size="lg" className="group">
              {isEn
                ? "Book a 30-min scoping call"
                : "Prenota una scoping call di 30 min"}
              <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>

      <style>{`
        /* Check / X icon scales up with a glow on mount. */
        .fit-icon {
          transform: scale(0.6);
          opacity: 0;
          animation: fit-icon-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
        }
        @keyframes fit-icon-in {
          0%   { transform: scale(0.6); opacity: 0; box-shadow: 0 0 0 0 hsl(var(--fit-glow) / 0); }
          60%  { transform: scale(1.12); opacity: 1; box-shadow: 0 0 14px 2px hsl(var(--fit-glow) / 0.45); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 8px 0 hsl(var(--fit-glow) / 0.25); }
        }

        /* Hovering one column dims the sibling column (focus the read). */
        .fit-col { transition: opacity 350ms cubic-bezier(0.215, 0.61, 0.355, 1); }
        @media (hover: hover) and (pointer: fine) {
          .fit-grid:has(.fit-col--good:hover) .fit-col--warn,
          .fit-grid:has(.fit-col--warn:hover) .fit-col--good {
            opacity: 0.45;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .fit-icon {
            transform: none;
            opacity: 1;
            animation: none;
            box-shadow: none;
          }
          .fit-col { transition: none; }
        }
      `}</style>
    </section>
  );
}
