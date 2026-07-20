# HANDOFF — ritratti a particelle dei fondatori, riconciliazione rami, hero

> Documento per **riprendere da una nuova sessione o da un altro PC**. Aggiornato: **2026-07-20**.
> Le sessioni Claude Code e la memoria NON viaggiano tra macchine: viaggia solo il **repo git**. Questo file è committato.

## Come riprendere

1. `git pull` su **`main`** — tutto è lì e **pushato** (`origin/main` = `5562211`).
2. Apri Claude Code nella cartella e come primo messaggio: *"Leggi `HANDOFF_FOUNDER_MORPH.md` e `.trellis/spec/frontend/webgl-island-guidelines.md`, riprendiamo da lì."*
3. I **contratti tecnici** (quelli che impediscono di rifare gli errori) stanno in
   `.trellis/spec/frontend/webgl-island-guidelines.md` — leggerlo **prima** di toccare il morph.

---

## Stato attuale

**Tutto su `main`, pushato, deployato da Vercel.** Build di produzione verde (40 route), `npx tsc --noEmit` pulito.

Commit di oggi (dal più recente):

| commit | cosa |
|---|---|
| `5562211` | hero: marchio raddrizzato + 3 varying accese |
| `07ba3be` | merge che preserva la storia dei 9 commit |
| `b26e82d` | **riconciliazione** dei due rami |
| `4abdabc` | maschera di sfondo **spaziale** (flood fill dal bordo) |
| `065104c` | compensazione sotto-pixel |
| `60075f4` | rimozione dei pavimenti su dimensione/alpha |
| `164bb35` | spec: trappola delle varying TSL |
| `56b77c1` | fix varying colore/alpha del ritratto |
| `6f75735` | spec: contratto di campionamento immagine→particelle |
| `e6b160e` | **riscrittura del sampler** |
| `ef05a37` | 7 regressioni introdotte dal round precedente |
| `69e49a6` | 3 bug segnalati + 20 difetti verificati (scroll/camera/isole) |

Tag di sicurezza: **`local-morph-work-20260720`** = i 9 commit prima della riconciliazione.
Branch `merge/founder-morph-reconcile` = la riconciliazione (già fusa in `main`, cancellabile).

---

## Cosa è successo, in breve

Oggi esistevano **due implementazioni parallele** dei ritratti a particelle: 21 commit già pubblicati e 9 locali. Un'analisi comparativa (42 agenti, ogni conclusione passata a un verificatore avversariale) ha stabilito la divisione applicata:

- **il sampler nuovo vince** sul morph;
- **la presentazione precedente vince** su tutto il resto.

La base è quella pubblicata: i 21 commit sono intatti, incluso il rebrand blu. I fix di oggi sono stati **riapplicati file per file**, non sovrascrivendo — perché il ramo locale era più vecchio su diversi file e prenderlo intero avrebbe cancellato in silenzio la banca della camera, la testa a cometa e il nuovo store dell'hover.

---

## I contratti da NON re-imparare

Questi sono costati rilavorazione vera. Sono in spec, qui il riassunto.

### 1. Il tono viene dalla DIMENSIONE, non dal numero di particelle

Il vecchio sampler estraeva a sorte **con reimmissione**: misurato, 26.357 particelle su 42.000 (63%) duplicate su celle già coperte, e 1.902 celle (11% del volto) mai coperte. Erano i buchi. E le celle mai estratte non erano casuali: il peso era proporzionale alla luminosità, quindi mancavano **le scure** — sopracciglia, ciglia, narici, labbra. Esattamente ciò che rende leggibile un volto.

**Modello attuale**: una particella per cella su griglia regolare (290×405 → 45.545 celle condivise, stride 1), tono portato dalla dimensione via il canale `ink`. Riferimento: `.refs/interactive-particles` (`psize *= max(grey, 0.2)`).

> **Il conteggio segue il sampler, mai il contrario.** Se serve ridurre, si usa uno stride uniforme fisso. Mai un sottocampionamento casuale (reintroduce i grumi) e **mai** padding per duplicazione.

### 2. Soggetto e sfondo si separano SPAZIALMENTE, mai per colore

