# State Management

> State library, patterns, and what lives where.

---

## Overview

**No global state library** (no Redux, Zustand, Jotai, etc.). State is plain
React: local `useState` for component state, **React Context** for the one piece
of truly global state (language/i18n), and **refs** for high-frequency
animation values.

---

## Where state lives

| Kind of state | Mechanism | Example |
|---------------|-----------|---------|
| Component-local UI/form state | `useState` | `ContactFormState` in [contact-form.tsx](src/components/contact-form.tsx) |
| App-global (language) | React Context provider + `use*` hook | [language-provider.tsx](src/components/language-provider.tsx) |
| Per-frame animation / scroll | `useRef` (not state) | [use-scroll-camera.ts](src/components/scene/use-scroll-camera.ts) |
| Cross-component scroll engine | Refcounted singleton module | [lenis-singleton.ts](src/lib/lenis-singleton.ts) |

---

## Context pattern (i18n)

The only Context provider. It:
- starts from an **SSR-safe default** (`"en"`) and syncs the real value from
  localStorage/cookie inside an effect, to avoid hydration mismatch;
- exposes `{ language, setLanguage, t }`;
- is consumed through the guarded `useLanguage()` hook.

Providers are nested at the root in [app/layout.tsx](src/app/layout.tsx):

```tsx
<LanguageProvider>
  <SmoothScrollProvider>
    <Navbar />
    <main>{children}</main>
    <Footer />
  </SmoothScrollProvider>
</LanguageProvider>
```

Translation dictionaries live in [data/translations/en.ts](src/data/translations/en.ts)
and `it.ts`; the `Language` / `TranslationDictionary` types in
[data/translations/types.ts](src/data/translations/types.ts).

---

## Theming

There is **no `next-themes`** runtime (the package is present but unused). The
site is a single dark theme expressed entirely as **CSS variables** in
[app/globals.css](src/app/globals.css):

- Surfaces: `--bg`, `--surface`, `--surface-elev`
- Ink: `--ink`, `--ink-mute`, `--ink-dim`
- Rules: `--rule`, `--rule-warm`
- Accent: `--accent` (`#29A3F5` electric blue), `--accent-dark`, `--accent-warm`, `--refusal`
- shadcn-compat aliases: `--background`, `--foreground`, `--primary`, `--border`, `--ring`, …

Consume via Tailwind: `bg-[hsl(var(--accent))]`, `text-ink-mute`, etc. To change
the palette, edit the tokens — don't introduce per-component color state.

---

## Common Mistakes

- Reaching for a state library; React Context + local state is the convention.
- Adding a second Context for something that's really component-local.
- Forgetting the SSR-safe default → hydration mismatch.
- Storing animation/scroll values in `useState` instead of refs.

---

## Convention: every user-facing string is bilingual (EN/IT)

The site ships English + Italian. **No user-facing string may be hardcoded in one
language.** Two mechanisms, by source:

- **Component copy** → `const { language } = useLanguage(); const isEn = language === "en";`
  then `{isEn ? "English" : "Italiano"}`. Covers headings, labels, buttons, placeholders,
  aria text, error/success messages. The component must be `"use client"`.
- **Data copy** (`src/data/*.ts`) → add an `*It` counterpart for every rendered field
  (`title`+`titleIt`, `summary`+`summaryIt`, metric `label`+`labelIt`, etc.), following
  `case-studies.ts` / `services.ts`. Detail pages select the IT field when `!isEn`; the
  server `page.tsx` keeps `generateStaticParams`/`generateMetadata` and delegates rendering
  to a `"use client"` wrapper that reads `useLanguage()`.

**SSR/default is English** — `LanguageProvider` starts at `"en"` server-side and syncs the
real preference (cookie/localStorage) client-side, so `lang` never causes a hydration
mismatch. Do NOT read the language cookie in the root layout (it forces the whole site to
dynamic rendering — keep pages static).

**Common mistake:** adding `useLanguage()` for a component's CTA but leaving its body copy
hardcoded English — translate the WHOLE component, not just the button.
