"use client";

/**
 * DisplacementWipeReveal — "declassify / signal resolves from noise" reveal.
 *
 * Reference technique: OnScrollFilter (#4) — an feTurbulence → feDisplacementMap
 * wipe. A navy scrim (the page's own base tone) sits ON TOP of the children and
 * RETRACTS the first time the block scrolls into view: an SVG mask edge slides
 * off, its boundary displaced by a static fractal-noise field so it reads as a
 * liquid/torn rim rather than a straight wipe. A thin cyan → blue rim (pure DOM
 * gradient + glow, no WebGL) traces the retreating edge.
 *
 * Contract (mirrors fx/redacted-reveal — the site's fire-once IO reveal idiom):
 *   - The children are the REAL content and are ALWAYS in the DOM, fully
 *     readable. The scrim is an ABSOLUTE overlay that never changes layout, and
 *     it ships (SSR / no-JS) already RETRACTED (mask off) — so a crawler, a
 *     failed hydration, or a never-firing observer all leave content visible.
 *   - Client-side the overlay is "armed" (covered) in a layout effect BEFORE
 *     paint — no uncovered→covered flash — then the retract plays ONCE when an
 *     IntersectionObserver reports the block on screen (SPA navigations
 *     included; the observer disconnects after firing).
 *   - prefers-reduced-motion => the effect bails before arming: the scrim stays
 *     retracted, content is static and visible. `disabled` => no overlay at all.
 *   - Per-instance ids via useId() (sanitized to [A-Za-z0-9_-]); global SVG
 *     filter/mask ids collide across instances (documented landmine).
 *   - feTurbulence + feDisplacementMap (+ optional feMorphology dilate for a
 *     chunkier rim) are CPU-rasterized and expensive. The optional dilate is
 *     GATED OFF on Safari (its feMorphology + feDisplacementMap path is slow /
 *     buggy). Callers stagger instances via `delay` so ≤2 filters rasterize at
 *     once (the site-wide displacement-filter concurrency budget).
 *
 * Mechanics: a single GSAP tween scrubs a proxy 0→1; onUpdate makes ONE
 * integer-quantized attr write to the mask rect's `x` (identical writes skipped
 * — every accepted write re-rasterizes the filter) plus a cheap style write to
 * the rim. No React state per frame; the tween/observer are reverted on cleanup.
 */

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import gsap from "gsap";

/* SSR-safe layout effect: arm the scrim before the browser paints (no visible
 * uncovered frame) on the client; degrade to a no-op-safe useEffect on the
 * server where useLayoutEffect would warn. */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ---- Wipe geometry (a square viewBox stretched over the block, aspect-
 * agnostic — same non-uniform-stretch idiom as fit-section's TornStrikeBar).
 * The mask rect is wider than the viewBox by PAD on every side, so at both
 * rest poses its straight edges clip beyond the viewBox and only the single
 * travelling (left) edge is ever the visible displaced rim. -------------- */
const VB = 100;
const PAD = 24;
/** Covered: rect spans [-PAD, VB+PAD] → whole viewBox white → full scrim. */
const COVER_X = -PAD;
/** Retracted: rect fully off the right → no scrim → content revealed. This is
 *  the SSR / reduced-motion / disabled resting pose (content visible). */
const REVEAL_X = VB + PAD;
const RECT_W = VB + PAD * 2;
/** Displacement excursion, in viewBox units (≈% of the block per axis after
 *  the non-uniform stretch). Tuned for an organic rim without shredding. */
const DISP_SCALE = 6;

/** WebKit engines where the feMorphology∘feDisplacementMap path is slow/buggy:
 *  desktop Safari AND every iOS browser — Chrome (CriOS) and Firefox (FxiOS)
 *  on iOS are the same WebKit engine under a different shell, so excluding
 *  them from the gate would keep the dilate primitive on exactly the engine
 *  it exists to avoid. Chromium/Firefox on macOS carry "Safari" in the UA
 *  too, hence the desktop exclusion list. */
function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Any iOS device → WebKit, regardless of the browser shell.
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  // iPadOS 13+ masquerades as macOS Safari but reports touch points.
  if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  return /^((?!chrome|chromium|android|edg).)*safari/i.test(ua);
}

/** Integer-quantized attribute writer (fit-section idiom): quantizing lets us
 *  skip identical writes — each accepted write re-rasterizes the filter. */
function makeAttrWriter(el: Element | null, attr: string) {
  if (!el) return (_v: number) => {};
  let last = Number.NaN;
  return (value: number) => {
    const q = Math.round(value);
    if (q === last) return;
    last = q;
    el.setAttribute(attr, String(q));
  };
}

export interface DisplacementWipeRevealProps {
  children: ReactNode;
  className?: string;
  /** Wrapper tag. Stays position:relative so the absolute scrim is contained
   *  (no offsets → no layout shift). Default 'div'. */
  as?: ElementType;
  /** Delay before the retract starts, in SECONDS (stagger siblings so ≤2
   *  filters animate at once). Default 0. */
  delay?: number;
  /** feTurbulence baseFrequency — coarser (lower) = chunkier rim cells. Lets
   *  callers give each item its own edge personality. Default 0.06. */
  frequency?: number;
  /** feTurbulence numOctaves — more = busier noise. Default 2. */
  octaves?: number;
  /** Skip the overlay entirely (content rendered plain). Default false. */
  disabled?: boolean;
}

