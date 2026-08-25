## 1. EVERY UNIFORM ARRAY TODAY — EXACT BYTES

**Mechanism, verified in source (not assumed):** `UniformArrayNode.getPaddedType()` returns `'vec4'` for `float`, `vec2` **and** `vec3` alike — only `mat*`/`i*`/`u*` branch away (`node_modules/three/src/nodes/accessors/UniformArrayNode.js`, `getPaddedType()`). `setup()` then allocates `new Float32Array(length * builder.getTypeLength(paddedType))` = `length * 4` floats, and `update()` writes a `float` element at stride 4 (`value[i*4] = array[i]`). **Every element is 16 B, whatever its type. Confirmed.**

Build = `broken`/`full`, the shipped Problem band. I re-ran `buildPlexus` verbatim (transcribed from `neuralLatticeConfig.ts:431-639`) and it reproduces the shipped tables exactly: **N = 103, E = 227**, meanSpacing 0.1052, mean degree 4.408. (`healthy/full` = 101/229; `lite` 56/110; `svg` 36/62.)

Particle-material **vertex-stage** arrays (`neuralFieldCompute.ts:967-968, 1013-1018, 1074-1075, 1099`):

| array | decl | elements | element type | padded | bytes |
|---|---|---|---|---|---|
| `uNodePos` | `:1013` | 103 | vec3 (`Vector3`) | vec4 | **1,648** |
| `uNodeT` | `:1016` | 103 | float | vec4 | **1,648** |
| `uEdgeA` | `:1017` | 227 | float | vec4 | **3,632** |
| `uEdgeB` | `:1018` | 227 | float | vec4 | **3,632** |
| `uRingGlow` | `:967` | 3 | float | vec4 | 48 |
| `uRingFlash` | `:968` | 3 | float | vec4 | 48 |
| `uRowGlow` | `:1099` | 3 | float | vec4 | 48 |
| `uStrandPhase` | `:1074` | 4 | float | vec4 | 64 |
| `uStrandThick` | `:1075` | 4 | float | vec4 | 64 |
| | | | | **Σ** | **10,832 B = 10.58 KiB** |

Not compiled: `uMembraneSeal` / `uMembranePhase` (`:1118-1119`, 3 floats = 48 B each) — `MEMBRANE_ALPHA = 0` (`neuralLatticeConfig.ts:1386`) skips `buildMembraneLayer` entirely.

**The 16 KiB floor is PER BLOCK, not a total.** `MAX_UNIFORM_BLOCK_SIZE` bounds each `uniformArray` separately. The correct reading:

- **largest single block = 3,632 B = 3.55 KiB = 22.2 % of the 16,384 B floor.** Nowhere near it.
- total block storage available at min-spec = 12 × 16,384 = 196,608 B; 10,832 B is **5.5 %**. Size is not the wall.
- **the wall is BLOCK COUNT.**

**The 12/12 arithmetic, mechanism-verified.** `GLSLNodeBuilder.getUniforms()` branches on `uniform.type === 'buffer'` and emits **one UBO per `uniformArray`** — `` `${bufferNode.name} {\n\t${bufferType} ${uniform.name}[${bufferCountSnippet}];\n};` `` prefixed with `uniform ` (`GLSLNodeBuilder.js:746-753, 802-816`). Plain `uniform()` scalars instead fall into the `group = true` path and are aggregated into **shared uniform groups**, one struct each (`:772-800, 820-828`). Three's groups are `frame`, `render`, `object` (`UniformGroupNode.js:151/159/167`).

The particle vertex stage references exactly **nine** arrays — verified by `.element()` call sites, all inside vertex-stage helpers:

```
neuralFieldCompute.ts:1189  uRingGlow.element(...)
:1192  uRingFlash.element(...)
:1195  uStrandPhase.element(...)
:1198  uStrandThick.element(...)
:1202  uNodePos.element(...)
:1208  uNodeT.element(...)
:1316  uEdgeA.element(int(edgeIdx))
:1317  uEdgeB.element(int(edgeIdx))
:1347/:1352  uRowGlow.element(...)
```

**9 array blocks + 3 shared groups = 12 of the WebGL2 `MAX_VERTEX_UNIFORM_BLOCKS` min-spec of 12. Zero headroom** — as `neuralFieldCompute.ts:992-1007` states.

