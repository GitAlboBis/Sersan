# Type Safety

> TypeScript conventions and type organization.

---

## Overview

TypeScript **strict mode** is on (`"strict": true` in `tsconfig.json`,
`noEmit`, `moduleResolution: "bundler"`, target ES2017). The `@/*` path alias
maps to `src/*`. Type-checking is the project's primary quality gate — there is
no test suite or linter (see `quality-guidelines`), so types must carry weight.

---

## `interface` vs `type`

The codebase uses both, by role:

- **`interface`** for object/record contracts — especially component props and
  local state shapes. Name props `<Component>Props`:
  ```tsx
  // components/ui/button.tsx
  export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
      VariantProps<typeof buttonVariants> { asChild?: boolean }
  ```
  ```tsx
  // components/contact-form.tsx
  interface ContactFormState { name: string; email: string; company: string; message: string }
  ```

- **`type`** for unions, aliases, and data-record shapes in `data/`:
  ```tsx
  // data/resources.ts
  export type ResourceCategory = "article" | "guide" | "case-study" | "whitepaper";
  // data/translations/types.ts
  export type Language = "en" | "it";
  export type TranslationDictionary = Record<string, string>;
  // data/audit-questions.ts
  export type Question = { id: string; promptEn: string; promptIt: string; choices: Choice[] };
  ```

Rule of thumb: **`interface` for props/component contracts, `type` for unions and
data models.**

---

## Where types live

No central `types/` directory. A dataset's types live in the **same file** as
the data it describes (`data/services.ts`, `data/case-studies.ts`,
`data/audit-questions.ts`), and component prop types live in the component file.
Shared i18n types are the one carve-out, in
[data/translations/types.ts](src/data/translations/types.ts).

---

## Runtime validation (zod)

`zod` is a dependency but is **not currently used** anywhere. Data is statically
typed; form validation today relies on HTML5 attributes (`required`, `type`).
If you add runtime validation — the natural place is the `app/api/intake/route.ts`
request body — introduce a zod schema and infer the TS type from it
(`z.infer<typeof schema>`) rather than declaring the type twice.

---

## `any` discipline

Strict mode is respected; `any` is essentially absent. The only escapes are
deliberate, narrow assertions at boundaries:
- `(window as unknown as { __lenis?: Lenis }).__lenis` in [smooth-scroll-provider.tsx](src/components/smooth-scroll-provider.tsx)
- a dictionary cast in [language-provider.tsx](src/components/language-provider.tsx)

Prefer `unknown` + a narrowing assertion over `any`. Don't add `any` to silence
a strict-mode error.

---

## Common Mistakes

- Declaring a data type and its zod schema separately (infer from the schema).
- Reaching for `any` instead of `unknown` + assertion at a boundary.
- Creating a global `types/` folder instead of colocating.
- Props typed as `type` alias when the codebase convention is a `<Name>Props` interface.
