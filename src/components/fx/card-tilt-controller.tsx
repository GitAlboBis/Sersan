"use client";

/**
 * CardTiltController — site-wide card physicality (award sprint, Phase A).
 *
 * One pointer-delegation controller mounted in the root layout gives EVERY
 * `.card-steel` a premium, pointer-reactive hover treatment without any
 * imagery (the cards are DOM text cards):
 *
 *   - 3D tilt toward the cursor (gentle rotateX/rotateY, perspective).
 *   - A micro-lift on engage, soft spring return on leave.
 *   - A radial "signal sheen" that tracks the pointer across the surface
 *     (via --sheen-x/--sheen-y consumed by `.card-steel::after`).
 *   - A proximity-driven edge glow: the closer the pointer is to the card
 *     centre, the stronger the accent border glow (via --glow, consumed by
 *     `.card-steel::before` in globals.css). Reads as light catching an
 *     engineered surface, not a flipping toy.
 *
 * Cards are initialized lazily on first hover — no querySelectorAll sweep, so
 * new cards from route changes just work.
 *
 * GSAP transform priming: rotationX / rotationY / scaleX / scaleY are ALL set
 * once in the initial gsap.set (alongside transformPerspective), so GSAP records
 * the full transform matrix up front. Priming the complete transform avoids the
 * "<prop> not eligible for reset" warning that fires when quickTo touches a
 * transform component GSAP never recorded at init.
 *
 * IMPORTANT: we drive the REAL transform components scaleX / scaleY, never the
 * `scale` SHORTHAND. `scale` is a CSSPlugin alias for scaleX+scaleY; when a
 * quickTo/set touches the shorthand and GSAP later resets/overwrites it, the
 * CSSPlugin emits "scale not eligible for reset" (it machine-guns on
 * pointermove). Using scaleX/scaleY — the resettable properties — eliminates it.
 * A uniform lift drives both axes to the same value, so the visual is identical.
 *
 * Fine pointers only; inert under prefers-reduced-motion and on touch — there
 * the cards fall back to the static CSS :hover state (border + arrow) only.
 */
import { useEffect } from "react";
import gsap from "gsap";

const MAX_TILT = 5; // degrees
const LIFT_SCALE = 1.014;

interface TiltState {
  rx: (v: number) => void;
  ry: (v: number) => void;
  /** Drives the REAL transform components scaleX + scaleY (never the `scale`
   * shorthand) to the same value for a uniform lift. */
  scale: (v: number) => void;
  glow: (v: number) => void;
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
      // Prime the WHOLE transform (perspective + every animated component) in one
      // set so GSAP records the full matrix and none of rotationX / rotationY /
      // scaleX / scaleY is "not eligible for reset" when quickTo runs. We prime
      // the REAL scaleX/scaleY props — NOT the `scale` shorthand, which is not a
      // resettable property and triggers the warning on overwrite.
      gsap.set(card, {
        transformPerspective: 750,
        rotationX: 0,
        rotationY: 0,
        scaleX: 1,
        scaleY: 1,
      });
      // The proximity glow lives in a CSS var, not a transform, so it tweens on
      // its own quickTo without touching the transform matrix.
      gsap.set(card, { "--glow": 0 });
      // Drive scaleX and scaleY with two quickTo setters; calling both with the
      // same value reproduces a uniform `scale` lift without using the shorthand.
      const sx = gsap.quickTo(card, "scaleX", { duration: 0.4, ease: "power3.out" });
      const sy = gsap.quickTo(card, "scaleY", { duration: 0.4, ease: "power3.out" });
      state = {
        rx: gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" }),
        ry: gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" }),
        scale: (v: number) => {
          sx(v);
          sy(v);
        },
        glow: gsap.quickTo(card, "--glow", { duration: 0.4, ease: "power2.out" }),
      };
      states.set(card, state);
      return state;
    };

    const onMove = (e: PointerEvent) => {
      const card = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        ".card-steel",
      );
      // Cards that opt out of the tilt/lift transform (e.g. the home rail's
      // distort cards, whose box must stay fixed so the DOM-synced RailPlanes
      // keep registration) still use .card-steel for the CardImageDistort
      // hover-reveal — but must never be transformed here.
      if (!card || card.hasAttribute("data-no-tilt")) return;
      const s = init(card);
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width; // 0..1
      const py = (e.clientY - r.top) / r.height;
      s.rx(-(py - 0.5) * 2 * MAX_TILT);
      s.ry((px - 0.5) * 2 * MAX_TILT);
      s.scale(LIFT_SCALE);
      // Proximity to centre → 1 at centre, ~0 at the corners. Drives the edge
      // glow so it intensifies as the pointer nears the middle of the card.
      const cx = (px - 0.5) * 2; // -1..1
      const cy = (py - 0.5) * 2;
      const prox = Math.max(0, 1 - Math.min(1, Math.hypot(cx, cy)));
      s.glow(prox);
      card.style.setProperty("--sheen-x", `${px * 100}%`);
      card.style.setProperty("--sheen-y", `${py * 100}%`);
      card.style.setProperty("--sheen-o", "1");
    };

    const onOut = (e: PointerEvent) => {
      const card = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        ".card-steel",
      );
      if (!card || card.hasAttribute("data-no-tilt")) return;
      // Still inside the card? (pointerout fires on child boundaries too.)
      if (card.contains(e.relatedTarget as Node | null)) return;
      const s = states.get(card);
      if (!s) return;
      s.rx(0);
      s.ry(0);
      s.scale(1);
      s.glow(0);
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
