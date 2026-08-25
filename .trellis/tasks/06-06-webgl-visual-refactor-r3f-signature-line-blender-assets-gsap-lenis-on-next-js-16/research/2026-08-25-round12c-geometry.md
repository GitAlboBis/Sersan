## 1. THE ANCHOR→WORLD MAPPING, AS IT IS TODAY

All in `src/webgl/NeuralLattice.tsx`, inside the one `useFrame` (`:543-1017`).

```
:551-553   const ih = size.height; const vw = size.width;
           const k = WORLD_VIEW_HEIGHT / ih;
:625-627   const vpTop = rect.docTop - scrollY;      // scrollY = tv.scrollY when onBand (:568)
           const cx = rect.cxBase;                   // = vw/2 for a full-bleed anchor
           const cy = vpTop + rect.h / 2;
:720-721   const wWorld = rect.w * k;  const hWorld = rect.h * k;
:727-729   const zWorld = tv ? WORLD_VIEW_HEIGHT * NEURAL_DEPTH_VIEWPORT_SPAN
                             : hWorld * NEURAL_DEPTH_SCALE_FACTOR;
:730-735   scratch.set((cx - vw/2)*k, (ih/2 - cy)*k, -CAMERA_Z)
             .applyQuaternion(camera.quaternion).add(camera.position);
           group.position.copy(scratch); group.quaternion.copy(camera.quaternion);
:739       rig.position.x = lateralPx * k;
:740       scaleGroup.scale.set(wWorld, hWorld, zWorld);
```

Closed form: a node at LOCAL `(lx, ly, lz)` renders at viewport CSS

```
vx = cx + lateralPx + lx·rect.w          vy = cy − ly·rect.h        (local +y is up)
```

with `rect` measured at `:343-434` (`cxBase = r.left + r.width/2`, `docTop = r.top + scrollY`). `rect.docTop`/`rect.w`/`rect.h` are read on `measureVersion` / `sersan:remeasure` / `size.*` only — never per frame. The `[data-lattice-anchor]` box is full-bleed (`problem-section.tsx:549`, `production-grade-section.tsx:466`: `left-[calc(50%-50vw)] right-[calc(50%-50vw)]`), so `rect.w ≡ vw`, `cxBase ≡ vw/2`, `(cx − vw/2)·k ≡ 0`, and **local x = 0 is the viewport centre-line**. Local x is therefore in band-WIDTH fractions and local y in band-HEIGHT fractions — that asymmetry is what every downstream constant is stated in.

Constants:
- `NEURAL_DEPTH_SCALE_FACTOR = 1.0` (`neuralLatticeConfig.ts:1696`) — the legacy `zWorld = rect.h·k` branch, used by every **un**-traversed band (`#production`).
- `NEURAL_DEPTH_VIEWPORT_SPAN = 0.8597` (`:1726`) — the traversed branch. `zWorld = 11.191 × 0.8597 = 9.6212` at every viewport; node world-z `±zWorld·PLEXUS_RZ = ±1.9242`; `minNodeDist = CAMERA_Z − 1.9242 = 10.0758`. The header (`:1699-1726`) states the catastrophe it defuses (a 4392 px anchor ⇒ `zWorld 68.26` ⇒ nodes behind the camera).
- `BAND_ASPECT = 0.45` (`:263`) — **build-time only**: it converts local x into height units before any distance is measured (`sd()` at `:494-501`, the crystal well at `:475`, `midInWell` at `:512`). "The live rect aspect is `uPlaneAspect` … this constant only shapes the static topology" (`:256-262`).
- `uPlaneAspect` — driver-written per frame, `NeuralLattice.tsx:960`: `u.uPlaneAspect.value = rect.h / Math.max(rect.w, 1)`. Feeds the camera-facing star geometry and both quad layers.

The rig (`:466-482`, `:1253-1292`): `groupRef` (position + quaternion, **scale 1**) → `rigRef` (world-unit lateral, OUTSIDE the anisotropic scale) → `scaleRef` (`w·k, h·k, zWorld`) → `innerRef` (orbit/parallax). `SignatureLine.tsx` is untouched; every island is exactly invariant under a camera write.