Line material vertex stage: **5** arrays (`uNodePos`, `uNodeT`, `uEdgeA`, `uEdgeB` at `:2641-2647`, plus `uRowGlow`) + 3 = **8/12**, 4 spare (`:2606-2612`).

---

## 2. SCALED TO 500 NODES / 1100 LINKS — WHAT BREAKS, AND WHERE

Ceiling per array: `16,384 / 16 = ` **1024 elements, hard.**

| array | elements | bytes | KiB | vs 16 KiB floor |
|---|---|---|---|---|
| `uNodePos` | 500 | 8,000 | 7.81 | ✔ 49 % |
| `uNodeT` | 500 | 8,000 | 7.81 | ✔ 49 % |
| `uEdgeA` | 1100 | 17,600 | **17.19** | ✘ **107.4 %** |
| `uEdgeB` | 1100 | 17,600 | **17.19** | ✘ **107.4 %** |

Break points:
- `uEdgeA`/`uEdgeB` break at **E = 1025 links**.
- `uNodePos`/`uNodeT` break at **N = 1025 nodes**.
- The other five arrays are fixed-length (3/3/3/4/4) and never move.

**At what NODE count does `uEdgeA` break?** Not at the corpus's E/N = 2.204. That ratio is the *welled, band-aspect-0.45* one. I re-ran the shipped generator in the **D17 geometry** (band aspect 935/5350 = 0.1748, `EDGE_MIN_LOCAL` rescaled by 1920/L, `well:false`, cap lifted). A long thin slab has more boundary and fewer interior neighbours, so the k-NN + cutoff rule delivers **E/N = 1.88–2.01**, not 2.204. Measured first-break over **five master seeds**:

| L = 5350 px | L = 7270 px |
|---|---|
| seed 11.37 → N=519 (E=1036) | N=541 (E=1034) |
| seed 57.19 → N=535 (E=1031) | N=544 (E=1030) |
| seed 3.11 → N=514 (E=1026) | N=533 (E=1029) |
| seed 29.5 → N=517 (E=1030) | N=513 (E=1032) |
| seed 88.2 → N=516 (E=1027) | N=530 (E=1028) |

**`uEdgeA` breaks at N ≈ 513–544 nodes. Safe unpacked ceiling: N = 500 / E ≤ 1000.**

**The brief's "500 nodes → 1100 links" over-counts.** At N = 500 in the D17 band the generator delivers **964 links** (L=5350) or **939** (L=7270) — 15.06 / 14.67 KiB, which *fits*, but with only 60 / 85 elements of margin (5.9 % / 8.3 %). Too thin to ship against seed variation.

---

## 3. INDEX PACKING — VERIFIED

Corpus claim (`2026-08-24-round11-coverage-trilemma.md:258`): 2618 edges, 40.9 KiB → 10.2 KiB.

- unpacked: `2618 × 16 = 41,888 B ÷ 1024 = ` **40.91 KiB** ✔
- packed `a + 1024·b`, four per vec4: `ceil(2618/4) = 655` elements `× 16 = 10,480 B ÷ 1024 = ` **10.23 KiB** ✔

**Both numbers confirmed.**

**At 1100 links:** `ceil(1100/4) = 275 × 16 = ` **4,400 B = 4.30 KiB** — 26.9 % of the floor, 3.7× margin.
At the honest 871-link figure (§5): `ceil(871/4) = 218 × 16 = 3,488 B = 3.41 KiB`.

Exactness: max packed value `1024·1023 + 1023 = 1,048,575 < 2²⁴ = 16,777,216`. **Exact in fp32 with 16× margin at N ≤ 1024.** Packed ceiling: 1024 elements × 4 = **4096 links.**

Second, larger win: merging `uEdgeA`+`uEdgeB` into ONE `uniformArray(Vector4[])` removes **one UBO block** — particle vertex stage **12 → 11 of 12** (the first headroom this material has ever had), line stage 8 → 7.

