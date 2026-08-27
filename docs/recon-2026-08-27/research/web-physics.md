# web-physics — Physics & logic deep dive for particle portraits / point-cloud heads

Compiled 2026-08-27. All numbers below are quoted from the cited source (or from code fetched from it); anything marked *[derived]* is my own arithmetic on top of a cited formula. Scratch copies of fetched code live in `C:/Users/alber/AppData/Local/Temp/claude/C--Users-alber-sersan/1c69a823-396b-49b0-8d9a-70aaa24ca458/scratchpad/dossiers/` (`lusion_hoisted.js`, `lusion_faces_chunk.js`, `lusion_team.json`, `lusion_edan.buf`).

---

## 0. HEADLINE: what lusion.co/about "Team" actually does (reverse-engineered from the live bundle)

Source: `https://lusion.co/_astro/hoisted.CUO_IjfL.js` (1.25 MB, fetched 2026-08-27), classes `AboutHeroFaces`, `AboutHeroLetters`, `AboutHeroLines`, `AboutHeroParticlesSimulation`. Data: `https://lusion.co/assets/team/team.json` (7 people: edan, ffi, pierre, yannic, paul, andrii, sunny) and per-person `https://lusion.co/assets/team/<id>.buf` (edan.buf = 82,280 bytes; CDN mirror `https://lusion.dev/assets/team/<id>.buf`).

**It is NOT a GPGPU simulation and NOT a photo-to-particle conversion. It is a pre-baked 3D point cloud (8,192 points per head) with baked normals + baked shading, rendered as instanced quads with additive blending, cross-dissolved between people with a defocus ("blurriness") + glitch, and lit in real time by a point light attached to the mouse.** This is exactly the "3D scan point cloud, rim glow, slowly moving" look the owner wants.

### 0.1 Asset format (`<id>.buf`)
Header (JSON, prefixed by a 4-byte little-endian length `0x164 = 356`):
```json
{"vertexCount":8192,"indexCount":0,
 "attributes":[
  {"id":"position","needsPack":true,"componentSize":3,"storageType":"Uint16Array",
   "packedComponents":[{"from":-0.999023438,"delta":1.998535157},
                       {"from":-0.999511719,"delta":1.998535157},
                       {"from":0,"delta":1}]},
  {"id":"nShade","needsPack":false,"componentSize":4,"storageType":"Uint8Array"}],
 "meshType":"Points"}
```
- `position`: 8192 x 3 x uint16, dequantised as `from + u16/65535*delta` -> x,y in [-1,1], z in [0,1] (head depth normalised, z=0 back, 1 front).
- `nShade`: 8192 x 4 x uint8 = **baked normal (xyz, decoded `n*2-1`) + baked ambient/AO shade (w)**. Lighting quality comes from an offline bake of a real scanned/modelled head, not from depth-map tricks.
- Size per head: 8192 x (6+4) = 81,920 B + header = 82,280 B (matches the download).
- Uploaded as two DataTextures 128x64 (`SIM_TEXTURE_WIDTH=128, SIM_TEXTURE_HEIGHT=64`): `teamPosDataTextures[id]` (float RGBA, a = 1/PARTICLE_COUNT) and `teamNShadeDataTextures[id]` (uint8 RGBA).

### 0.2 Geometry & material
- `InstancedBufferGeometry` from `PlaneGeometry(1,1)`; per-instance attributes `a_simUv` (texel centre of the point in the 128x64 texture), `a_rands1`, `a_rands2` (vec4 random each).
- `MAX_FACE_NUM = 2` meshes share one geometry (current + next person).
- Material: `depthTest:false, depthWrite:false, transparent:true, blending:CustomBlending, blendEquation:AddEquation, blendSrc:OneFactor, blendDst:OneFactor` (pure additive; alpha also One/One), `extensions.derivatives=true` (for `fwidth`).
- Container: `scale.set(27.5, 27.5, 16)` (head squashed in z: 16/27.5 = 0.58), `rotation.y = PI+0.2, rotation.x = 0.1, position (0, 34, 25)`.

