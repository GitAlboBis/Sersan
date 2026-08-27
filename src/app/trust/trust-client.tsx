"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import CompliancePipeline from "@/components/sections/compliance-pipeline";
import { Reveal } from "@/components/ui/reveal";
import { HonestFaq } from "@/components/ui/honest-faq";
import { useLanguage } from "@/components/language-provider";
import { COMPLIANCE, POSITIONING, pick } from "@/data/copy";
import { CONTACT_EMAIL } from "@/lib/site";

export function TrustClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  // Ledger anatomy: the regulation NAME is the display element (mono,
  // accent), the STATUS line sits under it. 2026-08 repositioning: the
  // status line is POSTURE, never an attestation — a bare "Compliant" /
  // "Ready" / "In progress" reads as a held certification to a procurement
  // reader, and SerSan holds none. See COMPLIANCE in @/data/copy.
  const standards = [
    {
      name: "ISO 27001",
      status: isEn ? "Not certified" : "Non certificati",
      desc: isEn
        ? "We hold no ISO 27001 certification and don't claim one. We use the 2022 standard as a control reference where a client's procurement needs that vocabulary."
        : "Non abbiamo la certificazione ISO 27001 e non la rivendichiamo. Usiamo lo standard 2022 come riferimento per i controlli quando le procedure d'acquisto del cliente lo richiedono.",
    },
    {
      name: "DORA",
      status: isEn ? "Design reference" : "Riferimento progettuale",
      desc: isEn
        ? "Operational-resilience controls — continuity, incident handling, third-party risk — designed in where a financial-services client's obligations require them."
        : "Controlli di resilienza operativa — continuità, gestione degli incidenti, rischio di terze parti — progettati quando gli obblighi del cliente lo richiedono.",
    },
    {
      name: "EU AI Act",
      status: isEn ? "Scope-specific" : "Specifico per progetto",
      desc: isEn
        ? "Risk classification, technical documentation and human-oversight controls, built into AI systems whose intended use brings them into scope."
        : "Classificazione del rischio, documentazione tecnica e controlli di supervisione umana, integrati nei sistemi AI il cui uso previsto rientra nell'ambito.",
    },
    {
      name: "GDPR",
      status: isEn ? "Contractual basis" : "Base contrattuale",
      desc: isEn
        ? `DPA on file, data minimisation by default. ${COMPLIANCE.hosting.en}`
        : `DPA in archivio, minimizzazione dei dati di default. ${COMPLIANCE.hosting.it}`,
    },
  ];

  // The last three rows are the AI-specific controls — stop path, graded
  // release, human review. They carry `accent: true` so their mono label
  // renders in text-accent. 2026-08: the measured absolutes ("within 30
  // seconds", "all systems we operate", "never mixed") are gone — they were
  // guarantees nobody had instrumented, on jobs that don't all carry them.
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
        ? "Access limited to the people working on your engagement, and logged on the systems we operate. Systems you own keep your own logging. Credentials are revoked at the end."
        : "Accesso limitato alle persone che lavorano al vostro progetto, registrato sui sistemi che gestiamo noi. I vostri sistemi mantengono il vostro logging. Le credenziali vengono revocate alla fine.",
    },
    {
      title: isEn ? "Encryption" : "Cifratura",
      desc: isEn
        ? "Encryption at rest and in transit on the systems we operate — AES-256 and modern TLS as standard. Systems you own keep the controls you already have."
        : "Cifratura at-rest e in-transit sui sistemi che gestiamo: AES-256 e TLS moderno come impostazione standard. I sistemi vostri mantengono i controlli che avete già.",
    },
    {
      title: isEn ? "Subprocessors" : "Sub-responsabili",
      desc: isEn
        ? "Site-collected data: Vercel (hosting, forms, cookieless analytics) and Resend (email delivery). No site database. Engagement data: cloud hosting (AWS, Google Cloud, Azure) and model APIs (Anthropic, OpenAI, Google), scoped per project. Named in the DPA, no NDA required."
        : "Dati raccolti dal sito: Vercel (hosting, form, analytics senza cookie) e Resend (invio email). Nessun database del sito. Dati di progetto: hosting cloud (AWS, Google Cloud, Azure) e API dei modelli (Anthropic, OpenAI, Google), definiti progetto per progetto. Elencati nel DPA, senza NDA.",
    },
    {
      title: isEn ? "AI stop path" : "Percorso di arresto AI",
      desc: isEn
        ? "Agentic systems ship with a documented way to stop them, operable by a named person on your side."
        : "I sistemi agentici includono un modo documentato per fermarli, azionabile da una persona del vostro team.",
      accent: true,
    },
    {
      title: isEn ? "Eval gates" : "Eval gate",
      desc: isEn
        ? "AI changes are graded against a test set before release, not judged by feel."
        : "Le modifiche AI vengono valutate su un set di test prima del rilascio, non a sensazione.",
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
      title: isEn ? "SerSan as Controller" : "SerSan come Titolare",
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
      title: isEn ? "SerSan as Processor" : "SerSan come Responsabile",
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

  // Data-privacy answers absorbed from the retired /faq page (which now
  // 308-redirects to /consulting#faq). 2026-08: the IP answer now matches
  // the CONTRACT (/terms §5 — transfer on full payment, pre-existing
  // know-how reserved) instead of over-promising against it, and the
  // data-protection answer uses COMPLIANCE.hosting so it cannot drift
  // again. The standalone hosting question was redundant with it and now
  // answers the de-scarer this page most needs: an SME reading a DORA /
  // EU AI Act page has to be told the controls are proportional
  // (COMPLIANCE.proportional) and that regulation is not an entry bar.
  const privacyFaqs = [
    {
      q: isEn
        ? "How do you handle data protection?"
        : "Come gestite la protezione dei dati?",
      a: isEn
        ? `Under a DPA, with data minimisation by default, documented retention and a named contact for rights requests. ${COMPLIANCE.hosting.en}`
        : `Con un DPA, minimizzazione dei dati di default, retention documentata e un referente per le richieste degli interessati. ${COMPLIANCE.hosting.it}`,
    },
    {
      q: isEn
        ? "Who owns the intellectual property?"
        : "A chi appartiene la proprietà intellettuale?",
      a: isEn
        ? "You do. Code, documentation and deliverables transfer to you on full payment, with no licence back to us. We keep only our pre-existing know-how, frameworks and internal tooling — never your system."
        : "A voi. Codice, documentazione e deliverable passano a voi a saldo avvenuto, senza licenze di ritorno. Tratteniamo solo know-how, framework e tooling interni preesistenti: mai il vostro sistema.",
    },
    {
      q: isEn
        ? "Do we need to be a regulated company to work with you?"
        : "Bisogna essere un'azienda regolamentata per lavorare con voi?",
      a: isEn
        ? `No. Most of what we build carries no sector regulation at all. ${COMPLIANCE.proportional.en} Where we host the work, it runs on cloud providers in the UK and EU, encrypted at rest and in transit, under its own project and credentials.`
        : `No. Gran parte di ciò che costruiamo non è soggetta ad alcuna normativa di settore. ${COMPLIANCE.proportional.it} Quando l'hosting è nostro, il lavoro gira su cloud provider nel Regno Unito e nell'UE, con cifratura at-rest e in-transit, sul proprio ambiente e con le proprie credenziali.`,
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
            {isEn
              ? "Ownership · Data handling · GDPR · DORA · EU AI Act"
              : "Proprietà · Dati · GDPR · DORA · EU AI Act"}
          </p>
          {/* key={language} on every split heading here: SplitText owns the
              subtree once split; a language swap must remount it or React
              reconciles against orphaned nodes (SectionHeading contract). */}
          <h1 key={language} data-split-reveal className="font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.15] tracking-[-0.025em] text-ink text-balance mb-6 pb-1">
            {isEn ? (
              <>
                Your code. Your data.{" "}
                <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                  Your call.
                </span>
              </>
            ) : (
              <>
                Codice e dati sono vostri.{" "}
                <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                  La scelta anche.
                </span>
              </>
            )}
          </h1>
          <p className="text-lg text-ink-mute leading-[1.55] mb-8">
            {pick(isEn, POSITIONING.ownership)}
            {isEn
              ? " Controls scale with the build."
              : " I controlli crescono con il sistema."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="hero">
              <a href={`mailto:${CONTACT_EMAIL}?subject=DPA%20request`}>
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
              ? "Last updated: August 27, 2026 · This page is a summary; the Privacy Policy and DPA govern."
              : "Ultimo aggiornamento: 27 agosto 2026 · Questa pagina è un riassunto; fanno fede la Privacy Policy e il DPA."}
          </p>
        </div>

        {/* Standards */}
        <section className="mb-20">
          <h2 key={language} data-split-reveal className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight mb-3">
            {isEn ? "Standards" : "Standard"}
          </h2>
          {/* Posture, never a status badge. SerSan holds no certification;
              the honesty asset states that outright before the ledger. */}
          <Reveal>
            <p className="text-sm text-ink-mute leading-[1.55] mb-8 max-w-3xl">
              {pick(isEn, COMPLIANCE.noClaims)} {pick(isEn, COMPLIANCE.posture)}
            </p>
          </Reveal>
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
                ? "Under GDPR, responsibilities differ depending on whether an organisation is a Controller or a Processor. SerSan can act in either capacity depending on the engagement."
                : "Ai sensi del GDPR, le responsabilità variano a seconda che l'organizzazione sia Titolare o Responsabile del trattamento. SerSan può agire in entrambi i ruoli a seconda dell'ingaggio."}
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
              ? "Data subjects whose data we process on a client's behalf should direct rights requests to the client (the Controller). We will route any request we receive to the relevant client without undue delay, and tell you we have."
              : "Gli interessati i cui dati trattiamo per conto di un cliente devono rivolgere le richieste di esercizio dei diritti al cliente stesso (Titolare). Inoltreremo al cliente competente qualsiasi richiesta ricevuta senza ingiustificato ritardo, e ve lo comunicheremo."}
          </p>
        </section>

        {/* Compliance pipeline visualization */}
        <div data-line-anchor="pipeline">
          <CompliancePipeline />
        </div>

        {/* Controls */}
        <section data-line-anchor="controls" className="mb-20">
          <h2 key={language} data-split-reveal className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight mb-3">
            {isEn ? "Technical controls" : "Controlli tecnici"}
          </h2>
          {/* Proportionality, stated before the list: a €5k workflow
              automation does not carry a regulated platform's overhead. */}
          <Reveal>
            <p className="text-sm text-ink-mute leading-[1.55] mb-8 max-w-3xl">
              {pick(isEn, COMPLIANCE.proportional)}
            </p>
          </Reveal>
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
                ? "For DPA requests, security questionnaires or data subject requests, write to us directly. A founder answers, whether you have a procurement team or not."
                : "Per richieste di DPA, questionari di sicurezza o richieste degli interessati, scriveteci direttamente. Risponde un founder, che abbiate un ufficio acquisti o no."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="hero">
                <a href={`mailto:${CONTACT_EMAIL}?subject=Trust%20%26%20Security`}>
                  <Mail className="w-4 h-4 mr-2" />
                  {CONTACT_EMAIL}
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
