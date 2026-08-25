# ROUND 12 — DECISION BRIEF

**HEAD `cc10138`** (verified: `git log --oneline -1`; `24b8f30` is HEAD~1, the last code commit — `cc10138` is docs-only, so every code line number below is valid at both).

---

## THE ONE FACT THAT COLLAPSES THE QUESTION

Everything downstream turns on this, and no dossier stated it plainly:

> **A progressive formation front and a tiled/wrapped field are mutually exclusive.**

Tiling (option ①) or shader wrapping (options ②/③) means **one material, one uniform set, drawn or repeated at several places**. `uBuild`/`uReveal`/`uSurgeT`/`uRingFlash` all live on the material. So every copy forms and flashes **in lockstep** — two synchronised copies of the same forming event read as a photocopy far more loudly than two static copies, because motion is what the eye locks onto (`NeuralLattice.tsx:1281` — `<primitive object={build.links.object}>` cannot even mount twice; `:1282-1287` the particle mesh can).

Conversely, the **five-island architecture already gives five independent formation states for free**: each `NeuralLatticeIsland` (`NeuralLattice.tsx:1352-1376`) calls `createNeuralFieldBuild` in its own effect (`:321`) with its own seed and therefore owns **its own material and its own uniform set** (`neuralFieldCompute.ts:3128` particle material, `:2635` line material).

**Consequence:** the owner's two sentences pull in opposite directions. *"Continua"* pushes toward one endless wrapped field. *"Si compone"* pushes away from it. **Which one is the primary reading is the owner's decision, and it decides the architecture.** That is what PART 2 puts to him — not options ①–④, which are the *consequence* of his answer.

---

# PART 1 — THE CORRECTED FACT SHEET

## 1.1 The angle — what actually shipped

| fact | value | source | status |
|---|---|---|---|
| `angleDeg` | **23.61** | `traverseConfig.ts:274` | ✅ verified this session |
| `R = tan θ` | 0.437078 | `traverseConfig.ts:355-359` | ✅ |
| `d(lateralPx)/d(scrollY)` | `dir·R`, **with or without `compensate`** | `NeuralLattice.tsx:587-598` | ✅ **CORRECTED** |
| lateral run @1280 | 1895 px = 1.48 W | comment `NeuralLattice.tsx:570` | ✅ |
| lateral run @1920 | **2342 px = 1.22 W** | `tan(23.61°)·5358` | ⚠️ depends on unverified `secH` |
| per-island sweep @1920 | **760 px = 0.40 W** | `R·(ih + bandPx)` | ✅ |
| `compensate` | `true` | `traverseConfig.ts:331` | ✅ verified |

**CORRECTION, load-bearing.** The round-12 handoff's claim that *"the net never travels — that is why 23.61° reads like a plain scroll"* is **mechanically false**. `travelledAtCentre` is scroll-independent (a cached rect + a frozen `secTop`), so the compensation subtracts a **constant offset**, never a degree of slope. The traced on-screen angle is `atan(R)` = 23.61° in both regimes.

**What is true instead, and it is the real diagnosis:** with `compensate: true` each island sweeps only `±R·(ih+h)/2` about its own arrival (`±292 px` @1280, stated in the code at `NeuralLattice.tsx:577`). **One island travels 0.40 of a screen width at 1920.** A full screen width of island travel arrives only at **43.7° (1280) / 47.8° (1920)**. That, not the slope, is what makes it read as an ordinary downward scroll — and unlike the slope claim, it is fixed by exactly the same lever: `R` scales the sweep linearly.

**Also corrected:** the "lateral cull fires at 66.7 % of the runway" figure describes the pre-Stage-1.5 build. With the shipped compensation the lateral cull is a **presence clip**, not a runway fraction, and it does not bind until **≈62.4° (1280) / 65.6° (1920) / 26.4° (390)**. The claim that steepening *forces* a wrap or tile is false on both halves.

## 1.2 Legibility — the cap defect

| fact | value | source | status |
|---|---|---|---|
| the cap expression | `cfg.capBody && blk.kind === "body" ? blk.h : 0` | `use-diagonal-traverse.ts:395` | ✅ verified this session |
| authored law (§B2b) | monotone `X_slow`, total plateau drift ≤ `blockH` ⇒ **1.5 em/line ceiling** | storyboard `:203-206` | ✅ |
| shipped implementation | `xSlow = r·α_read·(yc − y)` — **centred**, antisymmetric | `traverse-rate.ts:189` | ✅ both agents |
| shipped ceiling | `2·capPx·tanh(…)` ⇒ **3.0 em/line** | derivation reproduced independently twice | ✅ |
| `xFast ≡ 0` inside the plateau | proved algebraically, confirmed numerically | `traverse-rate.ts:130-190` | ✅ |

