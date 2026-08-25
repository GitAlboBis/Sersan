# THE BIRTH FRONT — read-only findings

All paths absolute-relative to `C:/Users/alber/Desktop/sersan-v2-main`. HEAD `cc10138`. No file touched.

---

## 1. `uReveal` today — and the proof it saturates before the traverse begins

**What it is.** One global scalar, `neuralFieldCompute.ts:959` `const uReveal = uniform(0);`. It has **no spatial argument anywhere**. Its five consumers:

| consumer | file:line | role |
|---|---|---|
| fragment alpha (all particles) | `neuralFieldCompute.ts:2248` `const alpha = disc.mul(v.vAlpha).mul(uReveal).toVar();` | master fade |
| compute anchor blend | `:3014-3015` `const rv = smoothstep(float(0), float(1), uReveal); const anchor = mix(seedPos, liveAnchor, rv).toVar();` | the coalesce |
| analytic-tier centre blend | `:2920-2921` `const rvS = …; const centerBase = mix(aSeed, anchorS, rvS);` | the same coalesce, no spring |
| link-line stagger | `:2709-2713` `smoothstep(hLink·LINE_REVEAL_STAGGER, hLink·LINE_REVEAL_STAGGER+0.45, uReveal)` | per-link knit-in |
| snap arming | `:3051` `select(uReveal.greaterThan(float(0.9)), one, float(0))` | the recycle-snap gate |
| membrane / nebula | `:2448`, `:2562` | master fade (membrane is dead, `MEMBRANE_ALPHA = 0`) |

**The driver arithmetic** — `NeuralLattice.tsx:625`, `:745-755`, `:924`:

```
const vpTop = rect.docTop - scrollY;                                  // :625
const vis = clamp((ih + CULL_PAD / 2 - vpTop) / (ih * 0.7), 0, 1);    // :745-749, CULL_PAD = 220 (:184)
revealDamped.current = damp(revealDamped.current, scrollStore.reveal * vis, 2.5, delta);  // :750-755
u.uReveal.value = revealDamped.current;                               // :924
```

`scrollStore.reveal` defaults to `1` (`store/scrollStore.ts:29`) and is only ever set 0/1 by route transitions. So the **target** is `vis`, and:

- `vis = 0` ⟺ `vpTop ≥ ih + 110`
- `vis = 1` ⟺ `vpTop ≤ 0.3·ih + 110`

At 1920×935: the target saturates when the band's top is **390.5 px below the viewport top**. The primary anchor is `absolute inset-y-0` of `[data-traverse-stack]` (`problem-section.tsx:547-549`), and the traverse measures `secTop` from the **section** rect (`use-diagonal-traverse.ts:364-365`), which carries `.section-lg { padding-block: 8rem }` = 128 px at ≥1024 px (`globals.css:495`). So `rect.docTop − secTop ≈ 128`, and the target reaches 1 at

```
scrollY = secTop + 128 − 390.5 = secTop − 262.5
```

i.e. **262 px before `p = 0`**, where `p = clamp((scrollY − secTop)/secH, 0, 1)` (`use-diagonal-traverse.ts:412-414`, `:454`).

**Verdict: proved — it saturates early, and worse than "early".** Three independent disqualifications:

1. The *target* is already 1 before the section's own progress starts. Only the λ = 2.5 exponential lag remains; at a 1000 px/s flick `uReveal` crosses 0.9 at ≈ 720 px into a 5358 px act (**p ≈ 0.13**) and 0.99 at **p ≈ 0.27**; at a reading 300 px/s it is ≈ 0.82 at `p = 0` and ≥ 0.9 before `p = 0.02`. Over 73–100 % of the run `uReveal` is a **constant 1.0**.
2. It is **not a function of `p` at all** — it is a function of `vpTop` (band top vs viewport) plus a *time-domain* filter. On a 5358 px band whose top is 128 px below `secTop`, `vpTop` never returns to the ramp until you leave the section upward, so it cannot dismantle mid-run.
3. The per-link stagger inherits the same fate: `LINE_REVEAL_STAGGER = 0.55` (`neuralLatticeConfig.ts:861`), window `[h·0.55, h·0.55 + 0.45]`, so the last link finishes exactly at `uReveal = 1`. **The whole stagger is spent on entry.** Zero of it lands on the traverse.

