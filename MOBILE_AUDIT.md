# MOBILE AUDIT — SERSAN v2

> Phase 1 deliverable for `PROMPT_MOBILE_UPGRADE.md`. Written 2026-08-11 against
> commit `a03d768` on `main`. **No production code was changed to produce this.**
>
> Everything marked **[measured]** was observed live in the browser against the dev
> server at real device viewports. Everything marked **[read]** comes from source
> inspection with `file:line` citations. Where the brief's ground-truth map (§2) was
> incomplete or wrong, this document says so explicitly.

---

## 0 · THE HEADLINE

The brief assumed mobile's problem is *"the signature moments are gated off."* That is
true, and it is the second-biggest problem. The biggest one is a single CSS declaration:

```css
/* src/app/globals.css:282-285 */
html {
  /* 8bit's fluid root: everything scales with viewport. */
  font-size: clamp(13px, 0.85vw, 16px);
}
```

`0.85vw` reaches `16px` only at a viewport width of **1882px**. It reaches the `13px`
floor at **1529px**. So on every screen narrower than 1529px — every phone, every
tablet, and every laptop including a 1440px MacBook — **the root font size is pinned at
the 13px floor**, and every `rem`-based dimension in the design system renders at
**81.25%** of its intended size. **[measured: `rootFontSizePx: 13` at 390px, 1440px]**

This one rule is the root cause of two of the three acceptance criteria that currently
fail site-wide:

| Design-system token | Intended @16px | Actual @13px **[measured]** | ≥44px? |
|---|---|---|---|
| `h-9` — filter pills | 36px | **29.3px** | ✗ |
| `h-10` — default button, **the `Menu` button** | 40px | **32.5px** | ✗ |
| `h-11` — every shared `<Input>` | 44px | **35.8px** | ✗ |
| `h-12` — `size="lg"`, the main CTA size | 48px | **39.0px** | ✗ |
| `h-14` — `size="xl"` | 56px | **45.5px** | ✓ (only one) |
| `text-base` — every shared `<Input>` font | 16px | **13px** | ✗ iOS zooms |

Consequences, both measured:

1. **Every interactive element on the home route fails the 44×44 target.** At the top of
   `/` at 390×844, **18 of 18** visible interactive elements measured under 44px in at
   least one axis. `size="xl"` (45.5px) is the *only* size in the system that clears the
   bar, and it is used for two hero CTAs.
2. **Every form control on the site triggers iOS Safari zoom-on-focus.** `<Input>`
   ([input.tsx:11](src/components/ui/input.tsx:11)) declares `text-base md:text-sm` —
   correct-looking code that resolves to **13px** because `1rem === 13px`. iOS force-zooms
   any control under 16px, which rescales the visual viewport and desynchronises every
   pinned ScrollTrigger on the page.

**This finding contradicts the two sub-agent route audits** run for this document, which
computed tap-target sizes from Tailwind class names assuming `1rem = 16px` and therefore
reported `size="lg"` buttons as "48px, OK". They are 39px. Their *relative* rankings hold;
their absolute numbers are all ~19% too generous. The numbers in §3 below are corrected.

Fixing this is a **site-wide visual change** — raising the root to 16px scales the entire
site up by 23%, on desktop as well as mobile. That is an owner decision, not mine. It is
question **Q1** at the gate (§7).

---

## 1 · INVENTORY — what a touch user actually gets, route by route

Legend: **✓** parity · **~** degraded but complete · **✗** content or function lost.

### 1.1 `/` — Home *(the flagship, and the thinnest on touch)*

| # | Section | File | Desktop | Touch today | |
|---|---|---|---|---|---|
| 1 | Hero spine | [cinematic-system-scroll.tsx:798](src/components/sections/cinematic-system-scroll.tsx:798) | 315vh pinned runway, 3 cross-fading panels, WebGL particle-text intro, scroll-hijack gate | Stacked `min-h-[80svh]` blocks, same copy | ~ |
| 2 | Singularity passage | [singularity-passage.tsx:426](src/components/sections/singularity-passage.tsx:426) | 380vh pinned black-hole long take, horizontal pan, TSL raymarch, tunnel plunge | Panel 05 renders normally, then **180vh of empty `aria-hidden` scroll** | ✗ |
| 3 | Problem | [problem-section.tsx](src/components/sections/problem-section.tsx) | `NeuralLattice mode="broken"` behind the content | SVG fallback; **tap paths exist and work** | ✓ |
| 4 | Case-studies rail | [case-studies-rail.tsx:300](src/components/sections/case-studies-rail.tsx:300) | Pinned h-screen, drag+inertia, WebGL `RailPlanes`, DOF blur, FLIP to detail | Native `overflow-x` snap scroller, `w-[88vw]` | ✗ (media + stack pills) |
| 5 | Services | [services-section.tsx:367](src/components/sections/services-section.tsx:367) | Pinned POV camera-pan across 4 cards | `grid-cols-1` with `Reveal` stagger, full content | ✓ |
| 6 | Production-grade | [production-grade-section.tsx:359](src/components/sections/production-grade-section.tsx:359) | `NeuralLattice mode="healthy"` + boot timeline | SVG fallback, tap works — but **copy says "Hover a panel"** | ~ |
| 7 | Founders rail | [founders-rail.tsx:629](src/components/sections/founders-rail.tsx:629) | WebGL particle portrait morph w/ scroll gate | Native snap scroller | ✗ (colour portraits) |
| 8 | Fixed-scope strip | [fixed-scope-strip.tsx](src/components/sections/fixed-scope-strip.tsx) | — | Identical | ✓ |
| 9 | Fit | [fit-section.tsx:426](src/components/sections/fit-section.tsx:426) | Pinned 6-beat verdict scrub | Static two-column list, fully settled — **the cleanest fallback on the site** | ✓ |
| 10 | Gateway gap | [page.tsx:89](src/app/page.tsx:89) | WebGL `GatewayPortal` + signature line | 144px of near-empty space | ~ |
| 11 | Final CTA | [final-cta.tsx:151](src/components/sections/final-cta.tsx:151) | — | Identical; `<pre>` scroller missing `data-lenis-prevent` | ✓ |

