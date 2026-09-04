# SERSAN — brand film: copy e specifica delle scritte animate

Film: 972 frame @ 30 fps = **32,4 s**, 1920×1080.
Sorgente: `motion/src/` — la copy vive nei componenti, non in questo file.
Qui trovi il **deck di copy** (cosa si dice e quando) e la **specifica
dell'animazione del testo** (come si dice).

Tutta la copy inglese è **verbatim dal sito** (`src/data/copy.ts`, sezioni
home). Niente è stato riscritto: dove una frase era lunga è stata **spezzata**
in due battute, mai riformulata.

---

## 1. Copy, battuta per battuta

Tempi in secondi dall'inizio. La freccia indica la seconda battuta della stessa
scena.

| # | Beat | In | Out | Copy a schermo | Fonte |
|---|---|---|---|---|---|
| 01 | Apertura | 0,00 | 1,20 | *(nessuna scritta — il marchio)* | — |
| 02 | Firma | 1,20 | 3,20 | *(nessuna scritta)* | — |
| 03 | **Il claim** | 3,20 | 5,80 | **We build the software** → **your business is _missing._** | hero |
| 04 | Il nodo | 5,80 | 7,40 | *(nessuna scritta)* | — |
| 05 | **Il problema** | 7,40 | 9,60 | **It starts with one problem worth solving.** | POSITIONING.core |
| 06 | Il muro | 9,60 | 11,20 | *(nessuna scritta)* | — |
| 07 | **Scope** | 11,20 | 13,80 | **We find what _should not_ be built** → **before code becomes debt.** | services 04 |
| 08 | Assemblaggio | 13,80 | 16,00 | *(nessuna scritta)* | — |
| 09 | **Build** | 16,00 | 18,00 | **Then we design and build the system.** | POSITIONING.core |
| 10 | **Cosa facciamo** | 18,00 | 20,80 | eyebrow **What we do** + quattro card | services.ts |
| 11 | La sfera | 20,80 | 22,40 | *(nessuna scritta)* | — |
| 12 | **La prova** | 22,40 | 24,40 | **Working software is the only _proof._** | — |
| 13 | **La tesi** | 24,40 | 26,40 | **AI where it _earns its place._** | POSITIONING.thesis |
| 14 | **L'offerta** | 26,40 | 29,20 | **Bring us the problem.** → **_We'll bring the plan._** | final-cta |
| 15 | **End card** | 29,20 | 32,40 | lockup | — |

Il **corsivo** segna le parole accento: vanno in ciano `#3BE1FF` con bagliore
più forte. Tutto il resto è bianco avorio `#F4F6FA`.

### Beat 10 — le quattro card

| N. | Titolo | Riga |
|---|---|---|
| 01 | Custom Software & Platforms | Custom software built around how your business works. |
| 02 | Workflow Automation | Automate the work nobody should still do by hand. |
| 03 | AI Features & Reliability | Make AI features reliable enough to depend on. |
| 04 | Technical Audits & Architecture | Find what should not be built, before code becomes debt. |

Eyebrow: `WHAT WE DO` — JetBrains Mono, maiuscolo, tracking 0.22em.
CTA pill (beat 14): **Send a project brief →**

### Beat 15 — end card

```
            [ marchio SVG esatto, mai ridisegnato ]

                      S E R S A N
                   ────────────────
            The intelligence is artificial.
             The judgement stays human.

                      sersan.io
```

Riga: 240 px, gradiente `#3BE1FF` → `#2A7FFF`, si disegna da sinistra.
Wordmark: Sersan Display 300, tracking 0.18em.
La seconda riga della firma è corsiva e ciano.

---

## 2. Traccia per il voiceover

Il mix lascia libera la fascia media e picca a −4 dBFS proprio per questo.
Il parlato deve **arrivare sulla parola**, non prima: ogni battuta comincia
0,13 s dopo l'inizio del beat.

| In | Da dire |
|---|---|
| 3,33 | We build the software your business is missing. |
| 7,53 | It starts with one problem worth solving. |
| 11,33 | We find what should not be built, before code becomes debt. |
| 16,13 | Then we design and build the system. |
| 22,53 | Working software is the only proof. |
| 24,53 | AI where it earns its place. |
| 26,53 | Bring us the problem. We'll bring the plan. |

Durata parlata complessiva ≈ 17 s su 32,4 s: metà film è respiro. È voluto.

---

## 3. Come sono fatte le scritte animate

