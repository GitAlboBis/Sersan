"use client";

/**
 * NeuralGraphFallback — the DOM/SVG twin of the NEURAL PLEXUS WebGL island
 * (2026-08-22 round-8-D re-author; export/file name kept so the fallback slot
 * wiring in the two sections stays put).
 *
 * The SAME dense brain plexus as the WebGL build, drawn statically from the
 * SHARED generator (`getPlexus(variant, "svg")` in webgl/neural/
 * neuralLatticeConfig — one source of truth, one algorithm, three density
 * presets): ~36 nodes in a volumetric cloud, ~62 near-neighbour links forming
 * an irregular triangulation, and every node drawn as a FILLED STAR (a solid
 * bright core inside a soft radial glow, with a 4-ray flare cross on the
 * brighter ones).
 *
 * ROUND-8-D "no circles" compliance: the three LAYER RINGS this file used to
 * draw around the healthy layer centroids are GONE — they were hollow circles,
 * exactly what the owner rejected. The healthy ignition now lights three
 * REGIONS of the cloud instead (the same remap the WebGL build does with its
 * gaussian zone blend). Node glows are FILLED radial gradients paired with a
 * solid core, i.e. star glows, never rims.
 *
 *   variant "broken"  → the Problem section. The cloud is intact left of the
 *     fracture (nodeT 0.62); links crossing it END CLEAN at the break and
 *     continue as dashed frayed tails toward DRIFTED ember stars; everything
 *     right of it hangs degraded. A pulse packet rides the x-slice centroid
 *     rail and DIES at the fracture (scatter burst), looping every ~4s.
 *   variant "healthy" → the ProductionGrade section. The whole cloud is
 *     intact; the three ignition REGIONS (eval → trace → guardrail) light in
 *     pipeline order on mount; the pulse packet traverses the whole cloud
 *     every ~6s, brightening each region as it passes — the packet that
 *     survives.
 *
 * Renders when the WebGL island is ABSENT (use-neural-lattice-fallback.ts:
 * classic flag-OFF, lite/off tiers, reduced-motion). Decorative only:
 * aria-hidden — the real copy lives in the sections' ledger rows.
 *
 * Reduced-motion: the resting FINAL state — links drawn, all three regions
 * fully lit, fray + scatter shown statically. No packets, no timers.
 *
 * No new dependency (GSAP + MotionPathPlugin already bundled); no SVG filters
 * anywhere (glow = underlay strokes + gradient fills — this runs on the
 * weakest tiers).
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import {
  getPlexus,
  FRACTURE_T,
  RING_T,
  COL_CORE,
  COL_CYAN,
  COL_BLUE,
  COL_EMBER2,
  PLEXUS_RZ,
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

/** LOCAL band space → viewBox: x ∈ ~±0.5 (width fractions) and y ∈ ±0.45
 * (height fractions, up) map inside the box with a small margin. */
const X0 = 500;
const XS = 900;
const Y0 = MID_Y;
const YS = 340;

/** Deterministic drift of a DEGRADED node (broken, past the fracture) — the
 * SVG echo of the WebGL nodeDrift (whole stars knocked off station). */
function driftOf(i: number): [number, number] {
  return [7 + (i % 3) * 6, i % 2 === 0 ? -9 : 11];
}

interface GNode {
  x: number;
  y: number;
  /** 0 (far) → 1 (near) — drives the star's size + opacity (the depth read). */
  depth: number;
  t: number;
  degraded: boolean;
  /** Nearest ignition region, or −1 for the cloud's outer fringes. */
  zone: number;
  /** Deterministic "bright star" flag — these get the 4-ray flare cross. */
  flare: boolean;
}
interface GEdge {
  /** Solid segment (full link, or the pre-fracture stub of a crossing). */
  solid: string | null;
  /** Dashed frayed tail (crossing remainder / fully-lost link). */
  fray: string | null;
}

