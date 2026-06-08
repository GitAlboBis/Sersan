# PIANO.md — Fase 2

> Analisi completa del sito SERSAN attuale (codebase + osservazione live su `localhost:3000`, desktop) e piano di intervento: **cosa tengo, cosa potenzio, cosa rifaccio, cosa aggiungo — e perché**, con roadmap incrementale e budget di qualità.
>
> Vincoli fermi (da memoria/brief): **la signature line si preserva e si potenzia** (non si tocca l’impianto); **l’hero resta il Saturn draggabile** (no gemma); **il copy resta quello del sito attuale**; **git: solo branch `feat/webgl-refactor`, nessun push/commit fuori richiesta**; lavoro **incrementale con commit chiari**.

---

## 1. Stato attuale — il sito è già forte

Il sito **non** è un punto di partenza grezzo: è una base WebGL matura e on-brand. Osservato dal vivo:
- **Hero** (`/`): navy, eyebrow mono `AI ENGINEERING STUDIO · PRODUCTION SYSTEMS`, headline serif *“We build production software with **AI agents** inside.”* (accento cyan), tag row mono, credibility row (`13 NAMED ENGAGEMENTS / 5 TIER-1 / 1 PHD`), CTA, logo `52.`, cursore custom, indicatore `SCROLL`.
- **Sezioni 01/SIGNALS, 02/AUDIT…**: il **Saturn draggabile** (gas-giant a bande navy/cyan/violet + anelli 3D + atmosfera + scie orbitali) e la **signature line** = fascio cyan→bianco diagonale che attraversa le sezioni, con archi orbitali. Headline serif + eyebrow mono numerati per beat.
- **Case Studies**: hero serif `Engineering track record`, griglia di card DOM (FINTECH/…), tag mono, link `→`, sfondo a particelle stellari.

### Architettura (dal codebase)
- **Render core**: `src/webgl/CanvasHost.tsx` (Canvas R3F persistente in layout, `alpha`, `dpr` tier-based, AA via postprocessing), `FrameDriver.tsx` (**loop rAF unico** che pompa Lenis → scroll/render sincronizzati, con handoff su context-loss), `lib/lenis-singleton.ts`, `smooth-scroll-provider.tsx` (Lenis ↔ ScrollTrigger).
- **Signature line**: `webgl/SignatureLine.tsx` + `materials/lineShader.ts` + `hooks/useSectionAnchors.ts` + `curves/routeCurves.ts`. `CatmullRomCurve3` centripeta su **waypoint ancorati al DOM** (`[data-line-anchor]`, misurati come frazioni di documento, ri-misurati su resize/font/route), `TubeGeometry` tassellata (256–640 seg per tier), `uProgress`/`uEmissive`/pulse all’arrivo sezione, **bloom selettivo per soglia** (linea >1.0, `toneMapped:false`), per-route tone.
- **Particelle**: `DriftParticles.tsx` + `materials/particleShader.ts` (Points GPU, wander per-seed in vertex, 800–3000/tier).
- **PostFX**: `PostFX.tsx` (EffectComposer: Bloom mipmap + Noise + Vignette).
- **Hero Saturn**: `components/hero-drag-layer.tsx` + `webgl/store/heroDragStore.ts` + `materials/planetShader.ts` (FBM bande, atmosfera a 2 layer, anelli con profilo+striature, scie orbitali; drag con inerzia/damping, pitch spring, fade on scroll).
- **Layer DOM/motion**: `fx/custom-cursor.tsx`, `fx/card-tilt-controller.tsx`, `fx/heading-choreographer.tsx` (GSAP SplitText, ri-split su font/lingua/route), `ui/magnetic.tsx`, `reveal-on-scroll.tsx`, `app/template.tsx` (**curtain wipe** clip-path tra route), `language-provider.tsx` (i18n EN/IT).
- **Tier system**: `full` (desktop) / `lite` (mobile) / `off` (`prefers-reduced-motion` → niente WebGL), con degrado fps.
- **Stato**: zustand (`scrollStore`, `routeFxStore`, `heroDragStore`, `fxStore`), leva in dev.

**Verdetto generale:** architettura **solida e corretta** (loop unico, scroll air-tight, selective-bloom intelligente, tier/a11y curati). Il gap verso Lusion **non è strutturale** — è **ricchezza materica e rifinitura**: la linea è “piatta” (manca scattering/fresnel/scia), il Saturn manca di trasmissione/env-light, il post è essenziale (no DOF/CA), il cursore non ha distorsione, i titoli non reagiscono alla velocità, le card non hanno hover 3D.

