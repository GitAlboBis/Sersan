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
 * SKIP (restyle step 4): a DOUBLE WHEEL-FLICK while engaged — two distinct
 * fast downward wheel bursts within a short window — skips the whole intro:
 * the morph store is fast-forwarded to its end state, the gate releases, and
 * a sessionStorage flag (src/lib/intro-skip.ts) keeps it released for the
 * rest of the tab session (canEngage refuses; the provider composes the flag
 * with its nav-into-home replay reset). Reduced-motion users never see the
 * gate at all (the morph never activates), unchanged.
 */
import { useEffect } from "react";
import { isIntroSkipped, markIntroSkipped } from "@/lib/intro-skip";
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

// --- Double wheel-flick skip detection -------------------------------------
// A "flick" is the LEADING wheel event of a fresh downward burst. A burst
// starts after a quiet gap (mouse wheels: distinct spins arrive as separated
// events) OR on a sudden magnitude spike against the decaying inertia tail
// (trackpads: a second flick lands while the first tail is still streaming).
/** Minimum px delta for a burst-leading event to count as a deliberate flick
 * (a mouse notch is ~100px; slow deliberate scrolling stays below this). */
const FLICK_MIN_DELTA = 50;
/** Quiet gap (ms) since the previous wheel event that marks a new burst. */
const FLICK_GAP_MS = 200;
/** Spike rule: a new burst mid-tail = delta this much larger than the last
 * event's, above an absolute floor. */
const FLICK_SPIKE_RATIO = 2.5;
const FLICK_SPIKE_MIN = 120;
/** Two counted flicks closer than this are the same gesture's echo. */
const FLICK_REFRACTORY_MS = 250;
/** Max spacing between the two flicks for the pair to read as "double". */
const DOUBLE_FLICK_WINDOW_MS = 750;

export function HeroIntroGate() {
  useEffect(() => {
    let engaged = false;
    let raf = 0;
    let touchY: number | null = null;
    // Double-flick detector state (wheel only).
    let lastWheelT = -Infinity;
    let lastWheelAbs = 0;
    let lastFlickT = -Infinity;

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
      return (
        !morph.introSkipped &&
        !isIntroSkipped() &&
        morph.active &&
        intro.introComplete &&
        window.scrollY <= 2
      );
    };

    /** Fast-forward the whole intro and hand the page back. The flag set is
     * the store's end state for the GATE journey (cross-checked against the
     * writer table): gateProgress 1 keeps the forward poll from re-engaging,
     * the morph flags + introSkipped make HeroTextParticles jump its clocks
     * to their end (so its per-frame derivation keeps the flags true), and
     * domReveal 1 restores the scrims/H1 cascade immediately. camTilt /
     * tiltDone are deliberately NOT touched — they belong to the SEPARATE
     * SpineExitGate descent beat at the END of the pin (forcing tiltDone
     * without camTilt=1 breaks that gate's invariant, and camTilt=1 at
     * scrollY 0 would misplace the camera) — the skip ends the INTRO only. */
    const skip = () => {
      markIntroSkipped();
      useTextMorphStore.setState({
        introSkipped: true,
        gateProgress: 1,
        gateKick: 0,
        assembleDone: true,
        morphDone: true,
        morph2Done: true,
        morph3Done: true,
        domReveal: 1,
      });
      release();
    };

    /** Returns true when `deltaPx` is the SECOND fast downward flick within
     * the double-flick window. Must be called for every wheel event while
     * engaged so the burst tracker sees the full stream. */
    const detectDoubleFlick = (deltaPx: number, now: number): boolean => {
      const abs = Math.abs(deltaPx);
      const gap = now - lastWheelT;
      const burstStart =
        gap > FLICK_GAP_MS ||
        (abs > FLICK_SPIKE_MIN && abs > lastWheelAbs * FLICK_SPIKE_RATIO);
      lastWheelT = now;
      lastWheelAbs = abs;
      if (!burstStart || deltaPx <= 0 || abs < FLICK_MIN_DELTA) return false;
      // Same-gesture echo (e.g. the spike rule re-firing during the ramp-up
      // of one flick): ignore WITHOUT resetting the flick clock.
      if (now - lastFlickT < FLICK_REFRACTORY_MS) return false;
      const since = now - lastFlickT;
      lastFlickT = now;
      return since < DOUBLE_FLICK_WINDOW_MS;
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
      // Double wheel-flick while engaged → skip the whole intro. The event
      // is still consumed (the page must not lurch on the trigger itself);
      // the NEXT gesture scrolls the released page normally.
      if (engaged && detectDoubleFlick(deltaPx, e.timeStamp)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        skip();
        return;
      }
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
