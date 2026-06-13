"use client";

/**
 * HeroIntroGate — the Lusion-style scroll hijack for the home hero intro.
 *
 * While engaged (page at the very top, text-particle intro active), the PAGE
 * DOES NOT SCROLL: Lenis is stopped and wheel/touch input is consumed
 * (preventDefault) and accumulated into textMorphStore.gateProgress (0..1) —
 * the sole driver of the "Sersan AI" → headline particle transition.
 * Document scroll genuinely never moves, but the scene is NOT frozen: each
 * consumed input also writes a `gateKick` impulse that SignatureLine turns
 * into the same alive camera motion (spring-back bob/tilt + line
 * breath/glow) that normal scrolling produces — the camera shakes with the
 * gesture while the page itself holds.
 *
 * When the accumulated progress reaches 1 the gate releases (Lenis restarts)
 * and normal page scroll takes over. Scrolling back up to the very top
 * re-engages it in reverse, so the intro is fully replayable.
 *
 * Engages ONLY when the WebGL morph is actually active (textMorphStore) and
 * the preloader has finished — every fallback path never locks scrolling.
 * Safety valve: if the page somehow scrolls while engaged (keyboard, anchor
 * jump, scrollbar drag), the gate force-releases immediately.
 *
 * The intro is a deliberate ~4-swipe scroll-through block (designer-site
 * style), fully replayable by scrolling back to the very top. There is no
 * gesture skip: mouse wheel notches are fixed-magnitude, so a flick gesture
 * cannot be reliably distinguished from normal deliberate scrolling. (A future
 * explicit Esc/button affordance could be added, out of scope here.)
 * Reduced-motion users never see the gate at all (the morph never activates).
 */
import { useEffect } from "react";
import { getLenis } from "@/lib/lenis-singleton";
import { useIntroStore } from "@/webgl/store/introStore";
import { useTextMorphStore } from "@/webgl/store/textMorphStore";

/** Total wheel distance (px) that maps the gate 0 → 1. Generous on purpose —
 * the intro should feel like a deliberate BLOCK the visitor scrolls through
 * (designer-site style), not a flick: ~4 full wheel swipes. Sized so the
 * timeline's hold plateaus (HeroTextParticles: solid brand ~24%, settled
 * headline ~15%) each absorb a meaningful chunk of real scrolling. */
const GATE_DISTANCE = 8500;
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
      const { gateProgress, gateKick, assembleDone, morph3Done } =
        useTextMorphStore.getState();
      if (engaged) {
        // preventDefault blocks native scrolling; stopImmediatePropagation
        // keeps the gesture away from Lenis' own window wheel/touch handlers
        // (Lenis does not honor defaultPrevented — without this, a running
        // Lenis would smooth-scroll the page right through the gate and the
        // safety valve below would skip the whole intro).
        e.preventDefault();
        e.stopImmediatePropagation();
        // Feed the consumed gesture into the camera-shake channel — the
        // page holds still but the scene reacts like it does on real scroll.
        useTextMorphStore.setState({ gateKick: gateKick + deltaPx });
        // During the automatic entry assemble the page is locked but scroll
        // does NOT advance the morph — the wave must finish forming first.
        if (!assembleDone) return;
        let next = gateProgress + deltaPx / GATE_DISTANCE;
        // The morph chain plays on its own clock once triggered: cap the
        // intent just under 1 until the FINAL "scroll" cue is fully composed,
        // so a fast flick can never release the page over a half-formed text.
        // The next scroll past the cap then dissolves "scroll" and releases.
        if (!morph3Done) next = Math.min(next, 0.97);
        setProgress(next);
        if (next >= 1) release(); // hand the page back at the end of the intro
        return;
      }
      // Re-engage in reverse: back at the very top, scrolling up, intro done.
      if (deltaPx < 0 && gateProgress >= 1 && canEngage()) {
        engage();
        e.preventDefault();
        e.stopImmediatePropagation();
        setProgress(1 + deltaPx / GATE_DISTANCE);
        useTextMorphStore.setState({ gateKick: gateKick + deltaPx });
      }
    };

    const onWheel = (e: WheelEvent) => {
      // Normalize line/page wheel modes to px-ish.
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 120 : 1;
      const deltaPx = e.deltaY * scale;
      consume(deltaPx, e);
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
      } else {
        // Re-assert the Lenis stop every engaged frame. We engage on the
        // preloader's complete() beat, but its curtain finish() lands ~1s
        // later and calls restoreScroll() → lenis.start(), silently undoing
        // our stop. One stray start would let the first wheel smooth-scroll
        // the page and trip the safety valve above, skipping the intro.
        getLenis()?.stop();
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
