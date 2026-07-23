I have everything I need. Every contradiction is now settled against real code.

---

# Adding Mattia Scattu as a third morph target — single implementation plan

## 0. What I verified, and what the five specs got wrong

I read every file the specs cite. Three of their open questions are now **closed by evidence**, and four claims were **wrong**.

| Claim | Verdict |
|---|---|
| Spec 4: "`childDur` from Michele's 6 children could push Mattia's last child *past* `COPY_ENTER_END`" | **Wrong direction.** Mattia has *fewer* children (no `previouslyAt`), so a shared `childDur` makes his copy finish **early** (0.945 vs 0.98), not late. Per-block `dur` is still correct — but it is a polish fix, not a lock-violation fix. |
| Spec 4: add a `stageIndex: number` **field** to the store | **Wrong.** `step()` already guards `stage === "morphing"` before use (founders-rail.tsx:925), so the index is always derivable from the letter. A field means a second writer that can desync from `morph`. Spec 3's pure `stageIndex(stage)` helper is correct — adopt that. |
| Spec 1: keep `samplePortraitPair` as a deprecated wrapper | **Unnecessary.** `sampleImagePoints.ts` is imported by exactly one file (`FounderPortraitMorph.tsx`, 2 call sites: :313, :560). Replace it outright. |
| Spec 2: hardcode `FOUNDER_SLUGS = ["alessandro","michele","mattia"]` | **Rejected.** Spec 5 correctly identified this as a parallel-array landmine (`loadFounder(2)` silently falls back to `FOUNDER_SLUGS[0]` and samples Alessandro twice with no error). Derive the slug from `founders[idx].anchor` and delete the array. |
| Specs 1 & 2 & 3: "is Mattia's backdrop light or dark?" (open) | **Closed.** Decoded all three headshots. Mattia's backdrop is **pure white and background-removed** (flat, no texture). No flood-fill risk. |
| Spec 3: "does the naive A→B→C wiring even work?" (blocker) | **Closed, and it is already shipping.** See §1. |

**The single most important discovery none of the five specs made:** `HeroTextParticles.tsx` **already runs a live, sequential 3-target chain in production** through this exact engine (`createTextMorphComputeBuild` at :340, `homeC` real, `homeD = homeCWorld` inert, `uMorph` then `uMorph2` driven on separate clocks at :529 and :551). This is not new machinery. The founders island is the only caller that *doesn't* use it.

---

## 1. DEFINITIVE: `uMorph` / `uMorph2` / `uMorph3` semantics

The compute kernel, `gpgpuNodeSim.ts:1008-1020`, verbatim:

```ts
const r = hash(instanceIndex).toVar();
const m = clamp(morphN.sub(r.mul(0.55)).div(0.45), 0.0, 1.0).toVar();
const target = mix(hA, hB, smoothstep(0.0, 1.0, m)).toVar();
// Second morph leg: headline B → cue C …
const hC = homeCBuffer.element(instanceIndex);
const m2 = clamp(morph2N.sub(r.mul(0.55)).div(0.45), 0.0, 1.0).toVar();
target.assign(mix(target, hC, smoothstep(0.0, 1.0, m2)));
// Third morph leg: cue C → "scroll" D …
const hD = homeDBuffer.element(instanceIndex);
const m3 = clamp(morph3N.sub(r.mul(0.55)).div(0.45), 0.0, 1.0).toVar();
target.assign(mix(target, hD, smoothstep(0.0, 1.0, m3)));
```

**Position is genuinely CHAINED, not parallel.** `target.assign(mix(target, hC, …))` blends from the *already-blended* target, so with `uMorph` pinned at 1 and `uMorph2` sweeping 0→1, every particle travels **B→C**. 

**Naive `homeA/homeB/homeC` wiring is CORRECT for sequential A→B→C. No remapping is needed.** One precondition, which the plan below satisfies exactly:

> **`uMorph` must reach exactly 1.0 before `uMorph2` leaves 0.**

That precondition is satisfiable because the stagger **saturates exactly**: at `uMorph = 1`, `m = (1 − 0.55·r)/0.45`, and for the worst case `r → 1` that is `0.45/0.45 = 1.0`. So `target == hB` **exactly**, for every particle, at `uMorph = 1`. Driving both legs in parallel would instead produce `mix(mix(A,B,s), C, s)` — a shortcut cutting the corner between A and C, never touching B. Sequencing is mandatory and is what the progress scalar in §5 guarantees.

`homeD` is irrelevant while `uMorph3 = 0` (`mix(target, hD, 0) === target`), but pass `homeD = homeC` anyway so the inert leg is a true identity — the same defensive choice the hero already makes (`HeroTextParticles.tsx:346-349`).

### The trap: colour and ink are NOT chained

`gpgpuNodeSim.ts:1167-1181` — both read **`morphN` alone**:

```ts
const portraitMorphExpr = hasPortrait
  ? smoothstep(0.0, 1.0,
      clamp(morphN.sub(hash(instanceIndex).mul(0.55)).div(0.45), 0.0, 1.0))
  : null;
const portraitInkExpr = hasPortraitSize
  ? mix(sizeABuffer!.toAttribute(), sizeBBuffer!.toAttribute(), portraitMorphExpr!)
  : null;
```

and the fragment, `:1371-1373`:

```ts
const cA = colorABuffer!.toAttribute().xyz;
const cB = colorBBuffer!.toAttribute().xyz;
const base = mix(cA, cB, vMorphColorF!).toVar();
```

`PortraitMorphOpts` (:841-851) declares only `colorsA/colorsB` and `sizeA/sizeB`. So **wiring a real `homeC` without extending the shader renders Mattia's positions in Michele's colours with Michele's ink** — and ink gates disc size (:1313), the alpha knee (:1418), coverage (:1426-1431) and a `Discard` at alpha < 0.02 (:1446). Cells that are subject in Mattia but backdrop in Michele would be culled outright: Mattia appears as a Michele-shaped stencil. **The shader extension in Step 2 is mandatory, not polish.**

---

## 2. DEFINITIVE: the shared-grid sampler is a UNION, not an intersection

`sampleImagePoints.ts:410-414`:

```ts
const total = spec.gridW * spec.gridH;
const hits: number[] = [];
for (let i = 0; i < total; i++) {
  if (Math.max(readA.ink[i], readB.ink[i]) > spec.inkCut) hits.push(i);
}
```

A cell joins if **any** portrait inks it. Emission is then **unconditional per portrait** — `emit(readA, cells, spec)` walks the whole list and writes that image's own values including `ink[j] = 0` (:373-374) where it has none. So a cell that is jacket in Mattia and wall in Michele exists in Michele's arrays at ink 0, and the renderer collapses it (`PORTRAIT_SIZE_MIN = 0.06`, :1188 — whose comment already notes ~48% of the cloud is single-portrait-only at N=2).

**Consequence: adding a portrait can only GROW `sharedCells`. It never removes coverage. It is a budget problem, not a correctness problem.**

### Navy jacket vs white shirt — the actual numbers

`ink` is distance from the **measured backdrop**, not darkness (:246-252, luma-weighted). I decoded all three assets:

| | Backdrop | Torso | `dist` | `ink` after gain 1.7 / floor .03 / gamma .62 |
|---|---|---|---|---|
| Alessandro | light studio wall, textured | white polo | ~0.02 | **≈ 0.03** (at `inkCut`) |
| Michele | light studio wall, textured | white shirt | ~0.02–0.03 | **≈ 0.03–0.09** |
| Mattia | **pure white, background-removed** | **navy jacket** ≈ rgb(.16,.19,.31) | **≈ 0.81** | **saturates at 1.0** |

Head framing *is* matched across all three (hair top ≈ ny 0.16–0.17, chin ≈ ny 0.53–0.56). The entire difference is clothing contrast: **Mattia's torso is ~30× the ink of the other two, across ~85% of the frame width.** Two distinct consequences, both real:

**(a) Union growth → the stride cliff.** `stride = sharedCells > maxCount ? Math.ceil(sharedCells/maxCount) : 1` (:420-421) is an **integer cliff**. Today: 42,087 cells against a 48,000 ceiling — 14% headroom (FounderPortraitMorph.tsx:89-94). The jacket adds high-ink cells across roughly `0.85 × 0.40` of the grid where the other two contribute only marginal fringe. Even discounting overlap, this very likely lands 50k–62k. One cell over 48,000 and `stride` → 2, **halving the cloud to ~24k for all three faces**. It will not throw and it will not look sparse — `spacingDev = sqrt(areaDev/count)` (:450) auto-grows the discs, so the failure mode is *uniformly soft/blurry faces*, which is easy to ship by accident.

**(b) Extent inflation → all three faces shrink.** `halfExtentX/Y` are the 99th percentile of `|px|,|py|` over cells with `ink > extentInk` (0.15) (:375-378), and the caller fits the **max** across portraits (:371-372). Mattia's jacket clears 0.15 easily and spans the frame width; the other two's shirts do not clear it at all. The fit flips from Y-bound to X-bound exactly when:

```
max(halfExtentX)  >  0.75 × max(halfExtentY)
```

