/**
 * THE WORLD — one flight, six installations.
 *
 * The camera never cuts: it flies a single path from the first frame to the
 * last. But it is not flying through wallpaper. The corridor is a JOURNEY,
 * and each beat is a different installation standing in it — a knot of
 * tangled filaments, a wall of panels being assessed, a structure locking
 * itself together, a sphere of firing nodes, a field pouring into a point.
 *
 * Two rules keep it from turning back into a background:
 *   1. ONE installation is meaningfully visible at a time. Each fades up as
 *      the camera closes on it and is gone once passed (`window` below). The
 *      only thing that persists is the dust, which is air, not a subject.
 *   2. The camera has a DIFFERENT character at each station — a push, an
 *      orbit, a pass-through, a drift inside a structure — so no two beats
 *      move alike even though the flight is continuous.
 *
 * The mark appears twice in the whole film: here at the mouth, and on the end
 * card. Never in between.
 */
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { interpolate } from "remotion";
import { EASE, ramp } from "./anim";
import { CameraRig } from "./three/CameraRig";
import { Starfield } from "./three/Starfield";
import { SolidMark } from "./three/SolidMark";
import { DustStream } from "./three/DustStream";
import { Tangle } from "./three/Tangle";
import { PanelWall } from "./three/PanelWall";
import { Assembly } from "./three/Assembly";
import { NodeSphere } from "./three/NodeSphere";
import { Converge } from "./three/Converge";
import { at } from "./timeline";

/** Where each installation stands on the -Z axis. */
const Z = {
  mark: 0,
  tangle: -42,
  panels: -100,
  assembly: -150,
  sphere: -212,
  focus: -226,
} as const;

type Key = { f: number; pos: [number, number, number]; target: [number, number, number] };

/**
 * The flight. Position AND aim are keyed, so the camera can orbit a thing,
 * bank into a knot, or drift off-axis inside a structure — the variety of
 * MOVE is what stops a continuous take from feeling like a conveyor belt.
 */
const PATH: Key[] = [
  { f: 0, pos: [0, 0, 19], target: [0, 0, 0] },
  { f: at("shell"), pos: [0.6, 0.5, 9.5], target: [0, 0, 0] },
  { f: at("claim"), pos: [3.0, 1.3, 5.2], target: [0.4, 0.2, -4] },
  { f: at("problemObj"), pos: [1.2, 0.7, -14], target: [0, 0, -30] },
  { f: at("problemTxt"), pos: [-1.6, -0.6, -38], target: [0.8, 0.4, -54] },
  { f: at("scopeObj"), pos: [0.5, 0.4, -62], target: [0, 0, -84] },
  { f: at("scopeTxt"), pos: [-0.4, 0.2, -80], target: [0, 0, -104] },
  { f: at("buildObj"), pos: [0.8, 1.0, -124], target: [0, 0, -142] },
  { f: at("buildTxt"), pos: [-1.1, 0.5, -148], target: [2.2, -0.4, -164] },
  { f: at("services"), pos: [0, 0.7, -170], target: [0, 0, -188] },
  { f: at("proofObj"), pos: [4.4, 1.4, -189], target: [0, 0, Z.sphere] },
  { f: at("proofTxt"), pos: [-4.6, 1.0, -197], target: [0, 0, Z.sphere] },
  { f: at("thesis"), pos: [-1.2, 0.4, -218], target: [0, 0, -238] },
  { f: at("cta"), pos: [0, 0, -232], target: [0, 0, -252] },
  { f: at("end"), pos: [0, 0, -242], target: [0, 0, -262] },
  { f: at("end") + 96, pos: [0, 0, -248], target: [0, 0, -268] },
];

const track = (frame: number, pick: (k: Key) => [number, number, number]): [number, number, number] => {
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i];
    const b = PATH[i + 1];
    if (frame <= b.f) {
      const A = pick(a);
      const B = pick(b);
      return [
        ramp(frame, a.f, b.f, A[0], B[0], EASE.sine),
        ramp(frame, a.f, b.f, A[1], B[1], EASE.sine),
        ramp(frame, a.f, b.f, A[2], B[2], EASE.sine),
      ];
    }
  }
  return pick(PATH[PATH.length - 1]);
};

/**
 * How present an installation is, given where the camera is. It rises as the
 * camera closes, holds while alongside, and is gone once behind — so the
 * frame is never carrying two subjects, and nothing lingers as scenery.
 */