Implementazione: `motion/src/ui/Spoken.tsx`. Quella che segue è la specifica
completa: basta a riprodurle da zero in qualunque strumento.

### Il principio

Le parole arrivano **una alla volta, a ritmo di parlato**, al centro
dell'inquadratura. Una frase corta si compone, resta, esce, e la successiva
prende lo stesso posto. Non è un sottotitolo: è la voce di questo film.

### I numeri

| Parametro | Valore | Perché |
|---|---|---|
| Passo tra parole | **6 frame** (0,20 s) | cadenza di parlato |
| Durata di una parola | **22 frame** (0,73 s) | più lunga del passo: due o tre parole sono **sempre** in movimento insieme. È questo che rende il testo fluido invece che meccanico |
| Curva | `cubic-bezier(0.22, 0.9, 0.24, 1)` | partenza decisa, coda lunghissima, zero scatto |
| Uscita frase | 16 frame, curva morbida | |
| Corpo | 78–96 px su 1080p | una riga, mai due se evitabile |
| Font | Switzer 500 | il sans di brand |
| Tracking | −0,022em | |

### Cosa fa ogni parola, entrando

Tutto sulla stessa curva, in parallelo:

- **opacità** 0 → 1, elevata a 0,75 così emerge dal nero prima di essere piena
- **traslazione** +34 px → 0 (sale)
- **sfocatura** 10 px → 0, ma **quadratica** — `(1−p)²` — così sparisce presto e non fa "pop"
- **scala** 1,06 → 1,00
- **flash** sulla parola appena arrivata: il bagliore raddoppia e decade in 16 frame. È la sillaba che atterra.

### Le due cose che fanno la differenza

**1. La frase resta centrata mentre si compone.** Se le parole appaiono nella
loro posizione finale, a metà rivelazione la riga è visibilmente spostata a
sinistra. Quindi il blocco intero scorre: si stima la larghezza di ogni parola
come `(caratteri + 1) × 0,52em`, si somma quella delle parole già atterrate, e
si trasla il blocco di metà della differenza. Essendo pesata sulla stessa
progressione delle parole, lo scorrimento è continuo, non a scatti.

**2. La riga non si ferma mai.** Anche tra una parola e l'altra il blocco sale
di 1,1 px ogni 30 frame. Impercettibile da fermo, decisivo in movimento.

### Le parole accento

Si marcano con asterischi nella sorgente: `your business is *missing.*`
Diventano ciano `#3BE1FF` con bagliore a 26 px invece che 16, e sul flash
d'arrivo salgono a 60 px.

### Il prompt riutilizzabile

> Anima una frase corta al centro dell'inquadratura, parola per parola, a ritmo
> di parlato. Una parola ogni 6 frame a 30 fps, ma **ogni parola impiega 22
> frame** ad assestarsi, così due o tre sono sempre in movimento insieme: è la
> sovrapposizione a rendere il testo fluido invece che meccanico. Curva
> `cubic-bezier(0.22, 0.9, 0.24, 1)` — partenza decisa e coda lunga, mai uno
> scatto. Ogni parola entra salendo di 34 px, con la sfocatura che cala in modo
> quadratico da 10 px a 0, l'opacità elevata a 0,75 e la scala da 1,06 a 1,00;
> la parola appena atterrata riceve un lampo di bagliore che decade in mezzo
> secondo. Trasla l'intero blocco perché la parte già visibile resti otticamente
> centrata mentre la frase si compone, e fai salire la riga di circa un pixel al
> secondo anche quando nessuna parola sta entrando: non deve mai essere ferma.
> Sans medio, corpo grande, bianco avorio su nero, con le parole chiave in ciano
> e un bagliore più marcato. Una frase alla volta: quando arriva la successiva,
> la precedente esce in 16 frame salendo e sfocando.

---

## 4. Regole di copy che questo film rispetta

Vengono da `src/data/copy.ts` e valgono per qualunque nuovo taglio:

- La CTA primaria è **"Send a project brief"**. *"Book a call"* è **vietata**: il visitatore non può prenotare nulla, il form è scritto.
- Nessun prezzo, nessuna soglia di budget a schermo.
- Nessuna certificazione rivendicata: SerSan non ne detiene.
- Nessun numero appartenente a un ex datore di lavoro dei founder.
- **"The intelligence is artificial. The judgement stays human."** e **"AI where it earns its place."** sono asset di brand: non si riformulano e non si abbreviano.
- Il marchio compare **due volte in tutto il film**: apertura ed end card. Mai in mezzo.