**[measured]** Home on mobile = **23,290px ≈ 27.6 viewports** of scroll at 390×844, versus
24.9 viewports at 1440×900. *The mobile page is longer than the desktop one* while
containing dramatically less. Sections 2 and 10 alone contribute ~2,300px of near-empty
scroll.

### 1.2 `/consulting`

Hero ✓ · Practice ledger ~ (all 8 descriptions force-open; **accent tick and underline
permanently invisible**) · Engagement acts ~ (final state painted, no motion, no content
loss) · Process map ~ (vertical stack) · FAQ ~ (Radix accordion, **closed answers absent
from DOM** — unlike `/audit`'s `forceMount` variant) · Multi-step intake ✗ (**overflow**,
see D-4).

### 1.3 `/audit`

Hero ✓ · Six surfaces ~ (verbatim port of the practice ledger, **same dead tick/underline
bug**) · **60-second self-audit ✓✓ — the one beat on the site that gives touch the full
desktop choreography**, with a 250ms double-tap cooldown and `preventScroll` focus
management ([self-audit.tsx:95](src/app/audit/self-audit.tsx:95)) · Week timeline ✗
(largest divergence on the site; see D-6) · Three doors ~ · Honest FAQ ✓ (`forceMount`,
76px triggers — the best-behaved component audited) · Closing CTA ~ (no calendar today:
`CAL_ENABLED = false`, [site.ts:28](src/lib/site.ts:28)).

### 1.4 `/about`

Hero ✓ · Our Why ~ · **Founders ✗ — portraits permanently grayscale on touch** (D-1) ·
Three rules ~ · Proof strip ✓ · CTA ✓.

### 1.5 `/case-studies` + `[slug]`

Archive grid ~ but **✗ for media**: 10 of 13 cards ship a logo or screenshot that is
`:hover`-gated with no touch fallback (D-2). Detail pages ✓ — and they are the *only*
place a touch user can see that imagery. `[slug]` "View site" is an unlabelled full-bleed
tap area on touch ([case-study-detail-client.tsx:165](src/app/case-studies/[slug]/case-study-detail-client.tsx:165)).

### 1.6 `/resources` + `[slug]`

List ~ — the hover preview card returns `null` on coarse with **no substitute of any
kind** ([resource-preview.tsx:196](src/components/resources/resource-preview.tsx:196)), and
all three card-surface effects are disabled, leaving **zero tap feedback** beyond the
browser default. Category/date/read-time *are* in the card body, so no information is
lost. Detail pages ✓ (fully static, no gates).

### 1.7 `/contact`, `/start`

Both ✓ for content, ✗ for input ergonomics — every control zooms on iOS (§0), `/start`
additionally focuses invalid fields without `preventScroll`
([start-intake-form.tsx:193](src/app/start/start-intake-form.tsx:193)). `/contact` puts the
info column before the form on mobile, pushing the form ~1.5 screens down.

### 1.8 `/trust`

Content ✓ — and the brief's premise is wrong on two counts: **there are no `<table>`
elements anywhere in the codebase**, and `/trust` has **no side index nav** (that exists
only on the legal routes, `hidden lg:block`). The real defect is the compliance pipeline:
its mobile SVG variant clips a regulation tag inside its own `viewBox`, and its 6 hotspot
buttons have `onFocus`/`onMouseEnter` but **no `onClick`** — 40×96px dead zones that
swallow taps ([compliance-pipeline.tsx:693-710](src/components/sections/compliance-pipeline.tsx:693)).

### 1.9 `/services/*`, legal

Services ✓ — `use-case-beats.tsx` renders **all content in static mode** and is the
correct pattern the rest of the site should copy. Legal ✓ for content; the numbered TOC
is `hidden lg:block` with no mobile substitute, leaving ~12-section pages with zero
wayfinding.

---

## 2 · GAP TABLE — signature moments

| Desktop moment | Touch today | Acceptable? | Proposed touch mechanic |
|---|---|---|---|
| **Singularity passage** (380vh black hole) | 180vh of empty `aria-hidden` scroll | **No — worst offender** | Cut to ~120svh. `Sticky beat` + scrubbed WebGL at reduced budget (see §5). This is the "wow" payload. |
| **Founders portrait morph** (WebGL particles) | Native snap rail, grayscale photos | No | `Centre-of-viewport focus` drives the colour reveal + a scrubbed 2-stage morph. Second "wow" payload. |
| **Case-studies rail** (pinned, drag, DOF, RailPlanes) | Native snap rail, no media | No | `Drag rail` primitive: progress affordance, per-card scrub, media revealed at centre. |
| **Hero spine** (315vh, 3 panels, particle text) | Stacked `80svh` blocks | Borderline | `Sticky beat` ×2 with scrubbed panel cross-fade. Keep the particle intro off. **SUPERSEDED 2026-08-18** (`plans/2026-08-17-mobile-parity.md` Phase 4b): capable phones (`fxBudget.level 2` + WebGPU) now get the "Sersan AI" particle intro as an auto-play beat inside the compact stage — no scroll hijack, tap = skip, kill-switch `HERO_BRAND_COMPACT`. |
| **Services POV pan** | Stacked grid | **Yes** | Add `Staged reveal` polish only. |
| **Fit verdict beats** | Static settled list | **Yes** | Add `Staged reveal` polish only. |
| **Audit week timeline** (580vh pin + drag) | Flat stacked cards | No | `Drag rail` — a 6-station horizontal beat is natural on touch. |
| **Practice / surfaces ledgers** | All open, dead accents | No | `Centre-of-viewport focus` + fix the baked `scale-0` classes. |
| **Card hover media** | Never shown | **No — content loss** | `Centre-of-viewport focus` reveal. |
| **Resource hover preview** | Nothing | Borderline | `Press state` feedback; no preview layer needed. |
| **FLIP route transitions** | Plain navigation | No | Reuse `displacement-wipe.tsx`. |
| **Custom cursor / magnetic / tilt** | Nothing | No | `Press state` primitive. |
| **Postprocessing (bloom/DOF)** | Off | ~~**Yes — keep off**~~ **SUPERSEDED 2026-08-17** | Was "fill-rate suicide on tile GPUs". Now gated on `fxBudget.postFx` (plan Phase 2): level 2 phones mount the same chain in "lite" (WebGL `Bloom levels 4` + no Noise; WebGPU same graph at DPR 1, grain/fluid off), behind the real-device gate in `docs/recon-2026-08-17/DEVICE_LOG.md`; `stepDownBudget()` turns it off by itself if the phone cannot hold frame. |
| **Pointer flowmap / fluid** | Off | **Yes — keep off** | No pointer to track. |
| **Scroll snap engine** | Off on touch | **Yes — keep off** | Deliberate and correct ([scroll-snap.ts:194](src/lib/scroll-snap.ts:194)). |
| **`prefers-reduced-motion` → no canvas** | Honoured | **Yes — keep** | Do not touch. |

