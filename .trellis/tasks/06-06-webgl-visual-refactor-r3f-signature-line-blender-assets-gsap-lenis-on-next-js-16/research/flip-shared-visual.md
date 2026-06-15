# Research / IMPLEMENTATION PLAN: SLICE A — the shared ABSTRACT "study visual" (Flip source + destination)

- **Query**: Design ONE reusable, deterministic, abstract per-study visual that renders IDENTICALLY on each grid card AND as a NEW detail-page hero figure, so it becomes a real GSAP Flip source+destination — no fabricated client imagery, zero copy change, reconciled with the 3 existing `CardImageDistort` builds.
- **Scope**: internal (codebase) — design slice of the deferred PIANO §5.5 Flip handoff
- **Date**: 2026-06-13
- **Status**: BUILD plan (user opted in). This slice designs the SHARED VISUAL + markup contract. The cross-route Flip *animation/clone-shim* is SLICE B (separate); this slice makes Slice B possible by giving it a real source node and a real destination node with a stable `data-flip-id`.

---

## TL;DR

- Create **one** component, `StudyVisual`, a cheap **CSS/gradient** "signal panel" seeded deterministically from `study.id` (golden-ratio hash, mirroring the shipped `seedFor` in `resource-preview.tsx`). Cyan `#3BE1FF` → violet `#7C5CFF` on navy. No photo, no baked text, `aria-hidden`, decorative.
- It renders **byte-identical markup** (same element type, same `data-flip-id={study.id}`, same classes, same aspect) in TWO places: (1) wrapping the top of EACH of the 13 grid cards, and (2) as a NEW `<figure>` hero block at the top of the detail page. → a real Flip source + destination.
- **Reconcile with `CardImageDistort`**: KEEP it. For the 3 builds (spherenode/quantex/terra-noa) the real `previewImage` becomes a hover-reveal layer rendered INSIDE the same `StudyVisual` shell (the gradient is the resting state + the Flip element; the photo + WebGL distortion stay as the hover enhancement). One node flies; no double-up. (Decision D2 below — alternative is to drop distort for those 3; recommend KEEP.)
- **Default to CSS gradient** (no per-card WebGL). The visual must degrade to a static gradient under reduced-motion / lite / off — which a CSS panel already is.
- **Copy freeze CONFIRMED**: `src/data/case-studies.ts` and the detail copy are NOT edited. The only data touch is OPTIONAL and additive (see D3): the visual seeds from existing fields (`id`, `industry`, first `metric.value`) — no new strings, no English/Italian text.
- **NEW detail hero `<figure>` is a layout addition to all 13 detail pages** — new visual STRUCTURE, not new copy. **FLAG for user sign-off** (Open Decision D1).

---

## Findings (the actual code)

### The 13 studies and which carry imagery
`src/data/case-studies.ts` — array of **13** (`grep '^  {'` = 13). Exactly **3** have `previewImage` (confirmed assets on disk):
- `spherenode` → `/case-studies/spherenode-preview.webp` (line 53)
- `quantex` → `/case-studies/quantex-preview.webp` (line 77)
- `terra-noa` → `/case-studies/terranoa-preview.webp` (line 102)

`public/case-studies/` contains exactly those 3 `.webp` files — **no asset for the other 10** (revolut, jp-morgan, apple-uk, pharma-deloitte, regione-sardegna, salvatori, leonardo, who, rsa-italy, stealth-greentech). Confirmed: cannot fabricate the missing 10 → the shared visual MUST be procedural for all 13. (This is the binding hard-constraint from SHARED CONTEXT.)

Fields available to SEED a deterministic visual without touching copy:
- `id` (stable slug — the natural Flip key and the seed source)
- `industry` (7-value union: FinTech/Healthcare/Aerospace/Public Sector/Industrial/Energy/Agritech) — can bias hue ANGLE within the cyan→violet band
- `metrics[0].value` (string) — can bias density/“signal strength”, but parsing it is optional; prefer pure `id`-hash for determinism.

