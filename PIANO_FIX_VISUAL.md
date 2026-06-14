# PIANO_FIX_VISUAL — Restyle & bug-fix visivi SerSan v2

> Implementation plan generato il **2026-06-14** da un'analisi multi-agente (15 agenti: 6 di diagnosi codebase + 9 di harvest sui siti di riferimento, ~1.5M token).
> Si innesta su `PIANO.md`, `PIANO_RESTYLE.md`, `ANALISI_LUSION.md`, `references/8bit-ai-design-reference.md` e sui research del task `06-06-webgl-visual-refactor…` (`award-implementation-plan.md`, `award-sprint-plan.md`).
> **Stato sito:** Home + sotto-pagine principali già animate (P5a steps 1-8 fatti). Il debito è concentrato nei 5 bug puntuali + nelle pagine legali/footer/dettaglio "piatte".
> Stack: Next.js 16 App Router · React · TS · R3F + drei + postprocessing · **WebGPU (TSL) con fallback WebGL2 (GLSL)** · GSAP + ScrollTrigger · Lenis · zustand · Tailwind.

---

## 0. Invarianti vincolanti (da rispettare in OGNI fix)

Questi vincoli vengono dall'`award-implementation-plan` e da `PIANO_RESTYLE §6`. Sono **non negoziabili** — ogni modifica deve passarli.

1. **Copy freeze.** Ogni stringa/numero/nome EN+IT è congelato. La motion è **solo additiva**. SplitText **solo sui titoli** e deve fare `revert()` prima del re-split EN/IT; gli heading con testo che cambia per lingua portano `key={language}`. Niente retype con TextPlugin: i "write-in" animano clip/opacity su nodi **già presenti** nel DOM (SEO/AT-safe).
2. **Parità a due materiali (load-bearing).** Ogni modifica alla linea va fatta **due volte**: `lineShader.ts` (GLSL / WebGL2) **e** `lineNodeMaterial.ts` (TSL / WebGPU). I due file promettono parità byte-per-byte.
3. **Singolo RAF.** Un solo loop: `FrameDriver` pompa Lenis dentro `useFrame`. Lenis→ScrollTrigger via `lenis.on('scroll', ScrollTrigger.update)`. Niente secondo `requestAnimationFrame` per la camera o lo scroll.
4. **Niente nuovi pin / long-scrub** che cambino `document.scrollHeight` (linea e RouteHero sono incollati a *frazioni* di anchor DOM). I nuovi ScrollTrigger usano `gsap.set` in `onUpdate`.
5. **Single camera authority.** `SignatureLine` è l'**unico** writer di `camera.position`/orientation. Non aggiungere un secondo writer altrove (es. in `SpineExitGate`): si passano solo *clock* via store (`camTilt`, `tiltAnchorY`, `camDescend`).
6. **GSAP free-tier only** (SplitText, ScrollTrigger, quickTo, timeScale, ScrambleText, MotionPath — tutti gratuiti ora; **no** MorphSVG).
7. **`prefers-reduced-motion` + tier lite/off** disattivano ogni loop non essenziale; il testo congelato resta **presente e leggibile** (enrichment su copy SEO/legale = `Reveal` visible-first, mai hide-then-show).
8. **Bloom selettivo** solo via `luminanceThreshold` + `toneMapped:false` + `emissive>1`. WebGL decorativo = `aria-hidden`; il contenuto reale resta nel DOM accessibile.

**Through-line creativa (da `award-implementation-plan`):** un **unico fascio di luce — "the signal"** — è la promessa SerSan resa visibile. Entra dall'hero (mark SERSAN che dissolve), filtra ogni sezione come tubo CatmullRom ancorato al DOM, persiste tra le route nel singolo contesto R3F, e si risolve nel RouteHero (es. `GatewayPortal`) ai CTA. Palette **sobria**: navy `#0B1422`, **un solo** accento cyan→violet `#3BE1FF → #7C5CFF`, font Editorial New / Switzer / JetBrains Mono. "Il nostro wow è ingegnerizzato e intenzionale" — niente sticker-bomb, niente arcobaleno, niente audio forzato.

---

## FIX 1 — Linea luminosa: depth/ordine vs logo + glitch alla camera transition ⭐ PRIORITÀ

### Diagnosi (3 problemi distinti)

**Premessa che corregge l'aspettativa:** la linea **non è mai sopra il DOM**. `CanvasHost.tsx:35` fissa il canvas a `z-0 pointer-events-none` e il contenuto sta a `z-1`: garanzia CSS dura. Quello che l'utente vede "sopra" è **dentro la scena 3D** — la linea copre il **logo hero WebGL**.

