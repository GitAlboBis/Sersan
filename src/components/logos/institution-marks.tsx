/**
 * InstitutionMarks — crafted duotone lockups for the five tier-1
 * institutions staged by the credibility reel (home passage).
 *
 * Recovered design DNA: the orphaned trust-wordmarks.tsx (now deleted)
 * established the principle — approximate each brand's typographic
 * treatment without misrepresenting the marks. Its font stack (IBM Plex
 * Sans / Instrument Serif) is no longer loaded, so every treatment is
 * re-set on the LOADED brand stack: Switzer 300–600 + Fraunces (true
 * italics) + JetBrains Mono. Real SVG geometry is inlined where a public
 * asset exists (public/case-studies/logos/*.svg), normalised to
 * currentColor so the marks tint with the ink context.
 *
 * API — every mark takes { variant, className }:
 *   variant "fore" (default)  the foreground lockup: role="img" +
 *                             aria-label, em-scaled (the consumer sets
 *                             font-size; SVG heights are optical em
 *                             multipliers so the five read as siblings).
 *   variant "back"            the giant sub-luminous backplate silhouette:
 *                             aria-hidden, single currentColor fill, SVGs
 *                             fill their container height (height:100%),
 *                             type marks inherit the container font-size.
 *
 * Animation hooks (fore only — the reel's ignition actors):
 *   [data-mark-dot]        Deloitte's trademark dot (cyan→blue gradient,
 *                          scale 0→1 back.out on ignition)
 *   [data-mark-underline]  Brevan Howard's 1px gradient underline
 *                          (scaleX 0→1 on ignition)
 * The rest poses (scale 0 / scaleX 0) are applied ONLY by the reel's
 * armed JS path — the components render fully visible, so the static
 * mobile/reduced-motion column needs zero JS. Never distort SVG <text>
 * geometry (no textLength) — all type here is live DOM text, fonts-gated
 * upstream by the reel's document.fonts.ready refresh.
 */

import { useId } from "react";

export type MarkVariant = "fore" | "back";

export interface MarkProps {
  variant?: MarkVariant;
  className?: string;
}

const SANS = "var(--font-switzer), system-ui, sans-serif";
const SERIF = "var(--font-fraunces), Georgia, serif";

/* Revolut R-symbol — public/case-studies/logos/revolut.svg, fill normalised
   to currentColor. */
const REVOLUT_PATH =
  "M20.9133 6.9566C20.9133 3.1208 17.7898 0 13.9503 0H2.424v3.8605h10.9782c1.7376 0 3.177 1.3651 3.2087 3.043.016.84-.2994 1.633-.8878 2.2324-.5886.5998-1.375.9303-2.2144.9303H9.2322a.2756.2756 0 0 0-.2755.2752v3.431c0 .0585.018.1142.052.1612L16.2646 24h5.3114l-7.2727-10.094c3.6625-.1838 6.61-3.2612 6.61-6.9494zM6.8943 5.9229H2.424V24h4.4704z";

export function RevolutMark({ variant = "fore", className }: MarkProps) {
  if (variant === "back") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        className={className}
        style={{ height: "100%", width: "auto", display: "block" }}
      >
        <path d={REVOLUT_PATH} fill="currentColor" />
      </svg>
    );
  }
  return (
    <span
      role="img"
      aria-label="Revolut"
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.6em",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        style={{ height: "1.5em", width: "auto", display: "block" }}
      >
        <path d={REVOLUT_PATH} fill="currentColor" />
      </svg>
      <span
        style={{
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: "1em",
          letterSpacing: "-0.025em",
        }}
      >
        Revolut
      </span>
    </span>
  );
}

/* J.P. Morgan wordmark — public/case-studies/logos/jp-morgan.svg (Inkscape
   export), Inkscape/RDF cruft stripped, every per-path style fill
   normalised to a single currentColor on the outer group. The layer
   translate + per-glyph matrices are the original geometry, kept verbatim. */
