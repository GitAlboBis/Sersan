# Lusion.co/about "TEAM" — live reverse engineering (2026-08-27, main session)

Source: bundle `https://lusion.co/_astro/hoisted.CUO_IjfL.js` (1.25 MB, three.js WebGL2, Astro), assets on `https://lusion.dev/assets/...`, decoded `team/edan.buf`. Everything below is **confirmed from the bundle/assets** unless marked.

## 1. Assets loaded by the about page (from performance.getEntriesByType)
- `team/team.json` — 7 members `{id,name,role}` (edan, ffi, pierre, yannic, paul, andrii, sunny).
- `team/<id>.buf` — one per member, lazy-loaded (`aboutHeroFaces.load(id)`), 82 KB each.
- `textures/font.png` 210×6 px — glyph atlas, 42 chars (`ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789...`), 5×6 px per glyph → matrix rain.
- `textures/LDR_RGB1_0.png` — blue-noise 128² (dithering / stochastic sampling).
- `models/about/letter_placements.buf` (positions + density of rain columns), `terrain.buf`, `terrain_lines.buf` (contour polylines), `camera_spline.buf`, rocks, spheres, `bg_box.buf`.
- `textures/about/terrain_shadow_light_height.webp` 2048² (R=shadow, G=light, B=height) for the ground.
- (person*.webp = UV atlas of the astronaut character used elsewhere on the page — NOT the bust.)

## 2. The `.buf` head format (decoded edan.buf)
Header: `uint32 jsonLen` + JSON `{vertexCount:8192, indexCount:0, meshType:"Points", attributes:[{id:"position", needsPack:true, componentSize:3, storageType:"Uint16Array", packedComponents:[{from,delta}×3]}, {id:"nShade", needsPack:false, componentSize:4, storageType:"Uint8Array"}]}` then raw payload (8192×3 uint16 positions dequantised as `from + u/65535*delta`, then 8192×4 uint8 nShade).
- position: x,y ∈ [-1,1], z ∈ [0,1] (z = depth toward camera; container scale (27.5, 27.5, 16)).
- nShade.xyz = normal packed `n*0.5+0.5`; nShade.w = **baked shade/AO** (mean 0.159).
- **Not a grid**: 974 distinct x / 988 distinct y bins, mean nearest-neighbour distance 0.020 in the [-1,1] box → blue-noise/Poisson surface sampling of a **3D head scan** (photogrammetry). Side view shows a full head profile (ear, jaw, neck). Only 88/8192 back-facing normals → the front hemisphere was kept.
- **8192 points only** (SIM 128×64). Density on screen comes from point SIZE, not count.

## 3. Head render pipeline — `class AboutHeroFaces` (verbatim logic)
- Geometry: `InstancedBufferGeometry` from `PlaneGeometry(1,1)`, 8192 instances, attributes `a_simUv` (lookup into 128×64 data textures), `a_rands1/a_rands2` (vec4 random).
- Per member two DataTextures: `u_positionTexture` (float RGBA, xyz + 1/N) and `u_norShadeTexture` (uint8 RGBA).
- Two meshes (`MAX_FACE_NUM=2`): current + next, so a transition cross-fades two point clouds moving apart: `x = -1.5t, z = -2t, rot.y = -0.3t, rot.x = 0.4t` (next face mirrored from t−1), `u_activeRatio = 1−t` (current) / `t` (next), glitch threshold `fit(activeRatio, .4, 1, 0, .9)`.
- Material: `depthTest:false, depthWrite:false, transparent, additive (One,One)`, `derivatives` on. Scene post: bloom (amount 4, radius .25, threshold .8, smoothWidth .3) + colour burn/dodge grade (`#00f0ff` burn α.15, `#005aff` dodge α.12; HUD state `#79a8ff`/`#a5ff44`).
- Mouse: unprojected to a world point 75 units along the ray → `u_mouse` is used as a **point light** AND drives a tiny parallax tilt (±0.05 rad).

