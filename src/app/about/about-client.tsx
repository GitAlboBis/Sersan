"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LinkedinIcon } from "@/components/icons/brand";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import OurWhy from "@/components/sections/our-why";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { founders } from "@/data/founders";
import { useLanguage } from "@/components/language-provider";
import { START_HREF } from "@/lib/site";

export function AboutClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const pillars = [
    {
      num: "01",
      title: isEn ? "Senior or nothing" : "Senior o niente",
      body: isEn
        ? "The people who scoped the work do the work. No bait-and-switch. No layer of juniors between you and the engineer."
        : "Chi ha definito il lavoro lo esegue. Niente bait-and-switch. Nessuno strato di junior tra voi e l'ingegnere.",
    },
    {
      num: "02",
      title: isEn ? "Weekly scope" : "Scope settimanale",
      body: isEn
        ? "No multi-year retainers. We re-earn the next week of work every week. Lock-in is a smell, not a feature."
        : "Niente retainer pluriennali. Ci riconquistiamo la settimana successiva ogni settimana. Il lock-in è un campanello d'allarme, non una feature.",
    },
    {
      num: "03",
      title: isEn ? "We operate it" : "Lo facciamo girare noi",
      body: isEn
        ? "We don't write a deck and ship the codebase offshore. If we built it, we're on the bridge when it goes wrong."
        : "Non scriviamo una slide e mandiamo il codice offshore. Se l'abbiamo costruito, siamo in plancia quando qualcosa va storto.",
    },
  ];

  return (
    <div className="min-h-screen text-foreground">
      <div className="pt-20 pb-20 relative">
        {/* Hero */}
        <section data-line-anchor="hero" className="relative overflow-hidden mb-20 sm:mb-24 py-20 md:py-28">
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
            <div
              className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[85vw] h-[45vw] max-w-[1200px] max-h-[700px] blur-3xl opacity-30"
              style={{ background: "radial-gradient(closest-side, hsl(var(--accent) / 0.22), transparent 70%)" }}
            />
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] h-[30vw] max-w-[800px] max-h-[480px] blur-2xl opacity-25"
              style={{ background: "radial-gradient(closest-side, hsl(var(--accent) / 0.18), transparent 70%)" }}
            />
          </div>

          <div className="container-px relative z-10">
            {/* H1 lives OUTSIDE the Reveal: HeadingChoreographer owns its
                line-mask reveal (data-split-reveal) — wrapping it in the block
                fade would double-animate. Eyebrow entrance = LabelScrambler
                decode; sub + CTAs keep the Reveal fade, slightly delayed so
                they sequence under the rising lines. */}
            <div className="max-w-4xl mx-auto text-center">
              <p className="eyebrow mb-6 inline-flex items-center justify-center gap-2">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: "hsl(var(--accent))" }}
                  aria-hidden="true"
                />
                {isEn ? "The founding pair" : "La coppia fondatrice"}
              </p>
              {/* key={language}: SplitText owns this subtree once split; a
                  language swap must remount it or React reconciles against
                  orphaned nodes (same contract as SectionHeading's h2). */}
              <h1 key={language} data-split-reveal className="font-display text-[clamp(2.5rem,8vw,5.5rem)] leading-[1.15] tracking-[-0.025em] text-ink text-balance mb-8 pb-1">
                {isEn ? (
                  <>
                    Two operators.{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      One thesis.
                    </span>
                  </>
                ) : (
                  <>
                    Due operatori.{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      Una sola tesi.
                    </span>
                  </>
                )}
              </h1>
              <Reveal delay={150}>
                <p className="text-lg sm:text-xl text-ink-mute max-w-2xl mx-auto leading-[1.5]">
                  {isEn
                    ? "Deep engineering and deep commercial in the same room. Both senior. Both staffed on every engagement. No layer of juniors between you and the people doing the work."
                    : "Ingegneria profonda e dimensione commerciale profonda nella stessa stanza. Entrambi senior. Entrambi assegnati a ogni ingaggio. Nessuno strato di junior tra voi e le persone che fanno il lavoro."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-10">
                  <Button asChild size="lg" className="group">
                    <Link href={START_HREF}>
                      {isEn ? "Book a 30-min scoping call" : "Prenota una call di scoping di 30 min"}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/consulting">
                      {isEn ? "Practice areas" : "Aree di intervento"}
                    </Link>
                  </Button>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <div data-line-anchor="why">
          <OurWhy />
        </div>

        {/* The Founding Pair */}
        <section data-line-anchor="founders" className="container-px mb-24">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-4">
              {isEn
                ? "Two opposite skill sets, one thesis."
                : "Due competenze opposte, un'unica tesi."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {founders.map((f, i) => (
              <Reveal key={f.name} delay={i * 100} className="h-full">
              <div
                id={f.anchor}
                className="card-steel rounded-2xl p-8 h-full scroll-mt-32"
              >
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-20 h-20 rounded-full overflow-hidden shrink-0 ring-2 ring-primary/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.image}
                      alt={f.name}
                      className="w-full h-full object-cover object-[50%_20%]"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold">{f.name}</h3>
                      <a
                        href={f.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                        aria-label={`${f.name} LinkedIn`}
                      >
                        <LinkedinIcon className="w-5 h-5" />
                      </a>
                    </div>
                    <p className="text-primary font-medium text-sm">{isEn ? f.roleEn : f.roleIt}</p>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">{isEn ? f.bioEn : f.bioIt}</p>
              </div>
              </Reveal>
            ))}
          </div>

          <p className="text-center italic font-serif text-muted-foreground/80 max-w-2xl mx-auto mt-12 text-lg leading-relaxed">
            {isEn
              ? "The founding thesis: deep engineering and deep commercial in the same room. The combination is uncommon, and is the firm."
              : "La tesi fondante: ingegneria profonda e dimensione commerciale profonda nella stessa stanza. La combinazione è rara, ed è la firma."}
          </p>
        </section>

        {/* Mission, quiet, single statement */}
        <section className="mb-24">
          <div className="container-px">
            <div className="max-w-3xl mx-auto text-center">
              <p className="eyebrow mb-6">{isEn ? "The job" : "Il mestiere"}</p>
              <blockquote
                className="font-display text-2xl sm:text-[2rem] leading-[1.2] text-ink text-balance italic"
                style={{ borderLeft: "2px solid hsl(var(--accent))" }}
              >
                <span className="block pl-6 text-left">
                  {isEn
                    ? "“Strategy without execution is a slideshow. We ship production systems, and we operate them when they break.”"
                    : "“La strategia senza esecuzione è una presentazione. Noi mandiamo in produzione sistemi reali, e li facciamo girare quando si rompono.”"}
                </span>
              </blockquote>
            </div>
          </div>
        </section>

        {/* Three pillars */}
        <section data-line-anchor="rules" className="container-px mb-24">
          <SectionHeading
            align="center"
            className="mx-auto mb-12 max-w-3xl"
            eyebrow={isEn ? "How we work" : "Come lavoriamo"}
            title={
              isEn ? (
                <>
                  Three rules.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Non-negotiable.
                  </span>
                </>
              ) : (
                <>
                  Tre regole.{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    Non negoziabili.
                  </span>
                </>
              )
            }
          />

          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {pillars.map((p, i) => (
              <Reveal key={p.num} delay={i * 90} className="h-full">
              <div className="card-steel h-full p-6 lg:p-7 group">
                <p
                  className="text-[10px] font-mono uppercase tracking-[0.2em] mb-4"
                  style={{ color: "hsl(var(--accent))" }}
                >
                  {p.num}
                </p>
                <h3 className="font-display text-xl text-ink mb-3 leading-tight">{p.title}</h3>
                <p className="text-sm text-ink-mute leading-[1.6]">{p.body}</p>
              </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Verifiable proof strip */}
        <section className="mb-24">
          <div className="container-px">
            <div className="max-w-4xl mx-auto">
              <p className="text-center eyebrow mb-8" style={{ color: "hsl(var(--accent))" }}>
                {isEn ? "Verifiable, not vibes" : "Verificabile, non a sensazione"}
              </p>
              {/* Bare small ints carry their unit in the sibling span, so the
                  CountUps need `force` (no metric token to satisfy the global
                  parser) and a shorter run (1.2s on a single digit reads
                  glitchy, 0.8s reads like a settle). */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-8 text-center">
                <div>
                  <div className="font-display text-4xl md:text-5xl text-ink leading-none mb-2">
                    <CountUp value="8" duration={0.8} force />
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      {" "}
                      {isEn ? "yrs" : "anni"}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute">
                    {isEn ? "Senior delivery" : "Delivery senior"}
                  </p>
                </div>
                <div>
                  <div className="font-display text-4xl md:text-5xl text-ink leading-none mb-2">
                    <CountUp value="5" duration={0.8} force />
                  </div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute">
                    {isEn ? "Tier-1 institutions" : "Istituzioni tier-1"}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <div className="font-display text-4xl md:text-5xl text-ink leading-none mb-2">
                    <CountUp value="1" duration={0.8} force />
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      {" "}
                      PhD
                    </span>
                  </div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute">
                    {isEn ? "Applied Mathematics, LSE" : "Matematica Applicata, LSE"}
                  </p>
                </div>
              </div>
              <p className="text-center text-[10px] font-mono uppercase tracking-[0.18em] text-ink-mute mt-10">
                Revolut · JP Morgan · Deloitte · Brevan Howard · Accenture
              </p>
            </div>
          </div>
        </section>

        {/* Ritual gap — transparent negative space so the persistent canvas
            (z-0) shows through; the route's 3D ritual object world-anchors
            here and the signature line threads it before the CTA. */}
        <div data-line-anchor="ritual" aria-hidden="true" className="py-28 sm:py-40" />

        {/* Final beat */}
        <section data-line-anchor="final-cta" className="container-px">
          <div className="max-w-3xl mx-auto text-center py-12">
            <SectionHeading
              align="center"
              className="mx-auto mb-8 max-w-3xl"
              eyebrow={isEn ? "The next step" : "Il prossimo passo"}
              title={
                isEn ? (
                  <>
                    One week. Inside your stack.{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      A written verdict.
                    </span>
                  </>
                ) : (
                  <>
                    Una settimana. Dentro il vostro stack.{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      Un verdetto scritto.
                    </span>
                  </>
                )
              }
            />
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button asChild size="lg" className="group">
                <Link href={START_HREF}>
                  {isEn ? "Book a 30-min scoping call" : "Prenota una call di scoping di 30 min"}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/contact">
                  {isEn ? "Or just say hello" : "O semplicemente salutaci"}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
