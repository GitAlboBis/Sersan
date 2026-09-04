/**
 * Typographic primitives with the site's grammar:
 *  - Eyebrow: JetBrains Mono, uppercase, 0.22em tracking, cyan dot, decoder reveal
 *  - Headline: Fraunces, per-word mask reveal, *accent* words in cyan/500
 *  - Body: Switzer, soft rise
 *  - BigNumber: slams in with blur
 *  - Wordmark: SERSAN in SersanDisplay, letters settling from wide tracking
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { C } from "../theme";
import { FONT } from "../fonts";
import { EASE, hash01, prog, ramp } from "../anim";

const SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·—";

export const Eyebrow: React.FC<{
  text: string;
  start: number;
  /** frames per character resolve */
  speed?: number;
  size?: number;
  style?: React.CSSProperties;
  dot?: boolean;
  color?: string;
  exitAt?: number;
}> = ({ text, start, speed = 1.1, size = 15, style, dot = true, color = C.inkMute, exitAt }) => {
  const frame = useCurrentFrame();
  const chars = text.toUpperCase().split("");
  const inA = prog(frame, start, start + 14);
  const ex = exitAt === undefined ? 0 : prog(frame, exitAt, exitAt + 12, EASE.in);
  const pulse = ((((frame - start) / 36) % 1) + 1) % 1;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: FONT.mono,
        fontSize: size,
        letterSpacing: "0.22em",
        color,
        opacity: inA * (1 - ex),
        ...style,
      }}
    >
      {dot && (
        <span style={{ position: "relative", width: 8, height: 8, flex: "0 0 auto" }}>
          <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: C.accent, boxShadow: `0 0 12px ${C.accent}` }} />
          <span
            style={{
              position: "absolute",
              inset: -6,
              borderRadius: 999,
              border: `1px solid ${C.accent}`,
              opacity: 0.6 - 0.6 * pulse,
              scale: String(0.6 + 1.1 * pulse),
            }}
          />
        </span>
      )}
      <span style={{ whiteSpace: "pre" }}>
        {chars.map((ch, i) => {
          if (ch === " ") return " ";
          const resolveAt = start + 6 + i * speed;
          const settled = frame >= resolveAt;
          const shown = settled ? ch : SCRAMBLE[Math.floor(hash01(i, frame >> 1) * SCRAMBLE.length)];
          const fresh = settled && frame - resolveAt < 5;
          return (
            <span key={i} style={{ color: fresh ? C.ink : settled ? undefined : C.inkDim, opacity: frame >= resolveAt - 10 ? 1 : 0 }}>
              {shown}
            </span>
          );
        })}
      </span>
    </div>
  );
};

/** Splits "We build the *missing.*" into words; *word* is an accent word. */
const parseWords = (text: string) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const accent = /^\*.*\*$/.test(w);
      return { word: accent ? w.slice(1, -1) : w, accent };
    });

