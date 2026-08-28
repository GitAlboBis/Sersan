# SPEC — Preloader handoff refactor ("combinata") — 2026-08-28

Decisione owner: direzione **combinata** (handoff Donprod + accensione Arago + settle Oddity).
Dossier di analisi: `2026-08-28-preloader-reverse.md` (stessa cartella). Repo recon con path:line
nel run workflow `wf_d2c95a85-dd6`.

## Obiettivo

Eliminare il buco attuale (mark SVG zooma via + fade → POI le spore si riformano ~2s) e sostituirlo
con: **il mark non sparisce mai**. A fine load il mark WebGL è GIÀ assemblato sotto l'overlay; il
mark DOM si allinea al suo rect proiettato, l'overlay sfuma sul nero condiviso, la scena si accende
(exposure ramp), la camera fa un micro-settle. Il wordmark (3.6s) e la SignatureLine restano
agganciati a `introComplete` come oggi. Il black hole resta deferred (NON toccarlo).

## Timeline bersaglio

- **t < 0 (durante il load)**: counter reale a 4 segnali invariato. Al segnale warm (vedi §2)
  parte il **reform delle spore sotto l'overlay** (~2.07s, clock esistente).
- **t0 (trigger reveal, invariato: target>=1 + floors)**: il mark DOM esegue il FLIP verso il rect
  proiettato del mark WebGL (~0.35s, easing exit house-style); il divider streak → SignatureLine
  esistente resta.
- **t0+0.35s**: `introStore.complete()` (stesso beat, solo posticipato di ~0.35s):
  overlay opacity→0 in 0.7s **e contestualmente** il mark DOM opacity→0 in 0.7s (sotto c'è il mark
  spore identico e allineato); parte `uIgnite` 0→1 (~2s) nel post graph; parte il wordmark entry
  3.6s (esistente); SignatureLine re-kick (esistente); camera settle 1.06→1.0 (~1.4s expo-out);
  ampiezze idle/pointer del mark 0→full nell'ultimo tratto dell'ignition (stile Arago).

## Modifiche per file

### 1. `src/webgl/store/introStore.ts`
- Aggiungi `reformStart: boolean` + azione `startReform()` (idempotente) e
  `markRect: { cx, cy, w, h } | null` (px CSS) + `setMarkRect()`.
- `complete()` INVARIATO nei semantics (unico beat per SignatureLine/HeroTextParticles/
  HeroIntroGate). Reduced-motion path: `complete()` immediato deve implicare anche reform snap
  (vedi HeroLogo).

### 2. `src/components/fx/preloader.tsx`
- **Trigger reformStart**: quando il segnale warm arriva a 1 (warmReady) chiama
  `introStore.getState().startReform()`. Fallback: se il reveal scatta prima che il reform sia
  finito, HeroLogo fa catch-up (vedi §3) — nessuna attesa aggiuntiva nel preloader.
