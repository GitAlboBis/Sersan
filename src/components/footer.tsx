"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SersanLogo } from "@/components/sersan-logo";
import { useLanguage } from "@/components/language-provider";
import { NowWidget } from "@/components/fx/now-widget";
import { CONTACT_EMAIL, START_HREF } from "@/lib/site";
import { track, EVENTS } from "@/lib/analytics";
import { CTA, FACTS, pick } from "@/data/copy";
import { usePressState } from "@/lib/use-press-state";

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
const InstagramIcon = ({ className }: { className?: string }) => (
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
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

type LinkRow = { href: string; label: string; labelIt: string; external?: boolean };

// FOUR columns, and the count is load-bearing — the entrance timeline
// staggers [data-footer-col] and [data-footer-rule] in document order. Link
// counts per column (4 · 3 · 4 · 4) are unchanged too; only the destinations
// and labels moved in the 2026-08 repositioning.
//
// The first column used to be headed "Consulting" and named two offers —
// "Technical audit" and "Fractional CTO" — neither of which says the studio
// BUILDS anything, while the four /services/* routes that do describe
// buildable work were unreachable from every piece of site chrome. It now
// carries those four routes and the audit moved down to the engagement
// column, where the thing you buy belongs.
const COLUMNS: Array<{ heading: string; headingIt: string; links: LinkRow[] }> = [
  {
    heading: "What we build",
    headingIt: "Cosa costruiamo",
    links: [
      { href: "/services/engineering", label: "Custom software", labelIt: "Software su misura" },
      { href: "/services/automation", label: "Workflow automation", labelIt: "Automazione processi" },
      { href: "/services/mlops", label: "AI systems", labelIt: "Sistemi AI" },
      { href: "/services/architecture", label: "Architecture & data", labelIt: "Architettura e dati" },
    ],
  },
  {
    heading: "How we work",
    headingIt: "Come lavoriamo",
    links: [
      { href: "/audit", label: "Technical audit", labelIt: "Audit tecnico" },
      { href: "/consulting", label: "Engagement models", labelIt: "Modelli di ingaggio" },
      { href: "/case-studies", label: "Selected work", labelIt: "Lavori selezionati" },
    ],
  },
  {
    heading: "Studio",
    headingIt: "Studio",
    links: [
      // "Team", not "Founders" — /about now shows the two co-founders PLUS
      // the engineering hire (handoff open item #4, resolved 2026-07-23).
      { href: "/about", label: "Team", labelIt: "Team" },
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
  // M-4 press feedback (lib/use-press-state). ONE hook for the whole footer;
  // the returned callback is stable, so the link rows re-attach nothing when
  // the EN/IT toggle re-renders their labels in place. Inert on fine pointers
  // and under reduced motion — see the hook's docblock.
  const pressRef = usePressState();

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
      // pb folds the safe-area bottom inset into the design padding
      // (MOBILE_AUDIT.md D-8). viewportFit:"cover" runs the document under the
      // home indicator, and the footer is the one block that always sits at
      // the very bottom of it. max() keeps 2.5/3rem wherever that is already
      // the larger value — i.e. everywhere --safe-b resolves to 0px, which is
      // every non-notched device — so this is inert off iOS and never
      // collapses the padding the way a bare env() would. The horizontal
      // insets are handled once for the whole site by .container-px.
      className="relative border-t border-[hsl(var(--rule))] bg-[hsl(var(--bg))] pt-16 sm:pt-20 pb-[max(2.5rem,var(--safe-b))] sm:pb-[max(3rem,var(--safe-b))] overflow-hidden"
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
                  Custom software, automation and AI,{" "}
                  <span className="text-ink-mute">
                    built around one real problem.
                  </span>
                </>
              ) : (
                <>
                  Software su misura, automazione e AI,{" "}
                  <span className="text-ink-mute">
                    costruiti su un problema reale.
                  </span>
                </>
              )}
            </p>
            <p data-footer-brand className="text-[14px] text-ink-mute leading-relaxed max-w-md">
              {isEn
                ? "A founder-led studio for founders, SMEs and growing teams. From one manual workflow to a full production platform — and the honest answer about which one you need."
                : "Uno studio guidato dai founder, per founder, PMI e team in crescita. Da un singolo processo manuale a una piattaforma completa — con una risposta onesta su cosa vi serve davvero."}
            </p>

            <div data-footer-brand className="flex flex-col gap-2 pt-3">
              {/* The footer's conversion action. Until the repositioning the
                  block below called the bare mailto "the page's most direct
                  conversion action" — which was true, and was the problem:
                  the footer renders on every route and offered no CTA at all,
                  only an email address. This row is the site's primary CTA
                  (CTA.primary → /start), sized and coloured like the mono
                  rows beneath it so it reads as chrome, not as a second hero
                  button competing with the section CTA above it. */}
              <Link
                ref={pressRef}
                href={START_HREF}
                // The footer renders on every route, so `source_section:
                // "footer"` is what separates it from the in-page CTAs that
                // all point at the same /start (PROMPT 17).
                onClick={() =>
                  track(EVENTS.CTA_PROJECT_BRIEF, {
                    source_section: "footer",
                    lang: language,
                  })
                }
                className="tap-44 press-surface group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-[hsl(var(--accent))] hover:text-ink transition-colors"
              >
                {pick(isEn, CTA.primary)}
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {/* The page's most direct conversion action, and ~16.5px tall
                  (D-14). It is already a full-width row inside this column
                  stack, so it only fails the vertical axis: `tap-44` raises the
                  row to 44px on touch WITHOUT touching display or alignment —
                  the label stays exactly where it renders today. */}
              <a
                ref={pressRef}
                href={`mailto:${CONTACT_EMAIL}`}
                onClick={() =>
                  track(EVENTS.CTA_EMAIL, { source_section: "footer" })
                }
                className="tap-44 press-surface group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors"
              >
                <span aria-hidden="true" className="status-dot" />
                {CONTACT_EMAIL}
              </a>
              <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-mute">
                {pick(isEn, FACTS.replyTime)}
              </span>
              <NowWidget />
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
                {/* `footer-links` is inert on a fine pointer; on a coarse one
                    it hands its 0.5rem gap back to the layout because that gap
                    now lives inside the padded link targets (globals.css,
                    TOUCH ERGONOMICS). */}
                <ul className="footer-links flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      {/* Hover: 2px x-shift + accent hairline draw — the
                          our-why bottom-rule grammar (h-px,
                          origin-left scaleX 0→1, bg-accent, 500ms entrance
                          ease). The shift is motion-safe-gated at the source
                          (same reasoning as the button press scale: the global
                          reduced-motion clamp only flattens durations, so the
                          state would still SNAP); the hairline keeps its state
                          under reduced motion like the card rules do — it
                          just draws instantly. inline-block because
                          transforms don't apply to inline boxes, and it
                          shrink-wraps the hairline to the label width.

                          TOUCH (D-14): these rows MEASURED 20.3px tall, four
                          columns of them on every route — the largest cluster
                          of sub-44px targets on the site. `footer-link` pads
                          them to 44.3px and goes block (so the whole column
                          width is tappable, which is what carries short labels
                          like "FAQ" past 44px on the horizontal axis too), and
                          retires the hairline that a block anchor would draw
                          across the full column. `press-surface` + pressRef
                          give the row the tap feedback it has never had. All
                          of it is coarse-pointer-only: desktop geometry is
                          untouched, and the type scale never changes. */}
                      <Link
                        ref={pressRef}
                        href={link.href}
                        className="footer-link press-surface group relative inline-block text-[13.5px] text-ink-mute hover:text-ink transition-[color,transform] motion-safe:hover:translate-x-[2px]"
                      >
                        {isEn ? link.label : link.labelIt}
                        <span
                          aria-hidden="true"
                          className="footer-link__rule absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
                        />
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

          {/* Social icons: p-2 around a 16px glyph = 32×32 (D-14). `tap-icon-44`
              grows the padding to 0.875rem on touch only — 44×44 with the glyph
              still centred by construction — and desktop keeps its p-2 cluster
              exactly as it renders today. */}
          <div className="sm:col-span-3 flex items-center gap-2 sm:justify-center">
            <a
              ref={pressRef}
              data-footer-social
              href="https://www.linkedin.com/company/sersan-limited"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="tap-icon-44 press-surface p-2 rounded-md text-ink-mute hover:text-[hsl(var(--accent))] transition-colors"
            >
              <LinkedinIcon className="h-4 w-4" />
            </a>
            <a
              ref={pressRef}
              data-footer-social
              href="https://www.instagram.com/sersan_ai"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="tap-icon-44 press-surface p-2 rounded-md text-ink-mute hover:text-[hsl(var(--accent))] transition-colors"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            <a
              ref={pressRef}
              data-footer-social
              href={`mailto:${CONTACT_EMAIL}`}
              onClick={() =>
                track(EVENTS.CTA_EMAIL, { source_section: "footer_social" })
              }
              aria-label="Email"
              className="tap-icon-44 press-surface p-2 rounded-md text-ink-mute hover:text-[hsl(var(--accent))] transition-colors"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>

          <div
            data-footer-meta
            className="sm:col-span-3 sm:text-right text-[10.5px] font-mono uppercase tracking-[0.14em] text-ink-mute"
          >
            {/* The ISO 27001 claim is gone from this badge. It rendered on
                EVERY route as "(in progress)" — a certification status SerSan
                does not hold and cannot evidence — and /trust is dropping the
                same claim. What is left is what is actually true: systems
                designed against those regimes (COMPLIANCE.posture). */}
            {isEn
              ? "Built for GDPR · DORA · EU AI Act"
              : "Progettati per GDPR · DORA · EU AI Act"}
            {/* Palette discoverability — desktop/fine-pointer only (the
                shortcut is keyboard-first by nature). */}
            <span className="hidden lg:block pt-1 text-ink-mute/60">
              {isEn ? "Ctrl K · quick nav" : "Ctrl K · navigazione rapida"}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
