import Link from "next/link";

/**
 * SersanLogo — symbol-only mark: the pointy-top hexagon split by an S-shaped
 * channel into two interlocking halves.
 *
 * Server component. Pure SVG, no hooks. Wraps in a `next/link` to "/" by default.
 *
 * THE GEOMETRY IS THE SOURCE OF TRUTH FOR THE WHOLE SITE. The three paths below
 * are exported and reused by the preloader (fx/preloader.tsx — the halves shear
 * apart and lock), the archive portal (fx/see-more-portal.tsx — rasterised into
 * particle targets), public/favicon.svg and the 3D mark
 * (public/models/sersan-mark.glb, extruded from the SAME outline — see
 * design/logo-mark/). They were fitted to the brand reference rather than traced
 * by eye: every edge is vertical or ±30°, and the LOWER half is the UPPER half
 * rotated 180° about the centre, so the mark sits exactly on a hexagonal grid.
 *
 * Colour on the dark site is the reference's two-tone, translated: the brand
 * draws a near-black half against white, so on the navy sheet that half becomes
 * INK (off-white) and the blue half stays blue. Same contrast, same reading.
 */

interface SersanLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Optional href — defaults to "/". Pass `null` to render without a link. */
  href?: string | null;
}

const sizes: Record<NonNullable<SersanLogoProps["size"]>, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11 sm:h-12 sm:w-12",
  lg: "h-16 w-16",
};

/** Mark viewBox — 200 tall (unchanged from the old mark), 162.38 wide. */
export const MARK_W = 162.38;
export const MARK_H = 200;
export const MARK_VIEWBOX = `0 0 ${MARK_W} ${MARK_H}`;

/** UPPER half — the hexagon's top + left, hooking right across the middle. */
export const MARK_UPPER_PATH = `M 81.19 0 L 162.38 46.88 L 127.3 67.13 L 81.19 40.51 L 39.64 64.49 L 39.64 90.03 L 80.11 113.4 L 40.6 136.21 L 0 112.78 L 0 46.88 Z`;

/** LOWER half — MARK_UPPER_PATH rotated 180° about the mark's centre. */
export const MARK_LOWER_PATH = `M 81.19 200 L 0 153.13 L 35.08 132.87 L 81.19 159.49 L 122.73 135.51 L 122.73 109.97 L 82.27 86.6 L 121.78 63.79 L 162.38 87.22 L 162.38 153.13 Z`;

/**
 * The SEAM — the S-shaped channel BETWEEN the two halves, as a filled polygon:
 * the upper half's inner chain, down the left edge, the lower half's inner
 * chain, up the right edge. It is the mark's negative space made positive, and
 * the preloader lights it as the two halves lock together.
 */
export const MARK_SEAM_PATH = `M 162.38 46.88 L 127.3 67.13 L 81.19 40.51 L 39.64 64.49 L 39.64 90.03 L 80.11 113.4 L 40.6 136.21 L 0 112.78 L 0 153.13 L 35.08 132.87 L 81.19 159.49 L 122.73 135.51 L 122.73 109.97 L 82.27 86.6 L 121.78 63.79 L 162.38 87.22 Z`;

/**
 * The direction the two halves separate along, as a unit vector in SVG space
 * (y down): the UPPER half travels `-SPLIT_AXIS`, the LOWER half `+SPLIT_AXIS`.
 *
 * This is not an arbitrary diagonal. It is the mark's own −30° grid direction,
 * the one where the channel's diagonal walls stay PARALLEL to the motion: those
 * faces slide across each other at constant clearance while the remaining walls
 * open. The halves therefore disengage like two milled parts leaving a dovetail
 * — which is why the split reads as mechanism rather than as a cut.
 */
export const SPLIT_AXIS = { x: Math.sqrt(3) / 2, y: 0.5 };

export function SymbolMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="SERSAN"
      className={className}
    >
      <path d={MARK_UPPER_PATH} fill="hsl(var(--ink))" />
      <path d={MARK_LOWER_PATH} fill="hsl(var(--accent-2))" />
    </svg>
  );
}

export function SersanLogo({
  className = "",
  size = "md",
  href = "/",
}: SersanLogoProps) {
  const sizeClass = sizes[size];

  const mark = (
    <span
      className={`relative inline-block ${sizeClass} transition-transform duration-500 group-hover:scale-[1.06]`}
      style={{ aspectRatio: `${MARK_W} / ${MARK_H}` }}
    >
      <SymbolMark
        className={`absolute inset-0 w-full h-full drop-shadow-[0_0_12px_hsl(var(--accent-2)/0.18)] group-hover:drop-shadow-[0_0_22px_hsl(var(--accent)/0.45)] transition-[filter] duration-500 ${className}`}
      />
    </span>
  );

  if (href === null) {
    return mark;
  }

  return (
    <Link
      href={href}
      className="group inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))] rounded-lg"
      aria-label="Go to SERSAN homepage"
    >
      {mark}
    </Link>
  );
}

export default SersanLogo;