### 0.3 Vertex shader (verbatim logic, de-minified)
```glsl
vec3 basePos = texture2D(u_positionTexture, a_simUv).xyz;
vec3 pos = basePos;
float yRatio = basePos.y*0.5+0.5;                                   // 0 bottom ... 1 top
// REVEAL: per-particle window, staggered bottom->top and by random
float showRatio = smoothstep(a_rands1.x*0.2 + yRatio*0.4,
                             0.4 + a_rands1.y*0.2 + yRatio*0.4, u_showRatio);
pos *= 1.3;
// while not shown: displaced by 4D simplex-noise gradient (scale 8, amp 0.2) + drift (+yRatio in x, -1 in z)
pos += (simplexNoiseDerivatives(vec4(basePos*8., u_time)).yzw*0.2 + vec3(1.*yRatio, 0.0, -1.)) * (1.-showRatio);
v_showRatio = showRatio;

vec4 norShade = texture2D(u_norShadeTexture, a_simUv);
float depth = clamp(1.-pos.z, 0.0, 1.0);
vec3 nor = norShade.xyz*2.-1.;
vec3 worldPosition = (modelMatrix*vec4(pos,1.0)).xyz;
vec3 viewNormal  = normalMatrix*normalize(nor);
vec3 worldNormal = inverseTransformDirection(viewNormal, viewMatrix);

// LIGHTING: mouse is a point light
vec3 lightDir = normalize(u_mouse - worldPosition);
float distToLight = distance(u_mouse, worldPosition);
float light = norShade.w*1.25;                                        // baked shade
float diff = linearStep(0.35, 1.0, dot(worldNormal, lightDir)) / sqrt(distToLight*0.1);
light *= diff + 0.6;
light += (0.05 + diff*0.15) * smoothstep(0.0, 0.005, norShade.w);
float frontFaceMultiplier = linearStep(-0.2, 0.0, viewNormal.z);      // back-facing points vanish
light *= frontFaceMultiplier;

// DEFOCUS: distance from a focal plane that slides with activeRatio
v_blurriness = min(1.0, abs(depth - (1.-u_activeRatio*showRatio)*0.5) * 2.5) * (2.-showRatio);
float basePointSize = 0.009 * (1. + pow(v_blurriness,1.5)*8.) * frontFaceMultiplier;  // local units (x27.5 world)
float pointSize = max(basePointSize, 12./u_resolution.y);              // never below ~12 px
float subpixelMultiplier = pow(basePointSize/pointSize, 1.5);           // energy conservation when clamped up
pos.xy += position.xy * pointSize * step(0.003, light) * linearStep(0.0, 0.75, u_activeRatio);   // billboard quad

// GLITCH: horizontal row bands
vec4 verticalRands = hash42(vec2(floor(basePos.y*3. + cos(basePos.y*3.+u_glitchOffset)*2. + u_glitchOffset), 0.)) * u_glitchStrength;
float glitchWeight = verticalRands.x * step(u_glitchThreshold, verticalRands.y);
pos.x += (verticalRands.z*verticalRands.z) * glitchWeight * 0.35 * cos(basePos.y + u_glitchOffset);
gl_Position = projectionMatrix*modelViewMatrix*vec4(pos,1.0);
v_color = mix(vec3(1.0), (viewNormal.xzy*0.5+0.5)*vec3(1.0,0.5,2.0), glitchWeight);
light *= (1. + glitchWeight*1.5);  light += 0.1*glitchWeight;

// SCANLINE sweeping down at 0.3 Hz
float scanline = smoothstep(0.04, 0., abs(fract(u_time*-0.3 - basePos.y*.5 + .5)));
light += scanline * (0.25*norShade.w*(1.0-light) + smoothstep(0.03, 0., abs(viewNormal.z)));  // rim on silhouette
v_shade = min(1.0, light*(1.-v_blurriness*0.5)) * subpixelMultiplier * showRatio;
v_toCenter = (uv-.5)*2.;
```
Fragment shader:
```glsl
float shade = v_shade;
float d = length(v_toCenter);
float range = v_blurriness*5.;
float brightness = linearStep(1., 1.-range-fwidth(d), d);           // soft disc, softer when blurry
shade *= brightness*(1.25 - v_blurriness*v_shade);
gl_FragColor = vec4(shade) * v_showRatio*v_showRatio;
gl_FragColor.a *= pow(1.-v_blurriness,3.)*0.8*linearStep(0.8,1.0,v_showRatio*v_showRatio);
```
Output is monochrome (`vec4(shade)`); colour grading is done later by `AboutPageHeroEfx` (colorBurn `#00f0ff` alpha .15 / colorDodge `#005aff` alpha .12 for the scene; HUD `#79a8ff` / `#a5ff44`).

### 0.4 Per-frame update (JS)
- Mouse -> 3D light: unproject NDC at depth .5, extend along the ray to z=75, transform into face space; used both as `u_mouse` and to tilt the head: `rotation.x += clamp(mouse.y*0.03,-.05,.05)`, `rotation.y += clamp(mouse.x*0.03,-.05,.05)`.
- Transition `t = transitionRatio in [0,1]` between `currId` and `nextId` (two meshes):
  - current: `u_activeRatio = 1-t`, `position.x = -1.5t`, `position.z = -2t`, `rotation.y = -0.3t`, `rotation.x = 0.4t`
  - next:    `u_activeRatio = t`, `position.x = -1.5(t-1)`, `position.z = 2(t-1)`, `rotation.y = -0.3(t-1)`, `rotation.x = -0.4(t-1)`
  - `u_glitchThreshold = fit(activeRatio, 0.4, 1, 0, 0.9)` -> glitch only while fading; `u_glitchOffset = random()*1000`, `u_glitchStrength = random()` every frame.
  - Tween duration `1.25 + |dIndex|*0.25` s, `ease.cubicInOut`; auto-advance timer `faceIndexTimer` when idle; swipe on mobile.
- **So the A->B "morph" is a cross-dissolve of two independent clouds: the outgoing one blurs/darkens (blurriness grows as activeRatio->0), slides back and rotates away, while the incoming one sharpens in. No point-correspondence problem at all.**

### 0.5 Matrix glyph rain (`AboutHeroLetters`)
- Placement from `assets/models/about/letter_placements.buf` (position + density per column), split into 4 layers.
- Each column = one instanced quad, `charCount = mix(50,100, rand)`, quad stretched `pos.xy *= vec2(1, 6/5*charCount)`, `v_charUv.y -= u_time*mix(2,10,rand)` (scroll 2-10 chars/s), `pos = pos*0.75 + instancePos`, `v_opacity = mix(.5,1,density)*u_showRatio`.
- Fragment: atlas of `MAX_CHAR = 42` glyphs (`font.png`), glyph index re-randomised with `hash43(charIdx, rand, floor(charTime*-2))` (~2 flips/s), brightness x `charRands.w*charRands.y`, strip-end fade `smoothstep(0.5,0.35,abs(v_uv.y-.5))`, bursts `smoothstep(100,150, mod(v_charUv.y-200*rand,200))`, depth fade `1-linearStep(15,66,worldZ)`, `gl_FragColor.a *= 3`.
- Layers rendered into an RT and blurred between layers: **blur 16 px, then 8, then 4, then sharp** (`blur.blur(16,.5,...)`, `(8,...)`, `(4,...)`) -> fake depth of field. Additive One/One, `depthTest:false`.

### 0.6 Luminous contour lines at the bottom (`AboutHeroLines`)
- `assets/models/about/terrain_lines.buf`: 41 polylines (index thresholds list), each extruded into a 3-segment tube (`SEGMENT_COUNT=3`), radius `mix(0.04, 0.1, thicknessRatio)`; every 4th ring thicker (`step(mod(yIndex,4),0.5)`).
- Attributes `t` (arc length), `totalLength`, `lineId`.
- Fragment: `t = mod(v_t - u_time*2., v_totalLength)` (flow 2 units/s), periodic Perlin `pnoise(vec2(t*0.25,0), vec2(totalLength*0.25,100))` -> dash pattern via `smoothstep(0,-fwidth(n),n)`; `shade = mix(0.3 + dash*0.6, 1, thick)`, depth fade `linearStep(50,-20, worldZ)`, draw-in reveal `step(totalLength - t, totalLength*u_hudRatio)`, `gl_FragColor.r *= .85`, blending `MaxEquation` (no overbright at crossings), `gl_Position.z -= 0.1/w` (depth bias).

