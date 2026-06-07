"use client";

/**
 * CustomCursor — dot + lagging ring (award sprint, Phase D; AGENTS.md §3c).
 *
 * The dot snaps to the pointer, the ring chases it with a soft lag
 * (gsap.quickTo); over interactive elements (a, button, [role=button],
 * .card-steel, the hero drag layer) the ring swells and brightens. The
 * native cursor stays VISIBLE — the ring is an accent, not a replacement,
 * so usability never regresses (form fields, text selection untouched).
 *
 * Desktop fine pointers only; never mounts under prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const INTERACTIVE = "a, button, [role='button'], .card-steel, .cursor-grab";

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    ) {
      return;
    }
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, opacity: 0 });

    const dotX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power2.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power2.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });

    let shown = false;
    const onMove = (e: PointerEvent) => {
      if (!shown) {
        shown = true;
        gsap.to([dot, ring], { opacity: 1, duration: 0.3 });
      }
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    };
    const onOver = (e: PointerEvent) => {
      const hit = (e.target as HTMLElement | null)?.closest(INTERACTIVE);
      gsap.to(ring, {
        scale: hit ? 1.8 : 1,
        opacity: shown ? 1 : 0,
        borderColor: hit ? "hsl(189 100% 62% / 0.9)" : "hsl(189 100% 62% / 0.45)",
        duration: 0.35,
        ease: "power3.out",
      });
    };
    const onLeave = () => {
      shown = false;
      gsap.to([dot, ring], { opacity: 0, duration: 0.25 });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90]">
      <div
        ref={dotRef}
        className="absolute h-1.5 w-1.5 rounded-full"
        style={{ background: "hsl(var(--accent))" }}
      />
      <div
        ref={ringRef}
        className="absolute h-8 w-8 rounded-full border"
        style={{ borderColor: "hsl(189 100% 62% / 0.45)" }}
      />
    </div>
  );
}
