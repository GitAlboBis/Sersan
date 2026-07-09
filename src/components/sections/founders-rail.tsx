"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionGlow } from "@/components/ui/section-glow";
import { founders, type FounderProfile } from "@/data/founders";
import { useLanguage } from "@/components/language-provider";
import { getLenis } from "@/lib/lenis-singleton";
import {
  useFoundersMorphStore,
  foundersGateApi,
} from "@/webgl/store/foundersMorphStore";
import { useIntroStore } from "@/webgl/store/introStore";
import { founderCardMotion } from "@/webgl/store/founderMotion";
import { useTierStore } from "@/webgl/store/tierStore";
import { webgpuEnabled } from "@/webgl/renderer/createRenderer";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * FoundersRail — the home founders block.
 *
 * THREE presentation modes (all copy verbatim from src/data/founders.ts):
 *
 *   1. MORPH (full tier + WebGPU flag + pinned desktop): a VERTICAL CSS-sticky
 *      stage. The WebGL particle-portrait morph island (webgl/FounderPortraitMorph)
 *      renders a ~26k-point cloud over [data-founder-stage] that composes founder
 *      A, decomposes into a swarm at mid-scroll, and recomposes founder B; the two
 *      DOM copy blocks cross-fade in lockstep with the scroll progress. The DOM
 *      portrait posters in the stage cross-fade too but are driven transparent
 *      once the cloud is live (they stay a graceful static poster on a flag-on
 *      WebGL2 fallback); kept in the a11y tree (img alt). Pure CSS sticky — NO ScrollTrigger `pin:`
 *      (a pin-spacer would break the [data-line-anchor="founders"] measurement of
 *      the signature line), section height = 100vh + travel set in px by measure().
 *
 *   2. HORIZONTAL RAIL (pinned desktop, NOT full+webgpu): the previous sticky
 *      horizontal set-piece, full DOM (SVG duotone portrait + hover clip reveal +
 *      windowed name sweep + portrait parallax). Complete fallback on its own.
 *
 *   3. NATIVE (mobile / coarse pointer / prefers-reduced-motion): a plain
 *      overflow-x snap scroller, no pinning, portraits simply visible.
 *
 * All three carry every founder's name/role/shortBio/credentials/previouslyAt/
 * LinkedIn as real, keyboard-focusable DOM. SSR renders modes 1/2's pinned
 * layout (all links in the initial HTML).
 */

/** Windowed counter-sweep travel for the big display name (px at |t| = 1). */
const SWEEP_PX = 150;
/** Portrait counter-parallax at |t| = 1, in % of the 112%-bleed media layer. */
const PARALLAX_PCT = 5;
/** SVG mask coordinate space (portrait-ish, cover-cropped via `slice`). */
const MASK_W = 800;
const MASK_H = 1000;
/**
 * Final reveal radius: covers the farthest corner from center
 * (√(400² + 500²) ≈ 640) plus the displacement's max inward excursion
 * (scale 70 → ±35), with margin.
 */
const MASK_FINAL_R = 700;
/** Panel-center viewport fraction at which the entry reveal completes. */
const REVEAL_END = 0.55;

// --- MORPH-mode scroll gate (mirrors HeroIntroGate) ------------------------
/** Accumulated wheel/touch delta (px) that fires ONE leg (one gesture = one). */
const G_TRIGGER_PX = 140;
/** Re-arm the gate after input idles this long (separates gestures). */
const G_IDLE_MS = 160;
/** Fraction of the viewport the section top must leave before re-engaging. */
const G_ENGAGE_EXIT = 0.28;
/** Max time (ms) the gate may hold the page before force-releasing (safety). */
const G_MAX_ENGAGE_MS = 16000;
/** Touch drag maps a bit faster than wheel (shorter gestures). */
const G_TOUCH_FACTOR = 2.0;

/** clamped smoothstep(edge0, edge1, x). */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0 || 1e-6)));
  return t * t * (3 - 2 * t);
}

/**
 * Duotone→color hover treatment (shared visual contract with the About-page
 * portraits — about-client.tsx carries the same block; keep them in sync).
 * `--fr-hr` is a registered custom property so the clip-path radius (color
 * layer) and its +1.5px cyan annulus (ring layer) interpolate together from
 * one transition. `--fr-mx/--fr-my` are set once per pointerenter (JS writes
 * a CSS var — the animation itself is pure CSS). Without @property support
 * the reveal snaps instead of easing, which is an acceptable degradation.
 * `.founder-portrait` is the article ROOT (full-bleed card), so border-color
 * joins the transition here — the shorthand would otherwise reset Tailwind's
 * transition-colors longhands.
 */
const PORTRAIT_CSS = `
@property --fr-hr {
  syntax: "<length-percentage>";
  inherits: true;
  initial-value: 0px;
}
.founder-portrait {
  --fr-hr: 0px;
  transition: --fr-hr 0.65s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s ease;
}
.founder-portrait__base {
  filter: grayscale(1) brightness(0.85);
}
.founder-portrait__color {
  clip-path: circle(var(--fr-hr) at var(--fr-mx, 50%) var(--fr-my, 50%));
}
.founder-portrait__ring {
  background: #3BE1FF;
  opacity: 0;
  transition: opacity 0.25s ease;
  clip-path: circle(calc(var(--fr-hr) + 1.5px) at var(--fr-mx, 50%) var(--fr-my, 50%));
}
@media (hover: hover) and (pointer: fine) {
  .founder-portrait:hover { --fr-hr: 150%; }
  .founder-portrait:hover .founder-portrait__ring { opacity: 0.9; }
}
@media (prefers-reduced-motion: reduce) {
  .founder-portrait,
  .founder-portrait__ring { transition: none; }
}
/* Morph-stage poster cross-fade easing (the two [data-founder-stage] portraits
   are driven imperatively via gsap.quickSetter; this softens the flip when the
   WebGL cloud goes live and the posters are driven transparent). */
[data-founder-stage] [data-founder-media] {
  transition: opacity 0.45s ease;
}
`;

