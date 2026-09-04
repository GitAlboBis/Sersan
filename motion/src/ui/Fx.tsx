/**
 * THE FINISH LAYER — the things an editor adds after the shot is right.
 *
 * A cut in a good ad is not a swap, it is a light event: the frame flares,
 * the incoming image arrives smeared and settles, and an anamorphic streak
 * rips across the highlight. These are the three, in that order, all driven
 * off the frame so they cost nothing to schedule.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, prog } from "../anim";
import { C } from "../theme";

/** Exponential decay from a hit at frame 0 of the scene. 1 at impact, ~0 by `tail`. */
const hit = (frame: number, at: number, tail: number) => (frame < at ? 0 : Math.exp(-(frame - at) / tail));

/**
 * The cut itself: an exposure pop plus a horizontal anamorphic rip. Sits at
 * the top of a scene, so it fires on that scene's first frames.
 */
export const CutFlash: React.FC<{ at?: number; strength?: number; streak?: boolean; tail?: number }> = ({
  at = 0,
  strength = 1,
  streak = true,
  tail = 3.4,
}) => {
  const frame = useCurrentFrame();
  const h = hit(frame, at, tail);
  if (h < 0.004) return null;
  return (
    <>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 48%, rgba(214,240,255,${0.3 * h * strength}) 0%, rgba(59,225,255,${0.13 * h * strength}) 45%, rgba(59,225,255,0) 80%)`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      {streak && (
        <div
          style={{
            position: "absolute",
            left: "-10%",
            right: "-10%",
            top: "50%",
            height: 3,
            translate: "0 -50%",
            background: `linear-gradient(90deg, rgba(59,225,255,0) 0%, rgba(214,240,255,${0.85 * h * strength}) 35%, rgba(255,255,255,${0.95 * h * strength}) 50%, rgba(214,240,255,${0.85 * h * strength}) 65%, rgba(59,225,255,0) 100%)`,
            filter: `blur(${2 + 16 * (1 - h)}px)`,
            scale: `${0.5 + 0.8 * h} ${1 + 7 * h}`,
            mixBlendMode: "screen",
            pointerEvents: "none",
          }}
        />
      )}
    </>
  );
};

/**
 * The incoming frame arrives with speed still on it: a short directional
 * smear that resolves. This is what a hand-tuned cut looks like — the image
 * is never simply "there" on frame one.
 */
export const Smear: React.FC<{ children: React.ReactNode; dur?: number; blur?: number; scale?: number; x?: number }> = ({
  children,
  dur = 7,
  blur = 22,
  scale = 1.06,
  x = 0,
}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, 0, dur, EASE.out);
  // a whisper of undershoot on the settle: the AE signature
  const over = 1 - Math.sin(Math.min(1, Math.max(0, (frame - dur) / 9)) * Math.PI) * 0.006;
  return (
    <AbsoluteFill
      style={{
        scale: String((scale - (scale - 1) * p) * over),
        translate: `${(1 - p) * x}px 0`,
        filter: `blur(${(1 - p) * (1 - p) * blur}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** A slow bar of light crossing a dark plane — B-roll under a spoken line. */
export const LightSweep: React.FC<{ y?: number; period?: number; height?: number; opacity?: number; tilt?: number }> = ({
  y = 0.72,
  period = 150,
  height = 260,
  opacity = 0.5,
  tilt = -4,
}) => {
  const frame = useCurrentFrame();
  const u = ((frame % period) / period) * 1.6 - 0.3;
  const fade = Math.sin(Math.min(1, Math.max(0, u)) * Math.PI);
  return (
    <div
      style={{
        position: "absolute",
        left: `${u * 100 - 30}%`,
        top: `${y * 100}%`,
        width: "60%",
        height,
        translate: "0 -50%",
        rotate: `${tilt}deg`,
        background: `linear-gradient(90deg, rgba(59,225,255,0) 0%, rgba(59,225,255,${0.1 * opacity}) 35%, rgba(214,240,255,${0.3 * opacity}) 50%, rgba(42,127,255,${0.1 * opacity}) 65%, rgba(42,127,255,0) 100%)`,
        filter: "blur(46px)",
        opacity: fade,
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}
    />
  );
};

/** A hairline that draws across the frame and retracts — a graphic accent, AE-style. */
export const RuleWipe: React.FC<{ at: number; y?: number; width?: number; dur?: number; hold?: number }> = ({
  at,
  y = 0.5,
  width = 520,
  dur = 12,
  hold = 40,
}) => {
  const frame = useCurrentFrame();
  const draw = prog(frame, at, at + dur, EASE.out);
  const close = prog(frame, at + hold, at + hold + dur, EASE.in);
  if (frame < at) return null;
  return (
    <div style={{ position: "absolute", left: "50%", top: `${y * 100}%`, width, height: 1, translate: "-50% 0", overflow: "hidden" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(90deg, rgba(59,225,255,0), ${C.accent}, rgba(42,127,255,0))`,
          scale: `${draw - close} 1`,
          transformOrigin: close > 0 ? "right center" : "left center",
          boxShadow: `0 0 12px ${C.accent}`,
        }}
      />
    </div>
  );
};