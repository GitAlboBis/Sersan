# HANDOFF — ritratti a particelle dei fondatori (morph a 4 target, era 3), riconciliazione rami, hero

> Documento per **riprendere da una nuova sessione o da un altro PC**. Aggiornato: **2026-07-20** (secondo giro: terza persona).
> Le sessioni Claude Code e la memoria NON viaggiano tra macchine: viaggia solo il **repo git**. Questo file è committato.

## Come riprendere

1. `git pull` su **`main`** — tutto è lì e **pushato** (`origin/main` = `1083d42`).
2. Apri Claude Code nella cartella e come primo messaggio: *"Leggi `HANDOFF_FOUNDER_MORPH.md` e `.trellis/spec/frontend/webgl-island-guidelines.md`, riprendiamo da lì."*
3. I **contratti tecnici** (quelli che impediscono di rifare gli errori) stanno qui sotto e in
   `.trellis/spec/frontend/webgl-island-guidelines.md` — leggerli **prima** di toccare il morph.
4. Per aggiungere una persona alla rail, salta direttamente a **"Aggiungere un quarto ritratto"** in fondo. È la sezione che ti risparmia la giornata.

---

## Stato attuale

**Tutto su `main`, pushato, deployato da Vercel.** `npx tsc --noEmit` pulito. Morph a **tre target** verificato in una sessione WebGPU reale.

| commit | cosa |
|---|---|
| `1083d42` | **Mattia Scattu come terzo target del morph** (A→B→C) |
| `8f4c49c` | docs: handoff precedente |
| `5562211` | hero: marchio raddrizzato + 3 varying accese |
| `07ba3be` | merge che preserva la storia dei 9 commit |
| `b26e82d` | **riconciliazione** dei due rami |
| `4abdabc` | maschera di sfondo **spaziale** (flood fill dal bordo) |

Tag di sicurezza: **`local-morph-work-20260720`**.
Branch `merge/founder-morph-reconcile` = già interamente dentro `main`, cancellabile (lasciato per scelta).

### Cos'è cambiato in questo giro

La sezione morfava esattamente due ritratti, con un gate la cui nozione di "estremità" era la **lettera** dello stadio. Ora è una catena sequenziale a tre, con Michele come nodo **interno** vero.

Toccati 12 sorgenti + 2 asset. Il percorso completo — piano, correzioni, review — è committato in
`.trellis/tasks/06-06-webgl-visual-refactor-*/research/mattia-*.md`. Leggilo se devi rimettere le mani qui: contiene il *perché*, non solo il *cosa*.

**Contenuto:** Mattia è `kind: "team"` in `founders.ts`. `/contact` e `/start` iterano `coFounders` e mostrano **due** persone, perché il loro copy dice "founder". Home e `/about` mostrano tre. "Both senior" è stato ristretto a "Both **founders** senior" in `about-client.tsx` e `our-why.tsx`, EN e IT.

---

## I contratti da NON re-imparare

I primi sei vengono dal giro precedente e valgono ancora. Dal 7 in poi sono di questo giro.

### 1. Il tono viene dalla DIMENSIONE, non dal numero di particelle

Il vecchio sampler estraeva a sorte **con reimmissione**: 26.357 particelle su 42.000 (63%) duplicate, 1.902 celle (11% del volto) mai coperte. E le mancanti non erano casuali — il peso era proporzionale alla luminosità, quindi sparivano **le scure**: sopracciglia, ciglia, narici, labbra. Esattamente ciò che rende leggibile un volto.

**Modello attuale**: una particella per cella su griglia regolare (290×405), tono portato dalla dimensione via il canale `ink`. Con tre ritratti: **51.751 celle condivise, stride 1**.

> **Il conteggio segue il sampler, mai il contrario.** Se serve ridurre, stride uniforme fisso. Mai sottocampionamento casuale (rigrumisce) e **mai** padding per duplicazione.

### 2. Soggetto e sfondo si separano SPAZIALMENTE, mai per colore

Il cuoio capelluto rasato e illuminato di Michele **ha lo stesso colore del muro bianco**. Nessuna soglia per-pixel può distinguerli. Ci siamo cascati **due volte** (`lumCeil`, poi il noise gate): entrambe le volte ha bucato la testa.

**Soluzione**: lo sfondo è la regione **connessa al bordo**. Flood fill dall'alto e dai lati alti, `BG_FILL_TOL` 0.055, `BG_FILL_ROW_LIMIT` 0.62.

> Il limite di riga **non è cosmetico**: la camicia tocca il bordo inferiore, e tra camicia bianca e muro bianco c'è solo una tenue ombra di spalla. Seminando dal basso il riempimento **trabocca nel busto e lo cancella**.

### 3. La trappola delle `varying` di TSL

```ts
const v = float(0).toVar();          // FUORI dalla Fn
material.vertexNode = Fn(() => { v.assign(expr); return clip; })();
const vF = varying(v);               // ← legge SEMPRE lo 0 iniziale
```

three antepone l'assegnazione di ogni varying **in cima al `main()` del vertex**, prima che il corpo della `Fn` giri. Spostare l'assegnazione dentro la `Fn` **non serve a niente**. Corretto: passare l'espressione autonoma direttamente a `varying(expr)`.