**The one-line fix** — `blk.h` → `blk.h / 2` at `use-diagonal-traverse.ts:395` — restores the authored **bound** (not the authored function; the shipped one stays centred). Corrected worst 2-line body with `capPx = h/2`, **1920 series** (the true worst; the earlier table printed the 1280 series under a "worst" heading):

| θ | 23.61° | 28° | 32° | 36° | 45° |
|---|---|---|---|---|---|
| em/line | 1.19 | **1.30** | **1.37** | **1.42** | ~1.49 |

It never fails at any angle in range. **Cost, honestly:** it moves the total excursion by ~−5 % (371 → 352 px @1280) — that is QA gate 3 (`use-diagonal-traverse.ts:600-603`) and every §C0 row's reported number — and it moves `frame.laneCenterPx` (`:466`) and therefore `uCopyLaneC` (`NeuralLattice.tsx:662`). Self-consistently, but the net's copy mask does move. The comment above the line (`:391-394`) still states the old law and must be rewritten.

**⚠️ THE EXPOSURE THE ANGLE QUESTION DOES NOT TOUCH.** The cap only applies to `kind === "body"`. **Display blocks are never capped, at any angle.** At 390×844 the ledger `h3` (e.g. `"01· No evals -> no signal"`) wraps to **two** lines, so §C0's single-line exemption (`storyboard:392`) does not cover it — it is at **1.73 em/line already at the shipped 23.61°** and reaches **2.87 at 36°**. The phone's three ledger headlines are **already past the fail line today**, and no angle choice and no `capBody` change fixes it. It needs a cap on multi-line display type or a mobile type change. **This is an unflagged, pre-existing regression and must be named to the owner, not buried in the angle table.**

**Unverified:** all line counts are a greedy word-wrap at §C0's 0.50 em advance, not `getClientRects()`. The two agents disagree on whether row 02 EN is 2 or 3 lines — and the whole "~24° ceiling" hangs on that one block. **Must be measured in Chrome before the angle is chosen.**

## 1.3 Continuity — where the "3 pezzi" actually comes from

Coverage is **already 100 %** by the census's own predicate. The ladder fit is correct and the census is honest — it measures **rect intersection** (`use-diagonal-traverse.ts:770-777`), which is the same predicate `fitTraverseLadder` was fitted against (`traverseConfig.ts:198`). It cannot fail, and it is measuring the wrong thing.

The defect is that the **luminous** cloud is much smaller than its band box:

| quantity | value | derivation |
|---|---|---|
| band rect height | **0.8597 vh** = 619 px @720 | `traverseConfig.ts:298` ✅ |
| `PLEXUS_RY` | **0.42** | `neuralLatticeConfig.ts:270` ✅ verified |
| **luminous cloud height** | **2·0.42·0.8597 = 0.72215 vh = 520 px** | `neuralLatticeConfig.ts:470` (`y = dy·r·PLEXUS_RY`, no y-offset) |
| fitted pitch | **1.119 vh** (lead **1.203**) | `traverseConfig.ts:304-308` ✅ verified |
| **permanent black stripe** | **0.397 vh = 286 px** (lead 0.481 vh = 346 px) | pitch − cloud |

That stripe never closes. It is a constant-height band of pure black translating down the frame at scroll speed, one per island pair. Reconstructed against the owner's three screenshots: at p ≈ 0.15 it is **48.1 % of the frame, all below centre**; at p ≈ 0.50 it is **29.7 %, all at the bottom**; p ≈ 0.30 looks good for exactly one reason — it is the phase where a cloud centre sits near the frame centre.

**Why the void lands at the bottom and not the top** — the arrival ramp, `NeuralLattice.tsx:745-755`: `vis = clamp((ih + 110 − vpTop)/(0.7·ih), 0, 1)`, damped at λ 2.5, multiplying alpha directly (`neuralFieldCompute.ts:2248`). A band reaches full brightness only once its top climbs above `0.30·ih + 110 px` (≈45 % of the frame); at entry it is at **0.218**. And the damp makes it worse **exactly while he is scrolling** — at 1000 px/s the entering band is ~0.79 below its own steady state. **The void is symmetric in geometry and asymmetric in luminance, and the dark side is always the bottom.**