(0.75 = the stage's `aspect-[3/4]`, founders-rail.tsx:1563). Today the fit is Y-bound. If Mattia crosses that threshold, `worldPerGrid` drops and **Alessandro and Michele render smaller than they do today** — a regression caused purely by adding a third person.

### Exact spec values to use

**Do not split the spec per portrait** — one shared spec is what guarantees the shared grid. **Do not add a chromatic gate** — `sampleImagePoints.ts:254-271` is an explicit twice-burned prohibition, and MEMORY.md records the same rule.

```
SAMPLE_SPEC_BASE:  UNCHANGED — every value stays as shipped
  depth 90, centerZBias 0, inkGain 1.7, inkFloor 0.03, inkGamma 0.62,
  fadeStart 0.62, fadeSpan 0.32, inkCut 0.03, extentInk 0.15
GRID_W / GRID_H:   UNCHANGED at 290 × 405  (pending measurement)
MAX_COUNT_BY_TIER.full:  48000 → 72000     ← the ONE required value change
MAX_COUNT_BY_TIER.lite:  16000  (unchanged; lite never mounts this island)
```

Raising the ceiling is **monotone-safe**: it cannot make anything worse, it only prevents the cliff. Then measure and apply the decision rules in §8. Note that raising `extentInk` is *not* a usable lever here — the jacket and the hair/beard both saturate at ink ≈ 1.0, so no threshold separates them. Same lesson as the flood fill: colour cannot separate them, only position or the asset can.

---

## 3. Guard rails — what MUST NOT change

1. **`Scene.tsx:327` mount order.** `{pathname === "/" && tier === "full" && webgpu && <FounderPortraitMorph />}` must stay **after** `<SignatureLine>` (:297). The comment at :322-326 is load-bearing: per-frame group placement is camera-relative and depends on the single camera authority having written `camera.position/quaternion` earlier in the same priority-0 pass. Do not reorder, do not add a wrapper.

2. **Non-WebGPU fallbacks.** Three independent gates, all must keep working:
   - `canMorph` (founders-rail.tsx:519-525) requires `tier === "full" && backend === "webgpu"`.
   - The island's own `isWebGPUBackend` check (FounderPortraitMorph.tsx:341-347) returns before building on a WebGL2 backend.
   - The gate only engages when `live.active` is true (:1136) — on a WebGL2 fallback the gate **never hijacks scroll**. The horizontal-rail and native branches must keep rendering all three founders as real focusable DOM. They already do: `panels()` maps `founders` (:1470-1474), rail travel derives from `track.scrollWidth` (:1329). **No edit needed in either fallback.**

3. **`prefers-reduced-motion` and mobile native mode.** founders-rail.tsx:563-566 sets `mode = "native"` for `max-width:768px`, `pointer: coarse`, **or** `prefers-reduced-motion: reduce`. `canMorph` requires `mode === "pinned"`, so the scroll-jack and the island never run on any of those paths. Do not touch this effect, and do not touch the `roomy` floor (:572-574) or the stage grid at :1555 — that grid is portrait-vs-copy, **not** founder-vs-founder. The "3-up layout" in the brief refers **only** to `/about`.

4. **R3F island commit wedge (MEMORY.md).** React commits inside the Canvas can wedge on interior routes. The island must keep driving **entirely from refs + `getState()` inside `useFrame`**. `morphRef` stays a `useRef`; `uMorph`/`uMorph2` are written from it in the frame loop. Never introduce React state into the per-frame path. The only permitted reactive reads stay `measureVersion` (:238) and the rare-change build deps (:597).

5. **The VaryingNode hazard** (gpgpuNodeSim.ts:1105-1119, 1147-1166). `varying(node)` re-emits its node at the **top** of vertex `main()`, before `material.vertexNode` runs. Every new expression (`portraitMorph2Expr`, the rewritten `portraitInkExpr`) **must stay a self-contained expression**. Hoisting either into an outer `.toVar()` + `.assign()` inside the `Fn` silently pins the varying to its declared initial value — the exact bug that once made `vMorphColorF` read a constant 0.

6. **Swizzle discipline.** `"vec3"` storage buffers pad to 16 bytes → `.toAttribute()` yields **four** components, trailing `.xyz` **mandatory** (:1263-1267). `"float"` buffers are unpadded → **no** `.xyz` (:939-941). `colorCBuffer` gets `.xyz`; `sizeCBuffer` does not.

7. **`uSizeComp2` stays pinned at 1** (FounderPortraitMorph.tsx:510). It becomes a *live* term the moment `uMorph2` animates (`sizeFC`, :1295-1299), and `portraitSizePxExpr` deliberately omits `sizeFD` — exact only while those uniforms are 1 (:1229-1234). Never animate them.

8. **The hero must stay byte-identical.** `createTextMorphComputeBuild` has two callers: FounderPortraitMorph.tsx:459 and **HeroTextParticles.tsx:340**. All new `PortraitMorphOpts` fields must be **optional**, and all new nodes gated on build-time JS booleans, so the hero (which passes no `portrait`) emits an unchanged graph.

9. **`LOCK_EPS` must stay 0.02.** `COPY_ENTER_END = 0.98` (founders-rail.tsx:105) is documented as "exactly the island's stage-B lock threshold" — it is authored as `1 − LOCK_EPS` so a leg can never lock with copy still mid-flight.

10. **Do not deploy between steps.** Step 1 alone puts Mattia on `/about` in a 2-col grid and on the home rail while the island still samples two. Land all seven steps as one PR.

---

## 4. STEP 1 — Data (`src/data/founders.ts`) + the exclusion mechanism

### 1a. Image const, after line 4

```ts
const micheleImg = "/founders/michele-sanna.webp";
const mattiaImg = "/founders/mattia-scattu.webp";      // ← ADD
```

### 1b. The discriminator — `FounderProfile`, after `badges` (line 12)

```ts
  badges: string[];
  /** Founder vs employed team member. Any surface whose copy says the word
   * "founder" — /contact's "Talk to a founder", /start's "Who reads this" —
   * MUST iterate `coFounders`, not `founders`. The home rail and /about
   * render the FULL team. Required (not optional) so the compiler forces
   * every entry to be annotated and no consumer can be surprised later. */
  kind: "founder" | "team";
  roleKey: string;
```

Then add `kind: "founder",` to Alessandro (after :46) and Michele (after :81).

### 1c. The Mattia entry — insert after Michele's closing `},` at line 110

```ts
  {
    name: "Mattia Scattu",
    initials: "MS",
    image: mattiaImg,
    // MUST match /public/founders/<anchor>-headshot.webp — the WebGL sampler
    // resolves the headshot by this slug (FounderPortraitMorph.loadFounder).
    anchor: "mattia",
    linkedIn: "https://www.linkedin.com/in/mattia-scattu-481271356",
    badges: ["BSc Computer Science", "Published research"],
    kind: "team",
    roleKey: "",
    bioKey: "",
    roleEn: "Software Engineer",
    roleIt: "Software Engineer",
    accent: "cool",
    credentialsEn: [
      "BSc Computer Science, Università di Camerino",
      "Published: Knowledge Graphs as a Semantic Layer for Understanding Robotic Video",
    ],
    credentialsIt: [
      "Laurea Triennale in Informatica, Università di Camerino",
      "Pubblicazione: Knowledge Graphs as a Semantic Layer for Understanding Robotic Video",
    ],
    shortBioEn:
      "Designs and builds internal systems end to end — requirements, data model, interface, delivery. Shipped a maintenance and inventory management system for a resort operator, from formal requirements analysis through to the running software.",
    shortBioIt:
      "Progetta e realizza sistemi gestionali interni dall'inizio alla fine: requisiti, modello dati, interfaccia, rilascio. Ha realizzato un sistema di gestione della manutenzione e dell'inventario per un operatore turistico, dall'analisi formale dei requisiti fino al software in esercizio.",
    bioEn:
      "Software engineer with a Computer Science degree from Università di Camerino. At L'Ultima Spiaggia S.r.l. he designed and built the information system for a campsite resort, covering maintenance operations and inventory tracking: formal requirements analysis, logical and physical database modelling, interface design, and implementation across the full software lifecycle. Previously an IT intern at ARES Sardegna. Co-author of \"Knowledge Graphs as a Semantic Layer for Understanding Robotic Video\".",
    bioIt:
      "Software engineer, laureato in Informatica all'Università di Camerino. In L'Ultima Spiaggia S.r.l. ha progettato e realizzato il sistema informativo di un villaggio turistico, per la gestione della manutenzione e il tracciamento dell'inventario: analisi formale dei requisiti, modellazione logica e fisica della base dati, progettazione dell'interfaccia e implementazione lungo l'intero ciclo di vita del software. In precedenza stagista IT presso ARES Sardegna. Co-autore di \"Knowledge Graphs as a Semantic Layer for Understanding Robotic Video\".",
    expertiseEn: ["Software Design", "Data Modelling", "Process Optimisation", "Applied AI"],
    expertiseIt: ["Progettazione Software", "Modellazione Dati", "Ottimizzazione Processi", "AI Applicata"],
    // `stack` deliberately OMITTED — the source lists no languages or
    // frameworks. FounderPanel guards on `f.stack?.length`, so the "Ships
    // with" block simply does not render. Inventing chips here would be the
    // one unverifiable claim on the page.
    authorRole: "Software Engineer, SERSAN",
    authorBio:
      "Software engineer. Builds internal systems end to end, from requirements and data model through to the running software.",
  },
```

`previouslyAt` is **omitted deliberately**: that field renders under a "Previously" label directly parallel to Michele's J.P. Morgan / Revolut / Deloitte row, and a 3-month internship there reads as padding. It also keeps his `FounderCopy` child count at 5 (see Step 6).

### 1d. The exclusion export, after line 113

```ts
export const getFounder = (name: string) => founders.find((f) => f.name === name);

/** The two co-founders ONLY. Use this on any surface whose copy says the word
 * "founder". `founders` remains the FULL team and drives the home rail,
 * /about, and the WebGL morph. Keeping `founders` as the full list means the
 * two surfaces that MUST include Mattia need no import change at all, so the
 * blast radius is exactly the two that must exclude him. */
export const coFounders: FounderProfile[] = founders.filter((f) => f.kind === "founder");
```

`authorBios` / `authorUrls` (:115-121) keep iterating the **full** array, so `/about#mattia` resolves if he ever bylines an article.

### 1e. The two exclusion sites — land in this same step

| File | Line | Before | After |
|---|---|---|---|
| `src/app/contact/contact-client.tsx` | 7 | `import { founders } from "@/data/founders";` | `import { coFounders } from "@/data/founders";` |
| | 181 | `{founders.map((f) => (` | `{coFounders.map((f) => (` |
| `src/app/start/page.tsx` | 4 | `import { founders } from "@/data/founders";` | `import { coFounders } from "@/data/founders";` |
| | 106 | `{founders.map((f) => (` | `{coFounders.map((f) => (` |

Both are required, not cosmetic. contact-client.tsx:178 heading reads *"Talk to a founder" / "Scrivi a un founder"*; start/page.tsx:90-91 and :58 promise *"Read by one of the founders"* twice in prose above the list. Also update the now-false comment at start/page.tsx:102-104 ("these two people") to say it pulls `coFounders`.

**Do NOT touch `src/components/sections/who-and-why.tsx`.** Verified orphaned — a repo-wide grep for `who-and-why|WhoAndWhy` matches only inside the file itself (its own JSDoc, its `export default`, and its `aria-labelledby`/`id` pair). Its `md:grid-cols-2` and its "two founders" prose reach no user. Editing it is diff noise that falsely implies a live surface was fixed. Report it separately: *dead file, still says "two founders", delete or revive in its own commit.*

**Do NOT touch the `founders.*` i18n keys** (`en.ts`/`it.ts` :87-94) or `roleKey`/`bioKey`. Verified dead — no `t('founders.…')` read site exists. They were already wrong (named after `sebastiano`/`andrea`); a third person does not make them worse. Separate commit if wanted.

---

## 5. STEP 2 — Engine (`src/webgl/gpgpu/gpgpuNodeSim.ts`)

Four surgical edits. Every new node is gated on a **build-time JS boolean**, so the hero graph is untouched.

### 2a. `PortraitMorphOpts` — after `colorsB` (:845) and after `sizeB` (:851)

```ts
  /** count×3 LINEAR rgb for target B (index-matched to homeB). */
  colorsB: Float32Array;
  /** OPTIONAL count×3 LINEAR rgb for target C (index-matched to homeC).
   * Present ONLY on a real 3-target chain; absent → the exact 2-target graph.
   * MUST be passed together with `sizeC` — colour without ink chains the
   * photograph to C while leaving the disc size and alpha on B. */
  colorsC?: Float32Array;
  …
  sizeB?: Float32Array;
  /** OPTIONAL count floats 0..1: per-particle tonal weight for target C.
   * Requires sizeA + sizeB present. NOTE: there is deliberately no
   * colorsD/sizeD — a FOURTH portrait target would render target D's
   * positions with target C's colours. Add them if that day comes. */
  sizeC?: Float32Array;
```

Also amend the doc block at :818-825 ("target A and target B; the render blends both A→B") to say the portrait path supports an optional third target blended by `uMorph2` on the same stagger, **chained after** the A→B blend. And fix the stale line reference in the EXACTNESS NOTE at :1231 — it points at `FounderPortraitMorph.tsx:492-494`; the `uSizeComp` pins are at **:509-511**.

### 2b. Buffers — after `sizeBBuffer` (:946-948)

```ts
  const sizeBBuffer = hasPortraitSize
    ? instancedArray(portrait!.sizeB!.slice(), "float")
    : null;
  // Optional THIRD portrait target (A→B→C). Absent → the exact 2-target graph.
  const hasPortraitC = !!portrait?.colorsC;
  const colorCBuffer = hasPortraitC
    ? instancedArray(portrait!.colorsC!.slice(), "vec3")
    : null;
  const hasPortraitSizeC = hasPortraitSize && !!portrait?.sizeC;
  const sizeCBuffer = hasPortraitSizeC
    ? instancedArray(portrait!.sizeC!.slice(), "float")
    : null;
```

### 2c. Expressions — replace :1174-1181

Insert `portraitMorph2Expr` **between** `portraitMorphExpr` (:1167-1173, unchanged) and `portraitInkExpr`, and chain the ink through it. Order matters — `portraitMorph2Expr` must be declared first.

```ts
  /** Second-leg (B→C) stagger. MUST mirror the kernel's `m2` (line 1014)
   * EXACTLY — same 0.55 delay, same 0.45 window, same hash — or colour and
   * ink travel a different path than position. Self-contained expression,
   * never an outer `.toVar()` (VaryingNode hazard, see above). */
  const portraitMorph2Expr = hasPortraitC
    ? smoothstep(
        0.0,
        1.0,
        clamp(morph2N.sub(hash(instanceIndex).mul(0.55)).div(0.45), 0.0, 1.0),
      )
    : null;
  // `"float"` storage buffers are unpadded — NO `.xyz` on these reads.
  // CHAINED to match the kernel's `target`: mix(mix(A,B,m1), C, m2).
  const portraitInkExpr = hasPortraitSize
    ? hasPortraitSizeC
      ? mix(
          mix(
            sizeABuffer!.toAttribute(),
            sizeBBuffer!.toAttribute(),
            portraitMorphExpr!,
          ),
          sizeCBuffer!.toAttribute(),
          portraitMorph2Expr!,
        )
      : mix(
          sizeABuffer!.toAttribute(),
          sizeBBuffer!.toAttribute(),
          portraitMorphExpr!,
        )
    : null;
```

**Rewriting `portraitInkExpr` in place is what makes this cheap:** it is read in three downstream places — the vertex `Fn`'s `inkNow` (:1283), `portraitSizePxExpr` (:1240), and the `vInkF` varying (:1338). All three pick up the 3-way chain for free, so disc size, sub-pixel coverage compensation and fragment alpha stay in lockstep with no further edits.

### 2d. Varying — after :1337

```ts
  const vMorphColorF = hasPortrait ? varying(portraitMorphExpr!) : null;
  const vMorphColor2F = hasPortraitC ? varying(portraitMorph2Expr!) : null;   // ← ADD
  const vInkF = hasPortraitSize ? varying(portraitInkExpr!) : null;
```

### 2e. Fragment colour chain — after :1373

```ts
      const base = mix(cA, cB, vMorphColorF!).toVar();
      if (hasPortraitC) {
        // `.xyz` MANDATORY: a "vec3" storage buffer pads to 4 components.
        base.assign(mix(base, colorCBuffer!.toAttribute().xyz, vMorphColor2F!));
      }
```

`hasPortraitC` is a JS build-time boolean, so the 2-target and hero graphs emit nothing extra.

---

## 6. STEP 3 — Sampler (`src/webgl/image/sampleImagePoints.ts`)

`readGrid` (:166-329) and `emit` (:332-389) are **already single-image and need no signature change**. `readGrid` measures its own backdrop from its own top corners (:221-243) and runs its own border-seeded flood fill (:254-297); nothing about either is pair-scoped. Only the top-level function is pair-shaped.

### 3a. Rename the spec type — `:50`, plus its three internal uses at `:168`, `:335`, `:401`

`PortraitPairSpec` → `PortraitSpec`. The interface body is already fully per-image and count-agnostic; only the *name* asserts a pair. No back-compat alias — there is one consumer.

### 3b. Replace `PortraitPair` (:100-111) with `PortraitSet`

```ts
export interface PortraitSet {
  /** One entry per input image, in input order. `points[k].xy[j*2]` and
   * `points[m].xy[j*2]` are the SAME grid cell for every k, m — that shared
   * index is what pairs particle `j` across every leg of the morph. */
  points: PortraitPoints[];
  /** Final instance count — the caller's particle count FOLLOWS this. */
  count: number;
  /** UNION cells found, BEFORE any stride subsample (the calibration number).
   * GROWS monotonically with each portrait added: a cell joins if ANY portrait
   * inks it. Watch this against `spec.maxCount` — the stride is an INTEGER
   * CLIFF and crossing it halves the count for EVERY portrait at once. */
  sharedCells: number;
  /** Subsample stride used to reach `count` (1 = none). */
  stride: number;
  gridW: number;
  gridH: number;
}
```

### 3c. Fix the doc comment at `:80-81`

`"the SAME shared cell in both images of a pair"` → `"the SAME shared cell in EVERY image of the set … A cell that is ink in only ONE portrait still exists in all the others, there with ink 0 — the cell list is a UNION, never an intersection."`

Also update the header bullet at `:27-31` from "Both portraits" to "EVERY portrait in the set … A↔B↔C index pairing". **Do not touch line 33** — "the two TOP corner patches" refers to the two corners of *one* image and is still correct.

### 3d. Replace `samplePortraitPair` (:391-435) with the N-ary primitive

```ts
/**
 * Sample N founder portraits onto ONE shared grid and return index-paired
 * per-particle arrays. The instance count FOLLOWS the sampler (one particle
 * per union cell, uniformly strided down to `spec.maxCount` if the grid
 * overshoots) — never the other way round, because padding to a fixed count
 * means duplicates, and duplicates were the bug.
 *
 * THE CELL LIST IS A UNION, AND IT GROWS WITH N. A cell joins if ANY portrait
 * inks it above `inkCut`; portraits that do NOT ink it still emit it, at ink
 * 0, and the renderer collapses it (PORTRAIT_SIZE_MIN). Adding a portrait
 * therefore never removes coverage — but `stride` is an INTEGER CLIFF against
 * `maxCount`, so re-measure `sharedCells` whenever a portrait is added,
 * especially a DARK-CLOTHED one whose garment sits far from the measured
 * backdrop colour and inks at ~1.0 across the whole torso. Retarget the grid
 * with `scale = sqrt(wanted / measured)`.
 */
export function samplePortraitSet(
  images: HTMLImageElement[],
  spec: PortraitSpec,
): PortraitSet | null {
  if (images.length === 0) return null;
  const reads: GridRead[] = [];
  for (const img of images) {
    const rd = readGrid(img, spec);
    if (!rd) return null; // one bad decode invalidates the shared grid
    reads.push(rd);
  }

  // --- Shared cell list: the UNION of every ink ----------------------------
  // Index j in the output arrays is cells[j] in EVERY image, so particle j
  // morphs from its own cell in A to the SAME cell in B, then in C.
  const total = spec.gridW * spec.gridH;
  const hits: number[] = [];
  for (let i = 0; i < total; i++) {
    let maxInk = 0;
    for (let k = 0; k < reads.length; k++) {
      const v = reads[k].ink[i];
      if (v > maxInk) maxInk = v;
    }
    if (maxInk > spec.inkCut) hits.push(i);
  }
  const sharedCells = hits.length;
  if (sharedCells === 0) return null;

  // Over the tier ceiling → FIXED uniform stride. Never a random subsample
  // (that reintroduces clumping) and never a duplicate pad.
  const stride =
    sharedCells > spec.maxCount ? Math.ceil(sharedCells / spec.maxCount) : 1;
  const count = Math.ceil(sharedCells / stride);
  const cells = new Int32Array(count);
  for (let j = 0; j < count; j++) cells[j] = hits[j * stride];

  return {
    points: reads.map((rd) => emit(rd, cells, spec)),
    count,
    sharedCells,
    stride,
    gridW: spec.gridW,
    gridH: spec.gridH,
  };
}
```

At N = 2 the inner max-loop reduces **exactly** to the old `Math.max(readA.ink[i], readB.ink[i])`, so this is provably output-identical for the existing pair. Returning `points[]` rather than `{a,b,c}` avoids another rename at N = 4.

### 3e. One doc addendum at `BG_FILL_TOL` (:121-125), no value change

Append: *"Backdrop detection is PER-PORTRAIT (colour + flood fill both run inside `readGrid` on one image), so adding a portrait cannot perturb the others. It does assume each portrait's backdrop is far in colour from its subject's CLOTHING — a dark garment against a dark backdrop would sit within `BG_FILL_TOL` of the wall and the fill could walk into the torso from the side seeds above `BG_FILL_ROW_LIMIT`."* **Verified safe for Mattia: his backdrop is pure white and his jacket's `dist` ≈ 0.81, fourteen times the 0.055 tolerance.**

---

## 7. STEP 4 — Store (`src/webgl/store/foundersMorphStore.ts`)

**Design decision, settled:** the continuous scalar widened to `0..MORPH_MAX`, with `stage` kept as a **derived** union. Rejected the alternative (a `morphing2` in-flight token) because **no consumer asks which leg is in flight** — all four readers of `"morphing"` ask either "is a leg in flight?" (absorb input :925/:957, hide hint :694/:802) or "which locked end am I on?" (step direction). Splitting it would force every one of those to become a two-value test and buy nothing.

The scalar's payoff: the existing clock `cur + dir*delta/MORPH_DURATION` (FounderPortraitMorph.tsx:659-663) stays **byte-identical**, because one leg is exactly 1.0 of the scalar. Only the clamp ceiling changes.

### 4a. Replace `:63` and add the shared leg algebra

```ts
import { founders } from "@/data/founders";

export type FounderStage = "A" | "B" | "C" | "D" | "morphing";

/** Locked stages in rail order; index == the integer value of `morph`.
 * HARD CAP 4: the compute engine has exactly four home targets
 * (homeA..homeD / uMorph..uMorph3, gpgpuNodeSim.ts:876-879). */
export const STAGE_ORDER = ["A", "B", "C", "D"] as const;
/** People on the rail — the gate counter's denominator (01/03 …). */
export const STAGE_TOTAL = founders.length;
/** Morph LEGS (people − 1). `morph` spans 0..MORPH_MAX. */
export const MORPH_MAX = STAGE_TOTAL - 1;
/** Lock tolerance: within this of an integer the stage counts as LOCKED.
 * MUST stay 0.02 — founders-rail's COPY_ENTER_END is authored as 1 − LOCK_EPS
 * so a leg can never lock with copy still mid-flight. */
export const LOCK_EPS = 0.02;

/** Locked-stage index 0..MORPH_MAX, or -1 while a leg is in flight. */
export const stageIndex = (s: FounderStage): number =>
  s === "morphing" ? -1 : STAGE_ORDER.indexOf(s as (typeof STAGE_ORDER)[number]);

/** THE single derivation of stage from the live scalar (island writes it). */
export const stageFromMorph = (m: number): FounderStage => {
  for (let i = 0; i <= MORPH_MAX; i++) {
    if (Math.abs(m - i) <= LOCK_EPS) return STAGE_ORDER[i];
  }
  return "morphing";
};

/** Current leg 0..MORPH_MAX-1 (which pair of portraits is in play). */
export const legOf = (m: number): number =>
  Math.min(Math.max(Math.floor(m), 0), Math.max(MORPH_MAX - 1, 0));

/** Progress 0..1 WITHIN the current leg — the value every copy/poster window
 * (COPY_EXIT_*, COPY_ENTER_*, the poster smoothstep) was authored against. */
export const legFract = (m: number): number => m - legOf(m);
```

`stageFromMorph` is **numerically identical to today at N=2**: `m ≤ 0.02 → "A"`, `m ≥ 0.98 → "B"`, else `"morphing"` — exactly FounderPortraitMorph.tsx:670. `legOf(MORPH_MAX)` clamps to `MORPH_MAX-1` so `legFract(2) = 1` and the envelope closes at `sin(π) = 0`.

Deriving `STAGE_TOTAL` from `founders.length` is deliberate: it kills the parallel-array class of bug that made `FOUNDER_SLUGS` a hazard. The cost is `morphTarget` widening from the literal union `0|1` to `number` — an acceptable trade, since the union never prevented an invalid value anyway.

### 4b. Field types

| Line | Before | After |
|---|---|---|
| 81 | `morphTarget: 0 \| 1;` | `morphTarget: number;` *(integer 0..MORPH_MAX; the gate only ever steps by one)* |
| 84 | `/** Live uMorph 0..1 … */`<br>`morph: number;` | `/** Live rail scalar 0..MORPH_MAX — leg-major (1.0 = target B fully formed). floor() = leg, fract() = leg progress; use legOf()/legFract(), never raw arithmetic. */`<br>`morph: number;` |
| 106 | `setMorphTarget: (morphTarget: 0 \| 1, immediate?: boolean) => void;` | `setMorphTarget: (morphTarget: number, immediate?: boolean) => void;` |
| 123 | `morphTarget: 0 as 0 \| 1,` | `morphTarget: 0,` |

The `setMorphTarget` **implementation** (:143-144) needs no change. `stage: "A"` and `morph: 0` in `INITIAL` are already correct — the entry always assembles Alessandro first.

### 4c. Header doc (`:14-23` and `:30-31`)

Rewrite for the three-stage rail: `A` (Alessandro, morph 0) → gesture → auto-play leg 0 → `B` (Michele, morph 1) → gesture → auto-play leg 1 → `C` (Mattia, morph 2) → gesture → RELEASE; symmetric upward. **State explicitly that B is now a MIDDLE stage from which neither direction releases** — Escape (:1016) and the `G_MAX_ENGAGE_MS` timer are the only outs from B. That is a real behaviour change and must be written down, not discovered.

Update the `getGate` doc at `:181` to `{ engaged, stage: 'A'|'B'|'C'|'morphing', morphTarget: 0|1|2, armed, accum }`. Both `FoundersGateApi` members are typed `unknown`, so **no signature change** — the three-stage values flow through untouched.

---

## 8. STEP 5 — Island (`src/webgl/FounderPortraitMorph.tsx`)

### 5a. Imports (:68-78)

```ts
import {
  useFoundersMorphStore,
  foundersGateApi,
  MORPH_MAX,
  stageFromMorph,
  legFract,
} from "./store/foundersMorphStore";
…
import type { PortraitSet, PortraitSpec, PortraitPoints } from "./image/sampleImagePoints";
```

Update the three `PortraitPairSpec` uses at `:120`, `:200`, `:290` to `PortraitSpec`.

### 5b. Budget (:83-96) — **the one required value change**

```ts
const MAX_COUNT_BY_TIER: Record<"full" | "lite", number> = {
  full: 72000,   // was 48000 — see the grid comment below
  lite: 16000,
};
```

and extend the `GRID_W/GRID_H` comment (:89-94):

> `290×405 = 117,450 grid cells. The TWO-portrait union measured 42,087 shared cells at stride 1. The union is MONOTONE in image count, and Mattia's navy jacket saturates ink ≈ 1.0 across ~85% of the frame width where the other two's white shirts sit at ≈ 0.03 — so the THREE-portrait union is expected around 50–62k. The ceiling was raised to 72,000 so `stride` stays 1 (the integer stride is a cliff — one cell over halves the count for ALL THREE faces and reads as uniformly SOFT, not sparse, because `spacingDev` auto-grows the discs). Verify with `__sersanFounderMorph.getSampler()`; if `sharedCells > 60000`, prefer shrinking the grid by `scale = sqrt(52000 / sharedCells)` over raising the ceiling again.*

### 5c. Delete `FOUNDER_SLUGS` (:168), derive the slug from the data

```ts
/** Headshot asset discovery — preferred over the environmental fallback. */
const HEADSHOT_EXTS = ["webp", "jpg", "png"];
/** Morph targets in the chain, A→B→C. Capped at 4 by the compute engine
 * (homeA..homeD). Derived from the data so a slug list can never drift. */
const TARGET_COUNT = Math.min(founders.length, 4);
```

`loadFounder` (:219-229) becomes:

```ts
async function loadFounder(idx: number): Promise<HTMLImageElement> {
  const f = founders[idx];
  if (!f) throw new Error(`no founder at index ${idx}`);
  // The slug IS the data anchor — /public/founders/<anchor>-headshot.<ext>.
  for (const ext of HEADSHOT_EXTS) {
    try {
      return await loadImg(`/founders/${f.anchor}-headshot.${ext}`);
    } catch {
      /* try next extension / fall back */
    }
  }
  if (!f.image) throw new Error(`no portrait asset for founder ${f.name}`);
  return loadImg(f.image);
}
```

This closes the silent-wrong-face hazard: the old `FOUNDER_SLUGS[idx] ?? FOUNDER_SLUGS[0]` would have loaded **Alessandro's headshot as target C** with no error.

### 5d. Refs + load effect (:241-243, :297-322)

```ts
  const imgsRef = useRef<HTMLImageElement[]>([]);
  const setRef = useRef<PortraitSet | null>(null);      // was pairRef
```

```ts
    void Promise.all([
      Promise.all(
        Array.from({ length: TARGET_COUNT }, (_, i) => loadFounder(i)),
      ),
      import("./image/sampleImagePoints"),
    ])
      .then(([imgs, mod]) => {
        if (cancelled) return;
        imgsRef.current = imgs;
        sampleModRef.current = mod;
        // ONE call samples ALL portraits onto the shared grid — that shared
        // cell list is what index-pairs particle j across A, B and C.
        setRef.current = mod.samplePortraitSet(imgs, sampleSpec());
        setSampleEpoch((e) => e + 1);
      })
      .catch((err) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("[FounderPortraitMorph] portrait load/sample failed", err);
        }
      });