Corollary you must respect: `uReveal` **must keep its current meaning** — the snap arming at `:3051` and the coalesce at `:3015` key off it. The birth front is a **new, second** scalar (`uBuild`), never a repurposing of `uReveal`.

---

## 2. The front — `born(node)`

Phase must be a per-node scalar derived from data already bound. **It is: `nodeT`.**

`neuralLatticeConfig.ts:490-497` bakes it:
```js
const span = Math.max(xMax - xMin, 1e-3);
const nodeT = nodes.map((n) => (n[0] - xMin) / span);
```
— exactly "a baked per-node scalar from its own X", already normalised 0..1 **whatever the field's x extent becomes under D17**, and already bound as `uNodeT` (`:1016`), already read by `nodeTAt()` (`:1207-1209`) in the particle vertex stage *and* the line vertex stage (`:2645-2646`). **Zero new tables, zero new blocks.**

The Y term rides `uNodePos`, also already bound in both stages (`nodeAt()` `:1201-1205`; the line stage has `AL`/`BL` at `:2647-2648`).

### TSL — exact, ops all in the destructured set at `:912-945`

```ts
// one plain uniform() each — see §7 for the block argument
const uBuild  = uniform(0);   // front position in nodeT units, driver-written
const uBuildW = uniform(0.09);// soft knee width in nodeT units
const uFrontKy= uniform(0.0); // y→x phase slope; driver-written (see driver sketch)

/** The BAKED per-node birth phase. Pure function of the node's own x (via
 *  nodeT) plus a little y so the front is a diagonal. */
function phaseAt(idx: Any, nT: Any): Any {
  // nodeAt() is a uNodePos read — a block ALREADY referenced by this stage.
  return nT.sub(nodeAt(idx).y.mul(uFrontKy));
}

/** 0 → 1 as the front passes. C¹ by construction; SOFT is a knee, not a clamp. */
function bornAt(ph: Any): Any {
  return smoothstep(ph, ph.add(uBuildW), uBuild);
}
```

Op audit, every one already in this file:
- `smoothstep` — `:2709`, `:1471-1475`, `:1554` (dozens of sites)
- `sub` / `add` / `mul` — everywhere
- `min` — destructured `:928`, used `:2786` (`const underL = min(emisRawL, kneeL)`)
- `select` — `:1601-1605`, `:1741-1745`
- `uniform()` — `:959-967`
- `nodeTAt` / `nodeAt` — `:1201-1209`
- `exp(…negate())` (for §7) — `:1760` `exp(float(SURGE_K).mul(d.mul(d)).negate())`

`abs` is **not** destructured; the repo idiom is `max(d, d.negate())` (`:1470`, `:1483`). Do not import `abs`.

**Where each consumer gets its phase — all free:**

| consumer | phase source | new uniform reads |
|---|---|---|
| star particle (role 1) | `nT = nodeTAt(metaN.y)` already at `:2091`; `y` from `posN.y` (already a parameter, `:1922`) — the star's own offset is ≤ `STAR_FLARE_LEN` 0.03 (`neuralLatticeConfig.ts:989`) against a y span of ±0.42, negligible | **0** |
| link particle (role 0) | `tA`/`tB` already computed in `edgeFrame` at `:1317-1318`; `A`/`B` at `:1319-1320` and already returned `:1342`. **Extend the return object** `:1342` to `{ …, ia, tA, tB }` | **0** |
| link LINE vertex | `tAL`/`tBL` `:2645-2646`, `AL`/`BL` `:2647-2648` — all already there | **0** |
| spark (role 2) | leave un-gated (`born = 1`) — sparks are broken-mode only, `uBroken = 0` on the traverse band | — |

---

## 3. Links — existence gate + self-draw

**Existence.** In `buildLinkLineLayer` and in `particleScalars`'s link branch:

```ts
const phA = phaseAt(iaL, tAL).toVar();
const phB = phaseAt(ibL, tBL).toVar();
const bA  = bornAt(phA).toVar();
const bB  = bornAt(phB).toVar();
const born = min(bA, bB).toVar();          // both endpoints must exist
```

