# DOSSIER `web-lusion-look` — THE LUSION TEAM LOOK, layer by layer, with sources

Date: 2026-08-27. Author: research subagent. Target: SerSan `founders-rail` / `src/webgl/FounderPortraitMorph.tsx` (repo `C:/Users/alber/Desktop/Sersan`).

## 0. Coverage note (read first)

- The `WebSearch` tool had exhausted its session budget (200/200) before this task started; DuckDuckGo/Bing returned CAPTCHA/empty pages to curl and WebFetch; Shadertoy view pages returned 403. So **generic "search everything" was impossible**. Instead I went to the primary source: I downloaded and reverse-engineered **the real production bundle of lusion.co/about** (`https://lusion.co/_astro/hoisted.CUO_IjfL.js`, 1,251,728 bytes, un-mangled class names) plus its data assets. Everything in §1 is therefore **verbatim Lusion code and measured data**, not speculation. Local copies: `scratchpad/ws/hoisted.js`, `ws/lusion_faces.js`, `ws/lusion_lines.js`, `ws/lusion_hero.js`, `ws/lusion_team_ui.js`, `ws/edan.buf`, `ws/font.png`, `ws/letter_placements.buf`, `ws/terrain_lines.buf`.
- Secondary sources (§2–§6) were reached directly by URL (Codrops site search works, GitHub API works, raw.githubusercontent works). Every URL below was actually fetched in this session unless marked "(not fetched)". I found **no public write-up/recreation of Lusion's team section** anywhere I could reach (Codrops search "lusion" → only the 2026-04-13 studio profile, no technical breakdown; GitHub `Tcode-Motion/lusion-clone` is an HTML/CSS clone with static team photos, no particle faces).

---

## 1. REVERSE ENGINEERING OF lusion.co/about "TEAM" (primary source)

### 1.1 Architecture: the faces live INSIDE the about-page hero 3D stage

Class list found in the bundle region 950k–1.1M: `AboutHeroParticlesSimulation, AboutHeroScatter, AboutHeroParticles, AboutHeroRocks, AboutHeroGround, AboutHeroLines, aboutHeroPerson, AboutHeroFog, AboutHeroHalo, AboutHeroFaces, AboutHeroLetters, WhoSubsectionTeam, AboutWhoSection, TextAnimationHelper`.

`AboutHero.preInit()` (bundle offset ~1,027,300) inits, in order: `aboutPageHeroEfxPrepass, aboutPageHeroEfx, light, sim, lightField, aboutHeroParticles, aboutHeroRocks, aboutHeroGround, aboutHeroLines, aboutHeroPerson, aboutHeroFog, aboutHeroHalo, aboutHeroFaces, aboutHeroLetters`. Stage constructor params (verbatim):

```js
defaultCameraPosition:new Vector3(0,5,5), defaultLookAtPosition:new Vector3(0,5,0),
cameraFov:60, bloomAmount:4, bloomRadius:.25, bloomThreshold:.8, bloomSmoothWidth:.3,
haloStrength:0, clearAlpha:0, cameraLookStrength:.1, screenPaintDistortionRGBShift:.1
```

So the four layers you listed are four sibling objects in one scene, all rendered into the same HDR buffer and bloomed together: **AboutHeroFaces** (head point cloud), **AboutHeroLetters** (glyph rain), **AboutHeroLines** (floor contour lines), **AboutHeroFog/Halo** (smoky volume), plus DOM HUD (`WhoSubsectionTeam`).

DOM skeleton (from `https://lusion.co/about/` HTML): `#about-who-team-faces` (empty div = hit-area over the WebGL canvas), `#about-who-team-number` → `[[` `001` `]]`, `#about-who-team-name-text`, `#about-who-team-job-text`, `#about-who-team-progress/indicator`, `#about-who-team-top-compass`, `#about-who-team-bottom-compass`, `#about-who-team-dots`, `#about-who-team-letter-container`, `#about-who-face-cursor` (arrow SVG), mobile tip "Swipe to change". The 4-square icon before the name is an inline SVG (`M3 3h3v3H3V3ZM10 3h3v3h-3V3ZM3 10h3v3H3v-3ZM10 10h3v3h-3v-3Z`).

Team data: `https://lusion.co/assets/team/team.json` → 7 entries `{id,name,role}` (edan, ffi, pierre, yannic, paul, andrii, sunny). Each face = `https://lusion.co/assets/team/<id>.buf` (edan.buf = 82,280 bytes).

### 1.2 LAYER 1 — the head point cloud (`AboutHeroFaces`) — THE KEY FINDING

**It is not sampled from a photo. It is a pre-baked 8,192-point 3D scan with per-point normal + baked shade.** This is exactly why Lusion has no "empty patches" where skin matches the white wall: the point set comes from geometry, and brightness comes from normals/lighting, not from photo luminance.

`.buf` header (verbatim, from `edan.buf`):

```json
{"vertexCount":8192,"indexCount":0,"attributes":[
 {"id":"position","needsPack":true,"componentSize":3,"storageType":"Uint16Array",
  "packedComponents":[{"from":-0.999023438,"delta":1.998535157},{"from":-0.999511719,"delta":1.998535157},{"from":0,"delta":1}]},
 {"id":"nShade","needsPack":false,"componentSize":4,"storageType":"Uint8Array"}],
 "meshType":"Points"}
```

Measured on `edan.buf` (python, `ws/`): position xy ∈ [-1,1], **z ∈ [0,1] with percentiles p5=0.00, p25=0.44, p50=0.79, p75=0.90, p95=0.96** (a real relief: nose/cheeks near 1, ears/hair back near 0). `nShade.xyz` = normal ×0.5+0.5 (mean |n| = 1.05 → uint8 normal), **98.9 % of normals have nz>0 → front-hemisphere-only scan** (a depth-camera / photogrammetry front capture, not a full head). `nShade.w` = baked shade/AO in [0,1] (p50=0.15, p95=0.40, **26 % of points have shade≈0** → these points exist but stay dark: shadow side is *present but dim*, which is what makes it read volumetric).

