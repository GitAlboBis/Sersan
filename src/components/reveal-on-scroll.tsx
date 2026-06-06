"use client";

import { createElement, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface RevealOnScrollProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  as?: "div" | "section" | "article";
  className?: string;
}

// Canonical entrance curve — mirrors --ease-entrance in globals.css and GSAP's
// expo.out, so framer reveals share the same feel as CSS + GSAP reveals.
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Small client utility that fades + slides children up when ~30% of the
 * element is in the viewport. Honors `prefers-reduced-motion` by rendering
 * the static element with no animation.
 */
export function RevealOnScroll({
  children,
  delay = 0,
  y = 24,
  duration = 0.6,
  as = "div",
  className,
}: RevealOnScrollProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return createElement(as, { className }, children);
  }

  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}

export default RevealOnScroll;
