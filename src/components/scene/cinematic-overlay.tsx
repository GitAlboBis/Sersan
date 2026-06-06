"use client";

/**
 * CinematicOverlay — DOM/SVG/CSS overlay that adds atmospheric depth on
 * top of the WebGL scene without touching the foreground content.
 *
 * Layered on top of <ProductionSystemScene> but below the text panels,
 * inside the pinned sticky stage. The overlay is pointer-events:none and
 * aria-hidden so it never interferes with text, CTAs, or screen readers.
 *
 * Layers (back → front):
 *   1. Topology       — sparse constellation-style nodes + faint lines
 *                       drifting in the right-side / dark areas. Reads
 *                       as a system architecture map, not a circuit-board.
 *   2. Telemetry arcs — three SVG ellipses anchored over Saturn's
 *                       typical on-screen position. Dashed strokes
 *                       slowly traveling via stroke-dashoffset animation.
 *   3. Diagnostic     — small bright dots animating along the arcs via
 *      pings           SVG animateMotion. 2–3 simultaneous, staggered.
 *   4. Atmospheric    — soft radial gradient pulse over Saturn's
 *      shimmer         position. Conveys "the system is alive" without
 *                       motion that competes with the planet.
 *   5. Dust drift     — ~50 sub-pixel motes drifting slowly across the
 *                       scene. Pure CSS keyframes, GPU-cheap.
 *   6. Scan pass      — a near-invisible horizontal sweep line every
 *                       10s. The "we're still reading telemetry" cue.
 *   7. Grain          — static SVG-turbulence noise at 4% opacity for
 *                       film-like texture.
 *
 * Performance
 *   - All animations use transform + opacity (GPU-accelerated, no
 *     layout/paint thrash).
 *   - No JS animation loop — pure CSS keyframes + SVG SMIL.
 *   - prefers-reduced-motion kills all motion; the static base layers
 *     (arcs without dash motion, grain) still render so the overlay
 *     still has atmosphere.
 *   - Mounted only inside the desktop pinned stage (mobile fallback
 *     doesn't render this).
 */

import { useEffect, useState } from "react";

// Per-instance pseudorandom seed so positions don't drift between
// renders. Stable across SSR/hydration.
const SEED = 0xa3f7;
function rand(i: number): number {
  // xorshift-ish — fast, deterministic, good enough for visual scatter
  let x = (SEED ^ (i * 374761393)) >>> 0;
  x = (x ^ (x >>> 13)) * 1274126177;
  x = x >>> 0;
  return (x & 0xffff) / 0xffff;
}

// ====== Telemetry arcs anchored near Saturn's screen position ======
// Anchor: upper-right of frame (60% × 40%). Three concentric arcs at
// different sizes and tilts. SVG <ellipse> with stroke-dasharray gives
// the "incoming/outgoing telemetry" feel; CSS animates dashoffset to
// make the dashes travel — slow and calm, never sprinting.

interface Arc {
  cx: number; // viewport %
  cy: number;
  rx: number; // px
  ry: number;
  tilt: number; // degrees
  /** Animation duration of the dashoffset cycle, seconds. */
  travel: number;
  /** Stroke dasharray spec — "dash gap" in px. */
  dash: string;
  opacity: number;
}

const ARCS: Arc[] = [
  { cx: 60, cy: 40, rx: 220, ry: 78, tilt: -22, travel: 38, dash: "1 16", opacity: 0.36 },
  { cx: 60, cy: 40, rx: 310, ry: 110, tilt: -22, travel: 56, dash: "2 28", opacity: 0.26 },
  { cx: 60, cy: 40, rx: 410, ry: 145, tilt: -22, travel: 80, dash: "1 36", opacity: 0.18 },
];

// ====== Diagnostic pings — pulses traveling along each arc ======
// Each ping uses SVG <animateMotion> to follow the arc path. Staggered
// begin times so the cluster reads as "ongoing telemetry" instead of
// metronome regularity.

interface Ping {
  arcIndex: number;
  duration: number; // seconds for one full lap
  begin: number; // start delay
  size: number; // px diameter
  hue: "accent" | "warm";
}

const PINGS: Ping[] = [
  { arcIndex: 0, duration: 14, begin: 0.0, size: 4, hue: "accent" },
  { arcIndex: 0, duration: 14, begin: 7.0, size: 3, hue: "warm" },
  { arcIndex: 1, duration: 22, begin: 3.5, size: 3, hue: "accent" },
  { arcIndex: 2, duration: 32, begin: 11.0, size: 3, hue: "accent" },
];

// Build an ellipse path string for animateMotion. SVG <ellipse> doesn't
// give path data directly, so we generate an equivalent path. Starts
// at the rightmost point, goes clockwise.
function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  // Two arcs cover the full ellipse.
  return `M ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy}`;
}