**The composition trilemma, in numbers:**
```
no vertical gap in frame  ⇒  pitch ≤ 2·PLEXUS_RY·bandVh = 0.7222 vh
never three on frame      ⇒  pitch > (bandVh + 1)/2     = 0.9299 vh   (traverseConfig.ts:199)
```
**Mutually exclusive at today's constants, by 0.208 vh.** There is no tuning that avoids the choice.

## 1.4 The four continuity options — final ranking

| | continuity | effort | verdict |
|---|---|---|---|
| **① TILE the same cluster** | 100 % | ~150 lines | **Viable only if formation is abandoned.** Two under-priced costs: the copy mask must move to view space (a hot-path change in `particleScalars`, four call sites, both tiers, `neuralFieldCompute.ts:1455-1495`), and the tiles share one uniform set ⇒ **lit identically**. Answers "3 pezzi" with "2 identical pezzi". |
| **② CLUSTER wrap** | 100 % | ~120 lines | **High risk.** Re-authors the link topology (mean degree 4.41, 80-node giant component → beads on a string); repeats the fracture M times; strands `streamCenter` (`:1738`, `:2486`) so the spark burst and the nebula stay parked. |
| **③ NODE wrap + min image** | partial | ~40 lines | **Dominated.** Wraps the axis that is not failing (x survives to 66.7 %; the deficit is vertical, and there is **no zero-straddle y window in any build** — 10 % of edges straddle on average, 50 at worst). Decouples position from `nodeT`, so wrapped nodes arrive **already broken**. |
| **④ ENLARGE to the corridor** | 100 % | ~20 lines | **REJECTED on a hard wall.** `uNodePos` at 1188 nodes = **18.6 KiB against the 16 KiB `MAX_UNIFORM_BLOCK_SIZE` floor**; `uniformArray` pads vec3 → vec4 (`UniformArrayNode.js:161-187`), so the ceiling is a hard **1024 elements** with no packing escape. Min-spec WebGL2 fails to link — the whole net disappears. ⚠️ **Do not stake the rejection on `uEdgeA`'s 40.9 KiB** — merge+pack fixes that one (10.2 KiB). |

**The "three constants" remedy is refuted as scoped.** Raising `PLEXUS_RY` 0.42 → 0.75 was validated on **one of five** islands. Re-run across all five: the **primary band delivers 113 nodes, not 185** (the proposal raises `PLEXUS_SEEDS_STONELESS` but not `PLEXUS_SEEDS`, `neuralLatticeConfig.ts:217-222` vs `:233`, and the primary is the one `well: true` build). Three of four joins still open on the p5–p95 core extent. And `PLEXUS_RY` is **global** — it silently rewrites `#production` (`Scene.tsx:509`, a band with no traverse, breaking the byte-for-byte contract at `NeuralLattice.tsx:1348`), the lite/phone tier (+17.6 % sparser), and the SVG twin (**15 % of its nodes render outside the viewBox**, `neural-graph-fallback.tsx:69-78`). It also puts 10–20 % of nodes at `|y| > 0.5`, i.e. **outside the anchor box against a zero-pad `strictCull`** (`NeuralLattice.tsx:712-718`) — the finding's own rule — and drags the fracture registration off the stone (+65 %).

**The direction is still right** — growing the cloud in y is the only way to close a *luminous* gap without a new mechanism. It is just **six places, not three**: separate `full` seed counts for welled vs stone-less; a per-density `RY` (or explicit `svg`/`lite` carve-out); a padded `strictCull`; a `COPY_Y_OUT` re-tune (`neuralLatticeConfig.ts:2024` — shipped 0 % of nodes beyond it, proposed 15–20 %); a `PLEXUS_CENTROID_K` vs `CRYSTAL_POS` re-check; and an explicit `#production` waiver.

## 1.5 Formation machinery — what exists

