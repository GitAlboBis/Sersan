"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/magnetic";
import { SersanLogo } from "@/components/sersan-logo";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { START_HREF } from "@/lib/site";

// Use homepage anchors so the nav works from /. On sub-pages the leading `/`
// sends users back to the homepage with the hash, which is the right behavior.
type NavItem = { href: string; label: string; labelIt: string };

// Buyer-intent nav. "Start" is rendered as a primary CTA pill at the right,
// not as a regular nav item — so it's excluded from this list and added
// separately below.
const NAV_ITEMS: NavItem[] = [
  { href: "/#services", label: "Services", labelIt: "Servizi" },
  { href: "/#use-cases", label: "Solutions", labelIt: "Soluzioni" },
  { href: "/#work", label: "Case Studies", labelIt: "Case Study" },
  { href: "/#process", label: "Process", labelIt: "Processo" },
];

function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full p-0.5 border",
        "bg-bg/40 backdrop-blur-md border-rule/60",
      )}
      role="group"
      aria-label="Language selection"
    >
      {(["en", "it"] as const).map((lang) => {
        const active = language === lang;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            aria-pressed={active}
            aria-label={lang === "en" ? "Switch to English" : "Switch to Italian"}
            className={cn(
              // ≥36px tap height (WCAG 2.5.8 target size) while staying visually
              // compact — the pill reads small but the hit area is comfortable.
              "inline-flex items-center justify-center rounded-full font-mono font-medium uppercase tracking-[0.1em] transition-colors",
              compact ? "px-2.5 h-9 text-[10px]" : "px-3 h-9 text-[11px]",
              active ? "bg-ink/[0.08] text-ink" : "text-ink-mute hover:text-ink",
            )}
          >
            {lang.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Anchor (without leading "#") of the homepage section the user is
  // currently inside. Drives the active-state styling on nav items whose
  // href is /#<anchor>. Empty string when none is in view.
  const [activeSection, setActiveSection] = useState<string>("");

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Sharpen the nav border once the user has scrolled past the hero edge.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track which homepage section is in view via IntersectionObserver.
  // Only attaches on the homepage. Each nav item with href "/#<id>" gets
  // an "active" style when its section dominates the viewport.
  useEffect(() => {
    if (pathname !== "/") {
      setActiveSection("");
      return;
    }
    const ids = NAV_ITEMS
      .map((item) => item.href)
      .filter((href) => href.startsWith("/#"))
      .map((href) => href.slice(2));

    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (sections.length === 0) return;

    // Centered detection band: a section is "active" once it crosses the
    // middle ~10% of the viewport (rootMargin shrinks the root to a thin
    // horizontal band at the center). This works regardless of section
    // height — a very tall section (e.g. #work) activates as its body
    // passes the band, where an intersectionRatio threshold never would
    // because a tall section's ratio stays low. We track the set of
    // currently-intersecting ids and pick the one closest to band center.
    const intersecting = new Set<string>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) intersecting.add(entry.target.id);
          else intersecting.delete(entry.target.id);
        }
        if (intersecting.size === 0) return;
        // Pick the intersecting section whose center is closest to the
        // viewport center, so the indicator tracks the dominant section.
        const mid = window.innerHeight / 2;
        let best = "";
        let bestDist = Infinity;
        for (const id of intersecting) {
          const el = document.getElementById(id);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          const dist = Math.abs(center - mid);
          if (dist < bestDist) {
            bestDist = dist;
            best = id;
          }
        }
        if (best) setActiveSection(best);
      },
      {
        threshold: 0,
        // Shrink the root to a centered horizontal band (~10% tall). A
        // section "intersects" only while it overlaps that band.
        rootMargin: "-45% 0px -45% 0px",
      },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [pathname]);

  const isActive = (href: string) => {
    if (href.startsWith("/#")) {
      // Active when on homepage and the matching section is in view.
      return pathname === "/" && href.slice(2) === activeSection;
    }
    return (
      pathname === href ||
      (href !== "/" && pathname?.startsWith(`${href}/`))
    );
  };

  const desktopLinkClasses = (active: boolean) =>
    cn(
      // Scaled up to actually belong in a 68px steel bar. Sans-serif
      // body face (Geist Sans) keeps it premium — mono was reading too
      // technical / cramped. 13.5px lets the label breathe against the
      // tall bar; tracking 0.04em is conversational, not industrial.
      "text-[13.5px] font-medium tracking-[0.005em] px-4 py-2.5 transition-colors duration-300 relative",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))] focus-visible:rounded-sm",
      // Active indicator — slightly wider 2px line in accent, anchored
      // 6px below the label so it visibly tracks the active item without
      // touching the text.
      active
        ? "text-ink after:absolute after:left-1/2 after:-translate-x-1/2 after:-bottom-px after:h-[2px] after:w-8 after:rounded-full after:bg-[hsl(var(--accent))]"
        : // Soft animated underline on hover: a centred 2px accent rule that
          // grows from 0 → 2rem. motion-reduce skips the width transition (the
          // underline still appears on hover, just without the slide).
          "text-ink-mute hover:text-ink after:absolute after:left-1/2 after:-translate-x-1/2 after:-bottom-px after:h-[2px] after:w-0 after:rounded-full after:bg-[hsl(var(--accent)/0.7)] after:transition-[width] after:duration-300 hover:after:w-8 motion-reduce:after:transition-none",
    );

  const mobileLinkClasses = (active: boolean) =>
    cn(
      "font-display text-sm font-semibold tracking-widest uppercase px-4 py-3 rounded-lg transition-colors duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]",
      active
        ? "text-ink bg-ink/[0.06] border border-ink/15"
        : "text-ink-mute hover:text-ink hover:bg-ink/[0.04]",
    );

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-[border-color,backdrop-filter,background-color,box-shadow] duration-300",
        // Steel-panel bar — vertical gradient (lit top → darker bottom)
        // implies ambient light from above the page, same as the
        // card-steel components below. Inset shadows give the bar
        // material thickness:
        //   - top:    1px brand-blue lip (chamfered metal highlight)
        //   - bottom: 1px brand-blue rule (panel separation line)
        //   - drop:   soft glow that grows on scroll
        "border-b border-[hsl(var(--ink)/0.05)]",
        scrolled
          ? "backdrop-blur-2xl"
          : "backdrop-blur-xl",
      )}
      style={{
        background: scrolled
          ? "linear-gradient(180deg, hsl(220 24% 9% / 0.86) 0%, hsl(220 24% 7% / 0.86) 100%)"
          : "linear-gradient(180deg, hsl(220 24% 9% / 0.7) 0%, hsl(220 24% 7% / 0.6) 100%)",
        boxShadow: scrolled
          ? "inset 0 1px 0 hsl(var(--accent) / 0.16), inset 0 -1px 0 hsl(220 30% 4% / 0.7), 0 1px 0 hsl(var(--accent) / 0.08), 0 16px 40px -18px hsl(var(--bg) / 0.95)"
          : "inset 0 1px 0 hsl(var(--accent) / 0.10), inset 0 -1px 0 hsl(220 30% 4% / 0.55)",
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* The nav bar uses its own gutter rather than the page `container-px`
          (whose --margin jumps to 10rem at ≥1280px). That jump squeezed the
          right cluster and clipped the "Book a call" pill right at 1280. A
          flat px-6/lg:px-10 gutter + max-w keeps the toggle + CTA fully
          visible at 1280 AND 1440 with consistent spacing. */}
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-4 lg:gap-6 h-16 sm:h-[68px]">
          {/* Left cluster — logo + a tiny status dot. The dot is a premium
              touch: the same pulse the eyebrow status-dot uses elsewhere,
              telling the visitor the studio is active. */}
          <div className="flex items-center gap-3 shrink-0">
            <SersanLogo size="md" />
            <span
              aria-hidden="true"
              className="hidden sm:inline-block status-dot"
              title="Studio open"
            />
          </div>

          {/* Desktop nav — perfectly balanced in the middle of the bar.
              Plain anchor list; no menubar semantics (the role implies
              arrow-key behaviour we don't ship). The outer <nav> landmark
              is enough for screen readers. */}
          <ul className="hidden lg:flex items-center gap-1 list-none">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={desktopLinkClasses(!!active)}
                  >
                    {language === "it" ? item.labelIt : item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="hidden sm:block">
              <LanguageToggle />
            </div>

            {/* Primary CTA — solid brand-blue pill. Geist Sans body face at
                13px matches the nav links scale; tighter tracking + the
                semibold weight from the hero variant keep it pill-shaped
                rather than essay-shaped. */}
            <Magnetic className="hidden lg:inline-block" strength={0.25}>
              <Button
                asChild
                variant="hero"
                size="lg"
                className="inline-flex text-[13px] tracking-[0.005em] h-10 px-5"
              >
                <Link href={START_HREF}>
                  {language === "it" ? "Prenota una call" : "Book a call"}
                </Link>
              </Button>
            </Magnetic>

            {/* Mobile menu trigger */}
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-ink h-11 w-11"
                  aria-label="Open navigation menu"
                  aria-expanded={open}
                  aria-controls="mobile-menu"
                >
                  <Menu className="h-6 w-6" aria-hidden="true" />
                </Button>
              </Dialog.Trigger>

              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
                <Dialog.Content
                  id="mobile-menu"
                  aria-label="Mobile navigation"
                  className={cn(
                    "fixed top-0 right-0 z-50 h-full w-80 max-w-[88vw]",
                    "bg-bg/95 backdrop-blur-2xl border-l border-[hsl(var(--accent)/0.15)]",
                    "shadow-[-10px_0_40px_hsl(var(--bg)/0.5)]",
                    "p-6 flex flex-col gap-8",
                    "data-[state=open]:animate-in data-[state=closed]:animate-out",
                    "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <SersanLogo size="sm" />
                    <div className="flex items-center gap-2">
                      <LanguageToggle compact />
                      <Dialog.Close asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Close navigation menu"
                          className="text-ink h-11 w-11"
                        >
                          <X className="h-5 w-5" aria-hidden="true" />
                        </Button>
                      </Dialog.Close>
                    </div>
                  </div>

                  <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Primary site navigation
                  </Dialog.Description>

                  <ul className="flex flex-col gap-1 list-none" aria-label="Mobile navigation links">
                    {NAV_ITEMS.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(mobileLinkClasses(!!active), "block")}
                          >
                            {language === "it" ? item.labelIt : item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  <Button asChild variant="hero" size="lg" className="mt-2 w-full">
                    <Link href={START_HREF}>
                      {language === "it" ? "Prenota una call" : "Book a call"}
                    </Link>
                  </Button>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
