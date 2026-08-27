# local-kernel — Founders portrait morph: kernel physics, ink→size, colour, depth, and the WebGPU binding budget

Scope: the SHIPPING founders particle-portrait path in `C:/Users/alber/Desktop/Sersan` (three **0.184.0**, verified from `node_modules/three/package.json`). Everything below is read from source; line numbers are from the files as of commit `53575a8` (git log on the three files).

Files read in full:
- `src/webgl/gpgpu/gpgpuNodeSim.ts` (2261 lines) — `unifiedForceStep` (L288), `createTextMorphComputeBuild` (L1151), `PortraitMorphOpts` (L1099), kernel `simulate` (L1352), render vertex `Fn` (L1702), fragment `shade` (L1875)
- `src/webgl/gpgpu/gpgpuRenderShader.ts` (216 lines) — GLSL static fallback only; **not used by the portrait** (WebGL2 sessions get the DOM section, no cloud)
- `src/webgl/gpgpu/gpgpuConfig.ts` (291 lines) — hero/spore constants; **the portrait does not read `DEFAULT_GPGPU_CONFIG`** — it passes its own `TextMorphParams` inline (see §1.0)
- `src/webgl/FounderPortraitMorph.tsx` (1277 lines) — consumer: sampler spec, world fit, build params, frame loop
- `src/webgl/image/sampleImagePoints.ts` (469 lines) — sampler: flood fill, ink curve, z-relief
- `HANDOFF_FOUNDER_MORPH.md` (294 lines) — the owner's contracts 1–12 + the 4th-target addendum
- `node_modules/three/src/renderers/webgpu/{WebGPUBackend.js, utils/WebGPUAttributeUtils.js, nodes/WGSLNodeBuilder.js}`, `src/nodes/accessors/{Arrays.js, StorageBufferNode.js}`, `src/nodes/core/StructNode.js`, `src/nodes/math/Hash.js`
- W3C WebGPU spec limits table: https://www.w3.org/TR/webgpu/#limits

---

## 0. TL;DR for the synthesis agent

