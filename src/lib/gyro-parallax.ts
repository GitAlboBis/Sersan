/**
 * Gyro parallax — the touch source for the global pointer (mobile-parity plan
 * 2026-08-17, Phase 4e; Lusion `DeviceOrientationControls` after first tap,
 * LUSION_DOSSIER §4 row "Camera").
 *
 * On a fine pointer `pointerStore.installPointerTracking()` feeds `raw` from
 * `pointermove`; on a coarse pointer that path is a no-op, so every consumer
 * that reads `usePointerStore.getState().smooth` (hero mark tilt, logo hover,
 * camera micro-parallax) sits parked at centre. This module is the ONE
 * alternative source for coarse pointers ("una sorgente alternativa, mai due"):
 * `deviceorientation` beta/gamma → the same normalised `raw` the mouse writes,
 * at HALF the mouse amplitude, and the smoothing stays exactly the mouse path
 * (`updatePointer(dt)` in FrameDriver — this module writes only `raw`).
 *
 * WIRING
 *   `installPointerTracking()` (pointerStore.ts) delegates here on coarse
 *   pointers when — and only when — `GYRO_PARALLAX_ENABLED` is true. With the
 *   flag false the call site is structurally dead: nothing in this module runs,
 *   no listener of any kind is registered.
 *
 * GATES (all at install time; the last two are also live-unsubscribed)
 *   1. `GYRO_PARALLAX_ENABLED` (owner Decision 7 — see below)
 *   2. `useTierStore.getState().fxBudget.gyroParallax` (level 2 + coarse +
 *      `DeviceOrientationEvent` present; false again after `stepDownBudget()`)
 *   3. `(pointer: coarse)` matches
 *   4. NOT `(prefers-reduced-motion: reduce)` — an RM `change` tears down
 *
 * PERMISSION (iOS)
 *   `DeviceOrientationEvent.requestPermission` is a Safari-only static that is
 *   NOT declared on `lib.dom.d.ts` (TS 5.9): it is feature-detected through a
 *   LOCAL type (plan Phase 0 "Gyro" block — a raw call is a tsc error) and
 *   called ONLY inside the first `pointerup`/`touchend` gesture, exactly like
 *   Lusion's `properties.onFirstClicked`. Browsers without the static (Android
 *   Chrome) subscribe on that same first tap — one code path, no listener
 *   before the user has touched the page.
 *
 * MAPPING
 *   The first reading is taken as the REST pose (nobody holds a phone flat), so
 *   the parallax is a delta from how the reader is already holding it. ±TILT_DEG
 *   of delta maps to ±HALF_RANGE around centre (mouse range is ±0.5 → gyro is
 *   ±0.25), clamped. Axes follow `screen.orientation.angle` so landscape does
 *   not swap left/right with up/down.
 */
import { useTierStore } from "@/webgl/store/tierStore";

/**
 * owner Decision 7 in plans/2026-08-17-mobile-parity.md — APPROVED 2026-08-18
 * (delegated: the iOS system permission prompt on the first tap is accepted;
 * Lusion does the same). Kill-switch: flip to false and the coarse branch of
 * `installPointerTracking()` is structurally dead again (no listener at all).
 */
export const GYRO_PARALLAX_ENABLED = true;

/** Tilt delta (degrees, either axis) that reaches the full half-range. */
const TILT_DEG = 20;
/** Half the mouse amplitude: raw ∈ [0.25, 0.75] instead of [0, 1]. */
const HALF_RANGE = 0.25;

/** Sink for the normalised pointer — `pointerStore.setRaw` in production. */
export type GyroSink = (x: number, y: number) => void;

/**
 * Local, typed feature-detect for the Safari-only static (Phase 0 "Gyro"). We
 * never widen the global `DeviceOrientationEvent` type — a local view is
 * enough and keeps `lib.dom.d.ts` untouched.
 */
type DOEWithPermission = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function orientationAngle(): number {
  if (typeof screen === "undefined") return 0;
  // `screen.orientation` is typed as always-present but is undefined on older
  // iOS Safari at runtime; read it defensively.
  const so = (screen as { orientation?: { angle?: number } }).orientation;
  return typeof so?.angle === "number" ? so.angle : 0;
}

let refcount = 0;
let detach: (() => void) | null = null;

/**
 * Install the gyro source (refcounted like the mouse listener; the last release
 * tears everything down). Returns a teardown fn. A no-op (returning a no-op
 * cleanup) whenever any gate above fails, so callers can install blindly.
 */
