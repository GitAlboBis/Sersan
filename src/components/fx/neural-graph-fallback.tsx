"use client";

/**
 * NeuralGraphFallback — the DOM/SVG twin of the NEURAL CONSTELLATION WebGL
 * island (2026-08-21 round-6 re-author; export/file name kept so the fallback
 * slot wiring in the two sections stays put).
 *
 * The SAME layered feed-forward graph as the WebGL build — 12 nodes in 5
 * layers, 21 triangulating edges — drawn statically from the SHARED config
 * tables (NODES/EDGES/NODE_LAYER/FRACTURE_T in webgl/neural/
 * neuralLatticeConfig; one source of truth, change together. The middle
 * layers = RING_T's [.25,.5,.75] arrive via NODE_LAYER 1..3 — no direct
 * RING_T read needed):
 *
 *   variant "broken"  → the Problem section. The net is intact through its
 *     first three layers; edges crossing the fracture END CLEAN at the break
 *     and continue as dashed frayed tails toward DRIFTED ember nodes; the
 *     last two layers hang degraded. A pulse packet rides the layer-centroid
 *     rail and DIES at the fracture (scatter burst), looping every ~4s.
 *   variant "healthy" → the ProductionGrade section. Full graph, plus three
 *     LAYER RINGS around the middle-layer centroids (eval → trace →
 *     guardrail — the WebGL membranes' echo) that IGNITE in pipeline order
 *     on mount via stroke-dashoffset draws; the pulse packet traverses the
 *     whole net every ~6s, pulsing each layer ring as it passes — the packet
 *     that survives.
 *
 * Renders when the WebGL island is ABSENT (use-neural-lattice-fallback.ts:
 * classic flag-OFF, lite/off tiers, reduced-motion). Decorative only:
 * aria-hidden — the real copy lives in the sections' ledger rows.
 *
 * Reduced-motion: the resting FINAL state — edges drawn, layer rings fully
 * lit, fray + scatter shown statically. No packets, no timers.
 *
 * No new dependency (GSAP + MotionPathPlugin already bundled); no SVG
 * filters anywhere (glow = underlay strokes + gradient fills — this runs on
 * the weakest tiers).
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import {
  NODES,
  EDGES,
  NODE_LAYER,
  FRACTURE_T,
} from "@/webgl/neural/neuralLatticeConfig";

if (typeof window !== "undefined") {
  gsap.registerPlugin(MotionPathPlugin);
}

type Variant = "broken" | "healthy";

// --- Geometry (viewBox space; preserveAspectRatio="none" stretches to the
// band, so shapes are authored forgiving) -----------------------------------
const VB_W = 1000;
const VB_H = 400;
const MID_Y = VB_H / 2;

/** LOCAL band space → viewBox: x ∈ ~±0.53 (width fractions) and y ∈ ±0.5
 * (height fractions, up) map inside the box with a small margin. */
const X0 = 500;
const XS = 900;
const Y0 = MID_Y;
const YS = 340;

/** Deterministic drift of a DEGRADED node (broken layers 3-4) — the SVG echo
 * of the WebGL nodeDrift (whole nodes knocked off station). */
function driftOf(i: number): [number, number] {
  return [10 + (i % 3) * 8, i % 2 === 0 ? -12 : 14];
}

interface GNode {
  x: number;
  y: number;
  layer: number;
  degraded: boolean;
}
interface GEdge {
  /** Solid segment (full edge, or the pre-fracture stub of a crossing). */
  solid: string | null;
  /** Dashed frayed tail (crossing remainder / fully-lost edge). */
  fray: string | null;
}

