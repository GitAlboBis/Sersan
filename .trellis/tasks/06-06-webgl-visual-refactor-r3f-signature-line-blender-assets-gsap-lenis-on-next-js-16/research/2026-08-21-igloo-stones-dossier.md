All mining targets located. Here is the dossier.

---

# IGLOO "3D STONES" DOSSIER
Source: `C:\Users\alber\AppData\Local\Temp\claude\C--Users-alber-Desktop-sersan-v2-main\5042dfcb-dc07-4454-a8cc-9bef33d8c714\scratchpad\igloo-app3d.pretty.js` (45,006 lines)
Key classes: `aF` = cubes scene (L39231), `nF` = one cube (L39009), `WL` = ice material (L37666), `jL`/`JL` = frost "fluid" (L38606/38514), `KL`+`YL`/`qL`/`XL` = callouts (L38479/38023/38151/38281), `k3` = bg (L35446), `rF` = background shapes (L39120), `lF`/`cF` = floating shattered-ring rocks (L39442/39599), `falloffsmooth` (L25961, GLSL twin at L22983).

## 1. GEOMETRY & LAYOUT
- Cubes are **authored Draco meshes**, not procedural: `zt.load("cubes/${obj}.drc")` â€” `cube1/cube2/cube3` (one per portfolio company, config at L32091: Pudgy Penguins / Overpass / Abstract, each with `temp`, `date`, `innerobject`). Each has a **second UV set `uv1`** (non-overlapping unwrap) for the frost RT, plus `_roughness.ktx2` and `_normal.ktx2` maps. BVH (`three-mesh-bvh`) built per cube for fast raycast (`firstHitOnly = true`).
- Layout: 3 cubes stacked vertically, `verticalOffset: -5.75` â†’ cube *i* at `y = (1+i) * -5.75`; camera at `(0,0,5)`, fov 45, scrolls down: `camera.y = initial + (count+1)*(-5.75)*progress`. Cube size â‰ˆ 2â€“2.5 units (smoke billboard is 2.5Ã—3.5; plexus radius = `boundingSphere.radius * 0.9`).
- Per cube group: `mesh` (ice), `mesh3` (inner logo object, textured `MeshBasicMaterial`, **only visible in the refraction pass**), `mesh2` (smoke billboard), `plexus` (18 drifting points + line connections), `texts` (callouts).
- The floating **rocks** (intro scene) are Draco `shattered_ring.drc`/`shattered_ring2.drc` â€” pre-fractured meshes with per-fragment `centr` (fragment centroid) and `rand` (vec3) attributes; 3 rings stacked 2.5 apart (L39606-21). The cubes scene's drifting shards use `background_shapes.drc` with `centr` + `primrand` (L39145-47).

## 2. THE ICE MATERIAL (class WL, `new WL(3)` â†’ AWESOME_SAMPLES=3)
Base `MeshPhysicalMaterial` values (L39028): `color #e0e8ef, roughness .65, ior 1.18, reflectivity .3, envMapIntensity .91` (EXR env `cubes_env.exr`), `transmission 0` â€” transmission is done by a **custom chunk replacement**, uniforms `uTransmission:1, uThickness:2, uAttenuationDistance:0, uChromaticAberration:.1, uColorFrost:#83a1c5`.

**Two-pass fake transmission** (aF.update, L39304-09): pass 1 â€” material `side=BackSide`, `tTransmissionSamplerMap = bg.png` (static, samplerSize 4Ã—4), inner logo visible, whole scene rendered into `_transmissionRT` (mipmapped). Pass 2 â€” `side=FrontSide`, `tTransmissionSamplerMap = _transmissionRT.texture`. So front faces refract an image that already contains the refracting back faces + the logo inside â†’ double refraction for one scene render.

