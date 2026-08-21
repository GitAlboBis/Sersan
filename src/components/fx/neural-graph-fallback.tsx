"use client";

/**
 * NeuralGraphFallback — the DOM/SVG twin of the SIGNAL STREAM WebGL island
 * (2026-08-21 refactor; export/file name kept so the fallback slot wiring in
 * the two sections stays put).
 *
 * One thick braided stream — four parallel offset paths flowing left→right
 * with a slow sine braid — filling the section's field band:
 *
 *   variant "broken"  → the Problem section. The strands run laminar until
 *     the FRACTURE (~55% of the width), then fray: short dashed diverging
 *     tails + scattered ember dots drifting off. A surge packet rides the
 *     stream and DIES at the fracture (small dot burst), looping every ~4s.
 *   variant "healthy" → the ProductionGrade section. Full-length strands
 *     threaded through THREE GUIDE RING outlines (at 40/62/84% — mirrors
 *     RING_T in webgl/neural/neuralLatticeConfig.ts; change together). The
 *     rings IGNITE in pipeline order on mount via stroke-dashoffset draws,
 *     and a surge packet rides the whole stream every ~6s, pulsing each ring
 *     as it passes — the packet that survives.
 *
 * Renders when the WebGL island is ABSENT (use-neural-lattice-fallback.ts:
 * classic flag-OFF, lite/off tiers, reduced-motion). Decorative only:
 * aria-hidden — the real copy lives in the sections' glass panes.
 *
 * Reduced-motion: the resting FINAL state — strands drawn, rings fully lit,
 * fray + scatter shown statically. No packets, no timers.
 *
 * No new dependency (GSAP + MotionPathPlugin already bundled).
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";

if (typeof window !== "undefined") {
  gsap.registerPlugin(MotionPathPlugin);
}

type Variant = "broken" | "healthy";

// --- Geometry (viewBox space; preserveAspectRatio="none" stretches to the
// band, so shapes are authored forgiving) -----------------------------------
const VB_W = 1000;
const VB_H = 400;
const MID_Y = VB_H / 2;

/** Fracture x (≈ FRACTURE_T of the width — mirrors the WebGL uFracture). */
const FRACTURE_X = 550;
/** Ring centers (≈ RING_T of the width — mirrors the WebGL RING_T). */
const RING_X = [400, 620, 840] as const;

/** Center meander of the stream (gentle, mirrors STREAM_CTRL's amplitudes). */
function centerY(x: number): number {
  const t = x / VB_W;
  return (
    MID_Y +
    Math.sin(t * Math.PI * 2 * 1.1 + 0.6) * 18 +
    Math.sin(t * Math.PI * 2 * 0.5 - 0.3) * 10
  );
}

const STRAND_BASE = [-13, -4.5, 4.5, 13] as const;
const BRAID_TURNS = 2.6;

/** Strand y at x — base offset modulated by the braid twist. */
function strandY(x: number, s: number): number {
  const t = x / VB_W;
  const braid =
    0.62 + 0.38 * Math.sin(t * Math.PI * 2 * BRAID_TURNS + s * 1.7);
  return centerY(x) + STRAND_BASE[s] * braid;
}

/** Sampled polyline path for strand s over [x0, x1]. */
function strandPath(s: number, x0: number, x1: number): string {
  const STEP = 25;
  let d = `M ${x0} ${strandY(x0, s).toFixed(1)}`;
  for (let x = x0 + STEP; x <= x1; x += STEP) {
    d += ` L ${x} ${strandY(x, s).toFixed(1)}`;
  }
  if ((x1 - x0) % STEP !== 0) d += ` L ${x1} ${strandY(x1, s).toFixed(1)}`;
  return d;
}

/** Center path (the surge packet's motionPath rail). */
function centerPath(x0: number, x1: number): string {
  const STEP = 25;
  let d = `M ${x0} ${centerY(x0).toFixed(1)}`;
  for (let x = x0 + STEP; x <= x1; x += STEP) {
    d += ` L ${x} ${centerY(x).toFixed(1)}`;
  }
  return d;
}

/** Broken fray tails: each strand continues past the fracture as a short
 * diverging dashed tail. */
function frayPath(s: number): string {
  const y0 = strandY(FRACTURE_X, s);
  const spread = (s - 1.5) * 34; // diverge away from the center line
  const x1 = FRACTURE_X + 60;
  const x2 = FRACTURE_X + 130;
  return `M ${FRACTURE_X} ${y0.toFixed(1)} Q ${x1} ${(y0 + spread * 0.4).toFixed(1)} ${x2} ${(y0 + spread).toFixed(1)}`;
}

/** Scatter dots dispersing from the fracture (deterministic fan). */
const SCATTER = Array.from({ length: 9 }, (_, k) => {
  const ang = ((-55 + k * 14) * Math.PI) / 180;
  const dist = 46 + (k % 3) * 30;
  return {
    tx: Math.round(FRACTURE_X + 30 + Math.cos(ang) * dist),
    ty: Math.round(centerY(FRACTURE_X) + Math.sin(ang) * dist),
  };
});
const SCATTER_ORIGIN = {
  x: FRACTURE_X,
  y: Math.round(centerY(FRACTURE_X)),
};