> **Come si riconosce**: se un consumatore di uno scalare per-particella funziona e un altro no, guarda se quello che funziona lo legge nel **vertex** e quello rotto passa da una varying. Degrada in silenzio: nessun errore, la funzionalità semplicemente non c'è.

### 4. Sotto i ~2 pixel la dimensione smette di funzionare

Canvas montato con `antialias: false`. Un quad più stretto di un pixel lo dipinge a piena intensità o lo manca: la copertura non attenua.

**Soluzione**: `alpha *= cov²` con `cov = clamp(diametro / max(1.25, 0.35·spacing), 0, 1)`, e `dist` portato come seconda varying.

> **Trappola di metodo**: le anteprime su canvas 2D **non possono rivelare questo difetto**, perché il canvas fa antialiasing e il render no. Verifica sul render reale.

### 5. La banca della camera è giusta per la linea, sbagliata sul marchio

`camera.rotateZ` ruota **tutto** lo strato WebGL, quindi il rollio andava a fondo corsa dal primo fotogramma e **ogni hero del sito era storto**. Servono entrambe le parti: la rampa `rollGate` sul target, e il marchio che compensa leggendo `textMorphStore.camRoll`.

> La sola rampa **non basta**: il marchio resta a schermo fino a ~1600px mentre la rampa completa a ~935, quindi ruoterebbe sotto gli occhi. Un logo che ruota è peggio di uno storto fisso.

### 6. Verificare sempre il round di fix dopo un round di fix

I 20 fix di `69e49a6` furono scritti da agenti in parallelo su file disgiunti: nessuno vedeva le modifiche degli altri. Una passata avversariale sul **diff** trovò **7 regressioni**, di cui 2 gravi.

Confermato di nuovo in questo giro: la review sulla diff combinata ha prodotto 29 candidati → 18 confermati → 13 distinti, incluso un P0 reale. **Typecheck e build non intercettano questa classe di errori.**

### 7. ⚠️ Il budget di vertex buffer di WebGPU è 8, ed eravamo esattamente sul limite

**Il difetto più costoso di questo giro, e nessuno dei 13 agenti l'ha visto.**

Aggiungere il terzo target ha aggiunto `colorC` e `sizeC` come attributi per-istanza via `.toAttribute()`. Il build passava da 8 a 10 vertex buffer. Il massimo in WebGPU è **8**, quindi `CreateRenderPipeline` veniva rifiutato e **nessun ritratto renderizzava** — né Mattia, né Michele, né Alessandro.

```
THREE.Vertex buffer count (10) exceeds the maximum number of vertex buffers (8).
 - While validating vertex state.
 - While calling [Device].CreateRenderPipeline(...)
```

Conteggio reale (verificato contro il sorgente r184 — `WebGPUAttributeUtils` indicizza per attributo):

| build | vertex buffer | storage in vertex |
|---|---|---|
| hero text | 4 di 8 | 0 di 8 |
| ritratto, 2 target | **8 di 8** ← era già al muro | 0 |
| ritratto, 3 target (prima) | **10 di 8** → pipeline rifiutata | 0 |
| ritratto, 3 target (ora) | **4 di 8** | 3 di 8 |

**Soluzione**: colore e ink impacchettati in **un `vec4` per target** (sei buffer → tre), letti con `.element(instanceIndex)` invece di `.toAttribute()`, che li sposta fuori dal budget dei vertex buffer. Un quarto target ora costa **una** binding, non due.

> **Il kernel di compute è già a 8 su 8 storage buffer** (position, velocity, homeA–homeD, start, delay). Un quinto target di *posizione* rompe la pipeline di compute molto prima che il budget di render sia esaurito.
> Fallisce **in silenzio dal punto di vista del codice**: nessuna eccezione JS, nessun errore di tipo. La mesh semplicemente non disegna. Si vede solo aprendo la console del browser.

### 8. `.toAttribute()` e `.element()` hanno swizzle OPPOSTI

Il commento nel file diceva `.toAttribute()` **ONLY**, dichiarando `.element()` rotto fuori dal compute. **È vero per il fallback WebGL2, falso per WebGPU** (`WGSLNodeBuilder.getNodeAccess` ramifica su `shaderStage !== 'compute'` ed emette `var<storage, read>`). Quel commento avrebbe mandato la prossima persona a cercare la soluzione altrove.

- `.toAttribute()` su un buffer `"vec3"` → **4 componenti**, `.xyz` obbligatorio. Non è padding WGSL: `WebGPUAttributeUtils` **muta** `itemSize` da 3 a 4 e riscrive l'array.
- `.element()` sullo stesso buffer → **vec3 vero, niente `.xyz`**. Bypassa quella mutazione.

> Portarsi dietro il `.xyz` cambiando forma di accesso è un errore silenzioso a 4 componenti.
> Nota collegata: `instanceIndex` **non** è limitato a vertex/compute — nel fragment `IndexNode` lo avvolge in una varying senza dirlo. Lasciare il blend di colore nel fragment avrebbe compilato e renderizzato, trasformando una load per-istanza in una lettura storage **per-pixel** su tutta la copertura di ogni disco. Trappola di performance, non errore.

