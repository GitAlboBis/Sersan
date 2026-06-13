# GSAP API research — SplitText / ScrambleText / counter / masked-reveal presets

Researched 2026-06-12 via Context7 (`/websites/gsap_v3`), gsap.com docs/forums, Codrops.
**Installed in repo: `gsap@3.15.0` (resolved, `node_modules/gsap/package.json`), `@gsap/react@2.1.2`.**
All APIs below are accurate for 3.13+ and therefore for 3.15.0.

---

## 1. Licensing 2026 — what's free, which import paths

- Since **GSAP 3.13** (Webflow acquisition, announced Apr 30 2025) GSAP is **100% free including all
  former Club plugins**: SplitText, ScrambleTextPlugin, MorphSVG, DrawSVG, CustomEase, etc.
  All bonus plugins ship in the main **npm `gsap` package** (the `gsap-trial` package is obsolete).
- ESM import paths (what Next/Turbopack resolves):
  ```ts
  import gsap from "gsap";
  import { SplitText } from "gsap/SplitText";
  import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
  import { ScrollTrigger } from "gsap/ScrollTrigger";
  ```
- CJS/UMD fallback (only needed for Jest-style CJS environments, NOT for Next App Router):
  `gsap/dist/SplitText`, `gsap/dist/ScrambleTextPlugin`.
- SplitText was **completely rewritten in 3.13**: ~50% smaller, added `aria`, `autoSplit`,
  `onSplit`, `mask`, `propIndex`, `ignore`, `prepareText`. Docs now use `SplitText.create()`
  everywhere; `new SplitText(target, vars)` still works and is NOT deprecated (repo's
  `heading-choreographer.tsx` uses the constructor — fine, `create()` is just the canonical form).

---

## 2. SplitText — current API (3.13+)

### Creation

```ts
const split = SplitText.create(".headline", {
  type: "lines",        // comma-list: "chars", "words", "lines" (default "chars,words,lines")
  mask: "lines",        // "lines" | "words" | "chars" — ONE type only (v3.13+)
  linesClass: "split-line", // "++" suffix => incremented classes (line1, line2, …)
  autoSplit: true,      // default false — revert+re-split on font load / width change
  aria: "auto",         // "auto" (default) | "hidden" | "none"
  onSplit(self) {       // runs on every (re-)split; RETURN the animation for auto-sync
    return gsap.from(self.lines, { yPercent: 110, duration: 0.8, stagger: 0.08, ease: "expo.out" });
  },
});
```

### Config options that matter for this task

| option | type / default | notes |
|---|---|---|
| `type` | string, `"chars,words,lines"` | split only what you animate (lines-only is cheapest) |
| `mask` | `"lines"\|"words"\|"chars"`, undefined | wraps each unit in an extra element with **`overflow: clip`** — no CSS needed for the reveal. Mask elements get class `<linesClass>-mask` (e.g. `split-line-mask`) and are exposed on **`split.masks`** (array, v3.13+) |
| `autoSplit` | bool, `false` | when `type` includes `lines`: reverts + re-splits when **fonts load** or element **width changes**. GSAP logs a console **warning if you split before fonts are loaded without `autoSplit:true`** |
| `onSplit(self)` | fn | called after every (re-)split incl. autoSplit re-splits. **If you return a GSAP animation, SplitText saves its `totalTime()`, reverts it, and applies the time to the new animation** → seamless mid-animation re-splits + automatic cleanup |
| `onRevert` | fn | called on revert |
| `aria` | `"auto"` (default) | `"auto"`: puts **`aria-label` (populated from textContent) on the split target** and `aria-hidden` on all created line/word/char elements → screen readers read the sentence once, not char-by-char. `"hidden"`: aria-hidden on everything. `"none"`: nothing |
| `linesClass`/`wordsClass`/`charsClass` | string | `"++"` suffix appends an index |
| `deepSlice` | bool, `true` | subdivides nested elements spanning multiple lines (lines-type only) |
| `ignore` | selector/el(s) | descendants left unsplit |
| `reduceWhiteSpace` | bool, `true` | since 3.13 honors extra spaces / inserts `<br>` when `false` |
| `smartWrap` | bool, `false` | chars-only splits: wraps words in `white-space:nowrap` span so chars don't break mid-word |
| `propIndex` | bool, `false` | adds `--line: n` / `--word: n` / `--char: n` CSS vars |
| `prepareText(text, el)` | fn | mutate raw text chunks before splitting |
| `tag` | string, `"div"` | wrapper tag (use `"span"` to stay inline-valid inside `<p>`/`<a>`) |