function buildGraph(variant: Variant) {
  const broken = variant === "broken";
  const plexus = getPlexus(variant, "svg");

  const nodes: GNode[] = plexus.nodes.map(([x, y, z], i) => {
    const t = plexus.nodeT[i];
    const degraded = broken && t > FRACTURE_T;
    const [dx, dy] = degraded ? driftOf(i) : [0, 0];
    // Nearest ignition region — RING_T are 0.25 apart, so half a gap is the
    // natural membership radius (the SVG echo of the gaussian zone blend).
    let zone = -1;
    let best = 0.125;
    RING_T.forEach((rt, zi) => {
      const d = Math.abs(t - rt);
      if (d < best) {
        best = d;
        zone = zi;
      }
    });
    return {
      x: Math.round(X0 + x * XS) + dx,
      y: Math.round(Y0 - y * YS) + dy,
      // QUANTIZED on purpose. `depth` is the only generator output that flows
      // UNROUNDED into rendered attributes (r / opacity via lerp), and
      // getPlexus is deterministic only per-ENGINE: it hashes through
      // Math.sin, whose last-ULP result is implementation-defined, then
      // amplifies it ×43758 — so Node's V8 and a JSC/SpiderMonkey client can
      // disagree at ~1e-11 and print different attribute strings. Today that
      // cannot bite (useNeuralLatticeFallback returns false until the tier
      // probe resolves, so this SVG never renders during SSR or on the first
      // client pass), but rounding to 3 decimals makes the markup engine-
      // independent by construction instead of by accident. x/y are already
      // Math.round-ed and `t` only feeds comparisons, so this closes the last
      // continuous channel.
      depth:
        Math.round(Math.min(1, Math.max(0, z / (2 * PLEXUS_RZ) + 0.5)) * 1000) /
        1000,
      t,
      degraded,
      zone,
      flare: i % 3 === 0,
    };
  });

  // The x-slice centroid spine (the packet rail + the fracture point) —
  // exactly the uC0..uC4 control points the WebGL build registers on.
  const centroids = plexus.centroids.map(([x, y]) => ({
    x: Math.round(X0 + x * XS),
    y: Math.round(Y0 - y * YS),
  }));

  // Fracture point: FRACTURE_T (0.62) sits between slice 2 (t .5) and slice 3
  // (t .75) → lerp the centroid spine (the WebGL spline, linearized).
  const fr = (FRACTURE_T - 0.5) / 0.25;
  const fract = {
    x: Math.round(centroids[2].x + (centroids[3].x - centroids[2].x) * fr),
    y: Math.round(centroids[2].y + (centroids[3].y - centroids[2].y) * fr),
  };

  const edges: GEdge[] = plexus.edges.map(([a, b]) => {
    const A = nodes[a];
    const B = nodes[b];
    const line = (x0: number, y0: number, x1: number, y1: number) =>
      `M ${x0} ${y0} L ${x1} ${y1}`;
    if (!broken || B.t <= FRACTURE_T) {
      return { solid: line(A.x, A.y, B.x, B.y), fray: null };
    }
    if (A.t < FRACTURE_T) {
      // Crossing link: solid to just before the break (the fracture's
      // position along the link), a CLEAN GAP, then the dashed fray to the
      // drifted far star — the WebGL clean-break + fray echo.
      //
      // MEASURED (2026-08-22): at the "svg" density this branch is currently
      // UNREACHABLE — the crystal clearance well straddles the fracture's own
      // x-slab (see the CRYSTAL_CLEAR_INNER note in neuralLatticeConfig), so
      // buildPlexus delivers ZERO links spanning FRACTURE_T for broken/svg
      // (full delivers 2, lite 1). The twin's break therefore reads through
      // the clearance gap, the 9 fully-lost dashed links, the 8 drifted ember
      // stars and the scatter burst — not through a cut filament. Kept live
      // and correct because it becomes reachable again the moment
      // PLEXUS_SEEDS.svg, CRYSTAL_POS or FRACTURE_T move.
      const s = (FRACTURE_T - A.t) / Math.max(B.t - A.t, 1e-4);
      const cut = Math.max(0.08, s - 0.09);
      const resume = Math.min(0.92, s + 0.09);
      const at = (f: number) => [
        Math.round(A.x + (B.x - A.x) * f),
        Math.round(A.y + (B.y - A.y) * f),
      ];
      const [px, py] = at(cut);
      const [qx, qy] = at(resume);
      return { solid: line(A.x, A.y, px, py), fray: line(qx, qy, B.x, B.y) };
    }
    // Fully-lost link (both endpoints past the fracture): dashed, dim.
    return { solid: null, fray: line(A.x, A.y, B.x, B.y) };
  });

  // Packet rail: slice centroids left→right; broken ends AT the fracture.
  const railPts = broken
    ? [centroids[0], centroids[1], centroids[2], fract]
    : centroids;
  const rail = railPts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Region-pulse timing: x fraction of each ignition region along the rail.
  const railX0 = centroids[0].x;
  const railX1 = (broken ? fract : centroids[4]).x;
  const zoneFracs = [1, 2, 3].map(
    (l) => (centroids[l].x - railX0) / Math.max(railX1 - railX0, 1),
  );

  return { nodes, centroids, fract, edges, rail, zoneFracs };
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
    const dist = 40 + (k % 3) * 26;
    return {
      tx: Math.round(o.x + 24 + Math.cos(ang) * dist),
      ty: Math.round(o.y + Math.sin(ang) * dist),
    };
  });
}
const SCATTER = scatterOf("broken");

