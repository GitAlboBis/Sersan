"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X, ArrowRight, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/magnetic";
import { SersanLogo } from "@/components/sersan-logo";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { START_HREF } from "@/lib/site";
import { getLenis } from "@/lib/lenis-singleton";
import { useAudioStore } from "@/webgl/store/audioStore";
import { useScrollStore } from "@/webgl/store/scrollStore";

// Real site pages — the dropdown menu navigates the app, not homepage anchors.
type NavItem = { href: string; label: string; labelIt: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/audit", label: "Audit", labelIt: "Audit" },
  { href: "/consulting", label: "Consulting", labelIt: "Consulenza" },
  { href: "/case-studies", label: "Work", labelIt: "Case Study" },
  { href: "/resources", label: "Writing", labelIt: "Articoli" },
  { href: "/about", label: "About", labelIt: "Chi siamo" },
  { href: "/contact", label: "Contact", labelIt: "Contatti" },
  { href: "/trust", label: "Trust", labelIt: "Trust" },
];

// Shared entrance curve — mirrors --ease-entrance in globals.css (and the
// repo's framer `EASE` convention in reveal-on-scroll.tsx).
const EASE = [0.16, 1, 0.3, 1] as const;

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

/**
 * AudioToggle — tasteful on/off control for the procedural UI sounds.
 *
 * Styled to match the mono/minimal nav (the EN/IT pill is the style
 * reference). Shows a speaker icon when on, a muted speaker when off.
 * `data-audio-toggle` lets the delegated click-sound listener skip this
 * control. Default state is ON; the persisted value hydrates client-side, so
 * before hydration we render the default (on) icon — `suppressHydrationWarning`
 * covers the brief post-hydration swap if a returning user had it off.
 */
