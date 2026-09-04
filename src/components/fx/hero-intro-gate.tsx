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
 * The intro is a deliberate ~3-swipe scroll-through block (designer-site
 * style), fully replayable by scrolling back to the very top. There is no
 * GESTURE skip — mouse wheel notches are fixed-magnitude, so a flick cannot
 * be reliably distinguished from normal deliberate scrolling (a gesture skip
 * was tried and false-fired; see src/lib/intro-skip.ts). Skipping is
 * EXPLICIT instead: Esc while the gate is engaged, or the quiet mono "skip"
 * label this component renders bottom-right — it fades in only after the
 * gate has held for a moment, so it never flashes during a fast
 * pass-through. A skip pins the whole intro journey at its end state
 * (HeroTextParticles jumps its clocks to completion; the gate releases on
 * the same completion path a full watch-through uses, so the visitor lands
 * on the released hero with Lenis running) and persists for the tab session
 * — canEngage then refuses every re-engage, including the reverse replay at
 * the top. Reduced-motion users never see the gate at all (the morph never
 * activates on that path).
 */
import { useEffect, useRef } from "react";
import { getLenis } from "@/lib/lenis-singleton";
import { isIntroSkipped, markIntroSkipped } from "@/lib/intro-skip";
import { useIntroStore } from "@/webgl/store/introStore";
import { useTextMorphStore } from "@/webgl/store/textMorphStore";

/** Total wheel distance (px) that maps the gate 0 → 1. The intro is ONE beat
 * now (client 2026-07-23: the three-stage text chain was too long — only the
 * "Sersan AI" brand keeps the particle treatment): the brand holds ~0→0.20
 * (~300px), melts over ~0.20→0.75 (~825px) while the DOM hero cascades in,
 * and the tail releases the page. ~1500px ≈ one committed swipe. The old
 * ≥3600px floor guarded the removed morph legs' fixed-duration waves; the
 * dissolve is scrubbed (pure function of gate progress), so it completes at
 * whatever pace the visitor scrolls — no half-formed-text risk. */
const GATE_DISTANCE = 1500;
/** Touch drag maps a bit faster (smaller screens, shorter gestures). */
const TOUCH_FACTOR = 2.2;
/** How long the gate must have HELD (ms) before the skip label fades in.
 * Long enough that a quick reverse-replay pass or a fast committed
 * scroll-through never sees it flash; short enough that anyone actually
 * parked in the intro gets the exit within the first brand hold. */
const SKIP_LABEL_DELAY_MS = 1500;
/** Label fade curves: entrance on the site's canonical decel (the
 * --ease-entrance token, mirrored literally because this is an inline style
 * on a transition string), exit shorter on a cubic-in — accelerate away. */
const LABEL_SHOW_TRANSITION =
  "opacity 500ms var(--ease-entrance, cubic-bezier(0.16, 1, 0.3, 1)), color 200ms var(--ease-out, ease-out)";
const LABEL_HIDE_TRANSITION =
  "opacity 200ms cubic-bezier(0.32, 0, 0.67, 0), color 200ms var(--ease-out, ease-out)";
/** KILL-SWITCH (Fix A, owner report 2026-08-27 "buco nero in tutte le sezioni
 * dopo refresh"): when the page loads ALREADY SCROLLED (browser scroll
 * restoration on a hard reload, a #hash landing) the gate can never engage
 * (canEngage needs scrollY <= 2) and nothing else advances gateProgress, so
 * the journey sits at 0 forever: H1/header hidden and the camera-locked
 * HomeSingularity eclipse never melting. With this on, the never-engaged +
 * scrolled + intro-complete state is pinned at the journey's END state
 * (same payload as the safety valve / skip, WITHOUT markIntroSkipped so the
 * reverse replay at the top stays available). `false` restores the old
 * behavior. */
const COLD_LOAD_RELEASE = true;
/** Fix A hold (ms): scrollY must stay > 8 this long before the pin, so the
 * provider's nav-into-home reset (scrollTo(0) + gateProgress 0, which can
 * land a frame or two apart while Lenis is stopped) is never mistaken for a
 * scrolled landing. */
