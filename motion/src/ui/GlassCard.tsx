/**
 * DOM layers for the beats: glass tiles in 3D space, a navy scrim behind
 * text that sits over WebGL light, and the primary CTA pill.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { C, GLOW } from "../theme";
import { FONT } from "../fonts";
import { EASE, prog, ramp } from "../anim";

export const GlassCard: React.FC<{
  number: string;
  title: string;
  line: string;
  start: number;
  exitAt?: number;
  width?: number;
  height?: number;
}> = ({ number, title, line, start, exitAt, width = 380, height = 460 }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, start, start + 34);
  const ex = exitAt === undefined ? 0 : prog(frame, exitAt, exitAt + 14, EASE.in);
  const sheen = ramp(frame, start + 26, start + 74, -70, 170, EASE.soft);
  const inner = prog(frame, start + 14, start + 40);
  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        flex: "0 0 auto",
        transform: `translate3d(0, ${(1 - p) * 90 - ex * 60}px, ${(1 - p) * -760 + ex * 260}px) rotateY(${(1 - p) * 24}deg)`,
        opacity: p * (1 - ex),
        transformStyle: "preserve-3d",
        borderRadius: 18,
        background: "linear-gradient(180deg, rgba(35,45,58,0.74), rgba(23,31,43,0.58))",
        backdropFilter: "blur(18px)",
        border: "1px solid rgba(59,225,255,0.16)",
        boxShadow: GLOW.card,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, rgba(59,225,255,0.9), rgba(59,225,255,0))" }} />
      <div style={{ position: "absolute", right: -14, bottom: -58, fontFamily: FONT.display, fontWeight: 300, fontSize: 240, lineHeight: 1, color: "rgba(244,246,250,0.045)", letterSpacing: "-0.04em" }}>
        {number}
      </div>
      <div style={{ position: "absolute", left: 30, top: 28, fontFamily: FONT.mono, fontSize: 14, letterSpacing: "0.22em", color: C.accent, opacity: inner }}>
        {number}
      </div>
      <div style={{ position: "absolute", left: 86, top: 36, width: 40, height: 1, background: C.ruleWarm, opacity: inner }} />
      <div style={{ position: "absolute", left: 30, right: 30, top: 250, fontFamily: FONT.display, fontWeight: 400, fontSize: 34, lineHeight: 1.12, letterSpacing: "-0.015em", color: C.ink, opacity: inner, translate: `0 ${(1 - inner) * 14}px` }}>
        {title}
      </div>
      <div style={{ position: "absolute", left: 30, right: 30, top: 348, fontFamily: FONT.sans, fontWeight: 400, fontSize: 19, lineHeight: 1.4, color: C.inkMute, opacity: inner, translate: `0 ${(1 - inner) * 10}px` }}>
        {line}
      </div>
      <div
        style={{
          position: "absolute",
          inset: -40,
          background: "linear-gradient(115deg, rgba(59,225,255,0) 42%, rgba(59,225,255,0.16) 50%, rgba(59,225,255,0) 58%)",
          translate: `${sheen}% 0`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

/** Navy scrim that keeps type legible over WebGL light (site rule: text over plates needs a scrim). */
export const Scrim: React.FC<{ left: number; top: number; width: number; height: number; strength?: number }> = ({ left, top, width, height, strength = 0.82 }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width,
      height,
      background: `radial-gradient(ellipse at 50% 50%, rgba(11,20,34,${strength}) 0%, rgba(11,20,34,${strength * 0.7}) 40%, rgba(11,20,34,0) 100%)`,
      pointerEvents: "none",
    }}
  />
);

export const CtaPill: React.FC<{ label: string; start: number; exitAt?: number }> = ({ label, start, exitAt }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, start, start + 26);
  const ex = exitAt === undefined ? 0 : prog(frame, exitAt, exitAt + 12, EASE.in);
  const arrow = ramp(frame, start + 16, start + 40, -8, 0);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 16,
        padding: "22px 38px",
        borderRadius: 999,
        background: C.accent,
        color: "#070E17",
        fontFamily: FONT.sans,
        fontWeight: 500,
        fontSize: 24,
        letterSpacing: "0.01em",
        boxShadow: `0 10px 30px -12px rgba(59,225,255,0.6), ${GLOW.cta}`,
        opacity: p * (1 - ex),
        scale: String(0.94 + 0.06 * p - ex * 0.03),
        translate: `0 ${(1 - p) * 18}px`,
      }}
    >
      <span>{label}</span>
      <span style={{ display: "inline-block", translate: `${arrow}px 0`, fontFamily: FONT.sans }}>→</span>
    </div>
  );
};