// ====== Topology constellation — sparse "system map" in the dark zones ======
// 22 nodes randomly placed in the right-third + bottom-third (where the
// hero text isn't). A handful of faint connecting lines.

const TOPOLOGY_NODES = Array.from({ length: 22 }, (_, i) => ({
  // Right-side dominant placement so we don't compete with the H1 area.
  x: 55 + rand(i * 7 + 1) * 42,
  y: 8 + rand(i * 7 + 2) * 80,
  size: 1 + rand(i * 7 + 3) * 1.6,
  delay: rand(i * 7 + 4) * 8,
}));

// Stable edge set — connect every node to its nearest neighbour-ish in
// a deterministic way. Sparse: only every 3rd node gets a line.
const TOPOLOGY_EDGES = TOPOLOGY_NODES.filter((_, i) => i % 3 === 0).map(
  (node, i, arr) => {
    const next = arr[(i + 1) % arr.length];
    return { x1: node.x, y1: node.y, x2: next.x, y2: next.y };
  },
);

// ====== Dust drift particles ======
const DUST = Array.from({ length: 50 }, (_, i) => ({
  left: rand(i * 13 + 1) * 100,
  top: rand(i * 13 + 2) * 100,
  size: 0.7 + rand(i * 13 + 3) * 1.4,
  duration: 24 + rand(i * 13 + 4) * 36,
  delay: -rand(i * 13 + 5) * 40,
  dx: -8 + rand(i * 13 + 6) * 16,
  dy: -8 + rand(i * 13 + 7) * 16,
  opacity: 0.08 + rand(i * 13 + 8) * 0.18,
}));