### The grid (`src/app/case-studies/case-studies-client.tsx`)
- Each card is a `<Link href={/case-studies/${study.id}} className="card-steel group flex flex-col h-full p-7" …>` wrapped in `<Reveal>`.
- The 3 builds currently render `{study.previewImage && <CardImageDistort src alt />}` as the FIRST child (absolute, behind a `z-10` text stack).
- Text stack: `industry` eyebrow → `<h3>{study.client}</h3>` → engagement → summary (`line-clamp-4`) → role + arrow. **All copy stays.**
- There is **no card "media area"** today on the 10 text-only cards — the card is padding + text. So the shared visual adds a real top media band the cards don't currently have. (Layout addition on the grid too — part of D1.)

### The detail page (`src/app/case-studies/[slug]/case-study-detail-client.tsx`)
- Today: a decorative radial halo (`aria-hidden`, lines 41–46) → breadcrumb → eyebrow (`{study.industry} · {engagement}`) → `data-split-reveal` `<h1>` (the choreographer owns it; `key={language}`) → role/domain → lead → brass rule → metrics (`CountUp`) → tech stack → CTA → prev/next.
- **There is NO hero figure / media block.** The new `<figure>` goes BETWEEN the breadcrumb `<nav>` and the eyebrow `<p>` (or between eyebrow and `<h1>`), inside the existing `<article className="container-px max-w-5xl relative z-10">`. It must NOT wrap the `<h1>` (SplitText owns that subtree; see Conflict Z4).
- Per-industry accent already exists here: `INDUSTRY_ACCENT` map (line 10) + `const [firstWord, ...rest] = study.client.split(" ")`. Reuse `accent` to tint the hero visual so card and hero share the same hue.

### The home rail (`src/components/sections/case-studies-rail.tsx`) — visual-language reference
- Cards are translucent (`bg-[hsl(216_28%_10%/0.45)]`) so the **WebGL RailPlanes** paint through them on the home full+WebGPU path; `INDUSTRY_COLOR` map gives each industry a distinct hue (FinTech cyan, Aerospace violet `260_60%_70%`, etc.).
- IMPORTANT: the home rail is a DIFFERENT surface (its own `RailPlanes` WebGL, gated `pathname === "/"`). **Do NOT add `StudyVisual` to the rail** — it would collide with RailPlanes and change the home look. Slice A touches `/case-studies` grid + `[slug]` detail ONLY. We DO borrow the rail's industry→hue idea for consistency of the visual language.

### Existing precedent to MIRROR (strong) — `src/components/resources/resource-preview.tsx`
This is the template for the whole approach and proves the team already ships exactly this kind of seeded gradient panel:
- `const seedFor = (i: number) => (i * 0.618034) % 1;` — golden-ratio hash, "same as RailPlanes". **Reuse this exact recipe** (seed off a numeric hash of `study.id` instead of array index, so reorderings stay stable).
- The fallback card gradient recipe is the on-brand reference:
  ```css
  background:
    radial-gradient(circle at 30% 30%, hsl(var(--accent) / 0.28), transparent 60%),
    conic-gradient(from 200deg at 70% 70%, #7C5CFF44, #3BE1FF33, transparent 70%),
    hsl(var(--bg) / 0.85);
  ```
  → cyan→violet on navy, exactly our brief. Our `StudyVisual` is a seeded variant of this (rotate the conic `from` angle, move the radial origin, shift hue by the seed/industry).
- It is `aria-hidden`, `pointer-events:none`, and `display:none` under reduced-motion — the a11y + RM contract we copy.

