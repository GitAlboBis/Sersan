# Sersan v2 — port guide

Reference for agents porting components from `/Users/alex/sersan web/sersan-scale-ai/` (Vite + RR) to `/Users/alex/sersan web/sersan-v2/` (Next.js 16 App Router).

## Stack

- **Next.js 16.x** (App Router). `params` and `searchParams` are **Promises** — must be `await`ed. `PageProps` / `LayoutProps` are global helpers (e.g. `PageProps<'/blog/[slug]'>`).
- **React 19**
- **TypeScript strict**
- **Tailwind v4** with CSS-first config (see `src/app/globals.css`). Use color tokens like `bg-bg`, `bg-surface`, `bg-surface-elev`, `text-ink`, `text-ink-mute`, `border-rule`, `border-rule-warm`, `text-accent-warm`, `bg-accent-warm`. Old shadcn names also work (`bg-primary` = brass, `bg-background` = midnight).
- **Lucide React** for icons (`lucide-react`)
- **Framer Motion** ONLY for micro-interactions (not scroll). For scroll → GSAP ScrollTrigger (when we get to scrollytelling).

## File conventions

- Pages: `src/app/<route>/page.tsx`
- Layouts: `src/app/<route>/layout.tsx`
- Data: `src/data/*.ts` (case-studies, founders, audit-questions, translations)
- Components: `src/components/*.tsx`, UI primitives in `src/components/ui/*`
- Utilities: `src/lib/utils.ts` (has `cn()`)
- Assets in `/public` — reference as absolute paths (`/founders/alessandro.webp`), no imports.

## Server vs Client components

**Default to server components.** Add `"use client"` ONLY when you need:
- React hooks (`useState`, `useEffect`, `useRef`, etc.)
- Browser APIs (`window`, `document`, `localStorage`)
- Event handlers (`onClick` etc., except on form actions)
- Framer Motion or any browser-only library
- React Context consumers

Section components that have animations/state → client. Pure-content sections → server.

## Migrating from React Router

| Old (Vite) | New (Next 16) |
| --- | --- |
| `<Link to="/foo">` from `react-router-dom` | `<Link href="/foo">` from `next/link` |
| `useLocation()` | `usePathname()` from `next/navigation` |
| `useNavigate()` | `useRouter()` from `next/navigation` |
| `<Helmet>` from `react-helmet-async` | `export const metadata: Metadata` in page.tsx |
| `import logo from '@/assets/logo.png'` | Put in `/public/logo.png`, reference as `/logo.png` |
| `lazy(() => import(...))` for routes | Next handles automatically. For client components use `dynamic()` from `next/dynamic` only when needed |

## Migrating Helmet → metadata API

Pages get a `metadata` export instead of `<Helmet>`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audit · Sersan",
  description: "...",
  alternates: { canonical: "/audit" },
};
```

The root layout already sets defaults via `metadata.template = "%s · Sersan"`.

## Language (EN/IT)

The v1 site uses a React `LanguageContext` with translations in `src/data/translations/`. For v2 we'll add a simple client `LanguageProvider` that reads from cookies/localStorage and renders children. Pages remain server components and use a `lang` URL param later if needed.

For now: client components can `import { useLanguage } from "@/components/language-provider"` (once built) and switch.

## Design tokens — quick reference

```
bg-bg           = page midnight base
bg-surface      = elevated card
bg-surface-elev = top-tier card (metrics, modals)
text-ink        = warm cream foreground
text-ink-mute   = muted ink
border-rule     = quiet hairline
border-rule-warm = brass hairline
text-accent     = cyan (quiet status only)
text-accent-warm = brass (the personality)
bg-accent-warm  = brass
```

Typography utility classes (defined in globals.css):
- `.heading-display` — clamp(2.5rem, 6vw, 5.75rem) Editorial New
- `.heading-1` / `.heading-2` / `.heading-3`
- `.eyebrow` — small mono uppercase
- `.font-display` — Editorial New on any element

Button variants (`@/components/ui/button`):
- `default` — brass solid (primary CTA in body sections)
- `hero` — brass with inset highlight + brass shadow (the signature)
- `heroOutline` — brass-edged ghost (paired with `hero`)
- `outline` — brass border ghost
- `ghost` / `link` / `secondary` / `destructive`

Section dividers:
- `<div className="section-divider" />` — brass scribe with center node

## What NOT to bring forward from v1

- `react-router-dom` (replaced)
- `react-helmet-async` (replaced — but installed for now in case any util needs it)
- `Lovable-tagger`
- Any `glass-card*`, `gradient-text`, `gradient-sweep` class — those were legacy no-ops in v1
- The `electric-magenta` / `neon-purple` / `cyber-cyan` color aliases
- Multiple canvas backgrounds — v2 will have one neural-network scene (not yet built)

## Animations baseline

- Hero word-by-word clip-path reveal: keep, port to Framer Motion in a `"use client"` component
- Counter animations: keep, port
- `RevealOnScroll`: rebuild as small client component using Framer's `whileInView` (or `useInView`)
- Scroll-driven story sections will use GSAP ScrollTrigger (not yet wired)

## Repo state right now (Phase 0)

- ✓ Scaffold: Next 16 + TS + Tailwind v4 + bun
- ✓ Design tokens in `src/app/globals.css`
- ✓ Root layout with metadata + fonts (Fontshare + JBM via next/font)
- ✓ `Button` UI primitive at `src/components/ui/button.tsx`
- ✓ Data ported: case-studies, founders, audit-questions, translations
- ✓ Founder photos in `/public/founders/`
- ✓ Case study previews in `/public/case-studies/`
- ✓ OG image, favicon, manifest
- ⏳ Navbar, Footer, LanguageProvider — TODO (agents working on this)
- ⏳ Homepage hero + sections — TODO
- ⏳ Inner pages — TODO
- ⏳ Neural-network scene — Phase 2

## When porting a component

1. **Read** the v1 source at `/Users/alex/sersan web/sersan-scale-ai/src/...`
2. **Decide** server vs client (default server unless it has hooks/events/animations)
3. **Replace** imports: react-router → next, assets → public paths, Helmet → metadata in page
4. **Keep** the exact aesthetic. Editorial brass + midnight. Don't redesign — just port.
5. **Output** to mirrored path in v2 under `src/components/` or `src/app/`

Stuck on a Next 16 specific? Check `node_modules/next/dist/docs/01-app/` for canonical docs.
