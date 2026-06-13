# Restyle step 4: section-state bus, spine compression + soft snap + skip, TSL compute attractors hero sim

## Goal

Execute step 4 of `PIANO_RESTYLE.md` §9 in three sequenced chunks (each independently shippable):
**C1 section-state bus → C2 spine compression + snap + skip → C3 hero sim consolidation.**

## Research References (authoritative — read before each chunk)

* [`research/spine-anatomy.md`](research/spine-anatomy.md) — 520vh/420vh-scrub spine, 6 STAGE_CONTENT panels with ranges, per-panel rAF system, textMorphStore writer/reader table, merge options A/B/C, snap offsets, mobile fallback.
* [`research/stores-snap-bus.md`](research/stores-snap-bus.md) — 10 stores, 8+ independent section-derivations, ST inventory, `lenis/snap` API (ships in 1.3.23), sessionStorage conventions, bus shape recommendation.
* [`research/hero-sim-current.md`](research/hero-sim-current.md) — shipped "spores" compute sim state, two kernels, what the attractors port replaces vs keeps, determinism model, open 06-08 items.
* [`research/tsl-compute-api.md`](research/tsl-compute-api.md) — r184 compute API snippets, WebGL2 fallback behavior, `.toAttribute()` vs `.element()`.
* From task 06-08 (still authoritative, do not duplicate): `.trellis/tasks/06-08-gpgpu-particle-dissolve-hero-logo-fbo-spring-mouse-repulsion-webgpu-native/research/gpgpu-webgpu-spec.md` and `.../research/ddd-bundle-teardown-spore-render.md`.

## Requirements

### C1 — Section-state bus (prerequisite)
* New `sectionStore` (zustand, **globalThis-pinned** like textMorphStore — Turbopack dual-instance bug): `activeSection: string | null`, `direction: 1 | -1`, sections registry with measured spans; per-section progress as a pure derived helper (no per-frame store writes beyond what scrollStore already does).
* Single writer hoisted to a **layout-level component** (works even when tier="off" / canvas unmounted — fixes the gap where scrollStore.activeAnchor never updates).
* Subsume `scrollStore.activeAnchor` (write-only today, zero readers): bus becomes the one source; `[data-line-anchor]` stays the boundary marker (NO new attribute), excluding the zero-height decorative anchors (work-in-progress/gateway/ritual) from section identity.
* Migrate obvious consumers: navbar active state (drops its private native scroll listener), SignatureLine anchorPulse path kept but reading the bus where it duplicates, choreographer/particles may read direction for velocity flavor. Do NOT force-migrate every private rAF in this chunk — only the duplications listed in research §1; the rest is follow-up.
* Consumers read via `getState()` in rAF/useFrame — zero React re-renders per scroll. SSR-safe.

### C2 — Spine compression + soft snap + skip
* **Merge option A** (research-recommended): hero · signals∪audit · build∪operate · handover — a **grouping layer over unchanged STAGE_CONTENT** (copy verbatim, EN+IT), outer 520vh→**390vh**, snap offsets [0, .20, .48, .74, 1].
* Mobile fallback keeps iterating the **ungrouped** 6 blocks (compression is desktop-only by construction).
* Renumber/verify everything stage-indexed: panelOpacity ranges, lit/inert thresholds, proof-chip fire on the final panel, SpineExitGate pin-END coupling (survives height change per research), HeroLogo's lone hard-coded `ih*4.2` fallback (HeroLogo.tsx:849) must be re-derived.
* **Soft snap via `lenis/snap`** (Snap from "lenis/snap", proximity type, debounce; rides lenis.scrollTo — never ScrollTrigger snap). Interior boundaries only (.20/.48/.74 in spine terms): must NOT fight HeroIntroGate (boundary 0) or SpineExitGate (boundary 1). `snap.stop()` while gateEngaged; re-register snap points on refresh/resize (spine owns its refresh bursts).
* **Skip intro**: double wheel-flick detection during the gate fast-forwards the morph (set textMorphStore end-state flags so HeroIntroGate releases and never re-engages this session) + `sessionStorage` flag (new convention; hydrate-in-effect like audioStore) that short-circuits the gate on subsequent home visits in the session. Must compose with smooth-scroll-provider's nav-INTO-home replay reset (skip flag wins). Reduced-motion users already bypass the gate — verify unchanged.

