"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";

/**
 * UseCasesSection — "Which situation are you in?".
 *
 * Six self-locating cards. Each one LEADS with a recognizable buyer pain
 * (the line a CTO would recognize as their own situation) and then answers
 * with a short "SerSan response". A reader should think "that's exactly
 * what we have" and immediately see how we engage.
 *
 * Conforms to the shared section grammar: container-px, card-steel, Geist,
 * --accent used sparingly (number + response label + hover edge), no
 * em/en-dashes, EN + IT. The whole card is clickable through to /start.
 */

type UseCase = {
  num: string;
  pain: string;
  response: string;
};

function getUseCases(isEn: boolean): UseCase[] {
  return [
    {
      num: "01",
      pain: isEn
        ? "Your agent works in demo, but fails in production."
        : "Il tuo agente funziona nelle demo, ma fallisce in produzione.",
      response: isEn
        ? "We instrument it, build the eval set, and harden it back to reliable, so the failures stop being a mystery."
        : "Lo strumentiamo, costruiamo la suite di valutazione e lo irrobustiamo fino a renderlo affidabile, perché gli errori smettano di essere un mistero.",
    },
    {
      num: "02",
      pain: isEn
        ? "Your automation stack is duct tape."
        : "Il tuo stack di automazioni è fatto di nastro adesivo.",
      response: isEn
        ? "We put a real engineering layer under the Zapier, n8n, and Make sprawl, with retries, rollback, and cost you can see."
        : "Mettiamo un vero livello di ingegneria sotto la giungla di Zapier, n8n e Make, con retry, rollback e costi visibili.",
    },
    {
      num: "03",
      pain: isEn
        ? "Your models are still trapped in notebooks."
        : "I tuoi modelli sono ancora intrappolati nei notebook.",
      response: isEn
        ? "We design the eval, registry, monitoring, and rollback path so the models can actually ship and stay shipped."
        : "Progettiamo valutazione, registry, monitoraggio e percorso di rollback perché i modelli possano davvero andare in produzione e restarci.",
    },
    {
      num: "04",
      pain: isEn
        ? "You're about to commit engineering cycles to an AI product."
        : "Stai per impegnare cicli di sviluppo su un prodotto AI.",
      response: isEn
        ? "We do the architecture, the risk call, and the cost model first, so you commit to a plan and not a hope."
        : "Curiamo prima l'architettura, la valutazione dei rischi e il modello di costo, così ti impegni su un piano e non su una speranza.",
    },
    {
      num: "05",
      pain: isEn
        ? "You need readiness before a board, customer, or regulator."
        : "Ti serve essere pronti prima di un consiglio, un cliente o un'autorità.",
      response: isEn
        ? "We run an honest production audit and hand you a written readiness review you can put in front of anyone."
        : "Eseguiamo un audit di produzione onesto e ti consegniamo una valutazione di maturità scritta da mettere davanti a chiunque.",
    },
    {
      num: "06",
      pain: isEn
        ? "You need senior AI engineering judgment without hiring a full team."
        : "Ti serve giudizio ingegneristico AI senior senza assumere un team completo.",
      response: isEn
        ? "We embed at engineering depth for a quarter or two, sitting in your stand-ups, not on a separate roadmap."
        : "Ci integriamo con profondità ingegneristica per uno o due trimestri, nei tuoi stand-up, non su una roadmap separata.",
    },
  ];
}

function UseCaseCard({ uc, isEn }: { uc: UseCase; isEn: boolean }) {
  return (
    <Link
      href="/start"
      className="card-steel group flex flex-col h-full p-6 sm:p-7 overflow-hidden"
    >
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
      {/* Header: number + rule */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[hsl(var(--accent)/0.85)] group-hover:text-[hsl(var(--accent))] transition-colors duration-300">
          {uc.num}
        </span>
        <span
          aria-hidden="true"
          className="block h-px flex-1 bg-[hsl(var(--rule))] group-hover:bg-[hsl(var(--accent)/0.4)] transition-colors duration-300"
        />
      </div>

      {/* Buyer pain — leads the card */}
      <h3 className="font-display text-lg sm:text-xl leading-[1.18] tracking-[-0.018em] text-ink mb-4">
        {uc.pain}
      </h3>

      {/* SerSan response */}
      <div className="mt-auto pt-4 border-t border-[hsl(var(--rule)/0.7)]">
        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[hsl(var(--accent)/0.85)] mb-1.5">
          {isEn ? "SerSan response" : "Risposta di SerSan"}
        </p>
        <p className="text-[13.5px] text-ink-mute leading-relaxed">
          {uc.response}
        </p>
      </div>

      {/* Affordance: the whole card is clickable */}
      <span className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-ink-mute group-hover:text-[hsl(var(--accent))] transition-colors duration-200">
        {isEn ? "Start here" : "Parti da qui"}
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

export default function UseCasesSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const useCases = getUseCases(isEn);

  return (
    <section
      id="use-cases"
      className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
    >
      <SectionGlow position="top-right" intensity={1} size="55rem" />
      <SectionGlow position="bottom-left" intensity={0.85} size="50rem" />
      <div className="container-px relative">
        <SectionHeading
          eyebrow={isEn ? "Which situation are you in?" : "In quale situazione ti trovi?"}
          title={
            isEn ? (
              <>
                Find your situation.{" "}
                <span className="text-[hsl(var(--accent))] font-medium">
                  We&apos;ll recognize it.
                </span>
              </>
            ) : (
              <>
                Trova la tua situazione.{" "}
                <span className="text-[hsl(var(--accent))] font-medium">
                  La riconosceremo.
                </span>
              </>
            )
          }
          description={
            isEn
              ? "If one of these reads like your situation, we'd recognize it inside the first five minutes of a scoping call. Pick the closest one and start there."
              : "Se una di queste descrive la tua situazione, la riconosceremmo entro i primi cinque minuti di una call di scoping. Scegli quella piu vicina e parti da li."
          }
          className="mb-12 sm:mb-16 max-w-3xl"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {useCases.map((uc, i) => (
            <Reveal key={uc.num} delay={i * 60}>
              <UseCaseCard uc={uc} isEn={isEn} />
            </Reveal>
          ))}
        </div>

        <p className="mt-12 sm:mt-14 max-w-2xl text-[14px] text-ink-mute leading-relaxed">
          {isEn ? (
            <>
              None of these quite fit? Tell us the shape of the problem and we&apos;ll
              give you a senior engineering read on next steps.{" "}
              <Link
                href="/start"
                className="text-ink underline underline-offset-4 decoration-[hsl(var(--ink-mute)/0.4)] hover:decoration-[hsl(var(--accent))] transition-colors"
              >
                Book a scoping call
              </Link>
              . We&apos;ll reply within one business day.
            </>
          ) : (
            <>
              Nessuna di queste calza del tutto? Raccontaci la forma del problema e
              ti daremo una lettura ingegneristica senior sui prossimi passi.{" "}
              <Link
                href="/start"
                className="text-ink underline underline-offset-4 decoration-[hsl(var(--ink-mute)/0.4)] hover:decoration-[hsl(var(--accent))] transition-colors"
              >
                Prenota una call di scoping
              </Link>
              . Rispondiamo entro un giorno lavorativo.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
