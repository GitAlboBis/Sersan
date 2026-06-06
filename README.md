# SerSan v2

Next.js + React Three Fiber site for SerSan — production-grade AI systems studio.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19, TypeScript
- Tailwind CSS v4 (CSS-first config)
- React Three Fiber + drei (hero 3D scene)
- IntersectionObserver-based reveals (CSS keyframes, not Framer Motion)
- Radix primitives for the mobile nav dialog

## Getting started

```bash
bun install      # or npm install / pnpm install
bun run dev      # http://localhost:3000
bun run build    # production build
bun run start    # serve the production build
```

No environment variables required.

## Project structure

```
src/
  app/                    Next.js App Router pages + metadata + globals.css
  components/
    hero.tsx              Hero with CSS fade-up reveals
    navbar.tsx            Fixed nav (Work / Services / Process / Trust / Contact)
    footer.tsx            Footer (newsletter, social, legal)
    scene/
      hero-scene.tsx      R3F procedural topology (lightweight placeholder)
    sections/             Homepage sections (server components)
      credibility-strip.tsx
      services-section.tsx
      fit-section.tsx
      process-section.tsx
      case-studies-section.tsx
      trust-section.tsx
      final-cta.tsx
    ui/
      button.tsx          CVA variants (hero, heroOutline, outline, ghost, link...)
      reveal.tsx          IntersectionObserver fade-up wrapper
      section-heading.tsx Eyebrow + title + description
  data/                   Translations, founder data, etc.
```

## Adding the real hero 3D model

When the 3D artist delivers the Blender-exported GLB:

1. Drop the file at `public/models/sersan-topology.glb`.
2. Update `src/components/scene/hero-scene.tsx` to load it via
   `useGLTF("/models/sersan-topology.glb")` (currently the scene is procedural).
3. Tune scale, position, lighting under the `// --- Tunables ---` block at the
   top of the file.

Target sizes: under 5 MB compressed; absolute max 10–15 MB for the first
homepage version. Mobile already short-circuits to a static gradient — keep
that fallback so phones never pay the GLB cost.

## Deploying to Vercel

The project builds cleanly with `bun run build` and has no runtime env vars.
Push to GitHub and connect the repo to Vercel — the default Next.js
configuration works.

## Notes

- **No Framer Motion on the homepage.** Framer Motion 12 + Next 16 +
  Turbopack + React 19 had a bug where `motion.*` elements with `initial` /
  `animate` got stuck in their initial state. The homepage uses CSS keyframe
  `fade-up` plus an `IntersectionObserver` wrapper (`components/ui/reveal.tsx`)
  instead. The dependency is still in `package.json` and used by other pages.
- **Brass tokens kept.** `--accent-warm` is still defined for the existing
  audit/consulting/case-study pages. The new homepage uses `--accent` (cyan)
  as the primary.
