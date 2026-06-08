# ANALISI_LUSION.md — Fase 1

> Analisi profonda di **https://lusion.co/** condotta dal vivo (Chrome MCP, desktop 1920px) + ispezione di DOM, network e bundle, integrata con ricerca tecnica su fonti pubbliche (Codrops, three.js examples, pmndrs).
> Scopo: capire *cosa fa* Lusion, *come* è implementato, e *come lo replico nello stack SERSAN* (Next.js 16 · React 19 · three 0.184 · @react-three/fiber 9.6 · drei 10.7 · @react-three/postprocessing 3.0.4 · GSAP 3.15 · Lenis 1.3 · Tailwind 4).
>
> Nota onestà: il sito attuale di Lusion **non** è più le classiche "curly tubes" a tutto schermo — è l'esperienza **"Tunnels"**, una *journey* scroll-driven attraverso scene 3D. Le curly tubes restano una tecnica-firma del loro repertorio (e compaiono ancora come nastro/tubo qui dentro), perciò le tratto comunque tra gli effetti.

---

## 1. Stack tecnico rilevato (live)

| Area | Rilevato | Note |
|---|---|---|
| **Framework** | **Astro** | Bundle `/_astro/hoisted.*.js`. DOM statico SSR (contenuti/copy presenti dietro il preloader). |
| **Renderer** | **WebGL2** (ANGLE/D3D11) | three.js minificato (REVISION non esposto). **WebGPU non usato** anche se disponibile nel browser. |
| **Canvas** | 3 canvas | Scena principale (~full viewport), un canvas ~54×54 (cursore/effetto puntuale), un secondo layer full-screen → render-target/postprocessing o layer compositing. |
| **Geometrie** | `.buf` binari custom | `grid_structure`, `grid_base`, `tunnel_block_base/wall`, `astronaut_animations`, `earth_card`, `diamond`, `broken_glass(+animation)`, `line_goal`. **NON glTF**: formato packed proprietario. |
| **LOD** | `_ld` / `_hd` | `grid_structure_ld/hd`, `grid_base_ld/hd` → qualità adattiva per device. |
| **Materiali** | **MatCap** | `white_matcap.jpg` → shading stilizzato a basso costo. Texture WebP + greeble `arm/base/nor` (AO/albedo/normal), `earth.webp`, `stickers.png`, `flip_texture.png`. |
| **Audio** | **Sound design `.ogg`** | `hover_0/1/2`, `click_0/1`, `focus_0/1/2`, `page_0/1`, `glass_broken` → feedback audio su hover/click/focus/transizioni/rottura-vetro. Richiede gesture utente (gate "click-to-enter"). |
| **Font** | IBM Plex Mono (Regular/Medium) + **LusionMono.woff2** | Mono per label, contatori, micro-copy; un display sans pesante per i titoli. |
| **Analytics** | GA4 (gtag) | Eventi scroll (`percent_scrolled`). |
| **Asset host** | CDN `lusion.dev` | Asset 3D/audio separati dal dominio del sito. |

**Implicazioni per noi:** la "magia" di Lusion non è una singola libreria esotica — è **WebGL2 standard + art direction estrema + asset pipeline curata (LOD, matcap, audio) + pacing scroll**. È tutto riproducibile nel nostro stack R3F. La leva vera è **direzione + rifinitura**, non tecnologia inaccessibile.

---

## 2. Anatomia dell'esperienza (journey beat-by-beat, dal vivo)

Lo scroll è **virtualizzato/“jacked”** (smooth tipo Lenis, inerziale): un wheel-delta non sposta px nativi ma avanza un valore damped che pilota camera/timeline. La home è una **sequenza cinematografica continua**:

