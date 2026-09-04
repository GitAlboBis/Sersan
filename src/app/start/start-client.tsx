"use client";

import Image from "next/image";
import Link from "next/link";
import { coFounders } from "@/data/founders";
import StartIntakeForm from "@/components/start-intake-form";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";
import { CTA, pick } from "@/data/copy";
import { track, EVENTS } from "@/lib/analytics";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * StartClient — the /start page body. The primary door into SerSan: one
 * problem, described in a few sentences, is enough to start.
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
          body: "Two or three sentences is enough. Add a link, a document, or a screenshot if it helps.",
        },
        {
          num: "02",
          title: "We reply within 1 business day",
          body: "Read by one of the founders. You get a straight answer on what we'd do first.",
        },
        {
          num: "03",
          title: "We scope the work",
          body: "A short call if it helps, then a written scope: what to build first, and what it costs.",
        },
      ]
    : [
        {
          num: "01",
          title: "Inviate un brief",
          body: "Bastano due o tre frasi. Allegate un link, un documento o uno screenshot, se aiuta.",
        },
        {
          num: "02",
          title: "Rispondiamo entro 1 giorno lavorativo",
          body: "Letto da uno dei founder. Ricevete una risposta chiara su cosa faremmo per primo.",
        },
        {
          num: "03",
          title: "Definiamo lo scope",
          body: "Una breve call se serve, poi uno scope scritto: cosa costruire per primo e quanto costa.",
        },
      ];

  return (
    <div className="relative min-h-[100svh]">
      <main className="container-px pt-32 pb-24 sm:pt-40 sm:pb-32">
        <div className="max-w-5xl mx-auto">
          <header className="mb-12 sm:mb-16 max-w-2xl">
            <p className="eyebrow inline-flex items-center gap-2 text-ink-mute mb-6">
              <span aria-hidden="true" className="status-dot" />
              <span>{pick(isEn, CTA.startWithProblem)}</span>
            </p>
            {/* key={language}: SplitText owns this subtree once split; a language
                swap must remount it or React reconciles against orphaned nodes
                (same contract as contact-client's h1). */}
            <h1 key={language} data-split-reveal className="font-display text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.98] tracking-[-0.03em] text-ink mb-6">
              {isEn ? (
                <>
                  Tell us what&apos;s{" "}
                  <span className="text-[hsl(var(--accent))] font-display font-medium">
                    slowing you down.
                  </span>
                </>
              ) : (
                <>
                  Raccontateci cosa{" "}
                  <span className="text-[hsl(var(--accent))] font-display font-medium">
                    vi sta rallentando.
                  </span>
                </>
              )}
            </h1>
            <p className="text-base sm:text-lg text-ink-mute leading-[1.55] max-w-xl">
              {isEn ? (
                <>
                  One workflow, one product idea, one manual process, one system
                  that needs fixing. Two or three sentences is enough — we read
                  it and reply within one business day with a recommended next
                  step, and sometimes that step is &ldquo;don&apos;t build this.&rdquo;
                </>
              ) : (
                <>
                  Un processo, un&apos;idea di prodotto, un&apos;attività ancora
                  manuale, un sistema da sistemare. Bastano due o tre frasi: le
                  leggiamo e vi rispondiamo entro un giorno lavorativo con il
                  prossimo passo consigliato — a volte è &ldquo;non costruitelo.&rdquo;
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
              <h2 key={language} data-split-reveal className="font-display text-2xl sm:text-3xl leading-[1.05] tracking-[-0.022em] text-ink mb-8">
                {pick(isEn, CTA.primary)}
              </h2>
              {/* REMOVED 2026-09-04 (owner: "disclaimer con scritte piccole
                  inutili"): "Four required fields, everything else optional.
                  Read by one of the founders, who replies with a recommended
                  first step." The form states its own required fields, and the
                  reply promise is made by the panel beside it. `mb-8` moves to
                  the h2 so the gap above the form is unchanged. */}
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
                          className="relative block font-display text-[15px] leading-tight text-ink hover:text-[hsl(var(--accent))] transition-colors after:absolute after:inset-x-0 after:-inset-y-2 after:content-['']"
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
                      Your brief lands directly in our inbox and one of us reads
                      it the whole way through, the way we&apos;d read a spec. If
                      we can help, we come back with a recommended next step. If
                      we can&apos;t, we say so — usually with a pointer to who can.
                    </>
                  ) : (
                    <>
                      Il vostro brief arriva direttamente nella nostra inbox e uno
                      di noi lo legge per intero, come leggerebbe una specifica.
                      Se possiamo aiutarvi, vi proponiamo il prossimo passo. Se
                      non possiamo, ve lo diciamo — di solito indicandovi chi fa
                      al caso vostro.
                    </>
                  )}
                </p>

                <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-mute mb-3 mt-10">
                  {isEn ? "Want more context first?" : "Volete più contesto prima?"}
                </h2>
                <ul className="flex flex-col gap-2 text-[13.5px] text-ink-mute">
                  <li>
                    <a
                      href="/consulting#process"
                      className="text-ink hover:text-[hsl(var(--accent))] transition-colors underline underline-offset-4 decoration-[hsl(var(--ink-mute)/0.3)] hover:decoration-[hsl(var(--accent))]"
                    >
                      {isEn ? "How we work →" : "Come lavoriamo →"}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/#work"
                      onClick={() =>
                        track(EVENTS.CTA_SELECTED_WORK, {
                          source_section: "start_aside",
                        })
                      }
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
                      href={`mailto:${CONTACT_EMAIL}`}
                      // Someone emailing from the page that holds the form is
                      // the form telling us something (PROMPT 17).
                      onClick={() =>
                        track(EVENTS.CTA_EMAIL, {
                          source_section: "start_aside",
                        })
                      }
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