/** Star geometry in viewBox units (the SVG echo of STAR_CORE_R /
 * STAR_FLARE_LEN): core radius, filled glow radius and flare-ray reach, each
 * scaled by the node's depth so near stars read bigger and brighter. */
const STAR_CORE_R = [1.5, 2.9] as const;
const STAR_GLOW_R = [4.5, 8.5] as const;
const STAR_RAY = [6, 11] as const;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function NeuralGraphFallback({
  variant,
  className,
  staticPose = false,
}: {
  variant: Variant;
  className?: string;
  /**
   * ROUND 14 — the no-JS server twin (owner call, 2026-08-26): render the
   * RESTING FINAL pose unconditionally and run NO effect, ever. Used only by
   * the `<noscript>` copies in the two sections, whose markup must be pure
   * server output: a no-JS client displays it as-is, while a JS client still
   * hydrates the (hidden) instance — so every GSAP/store effect below must
   * stay inert or the invisible copy would duplicate timelines and
   * subscriptions. The depth quantization above already makes this markup
   * engine-independent, which is exactly what SSR needs.
   */
  staticPose?: boolean;
}) {
  const broken = variant === "broken";
  const g = GRAPHS[variant];
  const rootRef = useRef<SVGSVGElement>(null);
  const gradId = `plexus-grad-${variant}${staticPose ? "-static" : ""}`;
  // Reduced-motion: render the resting final frame (regions lit, scatter out).
  const [restState, setRest] = useState(false);
  const rest = staticPose || restState;
  useEffect(() => {
    if (staticPose) return;
    if (typeof window === "undefined" || !window.matchMedia) return;
    setRest(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [staticPose]);

  // Row-reactive echo (trivial mapping only): the ledger rows write
  // setHovered on every tier, so when the WebGL island is absent this twin
  // answers attention with a whole-graph stroke-width / opacity bump on the
  // link cores. A LOCALIZED per-region glow does not map trivially onto
  // gradient strokes (filters banned here), so the echo stays global.
  const hovered = useNeuralLatticeStore((s) => s.hovered[variant]);
  const hoverActive = hovered !== null;
  useEffect(() => {
    if (rest) return;
    const root = rootRef.current;
    if (!root) return;
    const cores = root.querySelectorAll<SVGPathElement>("[data-strand-core]");
    cores.forEach((p) => {
      const w = Number(p.dataset.baseW ?? "1");
      const o = Number(p.dataset.baseO ?? "0.5");
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
      if (staticPose) return; // no-JS server twin: never animate (see prop doc)
      if (typeof window === "undefined") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const root = rootRef.current;
      if (!root) return;

      const packet = root.querySelector<SVGCircleElement>("[data-packet]");
      const rail = root.querySelector<SVGPathElement>("[data-rail]");

      if (!broken) {
        // REGION ignition — pipeline order (eval → trace → guardrail), the
        // region's stars swell up from dim, 0.35s apart, once on mount.
        const igni = gsap.timeline();
        [0, 1, 2].forEach((zi) => {
          const stars = root.querySelectorAll<SVGGElement>(
            `[data-zone="${zi}"]`,
          );
          if (!stars.length) return;
          igni.fromTo(
            stars,
            { opacity: 0.28 },
            { opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.012 },
            zi * 0.35,
          );
        });
      }

      // The looping pulse packet: rides the centroid rail left→right; broken
      // → dies at the fracture with a scatter burst; healthy → survives,
      // brightening each ignition region as it passes.
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
            { opacity: 0.85, attr: { cx: g.fract.x, cy: g.fract.y } },
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
        // SURVIVE: brighten each region's stars as the packet passes.
        g.zoneFracs.forEach((frac, zi) => {
          const stars = root.querySelectorAll<SVGGElement>(
            `[data-zone="${zi}"]`,
          );
          if (!stars.length) return;
          tl.fromTo(
            stars,
            { opacity: 0.8 },
            {
              opacity: 1,
              duration: 0.18,
              yoyo: true,
              repeat: 1,
              ease: "power2.out",
            },
            frac * travel,
          );
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
        {/* Global left→right ramp shared by every link stroke (userSpaceOnUse
            — per-link bounding boxes would each restart the gradient). Stops
            are the SHARED brand ramp constants: white-cyan → cyan → blue,
            no violet anywhere. */}
        <linearGradient
          id={gradId}
          x1="0"
          y1="0"
          x2={VB_W}
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={COL_BLUE} />
          <stop offset="55%" stopColor={COL_CYAN} />
          <stop offset="100%" stopColor={COL_CORE} />
        </linearGradient>
        {/* FILLED star glow for the node cores + the pulse packet — a solid
            radial fill that peaks at r = 0, never a rim: this is the SVG
            counterpart of the WebGL star core, and the reason no hollow
            circle survives anywhere in this twin. */}
        <radialGradient id={`${gradId}-star`}>
          <stop offset="0%" stopColor={COL_CORE} stopOpacity="0.95" />
          <stop offset="35%" stopColor={COL_CYAN} stopOpacity="0.45" />
          <stop offset="100%" stopColor={COL_CYAN} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* LINKS — the near-neighbour triangulation. Glow = a wide translucent
          UNDERLAY stroke beneath the crisp core stroke (filter-free bloom). */}
      <g fill="none" strokeLinecap="round">
        {g.edges.map(
          (e, i) =>
            e.solid && (
              <path
                key={`edge-under-${i}`}
                d={e.solid}
                stroke={`url(#${gradId})`}
                strokeWidth={3}
                strokeOpacity={0.1}
              />
            ),
        )}
        {g.edges.map(
          (e, i) =>
            e.solid && (
              <path
                key={`edge-${i}`}
                data-strand-core
                data-base-w={0.9}
                data-base-o={0.5}
                d={e.solid}
                stroke={`url(#${gradId})`}
                strokeWidth={0.9}
                strokeOpacity={0.5}
              />
            ),
        )}
        {/* Frayed tails: dashed, ember-dim — the degraded half of the cloud. */}
        {g.edges.map(
          (e, i) =>
            e.fray && (
              <path
                key={`fray-${i}`}
                d={e.fray}
                stroke={COL_EMBER2}
                strokeWidth={0.9}
                strokeOpacity={0.5}
                strokeDasharray="3 7"
              />
            ),
        )}
        {/* The pulse packet's invisible rail (x-slice centroid spine). */}
        <path data-rail d={g.rail} stroke="none" />
      </g>

      {/* STARS — filled glow + solid core (+ a 4-ray flare cross on the
          brighter third). Size and opacity ride the node's depth, which is
          the twin's depth cue. Degraded stars (broken, past the fracture) sit
          drifted and ember-dim. */}
      <g>
        {g.nodes.map((n, i) =>
          n.degraded ? (
            <circle
              key={`node-${i}`}
              cx={n.x}
              cy={n.y}
              r={lerp(1.4, 2.4, n.depth)}
              fill={COL_EMBER2}
              opacity={0.55}
            />
          ) : (
            <g key={`node-${i}`} data-zone={n.zone}>
              <circle
                cx={n.x}
                cy={n.y}
                r={lerp(STAR_GLOW_R[0], STAR_GLOW_R[1], n.depth)}
                fill={`url(#${gradId}-star)`}
              />
              {n.flare && (
                <path
                  d={`M ${n.x - lerp(STAR_RAY[0], STAR_RAY[1], n.depth)} ${n.y} H ${n.x + lerp(STAR_RAY[0], STAR_RAY[1], n.depth)} M ${n.x} ${n.y - lerp(STAR_RAY[0], STAR_RAY[1], n.depth)} V ${n.y + lerp(STAR_RAY[0], STAR_RAY[1], n.depth)}`}
                  stroke={COL_CORE}
                  strokeWidth={0.8}
                  strokeOpacity={0.4}
                  strokeLinecap="round"
                  fill="none"
                />
              )}
              <circle
                cx={n.x}
                cy={n.y}
                r={lerp(STAR_CORE_R[0], STAR_CORE_R[1], n.depth)}
                fill={COL_CORE}
                opacity={lerp(0.7, 1, n.depth)}
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
              r={2}
              fill={COL_EMBER2}
              opacity={rest ? 0.5 : 0}
            />
          ))}
        </g>
      )}

      {/* The travelling pulse packet (hidden at rest / reduced motion).
          The glow is baked into the radial-gradient fill — no filter. */}
      <circle
        data-packet
        r={7}
        cx={0}
        cy={MID_Y}
        fill={`url(#${gradId}-star)`}
        opacity={0}
      />
    </svg>
  );
}
