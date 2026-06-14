"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { SersanLogo } from "@/components/sersan-logo";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";
import { CONTACT_EMAIL, START_HREF } from "@/lib/site";

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const GithubIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

type LinkRow = { href: string; label: string; labelIt: string; external?: boolean };

const COLUMNS: Array<{ heading: string; headingIt: string; links: LinkRow[] }> = [
  {
    heading: "Consulting",
    headingIt: "Consulenza",
    links: [
      { href: "/#services", label: "Services", labelIt: "Servizi" },
      { href: "/#process", label: "Process", labelIt: "Processo" },
      { href: "/audit", label: "Technical audit", labelIt: "Audit tecnico" },
      { href: "/consulting", label: "Fractional CTO", labelIt: "Fractional CTO" },
    ],
  },
  {
    heading: "Work",
    headingIt: "Lavori",
    links: [
      { href: "/#work", label: "Selected engagements", labelIt: "Incarichi selezionati" },
      { href: "/case-studies", label: "Full archive", labelIt: "Archivio completo" },
      { href: "/#trust", label: "Production-grade", labelIt: "Pronto per la produzione" },
    ],
  },
  {
    heading: "Studio",
    headingIt: "Studio",
    links: [
      { href: "/about", label: "Founders", labelIt: "Fondatori" },
      { href: "/resources", label: "Writing", labelIt: "Scritti" },
      { href: "/consulting#faq", label: "FAQ", labelIt: "FAQ" },
      { href: "/contact", label: "Contact", labelIt: "Contatti" },
    ],
  },
  {
    heading: "Legal",
    headingIt: "Legale",
    links: [
      { href: "/privacy", label: "Privacy", labelIt: "Privacy" },
      { href: "/terms", label: "Terms", labelIt: "Termini" },
      { href: "/cookies", label: "Cookies", labelIt: "Cookie" },
      { href: "/trust", label: "Security", labelIt: "Sicurezza" },
    ],
  },
];


export function Footer() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <footer className="relative border-t border-[hsl(var(--rule))] bg-[hsl(var(--bg))] pt-16 sm:pt-20 pb-10 sm:pb-12 overflow-hidden">
      {/* Subtle radial accent that anchors the footer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[80vw] h-[24rem] opacity-30 blur-[100px]"
        style={{
          background:
            "radial-gradient(closest-side, hsl(var(--accent) / 0.18), transparent 70%)",
        }}
      />

      <div className="container-px relative">
        {/* Top: manifesto line + columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 mb-14 sm:mb-16">
          {/* Brand block */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <SersanLogo size="md" />
            <p className="font-display text-[1.45rem] sm:text-[1.65rem] leading-[1.18] text-ink max-w-md">
              {isEn ? (
                <>
                  Production-grade AI systems,{" "}
                  <span className="text-ink-mute">
                    engineered from the ground up.
                  </span>
                </>
              ) : (
                <>
                  Sistemi AI pronti per la produzione,{" "}
                  <span className="text-ink-mute">
                    ingegnerizzati dalle fondamenta.
                  </span>
                </>
              )}
            </p>
            <p className="text-[14px] text-ink-mute leading-relaxed max-w-md">
              {isEn
                ? "AI & Technology Consulting. AI agents, automation, MLOps, architecture, and the engineering rescue work that gets prototypes into production."
                : "Consulenza AI e tecnologica. Agenti AI, automazione, MLOps, architettura e il lavoro di rescue ingegneristico che porta i prototipi in produzione."}
            </p>

            <div className="flex flex-col gap-2 pt-3">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors"
              >
                <span aria-hidden="true" className="status-dot" />
                {CONTACT_EMAIL}
              </a>
              <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-mute">
                {isEn
                  ? "Reply within 1 business day"
                  : "Risposta entro 1 giorno lavorativo"}
              </span>
            </div>
          </div>

          {/* Link columns */}
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-8">
            {COLUMNS.map((col, i) => (
              <Reveal key={col.heading} delay={i * 60} from="left" className="flex flex-col gap-3">
                <h3 className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-mute pb-3 border-b border-[hsl(var(--rule))]">
                  {isEn ? col.heading : col.headingIt}
                </h3>
                <ul className="flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[13.5px] text-ink-mute hover:text-ink transition-colors"
                      >
                        {isEn ? link.label : link.labelIt}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="section-rule mb-10" />

        {/* Bottom row: legal + social + locale */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
          <div className="sm:col-span-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute">
            <span>© 2026 SerSan Limited</span>
            <span aria-hidden="true" className="text-ink-mute/50">·</span>
            <span>128 City Road, London EC1V 2NX</span>
            <span aria-hidden="true" className="text-ink-mute/50">·</span>
            <span>{isEn ? "Co. No. 16878386" : "N. reg. 16878386"}</span>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2 sm:justify-center">
            <Reveal as="span" delay={0} from="left">
            <a
              href="https://www.linkedin.com/company/sersan-limited/about/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="p-2 rounded-md text-ink-mute hover:text-[hsl(var(--accent))] transition-colors"
            >
              <LinkedinIcon className="h-4 w-4" />
            </a>
            </Reveal>
            <Reveal as="span" delay={60} from="left">
            <a
              href="https://twitter.com/sersan_io"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X / Twitter"
              className="p-2 rounded-md text-ink-mute hover:text-[hsl(var(--accent))] transition-colors"
            >
              <TwitterIcon className="h-4 w-4" />
            </a>
            </Reveal>
            <Reveal as="span" delay={120} from="left">
            <a
              href="https://github.com/sersan"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="p-2 rounded-md text-ink-mute hover:text-[hsl(var(--accent))] transition-colors"
            >
              <GithubIcon className="h-4 w-4" />
            </a>
            </Reveal>
            <Reveal as="span" delay={180} from="left">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              aria-label="Email"
              className="p-2 rounded-md text-ink-mute hover:text-[hsl(var(--accent))] transition-colors"
            >
              <Mail className="h-4 w-4" />
            </a>
            </Reveal>
          </div>

          <div className="sm:col-span-3 sm:text-right text-[10.5px] font-mono uppercase tracking-[0.14em] text-ink-mute">
            {isEn
              ? "ISO 27001 (in progress) · DORA · EU AI Act"
              : "ISO 27001 (in corso) · DORA · EU AI Act"}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
