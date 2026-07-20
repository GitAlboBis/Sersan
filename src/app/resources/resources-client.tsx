"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  resources,
  type Resource,
  type ResourceCategory,
} from "@/data/resources";
import { useLanguage } from "@/components/language-provider";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTierStore } from "@/webgl/store/tierStore";
import { webgpuEnabled } from "@/webgl/renderer/createRenderer";
import {
  useResourcePreview,
  ResourcePreviewCard,
  type ResourceItemHandlers,
} from "@/components/resources/resource-preview";

// Flip is already registered by the persistent flip-handoff overlay (root
// layout), so this adds no bundle weight — registering again is idempotent
// and keeps this module self-sufficient if the overlay is ever removed.
if (typeof window !== "undefined") gsap.registerPlugin(Flip, ScrollTrigger);

/* ------------------------------------------------------------------------- */
/* Type filter rail + FLIP re-sort                                            */
/* ------------------------------------------------------------------------- */

/**
 * Spec-ordered type rail (All · Article · Guide · Case Study · Whitepaper),
 * intersected with what actually exists in the data: a category with zero
 * posts silently drops its pill instead of offering a click that filters the
 * list into blankness. Category ids double as the ?filter= slugs (they are
 * already URL-safe: "case-study").
 */
const CATEGORY_ORDER: ResourceCategory[] = [
  "article",
  "guide",
  "case-study",
  "whitepaper",
];
const CATEGORIES = CATEGORY_ORDER.filter((c) =>
  resources.some((r) => r.category === c),
);

type CategoryFilter = "all" | ResourceCategory;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One mono filter pill. Eyebrow language (JetBrains Mono, uppercase, tracked)
 * with the site's dot idiom: the dot is ALWAYS in the layout (accent when
 * active, rule-grey at rest) so toggling never reflows the rail. h-9 keeps the
 * ≥36px tap height of the navbar's language pill (WCAG 2.5.8 target size);
 * keyboard focus is handled by the global :focus-visible ring.
 */
function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-cursor="link"
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-300",
        active
          ? "border-[hsl(var(--accent)/0.55)] bg-[hsl(var(--accent)/0.08)] text-ink"
          : "border-rule/80 text-ink-mute hover:border-rule hover:text-ink",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full transition-colors duration-300",
          active ? "bg-[hsl(var(--accent))]" : "bg-rule",
        )}
      />
      {label}
    </button>
  );
}

/**
 * useArchiveResort — entrance choreography + FLIP re-sort engine for the
 * article list. Deliberately a LOCAL twin of the hook in
 * case-studies/case-studies-client.tsx (the two archives stay independently
 * tunable and neither route imports the other's module for a shared hook —
 * same rationale as that file's local INDUSTRY_COLOR copy). Row-specific
 * tuning here: the wave steps 0.07s and caps at 4 like the old
 * Math.min(i, 4) * 70ms Reveal delays this replaces.
 *
 * ENTRANCES — rows fade + rise 24px (0.85s expo.out) via ONE
 * IntersectionObserver over the row wrappers. Entries that arrive in the
 * SAME IO callback crossed the threshold together and stagger as one wave;
 * a solo row on a slow scroll enters alone. IO (not ScrollTrigger) so
 * wrappers mounted already-in-view after an SPA navigation still fire —
 * same contract as ui/reveal.tsx, which owned these entrances before the
 * filter rail existed (a Reveal wrapper can't be reused here: its once-only
 * IO play would fight the flip's onEnter when a filtered-out row returns).
 *
 * RE-SORT — the pill click calls arm() BEFORE the React state change:
 * Flip.getState captures the resting list, React re-renders (display:none
 * via the `hidden` class — rows stay MOUNTED so Flip can classify
 * visible→hidden as "leaving" and hidden→visible as "entering", and so each
 * row keeps its SOURCE-array index for the preview store), then the layout
 * effect keyed on the filter plays Flip.from before paint: movers glide
 * (0.6s expo.inOut, 0.03 stagger, absolute so the column re-packs beneath
 * them), leavers fall away (0.25s power2.in), enterers rise in (0.4s
 * expo.out). The CONTAINER itself is captured too, so the list height eases
 * instead of snapping (no scrollbar jump). clearProps on complete: no
 * transforms ever rest on rows (the lens caches row rects per pointerenter).
 *
 * Reduced motion: arm() refuses to capture → the layout effect takes the
 * instant path (plain re-render + ScrollTrigger re-measure only).
 */