### Instance API

- `split.lines` / `split.words` / `split.chars` — arrays of created elements
- `split.masks` — array of mask wrapper elements (v3.13+)
- `split.isSplit` — bool; `split.vars` — config
- `split.revert()` — restores original innerHTML + kills (also `SplitText.create` returns are
  auto-reverted by `gsap.context()` ONLY if created synchronously inside the context — see §4 pitfall)
- `split.split(vars)` — re-split manually (e.g. after a language swap)

### Reduced motion

**No built-in `prefers-reduced-motion` handling** — gate manually (repo already does:
`window.matchMedia("(prefers-reduced-motion: reduce)").matches` early-return, text stays static).
With `aria:"auto"` the unanimated DOM is already accessible; for the reduced-motion path simply
don't split at all (cleanest, zero DOM churn).

### Masked-lines reveal — confirmed recipe (the preset for `data-split-reveal`)

```ts
// after document.fonts.ready (or with autoSplit:true + onSplit)
SplitText.create(h1, {
  type: "lines",
  mask: "lines",            // overflow:clip wrapper per line
  linesClass: "split-line",
  aria: "auto",
  onSplit: (self) =>
    gsap.from(self.lines, {
      yPercent: 110,        // 110 not 100: clears descenders below the clip edge
      duration: 0.8,
      ease: "expo.out",     // Osmo uses CustomEase "0.625, 0.05, 0, 1" — expo.out is the close stock ease
      stagger: 0.08,
      scrollTrigger: { trigger: h1, start: "top 88%", once: true },
    }),
});
```

### Pitfalls — clipping descenders / Editorial New italic overshoot

The mask wrapper is `overflow: clip` sized to the line box. Two failure modes:

1. **Vertical**: tight `line-height` (≤ ~1.1) clips descenders (g/j/y) and italic ascender
   overshoot. GSAP staff fix (forum 45196, quoted): *"you could just add some padding and offset
   that with a negative margin"*. Concretely, on the **line** elements (the masks track the line
   box, so give the line breathing room INSIDE the mask):
   ```css
   .split-line {
     padding-block: 0.12em;     /* headroom for ascender/descender overshoot */
     margin-block: -0.12em;     /* cancel the layout impact → zero layout shift */
   }
   ```
   Alternative: keep `line-height: 1.15–1.2` on the heading; the mask inherits enough box.
2. **Horizontal**: italics (Editorial New italic) overhang the right edge of the line box and get
   clipped by `overflow: clip`. Same trick on the inline axis:
   ```css
   .split-line { padding-inline: 0.08em; margin-inline: -0.08em; }
   ```
   (Safari is the worst offender; also Safari has known layout-shift quirks with `mask:"words"` —
   prefer `mask:"lines"`.)
3. **Clip-path inset variant** (per-element alternative when the padding trick fights the layout —
   e.g. centered italic display lines): skip `mask` entirely and animate `clip-path` on the line
   itself, with **negative insets as headroom** so overshoot is never cut:
   ```ts
   gsap.fromTo(self.lines,
     { clipPath: "inset(-10% -5% 110% -5%)", yPercent: 110 },
     { clipPath: "inset(-10% -5% -10% -5%)", yPercent: 0,
       duration: 0.8, ease: "expo.out", stagger: 0.08 });
   ```
   (−10% top/bottom, −5% left/right = the PRD's "negative insets −5%/−10%" — the clip window is
   bigger than the line box, so italic swashes survive.)

