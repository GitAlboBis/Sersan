/**
 * Lenis smooth-scroll singleton.
 *
 * The scroll-driven camera path needs a stable rAF-driven scroll source —
 * not the browser's native bumpy wheel deltas. Lenis gives us that, but
 * we only ever want ONE instance per document (multiple instances stomp
 * each other's transforms). This module guarantees that.
 *
 * Consumers call getLenis() in an effect; the first caller spins it up,
 * subsequent callers share it, and a refcount tears it down when the
 * last consumer unmounts (e.g. when the homepage scene unmounts on
 * navigation away).
 *
 * NATIVE-TELEPORT RE-SYNC (B14): a native scroll teleport (Ctrl+Home/End,
 * scrollbar drag, find-in-page) moves window.scrollY without Lenis. Lenis's
 * own internal native-scroll handler usually re-syncs its virtual value, but
 * it has wedge paths (see resyncFromNative below) that leave `animatedScroll`
 * stale — and then every scrollStore consumer (hero lockup, eclipse fade,
 * signature line, W4 cut driver) reads a dead position until the next wheel.
 * A passive window scroll listener FLAGS; the check + forced re-sync run on
 * the next tick of the EXISTING frame pipeline (private tick or the R3F
 * external pump), never on a new rAF loop.
 *
 * TOUCH: smoothing is WHEEL-ONLY. `syncTouch` is deliberately off — see the
 * note on `smoothWheel` below. This is a decision, not an omission.
 */
import Lenis from "lenis";
import { useScrollStore } from "@/webgl/store/scrollStore";

// --- SCROLL FEEL (2026-08-27, dossier scratchpad/dossiers/scroll-feel.md) ---
// Owner: "il nostro mi pare troppo veloce" vs lusion.co / igloo.inc.
// Measured: ours WAS byte-identical to Lusion (λ = 12 s⁻¹, 100 px/notch, no
// clamp). igloo (app3d mainController): 100 px × 75e-5 = 0.075 viewport =
// 67.5 px/notch @900, two cascaded lerps (.075 → τ 214 ms, then .15 → τ
// 103 ms; one notch 95 % settled ≈ 770 ms, peak ≈ 160 px/s) and a LEAD
// CLAMP: `targetY2 = clamp(targetY2, y ± 750·mult)` = ±0.5625 viewport —
// input running further ahead of the eye is discarded, so a 20-notch flick
// travels 880 px on igloo vs 2000 px on ours.
// Lenis has ONE damp stage (`damp(value, to, lerp·60, dt)`), so this lands
// at the midpoint: gain ×0.7 (70 px/notch; igloo 67.5, lusion 100), λ = 6 s⁻¹
// (lerp .1 → τ 158 ms; one notch 95 % ≈ 480 ms, peak ≈ 360 px/s vs 890), and
// the igloo lead clamp as a `virtualScroll` pre-filter (§5.2). Touch is not
// touched by any of it (syncTouch off; the clamp tests the event type).
// Do NOT go below lerp 0.09: the `round(value)===round(to)` completion of a
// 70 px notch then takes ~0.8 s and the snap engine's velocity gate stays
// open that long. Alternatives kept reachable: lerp .12 ×0.7 (lighter),
// lerp .15 ×0.75 (minimal touch).
/** KILL-SWITCH: false restores round 8-A (lerp 0.2, wheelMultiplier 1, no clamp). */
const SCROLL_FEEL_IGLOO = true;
/** Wheel gain. pre-2026-08-27: 1 (100 px/notch). igloo 0.675. */
const WHEEL_MULT = SCROLL_FEEL_IGLOO ? 0.7 : 1;
/** Lenis lerp (per-frame fraction @60 fps; λ = lerp·60). pre-2026-08-27: 0.2. */
const WHEEL_LERP = SCROLL_FEEL_IGLOO ? 0.1 : 0.2;
/** KILL-SWITCH for the lead clamp alone. pre-2026-08-27: no clamp. */
const SCROLL_CLAMP_ON = SCROLL_FEEL_IGLOO;
/** Max distance (fraction of innerHeight) the wheel TARGET may run ahead of
 * the animated position; input beyond it is discarded (igloo: 750·75e-5 =
 * 0.5625). Never binds below ~7 rapid notches, so single notches and
 * reading pace are unaffected; a 20-notch flick goes 1400 → ~1217 px. */
const WHEEL_LEAD_FRAC = 0.5625;

let instance: Lenis | null = null;
let rafId: number | null = null;
let refcount = 0;
// When the persistent R3F canvas is mounted, ITS loop pumps Lenis (single
// RAF authority, AGENTS.md §3a) and the private tick below stays parked.
let externallyPumped = false;

