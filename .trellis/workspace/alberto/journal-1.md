# Journal - alberto (Part 1)

> AI development session journal
> Started: 2026-06-06

---



## Session 1: Restyle step 1 (bonifica): orphan cleanup, ISO copy fix, proof chips, route coverage

**Date**: 2026-06-10
**Task**: Restyle step 1 (bonifica): orphan cleanup, ISO copy fix, proof chips, route coverage
**Branch**: `feat/webgl-refactor`

### Summary

Multi-agent research over 10 preset sources (51 candidates) + codebase audit produced PIANO_RESTYLE.md (elimina/cambia/sposta/aggiungi + preset mapping + 8-step order). Executed step 1: deleted 9 orphan section components (-2229 lines), fixed SOC2->ISO 27001 + London (UK) drift (EN+IT), rewired dead hero proof chips onto the handover spine panel, added routeFx for /case-studies /resources /contact and a shared quiet detail curve so the signature line reaches /services/*, /start and [slug] templates, renamed mislabeled /trust anchors. Typecheck+build green, headless visual QA desktop+mobile. Specs updated (routeFx conventions, headless QA + preloader background-tab throttling, compliance copy single source).

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `3ffc94c` | (see git log) |
| `b168e2c` | (see git log) |
| `005505b` | (see git log) |
| `91b5f38` | (see git log) |
| `feaf615` | (see git log) |
| `47d5838` | (see git log) |
| `8354526` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: Restyle step 2: IA + funnel reorder, case-studies rail + WebGL planes

**Date**: 2026-06-11
**Task**: Restyle step 2: IA + funnel reorder, case-studies rail + WebGL planes
**Branch**: `feat/webgl-refactor`

### Summary

Home reordered for time-to-proof (credibility strip + case studies before pitch, viewport ~5); pains folded into Services cards + /start self-locator; CTA deduped to 3 section moments; FAQ merged into /consulting#faq, /audit, /trust with /faq 308-redirect; sitemap/footer updated. New case-studies horizontal rail: 14 cards on a CSS-sticky scrub (no pin-spacer, anchors stable with two pinned sections), native snap scroller fallback. WebGL RailPlanes: camera-locked DOM-synced planes (lookAt-ahead tilt makes world-anchoring impossible; 0.0px tracking), TSL seeded navy backdrop + velocity bend + cyan-violet HDR scan-sweep hover under selective bloom, full-tier+WebGPU gated. Checks: tsc+build green, headless QA desktop/mobile, zero console errors. Specs updated (pinned-section sticky pattern, camera-locked plane conventions). Also: git core.longpaths enabled after archive hit Windows 260-char limit.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `64e485e` | (see git log) |
| `2df7efa` | (see git log) |
| `5ec112d` | (see git log) |
| `92a7c41` | (see git log) |
| `4a4b084` | (see git log) |
| `a754e70` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: Restyle step 3: typography presets (split reveals, scramble, counters, redacted fit)

**Date**: 2026-06-13
**Task**: Restyle step 3: typography presets (split reveals, scramble, counters, redacted fit)
**Branch**: `feat/webgl-refactor`

### Summary

Executed PIANO_RESTYLE step 3 (DOM-only typography pass) via research fan-out (4 agents) + 3 implement dispatches + check. Wired the orphaned HeadingChoreographer: data-split-reveal + key={language} on 11 H1s and all hand-rolled display H2s, heroes lifted out of block Reveals, .split-line-mask italic-overshoot headroom (collapse-proof via :has flex). LabelScrambler extended to composite dot-eyebrows (TreeWalker text nodes, abort-safe). CountUp resurrected: detail metrics, /about strip (force prop for bare ints), spine proof chips counting at the rAF panelOpacity lit threshold. New RedactedReveal primitive on the 6 Not-a-fit rows (copy 6+6 verbatim; PIANO 4+4 trim rejected per copy-stays-current-site memory). Fixed 3 shipped-broken latencies: choreographer paused-from+invalidate().restart() trap (115->115, nothing ever revealed; rewritten set+lazy fromTo, confirmed in isolation), CountUp born-active once:true ST never firing on detail pages (isActive immediate-fire + replay guards), check-pass fixes (language-freeze on 21 headings, mask margin-collapse height drift, scramble abort corruption). Headless QA (npx playwright-core + system Chrome on next start :3311): frame-level proof of counting (-0%->-47%, chips 0->13), EN->IT re-split, reduced-motion static, console clean desktop+mobile. tsc + build green (40/40). Specs updated: engine ownership table + GSAP traps + pinned-stage trigger regime + headless QA gotchas. Next: step 4 (section-state bus, hero compression, TSL compute attractors port).

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `2ba2e45` | (see git log) |
| `2eb2fb1` | (see git log) |
| `5e18385` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