### Vertex shader (essential lines)
```glsl
vec3 basePos = texture2D(u_positionTexture, a_simUv).xyz;
float yRatio = basePos.y*0.5+0.5;
// bottom→top reveal with per-particle random window
float showRatio = smoothstep(a_rands1.x*0.2 + yRatio*0.4, 0.4 + a_rands1.y*0.2 + yRatio*0.4, u_showRatio);
vec3 pos = basePos*1.3;
pos += (simplexNoiseDerivatives(vec4(basePos*8., u_time)).yzw*0.2 + vec3(yRatio, 0., -1.)) * (1.-showRatio); // hidden particles drift in noise + pushed back in z
vec4 norShade = texture2D(u_norShadeTexture, a_simUv);
float depth = clamp(1.-pos.z, 0., 1.);
vec3 nor = norShade.xyz*2.-1.;
vec3 worldNormal = ...; vec3 viewNormal = normalMatrix*normalize(nor);
vec3 lightDir = normalize(u_mouse - worldPosition); float distToLight = distance(u_mouse, worldPosition);
float light = norShade.w*1.25;                                   // baked shade
float diff = linearStep(0.35, 1.0, dot(worldNormal, lightDir)) / sqrt(distToLight*0.1);
light *= diff + 0.6;
light += (0.05 + diff*0.15) * smoothstep(0.0, 0.005, norShade.w);
float frontFaceMultiplier = linearStep(-0.2, 0.0, viewNormal.z);  // silhouette/back points shrink to 0
light *= frontFaceMultiplier;
// depth of field: focus plane at depth 0.5 when active; blurriness grows away from it
v_blurriness = min(1.0, abs(depth - (1.-u_activeRatio*showRatio)*0.5)*2.5) * (2.-showRatio);
float basePointSize = 0.009*(1.+pow(v_blurriness,1.5)*8.)*frontFaceMultiplier;   // blurry → up to 9× bigger
float pointSize = max(basePointSize, 12./u_resolution.y);                          // never below ~12px
float subpixelMultiplier = pow(basePointSize/pointSize, 1.5);                      // energy conservation
pos.xy += position.xy*pointSize*step(0.003, light)*linearStep(0.0, 0.75, u_activeRatio); // billboard quad
// glitch bands (random vertical strips shift in x, tint by normal)
vec4 verticalRands = hash42(vec2(floor(basePos.y*3.+cos(basePos.y*3.+u_glitchOffset)*2.+u_glitchOffset),0.))*u_glitchStrength;
float glitchWeight = verticalRands.x*step(u_glitchThreshold, verticalRands.y);
pos.x += verticalRands.z*verticalRands.z*glitchWeight*0.35*cos(basePos.y+u_glitchOffset);
v_color = mix(vec3(1.), (viewNormal.xzy*0.5+0.5)*vec3(1.,0.5,2.), glitchWeight);
light *= 1.+glitchWeight*1.5; light += 0.1*glitchWeight;
// scanline sweeping down + rim on silhouette
float scanline = smoothstep(0.04, 0., abs(fract(u_time*-0.3 - basePos.y*.5 + .5)));
light += scanline*(0.25*norShade.w*(1.-light) + smoothstep(0.03, 0., abs(viewNormal.z)));
v_shade = min(1., light*(1.-v_blurriness*0.5))*subpixelMultiplier*showRatio;
v_toCenter = (uv-.5)*2.;
```
### Fragment shader
```glsl
float d = length(v_toCenter); float range = v_blurriness*5.;
float brightness = linearStep(1., 1.-range-fwidth(d), d);      // soft disc, softer when blurred (bokeh)
float shade = v_shade*brightness*(1.25 - v_blurriness*v_shade);
gl_FragColor = vec4(shade)*v_showRatio*v_showRatio;
gl_FragColor.a *= pow(1.-v_blurriness, 3.)*0.8*linearStep(0.8, 1.0, v_showRatio*v_showRatio);
```
Key takeaways for the look: (1) **every point is drawn** — there is no "ink" culling; tone = baked shade × normal·light; (2) the volumetric feel is **normals + DoF bokeh** (out-of-focus points grow and dim), not point count; (3) silhouette handled by `frontFaceMultiplier`; (4) additive + bloom + colour grade; (5) reveal is bottom→top with noise drift; transition = two clouds sliding/rotating apart with DoF defocus + glitch strips.

## 4. Glyph rain — `class AboutHeroLetters`
`letter_placements.buf` gives column positions + density; 4 instanced meshes (quarters of the columns) each a tall plane (`pos.xy *= vec2(1, 6/5*charCount)`, charCount 50–100), `v_charUv.y -= u_time*mix(2,10,rand)` scrolls glyphs; fragment picks `charIdx = floor(mod(v_charUv.y, 42))`, re-randomised over time with `hash43(charIdx, rand, floor(charTime*-2))`, samples `font.png` at `(charUv.x+charIdx)/42`; brightness × `charRands.w*charRands.y`, vertical fade `smoothstep(.5,.35,abs(uv.y-.5))`, long-period on/off `smoothstep(100,150,mod(v_charUv.y-200*rand,200))`. The 4 layers are rendered into an RT with progressive blur between them (blur 16 → 8 → 4 px) = fake depth layering; composited additive.

## 5. Contour lines — `class AboutHeroLines`
`terrain_lines.buf` = polylines (41 lines, thresholds listed in code) pre-extracted offline (iso-lines of the terrain height). Built at runtime into 3-segment tubes with `t` (arc length), `totalLength`, alternate rings thick/thin (`v_thicknessRatio`). Fragment: `t = mod(v_t - u_time*2., totalLength); n = pnoise(vec2(t*0.25,0), ...)`; `shade = mix(0.3 + smoothstep(0,-fwidth(n),n)*0.6, 1, thick)` → bright pulses travel along the lines; distance fade `linearStep(50,-20,z)`; reveal `step(totalLength - t, totalLength*u_hudRatio)`; blending `MaxEquation`; bloom does the glow.

## 6. Other layers
- `AboutHeroParticles(+Simulation)`: 128×192 free particles (curl noise in an FBO sim, `posLife`), lit by a **light-field slice texture**, rendered as small meshes with motion-blur streaks (`motionVert`), emissive variants.
- `AboutHeroFog`: 32 instanced fog cards with a scene-depth-aware soft alpha.
- `AboutHeroGround`: terrain with shadow/light/height texture, bump from height, blue-noise soft shadows, exponential height fog.
- HUD ([[ 001 ]], + crosshairs, tick rulers) is DOM.

## 7. What this means for SerSan
Lusion's input is a **3D scan**; we have 2D studio photos. The equivalent that keeps the same rendering model: derive **z + normals** per particle from a monocular depth map (Depth Anything V2) of each headshot, keep the shared grid so the 4-way morph still works, draw EVERY cell inside the subject mask (no ink culling), tone = photo luminance × (normal·light) with mouse-light, DoF bokeh on point size/alpha, front-face multiplier from the normal, additive + bloom. The empty patches disappear by construction because membership, not colour distance, decides whether a cell exists.