Il cuoio capelluto rasato e illuminato di Michele **ha lo stesso colore del muro bianco**. Idem la camicia. Nessuna soglia per-pixel — luminanza, saturazione, distanza cromatica — può distinguerli. Ci sono cascato **due volte** (`lumCeil`, poi il noise gate): entrambe le volte ha bucato la testa.

**Soluzione**: lo sfondo è la regione **connessa al bordo**. Flood fill dal bordo superiore e dai lati alti, tolleranza `BG_FILL_TOL` 0.055, limite di riga `BG_FILL_ROW_LIMIT` 0.62.

> Il limite di riga **non è cosmetico**: la camicia tocca il bordo inferiore, e tra camicia bianca e muro bianco c'è solo una tenue ombra di spalla. Seminando dal basso il riempimento **trabocca nel busto e lo cancella**.

### 3. La trappola delle `varying` di TSL

```ts
const v = float(0).toVar();          // FUORI dalla Fn
material.vertexNode = Fn(() => { v.assign(expr); return clip; })();
const vF = varying(v);               // ← legge SEMPRE lo 0 iniziale
```

three antepone l'assegnazione di ogni varying **in cima al `main()` del vertex**, prima che il corpo della `Fn` venga eseguito (`VaryingNode.js:162-182` → `NodeBuilder.js:2572-2600` → `GLSLNodeBuilder.js:1478-1497`). Spostare l'assegnazione dentro la `Fn` **non serve a niente**.

**Corretto**: passare l'espressione autonoma direttamente a `varying(expr)`.

> **Come si riconosce**: se un consumatore di uno scalare per-particella funziona e un altro no, guarda se quello che funziona lo legge nel **vertex** e quello rotto passa da una varying. Quell'asimmetria identifica il bug subito.
> È insidioso perché **degrada in silenzio**: una varying il cui valore iniziale è innocuo disattiva semplicemente una funzionalità, senza errori.

### 4. Sotto i ~2 pixel la dimensione smette di funzionare

`Scene.tsx` monta il Canvas con `antialias: false`. Un quad più stretto di un pixel dipinge quel pixel **a piena intensità** o lo manca del tutto: la copertura non attenua. Nella fascia inchiostro 0,14–0,35 i dischi stanno a 1,4–2,9 px e il tono non si controlla più con la dimensione.

**Soluzione**: compensazione di copertura — `alpha *= cov²` con `cov = clamp(diametro / max(1.25, 0.35·spacing), 0, 1)`, e `dist` portato come seconda varying (approssimare con `CAMERA_Z` costante dà fino al ±18% di errore sul dolly).

> **Trappola di metodo**: le anteprime su canvas 2D **non possono rivelare questo difetto**, perché il canvas fa antialiasing e il render no. Mi ha ingannato una volta: l'anteprima era pulita e il sito sfrangiato. Verifica sul render reale.

### 5. La banca della camera è giusta per la linea, sbagliata sul marchio

`camera.rotateZ` ruota **tutto** lo strato WebGL. Ogni curva di route apre a `x +1.15…+1.25` e vira a `x ≈ −1.2` attraversando l'hero, quindi il rollio andava a fondo corsa (2,64°) dal primo fotogramma: **ogni hero del sito era storto**, non solo la home.

Due parti, servono entrambe:
- rampa `rollGate = smoothstep(clamp(scrollPxNow/ih))` che moltiplica il **target** (smorzamento e clamp restano validi);
- il **marchio compensa**: `SignatureLine` pubblica il rollio applicato in `textMorphStore.camRoll`, `HeroLogo` lo legge con `getState()` e applica `setFromAxisAngle(camera.getWorldDirection(), -camRoll)` al gruppo esterno.

> La sola rampa **non basta**: il marchio resta a schermo fino a ~1600px mentre la rampa completa a ~935, quindi il logo **ruota progressivamente** sotto gli occhi. Un logo che ruota è peggio di uno storto fisso.
> Si pubblica una variabile locale `appliedRoll`, **non** `rollCurrent.current`: quel ref sopravvive ai cambi di tier e lascerebbe un angolo fantasma su lite, dove nessun `rotateZ` viene eseguito.

