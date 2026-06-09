# ParticleDissolve — Implementation Plan v2 (Lusion DDD a due strati)

> Riscrittura del prompt precedente (che **non ha reso**) in un piano di implementazione
> preciso, ancorato al codice ESISTENTE di questo repo. Prosa in italiano, codice e
> identificatori in inglese (come da `AGENTS.md`).
>
> **Obiettivo invariato:** il logo `public/models/sersan-mark.glb` nell'hero della home
> appare come una nuvola di particelle che, al passaggio del mouse, si disperde e poi
> **rientra** ricomponendo la forma — nello stile del modello 3D in fondo a
> `https://1105-ddd2024-homepage.lusion.co/`.
>
> **Vincolo del committente:** NON cambiare la posizione/inquadratura del modello nella
> pagina. Tutta la coreografia di anchoring/scroll/fade in `HeroLogo.tsx` resta intatta.
> Si tocca SOLO il motore di simulazione + render delle particelle.

---

## 0. Stato attuale — cosa è già fatto e perché il 1° tentativo non ha reso

Il repo NON parte da zero: `src/webgl/HeroLogo.tsx` ha **tre** modalità (`fxStore.heroRenderMode`):

| modalità | cosa fa | spedita? |
|---|---|---|
| `solid` | mesh viola unlit (debug inquadratura) | no |
| `particles` | **vera sim GPGPU** FBO ping-pong (`gpgpu/gpgpuSim.ts` GLSL + `gpgpu/gpgpuNodeSim.ts` TSL): molla + repulsione + damping + turbolenza, colore per velocità | no |
| `both` | solid + particelle | no |
| **`particles-static`** | billboard statici alle posizioni *home* + **dispersione ANALITICA** nel vertex shader (`gpgpuRenderShader.ts` → `createGpgpuStaticBuild`), nessuna fisica | **SÌ (default)** |

**La diagnosi del fallimento.** La modalità spedita è `particles-static`. Quel render
NON simula nulla: sposta il centro del billboard con `lift = smoothstep(uRadius,0,d)*uHover`
e basta. Conseguenze, esattamente i sintomi del "non ha reso":

1. **Niente momentum.** La particella non "vola via e poi torna": viene traslata
   istantaneamente in proporzione alla vicinanza del cursore, e quando `uHover` torna a 0
   *ricade* dritta a casa. Manca il transitorio elastico (overshoot, deriva, rientro) che è
   *tutta* la magia Lusion.
2. **Un solo strato.** L'effetto Lusion (e la tua stessa reference `particleDissolve.html`)
   ha **due** strati: un **corpo** denso/calmo che fa da "solido" e una **pelle** reattiva,
   additiva, che parte per prima e rientra più lenta. Il render statico ne ha uno solo.
3. **Probabile causa della ritirata sul motore vero (`particles`)**: vedi §6 — su WebGPU il
   sampling di una render-target nel **vertex stage** richiede un LOD esplicito; senza, il
   sample "si scrambla" e il render appariva rotto → si è ripiegato sul path statico
   robusto. È il rischio tecnico #1 e ha un fix preciso.

**Conclusione:** il pezzo difficile (la fisica a molla GPGPU su due backend) è **già scritto**.
Il piano lo riconnette come path spedito, aggiunge il **secondo strato** (l'ingrediente
Lusion mancante) e ritocca le costanti per il "feel" giusto.

### Inventario preciso (firme reali verificate nel repo)

- `geometry/sersanMark.ts`
  - `sampleMarkHomePositions(geometry, size) → { size, count, homeRGBA: Float32Array, aRef: Float32Array }`
    Campiona `size×size` punti sulla **superficie** del GLB con `MeshSurfaceSampler`,
    **front-biased** (`FRONT_BIAS_MIN = 0.12`, tiene `mix(0.12,1,saturate(normal.z))`).
    `homeRGBA` = RGBA float row-major (xyz = punto, w = 1) → semina home/posizioni;
    `aRef` = UV di griglia per-istanza.
