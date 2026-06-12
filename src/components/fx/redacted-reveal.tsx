"use client";

/**
 * RedactedReveal — per-word "de-classification" reveal.
 *
 * Every word in `text` is covered by a solid ink-toned bar (a redacted
 * document on the navy page), and the bars clear in a quick left-to-right
 * cascade the first time the element scrolls into view. Sober by design: no
 * glow, no glitch — the bars simply wipe off to the right, like a redaction
 * being lifted.
 *
 * Contract (mirrors LabelScrambler / CountUp):
 *   - The REAL text is in the DOM at all times — bars are absolutely
 *     positioned overlays on top of the words, never a text swap. SSR / no-JS
 *     / crawlers always see plain readable copy (bars ship at scaleX(0) and
 *     are only "armed" client-side, the same visible-first strategy as
 *     ui/reveal.tsx).
 *   - Screen readers get one sr-only span with the final string; the
 *     word-by-word markup (and its bars) is aria-hidden.
 *   - prefers-reduced-motion: the effect bails before covering anything —
 *     plain static text, no bars ever.
 *   - Language toggle safety: the effect re-arms on `text` change. React
 *     re-renders fresh word spans for the new string, we re-cover and the IO
 *     replays once — same re-arm semantics as the site's other text engines.
 *   - Plays ONCE per arming (IO disconnects after firing).
 */

import { useEffect, useRef, Fragment } from "react";
import gsap from "gsap";

interface RedactedRevealProps {
  /** The line to redact/reveal. Rendered verbatim — never mutated. */
  text: string;
  /** Delay (ms) before the wipe starts — lets callers stagger sibling rows. */
  delay?: number;
  className?: string;
}

export function RedactedReveal({ text, delay = 0, className }: RedactedRevealProps) {
  const rootRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const bars = Array.from(
      root.querySelectorAll<HTMLElement>("[data-redact-bar]"),
    );
    if (bars.length === 0) return;

    // Cover the words (client-only — the SSR markup is uncovered, so the
    // copy is never hidden from no-JS readers or crawlers). Wiping toward
    // the right edge means each word un-redacts left-to-right.
    gsap.set(bars, { scaleX: 1, transformOrigin: "right center" });

    let played = false;
    let tween: gsap.core.Tween | null = null;
    const play = () => {
      if (played) return;
      played = true;
      tween = gsap.to(bars, {
        scaleX: 0,
        duration: 0.45,
        ease: "power3.inOut",
        stagger: 0.055,
        delay: delay / 1000,
      });
    };

    // IO (not ScrollTrigger): fires immediately when the element mounts
    // already in view — SPA navigations included. Same rationale as
    // ui/reveal.tsx; -15% bottom margin ≈ reveal once the row is properly
    // inside the viewport, not at the very first pixel.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            play();
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0 },
    );
    io.observe(root);

    return () => {
      io.disconnect();
      tween?.kill();
      // Re-arm / unmount mid-flight: leave the text readable, never covered.
      gsap.set(bars, { scaleX: 0 });
    };
  }, [text, delay]);

  // Split on whitespace runs, keeping the separators as plain text nodes so
  // line wrapping and word gaps are untouched. Word spans stay INLINE
  // (position:relative only): the absolute bar then tracks the word's font
  // box (ascent→descent), which is exactly the band a redaction marker
  // should cover. Negative insets give slight overshoot headroom so
  // ascenders/descenders never peek past the bar.
  const parts = text.split(/(\s+)/);

  return (
    <span ref={rootRef} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {parts.map((part, i) =>
          part === "" ? null : /^\s+$/.test(part) ? (
            <Fragment key={i}>{part}</Fragment>
          ) : (
            <span key={i} className="relative">
              {part}
              <span
                data-redact-bar
                className="pointer-events-none absolute rounded-[1px]"
                style={{
                  insetInline: "-0.12em",
                  insetBlock: "-0.08em",
                  background: "hsl(var(--ink) / 0.92)",
                  transform: "scaleX(0)",
                }}
              />
            </span>
          ),
        )}
      </span>
    </span>
  );
}