**Dispersion loop** (verbatim, L37913-46) â€” blue-noise-jittered IOR/thickness ladder, 3 samples:
```glsl
float thickness_smear = uThickness * pow(roughnessFactor, 0.33);
vec4 noise  = getNoise(tBlue, gl_FragCoord.xy, uBlueOffset);           // blue-8-128-rgb.ktx2, uBlueOffset randomized every frame
vec3 distortionNormal = roughnessFactor * roughnessFactor * 2.0 * normalize(noise2.xyz) + mousefrost * 0.025;
vec3 sampleNorm = normalize(n + distortionNormal);
for (float i = 0.0; i < 3.0; i ++) {
  transmissionR = getIBLVolumeRefraction2(... material.ior,                                             uThickness + thickness_smear * (i + noise.g) / totalSamples ...).r;
  transmissionG = getIBLVolumeRefraction2(... material.ior * (1.0 +       uChromaticAberration * (i + noise.r) / totalSamples), uThickness + ... ).g;
  transmissionB = getIBLVolumeRefraction2(... material.ior * (1.0 + 2.0 * uChromaticAberration * (i + noise.b) / totalSamples), uThickness + ... ).b;
  transmitted.rgb += vec3(transmissionR, transmissionG, transmissionB);
}
transmitted /= 3.0;   ...   totalDiffuse = clamp(transmitted.rgb, 0.0, 1.0);
```
`getIBLVolumeRefraction2` is stock three.js volume refraction (refract ray â†’ project exit point â†’ sample screen texture) but with `getTransmissionSampleCheap` (plain `textureLod`, lod = `log2(size)*applyIorToRoughness`) and `volumeAttenuation` short-circuited to `vec3(1.0)`. Roughness blur therefore comes from the RT mip chain + the noise-jittered `distortionNormal`, giving frosted-glass grain instead of smooth gaussian. Frost overlay: `roughnessFactor *= 1.0 - mousefrost`, `mapN.xy *= 1.0 - mousefrost` (frost = polished window), emissive rim `totalEmissiveRadiance += mousefrostrim * uColorFrost` plus a tiling triangle sparkle texture: `triangles * mousefrostrim * 10.0 + triangles * pow(mousefrost, 2.0)` (L38007-13). Bloom on top: `levels 6, luminanceThreshold .2, intensity 1, radius .85`.

## 3. MOTION
- **Scroll tumble** (nF.update, L39099-117): with `a = centeredProgress - progress` and deterministic per-cube signs/rands: `rotation.y = 11*l*(1-d)*a + v; rotation.x = 14*c*(1-u)*a + y; rotation.z = 6*h*(1-f)*a + S` â€” cubes spin themselves upright as they reach screen center, tumble away multi-revolution as you scroll past.
- **Idle float** is rotational wobble only: `v = Math.sin(Fe.time * 0.3 + rand*12.423) * 0.1 * additionalRotationAmount * Math.sign(rand-.5)` per axis (amp 0.1 rad, freq 0.3). Camera adds life: mouse displacement `(.1,.05)`, shake `.02`, and speed-FOV `camera.fov = 45 - 5*|scroll.velocity|`; detail-open dollies `cameraZoom` to âˆ’3.5.
- **Frost "fluid" smear** â€” not Navier-Stokes: a 512Â² ping-pong RT wave sim (`JL`, L38545-99): noise advection (`advect.png`), 4-neighbor **max** propagation, capsule **line splat** between prev/current hit UV (`radius = 0.05*smoothstep(.1,1., uSplatRadius)`, `splat = cubicIn(1 - line(...)/radius)`), damping `*0.985`; `g = rim = nextVal - previous`. Splat coords come from BVH raycast **uv1** of the hit (`onMouseMove: this.splatPosition.copy(t.uv1)`); velocity smoothing at L38675. Applied to the cube purely through `texture2D(tMouseFrost, vUv1).rg` â†’ roughness/normal suppression + rim emissive (above). It also drives audio (`soundVelocity` â†’ "shard" volume).
- **Rock float/fade** (lF vertex, L39489-537): per-fragment explode + drift using camera distance:
```glsl
float dist = distance(cameraPosition, translation);
vFalloff = falloffsmooth(dist, 14.0, 2.0, 13.0, 0.75);
pos = rotate3D(pos - scaledCentr, normalize(rand*2.-1.), angle) + scaledCentr;   // per-shard tumble
pos += centr * glowFalloff * mix(0.075, 0.15, rand.z);                            // radial "breathing" apart
pos += rand.y * centr * glowFalloff * sin(rand.x*5. + time*0.5 + (centr.x+centr.y+centr.z)*15.) * 0.05; // idle sine drift
float spinFalloff  = falloffsmooth(dist, 8.0, 2.0, 5.0, 0.5);
float spinFalloff2 = falloffsmooth(dist, 10.0, 2.0, 8.0, 0.5);
pos.xz = rotate(pos.xz, spinFalloff * 3.14159 * 0.3);  pos.xy = rotate(pos.xy, ...);
vFade = falloffsmooth(dist, 2.0, 16.0, 9.0, 0.5);
```
`falloffsmooth(x, from, to, margin, progress)` = `smoothstep(edge+margin*sign(to-from), edge, x)` with `edge = mix(from - margin*sign, to, progress)` (L25961) â€” a progress-scrubbing smoothstep window.