**Problema 1 — la linea disegna SOPRA il logo hero.**
La linea disabilita del tutto il depth buffer: `lineShader.ts:155-158` (`depthWrite:false`, **`depthTest:false`**, `AdditiveBlending`) e il gemello TSL `lineNodeMaterial.ts:165-168` identico. Il logo è l'opposto: opaco, depth-test/-write ON (`gpgpuNodeSim.ts:687-690`, occluder opaco in `HeroLogo.tsx:741-746`). La geometria mette già la linea **dietro** il logo (waypoint hero `z:-1.0` in `routeCurves.ts:42-44` vs logo `heroPosZ:-0.3` in `fxStore.ts:184-187`) — ma con `depthTest:false` la linea **non legge mai** il depth del logo, quindi compone sopra comunque. Aggravante: `AdditiveBlending` **somma** colore, quindi anche dove è correttamente dietro "schiarisce" la silhouette del mark.
→ `renderOrder` **non** risolve: gli opachi sono sempre disegnati prima dei trasparenti, indipendentemente dal renderOrder.

**Problema 2 — glitch alla camera transition (beat `SpineExitGate`).**
Durante il beat la pagina è **lockata** (`cinematic-system-scroll.tsx:1132-1155`, `getLenis().stop()`), quindi `scrollStore.progress` è congelato. Tre desync:
- (a) `headFraction`/`uProgress` derivano solo da `scrollYWorld = dampedProgress*(sh-ih)` (`SignatureLine.tsx:322-328`) → **non** include l'offset di discesa.
- (b) ma `camera.position.y -= desc` con `desc` fino a una **viewport intera** (`SignatureLine.tsx:427-451`, applicato :444) → la camera scivola lungo la curva mentre la testa illuminata resta "parcheggiata" alla frazione congelata = lo "scatto".
- (c) `lookAt`-ahead (`388-411`) imposta l'orientamento da `dampedProgress` congelato, **poi** `camera.rotateX(-descendPitch)` (:446) compone una **seconda** rotazione sopra → la linea ondeggia. `descendPitch = dVel*0.055` con `dVel=(desc-prevDescend)/delta` (:435-439) **spike** col dt strano del gate; `scrollRamp` (:431) si basa su `scrollPxNow` congelato → discesa applicata di colpo, non eased.

**Problema 3 — la linea "buca" davanti agli altri elementi 3D.** Con `depthTest:false` la linea passa anche sopra ritual objects / rail planes / compliance pipeline / drift particles (quelli usano `renderOrder:-1` + `depthTest:false` apposta per stare dietro). Verso il **DOM** invece non può mai stare davanti (vedi premessa).

### Fix raccomandato

**1a — Riattiva il depth TEST (non il write) sulla linea** *(rischio basso, confidenza alta)*
```ts
// lineShader.ts:157  →  depthTest: true   (mantieni depthWrite:false, mantieni AdditiveBlending)
// lineNodeMaterial.ts:167  →  material.depthTest = true
```
Il logo opaco scrive depth e viene disegnato prima; con `depthTest:true` i frammenti di linea dietro il logo (hero `z:-1.0` vs logo `z:-0.3`) vengono scartati. `depthWrite:false` resta OFF, così la linea non blocca gli elementi additivi a `renderOrder:-1`.

**⚠️ Trappola del fallback (DA RISOLVERE insieme):** su macchine **non-WebGPU** `HeroLogo` degrada al build a particelle statiche (`HeroLogo.tsx:179-184`), il cui materiale è additivo `depthTest:false` e **non scrive depth**, e l'occluder opaco **non è montato** (`HeroLogo.tsx:743-744`). Lì `depthTest:true` non ha nulla contro cui testare → la linea torna a "galleggiare" sui puntini. **Soluzione:** nel path statico montare comunque l'occluder opaco **oppure** dare `depthWrite:true` al materiale delle particelle statiche.

**1b — Camera-descent re-sync** *(rischio medio — è il single camera authority)*
- Calcola `desc` **prima** di derivare `headFraction` e piegalo nella posizione della testa, così la testa illuminata segue la camera durante il lock (uccide lo "scatto").
- Niente doppia rotazione: su `tier==='full'` con curva, applica il pitch di discesa **dentro il target del `lookAt`** (bias `lookTarget.y` verso il basso) invece di `camera.rotateX` dopo il lookAt (droppa la `rotateX` sul path full; tienila solo sul path lite/no-curve).
- Doma lo spike: clampa `dVel` o deriva il pitch dalla velocità di `camTilt` (clock liscio 0→1) invece che da unità-mondo/s.
- Rendi `scrollRamp` sensato durante il lock: basalo su `camTilt` (eased in `SpineExitGate`, `cinematic-system-scroll.tsx:1209`), non su `scrollPxNow` congelato.
- **Continua a pubblicare `camDescend` (`SignatureLine.tsx:448`)**: lo consumano `HeroLogo` (:577-583) e `HeroTextParticles` (:513) per tenere il mark/testo alla loro stazione.