**Costs and risks, stated plainly:**
- decode = `b = floor(v/1024); a = v − 1024·b` (≈3 ALU), plus **dynamic component selection out of a vec4** — TSL has no dynamic vector index, so this is 3 nested `select()` (~6 ALU) per endpoint. Paid per particle per frame in the vertex stage, and again per line vertex.
- `uniformArray(Vector4[])` is **not exercised anywhere in this repo** — only `Vector3[]` (`neuralFieldCompute.ts:1013-1015`) and `number[]`. It takes the identical `getPaddedType` → `'vec4'` path, so it *should* be free, but it must be compiled on the WebGL2 fallback before anything depends on it. The corpus flags this itself (`coverage-trilemma.md:262`).

---

## 4. THE DATA-TEXTURE ESCAPE

**Does the TSL op exist and compile on both backends? YES.**

- `textureLoad` is exported: `export const textureLoad = ( ...params ) => texture( ...params ).setSampler( false );` (`node_modules/three/src/nodes/accessors/TextureNode.js:949`, re-exported `src/Three.TSL.js:561`). three r184 (`node_modules/three/package.json`).
- **WebGL2:** `GLSLNodeBuilder.generateTextureLoad()` emits `texelFetch( sampler, uv, int(level) )` (`GLSLNodeBuilder.js:471-497`) — core GLSL ES 3.00, legal in the vertex stage, no extension.
- **WebGPU:** `WGSLNodeBuilder.generateTextureLoad()` emits `textureLoad( tex, uv, u32(level) )` (`WGSLNodeBuilder.js:646-664`) — legal in a WGSL vertex stage.
- **Zero UBO cost:** textures are declared as `uniform sampler2D name;` through the `bindingSnippets` path, never as a block (`GLSLNodeBuilder.js:686-730, 802-816`). The `isDataTexture` branch is handled explicitly at `:692-708`.
- WebGL2 `MAX_VERTEX_TEXTURE_IMAGE_UNITS` min-spec is 16. **The claim is correct.**

**IS IT ALREADY USED IN THIS REPO? NO — and this is the finding.** Every `texture(...)` in `src/webgl/` is a **fragment or RTT/compute** read, never a vertex one:

- `webgl/fluid/PointerFlowmap.ts:217, :284` — RTT ping-pong, fragment.
- `webgl/materials/depthParallaxNodeMaterial.ts:201, :208, :227` — fragment.
- `webgl/neural/crystalBuild.ts:1310` `markBase = texture(markTexture)` → consumed at `:1463`, assigned to `material.colorNode` at `:1690` — **fragment**.
- `webgl/singularity/blackHoleMaterial.ts:426, :441, :488` — fragment.
- The GPGPU particle path is explicitly **sampler-free**: *"every backend and in every stage; sampler-free (no texture round-trip…)"* (`webgl/gpgpu/gpgpuNodeSim.ts:14`); `gpgpuRenderShader.ts:27` — *"no texture reads, no sim…, robust on both backends"*. `sersanMark.ts:199-200` documents a `DataTexture` recipe but the shipped build passes `aHome` as an **attribute**.

And the WebGL2 texture path has an explicit open flag: `MARK_RT_WEBGL2 = false` — *"RT + `texture().level()` are core on that path too, but the repo-wide `?backend=webgl2` proof is still open… until it passes, the mark branch is NOT BUILT on the fallback backend"* (`webgl/neural/crystalConfig.ts:1746-1752`).

**So: the escape is spec-legal on both backends and costs zero blocks, but it is UNPROVEN on the exact backend that needs it.**

**Exact cost if taken:**

| | format | layout | texels | VRAM |
|---|---|---|---|---|
| nodes, 1024 | `RGBAFormat` + `FloatType` (RGBA32F) | one texel = `(x, y, z, nodeT)` — folds `uNodeT` in free | 32 × 32 | **16 KiB** |
| links, 4096 | RGBA32F | one texel = `(a, b, –, –)` | 64 × 64 | **64 KiB** |
| links, 4096 (2/texel) | RGBA32F | `(a₀,b₀,a₁,b₁)` | 32 × 64 | 32 KiB |
| the actual D17 need (454 / 871) | RGBA32F | — | 512×1 + 1024×1 | 8 + 16 KiB |

