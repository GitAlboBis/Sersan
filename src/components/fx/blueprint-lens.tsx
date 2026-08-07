"use client";

/**
 * BlueprintLens — the /resources cursor lens (WOW wave, package 3).
 *
 * A ~150px circular lens rides the pointer over the article list; inside it
 * each card shows its "blueprint" alter ego — deep-navy drafting paper, fine
 * cyan grid, monoline copy, a JetBrains Mono stamp (index · type · read-time)
 * — revealed through a per-card clip-path circle. A single hairline ring with
 * a soft glow marks the lens edge.
 *
 *   - <BlueprintLensCard> is the per-card shell: absolute inset-0 INSIDE the
 *     card <Link>, so the gsap Flip re-sort (whose targets are only the
 *     [data-archive-item] wrappers) carries the overlay with its card. The
 *     card Link opts OUT of the CardTiltController tilt (data-no-tilt): the
 *     clip circles live in untransformed layout space, and a live 5° tilt
 *     would slide the disc visibly out of the viewport-fixed ring.
 *     The schematic copy is passed as children — resources-client renders the
 *     SAME CardBody in its `blueprint` variant, so the alter ego overlays the
 *     base copy pixel-exact (same trick as the card's hot duplicate).
 *
 *   - <BlueprintLens> is the ONE tracker for the whole list. Native listeners
 *     on the list container feed a gsap.ticker writer (rail-pattern: damp the
 *     state, ONE container rect read per frame, then per-card clip-path
 *     writes with identical-value skip; zero writes once parked — repo
 *     invariant for DOM style writers). Card offsets are read per frame
 *     against the position:relative list container (offsetLeft/Top — layout
 *     is transform-clean during entrances and Flip flights, so these reads
 *     never force a reflow), which self-heals wheel scroll under a parked
 *     pointer and post-FLIP layouts without any boundary-event dependency.
 *
 * Radius blooms AT the pointer's entry point and collapses faster than it
 * opens (R_OUT_LAMBDA > R_IN_LAMBDA — exits faster than entrances); Esc
 * collapses it until the pointer re-enters the list. Fine-pointer + motion-OK
 * only: the CSS media block keeps every layer display:none elsewhere, so SSR
 * markup is identical on all devices and touch/reduced-motion keep today's
 * cards. The resourcePreviewStore wiring is untouched — this module adds its
 * own listeners and never reads or writes that store.
 */
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";

if (typeof window !== "undefined") gsap.registerPlugin(Flip);

/** Resting lens radius (px) — the ring element is sized 2×R and scaled. */
const LENS_R = 150;
/** Cursor-follow damping (tight — the lens is a held instrument, not a pet). */
const POS_LAMBDA = 22;
/** Radius bloom on enter / collapse on leave — collapse is ~2× faster. */
const R_IN_LAMBDA = 9;
const R_OUT_LAMBDA = 16;

interface LensCard {
  overlay: HTMLElement;
  wrap: HTMLElement;
  /** Last written clip-path — identical-value skip across frames. */
  last: string;
}

const CLOSED = "circle(0px at 0px 0px)";

/**
 * Per-card blueprint shell. aria-hidden + pointer-events-none: purely
 * decorative (keyboard/focus and the semantic card are untouched). p-7
 * mirrors the card <Link>'s padding so the children (the blueprint CardBody)
 * sit pixel-exact over the base copy; the stamp + frame live in the padding
 * band the base layout leaves empty.
 */
export function BlueprintLensCard({
  index,
  typeLabel,
  readMinutes,
  children,
}: {
  index: number;
  typeLabel: string;
  readMinutes: number;
  children: React.ReactNode;
}) {
  return (
    <div aria-hidden="true" data-blueprint-lens="" className="blueprint-lens p-7">
      <span className="blueprint-lens__frame" />
      <span className="blueprint-lens__tag">
        {`NO.${String(index + 1).padStart(2, "0")} · ${typeLabel} · ${readMinutes} MIN`}
      </span>
      {children}
    </div>
  );
}

/**
 * The shared tracker + lens ring. Mount ONCE next to the list; pass the list
 * container's ref (the position:relative flex column the card wrappers live
 * in — it is also the offsetParent every per-frame offset read resolves
 * against).
 */