/** Per-panel elements + cached geometry driven by the single ScrollTrigger. */
type PanelFx = {
  li: HTMLElement;
  circle: SVGCircleElement;
  name: HTMLElement;
  media: HTMLElement;
  setName: (v: number) => void;
  setMedia: (v: number) => void;
  width: number;
  baseCenter: number;
  lastR: number;
};

/** Shared chip treatment: translucent bg + backdrop-blur so chips hold AA
 * contrast even where they overhang the scrim's fade zone. */
const CHIP_CLASS =
  "inline-flex items-center rounded-full border border-[hsl(var(--ink)/0.18)] bg-[hsl(var(--bg)/0.55)] px-2.5 py-1 backdrop-blur-sm";

/**
 * Standalone founder copy column — name / role / shortBio / credential chips /
 * previouslyAt / LinkedIn. Used by the MORPH stage (two of these overlaid,
 * cross-fading on scroll). Copy verbatim from src/data/founders.ts.
 */
function FounderCopy({
  f,
  index,
  total,
  isEn,
}: {
  f: FounderProfile;
  index: number;
  total: number;
  isEn: boolean;
}) {
  const role = isEn ? f.roleEn : f.roleIt;
  return (
    <div className="flex flex-col gap-4">
      <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-dim tabular-nums">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
      <div>
        <h3 className="font-display text-[clamp(2.4rem,4.5vw,3.6rem)] leading-[0.95] text-ink">
          {f.name}
        </h3>
        <p className="mt-2 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute">
          {role}
        </p>
      </div>
      <p className="max-w-[52ch] text-[13px] sm:text-[14px] text-ink-mute leading-relaxed">
        {isEn ? f.shortBioEn : f.shortBioIt}
      </p>
      <ul className="flex flex-wrap gap-1.5 list-none">
        {(isEn ? f.credentialsEn : f.credentialsIt).map((c) => (
          <li
            key={c}
            className={`${CHIP_CLASS} gap-2 text-[11px] text-ink leading-snug`}
          >
            <span
              aria-hidden="true"
              className="block w-1 h-1 rounded-full bg-[hsl(var(--accent)/0.8)] shrink-0"
            />
            <span>{c}</span>
          </li>
        ))}
      </ul>
      {f.previouslyAt && f.previouslyAt.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute/70">
            {isEn ? "Previously" : "In precedenza"}
          </span>
          <ul className="contents list-none">
            {f.previouslyAt.map((co) => (
              <li
                key={co}
                className={`${CHIP_CLASS} font-mono text-[10px] tracking-[0.1em] uppercase text-ink-mute`}
              >
                {co}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Link
        href={f.linkedIn}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${f.name} on LinkedIn`}
        className="mt-1 inline-flex w-fit items-center gap-2 rounded-full border border-[hsl(var(--ink)/0.25)] bg-[hsl(var(--bg)/0.6)] px-4 py-2 font-mono text-[11px] tracking-[0.14em] uppercase text-ink-mute hover:text-ink hover:border-[hsl(var(--accent)/0.6)] transition-colors backdrop-blur"
      >
        {isEn ? "LinkedIn" : "LinkedIn"}
        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

function FounderPanel({
  f,
  index,
  total,
  isEn,
}: {
  f: FounderProfile;
  index: number;
  total: number;
  isEn: boolean;
}) {
  // SVG filter/mask ids must be document-unique AND SSR-stable → useId.
  // The delimiter chars (":" / "«»") break unquoted CSS url() references,
  // so strip them.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = `founder-boil-${uid}`;
  const maskId = `founder-mask-${uid}`;

  const role = isEn ? f.roleEn : f.roleIt;

  // One rect read per pointer ENTRY (event-driven — never in a frame loop):
  // anchors the CSS clip-path circle at the point the cursor came in.
  const onPortraitEnter = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    el.style.setProperty(
      "--fr-mx",
      `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`,
    );
    el.style.setProperty(
      "--fr-my",
      `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`,
    );
  };

  return (
    <article
      id={`founder-${f.anchor}`}
      onPointerEnter={onPortraitEnter}
      className="founder-portrait group relative h-[min(78vh,46rem)] w-full overflow-hidden rounded-lg border border-[hsl(var(--rule))] bg-[hsl(216_28%_10%/0.45)] hover:border-[hsl(var(--accent)/0.45)]"
    >
      {/* Full-bleed media — covers the ENTIRE panel; the article's
          overflow-hidden clips the 112% bleed. Counter-parallax target:
          everything (masked base, ring, color layer) slides together so
          hover + reveal stay registered. */}
      <div
        data-founder-media
        className="absolute inset-y-0 left-[-6%] w-[112%] will-change-transform"
      >
        <svg
          className="h-full w-full"
          viewBox={`0 0 ${MASK_W} ${MASK_H}`}
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label={`${f.name}, ${role}`}
        >
          <defs>
            {/* Static noise field; only the circle animates through it.
                Region constrained (perf: CPU rasterization). */}
            <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.035"
                numOctaves="2"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="70"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
            <mask id={maskId}>
              {/* SSR-final radius: the portrait is visible without JS;
                  the pinned scrub re-seeds it from rail progress. */}
              <circle
                data-founder-maskcircle
                cx={MASK_W / 2}
                cy={MASK_H / 2}
                r={MASK_FINAL_R}
                fill="#fff"
                style={{ filter: `url(#${filterId})` }}
              />
            </mask>
          </defs>
          <g mask={`url(#${maskId})`}>
            {/* Duotone base: grayscale image under a navy scrim. */}
            <image
              href={f.image}
              x="0"
              y="0"
              width={MASK_W}
              height={MASK_H}
              preserveAspectRatio="xMidYMid slice"
              className="founder-portrait__base"
            />
            <rect
              x="0"
              y="0"
              width={MASK_W}
              height={MASK_H}
              fill="#0B1422"
              opacity="0.35"
            />
          </g>
        </svg>
        {/* Cyan annulus riding 1.5px outside the color layer's clip edge. */}
        <div aria-hidden="true" className="founder-portrait__ring absolute inset-0" />
        {/* Full-color layer, revealed by the expanding clip circle. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={f.image}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading="lazy"
          className="founder-portrait__color absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* Bottom scrim — paints ABOVE the media (including the hover color
          layer) so the overlaid copy keeps AA contrast in every state:
          #0B1422 at 90%+ under the text block, transparent ~55% up. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(11,20,34,0.92) 0%, rgba(11,20,34,0.82) 26%, rgba(11,20,34,0.4) 42%, rgba(11,20,34,0) 58%)",
        }}
      />

      {/* Counter — top-left, over the raw image (shadow for legibility). */}
      <span className="absolute left-6 top-6 z-10 font-mono text-[10px] tracking-[0.16em] uppercase text-ink-dim tabular-nums [text-shadow:0_1px_10px_rgba(11,20,34,0.9)] sm:left-7 sm:top-7">
        {String(index + 1).padStart(2, "0")} /{" "}
        {String(total).padStart(2, "0")}
      </span>

      {/* Overlay stack — ALL copy rides the scrim, nothing beside the image.
          The huge display name carries the windowed counter-sweep (transform
          on the inner span, clipped by the article's overflow-hidden).
          pointer-events-none except LinkedIn, so the article owns hover. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 p-6 sm:p-7">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[0.95] text-ink">
              <span data-founder-name className="inline-block will-change-transform">
                {f.name}
              </span>
            </h3>
            <p className="mt-2 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute">
              {role}
            </p>
          </div>
          <Link
            href={f.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${f.name} on LinkedIn`}
            className="pointer-events-auto inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-full border border-[hsl(var(--ink)/0.25)] bg-[hsl(var(--bg)/0.6)] text-ink-mute hover:text-ink hover:border-[hsl(var(--accent)/0.6)] transition-colors backdrop-blur"
          >
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <p className="max-w-[52ch] text-[13px] sm:text-[14px] text-ink-mute leading-relaxed">
          {isEn ? f.shortBioEn : f.shortBioIt}
        </p>

        <ul className="flex flex-wrap gap-1.5 list-none">
          {(isEn ? f.credentialsEn : f.credentialsIt).map((c) => (
            <li
              key={c}
              className={`${CHIP_CLASS} gap-2 text-[11px] text-ink leading-snug`}
            >
              <span
                aria-hidden="true"
                className="block w-1 h-1 rounded-full bg-[hsl(var(--accent)/0.8)] shrink-0"
              />
              <span>{c}</span>
            </li>
          ))}
        </ul>

        {f.previouslyAt && f.previouslyAt.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute/70">
              {isEn ? "Previously" : "In precedenza"}
            </span>
            <ul className="contents list-none">
              {f.previouslyAt.map((co) => (
                <li
                  key={co}
                  className={`${CHIP_CLASS} font-mono text-[10px] tracking-[0.1em] uppercase text-ink-mute`}
                >
                  {co}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function FoundersRail() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const tier = useTierStore((s) => s.tier);
  const tierResolved = useTierStore((s) => s.resolved);

  // SSR default = pinned (desktop) layout so all links are in the initial
  // HTML — same convention as case-studies-rail.
  const [mode, setMode] = useState<"pinned" | "native">("pinned");
  const [detected, setDetected] = useState(false);

  // MORPH mode: the WebGL particle-portrait island is mounted (Scene.tsx). It
  // requires the RESOLVED pinned desktop path + full tier + the WebGPU flag.
  // tierStore uses strict `innerWidth < 768` while the mode effect uses
  // matchMedia('(max-width: 768px)'), so gating on detected + mode==='pinned'
  // guarantees: whenever the section is native for ANY reason, the DOM portrait
  // shows and no store writes leak. On pinned-but-not-full/webgpu it falls back
  // to the horizontal DOM rail (mode 2).
  const canMorph =
    detected &&
    mode === "pinned" &&
    tierResolved &&
    tier === "full" &&
    webgpuEnabled();

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLUListElement | null>(null);
  const copyARef = useRef<HTMLDivElement | null>(null);
  const copyBRef = useRef<HTMLDivElement | null>(null);
  const stageImgARef = useRef<HTMLImageElement | null>(null);
  const stageImgBRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(mobile || coarse || reduced ? "native" : "pinned");
    setDetected(true);
  }, []);

  // === MORPH mode: pinned stage + GATED, self-playing morph ==================
  // Mirrors HeroIntroGate. When the section top reaches the viewport top the
  // gate ENGAGES: Lenis is stopped, the section snaps to top, and wheel/touch is
  // consumed here. One scroll-down gesture triggers a ONE-SHOT auto-play A→B
  // (the island plays it on its own clock, absorbing extra scroll); at B another
  // gesture RELEASES the page. Reverse symmetrically for scroll-up. NO
  // ScrollTrigger `pin:` — the section's own height is the runway, so the
  // [data-line-anchor="founders"] waypoint stays measurable. NEVER permanently
  // hijacks: a hard-delta cap, a max-engage timer, and Escape all force-release.
  useEffect(() => {
    if (!canMorph) return;
    const section = sectionRef.current;
    if (!section) return;

    const store = useFoundersMorphStore.getState();
    const setOpA = copyARef.current
      ? (gsap.quickSetter(copyARef.current, "opacity") as (v: number) => void)
      : null;
    const setOpB = copyBRef.current
      ? (gsap.quickSetter(copyBRef.current, "opacity") as (v: number) => void)
      : null;
    const setImgA = stageImgARef.current
      ? (gsap.quickSetter(stageImgARef.current, "opacity") as (v: number) => void)
      : null;
    const setImgB = stageImgBRef.current
      ? (gsap.quickSetter(stageImgBRef.current, "opacity") as (v: number) => void)
      : null;

    // Copy + poster cross-fade FOLLOWS the island's live uMorph (store.morph),
    // NOT raw scroll. Posters go transparent once the WebGL cloud is live.
    const applyStage = (m: number) => {
      const bF = smoothstep(0.35, 0.65, m);
      setOpA?.(1 - bF);
      setOpB?.(bF);
      if (useFoundersMorphStore.getState().active) {
        setImgA?.(0);
        setImgB?.(0);
      } else {
        setImgA?.(1 - bF);
        setImgB?.(bF);
      }
    };

    const measure = () => {
      // No travel (gate model): the section is exactly one viewport tall — the
      // gate holds the page while a leg plays. secTop drives island placement.
      section.style.height = `${window.innerHeight}px`;
      const secTop = section.getBoundingClientRect().top + window.scrollY;
      store.setLayout(0, secTop);
      store.bumpMeasure();
    };

    measure();
    store.setPinned(true);
    applyStage(store.morph);

    // Poster hides the instant the cloud goes live; copy follows uMorph.
    const unsub = useFoundersMorphStore.subscribe((s, prev) => {
      if (s.morph !== prev.morph || s.active !== prev.active) applyStage(s.morph);
    });

    // --- GATE state machine --------------------------------------------------
    // Deterministic + momentum-proof: gestures are gated on STAGE + a signed
    // accumulator that resets each leg, and RELEASE requires the FAR end (B for
    // down, A for up) — a near-end gesture can therefore ONLY morph, never
    // release. There is no momentum-driven escape (the old |delta| cap released
    // at A on the entry fling's inertial wheel tail); the anti-trap is the
    // morph-then-release path + Escape + the max-engage safety timer.
    let engaged = false;
    let armed = true; // ready to accept a NEW gesture (one gesture = one leg)
    let acc = 0; // signed delta accumulator for the current gesture
    let engageTime = 0;
    let idleT: ReturnType<typeof setTimeout> | undefined;
    let reBlocked = false; // suppress re-engage right after a release
    let cooldownUntil = 0;
    let lastDir = 1;
    let insideEngageUsed = false; // one-shot: reload-landed-inside engage
    let prevTop = section.getBoundingClientRect().top;

    const engage = (initStage: "A" | "B") => {
      if (engaged) return;
      engaged = true;
      insideEngageUsed = true;
      acc = 0;
      engageTime = performance.now();
      const s = useFoundersMorphStore.getState();
      s.setGateEngaged(true);
      s.setReveal(1);
      // Entry LOCKS at the entry side FIRST (A from above, B from below) — the
      // entry scroll is NOT the morph gesture. DISARM and zero the accumulator;
      // the entry flick's momentum (inertial wheel/Lenis fling) keeps resetting
      // the idle timer while armed=false, so it can never count as the first
      // gesture. Re-arm ONLY after G_IDLE_MS of TRUE silence → a fresh, separate
      // impulse then plays the morph.
      s.setMorphTarget(initStage === "B" ? 1 : 0, true);
      armed = false;
      acc = 0;
      clearTimeout(idleT);
      idleT = setTimeout(() => {
        armed = true;
        acc = 0;
      }, G_IDLE_MS);
      // secTop is kept EXACTLY fresh every frame by the tick (it ran this frame
      // before engage), so it already equals the section's live document top:
      // snap the page to it so the [data-founder-stage] lands at its designed
      // viewport position and A/B share the IDENTICAL on-screen rect. The tick
      // then re-asserts the pin for the whole engaged session.
      const target = useFoundersMorphStore.getState().secTop;
      const lenis = getLenis();
      if (lenis) {
        lenis.scrollTo(target, { immediate: true, force: true });
        lenis.stop();
      } else {
        window.scrollTo(0, target);
      }
    };

    const release = (dir: number) => {
      if (!engaged) return;
      engaged = false;
      armed = true;
      acc = 0;
      lastDir = dir;
      const s = useFoundersMorphStore.getState();
      s.setGateEngaged(false);
      const lenis = getLenis();
      lenis?.start();
      // Nudge out of the pin (just below the section for a down-release, just
      // above for an up-release) so the section top clears the re-engage band
      // and the gate can't immediately re-fire. Block re-engage briefly.
      const ih = window.innerHeight;
      const target = Math.max(0, s.secTop + (dir > 0 ? ih : -ih));
      if (lenis) lenis.scrollTo(target, { duration: 0.6 });
      else window.scrollTo(0, target);
      reBlocked = true;
      cooldownUntil = performance.now() + 500;
    };

    // One discrete gesture → play a leg OR release, GATED ON STAGE. Release is
    // only possible from the FAR end (B for down, A for up): a near-end gesture
    // can only ever morph. `morphing` is absorbed (leg must finish first).
    const step = (dir: number) => {
      const s = useFoundersMorphStore.getState();
      if (s.stage === "morphing" || !s.assembleDone) return; // absorb mid-play
      if (dir > 0) {
        if (s.stage === "A") {
          s.setMorphTarget(1, false); // near end → auto-play A→B, STAY engaged
          armed = false;
        } else if (s.stage === "B") {
          release(1); // far end → release downward
        }
      } else if (s.stage === "B") {
        s.setMorphTarget(0, false); // near end (up) → auto-play B→A, STAY engaged
        armed = false;
      } else if (s.stage === "A") {
        release(-1); // far end (up) → release upward
      }
    };

    const consume = (deltaPx: number, e: Event) => {
      if (!engaged) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      lastDir = deltaPx >= 0 ? 1 : -1;
      // Re-arm only after input idles: EVERY input event (including the entry
      // fling's inertial tail) reschedules this, so `armed` flips true only
      // after G_IDLE_MS of TRUE silence — the entry momentum can never arm.
      clearTimeout(idleT);
      idleT = setTimeout(() => {
        armed = true;
        acc = 0;
      }, G_IDLE_MS);
      if (useFoundersMorphStore.getState().stage === "morphing") {
        acc = 0;
        return; // absorb all input while a leg plays
      }
      if (!armed) return; // absorb the entry gesture + its momentum
      acc += deltaPx;
      if (acc >= G_TRIGGER_PX) {
        step(1);
        acc = 0;
      } else if (acc <= -G_TRIGGER_PX) {
        step(-1);
        acc = 0;
      }
    };

    // Deterministic test hook: inject exactly ONE discrete armed gesture down
    // the SAME code path a real single flick hits (bypasses wheel/Lenis momentum
    // timing so QA can verify the sequence reproducibly).
    const simulateGesture = (dir: "up" | "down") => {
      armed = true;
      acc = 0;
      const fake = {
        preventDefault() {},
        stopImmediatePropagation() {},
      } as unknown as Event;
      consume(dir === "up" ? -(G_TRIGGER_PX + 1) : G_TRIGGER_PX + 1, fake);
      return getGate();
    };
    const getGate = () => {
      const s = useFoundersMorphStore.getState();
      return {
        engaged,
        stage: s.stage,
        morphTarget: s.morphTarget,
        armed,
        accum: acc,
      };
    };
    if (process.env.NODE_ENV !== "production") {
      foundersGateApi.current = { simulateGesture, getGate };
    }

    const onWheel = (e: WheelEvent) => {
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 120 : 1;
      consume(e.deltaY * scale, e);
    };
    let touchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY == null) return;
      const y = e.touches[0]?.clientY ?? touchY;
      consume((touchY - y) * G_TOUCH_FACTOR, e);
      touchY = y;
    };
    const onKey = (e: KeyboardEvent) => {
      if (!engaged) return;
      const k = e.key;
      if (k === "Escape") {
        release(lastDir || 1);
        return;
      }
      const rearm = () => {
        clearTimeout(idleT);
        idleT = setTimeout(() => {
          armed = true;
        }, G_IDLE_MS * 2);
      };
      if (["ArrowDown", "PageDown", "End", " ", "Spacebar"].includes(k)) {
        e.preventDefault();
        if (armed) {
          step(1);
          rearm();
        }
      } else if (["ArrowUp", "PageUp", "Home"].includes(k)) {
        e.preventDefault();
        if (armed) {
          step(-1);
          rearm();
        }
      }
      // Tab is NOT intercepted → focus still moves into the section's links.
    };

    // Engage on the top-edge crossing (both directions) + hold/escape poll.
    let raf = 0;
    const tick = () => {
      const rect = section.getBoundingClientRect();
      const top = rect.top;
      const ihNow = window.innerHeight;
      const now = performance.now();
      const live = useFoundersMorphStore.getState();

      // Keep the island's camera-lock docTop FRESH every frame (cheap, no
      // rebuild): a layout shift above (hero gate collapse) or a scroll can no
      // longer leave secTop stale — the ~430px cloud-vs-DOM-stage drift. The
      // island keeps doing its per-frame placement from window.scrollY + this
      // secTop (no getBoundingClientRect in the render loop).
      const docTop = top + window.scrollY;
      if (Math.abs(live.secTop - docTop) > 0.5) live.setLayout(0, docTop);

      if (engaged) {
        getLenis()?.stop(); // re-assert (survive stray Lenis starts)
        // Hold the pin: keep the section top exactly at the viewport top so A
        // and B occupy the IDENTICAL on-screen stage rect (re-assert on drift).
        if (Math.abs(top) > 1) {
          const ny = window.scrollY + top;
          const lenis = getLenis();
          if (lenis) lenis.scrollTo(ny, { immediate: true, force: true });
          else window.scrollTo(0, ny);
        }
        if (now - engageTime > G_MAX_ENGAGE_MS) release(lastDir);
      } else {
        // Start forming Alessandro as soon as the section peeks in.
        if (top < ihNow && rect.bottom > 0) live.setReveal(1);
        if (
          reBlocked &&
          now > cooldownUntil &&
          Math.abs(top) > ihNow * G_ENGAGE_EXIT
        ) {
          reBlocked = false;
        }
        // Engage ONLY once the island is truly live (true-WebGPU build). On a
        // flag-on WebGL2 fallback `active` stays false → the gate NEVER hijacks
        // scroll, so the DOM poster/section is the whole (non-trapping)
        // experience.
        if (!reBlocked && live.active) {
          const fromTop = prevTop > 0 && top <= 0; // scrolled DOWN to top edge
          const fromBottom = prevTop < 0 && top >= 0; // scrolled UP into it
          const inside =
            !insideEngageUsed &&
            top <= ihNow * 0.5 &&
            rect.bottom >= ihNow * 0.5;
          if ((fromTop || fromBottom) && rect.bottom > 0 && top < ihNow) {
            engage(fromBottom ? "B" : "A");
          } else if (inside) {
            engage("A"); // reload landed inside → pin without wedging
          }
        }
      }
      prevTop = top;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
    window.addEventListener("keydown", onKey, { capture: true });

    // Pointer bridge on the stage → subtle mid-flight parallax (getState only).
    const stage = section.querySelector<HTMLElement>("[data-founder-stage]");
    const onMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const rr = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (rr.width === 0 || rr.height === 0) return;
      const s = useFoundersMorphStore.getState();
      s.setMouse({
        x: (e.clientX - rr.left) / rr.width,
        y: (e.clientY - rr.top) / rr.height,
      });
      s.setHover(1);
    };
    const onLeave = () => useFoundersMorphStore.getState().setHover(0);
    stage?.addEventListener("pointermove", onMove);
    stage?.addEventListener("pointerleave", onLeave);

    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    // Full re-measure (rebuild → fresh stage rect + docTop) when the layout
    // ABOVE can change the section's DOCUMENT position: the hero intro gate
    // completing collapses/settles the spine and pushes everything below. The
    // per-frame secTop refresh above keeps docTop live, but this also re-fits
    // the geometry to the settled layout.
    let introBumped = useIntroStore.getState().introComplete;
    if (introBumped) measure();
    const unsubIntro = useIntroStore.subscribe((st) => {
      if (st.introComplete && !introBumped) {
        introBumped = true;
        measure();
      }
    });

    // One-shot late refresh once webfonts land (copy column can reflow).
    let fontsCancelled = false;
    document.fonts?.ready
      .then(() => {
        if (!fontsCancelled) measure();
      })
      .catch(() => {});

    return () => {
      fontsCancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(idleT);
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("resize", onResize);
      stage?.removeEventListener("pointermove", onMove);
      stage?.removeEventListener("pointerleave", onLeave);
      unsubIntro();
      unsub();
      foundersGateApi.current = null;
      if (engaged) getLenis()?.start(); // never leave scroll stopped
      section.style.height = "";
      // The store outlives routes — clear it so the island never reads a stale
      // section after this unmounts / the mode flips.
      useFoundersMorphStore.getState().reset();
    };
  }, [canMorph]);

  // Safety net: the morph store outlives routes, so clear it on every
  // active→inactive transition (route change, flip to native/horizontal rail).
  useEffect(() => {
    if (!canMorph) return;
    return () => {
      useFoundersMorphStore.getState().reset();
    };
  }, [canMorph]);

  // === HORIZONTAL RAIL mode: pinned desktop, NOT full+webgpu (pure DOM) ======
  useEffect(() => {
    if (!detected || mode !== "pinned" || canMorph) return;
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    if (!section || !sticky || !track) return;

    const setX = gsap.quickSetter(track, "x", "px");
    let travel = 0;
    let secTop = 0;
    let trackX = 0;
    let vw = window.innerWidth;

    // Per-panel writer bundle: quickSetters built ONCE (elements are stable
    // across language toggles — only text nodes change), geometry refreshed
    // by measure().
    const fx: PanelFx[] = [];
    track
      .querySelectorAll<HTMLElement>("[data-founders-panel]")
      .forEach((li) => {
        const circle = li.querySelector<SVGCircleElement>(
          "[data-founder-maskcircle]",
        );
        const name = li.querySelector<HTMLElement>("[data-founder-name]");
        const media = li.querySelector<HTMLElement>("[data-founder-media]");
        if (!circle || !name || !media) return;
        fx.push({
          li,
          circle,
          name,
          media,
          setName: gsap.quickSetter(name, "x", "px") as (v: number) => void,
          setMedia: gsap.quickSetter(media, "xPercent") as (v: number) => void,
          width: 0,
          baseCenter: 0,
          lastR: -1,
        });
      });

    const measure = () => {
      vw = window.innerWidth;
      travel = Math.max(0, track.scrollWidth - vw);
      section.style.height = `${window.innerHeight + travel}px`;
      secTop = section.getBoundingClientRect().top + window.scrollY;
      const stickyLeft = sticky.getBoundingClientRect().left;
      const trackLeft = track.getBoundingClientRect().left;
      for (const p of fx) {
        const r = p.li.getBoundingClientRect();
        p.width = r.width;
        p.baseCenter = stickyLeft + (r.left - trackLeft) + r.width / 2;
      }
    };

    // Analytic per-panel pass — pure math over cached measurements + trackX.
    const applyFx = () => {
      for (const p of fx) {
        const centerX = p.baseCenter - trackX;
        // Shared analytic model (founderMotion.ts). Byte-identical output to
        // the previous inline clamp.
        const m = founderCardMotion(centerX, vw);
        p.setName(-m.t * SWEEP_PX);
        p.setMedia(-m.t * PARALLAX_PCT);
        // Entry reveal windowed to this panel's segment of the SAME rail
        // progress: 0 with the panel fully off the right edge → 1 by the
        // time its center reaches REVEAL_END·vw. Scrubbed both ways.
        const enterStart = vw + p.width / 2;
        const enterEnd = vw * REVEAL_END;
        const rev = Math.max(
          0,
          Math.min(1, (enterStart - centerX) / (enterStart - enterEnd)),
        );
        // Quantized to integers: every r change re-rasterizes the SVG
        // displacement filter, so skip sub-pixel churn.
        const r = Math.round(rev * MASK_FINAL_R);
        if (r !== p.lastR) {
          p.lastR = r;
          p.circle.setAttribute("r", String(r));
        }
      }
    };

    measure();

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom", // progress hits 1 exactly when sticky releases
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      onUpdate: (self) => {
        trackX = travel * self.progress;
        setX(-trackX);
        applyFx();
      },
    });
    trackX = travel * st.progress;
    setX(-trackX);
    applyFx();

    // One-shot late refresh once webfonts land.
    let fontsCancelled = false;
    document.fonts?.ready
      .then(() => {
        if (!fontsCancelled) ScrollTrigger.refresh();
      })
      .catch(() => {});

    // Keyboard: convert focus on a link inside an off-screen panel into the
    // equivalent vertical scroll position (same contract as the work rail).
    const onFocusIn = (e: FocusEvent) => {
      const panel = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-founders-panel]",
      );
      if (!panel) return;
      sticky.scrollLeft = 0;
      const vwNow = window.innerWidth;
      const rect = panel.getBoundingClientRect();
      if (rect.left >= 0 && rect.right <= vwNow) return;
      const baseCenter = rect.left + trackX + rect.width / 2; // at trackX = 0
      const desired = Math.min(Math.max(baseCenter - vwNow / 2, 0), travel);
      const targetY = secTop + desired; // 1px scrolled = 1px translated
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(targetY, { duration: 0.6 });
      else window.scrollTo({ top: targetY });
    };
    track.addEventListener("focusin", onFocusIn);

    return () => {
      fontsCancelled = true;
      track.removeEventListener("focusin", onFocusIn);
      st.kill();
      gsap.set(track, { x: 0 });
      section.style.height = "";
      for (const p of fx) {
        gsap.set(p.name, { x: 0 });
        gsap.set(p.media, { xPercent: 0 });
        p.circle.setAttribute("r", String(MASK_FINAL_R));
      }
    };
  }, [detected, mode, canMorph]);

  const total = founders.length;

  // Copy below is verbatim from the retired founders-section.tsx.
  const eyebrow = isEn
    ? "Founder-led AI engineering studio"
    : "Studio di AI engineering guidato dai fondatori";

  const heading = (className?: string) => (
    <SectionHeading
      eyebrow={eyebrow}
      title={
        isEn ? (
          <>
            Built by engineers who{" "}
            <span className="font-display italic text-ink">
              ship production systems.
            </span>
          </>
        ) : (
          <>
            Costruito da ingegneri che{" "}
            <span className="font-display italic text-ink">
              portano sistemi in produzione.
            </span>
          </>
        )
      }
      description={
        isEn
          ? "Every engagement is owned by the people who scope, architect, and ship it. No account layer, no junior bench, no second team you didn't sign for."
          : "Ogni ingaggio è seguito dalle persone che ne definiscono lo scope, lo progettano e lo portano in produzione. Nessun livello di account, nessuna panchina di junior, nessun secondo team che non hai ingaggiato."
      }
      /* reveal='blur': soft CSS focus-in on the studio-intro heading, echoing
         the About page's manifesto beat (no WebGL, pure GPU-composited filter). */
      reveal="blur"
      className={className}
    />
  );

  const panels = (liClass: string) => (
    <>
      {founders.map((f, i) => (
        <li key={f.anchor} data-founders-panel className={liClass}>
          <FounderPanel f={f} index={i} total={total} isEn={isEn} />
        </li>
      ))}
    </>
  );

  // Closer + CTA — carried over unchanged.
  const closing = (
    <div className="container-px flex flex-col gap-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-14">
      <p className="max-w-2xl text-[14px] text-ink-mute leading-relaxed">
        {isEn ? (
          <>
            Read by one of us, not a queue. Briefs sent through{" "}
            <span className="text-ink">/start</span> get a reply within one
            business day.
          </>
        ) : (
          <>
            Letto da uno di noi, non da una coda. I brief inviati tramite{" "}
            <span className="text-ink">/start</span> ricevono risposta entro un
            giorno lavorativo.
          </>
        )}
      </p>
      <Link
        href="/about"
        className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors shrink-0"
      >
        {isEn ? "Full founder bios" : "Bio complete dei fondatori"}
        <ArrowUpRight
          className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden="true"
        />
      </Link>
    </div>
  );

  const portraitStyle = <style>{PORTRAIT_CSS}</style>;

  // Native fallback: normal-flow section, browser-owned horizontal scroll
  // with snap points. No pinning, no per-frame transforms; the reveal masks
  // keep their SSR final radius (portraits simply visible).
  if (detected && mode === "native") {
    return (
      <section
        id="founders"
        className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
      >
        <SectionGlow position="top-left" intensity={1.2} size="60rem" />
        <SectionGlow position="bottom-right" intensity={0.9} size="45rem" />
        <div className="container-px relative mb-8 sm:mb-10">{heading()}</div>
        <ul
          data-lenis-prevent
          className="relative flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={eyebrow}
        >
          {panels("snap-start shrink-0 w-[88vw] max-w-[30rem]")}
        </ul>
        {closing}
        {portraitStyle}
      </section>
    );
  }

  // MORPH mode: vertical CSS-sticky stage. The WebGL particle cloud renders
  // over [data-founder-stage]; the two DOM copy blocks cross-fade on scroll.
  if (canMorph) {
    return (
      <section id="founders" className="relative scroll-mt-24">
        <div
          ref={sectionRef}
          className="section-accent-tint relative"
          style={{ minHeight: "100vh" }}
        >
          <div
            ref={stickyRef}
            data-founders-morph-sticky
            className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden"
          >
            <SectionGlow position="top-left" intensity={1.2} size="60rem" />
            <SectionGlow position="bottom-right" intensity={0.9} size="45rem" />
            <div className="container-px relative w-full">
              <div className="mb-8 max-w-2xl sm:mb-10">{heading()}</div>
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,26rem)_1fr]">
                {/* Stage: the WebGL particle cloud (persistent canvas, behind the
                    content) renders over this box. The two DOM portraits are a
                    STATIC POSTER cross-fade — visible only while the cloud is not
                    live (flag-on WebGL2 fallback / island still building), driven
                    transparent once it renders. Kept in the a11y tree via alt. */}
                <div
                  data-founder-stage
                  className="relative mx-auto aspect-[3/4] w-full max-w-[26rem]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={stageImgARef}
                    src={founders[0].image}
                    alt={`${founders[0].name}, ${
                      isEn ? founders[0].roleEn : founders[0].roleIt
                    }`}
                    data-founder-media
                    draggable={false}
                    className="absolute inset-0 h-full w-full rounded-lg object-cover"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={stageImgBRef}
                    src={founders[1].image}
                    alt={`${founders[1].name}, ${
                      isEn ? founders[1].roleEn : founders[1].roleIt
                    }`}
                    data-founder-media
                    draggable={false}
                    style={{ opacity: 0 }}
                    className="absolute inset-0 h-full w-full rounded-lg object-cover"
                  />
                </div>
                {/* Copy region: both blocks overlaid, cross-fading on progress. */}
                <div className="relative min-h-[26rem]">
                  <div ref={copyARef} className="absolute inset-x-0 top-0">
                    <FounderCopy
                      f={founders[0]}
                      index={0}
                      total={total}
                      isEn={isEn}
                    />
                  </div>
                  <div
                    ref={copyBRef}
                    className="absolute inset-x-0 top-0"
                    style={{ opacity: 0 }}
                  >
                    <FounderCopy
                      f={founders[1]}
                      index={1}
                      total={total}
                      isEn={isEn}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {closing}
        {portraitStyle}
      </section>
    );
  }

  // HORIZONTAL RAIL mode: pinned desktop, NOT full+webgpu (pure DOM fallback).
  return (
    <section id="founders" className="relative scroll-mt-24">
      {/* The tall scroll runway: height = 100vh + travel, set in px by
          measure(). minHeight is the SSR placeholder before JS measures. */}
      <div
        ref={sectionRef}
        className="section-accent-tint relative"
        style={{ minHeight: "100vh" }}
      >
        {/* Sticky viewport — this IS the pin (no pin-spacer, anchors stay
            valid). */}
        <div
          ref={stickyRef}
          data-founders-sticky
          className="sticky top-0 flex h-screen items-center overflow-hidden"
        >
          <SectionGlow position="top-left" intensity={1.2} size="60rem" />
          <SectionGlow position="bottom-right" intensity={0.9} size="45rem" />
          <ul
            ref={trackRef}
            className="relative flex w-max items-center gap-6 will-change-transform"
            style={{ paddingInline: "var(--margin)" }}
            aria-label={eyebrow}
          >
            {/* P0 — intro panel: the section heading rides the rail. */}
            <li className="flex w-[min(88vw,34rem)] shrink-0 items-center">
              {heading()}
            </li>
            {panels("w-[min(88vw,34rem)] shrink-0")}
          </ul>
        </div>
      </div>
      {closing}
      {portraitStyle}
    </section>
  );
}
