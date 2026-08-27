/**
 * Telemetry-rain TOKEN TABLE + ATLAS PAINTER (DOM-only, no three import).
 *
 * The Team section backdrop (TeamGlyphRain) is a Lusion-style glyph rain whose
 * "glyphs" are short production-telemetry tokens instead of single characters:
 * one atlas cell = one mono token ("p99 38ms", "deploy ✓", "kill-sw ON" …),
 * so every column reads like a terminal / log tail scrolling upward.
 *
 * ATLAS LAYOUT. One canvas, ATLAS_COLS × ATLAS_ROWS cells of CELL_W × CELL_H px
 * (8 × 6 = 48 cells, 1024 × 192 px). Token i lives at
 *   col = i mod ATLAS_COLS, row = floor(i / ATLAS_COLS)
 * with row 0 at the TOP of the canvas (the sampler sets flipY = false and
 * flips the in-cell v itself — see telemetryRainNodeMaterial). White text on
 * transparent: the shader reads only the ALPHA channel (coverage), so the
 * result is colour-space and premultiply agnostic.
 *
 * ACCENT METADATA. Rare "human" tokens (`accent: true`) are painted in the
 * site accent by the shader. The flag travels as an INDEX PARTITION rather
 * than a second texture row: `orderTokens()` sorts every accent token to the
 * TAIL of the atlas, and the material receives `accentStart` (= number of
 * normal tokens) + `accentCount`. The shader then draws
 *   idx = rare ? accentStart + floor(h·accentCount) : floor(h·accentStart)
 * so accent frequency is a UNIFORM (uRare), independent of the 4/48 table
 * ratio — which is what keeps the bloom-catching cells rare.
 *
 * FONT. The site mono is JetBrains Mono, loaded by next/font as the CSS var
 * `--font-jbm` (a hashed family name — the literal "JetBrains Mono" is NOT
 * registered). `resolveMonoFamily()` reads that var off :root and falls back
 * to ui-monospace. `paintTelemetryAtlas()` awaits `document.fonts.load` (with
 * a timeout) so the atlas is never rasterised in the fallback face by accident.
 */

export interface TelemetryToken {
  text: string;
  /** Painted in the accent cyan at HDR intensity (feeds the selective bloom). */
  accent?: boolean;
}

/** Owner-supplied token set (2026-08-27 direction). 48 entries = one full atlas. */
export const TELEMETRY_TOKENS: readonly TelemetryToken[] = [
  { text: "p99 38ms" },
  { text: "ok 200" },
  { text: "eval 94/100" },
  { text: "deploy ✓" },
  { text: "rollback" },
  { text: "kill-sw ON", accent: true },
  { text: "03:02 on-call" },
  { text: "otel trace" },
  { text: "k8s ready" },
  { text: "kafka lag 0" },
  { text: "SLA 99.9" },
  { text: "audit log" },
  { text: "rev 7f3a2c" },
  { text: "retry ×3" },
  { text: "span 12ms" },
  { text: "queue 0" },
  { text: "cron 03:00" },
  { text: "gpu 71%" },
  { text: "p50 9ms" },
  { text: "latency" },
  { text: "canary 5%" },
  { text: "guardrail" },
  { text: "PII masked" },
  { text: "human ✓", accent: true },
  { text: "argo sync" },
  { text: "tf apply" },
  { text: "pg vacuum" },
  { text: "ws open" },
  { text: "cache hit" },
  { text: "OOM 0" },
  { text: "SLO ok" },
  { text: "mfa ok" },
  { text: "TLS 1.3" },
  { text: "backup ✓" },
  { text: "drift 0.2" },
  { text: "F1 0.91" },
  { text: "AUC 0.94" },
  { text: "MAPE 8.4%" },
  { text: "restore ✓" },
  { text: "alert ack" },
  { text: "pager quiet" },
  { text: "3am fine", accent: true },
  { text: "judgement", accent: true },
  { text: "senior only" },
  { text: "no demo" },
  { text: "ships" },
  { text: "prod" },
  { text: "LDN 03:02" },
];

