/**
 * Global pointer state for the WebGL/cursor layer.
 *
 * Mirrors `scrollStore.ts`: a transient zustand store written outside React's
 * render path and READ via `getState()` inside the single render loop — pointer
 * movement never causes a React re-render. It is the one place that owns the
 * cursor position, its smoothed follower and its velocity, so the custom
 * cursor, the magnetic CTAs and the WebGPU fluid flowmap can all share one
 * source of truth (and one event listener).
 *
 * COORDINATES
 *   raw / smooth : clip space [0..1], origin TOP-LEFT (x→right, y→down) — the
 *     same convention as `e.clientX / innerWidth`. The flowmap consumer flips Y
 *     itself when stamping into the render target (GL origin is bottom-left).
 *   vel          : smoothed velocity in clip-space units per second.
 *
 * SINGLE LOOP (no second rAF)
 *   A single window `pointermove`/`pointerdown`/`pointerup` listener (installed
 *   by `installPointerTracking`, gated exactly like custom-cursor.tsx — skipped
 *   on coarse pointers and under prefers-reduced-motion) writes ONLY the raw
 *   target. All smoothing + velocity is computed in `updatePointer(dt)`, called
 *   once per frame from the existing FrameDriver `useFrame` — never from its own
 *   requestAnimationFrame.
 *
 * COARSE POINTERS (mobile-parity plan Phase 4e)
 *   The mouse listener stays a no-op. The ONE alternative source is the gyro
 *   (`lib/gyro-parallax.ts`: deviceorientation after the first tap, half the
 *   mouse amplitude, same `raw` → same `updatePointer` smoothing). It is behind
 *   `GYRO_PARALLAX_ENABLED` (owner Decision 7) — while false, coarse pointers
 *   register nothing at all, exactly as before.
 */
import { create } from "zustand";
import { GYRO_PARALLAX_ENABLED, installGyroParallax } from "@/lib/gyro-parallax";

export interface PointerVec {
  x: number;
  y: number;
}

interface PointerState {
  /** Raw pointer in clip space [0..1], top-left origin. Written by the listener. */
  raw: PointerVec;
  /** Critically-damped follower of `raw`, advanced in updatePointer(dt). */
  smooth: PointerVec;
  /** Smoothed pointer velocity (clip units / second). */
  vel: PointerVec;
  /** True while a primary button is held. */
  down: boolean;
  /** True once at least one pointermove has landed (so the fluid can stay idle). */
  active: boolean;
  setRaw: (x: number, y: number) => void;
  setDown: (down: boolean) => void;
}

export const usePointerStore = create<PointerState>((set) => ({
  raw: { x: 0.5, y: 0.5 },
  smooth: { x: 0.5, y: 0.5 },
  vel: { x: 0, y: 0 },
  down: false,
  active: false,
  setRaw: (x, y) => set({ raw: { x, y }, active: true }),
  setDown: (down) => set({ down }),
}));

/**
 * Advance the smoothed pointer + velocity by `dt` seconds. Called once per frame
 * from the single render loop (FrameDriver). Pure mutation of the store's
 * `smooth`/`vel` objects — written back via a single `setState` so the values
 * stay readable through `getState()` without per-frame reactive churn.
 *
 * Smoothing is a frame-rate-independent exponential approach (the same shape as
 * THREE.MathUtils.damp): `smooth += (raw - smooth) * (1 - exp(-rate*dt))`.
 * Velocity is (newSmooth - prevSmooth) / dt, low-pass filtered so a single jumpy
 * frame doesn't spike the fluid splat.
 */
const SMOOTH_RATE = 14; // higher = snappier follow
const VEL_DECAY = 8; // velocity low-pass; higher = more responsive, less smooth

export function updatePointer(dt: number) {
  // Guard against pathological dt (tab refocus, first frame).
  const d = Math.min(Math.max(dt, 0.0001), 0.1);
  const s = usePointerStore.getState();
  const { raw, smooth, vel } = s;

  const k = 1 - Math.exp(-SMOOTH_RATE * d);
  const nx = smooth.x + (raw.x - smooth.x) * k;
  const ny = smooth.y + (raw.y - smooth.y) * k;

  // Instantaneous velocity of the smoothed point, then low-pass it.
  const ivx = (nx - smooth.x) / d;
  const ivy = (ny - smooth.y) / d;
  const vk = 1 - Math.exp(-VEL_DECAY * d);
  const vx = vel.x + (ivx - vel.x) * vk;
  const vy = vel.y + (ivy - vel.y) * vk;

  s.smooth.x = nx;
  s.smooth.y = ny;
  s.vel.x = vx;
  s.vel.y = vy;
  // One shallow notify so subscribers (none in the hot path) and getState()
  // both see fresh values. The mutated objects keep identity, which is fine —
  // every consumer reads through getState() per-frame, never via a selector.
  usePointerStore.setState({ smooth: s.smooth, vel: s.vel });
}

/**
 * Install the single window pointer listener. Returns a teardown fn.
 *
 * GATING (identical to custom-cursor.tsx): no-op (and returns a no-op cleanup)
 * under prefers-reduced-motion, and on coarse pointers for the MOUSE listener —
 * on those devices nothing tracks the pointer, the cursor stays native and the
 * fluid never runs. A coarse pointer without reduced motion may instead get the
 * gyro source (Phase 4e, `lib/gyro-parallax.ts`) — never both — and only while
 * `GYRO_PARALLAX_ENABLED` is true; with the flag false the coarse branch is the
 * same no-op as before (no listener registered).
 *
 * Refcounted so multiple consumers (cursor + fluid) share ONE listener; the
 * last release removes it.
 */
let listenerRefcount = 0;
let detach: (() => void) | null = null;

export function installPointerTracking(): () => void {
  if (typeof window === "undefined") return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {};
  }
  if (window.matchMedia("(pointer: coarse)").matches) {
    // Alternative source, never two: gyro (refcounted on its own side, gated on
    // fxBudget.gyroParallax + RM inside). Structurally dead while the flag is
    // false — `installGyroParallax` is not even called.
    if (!GYRO_PARALLAX_ENABLED) return () => {};
    return installGyroParallax(usePointerStore.getState().setRaw);
  }

  listenerRefcount++;
  if (!detach) {
    const { setRaw, setDown } = usePointerStore.getState();
    const onMove = (e: PointerEvent) => {
      setRaw(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
    };
    const onDown = () => setDown(true);
    const onUp = () => setDown(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    detach = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }

  return () => {
    listenerRefcount = Math.max(0, listenerRefcount - 1);
    if (listenerRefcount === 0 && detach) {
      detach();
      detach = null;
    }
  };
}
