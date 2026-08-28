# Preloader reverse — arago.wawww.studio / donprod.uk / oddity.com (2026-08-28)

Reverse completo via analisi statica dei bundle (3 agenti + 3 verificatori adversariali, tutti CONFIRMED)
più osservazione live nel browser. Bundle scaricati e beautified in:
`%TEMP%/claude/C--Users-alber-Desktop-sersan-v2-main/6eea6b26.../scratchpad/{arago,donprod,oddity}/`.

---

## 1. ARAGO (wawww.studio) — "fade con le luci"

**Stack:** Nuxt 3 + three.js r169 + **Theatre.js** (keyframes nel bundle) + anime.js v3 (no GSAP) + Lenis.

**Loader:** overlay fisso TRASPARENTE (`.Loader`, z-3, SSR nel primo HTML) sul body nero: anello SVG
con arco a gradiente che ruota all'infinito (8s, decorativo — NON è la progress), logo al centro,
contatore % in basso. Progress **reale per-item** da `THREE.LoadingManager` (~21 item: 4 GLB Draco,
KTX2/Basis, cubemap, texture), zero smoothing, +700ms fissi a 100%.

**Continuità (il cuore):**
1. Canvas fisso persistente a z-0; **il RAF parte PRIMA del preload** → shader warmup e primi frame
   della scena avvengono sotto il loader ancora visibile. Il reveal è solo: loader fade-out 0.7s CSS
   + canvas fade-in 2s CSS, sullo stesso nero condiviso. Nessun handoff necessario.
2. **UNA sequenza Theatre.js condivisa intro+scroll** (length 16.78): intro = tween `position 0→6`
   (anime.js linear 4.5s, easing per-track nei bezier handles dei keyframe), scroll dopo =
   `position = clamp(progress*6,0,6)+6`. L'ultimo frame dell'intro È scrollTop 0 per costruzione.
   Guard `isPlayingIntro` + `Lenis.stop()/start()`.

