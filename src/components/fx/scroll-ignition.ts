"use client";

/**
 * scroll-ignition — ROUND 12 · D21. THE TYPE IS COMMANDED BY THE SCROLL, AND
 * THE POINTER IS INERT ON THE TWO NEURAL ACTS.
 *
 * The owner, twice: *"le scritte … devono essere animate con lo scroll, non
 * con il cursore se ci passo sopra"*, then with the symptom: *"attualmente la
 * freccia sposta la scritta a destra se passo il cursore, mentre dovrebbe
 * essere con lo scroll"*. So the amber lift, the glyph glow, the index accent
 * and the Hv1 letter/arrow wave all follow THE ROW CROSSING THE READING BAND,
 * and hovering a different row does nothing at all. One grammar.
 *
 * ── WHERE THE NUMBER COMES FROM, AND WHY THERE IS NO SECOND CLOCK ─────────
 * `#problem` already computes it. `use-diagonal-traverse`'s `apply()` resolves
 * a single winning block every frame from ONE frozen `window.scrollY`, over
 * the same reading-unit windows that write the copy's opacity, and used to
 * keep only the winner's VALUE (`frame.laneWindow`). It now also publishes the
 * winner's IDENTITY (`frame.laneRow`) onto `traverseStore`'s edge-deduped
 * lit-row channel. No extra read, no extra rect, no allocation.
 *
 * `#trust` has NO traverse band, so there is nothing to publish from — the
 * resolver below is that act's FIRST clock, not a second one. It is the same
 * mechanism the traverse uses and obeys the same rules: ONE plain, un-pinned,
 * un-scrubbed ScrollTrigger; every rect read on `onRefreshInit`; `apply()` is
 * pure arithmetic over the cache from a single frozen `scrollY`. Both acts
 * publish through the SAME channel under different ids, so the consumer
 * (`use-ledger-ignition`) cannot tell them apart.
 *
 * ── WHAT IS KEPT ON THE POINTER (owner was told, owner accepted) ──────────
 *  - The WebGL link (`setHovered` → ring flare / debris tease) still rides the
 *    resolved index, so it follows the SCROLL on these acts too; the fallback
 *    SVG's own hover echo is untouched.
 *  - KEYBOARD FOCUS keeps its ignition and is re-wired to the same wave. That
 *    is WCAG, not a nicety.
 *  - HOVER IS KEPT AS THE FALLBACK wherever the scroll source cannot exist:
 *    a narrow fine-pointer desktop window, a stepped-down phone and the
 *    flag-off build never arm the lattice island, so `#problem` never arms the
 *    traverse there. That is DETECTED (`!showFallback`, the exact complement
 *    of the island's mount gate) and never assumed.
 *  - `prefers-reduced-motion` gets neither: the acts' RM blocks already
 *    neutralise every ignited pose, and RM must stay motion-free.
 *
 * ── THE READING BAND ─────────────────────────────────────────────────────
 * Identical law to `traverse-rate.ts` (which is where `buildRateWindow` /
 * `windowAt` come from — this module never re-derives it):
 *
 *   m    = READING_BAND_INSET · ih
 *   band = [ headerH + m , ih − m ]
 *   V̂    = smoothstep(coverage of the band by the box)
 *
 * `READING_BAND_INSET` mirrors `traverseConfig.bandInset`. It is re-declared
 * here rather than imported ON PURPOSE: `traverseConfig.ts` is the WebGL
 * neural module's file and this one must stay importable from the route
 * bundle without dragging it in. If that number ever moves, move this one.
 */
import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type RefObject,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { buildRateWindow, windowAt, type RateWindow } from "./traverse-rate";
import { onLitRow, publishLitRow } from "@/webgl/store/traverseStore";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/** Mirrors `traverseConfig.bandInset` — see the header note. */
export const READING_BAND_INSET = 0.12;

/** Mirrors `traverseConfig.headerFallbackPx`, used only if `--header-h` fails. */
export const HEADER_FALLBACK_PX = 97.6;

