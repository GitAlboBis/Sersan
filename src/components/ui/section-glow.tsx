import { cn } from "@/lib/utils";

/**
 * SectionGlow — anchored brand-blue ambient glow behind a section.
 *
 * v2: rebuilt for actual visibility. v1's 6% blur was below the noise
 * floor of a dark page on most monitors. v2 stacks a sharp inner core
 * (~18% intensity, light blur) inside a soft outer wash (~6% intensity,
 * heavy blur) so the eye reads a real coloured light source, not just
 * a hint.
 *
 * Usage:
 *   <section className="relative overflow-hidden ...">
 *     <SectionGlow position="top-right" intensity={1} />
 *     <div className="container-px relative">...</div>
 *   </section>
 *
 * Notes:
 *   - Parent section needs `position: relative` and ideally `overflow-hidden`.
 *   - Content above the glow needs its own `relative` so it sits on top.
 *   - `intensity` is a multiplier (1.0 = default). Bump for hero-adjacent
 *     sections; drop for sections that already have a lot of visual weight.
 *   - Static. No animation. Atmosphere, not distraction.
 */

type Position =
  | "top-left"
  | "top-right"
  | "top-center"
  | "center-left"
  | "center-right"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center";

const POSITION_STYLES: Record<Position, React.CSSProperties> = {
  "top-left":      { top: "-25%", left: "-15%" },
  "top-right":     { top: "-25%", right: "-15%" },
  "top-center":    { top: "-30%", left: "50%", transform: "translateX(-50%)" },
  "center-left":   { top: "25%",  left: "-20%" },
  "center-right":  { top: "25%",  right: "-20%" },
  "bottom-left":   { bottom: "-25%", left: "-15%" },
  "bottom-right":  { bottom: "-25%", right: "-15%" },
  "bottom-center": { bottom: "-30%", left: "50%", transform: "translateX(-50%)" },
};

interface SectionGlowProps {
  position?: Position;
  /** Multiplier on the default intensities. Default 1. */
  intensity?: number;
  /** Outer glow diameter. */
  size?: string;
  /** Tint. Default is the brand --accent (electric blue). */
  hue?: "accent" | "warm" | "cool";
  className?: string;
}

const HUE_VAR: Record<NonNullable<SectionGlowProps["hue"]>, string> = {
  accent: "var(--accent)",       // electric blue
  warm:   "32 90% 60%",          // amber — use sparingly for "operate" cues
  cool:   "190 80% 60%",         // cyan — use sparingly for "audit" cues
};

export function SectionGlow({
  position = "top-right",
  intensity = 1,
  size = "60rem",
  hue = "accent",
  className,
}: SectionGlowProps) {
  const hueVar = HUE_VAR[hue];

  // v3 — earlier intensities (7% outer, 18% inner) were still ghosting
  // through. Bumped to genuinely visible levels: the outer wash sits at
  // 12% and the sharp inner core at 28%. The blue should now register
  // as "this section has a coloured light source", not "is there a glow?"
  const innerSize = `calc(${size} * 0.45)`;
  const innerIntensity = 0.42 * intensity;
  const outerIntensity = 0.20 * intensity;

  const base: React.CSSProperties = {
    ...POSITION_STYLES[position],
    width: size,
    height: size,
  };

  return (
    <>
      {/* Outer wash */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -z-0 select-none",
          className,
        )}
        style={{
          ...base,
          background: `radial-gradient(closest-side, hsl(${hueVar} / ${outerIntensity}) 0%, hsl(${hueVar} / ${outerIntensity * 0.35}) 40%, transparent 75%)`,
          filter: "blur(40px)",
        }}
      />
      {/* Sharper inner core (offset slightly toward the same anchor so the
          two layers compound rather than smear). */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -z-0 select-none",
          className,
        )}
        style={{
          ...POSITION_STYLES[position],
          width: innerSize,
          height: innerSize,
          background: `radial-gradient(closest-side, hsl(${hueVar} / ${innerIntensity}) 0%, hsl(${hueVar} / ${innerIntensity * 0.4}) 35%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
    </>
  );
}
