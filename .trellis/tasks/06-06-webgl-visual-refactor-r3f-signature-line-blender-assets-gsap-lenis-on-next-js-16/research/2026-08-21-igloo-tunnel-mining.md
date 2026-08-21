# IGLOO.INC — Underground Descent: Extracted Techniques (2026-08-21)

Mined from the production bundle `igloo-app3d.js` (beautified as `igloo-app3d.pretty.js`, session
scratchpad; line refs point there). The §C warp agent re-verified every snippet against the
pretty bundle directly — treat the line anchors as the source of truth.

## 0. Architecture
Three scenes (igloo/cubes/entry), each with its own composer/RT; one fullscreen triangle mixes
outgoing/incoming with an "ice cut" wipe (`f3`, L32335). Virtual scroll: per-scene
`progress = (y-top)/(height+1)` (L44667); double-lerp + friction velocity accumulator (L44645):
`targetY1=lerpFPSLimited(targetY1,targetY2,.075,100·mult); scroll.y=lerpFPS(scroll.y,targetY1,.15);
velocity+=|Δ|; velocity*=frictionFPS(.98); clamp(0,1)`.

## 1. Scene wipe (uProgress + tScroll + spectral CA) — L32417
`scroll-datatexture.ktx2` channels: r=ice cut, g=tech displacement, b=slope wobble.
```glsl
float slopeDisp=(scrollTex.b*2.-1.)*0.4; float slope=-0.2*aspect;
float inclination=mix(1.-vUv.x+slopeDisp, vUv.x+slopeDisp, step(slope,0.));
float incProgress=fit(uProgress,0.,1.,0.,1.+abs(slope));
float cutDiagonalBlur=falloff(vUv.y+inclination*abs(slope),0.,1.,2.0,incProgress); // CA halo
float cutDisp=falloff(scrollTex.g,0.,1.,1.0,falloff(...,0.9,incProgress));         // px shove
float cut  =falloff(scrollTex.r,0.,1.,0.2,falloff(...,0.2,incProgress));           // hard edge
const float parallaxY=0.4; const float displacement=0.025;
float modulator=12.0*smoothstep(1.,.7,abs(vUv.x*2.-1.))*smoothstep(1.,.7,abs(vUv.y*2.-1.));
if(cut<1.) scene1=chromatic_aberration(tScene1, vUv-vec2(0.,parallaxY*power2In(uProgress)+displacement*cutDisp), modulator, cutDiagonalBlur*noise.r).rgb;
if(cut>0.) scene2=chromatic_aberration(tScene2, vUv+vec2(0.,parallaxY*power2In(1.-uProgress)+displacement*(1.-cutDisp)), modulator, (1.-cutDiagonalBlur)*noise.g).rgb;
color=mix(scene1,scene2,cut);
```
`falloff` (L22983): `float m=margin*sign(end-start); float p=mix(start-m,end,progress);
return _linstep(p+m,p,x);` — a linstep wipe whose margin extends the progress range.
Spectral CA (L32308): 5-tap barrel loop — `ca_barrelDistortion(uv,amt)=uv+cc*dot(cc,cc)*amt`,
weights `ca_spectrum_offset(t)` low/mid/high with 1/2.2 gamma, `sum+=w*tex(distort(uv,bend*max*t))`,
normalized; blue-noise (`tBlue`, random uBlueOffset/frame, L32529) multiplies CA strength.
NOTE: the velocity-weighted slope (`slope=0.15*uProgressVel*aspect...`) exists but is COMMENTED
OUT (L32421-26); shipped uses fixed −0.2. `uProgressVel` uploaded but unused. (SERSAN wired it.)

## 2. Ring-passage burst (`DF`, L41924; envelope L42296)
Per crossing: `uRingProximity` 0→1→0 (0.5s power1.in / 0.4s power1.out); fresh random
`uSquareAttr` per burst (L42292-94: rand·25.424, rand·64.453, intensity 1.0 falling / 0.5 rising).
```glsl
uv-=0.5; uv.x*=aspect; float angle=atan(uv.y,uv.x); float dist=length(uv);
float angle1=angle+0.3*(noise.r-0.5)*uRingProximity;                 // angular smear
vec2 newUv1=vec2(cos(angle1),sin(angle1))*dist; newUv1.x/=aspect; newUv1+=0.5;
float dispSquares=texture2D(tScroll,newUv1*1.5+uSquareAttr.rg).g*2.-1.;
newUv1+=dispSquares*0.01*uSquareAttr.b*uRingProximity;               // block glitch
scene=texture2D(tDiffuse,newUv1).rgb;
scene=rgb2hsv(scene); scene.g+=0.05*uRingProximity; scene.b+=0.075*uRingProximity; scene=hsv2rgb(scene);
sceneColor+=pow(vUv.x*vUv.y,2.)*(sinenoise1(vec3(vUv.x*aspect,vUv.y,time*.5))*.4+.4)*vec3(.8,.9,1.)*noise.b*2.;
```

