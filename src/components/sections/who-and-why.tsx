"use client";

import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { founders } from "@/data/founders";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { useLanguage } from "@/components/language-provider";

/**
 * WhoAndWhy — positioning headline → the gap & track record → the thesis →
 * three operating principles → handoff to the manifesto beat below.
 */
export default function WhoAndWhy() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const principles = [
    {
      title: isEn ? "Senior people only." : "Solo professionisti senior.",
      desc: isEn
        ? "No juniors learning on your project."
        : "Nessun junior in formazione sui vostri progetti.",
    },
    {
      title: isEn ? "Built to run." : "Costruito per stare in piedi.",
      desc: isEn
        ? "Production-grade systems, not demos."
        : "Sistemi di livello produttivo, non demo.",
    },
    {
      title: isEn ? "Honest scoping." : "Scoping trasparente.",
      desc: isEn
        ? "We tell you when AI isn't the answer."
        : "Vi diciamo quando l'AI non è la risposta giusta.",
    },
  ];

  return (
    <section
      className="section-lg relative overflow-hidden"
      aria-labelledby="who-and-why-heading"
    >
      <div className="container-px relative z-10">
        <RevealOnScroll delay={0}>
          <div className="max-w-4xl mx-auto text-center">
            <p className="eyebrow mb-6">
              {isEn ? (
                <>
                  Who <span className="text-accent" aria-hidden="true">·</span> Why
                </>
              ) : (
                <>
                  Chi <span className="text-accent" aria-hidden="true">·</span> Perché
                </>
              )}
            </p>
            <h2
              id="who-and-why-heading"
              className="heading-2 mb-10 sm:mb-12 text-balance"
            >
              {isEn ? (
                <>
                  The senior AI team you&apos;d hire
                  <br className="hidden sm:block" />{" "}
                  <span className="font-display font-medium text-accent">
                    if you could find them.
                  </span>
                </>
              ) : (
                <>
                  Il team AI senior che assumereste
                  <br className="hidden sm:block" />{" "}
                  <span className="font-display font-medium text-accent">
                    se solo riusciste a trovarlo.
                  </span>
                </>
              )}
            </h2>
            <div className="space-y-5 text-base sm:text-lg text-ink-mute max-w-2xl mx-auto leading-relaxed text-left">
              <p>
                {isEn
                  ? "Most AI work today gets handed to one of two places: agencies that staff junior developers on your project, or large consultancies that spend three months scoping before anyone writes code."
                  : "Oggi la maggior parte dei progetti AI viene affidata a due tipologie di fornitori: agenzie che assegnano sviluppatori junior ai progetti dei clienti, o grandi società di consulenza che dedicano tre mesi alla fase di scoping prima di iniziare lo sviluppo."}
              </p>
              <p>
                {isEn
                  ? "Sersan is built around that gap by two founders with complementary depth. One deeply commercial, one deeply technical."
                  : "Sersan è costruita attorno a quel divario da due fondatori con competenze complementari. Uno con profilo fortemente commerciale, uno con profilo fortemente tecnico."}
              </p>
            </div>

            {/* Framing eyebrow */}
            <p className="mt-14 sm:mt-16 eyebrow flex items-center justify-center gap-3">
              <span
                aria-hidden="true"
                className="h-px w-10"
                style={{
                  background:
                    "linear-gradient(to right, transparent, hsl(var(--rule) / 0.55))",
                }}
              />
              <span
                aria-hidden="true"
                className="h-1 w-1 rounded-full bg-accent/80"
              />
              {isEn ? "New firm. Senior operators." : "Realtà nuova. Operatori senior."}
              <span
                aria-hidden="true"
                className="h-1 w-1 rounded-full bg-accent/80"
              />
              <span
                aria-hidden="true"
                className="h-px w-10"
                style={{
                  background:
                    "linear-gradient(to left, transparent, hsl(var(--rule) / 0.55))",
                }}
              />
            </p>

            {/* Founder cards */}
            <div className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto text-left">
              {founders.map((f, idx) => {
                const isWarm = f.accent === "warm";
                const accentVar = isWarm ? "var(--accent-warm)" : "var(--accent)";
                const credentials = isEn ? f.credentialsEn : f.credentialsIt;
                const expertise = isEn ? f.expertiseEn : f.expertiseIt;
                const shortBio = isEn ? f.shortBioEn : f.shortBioIt;
                const role = isEn ? f.roleEn : f.roleIt;
                const indexLabel = `0 ${idx + 1}`;

                return (
                  <article
                    key={f.name}
                    className="group relative bg-surface-elev/60 border border-rule/70 rounded-xl p-5 sm:p-7 flex flex-col gap-4 sm:gap-5 hover:bg-surface-elev/80 transition-[background-color,border-color] duration-300 overflow-hidden"
                  >
                    {/* Brass top hairline */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-5 sm:inset-x-7 top-0 h-px"
                      style={{
                        background: `linear-gradient(to right, transparent, hsl(${accentVar} / 0.45), transparent)`,
                      }}
                    />

                    {/* Editorial index */}
                    <span
                      aria-hidden="true"
                      className="absolute top-4 right-4 sm:top-5 sm:right-5 font-mono text-[10px] tracking-[0.28em] text-ink-mute/55 select-none z-10"
                    >
                      {indexLabel}
                    </span>

                    {/* Accent corner glow */}
                    <span
                      aria-hidden="true"
                      className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-3xl"
                      style={{ background: `hsl(${accentVar} / 0.18)` }}
                    />

                    {/* Header row */}
                    <header className="flex items-start gap-4 relative z-10">
                      <div
                        className="flex-shrink-0 rounded-full p-[2px]"
                        style={{
                          background: `linear-gradient(135deg, hsl(${accentVar} / 0.55), hsl(var(--rule)))`,
                        }}
                      >
                        <Image
                          src={f.image}
                          alt={f.name}
                          width={80}
                          height={80}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover object-[50%_20%] bg-bg ring-2 ring-bg"
                        />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="font-display text-xl sm:text-2xl lg:text-[1.65rem] leading-tight text-ink">
                          {f.name}
                        </h3>
                        <p
                          className="mt-1 text-[11px] font-mono uppercase tracking-[0.14em]"
                          style={{ color: `hsl(${accentVar})` }}
                        >
                          {role}
                        </p>
                      </div>
                      <a
                        href={f.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${f.name} on LinkedIn`}
                        className="flex-shrink-0 w-8 h-8 mt-4 rounded-full border border-rule flex items-center justify-center text-ink-mute hover:text-ink transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                    </header>

                    {/* Hairline separator */}
                    <span
                      aria-hidden="true"
                      className="h-px w-full"
                      style={{
                        background:
                          "linear-gradient(to right, transparent, hsl(var(--rule) / 0.35) 20%, hsl(var(--rule) / 0.35) 80%, transparent)",
                      }}
                    />

                    {/* Credentials */}
                    <ul className="space-y-2 relative z-10">
                      {credentials.map((c) => (
                        <li
                          key={c}
                          className="flex items-start gap-2.5 text-sm text-ink"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-[0.45em] flex-shrink-0 w-1.5 h-1.5 rotate-45"
                            style={{ background: `hsl(${accentVar})` }}
                          />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Previously */}
                    {f.previouslyAt && f.previouslyAt.length > 0 && (
                      <div className="relative z-10">
                        <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-2">
                          {isEn ? "Previously" : "In passato"}
                        </p>
                        <p className="text-sm text-ink-mute leading-relaxed">
                          {f.previouslyAt.join(" · ")}
                        </p>
                      </div>
                    )}

                    <p className="text-sm text-ink-mute leading-relaxed relative z-10">
                      {shortBio}
                    </p>

                    {/* Expertise pills */}
                    <div className="flex flex-wrap gap-1.5 relative z-10">
                      {expertise.map((e) => (
                        <span
                          key={e}
                          className="text-[10px] font-mono uppercase tracking-[0.1em] px-2.5 py-1 rounded-full border border-rule/80 text-ink-mute bg-bg/40"
                        >
                          {e}
                        </span>
                      ))}
                    </div>

                    {/* Stack chips */}
                    {f.stack && f.stack.length > 0 && (
                      <div className="relative z-10 pt-3 border-t border-rule/40 mt-auto">
                        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-ink-mute/70 mb-2">
                          {isEn ? "Ships with" : "Lavora con"}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {f.stack.map((s) => (
                            <span
                              key={s}
                              className="text-[10px] font-mono text-ink-mute/90 px-1.5 py-0.5"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bottom accent rule */}
                    <span
                      aria-hidden="true"
                      className="absolute left-6 right-6 sm:left-7 sm:right-7 bottom-0 h-px origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{ background: `hsl(${accentVar})` }}
                    />
                  </article>
                );
              })}
            </div>

            {/* Hairline separator between "who" and "why" */}
            <div
              className="mt-14 mb-12 sm:mt-16 sm:mb-14 mx-auto h-px w-16 bg-rule"
              aria-hidden="true"
            />

            {/* The thesis */}
            <div className="space-y-6 sm:space-y-7 font-display text-[clamp(1.4rem,2.7vw,2.35rem)] leading-[1.18] tracking-[-0.015em] text-ink/92 max-w-3xl mx-auto">
              {isEn ? (
                <>
                  <p className="text-balance">
                    Sersan was built by two people with{" "}
                    <span className="text-ink">opposite backgrounds</span>. One
                    deeply technical, one deeply commercial.
                  </p>
                  <p className="text-balance text-ink/72">
                    Working together produced something neither could build
                    alone. That&apos;s the thesis.
                  </p>
                  <p className="text-balance text-ink/72">
                    AI works best not when it replaces human judgement, but
                    when it <span className="text-ink italic">extends</span> it.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-balance">
                    Sersan è nata dall&apos;incontro di due persone con{" "}
                    <span className="text-ink">background opposti</span>. Uno
                    di profilo fortemente tecnico, uno di profilo fortemente
                    commerciale.
                  </p>
                  <p className="text-balance text-ink/72">
                    Lavorando insieme abbiamo prodotto qualcosa che nessuno
                    dei due avrebbe potuto creare da solo. È la nostra tesi.
                  </p>
                  <p className="text-balance text-ink/72">
                    L&apos;AI funziona meglio non quando sostituisce il
                    giudizio umano, ma quando lo{" "}
                    <span className="text-ink italic">estende</span>.
                  </p>
                </>
              )}
            </div>

            {/* Hand-off to manifesto */}
            <div className="mt-12 sm:mt-14 text-center">
              <p className="font-display font-medium text-accent text-base sm:text-lg tracking-tight">
                {isEn
                  ? "↓ The thesis, said plainly"
                  : "↓ La tesi, detta in modo semplice"}
              </p>
            </div>
          </div>
        </RevealOnScroll>

        {/* Three operating principles */}
        <div className="mt-16 sm:mt-20 grid grid-cols-1 md:grid-cols-3 gap-px bg-rule/60 border-y border-rule/60 max-w-5xl mx-auto">
          {principles.map((p, i) => (
            <div
              key={i}
              className="group bg-bg px-5 sm:px-6 py-6 flex flex-col gap-2 hover:bg-surface transition-colors duration-300 relative h-full"
            >
              <div className="flex items-baseline gap-3 mb-1">
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink-mute">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="h-px flex-1 bg-rule" aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink">
                {p.title}
              </h3>
              <p className="text-sm text-ink-mute leading-relaxed">{p.desc}</p>
              <span
                aria-hidden="true"
                className="absolute left-5 right-5 sm:left-6 sm:right-6 bottom-0 h-px origin-left scale-x-0 group-hover:scale-x-100 bg-accent transition-transform duration-500"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
