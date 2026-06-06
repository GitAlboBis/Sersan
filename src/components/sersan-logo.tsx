import Link from "next/link";

/**
 * SersanLogo — symbol-only mark: two stencil S letters flanking a brass divider.
 *
 * Server component. Pure SVG, no hooks. Wraps in a `next/link` to "/" by default.
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

const LEFT_S_PATH = `
  M 12 0 L 120 0 L 120 200 L 12 200 L 0 188 L 0 12 Z
  M 24 24 L 120 24 L 120 88 L 24 88 Z
  M 0 112 L 96 112 L 96 176 L 0 176 Z
`;

function SymbolMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 264 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="SERSAN"
      className={className}
    >
      <path d={LEFT_S_PATH} fill="hsl(var(--ink))" fillRule="evenodd" />
      <rect x="130" y="0" width="4" height="200" fill="hsl(var(--accent-warm))" />
      <g transform="translate(264 0) scale(-1 1)">
        <path d={LEFT_S_PATH} fill="hsl(var(--ink))" fillRule="evenodd" />
      </g>
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
      style={{ aspectRatio: "264 / 200" }}
    >
      <SymbolMark
        className={`absolute inset-0 w-full h-full drop-shadow-[0_0_12px_hsl(var(--accent-warm)/0.15)] group-hover:drop-shadow-[0_0_22px_hsl(var(--accent-warm)/0.45)] transition-[filter] duration-500 ${className}`}
      />
    </span>
  );

  if (href === null) {
    return mark;
  }

  return (
    <Link
      href={href}
      className="group inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-warm))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))] rounded-lg"
      aria-label="Go to SERSAN homepage"
    >
      {mark}
    </Link>
  );
}

export default SersanLogo;
