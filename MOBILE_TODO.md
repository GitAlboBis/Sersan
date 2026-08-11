# MOBILE — WHAT IS LEFT TO DO

Handoff written 2026-08-11 at the end of the mobile overhaul session. Everything below
`main` at this commit is shipped and measured. This file is the queue.

Companion documents, all in the repo root:
- **`MOBILE_AUDIT.md`** — the original audit, its outcomes per phase, and the corrections it
  had to make to itself. Still the plan of record.
- **`MOBILE_HOME_SPEC.md`** — the home redesign spec from the judged design panel.
- **`MOBILE_REVIEW.md`** — the adversarial review of the whole session diff. **The four items
  in §1 below come from it and are quoted with its reasoning.**

---

## 0 · WHERE THINGS STAND

Measured live at 390×844, coarse pointer, cold build, page asserted styled:

| | Before | Now |
|---|---|---|
| Home document | 20.79 viewports | **14.46** (12,203px) |
| Hero | 4.00 vp | **1.80** |
| Services | 3.02 vp | **1.15** |
| Black hole | 2.68 vp (empty CSS imposter) | **1.80** (real WebGL, 675px scrub) |
| Fit | 1.90 vp | **1.23** |
| Horizontal overflow @320/360/390/430 | up to 190px | **0px** |
| Root font (every screen < 1529px) | 13px | **16px** |
| `<Input>` / `size="lg"` | 35.8 / 39px | **44 / 48px** |
| iOS zoom-triggering controls | 16 site-wide | **0** |

Desktop verified unchanged on a cold load at 1440×900: hero **2835px = 315vh**, passage
**3420px = 380vh**, `data-on="seq"`, `[data-hero-brand]` present, **0** `data-focus`
attributes, 7 canvases, 0 overflow. `tsc --noEmit` clean, `bun run build` exit 0.

---

## 1 · CONFIRMED DEFECTS — fix these first

