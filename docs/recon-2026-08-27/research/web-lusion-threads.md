# Dossier `web-lusion-threads` — Lusion.co "TEAM" section: reverse engineering from public sources (2026-08-27)

## 0. Executive summary

- **Nobody has publicly written up or recreated Lusion's team-faces section.** Searches across X, Reddit, YouTube, Medium/dev.to, Codrops, discourse.threejs.org, CodePen, GitHub (queries listed in §6) found zero recreations/explanations of the *about/team* particle heads. The only public Lusion recreations are: akella's "Curly Tubes" (Codrops 2021, home page tubes), `canxerian/lusion-reverse-engineered` (home page: physics ball pit, video panels, 2D→3D tiles — no about page), and a threejs forum thread on the home-page mouse displacement post-pass.
- **So I reverse-engineered it directly from the shipped bundle** (`https://lusion.co/_astro/hoisted.CUO_IjfL.js`, 1.25 MB, unminified class names + inline GLSL) and downloaded the actual per-person assets (`https://lusion.dev/assets/team/<id>.buf`, ~82 KB each). Everything in §1–§5 is quoted from that bundle/asset; nothing is guessed.
- **Verdict on the head asset: it is a real 3D scan/mesh-derived point set, not a photo + depth map.** Each person ships as **8,192 points** with **per-point 3D normals + baked shade**. Only the *front hemisphere* is present (every normal has +z), i.e. a front-facing capture rendered/sampled from a 3D head, with `z` normalised 0..1 (nose ≈ 1, edges ≈ 0). ~2,061 of 8,192 points are padding (shade = 0, z = 0) and are collapsed by the shader. Point density is **uniform over the 3D surface and independent of skin brightness** (median nearest-neighbour spacing 0.0118 in a [-1,1] frame). That is precisely why Lusion never has the "empty scalp/forehead" holes: brightness comes from `normal · lightDir` (light at the mouse) plus a baked shade channel, never from photo luminance.
- The **"matrix glyph rain"** is `AboutHeroLetters`: 196 instanced vertical strips (`letter_placements.buf`) each a tall quad UV-scrolling through a **210×6 px 1-bit font atlas (42 glyphs of 5×6)**, hashed per-cell to flicker, rendered in 4 depth layers with progressively smaller blur (16/8/4 px) into an offscreen RT and added (One/One) — fake DoF by layer.
- The **"flowing luminous contour lines"** at the bottom are `AboutHeroLines`: `terrain_lines.buf` (11,832 polyline vertices, 41 polylines) extruded on the CPU into 3-sided tubes with per-vertex arc-length `t`; the fragment shader animates a 1-D periodic Perlin noise along `t - time*2` so bright dashes *flow* along each line; every 4th line is thicker (0.10 vs 0.04). Blend = `MaxEquation`.
- All three are composited via a prepass that **bokeh-blurs the underlying hero scene** (8-tap blue-noise disc, radius `.006 * depth * hudRatio`), draws faces + letters additively on top, then a **colour-burn/colour-dodge grade** (`#79a8ff` burn α=1, `#a5ff44` dodge α=0.7) and **bloom amount 12.5, radius 0.25, threshold 0.8** in team mode.

---

## 1. Source: the shipped bundle and assets (primary evidence)

| Item | URL | Notes |
|---|---|---|
| About page HTML | https://lusion.co/about/ | Astro build; DOM ids `#about-who-subsection-team`, `#about-who-team-faces`, `#about-who-team-letter-container`, `#about-who-team-dots` (11 cols × 3 dots, plain DOM), `#about-who-team-top/bottom-compass` (DOM rulers), `#about-who-face-cursor` |
| JS bundle | https://lusion.co/_astro/hoisted.CUO_IjfL.js | 1,251,728 bytes; class names intact: `AboutHeroFaces` (byte offset 1014998), `AboutHeroLetters` (1023455), `AboutHeroLines` (990503), `AboutPageHeroEfxPrepass` (964461), `AboutPageHeroEfx` (1020634), `WhoSubsectionTeam` (~1041000), `AboutHero` (1026226) |
| Team list | https://lusion.co/assets/team/team.json | 7 entries: edan, ffi, pierre, yannic, paul, andrii, sunny (the cat, "Executive Purr-ducer") |
| Per-person point cloud | https://lusion.dev/assets/team/edan.buf (also ffi / pierre / yannic / paul / andrii / sunny) | 82,280 B (andrii 131,308 B) — custom `.buf`, see §1.1 |
| Glyph atlas | https://lusion.dev/assets/textures/font.png | **210×6 px, 1-bit palette PNG, 200 bytes** → 42 glyphs of 5 px |
| Letter columns placement | https://lusion.dev/assets/models/about/letter_placements.buf | 196 points, attrs `position`, `density`, `dof` |
| Contour polylines | https://lusion.dev/assets/models/about/terrain_lines.buf | 11,832 points, `meshType: Points`; split into 41 polylines by hard-coded `THREHSOLDS` |
| CDN | `CDN_PATH="https://lusion.dev"` when host is lusion.co (`Settings` class) | `DPR=Math.min(1.5,dpr)`, `MAX_PIXEL_COUNT=2560*1440`, `USE_WEBGL2=true` |

