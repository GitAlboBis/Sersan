I have everything I need. Writing the spec now.

---

# SERSAN Signature Effect — Scroll-Driven Glowing Gradient Line: Implementation Spec

Status: design only, no implementation. Targets Next 16 App Router + React 19, Tailwind v4, existing `lenis@1.3.23` + GSAP 3.15 + ScrollTrigger. Adds `three @react-three/fiber @react-three/drei @react-three/postprocessing zustand leva` (none installed). All paths under `C:\Users\alber\Desktop\sersan-v2-main\src\`.

---

## 1. File / component breakdown

All new code under `src/webgl/`. Mount seam is `layout.tsx` (persists across route changes — see recon §1, §6).

| Path | Type | Responsibility |
|---|---|---|
| `src/webgl/CanvasHost.tsx` | `"use client"` | The single persistent host. `dynamic(() => import('./Scene'), { ssr:false })`. Renders the R3F `<Canvas>` fixed full-viewport, `pointer-events:none`, `aria-hidden`, low z. Owns DPR clamp, `gl` config (`alpha:true`, transparent clear), tier gating: reads `useTierStore` and renders nothing (returns `null`) on `mobile`/`reduced`/`weak` tiers — falls back to the existing `orb-core.webp` poster (recon §5, HeroBackdrop kept). Reads `prefers-reduced-motion` + a one-time GPU probe before deciding to mount. |
| `src/webgl/Scene.tsx` | client (lazy) | The R3F scene graph: `<SignatureLine/>`, optional `<DriftParticles/>`, `<PostFX/>`, camera, the `<FrameDriver/>` (single-RAF Lenis pump), `<Leva/>` panel mount (dev only). No lights needed (line is emissive/unlit). |
| `src/webgl/SignatureLine.tsx` | client | Builds `CatmullRomCurve3` from the active route's waypoint config, generates `TubeGeometry`, applies `LineShaderMaterial`. Subscribes to `useScrollStore` for `uProgress`; updates `uTime` in `useFrame`. Handles resize-driven curve regeneration (debounced). Registers itself with the bloom `Selection`. Optionally renders the bright head sprite at `curve.getPointAt(progress)`. |
| `src/webgl/materials/lineShader.ts` | module | GLSL as inline template literals (Turbopack-safe — see §7) + uniform factory. Exports `createLineMaterial()` returning a `THREE.ShaderMaterial` (or a `shaderMaterial`-from-drei class). No `.glsl` file imports. |
| `src/webgl/PostFX.tsx` | client | `<EffectComposer>` with `<SelectiveBloom>` (or `<Bloom>` + emissive-threshold trick), `<Noise>`, `<Vignette>`. Disabled entirely on non-desktop tiers. |
| `src/webgl/FrameDriver.tsx` | client | The single RAF authority. `useFrame((_, , ) => lenis.raf(performance.now()))` — pumps the shared Lenis instance from R3F's loop. Replaces the singleton's private RAF (see §5 + §7 risk). |
| `src/webgl/curves/routeCurves.ts` | module | Per-route waypoint configs (data-driven, see §2). Pure data + a `buildCurve(viewport, sectionAnchors)` helper. |
| `src/webgl/store/scrollStore.ts` | module (zustand) | Global scroll state (§5). |
| `src/webgl/store/tierStore.ts` | module (zustand) | Device/perf tier (§6), set once on mount, downgradable by `PerformanceMonitor`. |
| `src/webgl/debug/LineDebug.tsx` | client, dev-only | `leva` controls bound to uniforms + bloom params. Tree-shaken in prod via `process.env.NODE_ENV` guard + dynamic import. |
| `src/webgl/hooks/useSectionAnchors.ts` | client | Reads DOM `[data-line-anchor]` element rects → normalized world Y positions, feeds curve rebuild on layout change (§2). |

Edits to existing files:
- `src/app/layout.tsx`: mount `<CanvasHost/>` inside `SmoothScrollProvider`, sibling of `<main>`, before `<Navbar>` (recon §1). Update `viewport.themeColor` `#070b14` → `#0B1422`.
- `src/lib/lenis-singleton.ts`: add `pumpExternally` flag so the private `tick()` does **not** start when R3F will drive it (§5).
- `src/components/smooth-scroll-provider.tsx`: rework the `prefers-reduced-motion` early-return so a progress source still exists for the canvas (§5, recon §2/§6 risk).
- `src/app/globals.css`: body `background-attachment:fixed` radial gradient → transparent or above-canvas layer; new `--accent-2` violet token (recon §3, §7 risk).

