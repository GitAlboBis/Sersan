# Engineered prompt — SERSAN card / scroll / transition refactor plan
(2026-07-07 — authored per user request "scrivi un prompt con le migliori skills di prompt engineer per un piano di refactor di card, scroll, transition animation e poi eseguilo")

```
Role: You are a senior creative front-end engineer and motion architect operating at
Lusion/Awwwards level, expert in three.js 0.184 (WebGPU + TSL node materials with GLSL
twins), @react-three/fiber 9, GSAP 3.15 (ScrollTrigger, Draggable, InertiaPlugin, Flip),
Lenis 1.3, zustand, and Next.js 16 App Router on React 19.

Objective: Produce an implementation-ready refactor plan for the SERSAN site
(C:/Users/alber/Desktop/sersan-v2-main) that:
  (1) fixes the scroll-driven luminous signature line desyncing from the viewport on
      several routes/sections,
  (2) fixes the jerky end of the post-hero camera descent (shared by the line head),
  (3) replaces the founder cards and the work/case-study cards with premium
      horizontal-scroll set pieces, distilling and combining techniques from 7 reference
      templates (Motion sticky horizontal scroll; GSAP motionPath POV-pan smoothing;
      Codrops horizontal parallax gallery; Codrops animate-shaders-with-GSAP incl.
      Draggable↔ScrollTrigger bridge + Kawase focus blur; r3f-image-reveal noise mask;
      Codrops OnScrollFilter SVG displacement reveals + Flip; supahfunk webgl-carousel
      velocity lens + pyramid stacking).

Details (binding constraints — verify each proposal against ALL of them):
  - Recon evidence lives in scratchpad/recon/*.json (4 codebase readers, 5 template
    distillations) + templates/inline-templates-distilled.md. Cite it; do not re-derive.
  - Repo invariants: NEVER GSAP pin: (pin-spacers break [data-line-anchor] measurement)
    — the sanctioned pattern is CSS sticky frame + px-height section + one ScrollTrigger
    (start "top top", end "bottom bottom", invalidateOnRefresh, onRefreshInit: measure)
    writing via quickSetter; SignatureLine's useFrame is the SINGLE camera authority;
    single RAF (R3F pumps Lenis; no new rAF loops for WebGL); dual material discipline
    (TSL node material for the WebGPU bundle, GLSL twin only if the flag-OFF path renders
    it; decorative islands may be TSL-only); zustand read via getState() in useFrame;
    stores that cross bundles must be globalThis-pinned; home route gets NO global
    ScrollTrigger.refresh — new pinned sections own their refresh cadence; card widths
    in rem; per-section native fallback (mobile/coarse/reduced-motion → overflow-x snap
    scroller with data-lenis-prevent), SSR renders the pinned markup.
  - Copy is IMMUTABLE (memory: hero/all texts stay as the current site). Palette:
    #0B1422 navy, cyan #3BE1FF → deep blue accents; NO violet anywhere new; replace
    legacy #7C5CFF where touched.
  - Only animate transform/opacity/filters/uniforms. Respect prefers-reduced-motion.
    Keyboard focus of off-screen cards must convert to scroll. 60fps budget.

Approach step-by-step (show your reasoning at each step):
  1. Rank the root causes of bugs (1) and (2) by evidence strength; choose the minimal
     correct fix for each that preserves every invariant.
  2. For each of the 7 templates: accept / adapt / reject each technique for this site,
     with one-line justification tied to brand ("intenzionale e ingegnerizzata", no
     gratuitous effects).
  3. Design the founders horizontal section and the work rail redesign: DOM structure,
     measurement strategy, stores/uniforms, analytic (rect-free) per-frame math,
     fallbacks, cleanup contract.
  4. Partition into work packages with DISJOINT file ownership so they can be
     implemented by parallel agents; list exact files per package.
  5. Define a browser QA script per package: what to verify, at which scroll positions,
     on which routes.

Sense check before finalizing: every animation is transform/opacity/uniform-only; no
package pair shares a file; each new section keeps its [data-line-anchor] wrapper
zero-layout and re-measurable; the signature-line fix keeps the audit/production
emissive beats and camDescend head-tracking working; the descent fix keeps camTilt's
in-flight contract (scrollRamp forced to 1 while locked) and the camDescend publication
consumed by HeroLogo/HeroTextParticles.

Output format: a plan document with sections DIAGNOSIS → FIXES (file-level, with
formulas) → TEMPLATE MAP (accept/adapt/reject) → NEW SECTIONS (founders, work) →
WORK PACKAGES (A/B/C, files, dependencies) → QA SCRIPT → RISKS.
```
