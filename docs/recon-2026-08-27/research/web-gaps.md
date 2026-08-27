# Dossier `web-gaps` — completeness critique of the 7 research dossiers + gap-filling findings

Date: 2026-08-27. Method note: the session's WebSearch budget was already exhausted (200/200) when this task started, so gap-filling used direct WebFetch of known primary URLs (raw GitHub, developers.google.com, Observable API, UBC paper). Every finding is quoted from the fetched page; nothing is inferred unless labelled.

## Gaps found

### A. Sources not consulted by any dossier
1. **Point-cloud shading literature that yields the "volumetric scan" read without normals** — Eye-Dome Lighting (Boucheny, CloudCompare qEDL → Potree `edl.fs`). Not mentioned anywhere; it is the standard screen-space trick for making a raw point cloud look solid/rim-lit and needs no baked normals. FILLED (§1).
2. **The ancestors of the aesthetic**: Radiohead "House of Cards" (2008, Aaron Koblin, Lidar point cloud of Thom Yorke, data public in `dataarts/radiohead`) and the three.js `webgl_video_kinect` example (depth video → 640×480 additive points with perspective unprojection). Not cited. FILLED (§2).
3. **MediaPipe Face Landmarker** (478 3-D landmarks, canonical face mesh, facial transformation matrix, JS + Python, IMAGE mode) — `web-3d-from-photo` lists 3DDFA/DECA/MICA/HRN but skipped the one face-geometry tool that runs in Node/browser on Windows ARM with no C builds. FILLED (§3).
4. **TF.js `ARPortraitDepth`** — named in `web-repos` §0 but never verified. FILLED (§4).
5. **Uniform-density sampling of a matte**: all dossiers say "sample uniformly inside the matte / blue-noise", none gives an algorithm. Weighted Voronoi stippling (Secord 2002; Bostock's notebook) is the canonical, ~60-line, Node-runnable answer. FILLED (§5).
6. **three.js r184 WebGPU point-size facts** — `web-codrops` #9 repeats a Codrops claim "WebGPU: no variable point size → instanced quads"; nobody checked three's own source for the supported path (`PointsNodeMaterial.sizeNode` + `Sprite.count`). FILLED with verbatim JSDoc + official example (§6).
7. **Matrix rain beyond Lusion** — only `web-lusion-threads` cites Rezmason/matrix, with no parameters. FILLED (§7).
8. **Lusion asset provenance** — every dossier asserts "3D scans / photogrammetry front capture", but this is inferred from the data (98.9 % nz>0, uniform NN spacing), not documented. Edan Kwan's X, Lusion's Awwwards case study and the Codrops profile were checked by others with no result. **Still open** (§8).

Also unconsulted (not filled, no budget): Depthkit / volumetric-video portrait work; Shadertoy matrix-rain shaders (view pages return 403 to curl); Blender MCP / Hyper3D route already in AGENTS.md was never evaluated against a real founder photo; the current SerSan sampler was never measured (see C).

### B. Claims made without evidence (flag for synthesis)
- "Lusion's heads were scanned with a depth camera / photogrammetry" — inference only. Proven: 8,192 pts, front hemisphere, baked normal + shade, uniform xy spacing.
- `web-3d-from-photo` §1.4 anatomy numbers ("face ~12 cm deep ear-plane→nose, ~25 cm head depth") — no source.
- `web-repos` §2.3 "density ∝ 1/cos(view angle) is why scans look rim-lit" — true for a *projected* depth capture, false for uniformly surface-sampled meshes; and Lusion's xy spacing was measured *uniform*, so Lusion's rim comes from `smoothstep(0.03,0,|viewNormal.z|)` + bloom, not density. The dossiers contradict each other here.
- `web-codrops` #9 "WebGPU cannot vary point size" — true only for `Points` primitives (§6).
- "Depth Anything 3 is what the Aug-2026 Codrops relighting article uses" — should be re-checked against that article's text.
- `web-lusion-bundle` "r15x-era three" — no version string quoted.

### C. Questions still open
- Tool Lusion used to bake `nShade.w` (AO? Redshift pass?) — unknown.
- Whether Lusion lowers point count on mobile — not verified on device.
- Whether the founders can simply be scanned (RealityScan/Polycam on iPhone, as Phantom.land did) — removes the whole depth-estimation pipeline; no dossier asked the owner.
- Licence for offline baking with CC-BY-NC DA-V2 Base/Large — unresolved.
- Nobody measured the *current* `FounderPortraitMorph.tsx` sampler (point count kept vs. discarded by the white-wall threshold) — a 10-minute local experiment that would quantify the bug.

## Gap-filling findings

### §1 Eye-Dome Lighting — Potree `edl.fs`
Source: https://raw.githubusercontent.com/potree/potree/develop/src/materials/shaders/edl.fs (header: "adapted from the EDL shader code from Christian Boucheny in cloud compare: https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL"). Verbatim core:
```glsl
uniform vec2 neighbours[NEIGHBOUR_COUNT]; uniform float edlStrength; uniform float radius;
uniform sampler2D uEDLColor;   // rgb = colour, a = log depth written by the point pass
float response(float depth){
  vec2 uvRadius = radius / vec2(screenWidth, screenHeight);
  float sum = 0.0;
  for(int i = 0; i < NEIGHBOUR_COUNT; i++){
    vec2 uvNeighbor = vUv + uvRadius * neighbours[i];
    float neighbourDepth = texture2D(uEDLColor, uvNeighbor).a;
    neighbourDepth = (neighbourDepth == 1.0) ? 0.0 : neighbourDepth;
    if(neighbourDepth != 0.0){
      if(depth == 0.0){ sum += 100.0; } else { sum += max(0.0, depth - neighbourDepth); }
    }
  }
  return sum / float(NEIGHBOUR_COUNT);
}
void main(){
  vec4 cEDL = texture2D(uEDLColor, vUv);
  float depth = cEDL.a; depth = (depth == 1.0) ? 0.0 : depth;
  float res = response(depth);
  float shade = exp(-res * 300.0 * edlStrength);
  gl_FragColor = vec4(cEDL.rgb * shade, opacity);
  if(depth == 0.0){ discard; }
}
```
Mechanism: per pixel, sum positive log-depth differences to N ring neighbours at `radius` px; `shade = exp(-300·edlStrength·mean)`. Pixels behind their neighbours darken (crevices), silhouettes stay bright → normal-free volumetric look. For SerSan: a 2-pass post (points→RT with depth in alpha, then EDL) gives the "solid scan" read even if normals baked from a depth map are noisy. Lusion does not use EDL; it bakes normals and lights per point.

### §2 Ancestors: Radiohead "House of Cards" + three.js `webgl_video_kinect`
- https://github.com/dataarts/radiohead — CSV point-cloud data of Thom Yorke ("Lidar scan data"), "Copyright 2008 Radiohead" CC BY-NC-SA 3.0; code "Copyright 2008 Aaron Koblin" Apache-2.0; Processing source included; archived 2018-03-29. Visual origin of every "glowing point-cloud head".
- https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_video_kinect.html — verbatim:
```glsl
const float XtoZ = 1.11146; const float YtoZ = 0.83359;          // Kinect intrinsics
float depth = ( color.r + color.g + color.b ) / 3.0;
float z = ( 1.0 - depth ) * (farClipping - nearClipping) + nearClipping;
vec4 pos = vec4( ( position.x / width - 0.5 ) * z * XtoZ, ( position.y / height - 0.5 ) * z * YtoZ, - z + zOffset, 1.0);
gl_PointSize = pointSize;
// frag: gl_FragColor = vec4( color.rgb, 0.2 );
```
Setup: 640×480 = 307,200 points; `ShaderMaterial` with `AdditiveBlending, depthTest:false, depthWrite:false, transparent:true`; uniforms `nearClipping 850, farClipping 4000, pointSize 2, zOffset 1000`. This is the minimal "unproject a depth map with a focal length" recipe (`x = (u−0.5)·z·XtoZ`) that `web-3d-from-photo` §5 describes without a source; perspective unprojection is what keeps the head from reading as a flat embossed plate.

### §3 MediaPipe Face Landmarker
Source: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker — "an estimate of 478 3-dimensional face landmarks"; optional "52 blendshape scores"; optional `output_facial_transformation_matrixes` that "transform the face landmarks from a canonical face model to the detected face"; `running_mode` `IMAGE` (default) "for single image inputs"; Web/JavaScript and Python guides; model bundle `face_landmarker.task` (float16); code samples Apache-2.0, docs CC-BY-4.0.
Use for SerSan: (a) face-region mask + eye/nose/mouth anchors to align the 4 founders so the A→B transition has consistent landmarks; (b) a coarse 3-D prior (478-vertex canonical mesh, face only) to regularise the monocular depth map's relief scale (fixes the "compressed head relief" measured in `web-3d-from-photo` §1.4). It gives no scalp/ears/shirt geometry, so it complements Depth Anything, not replaces it.

### §4 TF.js `ARPortraitDepth`
Sources: https://raw.githubusercontent.com/tensorflow/tfjs-models/master/depth-estimation/README.md ; https://raw.githubusercontent.com/tensorflow/tfjs-models/master/depth-estimation/src/ar_portrait_depth/README.md — input "a single portrait image"; depth = "the distance to the camera center"; config `outputDepthRange: [0, 1]`, `minDepth`/`maxDepth` ("maps smaller values to 0 / larger values to 1"), `flipHorizontal`, `segmentationModelUrl` (a segmenter runs first) and `depthModelUrl`; accessors `toCanvasImageSource() / toArray() / toTensor()`; linked "3D Photo Demo".
```js
const model = depthEstimation.SupportedModels.ARPortraitDepth;
const estimator = await depthEstimation.createEstimator(model, { outputDepthRange: [0, 1] });
const depthMap = await estimator.estimateDepth(image, { flipHorizontal: false });
```
Why it matters: trained on portraits and background-masked by construction (segmentation is part of the pipeline), so the wall is zeroed without the raw-unit threshold (`d > 2.0`) proposed for Depth Anything. Output resolution and licence not stated in the README (open).

### §5 Density-weighted sampling of the matte — Weighted Voronoi Stippling
Sources: https://api.observablehq.com/@mbostock/voronoi-stippling.js ("based on Weighted Voronoi Stippling by Adrian Secord", 2002: https://www.cs.ubc.ca/labs/imager/tr/2002/secord2002b/secord.2002b.pdf). Verbatim:
```js
const n = Math.round(width * height / 40);                 // point budget
for (let i = 0; i < n; ++i) for (let j = 0; j < 30; ++j) { // rejection sampling on density data[] (0..1)
  const x = points[i*2] = Math.floor(Math.random()*width), y = points[i*2+1] = Math.floor(Math.random()*height);
  if (Math.random() < data[y*width + x]) break;
}
for (let k = 0; k < 80; ++k) {                              // density-weighted Lloyd relaxation
  c.fill(0); s.fill(0);
  for (let y = 0, i = 0; y < height; ++y) for (let x = 0; x < width; ++x) {
    const w = data[y*width + x]; i = delaunay.find(x + 0.5, y + 0.5, i);
    s[i] += w; c[i*2] += w*(x + 0.5); c[i*2+1] += w*(y + 0.5);
  }
  const w = Math.pow(k + 1, -0.8) * 10;                    // decaying jitter
  for (let i = 0; i < n; ++i) { const x0 = points[i*2], y0 = points[i*2+1];
    const x1 = s[i] ? c[i*2]/s[i] : x0, y1 = s[i] ? c[i*2+1]/s[i] : y0;
    points[i*2]   = x0 + (x1 - x0)*1.8 + (Math.random() - .5)*w;   // over-relaxation 1.8
    points[i*2+1] = y0 + (y1 - y0)*1.8 + (Math.random() - .5)*w; }
  voronoi.update();
}
```
Recipe for SerSan: `data[] = subjectMask · (0.6 + 0.4·|∇depth|)` (never luminance) → 8–16k blue-noise points covering scalp/forehead/cheeks uniformly, densifying only on geometric detail; run once offline in Node with `d3-delaunay`; then read z from the depth map per point and normals from the depth gradient. This is the missing algorithm behind every dossier's "sample uniformly inside the matte".

### §6 three.js dev (→ r184) WebGPU: sized points via `PointsNodeMaterial.sizeNode` + `Sprite.count`
- https://raw.githubusercontent.com/mrdoob/three.js/dev/src/materials/nodes/PointsNodeMaterial.js JSDoc: "WebGPU only supports point primitives with a pixel size of `1`, it's not possible to define a size." and on `sizeNode`: "this node has no effect when the material is used with {@link Points} and a WebGPU backend." Two render paths: `Points` primitives, or "Sprites with instancing – rendered as instanced quads"; attenuation `pointSize = pointSize.mul( scale.div( positionView.z.negate() ) )` when `sizeAttenuation` + perspective camera.
- https://raw.githubusercontent.com/mrdoob/three.js/dev/src/objects/Sprite.js — `count`: "The number of instances of this sprite. Can only be used with {@link WebGPURenderer}." (default 1).
- https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgpu_instance_points.html, verbatim:
```js
material = new THREE.PointsNodeMaterial( {
  colorNode: pointColors, opacityNode: shapeCircle(),
  positionNode: instancedBufferAttribute( positionAttribute ),
  sizeNode: instancedBufferAttribute( instanceSizeBufferAttribute ),
  vertexColors: true, sizeAttenuation: false, alphaToCoverage: true } );
const instancedPoints = new THREE.Sprite( material ); instancedPoints.count = divisions; scene.add( instancedPoints );
computeSize = Fn( () => { const relativeTime = time.add( float( instanceIndex ) );
  const sizeFactor = sin( relativeTime.mul( pulseSpeed ) ).add( 1 ).div( 2 );
  instanceSizeStorage.element( instanceIndex ).assign( sizeFactor.mul( maxWidth.sub( minWidth ) ).add( minWidth ) ); } )().compute( divisions );
```
So on SerSan's stack Lusion's quad (`pos.xy += position.xy * pointSize`, size from blurriness, `fwidth` soft disc) maps 1:1 to `Sprite + PointsNodeMaterial` with `sizeNode` (per-instance, computed in TSL from the DoF term) and `opacityNode` (soft disc) — no hand-rolled InstancedBufferGeometry needed.

### §7 Matrix rain — Rezmason/matrix
Source: https://raw.githubusercontent.com/Rezmason/matrix/master/README.md — "The 2D glyphs are in a *fixed grid* and *don't move*. The 'raindrops' we see in the effect are simply waves of illumination of stationary symbols that occupy a column." "Raindrops themselves are particles computed on the GPU and stored in textures, much smaller than the final render." Glyphs are MSDF (msdfgen); multiple raindrops per column via "a sawtooth wave, modulating the width of the teeth". Defaults: `numColumns 80`, `bloomSize 0.4`, `bloomStrength 0.7`, `ditherMagnitude 0.05`, `cursorIntensity 2.0`, `glintIntensity 1.0`, `density 1.0`, `forwardSpeed 1.0`, `slant 0°`, `volumetric false`, `fps 60`; plus `raindropLength`, `fallSpeed`, `cycleSpeed`, `animationSpeed`, colours via `palette / cursorColor / glintColor` (RGB or HSL).
Versus Lusion: Lusion scrolls the UV of a 42-glyph 1-bit atlas (2–10 glyphs/s) and re-rolls glyph index ~2×/s (`hash43`); Rezmason keeps glyphs fixed and moves illumination. Both randomise per-cell brightness and rely on bloom. Lusion's approach (one instanced strip per column, atlas UV scroll) is simpler and matches the target; Rezmason's `bloomStrength 0.7 / dither 0.05` are sane defaults.

### §8 Lusion provenance — documented negative
No fetchable primary statement from Lusion/Edan Kwan on how the 7 heads were captured (X not reachable here; search budget exhausted). Proven from assets (all dossiers agree): 8,192 pts, xy∈[−1,1], z∈[0,1], 98.9 % front-facing normals, baked shade, uniform xy spacing ≈0.012 → consistent with a *front depth capture re-sampled on a grid/blue-noise* — the same class of data SerSan can produce via headshot → depth (§2/§4 or Depth Anything) → stippled sampling (§5) → normals from depth gradient. Label the "scan" claim as inferred.
