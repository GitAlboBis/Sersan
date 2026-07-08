# Reference repos & inspiration (Codrops / WebGL)

Raccolta di tutti i riferimenti clonati per ispirare/costruire il refactor WebGL
del sito (soprattutto la sezione founders a particelle e gli effetti scroll).

I repo veri e propri sono clonati in **`/.refs/`**, che è **gitignored** (vedi
`.gitignore` → `/.refs/`) — quindi NON sono nel repo. Su un altro PC ri-clonali
con i comandi qui sotto per riavere tutto il codice di riferimento in locale.

> Analisi tecnica dettagliata di ognuno: vedi `WEBGL_UPGRADE_PLAN.md` (§1 tabella
> referenze, §4R piano particle-portrait morph).

## Ri-clona tutto in un colpo

```bash
# dalla root del progetto
mkdir -p .refs/codrops
git clone --depth 1 https://github.com/davidfaure/horizontal-parallax-gallery-codrops .refs/codrops/horizontal-parallax-gallery
git clone --depth 1 https://github.com/biazo/codrops-animate-shaders-with-gsap      .refs/codrops/animate-shaders-with-gsap
git clone --depth 1 https://github.com/colindmg/r3f-image-reveal-effect             .refs/codrops/r3f-image-reveal-effect
git clone --depth 1 https://github.com/codrops/OnScrollFilter                       .refs/codrops/onscrollfilter
git clone --depth 1 https://github.com/supahfunk/webgl-carousel                     .refs/codrops/webgl-carousel
git clone --depth 1 https://github.com/MisterPrada/logo-particles-template          .refs/misterprada-logo-particles
```

---

## Repo clonati

### 1. Horizontal Parallax Gallery — David Faure (Codrops)
- **GitHub:** https://github.com/davidfaure/horizontal-parallax-gallery-codrops
- **Articolo:** https://tympanus.net/codrops/?p=108925
- **Demo:** https://tympanus.net/Tutorials/HorizontalParallaxGallery/
- **Locale:** `.refs/codrops/horizontal-parallax-gallery`
- **Tecnica:** rail orizzontale wheel-driven; parallax = UV-shift nel fragment
  (`uv.x += uParallax`); camera ortho pixel-perfect; variante DOM con img 125% /
  `left:-12.5%` che contro-trasla. Due varianti (DOM + WebGL) sullo stesso loop.
- **Usato per:** modello center-focus dei rail (già in `railMotion.ts`), bleed
  112% dei founder, degradazione DOM/mobile.

### 2. Animate WebGL Shaders with GSAP — biazo (Codrops)
- **GitHub:** https://github.com/biazo/codrops-animate-shaders-with-gsap
- **Articolo:** https://tympanus.net/codrops/2025/10/08/how-to-animate-webgl-shaders-with-gsap-ripples-reveals-and-dynamic-blur-effects/
- **Demo:** https://tympanus.net/Tutorials/ShaderAnimationGSAP/
- **Locale:** `.refs/codrops/animate-shaders-with-gsap`
- **Tecnica:** piani GL che ombreggiano `<img>`; **GSAP tween sugli uniform** (mai
  CSS). 4 demo: (1) click ripple + wipe grayscale radiale; (2) **hover cursor-lens**
  crossfade 2-texture; (3) press-hold noise reveal; (4) rail con **Kawase blur
  center-focus** per-tile.
- **Usato per:** cursor-lens founders (demo2), DoF blur work rail (demo4), tint
  duotone/crest cyan.

### 3. R3F Image Reveal Effect — colindmg (Codrops)
- **GitHub:** https://github.com/colindmg/r3f-image-reveal-effect
- **Articolo:** https://tympanus.net/codrops/?p=83030
- **Demo:** https://tympanus.net/Tutorials/R3FImageReveal/
- **Locale:** `.refs/codrops/r3f-image-reveal-effect`
- **Tecnica:** un solo uniform `uProgress` (0→1) fuori da React pilota una maschera
  alpha = Perlin 3D domain-warped + gradiente radiale; vertex ripple ampiezza
  `(1−uProgress)`; `CoverUV` per object-fit cover.