export function DisplacementWipeReveal({
  children,
  className,
  as,
  delay = 0,
  frequency = 0.06,
  octaves = 2,
  disabled = false,
}: DisplacementWipeRevealProps) {
  // Polymorphic wrapper. `ElementType` collapses JSX attributes to `never`
  // (the union of every element's props intersects to nothing), so cast to a
  // component type that explicitly accepts the props we pass. Runtime value is
  // unchanged (the tag string / component).
  const Tag = (as ?? "div") as unknown as ComponentType<
    HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }
  >;
  const rootRef = useRef<HTMLElement | null>(null);

  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = `dw-f-${uid}`;
  const maskId = `dw-m-${uid}`;

  // The feMorphology dilate is gated OFF on Safari. Resolved AFTER mount (never
  // during render / SSR) so the first client render matches the server markup —
  // navigator is absent server-side, so a render-time check would hydrate-
  // mismatch on Safari. The scrim is invisible (retracted) until the IO fires,
  // so dropping the dilate a tick later is never seen.
  const [dropDilate, setDropDilate] = useState(false);
  useEffect(() => {
    if (isSafari()) setDropDilate(true);
  }, []);

  useIsoLayoutEffect(() => {
    if (disabled) return;
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const maskRect = root.querySelector<SVGRectElement>("[data-dw-cover]");
    const rim = root.querySelector<HTMLElement>("[data-dw-rim]");
    if (!maskRect) return;

    const writeX = makeAttrWriter(maskRect, "x");

    // frame(p): p=0 covered → p=1 retracted. ONE quantized attr write + one
    // cheap style write; the rim rides the leading edge and bells in/out so it
    // only glows while the edge is actually crossing the block.
    const frame = (p: number) => {
      const x = COVER_X + (REVEAL_X - COVER_X) * p;
      writeX(x);
      if (rim) {
        // Mask edge at user-x maps to box fraction x/VB → left as a percentage.
        rim.style.left = `${x}%`;
        rim.style.opacity = String(Math.sin(Math.PI * Math.min(1, Math.max(0, p))));
      }
    };

    // Arm BEFORE paint (this is a layout effect): scrim fully covers, rim off.
    frame(0);

    let played = false;
    let tween: gsap.core.Tween | null = null;
    const state = { p: 0 };
    const play = () => {
      if (played) return;
      played = true;
      // Duration is deliberately short so the retract re-rasterizes the filter
      // for only a brief window: with a per-item stagger ≥ DURATION/2 (the
      // audit grid uses delay = i·0.12s, and DURATION < 0.24s), at most two
      // items' filters ever rasterize on the same frame — the site-wide
      // displacement-filter concurrency budget.
      tween = gsap.to(state, {
        p: 1,
        duration: 0.22,
        ease: "power3.inOut",
        delay,
        onUpdate: () => frame(state.p),
      });
    };

    // IO (not ScrollTrigger): fires immediately if mounted already in view.
    // -12% bottom margin ≈ reveal once the block is properly on screen.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            play();
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0 },
    );
    io.observe(root);

    return () => {
      io.disconnect();
      tween?.kill();
      // Re-arm / unmount mid-flight: leave content revealed, never covered.
      frame(1);
    };
  }, [disabled, delay, frequency, octaves]);

  // `disabled`: render children plain — no overlay, no wrapper cost beyond the
  // element itself (still position:relative, harmless with no offsets).
  return (
    <Tag
      ref={rootRef}
      className={className}
      style={{ position: "relative" }}
    >
      {children}

      {!disabled && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ borderRadius: "inherit", zIndex: 5 }}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${VB} ${VB}`}
            preserveAspectRatio="none"
          >
            <defs>
              <filter
                id={filterId}
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={frequency}
                  numOctaves={octaves}
                  seed="4"
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale={DISP_SCALE}
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="displacement"
                />
                {/* Chunky-rim dilate — GATED OFF on Safari (slow/buggy
                    feMorphology∘feDisplacementMap path). Omitted post-mount on
                    Safari; the trailing feDisplacementMap result is the filter
                    output when absent. */}
                {!dropDilate && (
                  <feMorphology
                    operator="dilate"
                    radius="0.6"
                    in="displacement"
                  />
                )}
              </filter>
              <mask
                id={maskId}
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width={VB}
                height={VB}
              >
                {/* White = scrim visible. Ships RETRACTED (x = REVEAL_X) so
                    SSR / no-JS / reduced-motion show no scrim. The layout
                    effect arms it to COVER_X before paint. */}
                <rect
                  data-dw-cover
                  x={REVEAL_X}
                  y={-PAD}
                  width={RECT_W}
                  height={RECT_W}
                  style={{ fill: "#fff", filter: `url(#${filterId})` }}
                />
              </mask>
            </defs>
            <rect
              x={-PAD}
              y={-PAD}
              width={RECT_W}
              height={RECT_W}
              mask={`url(#${maskId})`}
              style={{ fill: "hsl(var(--bg))" }}
            />
          </svg>

          {/* Rim tracing the retreating edge — pure DOM gradient + glow, cyan
              #3BE1FF → deep-blue #2A7FFF. Positioned by the frame writer; ships
              off-screen/transparent. */}
          <div
            data-dw-rim
            className="absolute top-0 bottom-0 w-[2px]"
            style={{
              left: "-50%",
              opacity: 0,
              transform: "translateX(-50%)",
              background: "linear-gradient(180deg, #3BE1FF, #2A7FFF)",
              boxShadow:
                "0 0 10px 1px rgba(59,225,255,0.7), 0 0 22px 3px rgba(42,127,255,0.35)",
            }}
          />
        </div>
      )}
    </Tag>
  );
}

export default DisplacementWipeReveal;
