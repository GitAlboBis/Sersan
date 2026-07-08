# SERSAN — WebGL Upgrade Plan (Codrops-derived, high-end graphics & motion)

> Piano operativo per elevare il livello grafico/animato del sito clonando e
> combinando 6 riferimenti Codrops, **fedele all'architettura esistente**
> (persistent R3F island, WebGPU-first, camera single-authority, Lenis+GSAP).
> Priorità #1 dichiarata dal committente: **le founder/team card** — oggi
> "orribili e di basso livello" — con **3D + movimenti di camera + particelle +
> reti neurali** come cifra stilistica del sito.
>
> Regola trasversale: **non si cancella nulla** senza proposta esplicita. Ogni
> upgrade WebGL è un LAYER additivo sopra il DOM esistente, che resta come
> fallback SSR / reduced-motion / lite / no-WebGPU.

---

## 0. Stato dell'arte (ground truth verificata)

Stack (da `package.json`): Next **16.2.6**, React **19.2.4**, three **0.184**,
`@react-three/fiber` **9.6.1**, `@react-three/drei` **10.7.7**,
`@react-three/postprocessing` 3.0.4, **gsap 3.15**, **lenis 1.3.23**, zustand 5.

Architettura WebGL (verificata leggendo `src/webgl/`):

- **Canvas persistente** (`CanvasHost` → `Scene.tsx`): `fixed inset-0 z-0` dietro
  il DOM (contenuto `z-1`), `pointer-events:none`, `aria-hidden`, clear-color
  trasparento. `frameloop="always"`. Sopravvive ai cambi di route.
- **WebGPU-first**: `webgpuEnabled()` è un flag **build-time**. Sul path ON i
  materiali sono **TSL** (`three/webgpu` + `three/tsl`), che compilano a WGSL
  (WebGPU) e a GLSL (fallback WebGL2). Sul path OFF resta il WebGLRenderer
  classico + `@react-three/postprocessing`; i layer TSL-only **non montano** e il
  DOM è completo da solo.
- **Camera single-authority**: `SignatureLine` scrive `camera.position/quaternion`
  per primo nel pass priority-0; ogni isola decorativa monta **dopo** e usa un
  **billboard camera-locked** (posizione in camera-space a `CAMERA_Z`, quaternion
  = `camera.quaternion`) → registrazione pixel-esatta col DOM sotto **qualsiasi**
  posa di camera. Costanti in `constants.ts` (`CAMERA_FOV 50`, `CAMERA_Z 12`,
  `WORLD_VIEW_HEIGHT`).
- **Regola dura island** (`webgl-island-guidelines.md`, [[r3f-island-commit-wedge]]):
  MAI dipendere da commit React per valori per-frame dentro il Canvas → refs +
  `store.getState()` in `useFrame`; misurare i rect DOM **solo** sui bump di
  `measureVersion`, mai `getBoundingClientRect` nel loop.
- **Rail pinnati**: CSS `position:sticky` + **una** ScrollTrigger che scrubba solo
  `translateX` (NIENTE `pin:` → il pin-spacer rompe le misure `[data-line-anchor]`
  della signature line). Section height = `100vh + travel`, 1px scroll = 1px
  translate.
- **Primitivi riusabili già in repo** (da NON reinventare):
  - `RailPlanes.tsx` + `store/railStore.ts` + `store/railMotion.ts` +
    `materials/railPlaneNodeMaterial.ts` → **template esatto** per piani WebGL
    DOM-sincronizzati (case-studies rail).
  - `NeuralLattice.tsx` + `neural/neuralFieldCompute.ts` +
    `neural/neuralLatticeConfig.ts` + `store/neuralLatticeStore.ts` → **rete
    neurale a particelle** già pronta (hub-orb per card, archi, signal packet,
    hover-flare/burst, compute sim WebGPU) ancorata via camera-lock a una sezione.
  - `DriftParticles`, `ResourcePreviewPlane` + `resourcePreviewNodeMaterial`,
    `SignatureLine`, `PostFXNodes` (selective bloom >1.0), `AdaptiveResolution`
    (DPR adattivo), `tierStore` (full/lite/off + reduced-motion), `pointerStore`,
    `scrollStore`, `getLenis()`.
- **Bloom contract**: emissivo cyan **> 1.0** con `toneMapped:false` viene
  catturato dal selective bloom; tenere il resto **sotto** 1.0.