### 0.7 Background particles (`AboutHeroParticlesSimulation`) — the GPGPU part of the page
- Ping-pong FBO 128x192 (128x128 on mobile) = 24,576 (16,384) particles, RGBA float = pos + life.
- Spawn: spherical shell `r = 0.25 + cbrt(rand)*0.5` around the light (uniform volume via cbrt); life decrement `(0.5+stableFactor)*dt`; respawn `defPos*(1.25+0.25 sin(noiseTime*2.5+uv.x*21)) + light`.
- Motion = spin around a time-varying axis (`cross(axis, toLight)`, strength `dt*(0.1+smoothstep(0.5,2,dist-uv.x*0.5)*(+/-)mix(2,4,uv.x))*mix(0.75,1.5,stable)`) **+ curl noise** (4D simplex-derivative implementation, 2 octaves, persistence 0.2): `pos += (1.25+0.5*noiseScale) * curl((pos-light)*(0.4+0.3*stable), noiseTime, 0.2) * dt * mix(0.4,1.5,life*life) * mix(0.75,1.25,uv.x)`; `noiseTime += dt*0.4`; `noiseScale = 10*|fbm1D(t)|`.
- Rendered with a motion-blur pass (`u_simPrevPosLifeTexture` -> screen-space delta-stretched sprites, `particleSize = 0.06..0.175`, a few "hero" particles at `simUv.x<0.005` get 0.175).

### 0.8 Take-aways for SerSan
1. The "empty patches" problem is intrinsic to sampling a *photo* by luminance: skin ~ wall. Lusion avoids it by sampling a **3D surface** (uniform surface sampling of a head mesh/scan) and baking normals + AO. Fix path: get a head mesh per founder (photogrammetry, Hyper3D/Rodin image-to-3D via the Blender MCP already in AGENTS.md, or a face-segmentation + depth-estimation fallback), sample 8k-32k points uniformly by triangle area, bake `normal` + `ao/shade`, quantise to uint16/uint8 exactly like the `.buf` above.
2. Rendering recipe that gives the "glowing scan" look: additive One/One, depthTest off, soft disc with `fwidth`, size proportional to defocus, min-pixel clamp with energy compensation (`pow(base/clamped,1.5)`), lighting = baked shade x (mouse point-light Lambert / sqrt(dist) + 0.6), silhouette rim from `smoothstep(0.03,0,|viewNormal.z|)`, `frontFaceMultiplier` kills back-facing points (this is what makes a *cloud* read as a *solid head*).
3. Person switch = cross-dissolve + defocus + glitch + slide/rotate, not a morph. If a true morph is still wanted see section 5.

---

## 1. Spring-damper return-to-home (critically damped, dt-independent)

