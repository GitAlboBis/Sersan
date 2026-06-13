# StatCounter + Redacted Reveal — exact targets (post step-2 inventory)

Researched 2026-06-12 on branch `feat/webgl-refactor` (HEAD e22434e). All paths absolute under
`C:\Users\alber\Desktop\sersan-v2-main`.

---

## 1. FitSection (Redacted Reveal target)

**File:** `src/components/sections/fit-section.tsx` (default export `FitSection`)
**Mounted:** `src/app/page.tsx` L77-79, inside `<div data-line-anchor="fit">` — between
`FixedScopeStrip` (anchor `process`) and the `gateway` gap / `FinalCTA`.

### Structure (NOT 4+4 — it is 6+6)

Two equal columns inside `.fit-grid` (L97, `grid-cols-1 lg:grid-cols-2`, gap-px over
`hsl(var(--rule))` so the px-gap reads as a rule line):

- **Good fit** column `.fit-col--good` (L99-121): header row = glowing `Check` icon
  (`.fit-icon`, CSS keyframe `fit-icon-in` L171-180) + mono h3 "Good fit" / "Buon fit";
  then `<ul>` of 6 rows.
- **Not a fit** column `.fit-col--warn` (L124-146): amber `X` icon variant + h3
  "Not a fit" / "Non è un fit"; then `<ul>` of 6 rows.

### Row markup (the redaction target)

Each row, L113-119 (good) / L138-144 (warn):

```tsx
<Reveal key={i} delay={i * 50} from="left" as="li">   // warn column: from="right"
  <p className="fit-good rounded-md px-3 py-2 text-[14px] sm:text-[15px] text-ink leading-relaxed">
    {line}
  </p>
</Reveal>
```

`Reveal` (`src/components/ui/reveal.tsx`) = IntersectionObserver one-shot GSAP tween:
opacity 0→1, x ∓36px, 0.85s expo.out, delay i*50ms; reduced-motion snaps to final
(L45-49). The `li` is the animated element (Reveal renders the Tag itself, L111-116).

### Copy source / "translation keys"

There are NO translation key files. i18n everywhere is `useLanguage()` from
`src/components/language-provider` + inline `isEn ?` ternaries. FitSection's lines are
module-level constants in the same file:

- `GOOD_FIT_EN` L18-25, `GOOD_FIT_IT` L27-34 (6 strings each)
- `NOT_A_FIT_EN` L36-43, `NOT_A_FIT_IT` L45-52 (6 strings each)

Verbatim EN lines:

```
GOOD_FIT_EN:
  "You have a real workflow with cost or revenue tied to it."
  "You have an internal owner who'll run the system after handover."
  "You're moving prototype → production, or hardening live AI."
  "You're regulated (or about to be) and want to be ready."
  "You're technical, or have technical authority on the team."
  "You can budget for senior engineering, not just license costs."
NOT_A_FIT_EN:
  "You want a chatbot gimmick for a press release."
  "No internal owner, no roadmap, no operational plan."
  "You're at the slide-deck stage with no engineering budget."
  "You want to skip compliance to ship faster."
  "You need a partner to convince your CTO this is a good idea."
  "“Can you do it for equity?”"
```

(The AGENTS.md "Six things we refuse" home section does not exist in the current site —
copy stays as-is per memory. FitSection is the only fit/refusal surface; the only other
"refuse" hits are a comment in `production-grade-section.tsx` L311 and FAQ copy in
`src/data/services.ts` L586.)

### Existing motion on FitSection (would interact with a redacted reveal)

- Row entrance: `Reveal` from left/right, 50ms stagger (above).
- Icon pop: CSS `fit-icon-in` keyframe with glow, L171-180; reduced-motion off L191-199.
- Column-dim on hover: `.fit-grid:has(.fit-col--good:hover) .fit-col--warn { opacity: .45 }`
  L184-189 (CSS only, fine-pointer gate).
- Section heading via `SectionHeading` (shared), description mentions "About a third of
  scoping calls end with us recommending you don't engage SerSan" (L85-89).
- Plain closer paragraph L152-166 (the /start button was removed in step-2 CTA dedupe).

---

## 2. Metric numbers inventory (StatCounter targets)

### 2a-i. Data source — `src/data/case-studies.ts`

Single source for ALL case-study metrics. Shapes (L1-25):

```ts
export interface CaseStudyMetric {
  value: string;      // the big number — ALWAYS a free-form string, often mixed
  label: string;
  labelIt: string;
}
export interface CaseStudy {
  id: string; client: string;
  engagement: string; engagementIt: string;
  role: string; roleIt: string;
  domain: string; domainIt: string;
  industry: "FinTech" | "Healthcare" | "Aerospace" | "Public Sector" | "Industrial" | "Energy" | "Agritech";
  summary: string; summaryIt: string;
  techStack: string[];
  metrics: CaseStudyMetric[];
  liveUrl?: string; previewImage?: string;
}
```

