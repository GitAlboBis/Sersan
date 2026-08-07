"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import { Menu, X, ArrowRight, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/magnetic";
import { SersanLogo } from "@/components/sersan-logo";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { START_HREF } from "@/lib/site";
import { SPINE_TRAVEL_VH } from "@/lib/spine";
import { getLenis } from "@/lib/lenis-singleton";
import { useAudioStore } from "@/webgl/store/audioStore";
import { useScrollStore } from "@/webgl/store/scrollStore";
import {
  armCover,
  disarmCover,
  setReleaseListener,
  announceLift,
} from "@/lib/route-transition-store";

// Real site pages — the dropdown menu navigates the app, not homepage anchors.
type NavItem = { href: string; label: string; labelIt: string };

/**
 * HERO HEADER REVEAL (owner live-review 2026-08-07): on the home hero the
 * header must be INVISIBLE — during the gated intro (page parked at scrollY
 * 0) and while the scroll still sits inside the pinned cinematic spine — and
 * slide/fade in once the visitor has scrolled this fraction of the spine's
 * scrub travel (the owner's 70–90% band → 0.8 ⇒ reveal at ≈232vh of the
 * 290vh travel, while the final spine group is settling). Applies ONLY where
 * the desktop pinned hero actually exists (detected via [data-hero-brand] —
 * the same probe HeroTextParticles uses); interior routes, the mobile
 * fallback and reduced-motion keep the header exactly as before.
 */
const HERO_HEADER_REVEAL = 0.8;

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", labelIt: "Home" },
  { href: "/audit", label: "Audit", labelIt: "Audit" },
  { href: "/consulting", label: "Consulting", labelIt: "Consulenza" },
  { href: "/case-studies", label: "Work", labelIt: "Case Study" },
  { href: "/resources", label: "Writing", labelIt: "Articoli" },
  { href: "/about", label: "About", labelIt: "Chi siamo" },
  { href: "/contact", label: "Contact", labelIt: "Contatti" },
  { href: "/trust", label: "Trust", labelIt: "Trust" },
];

// CustomEase ships with this gsap 3.15 install and is registerable, so the
// dropdown can use a bespoke open/close pair instead of the built-in named
// eases. Registration is idempotent and module-scoped (runs once per load).
// `ease-menu-open` mirrors the repo's --ease-entrance / `[0.16,1,0.3,1]` feel
// (a soft expo.out landing); `ease-menu-close` is a DISTINCT, snappier curve
// so closing reads as a deliberately different gesture from opening.
gsap.registerPlugin(useGSAP, CustomEase);
// Registering by a stable id is idempotent — re-creating the same id just
// overwrites it — so this is safe to run once at module load.
CustomEase.create("ease-menu-open", "0.16, 1, 0.3, 1");
// Accelerating roll-up: eases in, then snaps shut — the close "gesture",
// deliberately distinct from the soft open landing.
CustomEase.create("ease-menu-close", "0.7, 0, 0.84, 0");

// setLanguage plays the site-wide swap beat (language-provider: dip → swap →
// rise on [data-lang-fade]), so the active pill flips ~150ms after the click,
// when the swapped copy actually commits — deliberate: the control and the
// content change state on the same beat, not out of sync. Under reduced
// motion the swap (and the flip) is instant.
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
 * Both labels also micro-open their tracking (0.02em, 180ms ease-out) on an
 * INNER span — the parents' transition-all would drag letter-spacing to their
 * 300ms slide tempo. The pill is a fixed-width block (w-full, centered,
 * overflow-hidden), so the spread re-lays glyphs inside the pill only: zero
 * nav layout shift.
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
        <span className="transition-[letter-spacing] duration-[180ms] ease-out group-hover:tracking-[0.02em] motion-reduce:transition-none">
          {label}
        </span>
      </span>
      {/* label + arrow: enters from the right ABOVE the blob (z-10) */}
      <span className="absolute inset-0 z-10 flex items-center justify-center gap-2 translate-x-12 text-bg opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100 motion-reduce:transition-none">
        <span className="transition-[letter-spacing] duration-[180ms] ease-out group-hover:tracking-[0.02em] motion-reduce:transition-none">
          {label}
        </span>
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

// ---------------------------------------------------------------------------
// Route-transition cover twin — the exit-before-enter half of the navigation
// choreography ("cover → cross → resolve").
// ---------------------------------------------------------------------------