---

## 2. Inventario per sottosistema — KEEP / IMPROVE / REPLACE / NEW

| Sottosistema | Verdetto | Azione |
|---|---|---|
| Render core (CanvasHost/FrameDriver/Lenis) | **KEEP** | Architettura corretta. Non toccare il loop unico. |
| **Signature line** | **IMPROVE** | Fresnel rim + fake-SSS nello shader; opz. wobble curl-noise; far passare la linea *dietro/dentro* i titoli; particle-bleed alla testa. **Impianto curve/anchor invariato.** |
| Camera | **IMPROVE** | Promuovere la curva esistente a autorità camera: **lookAt-ahead** (poi ride posizionale full-tier). Una sola `useFrame`. |
| PostFX | **IMPROVE** | Aggiungere DepthOfField sottile, ChromaticAberration micro, HueSaturation, ToneMapping ACES/AGX last; variante mobile ridotta; `<Canvas flat>`+HalfFloat. |
| DriftParticles | **IMPROVE** | Bleed di luce alla testa-linea; opz. campo **GPGPU** full-tier (curl-noise + pointer-wake), navy+accento, fallback statico. |
| Hero Saturn | **IMPROVE** | Più realismo: trasmissione/scattering attraverso gli anelli, env-light (HDRI/SH), ombra anelli sul pianeta, ottave FBM extra, post dedicato. **Drag/fisica e palette invariati.** |
| Custom cursor + magnetic | **IMPROVE** | Stati `data-cursor`; `pointerStore` condiviso; overshoot magnetico; **flowmap pointer** (NEW). |
| Heading choreographer | **IMPROVE** | Stagger reattivo a `scrollStore.velocity`; micro-scramble mono su eyebrow. |
| Reveal-on-scroll | **KEEP** | Va bene; eventuale orchestrazione “energia di pagina”. |
| Page transition (template curtain) | **KEEP** (+opz NEW) | Mantenere; opz. View Transitions Next 16 con `view-transition-name:none` sul canvas. |
| i18n / nav / footer | **KEEP** | Nessuna modifica funzionale; solo motion polish. |
| **Fluid pointer (flowmap)** | **NEW** | `pointerStore` + `FluidPointer.tsx` + displacement pre-Bloom, `uStrength` minuscolo, full-tier. |
| **Curl-tube field** | **NEW (opz)** | Campo di nastri curl-noise *merged*, deep z, faint, full-tier. |
| **Liquid glass accent** | **NEW (opz)** | `MeshTransmissionMaterial` su oggetto-accento/rituale di route. |
| **Card hover 3D** | **NEW** | drei `<View>/<Image>` zoom+grayscale+parallax, shader RGB-shift dove serve, **fallback DOM `<img>`**. Richiede imagery (vedi §5). |
| Preloader | **IMPROVE** | Contatore mono con digit-roll; reveal in cui il segmento di carico **diventa l’inizio della signature line**. |
| Audio (sound design) | **NEW (opt-in)** | Toggle audio header; **off di default**. |

**Nessun REPLACE strutturale.** Si elimina solo: eventuali poster/placeholder legacy già rimossi (vedi commit recenti), e si tree-shaka `leva` in produzione.

---

## 3. La signature line — il cuore (preservare + potenziare)

È l’IP visivo del brand e il vincolo n.1. **Non si riscrive l’impianto** (curve DOM-ancorate, misurazione, per-route, loop, selective-bloom). Si **potenzia il materiale e il ruolo**:
1. **Shader gel**: fresnel rim + termine di scattering → da “fascio piatto” a “tubo di luce volumetrico”. Knob in `fxStore`, 0 su reduced-motion.
2. **Camera**: la curva diventa anche traiettoria/`lookAt` (cinematografico, sobrio).
3. **Layering tipografico**: la linea passa *dietro/dentro* i titoli chiave (come Lusion col titolone).
4. **Coesione**: la testa della linea fa “bleed” di luce su particelle vicine; il preloader la introduce.
Risultato: stessa identità, qualità Awwwards.

---

## 4. Roadmap incrementale (per fasi, commit piccoli)