- **`uReveal` is the ONLY progressive mechanism in the codebase.** It already does exactly what the owner is asking for — particles coalesce from a hashed scatter (`neuralFieldCompute.ts:3014-3015`, `:2920-2921`) and links **knit** in one by one with a per-link hash stagger (`:2709-2714`, `LINE_REVEAL_STAGGER = 0.55`). **It is simply keyed to the wrong clock:** it saturates early in each island's entry and is then constant for the rest of the pass. That is the mechanical reason he reads "3 pezzi".
- **D13's ignition front is NOT implemented.** No `uFrontS`, `uFrontW`, `FRONT_W` anywhere in `src/` (the only `FRONT_` hit is `sersanMark.ts:161`, unrelated).
- **Nothing gates whether a node or link EXISTS.** The link draw count is baked (`neuralLinkLines.ts:106-136`).
- **A per-node birth front costs ZERO new UBO blocks** — a plain `uniform()` folds into `objectGroup` (`UniformNode.js:55`, `GLSLNodeBuilder.js:758-793`); the shipped precedent is `uCopyLaneW`. Particle vertex stage stays **12/12**, storage buffers stay **4/8**.
- **It must be a PURE function, not a latch.** Per-node mutable state = a storage buffer, and the WebGL2 analytic tier has none by construction (`:2917-2977`). Monotonicity has to come from the **driver** (`uBuild = max(uBuild, f(p))` in a ref), which means **a reverse scrub shows a fully-built net with no formation**. Owner decision, and he scrubs.
- **Link self-draw is ONE multiply** — `posL = mix(AL, BL, sL·g)` replacing `neuralFieldCompute.ts:2649`, the `crystalPlexus.ts:341-345` idiom ported to the vertex stage. `vLineRest` stays the baked chord so the fray dash does not crawl; `copyMaskLineAt(posL)` follows the growing tip for free. The link **dust** must be gated by the same `g` (`:1511-1513`) or ~40 beads fly off every un-grown link.
- **The trap that will bite:** scaling `alpha` by `born` without also scaling `cut` (`:2225`) / `vLineCut` (`:2810`) deletes particles outright when `born` crosses 0.004 instead of fading them. Documented at `:2210-2224`. Design it in from the first line.
- **The second trap:** keep birth **value-only**. If it moves the *anchor*, `WRAP_SNAP_DIST = 0.038` (`:3051-3064`) hard-resets `pos = anchor; vel = 0` and the coalesce becomes a permanent pop.

## 1.6 The plateau defect

- **`opWin` / `opTop` are dead code — declared, documented, never wired, in any commit.** ✅ verified this session: `use-diagonal-traverse.ts:159`/`:161` behind a 31-line spec comment (`:128-158`); initialised once with a degenerate placeholder at `:326-327`; never assigned again. `unitSpan` (`:304`) never `.set`/`.get`/`.clear`. `windowAt` imported at `:90`, **zero call sites**. `blk.unit` (`:331`) read nowhere. `data-traverse-unit` authored nowhere in `src/`. `git log -S "blk.opWin"` returns nothing.
- **The defect term is threshold-independent:** `half-lit = 2g + (h_B − h_D)` — the scroll on which exactly one half of a reading unit is lit. Measured @1920×935: **248.25 / 199.26 / 171.12 / 171.14 px = 789.77 px = 14.7 % of the act.** No band/inset/floor tuning removes it. **Only pairing at the unit removes it.**
- Live at p = 0.50, reproduced to 4 decimals: the row-1 headline sits at **opacity 0.0128 and x −115.9** while its own paragraph, 94 px below, is at **opacity 1.0 and x −25.5** — a 90 px horizontal split inside one sentence, half of it invisible.
- **Dead zone:** a block wholly inside the top or bottom 12 % strip paints at 0 — **224.4 px = 24.0 % of a 935 px viewport** (323.95 px = 34.65 % counting the header). Binds all six ledger blocks, neither chapter block.
- **`plateauPx` is not 0.** The `plateau: 0` reading was a mis-read key name (there is no `plateau` key; `:602` emits `plateauPx = |blockH − bandH|`, measured 204–555).
- **Opacity floor is REJECTED as the fix:** body text needs **f ≥ 0.825** for WCAG AA (4.5:1 at 18.77 px). f = 0.35 → 1.80:1. *Modelled* against a flat bg, not measured over the lit net — but the true floor over a lit net is ≥ 0.825 either way.
- **⚠️ The lane swap must be guarded.** If `bestV`/`frame.laneWindow` (`:439-443`, `:469`) switch from `s.vhat` to the new `op` unguarded, then with `windowOpacity: false` or `rate === 0` every block gives `op ≡ 1` ⇒ `laneWindow ≡ 1` permanently ⇒ `uCopyLaneW`/`uCopySoft`/`uCopyFloor`/`uCopyLineFloor` (`NeuralLattice.tsx:663-666`) pin at full strength for the whole act. **That breaks the very A/B lever we want to keep as the rollback.**