---

## 2. Curve strategy

**Authoring model: data-driven per-route, anchored to DOM.** A pure 3D curve disconnected from the DOM will drift as content reflows; instead the curve is *re-derived from real section box positions* each layout pass.

- **Per-route config** in `routeCurves.ts`: a map `Record<Pathname, WaypointConfig>`. Each config is an ordered list of waypoints expressed in a **normalized, layout-relative** space, not absolute world units:
  ```
  { anchorId: 'who-why', x: -0.6, zBias: 0.4, tension?: number }
  ```
  `anchorId` ties the waypoint to a `[data-line-anchor="who-why"]` DOM node placed on each section. `x` ∈ [-1,1] is horizontal serpentine offset (viewport-half-widths); `zBias` adds depth so the tube weaves toward/away from camera.
- **World-space mapping:** the page is mapped to a vertical world strip. `useSectionAnchors` measures each anchor's `getBoundingClientRect().top + scrollY` (document-space px) and the full `document.documentElement.scrollHeight`. Each waypoint's world Y = `-(docY / scrollHeight) * WORLD_LENGTH` (WORLD_LENGTH ≈ 40 units, tunable). World X = `x * (viewport.width/2 * X_SCALE)`. World Z = `zBias * Z_RANGE`. This makes the curve **adapt to variable page heights automatically** — taller pages stretch the same waypoint set; the normalized doc-fraction keeps anchors aligned to their sections.
- **Control point count:** author ~1 waypoint per section (home has ~12 sections → ~12 control points). `CatmullRomCurve3` interpolates smoothly through them. Then **resample** to ~`segments = clamp(controlPoints*12, 64, 256)` for `TubeGeometry` (`tubularSegments`), `radialSegments = 8` desktop / `6` weak. Catmull-Rom `curveType:'centripetal'` to avoid cusps/overshoot on uneven spacing.
- **Scroll px → curve param mapping:** scroll is consumed only as normalized `progress` ∈ [0,1] (`lenis.progress`, or `scroll/(scrollHeight-innerHeight)`). `progress` maps directly to the shader draw mask (`uProgress`) and to `curve.getPointAt(progress)` for the head/camera. Because both the curve geometry *and* progress derive from the same normalized doc-fraction, the lit head stays glued to the section the user is reading regardless of page height or responsive layout.
- **Responsive:** on resize, `useSectionAnchors` re-measures and `SignatureLine` rebuilds geometry (debounced 150ms, matching the existing `ScrollTrigger.refresh()` debounce in `smooth-scroll-provider.tsx` L77). Mobile uses a simplified config (fewer waypoints, smaller X amplitude) or a static line (§6).
- **Camera:** orthographic-feel via a fixed perspective camera at `z≈12`; optional subtle drift = lerp camera toward `curve.getPointAt(progress)` offset back on +Z by a constant, damped (lerp factor ~0.05). Keep amplitude tiny — content must stay readable. Camera drift is desktop-only.

---

## 3. Shader spec (`lineShader.ts`)

`TubeGeometry` gives per-vertex `uv` where **`uv.x` = around-tube (radial), `uv.y` = along-tube [0..1] head→tail**. The draw mask runs on `uv.y` (alias `vV`).

**Uniforms:**
| Uniform | Type | Purpose |
|---|---|---|
| `uProgress` | `float` | 0→1 scroll. Length of line that is "drawn"/lit. |
| `uTime` | `float` | Animation clock for gradient flow + shimmer. |
| `uColorA` | `vec3` | cyan `#3BE1FF` (linear-converted). |
| `uColorB` | `vec3` | violet `#7C5CFF`. |
| `uColorHot` | `vec3` | optional warm peak color (sparingly, near head). |
| `uGlowFalloff` | `float` | radial edge softness across `uv.x`. |
| `uHeadSharp` | `float` | width of the bright leading edge. |
| `uEmissive` | `float` | emissive multiplier (drives bloom threshold, §4). |
| `uFlowSpeed` | `float` | gradient scroll speed along the tube. |
| `uReveal` | `float` | global 0→1 fade for route transitions (§5). |
| `uDpr` | `float` | for AA feathering scale. |

**Vertex:** pass `vUv = uv`, pass `vV = uv.y`. Standard `projectionMatrix * modelViewMatrix * position`. No displacement (keeps geometry stable for bloom). Optionally a tiny `sin(uv.y*K + uTime)` radial breathing on `position += normal * amp` — desktop only, off by default.