- **Filtering:** `NearestFilter` min+mag, `generateMipmaps = false`. `texelFetch`/`textureLoad` bypass the sampler entirely, so RGBA32F needs **no extension** (`OES_texture_float_linear` is only required for LINEAR filtering, `EXT_color_buffer_float` only for render targets).
- **Orientation:** the "render-target textures are y-down on both backends" trap **does not apply** — a `DataTexture` defaults `flipY = false` and `texelFetch` takes raw integer texel coords.
- **Precision — half float is NOT enough.** Node x is a fraction of band width; over a 5350 px run, fp16 ulp at |x| ≈ 0.5 is `2⁻¹¹ = 4.883e−4` → **2.61 px** (3.55 px at 7270). Stars would sit on a visible 2.6–3.6 px lattice at the band's ends and every line endpoint would snap with them. fp32 ulp at 0.5 is `2⁻²⁴ = 5.96e−8` → **3.2e−4 px**. **Use `FloatType`.** (Edge *indices* are exact in fp16 up to 2048, but a second format costs a second texture — just use fp32 for both.)
- **Indexing:** `ivec2(i & (W−1), i >> log2W)` with W a power of two.
- **What it frees:** `uNodePos`, `uNodeT`, `uEdgeA`, `uEdgeB` → **−4 UBO blocks**. Particle vertex stage **12 → 8 of 12**; line vertex stage **8 → 4 of 12**. The 1024-element ceiling disappears entirely (a 4096² RGBA32F holds 16.7 M texels).
- **What it costs:** 2 vertex texture units of ≥16; higher-latency fetches inside `anchorNode()` (2 node + 2 index fetches per particle per frame); and live tuning changes from a uniform write to `tex.image.data[…] = v; tex.needsUpdate = true` (full re-upload).

---

## 5. THE DENSITY QUESTION — WHAT THE BAND ACTUALLY NEEDS

**Measured today's density, at 1920×935.** Band rect = `1920 × (0.8597 × 935) = 1920 × 803.8 px` (`traverseConfig.ts:298` `bandVh: 0.8597`, full-bleed width per `problem-section.tsx:549`). Delivered node bbox: x span 0.9089 of band width, y span 0.7538 of band height → **1745 × 606 px = 1.057 Mpx² = 0.589 frames²**. So:

> **174.9 nodes per square frame · 385.4 links per square frame · mean NN spacing 84.6 px · mean edge 114.3 px.**

**The brief's "4.8× the area" is an apples-to-oranges ratio** — it compares the new BAND rect (2.786 frames²) to today's CLOUD BBOX (0.589 frames²). Like-for-like, band-to-band:

- 5350 × 935 ÷ (1920 × 803.8) = **3.241×** → parity **N = 334**
- 7270 × 935 ÷ (1920 × 803.8) = **4.404×** → parity **N = 454**

**Which length?** "As long as the entire lateral run" = 5350 px puts the net's own left/right ends inside the frame at the start and end of the run. For the net to cover the frame *throughout* a 5350 px slide it must be **run + frame width = 7270 px**. D17 accepts visible **top and bottom** edges; it does not accept a gap. **7270 px is the honest length.**

**The table** (shipped generator, `well:false`, band aspect = 935/L, `EDGE_MIN_LOCAL` rescaled, cap lifted; seed 11.37):

**L = 5350 px** (run only)

| N | E (generator) | `uEdgeA` | KiB | fits? | packed | nodes/frame² |
|---|---|---|---|---|---|---|
| 120 | 191 | 3,056 B | 2.98 | ✔ | 768 B | 62.8 |
| **167** | **303** | **4,848 B** | **4.73** | ✔ | 1,216 B | **87.4 ← half density** |
| 250 | 488 | 7,808 B | 7.63 | ✔ | 1,952 B | 130.9 |
| **334** | **665** | **10,640 B** | **10.39** | ✔ | 2,672 B | **174.9 ← parity** |
| 400 | 789 | 12,624 B | 12.33 | ✔ | 3,168 B | 209.4 |
| 500 | 964 | 15,424 B | 15.06 | ✔ (5.9 % margin) | 3,856 B | 261.8 |
| **519** | **1036** | **16,576 B** | **16.19** | **✘ BREAK** | 4,160 B | 271.8 |

**L = 7270 px** (run + frame — the continuous case)