13 studies (`caseStudies.length === 13`). Full verbatim `metrics[].value` list with parse
classification (U+2212 "−" is the minus used throughout, NOT ascii hyphen; "→" is the
range arrow):

| study (line) | values | classification |
|---|---|---|
| spherenode (L44-51) | `"8 → 1"`, `"Live"`, `"32"`, `"PWA + iOS + Android"`, `"IT + EN"`, `"RAG"` | arrow-range; word; bare int; words ×3 |
| quantex (L71-75) | `"Live"`, `"V2"`, `"5 phases"` | word; version label; int+word suffix |
| terra-noa (L95-100) | `"13 business lines"`, `"~1.5 MWp"`, `"Live on Databricks"`, `"Sardinia"` | int+words; ~ prefix + decimal + unit; words ×2 |
| revolut (L120-125) | `"−47%"`, `"+31%"`, `"~€18M/year"`, `"p99 220ms → 38ms"` | sign+int+%; sign+int+%; ~€ prefix+M+/year; label-prefixed multi-number |
| jp-morgan (L142-148) | `"−22%"`, `"~$140M/day"`, `"0.89 AUC"`, `"78%"`, `"−18%"` | sign+%; ~$+M+/day; decimal+unit suffix; int+%; sign+% |
| apple-uk (L165-169) | `"19% → 8.4%"`, `"−23%"`, `"−€4.1M/year"` | two-number arrow range; sign+%; sign+€+decimal+M+/year |
| pharma-deloitte (L186-190) | `"+34%"`, `"92%"`, `"~€12M/trial"` | sign+%; int+%; ~€+M+"/trial" |
| regione-sardegna (L207-212) | `"2.1M+ records"`, `"8/8 ASL"`, `"0.82 AUC"`, `"F1 = 0.91"` | decimal+M+ +word; ratio; decimal+unit; label-prefixed ("F1 =") |
| salvatori (L229-234) | `"Dec 2024 → Apr 2025"`, `"3 surfaces"`, `"On-prem"`, `"Edge"` | date range (do NOT count); int+word; words |
| leonardo (L251-256) | `"3 weeks → 27 min"`, `"22% → 3%"`, `"0 critical CVEs"`, `"4 months → 3 weeks"` | unit ranges; %-range; zero+words; unit range |
| who (L273-278) | `"0.94 AUC"`, `"41%"`, `"−28%"`, `"WHO guidance"` | decimal+unit; int+%; sign+%; words |
| rsa-italy (L295-300) | `"−34%"`, `"−41%"`, `"−22%"`, `"~€2.8M/year"` | sign+% ×3; ~€+decimal+M+/year |
| stealth-greentech (L317-322) | `"Exit · Oct 2024"`, `"10-yacht fleet"`, `"End-to-end"`, `"Fleet-wide"` | date label (do NOT count); int-hyphen-word; words |

**Counter parsing implications:** never a pure number field — always a string with
optional prefix (`~`, `+`, `−` U+2212, `€`, `$`, `~€`, `~$`, `−€`) + number (int or 1-2
decimals) + suffix (`%`, `M/year`, `M/day`, `M/trial`, `MWp`, `M+ records`, ` AUC`,
` phases`, ` business lines`, ` surfaces`, ` weeks → 27 min`, …). Several values contain
TWO numbers joined by `→`; several have the digit mid-string (`p99 220ms → 38ms`,
`F1 = 0.91`, `Dec 2024`, `Exit · Oct 2024`, `V2`) which must stay static or only animate
the leading number when it truly leads.

### Existing (ORPHANED) counter — `src/components/ui/count-up.tsx`

A complete GSAP/ScrollTrigger `CountUp` component already exists and already encodes the
correct parse policy for this exact dataset, but has ZERO usages at HEAD (its only
consumer, the retired home `case-studies-section.tsx`, was deleted when the rail
replaced the grid in step 2; confirmed via `git grep` at e970ea3 vs HEAD):

- `NUMBER_RE = /([-−+]?\d+(?:\.\d+)?)/` (L23)
- `METRIC_TOKEN_RE = /(%|×|x\b|M\b|k\b|MWp|AUC|ms\b|\bp\d{2}|\/day|\/year|\$|€|£|~|→|hour|months|weeks|F1)/i` (L27-28)
- `ANIMATABLE_PREFIX_RE = /^[~$€£+\-−\s]*$/` (L38) — number must lead (blocks "Dec 2024…", "F1 = 0.91", "p99 …")
- Animates first number only, abs-value 0→target, 1.2s expo.out, ScrollTrigger `top 90%`
  once, writes `textContent` directly (no React state), sr-only static final value,
  reduced-motion renders final value (L102-153).
