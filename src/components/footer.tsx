"use client";

import { useRef } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SersanLogo } from "@/components/sersan-logo";
import { useLanguage } from "@/components/language-provider";
import { CONTACT_EMAIL } from "@/lib/site";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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
  const footerRef = useRef<HTMLElement | null>(null);

  // Footer closing chord — ONE orchestrated choreography instead of the eight
  // independent <Reveal from="left"> instances that used to fire on their own
  // IntersectionObservers (and slid laterally, against the site-wide rise-up
  // language). Two pieces:
  //
  //   1. A restrained parallax unveil: the inner content wrapper starts 44px
  //      up and scrubs to 0 as the footer enters, so the page appears to lift
  //      OFF the footer. Transforms only — no pinning, no layout shift. The
  //      footer already clips (overflow-hidden), so the shifted content can't
  //      bleed over the last section, and pt-16/20 (64–80px) means the -44px
  //      start never crosses the top border or clips focus rings. There are no
  //      fixed/sticky descendants, so the transformed wrapper creating a
  //      containing block is a non-issue. Travel is a fixed 44px (NOT a
  //      yPercent of this tall container — that would be 60–90px and read
  //      gimmicky).
  //
  //   2. A once-played entrance timeline on the footer's in-view edge: brand
  //      copy rises, the column rule-lines draw left→right while their columns
  //      rise up (y:24→0, 0.08 column stagger, expo.out), then the divider
  //      draws and the social/legal tail settles. One beat, one owner.
  //
  // The manifesto line is deliberately NOT in this timeline — it carries
  // data-split-reveal, so HeadingChoreographer owns it (single reveal owner
  // per element, same rule SectionHeading enforces).
  //
  // The footer lives in layout.tsx and persists across soft navigations, so
  // this runs once per hard load — matching the old Reveal behavior — and has
  // NO language/pathname dependency on purpose: an EN/IT toggle re-renders
  // the text in place without touching inline styles, and re-running here
  // would re-hide a footer the visitor is already looking at.
  useGSAP(
    () => {
      const footer = footerRef.current;
      if (!footer) return;

      // Reduced motion: no parallax, no entrance. Nothing is pre-hidden in
      // JSX (SSR/no-JS keeps a fully visible footer by construction), so an
      // early return simply leaves everything at its natural state.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const inner = footer.querySelector<HTMLElement>("[data-footer-inner]");
      const brand = gsap.utils.toArray<HTMLElement>("[data-footer-brand]", footer);
      const cols = gsap.utils.toArray<HTMLElement>("[data-footer-col]", footer);
      // Document order: the four column heading rules first, then the wide
      // section-rule divider — so one staggered tween draws them top-down.
      const rules = gsap.utils.toArray<HTMLElement>("[data-footer-rule]", footer);
      const socials = gsap.utils.toArray<HTMLElement>("[data-footer-social]", footer);
      const meta = gsap.utils.toArray<HTMLElement>("[data-footer-meta]", footer);

      // --- (1) Parallax unveil -------------------------------------------
      // scrub: true (raw) — Lenis is the only smoother; a numeric scrub here
      // would double-smooth (same gotcha fit-section documents). Geometry is
      // enter-edge → page end, so on a short page where the footer is already
      // (partly) in view at load the scrub renders at its true progress
      // immediately: fully-visible footer ⇒ progress 1 ⇒ y:0, never a footer
      // resting shifted. fromTo keeps the endpoints explicit across
      // invalidateOnRefresh re-measures (resize / route refresh).
      if (inner) {
        gsap.fromTo(
          inner,
          { y: -44 },
          {
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: footer,
              start: "top bottom",
              end: "bottom bottom",
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      }

      // --- (2) Entrance timeline -----------------------------------------
      // Hidden via opacity, NOT autoAlpha: visibility:hidden would drop the
      // footer links out of the tab order, and a keyboard user tabbing toward
      // an un-revealed footer could never reach them. Opacity keeps them
      // focusable (exactly like the old Reveal); the focusin fire below makes
      // sure focus never lands on something still invisible.
      gsap.set(brand, { opacity: 0, y: 16 });
      gsap.set(cols, { opacity: 0, y: 24 });
      gsap.set(rules, { scaleX: 0, transformOrigin: "left center" });
      gsap.set(socials, { opacity: 0, y: 12 });
      gsap.set(meta, { opacity: 0, y: 12 });

      // Position parameters overlap the beats so the footer reads as one
      // breath (~1.2s total), not five queued reveals. Each column's rule
      // leads its column by ~70ms — the line draws, the content rises onto it.
      const tl = gsap.timeline({ paused: true });
      tl.to(brand, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: "expo.out" }, 0)
        .to(rules, { scaleX: 1, duration: 0.7, stagger: 0.08, ease: "expo.out" }, 0.05)
        .to(cols, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: "expo.out" }, 0.12)
        .to(socials, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: "expo.out" }, 0.45)
        .to(meta, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "expo.out" }, 0.5);

      // fired-guard: the creation-time in-view check, the trigger's onEnter
      // and the focusin safety can all race to play the same timeline.
      let fired = false;
      const fire = () => {
        if (fired) return;
        fired = true;
        footer.removeEventListener("focusin", fire);
        tl.play();
      };

      const st = ScrollTrigger.create({
        trigger: footer,
        start: "top 85%",
        once: true,
        onEnter: fire,
      });
      // A once:true ScrollTrigger created already-in-view (short pages, or a
      // hard load landing near the bottom) never fires its onEnter — GSAP only
      // fires on an active-state CHANGE — so check at creation and play
      // immediately, same discipline as HeadingChoreographer.
      if (st.isActive || st.progress > 0) fire();
      // Keyboard safety valve: if focus enters the footer before the scroll
      // edge fires (Tab into an opacity:0 link), reveal everything at once so
      // focus never rests on invisible content.
      footer.addEventListener("focusin", fire);

      // Tweens/triggers/sets above are created synchronously inside the
      // useGSAP context, so unmount (hard teardown only — the footer persists
      // across soft navs) reverts them all: an interrupted timeline can never
      // strand content hidden, because revert restores the natural,
      // fully-visible CSS state. Only the DOM listener needs manual removal.
      return () => {
        footer.removeEventListener("focusin", fire);
      };
    },
    { scope: footerRef },
  );

  return (
    <footer
      ref={footerRef}
      className="relative border-t border-[hsl(var(--rule))] bg-[hsl(var(--bg))] pt-16 sm:pt-20 pb-10 sm:pb-12 overflow-hidden"
    >
      {/* Subtle radial accent that anchors the footer. Kept OUTSIDE the
          parallax wrapper on purpose: the glow stays pinned to the footer
          shell while the content settles over it (depth = background static,
          foreground moving), and its -top-32 anchor keeps resolving against
          the footer — a transformed wrapper would become its containing block
          and shift the glow down by the padding height. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[80vw] h-[24rem] opacity-30 blur-[100px]"
        style={{
          background:
            "radial-gradient(closest-side, hsl(var(--accent) / 0.18), transparent 70%)",
        }}
      />

      {/* Parallax target: everything the visitor reads rides this wrapper. */}
      <div data-footer-inner className="container-px relative">
        {/* Top: manifesto line + columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 mb-14 sm:mb-16">
          {/* Brand block. The mark itself stays static — it is the one fixed
              point while the copy around it rises, and the footer never
              presents as fully empty mid-choreography. */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <SersanLogo size="md" />
            {/* HeadingChoreographer owns this line (data-split-reveal ⇒ the
                site's line-mask rise, velocity-modulated). key={language}:
                SplitText owns the subtree once split; a language swap must
                remount it or React reconciles against orphaned nodes (same
                contract as SectionHeading's h2). */}
            <p
              key={language}
              data-split-reveal
              className="font-display text-[1.45rem] sm:text-[1.65rem] leading-[1.18] text-ink max-w-md"
            >
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
            <p data-footer-brand className="text-[14px] text-ink-mute leading-relaxed max-w-md">
              {isEn
                ? "AI & Technology Consulting. AI agents, automation, MLOps, architecture, and the engineering rescue work that gets prototypes into production."
                : "Consulenza AI e tecnologica. Agenti AI, automazione, MLOps, architettura e il lavoro di rescue ingegneristico che porta i prototipi in produzione."}
            </p>

            <div data-footer-brand className="flex flex-col gap-2 pt-3">
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

          {/* Link columns — rise up on the shared timeline (the old lateral
              <Reveal from="left"> slides contradicted the site's rise-up
              language). */}
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-8">
            {COLUMNS.map((col) => (
              <div key={col.heading} data-footer-col className="flex flex-col gap-3">
                {/* The rule under the heading is a positioned span, not a
                    border-b: a border can't scaleX-draw, and scaling the h3
                    itself would distort the glyphs. bottom-0 over pb-3 sits
                    exactly where the old border rendered — no layout shift. */}
                <h3 className="relative font-mono text-[10px] tracking-[0.16em] uppercase text-ink-mute pb-3">
                  {isEn ? col.heading : col.headingIt}
                  <span
                    data-footer-rule
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-px bg-[hsl(var(--rule))]"
                  />
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
              </div>
            ))}
          </div>
        </div>

        {/* Divider — draws in last of the rules (document order drives the
            stagger), underlining the block before the legal tail settles. */}
        <div data-footer-rule aria-hidden="true" className="section-rule mb-10" />

        {/* Bottom row: legal + social + locale */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
          <div
            data-footer-meta
            className="sm:col-span-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute"
          >
            <span>© 2026 SerSan Limited</span>
            <span aria-hidden="true" className="text-ink-mute/50">·</span>
            <span>128 City Road, London EC1V 2NX</span>
            <span aria-hidden="true" className="text-ink-mute/50">·</span>
            <span>{isEn ? "Co. No. 16878386" : "N. reg. 16878386"}</span>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2 sm:justify-center">
            <a
              data-footer-social
              href="https://www.linkedin.com/company/sersan-limited/about/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="p-2 rounded-md text-ink-mute hover:text-[hsl(var(--accent))] transition-colors"
            >
              <LinkedinIcon className="h-4 w-4" />
            </a>
            <a
              data-footer-social
              href="https://twitter.com/sersan_io"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X / Twitter"
              className="p-2 rounded-md text-ink-mute hover:text-[hsl(var(--accent))] transition-colors"
            >
              <TwitterIcon className="h-4 w-4" />
            </a>
            <a
              data-footer-social
              href="https://github.com/sersan"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="p-2 rounded-md text-ink-mute hover:text-[hsl(var(--accent))] transition-colors"
            >
              <GithubIcon className="h-4 w-4" />
            </a>
            <a
              data-footer-social
              href={`mailto:${CONTACT_EMAIL}`}
              aria-label="Email"
              className="p-2 rounded-md text-ink-mute hover:text-[hsl(var(--accent))] transition-colors"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>

          <div
            data-footer-meta
            className="sm:col-span-3 sm:text-right text-[10.5px] font-mono uppercase tracking-[0.14em] text-ink-mute"
          >
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