**Fragment — draw mask + AA head:**
- `drawn = smoothstep(uProgress - feather, uProgress, vV')` where `vV'` is oriented so the head is at `progress`. Anti-aliasing at the head: `feather = uHeadSharp + fwidth(vV)` (screen-space derivative → resolution-independent crisp edge, no shimmer). Everything past the head fades to 0 alpha.
- **Head highlight:** a bright band `head = smoothstep(uProgress, uProgress - uHeadSharp, vV) * step(...)` → mix toward `uColorHot`/white near the leading point so the tip reads as the energetic "signal" head.
- **Gradient:** `grad = mix(uColorA, uColorB, fract(vV - uTime*uFlowSpeed))` — animated flow along the tube. Keep it subtle (brief says sparingly).
- **Radial glow falloff:** `radial = pow(1.0 - abs(vUv.x*2.0 - 1.0), uGlowFalloff)` → bright core, soft edges, gives the tube a glow cross-section without geometry cost.
- **Output:** `vec3 col = grad + head*uColorHot; col *= uEmissive;` `float a = drawn * radial * uReveal;` `gl_FragColor = vec4(col, a);`
- **Blending:** `AdditiveBlending`, `transparent:true`, `depthWrite:false`, `depthTest:false` (line floats behind DOM, never z-fights with itself), `toneMapped:false` (so emissive values can exceed 1.0 and trip the bloom threshold cleanly). Additive over the transparent navy canvas reads as pure glow; on the dark `#0B1422` page background it composites correctly.

`uEmissive` pushed >1.0 (e.g. 2–4) is the mechanism that lets a global luminance-threshold Bloom pick out *only* the line (§4) without a `Selection`.

---

## 4. Selective bloom rig (`PostFX.tsx`)

Two viable approaches with current `@react-three/postprocessing`; recommend **A** for simplicity, **B** if anything else in-scene gets bright.

**A — Luminance-threshold Bloom (recommended).** Because the line material is `toneMapped:false` and emits color × `uEmissive` (>1.0) while the background/particles stay ≤1.0, a single `<Bloom mipmapBlur luminanceThreshold={1.0} luminanceSmoothing={0.2} intensity={…} radius={0.6} />` blooms only the line. This is the standard "emissive above threshold" trick and the cheapest. `mipmapBlur` for quality glow at low cost.

**B — `<SelectiveBloom>` with `Selection`.** Wrap the scene in `<Selection>`, add `<Select enabled>` around the line mesh, and use `<SelectiveBloom selection={lineRef} luminanceThreshold={0} mipmapBlur .../>`. Guarantees only selected meshes bloom regardless of brightness. Slightly heavier (extra render pass per selection). Use only if particles/head need different bloom treatment.

Full rig order in `<EffectComposer multisampling={0}>` (postprocessing does its own AA; multisampling off saves cost):
1. `Bloom`/`SelectiveBloom` (line glow).
2. `Noise` (`premultiply`, opacity ~0.04 — cinematic grain, replaces deleted DOM grain from `cinematic-overlay.tsx`, recon §5).
3. `Vignette` (`eskil:false`, darkness ~0.5, offset ~0.4 — depth).

**DOM stays crisp:** the `<Canvas>` is `gl={{ alpha:true }}` with `setClearAlpha(0)` / transparent clear color; postprocessing operates only on the canvas framebuffer, never touching DOM. The canvas sits *behind* content (`z` below `<main>`, `pointer-events:none`, `aria-hidden`), so Bloom/Noise/Vignette blur only the WebGL layer; text rendered by the DOM above is untouched and fully crisp. Composer renders to the canvas's own buffer; `frameloop` stays `'always'` while visible.

---

## 5. Scroll plumbing

**zustand store (`scrollStore.ts`):**
```ts
interface ScrollState {
  progress: number;        // 0..1 doc fraction
  velocity: number;        // lenis velocity, for head intensity / motion blur feel
  reveal: number;          // 0..1 route-transition fade (drives uReveal)
  pathname: string;        // active route → selects curve config
  setScroll: (p: number, v: number) => void;
  setReveal: (r: number) => void;
  setPathname: (p: string) => void;
}
```
Store is updated outside React's render (transient) to avoid re-renders: `SignatureLine` reads it via `useScrollStore.getState()` inside `useFrame` (or `subscribe`), never via the reactive hook in the render path.

