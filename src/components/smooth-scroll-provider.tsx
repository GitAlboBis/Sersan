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
import { attachSnap, detachSnap, suspendSnap } from "@/lib/scroll-snap";
import { useScrollStore } from "@/webgl/store/scrollStore";
import { useTextMorphStore } from "@/webgl/store/textMorphStore";
import { useFoundersMorphStore } from "@/webgl/store/foundersMorphStore";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);
  // prefers-reduced-motion is LIVE, both directions. Sampling it once on
  // mount left Lenis hijacking the wheel for a user who enabled reduced
  // motion mid-session (an OS-level toggle fires no resize / reload), and
  // left them on native scroll for the rest of the session if they turned it
  // back off. SSR starts false — the provider renders no DOM of its own, so
  // there is nothing to mismatch on hydration.
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ScrollTrigger's scrollerProxy is registered ONCE, for the life of the
  // page. GSAP has no unregister API — a proxy stays in its internal `_proxies`
  // list forever — so it must never close over a Lenis instance that a
  // reduced-motion toggle can destroy. It resolves the live instance per call
  // and falls back to native scrolling when there is none.
  useEffect(() => {
    if (typeof window === "undefined") return;
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

    // Route swap: hold the snap engine while the reset scrollTo(0) + late
    // layout (fonts, reveals, FLIP flights) settle — a pending settle armed
    // by the outgoing page's last wheel must never fire into the new page.
    const releaseSnap = suspendSnap();
    const snapTimer = window.setTimeout(releaseSnap, 900);

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
          camDescend: 0,
          tiltDone: false,
          domReveal: 1,
        });
      }
      return () => {
        window.clearTimeout(snapTimer);
        releaseSnap();
      };
    }

    // New routes start at the top; keep Lenis in sync with App Router's reset.
    getLenis()?.scrollTo(0, { immediate: true });
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    const timer = window.setTimeout(() => ScrollTrigger.refresh(), 450);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.clearTimeout(snapTimer);
      releaseSnap();
    };
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const setScroll = useScrollStore.getState().setScroll;

    // Respect prefers-reduced-motion — fall back to native scroll. The
    // scroll store still gets a progress source (any non-WebGL consumer may
    // read it; the canvas itself self-disables under reduced motion).
    if (reduceMotion) {
      const onNativeScroll = () => {
        const max =
          document.documentElement.scrollHeight - window.innerHeight;
        setScroll(max > 0 ? window.scrollY / max : 0, 0);
        // The proxy above reads window.scrollY, so triggers resolve correctly
        // on native scroll — but drive the update from the same handler that
        // feeds the store, so both stay on one source.
        ScrollTrigger.update();
      };
      window.addEventListener("scroll", onNativeScroll, { passive: true });
      onNativeScroll();
      // Toggling INTO reduced motion swaps the scroll source under every
      // existing trigger; re-measure once so nothing is left resolving
      // against the smoothed position.
      ScrollTrigger.refresh();
      return () => window.removeEventListener("scroll", onNativeScroll);
    }

    const lenis = acquireLenis();

    // Expose to window for nav anchor links + debugging.
    (window as unknown as { __lenis?: typeof lenis }).__lenis = lenis;

    // Site-wide snap engine (lib/scroll-snap): sections register themselves
    // (ScrollSnapSections + the runway components); the provider owns the
    // lifecycle and holds it while any scroll-hijack gate is engaged — a
    // debounced settle firing into a stopped/hijacked Lenis is at best lost,
    // at worst trips a gate's safety valve.
    attachSnap(lenis);
    let releaseGateHold: (() => void) | null = null;
    const syncGateHold = () => {
      const engaged =
        useTextMorphStore.getState().gateEngaged ||
        useFoundersMorphStore.getState().gateEngaged;
      if (engaged && !releaseGateHold) {
        releaseGateHold = suspendSnap();
      } else if (!engaged && releaseGateHold) {
        releaseGateHold();
        releaseGateHold = null;
      }
    };
    const offGateA = useTextMorphStore.subscribe(syncGateHold);
    const offGateB = useFoundersMorphStore.subscribe(syncGateHold);
    syncGateHold();

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
      // Hold the snap engine across the glide: a pending settle armed by the
      // wheel before the click would otherwise re-pull the page off the
      // anchor landing (worst on targets with no snap point of their own,
      // e.g. #faq / #intake). Timeout backstop rather than onComplete alone —
      // Lenis skips onComplete when the glide is interrupted; release is
      // idempotent.
      const releaseSnap = suspendSnap();
      window.setTimeout(releaseSnap, 1100);
      lenis.scrollTo(dest as HTMLElement, { offset: -72 });
    };
    document.addEventListener("click", onClick);

    // (The scrollerProxy that makes triggers resolve against the smooth-scroll
    // position is registered once, above — it reads getLenis() live.)

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
      offGateA();
      offGateB();
      releaseGateHold?.();
      detachSnap();
      offScroll();
      delete (window as unknown as { __lenis?: unknown }).__lenis;
      // Exactly one release per acquire above. The singleton is refcounted and
      // hands the RAF baton to the R3F FrameDriver when the canvas is up
      // (setExternalPump): re-acquiring after a reduced-motion toggle picks
      // that handoff back up on its own, so we must never double-release here
      // nor touch the pump flag — that would strand R3F's pump or restart a
      // second private RAF.
      releaseLenis();
    };
  }, [reduceMotion]);

  // Killing EVERY trigger on the page is an unmount-only teardown. Running it
  // on a reduced-motion toggle would take out triggers owned by sibling
  // sections that never re-rendered — nothing would ever rebuild them.
  useEffect(() => {
    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  return <>{children}</>;
}