const JPM_VIEWBOX = "0 0 233.89107 48.087055";
const JPM_LAYER_TRANSFORM = "translate(-285.0204,-417.26102)";
const JPM_GLYPHS: ReadonlyArray<{ t: string; d: string }> = [
  {
    t: "matrix(2.9672381,0,0,-2.9672381,308.86216,417.26161)",
    d: "m 0,0 -4.686,0 0,-0.4 1.493,0 0,-7.776 c 0,-2.334 -0.647,-2.992 -2.091,-2.992 -0.91,0 -1.058,0.689 -1.058,1.049 0,0.848 -0.049,1.37 -0.824,1.37 -0.777,0 -0.869,-0.786 -0.869,-1.029 0,-1.07 0.828,-1.89 2.957,-1.89 2.533,0 3.537,0.857 3.537,3.701 l 0,7.571 L 0,-0.4 0,0",
  },
  {
    t: "matrix(2.9672381,0,0,-2.9672381,309.79802,446.52243)",
    d: "m 0,0 c -0.259,0 -0.476,-0.084 -0.65,-0.264 -0.182,-0.178 -0.272,-0.391 -0.272,-0.653 0,-0.257 0.09,-0.466 0.272,-0.638 0.182,-0.182 0.399,-0.265 0.65,-0.265 0.259,0 0.475,0.083 0.661,0.265 0.177,0.172 0.266,0.381 0.266,0.638 0,0.262 -0.089,0.476 -0.266,0.653 C 0.479,-0.084 0.267,0 0,0",
  },
  {
    t: "matrix(2.9672381,0,0,-2.9672381,339.59503,446.52243)",
    d: "m 0,0 c -0.258,0 -0.475,-0.084 -0.652,-0.264 -0.18,-0.178 -0.266,-0.391 -0.266,-0.653 0,-0.257 0.086,-0.466 0.266,-0.638 0.187,-0.182 0.398,-0.265 0.652,-0.265 0.258,0 0.478,0.083 0.662,0.265 0.182,0.172 0.268,0.381 0.268,0.638 0,0.262 -0.086,0.476 -0.268,0.653 C 0.48,-0.084 0.26,0 0,0",
  },
  {
    t: "matrix(2.9672381,0,0,-2.9672381,330.95412,417.26161)",
    d: "m 0,0 -4.589,0 0,-0.4 1.347,0 0,-8.87 c 0,-0.696 -0.04,-0.726 -0.117,-0.931 -0.086,-0.226 -0.273,-0.403 -0.553,-0.518 -0.207,-0.088 -0.521,-0.135 -0.94,-0.148 l 0,-0.511 4.938,0 0,0.511 c -0.419,0.013 -0.738,0.06 -0.948,0.134 -0.294,0.118 -0.485,0.286 -0.577,0.52 -0.082,0.197 -0.127,0.374 -0.127,0.725 l 0,2.888 1.224,0.007 c 3.548,0 4.545,1.398 4.545,3.308 C 4.203,-1.353 3.593,0 0,0 m -0.626,-6.16 -0.94,0 0,5.71 0.851,0.011 c 2.736,0 3.336,-1.125 3.336,-2.951 0,-1.834 -1.078,-2.77 -3.247,-2.77",
  },
  {
    t: "matrix(2.9672381,0,0,-2.9672381,385.31483,447.44377)",
    d: "m 0,0 c -0.064,0.206 -0.096,0.455 -0.096,0.775 l 0,8.996 1.188,0 0,0.401 -2.895,0 C -1.844,10.067 -5.297,1.477 -5.297,1.477 -5.313,1.445 -5.344,1.426 -5.375,1.426 c -0.039,0 -0.068,0.019 -0.084,0.051 0,0 -3.672,8.59 -3.715,8.695 l -3.219,0 0,-0.402 1.334,0 0,-8.645 c 0,0 -0.031,-0.804 -0.031,-0.805 -0.021,-0.212 -0.088,-0.4 -0.191,-0.552 -0.11,-0.163 -0.285,-0.288 -0.516,-0.37 -0.154,-0.047 -0.381,-0.083 -0.664,-0.087 l 0,-0.517 3.273,0 0,0.511 c -0.273,0.01 -0.388,0.039 -0.55,0.093 -0.235,0.077 -0.412,0.194 -0.528,0.365 -0.105,0.149 -0.172,0.34 -0.195,0.557 0,0 -0.037,0.801 -0.037,0.805 l 0,7.455 0.189,0 c 0,0 4.147,-9.68 4.19,-9.786 l 0.348,0 3.923,9.677 0.102,0 0,-7.696 c 0,-0.337 -0.037,-0.594 -0.102,-0.795 -0.078,-0.235 -0.246,-0.413 -0.488,-0.535 -0.18,-0.079 -0.455,-0.127 -0.816,-0.14 l 0,-0.511 4.476,0 0,0.511 C 0.967,-0.676 0.689,-0.628 0.502,-0.544 0.242,-0.415 0.072,-0.236 0,0",
  },
  {
    t: "matrix(2.9672381,0,0,-2.9672381,403.18204,426.29061)",
    d: "m 0,0 c -2.391,0 -3.889,-1.584 -3.889,-4.353 0,-4.045 3.157,-4.319 3.834,-4.319 1.348,0 3.903,0.843 3.903,4.398 C 3.848,-1.506 2.213,0 0,0 m -0.031,-8.168 c -1.797,0 -2.074,0.897 -2.074,3.772 0,2.222 0.138,3.891 2.074,3.891 2.09,0 2.097,-1.725 2.097,-3.752 0,-2.908 -0.496,-3.911 -2.097,-3.911",
  },
  {
    t: "matrix(2.9672381,0,0,-2.9672381,433.1384,426.66151)",
    d: "m 0,0 c -1.43,0 -1.922,-0.843 -2.314,-1.704 0,0 -0.104,0.011 -0.112,0.004 -0.012,-0.004 -0.287,1.632 -0.287,1.632 l -2.711,0 0,-0.43 1.492,0 0,-1.73 0,-3.874 c 0,-0.553 -0.027,-0.99 -0.172,-1.221 -0.166,-0.27 -0.507,-0.376 -1.076,-0.376 l -0.244,0 0,-0.511 4.637,0 0,0.511 -0.252,0 c -0.607,0 -0.92,0.134 -1.082,0.396 -0.147,0.234 -0.211,0.628 -0.211,1.201 l 0,2.902 c 0,0.984 0.787,2.104 1.676,2.104 0.929,0 0.959,-1.334 1.957,-0.854 C 2.012,-1.609 1.854,0 0,0",
  },
  {
    t: "matrix(2.9672381,0,0,-2.9672381,487.90768,448.56241)",
    d: "m 0,0 c -0.494,0 -0.654,0.276 -0.687,0.739 l -0.031,1.036 0,3.413 c 0,0.734 -0.121,1.227 -0.552,1.662 -0.425,0.432 -1.253,0.656 -2.445,0.656 -1.15,0 -2.002,-0.213 -2.542,-0.629 C -6.789,6.476 -6.99,6.102 -6.99,5.571 c 0,-0.248 0.063,-0.424 0.201,-0.54 0.143,-0.123 0.305,-0.18 0.507,-0.18 0.46,0 0.715,0.232 0.811,0.837 0.074,0.453 0.171,0.708 0.397,0.942 0.232,0.247 0.602,0.371 1.102,0.371 0.582,0 0.994,-0.155 1.222,-0.469 0.215,-0.294 0.323,-0.693 0.323,-1.187 l 0,-1.364 C -3.91,3.846 -7.416,3.566 -7.26,0.894 c 0.063,-1.044 0.981,-1.959 2.17,-1.959 1.317,0 2.147,0.747 2.715,1.344 0.09,-0.563 0.616,-1.245 1.576,-1.245 1.081,0 1.726,0.528 1.798,1.851 l -0.279,0 C 0.649,0.312 0.296,0 0,0 m -2.427,0.862 c 0,-0.03 -0.003,-0.048 -0.029,-0.067 l -0.03,-0.03 c -0.796,-0.719 -1.404,-0.977 -1.846,-0.977 -1.139,0 -1.307,0.949 -1.307,1.418 0,1.519 2.076,2.273 3.212,2.273 l 0,-2.617",
  },
  {
    t: "matrix(2.9672381,0,0,-2.9672381,516.01248,448.41168)",
    d: "m 0,0 c 0.197,-0.252 0.487,-0.335 0.977,-0.369 l 0,-0.511 -3.859,0 0,0.507 c 0.282,0.023 0.502,0.083 0.643,0.18 0.189,0.129 0.245,0.327 0.293,0.572 0.033,0.215 0.047,0.529 0.047,0.975 l 0,2.661 c 0,0.646 -0.045,1.459 -0.266,1.897 -0.192,0.39 -0.522,0.581 -1.13,0.581 -0.679,0 -1.284,-0.322 -1.617,-0.908 C -5.213,5.049 -5.211,4.183 -5.211,3.283 l 0,-2.15 c 0,-0.553 0.071,-0.932 0.228,-1.152 0.142,-0.206 0.415,-0.316 0.82,-0.345 l 0,-0.516 -4.006,0 0,0.511 c 0.311,0.014 0.544,0.05 0.696,0.117 0.242,0.101 0.402,0.271 0.468,0.52 0.062,0.207 0.099,0.521 0.099,0.955 l 0,5.611 -1.263,0.003 0,0.421 2.526,0.004 0.286,-1.477 0.127,0.003 c 0.322,0.633 1.029,1.57 2.656,1.57 0.454,0 0.867,-0.088 1.223,-0.269 0.354,-0.181 0.637,-0.456 0.842,-0.822 0.2,-0.373 0.264,-0.83 0.264,-1.361 l 0,-3.69 C -0.245,0.8 -0.2,0.256 0,0",
  },
  {
    t: "matrix(2.9672381,0,0,-2.9672381,462.30072,425.31707)",
    d: "m 0,0 c -0.24,-0.076 -0.396,-0.291 -0.486,-0.648 -0.058,-0.331 -0.187,-0.523 -0.352,-0.576 -0.167,-0.049 -0.452,-0.053 -0.576,0.042 -0.417,0.385 -1.213,0.854 -2.615,0.854 -2.257,0 -3.252,-1.609 -3.252,-3.073 0,-1.717 0.661,-2.551 2.112,-2.857 0.09,-0.015 0.09,-0.116 0.011,-0.134 -1.235,-0.247 -2.334,-0.61 -2.334,-1.787 0,-0.708 0.407,-1.095 0.928,-1.309 0.578,-0.235 1.379,-0.356 2.399,-0.377 0.886,-0.008 1.513,-0.039 1.927,-0.086 0.44,-0.051 0.788,-0.179 1.05,-0.368 0.27,-0.202 0.41,-0.507 0.41,-0.908 0,-0.544 -0.295,-0.979 -0.873,-1.304 -0.541,-0.299 -1.278,-0.461 -2.199,-0.461 -0.783,0 -1.427,0.084 -2.011,0.448 -0.431,0.27 -0.515,0.79 -0.425,1.17 0.084,0.382 -0.053,0.784 -0.499,0.86 -0.244,0.04 -0.549,-0.089 -0.694,-0.312 -0.132,-0.206 -0.177,-0.451 -0.177,-0.744 0,-0.967 0.748,-1.422 1.318,-1.588 0.87,-0.264 1.449,-0.333 2.251,-0.333 1.058,0 1.925,0.166 2.539,0.478 0.618,0.31 1.051,0.694 1.279,1.132 0.242,0.441 0.358,0.892 0.358,1.324 0,0.586 -0.131,1.061 -0.377,1.415 -0.806,1.107 -1.95,0.963 -4.523,1.083 -1.241,0 -1.481,0.225 -1.481,0.605 0,0.563 0.462,0.781 2.251,1.056 1.766,0.273 3.41,0.922 3.41,3.075 0,0.619 -0.145,1.152 -0.318,1.525 0.366,-0.08 0.699,-0.08 1.013,0.02 0.357,0.112 0.588,0.289 0.721,0.54 C 0.92,-0.987 0.971,-0.7 0.912,-0.463 0.804,0.033 0.433,0.135 0,0 m -3.986,-5.93 c -1.053,0 -1.658,0.382 -1.658,2.529 0,1.511 0.527,2.635 1.658,2.635 1.313,0 1.699,-1.023 1.699,-2.604 0,-2.262 -0.715,-2.56 -1.699,-2.56",
  },
];