## 4. CALLOUTS (all WebGL, zero DOM)
Three elements per cube (`KL`): **title + leader line** (`YL`), **date/"CLICK TO EXPLORE"** (`qL`), **TEMP readout** (`XL`). MSDF text meshes (IBM Plex Mono data-texture atlas) with a `billboardModelMatrix()` vertex path, `depthTest:false, renderOrder 999`, added to a scene-level `textsGroup`. Anchors are cube **bounding-box lerp points pushed through the cube's world matrix** â€” e.g. title anchor `El.set(mix(min.x,max.x,.35), mix(max.y,min.y,.15), mix(min.z,max.z,.93)); El.applyMatrix4(mesh.matrixWorld)` â€” so the line endpoint rides the tumbling stone. Leader lines are plain `LineSegments` grown along camera-frame axes `_LEFT`/`_UP` (recomputed each frame from camera basis, L39304): elbow at `anchor + LEFT*-.3 + UP*.3`, then horizontal run `*-.5`, drawn progressively by lerping with `animationProgress` (L38141-45). Visibility gates on scroll offset windows (`t` = centeredProgress âˆ’ progress): title `fit(t,-1.6,.5)`, date `fit(t,-.6,1.25)`, temp `fit(t,-1.2,.5)` â€” with a 0.2s hide / 0.4s reveal tween plus a random beep. Text scramble-in: `vUv.x = mod(uv.x + 0.125 * mod(floor((1.0 - tr2) * 5.753), 8.0), 1.0)` â€” glyph-atlas column shuffling as `uShow2` sweeps, weighted per-character by a `textWeights` attribute. TEMP is a digit-quad strip with an `isNum` int attribute indexing a 10-column numbers atlas; live value `temp = targetTemp + sin(time*.05+rand)*2`, split into Â°C/Â°F digits every frame (L38459-76).

## 5. FOG / BACKGROUND INTEGRATION
No THREE.Fog anywhere â€” "fog" is composited per-material:
- Cubes scene bg (`k3`): fullscreen triangle, `#c9d0df â†’ #545b6b` perlin duo-octave mix scrolled by `uProgress`, plus a dot-matrix twinkle layer and blue-noise dither `color += noise.rgb * 0.05` (L35515-47). The ice refracts this bg via the RT, so stones inherently sit "in" it.
- Rocks depth fade (`lF` fragment, L39560-73) â€” the mined **vFade mix**:
```glsl
vec2 screenUv = gl_FragCoord.xy / resolution;
float diagonalGradient = (screenUv.x + screenUv.y) * 0.5;
diagonalGradient *= sinenoise1(vec3(screenUv, time * 0.614)) * 0.5 + 0.5;
diagonalGradient *= sinenoise1(vec3(screenUv * 2.0, time * 0.17)) * 0.5 + 0.5;
vec3 bg = mix(uColor1, uColor2, diagonalGradient) * 1.1;   // #6a6f7d â†’ #e1e6f1
color = mix(bg, color, vFade * 0.95);                      // vFade = falloffsmooth(dist, 2., 16., 9., .5)
```
i.e. distant rocks are literally repainted with the animated background gradient (opaque pass, no blending) â€” perfect grey-fog swallowing with zero transparency sorting. Near-camera glow adds `tGlow(AO) * vec3(0.5,0.7,1.0) * noise * glowFalloff * camFactor` (icy blue). DoF is not a real DoF on the stones: softness comes from the RT mip blur + bloom.