- Note its skip-set: bare `"32"` (no token) and `"8/8 ASL"`, `"10-yacht fleet"`,
  `"0 critical CVEs"`, `"5 phases"`, `"13 business lines"`, `"3 surfaces"` (no token
  match) stay static — by design.

Step-3 StatCounter can resurrect/extend this rather than re-derive the parser.

### 2a-ii. Home rail — `src/components/sections/case-studies-rail.tsx`

`StudyCard` (L76-134) renders ONLY `study.metrics[0]` (L89):

```tsx
<span className="font-mono text-[1.9rem] sm:text-[2.2rem] leading-none tracking-tight tabular-nums text-ink ... group-hover:text-[hsl(var(--accent))]">
  {metric?.value}                       // L113-115 — raw string, static
</span>
<span className="font-mono text-[10px] uppercase ...">{isEn ? metric.label : metric.labelIt}</span>  // L116-120
```

First-metric values shown on the 13 rail cards: `8 → 1`, `Live`, `13 business lines`,
`−47%`, `−22%`, `19% → 8.4%`, `+34%`, `2.1M+ records`, `Dec 2024 → Apr 2025`,
`3 weeks → 27 min`, `0.94 AUC`, `−34%`, `Exit · Oct 2024`. Card 14 = `WipCard`
(L136-194) shows `item.status` = `"In development"` / `"In sviluppo"` from
`work-in-progress.tsx` `ITEMS_EN/IT` — no number. Card header counter `01 / 14`
(L101-103) is an ordinal, not a metric.

Animation today: rail scrub (translateX via ScrollTrigger, store sync) + hover color
transition on the metric span. The number itself never animates. NOTE for counter
design: in pinned mode cards enter horizontally inside a `position:sticky` 100vh frame —
a `ScrollTrigger` on the card element ("top 90%") will fire for ALL cards at pin time
since they're vertically in-viewport the whole time; trigger should instead key off
rail progress / card x-visibility (railStore `trackX`/`progress`) or IO with horizontal
root, or fire once on first paint of the section.

### 2a-iii. /case-studies archive grid — `src/app/case-studies/case-studies-client.tsx`

Cards (L69-122) render NO metrics at all: industry eyebrow, client h3, engagement,
summary (line-clamp-4), role + arrow. Entrance via `Reveal` (delay `(i%2)*90`). The only
numbers on the page are inside prose. → Not a StatCounter target unless metrics are added.

### 2b. /about "Verifiable, not vibes" strip — `src/app/about/about-client.tsx` L229-273

Hardcoded JSX, NO data source, NO Reveal, NO animation. Markup per stat
(`grid grid-cols-2 md:grid-cols-3`, L236):

```tsx
<div className="font-display text-4xl md:text-5xl text-ink leading-none mb-2">
  8
  <span className="italic" style={{ color: "hsl(var(--accent))" }}> {isEn ? "yrs" : "anni"}</span>
</div>
<p className="text-[11px] font-mono uppercase ...">{isEn ? "Senior delivery" : "Delivery senior"}</p>
```

- **8** + nested italic suffix `yrs`/`anni` (L238-247)
- **5**, bare, label "Tier-1 institutions" (L249-254)
- **1** + nested italic suffix ` PhD` (L256-265, `col-span-2 md:col-span-1`)
- Footer line L268-270: `Revolut · JP Morgan · Deloitte · Brevan Howard · Accenture` (static text).

Counter note: numbers are bare text nodes SIBLING to a styled suffix span — a counter
must wrap only the number text, or take `value`/`suffix` props separately (cleanest:
restructure to `<CountUp value="8" /><span>yrs</span>`). All three are pure small ints
(8, 5, 1) — small-int count-ups read glitchy; consider a fixed short duration or a
digit-roll instead.

### 2c. Case-study detail — `src/app/case-studies/[slug]/case-study-detail-client.tsx` L109-131

"What shipped" section renders ALL `study.metrics`:

```tsx
{study.metrics.map((metric, i) => (
  <div key={i} className="flex flex-col">
    <span className="font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.1] text-ink mb-3"
          style={{ letterSpacing: "-0.02em" }}>
      {metric.value}                                   // L118-123 — static
    </span>
    <span className="text-sm text-ink-mute leading-[1.5]">{isEn ? metric.label : metric.labelIt}</span>
  </div>
))}
```