---

## 3 · DEFECT LIST

### P0 — content unreachable, or breaks the page

**D-0 · Root font-size collapses the whole design system** — [globals.css:282-285](src/app/globals.css:282)
`clamp(13px, 0.85vw, 16px)` yields 13px below 1529px viewport width. **[measured]**
Causes every sub-44px target *and* iOS zoom on every form control site-wide. See §0.
→ *Blocked on owner decision Q1.*

**D-1 · Founder photographs are invisible on touch** — [founders-rail.tsx:195-198](src/components/sections/founders-rail.tsx:195), [about-client.tsx:482-485](src/app/about/about-client.tsx:482) **[read, verified in both files]**
Base layer is `filter: grayscale(1)` unconditionally; the colour layer is revealed by
`clip-path: circle(var(--fr-hr))` where `--fr-hr: 150%` is set **only** inside
`@media (hover: hover) and (pointer: fine)`. On touch `--fr-hr` stays `0px` forever. The
full-colour `<img>` is downloaded and never painted. Affects home **and** `/about`.

**D-2 · Case-study imagery is invisible on touch** — [globals.css:658-661](src/app/globals.css:658), [globals.css:799-810](src/app/globals.css:799)
`.card-steel:hover .card-image-distort__img { opacity: 1 }` with no `@media (hover:hover)`
fallback. **10 of 13 archive cards** ship a logo or screenshot that no touch user ever
sees — and [card-image-distort.tsx:268-293](src/components/fx/card-image-distort.tsx:268)
*deliberately force-loads the image on mobile via IntersectionObserver*. Wasted bytes and
lost proof. Latent second-order bug: `.card-has-distort:hover .card-text-layer { opacity: 0 }`
([globals.css:706](src/app/globals.css:706)) + iOS sticky `:hover` on tap can blank a
card's own text mid-tap.

**D-3 · Mobile menu is unusable in landscape** — [navbar.tsx:919-983](src/components/navbar.tsx:919) **[measured at 844×390]**
Panel is `fixed top-[68px]` and 590px tall with `overflow: hidden`, in a 390px viewport →
**overflows the bottom by 276px and cannot be scrolled**. The "Book a call" CTA, the EN/IT
toggle and the audio toggle are physically unreachable. Additionally: no `role="dialog"`,
no `aria-modal`, focus never enters the panel (**[measured]** `document.activeElement`
stays on `BODY`), `overscroll-behavior: auto`. *Credit where due: body scroll lock and
Lenis stop are correctly implemented.*

**D-4 · Intake review step overflows** — [multi-step-intake.tsx:1070](src/components/multi-step-intake.tsx:1070)
`grid-cols-[10rem_1fr]` with no responsive variant. At 375px: ~231px available − 160px
fixed label − 12px gap = **59px** for the value; `1fr` has `min-width: auto`, so any email
address pushes the grid wider than the viewport → horizontal page scroll.

**D-5 · Every form control zooms on iOS** — [input.tsx:11](src/components/ui/input.tsx:11) (13px via D-0), [start-intake-form.tsx:158-159](src/app/start/start-intake-form.tsx:158) (explicit `text-[14px]`, 11 controls) **[measured: 13px on `/contact`, 14px on `/start`]**

**D-6 · Audit week timeline: mobile first paint is a 580vh runway** — [audit-week-timeline.tsx:103](src/components/sections/audit-week-timeline.tsx:103)
`mode` initialises to `"pinned"`, so SSR and first client paint on a phone render the
580vh runway, then the mount effect flips to native and the document collapses. Worse:
[:475-476](src/components/sections/audit-week-timeline.tsx:475) marks 5 of 6 Day cards
`inert` + `aria-hidden` + `opacity: 0`, so **without JS a touch user sees Day 1 only,
inside an empty 580vh frame**.

### P1 — broken or hostile, content survives

**D-7 · `100vh` on the one sticky stage touch actually reaches** — [singularity-passage.tsx:1438](src/components/sections/singularity-passage.tsx:1438) **[measured: `.seq-lite sticky top-0 h-screen`, 844px in an 844px viewport]**
Plus the 180vh runway written in JS at [:438](src/components/sections/singularity-passage.tsx:438)
and re-asserted on `refreshInit` at [:441](src/components/sections/singularity-passage.tsx:441) —
an address-bar collapse rewrites the runway mid-scroll and forces a ScrollTrigger
re-measure → progress discontinuity.

**D-8 · No `env(safe-area-inset-*)` anywhere in the codebase** — **[measured: 0 occurrences]**
`viewportFit: "cover"` **is** set ([layout.tsx:134](src/app/layout.tsx:134)), which
deliberately extends the layout under the notch and home indicator — with nothing padding
it back. Navbar, footer, cookie banner and the menu panel are all exposed.