1. **Preloader** (tema nero). Barra di progresso minimal centrata + **contatore percentuale gigante** in basso a sinistra in LusionMono, con **cifre che “rollano”** (numeri cinetici). Caricamento lungo e deliberato (asset pesanti). 
2. **Reveal**: al 100% la barra **si piega/frammenta fino a formare la “L” monogramma** di Lusion → stato **“click-to-enter”** (gesture per sbloccare l’audio). Cinematografico, non un semplice fade.
3. **Flip a tema CHIARO** (off-white/lavanda, testo nero): colpo di scena dopo il nero. Hero claim + nav minimale (`LET'S TALK ·`, `MENU ··`).
4. **“Bold Ideas, Brought to Life”**: **nastro/curly-tube blu** che serpeggia, **card immagine che si deforma/shear** sullo scroll, e un **blob di vetro liquido iridescente** (chromatic/refraction). Pill `OUR APPROACH`.
5. **“PLAY REEL”** (pannello rosso pinnato): il testo `PLAY ▶ REEL` resta fisso mentre il **video di sfondo cicla lo showreel** (mockup AR “soda”, vortice psichedelico, ritratti, UI di tool 3D, claymation). Cornice di **“+” tecnici** (motivo blueprint).
6. **“Featured Work”** (titolone sans nero) + **griglia masonry a 2 colonne**. Ogni card: video/render in loop, tag mono (`WEB • DESIGN • DEVELOPMENT • 3D • ANIMATION`), titolo grande. **Hover → freccia “→”** + **scramble per-carattere** del titolo (nel DOM ogni lettera è duplicata ×4 per l’animazione). Progetti: *Oryzo AI · Of The Oak · Devin AI · Porsche: Dream Machine · Synthetic Human · Meta: Spatial Fusion · Spaace – NFT Marketplace · DDD 2024 · Choo Choo World · Soda Experience* → pill `SEE ALL PROJECTS`.
7. **“Where Creative Ideas Become Immersive Experiences”**: **curly-tube cyan** che attraversa **dentro/dietro** il titolone nero (layering di profondità reale), **mockup tablet** con astronauta che fluttua → l’astronauta **“esce” dal device a tutto schermo** (transizione *device → immersive breakout*).
8. **Finale “Let's work together!”**: l’astronauta (con **visore LED dot-matrix animato**, cambia espressione) fluttua in uno spazio nero pieno di **sticker 3D fisici** (funghi, gemme, smiley, labbra, cuori, pillole, scheletro) + lens-flare. Eyebrow `IS YOUR BIG IDEA READY TO GO WILD?`. Reattivo al puntatore.
9. **Footer** (tema chiaro): `Subscribe to our newsletter` + input email con freccia, indirizzo Bristol (Suite 2, 9 Marsh Street, BS1 4AA, UK), social, `hello@/business@lusion.co`, `©2026 LUSION Creative Studio`, `R&D: labs.lusion.co`, `Built by Lusion with ❤️`, **back-to-top** circolare.
10. **Continuazione cross-page**: sotto il footer una banda nera `KEEP SCROLLING TO LEARN MORE · ABOUT US · NEXT PAGE →` con barra di progresso → **lo scroll prosegue senza stacco nella pagina successiva** (meccanismo di page-transition continua + preload).

**Lettura registica:** alternanza ritmica **buio↔luce**, **fermo↔movimento**, **editoriale↔spettacolo**. Ogni sezione è un “beat” con un solo gesto forte. Il filo conduttore è il **tubo/nastro colorato** + la **camera** che lega tutto. È *esattamente* la logica della nostra signature line — Lusion la spinge a livello scenografico.

---

## 3. Catalogo effetti-firma → piano di replica nel nostro stack

Per ogni effetto: **cosa fa · come è implementato (probabile) · come lo replico in SERSAN · priorità** per un brand AI premium e sobrio (≠ studio chiassoso).

### 3.1 Preloader cinematografico + reveal del monogramma — **PRIORITÀ ALTA**
- **Cosa fa:** barra minimal + contatore mono kinetico; al 100% la barra si trasforma nel logo, poi reveal.
- **Implementazione:** progress reale degli asset (loader three) mappato su una barra DOM/canvas; numeri con “digit roll”; al completamento, morph GSAP della barra→logo, poi curtain di reveal.
- **Replica SERSAN:** abbiamo già preloader+tier system. Aggiungere: contatore mono (JetBrains Mono) con digit-roll, e un **reveal in cui il segmento di caricamento diventa l’inizio della signature line** (riusa la curva esistente). Niente “L”: usiamo il nostro mark `52.`/il primo tratto della linea-segnale. Reduced-motion → fade statico.
- **Costo/rischio:** basso. Altissimo ritorno di percezione “premium”.