- `gpgpu/gpgpuSim.ts` (GLSL, flag-OFF / WebGL2)
  - `createGpgpuSim(gl, homeRGBA, size, config, floatType) → rig`
  - `rig`: `positionTexture` / `velocityTexture` (getter sul read target corrente),
    `tick({ dt, time, mouse })`, `setForces({ spring, push, radius, damping, turbBase })`,
    `dispose()`.
- `gpgpu/gpgpuNodeSim.ts` (TSL, flag-ON / WebGPU) — gemello di sopra
  - `createGpgpuNodeSim(gl, webgpu, tsl, homeRGBA, aRef, size, config, floatType) → { rig, geometry, material, uFade, uPointSize, uPixelRatio, uViewport, uEmissive, uPointAlpha, dispose }`
  - `createStaticParticleNodeBuild(webgpu, tsl, homeRGBA, aRef, count, config) → { geometry, material, uMouse, uHover, uTime, uRadius, uPush, … , dispose }`
- `gpgpu/gpgpuRenderShader.ts` (GLSL)
  - `createGpgpuRenderMaterial(config)` — billboard istanziato che legge `uPosTex`/`uVelTex`,
    colore violet→cyan per **velocità raw**, `AdditiveBlending`, `depthWrite/Test:false`,
    `toneMapped:false`.
  - `createGpgpuStaticBuild(config, homeRGBA, aRef, count)` — il path statico spedito.
- `gpgpu/gpgpuConfig.ts` — `DEFAULT_GPGPU_CONFIG` + `SIZE_BY_TIER { full: 256, lite: 128 }`.
- `store/fxStore.ts` — `heroRenderMode` (default **`particles-static`**) + knob live `gpgpu*`
  (vedi §5). Settabili in dev via `window.__sersanFx.getState().set({ … })` (folder leva
  "GPGPU hero" in `debug/LineDebug.tsx`).
- `store/heroDragStore.ts` — `hovering` (pointer sopra l'hero, lo setta il drag-capture
  layer); `dragging`/`vx`/`vy` **ignorati** (il mark è ANCHORED). Gate della repulsione.
- `store/pointerStore.ts` — `active`, `raw`/`smooth` (clip 0..1 top-left), aggiornati una
  volta per frame dal `FrameDriver`.
- `renderer/createRenderer.ts` — `webgpuEnabled()` decide GLSL vs TSL.

### `DEFAULT_GPGPU_CONFIG` attuale (numeri reali)

```
SIZE 256 | SPRING 55 | DAMPING 9.0 | PUSH 42 | RADIUS 0.52 | MAX_SPEED 4
TURB_BASE 0.02 | TURB_MOVE 1.2 | TURB_DISP_K 6.0
POINT_SIZE 9 | POINT_ALPHA 0.88 | EMISSIVE 2.6
COL_COLD [0.42,0.30,0.86] (viola) | COL_HOT [0.28,0.95,0.95] (ciano)
```

⚠️ **Nota tuning critica:** `SPRING 55 / DAMPING 9` dà ζ = 9/(2·√55) ≈ **0.61** — ritorno
quasi senza overshoot ("snap glued", come dicono i commenti del config). È l'OPPOSTO del
feel Lusion "vola via, indugia, rientra", che vuole **ζ ≈ 0.3–0.4** (under-damped). Da
ritoccare per strato (§5).

---

## 1. L'effetto Lusion DDD, decostruito

> ✅ **VERIFICATO DAL VIVO** (ispezione browser del 2026-06-09, vedi §10 per le prove).
> L'effetto sta nel **footer** della pagina ("Join the family / subscribe to our
> newsletter"), in una scena 3D scura. Stack: **WebGL2** (non WebGPU, pur supportato),
> singolo canvas full-screen, engine Lusion su three.js.

**Cosa fa esattamente la "D" del footer (osservato):**
- **Strato 1 — CORPO**: una **"D" viola/violetto** densa e *solida* (occlude, sembra un
  blocco estruso opaco), che fa da base e quasi non reagisce. Accanto, la scritta 3D
  "Digital Design Days" vetrosa/sfocata.
