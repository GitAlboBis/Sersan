"use client";

/**
 * RollLetters — the Lusion LETTER-ROLL grammar for short display words
 * (round-3 owner note, 2026-08-21: "le animazioni delle scritte grandi,
 * stile Lusion"). A local twin of the work section's RollingTitle
 * (work-card.tsx): per-letter columns of stacked glyph copies streaming
 * through a one-line clip, yPercent −500 → 0, expo.inOut, center-out cosine
 * stagger. Differences, on purpose:
 *
 *   - CLIP-PATH, not overflow:hidden. An inline-block with overflow≠visible
 *     moves its baseline to the bottom margin edge — these words sit INSIDE
 *     mixed display lines (mono index · serif cause -> ghost effect), so the
 *     clip must not break baseline registration. `clip-path: inset(0)` clips
 *     paint without touching layout or baseline.
 *   - Copies live BELOW the in-flow final glyph (absolute, top k·100%): the
 *     final char is the ONLY in-flow text, so SSR / no-JS / reduced-motion
 *     rest state is exactly the real string, clipped to one clean line.
 *   - `decoys="decode"`: the three streaming copies are DETERMINISTIC
 *     scramble glyphs (never Math.random in render — SSR and hydration must
 *     agree byte-for-byte), so the word rolls in already-scrambled and lands
 *     decoded — the AT read composed with the Lusion roll, zero timers.
 *     `decoys="self"` (default) is the pure Lusion roll (letter ×4).
 *
 * PURE MARKUP: the owning section's GSAP timeline drives the transforms via
 * `[data-roll-word]` / `[data-roll-col]` queries (prime yPercent −500, play
 * fromTo → 0 with rollDelay stagger). Without JS nothing is primed — the
 * word simply reads. A11y: real string in an .sr-only span; the visual
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
}

export function RollLetters({
  text,
  decoys = "self",
  className,
}: RollLettersProps) {
  const chars = useMemo(() => Array.from(text), [text]);
  return (
    <span className={className} data-roll-word="">
      <span className="sr-only">{text}</span>
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          clipPath: "inset(0)",
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
