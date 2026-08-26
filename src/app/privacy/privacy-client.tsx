"use client";

import Link from "next/link";
import { ChevronDown, FileText } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";
import { CONTACT_EMAIL } from "@/lib/site";

export function PrivacyClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const tocSections = isEn
    ? [
        { id: "intro", label: "Introduction" },
        { id: "info-collected", label: "Information We Collect" },
        { id: "how-used", label: "How We Use Your Information" },
        { id: "sharing", label: "Data Sharing & Disclosure" },
        { id: "security", label: "Data Security" },
        { id: "retention", label: "Data Retention" },
        { id: "rights", label: "Your Rights" },
        { id: "cookies", label: "Cookies" },
        { id: "third-party", label: "Third-Party Links" },
        { id: "changes", label: "Changes to This Policy" },
        { id: "contact", label: "Contact Us" },
      ]
    : [
        { id: "intro", label: "Introduzione" },
        { id: "info-collected", label: "Informazioni che raccogliamo" },
        { id: "how-used", label: "Come usiamo le informazioni" },
        { id: "sharing", label: "Condivisione e divulgazione dei dati" },
        { id: "security", label: "Sicurezza dei dati" },
        { id: "retention", label: "Conservazione dei dati" },
        { id: "rights", label: "I vostri diritti" },
        { id: "cookies", label: "Cookie" },
        { id: "third-party", label: "Link a terze parti" },
        { id: "changes", label: "Modifiche a questa policy" },
        { id: "contact", label: "Contatti" },
      ];

  return (
    <div className="min-h-[100svh] bg-background text-foreground pt-24 pb-24">
      {/* D-25 — `.container-px`, the site-wide gutter (safe-area aware, and the
          only thing that keeps copy clear of a display cutout in landscape),
          replaces the raw `container mx-auto px-6` these three legal routes
          were the last users of. The reading measure stays max-w-5xl. */}
      <div className="container-px">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 max-w-2xl">
          <div className="mb-5">
            <span className="status-pill">
              <FileText className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">
                {isEn ? "Last updated: August 2026" : "Ultimo aggiornamento: agosto 2026"}
              </span>
            </span>
          </div>
          <h1 key={language} data-split-reveal className="heading-display text-balance mb-4">
            {isEn ? "Privacy Policy" : "Informativa sulla Privacy"}
          </h1>
          <p className="text-lg text-muted-foreground leading-[1.65]">
            {isEn
              ? "How SERSAN collects, uses, and protects your personal data in compliance with GDPR."
              : "Come SERSAN raccoglie, utilizza e protegge i vostri dati personali in conformità al GDPR."}
          </p>
        </div>

        {/* Mobile wayfinding: the sticky index below is `hidden lg:block`, so
            under lg an eleven-section policy had no way to navigate itself. A
            native <details> is the whole mechanism — no JS, no dependency, open
            state owned by the browser, and the links are in the DOM either way.
            Deliberately collapsed by default: nothing is lost without it, so it
            must not push the document itself down a screen. */}
        <details className="group lg:hidden mb-10 rounded-lg border border-rule/40 bg-surface/30">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="eyebrow">{isEn ? "Contents" : "Indice"}</span>
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <nav
            aria-label={isEn ? "Privacy policy sections" : "Sezioni dell'informativa"}
            className="border-t border-rule/40 px-4 py-1"
          >
            {tocSections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex min-h-11 items-center gap-2.5 py-1 text-sm text-muted-foreground"
              >
                <span className="font-mono text-[10px] tabular-nums shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{s.label}</span>
              </a>
            ))}
          </nav>
        </details>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
          <aside className="hidden lg:block w-52 shrink-0 sticky top-24 self-start">
            <p className="eyebrow mb-4">{isEn ? "Contents" : "Indice"}</p>
            <nav
              aria-label={isEn ? "Privacy policy sections" : "Sezioni dell'informativa"}
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
            {/* D-26 — text-base (1rem = 16px), not the old 0.9375rem/15px:
                these are long-form legal pages and 15px sits under the mobile
                reading floor. Size only; not one string changed. */}
            <div className="space-y-10 text-foreground/70 leading-[1.72] text-base">
              <Reveal>
              <section id="intro" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "1. Introduction" : "1. Introduzione"}
                </h2>
                <p>
                  {isEn
                    ? "Sersan Limited (“we,” “our,” or “us”) — registered in England and Wales, Co. No. 16878386, at 128 City Road, London EC1V 2NX — is the data controller for personal data collected through this website. This Privacy Policy explains how we collect, use, disclose and safeguard your information when you interact with our website, contact us, or engage us to build something."
                    : "Sersan Limited (“noi”, “nostro”, “ci”) — registrata in Inghilterra e Galles, n. 16878386, con sede in 128 City Road, London EC1V 2NX — è il titolare del trattamento dei dati personali raccolti tramite questo sito. Questa Informativa spiega come raccogliamo, utilizziamo, divulghiamo e proteggiamo le vostre informazioni quando interagite con il sito, ci contattate o ci affidate un progetto."}
                </p>
              </section>
              </Reveal>

              <Reveal>
              <section id="info-collected" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "2. Information We Collect" : "2. Informazioni che raccogliamo"}
                </h2>
                <p className="mb-4">
                  {isEn
                    ? "We may collect the following types of information:"
                    : "Potremmo raccogliere le seguenti tipologie di informazioni:"}
                </p>
                <ul className="list-disc pl-6 space-y-2.5">
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Personal Information:" : "Informazioni personali:"}
                    </strong>{" "}
                    {isEn
                      ? "Name, email address, phone number, company name, and job title when you contact us or sign up for our services."
                      : "Nome, indirizzo email, numero di telefono, ragione sociale e ruolo aziendale quando ci contattate o vi registrate ai nostri servizi."}
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Business Data:" : "Dati aziendali:"}
                    </strong>{" "}
                    {isEn
                      ? "Information about your systems, technical priorities, delivery requirements, and project context."
                      : "Informazioni sui vostri sistemi, priorità tecniche, requisiti di delivery e contesto di progetto."}
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Usage Data:" : "Dati di utilizzo:"}
                    </strong>{" "}
                    {isEn
                      ? "Information about how you interact with our platform, including analytics, performance metrics, and system logs."
                      : "Informazioni sul modo in cui interagite con la nostra piattaforma, inclusi dati analitici, metriche di performance e log di sistema."}
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Communication Data:" : "Dati di comunicazione:"}
                    </strong>{" "}
                    {isEn
                      ? "Records of correspondence when you contact us for support or inquiries."
                      : "Registrazioni della corrispondenza quando ci contattate per supporto o richieste."}
                  </li>
                </ul>
              </section>
              </Reveal>

              <Reveal>
              <section id="how-used" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "3. How We Use Your Information" : "3. Come utilizziamo le informazioni"}
                </h2>
                <p className="mb-4">
                  {isEn
                    ? "We use collected information to:"
                    : "Utilizziamo le informazioni raccolte per:"}
                </p>
                <ul className="list-disc pl-6 space-y-2.5">
                  {(isEn
                    ? [
                        "Provide and improve our consulting, AI, and engineering services",
                        "Customise proposals, delivery plans, and technical recommendations",
                        "Communicate with you about our services, updates, and promotions",
                        "Analyse usage patterns to enhance platform performance",
                        "Comply with legal obligations and protect our rights",
                      ]
                    : [
                        "Fornire e migliorare i nostri servizi di consulenza, AI e ingegneria",
                        "Personalizzare proposte, piani di delivery e raccomandazioni tecniche",
                        "Comunicare con voi su servizi, aggiornamenti e promozioni",
                        "Analizzare i modelli di utilizzo per migliorare le performance della piattaforma",
                        "Adempiere agli obblighi di legge e tutelare i nostri diritti",
                      ]
                  ).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4">
                  <strong className="text-foreground font-medium">
                    {isEn ? "Legal bases (GDPR Art. 6):" : "Basi giuridiche (Art. 6 GDPR):"}
                  </strong>{" "}
                  {isEn
                    ? "delivering an engagement and the steps leading to it — Art. 6(1)(b), contract; security, audit logging and service improvement — Art. 6(1)(f), legitimate interests; business-to-business outreach — legitimate interests, with an opt-out in every message; cookies and similar technologies — consent."
                    : "erogazione del progetto e fasi precontrattuali — Art. 6(1)(b), contratto; sicurezza, log di audit e miglioramento del servizio — Art. 6(1)(f), legittimo interesse; contatti commerciali B2B — legittimo interesse, con possibilità di opposizione in ogni messaggio; cookie e tecnologie simili — consenso."}
                </p>
              </section>
              </Reveal>

              <Reveal>
              <section id="sharing" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "4. Data Sharing and Disclosure" : "4. Condivisione e divulgazione dei dati"}
                </h2>
                <p className="mb-4">
                  {isEn
                    ? "We may share your information with:"
                    : "Potremmo condividere le vostre informazioni con:"}
                </p>
                <ul className="list-disc pl-6 space-y-2.5">
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Service Providers:" : "Fornitori di servizi:"}
                    </strong>{" "}
                    {isEn
                      ? "Third-party vendors who assist in delivering our services (e.g., cloud hosting, analytics)."
                      : "Fornitori terzi che ci supportano nell'erogazione dei servizi (es. cloud hosting, analytics)."}
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Business Partners:" : "Partner commerciali:"}
                    </strong>{" "}
                    {isEn
                      ? "CRM platforms and integrations you authorise us to connect with."
                      : "Piattaforme CRM e integrazioni con cui ci autorizzate a collegarci."}
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Legal Requirements:" : "Obblighi di legge:"}
                    </strong>{" "}
                    {isEn
                      ? "When required by law or to protect our legal rights."
                      : "Quando richiesto dalla legge o per tutelare i nostri diritti."}
                  </li>
                </ul>
                <p className="mt-4">
                  <strong className="text-foreground font-medium">
                    {isEn ? "Subprocessors:" : "Sub-responsabili:"}
                  </strong>{" "}
                  {isEn
                    ? "cloud hosting (AWS, Google Cloud, Azure), site and database hosting (Vercel, Supabase), model APIs (Anthropic, OpenAI, Google), and email delivery (Resend). The list is published, not held behind an NDA, and is named in full in the DPA."
                    : "hosting cloud (AWS, Google Cloud, Azure), hosting del sito e del database (Vercel, Supabase), API dei modelli (Anthropic, OpenAI, Google) e invio email (Resend). L'elenco è pubblico, non soggetto a NDA, ed è riportato per esteso nel DPA."}
                </p>
                <p className="mt-4">
                  <strong className="text-foreground font-medium">
                    {isEn ? "International transfers:" : "Trasferimenti internazionali:"}
                  </strong>{" "}
                  {isEn
                    ? "infrastructure is hosted in the UK and EU, and data residency is agreed per engagement. Where a provider processes data outside the UK or EEA, the transfer relies on UK/EU Standard Contractual Clauses and the UK International Data Transfer Addendum."
                    : "l'infrastruttura è ospitata nel Regno Unito e nell'UE e la residenza dei dati è concordata per ogni progetto. Quando un fornitore tratta dati fuori da Regno Unito o SEE, il trasferimento si basa sulle Clausole Contrattuali Standard UK/UE e sull'Addendum UK per i trasferimenti internazionali."}
                </p>
                <p className="mt-4">
                  {isEn
                    ? "We do not sell your personal information to third parties."
                    : "Non vendiamo i vostri dati personali a terze parti."}
                </p>
              </section>
              </Reveal>

              <Reveal>
              <section id="security" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "5. Data Security" : "5. Sicurezza dei dati"}
                </h2>
                <p>
                  {isEn
                    ? "We implement industry-standard security measures to protect your data, including encryption, secure servers, and access controls. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security."
                    : "Adottiamo misure di sicurezza conformi agli standard di settore per proteggere i vostri dati, inclusi cifratura, server sicuri e controlli di accesso. Tuttavia, nessun metodo di trasmissione su Internet è sicuro al 100%, e non possiamo garantire una sicurezza assoluta."}
                </p>
              </section>
              </Reveal>

              <Reveal>
              <section id="retention" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "6. Data Retention" : "6. Conservazione dei dati"}
                </h2>
                <p>
                  {isEn
                    ? "We retain your information for as long as necessary to fulfil the purposes outlined in this policy, unless a longer retention period is required by law. You may request deletion of your data at any time."
                    : "Conserviamo le vostre informazioni per il tempo necessario a perseguire le finalità indicate in questa policy, salvo che un periodo di conservazione più lungo sia richiesto dalla legge. Potete chiedere in qualsiasi momento la cancellazione dei vostri dati."}
                </p>
              </section>
              </Reveal>

              <Reveal>
              <section id="rights" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "7. Your Rights" : "7. I vostri diritti"}
                </h2>
                <p className="mb-4">
                  {isEn
                    ? "Depending on your location, you may have the right to:"
                    : "A seconda della vostra giurisdizione, potreste avere il diritto di:"}
                </p>
                <ul className="list-disc pl-6 space-y-2.5">
                  {(isEn
                    ? [
                        "Access and receive a copy of your personal data",
                        "Rectify inaccurate or incomplete information",
                        "Request deletion of your personal data",
                        "Object to or restrict processing of your data",
                        "Data portability",
                        "Withdraw consent at any time",
                      ]
                    : [
                        "Accedere e ricevere una copia dei vostri dati personali",
                        "Rettificare informazioni inesatte o incomplete",
                        "Richiedere la cancellazione dei vostri dati personali",
                        "Opporvi al trattamento o richiederne la limitazione",
                        "Portabilità dei dati",
                        "Revocare il consenso in qualsiasi momento",
                      ]
                  ).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4">
                  {isEn
                    ? "Email us to exercise any of these; we respond within 30 days. Where we process data on a client's instructions, we route the request to that client and tell you we have. You can also complain to the ICO (UK) or the Garante per la protezione dei dati personali (Italy)."
                    : "Scriveteci per esercitare uno di questi diritti: rispondiamo entro 30 giorni. Quando trattiamo dati su istruzioni di un cliente, inoltriamo la richiesta a quel cliente e ve lo comunichiamo. Potete inoltre presentare reclamo all'ICO (Regno Unito) o al Garante per la protezione dei dati personali (Italia)."}
                </p>
              </section>
              </Reveal>

              <Reveal>
              <section id="cookies" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "8. Cookies" : "8. Cookie"}
                </h2>
                <p>
                  {isEn ? (
                    <>
                      We use a small number of cookies and similar technologies: one remembers your language choice,
                      and a privacy-friendly analytics script measures traffic without cross-site tracking or
                      advertising profiles. You can manage them through your browser settings or our{" "}
                      <Link
                        href="/cookies"
                        className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                      >
                        Cookie Policy
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      Utilizziamo un numero ridotto di cookie e tecnologie simili: uno ricorda la lingua scelta e uno
                      script di analytics rispettoso della privacy misura il traffico senza tracciamento cross-site né
                      profilazione pubblicitaria. Potete gestirli dalle impostazioni del browser o dalla nostra{" "}
                      <Link
                        href="/cookies"
                        className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                      >
                        Cookie Policy
                      </Link>
                      .
                    </>
                  )}
                </p>
              </section>
              </Reveal>

              <Reveal>
              <section id="third-party" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "9. Third-Party Links" : "9. Link a terze parti"}
                </h2>
                <p>
                  {isEn
                    ? "Our website may contain links to third-party sites. We are not responsible for the privacy practices of these external sites and encourage you to review their privacy policies."
                    : "Il nostro sito può contenere link a siti di terze parti. Non siamo responsabili delle pratiche di privacy di questi siti esterni e vi invitiamo a consultarne le rispettive informative."}
                </p>
              </section>
              </Reveal>

              <Reveal>
              <section id="changes" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "10. Changes to This Policy" : "10. Modifiche a questa policy"}
                </h2>
                <p>
                  {isEn
                    ? "We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on our website with a revised “Last updated” date."
                    : "Potremmo aggiornare questa Informativa di tanto in tanto. Comunicheremo eventuali modifiche sostanziali pubblicando la versione aggiornata sul sito con una nuova data “Ultimo aggiornamento”."}
                </p>
              </section>
              </Reveal>

              <Reveal>
              <section id="contact" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "11. Contact Us" : "11. Contatti"}
                </h2>
                <p className="mb-4">
                  {isEn
                    ? "If you have any questions about this Privacy Policy or our data practices, please contact us at:"
                    : "Per qualsiasi domanda su questa Informativa o sulle nostre pratiche di trattamento dei dati, contattateci a:"}
                </p>
                <p className="text-foreground font-medium">Sersan Limited</p>
                <p>128 City Road, London, EC1V 2NX, United Kingdom</p>
                <p>{isEn ? "Company No. 16878386" : "N. registrazione 16878386"}</p>
                <p>
                  Email:{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </section>
              </Reveal>

              {/* Related */}
              <div className="pt-10 border-t border-rule/50">
                <p className="eyebrow mb-5">
                  {isEn ? "Related documents" : "Documenti correlati"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(isEn
                    ? [
                        { href: "/terms", label: "Terms of Service" },
                        { href: "/cookies", label: "Cookie Policy" },
                        { href: "/contact", label: "Contact Us" },
                        { href: "/consulting", label: "Consulting" },
                        { href: "/about", label: "About Us" },
                      ]
                    : [
                        { href: "/terms", label: "Termini di servizio" },
                        { href: "/cookies", label: "Cookie Policy" },
                        { href: "/contact", label: "Contatti" },
                        { href: "/consulting", label: "Consulenza" },
                        { href: "/about", label: "Chi siamo" },
                      ]
                  ).map((link, i) => (
                    <Reveal key={link.href} as="span" delay={i * 70} from="left">
                    <Link
                      href={link.href}
                      className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-border/60 bg-background/40 backdrop-blur-sm text-xs font-medium text-muted-foreground hover:text-foreground hover:border-rule/70 transition-colors"
                    >
                      {link.label}
                    </Link>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
