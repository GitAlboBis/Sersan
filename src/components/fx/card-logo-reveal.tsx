"use client";

/**
 * CardLogoReveal — hover-reveal BRAND MARK for case-study cards that ship no
 * product screenshot. Same hover contract as CardImageDistort: at rest a clean
 * text card; on hover the text fades (.card-has-distort) and the brand mark
 * fades in, CONTAINED (never cropped).
 *
 * The mark is the real, FULL-COLOUR logo SVG (so Accenture keeps its purple
 * chevron, Leonardo its red, Quantex its green, WHO its blue, …) rendered as an
 * <img> on top. Behind it sit two offset, mask-tinted silhouettes of the same
 * logo — cyan + violet, screen-blended — giving a visible chromatic-aberration
 * glitch fringe without touching the logo's own colours. (Dark/black monochrome
 * marks are shipped as light SVGs so they read on the navy card.) The colour
 * layers are SIBLINGS of the <img>, not nested under a mask, so their offset
 * isn't clipped. pointer-events:none throughout.
 */
interface CardLogoRevealProps {
  /** Public path of the brand logo SVG, e.g. /case-studies/logos/leonardo.svg */
  src: string;
}

export function CardLogoReveal({ src }: CardLogoRevealProps) {
  return (
    <div
      aria-hidden="true"
      className="card-logo-reveal pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      style={{ ["--card-logo"]: `url("${src}")` } as React.CSSProperties}
    >
      {/* Cyan + violet offset silhouettes behind → chromatic glitch fringe. */}
      <span className="card-logo-reveal__layer card-logo-reveal__cyan" />
      <span className="card-logo-reveal__layer card-logo-reveal__violet" />
      {/* The real, full-colour logo on top. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="card-logo-reveal__img" src={src} alt="" draggable={false} />
    </div>
  );
}

export default CardLogoReveal;
