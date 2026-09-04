/**
 * 15 · END CARD — the corridor darkens and the lockup takes the frame: the
 * exact brand SVG (never redrawn), SERSAN in Sersan Display, a 240 px
 * cyan-to-blue rule, the signature line and sersan.io. This is the second and
 * last time the mark appears in the film.
 */
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { FONT } from "../fonts";
import { EASE, prog, ramp } from "../anim";
import { Bloom } from "../ui/Grain";

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const veil = prog(frame, 0, 26, EASE.soft);
  const mark = prog(frame, 10, 30, EASE.soft);
  const rule = prog(frame, 32, 44, EASE.soft);
  const tag1 = prog(frame, 40, 54);
  const tag2 = prog(frame, 46, 60);
  const url = prog(frame, 54, 68);
  const glow = ramp(frame, 8, 42, 0, 1, EASE.soft);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* the world does not cut away, it falls dark behind the lockup */}
      <AbsoluteFill style={{ background: C.black, opacity: 0.94 * veil }} />
      <Bloom x={960} y={430} size={900} opacity={0.09 * glow} />
      <div style={{ position: "absolute", left: 960 - 150, top: 430 - 150, width: 300, height: 300, opacity: mark, scale: String(1.06 - 0.06 * mark), filter: `blur(${(1 - mark) * 12}px)` }}>
        <Img src={staticFile("brand/sersan-logo-brand.svg")} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 596,
          textAlign: "center",
          fontFamily: FONT.brand,
          fontWeight: 300,
          fontSize: 64,
          letterSpacing: "0.18em",
          textIndent: "0.18em",
          color: C.ink,
          opacity: prog(frame, 20, 44, EASE.soft),
          filter: `blur(${(1 - prog(frame, 20, 44, EASE.soft)) * 8}px)`,
        }}
      >
        SERSAN
      </div>
      <div style={{ position: "absolute", left: 960 - 120, top: 700, width: 240, height: 1, overflow: "hidden" }}>
        <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #3BE1FF, #2A7FFF)", scale: `${rule} 1`, transformOrigin: "left center" }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 742, textAlign: "center", fontFamily: FONT.display, fontWeight: 400, fontSize: 36, lineHeight: 1.28, letterSpacing: "-0.015em", color: C.ink }}>
        <div style={{ opacity: tag1, translate: `0 ${(1 - tag1) * 12}px` }}>The intelligence is artificial.</div>
        <div style={{ opacity: tag2, translate: `0 ${(1 - tag2) * 12}px`, fontStyle: "italic", color: C.accent }}>The judgement stays human.</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 866, textAlign: "center", fontFamily: FONT.sans, fontWeight: 400, fontSize: 30, color: C.inkMute, opacity: url }}>sersan.io</div>
    </AbsoluteFill>
  );
};