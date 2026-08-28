# Fix WebGPU depth-buffer size race on interior-route hard loads

## Problem (user report, 2026-08-28)

On a HARD load of an interior route (e.g. `http://localhost:3000/consulting`, dev
server `bun run dev`), the console logs a WebGPU validation error during the
first frames:

> THREE.The depth stencil attachment [TextureView of Texture "depthBuffer"]
> size (width: 300, height: 150) does not match the size of the other
> attachments' base plane (width: 1280, height: 720). While validating
> depthStencilAttachment / encoding CommandEncoder renderContext_1
> BeginRenderPass.

300×150 is the default canvas size — a render pass encodes against a depth
buffer allocated before the renderer was sized to the laid-out canvas.
Reproduced on unmodified main (ca4dde1); pre-existing, NOT caused by the
2026-08-28 preloader-handoff work. Home (`/`) does not show it.

## Diagnosis (static analysis of installed three r18x + @react-three/fiber 9.x)

1. three `WebGPUBackend._getDefaultRenderPassDescriptor()` caches the
   depth-attachment view on the canvas target; the cache is invalidated only by
   `renderer.setSize`/`setPixelRatio` (via `_onCanvasTargetResize` →
   `backend.updateSize()`), and only while `_initialized`. The colour
   attachment is `context.getCurrentTexture()` each pass — it always tracks
   the canvas' CURRENT width/height attributes. Depth comes from
   `getDrawingBufferSize()` = CanvasTarget's INTERNAL `_width×_pixelRatio`.
   → depth 300×150 + colour 1280×720 in one pass means: a renderer whose
   internal size is still the 300×150 default is encoding to a canvas whose
   attributes were already set to 1280×720 **by someone else**.

2. R3F 9 `CanvasImpl` runs its configure layout-effect on EVERY commit (no dep
   array), and `configure()` tests `if (!state.gl)` BEFORE `await glConfig()`.
   Our `createWebGPURenderer` factory takes ~100s of ms (dynamic
   `import("three/webgpu")` + adapter/device negotiation). Any re-render of
   `Scene` (new `camera`/`resize`/`style` object identities per render;
   anchors/tier stores) inside that window re-enters `configure`, still sees
   `state.gl == null`, and starts a SECOND factory → second `WebGPURenderer`
   on the same canvas. The second resolution silently REPLACES `state.gl`, and
   because `state.size`/`viewport.dpr` are already current, R3F skips
   `setSize`/`setPixelRatio` on it entirely: renderer #2's internal drawing
   buffer stays 300×150 while the canvas attributes are 1280×720 (set by
   renderer #1) → the validation error on every pass until something
   (AdaptiveResolution `setDpr`, a real resize) finally resizes renderer #2.

3. The ROUND 12 pre-init `sizeToCanvas` reads the CANVAS' client box, but
   R3F's `<canvas>` has no CSS size until the first `setSize(updateStyle:true)`
   — it therefore reads the intrinsic 300×150, not the layout truth. The
   layout truth is the parent container div (100%×100% of the fixed host).

4. Home vs interior is only commit timing: whether a `Scene` re-render lands
   inside the factory-await window. To be confirmed empirically with a
   factory-invocation counter (expect ≥2 on /consulting hard load, 1 on /).

## Fix

- `src/webgl/renderer/createRenderer.ts`:
  a) Make the factory idempotent per canvas: module-level
     `WeakMap<canvas, Promise<Renderer>>`; a second `configure` during the
     async window receives the SAME renderer promise (no fork, no unsized
     renderer, no leaked GPUDevice). Entry dropped on rejection so a genuine
     failure can retry.
  b) `sizeToCanvas` measures `canvas.parentElement` (R3F's 100%×100%
     container — what R3F itself measures) with canvas-box fallback, so the
     pre-init size — and therefore the depth buffer allocated during the
     first descriptor build — matches the laid-out size from the start.

## Verification

- Hard reload `/consulting` (dev, WebGPU on): console clean — no
  depth/stencil-size validation error; factory log fires exactly once.
- Hard reload `/`: unchanged, clean.
- Diagnostic instrumentation removed before finish.