- **Strato 2 — PELLE**: una **pelle di particelle CIANO additive e luminose** che riveste
  la superficie della D (motes tondi e morbidi, NON le lame dell'intro — vedi nota sotto).
- **Hover**: le particelle ciano vicine al cursore **schizzano via** dal mouse in **scie con
  inerzia evidente** (momentum: partono veloci, si allargano in una nuvola ciano, *non* è
  uno spostamento istantaneo), dissolvendo quel lato della D. Il corpo viola resta fermo.
- **Ritorno**: allontanando il cursore, le particelle **rientrano** ricomponendo la pelle in
  un transitorio morbido di **~1–2 s** (molla **under-damped**, con un filo di deriva/coda).
- **Look**: sfondo **quasi nero**, **Depth-of-Field/bokeh** marcato (la scena è defocalizzata,
  mette a fuoco verso l'interazione) + **Bloom** sul ciano. Viola↔ciano = la stessa relazione
  cold↔hot del tuo config.

> ⚠️ **Due "D" diverse sul sito, non confonderle.** All'avvio c'è un **intro/preloader**
> (contatore %) in cui una "D" ciano si assembla da **lame/fin radiali** spazzate lungo la
> curva (look a ventaglio, NON particelle tonde). Quella è una reveal guidata dal
> loader/scroll e **non** è l'effetto hover. L'effetto che ci interessa è la **D del footer**
> (corpo viola + pelle ciano reattiva), descritta sopra.

La decostruzione tecnica qui sotto è coerente al 100% con l'osservazione e con la tua
reference `particleDissolve.html`.

Lo stack documentato di Lusion: **three.js + GSAP**, e per i loro "particle floater" il
pattern pubblico è **SDF (home/collisione attorno al modello) + curl-noise (deriva
organica) + velocità per-particella integrata** ("Surface Floater", Experiments with
Google). In pratica, per il nostro caso, si riduce a:

1. **Posizione "casa"** = punti campionati sul/attorno al modello (noi: `MeshSurfaceSampler`
   sul GLB → `homeRGBA`). È il bersaglio della molla.
2. **Stato per-particella in texture float** (posizione + velocità), aggiornato sul GPU in
   ping-pong (FBO / GPUComputationRenderer). Niente update CPU.
3. **Modello di forze a molla del 2° ordine** (la chiave del "rientro con momentum"):
   ```
   toHome   = home - pos
   acc      = SPRING * toHome
   fromMouse= pos - mouse;  d = length(fromMouse)
   if (d < RADIUS) acc += normalize(fromMouse) * pow(1 - d/RADIUS, 2) * PUSH   // repulsione soft
   acc     += curl/turbulence * (TURB_BASE + TURB_MOVE * disp)                 // deriva, ramped by disp
   vel     += acc * dt
   vel     *= exp(-DAMPING * dt)                                               // damping frame-rate independent
   vel      = clamp_len(vel, MAX_SPEED)
   pos     += vel * dt
   ```
   Il "feel" è governato dal **rapporto di smorzamento** ζ = DAMPING/(2·√SPRING):
   - ζ<1 → overshoot/oscillazione = "vivo" (quello che vogliamo, ζ≈0.3–0.4);
   - ζ≈1 → rientro pulito ma **snap** (da evitare);
   - ζ>1 → molle/lento.
4. **Due strati** dallo stesso modello, con parametri diversi:
   - **CORPO** — denso, `NormalBlending`, `depthWrite:true`, **opaco** (occlude → sembra un
     solido), **molla alta + damping alto + push/raggio piccoli** → reagisce poco, resta calmo.
   - **PELLE** — superficie spinta un filo in fuori lungo la normale, `AdditiveBlending`,
     `depthWrite:false`, semitrasparente, punto più grande (glow), **damping basso + push/raggio
     grandi** → parte per prima, vola più lontano, rientra più lenta. È lo strato che "si sposta".
   Render order: prima il corpo (scrive depth), poi la pelle additiva sopra.
5. **Colore per velocità** (`mix(cold, hot, smoothstep(0,maxSpeed,|vel|))`) + **Bloom
   selettivo** sull'HDR delle particelle veloci. (Tutto già presente nel nostro render +
   PostFX.)

La tua `particleDissolve.html` implementa **esattamente** 1–5 (corpo viola volume + pelle
ciano superficie, `VEL_FRAG`/`POS_FRAG` con `exp(-damping*dt)` e `pow(f,2)` falloff). È la
nostra reference concettuale 1:1.

---

## 2. Il gap preciso (cosa manca, in una riga ciascuno)

1. **Spedire il motore con momentum, non l'analitico.** Smettere di shippare
   `particles-static`; shippare la sim a molla (`particles`), che già esiste.
2. **Aggiungere il 2° strato** (corpo + pelle) — l'unico ingrediente Lusion assente sia
   dallo statico sia dalla modalità `particles` attuale (entrambi mono-strato).
3. **Ritarare per l'under-damping** (pelle ζ≈0.35) per il "vola via, indugia, rientra".
4. **Sbloccare/validare il render della sim su WebGPU** (vertex-stage RT read, §6).
5. **Parametrizzare** sampling + render material per strato (oggi sono mono-config).

---

## 3. Architettura target

```
HeroLogo (group → assembly[tilt] → spin)         ← INVARIATO (posizione/scroll/fade/tilt)
  └─ spin
       ├─ <mesh BODY>   geometry+material strato CORPO   (NormalBlending, depthWrite, renderOrder 0)
       └─ <mesh SKIN>   geometry+material strato PELLE    (AdditiveBlending, depthWrite off, renderOrder 1)

Per ogni strato (CORPO, PELLE):
  homeField = sampleMarkLayerField(bodyGeometry, size, layerOpts)   ← generalizza sampleMarkHomePositions
  rig       = createGpgpuSim(...) | createGpgpuNodeSim(...)         ← stesso codice sim, config diversa
  material  = createGpgpuRenderMaterial(layerRenderOpts)            ← parametrizzato per blending/colore/size

useFrame:
  modelMouse = (drag.hovering && ptr.active) ? raycast→worldToLocal(spin) : MOUSE_OFF   ← già esiste
  for layer in [body, skin]:
     layer.rig.setForces(layer.forces)
     layer.rig.tick({ dt, time, mouse: modelMouse })
     feed layer.material uniforms (posTex, velTex, viewport, fade, …)
```

Punti chiave:
- **Due rig + due render mesh**, stesso `modelMouse` e stesso `dt`. Nessun nuovo shader di
  simulazione: si riusa `gpgpuSim`/`gpgpuNodeSim` istanziato due volte.
- Il corpo NON deve essere additivo: serve un render material con `blending`/`depthWrite`/
  `transparent` configurabili (oggi sono hard-coded additivi). Piccola parametrizzazione.
- Il sampling deve produrre due "case" diverse: corpo (denso, ~volume) e pelle (superficie
  offsettata in fuori). Si generalizza `sampleMarkHomePositions`.

---

## 4. Piano di implementazione, step by step

> Commit piccoli e verificabili. Dopo ogni fase: build pulita + screenshot (vedi §8).
> NON toccare la coreografia di posizione/scroll/fade/tilt in `HeroLogo.tsx`.

### Fase 0 — Diagnosi (NESSUN codice)
- In dev, su **entrambi** i backend (WebGPU on / WebGL2 fallback), forzare la modalità sim:
  `window.__sersanFx.getState().set({ heroRenderMode: "particles" })`.
- Osservare: la sim a molla mono-strato (a) **renderizza correttamente** o (b) "si
  scrambla" (tipico su WebGPU). Annotare per backend.
  - Se (a) su entrambi → §6 non serve, si procede dritti.
  - Se (b) su WebGPU → applicare il fix §6 PRIMA della Fase 1 sul path TSL.
- Confermare che `drag.hovering` si attiva sull'hero (la repulsione si accende) e che
  `gpgpuOk` è true (float/half RT disponibili).

### Fase 1 — Spedire la sim con momentum (mono-strato) + ritaratura feel
- `fxStore.ts`: default `heroRenderMode = "particles"` (o nuova `"particles-2layer"` se si
  vuole tenere lo statico come fallback dietro flag).
- Ritarare `DEFAULT_GPGPU_CONFIG` verso under-damped (vedi §5, profilo "skin" come base
  mono-strato): es. `SPRING 22, DAMPING 3.6, PUSH 55, RADIUS 0.55, TURB_MOVE 1.6`.
- **Verifica feel**: hover → le particelle volano via, **indugiano**, poi rientrano con un
  filo di overshoot. Se "snap": abbassare DAMPING/SPRING. Se "esplode/non torna": alzare
  DAMPING o MAX_SPEED clamp.
- ✅ A fine fase: già l'80% del feel Lusion che lo statico non dava, mono-strato.

### Fase 2 — Parametrizzare sampling + render per strato
- `geometry/sersanMark.ts`: generalizzare in
  `sampleMarkLayerField(geometry, size, { frontBias=0.12, normalOffset=0, volumeJitter=0 })`:
  - `normalOffset` → spinge il punto lungo +normal (pelle in fuori, es. 0.03);
  - `volumeJitter` → jitter lungo −normal con profondità random (fake-volume del corpo, es.
    0.06 su una piastra spessa ~0.44); per il corpo si può anche abbassare `frontBias`
    (~0.4) così copre anche lo spessore e legge più "solido".
  - Mantenere `sampleMarkHomePositions` come wrapper retro-compatibile (`normalOffset=0`).
- `gpgpu/gpgpuRenderShader.ts`: aggiungere a `createGpgpuRenderMaterial(config, renderOpts?)`
  i campi `{ blending, depthWrite, transparent }` (default = additivi attuali, così il path
  esistente non regredisce). Il corpo userà `NormalBlending, depthWrite:true, transparent:false`.
- Stesso per il gemello TSL in `gpgpuNodeSim.ts`.
- `gpgpuConfig.ts`: introdurre `LAYER_PRESETS = { body, skin }` (vedi §5) lasciando
  `DEFAULT_GPGPU_CONFIG` come base condivisa.

### Fase 3 — Costruire i due strati in `HeroLogo.tsx`
- Dove oggi si costruisce **un** rig/material (sia branch GLSL che TSL), costruirne **due**
  (`body`, `skin`), ciascuno con il suo `homeField` (Fase 2) e la sua config (§5).
  Gli effect di build già esistenti (`useEffect` GLSL e TSL) vanno duplicati/loopati per i
  due strati; stessa disciplina di `dispose()` e lazy-import TSL.
- In `useFrame`, dopo aver calcolato `modelMouse` (codice INVARIATO): per ciascuno strato
  `setForces(...)` + `tick({dt,time,mouse:modelMouse})` + feed uniform render (posTex/velTex/
  viewport/fade/emissive/pointSize/pointAlpha).
- Render: due `<mesh>` sotto `spin`, **corpo prima** (renderOrder 0), **pelle dopo**
  (renderOrder 1). `frustumCulled={false}` su entrambi (come già fatto).
- Ritirare il path `particles-static` dalla scelta default (tenerlo come debug, non
  rimuoverlo: serve da fallback "no-sim" se §6 fallisse su qualche GPU).

### Fase 4 — Tuning (leva)
- Esporre in `LineDebug.tsx`/`fxStore` knob **per strato** (prefisso `body*` / `skin*`):
  spring/damping/push/radius/turbMove/pointSize/pointAlpha/emissive + colori.
- Dialare per avvicinarsi alla DDD: densità, distanza di dispersione, tempo di rientro,
  rapporto luminosità pelle/corpo.

### Fase 5 — Fallback, performance, a11y
- **Tier**: full = 256²×2 strati ≈ 131k particelle; lite = 128²×2 ≈ 33k. `off`/
  reduced-motion non monta HeroLogo (già gestito in `Scene`). Se 60fps non regge in full,
  scalare prima la PELLE (size minore) tenendo il CORPO.
- **Float RT**: se né Float né HalfFloat sono usabili (`gpgpuOk=false`), non costruire i rig
  → niente crash, `heroReady` parte comunque (già implementato).
- **WebGPU**: applicare §6.
- `prefers-reduced-motion`: nessuna sim (già gating upstream).

### Fase 6 — QA (vedi §8).

---

## 5. Parametri di tuning per il "feel" Lusion

Base condivisa = `DEFAULT_GPGPU_CONFIG`. Override per strato (`LAYER_PRESETS`):

| parametro | CORPO (calmo, opaco) | PELLE (reattiva, additiva) | note |
|---|---|---|---|
| SIZE | 256 (full) / 128 (lite) | 192 (full) / 96 (lite) | la pelle può essere più rada |
| SPRING | 30–40 | **18–22** | pelle bassa = rientro lungo |
| DAMPING | 5.5–7 (ζ≈0.5–0.6) | **3.2–3.8 (ζ≈0.35–0.4)** | pelle under-damped = "indugia" |
| PUSH | 25–35 | **55–70** | la pelle vola più forte |
| RADIUS | 0.45–0.52 | 0.55–0.65 | raggio cursore (model space) |
| MAX_SPEED | 4 | 4.5 | clamp anti-fuga |
| TURB_BASE | 0.02 | 0.03–0.05 | ~0 a riposo (skin crisp) |
| TURB_MOVE | 0.9 | **1.6–2.0** | più deriva quando dispersa |
| TURB_DISP_K | 6 | 5 | quanto presto parte lo shimmer |
| POINT_SIZE | 4.5–5 | 6–7 | pelle = glow più largo |
| POINT_ALPHA | 1.0 | 0.5–0.6 | corpo solido, pelle velo |
| EMISSIVE | ~1.6 | ~2.6 | pelle brilla di più (bloom) |
| blending | `NormalBlending` | `AdditiveBlending` | corpo occlude |
| depthWrite | true | false | corpo scrive depth |
| COL_COLD | [0.40,0.28,0.85] viola | [0.25,0.95,0.95] ciano | a riposo |
| COL_HOT | [0.55,0.75,1.0] azzurro | [0.9,1.0,1.0] bianco | in movimento |

(Numeri di partenza allineati alla tua `particleDissolve.html`; affinare in leva.)

Promemoria ζ = DAMPING/(2·√SPRING): pelle 3.5/(2√20)=**0.39** ✓; corpo 6/(2√35)=**0.51** ✓.

**Feel osservato sulla DDD (target da raggiungere):** la pelle schizza **lontano** (la nuvola
ciano copre buona parte della lettera) e **rientra in ~1–2 s** con un filo di coda → conferma
**push alto + raggio generoso + ζ≈0.35–0.4**. Se nel tuo build rientra troppo "secca",
abbassa SPRING/DAMPING della pelle; se "esplode senza tornare", alza MAX_SPEED-clamp o DAMPING.

**Depth of Field (DOF) — ingrediente del look mancante dal piano v1.** La scena DDD è
fortemente defocalizzata (bokeh) con messa a fuoco verso l'interazione. Il progetto ha già
`@react-three/postprocessing`: aggiungere un **Bokeh/DepthOfField sottile** (focus sul piano
della D, blur crescente fuori) dà subito l'aria cinematografica Lusion. Tienilo leggero (non
deve impastare la lettura della "52") e dietro un flag tier (off su lite/mobile per performance).
Combinalo col Bloom selettivo già presente. Sfondo: il navy `#0B1422` del brand va bene (sulla
DDD è quasi nero); il glow ciano risalta su scuro.

