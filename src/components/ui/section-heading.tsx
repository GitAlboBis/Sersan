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
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  titleClassName,
  cta,
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

      tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });

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
        // Editorial line-mask reveal: each line of the title rises out of its
        // own clip. The split is held in `split` and reverted in cleanup
        // (and once the intro completes) so the DOM always ends on the plain,
        // React-owned title text — the EN/IT swap then reconciles cleanly.
        split = new SplitText(titleEl, { type: "lines", mask: "lines" });
        tl.from(
          split.lines,
          {
            yPercent: 115,
            duration: 0.85,
            stagger: 0.09,
            ease: "expo.out",
            onComplete: () => {
              split?.revert();
              split = null;
            },
          },
          ">-0.25",
        );
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
    });

    // On language change / unmount: stop a late fonts.ready from building anew,
    // revert any live split so no orphaned mask/.split-line divs survive into
    // the next-language render, and kill this timeline's ScrollTrigger so the
    // re-created `once:true` reveal doesn't accumulate duplicate triggers.
    return () => {
      cancelled = true;
      split?.revert();
      split = null;
      tl?.scrollTrigger?.kill();
      tl?.kill();
    };
  }, [language]);

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
