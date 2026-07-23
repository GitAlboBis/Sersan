"use client";

/**
 * AuditWeekTimeline — BEAT 2 (research/step-6-audit-timeline.md).
 *
 * The /audit "How the week runs" list, restyled as VERTICAL pinned chapters:
 * a CSS-sticky frame holds all six Day cards stacked absolutely, each
 * crossfading in across its own contiguous progress sub-range as the reader
 * scrubs the pin (rAF-driven panelOpacity, NO React re-renders), plus a small
 * left numeric Day rail (1..6) whose active tick lights. The signature line
 * "walks" Day 1 → 6 alongside it (SignatureLine reads auditTimelineStore and
 * adds six per-Day emissive ticks into the shared uEmissive boost).
 *
 * MECHANICS — composed from two shipped in-repo patterns, nothing invented:
 *   - PINNING: case-studies-rail.tsx's CSS `position: sticky` inside a tall
 *     fixed-height section + ScrollTrigger that ONLY reads progress (NO `pin:`
 *     — a pin-spacer re-parents the DOM and breaks every [data-line-anchor]
 *     measurement; NO scrub tween — Lenis already smooths the scroll; NO
 *     `scroller` option — the provider's scrollerProxy covers it).
 *     `invalidateOnRefresh` + `onRefreshInit: measure` self-heal on every
 *     ScrollTrigger.refresh(); the one refresh this section owns is the
 *     one-shot document.fonts.ready (the provider never refreshes on routes).
 *   - The section height is a CONSTANT (100vh + a FIXED travel in vh, NOT
 *     content-derived) so the section's document-height contribution is
 *     identical whichever Day is lit → the [data-line-anchor="timeline"]
 *     fraction and every downstream anchor never drift.
 *   - CROSSFADE: cinematic-system-scroll.tsx's StagePanel opacity-crossfade
 *     (each Day fades in/out STRICTLY inside its range; exactly one Day owns
 *     the screen) + its inert/aria/pointer-events discipline so hidden cards
 *     leave the focus order and a11y tree.
 *   - SNAP: the site-wide engine (lib/scroll-snap — NEVER ScrollTrigger
 *     snap), registering one station at each Day's progress MIDPOINT (never
 *     1 — the pin release edge stays free so the reader can leave). The
 *     engine is suspended for the duration of a drag.
 *   - DRAG: GSAP Draggable + InertiaPlugin on an invisible proxy (type "x",
 *     horizontal hand-feel → vertical scrub). onDrag maps -x/DRAG_SPAN → a
 *     document Y and drives getLenis().scrollTo(y, {immediate}).
 *
 * MODES:
 *   - pinned (SSR default so all six Day cards are in the initial HTML; desktop
 *     fine-pointer, >768px, no reduced-motion): the scrubbed crossfade above.
 *   - native (mobile / coarse pointer / prefers-reduced-motion): today's flat
 *     week.map(...) Reveal cards in normal document flow, byte-identical copy,
 *     focusable, no pin / no Draggable / no snap / no WebGL coupling.
 *
 * COPY FREEZE: consumes the FROZEN `week` array (EN/IT) passed from
 * audit-client.tsx and reuses the existing SectionHeading verbatim. The only
 * new on-screen text is the numeric 1..6 Day rail (language-neutral) — no new
 * marketing prose.
 */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { getLenis } from "@/lib/lenis-singleton";
import { snapPoint, suspendSnap } from "@/lib/scroll-snap";
import { useAuditTimelineStore } from "@/webgl/store/auditTimelineStore";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin);
}

type WeekDay = { day: string; title: string; desc: string };

interface AuditWeekTimelineProps {
  week: WeekDay[];
  isEn: boolean;
}

/**
 * Fixed scrub height PER DAY (vh). The section height is a constant
 * `100vh + week.length * TIMELINE_TRAVEL_VH * vh` — derived ONLY from the Day
 * count (6, frozen), never from card content — so a font swap can't change the
 * document-height contribution and drift the downstream anchors. ~80vh per Day
 * mirrors the spine's 75-81vh grouped panels.
 */
const TIMELINE_TRAVEL_VH = 80;

/** Opacity for a Day given current progress + its [start, end] sub-range.
 * The fade-in and fade-out both happen STRICTLY inside the range, so adjacent
 * Day cards never overlap — exactly one Day owns the screen at a time. Unlike
 * the spine there is no hero/final special-case: every Day fades in AND out
 * inside its own range (the pin enters from a free-scroll lead-in above Day 1
 * and exits into a free-scroll lead-out below Day 6). */