const COLD_SCROLL_HOLD_MS = 250;
/** STALL RELEASE (Fix B, owner 2026-09-04: "capita qualche volta che il
 * preloader carica, ma non caricano gli elementi, e continua la pagina
 * vuota"). The preloader bounds every signal it waits on — forced timers on
 * fonts/load/manifest/stage/wordmark/eclipse plus a 25s watchdog — so stage 1
 * ALWAYS resolves, which is why the loader is seen to "finish". Stage 2 had
 * no bound at all: once the island publishes `active`, the DOM hero is held
 * at opacity 0 by domReveal, the navbar hides itself for the whole hero, and
 * this gate consumes every wheel/touch event — and the only thing that can
 * END that state is the in-Canvas frame loop (assembleDone → gateProgress →
 * domReveal). If the loop never delivers, the visitor sits on a permanently
 * blank, permanently unscrollable page.
 *
 * So the gate bounds its OWN wait the way the preloader bounds every signal
 * it reads: this many milliseconds of VISIBLE, ticking time with the island
 * claiming the hero and the brand still un-assembled, and the journey pins
 * land, the DOM hero comes back and the page scrolls again. The clock's zero
 * is the island's own publish (the `active` guard below), NOT introComplete,
 * so its budget is measured against the 3.6s ENTRY_DURATION and not against
 * however long the island's chunks took to import. On every healthy load
 * assembleDone is ALREADY true when introComplete flips (the counter holds on
 * wordmarkFormed, which the same frame block publishes), so this clock
 * effectively only ever runs on a degraded path. WITHOUT markIntroSkipped():
 * if the scene recovers, the reverse replay at the very top stays available.
 *
 * NOTE this is a RELEASE, not a full recovery: the desktop navbar still hides
 * itself until 0.8×215vh of scroll, so the header returns as the reader moves
 * rather than at the top. */
const ASSEMBLE_STALL_MS = 6000;
/** Per-tick cap on the stall clock (ms). The clock ACCUMULATES capped frame
 * deltas instead of reading wall-clock: a hidden tab or a throttled rAF must
 * only ever make the watchdog fire LATER, never trip it on the visitor's
 * return. (The inverse of the preloader's RISE floor, which uses wall-clock
 * on purpose — different direction, same discipline.) */
const STALL_TICK_CAP_MS = 100;

