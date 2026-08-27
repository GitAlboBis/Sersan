# Dossier `web-codrops` — Codrops sweep: image/photo → particles, 3D face particles, GPGPU, depth maps, glyph/ASCII, contour lines

Scope: everything on tympanus.net/codrops relevant to (a) a volumetric particle head morphing between people, (b) matrix-style glyph rain, (c) flowing contour lines. Method: 25+ `site:tympanus.net` searches, article fetches, raw code pulled from the linked GitHub repos via curl. Only facts found in the sources are stated; where an article omits numbers this is said explicitly.

Verdict up front (why the SerSan portrait has holes): every Codrops photo→particle technique that *thresholds a colour photo* (Bruno Imbrizi 2019) inherently drops pixels by brightness — exactly the "bald scalp / forehead / cheeks vanish against a white wall" failure. The only Codrops article that achieves a Lusion-like volumetric head — **Phantom.land (June 2025)** — does NOT threshold: it uses a fixed 280×280 grid that always emits a particle, places Z from a **depth map**, and uses colour only to modulate **point size**. Background is excluded by depth (depth=0 → background) and by cropping the source, not by colour. That is the pattern to adopt.

---

## 0. Master index (all Codrops items found, most relevant first)

| # | Article | Author / date | Relevance |
|---|---|---|---|
| 1 | Invisible Forces: The Making of Phantom.land's Interactive Grid and **3D Face Particle System** — https://tympanus.net/codrops/2025/06/30/invisible-forces-the-making-of-phantom-lands-interactive-grid-and-3d-face-particle-system/ | Phantom Studios, 2025-06-30 | **Direct blueprint**: photo+depth map → 78,400-point volumetric face, morph A→B, curl noise, custom DoF |
| 2 | Interactive Particles with Three.js — https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/ | Bruno Imbrizi, 2019-01-17 | Canonical image→instanced-quad particles; brightness threshold (the "holes" anti-pattern), touch trail texture |
| 3 | Crafting a Dreamy Particle Effect with Three.js and GPGPU — https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/ | Dominik Fojcik, 2024-12-19 | GPGPU (GPUComputationRenderer) spring-back + mouse repel on a mesh-sampled face **mask** (demo 2 = "GPGPU Shining Mask – Venecia") |
| 4 | Simulating Life in the Browser: Living Particle System for UntilLabs — https://tympanus.net/codrops/2025/12/10/simulating-life-in-the-browser-creating-a-living-particle-system-for-the-untillabs-website/ | Bautista Berto (basement.studio), 2025-12-10 | Real photograph → point cloud → 16-bit position textures; fBM+curl motion; soft sprites; FBO + LUT post |
| 5 | Relighting Images with Depth Maps and Three.js — https://tympanus.net/codrops/2026/08/19/relighting-images-with-depth-maps-and-three-js/ | Dominik Fojcik, 2026-08-19 | TSL/WebGPU: depth map → normals → dynamic light (rim/relight of a flat portrait); depth from Depth Anything 3 |
| 6 | Implementing a Dissolve Effect with Shaders and Particles — https://tympanus.net/codrops/2025/02/17/implementing-a-dissolve-effect-with-shaders-and-particles-in-three-js/ | Jatin Chopra, 2025-02-17 | Mesh vertices → glowing edge particles, additive + UnrealBloom |
| 7 | Matrix Sentinels: Dynamic Particle Trails with TSL — https://tympanus.net/codrops/2025/05/05/matrix-sentinels-building-dynamic-particle-trails-with-tsl/ | MisterPrada, 2025-05-05 | TSL compute / `instancedArray`, 4D simplex flow field, position-history buffers (WebGPU, r16x) |
| 8 | Interactive Text Destruction with Three.js, WebGPU, TSL — https://tympanus.net/codrops/2025/07/22/interactive-text-destruction-with-three-js-webgpu-and-tsl/ | Lolo Armdz, 2025-07-22 | TSL compute spring physics (spring 0.05 / friction 0.9) with pointer radius; bloom |
| 9 | WebGPU Gommage Effect (MSDF text → dust & petals) — https://tympanus.net/codrops/2026/01/28/webgpu-gommage-effect-dissolving-msdf-text-into-dust-and-petals-with-three-js-tsl/ | Thibault Introvigne, 2026-01-28 | WebGPU: **no variable point size → use instanced quads/sprites**; MRT selective bloom |
| 10 | WebGPU Scanning Effect with Depth Maps — https://tympanus.net/codrops/2025/03/31/webgpu-scanning-effect-with-depth-maps/ | deadrabbbbit, 2025-03-31 | TSL depth-map scan line + dot grid (`tiling 120`) |
| 11 | How to Create a Fake 3D Image Effect with WebGL — https://tympanus.net/codrops/2019/02/20/how-to-create-a-fake-3d-image-effect-with-webgl/ | Yuri Artiukh, 2019-02-20 | 2.5D: `uv + mouse*depth.r` |
| 12 | Surface Sampling in Three.js — https://tympanus.net/codrops/2021/08/31/surface-sampling-in-three-js/ | Louis Hoebregts, 2021-08-31 | `MeshSurfaceSampler` → points on a mesh (15k / 30k) |
| 13 | Creating Audio-Reactive Visuals with Dynamic Particles — https://tympanus.net/codrops/2023/12/19/creating-audio-reactive-visuals-with-dynamic-particles-in-three-js/ | Tiago Canzian, 2023-12-19 | Curl-noise along normals, size by displacement, colour by distance |
| 14 | FBO Particles with Three.js — https://tympanus.net/codrops/2021/05/31/fbo-particles-with-three-js/ | Yuri Artiukh, 2021-05-31 | Video coding session (Visualdata cloud); code only in gist |
| 15 | Tropical Particles Rain Animation — https://tympanus.net/codrops/2021/03/17/tropical-particles-rain-animation-with-three-js/ | Yuri Artiukh, 2021-03-17 | Image drives ~10k CPU rain particles (video session) |
| 16 | Replicating the Particles Animation from DNA Capital — https://tympanus.net/codrops/2021/10/18/replicating-the-particles-animation-from-dna-capital-with-three-js/ | Yuri Artiukh, 2021-10-18 | Video session; no code in article |
| 17 | Creating a Particles Galaxy (Viverse) — https://tympanus.net/codrops/2022/06/21/creating-a-particles-galaxy-with-three-js/ | Yuri Artiukh, 2022-06-21 | Video session; no code in article |
| 18 | Efecto: Real-Time ASCII and Dithering Effects — https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/ | Pablo Stanley, 2026-01-04 | Procedural glyphs (5×7 cell), luminance→glyph, "matrix" style listed |
| 19 | Building a Real-Time Dithering Shader — https://tympanus.net/codrops/2025/06/04/building-a-real-time-dithering-shader/ | Niccolò Fanton, 2025-06-04 | 4×4 Bayer; why images look "halftone" |
| 20 | From Flat to Spatial: 3D Product Grid with R3F — https://tympanus.net/codrops/2026/02/24/from-flat-to-spatial-creating-a-3d-product-grid-with-react-three-fiber/ | Matt Greenberg, 2026-02-24 | **Animated contour-line background shader** (simplex → fract → dual smoothstep) |
| 21 | Building Ridgeline (Webflow) — https://tympanus.net/codrops/2026/07/22/building-ridgeline-engineering-a-real-time-3d-experience-in-webflow/ | Filip Zrnzevic, 2026-07-22 | **Contour shader with fwidth AA + major/minor lines** |
| 22 | Engineering Shopify Spring '26 "Everywhere" — https://tympanus.net/codrops/2026/06/26/engineering-the-web-experience-behind-shopifys-spring-26-edition-everywhere/ | Andy Thelander, 2026-06-26 | Video → VGGT point cloud; quantised `.mdpc` format; tiered densities |
| 23 | 3D Glass Portal Card with Gaussian Splatting — https://tympanus.net/codrops/2023/11/29/3d-glass-portal-card-effect-with-react-three-fiber-and-gaussian-splatting/ | Yuri Artiukh, 2023-11-29 | Luma-app scan → `.splat` (260 MB → 800 KB via SuperSplat) in R3F |
| 24 | Particles, Progress, and Perseverance: WebGPU Fluids — https://tympanus.net/codrops/2025/01/29/particles-progress-and-perseverance-a-journey-into-webgpu-fluids/ | Hector Arellano, 2025-01-29 | 80k particles, WGSL compute, gravity+curl |
| 25 | Grid Displacement Texture with RGB Shift (GPGPU) — https://tympanus.net/codrops/2024/08/27/grid-displacement-texture-with-rgb-shift-using-three-js-gpgpu-and-shaders/ | Chakib Mazouni, 2024-08-27 | Mouse-trail decay texture in GPUComputationRenderer |
| 26 | Recreating a Dave Whyte Animation in R3F — https://tympanus.net/codrops/2020/12/17/recreating-a-dave-whyte-animation-in-react-three-fiber/ | Matt Rossman, 2020-12-17 | 10k InstancedMesh dots, RGB-delay post |
| 27 | 3D Particle Explorations — https://tympanus.net/codrops/2017/12/12/3d-particle-explorations/ | Jack Rugile, 2017-12-12 | Points + simplex noise, additive |
| 28 | Building The Monolith — https://tympanus.net/codrops/2025/11/29/building-the-monolith-composable-rendering-systems-for-a-13-scene-webgl-epic/ | Ethan Chiu, 2025-11-29 | Ping-pong particle system, `EmissionShape` via MeshSurfaceSampler |
| 29 | Self Doubt and the Quest for Fun (portfolio game) — https://tympanus.net/codrops/2025/10/06/self-doubt-and-the-quest-for-fun-how-i-ended-up-turning-my-portfolio-into-a-game/ | Martin Laxenaire, 2025-10-06 | gpu-curtains WebGPU curl-noise particles; repo https://github.com/martinlaxenaire/portfolio-2025 |
| 30 | False Earth — https://tympanus.net/codrops/2026/04/21/false-earth-from-webgl-limits-to-a-webgpu-driven-world/ | Ming Jyun Hung, 2026-04-21 | WebGPU storage-buffer instancing, indirect draw (grass, not portraits) |
| 31 | Frontend Rewind 2023 Day 08/15/21 — https://tympanus.net/codrops/2023/12/08/frontend-rewind-2023-day-08/ , https://tympanus.net/codrops/2023/12/15/frontend-rewind-2023-day-15/ , https://tympanus.net/codrops/2023/12/21/frontend-rewind-2023-day-21/ | Codrops, Dec 2023 | Pointers: Zalobny 40k fragment-shader physics (https://portfolio2023.michalzalobny.com/projects/dynamic-particles); Michelini "images made of particles" carousel (https://tresjs-image-of-particles.vercel.app/); Kiril GPGPU demo (https://dynamic-3d-particles-threejs.vercel.app/) from Artiukh workshop https://threejs-workshops.com/workshop/dynamic-gpgpu |
| 32 | They Call Me Giulio (cyberpunk portfolio) — https://tympanus.net/codrops/2026/04/14/they-call-me-giulio-the-making-of-a-cinematic-cyberpunk-portfolio/ | Giulio Collesei, 2026-04-14 | Checked for matrix rain: **none** (ping-pong mouse texture, RGB shift, InstancedMesh cars) |
| 33 | Interactive 3D Cluster with TSL — https://tympanus.net/codrops/2026/08/12/creating-an-interactive-3d-cluster-with-three-js-tsl-and-three-start/ | Francesco Michelini, 2026-08-12 | BatchedMesh + `mx_noise_float`, Sobel outline, bayer dither |
| 34 | Garden Anomaly — https://tympanus.net/codrops/2026/08/06/garden-anomaly-a-tiny-webgpu-and-tsl-experiment/ | Frank Reitberger, 2026-08-06 | CPU PBD bubbles; not a particle-portrait technique |
| 35 | Creating a Risograph Grain Light Effect — https://tympanus.net/codrops/2022/03/07/creating-a-risograph-grain-light-effect-in-three-js/ | Robin Payot, 2022-03-07 | Custom light + grain ShaderMaterial (checked; no particles) |
| 36 | Creating the Effect of Transparent Glass and Plastic — https://tympanus.net/codrops/2021/10/27/creating-the-effect-of-transparent-glass-and-plastic-in-three-js/ | Kelly Milligan, 2021-10-27 | `MeshPhysicalMaterial.transmission` (r129+); not particles |
| 37 | Tag pages: https://tympanus.net/codrops/tag/particles/ (18 posts) · https://tympanus.net/codrops/tag/tsl/ (13 posts) · https://tympanus.net/codrops/tag/webgpu/ | — | Used to exhaust the catalogue |