### Tooling (verified)
- `gsap ^3.15.0`, `@gsap/react 2.1.2` installed. `node_modules/gsap/Flip.js` present (per step-8 doc). **No `gsap/Flip` import anywhere in `src/`** (the one "Flip" grep hit is a code comment in `preloader.tsx`). Clean slate — Slice A introduces NO Flip code yet; it only lays the markup. Register pattern (Slice B): `if (typeof window !== "undefined") gsap.registerPlugin(Flip);` mirroring `case-studies-rail.tsx` L18–20.
- `/case-studies` routeFx tone (`routeFxStore.ts` L107): `particleCountScale 1.1, particleOpacity 0.38`, bloom neutral "so the metric cards read crisp". The detail/[slug] tone is `DETAIL_FX` (quiet). The `StudyVisual` is a DOM/CSS layer above the canvas — it does not touch routeFx; it just needs to read crisp against this neutral-bloom backdrop (use enough navy base so bloom bleed never washes it out).

---

## DESIGN

### Files to CREATE
**`src/components/fx/study-visual.tsx`** (new) — `<StudyVisual study={…} variant="card" | "hero" />`.
- Renders a single root node:
  ```tsx
  <figure
    data-flip-id={study.id}
    aria-hidden="true"
    className={cn(
      "study-visual",
      variant === "card" ? "study-visual--card" : "study-visual--hero",
    )}
    style={studyVisualVars(study)}   // CSS custom props: --sv-hue-a, --sv-hue-b, --sv-seed, --sv-angle
  >
    <span className="study-visual__field" />        {/* the gradient signal panel */}
    <span className="study-visual__grain" />         {/* faint dot/line texture, optional */}
    {study.previewImage && (
      <CardImageDistort src={study.previewImage} alt={`${study.client} product preview`} />
    )}
  </figure>
  ```
  - `variant="card"`: aspect ratio band at the TOP of the card (e.g. `aspect-[16/10]` or fixed `h-40`), rounded to match `card-steel`.
  - `variant="hero"`: wider/taller hero block (e.g. `aspect-[21/9]`, full `max-w-5xl` width) on the detail page.
  - **CRITICAL Flip rule**: the element TYPE (`figure`), the `data-flip-id`, and the seeded gradient must be IDENTICAL in both variants. Only the SIZE/aspect differs — that is exactly what Flip animates (it diffs rects of the same logical element). Do NOT change `border-radius`/gradient stops between variants beyond what naturally scales, or the Flip will look like a cross-fade rather than a morph. Keep `--sv-*` vars identical across variants.
- `studyVisualVars(study)` is a pure deterministic function: `hash(study.id)` → `seed ∈ [0,1)` via the golden-ratio recipe, then derive `--sv-angle` (conic start), `--sv-x/--sv-y` (radial origin), and a small hue rotation keyed off `industry` (stay inside the cyan→violet band — never leave brand). No randomness, no Date, no Math.random → SSR/CSR identical (no hydration mismatch).
- Capability/degradation: **pure CSS by default — no WebGL in this component.** The 3 builds reuse the EXISTING `CardImageDistort` (its own gate already handles RM/coarse/no-WebGL2 internally), layered INSIDE the shell as the hover enhancement. So the gradient is always the resting + Flip element; the photo only fades in on hover where it exists. Under reduced-motion the whole thing is a static gradient (CSS `@media (prefers-reduced-motion)` neutralizes any keyframe).

**`src/components/fx/study-visual.css`** or an appended block in `globals.css` — the `.study-visual*` classes (mirroring how `card-image-distort` / `resource-preview-card` live in `globals.css`). Includes the seeded gradient using the `--sv-*` vars, the RM `@media` that freezes it, and the `--card`/`--hero` size variants.

### Files to EDIT
1. **`src/app/case-studies/case-studies-client.tsx`** (the grid):
   - Import `StudyVisual`; REMOVE the direct `CardImageDistort` import + its `{study.previewImage && <CardImageDistort/>}` (it moves INTO `StudyVisual`).
   - Inside the `<Link className="card-steel …">`, render `<StudyVisual study={study} variant="card" />` as the FIRST child (the media band), then keep the existing `<div className="relative z-10 …">` text stack BYTE-IDENTICAL.
   - The card padding `p-7` may need to become `p-0` on the media band + `p-7` on the text stack, OR the visual sits as a full-bleed top band with the text padded below — a small layout reflow on the card (part of D1). All COPY, the `href`, `data-cursor="view"`, `aria-label` unchanged.
