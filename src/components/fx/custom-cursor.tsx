"use client";

/**
 * CustomCursor — dot + lagging ring + trail (award sprint, Phase D; AGENTS.md §3c).
 *
 * The dot snaps to the pointer, the ring chases it with a soft lag
 * (gsap.quickTo); over interactive elements the ring swells and brightens. A
 * faint decaying trail of ghost rings follows behind for a liquid feel. The
 * native cursor stays VISIBLE — the ring is an accent, not a replacement, so
 * usability never regresses (form fields, text selection untouched).
 *
 * HOVER STATES (data-cursor)
 *   Any element (or ancestor) carrying `data-cursor="link" | "drag" | "view"`
 *   sets a named state; the ring changes scale + shows a tiny label ("VIEW",
 *   "DRAG"). Falls back to the legacy INTERACTIVE selector (a/button/…/.card-steel/
 *   .cursor-grab) so existing markup keeps the simple swell with no attribute.
 *
 * SHARED POSITION
 *   Position comes from the shared pointerStore (one window listener, installed
 *   by the WebGL FrameDriver), so the cursor and the WebGPU fluid breathe off
 *   the exact same pointer. When the WebGL layer is absent (e.g. canvas not
 *   mounted), this component installs its own tracking — refcounted, so they
 *   coexist without duplicating listeners.
 *
 * Desktop fine pointers only; never mounts under prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  installPointerTracking,
  usePointerStore,
} from "@/webgl/store/pointerStore";

const INTERACTIVE = "a, button, [role='button'], .card-steel, .cursor-grab";
const TRAIL_COUNT = 6;

/** Maps a data-cursor state (or null) to ring presentation. */
function presetFor(state: string | null, legacyHit: boolean) {
  switch (state) {
    case "view":
      return { scale: 2.6, label: "VIEW", strong: true };
    case "drag":
      return { scale: 2.2, label: "DRAG", strong: true };
    case "link":
      return { scale: 1.8, label: "", strong: true };
    default:
      return { scale: legacyHit ? 1.8 : 1, label: "", strong: legacyHit };
  }
}

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);

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
    const label = labelRef.current;
    if (!dot || !ring) return;

    // Ensure the shared pointer listener exists even if the WebGL canvas never
    // mounts (lite tier still has a canvas; "off" never reaches here because we
    // bail under reduced-motion above). Refcounted — coexists with FrameDriver.
    const releaseTracking = installPointerTracking();

    const trail = trailRefs.current.filter(Boolean) as HTMLDivElement[];
    gsap.set([dot, ring, ...trail], { xPercent: -50, yPercent: -50, opacity: 0 });
    if (label) gsap.set(label, { xPercent: -50, yPercent: -50, opacity: 0 });
    // Prime the ring's REAL scale components so the swell tween animates
    // scaleX/scaleY rather than the `scale` shorthand (the shorthand trips
    // "scale not eligible for reset" when pointerover overwrites the tween).
    gsap.set(ring, { scaleX: 1, scaleY: 1 });

    const dotX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power2.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power2.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });
    // The label tracks the ring's position but lives OUTSIDE the scaled ring, so
    // text never inherits the ring's swell (stays crisp at any ring scale).
    const labelX = label
      ? gsap.quickTo(label, "x", { duration: 0.45, ease: "power3.out" })
      : null;
    const labelY = label
      ? gsap.quickTo(label, "y", { duration: 0.45, ease: "power3.out" })
      : null;
    // Each trail dot lags progressively more for a decaying comet feel.
    const trailTweens = trail.map((el, i) => ({
      x: gsap.quickTo(el, "x", {
        duration: 0.5 + i * 0.12,
        ease: "power3.out",
      }),
      y: gsap.quickTo(el, "y", {
        duration: 0.5 + i * 0.12,
        ease: "power3.out",
      }),
    }));

    let shown = false;
    // Drive everything off gsap's SHARED ticker reading the shared smoothed
    // pointer — NOT a new requestAnimationFrame. gsap.ticker is the same single
    // ticker quickTo already runs on, so this adds no extra rAF to the page
    // (honouring the "one render loop" rule; the WebGL FrameDriver/Lenis loop is
    // untouched, and gsap.ticker is GSAP's own pre-existing ticker).
    const onTick = () => {
      // Read RAW pointer (not the store's smoothed value): quickTo below provides
      // the cursor's own lag, so the cursor stays self-sufficient even if the
      // WebGL FrameDriver (which advances the store's `smooth`) isn't mounted.
      const { raw } = usePointerStore.getState();
      const px = raw.x * window.innerWidth;
      const py = raw.y * window.innerHeight;
      if (!shown) {
        shown = true;
        gsap.to([dot, ring], { opacity: 1, duration: 0.3 });
        gsap.to(trail, { opacity: 0.18, duration: 0.4, stagger: 0.02 });
      }
      dotX(px);
      dotY(py);
      ringX(px);
      ringY(py);
      labelX?.(px);
      labelY?.(py);
      for (const tw of trailTweens) {
        tw.x(px);
        tw.y(py);
      }
    };
    gsap.ticker.add(onTick);

    const onOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const stateEl = target?.closest<HTMLElement>("[data-cursor]");
      const state = stateEl?.dataset.cursor ?? null;
      const legacyHit = !state && !!target?.closest(INTERACTIVE);
      const { scale, label: text, strong } = presetFor(state, legacyHit);

      // Uniform ring swell via the real scaleX/scaleY props (not the `scale`
      // shorthand) so repeated pointerover overwrites never trip the reset warn.
      gsap.to(ring, {
        scaleX: scale,
        scaleY: scale,
        opacity: shown ? 1 : 0,
        borderColor: strong
          ? "hsl(189 100% 62% / 0.9)"
          : "hsl(189 100% 62% / 0.45)",
        duration: 0.35,
        ease: "power3.out",
      });
      if (label) {
        label.textContent = text;
        gsap.to(label, { opacity: text ? 1 : 0, duration: 0.25 });
      }
    };
    const onLeave = () => {
      shown = false;
      gsap.to([dot, ring, ...trail], { opacity: 0, duration: 0.25 });
      if (label) gsap.to(label, { opacity: 0, duration: 0.2 });
    };

    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      gsap.ticker.remove(onTick);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      releaseTracking();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90]">
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          className="absolute rounded-full"
          style={{
            // Trail dots shrink down the tail.
            height: `${6 - i * 0.6}px`,
            width: `${6 - i * 0.6}px`,
            background: "hsl(189 100% 62% / 0.5)",
          }}
        />
      ))}
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
      <span
        ref={labelRef}
        className="absolute select-none font-mono text-[8px] tracking-[0.25em] text-[hsl(189_100%_82%)]"
      />
    </div>
  );
}
