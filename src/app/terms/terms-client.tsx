"use client";

import Link from "next/link";
import { Scale } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function TermsClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const tocSections = isEn
    ? [
        { id: "agreement", label: "Agreement to Terms" },
        { id: "services", label: "Description of Services" },
        { id: "eligibility", label: "Eligibility" },
        { id: "acceptable-use", label: "Acceptable Use" },
        { id: "ip", label: "Intellectual Property" },
        { id: "payment", label: "Payment Terms" },
        { id: "warranties", label: "Disclaimer of Warranties" },
        { id: "liability", label: "Limitation of Liability" },
        { id: "termination", label: "Termination" },
        { id: "governing-law", label: "Governing Law" },
        { id: "changes", label: "Changes to Terms" },
        { id: "contact", label: "Contact Us" },
      ]
    : [
        { id: "agreement", label: "Accettazione dei termini" },
        { id: "services", label: "Descrizione dei servizi" },
        { id: "eligibility", label: "Requisiti" },
        { id: "acceptable-use", label: "Uso accettabile" },
        { id: "ip", label: "Proprietà intellettuale" },
        { id: "payment", label: "Condizioni di pagamento" },
        { id: "warranties", label: "Esclusione di garanzie" },
        { id: "liability", label: "Limitazione di responsabilità" },
        { id: "termination", label: "Recesso" },
        { id: "governing-law", label: "Legge applicabile" },
        { id: "changes", label: "Modifiche ai termini" },
        { id: "contact", label: "Contatti" },
      ];

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-24">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="mb-12 max-w-2xl">
          <div className="mb-5">
            <span className="status-pill">
              <Scale className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">
                {isEn ? "Last updated: January 2026" : "Ultimo aggiornamento: gennaio 2026"}
              </span>
            </span>
          </div>
          <h1 className="heading-display text-balance mb-4">
            {isEn ? "Terms of Service" : "Termini di Servizio"}
          </h1>
          <p className="text-lg text-muted-foreground leading-[1.65]">
            {isEn
              ? "The legal agreement governing your use of SERSAN's platform and services."
              : "L'accordo legale che disciplina l'utilizzo della piattaforma e dei servizi SERSAN."}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
          <aside className="hidden lg:block w-52 shrink-0 sticky top-24 self-start">
            <p className="eyebrow mb-4">{isEn ? "Contents" : "Indice"}</p>
            <nav
              aria-label={isEn ? "Terms sections" : "Sezioni dei termini"}
              className="border-l border-rule/40 pl-4 space-y-0.5"
            >
              {tocSections.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="group flex items-baseline gap-2 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                >
                  <span className="font-mono text-[10px] tabular-nums shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{s.label}</span>
                </a>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="space-y-10 text-foreground/70 leading-[1.72] text-[0.9375rem]">
              <section id="agreement" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "1. Agreement to Terms" : "1. Accettazione dei termini"}
                </h2>
                <p>
                  {isEn
                    ? "By engaging SERSAN for consulting, AI, or engineering services, or by using our website, you agree to be bound by these Terms of Service. If you do not agree, do not use our services."
                    : "Ingaggiando SERSAN per servizi di consulenza, AI o ingegneria, o utilizzando il nostro sito, accettate di essere vincolati da questi Termini di Servizio. Se non li accettate, non utilizzate i nostri servizi."}
                </p>
              </section>

              <section id="services" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "2. Description of Services" : "2. Descrizione dei servizi"}
                </h2>
                <p>
                  {isEn
                    ? "SERSAN provides technical consulting, software engineering, AI/ML implementation, and fractional CTO services. The specific scope of any engagement is governed by a signed statement of work or proposal."
                    : "SERSAN fornisce servizi di consulenza tecnica, ingegneria del software, implementazione AI/ML e Fractional CTO. L'ambito specifico di ogni ingaggio è regolato da uno statement of work o da una proposta firmata."}
                </p>
              </section>

              <section id="eligibility" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "3. Eligibility" : "3. Requisiti"}
                </h2>
                <p>
                  {isEn
                    ? "Services are intended for businesses and authorised representatives over the age of 18. You represent that you have the authority to enter into agreements on behalf of your organisation."
                    : "I servizi sono destinati ad aziende e a rappresentanti autorizzati maggiorenni. Dichiarate di avere l'autorità per stipulare accordi per conto della vostra organizzazione."}
                </p>
              </section>

              <section id="acceptable-use" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "4. Acceptable Use" : "4. Uso accettabile"}
                </h2>
                <p className="mb-4">
                  {isEn
                    ? "You agree not to use our services to:"
                    : "Vi impegnate a non utilizzare i nostri servizi per:"}
                </p>
                <ul className="list-disc pl-6 space-y-2.5">
                  {(isEn
                    ? [
                        "Violate any law, regulation, or third-party right",
                        "Distribute malware or attempt to compromise system security",
                        "Reverse-engineer or copy proprietary methodologies for resale",
                        "Harass or harm any individual or entity",
                      ]
                    : [
                        "Violare leggi, regolamenti o diritti di terze parti",
                        "Distribuire malware o tentare di compromettere la sicurezza dei sistemi",
                        "Effettuare reverse engineering o copiare metodologie proprietarie per rivenderle",
                        "Molestare o danneggiare persone o organizzazioni",
                      ]
                  ).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>

              <section id="ip" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "5. Intellectual Property" : "5. Proprietà intellettuale"}
                </h2>
                <p>
                  {isEn
                    ? "Unless otherwise agreed in writing, all deliverables produced during an engagement become the property of the client upon full payment. SERSAN retains rights to its pre-existing know-how, frameworks, and tooling."
                    : "Salvo diverso accordo scritto, tutti i deliverable prodotti durante un ingaggio diventano di proprietà del cliente a saldo avvenuto. SERSAN mantiene i diritti sul proprio know-how preesistente, framework e tooling."}
                </p>
              </section>

              <section id="payment" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "6. Payment Terms" : "6. Condizioni di pagamento"}
                </h2>
                <p>
                  {isEn
                    ? "Invoices are payable within 14 days unless otherwise specified in the statement of work. Late payments may incur interest at the statutory rate."
                    : "Le fatture sono pagabili entro 14 giorni, salvo diversa indicazione nello statement of work. I pagamenti in ritardo possono comportare interessi al tasso legale."}
                </p>
              </section>

              <section id="warranties" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "7. Disclaimer of Warranties" : "7. Esclusione di garanzie"}
                </h2>
                <p>
                  {isEn
                    ? "Services are provided on an “as is” basis. While we use commercially reasonable efforts to deliver quality work, we make no warranties about specific business outcomes, model accuracy, or fitness for a particular purpose."
                    : "I servizi sono forniti “così come sono”. Pur impegnandoci con ragionevoli sforzi commerciali a fornire un lavoro di qualità, non rilasciamo garanzie su specifici risultati di business, sull'accuratezza dei modelli o sull'idoneità a uno scopo particolare."}
                </p>
              </section>

              <section id="liability" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "8. Limitation of Liability" : "8. Limitazione di responsabilità"}
                </h2>
                <p>
                  {isEn
                    ? "To the maximum extent permitted by law, SERSAN's aggregate liability under any engagement is limited to the fees paid for the relevant scope of work in the preceding 12 months."
                    : "Nei limiti massimi consentiti dalla legge, la responsabilità complessiva di SERSAN per ogni ingaggio è limitata ai corrispettivi pagati per il relativo scope of work nei 12 mesi precedenti."}
                </p>
              </section>

              <section id="termination" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "9. Termination" : "9. Recesso"}
                </h2>
                <p>
                  {isEn
                    ? "Either party may terminate an engagement with reasonable notice as specified in the statement of work. Fees for work performed up to the termination date remain payable."
                    : "Ciascuna parte può recedere da un ingaggio con un preavviso ragionevole secondo quanto previsto dallo statement of work. I corrispettivi per il lavoro svolto fino alla data di recesso restano dovuti."}
                </p>
              </section>

              <section id="governing-law" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "10. Governing Law" : "10. Legge applicabile"}
                </h2>
                <p>
                  {isEn
                    ? "These Terms are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of London."
                    : "Questi Termini sono regolati dalle leggi di Inghilterra e Galles. Eventuali controversie saranno soggette alla giurisdizione esclusiva dei tribunali di Londra."}
                </p>
              </section>

              <section id="changes" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "11. Changes to Terms" : "11. Modifiche ai termini"}
                </h2>
                <p>
                  {isEn
                    ? "We may update these Terms from time to time. Material changes will be posted on this page with a revised “Last updated” date."
                    : "Potremmo aggiornare questi Termini di tanto in tanto. Le modifiche sostanziali verranno pubblicate su questa pagina con una nuova data “Ultimo aggiornamento”."}
                </p>
              </section>

              <section id="contact" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "12. Contact Us" : "12. Contatti"}
                </h2>
                <p className="mb-2">
                  {isEn
                    ? "For any questions about these Terms, contact:"
                    : "Per qualsiasi domanda su questi Termini, contattate:"}
                </p>
                <p className="text-foreground font-medium">SERSAN Limited</p>
                <p>128 City Road, London, EC1V 2NX, United Kingdom</p>
                <p>
                  Email:{" "}
                  <a
                    href="mailto:alex.s@sersan.dev"
                    className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                  >
                    alex.s@sersan.dev
                  </a>
                </p>
              </section>

              <div className="pt-10 border-t border-rule/50">
                <p className="eyebrow mb-5">
                  {isEn ? "Related documents" : "Documenti correlati"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(isEn
                    ? [
                        { href: "/privacy", label: "Privacy Policy" },
                        { href: "/cookies", label: "Cookie Policy" },
                        { href: "/contact", label: "Contact Us" },
                        { href: "/about", label: "About Us" },
                      ]
                    : [
                        { href: "/privacy", label: "Privacy Policy" },
                        { href: "/cookies", label: "Cookie Policy" },
                        { href: "/contact", label: "Contatti" },
                        { href: "/about", label: "Chi siamo" },
                      ]
                  ).map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-border/60 bg-background/40 backdrop-blur-sm text-xs font-medium text-muted-foreground hover:text-foreground hover:border-rule/70 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