---

## 6. Rischio tecnico #1 — sampling RT nel vertex stage su WebGPU

**Ipotesi (da confermare in Fase 0):** il motivo per cui la modalità `particles` non è stata
spedita e si è ripiegato sullo statico è che, su **WebGPU/WGSL**, il sampling di una texture
nel **vertex stage** non può usare derivate implicite. Una `texture(node, uv)` TSL compila in
`textureSample`, che richiede derivate (esistono solo nel fragment) → nel vertex stage il
risultato è indefinito/"scramblato".

**Fix nel render TSL (`gpgpuNodeSim.ts`)** quando legge `uPosTex`/`uVelTex` per-istanza:
- usare un sample con **LOD esplicito**: `texture(posTex, aRef).level(0)` (TSL) oppure
  `textureLoad`/`texture(...).load(ivec2)` con coordinate intere `floor(aRef*size)`;
- assicurarsi che le RT abbiano `minFilter=magFilter=NearestFilter` (già così nel GLSL rig);
- nel GLSL (WebGL2) il problema non esiste (`texture2D` nel vertex è lecito), quindi il path
  OFF resta com'è.

Se in Fase 0 la sim renderizza bene su WebGPU così com'è, questo step si salta. Il path
statico va comunque **tenuto** come fallback estremo (GPU senza vertex-texture affidabile).

