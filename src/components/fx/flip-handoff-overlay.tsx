"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { consumeFlip, clearFlip } from "@/lib/flip-handoff-store";

if (typeof window !== "undefined") gsap.registerPlugin(Flip);

/**
 * FlipHandoffOverlay — a persistent (root-layout-mounted, never-unmounting)
 * client component that flies a fixed image clone from a clicked case-study
 * card onto the matching detail hero. Purely additive: it does NOT intercept
 * navigation (the <Link> already navigated), it only animates a clone that
 * lives ABOVE the route curtain (z-70 > curtain z-60 > navbar z-50).
 *
 * Robustness contract: the real hero is NEVER left stuck-hidden — the overlay
 * reveals it on Flip completion AND on a poll timeout, and the clone is always
 * removed on completion / route-change / unmount.
 */
export function FlipHandoffOverlay() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = pathname?.match(/^\/case-studies\/([^/]+)\/?$/);
    if (!m) return;
    const slug = m[1];
    const snap = consumeFlip(slug);
    if (!snap) return;

    let raf = 0;
    let frames = 0;
    let killed = false;
    let clone: HTMLImageElement | null = null;
    const MAX_FRAMES = 50; // ~0.8s to find a laid-out hero

    const reveal = (hero: HTMLElement) =>
      gsap.set(hero, { autoAlpha: 1, clearProps: "opacity,visibility" });

    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      if (clone?.parentNode) clone.parentNode.removeChild(clone);
      clone = null;
    };

    const tick = () => {
      if (killed) return;
      const hero = document.querySelector<HTMLElement>(
        `[data-flip-hero][data-flip-id="${slug}"]`,
      );
      const rect = hero?.getBoundingClientRect();
      if (hero && rect && rect.width > 2 && rect.height > 2) {
        clone = document.createElement("img");
        clone.src = snap.src;
        clone.alt = "";
        clone.setAttribute("aria-hidden", "true");
        Object.assign(clone.style, {
          position: "fixed",
          left: `${snap.rect.left}px`,
          top: `${snap.rect.top}px`,
          width: `${snap.rect.width}px`,
          height: `${snap.rect.height}px`,
          objectFit: "cover",
          zIndex: "70",
          pointerEvents: "none",
          margin: "0",
          borderRadius: getComputedStyle(hero).borderRadius || "0.75rem",
          willChange: "transform,width,height",
        });
        document.body.appendChild(clone);
        // Flip.fit (gsap 3.15) morphs the clone's box onto the hero's resting
        // rect. scale:false (the default — we omit it) animates width/height so
        // object-fit:cover recomputes for the square card → wide hero banner.
        // absolute:true makes the box position:absolute during the tween for a
        // crisp morph that doesn't disturb document flow.
        Flip.fit(clone, hero, {
          absolute: true,
          duration: 0.6,
          ease: "power3.inOut",
          onComplete: () => {
            reveal(hero);
            cleanup();
          },
        });
        return;
      }
      if (++frames > MAX_FRAMES) {
        if (hero) reveal(hero);
        cleanup();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      killed = true;
      cleanup();
      clearFlip();
    };
  }, [pathname]);

  return null;
}