### 3.2 Curly tubes / nastro-tubo con scattering — **PRIORITÀ MEDIA (enhancement della linea esistente)**
- **Cosa fa:** tubi/nastri organici che serpeggiano nello spazio e *dentro/dietro* la tipografia, con glow e profondità.
- **Implementazione:** `CatmullRomCurve3` guidata da **curl-noise** (campo divergence-free) → `TubeGeometry`; shader con gradiente + **fresnel rim** + fake-SSS; il glow è in gran parte **bloom** su rim HDR (>1.0, `toneMapped:false`). Rif. Codrops/akella.
- **Replica SERSAN (compone con la nostra `SignatureLine`, NON la sostituisce):**
  - **(A)** Arricchire `lineShader.ts`: aggiungere `fres = pow(1.0 - abs(vViewNormal.z), uFresnelPower)` e termine di scattering (`col += grad*fres*uScatter`) → la linea piatta diventa “gel luminoso”. ~3 ALU, mantiene la selective-bloom per soglia. Opz.: micro-offset curl-noise sui waypoint per il *wobble* organico, restando ancorati alle sezioni.
  - **(B)** Far passare la linea **dentro/dietro** i titoli (layering z + reveal) come Lusion fa col titolone — è gratis sul nostro impianto.
  - **(C — opzionale, full-tier):** `CurlTubeField.tsx` di 12–24 streamline curl-noise *merged* in un’unica geometry, deep z, emissive bassa, dietro al contenuto. Mai chiassoso.
- **Riferimenti:** Codrops “Curly Tubes from the Lusion Website”; akella noise gist; cabbibo/glsl-curl-noise.

### 3.3 Liquid glass / blob iridescente (transmission) — **PRIORITÀ MEDIA**
- **Cosa fa:** elemento di “vetro liquido” cromatico che rifrange lo sfondo.
- **Implementazione:** `MeshTransmissionMaterial`/refraction + chromatic aberration; mesh distorta animata.
- **Replica SERSAN:** drei `MeshTransmissionMaterial` su una piccola mesh-accento (es. vicino all’hero Saturn o a un “oggetto rituale” di sezione), sobrio. Aderisce al nostro “oggetti rituali per route”. Full-tier.

### 3.4 Particellari / GPGPU — **PRIORITÀ MEDIA (accento, non centro)**
- **Cosa fa:** nuvole/sticker/detriti che galleggiano e reagiscono al puntatore.
- **Implementazione:** Lusion qui usa più sticker-fisici/detriti che 1M-particle GPGPU, ma la tecnica GPGPU (FBO ping-pong + curl-noise + repulsione mouse, o WebGPU compute/TSL) è la loro firma storica (“Particle Love”).
- **Replica SERSAN:** abbiamo già `DriftParticles`. Upgrade tasteful: (a) far **brillare le particelle vicino alla testa della signature line** (passare `uHeadPosition`); (b) opzionale campo **GPUComputationRenderer** full-tier con curl-noise + soft pointer-wake, palette navy + accento solo sui picchi di velocità. Fallback mobile/reduced-motion = statico. Mai “screensaver arcobaleno”.
- **Riferimenti:** Codrops GPGPU (2024); Maxime Heckel; three.js `webgl_gpgpu_birds`.

### 3.5 Pointer fluido / cursore — **PRIORITÀ MEDIA**
- **Cosa fa:** il puntatore “increspa”/rifrange leggermente la scena; cursore custom con stati; magnetismo sui CTA; **audio su hover/click**.
- **Implementazione:** **flowmap** (RG = velocità puntatore, dissipazione ~0.96) usata come displacement in un pass di postprocess; NON una Navier-Stokes completa. Cursore DOM + GSAP.
- **Replica SERSAN:** abbiamo già `custom-cursor` + `magnetic`. Aggiungere: `pointerStore` (zustand), `FluidPointer.tsx` (FBO 256–384px, splat+fade in `useFrame`, **una sola** EffectComposer), displacement **prima** del Bloom, `uStrength` minuscolo (~0.005). Stati cursore via `data-cursor`. **Audio opzionale** (hover/click) dietro toggle, off di default per sobrietà enterprise. Full-tier + reduced-motion-safe.
- **Riferimenti:** Codrops “Mouse Flowmap Deformation (OGL)”; PavelDoGreat WebGL-Fluid (solo come ref, non lo adottiamo).

