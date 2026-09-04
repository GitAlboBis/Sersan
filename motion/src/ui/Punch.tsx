/**
 * Scene chrome shared by every beat.
 *
 * `Punch` IS the cut: the incoming frame arrives scaled a touch large and
 * smeared, settles with a whisper of undershoot, and the frame flares on
 * impact with an anamorphic rip. `Stage` is the centred column.
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";
import { CutFlash, Smear } from "./Fx";

export const Punch: React.FC<{
  children: React.ReactNode;
  dur?: number;
  scale?: number;
  blur?: number;
  background?: string;
  /** 0 disables the exposure pop (the end card lands quietly) */
  flash?: number;
  streak?: boolean;
  /** horizontal whip on the way in, px */
  x?: number;
}> = ({ children, dur = 7, scale = 1.055, blur = 20, background = C.black, flash = 1, streak = true, x = 0 }) => (
  <AbsoluteFill style={{ background }}>
    <Smear dur={dur} blur={blur} scale={scale} x={x}>
      {children}
    </Smear>
    {flash > 0 && <CutFlash strength={flash} streak={streak} />}
  </AbsoluteFill>
);

/** The centred column: content stacks in the middle of the frame, never in a corner. */
export const Stage: React.FC<{ children: React.ReactNode; gap?: number; justify?: "center" | "flex-end" | "flex-start"; padBottom?: number }> = ({
  children,
  gap = 34,
  justify = "center",
  padBottom = 0,
}) => (
  <AbsoluteFill
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: justify,
      gap,
      paddingBottom: padBottom,
      textAlign: "center",
    }}
  >
    {children}
  </AbsoluteFill>
);