"use client";

/**
 * lusion-ease — THE house ease as a shared, guarded GSAP CustomEase.
 *
 * Lusion's production bundle defines `lusion(e) = cubicBezier(e, .35, 0, 0, 1)`
 * (text dossier §0) and uses it for virtually every entrance/hover. The CSS
 * twin lives in globals.css as `--ease-lusion: cubic-bezier(0.35, 0, 0, 1)`.
 *
 * This module is the ONE registration point (round-5 spec: register the ease
 * exactly once, site-wide). `lusionEase()` is get-or-create — idempotent under
 * HMR and across chunks — so every consumer (work-card, case-studies-client,
 * lusion-type) resolves the same cached CustomEase instance.
 */
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

if (typeof window !== "undefined") {
  gsap.registerPlugin(CustomEase);
}

/** The house ease as a shared GSAP CustomEase (created once, cached). */
export function lusionEase() {
  return (
    CustomEase.get("lusion") ?? CustomEase.create("lusion", "0.35, 0, 0, 1")
  );
}
