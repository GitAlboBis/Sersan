"use client";

/**
 * StreamPane — the ONE shared glass-pane chrome for the two signal-stream
 * sections (Problem = "broken", ProductionGrade = "healthy"; 2026-08-21
 * refactor — replaces the NeuralCard accordion chrome).
 *
 * Grammar (the fit-verdict-wall pane, verbatim): chrome-less frosted glass —
 * `bg-[hsl(216_30%_10%/0.55)] backdrop-blur-xl`, NO border box, a single top
 * hairline (cyan→transparent gradient) that brightens on hover/focus, large
 * radius, soft ambient shadow. Content = REAL, always-open DOM copy (no
 * aria-expanded/aria-controls — nothing collapses any more; panes are the
 * screen-reader-facing content, not triggers).
 *
 * ROUND-2 LIFE PASS (2026-08-21, owner: the panes must be ALIVE — Noomo
 * panels at depth / AT billboards / spring hovers):
 *
 *   1. SCROLL DRIFT AT DEPTH — each pane sits in its own parallax wrapper
 *      driven by the site's useScrollParallax hook (ScrollTrigger onUpdate →
 *      gsap.set, no pin, no scrub-tween, never changes scrollHeight).
 *      Amplitudes ALTERNATE per index (−18 / +26 / −34 px) so the cascade
 *      visibly floats at different depths as you scroll — never a hard scrub.
 *      The wrapper owns the parallax `y` transform + the cascade z-index; the
 *      article keeps every other channel. RM: the hook bails (y stays 0).
 *
 *   2. SPRING HOVER TILT (fine pointer only) — pointermove chases the cursor
 *      with gsap.quickTo on rotationX/rotationY (max ±3.5°, 0.6s expo.out) +
 *      a translateZ-ish scaleX/scaleY lift to 1.015 (REAL components, never
 *      the `scale` shorthand — CardTiltController's "not eligible for reset"
 *      lesson). Leave springs back with back.out(1.4) overshoot. Hairline
 *      brightens and the pane bg alpha rises 0.55→0.68 (an opacity-only
 *      overlay span — no background-color animation). The setHovered store
 *      link (WebGL ring flare / debris re-cohere tease) is untouched.
 *
 *   3. IDLE MICRO-FLOAT — a very slow per-pane sine bob (y ±3px, 6/7/8s
 *      period by index, phase-offset) so the stack never sits dead still.
 *      Lives on the article's GSAP `y` channel (the reveal owns x/rotation,
 *      the parallax wrapper owns its own y — no channel fights). Killed
 *      under reduced motion.
 *
 * Channel map (who owns what, so nothing ever fights):
 *   - wrapper GSAP transform ..... parallax y (useScrollParallax)
 *   - article GSAP transform ..... reveal x/rotation (section timeline),
 *                                  idle-float y, hover rotationX/rotationY/
 *                                  scaleX/scaleY (quickTo)
 *   - article CSS translate/rotate rest tilt (--pane-tilt) + hover lift —
 *                                  independent properties, compose with the
 *                                  GSAP-owned `transform` by spec.
 *
 * Carries `data-stream-pane` for the owning section's award-grammar reveal
 * timeline (GSAP primes/animates transform+opacity+filter; this file renders
 * no hidden state of its own — SSR/no-JS/reduced-motion always see the
 * settled pane).
 *
 * Also exported from here (the sections' shared chrome file):
 *   - ChapterAnnotation — the right-hung ~320px annotation paragraph with
 *     its blur-fade entrance (delay ~0.3s after the chapter title fires).
 *   - scramblePaneEyebrow — a local one-shot decode for pane eyebrows,
 *     sequenced by the sections' reveal timelines (the global LabelScrambler
 *     only owns `.eyebrow` elements; pane eyebrows keep their own styling
 *     and decode exactly when the pane lands).
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { useScrollParallax } from "@/components/ui/use-scroll-parallax";
import { cn } from "@/lib/utils";

export type StreamSurface = "broken" | "healthy";

interface StreamPaneProps {
  /** This pane's index (0..2) — the ring / failure it drives in the store. */
  index: number;
  /** Which store surface this pane drives. */
  surface: StreamSurface;
  /** Which side of the field the cascade leans from ("right" = Problem). */
  side: "left" | "right";
  children: React.ReactNode;
  className?: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function useHoverCapable() {
  const [canHover, setCanHover] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(mq.matches);
    const on = () => setCanHover(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return canHover;
}

/** Per-index cascade pose (lg+ only): tilt sign alternates; the stack leans
 * toward the field. Mirrored for the left side. */
const TILT = [-1.5, 1.75, -1] as const;
const SHIFT = ["lg:-translate-x-2", "lg:translate-x-3", "lg:-translate-x-1"] as const;
const SHIFT_MIRROR = [
  "lg:translate-x-2",
  "lg:-translate-x-3",
  "lg:translate-x-1",
] as const;
const Z = ["lg:z-30", "lg:z-20", "lg:z-10"] as const;

/** Scroll-drift parallax amplitude per pane (px, sign alternates = depth).
 * useScrollParallax maps the pane's viewport travel to +amp → −amp. */
const DRIFT = [-18, 26, -34] as const;

/** Spring hover tilt limits (round-2 spec §B1). */
const MAX_TILT_DEG = 3.5;
const TILT_SCALE = 1.015;
const TILT_PROPS = "rotationX,rotationY,scaleX,scaleY";

/** Idle micro-float: ±3px sine, 6/7/8s period by index, phase-offset. */
const FLOAT_AMP = 3;

interface TiltSetters {
  rx: (v: number) => void;
  ry: (v: number) => void;
  sx: (v: number) => void;
  sy: (v: number) => void;
}

export function StreamPane({
  index,
  surface,
  side,
  children,
  className,
}: StreamPaneProps) {
  const canHover = useHoverCapable();
  const setHovered = useNeuralLatticeStore((s) => s.setHovered);
  const stateRef = useRef({ hover: false, focus: false });
  const paneRef = useRef<HTMLElement>(null);
  // Scroll-linked depth drift on a dedicated wrapper (its own transform, so
  // it never fights the article's reveal/float/tilt channels). RM-inert.
  const parallaxRef = useScrollParallax<HTMLDivElement>(
    DRIFT[index % DRIFT.length],
  );
  const tiltRef = useRef<TiltSetters | null>(null);
  const tiltPrimedRef = useRef(false);

  const sync = () => {
    const on = stateRef.current.hover || stateRef.current.focus;
    setHovered(surface, on ? index : null);
  };

  // --- Spring hover tilt (fine pointer only, RM-inert) --------------------
  const armTilt = () => {
    const el = paneRef.current;
    if (!el) return;
    if (!tiltPrimedRef.current) {
      // Prime the FULL matrix once so every quickTo component is recorded
      // (CardTiltController's "not eligible for reset" discipline). First
      // hover happens at rest, so the 0/1 writes are visually no-ops.
      tiltPrimedRef.current = true;
      gsap.set(el, {
        transformPerspective: 750,
        rotationX: 0,
        rotationY: 0,
        scaleX: 1,
        scaleY: 1,
      });
    }
    // A previous release tween may still be springing — take the channel.
    gsap.killTweensOf(el, TILT_PROPS);
    tiltRef.current = {
      rx: gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "expo.out" }),
      ry: gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "expo.out" }),
      sx: gsap.quickTo(el, "scaleX", { duration: 0.6, ease: "expo.out" }),
      sy: gsap.quickTo(el, "scaleY", { duration: 0.6, ease: "expo.out" }),
    };
    // The scale lift is a CONSTANT target — fire it once here instead of
    // restarting the sx/sy quickTo tweens on every pointermove (the
    // identical-value-skip discipline; only rx/ry track the cursor).
    tiltRef.current.sx(TILT_SCALE);
    tiltRef.current.sy(TILT_SCALE);
  };

  const releaseTilt = () => {
    if (!tiltRef.current) return;
    tiltRef.current = null;
    const el = paneRef.current;
    if (!el) return;
    // Kill the quickTo tweens, then spring home with a subtle overshoot.
    gsap.killTweensOf(el, TILT_PROPS);
    gsap.to(el, {
      rotationX: 0,
      rotationY: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 0.7,
      ease: "back.out(1.4)",
    });
  };

  const onEnter = () => {
    if (!canHover) return;
    stateRef.current.hover = true;
    sync();
    if (!prefersReducedMotion()) armTilt();
  };
  const onMove = (e: React.PointerEvent) => {
    const s = tiltRef.current;
    const el = paneRef.current;
    if (!s || !el) return;
    // gBCR per pointermove is the shipped CardTiltController idiom (event
    // handler, not a frame loop; passive path, layout is clean).
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const px = (e.clientX - r.left) / r.width; // 0..1
    const py = (e.clientY - r.top) / r.height;
    s.rx(-(py - 0.5) * 2 * MAX_TILT_DEG);
    s.ry((px - 0.5) * 2 * MAX_TILT_DEG);
  };
  const onLeave = () => {
    if (!canHover) return;
    stateRef.current.hover = false;
    sync();
    releaseTilt();
  };
  const onFocus = () => {
    stateRef.current.focus = true;
    sync();
  };
  const onBlur = () => {
    stateRef.current.focus = false;
    sync();
  };

  // --- Idle micro-float (article `y` channel; killed under RM) ------------
  useEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    const halfPeriod = 3 + (index % 3) * 0.5; // 6s / 7s / 8s full periods
    const tween = gsap.fromTo(
      el,
      { y: -FLOAT_AMP },
      {
        y: FLOAT_AMP,
        duration: halfPeriod,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      },
    );
    // Phase-offset by index so the stack breathes, never marches.
    tween.progress((index * 0.37) % 1);
    return () => {
      tween.kill();
      gsap.set(el, { y: 0 });
    };
  }, [index]);

  // Clear hover on unmount so a stale ring doesn't stay flared; kill any
  // in-flight tilt tweens with the element.
  useEffect(() => {
    return () => {
      setHovered(surface, null);
      const el = paneRef.current;
      if (el) gsap.killTweensOf(el, TILT_PROPS);
    };
  }, [setHovered, surface]);

  const tilt = TILT[index] ?? 0;
  const shift = (side === "right" ? SHIFT : SHIFT_MIRROR)[index] ?? "";

  return (
    // Parallax wrapper: owns the scroll-drift transform AND the cascade
    // z-index (each pane is its own stacking context once transformed, so
    // the z order must live out here, not on the article).
    <div ref={parallaxRef} className={cn("relative", Z[index] ?? "")}>
      <article
        ref={paneRef}
        data-stream-pane={index}
        tabIndex={0}
        onPointerEnter={onEnter}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{ ["--pane-tilt" as string]: `${tilt}deg` }}
        className={cn(
          "group relative rounded-2xl bg-[hsl(216_30%_10%/0.55)] p-5 sm:p-6 max-sm:p-4",
          "backdrop-blur-xl shadow-[0_24px_80px_-32px_hsl(220_60%_2%/0.8)]",
          // Cascade pose (lg+): CSS rotate/translate properties — independent
          // of the GSAP-owned `transform` used by reveal/float/tilt, so they
          // never fight.
          "lg:rotate-[var(--pane-tilt)] lg:hover:rotate-0 lg:focus-visible:rotate-0",
          shift,
          // Hover lift (translate property, not transform).
          "hover:-translate-y-1.5 focus-visible:-translate-y-1.5",
          "transition-[translate,rotate,box-shadow] duration-500 ease-[var(--ease-lusion)]",
          "motion-reduce:transition-none",
          "outline-none focus-visible:shadow-[0_0_0_1px_hsl(var(--accent)/0.55),0_24px_80px_-32px_hsl(220_60%_2%/0.8)]",
          "select-text",
          className,
        )}
      >
        {/* Bg-alpha riser: 0.55 → ~0.68 effective on hover/focus, as an
            OPACITY-only overlay (0.55 + 0.29·(1−0.55) ≈ 0.68) — the
            transform/opacity law stays intact, no bg-color animation. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl bg-[hsl(216_30%_10%/0.29)] opacity-0 transition-opacity duration-500 ease-[var(--ease-lusion)] group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        />
        {/* Top hairline — the pane's only chrome (NO border). Brightens on
            hover/focus. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-full bg-gradient-to-r from-[hsl(var(--accent)/0.7)] via-[hsl(var(--accent)/0.25)] to-transparent opacity-60 transition-opacity duration-500 ease-[var(--ease-lusion)] group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        />
        {children}
      </article>
    </div>
  );
}

// === ChapterAnnotation =====================================================
// The right-hung ~320px annotation paragraph both signal-stream sections hang
// beside their chapter h2 (Noomo/Lusion pairing). Entrance: blur-fade-up
// ~0.3s after it scrolls in — i.e. just behind the title's masked line-rise
// (HeadingChoreographer owns the h2; this owns only the annotation).
// Language-safe by construction: no SplitText, the element's own autoAlpha/
// filter animate, so an EN/IT swap just rewrites the text in place.
// RM/no-JS/SSR: never primed hidden — the paragraph simply exists.
export function ChapterAnnotation({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion()) return;
      gsap.set(el, { autoAlpha: 0, y: 14, filter: "blur(8px)" });
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          obs.disconnect();
          gsap.to(el, {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.8,
            delay: 0.3,
            ease: "expo.out",
            clearProps: "filter",
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.3 },
      );
      obs.observe(el);
      return () => obs.disconnect();
    },
    { scope: ref },
  );

  return (
    <p ref={ref} className="max-w-[320px] text-[13px] leading-relaxed text-ink-mute">
      {children}
    </p>
  );
}

// === scramblePaneEyebrow ===================================================
// A one-shot, timeline-sequenced decode for pane eyebrows (the LabelScrambler
// treatment, fired locally so it lands exactly when the pane does — and so
// the pane eyebrows keep their own type styling instead of inheriting the
// unlayered `.eyebrow` CSS). Same safety contract as the global engine:
//   - walks TEXT NODES only (aria-hidden decorations — the `·` and `->`
//     spans — never scramble), preserving React's DOM verbatim;
//   - aria-label holds the real string for the whole run;
//   - aborts on any external write (EN/IT swap mid-decode) leaving React's
//     fresh text untouched;
//   - stops if the element disconnects (route change);
//   - once per element per page life; RM = no-op.
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SCRAMBLE_MS = 480;
const TICK_MS = 40;

function isStructuralChar(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (
    code === 0x20 || // space
    code === 0x09 || // tab
    code === 0x0a || // newline
    code === 0x0d || // carriage return
    code === 0x00a0 || // non-breaking space
    code === 0x00b7 || // middot ·
    ch === "/" ||
    ch === "-"
  );
}

interface ScrambleNodeRecord {
  node: Text;
  final: string[];
  written: string;
  offset: number;
}

function collectScrambleNodes(el: HTMLElement): ScrambleNodeRecord[] {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!(node.nodeValue ?? "").trim()) return NodeFilter.FILTER_REJECT;
      let parent = node.parentElement;
      while (parent && parent !== el) {
        if (parent.getAttribute("aria-hidden") === "true") {
          return NodeFilter.FILTER_REJECT;
        }
        parent = parent.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const records: ScrambleNodeRecord[] = [];
  let offset = 0;
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const text = current as Text;
    const value = text.nodeValue ?? "";
    const final = Array.from(value);
    records.push({ node: text, final, written: value, offset });
    offset += final.length;
  }
  return records;
}

export function scramblePaneEyebrow(el: HTMLElement): void {
  if (prefersReducedMotion()) return;
  if (el.dataset.paneScrambled === "1") return;
  el.dataset.paneScrambled = "1";

  const records = collectScrambleNodes(el);
  const totalChars = records.reduce((sum, r) => sum + r.final.length, 0);
  if (totalChars === 0) return;

  const finalText = (el.textContent ?? "").trim();
  el.setAttribute("aria-label", finalText);

  const start = performance.now();
  const stop = (completed: boolean) => {
    window.clearInterval(tick);
    records.forEach((r) => {
      // Completed → restore byte-identical. Aborted (external write) →
      // restore only nodes WE still own; React's fresh text stays.
      if (completed || r.node.nodeValue === r.written) {
        r.node.nodeValue = r.final.join("");
      }
    });
    el.removeAttribute("aria-label");
  };

  const tick = window.setInterval(() => {
    for (const r of records) {
      if (r.node.nodeValue !== r.written) {
        stop(false);
        return;
      }
    }
    if (!el.isConnected) {
      stop(false);
      return;
    }

    const progress = Math.min(1, (performance.now() - start) / SCRAMBLE_MS);
    const settled = Math.floor(progress * totalChars);
    for (const r of records) {
      let out = "";
      for (let i = 0; i < r.final.length; i++) {
        const ch = r.final[i];
        if (isStructuralChar(ch) || r.offset + i < settled) {
          out += ch;
        } else {
          out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
      }
      r.node.nodeValue = out;
      r.written = out;
    }
    if (progress >= 1) {
      stop(true);
    }
  }, TICK_MS);
}
