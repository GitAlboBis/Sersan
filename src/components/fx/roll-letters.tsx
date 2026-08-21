"use client";

/**
 * RollLetters — the Lusion LETTER-ROLL grammar for short display words
 * (dossier recipe R1: per-letter columns of stacked glyph copies streaming
 * through a one-line clip, yPercent −500 → 0, expo.inOut, ~1.25s, center-out
 * cosine stagger). A local twin of the work section's RollingTitle
 * (work-card.tsx). Differences, on purpose:
 *
 *   - CLIP-PATH, not overflow:hidden. An inline-block with overflow≠visible
 *     moves its baseline to the bottom margin edge — these words sit INSIDE
 *     mixed display lines (mono index · serif cause -> ghost effect), so the
 *     clip must not break baseline registration. `clip-path: inset(0)` clips
 *     paint without touching layout or baseline.
 *   - `clipInset` (round 5, Hv1): the problem EFFECT word's ignition wave
 *     slides its chars x 0→1.5em — a plain inset(0) would clip the shifted
 *     glyphs. Passing negative HORIZONTAL insets (`inset(0 -2em)`) lets the
 *     x-shift escape while the vertical roll clip survives.
 *   - `wave` marks the word as the Hv1 target (`data-wave-word`) so the
 *     ignition driver (lusion-type useIgnitionWave) can find its columns.
 *   - Copies live BELOW the in-flow final glyph (absolute, top k·100%): the
 *     final char is the ONLY in-flow text, so SSR / no-JS / reduced-motion
 *     rest state is exactly the real string, clipped to one clean line.
 *   - `decoys="decode"`: the three streaming copies are DETERMINISTIC
 *     scramble glyphs (never Math.random in render — SSR and hydration must
 *     agree byte-for-byte), so the word rolls in already-scrambled and lands
 *     decoded. `decoys="self"` (default) is the pure Lusion roll (letter ×4).
 *
 * PURE MARKUP: the owning section's GSAP timelines drive the transforms via
 * `[data-roll-word]` / `[data-roll-col]` queries. Round 5: the entrance is a
 * viewport-entry REPLAYABLE tween (yPercent −500→0, expo.inOut, 1.25s, the
 * rollDelay center-out cosine as real seconds — R1's literal numbers), reset
 * off-screen and replayed on re-entry; the Hv1 x-wave composes on the same
 * columns (x channel only, never yPercent). Without JS nothing is primed —
 * the word simply reads. A11y: real string in an .sr-only span; the visual
 * column machinery is aria-hidden (RollingTitle contract).
 *
 * Copy freeze: the component re-renders the exact `text` string (the sr-only
 * node + the in-flow final glyphs concatenate to it verbatim); decoy glyphs
 * are aria-hidden paint, clipped at rest.
 */
import { useMemo } from "react";

/** Lusion roll: center-out cosine stagger (work-card §2.4 port). Seconds of
 * delay for column i of n — center columns lead, edges trail by ~62ms. */
export function rollDelay(i: number, n: number): number {
  if (n <= 1) return 0;
  const phase = Math.PI / 2 + (i / (n - 1)) * Math.PI; // π/2 → 3π/2
  return (Math.cos(phase) + 1) * 0.0625;
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Deterministic decoy glyph — stable across SSR/hydration/renders. */
function decoyGlyph(i: number, k: number, len: number): string {
  return GLYPHS[(i * 7 + k * 11 + len * 3) % GLYPHS.length];
}

interface RollLettersProps {
  text: string;
  /** "self" = pure Lusion roll (the letter ×4); "decode" = roll in
   * already-scrambled, land decoded. */
  decoys?: "self" | "decode";
  className?: string;
  /** clip-path for the roll mask. Default clips exactly to the line; pass
   * negative horizontal insets (e.g. "inset(0 -2em)") when a hover x-shift
   * must escape the clip while the vertical roll stays masked (Hv1). */
  clipInset?: string;
  /** Marks the word as the Hv1 ignition-wave target (data-wave-word). */
  wave?: boolean;
}

export function RollLetters({
  text,
  decoys = "self",
  className,
  clipInset = "inset(0)",
  wave = false,
}: RollLettersProps) {
  const chars = useMemo(() => Array.from(text), [text]);
  return (
    <span
      className={className}
      data-roll-word=""
      data-wave-word={wave ? "" : undefined}
    >
      <span className="sr-only">{text}</span>
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          clipPath: clipInset,
          whiteSpace: "pre",
        }}
      >
        {chars.map((ch, i) =>
          ch === " " ? (
            <span key={i}> </span>
          ) : (
            <span
              key={i}
              data-roll-col=""
              style={{
                position: "relative",
                display: "inline-block",
                willChange: "transform",
              }}
            >
              <span style={{ display: "inline-block" }}>{ch}</span>
              {[1, 2, 3].map((k) => (
                <span
                  key={k}
                  style={{ position: "absolute", left: 0, top: `${k * 100}%` }}
                >
                  {decoys === "decode" ? decoyGlyph(i, k, chars.length) : ch}
                </span>
              ))}
            </span>
          ),
        )}
      </span>
    </span>
  );
}