/** Cover sweep duration (the exit). Short + accelerating (power2.in, the
 *  repo's exit gesture): the sheet consumes the old page fast so the click
 *  gets immediate feedback without delaying the navigation underneath. */
const COVER_DURATION = 0.38;
/** Beat between the new route committing (release) and the lift starting —
 *  long enough for the new page's first paint to settle under the sheet,
 *  short enough to read as one continuous gesture. */
const COVER_HOLD = 0.12;
/** Lift duration — mirrors template.tsx's CURTAIN_DURATION so the covered and
 *  uncovered navigation paths resolve on the same beat. */
const LIFT_DURATION = 0.62;
/** Hard failsafe: if the armed navigation never commits (preventDefault'd
 *  click, route error, anything), force-open so the page can NEVER rest
 *  covered. Slightly shorter than the store's freshness window (1.5s) so a
 *  commit that beats freshness still finds a consistent (open) twin. */
const FAILSAFE_MS = 1200;

/**
 * RouteTransitionCover — a persistent, fixed navy sheet (a "twin" of the
 * template curtain) owned by the layout-level navbar, plus the document-level
 * click listener that arms it.
 *
 * Why it lives HERE and not in template.tsx: the cover phase must play over
 * the OLD page, before Next commits the route — but App Router remounts
 * template.tsx on commit, so the old template (and any element it owns) dies
 * exactly when the crossing needs continuity. The navbar mounts once in the
 * root layout and survives every navigation, making it the natural host —
 * the same reasoning that puts the flip-handoff overlay at layout level.
 *
 * The sheet's journey is ONE upward pass through the viewport, driven by a
 * single proxy scalar j ∈ [0..2]:
 *   j 0→1  COVER: rises from the bottom edge until fully covering (click time)
 *   j = 1  COVERED: holds while Next commits the route underneath
 *   j 1→2  LIFT: continues upward, revealing the new page bottom-up
 * A travelling luminous edge (the displacement-wipe rim recipe — cyan→blue
 * hairline + glow) rides the moving boundary, opacity belled sin(π·p) per
 * phase so it ignites mid-sweep and resolves out at both rests. Both rest
 * poses (j=0 and j=2) are zero-area — the sheet is invisible at rest, so
 * normalizing j between navigations can never flash.
 *
 * Guarantees (the template-curtain discipline, copied):
 *   - pointer-events:none always (base .transition-curtain class), aria-hidden.
 *   - Ships open (CSS default pose) — first paint is never covered, and paths
 *     where the choreography never runs never see it.
 *   - Every terminal path re-asserts the byte-identical open pose
 *     (`inset(0% 0% 100% 0%)`), and the failsafe force-opens + disarms if the
 *     navigation never commits — no interruption can rest covered.
 *   - prefers-reduced-motion: the click listener never arms, and the base
 *     class is display:none in globals.css (belt-and-suspenders).
 *   - Sits at z-40: BELOW the fixed navbar (z-50), above the z-[1] content
 *     wrapper — exactly the layers the template curtain covers (it lives
 *     inside that wrapper), so the covered→covered handoff between the two
 *     identical sheets is pixel-invisible.
 */
