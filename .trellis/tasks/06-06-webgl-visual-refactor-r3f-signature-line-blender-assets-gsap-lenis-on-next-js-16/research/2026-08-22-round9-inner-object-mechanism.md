# Research: Round 9-A — how igloo makes the inner object visible (and why ours is confetti)

- **Query**: "no, voglio che si veda il logo, devi capire come è fatto quello di igloo." Find the actual mechanism by which igloo's penguin reads clearly through a faceted refractive shell; verify or refute the screen-space-projection hypothesis; then spec the transplant onto our stack.
- **Scope**: internal (`src/webgl/neural/*`, `src/webgl/CrystalCluster.tsx`, `node_modules/three@0.184`) + bundle forensics (`igloo-app3d.pretty.js`)
- **Date**: 2026-08-22 (session 2026-08-24)
- **Bundle**: `C:\Users\alber\AppData\Local\Temp\claude\C--Users-alber-Desktop-sersan-v2-main\5042dfcb-dc07-4454-a8cc-9bef33d8c714\scratchpad\igloo-app3d.pretty.js`

---

## 0. VERDICT — HYPOTHESIS CONFIRMED, verbatim

The hypothesis ("igloo refracts the view ray, computes the exit point in world space, **projects that point to screen coordinates**, and samples the transmission RT **at that screen uv**") is **CONFIRMED**. The four lines that settle it, `igloo-app3d.pretty.js:37880-37888`, verbatim:

```glsl
vec4 getIBLVolumeRefraction2( const in vec3 n, const in vec3 v, ... const in vec3 position, const in mat4 modelMatrix, const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness, ... ) {
    vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
    vec3 refractedRayExit = position + transmissionRay;
    vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
    vec2 refractionCoords = ndcPos.xy / ndcPos.w;
    refractionCoords += 1.0;
    refractionCoords /= 2.0;

    vec4 transmittedLight = getTransmissionSampleCheap( refractionCoords, roughness, ior );
```

with (`:37854-37857`)

```glsl
vec4 getTransmissionSampleCheap( const in vec2 fragCoord, const in float roughness, const in float ior ) {
    float lod = log2( uTransmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
    return textureLod( tTransmissionSamplerMap, fragCoord.xy, lod );
}
```

and `position` bound at the call site (`:37905-37907`) to the **world** fragment position:

```glsl
vec3 pos = vWorldPosition;
vec3 v = normalize( cameraPosition - pos );
vec3 n = inverseTransformDirection( normal, viewMatrix );
```

**The one sentence that explains everything:** because the exit point is `position + transmissionRay`, and `transmissionRay` is *almost parallel to the view ray through that very fragment* (ior 1.18 ⇒ tiny bend), the projection **exactly cancels the dominant component of the offset**. What survives is only the lateral part, `thickness · modelScale · sin(deviation)`. The base map from fragment → sample uv is therefore **the identity in screen space**, perturbed by a few percent. The penguin lands where the penguin actually is on screen. There is no way for it *not* to be legible.

**Our method is the one that is wrong**, and not by a small margin — we replaced the identity screen map with an *orthographic projection along the crystal's own local Z axis*, on a mesh that tumbles ±115°. Details and arithmetic in §2.

---

## 1. The igloo mechanism, mined exactly

### 1.1 (a) What SPACE is the RT sampled in — **screen space, full-viewport**

`tTransmissionSamplerMap` is bound to `this._transmissionRT.texture` and `uTransmissionSamplerSize` to `(rt.width, rt.height)` (`:39309`). The RT is created 2×2 and then resized to the **full canvas resolution** every resize (`:39372`):

```js
resize() {
    this.camera.zoom = Math.min(1, q.screen.aspectRatio * 1.25), this.camera.updateProjectionMatrix(),
    this._transmissionRT.setSize(he.uniforms.resolution.value.x, he.uniforms.resolution.value.y)
}
```

Its allocation (`:39238-39243`) — mipmapped half-float, no MSAA:

```js
this._bgTex = le.load("cubes/bg.png", "srgb"),
this._transmissionRT = new vt(2, 2, { generateMipmaps: !0, type: Mi /*HalfFloatType 1016*/, minFilter: Qs /*LinearMipmapLinearFilter 1008*/, samples: 0 })
```

So: a **full-resolution, camera-aligned, mipmapped render of the scene**, sampled at NDC-derived uv. Nothing local-space anywhere.

### 1.2 (b) How the exit point is computed and projected

`getVolumeTransmissionRay` (`:37823-37837`) is stock three, unmodified:

```glsl
vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
    // Direction of refracted light.
    vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
    // Compute rotation-independant scaling of the model matrix.
    vec3 modelScale;
    modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
    modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
    modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
    // The thickness is specified in local space.
    return normalize( refractionVector ) * thickness * modelScale;
}
```

Then `exit = pos + ray` → `projMatrix * viewMatrix * vec4(exit,1)` → `/w` → `*0.5+0.5`. Confirmed byte-for-byte identical to three 0.184's own TSL `getIBLVolumeRefraction` (`node_modules/three/build/three.webgpu.js:24507-24558`), which we already ship:

```js
const transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
const refractedRayExit = position.add( transmissionRay );
// Project refracted vector on the framebuffer, while mapping to normalized device coordinates.
const ndcPos = projMatrix.mul( viewMatrix.mul( vec4( refractedRayExit, 1.0 ) ) );
const refractionCoords = vec2( ndcPos.xy.div( ndcPos.w ) ).toVar();
refractionCoords.addAssign( 1.0 );
refractionCoords.divAssign( 2.0 );
refractionCoords.assign( vec2( refractionCoords.x, refractionCoords.y.oneMinus() ) ); // webgpu
```

Note that last line: three flips **y** on the WebGPU path, because there it samples a *framebuffer copy* (`viewportMipTexture`), whose origin convention is flipped. Igloo, on WebGL, does not flip. This is the classic backend trap and it is called out in §3.6.

