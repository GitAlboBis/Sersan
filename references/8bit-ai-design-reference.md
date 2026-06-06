# 8bit.ai Design Reference
> Extracted for SerSan v2 inspiration. Source: https://www.8bit.ai

---

## 1. Core Design Philosophy

| Principle | 8bit.ai approach |
|---|---|
| Mood | Dark & minimal — 95%+ pitch-black backgrounds |
| Accent | Steel/teal blue (`#8BB4C0`, `#5B949F`) — not neon, not purple |
| Type | Helvetica (premium) + Roboto Condensed (efficiency) |
| Motion | Purposeful, native CSS — no heavy libs, no page-load chaos |
| Spacing | Responsive margin scale, breathing room on desktop |
| Imagery | No stock photos. No AI robot clichés. SVG + clip-masked geometry |

**Translate to SerSan v2:** Same dark foundation, swap steel-teal for electric cyan (`#00E5FF`). Keep the Helvetica-grade seriousness. Use Framer Motion instead of pure CSS — but with the same restraint.

---

## 2. Color Palette

### Backgrounds
```
#000000   — primary bg (hero, sections)
#111111   — slight lift
#1A1A1A   — card surfaces
#1D1D1D   — raised panels
#282828   — borders / dividers
#292929   — input backgrounds
#303030   — button secondary bg
```

### Accent — Steel Teal (8bit source)
```
#8BB4C0   — primary accent (hover, links, highlights)
#8FAAB2   — hover state text
#5B949F   — CTA buttons, active states
#32555C   — accent dark (gradient end)
#455D64   — muted accent
#CFE0E5   — light accent / tinted white text
```

### Accent — adapt for SerSan v2 (Cyan)
```
#00E5FF   — electric cyan (SerSan primary)
#00B8CC   — cyan pressed / CTA bg
#007A8A   — cyan dark
rgba(0,229,255,0.08)  — glow wash on dark
rgba(0,229,255,0.15)  — card border glow
rgba(0,255,255,0.10)  — 8bit uses this for backdrop hints
rgba(0,255,255,0.30)  — 8bit stronger cyan wash
```

### Text
```
#FFFFFF   — primary text on dark
#B2B2B2   — secondary / captions
#8FAAB2   — accent text (links, labels)
#4D4D4D   — disabled / muted
```

### Functional
```
#EF4444         — error red
rgba(239,68,68,0.5)  — error muted
```

### Gradients
```css
/* Dark depth */
background: linear-gradient(to bottom, #1D1D1D, #000000);
background: linear-gradient(to bottom, #282828, #303030);

/* Teal glow (8bit) → cyan for SerSan */
background: linear-gradient(135deg, #5B949F, #32555C);
background: linear-gradient(to right, #455D64, rgba(69,93,100,0));

/* Horizontal mask fade (used on carousels/edges) */
background: linear-gradient(to right, transparent 10%, rgba(0,0,0,0.75) 25%, #000 50%);
background: linear-gradient(to left,  transparent 10%, rgba(0,0,0,0.75) 25%, #000 50%);

/* Text gradient (headline treatment) */
background: linear-gradient(135deg, #545454, #303030);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

---

## 3. Typography

### Font Stack
```css
/* Primary — headlines, body */
font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
/* SerSan v2 equivalent: Inter (tight, premium feel) */

/* Secondary — labels, captions, condensed UI text */
font-family: 'Roboto Condensed', 'Arial Narrow', sans-serif;
```

### Type Scale (rem-based, root = clamp(10px, 0.694vw, 11.5px))
```css
/* 8bit uses a fluid root — everything scales with viewport */
:root { font-size: clamp(10px, 0.6944vw, 11.5px); }