**1c — Polish opzionale:** se l'additivo schiarisce ancora il mark dove la curva torna avanti (`routeCurves.ts:48-59`, `z:+0.2..0.6`), tieni i waypoint dell'hero-stretch (`:43-47`) a z negativo. Solo se 1a non basta.

### Riferimenti utili
- **Codrops "Reactive Depth: Scroll-Driven 3D Image Tube (R3F)"** (Feb 2026) — modello di *inerzia unificata*: una sola motion-value (target=scroll, `current += (target-current)*k`) guida tubo+luce, così Lenis+pointer sembrano un unico sistema fisico. → applicalo a `uProgress` della linea per togliere lo scatto.
- **three.js `webgpu_tsl_vfx_tornado`** — pattern `time→positionNode`: sostituisci `time` con `uProgress` Lenis su `TubeGeometry`/`CatmullRomCurve3` + ripple `sin(arcLength - uProgress*k)` per "disegnare" la linea.
- **Codrops "Cinematic 3D Scroll Experiences with GSAP"** (Nov 2025) — `ScrollTrigger scrub` → camera keyframes / `curve.getPointAt(progress)`, con uniform per inerzia.

---

## FIX 2 — Hero: la scritta a particelle "scroll" ri-anima allo sblocco

### Diagnosi
I clock di morph (`morph3TRef` in `HeroTextParticles.tsx`) **non sono latchati**: `morph3Target` è ricalcolato **ogni frame** come funzione pura del gate progress smussato `g` (`HTP:458-459`), senza memoria del completamento. `g` è un damp di `gateProgress` (`HTP:415-417`), quindi laggato e "spalmato" su più frame. Il flag `morph3Done` (`HTP:469-471`) alza solo il cap del gate (`hero-intro-gate.tsx:99`), **non** congela il clock.

Allo **sblocco**: il release parte con una notch wheel-down che spinge `gateProgress>1` e fa ripartire Lenis (`gate:94-101`); nei primi frame `scrollY<=2` quindi `canEngage()` è ancora TRUE (`gate:71-75`), e i delta wheel/touch residui/inerziali rientrano nel ramo di **reverse re-engage** (`gate:104-111`) che ri-locka il gate e scrive `gateProgress = 1 + delta/8500`. L'intent verso l'alto trascina `gateProgress` (e `g`) **sotto 0.66** → `morph3Target` flippa 1→0→1 → la parola "scroll" si **dis-costruisce e ri-costruisce**. È l'ultima parola perché il suo trigger (0.66) è l'unico nel raggio d'azione dell'handoff di sblocco (morph1/morph2 a 0.22/0.44 completano in profondità nel lock).

### Fix raccomandato *(option 1 — ~6-8 righe, rischio basso)*
Latch per-leg in `HeroTextParticles.tsx`:
```ts
const morph3LatchedRef = useRef(false);
// dopo HTP:469 (const morph3Done = morph3TRef.current >= 0.95)
if (morph3Done && useTextMorphStore.getState().gateProgress >= 1)
  morph3LatchedRef.current = true;
// guard al target (HTP:458)
const morph3Target = morph3LatchedRef.current
  ? 1
  : (g >= MORPH3_TRIGGER && morph2TRef.current >= 0.95 ? 1 : 0);
```
- Seed del latch + `morph3TRef.current = 1` sul rebuild quando lo store legge `morph3Done` (`HTP:316-320`).
- Clear del latch **solo** nel replay genuino (quando `assembleDone` è osservato false in build — stessa condizione del reset nav-into-home `smooth-scroll-provider.tsx:52-64`).
- Applica lo stesso a `morph1`/`morph2` per sicurezza (un flick veloce può sfiorare ogni boundary).

Risolve **in un colpo** sia il replay allo sblocco sia il replay da remount/nav-reset (`HTP:349-356`). La reversibilità *prima* del completamento resta intatta.