**The cancellation, stated formally.** Let `I = normalize(pos − cameraPos)` (the view ray direction through this fragment). The refracted direction is `I` rotated toward the normal by the deviation angle `δ`, so

```
transmissionRay = T·(cos δ · Î + sin δ · t̂),   T = thickness · modelScale
```

`project(pos + λÎ) = project(pos)` for every λ (moving along a ray through the camera does not move the NDC xy). Therefore the **entire `cos δ` term contributes exactly zero screen displacement**, and

```
screen displacement  =  project(pos + T·sin δ · t̂) − project(pos)
                     ≈  T·sin δ  /  (2·z·tan(fov/2))   of screen height
```

### 1.3 (c) Role of `uThickness`, `ior`, `modelMatrix` scale — the offset magnitude

| term | igloo value | where | effect |
|---|---|---|---|
| `uThickness` | **2** | `:37690` | linear on the offset magnitude `T` |
| `modelScale` | 1 (cube group has position only, no scale — `:39019`) | model matrix | linear on `T`; makes `thickness` a *local-space* quantity |
| `material.ior` | **1.18** | `:39028` | sets the deviation `δ` — the ONLY thing that produces lateral offset at all |
| `uChromaticAberration` | **0.1** | `:37685` | per-channel ior scaling `ior·(1 + k·CA·…)`, k∈{0,1,2} → coloured fringes |
| `AWESOME_SAMPLES` | **3** | `new WL(3)`, `:39027` | 3 ladder iterations × 3 channels = 9 `getIBLVolumeRefraction2` calls |
| `roughness` 0.65, `applyIorToRoughness` | `rough·clamp(2·ior−2,0,1)` = `0.65·0.36` | `:37843` | mip lod = `log2(width)·0.234` ≈ 2.5 at 1080p |

Deviation arithmetic at ior 1.18 (`sin δ₂ = 0.847·sin δ₁`):

| incidence θ₁ | deviation δ | lateral offset `2·sin δ` (world) | % of a 4.14-world-unit screen height |
|---|---|---|---|
| 0° | 0° | 0 | 0 % |
| 30° | 4.94° | 0.172 | 4.2 % |
| 45° | 8.21° | 0.286 | 6.9 % |
| 60° | 12.76° | 0.442 | 10.7 % |
| 75° | 20.13° | 0.688 | 16.6 % |

