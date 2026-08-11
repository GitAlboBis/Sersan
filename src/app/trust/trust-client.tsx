"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import CompliancePipeline from "@/components/sections/compliance-pipeline";
import { Reveal } from "@/components/ui/reveal";
import { HonestFaq } from "@/components/ui/honest-faq";
import { useLanguage } from "@/components/language-provider";

export function TrustClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  // Ledger anatomy: the regulation NAME is the display element (mono,
  // accent), the STATUS line is derived from each retired card title's own
  // wording ("ISO 27001 (in progress)" → "In progress", "DORA-aligned" →
  // "Aligned", …) — the engagement-acts precedent of rail labels derived
  // from existing scope lines. Descriptions carry over byte-identical.
  const standards = [
    {
      name: "ISO 27001",
      status: isEn ? "In progress" : "In corso",
      desc: isEn
        ? "Information security management system in active certification. Policies, controls, and audit trail aligned to the 2022 standard."
        : "Sistema di gestione della sicurezza delle informazioni in fase di certificazione. Policy, controlli e audit trail allineati allo standard 2022.",
    },
    {
      name: "DORA",
      status: isEn ? "Aligned" : "Allineato",
      desc: isEn
        ? "Operational resilience controls aligned with the EU Digital Operational Resilience Act for financial-services clients."
        : "Controlli di resilienza operativa allineati al Digital Operational Resilience Act (DORA) per clienti del settore finanziario.",
    },
    {
      name: "EU AI Act",
      status: isEn ? "Ready" : "Pronti",
      desc: isEn
        ? "Risk classification, technical documentation, and human-oversight controls built into every AI engagement."
        : "Classificazione del rischio, documentazione tecnica e controlli di supervisione umana integrati in ogni ingaggio AI.",
    },
    {
      name: "GDPR",
      status: isEn ? "Compliant" : "Conformi",
      desc: isEn
        ? "DPA on file, data minimisation by default, EU-only data residency unless explicitly agreed otherwise."
        : "DPA in archivio, minimizzazione dei dati di default, data residency esclusivamente nell'UE salvo diverso accordo esplicito.",
    },
  ];

  // The last three rows are the AI-specific controls the spec (AGENTS.md
  // §Security) names outright — kill switch within 30s, eval gates
  // pre-deploy, output review. They carry `accent: true` so their mono
  // label renders in text-accent (owner decision: the spec wins over the
  // earlier "no accent rows on this table" call).
  const controls: { title: string; desc: string; accent?: boolean }[] = [
    {
      title: isEn ? "Data minimisation" : "Minimizzazione dei dati",
      desc: isEn
        ? "We request the narrowest read access required to do the work, prefer redacted samples over full datasets, and delete engagement data within 30 days of contract termination unless the DPA specifies otherwise."
        : "Richiediamo l'accesso in lettura più ristretto necessario per il lavoro, preferiamo campioni redatti ai dataset completi e cancelliamo i dati di ingaggio entro 30 giorni dalla cessazione del contratto, salvo diversa indicazione del DPA.",
    },
    {
      title: isEn ? "Access control" : "Controllo degli accessi",
      desc: isEn
        ? "Access limited to the engagement team. All client-system access is audit-logged. Credentials rotate on engagement end."
        : "Accesso limitato al team di ingaggio. Tutti gli accessi ai sistemi del cliente sono registrati su audit log. Le credenziali vengono ruotate al termine dell'ingaggio.",
    },
    {
      title: isEn ? "Encryption" : "Cifratura",
      desc: isEn
        ? "Encryption at rest (AES-256) and in transit (TLS 1.3) across all systems we operate. Client systems inherit the client's controls."
        : "Cifratura at-rest (AES-256) e in-transit (TLS 1.3) su tutti i sistemi che gestiamo. I sistemi del cliente ereditano i controlli del cliente.",
    },
    {
      title: isEn ? "Subprocessors" : "Sub-responsabili",
      desc: isEn
        ? "A controlled list of EU-based subprocessors (cloud, observability, document storage). Full list available on request under NDA."
        : "Una lista controllata di sub-responsabili con sede UE (cloud, observability, archiviazione documenti). Elenco completo disponibile su richiesta sotto NDA.",
    },
    {
      title: isEn ? "AI kill switch" : "Kill switch AI",
      desc: isEn
        ? "Every agentic system ships with a kill switch that halts it within 30 seconds."
        : "Ogni sistema agentico include un kill switch che lo ferma entro 30 secondi.",
      accent: true,
    },
    {
      title: isEn ? "Eval gates" : "Eval gate",
      desc: isEn
        ? "No model or agent change deploys without passing its evaluation suite."
        : "Nessuna modifica a modelli o agenti va in produzione senza superare la sua suite di valutazione.",
      accent: true,
    },
    {
      title: isEn ? "Output review" : "Revisione degli output",
      desc: isEn
        ? "Human review paths for AI output wherever it reaches a customer or a regulator."
        : "Percorsi di revisione umana per gli output AI ovunque raggiungano un cliente o un'autorità.",
      accent: true,
    },
  ];

  const gdprRoles = [
    {
      title: isEn ? "Sersan as Controller" : "Sersan come Titolare",
      label: isEn ? "Our own operations" : "Le nostre operazioni",
      items: isEn
        ? [
            "Website inquiries and lead handling",
            "Marketing communications to opted-in business contacts",
            "Hiring and contractor records",
            "Internal product and service improvements (analytics, logging)",
          ]
        : [
            "Richieste dal sito e gestione dei lead",
            "Comunicazioni marketing verso contatti business che hanno dato il consenso",
            "Selezione e record contrattuali con i collaboratori",
            "Miglioramenti interni di prodotto e servizio (analytics, logging)",
          ],
    },
    {
      title: isEn ? "Sersan as Processor" : "Sersan come Responsabile",
      label: isEn ? "Client AI engagements" : "Ingaggi AI con i clienti",
      items: isEn
        ? [
            "Processing data on client instructions under a signed DPA",
            "Application data, model inputs/outputs, telemetry from client systems",
            "Client determines the purposes; we implement technical and organisational controls",
            "Access limited to the engagement team, audit-logged",
          ]
        : [
            "Trattamento dei dati su istruzioni del cliente in base a un DPA firmato",
            "Dati applicativi, input/output dei modelli, telemetria dai sistemi del cliente",
            "Il cliente definisce le finalità; noi implementiamo i controlli tecnici e organizzativi",
            "Accesso limitato al team di ingaggio, con audit log",
          ],
    },
  ];

  // Data-privacy answers absorbed verbatim from the retired /faq page
  // (which now 308-redirects to /consulting#faq). Compliance claims match
  // this page: ISO 27001 in progress, infrastructure in London (UK).
  const privacyFaqs = [
    {
      q: isEn ? "Are you GDPR compliant?" : "Siete conformi al GDPR?",
      a: isEn
        ? "Yes. We have the usual data processing agreements, consent handling, and retention policies in place. Infrastructure is hosted in London (UK) and ISO 27001 certification is in progress."
        : "Sì. Abbiamo in essere data processing agreement, gestione del consenso e policy di retention. L'infrastruttura è ospitata a Londra (Regno Unito) e la certificazione ISO 27001 è in corso.",
    },
    {
      q: isEn
        ? "Who owns the intellectual property?"
        : "A chi appartiene la proprietà intellettuale?",
      a: isEn
        ? "You do. All code, documentation, and deliverables produced during the engagement are yours. We don't retain rights to anything we build for you."
        : "A voi. Tutto il codice, la documentazione e i deliverable prodotti durante l'ingaggio sono vostri. Non manteniamo diritti su nulla di ciò che costruiamo per voi.",
    },
    {
      q: isEn
        ? "Where is your infrastructure hosted?"
        : "Dove è ospitata la vostra infrastruttura?",
      a: isEn
        ? "Cloud providers in London (UK), with encryption at rest and in transit, ISO 27001 certification in progress, and regular security audits. Client data is never mixed between engagements."
        : "Su cloud provider a Londra (Regno Unito), con cifratura at-rest e in-transit, certificazione ISO 27001 in corso e audit di sicurezza regolari. I dati dei clienti non vengono mai mescolati tra ingaggi diversi.",
    },
  ];

  return (
    <div className="min-h-[100svh] pt-24 pb-24 relative">
      <div className="container-px max-w-5xl">
        {/* Header */}
        <div data-line-anchor="hero" className="mb-14 max-w-3xl">
          <p className="eyebrow mb-5 inline-flex items-center gap-2">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "hsl(var(--accent))" }}
              aria-hidden="true"
            />
            ISO 27001 {isEn ? "(in progress)" : "(in corso)"} · DORA · EU AI Act · GDPR
          </p>
          {/* key={language} on every split heading here: SplitText owns the
              subtree once split; a language swap must remount it or React
              reconciles against orphaned nodes (SectionHeading contract). */}
          <h1 key={language} data-split-reveal className="font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.15] tracking-[-0.025em] text-ink text-balance mb-6 pb-1">
            {isEn ? (
              <>
                Compliance is{" "}
                <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                  wired in.
                </span>
              </>
            ) : (
              <>
                La compliance è{" "}
                <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                  cablata dentro.
                </span>
              </>
            )}
          </h1>
          <p className="text-lg text-ink-mute leading-[1.55] mb-8">
            {isEn
              ? "Not bolted on. Every Sersan engagement passes the same control points, each backed by the regulation it satisfies."
              : "Non appiccicata sopra. Ogni ingaggio Sersan attraversa gli stessi punti di controllo, ognuno ancorato alla normativa che soddisfa."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="hero">
              <a href="mailto:alex.s@sersan.dev?subject=DPA%20request">
                {isEn ? "Request DPA" : "Richiedi il DPA"}
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link href="/privacy">
                {isEn ? "Privacy Policy" : "Privacy Policy"}
              </Link>
            </Button>
          </div>
          <p className="mt-5 text-xs text-ink-mute">
            {isEn
              ? "Last updated: May 17, 2026 · This page is a summary; the Privacy Policy and DPA govern."
              : "Ultimo aggiornamento: 17 maggio 2026 · Questa pagina è un riassunto; fanno fede la Privacy Policy e il DPA."}
          </p>
        </div>

        {/* Standards */}
        <section className="mb-20">
          <h2 key={language} data-split-reveal className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight mb-8">
            {isEn ? "Standards" : "Standard"}
          </h2>
          {/* Hairline ledger (service-detail "what we build" grammar):
              STATIC-OPEN rows, hover/focus brighten is the only interaction —
              all paint-only (color + a scaleY tick sweep on constant-space
              elements, zero layout shift). These are compliance claims, so
              the typography stays sober: the regulation NAME is the display
              element, set in MONO (not oversized serif) at
              clamp(1.35rem,2.2vw,1.9rem), accent; the status line sits under
              it in mono micro-caps; the description holds reading width in
              the right column. Rows are non-link (no fake affordance);
              focus-within variants cover any future focusable content.
              Entrances via the site's Reveal/IO contract (RM-gated, SSR
              paints everything). */}
          <ul role="list" className="list-none border-y border-rule/70 divide-y divide-rule/70">
            {standards.map((s, i) => (
              <Reveal as="li" key={s.name} delay={i * 60} className="group py-6 sm:py-7">
                <div className="grid grid-cols-1 gap-y-2.5 sm:grid-cols-[minmax(11rem,15rem)_1fr] sm:items-baseline sm:gap-x-10">
                  <div className="relative pl-3 sm:pl-4">
                    {/* Side tick — sweeps in (scaleY) on hover/focus. */}
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-[0.12em] h-[1.1em] w-[2px] origin-top scale-y-0 bg-accent transition-transform duration-300 ease-[var(--ease-entrance)] group-hover:scale-y-100 group-focus-within:scale-y-100 motion-reduce:transition-none"
                    />
                    <h3 className="font-mono text-[clamp(1.35rem,2.2vw,1.9rem)] leading-[1.1] tracking-[-0.01em] text-accent/80 transition-colors duration-300 group-hover:text-accent group-focus-within:text-accent">
                      {s.name}
                    </h3>
                    <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute transition-colors duration-300 group-hover:text-ink/80 group-focus-within:text-ink/80">
                      {s.status}
                    </p>
                  </div>
                  <p className="max-w-2xl text-sm leading-[1.55] text-ink-mute">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* GDPR Roles */}
        <section data-line-anchor="gdpr-roles" className="mb-20">
          <h2 key={language} data-split-reveal className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight mb-3">
            {isEn ? "GDPR roles" : "Ruoli GDPR"}
          </h2>
          <Reveal>
            <p className="text-sm text-ink-mute leading-[1.55] mb-8 max-w-3xl">
              {isEn
                ? "Under GDPR, responsibilities differ depending on whether an organisation is a Controller or a Processor. Sersan can act in either capacity depending on the engagement."
                : "Ai sensi del GDPR, le responsabilità variano a seconda che l'organizzazione sia Titolare o Responsabile del trattamento. Sersan può agire in entrambi i ruoli a seconda dell'ingaggio."}
            </p>
          </Reveal>
          {/* Two full-width beats, NOT cards: no borders around them — a
              single hairline divider between the pair (vertical on lg where
              they sit side by side, horizontal where they stack). Mono role
              eyebrow + display title + the same item list, all strings
              byte-identical; only the card chrome is retired. */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Stable index keys: an EN↔IT toggle swaps text in place
                (elements never remount, entrances never replay). */}
            {gdprRoles.map((r, i) => (
              <Reveal
                key={`role-${i}`}
                delay={i * 80}
                className={
                  i === 1
                    ? "mt-10 border-t border-rule/70 pt-10 lg:mt-0 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-12"
                    : "lg:pr-12"
                }
              >
                <p
                  className="text-[10px] font-mono uppercase tracking-[0.18em] mb-3"
                  style={{ color: "hsl(var(--accent))" }}
                >
                  {r.label}
                </p>
                <h3 className="font-display text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.02em] text-ink mb-5">
                  {r.title}
                </h3>
                <ul className="space-y-2.5">
                  {r.items.map((it) => (
                    <li key={it} className="text-sm text-ink-mute flex items-start gap-2 leading-[1.5]">
                      <span style={{ color: "hsl(var(--accent))" }} aria-hidden="true">
                        ·
                      </span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-xs text-ink-mute leading-[1.55] max-w-3xl">
            <strong className="text-ink">{isEn ? "Note:" : "Nota:"}</strong>{" "}
            {isEn
              ? "Data subjects whose data we process on a client's behalf should direct rights requests to the client (the Controller). We will route any request we receive to the relevant client within five business days."
              : "Gli interessati i cui dati trattiamo per conto di un cliente devono rivolgere le richieste di esercizio dei diritti al cliente stesso (Titolare). Inoltreremo al cliente competente qualsiasi richiesta ricevuta entro cinque giorni lavorativi."}
          </p>
        </section>

        {/* Compliance pipeline visualization */}
        <div data-line-anchor="pipeline">
          <CompliancePipeline />
        </div>

        {/* Controls */}
        <section data-line-anchor="controls" className="mb-20">
          <h2 key={language} data-split-reveal className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight mb-8">
            {isEn ? "Technical controls" : "Controlli tecnici"}
          </h2>
          {/* Two-column hairline table (engagement-acts deliverables
              grammar): each control is a border-t row with a mono micro-caps
              label (uppercase is CSS-only — DOM strings stay byte-identical)
              and its description at reading size. No card fills, no outer
              box. The three AI-specific controls the spec reserves accent
              for (kill switch / eval gates / output review) close the list
              with their mono label in text-accent; every other row keeps
              the sober muted label. Same row grammar throughout. */}
          <ul role="list" className="grid grid-cols-1 gap-x-12 sm:grid-cols-2">
            {controls.map((c, i) => (
              <Reveal as="li" key={`control-${i}`} delay={i * 60} className="border-t border-rule/60 py-5">
                <h3
                  className={`font-mono text-[11px] uppercase tracking-[0.16em] mb-2.5 ${
                    c.accent ? "text-accent" : "text-ink/80"
                  }`}
                >
                  {c.title}
                </h3>
                <p className="text-sm text-ink-mute leading-[1.55]">{c.desc}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* Data & privacy FAQ — absorbed from the retired /faq page */}
        <section className="mb-20">
          <h2 key={language} data-split-reveal className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight mb-8">
            {isEn ? "Frequently asked questions" : "Domande frequenti"}
          </h2>
          {/* Hairline-divider accordion — the SAME component /audit's
              "Honest answers" uses (@/components/ui/honest-faq, promoted
              from src/app/audit for shared use). Every Q+A string EN+IT
              byte-identical, all answers SSR'd into the DOM (forceMount +
              height-clip). One Reveal wraps the whole list — RM gets no
              entrance animation. */}
          <Reveal className="max-w-3xl">
            <HonestFaq faqs={privacyFaqs} />
          </Reveal>
        </section>

        {/* Retention */}
        <section className="mb-20">
          <h2 key={language} data-split-reveal className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight mb-6">
            {isEn ? "Retention" : "Conservazione"}
          </h2>
          {/* Card chrome stripped to hairlines — content untouched. */}
          <div className="border-y border-rule/70 py-6">
            <p className="max-w-3xl text-sm text-ink/85 leading-[1.6]">
              {isEn
                ? "Engagement data is deleted within 30 days of contract end, unless the DPA specifies a longer regulatory hold. Lead data is retained for 24 months from last contact, then purged. Hiring data is retained for 6 months unless the candidate consents to a longer hold."
                : "I dati di ingaggio vengono cancellati entro 30 giorni dalla fine del contratto, salvo che il DPA preveda un periodo di conservazione più lungo per ragioni normative. I dati dei lead vengono conservati per 24 mesi dall'ultimo contatto e poi eliminati. I dati di selezione del personale vengono conservati per 6 mesi, salvo che il candidato acconsenta a un periodo più lungo."}
            </p>
          </div>
        </section>

        {/* Ritual gap — transparent negative space so the persistent canvas
            (z-0) shows through; the route's 3D ritual object world-anchors
            here and the signature line threads it before the CTA. */}
        <div data-line-anchor="ritual" aria-hidden="true" className="py-28 sm:py-40" />

        {/* Contact */}
        <section data-line-anchor="final-cta">
          <h2 key={language} data-split-reveal className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight mb-6">
            {isEn ? "Contact" : "Contatti"}
          </h2>
          {/* Card chrome stripped to hairlines — content and CTAs untouched. */}
          <div className="border-y border-rule/70 py-7">
            <p className="max-w-3xl text-sm text-ink/85 mb-4 leading-[1.6]">
              {isEn
                ? "For DPA requests, security questionnaires, or data subject requests, contact us directly. Founders answer the trust inbox personally."
                : "Per richieste di DPA, questionari di sicurezza o richieste degli interessati, contattateci direttamente. I founder rispondono personalmente alla casella trust."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="hero">
                <a href="mailto:alex.s@sersan.dev?subject=Trust%20%26%20Security">
                  <Mail className="w-4 h-4 mr-2" />
                  alex.s@sersan.dev
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact">
                  {isEn ? "Contact form" : "Modulo di contatto"}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
