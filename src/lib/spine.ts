/**
 * Shared geometry of the pinned home spine (cinematic-system-scroll).
 *
 * Lives in src/lib (pure data — no three/react deps) because BOTH bundles
 * need the same number: the route bundle renders the outer spine section at
 * this height, and the lazy WebGL island (HeroLogo) derives its no-span
 * fallback for the hero pin range from it. Constants only — no state, so no
 * globalThis pin is required (duplicated module copies stay identical).
 */

/**
 * Outer height of the pinned spine section, in vh. 315vh is the 3-group
 * layout (2026-08-07: stage 05 "handover" moved OUT of the spine — it now
 * lives ONCE as panel 1 of the singularity passage's horizontal track, so
 * the spine runs 01→04: hero · signals∪audit · build∪operate. Was 390vh
 * with the 4th "handover" group; each surviving group keeps its exact
 * pre-move scroll length: 58vh · 81.7vh · 75.3vh over a 215vh scrub).
 */
export const SPINE_HEIGHT_VH = 315;

/**
 * Scrub travel of the spine's ScrollTrigger, in vh: the outer height minus
 * the 100vh sticky viewport. ScrollTrigger progress 0..1 (start "top top" →
 * end "bottom bottom") maps linearly onto this distance, so a stage range of
 * 0.2 means 0.2 × 290vh = 58vh of real scrolling.
 */
export const SPINE_TRAVEL_VH = SPINE_HEIGHT_VH - 100;

/**
 * Outer height of the COMPACT spine (CompactSpine in cinematic-system-scroll:
 * coarse pointer / ≤768px, motion OK), in svh — MOBILE_HOME_SPEC §2 row 1:
 * 3376px / 4.00vh → 1519px / 1.80vh at 390×844. svh, never vh: the sticky
 * stage inside is 100svh, and a runway in the same unit is frozen against the
 * mobile address-bar collapse for free. Readers: CompactSpine (writes the
 * runway height + minHeight from it) and navbar (mobile-parity Phase 4b — the
 * hero header-hide reveal band must use the COMPACT travel when the compact
 * brand anchor `[data-hero-brand-compact]` is the one on the page).
 */
export const COMPACT_SPINE_SVH = 180;

/**
 * Scrub travel of the compact spine, in svh: the outer height minus the
 * 100svh sticky stage (80svh ≈ 675px at 390×844 — ~27svh per grouped panel).
 */
export const COMPACT_SPINE_TRAVEL_SVH = COMPACT_SPINE_SVH - 100;

// === Phase 4b kill-switch =================================================
// HERO_BRAND_COMPACT (plans/2026-08-17-mobile-parity.md, Phase 4b — owner
// Decision 2: "brand intro 'Sersan AI' anche su telefono capace, tap = skip").
// When TRUE the CompactSpine renders the compact "Sersan AI" particle anchor
// (`[data-hero-brand][data-hero-brand-compact]`) on capable phones only —
// fxBudget.level ≥ 2 AND a resolved true-WebGPU backend — which arms the
// HeroTextParticles brand beat (auto-play, time-driven, no scroll consumption,
// tap/Esc = skip) and the HomeSingularity lite eclipse behind it. When FALSE
// every phone renders byte-identical to before this phase: no anchor, no
// store reads, DOM cascade exactly as today, AND the lite eclipse island does
// not mount either (Scene.tsx AND-s this flag into its `homeSingularityLite`
// selector) — one switch, both halves of the beat. Desktop (`mode ===
// "desktop"`, tier full ⇒ raymarchLite false) never consults this flag.
//
// Lives HERE (a DOM-free, three-free module) rather than in
// cinematic-system-scroll.tsx because BOTH bundles read it: the route bundle
// (CompactSpine's `brandArmed`) and the lazy WebGL host (Scene.tsx's lite
// gate). Constant only — no state, so the duplicated module copies stay
// identical (see the header note).
export const HERO_BRAND_COMPACT = true;