// --- B14: native instant-scroll re-sync ------------------------------------
// Verified against the installed lenis 1.3.23 source, not docs:
//   - Lenis registers its own `onNativeScroll` window listener at
//     construction. It re-syncs `animatedScroll = targetScroll = actualScroll`
//     on a native scroll — EXCEPT when `_preventNextNativeScrollEvent` is
//     armed (set after every immediate/completed scrollTo, cleared on Lenis's
//     own requestAnimationFrame — under background-tab rAF throttling the
//     flag lingers and swallows a REAL teleport), or while
//     `isScrolling === "smooth"` (the in-flight glide keeps overwriting the
//     teleported position from its own animatedScroll).
//   - `scrollTo(..., { immediate: true })` WITHOUT `force` early-returns
//     while `isStopped || isLocked` — the scroll-hijack gates (hero-intro
//     gate, preloader, founders rail, navbar menu) call `lenis.stop()`, which
//     is why the repro's console `scrollTo(0, {immediate:true})` was ignored.
//
// The listener below cannot tell a Lenis-originated scroll event from a
// native teleport (Lenis writes scrollY via wrapper.scrollTo every animate
// frame), so it only sets a flag; resyncFromNative() — run at the top of BOTH
// pump paths, before `instance.raf(time)` — decides, gated so it can never
// feed back:
//   - `isStopped || isLocked` → skip. A hijack gate owns scroll there, and
//     `lenis.start()`'s internal reset() re-reads actualScroll on release,
//     so that path self-heals without us fighting the gate's re-asserts.
//   - `isScrolling === "smooth"` → skip. The glide is writing scrollY itself
//     (its completion reset() re-syncs), and this is what keeps a smooth
//     wheel scroll — which fires a native scroll event every frame — from
//     ever entering the sync path.
//   - `|actualScroll − animatedScroll| ≤ 1px` → skip. Every Lenis-originated
//     event lands here (Lenis just wrote exactly that value), so the epsilon
//     is the second, independent no-feedback guard.
// The forced immediate scrollTo re-syncs both virtual values, emits ONE
// Lenis scroll event with the corrected progress and velocity 0 (its
// reset() runs before the emit and zeroes velocity — no lingering spike
// into damped uScrollVel readers; progress is NaN/Inf-safe, Lenis guards
// `limit === 0`). Downstream one-frame consumers see a single big progress
// delta — by design (the W4 straddle detector fires its cut spike once).
// The chain terminates: the re-sync's setScroll writes the position the
// page is already at, so it fires NO native scroll event (only the
// stale-limit clamp corner can move the page and fire one — Lenis's armed
// _preventNextNativeScrollEvent swallows its side, our flag is dropped by
// the next tick's epsilon). Under reduced motion the provider never
// acquires an instance, so no listener exists and this whole path is inert.
//
// ROUND 8-A INTERPLAY (the `duration`→`lerp` switch below): re-verified
// against lenis 1.3.23 — the smoothing law cannot reach this path.
//   - `scrollTo`'s `immediate` branch (dist/lenis.mjs L770–782) writes
//     animatedScroll/targetScroll, setScroll, reset(), emit() and RETURNS
//     before the `duration/easing/lerp` normalization (L784) and before
//     `animate.fromTo` (L786). Our forced re-sync never touches the knob.
//   - `force: true` still bypasses the `isStopped || isLocked` early return
//     (L720) — unchanged, that check reads neither.
//   - the `isScrolling === "smooth"` guard still holds during a wheel glide:
//     lerp mode goes through the SAME non-immediate `animate.fromTo`, whose
//     `onStart` fires SYNCHRONOUSLY inside `scrollTo` (L786 → Animate.fromTo
//     L110, `onStart?.()` L118) and whose `onUpdate` re-sets "smooth" every
//     frame (L796) — so the guard is armed from the wheel event itself,
//     before the next pump. Completion calls `reset()` (zeroes velocity,
//     re-reads actualScroll, L647–653), so the frame after a glide ends the
//     epsilon compare is ~0 and no spurious re-sync fires. Only the completion
//     CONDITION changed (rounded-value match instead of elapsed duration) —
//     the state machine is identical.
//   - the epsilon guard is a position compare and is law-agnostic.
// Net: B14's LOGIC is unchanged; only WHEN it re-arms after a wheel gesture
// moves. Honest numbers rather than the tempting "~250 ms" (that is the
// PERCEPTUAL 95 %-settled figure, not the completion): the lerp branch ends
// when `Math.round(value) === Math.round(target)` (L87), i.e. within ~0.5–1 px
// of target — ln(D/1)/12 ≈ 0.38 s for a 100 px notch, ~0.65 s for a 2000 px
// flick, versus a flat 0.9 s before. So it usually arms SOONER.
// The one asymmetric corner, recorded so nobody re-derives it: approaching a
// target whose fractional part sits just above .5 (from below) or just below
// it (from above), the rounded-match needs |Δ| < |frac − 0.5|, which for a
// frac within ~1e-4 of .5 stretches the tail to 1–3 s of SUB-PIXEL crawl
// (bounded — float64 convergence completes it; a new wheel event retargets
// `fromTo` and ends it immediately). It cannot strand the page: the position
// is already at target to within a pixel. Its only cost is that B14 (and
// Lenis's own `onNativeScroll`, which is likewise inert while "smooth") stay
// disarmed for that window — same class of hole as the old fixed 0.9 s, just
// rarer and occasionally longer.
let nativeScrollSeen = false;
const flagNativeScroll = () => {
  nativeScrollSeen = true;
};
// Hoisted so even the (rare) sync path allocates nothing of ours.
const RESYNC_OPTS = { immediate: true, force: true } as const;