Upload (verbatim): positions → RGBA float DataTexture 128×64 (`PARTICLE_COUNT=8192, SIM_TEXTURE_WIDTH=128, SIM_TEXTURE_HEIGHT=64`), `nShade` → second DataTexture. Geometry = `InstancedBufferGeometry` from `PlaneGeometry(1,1)` with per-instance `a_simUv (vec2)`, `a_rands1 (vec4)`, `a_rands2 (vec4)`. **Two meshes only (`MAX_FACE_NUM=2`)**: current face and next face — there is **no morph**; the transition is a cross-fade with glitch, offset and rotation (see 1.2.4).

Container transform: `scale.set(27.5,27.5,16)` (xy 27.5, z 16 → the relief is squashed to 16/27.5 = 0.58 of xy — SerSan's own `16 : 27.5` note in `FounderPortraitMorph.tsx` line ~233 already mirrors this), `rotation.y = π+0.2`, `rotation.x = 0.1`, `position.y = 34`, `position.z = 25`.

Material: `ShaderMaterial`, `depthTest:false, depthWrite:false, transparent:true, blending:CustomBlending, blendEquation:AddEquation, blendSrc:OneFactor, blendDst:OneFactor` (pure additive, also on alpha), `extensions.derivatives = true`.

#### 1.2.1 Vertex shader (verbatim, `vert$3`, noise functions omitted; they are Ashima 4D simplex with derivatives — `simplexNoiseDerivatives(vec4)`)

```glsl
uniform sampler2D u_positionTexture; uniform sampler2D u_norShadeTexture;
uniform float u_activeRatio; uniform float u_showRatio; uniform vec3 u_mouse;
uniform vec2 u_resolution; uniform float u_time; uniform float u_isForward;
uniform float u_glitchOffset; uniform float u_glitchStrength; uniform float u_glitchThreshold;
attribute vec2 a_simUv; attribute vec4 a_rands1; attribute vec4 a_rands2;
varying float v_shade; varying float v_showRatio; varying float v_blurriness;
varying vec2 v_toCenter; varying vec2 v_uv; varying vec3 v_color;
vec4 hash42(vec2 p){vec4 p4=fract(vec4(p.xyxy)*vec4(.1031,.1030,.0973,.1099));p4+=dot(p4,p4.wzxy+33.33);return fract((p4.xxyz+p4.yzzw)*p4.zywx);}
float linearStep(float e0,float e1,float x){return clamp((x-e0)/(e1-e0),0.0,1.0);}
vec3 inverseTransformDirection(in vec3 dir,in mat4 matrix){return normalize((vec4(dir,0.0)*matrix).xyz);}
void main(){
  vec3 basePos=texture2D(u_positionTexture,a_simUv).xyz; vec3 pos=basePos;
  float yRatio=basePos.y*0.5+0.5;
  // REVEAL: bottom-up, per-point randomised
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
  // LIGHTING: a point light that FOLLOWS THE MOUSE (u_mouse is in world space)
  vec3 lightDir=normalize(u_mouse-worldPosition);
  float distToLight=distance(u_mouse,worldPosition);
  float light=norShade.w*1.25;                                   // baked shade
  float diff=linearStep(0.35,1.0,dot(worldNormal,lightDir))/sqrt(distToLight*0.1);
  light*=diff+0.6;
  light+=(0.05+diff*0.15)*smoothstep(0.0,0.005,norShade.w);
  float frontFaceMultiplier=linearStep(-0.2,0.0,viewNormal.z);   // back-facing points vanish
  light*=frontFaceMultiplier;
  // DEPTH OF FIELD: blurriness from |depth - focal plane|
  v_blurriness=min(1.0,(abs(depth-(1.-u_activeRatio*showRatio)*0.5))*2.5)*(2.-showRatio);
  float basePointSize=0.009*(1.+pow(v_blurriness,1.5)*8.)*frontFaceMultiplier;  // blurred points grow up to 9x
  float pointSize=max(basePointSize,12./u_resolution.y);
  float subpixelMultiplier=pow(basePointSize/pointSize,1.5);     // energy conservation for sub-pixel points
  pos.xy+=position.xy*pointSize*step(0.003,light)*linearStep(0.0,0.75,u_activeRatio);  // quad expanded in LOCAL space
  // GLITCH: horizontal band tearing, randomised every frame from JS
  vec4 verticalRands=hash42(vec2(floor(basePos.y*3.+cos(basePos.y*3.+u_glitchOffset)*2.+u_glitchOffset),0.))*u_glitchStrength;
  float glitchWeight=verticalRands.x*step(u_glitchThreshold,verticalRands.y);
  pos.x+=(verticalRands.z*verticalRands.z)*glitchWeight*0.35*cos(basePos.y+u_glitchOffset);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
  v_color=mix(vec3(1.0),(viewNormal.xzy*0.5+0.5)*vec3(1.0,0.5,2.0),glitchWeight);
  light*=(1.+glitchWeight*1.5); light+=0.1*glitchWeight;
  // SCANLINE sweeping downward
  float scanline=smoothstep(0.04,0.,abs(fract(u_time*-0.3-basePos.y*.5+.5)));
  light+=scanline*(0.25*norShade.w*(1.0-light)+smoothstep(0.03,0.,abs(viewNormal.z)));  // rim term: |viewNormal.z|≈0
  v_shade=min(1.0,light*(1.-v_blurriness*0.5))*subpixelMultiplier*showRatio;
  v_toCenter=(uv-.5)*2.; v_uv=uv;
}
```

#### 1.2.2 Fragment shader (verbatim, `frag$6`)

```glsl
varying float v_shade; varying float v_showRatio; varying vec2 v_toCenter; varying float v_blurriness; varying vec2 v_uv; varying vec3 v_color;
float linearStep(float e0,float e1,float x){return clamp((x-e0)/(e1-e0),0.0,1.0);}
void main(){
  float shade=v_shade;
  float d=length(v_toCenter);
  float range=v_blurriness*5.;
  float brightness=linearStep(1.,1.-range-fwidth(d),d);   // sharp disc when in focus, soft blob when blurred
  shade*=brightness*(1.25-v_blurriness*v_shade);
  gl_FragColor=vec4(shade)*v_showRatio*v_showRatio;         // greyscale! colour comes from post (§1.6)
  gl_FragColor.a*=pow(1.-v_blurriness,3.)*0.8*linearStep(0.8,1.0,v_showRatio*v_showRatio);
}
```

Take-aways for the "volumetric" read:
1. **Brightness = baked shade × (N·L from a mouse-following light) × front-facing factor**, never photo luminance.
2. **Rim glow** = `smoothstep(0.03,0.,abs(viewNormal.z))` added on the scanline pass (silhouette points where the view normal is tangent), plus additive blending + bloom makes silhouettes glow.
3. **"Smoky interior"** = the out-of-focus points: `v_blurriness` grows point size up to 9× and turns the disc into a soft blob with reduced alpha (`pow(1-b,3)*0.8`) — a per-particle DoF, which is the same trick as Codrops' *Blurry* library (§2.4).
4. Points are quads expanded in **model space** (`pos.xy += position.xy*pointSize`), so they scale with the head like a physical dust cloud, not screen-space sprites.

#### 1.2.3 Per-frame JS (verbatim, `update`)

```js
let t=this.transitionRatio; this.sharedUniforms.u_showRatio.value=this.showRatio;
let r=input.easedMouseDynamics.default.value;
_v1$1.set(r.x,r.y,.5).unproject(cameraControls._camera).sub(cameraControls._camera.position).normalize();
_v1$1.multiplyScalar(75/_v1$1.z).add(cameraControls._camera.position);   // mouse ray → plane at z=75 → world light pos
_m.copy(this.faceContainer.matrixWorld).invert(); _v1$1.applyMatrix4(_m);
let n=math.clamp(_v1$1.y*.03,-.05,.05), a=math.clamp(_v1$1.x*.03,-.05,.05);   // ±0.05 rad parallax tilt
_v1$1.applyMatrix4(this.faceContainer.matrixWorld); this.sharedUniforms.u_mouse.value.copy(_v1$1);
let l=this.meshArray[0];  // current face
l.material.uniforms.u_activeRatio.value=1-t;
l.material.uniforms.u_glitchThreshold.value=math.fit(l.material.uniforms.u_activeRatio.value,.4,1,0,.9);
l.position.x=t*-1.5; l.position.z=-t*2-(1-this.activeRatio)*2; l.rotation.y=t*-.3+a; l.rotation.x=t*.4+n;
let c=this.meshArray[1];  // next face
c.material.uniforms.u_activeRatio.value=t; ...
c.position.x=(t-1)*-1.5; c.position.z=(t-1)*2-...; c.rotation.y=(t-1)*-.3+a; c.rotation.x=(t-1)*-.4+n;
this.sharedUniforms.u_glitchOffset.value=Math.random()*1e3; this.sharedUniforms.u_glitchStrength.value=Math.random();
```

Transition tween (WhoSubsectionTeam.next/prev): `duration = 1.25 + |Δindex|*0.25` s, `ease.cubicInOut`. The face "slowly drifting" is the mouse-parallax (±0.05 rad) plus the noise in the vertex shader while `showRatio<1`; there is no continuous auto-rotation in this code.

#### 1.2.4 The A→B change is a cross-fade, not a morph
Outgoing face: `u_activeRatio 1→0` → its focal plane shifts (`(1-u_activeRatio*showRatio)*0.5`) so it **defocuses into smoke**, glitch threshold drops (`fit(activeRatio,.4,1,0,.9)`) so **more bands tear**, it slides `x -1.5`, `z -2`, rotates `y -0.3, x +0.4`. Incoming face does the mirror. Both additive, so the overlap reads as one dissolving cloud.

### 1.3 LAYER 2 — glyph rain (`AboutHeroLetters`) — verbatim

Data: `https://lusion.co/assets/models/about/letter_placements.buf` → **196 placements**, attributes `dof (int16 packed 0..1.64)`, `position (x∈[-86.8,82.6], y∈[-0.85,16.1], z∈[-8.1,97.0])`, `density (uint8)`. Split into **4 LOD groups of 49** (`n=floor(196/4)`), each drawn then blurred with a different radius → depth-of-field layering.

Glyph atlas: `https://lusion.co/assets/textures/font.png` = **210×6 px, 1-bit** = 42 glyph cells × 5 px (3-px glyph + 2-px gap), 4-px tall glyph, uppercase A–Z, 0–9, a few symbols (rendered to ASCII in `ws/` — first cells are `A B C D E F G H I J K L M N O P Q R S T U V W X Y Z 0 1 2 3 …`). `MAX_CHAR = 42`.

Vertex (verbatim `vert$2`): each instance is a tall vertical strip of `charCount ∈ [50,100]` cells scrolling down at `[2,10]` cells/s:
```glsl
attribute vec3 instancePos; attribute vec4 instanceRands; attribute float instanceDensity;
uniform float u_time; uniform float u_showRatio;
varying vec2 v_uv; varying vec2 v_charUv; varying vec3 v_worldPosition; varying vec4 v_instanceRands; varying float v_opacity;
void main(){
  float charCount=mix(50.,100.,instanceRands.y);
  vec3 pos=position; v_uv=uv;
  pos.xy*=vec2(1.,6./5.*charCount);                       // strip = 1 wide × charCount cells (6/5 aspect)
  v_charUv=vec2(1.-position.x,position.y*charCount)+vec2(.5,0.);
  v_charUv.y-=u_time*mix(2.,10.,instanceRands.x);         // scroll speed per column
  pos=pos*0.75+instancePos;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);
  v_worldPosition=(modelMatrix*vec4(pos,1.)).xyz; v_instanceRands=instanceRands;
  v_opacity=mix(.5,1.,instanceDensity)*u_showRatio;
}
```
Fragment (verbatim `frag$5`):
```glsl
uniform sampler2D u_letterTexture; uniform float u_time;
varying vec2 v_charUv; varying vec2 v_uv; varying vec3 v_worldPosition; varying vec4 v_instanceRands; varying float v_opacity;
float linearStep(float e0,float e1,float x){return clamp((x-e0)/(e1-e0),0.0,1.0);}
vec4 hash43(vec3 p){vec4 p4=fract(vec4(p.xyzx)*vec4(.1031,.1030,.0973,.1099));p4+=dot(p4,p4.wzxy+33.33);return fract((p4.xxyz+p4.yzzw)*p4.zywx);}
void main(){
  float fade=1.-linearStep(15.,66.,v_worldPosition.z);            // distance fade
  float MAX_CHAR=42.;
  float charIdx=floor(mod(v_charUv.y,MAX_CHAR));
  float charTime=u_time*mix(1.,2.,v_instanceRands.y+hash43(vec3(charIdx,-100.,v_instanceRands.z)).x);
  vec4 charRands=hash43(vec3(charIdx,v_instanceRands.w,floor(charTime*-2.)));   // re-roll glyph ~2×/s
  charIdx=mod(charIdx+floor(charRands.x*MAX_CHAR),MAX_CHAR);
  vec2 charUv=vec2((v_charUv.x+charIdx)/MAX_CHAR,mod(v_charUv.y,1.));          // atlas lookup
  float shade=texture2D(u_letterTexture,charUv).r;
  gl_FragColor=vec4(shade)*charRands.w*charRands.y*v_opacity;                  // per-glyph flicker
  gl_FragColor*=smoothstep(0.5,0.35,abs(v_uv.y-.5))                              // fade strip ends
              *(0.5+fade*0.5)*(0.3+v_instanceRands.z*1.25)
              *smoothstep(100.,150.,mod(v_charUv.y-200.*v_instanceRands.y,200.)); // 200-cell period: 150 off / 50 ramp-in → "drops"
  gl_FragColor.a*=3.;
}
```
Compositing (verbatim `_onBeforeRender`): render into an RT, **LOD0 then `blur.blur(16,.5,…)`, LOD1 then blur 8, LOD2 then blur 4, LOD3 sharp**, then the RT is added to the scene as a full-screen quad, additive, `renderOrder=10`. The blur is a separable 9-tap Gaussian (weights `0.1633, 0.1531, 0.12245, 0.0918, 0.051`) at half resolution with `u_delta = radius/size*0.25`. Material: additive `CustomBlending One/One`, no depth.

### 1.4 LAYER 3 — floor contour lines (`AboutHeroLines`) — verbatim

**Not a shader iso-line field. They are pre-baked polylines** from `https://lusion.co/assets/models/about/terrain_lines.buf` (11,832 vertices, **41 polylines** split by `THREHSOLDS=[60,245,806,…,11832]`, x∈[-63,58], **y = integer levels 1…19** → real marching-squares contours of the terrain height field, exported from a DCC; the same terrain is `about/terrain_shadow_light_height.webp`). On load, JS extrudes every polyline into a **3-sided tube** (`SEGMENT_COUNT=3`, parallel-transport frame with quaternion rotation `2π/3`) with attributes `t` (arc length), `totalLength`, `lineId`. Vertex offset = `normal * mix(0.04, 0.1, v_thicknessRatio)` where `v_thicknessRatio = step(mod(yIndex,4),0.5)` → **every 4th level is a thick "index contour"**, others thin. Depth bias `gl_Position.z -= 0.1/gl_Position.w`.

Fragment (verbatim `frag$a`, Perlin `pnoise` omitted): the glow **travels along the line**:
```glsl
void main(){
  float t=mod(v_t-u_time*2.,v_totalLength);                       // 2 units/s along the line
  float noiseScale=0.25;
  float n=pnoise(vec2(t*noiseScale,0.),vec2(v_totalLength*noiseScale,100.));   // periodic → seamless loop
  float shade=mix(0.3+smoothstep(0.,0.-fwidth(n),n)*0.6,1.,v_thicknessRatio);   // thin lines pulse 0.3↔0.9 where noise<0; thick = 1
  shade*=linearStep(50.,-20.,v_worldPosition.z);                  // distance fade
  gl_FragColor=vec4(shade,0.,0.,1.)*step(v_totalLength-v_t,v_totalLength*u_hudRatio);   // draw-on with hudRatio
  gl_FragColor.b=linearStep(15.,66.,v_worldPosition.z);           // depth written to B for the post pass
  gl_FragColor.r*=.85;
}
```
Blending: `CustomBlending, blendEquation: MaxEquation, One/One` (lines never over-accumulate), `renderOrder=15`.

### 1.5 Fog / halo (the smoky volume)
`AboutHeroFog`: 32 instanced 3×3-segment quads with `about/fog.png`, positions seeded `math.getSeedRandomFn("fog96")`, x=12·(rand·2−1), z=12·(1−i/31·2); they cycle sideways (`cycle=fract((0.08+0.08*rand)*u_introTime+rand)`), rotate, and are **soft particles**: alpha uses `linearStep(0.0,0.035,depth-currScene.g)` against the scene depth previously written into the G channel (see §1.6), `exp(-length(...)*(0.22-fogMap.x*0.2))*fogMap.y*...*0.45`; blending `SrcAlpha/OneMinusSrcAlpha`, renderOrder 20. `AboutHeroHalo`: a `bg_box.buf` with `getScatter(cameraPosition, worldPos)` + blue-noise dither.

### 1.6 Post: greyscale scene → colour grading → bloom → dither
- Every hero material writes **R = luminance, G = linear depth, B = distance fade** (`aboutHeroVisualFinal_frag`: `gl_FragColor.g=v_depth; gl_FragColor.b=1.0;` with `v_depth=1.0-(viewZ+1)/(1-100)`). The faces write plain greyscale.
- `AboutPageHeroEfxPrepass` (renderOrder 5): optional 16-tap **motion blur** and an 8-tap golden-angle **disc blur** whose strength is `0.006*tex.b*u_blurRatio` (uses B = distance).
- `AboutPageHeroEfx` (renderOrder 20) — **the colour comes from here** (verbatim):
```glsl
vec3 colorDodge(vec3 src,vec3 dst){return mix(step(0.,src)*(min(vec3(1.),dst/(1.-src))),vec3(1.),step(1.,dst));}
vec3 colorBurn (vec3 src,vec3 dst){return mix(step(0.,src)*(1.-min(vec3(1.),(1.-dst)/src)),vec3(1.),step(1.,dst));}
void main(){ vec4 texture=texture2D(u_texture,v_uv);
  vec3 cb=mix(texture.rgb,colorBurn (u_colorBurn ,texture.rgb),u_colorBurnAlpha);
  vec3 cd=mix(texture.rgb,colorDodge(u_colorDodge,texture.rgb),u_colorDodgeAlpha);
  texture.rgb=mix(cb,cd,texture.rgb); gl_FragColor=texture; }
```
  Constants: scene `_sceneColorBurn=#00f0ff (α .15)`, `_sceneColorDodge=#005aff (α .12)`; HUD/team state `_hudColorBurn=#79a8ff (α 1)`, `_hudColorDodge=#a5ff44 (α .7)`, lerped by `hudRatio²`. So the team section is graded blue-shadow / acid-green-highlight on a greyscale render.
- Bloom: multi-iteration Gaussian pyramid (`u_bloomWeights[ITERATION]`), high-pass `dot(rgb, vec3(.299,.587,.114))` with `u_luminosityThreshold=.8`, `u_smoothWidth=.3`, `u_amount=4`, `radius .25`, **plus ±0.25/255 RGB dithering** in the composite (`dithering()` fn) — that's the "film grain" you perceive: it is 1-LSB dither, not a FilmPass.

### 1.7 HUD accents (DOM, `WhoSubsectionTeam`)
- Counter `[[ 001 ]]` = three DOM spans; `updateTeamNumberUI()` pads the index.
- Name/role use **matrix-text decode** (`TextAnimationHelper.setMatrixText(el, text, delay=0, lettersPerSecond=1, maxRandLetters=3, refresh=1/30)`): each tick shows `text.substr(0,a)` + `l-a` random chars `String.fromCharCode(33+~~(Math.random()*93))`. Called as `setMatrixText(this.domLeftNameText,r,0,1,3,1/30)`.
- Compass rulers: `_createUIElements()` builds `(teamCount-4)*4` groups of `1 long + 4 small` tick divs (`.about-who-team-top-compass-long/-small`), translated by scroll; dots grid = 11 columns × 3 `.about-who-team-dot`.
- Big letter behind the name: `UfxMesh` with `letterVert/letterFrag` sampling the same 210×6 `font.png` at `v_pixel = (u_letterIdx*5+1, 1) + (uv.x, 1-uv.y)*(3,4)`; pixels flicker in with `hash43(floor(v_pixel), floor(u_opacity*3)+floor(u_time+sin(u_time*3)*1.5))`, `opacity = mix(pow(rands.x,5.), 0.95+rands.y*0.05, smoothstep(.75,1.,u_opacity))`, and a 5 %-wide **dot grid** `step(max(dd.x,dd.y),.05)` drawn at 0.3 alpha behind the glyph (the "+ crosshair / dotted" texture).

---

## 2. LAYER 1 alternatives & supporting techniques (public sources)

### 2.1 Getting a VOLUMETRIC head from headshots (the actual root cause)
Lusion's points come from a 3D capture. Options to get SerSan there from the existing studio photos:

| Route | Source | Notes |
|---|---|---|
| Monocular depth (already used by SerSan: "Depth Anything V2 base" per `FounderPortraitMorph.tsx` ~l.264) | https://github.com/DepthAnything/Depth-Anything-V2 | Small 24.8M (Apache-2.0), Base 97.5M / Large 335M (CC-BY-NC). `python run.py --encoder vitl --img-path <p> --outdir <o>`; relative depth HxW. Gives z but **no normals** → derive normals from depth gradient (§2.3). |
| 3D face mesh from one photo | https://github.com/yfeng95/DECA | FLAME head + detail displacement, outputs `.obj` + texture + optional depth (`python demos/demo_reconstruct.py -i <dir> --saveDepth True --saveObj True`). **Non-commercial license** — research only unless licensed. |
| 478 3-D landmarks in browser | https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker | "an estimate of 478 3-dimensional face landmarks" + 52 blendshapes; JS runtime; coarse (no hair/scalp) but Apache-2.0 and instant. |
| Photogrammetry / Gaussian splats | https://github.com/mkkellogg/GaussianSplats3D ; Codrops Tsitsipas scan https://tympanus.net/codrops/2026/07/01/sculpting-a-digital-athlete-capturing-stefanos-tsitsipas-beyond-the-court/ ("around 70 cameras") | Real capture; splat `.ply` → sample points + normals. Requires a new photo session. |
| Blender via Blender MCP + Hyper3D/Hunyuan image-to-3D (AGENTS.md §3b) | project instructions | Generate a head mesh from the headshot, then **sample N points on the surface with normals + AO bake** and export as SerSan's own `.buf`-like packed attribute (positions uint16, normal+AO uint8×4, exactly Lusion's format). |

