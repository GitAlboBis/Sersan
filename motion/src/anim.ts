/**
 * Motion vocabulary. One personality for the whole film: PREMIUM —
 * 0 % overshoot, long decelerating entrances, quick accelerating exits,
 * cubic in-out for camera legs (the site's preloader uses a single cubic
 * in-out per channel — no sub-curves).
 */
import { Easing, interpolate } from "remotion";

export const EASE = {
  /** expo-like decelerate — entrances, reveals */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** material standard — on-screen changes */
  soft: Easing.bezier(0.4, 0, 0.2, 1),
  /** cubic in-out — camera dollies, pitches */
  camera: Easing.bezier(0.65, 0, 0.35, 1),
  /** accelerate — exits, dismissals */
  in: Easing.bezier(0.7, 0, 0.84, 0),
  /** long, soft glide — the curve for spoken words: no snap, a long settle */
  glide: Easing.bezier(0.22, 0.9, 0.24, 1),
  /** gentle both ends for ambient drift */
  sine: Easing.bezier(0.37, 0, 0.63, 1),
  linear: Easing.linear,
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/** 0→1 progress across a frame window with an easing, clamped both ends. */
export const prog = (frame: number, start: number, end: number, easing = EASE.out) =>
  interpolate(frame, [start, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

/** Value ramp across a frame window, clamped both ends. */
export const ramp = (frame: number, start: number, end: number, from: number, to: number, easing = EASE.out) =>
  interpolate(frame, [start, end], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

/** Rise then fall: 0 at `start`, 1 by `start+inDur`, 1 until `end-outDur`, 0 at `end`. */
export const window01 = (frame: number, start: number, end: number, inDur: number, outDur: number) =>
  interpolate(frame, [start, start + inDur, end - outDur, end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: [EASE.out, EASE.linear, EASE.in],
  }) as number;

/** Seconds → frames for a given fps (rounded). */
export const s = (fps: number) => (seconds: number) => Math.round(seconds * fps);

/** Deterministic hash in [0,1) from integers (for scramble text, jitter). */
export const hash01 = (...ints: number[]) => {
  let h = 2166136261;
  for (const v of ints) {
    h ^= Math.imul(v | 0, 2654435761);
    h = Math.imul(h ^ (h >>> 13), 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
};