Not found on Codrops (searched): a dedicated "matrix rain" tutorial; a webcam/Kinect depth particle portrait; a "Building a 3D particle morphing effect" article (that title does not exist on Codrops — closest is #1 Phantom.land and #3 Dreamy). "How to Create Interactive Particle Text/Images" also does not exist as such; the 2011 canvas post https://tympanus.net/codrops/2011/11/09/interactive-html5-typography/ (scan pixels, spawn particle where black) and the 2013 https://tympanus.net/codrops/2013/07/03/interactive-particles-slideshow/ are the ancestors.

---

## 1. Phantom.land — 3D Face Particle System (THE reference)

- URL: https://tympanus.net/codrops/2025/06/30/invisible-forces-the-making-of-phantom-lands-interactive-grid-and-3d-face-particle-system/
- Author: Phantom Studios · Date: 2025-06-30 · Live: https://www.phantom.land/ (scrollable employee face carousel) · No public repo; code excerpts are in the article (R3F + GLSL + GSAP).

### 1.1 Asset pipeline (how they avoid the "flat halftone photo" look)
Quoted: "each member of the Phantom team was 3D scanned using RealityScan from Unreal Engine on iPhone, creating a 3D model of their face." → "cleaned up and then rendered from Cinema4D with a position and colour pass." → "The position pass was converted into a greyscale depth map in Photoshop, and this—along with the colour pass—was retouched where needed, cropped, and then exported." → "each face using only two optimized 256×256 WebP images (under 15KB each)."

Key insight: the depth comes from a real scan (position pass), so scalp/forehead/cheeks all have correct Z regardless of their colour. Background is depth 0.

### 1.2 Sampling: fixed grid, no threshold
"Each face is constructed from approximately 78,400 particles (280×280 grid), where each particle's position and appearance is determined by sampling data from our two source textures."

```js
const POINT_AMOUNT = 280;
const length = POINT_AMOUNT * POINT_AMOUNT;
const vPositions = new Float32Array(length * 3);
const vIndex = new Float32Array(length * 2);   // uv into depth/colour maps
const vRandom = new Float32Array(length * 4);
for (let i = 0; i < length; i++) {
  vIndex[i*2]     = (i % POINT_AMOUNT) / POINT_AMOUNT;
  vIndex[i*2 + 1] = i / POINT_AMOUNT / POINT_AMOUNT;
  const theta = Math.random() * 360, phi = Math.random() * 360;   // initial scatter on a sphere
  vPositions[i*3]   = Math.sin(theta) * Math.cos(phi);
  vPositions[i*3+1] = Math.sin(theta) * Math.sin(phi);
  vPositions[i*3+2] = Math.cos(theta);
  vRandom.set([Math.random(),Math.random(),Math.random(),Math.random()], i*4);
}
```
R3F: `<points>` with `bufferAttribute` vIndex(2)/position(3)/vRandom(4); `<shaderMaterial blending={NormalBlending} transparent>` — note **NormalBlending, not additive**.

### 1.3 Vertex shader — depth → Z, colour → size
```glsl
vec3 depthTexture1 = texture2D(depthMap1, vIndex.xy).xyz;
float zDepth = (1. - depthValue.z);          // depth 0 = background, 1 = foreground
pos.z = (zDepth * 2.0 - 1.0) * zScale;

vec3 colorTexture1 = texture2D(colorMap1, vIndex.xy).xyz;
float density = (mainColorTexture.x + mainColorTexture.y + mainColorTexture.z) / 3.;
float pScale = mix(pScaleMin, pScaleMax, density);   // bright → bigger point, dark → smaller (never zero)
```
"brighter, more colourful areas of the face (like eyes, lips, or well-lit cheeks) generate larger, more prominent particles, while darker areas (shadows, hair) create smaller, subtler particles."

### 1.4 Ambient motion (curl noise) + mouse parallax
```glsl
pos += curlNoise(pos * curlFreq1 + time) * noiseScale * 0.1;
```
```js
materialRef.current.uniforms.time.value = state.clock.elapsedTime * NOISE_SPEED;
easing.damp(pointsRef.current.rotation, 'y',  state.mouse.x   * 0.12 * Math.PI, 0.25, delta);
easing.damp(pointsRef.current.rotation, 'x', -state.pointer.y * 0.05 * Math.PI, 0.25, delta);
```

### 1.5 Morph A→B (the exact thing SerSan needs)
```js
gsap.timeline()
  .fromTo(uniforms.transition, {value: 0}, {value: 1.3, duration: 1.6})
  .to(uniforms.posZ,   {value: particlesParams.offset_z,     duration: 1.6}, 0)
  .to(uniforms.zScale, {value: particlesParams.face_scale_z, duration: 1.6}, 0);
```
```glsl
float speed = clamp(transition * mix(0.8, .9, transition), 0., 1.0);
speed = smoothstep(0.0, 1.0, speed);
vec3 mainColorTexture = mix(colorTexture1, colorTexture2, speed);
vec3 depthValue       = mix(depthTexture1, depthTexture2, speed);

// disturbance strongest at mid-transition
float randomZ = vRandom.y + cnoise(pos * curlFreq2 + t2) * noiseScale2;
float smoothTransition = abs(sin(speed * PI));
pos.x += nxScale * randomZ * 0.1 * smoothTransition;
pos.y += nyScale * randomZ * 0.1 * smoothTransition;
pos.z += nzScale * randomZ * 0.1 * smoothTransition;
```
Morph = per-particle lerp of *both* textures at the same grid index (particle i in face A ↔ particle i in face B), so no correspondence problem and no particle count change.

### 1.6 Custom depth-of-field in the point shader (gives the "volumetric" read)
```glsl
// vertex
vec4 viewPosition = viewMatrix * modelPosition;
vDistance = abs(focus + viewPosition.z);
gl_PointSize = pointSize * pScale * vDistance * blur * totalScale;   // out-of-focus → bigger
// fragment
float alpha = (1.04 - clamp(vDistance * 1.5, 0.0, 1.0));            // out-of-focus → fainter
gl_FragColor = vec4(color, alpha);
```
Per-face manual calibration: `offset_z`, `z_depth_scale`, `face_size` ("Each photograph was captured under slightly different conditions—varying lighting, camera distances, and facial proportions").

### 1.7 Grid/post (secondary)
Lens distortion + vignette ShaderPass: `shiftedUv *= (0.88 + distortion * dot(shiftedUv))`; vignette `smoothstep(0.8, vignetteOffset*0.799, (vignetteDarkness+vignetteOffset)*distanceToCenter)`; distortion tweened with GSAP `power2.out` 1 s; drag inertia `velocity.lerp(offset,0.8)` / release `velocity.lerp(0,0.1)`; camera zoom ease `CustomEase '.23,1,0.32,1'`.

---

## 2. Bruno Imbrizi — Interactive Particles with Three.js (2019) — the thresholding anti-pattern, plus the touch-trail trick

- URL: https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/ · Demo: https://tympanus.net/Tutorials/InteractiveParticles/ · Repo: https://github.com/brunoimbrizi/interactive-particles (shaders at `src/shaders/particle.vert|frag`, logic at `src/scripts/webgl/particles/Particles.js`, `TouchTexture.js`).
- Sampling: image 320×180 = 57,600 candidate pixels; **discard if `originalColors[i*4] > threshold` fails, threshold = 34 (#22)** — one particle per surviving pixel; `InstancedBufferGeometry` of one quad (4 verts, 2 tris) with per-instance `offset` (pixel x,y), `pindex`, `angle` (0..π).
- Material: `RawShaderMaterial`, `depthTest:false`, `transparent:true`, default (normal) blending. Uniforms `uTime,uRandom(1.0),uDepth(2.0),uSize(0→1.5 on show),uTextureSize,uTexture,uTouch`. Show animates `uSize 0.5→1.5`, `uDepth 40→4`; hide `uDepth→-20`, `uSize→0`.
- Vertex (verbatim key lines):
```glsl
vec2 puv = offset.xy / uTextureSize;
vec4 colA = texture2D(uTexture, puv);
float grey = colA.r * 0.21 + colA.g * 0.71 + colA.b * 0.07;
vec3 displaced = offset;
displaced.xy += vec2(random(pindex) - 0.5, random(offset.x + pindex) - 0.5) * uRandom;
float rndz = (random(pindex) + snoise_1_2(vec2(pindex * 0.1, uTime * 0.1)));
displaced.z += rndz * (random(pindex) * 2.0 * uDepth);
displaced.xy -= uTextureSize * 0.5;
float t = texture2D(uTouch, puv).r;                 // trail texture
displaced.z += t * 20.0 * rndz;
displaced.x += cos(angle) * t * 20.0 * rndz;
displaced.y += sin(angle) * t * 20.0 * rndz;
float psize = (snoise_1_2(vec2(uTime, pindex) * 0.5) + 2.0);
psize *= max(grey, 0.2);                            // size by luminance, floor 0.2
psize *= uSize;
vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
mvPosition.xyz += position * psize;                 // billboard quad in view space
gl_Position = projectionMatrix * mvPosition;
```
- Fragment: greyscale colour, circular mask `dist = 0.5 - distance(uv, .5); a = smoothstep(0.0, 0.3, dist)`.
- TouchTexture: 64×64 canvas, `maxAge 120` frames, `radius 0.15`, force = `min(dd*10000,1)` from cursor delta, intensity eased in over first 30 % of age then out (easeOutSine), drawn as radial gradient → `uTouch`.
- Why it produces holes: everything below luminance 34/255 is *never instantiated*; and bright skin against a bright wall is not separated at all (no matte). This is the same class of failure the owner sees (their version evidently discards bright/wall-coloured pixels).

---

## 3. Dominik Fojcik — Dreamy Particle Effect (GPGPU, 2024) — spring-back + mouse repel on face-like masks

- URL: https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/ · Demos: https://tympanus.net/Tutorials/DreamyParticles/ (Mask), `/example2.html` ("GPGPU Shining Mask – Venecia"), example3/4 (Samurai, Cyborg) · Repo: https://github.com/DGFX/codrops-dreamy-particles (`webgl/gpgpu/GPGPU.js`, `GPGPUUtils.js`, `GPGPUEvents.js`, `shaders/simFragment.glsl`, `simFragmentVelocity.glsl`, `vertex.glsl`, `fragment.glsl`, `postprocessing/MotionBloomPass.js`).
- Sampling: `MeshSurfaceSampler(mesh).build()`; `size = 1200` → texture 1200×1200 = **1.44 M particles** on the mask; positions written to a `DataTexture(RGBA, FloatType)`; per-point UV `(j/(size-1), i/(size-1))` indexes the sim texture.
- Sim: `GPUComputationRenderer` with two variables (position, velocity), each depending on both.
```glsl
// simFragmentVelocity.glsl (repo version)
velocity *= uForce;                                   // uForce = 0.7  (damping)
vec3 direction = normalize(original - position);
float dist = length(original - position);
if (dist > 0.001) velocity += direction * (dist * 0.02);   // spring to home (article text used constant 0.0003)
float mouseDistance = distance(position, uMouse);  float maxDistance = 0.1;
if (mouseDistance < maxDistance) {
  vec3 pushDirection = normalize(position - uMouse);
  velocity += pushDirection * (1.0 - mouseDistance / maxDistance) * 0.007 * uMouseSpeed;  // article: 0.0023
}
// simFragment.glsl
position += velocity;
```
- Mouse: raycast against the mesh with `three-mesh-bvh` (`firstHitOnly`), world hit → `uMouse`; `mouseSpeed = 1` on move, decays `*= 0.85` per frame.
- Render: `THREE.Points`, `gl_PointSize = uParticleSize / -mvPosition.z` (size 1.7), fragment discards outside radius 0.5, alpha = `clamp(|velocity|*100, 0.04, 0.8)` (particles glow when moving), `AdditiveBlending`, `depthWrite:false`, `depthTest:false`, `transparent`. Colours `#F777A8` (mask), `#F7D377` (Venecia).
- Post: `MotionBloomPass` = UnrealBloomPass fork, 5 mips, kernel sizes [3,5,7,9,11], bloomFactors [1,.8,.6,.4,.2], `BlurDirectionX = (2, 1.1)` (anisotropic streak), HalfFloat targets, `bloomRadius 0.1`, high-pass `smoothWidth 0.01`.

---

## 4. UntilLabs — a real photograph rebuilt as a living particle system (2025)

- URL: https://tympanus.net/codrops/2025/12/10/simulating-life-in-the-browser-creating-a-living-particle-system-for-the-untillabs-website/ · Author: Bautista Berto (basement.studio) · Live: https://www.untillabs.com/ · No repo.
- Pipeline (quoted): "Via any 3D Point Cloud tool, we: 1. Took a high-res real image / 3D model 2. Generated a point cloud 3. Exported each pixel/point as JSON" — with "position, color, density" per point. "This worked, but resulted in a 20 MB JSON." Solution: encode into textures 256×256 = 65,536 points; `position_h` (RGB = XYZ high bytes) + `position_l` (low bytes) → 16-bit precision, plus a colour texture; total "~604 KB". Bounds min [-75.37,0,-49.99] max [75.37,0.65,49.99].
- Vertex reconstruction (verbatim):
```glsl
vec3 sampledPositionHigh = texture2D(uParticlesPositionHigh, aParticleUv).xyz;
vec3 sampledPositionLow  = texture2D(uParticlesPositionLow,  aParticleUv).xyz;
float colorRange = uTextureSize - 1.0;
vec3 highBytes = sampledPositionHigh * colorRange;  vec3 lowBytes = sampledPositionLow * colorRange;
vec3 position16bit = vec3((highBytes.x*uTextureSize)+lowBytes.x, (highBytes.y*uTextureSize)+lowBytes.y, (highBytes.z*uTextureSize)+lowBytes.z);
vec3 normalizedPosition = position16bit / uParticleCount;
vec3 particlePosition = remapPosition(normalizedPosition);
vColor = texture2D(uParticlesColors, aParticleUv).rgb;
```
- Baseline field before photo data: 60,000 points in a sphere, `theta = rand*2π; phi = acos(2*rand-1); r = radius*cbrt(rand)`, `aScale = rand*0.5+0.5`, `aRandomness` vec3.
- Motion (GPU, in vertex shader): `pos += vec3(sin(t*0.5 + r.x*10)*r.x*0.3, cos(t*0.3 + r.y*10)*r.y*0.3, sin(t*0.4 + r.z*10)*r.z*0.2)`; plus 2D value-noise fBM (6 octaves max, amplitude ×0.5 per octave, rotation `mat2(cos .5, sin .5, -sin .5, cos .5)`, shift 100) and curl by finite difference `eps = 0.01`, 4 octaves, `time*0.1` → `vec2(dy, -dx)`.
- Render: `gl_PointSize = uSize * aScale * (1.0 / -viewPosition.z)`; fragment **soft sprite** `d = length(gl_PointCoord-0.5); alpha = pow(1.0 - smoothstep(0.0,0.5,d), 1.5)`.
- Pipeline: R3F `createPortal` into an off-screen scene → `useFBO(w,h,{HalfFloatType, Linear})` at priority −1 → fullscreen quad post with LUT colour grading (designers swap the LUT texture).

---

## 5. Depth-map family (2.5D and relighting) — how to get Z and rim light from a 2D headshot

### 5.1 Relighting Images with Depth Maps and Three.js (TSL/WebGPU, Aug 2026)
- URL: https://tympanus.net/codrops/2026/08/19/relighting-images-with-depth-maps-and-three-js/ · Author: Dominik Fojcik · Demo: https://tympanus.net/Tutorials/RelightingImages · Repo: https://github.com/DGFX/codrops-relightning-images (`src/effect/nodes/normal.js`, `depth-map.js`, `light.js`, `nodes/shadow.js`).
- Depth source: **Depth Anything 3** (https://github.com/ByteDance-Seed/Depth-Anything-3) or author's browser tool **https://depth.fojcikdominik.com/**. Depth is loaded as 8-bit, downscaled to `WORKING_WIDTH 1024`, band-smoothed (`depthSmoothing.percent 1.3` % of width) into a `RedFormat/HalfFloat` DataTexture — the smoothing is there precisely because 8-bit depth quantises into 256 steps (terracing).
- Normals from depth (verbatim TSL):
```js
const depthGradient = Fn(([vUv, step]) => {
  const left = smoothDepthNode.sample(vUv.sub(vec2(step.x,0))).r, right = smoothDepthNode.sample(vUv.add(vec2(step.x,0))).r
  const bottom = smoothDepthNode.sample(vUv.sub(vec2(0,step.y))).r, top = smoothDepthNode.sample(vUv.add(vec2(0,step.y))).r
  return vec2(right.sub(left), top.sub(bottom)).mul(0.5) })
export const normalNode = Fn(([vUv]) => {
  const step = vec2(GRADIENT_TEXELS /*3*/).div(vec2(smoothDepthNode.size()))
  const slope = depthGradient(vUv, step).mul(coverScaleNode()).div(step.mul(modelScale.xy)).mul(uDisplacementScale /*4*/).mul(uNormalScale /*3*/)
  const detail = detailGradient(vUv, vec2(DETAIL_STEP_TEXELS /*8*/).div(vec2(mapNode.size()))).mul(uDetailScale /*3*/).mul(DETAIL_GAIN /*4*/)   // luminance gradient at mip LOD 3
  return vec3(slope.x.negate(), slope.y.negate(), 1).add(vec3(detail.x.negate(), detail.y.negate(), 0)).normalize() })
```
- Lighting: `MeshPhongNodeMaterial` with `colorNode/normalNode/aoNode`; `PointLight('#e1ded1', 2.35, 0, decay 1)` at (1.2, 0.8, 0.9) following the pointer in NDC; `AmbientLight 0.3`; screen-space self-shadow march (`SHADOW_STEPS`, `SOFTNESS_GROWTH`). Directly reusable to compute per-point normals for a **rim/fresnel glow on a particle head** (normal from depth gradient; `rim = pow(1 - dot(N, V), k)`).

### 5.2 WebGPU Scanning Effect with Depth Maps (TSL, 2025)
- URL: https://tympanus.net/codrops/2025/03/31/webgpu-scanning-effect-with-depth-maps/ · Author: deadrabbbbit · Demo: https://tympanus.net/Development/ScanEffect · Repo: https://github.com/d3adrabbit/ScanningEffectWithDepthMap
- Scan band: `flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))))` (progress 0→1 loops over 3 s); dot grid: `tiling = vec2(120)`, `tiledUv = mod(tUv*tiling, 2)-1`, `dot = smoothstep(0.5, 0.49, length(tiledUv)) * mx_cell_noise_float(tUv*tiling/2)`; mask `vec3(10,0,0)`.

### 5.3 Fake 3D Image Effect (2019)
- URL: https://tympanus.net/codrops/2019/02/20/how-to-create-a-fake-3d-image-effect-with-webgl/ · Yuri Artiukh · Demo: http://tympanus.net/Tutorials/Fake3DEffect/ · Repo: https://github.com/akella/fake3d
- `gl_FragColor = texture2D(originalImage, uv + mouse * texture2D(depthImage, uv).r)`; depth painted by hand in Photoshop (white = near).

### 5.4 Gaussian splat (2023)
- https://tympanus.net/codrops/2023/11/29/3d-glass-portal-card-effect-with-react-three-fiber-and-gaussian-splatting/ — Luma app capture → `.splat`, 260 MB → 800 KB after PlayCanvas SuperSplat cleanup; drei `<Splat>` in R3F. Relevant if the team opts for real head scans instead of depth estimation.

### 5.5 Shopify "Everywhere" point clouds (2026)
- https://tympanus.net/codrops/2026/06/26/engineering-the-web-experience-behind-shopifys-spring-26-edition-everywhere/ — video → **VGGT** → point cloud; custom `.mdpc` (quantised positions in bbox, luma/chroma colour, deflate/Brotli); "density-weighted 1024 / 512 / 256 variants for the runtime tiers"; uniforms "size, opacity, flow, caustics, color correction, camera fade, transition progress, SDF collision, fluid displacement"; keep geometry in refs not React state. No shader code published.

---

## 6. Mesh → particles, dissolve, morph helpers

- **Surface Sampling** (Hoebregts 2021, https://tympanus.net/codrops/2021/08/31/surface-sampling-in-three-js/, repo https://github.com/Mamboleoo/SurfaceSampling): `new MeshSurfaceSampler(mesh).build(); sampler.sample(v3)`; 15,000 points on a torus knot; 30,000 on an elephant with per-vertex palette `#FAAD80 #FF6767 #FF3D68 #A73489`; 300 `InstancedMesh` spheres r=0.05.
- **Dissolve** (Chopra 2025, https://tympanus.net/codrops/2025/02/17/implementing-a-dissolve-effect-with-shaders-and-particles-in-three-js/, demo https://tympanus.net/Tutorials/EmissiveDissolveEffect/, repo https://github.com/JatinChopra/emissive-dissolve-effect): Points share the mesh geometry; `if (noise < uProgress) discard; if (noise > uProgress+uEdge) discard;` edge colour emissive; particle `size = size/(aDist+1.0); gl_PointSize = size / -viewPosition.z`; rotated sprite texture `mat2(cos a, sin a, -sin a, cos a)`; `AdditiveBlending`, `transparent`; per-particle max offset `rand*1.5+0.2`, `particleSpeedFactor 0.02`; UnrealBloomPass (values not stated).
- **Audio-reactive** (Canzian 2023, https://tympanus.net/codrops/2023/12/19/creating-audio-reactive-visuals-with-dynamic-particles-in-three-js/, repo https://github.com/tgcnzn/Interactive-Particles-Music-Visualizer): `target = position + normal*0.1 + curl(pos*frequency)*amplitude; d = length(pos-target)/maxDistance; newpos = mix(position, target, pow(d,4.))`; `gl_PointSize = size + pow(d,3.)*offsetSize * (1./-mvPosition.z)`; fragment `color = mix(startColor,endColor,vDistance); alpha = circle * vDistance`; amplitude 0.8 ± band mapping.
- **Monolith** (Chiu 2025): generic ping-pong particle system with `EmissionShape` (MeshSurfaceSampler), `VelocityAddNoise`, `PositionAddMouse` (push/pull), points or instanced rendering into a G-buffer material — architecture reference only.

---

## 7. WebGPU / TSL particle references (the SerSan stack is three r184 WebGPU/TSL)

### 7.1 Matrix Sentinels (MisterPrada 2025) — compute + instancedArray + 4D flow field
- https://tympanus.net/codrops/2025/05/05/matrix-sentinels-building-dynamic-particle-trails-with-tsl/ · Demo https://tympanus.net/Tutorials/MatrixSentinels · Repo https://github.com/MisterPrada/matrix-sentinels
- Buffers: `instancedArray(Float32Array(N*3),'vec3')` for init/current positions, a history buffer `N * tails_count(7) * story_count(5)`, `lifeBuffer`. `particles_count = 7*200`.
- Flow field (verbatim TSL):
```js
const strength = simplexNoise4d(vec4(position.mul(0.2), _time.add(1))).toVar()
const flowField = vec3(
  simplexNoise4d(vec4(position.mul(uFlowFieldFrequency).add(0),   _time)),
  simplexNoise4d(vec4(position.mul(uFlowFieldFrequency).add(1.0), _time)),
  simplexNoise4d(vec4(position.mul(uFlowFieldFrequency).add(2.0), _time))).normalize()
```
  `uFlowFieldInfluence 0.5`, `uFlowFieldStrength 3.043`, `uFlowFieldFrequency 0.207`, `size 0.489`.
- History queue compute: head writes `positionStory.assign(lastPosition)` when `instanceIndex.mod(story_snake)==0`, then every element shifts `element(i+1).assign(element(i))`; `.compute(full_story_length)`; per frame `await renderer.computeAsync(computePositionStory); await renderer.computeAsync(computeUpdate)`.
- Render: `InstancedMesh(SphereGeometry(0.1,32,32), MeshStandardNodeMaterial{metalness 1, roughness 0, emissiveNode color(0x00ff00)})`, `frustumCulled=false`; `positionNode = positionLocal.mul(finalSize).add(positionBuffer.element(instanceIndex))`, head gets `+0.5` size.

### 7.2 Interactive Text Destruction (Armdz 2025) — TSL spring physics
- https://tympanus.net/codrops/2025/07/22/interactive-text-destruction-with-three-js-webgpu-and-tsl/ · Demo https://tympanus.net/Tutorials/InteractiveTextDestruction/ · Repo https://github.com/armdz/tsl_elastic_vertex_destruction
- Per-vertex compute: `velocity += (target - current) * spring; velocity *= friction; current += velocity` with **spring 0.05, friction 0.9**, pointer influence radius 0.5 (× 1.5 multiplier), `mx_noise_vec3` for direction; emissive hue rotates with `|velocity|*10`; post bloom intensity 0.3 / threshold 0.2 / strength 0.1 + `mx_noise_float` grain.

### 7.3 WebGPU Gommage (Introvigne 2026) — WebGPU has NO variable gl_PointSize
- https://tympanus.net/codrops/2026/01/28/webgpu-gommage-effect-dissolving-msdf-text-into-dust-and-petals-with-three-js-tsl/ · Demo https://tympanus.net/Tutorials/WebGPUGommage · Repo https://github.com/WallabyMonochrome/WebGPU-clair-obscur-gommage-codrops
- Quoted constraint: in WebGL dust "would typically use a Points primitive, but WebGPU has a limitation where variable point size is not supported", so use **Sprites or InstancedMesh** (quads). Dust: 100 instances, `dustAge = time.sub(aBirth)`, life 0→1, size `smoothstep(0,0.05,life)`, fade `smoothstep(0.8,1.0,life)`, wind 0.3, rise 0.1, noise scale 30 / speed 0.015, wobble 0.6; `depthWrite/depthTest false`; MRT `bloomIntensity` mask per material (text 0.4, petals 0.7, dust 0.5); ACESFilmic.
  → For SerSan (r184 WebGPU) a 78k–160k-point head should be an instanced quad/`Sprite`-style mesh with size in `positionNode`/`scaleNode`, not `THREE.Points` with `gl_PointSize`.

### 7.4 Others
- WebGPU Fluids (Arellano 2025, https://tympanus.net/codrops/2025/01/29/particles-progress-and-perseverance-a-journey-into-webgpu-fluids/, repo https://github.com/HectorArellanoDev/WebGPUFluids, simplified https://github.com/HectorArellanoDev/CodropsBasic): 80k particles; gravity + curl noise + mouse repulsion; atomics for grid hashing.
- False Earth (2026, repo https://github.com/momentchan/false-earth): storage buffer 4×vec4 per instance, `atomicAdd` spawn ring, indirect draw culling, 3 LOD tiers.
- Interactive 3D Cluster (Michelini 2026, repo https://github.com/kekkorider/codrops-tutorial-dark-cluster): `mx_noise_float(centroid.yz.add(t)).remap(-1,1,0.15,0.75)`, hover smoothstep +0.45, Sobel outline `step(0.01)`, `bayerDither()`.
- Frontend Rewind pointers (no code on Codrops): Michal Zalobny 40k particles physics-in-fragment-shader https://portfolio2023.michalzalobny.com/projects/dynamic-particles; Francesco Michelini TresJS "images made of particles" carousel https://tresjs-image-of-particles.vercel.app/; Yuri Artiukh workshop "Dynamic GPGPU particles with Three.js & R3F" https://threejs-workshops.com/workshop/dynamic-gpgpu.

---

## 8. Glyph / "matrix" rendering on Codrops

No dedicated matrix-rain tutorial exists on Codrops (searched `matrix rain glyph shader`, `digital rain`, cyberpunk case study). What exists:
- **Efecto** (Stanley 2026-01-04, https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/, app https://efecto.app/): cell grid → sample centre colour → `brightness = dot(rgb, vec3(0.299,0.587,0.114))` → glyph chosen by brightness ("darker regions get denser characters `@ # 8`, lighter `. :` space"); glyphs drawn procedurally on a 5×7 grid inside the shader (e.g. colon `if (grid.x==2.0 && (grid.y==2.0||grid.y==4.0)) return 1.0;`); "matrix" is one of 8 ASCII styles, no falling animation code shown. Also Floyd–Steinberg 7/16,3/16,5/16,1/16 and Atkinson (/8).
- **Real-Time Dithering Shader** (Fanton 2025-06-04, repo https://github.com/niccolofanton/dithering-shader): 4×4 Bayer, `gridSize 4`, `pixelatedUV = floor(fragCoord/pixelSize)*pixelSize/resolution`, clamps at `1/17` and `16/17` brightness. Useful to *understand* why the current SerSan portrait reads as "dithered": a luminance-thresholded regular grid IS ordered dithering.
- **Trionn** (2026-07-15, https://tympanus.net/codrops/2026/07/15/the-architecture-behind-trionn-coordinating-gsap-three-js-lenis-and-web-audio/): headline glyphs measured with `Range.getBoundingClientRect()` per character → `<span>` particles, CPU trajectories (angle −π..π, speed 0.05–0.15 or 0.4–0.9 × viewport, y velocity `rand(-1.0,0.18)`), triggered at scroll 0.35–0.53. DOM technique, not a shader.
- **They Call Me Giulio** (2026-04-14): verified no rain; ping-pong "WatercolorBrush" mouse texture, UV distortion + RGB shift, 100-instance cars on `CatmullRomCurve3`.
Practical takeaway for a glyph-rain background column: the Codrops-proven building blocks are (i) a cell grid with per-cell luminance→glyph index (Efecto), (ii) a small procedural or atlas glyph set, (iii) per-column time offsets — the falling logic itself must be authored (`fract(t*speed + hash(col))` per column, brightness head + exponential tail).

---

## 9. Contour / flow-line shaders on Codrops

### 9.1 3D Product Grid (Greenberg 2026-02-24) — animated isolines background
- https://tympanus.net/codrops/2026/02/24/from-flat-to-spatial-creating-a-3d-product-grid-with-react-three-fiber/ · Demo https://shoe-finder-wine.vercel.app/ · Repo https://github.com/MatthewGreenberg/shoe-finder
```glsl
#pragma glslify: snoise = require('glsl-noise/simplex/2d')
float n = snoise(noiseUv * uScale + uTime * 0.05);
float lines = fract(n * 5.0);                                   // 5 bands per noise unit
float pattern = smoothstep(0.5 - uLineThickness, 0.5, lines)
              - smoothstep(0.5, 0.5 + uLineThickness, lines);   // uLineThickness 0.03
float grain = (fract(sin(dot(vUv * 2.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.15;
gl_FragColor = vec4(uColor + grain, pattern * opacity * mask * uOpacity);
```
Described as "a living topographic map that gives the scene a technical, CAD-like depth"; sheen opacity 0.25 when zoomed.

### 9.2 Ridgeline (Zrnzevic 2026-07-22) — crisp contours at any zoom via `fwidth`
- https://tympanus.net/codrops/2026/07/22/building-ridgeline-engineering-a-real-time-3d-experience-in-webflow/ · Demo https://topography.webflow.io/
```glsl
float scaled = vWorldPos.y * uContourFreq;
float dMinor = abs(fract(scaled) - 0.5) * 2.0;
float aa     = fwidth(scaled) * 2.0;
float minor  = 1.0 - smoothstep(uContourWidth - aa, uContourWidth + aa, dMinor);
float dMajor = abs(fract(scaled / uMajorEvery) - 0.5) * 2.0;
float major  = 1.0 - smoothstep(uContourWidth * uMajorBoost - aa, uContourWidth * uMajorBoost + aa, dMajor);
float line   = max(minor * uMinorDim, major);
vec3 contourCol = mix(uContourLo, uContourHi, elev);
gl_FragColor = vec4(mix(ground, contourCol, line), 1.0);
```
Plus per-pixel dithering to kill banding in dark gradients. For Lusion-style *flowing luminous* lines at the bottom of the Team section: drive the scalar field with 3D simplex `(x, y, t)` instead of height, feed `line` into an emissive/bloom channel, and use `fwidth` AA so 1-px lines stay crisp on retina.

### 9.3 Related
- Scanning effect (5.2) for a depth-isoline "scan band" (`abs(depth - progress) < 0.02`) — the same isoline trick applied to the portrait depth map gives contour rings across the face.

---

## 10. Synthesis for SerSan's Team section (only from what the sources support)

1. **Stop thresholding colour.** Phantom.land's fixed 280×280 grid + depth-Z + colour-only-size is the proven recipe; Imbrizi's `> 34` luminance discard is the documented cause of missing bright regions. If a matte is needed, derive it from **depth** (`depth == 0 → background`) or from a cropped/retouched source, not from luminance.
2. **Get real depth.** Phantom used RealityScan + C4D position pass; Fojcik (2026) uses Depth Anything 3 / https://depth.fojcikdominik.com/ from a single photo, smoothed (~1.3 % of width band blur) to avoid 8-bit terracing. Either path yields Z for scalp/forehead/cheeks.
3. **Volumetric look = Z from depth + custom DoF** (`gl_PointSize ∝ |focus + view.z|`, alpha `1.04 - clamp(vDist*1.5)`), NormalBlending, and curl noise `pos += curl(pos*f + t) * 0.1*noiseScale`.
4. **Rim glow**: normals from depth gradient (Relighting article's `normalNode`, 3-texel step, displacement 4, normal scale 3, detail from luminance gradient at LOD 3 ×4) → fresnel on each point; Dreamy demo's velocity-driven alpha (0.04–0.8) + anisotropic MotionBloom for shimmer.
5. **Morph A→B→C→D**: same grid index in every person's depth+colour pair; `mix(texA, texB, smoothstep(speed))`, 1.6 s GSAP, mid-transition disturbance `abs(sin(speed*PI))`, per-person `offset_z / z_depth_scale / face_size` calibration.
6. **WebGPU specifics** (three r184): no variable point size in WebGPU (Gommage) → instanced quads with `positionNode`/scale; storage via `instancedArray`, `.compute(N)` + `renderer.computeAsync` (Matrix Sentinels); spring `0.05` / friction `0.9` (Text Destruction) or damping `0.7` + `dist*0.02` pull (Dreamy) for hover physics.
7. **Glyph rain**: no Codrops tutorial; compose from Efecto's luminance→glyph cell shader + own per-column `fract(time*speed+hash)` fall.
8. **Contour lines**: Greenberg `fract(snoise*5)` dual-smoothstep (thickness 0.03, drift 0.05) or Ridgeline `fwidth` version; animate with time, route to bloom.

Files: this dossier — `C:/Users/alber/AppData/Local/Temp/claude/C--Users-alber-sersan/1c69a823-396b-49b0-8d9a-70aaa24ca458/scratchpad/dossiers/web-codrops.md`; raw UntilLabs HTML saved at `.../scratchpad/until.html`.
