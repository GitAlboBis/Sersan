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
 * VISIBLE media rect (snap.mediaRect: the rail's 112%-bleed, parallax-shifted
 * layer — so the crop is pixel-identical to what the eye is on at click time)
 * — and inflates it to cover the viewport in ~0.75s expo.inOut with a
 * "liquid ripple" on the image that dies exactly at completion: a directional
 * scale that OPENS at the shader's live hover zoom (snap.mediaZoom, so the 6%
 * hover zoom settles inside the swell instead of popping) + a mid-peak
 * blur/brightness bump + a faint cyan bloom, all returning to identity at
 * INFLATE_S (the demo's cos-gated ripple #6, DOM, no shader; gated off under
 * reduced motion). Opening the CLIP
 * instead of scaling means the cover-fit image continuously re-crops rather
 * than stretching — the DOM analog of the demo's animated-uRes CoverUV. A
 * navy #0B1422 backdrop fades in beneath. The <Link> navigation proceeds
 * natively under the clone (template.tsx suppresses its curtain via
 * consumeCurtainSuppression — the inflating card IS the curtain), then:
 *   - image cards: the shell carves back down onto the detail hero
 *     ([data-flip-hero][data-flip-id]) and the image box lands on its rect;
 *   - no-image cards: the covering panel cross-fades out over the header.
 *
 * RETURN FLIGHT (direction:"return"): the detail page's explicit back-link
 * (use-flip-source's useReturnFlipSource — never popstate) arms a snapshot of
 * the HERO rect instead. The overlay builds the same shell clipped to the
 * hero, showing a pixel-identical clone (same src, same box, same seating
 * scrim) while the navy backdrop rises — the shell IS this navigation's
 * curtain too (the back-link carries [data-no-curtain] so the generic route
 * cover skips it, and the arm suppresses template.tsx's wipe). Once the
 * destination route commits, the overlay polls for the matching
 * [data-flip-source] card, waits for its rect to SETTLE (route fade-up +
 * Reveal entrances move rects for the first ~0.5s), then deflates the shell
 * down onto it and fades the chrome out over the real card. Off-screen /
 * never-found cards get a graceful centre-screen dissolve instead — the poll
 * never waits forever (frame budget + a ~1.5s hard timeout from arm).
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

// ---- Return-flight tuning. The reverse journey has no inflate phase, so its
// budgets are tighter: the shell must resolve (deflate or dissolve) fast
// enough that a covered page can never linger.
const RETURN_TIMEOUT_MS = 1500; // hard self-clean ceiling from the back-click
const MAX_CARD_FRAMES = 55; // ~0.9s to find a SETTLED, on-screen card
const RETURN_FADE_S = 0.4; // graceful dissolve when the card isn't on-screen
const CHROME_FADE_S = 0.25; // landed shell fades off, revealing the real card

interface ZoomFlight {
  slug: string;
  /** "forward" = card→detail zoom (inflate → land on hero). "return" = the
   *  detail back-link deflate (hero-clipped shell → land on the card). */
  direction: "forward" | "return";
  /** Return flights only: the arrival pathname the arming back-link points
   *  at — any other route change mid-flight is stale. */
  returnPath?: string;
  backdrop: HTMLDivElement;
  shell: HTMLDivElement;
  fill: HTMLDivElement;
  /** Return flights: ONE tweened box carrying the clone media (img + the
   *  hero's seating scrim) so both ride the identical interpolation. Forward
   *  flights animate the bare img and keep this null. */
  media: HTMLDivElement | null;
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
  if (flight.media) nodes.push(flight.media);
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

/** Hard-timeout path: whatever state the flight is in, uncover the page.
 *  Forward flights re-reveal the (possibly still hidden) detail hero; return
 *  flights hide nothing — findHero then matches either the real hero still
 *  under the shell (never-navigated back-click; the reveal is a no-op on a
 *  visible element) or nothing at all on the list page. */
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
  // The clone's <img> box seeds from the card's VISIBLE media layer (the
  // rail's 112%-bleed [data-rail-media] rect, live parallax shift included)
  // so the cover-crop is byte-identical to what the eye is on at frame 0;
  // cards without the layer fall back to the card rect, where the media box
  // IS the card box anyway. The clip window (card rect) always sits inside
  // this box — the bleed guarantees it — so no page ever peeks through.
  const mediaBox = snap.mediaRect ?? rect;
  if (snap.src) {
    img = document.createElement("img");
    img.src = snap.src;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.draggable = false;
    Object.assign(img.style, {
      position: "absolute",
      left: `${mediaBox.left}px`,
      top: `${mediaBox.top}px`,
      width: `${mediaBox.width}px`,
      height: `${mediaBox.height}px`,
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
    direction: "forward",
    backdrop,
    shell,
    fill,
    media: null,
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
    // A short hold before the navy rises: the card face beneath the (still
    // transparent) shell — text, scrim, STACK pills — dies UNDER navy rising
    // mid-flight instead of being cut off on the click frame.
    delay: 0.12,
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
    // The crossfade retires the live hover chrome — the RGB-shift render,
    // the readability scrim, the STACK pills — over the flight's first beat
    // instead of hard-cutting it: the clone's crop + zoom already match the
    // eye (mediaRect/mediaZoom above), so the only visible change during the
    // fade is that chrome dissolving while the frame starts to move.
    gsap.to(img, { opacity: 1, duration: 0.3, ease: "power1.out" });
    gsap.to(img, {
      left: 0,
      top: 0,
      width: vw,
      height: vh,
      duration: INFLATE_S,
      ease: "expo.inOut",
    });
  }

  // LIQUID RIPPLE (progressive enhancement) — the demo's cos-gated zoom+ripple
  // (#6), DOM-approximated without a shader. Enriches the mid-inflate so it
  // reads like matter deforming: (a) a DIRECTIONAL scale (scaleX>scaleY, the
  // frame stretches wider as it opens toward the landscape viewport) that eases
  // back to exactly 1; (b) a blur+brightness bump that PEAKS at the inflate
  // midpoint and returns to blur(0)/brightness(1) at completion; (c) a faint
  // cyan→blue accent bloom expanding from the card centre that fades fully out.
  // Every animated property lands on its identity value at INFLATE_S — aligned
  // with the cos-gated scale return — so the fullscreen frame (and the
  // subsequent landOnHero carve) is byte-identical to the plain inflate.
  // Gated OFF under prefers-reduced-motion (no ripple, static enlargement).
  const reduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // (c) accent bloom — brand cyan #3BE1FF → deep-blue #2A7FFF, low alpha,
    // screen-blended so it only adds light. Child of the shell (clipped by the
    // opening window, removed with the shell), topmost so it glows over the
    // image on image cards and over the navy fill on no-image cards.
    const accent = document.createElement("div");
    accent.setAttribute("aria-hidden", "true");
    Object.assign(accent.style, {
      position: "absolute",
      inset: "0",
      opacity: "0",
      mixBlendMode: "screen",
      background: `radial-gradient(circle at ${cx}px ${cy}px, rgba(59,225,255,0.22), rgba(42,127,255,0.10) 32%, rgba(42,127,255,0) 62%)`,
      transformOrigin: `${cx}px ${cy}px`,
      willChange: "transform,opacity",
    });
    shell.appendChild(accent);

    const tl = gsap.timeline({
      onComplete: () => {
        // Drop the enrichment props so the resting clone is exactly the plain
        // inflate's end state before landOnHero takes over.
        if (img) gsap.set(img, { clearProps: "filter" });
        accent.remove();
      },
    });

    if (img) {
      // (a) directional scale — asymmetric swell, eases back to exactly 1.
      // The START pose is the shader's live hover zoom (snap.mediaZoom ≈ 1.06
      // when the distortion canvas was rendering, 1 otherwise): the settle
      // from hover-zoom to identity is FOLDED into the swell keyframes, so
      // there is no zoom pop at click — the hover state becomes the ripple's
      // opening energy and drains out through the same midpoint.
      const zoom = snap.mediaZoom ?? 1;
      gsap.set(img, { scaleX: zoom, scaleY: zoom });
      tl.to(
        img,
        {
          keyframes: [
            {
              scaleX: 1.055,
              scaleY: 1.028,
              duration: INFLATE_S / 2,
              ease: "sine.in",
            },
            { scaleX: 1, scaleY: 1, duration: INFLATE_S / 2, ease: "sine.out" },
          ],
        },
        0,
      );
      // (b) blur + brightness bump — peaks at the midpoint, back to identity.
      gsap.set(img, { filter: "blur(0px) brightness(1)" });
      tl.to(
        img,
        {
          keyframes: [
            {
              filter: "blur(5px) brightness(1.1)",
              duration: INFLATE_S / 2,
              ease: "sine.inOut",
            },
            {
              filter: "blur(0px) brightness(1)",
              duration: INFLATE_S / 2,
              ease: "sine.inOut",
            },
          ],
        },
        0,
      );
    }

    // (c) accent expands from the card centre and fades fully out by INFLATE_S.
    tl.fromTo(
      accent,
      { scale: 0.4 },
      {
        scale: 1.5,
        transformOrigin: `${cx}px ${cy}px`,
        duration: INFLATE_S,
        ease: "expo.out",
      },
      0,
    );
    tl.to(
      accent,
      {
        keyframes: [
          { opacity: 0.85, duration: INFLATE_S * 0.42, ease: "sine.out" },
          { opacity: 0, duration: INFLATE_S * 0.58, ease: "sine.in" },
        ],
      },
      0,
    );
  }
}

/** Build the REVERSE clone + cover. Runs synchronously inside the detail
 *  back-link's click handler, BEFORE Next.js processes the <Link> navigation.
 *  The shell starts clipped to the DETAIL HERO rect showing a pixel-identical
 *  clone (same src, same box, same seating scrim as the figure beneath), then
 *  the navy backdrop rises to cover the route swap — the shell IS this
 *  navigation's curtain (the arming hook set [data-no-curtain] so the generic
 *  cover skips it, and armFlip suppressed template.tsx's wipe). The landing
 *  itself waits for the pathname effect (startReturnLanding). */
function startReturnFlight(ref: FlightRef, snap: FlipSnapshot) {
  const prev = ref.current;
  if (prev) disposeFlight(ref, prev, 0); // one flight at a time

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const { rect } = snap;
  const rad = parseRadiusPx(snap.radius);
  // Same ≥0 clamp as the forward inflate: a hero partially scrolled out of
  // view would yield negative insets, which some engines drop as invalid.
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

  // Full-viewport shell, clipped to the hero from frame 0. It starts
  // transparent (the REAL hero shows through the window — no swap pop), and
  // ONLY its clip-path animates during the deflate.
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

  // Belt + braces under the media box: any sub-pixel rounding gap between the
  // clip edge and the media box shows navy, never the page beneath.
  const fill = document.createElement("div");
  fill.setAttribute("aria-hidden", "true");
  Object.assign(fill.style, {
    position: "absolute",
    inset: "0",
    background: NAVY,
    opacity: "0",
  });
  shell.appendChild(fill);

  // ONE tweened media box (img + scrim ride it together) — the deflate then
  // animates a single element's rect and the children can never desync.
  const media = document.createElement("div");
  media.setAttribute("aria-hidden", "true");
  Object.assign(media.style, {
    position: "absolute",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    opacity: "0",
  });
  const img = document.createElement("img");
  img.src = snap.src ?? "";
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  img.draggable = false;
  Object.assign(img.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    maxWidth: "none",
    objectFit: "cover",
    margin: "0",
  });
  media.appendChild(img);
  // The detail hero's own bottom-up seating scrim (case-study-detail-client's
  // figure overlay, copied verbatim) so the clone's frame 0 is byte-identical
  // to the figure it covers.
  const scrim = document.createElement("div");
  scrim.setAttribute("aria-hidden", "true");
  Object.assign(scrim.style, {
    position: "absolute",
    inset: "0",
    background:
      "linear-gradient(180deg, transparent 40%, hsl(216 30% 6% / 0.55) 100%)",
  });
  media.appendChild(scrim);
  shell.appendChild(media);

  document.body.appendChild(backdrop);
  document.body.appendChild(shell);

  const flight: ZoomFlight = {
    slug: snap.slug,
    direction: "return",
    returnPath: snap.returnPath,
    backdrop,
    shell,
    fill,
    media,
    img,
    inflated: true, // no inflate phase — the shell never leaves the hero rect
    arrived: false,
    settling: false,
    disposed: false,
    raf: 0,
    frames: 0,
    timeout: window.setTimeout(() => failSafe(ref, flight), RETURN_TIMEOUT_MS),
  };
  ref.current = flight;

  // COVER — the clone fades in first carrying identical pixels (invisible by
  // construction: the real hero is directly beneath at the same rect), THEN
  // the backdrop rises so the route swap underneath is covered by the time it
  // commits. The stagger keeps the brief blend window (clone not yet opaque,
  // navy rising behind it) imperceptible.
  gsap.to(media, { opacity: 1, duration: 0.15, ease: "power1.out" });
  gsap.to(fill, { opacity: 1, duration: 0.2, delay: 0.05, ease: "power1.out" });
  gsap.to(backdrop, {
    opacity: 1,
    duration: 0.3,
    delay: 0.1,
    ease: "power2.out",
  });
}

/** Poll for the destination page's matching card ([data-flip-source=slug] —
 *  the attribute every rail AND archive-grid card already carries), wait for
 *  its rect to SETTLE (the route's content fade-up and the card's own Reveal
 *  entrance both move rects for the first ~0.5s — landing on a moving target
 *  would visibly miss), then either carve the shell down onto it (on-screen)
 *  or dissolve gracefully in place (off-screen / never found). Never waits
 *  forever: the frame budget and the flight's hard timeout both cap it. */
function startReturnLanding(ref: FlightRef, flight: ZoomFlight) {
  let prevRect: DOMRect | null = null;
  const tick = () => {
    if (flight.disposed) return;
    const card = document.querySelector<HTMLElement>(
      `[data-flip-source="${flight.slug}"]`,
    );
    const cr = card?.getBoundingClientRect();
    if (card && cr && cr.width > 2 && cr.height > 2) {
      // Settled = the rect held still across two CONSECUTIVE frames (the
      // 0.5px epsilon lets the expo-out tails of the entrance tweens pass —
      // their remaining sub-pixel drift is invisible under the carve).
      const stable =
        prevRect !== null &&
        Math.abs(cr.left - prevRect.left) < 0.5 &&
        Math.abs(cr.top - prevRect.top) < 0.5 &&
        Math.abs(cr.width - prevRect.width) < 0.5 &&
        Math.abs(cr.height - prevRect.height) < 0.5;
      prevRect = cr;
      if (stable) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const ccx = cr.left + cr.width / 2;
        const ccy = cr.top + cr.height / 2;
        // On-screen = the card's centre is inside the viewport. A push
        // navigation lands at the top of the destination page, so a
        // below-the-fold card is a REAL case (not just failed restoration) —
        // dissolve rather than fly somewhere the user can't see.
        if (ccx > 0 && ccx < vw && ccy > 0 && ccy < vh) {
          // The terminal tween takes over from here and GSAP guarantees its
          // onComplete — retire the hard timeout so it can never cut the
          // carve mid-flight (its job was the WAITING phases only).
          window.clearTimeout(flight.timeout);
          // An off-center rail landing card carries the center-focus DoF
          // filter while the deflating clone is crisp — fade it out under
          // the shell (the inner's filter-only transition makes this a
          // 240ms dissolve, not a pop). The rail's writer re-owns the
          // filter on the next step crossing, through the same transition.
          const dofInner = card.querySelector<HTMLElement>(
            "[data-rail-inner]",
          );
          if (dofInner?.style.filter) dofInner.style.filter = "";
          const rad = parseRadiusPx(getComputedStyle(card).borderRadius);
          // DEFLATE — same interpolation contract as landOnHero: the clip and
          // the media box share ease + duration, so their rects match at
          // every step and the cover-fit re-crops instead of stretching.
          gsap.to(flight.shell, {
            clipPath: `inset(${cr.top}px ${vw - cr.right}px ${vh - cr.bottom}px ${cr.left}px round ${rad}px)`,
            duration: LAND_S,
            ease: "power3.inOut",
          });
          gsap.to(flight.backdrop, {
            opacity: 0,
            duration: LAND_S,
            ease: "power2.inOut",
          });
          gsap.to(flight.media!, {
            left: cr.left,
            top: cr.top,
            width: cr.width,
            height: cr.height,
            duration: LAND_S,
            ease: "power3.inOut",
            // The card at rest is a TEXT card (its media only shows on
            // hover), so the landed clone must not linger: fade the shell's
            // chrome out over the real card and dispose.
            onComplete: () => disposeFlight(ref, flight, CHROME_FADE_S),
          });
          return;
        }
        // Found and settled but off-screen: graceful in-place dissolve.
        disposeFlight(ref, flight, RETURN_FADE_S);
        return;
      }
    } else {
      // Not laid out this frame — stability needs two consecutive samples.
      prevRect = null;
    }
    if (++flight.frames > MAX_CARD_FRAMES) {
      disposeFlight(ref, flight, RETURN_FADE_S);
      return;
    }
    flight.raf = requestAnimationFrame(tick);
  };
  flight.raf = requestAnimationFrame(tick);
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
    setZoomListener((snap) =>
      snap.direction === "return"
        ? startReturnFlight(flightRef, snap)
        : startFlight(flightRef, snap),
    );
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
      if (flight.direction === "return") {
        if (pathname === flight.returnPath) {
          // Landed where the back-link pointed. Consume the snapshot (list
          // pages never peek it — consumption just retires it from the
          // freshness window) and start hunting for the card to deflate onto.
          consumeFlip(flight.slug);
          if (!flight.settling) {
            flight.settling = true;
            flight.arrived = true;
            startReturnLanding(flightRef, flight);
          }
        } else {
          // Navigated somewhere unexpected mid-flight — stale clone.
          disposeFlight(flightRef, flight, 0.25);
        }
        return;
      }
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
    // A return snapshot must never fly the legacy card→hero path — its rect
    // IS the hero, so Flip.fit would fly the image onto itself (and the
    // arrival it describes is a list page, not this detail route anyway).
    if (!snap || !snap.src || snap.direction === "return") return;
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
