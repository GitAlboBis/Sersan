Line numbers are from a read of the **working tree** (which is `+217` lines on `neuralFieldCompute.ts` vs `cc10138` — the implement agent is mid-edit). Symbol names are the stable handle; treat line numbers as ±30.

---

# TASK B — "SI ILLUMINANO IN MOVIMENTO"

## 0. THE FINDING THAT REFRAMES THE WHOLE TASK

**The velocity stretch is anisotropic, and that is the escape from `f6cac67`.**

`buildVertex` (`src/webgl/neural/neuralFieldCompute.ts:2560-2593`) multiplies **only `corner.x`** by `stretch` (`:2586 const cs = corner.x.mul(stretch);`), rotates that onto the view-space motion axis, and hands the fragment stage the **unstretched** UV (`vQuadUv = varying(positionLocal.xy)`, `:3266`/`:3492`). So `disc = smoothstep(0.5, inner, length(vQuadUv))` (`:2545`) is computed on a circle and painted over an ellipse: **peak per-pixel alpha is unchanged, the sprite gets longer along the direction of travel, and its width does not move.**

That is the exact primitive the owner is asking for and the exact opposite of what `f6cac67` killed. `f6cac67` grew the sprite **isotropically** (7.5 px, then 10 px round) on a 1 px chord — a bead. A 3.4 px sprite stretched 3× along its own chord is a **13.6 × 3.4 px streak**, which no eye reads as a bead, and which closes the along-chord gaps *for free* at constant peak luminance. The anti-blob rule "many, tiny, fast" is already half-implemented in the shipped code; nobody ever fed it.

Cap arithmetic: `stretch = 1 + min(spd·STRETCH_GAIN, STRETCH_MAX)`, `STRETCH_GAIN = 1.5`, `STRETCH_MAX = 2.0` (`neuralLatticeConfig.ts:1684-1685`) ⇒ the cap engages at `spd ≥ 1.333` local/s and max stretch is **2.95–3.00**. `motionNode` already delivers `spd = surge · SURGE_ADVECT = 1 × 1.3` at a full surge head (`:2196-2199`; `uSurgeAmp` is clamped to 1 at `NeuralLattice.tsx:960`), i.e. **the surge already saturates the stretch cap today and nobody sees it because the sprite under it is at alpha 0.012.**

---

## 1. WHAT ALREADY TIES BRIGHTNESS TO MOTION — full inventory

### 1a. Terms that read a particle's OWN velocity: exactly two, both SIZE, zero brightness

| site | code | what it does |
|---|---|---|
| `neuralFieldCompute.ts:2569-2578` | `const spd = length(motion);`<br>`const stretch = float(1).add(min(spd.mul(uStretchGain).mul(float(1).add(uScrollVel.mul(uVelStretch))), uStretchMax));` | anisotropic **length**. Not brightness. |
| `:2582-2588` | `const mView = modelViewMatrix.mul(vec4(motion, 0.0)).toVar(); … dir = mView.xy…` | stretch **direction**. Not brightness. |

`motion` comes from `motionNode(metaN, offN, physVel)` (`:2190-2208`), which is called at **exactly two sites** and passed **only to `buildVertex`**:
- `:3260 const motionS = motionNode(aMeta, aOff, null);` (analytic tier)
- `:3484 const motionR = motionNode(metaR, offR, velR);` (compute tier)

**`particleScalars` never receives velocity.** Its signature is `particleScalars(metaN, offN, posN)` (`:2221`). There is no path today by which a particle's speed can reach `colorE` or `alpha`.

### 1b. Terms that read FLOW — travelling brightness, but not the particle's speed

| function | site | consumers |
|---|---|---|
| `surgeAt(t)` | `:2057-2072` | `emisStream :2335` `.add(surge.mul(uSurgeGain))`; `headMix :2308-2312` (whitening); `traffic :2357`→alpha; `sizeStream :2381` `.add(surge.mul(0.45))`; star `emisRing :2425` `.mul(float(1).add(surgeAt(nT).mul(0.6).mul(cGate)))`; line `emisRawL :3074` |
| `packetAt(...)` | `:2114-2147` | `emisStream :2336` `.add(packet.mul(uPacketGain))`; `headMix`; `traffic`; `sizeStream .add(packet.mul(float(PACKET_SIZE)))` |
| `nodeKissAt(...)` | `:2161-2182` | `emisRing :2426`; `anchorNode` star swell `:2417` |
| `flashAt(t)` | `:2074-2079` | `emisStream :2337` |
| `flowParam` | `:1806-1808` | `fract(basePhase.add(uFlowTime.mul(uFlowSpeed).mul(speedVar)))` — advances `s`, brightens nothing on its own |

These are **positional wavefronts**, not speed laws. A particle is bright because a wave is *at* it, not because it is *moving*.

### 1c. Terms that read `uScrollVel` — global, not per-particle