| N | E (generator) | `uEdgeA` | KiB | fits? | packed | nodes/frame² |
|---|---|---|---|---|---|---|
| 120 | 193 | 3,088 B | 3.02 | ✔ | 784 B | 46.2 |
| **227** | **436** | **6,976 B** | **6.81** | ✔ | 1,744 B | **87.5 ← half density** |
| 334 | 633 | 10,128 B | 9.89 | ✔ | 2,544 B | 128.7 |
| **454** | **871** | **13,936 B** | **13.61** | ✔ (17 % margin) | 3,488 B | **174.9 ← parity** |
| 500 | 939 | 15,024 B | 14.67 | ✔ | 3,760 B | 192.7 |
| **541** | **1034** | **16,544 B** | **16.16** | **✘ BREAK** | 4,144 B | 208.5 |

**Does it need today's density?** At parity the band is right at today's read. At **half** density (87.5 nodes/frame²) the honest 7270 px net is only **227 nodes / 436 links / 6.81 KiB** — the exact node count today's band has *links*. Halving is a taste call, not a capacity one: **both fit.**

---

## 6. PARTICLE COUNTS

**First, correct the premise: today is 9,000 particles, not 104k.** `NEURAL_PARTICLE_COUNT = 9000` (`neuralLatticeConfig.ts:177`), `_COMPACT = 3200` (`:202`), selected at `NeuralLattice.tsx:273, 313-314`. The **~103,800** figure is the corpus's projection for the *rejected* 11.5× corridor (`coverage-trilemma.md:124`), never a shipped number.

**Today's per-unit allocation** (`seedBuffers`, `neuralFieldCompute.ts:791-891`), broken/full:
```
sparkCount = 32                              (SPARK_COUNT, config :1158)
starCount  = floor(9000 × 0.46) = 4,140      (NODE_FRACTION, config :1103)
edgeTotal  = 9000 − 4140 − 32   = 4,828
  → 4140 / 103 nodes = 40.19 particles per node
  → 4828 / 227 links =  21.27 particles per link
```

**Same allocation, scaled:**

| band | N / E | stars | link traffic | total | ×today | line verts (E×12) |
|---|---|---|---|---|---|---|
| L=5350, parity | 334 / 665 | 13,424 | 14,144 | **27,600** | 3.07× | 7,980 |
| L=7270, parity | **454 / 871** | 18,246 | 18,526 | **36,804** | **4.09×** | **10,452** |
| L=7270, half density | 227 / 436 | 9,123 | 9,274 | **18,429** | 2.05× | 5,232 |
| unpacked ceiling | 515 / 1000 | 20,698 | 21,270 | **42,000** | 4.67× | 12,000 |

**Is that affordable? What I CAN know:**

- **On-frame fill is unchanged by construction.** At density parity only `1/3.79` of the net is inside the frame at any instant, and the on-frame node/link count equals today's. The additive-fill argument in `neuralLatticeConfig.ts:186-200` therefore transfers unchanged.
- **Vertex/compute cost is NOT culled per particle.** Every mesh is `frustumCulled={false}` (`NeuralLattice.tsx:683-687`); the culls are whole-island — vertical at `:679-682`, lateral at `:688-697` — and `build.compute(delta)` sits *after* them at `:1016`. **Under D17 the one band is on frame for the entire act by construction, so the lateral cull never fires.** All 36,804 particles × 4 quad verts (`QUAD_CORNERS`, `:742`) = **147,216 vertex-shader invocations every frame**, each running `anchorNode()` (edgeFrame + perpendicular frame + strand twist + fray + copy mask), plus a 10,452-vertex `LineSegments`.
- **Against today's worst case:** the ladder guarantees never three bands on frame (`traverseConfig.ts:169`), so today peaks at 2 × 9,000 = 18,000 particles / 72,000 vertex invocations. **D17 = 2.04× the peak.** But total *allocation* falls: today's five islands allocate 5 × 9,000 = **45,000**; D17 allocates **36,804**. VRAM goes down, steady-state vertex work goes up ~2×.
- **A CPU cost that scales with the tables:** `UniformArrayNode.updateType = NodeUpdateType.RENDER` and `update()` rewrites **every** element into the padded Float32Array on **every render**, though the tables are static. Today 103+103+227+227 = 660 float writes/render/island; at 454/871 it becomes **2,650**. Trivial in absolute terms, but it is a per-frame JS loop that grows with N and E.

