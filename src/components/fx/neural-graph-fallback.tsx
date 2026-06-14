"use client";

/**
 * NeuralGraphFallback — the Concept A (DOM/SVG) fallback for the FIX 3
 * neural-lattice (PIANO_FIX_VISUAL.md §FIX 3 / §9.2).
 *
 * This is what renders the neural metaphor when the WebGL NeuralLattice island
 * is ABSENT: classic flag-OFF WebGLRenderer, lite/off tiers, no-WebGPU, and
 * prefers-reduced-motion. The codebase unmounts the WebGL island on those tiers,
 * so this SVG carries the same input → hidden → output / cyan→violet / signal
 * vocabulary statically (or with a single deterministic GSAP timeline).
 *
 *   variant "broken"  → the Problem section: three pathways that SEVER. The
 *     output column reads as unreachable (dashed/dim edges into it); the signal
 *     packets travel input→hidden and STOP at the break.
 *   variant "healthy" → the ProductionGrade section: three intact pathways; the
 *     packets complete input→hidden→output.
 *
 * Reduced-motion: render the final resting frame — no packets, no animation
 * (the graph still reads as broken vs healthy from the edge styling alone).
 *
 * Decorative only: aria-hidden. The real copy lives as accessible DOM in the
 * two sections. No new dependency (GSAP + MotionPathPlugin are already in the
 * bundle; both are free-tier).
 */
import { useRef } from "react";
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
const LAYER_X = [70, 230, 390]; // input · hidden · output
const CLUSTER_Y = [70, 150, 230]; // three pathways
const NODE_R = 7;

interface GraphNode {
  layer: number;
  cluster: number;
  x: number;
  y: number;
}

function buildNodes(): GraphNode[] {
  const nodes: GraphNode[] = [];
  for (let c = 0; c < 3; c++) {
    for (let l = 0; l < 3; l++) {
      nodes.push({ layer: l, cluster: c, x: LAYER_X[l], y: CLUSTER_Y[c] });
    }
  }
  return nodes;
}

const NODES = buildNodes();

function nodeOf(cluster: number, layer: number): GraphNode {
  return NODES.find((n) => n.cluster === cluster && n.layer === layer)!;
}

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

  useGSAP(
    () => {
      if (typeof window === "undefined") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const root = rootRef.current;
      if (!root) return;

      // One looping timeline: a packet per pathway travels along its spine
      // (input→hidden→output for healthy, input→hidden then DIES for broken),
      // staggered so the three fire in sequence. Each packet: snap to start
      // (opacity 0), fade in, travel via a SINGLE motionPath tween, then fade
      // out (broken → it died at the break; healthy → a brief settle).
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
      const end = broken ? 0.5 : 1;
      const travel = broken ? 0.85 : 1.4;
      for (let c = 0; c < 3; c++) {
        const packet = root.querySelector<SVGCircleElement>(
          `[data-packet="${c}"]`,
        );
        const spine = root.querySelector<SVGPathElement>(`[data-spine="${c}"]`);
        if (!packet || !spine) continue;
        const at = c * 0.45;
        tl.set(packet, { opacity: 0 }, at);
        tl.to(packet, { opacity: 1, duration: 0.18, ease: "power1.out" }, at);
        tl.to(
          packet,
          {
            duration: travel,
            ease: "none",
            motionPath: {
              path: spine,
              align: spine,
              alignOrigin: [0.5, 0.5],
              start: 0,
              end,
            },
          },
          at,
        );
        tl.to(packet, { opacity: 0, duration: 0.25, ease: "power1.in" }, at + travel - 0.05);
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
        <filter id={`${gradId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Edges: input→hidden→output. Broken → the hidden→output edges read as
          severed (dashed, dim). The full feed-forward fan is drawn faintly; the
          three cluster SPINES (center path) are drawn brighter and carry the
          packet via motionPath. */}
      <g fill="none" strokeLinecap="round">
        {/* faint fan edges (decorative density) */}
        {NODES.filter((n) => n.layer < 2).flatMap((from) =>
          NODES.filter(
            (n) => n.layer === from.layer + 1 && n.cluster === from.cluster,
          ).map((to) => {
            const severed = broken && from.layer >= 1;
            return (
              <line
                key={`${from.cluster}-${from.layer}-${to.cluster}-${to.layer}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={severed ? "hsl(var(--ink-dim))" : `url(#${gradId})`}
                strokeWidth={severed ? 1 : 1.5}
                strokeOpacity={severed ? 0.35 : 0.55}
                strokeDasharray={severed ? "3 5" : undefined}
              />
            );
          }),
        )}

        {/* cluster spines (the packet rides these) */}
        {[0, 1, 2].map((c) => {
          const i = nodeOf(c, 0);
          const h = nodeOf(c, 1);
          const o = nodeOf(c, 2);
          // For broken we still describe the full path but only animate to 0.5.
          const d = `M ${i.x} ${i.y} L ${h.x} ${h.y} L ${o.x} ${o.y}`;
          return (
            <path
              key={`spine-${c}`}
              data-spine={c}
              d={d}
              stroke="transparent"
              strokeWidth={1}
            />
          );
        })}
      </g>

      {/* Nodes. Broken → output column desaturated/dim (unreachable). */}
      <g>
        {NODES.map((n) => {
          const dead = broken && n.layer === 2;
          // input → cyan, hidden → blended, output → violet (resting tone).
          const fill = dead
            ? "hsl(var(--ink-dim))"
            : n.layer === 0
              ? "hsl(var(--accent))"
              : n.layer === 1
                ? "hsl(216 92% 66%)"
                : "hsl(var(--accent-2))";
          return (
            <circle
              key={`${n.cluster}-${n.layer}`}
              cx={n.x}
              cy={n.y}
              r={NODE_R}
              fill={fill}
              fillOpacity={dead ? 0.4 : 0.9}
              filter={dead ? undefined : `url(#${gradId}-glow)`}
            />
          );
        })}
      </g>

      {/* Travelling signal packets (one per cluster), hidden at rest. */}
      <g>
        {[0, 1, 2].map((c) => (
          <circle
            key={`packet-${c}`}
            data-packet={c}
            r={4.5}
            cx={LAYER_X[0]}
            cy={CLUSTER_Y[c]}
            fill="hsl(var(--accent))"
            opacity={0}
            filter={`url(#${gradId}-glow)`}
          />
        ))}
      </g>
    </svg>
  );
}