(Camera at `(0,0,5)`, fov 45 — `:39260`, `:39310` — zoom 1 at ≥1.42 aspect ⇒ visible height at the cube's depth = `2·5·tan22.5° = 4.14` world units. The cube is ~3.3 units tall: the "smoke" billboard sized to it is `new kt(2.5, 3.5)`, `:39033`.)

So: the penguin is displaced by **4–11 % of the screen height** on typical facets, ~17 % at the silhouette. Against a penguin ~2 world units tall (≈48 % of screen height), that is a **9–22 % wobble of the subject's own size**. Legible by construction.

### 1.4 (d) mesh3 — the inner object: placement, material, and RT-only visibility

Constructed as a **direct sibling of the shell in the same group**, with no offset, no scale, no rotation of its own (`:39026-39031`):

```js
const [e, t] = await Promise.all([zt.load(`cubes/${this.options.obj}.drc`), zt.load(`${this.options.innerobject}.drc`)]);
this.mesh = new bE(e, new WL(3)); ... this.mesh.renderOrder = 3; this.add(this.mesh);
...
this.mesh3 = new Ce(t, new or({ map: le.load(`cubes/${this.options.innerobject}_color.ktx2`) })),
this.mesh3.name = `${this.options.innerobject+this.options.index} `, this.mesh3.renderOrder = 10, this.add(this.mesh3)
```

- `or` = **MeshBasicMaterial** (class def `:3591`, `this.isMeshBasicMaterial = !0`). Unlit, baked colour map — no lighting model at all. Ours already matches (`crystalMarkRT.ts:116`).
- Default `innerobject: "pudgy"` (`:39014`) — a **pudgy penguin**: a chunky, solid, high-mass silhouette.
- Because it is a child of the same group as the shell, **it inherits the group's scroll position and rotation**, i.e. it tumbles rigidly inside the ice. It is *not* separately transformed.

**It is rendered ONLY into the RT.** The per-frame two-pass in `aF.update()` (`:39302-39310`) is the whole rig:

```js
// PASS 1 — into the RT
this.cubes.forEach(r => {
    r.mesh.material.side = ei /*BackSide*/, r.mesh.material.needsUpdate = !0,
    r.mesh.material.uniforms.tTransmissionSamplerMap.value = this._bgTex,
    r.mesh.material.uniforms.uTransmissionSamplerSize.value.set(4, 4),
    r.mesh3.visible = !0, r.mesh2.visible = !1, r.plexus.group.visible = !1
}), this.textsGroup.visible = !1, this.blurrytext.mesh.visible = !1, this.backgroundshapes.mesh.visible = !1;
const t = he.renderer.webgl.getRenderTarget();
he.renderer.webgl.setRenderTarget(this._transmissionRT), he.renderer.webgl.clear(!0, !0, !0),
he.renderer.webgl.render(this, this.camera), he.renderer.webgl.setRenderTarget(t),
// PASS 2 — the real frame
this.cubes.forEach(r => {
    r.mesh.material.side = es /*FrontSide*/, r.mesh.material.needsUpdate = !0,
    r.mesh.material.uniforms.tTransmissionSamplerMap.value = this._transmissionRT.texture,
    r.mesh.material.uniforms.uTransmissionSamplerSize.value.set(this._transmissionRT.width, this._transmissionRT.height),
    r.mesh3.visible = !1, r.mesh2.visible = !0, r.plexus.group.visible = !0
}), this.textsGroup.visible = !0, ...
```

(`es = 0` FrontSide, `ei = 1` BackSide — `:35-36`.)

Reading it out:

1. **Pass 1** renders the *whole scene with the SAME camera* into the full-res RT, with the shell flipped to **BackSide** (so you see the ice's inner wall, refracting the 4×4 `bg.png` — a flat colour stand-in) and with `mesh3` **visible**, `mesh2` (the smoke billboard) and the plexus **hidden**, and all text/blurry-text/background-shapes hidden.
2. **Pass 2** flips the shell to FrontSide, points the sampler at the RT, and **hides mesh3**. The penguin exists in the final frame *only* as texels of the transmission RT read back through the shell.

So the answer to (d) is: **yes, mesh3 is rendered exclusively into the RT**, it is at the shell's own transform, and the RT camera **is the main camera** — that is precisely what makes the screen-space sample land on it.

### 1.5 (e) Does the shell's face count / normal variation affect the inner object's coherence?

**Barely — the claim holds.** Under this scheme, the map fragment → sample-uv is `identity + ε(n)`, where `ε` is bounded by `T·sin δ(n)` projected. More facets means more distinct `ε` values, but every one of them is a *small perturbation of the same identity map*: every patch still shows the subject essentially where the subject is. The image gets a faceted wobble, never a re-index.

This **qualifies the round-8-H conclusion** recorded on `MARK_GAIN` ("34 planar patches means 34 independent refracted images … the subject arrives cut into 34 offset pieces"). That is a true description of *our* scheme, not of igloo's. Under igloo's scheme the patches are not independent images; they are 34 slightly-shifted copies of the same, correctly-placed image. Coplanar patch size was a partial compensation for a broken base map, not the mechanism.

### 1.6 Small facts worth pinning (they answer likely follow-ups)

- The shell material `WL extends Ys` where `Ys` = stock **MeshPhysicalMaterial** (`:16743`, `isMeshPhysicalMaterial = !0`); the whole custom rig is an `onBeforeCompile` chunk-replacement (`:37708-38014`).
- `s.material.transmission = 0` (`:39028`) — three's **own** transmission pass is deliberately disabled (it would render a second RT and fight this one). The injected code still runs because `#include <transmission_fragment>` / `<transmission_pars_fragment>` markers are unconditional in three's *source string*; the guards are inside the chunks. `material.ior` remains available because the `IOR` define is set for any MeshPhysicalMaterial (`three.webgpu.js:5786-5787`, `:5891`, `:8192`).
- `volumeAttenuation` is short-circuited to `vec3(1.0)` (`:37859-37861`, commented `// fix`) — Beer's law is OFF. Nothing dims the penguin with depth.
- The result is written straight over the diffuse: `totalDiffuse = transmitted.rgb; totalDiffuse = clamp(...)` (`:37960-37961`, both marked `// fix`). The transmitted image IS the body.
- The dispersion loop calls `getIBLVolumeRefraction2` **9 times** (3 iterations × R/G/B, `:37924-37939`), each with its own `ior` and `uThickness + thickness_smear·(i+noise)/N`, where `thickness_smear = uThickness * pow(roughnessFactor, 0.33)`.
- Bloom sits on top at `levels 6, luminanceThreshold .2, intensity 1, radius .85` (`:39266-39272`).

---

## 2. Our implementation, diagnosed precisely

### 2.1 What the code does (`src/webgl/neural/crystalBuild.ts:1211-1283`)

```ts
const base = vLocal.xy.mul(BACKDROP_COORD_SCALE).toVar();   // :1216
const refrR = refractDir(I, Nj, inv).toVar();               // :1220  (VIEW-space direction)
...
const cR = base.add(refrR.xy.mul(th)).toVar();              // :1253
const cG = base.add(refractDir(I, Nj, etaG).xy.mul(th)).toVar();
const cB = base.add(refractDir(I, Nj, etaB).xy.mul(th)).toVar();
...
mAccR = mAccR.add(markBase.sample(cR.mul(uMarkScale).add(0.5)).level(markLod).x);   // :1260-1268
mAccG = mAccG.add(markBase.sample(cG.mul(uMarkScale).add(0.5)).level(markLod).y);
mAccB = mAccB.add(markBase.sample(cB.mul(uMarkScale).add(0.5)).level(markLod).z);
```

with `th = thickEff.add(smear·…).mul(REFR_OFFSET_SCALE)` (`:1244-1246`), `I` and `Nj` **view-space** (`:1130-1132`, `:1203`), and `vLocal = varying(pos)` = the **crystal-local** vertex position (`:1097`).

So the mark uv is

```
uv = vLocal.xy · BACKDROP_COORD_SCALE(0.4) · MARK_COORD_SCALE(0.55) + refrDirView.xy · th · 0.55 + 0.5
   = vLocal.xy · 0.22                                                + refrDirView.xy · 0.495 + 0.5
```

This is **confirmed as the diagnosis stated in the task**, and the deviation was deliberate — `crystalConfig.ts:779-782` says so in as many words:

> "RT edge (square, power-of-two for the mip chain). **NOT canvas-coupled: the mark is sampled in CRYSTAL-LOCAL space (not screen space like igloo)**, so the RT resolution is decoupled from the viewport".

### 2.2 Three separate defects, in order of severity

**Defect 1 — the base map is an orthographic projection along the crystal's LOCAL Z, and the crystal tumbles ±115°.**

`group.quaternion.copy(camera.quaternion)` (`CrystalCluster.tsx:489`) makes the *group* camera-aligned, but the tumble is written on the **mesh** (`:511-518`):

```
rot.x = TUMBLE_K[0]·TUMBLE_RAND.healthy[0]·TUMBLE_GAIN.healthy·aT = 14·(−0.57)·0.25·aT = −1.995·aT
rot.y = 11·( 0.71)·0.25·aT = +1.953·aT
rot.z =  6·(−0.39)·0.25·aT = −0.585·aT     (+ ±0.1 wobble)
```

`a = (vpTop + rect.h/2 − ih/2)/ih` (`:499`), deadzone-remapped with `TUMBLE_DEADZONE 0.08`. Working the angle between the mesh's local +Z and the view axis:

| `a` (band position) | `aT` | rot.x / rot.y (rad) | local +Z off the view axis |
|---|---|---|---|
| 0 (band centred) | 0 | 0 / 0 | **0°** (+wobble ≈ 8°) |
| ±0.25 | 0.185 | ∓0.369 / ±0.361 | **≈ 29°** |
| ±0.50 | 0.457 | ∓0.912 / ±0.893 | **≈ 67°** |
| ±0.79 | 0.772 | ∓1.54 / ±1.51 | **≈ 90° — degenerate** |

At 67° the ortho-along-local-Z map compresses the image to `cos 67° = 0.39` along one screen axis; past ~75° the front-facing cap of the body is **no longer a graph over local XY**, so the map *folds*: two screen-separated parts of the visible surface index the same uv from opposite sides, producing mirrored, creased pieces. The cull window keeps the stone on screen for the whole of `|a| ≲ 1.2`, so these orientations are all *visible*. The mark is only ever near-correctly mapped inside a narrow window around band centre.

Igloo has no analogue of this failure: its base map is the camera projection, which is orientation-independent by construction.

**Defect 2 — the along-ray component is never cancelled, because nothing is projected.**

Igloo's `cos δ` term (95–99 % of the offset) vanishes in the perspective divide. Ours does not: `refrDirView.xy` carries the *whole obliquity of the view ray*, not just the refractive deviation. The stone sits at `CRYSTAL_POS.healthy = [0.22, 0.06]` (`crystalConfig.ts:186-189`) — 22 % of the band width right of centre. At a 1440×900 viewport that is ≈317 px ⇒ 3.94 world units off-axis at depth `CAMERA_Z = 12`, i.e. an off-axis angle of 18.2°, `sin = 0.31`. So `|refrDirView.xy|` has a **constant 0.31 floor** before any refraction, plus the deviation term (0 → 0.34) in a facet-dependent direction.

Translating to the image: `1 uv = 1/0.22 = 4.545 crystal units`; group scale `s = rect.h·k·CRYSTAL_SCALE = 900·(11.191/900)·0.17 = 1.90` world/crystal-unit; `80.4 px/world` at the group's depth plane ⇒ **1 uv ≈ 695 px on screen**. Facet-dependent offset therefore reaches `0.34 · 0.495 = 0.168 uv ≈ ±117 px`, on a mark whose visible extent is ~500 px. That is the confetti, quantified: **patch-to-patch jumps of up to a quarter of the logo's height, in arbitrary directions.**

**Defect 3 — mixed bases.** `base` is a *position in crystal-local space*; the offset is a *direction in view space*. The perturbation field therefore rotates relative to the image as the stone tumbles, so even the "swim" does not agree with the picture it is swimming.

### 2.3 Sizing (recorded for the transplant, and it disagrees with an inline comment)

- RT: `MARK_RT_SIZE 512`, ortho half-extent `MARK_RT_FRAME 1.15`, mark normalized to **height 2** and centred (`RouteHeroLogo.tsx:49`, `:83-91`). ⇒ the mark occupies `2/(2·1.15) = 0.87` of the RT's uv height.
- Stone: local half-height ≈1.66 ⇒ base map covers uv `0.5 ± 0.365` = **0.73 uv**.
- So the mark is rendered ~19 % *larger* than the window the stone shows, i.e. **cropped top and bottom**, and its effective on-screen height is ~600 px clipped to a ~507 px stone. The `MARK_COORD_SCALE` doc-comment says "Sizes the mark to ~0.9 crystal units inside the body" (`crystalConfig.ts:890-891`), which does not follow from `uv = vLocal.xy·0.22 + 0.5`; treat the derived numbers above as authoritative and re-check that comment when the constant is replaced.

---

## 3. The transplant spec

Target: `src/webgl/neural/crystalBuild.ts` (the mark ladder), `crystalMarkRT.ts` (the rig), `crystalConfig.ts` (constants), `CrystalCluster.tsx` (driver). Stack facts assumed and verified: **three 0.184**, `@react-three/fiber 9.6.1`, `MeshBasicNodeMaterial` with a hand-written `vertexNode`, WebGPU-only mark branch, healthy + full tier.

### 3.1 What we already have in hand (no new imports beyond three)

`crystalBuild.ts:710-742` already destructures `modelViewMatrix` and `cameraProjectionMatrix` from `three/tsl`. In the fragment we already have:

| we need | we already have | line |
|---|---|---|
| fragment view position | `vPosView = varying(mvPos.xyz)` | `:1093` |
| view normal (ripple-perturbed, jittered) | `N`, `Nj` | `:1130`, `:1203` |
| view incident dir | `I = V.negate()` | `:1132` |
| refract | `refractDir(I, N, eta)` (hand-rolled, TIR-safe) | `:1009-1017` |
| projection matrix | `cameraProjectionMatrix` | `:716` |

Additionally available but **not yet imported** from `three/tsl` (all confirmed exported in 0.184): `modelScale`, `modelViewPosition`, `positionView`, `screenUV`, `getScreenPosition`, `textureBicubicLevel`, `viewportMipTexture`, `viewportOpaqueMipTexture`.

Crucially: doing the projection in **view space** is exactly equivalent to igloo's world-space form and is cheaper, since `projMatrix · viewMatrix · vec4(worldExit,1) ≡ projMatrix · vec4(viewExit,1)` and the view matrix is a rigid transform (no scale) so directions survive it.

### 3.2 (1) THE CORRECT SAMPLING — the TSL formulation

Two variants. **Variant A is the recommendation** (§4); Variant B is the igloo-exact upgrade.

#### Variant A — origin-registered perspective map into the existing subject-only RT

Because our RT contains **only the mark** (igloo's contains the whole scene), we do not need the RT to be screen-sized: we need the fragment→uv map to be the *same* projective map that put the mark on screen, re-centred on the mark and normalised by its extent. That is achievable against a 512² ortho RT rendered **once**.

```ts
// --- imports to add from three/tsl: modelScale, modelViewPosition
const uMarkThick = uniform(MARK_THICKNESS);      // crystal units — DECOUPLED from uThickness
const uMarkHalf  = uniform(MARK_WORLD_HALF);     // crystal units mapped to uv 0..1 half-extent
const uMarkFlipY = uniform(MARK_FLIP_Y);         // +1 or -1, see §3.6

// igloo's getVolumeTransmissionRay, view space, our own refractDir:
//   thickness is LOCAL, so scale by the model matrix's rotation-independent scale
const mScale   = modelScale.y;                                   // group scale is uniform
const refrV    = refractDir(I, Nj, inv);                         // already normalized
const exitView = vPosView.add(refrV.mul(uMarkThick.mul(mScale))).toVar();

// project BOTH the exit point and the mark's centre (= the mesh origin) — the
// difference is what kills the along-ray component exactly, as in igloo.
const ndcE = cameraProjectionMatrix.mul(vec4(exitView, 1.0)).toVar();
const ndcO = cameraProjectionMatrix.mul(vec4(modelViewPosition, 1.0)).toVar();
const dNdc = ndcE.xy.div(ndcE.w).sub(ndcO.xy.div(ndcO.w)).toVar();

// half-extent of the mark's frame, in NDC, at the mark's own depth.
// SAFE FORM (no matrix element indexing — project a second point instead):
const ndcH = cameraProjectionMatrix
  .mul(vec4(modelViewPosition.add(vec3(uMarkHalf.mul(mScale), uMarkHalf.mul(mScale), 0.0)), 1.0)).toVar();
const halfNdc = ndcH.xy.div(ndcH.w).sub(ndcO.xy.div(ndcO.w)).toVar();  // (hx, hy)

const markUv = dNdc.div(halfNdc.mul(2.0)).mul(vec2(1.0, uMarkFlipY)).add(0.5).toVar();
```

The **fast form**, if `cameraProjectionMatrix[0].x` / `[1].y` element access is confirmed to compile on both backends (igloo and three's own TSL both index matrix nodes — `modelMatrix[0].xyz`, `three.webgpu.js:24431`):

```ts
const P = cameraProjectionMatrix;
const halfNdc = vec2(P[0].x, P[1].y).mul(uMarkHalf.mul(mScale)).div(ndcO.w);
```

**The property that makes this the right answer** — substitute and everything cancels:

```
markUv − 0.5  =  [ T·sin δ · (lateral unit) · P/(−z) ] / [ 2 · uMarkHalf · mScale · P/(−z) ]
              =  uMarkThick · sin δ / (2 · uMarkHalf)
```

`modelScale`, camera depth, fov, viewport size and DPR **all cancel**. The displacement is a pure function of `uMarkThick / uMarkHalf` and the facet's deviation angle — one dimensionless knob, resolution-independent, viewport-independent, scroll-independent. The base map is the projective identity re-centred on the mark, exactly as in igloo.

**The lod law, igloo verbatim** (`applyIorToRoughness` = `rough·clamp(2·ior−2,0,1)`, at ior 1.18 the factor is 0.36 — already folded into `MARK_LOD_K = 0.36`, `crystalConfig.ts:899-902`). Keep `markLod = roughEff.mul(Math.log2(MARK_RT_SIZE) * MARK_LOD_K)` unchanged (`crystalBuild.ts:1233-1234`) — it is already correct and the frost veins already modulate it. Only note that under Variant B `MARK_RT_SIZE` must become the RT's live width.

**Sample count.** Replace the 9 mark taps with **one**:

```ts
// mark: ONE tap, at the k=0 (red) coords, all channels
const mark = markBase.sample(markUv).level(markLod);   // .rgb
```

Rationale, concrete: the ladder's per-channel ior spread produces a coloured fringe whose width equals the dispersion offset. On a chunky, mass-legible subject that is a nice fringe; on hairline strokes it splits every stroke into three offset coloured copies — the exact opposite of legibility. The backdrop keeps all 9 taps (it *wants* dispersion); the mark takes 1. Saves 8 texture fetches per fragment and is strictly better for the goal.

**Everything downstream is unchanged**: still additive into `trans` **pre** `uBodyDarken` (`:1272-1283`), so the mark keeps riding the dark-glass multiply, the per-patch value jitter and the frost density veining. The whole 8-H/8-I gain arithmetic on `MARK_GAIN` (ordering tie at 0.82 against the brightest frost vein, bloom head-room, sampling loss) survives untouched, because the *compositing* is untouched.

#### Variant B — igloo-exact: full-viewport, camera-rendered RT

Identical shader math, minus the origin registration:

```ts
const ndcE = cameraProjectionMatrix.mul(vec4(exitView, 1.0));
const markUv = ndcE.xy.div(ndcE.w).mul(0.5).add(0.5).mul(vec2(1.0, uMarkFlipY)); // + flip per §3.6
```

and the RT becomes a **camera-aligned render of the mark at its true on-screen position** (§3.3). This is what buys real 3D tumble of the mark inside the ice and true perspective foreshortening — at the cost of a per-frame RT render (§3.4).

### 3.3 (2) WHAT THE RT MUST CONTAIN — camera / viewport / matrix setup

#### Under Variant A: **nothing changes in `crystalMarkRT.ts`.**

Today's rig is already correct for it: a 512² mipmapped HalfFloat RT, transparent-black clear, a `MeshBasicMaterial` mark, an `OrthographicCamera(-1.15, 1.15, 1.15, -1.15, 0.1, 10)` at `(0,0,5)` looking down −Z (`crystalMarkRT.ts:91-117`). Handedness matches the main camera (also looking down −Z), so the RT image is *not* mirrored. `MARK_SPIN = 0` ⇒ **the RT still renders exactly once per session**; per-frame cost stays literally zero.

The one design consequence, stated plainly: under Variant A the mark is **screen-upright** — it does not tumble in 3D with the stone. Given §2.2's table (the stone's local frame swings to 90° off the view axis inside a normal scroll pass), a tumbling logo is unreadable at most scroll positions by construction. Screen-upright is what "the logo is clearly visible" actually requires. If the owner wants the tumble back, it is one flag:

```ts
// optional, in the existing render(gl, t): copy the crystal mesh's tumble into the RT scene
if (MARK_TUMBLE) { mesh.quaternion.copy(crystalMeshQuaternion); dirty = true; }
```

which turns the RT into a per-frame **512²** render — one clear + one draw + mip gen, ~0.05 ms, still nothing.

#### Under Variant B: the RT must be driven per frame

```
RT size          = (size.width, size.height) × MARK_RT_DPR (recommend 0.5)
                   resized from useThree(state => state.size)
camera           = THE MAIN CAMERA, passed straight in — gl.render(markScene, camera)
                   (no aspect/fov/matrix maths of our own; using a copy invites drift
                    because SignatureLine writes the camera every frame)
mark mesh matrix = the CRYSTAL MESH's world matrix × the mark's local scale
```

Because the crystal is camera-locked to a band rect (`CrystalCluster.tsx:482-490`: `group.position` set from `(cx − vw/2)·k, (ih/2 − cy)·k, −CAMERA_Z` rotated into camera space, `group.quaternion = camera.quaternion`, `group.scale = s`), the *correct and cheapest* way to place the RT mark is **not** to recompute any of that — it is to inherit it:

```ts
// in crystalMarkRT.render(gl, camera, crystalMeshWorldMatrix)
markScene.matrixWorldAutoUpdate = false;
markMesh.matrixAutoUpdate = false;
markMesh.matrixWorld.copy(crystalMeshWorldMatrix).multiply(markLocalMatrix); // scale/offset inside the stone
markMesh.matrixWorldNeedsUpdate = false;
markMesh.frustumCulled = false;
const prev = gl.getRenderTarget();
gl.setRenderTarget(rt); gl.clear(true, false, false);
gl.render(markScene, camera);          // <- the MAIN camera, unmodified
gl.setRenderTarget(prev);
```

`crystalMeshWorldMatrix` = `meshRef.current.matrixWorld`, already up to date at the point where `rig.render()` is called (`CrystalCluster.tsx:643-644`) *provided* the call is moved to **after** `group.position/quaternion/scale` and `mesh.rotation` are written and `group.updateMatrixWorld(true)` is forced (R3F updates world matrices during its own render, i.e. at priority 1 — too late). This is the single most likely implementation bug in Variant B; force the update explicitly.

Correctness across viewport sizes and scroll positions is then automatic: the RT is rendered with the same camera and same projection as the frame, so the mark's RT texels sit at the same NDC as the mark's true screen position, and `ndcE/w·0.5+0.5` indexes them exactly. No per-frame uniform bookkeeping at all.

### 3.4 (3) COST + WALLS

| | today | Variant A | Variant A + tumble | Variant B |
|---|---|---|---|---|
| RT size | 512² HalfFloat + mips (≈0.7 MB) | **unchanged** | unchanged | `0.5×viewport` RGBA16F ≈ 4.1 MB @1080p |
| RT cadence | **once per session** | **once per session** | every visible frame | **every visible frame** |
| per-frame GPU | 0 | **0** | 1 clear + 1 draw (512²) + mip gen ≈ 0.05 ms | 1 clear + 1 draw (960×540) + mip gen ≈ 0.1–0.3 ms |
| fragment bindings on the crystal material | 1 texture + 1 sampler | **unchanged** | unchanged | unchanged |
| mark texture taps / fragment | **9** | **1** | 1 | 1 |
| extra ALU / fragment | — | +2 mat4·vec4, +2 divides (hoistable: `ndcO`, `halfNdc` are fragment-invariant per draw) | same | +1 mat4·vec4, +1 divide |
| new uniforms | — | 3 (`uMarkThick`, `uMarkHalf`, `uMarkFlipY`) | +1 | 2 |

**Walls check.** `src/webgl/gpgpu/gpgpuNodeSim.ts` documents the tight device budgets — *storage buffers* (the text-morph compute kernel sits at its **8-of-8** wall, `:1028`, `:1116-1117`) and the *vertex-buffer / read-only-storage* render budgets (`:12-37`, `:358-361`, `:515`). **None of them are touched here**: the crystal is a `MeshBasicNodeMaterial` with no compute, no storage, no instanced attributes; its only binding pair is the mark texture + sampler (`crystalBuild.ts:1221-1224`), and every variant keeps that at exactly one pair (all taps are `.sample()` clones of one base `TextureNode`). Uniforms live in the separate, roomy budget (`gpgpuNodeSim.ts:358-361`).

**Gates unchanged**: healthy + full tier + true-WebGPU only (`CrystalCluster.tsx:265-276`), cull-window gated by the early return at `:439-442`, `MARK_RT_WEBGL2 = false` until the `?backend=webgl2` proof lands.

**Cadence honesty**: the task asks what the *real* cadence is under screen-space sampling. For **Variant B it is every visible frame** — the camera moves (SignatureLine writes it), the group moves with scroll, the mesh tumbles, and there is a permanent idle wobble (`WOBBLE_AMP 0.1, WOBBLE_FREQ 0.3`, `crystalConfig.ts:669-670`) that never lets a dirty-check settle. For **Variant A it stays once per session**, because the RT is a subject-local ortho image and all the camera/placement dependence lives in the shader's projection instead. That asymmetry is the main reason Variant A is the recommendation.

### 3.5 (4) LEGIBILITY ENGINEERING — concrete numbers

**The one knob that matters: `MARK_THICKNESS`, decoupled from `CRYSTAL_THICKNESS`.** Today the mark's offset rides `thickEff·REFR_OFFSET_SCALE = 2.0·0.45 = 0.9` crystal units, which also drives the procedural backdrop. Under Variant A the displacement is exactly `uMarkThick·sin δ /(2·uMarkHalf)` uv; with `uMarkHalf = 1.15` (= `MARK_RT_FRAME`) and `1 uv = 2.3 crystal units = 4.37 world = 351 px` at a 1440×900 viewport:

| `MARK_THICKNESS` | δ = 5° | δ = 13° | δ = 20° | verdict for a thin-stroked logo |
|---|---|---|---|---|
| 0.9 (today's effective) | 12 px | 30 px | 47 px | strokes still break between patches |
| **0.50** | 6.6 px | 17 px | 26 px | reads; visible ice-swim |
| **0.35** | 4.6 px | 12 px | 18 px | **recommended default** — clearly legible, still refracted |
| 0.15 | 2.0 px | 5 px | 8 px | reads like a decal, ice character lost |

(Mark height on screen at `uMarkHalf = 1.15`: `0.87 uv ≈ 305 px`, i.e. ~60 % of the 507-px stone.) Physical justification, so this is not a fudge: the mark is an **inclusion near the stone's mid-depth**, not the far wall — a shorter transmission ray is the *more* correct model for it, and igloo's `uThickness = 2` is calibrated to a subject that fills its cube.

**Size vs the stone.** `uMarkHalf = MARK_RT_FRAME = 1.15` makes 1 mark unit = 1 crystal unit, so the 2-unit-tall normalized mark is 2 of the stone's 3.32 units = **60 % of the silhouette height**, fully contained with margin — versus today's 119 % (cropped). Lower `uMarkHalf` = bigger mark. Keep it at ≤0.75 of the silhouette so the ±displacement never pushes strokes past the edge, where the `Discard(alpha < 0.05)` (`crystalBuild.ts:1504`) would clip them mid-stroke.

**Solid silhouette vs geometry.** The round-8-I finding stands on its own merits and is *independent* of the sampling fix: a hairline geometric mark loses to any per-patch displacement, a chunky solid mass does not (igloo's penguin is legible by mass and shading). Three graded options, cheapest first:

1. **Dilate in the RT (no new asset).** Render the mark mesh **twice** into the 512²: once at scale 1.06 with `MARK_COLOR` at ~0.3 gain (a halo), once at 1.0 at full gain. Cost: one extra draw in a render-once pass. Gives every stroke a soft shoulder that survives a 10–20 px displacement.
2. **Solid-silhouette variant of the mark** (filled counters, heavier weight, no hairlines) authored as a second GLB used only by the RT. Doc-comment on `MARK_GAIN` already names this as option (b); the RT rig, bindings, lod law and `MARK_RT_*` are all unchanged by it.
3. Keep the geometry as-is and accept a soft luminous presence (option (a) in that comment).

**Emissive / backlight.** Keep the current contract: unlit `MeshBasicMaterial`, `toneMapped = false`, `MARK_COLOR #D8F4FF` at lum 0.865, **≤1.0 so the mark itself can never trip the ≈1.0 selective-bloom threshold** (`crystalConfig.ts:787-790`, `crystalMarkRT.ts:114-117`). Do **not** add a real light or a rim: the additive-pre-`uBodyDarken` placement already gives the "lit from inside" read, and the whole 8-E/8-H value budget is built on it. `MARK_GAIN` stays 0.70 with a live A/B ceiling of 0.82 (frost-vein ordering tie, `crystalConfig.ts:830-838`) — **that arithmetic is unaffected by this change** because compositing is unchanged; but note the *sampling-loss* clause (check 3, `:843-847`) improves: with one tap instead of a 3-way ladder spread at `Δuv ≈ 0.024`, the realistic contrast floor rises from 2.42:1 back toward the full 3.03:1.

**The dispersion question, answered:** yes — **the ladder should sample the mark ONCE and let the 3-sample dispersion apply only to the backdrop** (§3.2). This both fixes chromatic stroke-splitting and removes 8 texture fetches.

### 3.6 The y-flip trap — flag it, do not guess

three 0.184's own TSL flips y when sampling the transmission source on WebGPU (`three.webgpu.js:24531`, `:24555`, commented `// webgpu`), because it samples a *framebuffer copy* (`viewportMipTexture`). Igloo, on WebGL against its own RenderTarget, does **not** flip (`igloo-app3d.pretty.js:37884-37886`). We sample **our own `RenderTarget.texture`**, which on both three backends keeps the NDC-consistent origin — so the expected value is **no flip**. Ship it as `MARK_FLIP_Y = 1` with a one-line dev-handle toggle and settle it in a single browser pass; it is a 30-second visual check (mark upside-down or not) and a 30-minute debug if left implicit.

---

## 4. Options ranked, and the recommendation

Ranked by (owner's goal: **the logo is clearly visible**) × cost.

| # | option | logo clearly visible? | igloo-faithful? | cost | risk |
|---|---|---|---|---|---|
| **1** | **Variant A** — origin-registered perspective map + existing 512² render-once RT, `MARK_THICKNESS 0.35`, 1 mark tap, RT dilate | **Yes** — identity base map, 5–18 px swim on a 305-px mark | Yes: refract → exit point → project → sample, verbatim; only the RT's *frame* differs (subject-local instead of full-screen, legitimate because our RT holds only the subject) | **~0 GPU**; +3 uniforms; −8 taps/fragment; RT untouched | Low. Two traps: y-flip (§3.6), matrix element indexing (use the safe form) |
| 2 | **Variant B** — igloo-exact full-viewport RT rendered per frame with the main camera | Yes, plus true 3D tumble + perspective of the mark | Exact | +4.1 MB RT, 0.1–0.3 ms/frame, forced `updateMatrixWorld`, RT resize plumbing | Medium: matrix-timing bug (§3.3), DPR/resize, y-flip |
| 3 | **Additive inclusion decal** — mark mesh drawn *after* the crystal (renderOrder −2.5), `AdditiveBlending`, `depthTest:false, depthWrite:false`, inside the group, soft radial falloff | Guaranteed | No — no refraction at all | 1 draw call, no RT, no shader change | Low, but reads as a decal/hologram pasted on the ice, not an inclusion |
| 4 | **Mark as a real mesh inside the crystal, drawn before it** | **No** — `CRYSTAL_ALPHA = 0.94` (`crystalConfig.ts:630`) lets only **6 %** of it through; `material.depthWrite = true` (`crystalBuild.ts:1514`) depth-rejects it if drawn after | — | cheapest | **Rejected on the arithmetic** — this is the "cheapest way to guarantee legibility" the task asks me to assess honestly, and on our compositing contract it does not work |
| 5 | Status quo + more gain | No (measured twice: 0.35→2.4 on the old mesh, 0.7→1.1 on the slab) | No | 0 | — |

### RECOMMENDATION: **Option 1 (Variant A)**, with option 2 held as an upgrade if the owner wants the mark to tumble in 3D, and option 3 as the guaranteed fallback if 1 disappoints in the browser.

**Why not 2 first:** 1 and 2 share the *identical* shader mechanism and the identical fix to the defect; 2 only adds real 3D tumble and perspective foreshortening of the mark — and §2.2 shows the tumble reaches 90°, at which any logo is illegible regardless of how correct the refraction is. 1 costs nothing and answers the owner's actual sentence. If it lands, 2 is a one-file upgrade from there.

### Step list for an implement agent

1. **`crystalConfig.ts`** — add `MARK_THICKNESS = 0.35` (crystal units, dev-tunable 0.15–0.9), `MARK_WORLD_HALF = 1.15` (dev-tunable 0.7–1.6, lower = bigger mark), `MARK_FLIP_Y = 1`. Mark `MARK_COORD_SCALE` and the mark's use of `REFR_OFFSET_SCALE` as **removed**, with the §2 derivation in the doc-comment so the history survives. `MARK_GAIN` stays 0.70; add a note that the sampling-loss clause (check 3) improves under a single tap.
2. **`crystalBuild.ts`** — import `modelScale`, `modelViewPosition` from `three/tsl`. Add `uMarkThick`, `uMarkHalf`, `uMarkFlipY` next to `uMarkGain`/`uMarkScale` (`:902-903`) and expose them on the returned uniforms object (`:1547-1548`) so the dev handle (`__sersanCrystal_healthy.uniforms`, `CrystalCluster.tsx:812`) can A/B them live.
3. **`crystalBuild.ts`, the ladder (`:1211-1283`)** — leave the backdrop path *entirely alone* (it keeps `base = vLocal.xy·0.4`, the 3-sample dispersion, `REFR_OFFSET_SCALE`). Lift the mark out of the loop: compute `exitView / ndcE / ndcO / halfNdc / markUv` once (§3.2 Variant A, safe form), take **one** `markBase.sample(markUv).level(markLod)`, and add `mark.rgb · uMarkGain` into `trans` at exactly the current site (`:1272-1283`), pre-`uBodyDarken`. Delete `mAccR/G/B`.
4. **`crystalMarkRT.ts`** — no change required. Optionally add the §3.5 dilate: a second `Mesh` on the same geometry at `scale 1.06` with a second `MeshBasicMaterial` at ~0.3 × `MARK_COLOR`, added to the micro-scene *before* the main mesh. Still render-once.
5. **QA, single browser pass, healthy band, WebGPU:** (a) is the mark upside-down? → flip `MARK_FLIP_Y`; (b) scroll the band from `a = −0.5` to `+0.5` and confirm the mark stays put and readable at **every** position (this is the whole point — under the old scheme it degrades away from centre, §2.2 table); (c) A/B `uMarkThick` 0.9 → 0.5 → 0.35 → 0.15 and let the owner pick the ice-swim; (d) A/B `uMarkHalf` 1.15 → 0.9 for size; (e) confirm no bloom star on the mark (`uMarkGain ≤ 0.82`); (f) confirm the frame cost is unchanged (RT `renders` counter should stay at 1).
6. **Only if step 5 shows the ortho RT's lack of perspective** — promote to Variant B per §3.3, remembering the forced `group.updateMatrixWorld(true)` before `rig.render()`.

---

## Caveats / Not verified

- **Not run in a browser.** Every number here is derived from source + config at HEAD. The viewport-dependent figures assume a 1440×900 canvas (`ih = 900`, `rect.h ≈ ih`, `rect.w ≈ vw`, `scaleMul ≈ 1`); the *ratios* (uv fractions, % of stone height) are viewport-independent by the cancellation in §3.2, the pixel figures are not.
- **The local-Z tilt angles in §2.2** were computed with an approximate composition of three's XYZ Euler order; they are accurate to a few degrees, which does not affect the conclusion (the map degenerates well before `a = ±0.79`).
- **`sersan-mark.glb` triangle count not measured** (15 KB file; assumed 1–3 k tris). Irrelevant to Variant A (render-once); relevant only to Variant B's per-frame draw, where it is still negligible.
- **Matrix element indexing on TSL nodes** (`cameraProjectionMatrix[0].x`) is used by three's own transmission code on matrix nodes (`modelMatrix[0].xyz`), but I did not verify it compiles for `cameraProjectionMatrix` specifically on the WGSL backend. The safe form in §3.2 avoids it entirely — prefer it, measure, then optimise.
- **The y-flip** is reasoned, not measured (§3.6). Ship it behind a flag.
- **`MARK_COORD_SCALE`'s doc-comment** ("sizes the mark to ~0.9 crystal units inside the body") does not follow from the mapping it documents; §2.3 derives ~3.95 crystal units (cropped). Worth a second pair of eyes before the constant is deleted, in case the comment encodes an intent I have not reconstructed.
- **Not assessed:** whether the plexus (renderOrder −2) or the fog quad (−4) interact with any of this. They do not touch the mark path, but option 3 (the decal) would sit between them and needs an ordering decision.
