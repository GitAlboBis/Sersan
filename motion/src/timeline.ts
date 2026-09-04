/**
 * The film's timeline. Fifteen beats, ~32 s at 30 fps, HARD CUTS throughout.
 *
 * The grammar alternates: an OBJECT beat carries the picture with no words on
 * it, then a TEXT beat where a short phrase speaks itself word by word in the
 * middle of the frame. That is what makes it read as an ad rather than a page,
 * and it leaves clean room for a voiceover.
 */
export const FPS = 30;

export type SceneId =
  | "open"
  | "shell"
  | "claim"
  | "problemObj"
  | "problemTxt"
  | "scopeObj"
  | "scopeTxt"
  | "buildObj"
  | "buildTxt"
  | "services"
  | "proofObj"
  | "proofTxt"
  | "thesis"
  | "cta"
  | "end";

export const SCENES: { id: SceneId; dur: number; name: string }[] = [
  { id: "open", dur: 36, name: "01 · Ignition" },
  { id: "shell", dur: 60, name: "02 · The signature shot" },
  { id: "claim", dur: 78, name: "03 · The claim" },
  { id: "problemObj", dur: 48, name: "04 · Disorder" },
  { id: "problemTxt", dur: 66, name: "05 · One problem" },
  { id: "scopeObj", dur: 48, name: "06 · Sorting" },
  { id: "scopeTxt", dur: 78, name: "07 · Scope" },
  { id: "buildObj", dur: 66, name: "08 · Order" },
  { id: "buildTxt", dur: 60, name: "09 · Build" },
  { id: "services", dur: 84, name: "10 · What we do" },
  { id: "proofObj", dur: 48, name: "11 · The mark, revealed" },
  { id: "proofTxt", dur: 60, name: "12 · Proof" },
  { id: "thesis", dur: 60, name: "13 · Thesis" },
  { id: "cta", dur: 84, name: "14 · The offer" },
  { id: "end", dur: 96, name: "15 · End card" },
];

/** Composition frame at which a scene begins. */
export const sceneStart = (id: SceneId): number => {
  let f = 0;
  for (const s of SCENES) {
    if (s.id === id) return f;
    f += s.dur;
  }
  return f;
};

/** Composition frame = start of `id` + offset. */
export const at = (id: SceneId, offset = 0) => sceneStart(id) + offset;

export const TOTAL_FRAMES = SCENES.reduce((acc, s) => acc + s.dur, 0);

export const sceneDur = (id: SceneId) => SCENES.find((s) => s.id === id)!.dur;