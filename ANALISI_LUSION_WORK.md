# ANALISI_LUSION_WORK.md — Reverse engineering estremo: Featured Work + Project Detail

> Deep-dive condotto il 2026-08-20 su https://lusion.co/ scaricando e analizzando **HTML SSR, CSS (`about.CNa9RfUh.css`) e bundle JS (`hoisted.CUO_IjfL.js`, 1.25 MB)**. Qui c'è la meccanica *esatta* (classi, uniform, easing, costanti) della sezione **Featured Work** in home e della **pagina progetto** (quella col video demo a destra). Complementa ANALISI_LUSION.md (journey generale).
> Scopo: refactor della sezione Work della home di SERSAN + nuovo layout dei detail, su questa grammatica.

---

## 1. La casa: costanti e fondamenta

- **Easing di casa**: `ease.lusion = cubicBezier(0.35, 0, 0, 1)` — usato ovunque (hover, reveal, slide). In CSS: `cubic-bezier(.35,0,0,1)`. È un "expo-ish out" morbido con partenza decisa.
- **Molle**: niente lerp nudo per l'hover — usano `SecondOrderDynamics(value, f, ζ, r)` (la molla "second order dynamics" di t3ssel8r): focus del mouse `(1, .6, 2)` (morbida, con overshoot), zoom `(2.2, .7, 3)` (più pronta).
- **Radius globale**: card `border-radius: 15px`; nei shader è l'uniform `u_globalRadius` (il raggio è disegnato **nello shader** con una SDF rounded-box, non dal CSS — il CSS è solo fallback).
- **Griglia**: 12 colonne, `--grid-gap: 2vw`, padding orizzontale `max(5vw, 40px)`.
- **Scroll**: virtualizzato ovunque (classe `ScrollPane`): wheel → target, `wheelEaseCoeff = 12` (lerp verso il target ≈ `1-exp(-12·dt)`), drag con inerzia e attrito `2.1→1.9`. Il canvas WebGL disegna nel viewport e ogni quad si sincronizza al rect DOM (`UfxMesh.syncDom(-scrollPixel)`).
- **Audio**: hover card → sample "focus" (`audios.countPlay("focus")`).

---

## 2. HOME — Featured Work (griglia)

### 2.1 Anatomia DOM (SSR, per card)

```html
<a class="project-item" href="/projects/oryzo_ai"
   data-id="oryzo_ai" data-color-bg="#1a1411" data-color-text="#ffedd7" data-color-shadow="0.9">
  <div class="project-item-main">          <!-- padding-top:65% (aspect ~1.538) -->
    <div class="project-item-image"></div> <!-- VUOTO: il media lo disegna il WebGL su questo rect -->
  </div>
  <div class="project-item-footer">
    <div class="project-item-line-1">concept • web • design • …</div>  <!-- eyebrow categorie -->
    <div class="project-item-line-2">
      <div class="project-item-line-2-icon"></div>   <!-- freccia →, a left:-1em -->
      <div class="project-item-line-2-inner">        <!-- titolo, height:1em, overflow:hidden -->
        <!-- COSTRUITO DAL JS: una colonna flex per LETTERA, 4 <span> copie ciascuna,
             transform iniziale translateY(-400%) -->
      </div>
    </div>
  </div>
</a>
```

- Layout: `.project-list` = grid 12 col; `.project-item` = `span 6` (2 colonne), `nth-child(n+3) { margin-top: 10em }` (le righe successive respirano di più).
- `data-color-bg/text/shadow` per card = **palette del progetto di destinazione**: pre-carica il tema della page transition.

### 2.2 Il media della card: still + depth map, NON video

Ogni card carica **due texture**: `PROJECT_PATH/{id}/home.webp` + `home_depth.webp` (mappa di profondità precalcolata). Il quad WebGL (`UfxMesh`, riferito al rect di `.project-item-main`) monta uno shader con `PARALLAX_SAMPLES=12`, `BLUR_SAMPLES=6`. Fragment (estratto integrale nel §2.5):