Other about-page assets referenced: `about/bg_box.buf`, `about/camera_spline.buf`, `about/logo_text.buf`, `about/person.buf` + `person_idle.buf` (54-bone skinned figure, quaternion bones in shader), `about/terrain.buf`, `about/fog.png`, `about/rocks.webp`, `about/terrain_shadow_light_height.webp`, `smaa-area.png`, `smaa-search.png`.

### 1.1 `.buf` container format (Lusion custom)
`uint32 headerLength` + JSON header + raw typed arrays. Header of `edan.buf`:
```json
{"vertexCount":8192,"indexCount":0,"attributes":[
 {"id":"position","needsPack":true,"componentSize":3,"storageType":"Uint16Array",
  "packedComponents":[{"from":-0.999023438,"delta":1.998535157},{"from":-0.999511719,"delta":1.998535157},{"from":0,"delta":1}]},
 {"id":"nShade","needsPack":false,"componentSize":4,"storageType":"Uint8Array"}],
 "meshType":"Points"}
```
Decode: `value = from + u16/65535 * delta`. So x,y ∈ [-1,1], z ∈ [0,1]. `nShade` = 4×uint8: xyz = normal packed `n*0.5+0.5` (decoded in-shader as `norShade.xyz*2.-1.` then `normalize()`; stored vectors are not unit length, 0.68–1.22), w = baked shade/brightness 0..255.

---

## 2. THE HEAD — `AboutHeroFaces` (verbatim reverse-engineering)

