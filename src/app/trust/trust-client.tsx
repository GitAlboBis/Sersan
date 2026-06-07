"use client";

import Link from "next/link";
import { Shield, Lock, Globe, FileText, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import CompliancePipeline from "@/components/sections/compliance-pipeline";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";

export function TrustClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const standards = [
    {
      icon: Shield,
      title: isEn ? "ISO 27001 (in progress)" : "ISO 27001 (in corso)",
      desc: isEn
        ? "Information security management system in active certification. Policies, controls, and audit trail aligned to the 2022 standard."
        : "Sistema di gestione della sicurezza delle informazioni in fase di certificazione. Policy, controlli e audit trail allineati allo standard 2022.",
    },
    {
      icon: Lock,
      title: isEn ? "DORA-aligned" : "Allineato a DORA",
      desc: isEn
        ? "Operational resilience controls aligned with the EU Digital Operational Resilience Act for financial-services clients."
        : "Controlli di resilienza operativa allineati al Digital Operational Resilience Act (DORA) per clienti del settore finanziario.",
    },
    {
      icon: FileText,
      title: isEn ? "EU AI Act-ready" : "Pronti per l'EU AI Act",
      desc: isEn
        ? "Risk classification, technical documentation, and human-oversight controls built into every AI engagement."
        : "Classificazione del rischio, documentazione tecnica e controlli di supervisione umana integrati in ogni ingaggio AI.",
    },
    {
      icon: Globe,
      title: isEn ? "GDPR-compliant" : "Conformi al GDPR",
      desc: isEn
        ? "DPA on file, data minimisation by default, EU-only data residency unless explicitly agreed otherwise."
        : "DPA in archivio, minimizzazione dei dati di default, data residency esclusivamente nell'UE salvo diverso accordo esplicito.",
    },
  ];

  const controls = [
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

  return (
    <div className="min-h-screen pt-24 pb-24 relative">
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
          <h1 className="font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.15] tracking-[-0.025em] text-ink text-balance mb-6 pb-1">
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
          <Reveal>
            <h2 className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight mb-8">
              {isEn ? "Standards" : "Standard"}
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {standards.map((s, i) => (
              <Reveal key={s.title} delay={i * 70}>
                <div className="card-steel p-6">
                  <div className="mb-4" style={{ color: "hsl(var(--accent))" }}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg text-ink mb-2 leading-tight">{s.title}</h3>
                  <p className="text-sm text-ink-mute leading-[1.55]">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* GDPR Roles */}
        <section data-line-anchor="rights" className="mb-20">
          <Reveal>
            <h2 className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight mb-3">
              {isEn ? "GDPR roles" : "Ruoli GDPR"}
            </h2>
            <p className="text-sm text-ink-mute leading-[1.55] mb-8 max-w-3xl">
              {isEn
                ? "Under GDPR, responsibilities differ depending on whether an organisation is a Controller or a Processor. Sersan can act in either capacity depending on the engagement."
                : "Ai sensi del GDPR, le responsabilità variano a seconda che l'organizzazione sia Titolare o Responsabile del trattamento. Sersan può agire in entrambi i ruoli a seconda dell'ingaggio."}
            </p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gdprRoles.map((r, i) => (
              <Reveal key={r.title} delay={i * 80}>
                <div className="card-steel p-6">
                  <p
                    className="text-[10px] font-mono uppercase tracking-[0.18em] mb-2"
                    style={{ color: "hsl(var(--accent))" }}
                  >
                    {r.label}
                  </p>
                  <h3 className="font-display text-lg text-ink mb-4 leading-tight">{r.title}</h3>
                  <ul className="space-y-2">
                    {r.items.map((it) => (
                      <li key={it} className="text-sm text-ink-mute flex items-start gap-2 leading-[1.5]">
                        <span style={{ color: "hsl(var(--accent))" }} aria-hidden="true">
                          ·
                        </span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
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
        <section data-line-anchor="subprocessors" className="mb-20">
          <Reveal>
            <h2 className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight mb-8">
              {isEn ? "Technical controls" : "Controlli tecnici"}
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {controls.map((c, i) => (
              <Reveal key={c.title} delay={i * 70}>
                <div className="card-steel p-6">
                  <h3 className="font-display text-lg text-ink mb-2 leading-tight">{c.title}</h3>
                  <p className="text-sm text-ink-mute leading-[1.55]">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Retention */}
        <section className="mb-20">
          <Reveal>
            <h2 className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight mb-6">
              {isEn ? "Retention" : "Conservazione"}
            </h2>
          </Reveal>
          <div className="card-steel p-7">
            <div className="flex items-start gap-4 mb-4">
              <div
                className="p-2.5 rounded-lg border border-rule/60 bg-surface"
                style={{ color: "hsl(var(--accent))" }}
              >
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm text-ink/85 leading-[1.6]">
                  {isEn
                    ? "Engagement data is deleted within 30 days of contract end, unless the DPA specifies a longer regulatory hold. Lead data is retained for 24 months from last contact, then purged. Hiring data is retained for 6 months unless the candidate consents to a longer hold."
                    : "I dati di ingaggio vengono cancellati entro 30 giorni dalla fine del contratto, salvo che il DPA preveda un periodo di conservazione più lungo per ragioni normative. I dati dei lead vengono conservati per 24 mesi dall'ultimo contatto e poi eliminati. I dati di selezione del personale vengono conservati per 6 mesi, salvo che il candidato acconsenta a un periodo più lungo."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section data-line-anchor="final-cta">
          <Reveal>
            <h2 className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight mb-6">
              {isEn ? "Contact" : "Contatti"}
            </h2>
          </Reveal>
          <div className="card-steel p-7">
            <p className="text-sm text-ink/85 mb-4 leading-[1.6]">
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