Grid `sm:grid-cols-2 lg:grid-cols-3` (L115). No Reveal, no animation of any kind today.
This is the highest-value, lowest-risk StatCounter surface (normal vertical flow,
standard ScrollTrigger works).

---

## 3. /start self-locator + spine handover proof chips

### /start self-locator — `src/components/start-intake-form.tsx`

- `SITUATION_OPTIONS` L70+ (comment L68-69: pains moved verbatim from the retired
  homepage UseCasesSection): six pain statements, e.g.
  `"Your agent works in demo, but fails in production."` — value enum like
  `"demo-fails-production"`.
- Rendered as a `<select>` (L301-307+), first/optional field. **NO numbers render — not a
  counter target.** The page's "What happens next" cards (`src/app/start/page.tsx`
  L48-81) use ordinals `01`-`03` only (should NOT counter).

### Spine handover proof chips — `src/components/sections/cinematic-system-scroll.tsx`

Final stage `id: "handover"` (L176-265, range 0.76→1.0). `extras` defined L206-265
(comment L202-205: counts pulled from real case-studies.ts / founders.ts, "No invented
metrics"). Chip markup (EN L219-234; IT mirror L249-264):

```tsx
<ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-ink/75 list-none">
  <li className="flex items-center gap-1.5">
    <span className="text-ink tabular-nums">13</span><span>named engagements</span>
  </li>
  <li aria-hidden="true" className="text-ink-mute/55">/</li>
  <li><span className="text-ink tabular-nums">5</span><span>tier-1 institutions</span></li>
  <li aria-hidden="true">/</li>
  <li><span className="text-ink tabular-nums">1</span><span>PhD, applied maths</span></li>
</ul>
```

**YES — these render pure integers (13 / 5 / 1) in their own `tabular-nums` spans**, the
easiest counter targets structurally. They are hardcoded literals (13 happens to equal
`caseStudies.length` today). Rendered twice: desktop panel L483 and mobile/native layout
L622 (`{!isHero && stage.extras}`).

**Animation today:** the WHOLE panel fades via rAF-driven `panelOpacity` (fn L303-317;
loop L338-414) — opacity + 16px translateY strictly inside [0.76, 1.0], plus
`inert`/`aria-hidden` toggling below 0.6 opacity (L399-407). The numbers themselves never
count. Counter caveat: this panel is inside the pinned spine (fixed-position stages, not
normal flow) and can light/dim repeatedly as the user scrubs both directions — an
IO/ScrollTrigger "enters viewport" trigger is wrong here; hook the count to the stage's
own lit transition (panelOpacity crossing the 0.6 visible threshold, same place the
inert toggle lives) and respect the same one-shot-vs-replay decision. Same chips: 13 is
the same count as the rail heading's `${caseStudies.length} engagements` interpolation
(`case-studies-rail.tsx` L329-330) — that one is inside a prose sentence (probably skip).

---

## 4. What already animates today (summary)

| Surface | Number animation? | Other motion |
|---|---|---|
| `ui/count-up.tsx` | full counter, **orphaned (0 usages)** | — |
| Home rail StudyCard metric | none | rail scrub; hover color on metric span |
| /case-studies grid | n/a (no metrics shown) | Reveal entrance; CardImageDistort on 3 build cards |
| Detail "What shipped" | none | none at all |
| /about Verifiable strip | none | none (not even Reveal) |
| Spine handover chips | none | whole-panel opacity/translate via rAF panelOpacity |
| /start self-locator | n/a (no numbers) | — |
| FitSection rows | n/a | Reveal L/R stagger, icon glow keyframe, hover column-dim |

## 5. Key design constraints distilled

1. Metric values are MIXED STRINGS, never pure numbers — parse with the existing
   `count-up.tsx` regex trio (handles U+2212, `~€`/`~$` prefixes, `→` ranges, label-led
   strings) rather than a new parser; extend if `/trial`, `MWp`-only, or second-number-
   of-range animation is wanted.
2. Three trigger regimes: normal flow (detail page, about strip → plain ScrollTrigger/IO),
   horizontal pinned rail (key off railStore progress / horizontal visibility), pinned
   spine stage (key off panelOpacity lit threshold, L399-407).
3. About-strip numbers share a parent with styled suffix spans — pass number and suffix
   separately or restructure markup.
4. sr-only final value + `aria-hidden` animated span + reduced-motion bail are already
   solved in `count-up.tsx` L141-152 — keep that contract.
5. i18n is inline `isEn` ternaries everywhere; metric `value` is language-invariant,
   labels are `label`/`labelIt`.