### 2.1 Asset statistics (decoded from `edan.buf` with Node 22)
```
N 8192   min [-0.999,-0.9995,0]   max [0.9995,0.999,1]
z histogram (10 bins, 0=back … 1=front): [1527, 80, 117, 200, 452, 604, 460, 820, 2060, 1872]
normal.z histogram (-1..1, 10 bins):      [0,0,0,3,85,391,1131,1503,2002,3077]   <- ALL front-facing
shade (w) histogram (0..255, 10 bins):    [3425,1518,1677,1199,320,37,8,3,2,3]   <- mostly dim, few bright
points with z==0: 1444, all of them shade==0 ; total shade==0: 2061 ; unique XY: 8191
valid points: 6131 ; nearest-neighbour XY spacing median 0.0118 (p10 0.0102, p90 0.0162)
```
Interpretation (evidence-based):
- **True 3D normals exist per point** and are all camera-facing → data produced from a **3D surface (scan or sculpt) seen from the front**, most likely rendered offline to position/normal/shade buffers (the studio's stated habit: "we pre-rendered the normal, ambient-occlusion, thickness and 2 sets of diffused illuminations" — Awwwards case study, https://www.awwwards.com/case-study-for-lusion-by-lusion-winner-of-site-of-the-month-may.html) and then sampled to 8,192 points. It is **not** a 360° cloud (no back-of-head, no −z normals) and **not** a photo + depth map (that pipeline yields no such normals and its density follows image content).
- **Spacing is uniform and independent of colour** (p10–p90 = 0.010–0.016). This is the direct answer to the owner's "bald scalp / forehead / cheeks have no particles" complaint: Lusion places points by *geometry*, never by pixel luminance.
- The **shade channel is the only photometric input** and is applied multiplicatively on top of dynamic normal lighting, so bright skin still gets points; it just gets a different `light` value.
- Unused slots are padding (shade 0, z 0). The vertex shader collapses them (`step(0.003,light)` → quad size 0).

### 2.2 Geometry & material setup (JS, quoted from bundle)
```js
PARTICLE_COUNT=8192, SIM_TEXTURE_WIDTH=128, SIM_TEXTURE_HEIGHT=64, MAX_FACE_NUM=2
// positions -> RGBA float DataTexture 128x64 (w = 1/PARTICLE_COUNT); nShade -> uint8 DataTexture 128x64
this.container.scale.set(27.5,27.5,16); rotation.y=Math.PI+.2; rotation.x=.1; position.y=34; position.z=25
// instanced 1x1 PlaneGeometry (a QUAD per particle, not gl_Points); attributes a_simUv(2), a_rands1(4), a_rands2(4)
new ShaderMaterial({ depthTest:false, depthWrite:false, transparent:true,
  blending:CustomBlending, blendEquation:AddEquation, blendSrc:OneFactor, blendDst:OneFactor,
  blendEquationAlpha:AddEquation, blendSrcAlpha:OneFactor, blendDstAlpha:OneFactor })  // pure additive
material.extensions.derivatives=true; mesh.frustumCulled=false
```
Only two meshes exist (current + next). Transition ratio `t` (0→1) drives:
```js
cur: u_activeRatio=1-t; pos.x=t*-1.5; pos.z=-t*2-(1-activeRatio)*2; rot.y=t*-.3+mouseYaw; rot.x=t*.4+mousePitch
nxt: u_activeRatio=t;   pos.x=(t-1)*-1.5; pos.z=(t-1)*2-(1-activeRatio)*2; rot.y=(t-1)*-.3+mouseYaw; rot.x=(t-1)*-.4+mousePitch
u_glitchThreshold = fit(activeRatio, .4, 1, 0, .9)      // glitch rows only while a swap is in progress
u_glitchOffset = Math.random()*1000 ; u_glitchStrength = Math.random()   // re-rolled EVERY FRAME
mouse: unproject NDC (x,y,.5), march 75 units along the ray, transform into faceContainer local space;
       yaw/pitch = clamp(local.x|y*.03, -.05, .05)
```
Auto-advance: `timeBaseChangeSpeed=.2` (≈5 s per face), tween per swap `1.25 + |Δindex|*.25` s with `ease.cubicInOut`. Click/swipe left/right = prev/next. Name/role text uses a DOM "matrix text" scramble (`setMatrixText(el,text,delay=0,dir=1,maxRandLetters=3,refresh=1/30)`, random chars `String.fromCharCode(33+~~(Math.random()*93))`, 30 letters/s in, 60 letters/s out). A single big letter (initial of the person) is drawn by `letterMesh` using the same `font.png` (glyph cell = 3×4 dots, `u_letterIdx*5+1` offset) with per-dot hash flicker.

### 2.3 Vertex shader (verbatim, `vert$3`) — the core
```glsl
uniform sampler2D u_positionTexture; uniform sampler2D u_norShadeTexture;
uniform float u_activeRatio, u_showRatio, u_time, u_isForward, u_glitchOffset, u_glitchStrength, u_glitchThreshold;
uniform vec3 u_mouse; uniform vec2 u_resolution;
attribute vec2 a_simUv; attribute vec4 a_rands1; attribute vec4 a_rands2;
varying float v_shade, v_showRatio, v_blurriness; varying vec2 v_toCenter, v_uv; varying vec3 v_color;
// simplexNoiseDerivatives(vec4): Ashima 4D simplex with analytic derivatives (returns vec4(dx,dy,dz,dw)*49)
// hash42(vec2): Dave Hoskins hash
void main(){
  vec3 basePos=texture2D(u_positionTexture,a_simUv).xyz;
  vec3 pos=basePos;
  float yRatio=basePos.y*0.5+0.5;
  // reveal: bottom-to-top wipe with per-particle jitter
  float showRatio=smoothstep(a_rands1.x*0.2+yRatio*0.4, 0.4+a_rands1.y*0.2+yRatio*0.4, u_showRatio);
  pos*=1.3;
  // not-yet-shown particles are scattered by noise derivatives + drift (+x with height, -z)
  pos+=(simplexNoiseDerivatives(vec4(basePos*8.,u_time)).yzw*0.2+vec3(1.*yRatio,0.0,-1.))*(1.-showRatio);
  v_showRatio=showRatio;
  vec4 norShade=texture2D(u_norShadeTexture,a_simUv);
  float depth=clamp(1.-pos.z,0.0,1.0);
  vec3 nor=norShade.xyz*2.-1.;
  vec3 worldPosition=(modelMatrix*vec4(pos,1.0)).xyz;
  vec3 viewNormal=normalMatrix*normalize(nor);
  vec3 worldNormal=inverseTransformDirection(viewNormal,viewMatrix);
  // ---- per-point lighting from a point light located AT THE MOUSE ----
  vec3 lightDir=normalize(u_mouse-worldPosition);
  float distToLight=distance(u_mouse,worldPosition);
  float light=norShade.w*1.25;                                   // baked shade
  float diff=linearStep(0.35,1.0,dot(worldNormal,lightDir))/sqrt(distToLight*0.1);
  light*=diff+0.6;
  light+=(0.05+diff*0.15)*smoothstep(0.0,0.005,norShade.w);     // floor so valid points never go fully black
  float frontFaceMultiplier=linearStep(-0.2,0.0,viewNormal.z);  // silhouette points facing away fade out
  light*=frontFaceMultiplier;
  // ---- fake DoF: focus plane moves with activeRatio; blur enlarges and dims the quad ----
  v_blurriness=min(1.0,(abs(depth-(1.-u_activeRatio*showRatio)*0.5))*2.5)*(2.-showRatio);
  float basePointSize=0.009*(1.+pow(v_blurriness,1.5)*8.)*frontFaceMultiplier;   // local units (head spans [-1,1])
  float pointSize=max(basePointSize,12./u_resolution.y);       // never below ~12 px
  float subpixelMultiplier=pow(basePointSize/pointSize,1.5);   // energy conservation when clamped up
  pos.xy+=position.xy*pointSize*step(0.003,light)*linearStep(0.0,0.75,u_activeRatio);  // billboard in local space
  // ---- horizontal "glitch rows" (hologram tear) ----
  vec4 verticalRands=hash42(vec2(floor(basePos.y*3.+cos(basePos.y*3.+u_glitchOffset)*2.+u_glitchOffset),0.))*u_glitchStrength;
  float glitchWeight=verticalRands.x*step(u_glitchThreshold,verticalRands.y);
  pos.x+=(verticalRands.z*verticalRands.z)*glitchWeight*0.35*cos(basePos.y+u_glitchOffset);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
  v_color=mix(vec3(1.0),(viewNormal.xzy*0.5+0.5)*vec3(1.0,0.5,2.0),glitchWeight);  // computed but unused in frag
  light*=(1.+glitchWeight*1.5); light+=0.1*glitchWeight;
  // ---- scanline sweeping downward; brightens the rim (|viewNormal.z| small) ----
  float scanline=smoothstep(0.04,0.,abs(fract(u_time*-0.3-basePos.y*.5+.5)));
  light+=scanline*(0.25*norShade.w*(1.0-light)+smoothstep(0.03,0.,abs(viewNormal.z)));
  v_shade=min(1.0,light*(1.-v_blurriness*0.5))*subpixelMultiplier*showRatio;
  v_toCenter=(uv-.5)*2.; v_uv=uv;
}
```
### 2.4 Fragment shader (verbatim, `frag$6`)
```glsl
varying float v_shade, v_showRatio, v_blurriness; varying vec2 v_toCenter;
void main(){
  float shade=v_shade;
  float d=length(v_toCenter);
  float range=v_blurriness*5.;
  float brightness=linearStep(1.,1.-range-fwidth(d),d);   // crisp disc when in focus, soft disc when blurred
  shade*=brightness*(1.25-v_blurriness*v_shade);
  gl_FragColor=vec4(shade)*v_showRatio*v_showRatio;         // GREYSCALE; colour comes from the post grade
  gl_FragColor.a*=pow(1.-v_blurriness,3.)*0.8*linearStep(0.8,1.0,v_showRatio*v_showRatio);
}
```
Key physics/logic takeaways:
1. **Volumetric look = real 3D positions + real normals + a moving point light** (mouse) with `1/sqrt(dist)` falloff and a `linearStep(0.35,1)` Lambert ramp. No SSAO, no depth buffer, no sorting.
2. **Rim glow** = scanline term `smoothstep(0.03,0,|viewNormal.z|)` + bloom afterwards; `frontFaceMultiplier` makes the silhouette dissolve naturally.
3. **Depth cue** = per-particle DoF: quad size ×`(1+8·blur^1.5)`, alpha ×`(1-blur)^3`, disc edge softness `range=blur*5`. Focus plane sits at `depth=(1-activeRatio)*0.5`, so the incoming/outgoing head is blurred.
4. **Particle size**: 0.009 of a [-1,1] head ≈ 0.45 % of head width; ≈ 6,100 visible particles per head.
5. **Slow motion** comes from mouse-driven yaw/pitch (±0.05 rad) and transition offsets, not from per-particle jitter; per-particle noise only appears during reveal (`1-showRatio`).
6. Everything is **grey**; the blue/green tint is `AboutPageHeroEfx` (§5).
7. **No per-particle morph A→B**: two heads cross-fade with opposite x/z/rotation offsets while glitch rows tear them.

---

## 3. THE GLYPH RAIN — `AboutHeroLetters` (verbatim)

```js
// placement: letter_placements.buf -> 196 instances, attrs position(3), density(1), dof(1)
// 4 meshes, each with n=floor(196/4)=49 instances, one shared ShaderMaterial (additive One/One, no depth test/write)
// base quad: PlaneGeometry(1,1).translate(0,.5,0).rotateY(PI)
_onBeforeRender: rt=fullscreen RT; clear(0,0);
  renderMesh(layer0); blur.blur(16,.5); renderMesh(layer1); blur.blur(8,.5);
  renderMesh(layer2); blur.blur(4,.5);  renderMesh(layer3)         // far layers blurred more = fake DoF
// rt is then composited additively as a fullscreen quad (renderOrder 10) inside the prepass scene
```
```glsl
// vertex (vert$2)
float charCount=mix(50.,100.,instanceRands.y);          // 50–100 glyph cells per column
pos.xy*=vec2(1.,6./5.*charCount);                        // cell aspect 5:6 (font.png is 5x6 per glyph)
v_charUv=vec2(1.-position.x,position.y*charCount)+vec2(.5,0.);
v_charUv.y-=u_time*mix(2.,10.,instanceRands.x);          // fall speed 2–10 cells/s
pos=pos*0.75+instancePos;
v_opacity=mix(.5,1.,instanceDensity)*u_showRatio;        // u_showRatio is shared with the faces
// fragment (frag$5)
float fade=1.-linearStep(15.,66.,v_worldPosition.z);
float MAX_CHAR=42.;
float charIdx=floor(mod(v_charUv.y,MAX_CHAR));
float charTime=u_time*mix(1.,2.,v_instanceRands.y+hash43(vec3(charIdx,-100.,v_instanceRands.z)).x);
vec4 charRands=hash43(vec3(charIdx,v_instanceRands.w,floor(charTime*-2.)));   // re-roll the glyph ~2x/s per cell
charIdx=mod(charIdx+floor(charRands.x*MAX_CHAR),MAX_CHAR);
vec2 charUv=vec2((v_charUv.x+charIdx)/MAX_CHAR,mod(v_charUv.y,1.));
float shade=texture2D(u_letterTexture,charUv).r;         // font.png 210x6, 1-bit
gl_FragColor=vec4(shade)*charRands.w*charRands.y*v_opacity;
gl_FragColor*=smoothstep(0.5,0.35,abs(v_uv.y-.5))        // fade top/bottom of the strip
             *(0.5+fade*0.5)*(0.3+v_instanceRands.z*1.25)
             *smoothstep(100.,150.,mod(v_charUv.y-200.*v_instanceRands.y,200.));  // long raindrop envelope, period 200 cells
gl_FragColor.a*=3.;
```
Public reference for the same idea (stationary grid + travelling illumination, MSDF glyphs, GPU raindrops): Rezmason/matrix — https://github.com/Rezmason/matrix ("the 2D glyphs are in a fixed grid and don't move"; sawtooth-wave cursors; params `numColumns=80`, `fallSpeed`, `bloomSize/bloomStrength`, `raindropLength`; REGL + beta WebGPU). Lusion's is simpler: UV-scrolling strips + hash flicker + envelope + layered blur.

---

## 4. THE CONTOUR LINES — `AboutHeroLines` (verbatim)

CPU build (`_onLineLoad`): `SEGMENT_COUNT=3`; every polyline vertex is expanded into 3 ring vertices (rotated around the tangent by 2π/3) → a **3-sided tube**; index buffer 6 tris per segment; attributes `position`, `normal` (ring direction), `t` (cumulative arc length), `totalLength`, `lineId`. 41 polylines delimited by `THREHSOLDS=[60,245,806,966,991,1026,1191,1853,2061,3111,4279,4309,4338,5265,5316,5447,5475,6407,6445,7116,7235,7349,7934,8555,8583,8614,9154,9640,9688,10163,10420,10645,10895,11074,11286,11453,11596,11628,11740,11799,11832]`.
```glsl
// vertex (vert$7)
float yIndex=floor(position.y+.5);
v_thicknessRatio=step(mod(yIndex,4.),0.5);                 // every 4th elevation = "index contour", thicker
vec3 pos=position+normal*mix(0.04,0.1,v_thicknessRatio);   // tube radius 0.04 / 0.10
gl_Position.z-=0.1/gl_Position.w;                          // depth bias toward camera
// fragment (frag$a); pnoise = classic periodic 2D Perlin (Ashima) * 2.3
float t=mod(v_t-u_time*2.,v_totalLength);                  // flow along the line at 2 units/s
float noiseScale=0.25;
float n=pnoise(vec2(t*noiseScale,0.),vec2(v_totalLength*noiseScale,100.));   // periodic -> seamless loop
float shade=mix(0.3+smoothstep(0.,0.-fwidth(n),n)*0.6, 1., v_thicknessRatio); // dash where noise<0; base .3, dash .9
shade*=linearStep(50.,-20.,v_worldPosition.z);             // fade with distance
gl_FragColor=vec4(shade,0.,0.,1.)*step(v_totalLength-v_t,v_totalLength*u_hudRatio);  // reveal by arc length
gl_FragColor.b=linearStep(15.,66.,v_worldPosition.z);      // B channel = depth for the bokeh pass
gl_FragColor.r*=.85;
// material: CustomBlending, blendEquation:MaxEquation, One/One  -> overlapping lines never over-brighten
```
Public references for contour-band shaders (same maths, not Lusion): Codrops "Building Ridgeline" 2026-07-22 https://tympanus.net/codrops/2026/07/22/building-ridgeline-engineering-a-real-time-3d-experience-in-webflow/ (height→band index, `fwidth()` AA, `uContourFreq`, `uContourWidth`, `uMajorEvery` bold index contours, `uMajorBoost`, hash dither ≈0.0045); Dietcode "Topographic Line Art with WebGL" https://dietcode.io/p/topographic/ (403 to fetch, surfaced by search); alexharri "A flowing WebGL gradient, deconstructed" https://alexharri.com/blog/webgl-gradients .

---

## 5. COMPOSITING / POST (why it glows, why it is blue-green)

`AboutHero` stage properties: `cameraFov:60, bloomAmount:4 (set to 3 at runtime), bloomRadius:.25, bloomThreshold:.8, bloomSmoothWidth:.3`; in team mode `bloomAmount=fit(hudRatio,0,.5,…,12.5)`, `haloStrength→0`. Convention: R = light, G = linear depth (`near=1, far=100`), B = far-fade used by the blur.

`AboutPageHeroEfxPrepass` (renderOrder 5) copies the hero frame and applies a **bokeh blur** when `blurRatio=hudRatio>0`:
```glsl
vec2 strength=vec2(1.,u_aspect)*.006*tex.b*u_blurRatio;   // radius scales with stored depth (B)
float theta=blueNoise.x*6.2831853;
for(int i=0;i<8;i++){ theta+=10.166407384630519; ra+=texture2D(u_texture,v_uv+vec2(cos(theta),sin(theta))*sqrt((fi+.5)/8.)*strength).ra; fi+=1.; }
gl_FragColor=(ra/8.).xxxy;
```
then it **renders `aboutHeroFaces.container` + `aboutHeroLetters.container` into the same target with `autoClear=false`** (additive on top of the blurred scene). `needsRenderScene = aboutHeroFaces.isActive`.

`AboutPageHeroEfx` (renderOrder 20) — Photoshop-style grade:
```glsl
vec3 colorDodge(src,dst)=mix(step(0.,src)*min(1.,dst/(1.-src)),1.,step(1.,dst));
vec3 colorBurn (src,dst)=mix(step(0.,src)*(1.-min(1.,(1.-dst)/src)),1.,step(1.,dst));
tex.rgb = mix( mix(tex,colorBurn(u_colorBurn,tex),burnA), mix(tex,colorDodge(u_colorDodge,tex),dodgeA), tex.rgb );
```
Scene mode: burn `#00f0ff` α .15, dodge `#005aff` α .12. **Team (HUD) mode: burn `#79a8ff` α 1.0, dodge `#a5ff44` α 0.7**, lerped by `hudRatio = aboutHeroFaces.showRatio` (alphas by `hudRatio²`). Dark greys → blue-ish burn; bright particles → acid-green dodge. That is the exact Lusion palette on the heads.

Global: `DPR = min(1.5, devicePixelRatio)`, pixel cap 2560×1440, SMAA, blue-noise dithering everywhere (`getBlueNoise`).

---

## 6. Public sources searched (what they contain / do not contain)

### 6.1 Lusion-specific
- Lusion about page — https://lusion.co/about/ (target). Awwwards element "Lusion - About" — https://www.awwwards.com/inspiration/lusion-about (one-page collection; no technique notes). Lusion v3 SOTY 2023 — https://www.awwwards.com/sites/lusion-v3 (palette #1a2ffb / #f0f1fa; jury: "The clean interface blends seamlessly with the over-the-top animations"). CSSDA WOTY — https://www.cssdesignawards.com/woty/lusion-v3/44311/ .
- Awwwards case study (2019 site) — https://www.awwwards.com/case-study-for-lusion-by-lusion-winner-of-site-of-the-month-may.html — quotes: "every single visual on our website uses some custom assets"; "we pre-rendered the normal, ambient-occlusion, thickness and 2 sets of diffused illuminations"; cloth "pre-calculated in Houdini FX", "220KB(Gzip) for the ArrayBuffer"; "246KB for mobile(1024 vertices)" / "983KB for desktop(4096 vertices)"; tools Houdini FX, Redshift3D, three.js, webpack. → documents the bake-offline-into-custom-.buf pipeline the team heads also use.
- Codrops profile 2026-04-13 "Lusion: Where Digital Craft Meets Ambitious Experimentation" — https://tympanus.net/codrops/2026/04/13/lusion-where-digital-craft-meets-ambitious-experimentation/ — no technical detail on the team section.
- Lusion GitHub: https://github.com/lusionltd/WebGL-Scroll-Sync (canvas absolutely positioned and offset per rAF: "If the scroll happens between two rAFs, the canvas will physically scroll with the page, keeping your 3D visuals attached to the DOM elements they're linked to"; vertical padding vs clipping: "drifting is visually distributing but clipping isn't"). https://github.com/lusionltd , https://github.com/lusionlabs , https://github.com/edankwan — no team-faces code.
- Edan Kwan: https://medium.com/@edankwan/lost-in-parallel-universe-dba640efd39a ("WebGL Particle Guy"); Particle Love https://lusion.co/work/particle-love/ ; Surface Floater https://experiments.withgoogle.com/surface-floater (SDF + curl noise); X https://x.com/edankwan , https://x.com/lusiondzn ; LinkedIn https://uk.linkedin.com/in/edankwan — no posts found explaining the about page.
- Recreations: `canxerian/lusion-reverse-engineered` https://github.com/canxerian/lusion-reverse-engineered + write-up http://mark-n.co/projects/lusion-reverse-engineered/ — home page only (Rapier ball pit + stencil "window", custom vertex-shader tile animation: "I coded the animation entirely mathematically, using a custom vertex shader"; HTML grid → world positioning). **About/team NOT covered** (src: animatedLine.js, animatedTube.js, homeScene.js, physicsSandbox.js, projectTiles.js, videoPanel*.js, shaders/).
- akella (Yuri Artiukh): Codrops "Curly Tubes from the Lusion Website" 2021-05-17 https://tympanus.net/codrops/2021/05/17/curly-tubes-from-the-lusion-website-with-three-js/ (demo https://lusionreplica.netlify.app/ , gist https://gist.github.com/akella/a19954c9ee42e3ae85b76d0e06977535 , YouTube https://www.youtube.com/@akella_ ). Home-page tubes only; no about-page stream found.
- three.js forum "Mouse effect at the top of three.js like on lusion.co" https://discourse.threejs.org/t/mouse-effet-at-the-top-of-three-js-like-on-https-lusion-co/57385 — answer: a post-processing displacement pass "on top of only the WebGL part". Not the team section.
- Searches with zero relevant hits: Reddit r/threejs / r/webgl "lusion about head particles"; YouTube "lusion about page recreation" / "lusion team head particles"; Medium/dev.to "lusion.co breakdown"; CodePen "lusion head particles"; X "lusion team faces"; discourse "lusion particles"; GitHub "lusion reverse engineering" beyond canxerian.

### 6.2 Closest public techniques for "team faces as particles"
- **Codrops 2025-06-30 "Invisible Forces: The Making of Phantom.land's Interactive Grid and 3D Face Particle System"** — https://tympanus.net/codrops/2025/06/30/invisible-forces-the-making-of-phantom-lands-interactive-grid-and-3d-face-particle-system/ — most relevant published pipeline: team members **3D-scanned with RealityScan (iPhone, Unreal)**, cleaned in Cinema4D, rendered to **two 256×256 WebP (colour + greyscale depth, <15 KB each)**; **280×280 = 78,400 particles**; `pos.z=(zDepth*2-1)*zScale` with "0 represents the furthest point (background), while 1 represents the closest point (typically the nose tip)"; size from luminance `density=(r+g+b)/3; pScale=mix(pScaleMin,pScaleMax,density)` ("Brighter facial features … create larger particles; darker areas … smaller"); ambient `pos+=curlNoise(pos*curlFreq1+time)*noiseScale*0.1`; GSAP 1.6 s uniform transitions with mid-point disturbance noise; R3F + BufferGeometry + GLSL. NOTE: this is the *depth-map* approach; Lusion instead uses true normals + baked shade and geometry-uniform density.
- **Codrops 2024-12-19 "Crafting a Dreamy Particle Effect with Three.js and GPGPU"** — https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/ (repo https://github.com/DGFX/codrops-dreamy-particles ): `new MeshSurfaceSampler(mesh).build()` for positions, GPUComputationRenderer position + velocity, soft disc `if(length(gl_PointCoord-.5)>.5) discard`, AdditiveBlending, depthWrite/Test false, UnrealBloom threshold .2 / strength .8 / radius .85.
- **Codrops 2021-08-31 "Surface Sampling in Three.js"** — https://tympanus.net/codrops/2021/08/31/surface-sampling-in-three-js/ .
- **three.js forum "3D point cloud for my head"** — https://discourse.threejs.org/t/3d-point-cloud-for-my-head/7367 — captured with **iPhone X TrueDepth ("Capture" app)**, exported .obj vertices only, PointsMaterial + `THREE.AdditiveBlending` ("it looks like there's light directed from both sides to the middle. Your suggestion of additive blending enhances this effect"). Live: jingkangzhang.com .
- **Codrops 2019-01-17 "Interactive Particles with Three.js"** — https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/ — InstancedBufferGeometry quads (the same primitive Lusion uses), image-driven, off-screen touch texture.
- Codrops 2026-08-19 "Relighting Images with Depth Maps and Three.js" — https://tympanus.net/codrops/2026/08/19/relighting-images-with-depth-maps-and-three-js/ (TSL/WebGPU; normals derived from depth — relevant if a depth-map path is kept).
- Rim lighting: https://threejsroadmap.com/blog/rim-lighting-shader . GPGPU/TSL: https://wawasensei.dev/courses/react-three-fiber/lessons/tsl-gpgpu , https://threejs-journey.com/lessons/gpgpu-flow-field-particles-shaders , https://threejs.org/examples/webgpu_compute_particles.html , FBO particles https://barradeau.com/blog/?p=621 , https://github.com/Kshitij978/Three.js-Point-cloud-morphing-effect .
- Matrix rain: https://github.com/Rezmason/matrix ; https://codepen.io/diegocmd/pen/wLWByz (canvas-texture katakana on a three mesh); https://andrewhungblog.wordpress.com/2018/08/29/procedural-graphics-series-3d-matrix-rain/ (glyph-atlas sampling in a shader); https://github.com/m8e/matrix-rain .
- Contour lines: see §4.

---

## 7. Is Lusion's head a 3D scan or a 2D photo? — Evidence table

| Evidence | Points to |
|---|---|
| Per-point normal vectors in the asset (`nShade.xyz`), used for Lambert lighting from a mouse light | 3D surface data (scan/sculpt), not a photo |
| All normals have +z; z normalised 0..1; no back-of-head points | Single front view of a 3D model, rendered/sampled offline (2.5D) |
| Uniform XY spacing (median 0.0118) independent of skin brightness; 2,061 padding points | Points sampled on geometry, then padded to a 128×64 texture |
| Studio statement "we pre-rendered the normal, ambient-occlusion, thickness…" (Awwwards case study) | Offline bake from 3D |
| Only a `shade` scalar, no RGB | Not a colour photo texture; greyscale + post grade |
| Head rotates ±0.05 rad with the mouse and ±0.3/0.4 rad in transitions and still reads solid | Real depth, not a flat billboard |

Conclusion: **3D-scan/mesh-derived front-hemisphere point set with normals** (most likely photogrammetry or iPhone scan → cleaned mesh → rendered position/normal/AO buffers → 8,192 samples). Not a photo→depth trick.

---

## 8. Recipe distilled for SerSan (numbers from Lusion unless noted)

1. **Asset**: scan each founder (RealityScan / Polycam / TrueDepth; Phantom.land used RealityScan). Clean mesh, front-facing. Sample **8,192 points uniformly on the surface** (MeshSurfaceSampler or Blender point-distribute), keep only `n.z > -0.2`; store `position` (x,y ∈ [-1,1], z ∈ [0,1], uint16) and `normal(3)+AO/shade(1)` as uint8; ≈ 82 KB/person; pad to 128×64. For the current SerSan photo pipeline the *minimum* fix is: place points by a uniform grid/blue-noise over the face **mask** (alpha/segmentation), never by luminance, and derive normals from the depth map (Codrops relighting article) so bright skin gets lit rather than culled.
2. **Render**: instanced quads (not gl_Points) so size can exceed point-size limits and DoF can enlarge them; additive One/One; no depth; `basePointSize=0.009`, min 12 px, `subpixelMultiplier=(base/clamped)^1.5`.
3. **Lighting**: light at the mouse ray (75 units), `diff=linearStep(.35,1,dot(N,L))/sqrt(d*0.1)`, `light=shade*1.25*(diff+.6)+(0.05+diff*.15)`, kill back-facing via `linearStep(-.2,0,viewN.z)`.
4. **Depth cue**: `blur=min(1,|depth-focus|*2.5)`, size ×`(1+8·blur^1.5)`, alpha ×`(1-blur)^3`, disc softness `range=blur*5` with `fwidth`.
5. **Life**: scanline `smoothstep(.04,0,|fract(-0.3t - 0.5y + .5)|)` adds rim (`smoothstep(.03,0,|viewN.z|)`); glitch rows re-rolled per frame, only while `activeRatio<1`; reveal wipe bottom→top with simplex-derivative scatter.
6. **A→B**: no per-particle morph — **cross-fade two heads** with opposite offsets (`x=±1.5·t, z=∓2·t, ry=∓.3·t, rx=±.4·t`), 1.25–1.5 s cubicInOut, glitch threshold `fit(active,.4,1,0,.9)`.
7. **Glyph rain**: 196 strips, 50–100 cells, fall 2–10 cells/s, 42-glyph 5×6 atlas, hash re-roll ≈2 Hz, 4 layers blurred 16/8/4/0 px, additive.
8. **Contours**: polylines → 3-sided tubes r=0.04 (index lines 0.10 every 4th), periodic Perlin dash flowing at 2 u/s, `MaxEquation` blend, reveal by arc length.
9. **Post**: bokeh-blur the background by depth (8-tap blue-noise disc, `.006*depth`), grade with colour-burn `#79a8ff` (α1) / colour-dodge `#a5ff44` (α.7) → for SerSan use brand cyan/violet; bloom amount 12.5, radius .25, threshold .8; DPR ≤ 1.5.

---

## 9. Reproduction commands (all public)
```
curl -sL https://lusion.co/about/ | grep -o '/_astro/[^"]*'
curl -sL https://lusion.co/_astro/hoisted.CUO_IjfL.js -o hoisted.js ; grep -ob 'class AboutHeroFaces' hoisted.js   # byte 1014998
curl -sL https://lusion.co/assets/team/team.json
curl -sL https://lusion.dev/assets/team/edan.buf -o edan.buf   # uint32 headerLen + JSON, then Uint16 pos x3, Uint8 nShade x4
curl -sL https://lusion.dev/assets/textures/font.png            # 210x6 1-bit
curl -sL https://lusion.dev/assets/models/about/letter_placements.buf ; curl -sL https://lusion.dev/assets/models/about/terrain_lines.buf
```
Statistics in §2.1 were produced with a 30-line Node script decoding the header's `packedComponents` (`value = from + u16/65535*delta`).