Palette vincolante: base navy `#0B1422`, testo off-white, accento **cyan
`#3BE1FF` → deep-blue `#2A7FFF`** — **mai violetto** (direttiva permanente,
[[logo-variant-system]]).

---

## 1. I 6 riferimenti Codrops — cosa sono e come si portano

Clonati in `.refs/codrops/` (gitignored, solo analisi). Sintesi tecnica +
strategia di porting sul nostro stack.

| # | Ref | Tecnica essenziale | Porting sul nostro stack |
|---|-----|--------------------|--------------------------|
| 1 | **horizontal-parallax-gallery** (davidfaure) | Rail orizzontale wheel-driven; parallax = UV-shift nel fragment (`uv.x += uParallax`), `uParallax = (elementCenter−vpCenter)/vw · intensity`; camera ortho pixel-perfect; DOM variant con img 125%/`left:-12.5%` counter-translata. | Il pattern è **già implementato** in `railMotion.ts` (t/f center-focus) e nel bleed 112% dei founder. Riusare la formula; la DOM-variant (img 125%, `translate3d(-t·10%)`) è la degradazione no-WebGL / mobile. |
| 2 | **animate-shaders-with-gsap** (biazo) | Piani GL che ombreggiano `<img>` opacity:0; **GSAP tween sugli uniform** (mai CSS). 4 demo: (1) click ripple + wipe grayscale radiale su plane 50×50; (2) **hover cursor-lens** crossfade 2-texture (`influence = 1−smoothstep(0,0.5,dist(uv,uMouse))`); (3) press-hold noise-distorted reveal; (4) rail con **Kawase blur center-focus** per-tile. | Il vincolo island è **naturalmente rispettato** (GSAP muta `material.uniforms.uX.value` su un ref). Sostituire Observer+Raycaster con eventi R3F (`e.uv`). Demo2 → **cursor-lens dei founder**. Demo4 → **DoF blur del work rail**. Tint duotone navy + crest cyan, mai violetto. |
| 3 | **r3f-image-reveal-effect** (colindmg) | Un uniforme `uProgress` (0→1) — **fuori da React** — pilota: maschera alpha = Perlin 3D domain-warped + gradiente radiale che si espande dal centro; vertex ripple con ampiezza `(1−uProgress)`. `CoverUV` per object-fit cover. | Rimappare `uProgress` su una tween GSAP fire-once (in-view) o su rail progress. In TSL: noise + gradiente radiale + `oneMinus(clamp(...))` = alpha. **Rim cyan** sul bordo maschera. → **reveal dei founder**. |
| 4 | **OnScrollFilter** (Codrops/Ottaviani) | **Zero WebGL**: SVG `feTurbulence`→`feDisplacementMap` distorce una **mask** `<circle r=0→final>` scrubbata da ScrollTrigger; **GSAP Flip** riposiziona i titoli; scale 1→1.2 + brightness. | È **già la tecnica del reveal founder attuale** (`founder-boil` filter). Riusare per: metric-reveal path-morph nel work rail, thumbnail reveal `/resources`. Landmine: id SVG globali → `useId()`; niente reparent DOM (React lo possiede) → usare Flip con placeholder. Vive nel DOM, fuori dall'island. |
| 5 | **inline: Motion horizontal-scroll + GSAP POV-pan** | (a) `motion` `scroll()` che trasla un `<ul>` di `-(*100vw)`; (b) `motionPath` che fa panare un `<image>` fisso lungo path SVG con `quickTo` lag. | (a) coperto dai nostri rail sticky Lenis+ScrollTrigger. (b) **già implementato** ("services POV pan", commit 9582082). Nessun nuovo lavoro strutturale. |
| 6 | **webgl-carousel** (supahfunk) | Carosello R3F: `progress` ref (wheel/drag), `gsap.to` per-frame come follower critically-damped; **click-to-fullscreen**: vertex zoom+ripple `cos(angle)·sin(len(uv−.5)·15+uProgress·12)` scala il plane a fullscreen (`CoverUV`); "fake post" = `MeshTransmissionMaterial` fullscreen con `thickness = scrollSpeed` (rifrazione ∝ velocità). | Click-zoom → transizione card→dettaglio (persistent island tiene vivo il plane tra le route). MTM è WebGL-only → su WebGPU sostituire con pass TSL o skip. Drag/wheel già coperti dai rail. |

---

## 2. Roadmap prioritizzata (dove va cosa)