`min(bA, bB)` is C⁰-but-not-C¹ at the crossing. **This is not the flat-top trap.** That trap (documented `:2770-2782`) was `min()` against a *constant ceiling*, which pins a whole region to one value; here both arguments are strictly increasing in `uBuild`, so the min never produces a plateau — only a slope kink where two near-parallel ramps cross. If you want C¹ anyway, `bA.mul(bB)` is one op and strictly smoother; the cost is that the link is dimmer at the crossover (0.8·0.8 = 0.64 vs 0.80).

**Self-draw — the line to change is `neuralFieldCompute.ts:2649`:**

```ts
const posL = mix(AL, BL, sL).toVar();          // ← TODAY
```

Replace with a growth reparametrisation that draws **from the earlier endpoint**. Links are oriented by `nodeT` (`neuralLatticeConfig.ts` build pass; `edgeFrame` comment `:1303-1305` "links are ORIENTED by nodeT at build time, so tA ≤ tB"), but the `uFrontKy` y-term can invert that on a steep link, so the direction needs a `select`:

```ts
const fwd = phA.lessThan(phB);                              // draw A→B
const P0  = select(fwd, AL, BL).toVar();
const P1  = select(fwd, BL, AL).toVar();
const s0  = select(fwd, sL, float(1).sub(sL)).toVar();      // param from the near end
// g: grows from the near end, complete exactly when the far end is fully born
const g   = smoothstep(min(phA, phB), max(phA, phB).add(uBuildW), uBuild).toVar();
const posL = mix(P0, P1, s0.mul(g)).toVar();
```

This is the `crystalPlexus.ts:341-345` idiom ported to the GPU — literally `pt1 → lerp(pt1, pt2, progress)`:
```js
linePos[o + 3] = pts[a3] + (pts[b3] - pts[a3]) * t;   // crystalPlexus.ts:355
```

**`vLineRest` stays the baked chord — confirmed.** `:2807` `const vLineRest = varying(positionLocal);` and `positionLocal` is the *attribute*, baked by `neuralLinkLines.ts:125-127`:
```js
position[v * 3] = ax + (bx - ax) * s;   // the REST chord, undrifted
```
`bakeLinkLineGeometry` never sees `posL`, so changing `:2649` cannot move `vLineRest`. The fray dash at `:2846-2848` therefore stays welded to the rest geometry and **does not crawl** as the link grows — the exact property the module header calls out at `neuralLinkLines.ts:26-32`.

**Two consequences you must decide, not discover:**

- `tL` at `:2650` still uses **`sL`**, not `s0·g`. Leave it: `tL` is the narrative coordinate that `surgeAt`/`flashAt`/`rowResponse`/`dispFactor` sample, and re-parameterising it would make the surge wavefront crawl backwards along a growing link. The price is that while `g < 1` the drawn point at `s0` carries the *full chord's* `t`. At `LINK_SEGMENTS = 6` (`neuralLatticeConfig.ts:755`) and a mean link of ~0.035 of `nodeT` (`:2773` note) that mismatch is under the surge gaussian's own 0.068 half-width — invisible.
- `sF = vLineAux.w = sL` (`:2805`, `:2819`), so the tip fade `smoothstep(0, EDGE_FADE_IN, sF)·(1 − smoothstep(1−EDGE_FADE_OUT, 1, sF))` (`:2823-2825`) puts a soft tip **at the growing head**. That reads as a drawing head, which is what D14 wants. It is a happy accident, not a design — verify it in Chrome.

**Link particles (the dust/beads) must be gated by the same `born`**, or the traffic appears on links that have not been drawn yet. Gate `alphaStream` (`:2071`) by `born` *and* soft-gate against the head: `smoothstep(g.add(0.06), g, ef.s)` so a bead never rides past the drawn tip.

---

## 4. THE TRAP — `alpha` without `cut` deletes instead of fading

**The code.**

```ts
// particle: neuralFieldCompute.ts:2225
      cut: float(0.004).mul(cMask),
// particle fragment: :2248-2249
      const alpha = disc.mul(v.vAlpha).mul(uReveal).toVar();
      Discard(alpha.lessThan(v.vCut));
// line: :2812
    const vLineCut = varying(float(0.004).mul(maskL));
// line fragment: :2857
      Discard(alpha.lessThan(vLineCut));
```