---

# PART 2 — LA DOMANDA SULLA CONTINUITÀ

> *Da incollare all'owner verbatim. Le tre letture sono alternative: la prima decide l'architettura, le altre due la escludono.*

**Il problema, in una riga:** la nuvola di nodi è alta **520 px**, ma le isole sono distanziate di **806 px**. Restano **286 px di nero fisso** fra una e l'altra, sempre, che scendono con lo scroll. Ecco perché vedi tre pezzi.

**"La rete deve continuare a comporsi" può voler dire tre cose diverse. Sono alternative — la prima esclude le altre due.**

---

### ① SI COSTRUISCE — la rete nasce mentre scendi

La struttura non c'è ancora: i collegamenti si disegnano da un nodo all'altro poco prima che tu ci arrivi, e le nuvole si sovrappongono così non si spezza mai.

```
  giu' |  la rete SI COSTRUISCE davanti
   v
o--o--o--o--o--o--o--o   <- gia' composta
 \/ \/ \/ \/ \/ \/ \/
o--o--o--o--o-o . .      <- si sta unendo
  .  .  . .   .  .
 .   .    .  .    .      <- ancora polvere
```

**Costo onesto.** È la lettura più fedele alle tue parole ed è quella che il codice sa quasi già fare — la rete oggi si *annoda* così, ma solo una volta all'ingresso di ogni isola. Servono: tre termini nuovi nello shader (nessun costo di memoria GPU), più l'ingrandimento delle nuvole in sei punti del codice, non tre. **Lavoro: alto.** **Rischio: medio.** **Vincolo duro:** questa lettura è compatibile *solo* con l'architettura a isole separate — se un giorno si passa a una rete unica ripetuta, tutte le copie si compongono all'unisono e sembra una fotocopia animata.

---

### ② SI ACCENDE — la struttura c'è già, la luce la percorre

Il reticolo è presente e continuo dall'inizio alla fine; quello che viaggia con te è una banda di luce che lo accende al passaggio e lo lascia spegnere alle spalle.

```
  giu' |  la struttura c'e': scorre la LUCE
o--o--o--o--o--o--o--o--o--o--o
 \/ \/ \/ \/ \/ \/ \/ \/ \/ \/
o--O==O==O--o--o--o--o--o--o--o
      ^^^^^
   la banda di luce scende con te
```

**Costo onesto.** È metà della tua frase: "si illumina" sì, "si compone" no — la rete non nasce mai, era già tutta lì. In compenso è la più economica e la più robusta: sopravvive allo scroll all'indietro senza smontarsi, e resta compatibile con qualunque scelta futura sull'architettura. **Lavoro: medio-basso.** **Rischio: basso.**

---

### ③ SCORRE — un campo senza fine

Nessuna costruzione e nessun fronte: una sola rete infinita che scorre di lato mentre scendi. Non ha un inizio né una fine, cambia solo quello che è in quadro.

```
  giu' |  un campo SENZA FINE che scorre
o--o--o--o--o--o--o--o--o--o--o--o--o
 \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/
o--o--o--o--o--o--o--o--o--o--o--o--o
 \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/
o--o--o--o--o--o--o--o--o--o--o--o--o
  niente inizio, niente fine: solo moto
```

**Costo onesto.** È l'unica che elimina i tre pezzi per costruzione, ma **uccide la composizione**: la stessa rete ripetuta condivide un solo set di parametri, quindi ogni copia si accende identica alle altre, nello stesso istante. Rischi di sostituire "tre pezzi" con "due fotocopie". In più la maschera che protegge il testo dalla rete va riscritta in un punto caldo del rendering, su entrambi i motori grafici. **Lavoro: alto.** **Rischio: alto.** *Sconsigliata, ma è una scelta legittima se quello che conta è solo che non si interrompa mai.*

---

# PART 3 — LA DOMANDA SULL'ANGOLO

> *Da incollare all'owner verbatim.*

**Cosa misurano i numeri.** *Corsa dell'isola* = quanto una singola nuvola si sposta di lato mentre attraversa lo schermo — **è la cosa che vedi davvero**, e oggi è meno di mezzo schermo. *Scivolamento del testo* = di quanto una riga si sposta lateralmente mentre la stai leggendo, misurato in larghezze-di-lettera per riga: **oltre 1,5 si rilegge o si salta una riga**. I valori qui sotto presuppongono una correzione da una riga di codice che va fatta comunque — senza quella, già oggi siamo a 1,48.

