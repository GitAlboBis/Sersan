"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import {
  consumeFlip,
  clearFlip,
  setZoomListener,
  type FlipSnapshot,
} from "@/lib/flip-handoff-store";

if (typeof window !== "undefined") gsap.registerPlugin(Flip);

/**
 * FlipHandoffOverlay — a persistent (root-layout-mounted, never-unmounting)
 * client component owning the zoom-to-fullscreen card→detail transition
 * (template-7 "webgl-carousel" flagship move, kept as a DOM implementation).
 *
 * ZOOM FLIGHT (primary path): arming a card click (use-flip-source →
 * flip-handoff-store) synchronously notifies the listener registered here.
 * The overlay builds a fixed clone of the card face — a full-viewport shell
 * whose clip-path inset matches the card rect (round = the card radius), a
 * navy fill fading in, and (preview cards) a cover-fit image box glued to the
 * rect — and inflates it to cover the viewport in ~0.75s expo.inOut with a
 * small scale pulse on the image that dies exactly at completion (the demo's
 * cos-gated "liquid" ripple, one property, no shader). Opening the CLIP
 * instead of scaling means the cover-fit image continuously re-crops rather
 * than stretching — the DOM analog of the demo's animated-uRes CoverUV. A
 * navy #0B1422 backdrop fades in beneath. The <Link> navigation proceeds
 * natively under the clone (template.tsx suppresses its curtain via
 * consumeCurtainSuppression — the inflating card IS the curtain), then:
 *   - image cards: the shell carves back down onto the detail hero
 *     ([data-flip-hero][data-flip-id]) and the image box lands on its rect;
 *   - no-image cards: the covering panel cross-fades out over the header.
 *
 * LEGACY FLIGHT (fallback): if a fresh snapshot arrives at a detail route
 * with no active zoom flight (listener not yet registered), the original
 * Flip.fit "flying image" plays from the card rect onto the hero.
 *
 * It does NOT intercept navigation (the <Link> already navigated); it only
 * animates aria-hidden, pointer-events-none clones ABOVE the route curtain
 * (shell z-70 > backdrop z-68 > curtain z-60 > navbar z-50).
 *
 * Robustness contract: the real hero is NEVER left stuck-hidden — it is
 * revealed on landing AND on poll timeout AND on the hard flight timeout
 * (~2.5s from arm, covers a stalled route); clones are always removed on
 * completion / stale navigation / unmount. Reduced-motion, coarse pointers
 * and modified clicks never arm (use-flip-source guards) → plain navigation
 * exactly as before.
 */

const NAVY = "#0B1422";
const Z_BACKDROP = "68"; // above curtain (60), below the clone shell
const Z_SHELL = "70"; // the layer the legacy Flip clone always used
const INFLATE_S = 0.75; // card rect → full viewport
const LAND_S = 0.6; // full viewport → detail hero rect
const FADE_S = 0.45; // no-image cross-fade out
const HARD_TIMEOUT_MS = 2500; // absolute self-clean ceiling from arm time
const MAX_HERO_FRAMES = 50; // ~0.8s to find a laid-out hero

interface ZoomFlight {
  slug: string;
  backdrop: HTMLDivElement;
  shell: HTMLDivElement;
  fill: HTMLDivElement;
  img: HTMLImageElement | null;
  inflated: boolean;
  arrived: boolean;
  settling: boolean;
  disposed: boolean;
  raf: number;
  frames: number;
  timeout: number;
}

type FlightRef = { current: ZoomFlight | null };

/** First px number out of a computed border-radius shorthand ("8px", …). */
const parseRadiusPx = (radius?: string): number => {
  const m = radius?.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 8;
};

const revealHero = (hero: HTMLElement) =>
  gsap.set(hero, { autoAlpha: 1, clearProps: "opacity,visibility" });

const findHero = (slug: string) =>
  document.querySelector<HTMLElement>(
    `[data-flip-hero][data-flip-id="${slug}"]`,
  );

function disposeFlight(ref: FlightRef, flight: ZoomFlight, fadeS = 0) {
  if (flight.disposed) return;
  flight.disposed = true;
  if (flight.raf) cancelAnimationFrame(flight.raf);
  window.clearTimeout(flight.timeout);
  const nodes: Element[] = [flight.backdrop, flight.shell, flight.fill];
  if (flight.img) nodes.push(flight.img);
  gsap.killTweensOf(nodes);
  const remove = () => {
    flight.backdrop.remove();
    flight.shell.remove(); // fill + img are children
  };
  if (fadeS > 0) {
    gsap.to([flight.backdrop, flight.shell], {
      opacity: 0,
      duration: fadeS,
      ease: "power2.out",
      onComplete: remove,
    });
  } else {
    remove();
  }
  if (ref.current === flight) ref.current = null;
}

/** Hard-timeout path: whatever state the flight is in, uncover the page. */
function failSafe(ref: FlightRef, flight: ZoomFlight) {
  if (flight.disposed) return;
  const hero = findHero(flight.slug);
  if (hero) revealHero(hero);
  clearFlip();
  disposeFlight(ref, flight, 0.2);
}

