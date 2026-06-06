"use client";

/**
 * CountUp — animates a numeric metric value when it enters view.
 *
 * Only animates values that clearly look like metrics. Skips year-shaped
 * values, labels with descriptive prefixes (e.g. "Exit · Oct 2024"), and
 * anything where the count-up would read as glitchy rather than insightful.
 *
 * A value qualifies if it contains a sign, ratio, or unit token:
 *   %, ×, x, M, k, AUC, ms, /day, /year, $, €, £, ~, p99, p95
 * Anything else renders statically.
 */

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const NUMBER_RE = /([-−+]?\d+(?:\.\d+)?)/;

// Tokens that mark a value as "actually a metric" worth counting up.
// Without one of these, the value is rendered as-is.
const METRIC_TOKEN_RE =
  /(%|×|x\b|M\b|k\b|MWp|AUC|ms\b|\bp\d{2}|\/day|\/year|\$|€|£|~|→|hour|months|weeks|F1)/i;

// The matched number must be at the start of the string OR preceded only
// by currency / sign / approximation prefixes. This blocks values where
// the first digit is part of a label, not a metric:
//   "Dec 2024 → Apr 2025"  → digit is after "Dec ", static
//   "F1 = 0.91"            → digit is after "F",    static
//   "p99 220ms → 38ms"     → digit is after "p",    static
//   "~$140M/day"           → digit is after "~$",   animates
//   "+34%"                 → digit at start,        animates
const ANIMATABLE_PREFIX_RE = /^[~$€£+\-−\s]*$/;

interface ParsedValue {
  before: string;
  num: number;
  after: string;
  isNeg: boolean;
  decimals: number;
}

function parseMetric(value: string): ParsedValue | null {
  const match = value.match(NUMBER_RE);
  if (!match) return null;
  const raw = match[1];
  const idx = match.index ?? 0;
  const before = value.slice(0, idx);
  const after = value.slice(idx + raw.length);
  const cleaned = raw.replace(/[−]/g, "-");
  const num = Math.abs(parseFloat(cleaned));
  const decimals = cleaned.includes(".")
    ? (cleaned.split(".")[1]?.length ?? 0)
    : 0;
  return {
    before,
    num,
    after,
    isNeg: cleaned.startsWith("-"),
    decimals,
  };
}

interface CountUpProps {
  value: string;
  duration?: number;
  className?: string;
}

export function CountUp({ value, duration = 1.2, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  // The animated text is written directly to this node's textContent during
  // the tween — never through React state — so the count-up runs at 60fps
  // without firing a re-render per frame (a metric grid would otherwise churn
  // hundreds of renders/sec).
  const outRef = useRef<HTMLSpanElement | null>(null);
  const parsed = parseMetric(value);
  // Three conditions to animate:
  //   1. The string contains a parseable number.
  //   2. The string contains at least one recognised metric token (% / M /
  //      ms / $ / etc) so we don't accidentally animate things like "32".
  //   3. The number sits at the start of the string (after any allowed
  //      currency / sign prefix) — not buried inside a label like "Dec 2024"
  //      or "F1" or "p99".
  const shouldAnimate =
    !!parsed
    && METRIC_TOKEN_RE.test(value)
    && ANIMATABLE_PREFIX_RE.test(parsed.before);

  // CRITICAL: the visible / SSR / screen-reader / crawler fallback must
  // always be the FINAL value. The static render below outputs `value`, so
  // "+0%" / "0.00 AUC" never sits in the DOM as a fallback if JS is disabled
  // or the ScrollTrigger never fires (e.g. value already in viewport on load).
  // The animation mutates textContent directly (not React state), driving the
  // value down to 0 then up to target on scroll-into-view.

  useEffect(() => {
    if (!shouldAnimate || !parsed) return;
    const el = ref.current;
    const out = outRef.current;
    if (!el || !out) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced-motion: leave the final value rendered, never animate.
    if (prefersReduced) return;

    const obj = { n: parsed.num };
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        // Snap to 0 then tween up to the target, writing each frame straight
        // to the DOM node — no setState, so zero re-renders during the count.
        obj.n = 0;
        out.textContent = formatPart(parsed, 0);
        gsap.to(obj, {
          n: parsed.num,
          duration,
          ease: "expo.out",
          onUpdate: () => {
            out.textContent = formatPart(parsed, obj.n);
          },
          onComplete: () => {
            out.textContent = value;
          },
        });
      },
    });
    return () => st.kill();
  }, [value, duration, parsed, shouldAnimate]);

  // The aria-label always carries the final value so AT users hear the
  // real metric, never the intermediate animation frames. The animation
  // is purely decorative for sighted users.
  return (
    <span ref={ref} className={className} aria-label={value}>
      <span ref={outRef} aria-hidden="true">{value}</span>
    </span>
  );
}

function formatPart(p: ParsedValue, current: number): string {
  const sign = p.isNeg ? "−" : "";
  const fixed = current.toFixed(p.decimals);
  return `${p.before}${sign}${fixed}${p.after}`;
}