---

### 23,61° — COM'È ORA (base)

```
[<--------- schermo 1920 --------->]
 o
  o
   o
    o
     o
      o
       o
```
**Corsa dell'isola: 0,40 schermi** · corsa totale 1,22 schermi (desktop) / 5,2 (telefono) · **scivolamento testo 1,19** *(oggi, senza la correzione: **1,48** — al limite)*
→ *Si legge come uno scroll normale. È il difetto che hai segnalato.*

---

### 30° — IL PASSO SICURO

```
[<--------- schermo 1920 --------->]
 o
   o
     o
       o
         o
           o
             o
```
**Corsa dell'isola: 0,52 schermi** · corsa totale 1,61 schermi / 6,8 (telefono) · **scivolamento testo 1,34**
→ *Si comincia a percepire la diagonale. Non costa niente da nessuna parte.*

---

### 36° — IL MASSIMO CON LA RETE ATTUALE

```
[<--------- schermo 1920 --------->]
 o
   o
      o
        o
           o
             o
                o
```
**Corsa dell'isola: 0,66 schermi** · corsa totale 2,03 schermi / 8,6 (telefono) · **scivolamento testo 1,42**
→ *Diagonale netta e leggibile. Sul telefono, con le isole di oggi, il margine è finito: a 37,5° tornano i buchi neri fra un'isola e l'altra.*

---

### 45° — LA VERA DIAGONALE

```
[<--------- schermo 1920 --------->]
 o
   o
      o
         o
            o
               o
                  o
```
**Corsa dell'isola: 0,91 schermi** · corsa totale 2,79 schermi / 11,8 (telefono) · **scivolamento testo ~1,49**
→ *Un'isola attraversa quasi tutto lo schermo. **Disponibile solo se la rete diventa continua** (opzione ① o ③): con le cinque isole di oggi il telefono apre quattro buchi da 235 px.*

**Nota tecnica che ti riguarda:** sul telefono i tre titoli del ledger vanno a capo su due righe e **non hanno nessun limite di scivolamento** — sono già a 1,73 oggi, a 23,61°. Nessuna scelta di angolo lo sistema: serve un intervento separato sul tipo mobile. Te lo segnalo perché è un difetto che esiste già, non qualcosa che l'angolo introduce.

---

# PART 4 — WHAT I WOULD BUILD, AND IN WHAT ORDER

## STAGE 0 — free, no owner decision, ships before he answers

### 0a. The composition instrument — `profile()` / `profileAt()`
**File:** `src/components/fx/use-diagonal-traverse.ts`, sibling of `coverage()` (between `:826` and `:827`), inside the existing `NODE_ENV !== "production"` guard (`:573`).
**What:** one `getBoundingClientRect` pass up front, then pure arithmetic. Returns `binMean[12]` (top→bottom), `fill`, `balance` (vertical centre of mass), `void.maxVh` (tallest contiguous dark run), plus a `geometry` block carrying `cloudVh`, the pitches and the gaps so diagnosis and measurement cannot drift apart. The net is modelled by its analytic marginal density `w(ζ) = 1 − |ζ|^1.2` (exact for `PLEXUS_RADIAL_POW = 2.2`, `neuralLatticeConfig.ts:274`), weighted by the **steady-state** `vis` — so every number is an upper bound on what the eye actually gets.
**Prerequisite worth taking:** `CULL_PAD = 220` and the arrival ramp are module-private to `NeuralLattice.tsx:184,745-749`. Export a pure `arrivalVis(vpTop, ih)` from `traverseConfig.ts` and call it from `:745` — one moved expression, no behaviour change, removes a mirror that would rot.
**Gate:** `profileAt()` at the owner's three screenshot positions must agree with what he sees before anything moves. Expect `void.maxVh ≈ 0.40–0.48` and `balance` well under 0.5 at p 0.15 and p 0.50.
**Rollback:** dev-handle only; delete.