export function JPMorganMark({ variant = "fore", className }: MarkProps) {
  const back = variant === "back";
  return (
    <svg
      viewBox={JPM_VIEWBOX}
      role={back ? undefined : "img"}
      aria-label={back ? undefined : "J.P. Morgan"}
      aria-hidden={back || undefined}
      focusable="false"
      className={className}
      style={
        back
          ? { height: "100%", width: "auto", display: "block" }
          : { height: "1.15em", width: "auto", display: "block" }
      }
    >
      <g transform={JPM_LAYER_TRANSFORM} fill="currentColor">
        {JPM_GLYPHS.map((glyph, i) => (
          <g key={i} transform={glyph.t}>
            <path d={glyph.d} />
          </g>
        ))}
      </g>
    </svg>
  );
}

/* Deloitte — crafted type lockup (no SVG asset exists). Port of the old
   DeloitteMark, re-set in Switzer 600; the trademark dot upgraded from the
   old flat accent-warm circle to the site's live cyan→blue gradient. The
   dot is the frame's ignition actor (scale 0→1 back.out, armed path only). */
export function DeloitteMark({ variant = "fore", className }: MarkProps) {
  const gid = `deloitte-dot-${useId().replace(/:/g, "")}`;
  const back = variant === "back";
  return (
    <span
      role={back ? undefined : "img"}
      aria-label={back ? undefined : "Deloitte"}
      aria-hidden={back || undefined}
      className={className}
      style={{
        fontFamily: SANS,
        fontWeight: 600,
        ...(back ? {} : { fontSize: "1em" }),
        letterSpacing: "-0.005em",
        display: "inline-flex",
        alignItems: "baseline",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      Deloitte
      <svg
        viewBox="0 0 10 10"
        aria-hidden="true"
        focusable="false"
        {...(back ? {} : { "data-mark-dot": "" })}
        style={{
          width: "0.34em",
          height: "0.34em",
          marginLeft: "0.12em",
          position: "relative",
          top: "0.02em",
          flexShrink: 0,
          overflow: "visible",
        }}
      >
        {back ? (
          <circle cx="5" cy="5" r="5" fill="currentColor" />
        ) : (
          <>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="hsl(var(--accent))" />
                <stop offset="1" stopColor="hsl(var(--accent-2))" />
              </linearGradient>
            </defs>
            <circle cx="5" cy="5" r="5" fill={`url(#${gid})`} />
          </>
        )}
      </svg>
    </span>
  );
}

/* Brevan Howard — crafted type lockup. The real brand mark is typographic
   (a light serif italic), so the treatment is Fraunces TRUE italic (loaded
   with real italics — Switzer ships none), with a 1px cyan→blue underline
   as its crafted signature, drawn on ignition (scaleX 0→1, armed only). */
export function BrevanHowardMark({ variant = "fore", className }: MarkProps) {
  const gid = `bh-rule-${useId().replace(/:/g, "")}`;
  if (variant === "back") {
    return (
      <span
        aria-hidden="true"
        className={className}
        style={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontWeight: 400,
          letterSpacing: "0.01em",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        Brevan Howard
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label="Brevan Howard"
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        fontFamily: SERIF,
        fontStyle: "italic",
        fontWeight: 400,
        fontSize: "1em",
        letterSpacing: "0.01em",
        lineHeight: 1.1,
        whiteSpace: "nowrap",
        paddingBottom: "0.18em",
      }}
    >
      Brevan Howard
      <svg
        data-mark-underline=""
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 100 1"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: "100%",
          height: "1px",
          display: "block",
        }}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="hsl(var(--accent))" />
            <stop offset="1" stopColor="hsl(var(--accent-2))" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="1" fill={`url(#${gid})`} />
      </svg>
    </span>
  );
}