function dayOpacity(progress: number, start: number, end: number): number {
  const fade = Math.min(0.04, (end - start) * 0.35);
  if (progress <= start || progress >= end) return 0;
  let o = 1;
  if (progress < start + fade) o = (progress - start) / fade;
  if (progress > end - fade) o = Math.min(o, (end - progress) / fade);
  return Math.max(0, o);
}

export default function AuditWeekTimeline({ week, isEn }: AuditWeekTimelineProps) {
  const count = week.length;

  // SSR default = pinned so all six Day cards are in the initial HTML — same
  // convention as case-studies-rail / the cinematic spine.
  const [mode, setMode] = useState<"pinned" | "native">("pinned");
  const [detected, setDetected] = useState(false);

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const railRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const proxyRef = useRef<HTMLDivElement | null>(null);
  const dragSurfaceRef = useRef<HTMLDivElement | null>(null);
  // Live scrub progress, written by the ScrollTrigger onUpdate and read by the
  // rAF crossfade tick — no React state churn during scroll.
  const progressRef = useRef(0);

  const prevModeRef = useRef<"pinned" | "native" | null>(null);

  // Mode detection is a SUBSCRIPTION, not a one-shot sample: a window snapped
  // narrow, devtools docked, or an OS reduced-motion toggle must flip the path
  // live. Sampling once on mount kept the pinned path alive with measurements
  // taken against a viewport that no longer exists.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const queries = [
      window.matchMedia("(max-width: 768px)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(prefers-reduced-motion: reduce)"),
    ];
    const sync = () => {
      setMode(queries.some((q) => q.matches) ? "native" : "pinned");
      setDetected(true);
    };
    sync();
    queries.forEach((q) => q.addEventListener("change", sync));
    return () => queries.forEach((q) => q.removeEventListener("change", sync));
  }, []);

  // A mode flip sets or clears the px runway height, so document height moves
  // — and an OS reduced-motion toggle fires no resize event, so nothing else
  // would re-measure. Deferred so the refresh reads the committed layout.
  useEffect(() => {
    if (!detected) return;
    const prev = prevModeRef.current;
    prevModeRef.current = mode;
    if (prev === null || prev === mode) return;
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(raf);
  }, [detected, mode]);

  // rAF crossfade: drive each Day card's opacity + inert/aria state and the
  // left rail tick from progressRef. Same discipline as the spine's StagePanel
  // (early-return when unchanged so an idle pin stops thrashing styles).
  useEffect(() => {
    if (!detected || mode !== "pinned") return;
    let raf = 0;
    const lastO = new Array<number>(count).fill(Number.NaN);
    const lit = new Array<boolean>(count).fill(true); // start "lit" so first tick syncs
    let lastDay = -1;
    const tick = () => {
      const p = progressRef.current;
      let active = Math.min(count - 1, Math.max(0, Math.floor(p * count)));
      for (let i = 0; i < count; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const start = i / count;
        const end = (i + 1) / count;
        const o = dayOpacity(p, start, end);
        if (o !== lastO[i]) {
          lastO[i] = o;
          el.style.opacity = String(o);
          const yOffset = (1 - o) * 18;
          el.style.transform = `translate3d(0, ${yOffset}px, 0)`;
          // Below threshold the card is visually hidden: drop pointer events
          // and remove it from focus order + the a11y tree (inert).
          const visible = o > 0.6;
          if (visible !== lit[i]) {
            lit[i] = visible;
            el.style.pointerEvents = visible ? "auto" : "none";
            (el as HTMLElement & { inert: boolean }).inert = !visible;
            if (visible) el.removeAttribute("aria-hidden");
            else el.setAttribute("aria-hidden", "true");
          }
        }
      }
      if (active !== lastDay) {
        lastDay = active;
        for (let i = 0; i < count; i++) {
          const r = railRefs.current[i];
          if (!r) continue;
          const on = i === active;
          // The rail entries are TEXT digits (01..06) styled + transitioned
          // via `color` — writing `background` painted a box behind them
          // instead of lighting the digit.
          r.style.color = on
            ? "hsl(var(--accent) / 0.85)"
            : "hsl(var(--ink-mute))";
          r.style.opacity = on ? "1" : "0.5";
        }
        useAuditTimelineStore.getState().setDayIndex(active);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [detected, mode, count]);

  // ScrollTrigger (progress reader) + snap stations + Draggable↔Lenis sync —
  // pinned mode only, after viewport detection settles.
  useEffect(() => {
    if (!detected || mode !== "pinned") return;
    const section = sectionRef.current;
    const proxy = proxyRef.current;
    if (!section) return;

    const store = useAuditTimelineStore.getState();

    let secTop = 0;
    let travel = 0;
    const measure = () => {
      // CONSTANT height: 100vh + a fixed per-Day travel (vh). Content-agnostic
      // → the section's document-height contribution never drifts.
      const h = window.innerHeight * (1 + (count * TIMELINE_TRAVEL_VH) / 100);
      section.style.height = `${h}px`;
      secTop = section.getBoundingClientRect().top + window.scrollY;
      travel = section.offsetHeight - window.innerHeight;
    };
    measure();

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      onUpdate: (self) => {
        progressRef.current = self.progress;
        store.setProgress(self.progress);
      },
    });
    // Sync the parked state immediately (reload mid-pin restores a position
    // inside the range).
    progressRef.current = st.progress;
    store.setProgress(st.progress);
    store.setActive(true);

    // --- Snap stations (site-wide engine, lib/scroll-snap) ------------------
    // One station at the MIDPOINT of every Day's progress window — a settle
    // always rests on a fully-lit Day card (the crossfade edges are the
    // blank frames). Value getters close over the live secTop/travel measure
    // vars, so a refresh/resize needs no re-registration. Never 1 (the pin
    // release edge). Reduced-motion / no-Lenis never reaches here (native
    // mode), and the engine itself is inert without Lenis.
    const clearSnapPoints: Array<() => void> = [];
    for (let i = 0; i < count; i++) {
      const p = (i + 0.5) / count;
      clearSnapPoints.push(
        snapPoint(() => (travel > 0 ? secTop + p * travel : Number.NaN)),
      );
    }
    const lenis = getLenis();

    // --- Draggable ↔ Lenis sync (research §1d) ------------------------------
    // An invisible proxy moves on the x-axis; we map its x to a vertical scroll
    // position inside the pin's travel. Horizontal hand-feel over the cards
    // reads as "flip through the days" without colliding with normal page
    // scroll. DRAG_SPAN maps the full travel to a comfortable hand throw.
    const DRAG_SPAN = Math.max(1, window.innerWidth * 0.9);
    let drag: Draggable | null = null;
    let releaseDragHold: (() => void) | null = null;
    if (proxy && lenis) {
      const applyScroll = (x: number) => {
        const frac = gsap.utils.clamp(0, 1, -x / DRAG_SPAN);
        const y = secTop + frac * travel;
        // immediate: jump (no Lenis lerp animation) — the hand IS the clock.
        // force: move even though Lenis is stopped during the drag.
        getLenis()?.scrollTo(y, { immediate: true, force: true });
      };
      const endDrag = () => {
        getLenis()?.start();
        // Idempotent — fires from onRelease (non-throw release) and
        // onThrowComplete (inertia settle), and from the effect cleanup.
        releaseDragHold?.();
        releaseDragHold = null;
      };
      drag = Draggable.create(proxy, {
        type: "x",
        trigger: dragSurfaceRef.current ?? undefined,
        inertia: true,
        dragResistance: 0.35,
        bounds: { minX: -DRAG_SPAN, maxX: 0 },
        onPressInit() {
          // Seeding only — the destructive acquisition (Lenis stop + snap
          // hold) lives in onDragStart: onPressInit fires on EVERY pointer
          // press, and a plain click that never drags fires neither
          // onDragEnd nor onThrowComplete, which left Lenis stopped and the
          // snap engine suspended for good.
          // Seed the proxy at the current scroll position so the first delta
          // doesn't jump the page.
          const frac =
            travel > 0
              ? gsap.utils.clamp(0, 1, (window.scrollY - secTop) / travel)
              : 0;
          gsap.set(proxy, { x: -frac * DRAG_SPAN });
        },
        onDragStart() {
          releaseDragHold ??= suspendSnap();
          getLenis()?.stop();
        },
        onDrag(this: Draggable) {
          applyScroll(this.x);
        },
        onThrowUpdate(this: Draggable) {
          applyScroll(this.x);
        },
        onRelease(this: Draggable) {
          // Draggable arms the inertia tween (isThrowing) BEFORE dispatching
          // onRelease — keep Lenis stopped and the snap held through the
          // throw so a pending settle can never fight it; onThrowComplete
          // then hands both back.
          if (!this.isThrowing) endDrag();
        },
        onThrowComplete() {
          endDrag();
        },
      })[0];
    }

    // One-shot late refresh once webfonts land: the provider deliberately does
    // NOT refresh ScrollTrigger on routes (the spine owns home's bursts), so
    // this section covers its own font-driven header reflow. Snap stations
    // read the live secTop/travel closures, so no snap re-registration needed.
    let fontsCancelled = false;
    const refreshAll = () => {
      ScrollTrigger.refresh();
    };
    document.fonts?.ready
      .then(() => {
        if (!fontsCancelled) refreshAll();
      })
      .catch(() => {});

    // Debounced resize — coalesce the burst into a single re-measure.
    let resizeId = 0;
    const onResize = () => {
      window.clearTimeout(resizeId);
      resizeId = window.setTimeout(refreshAll, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      fontsCancelled = true;
      window.clearTimeout(resizeId);
      window.removeEventListener("resize", onResize);
      drag?.kill();
      // kill() mid-press/mid-throw can skip the release callbacks — restore
      // Lenis and drop the snap hold unconditionally (both idempotent).
      getLenis()?.start();
      releaseDragHold?.();
      releaseDragHold = null;
      clearSnapPoints.forEach((off) => off());
      st.kill();
      section.style.height = "";
      // The WebGL layer must never read a stale /audit timeline after unmount
      // (the store survives route changes).
      useAuditTimelineStore.getState().reset();
    };
  }, [detected, mode, count]);

  const heading = (
    <SectionHeading
      align="center"
      className="mx-auto mb-12"
      eyebrow={isEn ? "The week, day by day" : "La settimana, giorno per giorno"}
      titleClassName="font-display text-3xl sm:text-[2.5rem] text-ink leading-[1.12] tracking-tight text-balance"
      title={
        isEn ? (
          <>
            Six days.{" "}
            <span className="italic" style={{ color: "hsl(var(--accent))" }}>
              Real work each.
            </span>
          </>
        ) : (
          <>
            Sei giorni.{" "}
            <span className="italic" style={{ color: "hsl(var(--accent))" }}>
              Lavoro vero ognuno.
            </span>
          </>
        )
      }
    />
  );

  // Shared Day-card body (same chrome as today's flat card — frozen copy).
  const dayCard = (w: WeekDay) => (
    <div className="card-steel flex flex-col sm:flex-row gap-4 sm:gap-6 p-6">
      <div
        className="sm:w-28 shrink-0 text-[11px] font-mono uppercase tracking-[0.18em]"
        style={{ color: "hsl(var(--accent))" }}
      >
        {w.day}
      </div>
      <div className="flex-1">
        <h3 className="font-display text-lg text-ink mb-1.5 leading-tight">{w.title}</h3>
        <p className="text-sm text-ink-mute leading-[1.55]">{w.desc}</p>
      </div>
    </div>
  );

  // Native fallback: today's flat layout, byte-identical copy, focusable, no
  // pin / Draggable / snap / WebGL coupling.
  if (detected && mode === "native") {
    return (
      <section className="section-lg relative">
        <div className="container-px relative">
          {heading}
          <div className="max-w-4xl mx-auto space-y-4">
            {week.map((w, i) => (
              <Reveal key={i} delay={i * 70}>
                {dayCard(w)}
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Pinned mode: a tall fixed-height runway (set in px by measure()), a sticky
  // frame holding the heading + the six absolutely-stacked Day cards + the
  // numeric Day rail. minHeight is the SSR placeholder before JS measures.
  return (
    <section className="relative">
      <div
        ref={sectionRef}
        className="relative"
        style={{ minHeight: `${100 + count * TIMELINE_TRAVEL_VH}vh` }}
      >
        <div
          ref={dragSurfaceRef}
          className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden"
        >
          <div className="mb-10 shrink-0">{heading}</div>

          {/* Numeric Day rail (1..6) — language-neutral. */}
          <div
            className="hidden lg:flex absolute left-8 top-1/2 -translate-y-1/2 flex-col gap-4 z-20"
            aria-hidden="true"
          >
            {week.map((_, i) => (
              <span
                key={i}
                ref={(el) => {
                  railRefs.current[i] = el;
                }}
                className="font-mono text-[11px] tabular-nums tracking-[0.16em] transition-[color,opacity] duration-300"
                style={{ color: "hsl(var(--ink-mute))", opacity: 0.5 }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            ))}
          </div>

          {/* The six Day chapters, stacked. Each fades in across its range. */}
          <div className="relative">
            {week.map((w, i) => {
              const initialO = i === 0 ? 1 : 0;
              return (
                <div
                  key={i}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  className="absolute inset-x-0 top-0 pointer-events-none"
                  inert={i !== 0}
                  aria-hidden={i !== 0 || undefined}
                  style={{
                    opacity: initialO,
                    transform: `translate3d(0, ${(1 - initialO) * 18}px, 0)`,
                    willChange: "opacity, transform",
                  }}
                >
                  <div className="container-px">
                    <div className="max-w-4xl mx-auto">{dayCard(w)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Invisible Draggable proxy — the scrub handle (never shown). */}
          <div
            ref={proxyRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
          />
        </div>
      </div>
    </section>
  );
}