function useArchiveResort(
  containerRef: React.RefObject<HTMLDivElement | null>,
  filter: string,
) {
  const pendingState = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const mounted = useRef(false);

  const items = () =>
    containerRef.current
      ? Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(
            "[data-archive-item]",
          ),
        )
      : [];

  useEffect(() => {
    const els = items();
    if (!els.length) return;
    if (prefersReducedMotion()) {
      // Instant final state — SSR markup is already visible, so there is
      // nothing to set; just retire the choreography per element.
      els.forEach((el) => (el.dataset.entered = "1"));
      return;
    }
    const pending = els.filter((el) => el.dataset.entered !== "1");
    gsap.set(pending, { opacity: 0, y: 24 });
    const io = new IntersectionObserver(
      (entries) => {
        let wave = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          if (el.dataset.entered === "1") continue; // arm() got here first
          el.dataset.entered = "1";
          gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: 0.85,
            ease: "expo.out",
            delay: Math.min(wave++, 4) * 0.07,
            // Resting rows carry NO inline transform/opacity: the lens rect
            // cache and the next Flip capture both read clean layout.
            onComplete: () => gsap.set(el, { clearProps: "transform,opacity" }),
          });
        }
      },
      // -18% bottom rootMargin ≈ the old "top 82%" start (see ui/reveal.tsx).
      { rootMargin: "0px 0px -18% 0px", threshold: 0 },
    );
    pending.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      gsap.killTweensOf(pending);
    };
    // Mount-only: every row stays mounted across filter/language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const arm = () => {
    const container = containerRef.current;
    if (!container || prefersReducedMotion()) return; // instant swap instead
    const els = items();
    // Interrupted-flight discipline: force any in-flight re-sort to its END
    // state (progress 1 restores layout and runs its clearProps sweep) —
    // killing alone would strand absolute-positioned movers or half-faded
    // leavers, and the state captured below must be a RESTING layout.
    Flip.killFlipsOf([container, ...els], true);
    // Entrance tweens (running or still inside their wave delay) animate the
    // same transforms Flip is about to own. From the first filter interaction
    // the re-sort owns every wrapper: settle them all to the resting visible
    // state and retire the IO entrance for good. (Un-entered wrappers are
    // below the fold by definition — revealing them early is invisible, and
    // a flight that pulls one into the viewport SHOULD show it mid-glide.)
    gsap.killTweensOf(els);
    els.forEach((el) => (el.dataset.entered = "1"));
    gsap.set(els, { clearProps: "transform,opacity,visibility" });
    pendingState.current = Flip.getState([container, ...els]);
  };

  useLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const container = containerRef.current;
    const state = pendingState.current;
    pendingState.current = null;
    const els = items();
    if (!container || !state) {
      // Instant path — reduced motion, or the ?filter= deep-link init right
      // after mount. The document height still changed, so downstream
      // ScrollTriggers must re-measure (the signature line re-glues itself
      // separately via the section bus's body ResizeObserver).
      ScrollTrigger.refresh();
      return;
    }
    const tl = Flip.from(state, {
      targets: [container, ...els],
      duration: 0.6,
      ease: "expo.inOut",
      stagger: 0.03,
      // Movers/leavers leave document flow during the flight so the column
      // can re-pack beneath them; the container is NOT absolutized — Flip
      // eases its width/height, which is what keeps the page height (and
      // the scrollbar) gliding instead of snapping.
      absolute: "[data-archive-item]",
      nested: false,
      onEnter: (entered) =>
        gsap.fromTo(
          entered,
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.4, ease: "expo.out" },
        ),
      onLeave: (left) =>
        gsap.to(left, {
          autoAlpha: 0,
          scale: 0.96,
          duration: 0.25,
          ease: "power2.in",
        }),
      onComplete: () => {
        // Never leave transforms resting on rows (lens rect caching, the
        // next getState) — and hand the height back to natural flow.
        gsap.set(els, { clearProps: "transform,opacity,visibility" });
        gsap.set(container, { clearProps: "width,height" });
        ScrollTrigger.refresh();
      },
    });
    return () => {
      // Re-arms mid-flight are already force-completed inside arm(); this
      // only fires on unmount — jump to the end state so nothing ever rests
      // absolute or half-hidden while React tears the list down.
      if (tl.isActive()) tl.progress(1).kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return arm;
}