export const Headline: React.FC<{
  text: string;
  start: number;
  /** frames between words */
  stagger?: number;
  /** frames a word takes to land */
  dur?: number;
  size?: number;
  weight?: number;
  lineHeight?: number;
  align?: "left" | "center";
  style?: React.CSSProperties;
  /** exit start frame (optional): words lift and fade */
  exitAt?: number;
  exitDur?: number;
  italicAccent?: boolean;
  maxWidth?: number | string;
}> = ({ text, start, stagger = 3, dur = 28, size = 104, weight = 300, lineHeight = 1.02, align = "left", style, exitAt, exitDur = 16, italicAccent = false, maxWidth }) => {
  const frame = useCurrentFrame();
  const words = parseWords(text);
  return (
    <div
      style={{
        fontFamily: FONT.display,
        fontSize: size,
        fontWeight: weight,
        lineHeight,
        letterSpacing: "-0.018em",
        color: C.ink,
        textAlign: align,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        columnGap: "0.24em",
        maxWidth,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const s0 = start + i * stagger;
        const y = ramp(frame, s0, s0 + dur, 110, 0);
        const o = ramp(frame, s0, s0 + dur * 0.6, 0, 1);
        const ex = exitAt === undefined ? 0 : prog(frame, exitAt + i * 1.2, exitAt + i * 1.2 + exitDur, EASE.in);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em", verticalAlign: "top" }}>
            <span
              style={{
                display: "inline-block",
                translate: `0 ${y - ex * 60}%`,
                opacity: o * (1 - ex),
                color: w.accent ? C.accent : undefined,
                fontWeight: w.accent ? 500 : undefined,
                fontStyle: w.accent && italicAccent ? "italic" : undefined,
                textShadow: w.accent ? `0 0 28px rgba(59,225,255,0.45)` : undefined,
                filter: `blur(${(1 - o) * 6}px)`,
              }}
            >
              {w.word}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export const Body: React.FC<{
  text: string;
  start: number;
  size?: number;
  color?: string;
  maxWidth?: number;
  style?: React.CSSProperties;
  exitAt?: number;
  align?: "left" | "center";
}> = ({ text, start, size = 26, color = C.inkMute, maxWidth = 760, style, exitAt, align = "left" }) => {
  const frame = useCurrentFrame();
  const o = prog(frame, start, start + 26);
  const y = ramp(frame, start, start + 34, 22, 0);
  const ex = exitAt === undefined ? 0 : prog(frame, exitAt, exitAt + 14, EASE.in);
  return (
    <div
      style={{
        fontFamily: FONT.sans,
        fontWeight: 400,
        fontSize: size,
        lineHeight: 1.45,
        color,
        maxWidth,
        opacity: o * (1 - ex),
        translate: `0 ${y - ex * 20}px`,
        textAlign: align,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

export const BigNumber: React.FC<{
  text: string;
  start: number;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  exitAt?: number;
  font?: "display" | "brand" | "mono";
}> = ({ text, start, size = 360, color = C.ink, style, exitAt, font = "display" }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, start, start + 22);
  const ex = exitAt === undefined ? 0 : prog(frame, exitAt, exitAt + 12, EASE.in);
  return (
    <div
      style={{
        fontFamily: font === "display" ? FONT.display : font === "brand" ? FONT.brand : FONT.mono,
        fontWeight: font === "brand" ? 240 : 300,
        fontSize: size,
        lineHeight: 0.9,
        letterSpacing: font === "brand" ? "0.08em" : "-0.03em",
        color,
        opacity: p * (1 - ex),
        scale: String(1.45 - 0.45 * p + ex * 0.08),
        filter: `blur(${(1 - p) * 26}px)`,
        textShadow: `0 0 ${40 * p}px rgba(59,225,255,${0.35 * p})`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** SERSAN in SersanDisplay. Letters arrive from a wide tracking and settle at 0.38em. */
export const Wordmark: React.FC<{
  start: number;
  size?: number;
  weight?: number;
  color?: string;
  style?: React.CSSProperties;
  glow?: boolean;
  exitAt?: number;
  dur?: number;
  /** settled letter-spacing in em */
  tracking?: number;
}> = ({ start, size = 120, weight = 260, color = C.ink, style, glow = true, exitAt, dur = 40, tracking: trackingBase = 0.38 }) => {
  const frame = useCurrentFrame();
  const letters = "SERSAN".split("");
  return (
    <div style={{ display: "flex", fontFamily: FONT.brand, fontWeight: weight, fontSize: size, color, lineHeight: 1, ...style }}>
      {letters.map((l, i) => {
        const s0 = start + i * 2.5;
        const p = prog(frame, s0, s0 + dur);
        const ex = exitAt === undefined ? 0 : prog(frame, exitAt + i * 1.5, exitAt + i * 1.5 + 14, EASE.in);
        const tracking = trackingBase + (1 - p) * 0.5;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: i < letters.length - 1 ? `${tracking}em` : 0,
              opacity: p * (1 - ex),
              filter: `blur(${(1 - p) * 10}px)`,
              translate: `0 ${(1 - p) * 10 - ex * 14}px`,
              textShadow: glow ? `0 0 ${18 * p}px rgba(244,246,250,${0.35 * p}), 0 0 ${60 * p}px rgba(59,225,255,${0.25 * p})` : undefined,
            }}
          >
            {l}
          </span>
        );
      })}
    </div>
  );
};

/** Small mono label (section numbers like 01 / 02, captions). */
export const Mono: React.FC<{ text: string; start: number; size?: number; color?: string; style?: React.CSSProperties; exitAt?: number }> = ({
  text,
  start,
  size = 14,
  color = C.inkMute,
  style,
  exitAt,
}) => {
  const frame = useCurrentFrame();
  const o = prog(frame, start, start + 14);
  const ex = exitAt === undefined ? 0 : prog(frame, exitAt, exitAt + 10, EASE.in);
  return (
    <div style={{ fontFamily: FONT.mono, fontSize: size, letterSpacing: "0.2em", textTransform: "uppercase", color, opacity: o * (1 - ex), ...style }}>{text}</div>
  );
};