Reference della robustezza FBO-su-WebGPURenderer già nel repo: `fluid/PointerFlowmap.ts`.

---

## 7. Cosa NON cambiare (regressioni da evitare)

- Posizione/scala/inquadratura del mark: `group.position/scale`, i termini `hp`, il
  `fade = 1 - smoothstep(hp,0.74,0.97)`, il `TILT`/mouse-parallax, `group.visible`,
  l'annuncio `heroReady`. Tutto invariato.
- Il dual-backend (GLSL flag-OFF / TSL lazy flag-ON) e la disciplina `dispose()`.
- Il gating tier/route in `Scene.tsx` e il drag-capture che alimenta `heroDragStore.hovering`.
- Non importare `three/webgpu` nel bundle OFF (resta dietro lazy import).

---

## 8. QA / Done-when

- [ ] Hover sul mark: la PELLE si disperde, **indugia**, e rientra con leggero overshoot;
      il CORPO resta quasi fermo e "solido" sotto.
- [ ] Pointer-leave: la repulsione svanisce (`mouse → ∞`), tutto rientra morbido.
- [ ] Colore viola→ciano per velocità, con glow (Bloom) sulle veloci.
- [ ] Funziona identico su WebGPU e su WebGL2 fallback (screenshot a confronto).
- [ ] 60fps desktop (tier full); lite scala bene; mobile/reduced-motion non monta la sim.
- [ ] Console pulita; nessuna regressione di posizione/scroll/fade.
- [ ] Screenshot Playwright/Chrome desktop+mobile vs DDD; iterare i numeri §5 finché il
      feel combacia.