2. **`src/app/case-studies/[slug]/case-study-detail-client.tsx`** (the detail hero):
   - Import `StudyVisual`; add `<StudyVisual study={study} variant="hero" />` as a NEW block right after the breadcrumb `<nav>`, BEFORE the eyebrow (or between eyebrow and `<h1>` — NOT wrapping `<h1>`). It is the Flip DESTINATION.
   - Nothing else changes; `INDUSTRY_ACCENT`/`accent`, the `<h1>` split-reveal, metrics, stack, CTA all stay.
3. **`src/app/globals.css`** (or new css module) — add `.study-visual*` rules.
4. **`src/components/fx/card-image-distort.tsx`** — likely NO change needed; it already `closest('.card-steel')` for hover and is `pointer-events:none absolute inset-0`. Verify it still finds `.card-steel` when nested one level deeper inside `StudyVisual` (it walks ancestors with `closest`, so it will). If the hover-reveal CSS keys off `.card-steel:hover .card-image-distort__img`, that selector still matches through the wrapper — **confirm in QA**, do not pre-edit.

### Deterministic seed (code sketch)
```ts
// study-visual.tsx — deterministic, SSR-safe, no Math.random/Date.
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296; // [0,1)
}
const GOLDEN = 0.618033988749895;
function studyVisualVars(study: CaseStudy): React.CSSProperties {
  const seed = (hashId(study.id) + GOLDEN) % 1;           // golden-ratio decorrelation
  const industryBias = INDUSTRY_HUE[study.industry] ?? 0;  // small ± within cyan→violet
  return {
    // consumed by the CSS gradient
    ["--sv-seed" as string]: seed.toFixed(4),
    ["--sv-angle" as string]: `${Math.round(120 + seed * 240)}deg`,
    ["--sv-x" as string]: `${Math.round(20 + seed * 60)}%`,
    ["--sv-y" as string]: `${Math.round(20 + ((seed * 7) % 1) * 60)}%`,
    ["--sv-hue-shift" as string]: `${industryBias}deg`,
  };
}
```
Gradient (CSS, both variants share it):
```css
.study-visual__field {
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at var(--sv-x) var(--sv-y), hsl(var(--accent) / 0.30), transparent 62%),
    conic-gradient(from var(--sv-angle) at 72% 70%, #7C5CFF55, #3BE1FF33, transparent 72%),
    hsl(var(--bg));
  filter: hue-rotate(var(--sv-hue-shift, 0deg));
}
@media (prefers-reduced-motion: reduce) { .study-visual__field { filter: none; } }
```

---

## Flip element contract (for SLICE B — recorded here so the markup is correct now)
- The Flip operates on the node carrying `data-flip-id={study.id}` — the `<figure>` root, present on BOTH ends, identical type/classes.
- SLICE B (not this slice) will, on card click: `Flip.getState('[data-flip-id="<slug>"]')` on the grid, navigate, then on the detail mount `Flip.from(state, {targets: '[data-flip-id="<slug>"]', absolute, …})`. Because App Router unmounts the grid (Killer 2 from step-8 doc), Slice B uses the **fixed-position cloned-overlay shim** and must coordinate with the curtain/scroll/canvas (Conflict Zones below). Slice A's only obligation: make BOTH nodes real, identically-marked, and present. ✅
- a11y: the figure is `aria-hidden="true"` decoration. The card's real `<Link>` + text and the detail `<h1>` stay the source of truth; focus still lands on the detail `<h1>` (unchanged). The future flying clone is also `aria-hidden`.

---