/* Scale */
--text-display-xl:  7.629rem;  /* ~88px at 11.5px root */
--text-display-lg:  6.104rem;  /* ~70px */
--text-display-md:  4.883rem;  /* ~56px */
--text-display-sm:  3.906rem;  /* ~45px */
--text-heading-lg:  3.125rem;  /* ~36px */
--text-heading-md:  2.500rem;  /* ~29px */
--text-heading-sm:  2.000rem;  /* ~23px */
--text-body:        1.280rem;  /* ~15px */
--text-body-sm:     1.024rem;  /* ~12px */
--text-caption:     0.819rem;  /* ~9.5px */
```

### Letter Spacing (tight on headlines — critical to the premium feel)
```css
--tracking-display-xl: 0;              /* Pure mass */
--tracking-display-lg: 0;
--tracking-display-md: -0.1465rem;     /* Tight */
--tracking-display-sm: -0.1172rem;
--tracking-heading-lg: -0.0937rem;
--tracking-heading-md: -0.0750rem;
--tracking-heading-sm:  0.0200rem;     /* Slight open on smaller heads */
--tracking-body:        0.0512rem;
--tracking-caption:     0.0983rem;     /* Open for legibility */
```

### Line Heights
```css
display-xl:  1.00  (100%)
display-lg:  1.20  (120%)
heading-sm:  1.40  (140%)
body:        1.40  (140%)
body-sm:     1.70  (170%)
caption:     1.60  (160%)
```

### Font Weights
```
300 — light (headings at scale)
400 — regular (body)
500 — medium (UI labels, captions, buttons)
700 — bold (rare — reserved for max impact)
```

---

## 4. Spacing System

### Root tokens (responsive)
```css
:root {
  --gutter: 1rem;    /* mobile */
  --margin: 2rem;    /* mobile side margin */
}
@media (min-width: 768px) {
  --gutter: 3rem;
  --margin: 4rem;
}
@media (min-width: 1024px) {
  --margin: 6rem;
}
@media (min-width: 1280px) {
  --margin: 10rem;   /* desktop breathing room */
}
```

### Component spacing scale
```
0.8rem   (xxs)  ~12px
1.2rem           ~18px
1.6rem   (xs)   ~25px
2.4rem   (sm)   ~38px
3.2rem   (md)   ~51px
4.0rem           ~64px
5.6rem   (lg)   ~90px
8.0rem   (xl)   ~128px
11.2rem          ~179px
19.5rem          ~312px (section separators)
```

### Header
```css
--header-height: 6.1rem;
```

---

## 5. Layout

### Carousel / Slider
```css
--slide-height:   19rem;
--slide-spacing:  var(--gutter);
--slide-size: calc((100% - var(--margin)) / 1.5);     /* mobile */
--slide-size: calc((100% - var(--margin)) / 3);        /* tablet */
--slide-size: calc(100% / 4);                          /* 1024px+ */
```

### Z-index layers (semantic)
```
z-footer    (bottom chrome)
z-20        (general content)
z-10        (overlay gradients)
z-header    (nav)
z-hamb      (hamburger button)
z-logo      (logo above nav)
z-scrollbar (custom scrollbar)
z-loader    (loading overlay — top)
```

### Clip masking
```css
clip-path: url(#landing-mask);  /* SVG clip for hero section shape */
```

---

## 6. Animations & Motion

### Easing curves (exact)
```css
/* Ease out cubic — most transitions */
--ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);

/* Ease in-out cubic — hover states, reveals */
--ease-in-out-cubic: cubic-bezier(0.645, 0.045, 0.355, 1);
```

### Durations
```css
--dur-instant:  0ms
--dur-fast:     200ms   /* hover states */
--dur-normal:   300ms   /* UI transitions */
--dur-slow:     500ms   /* reveals */
--dur-cinematic: 1000ms /* hero entrances */
```

### Keyframes
```css
/* Continuous rotation (loading indicators, decorative) */
@keyframes rotate {
  to { transform: rotate(1turn); }
}
.animate-rotate { animation: rotate 1s linear infinite; }

/* SVG stroke spin */
@keyframes spin {
  0%  { stroke-dasharray: 1, 200;  stroke-dashoffset: 0; }
  50% { stroke-dasharray: 89, 200; stroke-dashoffset: -35; }
  to  { stroke-dasharray: 89, 200; stroke-dashoffset: -124; }
}
.animate-spin { animation: spin 2s linear infinite; }

/* Generic enter (Tailwind Motion plugin) */
@keyframes enter {
  0% {
    opacity: var(--tw-enter-opacity, 1);
    transform:
      translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0)
      scale3d(var(--tw-enter-scale, 1), var(--tw-enter-scale, 1), var(--tw-enter-scale, 1))
      rotate(var(--tw-enter-rotate, 0));
  }
}

/* Generic exit */
@keyframes exit {
  to {
    opacity: var(--tw-exit-opacity, 1);
    transform:
      translate3d(var(--tw-exit-translate-x, 0), var(--tw-exit-translate-y, 0), 0)
      scale3d(var(--tw-exit-scale, 1), var(--tw-exit-scale, 1), var(--tw-exit-scale, 1))
      rotate(var(--tw-exit-rotate, 0));
  }
}
```

### Transition utilities
```css
.transition-smooth {
  transition-property: opacity, transform, color, background-color;
  transition-duration: 300ms;
  transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
}

