# Animated top-right menu overlay with hover pills

## Goal

Replace the centre nav `<ul>` (homepage anchor links) with a single, unified
**"Menu" toggle in the top-right** that opens a **full-screen animated overlay**
listing the site's real pages. Each entry is a **white pill** that, on hover,
fills with the brand **cyan** blob while the label slides off and re-enters with
an arrow. One menu for ALL breakpoints (retire the old mobile-only Dialog).
Palette: white `--ink` + cyan `--accent (#3BE1FF)`, navy `--bg` backdrop.

## What I already know (from repo inspection)

* `src/components/navbar.tsx` — single file to modify. Currently: central
  `<ul>` of `/#services|/#use-cases|/#work|/#process` anchors + a mobile-only
  Radix Dialog drawer + an IntersectionObserver tracking the active homepage
  section. The IO/active-section logic becomes dead once the anchor nav is
  removed → links now point at real routes, so `isActive` uses `pathname`.
* Radix `@radix-ui/react-dialog` and `framer-motion` are already imported /
  installed. `lucide-react` has `Menu`, `X`, `ArrowRight`.
* `START_HREF = "/start"` (from `@/lib/site`) — the CTA destination.
* `useLanguage()` → `{ language, setLanguage }`; items carry `{ label, labelIt }`.
* `cn` from `@/lib/utils`. `Button` (variant `hero`, size `lg`/`icon`, asChild),
  `Magnetic`, `SersanLogo`, `AudioToggle`, `LanguageToggle` already in the file.
* Lenis: `src/lib/lenis-singleton.ts` exposes `getLenis()` → instance|null.
  Stop with `getLenis()?.stop()` on open, resume `getLenis()?.start()` on close.
* Tokens (`src/app/globals.css`): `--ink #F4F6FA`, `--bg #0B1422`,
  `--accent 189 100% 62% (#3BE1FF)`, `--rule`, `--ink-mute`,
  `--ease-entrance: cubic-bezier(0.16, 1, 0.3, 1)`.

## Menu items (real routes, EN / IT)

| EN label   | href            | IT label   |
|------------|-----------------|------------|
| Audit      | /audit          | Audit      |
| Consulting | /consulting     | Consulenza |
| Work       | /case-studies   | Case Study |
| Writing    | /resources      | Articoli   |
| About      | /about          | Chi siamo  |
| Contact    | /contact        | Contatti   |
| Trust      | /trust          | Trust      |

## Requirements

* Remove the desktop centre `<ul>`. Add a **Menu** toggle as the rightmost item
  in the right cluster (after EN/IT · audio · Book a call on desktop).
* Toggle: `aria-expanded`, `aria-controls`, `aria-label`; icon morphs Menu → X.
* Overlay = Radix Dialog (modal) → focus-trap, Esc, return-focus, scroll-lock
  for free. Backdrop: navy `--bg` + blur, fades in. Pills **stagger** in
  (opacity + translateY, ~40–60ms progressive delay, `--ease-entrance`).
* Each pill = the 3-layer hover effect (rest: white pill / navy text →
  hover: cyan blob fills + label slides out and re-enters with `ArrowRight`).
  `overflow-hidden`, `rounded-full`, text always navy `text-bg` (AA contrast).
* Overlay footer: **Book a call** CTA (`START_HREF`) + EN/IT + audio toggle
  (these serve mobile, where they're absent from the bar).
* Desktop bar keeps EN/IT + audio + CTA visible; `<1024px` bar = logo + Menu
  toggle only (EN/IT, audio, CTA live in the overlay).
* Stop Lenis on open, resume on close (in addition to Radix scroll-lock).
* `prefers-reduced-motion`: no stagger/slide — fade only; hover state still works.

## Acceptance Criteria

* [ ] Centre anchor `<ul>` gone; no dead IntersectionObserver code remains.
* [ ] Menu toggle opens/closes overlay; Esc + backdrop click close it; focus
      returns to the toggle on close.
* [ ] 7 pills present, correct routes, stagger entrance, Menu→X icon morph.
* [ ] Hover on every pill: white→cyan blob + arrow; label readable (navy on
      cyan/white), `overflow-hidden` + `rounded-full` preserved.
* [ ] EN/IT switches labels; Book a call → `/start`; audio toggle works.
* [ ] Lenis stops on open / resumes on close; background does not scroll.
* [ ] `prefers-reduced-motion`: fade only, no slide/stagger.
* [ ] `next build` passes; browser console clean.
* [ ] Playwright screenshots at 1440px and 390px (rest + open) attached.

## Definition of Done

* `next build` green; typecheck/lint clean; browser console clean.
* Visual QA at 1440 + 390 (open & rest) via Chrome/Playwright with screenshots.
* No regression to EN/IT, audio, CTA, or the bar "scrolled" behavior.
* WebGL layer (`src/webgl/**`), intro gate, other sections untouched.

## Out of Scope

* Any change to `src/webgl/**`, the hero intro gate, or page sections.
* Adding/removing actual routes; per-page content.
* Reworking the bar's steel-panel styling beyond removing the centre nav.

## Decision (ADR-lite)

**Context**: User correction (mid-build): the menu must NOT be a full-screen
overlay — it must be a **dropdown "a tenda" that unrolls directly below the
Menu button** (top-right anchored), not a takeover.
**Decision**: A **custom disclosure dropdown** (toggle button + framer-motion
`AnimatePresence` panel). Panel is `fixed`, anchored under the bar at the
top-right gutter, `w-[min(92vw,400px)]`, and **unrolls downward** (animate
`height: 0 → auto`, `overflow-hidden` = curtain) with the pills staggering in.
**Single column** of pills (natural for a ~400px dropdown). Menu icon ⟷ X
morphs in place on the (always-interactive) toggle. Footer (CTA · EN/IT · audio)
shows only `<lg` (desktop has them in the bar; the dropdown is just the 7 pages).

**Primitive choice**: Radix Popover/DropdownMenu are NOT installed; only
`react-dialog` (modal, whose Trigger opens-only — fights an anchored toggle) and
the heavy `navigation-menu`. A small custom disclosure is the cleanest fit and
lets the toggle genuinely open/close. A11y implemented by hand:
`aria-expanded`/`aria-controls`/`aria-haspopup` on the toggle, Esc + outside-
pointer close, focus returns to the toggle, Lenis-stop + `body` scroll-lock
while open, route-change closes.
**Consequences**: Deviates from the prompt's "use Radix Dialog" (which assumed a
fullscreen modal overlay) — justified by the dropdown pivot + missing Popover.
No focus *trap* (a disclosure dropdown shouldn't trap), but focus return + Esc +
outside-click are preserved.

## Technical Notes

* New nav model: `{ href, label, labelIt }[]` of real routes. `isActive(href)`
  = `pathname === href || pathname.startsWith(href + "/")`.
* Pill hover technique taken verbatim from the prompt snippet, retokenised:
  `bg-ink` rest, `bg-accent` blob, `text-bg` label, `border-rule/60`.
* framer-motion: `AnimatePresence` + `motion.*` variants with
  `staggerChildren`; gate stagger/slide behind a reduced-motion check.
* Verify current framer-motion v12 + Radix Dialog APIs via context7 before
  coding (project rule: no code against stale APIs).
</content>
</invoke>