Lusion's data-format is worth copying literally: 8192 pts × (6 B pos + 4 B nShade) = 80 KB per face.

### 2.2 Image → particles (what SerSan does today; why it looks flat)
- Codrops **Interactive Particles with Three.js** (Bruno Imbrizi) https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/ — repo https://github.com/brunoimbrizi/interactive-particles. Instanced quads, one per pixel of a 320×180 image, "discard pixels darker than threshold #22"; greyscale `0.21R+0.72G+0.07B` drives size; `smoothstep` disc alpha. **This is the halftone look** — flat by construction.
- GitHub `ofir1233/Project-51` `p51/lab/pointcloud-embed.mjs` (fetched): same idea with `pos.z += (aLum-0.5)*uDepth` (uDepth 0.45), `gl_PointSize = uPointSize*uPixelRatio*(1+aLum*0.7)*(1.6/-mvPos.z)`, disc `1-smoothstep(0.34,0.5,r)`, `lumCutoff 0.78`. Luminance-as-depth is exactly the "comb" artefact SerSan already documented (`Z_RELIEF_DEPTH_FRAC` comment).
- Codrops UntilLabs case study https://tympanus.net/codrops/2025/12/10/simulating-life-in-the-browser-creating-a-living-particle-system-for-the-untillabs-website/ — 60k `GL_POINTS`, positions pre-baked into 256×256 textures with 16-bit split precision; `gl_PointSize = uSize*aScale*(1.0/-viewPosition.z)`; `alpha = pow(1.0 - smoothstep(0.0,0.5,d), 1.5)`.

