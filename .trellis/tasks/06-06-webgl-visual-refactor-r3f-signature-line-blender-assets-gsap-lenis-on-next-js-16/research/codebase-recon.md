I now have a complete picture. Compiling the recon report.

---

# SERSAN Codebase Recon — WebGL/R3F Refactor Prep

**Project root:** `C:\Users\alber\Desktop\sersan-v2-main` (the prompt's `undefined\...` paths resolve here). **No git remote configured as worktree — `.git` present.** Next **16.2.6**, React **19.2.4**, Tailwind **v4**. **No three.js / R3F / drei / postprocessing installed.** GSAP 3.15 + Lenis 1.3.23 + framer-motion 12.40 are already present. **`node_modules` is MISSING** — install required before anything builds.

## 1. Provider tree & layout structure

`src\app\layout.tsx` — Server Component (`export const metadata`/`viewport`, no `"use client"`). Wrapping order (L139–168):

```
<html lang="en" class="{geistSans} {geistMono} h-full antialiased">   // static lang — keeps RootLayout a Server Component
  <head> JSON-LD org schema </head>
  <body class="min-h-full flex flex-col bg-bg text-ink">
    <a.skip-to-content>
    <LanguageProvider>            // client, React context (L157)
      <SmoothScrollProvider>      // client, Lenis+ScrollTrigger bridge (L158)
        <Navbar/>                 // client, fixed z-50
        <main id="main" class="flex-1">{children}</main>
        <Footer/>
      </SmoothScrollProvider>
    </LanguageProvider>
    <Analytics/>                  // @vercel/analytics
  </body>
```

**Where a persistent `<Canvas>` should mount:** Add it inside `SmoothScrollProvider` (so it shares the Lenis instance + reduced-motion context) but as a **sibling of `<main>`, before `<Navbar>`**, fixed/absolute and full-viewport behind content. Because layout.tsx is shared across all App Router routes, a Canvas mounted here **survives client route changes** (App Router preserves the layout subtree; only `{children}` swaps). This is the correct seam — do NOT put the Canvas in `page.tsx` (it would unmount on navigation). Note `<body>` is `position: static` with a `flex flex-col`; the Canvas must be `position: fixed; inset: 0; z-index: -1` (or a low z) and `pointer-events: none` to sit behind the DOM. The body already paints a `background-attachment: fixed` radial gradient (globals.css L262–287) that will sit *over* a `z-index:-1` canvas — that body gradient must be removed/made transparent or the canvas won't be visible.

## 2. Lenis wiring today

- **Version:** `lenis@^1.3.23` (modern package name, not the legacy `@studio-freight/lenis`).
- **Singleton:** `src\lib\lenis-singleton.ts` — refcounted single instance. `acquireLenis()` creates one Lenis (`duration: 0.9`, custom out-expo easing, `smoothWheel: true`) and **owns its own RAF loop** (`tick()` calls `instance.raf(time)` then `requestAnimationFrame(tick)`, L20–24). `releaseLenis()` tears down when refcount hits 0. `getLenis()` returns the live instance or null.
- **Who drives RAF:** the singleton itself (its private `tick`), NOT R3F (no R3F exists). `SmoothScrollProvider` (`src\components\smooth-scroll-provider.tsx`) calls `acquireLenis()` in a `useEffect`, bridges `lenis.on("scroll", ScrollTrigger.update)` (L36), installs a `ScrollTrigger.scrollerProxy` on `document.documentElement` (L54–69), hijacks anchor clicks (L39–50), and exposes `window.__lenis` (L33). **Provider bails entirely under `prefers-reduced-motion`** (L25–28) — native scroll, no Lenis.
- **Is scroll progress exposed?** **No global store / no context.** There is no zustand. Progress (0→1) is currently materialized only *locally* inside `cinematic-system-scroll.tsx` via a `progressRef = useRef<number>(0)` written by a per-component `ScrollTrigger.create({ onUpdate: self => progressRef.current = self.progress })` (L746–757). Child layers read `progressRef.current` inside their own `requestAnimationFrame` loops. Nothing publishes a page-global scroll value.
- **What must change to drive a WebGL uniform:** Two clean options. (a) **Single-loop merge (AGENTS.md §3a preference):** retire the singleton's private RAF and instead call `lenis.raf(t)` from R3F's `useFrame`/`addEffect`, so one loop drives both scroll and render — then read `lenis.scroll`/`lenis.progress` (or a `lenis.on("scroll")` handler) directly into a `uProgress` uniform each frame. (b) **Add a zustand store** (AGENTS.md §1 mandates zustand) holding `scrollProgress`, written from `lenis.on("scroll")`, read by the R3F scene — avoids prop-drilling refs. Either way the **reduced-motion early-return in SmoothScrollProvider must be reworked** so the Canvas still gets *a* progress source (currently RM kills Lenis entirely, leaving WebGL with no scroll driver).

## 3. Design tokens (palette migration)

All tokens live in `src\app\globals.css` `:root` (L7–84) as **HSL channel triples** (`H S% L%`), surfaced to Tailwind v4 via `@theme inline` (L96–129). The "brass/midnight" description is partly stale — the current palette is **navy-graphite + electric blue `#29A3F5`**, with a *legacy brass* token still hanging around. Target: navy `#0B1422` base + cyan `#3BE1FF` → violet `#7C5CFF` accent gradient.

**Tokens that must change** (file: `globals.css`):

| Token | Line | Current value | Note for refactor |
|---|---|---|---|
| `--bg` | 17 | `220 26% 7%` | → `#0B1422` ≈ `213 48% 9%`. **`viewport.themeColor` in layout.tsx L102 is hardcoded `#070b14`** — must update too. |
| `--surface` | 18 | `220 20% 13%` | re-tune to navy |
| `--surface-elev` | 19 | `220 18% 19%` | re-tune |
| `--ink` / `--ink-mute` / `--ink-dim` | 22–24 | `210 20% 96%` / `220 8% 60%` / `220 6% 32%` | keep off-white, retune mute to navy hue |
| `--rule` | 27 | `220 16% 19%` | retune |
| **`--accent`** | 38 | `205 95% 62%` (#29A3F5) | → cyan `#3BE1FF` ≈ `192 100% 62%`. **This single token drives the entire site's color** (see consumers below). |
| `--accent-dark` | 39 | `205 95% 42%` | → violet endpoint `#7C5CFF` ≈ `252 100% 68%` (repurpose as gradient tail) |
| `--accent-warm` | 40 | `36 52% 66%` | **legacy brass** — used by `--rule-warm`, cinematic-overlay "warm" pings, brass refs. Decide: drop or remap. |
| `--rule-warm` | 28 | `36 20% 32%` | legacy brass rule |
| `--refusal` | 41 | `12 65% 58%` | "What we refuse" red — keep |
| `--primary-foreground` | 52 | `220 35% 5%` | text on accent — recheck contrast on cyan |
| `--input` | 64 | `220 14% 42%` | form border contrast — re-verify AA on new bg |

**Where tokens are consumed (the accent migration blast radius):**
- `@theme inline` re-exports every var as a Tailwind color (`--color-accent` L104 etc.) → consumed as `bg-accent`, `text-accent`, `border-accent`, plus hundreds of arbitrary `hsl(var(--accent)...)` usages.
- **Hardcoded accent RGB outside the token system:** `neural-net-layer.tsx` L30–31 — `BLUE = {56,182,255} #38B6FF` and `CYAN = {124,208,255}` are baked literals, NOT reading `--accent`. Must hand-edit if that layer survives.
- Body background gradient (globals.css L269–280), `.cinematic-veil` (L294), `.section-accent-tint` / `--strong` (L426–452), `.card-steel` hover glow (L497–514, **hardcodes `hsl(220 14% 22%)` / `hsl(220 22% 11%)` navy literals**), `:focus-visible` glow (L316), `.status-dot`, `.section-rule`, `.section-divider`, `.nav-underline`, `.skip-to-content`, marquee — all reference `--accent` or hardcoded navy hsls.
- `cinematic-overlay.tsx` injects a `<style>` block (L319–450) with `hsl(var(--accent))` throughout + one hardcoded `hsl(36 95% 70%)` brass ping (L253, L259).
- There is **no gradient token** today (accent is a single solid). The cyan→violet *gradient* art direction requires introducing new tokens, e.g. `--accent-2` (violet) + gradient stops, since the current system assumes a monochrome accent.

**Fonts:** AGENTS.md specifies Editorial New / Switzer / JetBrains Mono. **The codebase uses neither** — layout.tsx L13–23 loads **Geist Sans + Geist Mono** via `next/font/google`, and globals.css L116–121 maps `--font-display`/`--font-serif`/`--font-sans` ALL to Geist (the comment L117 says "the editorial serif is fully retired"). Restoring the brand fonts is a separate decision from the brief.

## 4. Home page anatomy

`src\app\page.tsx` is a **Server Component** (no `"use client"`) rendering this order (each separated by an inline `<SectionDivider>` decorative rule, L14–20). **All 11 section components are Client Components** (verified `"use client"` line 1 each):

| # | Section | File | Scroll animation today |
|---|---|---|---|
| 01 | CinematicSystemScroll | `sections/cinematic-system-scroll.tsx` | **Heavy.** 520vh `position:sticky` pinned spine, own `ScrollTrigger.create` (scrub 0.6) writing `progressRef`; 6 stage panels driven by per-panel RAF opacity; HeroBackdrop parallax; StageRail; NeuralNetLayer; CinematicOverlay. Mobile/RM → `MobileFallback` stacked. |
| 02 | CredibilityStrip | `credibility-strip.tsx` | none (CSS marquee only) |
| 03 | ProblemSection | `problem-section.tsx` | `ui/reveal` (GSAP ScrollTrigger), `section-glow` |
| 04 | ServicesSection | `services-section.tsx` | `ui/reveal`, `section-glow` |
| 05 | ProductionGradeSection | `production-grade-section.tsx` | `ui/reveal` (`Reveal` at L499), `section-accent-tint--strong` (L463), `section-glow` |
| 06 | UseCasesSection | `use-cases-section.tsx` | `ui/reveal`, `section-glow` |
| 07 | CaseStudiesSection | `case-studies-section.tsx` | `ui/reveal`, `count-up` (GSAP ScrollTrigger), `section-glow` |
| 08 | WorkInProgress (variant="teaser") | `work-in-progress.tsx` | `ui/reveal`, `section-glow` |
| 09 | FoundersSection | `founders-section.tsx` | `ui/reveal`, `section-glow` |
| 10 | ProcessSection | `process-section.tsx` | `ui/reveal`, `section-glow` |
| 11 | FitSection | `fit-section.tsx` | `ui/reveal`, `section-glow` |
| 12 | FinalCTA | `final-cta.tsx` | `section-glow` only |

Note `page.tsx`'s doc comment (L25–43) lists "Demoted" components: `HowWeThinkSection`, `FoundersNoteSection`, `ContactForm`, `AuditSection`, `ManifestoBeat`, `FourLayerScroll`, `TheStudio`, `InteractiveAudit`, `HowWeWork`, `OurWhy` — these exist in `sections/` but are **not** on the home page. `four-layer-scroll.tsx` is dead on home.

## 5. Current fake-3D layers

Three pseudo-3D systems, all inside the pinned hero stage (`cinematic-system-scroll.tsx` L803–887), all `aria-hidden` + `pointer-events:none`:

- **HeroBackdrop** (in-file, L626–695): `<Image>` of `/images/hero/orb-core.webp` (270 KB; .png is 1.36 MB) with a RAF dolly (scale 1.22→1.34 + drift). **This is the LCP element** (`priority`). The "live WebGL scene" it replaced was already removed (see L807, L724 comments). **KEEP as mobile/RM fallback poster** for the new R3F hero; delete the RAF parallax once R3F drives the hero.
- **NeuralNetLayer** (`scene/neural-net-layer.tsx`): **Canvas2D**, 80 drifting nodes + distance links (O(n²) = ~3160 pair checks/frame) + 10 pulses, `mixBlendMode:screen`, full RAF loop, hardcoded blue/cyan literals. Cost: continuous 2D canvas redraw + per-frame allocations (`nodes.map` twice/draw, L127–128). **DELETE** — the R3F signature line + GPU instanced particles (AGENTS.md §3c) replace it natively and far cheaper.
- **CinematicOverlay** (`scene/cinematic-overlay.tsx`): pure **DOM/SVG/CSS+SMIL** — topology constellation, 3 telemetry arcs (`animateMotion` pings), shimmer, **50 dust motes**, scan pass, SVG-turbulence grain. No JS RAF (cheap-ish) but heavy DOM (~22 nodes + 50 motes + filters/blur(40px)). RM-gated. **DELETE on desktop** (postprocessing Bloom/Noise/Vignette from `@react-three/postprocessing` supersedes it); the grain/vignette could be cheaply re-created as a CSS fallback for RM.

**Planet videos:** `public/cinematic/` holds **~5.7 MB** of `mercury/neptune/pluto/saturn` `.mp4`+`.webm`+posters. **They are NOT referenced anywhere in `src`** — the only "Saturn"/"mercury" hits are stale comments in `cinematic-overlay.tsx`. These are **dead assets** (leftovers from a retired video-planet hero). Safe to delete; not a fallback. Likewise `public/images/{mercury,neptune,pluto,saturn,nebula,planet,planet-hero,saturn_rings}.jpg/png` appear orphaned.

## 6. Route transition options (Next 16 App Router)

Current state: **no `template.tsx`, no `loading.tsx`, no `not-found`-level transition, no View Transitions config.** `next.config.ts` (full contents): only `allowedDevOrigins` + `images` (avif/webp, qualities `[75,90]`, 1yr TTL). No `experimental.viewTransition` flag set.

Constraints / options given a persistent Canvas:
- **The persistent Canvas itself is the transition asset.** Because it lives in `layout.tsx` (survives navigation, §1), page transitions should be a DOM overlay/curtain + cross-fade choreographed by GSAP while the Canvas keeps rendering — not a Canvas remount.
- **`template.tsx`** (vs `layout.tsx`) re-mounts its subtree on every navigation, giving a natural enter animation hook for `{children}` — but **must NOT wrap the Canvas** (that would defeat persistence). Pattern: keep Canvas in `layout.tsx`; put a thin `app/template.tsx` around only the DOM content for enter/exit fades.
- **Next 16 supports the React **View Transitions API** behind `experimental.viewTransition: true`** (`unstable_ViewTransition`), and the router has `onRouterTransitionStart` hooks — usable to trigger the curtain. Not currently enabled here; enabling is a config add.
- `usePathname()` (already used in `navbar.tsx` L5/65) is the available signal to drive a manual GSAP route-transition timeline keyed on path change.
- The App Router is **fully static-prerendered** today (layout comment L140–142 keeps `lang="en"` static, all section pages have a server `page.tsx` + a `*-client.tsx` island). Heavy R3F must stay in client islands / `next/dynamic({ ssr:false })` to preserve SSR of content.

## 7. i18n mechanism

- `src\components\language-provider.tsx`: React **Context** (no zustand, no URL locale, no Next i18n routing). `useLanguage()` returns `{ language, setLanguage, t }`. Dictionaries are flat key→string maps: `src\data\translations\en.ts` (27 KB) + `it.ts` (28 KB), typed by `types.ts` (`Language = "en" | "it"`).
- **Hydration-safe but client-only:** always starts `"en"` on server (L64), then `detectInitial()` in a `useEffect` reads `localStorage["sersan_language"]` → cookie → `"en"` (L48–55, L66–69). `setLanguage` writes both localStorage + a 1yr cookie and updates `document.documentElement.lang` (L71–87). **All localized text re-renders on switch** — no page reload, no route change.
- **Two parallel i18n styles coexist:** (a) the `t(key)` dictionary lookup, and (b) inline ternaries `language === "it" ? ... : ...` (navbar L249/272, and `cinematic-system-scroll.tsx` keeps full EN+IT `LocalizedStage` JSX inline, L62–272 via `localizeStages(language)`).
- **GSAP SplitText complication (the real risk for §3 text reveals):** because switching language **swaps the text content of already-mounted nodes in place** (same DOM element, new children), any SplitText/char-split reveal that ran on mount will hold **stale split spans** after a language switch — the chars won't match the new string, and re-running a scroll reveal won't re-trigger (ScrollTrigger `once:true`, see `ui/reveal.tsx` L57 `once:true` + `playedRef` L31). Fixes needed: key reveal wrappers by `language` to force remount, OR re-run `SplitText.revert()`+re-split on `language` change, OR drive splits off `t()` values with a `useEffect([language])` re-init. The current `Reveal` and framer `RevealOnScroll` both fire once and never re-run — they will silently desync on EN↔IT toggle for any split-based animation.

## 8. Risk list (things that will fight the refactor)

1. **No three.js stack + no `node_modules`.** Must `bun install` (lockfile is `bun.lock`; vercel.json L4–5 pins `bun run build` / `bun install`) and add `three @react-three/fiber @react-three/drei @react-three/postprocessing zustand leva` (none present). AGENTS.md also assumes `@gsap/react useGSAP` — **not installed** (only bare `gsap`).
2. **`package.json` `ignoreScripts: ["sharp","unrs-resolver"]` + `trustedDependencies` (L37–44).** These are **bun-specific** fields. `sharp` postinstall is skipped — Next 16 image optimization (used heavily, `next.config.ts` qualities `[75,90]`, orb-core LCP) relies on sharp; on Vercel it's provided, but **local `next build` may warn/fall back**. Adding `gltf-transform`/`ktx2` tooling (AGENTS.md §3b) may need its own native-build allowances. The `qualities:[75,90]` allow-list (L14) means any new R3F texture/poster served at a non-listed quality returns HTTP 400.
3. **framer-motion 12 vs GSAP/Lenis triple-stack.** framer-motion is used in **9 files** (`reveal-on-scroll.tsx` + 8 sections: the-studio, manifesto-beat, interactive-audit, four-layer-scroll, featured-articles, faq-section, compliance-pipeline, audit-section). It runs its **own RAF + its own `useReducedMotion`**, independent of Lenis/GSAP. Mixing three animation runtimes (framer + GSAP/ScrollTrigger + R3F `useFrame`) competing for RAF is a perf + jank risk; consider consolidating reveals onto GSAP. Note most of those 8 framer sections are NOT on the home page (only `reveal-on-scroll` shim is broadly used; home sections use the **GSAP** `ui/reveal.tsx`).
4. **IntersectionObserver in `navbar.tsx`** (L114–146, `rootMargin: -45% 0px -45%`) drives active-nav state off real section heights. The cinematic spine's 520vh sticky pin + new R3F scroll choreography can shift section box positions; this observer plus the multiple `ScrollTrigger.refresh()` timeout bursts (`cinematic-system-scroll.tsx` L763 `[60,250,700,1500]ms`, smooth-scroll-provider L77) will need re-coordination after layout changes or active-state will mistrack.
5. **Lenis singleton owns its own RAF (`lenis-singleton.ts` L20–24).** AGENTS.md §3a mandates a *single* loop driving Lenis from R3F's `useFrame`. Keeping both the singleton RAF **and** R3F's loop double-ticks; the singleton must be refactored to expose `lenis.raf()` to R3F (or R3F's loop must be the sole driver). The refcount teardown (L43–51) assumes the homepage scene unmounts on nav — but a *persistent* layout-level Canvas changes that lifecycle assumption.
6. **`prefers-reduced-motion` hard-disables Lenis entirely** (smooth-scroll-provider L25–28, returns before `acquireLenis()`). A WebGL scene reading scroll from Lenis gets **no driver under RM** — needs a native-scroll fallback progress source, or the Canvas must self-disable under RM (AGENTS.md §1 degrade rule).
7. **Body paints a `background-attachment: fixed` radial gradient** (globals.css L262–287) and per-section `.cinematic-veil`/`.section-accent-tint` pseudo-element washes at `z-index:-1` (L302, L432). A behind-content Canvas at `z-index:-1` will be **occluded by these**; the body bg and veils must go transparent or sit at a layer above the canvas but below content. CSS stacking will fight a naive Canvas insert.
8. **Hardcoded color literals bypass the token system** — `neural-net-layer.tsx` L30–31 (RGB), `card-steel`/navbar navy hsls (globals.css L477–514, navbar.tsx L207–211), cinematic-overlay brass pings. The §3 palette migration won't propagate to these via a token swap; each is a manual edit.
9. **`next-themes@0.4.6` is a dependency but unused** (no `ThemeProvider`/import anywhere in `src`). Dark mode is hardcoded via CSS `:root`. Dead dep — no `dark:` class strategy to honor, simplifying the palette swap but worth removing.
10. **SSR/static-prerender expectation.** Layout deliberately keeps `lang` static for static prerendering, and the hero H1 is intentionally in the SSR HTML (`cinematic-system-scroll.tsx` L702–709, L786 SSR-desktop default for SEO/LCP). Any R3F hero must be `dynamic(..., { ssr:false })` with the SSR'd H1/poster preserved, or LCP + SEO regress.
11. **`vercel.json` immutable 1yr cache on image/font extensions** (L25–29) — new GLB/KTX2/HDR asset extensions are **not** in that header rule and won't get long-cache headers unless added; conversely cache-busting GLBs need hashed filenames.