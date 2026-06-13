# Headings + Eyebrows Inventory (typography pass research)

Repo root: `C:\Users\alber\Desktop\sersan-v2-main`. All paths below are repo-relative.
Date: 2026-06-12. Branch: `feat/webgl-refactor`.

---

## 1. HeadingChoreographer

**File:** `src/components/fx/heading-choreographer.tsx` (131 lines)

**What it is:** a global, render-nothing client component (`<div className="hidden" aria-hidden />`) that applies a GSAP **SplitText line-mask reveal** to every element in the document carrying the attribute **`data-split-reveal`**.

**Mounted:** `src/app/layout.tsx:12` (import) and `src/app/layout.tsx:197` (`<HeadingChoreographer />`, inside `SmoothScrollProvider`, sibling of `CardTiltController` / `LabelScrambler` / `CustomCursor`).

**API:**
- No props. `export function HeadingChoreographer()` (line 47).
- Target discovery: `document.querySelectorAll("[data-split-reveal]")` (line 58–60) — opt-in purely by adding the `data-split-reveal` attribute to a heading.
- Re-runs via `useGSAP` with `dependencies: [language, pathname]` (line 127) — rebuilds all splits on every EN/IT toggle and every route change (stale-split protection).
- Waits for `document.fonts.ready` before splitting (line 72) so line boxes are measured with the real webfonts.

**How it animates today:**
- `new SplitText(el, { type: "lines", mask: "lines", linesClass: "split-line" })` (lines 75–79) — each line wrapped in an overflow clip, no CSS needed.
- Paused `gsap.from(split.lines, { yPercent: 115, duration: 0.85, stagger: 0.09, ease: "expo.out" })` (lines 86–92). Tokens at lines 30–32: `BASE_Y_PERCENT = 115`, `BASE_DURATION = 0.85`, `BASE_STAGGER = 0.09`.
- **Velocity modulation** (lines 42–45, 96–102): on enter it samples `useScrollStore.getState().velocity` (Lenis px/frame, store at `src/webgl/store/scrollStore.ts`), clamps `|v|/45` to 0..1, and lerps yPercent 115→~136, stagger 0.09→~0.14, duration 0.85→~0.75, then `tween.invalidate().restart()`.
- Fired by a `once: true` ScrollTrigger at `start: "top 88%"` (lines 103–108) **plus** an at-creation in-view check (`if (st.isActive || st.progress > 0) fire();`, line 116) so SPA-navigated headings already in view still play.
- Reduced motion: bails entirely (line 54) — headings just render.
- Manual cleanup of triggers/tweens/splits in the effect's return (lines 120–125) because creation happens inside the async `fonts.ready` callback.