### 2.3 Normals from a depth map (needed if you keep Depth-Anything instead of a mesh)
- Yuwen Wu, *Accurate Normal Reconstruction from Depth Buffer* https://atyuwen.github.io/posts/normal-reconstruction/ — naive `cross(ddx,ddy)` breaks at discontinuities; 3-tap (Turánszki) "since |d−c| < |b−c|, c is more likely on segment de"; 5-tap: extrapolate ab→c₁ and ed→c₂, pick the closer. (Wicked Engine original post URL 404'd in this session.)
- For a **precomputed** portrait (offline, python) simply do: `n = normalize(vec3(-dz/dx * k, -dz/dy * k, 1))` on the blurred depth map (Sobel), then bake AO/shade with a hemisphere test, and store like Lusion (`nShade`). Because it's offline, use the 5-tap or a bilateral-blurred depth to avoid comb artefacts at the hair/glasses edges — the same edges that produce SerSan's z-combing.

### 2.4 Per-particle depth-of-field ("smoky interior") — independent confirmation
- Codrops **Simulating Depth of Field with Particles using the Blurry Library** https://tympanus.net/codrops/2019/10/01/simulating-depth-of-field-with-particles-using-the-blurry-library/ (repo https://github.com/Domenicobrz/Blurry): "particles are accumulated in a texture and randomly displaced in a circle depending on how far away they are from the focal plane"; params `cameraFocalDistance, bokehStrength, pointsPerFrame, distanceAttenuation`. Lusion does the deterministic version (grow the quad ×(1+8·b^1.5), soften edge `range=b*5`, alpha `(1-b)^3*0.8`).