### Re-split on font load — two valid strategies

- **A (repo's current approach, Osmo's approach):** wait — `document.fonts.ready.then(initSplits)`.
  Codrops/Osmo demo does exactly `document.fonts.ready.then(initSplitTextDemo)`. Prevents splitting
  against fallback-font metrics (wrong line breaks). Simple, but anything created inside the
  async callback is NOT captured by `gsap.context()`/`useGSAP` → manual teardown required
  (heading-choreographer.tsx already tracks splits/triggers/tweens arrays and kills them in cleanup).
- **B (3.13 idiomatic):** `autoSplit: true` + create the tween **inside `onSplit` and return it**.
  SplitText itself listens for font load + width changes, reverts, re-splits, re-creates the
  returned animation and restores its `totalTime()`. Synchronous creation → `useGSAP` context
  collects it. **Caution from docs:** with `autoSplit:true`, animations MUST be created in
  `onSplit()` (not outside), or re-splits orphan the tween targets.
  - For this task B is the cleaner upgrade path for `HeadingChoreographer`; note the velocity
    sampling currently happens in `onEnter` — keep that by building a paused tween in `onSplit`
    and returning it.

---

## 3. ScrambleTextPlugin — exact API

```ts
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
gsap.registerPlugin(ScrambleTextPlugin);

// minimal — scramble back to the element's own text:
gsap.to(el, { duration: 1, scrambleText: "{original}" });

// full config:
gsap.to(el, {
  duration: 0.9,
  scrambleText: {
    text: "{original}",   // default "{original}" = element's current text (perfect: copy unchanged)
    chars: "upperCase",   // "upperCase"(default) | "lowerCase" | "upperAndLowerCase" | custom string
    speed: 0.4,           // default 1 — how fast scrambled chars refresh
    revealDelay: 0.3,     // default 0 — seconds of pure scramble before unscrambling starts
    tweenLength: true,    // default true — tweens length difference (irrelevant when text==original)
    delimiter: "",        // default "" (per-char); " " reveals word-by-word
    rightToLeft: false,   // default false
    oldClass: null,       // CSS class span-wrapped around not-yet-revealed text
    newClass: null,       // CSS class span-wrapped around revealed text
  },
  scrollTrigger: { trigger: el, start: "top 90%", once: true },
});
```

Defaults table (verified against gsap.com docs page): `text:"{original}"`, `chars:"upperCase"`,
`speed:1`, `revealDelay:0`, `tweenLength:true`, `delimiter:""`, `rightToLeft:false`,
`oldClass/newClass:null`.

### Eyebrow decoder preset (sober, JetBrains Mono)

```ts
gsap.fromTo(el, { opacity: 1 }, {
  duration: 0.8,
  scrambleText: {
    text: "{original}",
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·/",  // sober mono set; '█▓▒░' reserved for /trust (step 7)
    speed: 0.35,
    revealDelay: 0.1,
  },
  ease: "none",
  scrollTrigger: { trigger: el, start: "top 92%", once: true },
});
```

Notes / pitfalls:
- ScrambleText **rewrites the element's innerHTML every tick** → apply only to a **leaf span**
  (no child elements survive). Eyebrows are flat text — fine.
- Mono font + `text:"{original}"` (same length) ⇒ zero layout shift; `tweenLength` is moot.
- **Accessibility: the docs have NO built-in a11y handling** (unlike SplitText's `aria`).
  Screen readers would announce gibberish on every mutation. Required pattern (matches repo
  convention in `count-up.tsx`): render `<span class="sr-only">{finalText}</span>` +
  `<span aria-hidden="true">` as the scramble target; never `aria-label` on a bare `<span>`
  (prohibited ARIA — the repo comment in count-up.tsx already flags this; on an `<h*>`/`<p>`
  `aria-label` is acceptable but sr-only is the established house pattern). Skip the tween
  entirely under `prefers-reduced-motion` (final text is already in the DOM).

---

## 4. Next.js App Router registration (client-only)

Verified pattern (gsap.com/resources/React + repo precedent):

```tsx
"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, ScrambleTextPlugin);
}
```

- `"use client"` is required — the hooks/plugins touch `window`/DOM. The `typeof window` guard
  mirrors the repo's existing files (`heading-choreographer.tsx:24`, `count-up.tsx:19`,
  `smooth-scroll-provider.tsx:20`); client-component modules still execute during SSR, and while
  3.13+ plugins are import-safe server-side, the guard keeps registration deterministic.
