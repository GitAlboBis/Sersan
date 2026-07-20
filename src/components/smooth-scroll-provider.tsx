"use client";

/**
 * SmoothScrollProvider — wires Lenis smooth-scroll into GSAP's ScrollTrigger.
 *
 * GSAP's ScrollTrigger natively listens to the browser's scroll event, but
 * Lenis takes that over. We have to feed Lenis ticks into ScrollTrigger so
 * scroll-linked animations stay in sync with the smoothed scroll position.
 */

import { useEffect, useRef, useState } from "react";
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

  // Subscribed, not sampled — same convention as case-studies-rail. Sampling
  // once at mount meant a user turning reduced-motion ON mid-session kept a
  // live Lenis hijacking their wheel: the sibling sections correctly tore down
  // their pinned/scrubbed machinery, but the page still scrolled with inertia,
  // which is exactly the motion that triggers vestibular symptoms. The lazy
  // initializer keeps the first client render already correct, so a
  // reduced-motion user never gets a frame of smooth scroll. (It differs from
  // the SSR value, but this component renders nothing that depends on it —
  // only `children` — so there is no hydration mismatch.)
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(q.matches);
    sync();
    q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);

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

  // ---------------------------------------------------------------------
  // Mode-INDEPENDENT infrastructure. Mount-only on purpose — none of this may
  // be rebuilt when reduced-motion flips:
  //
  //  - scrollerProxy: GSAP has no public API to UNregister a proxy
  //    (ScrollTrigger.scrollerProxy(target) with no vars only clears the
  //    _scrollers cache; the entry stays in _proxies). So the proxy is
  //    installed once and reads the live singleton instead of closing over one
  //    instance — with Lenis it routes through Lenis, without it (reduced
  //    motion) it falls straight through to native scroll. It sets no
  //    `pinType`, so pinned triggers still resolve to "fixed" exactly as they
  //    do with no proxy at all; registering it in both modes is behaviourally
  //    inert.
  //  - the kill-all on teardown: killing every ScrollTrigger on the page is
  //    only ever correct on a real unmount. Re-running it on a reduced-motion
  //    toggle would also destroy triggers belonging to sibling sections that
  //    did not re-render, and they would never come back.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Tell ScrollTrigger to use Lenis as its scroller proxy so triggers
    // resolve against the smooth-scroll position, not native scrollTop.
    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length && typeof value === "number") {
          const lenis = getLenis();
          if (lenis) lenis.scrollTo(value, { immediate: true });
          else window.scrollTo(0, value);
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

    return () => {
      window.clearTimeout(resizeId);
      window.removeEventListener("resize", onResize);
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  // ---------------------------------------------------------------------
  // Lenis lifecycle — re-runs whenever reduced-motion flips, so the preference
  // is honoured in BOTH directions mid-session.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const setScroll = useScrollStore.getState().setScroll;

    // Respect prefers-reduced-motion — fall back to native scroll. The
    // scroll store still gets a progress source (any non-WebGL consumer may
    // read it; the canvas itself self-disables under reduced motion).
    if (reduced) {
      const onNativeScroll = () => {
        const max =
          document.documentElement.scrollHeight - window.innerHeight;
        setScroll(max > 0 ? window.scrollY / max : 0, 0);
      };
      window.addEventListener("scroll", onNativeScroll, { passive: true });
      onNativeScroll();
      ScrollTrigger.refresh();
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

    // Hijack anchor-link clicks so Lenis handles them smoothly. Lives in this
    // branch only: under reduced motion anchors fall back to the browser's own
    // (instant) jump, which is the behaviour that preference asks for.
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

    ScrollTrigger.refresh();

    return () => {
      document.removeEventListener("click", onClick);
      offScroll();
      // Drop the global handle before the release that may destroy the
      // instance, so nothing can reach a dead Lenis.
      const w = window as unknown as { __lenis?: typeof lenis };
      if (w.__lenis === lenis) delete w.__lenis;
      // Refcounted: this provider is the only acquirer, so the release
      // destroys the instance — which removes every Lenis listener, cancels
      // its rAF and cleans its html classes, genuinely handing scrolling back
      // to the browser. If another consumer ever holds a count the instance
      // survives by design and this is a no-op. The external-pump handoff is
      // NOT disturbed either way: `pumpLenis` no-ops while the instance is
      // null, and re-acquiring later reuses the still-set `externallyPumped`
      // flag, so the R3F FrameDriver picks the new instance up without the
      // singleton ever starting a second private rAF.
      releaseLenis();
    };
  }, [reduced]);

  return <>{children}</>;
}
