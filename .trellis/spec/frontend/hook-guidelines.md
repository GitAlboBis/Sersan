# Hook Guidelines

> Custom hook naming, location, and patterns.

---

## Overview

This project uses **few custom hooks** and **no hooks library/folder**. Hooks
live next to the components that consume them, not in a central `src/hooks/`.
Standard React hooks (`useState`, `useEffect`, `useRef`, `useContext`) cover
most needs.

---

## Naming & Location

- Always prefix with `use*` (`useScrollCamera`, `useLanguage`).
- A hook shared across a folder gets its own file in that folder, e.g.
  [components/scene/use-scroll-camera.ts](src/components/scene/use-scroll-camera.ts).
- A hook tied to one provider lives in that provider's file, e.g. `useLanguage`
  in [components/language-provider.tsx](src/components/language-provider.tsx).
- A one-off hook used by a single component can be a small inline function in
  that component's file (e.g. the local `useReducedMotion` in
  [components/scene/hero-scene.tsx](src/components/scene/hero-scene.tsx)).

---

## Patterns

**1. Context hook with a guard.** A `use<Context>` hook reads the context and
throws if used outside its provider — no silent `undefined`:

```tsx
// components/language-provider.tsx
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
```

**2. Ref-based state for hot paths.** Animation/scroll hooks that feed
`useFrame` or scroll listeners expose values through **refs**, not `useState`,
to avoid re-rendering React on every frame. See `useScrollCamera`, which returns
`{ progress, sample }` backed by refs in
[use-scroll-camera.ts](src/components/scene/use-scroll-camera.ts).

**3. Effects always clean up.** Every `useEffect` that subscribes, schedules, or
acquires a resource returns a teardown: unsubscribe Lenis listeners, kill GSAP
ScrollTriggers, release the Lenis singleton. See [smooth-scroll-provider.tsx](src/components/smooth-scroll-provider.tsx)
and [lenis-singleton.ts](src/lib/lenis-singleton.ts) (refcounted acquire/release).

**4. Respect `prefers-reduced-motion`.** Motion hooks/effects check it and bail
to a static path early.

---

## Common Mistakes

- Creating a `src/hooks/` directory (colocate instead).
- Driving per-frame animation values through `useState` (use refs).
- Effects without cleanup — especially scroll/GSAP/Three subscriptions.
- A context hook that returns `undefined` instead of throwing.