/**
 * THE IGNITION THRESHOLD, and it is `1 − ε` on purpose.
 *
 * The lateral rate is `α = α_edge + (α_read − α_edge)·V̂` (`traverse-rate.ts`),
 * so a threshold of 0.85 — the first number proposed — still lights a row
 * moving at ~1.9× its plateau rate, i.e. while it is still sliding. The rule
 * is "opaque AND slowest": the row lights at the moment the reader is actually
 * reading it.
 *
 * It is always reachable. `windowAt` returns exactly 1 across `[e1, e2]`, and
 * `e2 − e1 = |blockH − bandH|`, which is zero only for a box exactly as tall
 * as the reading band. ε absorbs that degenerate case and float noise.
 */
export const IGNITE_V = 0.985;

/**
 * COVERAGE at which a row's letter-roll entrance arms — `smoothstep(0.22)` =
 * V̂ 0.124, i.e. the row is on frame and beginning to resolve.
 *
 * This closes the transparent-roll defect: the roll used to fire on the row's
 * own `top bottom` trigger while the traverse's opacity window still held the
 * row at 0, so on a slow scroll (< ~110 px/s) the whole 1.25 s R1 played
 * INVISIBLY and the reader met the row already settled. Because `y = docTop −
 * scrollY` is affine in scroll, the V̂ crossing is a FIXED offset from the
 * viewport bottom (`readingBandArmPx`) — no per-frame source is needed to
 * honour it, just a start offset on a trigger.
 */
export const ROLL_ARM_C = 0.22;

/**
 * Used `--header-h` in px. MEASURE TIME ONLY — `getComputedStyle` is a
 * style-resolution barrier. `--header-h` is an UNREGISTERED custom property,
 * so `getPropertyValue` hands back the authored token ("6.1rem"), never a
 * resolved length; the unit is resolved here rather than guessed. Same
 * arithmetic as `use-diagonal-traverse`'s `measure()`.
 */
export function resolveHeaderPx(): number {
  if (typeof document === "undefined") return HEADER_FALLBACK_PX;
  const rootEl = document.documentElement;
  const raw = getComputedStyle(rootEl).getPropertyValue("--header-h").trim();
  const rawNum = parseFloat(raw);
  if (!Number.isFinite(rawNum)) return HEADER_FALLBACK_PX;
  if (!/r?em$/.test(raw)) return rawNum;
  const rootPx = parseFloat(getComputedStyle(rootEl).fontSize) || 16;
  return rawNum * rootPx;
}

/**
 * Distance ABOVE the viewport bottom at which a box of height `rowH` first
 * reaches `ROLL_ARM_C` coverage of the reading band, in CSS px.
 *
 * Entering from below, `windowAt` is on its ascending branch and equals
 * `smooth01((e3 − y)/d)` with `e3 = ih − m` and `d = min(rowH, bandH)`, so the
 * crossing is at `y = e3 − ROLL_ARM_C·d`, i.e. `ih − y = m + ROLL_ARM_C·d`.
 * Refresh-time only (a ScrollTrigger `start` function), never per frame.
 */
export function readingBandArmPx(rowH: number): number {
  if (typeof window === "undefined") return 0;
  const ih = Math.max(window.innerHeight, 1);
  const m = READING_BAND_INSET * ih;
  const bandH = Math.max(ih - 2 * m - resolveHeaderPx(), 1);
  const d = Math.max(Math.min(Math.max(rowH, 1), bandH), 1);
  return m + ROLL_ARM_C * d;
}

// === THE ONE LIVE SWITCH ==================================================
//
// The owner has to be able to A/B this without a reload, and it has to flip
// BOTH acts together — D21 is "one grammar", so a switch that split them would
// be measuring something nobody asked for. Reachable from the existing dev
// handle (`__sersanTraverse_problem.scrollIgnition(false)`) and mirrored on
// `window.__sersanScrollIgnition` for `#trust`, which has no handle of its own.
//
// Module state, not zustand: it is read on a React render path and flipped by
// hand a handful of times per session.

let ignitionOn = true;
const switchListeners = new Set<() => void>();

export function scrollIgnitionEnabled(): boolean {
  return ignitionOn;
}

