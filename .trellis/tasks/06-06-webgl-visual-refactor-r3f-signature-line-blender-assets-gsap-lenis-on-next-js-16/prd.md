# PRD — WebGL Visual Refactor (sersan-v2)

## Goal

Bring the existing **Next.js 16** site to Lusion-level visual/interaction quality per `AGENTS.md` creative direction (§2–§3), **without rebuilding on Vite** (user decision 2026-06-06) and **without changing any copy** (user decision 2026-06-06: hero and all texts stay as on the current site, NOT the AGENTS.md §5 copy).

## Hard constraints

1. **Copy freeze.** No changes to `src/data/translations/*`, section texts, headings, CTAs. The refactor is visual/interaction only.
2. **Framework stays Next.js 16 App Router** (React 19.2, Tailwind v4). R3F lives in client islands; SSR'd content (H1, poster) must be preserved for SEO/LCP.
3. **Version pins (from research/stack-research.md):** `three@0.184.0` (exact — postprocessing caps at <0.185), `@react-three/fiber@9.6.1`, `@react-three/drei@10.7.7`, `@react-three/postprocessing@3.0.4` + `postprocessing@6.39.1`, `zustand@5.0.14`, `@gsap/react@2.1.2`, `leva@>=0.10.1` (dev), `@gltf-transform/cli@4.4.0` + `gltfjsx@6.5.3` (dev). React must stay 19.0–19.2 (NOT 19.3+).
4. **Single RAF loop:** R3F `useFrame` pumps `lenis.raf()`; Lenis singleton gets `pumpExternally` flag; `lenis.on('scroll', ScrollTrigger.update)` bridge stays.
5. **Performance budget:** 60fps desktop, Lighthouse mobile ≥80, tiered degradation (desktop / weak GPU / mobile / prefers-reduced-motion per research/signature-line-spec.md §6). Canvas `aria-hidden`, `pointer-events:none`, content readable by screen readers.
6. **Package manager:** Vercel builds with bun (`vercel.json` pins `bun install`/`bun run build`); local machine has only npm. Either install bun locally to keep `bun.lock` authoritative, or switch `vercel.json` to npm — must be resolved in M0, never let the two lockfiles diverge silently.

## Architecture (decided)

- **Persistent Canvas** mounted in `src/app/layout.tsx` inside `SmoothScrollProvider`, sibling-before `<main>`; `dynamic(..., {ssr:false})` inside a `'use client'` wrapper (`src/webgl/CanvasHost.tsx`). Survives route changes.
- **New code under `src/webgl/`** per research/signature-line-spec.md §1: CanvasHost, Scene, SignatureLine, materials/lineShader.ts (inline GLSL — Turbopack-safe), PostFX, FrameDriver, curves/routeCurves.ts, store/scrollStore.ts, store/tierStore.ts, hooks/useSectionAnchors.ts, debug/LineDebug.tsx (leva, dev-only).
- **Signature line:** CatmullRomCurve3 from DOM-anchored waypoints (`[data-line-anchor]` per section), TubeGeometry + custom shader (uProgress draw mask, cyan→violet gradient, additive, toneMapped:false), Bloom via luminance threshold (approach A), Noise + Vignette.
- **Scroll plumbing:** zustand transient store (progress, velocity, reveal, pathname); writes from `lenis.on('scroll')`; reads via `getState()` in `useFrame` (no React re-renders).
- **Hero:** procedural "Signal Core" (icosahedron + MeshTransmissionMaterial shell + emissive gradient core) per research/asset-plan.md §2 Candidate A; Hyper3D Rodin GLB (Candidate C) only as optional upgrade experiment via Blender MCP. HDRI: PolyHaven studio 1k, `<Environment background={false}>`, <500KB.
- **Trust pipeline:** SVG + GSAP (NOT 3D) per research/asset-plan.md §3; the signature line threads through as conduit.
- **Particles:** one shared GPU field (THREE.Points + vertex-shader animation), tiered counts (4000/1200/400/off).
- **Route transitions:** Canvas persists; thin `app/template.tsx` wraps DOM children only; GSAP curtain + line uReveal fade/re-curve keyed on `usePathname()`.
- **Deletions:** `neural-net-layer.tsx`, `cinematic-overlay.tsx` (desktop), dead planet assets (`public/cinematic/*` ~5.7MB + orphaned planet images), `next-themes` dep. **Keep** `orb-core.webp` as SSR/LCP poster + mobile/RM fallback.

## Milestones

- **M0 Foundations:** package-manager alignment; pinned deps install; palette tokens (navy `#0B1422`, accent cyan `#3BE1FF`, new `--accent-2` violet `#7C5CFF`); themeColor; fonts (pending user decision: Editorial New/Switzer/JBM vs current Geist); zustand stores; Lenis singleton `pumpExternally`; SmoothScrollProvider RM rework. Commit per step.
- **M1 Signature line (PRIORITY per AGENTS.md §6.5):** CanvasHost + FrameDriver + SignatureLine + PostFX + tier system + body-bg transparency fix + leva debug. QA: Chrome screenshots multi-viewport, clean console, fps check. Make it excellent before proceeding.
- **M2 Hero Signal Core + particles:** procedural hero replacing NeuralNetLayer/CinematicOverlay backdrop inside CinematicSystemScroll (structure + copy unchanged); HDRI; mouse parallax + scroll recede; particle field. Optional Hyper3D experiment.
- **M3 Route transitions:** template.tsx GSAP enter (DOM) + line uReveal fade/re-curve keyed on pathname (WebGL), one shared beat. **Preloader intentionally omitted** (decision 2026-06-07, under user's carte blanche): the scene is 100% procedural — zero assets to load — so a percentage preloader would be fake; the poster→planet crossfade serves as the hero load-in. Revisit with drei useProgress only if GLB/HDRI assets return (e.g. Hyper3D hero upgrade).
- **M4 Inner pages:** per-route curves (consulting/audit/case-studies/about/contact/trust/resources); Trust SVG pipeline; reveal consolidation framer→GSAP where touched; SplitText-style reveals keyed by `language` (EN/IT desync fix, recon §7).
- **M5 Polish + ship:** dead-asset cleanup, AdaptiveDpr/PerformanceMonitor/frameloop demand, a11y (contrast AA on new palette, focus states), vercel.json cache headers for .glb/.hdr/.ktx2 if used, Lighthouse, prod build, Vercel preview deploy, README.

## QA protocol (every milestone)

Claude in Chrome: screenshots desktop+tablet+mobile viewports, console clean, scroll states verified. No milestone is "done" without visual proof. Compare against lusion.co quality bar.

## Acceptance criteria

1. Signature scroll line visible and scroll-synced on all routes, with bloom, 60fps desktop.
2. Hero Signal Core replaces the static orb backdrop on desktop; orb-core.webp poster on mobile/RM.
3. All copy byte-identical to pre-refactor (EN and IT).
4. All existing routes/forms/SEO intact (sitemap, metadata, OG images, API routes untouched).
5. Lighthouse mobile ≥80; prefers-reduced-motion gets a fully static, readable site.
6. Clean console on every route at every viewport.

## Gate decisions (user, 2026-06-07)

1. Typography: **brand fonts** — Editorial New (display) / Switzer (body) / JetBrains Mono (mono), replacing Geist. Verify how the live v1 site (sersan.io) loads them and mirror that via next/font.
2. Palette: **migrate** to navy `#0B1422` + cyan `#3BE1FF` → violet `#7C5CFF` accent gradient; expose in leva for live tuning during M1.
3. Hero: **procedural Signal Core first**; Hyper3D/Blender only as upgrade if the procedural doesn't pass visual review.