```

The bare `.catch(() => {})` at :316 currently swallows a total failure into a silently blank founders stage. Log it in dev.

**Rename `pairRef` → `setRef` at ALL five sites: :334, :557-561, :762, :770, :843.** A partial rename leaves a stale `pair.a` read.

### 5e. `buildNowRef` head (:330-338)

```ts
    const set = setRef.current;
    …
    if (!set || !webgpu || !tslNs || !mod) return;
    const pts = set.points;
    if (pts.length < 2) return;
    // The instance count FOLLOWS the sampler (one particle per shared cell).
    const count = set.count;
```

### 5f. Fit + world scale (:366-402)

```ts
    // --- WORLD-SCALE FIT: map the sampled FACE extent onto the stage rect ----
    // ALL targets SHARE ONE scale (paired morph → short travel): fit the
    // LARGEST extent across every portrait so no face overflows the stage.
    // NOTE: the fit is Y-BOUND iff maxHalfX <= 0.75 * maxHalfY (0.75 = the
    // stage's aspect-[3/4]). A subject whose CLOTHING inks strongly — a dark
    // jacket against a light backdrop — can push halfExtentX past that and
    // flip the fit to X-bound, shrinking EVERY face. Check getSampler().
    const halfX = Math.max(...pts.map((p) => p.halfExtentX), 1e-3);
    const halfY = Math.max(...pts.map((p) => p.halfExtentY), 1e-3);