### 2.5 Soft particles (fade against scene depth) — for fog inside/around the head
- NVIDIA GPU Gems 3 ch.23 https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-23-high-speed-screen-particles — `zFade = saturate(scale * (myDepth - sceneDepth)); return float4(r,g,b,a*zFade);`
- three.js demo (fetched `script.js`) https://github.com/takumifukasawa/threejsSoftParticleDemo — RT with `depthTexture = new THREE.DepthTexture(); type UnsignedShortType; format DepthFormat`; shader:
```glsl
float readDepth(sampler2D d, vec2 c){ float z=texture2D(d,c).x; float viewZ=perspectiveDepthToViewZ(z,uCameraNear,uCameraFar); return viewZToOrthographicDepth(viewZ,uCameraNear,uCameraFar); }
float sceneDepth = readDepth(uDepthTexture, gl_FragCoord.xy/uResolution);
float currentDepth = viewZToOrthographicDepth(vViewPosition.z, uCameraNear, uCameraFar);
float depthFade = clamp(abs(currentDepth - sceneDepth) / max(uDepthFade, .0001), 0., 1.);   // uDepthFade default 0.05
diffuseColor.a *= vFade * depthFade * mask;   // AdditiveBlending, depthWrite:false
```
- three.js `webgl_depth_texture` example (raw fetched) — `viewZ = (near*far)/((far-near)*fragCoordZ - far); return (viewZ+near)/(near-far);`
- In three r184 WebGPU/TSL: use `viewportDepthTexture()`/`viewportLinearDepth` nodes (see `webgpu-threejs-tsl` skill) instead of a manual DepthTexture.

