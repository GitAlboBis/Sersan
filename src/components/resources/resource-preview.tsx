"use client";

/**
 * Resource hover-preview controller (BEAT 3; research/step-6-resources-band.md
 * §3b/c). The DOM half of the "signal condenses under your cursor" preview over
 * the /resources article list:
 *
 *   - `useResourcePreview()` owns the cursor-follow (gsap.quickTo driving a
 *     plain {x,y} object in clip space [0..1] top-left, publishing each tick
 *     into resourcePreviewStore so the WebGL plane is a pure getState reader),
 *     the hover index, and the coarse-pointer / reduced-motion gate. It returns
 *     per-item pointer handlers + a list-leave handler for resources-client.
 *
 *   - `<ResourcePreviewCard />` is the DOM/CSS fallback visual: a position:fixed,
 *     pointer-events:none card with the cyan→blue signal gradient + the
 *     article's category label and read-time. It is shown ONLY when the WebGL
 *     signal plane is NOT mounted (lite tier or the flag-OFF WebGLRenderer
 *     build); on the desktop WebGPU full path the plane is the preview and the
 *     card stays hidden.
 *
 * Fallback ladder (all additive — the list + closing band are always complete):
 *   reduced-motion → tier off → gate off, no follower, no card.
 *   coarse / mobile → tier lite → gate off, no card (touch has no hover).
 *   desktop, flag OFF → full tier, no plane → DOM card is the preview.
 *   desktop, flag ON  → full tier + WebGPU plane → card suppressed.
 */
import { useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { resources } from "@/data/resources";
import { useLanguage } from "@/components/language-provider";
import { useResourcePreviewStore } from "@/webgl/store/resourcePreviewStore";
import { useTierStore } from "@/webgl/store/tierStore";
import { webgpuEnabled } from "@/webgl/renderer/createRenderer";

/** Stable per-article seed 0..1 (golden-ratio hash, same as RailPlanes). */
const seedFor = (i: number) => (i * 0.618034) % 1;

/** True on devices/preferences where the hover preview must not run at all. */
function isGateOff() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface ResourceItemHandlers {
  onPointerEnter: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  /** Fires the click-wipe (WebGL plane + DOM fallback card). Wire onto the
   *  article link's onPointerDown; a no-op when the gate is off. */
  onPointerDown: (e: React.PointerEvent) => void;
}

/**
 * Hover-preview controller hook. Wire the returned handlers onto each article
 * <Link> and `onListPointerLeave` onto the list container.
 */
export function useResourcePreview() {
  const gateOffRef = useRef(true);
  const [gateOff, setGateOff] = useState(true);
  useEffect(() => {
    const off = isGateOff();
    gateOffRef.current = off;
    setGateOff(off);
  }, []);

  // Follower in clip space [0..1] top-left (matches pointerStore + the plane).
  const follow = useRef({ x: 0.5, y: 0.5 });
  const xTo = useRef<gsap.QuickToFunc | null>(null);
  const yTo = useRef<gsap.QuickToFunc | null>(null);

  useGSAP(
    () => {
      if (gateOff) return;
      const setTarget = useResourcePreviewStore.getState().setTarget;
      xTo.current = gsap.quickTo(follow.current, "x", {
        duration: 0.5,
        ease: "power3",
        // One onUpdate publishes BOTH coords each tick (y is set the same frame).
        onUpdate: () => setTarget(follow.current.x, follow.current.y),
      });
      yTo.current = gsap.quickTo(follow.current, "y", {
        duration: 0.5,
        ease: "power3",
      });
    },
    { dependencies: [gateOff] },
  );

  const moveTo = (clientX: number, clientY: number) => {
    if (gateOffRef.current) return;
    xTo.current?.(clientX / window.innerWidth);
    yTo.current?.(clientY / window.innerHeight);
  };

  const getItemHandlers = (index: number): ResourceItemHandlers => ({
    onPointerEnter: (e) => {
      if (gateOffRef.current) return;
      moveTo(e.clientX, e.clientY);
      useResourcePreviewStore.getState().setActive(index, seedFor(index));
    },
    onPointerMove: (e) => moveTo(e.clientX, e.clientY),
    onPointerLeave: () => {
      // Leaving one item: the list-level leave handler clears; an immediate
      // enter on the next item overrides. No per-item clear (avoids flicker).
    },
    onPointerDown: (e) => {
      if (gateOffRef.current) return;
      // Publish the click origin (clip [0..1] top-left) — the WebGL plane
      // (WebGPU path) and the DOM fallback card both consume the nonce bump.
      useResourcePreviewStore
        .getState()
        .triggerWipe(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
    },
  });

  const onListPointerLeave = () => {
    if (gateOffRef.current) return;
    useResourcePreviewStore.getState().setActive(-1, 0);
  };

  return { gateOff, getItemHandlers, onListPointerLeave };
}

/**
 * DOM/CSS fallback preview card. Renders nothing when the gate is off, or when
 * the WebGPU full-tier signal plane is the active preview. Otherwise follows
 * the same published target as the plane via a rAF reader of the store (cheap;
 * only runs while an article is hovered).
 */
export function ResourcePreviewCard() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const tier = useTierStore((s) => s.tier);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const wipeRef = useRef<HTMLDivElement | null>(null);
  const prevNonce = useRef(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Per-instance SVG filter id (sanitized) — feTurbulence→feDisplacementMap that
  // gives the click-wipe edge an organic (torn) boundary. useId avoids the
  // global-id collision landmine when multiple instances mount.
  const rawId = useId();
  const dwId = `rpw-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // The plane owns the preview on the desktop WebGPU full path; suppress the
  // card there. On every other (non-coarse/non-RM) path the card IS the
  // preview.
  const planeOwnsPreview = tier === "full" && webgpuEnabled();
  const showCard = !planeOwnsPreview && tier !== "off" && !isGateOff();

  // Single rAF reader of the store: positions the fixed card at the published
  // follower target and tracks the active article. Only allocates work while a
  // card is shown.
  useEffect(() => {
    if (!showCard) {
      setActiveIndex(-1);
      return;
    }
    let raf = 0;
    const tick = () => {
      const { activeIndex: idx, targetX, targetY, wipeNonce } =
        useResourcePreviewStore.getState();
      setActiveIndex((prev) => (prev === idx ? prev : idx));
      const el = cardRef.current;
      if (el && idx >= 0) {
        el.style.transform = `translate3d(${targetX * window.innerWidth}px, ${
          targetY * window.innerHeight
        }px, 0) translate(-50%, -50%)`;
      }
      // Click-wipe: a displaced clip-path circle floods from card center on a
      // nonce bump (the filter:url() gives its edge the torn feTurbulence rim).
      if (wipeNonce !== prevNonce.current) {
        prevNonce.current = wipeNonce;
        const wipe = wipeRef.current;
        if (wipe) {
          wipe.style.transition = "none";
          wipe.style.opacity = "1";
          wipe.style.clipPath = "circle(0% at 50% 50%)";
          void wipe.offsetWidth; // reflow so the 0% start is committed
          wipe.style.transition =
            "clip-path 0.5s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.4s ease 0.28s";
          wipe.style.clipPath = "circle(150% at 50% 50%)";
          wipe.style.opacity = "0";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showCard]);

  if (!showCard) return null;

  const r = activeIndex >= 0 ? resources[activeIndex] : null;
  const categoryLabel: Record<string, string> = isEn
    ? { article: "Article", guide: "Guide", "case-study": "Case study", whitepaper: "Whitepaper" }
    : { article: "Articolo", guide: "Guida", "case-study": "Case study", whitepaper: "Whitepaper" };

  return (
    <>
      <div
        ref={cardRef}
        aria-hidden="true"
        className="resource-preview-card"
        data-visible={r ? "true" : "false"}
      >
        <div className="resource-preview-card__glow" />
        {/* Click-wipe flood — displaced by the feTurbulence filter below so its
            clip-path edge reads torn/liquid rather than a clean circle. */}
        <div
          ref={wipeRef}
          className="resource-preview-card__wipe"
          style={{ filter: `url(#${dwId})` }}
        />
        {r && (
          <div className="resource-preview-card__meta">
            <span className="resource-preview-card__cat">{categoryLabel[r.category]}</span>
            <span className="resource-preview-card__read">{r.readMinutes} min</span>
          </div>
        )}
      </div>
      {/* Hidden filter def — feTurbulence→feDisplacementMap warps the wipe edge.
          No feMorphology (cheaper; skips the Safari-dilate cost). */}
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0 }}
      >
        <filter id={dwId} x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.02"
            numOctaves={2}
            seed={7}
            result="dwNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="dwNoise"
            scale={26}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      <style>{`
        .resource-preview-card {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 40;
          width: 280px;
          height: 190px;
          pointer-events: none;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid hsl(var(--accent) / 0.35);
          background:
            radial-gradient(circle at 30% 30%, hsl(var(--accent) / 0.28), transparent 60%),
            conic-gradient(from 200deg at 70% 70%, #2A7FFF44, #3BE1FF33, transparent 70%),
            hsl(var(--bg) / 0.85);
          backdrop-filter: blur(6px);
          box-shadow: 0 20px 60px -20px hsl(var(--accent) / 0.5);
          opacity: 0;
          /* Positioned each frame by the rAF reader (transform); scale +
             opacity are the only transitioned props (the per-frame transform
             write must not be eased or the card lags the cursor). */
          transform: translate3d(-100vw, -100vh, 0) translate(-50%, -50%);
          scale: 0.92;
          transition: opacity 0.32s ease, scale 0.32s ease;
          will-change: transform, opacity, scale;
        }
        .resource-preview-card[data-visible="true"] {
          opacity: 1;
          scale: 1;
        }
        .resource-preview-card__glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 40%, #3BE1FF22, transparent 65%);
          mix-blend-mode: screen;
        }
        .resource-preview-card__wipe {
          position: absolute;
          inset: -12%;
          pointer-events: none;
          opacity: 0;
          clip-path: circle(0% at 50% 50%);
          /* cyan → deep-blue signal flood with a bright leading rim (brand,
             no violet). The filter:url() (inline) displaces this edge. */
          background: radial-gradient(
            circle at 50% 50%,
            #3BE1FF66 0%,
            #2A7FFF3a 48%,
            #3BE1FFaa 62%,
            transparent 70%
          );
          mix-blend-mode: screen;
        }
        .resource-preview-card__meta {
          position: absolute;
          left: 18px;
          bottom: 16px;
          display: flex;
          align-items: baseline;
          gap: 12px;
          font-family: var(--font-mono, ui-monospace, monospace);
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }
        .resource-preview-card__cat {
          font-size: 11px;
          color: hsl(var(--accent));
        }
        .resource-preview-card__read {
          font-size: 10px;
          color: hsl(var(--ink-mute));
        }
        @media (prefers-reduced-motion: reduce) {
          .resource-preview-card { display: none; }
        }
      `}</style>
    </>
  );
}
