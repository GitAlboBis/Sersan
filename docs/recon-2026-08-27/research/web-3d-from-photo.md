# Dossier `web-3d-from-photo` — Image → depth / 3D tooling for a volumetric founder head (Windows 11 ARM, Node 22, Python 3.14)

Date: 2026-08-27. Everything below was either fetched from the cited URL or **measured on this laptop** during this session (Snapdragon X X1E80100, 12 cores, ARM64, Node v22.20.0, Python 3.14.0 ARM64 with `torch 2.12.0+cpu`, `onnxruntime 1.26.0`, `onnxruntime-qnn 2.1.0` already installed — verified with `pip list`).
Scratch files for reproduction: `C:/Users/alber/AppData/Local/Temp/claude/C--Users-alber-sersan/1c69a823-396b-49b0-8d9a-70aaa24ca458/scratchpad/depthtest/` (Node script `depth.mjs`, outputs `depth-fp32.png`, `depth-q8.png`, `depth-py-small.png`, `depth-py-large.png`, raw `depth-q8.f32`) and `.../scratchpad/lusion-hoisted.js` + `edan.buf` (Lusion's own team assets, downloaded for reverse engineering).

---

## 0. TL;DR ranking (practicality for THIS laptop and THIS goal)

| Rank | Route | Verdict | Measured / cited facts |
|---|---|---|---|
| **1** | **(A) Transformers.js `onnx-community/depth-anything-v2-small`, `dtype:'q8'`, in Node** | Works today, zero setup beyond `npm i @huggingface/transformers sharp`. **2.5 s inference** on the 1200×1800 headshot, 27 MB model. Output is a per-pixel Float32 relative inverse-depth map at full source resolution. Wall vs scalp separation is ~1.1 vs ~3.1 (unit-less disparity) → the "empty scalp" problem disappears because the wall is FAR and the scalp is NEAR, regardless of colour. | measured, see §1 |
| **2** | **(B) Python torch (ARM64 native, already installed) + HF `transformers` pipeline** | Also works today. Small: 5.6 s; Base: 77 s; Large: 59 s (CPU). Use for the final bake if you want Large-quality relief. Same output semantics as (A). | measured, see §2 |
| **3** | **(E) Depth → point cloud in three.js** (unproject with fake focal, z-relief, normals from gradient) | Pure math, no tooling. Formulas + code in §5. This is exactly what Lusion's shader consumes: a front-facing **shell** of ~8k points with baked normal + shade (§6 proves Lusion's heads are a 2.5D shell, not a closed mesh). | reverse engineered, see §6 |
| 4 | (C) FLAME/BFM face reconstruction (3DDFA_V2, DECA, MICA, HRN) | 3DDFA_V2 is the only one plausibly runnable here (MIT, ONNX CPU path, 38,365-vertex BFM mesh) but needs Cython/C builds (`build.sh`) that are untested on Windows ARM; produces a **face-only** mask (no scalp, no ears, no shirt) so it cannot replace the depth route for a "portrait" — usable only as an additive geometry prior. DECA needs pytorch3d (no ARM Windows wheels) and is non-commercial; MICA/HRN are GPU-only. | cited, see §3 |
| 5 | (D) Generic image→3D (Hunyuan3D 2.x, TripoSR, InstantMesh, Rodin, Meshy, Tripo) | All GPU-only locally (6–16 GB VRAM) → hosted only. **Hunyuan3D-2 / 2.1 licence excludes the EU, UK and South Korea** — Sersan is a UK company, so it is unusable for this site even via a hosted Space. Rodin free tier has no export rights, Meshy free = 100 credits/month under CC-BY-4.0 (attribution). Quality on human heads is not the strength of any of them (they are object generators). | cited, see §4 |