**What I CANNOT know without a profiler:** actual GPU ms for the additive fill (the config's budget is px²-based, never measured in time); whether 147k `anchorNode()` vertex invocations fit the frame on the WebGL2 analytic tier and on the lite/phone tier; overdraw in the dense core and the bloom-pass cost at 4.4× the star count; WebGPU compute dispatch time at 36.8k; and **whether the per-render `update()` also triggers a GL `bufferSubData` of the whole ~28 KiB each frame — unverified.**

---

## VERDICT

**The largest continuous band that fits WITHOUT a data texture: N ≈ 500 nodes / E ≤ 1000 links.** Measured across five master seeds in the D17 geometry, the `uEdgeA`/`uEdgeB` 1024-element ceiling is crossed at **N = 513–544**. Nothing else moves: `uNodePos`/`uNodeT` would not break until 1025 nodes, and the other five arrays are fixed-length.

**D17 fits today, unpacked and un-textured — with room.** At today's measured density (174.9 nodes/frame²), the honest continuous net (7270 px × 935 px, run + frame width) is **454 nodes / 871 links / `uEdgeA` 13.61 KiB (83 % of the floor)**. If the shorter 5350 px reading is taken it is **334 / 665 / 10.39 KiB (63 %)**. **The design does not need to change.**

**Two corrections the brief should absorb:** the area multiplier is **3.24× / 4.40×**, not 4.8× (the 4.8 compares the new band rect to today's cloud bbox); and 500 nodes yields **939–964 links, not 1100** — a long thin slab's k-NN triangulation gives E/N ≈ 1.88–2.01, not the welled band's 2.204.

**Recommended path:**

1. **Ship the band at 454 nodes / 871 links as-is.** No packing, no texture, no shader edit — only the build-time constants below.
2. **Then take index packing as free headroom, before it is ever needed.** Merge `uEdgeA`+`uEdgeB` into one `uniformArray(Vector4[])` with `a + 1024·b`, four links per element: 2 × 13.61 KiB → **one 3.41 KiB block**, particle vertex stage **12/12 → 11/12** (first headroom the material has ever had), line stage 8 → 7, link ceiling 1024 → 4096. Gate it on a `?backend=webgl2` compile proof, since `uniformArray(Vector4[])` is unexercised here.
3. **Do NOT take the data texture now.** It is the correct escape above 1024 nodes, it costs zero UBO blocks, and both backends emit the right instruction — but it is unproven on the exact backend that needs it (zero vertex-stage texture reads in `src/webgl/`; `MARK_RT_WEBGL2 = false` at `crystalConfig.ts:1752`), and D17 is 2.3× under the ceiling that would force it.

**Build-time constants that MUST move with the band (all silent failures if missed):**

- `PLEXUS_EDGE_CAP` = 250 (`neuralLatticeConfig.ts:245-249`) — **the net silently truncates to 250 links** otherwise.
- `PLEXUS_SEEDS` / `PLEXUS_SEEDS_STONELESS` (`:217-237`).
- **`BAND_ASPECT` = 0.45 (`:263`)** — the only thing putting x and y in the same units at build time. The D17 band is **935/7270 = 0.1286**. Left at 0.45, "nearest neighbour" means something **3.5× different** horizontally than vertically and the triangulation degenerates.
- **`EDGE_MIN_LOCAL` = 0.055 (`:344`)** — local *band-width* units. At 7270 px that is **400 px**, not 106 px; it would reject the entire short-link population. Rescale by 1920/L.
- **The dedup key `a * 1024 + b` (`:546`)** is injective only for `b < 1024` — a hard tripwire at **N ≥ 1025** that **silently drops edges rather than throwing**. It agrees with the uniformArray ceiling by coincidence, not design.
- `MAX_TRAVERSE_ISLANDS = 4` (`traverseConfig.ts:235`) and the ladder apparatus, per D17.
- Stale comment: `neuralFieldCompute.ts:763` bounds `aux = edgeIdx·2 + strand` at "≤ ~500"; at E = 871 it reaches 1742 (still exact in fp32; `STRAND_COUNT = 1` so `strand` is always 0).