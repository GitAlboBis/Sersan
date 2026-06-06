"use client";

import Link from "next/link";
import { Mail, MapPin, Clock, Building2, ArrowRight, Phone, MessageCircle } from "lucide-react";
import { LinkedinIcon } from "@/components/icons/brand";
import { Button } from "@/components/ui/button";
import { founders } from "@/data/founders";
import { ContactForm } from "@/components/contact-form";
import { CalEmbed } from "@/components/cal-embed";
import { useLanguage } from "@/components/language-provider";

export function ContactClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      value: "alex.s@sersan.dev",
      href: "mailto:alex.s@sersan.dev",
    },
    {
      icon: Phone,
      title: isEn ? "Phone" : "Telefono",
      value: "+39 348 299 9403",
      href: "tel:+393482999403",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      value: isEn ? "Chat on WhatsApp" : "Scrivici su WhatsApp",
      href: "https://wa.me/393482999403",
    },
    {
      icon: Building2,
      title: isEn ? "Company" : "Società",
      value: "SERSAN Limited",
      href: null as string | null,
    },
    {
      icon: MapPin,
      title: isEn ? "Address" : "Indirizzo",
      value: "128 City Road, London, EC1V 2NX",
      href: "https://maps.google.com/?q=128+City+Road+London+EC1V+2NX",
    },
    {
      icon: Clock,
      title: isEn ? "Response Time" : "Tempi di risposta",
      value: isEn ? "Within 1 business day" : "Entro 1 giorno lavorativo",
      href: null as string | null,
    },
  ];

  const relatedLinks = isEn
    ? [
        { href: "/consulting", label: "Consulting" },
        { href: "/case-studies", label: "Selected work" },
        { href: "/about", label: "About" },
        { href: "/trust", label: "Trust" },
      ]
    : [
        { href: "/consulting", label: "Consulenza" },
        { href: "/case-studies", label: "Lavori selezionati" },
        { href: "/about", label: "Chi siamo" },
        { href: "/trust", label: "Trust" },
      ];

  return (
    <div className="min-h-screen relative">
      {/* Hero */}
      <section className="pt-24 pb-12 md:pt-32 md:pb-16 relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2 w-[80vw] h-[40vw] max-w-[1100px] max-h-[600px] blur-3xl opacity-30"
            style={{ background: "radial-gradient(closest-side, hsl(var(--accent) / 0.22), transparent 70%)" }}
          />
        </div>
        <div className="container-px relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <p className="eyebrow mb-6 inline-flex items-center justify-center gap-2">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--accent))" }}
                aria-hidden="true"
              />
              {isEn
                ? "Senior reply within 1 business day"
                : "Risposta senior entro 1 giorno lavorativo"}
            </p>
            <h1 className="font-display text-[clamp(2.25rem,7vw,4.5rem)] leading-[1.15] tracking-[-0.02em] text-ink text-balance mb-8 pb-1">
              {isEn ? (
                <>
                  Talk to the people who&apos;ll{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    build it.
                  </span>
                </>
              ) : (
                <>
                  Parla con le persone che lo{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    costruiranno.
                  </span>
                </>
              )}
            </h1>
            <p className="text-lg text-ink-mute max-w-xl mx-auto">
              {isEn
                ? "No SDR funnel, no junior triage. A short note and a senior engineer reads it."
                : "Nessun funnel di SDR, nessun triage junior. Una nota breve, e la legge un ingegnere senior."}
            </p>
          </div>
        </div>
      </section>

      {/* Form + info */}
      <section className="section relative">
        <div className="container-px">
          <div className="grid lg:grid-cols-5 gap-10 lg:gap-14 max-w-6xl mx-auto">
            {/* Info */}
            <div className="lg:col-span-2 space-y-10">
              <div>
                <p className="eyebrow mb-4" style={{ color: "hsl(var(--accent))" }}>
                  {isEn ? "Reach us directly" : "Contattaci direttamente"}
                </p>
                <h2 className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight mb-8">
                  {isEn ? "Same channels, no triage." : "Gli stessi canali, nessun triage."}
                </h2>

                <div className="space-y-5">
                  {contactInfo.map((info, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div
                        className="p-2.5 rounded-lg shrink-0 border border-rule/60 bg-surface/40 backdrop-blur-sm"
                        style={{ color: "hsl(var(--accent))" }}
                      >
                        <info.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-1">
                          {info.title}
                        </p>
                        {info.href ? (
                          <a
                            href={info.href}
                            className="text-ink hover:text-[hsl(var(--accent))] transition-colors text-sm break-all"
                          >
                            {info.value}
                          </a>
                        ) : (
                          <p className="text-ink text-sm">{info.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Founder LinkedIns */}
                <div className="pt-8 mt-8 border-t border-rule/50">
                  <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-3">
                    {isEn ? "Talk to a founder" : "Scrivi a un founder"}
                  </p>
                  <div className="flex flex-col gap-2">
                    {founders.map((f) => (
                      <a
                        key={f.name}
                        href={f.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-surface/60 transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={f.image}
                          alt={f.name}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-rule/60 group-hover:ring-[hsl(var(--accent)/0.5)] transition"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-ink leading-tight truncate">{f.name}</p>
                          <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-mute truncate">
                            {isEn ? f.roleEn : f.roleIt}
                          </p>
                        </div>
                        <LinkedinIcon className="w-3.5 h-3.5 text-ink-mute group-hover:text-[hsl(var(--accent))] transition-colors shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Audit upsell */}
              <div className="p-6 rounded-xl border border-rule/70 bg-surface/40 backdrop-blur-sm">
                <p
                  className="text-[10px] font-mono uppercase tracking-[0.16em] mb-3"
                  style={{ color: "hsl(var(--accent))" }}
                >
                  {isEn ? "Alternative path" : "Percorso alternativo"}
                </p>
                <h3 className="font-display text-xl text-ink mb-3 leading-tight">
                  {isEn ? (
                    <>
                      Skip the form.{" "}
                      <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                        Book a working call.
                      </span>
                    </>
                  ) : (
                    <>
                      Salta il modulo.{" "}
                      <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                        Prenota una working call.
                      </span>
                    </>
                  )}
                </h3>
                <p className="text-sm text-ink-mute mb-5 leading-relaxed">
                  {isEn
                    ? "One week, inside your stack. A written report on what's broken, what's manual, and what AI can actually do."
                    : "Una settimana, dentro il vostro stack. Un report scritto su cosa non funziona, cosa è manuale e cosa l'AI può davvero fare."}
                </p>
                <Button asChild variant="hero" size="lg" className="w-full">
                  <Link href="/audit">
                    {isEn ? "Book a scoping call" : "Prenota una call di scoping"}
                  </Link>
                </Button>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              <div className="p-7 sm:p-9 rounded-xl border border-rule/70 bg-surface/40 backdrop-blur-sm">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Or pick a slot directly — Cal.com */}
      <section className="section relative border-t border-rule/40">
        <div className="container-px">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-10 lg:gap-14 items-start">
            <div className="lg:col-span-2">
              <p className="eyebrow mb-4" style={{ color: "hsl(var(--accent))" }}>
                {isEn ? "Or pick a slot directly" : "O scegliete uno slot direttamente"}
              </p>
              <h2 className="font-display text-2xl sm:text-[2rem] text-ink leading-[1.15] tracking-tight mb-5">
                {isEn ? (
                  <>
                    Skip the inbox.{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      Book the call.
                    </span>
                  </>
                ) : (
                  <>
                    Saltate l&apos;inbox.{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      Prenotate la call.
                    </span>
                  </>
                )}
              </h2>
              <p className="text-base text-ink-mute leading-[1.6] mb-4">
                {isEn
                  ? "Pick a 30-minute slot. We'll reply with a calendar link within 1 business day."
                  : "Scegliete uno slot di 30 minuti. Vi rispondiamo con un link al calendario entro 1 giorno lavorativo."}
              </p>
              <p className="text-sm text-ink-mute leading-[1.55]">
                {isEn
                  ? "No SDR, no junior triage. The person on the call is a senior engineer who'd also be doing the work."
                  : "Niente SDR, niente triage junior. La persona in call è un ingegnere senior che farebbe anche il lavoro."}
              </p>
            </div>
            <div className="lg:col-span-3">
              <CalEmbed slug="sersan/scoping-call" theme="dark" />
            </div>
          </div>
        </div>
      </section>

      {/* Related row */}
      <section className="section-sm border-t border-rule/40">
        <div className="container-px">
          <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {relatedLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute hover:text-[hsl(var(--accent))] transition-colors inline-flex items-center gap-1.5"
              >
                {l.label} <ArrowRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