**Flow (single RAF, brief §3a):**
1. `FrameDriver` (inside `<Canvas>`) calls `lenis.raf(performance.now())` every `useFrame` — R3F's loop is the **sole** RAF. The Lenis singleton's private `tick()` is disabled (`pumpExternally=true`), eliminating the double-tick risk (recon §5).
2. `lenis.on('scroll', e => useScrollStore.getState().setScroll(e.progress, e.velocity))` — Lenis still emits; this also keeps `ScrollTrigger.update` bridged (existing line 36) so GSAP DOM reveals stay synced to the *same* source.
3. `SignatureLine` `useFrame`: reads `getState().progress` → writes `material.uniforms.uProgress.value` (optionally damped/lerped toward target for buttery feel), updates `uTime`, repositions head sprite via `curve.getPointAt(progress)`.

**ScrollTrigger / DOM reveals on same progress:** keep the existing `ui/reveal.tsx` GSAP ScrollTrigger reveals — they already resolve against Lenis via the `scrollerProxy` (smooth-scroll-provider L54). No second source. Note the EN↔IT SplitText desync risk (recon §7) is orthogonal to this effect but reuse the same fix (key reveals by `language`).

**Route-change behavior:** Canvas persists (layout-mounted). On `usePathname()` change (`navbar.tsx` already imports it):
- `setReveal(0)` → `uReveal` fades line out (~250ms, GSAP tween on the store value or a uniform tween).
- Swap waypoint config for the new path; rebuild curve geometry while invisible.
- `setReveal(1)` → fade the new curve in. Net effect: line "re-curves" per route behind a short cross-fade, synced with the DOM curtain/`template.tsx` enter animation (recon §6). No Canvas remount.

**Reduced-motion / no-Lenis fallback (recon §2/§6 risk):** rework `SmoothScrollProvider` so that under `prefers-reduced-motion` it does *not* early-return into a void: either (a) still create Lenis but with smoothing effectively off, or (b) attach a native `scroll` listener that writes `progress` to the store. Cleaner: the Canvas self-disables under RM (§6), so the store just needs a native-scroll writer for any non-WebGL consumers. The store must never depend on Lenis existing.

---

## 6. Degradation matrix

Tier resolved once on mount in `tierStore.ts` (UA + `matchMedia` + a cheap WebGL capability/GPU probe), downgradable at runtime by drei `<PerformanceMonitor>` (drops tier on sustained fps dips).

| Tier | Detection | Line | Postprocessing | Particles | Camera drift | DPR |
|---|---|---|---|---|---|---|
| **Desktop (full)** | not mobile, no RM, GPU ok, fps stable | Full TubeGeometry, animated shader, head sprite, ~256 segments | Bloom + Noise + Vignette | Instanced GPU dust (optional) | Yes, subtle | `min(devicePixelRatio, 2)` |
| **Weak GPU** | `PerformanceMonitor` `onDecline`, or low-end GPU string | Tube, ~96 segments, radialSegments 6, no breathing | Bloom only (Noise/Vignette off), `mipmapBlur` lower res | Off | Off | clamp to 1.5 then 1 |
| **Mobile** | `max-width`/coarse-pointer + UA | Static or low-amplitude line, fewer waypoints; consider drei `<Line>`/meshline instead of tube (cheaper) | **None** | Off | Off | clamp to 1.5 |
| **prefers-reduced-motion** | `matchMedia('(prefers-reduced-motion: reduce)')` | **No animated WebGL.** `CanvasHost` returns `null`; render the existing `orb-core.webp` poster (recon §5) + a static CSS gradient line/vignette as decorative fallback | None (CSS-only grain/vignette if desired) | Off | n/a |

`CanvasHost` reads tier and either mounts `<Scene>` or renders the static fallback. RM and mobile never instantiate the composer (cost + battery). `frameloop` set to `'demand'` when the line is fully drawn and idle (no velocity) to save power; back to `'always'` on scroll.

---

## 7. Risks & unknowns + mitigations

1. **Double RAF (Lenis singleton + R3F).** The singleton owns a private `tick()` (`lenis-singleton.ts` L20–24); R3F also runs a loop. Running both double-pumps Lenis → jank/inconsistent progress. **Mitigation:** add `pumpExternally` to the singleton so it skips starting its own RAF when the Canvas is present; `FrameDriver` becomes the sole pump. Fallback when Canvas absent (RM/mobile): singleton keeps its own RAF. The refcount teardown assumption ("homepage scene unmounts on nav", L11) no longer holds for a layout-level canvas — acquire once at layout level, release on full unmount only.