- **Exit refactor in `reveal()`**: RIMUOVI lo zoom scale 1→4 + blur del mark. Nuovo ordine:
  (a) leggi `introStore.getState().markRect` (fallback: centro viewport, scala invariata, se null);
  (b) tween transform del mark DOM verso quel rect (~0.35s); (c) poi `complete()` come oggi;
  (d) fade overlay 0.7s invariato + fade del mark DOM 0.7s in parallelo. Mantieni: spin boost
  ridotto o rimosso (a discrezione visiva: il mark deve ARRIVARE fermo), divider→signature streak,
  warp del tunnel (può restare come sfondo che accelera mentre l'overlay sfuma).
- Il chunk resta **three-free**: la proiezione arriva già pronta dallo store.
- INVARIATI: 4 segnali/pesi, cap 0.9, watchdog 14s, floors `sersan_seen`, path reduced-motion
  (overlay mai montato), trigger reveal frame-rate-independent, restoreScroll().

### 3. `src/webgl/HeroLogo.tsx`
- **Rekey del reform**: il reform clock parte su `reformStart` (edge, via subscribe o getState in
  useFrame — MAI props/commit) invece che su `introComplete`. A reform completo: stato
  ASSEMBLED_IDLE (pinnato, micro-motion minima) finché `introComplete` non attiva LIVE.
- **Catch-up pin**: sull'edge di `introComplete`, se reformProgress < 1 → accelera/lerp a 1 in
  ≤0.3s (avviene sotto l'overlay che sta appena iniziando a sfumare — invisibile).
- **Reduced motion / introComplete senza reformStart**: snap a assembled immediato.
- **Publish markRect**: proietta il bounding box del mark (gruppo world + camera, size da useThree,
  px CSS) e scrivi `setMarkRect` su resize + quando il transform cambia (throttle: solo se delta
  > 1px). Vale per TUTTE le modalità (spores E particles-static/WebGL2).
- **Ampiezze idle/pointer**: ramp 0→full legato a uIgnite/tempo dopo introComplete (ultimi ~1s).

### 4. `src/webgl/PostFXNodes.tsx`
- Uniform `uIgnite` (default 1 per non toccare le altre route): sull'edge false→true di
  `introComplete` (getState nel loop di render, pattern esistente) anima 0→1 in ~2s.
  Applicazione: lift/exposure prima del tonemap, es. `color *= mix(0.14, 1.0, ignite)` con curva
  ease-out; opzionale leggero boost vignette a ignite=0. SOLO route home + solo primo intro
  (dopo, resta 1; route interne partono a 1).
- Fallback WebGL (PostFX.tsx flag-OFF): NON implementare (facoltativo stretch: brightness CSS ramp
  sul canvas host — solo se banale e pulito).

### 5. Camera settle (Scene.tsx o rig dedicato)
- Sull'edge di `introComplete`: zoom/scale del rig camera 1.06→1.0 in ~1.4s expo-out, additivo
  rispetto al parallax pointer esistente. Home only, one-shot.

### 6. Facoltativo (solo se pulito, NON prioritario)
- Gesto "over-completion" alla Oddity sull'arco/divider di progress esistente: la stessa proprietà
  continua da progress → completo → srotolato durante l'exit. Non stravolgere il visual approvato
  (metà del mark che convergono + tunnel restano l'identità del loader).

## Vincoli non negoziabili (dal recon — violarli = regressione)

1. Chunk preloader senza import three (`preloader.tsx:9-11`).
2. Store-driven only dentro l'island: refs + `getState()` in useFrame; niente gating su commit
   React dentro il Canvas (wedge — `Scene.tsx:186-197`).
3. Background-tab: trigger reveal resta frame-rate-independent; watchdog setTimeout resta; delta
   clamp 1/30 restano.
4. Reduced-motion: overlay mai montato, complete() immediato, scroll mai bloccato, tier "off"
   conta come warm.
5. WebGL2 fallback: wordmark non attiva mai; il nuovo exit deve funzionare anche lì (markRect
   pubblicato dalla modalità static).
6. HomeSingularity/SequenceSingularity: NESSUNA modifica (compile window del wordmark).
7. `introComplete` resta l'unico beat per i subscriber esistenti (SignatureLine, HeroTextParticles,
   HeroIntroGate, Lenis restore + re-assert del gate).
8. Un solo rAF persistente post-handoff (FrameDriver); il rAF privato del preloader muore con
   l'overlay.

## API/docs

- Rispecchiare l'uso in-repo delle API (three/webgpu TSL, zustand, GSAP, Lenis — versioni pinnate).
- Solo in caso di dubbio su un'API: lookup docs (Context7 dalla main session / exa code context
  dal sub-agente). Nessuna API nuova richiesta da questa spec.

## QA (dopo implement + check)

- Dev server della sessione (NON porta 3000 di altri progetti), Chrome/pane: sequenza completa
  hard-load home; poi `?backend=webgl2`; poi reduced-motion (emulazione); route interna diretta
  (/consulting) → nessun intro; nav SPA verso home; console pulita; screenshot filmstrip
  dell'handoff (il mark non deve mai saltare di posizione/scala).
