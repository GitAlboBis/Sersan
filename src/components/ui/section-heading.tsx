"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  titleClassName?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  titleClassName,
}: SectionHeadingProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || playedRef.current) return;
    playedRef.current = true;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const line = el.querySelector<HTMLElement>("[data-eyebrow-line]");
    const eyebrowText = el.querySelector<HTMLElement>("[data-eyebrow-text]");
    const titleEl = el.querySelector<HTMLElement>("[data-heading-title]");
    const descEl = el.querySelector<HTMLElement>("[data-heading-desc]");

    // Initial state
    if (line) gsap.set(line, { scaleX: 0, transformOrigin: "left center" });
    if (eyebrowText) gsap.set(eyebrowText, { opacity: 0, y: 6 });
    if (titleEl) gsap.set(titleEl, { opacity: 0, y: 18 });
    if (descEl) gsap.set(descEl, { opacity: 0, y: 12 });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });

    if (line) {
      tl.to(line, { scaleX: 1, duration: 0.6, ease: "expo.out" });
    }
    if (eyebrowText) {
      tl.to(
        eyebrowText,
        { opacity: 1, y: 0, duration: 0.45, ease: "expo.out" },
        ">-0.4",
      );
    }
    if (titleEl) {
      tl.to(
        titleEl,
        { opacity: 1, y: 0, duration: 0.7, ease: "expo.out" },
        ">-0.3",
      );
    }
    if (descEl) {
      tl.to(
        descEl,
        { opacity: 1, y: 0, duration: 0.55, ease: "expo.out" },
        ">-0.45",
      );
    }

    // Don't kill on unmount — let scroll-triggered animations finish playing.
  }, []);

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
    </div>
  );
}