**P1 — FOUNDER / TEAM CARDS (questo intervento).** Combina #3 (reveal noisy
radiale) + #2-demo2 (cursor-lens crossfade) + neural node-graph + #6 (hover
scale/z-lift, camera-feel) + `NeuralLattice`/particelle. Dettaglio in §4.

**P2 — CASE-STUDIES / WORK RAIL.** #2-demo4 (Kawase blur center-focus per-tile,
DoF "focus su una cosa alla volta") + #6 click-to-fullscreen verso la detail page
+ #3 reveal scrubbato per-card. Riusa `RailPlanes`/`railStore` (già DOM-synced).

**P3 — RESOURCES GRID.** #2-demo2 dual-texture hover-lens (cover → texture
"blueprint" cyan) + #4/#3 noisy wipe sul click-into-article. Estende
`ResourcePreviewPlane`.

**P4 — SECTION REVEALS.** #4 displacement wipe organico tra sezioni (audit "six
surfaces", home "WHAT WE REFUSE"); #3 scrub noisy reveal "signal resolving from
noise". Perf-gated (SVG filter = costo CPU/Safari).

**P5 — PAGE TRANSITIONS.** #6 ripple-zoom fullscreen come transizione di route
(il persistent island tiene il plane vivo attraverso `router.push`). Coordinare
con `FlipHandoffOverlay`.

Ogni fase: implement → **QA visivo Chrome** (multi-viewport + console pulita) →
verifica 60fps → commit piccolo.

---

## 3. Vincoli non negoziabili (checklist per ogni fase)

- [ ] **Island rule**: valori per-frame via refs + `store.getState()`; rect solo
      su `measureVersion`.
- [ ] **Camera-locked billboard** per ogni piano DOM-synced (mai world-anchor
      fisso; mai ruotare il gruppo ancora al rect).
- [ ] **Niente `pin:`** — solo CSS sticky + una ScrollTrigger su translateX.
- [ ] **Gating**: layer TSL solo su `pathname===… && tier==='full' && webgpuEnabled()`.
      lite/off/reduced-motion/coarse/≤768px → **solo DOM**, completo e accessibile.
- [ ] **Brand**: cyan `#3BE1FF` → blue `#2A7FFF`, **mai violetto**. Emissivo >1.0
      solo dove serve bloom; resto sotto soglia.
- [ ] **Perf**: DPR cap ≤ 2 (`AdaptiveResolution`), cull off-screen, un solo
      programma per materiale condiviso, texture ridimensionate.
- [ ] **A11y**: DOM leggibile da screen reader (canvas `aria-hidden`), focus,
      contrasto AA, `prefers-reduced-motion` degrada.
- [ ] **Cleanup**: kill ScrollTrigger, `store.reset()`, dispose material/geometry
      su unmount/route change (lo store sopravvive alle route).
- [ ] **Context7 + skill** prima di scrivere codice three/R3F/TSL/GSAP.
- [ ] **Niente delete** senza proposta.

---

## 4R. P1 — RISCRITTA: Particle-Portrait Morph (supersede §4)

> Decisione del committente: la §4 (piano "backdrop" dietro card DOM) è stata
> giudicata troppo timida e **scartata**. La nuova P1 è un **morph a particelle
> dei ritratti**, sulla falsariga delle scritte-particella della hero.
> Riferimenti tecnici studiati: il motore hero `createTextMorphComputeBuild`
> (TSL/WebGPU compute) e `MisterPrada/logo-particles-template` (morph stateless
> `mix(start,target, timing_scaglionato)` + campionamento immagine).

**Concept.** Un unico cloud di ~26k particelle: posizione **e colore**
campionati dai pixel della foto (rilievo z dalla luminanza). Compongono il volto
di **Alessandro**; scrollando la sezione (progress 0→1) esplodono a metà (uSpread
+ turbolenza di transito) e si ricompongono in **Michele**. Il **gruppo** orbita
+ dolly in 3D (mai la camera globale — si rispetta la single-camera-authority
della SignatureLine). Copy DOM dei due founder in cross-fade sincrono col morph.
A 0 e 1 la molla pinna ogni particella sul pixel esatto → volti nitidi; a metà
volo glow cyan che alimenta il bloom. Brand cyan/blu, mai violetto.