### 9. Un clamp ai bordi non fa terminare un clock su un target interno

Il clock del morph avanzava di un passo e veniva limitato a `[0, MORPH_MAX]`. Con **due** target ogni bersaglio coincideva con un bordo, quindi l'ultimo passo veniva tagliato esattamente sopra e `cur === target` diventava vero. Con **tre**, il bersaglio 1 (Michele) è interno: il passo lo scavalca, il clamp non lo cattura, e il clock entra in un ciclo limite permanente `0.994 ↔ 1.006`.

Conseguenze, tutte invisibili a `tsc` e tutte **solo sulla persona di mezzo**:
- la trasformazione del gruppo non è mai neutra — Michele resta disperso, dollyato e ruotato mentre gli altri due si fermano esatti;
- `uMorph2` esce da zero a frame alterni → sfarfallio su uno stadio che deve essere fermo;
- `setMorph` scrive ogni frame → GSAP ridisegna tutta la coreografia ogni frame mentre l'utente legge;
- sotto i 30fps lo stadio sfarfalla fra "B" e "morphing" e il gate assorbe ogni gesto → **utente intrappolato**.

**Soluzione**: limitare verso il **bersaglio** (`Math.min(cur + step, target)` / `Math.max(cur - step, target)`), non verso i bordi.

### 10. `uMorph` deve toccare esattamente 1.0 prima che `uMorph2` lasci lo 0

Il kernel concatena il blend: `target.assign(mix(target, hC, m2))`. Se le due gambe avanzano insieme il risultato è `mix(mix(A,B,s), C, s)` — una scorciatoia che taglia l'angolo A→C e **non forma mai Michele**.

Entrambe le uniform derivano da **un solo scalare di progresso** `0..MORPH_MAX`: così la sequenzialità è strutturale, non una questione di disciplina.

> **Non copiare l'hero**: `HeroTextParticles` apre la seconda gamba a `>= 0.95`, sovrapponendo il 5%. Invisibile su granelli di testo astratto; su un volto taglierebbe l'angolo in modo visibile.

### 11. La lista celle è un'UNIONE, e lo stride è un dirupo intero

Una cella entra se **almeno un** ritratto la inchiostra; gli altri la emettono comunque a ink 0 e il renderer la collassa. Quindi aggiungere una persona **fa solo crescere** il conteggio, mai calare la copertura.

`stride = ceil(sharedCells / maxCount)` è un **gradino intero**: una cella oltre il tetto e la nuvola si **dimezza per tutti e tre i volti**. Non sembra rada — `spacingDev` ingrandisce automaticamente i dischi, quindi si legge come **volti uniformemente morbidi**. È la regressione che passa inosservata.

Misurato in browser: **51.751 celle, stride 1**, tetto a 60.000.

> **Il port offline sottostima.** `sampler_port.py` aveva predetto 47.636 usando un fattore 0.931 calibrato sulla coppia A+B: sul terzo ritratto, più contrastato, **non ha retto** (−8%). Usalo come ordine di grandezza, poi **misura in browser** e decidi lì.

### 12. Un vestito scuro si corregge nell'ASSET, non con una soglia

`ink` è distanza dallo sfondo misurato, non oscurità. Camicie bianche su muro chiaro stanno a ink ≈ 0.03 e si dissolvono nel nulla sotto il mento — è per quei soggetti che `fadeStart 0.62 / fadeSpan 0.32` è stato tarato. La giacca blu di Mattia satura a 1.0: lo stadio C sarebbe stato **una testa sopra un blocco scuro solido** mentre A e B sfumano nel vuoto.

Nessuna soglia lo risolve: giacca e barba saturano identiche (vedi contratto 2). Un `fadeStart` per-ritratto romperebbe l'invariante della griglia condivisa.

**Soluzione**: `mattia-headshot.webp` porta una sfumatura verticale del busto verso il bianco dello sfondo. Celle inchiostrate 52.723 → 38.387, in famiglia con le 38.555 di Alessandro e le 38.833 di Michele.

> Usa una **PCHIP monotona con derivata nulla al mento**. Il primo tentativo sfocava un profilo lineare e lo tagliava netto: quel gradino lasciava **una riga orizzontale visibile attraverso le spalle**. Il raccordo C1 è strutturale, non estetico.
> Si lava **solo** il file `-headshot`, che è consumato esclusivamente dal sampler. Il poster DOM (`founders[].image`) resta la foto pulita.

---

## Aggiungere un quarto ritratto — la sequenza corretta

Nell'ordine. Saltare il passo 1 è come è nato il difetto 7.