---

## 2. DELETION LIST — everything that exists only for the vertical ladder

**`src/webgl/neural/traverseConfig.ts`**
| symbol | lines |
|---|---|
| `interface TraverseIsland` (`seed`, `dy`) | `101-112` |
| `interface TraverseIslandsConfig` (`enabled`, `compensate`, `leadVh`, `tailPin`, `extras`) | `114-157` |
| `interface TraverseLadderFit` | `159-172` |
| `fitTraverseLadder()` | `174-231` |
| `MAX_TRAVERSE_ISLANDS = 4` | `233-235` |
| `TraverseConfigShape.islands` field | `239-240` |
| the authored ladder literal (`enabled/compensate/leadVh 1.203/tailPin/extras[3.71, 23.09, 41.53, 68.27]`) + its 30-line fit commentary | `301-340` |
| `setTraverseConfig`'s `islands` merge arm | `377-387` |
| `traverseIslands()` | `393-398` |
| `bandVh: 0.8597` → becomes `1.0` (not deleted; re-authored) | `298` |
| `angleDeg: 23.61` → `45` | `273` |

**`src/components/fx/use-diagonal-traverse.ts`**
| symbol | lines |
|---|---|
| imports `traverseIslands`, `fitTraverseLadder`, `MAX_TRAVERSE_ISLANDS`, `TraverseLadderFit` | `74-80` |
| `let ladderFit` | `193-194` |
| `armCss()`'s `if (!traverseConfig.islands.enabled) clearIslands()` | `216` |
| `clearIslands()` | `219-226` |
| `placeIslands()` (whole function, incl. the `--tv-island-N` / `-on` writes) | `228-285` |
| the `placeIslands()` call in `measure()` | `398-401` |
| `coverage()`'s `compensate` / `origin` terms | `722`, `749`, `773` |
| the whole `get ladder()` handle | `827-848` |
| `clearIslands()` in teardown | `874` |

**`src/components/sections/problem-section.tsx`**
| symbol | lines |
|---|---|
| `import { MAX_TRAVERSE_ISLANDS }` | `11` |
| the entire `=== ROUND 11 STAGE 1.5 — THE ISLAND LADDER ===` CSS block (`[data-traverse-island]` base rule + the four `--tv-island-N` rules) | `317-359` |
| `ISLAND_SLOTS` | `383-386` |
| the four extra anchors `<div data-lattice-anchor={\`problem-i${n}\`} data-traverse-island={n} …>` | `587-603` |

**`src/webgl/NeuralLattice.tsx`**
| symbol | lines |
|---|---|
| imports `traverseIslands` | `136` |
| props `plexusSeed`, `plexusWell`, `primary`, `strictCull` (and their doc blocks) | `232-262` |
| `anchorLive` / `buildGate` (the extras-only build gate) | `275-289`, `292`, `339` |
| the `setAnchorLive` arms in `measure()` | `348-363` |
| the `compensate` branch (per-island strip-x origin) | `588-599` |
| `primary` guards on the DPR cap and the pulse write-back | `613`, `771-776` |
| the LATERAL cull | `683-697` |
| the `strictCull` visibility expression | `698-717` |
| `plexus`/`cost` dev getters that exist to prove five constellations differ | `1029-1060` |
| the fan-out wrapper's `cfgRev` subscription, `extras` memo and `extras.map` | `1335-1349`, `1362-1376` |
| `strictCull={extras.length > 0}` | `1360` |

**`src/webgl/CrystalCluster.tsx`** — the `islands.compensate` origin, twice: `485-497` (frame path) and `938-949` (dev handle `traverse` getter).

**`src/webgl/neural/neuralLatticeConfig.ts`** — `PLEXUS_SEEDS_STONELESS` (`:225-235`) exists only for stone-less extras; it dies with `plexusWell=false`.

Note: `compensate` does not disappear conceptually — see §3. It collapses from a per-island function of that island's `docTop` into ONE global constant.

---

## 3. THE REPLACEMENT — coordinate algebra

