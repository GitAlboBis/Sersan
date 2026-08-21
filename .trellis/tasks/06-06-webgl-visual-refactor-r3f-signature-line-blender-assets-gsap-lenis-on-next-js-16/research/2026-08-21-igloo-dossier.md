# IGLOO.INC — Reverse-Engineering Dossier (2026-08-21)

Sources: Awwwards case study + SOTD page, WebGPU.com breakdown, three.js forum, abeto on X,
plus the LIVE production bundles (`index-2eb69c09.js` 16KB loader + `App3D-f554a111.js` 1.49MB)
fetched and string-mined 2026-08-21 — much of this is first-hand from shipped code. Complements
the live crawl (screenshots) done the same day in-session.

**Who/what:** Corporate landing for Igloo Inc. (parent of Pudgy Penguins). Built by **Abeto**
(Vicente Lucendo, Peter Lobanov) with **Bureaux** (art direction). Awwwards SOTD Jul 23 2024 →
**Site of the Year + Developer Site of the Year 2024**. Stack: Three.js + three-mesh-bvh +
Svelte + GSAP + Vite, vanilla JS; Houdini + Blender assets.

## 1. Page structure / journey
One route, one canvas, `<body>` essentially empty — DOM holds only the preloader. WebGL router:
`scene:"home"` / `scene:"project"`. Home = three stacked world scenes (`igloo`, `cubes`,
`entry`), each with its own composer, + `detailScene` + `uiScene` pass.
1. **ASCII preloader** — DOM `#loader`, bg `#A0A5B1`, centered `.ascii`.
2. **Igloo hero** — snowy terrain; igloo materializes from particles (`uIntroMaterialize`).
   UI: "Scroll down to discover." + Manifesto `"////// Manifesto"` (Community, AI, crypto).
3. **Descent ("entry")** — dive under the igloo down an ice tunnel into a glowing cavern:
   `Tunnel`, `TextCylinder` (copy wrapped around the shaft), `LightRoom`, `Plasma`, `Rings`,
   `RingForcefield`, smoke layers. Warm gold hexes (#cda05e/#ab8349/#904619) only at the core.
4. **Portfolio cubes** — three floating procedural ice cubes, terminal-labelled
   `PORTFOLIO_CO_01 Pudgy Penguins` (`temp:0`), `_02 Overpass` (`temp:-3`), `_03 Abstract`
   (`temp:-5`); hover "Click to explore" (locked: `???????????????`). Click → detail room
   (`////// Summary`, `/// Discover`, `/// Visit`, `Close`) which blocks navigation until Close.
5. **Footer** — logo + `/// Follow Us`; LinkedIn/X/Medium each bound to a VDB volume
   (`peachesbody_64`, `x_64`, `medium_32`): the particle cloud RESHAPES into that form on hover.
   Audio: bg music muted by default, wind, per-action UI beeps.

## 2. Design language
- **Type:** ONE family — IBM Plex Mono (Regular+Medium). Everything mono, terminal-flavoured.
  UI text MSDF-rendered IN WebGL (`IBMPlexMono-Medium-datatexture.ktx2`); icons are SDF textures.
- **Terminal chrome:** slash prefixes (`//////`, `///`, `//`), ALL-CAPS ledger labels,
  dates + temperature readouts, `???????` redaction for locked items, ASCII `-=+` ticker.
- **Palette:** fog grey `#A0A5B1` ground (`#b6bac5`/`#383e4e` per Awwwards); `colorTitle
  #3C3C54`, text/logo #fff, project title #67707E, text #A1AAB7; frost #83a1c5; pale blues
  #e1e6f1/#d1e3ff; warm gold reserved for the core. Bright-fog day look.
- **Layout:** text on a fixed grid (`gridSize:125`/50/25; topMargin 90/45/25; breakpoints
  1600/800/640) drawn in-scene so type sits in the fog and receives the same post.

## 3. Signature effects — how they're built
- **ASCII loader = pure CSS**: `.ascii:before` mono bold 17px white + text-shadow; a 5s
  infinite `@keyframes head` swaps `content` at every 1% step, marching a 10-char `-=+`
  pattern one glyph per step. Zero JS.
- **Scroll-baked transitions**: composite pass takes `tScene1`, `tScene2`,
  `tScroll: scroll-datatexture.ktx2` + `uProgress`, `uProgressVel`, `tFrost` — a baked data
  texture shapes the per-pixel WIPE between world scenes; `frost-datatexture.ktx2` drives the
  ice-crystal dissolve; chromatic aberration weighted by scroll VELOCITY.
- **Ice material**: hand-rolled transmission — N refraction samples at per-channel IOR offset
  (`uChromaticAberration`), `uThickness`/`uAttenuationDistance`, blue-noise jitter. Crystals
  procedurally grown in Houdini.
- **VDB particle footer**: custom VDB→browser exporter ("smaller than a typical website
  image"); hover retargets the swirl; color shifts with particle velocity.
- **Full Navier-Stokes GPU fluid** (advection, curl/vorticity, Jacobi pressure) — cursor
  smears frost/mist across the cubes view like breath on glass.
- **Post stack**: selective Bloom (6 levels, threshold 0.2, radius 0.85), DoF (CoC + bokeh
  kernel), god rays, FXAA, color-correction pass, caustics/wind noise. Camera fov 30,
  CONSTANT micro-shake 0.01 + mouse displacement (.07,.025).
- **Performance**: all KTX2/Basis, Draco meshes, BVH raycasting, **adaptive DPR governor**
  starting at DPR 1 watching rolling FPS, idle-task scheduler. LCP ≈ 1s despite payload.

## 4. Scroll grammar
Virtual scroll feeds **paused GSAP timelines scrubbed via `timeline.progress(x)`** each frame
(primed `.progress(1);.progress(0)`). Scroll = dolly along a fixed camera rail per scene
(`power1.inOut` beats ~14s of timeline each); scene boundaries fire the data-texture wipe.
Text beats sparse and diegetic — copy punctuates, never narrates. The loop auto-centers
(infinite scroll wrap).

## 5. Transplantable to SERSAN (DOM-owns-text stays!)
1. CSS-content ASCII ticker preloader (swap `-=+` for SERSAN glyphs, JetBrains Mono) — free.
2. Baked scroll-data-texture wipes between section scenes in ONE TSL post pass (persistent
   canvas + Lenis progress map cleanly).
3. Scroll-scrubbed paused GSAP timelines (`.progress()` from Lenis) — one rail per section.
4. Terminal ledger grammar for the mono eyebrow layer (`//////` prefixes, indexed labels,
   readouts, `???????` redaction) — pure DOM.
5. Velocity-weighted chromatic aberration + frost tint keyed to `uProgressVel`.
6. Adaptive DPR via rolling FPS (SERSAN's AdaptiveResolution already does this — validate).
7. Igloo paid for all-WebGL UI (Awwwards accessibility 6.6) — SERSAN's DOM-first split is the
   right call; borrow the fog-integrated LOOK via blend modes, not the architecture.
8. Constant camera micro-shake (0.01) + mouse displacement — cinematic weight on hero scenes.
9. Hover-retargeted particle volumes for footer/social links (upgrade path for spores hero).

Live-crawl additions (same day): callout labels with leader lines that scramble-decode;
blueprint dimension ticks near the cursor on the igloo bricks; ghost depth-blurred type planes
in the fog; dot-grid overlay; datamosh/pixel-sort glitch on carousel transitions; the
fragments→assembly→ring-seal→IGNITE→pass-through convergence finale.