```

```ts
    let maxAbsZ = 1e-4;
    for (const p of pts) {
      for (let i = 0; i < count; i++) {
        const za = Math.abs(p.z[i]);
        if (za > maxAbsZ) maxAbsZ = za;
      }
    }
```

```ts
    const homes = pts.map(toWorld);
    const homeA = homes[0];
    const homeB = homes[1] ?? homeA;
    const homeC = homes[2] ?? homeB;   // N=2 → identical to today
    const homeD = homes[3] ?? homeC;   // inert 4th leg = a true identity mix
```

### 5g. Rebuild seed (:422-424)

```ts
    if (keepEntry) {
      // Snap to the NEAREST locked stage — a resize while parked on Mattia
      // must seed at homeC, not spring back across from Michele.
      const k = THREE.MathUtils.clamp(Math.round(morphRef.current), 0, MORPH_MAX);
      seed = (homes[k] ?? homeA).slice();
    } else {
```

`Math.round(0.5) === 1` reproduces today's `>= 0.5 ? homeB : homeA` exactly.

### 5h. Build call (:459-512)

```ts
      homeA,
      homeB,
      homeC,
      homeD,
      count,
      { /* sim params UNCHANGED */ },
      seed,
      {
        colorsA: pts[0].rgb,
        colorsB: (pts[1] ?? pts[0]).rgb,
        // Real third target: colour AND ink, or the C leg renders Mattia's
        // POSITIONS with Michele's face (ink gates size, alpha and the Discard).
        colorsC: pts[2]?.rgb,
        sizeA: pts[0].ink,
        sizeB: (pts[1] ?? pts[0]).ink,
        sizeC: pts[2]?.ink,
        blending: "normal",
        depthTest: false,
        depthWrite: false,
        emissive: emissiveRef.current,
        travelTint: [0.16, 2.4, 3.0],
        spacingDev,
      },
```

`pts[2]?.rgb` is `undefined` at N=2 → `hasPortraitC` false → the exact 2-target graph. Leave `built.uMorph3.value = 0` and **`uSizeComp`/`uSizeComp2`/`uSizeComp3` at 1** (:509-511) exactly as they are.

Then replace the two `built.uMorph.value = morphRef.current` writes (:518, :525) with one helper used by all three branches:

```ts
    const applyMorph = (p: number) => {
      built.uMorph.value = THREE.MathUtils.clamp(p, 0, 1);
      built.uMorph2.value = THREE.MathUtils.clamp(p - 1, 0, 1);
      built.uMorph3.value = THREE.MathUtils.clamp(p - 2, 0, 1); // ≡ 0 at N=3
    };
```

`keepEntry` → `uAssemble = 1; applyMorph(morphRef.current); entryRef.current = 1;`
`preserveState` → `uAssemble = entryRef.current; applyMorph(morphRef.current);`
fresh → `uAssemble = 0; applyMorph(0); morphRef.current = 0;` (rest of :526-537 unchanged).

### 5i. `resampleNowRef` (:554-560)

```ts
    const mod = sampleModRef.current;
    const imgs = imgsRef.current;
    if (!mod || imgs.length < TARGET_COUNT) return;
    tuningRef.current = { ...tuningRef.current, ...opts };
    const next = mod.samplePortraitSet(imgs, sampleSpec());
```

All targets must be re-sampled by the **one** call or they drift onto different grids — the invariant the comment at :550-552 spells out.

### 5j. THE FRAME LOOP (:648-674) — the heart of the change

```ts
    const override = morphOverrideRef.current;
    if (override != null) {
      morphRef.current = THREE.MathUtils.clamp(override, 0, MORPH_MAX);
      if (store.morphImmediate) store.setMorphImmediate(false);
    } else {
      if (store.morphImmediate) {
        morphRef.current = store.morphTarget;
        store.setMorphImmediate(false);
      }
      const target = store.morphTarget;
      const cur = morphRef.current;
      if (cur !== target) {
        const dir = target > cur ? 1 : -1;
        // UNCHANGED RATE: one unit of the scalar IS one leg, so MORPH_DURATION
        // stays PER-LEG and the shipped feel is preserved exactly.
        morphRef.current = THREE.MathUtils.clamp(
          cur + (dir * delta) / MORPH_DURATION,
          0,
          MORPH_MAX,
        );
      }
    }
    const p = THREE.MathUtils.clamp(morphRef.current, 0, MORPH_MAX);
    // Deriving BOTH uniforms from one progress scalar is what guarantees
    // uMorph is EXACTLY 1 before uMorph2 leaves 0 — the precondition for the
    // kernel's CHAINED target blend to describe a real B→C path (gpgpu 1010-15).
    b.uMorph.value = Math.min(p, 1);
    b.uMorph2.value = THREE.MathUtils.clamp(p - 1, 0, 1);
    b.uMorph3.value = THREE.MathUtils.clamp(p - 2, 0, 1);
    if (Math.abs(store.morph - p) > 1e-4) store.setMorph(p);
    const nextStage = stageFromMorph(p);
    if (store.stage !== nextStage) store.setStage(nextStage);

    // Flight envelope: PER LEG. EXACTLY 0 at every locked stage, peaking
    // mid-leg. sin(p·π) would go NEGATIVE for p ∈ (1,2] — inverting uSpread,
    // dollying AWAY, orbiting backwards, and doubling restEnv to 2.
    const env = Math.sin(legFract(p) * Math.PI);
```

Everything downstream of `env` — `uSpread` (:675), dolly (:701), yaw/pitch (:724-729), `restEnv`/breath (:723, :746) — is then automatically correct and needs **no edit**.

### 5k. Dev handle (:769-839)

```ts
      getSampler() {
        const s = setRef.current;
        if (!s) return null;
        const meanInk = (pt: PortraitPoints) => {
          let t = 0;
          for (let i = 0; i < s.count; i++) t += pt.ink[i];
          return t / Math.max(s.count, 1);
        };
        return {
          gridW: s.gridW, gridH: s.gridH,
          sharedCells: s.sharedCells, stride: s.stride,
          count: s.count, maxCount,
          meanInk: s.points.map(meanInk),                          // [A, B, C]
          halfExtent: s.points.map((pt) => [pt.halfExtentX, pt.halfExtentY]),
        };
      },
      getUniforms() {
        const bb = buildRef.current;
        return {
          uAssemble: bb?.uAssemble.value ?? 0,
          uMorph: bb?.uMorph.value ?? 0,
          uMorph2: bb?.uMorph2.value ?? 0,     // ← ADD
          progress: morphRef.current,          // ← ADD (0..MORPH_MAX)
          uFade: bb?.uFade.value ?? 0,
          uSpread: bb?.uSpread.value ?? 0,
          emissive: bb?.uEmissive?.value ?? emissiveRef.current,
          pointSize: bb?.uPointSize.value ?? 0,
        };
      },
      setMorph(v: number | null) { morphOverrideRef.current = v; },   // doc: 0..MORPH_MAX
      setStage(s: string) {
        morphOverrideRef.current = null;
        const t = Math.max(0, STAGE_ORDER.indexOf(s as never));
        useFoundersMorphStore.getState().setMorphTarget(Math.min(t, MORPH_MAX), true);
      },
      /** Advance/retreat exactly ONE leg from the current progress. */
      playMorph(dir: number) {
        morphOverrideRef.current = null;
        const cur = Math.round(morphRef.current);
        const t = THREE.MathUtils.clamp(cur + (dir >= 0 ? 1 : -1), 0, MORPH_MAX);
        useFoundersMorphStore.getState().setMorphTarget(t, false);
      },
```

Without `uMorph2` exposed, QA cannot distinguish "parked at B" from "parked at C" — both report `uMorph: 1`. Without the `playMorph` fix, stage C is unreachable from the dev handle and the whole QA loop is blocked.

### 5l. Module doc block (:12-17, :20-28, :43-45)

Rewrite for the three-target chain. Specifically :43-45 currently claims *"homeC/homeD = homeB, uMorph2/uMorph3 stay 0 (single A→B leg)"* — replace with the real wiring and the sequencing invariant. Leaving it would actively mislead about the subtlest part of the change.

---

## 9. STEP 6 — Gate (`src/components/sections/founders-rail.tsx`)

### 6a. The pinned scroll window — **zero extra pixels**

This is the trap. `measure()` (:783-790):

```ts
    const measure = () => {
      // No travel (gate model): the section is exactly one viewport tall …
      section.style.height = `${window.innerHeight}px`;
      const secTop = section.getBoundingClientRect().top + window.scrollY;
      store.setLayout(0, secTop);
      store.bumpMeasure();
    };
```

`travel` is literally **0**. The hold is produced by `lenis.stop()` plus the per-frame re-snap in `tick()` (:1097-1121), **not** by a tall runway. A third stage costs **no scroll length at all**. Anyone who "makes room" by growing the section height creates dead space the gate immediately re-snaps away from, and moves the `[data-line-anchor="founders"]` waypoint the header warns about at :46-50. **`measure()` and the resize handler (:1194-1199) are UNCHANGED** — extend their comments only, to say the section stays one viewport tall regardless of stage count and that the runway is TIME, not px.

**What lengthens is the TIME budget.** `:87-88`:

```ts
/** Max time (ms) the gate may hold the page before force-releasing (safety).
 * Scales with the number of LEGS: each leg costs MORPH_DURATION (1.4s) plus a
 * G_IDLE_MS re-arm plus human dwell before the next gesture. 16s covered ONE
 * leg; two legs plus the entry lock need ~24s or a deliberate reader is
 * ejected mid-sequence by the safety valve. */
const G_MAX_ENGAGE_MS = 8000 + 8000 * (founders.length - 1);   // 16000 → 24000
```

**The formula reproduces today's 16000 exactly at N = 2**, which is why it is the right shape. `founders` is already imported at :16, so this evaluates at module scope.

### 6b. Imports (:20-22)

```ts
import {
  useFoundersMorphStore,
  foundersGateApi,
  MORPH_MAX,
  stageIndex,
  legOf,
  legFract,
} from "@/webgl/store/foundersMorphStore";
```

### 6c. `step()` — THE state machine (:923-939)

The semantic shift: today "far end" is a property of the **stage** (B releases down, A releases up) — which works only because with two stages every locked stage *is* an extreme end. With three, Michele is far-end for **neither** direction. Encode it as a bounds check:

```ts
    // One discrete gesture → advance ONE leg, or RELEASE at a sequence
    // BOUNDARY. Release is no longer a letter test: it is "there is no next
    // node in this direction". INTERIOR nodes (Michele at N=3) morph in BOTH
    // directions and can never release — which is exactly the old "a near-end
    // gesture can only morph, never release" anti-trap guarantee, generalised.
    const step = (dir: number) => {
      const s = useFoundersMorphStore.getState();
      if (s.stage === "morphing" || !s.assembleDone) return; // absorb mid-play
      const i = stageIndex(s.stage);      // 0..MORPH_MAX; never -1 past the guard
      const next = i + (dir > 0 ? 1 : -1);
      if (next < 0) return release(-1);           // far end (up) → release upward
      if (next > MORPH_MAX) return release(1);    // far end (down) → release down
      s.setMorphTarget(next, false);              // interior → play one leg, STAY engaged
      armed = false;
    };
```

Shorter than the code it replaces, and correct for any N. `release()` (:896-918) is already purely direction-driven — **no change**. `consume()` (:941-970) is stage-agnostic apart from the `=== "morphing"` absorb — **no change**.

### 6d. `engage()` (:855, :870) and its two call sites (:1148, :1150)

```ts
    const engage = (initIndex: number) => {        // 0 = first, MORPH_MAX = last
      …
      s.setMorphTarget(initIndex, true);
```

```ts
          if ((fromTop || fromBottom) && rect.bottom > 0 && top < ihNow) {
            engage(fromBottom ? MORPH_MAX : 0);    // was: fromBottom ? "B" : "A"
          } else if (inside) {
            engage(0);                              // reload landed inside
          }
```

`engage("B")` is a literal two-target encoding. Arriving upward from below must pin **Mattia**, or a user scrolling up into the section is dropped mid-rail at Michele and the very first up-gesture plays a leg backward from a stage they never saw. Everything else in `engage` (the disarm, the `G_IDLE_MS` re-arm, the Lenis snap, `showChrome`) is index-agnostic and stays byte-identical.

### 6e. `getGate()` (:985-994)

Add `stageIndex: stageIndex(s.stage),` alongside `stage`. QA of this change depends entirely on `foundersGateApi` — the wheel path is momentum-flaky by design (comment :972-974), and with three nodes the index is the unambiguous assertion.

---

## 10. STEP 7 — DOM (copy handoff, posters, chrome, `/about`)

### 7a. Refs (:556-559) → arrays

```ts
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stageImgRefs = useRef<(HTMLImageElement | null)[]>([]);
```

Do **not** switch to `querySelectorAll` — the gate effect reads these synchronously at :597-604 where refs are already committed, and a query would be order-fragile against the poster imgs sharing `[data-founder-media]`.

### 7b. Writer construction (:596-642) → one uniform per-block bundle

Every block gets **both** a block-level exit writer and per-child enter writers. Block 0's enter always evaluates to 1 and block N−1's exit always to 0 — they fall out of the math with **no special-casing**.

```ts
    const N = founders.length;
    type BlockFx = {
      el: HTMLElement;
      setOp: (v: number) => void;
      setY: (v: number) => void;
      children: {
        el: HTMLElement; start: number; dur: number;
        setO: (v: number) => void; setY: (v: number) => void;
      }[];
      lastHidden: boolean | null;
    };
    const blocks: BlockFx[] = [];
    copyRefs.current.slice(0, N).forEach((el, i) => {
      if (!el) return;
      gsap.set(el, { opacity: 1, y: 0 });
      const kids = Array.from(el.querySelectorAll<HTMLElement>(":scope > div > *"));
      // dur is PER BLOCK: FounderCopy renders a `previouslyAt` row only when
      // present, so Michele has 6 children where Alessandro and Mattia have 5.
      // A single shared dur would land their last child at 0.945 instead of
      // COPY_ENTER_END (0.98) — early, not late, but still off the lock.
      const dur = Math.max(
        0.06,
        COPY_ENTER_END - COPY_ENTER_START - (kids.length - 1) * COPY_ENTER_STAGGER,
      );
      const children = kids.map((k, j) => {
        gsap.set(k, i === 0 ? { opacity: 1, y: 0 } : { opacity: 0, y: COPY_ENTER_Y });
        return {
          el: k,
          start: COPY_ENTER_START + j * COPY_ENTER_STAGGER,
          dur,
          setO: gsap.quickSetter(k, "opacity") as (v: number) => void,
          setY: gsap.quickSetter(k, "y", "px") as (v: number) => void,
        };
      });
      blocks[i] = {
        el,
        setOp: gsap.quickSetter(el, "opacity") as (v: number) => void,
        setY: gsap.quickSetter(el, "y", "px") as (v: number) => void,
        children,
        lastHidden: null,
      };
    });
    const setImgs = stageImgRefs.current
      .slice(0, N)
      .map((el) => (el ? (gsap.quickSetter(el, "opacity") as (v: number) => void) : null));
```

Block opacity multiplies child opacity in the compositor, so exit-on-the-block and enter-on-the-children compose without fighting — which is exactly how the shipped A/B pair already behaves.

### 7c. `applyStage` (:728-781) — the whole cross-fade, generalised

```ts
    let posterShown = false;
    const applyStage = (m: number) => {
      const hidePosters = useFoundersMorphStore.getState().active || !posterShown;
      for (let i = 0; i < N; i++) {
        const local = m - i;     // > 0 while this block is DEPARTING
        const u = local + 1;     // 0..1 across the leg that BRINGS it in
        const exitT = smoothstep(COPY_EXIT_START, COPY_EXIT_END, local);
        const b = blocks[i];
        if (b) {
          b.setOp(1 - exitT);
          b.setY(-COPY_EXIT_Y * exitT);
          for (const c of b.children) {
            const e = smoothstep(c.start, c.start + c.dur, u);
            c.setO(e);
            c.setY(COPY_ENTER_Y * (1 - e));
          }
          // Fully exited OR not yet entering → out of hit-testing AND the tab
          // order. An invisible LinkedIn link must never take a click or a Tab.
          const hidden = exitT >= 1 || u <= COPY_ENTER_START;
          if (hidden !== b.lastHidden) {
            b.lastHidden = hidden;
            b.el.style.visibility = hidden ? "hidden" : "";
          }
        }
        // Poster i = (entering weight) × (1 − exiting weight). Both legs use
        // the SAME 0.35/0.65 window, so the visible posters sum to exactly 1
        // at every m and the seam at integer m is one poster at 1 — no flash,
        // no dip. Fallback-only (gated on !active).
        const set = setImgs[i];
        if (set) {
          set(hidePosters ? 0 : smoothstep(0.35, 0.65, u) * (1 - smoothstep(0.35, 0.65, local)));
        }
      }
      if (setChromeLine) {
        // Normalised to the WHOLE sequence — raw m would overshoot the
        // 16rem track by 2× on leg 2.
        const q = Math.round((m / Math.max(1, MORPH_MAX)) * 512) / 512;
        if (q !== lastLineQ) { lastLineQ = q; setChromeLine(q); }
      }
      if (chromeCounterEl) {
        // Math.round is half-up, so this flips at each leg MIDPOINT — exactly
        // reproducing today's `m >= 0.5 ? "02" : "01"` and extending it.
        const label = String(Math.min(Math.round(m), MORPH_MAX) + 1).padStart(2, "0");
        if (label !== lastCounter) { lastCounter = label; chromeCounterEl.textContent = label; }
      }
    };
```

Delete the now-unused `lastAHidden` / `lastBHidden` latches (:729-730). Call sites at :794, :800, :815 keep passing the raw `m` — unchanged.

**Verified edge behaviour** (this is why no branches are needed):
- Block 0: `local = m ≥ 0`, so `u ≥ 1 > COPY_ENTER_END` → every child saturates at 1. Permanently "entered", exactly as today. Hidden iff `m ≥ 0.3` — matches today.
- Block N−1: `local ≤ 0` → `exitT = 0`. Never exits. Hidden iff `u ≤ 0.7`.
- Block 1 (Michele) is now a **middle** block and correctly gets both: enters over `m ∈ [0.7, 0.98]` via children, exits over `m ∈ [1.02, 1.3]` via block opacity.
- Posters at m = 0.5: block 0 → `1 × (1 − 0.5) = 0.5`; block 1 → `0.5 × 1 = 0.5`. Sum 1. At m = 1: block 1 → `1 × 1 = 1`, others 0. At m = 1.5: block 1 → `1 × 0.5`, block 2 → `0.5 × 1`. Sum 1. ✓

The **COPY_* constants at :96-109 keep their exact values** — they are simply re-framed as leg-local. That is the single biggest saving in the change and guarantees the A→B leg is byte-identical to what ships today. Update their comment block to say so.

### 7d. Teardown (:1243-1253)

```ts
      blocks.forEach((b, i) => {
        if (!b) return;
        gsap.set(b.el, i === 0 ? { opacity: 1, y: 0 } : { opacity: 0, y: 0 });
        b.el.style.visibility = "";
        b.children.forEach((c) => gsap.set(c.el, { clearProps: "opacity,transform" }));
      });
```

Must settle to the stage-0 rest pose matching `store.reset()`. A stale `visibility: hidden` or a stale opacity 1 on Mattia would leak into a horizontal-rail / native remount.

### 7e. JSX — posters (:1561-1589), copy (:1590-1612), counter (:1636-1638)

```tsx
                <div data-founder-stage className="relative mx-auto aspect-[3/4] w-full max-w-[26rem]">
                  {founders.map((f, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={f.anchor}
                      ref={(el) => { stageImgRefs.current[i] = el; }}
                      src={f.image}
                      alt={`${f.name}, ${isEn ? f.roleEn : f.roleIt}`}
                      data-founder-media
                      draggable={false}
                      style={{ opacity: 0 }}
                      className="absolute inset-0 h-full w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
                <div className="relative min-h-[26rem]">
                  {founders.map((f, i) => (
                    <div
                      key={f.anchor}
                      ref={(el) => { copyRefs.current[i] = el; }}
                      className="absolute inset-x-0 top-0"
                      style={i === 0 ? undefined : { opacity: 0 }}
                    >
                      <FounderCopy f={f} index={i} total={total} isEn={isEn} />
                    </div>
                  ))}
                </div>
```

The poster uses `f.image` (the DOM poster, `mattia-scattu.webp`) — **not** the headshot; the sampler's headshot preference lives in the island. The inline `opacity: 0` on `i > 0` preserves the documented SSR contract at :618-623. `FounderCopy` and `FounderPanel` need **no change** — both are already generic over `(f, index, total)`, counters are computed (`:209`), `previouslyAt` is optional-guarded (`:236`), and SVG filter ids come from `useId()`.

Counter denominator at `:1637`:

```tsx
                  <span className="text-[11px] tracking-[0.18em] text-ink-dim">
                    / {String(total).padStart(2, "0")}
                  </span>
```

`"01"` at `:1634` stays literal — it is the SSR seed `applyStage` overwrites via `textContent`, and it is correct for any N. Update the stale comments at `:1616` ("01/02 → 02/02") and `:36-51`.

### 7f. `/about` — the 3-up grid (`src/app/about/about-client.tsx`)

| Line | Before | After |
|---|---|---|
| 143 | `{isEn ? "The founding pair" : "La coppia fondatrice"}` | `{isEn ? "The team" : "Il team"}` — *renders as "THE TEAM"; `.eyebrow` uppercases in CSS* |
| 151 / 158 | `Two operators.` / `Due operatori.` | `Three operators.` / `Tre operatori.` — **word only**; keep the element, `key={language}`, `data-split-reveal` and the italic accent span (HeadingChoreographer owns this subtree via SplitText) |
| 168-169 | `"… Both senior. Both staffed …"` / `"… Entrambi senior. Entrambi assegnati …"` | `"… Both founders senior. Both staffed …"` / `"… Entrambi i fondatori senior. Entrambi assegnati …"` |
| 196-199 | `"Two opposite skill sets, one thesis."` / `"Due competenze opposte, un'unica tesi."` | `"Two founders, one engineer, one thesis."` / `"Due fondatori, un ingegnere, un'unica tesi."` |
| 203-206 | `className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto"` | `className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl lg:max-w-6xl mx-auto"` |
| 208 | `<Reveal key={f.name} delay={i * 100} className="h-full">` | see below |

```tsx
              <Reveal
                key={f.name}
                delay={i * 100}
                className={
                  i === 2
                    ? "h-full md:col-span-2 md:justify-self-center md:w-[calc(50%-1rem)] lg:col-span-1 lg:w-auto"
                    : "h-full"
                }
              >
```

`md` stays a 2-column grid — **byte-identical for the first two cards**, so the md design is provably intact. At `md` the third card would otherwise sit alone in the left column of row 2, reading as a broken grid; this spans it and centres it at exactly one column's width (`50% − half the 2rem gap`). Every class resets at `lg` where it becomes a normal grid item. `lg:max-w-6xl` (72rem) restores ~21.3rem per card — `max-w-5xl` across three columns gives ~19rem, too narrow for the bio paragraph.

`id={f.anchor}` at :210 gives Mattia a working `/about#mattia` deep link matching `authorUrls`. The counter-parallax ScrollTrigger (:38-70) is **already count-agnostic** — `portraitDriftRefs` is an array written by index (:222-224), the effect filters nulls (:41-43), early-returns when empty (:44), and writes the same `y` to every setter (:62). **No change.** The duplicated `PORTRAIT_CSS` blocks (about-client.tsx:451-481 / founders-rail.tsx:133-169) are class-based and count-independent — **no change**, but re-read both before declaring done.

| `src/app/about/page.tsx` | 6-7 | append `", joined by software engineer Mattia Scattu"` before `" London-registered."` — the *founding* claim ("founded by two operators") stays true and must not be weakened |

**Leave `about-client.tsx:275-278` alone** — "The founding thesis" is a claim about how the firm was founded, not a headcount, and survives a third card intact. Listed so nobody "fixes" it reflexively.

---

## 11. Open items for the boss (do not auto-decide)

1. **`stack` chips cannot be sourced.** The LinkedIn export lists no languages or frameworks. `FounderPanel` guards on `f.stack?.length`, so omitting it degrades cleanly (no "Ships with" block). Ask Mattia directly — a 30-second question with a verifiable answer. Do **not** infer `["SQL","Postgres","Python","TypeScript"]` from the DB-modelling line.
2. **"No layer of juniors between you and the people doing the work"** (about-client.tsx:168-169) and pillar 01 (:93-96) now share a page with a 2026 graduate. Scoping "Both senior" to the founders resolves the literal contradiction; whether the juniors clause stays is a positioning decision. Same question for the home rail's `description` at founders-rail.tsx:1458 ("no junior bench").
3. **Home rail eyebrow** (founders-rail.tsx:1432-1434) is "Founder-led AI engineering studio" — still true (the studio *is* founder-led), so I left it. The brief's "THE FOUNDING PAIR → THE TEAM" refers to `/about`. Confirm. Related: the closer's "Full founder bios" link (:1500) may want to become "Full team bios".
4. **Role localisation.** Mattia's `roleIt` is `"Software Engineer"` (untranslated), while the other two do translate ("CPTO · Technical Lead" → "CPTO · Lead Tecnico"). Alternative: `"Software Engineer · Sviluppo"`.
5. **`initials: "MS"` collides with Michele Sanna.** Inert today — `authorBios` is keyed by full name and Mattia bylines no articles — so an initials avatar can never show both. Disambiguate only if he ever authors.
6. **Personal email deliberately excluded** from the data entry. Confirm he should get an `@sersan.io` address before going live.
7. **`MORPH_DURATION` 1.4s/leg** now means two legs of forced auto-play. Product call whether to drop to ~1.15s; the plan preserves the shipped feel exactly.
8. **B is now a middle stage with no release in either direction.** A user parked on Michele must traverse a full 1.4s leg to reach an end before the gate hands the page back. Escape and the 24s timer remain. An alternative is resetting `engageTime` on every completed leg (a per-leg timer) — that keeps the safety number small with the same anti-trap property, but changes the valve's semantics.

---

## 12. Verification checklist

### A. Measure FIRST, before tuning anything (Chrome, home page, desktop ≥1024×780)

```js
__sersanFounderMorph.getSampler()
```

| Field | Expect | If not |
|---|---|---|
| `stride` | **exactly 1** | Ceiling still too low, or grid too big. Raise `MAX_COUNT_BY_TIER.full`, or shrink the grid by `sqrt(52000 / sharedCells)` and re-measure. **Non-negotiable — stride 2 halves all three faces.** |
| `sharedCells` | 42,000 – 62,000 | Above 62k, shrink the grid (GPU cost). Below 42k, something is under-inking — check `meanInk`. |
| `count` | `== sharedCells` (stride 1) | — |
| `meanInk` | 3 values; `[2]` (Mattia) legitimately **higher** than `[0]`/`[1]` — the jacket. `[0]` and `[1]` must be **within ~5% of their pre-change values** | If `[0]`/`[1]` moved, the shared spec changed something it shouldn't have. Revert. |
| `halfExtent` | 3 `[x, y]` pairs. **Check `max(x) ≤ 0.75 × max(y)`** | If violated, the fit flipped to X-bound and **all three faces shrank**. Remedies in order: (1) lower `fadeStart` (shared) until it clears, verifying `meanInk[0..1]` stays within 5%; (2) re-export the Mattia asset with the jacket cropped narrower — pure asset change, zero code risk; (3) accept the shrink only as a last resort. |

Capture a before/after screenshot of Alessandro at rest and diff the head size. **A silent global shrink is the most likely visual regression and it will not throw.**

### B. The chain, driven deterministically

```js
__sersanFounderMorph.setStage("A"); __sersanFounderMorph.getUniforms()
// → uMorph 0,   uMorph2 0,   progress 0
__sersanFounderMorph.playMorph(1)   // wait 1.4s
__sersanFounderMorph.getUniforms()
// → uMorph 1,   uMorph2 0,   progress 1     ← leg 1 complete, leg 2 not open
__sersanFounderMorph.playMorph(1)   // wait 1.4s
__sersanFounderMorph.getUniforms()
// → uMorph 1,   uMorph2 1,   progress 2
__sersanFounderMorph.getStage()     // → "C"
```

**`uMorph` must read exactly 1 while `uMorph2` is still 0.** If `uMorph2` leaves 0 before `uMorph` reaches 1, the chained kernel blend cuts the corner and particles fly A→C directly, never touching Michele. This is the single most important assertion in the change.

Mid-leg-2 sampling (`setMorph(1.5)`) must show `uMorph 1, uMorph2 0.5` — and the cloud must **dolly toward** the camera and orbit **forward**, not away/backward. Backward = the `sin(p·π)` envelope was not made leg-local.

### C. The gate sequence, via the deterministic hook (never synthetic wheel events)

```js
const g = __sersanFounderMorph;
g.getGate()                    // { engaged, stage, stageIndex, morphTarget, armed, accum }
g.simulateGesture("down")      // A → morphTarget 1, STILL engaged
g.simulateGesture("down")      // B → morphTarget 2, STILL engaged   ← the new leg
g.simulateGesture("down")      // C → engaged false (release down)
```

and upward: `C → B → A → release`. **Assert that a gesture at B never releases in either direction** — that is the generalised anti-trap invariant. Assert gestures during `stage === "morphing"` are absorbed (`accum` resets, no target change).

### D. Browser, by eye

- Counter reads **01/03 → 02/03 → 03/03**, flipping at each leg midpoint. Hairline sweeps 0 → 0.5 → 1 across the whole sequence and **never overshoots its 16rem track**.
- Copy handoff: Alessandro's block departs, swarm owns the stage alone, **Michele's block arrives child-by-child** — then on leg 2 **Michele's block departs** and Mattia's arrives. Michele being a middle block is the only genuinely new DOM behaviour.
- **Mattia's face is HIS face**, in his colours, with his jacket — not a Michele-shaped stencil in Michele's skin tone. That is the colorsC/sizeC check.
- Tab through the section at each locked stage: **exactly one** LinkedIn link reachable. At A, Michele's and Mattia's must be untabbable; at C, Alessandro's and Michele's must be.
- Console clean. No `NativeCommandError`, no TSL shader-build throw (a swizzle mistake fails loudly here).
- Reverse the whole sequence by scrolling up — every leg must mirror.

### E. Guard-rail regressions (the ones that fail silently)

- **Hero intro unchanged.** `HeroTextParticles` shares the engine; its A→B→C legs must look byte-identical. Watch the hero morph end to end.
- **Resize mid-section while parked on Mattia** → the cloud must stay on Mattia (seed picks `homes[2]`), not snap to Michele and spring across. Also confirm a resize does not replay the entrance (`keepEntry`, :417).
- **WebGL2 fallback**: force it (or watch a non-WebGPU browser). The gate must **never** engage, the DOM poster must appear after the 4s grace, and the poster cross-fade must sum to 1 across three images with no flash at the integer seams. This path is invisible in normal QA — force `posterShown` in devtools rather than eyeballing the happy path.
- **Mobile / coarse pointer / `prefers-reduced-motion`** → native mode, three panels, browser-owned horizontal scroll, no hijack.
- **Narrow the window below 1024×780** mid-session → drops to the horizontal rail with three panels and ~34rem more travel.
- `/contact` and `/start` show **exactly two** faces. `/about` shows three (2-up at md with the third centred, 3-up at lg).
- **Hard-reload the tab** after editing the store. `globalThis.__sersanFoundersMorph ??= …` (:165-166) never re-creates once set, so after a store shape change in a running dev session the island keeps reading the **old** two-target instance — the rail refuses to leave B with no error. Do not trust any QA result taken before a hard reload.
- Naming trap: `window.__sersanFoundersMorph` (Scene.tsx:72-75) is the **store hook**; `window.__sersanFounderMorph` (singular) is the tuning/gate handle. One letter apart, and only the second has `simulateGesture`.

### F. Before declaring done

MEMORY.md records that parallel fix rounds on this exact surface previously introduced 7 regressions including 2 P0s. This change touches the engine, the sampler, the store, the island, the gate and the DOM simultaneously. **Review the combined diff adversarially in one pass** — specifically: every `pairRef` → `setRef` site renamed (5), every `env` consumer verified leg-local, `uSizeComp2` still 1, and no varying built from an outer `.toVar()`.