1. **Prepara l'asset** 1200×1800, inquadratura allineata: larghezza cranio ≈ 559px, top testa ≈ y 306. Se il soggetto veste scuro, applica la sfumatura del busto (contratto 12).
2. **Misura offline** con `.trellis/tasks/06-06-*/research/portrait-calibration/sampler_port.py` — è il port fedele di `readGrid`/`emit`/unione/stride. Verifica che le celle inchiostrate del nuovo ritratto siano in famiglia (~38–42k) e stima l'unione. **Ordine di grandezza, non verità** (contratto 11).
3. **Verifica il budget di binding PRIMA di scrivere il wiring** (contratto 7). Con l'impacchettamento a `vec4` un quarto target costa una binding di storage. Ma il **compute** è a 8 su 8: un quarto `home*` è già cablato (`homeD`), un quinto no.
4. **Estendi la catena colore/ink**: oggi arriva a C. Un quarto target di posizione senza `colorsD`/`sizeD` renderizza la quarta faccia come **stencil a forma di Mattia** — `MORPH_MAX` è cappato a `WIRED_TARGETS = 3` proprio per impedirlo.
5. **Aggiungi l'entry** in `founders.ts` con `anchor` = slug dell'asset (`/founders/<anchor>-headshot.webp`) e `kind` corretto. Store, gate, contatore e griglia `/about` derivano tutti dal conteggio: non ci sono costanti parallele da aggiornare.
6. **Misura in browser** e aggiusta il tetto (contratto 11).
7. **Verifica in una sessione WebGPU reale.** Typecheck non vede nessuno dei contratti 7–12.

---

## Come verificare (handle di debug)

In dev, sulla home, a sezione founder montata. **La sezione deve essere davvero in vista**: fuori schermo l'isola fa early-return sul culling prima del clock, e ogni misura risulta ferma a zero.

```js
__sersanFounderMorph.getSampler()   // griglia, celle, stride, ink medio + meanInkSubject + inkCut
__sersanFounderMorph.getUniforms()  // uAssemble, uMorph, uMorph2, uMorph3, progress, pointSize
__sersanFounderMorph.getGate()      // { engaged, stage, stageIndex, morphTarget, armed, accum }
__sersanFounderMorph.setStage("C")  // salto deterministico
__sersanFounderMorph.playMorph(1)   // avanza esattamente UNA gamba
__sersanFounderMorph.simulateGesture('down')  // gesto discreto sul gate
```

**Le due asserzioni che contano:**

```js
// 1. sequenzialità — parcheggiato su B, su frame CONSECUTIVI:
//    progress === 1, uMorph === 1, uMorph2 === 0  (esatti, non approssimati)
// 2. il gate NON rilascia sui nodi interni:
//    gesto down su A → morphTarget 1, engaged ANCORA true
//    gesto down su B → morphTarget 2, engaged ANCORA true
//    gesto down su C → engaged false, la pagina riprende a scorrere
```

**Trappola di nomi**: `__sersanFounderMorph` (singolare) è l'handle di tuning/gate; `__sersanFoundersMorph` (plurale) è lo **store**. Una lettera di differenza.

**Trappola di stato**: `globalThis.__sersanFoundersMorph ??= …` non ricrea mai lo store una volta impostato. Dopo un cambio di forma dello store in una sessione dev viva, l'isola continua a leggere la vecchia istanza. **Ricarica forzata prima di fidarti di qualunque misura.**

**Trappola di test**: teletrasportare lo scroll con `window.scrollTo` non fa agganciare il gate — il rilevamento di attraversamento vuole movimento incrementale. Usa `__lenis.scrollTo(target, {duration})`. E l'intro cinematografica blocca lo scroll finché non premi **ESC**.

Criterio di accettazione dichiarato dal capo: **il volto deve vedersi bene ed essere ben definito.** La camicia è sacrificabile. Giudica ingrandito sul volto.

---

## Aperto

### 1. I chip "SHIPS WITH" di Mattia — MANCANTI, in produzione
La sua card **non mostra affatto** il blocco (non è un vuoto, il blocco non viene renderizzato) mentre Alessandro ne ha 6 e Michele 12, affiancate su `/about`. Il suo export LinkedIn non elenca linguaggi o framework, quindi non erano derivabili e non sono stati inventati.
→ **Serve la lista reale dal capo.** Se non ha ancora uno stack di produzione difendibile, l'assenza è più solida di una lista di riempimento: il sito si vende su "verifiable, not vibes".

### 2. Alone di muro residuo sui ritratti (misurato, giro precedente)
Il 12,1% delle celle tenute sono muro o camicia: 4.446 celle nella sola fascia delle spalle di Alessandro. Non rimisurato dopo la sfumatura di Mattia (che ha toccato solo il suo asset).
→ Seconda passata di flood fill a tolleranza più larga, seminata solo da celle già sfondo, oppure dilatazione morfologica di `bgMask`. **Non** una soglia cromatica.

### 3. Mobile mai verificato
Vale ancora. La finestra di Chrome dell'automazione ignora il ridimensionamento e il tab finisce spesso `hidden` → rAF strozzato, ogni misura di tempo falsa.
→ **A mano.** In particolare il contratto delle due altezze su `SignatureLine`, **invisibile su desktop** dove i due valori coincidono.