const window01 = (camZ: number, centre: number, ahead: number, behind: number) => {
  // d > 0 means the camera has not reached it yet; d < 0 means it is astern.
  // Written as two one-sided ramps rather than one four-stop interpolate
  // because the camera travels toward -Z, and a single range would have to
  // run backwards.
  const d = camZ - centre;
  return d >= 0
    ? interpolate(d, [0, ahead], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : interpolate(-d, [0, behind], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};

export const World: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = frame / fps;

  const pos = track(frame, (k) => k.pos);
  const target = track(frame, (k) => k.target);
  const camZ = pos[2];

  // hand-held: the flight is never perfectly on rails
  const driftX = Math.sin(t * 0.23) * 0.55;
  const driftY = Math.sin(t * 0.17 + 1.1) * 0.34;
  const roll = Math.sin(t * 0.19) * 0.03 + Math.sin(t * 0.41) * 0.012;

  // the mark holds at the mouth of the corridor, then is gone for good
  const markOn = ramp(frame, at("claim") - 30, at("claim") + 4, 1, 0, EASE.soft);
  const markSweep = ramp(frame, 0, at("claim"), -2.6, 2.2, EASE.sine);
  const markSpin = ramp(frame, 0, at("claim"), -1.5, 0.55, EASE.out);

  // each installation is only present around its own station
  const oTangle = window01(camZ, Z.tangle, 44, 26);
  const oPanels = window01(camZ, Z.panels, 46, 28);
  const oAssembly = window01(camZ, Z.assembly, 52, 34);
  const oSphere = window01(camZ, Z.sphere, 50, 24);
  const oConverge = window01(camZ, Z.focus, 38, 40);

  // and each runs its own event as the camera arrives
  const chaos = ramp(frame, at("problemObj") - 30, at("problemObj") + 30, 0, 1, EASE.out);
  const sweep = ramp(frame, at("scopeObj") - 26, at("scopeTxt") + 40, -0.05, 1.12, EASE.soft);
  const assemble = ramp(frame, at("buildObj") - 26, at("buildTxt") + 30, 0, 1, EASE.out);
  const sphereBuild = ramp(frame, at("proofObj") - 30, at("proofTxt") + 20, 0, 1, EASE.out);
  const focus = ramp(frame, at("cta") - 40, at("end") + 40, 0, 1, EASE.soft);

  // the dust thins and thickens with the beat, so even the air is not constant
  const dustOpacity = interpolate(
    frame,
    [0, at("claim"), at("problemObj"), at("scopeObj"), at("buildObj"), at("proofObj"), at("cta"), at("end") + 60],
    [0.35, 1, 0.5, 0.4, 0.35, 0.45, 0.7, 0.2],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 44, position: [0, 0, 19] }} gl={{ antialias: true, alpha: true }}>
      <CameraRig position={[pos[0] + driftX, pos[1] + driftY, camZ]} target={target} roll={roll} />
      <Starfield time={t} viewportHeight={height} opacity={0.5} count={3000} inner={26} outer={110} drift={t * 0.01} />

      {markOn > 0.004 && (
        <SolidMark height={3.4} sweep={markSweep} opacity={markOn} position={[0, 0, Z.mark]} rotation={[0.05, markSpin, 0]} />
      )}

      {/* the air: always there, never the subject */}
      <DustStream time={t} viewportHeight={height} count={2600} length={300} radius={16} speed={0.09} opacity={dustOpacity} position={[0, 0, camZ - 150]} />

      {oTangle > 0.004 && <Tangle time={t} chaos={chaos} opacity={oTangle} count={34} radius={9} length={40} position={[0, 0, Z.tangle]} />}
      {oPanels > 0.004 && <PanelWall time={t} sweep={sweep} cols={16} rows={26} radius={9} opacity={oPanels} position={[0, 0, Z.panels]} />}
      {oAssembly > 0.004 && <Assembly time={t} assemble={assemble} size={26} opacity={oAssembly} position={[0, 0, Z.assembly]} />}
      {oSphere > 0.004 && <NodeSphere time={t} build={sphereBuild} viewportHeight={height} radius={8} nodes={300} linkDist={2.6} opacity={oSphere} position={[0, 0, Z.sphere]} />}
      {oConverge > 0.004 && <Converge time={t} focus={focus} viewportHeight={height} opacity={oConverge} count={2600} spread={34} depth={62} position={[0, 0, Z.focus]} />}
    </ThreeCanvas>
  );
};