The rule is stated in-source at `:2210-2222`, for the copy mask, and is the same rule:

> `Discard(alpha < 0.004)` is a fill optimisation sized on the layer's own scale; leave it absolute and the copy column's masked particles (star alpha 1e-4) are killed OUTRIGHT — which would not just delete the faint star field, it would put a HARD EDGE in the ramp… Scaling the threshold by the same mask makes the cut SCALE-INVARIANT

**Quantified for `born`, with today's constants** (`STREAM_ALPHA = 0.012` `:1563`, `NODE_ALPHA = 1.0` `:1036`, `LINE_ALPHA = 0.7` `:763`, `uReveal = 1`, `cMask = 1`):

| layer | alpha at rest | pops in at `born =` |
|---|---|---|
| **link dust** (`alphaStream`, `:2071`) | `0.012·disc·edge` | **0.333 / (disc·edge)** — a *third* of the ramp deleted at the link's centre; at a tip where `edge = 0.33` it never appears until `born ≈ 1` |
| star core (`alphaRing`, `:2157`) | `≈1.0·disc` | 0.004 |
| line (`alphaL`, `:2717`) | `0.7·fade·gapF·dash` | 0.0057 at mid-span |

So the failure is not subtle: **the link dust — the "traffic, not thread" the whole round-8-G grammar rests on (`:2050-2058`) — would snap on at a third of the birth ramp, and the link tips would snap on at the end.** Visually: nodes fade in, then their beads *appear*.

**The correct expression.** Scale both sides by the same factor, exactly as `cMask` is:

```ts
// particleScalars() return, :2220-2226
    return {
      colorE: tone.toVec3().mul(emis),
      alpha: alpha.mul(born),                       // was: alpha
      sizeK,
      cut: float(0.004).mul(cMask).mul(born),       // was: float(0.004).mul(cMask)
    };

// buildLinkLineLayer, :2801 and :2812
    const alphaOutL = alphaL.mul(maskL).mul(born).toVar();
    const vLineCut  = varying(float(0.004).mul(maskL).mul(born));
```

**The algebra that makes it correct** (the same proof as `:2214-2220`): the test becomes
`disc·vAlpha·born·uReveal < 0.004·cMask·born` ⟺ `disc·vAlpha·uReveal < 0.004·cMask` for every `born > 0`. **The surviving fragment set is byte-identical to today's** — no hard edge, no fill regression, at every point of the birth ramp.

**The one edge case, and it is a real fill bill.** `smoothstep` returns *exactly* 0 for `uBuild ≤ phase`, so on the un-reached half of the field `alpha = 0` and `cut = 0`, and `0 < 0` is **false** → nothing is discarded. The entire un-built field rasterises at zero contribution. Two fixes:

- minimal: change `:2249` / `:2857` to `lessThanEqual`. One token, kills the whole un-born fill, and is measure-zero-different elsewhere (`alpha` exactly equal to `cut` in float).
- or fold `born` into `sizeK` as well (`sizeK.mul(mix(float(0.35), float(1), born))`) — cheaper fill *and* a "the star swells as it ignites" read, but it changes the approved look and must go past the owner.

---

## 5. THE SECOND TRAP — birth must be VALUE-ONLY

**Confirmed, with the arithmetic.** If `born` is allowed anywhere near the anchor, the compute kernel destroys the coalesce.

```ts
// neuralFieldCompute.ts:3014-3015
    const rv = smoothstep(float(0), float(1), uReveal);
    const anchor = mix(seedPos, liveAnchor, rv).toVar();
// :3051-3064
    const armed = select(uReveal.greaterThan(float(0.9)), one, float(0))
      .mul(select(uRecohere.lessThan(float(0.02)), one, float(0)))
      .mul(select(dispersing.lessThan(float(0.02)), one, float(0)))
      .toVar();
    const linkSnap = mix(float(1e9), float(WRAP_SNAP_DIST), armed);
    …
    If(length(anchor.sub(pos)).greaterThan(snapDist), () => {
      pos.assign(anchor);
      velH.assign(vec3(0.0, 0.0, 0.0));
    });
```

