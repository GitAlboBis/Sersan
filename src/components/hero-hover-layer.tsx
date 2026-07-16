"use client";

/**
 * Hover-sense layer for the hero mark.
 *
 * The WebGL canvas is pointer-events:none (decorative layer behind the DOM),
 * so this transparent layer over the RIGHT side of the hero stage senses the
 * pointer and feeds heroHoverStore.hovering — the gate for the mark's cursor
 * erode/dissolve (HeroLogo reads it alongside pointerStore for the raycast).
 * The left side (headline + CTAs) stays untouched. Wheel events bubble
 * through to Lenis, so scrolling over the mark still works.
 *
 * NOTE: this layer used to be a drag-to-rotate capture surface (grab cursor,
 * velocity deltas into a vx/vy channel). Nothing ever consumed the rotation —
 * the mark's readability contract is face-on (~4° parallax nod max) — so the
 * grab cursor was an anti-affordance: it promised a rotation that never
 * happened. The drag machinery was retired; hover-sense is the whole job.
 */
import { useEffect } from "react";
import { useHeroHoverStore } from "@/webgl/store/heroHoverStore";
import { useTierStore } from "@/webgl/store/tierStore";

export function HeroHoverLayer() {
  // Only meaningful while the WebGL mark is live.
  const heroReady = useTierStore((s) => s.heroReady);

  // If the sense div disappears WHILE hovered (tier demotion flips heroReady
  // false, or the whole section unmounts) no pointerleave ever fires, so the
  // store flag would stay latched true and the mark's erode gate would rest
  // open with no pointer over it. Clear it on both edges.
  useEffect(() => {
    if (!heroReady) useHeroHoverStore.getState().setHovering(false);
    return () => useHeroHoverStore.getState().setHovering(false);
  }, [heroReady]);

  if (!heroReady) return null;

  return (
    <div
      aria-hidden
      className="absolute inset-y-0 right-0 w-[46%] z-[5]"
      onPointerEnter={() => {
        // Hovering the hero starts the logo dissolve (leaving reforms it).
        useHeroHoverStore.getState().setHovering(true);
      }}
      onPointerLeave={() => {
        useHeroHoverStore.getState().setHovering(false);
      }}
      onPointerCancel={() => {
        useHeroHoverStore.getState().setHovering(false);
      }}
    />
  );
}