export function HeroIntroGate({
  skipLabel = "Skip intro",
}: {
  /** Localized text for the skip affordance (mono label, bottom-right). */
  skipLabel?: string;
}) {
  const labelRef = useRef<HTMLButtonElement | null>(null);
  // The skip closure lives inside the effect (it needs the gate's private
  // `engaged`/`release`); the button's onClick reaches it through this ref.
  const skipRef = useRef<() => void>(() => {});

  useEffect(() => {
    let engaged = false;
    let raf = 0;
    let touchY: number | null = null;
    // When the gate last engaged (performance.now()); drives the skip-label
    // delay. Reset on every engage so the reverse re-engage also waits.
    let engagedAt = 0;
    // Last applied label visibility — style writes only happen on the flip.
    let labelShown = false;
    // Fix A: performance.now() when scrollY first exceeded the abort
    // threshold while NOT engaged; 0 = not currently past it.
    let scrolledSince = 0;
    // Fix B (ASSEMBLE_STALL_MS): accumulated VISIBLE time since the island
    // claimed the hero, and the previous tick's stamp it is measured from
    // (0 = the condition does not currently hold).
    let stallMs = 0;
    let stallLastAt = 0;

    // Seed the session flag before the first tick: a hard reload (or a soft
    // nav back home) after a skip must never re-gate. sessionStorage is read
    // lazily here on the client only (SSR-safe); the tick below then pins the
    // journey flags, so ordering against the provider's nav-into-home reset
    // does not matter — introSkipped itself is never reset by it.
    if (isIntroSkipped()) {
      useTextMorphStore.setState({ introSkipped: true });
    }

    const setProgress = (p: number) => {
      useTextMorphStore.setState({
        gateProgress: Math.min(1, Math.max(0, p)),
      });
    };

    const engage = () => {
      if (engaged) return;
      engaged = true;
      engagedAt = performance.now();
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
      // introSkipped: the skip wins for the whole tab session — it blocks
      // both the initial engage on later loads and the reverse re-engage at
      // the very top (a skipper scrolling back up just hits the normal
      // top-of-page rubber band instead of the gate).
      return (
        morph.active &&
        !morph.introSkipped &&
        intro.introComplete &&
        window.scrollY <= 2
      );
    };

    // The explicit skip (Esc / label click). Lands the visitor on the SAME
    // released-hero state a full watch-through produces: the journey flags
    // are pinned at their end values in one beat (HeroTextParticles' frame
    // loop sees introSkipped and jumps every morph clock + uniform to its
    // end state, so nothing can rest half-formed), gateKick is dropped so no
    // queued camera shake rides the hand-off (same discipline as the exit
    // gate's release), and the gate releases through its normal path (Lenis
    // restarts). assembleDone is set explicitly because a skip can land
    // mid-assemble — the entry clock block never runs again once the clock
    // is pinned at 1, so nothing else would ever flip it.
    const skip = () => {
      if (!engaged) return;
      markIntroSkipped();
      useTextMorphStore.setState({
        introSkipped: true,
        gateProgress: 1,
        assembleDone: true,
        morphDone: true,
        morph2Done: true,
        gateKick: 0,
      });
      release();
    };
    skipRef.current = skip;

    const onKeyDown = (e: KeyboardEvent) => {
      // skip() self-guards on `engaged`, so Esc anywhere else on the page
      // (menus, dialogs, plain reading) falls through untouched.
      if (e.key === "Escape") skip();
    };

    const consume = (deltaPx: number, e: Event) => {
      const { gateProgress, gateKick, assembleDone, morph2Done } =
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
        // intent just under 1 until the final "see what we build" cue is
        // composed, so a fast flick can never release the page over a
        // half-formed text. The next scroll past the cap then releases.
        if (!morph2Done) next = Math.min(next, 0.97);
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

    // Skip-label visibility, driven from the same tick that polls the gate.
    // The label is a REAL control while shown (focusable, exposed to AT) and
    // fully neutral while hidden (aria-hidden, out of the tab order, no
    // pointer target) — never merely transparent, so an interrupted fade can
    // never leave a clickable invisible button behind.
    const syncLabel = () => {
      const shown =
        engaged && performance.now() - engagedAt >= SKIP_LABEL_DELAY_MS;
      if (shown === labelShown) return;
      labelShown = shown;
      const el = labelRef.current;
      if (!el) return;
      el.style.transition = shown
        ? LABEL_SHOW_TRANSITION
        : LABEL_HIDE_TRANSITION;
      el.style.opacity = shown ? "1" : "0";
      el.style.pointerEvents = shown ? "auto" : "none";
      el.tabIndex = shown ? 0 : -1;
      if (shown) {
        el.removeAttribute("aria-hidden");
      } else {
        el.setAttribute("aria-hidden", "true");
        // Never leave keyboard focus resting on a hidden control (the gate
        // released — by skip, completion or safety valve — while focused).
        if (document.activeElement === el) el.blur();
      }
    };

    // Poll for the initial engage (morph build + preloader are async) and run
    // the safety valve (force-release if the page moved while engaged).
    const tick = () => {
      const morph = useTextMorphStore.getState();
      // The skip wins for the rest of the session: re-pin the journey at its
      // end state whenever anything rewinds it. The provider's nav-into-home
      // replay reset zeroes gateProgress/assembleDone but deliberately keeps
      // introSkipped — without this re-assert HeroTextParticles' morph
      // targets would follow the zeroed gate progress and visibly un-build
      // the composed cue on a skipped session's return to the homepage.
      if (morph.introSkipped && morph.gateProgress < 1) {
        useTextMorphStore.setState({
          gateProgress: 1,
          assembleDone: true,
          morphDone: true,
          morph2Done: true,
        });
      }
      // Fix B — STALL RELEASE (see ASSEMBLE_STALL_MS). Runs whether or not
      // the gate is engaged: the stranded state is "engaged with nothing on
      // screen", but a never-engaged gate over a dead island is the same
      // blank hero. Gated on `active` because that flag is the island's own
      // promise that it owns the hero copy — without it this clock would also
      // run on every interior route and every WebGL2 / tier-off home load,
      // where assembleDone is false forever BY DESIGN (the preloader
      // auto-passes those gates and domReveal rests at 1, so there is no
      // stranded state to rescue), and on a soft nav into home it would start
      // before the island had even remounted. domReveal is pinned alongside
      // the journey flags because gateProgress alone does NOT unhide the DOM
      // hero — only the island's per-frame domReveal write does, and on this
      // path there is no island writing anything. `active` is deliberately
      // LEFT ALONE: a recovering island damps gSmooth toward the pinned
      // gateProgress 1 and writes domReveal back to 1 on its own, so the two
      // converge instead of fighting (the ~0.4s damp tail reads as a brief
      // fade, not a re-hide — the same tail COLD_LOAD_RELEASE already has).
      if (
        morph.active &&
        !morph.introSkipped &&
        !morph.assembleDone &&
        useIntroStore.getState().introComplete
      ) {
        const now = performance.now();
        if (stallLastAt === 0) {
          stallLastAt = now;
        } else {
          stallMs += Math.min(now - stallLastAt, STALL_TICK_CAP_MS);
          stallLastAt = now;
          if (stallMs >= ASSEMBLE_STALL_MS) {
            stallMs = 0;
            stallLastAt = 0;
            useTextMorphStore.setState({
              gateProgress: 1,
              assembleDone: true,
              morphDone: true,
              morph2Done: true,
              gateKick: 0,
              domReveal: 1,
            });
            release();
          }
        }
      } else {
        // BOTH are reset, not just the stamp: two separate sub-threshold
        // stretches must never accumulate into one false fire.
        stallMs = 0;
        stallLastAt = 0;
      }
      if (!engaged) {
        if (morph.gateProgress < 1 && canEngage()) {
          engage();
        } else if (
          COLD_LOAD_RELEASE &&
          morph.active &&
          !morph.introSkipped &&
          morph.gateProgress < 1 &&
          useIntroStore.getState().introComplete &&
          window.scrollY > 8
        ) {
          // Cold load landing already scrolled (see COLD_LOAD_RELEASE): pin
          // the journey at its END state, the payload the safety valve and
          // the skip land on, but WITHOUT markIntroSkipped() — the reverse
          // replay at the very top must stay available and the session flag
          // is the visitor's explicit choice only. Held for a beat so the
          // provider's nav-into-home reset can never be mistaken for this.
          const now = performance.now();
          if (scrolledSince === 0) {
            scrolledSince = now;
          } else if (now - scrolledSince >= COLD_SCROLL_HOLD_MS) {
            scrolledSince = 0;
            useTextMorphStore.setState({
              gateProgress: 1,
              assembleDone: true,
              morphDone: true,
              morph2Done: true,
              gateKick: 0,
              // Fix B: pinning the gate does not unhide the DOM hero — the H1
              // and the [data-hero-stagger] cluster follow domReveal, which
              // only the island writes. A cold-scrolled landing over a dead
              // island had the same blank-hero hole this closes.
              domReveal: 1,
            });
          }
        } else {
          scrolledSince = 0;
        }
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
      syncLabel();
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
    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      window.removeEventListener("keydown", onKeyDown);
      skipRef.current = () => {};
      release();
    };
  }, []);

  // The skip label. Positioned inside the pinned stage (which fills the
  // viewport exactly while the gate can be engaged — the page is parked at
  // the very top), bottom-right, above the drag layer (z-[5]) and the rail
  // (z-20). Ships fully neutral inline (opacity 0 / no pointer target / out
  // of tab order / aria-hidden) so every path where the gate never engages —
  // mobile, reduced motion, non-WebGPU, no-JS — never shows or exposes it;
  // the gate's tick flips it live. Hover/focus follow the site's mono-label
  // idiom: quiet ink-mute at rest, ink on hover, the global :focus-visible
  // accent ring on keyboard focus.
  return (
    <button
      ref={labelRef}
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      onClick={() => skipRef.current()}
      className="absolute bottom-8 right-8 z-30 inline-flex items-center gap-2 rounded-full px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute hover:text-ink"
      style={{ opacity: 0, pointerEvents: "none", willChange: "opacity" }}
    >
      <span>{skipLabel}</span>
      <span aria-hidden="true" className="text-ink-mute/55">
        ·
      </span>
      <span>Esc</span>
    </button>
  );
}