/* Accenture — public/case-studies/logos/accenture.svg inlined. The export
   keeps the ">" chevron as its own polygon, so the duotone is real
   geometry: chevron in live accent cyan (fore) and the wordmark path on
   currentColor. Back variant is a single-fill silhouette. */
const ACCENTURE_CHEVRON =
  "95.1,4.9 95.1,0 111.2,6.5 111.2,10.5 95.1,17 95.1,12 104.5,8.5";
const ACCENTURE_WORD =
  "M 6.2,43 C 2.8,43 0,41.3 0,37.5 v -0.2 c 0,-4.6 4,-6.2 8.9,-6.2 h 2.3 v -0.9 c 0,-1.9 -0.8,-3 -2.8,-3 -1.8,0 -2.7,1 -2.8,2.4 h -5 c 0.4,-4.2 3.7,-6.2 8.1,-6.2 4.5,0 7.8,1.9 7.8,6.6 V 42.6 H 11.4 V 40.4 C 10.4,41.8 8.7,43 6.2,43 Z m 5,-6.6 V 34.6 H 9.1 c -2.6,0 -3.9,0.7 -3.9,2.4 v 0.2 c 0,1.3 0.8,2.2 2.6,2.2 1.8,-0.1 3.4,-1.1 3.4,-3 z M 28.4,43 c -5.2,0 -9,-3.2 -9,-9.6 v -0.3 c 0,-6.4 4,-9.8 9,-9.8 4.3,0 7.8,2.2 8.2,7.1 h -5 c -0.3,-1.8 -1.3,-3 -3.1,-3 -2.2,0 -3.8,1.8 -3.8,5.5 v 0.6 c 0,3.8 1.4,5.5 3.8,5.5 1.8,0 3.1,-1.3 3.4,-3.4 h 4.8 C 36.4,40 33.5,43 28.4,43 Z M 48,43 c -5.2,0 -9,-3.2 -9,-9.6 v -0.3 c 0,-6.4 4,-9.8 9,-9.8 4.3,0 7.8,2.2 8.2,7.1 h -5 c -0.3,-1.8 -1.3,-3 -3.1,-3 -2.2,0 -3.8,1.8 -3.8,5.5 v 0.6 c 0,3.8 1.4,5.5 3.8,5.5 1.8,0 3.1,-1.3 3.4,-3.4 h 4.8 C 56,40 53.1,43 48,43 Z m 19.7,0 c -5.4,0 -9.1,-3.2 -9.1,-9.5 v -0.4 c 0,-6.3 3.9,-9.8 9,-9.8 4.7,0 8.6,2.6 8.6,8.9 v 2.3 H 63.9 c 0.2,3.4 1.7,4.7 3.9,4.7 2,0 3.1,-1.1 3.5,-2.4 h 4.9 C 75.6,40.3 72.6,43 67.7,43 Z M 64,31 h 7 c -0.1,-2.8 -1.4,-4 -3.5,-4 -1.6,0.1 -3.1,1 -3.5,4 z m 15.4,-7.2 h 5.3 v 2.8 c 0.9,-1.8 2.8,-3.2 5.7,-3.2 3.4,0 5.7,2.1 5.7,6.6 V 42.6 H 90.8 V 30.8 c 0,-2.2 -0.9,-3.2 -2.8,-3.2 -1.8,0 -3.3,1.1 -3.3,3.5 v 11.5 h -5.3 z m 26.4,-5.7 v 5.7 h 3.6 v 3.9 h -3.6 v 8.9 c 0,1.4 0.6,2.1 1.9,2.1 0.8,0 1.3,-0.1 1.8,-0.3 v 4.1 c -0.6,0.2 -1.7,0.4 -3,0.4 -4.1,0 -6,-1.9 -6,-5.7 v -9.5 h -2.2 v -3.9 h 2.2 v -3.5 z m 23.4,24.5 H 124 v -2.8 c -0.9,1.8 -2.7,3.2 -5.5,3.2 -3.4,0 -5.9,-2.1 -5.9,-6.5 V 23.8 h 5.3 v 12 c 0,2.2 0.9,3.2 2.7,3.2 1.8,0 3.3,-1.2 3.3,-3.5 V 23.8 h 5.3 z m 3.9,-18.8 h 5.3 v 3.5 c 1.1,-2.5 2.9,-3.7 5.7,-3.7 v 5.2 c -3.6,0 -5.7,1.1 -5.7,4.2 v 9.7 h -5.3 z M 154.8,43 c -5.4,0 -9.1,-3.2 -9.1,-9.5 v -0.4 c 0,-6.3 3.9,-9.8 9,-9.8 4.7,0 8.6,2.6 8.6,8.9 v 2.3 h -12.2 c 0.2,3.4 1.7,4.7 3.9,4.7 2,0 3.1,-1.1 3.5,-2.4 h 4.9 c -0.8,3.5 -3.7,6.2 -8.6,6.2 z M 151,31 h 7.1 c -0.1,-2.8 -1.4,-4 -3.5,-4 -1.6,0.1 -3.1,1 -3.6,4 z";