### 4. Decisioni di copy lasciate al capo
- `footer.tsx:79` — link "Founders"/"Fondatori" → `/about`, che ora mostra tre persone. Candidato: "Team".
- `llms.txt` — dice ancora "founders, thesis".
- `roleIt` di Mattia è "Software Engineer" non tradotto. Coerente con la convenzione di casa (si traduce solo il qualificatore: "CPTO · Lead Tecnico") e il suo ruolo è tutto titolo.
- Le clausole "no layer of juniors" / "no junior bench" (5 punti, incl. l'H1 di `/consulting`) sono **deliberatamente intatte**: Mattia è **solo interno**, quindi restano vere — parlano di chi sta sull'engagement del cliente. **Se venisse messo su lavoro clienti diventano tutte false insieme.** Riformulazione pronta: *"No account layer. No team you didn't meet."*, e `services-section.tsx:629` da "delivered by" a "led by senior engineers".

### 5. Residui minori
- `sectionProgress` in `sectionStore` usa una sola altezza per mappatura e centratura: errore ~45px **solo mobile**.
- ~~Predicati backend allineati a mano~~ → **chiuso**: `FounderPortraitMorph` ora importa `backendOf` da `createRenderer` invece di duplicare la sonda.
- `DriftParticles`: un ridimensionamento in sola altezza non ridistribuisce la polvere lungo Y (scelta deliberata).
- `G_MAX_ENGAGE_MS` può scattare a metà gamba: `release()` non tocca `morphTarget`, quindi l'isola continua ad auto-riprodurre mentre la pagina scorre via. La gamba però **completa su uno stadio bloccato e coerente**, si auto-guarisce al prossimo `engage()`. Deliberatamente non corretto.
- `STAGE_ORDER` ha ancora 4 voci mentre `WIRED_TARGETS` è 3: inerte, ma sono due costanti che esprimono idee sovrapposte.

---

## Nota sul flusso di lavoro

Il repo è a **un solo branch** (`main`, default su GitHub) e **Vercel fa deploy automatico da lì**: ogni push va in produzione. Policy: **push solo su richiesta esplicita**.

**La lezione di metodo di questo giro**, che vale più di qualunque singolo fix: l'analisi è stata robusta — cinque lettori specialisti, un piano sintetizzato, tre critici che hanno riportato il sampler in Python e **misurato gli asset veri**, poi sei lenti di review con una passata di confutazione che ha scartato 11 candidati su 29. Ha trovato cose vere e non ovvie, incluso il P0 del contratto 9.

E ha mancato completamente il difetto che rompeva tutto (contratto 7), perché **tredici agenti hanno ragionato sulla correttezza e nessuno sul budget di binding del device**. `tsc` passava pulito e la relazione era convincente.

> Su questa superficie, "typecheck verde + review approfondita" **non è evidenza che funzioni**. Apri il browser e guarda la console.

---

## Quarto target — Alberto Tuveri (2026-08-27)

**Ordine rail e `/about`:** Alessandro (A) · Michele (B) · **Alberto (C)** · Mattia (D). Alberto è `kind: "team"` (`anchor: "alberto"`), quindi `/contact` e `/start` (che iterano `coFounders`) mostrano ancora **due** persone. `/about` dice "Four operators." / "Quattro operatori." e "Two founders, two engineers."; la griglia team resta 2 colonne anche a `lg` quando `founders.length % 3 === 1` (2×2, niente card orfana).

**Cosa è cambiato nel motore** (`src/webgl/gpgpu/gpgpuNodeSim.ts`):
- `PortraitMorphOpts.colorsD` / `sizeD` (opzionali); gate `hasPortraitD = hasPortraitC && !!colorsD`, `hasPortraitSizeD = hasPortraitD && hasPortraitSizeC && !!sizeD`.
- `tintDBuffer = instancedArray(packTint(colorsD, sizeD), "vec4")` letto con **`.element(instanceIndex)`** nel vertex stage (contratti 7/8) — mai `.toAttribute()`.
- `portraitMorph3Expr` = esatto specchio di `m3` del kernel (`morph3N − hash·0.55`, finestra 0.45, `smoothstep`), espressione autonoma (contratto 3).
- `portraitInkExpr` e `portraitColorExpr` sono catene a 4 vie `mix(mix(mix(A,B,m1),C,m2),D,m3)`, ogni gamba dietro un gate di build: i grafi N=2 e N=3 sono byte-identici a prima; l'hero (portrait undefined) è intatto.
- `FounderPortraitMorph.tsx` passa `colorsD: pts[3]?.rgb`, `sizeD: pts[3]?.ink`; `homeD = homes[3]` è ora un target vero; `applyMorph` scriveva già `uMorph3 = clamp(p − 2)`.
- `foundersMorphStore.WIRED_TARGETS = 4` → `MORPH_MAX 3`, `STAGE_TOTAL 4`, contatore `01/04…04/04`; il warning dev di troncamento non scatta più.
- Touch morph (`founders-rail.tsx`): `hideMedia/restoreMedia` ora agiscono solo su `articles.slice(0, STAGE_TOTAL)` — se in futuro il team supera `WIRED_TARGETS` le card troncate tengono la foto invece di diventare rettangoli vuoti.

**Budget di binding (contratto 7), tabella aggiornata:**

| build | vertex buffer | storage in vertex |
|---|---|---|
| ritratto, 3 target | 4 di 8 | 3 di 8 |
| **ritratto, 4 target (ora)** | **4 di 8** | **4 di 8** |

Il compute resta a **8 su 8** (position, velocity, homeA–homeD, start, delay). **Un quinto ritratto è impossibile senza ri-architettare il kernel** (impacchettare le home in meno buffer): `STAGE_ORDER` ha quattro lettere, `WIRED_TARGETS` non va mai alzato sopra `STAGE_ORDER.length`, e una quinta entry in `founders.ts` degrada a troncamento con warning dev.

**Asset — PLACEHOLDER.** `public/founders/alberto-tuveri.webp` e `alberto-headshot.webp` (1200×1800) sono oggi una card monogramma sullo sfondo grigio studio, in attesa della foto vera. La foto vera deve rispettare il contratto di inquadratura: cranio ≈ 559px di larghezza, top testa ≈ y 306, sfondo chiaro e uniforme negli angoli alti (il sampler misura lì il colore di sfondo), sfumatura del busto (contratto 12) se veste scuro; si lava **solo** il file `-headshot`.

**TODO misura (contratto 11), da fare quando arriva la foto vera:** su Chrome WebGPU, home, sezione in vista, hard reload: `__sersanFounderMorph.getSampler()` → `stride` DEVE essere 1; `sharedCells` atteso ~57–62k contro il tetto `MAX_COUNT_BY_TIER.full = 60000` → alzare il tetto o ridurre `GRID_W/GRID_H` di `sqrt(wanted/measured)`. Su telefono: `lite` 20000 vs stima ~20k → probabilmente abbassare `TOUCH_GRID_SCALE` (0.58 → ~0.53). Scrivere i numeri misurati in `FounderPortraitMorph.tsx` (`MAX_COUNT_BY_TIER`).

**Verifica WebGPU ancora da fare (il typecheck non la vede):** console senza righe `CreateRenderPipeline` / `Vertex buffer count`; parcheggiato su C su frame consecutivi `getUniforms()` → `progress 2, uMorph 1, uMorph2 1, uMorph3 0` esatti; su D → `uMorph3 1`; `simulateGesture('down')` ×4 percorre A→B→C→D e al quarto rilascia; faccia D non stencil a forma di Alberto.

**Gate di merge (revisione 2026-08-27, sera).** Le due metà di questo lavoro hanno rischi diversi e vanno tenute separate (dossier §7d):
- *Motore* (`gpgpuNodeSim.ts` gamba D, `FounderPortraitMorph.tsx` `colorsD/sizeD`, slice `hideMedia`): byte-identico a N=3 finché `founders.length === 3`, quindi può andare in produzione da subito.
- *Contenuto* (entry Alberto in `founders.ts`, `WIRED_TARGETS = 4`, i due asset `alberto-*.webp`): OGGI entrambi gli asset sono lo STESSO file placeholder (md5 `5734284b…`, card monogramma). Finché non arriva la foto vera il morph campionerebbe un monogramma come target D e `/about` + rail mostrerebbero la card monogramma. Non pubblicare questa metà prima che la coppia di headshot reali sia in `public/founders/` e la checklist qui sopra sia stata eseguita su Chrome WebGPU dal PC dell'owner (l'estensione Chrome usata dagli agenti non raggiunge `localhost:3000`: ERR_CONNECTION_REFUSED su localhost, 127.0.0.1 e IP LAN, quindi la verifica NON è stata fatta da agente). Per tenere ferma la metà contenuto: togliere l'oggetto Alberto da `founders.ts`, riportare `WIRED_TARGETS` a 3, non aggiungere i due webp.

