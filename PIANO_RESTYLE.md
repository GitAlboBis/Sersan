# PIANO_RESTYLE.md — Ristrutturazione contenuti + preset/effetti

> Generato il 2026-06-10 da ricerca multi-agente: 10 sorgenti di preset/tutorial analizzate
> (gsapify, Codrops ×5, fullPage, Awwwards, ui-layouts, awesome-webgpu — 51 candidati raccolti,
> drill-down nei singoli tutorial con link al codice), audit del codebase (home + tutte le
> sottopagine), incrociati con `ANALISI_LUSION.md` e `PIANO.md`.
> Claim dell'audit ad alto impatto verificati a mano nel codice (vedi note ⚠️/✅).
>
> Vincoli fermi: copy invariato · signature line e particle hero preservati (tutto compone,
> nulla sostituisce) · nessuna nuova libreria di scroll · palette navy `#0B1422` + accento
> singolo cyan→violet · git: solo branch `feat/webgl-refactor`, nessun push.

---

## 1. Diagnosi in 5 punti

1. **La prova arriva troppo tardi.** Un CTO attraversa ~9 viewport di spine pinnato prima di
   vedere un solo nome tier-1; i 13 engagement sono sepolti al viewport ~14. ✅ Verificato:
   i proof chip dell'hero ("13 named engagements / 5 tier-1") sono **dead code** — in
   `cinematic-system-scroll.tsx` gli `extras` esistono solo sullo stage hero ma il render è
   gated su `{!isHero && stage.extras}` (righe 480/619) → non vengono mai mostrati.
2. **La storia "come lavoriamo" è raccontata due volte**: lo spine (Signals→Handover) e
   ProcessSection (Diagnose→Harden) sono lo stesso arco a 4 sezioni di distanza.
3. **Vuoto di credibilità above-the-fold**: CredibilityStrip smontata + chips dead code =
   zero nomi tier-1 fino a Founders.
4. **Curva "a vasca da bagno" degli effetti**: hero sovraccarico → ~10 viewport di card-grid
   con la stessa grammatica (Reveal fade-up) → GatewayPortal finale. Le sottopagine sono
   quasi tutte piatte: zero pinned/scrub fuori dalla home.
5. **Funnel frammentato**: 4 superfici di intake parallele, 2 calendari duplicati, 7+ CTA
   verso /start solo in home, `/services/*` orfane (609 righe di contenuto bilingue non
   linkate), `/faq` in deriva fattuale. ✅ Verificato: `faq-client.tsx:149-172` dice
   "SOC 2 Type II in progress" e "EU (London)" mentre /trust dice ISO 27001; la deriva è
   anche in `translations/en.ts:67` e `it.ts:67` (`'hero.compliance': 'GDPR & SOC 2 aligned'`).

## 2. ELIMINA

| Cosa | Perché |
|---|---|
| `founders-note-section.tsx`, `how-we-think-section.tsx` | ✅ Verificato: orfani — nessun import in tutto `src`. Orfani anche `four-layer-scroll`, `the-studio`, `manifesto-beat`, `interactive-audit`, `featured-articles`, `faq-section`, `audit-section` (salvare prima i 2 refusal migliori → Fit). |
| Dipendenza `framer-motion` | ⚠️ Correzione all'audit: ha **9 consumer**, non 1. Ma 7 sono gli orfani qui sopra → eliminandoli restano solo `reveal-on-scroll.tsx` e `navbar.tsx`. Port di quei 2 su GSAP (effort M, fase finale) e la dep cade. |
| `/faq` come pagina autonoma | Orfana (solo footer) e fattualmente sbagliata (SOC2 vs ISO 27001). Fix immediato del testo, poi contenuti assorbiti in /consulting, /audit, /trust. |
| `UseCasesSection` standalone | I 6 pain sono i 4 Services riformulati a una sezione di distanza; ~2 viewport risparmiati. |
| `WorkInProgress` teaser in home | Una sezione intera per 1 card con 2 colonne vuote → diventa una card "In development" dentro il rail dei case studies. |
| Secondo calendario su /contact + MultiStepIntake su /consulting | Funnel canonico unico: /start (intake) + /audit#book-call (calendario). Altrove solo CTA band. |
| Il gate `{!isHero && stage.extras}` | O ricablato sull'ultimo panel dello spine (consigliato: i chip sono la credibilità che manca) o cancellato. Oggi è contenuto fantasma. |
| Archive grid 10 card + filtri in home | È /case-studies clonata, non un teaser. I filtri tornano alla subpage. |
| 4+ CTA /start ridondanti | Restano 3 momenti: release dello spine, mid-page dopo i case studies, FinalCTA. |

