"use client";

/**
 * NeuralGraphFallback — the DOM/SVG fallback for the FIX 3 neural network.
 *
 * v6 RECONCEPTION: this now mirrors the SHIPPED WebGL look — a 3-HUB TRIANGLE
 * (one orb per card, matching the centerpiece node markers) wired by 3 bowed
 * Bézier arcs (0→1, 1→2 chain + the 0→2 span), with a travelling signal packet
 * riding each arc. It replaces the old 3×3 input/hidden/output feed-forward grid,
 * which no longer matched the network beside it.
 *
 * This renders when the WebGL NeuralLattice island is ABSENT: classic flag-OFF
 * WebGLRenderer, lite/off tiers, no-WebGPU, and prefers-reduced-motion. It is the
 * flat, dependency-light cousin of the WebGL centerpiece.
 *
 *   variant "broken"  → the Problem section. The 0→2 SPAN arc fractures: its
 *     packet dies at BREAK_T and scatters into fading dots (into the void), the
 *     arc reads severed (dashed + dim), and that span's far hub (hub2) goes dark.
 *     The other two arcs (0→1, 1→2) stay coherent and flow.
 *   variant "healthy" → the ProductionGrade section. All 3 arcs intact, all hubs
 *     glow, all 3 packets complete their arc.
 *
 * Geometry is in lockstep with the centerpiece: HUB_PCT mirrors MARKER_LAYOUT in
 * neural-centerpiece.tsx (itself derived from HUB_DEFAULT_XY), and the per-hub
 * cyan→violet tone reproduces the WebGL depthT(hubZ) ramp.
 *
 * Reduced-motion: render the resting frame — no packets, no timeline; the broken
 * scatter is shown statically so the fracture still reads from styling alone.
 *
 * Decorative only: aria-hidden. The real copy lives as accessible DOM in the two
 * sections. No new dependency (GSAP + MotionPathPlugin are already bundled).
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(MotionPathPlugin);
}

type Variant = "broken" | "healthy";

// --- Geometry (viewBox space) ------------------------------------------------
const VB_W = 460;
const VB_H = 300;

/**
 * CSS-% of the centerpiece marker layout. MUST mirror MARKER_LAYOUT in
 * neural-centerpiece.tsx (itself derived from HUB_DEFAULT_XY: x% = 50 + localX·100,
 * y% = 50 − localY·100). Same percents → the SVG hub sits exactly where the DOM
 * marker / WebGL orb render. If you change MARKER_LAYOUT, update these.
 *   node0 upper-left (z=-0.18 → depthT 0.0 → cyan)
 *   node1 lower-center (z=+0.12 → depthT 1.0 → blue)
 *   node2 upper-right (z=-0.06 → depthT 0.4 → cyan→blue mid)
 */
const HUB_PCT: readonly [number, number][] = [
  [24, 32],
  [50, 70],
  [78, 34],
];
const HUBS = HUB_PCT.map(([px, py]) => ({
  cx: Math.round((px / 100) * VB_W),
  cy: Math.round((py / 100) * VB_H),
}));
const HUB_R = 9;

/** Per-hub fill = cyan→blue sampled at each hub's WebGL depthT (t = [0, 1, 0.4]). */
const HUB_FILL = [
  "hsl(var(--accent))", // t0  cyan
  "hsl(var(--accent-2))", // t1  blue (var kept; --accent-2 now holds blue)
  "hsl(204 95% 67%)", // t0.4 cyan→blue mid (hue moved 222→204; S/L tuning kept)
] as const;

/** The 3 arcs (mirror HUB_ARCS): chain 0→1, 1→2 + the span 0→2 (the fragile one). */
const ARCS: readonly [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 2],
];
/** Mirror config BREAK_T — the dead span packet dies at this arc fraction. */
const BREAK_T = 0.46;
/** Bow (px) of each arc's quadratic control off the chord — the 2D projection of
 * the WebGL NEURAL_ARC_BOW (≈0.22 toward +z) on this 460-wide box. */
