# LUSION BUNDLE PROBE — reverse engineering of lusion.co/about "TEAM" section (direct bundle analysis)

Date: 2026-08-27. Method: `curl -L` with browser UA on https://lusion.co/about and https://lusion.co/, downloaded the single Astro bundle, prettified it with prettier, grepped and read the relevant classes, then downloaded the actual assets from the CDN and parsed their binary format with a small node script.

Local evidence folder: `C:/Users/alber/AppData/Local/Temp/claude/C--Users-alber-sersan/1c69a823-396b-49b0-8d9a-70aaa24ca458/scratchpad/dossiers/lusion-bundle/`
- `about.html` (59,787 B), `index.html` (59,671 B)
- `hoisted.CUO_IjfL.js` (1,251,728 B minified) and `hoisted.pretty.js` (39,487 lines, prettier output — all line numbers below refer to this file)
- `about.CNa9RfUh.css` (90,367 B)
- `assets/` — team.json, team_*.buf (7 heads), letter_placements.buf, terrain_lines.buf, person.buf, camera_spline.buf, font.png + `.headers` files
- `parsebuf.js`, `stats.js` — the .buf parser / statistics scripts used

## 0. TL;DR (what Lusion actually does)

1. **The head is NOT a photo-dithered particle field. It is a pre-baked 3D point cloud** (8,192 points per person) exported from a 3D scan/mesh in a custom binary `.buf` format. Each point stores `position` (x,y in [-1,1], **z = depth in [0,1]**) and `nShade` = packed **normal (xyz, 0..255) + a baked shade/lighting term (w)**. There is no runtime sampling of a photo and no luminance threshold; empty patches cannot happen because the point distribution was baked offline on the 3D surface.
2. Each point is drawn as an **instanced quad (PlaneGeometry 1x1, InstancedBufferGeometry, 8192 instances)** — not gl_Points — with a ShaderMaterial, **additive blending (One/One), no depth test/write**. Point size is computed in the vertex shader from a DOF-like "blurriness" (distance from a focus depth that sweeps during the transition) — sharp points are tiny (`0.009` local units, min 12 px / resolution.y), out-of-focus points are up to 9x bigger and dimmer (energy-conserving via `subpixelMultiplier`).
3. **Lighting is real-time per point**: normal from `nShade.xyz`, light direction from the **mouse position unprojected into the scene** (`u_mouse`), `linearStep(0.35,1,dot(N,L))/sqrt(dist*0.1)`, multiplied by the baked shade `nShade.w*1.25`, plus a **front-face multiplier** `linearStep(-0.2,0,viewNormal.z)` that hides back-facing points, plus a **moving horizontal scanline** `smoothstep(0.04,0,abs(fract(u_time*-0.3-basePos.y*0.5+0.5)))` that adds rim light where `|viewNormal.z|` is near 0 (silhouette glow).
4. **Transition A→B** = two meshes at once (MAX_FACE_NUM=2): the current head slides `x: t*-1.5`, `z: -t*2`, rotates `y: t*-0.3`, `x: t*0.4` and gets `u_activeRatio=1-t`; the next head does the mirror. `u_activeRatio` drives the focus plane and a **glitch**: random horizontal strips (`hash42(floor(basePos.y*3+…))`) are shifted in x and tinted with normal-based colour; `u_glitchThreshold = fit(activeRatio,0.4,1,0,0.9)` so glitch only appears while a head is inactive/transitioning. Auto-advance timer `timeBaseChangeSpeed=0.2` (5 s per face), tween duration `1.25 + |Δindex|*0.25` s, `cubicInOut`.
5. **Reveal** (`u_showRatio`, ramps at 1/1.5 per second when the section is >50% in view): each point gets `showRatio = smoothstep(rand*0.2 + y*0.4, 0.4 + rand*0.2 + y*0.4, u_showRatio)` — bottom-up, randomized — and while not shown it is displaced by `simplexNoiseDerivatives(vec4(basePos*8, u_time)).yzw*0.2 + vec3(yRatio,0,-1)`. Alpha is `showRatio²` times `pow(1-blurriness,3)*0.8`.
6. **Glyph rain ("matrix" columns)** = 196 instanced vertical strips placed in 3D (`about/letter_placements.buf`, attributes position/density/dof) split into 4 depth groups, each group rendered into an offscreen RT with progressive blur (16 → 8 → 4 → none) to fake DOF; each strip is a UV-scrolling column of 50–100 characters read from a **210x6 px 1-bit font atlas `font.png` (42 glyphs of 5x6 px)**; character index randomised per cell with `hash43(charIdx, rand, floor(time*-2))`, scroll speed `mix(2,10,rand)` glyphs/s, fade by world z (`1-linearStep(15,66,z)`), `gl_FragColor.a *= 3`, additive blend.
7. **Flowing contour lines at the bottom** = `about/terrain_lines.buf` (11,832 polyline vertices, 41 lines given by an index THRESHOLDS table) extruded at runtime into thin **3-sided tubes** (SEGMENT_COUNT=3, radius 0.04 or 0.1 — every 4th height level thicker). Fragment: 1-D periodic Perlin noise along arclength `pnoise(vec2((t - time*2)*0.25, 0), vec2(totalLength*0.25, 100))` thresholded → bright dashes flowing along the line; `step(totalLength - t, totalLength*u_hudRatio)` draws the lines in progressively as the HUD ratio (scroll) grows; blended with **MaxEquation**.
8. Everything renders into a **prepass post-effect** (`AboutPageHeroEfxPrepass`) whose private scene contains faces+letters; then `AboutPageHeroEfx` applies colour-burn/dodge tints (HUD mode: burn `#79a8ff`, dodge `#a5ff44`), then a **FFT-convolution Bloom** (`bloomAmount` 12.5 in HUD/team mode, threshold 0.8, radius 0.25, smoothWidth 0.3). Bloom is what turns tiny points into a glowing volumetric head.