export function BlueprintLens({
  listRef,
}: {
  listRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    const ring = ringRef.current;
    if (!list || !ring) return;
    // Same gate as the card-surface fx (cardFxOn in resources-client): fine
    // pointer with real hover, no reduced-motion. The CSS media block already
    // hides the layers elsewhere — this skips the listeners and the ticker.
    if (
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    let cards: LensCard[] = [];
    // Raw pointer (viewport px) vs damped lens state.
    let tx = 0;
    let ty = 0;
    let lx = 0;
    let ly = 0;
    let r = 0;
    let rTarget = 0;
    // Esc collapses the lens for the rest of THIS hover; re-entering re-arms.
    let escSuppressed = false;
    let running = false;

    const collect = () => {
      cards = Array.from(
        list.querySelectorAll<HTMLElement>("[data-blueprint-lens]"),
      ).flatMap((overlay) => {
        const wrap = overlay.closest<HTMLElement>("[data-archive-item]");
        return wrap ? [{ overlay, wrap, last: "" }] : [];
      });
    };

    const write = (c: LensCard, clip: string) => {
      if (c.last === clip) return;
      c.last = clip;
      c.overlay.style.clipPath = clip;
    };

    const park = () => {
      for (const c of cards) write(c, CLOSED);
      ring.style.opacity = "0";
      gsap.ticker.remove(tick);
      running = false;
    };

    const tick = (_time: number, deltaTime: number) => {
      const dt = Math.min(0.05, deltaTime / 1000);
      lx += (tx - lx) * (1 - Math.exp(-POS_LAMBDA * dt));
      ly += (ty - ly) * (1 - Math.exp(-POS_LAMBDA * dt));
      const lam = rTarget > r ? R_IN_LAMBDA : R_OUT_LAMBDA;
      r += (rTarget - r) * (1 - Math.exp(-lam * dt));
      if (rTarget === 0 && r < 0.5) {
        r = 0;
        park(); // zero writes at rest; pointerenter/move re-add the ticker
        return;
      }

      // ONE rect read per frame: wheel scroll moves the cards under a parked
      // pointer, so the container's viewport anchor cannot be cached. Not
      // every browser re-fires boundary events on scroll — if the scroll
      // carried the list away from under the pointer, collapse; a real
      // pointermove inside the list re-arms below.
      const rect = list.getBoundingClientRect();
      if (
        rTarget > 0 &&
        (tx < rect.left || tx > rect.right || ty < rect.top || ty > rect.bottom)
      )
        rTarget = 0;
      // A live Flip re-sort (reachable with the pointer parked over the list
      // via a keyboard-activated filter pill) absolutizes the rows at their
      // END layout, so offsetLeft/Top no longer describe what the eye sees —
      // treat the whole flight as out-of-bounds. Same parked semantics as the
      // scroll-collapse above: a real pointermove re-arms afterwards.
      if (rTarget > 0 && Flip.isFlipping(list)) rTarget = 0;

      const rr = Math.round(r * 10) / 10;
      for (const c of cards) {
        const wrap = c.wrap;
        // Filtered-out rows are display:none, never unmounted (Flip contract).
        if (wrap.offsetParent === null) {
          write(c, CLOSED);
          continue;
        }
        const x = lx - (rect.left + wrap.offsetLeft);
        const y = ly - (rect.top + wrap.offsetTop);
        // Circle-vs-card AABB: cards the lens cannot touch get one closed
        // write (cached), not a per-frame string churn.
        if (
          x < -rr ||
          y < -rr ||
          x > wrap.offsetWidth + rr ||
          y > wrap.offsetHeight + rr
        ) {
          write(c, CLOSED);
          continue;
        }
        write(
          c,
          `circle(${rr}px at ${Math.round(x * 10) / 10}px ${Math.round(y * 10) / 10}px)`,
        );
      }

      // Ring: fixed 2×R box, scaled — never resized — so the border stays a
      // hairline and the write is compositor-only.
      ring.style.transform = `translate3d(${lx - LENS_R}px, ${ly - LENS_R}px, 0) scale(${rr / LENS_R})`;
      ring.style.opacity = String(Math.min(1, rr / 60));
    };

    const wake = () => {
      if (running) return;
      running = true;
      gsap.ticker.add(tick);
    };

    const arm = (x: number, y: number) => {
      // Recollect per activation: language/filter renders between hovers are
      // covered, and the per-frame offset reads absorb everything else.
      collect();
      tx = x;
      ty = y;
      // Closed → bloom AT the pointer (no fly-in from stale state). Still
      // open (a quick leave/re-enter mid-collapse) → keep the damped glide;
      // a position teleport on a live lens reads as a glitch.
      if (!running || r < 0.5) {
        lx = x;
        ly = y;
      }
      rTarget = LENS_R;
      wake();
    };

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      escSuppressed = false;
      arm(e.clientX, e.clientY);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      tx = e.clientX;
      ty = e.clientY;
      if (escSuppressed) return;
      if (!running) {
        // A hover can begin WITHOUT a boundary event (page load or a scroll
        // that parks the list under a stationary pointer, then a first move)
        // — seed exactly like pointerenter or the writer runs uncollected.
        arm(e.clientX, e.clientY);
        return;
      }
      // Re-arms after a scroll-collapse (bounds check above); never after Esc.
      rTarget = LENS_R;
    };
    const onLeave = () => {
      rTarget = 0;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && rTarget > 0) {
        escSuppressed = true;
        rTarget = 0;
      }
    };

    list.addEventListener("pointerenter", onEnter);
    list.addEventListener("pointermove", onMove, { passive: true });
    list.addEventListener("pointerleave", onLeave);
    window.addEventListener("keydown", onKey);
    return () => {
      list.removeEventListener("pointerenter", onEnter);
      list.removeEventListener("pointermove", onMove);
      list.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onKey);
      if (running) gsap.ticker.remove(tick);
    };
  }, [listRef]);

  return (
    <>
      {/* Lens edge — one continuous ring floating over the list (it spans the
          gaps between cards, where the per-card clipped layers cannot draw).
          Below the DOM preview card (z-40) and the particle cursor (z-90). */}
      <div ref={ringRef} aria-hidden="true" className="blueprint-ring" />
      <style>{BLUEPRINT_LENS_CSS}</style>
    </>
  );
}

