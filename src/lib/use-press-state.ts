"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * usePressState — press feedback for touch (MOBILE_AUDIT §4, primitive M-4).
 *
 * A fine pointer gets three layers of "this is alive under you": the particle
 * cursor, the magnetic CTA pull and the card tilt/sheen. All three bail on a
 * coarse pointer with NOTHING in their place (custom-cursor.tsx:90-93,
 * magnetic.tsx:61-64, card-tilt-controller.tsx:55-59), so a touch user pressing
 * a card gets the browser default and nothing else — most visibly on
 * /resources, whose cards answer a tap with literally no state change (D-15).
 *
 * This hook is that missing answer: hold a surface and it takes a press pose
 * (a 1.5% compression) with a glow blooming from the exact point you touched.
 * Let go — or start scrolling — and it releases.
 *
 * CONTRACT
 *
 *   const pressRef = usePressState();
 *   <article ref={pressRef} className="press-surface">…</article>
 *
 * Returns a STABLE ref callback; one call registers N elements, which may
 * mount, unmount and re-order freely (the /resources FLIP re-sort does exactly
 * that). The callback returns a React 19 ref-cleanup, so detach is precise.
 *
 * The hook owns STATE ONLY. While held, the element carries:
 *
 *   data-pressed="true"          the state flag
 *   --press-x / --press-y        the touch point in element-local px
 *
 * Everything you SEE lives in globals.css on `.press-surface` — one place to
 * tune the pose, the glow and its curve, and one place where the whole visual
 * is already scoped inside `@media (pointer: coarse)`. Consumers therefore opt
 * in twice, deliberately: the ref wires the state, the class buys the paint.
 *
 * TWO MODES, resolved from live media queries (subscribed, never one-shot —
 * D-18 is the bug of sampling once; both re-resolve on `change`):
 *
 *   1. `inert` — `(hover: hover) and (pointer: fine)` OR
 *      `prefers-reduced-motion: reduce`. No listeners, no attribute, ever.
 *
 *      Desktop is inert because press feedback is the REPLACEMENT for hover,
 *      tilt and magnetism, not an addition to them — a fine pointer already
 *      has all three, and the CSS half of this primitive does not even exist
 *      outside the coarse media block.
 *
 *      Reduced motion is inert because — unlike its sibling `useCentreFocus`,
 *      which must stay ON under RM or the content it reveals is lost forever —
 *      this primitive carries no content. It is pure feedback, so switching it
 *      off costs a reduced-motion user exactly nothing.
 *
 *   2. `press` — coarse pointer, motion allowed. `pointerdown` on a registered
 *      element arms the pose; the release listeners live on `window`, so the
 *      state can never wedge open if the finger drifts off the element.
 *
 * SCROLLING WINS, ALWAYS
 *
 * A press that turns out to be the start of a scroll must release cleanly, and
 * the press must never be able to prevent the scroll in the first place:
 *
 *   - every listener is registered `{ passive: true }` and NOTHING calls
 *     preventDefault, so the compositor is never blocked waiting on us;
 *   - `pointercancel` — which is exactly what the browser fires when it takes
 *     the gesture over for scrolling — releases;
 *   - a `pointermove` past `tolerance` (10px) releases too, because a pointer
 *     that has travelled that far is a drag, and some engines are late with
 *     `pointercancel` on a slow scroll start;
 *   - `pointerleave` releases, so dragging off a target drops its pose.
 *
 * COST
 *
 * No React state, no rect reads per frame, no rAF: ONE `getBoundingClientRect`
 * per press (a discrete gesture, not a loop), two style writes, one attribute.
 * At rest the only listeners are two per element; the three window listeners
 * exist strictly for the duration of a hold.
 *
 * NOT FOR BUTTONS. `ui/button.tsx` already ships an asymmetric press via
 * `motion-safe:active:scale-[0.97]` + `active:duration-100`, which works on
 * touch as-is. Applying this on top would stack two compressions on one
 * gesture. M-4 is for the surfaces that have no `:active` grammar at all —
 * cards, link rows, bare pills.
 */

/** Attribute written on the held element. Consumers key off `[data-pressed="true"]`. */
const PRESS_ATTR = "data-pressed";
/** Touch point, element-local px. Consumed as the glow origin in globals.css. */
const PRESS_X = "--press-x";
const PRESS_Y = "--press-y";
/** Pointer travel (px) past which a press is re-read as a scroll/drag. */
const DEFAULT_TOLERANCE = 10;

export type PressStateOptions = {
  /**
   * Pointer travel in px that reclassifies a press as a scroll and releases.
   * Raise it for surfaces that expect a little wobble; never raise it far
   * enough that a real scroll keeps the pose lit.
   */
  tolerance?: number;
};

export type PressStateRef = (el: HTMLElement | null) => void | (() => void);

