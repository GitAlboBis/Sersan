/**
 * Bench for the set pieces, one per 30-frame window, each shot from the
 * distance the film actually views it from. Rendering a piece in isolation is
 * the only reliable way to tell "too dim" apart from "the camera is inside it".
 *
 *   0- 29  Tangle     — camera flying through the middle
 *  30- 59  PanelWall  — camera on the axis, surrounded
 *  60- 89  Assembly   — camera inside the structure
 *  90-119  NodeSphere — camera OUTSIDE, orbiting
 * 120-149  Converge   — camera at the mouth of the field
 */
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "./theme";
import { EASE, ramp } from "./anim";
import { CameraRig } from "./three/CameraRig";
import { Starfield } from "./three/Starfield";
import { Tangle } from "./three/Tangle";
import { PanelWall } from "./three/PanelWall";
import { Assembly } from "./three/Assembly";
import { NodeSphere } from "./three/NodeSphere";
import { Converge } from "./three/Converge";
import { Grain, Vignette } from "./ui/Grain";

export const Lab: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = frame / fps;
  const slot = Math.floor(frame / 30);
  const u = (frame % 30) / 30;

  return (
    <AbsoluteFill style={{ background: C.black }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 44, position: [0, 0, 10] }} gl={{ antialias: true, alpha: true }}>
        <Starfield time={t} viewportHeight={height} opacity={0.4} count={1800} inner={26} outer={90} />

        {slot === 0 && (
          <>
            <CameraRig position={[0.5, 0.3, ramp(u, 0, 1, 14, -6, EASE.sine)]} target={[0, 0, -20]} />
            <Tangle time={t} chaos={1} radius={9} length={38} opacity={1} />
          </>
        )}
        {slot === 1 && (
          <>
            <CameraRig position={[0.4, 0.2, ramp(u, 0, 1, 26, -8, EASE.sine)]} target={[0, 0, -20]} />
            <PanelWall time={t} sweep={ramp(u, 0, 1, -0.05, 1.12, EASE.soft)} cols={14} rows={5} radius={11} opacity={1} />
          </>
        )}
        {slot === 2 && (
          <>
            <CameraRig position={[1, 1.2, ramp(u, 0, 1, 22, -4, EASE.sine)]} target={[0, 0, -14]} />
            <Assembly time={t} assemble={ramp(u, 0, 1, 0, 1, EASE.out)} size={26} opacity={1} />
          </>
        )}
        {slot === 3 && (
          <>
            <CameraRig position={[ramp(u, 0, 1, 9, -9, EASE.sine), 1.5, 19]} target={[0, 0, 0]} />
            <NodeSphere time={t} build={ramp(u, 0, 1, 0, 1, EASE.out)} viewportHeight={height} radius={8} opacity={1} />
          </>
        )}
        {slot === 4 && (
          <>
            <CameraRig position={[0, 0, ramp(u, 0, 1, 12, -2, EASE.sine)]} target={[0, 0, -40]} />
            <Converge time={t} focus={ramp(u, 0, 1, 0, 1, EASE.soft)} viewportHeight={height} spread={14} depth={52} opacity={1} />
          </>
        )}
      </ThreeCanvas>
      <Vignette strength={0.66} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