/**
 * Blueprint CSS — deep-navy drafting paper under a fine cyan grid (minor 12px
 * under major 48px — coincident lines brighten naturally), a hairline frame
 * with two corner ticks, and the mono stamp. Everything is display:none
 * outside the fine-pointer + motion-OK media block (same gate as the card
 * lens/wipe in resources-client), so SSR markup stays identical everywhere.
 * The grid lives only INSIDE the lens clip — canvas-under-tool, not page
 * texture. Accent is the signal cyan via --accent; no violet, no gradient
 * text.
 */
const BLUEPRINT_LENS_CSS = `
.blueprint-lens {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  clip-path: circle(0px at 0px 0px);
  will-change: clip-path;
  background-color: hsl(216 55% 5%);
  background-image:
    repeating-linear-gradient(0deg,  hsl(var(--accent) / 0.09) 0 1px, transparent 1px 48px),
    repeating-linear-gradient(90deg, hsl(var(--accent) / 0.09) 0 1px, transparent 1px 48px),
    repeating-linear-gradient(0deg,  hsl(var(--accent) / 0.045) 0 1px, transparent 1px 12px),
    repeating-linear-gradient(90deg, hsl(var(--accent) / 0.045) 0 1px, transparent 1px 12px);
}
.blueprint-ring {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 30;
  width: ${LENS_R * 2}px;
  height: ${LENS_R * 2}px;
  border-radius: 9999px;
  border: 1px solid hsl(var(--accent) / 0.65);
  box-shadow: 0 0 26px -8px hsl(var(--accent) / 0.45);
  opacity: 0;
  pointer-events: none;
  transform: translate3d(-100vw, -100vh, 0);
  will-change: transform, opacity;
}
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .blueprint-lens,
  .blueprint-ring { display: block; }
}
.blueprint-lens__frame {
  position: absolute;
  inset: 10px;
  border: 1px solid hsl(var(--accent) / 0.22);
}
.blueprint-lens__frame::before,
.blueprint-lens__frame::after {
  content: "";
  position: absolute;
  width: 12px;
  height: 12px;
}
.blueprint-lens__frame::before {
  top: -1px;
  left: -1px;
  border-top: 1px solid hsl(var(--accent) / 0.85);
  border-left: 1px solid hsl(var(--accent) / 0.85);
}
.blueprint-lens__frame::after {
  bottom: -1px;
  right: -1px;
  border-bottom: 1px solid hsl(var(--accent) / 0.85);
  border-right: 1px solid hsl(var(--accent) / 0.85);
}
.blueprint-lens__tag {
  position: absolute;
  top: 15px;
  right: 22px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  white-space: nowrap;
  color: hsl(var(--accent) / 0.9);
}
`;
