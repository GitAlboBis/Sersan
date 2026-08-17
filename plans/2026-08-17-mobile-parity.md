# Mobile Parity — 2026-08-17 (stessi effetti, stesso preloader, stesse transizioni su telefono)

Boss brief (via Alberto): «come lusion.co ed era-residence.com, nella versione mobile rimangono gli stessi
effetti, preloader, ecc. Dobbiamo fare la stessa cosa». Piano prodotto col metodo `make-plan`
(orchestratore + subagent di fact-finding + Phase 0 di documentation discovery + verifica adversariale
delle claim sui sorgenti scaricati). Base: `main@e31925e` (batch mobile 2026-08-11 già dentro).

**Dossier di supporto (leggerli prima di ogni fase — sono la fonte, questo file è la sintesi):**
- `docs/recon-2026-08-17/LUSION_DOSSIER.md` — reverse engineering di lusion.co (bundle `hoisted.CUO_IjfL.js`, offset citati)
- `docs/recon-2026-08-17/ERA_DOSSIER.md` — reverse engineering di era-residence.com (Slater `60900.js` pretty-printed, righe citate)
- `docs/recon-2026-08-17/SERSAN_INVENTORY.md` — stato attuale del repo: preloader, tier, matrice effetti × device, con `file:line`
- `docs/recon-2026-08-17/SERSAN_PRIOR_ART.md` — decisioni già prese nei doc precedenti + contraddizioni
- `docs/recon-2026-08-17/PHASE0_LOADING_APIS.md` · `PHASE0_TIERING_APIS.md` · `PHASE0_MOTION_TOUCH_APIS.md` — Allowed APIs delle versioni installate (three r184, R3F 9.6.1, drei 10.7.7, postprocessing 6.39.1, GSAP 3.15, Lenis 1.3.23, Next 16.2.6)