function AudioToggle({ compact = false }: { compact?: boolean }) {
  const enabled = useAudioStore((s) => s.enabled);
  const toggle = useAudioStore((s) => s.toggle);
  const Icon = enabled ? Volume2 : VolumeX;
  return (
    <button
      type="button"
      data-audio-toggle
      data-cursor="link"
      onClick={() => toggle()}
      aria-pressed={enabled}
      aria-label={enabled ? "Mute interface sounds" : "Unmute interface sounds"}
      title={enabled ? "Sound on" : "Sound off"}
      suppressHydrationWarning
      className={cn(
        // Mirrors the LanguageToggle pill: rounded, bordered, backdrop-blurred,
        // ≥36px tap height for WCAG 2.5.8 while staying visually compact.
        "inline-flex items-center justify-center rounded-full border transition-colors",
        "bg-bg/40 backdrop-blur-md border-rule/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]",
        compact ? "h-9 w-9" : "h-9 w-9",
        enabled ? "text-ink" : "text-ink-mute hover:text-ink",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/**
 * MenuPill — a single dropdown entry. Three-layer hover (AGENTS.md tone:
 * intentional, engineered):
 *   1. resting label slides right + fades out
 *   2. label + arrow enter from the right, above the blob (z-10)
 *   3. a small cyan dot grows into a full cyan fill behind them
 * Rest = white pill (`bg-ink`) / navy text (`text-bg`); hover = cyan blob fill,
 * text stays navy for AA contrast on both white and cyan. `motion-reduce`
 * disables the slide so the hover state still reads but doesn't animate.
 */
function MenuPill({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const { language } = useLanguage();
  const label = language === "it" ? item.labelIt : item.label;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      data-cursor="link"
      className={cn(
        "group relative block w-full overflow-hidden rounded-full border border-rule/60 bg-ink",
        "px-6 py-4 text-center text-xl font-semibold text-bg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]",
      )}
    >
      {/* resting label: scrolls off to the right and fades */}
      <span className="inline-block translate-x-1 transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0 motion-reduce:transition-none">
        {label}
      </span>
      {/* label + arrow: enters from the right ABOVE the blob (z-10) */}
      <span className="absolute inset-0 z-10 flex items-center justify-center gap-2 translate-x-12 text-bg opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100 motion-reduce:transition-none">
        {label}
        <ArrowRight className="h-5 w-5" aria-hidden />
      </span>
      {/* cyan blob: from dot to full fill */}
      <span
        aria-hidden
        className="absolute left-[20%] top-[40%] h-2 w-2 scale-100 rounded-lg bg-accent transition-all duration-300 group-hover:left-0 group-hover:top-0 group-hover:h-full group-hover:w-full group-hover:scale-[1.8] motion-reduce:transition-none"
      />
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close the menu whenever the route changes (covers pill navigation).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Sharpen the nav border once the user has scrolled past the hero edge.
  // Reads the shared scroll source (scrollStore, fed by Lenis or the
  // reduced-motion native fallback in SmoothScrollProvider) instead of a
  // private native scroll listener — section-state-bus convention: one
  // scroll source for the whole app. setScrolled with an unchanged boolean
  // is a React bail-out, so this re-renders only on threshold flips, never
  // per scroll tick.
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    const unsubscribe = useScrollStore.subscribe(update);
    return unsubscribe;
  }, []);

  // While the dropdown is open: lock the background (freeze Lenis smooth-scroll
  // AND lock body overflow so touch/native scroll can't move the page behind
  // the panel), close on Esc / outside-pointer, and return focus to the toggle
  // on dismissal. This is the focus-return + scroll-lock the spec wanted, done
  // by hand since we're not using a modal Radix primitive.
  useEffect(() => {
    if (!open) return;

    getLenis()?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      // Ignore clicks on the toggle (its own handler toggles) and inside the
      // panel — everything else dismisses.
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      document.body.style.overflow = prevOverflow;
      getLenis()?.start();
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && !!pathname?.startsWith(`${href}/`));

  // Stagger orchestration for the pill list. Reduced-motion drops the slide and
  // the stagger so entries just fade in together.
  const listVariants = reduce
    ? { hidden: {}, visible: { transition: { staggerChildren: 0 } } }
    : {
        hidden: {},
        visible: { transition: { delayChildren: 0.08, staggerChildren: 0.04 } },
      };
  const itemVariants = reduce
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.25 } },
      }
    : {
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, ease: EASE },
        },
      };
  // The "tenda" (curtain) unroll — panel grows downward from 0 height. Reduced
  // motion: plain fade, no height animation.
  const panelMotion = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      }
    : {
        initial: { opacity: 0, height: 0 as number | "auto" },
        animate: { opacity: 1, height: "auto" as const },
        exit: { opacity: 0, height: 0 as number | "auto" },
        transition: { duration: 0.4, ease: EASE },
      };

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
        scrolled ? "backdrop-blur-2xl" : "backdrop-blur-xl",
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

          {/* Right cluster — on desktop: EN/IT · audio · Book a call · Menu.
              Below lg: only the Menu toggle (EN/IT, audio and the CTA live
              inside the dropdown). */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="hidden lg:flex items-center gap-2">
              <AudioToggle />
              <LanguageToggle />
            </div>

            {/* Primary CTA — solid brand-blue pill. */}
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

            {/* Menu toggle — opens the dropdown that unrolls below it. */}
            <button
              ref={triggerRef}
              type="button"
              data-cursor="link"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-haspopup="true"
              aria-controls="site-menu"
              aria-label={
                open
                  ? language === "it"
                    ? "Chiudi il menu"
                    : "Close menu"
                  : language === "it"
                    ? "Apri il menu"
                    : "Open menu"
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-full border h-10 px-4 transition-colors",
                "bg-bg/40 backdrop-blur-md border-rule/60 text-ink",
                "hover:text-[hsl(var(--accent))] hover:border-[hsl(var(--accent)/0.6)]",
                open && "text-[hsl(var(--accent))] border-[hsl(var(--accent)/0.6)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]",
              )}
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.12em]">
                Menu
              </span>
              {/* Menu ⟷ X morph — two stacked icons cross-fade + rotate. */}
              <span className="relative inline-flex h-4 w-4 items-center justify-center">
                <Menu
                  aria-hidden="true"
                  className={cn(
                    "absolute h-4 w-4 transition-all duration-300 motion-reduce:transition-none",
                    open
                      ? "opacity-0 rotate-90 scale-50"
                      : "opacity-100 rotate-0 scale-100",
                  )}
                />
                <X
                  aria-hidden="true"
                  className={cn(
                    "absolute h-4 w-4 transition-all duration-300 motion-reduce:transition-none",
                    open
                      ? "opacity-100 rotate-0 scale-100"
                      : "opacity-0 -rotate-90 scale-50",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown "a tenda" — fixed under the bar at the top-right gutter,
          unrolls downward. AnimatePresence plays the exit (curtain rolls up). */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="site-menu"
            ref={panelRef}
            key="site-menu"
            className={cn(
              "fixed right-4 top-[68px] z-[60] w-[min(86vw,300px)] origin-top overflow-hidden",
              "rounded-2xl border border-rule/60",
              "sm:right-6 sm:top-[76px] lg:right-10",
            )}
            style={{
              background:
                "linear-gradient(180deg, hsl(220 24% 11% / 0.98) 0%, hsl(220 24% 8% / 0.98) 100%)",
              backdropFilter: "blur(24px)",
              boxShadow:
                "inset 0 1px 0 hsl(var(--accent) / 0.14), 0 24px 60px -20px hsl(var(--bg) / 0.92), 0 8px 24px -12px hsl(220 30% 2% / 0.8)",
            }}
            initial={panelMotion.initial}
            animate={panelMotion.animate}
            exit={panelMotion.exit}
            transition={panelMotion.transition}
          >
            <div className="p-3 sm:p-4">
              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-2 list-none"
                aria-label="Site pages"
              >
                {NAV_ITEMS.map((item) => (
                  <motion.li key={item.href} variants={itemVariants}>
                    <MenuPill
                      item={item}
                      active={isActive(item.href)}
                      onNavigate={() => setOpen(false)}
                    />
                  </motion.li>
                ))}
              </motion.ul>

              {/* Footer — CTA + EN/IT + audio. Only below lg: on desktop these
                  already live in the bar, so the dropdown stays just the pages. */}
              <div className="lg:hidden mt-3 flex flex-col gap-4 border-t border-rule/60 pt-4">
                <Magnetic className="block" strength={0.2}>
                  <Button
                    asChild
                    variant="hero"
                    size="lg"
                    className="w-full rounded-full"
                  >
                    <Link href={START_HREF} onClick={() => setOpen(false)}>
                      {language === "it" ? "Prenota una call" : "Book a call"}
                    </Link>
                  </Button>
                </Magnetic>
                <div className="flex items-center justify-center gap-3">
                  <LanguageToggle />
                  <AudioToggle />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export default Navbar;
