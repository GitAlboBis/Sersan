All data gathered. Here is the report.

---

# WebGL Layer Stack Research — Next.js 16.2 / React 19.2 / Tailwind v4 / bun / Windows (June 2026)

## a) Install commands (bun)

**Runtime dependencies:**
```
bun add three@0.184.0 @react-three/fiber@9.6.1 @react-three/drei@10.7.7 @react-three/postprocessing@3.0.4 postprocessing@6.39.1 zustand@5.0.14
```
(gsap@^3.15, lenis@^1.3.23, framer-motion@^12 already installed. `@gsap/react` below is the only GSAP add.)
```
bun add @gsap/react@2.1.2
```

**Dev dependencies (3D asset pipeline + debug):**
```
bun add -d @gltf-transform/cli@4.4.0 gltfjsx@6.5.3 leva@0.10.1 @types/three
```
Notes:
- `@types/three` is optional — `three` ships its own types since ~r150; add only if your `three` version's bundled types lag. With three 0.184 you can usually omit it.
- gltfjsx/gltf-transform CLI can also be run ad-hoc via `bunx`/`npx` instead of installing as devDeps.
- `lenis/react` (ReactLenis) ships inside the `lenis` package — no separate install.

## b) Per-library findings + gotchas (with sources)

### 1. @react-three/fiber — 9.6.1 (current stable, React 19 line)
- v9 is the React 19 compatibility major. peerDeps: `react ">=19 <19.3"`, `react-dom ">=19 <19.3"` (optional), `three ">=0.156"`. Your React 19.2 is in range.
- **Gotcha (React reconciler):** React 19.2.x bumped its internal reconciler in a way that broke backward compat with 19.1.x; R3F handles all of 19.0–19.2 but is **capped below 19.3**. Pin React to a 19.0–19.2 release; do NOT jump to React 19.3+ until R3F publishes a matching release.
- v9 uniforms behavior change: `uniforms` objects on ShaderMaterial now have a stable reference (objects are copied in, not replaced) — relevant if you write custom shader materials for the signature line.
- Next.js App Router: components using R3F hooks/Canvas must be `'use client'`. See #10 for the SSR rule.
- Sources: https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide · https://github.com/pmndrs/react-three-fiber/releases · https://registry.npmjs.org/@react-three/fiber/latest

