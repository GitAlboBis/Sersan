/**
 * Cinematic finish layers: animated film grain (SVG turbulence tile that
 * jumps position every frame) and a navy vignette. Pure CSS, deterministic.
 */
import { AbsoluteFill, useCurrentFrame } from "remotion";

const NOISE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch' seed='11'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.85 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
const NOISE_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(NOISE_SVG)}")`;

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.075 }) => {
  const frame = useCurrentFrame();
  const ox = (frame * 97) % 320;
  const oy = (frame * 61) % 320;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        backgroundImage: NOISE_URL,
        backgroundPosition: `${ox}px ${oy}px`,
        opacity,
        mixBlendMode: "overlay",
      }}
    />
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.62 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: `radial-gradient(ellipse 78% 72% at 50% 50%, rgba(3,7,14,0) 40%, rgba(3,7,14,${strength}) 100%)`,
    }}
  />
);

/** Soft light bloom behind a focal point (DOM layer). */
export const Bloom: React.FC<{ x: number; y: number; size: number; color?: string; opacity?: number }> = ({
  x,
  y,
  size,
  color = "59,225,255",
  opacity = 0.35,
}) => (
  <div
    style={{
      position: "absolute",
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      borderRadius: "50%",
      background: `radial-gradient(circle, rgba(${color},${opacity}) 0%, rgba(${color},${opacity * 0.35}) 30%, rgba(${color},0) 70%)`,
      pointerEvents: "none",
    }}
  />
);
/** A floor under the type on 3D beats: the frame darkens toward the bottom so a centred line always has contrast. */
export const BottomScrim: React.FC<{ height?: number; strength?: number }> = ({ height = 460, strength = 0.9 }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height,
      background: `linear-gradient(180deg, rgba(3,7,14,0) 0%, rgba(3,7,14,${strength * 0.6}) 45%, rgba(3,7,14,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);