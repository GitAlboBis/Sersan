"use client";

import Image from "next/image";
import Link from "next/link";
import { coFounders } from "@/data/founders";
import StartIntakeForm from "@/components/start-intake-form";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";

/**
 * StartClient — the /start page body.
 *
 * Client component so the copy can follow the EN/IT toggle via the repo's
 * inline `isEn` ternary convention (same structure as audit/contact/
 * consulting: thin server page.tsx for metadata + *-client.tsx for JSX).
 * The embedded StartIntakeForm owns its own bilingual strings already.
 */
export function StartClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const steps = isEn
    ? [
        {
          num: "01",
          title: "You send a brief",
          body: "Two or three sentences is enough. Drop a Loom, a repo link, or a doc if it helps.",
        },
        {
          num: "02",
          title: "We reply within 1 business day",
          body: "Read by one of the founders, not a queue. We confirm if we're a fit before scheduling.",
        },
        {
          num: "03",
          title: "30-minute call",
          body: "Senior engineering, technical depth. You leave with a written next-step recommendation.",
        },
      ]
    : [
        {
          num: "01",
          title: "Inviate un brief",
          body: "Bastano due o tre frasi. Allegate un Loom, un link al repo o un documento, se aiuta.",
        },
        {
          num: "02",
          title: "Rispondiamo entro 1 giorno lavorativo",
          body: "Letto da uno dei founder, non da una coda. Confermiamo se c'è fit prima di fissare la call.",
        },
        {
          num: "03",
          title: "Call di 30 minuti",
          body: "Ingegneria senior, profondità tecnica. Uscite con una raccomandazione scritta sul prossimo passo.",
        },
      ];

  return (
    <div className="relative min-h-[100svh]">
      <main className="container-px pt-32 pb-24 sm:pt-40 sm:pb-32">
        <div className="max-w-5xl mx-auto">
          <header className="mb-12 sm:mb-16 max-w-2xl">
            <p className="eyebrow inline-flex items-center gap-2 text-ink-mute mb-6">
              <span aria-hidden="true" className="status-dot" />
              <span>{isEn ? "Technical scoping call" : "Call tecnica di scoping"}</span>
            </p>
            {/* key={language}: SplitText owns this subtree once split; a language
                swap must remount it or React reconciles against orphaned nodes
                (same contract as contact-client's h1). */}
            <h1 key={language} data-split-reveal className="font-display text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.98] tracking-[-0.03em] text-ink mb-6">
              {isEn ? (
                <>
                  Start with a{" "}
                  <span className="text-[hsl(var(--accent))] font-display font-medium">
                    technical scoping call.
                  </span>
                </>
              ) : (
                <>
                  Iniziate con una{" "}
                  <span className="text-[hsl(var(--accent))] font-display font-medium">
                    call tecnica di scoping.
                  </span>
                </>
              )}
            </h1>
            <p className="text-base sm:text-lg text-ink-mute leading-[1.55] max-w-xl">
              {isEn ? (
                <>
                  Tell us what you&apos;re trying to build, automate, or harden.
                  We&apos;ll review the context and reply within one business day
                  with a recommended next step — sometimes that&apos;s a build,
                  sometimes an audit, sometimes &ldquo;don&apos;t do this.&rdquo;
                </>
              ) : (
                <>
                  Raccontateci cosa state cercando di costruire, automatizzare o
                  irrobustire. Esaminiamo il contesto e vi rispondiamo entro un
                  giorno lavorativo con il prossimo passo consigliato — a volte è
                  un build, a volte un audit, a volte &ldquo;non fatelo.&rdquo;
                </>
              )}
            </p>
          </header>

          {/* What happens next — sets expectations before they fill anything */}
          <div className="mb-16 sm:mb-20 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 max-w-4xl">
            {steps.map((step, i) => (
              <Reveal
                as="article"
                key={step.num}
                delay={i * 80}
                className="p-5 rounded-lg border border-[hsl(var(--rule))] bg-[hsl(var(--surface)/0.4)]"
              >
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute/80">
                  {step.num}
                </span>
                <h3 className="mt-2 font-display text-lg leading-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-[13px] text-ink-mute leading-relaxed">
                  {step.body}
                </p>
              </Reveal>
            ))}
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
            <div className="lg:col-span-7">
              {/* key={language}: same SplitText remount contract as the h1. */}
              <h2 key={language} data-split-reveal className="font-display text-2xl sm:text-3xl leading-[1.05] tracking-[-0.022em] text-ink mb-2">
                {isEn ? "Send a brief" : "Inviate un brief"}
              </h2>
              <p className="text-[13.5px] text-ink-mute mb-8 leading-relaxed">
                {isEn ? (
                  <>
                    No marketing follow-ups. No demo decks. Read by one of the
                    founders. Required fields marked.
                  </>
                ) : (
                  <>
                    Nessun follow-up di marketing. Nessun deck demo. Letto da uno
                    dei founder. I campi obbligatori sono contrassegnati.
                  </>
                )}
              </p>
              <StartIntakeForm />
            </div>

            <aside className="lg:col-span-5">
              <div className="lg:sticky lg:top-32">
                <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-mute mb-5">
                  {isEn ? "Who reads this" : "Chi lo legge"}
                </h2>

                {/* Founder block — the brief literally lands with one of the
                    CO-FOUNDERS, so this pulls `coFounders` (not the full team)
                    from src/data/founders.ts. The prose above promises "read by
                    one of the founders" twice; anyone with kind:"team" must not
                    appear here. Photos / roles / LinkedIn URLs stay in sync
                    with /about. */}
                <ul className="flex flex-col gap-4 mb-6 list-none">
                  {coFounders.map((f) => (
                    <li key={f.anchor} className="flex items-center gap-3.5">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[hsl(var(--rule))] bg-[hsl(var(--surface))] shrink-0">
                        <Image
                          src={f.image}
                          alt={`${f.name}, ${isEn ? f.roleEn : f.roleIt}`}
                          fill
                          sizes="48px"
                          className="object-cover object-center"
                        />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={f.linkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block font-display text-[15px] leading-tight text-ink hover:text-[hsl(var(--accent))] transition-colors"
                        >
                          {f.name}
                        </Link>
                        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-mute truncate">
                          {isEn ? f.roleEn : f.roleIt}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="text-[14px] text-ink-mute leading-relaxed mb-6">
                  {isEn ? (
                    <>
                      Your brief lands directly in our inbox. No account managers,
                      no sales engineers, no AI BDR sequences. If we&apos;re a
                      fit, we&apos;ll book a call. If we&apos;re not, we&apos;ll
                      tell you — usually with a pointer to who is.
                    </>
                  ) : (
                    <>
                      Il vostro brief arriva direttamente nella nostra inbox.
                      Niente account manager, niente sales engineer, niente
                      sequenze di AI BDR. Se c&apos;è fit, fissiamo una call. Se
                      non c&apos;è, ve lo diciamo — di solito indicandovi chi fa
                      al caso vostro.
                    </>
                  )}
                </p>

                <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-mute mb-3 mt-10">
                  {isEn ? "Not ready to scope?" : "Non siete pronti per lo scoping?"}
                </h2>
                <ul className="flex flex-col gap-2 text-[13.5px] text-ink-mute">
                  <li>
                    <a
                      href="/#process"
                      className="text-ink hover:text-[hsl(var(--accent))] transition-colors underline underline-offset-4 decoration-[hsl(var(--ink-mute)/0.3)] hover:decoration-[hsl(var(--accent))]"
                    >
                      {isEn ? "How we work →" : "Come lavoriamo →"}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/#work"
                      className="text-ink hover:text-[hsl(var(--accent))] transition-colors underline underline-offset-4 decoration-[hsl(var(--ink-mute)/0.3)] hover:decoration-[hsl(var(--accent))]"
                    >
                      {isEn ? "Selected work →" : "Lavori selezionati →"}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/#trust"
                      className="text-ink hover:text-[hsl(var(--accent))] transition-colors underline underline-offset-4 decoration-[hsl(var(--ink-mute)/0.3)] hover:decoration-[hsl(var(--accent))]"
                    >
                      {isEn ? (
                        <>What &ldquo;production-grade&rdquo; means →</>
                      ) : (
                        <>Cosa significa &ldquo;production-grade&rdquo; →</>
                      )}
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:alex.s@sersan.dev"
                      className="text-ink hover:text-[hsl(var(--accent))] transition-colors underline underline-offset-4 decoration-[hsl(var(--ink-mute)/0.3)] hover:decoration-[hsl(var(--accent))]"
                    >
                      {isEn ? "Or just email us →" : "Oppure scriveteci una email →"}
                    </a>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
