"use client";

/**
 * TSL postprocessing rig — the WebGPU-backend counterpart of `PostFX.tsx`.
 *
 * WHY THIS EXISTS
 * ---------------
 * `@react-three/postprocessing` (`EffectComposer` in `PostFX.tsx`) is WebGL-only:
 * its `EffectComposer` constructor and `renderer` field are typed against
 * `WebGLRenderer`, and it calls `WebGLRenderTarget`-specific APIs that the
 * `three/webgpu` `WebGPURenderer` does NOT expose (on either backend). So when
 * the build-time flag `NEXT_PUBLIC_WEBGPU` is ON, `PostFX.tsx` is gated OUT in
 * `Scene.tsx` and the signature line gets NO bloom — it renders as a flat,
 * un-glowing tube. This component restores the cinematic grade for that path
 * using three's native TSL `PostProcessing` (a.k.a. `RenderPipeline`) class +
 * the `three/addons/tsl/display/*` `bloom` node, plus a hand-rolled vignette and
 * (optional) film grain (no `vignette` export exists in `three/tsl`, and the
 * addon `film`/`chromaticAberration` nodes are deliberately NOT used — see below).
 *
 * WHY NO `chromaticAberration` / `film` ADDON NODES (crash post-mortem)
 * --------------------------------------------------------------------
 * `chromaticAberration(node)` runs `convertToTexture(node)` and then SAMPLES the
 * result at offset UVs (`textureNode.sample(...)`, `textureNode.uvNode || uv()` —
 * see ChromaticAberrationNode.js L78/L111). It is built to wrap a PASS/texture
 * node. We were chaining it on top of an already-composited MATH node
 * (`color.add(bloom)`), which is NOT a texture node, so its internal input
 * resolved to null and the graph crashed at first runtime compile with
 * `THREE.TSL: TypeError: Cannot read properties of null (reading 'build')` inside
 * `generateInput()` (ChromaticAberrationNode.generate → FilmNode → ToneMapping).
 * The build-time `next build` can't catch it because TSL graphs only compile on
 * the first `PostProcessing.render()`. Fix: drop chromatic aberration entirely
 * (also off-brand for a sober AI consultancy) and re-implement grain HAND-ROLLED
 * with no texture sampling. The kept pipeline — scenePass → bloom → vignette →
 * tonemap — only ever feeds `bloom()` a real texture node (the scene-pass output),
 * and the vignette/grain operate on plain composited nodes, so no node receives a
 * null texture input.
 *
 * SELECTIVE BLOOM CONTRACT (preserved 1:1 with the WebGL2 path, "approach A")
 * --------------------------------------------------------------------------
 * The signature line / planet / particle TSL materials output color × emissive
 * ABOVE 1.0 with `toneMapped:false` (see `lineNodeMaterial.ts`), while the navy
 * UI/text live in the DOM behind a transparent canvas and the rest of the scene
 * stays ≤ 1.0. So a luminance-threshold bloom with `threshold ≈ 1.0` blooms ONLY
 * the >1.0 signal — exactly the trick `PostFX.tsx` uses
 * (`Bloom luminanceThreshold={bloomThreshold}`). We feed the scene-pass COLOR
 * target (not an MRT emissive slot) into `bloom(color, strength, radius, threshold)`;
 * the threshold is what makes it selective. No material change, no MRT pass —
 * the navy UI never blooms. (True MRT-emissive selective bloom — BloomNode's
 * "approach B" — would need the materials to write an `emissive` MRT slot; the
 * ports don't, so threshold-on-luminance is the faithful match.)
 *
 * SINGLE RENDER LOOP (FrameDriver/Lenis stays the only RAF)
 * ---------------------------------------------------------
 * R3F's render loop (`update()` in fiber) renders the scene automatically ONLY
 * when `state.internal.priority` is 0 (verified in
 * `@react-three/fiber/dist/events-*.js`: `if (!state.internal.priority && state.gl.render)
 * state.gl.render(state.scene, state.camera)`). Registering ANY `useFrame` with
 * a positive priority flips `internal.priority` truthy, which SUPPRESSES that
 * default render and hands rendering to us. We therefore drive `post.render()`
 * from a single `useFrame(..., 1)`. This adds NO new requestAnimationFrame — it
 * runs inside R3F's existing loop, alongside `FrameDriver`'s priority-0 Lenis
 * pump. On unmount, fiber's `useFrame` cleanup decrements `internal.priority`
 * back to 0, so the default scene render resumes automatically (matters if the
 * tier degrades full → lite and this component unmounts).
 *
 * TONE MAPPING (no double-tonemap, no double-AA)
 * ----------------------------------------------
 * R3F's `<Canvas>` (no `flat` prop) sets the renderer to `ACESFilmicToneMapping`
 * by default. `PostProcessing` keeps `outputColorTransform = true`, so its
 * `render()` runs the effect chain in linear/HDR (it temporarily forces the
 * renderer to `NoToneMapping` during the quad render) and then applies the
 * renderer's configured tone mapping + output color space as the FINAL step —
 * reproducing the OFF path's filmic ACES look. Because the auto scene render is
 * suppressed (priority > 0) the scene is tone-mapped exactly once, at the
 * pipeline output. AA: `multisampling` is irrelevant here (the WebGPU path's
 * Canvas requests `antialias:false`); we add no separate AA pass, so there is no
 * double-AA. (FXAA/SMAA could be added later if needed; intentionally omitted.)
 *
 * BUNDLE DISCIPLINE (OFF path never pulls `three/webgpu`)
 * ------------------------------------------------------
 * This module is only ever MOUNTED on the ON path (see the `webgpuEnabled()`
 * guard in `Scene.tsx`), and — mirroring `SignatureLine`/`createRenderer` — it
 * imports `three/webgpu`, `three/tsl` and the addon nodes LAZILY via
 * `import(...)` inside the build effect. The static import graph of this file
 * touches only `react`, `@react-three/fiber` and local stores, so even importing
 * the component never drags the heavy node-material build into the OFF bundle.
 *
 * TIER / REDUCED-MOTION GATING
 * ----------------------------
 * Mounted ONLY at `tier === "full"` (identical to how `PostFX.tsx` is gated in
 * `Scene.tsx`) — `lite` gets no postprocessing, matching the WebGL2 path exactly.
 * `prefers-reduced-motion` resolves to tier `"off"`, so `CanvasHost` renders
 * nothing and this never mounts: the reduced-motion site is fully static with no
 * animated grain by construction. The premium base is Bloom + Vignette +
 * ToneMapping (always on at full tier); a whisper of hand-rolled film grain is
 * layered on top, mapped off the existing `noiseOpacity` knob, and is the only
 * "extra" — it is omitted automatically when that knob is 0.
 */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFxStore } from "./store/fxStore";