---

## 9. Riferimenti

- Three.js Journey — *GPGPU Flow Field Particles* (FBO ping-pong, base/home texture):
  https://threejs-journey.com/lessons/gpgpu-flow-field-particles-shaders
- Three.js Journey — *Particles Morphing Shader*:
  https://threejs-journey.com/lessons/particles-morphing-shader
- Codrops — *Crafting a Dreamy Particle Effect with Three.js and GPGPU* (pos+vel+mouse+bloom):
  https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/
- Codrops — *Implementing a Dissolve Effect with Shaders and Particles*:
  https://tympanus.net/codrops/2025/02/17/implementing-a-dissolve-effect-with-shaders-and-particles-in-three-js/
- Codrops — *Surface Sampling in Three.js* (`MeshSurfaceSampler`):
  https://tympanus.net/codrops/2021/08/31/surface-sampling-in-three-js/
- Codrops — *WebGPU Gommage Effect (TSL dissolve)*:
  https://tympanus.net/codrops/2026/01/28/webgpu-gommage-effect-dissolving-msdf-text-into-dust-and-petals-with-three-js-tsl/
- Wawa Sensei — *GPGPU particles with TSL & WebGPU*:
  https://wawasensei.dev/courses/react-three-fiber/lessons/tsl-gpgpu