`:1840` `velW = 1 + uScrollVel·uVelSwell` (width, on the near-inert envelope path) · `:2572-2576` stretch gain · `:1944` curl gain · `:1982`, `:3460` debris wander · `:1806` flow-clock rate (via the driver's `flowTime.current += delta * (1 + u.uVelFlow.value * scrollVel.current)`, `NeuralLattice.tsx:1152`).

**And one brightness law:**
```ts
// neuralFieldCompute.ts:3070-3078 — buildLinkLineLayer
const emisRawL = uLineEmissive
  …
  .mul(float(1).add(uScrollVel.mul(uVelSwell)))   // :3076
```
with the in-source rationale at `:3066-3069`: *"widthEnvelope's job was to thicken the filament while you scroll, and a 1px line has no width — so the same `uScrollVel × uVelSwell` rides the BRIGHTNESS instead."*

### VERDICT ON Q1

> **There is no "moving = brighter" law in the build.** There is `moving ⇒ stretched` (per particle, size only), `a wavefront is here ⇒ brighter` (positional), and exactly one `scrolling ⇒ brighter` — which is global, not per-particle, and lives on `buildLinkLineLayer`, the layer the owner just deleted. **The one existing precedent for "motion is light" dies with the chord.** It has to be re-authored on the particles, and this round is where.

---

## 2. THE DESIGN — the TSL

### 2.1 The principle

A **constant** speed→brightness law is fatal: `FLOW_SPEED` is uniform across the field, so "faster = brighter" would lift every particle by the same factor and re-create the round-8-I fog (`neuralLatticeConfig.ts:2333` — *"4,828 resting link particles × a 3.4px² sprite ≈ 58k px² … a fog that flattened the composition"*). The scar tissue is explicit: **resting particles are not free.**

The only speed that varies in space is the **excess** speed a wavefront imparts — which `motionNode` already models as `ef.dir.mul(surge).mul(float(SURGE_ADVECT))` (`:2196-2199`, and its analytic twin `:2201-2203`). So generalise the surge from one hero event to a **continuous phase-staggered train**, and drive **advection, emission, alpha and size from that single scalar**. Then:

- a particle is brighter **because** it is being carried — literally causal, not correlated;
- the field average does not move (all terms are 0 outside a crest, byte-identical rest);
- the brightest sprite is also the longest one, so the lit region is a **continuum**, not a chain.

### 2.2 The code

Ten plain `uniform()` scalars — **zero UBO blocks** (precedent §6).

```ts
// ── R12 · MOTION IS LIGHT ────────────────────────────────────────────────
const uFront      = uniform(0);              // THE scalar (nodeT units) — §3
const uFrontW     = uniform(BUILD_KNEE);     // birth knee width, nodeT
const uFrontKy    = uniform(0);              // y→phase slope (the 45° diagonal)
const uRiverAmp   = uniform(RIVER_AMP);      // 0 ⇒ byte-identical rest
const uRiverGain  = uniform(RIVER_GAIN);     // emissive lift at a crest   0.60
const uRiverTraf  = uniform(RIVER_TRAFFIC);  // alpha lift, via `traffic`  0.16
const uRiverSize  = uniform(RIVER_SIZE);     // isotropic size lift        0.35
const uRiverWhite = uniform(RIVER_WHITE);    // whitening toward COL_CORE  0.25
const uRiverAdv   = uniform(RIVER_ADVECT);   // advection → stretch        1.30
const uDustLumMax = uniform(DUST_LUM_MAX);   // the never-blooms ceiling   0.95

/** THE SHARED PHASE AXIS. Structure and light read this and nothing else. */
function phaseAt(nT: Any, y: Any): Any {
  return nT.sub(y.mul(uFrontKy));
}

/** M phase-staggered wavefronts on `ph`. Same gaussian-head + comet-tail
 *  shape as surgeAt (:2057-2072), so the light keeps the river's asymmetry:
 *  a sharp leading edge, a trailing smear. C¹ everywhere: exp() and the
 *  select() branch meet at d = 0 with matching value AND slope
 *  (head'(0) = 0, tail'(0⁻) = 0.65/TAIL ⇒ use max(), never min()). */
function riverAt(ph: Any): Any {
  const d0 = ph.sub(uFront).toVar();                    // ← shared with bornAt
  let r: Any = float(0);
  for (let m = 0; m < RIVER_M; m++) {
    const d  = d0.add(float(m / RIVER_M)).toVar();
    const dw = d.sub(floor(d.add(float(0.5)))).toVar(); // wrap to (−0.5, 0.5]
    const head = exp(float(RIVER_K).mul(dw.mul(dw)).negate());
    const tail = select(dw.lessThan(float(0)),
                        exp(dw.div(float(RIVER_TAIL))), float(0));
    r = r.add(max(head, tail.mul(float(0.65))));
  }
  return r.mul(uRiverAmp);
}
```

**Every op has a shipped precedent in this file:** `exp(…negate())` `:2059`, `select` `:2060-2064`, `floor` `:1580`, `fract`/wrap idiom `:1808`, `max` `:2065`, `mul/add/sub` everywhere. All are in the destructured set at `:1024-1057`. **`abs` is NOT destructured** — the repo idiom is `max(d, d.negate())` (`:1741`, `:1755`).

### 2.3 Where it lands in `particleScalars`

**(a) advection → the streak.** In `motionNode` (`:2190-2208`), on **both** branches so the tiers agree:

```ts
    const surge = surgeAt(ef.t);
    const river = riverAt(phaseAt(ef.t, /* posN.y */ …)).toVar();   // NEW
    const adv   = surge.mul(float(SURGE_ADVECT))
                       .add(river.mul(uRiverAdv));                  // NEW
    if (physVel) {
      return physVel.add(ef.dir.mul(adv).mul(streamGate));          // was surge·ADVECT
    }
    const streamMotion = ef.dir.mul(float(STATIC_ELONG).add(adv));  // was surge·ADVECT
```
At a crest (`river = 1`, `uRiverAdv = 1.3`) `spd = 1.3` ⇒ `stretch = 1 + min(1.95, 2.0) = 2.95` — **the same saturation the surge already produces**, no new cap behaviour.

**(b) emission.** `emisStream` (`:2334-2343`) gets one term in the existing additive chain, then a **ported soft knee**:

```ts
    const river = riverAt(ph).toVar();
    const emisRawS = float(1)
      .add(surge.mul(uSurgeGain))
      .add(packet.mul(uPacketGain))
      .add(flash.mul(float(FLASH_GAIN)))
      .add(river.mul(uRiverGain).mul(cGate))       // NEW — cGate, §4
      .mul(float(STREAM_EMISSIVE))
      .mul(midProfile).mul(shimmer).mul(rowBright)
      .mul(float(1).sub(deadMix.mul(0.75)))
      .toVar();

    // NEVER-BLOOMS-EXCEPT-AT-PEAKS, ported verbatim from :3080-3091.
    // Rec709 on the ACTUAL tone (the tone is not constant — headMix whitens
    // toward COL_CORE lum 0.9371), and the ceiling OPENS with `traffic`, so a
    // packet bead keeps its 3.65 while resting/flowing dust cannot cross 1.0.
    const lumS  = toneStream.x.mul(0.2126)
                  .add(toneStream.y.mul(0.7152))
                  .add(toneStream.z.mul(0.0722));
    const capS  = mix(uDustLumMax, float(BEAD_LUM_MAX), traffic)
                    .div(max(lumS.mul(alphaStream), float(1e-3))).toVar();
    const kneeS = capS.mul(float(LINE_LUM_KNEE)).toVar();
    const undS  = min(emisRawS, kneeS).toVar();
    const ovrS  = emisRawS.sub(undS).toVar();
    const spnS  = capS.sub(kneeS).toVar();
    const emisStream = undS.add(ovrS.mul(spnS).div(max(ovrS.add(spnS), float(1e-4))));
```
⚠ This requires hoisting `traffic` (`:2357`) and `alphaStream` (`:2370`) **above** `emisStream` (`:2334`). Pure expression DAG — legal, but it is a real reorder in a file with a varying-discipline hazard; keep every one of them a self-contained expression, never an outer `.toVar()` a Fn `.assign()`s into (header note at `:99-110`).

⚠ `min(x, kneeS)` here is the **legal** use: it is the shipped soft-knee's `underL` (`:3085`), where the overflow is *re-added* through `ovr·spn/(ovr+spn)`. It is **not** the flat-top failure, which is `min(x, CONST)` with the overflow discarded (`:3050-3062`).

**(c) alpha.** One term into the existing traffic ramp (`:2357-2362`):
```ts
    const traffic = clamp(
      packet.add(surge.mul(0.8)).add(river.mul(uRiverTraf)),   // NEW term
      float(0), float(1),
    ).toVar();
    const liveA = mix(uDustAlpha, uBeadAlpha, traffic).mul(fringeA);
```

**(d) size.** One term into `sizeStream` (`:2374-2383`):
```ts
      .mul(float(1).add(surge.mul(0.45))
                   .add(packet.mul(float(PACKET_SIZE)))
                   .add(river.mul(uRiverSize)));                // NEW
```

**(e) whitening.** `headMix` (`:2308-2312`):
```ts
    const headMix = clamp(
      surge.mul(0.85).add(packet.mul(float(PACKET_WHITE)))
                     .add(river.mul(uRiverWhite)),              // NEW
      float(0), float(1),
    ).mul(float(1).sub(deadMix));
```

**(f) stars.** `emisRing` (`:2420-2431`) — same shape as the shipped surge line one row above it:
```ts
      .mul(float(1).add(surgeAt(nT).mul(0.6).mul(cGate)))            // :2425 shipped
      .mul(float(1).add(riverAt(phN).mul(float(RIVER_STAR)).mul(cGate)))  // NEW
```

### 2.4 The luminance ledger — the contract holds, with numbers

`lum(COL_CYAN) = 0.6201`, `lum(COL_CORE) = 0.9371` (config's own ledger, `neuralLatticeConfig.ts:2290-2320`).

| state | lum | emis | alpha | post-blend |
|---|---|---|---|---|
| dust at rest (unchanged) | 0.6201 | 2.1 × 1.15 × 1.04 = 2.512 | 0.012 | **0.0187** |
| **dust at a river crest** | mix(0.6201, 0.9371, 0.25) = **0.6994** | 2.1 × 1.60 × 1.15 × 1.04 = **4.019** | mix(0.012, 0.9, 0.16) = **0.1541** | **0.433** |
| packet bead, D24 constants | 0.7629 | 5.313 | 0.55 | **2.23** (blooms — by design) |
| star core (unchanged) | — | — | — | 7.33–10.67 |

**Zero new sprites above 1.0.** With ~2× along-chord overlap at the crest (§2.5) the accumulated luminance is ≈ **0.87**, i.e. the same order as the retired chord's shipped **0.568** (`:3040-3044`) — the light the owner approved, drawn without a line primitive.

### 2.5 THE CONTINUITY BUDGET — the load-bearing consequence of deleting the chord

The `∝`-length allocation in `seedBuffers` (`:911-925`, `perEdge = floor(edgeTotal · l / lenSum)`) makes **along-chord spacing a single global constant**, `Σlength / edgeTotal`, identical on every link. So the criterion can be checked once and it holds at the longest link automatically. (Corpus per-link `|Δ|` is mean 0.031 / max 0.106 — `neuralLinkLines.ts:58`; that 3.4× spread is exactly what the `∝`-length allocation cancels.)

Crest sprite: width `3.42 × (1 + 0.35) = 4.62 px`, length `4.62 × 2.95 = 13.6 px`. Requiring ≥ 2.0× along-chord overlap (the river doc's own delivered figure, `research/2026-08-25-round12c-river.md` §4.2B) ⇒ spacing ≤ **6.8 px** ⇒ **≥ 17 link particles per mean 114.3 px link**.

| D23 density | E ≈ 2.0·N | link particles needed | total @ `NODE_FRACTION 0.46` | total @ `0.30` |
|---|---|---|---|---|
| 391 nodes (on-frame parity) | 782 | 13,294 | 24,619 | **18,991** |
| 662 (areal parity) | 1,324 | 22,508 | 41,681 | **32,154** |
| 835 (nearest-neighbour parity) | 1,670 | 28,390 | 52,574 | **40,557** |

Reference points: today `NEURAL_PARTICLE_COUNT = 9000` (`:179`); today's on-frame peak is 18,000 (two islands, ladder-guaranteed); the capacity doc's analysed D17 case is **36,804**.

> **Recommendation the parent should carry:** `NODE_FRACTION` was raised **0.28 → 0.46** by ROUND-8-G (`:1896`, rationale in the file header at L216-221) *because the line layer had taken over the thread job*. Deleting the line layer removes that justification. Reverting toward **0.30** buys a **1.30×** lift in link traffic for zero cost and brings the 662-node option to **32.1k** — inside the envelope the capacity doc already analysed.

**New failure mode created by the deletion:** `perEdge` uses `floor()`. Previously a link that rounded to 0 particles still had its chord. Now it is **an invisible link**. At 17/mean the shortest link survives as long as `lmin/lmean ≥ 0.059`; today's `EDGE_MIN_LOCAL = 0.055` (`:344`) against mean 0.1222 gives ratio 0.45 ⇒ 7 particles ✔ — but `EDGE_MIN_LOCAL` **must be rescaled by `1920/L`** on the ribbon (capacity doc §VERDICT) or the check is meaningless. Add a build-time assert on `min(perEdge) ≥ 1`.

---

## 3. THE FRONT — ONE UNIFORM DRIVES BOTH

### 3.1 The identity

Both readings share the **same subtraction**:

```
d = ph − uFront        // ph = phaseAt(nT, y) = nT − y·uFrontKy
```

- **STRUCTURE (birth):** `uFront` read as a **threshold** — has the front passed me?
- **LIGHT (river):** `uFront` read as a **carrier phase** — how far behind the front am I?

```ts
/** STRUCTURE — 0 → 1 as the front passes. Never a clamp; a C¹ knee. */
function bornAt(ph: Any): Any {
  return smoothstep(ph, ph.add(uFrontW), uFront);   // ≡ smoothstep(0, W, −d)
}
```
`riverAt` (§2.2) is built on the identical `d0 = ph.sub(uFront)`. The train's `m = 0` crest sits **at** `d = 0`, i.e. **on the birth front**, with `m/M`-spaced crests trailing behind it. So the brightest filament in the field is, by construction, the one being born — D18's river and D14/D16's build front are **one expression**, not two coupled systems.

### 3.2 Phase source per consumer — zero new uniform reads

| consumer | phase source | already present at |
|---|---|---|
| star (role 1) | `nT = nodeTAt(metaN.y)` and `posN.y` | `:2402` / `:2221` (parameter) |
| link particle (role 0) | `ef.t = mix(tA, tB, s)` and `posN.y` | `:1592` / `:2221` |
| link LINE vertex (if retained) | `tL`, `posL.y` | `:2951-2952` |
| spark (role 2) | leave un-gated (`born = 1`) — broken-only, `uBroken = 0` on the traverse band | — |

`nodeT` is baked from the node's own x (`neuralLatticeConfig.ts:490-497`) and normalised 0..1 **whatever the field extent becomes under D17** — on the ribbon `nodeT ≡ u`, which is why `field.fractureT` is derived by inverting that normalisation (`:3216-3232`). Zero new tables, zero new blocks.

### 3.3 The driver — a follower, not a latch

```ts
// NeuralLattice.tsx — beside the existing revealDamped at :909
buildFront.current = THREE.MathUtils.damp(
  buildFront.current, FRONT_LEAD + p * FRONT_SPAN, 10, delta);
u.uFront.value = buildFront.current;
```
`p` comes from the **frozen frame** only (`traverseStore.ts:41-44`). `THREE.MathUtils.damp` converges to `f(p)` from **both** directions and holds no state at equilibrium — precedent `revealDamped` at `NeuralLattice.tsx:909-913`, λ = 2.5. `Math.max(prev, next)` would be a latch and is forbidden by D16.

**Do not repurpose `uReveal`.** It arms the recycle snap (`:3377 select(uReveal.greaterThan(float(0.9)), …)`) and drives the coalesce (`:3340`, `:3245`); and it saturates ~262 px *before* `p = 0` (proved in `research/2026-08-25-round12c-birth-front.md` §1). `uFront` is a new scalar.

### 3.4 Optional: the scroll physically pushes the dust

If the owner wants the flow itself scroll-coupled (not just the light), the lever is one term in `flowParam` (`:1806-1808`):
```ts
function flowParam(basePhase, speedVar) {
  return fract(basePhase
    .add(uFlowTime.mul(uFlowSpeed).mul(speedVar))
    .add(uFront.mul(uFrontFlow)));                    // NEW — scroll advects s
}
```
**This DOES touch the anchor** (`flowParam → ef.s → anchorNode :1936`), so it must be budgeted against the recycle snap:

- spring lag under a constant anchor velocity: `lag = (NEURAL_DAMPING / NEURAL_SPRING)·v = (8.5/60)·v = 0.1417·v` (`:3046-3049` states this figure in-source).
- **Use `build.field.wrapSnapDist`, not `WRAP_SNAP_DIST`.** On the ribbon the delivered value is **0.01060** (`:3428-3443` note), not the 0.038 constant — 3.6× tighter than the birth-front doc assumed. ⇒ threshold speed `v < 0.01060 / 0.1417 = **0.0748 local/s**`.
- at 1000 px/s over `secH ≈ 5358 px`: `dp/dt = 0.187/s`; with `FRONT_SPAN = 1`, `uFieldLen = 3.791` (1 nodeT = 3.791 local), a worst-case 0.122-nodeT link is 0.462 local long ⇒ anchor speed `= 0.462 × 0.187 × uFrontFlow`. At `uFrontFlow = 0.15` that is **0.0130 local/s — a 5.8× margin.**

Recommendation: keep `uFrontFlow = 0` for stage 1 and take the **cheaper, zero-risk** displacement lift instead — `FLOW_SPEED 0.075 → ~0.35` (`neuralLatticeConfig.ts:1507`), which raises the ambient dust drift from 5.3 px/s to ~25 px/s. Anchor speed rises to 0.0364 local/s — still 2.1× under the ribbon threshold. **`uFlowSpeed` is currently NOT in the uniforms bag** (`:1073`, absent from the return at `:3560-3616`); adding it is one line and costs no block.

River doc trap #9 governs the split: **ambient traffic may stay on `uFlowTime` (it is life, not structure); `uFront` must come from `p`.**

---

## 4. THE TRAPS, WITH THE CODE

### (a) Scaling `alpha` without `cut` DELETES particles

**The code today.**
```ts
// neuralFieldCompute.ts:2519-2524 — particleScalars() return
    const alpha = select(isStream, alphaStream, select(isRing, alphaRing, alphaSpark)).mul(cMask);
    …
      cut: float(0.004).mul(cMask),
// :2547-2548 — buildShade fragment
      const alpha = disc.mul(v.vAlpha).mul(uReveal).toVar();
      Discard(alpha.lessThan(v.vCut));
// :3114, :3159 — the line layer's twins
    const vLineCut = varying(float(0.004).mul(maskL));
      Discard(alpha.lessThan(vLineCut));
```
The rule is stated in-source at `:2505-2518` for `cMask` and again at `:1775-1779` for `uFieldFade`: *"A fade applied to only one of them stops being a fade and becomes a pop."*

**Quantified for `born`.** Link dust rest alpha `= 0.012 · fringeA · edge · gap`; `cut = 0.004`. Scaling only `alpha` by `born` makes the dust survive only when
```
0.012 · fringeA · edge · disc · born ≥ 0.004   ⇒   born ≥ 0.333 / (disc · fringeA · edge)
```
i.e. **a third of the birth ramp deleted at mid-span, and at an `EDGE_FADE` tip (`edge ≈ 0.33`) the particle never appears until `born ≈ 1`.** The stars (alpha ≈ 1.0) would fade in normally. Visible result: nodes fade in, then their traffic *snaps on*.

**The correct expression — and there is a strictly better one than "multiply both".** `cMask` is referenced at **exactly two sites**, `:2499` (alpha) and `:2524` (cut). So fold `born` into `cMask` at its single construction site (`:2227`), which is structurally the same trick `uFieldFade` already uses inside `copyMaskAt` (`:1780-1783`):

```ts
    const cGate = copyGateAt(posN.x).toVar();
    const born  = bornAt(phaseAt(/* nT or ef.t */, posN.y)).toVar();   // NEW
    const cMask = copyMaskAt(posN, cGate).mul(born).toVar();           // ← one line
```
Both consumers inherit it; it is impossible to update one and miss the other. Same treatment on the line layer if it is retained: `maskL` (`:3110`) feeds exactly `:3111` and `:3114`.

**The proof it is free:** the test becomes `disc·vAlpha·born·uReveal < 0.004·cMask·born` ⟺ `disc·vAlpha·uReveal < 0.004·cMask` for every `born > 0`. **The surviving fragment set is byte-identical**, at every point of the ramp — no hard edge, no fill regression.

### (b) Birth must be VALUE-ONLY

```ts
// :3339-3341
    const rv = smoothstep(float(0), float(1), uReveal);
    const anchor = mix(seedPos, liveAnchor, rv).toVar();
// :3377-3390
    const armed = select(uReveal.greaterThan(float(0.9)), one, float(0))
      .mul(select(uRecohere.lessThan(float(0.02)), one, float(0)))
      .mul(select(dispersing.lessThan(float(0.02)), one, float(0))).toVar();
    const linkSnap = mix(float(1e9), float(WRAP_SNAP_DIST), armed);
    …
    If(length(anchor.sub(pos)).greaterThan(snapDist), () => {
      pos.assign(anchor); velH.assign(vec3(0.0, 0.0, 0.0));
    });
```
A per-node birth that moved the anchor would move it across `|seedPos − liveAnchor| ≈ 0.7` local (`SEED_SCATTER_XY 0.95`, `SEED_SCATTER_Z 0.7`). Against the **ribbon's** threshold speed of **0.0748 local/s** (§3.4 — not the 0.268 the constant implies) a single node's birth window would have to last **> 9.4 s**. On a 45° traverse the reader crosses it in a fraction of that. And `armed` is **1** here: `uReveal` is saturated before `p = 0`, `uRecohere = 0`, `dispersing = 0` on the healthy band. So `pos.assign(anchor); vel = 0` fires **every frame the front is on the node** — the coalesce becomes a permanent teleport, i.e. the recycle-snap fix eating the effect it exists to protect.

Second half of the same trap: **the analytic tier has no spring and no snap** (`:3245-3247` is a straight `mix`), so an anchor-driven birth would be smooth on WebGL2 and popped on WebGPU. Value-only removes both at once and leaves `simulate()` at **zero lines changed**.

⚠ There is a **third**, undocumented instance of this trap and it bears directly on Task B: **do not tie brightness to `physVel`.** The compute tier's velocity spikes at every `fract()` wrap in `flowParam` — that spring-flight is precisely what the snap exists to suppress (`:3437-3439`: *"the bright spring-flight streak the snap exists to kill comes back on the WebGPU tier"*). A `|physVel|`-driven emissive would **amplify** it into a flash on every recycling particle, on one backend only. The analytic-flow formulation of §2 avoids this by construction.

### (c) `smoothstep` returns exactly 0 ⇒ `0 < 0` is false ⇒ nothing discards

**The discard sites, all four:**

| site | code | status |
|---|---|---|
| `:2548` | `Discard(alpha.lessThan(v.vCut));` | particle — **must change** |
| `:3159` | `Discard(alpha.lessThan(vLineCut));` | line — **must change** if the layer is retained |
| `:2749` | `Discard(alpha.lessThan(0.003));` | membrane — dead (`MEMBRANE_ALPHA = 0`, skipped at `:3188-3189`) |
| `:2868` | `Discard(alpha.lessThan(nebMask.mul(0.003)));` | nebula — broken-mode only, `uBroken = 0` on the traverse band |

On the un-reached half of the field `born = 0` exactly, so `alpha = 0` and `cut = 0`, and `0 < 0` is **false** → **nothing discards, and the entire un-born field rasterises at zero contribution.** Under D17 this is not a rounding error: `NeuralLattice.tsx:688-697` culls per **band**, and with ONE continuous field spanning the whole run **the lateral cull never fires** — every particle rasterises every frame regardless of the front.

**Fix:** `alpha.lessThanEqual(v.vCut)`. Verified available as a method chain in the installed three — `node_modules/three/src/nodes/math/OperatorNode.js:718 addMethodChaining('lessThanEqual', lessThanEqual)` — so **no new destructured import**. One token, kills the whole un-born fill, measure-zero-different elsewhere.

---

## 5. THE ANALYTIC TIER — expressible, with one pre-existing divergence

`buildLinkLineLayer`, `buildMembraneLayer`, `buildNebulaLayer` are built **before** the backend split (`:3186-3194`). The particle branch splits at `:3236 if (!backendIsWebGPU)`, where `anchorNode()` runs per instance **in the vertex shader** (`:3244`), `particleScalars` is called with the analytic centre (`:3257`), and `motionNode(aMeta, aOff, null)` (`:3260`) synthesises motion from `STATIC_ELONG` + surge advection.

**CONFIRMED expressible.** `riverAt` / `bornAt` / `phaseAt` are pure functions of `uFront`, `uFrontKy`, `uFrontW`, `nodeT`, `y` and per-instance attributes. Every op — `smoothstep`, `exp`, `select`, `floor`, `max`, `min`, `mix`, `mul/add/sub`, `negate` — is in the destructured set at `:1024-1057` and already compiles on both backends inside `surgeAt` (`:2057`), `packetAt` (`:2114`), `copyGateAt` (`:1734`) and the line's soft knee (`:3084`). **Zero storage buffers, zero compute stage required.** The graph is literally identical: the `sc = particleScalars(...)` call at `:3257` and `scR = particleScalars(...)` at `:3483` build the same nodes.

**Where the two tiers diverge — and none of it is new:**

1. **The stretch base.** WebGPU: `motion = physVel + dir·adv`; WebGL2: `motion = dir·(STATIC_ELONG 0.28 + adv)`. At rest, WebGPU `spd ≈ 0.008` (stretch 1.01) vs WebGL2 `spd = 0.28` (stretch 1.42). **The analytic dust is already ~40 % longer at rest today.** Adding `river·uRiverAdv` to *both* branches keeps the delta invariant — no new divergence, but the existing one becomes more visible because the sprite it affects is now bright. Fix if it matters: `STATIC_ELONG 0.28 → 0.05`, a config-only change (`:1686`).
2. **Curl shred** (`:1938-1952`) is `curl: true` on the compute branch only — the analytic river will read microscopically less shredded. Pre-existing, ~0.5 px (`CURL_SCALE 0.0052`).
3. **The pointer bend** is compute-only. Pre-existing.
4. **`uFrontFlow`, if taken (§3.4):** the compute tier lags the anchor by `0.1417·v` while the analytic tier's `centerBase = mix(aSeed, anchorS, rvS)` (`:3245-3247`) is exact. At `uFrontFlow = 0.15` and 1000 px/s that lag is `0.1417 × 0.0130 = 0.0018` local ≈ **0.4 px**. Invisible.

**The one formulation that would NOT be expressible** is the naive reading of the brief — brightness ∝ `|physVel|`. There is no velocity on the analytic tier at all (`motionNode(…, null)`), so the two tiers would show entirely different pictures: a WebGPU field where light tracks spring dynamics, and a WebGL2 field where a constant 0.28 lights every link uniformly, i.e. **the fog**. This is the decisive argument for driving the law from the analytic flow field rather than from the integrated velocity.

---

## 6. COST

### Blocks — ZERO new. Measured counts unmoved.

The authority is the BLOCK-COUNT BUDGET note at `:1103-1140`, measured live on `?backend=webgl2` by patching `WebGL2RenderingContext.prototype.shaderSource`:

```
  particle VERTEX    10 blocks   (8 arrays + object + render)   of 12
  particle FRAGMENT   8 blocks   (7 arrays + object)            of 12
  line     VERTEX     6 blocks   (4 arrays + object + render)   of 12
```

All ten new scalars are plain `uniform()`, which joins three's shared groups. Three in-source precedents: `:1224-1227` (ROUND-8-G traffic knobs — *"they join an existing shared group, so they add ZERO uniform BLOCKS to either program"*), `:1236-1246` (ROUND 9-B, six scalars), `:1290-1299` (ROUND 12 · STAGE 2, five scalars — *"a `uniformArray` would have cost a block in BOTH stages that read it"*).

**Zero new `uniformArray`.** `MAX_UNIFORM_BLOCK_SIZE` floor 16 KiB ÷ 16 B/element = 1024 elements hard; `uNodePos`/`uNodeT` are already the constraint under D23.

### Varyings — ZERO new

`born` folds into `cMask`, which already feeds `vAlpha` (via `sc.alpha`) and `vCut` (via `sc.cut`). The river folds into `vColor` (`sc.colorE`), `vAlpha`, and `sizeK` — and `sizeK` is **not** a varying, it is consumed in `buildVertex`. Particle material stays at **5** varyings (`vQuadUv`, `vColor`, `vAlpha`, `vSoft`, `vCut` — `:3266-3272`, `:3492-3498`); line material stays at **4 of the MAX_VARYING_VECTORS floor of 15** (`:2924-2928`).

### Storage buffers / vertex slots — ZERO new

Compute path stays at **4 storage buffers** (`:3305-3308`) and **5 of 8 vertex slots** (`:3474-3481`). `simulate()` is **zero lines changed** if `uFrontFlow = 0`; if taken, the change is inside `flowParam`, an expression the kernel already evaluates.

### ALU

| stage | added work | count | note |
|---|---|---|---|
| `phaseAt` + shared `d0` | 3 ALU | once per particle | shared by `bornAt` and `riverAt` |
| `bornAt` (smoothstep) | ~5 ALU | once | |
| `riverAt`, M = 4 | ~15 ALU/crest (`add`, `floor`-wrap ×3, 2 `mul`, `exp` ≈ 4, `select`+`exp` ≈ 5, `max`) → **~60** | once | **the dominant term.** M = 3 ⇒ 45. Dropping the comet tail on `m > 0` ⇒ ~40 at M = 4. |
| ported soft knee | ~8 ALU | once | `min/sub/sub/add/mul/div/max` |
| alpha / size / white / advect folds | ~7 ALU | once | |
| **total** | **≈ 80 ALU per particle vertex** | × 4 quad corners | |
| fragment | **unchanged** — no new varying, no new op; the `Discard` test is algebraically identical (§4a) | — | |
| CPU driver | 1 `damp` + ~10 uniform writes per frame | — | zero allocation; joins the block at `NeuralLattice.tsx:1119-1153` |

At the recommended 662-node / 32.1k-particle configuration: `32,154 × 4 = 128,616` vertex invocations × ~80 ALU ≈ **10.3 MFLOP/frame** on the vertex stage, 0.6 GFLOP/s at 60 Hz. Trivial on a discrete GPU.

**It is NOT trivially dismissible on the WebGL2 analytic tier**, where `anchorNode()` (edgeFrame + perpendicular frame + strand twist + fray + copy mask) also runs per-instance in the vertex shader with no compute stage to amortise it — `NeuralLattice.tsx:702-704` already flags *"9 000 extra `anchorNode()` evaluations for zero pixels"* at today's counts, and D17 removes the lateral cull entirely (`:688-697`). **That is the number that decides whether D23's 835-node option ships, and only a GPU capture answers it.**

### Fill — net roughly neutral

Against the shipped ledger of 612k px² (`neuralLatticeConfig.ts:1887-1901`):

| item | today | with the river |
|---|---|---|
| resting dust | 58k | unchanged outside the crest (all terms are 0) |
| crest dust | — | `+ (lit fraction) × N_link × 4.62 px × 13.6 px` — the honest new cost, scaling with `RIVER_M × 2σ` |
| beads (D24: 10.3 → 4.6 px) | 52k | **−42k** |
| line layer | 16k | **−16k** (deleted) |
| un-born field | — | **0** with the `lessThanEqual` fix; **the whole un-built field** without it |

### Bloom census

`threshold 1.0, intensity 1.1, radius 0.7` (`store/routeFxStore.ts:63-66`). The river adds **zero** sprites above 1.0 (crest dust 0.433). The storyboard's census of "5–8 sprites above 1.0" counts **stars only**; the ~76 packet beads at 2.23–3.65 are unaccounted for and already breach it by an order of magnitude — an existing, un-decided exposure, not something this design creates. Two levers if the parent wants compliance: gate `packetAt` by `born` (traffic only on built links), or multiply `packet` by `smoothstep(0, 0.3, river)` so beads exist only in the lit band (`RIVER_M = 4`, `RIVER_K = SURGE_K 150` ⇒ σ = 0.0816 nodeT ⇒ lit fraction ≈ 0.65 ⇒ ~49 beads; `RIVER_M = 1` ⇒ ~12).

---

## 7. TRAP CHECKLIST FOR THE IMPLEMENT AGENT

1. `cut` must carry every factor `alpha` carries — fold `born` into `cMask` at `:2227` (its only construction site; consumers `:2499`, `:2524`).
2. `alpha.lessThan` → `alpha.lessThanEqual` at `:2548` and `:3159`. `lessThanEqual` is a method chain in the installed three — no new import.
3. Birth is **value-only**. `simulate()` zero lines. Ribbon snap threshold is **`build.field.wrapSnapDist` 0.01060 ⇒ 0.0748 local/s**, not `WRAP_SNAP_DIST` 0.038 ⇒ 0.268.
4. Never `uReveal` — it arms the snap (`:3377`) and drives the coalesce (`:3340`, `:3245`).
5. `min()` is legal only as the shipped soft knee's `underL` (`:3085`), where the overflow is re-added. `min(x, CONST)` on a moving wavefront is the flat-top failure (`:3050-3062`).
6. Every new brightness term takes `.mul(cGate)` (hoisted at `:2226`; template at `:2425`). Arithmetically `cMask` alone suffices for the link branch (crest 0.433 × `COPY_MASK_FLOOR` 1e-4 = 2.8e-5, vs an AA budget of 0.0194), but `cGate` on the star river term is **mandatory** — the star ignition precedent exists precisely because a fully ignited core is ×15.5 its rest value.
7. `abs` is not destructured — use `max(d, d.negate())` (`:1741`).
8. Never evaluate a narrow travelling head in the LINE vertex stage: `LINK_SEGMENTS = 6` ⇒ Δs = 0.167, and a σ = 0.07 gaussian gets 0.42 samples/σ ⇒ strobe. `RIVER_K = 150` ⇒ σ = 0.0816 **nodeT**, which spans ~594 px of the 7278 px ribbon — comfortably wider than the 114 px mean edge, so a wave lights a link **end to end** instead of riding it as a bead. That width is the anti-blob guarantee; do not narrow it toward `PACKET_WIDTH`.
9. `uFront` comes from the frozen `p` (`traverseStore.ts:41-44`) through `THREE.MathUtils.damp` (precedent `NeuralLattice.tsx:909-913`). `Math.max(prev, next)` is a latch and violates D16.
10. `packetClock` is keyed by the **receiving node** (`:2107-2113`) so beads converge causally. `riverAt` must key on `nodeT`/phase, **not** per node, or every spoke of a high-degree star lights identically and reads as a repeating motif.
11. Reordering `traffic`/`alphaStream` above `emisStream` is legal (pure DAG) but the varying discipline at `:99-110` still binds: self-contained expressions only, never an outer `.toVar()` a Fn `.assign()`s into.
12. Blue / cyan / navy only. The whitening target is `uColCore` (`COL_CORE`); the only sanctioned warm is `uColEmberTip` on the broken fray, which `uBroken = 0` disables on this band.

**Owner decisions this design surfaces, which are not mine to make:** the particle budget (§2.5 — 19k / 32k / 41k for D23's three densities); reverting `NODE_FRACTION` 0.46 → ~0.30; whether the `LineSegments` layer is deleted outright or kept at `LINE_ALPHA = 0` as the reduced-motion / SSR / no-JS "settled and visible" fallback (it is currently the **only** thing in the build that exists with zero simulation — `:3186-3194`, built before the backend split); and the packet-bead bloom census.