1. **The render is a halftone by construction.** Tone is carried by disc DIAMETER on a regular 290×405 grid with ±0.45-cell jitter (`JITTER 0.9`), normal blending, depth test OFF, no lighting term anywhere, and z-relief capped to 4 % of face height (`Z_RELIEF_MAX_FRAC = 0.04`). That is the definition of an AM halftone screen. Nothing in the fragment shader knows about a surface.
2. **The empty patches are an INK-MODEL defect, not a mask defect.** The flood fill (contract 2 in the HANDOFF) correctly stops deleting the scalp — but `ink` is still *chromatic distance from the wall colour* (`sampleImagePoints.ts` L≈320-345). A lit scalp/forehead/cheek that is within `inkFloor/inkGain = 0.03/1.7 ≈ 0.018` luma-distance of the wall gets **ink exactly 0 → disc collapses to 0.06× → alpha knee 0 → `Discard`**. Within ~0.05 of the wall it gets a ~1 devpx sub-pixel dot that the cov² term then dims by ~50 %. So the brightest skin is rendered as the *smallest/faintest* particles — the exact inverse of a lit point cloud on a dark stage. Worked numbers in §2.4.
3. **Depth per target already exists in the data path** (`homeX.z`), it is just neutered: sampler z = `(lum−0.5)·90 + 0` grid-px, then clamped so max|z| ≤ 0.04·faceHeight, and `depthTest:false`. Turning depth on with the current one-disc-per-cell lattice produced "comb tearing" (documented at `FounderPortraitMorph.tsx` L≈211-222) because luminance is not depth.
4. **Binding budget — what is actually free (measured against the source, not the HANDOFF's summary):**
   - Compute: **8/8 storage** (position, velocity, homeA–D, start, delay). BUT six of those eight are `"vec3"` buffers that three pads to 16 B/instance (`WebGPUAttributeUtils.js` L105-116), so **each already carries an unused `.w` float** — 6 free floats/particle at zero binding and zero memory cost. `delay` is an unpadded `"float"`.
   - Vertex stage: **4/8 vertex buffers** (quad `position`, `positionBuffer`, `velocityBuffer`, `delayBuffer` via `.toAttribute()`), **4/8 storage** (`tintA..D` via `.element()`). **4 vertex-buffer slots and 4 vertex-stage storage bindings are free.**
   - Fragment: 0 storage (must stay 0 — `instanceIndex` degrades to a varying there), 0 textures.
   - Textures: **0/16 sampled textures in every stage**, including compute — an entirely untouched budget.
   - Uniforms: one packed uniform buffer per stage; limit is 12 — roomy.
5. **Adding per-target z + normal/lighting WITHOUT touching the budget** is straightforward (§6): (a) declare the six `"vec3"` buffers as `"vec4"` (same bytes, same bindings) and use `.w` — e.g. per-target packed octahedral normal in `homeX.w`, compute writes the blended lighting/normal into `position.w`, render reads it through the `positionBuffer.toAttribute()` it already binds; (b) or pack `ink` + oct-normal into `tint.w`; (c) or spend the 4 free vertex-stage storage bindings on one `normalX` vec4 per target (normals do not need to pass through compute — blend them in the vertex stage with the same `portraitMorphExpr` chain as colour); (d) or move per-target depth/normal to **textures** read with `textureLoad` in compute and/or vertex (0/16 used), which also frees the way to a 5th person. A struct storage buffer (`instancedArray(count, struct({...}))`, r184 `Arrays.js` L47-66) could collapse homeA–D into ONE compute binding (8→5) but no shipped example uses it with a storage buffer — spike before relying on it.

---

## 1. The compute kernel — exact per-frame physics

### 1.0 Parameters the portrait actually runs with

From `FounderPortraitMorph.tsx` L≈744-760 (the `createTextMorphComputeBuild` call):

```ts
{ SPRING: 52, DAMPING: 7.5, MAX_SPEED: 16, TURB: 9,
  POINT_SIZE: pointSize /* derived, §2.2 */, POINT_ALPHA: 1.0,
  EMISSIVE: 1, COL_COLD: [1,1,1], COL_HOT: [0.4,1,1] /* unused on the portrait */ }
```

World units: the camera sits at `CAMERA_Z = 12` (`src/webgl/constants.ts` L5), `WORLD_VIEW_HEIGHT = 2·tan(FOV/2)·12`. The portrait is placed by a group at distance `12 − dolly`, `dolly = env·2.2`. Damping ratio of the spring: ζ = DAMPING/(2·√SPRING) = 7.5/(2·7.21) ≈ **0.52** (under-damped; settles in ~3/7.5 ≈ 0.4 s). Frame `dt` is clamped to ≤ 1/30 s in the frame loop.

Uniforms written per frame (`FounderPortraitMorph.tsx` useFrame): `uMorph = clamp(p,0,1)`, `uMorph2 = clamp(p−1,0,1)`, `uMorph3 = clamp(p−2,0,1)` with ONE progress scalar `p ∈ [0, MORPH_MAX=3]` advancing at `dt/1.4 s` per leg (`MORPH_DURATION 1.4`); `uSpread = sin(legFract(p)·π)·1.1`; `uAssemble` 0→1 over `ENTRY_DURATION 1.8 s`; `uFade` damped edge ramp; `uSizeComp*` pinned to 1.

### 1.1 Storage buffers bound by the kernel (8 of 8)

`gpgpuNodeSim.ts` L1208-1216, L1293-1311:

| # | buffer | declared type | bytes/instance on WebGPU | read/write in compute |
|---|---|---|---|---|
| 1 | `positionBuffer` | `"vec3"` (seeded from scatter cloud) | 16 (padded) | RW |
| 2 | `velocityBuffer` | `"vec3"` zero | 16 (padded) | RW |
| 3 | `homeABuffer` | `"vec3"` | 16 | R |
| 4 | `homeBBuffer` | `"vec3"` | 16 | R |
| 5 | `homeCBuffer` | `"vec3"` | 16 | R |
| 6 | `homeDBuffer` | `"vec3"` | 16 | R |
| 7 | `startBuffer` | `"vec3"` (scatter seed) | 16 | R |
| 8 | `delayBuffer` | `"float"` (normalised homeA.x, L1297-1310) | 4 | R |

The `tintA..D` buffers (`"vec4"`, L1269-1281) are allocated in the same function but **never referenced by `simulate`**, so they do not count against the compute pipeline's bind group — bindings are per-pipeline, only referenced storage nodes get bound.

Padding proof: `WebGPUAttributeUtils.js` L105-116 — for any `isStorageBufferAttribute || isStorageInstancedBufferAttribute` with `itemSize === 3` three allocates `count*4`, copies xyz into stride 4, sets `bufferAttribute.itemSize = 4` and `_force3to4BytesAlignment = true`. So every `"vec3"` storage buffer is physically a vec4 array with `.w = 0`.

### 1.2 The analytic anchor (a pure function of uniforms + hash)

Kernel `simulate`, L1352-1443. Per particle `i`:

```
r    = hash(i)                                    // PCG hash, Hash.js L11-21: state = i·747796405 + 2891336453; word = ((state >> ((state>>28)+4)) ^ state)·277803737; result = (word>>22) ^ word; /2^32
m1   = clamp((uMorph  − 0.55·r) / 0.45, 0, 1)    // per-particle stagger window: starts at 0.55r, lasts 0.45
m2   = clamp((uMorph2 − 0.55·r) / 0.45, 0, 1)
m3   = clamp((uMorph3 − 0.55·r) / 0.45, 0, 1)
T    = mix(hA, hB, smoothstep(0,1,m1))
T    = mix(T,  hC, smoothstep(0,1,m2))
T    = mix(T,  hD, smoothstep(0,1,m3))            // CHAINED — sequencing invariant: uMorph must hit 1.0 before uMorph2 leaves 0
jdir = vec3(hash(i+7919)·2−1, hash(i+104729)·2−1, (hash(i+1299709)·2−1)·0.5)
T   += jdir · uSpread                              // diffuse cloud mid-leg (uSpread = sin(legFract·π)·1.1 world units)
aw   = clamp((uAssemble·1.45 − delay) / 0.45, 0, 1) // ASSEMBLE_WINDOW = 0.45 (L1350)
T    = mix(start, T, smoothstep(0,1,aw))           // entry: fly in from the scatter seed, left→right by delay = normalised homeA.x
```

Note the stagger saturates exactly: at `uMorph = 1` the worst particle (r=1) has `(1−0.55)/0.45 = 1`, so `T == hB` for every particle — that is what makes the chained legs sound (HANDOFF contract 10).

### 1.3 Transit turbulence

L1405-1420:

```
transit = max( 4·m1(1−m1), 4·m2(1−m2), 4·m3(1−m3), 4·aw(1−aw) )   // 1 mid-leg, 0 at rest
turb    = vec3( sin(7·pos.y + 2.1·t + 6.28·r),
                sin(8·pos.x + 1.7·t + 4.1·r),
                0.4·sin(5·pos.x + 5·pos.y + 1.3·t) )
acc    += turb · TURB(9) · transit
```

Zero at every locked stage by construction (transit = 0).

### 1.4 Integration — `unifiedForceStep` (L288-330), no attractor on the portrait path

```
toAnchor = T − pos
acc      = SPRING(52) · toAnchor  + turb·9·transit
vel     += acc · dt
vel     *= exp(−DAMPING(7.5) · dt)
sp       = |vel|
vel      = vel · min(sp, MAX_SPEED=16) / max(sp, 1e-4)      // speed clamp
pos     += vel · dt                                          // L1443
```

Semi-implicit Euler with exponential damping. `pos` is written back as vec3 into the padded vec4 slot (the `.w` stays 0 forever — see §6).

Hero/spore-only extras that the portrait never uses: cursor push² repulsion + orbit (`attractor` opts), the black-hole `uHole*` family (portrait callers leave `uHoleStrength = 0`, so the vertex-stage displacement in L1722-1730 resolves to 0).

### 1.5 What the kernel does NOT do

- No per-particle depth beyond `home.z` (see §4).
- No normals, no lighting, no curl noise, no neighbour reads, no life/age state on this path (the spore build has a life machine; the text-morph build does not).
- No camera-facing or view-dependent term.

---

## 2. Render — how ink maps to disc size and alpha

### 2.1 Vertex stage (L1702-1800)

```
p        = positionBuffer.toAttribute().xyz             // 4-comp read, .xyz mandatory
mv       = modelViewMatrix · vec4(p,1);  dist = −mv.z;  clip = P · mv
inkNow   = portraitInkExpr                              // §2.3
rand     = hash(instanceIndex)
sizeDev  = uPointSize · uPixelRatio · (0.06 + 0.94·inkNow) · (0.85 + 0.3·rand) · sizeFD(=1) / max(dist, 0.001)
clip.xy += corner.xy · sizeDev / uViewport · 2 · clip.w  // device-pixel billboard, same idiom as the hero
```

`PORTRAIT_SIZE_MIN = 0.06`, `PORTRAIT_SIZE_INK = 0.94` (L1575-1578). Rand spread deliberately narrowed to 0.85–1.15 (hero uses 0.7–1.4).

### 2.2 Where `uPointSize` comes from (`FounderPortraitMorph.tsx` L≈715-725)

```
dpr        = min(devicePixelRatio, 2)
areaDev    = stageW·dpr · stageH·dpr · 0.92²                  // STAGE_FILL 0.92
spacingDev = sqrt(areaDev / count)                            // lattice pitch in device px
discDev    = spacingDev · 2.1                                 // full-ink disc diameter target
pointSize  = clamp(discDev · CAMERA_Z(12) / (dpr · 1.05), 10, 96)
```

So at rest (dist = 12, ink = 1, rand = 0.5): `sizeDev = pointSize·dpr·1.0·1.0/12 = discDev/1.05 ≈ 2·spacingDev` — full-ink discs overlap ~2× the pitch (source comment: "~8.4 devpx ≈ 2× spacing"). Worked example, 480×640 CSS stage at dpr 2, count 51,751: `areaDev = 1,040,056`, `spacingDev = 4.48`, `discDev = 9.41`, `pointSize = 53.8`.

### 2.3 The ink chain (L1561-1570)

```
ink = mix(tintA.w, tintB.w, portraitMorphExpr)
ink = mix(ink, tintC.w, portraitMorph2Expr)      // if hasPortraitSizeC
ink = mix(ink, tintD.w, portraitMorph3Expr)      // if hasPortraitSizeD
portraitMorphNExpr = smoothstep(0,1, clamp((uMorphN − 0.55·hash(i))/0.45, 0, 1))   // byte-mirror of the kernel's mN
```

The same expression node feeds the vertex size, `portraitSizePxExpr` (L1624) and the `vInkF` varying (three materialises it once).

### 2.4 Fragment stage (L1875-1955) — alpha

```
rr    = |quadUv|
a     = smoothstep(0.5, 0.34, rr)                              // portrait: crisp edge (hero: 0.5→0.12 feather)
alpha = a · POINT_ALPHA(1) · uFade · vAssembleF
alpha *= smoothstep(0.0, 0.1, ink)                             // TONAL KNEE (L1925) — narrow, unsquared
cov   = clamp( (sizePx / dist) / uPortraitCovPx , 0, 1 )        // sizePx = pointSize·dpr·(0.06+0.94·ink)·(0.85+0.3·rand); dist = view-space z as a varying
alpha *= cov²                                                   // SUB-PIXEL COVERAGE COMPENSATION (L1938)
Discard(alpha < 0.02)                                           // L1953 (hero: 0.004)
```

`uPortraitCovPx = PORTRAIT_COV_MIN_PX = max(1.25, 0.35·spacingDev)` (L1601). With spacing 4.48 devpx → 1.57 devpx: any disc narrower than 1.57 devpx is dimmed quadratically. The renderer runs `antialias:false` (`createRenderer.ts` L109), which is why this compensation exists.

**Ink → screen, worked with the numbers above (pitch 4.48 devpx):**

| source pixel vs. white wall (0.92,0.91,0.90) | dist (luma-weighted) | v = (1.7·dist − 0.03)/0.97 | ink = v^0.62 | disc ⌀ / pitch = 2.1·(0.06+0.94·ink) | devpx | cov | knee | net |
|---|---|---|---|---|---|---|---|---|
| dark hair (0.15,0.12,0.10) | 0.79 | 1 (clamped) | 1.00 | 2.10 | 9.4 | 1 | 1 | full disc, 2× overlap |
| mid skin (0.80,0.62,0.52) | 0.27 | 0.44 | 0.60 | 1.31 | 5.9 | 1 | 1 | full |
| lit forehead (0.90,0.80,0.72) | 0.104 | 0.151 | 0.31 | 0.74 | 3.3 | 1 | 1 | 43 % area coverage → visible gaps |
| specular scalp (0.95,0.93,0.92) | 0.023 | 0.0095 | 0.056 | 0.24 | 1.06 | 0.68 → cov² 0.46 | 0.63 | alpha 0.29, one faint pixel |
| highlight ≤ wall+0.018 | < 0.0176 | 0 | **0** | 0.126 | 0.56 | 0.36 → 0.13 | **0** | **Discarded → hole** |

This is the exact mechanism behind the owner's screenshot: bright skin that shares the wall's colour is *inside the subject mask* (the flood fill did its job) but the ink curve still measures "how far from the wall" and sends it to zero. The HANDOFF's contract 2 fixed the **mask**; the **ink** metric was never changed to a within-mask tonal model. The inversion "ink = distance from a light backdrop" (header comment in `sampleImagePoints.ts`) means, on the dark site stage, *bright = small*, which is backwards for a lit point cloud.

### 2.5 Blending / depth state (L1962-1970)

Portrait: `NormalBlending`, `depthTest:false`, `depthWrite:false`, `transparent:true`, `toneMapped:false`, `DoubleSide`. Hero: additive, depth off. The portrait therefore has **painter's-order overlap only** (instance order = cell scan order, top-left to bottom-right), no occlusion, no z-sorting.

---

## 3. Colour path

### 3.1 Sampler (`sampleImagePoints.ts` `emit`, L≈360-380)

`rgb[j] = srgbToLinear(pixel)` per channel (exact three transfer: `c<0.04045 ? c·0.0773993808 : ((c·0.9478672986+0.0521327014)^2.4)`). No tone mapping downstream (`toneMapped:false`), so linear values reach the HDR framebuffer as-is and only >1.0 values feed the selective bloom.

### 3.2 Packing (`packTint`, L1258-1267)

Per target one `"vec4"` storage buffer: `[r, g, b, ink]` — 16 B/instance, unpadded (only itemSize 3 gets rewritten). Read as `tintX.element(instanceIndex)` → true vec4: `.xyz` colour, `.w` ink.

### 3.3 Vertex-stage blend → one varying (`portraitColorExpr`, L1854-1872)

```
base = mix(tintA.xyz, tintB.xyz, m1e); base = mix(base, tintC.xyz, m2e); base = mix(base, tintD.xyz, m3e)
base = mix(base, uTravelTint(0.16, 2.4, 3.0), clamp(|vel|·0.16, 0, 1))   // PORTRAIT_TRAVEL_K 0.16 (L1821): HDR cyan mid-flight
col  = base · uPortraitEmissive (DEFAULT_EMISSIVE 1.18)
```

`vPortraitColorF = varying(portraitColorExpr)`; the fragment just emits `vec4(col, alpha)`. No lighting, no rim, no per-fragment shading. With `MAX_SPEED 16` and K 0.16 the travel tint saturates at |v| ≥ 6.25 u/s — so mid-morph the whole swarm is HDR cyan, at rest it is exactly the photo colour × 1.18.

VaryingNode discipline (L1440-1470 and HANDOFF contract 3): every varying is built from a self-contained expression; three writes varyings at the top of vertex `main()` before the `vertexNode` Fn body runs.

---

## 4. Depth / z usage — and why the cloud is flat

### 4.1 Where z comes from

`sampleImagePoints.ts` `emit`:
```
nx = (gx/gridW − 0.5)·(gridW/gridH); ny = gy/gridH − FACE_CY(0.44)
rad = sqrt(nx²+ny²) / BULGE_RADIUS(0.75)
z[j] = (lum − 0.5)·depth(90 grid-px) + max(0, 1−rad)·centerZBias(0)
```
→ z is **luminance relief** (bright = toward camera), ±45 grid-px, bulge disabled.

### 4.2 Where it gets crushed (`FounderPortraitMorph.tsx` L≈640-660)

```
maxAbsZ = max over all targets |z|
zNorm   = min(1, (Z_RELIEF_MAX_FRAC(0.04) · 2·halfY) / maxAbsZ)
zFactor = worldPerGrid · zNorm · depthScale(1)
home.z  = z · zFactor
```
With halfY ≈ 135 grid-px and maxAbsZ ≈ 45: zNorm = 0.04·270/45 = **0.24** → total relief ≈ ±10.8 grid-px ≈ ±4 % of face height. The author's live test (`setDepth()`): 0 clean, 0.3 visible tearing, 1 severe comb. Root cause stated in the source: on a regular one-per-cell grid, adjacent cells across a luminance edge get very different z and separate laterally under perspective. The deeper reason is that **luminance ≠ depth** (a dark beard next to lit skin is at the same depth); a real depth source would not comb.

### 4.3 What z does in the render today

Only `dist = −mv.z` (perspective size) and nothing else: no depth test, no depth write, no z-based shading, no sort. The group orbit (`ORBIT_MAX 0.7 rad`, `PARALLAX_MAX 0.18`) and dolly (`2.2` units) act on the whole group only mid-leg (`env = sin(legFract·π)`), and rest-idle sway is 0.02/0.012 rad. So at every locked stage the visitor sees a flat, un-lit, un-occluded halftone.

### 4.4 Lighting

None on the portrait path. For comparison the SPORE build (same file, L834-913) has the full recipe already written in TSL: view-space `N = normalView`, fixed key `L = normalize(0.35,0.55,0.78)`, `lambert = max(N·L,0)`, `ambient = 0.32 + 0.14·N.y`, `ao = mix(0.55,1,rand)`, `rim = (1−max(N.z,0))²·RIM·(0.25+0.75·t)`, emission `mix(albedo, cyan, t)·t²·EMISSIVE`. That shading needs a normal per fragment, which the icospheres get for free from geometry; a billboard needs it from data (§6) or from a sphere-impostor normal `n = (uv.x, uv.y, sqrt(1−r²))` (§6.4).

---

## 5. The WebGPU binding budget — measured, with the spec numbers

Spec defaults (W3C WebGPU §Limits, fetched 2026-08-27):

| limit | default | note |
|---|---|---|
| maxVertexBuffers | **8** | every `.toAttribute()` storage read + every geometry attribute costs one |
| maxVertexAttributes | 32 | |
| maxStorageBuffersPerShaderStage | **8** | compute wall |
| maxStorageBuffersInVertexStage | **8** (compat mode: **0**) | `.element()` reads in the vertex stage |
| maxStorageBuffersInFragmentStage | 8 (compat: 4) | |
| maxSampledTexturesPerShaderStage | **16** | untouched by this material |
| maxStorageTexturesPerShaderStage | 4 | |
| maxUniformBuffersPerShaderStage | 12 | three packs uniforms → 1–2 used |
| maxUniformBufferBindingSize | 65,536 B | too small for per-particle arrays (51,751×16 B = 828 KB) |
| maxBindGroups | 4 | |

Requesting more: three r184 passes `parameters.requiredLimits` straight into `adapter.requestDevice` (`WebGPUBackend.js` L71, L218-224) — `new WebGPURenderer({ requiredLimits: { maxStorageBuffersPerShaderStage: 10 } })`. This is NOT currently done (`createRenderer.ts` passes `antialias:false, powerPreference, forceWebGL` only). Adapters commonly expose 10–16, but Chrome on Android/compat mode reports the 8 default and **compat mode reports 0 vertex-stage storage buffers**, which would kill the `tintX.element()` path outright; three sets `this.compatibilityMode = !device.features.has('core-features-and-limits')` (L228). Raising limits is a per-device gamble; packing is deterministic.

Why `.element()` works in the vertex stage on WebGPU: `WGSLNodeBuilder.getNodeAccess` L1037-1052 forces `READ_ONLY` outside compute → `var<storage, read>`; on the WebGL2 backend storage element indexing no-ops (three #31221) — irrelevant here because the portrait island returns `null` unless `backendOf(gl) === "webgpu"`.

### 5.1 Today's usage (portrait, 4 targets) — verified against the node graph

| stage | budget | used | by | free |
|---|---|---|---|---|
| compute | storage 8 | **8** | position, velocity, homeA, homeB, homeC, homeD, start, delay | **0** bindings — but 6 padded `.w` floats/particle |
| compute | sampled textures 16 | 0 | — | 16 |
| vertex | vertex buffers 8 | **4** | quad `position`, `positionBuffer`, `velocityBuffer` (heroSpeedExpr L1479), `delayBuffer` (heroAssembleExpr L1487) | **4** |
| vertex | storage 8 | **4** | tintA, tintB, tintC, tintD (`.element`) | **4** |
| vertex | sampled textures 16 | 0 | — | 16 |
| fragment | storage 8 | 0 | (keep 0) | — |
| any | uniforms 12 | ~1 | packed | ~11 |

Free per-particle floats hiding in existing bindings: `position.w`, `velocity.w`, `homeA.w`, `homeB.w`, `homeC.w`, `homeD.w`, `start.w` — 7 × 4 B already allocated on the GPU and never read.

Memory today at 51,751 instances: 8 compute buffers ≈ 7×16 + 4 = 116 B + 4 tints × 16 = 64 B → **180 B/particle ≈ 9.3 MB**. Adding four `"vec4"` normal buffers would add 3.3 MB; using the free `.w`s adds 0.

---

## 6. What must change to add per-target depth + a normal/lighting term within the budget

Constraint recap: compute may not gain a storage binding; vertex may gain ≤4 vertex buffers and ≤4 storage bindings; fragment must not read storage; the hero graph must stay byte-identical (all portrait changes behind the existing build-time booleans).

### 6.1 Per-target depth — zero binding cost, data change only

`home.z` already carries a per-target z through the whole chain (kernel blends it in `T`, position.z lands in the vertex stage). What is missing is a **real** depth source and the courage to un-cap it:

1. Replace `z = (lum−0.5)·90` with a per-portrait **depth map** (monocular depth estimation offline — e.g. Depth Anything / MiDaS — or a photogrammetry/3D-scan render of the head), sampled on the same 290×405 grid in `readGrid`, normalised to metres-ish and stored in `PortraitPoints.z`. Keep `centerZBias` for a bust-like fall-off if the map is too flat at the edges.
2. Remove/raise `Z_RELIEF_MAX_FRAC` (0.04 → ~0.35 of face height for a real head; a head is roughly as deep as it is wide).
3. The comb artefact goes away only if depth is *smooth across luminance edges* — which a depth map is and luminance is not. Expect a residual "stretch" on silhouette edges (background cells at far depth next to face cells at near depth); handle by giving background-of-subject cells the nearest subject depth (dilate the subject depth into the ink-0 fringe) and/or by letting the fringe collapse as it does today.
4. Turn on `depthTest:true, depthWrite:true` for the portrait (`PortraitMorphOpts.depthTest/depthWrite` already exist, L1129-1132) — required for occlusion once the head has real thickness, and for the "back of the head visible through the cheek" effect to disappear. With an opaque-ish disc (alpha knee → 1 inside the face) and normal blending, depth-write is fine; for the faint fringe keep alpha < 1 and accept minor sorting artefacts, or sort instances back-to-front by `homeA.z` on the CPU once per target (index order is free to choose in `samplePortraitSet` because index-pairing is what matters, not order).

Cost: 0 bindings. Note the touch/lite island also gets it automatically.

### 6.2 Per-target normal — four options ranked by cost

**Option A — pack the normal into the free `.w` of each home buffer (0 bindings, 0 bytes).**
- Change `instancedArray(homeX, "vec3")` → build a `count×4` array `[x, y, z, packedN]` and declare `"vec4"`. Same 16 B stride the padding already gives. `.element(i)` now yields a true vec4 → the kernel must use `hA.xyz` etc. (swizzle discipline, HANDOFF contract 8).
- Encoding: octahedral normal, 2×11 bits (22 bits) → an exact integer in a float32's 24-bit significand: `packed = float(ox·2047)·2048 + float(oy·2047)`. Decode in TSL with `floor`/`mod` (or `bitcast` to uint and shift — TSL has `.toUint()`, `.shiftRight`, `.bitAnd`). 11-bit oct gives ~0.2° precision — plenty for lambert/rim.
- Where to blend: normals cannot be `mix`ed while packed. Either (i) blend in the **vertex stage** — `tintX`/`homeX` reads are both available there; read `homeX.element(i).w` for each target… but that would add the four home buffers as vertex-stage storage bindings (4 → 8/8, still legal but exhausts the budget); or (ii) blend in **compute** — decode `nA..nD`, `n = normalize(mix-chain with the same m1/m2/m3)`, compute lighting terms there and write them into **`position.w`** (declare `positionBuffer` as `"vec4"`, `pos.xyz` for the physics; `pos.w` = packed lit/rim scalars or the re-packed blended normal). The render already binds `positionBuffer.toAttribute()` (4-component!) → read `.w` for free. This is the cleanest: 0 new bindings in any stage, the blended normal follows the exact kernel stagger, and the vertex stage stays at 4/8 + 4/8.
- Lighting can then be done in the vertex stage (per instance, exact for a billboard: all four corners share it) and shipped as part of `vPortraitColorF`, or the blended normal can be passed as a varying and combined per-fragment with the sphere-impostor normal (§6.4) for a real shaded ball.

**Option B — pack ink + oct-normal into `tint.w` (0 bindings).**
`tint.w = ink(8 bit) | ox(8) | oy(8)` = 24 bits exact in float32. Decode in the vertex stage where tints are already read; blend decoded normals with `portraitMorphExpr` chains exactly like colour. Zero change to the kernel. Cost: ink drops to 8-bit precision (irrelevant — it goes through `smoothstep(0,0.1)` and a size multiply) and a few ALU ops per vertex. This is the least invasive path if lighting is resolved per-instance in the vertex stage.

**Option C — one extra `"vec4"` storage buffer per target, `normalX = [nx, ny, nz, spare]`, read with `.element()` in the vertex stage (4 → 8/8 vertex-stage storage, 0 compute, 0 vertex buffers).** Legal today on core WebGPU; simplest code; costs 3.3 MB and leaves no vertex-storage headroom (and dies in compat mode along with the tints anyway). The spare `.w` could carry per-target depth-confidence or a thickness for a subsurface/backlight term.

**Option D — textures (0 storage bindings anywhere, 0/16 used).**
Store per target an RGBA32F (or RGBA16F) texture on the 290×405 grid: `(depth, nx, ny, nz)` or `(r,g,b,depth)` + `(nx,ny,nz,ink)`. Read with `textureLoad(tex, ivec2(cell))` (`TextureNode.js` L949: `textureLoad = texture(...).setSampler(false)`) in compute and/or vertex. The per-particle cell coordinate is needed: derive from `homeA.xy` (un-jitter: cell = round(homeA.xy/worldPerGrid + centre − 0.5)) or, better, store the cell index in the free `start.w`. This is the only option that also opens the door to a **5th person** (per-target data no longer costs a storage binding at all; even the homes could become textures, dropping compute to position+velocity+start+delay = 4/8). Caveat: three's `textureLoad` in the vertex stage on WebGPU is supported (non-filtering sampler-less `textureLoad` in WGSL), but it is a new pattern in this codebase — spike it.

**Option E — struct storage buffer (r184 native).** `instancedArray(count, struct({ a: 'vec4', b: 'vec4', c: 'vec4', d: 'vec4' }))` puts all four homes in ONE binding (`Arrays.js` L47-66 accept a Struct; `StorageBufferNode` L54-98 keeps `structTypeNode`; member access via `.element(i).get('a')` per `StructNode.js` L17). Compute would drop from 8/8 to 5/8. No shipped r184 example uses a struct with `instancedArray` (grep of `examples/` found only the transpiler), so treat as unverified until a spike compiles under WGSL.

### 6.3 Which combination I would recommend to the synthesis agent

1. **Depth:** real per-target depth maps → `home.z` (§6.1), uncapped, `depthTest/depthWrite` on. 0 bindings.
2. **Normals:** Option B (ink+oct-normal in `tint.w`) for a first result in a day, **or** Option A(ii) if the lighting should follow the kernel's physical motion (e.g. rim light that responds to velocity/orientation). Both are 0 bindings.
3. **Shading:** per-fragment sphere-impostor normal `n_s = (uv.x, uv.y, sqrt(1−rr²))/0.5` blended with the data normal (`n = normalize(mix(n_data, n_s, 0.35))`), lambert + `rim = (1 − max(n.z,0))²`, view-space key light as in the spore build (L836-846), rim colour = brand cyan, `emissive` floor so the face stays readable on the dark stage. This is exactly the "lit point-cloud with rim glow" read of the Lusion reference, and it reuses TSL that already exists in the same file.
4. **Ink model (independent of the above, and the actual fix for the holes):** inside the subject mask ink must never be a function of distance-from-wall. Proposed: `ink = mask ? clamp(a + b·(1 − lum) …)` is still a halftone. For a *lit point cloud* the honest model is **constant ink inside the mask** (size ≈ 1.3× pitch everywhere, no gaps) with tone carried by **colour × lighting**, and the mask fringe faded by the existing knee. Keep `fadeStart/fadeSpan` for the bust dissolve. The flood-fill mask already provides `bgMask`; expose it from `readGrid` and set `ink = (1−bgMask)·fade·(0.6 + 0.4·contrast)` or similar. This directly removes rows 4–5 of the table in §2.4.
5. **Motion:** the Lusion "slowly moving" quality can come from the existing rest-idle terms (`REST_SWAY_*`, `REST_BREATH`) plus a tiny per-particle curl/`sin` drift on `T` at rest (today `transit = 0` at rest, so the face is literally frozen apart from the group sway). A 0.5–1 % of pitch amplitude rest turbulence would not break the "crisp" contract if it is applied to the anchor (deterministic) rather than as a force.

### 6.4 Things that would EXCEED the budget or break contracts

- A fifth `homeE` (compute 9/8) — impossible without §6.2 D/E.
- Any new `.toAttribute()` read in the render beyond 4 more (vertex buffers 8/8) — avoid; prefer `.element()` or the free `.w`s.
- Any storage read inside the fragment `shade` Fn — `instanceIndex` becomes a varying and the read goes per-pixel (HANDOFF contract 8 note).
- Animating `uSizeComp*` — desynchronises `portraitSizePxExpr` from the real disc size (comment at L1610-1622).
- Assigning into an outer `.toVar()` from inside a vertex `Fn` and then `varying()` it — reads the initial constant forever (contract 3).
- `"vec3"` ↔ `"vec4"` declaration change requires re-deriving every swizzle at both `.element()` (declared type) and `.toAttribute()` (always 4-comp for vec3-declared) read sites.

---

## 7. Quick reference — constants that shape the look today

| where | constant | value |
|---|---|---|
| sampler grid | `GRID_W × GRID_H` | 290 × 405 (touch ×0.58 → 168×235) |
| sampler | `JITTER` | 0.9 cell (±0.45) |
| sampler | `BG_FILL_TOL`, `BG_FILL_ROW_LIMIT` | 0.055, 0.62 |
| sampler | `inkGain / inkFloor / inkGamma` | 1.7 / 0.03 / 0.62 |
| sampler | `fadeStart / fadeSpan / inkCut / extentInk` | 0.62 / 0.32 / 0.03 / 0.15 |
| sampler | `depth / centerZBias / FACE_CY / BULGE_RADIUS` | 90 / 0 / 0.44 / 0.75 |
| fit | `STAGE_FILL`, `Z_RELIEF_MAX_FRAC` | 0.92, 0.04 |
| count | `MAX_COUNT_BY_TIER` | full 60,000 / lite 20,000; measured union 51,751 at N=3, stride 1 |
| sim | `SPRING / DAMPING / MAX_SPEED / TURB` | 52 / 7.5 / 16 / 9 (ζ ≈ 0.52) |
| sim | stagger | delay 0.55·hash, window 0.45; `ASSEMBLE_WINDOW` 0.45 |
| motion | `SPREAD_MAX / ORBIT_MAX / DOLLY / PARALLAX_MAX` | 1.1 / 0.7 rad / 2.2 / 0.18 rad |
| motion | `REST_SWAY_YAW / PITCH / BREATH` | 0.02 rad @0.11 rad/s / 0.012 @0.07 / 0.004 @0.5 |
| clocks | `ENTRY_DURATION / MORPH_DURATION` | 1.8 s / 1.4 s per leg |
| render | `PORTRAIT_SIZE_MIN / INK` | 0.06 / 0.94 |
| render | disc edge | `smoothstep(0.5, 0.34, rr)` |
| render | tonal knee / cov / discard | `smoothstep(0,0.1,ink)` / `cov²`, `covPx = max(1.25, 0.35·spacing)` / 0.02 |
| render | `discDev`, `pointSize` | 2.1·spacing; clamp(discDev·12/(dpr·1.05), 10, 96) |
| colour | `DEFAULT_EMISSIVE`, `travelTint`, `PORTRAIT_TRAVEL_K` | 1.18, (0.16, 2.4, 3.0), 0.16 |
| state | blending / depthTest / depthWrite | normal / false / false |
| camera | `CAMERA_Z` | 12 |
| renderer | `antialias` | false |

Sources: file paths and line numbers above; W3C limits https://www.w3.org/TR/webgpu/#limits; three internals under `C:/Users/alber/Desktop/Sersan/node_modules/three/src/` (r184).