## CONFLICT ZONES with shipped systems (Slice A is mostly inert; flags for Slice B)
- **Z1 — Route curtain (`src/app/template.tsx`)**: full-viewport navy `clip-path` wipe (`CURTAIN_DURATION 0.62s`, `z-index 60`). Slice A adds no animation, so no collision now. For Slice B the flying clone would be HIDDEN behind the curtain (`z-60`) unless the clone is `z > 60` or the curtain is gated for this nav class. **Do not edit template.tsx in Slice A.**
- **Z2 — Scroll hard-reset (`src/components/smooth-scroll-provider.tsx` L69–77)**: every non-home nav does `getLenis().scrollTo(0,{immediate})` + `ScrollTrigger.refresh()` ×2. Slice A's static figures are in normal flow → unaffected. For Slice B the clone must be `position:fixed` (viewport space) so the instant scroll-to-top doesn't snap it. **No edit in Slice A.**
- **Z3 — Canvas / signature line re-curve (`src/webgl/Scene.tsx` L202–207)**: `setReveal(0→1)` over 420ms on pathname change. The `StudyVisual` is a DOM layer above the canvas; the canvas is `position:absolute inset:0` behind content. The hero figure sits in normal flow at `z-10` inside `<article>` — it occludes a strip of the canvas but does not touch its render. **No edit.** (Just verify the hero figure's navy base reads crisp over the line/dust at this route's `particleOpacity 0.38`.)
- **Z4 — SplitText owns the `<h1>`**: both grid and detail `<h1>` are `data-split-reveal` with `key={language}`. The new `<figure>` must be a SIBLING of the `<h1>`, never an ancestor/descendant, or the choreographer's SplitText reconciliation breaks. Insert the hero figure ABOVE the eyebrow/`<h1>`.
- **Z5 — `card-steel` hover affordances + custom cursor**: `data-cursor="view"`, the CardTilt sheen/glow, hover audio all key off the `.card-steel` link and Tailwind `group`. `StudyVisual` is `pointer-events:none aria-hidden` → it must NOT intercept pointer events or break `group-hover`. The existing `card-image-distort` already proves this layering works; mirror it (`pointer-events-none`, negative/zero z under the `z-10` text). **Verify hover still drives the photo reveal on the 3 builds.**
- **Z6 — `Reveal` (IntersectionObserver) wraps each card**: the `StudyVisual` lives inside the `<Link>` which is inside `<Reveal>`. No conflict; it fades in with the card.

---

## prefers-reduced-motion · a11y · bilingual
- **RM**: `StudyVisual` is pure CSS; under RM the gradient is fully static (no keyframes, `filter:none`). `CardImageDistort` already self-disables its WebGL under RM/coarse (its `useEffect` gate). Slice B: no Flip under RM (instant route swap — template.tsx already does the RM instant path). ✅
- **a11y**: figure `aria-hidden="true"`; no focusable content inside; real `<Link>`/text/`<h1>` unchanged; focus order unchanged (figure is inert). ✅
- **bilingual**: ZERO text in the visual (no baked label) → nothing to translate; `useLanguage` copy untouched. ✅

---

