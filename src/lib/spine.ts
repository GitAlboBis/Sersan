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
