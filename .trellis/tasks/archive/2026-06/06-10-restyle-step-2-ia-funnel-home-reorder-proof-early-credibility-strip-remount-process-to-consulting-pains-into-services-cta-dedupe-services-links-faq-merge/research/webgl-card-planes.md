# Research: WebGL card planes for the home case-studies horizontal rail

- **Query**: DOM-synced card planes in the persistent R3F canvas (TSL node materials, velocity bend + scan hover) for the home case-studies rail
- **Scope**: mixed (internal architecture + 3 external repos)
- **Date**: 2026-06-11

---

## 1. Internal architecture facts (verified in repo)

### 1.1 The canvas, camera and units mapping

| Fact | Source |
|---|---|
| ONE persistent canvas, fixed full-viewport, `z-0`, `pointer-events:none`, `aria-hidden`; DOM content wrapper at `z-[1]` ABOVE it | `src/webgl/CanvasHost.tsx:35`, `src/app/layout.tsx:205-207` |
| Camera is **perspective**: `fov 50, position [0,0,12], near 0.1, far 200` | `src/webgl/Scene.tsx:211`, `src/webgl/constants.ts:4-5` |
| World↔px mapping constant: `WORLD_VIEW_HEIGHT = 2*tan(fov/2)*CAMERA_Z ≈ 11.19` world units = viewport height **at z=0 only**. `k = WORLD_VIEW_HEIGHT / size.height` = world units per CSS px. NEVER derive from `useThree().viewport` (camera travels) | `src/webgl/constants.ts:7-15`, `SignatureLine.tsx:157` |
| **The camera glides down a world strip**: `camera.position.y = -(scrollYpx + innerHeight/2) * k` per frame (damped progress). A document pixel at docY maps to world `y = -docY * k`; a CSS x maps to world `x = (cssX - size.width/2) * k` | `src/webgl/SignatureLine.tsx:301-307` |
| `SignatureLine`'s `useFrame` is the **single camera authority** (position.y + lookAt-ahead tilt + descent beat). Nothing else may write the camera | `SignatureLine.tsx:355-430` |
| At full tier the camera also gets a small **lookAt-ahead yaw/pitch** (`lookTiltScale: 0.2`, `lookAhead: 0.05`) and a **descent beat** (`camTilt`/`camDescend` from textMorphStore, home cinematic spine only) — both shift where world-anchored objects land on screen by a few px | `SignatureLine.tsx:366-430`, `fxStore.ts:222-223` |
| Scroll state: `useScrollStore.getState()` per-frame (`progress` 0..1, `velocity` = Lenis px/frame-ish, `reveal`, `anchorPulse`). Reading via `getState()` in `useFrame` — never reactive in hot path | `src/webgl/store/scrollStore.ts` |
| ONE rAF: R3F's loop (FrameDriver priority-0 pumps Lenis + pointer). Never add a second rAF | `src/webgl/FrameDriver.tsx:50-53` |
| Tier system: `full` (desktop fine-pointer ≥768px) / `lite` (coarse pointer or <768px — no postprocessing) / `off` (reduced-motion or no WebGL — **no canvas at all**, DOM-only site) | `src/webgl/store/tierStore.ts:28-43` |
| DPR: `dpr={tier === "full" ? [1, 2] : [1, 1.5]}` on the Canvas | `Scene.tsx:210` |
| Renderer: build-time flag `NEXT_PUBLIC_WEBGPU`. ON → `WebGPURenderer` (async init, auto WebGL2 fallback, `forceWebGL` retry). OFF → classic WebGLRenderer + raw-GLSL materials. Repo components ship **dual materials** (GLSL ShaderMaterial + lazy TSL twin) selected by `webgpuEnabled()` | `src/webgl/renderer/createRenderer.ts`, `SignatureLine.tsx:98-134`, `DriftParticles.tsx:73-118` |
| `three/webgpu` + `three/tsl` must only be imported **lazily on the ON path** (dual-namespace pitfall — never let `three` and `three/webgpu` land in one bundle) | headers of `lineNodeMaterial.ts`, `createRenderer.ts` |
| Selective bloom = **luminance threshold ≈ 1.0** ("approach A"): materials that should bloom output color × emissive **> 1.0** with `toneMapped:false`; everything ≤ 1.0 never blooms. Home: `bloomIntensity 1.1 / threshold 1.0 / radius 0.7` | `PostFXNodes.tsx:39-50, 270-282`, `routeFxStore.ts HOME_FX`, `lineNodeMaterial.ts:165-171` |
| Postprocessing mounts at `tier === "full"` only; `PostFXNodes` drives `post.render()` from `useFrame(..., 1)` which suppresses R3F's default scene render | `Scene.tsx:253-258`, `PostFXNodes.tsx:359-393` |