## OPEN DECISIONS (need user sign-off)
- **D1 — New hero `<figure>` on all 13 detail pages + a media band on all 13 grid cards is a LAYOUT addition (new visual structure, not new copy).** This is the one structural change beyond a pure refactor. It changes the detail page's first-fold and the card top. RECOMMEND: yes — it is required for a real Flip destination and is on-brand/decorative; copy is byte-identical. **Confirm acceptable.**
- **D2 — `CardImageDistort` for the 3 builds: KEEP (layer inside `StudyVisual` as the hover photo) vs RETIRE (unified gradient only, drop the real screenshots).** RECOMMEND **KEEP** — the 3 real product shots are genuine, on-brand assets and retiring them loses information for no gain; nesting them inside the shell means one Flip node still flies (the figure), with the photo as a hover detail. (Retiring is simpler but throws away the only real imagery.)
- **D3 — Seed source: pure `id`-hash (fully deterministic, recommended) vs also biasing by `industry` hue / `metrics[0]` density.** Industry bias gives per-sector family resemblance (mirrors the rail's `INDUSTRY_COLOR`) at the cost of a tiny `INDUSTRY_HUE` map in the component (NOT in `case-studies.ts` — no data-file edit). RECOMMEND id-hash + small industry hue bias, both in `study-visual.tsx`.
- **D4 — Card media aspect / whether the gradient band pushes existing card text down** (reflow) vs sitting as a faint full-card background behind the text (no reflow, less of a Flip "thumbnail"). RECOMMEND a real top band (`aspect-[16/10]`) so the Flip source is a visible thumbnail; flag the minor card reflow.

---

## QA PLAN (Slice A — the shared visual + markup; Slice B animation QA is separate)
- **Build/type gates (the only binding gates)**: `next build` clean + TS strict (the `--sv-*` CSS-var typing via `React.CSSProperties` index signature must compile). `bun` is the installer.
- **No copy diff**: `git diff src/data/case-studies.ts` → empty; detail/grid copy strings byte-identical (only structural JSX + imports change).
- **Determinism / no hydration mismatch**: same seed server and client (no `Math.random`/`Date`); open 2–3 detail pages + the grid, confirm each study's gradient is stable across reloads and identical between its card and its hero (visual diff cyan→violet, same hue per `id`).
- **Reconcile the 3 builds**: on spherenode/quantex/terra-noa cards, hover still fades in the real `previewImage` + WebGL distortion (CardImageDistort intact), and the gradient is the resting/Flip layer. No double-render, no console error, WebGL context still disposes on leave (watch for context leaks across repeated hovers).
- **a11y**: axe/manual — the figure is `aria-hidden`, not in tab order; focus still lands on detail `<h1>`; card `<Link>`/`aria-label` unchanged; `data-cursor="view"` + sheen/glow still fire (Z5).
- **Multi-viewport (REAL Chrome, not headless — repo WebGL beats are unreliable in headless background tabs per MEMORY)**: 360 / 768 / 1280 / 1440. Grid: 1-col → 2-col at `md`; the media band scales, text stays readable, `line-clamp` intact. Detail hero figure: sensible aspect on mobile (don't eat the whole first fold), crisp over the canvas at `/case-studies`/[slug] routeFx (Z3 — confirm bloom doesn't wash it).
- **RM**: gradient fully static, no WebGL distortion mounts (CardImageDistort gate), no keyframes; figure still present (so Slice B's RM path = instant swap with the destination already there).
- **60fps / no-regression on shipped systems**: navigating into `/case-studies` and `[slug]` still plays the curtain + line re-curve + scroll-reset exactly as before (Slice A adds no animation, so this is a sanity check that the new DOM didn't perturb measurement: the `[data-line-anchor]` anchors on the grid are unchanged; the hero figure is inside `<article>`, not a new `data-line-anchor`). Confirm no layout thrash / CLS from the new media band (reserve aspect with `aspect-ratio` so it doesn't shift on image load for the 3 builds).
- **Console-free** on grid + all 13 detail routes, EN and IT, after language toggle (SplitText remount via `key={language}` still clean — Z4).

## Caveats / Not Found
- This slice writes the SHARED VISUAL + the Flip MARKUP contract only. The actual cross-route Flip animation (clone shim, curtain/scroll/canvas coordination per Killer 2 in `step-8-flip-feasibility.md`) is **Slice B** and is intentionally out of scope here — but the conflict zones are documented above so Slice B inherits them.
- `CardImageDistort` may need a one-line CSS reconciliation if nesting it inside `StudyVisual` changes the `.card-steel:hover .card-image-distort__img` match depth — flagged as a QA verify, not pre-edited (the selector is descendant-based so it should hold).
- Did NOT modify any code (research/design only). No `gsap/Flip` exists in `src/` today (confirmed; the lone grep hit is a comment in `preloader.tsx`).
