# HANDOFF — ritratti a particelle dei fondatori (morph a 3 target), riconciliazione rami, hero

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