/**
 * The event machine, built once per hook instance and shared by every element
 * it registers. Plain closure variables rather than refs: there is exactly one
 * held element at a time (a second finger on a second card is not a gesture
 * this site has any use for), and nothing here is read during render.
 */
function createPressController(toleranceRef: { current: number }) {
  let held: HTMLElement | null = null;
  let pointerId = -1;
  let originX = 0;
  let originY = 0;

  const release = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onEnd);
    window.removeEventListener("pointercancel", onEnd);
    const el = held;
    held = null;
    pointerId = -1;
    // The attribute goes, the coordinates STAY: --press-x/--press-y are what
    // the fade-out is still painting from, and clearing them would snap the
    // dying glow back to the centre of the element.
    if (el) el.removeAttribute(PRESS_ATTR);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    if (
      Math.hypot(e.clientX - originX, e.clientY - originY) <=
      toleranceRef.current
    ) {
      return;
    }
    release();
  };

  const onEnd = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    release();
  };

  const onLeave = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    release();
  };

  const onDown = (e: PointerEvent) => {
    // Coarse mode still sees mouse events on a hybrid (a phone with a mouse, a
    // tablet in desktop mode): those keep the hover grammar, not this one.
    if (!e.isPrimary || e.pointerType === "mouse") return;
    const el = e.currentTarget as HTMLElement | null;
    if (!el) return;
    release(); // defensive: never hold two surfaces at once
    const rect = el.getBoundingClientRect();
    el.style.setProperty(PRESS_X, `${Math.round(e.clientX - rect.left)}px`);
    el.style.setProperty(PRESS_Y, `${Math.round(e.clientY - rect.top)}px`);
    el.setAttribute(PRESS_ATTR, "true");
    held = el;
    pointerId = e.pointerId;
    originX = e.clientX;
    originY = e.clientY;
    // Release on window, not on the element: a finger that slides off a card
    // still fires its pointerup here, so a pose can never be stranded lit.
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onEnd, { passive: true });
    window.addEventListener("pointercancel", onEnd, { passive: true });
  };

  return {
    bind(el: HTMLElement) {
      el.addEventListener("pointerdown", onDown, { passive: true });
      el.addEventListener("pointerleave", onLeave, { passive: true });
    },
    unbind(el: HTMLElement) {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerleave", onLeave);
      if (held === el) release();
      el.removeAttribute(PRESS_ATTR);
    },
    release,
  };
}

type PressController = ReturnType<typeof createPressController>;

export function usePressState(options: PressStateOptions = {}): PressStateRef {
  const { tolerance = DEFAULT_TOLERANCE } = options;
  // Read through a ref so a caller can re-tune the tolerance without the
  // controller (and therefore every bound listener) being rebuilt.
  const toleranceRef = useRef(tolerance);
  toleranceRef.current = tolerance;

  // Everything is refs: registering an element must never re-render the list
  // that owns it, and neither must pressing it.
  const elementsRef = useRef<Set<HTMLElement>>(new Set());
  const modeRef = useRef<"inert" | "press">("inert");
  const controllerRef = useRef<PressController | null>(null);
  if (controllerRef.current === null) {
    // Lazy init rather than useEffect: `register` can fire before effects run
    // (refs are attached first), so the controller has to exist by then. The
    // factory only closes over locals — no DOM touched, no listener added.
    controllerRef.current = createPressController(toleranceRef);
  }

  // Stable across the component's whole life (empty deps, refs only) so a card
  // never re-attaches its ref just because the parent re-rendered — e.g. the
  // EN/IT toggle, which re-renders every card body without remounting it.
  const register = useCallback<PressStateRef>((el) => {
    if (!el) return; // pre-19 detach path; React 19 uses the cleanup below
    elementsRef.current.add(el);
    if (modeRef.current === "press") controllerRef.current?.bind(el);
    return () => {
      elementsRef.current.delete(el);
      controllerRef.current?.unbind(el);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const controller = controllerRef.current;
    if (!controller) return;

    // Both axes are subscribed: a mouse plugged into a tablet, an OS
    // reduced-motion toggle, or a devtools device-emulation flip must all
    // re-resolve without a reload.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const teardown = () => {
      controller.release();
      for (const el of elementsRef.current) controller.unbind(el);
    };

    const apply = () => {
      teardown();
      if (fine.matches || reduced.matches) {
        modeRef.current = "inert";
        return;
      }
      modeRef.current = "press";
      for (const el of elementsRef.current) controller.bind(el);
    };

    apply();
    fine.addEventListener("change", apply);
    reduced.addEventListener("change", apply);

    return () => {
      fine.removeEventListener("change", apply);
      reduced.removeEventListener("change", apply);
      teardown();
      modeRef.current = "inert";
    };
  }, []);

  return register;
}

export default usePressState;