### 2.6 Rim lighting on points
- Lusion: `smoothstep(0.03,0.,abs(viewNormal.z))` (silhouette where view-space normal z≈0) + `frontFaceMultiplier=linearStep(-0.2,0.0,viewNormal.z)`.
- Classic formula (Roystan toon shader, fetched) https://roystan.net/articles/toon-shader/ — `rimDot = 1 - dot(viewDir, normal); rimIntensity = rimDot * pow(NdotL, _RimThreshold); smoothstep(_RimAmount-0.01,_RimAmount+0.01,rimDot)` with `_RimAmount 0.716`, `_RimThreshold 0.1` — "constrained to illuminated surfaces by multiplying rim intensity by NdotL".

### 2.7 Point sprite rendering references (three.js / TSL)
- three.js `webgpu_tsl_compute_attractors_particles` (raw fetched): `new THREE.SpriteNodeMaterial({ blending: THREE.AdditiveBlending, depthWrite: false })`, `material.positionNode = positionBuffer.toAttribute()`, `material.scaleNode = particleMassMultiplier.mul(scale)`, colour by speed `mix(colorA,colorB, speed.div(maxSpeed).smoothstep(0,0.5))`.
- Codrops **Dreamy Particle Effect (GPGPU)** https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/ (repo https://github.com/DGFX/codrops-dreamy-particles): `gl_PointSize = uParticleSize / -mvPosition.z`, disc `if(length(gl_PointCoord-0.5)>0.5) discard`, alpha `clamp(length(velocity),0.04,0.8)`, AdditiveBlending, depthWrite/Test off, **MotionBloomPass threshold 0.2 strength 0.8**, colour `vec4(0.808,0.647,0.239,a)`.
- three.js `webgl_points_dynamic` (raw fetched): `PointsMaterial({size:30})`, `BloomPass(0.75)` + `FilmPass` + `FocusShader` + `OutputPass`.

---

## 3. LAYER 2 alternatives — glyph / matrix rain

- **Lusion's** (§1.3) is the best reference: instanced vertical strips, 42-glyph 1-bit atlas, per-column speed `[2,10]`, glyph re-roll ~2 Hz via `hash43`, 200-cell period with 150 cells off → sparse "drops", 4 blur LODs.
- Procedural per-cell rain, Shadertoy-style GLSL (fetched raw) https://github.com/septemfun1990/ghostty-matrix-theme/blob/HEAD/shaders/matrix_display.glsl:
```glsl
vec2 grid = vec2(34.0, 42.0); vec2 cell = floor(uv*grid); vec2 local = fract(uv*grid)-0.5;
float activeColumn = step(0.34, hash11(cell.x+19.0));
float speed = mix(0.25, 0.85, hash11(cell.x+83.0)); float offset = hash11(cell.x+151.0)*grid.y;
float stream = mod((grid.y-cell.y) + iTime*speed*grid.y + offset, grid.y);
float trail = smoothstep(18.0, 0.0, stream)*activeColumn;    // 18-cell tail
float head  = smoothstep(2.0, 0.0, stream)*activeColumn;     // bright head
float bit = step(0.5, hash21(vec2(cell.x, floor(cell.y + iTime*speed*4.0))));
float glyph = mix(digitZero(local), digitOne(local), bit);   // procedural glyphs (SDF rect strokes)
vec3 rain = phosphor*glyph*trail*darkness*0.07 + vec3(0.82,1.0,0.82)*glyph*head*darkness*0.05;
```
- Atlas-based ASCII post effects (swap "brightness→glyph" for "hash→glyph" to get rain): niccolofanton **morphing-ascii-shader** https://github.com/niccolofanton/morphing-ascii-shader (three.js + pmndrs/postprocessing; runtime glyph atlas, `cellSize`, `glyphBlend`, Sobel edge glyphs `- | / \`, demo https://m-ascii.niccolofanton.dev). Codrops **Efecto** https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/ — glyphs drawn procedurally on a 5×7 grid, `brightness = dot(rgb, vec3(0.299,0.587,0.114))`, 8 styles incl. "matrix" (demo https://efecto.app). three.js `AsciiEffect` https://github.com/mrdoob/three.js/blob/dev/examples/jsm/effects/AsciiEffect.js is DOM-table based (ramp `' .:-=+*#%@'`) — not usable here.
- Other GitHub matrix-rain shaders found via API (not fetched): `Ehomey/matrix-terminal-shader` (HLSL, `glyphs.hlsl`), `Mortimyrrh/MatrixShader`, `dagl1/matrix_rain_shader`, `Blsotok/Retro-Shader-for-your-linux`.

Recommended for SerSan: Lusion's exact recipe, but with the glyph atlas rendered at build-time from **JetBrains Mono** (brand mono) into a 1-channel atlas (e.g. 64 glyphs × 8×12 px), rendered as a handful of instanced strips behind the head in the same additive HDR pass.

---

## 4. LAYER 3 alternatives — luminous contour lines

- **Lusion** (§1.4): baked contour polylines (41 lines, 19 integer height levels, every 4th thick) → 3-sided tubes → travelling periodic-Perlin pulse along arc length, `MaxEquation` blending, draw-on by `hudRatio`.
- **Fully procedural iso-lines** (fetched raw, MIT-style, React/WebGL) https://github.com/idleCyrex/topolines `src/shader.ts` — the canonical `fract + fwidth` recipe:
```glsl
float fbm(vec3 p){ return (snoise(p) + 0.5*snoise(p*2.0)) / 1.5; }   // "Two octaves. One is too glassy, three gets fussy"
vec2 st = stBase + uSeed + uDrift*uTime + uScrollOff;
if (uWarp > 0.0) { vec2 q = vec2(fbm(vec3(st, uTime*0.6)), fbm(vec3(st+5.2, uTime*0.6))); st += q*uWarp; }   // domain warp
float v = fbm(vec3(st, uTime));                                 // 3rd axis = time → loops grow/merge/split
v += uMouseBump * exp(-dot(d,d)/(uMouseRadius*uMouseRadius));  // mouse bump
float c = v * uLevels;
float w = fwidth(c);
float dist = 0.5 - abs(fract(c) - 0.5);                         // distance to nearest iso-level
float dd = dist / max(w, 1e-5);                                 // in pixels
float line = 1.0 - smoothstep(uLineWidth*0.5-0.5, uLineWidth*0.5+0.5, dd);
line *= 1.0 - smoothstep(0.6, 1.4, w);                          // fade where bands < 1px (anti-moiré)
gl_FragColor = vec4(uColor*line*uOpacity, line*uOpacity);       // premultiplied
```
  Apply this on a floor plane (perspective, `fwidth` keeps width constant in screen space), write to the bloom buffer, and you get glowing marching contours with zero CPU work.
- Anti-aliasing theory for such patterns: Inigo Quilez, *Filterable procedurals* https://iquilezles.org/articles/filterableprocedurals/ — `w = max(abs(dpdx), abs(dpdy))`, integrate pattern over `p ± 0.5*w`.
- Codrops San Rita topographic site https://tympanus.net/codrops/2026/03/24/digital-craft-wild-soul-building-san-ritas-topographic-web-experience/ — explicitly **rejected** procedural contours ("needed more visual control"), baked them from a height map (https://manticorp.github.io/unrealheightmap) via Blender + Substance. Same conclusion as Lusion: bake for art-direction, procedural for cheapness.
- Glowing polylines in three.js (if you take the baked route): build tubes exactly like Lusion (parallel transport, 3 sides), or use `Line2/LineMaterial` with `worldUnits` and drive alpha along `t` with a periodic noise; additive or Max blending so crossings don't hot-spot.

---

## 5. LAYER 4 — HUD accents
- Lusion: DOM (`[[ 001 ]]`, compass ticks, 11×3 dot grid, matrix-decode text with `lettersPerSecond=1, maxRandLetters=3, refresh 1/30`), plus one WebGL "big glyph" with a 5 % dot-grid (`step(max(dd.x,dd.y),.05)`, 0.3 alpha) — see §1.7. SerSan already has `textAnimationHelper`-like scramble in `command-palette`/preloader; reuse.

---

## 6. Black-void finish: bloom + grain
- Lusion: greyscale HDR → colour burn/dodge grade (#00f0ff/#005aff scene; #79a8ff/#a5ff44 HUD) → Gaussian-pyramid bloom (`amount 4, radius .25, threshold .8, smoothWidth .3`) → **±0.25/255 RGB dither** (`dithering()` in the bloom composite) — no film pass; the "grain" is dither + blue-noise (`getBlueNoise`) used in fog/halo.
- three.js selective bloom (raw fetched) https://github.com/mrdoob/three.js/blob/dev/examples/webgl_postprocessing_unreal_bloom_selective.html — `UnrealBloomPass(res, strength 1.5, radius 0.4, threshold 0.85)` then `threshold=0, strength=1, radius=0.5`; darken-non-bloomed material swap; mix `base + bloom*bloomStrength`.
- Film grain GLSL: three.js `FilmShader.js` (raw fetched) — `float noise = rand(fract(vUv + time)); vec3 color = base.rgb + base.rgb*clamp(0.1+noise,0.,1.);` mixed by `intensity`. pmndrs/postprocessing `noise.frag` (raw fetched): `vec3 noise = vec3(rand(uv*(1.0+time))); outputColor = vec4(min(inputColor.rgb*noise, vec3(1.0)), inputColor.a);` (PREMULTIPLY branch).
- For SerSan (WebGPU/TSL r184): the `webgpu-threejs-tsl` skill's `bloom()` node + a `hash(uv*time)`-based grain node in `outputNode`; keep bloom threshold ≈0.8 so only rim/scanline/specular points bloom and the shadow side stays as dim dots (that contrast *is* the volumetric read).

---

## 7. Synthesis: what to change in SerSan to hit the Lusion look

1. **Data, not shader, is the root cause of the empty patches.** Lusion never samples a photo; every point is a surface sample of a scan with a normal + baked AO. SerSan's grid-per-cell luminance sampler (`FounderPortraitMorph.tsx`, contracts 1–2 in `HANDOFF_FOUNDER_MORPH.md`) is fundamentally 2.5-D; the "depth matte" already added on 2026-08-27 (Depth Anything V2, `depthCut 0.3`) fixes the mask but not the shading. Next step: derive **per-point normals from the depth map** (§2.3, offline, bilateral-blurred), bake a **shade/AO scalar**, and make brightness = `shade × N·L(mouse light) × frontFace` exactly like §1.2.1 — then bright skin against a white wall is irrelevant, because colour never enters the pipeline.
2. Adopt Lusion's packed asset: 8,192–16,384 points × (uint16 xyz + uint8 nx ny nz shade). Store in a DataTexture; SerSan's GPGPU morph can keep lerping positions **and normals** between A/B/C/D (Lusion cross-fades two meshes instead — simpler and also acceptable).
3. Point rendering: quads in model space, `pointSize 0.009×(1+8·b^1.5)`, `subpixelMultiplier = (base/clamped)^1.5`, disc edge `linearStep(1, 1-range-fwidth(d), d)`, alpha `(1-b)^3·0.8`, additive One/One, `depthTest/Write off`; DoF `b = min(1, |depth − focal|·2.5)`.
4. Add: mouse-following light (ray→plane at fixed distance→world), scanline `fract(-0.3t − 0.5y)` with rim `smoothstep(.03,0,|viewN.z|)`, band glitch on transition, bottom-up reveal via `smoothstep(rand·0.2+y·0.4, 0.4+rand·0.2+y·0.4, showRatio)`.
5. Background layers: glyph strips (§1.3/§3) + procedural iso-lines on the floor (§4 topolines snippet) or baked contour tubes (§1.4), both additive into the same bloom buffer; fog quads as soft particles (§2.5).
6. Post: grade greyscale with colour-burn/dodge (map to SerSan signal palette `#3BE1FF→#7C5CFF` instead of Lusion's cyan/acid), bloom threshold .8 amount ~2–4, 1-LSB dither.

## 8. All URLs cited (fetched in this session unless noted)
- https://lusion.co/about/ ; https://lusion.co/_astro/hoisted.CUO_IjfL.js ; https://lusion.co/assets/team/team.json ; https://lusion.co/assets/team/edan.buf ; https://lusion.co/assets/textures/font.png ; https://lusion.co/assets/models/about/letter_placements.buf ; https://lusion.co/assets/models/about/terrain_lines.buf
- https://tympanus.net/codrops/2026/04/13/lusion-where-digital-craft-meets-ambitious-experimentation/ (studio profile, no tech detail)
- https://github.com/Tcode-Motion/lusion-clone (HTML clone, static team photos)
- https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/ ; https://github.com/brunoimbrizi/interactive-particles
- https://github.com/ofir1233/Project-51 (p51/lab/pointcloud-embed.mjs)
- https://tympanus.net/codrops/2025/12/10/simulating-life-in-the-browser-creating-a-living-particle-system-for-the-untillabs-website/
- https://github.com/DepthAnything/Depth-Anything-V2 ; https://github.com/yfeng95/DECA ; https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker ; https://github.com/mkkellogg/GaussianSplats3D ; https://tympanus.net/codrops/2026/07/01/sculpting-a-digital-athlete-capturing-stefanos-tsitsipas-beyond-the-court/
- https://atyuwen.github.io/posts/normal-reconstruction/
- https://tympanus.net/codrops/2019/10/01/simulating-depth-of-field-with-particles-using-the-blurry-library/ ; https://github.com/Domenicobrz/Blurry
- https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-23-high-speed-screen-particles ; https://github.com/takumifukasawa/threejsSoftParticleDemo ; https://github.com/DolphinIQ/Three.js-soft-particles ; https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_depth_texture.html
- https://roystan.net/articles/toon-shader/
- https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgpu_tsl_compute_attractors_particles.html ; https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/ ; https://github.com/DGFX/codrops-dreamy-particles ; https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_points_dynamic.html
- https://github.com/septemfun1990/ghostty-matrix-theme (shaders/matrix_display.glsl) ; https://github.com/niccolofanton/morphing-ascii-shader ; https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/ ; https://github.com/mrdoob/three.js/blob/dev/examples/jsm/effects/AsciiEffect.js ; (not fetched) https://github.com/Ehomey/matrix-terminal-shader , https://github.com/Mortimyrrh/MatrixShader , https://github.com/dagl1/matrix_rain_shader
- https://github.com/idleCyrex/topolines (src/shader.ts) ; https://iquilezles.org/articles/filterableprocedurals/ ; https://tympanus.net/codrops/2026/03/24/digital-craft-wild-soul-building-san-ritas-topographic-web-experience/ ; https://thebookofshaders.com/09/
- https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_postprocessing_unreal_bloom_selective.html ; https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/jsm/shaders/FilmShader.js ; https://raw.githubusercontent.com/pmndrs/postprocessing/main/src/effects/glsl/noise.frag
- https://tympanus.net/codrops/2025/05/05/matrix-sentinels-building-dynamic-particle-trails-with-tsl/ (TSL trails, tangential)
- Not reachable this session: Shadertoy (403), YouTube breakdowns, Maxime Heckel ASCII section (page truncated) — none of the claims above depend on them.