**CRITICAL FINDING — currently a no-op:** no element in the entire `src` tree carries `data-split-reveal`. Grep hits are only the component itself and a comment in `src/components/fx/label-scrambler.tsx:29`. The choreographer is mounted, healthy, and wired for velocity, but **zero headings are subscribed**. The site-wide wiring task = adding `data-split-reveal` to the H1s/H2s below (minding double-animation conflicts with `Reveal` wrappers and `SectionHeading`'s own internal SplitText — see §4).

Note: `.split-line` class is referenced in `src/app/globals.css` (grep hit) for styling of split lines.

---

## 2. H1 inventory by route

All H1s use the Fraunces display serif. Two idioms: utility class `heading-display` (globals.css:363, `clamp(3rem,7.5vw,7rem)`) on legal pages, or inline `font-display text-[clamp(...)]` everywhere else. **None use the `t()` dictionary** — every bilingual H1 is an inline `isEn ? <>EN…</> : <>IT…</>` ternary (via `useLanguage()` from `src/components/language-provider.tsx`; `t(key)` exists, line 27, but headings don't use it). Most H1s contain a styled accent `<span className="italic" style={{color:"hsl(var(--accent))"}}>` child — relevant to SplitText (splitting must preserve nested spans; `type:"lines"` handles this).

| Route | Page file | H1 renders in | Line | Font / class | Animation wrapper today | Text source |
|---|---|---|---|---|---|---|
| `/` | `src/app/page.tsx` → `CinematicSystemScroll` | `src/components/sections/cinematic-system-scroll.tsx` | 465–470 (`data-hero-headline`) | `font-display text-[clamp(2.35rem,4.8vw,4.5rem)]` | **None / special**: WebGL `HeroTextParticles` owns the hero title; the DOM H1 is set to `opacity:0` while the particle morph is active (lines 348–393). Stage panels fade via rAF, not GSAP. | `STAGE_CONTENT[0].title` inline localized JSX, lines 78–97 (accent span inside) |
| `/consulting` | `src/app/consulting/page.tsx` → `ConsultingClient` | `src/app/consulting/consulting-client.tsx` | 203–219 | `font-display text-[clamp(2.25rem,7vw,4.75rem)] … text-balance mb-8 pb-1` | **None** (plain div hero, no Reveal) | inline `isEn` ternary, accent-italic span |
| `/audit` | `src/app/audit/page.tsx` → `AuditClient` | `src/app/audit/audit-client.tsx` | 172–188 | `font-display text-[clamp(2.25rem,7vw,4.75rem)]` | **None** (plain hero) | inline `isEn` ternary, accent-italic span |
| `/case-studies` | `src/app/case-studies/page.tsx` → `CaseStudiesClient` | `src/app/case-studies/case-studies-client.tsx` | 31–47 | `font-display text-[clamp(2.25rem,7vw,4.5rem)]` | wrapped in `<Reveal>` (line 22, `ui/reveal.tsx` — whole hero block fades up as one) | inline `isEn` ternary |
| `/case-studies/[slug]` | `src/app/case-studies/[slug]/page.tsx` → detail client | `src/app/case-studies/[slug]/case-study-detail-client.tsx` | 70–82 | `font-display text-[clamp(2.25rem,7vw,4.75rem)]` | **None** | computed `firstWord` + accent-italic `rest` from `src/data/case-studies.ts` (`study.title`/`titleIt`) |
| `/resources` | `src/app/resources/page.tsx` → `ResourcesClient` | `src/app/resources/resources-client.tsx` | 49–65 | `font-display text-[clamp(2.25rem,7vw,4.5rem)]` | wrapped in `<Reveal>` (line 40) | inline `isEn` ternary |
| `/resources/[slug]` | `src/app/resources/[slug]/page.tsx` → detail client | `src/app/resources/[slug]/resource-detail-client.tsx` | 107–109 | `font-display text-[clamp(2rem,5.5vw,3.5rem)]` | **None** | `title` from `src/data/resources.ts` (plain string, no accent span) |
| `/about` | `src/app/about/page.tsx` → `AboutClient` | `src/app/about/about-client.tsx` | 68–84 | `font-display text-[clamp(2.5rem,8vw,5.5rem)]` (largest H1 on site) | wrapped in `<Reveal>` (line 59) | inline `isEn` ternary |
| `/contact` | `src/app/contact/page.tsx` → `ContactClient` | `src/app/contact/contact-client.tsx` | 93–109 | `font-display text-[clamp(2.25rem,7vw,4.5rem)]` | wrapped in `<Reveal>` (line 82) | inline `isEn` ternary |
| `/trust` | `src/app/trust/page.tsx` → `TrustClient` | `src/app/trust/trust-client.tsx` | 150–166 | `font-display text-[clamp(2.25rem,6vw,4rem)]` | **None** (plain header div, `data-line-anchor="hero"`) | inline `isEn` ternary |
| `/start` | `src/app/start/page.tsx` (**server component**, EN-only) | same file | 33–38 | `font-display text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.98]` | **None** | hardcoded EN (accent span uses `text-[hsl(var(--accent))] font-display font-medium`, not italic) |
| `/services/<slug>` (4 static dirs: `architecture`, `automation`, `engineering`, `mlops` — there is NO dynamic `[slug]`) | `src/app/services/*/page.tsx` → `ServiceDetail` | `src/components/sections/service-detail.tsx` | 80–85 | `font-display text-[clamp(2.5rem,5.2vw,4.5rem)] leading-[0.98]` | **None** | `name` + accent block `positioning` from `src/data/services.ts` |
| `/privacy`, `/terms`, `/cookies` | `*-client.tsx` | `src/app/privacy/privacy-client.tsx:51`, `src/app/terms/terms-client.tsx:53`, `src/app/cookies/cookies-client.tsx:43` | — | **`heading-display`** utility class | **None** | inline `isEn` ternary (plain text) |
| 404 | `src/app/not-found.tsx` | same | 37 | `font-display text-[clamp(2rem,6.5vw,4.25rem)]` | none | inline `isEn` |
| error | `src/app/error.tsx` | same | 39 | **`heading-1`** utility class | none | hardcoded EN |

Hero idiom shared by /consulting, /audit, /about, /contact, /case-studies, /resources, /trust: centered (left for /trust, /start, services, details), `text-balance mb-8 pb-1`, accent-italic tail span. The `pb-1` exists to keep descenders out of any future clip — convenient for mask reveals.

**Conflict note for wiring:** on /about, /contact, /case-studies, /resources the H1 sits inside a `<Reveal>` that fades the whole hero block (opacity 0→1, y 24). Adding `data-split-reveal` to those H1s would double-animate (block fade + line mask) unless the Reveal is removed/restructured. /consulting, /audit, /trust, /start, services and the two detail templates have NO wrapper — clean targets.

---

## 3. Eyebrow inventory

**Canonical styling:** `.eyebrow` class in `src/app/globals.css:392–399` — JetBrains Mono (`--font-jbm`), 11px, `letter-spacing: 0.12em`, uppercase, `hsl(var(--ink-mute))`. There is **no shared `<Eyebrow>` component** — it's repeated markup. Three recurring idioms:
1. **Dot eyebrow** (page heroes): `<p className="eyebrow … inline-flex items-center gap-2"><span w-1.5 h-1.5 rounded-full accent/></p>` — composite (has element child).
2. **Status-dot eyebrow**: same but `<span className="status-dot"/>` (home spine stages, /start, service-detail).
3. **SectionHeading eyebrow**: `[data-eyebrow-line]` rule + `[data-eyebrow-text]` span, animated internally (see §4).

**Existing scramble effect:** `src/components/fx/label-scrambler.tsx` (`LabelScrambler`, mounted at `src/app/layout.tsx:199`) **already implements the eyebrow decode-scramble**: one delegated IntersectionObserver + MutationObserver over every `.eyebrow`; ~480ms left-to-right glyph decode (GLYPHS A–Z0–9, 40ms tick); aria-label preservation; reduced-motion off; once per element. **Limitation:** it only scrambles "leaf" eyebrows (`childElementCount === 0`, line 71–73) — so EVERY dot-eyebrow hero label and every SectionHeading eyebrow is currently **skipped** (marked `scrambleDone` immediately, lines 153–156). Only plain-text eyebrows scramble today. The task's "scramble eyebrows" work likely means extending this to composite eyebrows (scrambling the text node next to the dot span) or restructuring eyebrow markup into a shared component.

### All `.eyebrow` occurrences (by file:line)

**Direct `className="eyebrow"` markup:**
- `src/components/ui/section-heading.tsx:177–184` — composite (rule line + `data-eyebrow-text`); animated by SectionHeading itself.
- `src/components/sections/cinematic-system-scroll.tsx:455` (stage panels, status-dot, non-hero stages only) and `:603` (mobile fallback stages). Eyebrow strings from `STAGE_CONTENT[].eyebrow` (en/it), lines 74–179: "AI engineering studio · production systems", "01 / Signals" … "05 / Handover".
- `src/components/sections/consulting-cta.tsx:40` (orphaned component, see below).
- `src/components/sections/final-cta.tsx:63` — composite.
- `src/components/sections/our-why.tsx:50` — leaf ("Our Why" / "Il nostro perché") → scrambles today.
- `src/components/sections/how-we-work.tsx:75` — leaf, accent-colored (orphaned component).
- `src/components/sections/who-and-why.tsx:46, 93` (orphaned component).
- `src/components/sections/compliance-pipeline.tsx:298` — leaf (used on /trust).
- `src/components/cal-embed.tsx:43` — leaf, `t("cal.fallback.eyebrow")` — the ONLY dictionary-driven eyebrow (`src/data/translations/en.ts` / `it.ts`).
- `src/components/multi-step-intake.tsx:437` (renders `t.eyebrow` = "Scoping intake", defined lines 80/127).
- Page heroes (composite dot-eyebrows): `src/app/audit/audit-client.tsx:162`; `src/app/consulting/consulting-client.tsx:195`; `src/app/about/about-client.tsx:60` (+leaf `:171` "The job", accent leaf `:233` "Verifiable, not vibes"); `src/app/contact/contact-client.tsx:83` (+accent leaves `:127`, `:255`); `src/app/case-studies/case-studies-client.tsx:23`; `src/app/trust/trust-client.tsx:142`; `src/app/resources/resources-client.tsx:41`; `src/app/start/page.tsx:29` (status-dot); `src/app/not-found.tsx:27, 86`; `src/app/error.tsx:27`.
- Detail templates: `src/app/case-studies/[slug]/case-study-detail-client.tsx:60` (composite), `:112` ("What shipped", accent leaf), `:136` ("Tech stack", leaf), `:153` (leaf); `src/app/resources/[slug]/resource-detail-client.tsx:122` ("Tags"), `:138` (accent leaf).
- Legal pages: `src/app/privacy/privacy-client.tsx:63, 349`; `src/app/terms/terms-client.tsx:65, 249`; `src/app/cookies/cookies-client.tsx:55, 199` — leaves ("Contents"/"Indice" etc.).
- `src/components/sections/service-detail.tsx:76` (status-dot composite "SerSan · {name}") and `:469`.

**Via `SectionHeading eyebrow=` prop** (composite, SectionHeading-owned animation):
- Home: `problem-section.tsx:281`, `services-section.tsx:287`, `production-grade-section.tsx:483`, `founders-section.tsx:138`, `fit-section.tsx:67`, `case-studies-rail.tsx:313`.
- /consulting: `consulting-client.tsx:250, 308, 371, 419`; `process-section.tsx:283` (mounted on /consulting).
- /audit: `audit-client.tsx:217, 270, 333, 381, 506`.
- /about: `about-client.tsx:191, 286`.
- /case-studies: `work-in-progress.tsx:110`.
- Services: `service-detail.tsx:119` (data-driven `service.problem.eyebrow/eyebrowIt` from `src/data/services.ts`), `:137, 196, 247, 315, 403`.

**Eyebrow-adjacent mono micro-labels NOT using `.eyebrow`** (relevant if presets are added): `font-mono text-[10px]/[11px] tracking-[0.14–0.2em] uppercase` repeated in `start/page.tsx:70, 98, 141`, `case-study-detail-client.tsx:85–94`, `fit-section.tsx:108, 133` (h3s), `about-client.tsx:216, 245, 263, 268`, `service-detail.tsx:68, 102`, `cinematic-system-scroll.tsx:209, 219` etc.

**Orphaned section components (defined, never imported by any page — dead code):** `who-and-why.tsx`, `how-we-work.tsx`, `consulting-cta.tsx`. Don't count them in wiring scope.

---

## 4. Existing reveal primitives

1. **`src/components/reveal-on-scroll.tsx` — `RevealOnScroll` (framer-motion).** Props: `children, delay=0, y=24, duration=0.6, as="div"|"section"|"article", className`. `whileInView` once at 30% visibility, ease `[0.16,1,0.3,1]` (expo.out equivalent), reduced-motion → static. Used by: `our-why.tsx:48`, `how-we-work.tsx:73` (orphan), `problem-section.tsx` and `production-grade-section.tsx` (per grep counts), and others importing it.
2. **`src/components/ui/reveal.tsx` — `Reveal` (GSAP + IntersectionObserver).** Props: `children, delay (ms), variant: "fade"|"construct"|"rise", from: "up"|"left"|"right"|"bottom", className, as: div|section|article|li|span`. Sets initial opacity/x/y (rise=40px, else 24px; horizontal 36px; construct = clip-path inset wipe), plays once on IO intersect (`rootMargin -18%`), `duration 0.85, ease expo.out`. Used heavily: hero blocks on /about :59, /contact :82, /case-studies :22, /resources :40; card grids (`case-studies-client.tsx:75`, `resources-client.tsx:80`, `about-client.tsx:213`, `fit-section.tsx:114/139` with `from="left"/"right"`), trust sections (21 uses), audit (18), consulting (11).
3. **`src/components/ui/section-heading.tsx` — `SectionHeading`** (§3/§2). Props: `eyebrow?, title (ReactNode → <h2 className="heading-2">), description?, align: "left"|"center", className, titleClassName, cta?`. Self-animating GSAP timeline triggered by IO (`rootMargin -15%`), after `fonts.ready`: eyebrow rule `scaleX 0→1` → eyebrow text fade → **its own SplitText line-mask** on the title (`type:"lines", mask:"lines"`, yPercent 115 / 0.85 / stagger 0.09 — same tokens as HeadingChoreographer) → description → cta. Split reverted on complete. Re-runs per `language`; `<h2 key={language}>`. **This is the de-facto H2 reveal already live on every SectionHeading.** Adding `data-split-reveal` to SectionHeading titles would double-split — the wiring must target only headings NOT inside SectionHeading, or refactor SectionHeading to delegate.
4. **`HeadingChoreographer`** (§1) — the global `data-split-reveal` engine, currently target-less.
5. **`LabelScrambler`** (§3) — the global `.eyebrow` decode engine, currently leaf-only.
6. **`src/components/ui/count-up.tsx` — `CountUp`** (the existing "StatCounter"). Props: `value: string, duration=1.2, className`. Parses metric strings ("+34%", "~€18M/yr", "0.94 AUC"), guards against non-metrics (years, labels), ScrollTrigger `top 90%` once → snap to 0 → tween to target writing `textContent` directly (no re-renders), sr-only final value for AT, reduced-motion static. **Currently UNUSED — zero imports anywhere.** Candidate stat surfaces: /about "Verifiable, not vibes" strip (`about-client.tsx:236–267`: 8 yrs / 5 / 1 PhD, plain `font-display text-4xl/5xl` divs), case-study detail metrics (`case-study-detail-client.tsx:115–120`, `font-display clamp` values from `study.metrics`), home rail card metric (`case-studies-rail.tsx:111–118`, mono `metric.value`), spine handover extras counts (`cinematic-system-scroll.tsx:221–261`, tabular-nums 13/5/1).
7. **Route-level**: `src/app/template.tsx` — page-enter fade-up (autoAlpha+y 18, 0.7s expo.out) + curtain wipe on every navigation; first mount skips curtain. Any H1 reveal will play *on top of* this content fade.
8. **Misc CSS**: `fit-section.tsx:169–200` inline `<style>` (fit-icon pop, column-dim hover); `.status-dot`, `.split-line` in globals.css.

---

## 5. Serif display H2s (section titles)

**Via `SectionHeading` (`heading-2` = Fraunces 500, clamp(2rem,3.75vw,3.125rem), globals.css:377):** all the `eyebrow=` rows in §3 — home sections problem/services/production-grade/founders/fit/case-studies-rail; consulting ×4 + process-section; audit ×5; about ×2; work-in-progress; service-detail ×6. Many pass `titleClassName="font-display text-3xl sm:text-[2.5rem] …"` to downsize (e.g. `audit-client.tsx:218`).

**Hand-rolled serif H2s (NOT SectionHeading — no line-mask today):**
- `src/components/sections/cinematic-system-scroll.tsx:472` (stage panels, `font-display clamp(2.25rem,4.5vw,4rem)`, rAF opacity only) and `:613` (mobile fallback).
- `src/components/sections/our-why.tsx:53` — `heading-2` (inside RevealOnScroll). Plus the serif body paragraphs at `:76` (`font-display clamp(1.35rem,2.6vw,2.15rem)`).
- `src/components/sections/final-cta.tsx:73` — `font-display clamp(2.25rem,4.5vw,3.75rem) font-semibold` (composite eyebrow above at :63).
- `src/components/sections/consulting-cta.tsx:43` (orphan) / `how-we-work.tsx:80` `heading-2` (orphan).
- `src/components/sections/compliance-pipeline.tsx:301` (id="compliance-pipeline-heading").
- `src/app/contact/contact-client.tsx:130` and `:258` — `font-display text-2xl/[2rem]`.
- `src/app/trust/trust-client.tsx:194, 216, 266, 285, 304, 335` — `font-display text-2xl sm:text-[1.75rem]` (six section titles, all inside `Reveal`s).
- `src/app/start/page.tsx:86` (`font-display text-2xl sm:text-3xl`; also mono-caps h2s at :98, :141).
- `src/app/case-studies/case-studies-client.tsx:68` — `sr-only` (skip).
- Legal pages use sans `heading-3` h2s (privacy/terms/cookies) — out of scope for serif pass.
- `fixed-scope-strip.tsx`, `credibility-strip.tsx` — check at wiring time; credibility-strip has no `.eyebrow` (only mono caps labels).

---

## 6. Wiring-task implications (summary)

1. `HeadingChoreographer` is live but orphaned: the typography task = stamping `data-split-reveal` onto the §2 H1s + §5 hand-rolled H2s, NOT onto SectionHeading titles (they already self-split with identical tokens).
2. Four hero H1s are inside whole-block `<Reveal>` wrappers (/about /contact /case-studies /resources) — must unwrap or exclude the H1 from the block fade to avoid double animation.
3. The home H1 is owned by the WebGL particle morph (suppressed while `useTextMorphStore.active`) — do not split it while the morph is active; stage-panel H2s animate via rAF opacity, splitting them needs care with the per-frame `style.opacity` writes.
4. Eyebrow scramble already exists (`LabelScrambler`) but skips ALL composite (dot-prefixed) eyebrows — the dominant hero idiom. Extending scramble = either teach LabelScrambler to scramble the text node beside decorative spans, or introduce a shared `<Eyebrow>` component and migrate ~40 call sites (§3 list).
5. `CountUp` (`src/components/ui/count-up.tsx`) is the ready-made StatCounter, fully unused; obvious first targets: about verifiable strip, case-study detail metrics, rail card metrics.
6. "Redacted reveal on fit": `fit-section.tsx` currently reveals rows with `Reveal from="left"/"right"`; no redaction primitive exists yet anywhere in src.
7. All heading copy is inline `isEn ?` ternaries (only `cal.fallback.eyebrow` + multi-step-intake use dictionaries) — any text-measuring animation must re-run on `language` change (both existing engines already do).
