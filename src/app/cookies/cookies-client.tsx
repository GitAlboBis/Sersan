"use client";

import Link from "next/link";
import { ChevronDown, Cookie } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";
import { CONTACT_EMAIL } from "@/lib/site";

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
              <Cookie className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">
                {isEn ? "Last updated: August 2026" : "Ultimo aggiornamento: agosto 2026"}
              </span>
            </span>
          </div>
          <h1 key={language} data-split-reveal className="heading-display text-balance mb-4">
            {isEn ? "Cookie Policy" : "Cookie Policy"}
          </h1>
          <p className="text-lg text-muted-foreground leading-[1.65]">
            {isEn
              ? "How SERSAN uses cookies and similar technologies on our website — and how few of them there are."
              : "Come SERSAN utilizza cookie e tecnologie simili sul nostro sito — e quanto pochi ne servono."}
          </p>
        </div>

        {/* Mobile wayfinding: the sticky index below is `hidden lg:block`, so
            under lg the page had no way to navigate itself. A native <details>
            is the whole mechanism — no JS, no dependency, open state owned by
            the browser, and the links are in the DOM either way. Deliberately
            collapsed by default: nothing is lost without it, so it must not
            push the document itself down a screen. */}
        <details className="group lg:hidden mb-10 rounded-lg border border-rule/40 bg-surface/30">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="eyebrow">{isEn ? "Contents" : "Indice"}</span>
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <nav
            aria-label={isEn ? "Cookie policy sections" : "Sezioni della cookie policy"}
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
                    ? "This Cookie Policy explains what SERSAN actually stores on your device when you visit our website, and what it is for. It is a short list on purpose: we do not run advertising tags, and we do not build profiles of visitors."
                    : "Questa Cookie Policy spiega cosa SERSAN memorizza davvero sul vostro dispositivo quando visitate il sito, e a cosa serve. L'elenco è volutamente breve: non usiamo tag pubblicitari e non profiliamo i visitatori."}
                </p>
              </section>
              </Reveal>

              <Reveal>
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
              </Reveal>

              <Reveal>
              <section id="types" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "3. Types of Cookies We Use" : "3. Tipi di cookie utilizzati"}
                </h2>
                <ul className="list-disc pl-6 space-y-2.5">
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Strictly necessary:" : "Strettamente necessari:"}
                    </strong>{" "}
                    {isEn
                      ? "Set by our hosting provider to serve and secure the site. Nothing here identifies you personally."
                      : "Impostati dal nostro provider di hosting per servire e proteggere il sito. Nessuno di questi vi identifica personalmente."}
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Performance & analytics:" : "Performance e analitici:"}
                    </strong>{" "}
                    {isEn
                      ? "Vercel Analytics counts page views without cookies, without cross-site tracking and without advertising profiles."
                      : "Vercel Analytics conta le visualizzazioni di pagina senza cookie, senza tracciamento cross-site e senza profilazione pubblicitaria."}
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Functionality:" : "Funzionalità:"}
                    </strong>{" "}
                    {isEn
                      ? "A sersan_language cookie and local storage remember whether you read the site in English or Italian, for 12 months."
                      : "Un cookie sersan_language e il local storage ricordano se leggete il sito in inglese o in italiano, per 12 mesi."}
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">
                      {isEn ? "Marketing:" : "Marketing:"}
                    </strong>{" "}
                    {isEn
                      ? "None. We run no advertising, retargeting or campaign-attribution cookies on this site."
                      : "Nessuno. Su questo sito non usiamo cookie pubblicitari, di retargeting o di attribuzione delle campagne."}
                  </li>
                </ul>
              </section>
              </Reveal>

              <Reveal>
              <section id="third-party" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "4. Third-Party Cookies" : "4. Cookie di terze parti"}
                </h2>
                <p>
                  {isEn
                    ? "We currently embed no third-party calendars, video players or advertising tags. Our hosting and analytics providers are named in the Privacy Policy. If we ever add an embed that sets cookies, this page is updated before it goes live."
                    : "Al momento non integriamo calendari, video player o tag pubblicitari di terze parti. I nostri provider di hosting e analytics sono indicati nell'Informativa sulla Privacy. Se aggiungeremo un embed che imposta cookie, questa pagina verrà aggiornata prima della pubblicazione."}
                </p>
              </section>
              </Reveal>

              <Reveal>
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
                    ? "You will not see a consent banner here, because we do not set advertising or profiling cookies. Clearing the language cookie only means the site opens in English again."
                    : "Non troverete un banner di consenso, perché non impostiamo cookie pubblicitari o di profilazione. Cancellare il cookie della lingua significa soltanto che il sito si riaprirà in inglese."}
                </p>
              </section>
              </Reveal>

              <Reveal>
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
              </Reveal>

              <Reveal>
              <section id="contact" className="scroll-mt-24">
                <h2 className="heading-3 font-semibold text-foreground mb-4">
                  {isEn ? "7. Contact Us" : "7. Contatti"}
                </h2>
                <p className="mb-4">
                  {isEn
                    ? "For any questions about this policy or our use of cookies, contact:"
                    : "Per qualsiasi domanda su questa policy o sul nostro uso dei cookie, contattate:"}
                </p>
                <p className="text-foreground font-medium">Sersan Limited</p>
                <p>128 City Road, London, EC1V 2NX, United Kingdom</p>
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