### 3.6 Postprocessing cinematografico — **PRIORITÀ ALTA (bloom/vignette/tone) / MEDIA (DOF/CA/grain)**
- **Cosa fa:** grading filmico: bloom selettivo sull’accento, DOF morbido, vignette, micro chromatic aberration, grana.
- **Disponibilità verificata nei nostri pin:** `postprocessing@6.39.1` + `@react-three/postprocessing@3.0.4` espongono **Bloom, DepthOfField, ChromaticAberration, Vignette, Noise, HueSaturation, ToneMapping, SelectiveBloom, SSAO/N8AO**. **SSR/SSGI NON disponibili** (ok: fuori budget e off-brand; eventuali finte riflessioni con Environment/MeshReflectorMaterial).
- **Replica SERSAN:** abbiamo già Bloom+Noise+Vignette. Stack consigliato (full-tier, `<Canvas flat>` + `HalfFloatType`): Bloom(mipmapBlur, threshold≈1, toneMapped:false sull’accento) → DepthOfField(sottile) → HueSaturation(-0.04) → ChromaticAberration(~0.0005) → Vignette → Noise(0.03) → **ToneMapping ACES/AGX last**. Mobile: solo Bloom+Vignette+ToneMapping, DPR≤1.5. Reduced-motion: grading statico, niente grana animata/Autofocus.
- **Riferimenti:** docs pmndrs react-postprocessing.

### 3.7 Camera scroll-driven lungo curva — **PRIORITÀ ALTA**
- **Cosa fa:** la camera “viaggia” lungo il percorso, `lookAt` puntato leggermente avanti → cinematografico.
- **Implementazione:** `curve.getPointAt(t)` con `t` = scroll damped; `lookAt(getPointAt(t+0.05))`.
- **Replica SERSAN:** siamo all’80%: oggi `SignatureLine` mappa scroll→`camera.position.y` su strip piatto. Promuovere la `CatmullRomCurve3` già costruita a **autorità camera**: prima il **lookAt-ahead** (tilt parallasse, zero rischio leggibilità), poi opzionale ride posizionale full-tier. **Una sola** `useFrame` scrive la camera (no doppie autorità). Per-route gratis (curve già per-route).
- **Riferimenti:** DEPT “cinematic camera path”; three.js forum CatmullRom.

### 3.8 Pinned video reel + cornice blueprint — **PRIORITÀ BASSA/MEDIA**
- **Cosa fa:** player pinnato, sfondo che cicla clip, cornice di “+”.
- **Replica SERSAN:** non abbiamo uno showreel video, ma il pattern “**sezione pinnata con media che cambia sullo scroll**” è utile per **Case Studies** (es. mockup prodotto che si alternano). Pin via ScrollTrigger (già in uso). La cornice “+” è un tocco tecnico coerente col brand.

### 3.9 Tipografia cinetica per-carattere — **PRIORITÀ MEDIA**
- **Cosa fa:** titoli con scramble/roll per-lettera su hover/scroll; titoloni che fanno da “capitoli”.
- **Implementazione:** SplitText (lettere duplicate) + GSAP, stagger guidato da velocità.
- **Replica SERSAN:** abbiamo già `heading-choreographer` (SplitText). Aggiungere: **stagger reattivo alla velocità di scroll** (leggere `scrollStore.velocity`) e micro-scramble mono sugli eyebrow/label tecnici. Coerente, sobrio.

### 3.10 Card hover: distorsione/RGB-shift/parallax — **PRIORITÀ MEDIA (alto payoff su /case-studies)**
- **Cosa fa:** sull’hover la card warpa verso il mouse, separa il canale R (RGB-shift), zoom/reveal + freccia.
- **Implementazione:** shader su image-plane (`uOffset` da velocità mouse; `r = tex(uv+offset).r; gb = tex(uv).gb`) o drei `<Image>` (zoom/grayscale/parallax).
- **Replica SERSAN:** le nostre card Case Studies oggi sono DOM puro. Aggiungere versione drei `<View>`/`<Image>` (zoom+grayscale+parallax) full-tier, shader RGB-shift dove serve, **con fallback DOM `<img>`** obbligatorio (CanvasHost = null su tier off). **Serve imagery prodotto** (vedi §5 e PIANO).