Reference viewport = the one the handoff measured, **1920×935**, `#problem` `secTop 5563 / secH 5358` ⇒ `runwayVh = 5358/935 = 5.730`. `R = tan 45° = 1.0`, `dir = −1`.

### 3.1 The scalars

```
run  = R · secH                    = 5358 px = 2.791 vw          (the full lateral run)
Λ    = run / vw                    = 2.791                        (run in band-widths)
L    = Λ + 1                       = 3.791 band-widths = 7278 px  (field local-x extent)
```

`L = Λ + 1` and not `Λ`: at `p=0` the frame already sits on the field's leading edge and at `p=1` on its trailing edge, so the field must be the run PLUS one frame — this is the coverage-trilemma's swept corridor (`2026-08-24-round11-coverage-trilemma.md` §2.1) restated for a ribbon.

### 3.2 The group's X

`cxBase = vw/2` ⇒ the `(cx − vw/2)·k` term is identically 0, so the whole X story is the rig:

```
lateralPx = tv.xScenePx − dir·R·secH/2            // one global constant, not per island
          = R·secH·(0.5 − p)      for dir = −1     (xScenePx = −R·secH·p)
rig.position.x = lateralPx · k                     // NeuralLattice.tsx:739, unchanged line
```

The subtracted half-run is exactly what `traverseConfig.islands.compensate` was — "the lateral at the scroll position where this thing is centred" — with the one band centred at `p = 0.5`. `CrystalCluster.tsx:485-497` gets the identical constant so stone and net stay registered to float noise.

### 3.3 What X of the field is on frame at p

A node at local x renders at `vx = vw/2 + R·secH·(0.5−p) + lx·vw`. Solving `0 ≤ vx ≤ vw`:

```
lx ∈ [ Λ·(p − 0.5) − 0.5 ,  Λ·(p − 0.5) + 0.5 ]
```

A window of width exactly **1.000 band-width**, its centre sweeping `−Λ/2 → +Λ/2` (i.e. `−1.396 → +1.396`) linearly in p. Field extent: `lx ∈ ±L/2 = ±1.8955`. **The reader travels toward +x in the field** — D14's birth front sweeps +X, correct by construction.

### 3.4 The vertical — the part the brief does not state and that the algebra forces

"Frame height" + "as long as the lateral run" + "a pure X offset" only hold together if the ribbon is **diagonal in the field**, i.e. a node's local y depends on its local x. With `rect.h = ih` (bandVh 1.0), `hWorld = ih·k = WORLD_VIEW_HEIGHT` exactly, so **local y unit = one frame height**.

Bake slope `μ = dly/dlx` and the screen y of the ribbon centreline is:

```
screenY = cy − ly_c·ih ,  cy = docTop − scrollY + ih/2 ,  ly_c = μ·Λ(p−0.5) + c0
μ·Λ = −secH/ih   ⇒   μ = −(vw/ih)/R
⇒ screenY = (docTop − secTop) + ih/2 − secH/2 − ih·c0        ← CONSTANT in p
```

The anchor's vertical scroll is cancelled exactly by the ribbon's own slope. At 1920×935, `μ = −2.0535` (in pixels that is `dy/dx = −1/R = −1`, i.e. a true 45° stripe). The field's local-y bbox is `±(runwayVh + 1)/2 = ±3.365` frame-heights, of which only a 1.0-thick diagonal stripe carries nodes.

`c0` is the one fitted number that survives from `fitTraverseLadder`: it must be derived from the MEASURED act (`(docTop − secTop)/ih` is 1.803 vh @1280×720, 1.554 @1440×900, 1.419 @768×1024 — `traverseConfig.ts:88-99`). Cheapest: leave the node table symmetric and put `c0` on the rig as a constant `rig.position.y = yReg·k`, written per measure — the rig is outside the anisotropic scale so `yReg` is honest CSS px.

`μ` and `L` are **viewport-dependent** (`μ` on aspect, `L` on `secH/vw`), and the plexus is memoised at build time (`getPlexus`, `neuralLatticeConfig.ts:411-429`). So they must NOT be baked. Author the field in RIBBON coordinates `(u ∈ [0,1] along, v ∈ [−0.5,0.5] across, w = depth)` and map inside the single accessor:

```
nodeAt()  neuralFieldCompute.ts:1201-1205
   x = (u − 0.5)·uFieldLen        // uFieldLen = L
   y = v + uFieldSlope·x          // uFieldSlope = μ
   z = w
```

`uFieldLen` / `uFieldSlope` are plain `uniform()` scalars — they join an existing shared group and cost **zero UBO blocks**, so the particle vertex stage stays at 12/12 (`neuralFieldCompute.ts:992-1008`). `nodeAt()` is the single accessor read by stars (`:1691` `nodeAt(aux).add(nodeDrift(aux, nT))`), link particles (`edgeFrame` `:1307`) and the `LineSegments` chord (`:2643-2649`), on both backends — one function, four consumers, zero shader-graph duplication.

### 3.5 Field size and the uniform walls

Today's cloud: 103 nodes in an ellipse of semi-axes `(0.48·1920, 0.42·803.8) = (921.6, 337.6)` ⇒ **0.977 Mpx², 105.4 nodes/Mpx²**. Frame = 1.795 Mpx². Ribbon = `7278 × 935 = 6.805 Mpx² = 3.791 frames`.

| | nodes | edges (×2.204) | `uNodePos` | `uEdgeA` alone | particles (∝ nodes) |
|---|---|---|---|---|---|
| shipped | 103 | 227 | 1.6 KiB | 3.5 KiB | 9 000 |
| **ribbon @ on-frame parity** (57.4 nodes/Mpx², 103 visible) | **391** | **861** | 6.1 KiB ✔ | 13.5 KiB (84 % of floor) ⚠ | **~34 200** |
| ribbon @ today's areal density (190 visible) | 717 | 1580 | 11.2 KiB ✔ | 24.7 KiB ✘ / 1580 > 1024 elements ✘ | ~62 700 |

`MAX_UNIFORM_BLOCK_SIZE` floor 16 KiB and `UniformArrayNode` pads every element to vec4 ⇒ **1024 elements hard**. At parity it fits with no margin; at density it does not. The escape is already documented and unexercised: merge `uEdgeA`+`uEdgeB` into one `uniformArray(Vector4[])` index-packed as `a + 1024·b`, four edges per element (trilemma §5.1) — 861 edges → 216 elements → 3.5 KiB, and **−1 UBO block on both programs** (particle vertex 12→11, line 8→7). `PLEXUS_EDGE_CAP.full = 250` (`neuralLatticeConfig.ts:246`) and `PLEXUS_SEEDS.full = 132` (`:219`) both need re-authoring.

**The phone is the binding case, not the desktop.** D12 holds the ANGLE, so `L = R·secH/vw + 1` scales as `1/vw`. At 390×844 with the measured 5.45 vh runway (`traverseConfig.ts:277`): `secH = 4600`, `Λ = 11.79`, **`L = 12.79`**. Parity density there is `56/0.329 = 170 nodes/Mpx²` over a `4.21 Mpx²` ribbon ⇒ **716 nodes, 1578 edges, ~40 900 particles on a phone** — 1.83× the desktop field. Index-packing is mandatory there and so is §4.

---

## 4. CULLING

**What must change in the two existing culls**

- **Vertical cull, `:679-682`** (`vpTop + rect.h < −CULL_PAD || vpTop > ih + CULL_PAD`) becomes WRONG for the ribbon: the anchor is one frame tall while the ribbon is on frame for the whole act (§3.4). It must key on the SECTION, which the store already publishes — `use-diagonal-traverse.ts:452` writes `frame.active = sy + ih > secTop && sy < secTop + secH`. So: `if (tv && !onBand) { group.visible = false; return; }`, with `CULL_PAD` hysteresis applied to `secTop/secH`, and the legacy `rect`-based test kept for un-traversed bands.
- **Lateral cull, `:683-697`** — delete. It is expressed on `rect.w` (the anchor box), so at `R = 1` it fires when `lateralPx < −(vw + CULL_PAD) = −2140 px`, i.e. at **p = 0.40**; with today's single 0.909-band-wide cloud the net is in fact fully gone at **p = 0.342**. That is the "do nothing" baseline for 45° and exactly why the field has to be `L` wide.
- **`strictCull`** — delete the prop entirely (`:235`, `:262`, `:698-717`, `:1360`, `:1374`).