### 1.2 Existing per-route mount pattern (what RailPlanes should copy)

`Scene.tsx` gates per-route objects with a pathname check inside the persistent canvas (`RouteRitual`, `Scene.tsx:118-172`): home-only components are mounted under `if (pathname === "/")`. `DriftParticles` is the canonical "world-strip + tier + anchors" consumer; `useSectionAnchors` (`src/webgl/hooks/useSectionAnchors.ts`) is the canonical DOM-measure pattern: measure on mount, debounced resize (150ms), `document.fonts.ready`, two delayed passes (700/1600ms), version-bumped state so consumers rebuild only when rects actually moved.

### 1.3 Existing hover/pointer plumbing

- `pointerStore.ts`: window-level raw pointer → smoothed + velocity in `updatePointer(dt)` from FrameDriver. Gated off on coarse pointer / reduced motion.
- `components/fx/card-image-distort.tsx` is the **existing DOM-card hover → shader uniform precedent**: `pointerenter`/`pointerout`/`pointermove` listeners on the card element, eased `hover` 0→1 per frame, velocity capped, pointer in card-space 0..1. (It uses its own throwaway WebGL2 context — the new rail planes instead live in the main canvas, but the event/easing shape carries over.)
- DOM-synced existing rail-ish DOM: home case-studies section is currently a **grid** (`src/components/sections/case-studies-section.tsx`) — 3 featured + 10 archive cards (13 case studies total in `src/data/case-studies.ts`; "14 planes" in the task assumes the restyled rail's card count). No `[data-rail-card]` attribute exists yet anywhere in `src/` — it must be added by the rail implementation.

### 1.4 Z occupancy of existing scene objects (for layering)

- `DriftParticles`: instanced quads at `z ∈ [-4, +2]` random, across the whole world strip (`DriftParticles.tsx:161`).
- `SignatureLine`: tube at waypoint `z` (default 0), **`depthTest:false, depthWrite:false`, additive** — it draws over anything regardless of depth (`lineNodeMaterial.ts:165-168`).
- HeroLogo rest depth `heroPosZ: -0.3` (home hero only, top of page).

---

## 2. External reference findings

### 2.1 Faure / Codrops GLMedia — DOM rect → plane sync math

Repo: `davidfaure/horizontal-parallax-gallery-codrops` (branch `master`), `src/gallery/GLMedia.ts` + `src/shaders/mediaFragment.glsl`. OGL-style vanilla three; we port the ideas only.

Key math (their camera: fov chosen so **1 world unit = 1 CSS px** — `fov = 2*atan(h/2/100)` with camera at z=100):

```ts
// GLMedia.updateScale() — measure ONCE (constructor/resize), not per frame:
this.bounds = this.element.getBoundingClientRect();
this.mesh.scale.set(this.bounds.width, this.bounds.height, 1);

// GLMedia.updatePosition(scroll) — per frame, pure arithmetic from cached rect:
const x = this.bounds.left - scroll - this.viewport.width / 2 + this.bounds.width / 2;
const y = -this.bounds.top + this.viewport.height / 2 - this.bounds.height / 2;
this.mesh.position.set(x, y, 0);
```

i.e. **cache the rect at a known scroll position; per frame, offset by the live scroll value**. The only per-frame inputs are the cached bounds + the rail's translation — exactly the "NOT getBoundingClientRect per frame" contract the task asks for.

Their parallax: per-frame distance of card center from viewport center, normalized to −1..1, scaled (0.4) into a `uParallax` uniform; fragment shifts the cover-fitted UV by it, with `uUvScale 0.85` shrinking the texture so the parallax has bleed room:

```glsl
vec2 coverUv(vec2 uv, vec2 resolution, vec2 imageResolution) {
  vec2 ratio = vec2(
    min((resolution.x/resolution.y)/(imageResolution.x/imageResolution.y), 1.0),
    min((resolution.y/resolution.x)/(imageResolution.y/imageResolution.x), 1.0));
  return vec2(uv.x*ratio.x + (1.0-ratio.x)*0.5, uv.y*ratio.y + (1.0-ratio.y)*0.5);
}
// main: uv = coverUv(...); uv.x += uParallax; uv = (uv-0.5)*uUvScale + 0.5;
```

`coverUv` is the upgrade path for when product imagery arrives (it IS `object-fit: cover` in shader form).

### 2.2 colindmg/r3f-experimental-carousel — velocity bend

Repo: `colindmg/r3f-experimental-carousel` (branch `main`). R3F + Lenis. Velocity is fed straight from `useLenis(({ velocity }) => ...)` into both mesh X and a `uScrollSpeed` uniform (`src/components/Carousel.tsx`):

```ts
ref.position.x += velocity * 0.005 * wheelFactor * wheelDirection;
ref.material.uniforms.uScrollSpeed.value = -velocity * 0.005 * wheelFactor * wheelDirection;
```

The bend itself (`src/shaders/horizontal-image/vertex.glsl`) — **plane bows toward motion**, max at the plane's vertical middle, zero at edges, via a sine over the UV:

```glsl
// X displacement according to scroll speed — the "wavy card" bend:
float xDisplacement = -sin(uv.y * PI) * uScrollSpeed;
pos.x += xDisplacement;

// optional global arc from world position (we likely skip this):
pos.y += uCurveStrength * cos(worldPosition.x * uCurveFrequency);
```

Notes: plane geometry needs subdivisions for the bend (`PlaneGeometry(1,1,16,16)`); for a **horizontal** rail the bend displaces along X driven by `sin(uv.y * PI)` (bow across the card's height, in the direction of motion). Their uniform is raw and instantaneous; in our codebase the velocity should be smoothed per-frame (damp, like `pointerStore.updatePointer`) before writing the uniform, or the bend jitters with Lenis's per-frame velocity.

### 2.3 d3adrabbit/ScanningEffectWithDepthMap — TSL scan sweep on WebGPURenderer

Repo: `d3adrabbit/ScanningEffectWithDepthMap` (branch `main`), Next + R3F + `three/webgpu` + TSL, same renderer generation as ours. Core of `app/effect1/page.tsx`:

```ts
const uProgress = uniform(0);                       // scan position 0..1
const tDepthMap = texture(depthMap);
// dotted grid: tile uv, distance field per cell, cell-noise brightness
const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);
const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2));
const dot = float(smoothstep(0.5, 0.49, tiledUv.length())).mul(brightness);
// THE SCAN: a thin band where |depth - uProgress| < 0.02
const flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))));
// HDR mask: × vec3(10,0,0) pushes it far above bloom threshold → bloom catches it
const mask = dot.mul(flow).mul(vec3(10, 0, 0));
const final = blendScreen(tMap, mask);
const material = new THREE.MeshBasicNodeMaterial({ colorNode: final });
```

- The scan driver is just a `uniform(0)` tweened externally (they use GSAP repeat; ours = hover-eased value from the store).
- **The "depth" input is only a scalar field that orders the sweep.** With no imagery/depthmap, ANY procedural scalar field works as the sweep coordinate — e.g. `uv().x`, or a noise-warped diagonal — which is exactly the no-image adaptation we need (§4.3).
- Their post is the same `bloom(scenePassColor, strength, 0.5, threshold=1)` + `scenePassColor.add(bloomPass)` shape as our `PostFXNodes` — confirms the `>1.0 → bloom` contract transfers 1:1.
- Their per-frame render is `render.renderAsync()` at `useFrame(...,1)`; ours uses `post.render()` — ours stays.

---

## 3. Proposed component architecture (fits OUR canvas)

### 3.1 Mount point

```tsx
// Scene.tsx — inside the Canvas, alongside DriftParticles/RouteRitual:
{pathname === "/" && tier === "full" && (
  <Suspense fallback={null}>
    <RailPlanes anchors={anchors} />
  </Suspense>
)}
```

- Gate: `pathname === '/'` **and** `tier === 'full'` (task decision: lite = DOM-only rail, no planes). `off` never mounts the canvas at all, so DOM-only is automatic there.
- File: `src/webgl/RailPlanes.tsx` + `src/webgl/materials/railPlaneNodeMaterial.ts` (mirroring the `SignatureLine` / `lineNodeMaterial` split). If the flag-OFF GLSL twin is required (repo convention), `railPlaneShader.ts` is the GLSL sibling; if the rail ships TSL-only, it must no-op (`return null`) when `!webgpuEnabled()` so the OFF bundle never imports `three/tsl`.

### 3.2 DOM contract

The DOM rail (in `case-studies-section` or its restyled successor) provides:

```html
<div data-rail-track>            <!-- the element whose translateX moves -->
  <article data-rail-card="spherenode"> … </article>
  …
</div>
```

and the rail driver (GSAP ScrollTrigger pin or plain scroll-mapped transform) publishes its progress into a small transient store instead of letting WebGL read styles:

```ts
// src/webgl/store/railStore.ts — same shape discipline as pointerStore/scrollStore
interface RailState {
  /** Rail translateX in CSS px (positive = content moved left). */
  trackX: number;
  /** Smoothed d(trackX)/dt in px/s — written per-frame in the consumer loop. */
  trackVel: number;
  /** Per-card hover targets keyed by data-rail-card id (0 or 1). */
  hoverTarget: Record<string, number>;
  /** Bump to re-measure rects (rail layout changed). */
  measureVersion: number;
  setTrackX: (x: number) => void;
  setHover: (id: string, v: number) => void;
  bumpMeasure: () => void;
}
```

Whoever animates the rail (DOM side) calls `setTrackX(currentTranslateX)` from its own update callback (GSAP `onUpdate` / the scroll handler — no extra rAF). WebGL never touches `getComputedStyle`.

### 3.3 Rect tracking — measure rarely, interpolate per frame

Mirror `useSectionAnchors` + GLMedia:

```ts
// In RailPlanes — measure pass (mount, debounced resize, fonts.ready, measureVersion):
interface CardRect { id: string; baseDocX: number; docY: number; w: number; h: number }

function measureCards(trackXAtMeasure: number): CardRect[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-rail-card]")).map(el => {
    const r = el.getBoundingClientRect();
    return {
      id: el.dataset.railCard!,
      // UN-translate: store the card's x as if the rail were at trackX = 0
      baseDocX: r.left + window.scrollX /* ==0 for X */ + trackXAtMeasure,
      docY: r.top + window.scrollY,
      w: r.width, h: r.height,
    };
  });
}
```

Per frame (inside the component's `useFrame`, priority 0 — the camera writer in SignatureLine also runs at 0; plane placement only READS the scroll store, not the camera, so ordering doesn't matter):

```ts
const k = WORLD_VIEW_HEIGHT / size.height;            // world units per CSS px
const { trackX } = useRailStore.getState();
for (const c of rects) {
  const cssX = c.baseDocX - trackX;                   // live viewport-x of card left edge
  const mesh = meshById.get(c.id)!;
  mesh.position.x = (cssX + c.w / 2 - size.width / 2) * k;
  mesh.position.y = -(c.docY + c.h / 2) * k;          // world-strip Y (doc px → world)
  mesh.position.z = RAIL_Z;                            // see §6.4
  mesh.scale.set(c.w * k, c.h * k, 1);
}
```

- X interpolation cost: pure arithmetic, no layout reads — the GLMedia pattern exactly.
- Y never changes per frame (rail moves horizontally; vertical motion is the camera's job — the camera already tracks document scroll, so a world-anchored plane stays glued to its section like the SignatureLine waypoints do).
- If the rail section is **pinned** (GSAP pin-spacer), `docY` is the pinned element's document Y — re-measure after ScrollTrigger refresh (the `useSectionAnchors` 700/1600ms delayed passes exist precisely for pin-spacer settling; reuse the same timings or listen to `ScrollTrigger.refresh`).

### 3.4 How planes layer vs DOM

The canvas is **behind** all DOM (`z-0` vs `z-[1]`). Therefore:

- The plane can only show through where the DOM card is **transparent**. The restyled rail card must have a transparent (or heavily translucent) background — the current `card-steel` surface would hide the plane completely. Text/chips/metrics stay DOM-crisp on top; the plane is the card's "backdrop paint".
- A DOM readability scrim (navy gradient, like `card-image-distort__scrim`) can sit between plane and text if the scan sweep fights legibility.
- Borders/rounding: the plane is a sharp rectangle; either keep the DOM card's border/rounding as the visible frame (plane slightly inset), or fade plane edges in the shader (GLMedia-style `smoothstep` edge feather — see `card-image-distort.tsx FRAG` lines 91-93 for the in-repo version).

---

## 4. TSL material sketch (`railPlaneNodeMaterial.ts`)

All names verified against the installed-build list in `lineNodeMaterial.ts:32-34` (`Fn, uniform, uv, positionLocal, sin, abs, pow, mix, smoothstep, fwidth, float, vec3, oneMinus, time` present) plus `fract/dot/vec2/vec4` verified in `PostFXNodes.tsx:204-236`. `mx_cell_noise_float / mx_noise_float` exist in `three/tsl` (used by the scan repo on the same renderer generation; MaterialX nodes are pure-TSL so they compile to both WGSL and GLSL2 — but see §6.3).

```ts
import { Color, MeshBasicNodeMaterial, NormalBlending } from "three/webgpu";
import {
  Fn, uniform, uv, positionLocal, sin, fract, dot, mix, smoothstep,
  float, vec2, vec3, abs, oneMinus, time,
} from "three/tsl";

export type RailPlaneUniforms = {
  uHover:    { value: number };  // eased 0..1, per card
  uVelocity: { value: number };  // smoothed rail px/s * scale, signed
  uSeed:     { value: number };  // per-card 0..1 — varies the backdrop
  uReveal:   { value: number };  // route-transition fade (scrollStore.reveal)
  uColorA:   { value: Color };   // #3BE1FF
  uColorB:   { value: Color };   // #7C5CFF
  uBase:     { value: Color };   // #0B1422 navy
  uScanEmissive: { value: number }; // >1 HDR, e.g. 2.4 (bloom threshold is 1.0)
  uBendAmp:  { value: number };  // world units per unit velocity, tiny (~0.0015)
};

export function createRailPlaneMaterial() {
  const uHover = uniform(0);
  const uVelocity = uniform(0);
  const uSeed = uniform(0);
  const uReveal = uniform(1);
  const uColorA = uniform(new Color("#3BE1FF"));
  const uColorB = uniform(new Color("#7C5CFF"));
  const uBase = uniform(new Color("#0B1422"));
  const uScanEmissive = uniform(2.4);
  const uBendAmp = uniform(0.0015);

  const material = new MeshBasicNodeMaterial();

  // ---- VERTEX: velocity bend (carousel ref §2.2, ported to TSL) ----------
  // Plane is a unit plane scaled to card size, so positionLocal.xy ∈ [-0.5,0.5].
  // Bow along X (direction of motion), max at vertical mid, 0 at top/bottom.
  // NOTE: needs PlaneGeometry(1,1,8,16)-ish subdivisions or the bend is invisible.
  material.positionNode = Fn(() => {
    const bow = sin(uv().y.mul(Math.PI));            // 0 at edges, 1 mid
    const bend = uVelocity.mul(uBendAmp).mul(bow);   // signed → bows toward motion
    return positionLocal.add(vec3(bend, 0, 0));
  })();

  // ---- FRAGMENT ------------------------------------------------------------
  const u = uv();

  // (a) Procedural backdrop: vertical navy gradient + faint diagonal signal tint,
  //     per-card seeded; plus the cheap hash grain already proven in PostFXNodes.
  const grad = mix(uBase, mix(uColorA, uColorB, u.x.add(uSeed).fract()),
                   float(0.10).mul(smoothstep(0.0, 1.0, u.y))); // ≤10% tint: stays ≪ 1.0
  const seedUv = u.mul(120.0).add(uSeed.mul(31.7));
  const noise = fract(sin(dot(seedUv, vec2(12.9898, 78.233))).mul(43758.5453));
  const backdrop = grad.add(noise.sub(0.5).mul(0.03)); // ±0.015 grain, sub-threshold

  // (b) Scan sweep coordinate: with NO imagery, replace the depth map with a
  //     procedural scalar field (scan ref §2.3 — depth is just an ordering field):
  //     a noise-warped diagonal so the line reads "scanned", not "wiped".
  const warp = sin(u.y.mul(9.0).add(uSeed.mul(40.0))).mul(0.04);
  const field = u.x.mul(0.8).add(u.y.mul(0.2)).add(warp); // ~0..1 diagonal field

  // Hover drives the sweep across the field; widen slightly while moving.
  const scanPos = mix(float(-0.15), float(1.15), uHover); // overshoot so it fully exits
  const band = oneMinus(smoothstep(0.0, 0.025, abs(field.sub(scanPos))));

  // Scan color: cyan→violet along the line, HDR (>1) so selective bloom catches it.
  const scanCol = mix(uColorA, uColorB, u.y).mul(uScanEmissive).mul(band);

  // Trailing glow behind the line (subtle, sub-threshold):
  const trail = smoothstep(0.0, 0.35, scanPos.sub(field))
    .mul(oneMinus(smoothstep(0.0, 0.5, scanPos.sub(field))))
    .mul(0.12);

  const col = backdrop.add(mix(uColorA, uColorB, u.y).mul(trail)).add(scanCol);

  // Alpha: card backdrop is mostly opaque over the page navy; edge feather optional.
  material.colorNode = vec3(col);
  material.opacityNode = uReveal.mul(0.92);

  material.transparent = true;
  material.depthWrite = false;       // never occlude line/particles (see §6.4)
  material.blending = NormalBlending; // NOT additive — it's a surface, not a glow
  material.toneMapped = false;        // keep >1.0 scan values intact for bloom

  return { material, uniforms: { uHover, uVelocity, uSeed, uReveal, uColorA, uColorB, uBase, uScanEmissive, uBendAmp } };
}
```

Upgrade path to imagery: swap `(a)` for `texture(map, coverUv(...))` (port `coverUv` from §2.1 to TSL — pure math, 6 lines) and keep `(b)` unchanged, optionally replacing `field` with a real depth-map sample like the scan repo (`texture(depthMap).r`). The scan/bend/hover plumbing does not change.

Note on `time`: the sketch above is hover/velocity-driven only (no idle animation) — at rest the planes are static pixels, which keeps the idle GPU cost ≈ 0 and respects the sober brand. If an idle shimmer is wanted, `time` is available and already imported by `lineNodeMaterial`.

---

## 5. Hover state flow

Mirrors `card-image-distort.tsx` (events) + `pointerStore` (store discipline) + `SignatureLine` (per-frame damp):

1. **DOM**: the rail card component attaches `pointerenter` / `pointerleave` (or `pointerout` with `relatedTarget` containment check, see `card-image-distort.tsx:370-377`) and writes the binary target: `useRailStore.getState().setHover(id, 1 | 0)`. Listener gating: only attach on fine pointers without reduced motion (same gate as `installPointerTracking`, `pointerStore.ts:113-118`) — on coarse pointers the scan never arms (matches "reduced-motion = no bend/scan"; coarse pointers are `lite` anyway and the planes don't mount).
2. **Store**: `hoverTarget: Record<string, number>` — targets only, no eased values (store stays render-loop-agnostic, same rule as `anchorPulse`, `scrollStore.ts:25-31`).
3. **Frame loop** (RailPlanes `useFrame`): per card, `eased = THREE.MathUtils.damp(eased, target, ~6, delta)` kept in a ref `Map`, then `uniforms.uHover.value = eased`. One-directional sweep variant: on a 0→1 target edge, run the scan 0→1 once over ~700ms and ease back opacity rather than reversing the sweep (decide at implementation; both are just different mappings of the eased value).
4. **Velocity**: in the same `useFrame`, derive `trackVel` from `trackX` deltas (`(x - prevX)/dt`, low-pass like `pointerStore.updatePointer`), write the smoothed signed value into each material's `uVelocity` (one shared value — all cards bend together, which is physically right for a rigid rail). Clamp (e.g. ±600 px/s equivalent) so a scroll-jump never folds the planes.

---

## 6. Perf budget + pitfalls in OUR architecture

### 6.1 14 planes: per-mesh vs instancing

- **Per-mesh is fine at n=14.** 14 draw calls of a `PlaneGeometry(1,1,8,16)` (≈ 256 tris each) is negligible. The real cost question for node materials is **programs**: 14 separate `createRailPlaneMaterial()` instances share an identical node-graph structure → identical generated WGSL/GLSL → three's program cache compiles **one** program; each material keeps its own (tiny) uniform buffer. So: 14 draw calls, 1 program, 14 uniform groups. This is the simplest correct shape and the repo has no instanced-per-entity-uniform precedent to copy.
- Instanced alternative (1 draw call): one `InstancedBufferGeometry` plane with per-instance `aRect (vec4: x,y,w,h)`, `aSeed`, `aHover` attributes, `aHover` rewritten per frame (14 floats — trivial buffer upload), DriftParticles-style (`DriftParticles.tsx:166-179` + "plain `<mesh>` with InstancedBufferGeometry" note at line 221-227). Only worth it if the rail grows (50+ cards) — costs more code (rect math moves into the vertex stage, hover becomes an attribute, TSL needs `instanceIndex`/instanced-attribute nodes).
- **Recommendation to document**: per-mesh meshes in a single `<group>`, shared geometry (one `useMemo` PlaneGeometry, passed to all meshes — the carousel ref does exactly this), per-mesh material instance.

### 6.2 Tier / reduced-motion matrix

| Tier | Behavior |
|---|---|
| `full` | planes + bend + scan (postprocessing/bloom available) |
| `lite` | **no planes** — component not mounted (`tier === "full"` gate); DOM rail unchanged and complete |
| `off` | no canvas at all (reduced motion / no WebGL); DOM rail is the whole experience |
| reduced-motion specifically | always resolves to `off` (`tierStore.detectTier`, line 30-32) → no bend/scan by construction; no extra check needed in the WebGL layer. The DOM hover listeners should still gate on the media queries for safety if they're attached outside tier logic |

### 6.3 WebGL2-fallback TSL feature gaps (flag ON, `forceWebGL` / no `navigator.gpu`)

- Everything in the §4 sketch is **plain math + uniforms + uv/positionLocal** — the exact node set `lineNodeMaterial.ts` already ships, which is the in-repo proof it compiles on BOTH backends of `WebGPURenderer` ("TSL NodeMaterials compile to WGSL (and to GLSL on a WebGL2 backend)", `lineNodeMaterial.ts:9-11`). No compute, no storage buffers, no vertex-stage texture reads (the known WebGPU/vertex-LOD pitfall from the hero work doesn't apply here).
- `fwidth` (if used for resolution-independent scan-edge AA like the line's head mask) is fragment-stage only — fine on both backends; the GLSL2 path maps it to `fwidth()` (OES_standard_derivatives is core in WebGL2).
- `mx_cell_noise_float` / `mx_noise_float`: pure-TSL MaterialX implementations, compile on both backends — but the cheap `fract(sin(dot(...)))` hash (already proven in `PostFXNodes` grain on this renderer) is sufficient and lighter; prefer it.
- The classic flag-OFF path (plain `WebGLRenderer`, raw GLSL materials) **cannot run TSL at all**. Per the WebGPU-refactor decision (memory: WebGPU+WebGL2 fallback adopted), the rail can be TSL-only — but it must then be a hard no-op when `!webgpuEnabled()`, or it needs the dual GLSL twin like SignatureLine/DriftParticles. Decide in the plan; the gate is one line either way.

### 6.4 Z-fighting / layering with DriftParticles + SignatureLine

- Planes at exactly `z = 0` sit inside the DriftParticles spawn range (`z ∈ [-4, +2]`). Particles are additive sprites; with the plane `depthWrite:false` there is **no depth interaction at all** — final look is governed purely by render order. Set `renderOrder`: planes (e.g. 0) → particles → line, or rely on three's default transparent-object back-to-front sort and pin the plane group at `renderOrder = -1` so the dust and the signature beam always draw OVER the cards (the line already ignores depth).
- Avoid `z = -0.3` (HeroLogo rest depth) — irrelevant in practice (hero is at the top of the page, the rail mid-page; they never share a screen) but keep planes at a documented constant, e.g. `RAIL_Z = -0.2`, and **compensate scale if z ≠ 0**: at `z = zc`, multiply world scale and x/y mapping by `(CAMERA_Z - zc) / CAMERA_Z` because the px↔world constant `k` is derived for the z=0 plane (`constants.ts:7-15`). Simplest: keep `RAIL_Z = 0` and skip compensation; rely on renderOrder, not depth, for layering.

### 6.5 Camera tilt / descent vs "DOM-glued" planes

- At full tier the camera yaws/pitches a few degrees (lookAt-ahead, `lookTiltScale 0.2`) — world-anchored planes will drift a few px against their DOM rects while scrolling. This affects the SignatureLine equally and is part of the shipped look; for card backdrops it reads as subtle parallax depth, but the DOM card frame and the plane edge will visibly de-register if the plane is expected to fill the card EXACTLY edge-to-edge. Mitigations: (a) inset the plane ~2-3% inside the card so misregistration never exposes a gap, or (b) feather the plane edges (shader), or (c) accept it (Lusion does).
- The home **descent beat** (`camDescend`, end of cinematic spine) shifts `camera.position.y` away from the pure document mapping by up to ~1 viewport while active (`SignatureLine.tsx:406-430`). If the rail is on screen during that beat, planes will slide vertically relative to DOM. Check the restyled home order: if the rail sits after the cinematic spine, either ensure the beat's `scrollRamp` (±1.5 viewports around `tiltAnchorY`) has decayed by the rail's position, or subtract `useTextMorphStore.getState().camDescend` from plane Y like the camera-anchored hero objects do ("position themselves relative to camera.position.y per frame", `SignatureLine.tsx:312-315`).
- The intro-gate **shake spring** only fires at scrollY=0 (hero) — rail off-screen, no action needed.

### 6.6 DPR

Planes are world-space geometry rendered by the main canvas — DPR is already handled by the Canvas `dpr` prop; no per-plane handling needed (unlike DriftParticles' device-pixel sprite math, `DriftParticles.tsx:204-210`). The only DPR-sensitive piece would be a px-constant scan-line width — use `fwidth`-based AA or UV-relative width (the sketch uses UV-relative 0.025) and it's resolution-independent.

### 6.7 Bloom threshold interaction

- Home bloom: `intensity 1.1, threshold 1.0, radius 0.7` (`routeFxStore HOME_FX`, resolved in `PostFXNodes.resolveBloom`). The scan line at `uScanEmissive 2.4` clears the threshold decisively (the line uses 2.6-2.8); the backdrop must stay **comfortably below 1.0** — navy base ≈ 0.04-0.13 linear + ≤10% accent tint + ±0.015 grain ⇒ max channel ≈ 0.25. Safe.
- `toneMapped:false` is required to keep >1.0 values intact through to the bloom pass (same contract as `lineNodeMaterial.ts:169-171`). Side effect: the backdrop colors skip ACES at the material level but the **pipeline tonemaps the whole frame at output** (`PostFXNodes` header "TONE MAPPING") — so the navy will be graded exactly like the rest of the scene. No special handling.
- Don't raise `uScanEmissive` past ~3 or the bloom halo will visibly leak onto neighboring DOM text (canvas is behind the text, halo can ring around glyphs).

### 6.8 Misc pitfalls

- **Route-transition reveal**: tie `uReveal` to `scrollStore.reveal` (damped, like `dampedReveal` in SignatureLine) so planes fade with the line on navigation instead of popping.
- **Suspense**: if TSL material is built lazily (dynamic `import("three/tsl")` per repo convention), render nothing until it lands — copy the `glsl ?? tsl?.material` guard shape (`SignatureLine.tsx:133-134, 500`).
- **Geometry subdivision**: bend needs segments; `PlaneGeometry(1,1,1,1)` will not bow. Carousel ref uses 16×16; 8×16 (x×y... for an X-bend driven by uv.y, the **y** segments matter) is enough.
- **Measure timing with pinned rails**: if the restyle pins the rail with ScrollTrigger, `getBoundingClientRect` during the pin returns transformed positions; measure with the rail at known `trackX` and un-translate (§3.3), and re-measure on `ScrollTrigger.refresh` (the smooth-scroll-provider already debounces refresh at 150ms — match it).
- **13 vs 14 cards**: `src/data/case-studies.ts` currently holds 13 entries; the task brief says 14 planes. The count is data-driven either way — size nothing to a constant.

---

## 7. Related specs / in-repo precedents

- `.trellis/spec/` — only `frontend/` + `guides/` dirs exist; no WebGL-specific spec file was found for planes. The governing in-repo docs are the long component headers themselves (CanvasHost/Scene/PostFXNodes/SignatureLine) plus root `ANALISI_LUSION.md` / `PIANO.md` (per memory).
- In-repo precedents to copy from: `useSectionAnchors.ts` (measure discipline), `DriftParticles.tsx` (tier/route-gated world-strip object + dual-material pattern), `card-image-distort.tsx` (card hover events + easing), `pointerStore.ts` (transient store + frame-loop smoothing), `lineNodeMaterial.ts` (TSL material shape + bloom contract), `PostFXNodes.tsx` (verified TSL node imports + hash noise).

## Caveats / Not Found

- No `[data-rail-card]`, no horizontal rail, and no `railStore` exist yet — all are new surface introduced by this task; the current home case-studies section is a vertical grid.
- The "14 planes" figure doesn't match the current 13 case studies; assumed to reflect the restyled rail's card list (possibly 13 + a CTA card).
- Program-cache de-duplication for 14 identical node materials (1 program, 14 uniform groups) is based on three's chunk/cache-key behavior for structurally identical node graphs; if in doubt at implementation time, verify with `renderer.info.programs.length` — the fallback is sharing ONE material and accepting shared uniforms via the instanced variant.
- External repos were read at their current default branches (master/main) on 2026-06-11; pin the cited files if exact line references are needed later.