/** Dissolve the covering panel over whatever page is beneath it. */
function dissolve(ref: FlightRef, flight: ZoomFlight, delayS = 0) {
  gsap.to([flight.shell, flight.backdrop], {
    opacity: 0,
    duration: FADE_S,
    ease: "power2.inOut",
    delay: delayS,
    onComplete: () => disposeFlight(ref, flight, 0),
  });
}

/** Poll for the detail hero (route just mounted), then land the clone on it:
 *  the shell clip carves from fullscreen down to the hero rect while the
 *  image box rides the identical interpolation (the two rects match at every
 *  step — same ease, same duration, linear corner functions), the backdrop
 *  fades off, and the real hero is revealed under identical pixels. */
function landOnHero(ref: FlightRef, flight: ZoomFlight) {
  const tick = () => {
    if (flight.disposed) return;
    const hero = findHero(flight.slug);
    const hr = hero?.getBoundingClientRect();
    if (hero && hr && hr.width > 2 && hr.height > 2) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rad = parseRadiusPx(getComputedStyle(hero).borderRadius);
      gsap.to(flight.shell, {
        clipPath: `inset(${hr.top}px ${vw - hr.right}px ${vh - hr.bottom}px ${hr.left}px round ${rad}px)`,
        duration: LAND_S,
        ease: "power3.inOut",
      });
      // The image box exactly covers the shrinking clip region, so the navy
      // fill can fade off during the carve (belt + braces for px rounding).
      gsap.to(flight.fill, {
        opacity: 0,
        duration: LAND_S * 0.6,
        ease: "power1.out",
      });
      gsap.to(flight.backdrop, {
        opacity: 0,
        duration: LAND_S,
        ease: "power2.inOut",
      });
      gsap.to(flight.img!, {
        left: hr.left,
        top: hr.top,
        width: hr.width,
        height: hr.height,
        duration: LAND_S,
        ease: "power3.inOut",
        onComplete: () => {
          revealHero(hero);
          disposeFlight(ref, flight, 0);
        },
      });
      return;
    }
    if (++flight.frames > MAX_HERO_FRAMES) {
      if (hero) revealHero(hero);
      dissolve(ref, flight);
      return;
    }
    flight.raf = requestAnimationFrame(tick);
  };
  flight.raf = requestAnimationFrame(tick);
}

/** Settle once BOTH the inflate finished and the detail route arrived. */
function maybeSettle(ref: FlightRef, flight: ZoomFlight) {
  if (flight.disposed || flight.settling) return;
  if (!(flight.inflated && flight.arrived)) return;
  flight.settling = true;
  if (flight.img) landOnHero(ref, flight);
  // Small delay so the new page has a painted frame beneath before the
  // panel dissolves (its content fade-up runs in parallel under us).
  else dissolve(ref, flight, 0.06);
}

/** Build the clone + start the inflate. Runs synchronously inside the card's
 *  click handler, BEFORE Next.js processes the <Link> navigation. */
