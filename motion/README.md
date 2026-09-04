# Sersan brand film (Remotion + React Three Fiber)

A ~32 s cinematic brand film for SERSAN, rendered by the same stack as the
site (React, three.js, R3F). Fifteen hard-cut beats, 1920x1080 @ 30 fps,
procedural sound design, no stock assets.

## Run

```bash
npm i                # once
npm run dev          # Remotion Studio — SersanFilm + one composition per beat
npm run render       # -> out/sersan-film.mp4 (H.264, CRF 17, WebGL via ANGLE)
npm run render:audio # -> out/qa/mix.wav, then: node tools/loudness.mjs out/qa/mix.wav
npm run stills -- S5-build:14,40,95     # stills for any composition/frame (STILL_SCALE=0.5 for half size)
npm run sfx          # regenerate public/sfx/*.wav (deterministic)
```

Renders must run locally with WebGL (`Config.setChromiumOpenGlRenderer("angle")`
is set in `remotion.config.ts`). Do not render on Lambda.

## The grammar

Modelled on two reference ads: **pure black, one idea per frame, centred,
hard cuts every 1.5-4 s, the camera always moving close to a hero object,
large centred type with a bloom.** No dissolves anywhere. Every beat opens
with a 5-frame `Punch` (a scale-and-blur snap) so a cut lands as an impact.

Beats ALTERNATE: an object beat carries the picture with no words on it, then
a text beat where one short phrase speaks itself word by word in the middle of
the frame (see src/ui/Spoken.tsx). That leaves clean room for a voiceover.

| # | Beat | Kind | What is on screen |
| --- | --- | --- | --- |
| 01 | Ignition | object | the spore mark rushes in from depth |
| 02 | The crust explodes | object | the crust leaves the body for the orbiting shell, the site hero |
| 03 | The claim | text | We build the software / your business is missing. |
| 04 | The broken stone | object | the fractured stone turning close to camera |
| 05 | One problem | text | It starts with one problem worth solving. |
| 06 | The net | object | the neural ribbon composing ahead of the camera |
| 07 | Scope | text | We find what should not be built / before code becomes debt. |
| 08 | The build burst | object | the crust bursts off the body and draws back |
| 09 | Build | text | Then we design and build the system. |
| 10 | What we do | object | four glass tiles snap into a row in depth |
| 11 | The stone holds | object | the intact stone with the mark alight inside it |
| 12 | Proof | text | Working software is the only proof. |
| 13 | Thesis | text | AI where it earns its place. |
| 14 | The offer | text | Bring us the problem. / We will bring the plan. plus the CTA |
| 15 | End card | lockup | mark, wordmark, rule, signature line, sersan.io |

## Structure

| Path | What |
| --- | --- |
| `src/SersanFilm.tsx` | the film: a `TransitionSeries` of the ten beats + `SoundDesign` |
| `src/timeline.ts` | beat durations and `at(scene, offset)` for audio cues |
| `src/scenes/` | ObjectBeats (six 3D beats), TextBeats (six spoken beats), Services, Cta, EndCard |
| `src/ui/Spoken.tsx` | the spoken line: words arrive one at a time, the block stays optically centred |
| `src/three/SporeMark.tsx` | the mark as the site's WebGPU hero really renders it: tens of thousands of instanced lit spheres over a dark occluder, with the shell burst |
| `src/three/CrystalGlass.tsx` | the ice: refraction with dispersion, Fresnel rim, per-facet jitter, key glint |
| `src/three/` | `Crystal` (site GLBs, shard split), `Neural`, `HaloRing`, `Starfield`, `Env`/`envTexture`, `CameraRig` |
| `src/ui/` | `Type` (decoder eyebrow, word-mask headline, wordmark), `Punch`/`Stage`, `GlassCard`, `Grain`/`Vignette`/`BottomScrim` |
| `src/audio/` | `Sfx` helper + `SoundDesign` cue sheet |
| `tools/synth-sfx.mjs` | pure-Node synth for every WAV |
| `tools/loudness.mjs` | peak / RMS / per-second report for a rendered mix |
| `public/` | brand SVGs, fonts and GLBs copied from the site repo |

## Rules baked in

- Copy is verbatim from the live site (`src/data/copy.ts`, home sections). No prior-employer numbers, no "book a call", no price, no ISO claims.
- Palette: black `#03070E`, navy `#0B1422`, ink `#F4F6FA`, cyan `#3BE1FF` to blue `#2A7FFF`. No violet, no warm tones.
- The end-card mark is the exact brand SVG, never redrawn; wordmark in Sersan Display at tracking 0.18em.
- Every animation is a pure function of the frame: no `useFrame`, no wall clock, seeded RNG everywhere.
- Audio peaks near -1.5 dBFS with no limiter in the chain; `MASTER` in `src/audio/Sfx.tsx` trims the whole palette.

## Gotchas

- `@remotion/three` renders with a manual frame loop: anything loaded asynchronously (a GLB) must `advance()` the R3F scene before `continueRender()` — see `useGltfGeometry` in `src/three/Crystal.tsx`.
- Cameras look down -Z: `CameraRig` uses `camera.lookAt`, not an `Object3D` proxy.
- The crystal shader reads `aFacet`; GLTFLoader lowercases the GLB's `_FACET` semantic, so it is renamed on load.