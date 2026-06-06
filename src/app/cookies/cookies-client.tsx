"use client";

import Link from "next/link";
import { Cookie } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function CookiesClient() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const tocSections = isEn
    ? [
        { id: "intro", label: "Introduction" },
        { id: "what", label: "What Are Cookies" },
        { id: "types", label: "Types of Cookies We Use" },
        { id: "third-party", label: "Third-Party Cookies" },
        { id: "managing", label: "Managing Cookies" },
        { id: "changes", label: "Changes to This Policy" },
        { id: "contact", label: "Contact Us" },
      ]
    : [
        { id: "intro", label: "Introduzione" },
        { id: "what", label: "Cosa sono i cookie" },
        { id: "types", label: "Tipi di cookie utilizzati" },
        { id: "third-party", label: "Cookie di terze parti" },
        { id: "managing", label: "Gestione dei cookie" },
        { id: "changes", label: "Modifiche a questa policy" },
        { id: "contact", label: "Contatti" },
      ];

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-24">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="mb-12 max-w-2xl">
          <div className="mb-5">
            <span className="status-pill">
              <Cookie className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">
                {isEn ? "Last updated: January 2026" : "Ultimo aggiornamento: gennaio 2026"}
              </span>
            </span>
          </div>
          <h1 className="heading-display text-balance mb-4">
            {isEn ? "Cookie Policy" : "Cookie Policy"}
          </h1>
          <p className="text-lg text-muted-foreground leading-[1.65]">
            {isEn
              ? "How SERSAN uses cookies and similar tracking technologies on our website."
              : "Come SERSAN utilizza cookie e tecnologie di tracciamento simili sul nostro sito."}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
          <aside className="hidden lg:block w-52 shrink-0 sticky top-24 self-start">
            <p className="eyebrow mb-4">{isEn ? "Contents" : "Indice"}</p>
            <nav
              aria-label={isEn ? "Cookie policy sections" : "Sezioni della cookie policy"}
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
              <section id="intro" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "1. Introduction" : "1. Introduzione"}
                </h2>
                <p>
                  {isEn
                    ? "This Cookie Policy explains how SERSAN uses cookies and similar technologies to recognise you when you visit our website. It also explains what these technologies are, why we use them, and your rights to control our use of them."
                    : "Questa Cookie Policy spiega come SERSAN utilizza cookie e tecnologie simili per riconoscervi quando visitate il nostro sito. Spiega inoltre cosa sono queste tecnologie, perché le utilizziamo e i vostri diritti per controllarne l'uso."}
                </p>
              </section>

              <section id="what" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "2. What Are Cookies" : "2. Cosa sono i cookie"}
                </h2>
                <p>
                  {isEn
                    ? "Cookies are small text files stored on your device when you visit a website. They are widely used to make websites work, or work more efficiently, and to provide reporting information."
                    : "I cookie sono piccoli file di testo memorizzati sul vostro dispositivo quando visitate un sito. Sono ampiamente utilizzati per far funzionare i siti, o per farli funzionare in modo più efficiente, e per fornire informazioni di reporting."}
                </p>
              </section>

              <section id="types" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "3. Types of Cookies We Use" : "3. Tipi di cookie utilizzati"}
                </h2>
                <ul className="list-disc pl-6 space-y-2.5">
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Strictly necessary cookies:" : "Cookie strettamente necessari:"}
                    </strong>{" "}
                    {isEn
                      ? "Required to operate our website (e.g. accessibility, security)."
                      : "Necessari al funzionamento del sito (es. accessibilità, sicurezza)."}
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Performance & analytics:" : "Performance e analitici:"}
                    </strong>{" "}
                    {isEn
                      ? "Help us understand how visitors interact with the site so we can improve it."
                      : "Ci aiutano a capire come i visitatori interagiscono con il sito per migliorarlo."}
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Functionality:" : "Funzionalità:"}
                    </strong>{" "}
                    {isEn
                      ? "Remember preferences such as language or theme."
                      : "Ricordano preferenze come lingua o tema."}
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Marketing:" : "Marketing:"}
                    </strong>{" "}
                    {isEn
                      ? "Track campaign attribution and measure outreach effectiveness. Used only with consent."
                      : "Tracciano l'attribuzione delle campagne e misurano l'efficacia delle attività. Utilizzati solo con il consenso."}
                  </li>
                </ul>
              </section>

              <section id="third-party" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "4. Third-Party Cookies" : "4. Cookie di terze parti"}
                </h2>
                <p>
                  {isEn
                    ? "Some cookies are placed by third-party services that appear on our pages (e.g. analytics, embedded calendars or videos). We do not control these cookies; please review the third-party privacy and cookie notices."
                    : "Alcuni cookie sono installati da servizi di terze parti presenti sulle nostre pagine (es. analytics, calendari o video integrati). Non controlliamo questi cookie; vi invitiamo a consultare le rispettive informative su privacy e cookie."}
                </p>
              </section>

              <section id="managing" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "5. Managing Cookies" : "5. Gestione dei cookie"}
                </h2>
                <p className="mb-4">
                  {isEn
                    ? "You can manage cookies via your browser settings. Most browsers allow you to refuse cookies, delete existing cookies, or be alerted when a cookie is set."
                    : "Potete gestire i cookie dalle impostazioni del browser. La maggior parte dei browser consente di rifiutare i cookie, cancellare quelli esistenti o essere avvisati quando viene impostato un cookie."}
                </p>
                <p>
                  {isEn
                    ? "Note that disabling some cookies may affect the functionality of the website and limit certain features."
                    : "Disattivando alcuni cookie potreste compromettere la funzionalità del sito e limitarne alcune funzionalità."}
                </p>
              </section>

              <section id="changes" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "6. Changes to This Policy" : "6. Modifiche a questa policy"}
                </h2>
                <p>
                  {isEn
                    ? "We may update this Cookie Policy from time to time. Material changes will be posted on this page with a revised “Last updated” date."
                    : "Potremmo aggiornare questa Cookie Policy di tanto in tanto. Le modifiche sostanziali verranno pubblicate su questa pagina con una nuova data “Ultimo aggiornamento”."}
                </p>
              </section>

              <section id="contact" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "7. Contact Us" : "7. Contatti"}
                </h2>
                <p className="mb-4">
                  {isEn
                    ? "For any questions about this policy or our use of cookies, contact:"
                    : "Per qualsiasi domanda su questa policy o sul nostro uso dei cookie, contattate:"}
                </p>
                <p className="text-foreground font-medium">SERSAN</p>
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
                        { href: "/terms", label: "Terms of Service" },
                        { href: "/contact", label: "Contact Us" },
                      ]
                    : [
                        { href: "/privacy", label: "Privacy Policy" },
                        { href: "/terms", label: "Termini di servizio" },
                        { href: "/contact", label: "Contatti" },
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
