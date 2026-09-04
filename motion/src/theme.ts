/**
 * Sersan brand tokens for the film — mirrors src/app/globals.css of the site
 * (hsl triplets converted to hex). Cyan → blue "signal" only: no violet, no
 * warm tones (standing directive from the founders).
 */
export const C = {
  bg: "#0B1422", // brand navy base
  bgDeep: "#060B15", // space behind the navy
  black: "#03070E",
  surface: "#171F2B",
  surfaceElev: "#232D3A",
  ink: "#F4F6FA",
  inkMute: "#8A94A6",
  inkDim: "#4E5563",
  rule: "#232D3A",
  ruleWarm: "#38506A",
  accent: "#3BE1FF", // electric cyan — signal head
  accent2: "#2A7FFF", // blue — signal tail
  accentDark: "#0BA0CC",
  markWhite: "#F4F7FC",
  markBlue: "#2A7FFF",
} as const;

export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const;

/** Glow recipes (box-shadow strings) lifted from the site's CTA / card hovers. */
export const GLOW = {
  cta: `0 0 0 1px rgba(59,225,255,0.18), 0 30px 80px -30px rgba(59,225,255,0.32), 0 0 22px -2px rgba(59,225,255,0.28)`,
  card: `inset 0 1px 0 rgba(59,225,255,0.55), 0 0 0 1px rgba(59,225,255,0.18), 0 30px 80px -30px rgba(59,225,255,0.32)`,
  text: `0 0 24px rgba(59,225,255,0.55), 0 0 64px rgba(42,127,255,0.35)`,
} as const;