function startFlight(ref: FlightRef, snap: FlipSnapshot) {
  const prev = ref.current;
  if (prev) disposeFlight(ref, prev, 0); // one flight at a time

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const { rect } = snap;
  const rad = parseRadiusPx(snap.radius);
  // Insets clamped to ≥0: a rail card partially off-screen would yield a
  // negative inset, which some engines drop as invalid — and a clip edge at
  // the viewport boundary is visually identical anyway. The image box below
  // still uses the TRUE rect, so the visible crop stays glued to the card.
  const iT = Math.max(0, rect.top);
  const iR = Math.max(0, vw - (rect.left + rect.width));
  const iB = Math.max(0, vh - (rect.top + rect.height));
  const iL = Math.max(0, rect.left);

  const backdrop = document.createElement("div");
  backdrop.setAttribute("aria-hidden", "true");
  Object.assign(backdrop.style, {
    position: "fixed",
    inset: "0",
    zIndex: Z_BACKDROP,
    background: NAVY,
    opacity: "0",
    pointerEvents: "none",
  });

  // The shell is full-viewport from frame 0; ONLY its clip-path animates.
  // It starts transparent (the real card shows through the clip window), so
  // there is no swap-pop at click time; the navy fill fades in as it opens.
  const shell = document.createElement("div");
  shell.setAttribute("aria-hidden", "true");
  Object.assign(shell.style, {
    position: "fixed",
    inset: "0",
    zIndex: Z_SHELL,
    pointerEvents: "none",
    overflow: "hidden",
    clipPath: `inset(${iT}px ${iR}px ${iB}px ${iL}px round ${rad}px)`,
    willChange: "clip-path",
  });

  const fill = document.createElement("div");
  fill.setAttribute("aria-hidden", "true");
  Object.assign(fill.style, {
    position: "absolute",
    inset: "0",
    background: NAVY,
    opacity: "0",
  });
  shell.appendChild(fill);

  let img: HTMLImageElement | null = null;
  if (snap.src) {
    img = document.createElement("img");
    img.src = snap.src;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.draggable = false;
    Object.assign(img.style, {
      position: "absolute",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      maxWidth: "none",
      objectFit: "cover",
      margin: "0",
      opacity: "0",
      willChange: "transform",
    });
    shell.appendChild(img);
  }

  document.body.appendChild(backdrop);
  document.body.appendChild(shell);

  const flight: ZoomFlight = {
    slug: snap.slug,
    backdrop,
    shell,
    fill,
    img,
    inflated: false,
    arrived: false,
    settling: false,
    disposed: false,
    raf: 0,
    frames: 0,
    timeout: window.setTimeout(() => failSafe(ref, flight), HARD_TIMEOUT_MS),
  };
  ref.current = flight;

  // INFLATE — clip-path inset opens from the card rect to the viewport.
  gsap.to(backdrop, {
    opacity: 1,
    duration: INFLATE_S * 0.8,
    ease: "power2.out",
  });
  gsap.to(fill, {
    opacity: 1,
    duration: INFLATE_S * 0.7,
    ease: "power1.inOut",
  });
  gsap.to(shell, {
    clipPath: "inset(0px 0px 0px 0px round 0px)",
    duration: INFLATE_S,
    ease: "expo.inOut",
    onComplete: () => {
      flight.inflated = true;
      maybeSettle(ref, flight);
    },
  });
  if (img) {
    // Quick fade-in softens the (small) crop difference vs the card's own
    // 112%-bleed media layer; the box tween re-crops the cover fit live.
    gsap.to(img, { opacity: 1, duration: 0.2, ease: "power1.out" });
    gsap.to(img, {
      left: 0,
      top: 0,
      width: vw,
      height: vh,
      duration: INFLATE_S,
      ease: "expo.inOut",
    });
    // The "liquid" pulse: a scale swell that returns to exactly 1 at the
    // moment the inflate completes (the demo's cos-gated ripple amplitude).
    gsap.to(img, {
      keyframes: [
        { scale: 1.045, duration: INFLATE_S / 2, ease: "sine.in" },
        { scale: 1, duration: INFLATE_S / 2, ease: "sine.out" },
      ],
    });
  }
}

export function FlipHandoffOverlay() {
  const pathname = usePathname();
  const flightRef = useRef<ZoomFlight | null>(null);

  // Register the zoom-arm listener once (this component never unmounts in
  // practice — root layout). armFlip() invokes it synchronously from the
  // card's click handler, so the clone starts inflating immediately and the
  // route swap happens beneath it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setZoomListener((snap) => startFlight(flightRef, snap));
    return () => {
      setZoomListener(null);
      const f = flightRef.current;
      if (f) disposeFlight(flightRef, f, 0);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = pathname?.match(/^\/case-studies\/([^/]+)\/?$/);

    // ---- Zoom path: an active flight owns this navigation.
    const flight = flightRef.current;
    if (flight && !flight.disposed) {
      if (m && m[1] === flight.slug) {
        // Landed where the click pointed. Consume the snapshot (the detail
        // hero already PEEKED it in its layout effect and is hiding) and
        // settle as soon as the inflate completes.
        consumeFlip(flight.slug);
        flight.arrived = true;
        maybeSettle(flightRef, flight);
      } else {
        // Navigated somewhere unexpected mid-flight (fast back/forward,
        // redirect) — the clone is stale; get off the screen quickly.
        disposeFlight(flightRef, flight, 0.25);
      }
      return;
    }

    // ---- Legacy fallback: fresh snapshot, no zoom flight (listener wasn't
    // registered at click time). Original arrival-time Flip.fit flight.
    if (!m) return;
    const slug = m[1];
    const snap = consumeFlip(slug);
    if (!snap || !snap.src) return;
    const src = snap.src;

    let raf = 0;
    let frames = 0;
    let killed = false;
    let clone: HTMLImageElement | null = null;

    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      if (clone?.parentNode) clone.parentNode.removeChild(clone);
      clone = null;
    };

    const tick = () => {
      if (killed) return;
      const hero = findHero(slug);
      const rect = hero?.getBoundingClientRect();
      if (hero && rect && rect.width > 2 && rect.height > 2) {
        clone = document.createElement("img");
        clone.src = src;
        clone.alt = "";
        clone.setAttribute("aria-hidden", "true");
        Object.assign(clone.style, {
          position: "fixed",
          left: `${snap.rect.left}px`,
          top: `${snap.rect.top}px`,
          width: `${snap.rect.width}px`,
          height: `${snap.rect.height}px`,
          objectFit: "cover",
          zIndex: Z_SHELL,
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
            revealHero(hero);
            cleanup();
          },
        });
        return;
      }
      if (++frames > MAX_HERO_FRAMES) {
        if (hero) revealHero(hero);
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
