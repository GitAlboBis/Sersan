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
 *   - elastic release: letting go springs the shell home on ONE machined
 *     elastic.out(1.05, 0.45) — a single ~5% overshoot with fast decay; spring
 *     tension, not toy bounce (craft floor).
 *   - two-layer feel: an optional `[data-magnetic-label]` descendant (give it
 *     `inline-block will-change-transform`; must NOT carry a CSS transform
 *     transition, which would smear the per-frame writes) counter-translates
 *     35% of the shell offset, lagging like an inner mass. No hook child →
 *     single-layer behaviour unchanged.
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

      // Two-layer hook, queried once: React keeps the span's identity across
      // language swaps (only its text node changes), and dropdown-hosted
      // magnets remount with their panel anyway.
      const label = el.querySelector<HTMLElement>("[data-magnetic-label]");

      // Chase tweens are REBUILT after every release: the elastic settle owns
      // x/y once the magnet lets go, and a killed quickTo can't be revived by
      // resetTo — so release kills the pair and mints fresh ones (one paused
      // tween per axis, pointer-leave cadence: cheap).
      const makeChase = (target: HTMLElement, prop: "x" | "y") =>
        gsap.quickTo(target, prop, { duration: 0.45, ease: "power3.out" });
      let xTo = makeChase(el, "x");
      let yTo = makeChase(el, "y");
      let lxTo = label ? makeChase(label, "x") : null;
      let lyTo = label ? makeChase(label, "y") : null;

      // Prime the REAL scale components so GSAP records them; we animate
      // scaleX/scaleY (never the `scale` shorthand, which is not a resettable
      // property and trips "scale not eligible for reset" on overwrite).
      gsap.set(el, { scaleX: 1, scaleY: 1 });

      let engaged = false;
      let settle: gsap.core.Tween | null = null;
      let labelSettle: gsap.core.Tween | null = null;
      const engage = () => {
        if (engaged) return;
        engaged = true;
        // A still-running release settle would fight the chase for x/y/scale.
        settle?.kill();
        settle = null;
        labelSettle?.kill();
        labelSettle = null;
        // Soft elastic pop on lock-on (uniform 1.03 via both axes).
        gsap.to(el, { scaleX: 1.03, scaleY: 1.03, duration: 0.45, ease: "back.out(2.2)" });
      };
      const release = () => {
        if (!engaged) return;
        engaged = false;
        // Machined spring-home: amplitude 1.05 / period 0.45 ≈ one ~5%
        // overshoot, fast decay. The settle owns x/y/scale from here — the
        // engage pop may still be mid-flight, so its scale channels die too.
        xTo.tween.kill();
        yTo.tween.kill();
        xTo = makeChase(el, "x");
        yTo = makeChase(el, "y");
        gsap.killTweensOf(el, "scaleX,scaleY");
        settle = gsap.to(el, {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 0.6,
          ease: "elastic.out(1.05, 0.45)",
        });
        if (label && lxTo && lyTo) {
          lxTo.tween.kill();
          lyTo.tween.kill();
          lxTo = makeChase(label, "x");
          lyTo = makeChase(label, "y");
          labelSettle = gsap.to(label, {
            x: 0,
            y: 0,
            duration: 0.6,
            ease: "elastic.out(1.05, 0.45)",
          });
        }
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
        // Inner mass: the label counter-translates 35% of the shell offset —
        // shell and label part ways slightly, a two-layer physical feel.
        if (lxTo && lyTo) {
          lxTo(dx * strength * -0.35);
          lyTo(dy * strength * -0.35);
        }
      };
      const onLeave = () => {
        release();
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
        // Handler-minted tweens live outside the useGSAP context — revert
        // can't reach them, so kill by hand (a StrictMode remount would
        // otherwise leave a stale settle fighting the next instance's chase).
        settle?.kill();
        labelSettle?.kill();
        xTo.tween.kill();
        yTo.tween.kill();
        lxTo?.tween.kill();
        lyTo?.tween.kill();
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