**Riuso motore.** `createTextMorphComputeBuild` (gpgpu/gpgpuNodeSim.ts) è
image-agnostic a livello di buffer (consuma `count×3 Float32Array` per target A/B
/C/D, morph scaglionato per-particella, molla+turbolenza, assemble d'entrata,
render sprite additivi HDR). Estensione **additiva**: param opzionale
`portrait?: { colorsA, colorsB, blending, depthTest, depthWrite, emissive }` →
buffer colore per-particella, `vMorphColor = mix(colorsA,colorsB, stagger)` nel
render. Path `undefined` = byte-identico a oggi (hero intatta), da regressare.

**File nuovi:** `webgl/image/sampleImagePoints.ts` (immagine→homes+colore,
sRGB→linear obbligatorio, pesatura luminanza×radiale sul volto, pairing indici
deterministico A↔B), `webgl/store/foundersMorphStore.ts` (globalThis-pinned),
`webgl/FounderPortraitMorph.tsx` (island: orchestrazione da HeroTextParticles,
ancoraggio camera-locked da FounderPlanes; WebGPU-compute mandatorio → altrimenti
`null` e vale il fallback DOM).

**Edit:** `gpgpu/gpgpuNodeSim.ts` (param portrait additivo), `webgl/Scene.tsx`
(monta `<FounderPortraitMorph/>` al posto di `<FounderPlanes/>`, stessi gate,
dopo SignatureLine), `components/sections/founders-rail.tsx` (branch `canMorph` =
stage verticale sticky con morph + cross-fade copy; mantiene il rail orizzontale
DOM per desktop non-webgpu e lo snap-scroller native per mobile/reduced-motion —
tutte le copy/link accessibili).

**Cancellati:** `FounderPlanes.tsx`, `materials/founderPlaneNodeMaterial.ts`,
`store/foundersRailStore.ts`. **Tenuto:** `store/founderMotion.ts` (ancora usato
dal fallback rail orizzontale).