2. **Tube regeneration cost on resize.** `TubeGeometry` rebuild allocates new buffers; doing it on every resize event stutters. **Mitigation:** debounce 150ms (match existing refresh debounce), dispose old geometry (`geometry.dispose()`) before replacing, and on resize-without-reflow (width-only, e.g. mobile URL bar) skip rebuild if section anchor doc-fractions are unchanged. Reuse a single material across rebuilds. Consider drei `<Line>`/meshline for mobile to avoid tube rebuilds entirely.

3. **Bloom over transparent canvas.** Some postprocessing passes assume opaque clear; additive emissive over `alpha:0` can produce dark fringing if blending/premultiply is misconfigured. **Mitigation:** `gl.setClearAlpha(0)`, line material `premultipliedAlpha` consistent with composer, `Noise` with `premultiply`, test the composited result against the navy DOM background (it's nearly black, so fringing is minimal). Verify with Playwright screenshots over the real page background, not a checkerboard.

4. **Z-fighting / stacking with DOM.** The body paints a `background-attachment:fixed` radial gradient + `.cinematic-veil`/`.section-accent-tint` pseudo-elements at `z-index:-1` (recon §3/§7) that will **occlude** a `z-index:-1` canvas. **Mitigation:** make body background transparent (move the radial into a canvas-side gradient or a layer *above* the canvas but below content), and set the canvas at a defined low z (e.g. `z-index:0` with `<main>`/nav at higher z and `isolation` on body to create a clean stacking context). The line itself uses `depthTest:false` so it never z-fights within the scene.

5. **Turbopack + GLSL imports.** Next 16 uses Turbopack; importing `.glsl`/`.vert`/`.frag` files needs a loader that isn't configured. **Mitigation:** keep all GLSL as **inline template-literal strings** in `lineShader.ts` (no `.glsl` files, no extra loader/config). drei's `shaderMaterial` accepts string sources directly. This sidesteps the whole loader question.

6. **SSR / `next/dynamic`.** R3F must not SSR (recon §6/§10). **Mitigation:** `CanvasHost` imports `Scene` via `dynamic(..., { ssr:false })`; the SSR'd hero H1 + `orb-core.webp` poster remain in the DOM for LCP/SEO (recon §5/§10). The canvas hydrates after and sits behind.

7. **`leva` in production bundle.** **Mitigation:** dynamic-import `LineDebug` only when `process.env.NODE_ENV !== 'production'`; never import `leva` at module top-level in shipped components → tree-shaken out of prod.

8. **`vercel.json` image/quality allow-list.** New poster/texture assets served at a non-listed quality return HTTP 400 (`qualities:[75,90]`, recon §2/§8/§11); GLB/KTX2 extensions aren't in the 1yr-cache header rule. **Mitigation:** the line needs *no* texture (procedural), so this mostly doesn't bite; if a head sprite texture is added, serve it at quality 75/90 or as a static unoptimized asset, and add its extension to the cache header rule.

9. **Three runtimes competing for RAF** (framer-motion + GSAP + R3F, recon §8.3). framer-motion runs its own RAF on 8 mostly-off-home sections. **Mitigation:** out of scope for the line, but flag: consolidating reveals onto GSAP would reduce contention; the line itself adds only R3F's loop (which now also pumps Lenis), so net loop count does not increase versus today.

10. **Unknowns to validate during build (Playwright, multi-viewport, per brief §6):** exact `uEmissive`/`luminanceThreshold` pairing that isolates the line; whether `<Bloom>` threshold approach (A) suffices or `<SelectiveBloom>` (B) is needed once particles exist; real fps on a mid laptop with the composer at DPR 2; whether camera drift hurts readability; the precise z-stacking fix given the body gradient. All tunables exposed via `leva` for live tuning, then frozen into the tier configs.

---

**Key integration facts for the implementer (load-bearing, from source):**
- Mount point: inside `SmoothScrollProvider`, sibling-before `<main>` in `src/app/layout.tsx`.
- The Lenis singleton (`src/lib/lenis-singleton.ts`) currently self-drives RAF at L20–24, `refcount` teardown at L43–51 — must be made externally-pumpable.
- `SmoothScrollProvider` early-returns under reduced-motion at L25–28 (no Lenis at all) — store must not depend on Lenis.
- ScrollTrigger is already bridged to Lenis (`scrollerProxy` L54–69, `lenis.on("scroll", ScrollTrigger.update)` L36) and resize-debounced at L74–80 (150ms) — match this for curve rebuild.
- `viewport.themeColor` is `#070b14` in layout.tsx (recon L102) — update to `#0B1422`.
- No `node_modules`; install via bun (lockfile `bun.lock`), add `three @react-three/fiber @react-three/drei @react-three/postprocessing zustand leva` + `@gsap/react`.