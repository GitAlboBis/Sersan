/**
 * The film.
 *
 * ONE continuous world runs underneath for the whole duration — the camera
 * never cuts, it flies. On top of it, the copy arrives in beats: a phrase
 * speaks itself, leaves, and the next place in the corridor is already there.
 * The picture beats are simply the stretches with no words on them.
 */
import { AbsoluteFill, Sequence } from "remotion";
import React from "react";
import { C } from "./theme";
import { SCENES, TOTAL_FRAMES } from "./timeline";
import { World } from "./World";
import { SoundDesign } from "./audio/SoundDesign";
import { BuildTxt, Claim, ProblemTxt, ProofTxt, ScopeTxt, Thesis } from "./scenes/TextBeats";
import { Services } from "./scenes/Services";
import { Cta } from "./scenes/Cta";
import { EndCard } from "./scenes/EndCard";
import { Grain, Vignette } from "./ui/Grain";
import { SpaceBackdrop } from "./ui/SpaceBackdrop";

/** Only the beats that put something on TOP of the world are listed here. */
const OVERLAYS: Partial<Record<string, React.FC>> = {
  claim: Claim,
  problemTxt: ProblemTxt,
  scopeTxt: ScopeTxt,
  buildTxt: BuildTxt,
  services: Services,
  proofTxt: ProofTxt,
  thesis: Thesis,
  cta: Cta,
  end: EndCard,
};

export const SersanFilm: React.FC = () => {
  let f = 0;
  const seqs: React.ReactNode[] = [];
  for (const s of SCENES) {
    const Comp = OVERLAYS[s.id];
    if (Comp) {
      seqs.push(
        <Sequence key={s.id} from={f} durationInFrames={s.dur} name={s.name} layout="none">
          <Comp />
        </Sequence>,
      );
    }
    f += s.dur;
  }
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <SpaceBackdrop />
      <Sequence from={0} durationInFrames={TOTAL_FRAMES} layout="none" name="World">
        <World />
      </Sequence>
      {seqs}
      <Vignette strength={0.7} />
      <Grain opacity={0.05} />
      <SoundDesign />
    </AbsoluteFill>
  );
};