function RouteTransitionCover() {
  const twinRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const twin = twinRef.current;
      if (!twin || typeof window === "undefined") return;

      type Phase = "open" | "covering" | "covered" | "lifting";
      let phase: Phase = "open";
      // Release arrived while the cover sweep was still running (fast commit,
      // e.g. a prefetched route) — the sweep's onComplete continues into the
      // lift instead of aborting mid-cover with a hard cut.
      let pendingRelease = false;
      let failsafeId = 0;
      // The OLD page's content wrapper, dipped during the cover. Tracked so
      // the failsafe can restore it if the navigation never commits (on a
      // successful commit the element unmounts with the old template — its
      // inline dip dies with it, no cleanup needed).
      let dipped: HTMLElement | null = null;

      // Single proxy driving both clip-path and the travelling edge, so the
      // sheet and its rim can never desync. Rest pose after a full journey.
      const pose = { j: 2 };

      const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

      /** Map j onto the sheet + edge. Direct style writes (no per-frame GSAP
       *  target parsing); the edge is a child of the clipped sheet, so its
       *  glow only bleeds onto the sheet side — the page side stays clean. */
      const apply = () => {
        const el = twinRef.current;
        const edge = edgeRef.current;
        if (!el) return;
        const j = pose.j;
        if (j <= 1) {
          // COVER: top inset shrinks — the sheet grows upward from the bottom.
          const inset = ((1 - j) * 100).toFixed(3);
          el.style.clipPath = `inset(${inset}% 0% 0% 0%)`;
          if (edge) {
            // Leading (top) boundary; the 2px hairline hangs just inside it.
            edge.style.top = `${inset}%`;
            edge.style.transform = "translateY(0)";
            edge.style.opacity = String(Math.sin(Math.PI * clamp01(j)));
          }
        } else {
          // LIFT: bottom inset grows — the sheet retreats upward, revealing
          // the page bottom-up (same pose family as the template curtain).
          const inset = ((j - 1) * 100).toFixed(3);
          el.style.clipPath = `inset(0% 0% ${inset}% 0%)`;
          if (edge) {
            // Trailing (bottom) boundary; translate the hairline back inside
            // the visible region or the clip would swallow it entirely.
            edge.style.top = `${((2 - j) * 100).toFixed(3)}%`;
            edge.style.transform = "translateY(-100%)";
            edge.style.opacity = String(Math.sin(Math.PI * clamp01(j - 1)));
          }
        }
      };

      /** Terminal state for every path: fully open, inert, byte-identical to
       *  the CSS default so an un-animated mount and a finished journey are
       *  indistinguishable. */
      const assertOpen = () => {
        gsap.killTweensOf(pose);
        pose.j = 2;
        phase = "open";
        pendingRelease = false;
        if (twinRef.current) {
          gsap.set(twinRef.current, {
            clipPath: "inset(0% 0% 100% 0%)",
            pointerEvents: "none",
          });
        }
        if (edgeRef.current) gsap.set(edgeRef.current, { opacity: 0 });
      };

      /** LIFT (j 1→2) after the hold. The hold is the tween's own delay so
       *  killTweensOf(pose) cancels a lift still waiting in it. onStart (which
       *  fires AFTER the delay) announces the beat: Scene.tsx re-ignites the
       *  signature line's reveal on it, so the line redraws THROUGH the
       *  uncovering viewport — the visible crossing. */
      const startLift = () => {
        phase = "lifting";
        gsap.to(pose, {
          j: 2,
          delay: COVER_HOLD,
          duration: LIFT_DURATION,
          ease: "expo.inOut",
          onStart: announceLift,
          onUpdate: apply,
          onComplete: assertOpen,
        });
      };

      /** Failsafe: the armed click never navigated. Restore everything the
       *  arm touched — sheet open, arm flag cleared, old page un-dipped, line
       *  reveal back — so an aborted navigation leaves zero residue. */
      const forceOpen = () => {
        disarmCover();
        pendingRelease = false;
        if (dipped) {
          gsap.killTweensOf(dipped);
          gsap.to(dipped, {
            autoAlpha: 1,
            duration: 0.3,
            ease: "power2.out",
            clearProps: "all",
          });
          dipped = null;
        }
        useScrollStore.getState().setReveal(1);
        if (phase === "covering" || phase === "covered") {
          phase = "lifting";
          gsap.killTweensOf(pose);
          gsap.to(pose, {
            j: 2,
            duration: 0.45,
            ease: "expo.inOut",
            onUpdate: apply,
            onComplete: assertOpen,
          });
        }
      };

      /** Template.tsx consumed the armed handoff on the new route's mount. */
      const onRelease = () => {
        window.clearTimeout(failsafeId);
        // The dip target just unmounted with the old template — kill its tween
        // so nothing keeps writing to a detached node.
        if (dipped) {
          gsap.killTweensOf(dipped);
          dipped = null;
        }
        if (phase === "covering") {
          pendingRelease = true;
          return;
        }
        if (phase === "covered") {
          startLift();
          return;
        }
        // Mid-lift commit (interleaved navigations): the sheet is already
        // uncovering, so the visible lift IS this navigation's crossing —
        // announce it, or Scene's per-pathname effect (which just set reveal
        // to 0 on commit) sits dark until its 650ms fallback and the line
        // pops in out of beat on an already-open page.
        if (phase === "lifting") {
          announceLift();
          return;
        }
        // Already open: the failsafe resolved before this (very) slow commit.
        // No sheet to lift — just announce so the line redraw isn't left
        // waiting on Scene's fallback timer.
        if (phase === "open") announceLift();
      };

      /** COVER, from a click on an internal link. */
      const beginCover = (contentEl: HTMLElement | null) => {
        // Newest click owns the pending navigation: refresh the arm + failsafe
        // even when a sweep is already running (rapid re-click).
        window.clearTimeout(failsafeId);
        failsafeId = window.setTimeout(forceOpen, FAILSAFE_MS);
        armCover();
        // The signature line dims as the page is consumed — Scene.tsx re-arms
        // reveal on the new pathname either way; this just starts the fade on
        // the click beat instead of the commit beat.
        useScrollStore.getState().setReveal(0);
        // The newest click owns the pending navigation — clear any release
        // latched by a PREVIOUS commit BEFORE the in-flight early-return, or
        // a rapid re-click inherits the stale flag and onCovered lifts the
        // sheet for the wrong navigation (the new route then swaps in fully
        // uncovered). The superseding route's own commit re-latches it.
        pendingRelease = false;
        if (phase === "covering" || phase === "covered") return;

        gsap.killTweensOf(pose);
        const onCovered = () => {
          phase = "covered";
          if (pendingRelease) {
            pendingRelease = false;
            startLift();
          }
        };
        if (phase === "open") {
          // Both rest poses are zero-area, so snapping j to the pre-cover pose
          // can never flash.
          pose.j = 0;
          apply();
          phase = "covering";
          gsap.to(pose, {
            j: 1,
            duration: COVER_DURATION,
            ease: "power2.in",
            onUpdate: apply,
            onComplete: onCovered,
          });
        } else {
          // Mid-lift re-arm: bring the sheet back down from wherever it is —
          // spatially continuous, no restart-from-bottom pop.
          phase = "covering";
          gsap.to(pose, {
            j: 1,
            duration: 0.28,
            ease: "power2.in",
            onUpdate: apply,
            onComplete: onCovered,
          });
        }

        // The old page dims under the sweep — a dim alone is enough, the sheet
        // covers fast. Deliberately NO transform: a y-drift would make this
        // wrapper a containing block for position:fixed descendants, and the
        // /resources DOM-fallback preview card is exactly that AND can be
        // visible at click time (you click the row you're hovering) — it would
        // jump mid-cover. The enter tween's transform never hits this (nothing
        // is hovered during an enter); the exit must stay opacity-only. On
        // commit the element unmounts with its inline styles.
        if (contentEl) {
          dipped = contentEl;
          gsap.killTweensOf(contentEl);
          gsap.to(contentEl, {
            autoAlpha: 0.8,
            duration: COVER_DURATION,
            ease: "power2.in",
          });
        }
      };

      // Document-level BUBBLE-phase listener (not capture): it runs after the
      // target's own handlers, so (a) e.defaultPrevented is meaningful and
      // (b) the flip-handoff's target-level arm has already happened for card
      // clicks. Next's <Link> has also already scheduled its transition — the
      // commit lands asynchronously, well after this same-tick sweep starts.
      // Never calls preventDefault: prefetch/navigation semantics untouched.
      const onClick = (e: MouseEvent) => {
        if (e.defaultPrevented) return;
        // Plain same-tab left click only — modified clicks open elsewhere and
        // must never be covered (mirrors use-flip-source's guard).
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return;
        // Live check (not a mount-time snapshot) so toggling the OS setting
        // mid-session is honored without a reload.
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
          return;
        const target = e.target as HTMLElement | null;
        const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
        if (!link) return;
        // New-tab / download links never navigate this document.
        if (link.target && link.target !== "_self") return;
        if (link.hasAttribute("download")) return;
        // Explicit opt-out hook for links that manage their own transition.
        if (link.closest("[data-no-curtain]")) return;
        // Work-card zoom clicks: the inflating clone IS that navigation's
        // curtain (flip-handoff suppresses the template wipe too) — one cover
        // per navigation. Skipped by attribute rather than by peeking the flip
        // store so coarse/RM clicks (where the flip never arms) also fall
        // through to today's behavior unchanged.
        if (link.closest("[data-flip-source]")) return;
        let url: URL;
        try {
          url = new URL(link.href, window.location.href);
        } catch {
          return;
        }
        // External origins (and mailto:/tel:, whose origin never matches)
        // leave the page — no crossing to stage.
        if (url.origin !== window.location.origin) return;
        // Same-pathname covers hash-only and query-only clicks: template does
        // not remount for those, so a cover would have no release and would
        // ride the failsafe — never arm it.
        if (url.pathname === window.location.pathname) return;

        beginCover(
          document.querySelector<HTMLElement>("[data-route-content]"),
        );
      };

      document.addEventListener("click", onClick);
      setReleaseListener(onRelease);

      return () => {
        document.removeEventListener("click", onClick);
        setReleaseListener(null);
        window.clearTimeout(failsafeId);
        if (dipped) gsap.killTweensOf(dipped);
        // Unmount mid-journey (StrictMode remount, HMR): never rest covered.
        assertOpen();
      };
    },
    { scope: twinRef },
  );

  return (
    // Decorative, never traps interaction (base class is pointer-events:none
    // and display:none under reduced-motion). Ships in the CSS default OPEN
    // pose; only an armed click ever makes it visible.
    <div
      ref={twinRef}
      className="transition-curtain transition-curtain--cover"
      aria-hidden="true"
    >
      <div ref={edgeRef} className="transition-curtain__edge" />
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  // `render` keeps the panel in the DOM while it animates closed. It is set
  // true the instant `open` flips true, and dropped to false only by the close
  // tween's onComplete (or immediately under reduced motion). This lets the
  // GSAP close animation play on a still-mounted node, then unmount cleanly.
  const [render, setRender] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // True while the header must stay off-screen inside the home hero
  // (intro gate + pinned spine — see HERO_HEADER_REVEAL). Initial false =
  // the SSR/hydration paint matches every route; on the desktop home the
  // mount-time update() flips it before the preloader (z-[100], above this
  // z-50 bar) lifts, so the bar is never seen inside the hero.
  const [heroHidden, setHeroHidden] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close the menu whenever the route changes (covers pill navigation).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Mount the panel the moment it opens. Unmounting on close is deferred to the
  // close tween's onComplete (see the useGSAP block below) so the roll-up can
  // animate on a live node; this effect only ever turns rendering ON.
  useEffect(() => {
    if (open) setRender(true);
  }, [open]);

  // Sharpen the nav border once the user has scrolled past the hero edge,
  // and HIDE the whole bar inside the home hero (owner 2026-08-07 — see
  // HERO_HEADER_REVEAL). Reads the shared scroll source (scrollStore, fed by
  // Lenis or the reduced-motion native fallback in SmoothScrollProvider)
  // instead of a private native scroll listener — section-state-bus
  // convention: one scroll source for the whole app. setState with an
  // unchanged boolean is a React bail-out, so this re-renders only on
  // threshold flips, never per scroll tick. During the intro gate the page
  // is parked at scrollY 0 → hidden the whole beat; scrolling back into the
  // hero hides it again (symmetric threshold). NOT ScrollTrigger — no pin,
  // no trigger, just the scroll value.
  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 24);
      // [data-hero-brand] exists ONLY in the desktop pinned hero layout
      // (HeroTextParticles gates its mount on the same probe): interior
      // routes / mobile fallback / reduced motion → header always visible.
      // The attribute query per tick is a µs-class lookup; the setState
      // bail-out keeps React out of the hot path entirely.
      const heroLayout =
        pathname === "/" && !!document.querySelector("[data-hero-brand]");
      const revealPx =
        window.innerHeight * (SPINE_TRAVEL_VH / 100) * HERO_HEADER_REVEAL;
      setHeroHidden(heroLayout && window.scrollY < revealPx);
    };
    update();
    const unsubscribe = useScrollStore.subscribe(update);
    return unsubscribe;
  }, [pathname]);

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

  // Dropdown open/close — GSAP, EaseReverseClipMenu style. The panel "unrolls"
  // downward via a clip-path inset (NOT a height-to-auto tween, which GSAP
  // can't do), and the pill list staggers in. OPEN uses the soft expo landing
  // (`ease-menu-open`); CLOSE uses the snappier, distinct `ease-menu-close`.
  //
  // Interruptible: each pass kills any in-flight tweens on the same targets
  // (`gsap.killTweensOf`) and starts a fresh timeline, so re-opening mid-close
  // (or vice-versa) resolves cleanly to the correct end state. The timeline is
  // stored on a ref so a later toggle can supersede it. Reduced motion: an
  // instant fade with no clip/scale/stagger, staying fully usable.
  //
  // The driver keys on `render` (so it runs once the panel node exists) and
  // `open` (direction). On close-complete it drops `render` to unmount the
  // panel; on reduced-motion close it unmounts immediately.
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel) return;

      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const items = listRef.current
        ? Array.from(listRef.current.children)
        : [];

      tlRef.current?.kill();
      gsap.killTweensOf([panel, ...items]);

      if (open) {
        if (reduce) {
          // Instant, usable: no clip/scale/stagger — just present.
          gsap.set(panel, {
            clipPath: "inset(0% 0% 0% 0%)",
            autoAlpha: 1,
          });
          gsap.set(items, { autoAlpha: 1, y: 0 });
          return;
        }
        const tl = gsap.timeline();
        tl.fromTo(
          panel,
          { clipPath: "inset(0% 0% 100% 0%)", autoAlpha: 0 },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            autoAlpha: 1,
            duration: 0.42,
            ease: "ease-menu-open",
          },
        ).fromTo(
          items,
          { autoAlpha: 0, y: 8 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.35,
            ease: "ease-menu-open",
            stagger: 0.04,
          },
          0.08,
        );
        tlRef.current = tl;
        return;
      }

      // CLOSE. Only meaningful when the node is still rendered.
      if (!render) return;

      if (reduce) {
        gsap.set(panel, { autoAlpha: 0 });
        setRender(false);
        return;
      }
      const tl = gsap.timeline({
        onComplete: () => setRender(false),
      });
      tl.to(panel, {
        clipPath: "inset(0% 0% 100% 0%)",
        autoAlpha: 0,
        duration: 0.3,
        ease: "ease-menu-close",
      });
      tlRef.current = tl;
    },
    { dependencies: [open, render], scope: panelRef },
  );

  return (
    <>
    <nav
      // HERO HIDE (owner 2026-08-07): inside the home hero the bar slides up
      // + fades out and is fully inert (no pointer targets, no tab stops, no
      // AT exposure — `inert` + aria-hidden), then slides back down once the
      // scroll clears HERO_HEADER_REVEAL of the spine travel. When revealed
      // it is byte-identical to before (the attributes are removed, not
      // toggled to false-y strings). The audio toggle and the "SALTA
      // L'INTRO · ESC" hint live outside this bar and are untouched.
      inert={heroHidden || undefined}
      aria-hidden={heroHidden || undefined}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-[border-color,backdrop-filter,background-color,box-shadow,transform,opacity] duration-300 motion-reduce:transition-none",
        // Steel-panel bar — vertical gradient (lit top → darker bottom)
        // implies ambient light from above the page, same as the
        // card-steel components below. Inset shadows give the bar
        // material thickness:
        //   - top:    1px brand-blue lip (chamfered metal highlight)
        //   - bottom: 1px brand-blue rule (panel separation line)
        //   - drop:   soft glow that grows on scroll
        "border-b border-[hsl(var(--ink)/0.05)]",
        scrolled ? "backdrop-blur-2xl" : "backdrop-blur-xl",
        heroHidden
          ? "-translate-y-full opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100",
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
            <SersanLogo size="md" href="/" />
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
                  {/* Magnetic's two-layer hook: the label counter-translates
                      under the shell. Inner span, NOT the Link — the button's
                      CSS transform transition would smear per-frame writes. */}
                  <span
                    data-magnetic-label
                    className="inline-block will-change-transform"
                  >
                    {language === "it" ? "Prenota una call" : "Book a call"}
                  </span>
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
          unrolls downward. Stays mounted (`render`) while the GSAP close tween
          rolls it back up; the tween's onComplete unmounts it. The opening
          clip-path/stagger and the snappier close both run in the useGSAP
          block above (interruptible, reduced-motion aware). */}
      {render && (
        <div
          id="site-menu"
          ref={panelRef}
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
            // Hidden until the open tween paints it — prevents a flash of the
            // fully-laid-out panel on the frame before GSAP runs.
            visibility: "hidden",
          }}
        >
          <div className="p-3 sm:p-4">
            <ul
              ref={listRef}
              className="flex flex-col gap-2 list-none"
              aria-label="Site pages"
            >
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <MenuPill
                    item={item}
                    active={isActive(item.href)}
                    onNavigate={() => setOpen(false)}
                  />
                </li>
              ))}
            </ul>

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
                    <span
                      data-magnetic-label
                      className="inline-block will-change-transform"
                    >
                      {language === "it" ? "Prenota una call" : "Book a call"}
                    </span>
                  </Link>
                </Button>
              </Magnetic>
              <div className="flex items-center justify-center gap-3">
                <LanguageToggle />
                <AudioToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
    {/* Exit-before-enter cover twin + its document-level arming listener.
        A SIBLING of the nav, not a child: the nav's backdrop-filter makes it
        a containing block for fixed descendants, which would pin the
        full-viewport sheet to the 64px bar. Hosted by Navbar because Navbar
        is the persistent layout-level client component that survives the
        template remount the cover must bridge. */}
    <RouteTransitionCover />
    </>
  );
}

export default Navbar;