const BOW = 50;

interface Pt {
  x: number;
  y: number;
}
type Hub = { cx: number; cy: number };

/** Quadratic control = chord midpoint pushed along the perpendicular so the arc
 * bows UPWARD (negative y) — reads as an open 3D curve like the WebGL bow. */
function controlOf(a: Hub, b: Hub): Pt {
  const mx = (a.cx + b.cx) / 2;
  const my = (a.cy + b.cy) / 2;
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const len = Math.hypot(dx, dy) || 1;
  let px = -dy / len;
  let py = dx / len;
  if (py > 0) {
    px = -px;
    py = -py;
  }
  return { x: mx + px * BOW, y: my + py * BOW };
}
function arcPath(a: Hub, b: Hub, c: Pt): string {
  return `M ${a.cx} ${a.cy} Q ${Math.round(c.x)} ${Math.round(c.y)} ${b.cx} ${b.cy}`;
}
/** Quadratic Bézier point at t — locates where the dead span packet dies. */
function quadAt(a: Hub, c: Pt, b: Hub, t: number): Pt {
  const omt = 1 - t;
  return {
    x: omt * omt * a.cx + 2 * omt * t * c.x + t * t * b.cx,
    y: omt * omt * a.cy + 2 * omt * t * c.y + t * t * b.cy,
  };
}

const ARC_CTRL = ARCS.map(([f, t]) => controlOf(HUBS[f], HUBS[t]));
const ARC_D = ARCS.map(([f, t], i) => arcPath(HUBS[f], HUBS[t], ARC_CTRL[i]));

// Where the dead span (arc index 2 = [0,2]) packet dies, at BREAK_T, + a fan of
// scatter targets dispersing outward/upward from that break point.
const SPAN_BREAK = quadAt(HUBS[0], ARC_CTRL[2], HUBS[2], BREAK_T);
const SPAN_BX = Math.round(SPAN_BREAK.x);
const SPAN_BY = Math.round(SPAN_BREAK.y);
const SCATTER = [0, 1, 2, 3, 4].map((k) => {
  const ang = ((-60 + k * 30) * Math.PI) / 180; // fan upward/outward
  return {
    tx: Math.round(SPAN_BX + Math.cos(ang) * 26),
    ty: Math.round(SPAN_BY + Math.sin(ang) * 26),
  };
});