import { routeFx, HOME_FX } from "./store/routeFxStore";
import { usePointerStore } from "./store/pointerStore";
import { createPointerFlowmap, type PointerFlowmap } from "./fluid/PointerFlowmap";

/**
 * Minimal structural shapes for the lazily-imported TSL objects. We never import
 * `three/webgpu` types at module scope (that would risk pulling the heavy build
 * type-graph into the OFF path); these describe just the fields we touch.
 */
interface UniformNode {
  value: number;
}
interface BloomNodeLike {
  strength: UniformNode;
  radius: UniformNode;
  threshold: UniformNode;
}
interface PostProcessingLike {
  outputNode: unknown;
  outputColorTransform: boolean;
  needsUpdate: boolean;
  render: () => void;
  dispose: () => void;
}

/**
 * Resolve the effective bloom knobs exactly like `PostFX.tsx`: the per-route
 * tone (`routeFx`) is used unless a dev has tuned the fxStore value off its
 * default (then the leva/console override wins). Mirrors `PostFX.tsx` verbatim
 * so the two backends read the same numbers for the same route.
 */
function resolveBloom(pathname: string) {
  const s = useFxStore.getState();
  const route = routeFx(pathname);
  const intensity =
    s.bloomIntensity === HOME_FX.bloomIntensity ? route.bloomIntensity : s.bloomIntensity;
  const threshold =
    s.bloomThreshold === HOME_FX.bloomThreshold ? route.bloomThreshold : s.bloomThreshold;
  const radius =
    s.bloomRadius === HOME_FX.bloomRadius ? route.bloomRadius : s.bloomRadius;
  return { intensity, threshold, radius };
}

