# API notes — framer-motion v12.40 + Radix Dialog v1.1.15 (context7-verified)

Researched via context7 for the installed versions. Source of truth for the
menu-overlay implementation so we don't code against stale APIs.

## framer-motion 12.40 (this repo uses the `framer-motion` package, NOT `motion`)

- **Import from `"framer-motion"`** — valid in v12 (compatibility alias). The
  `motion/react` path only resolves if the `motion` package is installed; it is
  NOT here. Existing repo code (`reveal-on-scroll.tsx`, `interactive-audit.tsx`,
  `audit-section.tsx`) all import from `"framer-motion"`. Match that.
- `"use client"` required in any file using `motion.*` / `AnimatePresence` /
  hooks (navbar already has it).
- **Variants / stagger**: orchestration props live inside a variant's
  `transition`: `staggerChildren` (gap between children, s), `delayChildren`
  (delay before first child), `staggerDirection` (1 | -1), `when`
  (`beforeChildren` | `afterChildren`). Children **inherit** the parent's active
  variant by name — do NOT hard-code `animate` on each child; just give them
  `variants` with matching state keys.
- **AnimatePresence**: each direct child needs a stable `key` + an `exit` prop;
  the conditional (`{open && …}`) must be a direct child. `mode` `sync`(default)
  /`wait`/`popLayout`. `initial={false}` skips first-mount entry (we want entry,
  so omit it).
- **useReducedMotion()** → boolean. Swap motion-heavy props (y translate, stagger)
  for opacity-only when true.
- Repo ease convention: `const EASE = [0.16, 1, 0.3, 1] as const;` (mirrors
  `--ease-entrance`). Reuse it.

## @radix-ui/react-dialog 1.1.15

- Import `import * as Dialog from "@radix-ui/react-dialog"` (standalone package
  installed; the `radix-ui` meta-package is docs-only).
- Anatomy: `Root > Trigger | Portal(> Overlay, Content(> Title, Description,
  Close))`.
- **`modal` defaults to `true`** → focus-trap, body scroll-lock, outside-inert,
  and **return-focus-to-trigger** are automatic. Do NOT reimplement them (would
  fight Radix). This satisfies the spec's "focus-trap / Esc / scroll-lock / aria
  gratis".
- **`Dialog.Title` is effectively required** — Radix warns without it. Use a
  visually-hidden (`sr-only`) Title. `Description` optional → pass
  `aria-describedby={undefined}` on `Content` to silence its warning.
- `Trigger` auto-sets `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`,
  `data-state`. Our explicit `aria-label` coexists.
- Controlled: `<Dialog.Root open onOpenChange>` — `onOpenChange` fires for ALL
  close paths (trigger, Esc, outside-click, Close, programmatic). Drive state
  from it.
- Dismissal overrides (not needed here): `e.preventDefault()` in
  `onEscapeKeyDown` / `onPointerDownOutside` / `onInteractOutside`.

### Canonical Radix + framer-motion exit pattern (forceMount + AnimatePresence)

CSS exit animations need NO forceMount (Radix suspends unmount until the
`data-state="closed"` keyframes finish). For a JS lib that owns unmount timing
(framer `AnimatePresence`), set `forceMount` on the Radix parts so Radix doesn't
race AnimatePresence, and gate render on `open` inside `<AnimatePresence>`:

```tsx
<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
  <AnimatePresence>
    {open && (
      <Dialog.Portal forceMount>
        <Dialog.Overlay asChild forceMount>
          <motion.div key="backdrop" initial animate exit />
        </Dialog.Overlay>
        <Dialog.Content asChild forceMount aria-describedby={undefined}>
          <motion.div key="panel" initial animate exit>
            <Dialog.Title className="sr-only">…</Dialog.Title>
            …
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    )}
  </AnimatePresence>
</Dialog.Root>
```

Classic bug if you forget forceMount: dialog vanishes instantly with no exit
animation (Radix unmounts before AnimatePresence runs exit). `asChild` requires a
single child that forwards ref/props — `motion.div` qualifies. Portal renders to
`document.body`, so position Overlay/Content with `fixed` + high z-index.

## Project-specific wiring

- Lenis: `getLenis()` from `@/lib/lenis-singleton` returns instance|null. Stop on
  open (`getLenis()?.stop()`), resume on close (`?.start()`). Null under
  reduced-motion (native scroll) — `?.` no-ops; Radix still locks scroll.
- Tokens (Tailwind v4 `@theme`): `bg-ink` (#F4F6FA), `text-bg`/`bg-bg` (#0B1422),
  `bg-accent` (#3BE1FF), `border-rule`, `text-ink-mute`. Opacity modifiers
  (`border-rule/60`) work.
- Custom cursor reads `data-cursor="link"` from the closest ancestor → put it on
  pills + the toggle so the ring swells.