1. **Parallax raymarched**: camera virtuale in `u_focusPos` (molla pilotata dal mouse), raggio marciato 12 step contro la depth map → **parallasse 3D reale** dentro l'immagine (occlusione inclusa). `zMultiplier = domH·(0.15 + activeRatio·15)` — a riposo la profondità è sottile, nello zoom di transizione esplode.
2. **DOF a disco (golden angle)**: 6 sample su spirale `angle += 10.16640738`; blurriness ∝ `|depth − focusPos.z| + u_dofRangeOffset`. All'hover `dofRangeOffset → −0.5`: l'immagine "va a fuoco".
3. **Maschera SDF rounded-box**: `getRoundedCornerMask(uv, domWH·mix(0.7,1,showRatio), globalRadius)` — l'**entrata** della card è la maschera che cresce dal 70% al 100% del rect.
4. **Ripple da scroll**: `baseUv.x −= (screenUv.x−.5)·(1−sin(screenUv.y·π))·u_rippleStrength` con `rippleStrength = min(0.15, easedScrollStrength·0.5)` — lo "shear" da velocità di scrub.
5. **Grade**: saturazione/brightness uniformi + **fog verso `u_colorBg`** legata a `u_activeRatio` (usata nella zoom transition: l'immagine annega nel colore del progetto).
6. **Blue noise** per dithering di ray-start e rotazione del disco DOF.

### 2.3 Hover (desktop)

- `mouseenter` su `.project-item-main` → `isHover` (solo se `pagesManager.isIdle` e nessuno zoom in corso). `hoverRatio` integra ±dt.
- **Parallasse dal mouse**: `focusPos.target.x/y` = offset del mouse dal centro del rect (normalizzato, forza `parallaxStrength=1`), `focusPos.z = 0.5`; con **micro-wobble d'ingresso**: `cos(time·20)·R` dove `R` decade nei primi 0.3 di hoverRatio — l'aggancio "vibra" per un istante.
- **Impulsi shiftXY**: soglie `[0, .2, .3]` su hoverRatio; attraversandone una, `shiftXYTarget` = vettore random normalizzato scalato `fit(hoverRatio, 0,.6, 1,0)` → piccoli "assestamenti" casuali dell'inquadratura (poi decadono ·0.95, lerp 0.2).
- **Zoom**: `zoomMotion.target = 1` (molla 2.2/.7/3) — nello shader `uv *= mix(0.975, 1, zoomRatio)`: zoom-out del 2.5% a riposo, 100% in hover (l'immagine "avanza").
- **Titolo**: le colonne-lettera traslano `translate3d(shiftX_em, −rollY%, 0)`; in hover `shiftX → 1.5em` con ease.lusion e stagger per-lettera (`|i − len−1|/100`), e la **freccia** entra da sinistra `translateX(fit(hoverRatio,.3,1,0,1)em)`.
- **Audio** "focus". Cursore: `cursor:pointer` semplice.

### 2.4 Reveal (entrata nello viewport)

- **Line 1 (categorie)**: decode scramble — rivela a `LETTER_PER_SECOND=40` con testa di `MAX_RAND_LETTER_COUNT=5` glifi random (`chr(33+rand·93)`). (≈ il nostro LabelScrambler.)
- **Line 2 (titolo)**: ogni lettera è una colonna di **4 copie**; roll `translateY: 500% → 0` con `ease.expoInOut`, stagger **center-out coseno**: `phase = fit(i, 0, len−1, π/2, 3π/2)`, `t = saturate(time·0.8 − cos(phase)/TEXT_STAGGER)` con `TEXT_STAGGER=20`.
- **Mesh**: slide-in orizzontale `position.x = (1−expoOut(showTime/2))·(±10% viewport)` con `rotation.z = ±0.1·(1−t)` (le card di sinistra da sinistra, destra da destra) + la maschera SDF 70→100% su 1.5 s.
- Fuori viewport tutto si resetta (rientro = replay).

### 2.5 Shader della card (fragment, estratto verbatim)

```glsl
uniform sampler2D u_texture; uniform sampler2D u_depthTexture; uniform vec3 u_colorBg;
uniform float u_showRatio, u_activeRatio, u_zoomRatio, u_dofRangeOffset;
uniform float u_saturation, u_brightness, u_rippleStrength, u_globalRadius;
uniform vec2 u_textureSize, u_domWH, u_shiftXY; uniform vec3 u_focusPos;
// … getBlueNoise, linearStep, sdRoundedBox, getRoundedCornerMask …
void main(){
  vec2 screenUv = gl_FragCoord.xy / u_resolution;
  vec2 baseUv = v_uv;
  baseUv.x -= (screenUv.x-0.5)*(1.-sin(screenUv.y*3.141592))*u_rippleStrength;
  vec3 noise = getBlueNoise(gl_FragCoord.xy + vec2(5.,28.));
  float imageAlpha = getRoundedCornerMask(baseUv, u_domWH*mix(0.7,1.,u_showRatio), u_globalRadius, 1.);
  vec2 toUvSpace = 1./(u_textureSize*max(u_domWH.x/u_textureSize.x, u_domWH.y/u_textureSize.y));
  vec2 uv = (baseUv-.5) * u_domWH * mix(0.75,1.,u_showRatio) * mix(0.975,1.,u_zoomRatio);
  float zMultiplier = u_domWH.y*(.15+u_activeRatio*15.);
  vec3 pos = vec3(uv,-zMultiplier);
  float cameraDepth = u_domWH.y*mix(10.,5.,u_zoomRatio);
  vec3 rayOri = vec3(u_focusPos.xy, cameraDepth);
  float dist = length(pos-rayOri); vec3 rayDir = (pos-rayOri)/dist;
  float skipDist = cameraDepth/-rayDir.z; dist -= skipDist;
  float stepDist = dist/float(PARALLAX_SAMPLES); vec3 rayStep = rayDir*stepDist;
  vec3 rayPos = rayOri + rayDir*(skipDist + stepDist*noise.x);
  for(int i=0;i<PARALLAX_SAMPLES;i++){                 // raymarch vs depth map
    float currZ = -texture2D(u_depthTexture, rayPos.xy*toUvSpace+.5).r*zMultiplier;
    if(currZ>rayPos.z) break; rayPos += rayStep; }
  uv = rayPos.xy*toUvSpace + u_shiftXY*0.015;
  float depth = texture2D(u_depthTexture, uv+.5).r;
  float blurriness = mix(0.,0.01,u_zoomRatio)*linearStep(0.,.5,abs(depth-u_focusPos.z)+u_dofRangeOffset);
  float angle = 6.2831*noise.y; vec3 color = vec3(0.);
  for(int i=0;i<BLUR_SAMPLES;i++){                     // DOF disco golden-angle
    float r = sqrt((float(i)+.5)/float(BLUR_SAMPLES))*blurriness;
    angle += 10.16640738;
    color += texture2D(u_texture, uv + r*vec2(cos(angle)*u_textureSize.y/u_textureSize.x, sin(angle)) + .5).rgb; }
  color /= float(BLUR_SAMPLES);
  float luma = dot(color, vec3(.299,.587,.114));
  color = mix(vec3(luma), color, 1.+u_saturation) + u_brightness;
  color = mix(color, u_colorBg, linearStep(0., .75, u_activeRatio*2.5-.75-(1.-depth)));  // fog di zoom
  gl_FragColor = vec4(color, imageAlpha);
}
```

### 2.6 Click → zoom transition (ProjectItemList)

- Click su una card ⇒ `selectedId = id`, `zoomRatio: 0→1` (cubicInOut). Il **contenitore** dei quad viene traslato/scalato così che la card selezionata **copra il viewport**: `scale = max(vw/domW, vh/domH)·1.2`, con pivot sul centro card, più `rotation.y/z = ±0.3·u·(offsetX/vw)` (leggera virata 3D durante il volo).
- Nel frattempo lo shader porta `u_activeRatio → 1`: la profondità esplode (`zMultiplier`), il DOF cresce e la **fog color** annega l'immagine nel `data-color-bg` del progetto ⇒ atterraggio già "nel tema" della pagina detail. Le altre card restano ferme (activeRatio 0).
- È la versione WebGL del nostro Flip zoom-handoff: **stessa idea, in-shader**.

---

## 3. PAGINA PROGETTO — meta a sinistra, rail media a destra

### 3.1 Anatomia DOM (SSR)

```html
<div id="project-details" class="section" style="background-color:#1a1411"
     data-color-bg data-color-highlight data-color-text
     data-color-btn-bg data-color-btn-text data-color-btn-bg-hover data-color-btn-text-hover
     data-color-icon-bg data-color-icon-color data-shadow>
  <div id="project-details-items-wrapper">          <!-- fascia orizzontale, altezza = 100vh − header − padding -->
    <div id="project-details-items-move-container"> <!-- white-space:nowrap; padding-left:48em -->
      <div class="project-details-item is-video" data-width="1250" data-height="720"
           data-filename="/assets/projects/oryzo_ai/main" data-type="video"></div>
      <div class="project-details-item is-image" data-width="1296" data-height="1620"
           data-filename=".../image_1" data-type="image" data-fullscreen></div>
      <!-- … video/image/text alternati … -->
    </div>
  </div>
  <div id="project-details-meta">                    <!-- absolute, top:50%, width:34em → PINNATO a sinistra -->
    <h2 id="project-details-title">Oryzo AI</h2>
    <div id="project-details-left">
      <div id="project-details-desc"><p>…</p><p>…</p></div>
      <a id="project-details-launch-cta">● Launch Project ↗</a>  <!-- pill con dot che esplode in hover -->
    </div>
    <div id="project-details-right">                 <!-- Services + Links (side list) -->
  </div>
  <div id="project-details-preview" data-next-id="atlas_motion" data-next-color-bg data-next-color-text>
    <!-- NEXT PROJECT: titolo prossimo progetto + barra progresso -->
  </div>
</div>
```

### 3.2 Meccanica desktop

- **Testo pinnato**: `#project-details-meta` è `position:absolute; top:50%; width:34em` — resta fermo a sinistra, verticalmente centrato, per tutta la durata.
- **Rail orizzontale**: il `move-container` (nowrap, item `inline-block`, `margin-left:5em` tra loro, `padding-left:48em` per partire a destra del testo) è pilotato da uno **ScrollPane orizzontale**: la wheel verticale scrubba `scrollPixel` orizzontali. `wheelEaseCoeff=12`, drag con inerzia. `overScrollSize = 25vw` di coda.
- **Sizing item**: altezza = altezza fascia; larghezza = `h·(data-width/data-height)`; gli item `data-fullscreen` si estendono a `viewportHeight+2px` e il **radius va a 0** (breakout a tutto schermo mentre passano). `parallaxRatio` allarga il quad per il margine di parallasse.
- **Parallasse per-item**: `u_parallax = fit(domX, −domW, vw, −.5, .5)` — ogni media scorre nel proprio frame mentre attraversa il viewport.
- **Video**: creati lazy (`<video muted playsinline loop>`, `src = filename + ".mp4"`, mobile: variante `mobile_video`) → `VideoTexture`. **Play solo se visibili nel viewport e pagina idle; pause appena fuori.** Fade-in dal nero quando la texture è pronta (`u_readyRatio`).
- **Item testo** (`type:"text"`): pannelli tipografici nel rail; il testo si rivela (`u_textRatio`, ~`50/len` chars/s) quando l'item è tra il 20% e l'80% del viewport.
- **Theming per-progetto**: all'init i `data-color-*` diventano CSS var `--project-details-*` sul root + ricolorano l'header. Sfondo, testi, CTA, hover: **tutta la pagina si riveste della palette del progetto**.
- **Next project**: alla fine del rail, overscroll di 25vw → pannello NEXT PROJECT (titolo nel colore del prossimo, `data-next-*`) con barra `scaleX(progress)`; completato l'overscroll si naviga (con `routeManager.preFetch` già fatto all'init).
- **Back**: pill "back" nell'header (scale 0→1) → torna all'ultima route non-progetto.

### 3.3 Mobile (`useMobileLayout`)

Tutto collassa in **stack verticale normale**: meta in flow (relative), move-container `white-space:normal` full-width, item impilati con `margin-top:50px`, ScrollPane verticale, fullscreen = larghezza piena. Il next-preview entra nel flow col suo spazio (`overScrollSize` = altezza pannello).

---

## 4. Mappatura sul nostro stack (proposta di refactor)

| Lusion | SERSAN (Next 16 · R3F · GSAP · Lenis) |
|---|---|
| ScrollPane virtuale | Lenis esistente (home); per il rail detail: **ScrollTrigger pin + scrub** che mappa scroll verticale → `x` del track (stessa fisica wheelEase≈12 via `scrub: true` + lerp nostro) |
| UfxMesh sync DOM | pattern già nostro (RailPlanes / CardImageDistort tracciano rect DOM) |
| Depth-parallax + DOF card | nuovo shader (portabile 1:1 dal §2.5) — richiede `home.webp` + `home_depth.webp` per progetto; depth map generabili offline (Depth-Anything via transformers.js in `scripts/`) |
| Letter-roll 4 copie | nuovo componente `RollingTitle` (DOM, GSAP-free: rAF + ease.lusion come Lusion) |
| Scramble line-1 | **LabelScrambler esistente** (già identico: 40 cps, testa random) |
| Zoom click → detail | **flip-handoff esistente** (Flip DOM) oppure upgrade in-shader con `u_activeRatio` + fog |
| Theming per-progetto | CSS vars per studio (`--cs-bg/--cs-text/--cs-highlight`) da `caseStudies.ts` |
| VideoTexture play/pause in-view | `<video>` DOM o VideoTexture su plane R3F; IO per play/pause |
| Next-project overscroll | sezione finale del detail con progress bar + link (senza scroll-hijack se vogliamo restare accessibili) |
| ease.lusion | `cubic-bezier(.35,0,0,1)` come token (`--ease-lusion`) + copia JS |

**Asset per progetto (nuovo contratto in `caseStudies.ts`):**
- `heroMedia`: still (webp) + opzionale `depth` (webp) per la card home.
- `railItems[]`: `{ type: "video"|"image"|"text", src?, width, height, fullscreen? }` — il rail del detail. Il `main` video = demo (per Domus Tua: la registrazione del preloader in loop).
- `palette`: `{ bg, text, highlight, btnBg, btnText }`.

---

## 5. File sorgente dell'analisi

Scaricati in scratchpad (`lusion/`): `home.html`, `project.html`, `about.css` (+ `project-rules.css` estratto), `hoisted.js`. Offset utili nel bundle: ProjectItem/shader ~734k, ProjectDetailsSection ~916–928k, Ease/lusion ~731k, ScrollPane ~1154k.
