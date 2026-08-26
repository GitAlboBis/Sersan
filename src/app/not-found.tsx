"use client";

/**
 * 404 — same entrance grammar as every route hero, no bespoke systems:
 *
 *   - eyebrow: plain `.eyebrow` → the layout-level LabelScrambler decodes it
 *     (delegated observer; nothing to wire here).
 *   - H1: `data-split-reveal` → HeadingChoreographer's line-mask rise. It
 *     carries key={language} because SplitText owns the subtree once split —
 *     an in-place EN/IT text write would land on orphaned nodes (same
 *     contract every split heading documents).
 *   - sub copy / CTAs / suggested-link chips: the house <Reveal> rise
 *     (expo.out, IntersectionObserver — fires on SPA mounts already in view),
 *     staggered by delay so the page assembles top-down in one gesture.
 *
 * prefers-reduced-motion: all three owners short-circuit to static content —
 * everything is simply visible.
 *
 * Deliberately NO [data-line-anchor] here: unknown routes fall through to
 * routeCurves.default, whose waypoints are pure `at` document fractions (no
 * `anchor` refs) — an anchor would be measured by SectionBus but never
 * consumed, so the signature line already serpentines this page correctly
 * via fractions alone.
 */
import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/language-provider";
import { START_HREF } from "@/lib/site";
import { CTA, pick } from "@/data/copy";

export default function NotFound() {
  const { language } = useLanguage();
  const isEn = language === "en";

  // SEVEN chips — the count drives the 45ms cascade below (delay 420 + i*45),
  // so it stays seven. "About" gave up its slot to "Services": a visitor who
  // landed on a dead URL needs to know what the studio builds before it needs
  // to know who runs it, and /#services is the index route the four
  // /services/* pages never had.
  const suggestedLinks = [
    { href: "/", label: isEn ? "Home" : "Home", icon: Home },
    { href: "/#services", label: isEn ? "Services" : "Servizi", icon: Search },
    { href: "/audit", label: isEn ? "Audit" : "Audit", icon: Search },
    { href: "/consulting", label: isEn ? "Consulting" : "Consulenza", icon: Search },
    { href: "/case-studies", label: isEn ? "Work" : "Lavori", icon: Search },
    { href: "/resources", label: isEn ? "Writing" : "Articoli", icon: Search },
    { href: "/contact", label: isEn ? "Contact" : "Contatti", icon: Search },
  ];

  return (
    /* min-h-[100svh], not min-h-screen (=100vh): on mobile 100vh is the
       address-bar-EXPANDED height, so a 100vh root grows the document by the
       toolbar height and the page jumps when the bar collapses. Every other
       route root is 100svh (MOBILE_AUDIT.md D-23) — this was the last one. */
    <div className="min-h-[100svh] bg-background flex flex-col relative">
      <main className="flex-1 flex items-center justify-center section relative">
        <div className="container-px">
          <div className="max-w-2xl mx-auto text-center">
            {/* Entrance = LabelScrambler's decode (it owns every `.eyebrow`);
                no Reveal wrapper on the hero eyebrow, matching the page-hero
                idiom everywhere else. */}
            <p className="eyebrow mb-6 flex items-center justify-center gap-2">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent))]"
                aria-hidden="true"
              />
              {isEn
                ? "404 · Nothing built at this path"
                : "404 · Nessuna pagina a questo indirizzo"}
            </p>

            {/* key={language}: SplitText owns this subtree once split; a
                language swap must remount it or React reconciles against
                orphaned nodes (same contract as SectionHeading's h2). */}
            <h1
              key={language}
              data-split-reveal
              className="font-display text-[clamp(2rem,6.5vw,4.25rem)] leading-[1.1] tracking-[-0.025em] text-ink text-balance mb-8 pb-1"
            >
              {isEn ? (
                <>
                  This route never reached{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    production.
                  </span>
                </>
              ) : (
                <>
                  Questa rotta non è mai arrivata in{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    produzione.
                  </span>
                </>
              )}
            </h1>

            {/* Sub enters after the H1's first line-rise has landed (150ms —
                the contact-hero beat), CTAs a step later: top-down assembly. */}
            <Reveal delay={150}>
              <p className="text-lg sm:text-xl text-muted-foreground mb-10 leading-[1.55] text-balance max-w-lg mx-auto">
                {isEn
                  ? "Either the link is stale, the page moved, or it never shipped at all. Pick a destination below — or just tell us the problem you came here with."
                  : "Il link è obsoleto, la pagina è stata spostata, oppure non è mai stata pubblicata. Scegliete una destinazione qui sotto — o raccontateci il problema per cui siete qui."}
              </p>
            </Reveal>

            <Reveal delay={250}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-14">
                <Button
                  asChild
                  variant="hero"
                  size="lg"
                  className="w-full sm:w-auto px-8 py-6 rounded-full font-semibold"
                >
                  <Link href="/">
                    <Home className="w-4 h-4 mr-2" />
                    {isEn ? "Back to home" : "Torna alla home"}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto px-8 py-6 rounded-full font-semibold"
                >
                  <Link href={START_HREF}>
                    {pick(isEn, CTA.primary)}
                  </Link>
                </Button>
              </div>
            </Reveal>

            {/* Rule + label rise as one beat (the divider rides the Reveal so
                it never pops in ahead of the label it introduces); the chips
                then cascade individually — a quiet 45ms wave, never a grid
                snap. Each chip wrapper is inline-block so the y-rise transform
                actually applies inside the flex row. */}
            <Reveal delay={350} className="pt-8 border-t border-rule/50">
              <p className="eyebrow mb-5">{isEn ? "Or explore" : "O esplora"}</p>
            </Reveal>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestedLinks.map((link, index) => (
                <Reveal
                  key={link.href}
                  as="span"
                  className="inline-block"
                  delay={420 + index * 45}
                >
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/60 bg-background/40 backdrop-blur-sm text-xs font-medium text-muted-foreground hover:text-foreground hover:border-rule/70 transition-colors"
                  >
                    <link.icon className="w-3 h-3" aria-hidden="true" />
                    {link.label}
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