### 3.11 Page transition continua (seamless) — **PRIORITÀ MEDIA**
- **Cosa fa:** lo scroll oltre il footer prosegue nella pagina successiva senza stacco; Canvas mai smontato.
- **Implementazione:** routing con preload + curtain/continuità; canvas persistente.
- **Replica SERSAN:** abbiamo già curtain GSAP + Canvas persistente (`CanvasHost` in layout). Mantenere come baseline; opzionale **View Transitions API (Next 16)** per slide direzionali/shared-element, con `view-transition-name:none` sul CanvasHost per evitare flicker. Non serve la continuità-infinita di Lusion: per un brand B2B, transizioni pulite > spettacolo.

### 3.12 Sound design — **PRIORITÀ BASSA (opt-in)**
- Hover/click/transition sounds. **Per SERSAN: off di default**, toggle audio nell’header (come da brief). L’audio enterprise può infastidire; lo offriamo, non lo imponiamo.

---

## 4. Cosa NON imitare (brand fit) e cosa tradurre

- **NON imitare:** sticker-bomb giocoso, palette arcobaleno, claymation, vibe “studio creativo chiassoso”, audio forzato, preloader da 60s. SERSAN è **AI-consulting regolato, premium, sobrio**: *“the intelligence is artificial, the judgement stays human.”*
- **Tradurre in chiave SERSAN:**
  - Curly-tube → **la nostra signature line potenziata** (scattering/fresnel) come “segnale” che attraversa il sito.
  - Camera cinematografica lungo curva → **lookAt-ahead** sobrio.
  - Pinned reel → **case-study media pinnati**.
  - Kinetic type → **eyebrow mono + heading reattivi alla velocità**, misurati.
  - Liquid glass / oggetti → **oggetti rituali per-route** (già in roadmap), realismo materico, non gadget.
  - Preloader→reveal → **segmento di caricamento che diventa l’inizio della linea**.
  - Palette: restare **navy + accento cyan→violet**; il “signal” è l’unico momento luminoso.

---

## 5. Asset che servono da te (per gli effetti dipendenti da contenuti)
Solo per gli enhancement che lo richiedono — il resto procede in autonomia:
- **Imagery prodotto/case-study** (screenshot o render di SphereNode, Quantex, ecc.) per le **card hover-distortion** su `/case-studies` e `/resources`. Senza, le card restano testuali (fallback DOM) — funzionano comunque.
- Conferma **audio on/off** di default (proposta: off, con toggle).
- Conferma **WebGPU**: raccomandazione = **restare WebGL2** (vedi PIANO §6). Tutti gli effetti Lusion-grade qui sono WebGL2-class.

---

## 6. Riferimenti tecnici
- Codrops — *Curly Tubes from the Lusion Website with Three.js*: https://tympanus.net/codrops/2021/05/17/curly-tubes-from-the-lusion-website-with-three-js/
- akella curl-noise gist: https://gist.github.com/akella/51667db48e6b0284dc51935936c776a3 · cabbibo/glsl-curl-noise: https://github.com/cabbibo/glsl-curl-noise
- Codrops — *Crafting a Dreamy Particle Effect (GPGPU)*: https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/ · three.js `webgl_gpgpu_birds`
- Codrops — *Mouse Flowmap Deformation with OGL*: https://tympanus.net/codrops/2019/09/25/mouse-flowmap-deformation-with-ogl/ · PavelDoGreat/WebGL-Fluid-Simulation
- Codrops — *Motion Hover Effects with Image Distortions (Three.js)*: https://tympanus.net/codrops/2019/10/21/how-to-create-motion-hover-effects-with-image-distortions-using-three-js/
- pmndrs react-postprocessing docs: https://react-postprocessing.docs.pmnd.rs/
- DEPT — *Coding a cinematic camera path*: https://www.deptagency.com/insight/coding-a-cinematic-camera-path/
- Next.js View Transitions: https://nextjs.org/docs/app/guides/view-transitions
- three.js TubeGeometry/CatmullRomCurve3 · GPUComputationRenderer (three/examples/jsm/misc)
