/** 14 · THE OFFER — the last spoken phrase and the one action, over the world. */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, prog } from "../anim";
import { CtaPill } from "../ui/GlassCard";
import { Spoken } from "../ui/Spoken";
import { CutFlash } from "../ui/Fx";
import { Bloom } from "../ui/Grain";

export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = prog(frame, 0, 30, EASE.soft);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <CutFlash strength={0.6} streak={false} tail={2.6} />
      <Bloom x={960} y={520} size={1600} opacity={0.06 * glow} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "44%",
          height: 560,
          translate: "0 -50%",
          background: "radial-gradient(ellipse 52% 40% at 50% 50%, rgba(3,7,14,0.55) 0%, rgba(3,7,14,0.3) 50%, rgba(3,7,14,0) 100%)",
        }}
      />
      <Spoken
        lines={[
          { text: "Bring us the problem.", start: 4, end: 40 },
          { text: "*We'll* *bring* *the* *plan.*", start: 42 },
        ]}
        size={86}
        y={0.44}
        maxWidth={1400}
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: 640, display: "flex", justifyContent: "center" }}>
        <CtaPill label="Send a project brief" start={58} />
      </div>
    </AbsoluteFill>
  );
};