## 3. Camera rail (L42124)
Paused GSAP timeline (0–9.2) scrubbed `timeline.progress(p)`; proxies copied to camera in
update() (L42335). Position (0,1.5,−2)→y:−9.83 over 7 (custom SVG-path eases, L44955);
fov set 22 → to 30 over 7.2 power1.inOut; **up-vector flip** `upRotation` 0→π power3.inOut
5.25 then `upOriginal` 0→1 lerp-back to world-up (the corkscrew-then-settle). Mesh culling by
progress windows in onUpdate (L42131). Camera layer: pointer orbit in spherical coords
(lerpFPS) + shake = 3-axis SINE-NOISE (deterministic): `sineNoise1(12.23,3.44,−3.234+t*speed)*amp`
with entry `shake=0.02, shakeSpeed=0.25` (L42064, fn `kD` L26014-18); portrait zoom
`min(1,aspect*1.5)` (L42345).

## 4. Tunnel + smoke family (one 128px tileable noise)
Tunnel (`SF`, L41275): inverted open CylinderGeometry(1.3,1.3,9,64,32,true).scale(-1,1,1),
additive:
```glsl
vec2 uv=vUv*vec2(1.,.25); uv.x+=uv.y;  float t=time*0.05;   // shear => spiral streaks
float v=texture2D(tWind,uv*3.+vec2(-t,t*.7)).r;
v*=texture2D(tWind,uv*4.+vec2(-t,t*.7)).r; v*=texture2D(tWind,uv*6.+vec2(-t,t*.7)).r;
v*=smoothstep(0.,.2,vUv.y)*smoothstep(1.,.9,vUv.y); float alpha=pow(v,3.)*3.; color=vec3(.85,.9,1.);
```
Re-parameterized for SmokeTrail (L41049, depth-faded), Plasma (L41400, +glowMask core),
Ceiling/GroundSmoke (L41671/41766, +screen-space brighten). Layer rotation = distinct multiples
of upRotation (.65/.5/.4 — L41359/41465/39625) = cheap corkscrew parallax.

## 5. Shattered rings + forcefield (L39442 / L41471)
Draco shard meshes with per-shard `centr` + `rand` attributes; vertex explodes/rotates by camera
distance: `vFalloff=falloffsmooth(dist,14.,2.,13.,.75); pos-=centr*.3;
pos=rotate3D(pos,normalize(rand*2.-1.),0.5*smoothstep(1.5,12.,-vPos.z)); pos+=centr*.3;
pos+=centr*glowFalloff*mix(.075,.15,rand.z); pos.xz=rotate(pos.xz,falloffsmooth(dist,8.,2.,5.,.5)*PI*.25);`
Fragment mixes baked color→bg gradient by distance + AO-as-emissive. Forcefield membrane
(L41583): disc alpha = triangles-texture × banded noise `sin(noise*13.+time−y*10.)`,
`aastep(0.2,·)`, view-dependent tilt.

## 6. Destination room
TextCylinder (L39982): 4 nested cylinders, blurred-glyph atlas, alpha = tex.r × twinkle
(`sin(t*2+rand*10+x*2+z*2)`) × radial `falloffsmooth`; counter-rotating at upRotation·.65.
LightRoom (L39891): BackSide 100-sphere, two-tone diagonal gradient (#6a6f7d→#e1e6f1) ×
sinenoise, + hash-phased dot grid. Snow (L41113): 200 pts, `treadmill()` fract-wrap
(L33747: `fract((p+m)/(2m))*2m−m`), 6 stacked smoothstep alphas. Ambient (L41825): 60 pts,
3 phase-shifted sines + flicker.

## 7. Post + numbers
Descent bloom: mipmap `{levels:6, threshold:0, intensity:1, radius:.85}` (threshold ZERO —
everything glows faintly). tFrost (L32491): displacement amplitude→0 melt, not alpha. God rays
(L21693) + DoF defined in the toolkit but NOT invoked in the descent — depth faked by
per-material smoothstep fades. Initial DPR cap 1.15/1.5 + adaptive.

## Transplant status in SERSAN (round 3 §C, shipped)
1. falloff wipe + 5-tap spectral CA → preloader-tunnel emergence tear, velocity slope WIRED. ✅
2. Ring burst → PostFXNodes uWarpBurst (luma-space lift variant). ✅
3. Camera rail: up-flip (single-scalar φ composition) + fov 22→30-style widen (+8°) +
   sine-noise shake → seqStore fields consumed in SignatureLine. ✅
4. Triple-multiplied sheared noise → warp wisp layer (procedural value noise). ✅
5. Camera-distance deformation → point spaghettification (≤2.5× stretch, ≤0.4rad). ✅
6. treadmill + progress-window culling → confirmed existing wrap; band gating hardened (P0). ✅