export function NeuralGraphFallback({
  variant,
  className,
}: {
  variant: Variant;
  className?: string;
}) {
  const broken = variant === "broken";
  const rootRef = useRef<SVGSVGElement>(null);
  const gradId = `stream-grad-${variant}`;
  // Reduced-motion: render the resting final frame (rings lit, scatter shown).
  const [rest, setRest] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    setRest(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const strandEnd = broken ? FRACTURE_X : VB_W;
  const strandDs = [0, 1, 2, 3].map((s) => strandPath(s, 0, strandEnd));
  const railD = centerPath(0, broken ? FRACTURE_X : VB_W);

  // Round-3 row-reactive echo (the TRIVIAL mapping only — spec §B.5): the
  // ledger rows write setHovered on every tier, so when the WebGL island is
  // absent this twin answers attention with a whole-stream stroke-width /
  // opacity bump on the core strands. A LOCALIZED zone glow does NOT map
  // trivially onto full-length gradient strokes (path splitting or filters —
  // both banned here), so the echo is global by design. RM: static, no tween.
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
        // Ring ignition — pipeline order (eval → trace → guardrail), a
        // stroke-dashoffset draw per ring, 0.35s apart, once on mount.
        const rings = Array.from(
          root.querySelectorAll<SVGEllipseElement>("[data-ring]"),
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

      // The looping surge packet: rides the stream; broken → dies at the
      // fracture with a scatter burst; healthy → survives, pulsing each ring.
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
              attr: { cx: SCATTER_ORIGIN.x, cy: SCATTER_ORIGIN.y },
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
        // SURVIVE: pulse each ring as the packet passes it, fade out at the end.
        const rings = Array.from(
          root.querySelectorAll<SVGEllipseElement>("[data-ring]"),
        );
        RING_X.forEach((rx, i) => {
          const at = (rx / VB_W) * travel;
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
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--accent-2))" />
        </linearGradient>
        {/* Strand-only twin with EDGE FADES (round-2 restyle, mirrors the
            WebGL flow-t edge fades): soft entry always; soft exit only on
            healthy — the broken stream must END CLEAN at the fracture. Rings
            keep the crisp un-faded gradient above. */}
        <linearGradient id={`${gradId}-stream`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0" />
          <stop offset="7%" stopColor="hsl(var(--accent))" stopOpacity="1" />
          {broken ? (
            <stop
              offset="100%"
              stopColor="hsl(var(--accent-2))"
              stopOpacity="1"
            />
          ) : (
            <>
              <stop
                offset="93%"
                stopColor="hsl(var(--accent-2))"
                stopOpacity="1"
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--accent-2))"
                stopOpacity="0"
              />
            </>
          )}
        </linearGradient>
        {/* Soft radial halo for the surge packet — the glow is a gradient
            FILL, not a filter: this fallback runs precisely on the weak /
            reduced tiers where an animated feGaussianBlur would hurt most
            (no SVG filters anywhere in the twin — spec). */}
        <radialGradient id={`${gradId}-halo`}>
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="1" />
          <stop offset="45%" stopColor="hsl(var(--accent))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* The braided strands. Glow = a wide translucent UNDERLAY stroke per
          strand beneath the crisp core stroke (filter-free bloom). Round-2:
          thinner filaments + the edge-faded stream gradient — the SVG twin of
          the WebGL "legible river" pass. */}
      <g fill="none" strokeLinecap="round">
        {strandDs.map((d, s) => (
          <path
            key={`strand-under-${s}`}
            d={d}
            stroke={`url(#${gradId}-stream)`}
            strokeWidth={s === 1 || s === 2 ? 5 : 4}
            strokeOpacity={s === 1 || s === 2 ? 0.16 : 0.1}
          />
        ))}
        {strandDs.map((d, s) => (
          <path
            key={`strand-${s}`}
            data-strand-core
            data-base-w={s === 1 || s === 2 ? 1.7 : 1.2}
            data-base-o={s === 1 || s === 2 ? 0.8 : 0.55}
            d={d}
            stroke={`url(#${gradId}-stream)`}
            strokeWidth={s === 1 || s === 2 ? 1.7 : 1.2}
            strokeOpacity={s === 1 || s === 2 ? 0.8 : 0.55}
          />
        ))}
        {/* The surge packet's invisible rail (also the fracture-side spine). */}
        <path data-rail d={railD} stroke="none" />
      </g>

      {broken ? (
        <>
          {/* Fray: dashed diverging tails past the fracture. */}
          <g fill="none" strokeLinecap="round">
            {[0, 1, 2, 3].map((s) => (
              <path
                key={`fray-${s}`}
                d={frayPath(s)}
                stroke="hsl(var(--ink-dim))"
                strokeWidth={1.4}
                strokeOpacity={0.45}
                strokeDasharray="3 7"
              />
            ))}
          </g>
          {/* Scattered ember debris. Under reduced motion (rest) the dots sit
              statically at their dispersed targets so the fracture reads with
              no animation at all. */}
          <g>
            {SCATTER.map((p, k) => (
              <circle
                key={`scatter-${k}`}
                data-scatter={k}
                cx={rest ? p.tx : SCATTER_ORIGIN.x}
                cy={rest ? p.ty : SCATTER_ORIGIN.y}
                r={2.2}
                fill="hsl(var(--ink-dim))"
                opacity={rest ? 0.5 : 0}
              />
            ))}
          </g>
        </>
      ) : (
        // The three guide rings — narrow ellipses (perpendicular to the flow),
        // drawn by the ignition timeline (reduced motion: fully lit at rest).
        // Filter-free: the gradient stroke alone carries the glow read.
        <g fill="none">
          {RING_X.map((rx, i) => (
            <ellipse
              key={`ring-${i}`}
              data-ring={i}
              cx={rx}
              cy={centerY(rx)}
              rx={13}
              ry={52}
              stroke={`url(#${gradId})`}
              strokeWidth={2.4}
              strokeOpacity={0.85}
            />
          ))}
        </g>
      )}

      {/* The travelling surge packet (hidden at rest / reduced motion).
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