**F0 — Setup analisi** ✅ (questo): `ANALISI_LUSION.md` + `PIANO.md`.

**F1 — PostFX cinematografico + camera** *(alto impatto, basso rischio)*
- `<Canvas flat>` + HalfFloat; stack Bloom→DOF→HueSat→CA→Vignette→Noise→ToneMapping; variante mobile; reduced-motion.
- Camera **lookAt-ahead** sulla curva esistente.

**F2 — Signature line “gel”** *(la firma)*
- Fresnel/scattering nello shader; opz. wobble curl-noise; layering dietro i titoli; particle-bleed.

**F3 — Hero Saturn realismo**
- Trasmissione anelli + env-light + ombra anelli + ottave FBM + post dedicato. Drag invariato.

**F4 — Pointer & tipografia**
- `pointerStore`; `FluidPointer` (flowmap, full-tier); stati cursore; magnetic overshoot; heading stagger reattivo alla velocità.

**F5 — Card hover 3D + Case Studies**
- drei `<Image>` zoom/grayscale/parallax + RGB-shift; fallback DOM. *(Dipende da imagery — §5.)*

**F6 — Preloader→linea + (opz) curl-tube field / liquid glass / GPGPU / audio toggle**
- Reveal “carico→linea”; flourish full-tier deliberatamente sobri.

**F7 — Rifinitura**: perf (60fps, instancing, lazy scenes, DPR clamp), a11y (contrasto AA, focus, contenuto leggibile, `aria-hidden` sul 3D), Lighthouse mobile ≥80; QA visiva Chrome multi-viewport; tree-shake leva.

Ad ogni fase: **screenshot Chrome (desktop+mobile)** + console pulita prima di dire “fatto”. Consulto **Context7** prima di scrivere codice three/R3F/drei/postprocessing (le API cambiano per versione).

---

## 5. Cosa mi serve da te (asset/decisioni)
1. **Imagery prodotto/case-study** (screenshot/render di SphereNode, Quantex, ecc.) per le card hover (F5). Senza, le card restano testuali (fallback) — non bloccante.
2. **Audio**: confermo **off di default** con toggle? (proposta sì).
3. **WebGPU**: confermo **restare su WebGL2** (vedi §6)?
4. Eventuali **font** mancanti (Editorial New/Switzer/JetBrains Mono) se non già tutti nel repo — verifico io, ti segnalo solo se manca.

(Per tutto il resto procedo in autonomia.)

---

## 6. Budget di qualità, rischi, decisioni tecniche
- **Performance**: 60fps desktop; degrado tier `lite`/`off` già presente; lazy-load scene; DPR≤1.5 mobile; Lighthouse mobile ≥80. Ogni nuovo effetto **full-tier-only** + fallback.
- **Accessibilità**: `prefers-reduced-motion` → niente animazioni non essenziali (già: tier `off` smonta WebGL); 3D `aria-hidden` (decorativo); focus states; contrasto AA; le card devono avere DOM reale (no imagery solo-WebGL).
- **WebGPU — verdetto: RESTARE WebGL2 per il lancio.** Il blocker è `@react-three/postprocessing@3.0.4` (WebGL-only by design): adottare WebGPU imporrebbe riscrivere il nostro Bloom/post in TSL e uscire dall’ecosistema drei. Tutti gli effetti Lusion-grade qui sono **WebGL2-class** (Lusion stesso usa WebGL2). Architetturare un *seam* renderer-factory per uno swap futuro, ma **non** come dipendenza di lancio. WebGPU solo se in futuro servirà compute pesante (es. 1M particle).
- **Regole trasversali**: nessun secondo Canvas/secondo rAF (un solo `FrameDriver`); una sola `EffectComposer`; selective-bloom per soglia (no doppio bloom); commit piccoli su `feat/webgl-refactor`, nessun push.

---

## 7. Sintesi
Il sito è a un’ottima base; il salto a “livello Lusion” è **rifinitura materica + coreografia**, non riscrittura. Si **preserva e potenzia la signature line** (gel/fresnel/camera/layering), si arricchiscono Saturn e post, si aggiungono pointer-fluid, card-hover e micro-cinetica — tutto **sobrio, full-tier-gated, reduced-motion-safe**, fedele al posizionamento *AI premium e regolato*. Niente sticker-bomb: il nostro “wow” è **ingegnerizzato e intenzionale**.
