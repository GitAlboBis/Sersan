# Dossier `web-repos` — GitHub / repo sweep: photo→particles, particle heads, morphing, GPGPU flow fields, official three.js examples, depth-map portraits, and a source-level reverse engineering of lusion.co/about "TEAM"

Date: 2026-08-27. Everything below was fetched live (raw GitHub, GitHub API, threejs.org examples on `dev`, lusion.co production bundle). Star counts are GitHub API values on that date. Local copies of all fetched sources live in `C:/Users/alber/AppData/Local/Temp/claude/C--Users-alber-sersan/1c69a823-396b-49b0-8d9a-70aaa24ca458/scratchpad/dossiers/` (`*.html` official examples, `lusion_hoisted.js`, `lusion_faces_region.js`, `lusion_face_edan.buf`, `lusion_letter_placements.buf`, `lusion_team.json`).

---

## 0. Executive summary (what matters for SerSan's founders-rail)

1. **Lusion's TEAM faces are NOT a photo-to-particle effect and NOT a full 3D scan.** They are a **pre-baked 8192-point relief point cloud per person** (`/assets/team/<id>.buf`, 82 KB each), packed as Uint16 positions (x,y in −1..1, z in 0..1) plus a per-point Uint8 `nShade` = (normal.xyz encoded 0..255, precomputed shade/AO in .w). Decoding `edan.buf`: z mean 0.62, only **1.1 % of points have back-facing normals**, so it is a **front hemisphere (2.5D relief) captured/baked offline**, rendered with instanced quads, additive blending, mouse-as-light shading from the baked normals, depth-based blur (fake DoF), scanline + row glitch, and a 2-mesh cross-fade for A→B transitions. Full shader source in §7.
2. **Why SerSan's portraits have empty patches:** every image→particle repo surveyed (Codrops Interactive Particles, MisterPrada logo-particles, particle-saga, activesphere) **thresholds on brightness/alpha** (`brightness > threshold` keeps the pixel), so bright skin that matches a white wall is discarded (or the wall is kept). Lusion sidesteps this entirely by never sampling the photo at runtime: the **silhouette/density comes from geometry**, the **image is only used for shading (`nShade.w`)**. Fix options ranked by fidelity: (a) offline depth-map (Depth Anything / MiDaS / Portrait Depth API) + alpha matte → uniform grid or blue-noise sample of the *matte*, z from depth, normals from depth gradient (Codrops relighting article gives `depthGradient`); (b) 3D scan / photogrammetry `.ply/.glb` + `MeshSurfaceSampler`; (c) keep the current GPGPU morph but sample *uniformly inside the alpha matte*, never by luminance.
3. **The glyph rain** on lusion.co/about is 196 instanced vertical strips (`letter_placements.buf`, with a per-strip `density` and `dof` attribute) rendered in **4 depth groups into one RT with progressive blur (16 → 8 → 4 px)** between groups (cheap DoF), scrolling a **42-glyph atlas (`font.png`)** at 2–10 rows/s with per-glyph random re-rolls (hash43). Source in §7.4.
4. **The "flowing luminous lines" at the bottom** are `terrain_lines.buf` polylines extruded into 3-sided tubes (`AboutHeroLines`), shaded with a 1-D periodic Perlin noise scrolling along the arc-length (`t − u_time*2`), every 4th ring thicker/brighter, rendered with **`MaxEquation` blending** (no over-brightening at crossings). Source in §7.5.
5. Best modern reference code for the *runtime* part on our stack (three r184 WebGPU/TSL): official `webgpu_compute_particles`, `webgpu_tsl_compute_attractors_particles`, `webgpu_particles_soft` (+ `SoftParticles.js` addon), `webgpu_instance_points`, `webgpu_skinning_points`; for the *morph* part: Three.js Journey lesson 40 (noise-staggered `smoothstep(delay, delay+duration, uProgress)`); for the *life/flow* part: lesson 41 flow field (4-D simplex, particle life in `.a`).

---

## 1. (a) Image → particles (photo to point cloud)

### 1.1 Codrops "Interactive Particles with Three.js" — brunoimbrizi/interactive-particles
- Article: https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/ — Repo: https://github.com/brunoimbrizi/interactive-particles — **1.2k ★**, 303 forks. Stack: three.js, glslify, gsap, ControlKit.
- **Sampling:** one particle per pixel (320×180 = 57,600), then **discard pixels whose red channel ≤ threshold 34 (`#22`)** → this is exactly the luminance-threshold pattern that produces holes on bright/white regions.
  ```js
  for (let i = 0; i < this.numPoints; i++) { if (originalColors[i*4] > threshold) numVisible++; }
  // instanced attributes
  offsets[j*3+0] = i % this.width; offsets[j*3+1] = Math.floor(i / this.width); indices[j] = i; angles[j] = Math.random()*Math.PI;
  ```
- **Geometry:** `InstancedBufferGeometry` of one quad (4 verts), per-instance `offset`, `pindex`, `angle`.
- **Vertex shader (displacement + size):**
  ```glsl
  displaced.xy += vec2(random(pindex)-0.5, random(offset.x+pindex)-0.5) * uRandom;      // uRandom 1.0
  float rndz = random(pindex) + snoise_1_2(vec2(pindex*0.1, uTime*0.1));
  displaced.z += rndz * (random(pindex) * 2.0 * uDepth);                                  // uDepth 2.0
  float psize = (snoise_1_2(vec2(uTime, pindex)*0.5) + 2.0) * max(grey, 0.2) * uSize;    // size ∝ luminance
  float t = texture2D(uTouch, puv).r;  displaced.z += t*20.0*rndz;  displaced.x += cos(angle)*t*20.0*rndz; ...
  ```
- **Fragment:** greyscale `grey = r*0.21+g*0.71+b*0.07`, disc `t = smoothstep(0.0, 0.3, 0.5 - distance(uv, 0.5))`, alpha = t. Touch trail drawn into an off-screen canvas texture (`uTouch`).

### 1.2 MisterPrada/logo-particles-template — **11 ★** (author of the 276★ morph-particles and Codrops Matrix Sentinels)
- https://github.com/MisterPrada/logo-particles-template (branch `master`). Stack: three.js r16x, WebGL, GPUComputationRenderer, custom Bloom + motion-blur passes, SceneDepth pass.
- **PNG → positions** (`src/Experience/World/logo.js`): canvas `getImageData`, keep pixel if `brightness = (r+g+b)/3 > 200`, position `((x - w/2)/100, -(y - h/2)/100, 0)` — again a brightness threshold (works for white logos on transparent; fails on photos).
- Positions are baked into a **DataTexture** (`Helpers.makeTexture(logoGeometry)`) and each particle carries `aParticlesUv` into it; start positions are random in a cloud `x = (rand-0.5)*2 ± 3, y = (rand-0.5)*5, z = rand*10+30`.
- **Morph (Particles/vertex.glsl)** = Three.js Journey lesson-40 pattern with noise-staggered progress (`duration 0.3`, `uNoiseFrequencyParticles 0.653`, `uNoiseFrequencyLogo 0.870`), applied by `onBeforeCompile` on a stock `PointsMaterial` (`size 0.1, sizeAttenuation, alphaMap particle png, alphaTest 0.2, AdditiveBlending`).
  ```glsl
  float inOutProgress(vec3 position, vec3 target, float progress){
    float noise = mix(simplexNoise3d(position*uNoiseFrequencyParticles), simplexNoise3d(target*uNoiseFrequencyLogo), progress);
    noise = smoothstep(-1.0, 1.0, noise);
    float duration = 0.3; float delay = (1.0-duration)*noise;
    return smoothstep(delay, delay+duration, progress); }
  transformed.xyz = mix(transformed.xyz, logoTexture.xyz, inOutProgress(...));
  ```