**D-9 · Address-bar resize re-measures every trigger** — [smooth-scroll-provider.tsx:229-234](src/components/smooth-scroll-provider.tsx:229)
`window.resize` → 150ms debounce → `ScrollTrigger.refresh()`, with no width-vs-height
discrimination and no `ignoreMobileResize`. On mobile the URL-bar collapse *is* a resize.

**D-10 · Ledger accent tick + underline are permanently invisible on touch** — [practice-ledger.tsx:467](src/app/consulting/practice-ledger.tsx:467), [:483](src/app/consulting/practice-ledger.tsx:483), [surfaces-ledger.tsx:423](src/app/audit/surfaces-ledger.tsx:423), [:439](src/app/audit/surfaces-ledger.tsx:439) **[read, verified]**
`scale-y-0` / `scale-x-0` are baked into `className`; only the interactive-mode GSAP
removes them. In static mode (touch / no-JS / reduced-motion) they never scale up. The
sibling beat components ([door-beats.tsx:175](src/app/audit/door-beats.tsx:175),
[rule-beats.tsx:174](src/app/about/rule-beats.tsx:174),
[engagement-acts.tsx:271](src/app/consulting/engagement-acts.tsx:271)) correctly omit the
class — so the fix is already demonstrated in-repo.

**D-11 · Touch tablets 769–1023px get the desktop pinned hero** — [cinematic-system-scroll.tsx:798-799](src/components/sections/cinematic-system-scroll.tsx:798)
Gate checks `(max-width: 768px)` and reduced-motion but **not `(pointer: coarse)`**, unlike
every sibling section. A WebGPU-capable tablet can therefore mount `HeroIntroGate`, which
attaches `touchmove` with `preventDefault(); stopImmediatePropagation()`
([hero-intro-gate.tsx:176-177](src/components/sections/hero-intro-gate.tsx:176)) — a full
touch scroll-hijack at the top of the page whose only escape is keyboard or a click.

**D-12 · Compliance pipeline: clipped tag + 6 dead tap zones** — [compliance-pipeline.tsx:693-710](src/components/sections/compliance-pipeline.tsx:693)
Hotspots have `onFocus`/`onMouseEnter` but no `onClick`/`onTouchStart`. `"GDPR · EU AI Act
Art. 10"` overruns the 280-unit mobile `viewBox` and is clipped at every width.

**D-13 · Founder card clips its own copy** — [founders-rail.tsx:348](src/components/sections/founders-rail.tsx:348)
`h-[min(78vh,46rem)]` + `overflow-hidden` with all copy `absolute bottom-0`. At ~343px
wide the name/role/bio/chips stack grows upward past the top edge and is clipped with no
way to scroll it. `78vh` also resizes on address-bar collapse.