`WRAP_SNAP_DIST = 0.038` (`neuralLatticeConfig.ts:1652`). The unified force is a critically-ish damped spring, `NEURAL_SPRING = 60`, `NEURAL_DAMPING = 8.5` (`:1611`, `:1613`), so the steady-state lag under a constant anchor velocity `v` is

```
SPRING·lag = DAMPING·v  ⇒  lag = (8.5/60)·v = 0.1417·v
```

which reproduces the shipped note at `:3046-3049` exactly (*"the reveal's own anchor speed is ≈0.12 local/s → a spring lag of ≈0.017"*). The snap therefore fires when

```
v > 0.038 / 0.1417 = 0.268 local units / s
```

A per-node birth that moved the anchor would move it across `|seedPos − liveAnchor|`, with `SEED_SCATTER_XY = 0.95`, `SEED_SCATTER_Z = 0.7` (`:1686-1687`) → a typical excursion ≈ 0.7 local. To stay under 0.268 local/s a single node's birth window would have to last **> 2.6 seconds**. On a 45° traverse the reader crosses a node's soft window in a fraction of that. And `armed` is **1** for exactly this case: `uReveal` is saturated (§1), `uRecohere = 0`, `dispersing = 0` on the healthy band. So `pos.assign(anchor); vel = 0` fires **every frame the front is on the node** — the coalesce becomes a permanent teleport, i.e. the "recycle streak" fix eating the effect it is supposed to protect.

Second half of the same trap: on the WebGL2 analytic tier there is **no spring and no snap** — `:2920-2921` is a straight `mix`. So an anchor-driven birth would look *smooth on WebGL2 and popped on WebGPU*. Two backends, two behaviours, from one change. Value-only removes both failures at once and leaves `simulate()` at **zero lines changed**.

---

## 6. Unlatched — what the viewer actually sees

`uBuild = f(p)`, `p` from the frozen frame (`traverseStore.ts:41-44` *"THE frozen scroll position. Every consumer derives from this."*; written once per `apply()` at `use-diagonal-traverse.ts:412-460`). At 45°, `R = tan45° = 1.0`, `secH ≈ 5358 px`, lateral run ≈ 5350 px ≈ **2.79 frame widths** at 1920.

**Scroll up 200 px, then back down.** If the front is authored to sit at a fixed *screen* position (the only way "just ahead of the reader" means anything), then because the rig lateral is `dir·R·travelled` (`use-diagonal-traverse.ts:460`, applied at `NeuralLattice.tsx:739` `rig.position.x = lateralPx * k`), 200 px of scroll = **200 px of lateral** = 200 px of screen-x. So:

- A **200 px-wide vertical strip at the front — 10.4 % of a 1920 frame — un-draws**: links retract toward their earlier endpoint (`g` falls), star cores dim through their soft knee, the dust on those links goes out.
- Coming back down, the identical strip re-draws through the identical curve. It is **reversible and exactly symmetric** — which is D16 delivered, and also the honest description of what "unlatched" costs: the net *breathes at the boundary*, it does not just stop growing.
- Everything more than `uBuildW` behind the front is pinned at `born = 1` and does not move at all. So the effect is a **local band**, not a global flicker. This is what makes it survivable.

**On a nervous trackpad.** Chrome delivers ±5–15 px of scroll jitter at 60 Hz on a trackpad rest. `smoothstep`'s maximum slope is `1.5/width`. With `uBuildW` chosen so the soft window spans ~260 px of screen travel, a ±10 px jitter produces

```
Δborn = 1.5 · 10 / 260 = 0.058
```

on the nodes sitting on the steepest part of the knee — a ±6 % alpha ripple. On a link line (post-blend 0.568, `:2730-2733`) that is invisible. On a **star core at 10.67 post-blend, above the 1.0 bloom threshold**, a 6 % ripple is a visibly shimmering bloom kernel, because the bloom threshold is a nonlinearity that amplifies small swings near it. That is the failure mode to expect, and it is on the stars, not the mesh.

**Deadband / slew that is not a latch.** The distinction that matters: a *latch* is `uBuild = max(uBuildPrev, f(p))` — monotone, irreversible, has memory at equilibrium. A *one-pole follower* is neither:

