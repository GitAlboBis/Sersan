# Quality Guidelines

> Linting, testing, accessibility, performance — the project's actual quality bar.

---

## Overview

This project has **no automated test suite and no ESLint/Prettier config**.
Quality is enforced by three things instead, and they must be held to:

1. **TypeScript strict mode** — the de-facto gate. Code must type-check cleanly
   (`tsconfig.json` has `strict: true`). Don't suppress errors with `any` or
   `@ts-ignore`.
2. **A successful `next build`** — the build must pass before a change is done.
3. **Manual verification in the running app** — render the affected
   page/section and confirm behavior, since there are no tests to catch
   regressions.

> Documented reality, not an ideal: there is genuinely no Jest/Vitest/Playwright
> and no eslint config in the repo. Adding test/lint infrastructure is a
> deliberate decision, not a default — don't assume it exists.

---

## Build & verify commands

```bash
npm run dev     # next dev — local development
npm run build   # next build — MUST pass; the real CI gate
npm run start   # next start — production server
```

(Lockfile is `bun.lock`; npm scripts above are what `package.json` defines.)

---

## Accessibility

A11y is a real requirement here:

- Build interactive UI on **Radix UI** primitives (dialog, accordion, tabs,
  navigation-menu, tooltip) for keyboard + ARIA behavior. See [navbar.tsx](src/components/navbar.tsx) (mobile menu = Radix Dialog) and [accordion.tsx](src/components/ui/accordion.tsx).
- Landmark roles + labels: `<nav aria-label="Main navigation">`; real `<label>`s on inputs.
- A `.skip-to-content` link and `.sr-only` utility exist in `app/globals.css`/layout.
- **Honor `prefers-reduced-motion`** everywhere there's motion — render a static
  fallback. Enforced in CSS `@media` blocks and JS checks (e.g. [reveal-on-scroll.tsx](src/components/reveal-on-scroll.tsx), [hero.tsx](src/components/hero.tsx)).

---

## Performance & correctness patterns

- **Ref-based state** for per-frame/scroll values (R3F `useFrame`, Lenis) to
  avoid re-renders — see [use-scroll-camera.ts](src/components/scene/use-scroll-camera.ts).
- **Always clean up effects** — kill GSAP ScrollTriggers, unsubscribe Lenis,
  release the Lenis singleton ([lenis-singleton.ts](src/lib/lenis-singleton.ts)).
- **Hydration safety** — SSR-safe defaults, `typeof window` guards before
  touching browser APIs (see [language-provider.tsx](src/components/language-provider.tsx)).
- **Module-level constants** for static content (`NAV_ITEMS`, `CAMERA_PATH`,
  `FAILURES`) instead of magic strings inline.

---

## Console & debug

Production code is `console`-free. Don't leave stray `console.log`s.

---

## Convention: forms must actually deliver

A form must **POST to a real endpoint** and never silently `console.log` a payload while
showing a success state (that drops leads). Pattern: `app/api/<x>/route.ts` zod-validates
and forwards via Resend when `RESEND_API_KEY` is set (dev console fallback otherwise),
returns `{ ok }`. The client shows real **submitting / error / success** states — never a
false success on failure. Endpoints: `/api/intake` (structured brief) + `/api/contact`
(free-form). Accessibility: invalid fields get `aria-invalid` + `aria-describedby` pointing
at a stable error id, and submit moves focus to the first invalid field.
> Deploy note: `RESEND_API_KEY` must be set in the hosting env or forms log-only in prod.

---

## Design fidelity

Visual work should match the project's design language. The reference doc is
[references/8bit-ai-design-reference.md](references/8bit-ai-design-reference.md),
and the token system is in [app/globals.css](src/app/globals.css). There is also
a `sersan-design` skill for design-system rules — consult it for UI work.

---

## Headless screenshot QA (gotchas)

Visual checks via headless Chromium (npx-cached Playwright; NOT a repo dep) hit
two project-specific traps:

- **The preloader can linger when the tab is backgrounded** (headless or Chrome
  extension): the browser throttles rAF on background tabs and the preloader
  runs on the rAF loop — it is NOT stuck/broken. A real gesture
  (`mouse.click` + `mouse.wheel`) or focusing the tab unblocks it immediately.
  Before screenshotting, wait for the preloader's leaf element
  (`INITIALISING SIGNAL`) to reach effective `opacity < 0.05` / `display:none`
  up the whole ancestor chain — a fixed `waitForTimeout` is not enough.
- **Drive scroll with real `mouse.wheel` events**, not `window.scrollTo` — Lenis
  and the pinned ScrollTrigger stages respond to wheel; programmatic scrollTo can
  leave stage opacity states unsettled.
- Expected console noise (not failures): THREE deprecation warnings and
  "WebGPU is not available, running under WebGL2 backend". Page errors = failures.
  Locally `/_vercel/insights/script.js` 404s on every page (Vercel Analytics only
  exists on deploy) — filter it, don't chase it.
- **Pinned-stage elements have geometry while invisible**: spine panels are
  always in the viewport at opacity 0, so a Playwright `boundingBox()` check (or
  IO) "finds" them long before they're lit. Visibility checks inside pinned
  sections must compute **effective opacity up the ancestor chain**, not geometry.
- `locator.boundingBox()` waits up to 30s for a non-existent element — pass
  `{ timeout: ~350 }` inside wheel-hunt loops or a missing locator hangs the run.
- Counters/scrambles write via `textContent =` (replaces the text node):
  MutationObserver `characterData` sees nothing — observe `childList` or rAF-poll.
  To catch animations that fire at mount (in-view immediate-fire), attach loggers
  with `page.addInitScript`, not post-load `evaluate` (the count may already be done).
- **Scroll gates own their zones**: while HeroIntroGate or SpineExitGate is engaged,
  Lenis is stopped and `lenis.scrollTo()` is a **no-op** — a QA script that parks at
  the spine's end and expects `scrollTo` to work will silently stay put, and a wheel
  there triggers the exit dive (≈+1 viewport), which is intended behavior, not a snap
  miss. Test snap settle only between interior points, away from both gates. The
  intro gate is skippable in scripts with the double wheel-flick (two ~160px wheels
  ~350ms apart).

---

## Common Mistakes

- Assuming a test runner or eslint exists — they don't; verify via build + manual run.
- **Compliance claims drift**: the only certification claim is
  "ISO 27001 (in progress)" + DORA/EU AI Act alignment, address "London (UK)" —
  never SOC 2, never "EU (London)". `/trust` is the source of truth; any page
  mentioning compliance must match it (the /faq page drifted exactly this way).
- Suppressing strict-mode errors with `any` / `@ts-ignore`.
- Shipping `console.log` left over from debugging.
- Adding motion without a reduced-motion fallback.
- Rolling a custom interactive widget instead of using the accessible Radix primitive.