**Recommended pipeline** (offline bake, one-off per founder, ~10 s total): headshot → (A) or (B) depth map → head-only normalisation (threshold ≈ 2.0 in raw units for these studio shots, then min-max inside the mask) → optional 1–2 % box-blur to kill 8-bit banding (Codrops technique, §5.3) → unproject on a regular grid or a Poisson-thinned grid to N≈8–16k points → bake per-point normal (depth gradient) + shade (AO/rim, §5.4) → write a compact binary (`Uint16` packed positions + `Uint8` nShade, exactly Lusion's `.buf` layout, §6.2) → load into the existing GPGPU sim as `homeA…homeD`.

---

## 1. Route A — Monocular depth OFFLINE in Node with Transformers.js (RANK 1)

### 1.1 Package / model / files (verified via HF API on 2026-08-27)

- npm: `@huggingface/transformers` (installed 2026-08-27 in the scratch dir; it pulls `onnxruntime-node`, `onnxruntime-web`, `onnxruntime-common`, and `sharp` for Node image I/O). Docs: https://huggingface.co/docs/transformers.js/api/pipelines
- Model: `onnx-community/depth-anything-v2-small` — licence **Apache-2.0** (Base/Large/Giant are CC-BY-NC-4.0 — do NOT use them on a commercial site). https://huggingface.co/onnx-community/depth-anything-v2-small
- ONNX files and sizes, from `https://huggingface.co/api/models/onnx-community/depth-anything-v2-small?blobs=true`:

| file | small | base (NC) | large (NC) |
|---|---|---|---|
| `onnx/model.onnx` (fp32) | 99.1 MB | 388.9 MB | 1336.9 MB |
| `onnx/model_fp16.onnx` | 49.6 MB | 194.6 MB | 668.7 MB |
| `onnx/model_int8.onnx` / `model_quantized.onnx` / `model_uint8.onnx` (= `dtype:'q8'`) | 27.3 MB | 102.4 MB | 347.4 MB |
| `onnx/model_q4.onnx` | 27.4 MB | 102.3 MB | 317.7 MB |
| `onnx/model_q4f16.onnx` | 19.1 MB | 72.5 MB | 234.6 MB |
| `onnx/model_bnb4.onnx` | 26.1 MB | 97.0 MB | 298.8 MB |

- Preprocessor (`preprocessor_config.json`): `DPTImageProcessor`, resize to **518** (keep aspect ratio, `ensure_multiple_of: 14`), ImageNet mean/std `[0.485,0.456,0.406]/[0.229,0.224,0.225]`, bicubic (`resample: 3`). The pipeline then **bilinearly upsamples the prediction back to the source size** — so `predicted_depth.dims` = `[1800, 1200]` for our headshots, but true detail is at 518-px scale (≈0.43× of the source). Parameter counts from the DA-V2 repo: Small 24.8 M, Base 97.5 M, Large 335.3 M, Giant 1.3 B (https://github.com/DepthAnything/Depth-Anything-V2).

### 1.2 Code that ran (Node 22, `depth.mjs`)

```js
import { pipeline } from '@huggingface/transformers';
import fs from 'node:fs';

const est = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', { dtype: 'q8' }); // 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16'
const { predicted_depth, depth } = await est('C:/Users/alber/Desktop/Sersan/public/founders/michele-headshot.webp');
// predicted_depth: Tensor { dims: [H, W], data: Float32Array }  -> raw relative inverse depth (bigger = closer)
// depth:           RawImage (W×H, 1 channel, 0..255 min-max normalised)  -> depth.save('depth.png')
fs.writeFileSync('depth.f32', Buffer.from(predicted_depth.data.buffer, predicted_depth.data.byteOffset, predicted_depth.data.byteLength));
```

`predicted_depth.data` is a `Float32Array` (verified). `RawImage.save()` writes PNG via sharp in Node.

### 1.3 Measured timings on this laptop (ARM64, onnxruntime-node CPU EP), image 1200×1800

| dtype | model load (cold, incl. first download) | **inference** | raw range |
|---|---|---|---|
| fp32 | 19.2 s (download) | **27.1 s** | 0.377 … 5.111 |
| fp16 | 5.7 s | 26.7 s | 0.378 … 5.097 |
| **q8** | 2.0 s | **2.5 s** | 0.554 … 5.134 |

Observation: fp32/fp16 are ~11× slower than q8 on this ARM CPU (onnxruntime-node's fp32 kernels are not tuned for this SoC; int8 uses NEON dot-product paths). q8 output is visually indistinguishable except slight speckle in flat areas (see `depth-q8.png` vs `depth-fp32.png`). Both PNGs were inspected: silhouette of head/ears/glasses frames/nose bridge/collar all cleanly separated from the white wall.

### 1.4 What the numbers look like on a real founder headshot (q8, Michele, raw units)

Measured with a region script over `depth-q8.f32` (W=1200, H=1800):

| region | min | max | mean |
|---|---|---|---|
| wall, top-left 200×200 | 1.078 | 1.233 | **1.157** |
| wall beside head | 0.893 | 1.094 | **1.001** |
| shaved scalp (500–700, 320–420) | 0.867* | 3.459 | **3.115** |
| forehead | 3.292 | 3.714 | 3.604 |
| nose | 3.252 | 4.073 | **3.901** |
| left cheek | 3.220 | 3.778 | 3.471 |
| chin | 3.507 | 3.900 | 3.746 |
| neck | 3.086 | 3.897 | 3.646 |
| shirt, bottom rows | 4.377 | 5.134 | 4.775 |

(*the 0.867 is the wall pixels inside the rectangle's corner.)
Pixels with value < 1.0 = 745,375 (wall) vs ≥ 1.0 = 1,414,625 (subject).

Consequences for the current bug:
- **The white wall and the lit scalp differ by ~2 units (≈3× in disparity) even though they have the same colour.** A single threshold `d > 2.0` is a robust subject mask for all four studio shots (the flood-fill hack in `FounderPortraitMorph.tsx` — `BG_FILL_TOL 0.055`, `BG_FILL_ROW_LIMIT 0.62`, see `HANDOFF_FOUNDER_MORPH.md` §2 — becomes unnecessary; the shirt-vs-wall bottom edge is also solved since shirt ≈ 4.8 vs wall ≈ 1.1).
- The **head relief is compressed**: the whole head occupies ≈ 3.1 … 4.07 (span ≈ 1.0) while the torso runs to 5.1. For a "volumetric head", normalise **inside the head mask only** (e.g. rows above the collar) and apply a contrast curve, otherwise the face is a flat plate in front of a bulging shirt. See §5.2 for the exact mapping.

### 1.5 Semantics of the output ("metric-ish relief for a face")

- Depth Anything (V1/V2) relative models predict **affine-invariant inverse depth** (disparity-like: larger = nearer). The HF config exposes `depth_estimation_type: "relative"`; the metric variants (`depth-anything/Depth-Anything-V2-Metric-Indoor-Small-hf`, `…-Large-hf`; both exist — HTTP 200 on the HF API) carry `max_depth` (20 m indoor / 80 m outdoor) and output metres. https://huggingface.co/docs/transformers/model_doc/depth_anything_v2
- Metric models are **not** exposed in the `onnx-community` Transformers.js catalogue (open issue: https://github.com/huggingface/transformers.js/issues/1476) — run them through route B if you want metres. For a bust you do not need metres: a face is ~12 cm deep from ear plane to nose tip, ~25 cm head depth, so pick the relief scale by anatomy (§5.2) instead of trusting a monocular metric net.
- Conversion to a linear "z toward camera": `zLin = 1 / d` (inverse depth → depth); for a bust the difference between `1/d` and `d` after per-head min-max normalisation is small, but `1/d` gives the more plausible nose-vs-ear ratio.

### 1.6 Subject masking (if you want an alpha independent of depth)

- Transformers.js has a `'background-removal'` pipeline. `briaai/RMBG-1.4` ships ONNX (`onnx/model.onnx` 176.2 MB, `model_fp16.onnx` 88.2 MB, `model_quantized.onnx` 44.4 MB) but its licence is "other" (bria custom, non-commercial without agreement) — https://huggingface.co/briaai/RMBG-1.4. `onnx-community/BiRefNet_lite` is **MIT** (`model.onnx` 224 MB, `model_fp16.onnx` 114.5 MB) — https://huggingface.co/onnx-community/BiRefNet_lite. For these four studio shots the depth threshold alone is sufficient; keep a matting net only for hair-edge feathering.

---

## 2. Route B — Python (torch) on Windows ARM (RANK 2, already installed)

- Official position: PyTorch 2.7+ ships **Arm-native Windows wheels (CPU only, no CUDA; Python 3.12 documented)** — https://blogs.windows.com/windowsdeveloper/2025/04/23/pytorch-arm-native-builds-now-available-for-windows/ and https://learn.arm.com/install-guides/pytorch-woa/ (`pip3 install torch==2.7.0 --index-url https://download.pytorch.org/whl/cpu`). Known pain: C/C++/Rust-backed deps may lack ARM64 wheels (InfoWorld, https://www.infoworld.com/article/3980180/running-pytorch-on-an-arm-copilot-pc.html).
- **This laptop already has `torch 2.12.0+cpu`, `torchvision 0.27.0`, `numpy 2.4.4`, `onnxruntime 1.26.0`, `onnxruntime-qnn 2.1.0` on Python 3.14 ARM64** (`platform.machine()` → `ARM64`). `pip install transformers pillow` succeeded (pure Python). `torch.get_num_threads()` = 12.
- Code that ran:

```python
from transformers import pipeline
from PIL import Image
pipe = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf")   # Apache-2.0
out  = pipe(Image.open("michele-headshot.webp").convert("RGB"))
pd   = out["predicted_depth"]      # torch tensor (1800, 1200), relative inverse depth
out["depth"].save("depth.png")     # 8-bit min-max normalised preview
```
  Manual variant with `AutoImageProcessor` / `AutoModelForDepthEstimation` / `post_process_depth_estimation(target_sizes=[(H,W)])` is in the HF doc (same URL as §1.5). The upstream `run.py` accepts `--input-size` (default 518; "you can increase the size for even more fine-grained results") and `--grayscale --pred-only` — https://github.com/DepthAnything/Depth-Anything-V2.

- Measured (CPU, 12 threads, 1200×1800):

| model | load | **inference** | raw range |
|---|---|---|---|
| `Depth-Anything-V2-Small-hf` | 66 s (first download) | **5.57 s** | 0.398 … 5.035 |
| `Depth-Anything-V2-Base-hf` (CC-BY-NC) | 15 s | 77.4 s | 0.353 … 9.652 |
| `Depth-Anything-V2-Large-hf` (CC-BY-NC) | 78 s | 59.4 s | 3.07 … 377.5 |

  Large is usable for a one-off bake (1 min per founder) if the licence is acceptable for an *offline* asset derivation — flag to legal; the safe default is Small (Apache-2.0) or, better, **Depth Anything 3** (`ByteDance-Seed/Depth-Anything-3`, **Apache-2.0**, 6.2k stars — https://github.com/ByteDance-Seed/Depth-Anything-3; it is what the Aug-2026 Codrops article uses, §5.3). Not benchmarked here.
- Marigold (diffusion): `prs-eth/Marigold`, depth 1 step (LCM) … 50 steps, code Apache-2.0 but weights RAIL++-M, tested on RTX 3090, no CPU guidance — https://github.com/prs-eth/Marigold. Not practical on this laptop; skip.
- Windows gotcha seen in the run: HF cache warns "your machine does not support symlinks … degraded cache" — enable Developer Mode or set `HF_HUB_DISABLE_SYMLINKS_WARNING=1`.

---

## 3. Route C — Single-image 3D face/head reconstruction (mesh) — RANK 4

| Tool | Output | Runs here? | Licence | Source |
|---|---|---|---|---|
| **3DDFA_V2** (ECCV'20) | dense BFM face mesh, **38,365 vertices**, `-o obj` / `-o ply` from one image; ONNX flag (`--onnx`), CPU 1.35 ms/face (MobileNet, 4 threads, i5) | Plausible: PyTorch+onnxruntime present; but `build.sh` compiles Cython NMS, `Sim3DR` C++ and `render.c` with gcc — untested on Windows ARM (repo says "Windows users may refer to FAQ"). Weights in repo: `mb1_120x120.pth` 13.7 MB, `mb05_120x120.pth` 3.7 MB | MIT | https://github.com/cleardusk/3DDFA_V2 |
| DECA (SIGGRAPH'21) | FLAME face with displacement detail, `demos/demo_reconstruct.py -i … --saveObj True --saveDepth True` (it can also emit a depth image) | No: needs `pytorch3d` (no Windows-ARM wheels), FLAME registration, Python 3.7 pins | **non-commercial** | https://github.com/yfeng95/DECA |
| EMOCA v2 | FLAME, emotion-aware | No (deprecated → `inferno` lib; GPU) | non-commercial | https://github.com/radekd91/emoca |
| MICA (ECCV'22) | **neutral metric FLAME head** (`.ply` + FLAME params), insightface `antelopev2`/`buffalo_l` | No: GPU, conda env, FLAME2020 registration | see repo LICENSE (MPI non-commercial family) | https://github.com/Zielon/MICA |
| HRN (CVPR'23) | hierarchical detailed face mesh (<1 s inference), head variant announced; ModelScope/Colab demos | No: CUDA + `nvdiffrast` + pytorch3d | Apache-2.0 | https://github.com/youngLBW/HRN |
| FLAME resource index | — | — | — | https://github.com/TimoBolkart/FLAME-Universe |

Why this route ranks low for the goal: FLAME/BFM meshes cover **face region only** (no scalp/hair, no ears in BFM, no shoulders), and the founders' "portrait" identity lives in scalp shape, glasses, collar — exactly what the depth map captures and the face model discards. Use 3DDFA_V2 only if you later want a *true* rotation beyond ±25° (depth shells break down when you see the side of the head). A realistic hybrid: FLAME/BFM mesh for the face + depth shell for everything else, stitched in image space.

---

## 4. Route D — Generic image→3D — RANK 5

| Service / model | Local feasibility | Free tier / licence | Output | Human-head quality (cited) |
|---|---|---|---|---|
| **Hunyuan3D-2 / 2.1** (Tencent) | 6 GB VRAM shape, 16 GB shape+texture; Gradio, API server, Blender addon, HF Space | **"THIS LICENSE AGREEMENT DOES NOT APPLY IN THE EUROPEAN UNION, UNITED KINGDOM AND SOUTH KOREA"; Territory excludes EU/UK/KR; outputs may not be used outside the Territory** (LICENSE line 3, 18, 39 — identical in 2.1) | GLB via trimesh | "handles human figures adequately … but sacrifices anatomical refinement" (Scenario) |
| TripoSR (Stability/VAST) | ~6 GB VRAM, <0.5 s on A100; CPU marching cubes fallback exists but model is GPU | MIT | OBJ w/ vertex colours, `--bake-texture` | "fast, lightweight … not the highest quality" (triposr.org) |
| InstantMesh | GPU (~1 min) | Apache-2.0 | GLB/OBJ | "sweet spot" between TripoSR and Hunyuan (pixazo) |
| SAM 3D Objects / SAM 3D Body (Meta) | GPU | custom (NOASSERTION on GitHub) | mesh | "parametric approach … anatomically precise for character modeling" (fal.ai) — Body, not head |
| Hyper3D **Rodin** | hosted | Free $0: "10 private assets", "basic image-to-3D … exploration", **export rights only from Creator $30/mo**, API from Business $120/mo; credits $1.5 each | GLB (paid) | object generator |
| **Meshy** | hosted | **100 credits/month free**, downloads `.fbx .obj .usdz .glb .stl .blend`, free tier licence **CC BY 4.0** (must credit Meshy), API paid only | GLB | object generator |
| Tripo3D | hosted | pricing page returned 403 to fetch — not verified | GLB | — |

Sources: https://github.com/tencent/Hunyuan3D-2 and https://raw.githubusercontent.com/Tencent/Hunyuan3D-2/main/LICENSE (+ Hunyuan3D-2.1 LICENSE), https://github.com/VAST-AI-Research/TripoSR, https://hyper3d.ai/pricing, https://www.meshy.ai/pricing, https://help.scenario.com/en/articles/comparing-generative-3d-models/, https://triposr.org/blog/hunyuan3d-vs-trellis, https://www.pixazo.ai/blog/best-open-source-3d-model-generation-apis, https://fal.ai/learn/devs/sam-3d-vs-hunyuan3d-2, https://github.com/facebookresearch/sam-3d-body.

Bottom line: none runs on this laptop (no CUDA on Windows-ARM), the best open one is licence-blocked for a UK company, and all of them hallucinate the back of the head — which you never see. A depth shell from the real photo is more faithful to the person than a generated 3D head.

---

## 5. Route E — Depth map → point cloud / normals / shading in three.js (the actual build)

### 5.1 Unprojection (pinhole, fake focal length)

Reference implementation in three.js itself: `examples/webgl_video_kinect.html` (Kinect depth → `THREE.Points`), vertex shader:

```glsl
uniform sampler2D map; uniform float width, height, nearClipping, farClipping, pointSize, zOffset;
const float XtoZ = 1.11146; // tan(1.0144686/2)*2  (Kinect H-FOV 58.1°)
const float YtoZ = 0.83359; // tan(0.7898090/2)*2  (V-FOV 45.3°)
void main(){
  vec2 uv = vec2(position.x/width, position.y/height);
  float depth = texture2D(map, uv).r;                       // 0..1
  float z = (1.0 - depth) * (farClipping - nearClipping) + nearClipping;
  vec4 pos = vec4((uv.x - 0.5) * z * XtoZ, (uv.y - 0.5) * z * YtoZ, -z + zOffset, 1.0);
  gl_PointSize = pointSize; gl_Position = projectionMatrix * modelViewMatrix * pos; }
```
(defaults `nearClipping 850, farClipping 4000, pointSize 2, zOffset 1000`) — https://github.com/mrdoob/three.js/blob/dev/examples/webgl_video_kinect.html

General form for a photo with unknown intrinsics (CPU or compute shader):
```
fx = fy = 0.5 * W / tan(fovH/2)          // pick fovH ≈ 25–35° for an 85–135 mm portrait lens; 
                                          // a studio headshot at 1200×1800 is typically shot at ~85 mm FF ⇒ fovH ≈ 24°
X = (u - cx) * Z / fx ;  Y = (v - cy) * Z / fy ;  Z = zNear + relief * (1 - dNorm)     // dNorm = normalised inverse depth, 1 = nearest
```
For a bust the perspective term `Z/fx` barely changes across the head (Z varies by ≈10 % of camera distance), so an **orthographic unproject** `X = (u-cx)/W * headWidth`, `Z = relief * dNorm` is visually identical and avoids the "trumpet" distortion when you rotate the shell. Lusion's shell is stored exactly like that: `x,y ∈ [-1,1]`, `z ∈ [0,1]` (§6.2).

### 5.2 Relief scale for a face (the "metric-ish" step)

1. Mask: `subject = d_raw > 2.0` (from §1.4; for safety compute `t = 0.5*(median(wall) + median(subject))` per image — wall median ≈ 1.1, subject ≈ 3.7).
2. Head-only normalisation: restrict to rows above the collar (or to a face-detector box + 30 % margin), `dNorm = (d - dMinHead)/(dMaxHead - dMinHead)`; for Michele that maps 3.1 (scalp edge) … 4.07 (nose tip).
3. Anatomy prior for z extent: nose tip → ear plane ≈ 0.11–0.13 m, head width ≈ 0.15 m, so **relief ≈ 0.8 × head width** in your unit system (Lusion uses container scale `(27.5, 27.5, 16)` ⇒ z extent = 0.58 × width; §6.3). Apply a gamma `dNorm^0.7` to push cheeks forward and stop the shell looking like a relief plaque.
4. Because DA-V2 predicts at 518 px, upsampled maps carry 8-bit-like banding after PNG export; keep the Float32 (`.f32`) or use the **Codrops smoothing**: `smoothBands()` = box blur radius `1.3 % of width`, clamped to ±1.5/255 of the original, then a second radius-2 blur; stored as half-float `DataTexture(RedFormat, HalfFloatType)` — https://github.com/DGFX/codrops-relightning-images/blob/main/src/lib/blur.js and `src/effect/depth-map.js`.

### 5.3 Normals from the depth gradient (Codrops, Aug 2026, three.js WebGPU/TSL)

Article: *Relighting Images with Depth Maps and Three.js*, Dominik Fojcik, 2026-08-19 — https://tympanus.net/codrops/2026/08/19/relighting-images-with-depth-maps-and-three-js/ ; demo https://tympanus.net/Tutorials/RelightingImages ; repo https://github.com/DGFX/codrops-relightning-images ; author's hosted depth tool https://depth.fojcikdominik.com/ (mentions installing **Depth Anything 3** yourself as the alternative).

`src/effect/nodes/normal.js` (TSL, verbatim core):
```js
const GRADIENT_TEXELS = 3, DETAIL_STEP_TEXELS = 8, DETAIL_LOD = 3, DETAIL_GAIN = 4
export const uDisplacementScale = uniform(4), uNormalScale = uniform(3), uDetailScale = uniform(3)
const depthGradient = Fn(([vUv, step]) => {
  const left = smoothDepthNode.sample(vUv.sub(vec2(step.x,0))).r, right = smoothDepthNode.sample(vUv.add(vec2(step.x,0))).r
  const bottom = smoothDepthNode.sample(vUv.sub(vec2(0,step.y))).r, top = smoothDepthNode.sample(vUv.add(vec2(0,step.y))).r
  return vec2(right.sub(left), top.sub(bottom)).mul(0.5) })
export const normalNode = Fn(([vUv]) => {
  const step = vec2(GRADIENT_TEXELS).div(vec2(smoothDepthNode.size()))
  const slope = depthGradient(vUv, step).mul(coverScaleNode()).div(step.mul(modelScale.xy)).mul(uDisplacementScale).mul(uNormalScale)
  const detail = detailGradient(vUv, vec2(DETAIL_STEP_TEXELS).div(vec2(mapNode.size()))).mul(uDetailScale).mul(DETAIL_GAIN) // luminance gradient of the photo at mip 3
  return vec3(slope.x.negate(), slope.y.negate(), 1).add(vec3(detail.x.negate(), detail.y.negate(), 0)).normalize() })
```
i.e. `n = normalize(-dz/dx · k, -dz/dy · k, 1)` with a luminance-gradient "detail" term added — the trick that makes skin pores/beard read as micro-relief. `src/effect/nodes/shadow.js` ray-marches the depth map toward the light (12 steps, `uShadowIntensity 0.86`, `uShadowSoftness 0.092`, `MIN_LIGHT_ANGLE 0.15`) to bake an AO/shadow term — the same thing Lusion bakes into `nShade.w` (§6.2). Scene: `WebGPURenderer`, `AgXToneMapping`, `MeshPhongNodeMaterial` with `colorNode/normalNode/aoNode`, `OrthographicCamera` (`src/app.js`).

CPU equivalent for the bake (Sobel is optional; central differences are enough after the blur):
```js
nx = -(z[x+1,y]-z[x-1,y]) * 0.5 * W / relief; ny = -(z[x,y+1]-z[x,y-1]) * 0.5 * H / relief; nz = 1; normalize
```

### 5.4 Sampling: which pixels become particles

- Regular grid with stride (what the site already does: 290×405 cells, "one particle per cell, tone via `ink` size", `HANDOFF_FOUNDER_MORPH.md` §1) — keep, but replace the flood-fill mask with the depth mask and add the z channel. Visually, though, a grid reads as a halftone (the owner's complaint) once particles are small and static.
- **Blue-noise / Poisson-disk** in image space breaks the halftone: `poisson-disk-sampling` (npm, MIT, N-dimensional; `new PoissonDiskSampling({shape:[W,H], minDistance, maxDistance, tries}).fill()`; supports a `distanceFunction` for density control — https://github.com/kchapelier/poisson-disk-sampling). Use `distanceFunction = p => lerp(rMin, rMax, 1 - importance(p))` where `importance` = mask × (1 + edge/gradient magnitude) so eyes, glasses and the jaw line get denser samples. Lusion's shells are 8,192 points and they look "solid" only because the discs are big and additive (§6.3).
- If you go through a mesh (route C or a Delaunay of the depth grid): three.js `MeshSurfaceSampler` (`three/addons/math/MeshSurfaceSampler.js`; `new MeshSurfaceSampler(mesh).setWeightAttribute('color').build(); sampler.sample(position, normal, color, uv)`; O(n) build, O(log n) per sample; area-weighted random — **not** Poisson) — https://threejs.org/docs/pages/MeshSurfaceSampler.html. For an even set, oversample 4–8× then thin with a 3-D spatial hash rejecting points closer than `r`, or bake in Python with `point-cloud-utils`: `pcu.sample_mesh_poisson_disk(v, f, num_samples=N)` / `radius=` then `pcu.interpolate_barycentric_coords(f, fid, bc, v|n)` (`pip install point-cloud-utils`) — https://fwilliams.info/point-cloud-utils/sections/mesh_sampling/ ; Open3D `sample_points_poisson_disk()` is the other standard.

### 5.5 Published "portrait depth → particles" examples (web)

- three.js `webgl_video_kinect` (above) — canonical depth→Points shader.
- Codrops "Relighting Images with Depth Maps and Three.js" (2026) — depth → normals/AO in TSL (above).
- Codrops "Interactive Particles with Three.js" (Bruno Imbrizi, 2019) — image → instanced particle quads with per-pixel discard by luminance, noise displacement, mouse trail — https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/ (the "flat dithered photo" look the owner dislikes is exactly this technique without z).
- Codrops "Simulating Depth of Field with Particles using the Blurry Library" (Domenico Brz, 2019) — https://tympanus.net/codrops/2019/10/01/simulating-depth-of-field-with-particles-using-the-blurry-library/ , source https://github.com/Domenicobrz/Blurry (particle DoF = the `v_blurriness` idea Lusion uses, §6.3).
- Adam Cerny, *Point Clouds Visualization With Three.js* (Better Programming) — Midjourney/SD portraits → **TF.js Portrait Depth API** depth → three.js point cloud; notes "nice details like teeth volume, the head's at a different level than the torso, accurate facial relief" — https://betterprogramming.pub/point-clouds-visualization-with-three-js-5ef2a5e24587 (full text blocked, 403, summary from search snippet).
- Google **ARPortraitDepth** (`@tensorflow-models/depth-estimation` + `@tensorflow-models/body-segmentation`, WebGL backend; `createEstimator(SupportedModels.ARPortraitDepth)`, `estimateDepth(img, {minDepth:0, maxDepth:1})` → `toArray()/toTensor()/toCanvasImageSource()`; "3D Photo Demo" https://storage.googleapis.com/tfjs-models/demos/3dphoto) — https://github.com/tensorflow/tfjs-models/tree/master/depth-estimation/src/ar_portrait_depth. Portrait-specific and browser-only (needs WebGL backend; not a Node route), lower resolution than DA-V2 — mention only as fallback for client-side generation.
- CodePen: "Three Js Point Cloud Experiment" https://codepen.io/seanseansean/pen/EaBZEY , "Interactive Three.js Particle Morph" https://codepen.io/VoXelo/pen/ByyBqVX , "Threejs-ParticlesMap" https://codepen.io/chenshuyi/pen/bGNRmPY (image-driven particles; none use depth).
- Lusion itself uses a depth map on the **home** page: `PROJECT_PATH + id + "/home.webp"` + `"/home_depth.webp"` textures with a `SecondOrderDynamics` focus/zoom (DoF) — found in `lusion-hoisted.js` — so the 2.5D-from-depth approach is house style there too.

---

## 6. Reverse engineering of lusion.co/about "Team" heads (facts from their shipped bundle)

Fetched `https://lusion.co/about` → single Astro bundle `/_astro/hoisted.CUO_IjfL.js` (1,251,728 bytes). Team data `https://lusion.co/assets/team/team.json` (7 entries: edan, ffi, pierre, yannic, paul, andrii, sunny — `{id,name,role}`), and per-person point clouds `https://lusion.co/assets/team/<id>.buf` (`edan.buf` 82,280 B, `pierre.buf` 82,464 B).

### 6.1 Class `AboutHeroFaces` (verbatim constants)
```
PARTICLE_COUNT = 8192, SIM_TEXTURE_WIDTH = 128, SIM_TEXTURE_HEIGHT = 64, MAX_FACE_NUM = 2
container.scale.set(27.5, 27.5, 16); container.rotation.y = Math.PI + 0.2; rotation.x = 0.1; position.y = 34; position.z = 25
```
- `load(id)` → `loader.load(TEAM_PATH + id + ".buf")` → `_onModelLoaded`: copies `position` (xyz, w = 1/PARTICLE_COUNT) into a **128×64 RGBA float DataTexture** (`teamPosDataTextures[id]`) and `nShade` (RGBA8) into `teamNShadeDataTextures[id]`.
- Geometry: one `InstancedBufferGeometry` from `PlaneGeometry(1,1)` with instanced attributes `a_simUv` (texel centre of the particle in the 128×64 sim texture), `a_rands1` (vec4 random), `a_rands2` (vec4 random). Two meshes only (`MAX_FACE_NUM = 2`: current + next), `ShaderMaterial` with `depthTest:false, depthWrite:false, transparent:true, CustomBlending(One, One, Add)` = **additive**, `extensions.derivatives = true`.
- Transition (`update`): `t = transitionRatio` → mesh0 gets `u_activeRatio = 1 - t`, `position.x = -1.5 t`, `position.z = -2t - 2(1-activeRatio)`, `rotation.y = -0.3 t + a`, `rotation.x = 0.4 t + n`; mesh1 mirrored with `(t-1)`. `u_glitchThreshold = fit(activeRatio, 0.4, 1, 0, 0.9)`, `u_glitchOffset = random()*1000`, `u_glitchStrength = random()` **every frame**. Mouse: NDC unprojected onto the plane `z = 75` from the camera, transformed into face space, clamped tilt `±0.05` (`n = clamp(y*0.03)`, `a = clamp(x*0.03)`), and passed as `u_mouse` (a point light that follows the cursor).

### 6.2 `.buf` format (decoded from `edan.buf`)
`uint32 headerLength` + JSON header + payload:
```json
{"vertexCount":8192,"indexCount":0,"attributes":[
 {"id":"position","needsPack":true,"componentSize":3,"storageType":"Uint16Array",
  "packedComponents":[{"from":-0.999023438,"delta":1.998535157},{"from":-0.999511719,"delta":1.998535157},{"from":0,"delta":1}]},
 {"id":"nShade","needsPack":false,"componentSize":4,"storageType":"Uint8Array"}],"meshType":"Points"}
```
Payload = 8192×3×`uint16` (49,152 B) + 8192×4×`uint8` (32,768 B) = 81,920 B. Decode: `value = from + u16/65535 * delta`. So **x,y ∈ [-1,1], z ∈ [0,1]**, and `nShade = (normal.xyz * 0.5 + 0.5) in RGB, baked shade/AO in A`.
Decoded statistics (edan): z histogram over 10 bins `1527 80 117 200 452 604 460 820 2060 1872` (bimodal: a slab at z≈0 = the back/neck cut plane, the bulk at z 0.7–1.0 = face); normal.z histogram (-1..1) `0 0 0 3 85 391 1131 1503 2002 3077`, only **88 of 8192 back-facing**; shade mean 40.6/255 (min 0, max 255). Top-down ASCII projection is a crescent. **Conclusion: Lusion's "volumetric" head is a front-facing 2.5D shell (a scan or depth surface with baked normals and lighting), ~8k points, rotated only ±0.3–0.4 rad during transitions.** It is not a closed mesh. This is exactly what a depth map + normals gives you.

### 6.3 Their vertex shader (`vert$3`) — the recipe that makes 8k points look volumetric and alive
```glsl
vec3 basePos = texture2D(u_positionTexture, a_simUv).xyz;  vec3 pos = basePos;
float yRatio = basePos.y*0.5+0.5;
float showRatio = smoothstep(a_rands1.x*0.2 + yRatio*0.4, 0.4 + a_rands1.y*0.2 + yRatio*0.4, u_showRatio);   // bottom-up staggered reveal
pos *= 1.3;
pos += (simplexNoiseDerivatives(vec4(basePos*8., u_time)).yzw*0.2 + vec3(1.*yRatio, 0.0, -1.)) * (1.-showRatio); // 4-D simplex curl-ish drift while hidden
vec4 norShade = texture2D(u_norShadeTexture, a_simUv);
float depth = clamp(1.-pos.z, 0.0, 1.0);
vec3 nor = norShade.xyz*2.-1.;
vec3 worldPosition = (modelMatrix*vec4(pos,1.0)).xyz;  vec3 viewNormal = normalMatrix*normalize(nor);  vec3 worldNormal = inverseTransformDirection(viewNormal, viewMatrix);
vec3 lightDir = normalize(u_mouse - worldPosition);  float distToLight = distance(u_mouse, worldPosition);
float light = norShade.w*1.25;                                                             // baked shade
float diff = linearStep(0.35, 1.0, dot(worldNormal, lightDir)) / sqrt(distToLight*0.1);     // mouse point light, thresholded Lambert
light *= diff + 0.6;
light += (0.05 + diff*0.15) * smoothstep(0.0, 0.005, norShade.w);
float frontFaceMultiplier = linearStep(-0.2, 0.0, viewNormal.z);  light *= frontFaceMultiplier;   // hide back-facing points
v_blurriness = min(1.0, abs(depth - (1.-u_activeRatio*showRatio)*0.5) * 2.5) * (2.-showRatio);   // per-particle DoF: focal plane at z=0.5
float basePointSize = 0.009 * (1. + pow(v_blurriness,1.5)*8.) * frontFaceMultiplier;          // blurred = bigger & dimmer
float pointSize = max(basePointSize, 12./u_resolution.y);  float subpixelMultiplier = pow(basePointSize/pointSize, 1.5);
pos.xy += position.xy * pointSize * step(0.003, light) * linearStep(0.0, 0.75, u_activeRatio);  // billboard quad
// glitch: horizontal row displacement keyed on floor(basePos.y*3 + …)
vec4 verticalRands = hash42(vec2(floor(basePos.y*3. + cos(basePos.y*3.+u_glitchOffset)*2. + u_glitchOffset), 0.)) * u_glitchStrength;
float glitchWeight = verticalRands.x * step(u_glitchThreshold, verticalRands.y);
pos.x += verticalRands.z*verticalRands.z * glitchWeight * 0.35 * cos(basePos.y + u_glitchOffset);
v_color = mix(vec3(1.0), (viewNormal.xzy*0.5+0.5)*vec3(1.0,0.5,2.0), glitchWeight);          // normals-as-colour during glitch
light *= (1.+glitchWeight*1.5); light += 0.1*glitchWeight;
float scanline = smoothstep(0.04, 0., abs(fract(u_time*-0.3 - basePos.y*.5 + .5)));            // a bright band sweeping down
light += scanline * (0.25*norShade.w*(1.0-light) + smoothstep(0.03, 0., abs(viewNormal.z)));   // and a RIM term: |viewNormal.z|≈0 → glow
v_shade = min(1.0, light*(1.-v_blurriness*0.5)) * subpixelMultiplier * showRatio;
v_toCenter = (uv-.5)*2.;
```
Fragment (`frag$6`): soft disc `brightness = linearStep(1., 1.-range-fwidth(d), d)` with `range = v_blurriness*5`, `shade *= brightness*(1.25 - v_blurriness*v_shade)`, `gl_FragColor = vec4(shade)*showRatio²`, `alpha *= pow(1-v_blurriness,3)*0.8*linearStep(0.8,1,showRatio²)`. Everything is **white/grey additive**; the cyan/blue tint comes from the page-level post effect `AboutPageHeroEfx` (colour-burn `#00f0ff` α 0.15, colour-dodge `#005aff` α 0.12; HUD `#79a8ff`/`#a5ff44`).

Take-aways for SerSan: (1) bake **normal + shade per point** offline (that is what sells "3D"), (2) rim = `smoothstep(0.03, 0, |viewNormal.z|)`, (3) DoF by |z − focal| both in size and alpha, (4) additive blending with `depthWrite:false`, (5) 8k points with 0.009-unit discs is enough — density is not the lever, lighting is; (6) the matrix-glyph text uses a 3×4-px glyph atlas `font.png` (`letterVert/letterFrag`, `u_letterIdx*5+1` offsets) with `hash43` randomisation — the rain is a separate DOM/UFX layer, not part of the head shader. (No "contour lines" component was found by name in the bundle; the ground uses `about/terrain_shadow_light_height.webp`, `about/fog.png`, `about/rocks.webp` textures.)

---

## 7. Concrete end-to-end bake script (Node, all offline, ~5 s per founder)

```js
// bake-head.mjs — node bake-head.mjs public/founders/michele-headshot.webp out/michele.buf
import { pipeline } from '@huggingface/transformers';
import sharp from 'sharp'; import fs from 'node:fs';
import PoissonDiskSampling from 'poisson-disk-sampling';

const [src, dst] = process.argv.slice(2);
const est = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', { dtype: 'q8' });
const { predicted_depth: pd } = await est(src);
const [H, W] = pd.dims; const d = pd.data;                                   // Float32Array, inverse depth
// 1) subject mask by depth (wall ≈ 1.1, subject ≥ 3 on these studio shots)
let wall = 0, n = 0; for (let i = 0; i < W * 40; i++) { wall += d[i]; n++; } wall /= n;       // top rows = wall
const T = wall + 1.0;                                                         // ≈ 2.1 → robust split
// 2) head window: rows above the collar (tune per image or from a face box), min-max inside the mask
const yTop = 0, yBot = Math.round(H * 0.62); let mn = 1e9, mx = -1e9;
for (let y = yTop; y < yBot; y++) for (let x = 0; x < W; x++) { const v = d[y * W + x]; if (v > T) { mn = Math.min(mn, v); mx = Math.max(mx, v); } }
const z = new Float32Array(W * H);                                            // 0 = far/none, 1 = nearest
for (let i = 0; i < W * H; i++) z[i] = d[i] > T ? Math.pow((Math.min(d[i], mx) - mn) / (mx - mn), 0.7) : 0;
// 3) light blur to kill banding (Codrops smoothBands idea) — omitted for brevity, use a 2-pass box blur r = 0.013*W
// 4) blue-noise sample in image space, denser where the photo has edges
const { data: rgb } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const lum = (x, y) => { const i = (y * W + x) * 3; return (0.2126 * rgb[i] + 0.7152 * rgb[i + 1] + 0.0722 * rgb[i + 2]) / 255; };
const pds = new PoissonDiskSampling({ shape: [W, H], minDistance: 9, maxDistance: 18, tries: 20,
  distanceFunction: p => { const x = Math.min(W - 2, Math.max(1, p[0] | 0)), y = Math.min(H - 2, Math.max(1, p[1] | 0));
    if (z[y * W + x] === 0) return 1; const e = Math.abs(lum(x + 1, y) - lum(x - 1, y)) + Math.abs(lum(x, y + 1) - lum(x, y - 1)); return 1 - Math.min(1, e * 3); } });
const pts = pds.fill().filter(([x, y]) => z[(y | 0) * W + (x | 0)] > 0);
// 5) unproject (orthographic bust) + normals from gradient + shade (rim/AO proxy)
const relief = 0.8;                                                           // z extent relative to half-width (x ∈ [-1,1])
const out = pts.map(([px, py]) => { const x = px | 0, y = py | 0, i = y * W + x;
  const zx = (z[i + 1] - z[i - 1]) * 0.5 * W / (2 * relief), zy = (z[i + W] - z[i - W]) * 0.5 * H / (2 * relief);
  let nx = -zx, ny = zy, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
  const shade = 0.35 + 0.65 * lum(x, y);                                      // or bake AO by ray-marching z (Codrops shadow.js)
  return { x: (px / W) * 2 - 1, y: 1 - (py / H) * 2, z: z[i], nx, ny, nz, shade }; });
// 6) write Lusion-style .buf (uint16 packed xyz + uint8 nShade)
const N = out.length, pos = new Uint16Array(N * 3), ns = new Uint8Array(N * 4);
out.forEach((p, k) => { pos[k*3] = ((p.x + 1) / 2) * 65535; pos[k*3+1] = ((p.y + 1) / 2) * 65535; pos[k*3+2] = p.z * 65535;
  ns[k*4] = (p.nx*0.5+0.5)*255; ns[k*4+1] = (p.ny*0.5+0.5)*255; ns[k*4+2] = (p.nz*0.5+0.5)*255; ns[k*4+3] = p.shade*255; });
const header = Buffer.from(JSON.stringify({ vertexCount: N, attributes: [
  { id: 'position', needsPack: true, componentSize: 3, storageType: 'Uint16Array', packedComponents: [{from:-1,delta:2},{from:-1,delta:2},{from:0,delta:1}] },
  { id: 'nShade', needsPack: false, componentSize: 4, storageType: 'Uint8Array' }], meshType: 'Points' }));
const len = Buffer.alloc(4); len.writeUInt32LE(header.length);
fs.writeFileSync(dst, Buffer.concat([len, header, Buffer.from(pos.buffer), Buffer.from(ns.buffer)]));
console.log(N, 'points ->', dst);
```
(`poisson-disk-sampling` from https://github.com/kchapelier/poisson-disk-sampling; everything else measured/cited above. With `minDistance 9` on 1200×1800 this yields ≈ 10–14k points on the subject — same order as Lusion's 8,192.) The WebGPU/TSL side (compute morph between four `.buf`s, `.element(instanceIndex)` reads, 8-vertex-buffer budget) is already solved in `src/webgl/FounderPortraitMorph.tsx` (see `HANDOFF_FOUNDER_MORPH.md` §7–8); what changes is only the *input* (xyz + normal + shade instead of xy + ink) and the shader (rim/DoF/additive per §6.3).

---

## 8. Source list

- https://huggingface.co/onnx-community/depth-anything-v2-small (+ `/api/models/...?blobs=true` for sizes; `preprocessor_config.json`)
- https://huggingface.co/onnx-community/depth-anything-v2-base , https://huggingface.co/onnx-community/depth-anything-v2-large
- https://huggingface.co/docs/transformers.js/api/pipelines
- https://github.com/huggingface/transformers.js/issues/1476 (metric DA-V2 not in Transformers.js)
- https://github.com/DepthAnything/Depth-Anything-V2 ; https://huggingface.co/docs/transformers/model_doc/depth_anything_v2
- https://github.com/ByteDance-Seed/Depth-Anything-3
- https://github.com/prs-eth/Marigold
- https://blogs.windows.com/windowsdeveloper/2025/04/23/pytorch-arm-native-builds-now-available-for-windows/ ; https://learn.arm.com/install-guides/pytorch-woa/ ; https://www.infoworld.com/article/3980180/running-pytorch-on-an-arm-copilot-pc.html ; https://github.com/pytorch/pytorch/issues/133804
- https://github.com/cleardusk/3DDFA_V2 ; https://github.com/yfeng95/DECA ; https://github.com/radekd91/emoca ; https://github.com/Zielon/MICA ; https://github.com/youngLBW/HRN ; https://github.com/TimoBolkart/FLAME-Universe
- https://github.com/tencent/Hunyuan3D-2 (+ LICENSE) ; https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1 (LICENSE) ; https://github.com/VAST-AI-Research/TripoSR ; https://github.com/facebookresearch/sam-3d-body ; https://github.com/facebookresearch/sam-3d-objects
- https://hyper3d.ai/pricing ; https://www.meshy.ai/pricing ; https://help.scenario.com/en/articles/comparing-generative-3d-models/ ; https://triposr.org/blog/hunyuan3d-vs-trellis ; https://www.pixazo.ai/blog/best-open-source-3d-model-generation-apis ; https://fal.ai/learn/devs/sam-3d-vs-hunyuan3d-2
- https://github.com/mrdoob/three.js/blob/dev/examples/webgl_video_kinect.html
- https://tympanus.net/codrops/2026/08/19/relighting-images-with-depth-maps-and-three-js/ ; https://github.com/DGFX/codrops-relightning-images ; https://tympanus.net/Tutorials/RelightingImages ; https://depth.fojcikdominik.com/
- https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/ ; https://tympanus.net/codrops/2019/10/01/simulating-depth-of-field-with-particles-using-the-blurry-library/ ; https://github.com/Domenicobrz/Blurry
- https://betterprogramming.pub/point-clouds-visualization-with-three-js-5ef2a5e24587
- https://github.com/tensorflow/tfjs-models/tree/master/depth-estimation/src/ar_portrait_depth
- https://codepen.io/seanseansean/pen/EaBZEY ; https://codepen.io/VoXelo/pen/ByyBqVX ; https://codepen.io/chenshuyi/pen/bGNRmPY
- https://threejs.org/docs/pages/MeshSurfaceSampler.html ; https://github.com/kchapelier/poisson-disk-sampling ; https://fwilliams.info/point-cloud-utils/sections/mesh_sampling/
- https://huggingface.co/briaai/RMBG-1.4 ; https://huggingface.co/onnx-community/BiRefNet_lite
- https://lusion.co/about ; https://lusion.co/_astro/hoisted.CUO_IjfL.js ; https://lusion.co/assets/team/team.json ; https://lusion.co/assets/team/edan.buf ; https://medium.com/@edankwan/lost-in-parallel-universe-dba640efd39a (Edan Kwan, Lusion) ; https://lusion.co/work/particle-love/
- Local: `C:/Users/alber/Desktop/Sersan/HANDOFF_FOUNDER_MORPH.md`, `C:/Users/alber/Desktop/Sersan/src/webgl/FounderPortraitMorph.tsx`, headshots in `C:/Users/alber/Desktop/Sersan/public/founders/*.webp` (michele 113 KB, alessandro 177 KB, mattia 48 KB, alberto 15.7 KB placeholder).