- Registering the same plugin from multiple modules is harmless (idempotent).
- `useGSAP(() => {...}, { scope: ref, dependencies: [...] })` wraps `gsap.context()` → all
  animations/ScrollTriggers **created synchronously** in the callback are auto-reverted on unmount
  (and on dependency change with `revertOnUpdate: true`). Event handlers must use `contextSafe()`.
- **SSR/async pitfall (already documented in heading-choreographer.tsx:66-69):** anything created
  inside `document.fonts.ready.then(...)` happens AFTER the context snapshot → NOT auto-collected.
  Either keep the manual arrays+cleanup pattern, or switch to `autoSplit:true` + `onSplit`
  (synchronous create → context-collected, and SplitText handles re-split teardown itself).
- SEO: SplitText runs client-side only; the real copy is in the server-rendered HTML until
  hydration+split, and `revert()` restores it. No FOUC measure needed beyond not hiding the text
  with CSS (do NOT pre-hide H1s with `visibility:hidden`; the from-tween `yPercent:110` inside
  the mask only kicks in once split exists — acceptable one-frame visible state, or gate with
  `fonts.ready` + initial `autoAlpha` set in the same tick as the split).

---

## 5. StatCounter — idiomatic object-tween counter

Confirmed idiomatic form (gsap docs use this exact shape for counters):

```ts
const obj = { val: 0 };
gsap.to(obj, {
  val: 18,                       // target number
  duration: 1.4,
  ease: "power2.out",
  snap: { val: 1 },              // integer steps; { val: 0.01 } for decimals (0.94 AUC, 8.4%)
  scrollTrigger: { trigger: el, start: "top 85%", once: true },  // once:true kills the ST after firing
  onUpdate() {
    el.textContent = prefix + obj.val.toLocaleString("en-GB") + suffix;
  },
  onComplete() {
    el.textContent = finalExactString;   // always end on the exact copy string
  },
});
```

- `snap: "val"` (string form) also snaps that property to whole numbers; the object form
  `snap: { val: increment }` is needed for decimal metrics.
- Write to `textContent` directly, never React state (60fps without re-renders) — the repo's
  `count-up.tsx` already does this and adds: sr-only final value + `aria-hidden` animated span,
  final value as the SSR/no-JS/reduced-motion render, "snap to 0 then tween up" inside
  `onEnter` so the pre-trigger DOM always shows the final value. **`count-up.tsx` is ~90% of
  the requested StatCounter — gaps vs PRD: no `toLocaleString` thousands grouping, no
  `tabular-nums` class.** Add `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`)
  on the animated span to stop digit-width jitter.
- One known repo caveat: SPA-nav mounts already in view never fire `onEnter` on a `once` trigger
  (active-state-change semantics) — heading-choreographer.tsx:103-116 documents the fix:
  `if (st.isActive || st.progress > 0) fire()`.

---

## 6. Osmo masked reveal (codepen pvvKezw) — exact technique

CodePen returns 403 to fetchers; reconstructed from the companion Codrops article
"From SplitText to MorphSVG: 5 Creative Demos Using Free GSAP Plugins" (May 14 2025), which
documents the same demo. Verbatim findings:

```js
gsap.registerPlugin(SplitText, CustomEase);
CustomEase.create("osmo-ease", "0.625, 0.05, 0, 1");

SplitText.create(heading, {
  type: "lines, words, chars",
  mask: "lines",            // the only mask level; lines clip words+chars within
  linesClass: "line",
  wordsClass: "word",
  charsClass: "letter",
});

// per-granularity timing config:
// lines:   { duration: 0.8, stagger: 0.08  }
// words:   { duration: 0.6, stagger: 0.06  }
// letters: { duration: 0.4, stagger: 0.008 }
// core tween: yPercent: 110 -> 0, ease "osmo-ease", stagger from config

document.fonts.ready.then(initSplitTextDemo);   // split ONLY after fonts settle
```

