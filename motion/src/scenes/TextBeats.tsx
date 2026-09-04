/**
 * The spoken beats — now pure DOM over the single continuous world.
 *
 * They no longer own a scene: the corridor keeps flying underneath, so a line
 * of copy never interrupts the picture, it lands on top of it. All a text
 * beat adds is a breath of light behind the words and a graphic accent.
 */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, prog } from "../anim";
import { Spoken, SpokenLine } from "../ui/Spoken";
import { CutFlash, RuleWipe } from "../ui/Fx";
import { Bloom } from "../ui/Grain";

/**
 * A scrim only where the words are: the corridor stays visible everywhere
 * else, and the line still has the contrast it needs.
 */
const WordScrim: React.FC<{ y: number; strength?: number }> = ({ y, strength = 0.66 }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: `${y * 100}%`,
      height: 460,
      translate: "0 -50%",
      background: `radial-gradient(ellipse 62% 50% at 50% 50%, rgba(3,7,14,${strength}) 0%, rgba(3,7,14,${strength * 0.7}) 45%, rgba(3,7,14,0) 100%)`,
      pointerEvents: "none",
    }}
  />
);

const Beat: React.FC<{ lines: SpokenLine[]; size?: number; maxWidth?: number; y?: number; rule?: boolean }> = ({
  lines,
  size = 88,
  maxWidth = 1360,
  y = 0.47,
  rule = false,
}) => {
  const frame = useCurrentFrame();
  const glow = prog(frame, 0, 26, EASE.soft);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <CutFlash strength={0.55} streak={false} tail={2.6} />
      <Bloom x={960} y={y * 1080} size={1500} opacity={0.05 * glow} />
      <WordScrim y={y} />
      <Spoken lines={lines} size={size} maxWidth={maxWidth} y={y} />
      {rule && <RuleWipe at={20} y={y + 0.14} width={380} hold={30} />}
    </AbsoluteFill>
  );
};

/** 03 — the claim. */
export const Claim: React.FC = () => (
  <Beat
    lines={[
      { text: "We build the software", start: 4 },
      { text: "your business is *missing.*", start: 38 },
    ]}
    size={96}
    rule
  />
);

/** 05 — the problem. */
export const ProblemTxt: React.FC = () => (
  <Beat lines={[{ text: "It starts with one problem worth solving.", start: 4 }]} size={78} maxWidth={1300} />
);

/** 07 — scope. */
export const ScopeTxt: React.FC = () => (
  <Beat
    lines={[
      { text: "We find what *should* *not* be built", start: 4 },
      { text: "before code becomes debt.", start: 42 },
    ]}
    size={82}
    maxWidth={1400}
  />
);

/** 09 — build. */
export const BuildTxt: React.FC = () => (
  <Beat lines={[{ text: "Then we design and build the system.", start: 4 }]} size={80} maxWidth={1350} rule />
);

/** 12 — proof. */
export const ProofTxt: React.FC = () => (
  <Beat lines={[{ text: "Working software is the only *proof.*", start: 4 }]} size={84} maxWidth={1300} />
);

/** 13 — the thesis. A named brand asset: never reworded. */
export const Thesis: React.FC = () => (
  <Beat lines={[{ text: "AI where it *earns* *its* *place.*", start: 4 }]} size={92} maxWidth={1400} rule />
);