export function CinematicOverlay() {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden cine-overlay"
      data-reduce={reduce ? "true" : undefined}
    >
      {/* ===== Layer 1: Topology constellation ============================ */}
      <svg
        className="cine-topology"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {TOPOLOGY_EDGES.map((e, i) => (
          <line
            key={`e_${i}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="hsl(var(--accent))"
            strokeOpacity={0.12}
            strokeWidth={0.07}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {TOPOLOGY_NODES.map((n, i) => (
          <circle
            key={`n_${i}`}
            cx={n.x}
            cy={n.y}
            r={n.size * 0.07}
            fill="hsl(var(--accent))"
            opacity={0.32}
            style={{
              animation: reduce
                ? "none"
                : `cineBreath 6s ease-in-out ${n.delay}s infinite alternate`,
              transformOrigin: "center",
              transformBox: "fill-box",
            }}
          />
        ))}
      </svg>

      {/* ===== Layer 2: Telemetry arcs ==================================== */}
      <svg
        className="cine-arcs"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          {ARCS.map((arc, i) => (
            <path
              key={`arc-path-${i}`}
              id={`arc-${i}`}
              d={ellipsePath(
                (arc.cx / 100) * 1600,
                (arc.cy / 100) * 900,
                arc.rx,
                arc.ry,
              )}
            />
          ))}
        </defs>
        {ARCS.map((arc, i) => (
          <g
            key={`arc-${i}`}
            transform={`rotate(${arc.tilt} ${(arc.cx / 100) * 1600} ${(arc.cy / 100) * 900})`}
          >
            <use
              href={`#arc-${i}`}
              fill="none"
              stroke="hsl(var(--accent))"
              strokeOpacity={arc.opacity}
              strokeWidth={1}
              strokeDasharray={arc.dash}
              strokeLinecap="round"
              className="cine-arc"
              style={{
                animation: reduce
                  ? "none"
                  : `cineDashTravel ${arc.travel}s linear infinite`,
              }}
            />
          </g>
        ))}

        {/* ===== Layer 3: Diagnostic pings traveling along the arcs ====== */}
        {!reduce &&
          PINGS.map((p, i) => {
            const arc = ARCS[p.arcIndex];
            return (
              <g
                key={`ping-${i}`}
                transform={`rotate(${arc.tilt} ${(arc.cx / 100) * 1600} ${(arc.cy / 100) * 900})`}
              >
                <circle
                  r={p.size}
                  fill={
                    p.hue === "accent" ? "hsl(var(--accent))" : "hsl(var(--accent-2))"
                  }
                  opacity={0.95}
                  style={{
                    filter: `drop-shadow(0 0 ${p.size * 1.5}px ${
                      p.hue === "accent"
                        ? "hsl(var(--accent) / 0.8)"
                        : "hsl(var(--accent-2) / 0.7)"
                    })`,
                  }}
                >
                  <animateMotion
                    dur={`${p.duration}s`}
                    begin={`${p.begin}s`}
                    repeatCount="indefinite"
                    rotate="auto"
                  >
                    <mpath href={`#arc-${p.arcIndex}`} />
                  </animateMotion>
                  <animate
                    attributeName="opacity"
                    values="0;0.95;0.95;0"
                    keyTimes="0;0.08;0.92;1"
                    dur={`${p.duration}s`}
                    begin={`${p.begin}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          })}
      </svg>

      {/* ===== Layer 4: Atmospheric shimmer over Saturn ================== */}
      <div className="cine-shimmer" aria-hidden="true" />

      {/* ===== Layer 5: Dust drift ====================================== */}
      <div className="cine-dust" aria-hidden="true">
        {DUST.map((d, i) => (
          <span
            key={i}
            className="cine-dust-mote"
            style={
              {
                left: `${d.left}%`,
                top: `${d.top}%`,
                width: `${d.size}px`,
                height: `${d.size}px`,
                opacity: d.opacity,
                ["--dust-dx" as string]: `${d.dx}px`,
                ["--dust-dy" as string]: `${d.dy}px`,
                animation: reduce
                  ? "none"
                  : `cineDustDrift ${d.duration}s ease-in-out ${d.delay}s infinite alternate`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* ===== Layer 6: Scan pass — every 10s ============================ */}
      <div className="cine-scan" aria-hidden="true" />

      {/* ===== Layer 7: Grain ============================================ */}
      <div className="cine-grain" aria-hidden="true" />

      <style>{`
        /* Topology constellation — right side dominant, low opacity */
        .cine-topology {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          mix-blend-mode: screen;
        }

        /* Telemetry arcs */
        .cine-arcs {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          mix-blend-mode: screen;
        }
        .cine-arc {
          /* dashoffset cycle covers the full ellipse circumference */
          stroke-dashoffset: 0;
          will-change: stroke-dashoffset;
        }

        /* Atmospheric shimmer — radial pulse over the Saturn anchor */
        .cine-shimmer {
          position: absolute;
          left: 50%;
          top: 30%;
          width: 50vw;
          height: 50vw;
          max-width: 700px;
          max-height: 700px;
          transform: translate(-30%, -50%);
          background: radial-gradient(
            closest-side,
            hsl(var(--accent) / 0.10) 0%,
            hsl(var(--accent) / 0.04) 40%,
            transparent 75%
          );
          mix-blend-mode: screen;
          filter: blur(40px);
          will-change: opacity, transform;
          animation: cineShimmer 9s ease-in-out infinite;
        }

        /* Dust */
        .cine-dust {
          position: absolute;
          inset: 0;
        }
        .cine-dust-mote {
          position: absolute;
          background: hsl(var(--ink) / 0.7);
          border-radius: 9999px;
          mix-blend-mode: screen;
          will-change: transform, opacity;
        }

        /* Scan pass — long-period horizontal sweep */
        .cine-scan {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            transparent 0%,
            hsl(var(--accent) / 0.06) 48%,
            hsl(var(--accent) / 0.10) 50%,
            hsl(var(--accent) / 0.06) 52%,
            transparent 100%
          );
          background-size: 100% 220%;
          background-position: 0% -120%;
          background-repeat: no-repeat;
          mix-blend-mode: screen;
          opacity: 0.65;
          will-change: background-position;
          animation: cineScan 11s linear infinite;
        }

        /* Grain — fine static noise via SVG turbulence */
        .cine-grain {
          position: absolute;
          inset: 0;
          opacity: 0.05;
          mix-blend-mode: overlay;
          pointer-events: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55  0 0 0 0 0.78  0 0 0 0 0.96  0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          background-size: 200px 200px;
        }

        /* Reduce-motion gate — stop everything that moves but keep static
           layers visible so the overlay still adds atmosphere. */
        .cine-overlay[data-reduce] .cine-scan,
        .cine-overlay[data-reduce] .cine-shimmer,
        .cine-overlay[data-reduce] .cine-arc {
          animation: none !important;
        }
        .cine-overlay[data-reduce] .cine-dust-mote {
          animation: none !important;
        }

        @keyframes cineBreath {
          from { opacity: 0.18; transform: scale(1); }
          to   { opacity: 0.55; transform: scale(1.6); }
        }

        @keyframes cineDashTravel {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -1200; }
        }

        @keyframes cineShimmer {
          0%, 100% { opacity: 0.55; transform: translate(-30%, -50%) scale(1); }
          50%      { opacity: 1;    transform: translate(-30%, -50%) scale(1.06); }
        }

        @keyframes cineDustDrift {
          from { transform: translate(0, 0); }
          to   { transform: translate(var(--dust-dx, 0), var(--dust-dy, 0)); }
        }

        @keyframes cineScan {
          /* Most of the cycle: scan parked off-screen at top.
             A quick 1.5s window slides it through the viewport. */
          0%   { background-position: 0% -120%; opacity: 0; }
          84%  { background-position: 0% -120%; opacity: 0; }
          86%  { background-position: 0% -120%; opacity: 0.55; }
          99%  { background-position: 0% 220%;  opacity: 0.4;  }
          100% { background-position: 0% 220%;  opacity: 0;  }
        }
      `}</style>
    </div>
  );
}