## TRANSPLANT PLAN â€” SERSAN crystalline shards (R3F / WebGPU-TSL, navy/cyan, no textures)
1. **Geometry, procedural (no textures, no GLB required):** `IcosahedronGeometry(1, 24)` displaced by 2-octave `mx_fractal_noise_float(positionLocal * 1.6)` scaled ~0.25, then `positionLocal.mul(vec3(1, 1.45, 0.85))` for a shard silhouette; `computeVertexNormals()` (or TSL normal recompute via cross of dFdx/dFdy for the low-poly faceted look â€” use `flatShading: true`, facets sell "crystal" better than smooth). **Broken mode** = pre-fracture in code: 6â€“10 clones of a wedge (tetra/low-poly convex hulls), each with a `centr` instance attribute = its offset from cluster center, exploded by igloo's exact recipe: `pos += centr*(gap + rand.y*sin(rand.x*5 + time*0.5)*0.05)` + per-shard `rotate3D(posâˆ’centr, axis(rand), angle)`. **Healthy mode** = same cluster with gapâ†’0 (shards seal into one intact crystal) â€” animate one uniform `uFracture` 0â†’1; you get the break/heal transition for free.
2. **Material:** start with drei `MeshTransmissionMaterial` (it already implements the same buffer+chromaticAberration idea) tuned to igloo numbers: `ior 1.18, roughness .55â€“.65, thickness 2, chromaticAberration .1, samples 3, anisotropicBlur ~0.5, color #dfe9f4â†’ navy-tinted #cfe2f0, background = scene RT`. If staying on the WebGPU/TSL path, port the mined loop directly: 3 iterations, per-channel `ior * (1 + k*uCA*(i+blueNoise)/3)` with `k = 0, 1, 2`, thickness smear `uThickness * pow(roughness, .33)`, normal jitter `roughnessÂ² * 2 * normalize(blueNoise.xyz)` â€” blue-noise via a tiny generated 128Â² `DataTexture` (no asset). Skip Beer attenuation (igloo hard-returns `vec3(1)`).
3. **The refraction backdrop is the trick:** render the SERSAN navy gradient (procedural TSL: `#0B1422 â†’ #16233a` diagonal, noise-modulated like the mined `diagonalGradient`, cyan `#3BE1FF` accent bloom spots) into a mipmapped RT and feed it as the transmission buffer; optionally do igloo's two-pass (BackSideâ†’RT, FrontSideâ†’RT texture) to get internal double-refraction and let a small emissive "core" object (the intact-mode heart) be visible only through the glass.
4. **Motion:** copy the tumble grammar verbatim â€” `rotation = k_axis * (centeredProgress âˆ’ scrollProgress)` with k = (11, 14, 6)Â·sign(rand), settling to 0 when the shard is centered; idle wobble `sin(t*0.3 + seed)*0.1` per axis; fov `45 âˆ’ 5*|lenisVelocity|`. Depth-fade distant shards with `color = mix(bgGradient, color, falloffsmooth(camDist, 2, 16, 9, 0.5) * 0.95)` â€” this replaces fog and DoF in one line and matches the site's flat-navy ground.
5. **Hover:** the 512Â² ping-pong wave sim is ~30 lines of TSL/GLSL (max-neighbor + capsule splat + 0.985 damping) and needs only a `uv2`-style unwrap â€” on a procedural icosahedron use triplanar or spherical UVs instead of uv1; drive roughness-down + cyan rim-emissive (`#3BE1FF` in place of `#83a1c5`) exactly as mined. Broken mode can additionally push shards apart along `centr` by the frost value for a "react to touch" flinch.
6. **Callouts:** reuse the pattern with drei `<Billboard><Text/>` (JetBrains Mono, matching SERSAN's mono eyebrow style) + a 2-point `<Line>` from `bboxPoint.applyMatrix4(matrixWorld)` elbowed along camera `_LEFT/_UP`; gate visibility on the same centeredProgress windows and animate the scramble with the `mod(uv.x + 0.125*mod(floor((1âˆ’p)*5.753),8),1)` atlas trick (troika glyph atlas works).
7. **Blender-GLB alternative:** author one crystal in Blender (Ico sphere â†’ Cell Fracture add-on for the broken variant), bake nothing â€” just export both variants Draco-compressed, and write `centr` per fracture piece (piece median) + `rand` per piece into vertex attributes with a 5-line bpy script before export, matching igloo's attribute contract exactly. This buys art-directed silhouettes; everything else (material, motion, fade, frost) stays identical to the procedural path. Given the Blender MCP is already wired in this project, this is the low-risk path if the owner wants the exact "hero object" feel; the procedural path ships without any asset pipeline.

Performance notes: 3 dispersion samples Ã— 2 passes is the budget ceiling â€” igloo renders the transmission RT at low resolution and leans on mips; on mobile/`prefers-reduced-motion` drop to 1 sample, static backdrop, no wave sim (matches the existing non-WebGPU fallback strategy in this repo).