export function PostFXNodes({ pathname = "/" }: { pathname?: string }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  // The live PostProcessing object + the bloom node, kept in refs so the
  // per-frame render and the route-change effect can reach them without
  // re-running the (expensive) build effect. `null` until the lazy chunk lands.
  const postRef = useRef<PostProcessingLike | null>(null);
  const bloomRef = useRef<BloomNodeLike | null>(null);
  // The pointer fluid flowmap (WebGPU-only). Null when disabled (coarse pointer
  // / reduced-motion) or before the lazy build lands.
  const flowRef = useRef<PointerFlowmap | null>(null);
  // Resolve the fluid gate ONCE (matches custom-cursor.tsx / pointerStore): no
  // fluid on coarse pointers or under prefers-reduced-motion. PostFXNodes only
  // mounts at tier "full" already, so this just excludes touch/RM desktops.
  const fluidEnabledRef = useRef(false);
  // The LIVE pathname, reachable from the async build. Assigned during render
  // (no effect): it is only ever read from async/frame callbacks, never during
  // render, so there is no tearing concern. The build effect's deps are
  // [gl, scene, camera] — stable across client-side routing — so its `pathname`
  // closure is frozen at mount and cannot be trusted once the graph lands.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Build the node graph once (per renderer). All `three/webgpu` + `three/tsl`
  // imports are lazy here, so the OFF build never bundles them.
  useEffect(() => {
    let cancelled = false;
    let built: PostProcessingLike | null = null;

    // Resolve the fluid gate once (no listener; the pointer listener lives in
    // FrameDriver/pointerStore). Coarse-pointer + reduced-motion → no fluid.
    fluidEnabledRef.current =
      typeof window !== "undefined" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !window.matchMedia("(pointer: coarse)").matches;

    void (async () => {
      const [webgpu, tsl, { bloom }] = await Promise.all([
        import("three/webgpu"),
        import("three/tsl"),
        import("three/addons/tsl/display/BloomNode.js"),
      ]);
      if (cancelled) return;
      const { PostProcessing } = webgpu;

      // Loosely-typed views of the TSL helpers we use. The real `three/tsl`
      // types are extremely generic (every node is `Node` with a vast fluent
      // surface); narrowing them here to the exact shapes we touch keeps the
      // chain readable and lets `float()` satisfy the addon `Node` params. All
      // calls below are runtime-verified against the installed build.
      type TslNode = {
        add: (n: TslNode | number) => TslNode;
        sub: (n: TslNode | number) => TslNode;
        mul: (n: TslNode | number) => TslNode;
        oneMinus: () => TslNode;
        rg: TslNode;
      };
      // The scene-pass texture node is a PassTextureNode (extends TextureNode):
      // `.sample(uvNode)` clones it sampling at a different UV — the supported
      // way to read the scene at an offset UV (verified: TextureNode.sample,
      // three.webgpu.js L12730). Plain color use stays a TslNode.
      type ScenePassTextureNode = TslNode & {
        sample: (uvNode: TslNode) => TslNode;
      };
      const {
        pass,
        screenUV,
        uv,
        vec2,
        vec4,
        smoothstep,
        float,
        sin,
        fract,
        dot,
        time,
      } = tsl as unknown as {
        pass: (
          scene: unknown,
          camera: unknown,
        ) => { getTextureNode: (name?: string) => ScenePassTextureNode };
        screenUV: { distance: (p: TslNode) => TslNode; add: (n: TslNode) => TslNode };
        uv: () => TslNode;
        vec2: (x: number, y: number) => TslNode;
        vec4: (
          x: TslNode | number,
          y: TslNode | number,
          z: TslNode | number,
          w: TslNode | number,
        ) => TslNode;
        smoothstep: (a: number, b: number, x: TslNode) => TslNode;
        float: (v: number) => TslNode;
        sin: (n: TslNode) => TslNode;
        fract: (n: TslNode) => TslNode;
        dot: (a: TslNode, b: TslNode) => TslNode;
        time: TslNode;
      };

      const { intensity, threshold, radius } = resolveBloom(pathname);
      const fx = useFxStore.getState();

      // --- Scene render → color target ---------------------------------------
      const scenePass = pass(scene, camera);
      const color = scenePass.getTextureNode("output");

      // 0) POINTER FLUID (WebGPU-only liquid-glass refraction). Build the
      //    flowmap rig (offscreen ping-pong RT + splat/fade quad) and offset the
      //    SCENE SAMPLE UV by `flow.rg * uStrength` BEFORE bloom, so the disturbed
      //    line still blooms. uStrength is TINY (~0.006) → a premium breath, not a
      //    warp. Gated: only when the fluid is enabled (fine pointer, no RM). When
      //    disabled we sample the scene at the unmodified UV (identical to before).
      let colorForBloom: ScenePassTextureNode = color;
      if (fluidEnabledRef.current) {
        const flow = createPointerFlowmap(
          gl as never,
          webgpu as never,
          tsl as never,
        );
        flowRef.current = flow;
        // Offset the scene-pass sample UV. `flowTexNode.rg` is the velocity field;
        // `uStrength` scales it to a fraction of a screen. `.sample(uv)` returns a
        // fresh textured color node — still a real texture node, so bloom() below
        // receives a valid texture input (no null-input crash).
        const flowVec = (flow.flowTexNode as unknown as TslNode).rg.mul(
          flow.uStrength as unknown as TslNode,
        );
        const offsetUv = uv().add(flowVec);
        colorForBloom = color.sample(offsetUv) as ScenePassTextureNode;
      }

      // 1) SELECTIVE BLOOM (the priority): threshold ≈ 1.0 so only the >1.0
      //    emissive signal (line/planet/particles) blooms. Additive over the
      //    color (matches PostFX.tsx: `<Bloom intensity radius luminanceThreshold>`).
      //    `bloom()` accepts plain-number strength/radius/threshold (it wraps
      //    them in uniforms internally — that is the .strength/.radius/.threshold
      //    we mutate on route change). Fed the (optionally fluid-displaced) scene
      //    color so the refracted line/planet still blooms.
      const bloomPass = bloom(
        colorForBloom as never,
        intensity,
        radius,
        threshold,
      );
      const bloomNode = bloomPass as unknown as TslNode;
      // Base the composite on the (optionally fluid-displaced) scene color so the
      // whole scene — not just the bloom halo — breathes around the pointer.
      let node: TslNode = (colorForBloom as TslNode).add(bloomNode);

      // 2) VIGNETTE (hand-rolled — no `vignette` export in three/tsl). Mirrors
      //    `<Vignette offset={0.35} darkness={...}>`: darken from ~0.5 of the way
      //    out to the corners. `screenUV.distance(center)` is 0 at center, grows
      //    toward the edges; smoothstep(offset, ~edge) ramps the darkening. This
      //    operates on the plain composited node (no texture sample) — safe.
      const dist = screenUV.distance(vec2(0.5, 0.5));
      const vig = smoothstep(0.35, 0.85, dist)
        .oneMinus()
        .mul(float(fx.vignetteDarkness))
        .oneMinus();
      node = node.mul(vig);

      // 3) FILM GRAIN (hand-rolled, whisper-only — replaces the crash-prone `film`
      //    addon). A screen-space value hash `fract(sin(dot(screenUV, k)) * m)`
      //    animated by `time`, remapped to [-0.5, 0.5] and scaled by the existing
      //    `noiseOpacity` knob (so it tracks the WebGL2 grain amount), added to the
      //    color as a tiny luminance jitter. NO texture sampling, NO pass/texture
      //    node — only plain TSL math — so it cannot reproduce the null-input
      //    crash. Omitted automatically when `noiseOpacity` is 0 (e.g. grain off).
      if (fx.noiseOpacity > 0) {
        const seed = screenUV.add(vec2(1, 1).mul(time));
        const grain = fract(sin(dot(seed, vec2(12.9898, 78.233))).mul(43758.5453));
        const jitter = grain.sub(0.5).mul(float(fx.noiseOpacity));
        // vec4 with 0 alpha so the jitter adds to rgb only and matches the
        // composited vec4 color's component count (no vec3+vec4 mismatch).
        node = node.add(vec4(jitter, jitter, jitter, 0));
      }

      // 4) TONE MAPPING + output color space happen LAST, owned by the pipeline.
      //    `outputColorTransform = true` (default) makes PostProcessing.render()
      //    apply the renderer's tone mapping (R3F default = ACESFilmicToneMapping)
      //    and output color space after the chain — reproducing the OFF path's
      //    filmic look, with the scene tone-mapped exactly once.
      const post = new PostProcessing(gl as never) as unknown as PostProcessingLike;
      post.outputNode = node;
      post.needsUpdate = true;

      built = post;
      postRef.current = post;
      bloomRef.current = bloomPass;

      // The graph was built from the pathname captured at MOUNT. If the visitor
      // navigated while the BloomNode chunk was still in flight (its own chunk —
      // a real cold-cache round-trip), the [pathname] effect below already ran
      // and bailed on a null bloomRef, and it will never re-run because its only
      // dep did not change again. Re-apply the CURRENT route now so the stale
      // closure can never win. Idempotent on the no-navigation path (writes back
      // the same numbers already baked into bloom()), and it touches uniform
      // values only — no graph rebuild or recompile.
      const cur = resolveBloom(pathnameRef.current);
      bloomPass.strength.value = cur.intensity;
      bloomPass.radius.value = cur.radius;
      bloomPass.threshold.value = cur.threshold;
    })();

    return () => {
      cancelled = true;
      built?.dispose();
      if (postRef.current === built) postRef.current = null;
      bloomRef.current = null;
      flowRef.current?.dispose();
      flowRef.current = null;
    };
    // Rebuild only when the renderer identity changes (route changes update the
    // bloom uniforms in the effect below — no graph rebuild needed).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  // Route-change beat: update the bloom uniforms in place (no rebuild). Mirrors
  // PostFX.tsx re-reading routeFx/fxStore on pathname change.
  useEffect(() => {
    const b = bloomRef.current;
    if (!b) return;
    const { intensity, threshold, radius } = resolveBloom(pathname);
    b.strength.value = intensity;
    b.radius.value = radius;
    b.threshold.value = threshold;
  }, [pathname]);

  // The single render authority for the WebGPU path. Positive priority (1)
  // suppresses R3F's default scene render (see header note) and lets us drive
  // the post pipeline instead — inside the ONE existing R3F/Lenis loop, no new
  // RAF. Until the lazy graph lands, fall back to a plain scene render so the
  // first frames are not black.
  useFrame((_, delta) => {
    // Stamp + fade the pointer flowmap FIRST (renders the offscreen quad into its
    // own RT and restores the previous target), so the post pipeline samples a
    // fresh field this frame. Idle cursor → only the cheap fade runs (no stamp).
    // delta threads through so fade/deposit are wall-clock-true at any refresh
    // rate (the flowmap clamps it to 1/30 itself).
    const flow = flowRef.current;
    if (flow) {
      const fx = useFxStore.getState();
      const { smooth, vel } = usePointerStore.getState();
      const w = (gl as unknown as { domElement?: { width?: number } }).domElement
        ?.width;
      const h = (gl as unknown as { domElement?: { height?: number } }).domElement
        ?.height;
      const aspect = w && h ? w / h : 1;
      flow.uStrength.value = fx.fluidStrength;
      flow.tick({
        dt: delta,
        px: smooth.x,
        py: smooth.y,
        vx: vel.x,
        vy: vel.y,
        aspect,
        dissipation: fx.dissipation,
        splatRadius: fx.splatRadius,
        strength: fx.fluidStrength,
      });
    }

    const post = postRef.current;
    if (post) {
      post.render();
    } else {
      // Graph not built yet: render the scene normally (single tonemap via the
      // renderer's own ACES). This branch only runs for the brief async window.
      (gl as unknown as { render: (s: unknown, c: unknown) => void }).render(scene, camera);
    }
  }, 1);

  return null;
}
