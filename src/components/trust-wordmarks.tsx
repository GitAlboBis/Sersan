/**
 * TrustWordmarks — typographic wordmarks for the trust strip.
 *
 * NOT real brand SVG assets. Font-based renderings that approximate
 * each brand's typographic treatment so they read with more authority
 * than plain inline spans without misrepresenting the marks.
 *
 * Each mark inherits `currentColor` so they tint with the ink color.
 */

import type { CSSProperties } from "react";

type WordmarkProps = {
  className?: string;
  style?: CSSProperties;
};

const baseSize = "1.05rem";

export const RevolutMark = ({ className, style }: WordmarkProps) => (
  <span
    className={className}
    aria-label="Revolut"
    style={{
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      fontWeight: 600,
      fontSize: baseSize,
      letterSpacing: "-0.025em",
      ...style,
    }}
  >
    Revolut
  </span>
);

export const JPMorganMark = ({ className, style }: WordmarkProps) => (
  <span
    className={className}
    aria-label="JPMorgan"
    style={{
      fontFamily: "'Instrument Serif', ui-serif, Georgia, serif",
      fontWeight: 400,
      fontSize: "1.2rem",
      letterSpacing: "0.005em",
      lineHeight: 1,
      ...style,
    }}
  >
    J.P.Morgan
  </span>
);

export const DeloitteMark = ({ className, style }: WordmarkProps) => (
  <span
    className={className}
    aria-label="Deloitte"
    style={{
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      fontWeight: 600,
      fontSize: baseSize,
      letterSpacing: "-0.005em",
      display: "inline-flex",
      alignItems: "baseline",
      ...style,
    }}
  >
    Deloitte
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "0.32em",
        height: "0.32em",
        marginLeft: "0.12em",
        borderRadius: "9999px",
        background: "hsl(var(--accent-warm))",
        transform: "translateY(0.02em)",
      }}
    />
  </span>
);

export const BrevanHowardMark = ({ className, style }: WordmarkProps) => (
  <span
    className={className}
    aria-label="Brevan Howard"
    style={{
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      fontWeight: 300,
      fontStyle: "italic",
      fontSize: baseSize,
      letterSpacing: "0.01em",
      ...style,
    }}
  >
    Brevan Howard
  </span>
);

export const AccentureMark = ({ className, style }: WordmarkProps) => (
  <span
    className={className}
    aria-label="Accenture"
    style={{
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      fontWeight: 700,
      fontSize: baseSize,
      letterSpacing: "-0.015em",
      display: "inline-flex",
      alignItems: "baseline",
      ...style,
    }}
  >
    <span style={{ display: "inline-flex", alignItems: "baseline" }}>
      <span>a</span>
      <span
        aria-hidden="true"
        style={{
          color: "hsl(var(--accent-warm))",
          marginLeft: "0.02em",
          marginRight: "0.02em",
        }}
      >
        &gt;
      </span>
      <span>centure</span>
    </span>
  </span>
);

export const WHOMark = ({ className, style }: WordmarkProps) => (
  <span
    className={className}
    aria-label="World Health Organization"
    style={{
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      fontWeight: 600,
      fontSize: baseSize,
      letterSpacing: "0.06em",
      ...style,
    }}
  >
    WHO
  </span>
);

export const BRAND_WORDMARKS = {
  Revolut: RevolutMark,
  JPMorgan: JPMorganMark,
  Deloitte: DeloitteMark,
  "Brevan Howard": BrevanHowardMark,
  Accenture: AccentureMark,
  WHO: WHOMark,
} as const;

export type BrandName = keyof typeof BRAND_WORDMARKS;
