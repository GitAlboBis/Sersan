"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  variant?: "fade" | "construct" | "rise";
  className?: string;
  as?: "div" | "section" | "article" | "li" | "span";
}

export function Reveal({
  children,
  delay = 0,
  variant = "fade",
  className = "",
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || playedRef.current) return;
    playedRef.current = true;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      gsap.set(el, { opacity: 1, y: 0, clipPath: "inset(0%)" });
      return;
    }

    const initial: gsap.TweenVars = {
      opacity: 0,
      y: variant === "rise" ? 40 : 24,
    };
    if (variant === "construct") {
      initial.clipPath = "inset(0% 100% 0% 0%)";
    }
    gsap.set(el, initial);

    const st = ScrollTrigger.create({
      trigger: el,
      // Fire a touch earlier so the reveal has room to breathe before the
      // element is fully on screen (was "top 88%" — too late, near exit).
      start: "top 82%",
      once: true,
      onEnter: () => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          clipPath: "inset(0%)",
          duration: 0.85,
          ease: "expo.out",
          delay: delay / 1000,
        });
      },
    });

    return () => st.kill();
  }, [delay, variant]);

  return (
    // @ts-expect-error — Tag is a union of HTML tag names
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