export function installGyroParallax(sink: GyroSink): () => void {
  if (!GYRO_PARALLAX_ENABLED) return () => {};
  if (typeof window === "undefined") return () => {};
  if (!useTierStore.getState().fxBudget.gyroParallax) return () => {};
  const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMq.matches) return () => {};
  if (!window.matchMedia("(pointer: coarse)").matches) return () => {};
  if (!("DeviceOrientationEvent" in window)) return () => {};

  refcount++;
  if (!detach) {
    let rest: { beta: number; gamma: number } | null = null;
    let listening = false;
    let fed = false;
    let torn = false;

    const onOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta;
      const gamma = e.gamma;
      if (beta === null || gamma === null) return;
      if (!rest) rest = { beta, gamma };
      fed = true;
      // Delta from the rest pose, in degrees.
      const dBeta = beta - rest.beta; // front/back tilt → screen Y
      const dGamma = gamma - rest.gamma; // left/right tilt → screen X
      // Rotate into screen axes for the current orientation.
      let dx: number;
      let dy: number;
      switch (orientationAngle()) {
        case 90:
          dx = dBeta;
          dy = -dGamma;
          break;
        case 180:
          dx = -dGamma;
          dy = -dBeta;
          break;
        case 270:
        case -90:
          dx = -dBeta;
          dy = dGamma;
          break;
        default:
          dx = dGamma;
          dy = dBeta;
      }
      // ±TILT_DEG → ±HALF_RANGE around centre, clamped. Tilting the top of the
      // phone away from the reader (beta up) looks "up" the page (y down in
      // the top-left convention), so Y is inverted like a mouse moving up.
      const nx = 0.5 + Math.max(-1, Math.min(1, dx / TILT_DEG)) * HALF_RANGE;
      const ny = 0.5 - Math.max(-1, Math.min(1, dy / TILT_DEG)) * HALF_RANGE;
      sink(nx, ny);
    };

    const subscribe = () => {
      if (torn || listening) return;
      listening = true;
      window.addEventListener("deviceorientation", onOrientation, {
        passive: true,
      });
    };

    // First tap = user activation. iOS: ask permission inside the gesture, then
    // subscribe on "granted"; everyone else: subscribe straight away.
    // `touchend` is an activation-triggering event; a TOUCH `pointerup` is not
    // (HTML spec lists `pointerup` only for pointerType "mouse"), and calling
    // `requestPermission()` outside an activation rejects — so a touch/pen
    // pointerup is ignored and the tap is taken from its `touchend`.
    const onFirstTap = (e: Event) => {
      if (
        e.type === "pointerup" &&
        (e as PointerEvent).pointerType !== "mouse"
      ) {
        return;
      }
      window.removeEventListener("pointerup", onFirstTap);
      window.removeEventListener("touchend", onFirstTap);
      if (torn) return;
      const DOE = DeviceOrientationEvent as unknown as DOEWithPermission;
      if (typeof DOE.requestPermission === "function") {
        DOE.requestPermission()
          .then((state) => {
            if (state === "granted") subscribe();
          })
          .catch(() => {
            /* denied / not in a gesture — stay parked at centre */
          });
      } else {
        subscribe();
      }
    };
    window.addEventListener("pointerup", onFirstTap, { passive: true });
    window.addEventListener("touchend", onFirstTap, { passive: true });

    // Live gates: an OS reduced-motion flip or a budget step-down (level 2→1
    // clears `gyroParallax`) tears the source down and parks the pointer.
    const onReducedChange = () => {
      if (reducedMq.matches) teardown();
    };
    reducedMq.addEventListener("change", onReducedChange);
    const unsubTier = useTierStore.subscribe((s, prev) => {
      if (
        s.fxBudget.gyroParallax !== prev.fxBudget.gyroParallax &&
        !s.fxBudget.gyroParallax
      ) {
        teardown();
      }
    });

    const teardown = () => {
      if (torn) return;
      torn = true;
      window.removeEventListener("pointerup", onFirstTap);
      window.removeEventListener("touchend", onFirstTap);
      if (listening) {
        window.removeEventListener("deviceorientation", onOrientation);
        listening = false;
      }
      reducedMq.removeEventListener("change", onReducedChange);
      unsubTier();
      // Park the follower back at centre (the smoothed path eases there) —
      // only if we ever wrote to it: `setRaw` also flips `active`, and a
      // never-fed pointer must stay `active:false` for the consumers that key
      // hover on it (RouteHero logo, HeroLogo tilt).
      if (fed) sink(0.5, 0.5);
      detach = null;
      // An INTERNAL teardown (RM flipped on, budget stepped down) ends the
      // source for every consumer at once: reset the refcount so releases from
      // consumers installed before this point become no-ops and a later fresh
      // install starts from zero (otherwise a stale count could keep the next
      // install's listeners alive after its own consumers are gone).
      refcount = 0;
    };
    detach = teardown;
  }

  return () => {
    refcount = Math.max(0, refcount - 1);
    if (refcount === 0 && detach) detach();
  };
}