### 2. three — 0.184.0 (current stable, r184)
- Within fiber's `>=0.156` peer range. **Critical cross-constraint:** `postprocessing@6.39.1` requires `three ">= 0.168.0 < 0.185.0"` → **three 0.184.0 is the safe ceiling**. Do NOT bump three to 0.185+ until `postprocessing` widens its range, or selective bloom (#4) will break/peer-warn.
- **Turbopack (Next 16 default bundler):** three is large but ESM; no `transpilePackages` needed for three itself in normal cases. Known Turbopack issue is specifically `transpilePackages` being ignored for **internal monorepo packages** (vercel/next.js#85316) — does not affect a plain `node_modules` install of three. If you DO add `transpilePackages`, watch for the conflict error when a package is also in `serverExternalPackages`.
- Pin three exactly (`three@0.184.0`) rather than `^` to avoid an unattended bump past the postprocessing ceiling.
- Sources: https://github.com/mrdoob/three.js/releases · https://registry.npmjs.org/postprocessing/latest · https://github.com/vercel/next.js/issues/85316 · https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages

### 3. @react-three/drei — 10.7.7 (current stable, pairs with fiber v9)
- peerDeps confirm the pairing: `@react-three/fiber ^9.0.0`, `react ^19`, `three >=0.159`. (A v11 alpha exists but is pre-release; **stay on 10.x stable**.)
- Components requested all exist in 10.x: `MeshTransmissionMaterial`, `MeshDistortMaterial`, `Line`, `QuadraticBezierLine`, `Environment`, `useGLTF`, `AdaptiveDpr`, `PerformanceMonitor`. No major renames in the 10.x line vs. the names you have.
- **Gotcha:** `MeshTransmissionMaterial` had a documented feedback-loop bug against fiber v9 RC (drei#2261); resolved in stable v9 + drei 10.x — make sure you're on fiber 9.6.x stable, not an RC.
- For the signature scroll line, `drei`'s `<Line>`/`<QuadraticBezierLine>` use `meshline` under the hood (resolution-aware, supports `dashed`, `vertexColors`); good for the gradient/glow tube approach.
- Sources: https://github.com/pmndrs/drei/releases · https://registry.npmjs.org/@react-three/drei/latest · https://github.com/pmndrs/drei/issues/2261

### 4. @react-three/postprocessing 3.0.4 + postprocessing 6.39.1
- postprocessing@3.0.4 deps: `postprocessing ^6.36.6`, `maath ^0.6.0`, `n8ao ^1.9.4`; peers `@react-three/fiber ^9.0.0`, `react ^19.0`, `three >= 0.156.0`. Standalone `postprocessing` latest = 6.39.1 (the 3.0.4 wrapper's `^6.36.6` accepts it).
- **Selective bloom — current canonical approach:** Bloom is selective *by default*. You do NOT use a separate `SelectiveBloom`/`Selection` component anymore — instead set `<Bloom luminanceThreshold={1} mipmapBlur intensity={...} />` and make only the meshes you want to glow exceed the 0–1 color range (`emissive`, `emissiveIntensity > 1`, `toneMapped={false}`). `mipmapBlur` is the recommended high-quality blur path. The legacy `Selection`/`Select`/`SelectiveBloom` API still exists but is the older pattern — prefer the threshold-+-HDR-color method for the scroll line glow.
- Perf: keep `EffectComposer` effect count low on mobile; gate Bloom/Noise/Vignette behind a device tier check (`PerformanceMonitor` + `AdaptiveDpr`).
- **Three ceiling reminder:** postprocessing 6.39.1 = `three < 0.185.0`. This is the binding constraint for the whole stack's three version.
- Sources: https://react-postprocessing.docs.pmnd.rs/effects/bloom · https://react-postprocessing.docs.pmnd.rs/effects/selective-bloom · https://registry.npmjs.org/@react-three/postprocessing/latest · https://registry.npmjs.org/postprocessing/latest

### 5. GSAP — 100% free in 2026 (Webflow)
- Confirmed: post-Webflow acquisition, **all** GSAP plugins are free for commercial use — **SplitText, ScrollSmoother, ScrollTrigger, MorphSVG**, etc. No Club membership / token registry needed; install plain `gsap` from public npm.
- Caveat: "free" ≠ OSS — IP remains Webflow's under the GreenSock Standard License; fine for a client site.
- `@gsap/react` (`useGSAP`) latest = 2.1.2, React 19 compatible. Canonical usage: `useGSAP(() => { ... }, { scope: containerRef, dependencies: [...] })` — handles cleanup/`gsap.context` automatically; works in `'use client'` components.
- Sources: https://gsap.com/pricing/ · https://webflow.com/blog/gsap-becomes-free · https://gsap.com/community/standard-license/

### 6. Lenis — 1.3.23 is current (your installed version is up to date)
- npm `lenis@latest` = **1.3.23**; no newer release. Old `@studio-freight/lenis` / `@studio-freight/react-lenis` are **deprecated** — use the `lenis` package and `lenis/react` (`ReactLenis` / `useLenis`).
- **Single RAF loop (R3F):** set `autoRaf: false` on Lenis and drive `lenis.raf()` from one loop. Two accepted canonical forms:
  - Drive from R3F: `useFrame((_, delta) => lenis.raf(performance.now()))` (or pass ms time), with `autoRaf:false`.
  - Drive from gsap.ticker (preferred when ScrollTrigger is in play):
    ```js
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
    ```
- **Confirmed canonical ScrollTrigger sync** is exactly the `lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker.add(... lenis.raf(time*1000))` + `lagSmoothing(0)` pattern. Pick ONE driver (gsap.ticker OR useFrame) to keep a single RAF — don't run both plus `autoRaf:true`.
- Deprecated option: `smoothTouch` → use `syncTouch: true`.
- Sources: https://github.com/darkroomengineering/lenis · https://registry.npmjs.org/lenis/latest · https://gsap.com/community/forums/topic/40426-patterns-for-synchronizing-scrolltrigger-and-lenis-in-reactnext/

### 7. zustand — 5.0.14 (current)
- peer `react >=18`; React 19 fully supported. v5 dropped React <18, dropped bundled `use-sync-external-store` (uses native `useSyncExternalStore`), dropped TS <4.5 and ES5.
- **Breaking note:** `create` no longer takes a custom equality fn — use `createWithEqualityFn` (from `zustand/traditional`) if you need one, or the `useShallow` selector wrapper (`zustand/shallow`) to avoid infinite-loop re-renders when a selector returns a new object/array.
- Use `useStore(useShallow(s => [...]))` for multi-value selectors (scroll progress, loading phase, audio, language).
- Sources: https://pmnd.rs/blog/announcing-zustand-v5/ · https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5 · https://registry.npmjs.org/zustand/latest

### 8. leva — 0.10.1, maintained, React 19 OK
- Still maintained; peer `react ^18.0.0 || ^19.0.0`. The earlier React 19 peer-warning (Radix deps, leva 0.10.0, issue #539) was fixed in **0.10.1** — install 0.10.1+.
- Keep as a **devDependency** and gate panels behind `process.env.NODE_ENV !== 'production'` so they tree-shake out of the prod bundle.
- Alternative if leva ever breaks: `react-tweakpane` (MelonCode, actively maintained) wrapping `tweakpane`. Not needed at 0.10.1.
- Sources: https://github.com/pmndrs/leva/releases · https://github.com/pmndrs/leva/issues/539 · https://registry.npmjs.org/leva/latest

### 9. gltf-transform CLI 4.4.0 + gltfjsx 6.5.3
- Package: `@gltf-transform/cli@4.4.0`, binary name `gltf-transform`. gltfjsx = `6.5.3`, binary `gltfjsx`.
- **Compression CLI invocations:**
  - One-shot web optimize (Draco + prune + resize, the common path): `gltf-transform optimize in.glb out.glb --compress draco --texture-compress ktx2`
  - Meshopt instead of Draco: `gltf-transform meshopt in.glb out.glb --level high`
  - Draco only: `gltf-transform draco in.glb out.glb --method edgebreaker`
  - KTX2/Basis textures, two-codec strategy (UASTC for normals, ETC1S for color):
    `gltf-transform uastc in.glb tmp.glb --slots "{normalTexture}" --level 4 --rdo --zstd 18`
    then `gltf-transform etc1s tmp.glb out.glb --quality 255`
- **gltfjsx for typed React components:** `npx gltfjsx Model.glb --types --transform` → `--types/-t` adds TypeScript defs, `--transform/-T` runs gltf-transform (draco+prune+resize) producing an optimized `.glb` alongside the typed component. Other useful flags: `--instance/-i`, `--instanceall/-I` (instancing), `--keepnames/-k`, `--simplify/-S`, `--resolution/-R 1024`, `--keepmaterials/-M`, `--root/-r <publicPath>`, `--shadows/-s`.
- Sources: https://gltf-transform.dev/ · https://registry.npmjs.org/@gltf-transform/cli/latest · https://github.com/pmndrs/gltfjsx (README) · https://registry.npmjs.org/gltfjsx/latest

### 10. R3F + Next 16 persistent Canvas / page transitions — 2026 canonical approach
- **SSR rule (hard requirement):** in Next 16 App Router, `dynamic(() => import('./Scene'), { ssr: false })` is **NOT allowed inside a Server Component** — throws `ssr: false is not allowed with next/dynamic in Server Components`. Canonical fix: put the `dynamic(..., { ssr:false })` call inside a `'use client'` **wrapper component**, then import that wrapper from the server component / layout. three.js must be client-only to avoid `window`/WebGL SSR errors.
- **Persistent Canvas across routes — canonical pattern:** mount ONE `<Canvas>` in the **root layout** (`app/layout.tsx`), fixed/absolute fullscreen, behind the DOM content (`aria-hidden`, `pointer-events` managed). Because `app/layout.tsx` does not remount on route navigation, the WebGL context, camera, and scene survive route changes — no context loss, no camera reset.
- Drive per-page 3D via drei `<View>` (the `track`-based API is deprecated; use **inline Views**): root Canvas renders `<View.Port />` with `eventSource` pointing at the shared container; each route drops `<View>` elements into its DOM where 3D should appear. `gl.scissor` partitions one performant context across many on-page viewports.
- `tunnel-rat` is the complementary tool to teleport per-page R3F JSX up into the single persistent Canvas (render-prop tunnel) when you want one continuous scene rather than scissored viewports — use it for the cross-route signature-line continuity; use `<View>` when sections need independent framed scenes.
- For route-transition crossfades, animate a DOM overlay (GSAP/Framer Motion `AnimatePresence`) over the persistent Canvas rather than unmounting the Canvas.
- Sources: https://github.com/PostHog/posthog/issues/26016 · https://nextjs.org/docs/app/guides/lazy-loading · https://drei.docs.pmnd.rs/portals/view · https://github.com/pmndrs/react-three-fiber/discussions/3221

## c) Version pins to AVOID known breakage (summary)
| Package | Pin | Reason |
|---|---|---|
| `three` | `0.184.0` (exact) | `postprocessing@6.39.1` requires `<0.185.0`; 0.185+ breaks selective bloom / peer deps |
| `react` / `react-dom` | `19.0`–`19.2.x` (do not go 19.3+) | fiber 9.6.1 peer is `>=19 <19.3`; React 19.3 reconciler bump unsupported |
| `@react-three/fiber` | `9.6.1` | React 19 line; v8 incompatible with React 19/Next 16 |
| `@react-three/drei` | `10.7.7` (stable) | v11 is alpha/pre-release; 10.7.7 already peers fiber `^9` |
| `@react-three/postprocessing` | `3.0.4` + `postprocessing 6.39.1` | wrapper pins `postprocessing ^6.36.6`; together they cap three |
| `leva` | `>=0.10.1` | 0.10.0 emits React 19 peer warnings; fixed in 0.10.1 |
| `zustand` | `5.0.14` | use `useShallow` / `createWithEqualityFn`; `create` dropped custom equality fn |
| Lenis RAF | `autoRaf:false` + single driver | running both gsap.ticker and useFrame (or autoRaf true) = double RAF/jank |

**Cross-cutting Next 16 / Turbopack notes:** no `transpilePackages` needed for three/fiber in a standard `node_modules` install; only add it for monorepo-internal packages (and Turbopack currently ignores it for those — vercel/next.js#85316). Keep all R3F-touching files `'use client'`; isolate the `dynamic(ssr:false)` call in a client wrapper imported by the root layout where the persistent Canvas lives.