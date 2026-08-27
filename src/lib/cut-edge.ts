/**
 * cut-edge — the PURE section-cut edge/scrub law (TASK 6, igloo grammar,
 * scratchpad dossier section-transitions.md §3.3 items 1/5/6).
 *
 * DOM-free and three-free on purpose: this module is consumed by the PostFX
 * cut driver (src/webgl/PostFXNodes.tsx, `CUTS_V2` path) and by a node-run
 * self-test (scratchpad pw/ut/cut-edge.test.cjs). Everything here is a
 * function of the scroll position — no timers, no velocity — so the forward
 * and backward traversals of a seam are mirror images by construction.
 *
 *  • `wipeU(p, c, h)`   — igloo §2.2 position law: 0 when the content edge
 *                          enters at the viewport bottom (p = c − h), 0.5 at
 *                          the centre (p = c), 1 when it leaves at the top.
 *  • `bump(u)`          — the scrubbed accent bell centred on the crossing:
 *                          smoothstep(.35,.5,u)·(1 − smoothstep(.5,.65,u)).
 *  • `stepToward(cur, target, maxStep)` — the MIN-CYCLE rate limiter (TASK C,
 *                          2026-08-27): the DISPLAYED scrub follows the
 *                          position-law target with |du/dt| ≤ 1/CUT_MIN_CYCLE_S,
 *                          so a flick that crosses a window in 100 ms still
 *                          shows a ≥ 0.45 s sweep; symmetric (reverse mid-cycle
 *                          reverses); inactive at reading pace (the step is
 *                          smaller than the cap, so display ≡ target).
 *  • `stepCutEdges(...)` — the hysteresis-armed edge detector that fires the
 *                          ONE wall-clock accent (.cut-tick) exactly once per
 *                          straddle per direction: armed only outside the
 *                          window with margin (|p − c| > 1.05·h), disarmed on
 *                          fire, re-armed only after leaving. Programmatic
 *                          jumps (teleport flag) latch the position without
 *                          firing, so a gate can never manufacture a crossing.
 */

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

const smoothstep01 = (e0: number, e1: number, x: number): number => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/** Window scrub value for boundary `c` with half-window `h` (progress units). */
export const wipeU = (p: number, c: number, h: number): number =>
  h > 0 ? clamp01((p - c + h) / (2 * h)) : 0;

/** Scrubbed accent bell — a 0.3-window bell centred on the crossing (u = 0.5). */
export const bump = (u: number): number =>
  smoothstep01(0.35, 0.5, u) * (1 - smoothstep01(0.5, 0.65, u));

/**
 * Rate-limited follow: move `cur` toward `target` by at most `maxStep`
 * (= dt / CUT_MIN_CYCLE_S). Returns `target` itself when within reach, so
 * at reading pace the position law holds EXACTLY (no lag, no drift).
 */
export const stepToward = (cur: number, target: number, maxStep: number): number => {
  const d = target - cur;
  if (d > maxStep) return cur + maxStep;
  if (d < -maxStep) return cur - maxStep;
  return target;
};

/** Hysteresis margin: armed only when |p − c| > ARM_MARGIN·h. */
export const ARM_MARGIN = 1.05;

export interface CutEdgeState {
  /** 1 = armed (may fire on the next straddle), 0 = spent until re-armed. */
  armed: Uint8Array;
  /** Previous frame's progress; NaN = disarmed sentinel (latch-only frame). */
  prevP: number;
  /**
   * Consumed by the next latch frame: `true` = a RE-MEASURE latch (the
   * boundaries moved under a reader who is still scrolling) — boundaries the
   * reader is inside of KEEP their arm state (an armed, not-yet-crossed seam
   * still fires on its straddle; a spent one stays spent, so the P7 "seam
   * moved back across the reader" case still cannot double-fire). `false`
   * (default) = mount / route-entry / teleport semantics — inside boundaries
   * are disarmed until the reader leaves with margin. Live probe round 1
   * (2026-08-27): a body-reflow re-measure while approaching a seam inside
   * its window used to disarm it and swallow the crossing's tick.
   */
  latchKeep: boolean;
}

export const createCutEdgeState = (capacity: number): CutEdgeState => ({
  armed: new Uint8Array(capacity),
  prevP: Number.NaN,
  latchKeep: false,
});

/** Fired at most once per call: the crossed boundary nearest the landing point. */
export type CutEdgeFire = (idx: number, dir: 1 | -1) => void;

/**
 * Advance the detector by one frame. Allocation-free.
 *
 * @param st        hoisted state (armed flags + prevP)
 * @param cuts      boundary positions (progress space), document order
 * @param halves    per-boundary half-window h (progress space)
 * @param count     wired boundary count (≤ capacity)
 * @param p         this frame's scroll progress
 * @param teleport  true when this frame's motion is a programmatic jump —
 *                  the position is latched, nothing fires, and every boundary
 *                  left behind is disarmed until the reader leaves its window
 * @param fire      accent callback (event cadence)
 * @returns the frame direction (1 down, −1 up, 0 when p did not move)
 */
export function stepCutEdges(
  st: CutEdgeState,
  cuts: ArrayLike<number>,
  halves: ArrayLike<number>,
  count: number,
  p: number,
  teleport: boolean,
  fire: CutEdgeFire,
): 1 | -1 | 0 {
  const prev = st.prevP;
  if (Number.isNaN(prev)) {
    // Latch-only frame (mount / re-measure / route entry): arm exactly the
    // boundaries the reader is OUTSIDE of. Inside ones are disarmed (mount /
    // route entry) or, on a re-measure latch (`latchKeep`), left as they
    // were — so a re-measure while inside a window (P7) cannot re-arm the
    // boundary just fired, and cannot disarm one the reader has yet to cross.
    const keep = st.latchKeep;
    for (let i = 0; i < count; i++) {
      if (Math.abs(p - cuts[i]) > ARM_MARGIN * halves[i]) st.armed[i] = 1;
      else if (!keep) st.armed[i] = 0;
    }
    st.latchKeep = false;
    st.prevP = p;
    return 0;
  }
  // Rest frames do NOT re-arm (TASK C probe, 2026-08-27, tried and reverted:
  // re-arming at rest let a native jump back across a just-teleported seam
  // fire on its first motion frame, before B14 flags it — the "does not fire
  // on the way back" contract below relies on the arm staying spent until a
  // MOTION frame outside the margin, which real scrolling always produces).
  if (p === prev) return 0;
  const dir: 1 | -1 = p > prev ? 1 : -1;
  let crossed = -1;
  let crossedD = Infinity;
  for (let i = 0; i < count; i++) {
    const c = cuts[i];
    const h = halves[i];
    const d = p - c;
    const ad = d < 0 ? -d : d;
    const straddle = (prev >= c) !== (p >= c);
    if (straddle) {
      if (st.armed[i] === 1 && !teleport) {
        if (ad < crossedD) {
          crossedD = ad;
          crossed = i;
        }
      }
      // A straddle spends the arm whether or not it fired (a teleport across
      // a boundary must not fire on the way back either) — re-armed below
      // only once the reader is outside the window with margin.
      st.armed[i] = 0;
    } else if (ad > ARM_MARGIN * h) {
      st.armed[i] = 1;
    }
  }
  st.prevP = p;
  if (crossed !== -1) fire(crossed, dir);
  return dir;
}