```ts
buildSmooth.current = THREE.MathUtils.damp(buildSmooth.current, target, 10, delta);
u.uBuild.value = buildSmooth.current;
```

It converges to `f(p)` **from either side**, it has zero state at rest (equilibrium *is* `f(p)`), and scrolling up still dismantles. λ = 10 gives a 100 ms time constant: it removes essentially all 60 Hz jitter and costs ≤ 1 frame of visible lag at 1000 px/s (≈ 17 px of front position). The shipped precedent is `revealDamped` itself, `NeuralLattice.tsx:750-755` at λ = 2.5 — same construction, slower. `THREE.MathUtils.damp` is frame-rate independent, so this does not become a different effect at 120 Hz.

Do **not** reach for a quantised deadband (`floor(p/step)`): it plateaus, and every step boundary is a C⁰ discontinuity in a moving field — the corpus trap "a hard `min()`/clamp on a moving wavefront flat-tops it" in its other clothes.

Two things to state to the owner rather than decide: (a) with a follower, two viewers at the same scroll position can differ for ~100 ms; (b) if he wants the retraction *slower than* the build (asymmetric), that is a two-λ follower — still not a latch, but it is a lie about `p`, and it will read as lag on a fast scroll-up.

---

## 7. The ignition band

D13's approved construction is the **screen-space** one (`research/2026-08-24-round11-diagonal-traverse-mechanism.md:1240-1300`), and its §6.1B argument against a local-frame front is worth re-reading before you commit: in the local frame the angle needs shearing by `wWorld/hWorld`, and the front would have to be authored *against* the net's own motion (`(−1.81, +1.98)` px per scroll px). The task asks for the local form with **the driver folding the lateral in** — which is exactly the compensation §6.1B warned about, moved from the shader into JS where it is one line and viewport-explicit. That is a legitimate trade; take it knowingly.

**TSL — local, emissive only, gated like `surgeAt`:**

```ts
const uFrontS  = uniform(0);    // front position, nodeT units (lateral already folded in)
const uFrontIW = uniform(6.0);  // 1/width — a reciprocal, not a divide in-shader

/** Travelling gaussian BAND. σ uses the SAME phase axis as the birth front,
 *  so light and structure ride one diagonal. */
function ignAt(ph: Any): Any {
  const s = ph.sub(uFrontS).mul(uFrontIW).toVar();
  return exp(s.mul(s).negate());
}
```

Shape and idiom are verbatim `surgeAt` (`:1758-1773`):
```ts
    const headP = exp(float(SURGE_K).mul(d.mul(d)).negate());
```
Publishing `1/W` rather than `W` avoids a per-vertex divide; `mul` + `negate` + `exp` are all already destructured (`:939`, `:936`).

**Gated like `surgeAt`.** Star branch — the surge's own gating at `:2126` is the template:
```ts
      .mul(float(1).add(surgeAt(nT).mul(0.6).mul(cGate)))     // :2126, shipped
      .mul(float(1).add(ignAt(ph).mul(uIgnGain).mul(cGate)))  // the new line, same shape
```
`cGate` is the copy-column gate hoisted at `:1927` — without it the band lights the copy lane and breaches the ROUND 9-B WCAG contract (`:2093-2103`).

**Emissive only — and where the >1.0 budget lives.** Put it on `emisRing` (`:2119-2128`) and on `emisStream` (`:2034-2043`). On the LINE layer it must go **inside the soft knee**, i.e. multiplied into `emisRawL` before `:2786-2792`, exactly where the scroll-velocity swell went (`:2761-2765`): *"It goes INSIDE the knee, so the ceiling still holds; putting it on alpha would have dodged the cap entirely."* Consequence, stated plainly: the **lines will brighten toward `LINE_LUM_MAX 0.97` and never bloom**; the bloom belongs to the star cores (10.67) and the beads (3.65) — `:2740-2744`. That is the right answer for "light carries the diagonal": the front reads as *stars igniting along a line*, not as a glowing bar.

Never touch `alpha` with `ign` — it would enter the `alpha`/`cut` algebra of §4 and re-open the discard trap.