Vincoli che NON cambiano (ereditati e riconfermati): **desktop `tier === "full"` byte-identical dopo che il
preloader si alza** — l'UNICA eccezione deliberata e cross-device è la finestra del preloader (pesi del contatore,
manifest asset, min-visible di sessione — Phase 3), elencata come diff ammesso nella verifica finale; le finestre
desktop strette (<768 px, fine pointer) restano ESATTAMENTE `lite` come oggi; **`prefers-reduced-motion` ⇒ nessun
canvas** (`CanvasHost.tsx:32`); **copy finale** (ogni stringa nuova va all'owner, vedi Decisioni); **scroll touch
nativo, `syncTouch` resta OFF, nessun `preventDefault` su `touchmove` fuori da ciò che oggi già lo fa** (entrambi i
riferimenti lo confermano: ERA usa Lenis senza syncTouch, Lusion ha un virtual scroll proprio che noi non
adottiamo); nessuna nuova dipendenza salvo dove esplicitato (§Phase 1: `detect-gpu` è già in `node_modules` come
dep transitiva di drei).

> Revisione adversariale del 2026-08-17 (3 lenti: fattibilità sul codice, vincoli/contraddizioni, API inventate e
> verifiche non misurabili): 1 blocker + ~15 major (con sovrapposizioni tra lenti) + 8 minor, **tutti incorporati** in questa versione. Le correzioni
> più importanti: level 3 deriva da `tier==="full"` e non dal puntatore; niente `UnsignedByteType` (spegnerebbe il
> bloom selettivo >1.0); su WebGPU il BloomNode non ha knob di costo (`_nMips=5` fisso) — le leve sono DPR e conteggi;
> raymarch lite = `uIterations`+`uStep` accoppiati, non `setResolutionScale`; il render-gate "alla Lusion" è stato
> tolto (renderizzare sotto l'overlay È il nostro warm-up); il beat hero su touch è progettato senza `preventDefault`.

---

## 0 · Cosa fanno DAVVERO i due riferimenti (evidenza, non impressioni)

Osservato live nel Browser pane (desktop 1280×720 e mobile 375×812 emulato, UA Android) + letto nei sorgenti.

| | **lusion.co** | **era-residence.com** |
|---|---|---|
| Stack | Astro statico + **three.js r158 WebGL2**, engine custom, **un solo bundle** (~305 KB br), asset su CDN `lusion.dev` in formato binario proprio `.buf` + WebP/EXR. Netlify. | **Webflow** + jQuery + **GSAP 3.15** (ScrollTrigger/SplitText/CustomEase) + **Lenis 1.3.21** + **Barba 2.10** + Lottie (istanziato `renderer:'svg'`); codice custom via Slater. **Zero WebGL, zero canvas di rendering**: il "3D" sono 7 video WebM con alpha (pre-renderizzati; tra gli asset della pagina compare un `Unreal logo.svg`, provenienza dei render non verificata) + immagini srcset. |
| Preloader — meccanismo | DOM: 3 cifre "odometro" (`.preloader-percent-digit`, due numeri impilati traslati dalla frazione) + `<canvas id=transition-overlay>` **2D** (barra 5×1 → si spezza e ruota nella "L" → il gruppo scala/ruota via). Classe `Preloader` @1242280. | DOM: logo + titolo split L/R + **linea di progresso finta** (tween fisso 4 s) + "arco" di sfondo che si apre via `mask-image` guidata da due CSS var (`--arch-w`, `--arch-y`). |
| Preloader — cosa aspetta | **Reale, pesato**: `quick-loader` (`loadedWeight/totalWeight`, XHR onprogress) = **70 %** del contatore; ultimo **30 %** = `TaskManager` che esegue `renderer.compileAsync`/`initTexture` **uno per frame**. Prima ancora, il boot **blocca sul font Aeonik 400** (misura la larghezza del testo ogni 20 ms). Minimo ≈ 3 s + font anche a cache calda. **Mentre l'overlay è opaco la scena NON viene renderizzata a schermo** (`transitionOverlay.activeRatio<1 && postprocessing.render(...)`). | **Niente**: nessun `load`, nessun `fonts.ready`, nessun contatore asset. Coreografia fissa: **~10.15 s** alla prima visita; **`sessionStorage.hasVisited`** → versione corta **~3.75 s** (solo arco + zoom-out dell'hero). Lenis `stop()` durante il preloader (`html.lenis-stopped`), `start()` alla fine. |
| Preloader — mobile | **Identico in logica** (stesso DOM, stessi tempi, stesso overlay); cambia solo `font-size:13vw` ≤812 px e la coda contiene asset più leggeri. | **Identico** (3 parametri: larghezza arco 40→50vw invece di 24→36vw, pre-scale hero 1.15 invece di 0.75, titoli laterali nascosti <992). |
| Mobile: cosa RESTA uguale | **Tutta la scena WebGL** (hero balloons, curly lines, tunnel journey, footer), post stack (SMAA + bloom + paint distortion + final), preloader, transizioni SPA 2D. | Preloader, transizioni Barba, tutti gli SplitText reveal 3D, parallax, hero zoom, video alpha a piena qualità, cambio tema. |
| Mobile: cosa DEGRADA e come | (1) **asset LOD via UA** (`cross_ld.buf` 124 KB vs 283, `matcap_ld.exr` 172 KB vs 603, `stickers_low.png`); (2) **bloom più economico** (5-tap gaussiano separabile, RT non-HD, invece di FFT-convolution) — `!browser.isMobile\|\|settings.USE_HD`; (3) **tolti alcuni oggetti costosi**: le 2 sfere di vetro rifrattive nell'hero, le capability lines della pagina About (`Line(2)/Line(3)` non create su mobile), LOD più alto delle sfere saltato, rocce 64→48; (4) **audio off**; (5) **`DPR = min(1.5, devicePixelRatio)` + tetto `MAX_PIXEL_COUNT = 2560×1440` su OGNI device**; (6) SplitType revert / text choreography semplificata ≤812 px; (7) parallax da **DeviceOrientation** al posto del mouse; (8) reel video 2.3 MB vs 5 MB (larghezza ≤560). | Sotto **992 px di larghezza** (non per puntatore): affordance da puntatore (magnetic, cursor tooltip → bottom-sheet, scrollbar custom), **snapping**, i **due set-piece pinnati** (location orizzontale → colonna verticale; sequenza clip-path architettura → **rimossa**), hero y-slide, 12 hero pins, 2 parallax `data-mob="off"`; **landscape rifiutato** su phone (`.landscape-cover`). |
| Detection | **UA** (`detect-ua`, iPadOS via `maxTouchPoints>2`) per qualità/asset; larghezza (812/560) per layout; **NESSUNO sniff GPU/core/memoria; reduced-motion NON onorato**. Override da URL: `?SKIP_ANIMATION`, `?USE_HD`, `?DPR=1`, `?USE_PIXEL_LIMIT=0`, `?WEBGL_OFF`. | Un solo breakpoint **992** (`innerWidth`, `gsap.matchMedia`); Webflow `w-mod-touch` (`ontouchstart`); un solo UA sniff (Safari → `.mov` HEVC). |
| Repeat visit / SPA nav | Nessuno skip (ricarica dura = preloader pieno); nav interna: overlay 2D "LOADING" solo se la pagina non è mai stata pre-inizializzata. | `sessionStorage` → corto; Barba non ri-esegue il preloader. |

Le 8 claim chiave (4 per sito) sono state ri-verificate da 8 agenti adversariali sui file scaricati: **7 confermate**,
1 "partially" (ERA: lottie-web contiene un CanvasRenderer ma è istanziato con `renderer:'svg'` — la sostanza "zero canvas" regge).
Correzioni all'analisi precedente `ANALISI_LUSION.md`: il secondo canvas fullscreen è **2D**, non WebGL; `_ld/_hd` dei grid tunnel sono LOD di **distanza** (caricati entrambi ovunque), non di device; **non esiste** click-to-enter (`onFirstClicked` serve solo al gyro iOS); le "curly lines" sono tubi **pre-bakati `.buf`** rivelati da `u_showRatio`, non `TubeGeometry` runtime.

### La lezione, in una riga ciascuno
1. **Lusion**: un solo engine, una sola scena, un solo preloader; il telefono NON è un altro sito — si degrada **soprattutto per budget** (DPR ≤1.5, tetto pixel, asset LOD, bloom economico, audio off) **e togliendo pochi oggetti costosi** (sfere di vetro, capability lines dell'About): le feature di firma della home (hero WebGL, curly lines, tunnel journey, post stack, preloader) restano. Nessun GPU sniffing: budget fisso + LOD. Corollario per noi: il caso "bloom/raymarch su telefono" NON si regge su «Lusion non toglie mai nulla» (falso) ma sul **gate di misura di Phase 6**.
2. **ERA**: parità totale perché tutto è DOM/GSAP/video — sotto 992 px (larghezza, non puntatore) spariscono affordance da puntatore, snapping, i due set-piece pinnati, gli y-slide dell'hero e il landscape; il preloader è coreografia pura, accorciata a sessione ripetuta.
3. **Sersan oggi** (`SERSAN_INVENTORY.md §3`): il preloader È già lo stesso su telefono (tunnel 14k punti <768 px, DPR 1.5, stessa coreografia). Il gap è **negli effetti**: `detectTier()` manda ogni coarse pointer a `lite` (`tierStore.ts:100-101`) e `lite` toglie **8 isole + tutto il PostFX** (`Scene.tsx:331,344,381,397,424,454,487`). I doc precedenti hanno dichiarato «settled» il "no bloom su telefono" (`MOBILE_HOME_SPEC.md:356`) — **questo piano lo ribalta esplicitamente**, con l'evidenza Lusion (bloom su mobile a DPR 1.5, versione economica) e con un gate di misura reale che può ri-spegnerlo per device.

---

## 1 · Cambio di policy (cosa si ribalta, cosa si tiene)

**Si ribalta** (con motivazione e kill-switch per ciascuno):
- «Post-processing off su telefono, settled» → **PostFX lite su telefoni capaci** (WebGL: `<Bloom levels 4>` + niente `<Noise>`; WebGPU: stessa catena a DPR 1, niente grain, niente fluid — sul BloomNode non esiste un knob di costo, vedi Phase 0/2). Motivo: Lusion tiene bloom + post stack su telefono (versione economica) — ma il caso si regge sul **gate di misura di Phase 6**, non sull'analogia. Kill-switch: `fxBudget.postFx = "off"`.
- «Raymarch mai su telefono» → **twin a `uIterations`/`uStep` accoppiati al gradino basso + `dprCap 1`, dietro gate di misura**; se non regge il fallback CSS composito già spedito resta (Phase 4c). Il brand argument «meglio onestamente diverso che visibilmente peggiore» resta valido come criterio del **gate** (screenshot affiancato + fps), non come veto a priori.
- «`tier` decide tutto» → `tier` resta **solo layout DOM**; gli effetti leggono un **budget** (`fxBudget`) additivo per-asse. Il debito semantico registrato in `tierStore.ts:12-19` viene pagato senza toccare i 13 call site di `tier` (Phase 1).
- «Keep the particle intro off» (`MOBILE_AUDIT.md:162`) e D-11 «nessun `[data-hero-brand]` sul compact» (`MOBILE_HOME_SPEC.md:354,453`) → **beat brand "Sersan AI" anche su telefono capace, ma auto-play a tempo, senza consumo di scroll, tap = skip** (Phase 4b). Il vincolo «no `preventDefault` su touchmove» (`MOBILE_HOME_SPEC:72,441`) **resta**. Kill-switch: `HERO_BRAND_COMPACT=false`.

**Si tiene**: RM ⇒ nessun canvas; scroll touch nativo (nessun nuovo `preventDefault`); copy; desktop `tier full` byte-identical dopo il preloader e desktop stretto (<768) invariato; niente affordance da puntatore su touch (cursore custom, magnetic, tilt hover, blueprint lens — anche ERA e Lusion le tolgono); snap engine off su touch.

---

## 2 · Matrice obiettivo (stato finale che il piano deve raggiungere)

Legenda: **D** desktop `tier==="full"` (fine pointer **e** ≥768 px) · **P+** phone capace (`fxBudget.level 2`) · **P−** phone debole (`level 1` = **esattamente oggi**, così `?fx=1` è "come oggi") · **RM** reduced-motion · **D-narrow** finestra desktop <768 px fine pointer = `tier lite` come oggi, **non cambia** (non in tabella).
"=" significa *stessa cosa del desktop, budget diverso*; le celle in **grassetto** sono i cambi rispetto a oggi (`SERSAN_INVENTORY.md §3`). I conteggi P+ derivano da `particleScale 0.5`; P− = costanti attuali.

| # | Effetto | D | P+ (obiettivo) | P− (= oggi) | RM | Fase |
|---|---|---|---|---|---|---|
| 1 | Preloader (tunnel + mark + counter) | 50k pts, DPR 1.5 | = **25k pts (50k×0.5), conteggio da budget** (non da `innerWidth`), stesso hand-off | 14k pts (euristica attuale) | skip | 3 |
| 2 | Signature line | 640 seg + breath/comet/lookAt/roll/orbit/dolly | **= 640 seg + comet + breath** (dolly ×0.5; orbit/parallax solo se alimentati dal gyro di 4e, ampiezza dimezzata) | 320 seg | — | 4e |
| 3 | Drift particles | 3000 | **1500** | 800 | — | 4e |
| 4 | Hero logo (spores) | 192² wgpu | 128² (oggi) | static | — | — |
| 5 | Hero text particles + intro (brand "Sersan AI") | 48k, wgpu, scroll-gate | **= 24k (48k×0.5), brand compatto nella CompactSpine, auto-play senza scroll-hijack, tap = skip** | ✗ (DOM cascade) | ✗ | 4b |
| 6 | HomeSingularity (eclissi dietro il brand) | 128 iter | **= `uIterations`/`uStep` accoppiati al gradino basso (ITER_LO 64/STEP_LO o 48/2×), DPR cap 1** | ✗ | ✗ | 4b |
| 7 | SequenceSingularity (plunge) | raymarch 96 + tunnel | **twin misurato** (64 iter accoppiati, DPR cap 1) → se fallisce, CSS composito (oggi) | CSS composito | statico | 4c |
| 8 | Neural lattices | 9000 | 3200 (oggi, via `phoneGL`) | SVG | SVG | — |
| 9 | Rail planes | ✓ (pinned DOM) | **✓ guidati da una sorgente continua nuova (scrollLeft del rail nativo → railStore)**, `[data-focus]` solo come on/off | ✗ (DOM rail) | ✗ | 4d |
| 10 | Founders portrait morph | 60k wgpu, pin | **stretch: 20k, scrub = offset del card dal centro (stessa sorgente di #9)**, gate misura | DOM colour reveal (oggi) | ✗ | 4d |
| 11 | Post-FX bloom/vignette | full | **lite** (WebGL: `<Bloom levels 4>` + no Noise; WebGPU: stessa catena a DPR 1, no grain, no fluid — nessun knob di costo sul BloomNode) | ✗ | ✗ | 2 |
| 12 | Audit singularity, Resource preview plane | ✓ | **= (twin iter/step ridotti / sorgente #9)** | ✗ | ✗ | 4d |
| 13 | Camera parallax da puntatore | mouse | **DeviceOrientation (gyro) opt-in dopo primo tap, ±metà ampiezza** (Lusion) | ✗ | ✗ | 4e |
| 14 | Card image distort (hover) | ✓ | **= su `[data-focus]` (centre-focus) invece che hover** | ✗ | ✗ | 4e |
| 15 | Custom cursor, magnetic, tilt, blueprint lens | ✓ | ✗ (nessun puntatore — anche ERA/Lusion) | ✗ | ✗ | — |
| 16 | Route transitions (curtain + FLIP) | curtain + FLIP | curtain (oggi) **+ FLIP su coarse** dove la sorgente è visibile | curtain | istantaneo | 5 |
| 17 | Lenis smooth | wheel | nativo (invariato) | nativo | nativo | — |
| 18 | Snap engine | ✓ | ✗ (invariato) | ✗ | ✗ | — |
| 19 | Adaptive resolution | [1,2], nessun tetto (invariato; tetto desktop = Decisione 9) | **[1,1.5] + tetto 2560×1440 (Lusion), mai sotto `dprMin`** | [1,1.5] (oggi) | — | 1 |

---

## Phase 0 · Documentation Discovery — Allowed APIs (consolidato; dettagli e prove nei tre PHASE0_*.md)

Regola: **si usano solo queste API, con queste firme, dai file citati**. Niente parametri inventati.

**Tiering / DPR / perf** (`PHASE0_TIERING_APIS.md`)
- Repo: `useTierStore` (`tierStore.ts:26-86`) → `tier`, `phoneGL`, `resolved`, `backend`, `dprInitial/Min/Max`, `dprCap`, `resolve()`, `degrade()` (**nessun caller oggi**), `setDprCap()`. `AdaptiveResolution({initial,min,max,step=0.25})` (`AdaptiveResolution.tsx`) = drei `PerformanceMonitor bounds [48,58]`, drop istantaneo, climb dopo 8 s, **senza `flipflops`** (latch permanente, trappola documentata a `:91-104`).
- drei 10.7.7: `PerformanceMonitor { ms=250, iterations=10, threshold=0.75, bounds, factor, step, onIncline/onDecline/onChange/onFallback }` + `usePerformanceMonitor({onDecline…})` (**un solo monitor per albero**, altri consumer via hook); `useDetectGPU(opts)` → `TierResult {tier 0-3, type, isMobile, fps, gpu}` — **suspende**, cache globale, `benchmarksURL` default = unpkg → **self-host** i 16 JSON da `node_modules/detect-gpu/dist/benchmarks/` in `public/benchmarks/`; `detect-gpu 5.0.70` è installato (transitivo). `AdaptiveDpr` **NON** va montato insieme ad `AdaptiveResolution` (entrambi scrivono `setDpr`).
- R3F 9.6.1: `dpr: number | [min,max]` (`calculateDpr` = device dpr clampato, non adattivo), `useThree(s => s.setDpr)`, `performance.regress()` (nessun caller — se adottato sostituisce, non affianca, AdaptiveResolution).
- three r184 WebGPU: `PassNode.setResolutionScale(n)` (r181+; `setResolution` deprecato), `BloomNode.strength/.radius/.threshold` uniform + `_nMips=5` interno, `PostProcessing.needsUpdate/.render()`; `renderer.hasFeature()` **lancia** prima di `await init()`; `renderer.info` (`render.calls`, `memory.texturesSize` …). WebGL: `renderer.capabilities.maxTextureSize/maxSamples/precision`; `floatFragmentTextures` **rimosso** in r184; `isWebGL2` sempre `true` (inutile come segnale).
- postprocessing 6.39.1 / R3P 3.0.4: `<EffectComposer enabled multisampling(default 8!) frameBufferType(HalfFloat)>`; `pass.enabled=false` = costo zero; `<Bloom mipmapBlur levels={4..5} luminanceThreshold intensity radius>` (`kernelSize/resolutionScale` deprecati). WebGL-only (crasha con `three/webgpu`) → resta lo split build-time `webgpuEnabled()`.

**Loading / preloader** (`PHASE0_LOADING_APIS.md`)
- `LoadingManager(onLoad?, onProgress?(url,loaded,total), onError?)`; `onStart` solo come proprietà; contatori **per item, non per byte**, privati; `DefaultLoadingManager` è **un singleton condiviso** tra `three`, `three/webgpu`, addons, three-stdlib. **Non sovrascrivere `DefaultLoadingManager.on*` se `useProgress` (drei) è importato** → usare un `new LoadingManager()` privato per il manifest del preloader.
- `FileLoader.load(url, onLoad, onProgress(ProgressEvent{loaded,total}), onError)` = progresso in **byte** per file (serve `Content-Length`); `Cache.enabled`. `GLTFLoader.setDRACOLoader/.setKTX2Loader/.setMeshoptDecoder`; drei `useGLTF.preload(url)`, `useGLTF.setDecoderPath('/draco/')` (default = CDN Google); `useTexture.preload`; **`useKTX2` è rotto su WebGPURenderer** (three-stdlib, `detectSupport` WebGL-only) → se serviranno KTX2 usare `three/addons/loaders/KTX2Loader.js` con `detectSupport(gl)` **dopo** `await init()` (già garantito dal gl factory async di R3F).
- R3F: `gl` come `(defaults) => Promise<Renderer>` (repo `createRenderer.ts` — copy-ready); niente dentro `<Canvas>` monta prima che la promise risolva; **ogni isola che sospende va in un proprio `<Suspense fallback={null}>`** (il Canvas ha un `<Block/>` che sospende tutto l'albero). `frameloop="never"` + `advance()` esiste ma NON lo usiamo (PipelineWarmup deve vedere frame).
- drei `useProgress` = zustand store fuori dal Canvas (`{progress, loaded, total, active, item}`); `<Preload all/>` è **WebGL-only** (su WebGPU chiama `compile` = `compileAsync` non atteso) → warm-up WebGPU esplicito con `await gl.compileAsync(scene, camera)`.
- Next 16: `dynamic(() => import(...), {ssr:false})` solo in file `"use client"` (`CanvasHost.tsx` copy-ready); `next/font/local` preload di default; `document.fonts.load('600 1em Switzer')` per garantire volti mai dipinti.

**Motion touch** (`PHASE0_MOTION_TOUCH_APIS.md`)
- Lenis 1.3.23: `syncTouch=false` (default) ⇒ touch **nativo** (`isScrolling="native"`); `lenis.isTouching`; `on('scroll')` ritorna unsubscribe; `stop()/start()` gestiscono `html.lenis-stopped`. Repo: `acquireLenis/releaseLenis/getLenis/setExternalPump/pumpLenis` (`lenis-singleton.ts`), `attachSnap/detachSnap/suspendSnap` (`scroll-snap.ts`), `SmoothScrollProvider` (D-9 resize bridge, `ScrollTrigger.config({ignoreMobileResize:true})`).
- GSAP 3.15: `gsap.matchMedia().add({compact:'…', motionOk:'…'}, ctx => …)` (chiavi libere, `all` riservata; cambio di query = revert + rebuild, incl. ScrollTrigger annidati); `ScrollTrigger.refresh()`, `pinType` default `"fixed"` sul window scroller (corretto con Lenis 1.3 che scrolla la window vera); `_div100vh` ⇒ le posizioni ScrollTrigger sul window scroller risolvono contro il **large viewport (lvh)** — runway in `svh` sono `(lvh−svh)` più corte (già ragionato in `singularity-passage.tsx:2170`). `ScrollTrigger.matchMedia` **deprecato**. `useGSAP(fn, {scope, dependencies, revertOnUpdate})`.
- CSS: `svh` per stage pinnati (mai `vh`, mai `dvh` per scrub), Tailwind `h-svh/h-dvh/h-lvh` disponibili.

**Gyro (Phase 4e) — non nei PHASE0, aggiunto qui**: `DeviceOrientationEvent` è dichiarato in `lib.dom.d.ts` (TS 5.9) **senza** `requestPermission` (è uno static Safari-only). Uso ammesso: feature-detect tipizzato localmente —
`const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<"granted"|"denied"> }; if (typeof DOE.requestPermission === "function") …` — chiamato **solo dentro un gesture handler** (tap), poi `window.addEventListener("deviceorientation", …)` (`beta`/`gamma`, `passive:true`). Una chiamata "nuda" è un errore di tipo e fa fallire `tsc`.

**Raymarch (Phase 4b/4c) — leve reali**: `blackHoleMaterial.ts:55-63,350,405` — `uIterations` (default 128) e `uStep` vanno scalati **inversamente** per tenere il prodotto di cammino ≈1.82 (header del materiale); i gradini esistenti sono `seqStore.ts:220-222` `ITER_HI 96 / ITER_LO 64` con i rispettivi STEP. Le singolarità sono **mesh nella scene pass unica**: **non hanno un PassNode proprio** ⇒ `setResolutionScale` NON è una leva per isola. `PassNode.setResolutionScale` esiste solo sullo `scenePass` di `PostFXNodes.tsx:249` e scala l'intera scena (equivale a un calo di DPR).

**Bloom WebGPU — nessun knob di costo**: `BloomNode.js:122` `_nMips = 5` è privato e fisso; i RT si ridimensionano ogni frame da `renderer.getDrawingBufferSize()` (`:262-297`) ⇒ l'unica leva di fill è la **DPR** (già 1.0 su coarse via `detectDprRange`); `strength/radius/threshold` sono uniform di compositing, non di costo. Un bloom "a 4 mip" su WebGPU richiede una **sottoclasse/patch** di BloomNode (lavoro nuovo, non un knob).

**Bloom WebGL — `HalfFloatType` obbligatorio**: `UnsignedByteType` clampa a [0,1] e il bloom selettivo con `luminanceThreshold 1.0` (`fxStore.ts:280`) non produrrebbe **nulla**. Leve reali: `<Bloom mipmapBlur levels={4}>` (default 8) e non montare `<Noise>`; `multisampling` è già 0.

**Anti-pattern da NON introdurre** (tutti con prova nei PHASE0 o qui sopra): `KTX2Loader.detectSupportAsync` (deprecato r181); `renderAsync/hasFeatureAsync/initTextureAsync` (deprecati r181); leggere `manager.itemsLoaded` come proprietà; `<Canvas fallback>` come Suspense fallback; `AdaptiveDpr` + `AdaptiveResolution` insieme; `PerformanceMonitor flipflops` finiti; **`usePerformanceMonitor` chiamato nel corpo di `AdaptiveResolution`** (è lui a renderizzare il `<PerformanceMonitor>`: fuori dal provider `api` è `null` e `api.subscribe` lancia — usare la prop `onDecline` esistente); `frameBufferType={UnsignedByteType}` con bloom a soglia; `setResolutionScale` "per isola"; `Cache.enabled` globale con `FileLoader` a `responseType` non allineato (poisona `useGLTF`, vedi 3.3); probe WebGL1 come capability (`detectTier():95` — bug latente: three r184 richiede WebGL2); `useBVH` (deprecato); `state.mouse` (→ `state.pointer`); UA sniffing per **capacità** (Lusion lo fa, ma su iOS il renderer string è nascosto → noi usiamo budget + misura, mai UA per feature); `renderer.info.render.calls` come metrica per-frame su WebGPU (è cumulativo — usare `frameCalls/drawCalls`).

---

## Phase 1 · Prerequisiti + asse `fxBudget` (fondamenta — nessun effetto nuovo qui)

**Perché prima**: ogni effetto pinnato su telefono si arma su ScrollTrigger; se la misura è sbagliata (B1) tutto il resto è invalidato. E gli effetti devono leggere **un** budget, non `tier`.

### 1.1 Chiudere i difetti confermati in `MOBILE_TODO.md §1` (mezza giornata)
- **B1** `cinematic-system-scroll.tsx:1154` — copiare la forma corretta da `audit-week-timeline.tsx:175-176`:
  `if (prev === mode) return; if (prev === null && mode === "desktop") return;` — e lo stesso in `fit-section.tsx:496`,
  `case-studies-rail.tsx:365` (SSR `"pinned"`), aggiungere l'effetto mancante in `services-section.tsx` (`:465`).
- **A1** `case-studies-rail.tsx:304` (`stackInFlow` da `detected && coarse`, non da `mode`), **A2** `drag-rail.tsx:122/341/247` (fade + `scroll-padding-inline` sotto `@media (pointer: coarse)`; `overscroll-behavior-x` via `lib/rail-overscroll.ts` `applyRailOverscroll`: coarse⇒`auto` / fine+motion⇒`contain` (il `.lenis-smooth` esiste solo durante l'animazione, la cascade non basta) / fine+RM⇒cleared — **stesso helper in `services-section.tsx`**), **B2** `case-studies-client.tsx:99` (`tap-44 press-surface`), **B3** `services-section.tsx:895`. *(Esito 2026-08-17: tutti applicati.)*
- **§2** (pagina montata ≤768 poi allargata resta mobile): diagnosticare il latch prima di toccare. **Esito 2026-08-17 (diagnosi eseguita, nessun file toccato)**: nel codice **non esiste un latch** — spine mode (`cinematic-system-scroll.tsx:1112-1141`, MQL `change` sottoscritte, `mode` ri-derivato a ogni render, CompactSpine smonta e il suo `gsap.matchMedia` reverte), passage (`singularity-passage.tsx:521-573` `gsap.matchMedia` con cleanup che resetta `seqStore.lite`) e centre-focus (`use-centre-focus.ts:101-159`) sono tutte sottoscrizioni vive. I sintomi riportati sono artefatti dell'harness: (a) pane nascosto ⇒ `resize` e MQL `change` non vengono dispatchati (spec "update the rendering" sospeso; riprodotto: `matches` cambia, zero eventi, `document.hidden === true`), (b) emulazione touch ⇒ `(pointer: coarse)` resta true a qualsiasi larghezza ⇒ compact **by design** (D-11). Da ri-misurare con `visibilityState === "visible"` e `matchMedia("(pointer: coarse)").matches === false` asseriti dopo il resize; poi declassare `MOBILE_TODO §2` ad "artefatto harness". Osservazione secondaria (by design, fuori scope): `tierStore.resolve()` è one-shot ⇒ una finestra fine caricata <768 e allargata tiene `tier lite` per le isole WebGL fino al reload mentre il DOM passa a desktop (graceful) — segnalato all'owner, non toccato.
- Verifica: le misure di `MOBILE_TODO.md §0` invariate (home 14.46 vp @390, desktop hero 2835 px @1440); nav client-side su `/` da `/about` a 390 px → ScrollTrigger `start` delle sezioni sotto l'hero coerenti con il documento (log `ScrollTrigger.getAll().map(t=>[t.trigger?.id, t.start])` prima/dopo `refresh()` uguali).

### 1.2 `fxBudget` in `tierStore.ts` — additivo, in DUE step (device, poi backend), mai da UA
Aggiungere allo store (accanto a `phoneGL`, senza toccare `detectTier()` né i 13 call site di `tier`):
```ts
export interface FxBudget {
  level: 0 | 1 | 2 | 3;        // 0 = off (RM/no WebGL2), 1 = "oggi" (lite legacy: phone debole O desktop stretto <768), 2 = phone capace, 3 = desktop tier full
  postFx: "off" | "lite" | "full";
  particleScale: number;       // 0.25 · 0.5 · 1  (moltiplica i COUNT esistenti; level 1 usa le costanti attuali, non la scala)
  raymarchLite: boolean;       // vuole il twin a iter/step ridotti — VALE solo se && backend === "webgpu" (deciso dove si consuma)
  maxPixels: number;           // tetto backing store: 2560*1440 su ogni device (Lusion MAX_PIXEL_COUNT)
  gyroParallax: boolean;       // solo coarse + DeviceOrientation disponibile
}
```
**Derivazione — step 1, `resolveFxBudget()` pura, backend-free, chiamata da `resolve()` E dal preloader-tunnel** (che monta prima di CanvasHost; legge anche l'override `?fx=`):
- **`tier === "full"` ⇒ `level 3`** (fine pointer **e** ≥768 px — cioè esattamente i device che oggi montano tutto). ⚠ NON "fine pointer ⇒ 3": una finestra desktop <768 px oggi è `lite` e deve restarlo (byte-identical), e un desktop con `cores ≤ 4` oggi ha il tunnel a 14k — anche quello resta.
- `tier === "lite" && fine` ⇒ `level 1` **congelato = oggi** (postFx off, nessuna isola, costanti attuali, tunnel con l'euristica `small` attuale).
- `tier === "lite" && coarse` ⇒ `phoneGL ? 2 : 1`. `level 2` ⇒ `postFx:"lite", particleScale 0.5, raymarchLite:true`; `level 1` ⇒ come sopra.
- RM / no WebGL2 (`tier off`) ⇒ `level 0`.
**Step 2 (backend)**: `backend` è scritto **dopo** (`Scene.tsx onCreated` → `setBackend`, `tierStore.ts:251-253`; a `resolve()` è sempre `null`), quindi ogni gate TSL-only resta nella forma `fxBudget.raymarchLite && backend === "webgpu"` **nel punto di consumo** (`Scene.tsx`), come già fa 4b. Nessuna pretesa di "un solo set()" per gli assi che dipendono dal backend.
**Runtime step-down** (finalmente un caller per la logica di `degrade()`, ma sul budget non sul tier): nella **prop `onDecline` esistente** di `AdaptiveResolution.tsx:86-107` — `if (dpr.current <= min) stepDownBudget(); else apply(dpr.current - step)` — solo level 2→1 (postFx off, scala 0.25, raymarch off); mai il contrario automatico (Lusion non risale mai). NON `usePerformanceMonitor` nel corpo del componente (vedi anti-pattern). Non chiamare `degrade()` (lite→off smonterebbe il Canvas).
**Override URL per QA reale** (copiato dal `Settings` di Lusion, dev + preview only: `process.env.NODE_ENV !== "production" || location.hostname.endsWith(".vercel.app")`): `?fx=0|1|2|3`, `?dpr=1`, `?postfx=off|lite|full`, `?perf=1` (HUD di §6). Letti da `resolveFxBudget()`.
**Handle dev**: `window.__sersanTier = useTierStore` (nuovo; `__sersanFx` è già `useFxStore` — knob bloom/grain — `Scene.tsx:59-62`).

### 1.3 Tetto pixel in `AdaptiveResolution.tsx`
`effMax = max(min, min(max, dprCap ?? max, sqrt(maxPixels / (size.width*size.height))))` — la formula `_onResize` di Lusion (`LUSION_DOSSIER §5 @1250032`) **con clamp a `min`**: su un tablet coarse 1024×1366 `sqrt(3.69MP/1.4MP)=1.62` non morde, ma con numeri più piccoli scenderebbe sotto `dprMin 1.0` e invertirebbe il range (`apply()` `:69-71`). Un solo numero per tutti: 2560×1440 = 3.69 MP; sui desktop 4K a DPR 2 (3840×2160×4 = 33 MP) il tetto **morde**: è un cambio desktop ⇒ **applicarlo solo quando `level ≤ 2`** in questa fase, e proporlo all'owner per il desktop come item separato (oggi il desktop non ha tetto).

### 1.4 Documentazione riferimenti
`PHASE0_TIERING_APIS.md §1.1-1.2` (API store + AdaptiveResolution), `§2.1` (PerformanceMonitor/usePerformanceMonitor), `§8.1/8.3` (degrade senza caller; assi budget invece di ridefinire `tier`); `LUSION_DOSSIER §5` (Settings/DPR/pixel limit); `SERSAN_INVENTORY §2` (matrice tier oggi).

### 1.5 Verifica
- `tsc --noEmit` pulito; `grep -n "tier ===" src` invariato (nessun call site di `tier` toccato).
- Desktop 1440×900: `window.__sersanTier.getState()` → `fxBudget.level === 3`, dpr iniziale invariato, `postFx "full"`; DOM identico a prima (0 `data-focus`, 7 canvas, `[data-hero-brand]` ×1).
- **Desktop stretto 700×900 fine pointer**: `level 1`, stesso set di canvas/isole di `main` — byte-identical. **Desktop largo con `hardwareConcurrency=4` emulato**: resta `level 3` (`detectTier()` non guarda i core; il tunnel a 14k viene dall'euristica **propria** del tunnel, Phase 3.1.2, non dal budget) — verificare che nulla cambi.
- 390×844 emulato: `level 2` (cores > 4 in emulazione) — con `?fx=1` `level 1`.
- Anti-pattern: nessun `navigator.userAgent` in `tierStore.ts` (grep); nessun `flipflops`; nessun secondo `<PerformanceMonitor>`; nessun `usePerformanceMonitor` in `AdaptiveResolution.tsx`.

---

## Phase 2 · Post-FX "lite" su telefono (l'item di parità più visibile)

**Cosa**: montare la catena post anche quando `fxBudget.postFx === "lite"`. Onestà sui knob (verificati sui sorgenti installati, vedi Phase 0):
- `Scene.tsx:487-492`: il gate diventa `fxBudget.postFx !== "off"` (su desktop `postFx === "full"` ⇒ identico a oggi). Passare `level={fxBudget.postFx}` ai due rig.
- `PostFXNodes.tsx` (flag WebGPU ON — il path di produzione **se** `NEXT_PUBLIC_WEBGPU=1` è su Vercel, da verificare, vedi Decisioni): **non esiste un bloom "più economico"** sul BloomNode (`_nMips=5` fisso; i RT seguono `getDrawingBufferSize()`), quindi `lite` = **stessa catena a DPR 1.0** (già così su coarse via `detectDprRange`), **grain off** (`noiseOpacity 0` ⇒ nodo omesso, `PostFXNodes.tsx:313`), **fluid off** (già `pointer: fine`-only, `:178-181`), vignette e tonemap invariati. Il costo di fill è "5× fullscreen a DPR 1" (`MOBILE_HOME_SPEC:356`) — è **esattamente** ciò che il gate di Phase 6 deve misurare. Se il gate fallisce di poco, il lavoro nuovo (non un knob) è una sottoclasse di BloomNode con `_nMips 3-4`, oppure `scenePass.setResolutionScale(0.75)` per l'**intera** scena (softening accettato).
- `PostFX.tsx` (flag OFF, WebGL): `<EffectComposer multisampling={0} frameBufferType={HalfFloatType}>` **invariato** (`UnsignedByteType` spegnerebbe il bloom a soglia 1.0) + `<Bloom mipmapBlur levels={lite ? 4 : 8} …>`; `<Noise>` non montato in lite. Decidere il livello al mount (cambiare `multisampling/frameBufferType` a runtime ricostruisce il composer).
- La sheath additiva della linea (`MOBILE_HOME_SPEC §3.5`, se/quando costruita) resta compatibile: è un'aggiunta compatta; se il bloom lite regge, la sua intensità diventa un knob.

**Doc**: `PHASE0_TIERING_APIS.md §4.3` (BloomNode/PassNode), `§5` (EffectComposer/Bloom levels, `enabled`, HalfFloat), Phase 0 di questo piano (blocchi "Bloom WebGPU/WebGL"), `LUSION_DOSSIER §4` riga Bloom (`USE_CONVOLUTION:e,USE_HD:e` con `e=!isMobile`), `SERSAN_INVENTORY §3` riga 13.
**Verifica** (misurabile con gli strumenti nominati): emulazione 390×844 con `?fx=2`: bloom visibile sulla signature line (>1.0 emissive) e sul mark; **frame time medio** (HUD `?perf=1`, media su 5 s) e `renderer.info.render.drawCalls`/`triangles` per frame (WebGPU `info.render.frameCalls`, non `calls` che è cumulativo) e `info.memory.texturesSize` registrati lite vs off; solo sul path WebGL `levels 4` riduce anche le call; nessun errore console; desktop invariato (`?fx=3` = default). **Gate reale (Phase 6)**: ≥ 50 fps sostenuti su Android medio con `postFx lite` a DPR 1 — altrimenti `stepDownBudget()` lo spegne da solo (verificare che scatti entro ~2.5 s) e si registra il device.
**Anti-pattern**: mai montare `PostFX` (R3P) col renderer WebGPU; mai `resolutionScale` di R3P come "scala globale" (alimenta solo il DepthDownsamplingPass); mai `Bloom kernelSize`; mai `UnsignedByteType`.

---

## Phase 3 · Preloader — parità già presente; qui si chiude ciò che Lusion/ERA fanno meglio

Stato (`SERSAN_INVENTORY §1`): stesso overlay/tunnel/coreografia su telefono; 4 segnali reali (fonts .30 / load .29 / tier .29 / warm .12), min 700 ms, watchdog 14 s, RM skip. **Non si riscrive**: si corregge e si completa.

### 3.1 Correzioni (bug o incoerenze)
1. **No-WebGL, motion OK ⇒ 14 s di attesa** (`preloader.tsx:439` aspetta `warm` che nessuno setta se `tier === "off"` senza RM; `PipelineWarmup` monta solo nel Canvas): in `targetFraction()` trattare `tier === "off"` come `warm = true`. (Il docblock `:39-40` lo promette già.)
2. **LOD del tunnel per budget, non per larghezza** (`preloader-tunnel.ts:349-351` usa `innerWidth<768 || cores<=4` ⇒ un tablet coarse ≥768 prende 50k): `level 2 ⇒ round(COUNT_DESKTOP * 0.5) = 25k`; `level 1` e `level 3` ⇒ **euristica attuale invariata** (14k/50k — così desktop e P− sono byte-identical). Il tunnel monta prima di `CanvasHost` ⇒ legge la funzione pura `resolveFxBudget()` (step 1 di Phase 1.2, che legge anche `?fx=`), non lo store.
3. Copy: «Initialising signal» / «52. SERSAN» sono solo EN (il sito è EN/IT) → **decisione owner** (copy finale: nessuna stringa nuova senza ok), vedi Decisioni.
4. Il pointer-tilt del tunnel su touch (`preloader-tunnel.ts:346,442`) è inerte: nessuna azione, ma **gyro** (Phase 4e) può guidarlo se `gyroParallax` (opzionale, dopo il primo tap — Lusion).

### 3.2 Il "30 % di compile" di Lusion, per quanto è davvero possibile da noi
Oggi `warm` è **empirico** (28 frame lisci dopo ≥2 s, `PipelineWarmup.tsx`). Lusion **enumera** i task (`compileAsync` per materiale/scena + `initTexture`, uno per frame) e ne fa il 30 % del contatore. Da noi la coda esplicita è **più sottile** di quanto sembri: `Renderer.compileAsync(scene, camera)` compila i render object della scena montata **ma non** il grafo post (`PostProcessing/RenderPipeline` non ha compileAsync — compila al primo `post.render()`) **né** le pipeline compute (text sim, spore, lattices compilano al primo `renderer.compute()` nel loro `useFrame`); HeroLogo e NeuralLattice non hanno `compileAsync`; le singolarità costruiscono **dopo** il preloader (HomeSingularity a `assembleDone`, `Scene.tsx:410-416`; SequenceSingularity all'approach) e non possono essere task del contatore. Quindi: in `PipelineWarmup` un pre-passo `await gl.compileAsync(scene, camera)` (WebGPU `Renderer.js:860`; WebGL `WebGLRenderer.compileAsync` r184) + un `post.render()` reale (già avviene: si renderizza sotto l'overlay — **è per questo che NON si introduce un render-gate**: renderizzare sotto l'overlay È il nostro warm-up, e i delta lisci sono la misura) ⇒ pubblica `warmProgress` (0.5 quando compileAsync è risolto, 1 quando i 28 frame lisci sono passati) in `introStore`. `targetFraction()` diventa `assets 0.70` (fonts .25 + load .20 + manifest .25 di §3.3) + `warm 0.30` (era .12): il contatore respira nell'ultimo tratto invece di parcheggiare a 88 %. **Questo cambia il ritmo del contatore anche su desktop**: è l'eccezione dichiarata in testa al piano.

### 3.3 Manifest asset con progresso in byte (Lusion `quick-loader`)
Oggi nessun asset è nel contatore (solo fonts/load). Con le isole in più su telefono conviene: un `LoadingManager` **privato** (`new LoadingManager()` — mai `DefaultLoadingManager`, `useProgress` di drei lo sovrascriverebbe) in `src/webgl/loading/preloadManifest.ts` che apre `FileLoader` **solo su asset che nessun altro loader tocca** (i 3 headshot `public/founders/*.webp` del morph — solo se nel budget — e in futuro transcoder/decoder), con `setResponseType` allineato per URL. Il GLB del mark **non** entra nel manifest: `useGLTF.preload("/models/sersan-mark.glb")` (`HeroLogo.tsx:290-294`) è già il warm-up e la `Cache` di three è keyed **solo per URL** (`FileLoader.js:86,275`, ignora `responseType`) — un FileLoader testuale sullo stesso URL avvelenerebbe il caricamento `arraybuffer` di `useGLTF`. `Cache.enabled = true` è **globale** (ogni FileLoader/ImageLoader): se lo si attiva, documentarlo e allineare i responseType. Progresso = Σ`loaded/total` da `onProgress(ProgressEvent)` (serve `Content-Length`: Vercel lo espone per `public/`), pesato per byte.

### 3.4 Sessione ripetuta (ERA) — **decisione owner**
ERA accorcia con `sessionStorage.hasVisited`; Lusion no. Proposta: `sessionStorage.sersan_seen` ⇒ `MIN_VISIBLE_MS 700 → 350` e coreografia di uscita **identica** (il fold/zoom è il brand-bridge nella linea, non si taglia). Default proposto: ON. Non toccare `sersan_skip_intro` (`intro-skip.ts:33`, altro scopo). Vale anche su desktop (eccezione dichiarata).

### 3.5 Render gate "alla Lusion" — **NON si fa** (registrato per non riproporlo)
Lusion non renderizza a schermo finché l'overlay copre perché il suo TaskManager compila **esplicitamente**. Da noi (a) le pipeline WebGPU e il grafo post TSL compilano al **primo render** e le compute al primo dispatch ⇒ saltare il present sposterebbe l'hitch al primo frame dopo il reveal e accecherebbe `PipelineWarmup`; (b) sul path WebGL R3P `enabled={false}` porta la sua useFrame a priorità 0 e R3F riprende il render di default, e `FrameDriver` è a priorità 0 (`FrameDriver.tsx:102`) ⇒ non può sopprimere nulla; (c) i telefoni `postFx off` non hanno alcun owner del render a priorità 1. Un `RenderGate` a priorità 1 su ogni tier sarebbe **un nuovo render owner anche su desktop** — fuori scope.

**Doc**: `PHASE0_LOADING_APIS.md §1-3` (LoadingManager/FileLoader/Cache), `§7` (Suspense/gl factory), `§8` (`useProgress` conflitto, `Preload` WebGL-only), `§9` (`document.fonts.load`); `LUSION_DOSSIER §3` (state machine, TaskManager); `ERA_DOSSIER §3` (sessionStorage); `SERSAN_INVENTORY §1`.
**Verifica**: (a) Chrome con WebGL disabilitato (`--disable-webgl`, motion OK) ⇒ overlay via entro ~1 s, non 14 s; (b) `?fx=2` ⇒ tunnel 25k punti (log count), `?fx=1` e desktop ⇒ 14k/50k come oggi; (c) counter: sale a ~70 % con asset+fonts, poi 70→100 con `warmProgress` (log); (d) 2ª visita in sessione: overlay più breve, hand-off identico; (e) RM: nulla monta, `introComplete` subito; (f) desktop: durata alla 1ª visita ≤ oggi (min 700 ms invariato) — la differenza di **ritmo** del contatore è il diff ammesso.
**Anti-pattern**: `DefaultLoadingManager.onProgress = …`; `useProgress` per il manifest; `Preload all` su WebGPU; FileLoader sul GLB del mark; watchdog alzato per "aspettare di più"; qualsiasi salto del present.

---

## Phase 4 · Isole su telefono per budget (ordine = costo/beneficio; ognuna dietro il gate di misura di Phase 6)

Regola comune: il gate in `Scene.tsx` per ogni isola passa da `tier === "full"` a `fxBudget.<asse>` (+ `&& backend === "webgpu"` per le isole TSL-only, deciso nel punto di consumo) con la garanzia che `tier === "full"` ⇒ `level 3` ⇒ **desktop identico** e `tier lite && fine` ⇒ `level 1` ⇒ desktop stretto identico. Ogni isola mantiene il proprio fallback DOM (mai rimuoverlo: è il rung 1 della catena `MOBILE_HOME_SPEC §3.8`); isola e fallback sono sempre **mutuamente esclusivi**.

### 4a · Già fatto: NeuralLattice (`island = tier==="full" || phoneGL`, 3200) — solo migrare il gate a `fxBudget.level ≥ 2` mantenendo `use-neural-lattice-fallback.ts` come complemento esatto (stessa commit).

### 4b · Hero brand + eclissi su CompactSpine (il "wow" che il telefono non ha) — **ribaltamento dichiarato**
Questa fase ribalta due decisioni ancora in vigore (elencate nel §1 "Si ribalta"): `MOBILE_AUDIT.md:162` «Keep the particle intro off» e `MOBILE_HOME_SPEC.md:354/453` (D-11: niente `[data-hero-brand]` sul compact, niente `preventDefault` su touchmove — `:72,:441`). Il vincolo "scroll touch nativo" **resta**: il beat touch è progettato **senza** consumo di scroll.
Oggi strutturalmente impossibile perché la CompactSpine non emette `[data-hero-brand]` (`cinematic-system-scroll.tsx:943,1376`; `HeroTextParticles.tsx:199-213` richiede `[data-hero-headline]` + `[data-hero-brand]` + backend WebGPU). Piano:
1. `CompactSpine`: aggiungere il brand compatto (`data-hero-brand` **e** `data-hero-brand-compact`, un beat "Sersan AI" a `13vw` Switzer come l'intro one-beat desktop di `intro-one-beat-scroll-snap-2026-07-23.md`) **solo** quando `fxBudget.level ≥ 2 && backend === "webgpu"` (letto dallo store nel client, mai in SSR ⇒ nessun mismatch: la CompactSpine è già client-resolta). **Effetti collaterali noti da gestire nella stessa commit**: (a) `navbar.tsx:625-642` nasconde l'header su `/` quando esiste `[data-hero-brand]` usando `SPINE_TRAVEL_VH` del desktop (315vh) — sul compact (180svh) deve leggere il travel reale (o escludere `[data-hero-brand-compact]`); (b) `StagePanel` con `compact` non legge `textMorphStore` (`isHero && !compact`, `:403-453`) ⇒ togliere il bypass quando il brand compatto è armato, altrimenti la H1 non fa il crossfade/cascade.
2. **Beat touch senza scroll-hijack**: su coarse l'assemble parte **da solo** al lift del preloader (già così su desktop, `HeroTextParticles.tsx:6-11,52`), la dissolve nella H1 è **a tempo** (non a scroll consumato), **tap = skip** (`sersan_skip_intro` già esiste); `HeroIntroGate` **non** si monta su coarse (nessun `touchmove` `passive:false`, nessun `getLenis().stop()` per il gate); il tablet coarse a 1024 px che oggi prende il gate desktop (`MOBILE_HOME_SPEC:453`, D-11) viene così **sistemato**, non peggiorato. Count `48k * 0.5 = 24k` (misurare; HeroLogo compatto è già 128² = 16k).
3. `HomeSingularity`: gate `fxBudget.raymarchLite && backend === "webgpu"`; in lite `uIterations`+`uStep` accoppiati al gradino basso (`ITER_LO 64/STEP_LO`, o 48 con step ×2 — `HomeSingularity.tsx:104-108` «scale uStep inversely»), `dprCap 1` mentre `morph.active`; build **differita** a `assembleDone` (già così, `Scene.tsx:410-416`).
- Doc: `SERSAN_INVENTORY §3` righe 5-7,31; `MOBILE_HOME_SPEC` §3.7 hero (il beat brand è **dentro** lo stage sticky 180svh, non un runway in più — vincolo pagina ≤ 14.5 vp); Phase 0 blocco "Raymarch".
- Verifica: 390×844 `?fx=2` con WebGPU (Chrome Android): "Sersan AI" si assembla in ≤ 3.6 s, si dissolve nella H1 DOM, l'eclissi appare dietro e sfuma; tap ⇒ skip; **lo scroll nativo non è mai bloccato** (nessun listener `touchmove` non-passive registrato: verificare con `getEventListeners(document)` in DevTools); `?fx=1` ⇒ DOM cascade come oggi; **home ≤ 14.5 vp** invariata; header nascosto/mostrato agli scroll giusti; desktop invariato (`document.querySelectorAll('[data-hero-brand]').length === 1`).

### 4c · SequenceSingularity: twin misurato o CSS composito
Gate `fxBudget.raymarchLite && backend === "webgpu"` ⇒ montare `SequenceSingularity` con `uIterations/uStep` al gradino basso (`ITER_LO 64/STEP_LO`, già in `seqStore.ts:220-222`) e `dprCap` già `LITE_DPR_CAP 1` (`:371`). Il branch telefono di `singularity-passage.tsx:573` (CSS hole + veil + point tunnel) resta il fallback e **il default finché la misura non passa** (flag `SEQ.LITE_RAYMARCH` false di default). Criterio del gate (brand argument di `MOBILE_HOME_SPEC:355` reso misurabile): a 390 px il ring lensato con bloom lite deve leggere come il desktop in uno screenshot affiancato **e** ≥ 50 fps; se una delle due fallisce ⇒ resta il composito.

### 4d · RailPlanes / FounderPortraitMorph / AuditSingularity / ResourcePreviewPlane su touch (stretch, ≥ 1 giorno)
- Il problema è il **pin** (`railStore.pinned`/`foundersMorphStore.pinned` scritti solo dal DOM pinnato desktop, `MOBILE_HOME_SPEC:352-353`), non la GPU. Su touch le rail sono scroller nativi. **`useCentreFocus` NON basta**: è un IntersectionObserver a banda verticale che scrive un booleano `data-focus` sugli edge (`use-centre-focus.ts:135-143`) — nessun valore continuo, nessuna posizione orizzontale. Serve una **sorgente continua nuova**: listener `scroll` `passive:true` sullo scroller nativo del rail che scrive `scrollLeft` e l'offset di ogni card dal centro in `railStore`/`foundersMorphStore` (scrittura store, zero `setState`), + un **branch "native"** nel modello di placement di `RailPlanes.tsx:130-161,186-235` e nello scrub del morph (`FounderPortraitMorph.tsx:756-775`), oggi costruiti sul frame pinnato (secTop/travel/trackX). `[data-focus]` resta solo come on/off. Count morph P+ `60k*0.33 ≈ 20k`. Gate `fxBudget.level ≥ 2 && backend === "webgpu"` + flag proprio `RAIL_ISLANDS_TOUCH` (default off). Regola di mount **unica**: isola e fallback DOM **mutuamente esclusivi** (come le lattices), il colour-reveal DOM resta l'unico visual finché l'isola non è live.
- `AuditSingularity` (`/audit`): come 4c (iter/step ridotti). `ResourcePreviewPlane` (`/resources`): la stessa sorgente continua; il DOM gradient card resta.
- Verifica: rail su 390 px: il piano/morph segue il card centrato senza jitter (log dello store per frame, nessun re-render); nessuna sovrapposizione DOM+WebGL; con `RAIL_ISLANDS_TOUCH=false` tutto come oggi.

### 4e · Equivalenti touch degli effetti da puntatore (Lusion: gyro; ERA: bottom-sheet)
- **Gyro parallax** (`fxBudget.gyroParallax`): `DeviceOrientationEvent` con il feature-detect **tipizzato** di Phase 0 (`requestPermission` è uno static Safari-only assente da `lib.dom.d.ts`; chiamarlo nudo rompe `tsc`), richiesto **dentro il primo tap** (come `properties.onFirstClicked` di Lusion) ⇒ `beta/gamma` alimentano `pointerStore` con ±metà ampiezza (`installPointerTracking` è no-op su coarse, `pointerStore.ts:112` — aggiungere una sorgente alternativa, mai due). Consumatori gratis: camera micro-parallax (`cameraRigStore`), hero hover, tunnel tilt.
- **Card image distort** (`card-image-distort.tsx:253` `!coarse`): su touch guidato da `[data-focus]` (centre-focus) — stesso shader, trigger diverso.
- **Signature line P+**: 640 seg + `uBreath` + comet (`SignatureLine.tsx:205-211,747…`): il costo è vertex, non fill ⇒ leggibile a `particleScale ≥ 0.5`; dolly ×0.5 resta, orbit/parallax mouse restano off (gyro può alimentarli con ampiezza dimezzata).
- **DriftParticles** `level 2 ⇒ 3000 * 0.5 = 1500`; `level 1` resta 800 (costante attuale, `DriftParticles.tsx:42`); `level 3` 3000.
- Cursor custom, magnetic, tilt, blueprint lens: restano off (nessun puntatore — anche i riferimenti).
- Verifica: 390 px reale con gyro: la scena inclina ±, senza jank; iOS mostra il prompt permessi solo dopo tap; nessun listener `deviceorientation` su desktop (grep runtime).

**Doc Phase 4**: `SERSAN_INVENTORY §3` (gate esatti), `MOBILE_HOME_SPEC §3.8/§4.5` (fallback chain, motivazioni da superare esplicitamente), `LUSION_DOSSIER §4` (gyro `@780430`, sfere di vetro tolte = "un oggetto costoso in meno" ammesso), `PHASE0_TIERING §4.3` (PassNode/BloomNode — e il blocco "Raymarch" di Phase 0 per le leve reali).

---

## Phase 5 · Transizioni e motion su touch (ERA)

- **FLIP su coarse** (`use-flip-source.ts:43-44,111-112` bail su coarse): abilitare quando la sorgente è on-screen ≥ 60 % (le rail touch hanno un card centrato per costruzione); altrimenti curtain (`template.tsx`, 0.62 s) come oggi. Nessun ripple su RM (`flip-handoff-overlay.tsx:426`).
- **Landscape phone**: ERA rifiuta; noi **non** blocchiamo — ma per i beat pinnati (hero compatto, passage) sotto `(orientation: landscape) and (max-height: 500px) and (pointer: coarse)` la CompactSpine passa a `stacked` (già esiste) e il passage al composito senza tunnel. Un hint "ruota" è opzionale (decisione owner).
- **Lenis**: invariato (nativo su touch); `lenis.stop()/start()` già usati dal preloader; `html.lenis-stopped` gestisce l'overflow.
- Verifica: 390×844 → nav da rail card: FLIP visibile; landscape 844×390: nessun pin, nessun overflow orizzontale; desktop invariato.
- Doc: `ERA_DOSSIER §3-4` (Barba, landscape-cover, matchMedia 992), `PHASE0_MOTION_TOUCH_APIS §1.2,§2.3-2.4`, `SERSAN_INVENTORY §3` righe 24-26.

---

## Phase 6 · Gate di misura reale + harness (l'unica cosa che può spegnere una feature)

Tutte le cifre finora sono **aritmetica o emulazione** (`MOBILE_TODO §3`, `MOBILE_HOME_SPEC:471`): l'emulazione Chrome **non** emula il fill-rate di una GPU tile. Lusion non misura nulla e sceglie budget fissi; noi possiamo fare di meglio con una misura una-tantum per classe di device.

1. **HUD `?perf=1`** (dev/preview): overlay DOM che mostra `fps` **calcolato da un proprio `useFrame` delta** (non dai callback di `PerformanceMonitor`, che scattano solo su incline/decline e restano muti nella banda [48,58]), `dpr` corrente, `fxBudget`, `renderer.info` per frame (WebGPU `render.frameCalls/drawCalls/triangles`, `memory.texturesSize`; WebGL `render.calls` è per-frame con `autoReset`), `hardwareConcurrency`, `deviceMemory`, renderer string, backend. Zero costo quando assente.
2. **Device matrix minima**: 1 Android medio (Pixel 6a/7a o Samsung A5x, Chrome ⇒ WebGPU disponibile), 1 iPhone 12/13 (Safari 26+ per WebGPU, altrimenti fallback WebGL2 ⇒ `raymarch off`, lattices "still-but-igniting"), 1 tablet coarse ≥ 768. Collegamento: Android `chrome://inspect` (USB), iOS Safari Web Inspector; **mai** valutare con la tab in background (rAF strozzato — `MOBILE_TODO §5.4`).
3. **Criterio**: per ogni fase 2/4x, ≥ 50 fps sostenuti per 20 s di scroll reale con il budget P+ a DPR 1; memoria stabile (`texturesSize`); se fallisce ⇒ `stepDownBudget()` deve scattare da solo entro 2.5 s (10×250 ms) — verificarlo, non assumerlo. Registrare renderer string + cores + esito in `docs/recon-2026-08-17/DEVICE_LOG.md` (l'"OPEN QA ITEM cores ≤ 4" di `tierStore.ts:122-127` si chiude qui).
4. **Lighthouse mobile** (baseline 0.61 / LCP 7.6 s, mai ri-eseguito): non sotto 0.61; LCP non peggiora — il preloader non deve spostare l'LCP (l'overlay è `aria-hidden` e monta dopo l'hydration).
5. Playwright multi-viewport per la regressione DOM (già in uso nel progetto): 390/430/768/1024/1440, `document.body.boxSizing === "border-box"` e root 16 px asseriti prima di fidarsi (`MOBILE_TODO §5.3`).

---

## Final Phase · Verifica complessiva (prima di dichiarare "fatto")

- [ ] `tsc --noEmit` e `bun run build` puliti; `grep -rn "navigator.userAgent" src/webgl src/components/fx` ⇒ 0 (nessuna capacità decisa da UA); `grep -rn "preventDefault" src/components/sections/cinematic-system-scroll.tsx src/components/fx/hero-intro-gate.tsx` invariato rispetto a `main` (nessun nuovo scroll-hijack).
- [ ] Desktop 1440×900 cold load: hero 2835 px, passage 3420 px, `data-on="seq"`, `[data-hero-brand]` ×1, 7 canvas, `fxBudget.level 3`, PostFX full, screenshot before/after pixel-diff sotto soglia **dopo il lift del preloader**. **Diff ammesso (solo finestra preloader, dichiarato in testa)**: pesi del contatore (`assets .70 / warm .30`), manifest asset, min-visible di sessione 350 ms alla 2ª visita.
- [ ] Desktop stretto 700×900 fine pointer e desktop `hardwareConcurrency=4`: `level 1`, DOM/canvas/tunnel identici a `main`.
- [ ] 390×844 (`?fx=2`, WebGPU): preloader (25k) → brand intro auto-play (tap = skip) → eclissi → line con bloom lite → lattices → passage (twin o composito secondo gate) → rail planes/founders solo se `RAIL_ISLANDS_TOUCH` (altrimenti DOM) → FLIP su nav; home ≤ 14.5 vp; 0 overflow; nessun listener touchmove non-passive nuovo.
- [ ] 390×844 (`?fx=1`): tutto come oggi (DOM cascade, CSS composito, SVG lattices), preloader 14k punti.
- [ ] RM desktop e RM phone: nessun canvas, preloader saltato, rail STACK pills visibili (A1), DragRail non ripitturato (A2).
- [ ] No-WebGL motion-OK: overlay via in ≤ 1 s.
- [ ] Device log compilato per ≥ 3 device reali; nessuna feature "on" senza riga nel log.
- [ ] `MOBILE_HOME_SPEC.md §4.5` e `MOBILE_AUDIT.md:171` aggiornati con un paragrafo «superseded 2026-08-17 by plans/2026-08-17-mobile-parity.md» (non cancellare la motivazione storica).

---

## Decisioni per l'owner (bloccano fasi specifiche, non l'inizio)

1. **Bloom su telefono** — conferma del ribaltamento della decisione «settled» (Phase 2). Raccomandazione: sì, dietro gate.
2. **Brand intro "Sersan AI" anche su telefono** (Phase 4b) — editoriale (il telefono oggi va dritto alla H1). Raccomandazione: sì con skip al tap.
3. **Preloader corto a sessione ripetuta** (ERA) o sempre pieno (Lusion) — Phase 3.4. Raccomandazione: corto (350 ms min) con hand-off identico.
4. **`NEXT_PUBLIC_WEBGPU` su Vercel prod** — non verificabile dal repo (`SERSAN_INVENTORY §7.1`): se è OFF in produzione, tutte le isole TSL (5-11, 21-22) e `PostFXNodes` non esistono live e il path reale è `PostFX` WebGL. Va letto dalle env del progetto Vercel prima di Phase 2.
5. **Device reali disponibili** per Phase 6 (quali telefoni, chi li tiene in mano).
6. **Landscape**: hint "ruota" o silenzio (Phase 5).
7. **Gyro parallax** opt-in su iOS mostra un prompt di sistema al primo tap: accettabile per il brand? (Lusion lo fa.)
8. **Copy del preloader in IT** («Initialising signal», «52. SERSAN» oggi solo EN): tradurre o lasciare EN come "voce macchina"? (copy finale ⇒ serve il tuo ok, Phase 3.1.3).
9. **Tetto pixel anche su desktop** (2560×1440-equivalente, Lusion): sui 4K a DPR 2 abbassa la risoluzione del canvas — non è nel piano (desktop byte-identical); lo vuoi come item separato?

## Stato di esecuzione (aggiornato 2026-08-17 sera)
| Fase | Stato | Commit | Note |
|---|---|---|---|
| 1.1 difetti B1/A1/A2/B2/B3 | ✅ | `f5b4035` | §2 latch: diagnosticato = artefatto harness, nessun codice toccato |
| 1.2/1.3 `fxBudget` + tetto pixel | ✅ | `f5b4035` | level 3 ⇔ `tier full`; step-down solo dopo `warmReady`; cap solo a level 2 |
| 2 PostFX lite | ✅ (codice) | `7860390` | gate `fxBudget.postFx`; WebGL `levels 4`+no Noise; WebGPU stessa catena a DPR 1, grain/fluid off. **Render live NON ancora osservato** (pane nascosto non avvia il Canvas; Chrome reale non raggiunge il dev server) → Phase 6 |
| 3.1 (1,2,4) · 3.2 · 3.4 | ✅ | `7860390` | 3.1.3 copy IT → Decisione 8; 3.3 manifest **rimandato**; SESSION_SHORT=true (Decisione 3, raccomandazione applicata, un flag per tornare indietro) |
| 6.1 HUD `?perf=1` | ✅ | (questo commit) | `PerfProbe` in-Canvas (fps da delta EMA, `renderer.info` per-frame su entrambi i backend, ≤4 write/s) + `PerfHud` DOM; solo con `devOverridesAllowed()` |
| 4a-4e, 4c/4d, 5, 6.2-6.5, 3.3, Final | ⏳ | — | 4b/4c/4d dietro decisioni owner + gate di misura |

## Ordine consigliato e stima grossolana
Phase 1 (1 g) → Phase 3.1-3.2 (1 g) → Phase 2 (1 g) → Phase 6.1-6.2 harness (0.5 g) → **prima misura reale** → Phase 4a/4e (1 g) → Phase 4b (2 g: include navbar/StagePanel/beat auto-play) → Phase 3.3-3.4 (0.5 g) → Phase 4c (1 g, gate-dipendente) → Phase 4d (≥ 1 g, stretch, gate-dipendente) → Phase 5 (0.5 g) → Final. Ogni fase è eseguibile in una sessione nuova leggendo solo questo file + i dossier citati.

## Kill-switch (a una riga ciascuno)
Phase 2 `fxBudget.postFx="off"` · Phase 4b `HERO_BRAND_COMPACT=false` in `cinematic-system-scroll.tsx` · Phase 4c `SEQ.LITE_RAYMARCH=false` · Phase 4d `RAIL_ISLANDS_TOUCH=false` · Phase 4e `gyroParallax=false` · Phase 3.4 `SESSION_SHORT=false` · **tutto insieme** (spegne 2/4a/4b/4c/4d/4e): `?fx=1` o `stepDownBudget()`.