### 0b. Wire `opWin` / `opTop` (the plateau fix)
**Files:**
- `traverseConfig.ts` — one interface field + one default: `opacityInset: 0.04` (set it equal to `bandInset` for the A/B).
- `use-diagonal-traverse.ts` — append the unit-span loop to `measure()` **after `:397`, before `placeIslands()` at `:401`** (it must not run between the rect reads); replace `:430` with `windowAt(blk.opWin, blk.opTop - sy)`, making the dead import at `:90` live.
- **`:439-443` / `:469` — swap `s.vhat` → `op` for the lane, GUARDED on `wantOpacity`.** Unguarded this pins `uCopyLaneW`/`uCopySoft`/`uCopyFloor` at full strength whenever `windowOpacity: false`.
- `:672-699` `laneCheck()` and `:781` `coverage()` must be updated to the same window, and the published census baseline (`18.8 / 29.1 / 12.1 / 40.0` @1280) **re-declared**, not re-quoted.
- **`problem-section.tsx:465-467`** — add `data-traverse-unit` to the `ref={chapterRef}` grid, or the chapter pair keeps the largest defect of the four (248 px). The ledger rows already pair via `[data-ledger-row]` (`:616`).
**Gates:** **4a-B** — half-lit scroll per unit must be **0** (today 789.77 px = 14.7 % of the act); provable by construction, not sampled. **4a-C** — dead zone reported and owner-approved (24.0 % → 8.0 % at `opacityInset 0.04`). **4a-A** — joint `>0.9` window non-empty per unit (it already passes today, so it alone would ship the bug).
**Cost to name:** `opacityInset < bandInset` spends the `:149-153` promise ("opaque only where it is slowest") **and**, via the lane, widens/softens/floors the WebGL copy mask earlier and longer.
**Rollback:** `opacityInset = bandInset` (R1 only), or `windowOpacity: false` (`traverseConfig.ts:347`) for the full A/B — provided the guard in the bullet above is in.

### 0c. The cap — one line
**File:** `use-diagonal-traverse.ts:395`, `cfg.capBody && blk.kind === "body" ? blk.h : 0` → `... ? blk.h / 2 : 0`, and rewrite the comment at `:391-394`, which still states the old law.
**Prerequisite:** measure the real line counts in Chrome with `getClientRects()` first. The whole ceiling hangs on whether one ledger paragraph is 2 or 3 lines and the two independent analyses disagree.
**Gate:** worst body block ≤ 1.5 em/line at every angle in range and at all three viewports; excursion re-baselined (−5 %) against QA gate 3 (`:600-603`).
**Rollback:** revert one token.

### 0d. Flag, do not fix: the phone's uncapped multi-line display block
Report it, name the two candidate fixes (cap multi-line display, or change the mobile type scale). **Do not silently change it** — it is band-adjacent copy typography.

## STAGE 1 — the continuity reading (blocked on PART 2)

**If ① SI COSTRUISCE** — three separable terms, each independently visible and independently revertible:
- **(A) BIRTH.** `bornAt(p) = smoothstep(ph, ph + BIRTH_SOFT, uBuild)` with `ph = p.x·FRONT_AX + p.y·FRONT_AY + FRONT_C` (baked constants, no data), `min(bornA, bornB)` for links. **Multiplied into `alpha` AND `cut` (`neuralFieldCompute.ts:2225`) / `vLineCut` (`:2810`)** — the single most likely way to get it wrong. Value-only, never the anchor. Driver: one `uBuild` per island from that island's own arrival + `tv.p`, latched monotone in a ref.
- **(B) LINK SELF-DRAW.** `posL = mix(AL, BL, sL.mul(g))` at `:2649`, `tL` likewise at `:2650`; same `g` on the link dust (`:2071`). One multiply.
- **(C) IGNITION BAND.** `ign = exp(−(σ/uFrontW)²)` in **local** coordinates with the driver folding `lateralPx` in — the identical change of variables the lane already does at `NeuralLattice.tsx:662`. Emissive only, gated by `cGate` like `surgeAt`/`nodeKissAt` already are (`:2128-2129`). A **band**, never a swept edge.
- **Plus the cloud enlargement, correctly scoped** — six places, per §1.4. Sized against `(e_i + e_{i+1})/2 ≥ pitch` on a **p5–p95 core** extent, not the full span.
- **Gates:** `profile().void.maxVh ≤ 0.1`; `balance` within 0.45–0.55 across the act; bloom census ≤ 8 sprites above emissive 1.0 (storyboard §B6.5); `#production` and the lite/SVG tiers byte-for-byte unless waived; UBO **12/12** and storage **4/8** unmoved; `npx tsc --noEmit` clean.
- **Rollback:** `uBuild = 1` kills (A) and (B); `ignGain = 0` kills (C); the plexus constants revert independently.