export function NeuralGraphFallback({
  variant,
  className,
}: {
  variant: Variant;
  className?: string;
}) {
  const broken = variant === "broken";
  const rootRef = useRef<SVGSVGElement>(null);
  const gradId = `neural-grad-${variant}`;
  // Reduced-motion: show the resting frame (broken → static dispersed scatter).
  const [rest, setRest] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    setRest(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useGSAP(
    () => {
      if (typeof window === "undefined") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const root = rootRef.current;
      if (!root) return;

      // One looping timeline: a packet per arc fades in, rides its Bézier via a
      // single motionPath tween, then fades out. The broken SPAN packet only
      // travels to BREAK_T then DIES — its scatter dots disperse from the break
      // point and fade (the SVG echo of the WebGL dispersal). Staggered so the
      // three fire in sequence.
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
      for (let c = 0; c < 3; c++) {
        const packet = root.querySelector<SVGCircleElement>(
          `[data-packet="${c}"]`,
        );
        const path = root.querySelector<SVGPathElement>(`[data-arc="${c}"]`);
        if (!packet || !path) continue;
        const at = c * 0.5;
        const isDead = broken && c === 2; // the span arc fractures
        const end = isDead ? BREAK_T : 1;
        const travel = isDead ? 0.7 : 1.4;
        tl.set(packet, { opacity: 0 }, at);
        tl.to(packet, { opacity: 1, duration: 0.18, ease: "power1.out" }, at);
        tl.to(
          packet,
          {
            duration: travel,
            ease: isDead ? "power1.in" : "none",
            motionPath: {
              path,
              align: path,
              alignOrigin: [0.5, 0.5],
              start: 0,
              end,
            },
          },
          at,
        );
        if (isDead) {
          // DIE at the break: the packet fades out and a fan of scatter dots
          // disperses outward from the break point (each tweened individually —
          // NOT via a function-valued attr, which GSAP does not support).
          tl.to(
            packet,
            { opacity: 0, duration: 0.3, ease: "power1.in" },
            at + travel - 0.04,
          );
          const dots = root.querySelectorAll<SVGCircleElement>(
            `[data-scatter="${c}"]`,
          );
          dots.forEach((dot, k) => {
            const target = SCATTER[k] ?? SCATTER[0];
            tl.fromTo(
              dot,
              { opacity: 0.9, attr: { cx: SPAN_BX, cy: SPAN_BY } },
              {
                opacity: 0,
                attr: { cx: target.tx, cy: target.ty },
                duration: 0.5,
                ease: "power2.out",
              },
              at + travel - 0.04 + k * 0.04,
            );
          });
        } else {
          tl.to(
            packet,
            { opacity: 0, duration: 0.25, ease: "power1.in" },
            at + travel - 0.05,
          );
        }
      }
    },
    { scope: rootRef, dependencies: [broken] },
  );

  return (
    <svg
      ref={rootRef}
      aria-hidden="true"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={className}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--accent-2))" />
        </linearGradient>
        <filter
          id={`${gradId}-glow`}
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
        >
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Arcs (mirror HUB_ARCS): 0→1 and 1→2 live; the 0→2 span fractures in
          broken (dashed + dim = severed). Each data-arc path IS its packet's
          motionPath target. */}
      <g fill="none" strokeLinecap="round">
        {ARC_D.map((d, c) => {
          const dead = broken && c === 2;
          return (
            <path
              key={`arc-${c}`}
              data-arc={c}
              d={d}
              stroke={dead ? "hsl(var(--ink-dim))" : `url(#${gradId})`}
              strokeWidth={dead ? 1.5 : 2}
              strokeOpacity={dead ? 0.4 : 0.7}
              strokeDasharray={dead ? "4 6" : undefined}
              filter={dead ? undefined : `url(#${gradId}-glow)`}
            />
          );
        })}
      </g>

      {/* Hubs — the far hub of the severed span (hub2) goes dark in broken. */}
      <g>
        {HUBS.map((h, i) => {
          const dead = broken && i === 2;
          return (
            <circle
              key={`hub-${i}`}
              cx={h.cx}
              cy={h.cy}
              r={HUB_R}
              fill={dead ? "hsl(var(--ink-dim))" : HUB_FILL[i]}
              fillOpacity={dead ? 0.4 : 0.95}
              filter={dead ? undefined : `url(#${gradId}-glow)`}
            />
          );
        })}
      </g>

      {/* Travelling packets (one per arc), hidden at rest; + the broken span's
          scatter dots. Under reduced motion (rest) the scatter shows statically
          at its dispersed targets so the fracture reads with no animation. */}
      <g>
        {ARCS.map(([f], c) => (
          <circle
            key={`packet-${c}`}
            data-packet={c}
            r={4.5}
            cx={HUBS[f].cx}
            cy={HUBS[f].cy}
            fill={`url(#${gradId})`}
            opacity={0}
            filter={`url(#${gradId}-glow)`}
          />
        ))}
        {broken &&
          SCATTER.map((s, k) => (
            <circle
              key={`scatter-${k}`}
              data-scatter={2}
              cx={rest ? s.tx : SPAN_BX}
              cy={rest ? s.ty : SPAN_BY}
              r={2.4}
              fill="hsl(var(--ink-dim))"
              opacity={rest ? 0.5 : 0}
            />
          ))}
      </g>
    </svg>
  );
}
