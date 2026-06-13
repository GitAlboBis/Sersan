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
 * Outer height of the pinned spine section, in vh. 390vh is the compressed
 * 4-group layout (restyle step 4, merge option A: hero · signals∪audit ·
 * build∪operate · handover — was 520vh with 6 single-stage panels).
 */
export const SPINE_HEIGHT_VH = 390;

/**
 * Scrub travel of the spine's ScrollTrigger, in vh: the outer height minus
 * the 100vh sticky viewport. ScrollTrigger progress 0..1 (start "top top" →
 * end "bottom bottom") maps linearly onto this distance, so a stage range of
 * 0.2 means 0.2 × 290vh = 58vh of real scrolling.
 */
export const SPINE_TRAVEL_VH = SPINE_HEIGHT_VH - 100;