**Belt-and-suspenders opzionale:** in `hero-intro-gate.tsx` aggiungi un flag `hasLeftTop` (richiesto nel ramo reverse :105 al posto di `scrollY<=2`) e `setProgress(1)` esplicito al release + ignora wheel/touch per ~150ms post-release → toglie anche il micro-flicker dell'handoff.

### Riferimenti utili
- **three.js `webgpu_compute_particles`** (two-pass: assemble + pointer-impulse) e **Codrops "Dreamy GPGPU Particles"** + **Codrops "3D Typing"** (canvas-sampling: `ctx.fillText('SERSAN', Editorial New)` → leggi alpha pixel → target points) — per rifinire/estendere l'intro se in futuro si vuole campionare il wordmark col font di brand su resize/locale.
- **Codrops "WebGPU Gommage"** (dissolve MSDF TSL, `step(uProgress, perlinRemap)`) — coerente col mark dissolving già committato.

---

## FIX 3 — Refactor "card terminale" → tema reti neurali

### Identità della card — DECISIONE: unifica ENTRAMBE le superfici
Sostituiamo **sia** la `IncidentConsole` della Problem section (`problem-section.tsx:86-262`: pallini macOS :158-162, label "incident console" :163-166, radar-sweep :240-258, scan riga-per-riga :100-143, righe `cause → effect.` :223-229) **sia** i 3 pannelli "file" di `ProductionGradeSection` (`production-grade-section.tsx:88-127`: `evals/agent_v0.4.3.json` / `trace` / `permissions.yaml`) sotto **un'unica lingua visiva neurale** coerente col mondo WebGL del sito. I due beat condividono lo stesso vocabolario (nodi/edge/segnale, palette cyan→violet, glow via Bloom selettivo): la Problem section mostra la **rete che si spezza** (i 3 failure), la ProductionGrade mostra la **rete sana** (eval baseline · trace path · guardrail clamp).

### Critica (perché è debole per un brand AI premium)
Trope macOS-terminal abusatissimo e "da template"; **litiga col sistema WebGL del brand** (rettangolo DOM piatto in mezzo a un mondo cinematografico); motion gratuita (radar/scan) — vietata da `AGENTS.md §2`; palette d'allarme rosso/ambra/verde che diluisce il signal cyan→violet; gerarchia debole (tre righe identiche, niente focal point); **sotto-vende** un argomento forte (no evals→no signal, no traces→no debug, no boundaries→no trust).

### Concept di redesign (la **sostanza resta**: evals · traces · guardrails)

> ✅ **DECISIONE: Concept B** (lattice neurale nel canvas WebGL), applicato a **entrambe** le superfici. Il **Concept A (SVG)** diventa il **fallback** obbligatorio per `prefers-reduced-motion` / WebGL2-only / tier "off". Il Concept C resta documentato come opzione scartata.

**▸ Concept A — "Neural failure graph" — DOM/SVG + GSAP** *(ora: FALLBACK reduced-motion / no-WebGPU)*
Un grafo diretto piccolo ed elegante: input → hidden → output, nodi glow, edge hairline col gradiente cyan→violet. I 3 failure mode sono 3 percorsi che **si spezzano**: un packet di segnale parte, percorre l'edge e **muore** al break (no eval node su cui atterrare / fork nel buio / output senza ring di gate). Copy esatta da `getFailures()` (`problem-section.tsx:42-75`) come 3 caption mono `01/02/03`.
- **Tech:** `<svg viewBox>` responsivo; `<linearGradient>` da `hsl(var(--accent))` a `hsl(var(--accent-2))`; nodi `<circle>` con **un solo** layer blur condiviso; edge `<path stroke=url(#signal)>`; packet via **GSAP MotionPathPlugin** (free) o `stroke-dashoffset`. Reduced-motion: render del frame finale (edge rotti dashed/dim). **Nessuna nuova dipendenza.** Via i pallini, la label "console", il radar.
- **Rischio:** basso. Solo sizing/contrasto AA delle caption.

