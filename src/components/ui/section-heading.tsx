"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

/**
 * Reveal vocabulary for the heading TITLE. See `reveal` prop below. The default
 * 'lines' is byte-identical to the historical yPercent line-mask rise.
 */
export type HeadingReveal = "lines" | "chars" | "words" | "skew" | "blur";

/**
 * 'chars' splits every glyph — heavy on long copy — so it is perf-scoped to
 * short titles. Anything longer than this (measured on textContent) silently
 * degrades to the 'lines' rise.
 */
const CHARS_MAX_LEN = 40;

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  titleClassName?: string;
  /**
   * Optional slot rendered below the description (e.g. a CTA link/button).
   * Reveals last in the heading cascade. Back-compatible: omitting it renders
   * exactly as before. (P2 — shared by P3/P5, so this MUST stay optional.)
   */
  cta?: React.ReactNode;
  /**
   * Reveal treatment for the TITLE only (eyebrow/description/cta are untouched).
   * DEFAULT 'lines' = the exact yPercent line-mask rise shipped everywhere today.
   *   - 'chars' / 'words': SplitText type 'chars'/'words' + matching mask and a
   *     tighter stagger ('chars' auto-degrades to 'lines' on long titles).
   *   - 'skew': the line-mask rise PLUS a rotationX/skewY 3D tilt-in.
   *   - 'blur': a pure CSS `filter: blur()` focus-in (+opacity/scale), no WebGL.
   * All variants keep the same contract: fonts-gated, IO fire-once, split
   * reverted on complete/cleanup, reduced-motion => instantly final.
   */
  reveal?: HeadingReveal;
  /**
   * IO rootMargin for the play trigger. Default reproduces the historical
   * "top 85%" start. A POSITIVE bottom margin expands the root so the cascade
   * pre-composes before the heading is on screen — used by ProblemSection so
   * the credibility reel's sticky release never lands on an empty dark slab.
   * Back-compatible: omitting it renders exactly as before.
   */
  ioRootMargin?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  titleClassName,
  cta,
  reveal = "lines",
  ioRootMargin = "0px 0px -15% 0px",
}: SectionHeadingProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { language } = useLanguage();

  // Re-run on every language change. The EN↔IT toggle swaps the title text in
  // place, so a once-only effect would leave SplitText line-divs wrapping the
  // OLD language's lines while React tries to update detached children — the
  // title would stay stuck. Mirrors HeadingChoreographer: re-split per language
  // and revert the previous split in cleanup BEFORE the new render. The <h2>
  // also carries key={language} (see JSX) so React mounts a fresh, React-owned
  // title subtree each toggle, discarding any SplitText-orphaned nodes.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let cancelled = false;
    let split: SplitText | null = null;
    let tl: gsap.core.Timeline | null = null;
    let io: IntersectionObserver | null = null;

    // Wait for the webfonts: SplitText measures line boxes, and the display
    // serif swapping in after the split would re-wrap lines under the masks.
    document.fonts?.ready.then(() => {
      if (cancelled || !ref.current) return;

      const line = el.querySelector<HTMLElement>("[data-eyebrow-line]");
      const eyebrowText = el.querySelector<HTMLElement>("[data-eyebrow-text]");
      const titleEl = el.querySelector<HTMLElement>("[data-heading-title]");
      const descEl = el.querySelector<HTMLElement>("[data-heading-desc]");
      const ctaEl = el.querySelector<HTMLElement>("[data-heading-cta]");

      // Initial state
      if (line) gsap.set(line, { scaleX: 0, transformOrigin: "left center" });
      if (eyebrowText) gsap.set(eyebrowText, { opacity: 0, y: 6 });
      if (descEl) gsap.set(descEl, { opacity: 0, y: 12 });
      if (ctaEl) gsap.set(ctaEl, { opacity: 0, y: 10 });

      // Paused timeline, PLAYED by an IntersectionObserver (created below) —
      // NOT a ScrollTrigger. A once:true ScrollTrigger created already-in-view
      // (which is the case on every client-side navigation, where the heading
      // mounts at the top in view) never fires its onEnter — GSAP only fires on
      // an active-state CHANGE, and ScrollTrigger.refresh() re-measures without
      // firing it — so the whole heading stayed at opacity:0 until a hard
      // refresh. IO fires on observe while already intersecting, fixing SPA nav.
      tl = gsap.timeline({ paused: true });

      // Cascade: eyebrow → title → description → cta, each lagging the
      // previous by ~100-150ms so the heading reads as one staggered beat
      // (the negative overlaps keep the lag tight while still distinct).
      if (line) {
        tl.to(line, { scaleX: 1, duration: 0.6, ease: "expo.out" });
      }
      if (eyebrowText) {
        tl.to(
          eyebrowText,
          { opacity: 1, y: 0, duration: 0.45, ease: "expo.out" },
          ">-0.35",
        );
      }
      if (titleEl) {
        // Editorial reveal: the split is held in `split` and reverted in
        // cleanup (and once the intro completes) so the DOM always ends on the
        // plain, React-owned title text — the EN/IT swap then reconciles
        // cleanly. `revertOnDone` is the shared onComplete for every variant.
        const revertOnDone = () => {
          split?.revert();
          split = null;
        };

        // 'chars' is perf-scoped to short titles; longer copy falls back to the
        // line rise so we never split hundreds of glyphs.
        const titleLen = titleEl.textContent?.length ?? 0;
        const mode: HeadingReveal =
          reveal === "chars" && titleLen > CHARS_MAX_LEN ? "lines" : reveal;

        if (mode === "chars" || mode === "words") {
          // Finer split with a matching mask + a tighter stagger. Each glyph/
          // word rises out of its own clip.
          split = new SplitText(titleEl, { type: mode, mask: mode });
          const parts = mode === "chars" ? split.chars : split.words;
          tl.from(
            parts,
            {
              yPercent: 115,
              duration: mode === "chars" ? 0.7 : 0.8,
              stagger: mode === "chars" ? 0.02 : 0.05,
              ease: "expo.out",
              onComplete: revertOnDone,
            },
            ">-0.25",
          );
        } else if (mode === "skew") {
          // The line-mask rise PLUS a 3D tilt-in: each line eases its rotationX
          // and skewY to 0 as it rises out of the clip.
          split = new SplitText(titleEl, { type: "lines", mask: "lines" });
          tl.from(
            split.lines,
            {
              yPercent: 115,
              rotationX: -38,
              skewY: 4,
              transformOrigin: "left top",
              transformPerspective: 700,
              duration: 0.95,
              stagger: 0.09,
              ease: "expo.out",
              onComplete: revertOnDone,
            },
            ">-0.25",
          );
        } else if (mode === "blur") {
          // Kawase-inspired focus-in: a pure CSS filter blur + opacity + a hair
          // of scale, GPU-composited (NO WebGL). No line mask — the blur must
          // bleed past the line box, so lines are split without a clip.
          split = new SplitText(titleEl, { type: "lines", linesClass: "split-line" });
          tl.fromTo(
            split.lines,
            { autoAlpha: 0, filter: "blur(12px)", scale: 1.03 },
            {
              autoAlpha: 1,
              filter: "blur(0px)",
              scale: 1,
              transformOrigin: "left center",
              duration: 0.9,
              stagger: 0.12,
              ease: "expo.out",
              onComplete: revertOnDone,
            },
            ">-0.25",
          );
        } else {
          // Default 'lines': byte-identical to the historical reveal — each line
          // of the title rises out of its own clip.
          split = new SplitText(titleEl, { type: "lines", mask: "lines" });
          tl.from(
            split.lines,
            {
              yPercent: 115,
              duration: 0.85,
              stagger: 0.09,
              ease: "expo.out",
              onComplete: revertOnDone,
            },
            ">-0.25",
          );
        }
      }
      if (descEl) {
        tl.to(
          descEl,
          { opacity: 1, y: 0, duration: 0.55, ease: "expo.out" },
          ">-0.4",
        );
      }
      if (ctaEl) {
        tl.to(
          ctaEl,
          { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" },
          ">-0.4",
        );
      }

      // Play the cascade the moment the heading is in view. The -15% bottom
      // rootMargin reproduces the old "top 85%" start point; an in-view heading
      // (SPA nav) fires immediately, a below-the-fold one waits for scroll.
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            tl?.play();
            io?.disconnect();
            io = null;
          }
        },
        { rootMargin: ioRootMargin, threshold: 0 },
      );
      io.observe(el);
    });

    // On language change / unmount: stop a late fonts.ready from building anew,
    // revert any live split so no orphaned mask/.split-line divs survive into
    // the next-language render, and kill this timeline's ScrollTrigger so the
    // re-created `once:true` reveal doesn't accumulate duplicate triggers.
    return () => {
      cancelled = true;
      io?.disconnect();
      io = null;
      split?.revert();
      split = null;
      tl?.kill();
    };
  }, [language, reveal, ioRootMargin]);

  return (
    <div
      ref={ref}
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="eyebrow mb-5 inline-flex items-center gap-2 text-ink-mute">
          <span
            data-eyebrow-line
            aria-hidden="true"
            className="inline-block w-6 h-px bg-[hsl(var(--accent))]"
          />
          <span data-eyebrow-text>{eyebrow}</span>
        </p>
      ) : null}

      <h2
        key={language}
        data-heading-title
        className={cn("heading-2 text-ink mb-5 text-balance", titleClassName)}
      >
        {title}
      </h2>

      {description ? (
        <p
          data-heading-desc
          className="text-base sm:text-lg text-ink-mute leading-relaxed max-w-2xl"
        >
          {description}
        </p>
      ) : null}

      {cta ? (
        <div data-heading-cta className="mt-6">
          {cta}
        </div>
      ) : null}
    </div>
  );
}