---

## Depth matte + ritratto illuminato + navigazione a frecce (2026-08-27, pomeriggio)

**Il problema che ha aperto il giro.** Lo screenshot del capo: volti "a mezzatinta" con zone VUOTE (cuoio capelluto, fronte, guance). Causa misurata nel codice, non nella maschera: `ink` era la DISTANZA CROMATICA dal muro (contratto 12) e pilotava la dimensione del disco → la pelle illuminata, dello stesso colore del muro, finiva a ink ≈ 0 → disco sub-pixel → knee alpha → `Discard`. Nessuna soglia poteva risolverlo (contratto 2: colore non separa muro e cranio).

**Riferimento.** `lusion.co/about` TEAM, reverse completo in `docs/recon-2026-08-27/lusion-team-reverse.md`: la testa è una **scansione 3D** (`team/<id>.buf`: 8192 punti blue-noise sulla superficie frontale, normale + shade precalcolati), resa come quad instanziati con DoF bokeh, luce = puntatore, scanline, glitch, additive + bloom. Ogni punto si disegna SEMPRE; il tono viene da `shade × normale·luce`, mai dalla dimensione.

**La soluzione (nostro equivalente 2.5D, senza scansione):**
1. `scripts/generate-founder-depth.mjs` → `public/founders/<anchor>-depth.webp` (Depth Anything V2 **base**, offline, 600×900, lossless, BIANCO = VICINO, ~48 KB). Rilanciare quando cambia una foto o entra una persona. Il sito non esegue mai il modello.
2. `sampleImagePoints.ts`: `samplePortraitSet(images, spec, depths?)`. Con la depth twin **presenza** = `smoothstep(depthCut ± depthEdge)` (istogramma bimodale: muro ≤ 0.19, busto ≥ 0.35 → `depthCut 0.3`) **AND** flood fill dal bordo (rimuove l'alone sfocato del modello) × dissolvenza verticale. `ink` è ~1 in tutto il soggetto → copertura uniforme per costruzione. `z` = depth reale (blur 3×3), `nrm` = gradiente della stessa mappa. Senza twin: path legacy byte-identico.
3. `gpgpuNodeSim.ts` (solo path portrait, hero intatto): con `normalsA/B` il tint vec4 diventa `[rgb24, nx, ny, ink]` (rgb sRGB 8 bit impacchettato in UN float esatto) → **zero binding nuovi** (contratto 7 invariato: 4/8 storage in vertex, 8/8 in compute). `PortraitLook` → uniform live: `ambient, diffuse, rim, mono, monoTint, focusDist, focusRange, bokeh, scan, photo, frontLo/Hi`, `uLightPos` (spazio gruppo, guidata dal puntatore), `uRelief` (kernel: moltiplica la z delle home; gate `hasPortrait`). Tono = `mix(chroma·lumC, tint·lumC, mono) × min(ambient + diffuse·wrapLambert + rim, 1) + scanline`, energia bokeh conservata.
4. `FounderPortraitMorph.tsx`: carica le twin, passa normali e look, `MAX_COUNT_BY_TIER.full 80000` (unione misurata **46.5k, stride 1** — cresce con la presenza), `TOUCH_GRID_SCALE 0.52`, `fadeStart 0.55/0.3`, blending **additive** + `DEFAULT_EMISSIVE_LIT 0.72`, disco ≈ 1.15× il passo (`DISC_PITCH_LIT`) così i punti restano separati (nuvola, non foto fusa). **`REST_RELIEF 0.2`**: il rilievo proiettato è basso a riposo e si apre a 1 a metà gamba (`uRelief = 0.2 + 0.8·env`).

### Contratti nuovi (13–16)

13. **La griglia frontale regolare "pettina" sotto prospettiva se il rilievo proiettato è alto.** Misurato: pulito a ≤ 0.15–0.2 del rilievo pieno, strisce evidenti a 0.55 (rampe ripide orecchio/mascella: lo spostamento laterale per cella supera il passo). Il volume a riposo lo danno le **normali** (illuminazione), non la z. Non alzare `REST_RELIEF` senza guardare il lato destro del viso ingrandito.
14. **La luce del puntatore non deve mai attraversare l'asse di vista.** Con la key quasi frontale ogni normale satura insieme, i dischi additivi sommano e il bloom (soglia 0.8) trasforma il busto in una macchia bianca. Per questo `LIGHT_SWING` è piccolo (3.5/2.5), `LIGHT_BASE` obliqua e il termine luce è **cappato a 1** nello shader (la scanline sale sopra il cap).
15. **Il layout del tint è per BUILD, non per target.** Se manca anche UNA depth twin, `lit` è false per tutti (path legacy). Non mischiare i due layout.
16. **`photo` comprime la luminanza della foto** (0.35): a 1 la camicia bianca resta 2× la pelle e domina; a 0 il tono è pura geometria. Il crominanza resta sempre.

### Navigazione (richiesta del capo, stesso giorno)

Il **gate scroll-jack è rimosso**: la pagina non viene mai fermata (`lenis.stop()` sparito, nessun listener wheel/touch in capture, niente snap barrier). Si cambia persona con i pulsanti **← →** nel chrome (`[data-founders-prev]` / `[data-founders-next]`, `aria-disabled` agli estremi) o con i tasti ← → quando la sezione è centrata e nessun campo ha il focus. `simulateGesture('down'|'up')` = next/prev. `store.pinned` ora significa solo "modo morph DOM attivo". A riposo il busto **segue il puntatore** (`REST_PARALLAX_YAW 0.16 / PITCH 0.1`, gated da `hover`) e la luce con lui — il "movimento 3D come Lusion".

### Handle nuovi

`__sersanFounderMorph.setLook({...})` / `getLook()` (include `lit`, `depthTwins`, `lightPos`), `setBlend('additive'|'normal')`. `setDepth(v)` scala il rilievo pieno; `setEmissive` resta.

### Secondo giro (sera): composizione Lusion, cursore, auto-avanzamento, definizione

Richiesta del capo dopo il primo giro: "frecce come Lusion col cursore, profili molto più grandi, volti riconoscibili, e i layer di sfondo — ma non copiati, attinenti al nostro sito".

- **Composizione** (`founders-rail.tsx`, ramo `canMorph`): palco `[data-founder-stage]` assoluto, `h-[min(74vh,58rem)]` 3:4 a `left 7%`; contatore mono `[[ 01 / 04 ]]` in alto a sinistra; eyebrow + titolo compatto in alto a destra; per persona UN overlay a tutto frame (`copyRefs[i]`) con nome/ruolo/hairline in basso a sinistra e bio/chip/LinkedIn in basso a destra (`:scope > div > *` = i figli di ENTRAMBI i blocchi, stessa coreografia di prima). I pulsanti ← → restano, piccoli, in basso al centro (tastiera/AT).
- **Head fit** (`FounderPortraitMorph.tsx` `HEAD_FILL 0.66 / HEAD_FILL_Y 0.78`): con l'ink-presenza l'estensione piena è sempre il frame (spalle), quindi il sampler misura anche `headHalfExtentX/Y` sulle sole righe sopra le spalle (`HEAD_ROW_LIMIT 0.6`) e l'isola adatta la TESTA al palco; il busto deborda e si dissolve — la composizione di Lusion.
- **Definizione**: griglia `380×532` (unione misurata **80.145 celle, stride 1**, tetto 100k, 58 fps a riposo su questo laptop), `DISC_PITCH_LIT 1.3`, `DEFAULT_EMISSIVE_LIT 0.62`, look `photo 0.75 / mono 0.45 / ambient 0.06 / diffuse 1.0 / rim 0.45` — A/B dal vivo: 1.0× passo = sabbia, 1.15 = retino, 1.3 = si legge il volto (Michele, Alessandro, Mattia riconoscibili; Alberto resta il monogramma).
- **Cursore** (`[data-founders-cursor]`, logica nel tick): disco accento 96px che segue il puntatore dentro il palco (damp 14/s), scala con la velocità (`1 + 0.9·min(1, v/900)` × backOut all'ingresso), freccia che ruota 0→180° con backInOut per lato del centro del palco; `cursor: none` sul palco; **click sul palco = next/prev per lato**; tasti ← → invariati.
- **Auto-avanzamento** (`AUTO_ADVANCE_MS 7000`): dwell solo con sezione centrata, cloud vivo, stadio bloccato e puntatore NON sul palco; l'hairline sotto il nome è il timer (Lusion `faceIndexTimer`); alla fine riavvolge A ← D sul clock dell'isola (catena lineare: 3 gambe visibili); ogni passo manuale azzera.
- **Parallasse a riposo** (`REST_PARALLAX_YAW 0.16 / PITCH 0.1`, gated da `hover`) + luce sul puntatore: il "movimento 3D col cursore".
- **Licenza**: le twin sono generate con Depth Anything V2 **small (Apache-2.0)**; base/large sono CC-BY-NC — mai in produzione (nota nello script).
- **Layer "attinenti"** (montati in `Scene.tsx` con 2 righe dopo `<FounderPortraitMorph/>`, auto-gate su `pinned` + WebGPU vero, `renderOrder −1`):
  - *Telemetry rain* (`src/webgl/team/TeamGlyphRain.tsx` + `telemetryRainNodeMaterial.ts` + `telemetryTokens.ts`): colonne di token di produzione — `p99 38ms`, `evals 94/100`, `kill-sw ON`, `03:02 on-call` — che scorrono come un log tail, rari token in ciano che accendono il bloom. Handle `__sersanTeamTelemetry`. Il capo l'ha approvata ("il bg dietro era bello"). **Perf**: la prima versione a 4 layer costava ~35 ms/frame → 2 layer / 23 colonne / quad tagliati al frame / niente mip-bias → 60 fps a DPR 1. Default dal vivo: `intensity 0.16, accentHdr 0.9, rare 0.03, speed 0.7, density 0.75`. Regola: muro tenue, il testo a destra va letto senza sforzo.
  - *Astrolabio della persona* (`src/webgl/TeamOrbit.tsx` + pool di 24 `[data-orbit-label]` nel ramo canMorph): tre anelli 3D inclinati e in precessione attorno alla testa; lungo di essi orbitano i DATI VERI di chi è sul palco (`founders.ts`: anello interno `previouslyAt`/`badges`, medio `expertise`, esterno `stack`), ogni satellite = puntino HDR + scia sull'anello + etichetta mono DOM proiettata; dietro la testa si attenuano; etichette nascoste quando cadono sul volto (`HEAD_MASK_*`); inclinano col puntatore come la testa. Cambio persona: inviluppo `1 − smoothstep(0.3, 0.7, |morph − k|)` → i satelliti volano dentro/fuori dal centro insieme al morph. Materiali three "classici" (Line + InstancedMesh), zero binding condivisi col morph. Handle `__sersanTeamOrbit` (`setIntensity/Speed/Radius/Labels`). **Sostituisce** il "loss landscape" a curve di livello, rifiutato dal capo perché troppo Lusion (file cancellati; la ricetta resta in `docs/recon-2026-08-27/`). Revert = togliere la riga in Scene.tsx + `TeamOrbit.tsx` + il pool di etichette.

### Aperto

- Alberto: headshot placeholder → la sua depth twin è quella del monogramma. Rigenerare con `node scripts/generate-founder-depth.mjs alberto` appena arriva la foto vera, poi ri-misurare `getSampler()` (stride 1, tetto 100k).
- Touch/lite: `TOUCH_GRID_SCALE 0.45` non misurato su telefono; il ramo nativo/touch non ha cursore né auto-avanzamento (solo desktop pinned).
- La composizione è tarata su ≥1024×780 (`roomy`); sotto si va sulla rail orizzontale come prima.