**Block cost: ZERO. Confirmed, with the shipped precedent named.** Only `uniformArray` emits its own UBO; plain `uniform()` scalars join three's existing shared groups. Three in-source statements, all load-bearing:

- `:1001-1003` — *"the three new star knobs are plain `uniform()` scalars, which join an existing shared group and add no block"* (round-8-D: `uStarSpread`/`uStarPunch`/`uNodeAlpha`)
- `:1466-1470` — *"zero new uniform BLOCKS — `uCopyLaneW` is a plain scalar joining the existing shared group, so the 12/12 particle vertex stage is unmoved"*
- `:2618-2622` — **the named precedent**: ROUND 9-B added *"five plain `uniform()` scalars (a shared group, NOT a new UBO block — the 8-of-12 count above is unmoved)"* to the link-line vertex stage.

So `uBuild`, `uBuildW`, `uFrontKy`, `uFrontS`, `uFrontIW`, `uIgnGain` = **6 plain scalars, 0 blocks, 0 varyings, 0 storage buffers**. Particle vertex stage stays 12/12 (`:993-1005`); line vertex stage stays 8/12 (`:2606-2612`). Varyings: `born` folds into the *existing* `vAlpha`/`vCut` and `vLineAux.x`/`vLineCut` sources — the line material stays at 4 of the `MAX_VARYING_VECTORS` floor of 15 (`:2621-2625`).

---

## 8. Frame-time cost — and what a profiler has to tell you

**What is knowable statically.**

| stage | added work | count | note |
|---|---|---|---|
| particle vertex (`particleScalars`) | 2 `smoothstep` + 1 `min` + 2 `mul` + 1 `mul` on `cut`; the `exp` band ≈ 4 ALU | ~16 ALU × `NEURAL_PARTICLE_COUNT` 9000 (`:177`) / 3200 compact (`:202`) | zero new uniform reads (§2) |
| line vertex | same, plus 3 `select` + 1 `mix` for the self-draw | ~24 ALU × `EDGE_N·LINK_SEGMENTS·2` = 250·6·2 = **3 000 vertices** (`:749`, `:755`) | rounding error |
| fragment | **unchanged** — no new varying, no new op; `Discard` test algebraically identical (§4) | — | |
| compute kernel `simulate()` | **zero lines** (§5) | — | this is the whole point |
| CPU driver | 1 damp + ~6 uniform writes per band per frame | — | zero allocation; join the existing block at `NeuralLattice.tsx:924-933` |

**The real cost is not the ALU — it is that D17 deletes the only cull you have.** `NeuralLattice.tsx:688-696` culls per **band**, not per node:
```ts
    if (lateralPx !== 0) {
      const cxNow = cx + lateralPx;
      if (cxNow + rect.w / 2 < -CULL_PAD || cxNow - rect.w / 2 > vw + CULL_PAD) {
        group.visible = false;
```
With five islands, four were culled most of the time. With **one** field spanning the whole run, *nothing* is ever culled: every node, every link, every particle is vertex-shaded every frame regardless of the front's position — and §4 proves `born` buys **zero fill back** by construction. The `lessThanEqual` change (§4) is therefore not a micro-optimisation; it is the only thing that stops the un-born ~50 % of the field from rasterising for nothing.

**The adjacent hard wall, which is a link-time failure and not a frame-time one — flag it now.** The corridor enlargement D17 implies is **11.5×** → **1188 nodes** (`research/2026-08-24-round11-coverage-trilemma.md:16`, `:124`). `UniformArrayNode` pads every element to vec4 = 16 B, so the WebGL2 `MAX_UNIFORM_BLOCK_SIZE` 16 KiB floor is **1024 elements, hard** (`ibid.:127`). `uNodePos` at 1188 nodes is **18.6 KiB — over the floor, with no packing escape for vec3** (`ibid.:137`). The birth front is compatible with any of the escapes (`nodeT` is normalised, so it survives tiling, wrapping and index-packing untouched), but **the one-continuous-field topology does not fit the current binding strategy** and that decision is upstream of this work.

**What you cannot know without a profiler, stated honestly:**