function resyncFromNative() {
  if (!nativeScrollSeen || !instance) return;
  nativeScrollSeen = false;
  if (instance.isStopped || instance.isLocked) return;
  if (instance.isScrolling === "smooth") return;
  const actual = instance.actualScroll;
  if (Math.abs(actual - instance.animatedScroll) <= 1) return;
  // TASK 6 (section cuts): this is a programmatic jump — the PostFX cut
  // driver must latch it without firing the edge accent (.cut-tick).
  useScrollStore.getState().markTeleport();
  instance.scrollTo(actual, RESYNC_OPTS);
}

function tick(time: number) {
  if (!instance || externallyPumped) return;
  resyncFromNative();
  instance.raf(time);
  rafId = requestAnimationFrame(tick);
}

/**
 * Hand the RAF baton to (or take it back from) an external loop — the R3F
 * FrameDriver. Switching off external pumping restarts the private tick so
 * scrolling survives the canvas unmounting (tier degradation).
 */
export function setExternalPump(on: boolean) {
  externallyPumped = on;
  if (on) {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  } else if (instance && rafId === null) {
    rafId = requestAnimationFrame(tick);
  }
}

/** Advance Lenis from the external loop. No-op unless external pumping is on. */
export function pumpLenis(time: number) {
  if (!instance || !externallyPumped) return;
  resyncFromNative();
  instance.raf(time);
}