**D-14 · Tap targets** — systemic via D-0. Beyond that, these are small *by their own
padding* and stay small even if D-0 is fixed: self-audit `Start →` / `← Back` / `Run again`
(~15–16px, [self-audit.tsx:364](src/app/audit/self-audit.tsx:364), [:389](src/app/audit/self-audit.tsx:389), [:541](src/app/audit/self-audit.tsx:541)) · practice-ledger `Explore →`
(~90×15px, the section's only link, [practice-ledger.tsx:500](src/app/consulting/practice-ledger.tsx:500)) ·
`/contact` mailto/tel/WhatsApp (~20px, the page's primary conversion actions,
[contact-client.tsx:159](src/app/contact/contact-client.tsx:159)) · footer nav links
(20.3px **[measured]**) · founder LinkedIn icons (36×36).

### P2 — degraded, no touch answer

**D-15** Resource hover preview returns `null` with no substitute — [resource-preview.tsx:196](src/components/resources/resource-preview.tsx:196).
**D-16** Case-study tech-stack pills are `group-hover`/`group-focus-visible` only — [case-studies-rail.tsx:262](src/components/sections/case-studies-rail.tsx:262). Visually dead on touch (SRs still read them).
**D-17** "Hover a panel to see why it matters" shown to touch users — [production-grade-section.tsx:359-360](src/components/sections/production-grade-section.tsx:359). *Copy change — needs owner sign-off per constraint §2.*
**D-18** Founders mode detection is a one-shot sample, not a subscription — [founders-rail.tsx:629-632](src/components/sections/founders-rail.tsx:629). Every sibling subscribes.
**D-19** No touch route transition; FLIP bails on coarse — [use-flip-source.ts:44](src/lib/use-flip-source.ts:44), [:112](src/lib/use-flip-source.ts:112).
**D-20** `tierStore.degrade()` still has no callers (backlog A7) — [tierStore.ts:152](src/webgl/store/tierStore.ts:152).
**D-21** `<pre>` scroller missing `data-lenis-prevent` — [final-cta.tsx:151](src/components/sections/final-cta.tsx:151).
**D-22** `[slug]` "View site" is an unlabelled full-bleed external link on touch — [case-study-detail-client.tsx:165](src/app/case-studies/[slug]/case-study-detail-client.tsx:165).

### P3 — polish / consistency

**D-23** `min-h-screen` (`100vh`) on ~9 route roots; `/start` and `service-detail` already
use `min-h-[100svh]` — inconsistent.
**D-24** Node-marker `whitespace-nowrap` labels clip in the 640–767px band — [problem-section.tsx:144](src/components/sections/problem-section.tsx:144).
**D-25** Legal routes use raw `px-6` instead of `.container-px`.
**D-26** Body copy at `text-[0.9375rem]` (→ **12.2px** under D-0) on legal + resource detail.
**D-27** `/consulting` FAQ has no `forceMount` while `/audit`'s does — two different SSR content contracts for the same UI.
**D-28** `cal-embed-wrap` is a dead class with no CSS rule anywhere.

---

## 4 · PROPOSED MOBILE MOTION GRAMMAR

Eight primitives, built once in Phase 2, applied everywhere in Phase 3. Each is a hook or
component with a single contract, RM-aware by construction, and desktop-inert so it can be
introduced without touching desktop timelines.

**M-1 · `<Stage>` — the pinned beat container.**
`height: 100svh`, `position: sticky`, safe-area padded, with its runway expressed in `svh`
and *frozen at mount* so an address-bar resize never re-measures it. Replaces every
`sticky top-0 h-screen`. Fixes D-7, D-8, D-9, D-23 structurally rather than one file at a
time.

**M-2 · `useStagedReveal()` — IO-driven entrance.**
Enter-once, `y + autoAlpha`, `stagger 0.06`, `expo.out`, `-18%` root margin. This already
exists informally in five places with slightly different constants
([practice-ledger.tsx:204](src/app/consulting/practice-ledger.tsx:204),
[surfaces-ledger.tsx:160](src/app/audit/surfaces-ledger.tsx:160), `Reveal`,
`RevealOnScroll`, `SectionHeading`). Consolidate, don't add a sixth.

**M-3 · `useCentreFocus()` — the touch answer to `:hover`.**
The element nearest the viewport centre becomes `[data-focus="true"]`; everything hover-
gated keys off that attribute instead of `:hover`. One primitive resolves **D-1, D-2, D-10,
D-16** and the ledger active-row. This is the single highest-leverage item in the plan:
it converts "reveal never" into "reveal when you scroll to it" across the whole site.

**M-4 · `usePressState()` — press feedback.**
`pointerdown` → scale 0.985 + a radial glow at the touch point + optional label scramble;
`pointerup`/`cancel` → release. Replaces custom cursor, magnetic and tilt on touch, and
gives `/resources` cards the tap feedback they currently lack entirely (D-15).

**M-5 · `<DragRail>` — the horizontal beat.**
Upgrades the two *working* native scrollers ([case-studies-rail.tsx:824](src/components/sections/case-studies-rail.tsx:824),
[founders-rail.tsx:1763](src/components/sections/founders-rail.tsx:1763)) rather than
replacing them: adds a progress affordance, per-card scroll-linked motion, rubber-band
edges, and `data-lenis-prevent` by default. Must resolve gesture direction before
capturing (anti-pattern §11). Serves the case-studies rail, founders rail and the audit
week timeline (D-6).

**M-6 · `useScrubBeat()` — scroll-linked scalar.**
A `0→1` progress over an `M-1` Stage, feeding either DOM transforms or a WebGL uniform,
with one shared ScrollTrigger config (`invalidateOnRefresh`, mobile-resize-safe). The
substrate for the passage and the portrait morph.

**M-7 · `<TapDisclosure>` — expand in place.**
Height/grid-rows `0fr→1fr` with `forceMount`, so content is always in the DOM and
always reachable without JS. The pattern is already correct in
[honest-faq.tsx:72-75](src/components/ui/honest-faq.tsx:72) and
[neural-card.tsx:204-218](src/components/fx/neural-card.tsx:204) — promote it and retire
the Radix variant that drops closed content (D-27).

**M-8 · Touch route transition.**
Reuse [displacement-wipe.tsx](src/components/fx/displacement-wipe.tsx) on coarse pointers,
where FLIP deliberately bails (D-19).

**Governing rules:** every primitive is a no-op under `prefers-reduced-motion`; none gates
content behind a gesture; none animates anything but `transform`/`opacity`/`clip-path`.

---

## 5 · CAPABILITY MODEL (replaces the `SceneTier` scalar)

Per brief §5.4. Five independent axes, resolved once, with per-feature budgets derived from
them — instead of collapsing pointer type, width and GPU into one word:

| Axis | Values | Source |
|---|---|---|
| `pointer` | `fine` \| `coarse` | `matchMedia` |
| `viewport` | `compact <768` \| `medium 768–1023` \| `expanded ≥1024` | live, subscribed |
| `gpu` | `weak` \| `mid` \| `strong` | [`detectGpuClass()`](src/webgl/store/tierStore.ts:95) — **already exists and is unused for gating** |
| `backend` | `webgpu` \| `webgl2` \| `none` | resolved in `onCreated` |
| `motion` | `full` \| `reduced` | `matchMedia`, live |

A modern phone is `coarse + compact + weak|strong + webgpu + full` — today that is
flattened to `"lite"` and sits below an Intel UHD laptop. Budgets then come from `gpu` and
`backend`, not from `pointer`. The existing DPR machinery
([`detectDprRange()`](src/webgl/store/tierStore.ts:119), `dprCap`, `AdaptiveResolution`) is
the right lever and needs no redesign — mobile WebGL should be budgeted through
**resolution and overdraw first** (brief §5.5), which it already supports.

Migration must be atomic: **13 call sites** read `tier === "full"` / `"lite"`
(`Scene.tsx` ×8, `PostFXNodes`, `SignatureLine`, `FounderPortraitMorph`, `founders-rail`,
`case-studies-rail`, `resource-preview`, `resources-client`, `use-neural-lattice-fallback`,
`RouteHero`, `HeroLogo`). No half-migrated state.

**Lenis on touch (brief §5.2) — decision: keep native touch scrolling. Do not enable
`syncTouch`.** Rationale to be written into the
[lenis-singleton.ts](src/lib/lenis-singleton.ts:58) docblock, whose current comment ("no
touch smoothing on mobile where we don't run the scene anyway") is now stale and wrong:
the correct reason is that `syncTouch` fights iOS momentum, breaks overscroll and
pull-to-refresh, and the choreography is driven by ScrollTrigger progress which does not
need smoothing to be correct.

---

## 6 · PERFORMANCE BASELINE

**Lighthouse mobile** (412×823, from the repo's committed `lighthouse-final.json`,
2026-06-07 — needs re-running, but it is the documented reference point):

| Metric | Baseline | Target | Gap |
|---|---|---|---|
| Performance | **0.61** | ≥ 0.85 | −0.24 |
| Accessibility | 1.00 | ≥ 0.95 | ✓ *(does not catch hover-locked content or D-0)* |
| Best practices | 0.96 | — | ✓ |
| SEO | 1.00 | — | ✓ |
| LCP | **7.6 s** | < 2.5 s | **3× over** |
| TBT | **560 ms** | (INP < 200 ms) | over |
| CLS | 0 | < 0.1 | ✓ |
| TTI | 8.1 s | — | — |

**Measured live this session** (dev server, 390×844 and 320×568):

- **Horizontal overflow: 0px** on `/`, `/trust`, `/contact`, `/start` at both 320px and
  390px. ⚠️ **Do not generalise this** — see §8.6: routes I did not probe (`/case-studies`,
  `/resources`, `/about`) turned out to carry up to **190px** of pre-existing overflow.
- **Console: zero errors, zero warnings** on `/` load at 390px.
- **Tap targets: 18/18 failing** at the top of `/`; resolved size table in §0.
- **iOS zoom: 4/4 controls on `/contact` at 13px; 12/12 on `/start` at 14px.**
- Home document height **23,290px = 27.6 viewports** at 390×844.

**Not measured — honest gaps:**

- **Scroll FPS under 4× CPU throttling.** The Browser pane in this session is not
  compositing (`document.visibilityState === "hidden"`), so `requestAnimationFrame` is
  throttled and any FPS number would be fiction. This is the same background-tab rAF
  throttling noted in the brief §9. **Must be measured in Phase 6** with the pane visible
  or via Chrome DevTools MCP.
- **Screenshots.** Same cause — `computer{action:"screenshot"}` fails with *"the Browser
  pane is not displayed, so the page is not compositing frames."* No visual proof is
  attached to this audit, and per constraint §6 none is claimed.
- **Bundle delta / whether the three-R3F chunk parses on canvas-free paths** (brief §5.7).
- **IT locale overflow** — the classic long-string source, untested.
- **Real-device testing.** Everything here is emulated.

---

## 7 · SEQUENCED PLAN

| # | Item | Defects | Impact | Effort | Verification |
|---|---|---|---|---|---|
| **Phase 2 — Foundation** |
| 2.1 | Root font-size decision + fallout | D-0, D-5, D-14, D-26 | ★★★★★ | M | Re-measure the §0 table; desktop screenshots at 1440px before/after |
| 2.2 | `M-1 <Stage>`: `svh` + safe-area + frozen runways | D-7, D-8, D-23 | ★★★★★ | M | No layout jump on simulated URL-bar collapse |
| 2.3 | ScrollTrigger mobile config; `ignoreMobileResize`, refresh on orientation only | D-9 | ★★★★ | S | Resize height-only → no pin re-trigger |
| 2.4 | Capability model migration (all 13 sites, one commit) | D-11, D-18, D-20 | ★★★★★ | L | Desktop byte-identical; tablet no longer hijacked |
| 2.5 | Lenis docblock decision recorded | — | ★ | XS | Doc only |
| 2.6 | Build M-2…M-8 primitives | — | ★★★★★ | L | Storybook-less: exercise each on one section |
| **Phase 3 — Motion system** |
| 3.1 | `M-3 useCentreFocus` → founders, cards, ledgers | **D-1, D-2, D-10, D-16** | ★★★★★ | M | Screenshot each reveal at centre-screen |
| 3.2 | Mobile menu rebuild | **D-3** | ★★★★★ | M | 844×390: every item reachable; focus trap; `aria-modal` |
| 3.3 | `M-4 usePressState` site-wide | D-15 | ★★★ | M | Tap feedback on every card |
| 3.4 | `M-5 <DragRail>` → 3 rails | D-6 | ★★★★ | L | Vertical intent never swallowed |
| 3.5 | Forms: sizing, `inputmode`, `autocomplete`, focus | D-4, D-5 | ★★★★ | M | No zoom on iOS focus; 0 overflow with a long email |
| 3.6 | `M-8` touch route transition | D-19 | ★★ | S | — |
| **Phase 4 — WebGL** |
| 4.1 | Singularity passage on phones | **D-7 + the 180vh void** | ★★★★★ | L | 60fps @4× throttle, or fall back |
| 4.2 | Founders portrait morph on phones | — | ★★★★ | L | Same |
| 4.3 | Everything else: measure, then decide | — | ★★ | M | Measured, not felt |
| **Phase 5–6** |
| 5.x | Full sweep: routes × breakpoints × orientations × EN/IT | D-12, D-13, D-17, D-21…D-28 | ★★★ | L | Test matrix, brief §9 |
| 6.x | Perf + a11y + **the proof that is missing from this audit** | — | ★★★★ | M | §8 criteria, with numbers |

**Fastest path to visible value:** 2.2 → 3.1 → 3.2. Those three restore the founders'
faces, the case-study imagery and a usable menu, and remove the address-bar jump — before
any WebGL work starts.

---

## 8 · CORRECTIONS TO THE BRIEF'S GROUND TRUTH

The brief invited verification rather than trust. Findings:

1. **§2.3's list of five `static`-mode components is incomplete.** Also switching on
   mobile/coarse: [audit-week-timeline.tsx:124](src/components/sections/audit-week-timeline.tsx:124),
   [case-studies-rail.tsx:300](src/components/sections/case-studies-rail.tsx:300),
   [fit-section.tsx:426](src/components/sections/fit-section.tsx:426),
   [services-section.tsx:367](src/components/sections/services-section.tsx:367),
   [cinematic-system-scroll.tsx:798](src/components/sections/cinematic-system-scroll.tsx:798),
   [founders-rail.tsx:629](src/components/sections/founders-rail.tsx:629),
   [use-case-beats.tsx:74](src/components/sections/use-case-beats.tsx:74),
   [process-section.tsx:224](src/components/sections/process-section.tsx:224). **Thirteen,
   not five** — and they use **four different gate formulas**.
2. **`.seq-lite-run` is not "an `aria-hidden` CSS imposter" hiding content.** **[measured]**
   it contains zero text. Panel 05's copy renders normally as a readable vertical section
   above it. The defect is 180vh of *empty* scroll, not hidden copy — a motion gap, not a
   content-reachability gap.
3. **`/trust` has no tables and no side index nav.** There are **no `<table>` elements
   anywhere in `src/`**. The subprocessor and retention "tables" are responsive `<ul>`s
   that collapse correctly. The real `/trust` defect is the pipeline SVG (D-12).
4. **`viewportFit: "cover"` is already set** ([layout.tsx:134](src/app/layout.tsx:134)) —
   which makes the total absence of `env(safe-area-inset-*)` worse, not better.
5. **The mobile menu is more designed than described** — GSAP clip-path unroll with a
   staggered reveal, body scroll lock and Lenis stop all present. It is *landscape* and
   *a11y* that are broken, not the animation.
6. ~~**Horizontal overflow is not a general problem.**~~ **← THIS AUDIT WAS WRONG.**
   I measured 0px at 320/390 on `/`, `/trust`, `/contact` and `/start` and generalised
   from four routes to the whole site. Phase 2 measured the rest and found overflow that
   **pre-dates all of this work**: a decorative `w-[700px]` glow escaping its section on
   `/case-studies` and `/resources` — **190px of overflow at 320px and 135px at 430px, on
   every mobile width** — and the `/about` founder-card header needing 308px in a 256px
   column (**22px**). Both are now fixed. The lesson stands on the record: four routes is
   not a sample, and "clean where I looked" is not "clean".
7. **The brief's premise that mobile is uniformly "a fallback path" is too pessimistic in
   three places** worth preserving as-is: the `/audit` self-audit runs the full desktop
   choreography on touch; `fit-section` and `use-case-beats` have genuinely correct static
   fallbacks; and the touch-exempt snap engine is a deliberate, well-reasoned decision.

---

## 9 · GATE — questions whose answers change the plan

**Q1 · The root font-size (D-0). This is the blocking one.** Options:
**(a)** `html { font-size: 16px }` — everything becomes its intended size; the whole site
scales up ~23% on every screen below 1529px, desktop included. Correct, and a real visual
change requiring your eye.
**(b)** Keep the fluid root, raise the floor to 16px and re-tune the `vw` term so it scales
*up* from 16 rather than down to 13.
**(c)** Leave it, and patch the ~40 affected targets and every form control individually —
more work, permanently fragile, and leaves desktop at 13px too.
*My recommendation: (b).* It preserves the fluid intent, fixes iOS zoom and the tap-target
floor in one line, and is the least visually disruptive of the three.

**Q2 · Scope.** Home-first (deep, ~2 routes) or all 18 routes (broad, shallower)? The P0
list spans home, `/about`, `/case-studies`, `/consulting` and the shared chrome, so *some*
cross-route work is unavoidable regardless.

**Q3 · How far to push WebGL on phones (Phase 4).** The passage and the portrait morph are
the two "wow" payloads. Both are large. Do you want **one done properly**, or both at a
reduced budget?

**Q4 · D-17 is a copy change** ("Hover a panel" → "Tap a panel"), which constraint §2
forbids me from making unilaterally. Approve, or leave it?

### Gate outcome — decided 2026-08-11

| Q | Decision | Consequence |
|---|---|---|
| **Q1** Root font | **Raise the floor to 16px and retune the `vw` term** so the root scales *up* from 16px instead of down to 13px | Fixes D-0, D-5, D-14, D-26 in one declaration. **This is an approved desktop change**: at 1440px the root goes 13px → 16px, so the entire site renders ~23% larger on every screen below the new fluid threshold. Explicitly authorised, and the one sanctioned deviation from "desktop stays byte-for-byte equivalent" (constraint §1). |
| **Q2** Scope | **Foundation site-wide, motion home-first** | Phase 2 substrate and every P0 land across all routes (they live mostly in shared chrome); bespoke touch choreography is built on `/` only. Interior routes receive the primitives, not new beats. |
| **Q3** WebGL | **One done properly — the singularity passage** | Phase 4 replaces the 180vh empty void with a phone-viable black-hole beat at reduced budget. The founders rail gets `M-3 useCentreFocus` instead of the particle morph, which also resolves D-1. |
| **Q4** Copy | **Device-neutral verb approved** | D-17 → "Open a panel" (EN) / "Apri un pannello" (IT). Single string per locale, no fork. |

**Gate cleared — Phase 2 authorised.**

> ⚠️ **Verification caveat carried into Phase 2:** screenshots are unavailable in the
> authoring session (§6). The Q1 change is visual and site-wide, so its sign-off needs the
> owner's eye in a real browser. Everything mechanically checkable — computed token sizes,
> horizontal overflow, tap-target pass rate, console cleanliness — will be reported as
> numbers.

---

## 10 · PHASE 2 OUTCOME — measured after the change

Commits `69e1b1b` (scroll substrate) and `96336d7` (typography + ergonomics), on top of
`abf1bd9` (this audit). Nothing pushed.

| Defect | Before **[measured]** | After **[measured]** | |
|---|---|---|---|
| **D-0** root font @390px | 13px | **16px** | ✅ |
| **D-0** `<Input>` height | 35.8px | **44px** | ✅ |
| **D-0** `size="lg"` CTA | 39px | **48px** | ✅ |
| **D-5** `/contact` iOS-zoom controls | 4 of 4 | **0 of 4** | ✅ |
| **D-5** `/start` iOS-zoom controls | 12 of 12 | **12 of 12** | ❌ **still open** |
| **D-3** menu overflow @844×390 | 276px, unscrollable | **0px, scrollable** | ✅ |
| **D-3** menu items under 44px | — | **0 of 12** | ✅ |
| **D-3** `role`/`aria-modal`/`overscroll` | absent | present | ✅ |
| **D-14** Menu button | 32.5px | **44px** | ✅ |
| **D-7** `.seq-lite` sticky stage | `100vh` | `100svh` | ✅ |
| **D-23** `min-h-screen` in `src/` | 13 files | **0** | ✅ |
| **D-9** address-bar resize | full refresh | guarded, GSAP-matched | ✅ |
| Overflow @320px `/` | 0px → *10px regression* | **0px** | ✅ |
| Overflow @320px `/case-studies` | **190px** (pre-existing) | **0px** | ✅ |
| Overflow @320px `/about` | **22px** (pre-existing) | **0px** | ✅ |
| Overflow @1440px `/` | 0px | **0px** | ✅ desktop safe |
| Typecheck | — | `tsc --noEmit` clean | ✅ |

### Still open after Phase 2

- **D-5 on `/start` — P0, not fixed.** `start-intake-form.tsx` bypasses the shared
  `<Input>` with a hardcoded `text-[14px]` in its `FIELD_BASE` constant. A hardcoded `px`
  value is immune to the root-font fix, so all **12 controls still measure 14px and
  10 of 12 are 43px tall**. Needs the raw `<input>`s migrated onto `ui/input.tsx`, or
  `FIELD_BASE` moved to `text-base`. First item of Phase 3.5.
- **`inputmode` / `autocomplete`** still absent on every control on both forms
  (`/contact`: 4 of 4 missing both). No email keyboard, no autofill.
- **D-14 residual** — 17 of 20 interactive elements on `/case-studies` are still under
  44px. These are the footer link lists and the `h-9` filter pills, which need
  restructuring rather than a token change. Phase 3.
- **Focus-into-menu unverified.** GSAP's open tween does not run in a non-compositing
  pane, and a `visibility: hidden` element cannot take focus, so the assertion is
  inconclusive — not failing. The Tab trap fires (`defaultPrevented: true`) and Escape
  restores focus to the trigger. Needs a visible browser.
- **Everything in Phases 3–6.** No touch motion grammar exists yet; the primitives in §4
  are designed, not built.

---

## 11 · PHASE 3 OUTCOME — the touch reveal, the forms, the dead accents

Commits `991a8df` (centre-focus), `22c95ec` (forms), `53a1b47` (accents + targets).
All numbers **[measured]** live at 390×844 with `(pointer: coarse)` confirmed true, on a
cold `rm -rf .next` build, with `getComputedStyle(document.body).boxSizing` asserted so no
reading came from an unstyled page.

| Defect | Before | After | |
|---|---|---|---|
| **D-1** founder portraits on touch | `--fr-hr: 0px`, grayscale forever | **`150%`, `circle(150%)`** | ✅ |
| **D-2** case-study logo/screenshot | `opacity: 0` forever | **`opacity: 1`** | ✅ |
| **D-2** card text during reveal | (risk: blanked) | **`opacity: 1`, `pointer-events: auto`** | ✅ |
| **D-5** `/start` controls under 16px | 12 of 12 | **0 of 12** | ✅ |
| **D-5** `/start` controls under 44px | 10 of 12 | **0 of 12** | ✅ |
| **D-10** ledger ticks painting | 0 of 8 / 0 of 6 | **8 of 8 / 6 of 6** | ✅ |
| **D-10** ledger underlines | 0 painted | **8 × 96px / 6 × 96px** | ✅ |
| **D-4** intake review overflow | overflowed on a real email | **0px** at 320/375/1440 | ✅ |
| **D-14** self-audit controls | ~15–18px tall | **44–46px**, desktop geometry unchanged | ✅ |
| **D-16 / D-17 / D-21 / D-22** | — | fixed | ✅ |
| **D-18** founders one-shot sample | one-shot | subscribed | ✅ |
| **Desktop @1440 `[data-focus]`** | — | **0 elements, ever**; `--fr-hr: 0px` at rest | ✅ |
| Console errors | — | **none** | ✅ |

### A verification trap worth recording

Mid-verification `/about` reported `focusedCount: 0` across a 14-point full-page scroll,
which read exactly like "the primitive was never wired here". It was wired, and it works —
**IntersectionObserver callbacks are delivered during the rendering steps, which are
throttled in a non-compositing pane**, so the callback simply had not been delivered yet.
An identical hand-built observer on the same element fired, and the hook's attribute
appeared immediately after. Same family as the rAF traps already documented: in this
environment, *absence* of an IO/rAF effect is not evidence of a defect. Re-test before
reporting a regression.

Separately, the three parallel agents share one `.next`, and their rebuilds clobbered each
other's chunk manifests mid-measurement — producing runs where every element measured
13.33px and `display: grid` did not exist. Always assert the page is styled before trusting
a number.

### Still open after Phase 3

- **Phase 4 (WebGL)** — the 180svh empty void on home is untouched; the passage beat is the
  approved "wow" payload and is not built.
- **`M-4 usePressState`, `M-5 <DragRail>`, `M-8` route transition** — designed in §4, not built.
  `/resources` cards still have zero tap feedback (D-15).
- **D-14 residual** — footer link lists (~20px) and `h-9` filter pills (36px) still under 44.
  These need restructuring, not a token change.
- **D-6** audit week timeline still SSRs a 580vh runway on phones then collapses it.
- **Focus-into-menu** still unverified for the reason in §10.
- **Scroll FPS and screenshots** still unmeasured — §6 gaps stand.

### Two notes for whoever picks this up

- **There is no cookie banner in this codebase.** `AGENTS.md` §5 specifies one; it was
  never built. Any audit item referencing it has no target.
- **`--header-h` grew 79.3px → 97.6px** with the root change, shifting hero top padding by
  ~18px. Intended scale-up, not breakage, but it is a visual delta worth a look.
- **Turbopack serves stale CSS across edits.** A `globals.css` change can keep reporting
  the OLD computed value through several dev-server restarts. `rm -rf .next` and restart
  before trusting any measurement, or you will chase a phantom.
