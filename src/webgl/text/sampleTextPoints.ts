/**
 * Text → particle home positions, via an offscreen 2D canvas.
 *
 * Draws the given lines with the SAME computed font as the DOM headline,
 * reads back the alpha channel, and picks `count` random points inside the
 * glyph coverage (with replacement — short strings simply pack their points
 * denser, which reads brighter; exactly what the big "Sersan AI" wants).
 *
 * Returned coordinates are CSS-pixel offsets from the TEXT BLOCK CENTER,
 * y-UP (world-style), so the caller only scales by world-per-css-px and
 * positions the instanced mesh at the headline's rect center.
 */

export interface TextSpec {
  lines: string[];
  /** Full CSS font-family stack (from getComputedStyle). */
  fontFamily: string;
  fontWeight: string;
  fontSizePx: number;
  /** Line height in px (DOM uses ~0.98em on the display headline). */
  lineHeightPx: number;
  /** CSS letter-spacing in px (0 when 'normal'). */
  letterSpacingPx: number;
}

export interface TextPoints {
  /** count×2 floats: x,y CSS px from block center, y-up. */
  xy: Float32Array;
  widthPx: number;
  heightPx: number;
}

/** Word-wraps `text` to `maxWidthPx` with the spec's font (canvas measure). */
export function wrapTextToLines(
  text: string,
  spec: Omit<TextSpec, "lines">,
  maxWidthPx: number,
): string[] {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [text];
  applyFont(ctx, spec);
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(probe).width > maxWidthPx) {
      lines.push(line);
      line = w;
    } else {
      line = probe;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function applyFont(
  ctx: CanvasRenderingContext2D,
  spec: Omit<TextSpec, "lines">,
) {
  ctx.font = `${spec.fontWeight} ${spec.fontSizePx}px ${spec.fontFamily}`;
  // letterSpacing is supported in Chromium (our WebGPU targets); harmless
  // string assignment elsewhere.
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
    `${spec.letterSpacingPx}px`;
}

/** Rasterizes the lines and samples `count` points inside the glyphs. */
export function sampleTextPoints(spec: TextSpec, count: number): TextPoints {
  const pad = Math.ceil(spec.fontSizePx * 0.25);
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) {
    return { xy: new Float32Array(count * 2), widthPx: 1, heightPx: 1 };
  }
  applyFont(measure, spec);
  const lineWidths = spec.lines.map((l) => measure.measureText(l).width);
  const blockW = Math.max(1, ...lineWidths);
  const blockH = spec.lineHeightPx * spec.lines.length;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(blockW + pad * 2);
  canvas.height = Math.ceil(blockH + pad * 2);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { xy: new Float32Array(count * 2), widthPx: blockW, heightPx: blockH };
  }
  applyFont(ctx, spec);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  // Left-aligned like the DOM headline column.
  spec.lines.forEach((l, i) => {
    ctx.fillText(l, pad, pad + spec.lineHeightPx * (i + 0.5));
  });

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  // Collect covered pixels on a small stride (cost bound), then random-pick.
  const stride = 2;
  const candidates: number[] = [];
  for (let y = 0; y < canvas.height; y += stride) {
    for (let x = 0; x < canvas.width; x += stride) {
      if (img[(y * canvas.width + x) * 4 + 3] > 128) {
        candidates.push(x, y);
      }
    }
  }
  const xy = new Float32Array(count * 2);
  const n = candidates.length / 2;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  if (n === 0) return { xy, widthPx: blockW, heightPx: blockH };
  for (let i = 0; i < count; i++) {
    const k = (Math.random() * n) | 0;
    // Jitter inside the stride cell so points don't grid-align.
    xy[i * 2] = candidates[k * 2] + Math.random() * stride - cx;
    xy[i * 2 + 1] = -(candidates[k * 2 + 1] + Math.random() * stride - cy); // y-up
  }
  return { xy, widthPx: blockW, heightPx: blockH };
}
