"use client";

/**
 * CardTiltController — site-wide card physicality (award sprint, Phase A).
 *
 * One pointer-delegation controller mounted in the root layout gives EVERY
 * `.card-steel` a 3D tilt toward the cursor, a micro-lift, and a radial
 * sheen that tracks the pointer (via --sheen-x/--sheen-y consumed by the
 * `.card-steel::after` overlay in globals.css). Cards are initialized
 * lazily on first hover — no querySelectorAll sweep, new cards from route
 * changes just work.
 *
 * Fine pointers only; inert under prefers-reduced-motion and on touch.
 */
import { useEffect } from "react";
import gsap from "gsap";

const MAX_TILT = 5; // degrees
const LIFT_SCALE = 1.014;

interface TiltState {
  rx: (v: number) => void;
  ry: (v: number) => void;
  scale: (v: number) => void;
}

export function CardTiltController() {
  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    ) {
      return;
    }

    const states = new WeakMap<HTMLElement, TiltState>();

    const init = (card: HTMLElement): TiltState => {
      let state = states.get(card);
      if (state) return state;
      gsap.set(card, { transformPerspective: 750 });
      state = {
        rx: gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" }),
        ry: gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" }),
        scale: gsap.quickTo(card, "scale", { duration: 0.4, ease: "power3.out" }),
      };
      states.set(card, state);
      return state;
    };

    const onMove = (e: PointerEvent) => {
      const card = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        ".card-steel",
      );
      if (!card) return;
      const s = init(card);
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width; // 0..1
      const py = (e.clientY - r.top) / r.height;
      s.rx(-(py - 0.5) * 2 * MAX_TILT);
      s.ry((px - 0.5) * 2 * MAX_TILT);
      s.scale(LIFT_SCALE);
      card.style.setProperty("--sheen-x", `${px * 100}%`);
      card.style.setProperty("--sheen-y", `${py * 100}%`);
      card.style.setProperty("--sheen-o", "1");
    };

    const onOut = (e: PointerEvent) => {
      const card = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        ".card-steel",
      );
      if (!card) return;
      // Still inside the card? (pointerout fires on child boundaries too.)
      if (card.contains(e.relatedTarget as Node | null)) return;
      const s = states.get(card);
      if (!s) return;
      s.rx(0);
      s.ry(0);
      s.scale(1);
      card.style.setProperty("--sheen-o", "0");
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);

  return null;
}
