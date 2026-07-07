"use client";

/**
 * Route-enter transition (M3 / P6 cross-route cinema).
 *
 * App Router remounts template.tsx on every navigation, which makes it the
 * natural hook for page-enter choreography — WITHOUT touching the canvas:
 * the persistent WebGL layer lives in layout.tsx and never remounts; only
 * the DOM content fades up. The signature line's own re-curve fade runs in
 * parallel (Scene.tsx keys uReveal on the pathname, fading out then back in
 * over a ~420ms window), so the whole page — DOM and WebGL — breathes in
 * together on one beat.
 *
 * Two SEPARATE elements (never nested):
 *   1. the content `<div>` — fades up (autoAlpha + y), `clearProps:"all"`.
 *   2. a SIBLING fixed curtain overlay — a navy clip-path wipe with a faint
 *      accent edge that sweeps across the viewport as the page resolves.
 *
 * The curtain MUST NOT wrap the content div: the content tween uses
 * `clearProps:"all"`, which would strip the curtain's own inline clip-path
 * state if they shared a node. Keeping them siblings means each owns its
 * tween, and the per-navigation remount always hands us a fresh curtain.
 *
 * Guarantees:
 *   - The curtain ALWAYS ends fully open (clip-path collapsed off-screen) and
 *     `pointer-events:none`, so it can never trap clicks or leave the screen
 *     covered — even if a navigation interrupts it (the tween is killed on
 *     unmount; the next mount starts a fresh element).
 *   - First mount does a gentle one-time reveal that ends open just like a
 *     navigation, so the very first paint is never left covered.
 *   - prefers-reduced-motion: no animation at all — content appears
 *     immediately and the curtain stays hidden (`.transition-curtain` is
 *     `display:none` under reduced-motion in globals.css).
 */
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { playTransition } from "@/lib/audio/uiSounds";
import { consumeCurtainSuppression } from "@/lib/flip-handoff-store";

// Wipe duration. Kept close to the Scene.tsx 420ms `setReveal` window so the
// DOM curtain, the line fade-out/re-curve/fade-in, and the content fade-up all
// land on one visible beat.
const CURTAIN_DURATION = 0.62;

// Module-level flag: true until the first template mount completes. Survives
// the per-navigation remounts (the module is loaded once). On the very first
// paint we SKIP the covering wipe so the curtain never hides the SSR'd
// content / LCP (there is no preloader by design — the poster→planet
// crossfade is the hero load-in). Subsequent navigations get the full wipe.
let hasMountedOnce = false;

export default function Template({ children }: { children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  // Latches the once-consumed curtain-suppression flag per template instance.
  // React StrictMode (dev) runs the effect mount→cleanup→mount; the store flag
  // is consumed exactly once, so without the latch the SECOND run would read
  // `false` and play the full wipe over the zoom clone — the double-cover the
  // flag exists to prevent. Refs persist across the StrictMode double
  // invocation but reset on the real per-navigation remount, so prod behavior
  // is byte-identical (one consume per navigation).
  const suppressRef = useRef<boolean | null>(null);

  useGSAP(
    () => {
      if (
        typeof window === "undefined" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        // Reduced motion: instant swap. Make sure nothing is left hidden.
        // (.transition-curtain is also display:none under reduced-motion in
        // globals.css; this is belt-and-suspenders.)
        if (curtainRef.current) {
          gsap.set(curtainRef.current, {
            clipPath: "inset(0% 0 100% 0)",
            pointerEvents: "none",
          });
        }
        return;
      }

      const isFirstMount = !hasMountedOnce;
      hasMountedOnce = true;

      // Content fades up. clearProps wipes its inline styles afterwards so no
      // transformed ancestor lingers around sticky/fixed descendants.
      gsap.fromTo(
        contentRef.current,
        { autoAlpha: 0, y: 18 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: "expo.out",
          clearProps: "all",
        },
      );

      if (isFirstMount) {
        // First paint: never cover the SSR'd content. Leave the curtain fully
        // open + inert; only the content fade-up plays.
        if (curtainRef.current) {
          gsap.set(curtainRef.current, {
            clipPath: "inset(0% 0 100% 0)",
            pointerEvents: "none",
          });
        }
        return;
      }

      // Subtle airy whoosh, once per navigation (skipped on first mount above).
      // The engine no-ops when audio is off or the AudioContext is still locked.
      playTransition();

      // Zoom-armed navigation (work card → detail): the inflating card clone
      // (fx/flip-handoff-overlay, z-70) IS the curtain for this navigation —
      // leave ours open so two navy sheets never double-cover. The flag is
      // consumed exactly once and freshness-gated in the store, so a click
      // that never navigated cannot eat a later navigation's wipe. The
      // content fade-up above still runs (it resolves beneath the clone).
      suppressRef.current ??= consumeCurtainSuppression();
      if (suppressRef.current) {
        if (curtainRef.current) {
          gsap.set(curtainRef.current, {
            clipPath: "inset(0% 0 100% 0)",
            pointerEvents: "none",
          });
        }
        return;
      }

      // Curtain wipe — a navy sheet that starts fully covering the viewport
      // and lifts UPWARD, uncovering the page from the bottom up. `clip-path`
      // inset goes from "0% clipped on every side" (fully covering) to "bottom
      // 100% clipped" (collapsed to a hairline at the TOP edge). It ALWAYS ends
      // in this collapsed/open state — byte-identical to the CSS default and
      // to the onComplete re-assert below, so no path rests covering.
      gsap.fromTo(
        curtainRef.current,
        { clipPath: "inset(0% 0 0% 0)" },
        {
          clipPath: "inset(0% 0 100% 0)",
          duration: CURTAIN_DURATION,
          ease: "expo.inOut",
          // Safety net: regardless of how the tween resolves, leave the
          // curtain fully open and inert.
          onComplete: () => {
            if (curtainRef.current) {
              gsap.set(curtainRef.current, {
                clipPath: "inset(0% 0 100% 0)",
                pointerEvents: "none",
              });
            }
          },
        },
      );
    },
    { scope: contentRef },
  );

  return (
    <>
      <div ref={contentRef}>{children}</div>
      {/* SIBLING fixed curtain — decorative, never traps interaction. The base
          .transition-curtain class (globals.css) is fixed, full-viewport,
          navy, pointer-events:none, faint accent edge, and display:none under
          reduced-motion. We override its clip-path inline via GSAP above. */}
      <div ref={curtainRef} className="transition-curtain" aria-hidden="true" />
    </>
  );
}