export function setScrollIgnition(on: boolean): boolean {
  if (ignitionOn === on) return ignitionOn;
  ignitionOn = on;
  for (const fn of switchListeners) fn();
  return ignitionOn;
}

function subscribeSwitch(fn: () => void): () => void {
  switchListeners.add(fn);
  return () => {
    switchListeners.delete(fn);
  };
}

/** SSR snapshot: the switch ships ON, and nothing motion-related renders. */
const switchServerSnapshot = () => true;

/** Subscribed so a live flip re-resolves both acts without a reload. */
export function useScrollIgnitionEnabled(): boolean {
  return useSyncExternalStore(
    subscribeSwitch,
    scrollIgnitionEnabled,
    switchServerSnapshot,
  );
}

if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV !== "production"
) {
  (window as unknown as Record<string, unknown>).__sersanScrollIgnition = {
    get enabled() {
      return ignitionOn;
    },
    set: setScrollIgnition,
  };
}

// === prefers-reduced-motion, subscribed ===================================
//
// SUBSCRIBED, never one-shot: an OS-level toggle must re-resolve without a
// reload (the D-18 discipline this repo already applies to hover capability).

function subscribeRM(fn: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener?.("change", fn);
  return () => mq.removeEventListener?.("change", fn);
}

function rmSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const rmServerSnapshot = () => false;

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeRM, rmSnapshot, rmServerSnapshot);
}

// === HYDRATION GATE =======================================================
//
// ⚠ MEASURED, NOT ASSUMED. Without this, `data-scroll-lit="true"` shipped in
// the SERVER HTML — `useNeuralLatticeFallback()` answers `false` until the
// tier probe resolves and there is no reduced-motion signal on the server —
// and the attribute is what scopes the hover fallback OFF. A client with
// JavaScript disabled would therefore have received markup with BOTH grammars
// disabled: no scroll source (no JS) and no hover (suppressed by an attribute
// nothing would ever remove). The rest pose stayed correct and readable, but
// the ignition was gone.
//
// So the scroll grammar is added by the client, never asserted by the server:
// the SSR/no-JS document ships in its hover grammar, which is exactly the
// D-10 rule ("no pose in the markup the client has not earned").

const noopSubscribe = () => () => {};