### 6. Verificare sempre il round di fix dopo un round di fix

I 20 fix di `69e49a6` sono stati scritti da agenti in parallelo su file disgiunti: nessuno vedeva le modifiche degli altri. Una passata avversariale sul **diff** ha trovato **7 regressioni**, di cui 2 gravi (Tab che espelleva l'utente da tastiera, altezza runway che tracimava sul mobile). Una terza — `backendOf` che testava `isWebGLBackend === false`, un flag che three non imposta mai — l'ho intercettata a mano nel browser: avrebbe disattivato il morph su **tutte** le macchine.

Typecheck e build **non intercettano** questa classe di errori.

---

## Aperto — con il prossimo passo concreto

### 1. Alone di muro residuo sui ritratti (misurato)
Il 12,1% delle celle tenute sono muro o camicia bianca: **4.446 celle nella sola fascia delle spalle di Alessandro**.
→ **Seconda passata del flood fill** a tolleranza più larga, seminata solo dalle celle già marcate sfondo; oppure dilatazione morfologica di `bgMask`. **Non** una soglia cromatica (vedi contratto 2).

### 2. Mobile mai verificato
La finestra di Chrome dell'automazione ignora il ridimensionamento, e il tab finisce spesso `visibilityState: "hidden"` → rAF strozzato a ~1 fps, quindi ogni misura di tempo è falsa.
→ **Va guardato a mano**. In particolare: il contratto delle due altezze su `SignatureLine` (innerHeight per la mappatura Lenis, `size.height` per la centratura del frustum) è **invisibile su desktop**, dove i due valori coincidono.

### 3. fps sulla sezione founder mai misurati
45.545 particelle, salite da 26.000. Non misurabili in automazione per lo stesso motivo.
→ Se calano, le manopole sono `MAX_COUNT_BY_TIER.full` e `discDev`, **non** il ripristino dei pavimenti (erano la causa dell'ombra).

### 4. Residui minori
- `sectionProgress` in `sectionStore` usa una sola altezza per mappatura e centratura: errore ~45px **solo mobile**, solo sui trigger di progresso sezione (non su linea né camera). Richiede un cambio di firma condivisa.
- I predicati del backend sono allineati **a mano** tra `createRenderer.backendOf` e la sonda interna di `FounderPortraitMorph`. Se uno viene toccato senza l'altro, DOM e isola divergono in silenzio. Un helper condiviso lo renderebbe strutturale.
- `DriftParticles`: un ridimensionamento in **sola altezza** non ridistribuisce più la polvere lungo Y (scelta deliberata per evitare una tempesta di riallocazioni). Si chiude con un secondo bucket quantizzato sull'altezza.

---

## Come verificare (handle di debug)

In dev, sulla home, a sezione founder montata:

```js
window.__sersanFounderMorph.getSampler()   // griglia, celle condivise, stride, ink medio
window.__sersanFounderMorph.getUniforms()  // uAssemble, uMorph, uFade, pointSize
window.__sersanFounderMorph.getGate()      // stato della macchina del gate
window.__sersanFounderMorph.simulateGesture('down')  // un gesto discreto, deterministico
window.__sersanFounderMorph.setDepth(0)    // isola gli artefatti da rilievo z
globalThis.__sersanTextMorphStore.getState().camRoll   // rollio applicato (rad)
globalThis.__sersanLineDebug               // camY, uProgress, mapH vs sizeH
```

**Il criterio di accettazione dichiarato dal capo è uno solo: il volto deve vedersi bene ed essere ben definito.** La camicia è sacrificabile. Giudica **ingrandito sul volto**, non sull'inquadratura intera.

> Se il tab risulta `hidden`, l'isola non si costruisce e le animazioni non avanzano. Aprire una **scheda nuova** di solito riporta il focus.

---

## Nota sul flusso di lavoro

Il repo è a **un solo branch** (`main`, default su GitHub) e **Vercel fa deploy automatico da lì**: ogni push va in produzione. Policy: **push solo su richiesta esplicita**.
