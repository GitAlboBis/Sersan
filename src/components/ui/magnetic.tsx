"use client";

/**
 * Magnetic — Lusion-style magnetic hover (AGENTS.md §3c).
 *
 * Wrap a CTA and it leans toward the cursor while hovered, springing back
 * to rest on leave. gsap.quickTo keeps the chase on one cheap tween per
 * axis. Desktop pointer only: disabled for coarse pointers and under
 * prefers-reduced-motion — on those devices this is a plain wrapper.
 *
 * UPGRADES (backward-compatible — existing `<Magnetic>` / `<Magnetic strength>`
 * usages behave as before):
 *   - `radius`: opt-in engage distance (px). When set, the magnet only pulls
 *     once the pointer is within `radius` of the element center, and releases
 *     past it — so it doesn't yank from across a large bbox. Unset → legacy
 *     "engage anywhere inside the element" behaviour (the pointermove only
 *     fires over the element anyway).
 *   - gentle overshoot: a soft 1.03 scale pop with a back ease on engage,
 *     settling to rest on leave — reads as an elastic "lock-on".
 *   - `data-cursor="link"`: cooperates with CustomCursor's hover states so the
 *     ring swells consistently over magnetic CTAs.
 */
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

interface MagneticProps {
  children: React.ReactNode;
  /** Pull strength: fraction of the cursor offset applied (0..1). */
  strength?: number;
  /**
   * Opt-in engage distance in px from the element center. When provided the
   * magnet only pulls within this radius (and a 1px-wider release band avoids
   * flicker at the boundary). Omit for the legacy bbox-wide behaviour.
   */
  radius?: number;
  className?: string;
}

export function Magnetic({
  children,
  strength = 0.3,
  radius,
  className,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        window.matchMedia("(pointer: coarse)").matches
      ) {
        return;
      }

      const xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3.out" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });

      // Prime the REAL scale components so GSAP records them; we animate
      // scaleX/scaleY (never the `scale` shorthand, which is not a resettable
      // property and trips "scale not eligible for reset" on overwrite).
      gsap.set(el, { scaleX: 1, scaleY: 1 });

      let engaged = false;
      const engage = () => {
        if (engaged) return;
        engaged = true;
        // Soft elastic pop on lock-on (uniform 1.03 via both axes).
        gsap.to(el, { scaleX: 1.03, scaleY: 1.03, duration: 0.45, ease: "back.out(2.2)" });
      };
      const release = () => {
        if (!engaged) return;
        engaged = false;
        xTo(0);
        yTo(0);
        gsap.to(el, { scaleX: 1, scaleY: 1, duration: 0.5, ease: "power3.out" });
      };

      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;

        if (radius != null) {
          // Hysteresis: engage within `radius`, release past `radius + 8`.
          const dist = Math.hypot(dx, dy);
          if (dist > radius + 8) {
            release();
            return;
          }
          if (dist > radius) {
            // In the release band but already engaged → keep following, no new
            // engage; if not engaged, ignore (still outside).
            if (!engaged) return;
          } else {
            engage();
          }
        } else {
          engage();
        }

        xTo(dx * strength);
        yTo(dy * strength);
      };
      const onLeave = () => {
        release();
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: ref, dependencies: [strength, radius] },
  );

  return (
    <div
      ref={ref}
      data-cursor="link"
      className={cn("inline-block will-change-transform", className)}
    >
      {children}
    </div>
  );
}