**Is there an existing per-particle cull to reuse? No.** Culling is explicitly disabled — `object.frustumCulled = false` (`neuralFieldCompute.ts:2864`) and `frustumCulled={false}` on all three meshes (`NeuralLattice.tsx:1265, 1273, 1286`). The only kills are FRAGMENT stage and save fill, not vertex work:

```
neuralFieldCompute.ts:2225   cut: float(0.004).mul(cMask),
neuralFieldCompute.ts:2249   Discard(alpha.lessThan(v.vCut));
neuralFieldCompute.ts:2810   const vLineCut = varying(float(0.004).mul(maskL));
neuralFieldCompute.ts:2857   Discard(alpha.lessThan(vLineCut));
```

The one CPU handle is `geometry.instanceCount = count` (`:1136`) — prefix-only, useless for a window that starts at a moving offset.

**What the intra-field cull must become**

1. **Line layer — exact and free.** `bakeLinkLineGeometry` (`neuralLinkLines.ts:101-134`) lays vertices out contiguously per edge: `vertexCount = edgeCount · seg · 2`, `LINK_SEGMENTS = 6` ⇒ **12 vertices per edge**. Sort the delivered edge list by min-u at build time (the edge SET is unchanged; only `chosen`'s order in `buildPlexus:558` moves, and `edgeIdx` is baked into `meta` so both layers stay consistent) and then `build.links.geometry.setDrawRange(firstEdge*12, nEdges*12)` per frame — two integer writes, zero allocation.
2. **Particle layer — chunked instancing.** `InstancedBufferAttribute` has no instance offset, so split the field into N sub-meshes over contiguous instance slices, each an `InstancedBufferGeometry` whose attributes are zero-copy `subarray()` views of the same buffers, all sharing ONE material and mounted as siblings inside `innerRef`. `chunk.visible` per frame. Cost: N `Object3D`s, ~`N/L` visible, **zero extra UBO blocks** (one material) and — unlike the tiling option — **no view-space rewrite of the copy mask**, because every chunk is in the same local space, so `posN.x` is still the same field coordinate (this is the trap the trilemma flags at §4.2(i)).
   Prerequisite: `seedBuffers` (`:791-870`) must be re-ordered. Today link particles occupy `[0, edgeTotal)` in EDGE order (`:838-852`) and star particles are **round-robin interleaved** — `const node = (i − edgeTotal) % nodeN` (`:857`) — so any instance slice touches every node.
3. **Cheap fallback that needs no reordering** (fill only, vertex stage still runs): a `wGate` in `particleScalars` zeroing `sizeK` outside the on-frame window ± pad, built on the idiom already there — `const cGate = copyGateAt(posN.x).toVar()` / `const cMask = copyMaskAt(posN, cGate).toVar()` (`:1926-1928`), applied at `:2200` `.mul(cMask)`. ~4 ALU, proven cross-backend.

At 45° this is not an optimisation: **73.6 % of the desktop field and 92.2 % of the phone field are off frame at every instant.**

---

## 5. CONSUMER-MIGRATION TABLE

| consumer | where | what happens | what it must become |
|---|---|---|---|
| `uCopyLaneC` / `uCopyLaneW` (frame path) | `NeuralLattice.tsx:662-663` — `(tv.laneCenterPx − cx − lateralPx)/bandW`, `(tv.laneHalfPx/bandW + COPY_EDGE_PAD)·v` | **Form survives unchanged.** It already subtracts `lateralPx` and divides by `rect.w`, which is still the local-x unit. | no change |
| same, measure-time + restore branch | `:446-451`, `:667-676` | `COPY_LANE_OPEN_W = 2.0`'s stated invariant — "the unused left wall at local x ≈ −1.5, far outside the cloud's [−0.45, +0.51] extent" (`neuralLatticeConfig.ts:1957-1975`) — is **falsified** by a field of ±1.896: the left wall lands inside the field. | raise to ≥ `L/2 + max|laneC| ≈ 4.0`; re-derive the fp32 round-trip note |
| `uCopySoft` / `uCopyFloor` / `uCopyLineFloor` | `COPY_RAMP_SOFT 0.1` `:1951`, `COPY_MASK_FLOOR 1e-4` `:1993`, `COPY_MASK_FLOOR_LINE 3e-3` `:2007` | Unaffected — the WCAG ledger (`:1786-1830`) is per-pixel. | no change |
| `copyYAt` vertical term | `neuralFieldCompute.ts:1476-1483`; `COPY_Y_IN 0.18 / COPY_Y_OUT 0.46 / COPY_Y_FLOOR 0.6` (`:2016-2027`) | **Breaks.** It reads `p.y`, which now spans ±3.365 frame-heights; the bell would return 1 everywhere except a thin slab through the field origin — the 40 % ceiling drop over the reading zone vanishes. | evaluate on the ACROSS-RIBBON coordinate `v` (which is already in frame-height fractions — exactly the semantic the constants assume) |
| `uPlaneAspect` | `NeuralLattice.tsx:960` | `rect.h/rect.w` goes `803.8/1920 = 0.4186` → `935/1920 = 0.487` at 1920×935. Form correct. | no change; note the star geometry gets 16 % taller-corrected |
| `BAND_ASPECT` (build-time) | `neuralLatticeConfig.ts:263`, used at `:475, 494-501, 512` | Still the correct x→height conversion, but the topology must be measured in RIBBON space now, not in the ellipsoid's. | fold `L` into the ribbon metric inside the new generator arm |
| `nodeT` semantics | `:485-487` `(x − xMin)/span` | **Breaks everything narrative.** With `span = L = 3.791` instead of 0.909, `FRACTURE_T 0.62` (`:1119`) maps to local x **+0.454** instead of today's +0.139, i.e. nowhere near the stone. `SURGE_SPEED 0.55` (`:1174`) now sweeps 4.2× the distance in the same time. | `nodeT ≡ u`, the along-ribbon coordinate. `FRACTURE_T` re-derived as the stone's `u`. Same coordinate D14's birth front needs. |
| `PLEXUS_CENTROID_K = 70` | `:287`; the 5 centroids at `:565-582`; note at `:131-138` ("at K = 70 the spine puts [the fracture] at local (+0.139,+0.023) with the stone at (+0.17,−0.05)") | Gaussian half-width ≈0.10 of `nodeT` = 0.091 band-widths today → **0.379** band-widths on the ribbon. The spine over-smooths and `streamCenter(FRACTURE_T)` walks off the stone. | scale K by `(span_new/span_old)² ≈ 17.4` (K ≈ 1218), or make the spine ribbon-local |
| crystal placement | `CrystalCluster.tsx:502-503`, `:560` (`s = rect.h·k·scale·scaleMul`), `:769` (`pxScale`), `:576` (`a = (vpTop + rect.h/2 − ih/2)/ih`) | `rect.h` goes `0.8597·ih → ih` (×1.163), so every band-keyed constant grows 16.3 %. `crystalConfig.ts:432-455` is the audit table and it prescribes the fix: `C_vp = CRYSTAL_SCALE·rect.h/ih`. `:553-558` says `s` and `pxScale` **must move together**. | `CRYSTAL_SCALE 0.115 → 0.0989`; `CRYSTAL_POS.y −0.05 → −0.043`; `FOG_RADIUS_Y 0.311 → 0.2674`. `CRYSTAL_POS.x` is width-keyed ✔ |
| crystal ↔ field registration | `CrystalCluster.tsx:502` `cx = rect.cxBase + pos[0]·rect.w + lateralPx` | The stone sits at **field local x = `pos[0]` = 0.17, constant** — it rides the field. So it is on frame for only `1/L` of the run (**26.4 %** desktop, **7.8 %** phone). That is D3 ("absent during travel, first sighted late"), delivered by the geometry. | re-author `CRYSTAL_POS.x` as a point along the ribbon (`u`), not a band fraction |
| clearance well | `buildPlexus:471-477`, `midInWell:508-513`; `CRYSTAL_CLEAR_INNER 0.17 / OUTER 0.4` (`:331-332`) | Metric is `hypot((x−ccx)/BAND_ASPECT, y−ccy)` — stays correct **only while local x remains band-width-normalised**, which §3.4 preserves. The well must be carved at the stone's ribbon `u`. | one well, at the stone's `u`; `PLEXUS_SEEDS_STONELESS` dies with the extras |
| arrival ramp | `NeuralLattice.tsx:745-755` `vis = clamp((ih + 110 − vpTop)/(0.7·ih), 0, 1)` | With a 1-frame anchor inside a 5.73 vh act, `vis` saturates at 1 after `0.3·ih + 110` px and **never returns to 0** — one reveal for the whole field, 34 000 particles coalescing at once. | keep `uReveal` as the mount fade; D14's birth front is a SEPARATE plain `uniform()` scalar compared against `u` (zero UBO blocks, pure function of `p` ⇒ D16 unlatched by construction) |
| recycle snap | `neuralFieldCompute.ts:3055-3063`; `WRAP_SNAP_DIST 0.038` (`:1652`), `EDGE_MIN_LOCAL 0.055` (`:343`) | Raw local distances change (x now spans 3.791 not 0.909), so "the snap threshold sits below the shortest edge" (`:335-343`) must be re-derived. Stars still get `1e9` — nothing teleports. | re-derive both against the ribbon metric |
| SVG fallback | `neural-graph-fallback.tsx:107` `getPlexus(variant, "svg")`; mapping `X0 500 / XS 900 / Y0 200 / YS 340` into a 1000×400 viewBox (`:69-78`) | Would map a ±1.896 × ±3.365 field entirely outside the viewBox. | **must keep the ellipsoid.** The ribbon shape has to be an OPT-IN argument to `getPlexus` / `createNeuralFieldBuild` (`:731-742`, `:953`); the fallback passes nothing. Safe by gating too: `armed = !showFallback` (`problem-section.tsx:431`, `use-neural-lattice-fallback.ts:41-45`) means SVG and traverse are exact complements — they never coexist |
| lite / phone tier | `NeuralLattice.tsx:310-314`; `NEURAL_PARTICLE_COUNT_COMPACT 3200` (`:202`) | `L = 12.79` at 390×844 ⇒ 716 nodes / 1578 edges / ~40 900 particles at parity. **Not shippable without §4.** | index-packed edges (mandatory, 1578 > 1024) + the chunk cull, which brings it back to ~3 200 shaded |
| `#production` | `NeuralLattice.tsx:1322-1325` ("every non-traversed band take the `extras.length === 0` path and are byte-for-byte the shipped single island"), the literal `const traversed = anchorId === "problem";` at **`:1333-1334`**, mount at `Scene.tsx:508-511` | `#production` shares `NeuralLattice`, `createNeuralFieldBuild`, `getPlexus`, `nodeAt()` and every config constant with `#problem`. | the ribbon must be a per-build ARGUMENT defaulting to today's ellipsoid, and `uFieldLen = 0.909·(1/…)`-equivalent / `uFieldSlope = 0` must be the identity for it. `zWorld`'s two-branch shape (`:727-729`) is the model to copy; better still, gate on `bandId in traverseConfig.bands` rather than on the string literal |
| the coverage instrument | `use-diagonal-traverse.ts:717-826` | Becomes vacuously 100 %: one ribbon always intersects the frame. It measures presence, and the handoff §4b already says presence is not composition. | replace with a vertical-distribution instrument (handoff §4b) |
| the frozen-clock instrument | `NeuralLattice.tsx:600-603`, `:1193-1240`, `use-diagonal-traverse.ts:474-486` | Unaffected (per-band, not per-island). | keep verbatim — it is the zero-skew proof |

---

## 6. WHAT THE TOP AND BOTTOM EDGES ACTUALLY LOOK LIKE

The generator, verbatim (`neuralLatticeConfig.ts:463-471`):

```
const rr   = Math.pow(ph(i + ms, 91.318, 27.719), 1 / PLEXUS_RADIAL_POW);   // POW = 2.2  (:274)
const warp = 1 + PLEXUS_WARP * Math.sin(dx*3.1 + ms) * Math.cos(dy*2.7 - ms); // 0.22
const r    = Math.min(1, Math.max(0.05, rr * warp));
const y    = dy * r * PLEXUS_RY;                                             // RY = 0.42 (:270)
```

So there is a **hard outer bound** at `|y| ≤ PLEXUS_RY = 0.42` (the `min(1, …)` clamp) but the DENSITY approaching it is a taper: `POW 2.2 < 3` is sub-volume-uniform, ρ(r) ∝ r^−0.8, "below that the cloud gains a denser core" (`:272-274`). Measured y extent (trilemma §3.1, re-run generator): **`[−0.3363, +0.4175]`, span 0.7538** of the band.

With `rect.h = ih` the owner therefore sees, at both frame edges: the net **thinning out and stopping ~0.08 of a frame height short of the edge — ≈75 px top and ≈75 px bottom at ih 935** — a soft, warped, organic boundary, not a cut. Individual stars near the edge are complete (their baked offsets are small); links terminate on stars, so no link is severed.

Two second-order facts that make those edges the ribbon's most visible part:
- `copyYAt` relaxes to 1 at `|y| ≥ COPY_Y_OUT = 0.46` (`:2027`), so the ceiling-drop that dims the middle 36 % of the frame by 40 % (`COPY_Y_FLOOR = 0.6`, `:2016`) does not apply at the edges — the rim is **brighter** than the reading zone.
- The dot-grid behind it (`problem-section.tsx:556`) is masked by `radial-gradient(ellipse 80% 70% at 50% 50%, #000 55%, transparent 95%)`, i.e. it also dies before the band bound — the two tapers agree.

If instead the across-ribbon coordinate is made uniform to actually reach the frame edge, you get a straight horizontal razor line with stars clipped mid-star. Recommendation: keep the radial taper, raise the across-ribbon half-extent `PLEXUS_RY 0.42 → ~0.50` so the tail reaches the frame edge and the empty strips close.

---

## 7. HOW MUCH IS ON FRAME AT 45° OVER 5358 px

| | 1920×935 | 390×844 (phone, D12) |
|---|---|---|
| `secH` | 5358 px (5.730 vh) | 4600 px (5.45 vh) |
| lateral run at R = 1 | 5358 px = **2.791 vw** | 4600 px = 11.79 vw |
| field extent `L = Λ+1` | **3.791 band-widths** (7278 px) | 12.79 (4988 px) |
| **fraction of the field on frame** | **1/3.791 = 26.4 %** | **1/12.79 = 7.8 %** |
| ribbon area | 6.805 Mpx² (3.791 frames) | 4.21 Mpx² (12.79 frames) |
| nodes on frame @ parity density | **103** (of 391) | 56 (of 716) |
| links on frame @ parity density | **227** (of 861) | 123 (of 1578) |
| nodes on frame @ today's areal density | **190** (of 717) | — |
| links on frame @ today's areal density | **419** (of 1580) | — |
| particles allocated / shaded, parity, no cull | 34 200 / **34 200** | 40 900 / **40 900** |
| particles shaded, with the §4 chunk cull | ~9 000 | ~3 200 |

Two consequences worth stating plainly:

- **On-frame parity with today is a DENSITY choice, not a size choice.** Today's ellipse covers only 54.5 % of the frame (`0.96 × 0.84 × π/4 × 0.8597`), so a frame-filling ribbon at today's areal density shows **1.83× more net at once** than the owner has approved. 391 nodes / 861 links is the parity number; 717 / 1580 is the "same texture, more of it" number. That is an owner-visible call and it should be put to him as one.
- **Without the intra-field cull the WebGL2 analytic tier pays 34 200 (desktop) / 40 900 (phone) vertex-stage `anchorNode()` evaluations per frame** for 26.4 % / 7.8 % of pixels — the exact cost shape the trilemma priced for the "enlarge the cloud" option it rejected. The chunked cull is what makes the ribbon cheaper than the five islands it replaces, not more expensive.