"use client";

/**
 * HeadingChoreographer — editorial line-mask reveals (award sprint, Phase B).
 *
 * Every element marked `data-split-reveal` gets a GSAP SplitText line
 * reveal: lines rise out of a mask, staggered, on scroll-enter. Splits are
 * rebuilt whenever the language or route changes (the EN/IT swap replaces
 * text in place — re-splitting by construction kills the recon's stale-
 * splits risk). Reduced-motion: no split, headings just exist.
 *
 * SplitText is free since GSAP joined Webflow; `mask: "lines"` wraps each
 * line in an overflow clip so no CSS is needed.
 */
import { useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { useLanguage } from "@/components/language-provider";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export function HeadingChoreographer() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const scopeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const targets = Array.from(
        document.querySelectorAll<HTMLElement>("[data-split-reveal]"),
      );
      if (targets.length === 0) return;

      const splits: SplitText[] = [];
      // Fonts must be settled or line boxes split wrong mid-swap.
      document.fonts?.ready.then(() => {
        targets.forEach((el) => {
          const split = new SplitText(el, {
            type: "lines",
            mask: "lines",
            linesClass: "split-line",
          });
          splits.push(split);
          gsap.from(split.lines, {
            yPercent: 115,
            duration: 0.85,
            stagger: 0.09,
            ease: "expo.out",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              once: true,
            },
          });
        });
      });

      return () => {
        splits.forEach((s) => s.revert());
      };
    },
    { scope: scopeRef, dependencies: [language, pathname] },
  );

  return <div ref={scopeRef} className="hidden" aria-hidden />;
}