/** Atlas grid. 8 × 6 = 48 cells — exactly the token count. */
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 6;
/** Cell size in atlas px. 128 × 32 → a 4:1 cell (≈ 11–12 mono chars × 1 line). */
export const CELL_W = 128;
export const CELL_H = 32;
/** Cell aspect (height / width) — the shader keeps on-screen cells at this
 * ratio so tokens are never stretched: cells-per-column = planeH / (colW·this). */
export const CELL_H_OVER_W = CELL_H / CELL_W;
/** Horizontal inset of the text inside its cell (px) — keeps mip bleed off. */
const CELL_PAD_X = 7;
/** Nominal font size (px). Long tokens are scaled down to fit the cell. */
const FONT_PX = 17;

export interface OrderedTokens {
  /** Normal tokens first, accent tokens last. */
  tokens: TelemetryToken[];
  /** Index of the first accent token (= number of normal tokens). */
  accentStart: number;
  accentCount: number;
}

/** Stable partition: normal tokens (table order) then accent tokens. */
export function orderTokens(
  source: readonly TelemetryToken[] = TELEMETRY_TOKENS,
): OrderedTokens {
  const normal = source.filter((t) => !t.accent);
  const accent = source.filter((t) => t.accent);
  const tokens = [...normal, ...accent].slice(0, ATLAS_COLS * ATLAS_ROWS);
  const accentStart = Math.min(normal.length, tokens.length);
  return { tokens, accentStart, accentCount: tokens.length - accentStart };
}

/** The site's mono family as registered by next/font (`--font-jbm`), with
 * the system mono stack behind it. Never throws; SSR-safe (returns fallback). */
export function resolveMonoFamily(): string {
  const fallback = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
  if (typeof document === "undefined") return fallback;
  try {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-jbm")
      .trim();
    return v ? `${v}, ${fallback}` : fallback;
  } catch {
    return fallback;
  }
}

/** Wait for the mono face (bounded — a slow font must not stall the island). */
async function ensureFont(family: string, timeoutMs = 1500): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await Promise.race([
      document.fonts.load(`500 ${FONT_PX}px ${family}`),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch {
    /* fall back silently to whatever the canvas resolves */
  }
}

export interface TelemetryAtlas extends OrderedTokens {
  canvas: HTMLCanvasElement;
  cols: number;
  rows: number;
}

/**
 * Rasterise the token atlas. Async only for the font wait; the paint itself is
 * one synchronous pass over 48 cells. Returns null when no 2D context exists
 * (never on a real browser; guards headless/SSR probes).
 */
export async function paintTelemetryAtlas(
  source: readonly TelemetryToken[] = TELEMETRY_TOKENS,
): Promise<TelemetryAtlas | null> {
  if (typeof document === "undefined") return null;
  const ordered = orderTokens(source);
  const family = resolveMonoFamily();
  await ensureFont(family);

  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * CELL_W;
  canvas.height = ATLAS_ROWS * CELL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const maxTextW = CELL_W - CELL_PAD_X * 2;

  ordered.tokens.forEach((token, i) => {
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    const x0 = col * CELL_W + CELL_PAD_X;
    const yMid = row * CELL_H + CELL_H / 2;
    // Fit: measure at the nominal size, shrink long tokens to the cell width.
    ctx.font = `500 ${FONT_PX}px ${family}`;
    const w = ctx.measureText(token.text).width;
    if (w > maxTextW) {
      const px = Math.max(9, Math.floor((FONT_PX * maxTextW) / w));
      ctx.font = `500 ${px}px ${family}`;
    }
    ctx.fillText(token.text, x0, yMid + 1);
  });

  return { ...ordered, canvas, cols: ATLAS_COLS, rows: ATLAS_ROWS };
}