function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * THE ONE EXPRESSION BOTH ACTS ASK. Scroll ignition is live iff:
 *   • the owner's live switch is on,
 *   • we are past hydration (see above),
 *   • the lattice island is the one carrying the band (`!showFallback` — the
 *     complement of its mount gate, and therefore of the traverse's arm gate),
 *   • reduced motion is off.
 *
 * It is a single function precisely so the two acts CANNOT drift apart: D21 is
 * one grammar, and a `#problem` that had converted while `#trust` had not would
 * be worse than neither.
 */
export function useScrollIgnitionActive(showFallback: boolean): boolean {
  const on = useScrollIgnitionEnabled();
  const reduced = usePrefersReducedMotion();
  const hydrated = useHydrated();
  return on && hydrated && !showFallback && !reduced;
}

// === THE READING-BAND RESOLVER + THE SUBSCRIPTION =========================

/** A ledger row's cached, UNTRANSFORMED geometry + its window. */
interface BandRow {
  el: HTMLElement;
  index: number;
  docTop: number;
  h: number;
  win: RateWindow;
}

export interface ReadingBandLitOptions {
  /** The act's `<section>`; only read by the `"own"` source. */
  sectionRef: RefObject<HTMLElement | null>;
  /** The lit-row channel id. `"traverse"` sources MUST use the band id. */
  bandId: string;
  /**
   * `"traverse"` — somebody else already publishes for this id (the diagonal
   * traverse's frozen snapshot). We only subscribe.
   * `"own"` — this act has no traverse band, so run the resolver here.
   */
  source: "traverse" | "own";
  /** The detected gate. False ⇒ no subscription, no resolver, hover survives. */
  enabled: boolean;
  /** EN/IT — a language rebuild re-queries and re-measures the rows. */
  language: string;
  /** Called on EDGES only. Kept in a ref, so its identity is free to change. */
  onLit: (index: number | null) => void;
}

export function useReadingBandLit(opts: ReadingBandLitOptions): void {
  const { sectionRef, bandId, source, enabled, language, onLit } = opts;

  const onLitRef = useRef(onLit);
  useEffect(() => {
    onLitRef.current = onLit;
  });

  // ── THE OWN RESOLVER (`#trust`) ─────────────────────────────────────────
  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section || !enabled || source !== "own") return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const rows: BandRow[] = [];
        section
          .querySelectorAll<HTMLElement>("[data-ledger-row]")
          .forEach((el) => {
            const idx = Number.parseInt(el.dataset.ledgerRow ?? "", 10);
            if (!Number.isFinite(idx) || idx < 0) return;
            rows.push({
              el,
              index: idx,
              docTop: 0,
              h: 1,
              win: buildRateWindow(1, HEADER_FALLBACK_PX, 1, 0.12, 1, 1, 0),
            });
          });
        if (!rows.length) return;

        let ih = 1;

        // Arrow consts, not declarations: TypeScript only preserves the
        // `const section` narrowing inside functions created after it.
        const measure = (): void => {
          ih = Math.max(window.innerHeight, 1);
          const headerPx = resolveHeaderPx();
          const sy = window.scrollY;
          for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            // ⚠ THE ROW ITSELF IS NEVER TRANSFORMED, and that is what makes
            // this rect safe. `useTextDrift` owns `y` and the traverse owns
            // `x` on the `[data-drift]` wrappers INSIDE the row; the entrance
            // recipes animate split children; the hairline is absolutely
            // positioned. A descendant's transform does not move its
            // ancestor's border box, so `getBoundingClientRect()` here is the
            // untransformed geometry — unlike a rect read on a `[data-drift]`
            // wrapper, which has already cost this project a P0.
            const rect = r.el.getBoundingClientRect();
            r.docTop = rect.top + sy;
            r.h = Math.max(rect.height, 1);
            // α is inert here — only `windowAt` is ever evaluated on this
            // window, and it reads `d`/`e0..e3` only.
            r.win = buildRateWindow(
              r.h,
              headerPx,
              ih,
              READING_BAND_INSET,
              1,
              1,
              0,
            );
          }
        };

        const apply = (): void => {
          // ── THE ONE FROZEN READ ───────────────────────────────────────
          const sy = window.scrollY;
          let bestV = -1;
          let bestU = Number.POSITIVE_INFINITY;
          let best: BandRow | null = null;
          for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const v = windowAt(r.win, r.docTop - sy);
            // Ties broken by proximity to the viewport centre — the same rule
            // `use-diagonal-traverse`'s lane uses, so the two acts cannot
            // disagree about what "the row you are reading" means.
            const u = Math.abs(r.docTop + r.h / 2 - sy - ih / 2);
            if (v > bestV + 1e-6 || (v > bestV - 1e-6 && u < bestU)) {
              bestV = v;
              bestU = u;
              best = r;
            }
          }
          publishLitRow(
            bandId,
            best !== null && bestV >= IGNITE_V ? best.index : null,
          );
        };

        const st = ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          invalidateOnRefresh: true,
          onRefreshInit: measure,
          // Snap, never glide, across a re-measure.
          onRefresh: apply,
          onUpdate: apply,
          // One last apply on the way out, so a row cannot stay lit behind us.
          onToggle: () => apply(),
        });
        measure();
        // Init snap: a reload restoring mid-section must land already correct.
        apply();

        return () => {
          st.kill();
          // THE TEARDOWN FRONT (EN/IT, runtime RM, tier step-down).
          publishLitRow(bandId, null);
        };
      });

      return () => {
        mm.revert();
      };
    },
    {
      dependencies: [enabled, source, bandId, language],
      revertOnUpdate: true,
    },
  );

  // ── THE SUBSCRIPTION (both sources) ─────────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      onLitRef.current(null);
      return;
    }
    const off = onLitRow(bandId, (index) => onLitRef.current(index));
    return () => {
      off();
      // Leaving scroll-ignition mode must not leave a row lit and displaced.
      onLitRef.current(null);
    };
  }, [bandId, enabled]);
}