### 1.1 Physics
Force: `F = -k*x - c*v`, `a = F/m` (Maxime Heckel, "The physics behind spring animations", https://blog.maximeheckel.com/posts/the-physics-behind-spring-animations/ ; mdx at https://raw.githubusercontent.com/MaximeHeckel/blog.maximeheckel.com/main/content/the-physics-behind-spring-animations.mdx ; Gaffer On Games "Integration Basics" https://gafferongames.com/post/integration_basics/ : `a = -k*x - b*v`).
Damping ratio `zeta = c / (2*sqrt(k*m))`; zeta = 1 is critically damped ("reach equilibrium as fast as possible without oscillating" — Ryan Juckett, https://www.ryanjuckett.com/damped-springs/).

### 1.2 Naive per-frame integration (what most tutorials do; NOT dt-independent)
Codrops "Crafting a Dreamy Particle Effect with Three.js and GPGPU" (https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/):
```glsl
velocity *= 0.7;                                   // damping per frame
vec3 direction = normalize(original - position);
float dist = length(original - position);
if (dist > 0.001) velocity += direction * 0.0003;   // constant-magnitude pull (not Hooke)
// + mouse repulsion (section 3)
position += velocity;                              // dt = 1 frame
```
Parameters: damping 0.7, spring 0.0003, mouse radius 0.1, mouse strength 0.0023, point size 2, 1500 particles (39x39), material `AdditiveBlending, depthWrite:false, depthTest:false`, alpha `clamp(length(velocity), 0.04, 0.8)`, bloom threshold 0.2 strength 0.8.
three.js `webgpu_compute_particles` (https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgpu_compute_particles.html): `velocity += gravity; position += velocity; velocity *= friction;` (200,000 particles).
Semi-implicit Euler (Gaffer): `v += a*dt; x += v*dt;` — stable for springs; dt = 1/100 "good enough for a game".

### 1.3 Exact critically-damped closed form (dt-independent) — recommended for the GPU
Ryan Juckett (https://www.ryanjuckett.com/damped-springs/), zeta = 1, omega = angular frequency:
```
x(t) = ((v0 + x0*w)*t + x0) * e^(-w t)
v(t) = (v0 - (v0 + x0*w)*w*t) * e^(-w t)
```
Per-frame coefficients (precompute once per frame from w, dt):
```c
expTerm = exp(-w*dt); timeExp = dt*expTerm; timeExpFreq = timeExp*w;
posPosCoef = timeExpFreq + expTerm;   posVelCoef = timeExp;
velPosCoef = -w*timeExpFreq;          velVelCoef = -timeExpFreq + expTerm;
newPos = (oldPos-eq)*posPosCoef + oldVel*posVelCoef + eq;
newVel = (oldPos-eq)*velPosCoef + oldVel*velVelCoef;
```
Daniel Holden, "Spring-It-On" (https://theorangeduck.com/page/spring-roll-call), parameterised by **halflife** (time for the distance to the goal to halve):
```c
float halflife_to_damping(float halflife){ return (4.0f*0.69314718056f)/(halflife+1e-5f); }
float frequency_to_stiffness(float f){ return squaref(2*PI*f); }
void simple_spring_damper_exact(float& x, float& v, float x_goal, float halflife, float dt){
    float y = halflife_to_damping(halflife)/2.0f;
    float j0 = x - x_goal;  float j1 = v + j0*y;
    float eydt = fast_negexp(y*dt);       // 1/(1+x+0.48x^2+0.235x^3)
    x = eydt*(j0 + j1*dt) + x_goal;
    v = eydt*(v - j1*y*dt);
}
```
Halflife guidance (same page): responsive 0.1-0.2 s (cursor follow / UI), natural 0.3-0.5 s, heavy 1-2 s.
Velocity-less variant (exponential smoothing, Rory Driscoll https://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/): `x = lerp(x, goal, 1 - exp(-lambda*dt))`, `lambda = -ln(r)` for a per-frame factor `r`. *[derived]* Codrops' `velocity *= 0.7` per frame @60 fps = lambda = -ln(0.7)*60 = 21.4 s^-1 -> `exp(-21.4*dt)`.

### 1.4 GLSL/TSL pseudocode "return to home + noise + pointer"
```glsl
// per particle: pos, vel, home (baked), dt (clamp <= 1/30)
vec3 toHome = home - pos;
float y = (4.0*0.6931)/halflife*0.5;             // halflife 0.25..0.6 s for a "breathing" head
float e = exp(-y*dt);
vec3 j1 = vel - toHome*y;                        // (j0 = -toHome)
pos = e*(-toHome + j1*dt) + home;
vel = e*(vel - j1*y*dt);
vel += curl(pos*freq + time*0.1) * curlAmp;       // section 2
vel += pointerForce(pos);                        // section 3
```

---

## 2. Curl-noise / divergence-free flow fields

### 2.1 Theory
Bridson, Hourihan, Nordenstam, "Curl-Noise for Procedural Fluid Flow", SIGGRAPH 2007 (https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph2007-curlnoise.pdf). Velocity `v = curl(Psi)`, Psi a vector potential built from 3 independent noise fields; identity `div(curl(Psi)) = 0` => incompressible, no sinks/sources (restated with the same formulas at https://www.mysimulator.uk/articles/curl-noise-flow-field/):
```
v = ( dPsiz/dy - dPsiy/dz ,  dPsix/dz - dPsiz/dx ,  dPsiy/dx - dPsix/dy )
dPsiz/dy ~ (Psiz(x,y+e,z) - Psiz(x,y-e,z)) / (2e)
```
2-D form: `v = (dpsi/dy, -dpsi/dx)` from a scalar psi.

### 2.2 Finite-difference implementation (cabbibo, https://github.com/cabbibo/glsl-curl-noise/blob/master/curl.glsl)
```glsl
vec3 snoiseVec3(vec3 x){ return vec3(snoise(x), snoise(vec3(x.y-19.1,x.z+33.4,x.x+47.2)), snoise(vec3(x.z+74.2,x.x-124.5,x.y+99.4))); }
vec3 curlNoise(vec3 p){
  const float e = .1;                        // epsilon
  vec3 dx=vec3(e,0,0), dy=vec3(0,e,0), dz=vec3(0,0,e);
  vec3 p_x0=snoiseVec3(p-dx), p_x1=snoiseVec3(p+dx), p_y0=snoiseVec3(p-dy), p_y1=snoiseVec3(p+dy), p_z0=snoiseVec3(p-dz), p_z1=snoiseVec3(p+dz);
  float x = p_y1.z-p_y0.z - p_z1.y+p_z0.y;
  float y = p_z1.x-p_z0.x - p_x1.z+p_x0.z;
  float z = p_x1.y-p_x0.y - p_y1.x+p_y0.x;
  return normalize(vec3(x,y,z) / (2.0*e));
}
```
Cost: 6x3 = 18 simplex evaluations. Epsilon: 0.1 (cabbibo; al-ro https://al-ro.github.io/projects/particles/ uses `eps = 1e-1` and a second decorrelated field at `p += 1008.5`, cross product of the two gradients, normalised); 0.01 (Codrops UntilLabs, https://tympanus.net/codrops/2025/12/10/simulating-life-in-the-browser-creating-a-living-particle-system-for-the-untillabs-website/ : "finite differences (epsilon = 0.01)"); mysimulator: "typically 0.01-0.1 x spatial scale".

### 2.3 Analytic-derivative implementation (cheaper; used by Lusion / The-Spirit)
Edan Kwan (Lusion co-founder), The-Spirit `src/glsl/helpers/curl4.glsl` (https://github.com/edankwan/The-Spirit/blob/master/src/glsl/helpers/curl4.glsl): uses `simplexNoiseDerivatives4` (returns dx,dy,dz,dw), 3 octaves, persistence:
```glsl
vec3 curl(vec3 p, float noiseTime, float persistence){
  vec4 xN=vec4(0), yN=vec4(0), zN=vec4(0);
  for(int i=0;i<3;++i){ float twoPowI=pow(2.,float(i)); float scale=0.5*twoPowI*pow(persistence,float(i));
    xN += snoise4(vec4(p*twoPowI, noiseTime))*scale;
    yN += snoise4(vec4((p+vec3(123.4,129845.6,-1239.1))*twoPowI, noiseTime))*scale;
    zN += snoise4(vec4((p+vec3(-9519.0,9051.0,-123.0))*twoPowI, noiseTime))*scale; }
  return vec3(zN[1]-yN[2], xN[2]-zN[0], yN[0]-xN[1]);
}
```
Usage in `position.frag` (https://github.com/edankwan/The-Spirit/blob/master/src/glsl/position.frag): `position += curl(position*curlSize, time, 0.1 + (1.0-life)*0.1) * speed;` with settings `curlSize = 0.02` (world ~ +/-50 units, i.e. noise wavelength ~50 units), `speed = 1`, `dieSpeed = 0.015`, `attraction = 1`, attraction toward mouse `delta*(0.005+life*0.01)*attraction*(1-smoothstep(50,350,|delta|))`, `time += dt_ms*0.001`. Lusion's live 2024 site uses the same function with 2 octaves, persistence 0.2, position scale 0.4-0.7, amplitude ~1.25-6.25 units/s x dt (section 0.7).
Alternative "bitangent noise" (atyuwen, https://atyuwen.github.io/posts/bitangent-noise/): `v = grad(phi) x grad(psi)` — 2 gradient evaluations instead of 3; measured ~30 % more expensive than one simplex call (GTX1060, 1280x720x10: SimplexNoise3D 1153 us vs BitangentNoise3D 1534 us; 4D: 1798 vs 2413 us). Generalised to nD in "Improving Curl Noise", SIGGRAPH Asia 2025 (https://dl.acm.org/doi/10.1145/3757377.3763980).

### 2.4 Parameter ranges seen in the sources
| source | spatial freq | time speed | amplitude |
|---|---|---|---|
| The-Spirit | `curlSize 0.02` on +/-50 u | 1 u/s | `speed 1` per frame |
| Lusion about 2024 bg | 0.4-0.7 | 0.4 | 1.25-6.25 x dt |
| Codrops UntilLabs | fBM up to 6 octaves, amp x0.5/octave, rotation matrix per octave | — | per-particle sine amplitude 0.2-0.3 |
| Maxime Heckel FBO demo | 128x128 particles, curl in sim pass (https://blog.maximeheckel.com/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/) | `uTime` | — |
| Three.js Journey GPGPU flow field | uniforms `uFlowFieldFrequency`, `uFlowFieldStrength`, `uFlowFieldInfluence`; 4D simplex; life in alpha (https://threejs-journey.com/lessons/gpgpu-flow-field-particles-shaders) | — | — |
Rule of thumb for a head that must stay legible *[derived]*: apply curl as a **velocity perturbation that the spring cancels** (curl amp ~0.02-0.05 x head radius per second, noise wavelength ~0.5-1 x head radius, time speed 0.1-0.4). Lusion's face itself uses only a 0.2-amplitude simplex gradient *while hidden* and zero flow once shown; the perceived "slow motion" is head tilt + scanline + defocus.

---

## 3. Pointer repulsion / attraction

Kernels found in the wild:
1. **Linear falloff, velocity impulse** (Codrops 2024 GPGPU): `if(d<R){ vel += normalize(p-mouse) * (1-d/R) * 0.0023 * uMouseSpeed; }`, R = 0.1 (scene ~2 units -> R = 5 % of scene), scaled by mouse speed so a still cursor does nothing.
2. **Clamped linear radius, TSL** (three.js `webgpu_compute_particles`): `distArea = max(3 - dist, 0); power = distArea*0.01; vel += dir*power*rand` (radius 3 u).
3. **Off-screen touch texture** (Codrops "Interactive Particles with Three.js", https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/): cursor trail drawn to a canvas, radius fades each frame (smoothstep), then in the vertex shader `t = texture2D(uTouch, puv).r; displaced.z += t*20*rndz; displaced.x += cos(angle)*t*20*rndz; displaced.y += sin(angle)*t*20*rndz;`. Three.js Journey "Particles Cursor Animation" (https://threejs-journey.com/lessons/particles-cursor-animation-shader, paywalled) uses the same canvas-glow displacement idea.
4. **Smooth attraction with wide dead-zone** (The-Spirit): `pos += delta*(0.005+life*0.01)*attraction*(1-smoothstep(50,350,|delta|))*speed`.
5. **Mouse as point light, not force** (Lusion team faces, section 0.3): `diff = linearStep(0.35,1,dot(N,L))/sqrt(0.1*dist)`; head tilt `clamp(mouse*0.03, +/-0.05)` rad. For a portrait this is the tasteful choice: geometry stays intact, light moves.
Recommended kernel *[derived, standard]*: `f = strength * (1 - smoothstep(0, R, d)) * normalize(p - m)`; strength such that max displacement ~5-10 % of head radius; combine with the exact spring (1.3) so release returns without overshoot.

---

## 4. Assemble / dissolve / reveal choreography

### 4.1 Per-particle staggered window (Lusion, 0.3)
`show = smoothstep(r1*0.2 + y*0.4, 0.4 + r2*0.2 + y*0.4, u_showRatio)` — start in [0,0.6], end in [0.4,1.0]; bottom rows first (y term spans 0.4 of the range), random jitter 0.2, each particle's own ramp length 0.4 +/- 0.2. While `show<1` the particle is offset by a noise gradient x0.2 and drifts (+x by height, -z) -> assembles "into" the head from behind/below. Alpha uses `showRatio^2` and a final `linearStep(0.8,1,showRatio^2)` gate.
### 4.2 Three.js Journey "Particles Morphing Shader" (https://threejs-journey.com/lessons/particles-morphing-shader): two attributes `position` / `aPositionTarget`, `uProgress` in [0,1], per-particle **delay/duration from simplex noise** (noise evaluated at origin and target positions, remapped so each particle gets its own `[delay, delay+duration]` sub-window of the global progress, then `smoothstep(delay, delay+duration, uProgress)`); geometries with different vertex counts equalised by duplicating random vertices; fragment disc `alpha = 0.05 / length(uv-0.5)`; colour mixed across the transition; size perspective-corrected by `uSize`. (Free part of the lesson only; details from the public lesson description.)
### 4.3 Noise-threshold dissolve (Codrops, https://tympanus.net/codrops/2025/02/17/implementing-a-dissolve-effect-with-shaders-and-particles-in-three-js/): `if(noise < uProgress) discard;` edge band `noise > uProgress && noise < uProgress + uEdge`; particles emitted only where `vNoise in [uProgress, uProgress+uEdge]`; two-composer selective bloom.
### 4.4 Hash for per-particle delay: `hash21(p) = fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453)` (https://github.com/Nautiloideas/ShaderCollection/blob/main/GLSL_Noise.md, https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83). Better (used by Lusion): Dave Hoskins `hash42/hash43`: `p4=fract(p*vec4(.1031,.1030,.0973,.1099)); p4+=dot(p4,p4.wzxy+33.33); return fract((p4.xxyz+p4.yzzw)*p4.zywx);`.
### 4.5 The-Spirit life cycle: `life -= dieSpeed (0.015)` per frame; respawn at `default*0.4*radius*(1+0.2 sin(15t))` around the follow point; `life = 0.5 + fract(rand*21.4131 + time)` (staggered lifetimes); `gl_PointSize *= smoothstep(0,0.2,life)` (fade-in); colour `mix(color2,color1,smoothstep(0,0.7,life))`; intro `mix(vec3(0,-200,0), pos, smoothstep(0,0.3,initAnimation))`.
### 4.6 fwdapps "Particles Transition" (three.js forum https://discourse.threejs.org/t/particles-transition-bloom/89382, demo https://fwdapps.net/l/particles-transition-2/): image <-> particle field on GPGPU + curl; **bloom peaks mid-transition via a progress remap** (e.g. `bloom = base + k*sin(PI*progress)` *[derived from the description]*).

---

## 5. Morphing between two point sets — correspondence strategies

Ranked by how it looks (best first), from the sources:
1. **Avoid correspondence entirely: cross-dissolve two clouds with defocus/glitch/slide** — what lusion.co ships (0.4). Zero artefacts, any point counts.
2. **Index-aligned shared parametrisation**: sample every head with the *same* N points in the *same* parametric order (Lusion: N = 8192 for every person, same `a_simUv` per instance -> a morph would be `mix(texA, texB, progress)`; Three.js Journey equalises counts by duplicating random vertices). Ordering the bake by (phi, theta) around the head axis or by UV of a common template mesh makes same-index points spatially close -> short, coherent trajectories.
3. **Sort both sets along a space-filling curve** (Hilbert / Morton) and pair by rank: Hilbert order "provides the best spatial correlation preservation compared with Z-order" (IEEE TIP 2022, https://dl.acm.org/doi/abs/10.1109/TIP.2022.3186532); Z-order accelerates kNN by limiting search to one curve range (https://www.researchgate.net/publication/44596502_Fast_Construction_of_k-Nearest_Neighbor_Graphs_for_Point_Clouds). O(N log N) approximation of a transport map; avoids the "everything crosses through the centre" look of random pairing.
4. **Sort by luminance / depth** (2-D image particles): cheap, keeps bright-with-bright but scrambles space -> long crossing paths; acceptable only with heavy curl masking (forum thread https://discourse.threejs.org/t/morph-image-particle-creating-a-particle-based-face-transition-effect/78794 reports difficulty getting a smooth two-image morph with UV-driven targets, `discard` for `imageColor.r < 0.1`, `uProgress` then `uSecondProgress`, increment 0.005/frame).
5. **Nearest-neighbour / greedy** (ICP-style): pointwise NN assignment (https://arxiv.org/pdf/2602.02232); collapses many->one, leaves holes; greedy with a "used" set is O(N^2) without a kd-tree.
6. **Optimal transport / approximations**: exact EMD is O(N^3); NN-based approximations (https://arxiv.org/pdf/2401.07378), sliced transport plans (https://arxiv.org/pdf/2508.01243), partial OT for registration (https://arxiv.org/pdf/2309.15787, https://proceedings.neurips.cc/paper_files/paper/2021/file/2b0f658cbffd284984fb11d90254081f-Paper.pdf). Offline only (bake-time script for N <= 16k), then store the permutation in the `.buf`.
Visual rule: whatever the pairing, animate with a per-particle staggered window (4.2) plus small curl (2) and a mid-transition bloom bump (4.6); a straight `mix()` on all points simultaneously reads as a mechanical cross-fade. Public demo of index-aligned morph: https://github.com/wonjyou/morphing-particle-swarm (20k particles, smoothstep blend).

---

## 6. Rendering

### 6.1 Size attenuation
three.js `points.glsl.js` (https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderLib/points.glsl.js): `gl_PointSize = size; if(isPerspective) gl_PointSize *= (scale / -mvPosition.z);` (`scale` = half the drawing-buffer height). Custom shaders: `gl_PointSize = size * (1.0 / -viewPosition.z)` (Maxime Heckel); UntilLabs `uSize * aScale * (1/-viewPosition.z)` with `aScale in [0.5,1]`; Codrops 2019 `psize = (snoise(vec2(uTime,pindex)*0.5)+2) * max(grey,0.2) * uSize` (size proportional to brightness); The-Spirit `gl_PointSize = 1300/length(mvPosition) * smoothstep(0,0.2,life)`. Multiply by `devicePixelRatio` when using gl_Points. Lusion sidesteps gl_Points entirely (instanced quads -> sizes in world units, min 12 px via `max(size, 12/resolution.y)` and energy compensation `pow(base/clamped, 1.5)`).
### 6.2 Round / soft sprites
- `gl_PointCoord` disc: `d = length(uv-0.5); alpha = smoothstep(0.5, 0.5-border, d)` (Codrops 2019: border 0.3, radius 0.5) or glow `alpha = 0.05/d` (Three.js Journey). Lusion: `linearStep(1, 1-range-fwidth(d), d)` with `range = blurriness*5` (edge width grows with defocus -> cheap bokeh).
- Soft particles vs geometry (three.js forum https://discourse.threejs.org/t/soft-particles-render/504): `fade = saturate((sceneDepth - particleDepth) * fDistance)`, `zFade = 0.5*pow(saturate(2*(fade>0.5 ? 1-fade : fade)), fContrast)`, `depthTest=false`.
### 6.3 Blending
Additive (`One, One` / `THREE.AdditiveBlending`) + `depthWrite:false` (+ `depthTest:false` for Lusion, Codrops 2024): order-independent, "saturated" glow (Maxime Heckel, Codrops 2024, three.js attractors example, Lusion). Normal blending needs sorting and yields the dithered-photo look the owner dislikes when points are opaque. Lusion's lines use `MaxEquation` to avoid overbright overlaps; three.js WebGPU `compute_particles` uses `alphaToCoverage:true` with `opacityNode = shapeCircle()`.
### 6.4 Depth cueing / fog / defocus
- three.js Points supports `fog_vertex/fog_fragment` includes.
- Lusion: blurriness = distance from a focal plane `|depth - focal|*2.5`, size x(1+8*blur^1.5), alpha x(1-blur)^3*0.8, shade x(1-0.5*blur). Blurry library (Codrops https://tympanus.net/codrops/2019/10/01/simulating-depth-of-field-with-particles-using-the-blurry-library/): particles accumulated and "randomly displaced in a circle depending on how far away they are from the focal plane"; `bokehStrength 0.02, focalPowerFunction 1, distanceAttenuation 0.002, pointsPerFrame 50000, cameraFocalDistance 100`.
- Glyph-rain layers blurred 16/8/4/0 px (0.5): DoF without a depth buffer.
### 6.5 Rim light / normals
- Best: bake normals (Lusion `nShade`). Rim = `smoothstep(0.03, 0, |viewNormal.z|)` on the scanline pass, plus `frontFaceMultiplier = linearStep(-0.2, 0, viewNormal.z)` culling back-facing points (crucial for the solid-head read).
- From a depth map (photo pipeline): view-space position from depth, then `N = normalize(cross(ddx(P), ddy(P)))` (naive; artefacts at discontinuities). **Improved** (Turanszki https://wickedengine.net/2019/09/improved-normal-reconstruction-from-depth/, bgolus gist https://gist.github.com/bgolus/a07ed65602c009d5e2f753826e8078a0):
```glsl
l = Pc - Pl; r = Pr - Pc; d = Pc - Pd; u = Pu - Pc;
hDeriv = abs(l.z) < abs(r.z) ? l : r;  vDeriv = abs(d.z) < abs(u.z) ? d : u;
N = normalize(cross(hDeriv, vDeriv));
```
  **Accurate** 5-tap with perspective extrapolation `he = abs(H.xy*H.zw/(2*H.zw - H.xy) - depth)` picks the side with the smaller extrapolation error (atyuwen https://atyuwen.github.io/posts/normal-reconstruction/) — "all artifacts are eliminated". For an offline bake from a depth image use central differences: `N = normalize(vec3(-(D(x+1)-D(x-1))/(2sx), -(D(y+1)-D(y-1))/(2sy), 1))` *[standard]*.
- Depth sources for photos: Codrops fake-3D (https://tympanus.net/codrops/2019/02/20/how-to-create-a-fake-3d-image-effect-with-webgl/) hand-painted depth, `uv + mouse*depth.r`; single-image depth: MiDaS / ZoeDepth / Marigold / Depth-Anything ("when you want a depth map of the human face, you need a more detailed model trained on human faces", Patricio Gonzalez Vivo https://medium.com/@patriciogv/the-state-of-the-art-of-depth-estimation-from-single-images-9e245d51a315); TensorFlow Portrait Depth API for faces.
### 6.6 Bloom for point clouds
- pmndrs postprocessing `Bloom`: `luminanceThreshold` default 0.9, `luminanceSmoothing` in [0,1], `mipmapBlur` (https://react-postprocessing.docs.pmnd.rs/effects/bloom); common starting config `threshold 0.8, smoothing 0.075, intensity 1.4`; `threshold 1` + HDR colours > 1 = selective bloom without layers (https://github.com/pmndrs/postprocessing/issues/496).
- three.js forum (https://discourse.threejs.org/t/how-to-make-particles-glowing-with-unreal-bloom-pass/80392): threshold 0.1 blooms everything; either push particle colour to HDR (`color.set(100,100,100)`) or use the dual-composer selective bloom demo.
- Codrops 2024 GPGPU: threshold 0.2, strength 0.8. Because additive overlap already exceeds 1.0 in dense regions, keep threshold >= 0.8 and let overlap drive the glow; Lusion applies no bloom to the faces (defocus + additive does the job) and grades with colorDodge `#005aff`.

---

## 7. Performance

| pipeline | count | fps / device | source |
|---|---|---|---|
| WebGL1 FBO ping-pong (The-Spirit, 2015) | presets 4k ... 4M (`amountMap`: 64x64 ... 2048x2048), default 65k | — | https://github.com/edankwan/The-Spirit/blob/master/src/core/settings.js |
| WebGL2 FBO (Maxime Heckel, R3F) | 128^2 = 16k demo; "way over 1 million" on M1 MBP 2020 | 60 | magical-world-of-particles post |
| WebGL2 FBO (Lusion 2024 about bg) | 128x192 = 24.5k desktop, 128x128 = 16k mobile (+ 8,192 per face x 2) | shipped; DPR capped `min(1.5, dpr)`, `MAX_PIXEL_COUNT = 2560x1440` | lusion bundle `Settings` |
| WebGL2 gl.POINTS (UntilLabs, Codrops 2025) | 60,000 (65,536 in 256^2 textures, ~604 KB for 4 textures; half-float) | "constant 60 FPS" | Codrops UntilLabs |
| WebGL2 transform feedback | 10,000 demo | — | https://gpfault.net/posts/webgl2-particles.txt.html |
| WebGPU compute (three.js examples) | 200,000 (compute_particles), 262,144 (attractors, 2^18) | 60 desktop | threejs.org examples |
| WebGPU compute (Medium, Dev48V) | 250,000 | — | https://medium.com/@dev48v/webgpu-i-simulated-250-000-particles-entirely-on-the-gpu-in-the-browser-e5c64eb61c4f |
| WebGPU compute (Codrops fluids) | ~1M cited | 60 | https://tympanus.net/codrops/2025/01/29/particles-progress-and-perseverance-a-journey-into-webgpu-fluids/ |
Notes:
- Instancing vs gl_Points: gl_Points = one vertex per particle (cheapest) but max point size is implementation-limited, DPR must be applied manually, no rotation/aspect. Instanced quads (Codrops 2019: 320x180 = 57,600 quads; Lusion faces 8,192; three.js `SpriteNodeMaterial` in WebGPU examples) cost 4 verts / 2 tris each but give world-space sizing, `fwidth` soft edges, motion-blur stretching and motion vectors.
- Point count needed for a *solid* head is small: Lusion uses **8,192** points per face at ~12-25 px each with additive overlap; the head reads solid because of the defocus/size law + back-face culling, not density. UntilLabs uses 60k for a full portrait. A 128x128 (16k) or 256x128 (32k) sim texture per founder is ample and morph-friendly.
- DPR: Lusion caps DPR at 1.5 and total pixels at 2560x1440; particle min size is in pixels (`12/u_resolution.y`) so it survives DPR changes.
- three.js WebGPU TSL parameters seen: attractors `delta = 1/60` fixed, `velocityDamping 0.1` (`vel *= 1-0.1`), `maxSpeed 8` clamp, size `0.008*mass`, colour by speed `mix(#5900ff, #ffa575, |v|/maxSpeed)`, `AdditiveBlending, depthWrite:false`; compute_particles `size 0.12-0.5`, `alphaToCoverage:true`.

---

## 8. Consolidated reference list
- Lusion live bundle: https://lusion.co/_astro/hoisted.CUO_IjfL.js ; data https://lusion.co/assets/team/team.json , https://lusion.co/assets/team/edan.buf (mirror https://lusion.dev/assets/team/edan.buf)
- Lusion v3 awards/tech: https://www.awwwards.com/sites/lusion-v3 , https://thefwa.com/cases/lusion-v3 , https://www.cssdesignawards.com/sites/lusion-v3/44311 ; older case study (Three.js, Houdini VAT, matcaps): https://www.awwwards.com/case-study-for-lusion-by-lusion-winner-of-site-of-the-month-may.html ; Codrops profile: https://tympanus.net/codrops/2026/04/13/lusion-where-digital-craft-meets-ambitious-experimentation/ ; hobby recreation (home page only, no team section): https://github.com/canxerian/lusion-reverse-engineered
- Edan Kwan The-Spirit (GPGPU + curl4 + shadows + motion blur): https://github.com/edankwan/The-Spirit ; Particle Love: https://experiments.withgoogle.com/particle-love ; Medium (403 for bots): https://medium.com/@edankwan/lost-in-parallel-universe-dba640efd39a
- Springs: https://www.ryanjuckett.com/damped-springs/ , https://theorangeduck.com/page/spring-roll-call , https://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/ , https://gafferongames.com/post/integration_basics/ , https://blog.maximeheckel.com/posts/the-physics-behind-spring-animations/ , http://mathproofs.blogspot.com/2013/07/critically-damped-spring-smoothing.html (body did not load), https://github.com/amandaghassaei/MassSpringShader
- Curl noise: Bridson 2007 PDF (above), https://www.mysimulator.uk/articles/curl-noise-flow-field/ , https://github.com/cabbibo/glsl-curl-noise , https://al-ro.github.io/projects/particles/ , https://al-ro.github.io/projects/embers/ (JS-rendered, no text fetched), https://atyuwen.github.io/posts/bitangent-noise/ , https://dl.acm.org/doi/10.1145/3757377.3763980 , https://gist.github.com/moonraker22/e48929525bab0036e2f15688fdc07608
- GPGPU tutorials: https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/ , https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/ , https://tympanus.net/codrops/2025/12/10/simulating-life-in-the-browser-creating-a-living-particle-system-for-the-untillabs-website/ , https://blog.maximeheckel.com/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/ , https://blog.maximeheckel.com/posts/field-guide-to-particles-with-webgpu-tsl/ (client-rendered; not fetchable as text) , https://threejs-journey.com/lessons/gpgpu-flow-field-particles-shaders , https://threejs-journey.com/lessons/particles-morphing-shader , https://threejs-journey.com/lessons/particles-cursor-animation-shader , https://threejs-journey.com/lessons/particles , https://wawasensei.dev/courses/react-three-fiber/lessons/tsl-gpgpu , https://gpfault.net/posts/webgl2-particles.txt.html , https://webgl2fundamentals.org/webgl/lessons/webgl-gpgpu.html
- three.js examples: https://threejs.org/examples/webgpu_compute_particles.html , https://threejs.org/examples/webgpu_tsl_compute_attractors_particles.html , https://threejs.org/examples/webgpu_particles.html , https://threejs.org/examples/webgl_points_sprites.html ; shader lib https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderLib/points.glsl.js
- Rendering: https://discourse.threejs.org/t/soft-particles-render/504 , https://discourse.threejs.org/t/points-transparent-textures-depth-artifacts-soft-particles/5927 , https://tympanus.net/codrops/2019/10/01/simulating-depth-of-field-with-particles-using-the-blurry-library/ , https://tympanus.net/codrops/2025/02/17/implementing-a-dissolve-effect-with-shaders-and-particles-in-three-js/ , https://discourse.threejs.org/t/particles-transition-bloom/89382 , https://discourse.threejs.org/t/morph-image-particle-creating-a-particle-based-face-transition-effect/78794
- Normals from depth: https://wickedengine.net/2019/09/improved-normal-reconstruction-from-depth/ , https://atyuwen.github.io/posts/normal-reconstruction/ , https://gist.github.com/bgolus/a07ed65602c009d5e2f753826e8078a0 , https://www.shadertoy.com/view/fsVczR
- Depth from photo: https://tympanus.net/codrops/2019/02/20/how-to-create-a-fake-3d-image-effect-with-webgl/ , https://medium.com/@patriciogv/the-state-of-the-art-of-depth-estimation-from-single-images-9e245d51a315 , https://tympanus.net/codrops/2025/03/31/webgpu-scanning-effect-with-depth-maps/
- Bloom: https://react-postprocessing.docs.pmnd.rs/effects/bloom , https://threejs.org/docs/pages/UnrealBloomPass.html , https://discourse.threejs.org/t/how-to-make-particles-glowing-with-unreal-bloom-pass/80392 , https://github.com/pmndrs/postprocessing/issues/496
- Correspondence / OT: https://dl.acm.org/doi/abs/10.1109/TIP.2022.3186532 , https://www.researchgate.net/publication/44596502_Fast_Construction_of_k-Nearest_Neighbor_Graphs_for_Point_Clouds , https://arxiv.org/pdf/2401.07378 , https://arxiv.org/pdf/2508.01243 , https://arxiv.org/pdf/2309.15787 , https://arxiv.org/pdf/2602.02232 , https://github.com/wonjyou/morphing-particle-swarm
- Hashes: https://github.com/Nautiloideas/ShaderCollection/blob/main/GLSL_Noise.md , https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