**If ② SI ACCENDE** — (C) only, plus the cloud enlargement. Half the work, no latch question, survives reverse scrub.

**If ③ SCORRE** — option ① (tile), quoted **with** the view-space mask (`neuralFieldCompute.ts:1455-1495` → `modelViewMatrix`, four call sites, plus the `vNebBox` per-instance transform at `:2525-2531`) and screen-referenced ignition. **Formation is off the table.** Fallback ② (cluster wrap) only if ① fails.

## STAGE 2 — the angle (blocked on PART 3, and on 0c landing first)

**File:** `traverseConfig.ts:274`, one number. `angleDeg` has **zero** hardcoded dependents in `src/` (only `:356` and comments).
**Gates:** the corrected legibility table at all three viewports; phone presence `min(bandVh+1, 2·vw/(R·ih))` vs the ladder's largest pitch — **only if the ladder survives Stage 1**; the stone's lateral cull (`CrystalCluster.tsx:503` culls vertically only, so at 50°/1920 it is submitted out to ±1298 px off frame).
**Rollback:** one number.

---

# PART 5 — WHAT I CANNOT ANSWER

**Needs live measurement in Chrome (nobody in this round ran the page except the plateau agent):**
1. **The real line counts** of the ledger paragraphs and headlines, EN and IT, at 1920 / 1280 / 390 — `getClientRects()`. The two independent analyses disagree (row 02 EN: 2 vs 3 lines) and **the entire angle ceiling hangs on it**.
2. **`secH` at 1920×935.** The 5358 px figure is dossier-only; `traverseConfig.ts:276-279` has no 1920 entry. Every 1920 run/screen-width number inherits it.
3. **`bandY` at 390×844.** Never measured. The "37.5° phone wall" is therefore an **upper bound**, not the wall.
4. **Frame time / GPU cost.** No profiler was run. Every ALU and particle-count figure is a static read of the node graph. The claim that 2–3× shaded particles is affordable is **unproven**.
5. **`uniformArray(Vector4[])` on the WebGL2 fallback.** The three r184 source path is identical (`UniformArrayNode.js:161-187`, `:277-289`) but it is exercised nowhere in this repo and was never compiled. Only bites if the *authored*-phase birth variant is chosen over the derived one.
6. **Whether `uReveal` saturating is what he reads as "3 pezzi"** — that is an inference from the driver arithmetic (`NeuralLattice.tsx:745-756`), not an observation.
7. **The IT copy at narrow widths** — the plateau measurements are EN only; the IT chapter H2 is longer and is exactly where the unit-window self-limiting branch would engage.

**Needs the owner:**
8. **Which of the three readings of "si compone"** — it decides the architecture (PART 2). Everything in Stage 1 is blocked on it.
9. **The angle** (PART 3).
10. **Reverse scroll.** Latched = the net stays built and shows no formation when he scrolls back up. Unlatched = it dismantles itself. There is no third option on WebGL2. He scrubs constantly, so he will see whichever we pick within thirty seconds.
11. **May `#production` change?** Growing the cloud globally breaks the byte-for-byte contract at `NeuralLattice.tsx:1348`. A per-density carve-out avoids it at the cost of two constellations to maintain.
12. **Is 3–4 islands shaded at once acceptable?** The trilemma (§1.3) has no fourth exit. Filling the frame needs pitch ≤ 0.7222 vh; keeping ≤2 on frame needs pitch > 0.9299 vh. One of them must give.
13. **The dead zone.** 224.4 px = 24 % of the viewport in which short copy blocks paint at 0 — is that intentional cinema or a bug? R2 shrinks it to 8 % but spends a stated design promise to do it.

**Explicitly not ours to decide:** `bandVh`, the fitted pitch, `leadVh`, `PLEXUS_RY` and the arrival-ramp length are **band placement in the frame wearing a constant's clothes**. Reporting `balance = 0.22 at p 0.15` is diagnosis; shipping `pitch = 0.72` to make it read 0.48 is taking his decision. Nothing in `traverseConfig.ts` should move before he answers.

**Files read/verified this session:** `C:/Users/alber/Desktop/sersan-v2-main/src/webgl/neural/traverseConfig.ts`, `src/webgl/neural/neuralLatticeConfig.ts`, `src/components/fx/use-diagonal-traverse.ts` (+ `git log`). All other file:line citations are carried from the four research agents and their two refutations, with each contested claim marked ✅ / **CORRECTED** / ⚠️ above.