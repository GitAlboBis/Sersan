/**
 * SPACE — the ground the corridor hangs in.
 *
 * Two slow clouds of deep blue light and a wash of navy, drifting on their
 * own clock behind the WebGL layer (the canvas clears transparent, so this
 * shows through). It costs nothing and it is the difference between "objects
 * on black" and "objects somewhere".
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";

export const SpaceBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const x1 = 28 + Math.sin(t * 0.05) * 9;
  const y1 = 34 + Math.cos(t * 0.041) * 7;
  const x2 = 74 + Math.cos(t * 0.037) * 8;
  const y2 = 66 + Math.sin(t * 0.047) * 6;
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 58% 52% at ${x1}% ${y1}%, rgba(20,54,102,0.5) 0%, rgba(12,30,60,0.22) 42%, rgba(3,7,14,0) 72%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 46% 44% at ${x2}% ${y2}%, rgba(14,62,96,0.36) 0%, rgba(8,28,52,0.16) 45%, rgba(3,7,14,0) 74%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(11,20,34,0.35) 0%, rgba(3,7,14,0.7) 70%, rgba(3,7,14,0.92) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};