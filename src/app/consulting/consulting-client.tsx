"use client";

import Link from "next/link";
import { ArrowRight, Building2, Cog, Database, Brain, Container, Code2, LineChart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiStepIntake } from "@/components/multi-step-intake";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";

export function ConsultingClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const services = [
    {
      icon: Building2,
      title: isEn ? "Enterprise architecture" : "Architettura enterprise",
      desc: isEn
        ? "We design the system before we ship it. Boundaries, data flow, failure modes, and the upgrade path."
        : "Progettiamo il sistema prima di metterlo in produzione. Confini, flussi dati, modalità di errore e percorso di upgrade.",
    },
    {
      icon: Cog,
      title: isEn ? "Workflow automation" : "Automazione dei workflow",
      desc: isEn
        ? "Repetitive, rule-bound work that humans shouldn't be doing. We map it, automate it, monitor it."
        : "Lavoro ripetitivo e basato su regole che non dovrebbero fare le persone. Lo mappiamo, lo automatizziamo, lo monitoriamo.",
    },
    {
      icon: Database,
      title: isEn ? "Data platforms" : "Piattaforme dati",
      desc: isEn
        ? "From ingest to warehouse to BI. Built to be queried, governed, and understood."
        : "Dall'ingest al warehouse alla BI. Costruite per essere interrogate, governate e comprese.",
    },
    {
      icon: Brain,
      title: isEn ? "ML & production AI" : "ML e AI in produzione",
      desc: isEn
        ? "Models that get to production and stay there. Pre-training, fine-tuning, RAG, agentic systems."
        : "Modelli che arrivano in produzione e ci restano. Pre-training, fine-tuning, RAG, sistemi agentici.",
    },
    {
      icon: Container,
      title: "MLOps",
      desc: isEn
        ? "The boring infrastructure that makes AI shippable: feature stores, registries, monitoring, rollbacks."
        : "L'infrastruttura noiosa che rende l'AI rilasciabile: feature store, registry, monitoring, rollback.",
    },
    {
      icon: Code2,
      title: isEn ? "FinTech engineering" : "Ingegneria FinTech",
      desc: isEn
        ? "Low-latency, regulated, real money. Eight years of senior delivery at JPM, Revolut, Brevan Howard."
        : "Bassa latenza, regolamentato, denaro reale. Otto anni di delivery senior in JPM, Revolut, Brevan Howard.",
    },
    {
      icon: LineChart,
      title: isEn ? "Quantitative ML" : "ML quantitativo",
      desc: isEn
        ? "Forecasting, signal generation, risk. The mathematics behind the trading and treasury surfaces."
        : "Forecasting, generazione di segnali, gestione del rischio. La matematica dietro trading e tesoreria.",
    },
    {
      icon: Users,
      title: "Fractional CTO",
      desc: isEn
        ? "We own the roadmap, architecture governance, hiring, and delivery rituals for 3–12 months."
        : "Ci prendiamo carico di roadmap, governance architetturale, hiring e riti di delivery per 3–12 mesi.",
    },
  ];

  const packages = [
    {
      name: isEn ? "Tech Audit" : "Tech Audit",
      timing: isEn ? "1–2 weeks" : "1–2 settimane",
      desc: isEn
        ? "Fixed-scope architecture review ending in a prioritised backlog and written report."
        : "Review architetturale a scope fisso che si chiude con un backlog prioritizzato e un report scritto.",
      includes: isEn
        ? [
            "Architecture review",
            "Data/ML readiness check",
            "Performance & reliability scan",
            "Workflow bottleneck map",
            "Prioritised backlog",
          ]
        : [
            "Review architetturale",
            "Check di readiness dati/ML",
            "Scan di performance e affidabilità",
            "Mappa dei colli di bottiglia nei workflow",
            "Backlog prioritizzato",
          ],
    },
    {
      name: isEn ? "Delivery Sprint" : "Delivery Sprint",
      timing: isEn ? "4–8 weeks" : "4–8 settimane",
      desc: isEn
        ? "Hands-on build: design, implementation, testing, handover."
        : "Build operativo: design, implementazione, test, handover.",
      includes: isEn
        ? ["Design + implementation", "Testing + QA", "Handover docs", "Team walkthrough"]
        : ["Design + implementazione", "Testing + QA", "Documenti di handover", "Walkthrough con il team"],
    },
    {
      name: "Fractional CTO",
      timing: isEn ? "3–12 months" : "3–12 mesi",
      desc: isEn
        ? "We own the roadmap, architecture governance, and delivery leadership."
        : "Ci prendiamo carico di roadmap, governance architetturale e leadership di delivery.",
      includes: isEn
        ? [
            "Roadmap ownership",
            "Architecture governance",
            "Delivery rituals",
            "Vendor alignment",
            "Hiring support",
          ]
        : [
            "Ownership della roadmap",
            "Governance dell'architettura",
            "Riti di delivery",
            "Allineamento dei fornitori",
            "Supporto al hiring",
          ],
    },
  ];

  return (
    <div className="min-h-screen pt-24 relative">
      {/* Hero */}
      <div data-line-anchor="hero">
      <section className="relative section-lg overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[55rem] max-w-[110vw] h-[24rem] opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(closest-side, hsl(var(--accent) / 0.32), transparent 75%)" }}
        />
        <div className="container-px relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <p className="eyebrow mb-6 inline-flex items-center justify-center gap-2">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--accent))" }}
                aria-hidden="true"
              />
              {isEn ? "Practice areas" : "Aree di intervento"}
            </p>
            <h1 className="font-display text-[clamp(2.25rem,7vw,4.75rem)] leading-[1.15] tracking-[-0.025em] text-ink text-balance mb-8 pb-1">
              {isEn ? (
                <>
                  Senior engineering.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    No layer of juniors.
                  </span>
                </>
              ) : (
                <>
                  Ingegneria senior.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Nessuno strato di junior.
                  </span>
                </>
              )}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              {isEn
                ? "Three engagement formats. The people who scope the work do the work. From £15K, scoped weekly. London-registered."
                : "Tre formati di ingaggio. Chi definisce il lavoro lo esegue. Da £15K, con scope settimanale. Società con sede a Londra."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button asChild size="lg" className="group">
                <Link href="/audit">
                  {isEn ? "Book a scoping call" : "Prenota una call di scoping"}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/case-studies">
                  {isEn ? "See the work" : "Guarda i lavori"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      </div>

      {/* Practice areas grid */}
      <div data-line-anchor="practice">
      <section className="section-lg">
        <div className="container-px">
          <SectionHeading
            align="center"
            className="mx-auto mb-12"
            eyebrow={isEn ? "What we do" : "Cosa facciamo"}
            titleClassName="font-display text-3xl sm:text-[2.25rem] text-ink leading-[1.12] tracking-tight text-balance"
            title={
              isEn ? (
                <>
                  Eight surfaces. <span className="italic" style={{ color: "hsl(var(--accent))" }}>One team.</span>
                </>
              ) : (
                <>
                  Otto superfici. <span className="italic" style={{ color: "hsl(var(--accent))" }}>Un solo team.</span>
                </>
              )
            }
          />
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((s, i) => (
              <Reveal key={s.title} delay={i * 60}>
                <div className="card-steel h-full p-6">
                  <div className="mb-4" style={{ color: "hsl(var(--accent))" }}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg text-ink mb-2 leading-tight">{s.title}</h3>
                  <p className="text-sm text-ink-mute leading-[1.55]">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      </div>

      {/* Packages */}
      <div data-line-anchor="engage">
      <section className="section-lg">
        <div className="container-px">
          <SectionHeading
            align="center"
            className="mx-auto mb-12"
            eyebrow={isEn ? "Engagement formats" : "Formati di ingaggio"}
            titleClassName="font-display text-3xl sm:text-[2.25rem] text-ink leading-[1.12] tracking-tight text-balance"
            title={
              isEn ? (
                <>
                  Three formats.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Pick the one that fits.
                  </span>
                </>
              ) : (
                <>
                  Tre formati.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Scegliete quello giusto.
                  </span>
                </>
              )
            }
          />
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
            {packages.map((p, i) => (
              <Reveal key={p.name} delay={i * 80}>
                <div className="card-steel h-full p-7">
                  <p
                    className="text-[10px] font-mono uppercase tracking-[0.2em] mb-2"
                    style={{ color: "hsl(var(--accent))" }}
                  >
                    {p.timing}
                  </p>
                  <h3 className="font-display text-xl text-ink mb-3 leading-tight">{p.name}</h3>
                  <p className="text-sm text-ink-mute mb-5 leading-[1.55]">{p.desc}</p>
                  <ul className="space-y-1.5">
                    {p.includes.map((inc) => (
                      <li key={inc} className="text-xs text-ink/80 flex items-start gap-2">
                        <span style={{ color: "hsl(var(--accent))" }}>·</span>
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      </div>

      {/* Intake form */}
      <div data-line-anchor="process">
      <section id="intake" className="section-lg relative">
        <div className="container-px relative">
          <SectionHeading
            align="center"
            className="mx-auto mb-10"
            eyebrow={isEn ? "Intake" : "Intake"}
            titleClassName="font-display text-3xl sm:text-[2.5rem] text-ink leading-[1.12] tracking-tight text-balance mb-4"
            title={
              isEn ? (
                <>
                  Start a{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    scoping conversation.
                  </span>
                </>
              ) : (
                <>
                  Avvia una{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    conversazione di scoping.
                  </span>
                </>
              )
            }
            description={
              isEn
                ? "Four short steps. A senior engineer replies within one business day with what we'd ship first and where we'd push back."
                : "Quattro passaggi brevi. Un ingegnere senior risponde entro un giorno lavorativo con cosa porteremmo in produzione per primo e dove faremmo obiezione."
            }
          />
          <div className="max-w-2xl mx-auto">
            <MultiStepIntake />
          </div>
        </div>
      </section>
      </div>

      {/* Closing CTA */}
      <div data-line-anchor="final-cta">
      <section className="section-lg">
        <div className="container-px">
          <div className="max-w-2xl mx-auto text-center">
            <SectionHeading
              align="center"
              className="mx-auto mb-6"
              titleClassName="font-display text-3xl sm:text-[2.5rem] text-ink leading-[1.12] tracking-tight text-balance"
              title={
                isEn ? (
                  <>
                    Tell us what&apos;s broken.{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      We&apos;ll tell you what we&apos;d ship first.
                    </span>
                  </>
                ) : (
                  <>
                    Diteci cosa non funziona.{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      Vi diciamo cosa metteremmo in produzione per primo.
                    </span>
                  </>
                )
              }
            />
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button asChild size="lg" className="group">
                <Link href="/audit">
                  {isEn ? "Book a scoping call" : "Prenota una call di scoping"}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/contact">
                  {isEn ? "Contact us" : "Contattaci"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
