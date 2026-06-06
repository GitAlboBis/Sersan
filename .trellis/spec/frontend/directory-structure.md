# Directory Structure

> How frontend code is organized in this project. Documents reality as of the
> current codebase — Next.js 16.2.6 App Router, React 19, TypeScript strict.

---

## Overview

Single Next.js app, no monorepo. All source lives under `src/`, with the path
alias `@/*` → `./src/*` (see `tsconfig.json`). Always import via `@/…`, never
relative `../../`.

```
src/
├── app/            # Next.js App Router — routes, layouts, route handlers
├── components/     # All React components (client-first; see below)
├── data/           # Static typed content (services, case studies, i18n)
├── lib/            # Framework-agnostic utilities + singletons
└── app/globals.css # Tailwind v4 + the entire design-token system
```

There is **no** `src/hooks/`, `src/types/`, or `src/contexts/` directory. Hooks
live next to their consumers; shared types live in the `data/` file that owns
them; context providers live in `components/`.

---

## `src/app/` — routing

App Router conventions. Routes are folders with `page.tsx`. Special files in
use: `layout.tsx` (root providers + metadata), `error.tsx`, `not-found.tsx`.

- Static routes: `about/`, `contact/`, `faq/`, `privacy/`, `start/`, `trust/`, …
- Dynamic segments: `case-studies/[slug]/`, `resources/[slug]/`, `services/{architecture,automation,engineering,mlops}/`
- Route handlers: `app/api/intake/route.ts` (a `POST` endpoint)
- The homepage `app/page.tsx` composes ~11 ordered `<…Section />` components.

Real examples: [layout.tsx](src/app/layout.tsx), [page.tsx](src/app/page.tsx), [api/intake/route.ts](src/app/api/intake/route.ts).

## `src/components/` — components

Flat top-level files for one-off page furniture (`navbar.tsx`, `footer.tsx`,
`hero.tsx`, `contact-form.tsx`, providers), plus four grouped subfolders:

| Folder | Holds | Example |
|--------|-------|---------|
| `components/ui/` | Reusable design-system primitives, often Radix-wrapped | [button.tsx](src/components/ui/button.tsx), [accordion.tsx](src/components/ui/accordion.tsx) |
| `components/sections/` | Page sections (homepage + sub-pages) | [problem-section.tsx](src/components/sections/problem-section.tsx) |
| `components/scene/` | React Three Fiber scenes + GSAP, the scroll-camera hook | [hero-scene.tsx](src/components/scene/hero-scene.tsx), [use-scroll-camera.ts](src/components/scene/use-scroll-camera.ts) |
| `components/icons/` | Custom inline SVG icon components | [brand.tsx](src/components/icons/brand.tsx) |

## `src/data/` — content & types

Static content as typed TS modules, one file per entity. The type definitions
that describe each dataset live in the same file as the data (or in
`data/translations/types.ts` for i18n). See [services.ts](src/data/services.ts),
[case-studies.ts](src/data/case-studies.ts), [audit-questions.ts](src/data/audit-questions.ts),
[translations/types.ts](src/data/translations/types.ts).

## `src/lib/` — utilities

Small, framework-light helpers and singletons: [utils.ts](src/lib/utils.ts) (the
`cn()` helper) and [lenis-singleton.ts](src/lib/lenis-singleton.ts) (refcounted
Lenis smooth-scroll instance).

## Assets

Static assets in `public/` (referenced by absolute path, e.g. `/images/nebula.jpg`,
`/og-image.png`). Some are preloaded in `app/layout.tsx`.

---

## Naming Conventions

- **All filenames are kebab-case**: `start-intake-form.tsx`, `use-scroll-camera.ts`, `final-cta.tsx`. No PascalCase filenames.
- Component files end `.tsx`; pure logic / data / hook-only files end `.ts`.

## Common Mistakes

- Don't create `src/hooks/` or `src/types/` — follow the colocation convention above.
- Don't use relative imports across folders; use the `@/` alias.
- Don't PascalCase a filename to match its exported component.
