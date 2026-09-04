/**
 * Spoken type — the film's voice.
 *
 * Words arrive ONE AT A TIME at a speech cadence, centred in the frame, so a
 * voiceover can be laid under it later. A phrase holds, then leaves as the
 * next one arrives in the same place. This is the reference grammar: one
 * short phrase at a time, big, centred, glowing, never a caption in a corner.
 *
 * Mark an emphasis word by wrapping it in asterisks: "your business is *missing.*"
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { FONT } from "../fonts";
import { EASE, prog } from "../anim";

export type SpokenLine = {
  text: string;
  /** frame the first word lands on */
  start: number;
  /** frame the phrase leaves; defaults to the next phrase's start */
  end?: number;
  size?: number;
};

const parse = (text: string) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const accent = /^\*.*\*$/.test(w);
      return { word: accent ? w.slice(1, -1) : w, accent };
    });

export const Spoken: React.FC<{
  lines: SpokenLine[];
  size?: number;
  /** frames between one word and the next — 6 is roughly speech pace */
  wordEvery?: number;
  /** how long a single word takes to settle. Longer than `wordEvery` on
   *  purpose: two or three words are always in motion at once, which is what
   *  makes the line flow instead of ticking. */
  wordDur?: number;
  /** vertical position of the line's centre, as a fraction of frame height */
  y?: number;
  maxWidth?: number;
  weight?: number;
}> = ({ lines, size = 92, wordEvery = 6, wordDur = 22, y = 0.5, maxWidth = 1440, weight = 500 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {lines.map((line, li) => {
        const words = parse(line.text);
        const exit = line.end ?? lines[li + 1]?.start ?? Infinity;
        // the phrase is gone once it has fully left
        if (frame > exit + 12) return null;
        const out = exit === Infinity ? 0 : prog(frame, exit, exit + 16, EASE.soft);
        // the whole line never stops moving: a slow lift keeps it alive between words
        const driftT = (frame - line.start) / 30;
        const drift = -driftT * 1.1;
        // Keep the phrase optically centred WHILE it is still arriving: slide
        // the block by half the width of the words that have not landed yet.
        // Widths are estimated from character count, which is close enough for
        // a single line and costs no measurement pass.
        const wordProg = words.map((_, i) => prog(frame, line.start + i * wordEvery, line.start + i * wordEvery + wordDur, EASE.glide));
        const widths = words.map((w) => (w.word.length + 1) * 0.52);
        const total = widths.reduce((a, b) => a + b, 0);
        const landed = widths.reduce((acc, w, i) => acc + w * wordProg[i], 0);
        const shiftEm = (total - landed) / 2;
        return (
          <div
            key={li}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${y * 100}%`,
              translate: `${shiftEm}em calc(-50% + ${drift}px)`,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "baseline",
              columnGap: "0.3em",
              rowGap: "0.06em",
              margin: "0 auto",
              maxWidth,
              paddingLeft: 80,
              paddingRight: 80,
              fontFamily: FONT.sans,
              fontWeight: weight,
              fontSize: line.size ?? size,
              lineHeight: 1.1,
              letterSpacing: "-0.022em",
              color: C.ink,
              textAlign: "center",
            }}
          >
            {words.map((w, i) => {
              const s0 = line.start + i * wordEvery;
              const p = wordProg[i];
              // the freshest word carries a hot flash, like a syllable landing
              const hot = Math.max(0, 1 - (frame - (s0 + 4)) / 16) * (frame >= s0 ? 1 : 0);
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    opacity: Math.pow(p, 0.75) * (1 - out),
                    translate: `0 ${(1 - p) * 34 - out * 30}px`,
                    filter: `blur(${(1 - p) * (1 - p) * 10 + out * 6}px)`,
                    scale: String(1.06 - 0.06 * p),
                    color: w.accent ? C.accent : undefined,
                    textShadow: w.accent
                      ? `0 0 ${26 + 34 * hot}px rgba(59,225,255,${0.45 + 0.4 * hot})`
                      : `0 0 ${16 + 30 * hot}px rgba(230,244,255,${0.22 + 0.5 * hot})`,
                  }}
                >
                  {w.word}
                </span>
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};