### C3 — Hero sim: attractors-model upgrade + consolidation (closes task 06-08 scope)
* Unify the two compute kernels (HeroLogo spores + HeroTextParticles text-morph) on one force model: analytic anchor target (pure fn of morph uniforms — determinism on scrub) + integrated sim offset relaxing to 0, with attractor/orbit force term from the three.js attractors example, damping + velocity clamp (1/30 dt clamp kept).
* Migrate remaining vertex-stage `.element()` reads to `.toAttribute()` (three #31221).
* Retire dead modes: FBO rig, sprite `particles`/`particles-2layer`, parked debug modes — fxStore cleanup; analytic `particles-static` STAYS as the non-WebGPU fallback. Compute path only on real WebGPU backend (detection idiom: `backend.isWebGLBackend !== true && typeof gl.compute === 'function'`).
* Velocity→color mix preserved (violet→cyan on movement), selective-bloom contract unchanged, pointer raycast (projectCursorToModel) unchanged, life machine + uBurst dissolve unchanged.
* Strip the phantom prod remount diagnostic logging in HeroTextParticles (root-cause if trivial, else remove the log).
* Gate release stays store-flag-driven, never sim-state-driven.

## Acceptance Criteria

* [ ] C1: one source of truth — navbar reads the bus (private scroll listener deleted); scrollStore.activeAnchor removed or aliased to the bus; no behavior change visible; consumers read without re-renders.
* [ ] C2: spine ≤400vh with 4 grouped panels (option A), copy byte-identical EN+IT, mobile fallback unchanged; directional-feeling soft snap that never fights Lenis/gates (manual scrub up+down at multiple speeds, headless + eyeball); double wheel-flick skips the intro and persists for the session; nav-away→back-home replay rules respected; proof chips still count exactly once on handover lit.
* [ ] C3: single unified kernel module; WebGPU tier shows momentum sim with attractor model; non-WebGPU shows static fallback (no black canvas anywhere); no `.element()` vertex reads remain; retired modes deleted from fxStore/leva; morph timeline scrubs deterministically in both directions.
* [ ] Cross: zero `[data-line-anchor]` drift (anchors stable through compression); 60fps desktop on the home scrub; reduced-motion: no gate, no snap, static hero, page fully readable; tsc + next build green; headless QA desktop+mobile with console clean (per spec QA gotchas: effective-opacity checks, addInitScript loggers).
* [ ] Task 06-08 reconciled: remaining open items either closed here (kernel unification, mode retirement, diagnostic strip) or explicitly re-scoped; archive 06-08 if superseded.

## Definition of Done

* Typecheck/build green; headless QA evidence both viewports; specs updated (bus convention, lenis/snap pattern, sessionStorage convention, compute consolidation notes); commits on `feat/webgl-refactor`, no push.

## Decision (ADR-lite)

* **Context**: research corrected two assumptions — the hero already ships a TSL compute momentum sim (spores, 9bf6519), and Lenis 1.3.23 ships native snap.
* **Decisions**: (1) merge option **A** (4 groups, 390vh, balanced panels, zero homeless copy) over B (density risk) and C (heavy final panel); (2) snap = **lenis/snap** proximity, interior-only, never ScrollTrigger snap; (3) bus = **new globalThis-pinned sectionStore** with layout-level writer, subsuming write-only activeAnchor; (4) C3 = consolidation/upgrade of the existing compute engine, NOT a rewrite — 06-08 research referenced, its task closes with C3; (5) sessionStorage skip flag is a new convention (hydrate-in-effect, no SSR read).
* **Consequences**: compression is desktop-only by construction (mobile iterates ungrouped blocks); snap quality depends on lenis/snap debounce tuning (QA at multiple scrub speeds); kernel unification touches the most complex WebGL file (gpgpuNodeSim.ts ~2k lines) — C3 is the risk concentration, sequenced last so C1/C2 can ship regardless.

## Out of Scope

* Copy rewrites; rail//audit//resources//trust beats (steps 5-7); transitions/Flip + framer-motion drop (step 8); runtime FPS auto-degrade (tracked as 06-08 leftover if not closed); per-component migration of every private rAF loop to the bus (only the listed duplications).

## Technical Notes

* Conventions that bind this task: CSS-sticky pinning only; single rAF authority (FrameDriver pumps Lenis); provider never refreshes on "/" (spine owns refresh bursts 60/250/700/1500ms + rail fonts.ready); globalThis-pin new stores; animations must not change document height; `key={language}` contract on bilingual split headings (panels carry data-split-reveal? — spine panels are rAF-faded, NOT choreographer targets; keep it that way).
* Gates already preventDefault at capture so no virtual-scroll fires while engaged; still call `snap.stop()` on gateEngaged (belt+braces).