function buildGraph(variant: Variant) {
  const broken = variant === "broken";
  const nodes: GNode[] = NODES[variant].map(([x, y], i) => {
    const layer = NODE_LAYER[i];
    const degraded = broken && layer >= 3;
    const [dx, dy] = degraded ? driftOf(i) : [0, 0];
    return {
      x: Math.round(X0 + x * XS) + dx,
      y: Math.round(Y0 - y * YS) + dy,
      layer,
      degraded,
    };
  });

  // Layer centroids (the packet rail + the layer-ring centers). Degraded
  // drift is INCLUDED (the rail only uses intact layers anyway).
  const centroids: { x: number; y: number }[] = [];
  for (let l = 0; l < 5; l++) {
    let cx = 0,
      cy = 0,
      n = 0;
    nodes.forEach((p) => {
      if (p.layer !== l) return;
      cx += p.x;
      cy += p.y;
      n++;
    });
    centroids.push({ x: Math.round(cx / n), y: Math.round(cy / n) });
  }

  // Fracture point: FRACTURE_T (0.62) sits between layer 2 (t .5) and layer
  // 3 (t .75) → lerp the centroid spine (the WebGL spline, linearized).
  const fr = (FRACTURE_T - 0.5) / 0.25;
  const fract = {
    x: Math.round(centroids[2].x + (centroids[3].x - centroids[2].x) * fr),
    y: Math.round(centroids[2].y + (centroids[3].y - centroids[2].y) * fr),
  };

  const edges: GEdge[] = EDGES[variant].map(([a, b]) => {
    const A = nodes[a];
    const B = nodes[b];
    const line = (x0: number, y0: number, x1: number, y1: number) =>
      `M ${x0} ${y0} L ${x1} ${y1}`;
    if (!broken || B.layer <= 2) {
      return { solid: line(A.x, A.y, B.x, B.y), fray: null };
    }
    if (A.layer === 2) {
      // Crossing edge: solid to just before the break (s* ≈ 0.48 of the
      // edge = the fracture depth), a CLEAN GAP, then the dashed fray to
      // the drifted far node — the WebGL clean-break + fray echo.
      const cut = 0.44;
      const resume = 0.58;
      const px = A.x + (B.x - A.x) * cut;
      const py = A.y + (B.y - A.y) * cut;
      const qx = A.x + (B.x - A.x) * resume;
      const qy = A.y + (B.y - A.y) * resume;
      return {
        solid: line(A.x, A.y, Math.round(px), Math.round(py)),
        fray: line(Math.round(qx), Math.round(qy), B.x, B.y),
      };
    }
    // Fully-lost edge (both endpoints past the fracture): dashed, dim.
    return { solid: null, fray: line(A.x, A.y, B.x, B.y) };
  });

  // Packet rail: layer centroids input→output; broken ends AT the fracture.
  const railPts = broken
    ? [centroids[0], centroids[1], centroids[2], fract]
    : centroids;
  const rail = railPts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Healthy layer-ring pulse timing: x fraction of each middle layer along
  // the rail span.
  const railX0 = centroids[0].x;
  const railX1 = (broken ? fract : centroids[4]).x;
  const ringFracs = [1, 2, 3].map(
    (l) => (centroids[l].x - railX0) / (railX1 - railX0),
  );

  return { nodes, centroids, fract, edges, rail, ringFracs };
}

const GRAPHS: Record<Variant, ReturnType<typeof buildGraph>> = {
  broken: buildGraph("broken"),
  healthy: buildGraph("healthy"),
};

/** Scatter dots dispersing from the fracture (deterministic fan). */
function scatterOf(variant: Variant) {
  const o = GRAPHS[variant].fract;
  return Array.from({ length: 9 }, (_, k) => {
    const ang = ((-55 + k * 14) * Math.PI) / 180;
    const dist = 46 + (k % 3) * 30;
    return {
      tx: Math.round(o.x + 30 + Math.cos(ang) * dist),
      ty: Math.round(o.y + Math.sin(ang) * dist),
    };
  });
}
const SCATTER = scatterOf("broken");

/** Middle-layer ring radius (the WebGL membranes' echo). */
const LAYER_RING_R = 46;