**Perf/fallback.** COUNT_BY_TIER {full:26000, lite:12000}, entrambi i volti
campionati con lo STESSO count (morph index-matched). WebGPU-compute mandatorio
(storage indexing no-op su WebGL2 fallback, three #31221) → island `null` senza.
DPR≤2, getImageData una volta e cache, tick solo in-view (uFade gate) così hero e
founders non dispatchano mai insieme. Fallback DOM completo e accessibile su
non-webgpu / lite / off / reduced-motion / coarse / mobile.

**Camera 3D.** Il "movimento di camera" è orbit+dolly del **gruppo** di
particelle (billboard restano screen-facing, i centri orbitano) + rilievo z reale
dalla luminanza → l'orbita legge come volo attorno a un busto 3D. 0 esatto a
progress 0 e 1 (volto registrato e frontale a riposo).

**Rischi chiave.** (1) editare il motore hero condiviso → additivo + regressione
hero, o fork `createPortraitMorphComputeBuild` se serve isolamento. (2) pairing
indici deterministico e stabile al resample o il morph "scatta". (3) sRGB→linear
load-bearing. (4) orbit/dolly = 0 esatto agli estremi. (5) restyle founders-rail
solo CSS-sticky, mai pin-spacer (waypoint `data-line-anchor=founders`).

---

## 4. [SUPERSEDED] P1 — Founder Cards: spec "backdrop" (scartata, vedi §4R)

**Obiettivo visivo.** I due ritratti (Alessandro / Michele) diventano superfici
WebGL vive: il volto **si materializza dal vuoto navy** con una maschera radiale
rumorosa e un **rim cyan**; passando il cursore, una **lente neurale** rivela
"sotto la pelle" un **grafo di nodi/archi cyan pulsante** (la rete neurale) con
un **tilt 3D verso il cursore** (sensazione di movimento di camera) e un leggero
**scale/z-lift**; attorno alle card fluttuano **particelle** cyan. Il tutto
composto col sistema neural/particellare e col bloom già esistenti.

**Strategia = LAYER additivo.** Il DOM attuale (`founders-rail.tsx`, SVG duotone +
hover clip-path + copy sullo scrim) **resta** come fallback. Su full+webgpu il
media SVG viene reso trasparente e il piano WebGL dietro il canvas lo sostituisce;
copy/scrim/link restano DOM sopra. Modello 1:1 con `RailPlanes` (le case-study
card tengono bg `0.45` e il piano si vede attraverso).

**Robustezza travel≈0.** Con 2 card + intro il rail può avere `travel≈0` su
viewport larghi: quindi il **reveal è fire-once on-in-view** (ScrollTrigger
`onEnter` per card, stagger), NON legato allo scrub. Hover/lente/tilt sono
input-driven e indipendenti dal travel.

### File nuovi

1. **`src/webgl/store/foundersRailStore.ts`** — clone di `railStore.ts`. Campi:
   `pinned, travel, secTop, trackX, progress, velocity, measureVersion` +
   `hover: Record<index, 0|1>` + **`mouse: Record<index,{x,y}>`** (uv nella card,
   0..1) + **`reveal: Record<index, 0|1>`** (target fire-once). Setter idempotenti;
   `reset()`. **GlobalThis-pin** come `neuralLatticeStore` (writer route-bundle /
   reader island lazy → evitare doppia istanza Turbopack).

2. **`src/webgl/store/founderMotion.ts`** — modello analitico condiviso (come
   `railMotion.ts`): `founderCardMotion(centerX, vw) → {t,f,scale,y}` (restrained:
   scale −0.04·f, arco 8px·f²), costante `FOUNDER_TILT_MAX` (rad) per il tilt
   hover, `FOUNDER_LENS_RADIUS`. **Una formula, due consumer** (DOM `founders-rail`
   + `FounderPlanes`) → registrazione garantita.

3. **`src/webgl/materials/founderPlaneNodeMaterial.ts`** — TSL NodeMaterial
   (import da `three/webgpu` + `three/tsl`, verificare i node names contro la
   build come fa `railPlaneNodeMaterial.ts`). Uniform:
   `uTexture, uReveal, uHover, uMouse(vec2), uVelocity, uTime, uReveal, uSeed,
   uFocus, uResolution(vec2 plane px), uImageResolution(vec2)`.
   - **Vertex**: velocity bend `sin(uv.y·π)·uVelocity·amp` (come rail) +
     ripple d'entrata opzionale ampiezza `(1−uReveal)`.
   - **Fragment**:
     1. `coverUv(vUv, uResolution, uImageResolution)` → sample ritratto senza
        stretch (ref #3/#6).
     2. **Reveal**: `strength = noise(warp(uv)) + radial(uv, uReveal)`,
        `alpha = oneMinus(clamp(strength,0,1))`; **rim cyan** = banda su
        `smoothstep` del bordo maschera, emissivo ×~2.2 (>1.0 → bloom).
     3. **Lente neurale** (ref #2-demo2): `influence = oneMinus(smoothstep(0,
        FOUNDER_LENS_RADIUS, dist(uvAspect, uMouseAspect))) · uHover`. Dove
        `influence>0`, `mix(photo → neuralLook)`: `neuralLook` = duotone navy del
        volto + **grafo**: nodi = dot smussati su griglia jitterata (hash),
        archi = linee sottili tra nodi vicini, pulsanti su `uTime`; cyan→blue,
        emissivo >1.0 sui nodi.
     4. **Particelle di contorno**: campo sparso di punti animati (hash + `uTime`)
        cyan sub-soglia attorno al volto, densità ↑ con `uHover`.
     5. **Edge feather** uv (come rail) → nessun bordo netto oltre la card.
   - Reduced-motion: `uReveal=1`, niente boil/ripple, lente statica.
   - `transparent`, `depthWrite/Test=false`, `NormalBlending`, `toneMapped=false`,
     `renderOrder −1` (sul mesh).

4. **`src/webgl/FounderPlanes.tsx`** — clone di `RailPlanes.tsx`:
   - Lazy-import del material factory (fence `webgpuEnabled()`).
   - Misura `[data-founder-card]` su `pinned + measureVersion`; `baseVpX`,
     `offsetY`, `w`, `h`, `index`.
   - **Texture**: `TextureLoader` client-side (nell'island), `colorSpace =
     SRGBColorSpace`, force-fetch (il lazy-load nativo non scatta nei rail
     sticky/overflow — trap documentata in `card-image-distort.tsx`); passare
     `uImageResolution` a load.
   - `useFrame`: placement **camera-locked billboard** (identico a RailPlanes:
     `(cx−vw/2)·k, (ih/2−cy)·k, −CAMERA_Z` → `applyQuaternion(camera.quaternion)
     .add(camera.position)`), scale `w·k·INSET·motion.scale`. **Hover 3D tilt**:
     `mesh.quaternion = camera.quaternion · smallTilt(uMouse→angle, FOUNDER_TILT_MAX,
     damped)` — il "movimento di camera" per-card. **z-lift/scale** su hover
     (damped). Uniform per-frame: `uHover, uMouse, uVelocity, uReveal(damped verso
     store.reveal[index]), uTime, uFocus=motion.f`.
   - Cull off-screen; dispose material/geometry in cleanup; dev handle
     `__sersanFounderPlanes` (project→screen per QA registrazione).

### Wiring

5. **`src/components/sections/founders-rail.tsx`**:
   - Aggiungere `data-founder-card` + `data-rail-index={i}` su ogni `<article>`,
     `data-founders-sticky` sul frame sticky.
   - Rilevare `full+webgpu` (via `tierStore` + `webgpuEnabled()`): se attivo,
     **nascondere il media SVG** (portrait) mantenendo scrim + copy + link
     (aggiungere `data-webgl-active` che imposta `opacity:0` sul `[data-founder-media]`
     via classe); **altrimenti** lasciare l'attuale SVG duotone intatto.
   - Scrivere `foundersRailStore` da: `measure()` (`setLayout(travel, secTop)` +
     `bumpMeasure()`), ScrollTrigger `onUpdate` (`setTrack(trackX, progress,
     velocity)`), pointer handlers sull'article (`setMouse(index,{x,y})` uv +
     `setHover(index,1/0)`), e `setReveal(index,1)` da una ScrollTrigger
     `onEnter` fire-once per card. `setPinned(true)` in pinned mode; `reset()` in
     cleanup.
   - Il tilt/hover pointer arriva dal DOM (canvas è `pointer-events:none`):
     l'article resta il proprietario dell'hover (già così) e scrive lo store.

6. **`src/webgl/Scene.tsx`**: montare `{pathname === "/" && tier === "full" &&
   webgpu && <FounderPlanes />}` **dopo** `SignatureLine` (accanto a
   `RailPlanes`), stesso gate.

### Elemento "rete neurale" esplicito (particelle + neural net)

Due opzioni, entrambe fedeli:
- **(A) In-material** (scelta per questo turno): il grafo nodi/archi + le
  particelle di contorno vivono nel `founderPlaneNodeMaterial` (§4.3). Zero nuovi
  sistemi, effetto immediatamente sopra il ritratto.
- **(B) Follow-up**: generalizzare `NeuralLattice` da 3 a N hub e montare una
  costellazione a 2 hub ancorata alla sezione founders (`data-lattice-anchor="founders"`,
  `data-lattice-node="founders:0|1"`), riusando il compute WebGPU + hover-flare/burst
  già pronti. Nota in §6.

### Asset

I ritratti in `/public/founders/*.webp` sono in realtà **JPEG landscape
1920×1280 (~1.9/3.0MB)**, caricati 2× per card. `coverUv` gestisce l'aspect, ma
per la texture GPU: **ri-encodare** a WebP verticale ~1000×1400 (crop portrait)
< 300KB. Follow-up perf (non blocca il funzionamento).

### Definition of Done (P1)

- Su Chrome desktop (full+webgpu): reveal noisy dal navy + rim cyan; hover →
  lente neurale con grafo pulsante + tilt 3D + scale/z-lift; particelle cyan di
  contorno; registrazione pixel col rect DOM sotto ogni posa camera; 60fps;
  console pulita; bloom cattura solo nodi/rim.
- Su lite/off/reduced-motion/mobile: card DOM attuale **identica** e completa.
- Copy/link/scrim invariati e accessibili; `reset()` pulito al cambio route.
- Nessun file cancellato; DOM fallback preservato.

---

## 5. Metodo di lavoro (agenti)

- Implementazione via sub-agent **`trellis-implement`** (Fable 5, effort alto),
  verifica via **`trellis-check`** (Fable 5). Main session guida il commit.
- QA visivo con Claude-in-Chrome (screenshot multi-viewport, console).
- Context7 per API three/R3F/TSL correnti; skill `threejs-shaders` /
  `scroll-experience` / `high-end-visual-design` per tecnica e qualità.

## 6. Follow-up tracciati

- (B) `NeuralLattice` N-hub → costellazione founders a 2 hub.
- Ri-encode ritratti WebP verticali < 300KB.
- P2 work rail: Kawase DoF blur + click-to-fullscreen detail.
- P3 resources dual-texture lens; P4 section wipes; P5 route ripple-zoom.
- Valutare MTM (ref #6) solo su path WebGL o pass TSL equivalente su WebGPU.
