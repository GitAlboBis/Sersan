"use client";

/**
 * HeroIntroGate — the Lusion-style scroll hijack for the home hero intro.
 *
 * While engaged (page at the very top, text-particle intro active), the PAGE
 * DOES NOT SCROLL: Lenis is stopped and wheel/touch input is consumed
 * (preventDefault) and accumulated into textMorphStore.gateProgress (0..1) —
 * the sole driver of the "Sersan AI" → headline particle transition. The
 * camera, the spore mark, the signature line — everything scroll-bound —
 * stay perfectly still because document scroll genuinely never moves.
 *
 * When the accumulated progress reaches 1 the gate releases (Lenis restarts)
 * and normal page scroll takes over. Scrolling back up to the very top
 * re-engages it in reverse, so the intro is fully replayable.
 *
 * Engages ONLY when the WebGL morph is actually active (textMorphStore) and
 * the preloader has finished — every fallback path never locks scrolling.
 * Safety valve: if the page somehow scrolls while engaged (keyboard, anchor
 * jump, scrollbar drag), the gate force-releases immediately.
 */
import { useEffect } from "react";
import { getLenis } from "@/lib/lenis-singleton";
import { useIntroStore } from "@/webgl/store/introStore";
import { useTextMorphStore } from "@/webgl/store/textMorphStore";

/** Total wheel distance (px) that maps the gate 0 → 1. Generous on purpose —
 * the intro should feel like a deliberate BLOCK the visitor scrolls through
 * (designer-site style), not a flick: ~3 full wheel swipes. */
const GATE_DISTANCE = 3200;
/** Touch drag maps a bit faster (smaller screens, shorter gestures). */
const TOUCH_FACTOR = 2.2;

export function HeroIntroGate() {
  useEffect(() => {
    let engaged = false;
    let raf = 0;
    let touchY: number | null = null;

    const setProgress = (p: number) => {
      useTextMorphStore.setState({
        gateProgress: Math.min(1, Math.max(0, p)),
      });
    };

    const engage = () => {
      if (engaged) return;
      engaged = true;
      useTextMorphStore.setState({ gateEngaged: true });
      getLenis()?.stop();
    };
    const release = () => {
      if (!engaged) return;
      engaged = false;
      useTextMorphStore.setState({ gateEngaged: false });
      getLenis()?.start();
    };

    const canEngage = () => {
      const morph = useTextMorphStore.getState();
      const intro = useIntroStore.getState();
      return morph.active && intro.introComplete && window.scrollY <= 2;
    };

    const consume = (deltaPx: number, e: Event) => {
      const { gateProgress } = useTextMorphStore.getState();
      if (engaged) {
        e.preventDefault();
        const next = gateProgress + deltaPx / GATE_DISTANCE;
        setProgress(next);
        if (next >= 1) release(); // hand the page back at the end of the intro
        return;
      }
      // Re-engage in reverse: back at the very top, scrolling up, intro done.
      if (deltaPx < 0 && gateProgress >= 1 && canEngage()) {
        engage();
        e.preventDefault();
        setProgress(1 + deltaPx / GATE_DISTANCE);
      }
    };

    const onWheel = (e: WheelEvent) => {
      // Normalize line/page wheel modes to px-ish.
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 120 : 1;
      consume(e.deltaY * scale, e);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY == null) return;
      const y = e.touches[0]?.clientY ?? touchY;
      consume((touchY - y) * TOUCH_FACTOR, e);
      touchY = y;
    };

    // Poll for the initial engage (morph build + preloader are async) and run
    // the safety valve (force-release if the page moved while engaged).
    const tick = () => {
      if (!engaged) {
        const { gateProgress } = useTextMorphStore.getState();
        if (gateProgress < 1 && canEngage()) engage();
      } else if (window.scrollY > 8) {
        setProgress(1);
        release();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // capture:true → runs ahead of Lenis' own wheel handler; passive:false →
    // preventDefault actually blocks native scrolling while engaged.
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      release();
    };
  }, []);

  return null;
}