- **Usato per:** reveal noisy dei ritratti, rim cyan sul bordo maschera.

### 4. On-Scroll SVG Filter Effect — Codrops (demo Fabio Ottaviani / supah)
- **GitHub:** https://github.com/codrops/OnScrollFilter
- **Articolo:** https://tympanus.net/codrops/?p=72802
- **Demo:** https://tympanus.net/Development/OnScrollFilter/
- **Locale:** `.refs/codrops/onscrollfilter`
- **Tecnica:** **zero WebGL** — SVG `feTurbulence`→`feDisplacementMap` distorce una
  `<mask>` (`<circle r=0→final>`) scrubbata da ScrollTrigger; GSAP **Flip** per i
  titoli; scale 1→1.2 + brightness.
- **Usato per:** reveal displaced dei founder (SVG), metric path-morph, thumbnail
  reveal `/resources`. Landmine: id SVG globali → `useId()`; niente reparent DOM.

### 5. WebGL Carousel — supahfunk (Codrops)
- **GitHub:** https://github.com/supahfunk/webgl-carousel
- **Articolo:** https://tympanus.net/codrops/?p=71727
- **Demo:** https://tympanus.net/Development/WebGLCarousel/
- **Locale:** `.refs/codrops/webgl-carousel`
- **Tecnica:** carosello R3F; `progress` ref (wheel/drag) con `gsap.to` per-frame
  come follower; **click-to-fullscreen** vertex zoom+ripple (`CoverUV`); "fake post"
  = `MeshTransmissionMaterial` con `thickness = scrollSpeed` (rifrazione ∝ velocità).
- **Usato per:** click-zoom card→dettaglio, feel inerziale, glass-smear su drag.

### 6. Logo Particles Template — MisterPrada
- **GitHub:** https://github.com/MisterPrada/logo-particles-template
- **Locale:** `.refs/misterprada-logo-particles`
- **Tecnica:** **immagine → nuvola di particelle con morph**. L'effetto attivo NON
  usa GPGPU/FBO: è un **morph stateless nel vertex shader**
  `pos = mix(start, target, timing_scaglionato(noise, uProgress))`; campionamento
  immagine via `getImageData` a soglia; il GPGPU flow-field nel repo è dead code.
- **Usato per:** LA reference chiave del **particle-portrait morph** dei founder —
  ricetta di campionamento immagine + timing scaglionato per-particella (innestati
  sul motore compute TSL/WebGPU esistente della hero). Vedi `WEBGL_UPGRADE_PLAN.md` §4R.

---

## Snippet inline forniti (senza repo)

Riferimenti dati come codice, non repo — annotati qui per completezza.

### A. Horizontal scroll con Motion + Lenis (React)
- **Tecnica:** `motion`'s `scroll()` trasla un `<ul>` di `-(n-1)·100vw`; header per
  item panano con `x:[800,-800]` su offset per-segmento. `ReactLenis root`.
- **Ispirazione:** Matt Perry (autore di Motion / Framer Motion) — https://motion.dev
  · https://twitter.com/mattgperry
- **Coperto da:** i rail sticky Lenis+ScrollTrigger già nel sito.

### B. POV pan con GSAP MotionPath (SVG focal-point)
- **Tecnica:** `motionPath` fa panare un `<image>` fisso lungo path SVG; `gsap.quickTo`
  su `.pov-pan` con lag `expo`; scroll-snap `y mandatory`; camera che segue il
  `focal-point` lungo i path.
- **Ispirazione:** GSAP MotionPathPlugin — https://gsap.com/docs/v3/Plugins/MotionPathPlugin/
- **Coperto da:** l'effetto "services POV pan" già implementato (commit 9582082).

---

## Livello di riferimento (mood)
- **Lusion** — https://lusion.co/ (qualità/interazione target)
- **Codrops** — https://tympanus.net/codrops/ (tutorial hub di tutti i sopra)
- **Awwwards** — https://www.awwwards.com/ ("Site of the Day" tier)

> Nota: `/.refs/` è gitignored di proposito (solo analisi, non fa parte del build).
> Questo file (`CODROPS_REFERENCES.md`) invece è versionato, così le reference ti
> seguono su qualsiasi macchina.