**L'"accensione delle luci":** nella sequenza 0→6: dolly z 0→1.32, chip che ruota in posa entro
pos ~3, `fullDarkMix 0.6→0`, spotlight 0→63→35→76, directional 0→8, crossfade del gradiente di
sfondo (introductionDisplay 0→.7→0, mainDisplay 0→1), wave opacity a pos 3.67→4.1, ampiezze
mouse-idle 0→full solo a pos 5→6 (l'interattività "sfuma dentro" alla fine). Testo DOM: SplitType
chars translateY 50px→0, 2240ms, stagger 14ms easeOutQuart, trigger = stesso store flag del loader.
Nav a +3500ms. Mobile: salta il tween (position=6 secco). Nessun prefers-reduced-motion.

---

## 2. DONPROD — handoff FLIP dell'elemento

**Stack:** CRA + React 18 + framer-motion + Locomotive Scroll. **Zero WebGL** — tutto DOM.

**Loader = contenuto:** video showreel full-screen in autoplay SOTTO la tipografia; lettere
D-O-N-P-R-O-D a split-flap 3D (pure CSS keyframes, 1.2s cad., stagger 0.6s, cubic-bezier(.83,0,.17,1))
in `mix-blend-mode:difference`; counter **100% finto** (tween wall-clock 3.7s easeInOutExpo con
plateau scriptato 42→47% per simulare lo stall di rete); unico wait reale = `canplaythrough` del video.
Gate d'uscita = timer fisso 4.7s. Route montate DIETRO il loader a t=0.5s.

**Timeline maestra** (4 costanti condivise: 4.7 / 1.25 / 4.2 / 5.45 + 2 easing:
`[.16,1,.3,1]` entrate, `[.87,0,.13,1]` uscite):
- 3.7s: counter finisce; tipografia slide-down (exit variants).
- 4.2s: **`.fl-video`** — still full-screen del PRIMO progetto, aspect già = tile hero,
  `width: calc(100dvh * ratio)` — scala di **esattamente 1/k** (k = viewportH/tileH precomputato)
  sulla tile reale, 1.25s. FLIP-by-arithmetic: nessun layout read in corsa.
- 4.4s: testi hero entrano DIETRO il loader (delay 4.4+.05i, 1.75s).
- 4.7s: showreel fade 0.75s; App smonta il loader (AnimatePresence).
- 5.45s: fl-video atterra sulla tile e fade 0.25s → sotto c'è la tile viva identica.

**Lezioni:** reveal che espone movimento già in corso, mai un frame statico; loader come contenuto
brand; still (non video) per il transform = economico; coreografia multi-componente sincronizzata
da un blocco di costanti senza timeline library.

---

## 3. ODDITY — zoom-out / recessione + curtain alpha

**Stack:** Nuxt 3 + GSAP 3.11 + CustomEase + Lenis 0.2.28. **Zero WebGL** — le "video" hero sono
image-sequence webp su canvas 2D (`sequence_play.js`).

**Loader:** curtain bianca SSR (z-100000) + logo saetta (SVG mask con rect) + anello progress quasi
invisibile (opacity .1). **Progress reale**: `Image.onload` dei **148 frame esatti** che la hero
riprodurrà — il loader È gli asset della hero. Niente altro è gated (font e altre sequenze: parallele).

**Trucco dell'anello (riusabile):** `stroke-dasharray:440` > circonferenza (~308). Il progress reale
muove `strokeDashoffset` 440→220 (solo ~70% del visibile); il tween d'uscita continua LO STESSO
offset fino a -440: disegno completo + srotolamento in un solo gesto. Stall al 99% impossibile
per costruzione.

**Exit (GSAP `Af`, al 148° onload):** curtain `autoAlpha→0` 1s; rect della saetta wipe-up circ.out
0.4s (il logo si "svuota"); l'anello si auto-completa 1s; il film hero parte subito in rAF 60fps
(play-once, freeze sull'ultimo frame) **sotto la curtain in dissolvenza** → il sito appare già in
movimento. Titolo hero line-mask reveal delay 4.3s, CustomEase firma
`M0,0 C0.084,0.61 .088,.874 .184,.944 .283,1.016 .374,1 1,1` riusata ovunque.
Stessa saetta + stessa curtain = grammatica di TUTTE le route transition (Of/Mf, 2.2s).
`localStorage first_load` decide delay 0 (hard load) vs 1600ms (nav SPA).
Fragilità: nessun onerror → un 404 = schermo bianco perenne. Il residuo `scale(1.1)` sui contenitori
hero (visto nel DOM live) è il settle finale dello zoom.

---

## 4. Il nostro sistema oggi (repo recon; path:line nel run wf_d2c95a85-dd6)

- `preloader.tsx` (1598 righe): progress **reale a 4 segnali pesati** (fonts .25 / window load .20 /
  manifest byte .25 / **pipeline warm .30** via PipelineWarmup: compileAsync + 28 frame lisci),
  counter cap 0.9 finché tutto non risolve, watchdog 14s, floor 700/350ms (`sersan_seen`),
  reduced-motion = overlay mai montato. Visual: metà del mark SVG che convergono → ruota →
  exit = spin boost + zoom scale 1→4 + blur + warp tunnel + fade 0.7s.
- **La scena renderizza GIÀ sotto l'overlay** (Arago-style): quel rendering È il warmup.
- `introStore.complete()` = beat unico su cui keyano SignatureLine (uReveal re-kick), HeroLogo
  (reform clock ~2.07s), HeroTextParticles (entry 3.6s), HeroIntroGate.
- Hero: spore mark (GLB 15KB, TSL compute, reform DOPO introComplete), wordmark 48k particles
  (assemble 3.6s dopo introComplete), black hole **deferred by design** ad assembleDone
  (la finestra di compile GPU appartiene al wordmark — non toccarlo).
- Vincoli hard: chunk preloader three-free; store-driven only (island commit wedge); background-tab
  rAF; reduced-motion path; WebGL2 fallback (wordmark non attiva mai).

## 5. Gap vs le reference

Il nostro exit attuale è "zoom-away + fade, POI la hero si ricompone": c'è un buco di ~2s in cui il
mark WebGL si sta ancora riformando dopo che il mark DOM è sparito. Le tre reference non hanno mai
questo buco: Arago accende luci su una scena già in posa; Donprod consegna un elemento già identico;
Oddity rivela un film già in riproduzione.

## 6. Proposta (RACCOMANDATA: combinata)

**Fase 0 — load:** counter onesto attuale (già superiore a tutte e tre) + anello over-completion
alla Oddity come visual unica (un solo strokeDashoffset: progress → completamento → srotolamento).
**Nuovo requisito chiave: il reform delle spore avviene SOTTO l'overlay** (reform clock anticipato
al warm, pinnato assembled a fine load) così l'handoff mostra un mark finito.
**Fase 1 — handoff (Donprod):** mark DOM del loader posizionato/scalato sul rect proiettato del
mark WebGL (FLIP-by-arithmetic: camera fissa → proiezione precomputabile, pubblicata via store,
niente three nel chunk preloader). Overlay fade 0.7s su nero condiviso (Arago): il mark "non si
muove", diventa vivo (micro-motion spore).
**Fase 2 — accensione (Arago):** uDarkMix/exposure ramp ~2s nel post graph + SignatureLine draw-in
+ wordmark assemble 3.6s + DOM stagger, tutti sullo stesso beat. Ampiezze pointer 0→full in coda.
**Fase 3 — settle (Oddity):** dolly/scale 1.06→1.0 della camera come gesto finale.
Contratto store: pre-beat `markAligned` (overlay può sfumare) + `introComplete` invariato per i
subscriber esistenti. Black hole resta deferred (nessun cambio).

Alternative pure: A) solo accensione (Arago) — minimo rischio, nessun handoff;
B) solo zoom-out (Oddity) — il mark recede verso la posizione della singularity;
C) solo handoff (Donprod) — carry dell'elemento senza light ramp.