export function acquireLenis(): Lenis {
  if (!instance) {
    instance = new Lenis({
      // SMOOTHING LAW (round 8-A, 2026-08-22): lerp mode, λ = 12 s⁻¹.
      //
      // Was `duration: 0.9` + an out-expo easing: a FIXED-duration glide per
      // gesture, so one wheel notch and a hard flick both took 0.9 s to land.
      // lusion.co (dossier §2.2, `hoisted.js` ScrollPane.update) instead uses
      // an FPS-normalized exponential approach with `wheelEaseCoeff = 12`.
      // Verified against the installed lenis 1.3.23 source, not docs:
      //   - `Animate.advance` (dist/lenis.mjs L76–97) branches
      //     `if (duration && easing) … else if (lerp) …` — duration+easing
      //     WINS, so the lerp knob is dead code while either is set. Both had
      //     to go, not just `duration`.
      //   - the constructor (L435–436) back-fills the other half of the pair:
      //     a `duration` alone gets `defaultEasing`, an `easing` alone gets
      //     `duration = 1`. Passing neither is the only way into lerp mode.
      //   - the lerp branch is `damp(value, to, lerp * 60, dt)` =
      //     `1 − exp(−lerp·60·dt)` → λ = 0.2 × 60 = 12 s⁻¹, byte-equivalent
      //     to Lusion's coefficient. Time constant 83 ms; ~95 % settled
      //     250 ms after the last event.
      // Felt result: response scales with REMAINING DISTANCE — a notch dies
      // in ~0.25 s, a long flick glides proportionally further — instead of
      // every gesture costing the same 0.9 s. Heavier is 0.15 (λ=9); do not
      // go near igloo's double-lerp ~0.1, this is a document, not a canvas.
      //
      // This also puts the wheel path and the programmatic path on the same
      // law: `scrollTo` without explicit options inherits `options.lerp`
      // (L719), so the two call sites that pass NO options now ease
      // exponentially — the nav/in-page anchor glide (smooth-scroll-provider
      // `onClick`) and the failed-field focus scroll (start-intake-form
      // `focusFailedField`). That is exactly what Lusion does (their nav links
      // route through the same wheel smoothing, dossier §2.3), and both land
      // within a pixel in ~0.4–0.8 s, comfortably inside the provider's
      // 1100 ms snap-suspend backstop.
      //
      // EVERY OTHER call site is provably unaffected, but NOT for the reason
      // one would assume — read before touching:
      //   - `scroll-snap.ts` settles/steps pass BOTH `duration` and `easing`
      //     → `Animate.advance`'s duration branch, untouched.
      //   - the runway step glides (services-section L966, fit-section L818,
      //     founders-rail L1276/L2067) pass `{ duration: 0.6 }` ONLY. They
      //     used to inherit the `easing` deleted above; now `scrollTo` L784
      //     back-fills lenis's `defaultEasing` — which is
      //     `(t) => Math.min(1, 1.001 - 2 ** (-10 * t))` (L373), BYTE-IDENTICAL
      //     to the curve removed here. So their feel is unchanged by luck of
      //     an exact match, not by contract: if this easing is ever restored
      //     as something else, those four sites silently change with it.
      //   - `{ immediate: true }` teleports (route reset, B14 re-sync, gate
      //     jumps) return before the normalization entirely.
      //
      // 2026-08-27 SCROLL FEEL: the value below is now WHEEL_LERP (0.1,
      // λ = 6 s⁻¹) — see the constants block at the top of this file. The
      // "do not go near igloo's ~0.1" warning above was written against the
      // double-lerp CASCADE (S-shaped onset); a single stage at .1 is still a
      // document glide, just with a 158 ms time constant. Every claim above
      // about WHICH call sites are affected still holds (lerp mode, same
      // branch); only the tail length changed: a 100 px notch now completes
      // (rounded match) in ln(100)/6 ≈ 0.77 s, a 3000 px anchor glide in
      // ln(3000)/6 ≈ 1.33 s — the provider's 1100 ms snap-suspend backstop
      // no longer covers the longest anchor jump (dossier §6; the fix, an
      // explicit `{ duration }` on that scrollTo, lives in
      // smooth-scroll-provider.tsx, not here).
      lerp: WHEEL_LERP, // pre-2026-08-27: 0.2
      wheelMultiplier: WHEEL_MULT, // pre-2026-08-27: (default) 1
      // Lead clamp pre-filter (igloo parity). `virtualScroll` receives the
      // MUTABLE {deltaX, deltaY, event} object before Lenis destructures it
      // (lenis 1.3.23 dist/lenis.mjs L556-558), and `deltaY` is already
      // ×wheelMultiplier there (VirtualScroll.onWheel L356-357 runs before
      // emit). We cap `targetScroll + deltaY` to animatedScroll ± lead and
      // write the difference back. Wheel only: touch/pointer pass through.
      virtualScroll: (data) => {
        if (!SCROLL_CLAMP_ON || !instance) return true;
        const type = data.event?.type ?? "";
        if (!type.includes("wheel")) return true;
        const lead = WHEEL_LEAD_FRAC * window.innerHeight;
        const l = instance;
        const want = l.targetScroll + data.deltaY;
        const capped = Math.min(Math.max(want, l.animatedScroll - lead), l.animatedScroll + lead);
        data.deltaY = capped - l.targetScroll;
        return true;
      },
      // Wheel smoothing only — `syncTouch` stays OFF, on purpose.
      //
      // (The old reason here, "we don't run the scene on mobile anyway", is
      // no longer true and was never the real one: mobile is actively being
      // built out. The real reasons:)
      //
      //  1. syncTouch re-implements momentum in JS on top of the platform's
      //     own. On iOS the two fight: flings decelerate wrong, rubber-band
      //     overscroll and pull-to-refresh stop working, and the bounce at
      //     the document ends is lost.
      //  2. We do not need it to be CORRECT. Every choreographed beat on the
      //     site is driven by ScrollTrigger progress, which is a pure
      //     function of the scroll POSITION — it resolves identically
      //     against a native touch scroll and a smoothed one. Smoothing
      //     would only change how the input feels, and native touch inertia
      //     already feels better than anything we would synthesise.
      //  3. Touch scrolling stays on the compositor. syncTouch moves it onto
      //     the main thread, where it competes with the same rAF budget the
      //     WebGL beats need.
      //
      // So: native touch scrolling is the deliberate choice. Do not "fix"
      // this by adding syncTouch.
      smoothWheel: true,
    });
    // B14: flag native scroll events for the frame-pipeline re-sync above.
    // Passive + flag-only (no work, no allocation in the handler); lifecycle
    // matches the instance exactly, so reduced motion (which never acquires)
    // never installs it.
    nativeScrollSeen = false;
    window.addEventListener("scroll", flagNativeScroll, { passive: true });
    if (!externallyPumped) {
      rafId = requestAnimationFrame(tick);
    }
  }
  refcount++;
  return instance;
}

export function releaseLenis() {
  refcount = Math.max(0, refcount - 1);
  if (refcount === 0 && instance) {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    window.removeEventListener("scroll", flagNativeScroll);
    nativeScrollSeen = false;
    instance.destroy();
    instance = null;
  }
}

export function getLenis(): Lenis | null {
  return instance;
}
