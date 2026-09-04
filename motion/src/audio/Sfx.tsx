/**
 * Sound design helpers. Sources are the procedurally generated WAVs in
 * public/sfx (see tools/synth-sfx.mjs). `at` is the composition frame at
 * which the cue starts. MASTER trims the whole palette so stacked transients
 * never reach full scale — there is no limiter in the chain.
 */
import { Audio } from "@remotion/media";
import { interpolate, Sequence, staticFile, useVideoConfig } from "remotion";

export type SfxName =
  | "bed"
  | "riser-long"
  | "riser-short"
  | "riser-tail"
  | "impact-sub"
  | "impact-sub-2"
  | "impact-glass"
  | "impact-glass-2"
  | "whoosh-1"
  | "whoosh-2"
  | "whoosh-3"
  | "shimmer"
  | "shimmer-long"
  | "shimmer-short"
  | "ring-boom"
  | "reverse-swell"
  | "reverse-swell-2"
  | "tick"
  | "tick-low"
  | "key-1"
  | "key-2"
  | "key-3"
  | "blip"
  | "blip-2"
  | "pulse-travel"
  | "pulse-travel-2"
  | "hard-cut"
  | "card-snap"
  | "card-snap-2"
  | "end-chord";

/** Global trim so stacked transients never clip. */
export const MASTER = 0.85;

/** Natural durations (seconds) — lets us declare durationInFrames precisely. */
const DUR: Record<SfxName, number> = {
  bed: 44, "riser-long": 3, "riser-short": 1.3, "riser-tail": 2, "impact-sub": 2.8, "impact-sub-2": 2.4,
  "impact-glass": 2.6, "impact-glass-2": 2.2, "whoosh-1": 1, "whoosh-2": 0.85, "whoosh-3": 1.3, shimmer: 3.2,
  "shimmer-long": 4.6, "shimmer-short": 1.6, "ring-boom": 3.6, "reverse-swell": 1.4, "reverse-swell-2": 1,
  tick: 0.09, "tick-low": 0.09, "key-1": 0.1, "key-2": 0.1, "key-3": 0.1, blip: 0.16, "blip-2": 0.16,
  "pulse-travel": 0.7, "pulse-travel-2": 0.55, "hard-cut": 0.35, "card-snap": 0.28, "card-snap-2": 0.28,
  "end-chord": 6,
};

export const Sfx: React.FC<{
  name: SfxName;
  /** start frame (composition-relative) */
  at: number;
  volume?: number;
  /** playback rate; pitch shifts too */
  rate?: number;
  /** cut the cue short, fading out over its last frames instead of chopping it */
  maxFrames?: number;
}> = ({ name, at, volume = 1, rate = 1, maxFrames }) => {
  const { fps } = useVideoConfig();
  const natural = Math.floor((DUR[name] / rate) * fps);
  const frames = maxFrames ? Math.min(maxFrames, natural) : natural;
  const fade = Math.min(14, Math.floor(frames / 3));
  return (
    <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx · ${name}`}>
      <Audio
        src={staticFile(`sfx/${name}.wav`)}
        volume={(f) =>
          volume *
          MASTER *
          (maxFrames ? interpolate(f, [frames - fade, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1)
        }
        playbackRate={rate}
      />
    </Sequence>
  );
};

/** A run of typing keys at a given cadence (frames per key), alternating three samples. */
export const TypingKeys: React.FC<{ at: number; count: number; every: number; volume?: number }> = ({ at, count, every, volume = 0.5 }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <Sfx key={i} name={(["key-1", "key-2", "key-3"] as const)[i % 3]} at={at + i * every} volume={volume} />
    ))}
  </>
);