- GSAP: `uProgress 0→1 over 10 s power1.out`, then DoF `focusRange 0→0.2` (custom CoC pass). GPGPU shader `Shaders/Gpgpu/particles.glsl` = lesson-41 flow field (`uFlowFieldStrength`, life decay `+= uDeltaTime*0.01`).
- Sibling repos: `morph-particles` (276★, "Models → Particles → Morph + Animation + Smooth Scroll", https://github.com/MisterPrada/morph-particles), `FBO-Core` (29★), `particles` (17★ triangle particles + motion blur), `singularity` (306★ TSL/WebGPU), `webgpu-tsl-linkedparticles`.

### 1.3 Codrops "Simulating Life in the Browser" (UntilLabs, basement.studio, Dec 2025) — photo → point cloud → particles
- https://tympanus.net/codrops/2025/12/10/simulating-life-in-the-browser-creating-a-living-particle-system-for-the-untillabs-website/ — demo https://creative-art-points.vercel.app/ — author Bautista Berto (https://github.com/BertovDev).
- **Pipeline:** real photograph → *offline* point cloud ("any 3D Point Cloud tool") → 65,536 points (256×256) exported as **four textures** instead of 20 MB JSON (→ 604 KB): `position_h`/`position_l` (16-bit split high/low bytes), `color`, `density`. Metadata: `bounds min [-75.37,0,-49.99] max [75.37,0.65,49.99]`.
  ```glsl
  vec3 highBytes = texture2D(uParticlesPositionHigh, aParticleUv).xyz * (uTextureSize-1.0);
  vec3 lowBytes  = texture2D(uParticlesPositionLow,  aParticleUv).xyz * (uTextureSize-1.0);
  vec3 position16bit = highBytes*uTextureSize + lowBytes;
  ```
- **Motion:** fBM (6 octaves, `amplitude *= 0.5`, rotation 0.5 rad, shift 100) + curl noise (gradient epsilon 0.01) + per-particle sinus jitter `sin(uTime*0.5 + aRandomness.x*10.0)*aRandomness.x*0.3` etc. 60k particles at 60 fps via `GL_POINTS` single draw call.
- **Render:** `gl_PointSize = uSize * aScale * (1.0 / -viewPosition.z)`; `alpha = pow(1.0 - smoothstep(0.0, 0.5, d), 1.5)`; scene rendered to `useFBO(..., type: HalfFloatType)` then LUT colour-grading pass.

### 1.4 Other image→particle repos (lower value, for completeness)
- blakecarroll/particle-saga — **90 ★** — https://github.com/blakecarroll/particle-saga — `ImageTargets` pick random **non-transparent** pixels (alpha, not luminance) in the XY plane, `ModelTargets` from JSON meshes, morph between targets with `revertDuration 800 ms`, `particleRevertDelay 0.01`, size attenuation, mouse-rotation with friction.
- activesphere/particles-webgl — 4★, archived — https://github.com/activesphere/particles-webgl — image used as **attraction-force field** for GPGPU particles (builds on Léo Chéron's GPGPU particles).
- paullewis/Photo-Particles — https://github.com/paullewis/Photo-Particles — RGB-centre attraction/repulsion (2011-era).
- windmichael/ng-image-as-particles (Angular wrapper), Tolexia/threejs-image-particles-transition, Kevinparra535/creativedev.particles — no new technique.
- three.js forum "Morph Image Particle | particle-based face transition" https://discourse.threejs.org/t/morph-image-particle-creating-a-particle-based-face-transition-effect/78794 — someone attempting exactly SerSan's goal (front portrait → side portrait) with two image textures and `mix(targetPosition, targetPosition2, uProgress)`; their problem was coherence of pixel→pixel mapping between two photos. No solution posted — confirms that **2D-image morphs between different photos are ill-posed**; morph in 3D point space instead (Lusion does).

---

## 2. (b) 3D head / face point clouds

### 2.1 Lusion (see §7 — the real thing)

### 2.2 60fps "People" (referenced by Offscreen Canvas issue #3 "Points, Lines and People")
- https://offscreencanvas.com/issues/003/ (also /issues/points-lines-and-people/) — https://www.60fps.fr/en/people (page itself 403 from here).
- Technique: grayscale photos of the team, **light = push forward (z), dark = stay back**; **50 photos looking to one side combined in a 1500×1700 sprite-sheet, index selected in the shader, mirrored for the other side because faces are symmetric**; 300×170 points per face; extra gradient layers for "squishiness". This is the cheapest "2.5D head that rotates" trick documented anywhere.
- Same newsletter: Austin Mayer portfolio (three.js morphTargets between people), Spotify Fan Study (vertex positions encoded in RGB textures blended in shader), Quentin Lengele "Point Cloud Sandbox" (billboards with sphere normal+depth maps → lit spheres, https://www.quentinlengele.com/index.php/2017/06/04/point-cloud-sandbox/), Active Theory Halo visualiser (spring physics), and it explicitly lists **"Lusion's running line person"** at https://lusion.co/about/.

### 2.3 three.js forum "3D point cloud for my head" — https://discourse.threejs.org/t/3d-point-cloud-for-my-head/7367
- Captured with **iPhone X TrueDepth via the "Capture" app**, exported OBJ (vertices only), loaded with PCDLoader/PLYLoader code, `PointsMaterial` + `AdditiveBlending`. Observation worth copying: **vertex density is naturally higher at grazing angles (silhouette) than in the centre, so additive blending alone produces a rim-lit look**. (This is the physical reason Lusion's and scan-based heads look "volumetric": point density ∝ 1/cos(view angle).)

### 2.4 JT5D "WebGL particle head" gist — https://gist.github.com/JT5D/eeb91e7f320bc56e85d4
- OBJ head (`head.obj` on S3) → every vertex a particle, `ParticleBasicMaterial` white, size 1.5 px, mouse-eased camera. Old (r5x) but shows the minimal pattern.

### 2.5 MeshSurfaceSampler resources
- Docs: https://threejs.org/docs/examples/en/math/MeshSurfaceSampler.html ; PR by donmccurdy https://github.com/mrdoob/three.js/pull/18039 (weighted, incremental).
- Codrops "Surface Sampling in Three.js" https://tympanus.net/codrops/2021/08/31/surface-sampling-in-three-js/ — `new MeshSurfaceSampler(mesh).build(); sampler.sample(tempPosition)`; examples with 300 instances, 15,000 particles, 30,000 growing points; `PointsMaterial({ size: 3, alphaTest: 0.2, map, vertexColors: true })`.
- edisonabdiel/SurfaceSampling https://github.com/edisonabdiel/SurfaceSampling (showcase).
- ektogamat/threejs-particle-skull — **109 ★** — https://github.com/ektogamat/threejs-particle-skull — any GLTF → Points (vertex positions), video by Anderson Mancini; demo https://threejs-particle-skull.vercel.app.
- Head models available for free in the three.js repo: `models/gltf/LeePerrySmith/LeePerrySmith.glb` (used by `webgl_materials_subsurface_scattering`, `webgl_decals`) — a clean, licensed head mesh to sample with `MeshSurfaceSampler` while real scans are produced.
- Gaussian-splat route (if founders get scanned with a phone): sparkjsdev/spark https://github.com/sparkjsdev/spark (THREE.js GS renderer, .ply/.spz/.splat/.ksplat/.sog, runtime-editable splat attributes) and mkkellogg/GaussianSplats3D https://github.com/mkkellogg/GaussianSplats3D (deprecated in favour of Spark). Splat positions can be read back and used as the particle target set.

---

## 3. (c) Particle morphing between shapes/targets

### 3.1 Three.js Journey lesson 40 "Particles Morphing Shader" — canonical algorithm
- Lesson: https://threejs-journey.com/lessons/particles-morphing-shader (1h35, 55 % free). Public completed sources: hnrq/threejs-journey `src/pages/04-shaders/40-particles-morphing/` — https://github.com/hnrq/threejs-journey (raw files fetched).
- **Equalise counts:** for each model, pad to `maxCount` by copying random existing vertices (so every target has identical particle count).
- **Vertex shader (verbatim):**
  ```glsl
  attribute vec3 aPositionTarget; attribute float aSize;
  uniform vec2 uResolution; uniform float uSize; uniform float uProgress; uniform vec3 uColorA, uColorB;
  float noiseOrigin = simplexNoise3d(position * 0.2);
  float noiseTarget = simplexNoise3d(aPositionTarget * 0.2);
  float noise = smoothstep(-1.0, 1.0, mix(noiseOrigin, noiseTarget, uProgress));
  float duration = 0.4; float delay = (1.0 - duration) * noise; float end = delay + duration;
  float progress = smoothstep(delay, end, uProgress);
  vec3 mixedPosition = mix(position, aPositionTarget, progress);
  gl_PointSize = aSize * uSize * uResolution.y;  gl_PointSize *= (1.0 / -viewPosition.z);   // uSize 0.4
  vColor = mix(uColorA, uColorB, noise);        // #ff7300 → #0091ff
  ```
- **Fragment:** `alpha = 0.05 / length(gl_PointCoord - 0.5) - 0.1;` (bright core, soft glow), `AdditiveBlending, depthWrite:false`. Progress tween 0→1 linear 400 ms (anime.js in this port; GSAP in the lesson).
- **TSL port hint:** identical logic works with `mix()`, `smoothstep()`, `mx_noise_float` (or a `simplexNoise3d` TSL Fn); SerSan already has 4 targets (A→B→C→D) so store 4 `instancedArray(count,'vec3')` and interpolate current/next.

### 3.2 Other morph repos
- Kshitij978/Three.js-Point-cloud-morphing-effect — 4★ — https://github.com/Kshitij978/Three.js-Point-cloud-morphing-effect — surface-sampled Queen/Pawn/Explosion, GSAP interpolation on CPU attributes (not shader). Demo https://kshitij978.github.io/Three.js-Point-cloud-morphing-effect/
- mmdalipour/particle-morph — 15★ — https://github.com/mmdalipour/particle-morph — R3F component: GLTF particlisation, primitives, scroll-driven `stages`, props `targetParticleCount`, `particleSize`, `particleSizeRange`, `particleAnimation{dampingFactor, driftSpeed, driftAmplitude}`, glow shader, postprocessing.
- wonjyou/morphing-particle-swarm — 0★ — https://github.com/wonjyou/morphing-particle-swarm — 20k particles, Fibonacci sphere (φ = 2.39996), GLB area-weighted barycentric sampling with quasi-random sequences, smoothstep blend, buffers pre-allocated for 40k + `setDrawRange`.
- sjkim24/morphingparticles, viktor-rumiievskyi/Particles-Morph, gist FtYadu/bbd0538d — Tween.js CPU morphs, nothing new.
- Wawa Sensei "GPGPU particles with TSL & WebGPU" https://wawasensei.dev/courses/react-three-fiber/lessons/tsl-gpgpu — hundreds of thousands of sprites morphing between models/text; buffers `spawnPositionsBuffer/offsetPositionsBuffer (vec3)`, `agesBuffer (float)`; `randValue = hash(instanceIndex.add(seed)).mul(max-min).add(min)`; update `age.addAssign(deltaTime); If(age > lifetime) reset`; material `<spriteNodeMaterial positionNode={spawnPosition.add(offsetPosition)} scaleNode={range(0.001,0.01)} blending={AdditiveBlending} depthWrite={false}/>`.

---

## 4. (d) GPGPU flow field / FBO particles on a mesh surface

### 4.1 Three.js Journey lesson 41 "GPGPU Flow Field Particles" (hnrq port, raw fetched)
- https://threejs-journey.com/lessons/gpgpu-flow-field-particles-shaders — inspired by chartogne-taillet.com. Uses `GPUComputationRenderer`, texture size `ceil(sqrt(count))²`, base texture RGBA = xyz + random life.
- **Compute shader (verbatim):**
  ```glsl
  uniform sampler2D uBase; uniform float uTime, uDeltaTime, uFlowFieldInfluence, uFlowFieldStrength, uFlowFieldFrequency;
  vec4 particle = texture(uParticles, uv); vec4 base = texture(uBase, uv);
  if (particle.a >= 1.0) { particle.a = mod(particle.a, 1.0); particle.xyz = base.xyz; }
  else {
    float time = uTime * 0.2;
    float strength = simplexNoise4d(vec4(base.xyz * 0.2, time + 1.0));
    float influence = (uFlowFieldInfluence - 0.5) * (-2.0);
    strength = smoothstep(influence, 1.0, strength);
    vec3 flowField = normalize(vec3(simplexNoise4d(vec4(particle.xyz*uFlowFieldFrequency+0.0, time)),
                                    simplexNoise4d(vec4(particle.xyz*uFlowFieldFrequency+1.0, time)),
                                    simplexNoise4d(vec4(particle.xyz*uFlowFieldFrequency+2.0, time))));
    particle.xyz += flowField * uDeltaTime * strength * uFlowFieldStrength;
    particle.a += uDeltaTime * 0.3;                     // life
  }
  ```
  Defaults: `uFlowFieldInfluence 0.5, uFlowFieldStrength 2, uFlowFieldFrequency 0.5, uSize 0.05`.
- **Render vertex:** `sizeIn = smoothstep(0,0.1,life); sizeOut = 1-smoothstep(0.7,1,life); gl_PointSize = min(sizeIn,sizeOut)*aSize*uSize*uResolution.y / -viewPosition.z`. Fragment: `if (length(gl_PointCoord-0.5) > 0.5) discard;`.

### 4.2 sebastien-lempens/r3f-flow-field-particles (R3F component, raw fetched)
- https://github.com/sebastien-lempens/r3f-flow-field-particles — demo https://r3f-flow-field-particles.vercel.app/ . Wraps any child mesh: reads `geometry.attributes.position` (vertex count = particle count), GPUComputationRenderer size `ceil(sqrt(count))`.
- Adds **mouse repulsion** `repulsionForce = uRepelStrength / (dist*(dist+1.0))`, disturbance `pow(uDisturbIntensity,2)`, flow field `sin(snoise(vec4(p, dt))*PI2 + uTime)*2.0` per axis, `strength 0.01`, life `+= uDeltaTime`.
- Render: `lifeSize = smoothstep(0,1,sin(particle.a*PI))`; `gl_PointSize = aParticlesSize*lifeSize*uSize*uResolution.y / -viewPosition.z`; fragment shapes disc/ring/sphere/square; optional **per-particle Lambert+specular using the mesh normal (`aNormal`)** — `light = max(dot(normal, lightDir), 0.035)`; sphere shape `circleSphere = pow(smoothstep(1,0,length(uv-0.5)),2.0)`. Colours mixed by `1-vNormal.y`. Default props `size 0.1, disturbIntensity 0.3, repulsionForce 1.0`.

### 4.3 Codrops "Crafting a Dreamy Particle Effect with Three.js and GPGPU" (DGFX, Dec 2024)
- https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/ — repo https://github.com/DGFX/codrops-dreamy-particles (32★), shaders under `webgl/gpgpu/shaders/` (raw fetched).
- Sampling: `MeshSurfaceSampler`. Two GPGPU textures (position, velocity, `RGBAFormat/FloatType`).
- **Velocity shader (verbatim):**
  ```glsl
  velocity *= uForce;                                   // relaxation (article: 0.7)
  vec3 direction = normalize(original - position); float dist = length(original - position);
  if (dist > 0.001) velocity += direction * (dist * 0.02);          // spring back to sampled shape
  float mouseDistance = distance(position, uMouse); float maxDistance = 0.1;
  if (mouseDistance < maxDistance) velocity += normalize(position - uMouse) * (1.0 - mouseDistance/maxDistance) * 0.007 * uMouseSpeed;
  ```
- Render: `gl_PointSize = uParticleSize / -mvPosition.z` (size 2); fragment `if (length(gl_PointCoord-0.5) > 0.5) discard; alpha = clamp(length(velocity.r*100), uMinAlpha 0.04, uMaxAlpha 0.8)` — **alpha driven by speed** (moving particles brighter); colour gold `(0.808,0.647,0.239)`; `depthWrite:false, depthTest:false, AdditiveBlending`; custom `MotionBloomPass` (UnrealBloom threshold 0.2, strength 0.8).

### 4.4 Maxime Heckel
- "The magical world of Particles with React Three Fiber and Shaders" (Nov 2022) https://blog.maximeheckel.com/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/ — `gl_PointSize = size * (1.0 / -viewPosition.z)`; soft disc `strength = pow(1.0 - distance(gl_PointCoord, 0.5), 3.0)`; `AdditiveBlending`; FBO sim: `DataTexture(RGBA, FloatType)`, `useFBO(size,size,{minFilter:Nearest, magFilter:Nearest, format:RGBA, stencilBuffer:false, type:FloatType})`, curl noise in sim fragment, morph between shapes via `mix()` of two data textures; >1 M particles on M1.
- "Field Guide to TSL and WebGPU" https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/ — `instancedArray(COUNT,'vec3')` spawn/offset buffers, `wgslFn` init inside a sphere (`r = sqrt(h0*4)`, `theta = h1*2π`, `phi = h2*π`), Thomas attractor update `dx = (-b*x + sin(y))*dt`, `<sprite count={COUNT}><spriteNodeMaterial transparent depthWrite={false} blending={AdditiveBlending} positionNode={spawn.add(offset)}/>`, `useFrame(({gl}) => gl.compute(updateNode))`.
- Medium (Muhammad Anas) "Creating Chaotic Flow Fields with GPGPU in React Three Fiber" https://medium.com/@midnightdemise123/creating-chaotic-flow-fields-with-gpgpu-in-react-three-fiber-f9aad608c534 (16k particles) — 403 to fetch; listed for completeness.

### 4.5 Classic curl-noise FBO repos
- edankwan/The-Spirit — **1,277 ★** — https://github.com/edankwan/The-Spirit — Edan Kwan's (Lusion founder) 2015 GPGPU experiment: "noise derivatives and curl noise for the smoky look", shadow + motion blur, Simo Santavirta's "new particles" technique, inspired by David Li's Flow. Also edankwan/hyper-mix (249★), Icicle-Bubbles (98★), touch-leap-motion (95★), Constraint (128★). Lusion org: lusionltd/WebGL-Scroll-Sync (361★, https://github.com/lusionltd/WebGL-Scroll-Sync).
- juniorxsound/Particle-Curl-Noise (19★) https://github.com/juniorxsound/Particle-Curl-Noise ; imokya/curl-noise ; mystaticself/curl-noise-particles ; aadebdeb/study-three.js `gpgpu-particles-with-curl-noise.html` ; CodePen "1 million particles curl+FBO" https://codepen.io/greenleafone7/pen/MaRZOW (1024² FBO) ; cabbibo/PhysicsRenderer (GPGPU utils) ; lightest/gpuparticles (7★, drag-drop .glb sampling + model morphing, Medium "Space Rockets and GPU Particles").
- Makio64/advanced-threejs-tsl-webgpu-rendering — 22★ — https://github.com/Makio64/advanced-threejs-tsl-webgpu-rendering — TSL perf patterns: `instancedArray`, vec4 loads (4× throughput), `workgroupArray` shared memory, `subgroupAdd`, workgroup sizes 64–256, `.toVar()` for reused expressions, 500k particle sample.
- Codrops "Matrix Sentinels: Dynamic Particle Trails with TSL" (MisterPrada, May 2025) https://tympanus.net/codrops/2025/05/05/matrix-sentinels-building-dynamic-particle-trails-with-tsl/ — repo https://github.com/MisterPrada/matrix-sentinels — history queue `positionStoryBuffer = instancedArray(particles*tails*story,'vec3')` shifted each frame, 4-D simplex flow (`uFlowFieldInfluence 0.5, uFlowFieldStrength 3.043, uFlowFieldFrequency 0.207`), `tails_count 7, story_count 5`, `MeshStandardNodeMaterial` emissive for bloom, head enlarged `+0.5`.

---

## 5. (e) Official three.js examples (fetched from `mrdoob/three.js@dev`)

Note: `webgpu_points.html` does not exist on `dev` (404). Related existing files: `webgpu_compute_particles{,_fluid,_rain,_snow}`, `webgpu_compute_points`, `webgpu_instance_points`, `webgpu_instance_sprites`, `webgpu_particles`, `webgpu_particles_soft`, `webgpu_skinning_points`, `webgpu_sprites`, `webgpu_tsl_compute_attractors_particles`, `webgpu_tsl_vfx_linkedparticles`, `webgpu_tsl_galaxy`, `webgl_gpgpu_birds`, `webgl_points_*`, `webgl_custom_attributes_points`.

| Example | Particles | Storage | Material / primitive | Sizing | Alpha / softness | Blending / depth |
|---|---|---|---|---|---|---|
| `webgpu_compute_particles` | 200,000 | `instancedArray(count,'vec3')` ×3 | `SpriteNodeMaterial` on `new Sprite(material)`, `particles.count = N`, `frustumCulled=false` | `scaleNode = uniform(0.12)` world units | `opacityNode = shapeCircle()` + `alphaToCoverage = true` (MSAA edge AA, no sorting) | `transparent`, default blend. Physics: `gravity −0.00098`, `bounce 0.8`, `friction 0.99`, pointer hit `distArea = max(3−dist,0)*0.01*(hash*1.5+0.5)` |
| `webgpu_tsl_compute_attractors_particles` | 2^18 = 262,144 | `instancedArray` pos/vel | `SpriteNodeMaterial({blending: AdditiveBlending, depthWrite:false})` on `InstancedMesh(PlaneGeometry(1,1))` | `scaleNode = hash.remap(0.25,1) * uniform(0.008)` | colour by speed `smoothstep(0,0.5, speed/maxSpeed)` mix `#5900ff → #ffa575` | fixed `delta = 1/60`, `maxSpeed 8`, `velocityDamping 0.1`, spinning force `axis*gravityStrength*2.75 cross toAttractor`, wrap box `mod(p+half, extent)−half` |
| `webgpu_compute_points` | 300,000 | `instancedArray(count,'vec2')` | `PointsNodeMaterial` on `Points` with a **1-vertex geometry + `drawRange.count = 1` → instanced points**, `mesh.count = N`; requires `requiredLimits.maxStorageBuffersInVertexStage: 1` | default 1 px | — | pointer eraser radius 0.1 |
| `webgpu_instance_points` | curve points | `InstancedBufferAttribute` + `StorageInstancedBufferAttribute` sizes | `PointsNodeMaterial({ colorNode, opacityNode: shapeCircle(), positionNode: instancedBufferAttribute(pos), sizeNode: instancedBufferAttribute(size), sizeAttenuation:false, alphaToCoverage:true })` on `new Sprite(material)` | **pixel sizes** 6–20 pulsing via compute | `shapeCircle()` | — |
| `webgpu_skinning_points` | mesh vertex count | `instancedArray(...).setPBO(true)` | `PointsNodeMaterial`, `sizeAttenuation=false`, `alphaTest 0.5`, `opacityNode = shapeCircle()` | `sizeNode = speed.length().exp().min(5).mul(5).add(1)` | colour by speed mix `#0066ff → #ff9000` | compute inside `positionNode` via `Fn(...)().compute(count).onInit(...)` |
| `webgpu_particles_soft` | 50 smoke sprites | `range()` nodes | `SpriteNodeMaterial`, `depthWrite=false` | `scaleNode = range(6,8)*lifeTime.max(0.3)` | **`softParticles({opacity, distance: 1, contrast: 2})`** from `three/addons/tsl/utils/SoftParticles.js` | fade in/out `life.smoothstep(0,0.3)*life.smoothstep(1,0.7)` |
| `webgpu_particles` | 2000 smoke + 1000 fire | `range()` nodes | `SpriteNodeMaterial` on `Mesh(PlaneGeometry)` with `.count` | `scaleNode = range(0.3,2)*lifeTime.max(0.3)` | `opacityNode = tex.a * life.oneMinus()`, fire `AdditiveBlending`, `renderOrder 1`; optional `IndirectStorageBufferAttribute` indirect draw | `fakeLightEffect = positionLocal.y.oneMinus().max(0.2)` |
| `webgpu_tsl_galaxy` | 20,000 | `range()` | `SpriteNodeMaterial({depthWrite:false, blending: AdditiveBlending})` on `InstancedMesh(PlaneGeometry)` | `scaleNode = range(0,1)*uniform(0.08)` | **`alpha = float(0.1).div(uv().sub(0.5).length()).sub(0.2)`** (hyperbolic glow disc, same family as Journey's `0.05/d − 0.1`) | — |
| `webgpu_tsl_vfx_linkedparticles` | 8192 | `storage(StorageInstancedBufferAttribute(n,4),'vec4')` life in `.w` | `SpriteNodeMaterial` Additive, `depthWrite=false`, `rotationNode = atan(vel.y, vel.x)` | `scaleNode = vec2(uniform(1))` on `PlaneGeometry(0.05)` | `opacityNode = step(len(uv−0.5),0.5) * life`; colour pulse `pcurve(...)*10+1` × `pcurve(1−life, 8, 1)` | turbulence `mx_fractal_noise_vec3(pos*0.5, 2, 2.0, 0.5, 0.5)*(life+0.01)`, friction 0.01, `dt = deltaTime*0.1`; nearest-2 links as quads; post `bloom(scenePassColor, 0.75, 0.1, 0.5)` via `RenderPipeline` |
| `webgpu_sprites` | 200 | per-object | `SpriteNodeMaterial`, `rotationNode = userData('rotation')`, `scene.fogNode = fog(color, rangeFogFactor(1500,2100))` | CPU `sprite.scale` | `opacityNode = tex.a` | — |
| `webgl_gpgpu_birds` | 32² = 1024 | `GPUComputationRenderer` pos/vel textures, `RepeatWrapping` | ShaderMaterial birds read `texturePosition` via `reference` uv | — | — | boids: zoneRadius = sep+align+coh (20/20/20), `separationThresh = sep/zone`, `SPEED_LIMIT 9`, predator radius 150, delta capped at 1 s |
| `webgl_points_billboards` | 10,000 | BufferGeometry | `PointsMaterial({size:35, sizeAttenuation:true, map: disc.png, alphaTest:0.5, transparent:true})` | attenuated | `alphaTest 0.5` (no sorting needed) | `FogExp2(0x000000, 0.001)` |
| `webgl_custom_attributes_points` | 100,000 | attributes `customColor`, `size` | ShaderMaterial `spark1.png`, `AdditiveBlending, depthTest:false, transparent` | `size = 14 + 13*sin(0.1*i + t)` | — | — |

**`SoftParticles.js` (three/addons/tsl/utils) verbatim core:**
```js
const sceneViewZ = perspectiveDepthToViewZ( viewportDepth, cameraNear, cameraFar ).toConst();
const depthDelta = positionView.z.sub( sceneViewZ ).div( distance ).saturate();
return opacity.mul( contrastCurve( depthDelta, contrast ) );   // NVIDIA Lorach symmetric contrast curve: fold at 0.5, pow(power)
```
Default `distance 1` (world units), `contrast 2`. Uses `viewportDepthTexture()` → opaque scene depth must be rendered before the particle pass.

**Other point-sizing / softness formulas collected:**
- Stock `PointsMaterial` (WebGL & Lusion's inlined copy): `gl_PointSize = size; if (perspective) gl_PointSize *= scale / -mvPosition.z;` where `scale = renderer height/2` (drawingBufferHeight * 0.5).
- Journey / Heckel / DGFX: `gl_PointSize = base * uResolution.y * (1.0 / -viewPosition.z)` (resolution-independent).
- Lusion: **quad instances**, world-size `0.009*(1+blur^1.5*8)` clamped to **min 12 px** with **energy conservation `subpixelMultiplier = (basePointSize/pointSize)^1.5`** (so tiny far points don't over-brighten when clamped). Fragment edge `linearStep(1, 1-range-fwidth(d), d)` (analytic AA, softness grows with blur).
- WebGL soft particles (forum https://discourse.threejs.org/t/points-transparent-textures-depth-artifacts-soft-particles/5927 , Mugen87 fiddle https://jsfiddle.net/m7tvxpbs/): `DepthTexture(UnsignedShortType, Nearest)` on a `WebGLRenderTarget`, `#include <packing>`, `viewZ = perspectiveDepthToViewZ(fragCoordZ, near, far); depth = viewZToOrthographicDepth(viewZ, near, far)`, `alpha *= smoothstep(0, falloff, sceneDepth − particleDepth)`, material `depthTest:false, depthWrite:false`. Also dev.to keaukraine "Implementing soft particles in WebGL" https://dev.to/keaukraine/implementing-soft-particles-in-webgl-and-opengl-es-3l6e (`uCameraRange`, `uTransitionSize`, source https://github.com/keaukraine/webgl-buddha/blob/master/js/app/SoftDiffuseColoredShader.js); NVIDIA whitepaper https://developer.download.nvidia.com/whitepapers/2007/SDK10/SoftParticles_hi.pdf .
- Codrops Blurry (Domenicobrz/Blurry, https://tympanus.net/codrops/2019/10/01/simulating-depth-of-field-with-particles-using-the-blurry-library/): DoF by **accumulating millions of points randomly displaced in a disc whose radius ∝ |z − focalDistance|** (`pointsPerFrame 50,000`, `bokehStrength 0.02`, `cameraFocalDistance 100`, `focalPowerFunction`, `exposure`, optional bokeh texture) — the accumulation-based alternative to Lusion's per-particle blur radius.

---

## 6. (f) Depth-map / 2.5D portrait effects

- Codrops "How to Create a Fake 3D Image Effect with WebGL" (Robin Delaporte, 2019) https://tympanus.net/codrops/2019/02/20/how-to-create-a-fake-3d-image-effect-with-webgl/ — demo https://tympanus.net/Tutorials/Fake3DEffect/ — depth map painted in Photoshop (brighter = closer); **entire effect:** `vec4 depth = texture2D(depthImage, uv); gl_FragColor = texture2D(originalImage, uv + mouse * depth.r);` (+ eased mouse, small threshold like ±0.03). CodePen https://codepen.io/robin-dela/pen/vaQQNL , gists https://gist.github.com/tupham81/2c65475ad912073ccc9b5e9f0c412dc7 , https://gist.github.com/bozzin/5895d97130e148e66b88ff4c92535b59 ; WebGL Fundamentals Q&A https://webglfundamentals.org/webgl/lessons/webgl-qna-drawing-2d-image-with-depth-map-to-achieve-pseudo-3d-effect.html .
- flavioow/threejs-depth-portrait — https://github.com/flavioow/threejs-depth-portrait — Next.js + R3F; five maps `diffuse.png, alpha.png, depth.png, normal.webp, roughness.webp`; vertex shader displaces the plane by depth (`uVertexDepthStrength`), fragment shifts UV by `uMotion * depth^uDepthPower` with edge falloff and alpha protection (`uUvParallaxStrength`); camera `fov 25, z 2.2`, `NoToneMapping`; docs in `docs/en/guide/*.md` (image prep via background remover + duotone for alpha).
- Codrops "Relighting Images with Depth Maps and Three.js" (Aug 19 2026, TSL) https://tympanus.net/codrops/2026/08/19/relighting-images-with-depth-maps-and-three-js/ — repo https://github.com/DGFX/codrops-relightning-images — depth from **Depth Anything 3** (or author's tool depth.fojcikdominik.com); normal from depth gradient:
  ```js
  const depthGradient = Fn(([vUv, step]) => {
    const left = smoothDepthNode.sample(vUv.sub(alongX)).r, right = smoothDepthNode.sample(vUv.add(alongX)).r
    const bottom = smoothDepthNode.sample(vUv.sub(alongY)).r, top = smoothDepthNode.sample(vUv.add(alongY)).r
    return vec2(right.sub(left), top.sub(bottom)).mul(0.5) })
  ```
  `MeshPhongNodeMaterial` with generated normals + screen-space shadow ray march (`SHADOW_STEPS`, `uShadowSoftness`, `SOFTNESS_GROWTH`). **Directly reusable to give SerSan's photo-particles per-point normals (→ rim light) without a scan.**
- Codrops "WebGPU Scanning Effect with Depth Maps" (Mar 2025) https://tympanus.net/codrops/2025/03/31/webgpu-scanning-effect-with-depth-maps/ .
- Better Programming "Point Clouds Visualization With Three.js" (Adam Cerny) https://betterprogramming.pub/point-clouds-visualization-with-three-js-5ef2a5e24587 — photo → depth (MiDaS; recommends TensorFlow **Portrait Depth API** for faces) → points (x,y from pixel, z from depth) → Beier–Neely morphing between faces → parallax. (Paywalled; only the abstract could be verified.)
- Depth tools: Depth Anything (v2/v3), MiDaS, TF.js Portrait Depth API (on-device, face-specialised), depthkit.js https://github.com/davidm-public/depthkit.js (volumetric video), thygate/depthmap-viewer-three https://github.com/thygate/depthmap-viewer-three .
- three.js forum "Custom depth map for Point/Particle" https://discourse.threejs.org/t/custom-depth-map-for-point-particle/89203 (sphere-impostor shadows for `Points` — unanswered).

---

## 7. Reverse engineering: lusion.co/about "TEAM" (production bundle, Aug 2026)

Source: `https://lusion.co/_astro/hoisted.CUO_IjfL.js` (1,251,728 bytes; three.js r16x inlined; classes `AboutHeroFaces`, `AboutHeroLetters`, `AboutHeroLines`, `AboutHeroParticlesSimulation`, `AboutHeroParticles`, `AboutHeroGround`, `AboutHeroFog`, `AboutHeroHalo`, `aboutHeroPerson`, `AboutPageHeroEfx`, `AboutPageHeroEfxPrepass`). Asset root `/assets/team/` (CDN `https://lusion.dev` when on lusion.co). `team.json` lists 7 people (edan, ffi, pierre, yannic, paul, andrii, sunny). Three.js forum thread asking about the page: https://discourse.threejs.org/t/background-animation-on-lusion-co-about-page/62610 (answer: "huge topic… Edan Kwan is a rendering god" — no details; this dossier is the first public breakdown I could find). Related Awwwards case study (v1 site) https://www.awwwards.com/case-study-for-lusion-by-lusion-winner-of-site-of-the-month-may.html describes the same **16-bit integer packing + PNG/LZW** asset strategy (cloth anim 983 KB desktop / 246 KB mobile).

### 7.1 Data format (`/assets/team/<id>.buf`, 82,280 bytes for `edan`)
Custom binary: `uint32 headerLen` + JSON header + packed attributes.
```json
{"vertexCount":8192,"indexCount":0,"attributes":[
 {"id":"position","needsPack":true,"componentSize":3,"storageType":"Uint16Array",
  "packedComponents":[{"from":-0.999023438,"delta":1.998535157},{"from":-0.999511719,"delta":1.998535157},{"from":0,"delta":1}]},
 {"id":"nShade","needsPack":false,"componentSize":4,"storageType":"Uint8Array"}],"meshType":"Points"}
```
Decoded statistics (numpy): x∈[−1,1], y∈[−1,1], z∈[0,1] with z percentiles 5/25/50/75/95 = 0.00/0.44/0.79/0.90/0.96 (mean 0.62); `nShade.xyz*2−1` = normal, normal.z percentiles 0.18/0.46/0.71/0.88/0.98, **only 1.1 % back-facing** → **front-facing relief (bust seen from the front), not a 360° scan**; `nShade.w` = baked shade, 25 % of points are exactly 0 (hair/dark areas → those points render invisible: `step(0.003, light)` collapses the quad). 8192 points/person ≈ 48 KB positions + 32 KB normals/shade.

### 7.2 Runtime setup (`AboutHeroFaces`)
- Constants: `PARTICLE_COUNT = 8192`, `SIM_TEXTURE_WIDTH = 128`, `SIM_TEXTURE_HEIGHT = 64`, `MAX_FACE_NUM = 2`.
- Positions → float `DataTexture` 128×64 (`w = 1/PARTICLE_COUNT`), nShade → Uint8 DataTexture. **No GPGPU simulation for the faces** (the sim buffers `u_simCurrPosLifeTexture` belong to the separate hero particle stream, §7.6).
- Geometry: `InstancedBufferGeometry` from `PlaneGeometry(1,1)`, instanced attributes `a_simUv (vec2)`, `a_rands1 (vec4)`, `a_rands2 (vec4)`.
- Two `Mesh`es (current + next person) with `ShaderMaterial`: `depthTest:false, depthWrite:false, transparent, CustomBlending Add One/One` (pure additive incl. alpha), `extensions.derivatives`.
- Container: `scale (27.5, 27.5, 16)` (z squashed to 58 % → relief flattened), `rotation.y = π+0.2, rotation.x = 0.1`, `position (0,34,25)`.
- Per frame (`update`): `u_showRatio = showRatio`; mouse unprojected to a plane at z=75 from the camera, converted into face space → **`u_mouse` is used as the light position**; small parallax tilt `rotation += clamp(mouse*0.03, ±0.05)`. Transition `t = transitionRatio`: mesh0 `activeRatio = 1−t, position.x = −1.5t, z = −2t, rotation.y = −0.3t, rotation.x = 0.4t`; mesh1 mirrored `(t−1)`; `u_glitchThreshold = fit(activeRatio, 0.4, 1, 0, 0.9)`; every frame `u_glitchOffset = random()*1000`, `u_glitchStrength = random()`.

### 7.3 Face vertex + fragment shader (verbatim, minified GLSL reformatted)
```glsl
// vert$3
uniform sampler2D u_positionTexture, u_norShadeTexture; uniform float u_activeRatio, u_showRatio, u_time, u_glitchOffset, u_glitchStrength, u_glitchThreshold;
uniform vec3 u_mouse; uniform vec2 u_resolution; attribute vec2 a_simUv; attribute vec4 a_rands1, a_rands2;
void main(){
  vec3 basePos = texture2D(u_positionTexture, a_simUv).xyz; vec3 pos = basePos;
  float yRatio = basePos.y*0.5+0.5;
  float showRatio = smoothstep(a_rands1.x*0.2 + yRatio*0.4, 0.4 + a_rands1.y*0.2 + yRatio*0.4, u_showRatio); // bottom-up, randomised reveal
  pos *= 1.3;
  pos += (simplexNoiseDerivatives(vec4(basePos*8., u_time)).yzw*0.2 + vec3(1.*yRatio, 0.0, -1.)) * (1.-showRatio); // scatter when hidden
  vec4 norShade = texture2D(u_norShadeTexture, a_simUv);
  float depth = clamp(1.-pos.z, 0.0, 1.0);
  vec3 nor = norShade.xyz*2.-1.;
  vec3 worldPosition = (modelMatrix*vec4(pos,1.0)).xyz;
  vec3 viewNormal = normalMatrix*normalize(nor); vec3 worldNormal = inverseTransformDirection(viewNormal, viewMatrix);
  vec3 lightDir = normalize(u_mouse - worldPosition); float distToLight = distance(u_mouse, worldPosition);
  float light = norShade.w*1.25;                                         // baked shade
  float diff = linearStep(0.35, 1.0, dot(worldNormal, lightDir)) / sqrt(distToLight*0.1);
  light *= diff + 0.6;  light += (0.05 + diff*0.15) * smoothstep(0.0, 0.005, norShade.w);
  float frontFaceMultiplier = linearStep(-0.2, 0.0, viewNormal.z);       // silhouette/back points fade out
  light *= frontFaceMultiplier;
  v_blurriness = min(1.0, abs(depth - (1.-u_activeRatio*showRatio)*0.5)*2.5) * (2.-showRatio);   // fake DoF: focus plane moves with activeRatio
  float basePointSize = 0.009*(1.+pow(v_blurriness,1.5)*8.)*frontFaceMultiplier;
  float pointSize = max(basePointSize, 12./u_resolution.y);              // min 12 px
  float subpixelMultiplier = pow(basePointSize/pointSize, 1.5);          // energy conservation
  pos.xy += position.xy * pointSize * step(0.003, light) * linearStep(0.0, 0.75, u_activeRatio);   // billboard quad in face space
  vec4 verticalRands = hash42(vec2(floor(basePos.y*3.+cos(basePos.y*3.+u_glitchOffset)*2.+u_glitchOffset), 0.))*u_glitchStrength;
  float glitchWeight = verticalRands.x*step(u_glitchThreshold, verticalRands.y);
  pos.x += (verticalRands.z*verticalRands.z)*glitchWeight*0.35*cos(basePos.y+u_glitchOffset);        // row glitch
  gl_Position = projectionMatrix*modelViewMatrix*vec4(pos,1.0);
  v_color = mix(vec3(1.0), (viewNormal.xzy*0.5+0.5)*vec3(1.0,0.5,2.0), glitchWeight);
  light *= (1.+glitchWeight*1.5); light += 0.1*glitchWeight;
  float scanline = smoothstep(0.04, 0., abs(fract(u_time*-0.3 - basePos.y*.5 + .5)));                  // sweeping scanline
  light += scanline*(0.25*norShade.w*(1.0-light) + smoothstep(0.03, 0., abs(viewNormal.z)));           // + rim on silhouette
  v_shade = min(1.0, light*(1.-v_blurriness*0.5))*subpixelMultiplier*showRatio;
  v_toCenter = (uv-.5)*2.; v_uv = uv; v_showRatio = showRatio; }
// frag$6
void main(){ float shade = v_shade; float d = length(v_toCenter); float range = v_blurriness*5.;
  float brightness = linearStep(1., 1.-range-fwidth(d), d);           // soft disc, softer when blurred
  shade *= brightness*(1.25 - v_blurriness*v_shade);
  gl_FragColor = vec4(shade)*v_showRatio*v_showRatio;
  gl_FragColor.a *= pow(1.-v_blurriness, 3.)*0.8*linearStep(0.8, 1.0, v_showRatio*v_showRatio); }
```
Post: `AboutPageHeroEfx` applies **colorBurn/colorDodge** tint (`scene: burn #00f0ff α0.15, dodge #005aff α0.12; HUD: burn #79a8ff α1, dodge #a5ff44 α0.7`) — the cyan/blue glow is a post grade of a greyscale render, not per-particle colour. Prepass has motion-blur (16 taps) and disc blur (8 taps golden-angle) options.

### 7.4 Glyph rain (`AboutHeroLetters`, verbatim)
- Asset `/assets/models/about/letter_placements.buf`: 196 points with attributes `position` (x∈[−86.8,82.6], y∈[−0.85,16.1], z∈[−8.1,97]), `density` (Uint8), `dof` (Int16 0..1.64).
- 4 `InstancedBufferGeometry` groups (49 strips each) of `PlaneGeometry(1,1).translate(0,.5,0).rotateY(π)`; `instanceRands (vec4)`, `instancePos`, `instanceDensity`. Material additive One/One, no depth.
- Off-screen: render group0 → `blur(16px,0.5)` → group1 → `blur(8)` → group2 → `blur(4)` → group3 (far groups drawn first & blurred more = depth of field), then composited additively at `renderOrder 10`.
```glsl
// vert$2
float charCount = mix(50., 100., instanceRands.y);
pos.xy *= vec2(1., 6./5.*charCount);                              // strip height = charCount rows of 1.2
v_charUv = vec2(1.-position.x, position.y*charCount) + vec2(.5, 0.);
v_charUv.y -= u_time*mix(2., 10., instanceRands.x);               // fall speed 2–10 rows/s
pos = pos*0.75 + instancePos;  v_opacity = mix(.5, 1., instanceDensity)*u_showRatio;
// frag$5
float fade = 1.-linearStep(15., 66., v_worldPosition.z);
float MAX_CHAR = 42.; float charIdx = floor(mod(v_charUv.y, MAX_CHAR));
float charTime = u_time*mix(1., 2., v_instanceRands.y + hash43(vec3(charIdx, -100., v_instanceRands.z)).x);
vec4 charRands = hash43(vec3(charIdx, v_instanceRands.w, floor(charTime*-2.)));   // re-roll glyph ~2×/s
charIdx = mod(charIdx + floor(charRands.x*MAX_CHAR), MAX_CHAR);
vec2 charUv = vec2((v_charUv.x+charIdx)/MAX_CHAR, mod(v_charUv.y, 1.));           // font.png = 42 glyphs in a row
float shade = texture2D(u_letterTexture, charUv).r;
gl_FragColor = vec4(shade)*charRands.w*charRands.y*v_opacity;
gl_FragColor *= smoothstep(0.5,0.35,abs(v_uv.y-.5)) * (0.5+fade*0.5) * (0.3+v_instanceRands.z*1.25)
             * smoothstep(100.,150., mod(v_charUv.y - 200.*v_instanceRands.y, 200.));            // 50-row bright window every 200 rows
gl_FragColor.a *= 3.;
```
Compare with the reference implementation Rezmason/matrix (**3,819 ★**, https://github.com/Rezmason/matrix, REGL + WebGPU beta, previous three.js branch): stationary glyph grid, raindrop = `1 - fract((glyphPos.y*0.01 + columnTime)/raindropLength)` with `wobble(x) = x + 0.3 sin(√2 x) + 0.2 sin(√5 x)`, cursor = `brightness > brightnessBelow`, glyph cycling by `cycleSpeed`, MSDF glyph atlas, bloom then palette tone-map; shaders `shaders/glsl/rainPass.raindrop.frag.glsl`, `rainPass.symbol.frag.glsl`, `rainPass.frag.glsl`, WGSL ports in `shaders/wgsl/`.

### 7.5 Flowing luminous lines at the bottom (`AboutHeroLines`, verbatim)
- Asset `/assets/models/about/terrain_lines.buf`: 41 polylines (index thresholds `[60,245,806,…,11832]`), built on CPU into **3-sided tubes** (`SEGMENT_COUNT = 3`, quaternion frame rotated by `2π/3`), attributes `t` (arc length), `totalLength`, `lineId`. Material: `CustomBlending, blendEquation: MaxEquation, One/One` (crossings never exceed 1), `renderOrder 15`.
```glsl
// vert$7: every 4th ring is thicker (0.1 vs 0.04) → dashes of bright beads
float yIndex = floor(position.y+.5); v_thicknessRatio = step(mod(yIndex,4.), 0.5);
vec3 pos = position + normal*mix(0.04, 0.1, v_thicknessRatio);   gl_Position.z -= 0.1/gl_Position.w;
// frag$a: periodic 1-D Perlin scrolling along the line
float t = mod(v_t - u_time*2., v_totalLength);  float noiseScale = 0.25;
float n = pnoise(vec2(t*noiseScale, 0.), vec2(v_totalLength*noiseScale, 100.));
float shade = mix(0.3 + smoothstep(0., 0.-fwidth(n), n)*0.6, 1., v_thicknessRatio);
shade *= linearStep(50., -20., v_worldPosition.z);
gl_FragColor = vec4(shade,0.,0.,1.) * step(v_totalLength - v_t, v_totalLength*u_hudRatio);   // draw-on with hudRatio
gl_FragColor.b = linearStep(15., 66., v_worldPosition.z); gl_FragColor.r *= .85;
```
(Generic contour-line alternative, Codrops Feb 2026 product-grid background: `n = snoise(uv*uScale + uTime*0.05); lines = fract(n*5.0); pattern = smoothstep(0.5−w,0.5,lines) − smoothstep(0.5,0.5+w,lines)`, `w = 0.03`, film grain `±0.075` — https://tympanus.net/codrops/2026/02/24/from-flat-to-spatial-creating-a-3d-product-grid-with-react-three-fiber/ .)

### 7.6 Hero particle stream (background, for completeness)
`AboutHeroParticlesSimulation`: ping-pong float RT 128×192 (128×128 mobile) `posLife`; default positions in a spherical shell `r = 0.25 + cbrt(rand)*0.5` around the light; sim = life decay `(0.5+u_noiseStableFactor)*dt`, respawn, **spin around a time-varying axis** `cross(axis, toLight)`, plus **2-octave curl noise from simplex-noise derivatives** (`curl(p*(0.4+0.3*stable), noiseTime, persistence 0.2)`). Rendered as instanced LOD spheres (`sphere_l/m/s/xs.buf`) sized `0.06` (0.175 for the first column = emissive) × `(0.5+rand*0.5)` with life-in/out `linearStep(0,0.1,life)*linearStep(1,0.9,life)`, lit from a **light field** (`sampleLightField` of a sliced 3-D texture: indirect diffuse/specular/refraction), screen-space motion vectors (`motionVert` head/tail quads) → 16-tap motion blur, and volumetric `getScatter` (analytic line-light scattering `s*(atan((d+b)s) − atan(bs))`). Ground: `terrain.buf` + `terrain_shadow_light_height.webp` with 8-sample blue-noise ray-marched shadow accumulation. Fog: 32 instanced noise-driven cards.

---

## 8. Concrete recommendations for SerSan (derived from the above)

1. **Data, not runtime sampling.** Generate per-founder `Float32/Uint16` point sets offline (8–16k points): (i) alpha matte (background removal) → blue-noise/stratified sampling *inside the matte only*; (ii) z from Depth Anything / Portrait-Depth (normalised 0..1, Lusion squashes z to 58 %); (iii) normals from depth gradient (Codrops `depthGradient`), shade = luminance × AO; pack as Lusion does (Uint16 pos + Uint8 nShade ≈ 80 KB/person) or as 2 RGBA8 textures (UntilLabs high/low bytes). Holes disappear because density is defined by the matte, not by brightness.
2. **Render as instanced quads (`SpriteNodeMaterial` / `InstancedMesh`)**, additive One/One, `depthTest:false`, size in world units clamped to a pixel minimum with the `(base/clamped)^1.5` energy term, analytic AA edge `linearStep(1, 1-range-fwidth(d), d)`, `frontFaceMultiplier = linearStep(-0.2, 0, viewNormal.z)`; light = mouse (or a slow orbiting light) via `dot(N,L)`; DoF = blur radius ∝ |z − focus| exactly as Lusion. Grade cyan/violet in post (colorDodge/colorBurn) instead of per-particle colour.
3. **Morph A→B→C→D** with lesson-40 noise-staggered `smoothstep(delay, delay+0.4, uProgress)` in a TSL compute or directly in `positionNode`; keep Lusion's two-mesh cross-fade + `showRatio` bottom-up reveal for the entry/exit; optional lesson-41 flow field only while `activeRatio < 1`.
4. **Glyph rain**: 150–250 instanced strips with a 42-glyph atlas, 4 depth groups with progressive blur, additive; or port Rezmason's raindrop function to TSL.
5. **Bottom lines**: bake a few dozen polylines (Blender curves) → tube/ribbon geometry, scroll 1-D periodic noise along arc length, `MaxEquation` blending, every 4th segment thicker.
6. WebGPU specifics already validated by official examples: `alphaToCoverage` on `shapeCircle()` for AA without sorting; `softParticles()` if the heads ever intersect the rail geometry; `renderer.compute()` per frame; `instancedArray(...).toAttribute()` for `positionNode`.

---

## 9. Full URL index
Official three.js: https://threejs.org/examples/webgpu_compute_particles.html · https://threejs.org/examples/webgpu_tsl_compute_attractors_particles.html · https://threejs.org/examples/webgpu_compute_points.html · https://threejs.org/examples/webgpu_instance_points.html · https://threejs.org/examples/webgpu_particles_soft.html · https://threejs.org/examples/webgpu_particles.html · https://threejs.org/examples/webgpu_skinning_points.html · https://threejs.org/examples/webgpu_sprites.html · https://threejs.org/examples/webgpu_tsl_galaxy.html · https://threejs.org/examples/webgpu_tsl_vfx_linkedparticles.html · https://threejs.org/examples/webgl_gpgpu_birds.html · https://threejs.org/examples/webgl_points_billboards.html · https://threejs.org/examples/webgl_custom_attributes_points.html · https://github.com/mrdoob/three.js/blob/dev/examples/jsm/tsl/utils/SoftParticles.js · https://threejs.org/docs/examples/en/math/MeshSurfaceSampler.html
Repos: https://github.com/brunoimbrizi/interactive-particles · https://github.com/MisterPrada/logo-particles-template · https://github.com/MisterPrada/morph-particles · https://github.com/MisterPrada/matrix-sentinels · https://github.com/hnrq/threejs-journey · https://github.com/sebastien-lempens/r3f-flow-field-particles · https://github.com/DGFX/codrops-dreamy-particles · https://github.com/DGFX/codrops-relightning-images · https://github.com/flavioow/threejs-depth-portrait · https://github.com/blakecarroll/particle-saga · https://github.com/activesphere/particles-webgl · https://github.com/paullewis/Photo-Particles · https://github.com/ektogamat/threejs-particle-skull · https://github.com/edisonabdiel/SurfaceSampling · https://github.com/Kshitij978/Three.js-Point-cloud-morphing-effect · https://github.com/mmdalipour/particle-morph · https://github.com/wonjyou/morphing-particle-swarm · https://github.com/edankwan/The-Spirit · https://github.com/lusionltd/WebGL-Scroll-Sync · https://github.com/Rezmason/matrix · https://github.com/Makio64/advanced-threejs-tsl-webgpu-rendering · https://github.com/juniorxsound/Particle-Curl-Noise · https://github.com/lightest/gpuparticles · https://github.com/Domenicobrz/Blurry · https://github.com/sparkjsdev/spark · https://github.com/mkkellogg/GaussianSplats3D · https://github.com/keaukraine/webgl-buddha · https://gist.github.com/JT5D/eeb91e7f320bc56e85d4
Articles: https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/ · https://tympanus.net/codrops/2025/12/10/simulating-life-in-the-browser-creating-a-living-particle-system-for-the-untillabs-website/ · https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/ · https://tympanus.net/codrops/2025/05/05/matrix-sentinels-building-dynamic-particle-trails-with-tsl/ · https://tympanus.net/codrops/2021/08/31/surface-sampling-in-three-js/ · https://tympanus.net/codrops/2019/02/20/how-to-create-a-fake-3d-image-effect-with-webgl/ · https://tympanus.net/codrops/2026/08/19/relighting-images-with-depth-maps-and-three-js/ · https://tympanus.net/codrops/2019/10/01/simulating-depth-of-field-with-particles-using-the-blurry-library/ · https://tympanus.net/codrops/2026/02/24/from-flat-to-spatial-creating-a-3d-product-grid-with-react-three-fiber/ · https://blog.maximeheckel.com/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/ · https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/ · https://wawasensei.dev/courses/react-three-fiber/lessons/tsl-gpgpu · https://threejs-journey.com/lessons/particles-morphing-shader · https://threejs-journey.com/lessons/gpgpu-flow-field-particles-shaders · https://offscreencanvas.com/issues/003/ · https://www.60fps.fr/en/people · https://dev.to/keaukraine/implementing-soft-particles-in-webgl-and-opengl-es-3l6e · https://betterprogramming.pub/point-clouds-visualization-with-three-js-5ef2a5e24587
Forum: https://discourse.threejs.org/t/background-animation-on-lusion-co-about-page/62610 · https://discourse.threejs.org/t/points-transparent-textures-depth-artifacts-soft-particles/5927 · https://discourse.threejs.org/t/3d-point-cloud-for-my-head/7367 · https://discourse.threejs.org/t/morph-image-particle-creating-a-particle-based-face-transition-effect/78794 · https://discourse.threejs.org/t/custom-depth-map-for-point-particle/89203
Lusion: https://lusion.co/about/ · https://lusion.co/_astro/hoisted.CUO_IjfL.js · https://lusion.co/assets/team/team.json · https://lusion.co/assets/team/edan.buf · https://lusion.co/assets/models/about/letter_placements.buf · https://www.awwwards.com/case-study-for-lusion-by-lusion-winner-of-site-of-the-month-may.html
