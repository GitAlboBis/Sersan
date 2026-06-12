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
  /**
   * Bypass the metric-token heuristic for values the CALLER knows are real
   * metrics (e.g. the /about proof strip's bare "8" / "5" / "1", which carry
   * their unit in a sibling span). The number must still lead the string —
   * the prefix rule is never bypassed, so label-led values stay static.
   * Deliberately a per-call-site opt-in instead of loosening METRIC_TOKEN_RE:
   * the global regex keeps protecting every other surface from animating
   * non-metrics like "32" or ordinals.
   */
  force?: boolean;
}

export function CountUp({ value, duration = 1.2, className, force = false }: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  // The animated text is written directly to this node's textContent during
  // the tween — never through React state — so the count-up runs at 60fps
  // without firing a re-render per frame (a metric grid would otherwise churn
  // hundreds of renders/sec).
  const outRef = useRef<HTMLSpanElement | null>(null);
  // One-shot guard. The immediate-fire path below (for triggers born already
  // in view) means fire() can be reached again if the effect ever re-runs
  // while the element is still in view — without this ref every such re-run
  // would replay the count. Reset ONLY when the value prop genuinely changes;
  // metric values are language-invariant, so EN/IT toggles never replay.
  const firedRef = useRef(false);
  const lastValueRef = useRef(value);
  if (lastValueRef.current !== value) {
    lastValueRef.current = value;
    firedRef.current = false;
  }
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
    && (force || METRIC_TOKEN_RE.test(value))
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
    let tween: gsap.core.Tween | null = null;

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      // Snap to 0 then tween up to the target, writing each frame straight
      // to the DOM node — no setState, so zero re-renders during the count.
      obj.n = 0;
      out.textContent = formatPart(parsed, 0);
      tween = gsap.to(obj, {
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
    };

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: fire,
    });
    // A once:true trigger created when the element is ALREADY past its start
    // (e.g. metrics near the top of a detail page, or SPA-nav landing mid-page)
    // is born active and never fires onEnter — fire immediately in that case.
    // Same convention as heading-choreographer.tsx.
    if (st.isActive || st.progress > 0) fire();

    return () => {
      st.kill();
      // Kill a mid-count tween too — the ScrollTrigger kill alone leaves the
      // tween running and writing into a detached node after unmount.
      tween?.kill();
    };
    // `parsed` is deliberately NOT a dependency: it's derived purely from
    // `value` but is a fresh object every render, so including it would
    // re-run this effect (killing a mid-count tween) on every parent render.
  }, [value, duration, shouldAnimate]);

  // AT users always get the static final value (sr-only), never the
  // intermediate animation frames — the animated span is aria-hidden.
  // (aria-label on a generic <span> is prohibited per ARIA; this sr-only
  // pattern carries the same intent and passes axe.)
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{value}</span>
      {/* tabular-nums: fixed-width digits stop the string jittering
          horizontally while the number rolls (final state keeps the same
          figures, so there's no settle-shift when the tween completes). */}
      <span ref={outRef} aria-hidden="true" className="tabular-nums">
        {value}
      </span>
    </span>
  );
}

function formatPart(p: ParsedValue, current: number): string {
  const sign = p.isNeg ? "−" : "";
  const fixed = current.toFixed(p.decimals);
  return `${p.before}${sign}${fixed}${p.after}`;
}
