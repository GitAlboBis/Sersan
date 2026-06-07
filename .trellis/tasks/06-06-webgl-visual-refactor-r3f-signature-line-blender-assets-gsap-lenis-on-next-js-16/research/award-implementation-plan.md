# SerSan Award Plan — "The Signal Threads the Whole Studio"

> Source: planning workflow `wf_a848ef1d-c5b` (11 agents, 6 audits + 3 proposals + synthesis + adversarial critique). This is the **refined** plan with the critique's fixes folded in. Build order is binding; invariants are load-bearing across phases.

## Big idea
One continuous beam of light — *the signal* — is SerSan's promise made visible. It enters the home hero through the draggable Saturn (HeroPlanet, untouched), threads every section as a living CatmullRom tube that **breathes and brightens as the reader arrives at each beat**, survives every navigation inside the single persistent R3F context, and re-curves under a cinematic curtain so route changes read as one seamless wipe. Every interior route inherits the same spine (line + drifting dust + selective bloom) with a tone bespoke to its content, gains the home's motion grammar, and resolves into a brand-native 3D "ritual object" at its climactic CTA — a generalized `RouteHero` that the loved `GatewayPortal` becomes one config of. All motion is additive over byte-frozen EN/IT copy.

## TOP-LEVEL INVARIANTS (a phase that breaks any of these is wrong)
1. **Copy freeze** — every visible EN/IT string/number/name/reference is byte-frozen. SplitText runs on **titles only** (`type:"lines"`), and **must `revert()`** before any EN/IT re-split so the language toggle never reconciles against mutated DOM. **No `TextPlugin` retype** — "write-in" effects animate `clip`/`opacity` on already-present nodes. Snapshot `innerText === source` on **both** languages for **every** heading touched, not a sample.
2. **WebGL math** — CONSTANT `WORLD_VIEW_HEIGHT`/`k`; `camera.position.y = -(scrollYWorld + ih/2)*k` stays byte-identical. `useThree().size` is allowed (resize-stable); `useThree().viewport` is **forbidden** (camera-distance-derived → feedback loop). Selective bloom only via `luminanceThreshold` + `toneMapped:false` + `emissive>1`. Waypoint `|x| >= ~1.1` so serpentine turns happen off-screen. Single RAF: `FrameDriver` pumps `lenis.raf()`.
3. **SectionHeading new slots MUST be optional/back-compatible** — load-bearing for P2, P3 and P5.
4. **New ScrollTriggers** use `gsap.set` inside `onUpdate` only — **no new pins or long-scrubs** that change `document.scrollHeight` and shift every downstream anchor fraction (the line + gateway are glued to fractions). Create them inside the smooth-scroll-provider context; debounce `ScrollTrigger.refresh`.
5. **GSAP free-tier only** — SplitText, ScrollTrigger, `quickTo`, `timeScale`. **No MorphSVG** (not free; the audit's "planet morphs into thumbnails" idea is dropped on purpose).
6. **HeroPlanet stays home-only and untouched.** P4 generalizes `GatewayPortal`, never HeroPlanet. Diff the home gateway screenshots before/after P4.
7. **`prefers-reduced-motion` and tier `lite`/`off`** disable every non-essential loop (breath, pulse, parallax, marquee coupling, console scan, founder tilt, curtain, 3D pulse). Full frozen text remains present and readable.
8. **Keep `docs/STRATEGY.md` in sync** whenever `page.tsx` structure changes (e.g. extracting `SectionDivider`).

## Phases (binding order)

### P0 — Route-aware FX substrate + section-in-view signal (the ONE shared-file pass)
Do every shared WebGL/store edit once, behind defaults that keep home **pixel-identical**.
- `src/webgl/store/routeFxStore.ts` (new): `routeFx(pathname)` → `{ bloomIntensity, bloomThreshold, bloomRadius, particleOpacity, particleCountScale, lineColorA/B/Hot, lineEmissiveScale, tessellationScale }`. `'/'` and `'default'` return **today's fxStore values verbatim**. Interior tones differ subtly (per route).
- `src/webgl/hooks/useSectionAnchors.ts` + `src/webgl/store/scrollStore.ts`: ONE IntersectionObserver over the already-queried `[data-line-anchor]` nodes (threshold ~0.35), rebuilt only on `anchors.version` bump. Expose `inView` map + centered `activeAnchor`; add `activeAnchor` + decaying `anchorPulse` (read via `getState()` in useFrame, damped).
- Wire `Scene.tsx`/`PostFX.tsx`/`SignatureLine.tsx`/`DriftParticles.tsx`/`materials/particleShader.ts` to `routeFx` behind home-identical defaults (multiply/lerp existing uniforms only).
- **Front-load all `globals.css` additive utilities here** behind unused classes (card lift/shadow, fit tints, divider clip, curtain) so later phases only reference them — keeps the "edit shared files once" rule.
- **Verify:** home pixel-identical (diff screenshots at scroll 0/mid/gateway); console clean across rapid nav (no observer leak); EN/IT toggle clean; `__sersanLineDebug` bbox unchanged; tsc green; 60fps.

### P1 — The line, alive (home-validated)
- **First, the safe win:** section-arrival emissive pulse driven by `anchorPulse` (damped 1.0→~1.2→1.0, summed with existing velocity boost THEN clamped). Reuses the proven `uReveal`/`setReveal` machinery.
- **Then, carefully:** radius-relative vertex-displacement "breath" — **must perturb BOTH `position` and the varying view-normal** (else the facing-core glow desyncs and the head-edge `fwidth` mask shimmers); amplitude ≤ `0.4*radius`; `uBreath=0` on lite. **If the head-edge can't stay crisp at turns, demote/cut it** — the pulse already delivers most of the payoff.
- Credibility marquee scroll-velocity coupling via GSAP `timeScale` (not CSS duration); falls back to fixed loop when velocity is 0 / reduced-motion.
- **Verify:** breathe + brighten on scrub/flick; no polygonal elbows at 1440/768/390; reduced-motion static; lite tier no self-intersection.

### P2 — Home upper-fold choreography
Per-section file edits (parallel-safe). Card depth (`.card-steel` + lift + layered accent shadow + icon motion — animate sub-elements only, never the card-root transform the tilt controller owns); tiny scroll-parallax + directional wave reveals (`Reveal` gains an **optional, default-unchanged** from-offset); problem incident-console row-scan + severity pulse + masked radar sweep (IntersectionObserver-gated, one shared rAF); heading cascade + `SectionDivider` extracted to a `'use client'` component that draws from center (page.tsx stays a Server Component; **update `docs/STRATEGY.md`**).

### P3 — Home lower-fold dimensional pass
Founder photos pointer-tracked tilt (`quickTo`, on a wrapper not the `<img>`, separate from any `.card-steel`) + grayscale→color + chip micro-rotation; process traveling connector pulse + phase stagger (overlay pseudo-element so the hairline survives reduced-motion); fit directional mirror-reveal; final-CTA "living code" via clip/opacity on already-present text nodes + blinking cursor pseudo-element. Re-measure anchors after layout-touching edits; confirm gateway still threads the line.

### P4 — Generalize GatewayPortal → RouteHero (+ optional Blender ritual objects)
`src/webgl/RouteHero.tsx`: `GatewayPortal` becomes one config of a generalized component (`glbPath | proceduralKind`, material/emissive/rotation, anchor id) using the SAME world-anchor math + presence smoothstep + threshold-bloom inner. **`useThree().size` ok, `.viewport` forbidden.** Home gateway output **byte-identical** after refactor.
- **Procedural `proceduralKind` variants are the default deliverable** (icosahedron edge-frame "lattice", segmented torus "ring") — on-brand and never block P5.
- **Blender is optional polish:** if Blender MCP is connected, author small (<80KB) geometry-only GLBs (audit lattice, consulting ring) named to match the R3F `nodes[...]` lookup; otherwise ship procedural.
- **Consolidate:** `/trust`'s ritual object IS the P6 `CompliancePipeline3D` — drop the separate `trust-node` GLB.

### P5 — Interior routes inherit the spine
Split per critique:
- **P5a (DOM-only, ships right after P0 — no Blender/P1 dependency):** add `[data-line-anchor]` markers + swap bare `h2+p` for shared `SectionHeading` (pass existing JSX titles **verbatim** as ReactNode; keep interior `<h1>` heroes hand-rolled for heading hierarchy) + `Reveal` stagger on grids + `.card-steel` on interior cards, across `/consulting /audit /case-studies /resources /about /contact /trust`. **Confirm interior mobile Lighthouse ≥80** (new client JS: heading-choreographer, card-tilt — watch TBT).
- **P5b (depends on P1 + P4):** bespoke per-route curves in `routeCurves.ts` (tone via z-bias/segment-density/color, **never** `|x|<1.1`); mount `RouteHero` per route via a single **pathname→config map** in `Scene.tsx` (replaces the two `pathname==='/'` gates; HeroPlanet stays home-only). The `/trust` 3D mount is an entry in THIS map (so Scene.tsx is touched once more, not twice).
- **Verify:** navigate all routes — line + particles persist and re-curve (no canvas remount flash); each RouteHero threads the line at its CTA; no on-screen hairpins; copy diffed == main per route.

### P6 — Cross-route cinema
- **Transition curtain** in `template.tsx` — a **SIBLING fixed element** (clip-path inset wipe, navy + faint accent), NOT wrapping the existing animated div (its `clearProps:"all"` would strip curtain state); timed to the existing ~420ms `setReveal` beat. `pointer-events-none` after exit; instant swap under reduced-motion.
- **/trust 3D pipeline** (`CompliancePipeline3D`, full tier only): emissive node spheres + TubeGeometry edges reusing the line shader, a pulse traveling node→node in rhythm with the existing accessible 2D SVG (which stays the copy-bearing source of truth, aria untouched). **Visibility blocker to solve:** the DOM sits opaque over the fixed canvas, so the `/trust` pipeline section needs a **transparent "window" gap** (like the home gateway gap) for the 3D to show through. Mounted via the P5b pathname map.
- **Preloader: DEMOTED/cut** — 2025 cliché, only "med" impact, GLBs are tiny/lazy so there's little to preload, and it risks regressing the loved instant home reveal/LCP. Only add if it can be genuinely tasteful and session-gated; otherwise skip.

## Per-phase loop
trellis-implement → trellis-check → Chrome visual QA (multi-viewport, console, reduced-motion via DevTools, EN/IT copy diff) → commit (no push). tsc green is a gate at every step.