## 1. Page/bundle structure

- `about.html` and `index.html` both load exactly one module: `<script type="module" src="/_astro/hoisted.CUO_IjfL.js">` and one stylesheet `/_astro/about.CNa9RfUh.css`. **There is no per-page split** — the entire site (home, work, about, playground) is in the single 1.25 MB bundle. No `import()` dynamic chunks were found (grep `import(` → 0 hits).
- CDN: `CDN_PATH = "https://lusion.dev"` when hostname is lusion.co (pretty.js:19758). Paths (pretty.js:19762-19769): `TEAM_PATH="/assets/team/"`, `MODEL_PATH="/assets/models/"`, `TEXTURE_PATH="/assets/textures/"`. All asset URLs below are `https://lusion.dev/assets/...`. Served as `application/octet-stream`, `Cache-Control: public, max-age=0, must-revalidate`, `x-content-type-options: nosniff`.
- Renderer: **three.js WebGL (custom build with `extensions.derivatives`, r15x-era), not WebGPU**. `settings.DPR = min(1.5, devicePixelRatio)`, `MAX_PIXEL_COUNT = 2560*1440` (pretty.js:19773-19776).
- Keyword counts in the minified bundle: gl_PointSize 3 (three core + hero light-field), PointsMaterial 7 (three core + BufItem fallback), particle 212, `.buf` 91, glb 13 (GLTF loader class only, no .glb URLs), draco 0, ktx2 0, glyph 0, marching 0, ascii 2 (lodash), contour 3 (three ShapeUtils), curl 21, noise 254, rain 5 (drain/constrain — unrelated).

## 2. Assets of the team section (downloaded, byte-exact)