.transition-hover {
  transition-property: color, opacity;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.645, 0.045, 0.355, 1);
}
```

### Backdrop effects
```css
.glass-panel {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  background: rgba(255, 255, 255, 0.05);
}
```

### Animation pattern — data attributes
8bit drives all scroll/entrance animations via `data-motion-*` attributes on DOM elements (targeted by a JS orchestrator, not component-level):
```
data-motion-logo          — logo entrance
data-motion-hamb          — hamburger reveal
data-motion-hamb-line-top — top bar of burger
data-motion-hamb-line-bot — bottom bar of burger
data-motion-panel         — full-screen panels
data-motion-line          — horizontal rule reveals
data-motion-copy          — text block reveals
data-motion-legal         — footer legal text
data-motion-social        — social icon stagger
data-motion-scroll        — "scroll down" cue
data-motion-swipe         — swipe indicator
data-motion-audio         — audio toggle
```

**SerSan v2 equivalent**: Use `data-animate` + Framer Motion `whileInView` / `useScroll`. Same philosophy — centralize animation targets, don't scatter them in individual components.

---

## 7. Section Structure (Homepage)

```
1. Header        — fixed, z-header. Logo left, nav right, hamburger on mobile.
2. Hero           — full-viewport, clip-mask SVG, scroll cue, cinematic entrance.
3. [content]      — vertical scroll narrative.
4. Footer         — copyright, social (LinkedIn/X/Instagram/YouTube), policy links.
```

**Motion philosophy per section:**
- Header: slides in from top on load (1s, ease-out-cubic)
- Hero: text enters via translate Y + opacity (each word/line staggers ~80ms)
- Content panels: fade + slight Y translate on scroll enter
- Footer: stagger social icons left→right

---

## 8. Interactive States

### Links / Nav items
```css
color: #fff;
/* hover */
color: #8faab2;        /* steel teal — swap for #00E5FF in SerSan */
transition: color 200ms cubic-bezier(0.645, 0.045, 0.355, 1);
```

### Buttons
```css
/* Primary */
background: #fff;
color: #1a1a1a;
padding: 1.2rem 2.4rem;
font-weight: 500;
letter-spacing: 0.05rem;
transition: opacity 200ms ease-out-cubic;

/* Primary hover */
opacity: 0.85;

/* Secondary/ghost */
background: transparent;
border: 1px solid rgba(255,255,255,0.2);
color: #fff;

/* Secondary hover */
border-color: rgba(255,255,255,0.5);
```

---

## 9. Technology Stack (8bit.ai)

| Layer | Choice |
|---|---|
| Framework | Next.js 13+ (App Router) |
| Styling | Tailwind CSS v3 (utility-first) |
| Fonts | Self-hosted WOFF/WOFF2 (no Google Fonts) |
| Animations | Native CSS + custom JS `data-motion-*` orchestrator |
| 3D/WebGL | Not detected (uses SVG clip-path for geometry) |
| Scroll | Native (no Lenis detected) |

**SerSan v2 stack advantage**: Next.js 16 + React 19 + Framer Motion + GSAP + Lenis + R3F. More capable than 8bit — use it. 8bit's restraint is a budget decision; SerSan should push further with the same taste level.

---

## 10. What to Take vs. What to Exceed

### Take directly
- Color temperature: near-black + white + one teal/cyan accent only
- Negative letter-spacing on display text
- Fluid `font-size: clamp()` root for the whole scale
- `--margin` responsive variable pattern
- `data-animate` orchestration pattern (our version)
- Cubic easing constants (0.215, 0.61, 0.355, 1)
- Backdrop `blur(4px)` glass on panels
- Horizontal gradient fade on carousel edges

### Exceed
- 8bit has no 3D → SerSan hero gets R3F topology mesh
- 8bit uses CSS-only motion → SerSan uses Framer Motion scroll-linked parallax
- 8bit has static sections → SerSan gets Lenis smooth scroll
- 8bit's teal is muted → SerSan's cyan is electric (`#00E5FF`)
- 8bit hides its tech → SerSan's bento showcases it (process diagrams, UI panels)

---

## 11. SerSan v2 Design Tokens (synthesized)

```css
:root {
  /* Color */
  --color-bg:          #000000;
  --color-surface:     #111111;
  --color-surface-2:   #1A1A1A;
  --color-border:      rgba(255,255,255,0.08);
  --color-border-hover: rgba(255,255,255,0.16);
  --color-text:        #FFFFFF;
  --color-text-muted:  #B2B2B2;
  --color-accent:      #00E5FF;   /* electric cyan */
  --color-accent-dark: #007A8A;
  --color-accent-glow: rgba(0,229,255,0.12);

  /* Typography */
  font-size: clamp(10px, 0.6944vw, 11.5px);
  --font-primary:   'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --font-mono:      'JetBrains Mono', 'Fira Code', monospace;

  /* Scale */
  --text-hero:     7.629rem;
  --text-display:  4.883rem;
  --text-heading:  3.125rem;
  --text-subhead:  2.000rem;
  --text-body:     1.280rem;
  --text-small:    1.024rem;
  --text-caption:  0.819rem;

  /* Spacing */
  --gutter:  1rem;
  --margin:  2rem;
  --header-height: 6.1rem;

  /* Easing */
  --ease-out:    cubic-bezier(0.215, 0.610, 0.355, 1.000);
  --ease-in-out: cubic-bezier(0.645, 0.045, 0.355, 1.000);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* SerSan addition */

  /* Duration */
  --dur-fast:    200ms;
  --dur-normal:  300ms;
  --dur-slow:    500ms;
  --dur-hero:    1000ms;
}

@media (min-width: 768px) {
  :root { --gutter: 3rem; --margin: 4rem; }
}
@media (min-width: 1024px) {
  :root { --margin: 6rem; }
}
@media (min-width: 1280px) {
  :root { --margin: 10rem; }
}
```