1. Whether the added vertex ALU registers at all. The particle vertex stage is at **12/12 UBO blocks with zero headroom** (`:993-1005`) and reads four storage buffers on the WebGPU tier (`:3131-3136`); it is far more likely bound by uniform/storage fetch latency than by ~16 ALU. Unmeasurable from source.
2. Whether the **WebGL2 analytic tier** is already vertex-bound. There `anchorNode()` runs per instance in the vertex shader (`:2919`, `:2926-2931`) with no compute stage to amortise it — the file itself calls this out at `NeuralLattice.tsx:702-704` (*"9 000 extra `anchorNode()` evaluations for zero pixels"*). At the D17 enlargement that becomes ~104 000 (`trilemma:124`). This is the number that decides whether D17 ships at all, and only a GPU capture answers it.
3. Whether the star-core bloom ripple of §6 is visible. It depends on the PostFX threshold's knee shape and the tonemapper, neither of which is derivable from the alpha arithmetic.
4. Whether `select`-built branch divergence in the self-draw (§3) costs anything. On a warp where half the links draw A→B and half B→A, both sides execute; at 3 000 vertices it should be free, but "should be" is not a measurement.
5. Whether the follower's λ (§6) is right. That is an owner call made live in Chrome, not an arithmetic one — he is the instrument.

---

## TRAP CHECKLIST

1. **`cut` must carry every factor `alpha` carries.** `:2225`, `:2812`. Scale `cut` by `born` or the link dust pops in at `born = 0.333` and the link tips at `born ≈ 1`. Proof of scale-invariance: `:2214-2222`.
2. **`smoothstep` returns exactly 0 ⇒ `0 < 0` is false ⇒ no discard.** The un-born field rasterises at zero contribution. Fix `:2249` / `:2857` to `lessThanEqual`, or accept the fill.
3. **Birth is VALUE-ONLY.** Touching `anchor` (`:3015`) trips `WRAP_SNAP_DIST` 0.038 at any anchor speed above **0.268 local/s** (`lag = 0.1417·v` from `NEURAL_SPRING` 60 / `NEURAL_DAMPING` 8.5), because `armed` (`:3051`) is 1 on the healthy band. `simulate()` stays at zero lines changed.
4. **Do not repurpose `uReveal`.** It arms the snap (`:3051`) and drives the coalesce (`:3015`, `:2921`). `uBuild` is a new scalar.
5. **`vLineRest` must stay `positionLocal`** (`:2807`) — the baked rest chord from `neuralLinkLines.ts:125-127`. Change `:2649` only; never bake `g` into the attribute, or the fray dash crawls.
6. **`tL` (`:2650`) stays on `sL`**, not on `s0·g`, or the surge wavefront crawls backwards along a growing link.
7. **No hard clamp on a moving wavefront.** `min(bA,bB)` between two rising ramps is safe (no plateau); `min(x, CONST)` is the flat-top failure of `:2770-2782`. If you want C¹, use `bA.mul(bB)`.
8. **Ignition is emissive only, and inside the line's soft knee** (`:2786-2792`). On alpha it dodges `LINE_LUM_MAX` and re-enters the discard algebra.
9. **`cGate` every new brightness term** (`:1927`, template at `:2126`) or the copy lane breaches the ROUND 9-B contract.
10. **Zero new `uniformArray`.** Both stages are at their documented ceilings (`:993-1005`, `:2606-2612`). Plain `uniform()` only — precedent `:2618-2622`.
11. **`abs` is not destructured.** Use `max(d, d.negate())` (`:1470`).
12. **`p` comes from the frozen frame only** (`traverseStore.ts:41-44`). No `window.scrollY`, no `performance.now()`, no `getBoundingClientRect()` in the frame path — `getBoundingClientRect()` returns the *transformed* box, which already cost a P0 in stage 1.
13. **A slew limiter is not a latch; `Math.max(prev, next)` is.** Use `THREE.MathUtils.damp` (precedent `NeuralLattice.tsx:750-755`), which converges to `f(p)` from both directions and holds no state at equilibrium.
14. **`extend edgeFrame`'s return (`:1342`) rather than re-reading `uEdgeA`/`uEdgeB`** — `tA`, `tB`, `A`, `B` are already computed at `:1317-1320`; a second read is a second block reference risk for zero gain.