| URL (https://lusion.dev/assets/…) | bytes | what |
|---|---|---|
| `team/team.json` | 594 | `[{id,name,role}]` x 7: edan, ffi, pierre, yannic, paul, andrii, sunny |
| `team/edan.buf` | 82,280 | head point cloud, meshType Points, 8192 verts |
| `team/ffi.buf` | 82,280 | idem |
| `team/pierre.buf` | 82,464 | idem |
| `team/yannic.buf` | 82,468 | idem |
| `team/paul.buf` | 82,280 | idem |
| `team/andrii.buf` | 131,308 | idem but position stored as raw Float32 (unpacked) |
| `team/sunny.buf` | 82,280 | idem (the cat) |
| `textures/font.png` | 200 | 210x6 px 1-bit palette PNG = 42 glyphs x 5 px wide, 6 px tall |
| `models/about/letter_placements.buf` | 2,272 | 196 points: `dof` (Int16 packed, delta 1.64), `position` (Uint16 packed, x in [-86.8,82.6], y in [-0.85,16.1], z in [-8.07,97.0]), `density` (Uint8 0/1) |
| `models/about/terrain_lines.buf` | 71,276 | 11,832 polyline vertices (Uint16 packed positions), 41 lines |
| `models/about/camera_spline.buf` | 4,784 | camera path: position + `orient` quaternion, ~200 samples |
| `models/about/person.buf` | 86,170 | skinned person mesh (hero scene, not team) |

### 2.1 `.buf` custom format (BufItem, pretty.js:37611-37709)

```
[uint32 headerLength][headerLength bytes of JSON][attribute blobs back-to-back]
header = { vertexCount, indexCount,
           attributes:[{id, componentSize, storageType:"Uint16Array"|"Uint8Array"|"Float32Array"|"Int16Array",
                        needsPack, packedComponents:[{from,delta}]}],
           meshType:"Points"|"Mesh"|"LineSegments", sceneData? }
```
Unpack for `needsPack` attributes (pretty.js:37638-37648): `value = (raw + (isSigned ? 2^(bits-1) : 0)) / 2^bits * delta + from`. Verbatim JS:
```js
let t = new Uint32Array(e, 0, 1)[0],
    r = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(e, 4, t))), n = r.vertexCount, a = r.indexCount, l = 4 + t, c = new BufferGeometry(), u = r.attributes;
for (let _ = 0, T = u.length; _ < T; _++) {
  let M = u[_], S = M.id, b = S === "indices" ? a : n, C = M.componentSize, w = window[M.storageType], R = new w(e, l, b * C), E = w.BYTES_PER_ELEMENT, I;
  if (M.needsPack) { let F = M.packedComponents, k = F.length, L = M.storageType.indexOf("Int") === 0, D = 1 << (E * 8), ne = L ? D * 0.5 : 0, re = 1 / D;
    I = new Float32Array(b * C);
    for (let ce = 0, z = 0; ce < b; ce++) for (let j = 0; j < k; j++) { let X = F[j]; I[z] = (R[z] + ne) * re * X.delta + X.from; z++; } }
  else I = R;
  S === "indices" ? c.setIndex(new BufferAttribute(I, 1)) : c.setAttribute(S, new BufferAttribute(I, C)); l += b * C * E;
}
```
Team head header (edan.buf, headerLen 356):
```json
{"vertexCount":8192,"indexCount":0,"attributes":[
 {"id":"position","needsPack":true,"componentSize":3,"storageType":"Uint16Array",
  "packedComponents":[{"from":-0.999023438,"delta":1.998535157},{"from":-0.999511719,"delta":1.998535157},{"from":0,"delta":1}]},
 {"id":"nShade","needsPack":false,"componentSize":4,"storageType":"Uint8Array"}],
 "meshType":"Points"}
```
So: **x,y in [-1,1], z in [0,1] (depth toward viewer; the shader uses `depth = clamp(1-pos.z,0,1)`)**; `nShade.xyz` = normal encoded `n*0.5+0.5` in 0..255 (decoded `norShade.xyz*2-1`), `nShade.w` = baked shade 0..255 (decoded 0..1, used as `light = norShade.w*1.25`).

Measured statistics (stats.js on the downloaded files):
- edan: z histogram (bins of 0.1) `[1527,80,117,200,452,604,460,820,2060,1872]`, mean z 0.624; shade histogram `[3425,1518,1677,1199,320,37,8,3,2,3]`, **2061 points with shade==0**, mean decoded normal.z 0.659.
- ffi: z `[2480,79,60,214,565,1082,1658,1642,383,29]`, mean 0.442; shade==0 for **4574** points.
- sunny: z `[265,54,89,163,502,1199,1895,1927,1383,715]`, shade==0 for 522.
Interpretation: the export bakes a fixed budget of 8192 points; points outside the scan are parked at z=0 with shade=0 and are **collapsed to zero size in the shader** (`step(0.003, light)` multiplies the quad offset). Hence the visible head is ~4k–7.5k points. Baked shade is mostly < 0.4 and gets amplified by the mouse light and by bloom.

## 3. The head particle system — `AboutHeroFaces` (pretty.js:31955-32090)

Constants: `PARTICLE_COUNT = 8192, SIM_TEXTURE_WIDTH = 128, SIM_TEXTURE_HEIGHT = 64, MAX_FACE_NUM = 2`.

Data textures (pretty.js:31982-31990): position → Float32 RGBA 128x64 DataTexture (w = 1/8192), nShade → Uint8 RGBA 128x64 (both NearestFilter, `fboHelper.createDataTexture(data,w,h,isFloat,nearest)`). Geometry: `PlaneGeometry(1,1)` attributes copied into an `InstancedBufferGeometry` with per-instance `a_simUv` (texel centre = `((i%128)+0.5)/128, (floor(i/128)+0.5)/64`), `a_rands1`, `a_rands2` (vec4 Math.random()). Two `Mesh`es (not `Points`), `frustumCulled=false`, `visible=false` until active.

Container transform (pretty.js:31993-31999): `scale(27.5, 27.5, 16)`, `rotation.y = PI+0.2`, `rotation.x = 0.1`, `position (0, 34, 25)`.

Material (pretty.js:32022-32047): `ShaderMaterial`, `depthTest:false, depthWrite:false, transparent:true, blending: CustomBlending, blendEquation: AddEquation, blendSrc/Dst: OneFactor, blendEquationAlpha: AddEquation, blendSrcAlpha/DstAlpha: OneFactor`, `extensions.derivatives = true`. Uniforms: `u_time, u_resolution, u_mouse, u_glitchOffset, u_glitchStrength, u_glitchThreshold, u_activeRatio, u_showRatio, u_positionTexture, u_norShadeTexture`.

### 3.1 Vertex shader `vert$3` (pretty.js:31942-31944; Ashima 4-D `simplexNoiseDerivatives` and Dave Hoskins `hash42` boilerplate omitted)

```glsl
uniform sampler2D u_positionTexture; uniform sampler2D u_norShadeTexture;
uniform float u_activeRatio; uniform float u_showRatio; uniform vec3 u_mouse; uniform vec2 u_resolution; uniform float u_time;
uniform float u_isForward; uniform float u_glitchOffset; uniform float u_glitchStrength; uniform float u_glitchThreshold;
attribute vec2 a_simUv; attribute vec4 a_rands1; attribute vec4 a_rands2;
varying float v_shade; varying float v_showRatio; varying float v_blurriness; varying vec2 v_toCenter; varying vec2 v_uv; varying vec3 v_color;
float linearStep(float e0,float e1,float x){return clamp((x-e0)/(e1-e0),0.0,1.0);}
vec3 inverseTransformDirection(in vec3 dir,in mat4 m){return normalize((vec4(dir,0.0)*m).xyz);}
void main(){
  vec3 basePos=texture2D(u_positionTexture,a_simUv).xyz;
  vec3 pos=basePos;
  float yRatio=basePos.y*0.5+0.5;
  float showRatio=smoothstep(a_rands1.x*0.2+yRatio*0.4, 0.4+a_rands1.y*0.2+yRatio*0.4, u_showRatio);
  pos*=1.3;
  pos+=(simplexNoiseDerivatives(vec4(basePos*8.,u_time)).yzw*0.2+vec3(1.*yRatio,0.0,-1.))*(1.-showRatio);
  v_showRatio=showRatio;
  vec4 norShade=texture2D(u_norShadeTexture,a_simUv);
  float depth=clamp(1.-pos.z,0.0,1.0);
  vec3 nor=norShade.xyz*2.-1.;
  vec3 worldPosition=(modelMatrix*vec4(pos,1.0)).xyz;
  vec3 viewNormal=normalMatrix*normalize(nor);
  vec3 worldNormal=inverseTransformDirection(viewNormal,viewMatrix);
  vec3 lightDir=normalize(u_mouse-worldPosition);
  float distToLight=distance(u_mouse,worldPosition);
  float light=norShade.w*1.25;
  float diff=linearStep(0.35,1.0,dot(worldNormal,lightDir))/sqrt(distToLight*0.1);
  light*=diff+0.6;
  light+=(0.05+diff*0.15)*smoothstep(0.0,0.005,norShade.w);
  float frontFaceMultiplier=linearStep(-0.2,0.0,viewNormal.z);
  light*=frontFaceMultiplier;
  v_blurriness=min(1.0,(abs(depth-(1.-u_activeRatio*showRatio)*0.5))*2.5)*(2.-showRatio);
  float basePointSize=0.009*(1.+pow(v_blurriness,1.5)*8.)*frontFaceMultiplier;
  float pointSize=max(basePointSize,12./u_resolution.y);
  float subpixelMultiplier=pow(basePointSize/pointSize,1.5);
  pos.xy+=position.xy*pointSize*step(0.003,light)*linearStep(0.0,0.75,u_activeRatio);
  vec4 verticalRands=hash42(vec2(floor(basePos.y*3.+cos(basePos.y*3.+u_glitchOffset)*2.+u_glitchOffset),0.))*u_glitchStrength;
  float glitchWeight=verticalRands.x*step(u_glitchThreshold,verticalRands.y);
  pos.x+=(verticalRands.z*verticalRands.z)*glitchWeight*0.35*cos(basePos.y+u_glitchOffset);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
  v_color=mix(vec3(1.0),(viewNormal.xzy*0.5+0.5)*vec3(1.0,0.5,2.0),glitchWeight);
  light*=(1.+glitchWeight*1.5);
  light+=0.1*glitchWeight;
  float scanline=smoothstep(0.04,0.,abs(fract(u_time*-0.3-basePos.y*.5+.5)));
  light+=scanline*(0.25*norShade.w*(1.0-light)+smoothstep(0.03,0.,abs(viewNormal.z)));
  v_shade=min(1.0,light*(1.-v_blurriness*0.5))*subpixelMultiplier*showRatio;
  v_toCenter=(uv-.5)*2.;
  v_uv=uv;
}
```
Notes on the physics:
- Point size is in local units of the unit cloud (container scale 27.5 → a sharp quad is ~0.25 world units). `max(…, 12/resolution.y)` guarantees ≥ ~12 px quads while `subpixelMultiplier` dims them so total energy stays constant — this is what avoids the dithered-photo look at any zoom.
- Focus plane = `(1 - u_activeRatio*showRatio)*0.5` in depth space: the active head is focused at depth 0 (nose), the inactive one at 0.5; blurriness grows 2.5 per unit depth; blurred points are up to 9x larger and dimmer → fake bokeh DOF that reads as volume.
- `v_color` is computed but never used in the fragment: the head is monochrome; colour comes only from the post tint.
- Every frame JS re-rolls `u_glitchOffset = Math.random()*1000` and `u_glitchStrength = Math.random()` → strips flicker.

### 3.2 Fragment shader `frag$6` (pretty.js:31945-31946)

```glsl
varying float v_shade; varying float v_showRatio; varying vec2 v_toCenter; varying float v_blurriness; varying vec2 v_uv; varying vec3 v_color;
float linearStep(float e0,float e1,float x){return clamp((x-e0)/(e1-e0),0.0,1.0);}
void main(){
  float shade=v_shade;
  float d=length(v_toCenter);
  float range=v_blurriness*5.;
  float brightness=linearStep(1.,1.-range-fwidth(d),d);   // hard AA disc when sharp, soft disc when blurred
  shade*=brightness*(1.25-v_blurriness*v_shade);
  gl_FragColor=vec4(shade)*v_showRatio*v_showRatio;
  gl_FragColor.a*=pow(1.-v_blurriness,3.)*0.8*linearStep(0.8,1.0,v_showRatio*v_showRatio);
}
```
Output is greyscale, additive. The prepass composite reads `.rrra` and the post tint maps R to colour ramps, so the head is effectively a luminance mask.

### 3.3 JS update loop (pretty.js:32054-32089) — motion and transition parameters

```js
// mouse → 3D light position: unproject eased mouse, push 75 units along the ray, into faceContainer local space
_v1.set(mouse.x, mouse.y, 0.5).unproject(camera).sub(camera.position).normalize();
_v1.multiplyScalar(75 / _v1.z).add(camera.position); _m.copy(faceContainer.matrixWorld).invert(); _v1.applyMatrix4(_m);
let n = clamp(_v1.y*0.03, -0.05, 0.05), a = clamp(_v1.x*0.03, -0.05, 0.05);   // ±0.05 rad head-tracking tilt
_v1.applyMatrix4(faceContainer.matrixWorld); u_mouse.copy(_v1);
// current head (t = transitionRatio 0..1)
curr.u_activeRatio = (1 - t) * activeRatio;  curr.u_glitchThreshold = fit(1-t, 0.4, 1, 0, 0.9);
curr.position.x = t * -1.5;  curr.position.z = -t*2 - (1-activeRatio)*2;
curr.rotation.y = t * -0.3 + a;  curr.rotation.x = t * 0.4 + n;
// next head
next.u_activeRatio = t * activeRatio;  next.u_glitchThreshold = fit(t, 0.4, 1, 0, 0.9);
next.position.x = (t-1) * -1.5;  next.position.z = (t-1)*2 - (1-activeRatio)*2;
next.rotation.y = (t-1) * -0.3 + a;  next.rotation.x = (t-1) * -0.4 + n;
u_glitchOffset = Math.random()*1000;  u_glitchStrength = Math.random();
```
Controller `WhoSubsectionTeam` (pretty.js:32662-32990): `showRatio += ±dt/1.5` (1.5 s fade in/out, active when section visibility `l > 0.5`); `faceIndexTimer += dt*0.2` → automatic `next()` every 5 s (paused while animating); `Tween(1.25 + |Δ|*0.25 s, cubicInOut)` on `faceIndex`; `transitionRatio = frac(faceIndex)`, `currId = list[floor]`, `nextId = list[floor+1]`. Click on the right/left half of the face rect → next/prev; mobile: horizontal swipe. Name/role text uses a "matrix text" decoder (`TextAnimationHelper.setMatrixText`, 30–60 letters/s, 3 random trailing chars, refresh 1/30 s, random chars `String.fromCharCode(33+rand*93)`, pretty.js:32540-32590). The big letter next to the head = first letter of the id drawn from `font.png` via `u_letterIdx = charCode-65` (pretty.js:33045-33050). `onPageShow()` preloads all 7 `.buf` heads.

DOM: `#about-who-team-faces {position:absolute; width:70%; height:90%}` (mobile: `bottom:20%; left:0; height:70%; width:100%`) is only a hit-rect; the WebGL canvas is global; `cameraViewportOffsetX` shifts the projection so the head sits in the left area while DOM text sits right (pretty.js:32935-32939).

## 4. Glyph rain — `AboutHeroLetters` (pretty.js:32135-32240)

Placement: `about/letter_placements.buf` → 196 positions spread x in [-87,83], z in [-8,97] (a field around/behind the head), `density` 0/1. Split into 4 groups of 49 by index (= depth slices), each an `InstancedBufferGeometry` of `PlaneGeometry(1,1).translate(0,0.5,0).rotateY(PI)` with `instancePos`, `instanceDensity`, `instanceRands (vec4)`. Material: additive One/One, no depth, uniforms `u_time`, `u_showRatio` (= faces show ratio), `u_letterTexture` (font.png, LinearFilter).

```glsl
// vert$2
attribute vec3 instancePos; attribute vec4 instanceRands; attribute float instanceDensity;
uniform float u_time; uniform float u_showRatio;
varying vec2 v_uv; varying vec2 v_charUv; varying vec3 v_worldPosition; varying vec4 v_instanceRands; varying float v_opacity;
void main(){
  float charCount=mix(50.,100.,instanceRands.y);
  vec3 pos=position; v_uv=uv;
  pos.xy*=vec2(1.,6./5.*charCount);                       // strip 1 wide, charCount glyphs tall (5x6 glyph aspect)
  v_charUv=vec2(1.-position.x,position.y*charCount)+vec2(.5,0.);
  v_charUv.y-=u_time*mix(2.,10.,instanceRands.x);          // scroll speed 2..10 glyphs/s
  pos=pos*0.75+instancePos;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);
  v_worldPosition=(modelMatrix*vec4(pos,1.)).xyz; v_instanceRands=instanceRands;
  v_opacity=mix(.5,1.,instanceDensity)*u_showRatio;
}
// frag$5
uniform sampler2D u_letterTexture; uniform float u_time;
void main(){
  float fade=1.-linearStep(15.,66.,v_worldPosition.z);
  float MAX_CHAR=42.;
  float charIdx=floor(mod(v_charUv.y,MAX_CHAR));
  float charTime=u_time*mix(1.,2.,v_instanceRands.y+hash43(vec3(charIdx,-100.,v_instanceRands.z)).x);
  vec4 charRands=hash43(vec3(charIdx,v_instanceRands.w,floor(charTime*-2.)));   // glyph re-rolls ~2x/s
  charIdx=mod(charIdx+floor(charRands.x*MAX_CHAR),MAX_CHAR);
  vec2 charUv=vec2((v_charUv.x+charIdx)/MAX_CHAR,mod(v_charUv.y,1.));
  float shade=texture2D(u_letterTexture,charUv).r;
  gl_FragColor=vec4(shade)*charRands.w*charRands.y*v_opacity;
  gl_FragColor*=smoothstep(0.5,0.35,abs(v_uv.y-.5))*(0.5+fade*0.5)*(0.3+v_instanceRands.z*1.25)
               *smoothstep(100.,150.,mod(v_charUv.y-200.*v_instanceRands.y,200.));   // 200-glyph period: 100 hidden, 50 ramp, visible
  gl_FragColor.a*=3.;
}
```
Render (pretty.js:32205-32225, `_onBeforeRender`): clear RT → draw group0 → `blur.blur(16, 0.5)` → group1 → `blur(8,0.5)` → group2 → `blur(4,0.5)` → group3 sharp. `blur.blur(radius, scale, src, tmp, dst)` is a separable 9-tap Gaussian at half resolution with `u_delta = radius/size*0.25`. The RT is composited full-screen additively (`renderOrder 10`) inside the prepass scene.

## 5. Contour lines — `AboutHeroLines` (pretty.js:31556-31655)

- Geometry: 41 polylines from `terrain_lines.buf`; `THREHSOLDS` = cumulative vertex ends `[60,245,806,966,991,1026,1191,1853,2061,3111,4279,4309,4338,5265,5316,5447,5475,6407,6445,7116,7235,7349,7934,8555,8583,8614,9154,9640,9688,10163,10420,10645,10895,11074,11286,11453,11596,11628,11740,11799,11832]`. For each vertex a frame is built (tangent T, `S = cross(up,T)`, `up` rotated by `2π/3` around T per ring vertex, SEGMENT_COUNT=3) → attributes `position`, `normal` (ring direction), `t` (arclength), `totalLength`, `lineId`, and a triangle index buffer (6 indices per segment per ring edge).
- Material: `blending: CustomBlending, blendEquation: MaxEquation, blendSrc/Dst: One`, `extensions.derivatives`, `renderOrder 15`, in `hudContainer` (visible only when `hudRatio > 0`).

```glsl
// vert$7
attribute float t; attribute float totalLength; attribute float lineId;
void main(){
  v_t=t; v_totalLength=totalLength;
  float yIndex=floor(position.y+.5);
  v_thicknessRatio=step(mod(yIndex,4.),0.5);                 // every 4th height level is thick
  vec3 pos=position+normal*mix(0.04,0.1,v_thicknessRatio);   // tube radius 0.04 / 0.1
  vec3 nor=normalize(normalMatrix*normal); v_viewNormal=nor; v_worldNormal=inverseTransformDirection(nor,viewMatrix);
  v_worldPosition=(modelMatrix*vec4(pos,1.0)).xyz;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
  gl_Position.z-=0.1/gl_Position.w;                           // depth bias so lines float above terrain
}
// frag$a  (pnoise = Gustavson classic periodic 2D Perlin)
uniform float u_time; uniform float u_hudRatio;
void main(){
  float t=mod(v_t-u_time*2.,v_totalLength);                   // flow 2 units/s along the line
  float noiseScale=0.25;
  float n=pnoise(vec2(t*noiseScale,0.),vec2(v_totalLength*noiseScale,100.));   // seamless along closed loop
  float shade=mix(0.3+smoothstep(0.,0.-fwidth(n),n)*0.6,1.,v_thicknessRatio);  // thin: 0.3 base + 0.6 where noise<0 (dashes); thick: solid
  shade*=linearStep(50.,-20.,v_worldPosition.z);
  gl_FragColor=vec4(shade,0.,0.,1.)*step(v_totalLength-v_t,v_totalLength*u_hudRatio);  // draw-in with scroll
  gl_FragColor.b=linearStep(15.,66.,v_worldPosition.z);       // B = depth → prepass blur strength (DOF)
  gl_FragColor.r*=.85;
}
```
Colour convention across the about hero: **R = luminance/emission, G = depth, B = blur amount**; the post chain maps R to tint ramps. That is why lines write `vec4(shade,0,0,1)`.

## 6. Post pipeline (why it glows)

1. `AboutPageHeroEfxPrepass` (pretty.js:31100-31175, renderOrder 5): copies the main scene, applies a blue-noise 8-tap disc blur with strength `0.006 * tex.b * u_blurRatio` (`u_blurRatio = hudRatio`) so terrain/lines get DOF from their B channel; optional 16-tap motion blur; then renders its own `Scene` (faces + glyph rain) on top with `autoClear=false` when `needsRenderScene = aboutHeroFaces.isActive`.
2. `AboutPageHeroEfx` (pretty.js:32093-32135, renderOrder 20): `colorBurn`/`colorDodge` tint — scene mode burn `#00f0ff`@0.15, dodge `#005aff`@0.12; **HUD/team mode burn `#79a8ff`@1.0, dodge `#a5ff44`@0.7**, lerped by `hudRatio = aboutHeroFaces.showRatio`. Shader: `mix(colorBurn(u_colorBurn, tex), colorDodge(u_colorDodge, tex), tex.rgb)`.
3. `Bloom` (pretty.js:37205+): 5-iteration Gaussian pyramid plus **FFT convolution bloom** (`USE_CONVOLUTION`, 256² kernel `convolutionSrcFrag` = sum of exponentials giving star streaks at 0°, 90°, 45°), dithered. AboutHero stage values (pretty.js:32262-32275, 32347-32353): `bloomThreshold 0.8`, `bloomRadius 0.25`, `bloomSmoothWidth 0.3`, `bloomAmount` = 3 → 1.5 (intro) → 10 (sceneHide) → **12.5 when hudRatio ≥ 0.5 (team view)**; `haloStrength` → 0 in HUD.
4. Camera: FOV 60, follows `camera_spline.buf` (149 samples intro + 50 panning, position + quaternion slerp), `cameraDollyZoomFovOffset` to -10 between spline 0.4–0.8.

## 7. Scroll choreography of the "who" section (pretty.js:32993-33100)

`RANGE_START_WAIT 3.5, RANGE_PAGE_12 1.75, RANGE_PAGE_23 1.75, RANGE_END_WAIT 2.5` (units = viewport widths on desktop, heights on mobile), `PAGE_DISTANCE 1.25`. `introRatio = u/(3.5+1.75)`; `hudRatio = fit(u, T1, T1+0.875, 0, 1)` (contour lines draw in, scene blurs out, bloom rises); the team subsection is active when `scrollRatio*PAGE_DISTANCE ≥ 1.25`; faces `showRatio` ramps when the team page is > 50% in view; the whole thing is one horizontally-translated DOM container plus the global canvas.

## 8. Comparison with the SerSan implementation and concrete take-aways

Lusion never samples a photograph on the GPU. The empty-patch / halftone problem in SerSan comes from deriving particle placement from image luminance (bright skin ≈ white wall → no particles). To reach parity:
1. **Bake a 3D point cloud offline** (photogrammetry, depth estimation or a 3D scan → mesh → uniform surface sampling, e.g. Blender geometry nodes "Distribute Points on Faces" with 8,192 points, or Poisson-disk on a depth-map mesh). Export per point: position (normalised, z = depth 0..1), normal, baked AO/shade. A 2.5-D depth mesh from a single frontal headshot (MiDaS / Depth-Anything) reproduces Lusion's data shape exactly (their z is a [0,1] depth, heads are near-frontal).
2. Store as two DataTextures (128x64 RGBA float + RGBA8) or instanced attributes; **render instanced quads, additive One/One, no depth**, with the size/DOF/energy formulas above (`0.009`, `x(1+blur^1.5*8)`, `max(., 12/res.y)`, `subpixelMultiplier = (base/size)^1.5`).
3. Real-time lighting per point from normal + mouse light + `frontFaceMultiplier` + scanline rim — this is the "lit 3D scan" look.
4. Transition with two simultaneous clouds (slide x ±1.5, z ±2, rot y ±0.3, x ±0.4, focus-plane sweep, horizontal-strip glitch with per-frame re-rolled seed, 1.25 s cubicInOut, auto-advance 5 s).
5. Reveal bottom-up randomized via `smoothstep(rand*0.2+y*0.4, 0.4+rand*0.2+y*0.4, showRatio)` + simplex-derivative drift, alpha `showRatio²`.
6. Glyph rain: 196 world-placed instanced strips with a 42-glyph 5x6 px atlas, scrolling UV, hashed glyph flicker, 4 depth groups with progressive blur 16/8/4.
7. Contour lines: tube-extruded polylines, arclength-periodic Perlin dashes flowing at 2 u/s, MaxEquation blend, draw-in by scroll, depth written to B for post DOF.
8. Post: tinted luminance (burn/dodge) + strong bloom (amount ~12, threshold 0.8) — the glow is mostly post-processing, not big sprites.

All code above is quoted from `hoisted.pretty.js` at the line numbers given; asset facts come from the files in `lusion-bundle/assets/` (parsed with `parsebuf.js` / `stats.js`).