export function NeuralGraphFallback({
  variant,
  className,
}: {
  variant: Variant;
  className?: string;
}) {
  const broken = variant === "broken";
  const g = GRAPHS[variant];
  const rootRef = useRef<SVGSVGElement>(null);
  const gradId = `constellation-grad-${variant}`;
  // Reduced-motion: render the resting final frame (rings lit, scatter shown).
  const [rest, setRest] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    setRest(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Row-reactive echo (trivial mapping only): the ledger rows write
  // setHovered on every tier, so when the WebGL island is absent this twin
  // answers attention with a whole-graph stroke-width / opacity bump on the
  // edge cores. A LOCALIZED per-layer glow does not map trivially onto
  // gradient strokes (filters banned here), so the echo stays global.
  const hovered = useNeuralLatticeStore((s) => s.hovered[variant]);
  const hoverActive = hovered !== null;
  useEffect(() => {
    if (rest) return;
    const root = rootRef.current;
    if (!root) return;
    const cores = root.querySelectorAll<SVGPathElement>("[data-strand-core]");
    cores.forEach((p) => {
      const w = Number(p.dataset.baseW ?? "1.2");
      const o = Number(p.dataset.baseO ?? "0.55");
      gsap.to(p, {
        attr: {
          "stroke-width": hoverActive ? w * 1.4 : w,
          "stroke-opacity": hoverActive ? Math.min(1, o + 0.2) : o,
        },
        duration: 0.4,
        ease: "power2.out",
        overwrite: "auto",
      });
    });
  }, [hoverActive, rest]);

  useGSAP(
    () => {
      if (typeof window === "undefined") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const root = rootRef.current;
      if (!root) return;

      const packet = root.querySelector<SVGCircleElement>("[data-packet]");
      const rail = root.querySelector<SVGPathElement>("[data-rail]");

      if (!broken) {
        // Layer-ring ignition — pipeline order (eval → trace → guardrail), a
        // stroke-dashoffset draw per ring, 0.35s apart, once on mount.
        const rings = Array.from(
          root.querySelectorAll<SVGCircleElement>("[data-ring]"),
        );
        const igni = gsap.timeline();
        rings.forEach((ring, i) => {
          const len = ring.getTotalLength();
          gsap.set(ring, {
            strokeDasharray: len,
            strokeDashoffset: len,
            opacity: 1,
          });
          igni.to(
            ring,
            { strokeDashoffset: 0, duration: 0.7, ease: "expo.inOut" },
            i * 0.35,
          );
        });
      }

      // The looping pulse packet: rides the centroid rail input→output;
      // broken → dies at the fracture with a scatter burst; healthy →
      // survives, pulsing each middle-layer ring as it passes.
      if (!packet || !rail) return;
      const period = broken ? 4 : 6;
      const travel = broken ? 1.6 : 2.4;
      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: Math.max(0.4, period - travel),
      });
      tl.set(packet, { opacity: 0 }, 0);
      tl.to(packet, { opacity: 1, duration: 0.2, ease: "power1.out" }, 0);
      tl.to(
        packet,
        {
          duration: travel,
          ease: broken ? "power1.in" : "none",
          motionPath: {
            path: rail,
            align: rail,
            alignOrigin: [0.5, 0.5],
            start: 0,
            end: 1,
          },
        },
        0,
      );
      if (broken) {
        // DIE at the fracture: packet snuffs, scatter dots disperse.
        tl.to(
          packet,
          { opacity: 0, duration: 0.25, ease: "power1.in" },
          travel - 0.05,
        );
        const dots = root.querySelectorAll<SVGCircleElement>("[data-scatter]");
        dots.forEach((dot, k) => {
          const target = SCATTER[k] ?? SCATTER[0];
          tl.fromTo(
            dot,
            {
              opacity: 0.85,
              attr: { cx: g.fract.x, cy: g.fract.y },
            },
            {
              opacity: 0,
              attr: { cx: target.tx, cy: target.ty },
              duration: 0.6,
              ease: "power2.out",
            },
            travel - 0.05 + k * 0.03,
          );
        });
      } else {
        // SURVIVE: pulse each layer ring as the packet passes, fade at end.
        const rings = Array.from(
          root.querySelectorAll<SVGCircleElement>("[data-ring]"),
        );
        g.ringFracs.forEach((frac, i) => {
          const at = frac * travel;
          if (rings[i]) {
            tl.fromTo(
              rings[i],
              { strokeOpacity: 0.75 },
              {
                strokeOpacity: 1,
                duration: 0.16,
                yoyo: true,
                repeat: 1,
                ease: "power2.out",
              },
              at,
            );
          }
        });
        tl.to(
          packet,
          { opacity: 0, duration: 0.25, ease: "power1.in" },
          travel - 0.1,
        );
      }
    },
    { scope: rootRef, dependencies: [broken] },
  );

  return (
    <svg
      ref={rootRef}
      aria-hidden="true"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      className={className}
      style={{ display: "block" }}
    >
      <defs>
        {/* Global left→right ramp shared by every edge stroke (userSpaceOnUse
            — per-edge bounding boxes would each restart the gradient). */}
        <linearGradient
          id={gradId}
          x1="0"
          y1="0"
          x2={VB_W}
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--accent-2))" />
        </linearGradient>
        {/* Soft radial halo for node cores + the pulse packet — the glow is a
            gradient FILL, not a filter: this fallback runs precisely on the
            weak / reduced tiers where filters hurt most. */}
        <radialGradient id={`${gradId}-halo`}>
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="1" />
          <stop offset="45%" stopColor="hsl(var(--accent))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* EDGES — the triangular mesh. Glow = a wide translucent UNDERLAY
          stroke beneath the crisp core stroke (filter-free bloom). */}
      <g fill="none" strokeLinecap="round">
        {g.edges.map(
          (e, i) =>
            e.solid && (
              <path
                key={`edge-under-${i}`}
                d={e.solid}
                stroke={`url(#${gradId})`}
                strokeWidth={4.5}
                strokeOpacity={0.12}
              />
            ),
        )}
        {g.edges.map(
          (e, i) =>
            e.solid && (
              <path
                key={`edge-${i}`}
                data-strand-core
                data-base-w={1.4}
                data-base-o={0.65}
                d={e.solid}
                stroke={`url(#${gradId})`}
                strokeWidth={1.4}
                strokeOpacity={0.65}
              />
            ),
        )}
        {/* Frayed tails: dashed, ember-dim — the degraded half of the net. */}
        {g.edges.map(
          (e, i) =>
            e.fray && (
              <path
                key={`fray-${i}`}
                d={e.fray}
                stroke="hsl(var(--ink-dim))"
                strokeWidth={1.3}
                strokeOpacity={0.45}
                strokeDasharray="3 7"
              />
            ),
        )}
        {/* The pulse packet's invisible rail (layer-centroid spine). */}
        <path data-rail d={g.rail} stroke="none" />
      </g>

      {/* Healthy: three LAYER RINGS at the middle-layer centroids (the WebGL
          membranes' echo), drawn by the ignition timeline (reduced motion:
          fully lit at rest). Filter-free. */}
      {!broken && (
        <g fill="none">
          {[1, 2, 3].map((l, i) => (
            <circle
              key={`ring-${i}`}
              data-ring={i}
              cx={g.centroids[l].x}
              cy={g.centroids[l].y}
              r={LAYER_RING_R}
              stroke={`url(#${gradId})`}
              strokeWidth={2.2}
              strokeOpacity={0.85}
            />
          ))}
        </g>
      )}

      {/* NODES — halo disc + crisp core; degraded nodes (broken, past the
          fracture) sit drifted, ember-dim. */}
      <g>
        {g.nodes.map((n, i) =>
          n.degraded ? (
            <circle
              key={`node-${i}`}
              cx={n.x}
              cy={n.y}
              r={4.5}
              fill="hsl(var(--ink-dim))"
              opacity={0.5}
            />
          ) : (
            <g key={`node-${i}`}>
              <circle cx={n.x} cy={n.y} r={11} fill={`url(#${gradId}-halo)`} />
              <circle
                cx={n.x}
                cy={n.y}
                r={2.4}
                fill="hsl(var(--accent))"
                opacity={0.95}
              />
            </g>
          ),
        )}
      </g>

      {/* Broken: scattered ember debris at the fracture. Under reduced
          motion (rest) the dots sit statically at their dispersed targets. */}
      {broken && (
        <g>
          {SCATTER.map((p, k) => (
            <circle
              key={`scatter-${k}`}
              data-scatter={k}
              cx={rest ? p.tx : g.fract.x}
              cy={rest ? p.ty : g.fract.y}
              r={2.2}
              fill="hsl(var(--ink-dim))"
              opacity={rest ? 0.5 : 0}
            />
          ))}
        </g>
      )}

      {/* The travelling pulse packet (hidden at rest / reduced motion).
          The halo is baked into the radial-gradient fill — no filter. */}
      <circle
        data-packet
        r={8}
        cx={0}
        cy={MID_Y}
        fill={`url(#${gradId}-halo)`}
        opacity={0}
      />
    </svg>
  );
}