export function ResourcesClient() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const { getItemHandlers, onListPointerLeave } = useResourcePreview();

  // Type filter — SSR always renders the full list ("all"); a ?filter= deep
  // link applies after hydration (instant path, under the initial reveal) so
  // server and client markup never diverge.
  const [category, setCategory] = useState<CategoryFilter>("all");
  const listRef = useRef<HTMLDivElement | null>(null);
  const armResort = useArchiveResort(listRef, category);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("filter");
    if (!param) return;
    const match = CATEGORIES.find((c) => c === param.toLowerCase());
    if (match) setCategory(match);
  }, []);

  const selectCategory = (next: CategoryFilter) => {
    if (next === category) return;
    armResort(); // capture the resting layout BEFORE React re-renders
    setCategory(next);
    // Deep-linkable choice: sync ?filter= via replaceState — no navigation,
    // no route transition, no scroll reset. Passing the existing
    // history.state keeps Next's App Router history entry intact.
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", next);
    window.history.replaceState(window.history.state, "", url.toString());
  };

  const visibleCount =
    category === "all"
      ? resources.length
      : resources.filter((r) => r.category === category).length;

  const categoryLabel: Record<string, string> = isEn
    ? {
        article: "Article",
        guide: "Guide",
        "case-study": "Case study",
        whitepaper: "Whitepaper",
      }
    : {
        article: "Articolo",
        guide: "Guida",
        "case-study": "Case study",
        whitepaper: "Whitepaper",
      };

  const dateLocale = isEn ? "en-GB" : "it-IT";

  return (
    <div className="min-h-screen text-foreground relative">
      {/* Hero */}
      <section data-line-anchor="hero" className="pt-24 pb-16 md:pb-24 relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[75vw] h-[36vw] max-w-[1000px] max-h-[560px] blur-3xl opacity-25"
            style={{ background: "radial-gradient(closest-side, hsl(var(--accent) / 0.22), transparent 70%)" }}
          />
        </div>
        <div className="container-px relative z-10">
          {/* H1 outside the Reveal: the choreographer's line-mask reveal owns
              it (data-split-reveal) — no double animation. Eyebrow entrance =
              LabelScrambler decode; the sub keeps the Reveal fade. */}
          <div className="max-w-3xl mx-auto text-center">
            <p className="eyebrow mb-6 inline-flex items-center justify-center gap-2">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--accent))" }}
                aria-hidden="true"
              />
              {isEn ? "Field notes" : "Appunti dal campo"}
            </p>
            {/* key={language}: SplitText owns this subtree once split; a language
                swap must remount it or React reconciles against orphaned nodes
                (same contract as SectionHeading's h2). */}
            <h1 key={language} data-split-reveal className="font-display text-[clamp(2.25rem,7vw,4.5rem)] leading-[1.15] tracking-[-0.025em] text-ink text-balance mb-8 pb-1">
              {isEn ? (
                <>
                  What we&apos;ve learned{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    shipping.
                  </span>
                </>
              ) : (
                <>
                  Cosa abbiamo imparato{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    portando in produzione.
                  </span>
                </>
              )}
            </h1>
            <Reveal delay={150}>
              <p className="text-lg md:text-xl text-ink-mute max-w-xl mx-auto leading-[1.5]">
                {isEn
                  ? "No frameworks-of-frameworks. Just what worked, what failed, and why."
                  : "Niente framework di framework. Solo cosa ha funzionato, cosa è andato male e perché."}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Articles list + type filter rail */}
      <section data-line-anchor="list" className="pb-24">
        <div className="container-px">
          <div className="max-w-4xl mx-auto">
            {/* Filter rail — mono pills (spec: All · Article · Guide · Case
                Study · Whitepaper, empty categories dropped) plus a live
                entry count. The count span REMOUNTS on every filter change
                (key), so the delegated LabelScrambler sees a fresh .eyebrow
                and decodes it once per change — one calm decode for the
                whole rail, never one per pill. It is aria-hidden (the decode
                mutates its text nodes); the sr-only status line is the
                assistive announcement, and each pill carries aria-pressed. */}
            <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div
                role="group"
                aria-label={
                  isEn ? "Filter writing by type" : "Filtra i contenuti per tipo"
                }
                className="flex flex-wrap items-center gap-2"
              >
                <FilterPill
                  active={category === "all"}
                  label={isEn ? "All" : "Tutte"}
                  onClick={() => selectCategory("all")}
                />
                {CATEGORIES.map((c) => (
                  <FilterPill
                    key={c}
                    active={category === c}
                    label={categoryLabel[c]}
                    onClick={() => selectCategory(c)}
                  />
                ))}
              </div>
              <span key={category} className="eyebrow ms-auto" aria-hidden="true">
                {visibleCount}{" "}
                {visibleCount === 1
                  ? isEn
                    ? "entry"
                    : "voce"
                  : isEn
                    ? "entries"
                    : "voci"}
              </span>
              <span className="sr-only" role="status">
                {isEn
                  ? `Showing ${visibleCount} of ${resources.length} posts`
                  : `${visibleCount} ${visibleCount === 1 ? "voce" : "voci"} su ${resources.length} visibili`}
              </span>
            </div>

            {/* relative: the FLIP re-sort absolutizes rows mid-flight — give
                them a positioning context that IS the list. flex+gap (not
                space-y margins) so display:none rows leave no phantom gap. */}
            <div
              ref={listRef}
              className="relative flex flex-col gap-5"
              onPointerLeave={onListPointerLeave}
            >
              {/* ResourceCard COMPOSES the preview-store handlers (WebGL hover
                  plane / DOM fallback card wiring) with the card-surface hover
                  lens + click radial wipe — it wraps getItemHandlers(i), never
                  replaces it. Filtered-out rows are `hidden`, never UNMOUNTED:
                  gsap Flip needs leaving elements alive to animate them off,
                  and every row keeps its SOURCE-array index `i` so the
                  preview store / plane seeds stay stable across re-sorts. */}
              {resources.map((r, i) => {
                const hidden = category !== "all" && r.category !== category;
                return (
                  <div
                    key={r.slug}
                    data-archive-item=""
                    className={cn(hidden && "hidden")}
                  >
                    <ResourceCard
                      r={r}
                      index={i}
                      isEn={isEn}
                      categoryLabel={categoryLabel}
                      dateLocale={dateLocale}
                      preview={getItemHandlers(i)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Ritual gap — transparent negative space so the persistent canvas
          (z-0) shows through; the route's 3D ritual object world-anchors
          here and the signature line threads it before the CTA. */}
      <div data-line-anchor="ritual" aria-hidden="true" className="py-28 sm:py-40" />

      {/* Closing CTA — a REAL section (BEAT 3) so the signature line gets a
          genuine terminus band instead of dying in the void. Copy + structure
          reuse the /case-studies closing CTA verbatim (frozen EN/IT strings);
          giving final-cta real height shifts its measured center fraction down
          the document, fixing the curve tail via the existing waypoint (no
          routeCurves edit). */}
      <section data-line-anchor="final-cta" className="section-lg relative">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] opacity-20 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,hsl(var(--accent))_0%,transparent_60%)] blur-[140px]" />
        </div>
        <div className="container-px relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            {/* SectionHeading owns the line-mask reveal AND carries
                key={language} on its internal h2 (data-heading-title) — adding
                data-split-reveal here would double-animate the title via
                HeadingChoreographer, so we reuse the /case-studies pattern as-is. */}
            <SectionHeading
              align="center"
              className="mx-auto mb-10 max-w-2xl"
              title={
                isEn ? (
                  <>
                    Want this kind of work in{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      your business?
                    </span>
                  </>
                ) : (
                  <>
                    Volete questo tipo di lavoro nella{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      vostra azienda?
                    </span>
                  </>
                )
              }
              description={
                isEn
                  ? "A free scoping call is the easiest way to find out where it would have the highest impact."
                  : "Una call di scoping gratuita è il modo più semplice per capire dove avrebbe l'impatto maggiore."
              }
            />
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="px-10 py-7 text-base font-semibold rounded-full">
                <Link href="/audit">
                  {isEn ? "Book a scoping call" : "Prenota una call di scoping"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* DOM/CSS fallback hover-preview card (BEAT 3). Renders only on the
          non-WebGPU paths (lite tier / flag-off desktop); suppressed on the
          desktop WebGPU full path where ResourcePreviewPlane is the preview,
          and on coarse/reduced-motion. */}
      <ResourcePreviewCard />

      {/* Card lens/wipe styles — see CARD_FX_CSS docs below. Static string,
          so SSR and client markup are identical. */}
      <style>{CARD_FX_CSS}</style>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Article card — hover lens + click radial wipe (template 4, demos 2 + 1)   */
/* ------------------------------------------------------------------------- */

/**
 * True only where the lens/wipe may run: a fine pointer with real hover and no
 * reduced-motion preference. The CSS media block hides the layers on the other
 * paths anyway — this JS gate just skips the per-event work (rect caching, CSS
 * var writes, wipe arming) on coarse / reduced-motion devices.
 */
function cardFxOn() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface ResourceCardProps {
  r: Resource;
  index: number;
  isEn: boolean;
  categoryLabel: Record<string, string>;
  dateLocale: string;
  /** resourcePreviewStore handlers from useResourcePreview — the WebGL hover
   *  preview plane (and its DOM fallback card) are driven by these. The lens
   *  and wipe live on the card surface itself and COMPOSE with this wiring;
   *  the DOM stays the complete experience when the plane doesn't mount. */
  preview: ResourceItemHandlers;
}

/**
 * One /resources article card.
 *
 * HOVER LENS (demo 2) — a circular influence follows the pointer, revealing an
 * aria-hidden "hot" duplicate of the card copy (accent-cyan tint + dot grid
 * lighting up) through a radial-gradient mask centered at --mx/--my.
 * pointermove writes the vars in card-local px against a rect cached at
 * pointerenter and re-read only when window.scrollY has changed since that
 * write (no rect reads in any frame loop, none at all on a stationary hover —
 * but a wheel under a held hover DOES move the card). Only the radius eases — via the
 * registered `--lens-r` @property transition (opens on enter, collapses on
 * leave).
 *
 * CLICK WIPE (demo 1) — on a plain left click, a clip-path circle() floods the
 * card from the click point with a corner-max-normalized radius, so coverage
 * always completes regardless of origin. Passive: NO preventDefault — the wipe
 * is a confirmation flourish and <Link> navigation proceeds natively (same
 * arming contract as use-flip-source). Fires ONLY where the DOM owns the
 * preview: on the desktop WebGPU full path the signal plane's uWipe flood is
 * the click confirmation and this layer stays quiet (one flourish per
 * gesture, one owner per tier).
 */
function ResourceCard({
  r,
  index,
  isEn,
  categoryLabel,
  dateLocale,
  preview,
}: ResourceCardProps) {
  const rectRef = useRef<DOMRect | null>(null);
  // window.scrollY as of the cached rect. The rect is viewport-relative, so
  // any scroll under a held hover invalidates it — without this the lens
  // detaches from the cursor by exactly the scrolled distance.
  const rectScrollYRef = useRef(0);
  const lastRef = useRef({ x: -1, y: -1 });
  const wipeRef = useRef<HTMLDivElement | null>(null);

  const writeLensVars = (el: HTMLElement, clientX: number, clientY: number) => {
    // Re-read ONLY when the page actually scrolled since the cached write —
    // a stationary hover still costs zero layout reads. Note we cannot use
    // offsetX/offsetY instead: the event target is a descendant of the card
    // (the copy, the dot grid), so those are relative to the wrong box.
    if (rectRef.current && window.scrollY !== rectScrollYRef.current) {
      rectRef.current = el.getBoundingClientRect();
      rectScrollYRef.current = window.scrollY;
    }
    const rect = rectRef.current;
    if (!rect) return;
    const x = Math.round(clientX - rect.left);
    const y = Math.round(clientY - rect.top);
    const last = lastRef.current;
    if (x === last.x && y === last.y) return; // identical-value skip
    last.x = x;
    last.y = y;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
  };

  const onPointerEnter = (e: React.PointerEvent<HTMLAnchorElement>) => {
    preview.onPointerEnter(e);
    if (e.pointerType === "touch" || !cardFxOn()) return;
    // ONE rect read per pointerenter — cached for every move/click after it,
    // and re-read by writeLensVars only when the page has scrolled since.
    rectRef.current = e.currentTarget.getBoundingClientRect();
    rectScrollYRef.current = window.scrollY;
    lastRef.current.x = -1;
    lastRef.current.y = -1;
    writeLensVars(e.currentTarget, e.clientX, e.clientY);
    // A fresh hover clears any flood left by a completed flourish (e.g.
    // back/forward restore) — reset without transitioning.
    const wipe = wipeRef.current;
    if (wipe) {
      wipe.style.transition = "none";
      wipe.style.opacity = "0";
      wipe.style.clipPath = "circle(0px at 50% 50%)";
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    preview.onPointerMove(e);
    writeLensVars(e.currentTarget, e.clientX, e.clientY);
  };

  const onPointerLeave = (e: React.PointerEvent<HTMLAnchorElement>) => {
    preview.onPointerLeave(e);
    rectRef.current = null; // lens collapse is pure CSS (:hover ends)
  };

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Same contract as use-flip-source: plain same-tab left clicks only;
    // modified clicks and keyboard activation navigate with no flourish.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    if (e.detail === 0) return; // keyboard "click"
    if (!cardFxOn()) return;
    // ONE confirmation per gesture, per tier: on the desktop WebGPU full path
    // the signal plane's domain-warped uWipe flood (already triggered by
    // preview.onPointerDown) owns the click — flooding this DOM layer on top
    // stacked two wipe metaphors on a single gesture. The gate mirrors
    // ResourcePreviewCard's planeOwnsPreview exactly, so whichever layer owns
    // the hover preview also owns the click confirmation; on lite / flag-off
    // paths (no plane) the DOM flood below stays the confirmation.
    if (useTierStore.getState().tier === "full" && webgpuEnabled()) return;
    const wipe = wipeRef.current;
    if (!wipe) return;
    // Same freshness rule as the lens: a cached rect from before a scroll
    // would put the flood origin off the click point.
    const rect =
      rectRef.current && window.scrollY === rectScrollYRef.current
        ? rectRef.current
        : e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Corner-max-normalized radius (template 4 demo 1): the largest distance
    // from the click point to any card corner — the flood always completes.
    const maxR = Math.ceil(
      Math.max(
        Math.hypot(x, y),
        Math.hypot(rect.width - x, y),
        Math.hypot(x, rect.height - y),
        Math.hypot(rect.width - x, rect.height - y),
      ),
    );
    wipe.style.setProperty("--wx", `${Math.round(x)}px`);
    wipe.style.setProperty("--wy", `${Math.round(y)}px`);
    wipe.style.transition = "none";
    wipe.style.opacity = "1";
    wipe.style.clipPath = `circle(0px at ${x}px ${y}px)`;
    // One-off style flush (a click handler, NOT a frame loop) so the
    // expansion transitions from radius 0 instead of jumping.
    void wipe.offsetWidth;
    wipe.style.transition = "clip-path 0.45s cubic-bezier(0.19, 1, 0.22, 1)";
    wipe.style.clipPath = `circle(${maxR}px at ${x}px ${y}px)`;
    // NO preventDefault — navigation proceeds natively.
  };

  return (
    <Link
      href={`/resources/${r.slug}`}
      data-resource-index={index}
      className="resource-card card-steel group block p-7"
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={preview.onPointerDown}
      onClick={onClick}
    >
      <CardBody
        r={r}
        isEn={isEn}
        categoryLabel={categoryLabel}
        dateLocale={dateLocale}
      />
      {/* Hot duplicate revealed through the lens mask. aria-hidden +
          pointer-events-none: purely decorative, same strings from the same
          data (copy byte-identical), identical layout classes so it overlays
          the base copy pixel-exact (p-7 mirrors the Link's padding). */}
      <div aria-hidden="true" className="resource-lens p-7">
        <CardBody
          r={r}
          isEn={isEn}
          categoryLabel={categoryLabel}
          dateLocale={dateLocale}
          hot
        />
      </div>
      {/* Click-wipe flood layer (clip-path circle written inline on click). */}
      <div ref={wipeRef} aria-hidden="true" className="resource-wipe" />
    </Link>
  );
}

/**
 * Card copy, rendered twice per card: once as the real (semantic) content and
 * once as the aria-hidden "hot" duplicate inside the lens mask. Layout classes
 * are IDENTICAL in both variants — `hot` only swaps colors (the inline style
 * wins over the utility color) so the duplicate sits pixel-exact over the
 * base. The hot arrow keeps the same group-hover translate so both copies
 * shift together while hovered.
 */
function CardBody({
  r,
  isEn,
  categoryLabel,
  dateLocale,
  hot = false,
}: {
  r: Resource;
  isEn: boolean;
  categoryLabel: Record<string, string>;
  dateLocale: string;
  hot?: boolean;
}) {
  // The real card keeps the semantic <h2>; the decorative duplicate must not
  // add a second heading to the outline, so it renders a <div> with the same
  // classes (preflight zeroes heading margins/font, so layout is identical).
  const Title = hot ? "div" : "h2";
  return (
    <>
      <div
        className="flex items-center gap-3 mb-3 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute"
        style={hot ? { color: "hsl(var(--accent) / 0.85)" } : undefined}
      >
        <span style={{ color: "hsl(var(--accent))" }}>{categoryLabel[r.category]}</span>
        <span aria-hidden="true">·</span>
        <span>
          {new Date(r.publishedAt).toLocaleDateString(dateLocale, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" /> {r.readMinutes} min
        </span>
      </div>
      <Title
        className="font-display text-2xl sm:text-[1.75rem] text-ink mb-3 leading-tight"
        style={hot ? { color: "hsl(var(--accent))" } : undefined}
      >
        {isEn ? r.title : r.titleIt}
      </Title>
      <p
        className="text-sm sm:text-base text-ink-mute leading-[1.55] mb-4"
        style={hot ? { color: "hsl(var(--ink))" } : undefined}
      >
        {isEn ? r.excerpt : r.excerptIt}
      </p>
      <div className="flex items-center justify-between">
        <p
          className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute"
          style={hot ? { color: "hsl(var(--accent) / 0.8)" } : undefined}
        >
          {r.authorName} &middot; {isEn ? r.authorRole : r.authorRoleIt}
        </p>
        <ArrowRight
          className="w-4 h-4 text-ink-mute group-hover:text-[hsl(var(--accent))] group-hover:translate-x-0.5 transition-all"
          style={hot ? { color: "hsl(var(--accent))" } : undefined}
        />
      </div>
    </>
  );
}

/**
 * Lens + wipe CSS — CSS-first per the R spec:
 *
 *   - LENS: a masked overlay (radial-gradient mask at --mx/--my in card-local
 *     px). The 55%→98% stop ramp is the smoothstep falloff of the influence
 *     circle; the radius eases through the registered `--lens-r` @property
 *     (discrete open/close where @property is unsupported — the mask still
 *     works). Pure gradients, no filter/blur.
 *   - WIPE: clip-path circle() transition, radius/origin written inline by
 *     the click handler.
 *
 * Both layers are display:none outside the fine-pointer + motion-OK media
 * block (and the lens additionally behind a mask-image @supports gate), so
 * coarse pointers and reduced-motion users keep today's fully static cards
 * while SSR markup stays identical everywhere. Accent is the signal cyan
 * (#3BE1FF via --accent) — no violet.
 */
const CARD_FX_CSS = `
@property --lens-r {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}
.resource-lens,
.resource-wipe {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  @supports ((mask-image: radial-gradient(#000, #0000)) or (-webkit-mask-image: radial-gradient(#000, #0000))) {
    .resource-lens { display: block; }
  }
  .resource-wipe { display: block; }
}
.resource-lens {
  --lens-r: 0px;
  transition: --lens-r 0.55s cubic-bezier(0.23, 1, 0.32, 1);
  -webkit-mask-image: radial-gradient(
    circle var(--lens-r) at var(--mx, 50%) var(--my, 50%),
    #000 55%,
    transparent 98%
  );
  mask-image: radial-gradient(
    circle var(--lens-r) at var(--mx, 50%) var(--my, 50%),
    #000 55%,
    transparent 98%
  );
}
.resource-card:hover .resource-lens {
  --lens-r: 260px;
}
.resource-lens::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(
      circle 260px at var(--mx, 50%) var(--my, 50%),
      hsl(var(--accent) / 0.14),
      transparent 72%
    ),
    radial-gradient(hsl(var(--accent) / 0.2) 1px, transparent 1.5px);
  background-size: auto, 18px 18px;
}
.resource-wipe {
  opacity: 0;
  clip-path: circle(0px at 50% 50%);
  background:
    radial-gradient(
      circle 340px at var(--wx, 50%) var(--wy, 50%),
      hsl(var(--accent) / 0.22),
      transparent 75%
    ),
    hsl(var(--accent) / 0.12);
  box-shadow:
    inset 0 0 0 1px hsl(var(--accent) / 0.6),
    inset 0 0 44px -14px hsl(var(--accent) / 0.45);
}
`;