## 3. SPOSTA — nuovo ordine della home

**Prima:** spine → problem → services → production → use-cases → case-studies → WIP → founders → process → fit → CTA
**Dopo:** spine compresso → **credibility strip** → problem → **case studies** (3 featured + rail) → services (con i pain integrati) → production-grade → founders → strip "fixed scope" → fit 4+4 → gateway → FinalCTA

| Contenuto | Da → A | Perché / pattern |
|---|---|---|
| Credibility strip | Smontata → subito dopo il camera-dive dello spine, fusa nel top di Problem (senza i border che rompevano il flow) | Primo segnale tier-1 al viewport ~5. Marquee: `horizontalLoop()` GSAP (https://tympanus.net/codrops/2025/04/21/mastering-carousels-with-gsap-from-basics-to-advanced-animation/) o variante velocity-reactive ui-layouts ScrollBaseAnimation (https://github.com/ui-layouts/uilayouts/blob/main/apps/ui-layout/components/ui/scroll-text-marque.tsx) — caps mono piccole. |
| CaseStudiesSection | viewport ~14 → subito dopo Problem | Proof before pitch. |
| Process table 4×6 | Home → /consulting ("How we engage") | Duplica lo spine; in home resta una strip one-line. |
| I 6 pain di UseCases | Sezione → front delle card Services + prima domanda dell'intake /start | Il self-locator fa lavoro di conversione nel form. |
| 8 practice cards su /consulting | Non cliccabili → link a `/services/<slug>` | Risolve le /services/* orfane senza contenuto nuovo. |
| FAQ | /faq → 4 risposte engagement in /consulting e /audit, 3 data-privacy in /trust | Una sola fonte di verità. |

## 4. CAMBIA — sezione per sezione, con il preset esatto

### Cinematic spine (hero)
Comprimere i 5 stage a 2–3 (~350–400vh), skippabile (sessionStorage + doppio wheel-flick).
- **Soft snap sugli stage del morph**: pattern `fitToSection` di fullPage replicato con
  `snap: { snapTo: stageOffsets, directional: true }` su ScrollTrigger — *pattern only, mai la
  dipendenza* (GPL/paid; lo scroll è di Lenis). QA contro il lerp di Lenis; fallback
  `lenis.scrollTo(..., {lock:true})` su scroll-end.
- **Port del sim particellare a TSL compute**:
  https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_tsl_compute_attractors_particles.html (MIT)
  — kernel attractor/damping/clamp = l'upgrade "two-layer momentum spring" già pianificato;
  aggira il problema RT-read in vertex stage. Mix colore guidato dalla velocità ("si accende
  solo quando si muove").

### Case studies (home + /case-studies) — il beat WebGL mid-page mancante
- **Sticky horizontal rail** (https://github.com/ui-layouts/uilayouts — MIT, file
  `registry/components/external/horizontal-scroll.txt`): `position: sticky` + translateX →
  pinning **senza pin-spacer**, gli anchor DOM della signature line restano validi.
  Home: 4–6 featured. /case-studies: rail desktop-only, la grid verticale resta per i filtri.
- **DOM-to-WebGL bridge + parallax UV**
  (https://github.com/davidfaure/horizontal-parallax-gallery-codrops — MIT, dal tutorial
  Codrops 2026-02-19): classe `GLMedia` sincronizza plane WebGL ai rect delle `<img>`,
  shader `coverUv` per il parallax in-frame. Da portare in TSL. **Scartare il suo
  lerp-controller** (double-smoothing su Lenis) — tenere solo lo shader. Incluso fallback CSS
  (overscan 125% + translate3d) per mobile/reduced-motion.
- **Depth-map scan hover** (https://github.com/d3adrabbit/ScanningEffectWithDepthMap —
  stack identico: R3F+WebGPU+TSL): sweep cyan→violet che "legge" l'immagine come uno
  strumento. Depth map offline (Depth-Anything), 8-bit quarter-res. Fallback touch: sweep su
  scroll-into-view.

### /audit "How the week runs"
Da lista piatta a **pinned phased chapters** (pattern NRG,
https://business.nrg.com/campaigns/build-your-data-center/): pin + scrub, snap per Day,
`uProgress` della signature line che cammina Day 1→6 (waypoint `timeline` già in
`routeCurves.ts`). Drag bidirezionale: pattern Draggable↔scroll sync di Michelle Barker
(https://codepen.io/michellebarker/full/597a468071d4dce3f7bf0ce80d6cb8d3), con
`lenis.scrollTo(y, {immediate:true})` al posto di `st.scroll(y)`.

### FitSection
Trim a 4+4 righe, assorbe i 2 refusal più affilati dall'audit-section orfana ("AI without a
kill switch", "Demos without eval sets"). Preset: **Redacted Reveal**
(https://gsapify.com/gsap-text-animations/) — de-redaction per parola su SplitText `words`,
barre off-white su #0B1422. La metafora È il copy per un brand regolato.

### H1 delle sottopagine (10 pagine)
`HeadingChoreographer` esiste ma nessun H1 lo usa. Default: **Osmo masked SplitText reveal**
(https://codepen.io/osmosupply/pen/pvvKezw — dal tutorial Codrops "5 demos with free GSAP
plugins"): `type:'lines', mask:'lines'`, yPercent 110→0. Variante clip-path con inset
negativi (-5%/-10%) per gli overshoot del corsivo Editorial New.

### ProductionGrade
Contenuto invariato (la sezione migliore). La signature line passa dietro i 3 pannelli con
pulse di selective-bloom sincronizzato allo scan di ogni pannello. Riferimento selective
bloom MRT su WebGPU: https://github.com/WallabyMonochrome/WebGPU-clair-obscur-gommage-codrops.

### /trust compliance pipeline
**TSL linked particles**
(https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_tsl_vfx_linkedparticles.html — MIT)
con emitter ancorati ai 6 stage (Input → PII redaction → Model router → Guardrail → Audit
log → Output), ramp fissa cyan→violet (no hue-cycling). Wireframe schematic stile Vaulk
(https://vaulk.com/, pattern only) con drei `<Line>` + dashOffset nel selective bloom
esistente. Label normativi = hotspot DOM focusabili (pattern Radian EXR,
https://www.rideradian.com/exr), stack verticale sotto md. Fix anchor mislabeled nello
stesso commit.

### Menu overlay + curtain
**EaseReverseClipMenu** (https://github.com/codrops/EaseReverseClipMenu): open/close
interrompibile, easing distinto in chiusura (`easeReverse` — verificare API GSAP 3.15 su
Context7 prima di scrivere). Effort S.

## 5. AGGIUNGI

1. **Section-state bus** (zustand) — un ScrollTrigger per sezione scrive
   `activeSection + direction`; signature line, particelle, nav e choreographer leggono la
   stessa fonte via `useFrame + getState()`. Modello lifecycle di fullPage senza snapping.
   **Prerequisito di quasi tutto, effort S.**
2. **StatCounter** — object-tween + `toLocaleString` + `tabular-nums`, once-triggered
   (GSAPify Scroll Counter): metriche card (−47%, ~€18M/yr), /about "Verifiable not vibes",
   detail [slug].
3. **Route-curve + routeFx mancanti** — config "detail" condivisa per i template [slug],
   /services/*, /start; 3 entry routeFx mancanti (/case-studies, /resources, /contact).
   ~50 righe che chiudono le zone dove la signature line oggi non arriva.
4. **/resources** — closing band sotto l'anchor `final-cta` (oggi la linea muore nel vuoto) +
   **floating preview on hover** sulla lista articoli (ui-layouts ImageReveal,
   https://github.com/ui-layouts/uilayouts/blob/main/apps/ui-layout/registry/components/image-reveal/image-reveal.tsx — MIT),
   portato a `gsap.quickTo` + plane R3F che eredita il pointer flowmap.
5. **Flip handoff card→detail** (https://github.com/J0SUKE/gsap-threejs-codrops): GSAP Flip
   sull'immagine cliccata mentre il canvas persiste — solo /case-studies, fase finale.
6. **(Opzionale, WebGPU-gated)** Gommage dust dissolve sull'headline del FinalCTA — rima con
   l'hero dissolve. Solo se la EULA Fontshare permette l'atlas MSDF di Editorial New.

## 6. Tipografia → preset

| Ruolo | Preset | Fonte |
|---|---|---|
| Editorial New H1/H2 | Masked SplitText line reveal (default site-wide); re-split su `document.fonts.ready` | https://codepen.io/osmosupply/pen/pvvKezw |
| Editorial New (sezioni chiave) | Clip-path inset wipe per linea, direzione = direzione della line nella sezione | https://gsapify.com/gsap-text-animations/ |
| Switzer body | Scrubbed highlight #8A94A6→#F4F6FA — SOLO manifesto Problem + /about OUR WHY (budget repaint) | GSAPify |
| JetBrains Mono eyebrow | ScrambleText decoder (`scrambleText:{text, chars, speed}` — verificare API su Context7); variante chars `'█▓▒░'` per gli stage di /trust | GSAPify + https://github.com/ui-layouts/uilayouts/blob/main/apps/ui-layout/components/ui/text-randomized.tsx |
| Mono refusals/Fit | Redacted Reveal — mai su copy above-the-fold/SEO-critical | GSAPify |
| Mono big numbers | Scroll Counter (once), `tabular-nums`, valore finale sempre nel DOM | GSAPify |
| Mono numbers su hover card | Slot-roll smorzato (yPercent −120, 0.5s, power4.out) — alternativa al counter, mai entrambi nello stesso contesto | GSAPify |

A11y trasversale: testo finale in `aria-label`, span animati `aria-hidden`, tutto gated su
`prefers-reduced-motion`.

## 7. Tabella riepilogo preset scelti

| Preset | Fonte | Codice | Dove | Scopo | Effort |
|---|---|---|---|---|---|
| Sticky horizontal rail | ui-layouts | https://github.com/ui-layouts/uilayouts (MIT) | Home teaser + /case-studies | Archive in 1 viewport, beat mid-page | M |
| DOM-to-WebGL plane + coverUv parallax | Codrops/Faure | https://github.com/davidfaure/horizontal-parallax-gallery-codrops (MIT) | Card images, founder portraits | Bridge immagini→canvas, parallax in UV | M |
| Depth-map scan hover | Codrops | https://github.com/d3adrabbit/ScanningEffectWithDepthMap | 13 card case-study | Hover "technical scan" on-brand | M |
| Phased pinned chapters + drag sync | NRG + M. Barker | https://codepen.io/michellebarker/full/597a468071d4dce3f7bf0ce80d6cb8d3 | /audit week timeline | Storytelling scroll engineered | S/M |
| TSL compute attractors | three.js | https://github.com/mrdoob/three.js (MIT) | Hero particle sim | Upgrade momentum spring, storage buffers | S |
| TSL linked particles | three.js | https://github.com/mrdoob/three.js (MIT) | /trust pipeline | Diagramma animato compliance | M |
| Soft snap su morph stages | fullPage (pattern) | — replica ScrollTrigger | Hero spine | Stage che risolvono crisp | S |
| Section-state bus | fullPage (pattern) | — zustand + ScrollTrigger | Site-wide | Fonte unica activeSection | S |
| Masked SplitText reveal | Codrops/Osmo | https://codepen.io/osmosupply/pen/pvvKezw | H1/H2 serif site-wide | Reveal default headline | S |
| ScrambleText decoder | GSAPify + ui-layouts | inline / repo MIT | Eyebrow mono site-wide | Registro "machine text" sobrio | S |
| Scroll Counter | GSAPify | inline article | Metrics, /about strip | Numeri che contano | S |
| Redacted Reveal | GSAPify | inline article | Fit refusals, /trust | Metafora de-redaction | S |
| easeReverse clip menu | Codrops | https://github.com/codrops/EaseReverseClipMenu | Menu overlay, curtain | Open/close interrompibile | S |
| Flip handoff + pixel reveal | Codrops | https://github.com/J0SUKE/gsap-threejs-codrops | Card→detail | Transizione con canvas persistente | M/L |
| ImageReveal cursor preview | ui-layouts | https://github.com/ui-layouts/uilayouts (MIT) | /resources list | Lista editoriale viva | S |

## 8. Scartati con motivo

- **fullPage.js come dipendenza** — GPLv3-or-paid, possiede il loop di scroll: incompatibile
  con Lenis e col mapping della signature line. Solo pattern.
- **Infinite/loop scrolling** (Codrops LoopScrolling, Lenis `infinite:true`) — progress non
  monotonico rompe morph hero e line 0→1; footer compliance irraggiungibile.
- **ScrollSmoother** (presente in 3 tutorial) — secondo smooth-scroller, si escinde sempre a
  favore di Lenis.
- **framer-motion / motion** (ui-layouts) — GSAP+Lenis possiedono già l'animazione; tutti i
  componenti scelti sono port <100 righe.
- **Glitch/Neon/Matrix/Typewriter** (GSAPify) — retro-arcade o reflow di larghezza; lo
  scramble copre lo stesso registro con sobrietà.
- **Bounce/elastic/rubber-band** — fisica cartoon, hard reject di brand.
- **Reactive gradient carousels / mood backgrounds** (Codrops) — multi-hue contro la regola
  single-accent.
- **Reactive Depth image tube** — secondo camera-on-rails che compete con lo spine.
- **WebLLM / Web Stable Diffusion** — gimmick fuori performance budget.
- **Fluid sim kishimisu** — repo **senza licenza**: per l'upgrade del flowmap reimplementare
  da Stam paper o dal repo MIT di Dobryakov.
- **Custom lerp scroll controllers** (Faure, Reactive Depth) — double-smoothing su Lenis; si
  scarta il controller, si tiene lo shader.
- **RGB split su testo DOM** — clash col layer PostFX; se serve, vive nello shader card hover.

## 9. Ordine di esecuzione

Allineato alla roadmap F1–F7 di `PIANO.md`:

1. **Bonifica (quick wins, zero rischio design)** — delete dei 9 file orfani; fix
   SOC2→ISO 27001 in `faq-client.tsx` e `translations/{en,it}.ts:67`; decisione `extras`
   dead-code (consiglio: ricablare sull'ultimo panel); routeFx + curve mancanti; rinomina
   anchor /trust.
2. **IA + funnel** — riordino home (proof al viewport ~5), Process→/consulting,
   pains→Services, credibility strip rimontata, dedupe CTA, link /consulting→/services,
   funnel canonico /start + /audit#book-call.
3. **Tipografia** — `data-split-reveal` sugli H1; preset Osmo + clip-path nel choreographer;
   scramble eyebrow via `data-scramble`; StatCounter; Redacted Reveal su Fit. DOM-only.
4. **Section-state bus + hero** — bus zustand; spine compresso a 2-3 stage + skip + soft
   snap; port del sim a TSL compute attractors.
5. **Case-studies rail + card hover** — sticky rail home → /case-studies; GLMedia bridge in
   TSL; depth-map scan hover (pipeline depth map inclusa); WIP dentro il rail.
6. **Beat interni** — line pulse su ProductionGrade; /audit pinned timeline + drag;
   /resources closing band + ImageReveal.
7. **/trust pipeline** — linked particles + wireframe + hotspot, nel selective bloom esistente.
8. **Transizioni + polish** — easeReverse su menu/curtain; Flip handoff; port di
   reveal-on-scroll/navbar a GSAP e drop di framer-motion; QA multi-viewport, 60fps,
   `prefers-reduced-motion` su ogni preset, Lighthouse.

Ogni step chiude con screenshot desktop+mobile e console pulita prima di dichiararsi
completo (workflow AGENTS.md §6).

---

## Appendice A — Catalogo candidati per sorgente (51 totali, fitScore ≥3)

### GSAPify — GSAP Text Animations (https://gsapify.com/gsap-text-animations/)
- [5/5] Scramble/Decoder family (Text Scramble, Binary Decode, Scramble Decode) — eyebrow mono site-wide, stage label /trust (variante `█▓▒░` = declassificazione), SHIPS WITH tags.
- [5/5] Scroll Counter + Morphing Counter — metriche card, /about, home teaser.
- [4/5] Clip-path reveal family (Reveal Wipe / Curtain Reveal / Liquid Fill) — H1/H2 serif per linea SplitText.
- [4/5] Redacted Reveal — refusals/Fit, micro-copy /trust.
- [3/5] Slot Machine digit roll — numeri su hover card (alternativa al counter).
- [3/5] Scrubbed paragraph highlight — manifesto Problem, /about OUR WHY.

### Codrops: Horizontal Parallax Gallery DOM→WebGL (Faure, 2026-02-19)
- [5/5] Pinned horizontal WebGL parallax gallery — /case-studies + home teaser.
  Codice: https://github.com/davidfaure/horizontal-parallax-gallery-codrops
- [4/5] `GLMedia` DOM-synced plane bridge — base per card hover, ritratti founder, cover articoli.
- [4/5] coverUv + buffer-scale parallax shader (target di port TSL) — parallax in-frame ovunque.
- [4/5] Fallback CSS 2D (overscan 125% + translate3d) — mobile/reduced-motion.

### Codrops search "horizontal" (pagine 1–3)
- [5/5] (= tutorial Faure sopra)
- [4/5] Wavy Infinite Carousels in R3F + GLSL (Demouge, 2025-11) — home teaser, bend velocity-driven.
  https://github.com/colindmg/r3f-experimental-carousel
- [4/5] Scrollable & Draggable Timeline with GSAP (Barker, 2022-01) — /audit week timeline.
  https://codepen.io/michellebarker/full/597a468071d4dce3f7bf0ce80d6cb8d3
- [3/5] Infinite Loop Scrolling (Bureau DAM) — SOLO la choreography dei reveal scaleY, mai il loop.
- [3/5] Mastering Carousels with GSAP (`horizontalLoop()`) — credibility strip, STACK WE SHIP ON.

### fullPage.js (https://alvarotrigo.com/fullPage/ — pattern only, mai la dep)
- [4/5] Wheel-driven horizontal slides → pinned GSAP gallery (home teaser; /case-studies resta verticale coi filtri).
- [4/5] Section lifecycle callbacks (beforeLeave/onLeave/afterLoad) → section-state bus zustand.
- [3/5] Selective soft snap (fitToSection) → solo hero morph stages.
- [3/5] Section nav rail + URL anchors → indice laterale /trust, deep-link #anchors.

### Awwwards scroll elements (https://www.awwwards.com/elements/scroll/)
- [5/5] NRG "Build Your Data Center" — phased pinned chapters → /audit week, home process.
- [4/5] Ponder AI "Steps Scroll" — pinned steps con media sequenziale → /consulting HOW WE ENGAGE.
- [4/5] Vaulk — dark 3D wireframe schematic scroll-driven → /trust pipeline.
- [4/5] SOHUB "Next Project" — scroll-into-next-page → detail case-study → next case.
- [3/5] Radian EXR — pinned sequence con hotspot annotati → label normativi /trust.
- [3/5] Borealis HPC — globo instanced-points con archi (London↔Milan↔EU) → /about o /contact.

### Codrops hub tag 3D
- [5/5] WebGPU Scanning Effect with Depth Maps — card hover scan.
  https://github.com/d3adrabbit/ScanningEffectWithDepthMap
- [4/5] Reactive Depth: 3D image tube R3F — scartato come gallery (compete con lo spine).
- [4/5] Cinematic 3D Scroll Experiences with GSAP — pattern camera-keyframes per lo spine.
  https://github.com/JosephASG/codrops-cinematic-scroll-animations
- [4/5] WebGPU Gommage (MSDF text dissolve, TSL+MRT selective bloom) — reference TSL/bloom + dissolve FinalCTA.
  https://github.com/WallabyMonochrome/WebGPU-clair-obscur-gommage-codrops
- [3/5] Emissive Dissolve Effect — dissolve di scena 3D nelle route transition.
  https://github.com/JatinChopra/emissive-dissolve-effect
- [3/5] Atmospheric Depth Gallery — micro-response velocity→tilt/scale da adottare sulle card plane.

### ui-layouts (https://www.ui-layouts.com — MIT)
- [5/5] Horizontal Scroll (sticky container + translateX) — home teaser + /case-studies rail.
- [4/5] RandomizedTextEffect (decoder) — eyebrow mono, footer NOW·ON-CALL widget.
- [4/5] ScrollBaseAnimation (velocity marquee) — credibility strip, /about band.
- [4/5] ImageReveal (cursor-following preview) — /resources list, /case-studies list view.
- [3/5] StickyHeroScroll (card-deck handoff) — UNA sola volta come punteggiatura.

### Codrops search "text" tutorials (pagine 1–2)
- [5/5] WebGPU Gommage (vedi sopra) — dissolve type tra gli stage del morph, FinalCTA.
- [4/5] Responsive & SEO-friendly WebGL Text — pattern architetturale per headline shader-treated (DOM resta per SEO/a11y).
  https://github.com/ehaakana/codrops-text-demo
- [4/5] SplitText→MorphSVG: 5 demos (Osmo masked reveal, demo 1) — default heading choreographer.
  https://codepen.io/osmosupply/pen/pvvKezw
- [4/5] Interactive Text Destruction (TSL elastic vertex) — reference per il momentum spring del sim hero.
  https://github.com/armdz/tsl_elastic_vertex_destruction
- [3/5] 3D Scroll-Driven Text (CSS+GSAP arc) — process steps / audit timeline senza WebGL extra.
  https://github.com/davidfaure/3d-text-animation-codrops/

### Codrops hub all (pagine 1–2, ~90 item)
- [5/5] Scroll-Revealed WebGL Gallery (pixel-reveal + Flip + canvas persistente) — /case-studies.
  https://github.com/J0SUKE/gsap-threejs-codrops (Barba escluso, resta App Router)
- [5/5] WebGPU Gommage (vedi sopra).
- [4/5] Sticky Grid Scroll — grid pinnata con zoom-through → alternativa per il teaser.
  https://github.com/theoplawinski/codrops-sticky-grid-scroll
- [4/5] EaseReverse Clip Menu — menu overlay + curtain interrompibili.
  https://github.com/codrops/EaseReverseClipMenu
- [3/5] Async Page Transitions (dual-container crossfade) — upgrade path della curtain.
  https://github.com/blenkcode/codrops-demo
- [3/5] Thumbnail Flow con MotionPath — card che fluiscono su curva al cambio filtro (eco della CatmullRom).
  https://github.com/Ibaliqbal/codrops-motion-path-transition

### awesome-webgpu (https://github.com/mikbry/awesome-webgpu)
- [5/5] three.js `webgpu_tsl_compute_attractors_particles` — template per il momentum layer del sim hero.
- [4/5] three.js `webgpu_tsl_vfx_linkedparticles` — /trust pipeline, "agent loop with guardrails".
- [4/5] WebGPU Samples `textRenderingMsdf` — reference per type in-canvas (glifi che ricevono il flowmap).
- [3/5] kishimisu WebGPU Fluid Sim — SOLO come concetto (repo senza licenza): upgrade flowmap→stable fluids low-res.

> Dati grezzi completi (51 candidati con snippet, note di porting e risks; 2 audit
> strutturati): output del workflow `ww2jnfnk3` nella sessione Claude del 2026-06-10.