Key takeaways for our preset: `mask:"lines"` even when animating words/chars (one clip container
per line, units rise through it); **yPercent 110** not 100 (descender headroom); custom ease
`cubic-bezier(0.625, 0.05, 0, 1)` ≈ aggressive expo-like out — can be replicated exactly with
`CustomEase` (free since 3.13, already in the gsap package) or approximated with `expo.out`
(repo's current token).

---

## 7. Redacted Reveal preset (Fit refusals) — recipe

No first-party GSAP plugin; built from SplitText `words` + overlay bars (GSAPify-style).
Version-accurate sketch:

```ts
const split = SplitText.create(refusalLine, {
  type: "words",
  wordsClass: "redact-word",
  aria: "auto",                      // final text readable; spans aria-hidden
});

// inject one bar per word (position:relative on .redact-word via CSS)
const bars = split.words.map((w) => {
  const bar = document.createElement("span");
  bar.className = "redact-bar";      // position:absolute; inset:-0.05em -0.08em; background:#F4F6FA;
  bar.setAttribute("aria-hidden", "true");
  w.appendChild(bar);
  return bar;
});

gsap.to(bars, {
  scaleX: 0,
  transformOrigin: "right center",   // bar wipes off to the right = de-classification
  duration: 0.5,
  ease: "power3.inOut",
  stagger: 0.06,
  scrollTrigger: { trigger: refusalLine, start: "top 80%", once: true },
});
```

- Off-white `#F4F6FA` bars on `#0B1422` per PRD. Words stay in the DOM under the bars at all
  times (SEO/a11y safe); reduced-motion path: never split, never inject bars.
- Negative inset on the bar gives the same overshoot headroom as §2 (descenders poke past the
  word box otherwise).
- Cleanup: `split.revert()` removes the split spans; injected bars live inside word spans, so
  revert wipes them too (revert restores original innerHTML).

---

## 8. Repo anchors (current state)

- `src/components/fx/heading-choreographer.tsx` — already implements the masked-lines preset
  (`new SplitText(el, { type:"lines", mask:"lines", linesClass:"split-line" })`, yPercent 115,
  expo.out, velocity-modulated, fonts.ready-gated, manual cleanup, reduced-motion early return,
  re-split on `[language, pathname]`). Mounted in `src/app/layout.tsx:197`. Extend, don't rewrite.
- `src/components/ui/section-heading.tsx` — second SplitText user (re-split per language).
- `src/components/ui/count-up.tsx` — existing counter (object tween → textContent, sr-only final,
  ScrollTrigger once + reduced-motion + SSR-final-value). Missing: `tabular-nums`, `toLocaleString`.
- GSAP registration precedent: `if (typeof window !== "undefined") gsap.registerPlugin(...)` at
  module scope in each client file.

## Sources

- Context7 `/websites/gsap_v3` — SplitText config/properties, ScrambleText syntax, revert()
- https://gsap.com/docs/v3/Plugins/SplitText/ (mask, aria, autoSplit/onSplit, masks array)
- https://gsap.com/docs/v3/Plugins/ScrambleTextPlugin/ (full config + defaults)
- https://gsap.com/resources/React (useGSAP, Next.js "use client", contextSafe)
- https://gsap.com/blog/3-13/ + https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/ (licensing)
- https://gsap.com/community/forums/topic/45196-splittext-mask-cuts-descenders-off/ (padding + negative margin fix, GSAP staff)
- https://tympanus.net/codrops/2025/05/14/from-splittext-to-morphsvg-5-creative-demos-using-free-gsap-plugins/ (Osmo demo reconstruction; CodePen pvvKezw itself 403s to fetchers)
