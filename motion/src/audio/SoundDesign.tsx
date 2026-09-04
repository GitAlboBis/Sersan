/**
 * Every audio cue on the absolute timeline. A transient on every hard cut, a
 * riser only into the one explosion, and real silence under the thesis line
 * and the end card. Levels are trimmed by MASTER — there is no limiter.
 *
 * The mix deliberately leaves the midrange open: a voiceover will be laid
 * under the spoken beats later.
 */
import { Audio } from "@remotion/media";
import { Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { MASTER, Sfx } from "./Sfx";
import { at, sceneDur, SCENES, TOTAL_FRAMES } from "../timeline";

export const SoundDesign: React.FC = () => {
  const { fps } = useVideoConfig();
  const endStart = at("end");
  return (
    <>
      {/* ambient bed */}
      <Sequence from={0} durationInFrames={Math.min(44 * fps, TOTAL_FRAMES)} layout="none" name="bed">
        <Audio
          src={staticFile("sfx/bed.wav")}
          volume={(f) =>
            interpolate(
              f,
              [0, 14, at("services"), at("services") + 16, at("thesis"), at("thesis") + 14, endStart - 10, endStart + 24],
              [0, 0.58, 0.58, 0.38, 0.38, 0.22, 0.22, 0].map((v) => v * MASTER),
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )
          }
        />
      </Sequence>

      {/* a transient on every hard cut — the cut is the rhythm */}
      {SCENES.slice(1).map((s) => (
        <Sfx key={s.id} name="hard-cut" at={at(s.id)} volume={0.3} />
      ))}

      {/* 01 the mark arrives */}
      <Sfx name="impact-sub-2" at={0} volume={0.45} />
      <Sfx name="shimmer-short" at={2} volume={0.45} />

      {/* 02 the crust explodes */}
      <Sfx name="impact-sub" at={at("shell", 2)} volume={0.5} />
      <Sfx name="ring-boom" at={at("shell", 4)} volume={0.3} />
      <Sfx name="shimmer-long" at={at("shell", 6)} volume={0.26} />

      {/* 04 glass */}
      <Sfx name="impact-glass" at={at("problemObj")} volume={0.42} />
      <Sfx name="whoosh-2" at={at("problemObj", 2)} volume={0.3} />

      {/* 06 the net */}
      <Sfx name="whoosh-3" at={at("scopeObj")} volume={0.34} />
      {[8, 20, 32].map((f, i) => (
        <Sfx key={f} name={i % 2 ? "blip-2" : "blip"} at={at("scopeObj", f)} volume={0.24} />
      ))}
      <Sfx name="pulse-travel" at={at("scopeObj", 14)} volume={0.32} />

      {/* 08 the burst */}
      <Sfx name="riser-short" at={at("buildObj")} volume={0.28} />
      <Sfx name="impact-sub" at={at("buildObj", 14)} volume={0.52} />
      <Sfx name="shimmer" at={at("buildObj", 18)} volume={0.24} />

      {/* 10 the tiles land */}
      {[0, 1, 2, 3].map((i) => (
        <Sfx key={i} name={i % 2 ? "card-snap-2" : "card-snap"} at={at("services", 2 + i * 4 + 22)} volume={0.44} />
      ))}

      {/* 11 the stone holds */}
      <Sfx name="impact-glass-2" at={at("proofObj", 2)} volume={0.38} />

      {/* 14 the offer */}
      <Sfx name="whoosh-1" at={at("cta")} volume={0.32} />
      <Sfx name="tick" at={at("cta", 62)} volume={0.3} />
      <Sfx name="reverse-swell-2" at={endStart - 22} volume={0.46} />

      {/* 15 end — the chord resolves and clears */}
      <Sfx name="end-chord" at={endStart} volume={0.56} maxFrames={sceneDur("end") - 28} />
    </>
  );
};