- Lusion — *Surface Floater* (SDF + curl noise + velocity):
  https://experiments.withgoogle.com/surface-floater
- Lusion — Awwwards case study (three.js + GSAP + pipeline):
  https://www.awwwards.com/case-study-for-lusion-by-lusion-winner-of-site-of-the-month-may.html
- Reference locale: `particleDissolve.html` (modello a due strati corretto, 1:1 con §1).

---

## 10. Nota empirica (sito Lusion live) — VERIFICATO

Ispezione browser diretta del **2026-06-09** (Claude-in-Chrome) dell'intera pagina
`https://1105-ddd2024-homepage.lusion.co/`. Fatti confermati e usati sopra:

- **Stack**: canvas **WebGL2** full-screen (non WebGPU, pur supportato dal browser), engine
  Lusion su three.js. `document.scrollHeight == innerHeight` → **smooth-scroll virtualizzato**
  (il DOM non si allunga; lo scroll guida transizioni di scena, non l'altezza del documento).
- **Effetto target = footer** ("Join the family"): scena 3D scura con la **"D" viola solida**
  + scritta "Digital Design Days" vetrosa, forte **DOF/bokeh** + **Bloom**.
  - Hover sulla D → **le particelle ciano della pelle schizzano via dal cursore con scie/inerzia**
    (momentum), dissolvendo quel lato; **rientrano in ~1–2 s** quando il mouse esce. Catturate
    le frame riposo → dispersione → ritorno (una salvata su disco via screenshot `save_to_disk`).
- **Intro/preloader** (contatore %): "D" ciano fatta di **lame/fin radiali** che si assemblano —
  reveal guidata dal loader, **diversa** dall'effetto hover del footer (vedi nota in §1).
- Limite: il bundle è minificato, quindi gli **shader esatti / costanti** non sono estraibili dal
  codice sorgente. I numeri di §5 restano da rifinire **a occhio in leva** contro questa reference
  (l'architettura e il comportamento, invece, sono confermati e non vanno indovinati).

---

## 11. WebGPU FBO debug log (2026-06-09) — stato e localizzazione

Implementato il mode **`particles-2layer`** (corpo+pelle momentum) su entrambi i backend;
`tsc` pulito; default invariato (`particles-static`, sito non toccato). QA live su WebGPU:

**Sintomo:** in `particles` e `particles-2layer` su **WebGPU** le particelle **non
formano il "52"** — nuvola diffusa + punto di convergenza luminoso. (Su WebGL il path è
rotto a monte da un crash preesistente del postprocessing `EffectComposer` in `PostFX.tsx`
— `getContextAttributes is not a function` — quindi niente A/B lì.)

**Localizzazione (decisiva):**
- Leggendo la **`home` DataTexture** nel render via `textureLoad(home, ivec2(aRef·size))`
  → il **"52" è PULITO**. ⇒ il **path di rendering è corretto** e `textureLoad` nel vertex
  stage funziona su WebGPU.
- Leggendo `posRead` (render-target seedato da `home`, anche congelando il sim) → **scramble**.
  ⇒ il bug è nel **round-trip render-target** (scrittura via quad fullscreen → rilettura via
  `textureLoad`): mismatch di **orientamento/layout** specifico WebGPU.

**Tentativi fatti e NON risolutivi:**
1. `textureLoad` (sampler-free) sulle letture del render — necessario per il vertex stage, ma non basta.
2. `textureLoad` anche sulle letture del **sim** (fragment) — esclude il sampleType/sampler mismatch.
3. **Seed dentro il frame-loop** (`tick`) invece che nell'effetto build — esclude "seed non eseguito su WebGPU".
4. **Y-flip** del texel di lettura RT nel render — **né raw né flippato** combaciano con la scrittura
   uv del seed ⇒ **non è un semplice flip**: il layout uv-write del seed non corrisponde ad `aRef`
   in alcun orientamento banale.

Reference che FUNZIONA su WebGPU: `fluid/PointerFlowmap.ts` legge la RT con `texture(rt, uv())`
(sampler, uv-space) ed è **self-consistent** (read+write nello stesso spazio uv), flippando Y
solo verso lo spazio top-left del puntatore. Il nostro problema nasce perché il **render legge
via `aRef`** (spazio della DataTexture, top-left) mentre la RT è bottom-left/storage-flipped.

**Insight chiave per la soluzione:** poiché il render via **DataTexture** è pulito, una
**DataTexture aggiornata da CPU** (posizioni della pelle simulate in JS, `needsUpdate` per
frame) verrebbe letta dallo stesso render → pulita, **senza** il round-trip RT problematico.
È l'**ibrido CPU→DataTexture**: stessa resa visiva (vero momentum), robusto su WebGPU.

**Prossime opzioni:**
- (A) **Ibrido CPU→DataTexture** — riusa il render provato, evita il bug RT. *Consigliato.*
- (B) Debug strumentato del round-trip RT: scrivere un pattern noto (es. il gradiente uv) nella
  RT e leggerne la trasformazione esatta, per dedurre il rimappamento `uv↔storage`/`aRef` su
  questo WebGPU e applicare l'esatta correzione. Incerto ma definitivo.
- (C) Reverse-engineering degli shader esatti di Lusion (NB: il loro sito è **WebGL2**, non WebGPU).