export function AccentureMark({ variant = "fore", className }: MarkProps) {
  const back = variant === "back";
  return (
    <svg
      viewBox="0 0 163.4 43"
      role={back ? undefined : "img"}
      aria-label={back ? undefined : "Accenture"}
      aria-hidden={back || undefined}
      focusable="false"
      className={className}
      style={
        back
          ? { height: "100%", width: "auto", display: "block" }
          : { height: "0.95em", width: "auto", display: "block" }
      }
    >
      <polygon
        points={ACCENTURE_CHEVRON}
        fill={back ? "currentColor" : "hsl(var(--accent))"}
      />
      <path d={ACCENTURE_WORD} fill="currentColor" />
    </svg>
  );
}

export const INSTITUTION_MARKS = {
  revolut: RevolutMark,
  jpmorgan: JPMorganMark,
  deloitte: DeloitteMark,
  brevanhoward: BrevanHowardMark,
  accenture: AccentureMark,
} as const;

export type InstitutionKey = keyof typeof INSTITUTION_MARKS;

/**
 * GlowTwin — the pre-blurred luminous copy stacked behind/over a fore
 * lockup. The blur is STATIC CSS (never animated); only opacities move:
 *   [data-mark-glow]  (this wrapper)  ignition autoAlpha 0 → GLOW_PEAK
 *   [data-glow-inner] (inner span)    base 0.7, breathes to 1 on the
 *                                     active station, hover → 1
 * Effective glow = wrap × inner, i.e. rest 0.35, breathing/hover 0.5.
 * Positioning/blur/colour live in the consumer's CSS (.cred-glow).
 */
export function GlowTwin({
  brand,
  className,
}: {
  brand: InstitutionKey;
  className?: string;
}) {
  const Mark = INSTITUTION_MARKS[brand];
  return (
    <span aria-hidden="true" data-mark-glow="" className={className}>
      <span
        data-glow-inner=""
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        <Mark variant="fore" />
      </span>
    </span>
  );
}
