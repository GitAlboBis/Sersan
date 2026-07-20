"use client";

/**
 * SmoothScrollProvider — wires Lenis smooth-scroll into GSAP's ScrollTrigger.
 *
 * GSAP's ScrollTrigger natively listens to the browser's scroll event, but
 * Lenis takes that over. We have to feed Lenis ticks into ScrollTrigger so
 * scroll-linked animations stay in sync with the smoothed scroll position.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { acquireLenis, getLenis, releaseLenis } from "@/lib/lenis-singleton";
import { useScrollStore } from "@/webgl/store/scrollStore";
import { useTextMorphStore } from "@/webgl/store/textMorphStore";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  // Per-route-change handling on client-side (SPA) navigation:
  //  - Inner routes: reset to the top + re-refresh ScrollTrigger so scrub /
  //    parallax triggers re-measure after layout settles. (Content reveals are
  //    IntersectionObserver-driven now — Reveal / SectionHeading — so they no
  //    longer depend on this; a once:true ScrollTrigger created already-in-view
  //    can't be fired by refresh() anyway.)
  //  - Returning to the homepage FROM another route: reset to the top AND clear
  //    the persisted particle-intro journey so it replays from the start. The
  //    textMorphStore is globalThis-pinned and otherwise survives a soft nav, so
  //    without this the intro shows as already-complete. HeroTextParticles
  //    re-mounts on '/' and reads `assembleDone` asynchronously (after its
  //    dynamic imports), so this synchronous reset always lands first and its
  //    entry clock replays. We do NOT run the refresh() cadence on '/': the
  //    homepage cinematic owns its own refresh + intro gate and refreshing here
  //    would race it / fight the gate.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    if (pathname === "/") {
      // Only on a genuine navigation INTO home (not the very first paint, not a
      // same-route phantom remount) — replay the particle intro from the start.
      if (prev !== null && prev !== "/") {
        getLenis()?.scrollTo(0, { immediate: true });
        useTextMorphStore.setState({
          assembleDone: false,
          gateProgress: 0,
          gateEngaged: false,
          gateKick: 0,
          morphDone: false,
          morph2Done: false,
          camTilt: 0,
          tiltAnchorY: 0,
          camDescend: 0,
          tiltDone: false,
          domReveal: 1,
        });
      }
      return;
    }

    // New routes start at the top; keep Lenis in sync with App Router's reset.
    getLenis()?.scrollTo(0, { immediate: true });
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    const timer = window.setTimeout(() => ScrollTrigger.refresh(), 450);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const setScroll = useScrollStore.getState().setScroll;

    // Respect prefers-reduced-motion — fall back to native scroll. The
    // scroll store still gets a progress source (any non-WebGL consumer may
    // read it; the canvas itself self-disables under reduced motion).
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      const onNativeScroll = () => {
        const max =
          document.documentElement.scrollHeight - window.innerHeight;
        setScroll(max > 0 ? window.scrollY / max : 0, 0);
      };
      window.addEventListener("scroll", onNativeScroll, { passive: true });
      onNativeScroll();
      return () => window.removeEventListener("scroll", onNativeScroll);
    }

    const lenis = acquireLenis();

    // Expose to window for nav anchor links + debugging.
    (window as unknown as { __lenis?: typeof lenis }).__lenis = lenis;

    // Bridge Lenis → ScrollTrigger AND the WebGL scroll store. One source,
    // every consumer: GSAP reveals and shader uniforms share the exact same
    // smoothed progress. `on` returns an unsubscribe — keep it so the handler
    // is removed on unmount (the singleton may outlive this provider when
    // other consumers still hold a refcount).
    const offScroll = lenis.on(
      "scroll",
      (l: { progress?: number; velocity?: number }) => {
        ScrollTrigger.update();
        setScroll(l.progress ?? 0, l.velocity ?? 0);
      },
    );

    // Hijack anchor-link clicks so Lenis handles them smoothly.
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest("a") as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#") || href === "#") return;
      const dest = document.querySelector(href);
      if (!dest) return;
      e.preventDefault();
      lenis.scrollTo(dest as HTMLElement, { offset: -72 });
    };
    document.addEventListener("click", onClick);

    // Tell ScrollTrigger to use Lenis as its scroller proxy so triggers
    // resolve against the smooth-scroll position, not native scrollTop.
    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length && typeof value === "number") {
          lenis.scrollTo(value, { immediate: true });
        }
        return window.scrollY;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
    });

    // Re-sync on resize. Debounced — a resize/orientation change fires a
    // burst of events, and ScrollTrigger.refresh() re-measures every trigger
    // on the page, so we coalesce to one refresh after the burst settles.
    let resizeId = 0;
    const onResize = () => {
      window.clearTimeout(resizeId);
      resizeId = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    };
    window.addEventListener("resize", onResize);
    ScrollTrigger.refresh();

    return () => {
      window.clearTimeout(resizeId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("click", onClick);
      offScroll();
      releaseLenis();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  return <>{children}</>;
}