**▸ Concept B — "Live inference lattice" dentro il canvas WebGL — R3F/TSL ✅ SCELTO** *(massima coesione di brand; costo/QA alti — accettato)*
Niente card DOM: si **world-anchora** un lattice neurale instanziato ai rect delle sezioni. La signature line ci passa **attraverso**. Architettura concreta:
- **Un nuovo WebGL island** (sibling di `RailPlanes`/`SignatureLine` sotto `src/webgl/`), montato in `Scene.tsx`, ancorato a **due** anchor: `data-line-anchor="problem"` (rete che si spezza) e la sezione production (`#trust`, rete sana). Geometria = `THREE.InstancedMesh` di nodi + `LineSegments`/TSL node-line per le connessioni; emissive cyan→violet sullo **stesso** path Bloom della linea (invariante §0.8).
- **Bridge cross-bundle:** riusa **esattamente** il pattern di `productionPulseStore.ts:31-55` (il DOM bumpa un target globalThis-pinned sull'edge in-view, il WebGL `useFrame` lo smorza — già risolto il desync duplicate-store di Turbopack). Crea uno store gemello (es. `neuralLatticeStore`) per i 2 beat.
- **Problem section:** 3 cluster del lattice corrispondono ai 3 failure; al passaggio in-view ognuno **si spegne/desatura** (signal packet che muore). **ProductionGrade:** 3 cluster "sani" pulsano in sequenza (eval baseline → trace propagation → guardrail clamp), riusando il `useProductionPulseOnEnter` già esistente.
- **Copy reale** resta come overlay DOM `z-1` (selezionabile, screen-reader); WebGL `aria-hidden`. Le label mono (JetBrains Mono) etichettano i cluster.
- **Fallback (obbligatorio):** reduced-motion / WebGL2-only / tier "off" → rendi il **Concept A (SVG statico)** per la Problem section e una versione statica del lattice per la ProductionGrade. Il codebase già smonta gli island WebGL a tier "off".
- **Budget:** instanced + node-count modesto, ridotto su mobile; verifica 60fps con la linea + Bloom già attivi.

**▸ Concept C — "Activation heatmap → guardrail" — Canvas2D/SVG** *(costo basso, unifica)*
Striscia di attivazioni che si accendono left→right (cyan→violet); una "guardrail line" **clampa** le attivazioni oltre il confine (= permissions). La griglia di base = eval set; la propagazione = trace. Può **unificare anche i 3 pannelli** di ProductionGrade sotto un'unica lingua visiva. Rischio: deve sembrare *strutturato*, non "rumore tecnico".

### Riferimenti utili
- **erikjs "Real-Time Neural Network Visualizer with R3F"** — `InstancedMesh` nodi per layer (1 draw call), brightness=attivazione, **signal packet** che viaggia layer→layer in `useFrame` (`pos.lerpVectors(layerA,layerB,t)`), edge via drei `<Line>`/`<Segments>`, glow via Bloom selettivo. → blueprint diretto per Concept B.
- **three.js `webgpu_tsl_compute_attractors_particles`** — attrattori come "neuroni", particelle come flusso di segnale; `colorNode = mix(#3BE1FF, #7C5CFF, speed/maxSpeed)`. → substrato GPU per Concept B.
- **animate-ui `ShimmeringText`** (CSS per-char color wave) per le label mono "PII REDACTION / GUARDRAIL CHECK / AUDIT LOG" che pulsano come segnale; **`HexagonBackground`** (clip-path, zero JS) come backdrop lattice di fallback.
- **gsapify `ScrambleText`** (`chars:'01'`) per il decode "inference" sui label; **Vivus.js** (`stroke-dashoffset`) per "cablare" il grafo SVG in reduced-motion.

---

## FIX 4 — Glitch sulle work-card: parte solo la prima volta

### Diagnosi (causa univoca)
Il glitch è il **canvas WebGL2 lazy** di `CardImageDistort` (non CSS). Si rompe perché il teardown **avvelena permanentemente** il `<canvas>`: in `disposeGL` c'è `ctx.loseExt?.loseContext()` (`card-image-distort.tsx:216-224`, riga **:223**). `WEBGL_lose_context.loseContext()` mette il context del canvas in stato **lost permanente**; poiché React riusa lo **stesso** `<canvas ref>` tra gli hover, al 2° hover `ensureContext()`/`createGL()` (`:374-384`) restituisce `null`/lost, `opacity` non va mai a 1 → il distort non riappare. La reveal CSS immagine/scrim è indipendente (`globals.css:657-681`) e continua a funzionare: ecco perché *solo* il glitch WebGL muore. Tilt escluso (`data-no-tilt`, `card-tilt-controller.tsx:107-114`).

### Fix raccomandato *(option 1 — rischio basso)*
Tieni **vivo** il context tra gli hover; non distruggerlo on-leave:
```ts
// disposeGL: elimina texture/buffer/vao/program ma RIMUOVI la riga :223 loseContext()
// render() idle branch (:360-372): NON chiamare teardown() —  raf = 0; cv.style.opacity = '0';  (ctx resta vivo)
// onEnter: ensureContext() (crea ctx UNA volta, poi riusa); resize(); cv.style.opacity='1'; riavvia rAF
// cleanup effect (unmount, :444): qui disposeGL(ctx) + ctx=null  (teardown reale ok: il canvas viene smontato)
```
Costo: ~3-6 context WebGL2 low-power idle (max 3 rail home + 3 grid /case-studies), ben sotto il limite browser (~16). Retrigger garantito ad ogni hover.

### Riferimenti utili (per un'evoluzione più "premium" del glitch)
- **Milad Ghamati "Glitch Hover with R3F + GLSL"** — effetto **guidato dalla velocità del cursore** che **auto-decade** (`fadeSpeed 0.9`): non dipende da un booleano enter/leave fragile, quindi *non si "incolla" mai*. Pattern ideale se si riscrive il distort da zero.
- **Codrops "Animate WebGL Shaders with GSAP"** (Oct 2025) — `gsap.to(uMixFactor, …)` + reveal circolare dal cursore + RGB-split gated. **akella "Interactive WebGL Hover"** — RGB-shift canonico.
- **Codrops "Skeleton Fluid X-Ray Reveal"** — alternativa on-brand: hover dipinge un "x-ray" Fresnel/wireframe cyan sul prodotto (più rigoroso di un glitch RGB).
- **Fallback DOM-only** (gsapify): RGB-split a 3 layer `mix-blend:screen` + jitter `x/skewX` — quando il WebGL è overkill o per reduced-motion.

---

## FIX 5 — Navbar: aggiungere "Home" + logo → home

### Diagnosi
- **Ask 1 (Home nel menu):** `NAV_ITEMS` (`navbar.tsx:23-31`) ha 7 voci, **nessuna Home**. `isActive` (`:256-257`) già fa `pathname === href || (href !== '/' && pathname.startsWith(href+'/'))` → una voce `href:'/'` si evidenzia **solo** sull'esatto `/`. Nessuna modifica a `isActive`.
- **Ask 2 (logo → home):** il logo in barra (`navbar.tsx:383 <SersanLogo size="md"/>`) **già** default `href='/'` ed è un vero `next/link` con aria-label (`sersan-logo.tsx:46-76`). Canvas e cursor sono `pointer-events-none` → non bloccano. Quindi: o l'utente intende il **logo hero WebGL** (non cliccabile by design, `CanvasHost.tsx:35`), oppure c'è un comportamento da **verificare live**.

### Fix raccomandato
**Ask 1** — una riga, primo elemento dell'array:
```ts
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", labelIt: "Home" },
  { href: "/audit", label: "Audit", labelIt: "Audit" },
  // …resto invariato
];
```
i18n già gestita da `MenuPill` (`:141-142`); lo stagger GSAP assorbe l'8ª pill senza modifiche.

**Ask 2 (DECISIONE: logo barra in alto)** — hardening esplicito + verifica live:
```tsx
// navbar.tsx:383
<SersanLogo size="md" href="/" />   // behavior-preserving, autodocumentante
```
Poi **QA live in Chrome**: da una sotto-pagina, cliccare il logo barra e confermare la navigazione a `/`. Il codice mostra che è **già** un `next/link` a `/` (`sersan-logo.tsx:46-76`) e che canvas/cursor sono `pointer-events-none` (non bloccano). Quindi se in QA il click **non** naviga, c'è un blocco reale da isolare (es. un overlay con `pointer-events:auto` sopra la navbar, o un handler che fa `preventDefault`/`stopPropagation`): lo individuo coi dev-tools e lo rimuovo. L'overlay DOM sull'hero **non serve** (decisione presa: è il logo barra).

### Riferimenti utili
- **Hover.css → Tailwind** underline-sweep per i link nav/footer/CTA: `after:absolute after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-[linear-gradient(90deg,#3BE1FF,#7C5CFF)] after:transition-transform hover:after:scale-x-100 motion-reduce:after:transition-none`.
- **animate-ui `Magnetic`** (port GSAP `quickTo`) per il pull magnetico del CTA persistente "Book a scoping call".

---

## FIX 6 — Arricchire scritte/card "spoglie" (no motion)

### Diagnosi
La Home e le sezioni dedicate sono **già** animate (Reveal, SectionHeading line-mask, LabelScrambler globale su ogni `.eyebrow`, HeadingChoreographer su ogni `[data-split-reveal]`, CardTiltController su ogni `.card-steel`, CountUp, RedactedReveal). Il debito è concentrato in:

| Area | File | Cos'è statico | Enrichment on-brand |
|---|---|---|---|
| **Pagine legali** (la zona morta più grande, ~800 righe) | `privacy-client.tsx` / `terms-client.tsx` / `cookies-client.tsx` | h1 `.heading-display` (no split), h2 `.heading-3` (no choreography), tutti i `<p>/<ul>` nudi; solo l'eyebrow "Contents" scrambla | `data-split-reveal`+`key={language}` su h1; wrap di ogni `<section>` in `<Reveal>` (visible-first, SEO-safe); stagger dei pill "Related documents" |
| **Footer** (ogni pagina) | `footer.tsx:151-228` | 4 colonne + riga legal/social/locale senza Reveal/stagger; heading colonne `h3.font-mono` (no scramble) | `<Reveal delay={i*60}>` per colonna + stagger icone social left→right (8bit ref §6); opz. heading→`.eyebrow` |
| **/about** | `about-client.tsx:179-195, 240-290` | blockquote "The job" statico; strip "Verifiable not vibes": CountUp anima ma label/unit/wordmark tier-1 fermi | `<Reveal>` + draw `scaleY` sul border-left accent; `<Reveal delay>` per stat; wordmark→`.eyebrow` per decode-in |
| **/audit** | `audit-client.tsx:433-443` | checklist "Is this for you?" con `<li>` nudi (incoerente col list 100 righe sopra) | `<Reveal as="li" delay={i*60}>` (pattern già usato sopra) |
| **case-study detail** | `case-study-detail-client.tsx:190-234` | CountUp anima i numeri ma container/label/chip/CTA atterrano piatti | `<Reveal delay={i*70}>` per metrica + stagger chip + Reveal su CTA card |

Causa storica: P5a (`PIANO_RESTYLE §107-113, 222-234`) ha incluso solo `/consulting /audit /case-studies /resources /about /contact /trust` — **mai** le pagine legali.

### Fix raccomandato
Tutto **additivo**, primitive già esistenti e reduced-motion-safe. **Priorità:** legali → footer → case-study detail → about → audit. Per i titoli legali usare `Reveal` visible-first (testo presente in SSR) e `key={language}` sullo split (evita il bug di reconcile EN/IT documentato).

### Riferimenti utili
- **MagicUI `TextReveal`** (word-by-word scrub) — porta la matematica `range=[i/N,(i+1)/N]` a GSAP `ScrollTrigger scrub` + `stagger:{each:1/N}` per i paragrafi tesi (WHO·WHY, WHAT WE REFUSE). **MagicUI `DiaTextReveal`** (sweep gradiente cyan→violet via `background-clip:text`) one-shot sugli eyebrow.
- **gsapify** "Spotlight Reveal" (`stagger from:'center'` + blur), "Scroll Highlight" (color word-sweep su `scrub`), "Line-by-line mask" (`yPercent:100` in wrapper `overflow:hidden`).
- **GSAP `ScrollTrigger.batch`** per ondate staggerate di card (founder, practice areas) senza un trigger per card. **animate-ui `CountingNumber`** (scrivi su `textContent`, no re-render) — conferma il pattern del nostro `CountUp`.

---

## 7. Libreria di riferimenti (curata, mappata ai fix)

> Tutto è **portato a GSAP+ScrollTrigger** (framer-motion è stato droppato, commit `1ef3adf`): non reinstallare `motion/react`. Le verifiche API three/TSL vanno fatte su **Context7** prima di scrivere codice (le API node cambiano spesso).

**Signature line (FIX 1)**
- Codrops *Reactive Depth — Scroll-Driven 3D Tube R3F* (Feb 2026) → modello inerzia unificata · `github.com/matdn/helmet`
- Codrops *Cinematic 3D Scroll with GSAP* (Nov 2025) → ScrollTrigger scrub → camera/curve + uniform inerzia
- three.js `webgpu_tsl_vfx_tornado` → `time→positionNode` su Tube/Curve

**Hero particle-text (FIX 2)**
- three.js `webgpu_compute_particles` (assemble + pointer-impulse) · Codrops *Dreamy GPGPU Particles* (Dec 2024) · Codrops *3D Typing* (canvas-sampling del wordmark) · Codrops *WebGPU Gommage* (dissolve MSDF TSL) · Codrops *Dissolve Effect GLSL* (fallback WebGL2)

**Terminal-card neurale (FIX 3)**
- **erikjs** *Neural Network Visualizer R3F* (instanced nodi + signal packet + bloom) ⭐ · three.js `webgpu_tsl_compute_attractors_particles` (neuroni=attrattori) · animate-ui `ShimmeringText` / `HexagonBackground` · gsapify `ScrambleText` · Vivus.js (fallback SVG)

**Work-glitch (FIX 4)**
- **Milad Ghamati** *Glitch Hover R3F+GLSL* (velocity-driven, auto-decay) ⭐ · Codrops *Animate WebGL Shaders w/ GSAP* (Oct 2025) · akella *Interactive WebGL Hover* (2020) · Codrops *Skeleton Fluid X-Ray* (alternativa on-brand) · Codrops *Grid Displacement RGB-Shift GPGPU* (2024) · gsapify RGB-split+jitter (fallback DOM)

**Static-content / polish (FIX 6 + generale)**
- MagicUI `TextReveal` + `DiaTextReveal` · gsapify (Spotlight / Scroll Highlight / Line-mask) · GSAP `ScrollTrigger.batch` · animate-ui `CountingNumber` / `SplittingText` / `Magnetic` · shadcn `Card` (scaffold a11y `data-slot`) · Hover.css→Tailwind (link/nav/footer) · Easings.net (vocabolario easing condiviso DOM↔WebGL: `expo.out` reveal, `power2.inOut` hover, `cubic-bezier(0.16,1,0.3,1)` settle)

**Note sui siti gated:** `animate-ui.com` (client-rendered) e `awwwards.com/elements/scroll` + `jitter.video` (gated/closed-tool) non espongono codice via fetch → estratti i sorgenti reali via GitHub API / Codrops equivalenti. `tympanus.net/codrops/hub` e `gsapify.com` e `ui-layouts`/MagicUI sono pienamente raggiungibili e code-rich.

---

## 8. Roadmap & QA gate

**Sequenza consigliata** (ogni step: implement → screenshot Chrome desktop+mobile → console pulita → confronto col livello Lusion):

1. **FIX 1 — linea** (priorità): 1a depthTest + risolvere fallback statico → verifica occlusione hero; poi 1b camera re-sync → verifica forward/reverse/escape. *Tocca il single camera authority: massima cautela.*
2. **FIX 2 — latch morph** (~6-8 righe): verifica sblocco senza replay + reversibilità pre-completamento + replay nav-into-home.
3. **FIX 4 — glitch** (rimuovi `loseContext`): verifica retrigger su N hover su rail home **e** grid /case-studies.
4. **FIX 5 — navbar** (Home + logo href): QA live del click logo; eventuale overlay hero dopo decisione §9.
5. **FIX 3 — card neurale (Concept B, due superfici)**: nuovo WebGL island + `neuralLatticeStore` (bridge come `productionPulseStore`) ancorato a `problem` + `#trust`; rimuovi IncidentConsole e i 3 pannelli; implementa il fallback SVG (Concept A) per reduced-motion/WebGL2. *Tocca il budget WebGL/Bloom: verifica 60fps con linea attiva. Step più grande — candidato a sotto-task dedicato.*
6. **FIX 6 — static enrichment**: legali → footer → detail → about → audit.

**Gate trasversali:** Context7 prima di ogni codice three/R3F/GSAP · parità `lineShader`↔`lineNodeMaterial` · `prefers-reduced-motion` + tier off testati · Lighthouse mobile ≥ 80 · 60fps desktop · niente regressioni di `scrollHeight`. Commit piccoli e descrittivi per fix.

**Flusso Trellis:** ogni fix = `trellis-implement` → `trellis-check` → commit. La PRIORITÀ (FIX 1) e FIX 2 sono i candidati ideali per partire.

---

## 9. Decisioni — PRESE (2026-06-14)

1. **Terminal card** → ✅ **unifica ENTRAMBE** (IncidentConsole *e* i 3 pannelli ProductionGrade) sotto un'unica lingua neurale.
2. **Concept redesign** → ✅ **B — lattice neurale nel canvas WebGL** (Concept A/SVG = fallback reduced-motion / no-WebGPU).
3. **Logo → home (FIX 5)** → ✅ **logo della barra in alto** (hardening `href` + QA live per isolare un eventuale blocco reale). Nessun overlay hero.
4. **Feel camera transition (FIX 1b)** → *default applicato:* la **testa illuminata viaggia con la camera** durante il beat.
5. **Pagine legali (FIX 6)** → *default applicato:* trattamento **pieno** (split-reveal h1 + Reveal per sezione) ma **visible-first** (SEO/AT-safe).

> Decisioni 4 e 5 sono i miei default consigliati: se ne vuoi altri, dimmelo. **Prossimo passo:** al tuo "vai" parto dalla **PRIORITÀ FIX 1** (linea). Non tocco codice finché non dai l'ok.