Each survived two independent adversarial refutations (reachability, and "is it a documented
deliberate trade-off"). Full reasoning in `MOBILE_REVIEW.md`.

### 1.1 · B1 — the hero's height collapse never re-measures ScrollTrigger  ⚠ highest impact
**`src/components/sections/cinematic-system-scroll.tsx:1154`**

The server always emits `mode = "desktop"` (315vh). A phone's first client resolution is
`compact` (180svh) or `stacked` — a collapse of ~1.35 viewports. The effect written to catch
that returns early on `prev === null`, which is *always* the state on the pass where the mode
first resolves. Nothing re-measures, so **every ScrollTrigger below the hero is armed against
a document that no longer exists.**

No rescue exists on that path: `smooth-scroll-provider.tsx:117-137` deliberately skips its
refresh cadence for `pathname === "/"` ("the homepage cinematic owns its own refresh" — it
hands ownership to the effect that no-ops); the `[60, 250, 700, 1500]` cadence at `:1228` is
inside an effect gated on `mode !== "desktop"`; and `CompactSpine`'s trigger is pin-less, so
GSAP never auto-queues a refresh.

Reliably broken on a client-side nav into `/` (tap the logo from any interior route). Racy on
cold load.

**Fix — the corrected form already shipped in the twin file this session,
`audit-week-timeline.tsx:175-176`:**
```ts
if (prev === mode) return;
if (prev === null && mode === "desktop") return;   // gate on THIS file's SSR branch
```
**The same stale guard is at `fit-section.tsx:496` and `case-studies-rail.tsx:365`** (both SSR
as `"pinned"`, land on `"native"` on a phone), and **`services-section.tsx` has no such effect
at all** despite the same `"pinned"` SSR default (`:465`). Fix all four together — read each
file's own SSR default rather than copying the string.

### 1.2 · A1 — reduced-motion desktop cannot see the home rail's STACK pills
**`src/components/sections/case-studies-rail.tsx:304`**

Under RM the rail resolves `mode = "native"` (`:346` includes the RM query), so `stackInFlow`
is true (`:786`) and the pills render *inside* `.card-text-layer` (`:261`). All six rail cards
carry `card-has-distort`, and the only trigger a fine pointer can fire is `:hover` — which
`globals.css:788-793` uses to fade the pills' **ancestor** to `opacity: 0`. Composited 0 × 1
= 0. `[data-focus="true"]` never fires (the hook is inert on a fine pointer).

Before this session the pills were an overlay *outside* the text layer and revealed correctly.
`globals.css:825-829` still claims this path works — so it is a broken intent, not a chosen
trade-off.

**Fix:** stop deriving `stackInFlow` from `mode`. The detection effect at `:340` already
builds the `(pointer: coarse)` query — track it as its own state and use `detected && coarse`.
RM desktop then keeps the overlay placement that works; touch is unaffected.

### 1.3 · A2 — DragRail repaints the ≥1440px reduced-motion desktop three ways
**`src/components/ui/drag-rail.tsx:122`, `:341`, `:247`**

`.rail-affordance-touch` (`globals.css:1791-1795`) hides only `.drag-rail-affordance`. Three
things carry no pointer or motion gate, and both adopting rails reach them under RM at any
width:
- `:122` the masked edge fade (a 1.25rem gradient `a03d768` did not have),
- `:341` `scrollPaddingInline: "1.5rem"` — moves where a keyboard-focused card lands,
- `:247` `overscrollBehaviorX = "contain"` on fine pointers — under RM Lenis never exists, so
  `globals.css:288` does not apply and the old RM desktop had `auto`.

`globals.css:1775-1784` states the violated guarantee verbatim: *"A reduced-motion desktop
reader keeps exactly what `main` gives them today — a native scroller with no bar."*

**Fix:** wrap the `.drag-rail[data-rail-fade="true"]…` block in `@media (pointer: coarse)` and
make `scrollPaddingInline` + the `contain` branch coarse-only. Cleanest is one
`@media (pointer: coarse)` around the whole affordance grammar, matching the construction the
touch-ergonomics block already uses.

### 1.4 · B2 — `/case-studies` filter pills still 36px
**`src/app/case-studies/case-studies-client.tsx:99`**

Character-identical to its `/resources` twin (`resources-client.tsx:102`) except the twin was
raised and this was not — the agent hand-off never happened. Nine sector filters at **36px**,
8px under the floor, with no press feedback.

**Fix:** add `tap-44 press-surface` + a `pressRef` to the button. Both classes already exist in
`globals.css`; `min-height` composes with `h-9` by design. Nothing else changes.

### 1.5 · B3 — two owners set opposite `overscroll-behavior-x` on sibling rails
**`src/components/sections/services-section.tsx:895`**

The services rail hard-codes `max-sm:overscroll-x-contain`. `drag-rail.tsx:40-48` argues the
opposite at length and implements it at `:247`: `contain` blocks the chain the OS edge-swipe
rides. So on one page the reader can back-swipe past the case-studies and founders rails but
not past services. `services-section.tsx:97-110` lists its reasons for not adopting `DragRail`
and never mentions overscroll — unreviewed divergence, not a decision.

**Fix:** drop `max-sm:overscroll-x-contain` and use the same pointer-split inline write
`DragRail` uses. The utility alone is insufficient anyway — `globals.css:288` gives every
`[data-lenis-prevent]` a blunt `contain` under `.lenis-smooth`.

---

## 2 · A DEFECT I REPRODUCED MYSELF, NOT IN THE REVIEW

**A page mounted at ≤768px and then widened to ≥1024px stays on the mobile branches.**

Measured: load `/` at 390×844, resize to 1440×900 without reloading → hero stays **1620px**
(should be 2835), passage `data-on="lite"` (should be `"seq"`), `[data-hero-brand]` absent,
one stray `data-focus`. The reverse direction (load at 1440 → narrow → widen) **recovers
correctly**, so it is specific to the first resolution.

Why it matters in real use: a half-screen window on a 1920 display is 960px, under the 1024
threshold. Maximising it should not leave the reader on the phone layout until they reload.

Same family as §1.1 but a different mechanism — the media queries *are* subscribed, so
something downstream pins the first decision (a `hasDetectedViewport` latch, a
`gsap.matchMedia` context that never reverts, or a runway height written once). Diagnose
before fixing.

---

## 3 · NEVER MEASURED — do not claim these are done

1. **Frame rate on a real phone.** Every performance figure in this work is arithmetic or
   CPU-throttled desktop emulation, which does **not** emulate a tile GPU's fill-rate ceiling.
   The gate that can still kill a feature:
   - `NeuralLattice` misses 60fps → set `phoneGL` false, one line, back to today's behaviour.
   - The passage misses → the tunnel is already conditional (`tunnelDead`); drop it before
     touching the CSS layers.
   - Memory pressure from the 96svh hole (≈23MB of raster at DPR 3, vs ~8MB before) →
     `SEQ.LITE_HOLE_BASE_VH` 96 → 72 before anything structural.
2. **`navigator.hardwareConcurrency` on real handsets.** `tierStore.ts` flags its `cores <= 4`
   cut as an open QA item. Log it on every target device and reconcile.
3. **Screen readers.** VoiceOver/TalkBack traversal of the new rails, the compact spine, and
   the neural cards' `inert`/`aria` toggling. `MOBILE_HOME_SPEC.md §3.3` marks the passage's
   screen-reader pass as **blocking** — its machine-checkable half is done, the human half is not.
4. **iOS edge-swipe** interaction with `overscroll-behavior-x` (§1.5). No browser automation
   can perform the OS gesture.
5. **Lighthouse mobile.** Baseline was Performance **0.61**, LCP **7.6s**, TBT **560ms**, CLS 0
   (committed `lighthouse-final.json`, 2026-06-07). Never re-run after any of this work.
6. **Scroll FPS under 4× CPU throttle**, the original acceptance criterion. Not measurable in
   the authoring harness (see §5).

---

## 4 · OPEN OWNER DECISIONS

1. **The desktop `leading` bug.** `tailwind-merge` treats an arbitrary `text-[<length>]` as
   font-size, which conflicts with `leading-` and silently deletes it — so the desktop lead H2
   has been shipping at `line-height: 1.5` instead of `0.98`, on `main`, since before this
   session. Left untouched because fixing it changes desktop typography. One-line fix, your call.
2. **Auto-opening the neural cards on centre-focus** (`MOBILE_HOME_SPEC.md §8.3`). ~15 lines.
   It is a content-visibility change, not a motion one — deliberately not built unasked.
3. **Reduced-motion desktop and the rail progress bar.** Currently hidden there so `main`'s
   behaviour is preserved exactly. If you want RM readers to have it, delete one media query
   and accept +22px on two sections at 640/768 and on RM desktop.
4. **`/start` field styling.** Un-forking it from its local `FIELD_BASE` means its inputs now
   inherit `bg-surface` / `rounded-lg` / the primary focus ring instead of the fork's own tone.
   Sizing and layout are identical. If you want the old tone back it should become a token,
   not a per-form string.
5. **The passage beat's pacing.** 675px of scrub. If it still reads brisk in your hand, the
   single knob is `SEQ.LITE_RUN_SVH`.
6. **The hero's 5 → 3 panel merge.** No copy was written, rewritten or deleted — identical
   `STAGE_CONTENT` through the identical `DESKTOP_GROUPS` already approved for desktop — but
   "Signals" and "Audit" now share a screen on mobile for the first time. Editorially visible.
7. **Services as a rail** puts 3 of 4 offer cards behind a swipe (all content in the DOM). If
   vetoed, the fallback is card condensation alone: services 3.02 → 2.42, page 14.46 → ~15.6.

---

## 5 · ENVIRONMENT TRAPS THAT COST REAL TIME THIS SESSION

Read these before debugging anything here. Each produced a convincing false alarm.

1. **Turbopack serves stale CSS across edits.** A `globals.css` change kept computing the OLD
   value through a dev-server stop/start, a `.next/static/css` wipe and a cache-busted reload.
   Only `rm -rf .next` + a full restart fixed it. Confirm which version you are looking at by
   reading the winning rule out of `document.styleSheets`, not the computed value.
2. **Console history persists across server restarts in a reused tab.** I reported a CSS parse
   failure and 500s as a live regression; the dev server log was clean and every route returned
   200. Check `preview_logs` or a brand-new tab, never a long-lived one.
3. **Parallel agents share one `.next` and corrupt each other.** Symptoms: everything measuring
   13.33px, `display:grid` absent, `boxSizing: content-box`, routes 500ing with `ENOENT
   build-manifest.json` on one port while fine on another. **Assert
   `getComputedStyle(document.body).boxSizing === "border-box"` and root font 16px before
   trusting any number**, and discard runs that fail it.
4. **IntersectionObserver and rAF are throttled when the pane is not compositing.** An IO-driven
   feature can look completely unwired. `/about` reported zero centre-focused elements across a
   full-page scroll; the hook was working. Absence of an IO/rAF effect is not evidence of a defect.
5. **Screenshots are unavailable when the Browser pane is hidden**, and there is no headless
   fallback. Do not promise visual proof from this harness.
6. **`waitUntil: "networkidle"` returns before the CSS applies** on this dev server — use
   `domcontentloaded` plus an explicit settle.
7. **An isolated project copy with a junctioned `node_modules` will not run `next dev`** —
   Turbopack rejects it ("Symlink … points out of the filesystem root"). Copy the tree properly
   or work in place.

---

## 6 · SUGGESTED ORDER

1. §1.1 (B1) across all four files — it is the one with real user impact.
2. §1.2 and §1.3 — both are reduced-motion desktop contract breaches, and both are small.
3. §1.4 and §1.5 — one-liners.
4. §2 — diagnose before fixing.
5. Re-run the §0 measurements plus Lighthouse mobile, then §3 on a real handset.
